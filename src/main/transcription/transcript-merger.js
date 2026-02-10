/**
 * Transcript Merger - Merge Chunk Transcripts
 * 
 * Merges multiple chunk transcripts into a single coherent transcript.
 * Handles timestamp correction, segment ordering, and text formatting.
 */

class TranscriptMerger {
  /**
   * Merge multiple chunk transcripts
   * @param {Array} chunkTranscripts - Array of transcript objects from chunks
   * @param {number} chunkDuration - Duration of each chunk in seconds
   */
  merge(chunkTranscripts, chunkDuration = 60) {
    console.log('[TranscriptMerger] Merging transcripts', {
      chunkCount: chunkTranscripts?.length || 0,
      chunkDuration
    });
    
    if (!chunkTranscripts || chunkTranscripts.length === 0) {
      console.warn('[TranscriptMerger] No transcripts to merge');
      return this._createEmptyTranscript();
    }

    // Validate and normalize all transcripts
    const normalized = chunkTranscripts.map((transcript, index) => {
      const normalized = this._normalizeTranscript(transcript, index * chunkDuration);
      console.log('[TranscriptMerger] Normalized chunk', index, {
        hasText: !!normalized.text,
        textLength: normalized.text?.length || 0,
        segmentCount: normalized.segments?.length || 0,
        language: normalized.language
      });
      return normalized;
    });

    // Combine segments
    const allSegments = [];
    for (const transcript of normalized) {
      if (transcript.segments && Array.isArray(transcript.segments)) {
        allSegments.push(...transcript.segments);
      }
    }

    // Sort segments by start time (safety check)
    allSegments.sort((a, b) => a.start - b.start);

    // Remove overlapping segments (keep first)
    const deduplicated = this._deduplicateSegments(allSegments);

    // Combine text
    const fullText = this._combineText(deduplicated);

    // Determine language (use first non-null)
    const language = normalized.find(t => t.language)?.language || 'unknown';

    // Calculate total duration
    const duration = deduplicated.length > 0
      ? deduplicated[deduplicated.length - 1].end
      : 0;

    return {
      text: fullText,
      segments: deduplicated,
      language,
      duration,
      chunkCount: chunkTranscripts.length,
      segmentCount: deduplicated.length,
    };
  }

  /**
   * Normalize a transcript chunk
   * Ensures timestamps are correct and structure is consistent
   */
  _normalizeTranscript(transcript, offsetSeconds) {
    // Handle different transcript formats
    let segments = [];
    let text = '';
    let language = 'unknown';

    if (typeof transcript === 'string') {
      // Plain text - create a single segment
      text = transcript;
      segments = [{
        id: 0,
        start: offsetSeconds,
        end: offsetSeconds + 60, // Estimate
        text: transcript,
      }];
    } else if (Array.isArray(transcript)) {
      // Array of segments
      segments = transcript;
      text = segments.map(s => s.text || '').join(' ');
    } else if (transcript && typeof transcript === 'object') {
      // Object with segments/text
      segments = transcript.segments || [];
      text = transcript.text || '';
      language = transcript.language || 'unknown';
    }

    // Adjust timestamps
    const adjustedSegments = segments.map((segment, index) => {
      const baseStart = segment.start !== undefined 
        ? segment.start + offsetSeconds 
        : offsetSeconds + (index * 5); // Fallback: 5 seconds per segment
      
      const baseEnd = segment.end !== undefined
        ? segment.end + offsetSeconds
        : baseStart + 5; // Fallback: 5 second duration

      return {
        id: segment.id !== undefined ? segment.id : index,
        start: Math.max(0, baseStart), // Ensure non-negative
        end: Math.max(baseStart, baseEnd), // Ensure end >= start
        text: segment.text || segment.text || '',
        words: segment.words ? segment.words.map(w => ({
          ...w,
          start: (w.start || 0) + offsetSeconds,
          end: (w.end || 0) + offsetSeconds,
        })) : undefined,
      };
    });

    return {
      text: text || adjustedSegments.map(s => s.text).join(' '),
      segments: adjustedSegments,
      language,
    };
  }

  /**
   * Remove duplicate or overlapping segments
   * Keeps the first segment when overlap is detected
   */
  _deduplicateSegments(segments) {
    if (segments.length === 0) {
      return [];
    }

    const result = [segments[0]];

    for (let i = 1; i < segments.length; i++) {
      const current = segments[i];
      const previous = result[result.length - 1];

      // Check for overlap (current starts before previous ends)
      if (current.start < previous.end) {
        // Overlap detected - merge or skip
        // If current is significantly different, extend previous
        if (current.end > previous.end) {
          // Extend previous segment to include current
          previous.end = current.end;
          // Append text if different
          if (current.text && !previous.text.includes(current.text)) {
            previous.text += ' ' + current.text;
          }
        }
        // Otherwise, skip current (it's contained in previous)
      } else {
        // No overlap - add to result
        result.push(current);
      }
    }

    return result;
  }

  /**
   * Combine segment texts into full text
   */
  _combineText(segments) {
    if (segments.length === 0) {
      return '';
    }

    return segments
      .map(s => s.text || '')
      .filter(t => t.trim().length > 0)
      .join(' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Format transcript as plain text with timestamps
   * @param {Object} transcript - Merged transcript object
   * @param {boolean} includeTimestamps - Include timestamps in output
   */
  formatAsText(transcript, includeTimestamps = true) {
    if (!transcript.segments || transcript.segments.length === 0) {
      return transcript.text || '';
    }

    if (!includeTimestamps) {
      return transcript.text;
    }

    // Format: [HH:MM:SS] Text
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

  /**
   * Create empty transcript structure
   */
  _createEmptyTranscript() {
    return {
      text: '',
      segments: [],
      language: 'unknown',
      duration: 0,
      chunkCount: 0,
      segmentCount: 0,
    };
  }

  /**
   * Validate transcript structure
   */
  validate(transcript) {
    if (!transcript || typeof transcript !== 'object') {
      return { valid: false, error: 'Transcript must be an object' };
    }

    if (!Array.isArray(transcript.segments)) {
      return { valid: false, error: 'Transcript must have segments array' };
    }

    // Validate segments
    for (let i = 0; i < transcript.segments.length; i++) {
      const segment = transcript.segments[i];
      if (typeof segment.start !== 'number' || typeof segment.end !== 'number') {
        return { valid: false, error: `Segment ${i} missing start/end times` };
      }
      if (segment.start < 0 || segment.end < segment.start) {
        return { valid: false, error: `Segment ${i} has invalid timestamps` };
      }
    }

    return { valid: true };
  }
}

module.exports = TranscriptMerger;
