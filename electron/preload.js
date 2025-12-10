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
  setLiveMonitoringEnabled: (enabled) => ipcRenderer.invoke('set-live-monitoring-enabled', enabled),
  
  // Archived logs
  getArchivedLogs: () => ipcRenderer.invoke('get-archived-logs'),
  readLogFile: (filePath) => ipcRenderer.invoke('read-log-file', filePath),
  
  // Reports scanning
  scanReportsDirectory: () => ipcRenderer.invoke('scan-reports-directory'),
  
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
  onLiveLogUpdate: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('live-log-update', subscription);
    return () => ipcRenderer.removeListener('live-log-update', subscription);
  },
  onLiveMonitoringStarted: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('live-monitoring-started', subscription);
    return () => ipcRenderer.removeListener('live-monitoring-started', subscription);
  }
});
