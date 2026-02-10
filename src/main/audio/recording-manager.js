/**
 * Recording Manager - Process Lifecycle Management
 * 
 * Manages the complete lifecycle of audio recording:
 * - Process tracking and health monitoring
 * - Graceful shutdown handling
 * - Crash recovery with gap detection
 * - Cleanup on app exit
 */

const FFmpegRecorder = require('./ffmpeg-recorder');
const EventEmitter = require('events');

class RecordingManager extends EventEmitter {
  constructor() {
    super();
    this.recorder = new FFmpegRecorder();
    this.currentRecording = null;
    this.healthCheckInterval = null;
    this.isShuttingDown = false;
    this.isPaused = false;
    this.pauseStartTime = null;
    
    // Setup recorder event handlers
    this._setupRecorderHandlers();
  }

  /**
   * Setup event handlers for FFmpeg recorder
   */
  _setupRecorderHandlers() {
    this.recorder.on('started', (data) => {
      console.log('[RecordingManager] Recorder started event received');
      this.emit('recording-started', data);
      this._startHealthCheck();
    });

    this.recorder.on('stopped', (data) => {
      console.log('[RecordingManager] Recorder stopped event received', data);
      this._stopHealthCheck();
      this.emit('recording-stopped', data);
      // Don't clear currentRecording here - let stopRecording() handle it
      // this.currentRecording = null;
    });

    this.recorder.on('progress', (data) => {
      this.emit('recording-progress', data);
    });

    this.recorder.on('error', (error) => {
      console.error('[RecordingManager] Recorder error event received', error);
      this._stopHealthCheck();
      this.emit('recording-error', error);
      // Only clear if it's a fatal error, not if it's just a stop
      // this.currentRecording = null;
    });
  }

  /**
   * Start a new recording session
   * @param {Object} options - Recording options
   */
  async startRecording(options) {
    console.log('[RecordingManager] startRecording called', options);
    
    if (this.currentRecording) {
      console.error('[RecordingManager] Recording already in progress');
      throw new Error('Recording already in progress');
    }

    // Validate required options based on mode
    const mode = options.mode || 'both';
    if (!options.outputPath) {
      console.error('[RecordingManager] Missing output path', options);
      throw new Error('Missing output path');
    }
    if (mode === 'mic' && !options.micDevice) {
      throw new Error('Microphone device required for mic-only recording');
    }
    if (mode === 'system' && !options.loopbackDevice) {
      throw new Error('Loopback device required for system-only recording');
    }
    if (mode === 'both' && (!options.micDevice || !options.loopbackDevice)) {
      throw new Error('Both microphone and loopback devices required for mixed recording');
    }

    // Store recording metadata
    this.currentRecording = {
      startTime: Date.now(),
      outputPath: options.outputPath,
      mode: options.mode || 'both',
      micDevice: options.micDevice,
      loopbackDevice: options.loopbackDevice,
      gaps: [], // Track any gaps in recording
      segments: [{ path: options.outputPath, startTime: Date.now() }], // Track recording segments
    };
    
    this.isPaused = false;
    this.pauseStartTime = null;
    
    console.log('[RecordingManager] Created recording metadata:', this.currentRecording);

    try {
      await this.recorder.startRecording(options);
      console.log('[RecordingManager] Recorder started successfully');
    } catch (error) {
      console.error('[RecordingManager] Error starting recorder:', error);
      this.currentRecording = null;
      throw error;
    }
  }

  /**
   * Stop current recording gracefully
   */
  async stopRecording() {
    console.log('[RecordingManager] stopRecording called', {
      hasCurrentRecording: !!this.currentRecording,
      currentRecording: this.currentRecording ? {
        startTime: this.currentRecording.startTime,
        outputPath: this.currentRecording.outputPath
      } : null
    });
    
    if (!this.currentRecording) {
      console.warn('[RecordingManager] stopRecording: No current recording');
      return { success: false, error: 'No recording in progress' };
    }

    // Store recording info before clearing
    const recordingInfo = {
      startTime: this.currentRecording.startTime,
      outputPath: this.currentRecording.outputPath,
      gaps: this.currentRecording.gaps || [],
      segments: this.currentRecording.segments || [],
    };

    try {
      const result = await this.recorder.stopRecording();
      console.log('[RecordingManager] Recorder stopRecording result:', result);
      
      // If we have multiple segments, merge them
      let mergeError = null;
      if (recordingInfo.segments.length > 1) {
        console.log('[RecordingManager] Merging', recordingInfo.segments.length, 'recording segments...');
        try {
          await this._mergeSegments(recordingInfo.segments, recordingInfo.outputPath);
          console.log('[RecordingManager] Segments merged successfully');
        } catch (error) {
          console.error('[RecordingManager] Error merging segments:', error);
          mergeError = error.message;
          // Continue anyway - segments are still saved individually
        }
      }
      
      const duration = Date.now() - recordingInfo.startTime;
      console.log('[RecordingManager] Recording duration:', duration, 'ms');
      
      const stopResult = {
        success: result.success !== false && !mergeError, // Success if FFmpeg stopped OK and merge succeeded (or wasn't needed)
        outputPath: recordingInfo.outputPath,
        duration: duration,
        gaps: recordingInfo.gaps,
        segments: recordingInfo.segments,
        mergeError: mergeError, // Include merge error if any
      };
      
      // Clear current recording AFTER we've used all its data
      this.currentRecording = null;
      this.isPaused = false;
      this.pauseStartTime = null;
      
      console.log('[RecordingManager] Returning stop result:', stopResult);
      return stopResult;
    } catch (error) {
      console.error('[RecordingManager] Error stopping recording:', error);
      // Clear on error too
      this.currentRecording = null;
      this.isPaused = false;
      this.pauseStartTime = null;
      return { success: false, error: error.message };
    }
  }

