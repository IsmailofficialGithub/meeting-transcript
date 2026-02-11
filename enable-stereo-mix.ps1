# Enable Stereo Mix for System Audio Capture
# Run this script as Administrator

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ENABLE STEREO MIX (System Audio Capture)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Opening Windows Sound Settings..." -ForegroundColor Green
Write-Host ""
Write-Host "In the Sound window:" -ForegroundColor White
Write-Host "  1. Go to 'Recording' tab" -ForegroundColor Yellow
Write-Host "  2. Right-click empty space → 'Show Disabled Devices'" -ForegroundColor Yellow
Write-Host "  3. Right-click 'Stereo Mix' → 'Enable'" -ForegroundColor Yellow
Write-Host "  4. Click 'OK'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then restart the app and click 'Refresh'" -ForegroundColor Green
Write-Host ""

# Open Sound Control Panel
Start-Process "control.exe" -ArgumentList "mmsys.cpl"

Write-Host "Sound settings opened!" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter to close this window..." -ForegroundColor Gray
Read-Host
