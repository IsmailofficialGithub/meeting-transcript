/**
 * Preload Script - Bridge between Main and Renderer
 * 
 * Exposes safe IPC methods to the renderer process.
 * Uses contextBridge for security (context isolation).
 */

const { contextBridge, ipcRenderer } = require('electron');

// Log that preload script is loading
console.log('Preload script loaded');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Device management
  devices: {
    list: () => ipcRenderer.invoke('devices:list'),
    getDefaults: () => ipcRenderer.invoke('devices:get-defaults'),
  },

  // Recording control
  recording: {
    start: (options) => ipcRenderer.invoke('recording:start', options),
    stop: () => ipcRenderer.invoke('recording:stop'),
    pause: () => ipcRenderer.invoke('recording:pause'),
    resume: () => ipcRenderer.invoke('recording:resume'),
    getStatus: () => ipcRenderer.invoke('recording:status'),
    onProgress: (callback) => {
      // Note: For real-time updates, you'd use ipcRenderer.on
      // This is a simplified version
    },
  },

  // Transcription
  transcription: {
    start: (meetingId) => ipcRenderer.invoke('transcription:start', meetingId),
    getStatus: () => ipcRenderer.invoke('transcription:status'),
    get: (meetingId) => ipcRenderer.invoke('transcription:get', meetingId),
  },

  // Meeting management
  meetings: {
    list: () => ipcRenderer.invoke('meetings:list'),
    get: (meetingId) => ipcRenderer.invoke('meetings:get', meetingId),
    delete: (meetingId) => ipcRenderer.invoke('meetings:delete', meetingId),
    deleteAudio: (meetingId) => ipcRenderer.invoke('meetings:deleteAudio', meetingId),
    getFiles: (meetingId) => ipcRenderer.invoke('meetings:get-files', meetingId),
    openFolder: (meetingId) => ipcRenderer.invoke('meetings:openFolder', meetingId),
  },

  // Memory monitoring
  memory: {
    getStats: () => ipcRenderer.invoke('memory:get-stats'),
    getReport: () => ipcRenderer.invoke('memory:get-report'),
  },

  // Cleanup
  cleanup: {
    full: () => ipcRenderer.invoke('cleanup:full'),
  },
});
