#!/usr/bin/env python3
"""Moniteur du Pi : echantillonne CPU, RAM, temperature, reseau, disques, services,
garde 7 jours d'historique (SQLite) et sert une API JSON protegee par un jeton.
Aucune dependance externe."""
import hmac, json, mimetypes, os, re, secrets, socket, sqlite3, subprocess, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen

DIR = os.environ.get("PI_MONITOR_DIR", "/mnt/ssd/pi-monitor")
PORT = int(os.environ.get("PI_MONITOR_PORT", "8095"))
# 0.0.0.0 = accessible depuis le reseau local (usage maison). 127.0.0.1 = seulement via un proxy local (ex. tailscale serve).
BIND = os.environ.get("PI_MONITOR_BIND", "0.0.0.0")
try:
    TOKEN = open(f"{DIR}/token").read().strip()
except FileNotFoundError:   # premier demarrage : jeton aleatoire de 32 octets, lisible seulement par ce compte
    TOKEN = secrets.token_urlsafe(32)
    fd = os.open(f"{DIR}/token", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(TOKEN + "\n")
FAIL_MAX, FAIL_WINDOW = 10, 60   # 10 mauvais jetons par minute et par adresse, puis 429
fails = {}
WEB = f"{DIR}/web"   # interface PWA servie telle quelle (aucun secret dedans, l'API reste protegee)
mimetypes.add_type("application/manifest+json", ".webmanifest")
RETENTION = 7 * 86400
SERVICES = ["crous-bot", "pihole-FTL", "pi-wol", "tailscaled", "docker", "db-backup.timer"]
DISKS = [("Carte SD", "/"), ("SSD", "/mnt/ssd")]
IFACES = {"eth0": "Ethernet", "wlan0": "Wi-Fi", "tailscale0": "Tailscale"}
# Le Pi 4 n'a pas de capteur de puissance : estimation (repos ~3,7 W avec SSD USB, ~7,2 W a pleine charge).
POWER_IDLE_W, POWER_LOAD_W = 3.7, 3.5

lock = threading.Lock()
state = {"now": None}
db = sqlite3.connect(f"{DIR}/history.db", check_same_thread=False)
db.execute("CREATE TABLE IF NOT EXISTS s(ts INTEGER PRIMARY KEY, cpu REAL, ram REAL, temp REAL, rx REAL, tx REAL, pw REAL)")
db.commit()


def run(cmd, timeout=3):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout).stdout
    except Exception:
        return ""


def cpu_times():
    out = {}
    for line in open("/proc/stat"):
        if line.startswith("cpu"):
            p = line.split()
            v = list(map(int, p[1:9]))
            out[p[0]] = (sum(v), v[3] + v[4])
    return out


def net_bytes():
    out = {}
    for line in open("/proc/net/dev").read().splitlines()[2:]:
        name, data = line.split(":", 1)
        name = name.strip()
        if name in IFACES:
            f = data.split()
            out[name] = (int(f[0]), int(f[8]))
    return out


def decode_throttled(raw):
    bits = {0: "undervolt_now", 1: "freq_capped_now", 2: "throttled_now", 3: "soft_limit_now",
            16: "undervolt_past", 17: "freq_capped_past", 18: "throttled_past", 19: "soft_limit_past"}
    return {name: bool(raw >> b & 1) for b, name in bits.items()}


def read_meminfo():
    m = {}
    for line in open("/proc/meminfo"):
        k, v = line.split(":")
        m[k] = int(v.split()[0]) // 1024
    used = m["MemTotal"] - m["MemAvailable"]
    return {"total_mb": m["MemTotal"], "used_mb": used, "avail_mb": m["MemAvailable"],
            "pct": round(100 * used / m["MemTotal"], 1),
            "swap_total_mb": m["SwapTotal"], "swap_used_mb": m["SwapTotal"] - m["SwapFree"]}


def disks():
    out = []
    for name, path in DISKS:
        try:
            st = os.statvfs(path)
            total, free = st.f_blocks * st.f_frsize, st.f_bavail * st.f_frsize
            out.append({"name": name, "mount": path, "total_gb": round(total / 1e9, 1),
                        "used_gb": round((total - free) / 1e9, 1), "pct": round(100 * (total - free) / total, 1)})
        except OSError:
            pass
    return out


def top_procs():
    agg = {}
    for line in run(["ps", "-eo", "comm,rss,pcpu", "--no-headers"]).splitlines():
        p = line.rsplit(None, 2)
        if len(p) == 3:
            a = agg.setdefault(p[0], [0, 0.0])
            a[0] += int(p[1]); a[1] += float(p[2])
    top = sorted(agg.items(), key=lambda kv: -kv[1][0])[:6]
    return [{"name": n, "rss_mb": round(v[0] / 1024), "cpu": round(v[1], 1)} for n, v in top]


def services():
    states = run(["systemctl", "is-active", *SERVICES]).split()
    out = [{"name": n, "ok": s == "active", "state": s} for n, s in zip(SERVICES, states)]
    try:
        ok = json.load(urlopen("http://127.0.0.1:8081/status.php", timeout=2)).get("installed") is True
    except Exception:
        ok = False
    out.append({"name": "nextcloud", "ok": ok, "state": "active" if ok else "down"})
    return out


