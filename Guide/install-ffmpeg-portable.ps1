# Portable FFmpeg Installation Script
# Downloads and extracts FFmpeg to E:\ffmpeg (no PATH needed)

Write-Host "Downloading FFmpeg portable..." -ForegroundColor Green

$ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$downloadPath = "E:\ffmpeg-download.zip"
$extractPath = "E:\ffmpeg"

# Clean up old download if exists
if (Test-Path $downloadPath) {
    Remove-Item $downloadPath -Force -ErrorAction SilentlyContinue
}

# Create extract directory
if (Test-Path $extractPath) {
    Write-Host "Removing old installation..." -ForegroundColor Yellow
    Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $extractPath -Force | Out-Null

try {
    # Download FFmpeg
    Write-Host "Downloading from $ffmpegUrl..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes (file is ~70 MB)..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $ffmpegUrl -OutFile $downloadPath -UseBasicParsing
    
    # Extract
    Write-Host "Extracting to $extractPath..." -ForegroundColor Yellow
    Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force
    
    # Find the bin folder (it's usually in a subfolder)
    $binPath = Get-ChildItem -Path $extractPath -Recurse -Directory -Filter "bin" | Select-Object -First 1
    
    if ($binPath) {
        Write-Host "`nFFmpeg installed successfully!" -ForegroundColor Green
        Write-Host "Location: $($binPath.FullName)" -ForegroundColor Cyan
        Write-Host "`nTo use it, the app will automatically detect it at:" -ForegroundColor Yellow
        Write-Host "$($binPath.FullName)\ffmpeg.exe" -ForegroundColor Cyan
        Write-Host "`nYou can also add it to PATH if you want:" -ForegroundColor Yellow
        Write-Host "[Environment]::SetEnvironmentVariable('Path', `$env:Path + ';$($binPath.FullName)', 'User')" -ForegroundColor Cyan
    } else {
        Write-Host "Warning: Could not find bin folder. Please extract manually." -ForegroundColor Red
    }
    
    # Cleanup
    Remove-Item $downloadPath -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nManual installation:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor Cyan
    Write-Host "2. Extract to: E:\ffmpeg" -ForegroundColor Cyan
    Write-Host "3. The app will look for: E:\ffmpeg\bin\ffmpeg.exe" -ForegroundColor Cyan
}
