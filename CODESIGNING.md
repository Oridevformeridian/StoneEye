# Code Signing Setup Guide

Code signing removes security warnings and allows users to install your app without extra steps.

## Windows Code Signing

### 1. Get a Code Signing Certificate
- Purchase from: DigiCert, Sectigo, GlobalSign (~$100-300/year)
- Or use self-signed cert for testing (users will still see warnings)

### 2. Export Certificate as PFX
```powershell
# If you have a .cer and .key file, combine them:
openssl pkcs12 -export -out cert.pfx -inkey private.key -in certificate.cer
```

### 3. Store Certificate
```bash
# Option A: Local file (for local builds)
mkdir certs
# Place cert.pfx in certs/ folder
# Add password to package.json certificatePassword field

# Option B: GitHub Secrets (for CI/CD)
# Encode certificate to base64:
certutil -encode cert.pfx cert.txt
# Copy content and add to GitHub Secrets as WIN_CSC_LINK
# Add password as WIN_CSC_KEY_PASSWORD
```

### 4. Update GitHub Actions
The workflow already uses these secrets:
- `WIN_CSC_LINK` - Base64 encoded certificate
- `WIN_CSC_KEY_PASSWORD` - Certificate password

### Local Build with Signing
```bash
# Set environment variables
$env:CSC_LINK="path/to/cert.pfx"
$env:CSC_KEY_PASSWORD="your-password"
npm run electron:build:win
```

## Mac Code Signing

### 1. Join Apple Developer Program
- Cost: $99/year
- Required for notarization

### 2. Create Developer ID Certificates
1. Go to https://developer.apple.com/account/resources/certificates
2. Create "Developer ID Application" certificate
3. Download and install in Keychain

### 3. Get App-Specific Password
1. Go to https://appleid.apple.com
2. Sign in → Security → App-Specific Passwords
3. Generate password for "electron-builder"

### 4. Store Credentials
```bash
# Option A: Local (for local builds)
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="your-team-id"

# Option B: GitHub Secrets (for CI/CD)
# Add these to GitHub repository secrets:
# - APPLE_ID
# - APPLE_APP_SPECIFIC_PASSWORD  
# - APPLE_TEAM_ID
```

### 5. Export Certificate for CI/CD
```bash
# Export certificate from Keychain as .p12 file
# Encode to base64:
base64 -i certificate.p12 -o certificate.txt
# Add to GitHub Secrets as CSC_LINK
# Add password as CSC_KEY_PASSWORD
```

### 6. Update package.json
Replace the empty `teamId` in package.json with your Apple Team ID.

### Local Build with Signing
```bash
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="your-team-id"
npm run electron:build:mac
```

## GitHub Actions Environment Variables

Add these to your GitHub repository secrets (Settings → Secrets and variables → Actions):

**Windows:**
- `WIN_CSC_LINK` - Base64 encoded .pfx certificate
- `WIN_CSC_KEY_PASSWORD` - Certificate password

**Mac:**
- `CSC_LINK` - Base64 encoded .p12 certificate
- `CSC_KEY_PASSWORD` - Certificate password
- `APPLE_ID` - Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Your Apple Developer Team ID

## Testing Without Signing

For development/testing, you can skip signing:
```bash
# Skip signing (users will see security warnings)
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run electron:build:win
```

## Verify Signing

**Windows:**
```powershell
# Check if .exe is signed
Get-AuthenticodeSignature ".\release\StoneEye Setup 1.0.0.exe"
```

**Mac:**
```bash
# Check code signature
codesign -vvv --deep --strict "StoneEye.app"

# Check notarization
spctl -a -vvv -t install "StoneEye.app"
```

## Cost Summary
- **Windows Certificate**: $100-300/year
- **Apple Developer Program**: $99/year
- **Total**: ~$200-400/year for both platforms

## Alternative: Self-Signed (Testing Only)
Users will still see warnings, but you can test the signing flow:

**Windows:**
```powershell
# Create self-signed certificate
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Test" -CertStoreLocation Cert:\CurrentUser\My
# Export as PFX from Certificate Manager
```

**Mac:**
```bash
# Create self-signed certificate in Keychain Access
# Applications → Utilities → Keychain Access → Certificate Assistant → Create a Certificate
# Choose "Code Signing" as certificate type
```
