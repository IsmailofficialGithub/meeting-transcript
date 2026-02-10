/**
 * FFmpeg Finder - Locate FFmpeg Executable
 * 
 * Finds FFmpeg executable in common locations:
 * 1. System PATH
 * 2. Portable installations (E:\ffmpeg, C:\ffmpeg)
 * 
 * Returns the path to ffmpeg.exe or 'ffmpeg' if found in PATH
 */

const fs = require('fs');
const path = require('path');

class FFmpegFinder {
  /**
   * Find FFmpeg executable
   * @returns {string} Path to ffmpeg or 'ffmpeg' if in PATH
   */
  static findFFmpeg() {
    // Common locations to check (exact paths)
    const locations = [
      'E:\\ffmpeg\\bin\\ffmpeg.exe',
      'E:\\ffmpeg\\ffmpeg.exe',
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\ffmpeg\\ffmpeg.exe',
      path.join(process.cwd(), 'ffmpeg', 'bin', 'ffmpeg.exe'),
      path.join(process.cwd(), 'ffmpeg', 'ffmpeg.exe'),
    ];

    // Check exact paths first
    for (const location of locations) {
      if (fs.existsSync(location)) {
        console.log('Found FFmpeg at:', location);
        return location;
      }
    }

    // Search recursively in common directories (for subfolder installations)
    const searchDirs = ['E:\\ffmpeg', 'C:\\ffmpeg', path.join(process.cwd(), 'ffmpeg')];
    
    for (const searchDir of searchDirs) {
      if (fs.existsSync(searchDir)) {
        try {
          const found = this._findFFmpegRecursive(searchDir);
          if (found) {
            console.log('Found FFmpeg at:', found);
            return found;
          }
        } catch (error) {
          // Continue searching
        }
      }
    }

    // If not found, return 'ffmpeg' to try PATH
    console.log('FFmpeg not found in common locations, trying PATH...');
    return 'ffmpeg';
  }

  /**
   * Recursively search for ffmpeg.exe in a directory
   * @private
   */
  static _findFFmpegRecursive(dir, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return null;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile() && entry.name === 'ffmpeg.exe') {
          return fullPath;
        }
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const found = this._findFFmpegRecursive(fullPath, maxDepth, currentDepth + 1);
          if (found) {
            return found;
          }
        }
      }
    } catch (error) {
      // Ignore permission errors, etc.
    }
    
    return null;
  }

  /**
   * Check if FFmpeg is available
   * @returns {Promise<boolean>} True if FFmpeg is available
   */
  static async checkFFmpegAvailable() {
    const ffmpegPath = this.findFFmpeg();
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const command = `"${ffmpegPath}" -version`;
      await execAsync(command, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get FFmpeg path for use in commands
   * Wraps in quotes if it's a full path
   */
  static getFFmpegCommand() {
    const ffmpegPath = this.findFFmpeg();
    // If it's a full path, wrap in quotes; otherwise use as-is
    if (ffmpegPath.includes('\\') || ffmpegPath.includes('/')) {
      return `"${ffmpegPath}"`;
    }
    return ffmpegPath;
  }
}

module.exports = FFmpegFinder;
