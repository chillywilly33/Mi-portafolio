const { app, BrowserWindow, ipcMain, shell, net, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const UPDATE_RELEASE_URL = 'https://github.com/chillywilly33/Mi-portafolio/releases/latest';
const UPDATE_API_URL = 'https://api.github.com/repos/chillywilly33/Mi-portafolio/releases/latest';
const fs = require('fs');

const ALLOWED_HOSTS = ['financialmodelingprep.com', 'www.alphavantage.co'];
const dataFile = () => path.join(app.getPath('userData'), 'datos.json');
let mainWindow;
let updatePromptOpen = false;

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600,
    title: 'Mis Inversiones', backgroundColor: '#0d1318', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); } });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function versionIsNewer(candidate, current) {
  const parts = (value) => String(value).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const a = parts(candidate), b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

async function checkPortableUpdate() {
  try {
    const response = await net.fetch(UPDATE_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return;
    const release = await response.json();
    if (release.draft || release.prerelease || !versionIsNewer(release.tag_name, app.getVersion())) return;
    if (!mainWindow) return;
    const { response: choice } = await dialog.showMessageBox(mainWindow, {
      type: 'info', title: 'Actualización disponible',
      message: `Mis Inversiones ${release.tag_name} está disponible.`,
      detail: 'La versión portable se instala manualmente. ¿Quieres abrir la página para descargarla?',
      buttons: ['Abrir descarga', 'Más tarde'], defaultId: 0, cancelId: 1,
    });
    if (choice === 0) shell.openExternal(UPDATE_RELEASE_URL);
  } catch (error) { console.warn('No se pudo revisar actualizaciones:', error.message); }
}

function configureUpdates() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  // La portable avisa y abre la página; la versión NSIS sí puede descargar e instalar desde la app.
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    setTimeout(checkPortableUpdate, 5000);
    setInterval(checkPortableUpdate, 6 * 60 * 60 * 1000);
    return;
  }
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('update-available', async (info) => {
    if (updatePromptOpen || !mainWindow) return;
    updatePromptOpen = true;
    try {
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info', title: 'Actualización disponible',
        message: `Mis Inversiones ${info.version} está disponible.`,
        detail: '¿Quieres descargarla ahora? La app se reiniciará cuando termine la instalación.',
        buttons: ['Actualizar ahora', 'Más tarde'], defaultId: 0, cancelId: 1,
      });
      if (response === 0) autoUpdater.downloadUpdate();
    } finally { updatePromptOpen = false; }
  });
  autoUpdater.on('update-downloaded', async (info) => {
    if (!mainWindow) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info', title: 'Actualización lista',
      message: `Mis Inversiones ${info.version} ya se descargó.`,
      detail: 'Reinicia la app para terminar la actualización.',
      buttons: ['Reiniciar ahora', 'Más tarde'], defaultId: 0, cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', (error) => console.warn('No se pudo buscar/descargar la actualización:', error.message));
  setTimeout(() => autoUpdater.checkForUpdates().catch((e) => console.warn('No se pudo revisar actualizaciones:', e.message)), 5000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
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
  fs.renameSync(tmp, f);
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
  configureUpdates();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

