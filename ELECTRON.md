# Electron Desktop App

## Running in Development

1. Install dependencies:
```bash
npm install
```

2. Run the Electron app with hot-reload:
```bash
npm run electron:dev
```

This starts both Vite dev server and Electron, with automatic reloading.

## Building for Distribution

### Windows
```bash
npm run electron:build:win
```

### macOS
```bash
npm run electron:build:mac
```

### Linux
```bash
npm run electron:build:linux
```

Built apps will be in the `release/` directory.

## Features

### Desktop-Only Features
- **Auto Log Watching**: Monitors `player-prev.log` for changes
- **Auto Archiving**: Copies rotated logs with timestamps to archive directory
- **Background Service**: Runs continuously while app is open
- **Settings UI**: Configure log directory and enable/disable watching

### Shared Features
All web features plus desktop automation:
- Manual log import
- IndexedDB storage
- Sales tracking
- Ledger view
- NPC favor tracking

## Architecture

- `electron/main.js` - Main process (Node.js) with file watcher
- `electron/preload.js` - IPC bridge for security
- `src/components/ElectronSettings.jsx` - Desktop settings UI
- Web app runs inside Electron with additional features exposed

## Configuration

Settings stored in OS-specific locations:
- **Windows**: `%APPDATA%/stoneeye`
- **macOS**: `~/Library/Application Support/stoneeye`
- **Linux**: `~/.config/stoneeye`

Archived logs stored in `archived-logs/` subdirectory by default.
