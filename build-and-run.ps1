#!/usr/bin/env pwsh
# Build and run the Electron Windows app

Write-Host "Building web app..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Web build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nBuilding Electron Windows app..." -ForegroundColor Cyan
npm run electron:build:win

if ($LASTEXITCODE -ne 0) {
    Write-Host "Electron build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nLaunching app..." -ForegroundColor Green
$exePath = "release\StoneEye Setup 1.0.1.exe"

if (Test-Path $exePath) {
    Start-Process $exePath
    Write-Host "App launched!" -ForegroundColor Green
} else {
    Write-Host "Installer not found at: $exePath" -ForegroundColor Red
    Write-Host "Looking for executable in release folder..." -ForegroundColor Yellow
    Get-ChildItem -Path "release" -Filter "*.exe" -Recurse | Select-Object -First 1 | ForEach-Object {
        Write-Host "Found: $($_.FullName)" -ForegroundColor Yellow
        Start-Process $_.FullName
    }
}
