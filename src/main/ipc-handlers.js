/**
 * IPC Handlers - Main Process Communication
 * 
 * Handles all IPC communication between renderer and main process.
 * Routes requests to appropriate modules and manages state.
 */

const { ipcMain } = require('electron');
const RecordingManager = require('./audio/recording-manager');
const DeviceManager = require('./audio/device-manager');
const WhisperProcessor = require('./transcription/whisper-processor');
const MeetingStorage = require('./storage/meeting-storage');
const MetadataManager = require('./storage/metadata-manager');
const NotesGenerator = require('./notes/notes-generator');
const MemoryMonitor = require('./utils/memory-monitor');
const processCleanup = require('./utils/process-cleanup');
const path = require('path');

class IPCHandlers {
  constructor() {
    this.recordingManager = new RecordingManager();
    this.deviceManager = new DeviceManager();
    
    // Load configuration for Groq API keys
    const config = this._loadConfig();
    this.whisperProcessor = new WhisperProcessor({
      useGroq: config.groq?.enabled || false,
      groqApiKeys: config.groq?.apiKeys || [],
      groqMaxConcurrent: config.groq?.maxConcurrent || 5,
    });
    
    this.storage = new MeetingStorage();
    this.metadataManager = new MetadataManager(this.storage);
    this.notesGenerator = new NotesGenerator();
    this.memoryMonitor = new MemoryMonitor();

    // Current meeting state
    this.currentMeeting = null;

    // Setup event listeners
    this._setupRecordingListeners();
    this._setupMemoryMonitoring();
  }

  /**
   * Load configuration from file or environment
   */
  _loadConfig() {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'config.json');
    
    let config = {};
    
