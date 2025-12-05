import React, { useState, useEffect } from 'react';
import Icon from './Icon.jsx';

export default function UpdateNotification() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateReady, setUpdateReady] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!window.electron) return;

        const cleanupAvailable = window.electron.onUpdateAvailable((info) => {
            console.log('Update available:', info);
            setUpdateAvailable(true);
            setUpdateInfo(info);
        });

        const cleanupReady = window.electron.onUpdateReady((info) => {
            console.log('Update ready:', info);
            setUpdateReady(true);
            setUpdateInfo(info);
            setDownloadProgress(null);
        });

        const cleanupError = window.electron.onUpdateError((message) => {
            console.error('Update error:', message);
            setError(message);
        });

        const cleanupProgress = window.electron.onUpdateDownloadProgress((progress) => {
            setDownloadProgress(progress);
        });

        return () => {
            cleanupAvailable();
            cleanupReady();
            cleanupError();
            cleanupProgress();
        };
    }, []);

    const handleInstall = () => {
        if (window.electron) {
            window.electron.installUpdate();
        }
    };

    const handleCheckForUpdates = async () => {
        if (window.electron) {
            try {
                await window.electron.checkForUpdates();
            } catch (err) {
                console.error('Error checking for updates:', err);
            }
        }
    };

    if (error) {
        return (
            <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-700 rounded-lg p-4 shadow-xl max-w-md z-50">
                <div className="flex items-start gap-3">
                    <Icon name="alert-circle" className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="font-medium text-white text-sm">Update Error</div>
                        <div className="text-xs text-red-200 mt-1">{error}</div>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                        <Icon name="x" className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    if (updateReady) {
        return (
            <div className="fixed bottom-4 right-4 bg-green-900/90 border border-green-700 rounded-lg p-4 shadow-xl max-w-md z-50">
                <div className="flex items-start gap-3">
                    <Icon name="download" className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="font-medium text-white text-sm">Update Ready!</div>
                        <div className="text-xs text-green-200 mt-1">
                            Version {updateInfo?.version} has been downloaded
                        </div>
                        <button
                            onClick={handleInstall}
                            className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
                        >
                            Restart and Install
                        </button>
                    </div>
                    <button onClick={() => setUpdateReady(false)} className="text-green-400 hover:text-green-300">
                        <Icon name="x" className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    if (updateAvailable && downloadProgress) {
        return (
            <div className="fixed bottom-4 right-4 bg-blue-900/90 border border-blue-700 rounded-lg p-4 shadow-xl max-w-md z-50">
                <div className="flex items-start gap-3">
                    <Icon name="download" className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1">
                        <div className="font-medium text-white text-sm">Downloading Update</div>
                        <div className="text-xs text-blue-200 mt-1">
                            Version {updateInfo?.version} - {Math.round(downloadProgress.percent)}%
                        </div>
                        <div className="mt-2 bg-blue-950 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-blue-500 h-full transition-all duration-300"
                                style={{ width: `${downloadProgress.percent}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-blue-300 mt-1">
                            {(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (updateAvailable) {
        return (
            <div className="fixed bottom-4 right-4 bg-blue-900/90 border border-blue-700 rounded-lg p-4 shadow-xl max-w-md z-50">
                <div className="flex items-start gap-3">
                    <Icon name="download" className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="font-medium text-white text-sm">Update Available</div>
                        <div className="text-xs text-blue-200 mt-1">
                            Version {updateInfo?.version} is being downloaded...
                        </div>
                    </div>
                    <button onClick={() => setUpdateAvailable(false)} className="text-blue-400 hover:text-blue-300">
                        <Icon name="x" className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
