# 🚀 Quick Start Guide - Groq API Setup

## Step 1: Get Groq API Keys

1. **Go to Groq Console**: https://console.groq.com/
2. **Sign up** (free account available)
3. **Navigate to API Keys** section
4. **Create API keys** (you can create multiple - up to 10 recommended)
5. **Copy all your API keys** (they start with `gsk_`)

## Step 2: Run Setup Script

Open PowerShell in this directory and run:

```powershell
.\setup-groq.ps1
```

The script will:
- Ask you to enter your API keys (one per line)
- Configure concurrent processing settings
- Save everything to `config.json`
- Show you a summary

**Example:**
```
Enter your Groq API keys (one per line, press Enter twice when done):
API Key 1: gsk_abc123...
✓ Added API key 1
API Key 2: gsk_def456...
✓ Added API key 2
API Key 3: [Press Enter to finish]
```

## Step 3: Install Dependencies

```powershell
npm install
```

This installs the `form-data` package needed for Groq API.

## Step 4: Restart the App

Close and restart your Electron app. The app will automatically:
- ✅ Detect Groq configuration
- ✅ Use Groq APIs for transcription
- ✅ Rotate through your API keys
- ✅ Process chunks in parallel

## Step 5: Test It!

1. **Start a recording** (click "Start Recording")
2. **Record for 10-30 seconds** (say something)
3. **Stop recording**
4. **Watch the magic** - transcription should complete in seconds!

## What Happens Behind the Scenes

### With Groq (Fast):
```
Recording: 10 minutes
↓
Split into chunks: 10 chunks (60s each)
↓
Parallel processing: 5 chunks → Groq API simultaneously
↓
Result: ~1-2 minutes total
```

### Without Groq (Slow):
```
Recording: 10 minutes
↓
Split into chunks: 10 chunks (60s each)
↓
Sequential processing: Chunk 1 → wait → Chunk 2 → wait → ...
↓
Result: ~10-15 minutes total
```

## Troubleshooting

### "No API keys configured"
- Make sure `config.json` exists in the project root
- Check that `groq.enabled` is `true`
- Verify `groq.apiKeys` array has your keys

### "Rate limited"
- Add more API keys (distributes load)
- Reduce `maxConcurrent` in config (default: 5)
- Groq free tier: ~30 requests/minute per key

### "Transcription failed"
- Check internet connection
- Verify API keys are valid at https://console.groq.com/
- Check Groq console for quota/usage limits
- System will fall back to local Whisper if all APIs fail

## Configuration File

After running setup, your `config.json` will look like:

```json
{
  "groq": {
    "enabled": true,
    "apiKeys": [
      "gsk_your_key_1",
      "gsk_your_key_2",
      "gsk_your_key_3"
    ],
    "maxConcurrent": 5
  }
}
```

## Manual Configuration (Alternative)

If you prefer to edit manually:

1. Copy `config.example.json` to `config.json`:
   ```powershell
   Copy-Item config.example.json config.json
   ```

2. Edit `config.json` with your API keys

3. Restart the app

## Environment Variable (Alternative)

You can also set API keys via environment variable:

```powershell
$env:GROQ_API_KEYS='gsk_key1,gsk_key2,gsk_key3'
```

Then restart the app.

## Next Steps

Once Groq is configured:
1. ✅ Record meetings
2. ✅ Get fast transcriptions
3. ✅ View transcripts in the app
4. ✅ Export notes as Markdown

Enjoy fast transcription! 🎉
