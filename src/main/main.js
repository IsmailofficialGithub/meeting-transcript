/**
 * Electron Main Process
 * 
 * Entry point for Electron application.
 * Initializes app, creates windows, and sets up IPC handlers.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const IPCHandlers = require('./ipc-handlers');

// Keep a global reference to avoid garbage collection
let mainWindow = null;
let ipcHandlers = null;

/**
 * Create the main application window
 */
function createWindow() {
  const preloadPath = path.join(__dirname, '../preload/preload.js');
  console.log('Preload path:', preloadPath);
  console.log('__dirname:', __dirname);
  
  // Check if preload file exists
  const fs = require('fs');
  if (!fs.existsSync(preloadPath)) {
    console.error('Preload file not found at:', preloadPath);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    icon: path.join(__dirname, '../../resources/icon.png'), // Optional icon
  });

  // Load the React app
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development' || 
                !app.isPackaged ||
                process.defaultApp ||
                /[\\/]electron/.test(process.execPath);
  
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173').catch(err => {
      console.error('Failed to load Vite dev server:', err);
      // Fallback: try to load built files if dev server isn't running
      const builtPath = path.join(__dirname, '../renderer/index.html');
      mainWindow.loadFile(builtPath).catch(err2 => {
        console.error('Failed to load built files:', err2);
        mainWindow.webContents.send('error', 'Failed to load application. Make sure Vite dev server is running or build the app first.');
      });
    });
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from built files
    const builtPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(builtPath).catch(err => {
      console.error('Failed to load built files:', err);
      mainWindow.webContents.send('error', 'Failed to load application. Please rebuild the app.');
    });
  }
  
  // Handle page load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page load failed:', errorCode, errorDescription);
    if (errorCode === -106) {
      // ERR_INTERNET_DISCONNECTED or connection refused
      console.error('Cannot connect to Vite dev server. Is it running?');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize IPC handlers
 */
function initializeIPC() {
  ipcHandlers = new IPCHandlers();
  ipcHandlers.register();

  // Setup cleanup handlers
  const recordingManager = ipcHandlers.getRecordingManager();
  if (recordingManager) {
    recordingManager.setupCleanupHandlers(app);
  }
}

/**
 * App event handlers
 */
app.whenReady().then(() => {
  createWindow();
  initializeIPC();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  // Cleanup before quit
  if (ipcHandlers) {
    await ipcHandlers.cleanup();
  }
});

app.on('will-quit', (event) => {
  // Final cleanup
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // In production, you might want to show an error dialog
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});
