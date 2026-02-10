/**
 * Audio Splitter - FFmpeg Audio Chunking
 * 
 * Splits long audio files into fixed-duration chunks using FFmpeg.
 * Used for memory-efficient processing of long recordings.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const FFmpegFinder = require('../utils/ffmpeg-finder');

class AudioSplitter {
  constructor(tempDir) {
    this.tempDir = tempDir;
  }

  /**
   * Split audio file into chunks
   * @param {string} audioPath - Path to audio file
   * @param {number} chunkDuration - Duration of each chunk in seconds
   * @returns {Promise<string[]>} Array of chunk file paths
   */
  async split(audioPath, chunkDuration = 60) {
    const chunkPattern = path.join(this.tempDir, `chunk_%03d.wav`);

    return new Promise((resolve, reject) => {
      // FFmpeg command to split audio into fixed-duration chunks
      // -f segment: Use segment muxer
      // -segment_time: Duration of each segment (60 seconds)
      // -segment_format wav: Output format
      // -reset_timestamps 1: Reset timestamps in each segment (prevents issues)
      // -c copy: Copy codec (no re-encoding, faster and no quality loss)
      const args = [
        '-i', audioPath,
        '-f', 'segment',
        '-segment_time', chunkDuration.toString(),
        '-segment_format', 'wav',
        '-reset_timestamps', '1',
        '-c', 'copy', // Copy codec (no re-encoding)
        chunkPattern,
      ];

      const ffmpegPath = FFmpegFinder.findFFmpeg();
      const ffmpeg = spawn(ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let errorOutput = '';
      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0 && code !== 1) {
          // Code 1 is sometimes returned even on success
          reject(new Error(`FFmpeg split failed: ${errorOutput}`));
          return;
        }

        // Find all generated chunk files
        this._findChunkFiles(chunkPattern)
          .then(files => {
            // Sort by chunk number
            files.sort();
            resolve(files);
          })
          .catch(reject);
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn failed: ${error.message}`));
      });
    });
  }

  /**
   * Find chunk files matching pattern
   */
  async _findChunkFiles(pattern) {
    // Pattern is like: temp/chunk_%03d.wav
    // FFmpeg generates: chunk_000.wav, chunk_001.wav, etc.
    const dir = path.dirname(pattern);

    const files = await fs.readdir(dir);
    return files
      .filter(f => f.startsWith('chunk_') && f.endsWith('.wav'))
      .map(f => path.join(dir, f));
  }
}

module.exports = AudioSplitter;
