/**
 * Meetings List Component
 * 
 * Displays all past meetings in a tabbed interface with metadata and actions.
 */

import React, { useState, useEffect } from 'react';

function MeetingsList({ onSelectMeeting }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'completed', 'recording', 'error'

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.meetings.list();
      if (result.success) {
        setMeetings(result.meetings || []);
      } else {
        console.error('Failed to load meetings:', result.error);
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (meetingId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this meeting? This cannot be undone.')) {
      return;
    }

    try {
      const result = await window.electronAPI.meetings.delete(meetingId);
      if (result.success) {
        await loadMeetings(); // Refresh list
        if (selectedMeeting?.id === meetingId) {
          setSelectedMeeting(null);
        }
      } else {
        alert(`Failed to delete meeting: ${result.error}`);
      }
    } catch (error) {
      alert(`Error deleting meeting: ${error.message}`);
    }
  };

  const handleOpenFolder = async (meetingId, e) => {
    e.stopPropagation();
    try {
      await window.electronAPI.meetings.openFolder(meetingId);
    } catch (error) {
      alert(`Error opening folder: ${error.message}`);
    }
  };

  const handleViewTranscript = async (meetingId, e) => {
    e.stopPropagation();
    try {
      const result = await window.electronAPI.transcription.get(meetingId);
      if (result.success && result.transcript) {
        if (onSelectMeeting) {
          onSelectMeeting({ id: meetingId, transcript: result.transcript });
        }
      } else {
        alert('No transcript available for this meeting.');
      }
    } catch (error) {
      alert(`Error loading transcript: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'recording': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter meetings by tab
  const filteredMeetings = meetings.filter(meeting => {
    if (activeTab === 'all') return true;
    return meeting.status === activeTab;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading meetings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1 px-4 pt-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'all'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'completed'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed ({meetings.filter(m => m.status === 'completed').length})
          </button>
          <button
            onClick={() => setActiveTab('processing')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'processing'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Processing ({meetings.filter(m => m.status === 'processing').length})
          </button>
          <button
            onClick={() => setActiveTab('error')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'error'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Errors ({meetings.filter(m => m.status === 'error').length})
          </button>
        </div>
      </div>

      {/* Meetings List */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {filteredMeetings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No meetings found</p>
        ) : (
          <div className="space-y-3">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting.id === selectedMeeting?.id ? null : meeting)}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedMeeting?.id === meeting.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {meeting.title || `Meeting ${meeting.id.substring(0, 20)}...`}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(meeting.createdAt)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(meeting.status)}`}>
                    {meeting.status}
                  </span>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Duration:</span> {formatDuration(meeting.recording?.duration)}
                  </div>
                  <div>
                    <span className="font-medium">Mode:</span>{' '}
                    {meeting.devices?.microphone && meeting.devices?.loopback ? 'Both' :
                     meeting.devices?.microphone ? 'Mine' :
                     meeting.devices?.loopback ? 'Yours' : 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">Transcript:</span>{' '}
                    {meeting.results?.hasTranscript ? '✓ Yes' : '✗ No'}
                  </div>
                  <div>
                    <span className="font-medium">Notes:</span>{' '}
                    {meeting.results?.hasNotes ? '✓ Yes' : '✗ No'}
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedMeeting?.id === meeting.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-1">Devices:</p>
                      <ul className="text-gray-600 space-y-1 ml-4">
                        {meeting.devices?.microphone && (
                          <li>• Microphone: {meeting.devices.microphone}</li>
                        )}
                        {meeting.devices?.loopback && (
                          <li>• System Audio: {meeting.devices.loopback}</li>
                        )}
                      </ul>
                    </div>

                    {meeting.processing?.transcriptionStatus && (
                      <div className="text-sm">
                        <p className="font-medium text-gray-700 mb-1">Transcription:</p>
                        <p className="text-gray-600 ml-4">
                          Status: {meeting.processing.transcriptionStatus}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {meeting.results?.hasTranscript && (
                        <button
                          onClick={(e) => handleViewTranscript(meeting.id, e)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        >
                          View Transcript
                        </button>
                      )}
                      <button
                        onClick={(e) => handleOpenFolder(meeting.id, e)}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                      >
                        Open Folder
                      </button>
                      <button
                        onClick={(e) => handleDelete(meeting.id, e)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingsList;
