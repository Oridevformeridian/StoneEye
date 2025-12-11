import { useState, useEffect, useCallback, useRef } from 'react';
import logIngestion from '../services/logIngestion';

export const useLogMonitor = () => {
    const [status, setStatus] = useState('inactive'); // inactive, active, processing
    const [lastUpdate, setLastUpdate] = useState(null);
    const [stats, setStats] = useState({ entries: 0, transactions: 0 });

    const broadcastLog = (message) => {
        const timestampedMsg = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        // Persist to localStorage so IngestView can see it even if not mounted
        try {
            const persistedLogs = JSON.parse(localStorage.getItem('ingest_logs') || '[]');
            persistedLogs.unshift(timestampedMsg);
            if (persistedLogs.length > 100) persistedLogs.length = 100;
            localStorage.setItem('ingest_logs', JSON.stringify(persistedLogs));
        } catch (e) {
            console.error('Failed to persist log:', e);
        }

        // Broadcast to active views
        window.dispatchEvent(new CustomEvent('log-monitor-event', { detail: { message: timestampedMsg } }));
    };

    const handleLogUpdate = useCallback(async (data) => {
        if (!data || !data.content) return;
        
        setStatus('processing');
        broadcastLog(`Received ${data.content.length} bytes of log data`);
        
        try {
            const result = await logIngestion.processLogContent(data.content, {
                isIncremental: true,
                skipDeduplication: false
            });

            if (result.success) {
                setStats(prev => ({
                    entries: prev.entries + result.processed.logEntries,
                    transactions: prev.transactions + result.processed.transactions
                }));

                if (result.processed.logEntries > 0) {
                    broadcastLog(`Stored ${result.processed.logEntries} new log entries`);
                }
                if (result.skipped.duplicates > 0) {
                    broadcastLog(`Skipped ${result.skipped.duplicates} duplicate log entries`);
                }
                if (result.processed.vendors > 0) {
                    broadcastLog(`Updated ${result.processed.vendors} vendors`);
                }
                if (result.processed.transactions > 0) {
                    broadcastLog(`Recorded ${result.processed.transactions} new transactions`);
                    if (window.showToast) {
                        window.showToast(`💰 Recorded ${result.processed.transactions} new transaction(s)`, 'success');
                    }
                }
            }
        } catch (err) {
            console.error('[MONITOR] Error processing log update:', err);
            broadcastLog(`Error: ${err.message}`);
        } finally {
            setStatus('active');
            setLastUpdate(new Date());
        }
    }, []);

    useEffect(() => {
        if (!window.electron) return;

        const cleanupStarted = window.electron.onLiveMonitoringStarted((data) => {
            console.log('[MONITOR] Live monitoring started:', data);
            logIngestion.resetContext();
            broadcastLog(`Live monitoring started: ${data.path}`);
            setStatus('active');
            if (window.showToast) window.showToast('🔴 Live log monitoring active', 'success');
        });

        const cleanupStopped = window.electron.onLiveMonitoringStopped?.(() => {
            console.log('[MONITOR] Live monitoring stopped');
            broadcastLog('Live monitoring stopped');
            setStatus('inactive');
            if (window.showToast) window.showToast('Live log monitoring stopped', 'info');
        });

        const cleanupMessage = window.electron.onLogMonitorMessage?.((data) => {
            if (data && data.message) {
                broadcastLog(data.message);
            }
        });

        const cleanupUpdate = window.electron.onLiveLogUpdate(handleLogUpdate);

        // Check initial status
        window.electron.getSettings().then(settings => {
            if (settings.liveMonitoringEnabled) {
                setStatus('active');
            }
        });
        
        return () => {
            cleanupStarted();
            cleanupStopped?.();
            cleanupMessage?.();
            cleanupUpdate();
        };
    }, [handleLogUpdate]);

    return { status, lastUpdate, stats };
};
