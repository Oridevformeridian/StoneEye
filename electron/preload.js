const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  setLogDirectory: (directory) => ipcRenderer.invoke('set-log-directory', directory),
  setWatchEnabled: (enabled) => ipcRenderer.invoke('set-watch-enabled', enabled),
  setAutoImportEnabled: (enabled) => ipcRenderer.invoke('set-auto-import-enabled', enabled),
  
  // Archived logs
  getArchivedLogs: () => ipcRenderer.invoke('get-archived-logs'),
  readLogFile: (filePath) => ipcRenderer.invoke('read-log-file', filePath),
  
  // Reports scanning
  scanReportsDirectory: () => ipcRenderer.invoke('scan-reports-directory'),
  
  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Events
  onLogArchived: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('log-archived', subscription);
    return () => ipcRenderer.removeListener('log-archived', subscription);
  },
  onAutoImportLog: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('auto-import-log', subscription);
    return () => ipcRenderer.removeListener('auto-import-log', subscription);
  },
  onAutoImportExports: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('auto-import-exports', subscription);
    return () => ipcRenderer.removeListener('auto-import-exports', subscription);
  },
  onUpdateAvailable: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  onUpdateReady: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('update-ready', subscription);
    return () => ipcRenderer.removeListener('update-ready', subscription);
  },
  onUpdateError: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('update-error', subscription);
    return () => ipcRenderer.removeListener('update-error', subscription);
  },
  onUpdateDownloadProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('update-download-progress', subscription);
    return () => ipcRenderer.removeListener('update-download-progress', subscription);
  }
});
