# Audio Recording Troubleshooting

## Problem: Only Microphone is Recorded, Not System Audio

If you can hear your own voice but not other participants (speakers/host), here's how to fix it:

### Solution 1: Check Loopback Device Selection

1. **In the app**, make sure you selected a **loopback device** (not a microphone) for "System Audio"
2. Common loopback device names:
   - `CABLE Output (VB-Audio Virtual Cable)` ✅ (you're using this)
   - `Stereo Mix`
   - `What U Hear`
   - `WASAPI Loopback`

### Solution 2: Set VB-Audio Cable as Default Playback Device

**Important**: For VB-Audio Virtual Cable to capture system audio:

1. **Right-click** the speaker icon in Windows taskbar
2. Select **"Open Sound settings"**
3. Under **"Output"**, set **"CABLE Input"** as your default playback device
4. **OR** set your normal speakers as default, but ensure audio is routed through CABLE

**Alternative Method:**
1. Right-click speaker icon → **"Sounds"**
2. Go to **"Playback"** tab
3. Right-click **"CABLE Input"** → **"Set as Default Device"**
4. Now all system audio will go through CABLE, which can be captured

### Solution 3: Use Windows Stereo Mix (Alternative)

If VB-Audio Cable doesn't work:

1. **Right-click** speaker icon → **"Sounds"**
2. Go to **"Recording"** tab
3. **Right-click** empty space → **"Show Disabled Devices"**
4. Find **"Stereo Mix"** → Right-click → **"Enable"**
5. Right-click → **"Set as Default Device"**
6. In the app, select **"Stereo Mix"** as your loopback device

### Solution 4: Check Audio Levels

1. **Right-click** speaker icon → **"Sounds"**
2. Go to **"Recording"** tab
3. Find your loopback device (CABLE Output or Stereo Mix)
4. Right-click → **"Properties"**
5. Go to **"Levels"** tab
6. Make sure volume is **not muted** and set to **100%**

### Solution 5: Test Audio Capture

To verify both inputs are working:

1. **Start a recording** in the app
2. **Speak into your microphone** (you should see audio levels)
3. **Play some audio** (YouTube video, music, etc.)
4. **Stop recording**
5. **Play back the recorded file** - you should hear:
   - ✅ Your voice (from microphone)
   - ✅ System audio (from speakers/meeting)

### Solution 6: Use WASAPI Loopback (Advanced)

If DirectShow doesn't work, we can switch to WASAPI loopback:

1. This requires changing FFmpeg input format from `dshow` to `wasapi`
2. WASAPI loopback directly captures what's playing on your speakers
3. More reliable but requires different device names

### Common Issues

**Issue**: "No audio from speakers in recording"
- **Cause**: Loopback device not capturing system audio
- **Fix**: Set CABLE Input as default playback device (Solution 2)

**Issue**: "Only one audio source works"
- **Cause**: Audio mixing not working correctly
- **Fix**: Check both devices are selected correctly in app

**Issue**: "Audio is too quiet"
- **Cause**: Volume levels too low
- **Fix**: Increase volume in Windows Sound settings (Solution 4)

### Testing Your Setup

1. **Start recording** in the app
2. **Say**: "This is my microphone test"
3. **Play a YouTube video** or music
4. **Stop recording**
5. **Listen to the recording** - you should hear:
   - Your voice saying "This is my microphone test"
   - The YouTube video/music playing

If you only hear your voice, the loopback device isn't capturing system audio. Follow Solution 2 above.

### Still Not Working?

If none of the above work:

1. **Check Windows Sound settings** - ensure audio is actually playing
2. **Try a different loopback device** (Stereo Mix instead of CABLE)
3. **Restart the app** after changing Windows sound settings
4. **Check FFmpeg logs** in the console for error messages
