# FFmpeg Installation Guide

## Problem
The app shows "No audio devices found" because FFmpeg is not installed or not in your system PATH.

## Solution: Install FFmpeg

### Option 1: Using Chocolatey (Easiest)

1. **Install Chocolatey** (if not already installed):
   - Open PowerShell as Administrator
   - Run: `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`

2. **Install FFmpeg**:
   ```powershell
   choco install ffmpeg
   ```

3. **Restart your terminal/command prompt**

### Option 2: Manual Installation

1. **Download FFmpeg**:
   - Go to https://www.gyan.dev/ffmpeg/builds/
   - Download "ffmpeg-release-essentials.zip" (or latest version)
   - Extract to a folder (e.g., `C:\ffmpeg`)

2. **Add to PATH**:
   - Press `Win + X` and select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add the path to FFmpeg `bin` folder (e.g., `C:\ffmpeg\bin`)
   - Click "OK" on all dialogs

3. **Restart your computer** (or at least restart all terminals)

### Option 3: Portable FFmpeg (No Installation)

1. **Download FFmpeg**:
   - Go to https://www.gyan.dev/ffmpeg/builds/
   - Download "ffmpeg-release-essentials.zip"
   - Extract to `E:\ffmpeg` (or any location)

2. **Update the app to use portable FFmpeg**:
   - We can modify the code to use a specific FFmpeg path
   - This avoids PATH issues

## Verify Installation

After installing, verify FFmpeg works:

```powershell
ffmpeg -version
```

You should see FFmpeg version information.

To test device enumeration:

```powershell
ffmpeg -list_devices true -f dshow -i dummy
```

You should see a list of audio devices.

## Troubleshooting

### "FFmpeg is not recognized"
- FFmpeg is not in PATH
- Restart your terminal after adding to PATH
- Check PATH: `echo $env:PATH` (PowerShell) or `echo %PATH%` (CMD)

### "No audio devices found" (even after installing FFmpeg)
- Make sure you have audio devices connected
- Check Windows Sound settings
- Try running FFmpeg command manually to see what devices it finds

### Still having issues?
- Try the portable FFmpeg option
- We can modify the code to use a specific FFmpeg path instead of relying on PATH
