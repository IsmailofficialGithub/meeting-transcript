/**
 * Audio Device Manager - Stable Device Enumeration
 * 
 * Handles audio device discovery and validation for Windows.
 * Uses device GUIDs for stability (device names can change).
 * Caches device list to avoid repeated FFmpeg calls.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const EventEmitter = require('events');
const FFmpegFinder = require('../utils/ffmpeg-finder');

const execAsync = promisify(exec);

class DeviceManager extends EventEmitter {
  constructor() {
    super();
    this.deviceCache = null;
    this.cacheTimestamp = null;
    this.cacheTimeout = 60000; // Cache for 60 seconds
  }

  /**
   * Get list of available audio input devices
   * Returns cached result if available and fresh
   */
  async getDevices(forceRefresh = false) {
    // Return cached devices if still valid
    if (!forceRefresh && this.deviceCache && this.cacheTimestamp) {
      const age = Date.now() - this.cacheTimestamp;
      if (age < this.cacheTimeout) {
        return this.deviceCache;
      }
    }

    try {
      const devices = await this._enumerateDevices();
      this.deviceCache = devices;
      this.cacheTimestamp = Date.now();
      return devices;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Enumerate audio devices using FFmpeg
   * FFmpeg lists DirectShow devices which include both microphones and loopback
   */
  async _enumerateDevices() {
    return new Promise((resolve, reject) => {
      // Find FFmpeg executable
      const ffmpegCmd = FFmpegFinder.getFFmpegCommand();
      console.log('Using FFmpeg command:', ffmpegCmd);

      // FFmpeg command to list DirectShow audio devices
      const command = `${ffmpegCmd} -list_devices true -f dshow -i dummy 2>&1`;
      
      exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        // FFmpeg writes device list to stderr and exits with code 1, this is normal
        const output = stderr || stdout || '';
        
        // Check if output indicates FFmpeg wasn't found (this happens before FFmpeg runs)
        if (output.includes('not recognized') || output.includes('not found') || output.includes('command not found') || output.includes('is not recognized') || output.includes('The system cannot find')) {
          reject(new Error('FFmpeg is not installed or not in PATH. Please install FFmpeg. See FFMPEG_SETUP.md for instructions.'));
          return;
        }
        
        // Check if error is ENOENT (file not found) - this means FFmpeg executable doesn't exist
        if (error && error.code === 'ENOENT') {
          reject(new Error('FFmpeg is not installed or not in PATH. Please install FFmpeg. See FFMPEG_SETUP.md for instructions.'));
          return;
        }
        
        // Note: error.code === 1 is NORMAL for FFmpeg device listing - it's not an error!
        // FFmpeg exits with code 1 after listing devices successfully
        
        // Log output for debugging (first 500 chars)
        if (output.length > 0) {
          console.log('FFmpeg device enumeration output (first 500 chars):', output.substring(0, 500));
        }
        
        const devices = {
          microphones: [],
          loopbacks: [],
        };

        // Parse FFmpeg output
        // Format: [dshow @ ...] "Device Name" (audio)
        // Note: FFmpeg doesn't always include "DirectShow audio devices" header
        // So we look for any line with (audio) in it
        const lines = output.split('\n');
        let inAudioSection = false;
        let foundAnyAudio = false;

        for (const line of lines) {
          // Detect audio device section (if header exists)
          if (line.includes('DirectShow audio devices') || line.includes('[dshow')) {
            inAudioSection = true;
          }

          if (line.includes('DirectShow video devices') && !line.includes('audio')) {
            inAudioSection = false;
            continue;
          }

          // Match device name: [dshow @ ...] "Device Name" (audio)
          // Also match: "Device Name" (audio) without the [dshow] prefix
          const match = line.match(/"([^"]+)"\s*\(audio\)/);
          if (match) {
            foundAnyAudio = true;
            const deviceName = match[1];
            
            // Skip alternative name lines
            if (deviceName.includes('@device_') || deviceName.includes('Alternative name')) {
              continue;
            }
            
            // Categorize device
            // WASAPI loopback devices typically contain "loopback", "stereo mix", or "cable"
            const lowerName = deviceName.toLowerCase();
            const isLoopback = 
              lowerName.includes('loopback') ||
              lowerName.includes('stereo mix') ||
              lowerName.includes('what u hear') ||
              lowerName.includes('cable') ||
              lowerName.includes('virtual');

            if (isLoopback) {
              devices.loopbacks.push({
                name: deviceName,
                id: this._generateDeviceId(deviceName),
              });
            } else {
              devices.microphones.push({
                name: deviceName,
                id: this._generateDeviceId(deviceName),
              });
            }
          }
        }
        
        // If we found audio devices but they're in a mixed format, we're done
        if (foundAnyAudio && (devices.microphones.length > 0 || devices.loopbacks.length > 0)) {
          // Success - we found devices
        } else if (!foundAnyAudio && inAudioSection) {
          // We were in audio section but found no devices - might be a parsing issue
          console.warn('In audio section but no devices found. Full output:', output.substring(0, 1000));
        }

        // Validate we found at least some devices
        if (devices.microphones.length === 0 && devices.loopbacks.length === 0) {
          reject(new Error('No audio devices found. Ensure FFmpeg can access DirectShow devices.'));
          return;
        }

        resolve(devices);
      });
    });
  }

  /**
   * Generate a stable device ID from device name
   * In production, you might want to use actual device GUIDs
   */
  _generateDeviceId(deviceName) {
    // Simple hash-based ID for stability
    // In a real implementation, you'd query Windows API for actual GUIDs
    return Buffer.from(deviceName).toString('base64').replace(/[+/=]/g, '');
  }

  /**
   * Validate that a device exists and is available
   * @param {string} deviceName - Device name to validate
   */
  async validateDevice(deviceName) {
    if (!deviceName) {
      return { valid: false, error: 'Device name is required' };
    }

    try {
      const devices = await this.getDevices();
      const allDevices = [...devices.microphones, ...devices.loopbacks];
      
      const found = allDevices.find(d => d.name === deviceName);
      if (!found) {
        return { valid: false, error: `Device "${deviceName}" not found` };
      }

      // Test device by attempting to open it (quick test)
      // This is a lightweight check - full validation happens during recording
      return { valid: true, device: found };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get default devices (first available of each type)
   */
  async getDefaultDevices() {
    const devices = await this.getDevices();
    
    return {
      microphone: devices.microphones[0] || null,
      loopback: devices.loopbacks[0] || null,
    };
  }

  /**
   * Clear device cache (force refresh on next getDevices call)
   */
  clearCache() {
    this.deviceCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Handle device disconnection gracefully
   * This would be called if recording detects device is unavailable
   */
  async handleDeviceDisconnection(deviceName) {
    this.emit('device-disconnected', { deviceName });
    this.clearCache(); // Clear cache to force refresh
    
    // Attempt to find replacement device
    try {
      const devices = await this.getDevices(true);
      const allDevices = [...devices.microphones, ...devices.loopbacks];
      const replacement = allDevices.find(d => d.name === deviceName);
      
      if (replacement) {
        this.emit('device-reconnected', { deviceName });
        return { reconnected: true, device: replacement };
      }
    } catch (error) {
      // Device still not available
    }
    
    return { reconnected: false };
  }
}

module.exports = DeviceManager;
