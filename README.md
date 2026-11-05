# Pi Monitor

Suivi du Raspberry Pi : performances, temperature, consommation estimee, services, alertes.

- `pi-server/` : service Python (stdlib) a installer sur le Pi (systemd, port 8095, jeton dans /mnt/ssd/pi-monitor/token).
- `desktop/` : application Windows Electron (tray, widgets, alertes en arriere-plan).
  - `npm install` puis `npm start` pour lancer, `npm run dist` pour l'installateur (dist/).
  - `default-config.json` contient le jeton et les adresses (LAN puis Tailscale) : ne pas publier.
- `app/` : premiere version, simple page web ouverte dans Edge.

## Version web / mobile (PWA)

Le Pi sert lui-même l'interface sur `https://<ton-pi>.<ton-tailnet>.ts.net/` (Tailscale Serve, HTTPS valide).
Le même code (`desktop/renderer`) tourne dans Electron et dans le navigateur : `core.js` (alertes, journal) est partagé, `bridge.js` fournit `window.pi` côté navigateur.

- Installation : ouvrir l'adresse sur le téléphone (Tailscale actif), puis « Ajouter à l'écran d'accueil » (iOS) ou « Installer l'app » (Android, Chrome, Edge, Mac, Linux).
- Appairage : ouvrir une fois `https://<ton-pi>.<ton-tailnet>.ts.net/#t=<jeton>` (le jeton est dans `token.txt`, jamais commité) ou le coller dans l'écran de connexion.
- Mise à jour de l'interface : `tar -C desktop/renderer --exclude=widget.html -cf - . | ssh <user>@<ip-du-pi> "tar -xf - -C /mnt/ssd/pi-monitor/web"`.
- Limite : les notifications du téléphone ne partent que tant que l'app est ouverte (pas de push serveur).

## Sécurité et modes de connexion

Le serveur lit `PI_MONITOR_BIND` (variable d'environnement systemd) :

- **Maison, réseau local** (défaut, `0.0.0.0`) : l'appli se connecte à `http://<ip-du-pi>:8095`. Pratique, mais le trafic n'est pas chiffré : à réserver à un réseau de confiance et à un pare-feu qui bloque le port depuis l'extérieur.
- **Partout, recommandé** (`PI_MONITOR_BIND=127.0.0.1`) : le serveur n'écoute qu'en local, et `tailscale serve --bg 8095` l'expose en HTTPS à ton tailnet seulement.

Le jeton est créé au premier démarrage (32 octets aléatoires, fichier en mode 600) et n'est jamais dans le dépôt. Le serveur répond 429 après 10 jetons faux en une minute depuis la même adresse. Ne publie jamais `token.txt`.

Durcissement conseillé du Pi : connexion SSH par clé seulement, `ufw` en refus par défaut (autoriser `tailscale0` et le réseau local pour les ports utiles), `fail2ban`, `unattended-upgrades`, et couper les services inutiles (`rpcbind`).
