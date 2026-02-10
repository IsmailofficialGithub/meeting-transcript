/**
 * Main App Component
 * 
 * Root component that manages application state and layout.
 */

import React, { useState, useEffect } from 'react';
import RecordingControls from './components/RecordingControls';
import DeviceSelector from './components/DeviceSelector';
import MeetingTimer from './components/MeetingTimer';
import TranscriptView from './components/TranscriptView';
import MeetingsList from './components/MeetingsList';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingMode, setRecordingMode] = useState(null); // 'mic' or 'system'
  const [recordingTime, setRecordingTime] = useState(0);
  const [devices, setDevices] = useState({ microphones: [], loopbacks: [] });
  const [selectedDevices, setSelectedDevices] = useState({ mic: null, loopback: null });
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [deviceError, setDeviceError] = useState(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState(null); // 'processing', 'success', 'error'

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  // Update timer when recording (but not when paused)
  useEffect(() => {
    let interval = null;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const loadDevices = async () => {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI is not available. Check preload script.');
      return;
    }

    try {
      const result = await window.electronAPI.devices.list();
      if (result.success) {
        setDevices(result.devices);
        setDeviceError(null);
        
        // Set defaults
        const defaults = await window.electronAPI.devices.getDefaults();
        if (defaults.success) {
          setSelectedDevices({
            mic: defaults.defaults.microphone?.name || null,
            loopback: defaults.defaults.loopback?.name || null,
          });
        }
      } else {
        setDeviceError(result.error || 'Failed to load devices');
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      setDeviceError(error.message || 'Failed to load devices');
    }
  };

  const handleStartRecordingMine = async () => {
    if (!selectedDevices.mic) {
      alert('Please select a microphone device');
      return;
    }

    const result = await window.electronAPI.recording.start({
      mode: 'mic', // Microphone only
      micDevice: selectedDevices.mic,
      loopbackDevice: null, // Not needed for mic-only
    });

    if (result.success) {
      setIsRecording(true);
      setRecordingMode('mic');
      setRecordingTime(0);
      setCurrentMeeting(result.meeting);
    } else {
      alert(`Failed to start recording: ${result.error}`);
    }
  };

  const handleStartRecordingYours = async () => {
    if (!selectedDevices.loopback) {
      alert('Please select a system audio (loopback) device');
      return;
    }

    const result = await window.electronAPI.recording.start({
      mode: 'system', // System audio only
      micDevice: null, // Not needed for system-only
      loopbackDevice: selectedDevices.loopback,
    });

    if (result.success) {
      setIsRecording(true);
      setRecordingMode('system');
      setRecordingTime(0);
      setCurrentMeeting(result.meeting);
    } else {
      alert(`Failed to start recording: ${result.error}`);
    }
  };

  const handlePauseRecording = async () => {
    try {
      const result = await window.electronAPI.recording.pause();
      if (result.success) {
        setIsPaused(true);
      } else {
        alert(`Failed to pause recording: ${result.error}`);
      }
    } catch (error) {
      alert(`Error pausing recording: ${error.message}`);
    }
  };

  const handleResumeRecording = async () => {
    try {
      const result = await window.electronAPI.recording.resume();
      if (result.success) {
        setIsPaused(false);
      } else {
        alert(`Failed to resume recording: ${result.error}`);
      }
    } catch (error) {
      alert(`Error resuming recording: ${error.message}`);
    }
  };

  const handleStopRecording = async () => {
    console.log('[App] Stop button clicked');
    
    // Immediately update UI to prevent double-clicks
    setIsRecording(false);
    setIsPaused(false);
    
    try {
      const result = await window.electronAPI.recording.stop();
      console.log('[App] Stop result:', result);
      
      if (!result.success) {
        console.error('[App] Stop failed:', result.error);
        alert(`Failed to stop recording: ${result.error}`);
        return;
      }
      
      setRecordingMode(null);
      
      // Start transcription automatically
      if (currentMeeting) {
        console.log('Starting transcription for meeting:', currentMeeting.id);
        setTranscriptionStatus('processing');
        try {
          const transResult = await window.electronAPI.transcription.start(currentMeeting.id);
          if (transResult.success) {
            console.log('Transcription successful', {
              language: transResult.transcript?.language,
              segmentCount: transResult.transcript?.segments?.length,
              textLength: transResult.transcript?.text?.length
            });
            setTranscript(transResult.transcript);
            setTranscriptionStatus('success');
            
            // Check if transcript is actually empty or just "Thank you" (Whisper's silence response)
            const text = transResult.transcript?.text?.trim() || '';
            if (text.length === 0 || text.toLowerCase() === 'thank you.' || text.toLowerCase() === 'thank you') {
              setTranscriptionStatus('error');
              console.error('[App] ⚠️ SILENT AUDIO DETECTED - Transcript:', text);
              alert('⚠️ NO AUDIO DETECTED\n\n' +
                    'Recording is silent. Enable "Stereo Mix" (1 minute setup):\n\n' +
                    '1. Right-click speaker icon → Sounds → Recording tab\n' +
                    '2. Right-click empty space → Show Disabled Devices\n' +
                    '3. Find "Stereo Mix" → Right-click → Enable\n' +
                    '4. Restart app, select Stereo Mix\n\n' +
                    'Then Zoom audio captures automatically (works with headphones)!');
            } else {
              // Auto-delete audio file if enabled (user only wants transcript)
              if (autoDeleteAudio && currentMeeting?.id) {
                console.log('[App] Auto-deleting audio file (keeping transcript)...');
                try {
                  await window.electronAPI.meetings.deleteAudio(currentMeeting.id);
                  console.log('[App] Audio file deleted, transcript kept');
                } catch (error) {
                  console.warn('[App] Failed to auto-delete audio:', error);
                }
              }
            }
          } else {
            console.error('Transcription failed:', transResult.error);
            setTranscriptionStatus('error');
            alert(`Transcription failed: ${transResult.error}`);
          }
        } catch (error) {
          console.error('Transcription error:', error);
          setTranscriptionStatus('error');
          alert(`Transcription error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('[App] Error stopping recording:', error);
      alert(`Error stopping recording: ${error.message}`);
    }
  };

  const handleSelectMeeting = (meetingData) => {
    if (meetingData.transcript) {
      setTranscript(meetingData.transcript);
      setTranscriptionStatus('success');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Meeting Note - Offline Recorder
        </h1>

        {deviceError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-semibold mb-1">Device Error</p>
            <p className="text-sm text-red-700">{deviceError}</p>
            {deviceError.includes('FFmpeg') && (
              <p className="text-xs text-red-600 mt-2">
                See FFMPEG_SETUP.md for installation instructions.
              </p>
            )}
          </div>
        )}

        {/* Tabs for Main View and Meetings List */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-1">
            <button
              className="px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600"
            >
              Record
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Controls */}
          <div className="space-y-6">
                <DeviceSelector
                  devices={devices}
                  selectedDevices={selectedDevices}
                  onDeviceChange={setSelectedDevices}
                  onRefresh={loadDevices}
                />

                {/* Auto-delete Audio Option */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDeleteAudio}
                      onChange={(e) => setAutoDeleteAudio(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Auto-delete audio after transcription (keep transcript only)
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    ✓ Saves disk space • ✓ Only keeps text transcript • ✓ Audio captured temporarily
                  </p>
                </div>

                <RecordingControls
              isRecording={isRecording}
              isPaused={isPaused}
              recordingMode={recordingMode}
              onStartMine={handleStartRecordingMine}
              onStartYours={handleStartRecordingYours}
              onStop={handleStopRecording}
              onPause={handlePauseRecording}
              onResume={handleResumeRecording}
            />

            <MeetingTimer
              isRecording={isRecording}
              seconds={recordingTime}
            />
          </div>

          {/* Right Column: Transcript */}
          <div>
            {transcriptionStatus === 'processing' && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="animate-pulse">●</span> Transcribing audio... This may take a few minutes.
                </p>
              </div>
            )}
            <TranscriptView transcript={transcript} />
          </div>
        </div>

        {/* Meetings List Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Past Meetings</h2>
          <MeetingsList onSelectMeeting={handleSelectMeeting} />
        </div>
      </div>
    </div>
  );
}

export default App;