    // Try to load from config.json
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('[IPC] Loaded config from config.json');
      } catch (error) {
        console.warn('[IPC] Failed to load config.json:', error.message);
      }
    }
    
    // Override with environment variables if set
    if (process.env.GROQ_API_KEYS) {
      const keys = process.env.GROQ_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
      if (keys.length > 0) {
        config.groq = config.groq || {};
        config.groq.enabled = true;
        config.groq.apiKeys = keys;
        console.log('[IPC] Loaded', keys.length, 'Groq API keys from environment');
      }
    }
    
    return config;
  }

  /**
   * Register all IPC handlers
   */
  register() {
    // Device management
    ipcMain.handle('devices:list', async () => {
      try {
        const devices = await this.deviceManager.getDevices();
        return { success: true, devices };
      } catch (error) {
        // Provide more helpful error messages
        let errorMessage = error.message;
        if (errorMessage.includes('FFmpeg') || errorMessage.includes('not found')) {
          errorMessage = 'FFmpeg is not installed or not in PATH. Please install FFmpeg and restart the app.';
        }
        return { success: false, error: errorMessage };
      }
    });

    ipcMain.handle('devices:get-defaults', async () => {
      try {
        const defaults = await this.deviceManager.getDefaultDevices();
        return { success: true, defaults };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Recording control
    ipcMain.handle('recording:start', async (event, options) => {
      console.log('[IPC] recording:start called', options);
      try {
        // Create meeting folder
        const metadata = this.metadataManager.createMetadata({
          micDevice: options.micDevice,
          loopbackDevice: options.loopbackDevice,
        });
        console.log('[IPC] Created metadata:', metadata.id);

        const meetingInfo = await this.storage.createMeetingFolder(metadata);
        this.currentMeeting = meetingInfo;
        console.log('[IPC] Created meeting folder:', meetingInfo.folder);

        // Setup output path
        const outputPath = path.join(meetingInfo.folder, 'audio.wav');
        console.log('[IPC] Output path:', outputPath);

        // Determine mode
        const mode = options.mode || (options.micDevice && options.loopbackDevice ? 'both' : 
                                      options.micDevice ? 'mic' : 'system');
        console.log('[IPC] Recording mode:', mode);

        // Start recording
        console.log('[IPC] Starting recording...');
        await this.recordingManager.startRecording({
          mode: mode,
          micDevice: options.micDevice,
          loopbackDevice: options.loopbackDevice,
          outputPath,
        });
        console.log('[IPC] Recording started successfully');

        // Update metadata
        await this.metadataManager.markRecordingStarted(meetingInfo.id, outputPath);
        console.log('[IPC] Metadata updated');

        return { success: true, meeting: meetingInfo };
      } catch (error) {
        console.error('[IPC] Error starting recording:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('recording:stop', async () => {
      console.log('[IPC] recording:stop called');
      try {
        const result = await this.recordingManager.stopRecording();
        console.log('[IPC] Recording stop result:', result);
        
        if (this.currentMeeting) {
          console.log('[IPC] Updating metadata for meeting:', this.currentMeeting.id);
          
          // Even if merge failed, the recording segments are saved
          // Update metadata with the result
          await this.metadataManager.markRecordingStopped(
            this.currentMeeting.id,
            result.duration,
            result.gaps || []
          );

          // Save audio file - use the main output path (first segment)
          // If merge failed, segments are still available individually
          await this.storage.saveAudio(this.currentMeeting.id, result.outputPath);
          console.log('[IPC] Metadata and audio file saved');
          
          // If merge failed, log a warning but don't fail the entire operation
          if (result.mergeError) {
            console.warn('[IPC] Merge failed but recording saved:', result.mergeError);
            console.warn('[IPC] Segments are available individually:', result.segments);
          }
        } else {
          console.warn('[IPC] No current meeting to update');
        }

        return result;
      } catch (error) {
        console.error('[IPC] Error stopping recording:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('recording:status', () => {
      const status = this.recordingManager.getStatus();
      return status;
    });

    ipcMain.handle('recording:pause', async () => {
      console.log('[IPC] recording:pause called');
      try {
        const result = await this.recordingManager.pauseRecording();
        return result;
      } catch (error) {
        console.error('[IPC] Error pausing recording:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('recording:resume', async () => {
      console.log('[IPC] recording:resume called');
      try {
        const result = await this.recordingManager.resumeRecording();
        return result;
      } catch (error) {
        console.error('[IPC] Error resuming recording:', error);
        return { success: false, error: error.message };
      }
    });

    // Transcription
    ipcMain.handle('transcription:start', async (event, meetingId) => {
      console.log('[IPC] transcription:start called', { meetingId, currentMeeting: this.currentMeeting?.id });
      try {
        const targetMeeting = meetingId || this.currentMeeting?.id;
        if (!targetMeeting) {
          console.error('[IPC] No meeting specified for transcription');
          return { success: false, error: 'No meeting specified' };
        }

        console.log('[IPC] Starting transcription for meeting:', targetMeeting);
        
        // Update metadata
        await this.metadataManager.markTranscriptionStarted(targetMeeting);

        // Get audio file path
        const files = this.storage.getMeetingFiles(targetMeeting);
        const audioPath = files.audio;
        console.log('[IPC] Audio file path:', audioPath);

        // Check if audio file exists and is valid
        const fs = require('fs');
        if (!fs.existsSync(audioPath)) {
          throw new Error(`Audio file not found: ${audioPath}`);
        }
        
        // Check file size - WAV files should be > 44 bytes (WAV header size)
        const stats = fs.statSync(audioPath);
        if (stats.size < 44) {
          throw new Error(`Audio file is too small (${stats.size} bytes) - recording may have failed`);
        }
        console.log('[IPC] Audio file size:', stats.size, 'bytes');

        console.log('[IPC] Processing audio with Whisper...');
        
        // Check if Groq is enabled and has keys
        const isGroqEnabled = this.whisperProcessor.useGroq && 
                              this.whisperProcessor.groqProcessor &&
                              this.whisperProcessor.groqProcessor.apiKeys.length > 0;
        
        if (isGroqEnabled) {
          console.log('[IPC] Using Groq API for transcription (fast mode)');
        } else {
          console.log('[IPC] Using local Whisper for transcription (offline mode)');
          console.log('[IPC] Tip: Run setup-groq.ps1 to enable fast Groq API transcription');
        }
        
        // Process audio
        const result = await this.whisperProcessor.processAudio(
          audioPath,
          this.storage.getMeetingFolder(targetMeeting)
        );

        console.log('[IPC] Transcription complete', {
          language: result.transcript.language,
          textLength: result.transcript.text?.length || 0,
          segmentCount: result.transcript.segments?.length || 0
        });

        // Save transcript
        await this.storage.saveTranscript(targetMeeting, result.transcript);
        console.log('[IPC] Transcript saved');

        // Update metadata
        await this.metadataManager.markTranscriptionCompleted(
          targetMeeting,
          result.transcriptPath
        );

        // Generate notes
        const metadata = await this.storage.loadMetadata(targetMeeting);
        const notes = this.notesGenerator.generate(result.transcript, metadata.metadata);
        await this.storage.saveNotes(targetMeeting, notes);
        await this.metadataManager.markNotesGenerated(targetMeeting, files.notes);
        console.log('[IPC] Notes generated and saved');

        return { success: true, transcript: result.transcript, notes };
      } catch (error) {
        console.error('[IPC] Transcription error:', error);
        const targetMeeting = meetingId || this.currentMeeting?.id;
        if (targetMeeting) {
          await this.metadataManager.markTranscriptionFailed(
            targetMeeting,
            error
          );
        }
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('transcription:status', () => {
      return this.whisperProcessor.getStatus();
    });

    // Meeting management
    ipcMain.handle('meetings:list', async () => {
      return await this.storage.listMeetings();
    });

    ipcMain.handle('meetings:get', async (event, meetingId) => {
      const metadata = await this.storage.loadMetadata(meetingId);
      return metadata;
    });

    ipcMain.handle('meetings:delete', async (event, meetingId) => {
      console.log('[IPC] meetings:delete called', { meetingId });
      try {
        const result = await this.storage.deleteMeeting(meetingId);
        if (result.success) {
          console.log('[IPC] Meeting deleted:', meetingId);
        }
        return result;
      } catch (error) {
        console.error('[IPC] Error deleting meeting:', error);
        return { success: false, error: error.message };
      }
    });

    // Delete only audio file (keep transcript and metadata)
    ipcMain.handle('meetings:deleteAudio', async (event, meetingId) => {
      console.log('[IPC] meetings:deleteAudio called', { meetingId });
      try {
        const fs = require('fs').promises;
        const path = require('path');
        const meetingFolder = this.storage.getMeetingFolder(meetingId);
        const audioPath = path.join(meetingFolder, 'audio.wav');
        
        try {
          await fs.unlink(audioPath);
          console.log('[IPC] Audio file deleted:', audioPath);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            throw err;
          }
        }
        
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error deleting audio:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('meetings:get-files', (event, meetingId) => {
      return this.storage.getMeetingFiles(meetingId);
    });

    ipcMain.handle('meetings:openFolder', async (event, meetingId) => {
      console.log('[IPC] meetings:openFolder called', { meetingId });
      try {
        const { shell } = require('electron');
        const meetingFolder = this.storage.getMeetingFolder(meetingId);
        await shell.openPath(meetingFolder);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error opening folder:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('transcription:get', async (event, meetingId) => {
      console.log('[IPC] transcription:get called', { meetingId });
      try {
        const files = this.storage.getMeetingFiles(meetingId);
        const fs = require('fs');
        
        if (fs.existsSync(files.transcriptJson)) {
          const transcriptData = JSON.parse(fs.readFileSync(files.transcriptJson, 'utf8'));
          return { success: true, transcript: transcriptData };
        } else {
          return { success: false, error: 'Transcript not found' };
        }
      } catch (error) {
        console.error('[IPC] Error getting transcript:', error);
        return { success: false, error: error.message };
      }
    });

    // Memory monitoring
    ipcMain.handle('memory:get-stats', () => {
      return this.memoryMonitor.getStats();
    });

    ipcMain.handle('memory:get-report', () => {
      return this.memoryMonitor.getReport();
    });

    // Cleanup
    ipcMain.handle('cleanup:full', async () => {
      return await processCleanup.fullCleanup();
    });
  }

  /**
   * Setup recording event listeners
   */
  _setupRecordingListeners() {
    this.recordingManager.on('recording-started', (data) => {
      // Broadcast to all renderers
      // Note: In a real app, you'd get all BrowserWindow instances
    });

    this.recordingManager.on('recording-progress', (data) => {
      // Broadcast progress updates
    });

    this.recordingManager.on('recording-stopped', (data) => {
      // Broadcast stop event
    });

    this.recordingManager.on('recording-error', (error) => {
      console.error('Recording error:', error);
    });

    this.recordingManager.on('recording-gap', (data) => {
      console.warn('Recording gap detected:', data);
      if (this.currentMeeting) {
        this.metadataManager.addRecordingGap(this.currentMeeting.id, data.gap);
      }
    });
  }

  /**
   * Setup memory monitoring
   */
  _setupMemoryMonitoring() {
    this.memoryMonitor.on('warning', (data) => {
      console.warn('Memory warning:', data);
    });

    this.memoryMonitor.on('critical', (data) => {
      console.error('Memory critical:', data);
    });

    // Start monitoring
    this.memoryMonitor.start();
  }

  /**
   * Get recording manager (for main.js cleanup)
   */
  getRecordingManager() {
    return this.recordingManager;
  }

  /**
   * Cleanup on app exit
   */
  async cleanup() {
    this.memoryMonitor.stop();
    
    if (this.recordingManager) {
      this.recordingManager.cleanup();
    }

    await processCleanup.fullCleanup();
  }
}

module.exports = IPCHandlers;
