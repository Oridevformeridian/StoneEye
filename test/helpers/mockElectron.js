import { vi } from 'vitest';

/**
 * Mock Electron API for testing
 */
export function mockElectronAPI(overrides = {}) {
  const defaultMock = {
    selectDirectory: vi.fn(() => Promise.resolve('/test/directory')),
    getSettings: vi.fn(() => Promise.resolve({
      logDirectory: '',
      watchEnabled: false,
      autoImportEnabled: false,
      liveMonitoringEnabled: false,
      archiveDirectory: ''
    })),
    setLogDirectory: vi.fn(() => Promise.resolve(true)),
    setWatchEnabled: vi.fn(() => Promise.resolve(true)),
    setAutoImportEnabled: vi.fn(() => Promise.resolve(true)),
    setLiveMonitoringEnabled: vi.fn(() => Promise.resolve(true)),
    onLogWatchUpdate: vi.fn(() => vi.fn()),
    onAutoImportUpdate: vi.fn(() => vi.fn()),
    onLiveLogUpdate: vi.fn(() => vi.fn()),
    onLiveLogInitialContext: vi.fn(() => vi.fn()),
    scanReportsDirectory: vi.fn(() => Promise.resolve({ exports: [] })),
    importReportFile: vi.fn(() => Promise.resolve({ Character: 'TestChar', Report: 'CharacterSheet' })),
    selectArchiveDirectory: vi.fn(() => Promise.resolve('/test/archive')),
    archiveLog: vi.fn(() => Promise.resolve({ success: true })),
    getArchivedLogs: vi.fn(() => Promise.resolve([])),
    getArchivedLogContent: vi.fn(() => Promise.resolve('')),
    setEventNotification: vi.fn(() => Promise.resolve(true)),
    getEventNotifications: vi.fn(() => Promise.resolve({})),
    setVendorNotificationsEnabled: vi.fn(() => Promise.resolve(true)),
    updateVendorTimers: vi.fn(() => Promise.resolve(true)),
    deleteArchivedLog: vi.fn(() => Promise.resolve(true)),
    reimportArchivedLogs: vi.fn(() => Promise.resolve(true))
  };

  window.electron = {
    ...defaultMock,
    ...overrides
  };

  return window.electron;
}

/**
 * Reset Electron API mocks
 */
export function resetElectronMocks() {
  if (window.electron) {
    Object.values(window.electron).forEach(fn => {
      if (fn && typeof fn.mockReset === 'function') {
        fn.mockReset();
      }
    });
  }
}
