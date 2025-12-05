import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import chokidar from 'chokidar';
import fs from 'fs/promises';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Persistent settings
const store = new Store({
  defaults: {
    logDirectory: '',
    watchEnabled: false,
    autoImportEnabled: false,
    archiveDirectory: path.join(app.getPath('userData'), 'archived-logs'),
    lastImportedLog: '',
    lastImportedExports: {}
  }
});

let mainWindow;
let logWatcher = null;
let importCheckInterval = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // In development, load from Vite dev server
  // In production, load the built files
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates (skip in development)
  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000); // Wait 3 seconds after startup
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Initialize log watching if enabled
  const watchEnabled = store.get('watchEnabled');
  const logDirectory = store.get('logDirectory');
  if (watchEnabled && logDirectory) {
    startLogWatcher(logDirectory);
  }
  
  // Resume auto-import if it was enabled
  if (store.get('autoImportEnabled') && logDirectory) {
    setImmediate(() => checkForNewImports());
    importCheckInterval = setInterval(() => checkForNewImports(), 10000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info.version);
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  mainWindow.webContents.send('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
  mainWindow.webContents.send('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  mainWindow.webContents.send('update-ready', info);
});

// IPC Handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (err) {
    console.error('Error checking for updates:', err);
    throw err;
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-settings', () => {
  return {
    logDirectory: store.get('logDirectory'),
    watchEnabled: store.get('watchEnabled'),
    autoImportEnabled: store.get('autoImportEnabled'),
    archiveDirectory: store.get('archiveDirectory')
  };
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('set-log-directory', async (event, directory) => {
  store.set('logDirectory', directory);
  
  // Restart watcher if enabled
  if (store.get('watchEnabled')) {
    stopLogWatcher();
    startLogWatcher(directory);
  }
  
  return true;
});

ipcMain.handle('set-watch-enabled', async (event, enabled) => {
  store.set('watchEnabled', enabled);
  
  if (enabled) {
    const logDirectory = store.get('logDirectory');
    if (logDirectory) {
      startLogWatcher(logDirectory);
    } else {
      return { error: 'No log directory set' };
    }
  } else {
    stopLogWatcher();
  }
  
  return { success: true };
});

ipcMain.handle('set-auto-import-enabled', async (event, enabled) => {
  store.set('autoImportEnabled', enabled);
  
  if (enabled) {
    const logDirectory = store.get('logDirectory');
    if (logDirectory) {
      // Trigger initial import check
      setImmediate(() => checkForNewImports());
      
      // Set up periodic checking every 10 seconds
      if (importCheckInterval) clearInterval(importCheckInterval);
      importCheckInterval = setInterval(() => checkForNewImports(), 10000);
    }
  } else {
    // Stop periodic checking
    if (importCheckInterval) {
      clearInterval(importCheckInterval);
      importCheckInterval = null;
    }
  }
  
  return { success: true };
});

ipcMain.handle('get-archived-logs', async () => {
  const archiveDir = store.get('archiveDirectory');
  try {
    await fs.mkdir(archiveDir, { recursive: true });
    const files = await fs.readdir(archiveDir);
    const logFiles = files.filter(f => f.endsWith('.log'));
    
    const filesWithStats = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = path.join(archiveDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime.toISOString()
        };
      })
    );
    
    return filesWithStats.sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (err) {
    console.error('Error reading archived logs:', err);
    return [];
  }
});

ipcMain.handle('read-log-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (err) {
    console.error('Error reading log file:', err);
    return null;
  }
});

