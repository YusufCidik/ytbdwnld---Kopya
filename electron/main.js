const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = !app.isPackaged;

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../client/public/vite.svg'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#050505',
  });

  // hide menu
  mainWindow.setMenuBarVisibility(false);

  // In production, we point to the built React app or the local dev server
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../client/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const isDev = !app.isPackaged;
  const serverPath = isDev 
    ? path.join(__dirname, '../server/index.js')
    : path.join(process.resourcesPath, 'server/index.js');

  const binPath = isDev
    ? path.join(__dirname, '../server/bin')
    : path.join(process.resourcesPath, 'bin');

  console.log(`Starting server with BIN_PATH: ${binPath}`);

  // We start the Node.js server
  serverProcess = spawn('node', [serverPath], {
    env: { 
      ...process.env, 
      PORT: 5000,
      BIN_PATH: binPath
    },
    cwd: isDev ? path.join(__dirname, '../server') : path.join(process.resourcesPath, 'server'),
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

app.on('ready', () => {
  startServer();
  // Wait a bit for server to start before opening window
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('quit', () => {
  if (serverProcess) serverProcess.kill();
});
