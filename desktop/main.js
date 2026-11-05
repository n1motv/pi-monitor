const { app, BrowserWindow, Tray, Menu, Notification, globalShortcut, ipcMain, nativeImage, screen, shell } = require('electron');
const path = require('path'), fs = require('fs');
const { Core } = require('./renderer/core');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
app.setAppUserModelId('dev.n1motv.pimonitor'); // necessaire pour les notifications Windows

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'default-config.json'), 'utf8'));
const ICON = path.join(__dirname, 'build', 'icon.ico');
let core, main, tray, quitting = false;
const widgets = {};
const KINDS = {
  gauges: { w: 380, h: 350, label: 'Jauges' },
  bar: { w: 520, h: 76, label: 'Barre' },
  temp: { w: 250, h: 290, label: 'Température' }
};

/* ---------- fenetres ---------- */
function createMain(show = true) {
  main = new BrowserWindow({
    width: 1280, height: 860, minWidth: 860, minHeight: 600, show: false, icon: ICON, backgroundColor: '#080b10',
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#00000000', symbolColor: '#8493a7', height: 40 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, backgroundThrottling: false }
  });
  main.setMenuBarVisibility(false);
  main.loadFile('renderer/index.html');
  main.once('ready-to-show', () => { if (show) main.show(); });
  main.on('close', e => { if (!quitting) { e.preventDefault(); main.hide(); } }); // reste actif en arriere-plan
  main.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
function showMain(view) {
  if (!main || main.isDestroyed()) createMain();
  if (main.isMinimized()) main.restore();
  main.show(); main.focus();
  if (view) main.webContents.send('go', view);
}
function toggleMain() { main && main.isVisible() && main.isFocused() ? main.hide() : showMain(); }

function openWidget(kind) {
  if (widgets[kind] && !widgets[kind].isDestroyed()) { widgets[kind].show(); return; }
  const k = KINDS[kind], pos = core.s.widgets.pos[kind], wa = screen.getPrimaryDisplay().workArea;
  const w = new BrowserWindow({
    width: k.w, height: k.h, x: pos ? pos.x : wa.x + wa.width - k.w - 24, y: pos ? pos.y : wa.y + 24 + Object.keys(widgets).length * 40,
    frame: false, transparent: true, resizable: false, skipTaskbar: true, hasShadow: false, alwaysOnTop: core.s.widgets.onTop,
    opacity: core.s.widgets.opacity, icon: ICON, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, backgroundThrottling: false }
  });
  w.loadFile('renderer/widget.html', { query: { kind } });
  w.once('ready-to-show', () => w.showInactive());
  w.on('moved', () => { const [x, y] = w.getPosition(); core.set({ widgets: { pos: { ...core.s.widgets.pos, [kind]: { x, y } } } }); });
  w.on('closed', () => { delete widgets[kind]; core.set({ widgets: { open: Object.keys(widgets) } }); buildMenu(); });
  widgets[kind] = w;
  core.set({ widgets: { open: Object.keys(widgets) } }); buildMenu();
}
function closeWidget(kind) { widgets[kind] && !widgets[kind].isDestroyed() && widgets[kind].close(); }
function toggleWidget(kind) { widgets[kind] && !widgets[kind].isDestroyed() ? closeWidget(kind) : openWidget(kind); }
function applyWidgetPrefs() {
  for (const w of Object.values(widgets)) if (!w.isDestroyed()) { w.setAlwaysOnTop(core.s.widgets.onTop); w.setOpacity(core.s.widgets.opacity); }
}

