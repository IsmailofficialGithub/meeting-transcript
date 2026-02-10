/**
 * Notes Generator - Rule-Based Summarization
 * 
 * Generates meeting notes using rule-based extraction:
 * - Meeting summary
 * - Action items
 * - Key decisions
 * 
 * This is a simple, offline approach. For more advanced summarization,
 * consider integrating a local LLM (llama.cpp) in the future.
 */

class NotesGenerator {
  constructor() {
    // Keywords that indicate action items
    this.actionKeywords = [
      'action', 'todo', 'task', 'need to', 'will', 'should', 'must',
      'assign', 'follow up', 'next steps', 'deadline', 'due',
    ];

    // Keywords that indicate decisions
    this.decisionKeywords = [
      'decided', 'decision', 'agreed', 'consensus', 'chose', 'selected',
      'approved', 'rejected', 'voted', 'conclusion', 'final',
    ];

    // Keywords that indicate questions/issues
    this.questionKeywords = [
      'question', 'issue', 'problem', 'concern', 'challenge', 'blocker',
      'why', 'how', 'what', 'when', 'where', '?',
    ];
  }

  /**
   * Generate notes from transcript
   * @param {Object} transcript - Transcript object with segments
   * @param {Object} metadata - Meeting metadata (optional)
   */
  generate(transcript, metadata = {}) {
    if (!transcript || !transcript.segments) {
      return this._generateEmptyNotes(metadata);
    }

    // Extract components
    const summary = this._generateSummary(transcript);
    const actionItems = this._extractActionItems(transcript);
    const decisions = this._extractDecisions(transcript);
    const questions = this._extractQuestions(transcript);
    const keyPoints = this._extractKeyPoints(transcript);

    // Format as Markdown
    return this._formatMarkdown({
      metadata,
      summary,
      actionItems,
      decisions,
      questions,
      keyPoints,
      transcript,
    });
  }

  /**
   * Generate meeting summary
   * Uses first and last segments + key topics
   */
  _generateSummary(transcript) {
    const segments = transcript.segments || [];
    
    if (segments.length === 0) {
      return 'No transcript available.';
    }

    // Get opening (first 30 seconds or 3 segments)
    const opening = segments
      .slice(0, Math.min(3, segments.length))
      .map(s => s.text)
      .join(' ');

    // Get closing (last 30 seconds or 3 segments)
    const closing = segments
      .slice(-Math.min(3, segments.length))
      .map(s => s.text)
      .join(' ');

    // Extract key topics (simplified - look for repeated important words)
    const topics = this._extractTopics(transcript);

    let summary = `Meeting Summary\n\n`;
    
    if (opening) {
      summary += `**Opening:** ${this._truncate(opening, 200)}\n\n`;
    }

    if (topics.length > 0) {
      summary += `**Key Topics:** ${topics.join(', ')}\n\n`;
    }

    if (closing) {
      summary += `**Closing:** ${this._truncate(closing, 200)}\n\n`;
    }

    summary += `**Duration:** ${this._formatDuration(transcript.duration || 0)}\n`;
    summary += `**Total Segments:** ${segments.length}\n`;

    return summary;
  }

  /**
   * Extract action items from transcript
   */
  _extractActionItems(transcript) {
    const actionItems = [];
    const segments = transcript.segments || [];

    for (const segment of segments) {
      const text = segment.text.toLowerCase();
      
      // Check if segment contains action keywords
      const hasActionKeyword = this.actionKeywords.some(keyword => 
        text.includes(keyword)
      );

      if (hasActionKeyword) {
        // Extract potential action item
        const action = this._extractActionFromSegment(segment);
        if (action) {
          actionItems.push({
            text: action,
            timestamp: segment.start,
            time: this._formatTime(segment.start),
          });
        }
      }
    }

    // Deduplicate similar action items
    return this._deduplicateItems(actionItems);
  }

  /**
   * Extract decisions from transcript
   */
  _extractDecisions(transcript) {
    const decisions = [];
    const segments = transcript.segments || [];

    for (const segment of segments) {
      const text = segment.text.toLowerCase();
      
      const hasDecisionKeyword = this.decisionKeywords.some(keyword =>
        text.includes(keyword)
      );

      if (hasDecisionKeyword) {
        decisions.push({
          text: segment.text,
          timestamp: segment.start,
          time: this._formatTime(segment.start),
        });
      }
    }

    return this._deduplicateItems(decisions);
  }

