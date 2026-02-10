# Troubleshooting White Screen Issue

## Quick Fix

**Run the app in development mode:**
```bash
npm run dev
```

This starts both Vite and Electron together.

## Step-by-Step Debugging

### 1. Check if Vite Server is Running

Open your browser and go to: http://localhost:5173

- **If you see the React app**: Vite is working, the issue is with Electron
- **If you see "Cannot connect"**: Vite isn't running

**Start Vite manually:**
```bash
npm run dev:vite
```

### 2. Check Electron DevTools

In the Electron window:
- Press `F12` or `Ctrl+Shift+I` to open DevTools
- Go to the **Console** tab
- Look for errors (red text)

**Common errors:**
- `electronAPI is not defined` → Preload script issue
- `Failed to load resource` → Vite server not running
- `Module not found` → Missing dependencies

### 3. Verify Preload Script

The preload script should log "Preload script loaded" in the console.

If you don't see this:
- Check that `src/preload/preload.js` exists
- Check the path in `src/main/main.js` (should be `../preload/preload.js`)

### 4. Check React is Loading

In DevTools Console, you should see:
- "Preload script loaded"
- No React errors

If React isn't loading:
- Check `src/renderer/main.jsx` exists
- Check `src/renderer/App.jsx` exists
- Verify Tailwind CSS is configured

### 5. Manual Testing

**Test 1: Vite alone**
```bash
npm run dev:vite
```
Then open http://localhost:5173 in your browser. You should see the app.

**Test 2: Electron with built files**
```bash
npm run build:renderer
npm start
```
This tests the production build.

## Common Issues & Solutions

### Issue: White screen, no errors in console
**Solution**: React might not be mounting. Check:
- Is `div#root` in `index.html`?
- Is `main.jsx` importing correctly?
- Are there any silent JavaScript errors?

### Issue: "Cannot connect to localhost:5173"
**Solution**: 
1. Start Vite: `npm run dev:vite`
2. Wait for "Local: http://localhost:5173" message
3. Then start Electron: `npm run dev:electron`

### Issue: "electronAPI is not defined"
**Solution**: Preload script isn't loading. Check:
1. Preload path in `main.js` is correct
2. `contextIsolation: true` is set
3. `nodeIntegration: false` is set
4. Check console for preload errors

### Issue: Port 5173 already in use
**Solution**: 
```bash
# Find and kill the process
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or change port in vite.config.js
```

## Still Not Working?

1. **Clear everything and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node version:**
   ```bash
   node --version  # Should be 18+
   ```

3. **Check all files exist:**
   - `src/main/main.js`
   - `src/preload/preload.js`
   - `src/renderer/main.jsx`
   - `src/renderer/App.jsx`
   - `src/renderer/index.html`

4. **Check Electron version:**
   ```bash
   npx electron --version
   ```

## Getting Help

If still stuck, check the Electron DevTools console and share:
- Any error messages
- Console logs
- Network tab (if files aren't loading)
