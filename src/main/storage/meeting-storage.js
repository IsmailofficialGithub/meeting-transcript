/**
 * Meeting Storage - File System Operations
 * 
 * Handles file system operations for meeting recordings and transcripts.
 * Manages per-meeting folder structure and file organization.
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class MeetingStorage {
  constructor(baseDir = null) {
    // Default to meetings directory in app data
    this.baseDir = baseDir || path.join(process.cwd(), 'meetings');
  }

  /**
   * Initialize storage directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new meeting folder
   * @param {Object} metadata - Meeting metadata
   * @returns {Promise<Object>} Meeting info with folder path
   */
  async createMeetingFolder(metadata = {}) {
    const meetingId = metadata.id || uuidv4();
    const meetingDir = path.join(this.baseDir, meetingId);

    try {
      await fs.mkdir(meetingDir, { recursive: true });

      const meetingInfo = {
        id: meetingId,
        folder: meetingDir,
        createdAt: new Date().toISOString(),
        ...metadata,
      };

      // Save metadata
      await this.saveMetadata(meetingId, meetingInfo);

      return meetingInfo;
    } catch (error) {
      throw new Error(`Failed to create meeting folder: ${error.message}`);
    }
  }

  /**
   * Get meeting folder path
   */
  getMeetingFolder(meetingId) {
    return path.join(this.baseDir, meetingId);
  }

  /**
   * Save audio file to meeting folder
   * @param {string} meetingId - Meeting ID
   * @param {string} audioPath - Source audio file path
   */
  async saveAudio(meetingId, audioPath) {
    const meetingDir = this.getMeetingFolder(meetingId);
    const destPath = path.join(meetingDir, 'audio.wav');

    try {
      // Ensure meeting folder exists
      await fs.mkdir(meetingDir, { recursive: true });

      // Copy or move audio file
      await fs.copyFile(audioPath, destPath);

      return { success: true, path: destPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save transcript files
   * @param {string} meetingId - Meeting ID
   * @param {Object} transcript - Transcript object
   */
  async saveTranscript(meetingId, transcript) {
    const meetingDir = this.getMeetingFolder(meetingId);

    try {
      // Ensure meeting folder exists
      await fs.mkdir(meetingDir, { recursive: true });

      // Save JSON transcript
      const jsonPath = path.join(meetingDir, 'transcript.json');
      await fs.writeFile(jsonPath, JSON.stringify(transcript, null, 2));

      // Save text transcript
      const textPath = path.join(meetingDir, 'transcript.txt');
      const textContent = this._formatTranscriptText(transcript);
      await fs.writeFile(textPath, textContent);

      return {
        success: true,
        jsonPath,
        textPath,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save notes file
   * @param {string} meetingId - Meeting ID
   * @param {string} notes - Notes content (Markdown)
   */
  async saveNotes(meetingId, notes) {
    const meetingDir = this.getMeetingFolder(meetingId);
    const notesPath = path.join(meetingDir, 'notes.md');

    try {
      await fs.mkdir(meetingDir, { recursive: true });
      await fs.writeFile(notesPath, notes, 'utf8');

      return { success: true, path: notesPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save metadata
   * @param {string} meetingId - Meeting ID
   * @param {Object} metadata - Metadata object
   */
  async saveMetadata(meetingId, metadata) {
    const meetingDir = this.getMeetingFolder(meetingId);
    const metadataPath = path.join(meetingDir, 'metadata.json');

    try {
      await fs.mkdir(meetingDir, { recursive: true });
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      return { success: true, path: metadataPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Load metadata
   * @param {string} meetingId - Meeting ID
   */
  async loadMetadata(meetingId) {
    const meetingDir = this.getMeetingFolder(meetingId);
    const metadataPath = path.join(meetingDir, 'metadata.json');

    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      return { success: true, metadata: JSON.parse(data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List all meetings
   */
  async listMeetings() {
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const meetings = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metadata = await this.loadMetadata(entry.name);
          if (metadata.success) {
            meetings.push(metadata.metadata);
          }
        }
      }

      // Sort by creation date (newest first)
      meetings.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      return { success: true, meetings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete meeting folder
   * @param {string} meetingId - Meeting ID
   */
  async deleteMeeting(meetingId) {
    const meetingDir = this.getMeetingFolder(meetingId);

    try {
      await fs.rm(meetingDir, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get file paths for a meeting
   */
  getMeetingFiles(meetingId) {
    const meetingDir = this.getMeetingFolder(meetingId);
    return {
      audio: path.join(meetingDir, 'audio.wav'),
      transcriptJson: path.join(meetingDir, 'transcript.json'),
      transcriptText: path.join(meetingDir, 'transcript.txt'),
      notes: path.join(meetingDir, 'notes.md'),
      metadata: path.join(meetingDir, 'metadata.json'),
    };
  }

  /**
   * Check if meeting exists
   */
  async meetingExists(meetingId) {
    const meetingDir = this.getMeetingFolder(meetingId);
    try {
      await fs.access(meetingDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format transcript as plain text
   */
  _formatTranscriptText(transcript) {
    if (!transcript.segments || transcript.segments.length === 0) {
      return transcript.text || '';
    }

    return transcript.segments
      .map(segment => {
        const time = this._formatTime(segment.start);
        return `[${time}] ${segment.text.trim()}`;
      })
      .join('\n');
  }

  /**
   * Format seconds as HH:MM:SS
   */
  _formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

module.exports = MeetingStorage;
