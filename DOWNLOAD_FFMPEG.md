# Download FFmpeg - Quick Guide

## Option 1: Direct Download Link

**Download FFmpeg Essentials:**
- Direct link: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
- File size: ~70 MB

**After downloading:**

1. Extract the zip file
2. Copy the extracted folder to `E:\ffmpeg`
3. Make sure the path `E:\ffmpeg\bin\ffmpeg.exe` exists
4. Restart the app

## Option 2: Use the Installation Script

Run in PowerShell:
```powershell
.\install-ffmpeg-portable.ps1
```

This will automatically download and extract to `E:\ffmpeg`.

## Option 3: Manual Steps

1. **Go to:** https://www.gyan.dev/ffmpeg/builds/
2. **Click:** "ffmpeg-release-essentials.zip" (latest version)
3. **Download** to your Downloads folder
4. **Extract** the zip file
5. **Copy** the entire extracted folder to `E:\ffmpeg`
6. **Verify:** `E:\ffmpeg\bin\ffmpeg.exe` should exist
7. **Restart** the Meeting Note app

## Quick Verification

After installation, check if it works:
```powershell
E:\ffmpeg\bin\ffmpeg.exe -version
```

You should see FFmpeg version information.

## After Installation

1. Close and restart the Meeting Note app
2. Click "Refresh" on the Audio Devices section
3. You should now see your microphone and system audio devices
