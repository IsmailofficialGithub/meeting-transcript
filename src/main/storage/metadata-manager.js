/**
 * Metadata Manager - Meeting Metadata Handling
 * 
 * Manages meeting metadata including recording info, device info, and timestamps.
 * Provides structured metadata for meeting organization and search.
 */

const MeetingStorage = require('./meeting-storage');

class MetadataManager {
  constructor(storage) {
    this.storage = storage || new MeetingStorage();
  }

  /**
   * Create initial metadata for a new meeting
   * @param {Object} options - Meeting options
   */
  createMetadata(options = {}) {
    const now = new Date();

    return {
      id: options.id || this._generateId(),
      title: options.title || `Meeting ${now.toLocaleString()}`,
      createdAt: now.toISOString(),
      status: 'recording', // recording, processing, completed, error
      
      // Recording info
      recording: {
        startTime: now.toISOString(),
        endTime: null,
        duration: null,
        outputPath: null,
        gaps: [], // Array of { start, end, duration } for any recording gaps
      },

      // Device info
      devices: {
        microphone: options.micDevice || null,
        loopback: options.loopbackDevice || null,
      },

      // Processing info
      processing: {
        transcriptionStarted: null,
        transcriptionCompleted: null,
        transcriptionStatus: 'pending', // pending, processing, completed, error
        notesGenerated: false,
      },

      // Results
      results: {
        transcriptPath: null,
        notesPath: null,
        hasTranscript: false,
        hasNotes: false,
      },

      // Custom metadata
      tags: options.tags || [],
      notes: options.notes || '',
    };
  }

  /**
   * Update metadata
   * @param {string} meetingId - Meeting ID
   * @param {Object} updates - Partial metadata updates
   */
  async updateMetadata(meetingId, updates) {
    const current = await this.storage.loadMetadata(meetingId);
    
    if (!current.success) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    const updated = {
      ...current.metadata,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.storage.saveMetadata(meetingId, updated);
    return updated;
  }

  /**
   * Mark recording as started
   */
  async markRecordingStarted(meetingId, outputPath) {
    return this.updateMetadata(meetingId, {
      status: 'recording',
      recording: {
        startTime: new Date().toISOString(),
        outputPath,
      },
    });
  }

  /**
   * Mark recording as stopped
   */
  async markRecordingStopped(meetingId, duration, gaps = []) {
    return this.updateMetadata(meetingId, {
      status: 'processing',
      recording: {
        endTime: new Date().toISOString(),
        duration,
        gaps,
      },
    });
  }

  /**
   * Mark transcription as started
   */
  async markTranscriptionStarted(meetingId) {
    return this.updateMetadata(meetingId, {
      processing: {
        transcriptionStarted: new Date().toISOString(),
        transcriptionStatus: 'processing',
      },
    });
  }

  /**
   * Mark transcription as completed
   */
  async markTranscriptionCompleted(meetingId, transcriptPath) {
    return this.updateMetadata(meetingId, {
      status: 'completed',
      processing: {
        transcriptionCompleted: new Date().toISOString(),
        transcriptionStatus: 'completed',
      },
      results: {
        transcriptPath,
        hasTranscript: true,
      },
    });
  }

  /**
   * Mark transcription as failed
   */
  async markTranscriptionFailed(meetingId, error) {
    return this.updateMetadata(meetingId, {
      status: 'error',
      processing: {
        transcriptionStatus: 'error',
        transcriptionError: error.message || String(error),
      },
    });
  }

  /**
   * Mark notes as generated
   */
  async markNotesGenerated(meetingId, notesPath) {
    return this.updateMetadata(meetingId, {
      processing: {
        notesGenerated: true,
      },
      results: {
        notesPath,
        hasNotes: true,
      },
    });
  }

  /**
   * Add recording gap
   */
  async addRecordingGap(meetingId, gap) {
    const current = await this.storage.loadMetadata(meetingId);
    if (!current.success) {
      return;
    }

    const gaps = current.metadata.recording?.gaps || [];
    gaps.push({
      start: gap.start || new Date().toISOString(),
      end: gap.end || new Date().toISOString(),
      duration: gap.duration || 0,
    });

    return this.updateMetadata(meetingId, {
      recording: {
        ...current.metadata.recording,
        gaps,
      },
    });
  }

  /**
   * Get metadata summary (lightweight version)
   */
  getSummary(metadata) {
    return {
      id: metadata.id,
      title: metadata.title,
      createdAt: metadata.createdAt,
      status: metadata.status,
      duration: metadata.recording?.duration || null,
      hasTranscript: metadata.results?.hasTranscript || false,
      hasNotes: metadata.results?.hasNotes || false,
    };
  }

  /**
   * Generate a unique ID
   */
  _generateId() {
    // Simple timestamp-based ID (can be replaced with UUID)
    return `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate metadata structure
   */
  validate(metadata) {
    const required = ['id', 'createdAt', 'status'];
    const missing = required.filter(field => !metadata[field]);

    if (missing.length > 0) {
      return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
    }

    return { valid: true };
  }
}

module.exports = MetadataManager;
