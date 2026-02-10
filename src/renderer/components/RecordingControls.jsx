/**
 * Recording Controls Component
 * 
 * Two recording buttons: "Mine" (microphone) and "Yours" (system audio)
 */

import React from 'react';

function RecordingControls({ isRecording, isPaused, recordingMode, onStartMine, onStartYours, onStop, onPause, onResume }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Recording Control
      </h2>

      {!isRecording ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4 text-center">
            Choose what to record:
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Mine Button - Microphone Only */}
            <button
              onClick={onStartMine}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 flex flex-col items-center gap-2"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Mine</span>
              <span className="text-xs opacity-90">Microphone Only</span>
            </button>

            {/* Yours Button - System Audio Only */}
            <button
              onClick={onStartYours}
              className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 flex flex-col items-center gap-2"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Yours</span>
              <span className="text-xs opacity-90">System Audio Only</span>
            </button>
          </div>
        </div>
        ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            {!isPaused ? (
              <button
                onClick={onPause}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pause
              </button>
            ) : (
              <button
                onClick={onResume}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Resume
              </button>
            )}
            <button
              onClick={onStop}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition-colors duration-200 flex items-center gap-2"
            >
              <div className="w-4 h-4 bg-white rounded-sm"></div>
              Stop Recording
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-600">
            {isPaused ? (
              <span className="text-yellow-700 font-semibold">⏸ Paused</span>
            ) : (
              <>
                Recording: <span className="font-semibold">{recordingMode === 'mic' ? 'Mine (Microphone)' : recordingMode === 'system' ? 'Yours (System Audio)' : 'Both'}</span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default RecordingControls;
