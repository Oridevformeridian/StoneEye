# Quick Start Guide

## Prerequisites

- Node.js 16+ and npm installed
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode (with Hot Reload)
```bash
npm run dev
```
Then open http://localhost:5173 in your browser.

### 3. Production Build
```bash
npm run build
```
The built files will be in the `dist/` folder.

### 4. Preview Production Build Locally
```bash
npm run preview
```

## Deployment

### Option 1: Static Hosting
Upload the contents of `dist/` folder to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Any web server (Apache, Nginx, etc.)

### Option 2: Self-Hosted
Copy `dist/index.html` and serve it from a local web server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (http-server)
npx http-server dist/

# Using PHP
php -S localhost:8000 -t dist/
```

## Data Management

### Importing Game Data
1. Go to "Import Data" tab
2. Click "Fetch All" for automatic CDN download (requires version number)
3. Or upload local JSON files

### Importing Character Data
1. Export character sheet from Project Gorgon
2. Upload JSON file in "User Data Import" section
3. Access via "My Character" tab

### Clearing Data
- Use "PURGE CHARACTER DATA" button in Import tab for user data
- Browser DevTools → Application → IndexedDB → GorgonDB_v9 to clear all data

## File Structure After Build

```
dist/
├── index.html          # Single HTML file with all assets
├── assets/
│   ├── index-*.js      # Minified JavaScript
│   └── index-*.css     # Minified CSS
└── ...                 # Other static assets
```

## Troubleshooting

### "npm: command not found"
- Install Node.js from https://nodejs.org/
- Restart your terminal/PowerShell

### Port 5173 already in use
```bash
npm run dev -- --port 3000
```

### Build size concerns
- Check `dist/` folder size
- Typical build is 400-600KB gzipped
- All assets (icons, styles) are bundled

### Database not persisting
- Enable browser storage/IndexedDB
- Check browser privacy settings
- Try incognito mode to rule out extensions

### Icons not showing
- Wait 2-3 seconds for Lucide to initialize
- Check browser console for errors
- Verify CDN access (Lucide requires internet)

## Performance Tips

- On slower connections, use "Fetch All" for data during off-peak hours
- The app works offline after initial data load (IndexedDB caching)
- Clear cache periodically if experiencing stale data

## Updates

To stay current with game updates:
1. Check https://cdn.projectgorgon.com/v{VERSION}/data/ for new version
2. Update version number in Import tab
3. Click "Fetch All" to re-import

## Support

For issues or feature requests:
- Check the original repository
- Review browser console for error messages
- Verify IndexedDB is enabled in browser settings
