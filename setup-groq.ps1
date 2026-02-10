# Groq API Setup Script
# Configures Groq Whisper API for fast transcription

Write-Host "=== Groq Whisper API Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if config.json exists
$configPath = "config.json"
$config = @{}

if (Test-Path $configPath) {
    Write-Host "Found existing config.json, loading..." -ForegroundColor Yellow
    try {
        $config = Get-Content $configPath | ConvertFrom-Json | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    } catch {
        Write-Host "Error reading config.json, creating new one..." -ForegroundColor Red
        $config = @{}
    }
} else {
    Write-Host "Creating new config.json..." -ForegroundColor Green
}

# Initialize Groq config if not exists
if (-not $config.groq) {
    $config.groq = @{
        enabled = $false
        apiKeys = @()
        maxConcurrent = 5
    }
}

# Get API keys
Write-Host ""
Write-Host "Enter your Groq API keys (one per line, press Enter twice when done):" -ForegroundColor Cyan
Write-Host "You can get API keys from: https://console.groq.com/" -ForegroundColor Gray
Write-Host ""

$apiKeys = @()
$keyCount = 0

while ($true) {
    $key = Read-Host "API Key $($keyCount + 1) (or press Enter to finish)"
    if ([string]::IsNullOrWhiteSpace($key)) {
        if ($keyCount -eq 0) {
            Write-Host "No API keys provided. Groq will be disabled." -ForegroundColor Yellow
            $config.groq.enabled = $false
            break
        } else {
            break
        }
    }
    
    if ($key -match '^gsk_') {
        $apiKeys += $key
        $keyCount++
        Write-Host "✓ Added API key $keyCount" -ForegroundColor Green
    } else {
        Write-Host "⚠ Warning: API key doesn't start with 'gsk_'. Adding anyway..." -ForegroundColor Yellow
        $apiKeys += $key
        $keyCount++
    }
}

if ($apiKeys.Count -gt 0) {
    $config.groq.apiKeys = $apiKeys
    $config.groq.enabled = $true
    
    Write-Host ""
    Write-Host "✓ Configured $($apiKeys.Count) API keys" -ForegroundColor Green
    
    # Ask about concurrent processing
    Write-Host ""
    $concurrent = Read-Host "Max concurrent chunks (default: 5, recommended: 3-10)"
    if ([string]::IsNullOrWhiteSpace($concurrent)) {
        $concurrent = 5
    } else {
        $concurrent = [int]$concurrent
    }
    $config.groq.maxConcurrent = $concurrent
    
    Write-Host ""
    Write-Host "=== Configuration Summary ===" -ForegroundColor Cyan
    Write-Host "Groq Enabled: $($config.groq.enabled)" -ForegroundColor $(if ($config.groq.enabled) { "Green" } else { "Red" })
    Write-Host "API Keys: $($config.groq.apiKeys.Count)" -ForegroundColor Green
    Write-Host "Max Concurrent: $($config.groq.maxConcurrent)" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Groq API disabled. Local Whisper will be used (offline mode)." -ForegroundColor Yellow
}

# Save config
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath
Write-Host "✓ Configuration saved to config.json" -ForegroundColor Green
Write-Host ""
Write-Host "Restart the app to apply changes." -ForegroundColor Cyan
