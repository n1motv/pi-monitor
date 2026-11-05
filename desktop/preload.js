const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pi', {
  state: () => ipcRenderer.invoke('state'),
  onState: cb => ipcRenderer.on('state', (_, s) => cb(s)),
  onGo: cb => ipcRenderer.on('go', (_, v) => cb(v)),
  set: patch => ipcRenderer.invoke('set', patch),
  widget: (action, kind) => ipcRenderer.send('widget', action, kind),
  openMain: v => ipcRenderer.send('openMain', v),
  clearLog: () => ipcRenderer.send('clearLog'),
  testNotif: () => ipcRenderer.send('testNotif'),
  refresh: () => ipcRenderer.send('refresh'),
  menu: kind => ipcRenderer.send('menu', kind)
});
