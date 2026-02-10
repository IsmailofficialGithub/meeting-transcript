/**
 * Groq Processor - Cloud Whisper API with Load Balancing
 * 
 * Processes audio chunks using Groq Whisper API with:
 * - Multiple API key rotation
 * - Parallel chunk processing
 * - Automatic retry with different keys
 * - Fallback to local Whisper if all APIs fail
 * 
 * NOTE: This requires internet connection (violates 100% offline requirement)
 * Use only if speed is more important than privacy/offline capability.
 */

const https = require('https');
const FormData = require('form-data');
const fs = require('fs');
const EventEmitter = require('events');

class GroqProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // API keys array - rotate through these
    this.apiKeys = options.apiKeys || [];
    this.currentKeyIndex = 0;
    this.baseUrl = options.baseUrl || 'https://api.groq.com/openai/v1/audio/transcriptions';
    this.model = options.model || 'whisper-large-v3';
    
    // Rate limiting
    this.requestsPerMinute = options.requestsPerMinute || 60;
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrent = options.maxConcurrent || 5; // Process 5 chunks in parallel
    
    // Retry configuration
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Get next API key (round-robin)
   */
  getNextApiKey() {
    if (this.apiKeys.length === 0) {
      throw new Error('No Groq API keys configured. Please run setup-groq.ps1 or configure config.json');
    }
    
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  /**
   * Process a single audio chunk with Groq API
   * @param {string} chunkPath - Path to audio chunk file
   * @param {number} chunkIndex - Chunk index (for timestamp offset)
   * @returns {Promise<Object>} Transcript object
   */
  async processChunk(chunkPath, chunkIndex) {
    const apiKey = this.getNextApiKey();
    console.log(`[GroqProcessor] Processing chunk ${chunkIndex} with API key ${this.currentKeyIndex - 1}`);
    
    return this._transcribeWithRetry(chunkPath, apiKey, chunkIndex);
  }

  /**
   * Transcribe audio with retry logic
   */
  async _transcribeWithRetry(chunkPath, apiKey, chunkIndex, retryCount = 0) {
    try {
      return await this._transcribeChunk(chunkPath, apiKey);
    } catch (error) {
      console.error(`[GroqProcessor] Chunk ${chunkIndex} attempt ${retryCount + 1} failed`, {
        error: error.message,
        errorCode: error.code,
        apiKeyIndex: (this.currentKeyIndex - 1) % this.apiKeys.length,
        apiKeyPrefix: apiKey.substring(0, 10) + '...'
      });
      
      // If rate limited or error, try next API key
      if (retryCount < this.maxRetries && this.apiKeys.length > 1) {
        console.warn(`[GroqProcessor] Retry ${retryCount + 1} for chunk ${chunkIndex} with next API key`);
        const nextKey = this.getNextApiKey();
        return this._transcribeWithRetry(chunkPath, nextKey, chunkIndex, retryCount + 1);
      }
      
      // All retries exhausted
      console.error(`[GroqProcessor] All retries exhausted for chunk ${chunkIndex}`, {
        error: error.message,
        retryCount: retryCount + 1,
        totalApiKeys: this.apiKeys.length
      });
      throw error;
    }
  }

  /**
   * Transcribe a single chunk using Groq API
   */
  async _transcribeChunk(chunkPath, apiKey) {
    return new Promise((resolve, reject) => {
      // Check if file exists
      if (!fs.existsSync(chunkPath)) {
        reject(new Error(`Audio chunk file not found: ${chunkPath}`));
        return;
      }
      
      const fileStats = fs.statSync(chunkPath);
      console.log(`[GroqProcessor] Preparing to transcribe chunk`, {
        chunkPath,
        fileSize: fileStats.size,
        fileSizeKB: (fileStats.size / 1024).toFixed(2) + ' KB'
      });
      
      if (fileStats.size === 0) {
        reject(new Error(`Audio chunk file is empty: ${chunkPath}`));
        return;
      }
      
      const form = new FormData();
      form.append('file', fs.createReadStream(chunkPath));
      form.append('model', this.model);
      // Note: Don't specify language - Groq will auto-detect
      // Groq API doesn't accept "auto" as a language value
      form.append('response_format', 'verbose_json'); // Get timestamps
      form.append('timestamp_granularities[]', 'segment');

      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${apiKey}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`[GroqProcessor] API response`, {
            statusCode: res.statusCode,
            dataLength: data.length,
            dataPreview: data.substring(0, 500)
          });
          
          if (res.statusCode === 200) {
            try {
              const result = JSON.parse(data);
              console.log(`[GroqProcessor] Chunk transcribed`, {
                language: result.language,
                textLength: result.text?.length || 0
              });
              
              // Convert Groq format to our format
              const transcript = this._convertGroqFormat(result);
              resolve(transcript);
            } catch (error) {
              console.error(`[GroqProcessor] Parse error`, {
                error: error.message,
                data: data.substring(0, 500)
              });
              reject(new Error(`Failed to parse Groq response: ${error.message}`));
            }
          } else if (res.statusCode === 429) {
            // Rate limited
            console.warn(`[GroqProcessor] Rate limited (429)`, { data: data.substring(0, 200) });
            reject(new Error('Rate limited - will retry with next API key'));
          } else {
            console.error(`[GroqProcessor] API error`, {
              statusCode: res.statusCode,
              data: data.substring(0, 500)
            });
            reject(new Error(`Groq API error ${res.statusCode}: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error(`[GroqProcessor] Request error`, {
          error: error.message,
          code: error.code,
          stack: error.stack?.substring(0, 300)
        });
        reject(new Error(`Groq API request failed: ${error.message} (${error.code || 'unknown'})`));
      });

      form.pipe(req);
      
      // Log request details
      console.log(`[GroqProcessor] Sending request to Groq API`, {
        hostname: options.hostname,
        path: options.path,
        method: options.method,
        chunkPath: chunkPath,
        model: this.model
      });
    });
  }

  /**
   * Convert Groq API response to our transcript format
   */
  _convertGroqFormat(groqResult) {
    return {
      text: groqResult.text || '',
      language: groqResult.language || 'unknown',
      segments: groqResult.segments?.map(seg => ({
        id: seg.id || 0,
        start: seg.start || 0,
        end: seg.end || 0,
        text: seg.text || '',
      })) || [],
    };
  }

  /**
   * Process multiple chunks in parallel with load balancing
   * @param {string[]} chunkPaths - Array of chunk file paths
   * @returns {Promise<Object[]>} Array of transcript objects
   */
  async processChunksParallel(chunkPaths) {
    console.log(`[GroqProcessor] Processing ${chunkPaths.length} chunks in parallel (max ${this.maxConcurrent} concurrent)`);
    
    const results = [];
    const errors = [];
    
    // Process chunks in batches to respect rate limits
    for (let i = 0; i < chunkPaths.length; i += this.maxConcurrent) {
      const batch = chunkPaths.slice(i, i + this.maxConcurrent);
      const batchPromises = batch.map((chunkPath, batchIndex) => {
        const chunkIndex = i + batchIndex;
        return this.processChunk(chunkPath, chunkIndex)
          .then(result => ({ index: chunkIndex, result }))
          .catch(error => ({ index: chunkIndex, error }));
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const item of batchResults) {
        if (item.error) {
          console.error(`[GroqProcessor] Chunk ${item.index} failed`, {
            error: item.error.message || item.error,
            errorType: item.error.constructor?.name
          });
          errors.push({ chunkIndex: item.index, error: item.error });
          this.emit('chunk-error', { index: item.index, error: item.error });
        } else {
          results[item.index] = item.result;
          this.emit('chunk-complete', { index: item.index });
        }
      }
      
      // Small delay between batches to avoid rate limits
      if (i + this.maxConcurrent < chunkPaths.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (errors.length > 0) {
      console.warn(`[GroqProcessor] ${errors.length} chunks failed`);
    }
    
    return results.filter(r => r !== undefined);
  }
}

module.exports = GroqProcessor;
