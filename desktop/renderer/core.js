// Coeur partage (Electron + PWA) : reglages, interrogation du Pi, alertes, journal.
// Stockage injecte : fichiers JSON cote Electron, localStorage cote navigateur.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.PiCore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
class Emitter { constructor() { this.h = {}; } on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); } }
function fileIO(dir) {
  const fs = require('fs'), path = require('path'), p = n => path.join(dir, n + '.json');
  return { read(n) { try { return JSON.parse(fs.readFileSync(p(n), 'utf8')); } catch { return null; } }, write(n, v) { try { fs.writeFileSync(p(n), JSON.stringify(v, null, 1)); } catch {} } };
}

const DEFAULTS = {
  th: { t_warn: 70, t_bad: 80, t_ram: 85, t_disk: 90, t_cpu: 90, price: 0.25 },
  notif: true, autostart: false, theme: 'auto', range: '1h',
  widgets: { open: [], opacity: 0.96, onTop: true, pos: {} },
  conn: null // {token, routes} ; par defaut default-config.json
};

class Core extends Emitter {
  constructor(io, seed) {
    super();
    this.io = typeof io === 'string' ? fileIO(io) : io;
    const s = this.io.read('settings') || {};
    this.s = { ...DEFAULTS, ...s, th: { ...DEFAULTS.th, ...s.th }, widgets: { ...DEFAULTS.widgets, ...s.widgets } };
    this.seed = seed;
    this.log = this.io.read('alert-log') || [];
    this.active = {}; this.cpuHigh = 0; this.failures = 0;
    this.st = { connected: false, route: null, lat: 0, now: null, hist: null, alerts: [], status: 'connecting' };
  }
  conn() { return this.s.conn || this.seed; }
  save() { this.io.write('settings', this.s); }
  saveLog() { this.io.write('alert-log', this.log.slice(0, 200)); }
  set(patch) {
    for (const k in patch) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && this.s[k] && k !== 'conn') this.s[k] = { ...this.s[k], ...patch[k] };
      else this.s[k] = patch[k];
    }
    this.save(); this.emit('settings', this.s);
    if ('range' in patch) this.loadHist();
    if ('th' in patch || 'conn' in patch) { this.route = null; this.recompute(); }
  }
  async get(route, p, ms = 10000) {
    return fetch(route.url + p, { headers: { Authorization: 'Bearer ' + this.conn().token }, signal: AbortSignal.timeout(ms) });
  }
  async pickRoute() {
    for (const r of this.conn().routes) {
      try { if ((await this.get(r, '/api/health', 5000)).ok) return r; } catch {}
    }
    return null;
  }
  start() {
    const loop = async () => { await this.tick(); this.timer = setTimeout(loop, 2000); };
    loop(); this.hist = setInterval(() => this.loadHist(), 60000);
  }
  async tick() {
    try {
      if (!this.route) this.route = await this.pickRoute();
      if (!this.route) throw new Error('no route');
      const t0 = Date.now(), r = await this.get(this.route, '/api/now');
      if (r.status === 401) { this.st.status = 'auth'; throw new Error('401'); }
      if (!r.ok) throw new Error('http ' + r.status);
      const now = await r.json();
      const first = !this.st.now;
      this.failures = 0;
      Object.assign(this.st, { connected: true, status: 'ok', route: this.route.name, lat: Date.now() - t0, now });
      this.recompute();
      if (first) this.loadHist();
    } catch {
      this.failures++;
      if (this.failures < 3 && this.st.now && this.st.status !== 'auth') return; // tolère 2 ratés de suite (Wi-Fi instable)
      this.route = null;
      this.st.connected = false; if (this.st.status !== 'auth') this.st.status = 'down';
      this.recompute();
    }
  }
  async loadHist() {
    if (!this.route) return;
    try {
      const r = await this.get(this.route, '/api/history?range=' + this.s.range, 8000);
      this.st.hist = { ...(await r.json()), range: this.s.range }; this.emit('state', this.public());
    } catch {}
  }
  compute(n) {
    const th = this.s.th, a = [], add = (k, lv, m) => a.push({ k, lv, m });
    if (!n) return a;
    if (n.temp != null) {
      if (n.temp >= th.t_bad) add('temp', 'bad', `Température critique : ${n.temp} °C`);
      else if (n.temp >= th.t_warn) add('temp', 'warn', `Température élevée : ${n.temp} °C`);
    }
    const t = n.throttle;
    if (t.undervolt_now) add('uv', 'bad', 'Sous-tension en cours : alimentation insuffisante');
    else if (t.undervolt_past) add('uvp', 'warn', 'Sous-tension détectée depuis le démarrage (vérifier le chargeur)');
    if (t.throttled_now || t.freq_capped_now) add('thr', 'bad', 'Le processeur est bridé (chaleur ou alimentation)');
    else if (t.throttled_past) add('thrp', 'warn', 'Le processeur a été bridé depuis le démarrage');
    if (n.mem.pct >= th.t_ram) add('ram', 'warn', `RAM presque pleine : ${n.mem.pct} %`);
    this.cpuHigh = n.cpu.pct >= th.t_cpu ? this.cpuHigh + 1 : 0;
    if (this.cpuHigh >= 30) add('cpu', 'warn', `CPU saturé depuis plus d'une minute : ${n.cpu.pct} %`);
    (n.disks || []).forEach(d => { if (d.pct >= th.t_disk) add('d' + d.name, 'warn', `${d.name} presque plein : ${d.pct} %`); });
    (n.services || []).forEach(s => { if (!s.ok) add('s' + s.name, 'bad', `Service arrêté : ${s.name} (${s.state})`); });
    return a;
  }
  recompute() {
    const list = this.compute(this.st.connected ? this.st.now : null);
    if (this.failures >= 3) list.push({ k: 'off', lv: 'bad', m: this.st.status === 'auth' ? 'Jeton refusé par le Pi' : 'Le Pi ne répond plus (réseau local et Tailscale)' });
    const keys = new Set(list.map(x => x.k)), now = Date.now();
    for (const x of list) {
      if (!this.active[x.k]) {
        this.active[x.k] = { last: now };
        this.log.unshift({ k: x.k, lv: x.lv, m: x.m, t0: now, t1: null });
        this.emit('alert', x);
      } else if (now - this.active[x.k].last > 600000) { this.active[x.k].last = now; this.emit('alert', x); }
    }
    for (const k of Object.keys(this.active)) {
      if (!keys.has(k)) { const e = this.log.find(l => l.k === k && !l.t1); if (e) e.t1 = now; delete this.active[k]; }
    }
    if (list.length || Object.keys(this.active).length || true) this.saveLogThrottled();
    this.st.alerts = list;
    this.emit('state', this.public());
  }
  saveLogThrottled() { clearTimeout(this._lt); this._lt = setTimeout(() => this.saveLog(), 3000); }
  clearLog() { this.log = this.log.filter(l => !l.t1); this.saveLog(); this.emit('state', this.public()); }
  level() { const a = this.st.alerts; if (!this.st.connected) return 'off'; return a.some(x => x.lv === 'bad') ? 'bad' : a.length ? 'warn' : 'ok'; }
  public() { return { ...this.st, log: this.log.slice(0, 60), level: this.level(), settings: this.s, conn: this.conn() }; }
}
return { Core };
});
