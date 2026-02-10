/**
 * React Entry Point
 * 
 * Main React application entry point.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';

// Check if electronAPI is available
if (!window.electronAPI) {
  console.error('electronAPI not found. Preload script may not be loaded.');
  document.getElementById('root').innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h1 style="color: #ef4444;">Error: electronAPI not available</h1>
      <p>Please check that the preload script is configured correctly.</p>
      <p>Check the Electron DevTools console for more details.</p>
    </div>
  `;
} else {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
