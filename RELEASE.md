# StoneEye Release Guide

## Creating a New Release

### 1. Update Version
```bash
# Update version in package.json
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0
```

### 2. Commit and Tag
```bash
git add package.json
git commit -m "Bump version to v1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

### 3. GitHub Actions
The workflow will automatically:
- Build for Windows, Mac, and Linux
- Create GitHub Release
- Upload installers and update files
- Users will receive auto-updates

### 4. Configuration
Before first release, update `package.json`:
- Replace `GITHUB_USERNAME` with your GitHub username in the `publish` section

### Update Channels
- **Stable**: Push tags like `v1.0.0`
- **Beta**: Push tags like `v1.0.0-beta.1`

### Manual Build
```bash
# Windows
npm run electron:build:win

# Mac
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

### Code Signing (Optional but Recommended)
For production releases, add code signing certificates:

**Windows:**
- Set `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` in GitHub Secrets

**Mac:**
- Set `CSC_LINK` and `CSC_KEY_PASSWORD` in GitHub Secrets
- Set `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD` for notarization

### Testing Updates
1. Install version 1.0.0
2. Release version 1.0.1
3. App should show update notification within a few seconds
4. Click "Restart and Install" to update
