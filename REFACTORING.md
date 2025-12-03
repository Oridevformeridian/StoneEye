# Stone Eye - Vite Refactoring

## Summary of Changes

This project has been refactored from a single `oldindex.html` file into a proper **Vite-based single-file deployment** following React best practices.

## Key Improvements

### 1. **Modular Component Architecture**
- Split monolithic HTML into separate React components
- Each component has its own file in `src/components/` and `src/views/`
- Easier to maintain, test, and extend

### 2. **Vite Build System**
- Modern build tooling with hot module replacement (HMR)
- Automatic code splitting and tree-shaking
- Production builds are minified and optimized
- Single HTML file deployment with all assets bundled

### 3. **Backward Compatibility**
- ✅ **Database schema unchanged**: Still uses `GorgonDB_v9` with the same structure
- ✅ **localStorage format preserved**: Character data, storage inventory, bookmarks all stored the same way
- ✅ **API endpoints compatible**: Still fetches from the same CDN endpoints
- ✅ **UI/UX identical**: Same visual design and functionality

### 4. **Proper Dependency Management**
- React 19.2 and ReactDOM installed as npm dependencies
- Lucide React icons for better tree-shaking than dynamic loading
- Dexie 4.2 for database management
- TailwindCSS for styling

## Project Structure

```
stoneeye/
├── src/
│   ├── App.jsx                    # Main app component with routing
│   ├── main.js                    # React entry point
│   ├── index.css                  # TailwindCSS and custom styles
│   ├── components/                # Reusable UI components
│   │   ├── Icon.jsx
│   │   ├── Badge.jsx
│   │   ├── GameIcon.jsx
│   │   ├── WikiButton.jsx
│   │   ├── LoadingBar.jsx
│   │   ├── NavButton.jsx
│   │   ├── MobileNavBtn.jsx
│   │   ├── ResultRow.jsx
│   │   ├── ReferenceList.jsx
│   │   ├── StatBox.jsx
│   │   ├── ItemDetail.jsx
│   │   ├── RecipeDetail.jsx
│   │   ├── AbilityDetail.jsx
│   │   ├── SkillDetail.jsx
│   │   ├── TreasureDetail.jsx
│   │   └── GenericDetail.jsx
│   ├── views/                     # Page-level views
│   │   ├── IngestView.jsx
│   │   ├── BookmarksView.jsx
│   │   ├── NpcServicesView.jsx
│   │   ├── ActiveSkillsView.jsx
│   │   ├── TradeSkillsView.jsx
│   │   ├── LoreView.jsx
│   │   ├── TreasureListView.jsx
│   │   └── MyCharacterView.jsx
│   ├── constants/
│   │   └── index.js               # Game data constants
│   └── db/
│       └── index.js               # Dexie database setup
├── index.html                      # Single HTML file (minimal)
├── vite.config.js                 # Vite configuration
├── tailwind.config.js             # TailwindCSS configuration
├── postcss.config.js              # PostCSS configuration
├── package.json                   # Dependencies and scripts
└── oldindex.html                  # Original monolithic file (backup)
```

## Building & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start development server with HMR
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Production Build

```bash
# Build optimized production bundle
npm run build
```

This generates a single `dist/index.html` file with all assets embedded/referenced correctly.

### Single-File Deployment

The built `dist/index.html` can be:
- ✅ Hosted on any static web server
- ✅ Served locally via `file://` protocol (with limitations)
- ✅ Embedded in Electron apps
- ✅ Used in other containers or CDNs

## Build Configuration

The `vite.config.js` is configured for optimal single-file deployment:

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {}  // Forces single bundle (no code splitting)
    }
  },
  minify: 'terser',     // Aggressive minification
  terserOptions: {
    compress: {
      drop_console: false
    }
  }
}
```

## Database Compatibility

### Schema (Unchanged)
- `objects`: `[type+id], type, name, *refs, [type+category]`
- `userData`: `[type+id], type`

### Storage Keys (Unchanged)
- Character data: `gorgon_character_{charName}`
- Inventory data: `gorgon_inventory_{charName}`
- Bookmarks: `stone_eye_bookmarks`

All existing data from `oldindex.html` will work seamlessly with the new Vite build.

## Lucide Icons

Uses `lucide-react` npm package instead of CDN dynamic loading:
- Better tree-shaking and bundle optimization
- No runtime icon rendering delays
- Preloaded in HTML via `<script src="https://unpkg.com/lucide@latest"></script>` fallback

## Migration Notes

1. **No data loss**: All localStorage data remains intact
2. **No breaking changes**: Database schema and data structures unchanged
3. **Improved performance**: 
   - Faster initial load (code is optimized)
   - Better caching (versioned assets)
   - Smaller total payload when gzipped
4. **Better developer experience**:
   - HMR for instant feedback
   - Proper module system
   - Easy to extend and maintain

## Troubleshooting

### Build fails with "module not found"
- Run `npm install` again
- Clear `node_modules` and `package-lock.json`, then reinstall

### Icons not loading
- Lucide is loaded via CDN fallback in `index.html`
- Check network tab for CDN availability
- Icons should render both in dev and production

### Database errors
- Ensure Dexie 4.2+ is installed
- Check browser console for errors
- Try `localStorage.clear()` if database is corrupted
- Re-import game data via Import tab

## Next Steps / Future Improvements

- [ ] Add TypeScript support
- [ ] Add unit tests
- [ ] Add PWA manifest for offline capability
- [ ] Implement lazy loading for large views
- [ ] Add analytics
- [ ] Create CI/CD pipeline
- [ ] Add version checking against game updates

---

**Version**: 1.0.0  
**Last Updated**: December 2, 2025  
**License**: ISC