/* ---------- icone de barre des taches ---------- */
const COLORS = { ok: [52, 211, 153], warn: [251, 191, 36], bad: [248, 113, 113], off: [132, 147, 167] };
function trayIcon(level) {
  const S = 32, buf = Buffer.alloc(S * S * 4), [r, g, b] = COLORS[level] || COLORS.off, c = (S - 1) / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - c, y - c), i = (y * S + x) * 4;
    let a = d <= 14 ? 255 : d <= 15 ? Math.round(255 * (15 - d)) : 0, cr = r, cg = g, cb = b;
    if (d > 9 && d <= 11) { cr = 11; cg = 15; cb = 20; } // anneau sombre pour le contraste
    if (d <= 6.5) { cr = 255; cg = 255; cb = 255; } // coeur blanc
    buf[i] = cb; buf[i + 1] = cg; buf[i + 2] = cr; buf[i + 3] = a; // BGRA
  }
  return nativeImage.createFromBitmap(buf, { width: S, height: S, scaleFactor: 2 });
}
let lastLevel = '';
function updateTray() {
  const st = core.public(), n = st.now, lv = st.level;
  if (lv !== lastLevel) { tray.setImage(trayIcon(lv)); lastLevel = lv; }
  tray.setToolTip(st.connected && n ? `Raspberry Pi : ${n.temp} °C · CPU ${Math.round(n.cpu.pct)} % · RAM ${Math.round(n.mem.pct)} % · ${n.power.watts_est} W` : 'Raspberry Pi : injoignable');
}
function buildMenu() {
  const s = core.s;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ouvrir Pi Monitor', click: () => showMain() },
    { type: 'separator' },
    { label: 'Widgets', submenu: Object.entries(KINDS).map(([k, v]) => ({ label: v.label, type: 'checkbox', checked: !!(widgets[k] && !widgets[k].isDestroyed()), click: () => toggleWidget(k) })) },
    { label: 'Widgets au premier plan', type: 'checkbox', checked: s.widgets.onTop, click: i => { core.set({ widgets: { onTop: i.checked } }); applyWidgetPrefs(); } },
    { label: 'Notifications', type: 'checkbox', checked: s.notif, click: i => core.set({ notif: i.checked }) },
    { label: 'Démarrer avec Windows', type: 'checkbox', checked: s.autostart, click: i => setAutostart(i.checked) },
    { type: 'separator' },
    { label: 'Quitter', click: () => { quitting = true; app.quit(); } }
  ]));
}
function setAutostart(on) {
  core.set({ autostart: on });
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: on, args: ['--hidden'] });
  buildMenu();
}

/* ---------- demarrage ---------- */
app.on('second-instance', () => showMain());
app.whenReady().then(() => {
  core = new Core(app.getPath('userData'), seed);
  tray = new Tray(trayIcon('off'));
  tray.on('click', toggleMain);
  buildMenu();
  const hidden = process.argv.includes('--hidden');
  createMain(!hidden);

  core.on('state', st => {
    updateTray();
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('state', st);
  });
  core.on('settings', () => { buildMenu(); applyWidgetPrefs(); });
  core.on('alert', a => {
    if (!core.s.notif) return;
    const n = new Notification({ title: a.lv === 'bad' ? 'Raspberry Pi : problème' : 'Raspberry Pi : à surveiller', body: a.m, icon: ICON });
    n.on('click', () => showMain('alerts')); n.show();
  });
  core.start();
  core.s.widgets.open.forEach(openWidget);

  globalShortcut.register('Control+Alt+P', toggleMain);
  globalShortcut.register('Control+Alt+W', () => { const o = Object.keys(widgets); o.length ? o.forEach(closeWidget) : openWidget('gauges'); });
});

/* ---------- IPC ---------- */
ipcMain.handle('state', () => core.public());
ipcMain.handle('set', (_, patch) => {
  core.set(patch);
  if ('autostart' in patch) setAutostart(patch.autostart);
  return core.public();
});
ipcMain.on('widget', (_, a, kind) => { if (a === 'open') openWidget(kind); else if (a === 'close') closeWidget(kind); else if (a === 'toggle') toggleWidget(kind); });
ipcMain.on('openMain', (_, v) => showMain(v));
ipcMain.on('clearLog', () => core.clearLog());
ipcMain.on('testNotif', () => new Notification({ title: 'Pi Monitor', body: 'Les notifications fonctionnent.', icon: ICON }).show());
ipcMain.on('refresh', () => { core.tick(); core.loadHist(); });
ipcMain.on('menu', (e, kind) => {
  const sw = Object.entries(KINDS).filter(([k]) => k !== kind).map(([k, v]) => ({ label: 'Ouvrir : ' + v.label, click: () => openWidget(k) }));
  Menu.buildFromTemplate([
    { label: 'Ouvrir Pi Monitor', click: () => showMain() },
    ...sw, { type: 'separator' },
    { label: 'Au premier plan', type: 'checkbox', checked: core.s.widgets.onTop, click: i => { core.set({ widgets: { onTop: i.checked } }); applyWidgetPrefs(); } },
    { label: 'Opacité', submenu: [1, .9, .75, .6].map(o => ({ label: Math.round(o * 100) + ' %', type: 'radio', checked: core.s.widgets.opacity === o, click: () => { core.set({ widgets: { opacity: o } }); applyWidgetPrefs(); } })) },
    { type: 'separator' }, { label: 'Fermer ce widget', click: () => closeWidget(kind) }
  ]).popup({ window: BrowserWindow.fromWebContents(e.sender) });
});

app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', e => e.preventDefault()); // l'app vit dans la barre des taches
