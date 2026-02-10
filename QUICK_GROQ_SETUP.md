# Quick Groq API Setup Guide

## Why Groq?

- ⚡ **10x faster** than local Whisper
- 🔄 **Parallel processing** - process multiple chunks simultaneously
- 🔑 **API rotation** - distribute load across multiple keys
- 💰 **Free tier available** - very affordable

## Setup Steps

### 1. Get Groq API Keys

1. Go to: https://console.groq.com/
2. Sign up (free account)
3. Go to API Keys section
4. Create multiple API keys (you can create up to 10)
5. Copy all your API keys

### 2. Configure the App

**Option A: Use Setup Script (Recommended)**
```powershell
.\setup-groq.ps1
```

The script will:
- Ask for your API keys
- Configure concurrent processing
- Save to `config.json`

**Option B: Manual Configuration**

1. Copy `config.example.json` to `config.json`:
   ```powershell
   Copy-Item config.example.json config.json
   ```

2. Edit `config.json`:
   ```json
   {
     "groq": {
       "enabled": true,
       "apiKeys": [
         "gsk_your_key_1",
         "gsk_your_key_2",
         "gsk_your_key_3",
         "... add up to 10 keys"
       ],
       "maxConcurrent": 5
     }
   }
   ```

**Option C: Environment Variable**
```powershell
$env:GROQ_API_KEYS='key1,key2,key3,key4,key5'
```

### 3. Install Dependencies

```powershell
npm install
```

### 4. Restart the App

The app will automatically:
- ✅ Use Groq if enabled and keys are configured
- ✅ Fall back to local Whisper if Groq fails
- ✅ Rotate through your API keys
- ✅ Process chunks in parallel

## How It Works

### Example: 10-Minute Recording

**Local Whisper (Sequential):**
```
Chunk 1 → wait → Chunk 2 → wait → Chunk 3 → ...
Time: ~10-15 minutes
```

**Groq (Parallel with 10 APIs):**
```
Chunk 1 → API Key 1 ┐
Chunk 2 → API Key 2 ├─ Process simultaneously
Chunk 3 → API Key 3 ├─ (5 at a time)
Chunk 4 → API Key 4 ┘
Chunk 5 → API Key 5 ┐
... (next batch)    ┘
Time: ~1-2 minutes
```

### API Rotation

The system automatically:
- Rotates through your API keys (round-robin)
- Retries with next key if one fails
- Handles rate limits automatically
- Processes chunks in parallel (configurable, default: 5)

## Configuration Options

```json
{
  "groq": {
    "enabled": true,              // Enable/disable Groq
    "apiKeys": ["key1", "key2"],  // Array of API keys
    "maxConcurrent": 5            // Max chunks processed simultaneously
  }
}
```

## Troubleshooting

### "No API keys configured"
- Make sure `config.json` exists and has `groq.apiKeys` array
- Or set `GROQ_API_KEYS` environment variable

### "Rate limited"
- Add more API keys (distributes load)
- Reduce `maxConcurrent` value
- Groq free tier: ~30 requests/minute per key

### "Transcription failed"
- Check internet connection
- Verify API keys are valid
- Check Groq console for usage/quota
- System will fall back to local Whisper if all APIs fail

## Privacy Note

⚠️ **Audio is sent to Groq servers** - not 100% offline/private.
Use only if speed > privacy for your use case.

For 100% offline, use local Whisper (see `INSTALL_WHISPER.md`).
