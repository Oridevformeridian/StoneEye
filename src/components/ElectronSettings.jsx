import React, { useState, useEffect } from 'react';

const ElectronSettings = ({ onImportLog }) => {
    const [settings, setSettings] = useState(null);
    const [archivedLogs, setArchivedLogs] = useState([]);
    const [reportExports, setReportExports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
        loadArchivedLogs();
        loadReportExports();

        // Listen for new archived logs
        if (window.electron?.onLogArchived) {
            const unsubscribe = window.electron.onLogArchived((data) => {
                console.log('New log archived:', data);
                loadArchivedLogs();
            });
            
            const unsubscribeAutoLog = window.electron.onAutoImportLog?.(async (data) => {
                console.log('Auto-importing log:', data.name);
                await handleImportLog(data.path);
            });
            
            const unsubscribeAutoExports = window.electron.onAutoImportExports?.(async (data) => {
                console.log('Auto-importing exports:', data.exports);
                for (const exp of data.exports) {
                    const content = await window.electron.readLogFile(exp.path);
                    if (content && window.handleJsonImport) {
                        const blob = new Blob([content], { type: 'application/json' });
                        const file = new File([blob], exp.name, { type: 'application/json' });
                        await window.handleJsonImport(file);
                    }
                }
                loadReportExports();
            });
            
            return () => {
                unsubscribe();
                unsubscribeAutoLog?.();
                unsubscribeAutoExports?.();
            };
        }
    }, []);

    const loadSettings = async () => {
        if (window.electron?.getSettings) {
            const settings = await window.electron.getSettings();
            setSettings(settings);
            setLoading(false);
        }
    };

    const loadArchivedLogs = async () => {
        if (window.electron?.getArchivedLogs) {
            const logs = await window.electron.getArchivedLogs();
            setArchivedLogs(logs);
        }
    };

    const loadReportExports = async () => {
        if (window.electron?.scanReportsDirectory) {
            const result = await window.electron.scanReportsDirectory();
            if (result.exports) {
                setReportExports(result.exports);
            }
        }
    };

    const handleSelectDirectory = async () => {
        const directory = await window.electron.selectDirectory();
        if (directory) {
            await window.electron.setLogDirectory(directory);
            await loadSettings();
            await loadReportExports(); // Rescan when directory changes
        }
    };

    const handleToggleWatch = async () => {
        const newEnabled = !settings.watchEnabled;
        const result = await window.electron.setWatchEnabled(newEnabled);
        if (result.error) {
            alert(result.error);
        } else {
            // Update local state immediately
            setSettings({ ...settings, watchEnabled: newEnabled });
        }
    };

    const handleToggleAutoImport = async () => {
        const newEnabled = !settings.autoImportEnabled;
        await window.electron.setAutoImportEnabled(newEnabled);
        // Update local state immediately
        setSettings({ ...settings, autoImportEnabled: newEnabled });
    };

    const handleImportLog = async (logPath) => {
        const content = await window.electron.readLogFile(logPath);
        if (content && onImportLog) {
            // Create a File-like object from the content
            const blob = new Blob([content], { type: 'text/plain' });
            const fileName = logPath.split(/[\\/]/).pop();
            const file = new File([blob], fileName, { type: 'text/plain' });
            onImportLog(file);
        }
    };

    if (loading) {
        return <div className="text-slate-400">Loading settings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                <div className="text-sm font-bold text-slate-300 mb-3">Desktop Features</div>
                
                <div className="space-y-4">
                    {/* Log Directory */}
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-2">
                            Game Log Directory
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={settings?.logDirectory || 'Not set'}
                                readOnly
                                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300"
                            />
                            <button 
                                onClick={handleSelectDirectory}
                                className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-500"
                            >
                                Browse
                            </button>
                        </div>
                    </div>

                    {/* Auto-watch Toggle */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={settings?.watchEnabled || false}
                                onChange={handleToggleWatch}
                                className="w-4 h-4"
                            />
                            <div>
                                <div className="text-sm text-slate-300 font-semibold">
                                    Auto-Watch Logs
                                </div>
                                <div className="text-xs text-slate-500">
                                    Automatically archive logs when the game rotates them
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Auto-import Toggle */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={settings?.autoImportEnabled || false}
                                onChange={handleToggleAutoImport}
                                className="w-4 h-4"
                            />
                            <div>
                                <div className="text-sm text-slate-300 font-semibold">
                                    Auto-Import Latest
                                </div>
                                <div className="text-xs text-slate-500">
                                    Automatically import new logs and character/storage exports
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Archive Directory */}
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-2">
                            Archive Directory
                        </label>
                        <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-400 break-all">
                            {settings?.archiveDirectory || 'Not set'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Archived Logs List */}
            <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                <div className="text-sm font-bold text-slate-300 mb-3">
                    Archived Logs ({archivedLogs.length})
                </div>
                
                {archivedLogs.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4">
                        No archived logs yet
                    </div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {archivedLogs.map(log => (
                            <div 
                                key={log.path}
                                className="flex items-center justify-between p-2 bg-slate-900/50 rounded hover:bg-slate-900 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-slate-300 truncate">{log.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {new Date(log.created).toLocaleString()} • {(log.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleImportLog(log.path)}
                                    className="ml-3 px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-500"
                                >
                                    Import
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Character/Storage Exports from reports/ */}
            {reportExports.length > 0 && (
                <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-bold text-slate-300">
                            Detected Exports ({reportExports.length})
                        </div>
                        <button
                            onClick={async () => {
                                for (const exp of reportExports) {
                                    const content = await window.electron.readLogFile(exp.path);
                                    if (content && window.handleJsonImport) {
                                        const blob = new Blob([content], { type: 'application/json' });
                                        const file = new File([blob], exp.name, { type: 'application/json' });
                                        await window.handleJsonImport(file);
                                    }
                                }
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-500 font-semibold"
                        >
                            Auto-Import Latest
                        </button>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {reportExports.map(exp => (
                            <div 
                                key={exp.path}
                                className="flex items-center justify-between p-2 bg-slate-900/50 rounded hover:bg-slate-900 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-slate-300 flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${exp.type === 'character' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'}`}>
                                            {exp.type === 'character' ? 'CHAR' : 'STOR'}
                                        </span>
                                        <span className="truncate">{exp.characterName}</span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {new Date(exp.modified).toLocaleString()} • {(exp.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                                <button 
                                    onClick={async () => {
                                        const content = await window.electron.readLogFile(exp.path);
                                        if (content && onImportLog) {
                                            // Create a proper JSON file for character/storage import
                                            const blob = new Blob([content], { type: 'application/json' });
                                            const file = new File([blob], exp.name, { type: 'application/json' });
                                            // Pass to parent with a flag that this is JSON import, not log import
                                            if (window.handleJsonImport) {
                                                window.handleJsonImport(file);
                                            }
                                        }
                                    }}
                                    className="ml-3 px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-500"
                                >
                                    Import
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ElectronSettings;