  /**
   * Extract questions from transcript
   */
  _extractQuestions(transcript) {
    const questions = [];
    const segments = transcript.segments || [];

    for (const segment of segments) {
      const text = segment.text.trim();
      
      // Check if segment is a question
      if (text.endsWith('?') || this.questionKeywords.some(kw => 
        text.toLowerCase().includes(kw)
      )) {
        questions.push({
          text: segment.text,
          timestamp: segment.start,
          time: this._formatTime(segment.start),
        });
      }
    }

    return questions;
  }

  /**
   * Extract key points (segments with important content)
   */
  _extractKeyPoints(transcript) {
    const segments = transcript.segments || [];
    const keyPoints = [];

    // Simple heuristic: segments longer than average
    const avgLength = segments.reduce((sum, s) => sum + s.text.length, 0) / segments.length;

    for (const segment of segments) {
      if (segment.text.length > avgLength * 1.5) {
        keyPoints.push({
          text: this._truncate(segment.text, 150),
          timestamp: segment.start,
          time: this._formatTime(segment.start),
        });
      }
    }

    // Limit to top 10
    return keyPoints.slice(0, 10);
  }

  /**
   * Extract topics from transcript
   */
  _extractTopics(transcript) {
    // Simple word frequency analysis
    const words = {};
    const segments = transcript.segments || [];

    for (const segment of segments) {
      const text = segment.text.toLowerCase();
      const tokens = text.split(/\s+/).filter(w => w.length > 4); // Words > 4 chars
      
      for (const token of tokens) {
        words[token] = (words[token] || 0) + 1;
      }
    }

    // Get top 5 most frequent words (excluding common words)
    const commonWords = ['that', 'this', 'with', 'from', 'have', 'been', 'will', 'would'];
    const topics = Object.entries(words)
      .filter(([word]) => !commonWords.includes(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return topics;
  }

  /**
   * Extract action item from segment text
   */
  _extractActionFromSegment(segment) {
    const text = segment.text;
    
    // Look for patterns like "will do X", "need to X", "action: X"
    const patterns = [
      /(?:will|should|must|need to)\s+([^.!?]+)/i,
      /action[:\s]+([^.!?]+)/i,
      /todo[:\s]+([^.!?]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: return full text if it's short enough
    if (text.length < 200) {
      return text;
    }

    return null;
  }

  /**
   * Deduplicate similar items
   */
  _deduplicateItems(items) {
    const seen = new Set();
    const unique = [];

    for (const item of items) {
      // Create a simple hash of the text
      const key = item.text.toLowerCase().substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Format notes as Markdown
   */
  _formatMarkdown({ metadata, summary, actionItems, decisions, questions, keyPoints }) {
    let markdown = `# ${metadata.title || 'Meeting Notes'}\n\n`;
    
    markdown += `**Date:** ${metadata.createdAt ? new Date(metadata.createdAt).toLocaleString() : 'N/A'}\n`;
    markdown += `**Duration:** ${metadata.recording?.duration ? this._formatDuration(metadata.recording.duration / 1000) : 'N/A'}\n\n`;
    
    markdown += `---\n\n`;
    markdown += `## Summary\n\n${summary}\n\n`;
    
    if (actionItems.length > 0) {
      markdown += `## Action Items\n\n`;
      for (const item of actionItems) {
        markdown += `- [ ] ${item.text} *[${item.time}]*\n`;
      }
      markdown += `\n`;
    }

    if (decisions.length > 0) {
      markdown += `## Key Decisions\n\n`;
      for (const decision of decisions) {
        markdown += `- ${decision.text} *[${decision.time}]*\n`;
      }
      markdown += `\n`;
    }

    if (questions.length > 0) {
      markdown += `## Questions & Issues\n\n`;
      for (const question of questions.slice(0, 10)) {
        markdown += `- ${question.text} *[${question.time}]*\n`;
      }
      markdown += `\n`;
    }

    if (keyPoints.length > 0) {
      markdown += `## Key Points\n\n`;
      for (const point of keyPoints) {
        markdown += `- ${point.text} *[${point.time}]*\n`;
      }
      markdown += `\n`;
    }

    return markdown;
  }

  /**
   * Generate empty notes template
   */
  _generateEmptyNotes(metadata) {
    return `# ${metadata.title || 'Meeting Notes'}\n\n` +
           `**Date:** ${metadata.createdAt ? new Date(metadata.createdAt).toLocaleString() : 'N/A'}\n\n` +
           `No transcript available.\n`;
  }

  /**
   * Helper methods
   */
  _truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  _formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  _formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

module.exports = NotesGenerator;
