/**
 * FFmpeg Audio Recorder - Streaming Configuration for Long Recordings
 * 
 * This module handles audio capture using FFmpeg with stability optimizations
 * for 3-hour recordings. All flags are carefully chosen to prevent:
 * - Memory leaks (streaming, no buffering)
 * - Audio drift (hardware timestamps, native sample rates)
 * - Sync issues (proper PTS generation, longest duration mixing)
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const FFmpegFinder = require('../utils/ffmpeg-finder');

class FFmpegRecorder extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.isRecording = false;
    this.outputPath = null;
  }

  /**
   * Start recording with microphone and/or system audio
   * @param {Object} options - Recording configuration
   * @param {string} options.mode - 'mic', 'system', or 'both' (default: 'both')
   * @param {string} options.micDevice - Microphone device name (required if mode is 'mic' or 'both')
   * @param {string} options.loopbackDevice - WASAPI loopback device name (required if mode is 'system' or 'both')
   * @param {string} options.outputPath - Output WAV file path
   */
  async startRecording({ mode = 'both', micDevice, loopbackDevice, outputPath }) {
    console.log('[FFmpegRecorder] startRecording called', { micDevice, loopbackDevice, outputPath });
    
    if (this.isRecording) {
      console.error('[FFmpegRecorder] Recording already in progress');
      throw new Error('Recording already in progress');
    }

    this.outputPath = outputPath;
    this.isRecording = true;
    console.log('[FFmpegRecorder] Set isRecording = true');

    // Validate mode and devices
    if (mode === 'mic' && !micDevice) {
      throw new Error('Microphone device required for mic-only recording');
    }
    if (mode === 'system' && !loopbackDevice) {
      throw new Error('Loopback device required for system-only recording');
    }
    if (mode === 'both' && (!micDevice || !loopbackDevice)) {
      throw new Error('Both microphone and loopback devices required for mixed recording');
    }

    // Build FFmpeg command with stability-optimized flags
    const args = this._buildFFmpegArgs(mode, micDevice, loopbackDevice, outputPath);
    console.log('[FFmpegRecorder] FFmpeg args:', args);

    // Find FFmpeg executable
    const ffmpegPath = FFmpegFinder.findFFmpeg();
    console.log('[FFmpegRecorder] Using FFmpeg at:', ffmpegPath);

    // Spawn FFmpeg process
    // Using spawn (not exec) to avoid buffering entire output in memory
    console.log('[FFmpegRecorder] Spawning FFmpeg process...');
    this.process = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin, capture stdout/stderr
      windowsHide: true, // Hide console window on Windows
    });

    console.log('[FFmpegRecorder] FFmpeg process spawned, PID:', this.process.pid);

    // Handle process errors
    this.process.on('error', (error) => {
      console.error('[FFmpegRecorder] Process error:', error);
      this.isRecording = false;
      this.emit('error', new Error(`FFmpeg spawn failed: ${error.message}`));
    });

    // Capture stderr for FFmpeg output (FFmpeg writes to stderr, not stdout)
    let errorBuffer = '';
    this.process.stderr.on('data', (data) => {
      const text = data.toString();
      errorBuffer += text;
      
      // Check for audio input issues
      if (text.includes('Could not find') || text.includes('No such filter') || text.includes('error')) {
        console.warn('[FFmpegRecorder] Potential issue detected:', text.substring(0, 300));
      }
      
      // Check if inputs are detected
      if (text.includes('Input #0') || text.includes('Input #1')) {
        console.log('[FFmpegRecorder] Input detected:', text.substring(0, 500));
      }
      
      // Check for audio stream info
      if (text.includes('Stream #') && text.includes('Audio:')) {
        console.log('[FFmpegRecorder] Audio stream info:', text.substring(0, 300));
      }
      
      // Check for recording progress (time)
      const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (timeMatch) {
        const timeStr = timeMatch[0];
        console.log('[FFmpegRecorder] Recording progress:', timeStr);
      }
      
      // Log first few lines for debugging
      if (errorBuffer.split('\n').length < 20) {
        console.log('[FFmpegRecorder] stderr:', text.substring(0, 300));
      }
      
      // Parse FFmpeg output for progress/time information
      this._parseFFmpegOutput(text);
    });

    // Capture stdout too (just in case)
    this.process.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[FFmpegRecorder] stdout:', text.substring(0, 200));
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log('[FFmpegRecorder] Process exited', { code, signal, isRecording: this.isRecording });
      const wasRecording = this.isRecording;
      this.isRecording = false;
      
      if (code === 0) {
        console.log('[FFmpegRecorder] Recording completed successfully');
        this.emit('stopped', { outputPath: this.outputPath, code: 0 });
      } else if (code === null || signal) {
        // Process was killed (SIGTERM/SIGKILL)
        console.log('[FFmpegRecorder] Recording was stopped (killed)', { code, signal });
        // Only emit error if it wasn't a graceful stop
        if (wasRecording && !errorBuffer.includes('Press [q] to stop')) {
          // This was an unexpected termination
          const errorMsg = `FFmpeg was terminated unexpectedly: ${errorBuffer.substring(0, 500)}`;
          console.error('[FFmpegRecorder] Unexpected termination:', errorMsg);
          this.emit('error', new Error(errorMsg));
        } else {
          // Graceful stop
          this.emit('stopped', { outputPath: this.outputPath, killed: true, code, signal });
        }
      } else {
        // Process crashed or error (non-zero exit code)
        const errorMsg = `FFmpeg exited with code ${code}: ${errorBuffer.substring(0, 500)}`;
        console.error('[FFmpegRecorder] Recording failed:', errorMsg);
        this.emit('error', new Error(errorMsg));
      }
      
      this.process = null;
    });

    // Emit started event after a brief delay to ensure process is running
    setTimeout(() => {
      if (this.isRecording && this.process && !this.process.killed) {
        console.log('[FFmpegRecorder] Emitting started event');
        this.emit('started', { outputPath: this.outputPath });
      } else {
        console.warn('[FFmpegRecorder] Process not ready for started event', {
          isRecording: this.isRecording,
          hasProcess: !!this.process,
          killed: this.process?.killed
        });
      }
    }, 500); // Increased delay to 500ms
  }

  /**
   * Build FFmpeg arguments with all stability flags explained
   */
  _buildFFmpegArgs(mode, micDevice, loopbackDevice, outputPath) {
    const args = [];
    
    // Build inputs based on mode
    // IMPORTANT: For DirectShow, we need to specify input options BEFORE the -i flag
    if (mode === 'mic' || mode === 'both') {
      const micInput = `audio=${micDevice}`;
      args.push(
        '-f', 'dshow',                    // DirectShow input format (Windows native)
        '-audio_buffer_size', '50',       // Buffer size in ms (lower = less latency)
        '-i', micInput                     // Microphone device input
      );
      console.log('[FFmpegRecorder] Microphone input:', micInput);
    }
    
    if (mode === 'system' || mode === 'both') {
      // Use DirectShow for system audio capture
      // Note: For CABLE Output to work, CABLE Input must be set as default playback device
      const loopbackInput = `audio=${loopbackDevice}`;
      args.push(
        '-f', 'dshow',                    // DirectShow input format
        '-audio_buffer_size', '50',        // Buffer size in ms (lower = less latency)
        '-i', loopbackInput                // Loopback device (CABLE Output, Stereo Mix, etc.)
      );
      console.log('[FFmpegRecorder] Loopback input (DirectShow):', loopbackInput);
      console.log('[FFmpegRecorder] NOTE: For CABLE Output to capture audio, ensure CABLE Input is set as default playback device in Windows Sound settings');
    }
    
    // Build filter based on mode
    // IMPORTANT: Don't force sample rate conversion - let FFmpeg use native device rate
    // Then convert to 48kHz only if needed
    let filterComplex = '';
    if (mode === 'mic') {
      // Only microphone - no mixing needed
      // [0:a] refers to the first (and only) input
      // Use volume boost and ensure proper sample rate
      filterComplex = '[0:a]volume=3.0,aresample=48000';
      console.log('[FFmpegRecorder] Using mic-only filter (volume boost: 3.0x, resample to 48kHz)');
    } else if (mode === 'system') {
      // Only system audio - no mixing needed
      // [0:a] refers to the first (and only) input (which is the loopback device)
      // Use aggressive volume boost and ensure proper sample rate
      // Added dynaudnorm to normalize audio levels dynamically
      // Use aggressive volume boost and add silence detection
      // silencedetect will log when audio goes silent (helps diagnose capture issues)
      filterComplex = '[0:a]volume=10.0,dynaudnorm=g=5:s=0.95:p=0.5,silencedetect=n=-40dB:d=1,aresample=48000';
      console.log('[FFmpegRecorder] Using system-only filter (10x boost + silence detection)');
      
      // Check if using CABLE (requires routing) vs Stereo Mix (no routing)
      const isCable = loopbackDevice.toLowerCase().includes('cable');
      const isStereoMix = loopbackDevice.toLowerCase().includes('stereo mix');
      
      if (isStereoMix) {
        console.log('[FFmpegRecorder] ✅ Using Stereo Mix - captures all audio (Zoom, videos, music)');
      } else if (isCable) {
        console.warn('[FFmpegRecorder] ⚠️  CABLE will be SILENT unless CABLE Input is default playback');
        console.warn('[FFmpegRecorder] ⚠️  Enable Stereo Mix instead - works immediately!');
      } else {
        console.log('[FFmpegRecorder] Using device:', loopbackDevice);
      }
    } else {
      // Both - mix them together
      // [0:a] = microphone, [1:a] = system audio
      // Resample both to same rate before mixing
      filterComplex = '[0:a]volume=1.5,aresample=48000[mic];[1:a]volume=1.5,aresample=48000[sys];[mic][sys]amix=inputs=2:duration=longest:dropout_transition=0';
      console.log('[FFmpegRecorder] Using mixed filter (mic + system, both resampled to 48kHz)');
    }
    
    // AUDIO FILTER: Apply quality improvements based on mode
    // Filter explanation:
    // - For mic-only or system-only: Simple filter chain with noise reduction
    // - For both: Mix both streams together with balanced volumes
    // highpass=f=80: Remove low-frequency noise below 80Hz (improves clarity, reduces rumble)
    // lowpass=f=15000: Remove high-frequency noise above 15kHz (reduces hiss, improves transcription)
    // volume=1.2: Slight volume boost (20% gain) for better transcription accuracy
    args.push(
      '-filter_complex', filterComplex,
      
      // OUTPUT AUDIO FORMAT - High Quality Settings
      '-ar', '48000',                   // Sample rate: 48kHz (Windows WASAPI default)
      // WHY: Matches hardware-native rate, avoids resampling that causes cumulative drift
      
      '-ac', '2',                       // Stereo output (2 channels)
      // WHY: Standard format, ensures compatibility
      
      '-sample_fmt', 's16',             // 16-bit signed integer PCM
      // WHY: Standard format, stable, no compression artifacts
      // Note: s16 is sufficient for speech - higher bit depths don't improve transcription
      
      // TIMESTAMP HANDLING (Critical for long recordings)
      '-use_wallclock_as_timestamps', '1',
      // WHY: Uses system clock instead of audio clock, prevents cumulative timestamp errors
      // Without this, small timing errors accumulate over 3 hours causing drift
      
      // BUFFERING (Prevents underruns during system load)
      '-thread_queue_size', '512',      // Large thread queue size
      // WHY: Prevents buffer underruns when system is under load
      // Smaller queues (default 8) cause dropouts during CPU spikes
      
      // PRESENTATION TIMESTAMP GENERATION
      '-fflags', '+genpts',             // Generate presentation timestamps
      // WHY: Generates PTS from timestamps, maintains sync over long periods
      // Essential for maintaining audio/video sync in multi-hour recordings
      
      // OUTPUT FORMAT
      '-f', 'wav',                      // WAV format (uncompressed)
      // WHY: Uncompressed format prevents drift from codec artifacts
      // Compressed formats (mp3, aac) can introduce timing errors
      
      // FILE HANDLING
      '-y',                             // Overwrite output file if exists
      outputPath                        // Output file path
    );

    return args;
  }

  /**
   * Parse FFmpeg stderr output for progress information
   */
  _parseFFmpegOutput(output) {
    // FFmpeg outputs time information like: "time=01:23:45.67"
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = parseInt(timeMatch[3], 10);
      const centiseconds = parseInt(timeMatch[4], 10);
      
      const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
      this.emit('progress', { seconds: totalSeconds });
    }
  }

  /**
   * Stop recording gracefully
   */
  async stopRecording() {
    console.log('[FFmpegRecorder] stopRecording called', {
      isRecording: this.isRecording,
      hasProcess: !!this.process,
      pid: this.process?.pid
    });
    
    if (!this.isRecording) {
      console.warn('[FFmpegRecorder] stopRecording: Not recording');
      return { success: false, error: 'No recording in progress' };
    }
    
    if (!this.process) {
      console.warn('[FFmpegRecorder] stopRecording: No process');
      this.isRecording = false;
      return { success: false, error: 'No recording process found' };
    }

    console.log('[FFmpegRecorder] Attempting graceful shutdown...');
    
    // Send 'q' to FFmpeg stdin to quit gracefully
    // This ensures proper file closing and prevents corruption
    try {
      if (this.process.stdin && !this.process.stdin.destroyed && this.process.stdin.writable) {
        this.process.stdin.write('q\n');
        this.process.stdin.end();
        console.log('[FFmpegRecorder] Sent quit signal (q) to FFmpeg stdin');
      } else {
        console.warn('[FFmpegRecorder] stdin not available, using SIGTERM');
        this.process.kill('SIGTERM');
      }
    } catch (error) {
      console.error('[FFmpegRecorder] Error sending quit signal:', error);
      this.process.kill('SIGTERM');
    }

    // Wait for graceful shutdown (max 5 seconds)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[FFmpegRecorder] Graceful shutdown timeout, forcing kill');
        // Force kill if graceful shutdown fails
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
        resolve({ success: true, forced: true });
      }, 5000);

      this.process.once('exit', (code, signal) => {
        console.log('[FFmpegRecorder] Process exited during stop', { code, signal });
        clearTimeout(timeout);
        resolve({ success: true, code, signal });
      });
    });
  }

  /**
   * Force stop recording (emergency)
   */
  forceStop() {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
    }
    this.isRecording = false;
    this.process = null;
  }

  /**
   * Get current recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      outputPath: this.outputPath,
      pid: this.process ? this.process.pid : null,
    };
  }
}

module.exports = FFmpegRecorder;
