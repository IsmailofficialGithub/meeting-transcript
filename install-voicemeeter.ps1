# Install VoiceMeeter - Captures ALL App Audio (Including Zoom)
# This is the ONLY reliable way to capture Zoom audio

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  VOICEMEETER - UNIVERSAL AUDIO CAPTURE" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "VoiceMeeter will:" -ForegroundColor Green
Write-Host "  ✓ Capture Zoom audio" -ForegroundColor Green
Write-Host "  ✓ Capture Discord audio" -ForegroundColor Green
Write-Host "  ✓ Capture ALL apps (no exceptions)" -ForegroundColor Green
Write-Host "  ✓ Still let you hear audio normally" -ForegroundColor Green
Write-Host ""

Write-Host "STEP 1: Download VoiceMeeter" -ForegroundColor Yellow
Write-Host "Opening download page..." -ForegroundColor White
Start-Process "https://vb-audio.com/Voicemeeter/index.htm"

Write-Host ""
Write-Host "STEP 2: Install VoiceMeeter" -ForegroundColor Yellow
Write-Host "  1. Click 'Download' (blue button)" -ForegroundColor White
Write-Host "  2. Run the installer" -ForegroundColor White
Write-Host "  3. Click 'Install'" -ForegroundColor White
Write-Host "  4. Restart computer when asked" -ForegroundColor White
Write-Host ""

Write-Host "STEP 3: Setup (after restart)" -ForegroundColor Yellow
Write-Host "  1. Open VoiceMeeter" -ForegroundColor White
Write-Host "  2. Right-click speaker icon → Sounds" -ForegroundColor White
Write-Host "  3. Playback tab → Set 'VoiceMeeter Input' as Default" -ForegroundColor White
Write-Host "  4. In VoiceMeeter: A1 → Select your speakers" -ForegroundColor White
Write-Host ""

Write-Host "STEP 4: Use the App" -ForegroundColor Yellow
Write-Host "  1. Restart the meeting app" -ForegroundColor White
Write-Host "  2. Click 'Refresh' to see new devices" -ForegroundColor White
Write-Host "  3. Select 'VoiceMeeter Output'" -ForegroundColor White
Write-Host "  4. Join Zoom, click 'Yours'" -ForegroundColor White
Write-Host "  5. Get transcript!" -ForegroundColor Green
Write-Host ""

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "This WILL work. No more 'Thank you' transcripts." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press Enter after you install VoiceMeeter..." -ForegroundColor Gray
Read-Host
