# Groq Whisper API Setup (Optional - Online Mode)

## Overview

Groq API provides **fast** Whisper transcription (much faster than local Whisper).
This is an **OPTIONAL** feature that requires internet connection.

**Trade-offs:**
- ✅ **Much faster** (seconds vs minutes for long recordings)
- ✅ **Parallel processing** (process multiple chunks simultaneously)
- ✅ **No local model download** (saves disk space)
- ❌ **Requires internet** (violates 100% offline requirement)
- ❌ **Audio sent to cloud** (privacy concern)
- ❌ **API costs** (though Groq is very affordable)

## Setup

### 1. Get Groq API Keys

1. Go to: https://console.groq.com/
2. Create account (free tier available)
3. Generate API keys (you can create multiple)
4. Copy your API keys

### 2. Configure in App

Add API keys to the app configuration. You can:

**Option A: Environment Variables**
```powershell
$env:GROQ_API_KEYS='key1,key2,key3,key4,key5,key6,key7,key8,key9,key10'
```

**Option B: Config File** (we'll create this)
Create `config.json`:
```json
{
  "groq": {
    "enabled": true,
    "apiKeys": [
      "gsk_...",
      "gsk_...",
      "gsk_..."
    ],
    "maxConcurrent": 5
  }
}
```

## How It Works

1. **Audio Split**: Audio is split into 60-second chunks (same as local)
2. **Parallel Processing**: Up to 5 chunks sent simultaneously to different API keys
3. **Load Balancing**: API keys rotated round-robin
4. **Automatic Retry**: If one API fails/rate-limited, uses next key
5. **Merge Results**: All chunks merged with corrected timestamps

## Example: 10-Minute Recording

- **Local Whisper**: ~10-15 minutes (sequential, 1 chunk at a time)
- **Groq (10 APIs)**: ~1-2 minutes (parallel, 5 chunks at a time)

## Rate Limits

Groq free tier: ~30 requests/minute per key
- With 10 keys: ~300 requests/minute total
- 10-minute recording = 10 chunks
- Can process all 10 chunks in parallel (well within limits)

## Fallback

If all Groq APIs fail, the app can fall back to local Whisper (if installed).

## Privacy Note

⚠️ **Audio is sent to Groq servers** - not 100% offline/private.
Use only if speed > privacy for your use case.