def sampler():
    prev_cpu, prev_net, prev_t = cpu_times(), net_bytes(), time.time()
    heavy, heavy_t, last_db = {}, 0, 0
    time.sleep(1)
    while True:
        t = time.time()
        cur_cpu, cur_net = cpu_times(), net_bytes()
        cores, total = [], 0.0
        for k in sorted(cur_cpu, key=lambda x: (x != "cpu", x)):
            dt, di = cur_cpu[k][0] - prev_cpu[k][0], cur_cpu[k][1] - prev_cpu[k][1]
            pct = round(100 * (1 - di / dt), 1) if dt else 0.0
            if k == "cpu": total = pct
            else: cores.append(pct)
        el = max(t - prev_t, 0.001)
        net = [{"iface": i, "label": IFACES[i],
                "rx_bps": round((cur_net[i][0] - prev_net.get(i, cur_net[i])[0]) / el),
                "tx_bps": round((cur_net[i][1] - prev_net.get(i, cur_net[i])[1]) / el)} for i in cur_net]
        prev_cpu, prev_net, prev_t = cur_cpu, cur_net, t
        try:
            temp = float(re.search(r"[\d.]+", run(["vcgencmd", "measure_temp"])).group())
            raw = int(run(["vcgencmd", "get_throttled"]).split("=")[1], 16)
            mhz = int(run(["vcgencmd", "measure_clock", "arm"]).split("=")[1]) // 1_000_000
            volts = float(re.search(r"[\d.]+", run(["vcgencmd", "measure_volts", "core"])).group())
        except Exception:
            temp, raw, mhz, volts = None, 0, 0, 0.0
        if t - heavy_t > 15:
            heavy = {"procs": top_procs(), "services": services(), "disks": disks()}
            heavy_t = t
        power = round(POWER_IDLE_W + POWER_LOAD_W * total / 100, 2)
        up = float(open("/proc/uptime").read().split()[0])
        snap = {"ts": int(t), "host": socket.gethostname(), "uptime_s": int(up),
                "load": [float(x) for x in open("/proc/loadavg").read().split()[:3]],
                "cpu": {"pct": total, "cores": cores, "freq_mhz": mhz, "volts": volts},
                "temp": temp, "throttle": {"raw": raw, **decode_throttled(raw)},
                "mem": read_meminfo(), "net": net,
                "power": {"watts_est": power, "estimated": True}, **heavy}
        with lock:
            state["now"] = snap
        if t - last_db >= 15:
            last_db = t
            rx = sum(n["rx_bps"] for n in net if n["iface"] != "tailscale0")
            tx = sum(n["tx_bps"] for n in net if n["iface"] != "tailscale0")
            with lock:
                db.execute("INSERT OR REPLACE INTO s VALUES(?,?,?,?,?,?,?)",
                           (int(t), total, snap["mem"]["pct"], temp, rx, tx, power))
                if int(t) % 3600 < 15:
                    db.execute("DELETE FROM s WHERE ts<?", (int(t) - RETENTION,))
                db.commit()
        time.sleep(max(0.5, 5 - (time.time() - t)))


RANGES = {"1h": 3600, "6h": 6 * 3600, "24h": 86400, "7d": 7 * 86400}


def history(rng):
    sec = RANGES.get(rng, 3600)
    bucket = max(15, sec // 200)
    since = int(time.time()) - sec
    with lock:
        rows = db.execute("SELECT (ts/?)*? b, AVG(cpu), AVG(ram), MAX(temp), AVG(rx), AVG(tx), AVG(pw) "
                          "FROM s WHERE ts>? GROUP BY b ORDER BY b", (bucket, bucket, since)).fetchall()
    temps = [r[3] for r in rows if r[3] is not None]
    kwh = sum(r[6] * bucket for r in rows if r[6]) / 3_600_000
    return {"range": rng, "bucket_s": bucket,
            "points": [[r[0], *(None if v is None else round(v, 1) for v in r[1:])] for r in rows],
            "temp_min": min(temps) if temps else None, "temp_max": max(temps) if temps else None,
            "temp_avg": round(sum(temps) / len(temps), 1) if temps else None, "energy_kwh_est": round(kwh, 4)}


class H(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")  # le jeton protege l'API, pas l'origine
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization")
        self.end_headers()

    def _static(self, path):
        rel = "index.html" if path in ("", "/") else path.lstrip("/")
        full = os.path.realpath(os.path.join(WEB, rel))
        if not full.startswith(os.path.realpath(WEB) + os.sep) or not os.path.isfile(full):
            return self._json(404, {"error": "introuvable"})
        data = open(full, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", (mimetypes.guess_type(full)[0] or "application/octet-stream") + ("; charset=utf-8" if full.endswith((".html", ".js", ".css", ".webmanifest", ".svg")) else ""))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return self._static(u.path)
        if u.path == "/api/health":          # sans jeton : sert seulement a detecter la route (LAN ou Tailscale)
            return self._json(200, {"ok": True})
        ip = self.client_address[0]
        if ip == "127.0.0.1":   # derriere un proxy local : l'adresse reelle est la derniere de X-Forwarded-For
            ip = self.headers.get("X-Forwarded-For", ip).split(",")[-1].strip()
        now = time.time()
        recent = [t for t in fails.get(ip, []) if now - t < FAIL_WINDOW]
        if len(recent) >= FAIL_MAX:
            fails[ip] = recent
            return self._json(429, {"error": "trop d'essais, reessaie dans une minute"})
        given = self.headers.get("Authorization", "").removeprefix("Bearer ")
        if not hmac.compare_digest(given.encode(), TOKEN.encode()):
            fails[ip] = recent + [now]
            return self._json(401, {"error": "jeton invalide"})
        if u.path == "/api/now":
            with lock:
                snap = state["now"]
            return self._json(200 if snap else 503, snap or {"error": "demarrage"})
        if u.path == "/api/history":
            return self._json(200, history(parse_qs(u.query).get("range", ["1h"])[0]))
        self._json(404, {"error": "introuvable"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    threading.Thread(target=sampler, daemon=True).start()
    ThreadingHTTPServer((BIND, PORT), H).serve_forever()
