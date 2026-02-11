# Quick FFmpeg Installation

## Option 1: Automatic Portable Installation (Recommended)

Run this PowerShell script to download and install FFmpeg to E: drive (no PATH needed):

```powershell
.\install-ffmpeg-portable.ps1
```

This will:
- Download FFmpeg
- Extract to `E:\ffmpeg`
- The app will automatically find it there

**No restart needed!** Just refresh the devices in the app.

## Option 2: Manual Portable Installation

1. **Download FFmpeg:**
   - Go to: https://www.gyan.dev/ffmpeg/builds/
   - Download "ffmpeg-release-essentials.zip"

2. **Extract to E: drive:**
   - Extract the zip file
   - Copy the entire folder to `E:\ffmpeg`
   - Make sure `E:\ffmpeg\bin\ffmpeg.exe` exists

3. **Restart the app** (or just refresh devices)

## Option 3: System Installation (Requires PATH)

1. **Download FFmpeg** from https://www.gyan.dev/ffmpeg/builds/

2. **Extract** to `C:\ffmpeg` (or any location)

3. **Add to PATH:**
   - Press `Win + X` → System
   - Advanced system settings → Environment Variables
   - Edit "Path" under System variables
   - Add: `C:\ffmpeg\bin`
   - Click OK on all dialogs

4. **Restart your computer** (or at least all terminals)

5. **Verify:**
   ```powershell
   ffmpeg -version
   ```

## Verify Installation

After installing, restart the app and click "Refresh" on the Audio Devices section.

You should see your microphone and system audio devices listed.

## Troubleshooting

**Still seeing "No audio devices found"?**

1. Check that FFmpeg exists:
   - Portable: `E:\ffmpeg\bin\ffmpeg.exe` should exist
   - System: Run `ffmpeg -version` in PowerShell

2. Check Electron console (F12) for error messages

3. Try the portable installation (Option 1) - it's the easiest and doesn't require PATH changes