  /**
   * Pause recording (stops FFmpeg, tracks gap)
   */
  async pauseRecording() {
    console.log('[RecordingManager] pauseRecording called');
    
    if (!this.currentRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    if (this.isPaused) {
      return { success: false, error: 'Recording is already paused' };
    }

    try {
      // Stop FFmpeg process
      await this.recorder.stopRecording();
      this.isPaused = true;
      this.pauseStartTime = Date.now();
      
      // Record gap - the gap starts when we pause (current time)
      // The gap duration will be calculated when we resume
      this.currentRecording.gaps.push({
        start: this.pauseStartTime,
        end: null, // Will be set when resume happens
        duration: null, // Will be calculated on resume
      });

      console.log('[RecordingManager] Recording paused');
      this.emit('recording-paused');
      
      return { success: true };
    } catch (error) {
      console.error('[RecordingManager] Error pausing recording:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume recording (restarts FFmpeg, creates new segment)
   */
  async resumeRecording() {
    console.log('[RecordingManager] resumeRecording called');
    
    if (!this.currentRecording) {
      return { success: false, error: 'No recording to resume' };
    }

    if (!this.isPaused) {
      return { success: false, error: 'Recording is not paused' };
    }

    try {
      // Calculate pause duration and update gap
      const resumeTime = Date.now();
      const pauseDuration = resumeTime - this.pauseStartTime;
      console.log('[RecordingManager] Pause duration:', pauseDuration, 'ms');

      // Update the last gap with end time and duration
      if (this.currentRecording.gaps.length > 0) {
        const lastGap = this.currentRecording.gaps[this.currentRecording.gaps.length - 1];
        lastGap.end = resumeTime;
        lastGap.duration = pauseDuration;
      }

      // Create a new segment file for the resumed recording
      // We'll merge segments later when stopping
      const path = require('path');
      const basePath = this.currentRecording.outputPath;
      const dir = path.dirname(basePath);
      const ext = path.extname(basePath);
      const baseName = path.basename(basePath, ext);
      const segmentIndex = (this.currentRecording.segments || []).length + 1;
      const segmentPath = path.join(dir, `${baseName}_segment${segmentIndex}${ext}`);

      // Track segments
      if (!this.currentRecording.segments) {
        this.currentRecording.segments = [];
      }
      this.currentRecording.segments.push({
        path: segmentPath,
        startTime: Date.now(),
      });

      // Restart recording with new segment path
      await this.recorder.startRecording({
        mode: this.currentRecording.mode || 'both',
        micDevice: this.currentRecording.micDevice,
        loopbackDevice: this.currentRecording.loopbackDevice,
        outputPath: segmentPath,
      });

      this.isPaused = false;
      this.pauseStartTime = null;

      console.log('[RecordingManager] Recording resumed to segment:', segmentPath);
      this.emit('recording-resumed');
      
      return { success: true };
    } catch (error) {
      console.error('[RecordingManager] Error resuming recording:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Force stop recording (emergency)
   */
  forceStop() {
    this.recorder.forceStop();
    this._stopHealthCheck();
    this.currentRecording = null;
    this.isPaused = false;
    this.pauseStartTime = null;
  }

  /**
   * Start health check monitoring
   * Checks process health every 10 seconds
   */
  _startHealthCheck() {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      if (!this.currentRecording) {
        this._stopHealthCheck();
        return;
      }

      const status = this.recorder.getStatus();
      
      // Check if process is still running
      if (status.isRecording && status.pid) {
        try {
          // Check if process exists (Windows)
          process.kill(status.pid, 0); // Signal 0 just checks if process exists
        } catch (error) {
          // Process doesn't exist - it crashed
          this._handleProcessCrash();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop health check monitoring
   */
  _stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Handle FFmpeg process crash
   */
  _handleProcessCrash() {
    if (!this.currentRecording) {
      return;
    }

    const crashTime = Date.now();
    const gapStart = this.currentRecording.gaps.length > 0 
      ? this.currentRecording.gaps[this.currentRecording.gaps.length - 1].end
      : crashTime - (crashTime - this.currentRecording.startTime);

    // Record gap in recording
    this.currentRecording.gaps.push({
      start: gapStart,
      end: crashTime,
      duration: crashTime - gapStart,
    });

    this.emit('recording-gap', {
      gap: this.currentRecording.gaps[this.currentRecording.gaps.length - 1],
    });

    // Attempt to restart recording (optional - might want user confirmation)
    // For now, just emit error and stop
    this.recorder.forceStop();
    this.emit('recording-error', new Error('FFmpeg process crashed'));
  }

  /**
   * Merge multiple audio segments into one file
   */
  async _mergeSegments(segments, outputPath) {
    const fs = require('fs').promises;
    const path = require('path');
    const { spawn } = require('child_process');
    const FFmpegFinder = require('../utils/ffmpeg-finder');

    try {
      // Create a file list for FFmpeg concat
      const listPath = path.join(path.dirname(outputPath), 'concat_list.txt');
      const listContent = segments
        .map(seg => {
          const relPath = path.relative(path.dirname(listPath), seg.path);
          return `file '${relPath.replace(/\\/g, '/')}'`;
        })
        .join('\n');
      
      await fs.writeFile(listPath, listContent, 'utf8');
      console.log('[RecordingManager] Created concat list:', listPath);

      // Use FFmpeg to concatenate segments
      const ffmpegPath = FFmpegFinder.findFFmpeg();
      const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', listPath,
        '-c', 'copy', // Copy codec (no re-encoding for speed)
        '-y', // Overwrite output
        outputPath,
      ];

      return new Promise((resolve, reject) => {
        const process = spawn(ffmpegPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });

        let errorOutput = '';
        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        process.on('exit', async (code) => {
          // Clean up list file
          try {
            await fs.unlink(listPath);
          } catch (e) {
            // Ignore cleanup errors
          }

          // Clean up segment files (except the first one which is the main output)
          for (let i = 1; i < segments.length; i++) {
            try {
              await fs.unlink(segments[i].path);
            } catch (e) {
              console.warn('[RecordingManager] Failed to delete segment:', segments[i].path);
            }
          }

          if (code === 0) {
            console.log('[RecordingManager] Successfully merged segments');
            resolve();
          } else {
            console.error('[RecordingManager] FFmpeg merge failed:', errorOutput);
            reject(new Error(`Failed to merge segments: ${errorOutput.substring(0, 500)}`));
          }
        });

        process.on('error', (error) => {
          reject(new Error(`Failed to spawn FFmpeg for merging: ${error.message}`));
        });
      });
    } catch (error) {
      console.error('[RecordingManager] Error merging segments:', error);
      throw error;
    }
  }

  /**
   * Get current recording status
   */
  getStatus() {
    const recorderStatus = this.recorder.getStatus();
    
    if (!this.currentRecording) {
      return {
        isRecording: false,
      };
    }

    return {
      isRecording: true,
      isPaused: this.isPaused,
      startTime: this.currentRecording.startTime,
      duration: Date.now() - this.currentRecording.startTime,
      outputPath: this.currentRecording.outputPath,
      gaps: this.currentRecording.gaps,
      pid: recorderStatus.pid,
    };
  }

  /**
   * Setup cleanup handlers for app exit
   * Should be called from main process
   */
  setupCleanupHandlers(app) {
    // Handle app before-quit to cleanup gracefully
    app.on('before-quit', async (event) => {
      if (this.currentRecording && !this.isShuttingDown) {
        event.preventDefault(); // Prevent immediate quit
        this.isShuttingDown = true;
        
        try {
          await this.stopRecording();
        } catch (error) {
          console.error('Error stopping recording on quit:', error);
        }
        
        // Allow quit after cleanup
        app.exit(0);
      }
    });

    // Handle window closed (might want to keep recording)
    // This is optional - depends on desired behavior
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this._stopHealthCheck();
    
    if (this.currentRecording) {
      this.forceStop();
    }
    
    // Remove all listeners
    this.removeAllListeners();
    this.recorder.removeAllListeners();
  }
}

module.exports = RecordingManager;