ipcMain.handle('scan-reports-directory', async (event) => {
  const logDirectory = store.get('logDirectory');
  if (!logDirectory) {
    return { error: 'No log directory set' };
  }

  const reportsPath = path.join(logDirectory, 'reports');
  
  try {
    await fs.access(reportsPath);
  } catch {
    return { exports: [] }; // Reports directory doesn't exist
  }

  try {
    const files = await fs.readdir(reportsPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const exports = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(reportsPath, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // Determine type based on Report field
        let type = 'unknown';
        if (data.Report === 'CharacterSheet') {
          type = 'character';
        } else if (data.Report === 'Storage') {
          type = 'storage';
        }
        
        return {
          name: file,
          path: filePath,
          type,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          modifiedTime: stats.mtime.getTime(),
          characterName: data.Character || 'Unknown'
        };
      })
    );
    
    // Sort: Character first, then Storage, then by latest modified time
    // For each character, show the most recent character export, then most recent storage export
    const sorted = exports.sort((a, b) => {
      // Character exports before storage
      if (a.type !== b.type) {
        return a.type === 'character' ? -1 : 1;
      }
      // Within same type, sort by character name first, then by date (newest first)
      if (a.characterName !== b.characterName) {
        return a.characterName.localeCompare(b.characterName);
      }
      return b.modifiedTime - a.modifiedTime;
    });
    
    // Deduplicate: keep only the latest export per character per type
    const seen = new Map();
    const deduplicated = [];
    
    for (const exp of sorted) {
      const key = `${exp.characterName}_${exp.type}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(exp);
      }
    }
    
    return { exports: deduplicated };
  } catch (err) {
    console.error('Error scanning reports directory:', err);
    return { error: err.message };
  }
});

// Log Watcher Functions

function startLogWatcher(logDirectory) {
  if (logWatcher) {
    stopLogWatcher();
  }

  const prevLogPath = path.join(logDirectory, 'player-prev.log');
  
  console.log(`Starting log watcher for: ${prevLogPath}`);
  
  logWatcher = chokidar.watch(prevLogPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  logWatcher.on('add', async (filePath) => {
    console.log('player-prev.log detected (add)');
    await archiveLog(filePath);
  });

  logWatcher.on('change', async (filePath) => {
    console.log('player-prev.log changed');
    // Only archive if file size is significant (rotation creates a new prev file)
    const stats = await fs.stat(filePath);
    if (stats.size > 1000) {
      await archiveLog(filePath);
    }
  });

  logWatcher.on('error', (error) => {
    console.error('Watcher error:', error);
  });
}

function stopLogWatcher() {
  if (logWatcher) {
    logWatcher.close();
    logWatcher = null;
    console.log('Log watcher stopped');
  }
}

async function archiveLog(filePath) {
  try {
    const archiveDir = store.get('archiveDirectory');
    await fs.mkdir(archiveDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const archiveName = `player_${timestamp}.log`;
    const archivePath = path.join(archiveDir, archiveName);
    
    await fs.copyFile(filePath, archivePath);
    console.log(`Archived log: ${archiveName}`);
    
    // Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('log-archived', {
        name: archiveName,
        path: archivePath,
        timestamp: new Date().toISOString()
      });
      
      // Auto-import if enabled
      if (store.get('autoImportEnabled')) {
        store.set('lastImportedLog', archivePath);
        mainWindow.webContents.send('auto-import-log', { path: archivePath, name: archiveName });
      }
    }
  } catch (err) {
    console.error('Error archiving log:', err);
  }
}

async function checkForNewImports() {
  if (!store.get('autoImportEnabled')) return;
  
  const logDirectory = store.get('logDirectory');
  if (!logDirectory) return;
  
  const reportsPath = path.join(logDirectory, 'reports');
  
  try {
    await fs.access(reportsPath);
    const files = await fs.readdir(reportsPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const lastImportedExports = store.get('lastImportedExports') || {};
    const newExports = [];
    
    // Build a map of latest exports per character/type
    const latestExports = new Map();
    
    for (const file of jsonFiles) {
      const filePath = path.join(reportsPath, file);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      const characterName = data.Character || 'Unknown';
      const type = data.Report === 'CharacterSheet' ? 'character' : 'storage';
      const key = `${characterName}_${type}`;
      
      const existing = latestExports.get(key);
      if (!existing || stats.mtime.getTime() > existing.mtime) {
        latestExports.set(key, {
          path: filePath,
          name: file,
          characterName,
          type,
          mtime: stats.mtime.getTime()
        });
      }
    }
    
    // Only import if newer than last imported
    for (const [key, exp] of latestExports.entries()) {
      const lastTime = lastImportedExports[key] || 0;
      if (exp.mtime > lastTime) {
        newExports.push(exp);
        lastImportedExports[key] = exp.mtime;
      }
    }
    
    if (newExports.length > 0) {
      store.set('lastImportedExports', lastImportedExports);
      if (mainWindow) {
        mainWindow.webContents.send('auto-import-exports', { exports: newExports });
      }
    }
  } catch (err) {
    // Reports directory doesn't exist or error reading
  }
}
