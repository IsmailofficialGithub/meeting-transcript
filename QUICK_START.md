# Quick Start Guide

## Running the Application

### Development Mode (Recommended)
This starts both the Vite dev server and Electron:

```bash
npm run dev
```

This will:
1. Start Vite dev server on http://localhost:5173
2. Wait for the server to be ready
3. Launch Electron app

### If You See a White Screen

**Problem**: The app window is white/blank

**Solutions**:

1. **Make sure you're running in dev mode:**
   ```bash
   npm run dev
   ```
   NOT `npm start` (that's for production)

2. **Check if Vite server is running:**
   - Open http://localhost:5173 in your browser
   - You should see the React app
   - If not, the Vite server isn't running

3. **Start Vite manually if needed:**
   ```bash
   # Terminal 1: Start Vite
   npm run dev:vite
   
   # Terminal 2: Start Electron (after Vite is running)
   npm run dev:electron
   ```

4. **Check the Electron DevTools:**
   - Press `Ctrl+Shift+I` or `F12` in the Electron window
   - Check the Console tab for errors
   - Check the Network tab to see if files are loading

5. **Common Issues:**
   - **Port 5173 already in use**: Kill the process or change port in `vite.config.js`
   - **Module not found**: Run `npm install` again
   - **React errors**: Check browser console in DevTools

### Building for Production

If you want to test the production build:

```bash
# Build the renderer
npm run build:renderer

# Then run Electron
npm start
```

### Troubleshooting

**White screen with no errors:**
- Check Electron DevTools console (F12)
- Verify `src/renderer/main.jsx` exists
- Check that React is rendering correctly

**"Cannot connect to localhost:5173":**
- Vite server isn't running
- Start it with `npm run dev:vite`

**Module resolution errors:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
