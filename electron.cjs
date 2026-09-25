const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure Windows taskbar groups properly and displays the custom AllDocKit icon
if (process.platform === 'win32') {
  app.setAppUserModelId('RasheedGraphix.AllDocKitToolkit');
}

let mainWindow = null;

function getAppIcon() {
  const icoPath = path.join(__dirname, 'public/icon.ico');
  const pngPath = path.join(__dirname, 'public/logo_512x512.png');
  const buildIco = path.join(__dirname, 'build/icon.ico');
  
  if (process.platform === 'win32') {
    if (fs.existsSync(icoPath)) return icoPath;
    if (fs.existsSync(buildIco)) return buildIco;
  }
  if (fs.existsSync(pngPath)) return pngPath;
  return icoPath;
}

function createWindow() {
  const windowIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'AllDocKit Toolkit',
    icon: windowIcon,
    backgroundColor: '#0c0a09',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Open links in default browser instead of electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
