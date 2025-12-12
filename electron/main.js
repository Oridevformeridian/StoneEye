import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron';
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
    lastImportedExports: {},
    eventNotifications: {},
    vendorNotificationsEnabled: false,
    archivedFiles: {} // Track archived files: { 'player-prev.log': { size: number, mtime: timestamp } }
  }
});

let mainWindow;
let logWatcher = null;
let importCheckInterval = null;
let liveLogMonitor = null;
let lastLogPosition = 0;
let liveMonitoringEnabled = false;
let eventCheckInterval = null;
let vendorCheckInterval = null;
let vendorTimers = new Map(); // vendorId -> { name, resetTime, maxBalance }

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
  
  // Check for unarchived player-prev.log on startup
  if (logDirectory) {
    setTimeout(() => checkForUnarchivedPrevLog(logDirectory), 3000);
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
  
  // Start background notification timers
  startEventNotifications();
  startVendorNotifications();
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
      
      // Check for unarchived player-prev.log when enabling
      setTimeout(() => checkForUnarchivedPrevLog(logDirectory), 1000);
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
    // Get file stats
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    const mtime = stats.mtimeMs;
    
    // Check if this exact file has already been archived
    const archivedFiles = store.get('archivedFiles') || {};
    const fileKey = path.basename(filePath);
    const previousArchive = archivedFiles[fileKey];
    
    if (previousArchive && previousArchive.size === fileSize && previousArchive.mtime === mtime) {
      console.log(`Skipping archive - ${fileKey} already archived (size: ${fileSize}, mtime: ${new Date(mtime).toISOString()})`);
      return;
    }
    
    const archiveDir = store.get('archiveDirectory');
    await fs.mkdir(archiveDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const archiveName = `player_${timestamp}.log.gz`;
    const archivePath = path.join(archiveDir, archiveName);
    
    // Read, compress, and save
    const content = await fs.readFile(filePath, 'utf-8');
    const compressed = await gzip(content);
    await fs.writeFile(archivePath, compressed);
    
    const compressedStats = await fs.stat(archivePath);
    console.log(`Archived log: ${archiveName} (compressed to ${(compressedStats.size / 1024).toFixed(1)} KB)`);
    
    // Record this archive to prevent duplicates
    archivedFiles[fileKey] = {
      size: fileSize,
      mtime: mtime,
      archiveName: archiveName,
      archivedAt: new Date().toISOString()
    };
    store.set('archivedFiles', archivedFiles);
    
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

async function checkForUnarchivedPrevLog(logDirectory) {
  try {
    const prevLogPath = path.join(logDirectory, 'player-prev.log');
    
    // Check if file exists
    try {
      await fs.access(prevLogPath);
    } catch {
      console.log('No player-prev.log found');
      return;
    }
    
    // Get file stats
    const stats = await fs.stat(prevLogPath);
    const fileSize = stats.size;
    const mtime = stats.mtimeMs;
    
    // Ignore tiny files
    if (fileSize < 1000) {
      console.log(`player-prev.log too small (${fileSize} bytes), skipping`);
      return;
    }
    
    // Check if this exact file has been archived
    const archivedFiles = store.get('archivedFiles') || {};
    const previousArchive = archivedFiles['player-prev.log'];
    
    if (previousArchive && previousArchive.size === fileSize && previousArchive.mtime === mtime) {
      console.log(`player-prev.log already archived (${previousArchive.archiveName})`);
      return;
    }
    
    // New unarchived file detected!
    console.log(`Found unarchived player-prev.log (size: ${fileSize}, mtime: ${new Date(mtime).toISOString()})`);
    console.log('Creating backup...');
    await archiveLog(prevLogPath);
  } catch (err) {
    console.error('Error checking for unarchived prev log:', err);
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
  
  // IMPORTANT: Read the entire current log file first to establish context (vendor sessions, etc.)
  fs.readFile(playerLogPath, 'utf-8')
    .then(content => {
      console.log(`Reading full player.log for initial context: ${content.length} bytes`);
      // Send full content to renderer to parse and establish vendor sessions
      if (mainWindow && content.length > 0) {
        mainWindow.webContents.send('live-log-initial-context', { content });
      }
      
      // Now get current file size to start incremental monitoring from this point
      return fs.stat(playerLogPath);
    })
    .then(stats => {
      lastLogPosition = stats.size;
      console.log(`Initial context loaded. Starting incremental monitoring from position: ${lastLogPosition}`);
      
      // Start reading new content every 60 seconds
      liveLogMonitor = setInterval(() => readNewLogContent(playerLogPath), 60000);
    })
    .catch(err => {
      console.log('player.log not found or error reading:', err.message);
      lastLogPosition = 0;
      
      // Still start monitoring, will read from beginning when file appears
      liveLogMonitor = setInterval(() => readNewLogContent(playerLogPath), 60000);
    });
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

// ===== Background Event Notifications =====
function startEventNotifications() {
  if (eventCheckInterval) clearInterval(eventCheckInterval);
  
  // Check every minute
  eventCheckInterval = setInterval(() => {
    checkEventNotifications();
  }, 60000);
  
  // Run immediately
  checkEventNotifications();
}

function checkEventNotifications() {
  const eventSettings = store.get('eventNotifications') || {};
  const now = new Date();
  
  // Convert to EST
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = estFormatter.formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const hour = parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  const todayKey = `${parts.year}-${parts.month}-${parts.day}`;
  
  // Eggs at 14:25 (5 min before 14:30)
  if (eventSettings.eggs_14_30 && hour === 14 && minute === 25) {
    const key = `eggs_14_30_${todayKey}`;
    if (!store.get(`notified_${key}`)) {
      showNotification('Eggs Event in 5 minutes', 'Eggs starts at 14:30 Eastern');
      store.set(`notified_${key}`, true);
    }
  }
  
  // Eggs at 18:25 (5 min before 18:30)
  if (eventSettings.eggs_18_30 && hour === 18 && minute === 25) {
    const key = `eggs_18_30_${todayKey}`;
    if (!store.get(`notified_${key}`)) {
      showNotification('Eggs Event in 5 minutes', 'Eggs starts at 18:30 Eastern');
      store.set(`notified_${key}`, true);
    }
  }
  
  // Qatik Daily at midnight
  if (eventSettings.qatik_daily && hour === 0 && minute === 0) {
    const key = `qatik_daily_${todayKey}`;
    if (!store.get(`notified_${key}`)) {
      const zone = getQatikZone(new Date(parseInt(parts.year), parseInt(parts.month) - 1, parseInt(parts.day)));
      showNotification('Qatik Daily Reset', `Today's zone: ${zone}`);
      store.set(`notified_${key}`, true);
    }
  }
  
  // Cleanup old notification keys (keep last 7 days)
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const cleanupDate = sevenDaysAgo.toISOString().split('T')[0];
  const allKeys = Object.keys(store.store);
  allKeys.forEach(key => {
    if (key.startsWith('notified_') && key < `notified_${cleanupDate}`) {
      store.delete(key);
    }
  });
}

function getQatikZone(date) {
  const zones = ['Winter Nexus', 'Yeti Cave', 'Wolf Cave', 'Dark Chapel'];
  const refDate = new Date('2025-12-03T05:00:00Z'); // Dec 3, 2025 00:00 EST
  const daysSince = Math.floor((date - refDate) / (1000 * 60 * 60 * 24));
  const index = (daysSince % 4 + 4) % 4;
  return zones[index];
}

// ===== Background Vendor Notifications =====
function startVendorNotifications() {
  if (vendorCheckInterval) clearInterval(vendorCheckInterval);
  
  // Check every 30 seconds
  vendorCheckInterval = setInterval(() => {
    checkVendorResets();
  }, 30000);
}

function checkVendorResets() {
  if (!store.get('vendorNotificationsEnabled')) return;
  
  const now = Date.now();
  const notifiedKeys = new Set();
  
  vendorTimers.forEach((vendor, vendorId) => {
    const timeUntil = vendor.resetTime - now;
    
    // Notify if reset is within next 60 seconds
    if (timeUntil > 0 && timeUntil <= 60000) {
      const key = `vendor_${vendorId}_${vendor.resetTime}`;
      
      // Only notify once per vendor per reset time
      if (!store.get(key)) {
        const seconds = Math.round(timeUntil / 1000);
        const maxBal = vendor.maxBalance === 2147483647 ? '∞' : vendor.maxBalance.toLocaleString();
        showNotification(
          `${vendor.name} Vendor Restock`,
          `Balance resets to ${maxBal} in ${seconds} seconds`
        );
        store.set(key, true);
        notifiedKeys.add(key);
        
        // Clean up after reset happens
        setTimeout(() => {
          store.delete(key);
        }, timeUntil + 5000);
      }
    }
  });
}

function showNotification(title, body) {
  const notification = new Notification({
    title,
    body,
    icon: path.join(__dirname, '../public/favicon.ico')
  });
  
  notification.show();
  
  notification.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// IPC Handlers for notification management
ipcMain.handle('set-event-notification', async (event, eventId, enabled) => {
  const settings = store.get('eventNotifications') || {};
  settings[eventId] = enabled;
  store.set('eventNotifications', settings);
  return { success: true };
});

ipcMain.handle('get-event-notifications', async () => {
  return store.get('eventNotifications') || {};
});

ipcMain.handle('set-vendor-notifications-enabled', async (event, enabled) => {
  store.set('vendorNotificationsEnabled', enabled);
  return { success: true };
});

ipcMain.handle('get-vendor-notifications-enabled', async () => {
  return store.get('vendorNotificationsEnabled') || false;
});

ipcMain.handle('update-vendor-timers', async (event, timers) => {
  // timers is an array of { id, name, resetTime, maxBalance }
  vendorTimers.clear();
  timers.forEach(v => {
    vendorTimers.set(v.id, {
      name: v.name,
      resetTime: v.resetTime,
      maxBalance: v.maxBalance
    });
  });
  console.log(`Updated ${vendorTimers.size} vendor timers`);
  return { success: true };
});
