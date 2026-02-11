# Test if Stereo Mix can hear your audio
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  STEREO MIX AUDIO TEST" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Check Stereo Mix Levels" -ForegroundColor Green
Write-Host "Opening Sound Settings..." -ForegroundColor White
Start-Process "control.exe" -ArgumentList "mmsys.cpl"

Write-Host ""
Write-Host "In the Sound window:" -ForegroundColor White
Write-Host ""
Write-Host "1. Go to 'Recording' tab" -ForegroundColor Yellow
Write-Host "2. Find 'Stereo Mix'" -ForegroundColor Yellow
Write-Host "3. Right-click → Properties → Levels tab" -ForegroundColor Yellow
Write-Host "4. Set volume to 100" -ForegroundColor Yellow
Write-Host "5. Click OK" -ForegroundColor Yellow
Write-Host ""
Write-Host "6. Play YouTube music NOW" -ForegroundColor Green
Write-Host "7. Watch the GREEN BARS next to Stereo Mix" -ForegroundColor Green
Write-Host ""
Write-Host "   ✅ If bars move up/down = Stereo Mix CAN hear it!" -ForegroundColor Green
Write-Host "   ❌ If bars stay flat = Stereo Mix CANNOT hear it" -ForegroundColor Red
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "If bars DON'T move:" -ForegroundColor Red
Write-Host "• Go to Playback tab" -ForegroundColor Yellow
Write-Host "• Check which device is DEFAULT (green checkmark)" -ForegroundColor Yellow
Write-Host "• Stereo Mix only captures from the DEFAULT device" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Enter to close..." -ForegroundColor Gray
Read-Host
