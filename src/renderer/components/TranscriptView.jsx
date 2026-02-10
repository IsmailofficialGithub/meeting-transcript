/**
 * Transcript View Component
 * 
 * Displays meeting transcript with timestamps.
 */

import React from 'react';

function TranscriptView({ transcript }) {
  if (!transcript) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Transcript
        </h2>
        <p className="text-gray-500 text-center py-8">
          No transcript available. Start a recording and transcribe to see results.
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          Note: Whisper must be installed for transcription. See INSTALL_WHISPER.md
        </p>
      </div>
    );
  }

  // Check if transcript is empty
  const isEmpty = !transcript.text || transcript.text.trim().length === 0 || 
                  !transcript.segments || transcript.segments.length === 0;
  
  if (isEmpty) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Transcript
        </h2>
        <div className="text-center py-8">
          <p className="text-yellow-600 mb-2">
            Transcript is empty or transcription failed.
          </p>
          <p className="text-sm text-gray-500 mb-2">
            Language detected: {transcript.language || 'unknown'}
          </p>
          <p className="text-xs text-gray-400">
            This usually means Whisper couldn't process the audio or no speech was detected.
            Check the console logs for details.
          </p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Transcript
        </h2>
        {transcript.segments && (
          <span className="text-sm text-gray-500">
            {transcript.segments.length} segments
          </span>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {transcript.segments && transcript.segments.length > 0 ? (
          transcript.segments.map((segment, index) => (
            <div
              key={index}
              className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 font-mono mt-1">
                  {formatTime(segment.start)}
                </span>
                <p className="text-gray-800 flex-1">{segment.text}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-600 whitespace-pre-wrap">{transcript.text}</p>
        )}
      </div>

      {transcript.language && (
        <p className="mt-4 text-xs text-gray-500">
          Detected language: {transcript.language}
        </p>
      )}
    </div>
  );
}

export default TranscriptView;
