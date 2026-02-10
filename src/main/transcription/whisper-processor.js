/**
 * Whisper Processor - Chunked Transcription
 * 
 * Processes long audio files (up to 3 hours) by splitting into chunks.
 * Prevents memory overflow by processing 60-second segments sequentially.
 * Each chunk is processed, transcribed, and immediately cleaned up.
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const AudioSplitter = require('./audio-splitter');
const ChunkProcessor = require('./chunk-processor');
const TranscriptMerger = require('./transcript-merger');
const GroqProcessor = require('./groq-processor');

class WhisperProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.chunkDuration = options.chunkDuration || 60; // 60 seconds per chunk
    this.tempDir = options.tempDir || path.join(__dirname, '../../temp');
    this.useGroq = options.useGroq || false; // Use Groq API instead of local Whisper
    this.groqApiKeys = options.groqApiKeys || []; // Array of Groq API keys
    
    // Initialize helpers
    this.splitter = new AudioSplitter(this.tempDir);
    
    if (this.useGroq && this.groqApiKeys.length > 0) {
      // Use Groq API for faster, parallel processing
      console.log('[WhisperProcessor] Using Groq API mode with', this.groqApiKeys.length, 'API keys');
      this.groqProcessor = new GroqProcessor({
        apiKeys: this.groqApiKeys,
        maxConcurrent: options.groqMaxConcurrent || 5,
      });
      // Setup Groq event listeners
      this.groqProcessor.on('chunk-complete', (data) => this.emit('chunk-complete', data));
      this.groqProcessor.on('chunk-error', (data) => this.emit('chunk-error', data));
    } else {
      // Use local Whisper (offline)
      console.log('[WhisperProcessor] Using local Whisper mode (offline)');
      this.chunkProcessor = new ChunkProcessor({
        model: options.model || 'medium',
        whisperCommand: options.whisperCommand || 'whisper',
        chunkDuration: this.chunkDuration,
      });
    }
    
    this.merger = new TranscriptMerger();
    
    // State
    this.isProcessing = false;
    this.currentJob = null;
  }

  /**
   * Process audio file with Whisper (chunked)
   * @param {string} audioPath - Path to audio file
   * @param {string} outputDir - Directory for transcript output
   */
  async processAudio(audioPath, outputDir) {
    console.log('[WhisperProcessor] processAudio called', { audioPath, outputDir });
    
    if (this.isProcessing) {
      throw new Error('Transcription already in progress');
    }

    this.isProcessing = true;
    this.currentJob = {
      audioPath,
      outputDir,
      startTime: Date.now(),
      chunks: [],
    };

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log('[WhisperProcessor] Temp directory ready:', this.tempDir);

      // Split audio into chunks
      console.log('[WhisperProcessor] Splitting audio into chunks...');
      const chunks = await this.splitter.split(audioPath, this.chunkDuration);
      console.log('[WhisperProcessor] Split into', chunks.length, 'chunks');
      this.emit('split-complete', { chunkCount: chunks.length });

      // Process chunks (parallel with Groq, sequential with local Whisper)
      const transcripts = [];
      
      if (this.useGroq && this.groqProcessor && this.groqProcessor.apiKeys.length > 0) {
        // Groq: Process chunks in parallel with API rotation
        console.log('[WhisperProcessor] Processing chunks in parallel with Groq API');
        this.emit('chunk-start', { index: 1, total: chunks.length });
        
        try {
          const groqTranscripts = await this.groqProcessor.processChunksParallel(chunks);
        
        // Sort by chunk index and adjust timestamps
        for (let i = 0; i < groqTranscripts.length; i++) {
          const transcript = groqTranscripts[i];
          const adjusted = this._adjustTimestamps(transcript, i * this.chunkDuration);
          transcripts.push(adjusted);
          
          // Clean up chunk file
          try {
            await fs.unlink(chunks[i]);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        } catch (groqError) {
          console.error('[WhisperProcessor] Groq processing failed, falling back to local Whisper:', groqError.message);
          // Fall through to local Whisper processing
          this.useGroq = false; // Disable Groq for this session
        }
      }
      
      if (!this.useGroq || !this.groqProcessor || this.groqProcessor.apiKeys.length === 0) {
        // Local Whisper: Process chunks sequentially
        console.log('[WhisperProcessor] Processing chunks sequentially with local Whisper');
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          this.emit('chunk-start', { index: i + 1, total: chunks.length, chunkPath: chunk });

          try {
            const transcript = await this.chunkProcessor.processChunk(chunk, i);
            transcripts.push(transcript);
            
            // Clean up chunk file immediately
            await fs.unlink(chunk);
            this.emit('chunk-complete', { index: i + 1, total: chunks.length });
          } catch (error) {
            // Log error but continue with other chunks
            this.emit('chunk-error', { index: i + 1, error: error.message });
            // Still try to clean up
            try {
              await fs.unlink(chunk);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      }

      // Merge transcripts
      console.log('[WhisperProcessor] Merging', transcripts.length, 'chunk transcripts...');
      const merged = this.merger.merge(transcripts, this.chunkDuration);
      console.log('[WhisperProcessor] Merged transcript', {
        language: merged.language,
        textLength: merged.text?.length || 0,
        segmentCount: merged.segments?.length || 0,
        duration: merged.duration
      });
      
      // Save final transcript
      const transcriptPath = path.join(outputDir, 'transcript.json');
      const textPath = path.join(outputDir, 'transcript.txt');
      
      await fs.writeFile(transcriptPath, JSON.stringify(merged, null, 2));
      await fs.writeFile(textPath, this.merger.formatAsText(merged, true));
      console.log('[WhisperProcessor] Transcript saved', { transcriptPath, textPath });

      this.emit('complete', {
        transcriptPath,
        textPath,
        duration: Date.now() - this.currentJob.startTime,
      });

      return { transcriptPath, textPath, transcript: merged };
    } catch (error) {
      this.emit('error', error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.currentJob = null;
    }
  }

  /**
   * Adjust timestamps in transcript (helper for Groq processing)
   */
  _adjustTimestamps(transcript, offsetSeconds) {
    if (!transcript.segments) {
      return transcript;
    }
    
    return {
      ...transcript,
      segments: transcript.segments.map(segment => ({
        ...segment,
        start: segment.start + offsetSeconds,
        end: segment.end + offsetSeconds,
      })),
    };
  }


  /**
   * Get processing status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentJob: this.currentJob ? {
        audioPath: this.currentJob.audioPath,
        startTime: this.currentJob.startTime,
        elapsed: Date.now() - this.currentJob.startTime,
      } : null,
    };
  }
}

module.exports = WhisperProcessor;
