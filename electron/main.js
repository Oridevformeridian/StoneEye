import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import chokidar from 'chokidar';
import fs from 'fs/promises';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Persistent settings
const store = new Store({
  defaults: {
    logDirectory: '',
    watchEnabled: false,
    autoImportEnabled: false,
    liveMonitoringEnabled: false,
    archiveDirectory: path.join(app.getPath('userData'), 'archived-logs'),
    lastImportedLog: '',
    lastImportedExports: {}
  }
});

let mainWindow;
let logWatcher = null;
let importCheckInterval = null;
let liveLogMonitor = null;
let lastLogPosition = 0;
let liveMonitoringEnabled = false;

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
  
  // Resume live monitoring if it was enabled
  const liveEnabled = store.get('liveMonitoringEnabled');
  console.log(`Startup: liveMonitoringEnabled=${liveEnabled}, logDirectory=${logDirectory}`);
  
  if (liveEnabled && logDirectory) {
    liveMonitoringEnabled = true;
    // Delay slightly to ensure window is ready to receive messages
    setTimeout(() => {
      startLiveLogMonitoring(logDirectory);
    }, 2000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return {
    logDirectory: store.get('logDirectory'),
    watchEnabled: store.get('watchEnabled'),
    autoImportEnabled: store.get('autoImportEnabled'),
    liveMonitoringEnabled: store.get('liveMonitoringEnabled'),
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

ipcMain.handle('set-live-monitoring-enabled', async (event, enabled) => {
  liveMonitoringEnabled = enabled;
  store.set('liveMonitoringEnabled', enabled);
  
  if (enabled) {
    const logDirectory = store.get('logDirectory');
    if (logDirectory) {
      startLiveLogMonitoring(logDirectory);
    } else {
      return { error: 'No log directory set' };
    }
  } else {
    stopLiveLogMonitoring();
  }
  
  return { success: true };
});

ipcMain.handle('get-archived-logs', async () => {
  const archiveDir = store.get('archiveDirectory');
  try {
    await fs.mkdir(archiveDir, { recursive: true });
    const files = await fs.readdir(archiveDir);
    const logFiles = files.filter(f => f.endsWith('.log') || f.endsWith('.log.gz'));
    
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
    const isGzipped = filePath.endsWith('.gz');
    
    if (isGzipped) {
      const compressed = await fs.readFile(filePath);
      const decompressed = await gunzip(compressed);
      return decompressed.toString('utf-8');
    } else {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    }
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
    const archiveName = `player_${timestamp}.log.gz`;
    const archivePath = path.join(archiveDir, archiveName);
    
    // Read, compress, and save
    const content = await fs.readFile(filePath, 'utf-8');
    const compressed = await gzip(content);
    await fs.writeFile(archivePath, compressed);
    
    const stats = await fs.stat(archivePath);
    console.log(`Archived log: ${archiveName} (compressed to ${(stats.size / 1024).toFixed(1)} KB)`);
    
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

// Live Log Monitoring Functions

function startLiveLogMonitoring(logDirectory) {
  if (liveLogMonitor) {
    stopLiveLogMonitoring();
  }

  const playerLogPath = path.join(logDirectory, 'player.log');
  console.log(`Starting live log monitoring: ${playerLogPath}`);
  
  // Notify renderer
  if (mainWindow) {
    mainWindow.webContents.send('live-monitoring-started', { path: playerLogPath });
  }
  
  // Reset position to read from current end of file
  fs.stat(playerLogPath)
    .then(stats => {
      lastLogPosition = stats.size;
      console.log(`Starting from position: ${lastLogPosition}`);
    })
    .catch(err => {
      console.log('player.log not found yet, will start from beginning');
      lastLogPosition = 0;
    });
  
  // Read new content immediately, then every 60 seconds
  setImmediate(() => readNewLogContent(playerLogPath));
  liveLogMonitor = setInterval(() => readNewLogContent(playerLogPath), 60000);
}

function stopLiveLogMonitoring() {
  if (liveLogMonitor) {
    clearInterval(liveLogMonitor);
    liveLogMonitor = null;
    lastLogPosition = 0;
    console.log('Live log monitoring stopped');
  }
}

async function readNewLogContent(playerLogPath) {
  if (!liveMonitoringEnabled) return;
  
  try {
    const stats = await fs.stat(playerLogPath);
    const currentSize = stats.size;
    
    // If file is smaller than last position, it was rotated - start from beginning
    if (currentSize < lastLogPosition) {
      console.log('Log file rotated, reading from beginning');
      lastLogPosition = 0;
    }
    
    // No new content
    if (currentSize === lastLogPosition) {
      return;
    }
    
    // Read only the new content
    const fileHandle = await fs.open(playerLogPath, 'r');
    const bytesToRead = currentSize - lastLogPosition;
    const buffer = Buffer.allocUnsafe(bytesToRead);
    
    await fileHandle.read(buffer, 0, bytesToRead, lastLogPosition);
    await fileHandle.close();
    
    const newContent = buffer.toString('utf-8');
    lastLogPosition = currentSize;
    
    console.log(`Read ${bytesToRead} new bytes from player.log`);
    
    // Send to renderer for parsing
    if (mainWindow && newContent.trim().length > 0) {
      mainWindow.webContents.send('live-log-update', { content: newContent, bytesRead: bytesToRead });
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist yet
      console.log('player.log not found');
    } else {
      console.error('Error reading live log:', err);
    }
  }
}
