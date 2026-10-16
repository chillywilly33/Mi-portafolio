// Proceso principal de Electron: ventana, guardado de datos en archivo y peticiones a las APIs.
const { app, BrowserWindow, ipcMain, shell, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const ALLOWED_HOSTS = ['financialmodelingprep.com', 'www.alphavantage.co'];
const dataFile = () => path.join(app.getPath('userData'), 'datos.json');

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600,
    title: 'Mis Inversiones', backgroundColor: '#0d1318', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  // Los enlaces externos (noticias) se abren en el navegador, no dentro de la app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); } });
}

ipcMain.handle('data:load', () => {
  try { return fs.existsSync(dataFile()) ? fs.readFileSync(dataFile(), 'utf8') : null; } catch (e) { return null; }
});

ipcMain.handle('data:save', (_e, json) => {
  const f = dataFile();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (fs.existsSync(f)) { try { fs.copyFileSync(f, f.replace(/\.json$/, '.bak.json')); } catch (e) { /* sin respaldo */ } }
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, f); // escritura atómica: nunca queda un archivo a medias
  return true;
});

ipcMain.handle('http:get', async (_e, url) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !ALLOWED_HOSTS.includes(u.hostname)) return { error: 'Host no permitido: ' + u.hostname };
    const res = await net.fetch(url);
    return { status: res.status, text: await res.text() };
  } catch (e) { return { error: e.message }; }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
