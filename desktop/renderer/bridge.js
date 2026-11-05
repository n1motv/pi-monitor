/* Version navigateur / telephone : fournit window.pi (meme interface que le preload Electron)
   en s'appuyant sur le meme Core. Sans effet dans Electron. */
(function () {
  if (window.pi) return;
  document.documentElement.classList.add('web');
  const LS = {
    read(n) { try { return JSON.parse(localStorage.getItem('pi.' + n)); } catch { return null; } },
    write(n, v) { try { localStorage.setItem('pi.' + n, JSON.stringify(v)); } catch {} }
  };
  /* lien d'appairage : https://.../#t=JETON */
  const m = location.hash.match(/t=([\w-]+)/);
  if (m) { LS.write('token', m[1]); const st = LS.read('settings') || {}; st.conn = null; LS.write('settings', st); history.replaceState(null, '', location.pathname); }
  const token = LS.read('token') || '';
  const core = new PiCore.Core(LS, { token, routes: [{ name: 'Pi', url: location.origin }] });
  const subs = [], go = [];
  core.on('state', s => subs.forEach(f => f(s)));
  core.on('settings', () => subs.forEach(f => f(core.public())));
  core.on('alert', x => {
    if (!core.s.notif || !('Notification' in window) || Notification.permission !== 'granted') return;
    const opt = { body: x.m, tag: x.k, icon: 'icon-192.png' };
    navigator.serviceWorker && navigator.serviceWorker.ready.then(r => r.showNotification('Raspberry Pi', opt)).catch(() => new Notification('Raspberry Pi', opt));
  });
  window.pi = {
    state: async () => core.public(),
    onState: f => subs.push(f),
    onGo: f => go.push(f),
    set: async p => {
      if (p.notif && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
      core.set(p);
    },
    widget() {}, openMain() {}, menu() {},
    clearLog: () => core.clearLog(),
    testNotif: async () => {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
      core.emit('alert', { k: 'test', m: 'Notification de test : tout fonctionne.' });
    },
    refresh: () => core.tick()
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) core.tick(); });
  core.start();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
