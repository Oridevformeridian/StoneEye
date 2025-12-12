import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Lucide icons
vi.mock('lucide-react', () => {
  const createMockIcon = (name) => {
    // Return a functional React component
    const MockIcon = (props) => {
      const React = require('react');
      return React.createElement('svg', {
        'data-testid': `icon-${name}`,
        'data-icon': name,
        className: props.className || '',
        ...props
      });
    };
    MockIcon.displayName = name;
    return MockIcon;
  };

  const mockIcons = {
    Activity: createMockIcon('Activity'),
    AlertTriangle: createMockIcon('AlertTriangle'),
    Archive: createMockIcon('Archive'),
    ArrowLeft: createMockIcon('ArrowLeft'),
    ArrowRight: createMockIcon('ArrowRight'),
    Award: createMockIcon('Award'),
    Book: createMockIcon('Book'),
    Bookmark: createMockIcon('Bookmark'),
    BookOpen: createMockIcon('BookOpen'),
    ChevronDown: createMockIcon('ChevronDown'),
    ChevronLeft: createMockIcon('ChevronLeft'),
    ChevronRight: createMockIcon('ChevronRight'),
    ChevronUp: createMockIcon('ChevronUp'),
    Clock: createMockIcon('Clock'),
    Copy: createMockIcon('Copy'),
    Download: createMockIcon('Download'),
    ExternalLink: createMockIcon('ExternalLink'),
    Eye: createMockIcon('Eye'),
    EyeOff: createMockIcon('EyeOff'),
    FileText: createMockIcon('FileText'),
    Filter: createMockIcon('Filter'),
    Folder: createMockIcon('Folder'),
    Grid: createMockIcon('Grid'),
    Hammer: createMockIcon('Hammer'),
    Heart: createMockIcon('Heart'),
    HelpCircle: createMockIcon('HelpCircle'),
    Home: createMockIcon('Home'),
    Inbox: createMockIcon('Inbox'),
    Info: createMockIcon('Info'),
    Layers: createMockIcon('Layer'),
    List: createMockIcon('List'),
    Loader: createMockIcon('Loader'),
    Loader2: createMockIcon('Loader2'),
    Menu: createMockIcon('Menu'),
    Package: createMockIcon('Package'),
    RefreshCw: createMockIcon('RefreshCw'),
    Search: createMockIcon('Search'),
    Settings: createMockIcon('Settings'),
    Shield: createMockIcon('Shield'),
    ShoppingCart: createMockIcon('ShoppingCart'),
    Sparkles: createMockIcon('Sparkles'),
    Star: createMockIcon('Star'),
    Sword: createMockIcon('Sword'),
    Tag: createMockIcon('Tag'),
    Trash: createMockIcon('Trash'),
    TrendingUp: createMockIcon('TrendingUp'),
    Upload: createMockIcon('Upload'),
    User: createMockIcon('User'),
    Users: createMockIcon('Users'),
    X: createMockIcon('X'),
    XCircle: createMockIcon('XCircle'),
    Zap: createMockIcon('Zap'),
  };

  return {
    ...mockIcons,
    icons: mockIcons, // Export icons object for Icon component
  };
});

// Mock Electron API
global.window = global.window || {};
global.window.electron = {
  selectDirectory: vi.fn(),
  getSettings: vi.fn(() => Promise.resolve({
    logDirectory: '',
    watchEnabled: false,
    autoImportEnabled: false,
    liveMonitoringEnabled: false,
    archiveDirectory: ''
  })),
  setLogDirectory: vi.fn(),
  setWatchEnabled: vi.fn(),
  setAutoImportEnabled: vi.fn(),
  setLiveMonitoringEnabled: vi.fn(),
  onLogWatchUpdate: vi.fn(() => () => {}),
  onAutoImportUpdate: vi.fn(() => () => {}),
  onLiveLogUpdate: vi.fn(() => () => {}),
  onLiveLogInitialContext: vi.fn(() => () => {}),
  scanReportsDirectory: vi.fn(() => Promise.resolve({ exports: [] })),
  importReportFile: vi.fn(() => Promise.resolve({})),
  selectArchiveDirectory: vi.fn(),
  archiveLog: vi.fn(),
  getArchivedLogs: vi.fn(() => Promise.resolve([])),
  getArchivedLogContent: vi.fn(() => Promise.resolve('')),
  setEventNotification: vi.fn(),
  getEventNotifications: vi.fn(() => Promise.resolve({})),
  setVendorNotificationsEnabled: vi.fn(),
  updateVendorTimers: vi.fn(),
  deleteArchivedLog: vi.fn(),
  reimportArchivedLogs: vi.fn()
};
