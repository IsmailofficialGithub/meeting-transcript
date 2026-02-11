# Quick Whisper Installation Script
# Installs Whisper in the virtual environment on E: drive

Write-Host "Installing Whisper in virtual environment..." -ForegroundColor Green
Write-Host "This will download PyTorch (~2-3 GB) to E: drive" -ForegroundColor Yellow
Write-Host ""

$venvPython = "E:\whisper-env\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Virtual environment not found. Creating it..." -ForegroundColor Yellow
    python -m venv E:\whisper-env
}

Write-Host "Installing Whisper (this may take 10-15 minutes)..." -ForegroundColor Cyan
& $venvPython -m pip install openai-whisper

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nWhisper installed successfully!" -ForegroundColor Green
    Write-Host "Testing installation..." -ForegroundColor Yellow
    & $venvPython -c "import whisper; print('Whisper version:', getattr(whisper, '__version__', 'installed'))"
    Write-Host "`nDone! Restart the Meeting Note app to use Whisper." -ForegroundColor Green
} else {
    Write-Host "`nInstallation failed. Check error messages above." -ForegroundColor Red
    Write-Host "You may need to free up space on E: drive." -ForegroundColor Yellow
}
