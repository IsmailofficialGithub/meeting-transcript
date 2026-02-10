/**
 * Memory Monitor - Heap Usage Monitoring
 * 
 * Monitors Node.js memory usage during long recordings and transcription.
 * Provides alerts and garbage collection management to prevent OOM errors.
 */

const v8 = require('v8');
const EventEmitter = require('events');

class MemoryMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.warningThreshold = options.warningThreshold || 400 * 1024 * 1024; // 400MB
    this.criticalThreshold = options.criticalThreshold || 500 * 1024 * 1024; // 500MB
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.autoGC = options.autoGC !== false; // Enable auto GC by default
    
    // State
    this.monitoring = false;
    this.intervalId = null;
    this.stats = {
      peakHeapUsed: 0,
      peakHeapTotal: 0,
      gcCount: 0,
      lastGC: null,
    };
  }

  /**
   * Start monitoring memory usage
   */
  start() {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    this.intervalId = setInterval(() => {
      this._checkMemory();
    }, this.checkInterval);

    // Initial check
    this._checkMemory();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.monitoring = false;
  }

  /**
   * Check current memory usage
   */
  _checkMemory() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    const heapTotal = usage.heapTotal;

    // Update peak stats
    if (heapUsed > this.stats.peakHeapUsed) {
      this.stats.peakHeapUsed = heapUsed;
    }
    if (heapTotal > this.stats.peakHeapTotal) {
      this.stats.peakHeapTotal = heapTotal;
    }

    // Check thresholds
    if (heapUsed >= this.criticalThreshold) {
      this.emit('critical', {
        heapUsed,
        heapTotal,
        threshold: this.criticalThreshold,
      });

      // Force garbage collection if enabled
      if (this.autoGC) {
        this.forceGC();
      }
    } else if (heapUsed >= this.warningThreshold) {
      this.emit('warning', {
        heapUsed,
        heapTotal,
        threshold: this.warningThreshold,
      });

      // Suggest GC but don't force
      if (this.autoGC) {
        this.suggestGC();
      }
    }

    // Emit regular stats
    this.emit('stats', {
      heapUsed,
      heapTotal,
      external: usage.external,
      rss: usage.rss,
      peakHeapUsed: this.stats.peakHeapUsed,
      peakHeapTotal: this.stats.peakHeapTotal,
    });
  }

  /**
   * Force garbage collection (if --expose-gc flag is set)
   */
  forceGC() {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;

      this.stats.gcCount++;
      this.stats.lastGC = Date.now();

      this.emit('gc', {
        type: 'forced',
        freed,
        heapUsed: after,
      });

      return { success: true, freed };
    } else {
      this.emit('gc-unavailable', {
        message: 'Garbage collection not available. Start Node with --expose-gc flag.',
      });
      return { success: false, error: 'GC not available' };
    }
  }

  /**
   * Suggest garbage collection (non-blocking)
   */
  suggestGC() {
    if (global.gc) {
      // Use setImmediate to avoid blocking
      setImmediate(() => {
        this.forceGC();
      });
    }
  }

  /**
   * Get current memory statistics
   */
  getStats() {
    const usage = process.memoryUsage();
    return {
      current: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
      },
      peak: {
        heapUsed: this.stats.peakHeapUsed,
        heapTotal: this.stats.peakHeapTotal,
      },
      gc: {
        count: this.stats.gcCount,
        lastGC: this.stats.lastGC,
        available: typeof global.gc === 'function',
      },
      thresholds: {
        warning: this.warningThreshold,
        critical: this.criticalThreshold,
      },
    };
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get detailed memory report
   */
  getReport() {
    const stats = this.getStats();
    return {
      monitoring: this.monitoring,
      current: {
        heapUsed: this.formatBytes(stats.current.heapUsed),
        heapTotal: this.formatBytes(stats.current.heapTotal),
        rss: this.formatBytes(stats.current.rss),
      },
      peak: {
        heapUsed: this.formatBytes(stats.peak.heapUsed),
        heapTotal: this.formatBytes(stats.peak.heapTotal),
      },
      gc: stats.gc,
      thresholds: {
        warning: this.formatBytes(stats.thresholds.warning),
        critical: this.formatBytes(stats.thresholds.critical),
      },
    };
  }
}

module.exports = MemoryMonitor;
