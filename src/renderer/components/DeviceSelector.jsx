/**
 * Device Selector Component
 * 
 * Allows user to select microphone and system audio devices.
 */

import React from 'react';

function DeviceSelector({ devices, selectedDevices, onDeviceChange, onRefresh }) {
  const handleMicChange = (e) => {
    onDeviceChange({
      ...selectedDevices,
      mic: e.target.value || null,
    });
  };

  const handleLoopbackChange = (e) => {
    onDeviceChange({
      ...selectedDevices,
      loopback: e.target.value || null,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Audio Devices
        </h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {/* Microphone Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Microphone
          </label>
          <select
            value={selectedDevices.mic || ''}
            onChange={handleMicChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select microphone...</option>
            {devices.microphones?.map((device, index) => (
              <option key={index} value={device.name}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        {/* System Audio Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            System Audio (Loopback)
          </label>
          <select
            value={selectedDevices.loopback || ''}
            onChange={handleLoopbackChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select system audio...</option>
            {devices.loopbacks?.map((device, index) => {
              const isStereoMix = device.name.toLowerCase().includes('stereo mix');
              const isCable = device.name.toLowerCase().includes('cable');
              return (
                <option key={index} value={device.name}>
                  {device.name} {isStereoMix ? '⭐ Recommended' : ''} {isCable ? '⚠️ Needs routing' : ''}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Captures Zoom/Meet audio from headphones/speakers
          </p>
          
          {devices.loopbacks?.length === 0 && (
            <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 text-sm">
              <p className="font-semibold text-red-800">Cannot capture system audio!</p>
              <p className="text-red-700 mt-2">Quick fix (30 seconds):</p>
              <ol className="text-red-700 mt-1 ml-4 list-decimal text-xs space-y-1">
                <li>Right-click speaker 🔊 → Sounds → Recording</li>
                <li>Right-click empty area → Show Disabled Devices</li>
                <li>Right-click "Stereo Mix" → Enable</li>
                <li>Click Refresh button above</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {devices.microphones?.length === 0 && devices.loopbacks?.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 font-semibold mb-2">
            No audio devices found
          </p>
          <p className="text-sm text-yellow-700 mb-2">
            This usually means FFmpeg is not installed or not in your system PATH.
          </p>
          <p className="text-xs text-yellow-600">
            Please install FFmpeg and add it to your PATH, then restart the app.
            See FFMPEG_SETUP.md for instructions.
          </p>
        </div>
      )}
    </div>
  );
}

export default DeviceSelector;
