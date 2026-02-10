/**
 * Meeting Timer Component
 * 
 * Displays elapsed recording time.
 */

import React from 'react';

function MeetingTimer({ isRecording, seconds }) {
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Recording Time
      </h2>

      <div className="text-center">
        <div
          className={`text-5xl font-mono font-bold ${
            isRecording ? 'text-red-600' : 'text-gray-400'
          }`}
        >
          {formatTime(seconds)}
        </div>
        {isRecording && (
          <p className="mt-2 text-sm text-gray-600">
            Recording in progress
          </p>
        )}
      </div>
    </div>
  );
}

export default MeetingTimer;
