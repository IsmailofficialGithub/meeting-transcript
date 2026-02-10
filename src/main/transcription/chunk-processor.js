/**
 * Chunk Processor - Whisper Chunk Processing
 * 
 * Processes individual audio chunks with Whisper.
 * Handles timestamp adjustment for chunk position.
 */

const { spawn } = require('child_process');
const path = require('path');

class ChunkProcessor {
  constructor(options = {}) {
    this.model = options.model || 'medium';
    
    // Try to use virtual environment Python if available
    // Check multiple possible locations
    const possiblePaths = [
      'E:\\whisper-env\\Scripts\\python.exe',
      path.join(process.cwd(), 'whisper-env', 'Scripts', 'python.exe'),
      path.join(process.env.USERPROFILE || process.env.HOME || '', 'whisper-env', 'Scripts', 'python.exe'),
    ];
    
    const fs = require('fs');
    let venvPython = null;
    
    for (const pythonPath of possiblePaths) {
      if (fs.existsSync(pythonPath)) {
        venvPython = pythonPath;
        break;
      }
    }
    
    if (venvPython && !options.whisperCommand) {
      this.whisperCommand = venvPython;
      this.whisperArgs = ['-m', 'whisper']; // Use python -m whisper
      console.log('[ChunkProcessor] Using virtual environment Python:', venvPython);
    } else if (options.whisperCommand) {
      // Use provided command
      this.whisperCommand = options.whisperCommand;
      this.whisperArgs = options.whisperCommand.includes('python') ? ['-m', 'whisper'] : [];
      console.log('[ChunkProcessor] Using provided whisper command:', this.whisperCommand);
    } else {
      // Fallback to system whisper command
      this.whisperCommand = 'whisper';
      this.whisperArgs = []; // Direct whisper command
      console.warn('[ChunkProcessor] Virtual environment not found, using system whisper command:', this.whisperCommand);
      console.warn('[ChunkProcessor] If this fails, install Whisper: See INSTALL_WHISPER.md');
    }
    
    this.chunkDuration = options.chunkDuration || 60;
  }

  /**
   * Process a single chunk with Whisper
   * @param {string} chunkPath - Path to chunk file
   * @param {number} chunkIndex - Index of chunk (for timestamp offset)
   * @returns {Promise<Object>} Transcript object with adjusted timestamps
   */
  async processChunk(chunkPath, chunkIndex) {
    return new Promise((resolve, reject) => {
      // Calculate chunk start time (for timestamp adjustment)
      const chunkStartTime = chunkIndex * this.chunkDuration;

      // Whisper command (Python version)
      // --model: Model size (small/medium/large)
      // --language: Auto-detect language (use 'auto' or omit for auto-detection)
      // --output_format: JSON format with timestamps
      // --no-memory: Don't cache model in memory (saves memory)
      // --fp16 False: Disable FP16 (more compatible, slightly slower)
      // --verbose: Show more output for debugging
      const args = [
        ...this.whisperArgs,  // Add -m whisper if using Python
        chunkPath,
        '--model', this.model,
        '--language', 'auto',  // Auto-detect language
        '--output_format', 'json',
        '--no-memory',
        '--fp16', 'False',
        '--verbose', 'False',  // Set to True for debugging
      ];
      
      console.log('[ChunkProcessor] Processing chunk', {
        chunkPath,
        chunkIndex,
        chunkStartTime,
        model: this.model,
        command: this.whisperCommand,
        fullCommand: `${this.whisperCommand} ${args.join(' ')}`
      });

      const whisper = spawn(this.whisperCommand, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      
      console.log('[ChunkProcessor] Whisper process spawned, PID:', whisper.pid);

      let stdout = '';
      let stderr = '';

      whisper.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        console.log('[ChunkProcessor] Whisper stdout:', text.substring(0, 200));
      });

      whisper.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        console.log('[ChunkProcessor] Whisper stderr:', text.substring(0, 300));
      });

      whisper.on('close', (code) => {
        console.log('[ChunkProcessor] Whisper process closed', { code, chunkIndex });
        
        if (code !== 0) {
          console.error('[ChunkProcessor] Whisper failed', {
            code,
            stderr: stderr.substring(0, 500),
            stdout: stdout.substring(0, 500)
          });
          reject(new Error(`Whisper failed with code ${code}: ${stderr.substring(0, 500)}`));
          return;
        }

        try {
          // Whisper outputs JSON to stdout
          if (!stdout || stdout.trim().length === 0) {
            console.warn('[ChunkProcessor] Whisper stdout is empty');
            // Try to parse stderr as JSON (sometimes Whisper outputs to stderr)
            if (stderr.includes('{')) {
              console.log('[ChunkProcessor] Trying to parse stderr as JSON');
              stdout = stderr;
            } else {
              reject(new Error('Whisper produced no output'));
              return;
            }
          }
          
          const result = JSON.parse(stdout);
          console.log('[ChunkProcessor] Whisper result', {
            language: result.language,
            textLength: result.text?.length || 0,
            segmentCount: result.segments?.length || 0
          });
          
          // Adjust timestamps to account for chunk position
          const adjusted = this._adjustTimestamps(result, chunkStartTime);
          resolve(adjusted);
        } catch (error) {
          console.error('[ChunkProcessor] Failed to parse Whisper output', {
            error: error.message,
            stdoutLength: stdout.length,
            stdoutPreview: stdout.substring(0, 500),
            stderrPreview: stderr.substring(0, 500)
          });
          reject(new Error(`Failed to parse Whisper output: ${error.message}. Output: ${stdout.substring(0, 200)}`));
        }
      });

      whisper.on('error', (error) => {
        console.error('[ChunkProcessor] Whisper spawn error:', error);
        let errorMsg = `Whisper spawn failed: ${error.message}`;
        
        if (error.code === 'ENOENT') {
          errorMsg = `Whisper is not installed or not found. Please install Whisper. See INSTALL_WHISPER.md for instructions.`;
        }
        
        reject(new Error(errorMsg));
      });
    });
  }

  /**
   * Adjust timestamps in transcript to account for chunk position
   */
  _adjustTimestamps(transcript, offsetSeconds) {
    const adjusted = {
      ...transcript,
      segments: transcript.segments.map(segment => ({
        ...segment,
        start: segment.start + offsetSeconds,
        end: segment.end + offsetSeconds,
      })),
    };

    return adjusted;
  }
}

module.exports = ChunkProcessor;
