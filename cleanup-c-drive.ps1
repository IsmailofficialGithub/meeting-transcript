# Quick cleanup script for C: drive
# Run as Administrator for best results

Write-Host "Checking C: drive space..."
$drive = Get-PSDrive C
$freeGB = [math]::Round($drive.Free / 1GB, 2)
Write-Host "Current free space: $freeGB GB"

Write-Host "`nCleaning Windows temp files..."
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`nCleaning pip cache..."
python -m pip cache purge

Write-Host "`nCleaning npm cache (if exists)..."
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm cache clean --force
}

Write-Host "`nRunning Windows Disk Cleanup..."
# This requires admin rights
# cleanmgr /d C: /verylowdisk

Write-Host "`nDone! Check free space again:"
$drive = Get-PSDrive C
$freeGB = [math]::Round($drive.Free / 1GB, 2)
Write-Host "New free space: $freeGB GB"
