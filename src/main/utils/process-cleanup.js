/**
 * Process Cleanup Utility
 * 
 * Centralized utility for cleaning up processes and temporary files.
 * Prevents orphaned processes and file system clutter.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class ProcessCleanup {
  constructor() {
    this.trackedProcesses = new Map(); // pid -> { name, startTime }
    this.tempFiles = new Set(); // Set of temp file paths
  }

  /**
   * Track a process for later cleanup
   * @param {number} pid - Process ID
   * @param {string} name - Process name/description
   */
  trackProcess(pid, name) {
    this.trackedProcesses.set(pid, {
      name,
      startTime: Date.now(),
    });
  }

  /**
   * Stop tracking a process (normal exit)
   * @param {number} pid - Process ID
   */
  untrackProcess(pid) {
    this.trackedProcesses.delete(pid);
  }

  /**
   * Kill a specific process
   * @param {number} pid - Process ID
   * @param {boolean} force - Use SIGKILL instead of SIGTERM
   */
  async killProcess(pid, force = false) {
    if (!pid) {
      return { success: false, error: 'Invalid PID' };
    }

    try {
      // Check if process exists
      process.kill(pid, 0);
    } catch (error) {
      // Process doesn't exist
      this.untrackProcess(pid);
      return { success: false, error: 'Process does not exist' };
    }

    try {
      // Try graceful shutdown first
      if (force) {
        process.kill(pid, 'SIGKILL');
      } else {
        process.kill(pid, 'SIGTERM');
        
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if still running, force kill if needed
        try {
          process.kill(pid, 0);
          process.kill(pid, 'SIGKILL');
        } catch (e) {
          // Process already terminated
        }
      }

      this.untrackProcess(pid);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Kill all tracked processes
   */
  async killAllTrackedProcesses(force = false) {
    const results = [];
    
    for (const [pid, info] of this.trackedProcesses.entries()) {
      const result = await this.killProcess(pid, force);
      results.push({ pid, name: info.name, ...result });
    }

    return results;
  }

  /**
   * Find and kill orphaned FFmpeg processes
   * Useful for cleanup after crashes
   */
  async killOrphanedFFmpeg() {
    try {
      // Windows: taskkill /F /IM ffmpeg.exe
      // This is a fallback - normally processes should be tracked
      const command = process.platform === 'win32'
        ? 'taskkill /F /IM ffmpeg.exe /T 2>nul'
        : 'pkill -9 ffmpeg';

      await execAsync(command);
      return { success: true, message: 'Orphaned FFmpeg processes killed' };
    } catch (error) {
      // No processes found or error - that's okay
      return { success: true, message: 'No orphaned processes found' };
    }
  }

  /**
   * Track a temporary file for cleanup
   * @param {string} filePath - Path to temp file
   */
  trackTempFile(filePath) {
    this.tempFiles.add(filePath);
  }

  /**
   * Remove a temporary file
   * @param {string} filePath - Path to temp file
   */
  async removeTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      this.tempFiles.delete(filePath);
      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File already doesn't exist
        this.tempFiles.delete(filePath);
        return { success: true, message: 'File already removed' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove all tracked temporary files
   */
  async removeAllTempFiles() {
    const results = [];
    
    for (const filePath of this.tempFiles) {
      const result = await this.removeTempFile(filePath);
      results.push({ filePath, ...result });
    }

    return results;
  }

  /**
   * Clean up a directory of temporary files
   * @param {string} dirPath - Directory path
   * @param {boolean} removeDir - Remove directory itself after cleanup
   */
  async cleanupDirectory(dirPath, removeDir = false) {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isDirectory()) {
            await this.cleanupDirectory(filePath, true);
          } else {
            await fs.unlink(filePath);
          }
        } catch (error) {
          // Continue with other files
          console.warn(`Failed to remove ${filePath}:`, error.message);
        }
      }

      if (removeDir) {
        await fs.rmdir(dirPath);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Full cleanup: processes and temp files
   */
  async fullCleanup(forceKill = false) {
    const results = {
      processes: await this.killAllTrackedProcesses(forceKill),
      tempFiles: await this.removeAllTempFiles(),
      orphanedFFmpeg: await this.killOrphanedFFmpeg(),
    };

    return results;
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    return {
      trackedProcesses: this.trackedProcesses.size,
      tempFiles: this.tempFiles.size,
    };
  }
}

// Singleton instance
const cleanup = new ProcessCleanup();

module.exports = cleanup;
