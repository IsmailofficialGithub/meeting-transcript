# Install Whisper for Transcription

## Current Status

Whisper is **not installed** yet. The app needs Whisper to transcribe audio.

## Installation Options

### Option 1: Use Virtual Environment (Recommended - Already Created)

We already created a virtual environment on E: drive. Install Whisper there:

```powershell
E:\whisper-env\Scripts\Activate.ps1
pip install openai-whisper
```

Or directly:
```powershell
E:\whisper-env\Scripts\python.exe -m pip install openai-whisper
```

**Note**: This will download PyTorch (~2-3 GB) to E: drive, so it won't use C: drive space.

### Option 2: Install in System Python (Requires C: Drive Space)

```powershell
pip install openai-whisper
```

**Warning**: This requires ~3 GB free on C: drive.

## After Installation

1. **Restart the Meeting Note app**
2. The app will automatically detect Whisper in the virtual environment
3. Try recording and transcribing again

## Verify Installation

Test if Whisper works:

```powershell
# If using virtual environment:
E:\whisper-env\Scripts\python.exe -m whisper --help

# If using system Python:
whisper --help
```

You should see Whisper help text.

## Troubleshooting

**"Whisper spawn failed" or "command not found"**
- Whisper is not installed or not in PATH
- Make sure you installed it in the virtual environment
- Check that `E:\whisper-env\Scripts\python.exe` exists

**"No module named 'whisper'"**
- Whisper is not installed in the Python environment being used
- Install it using one of the options above

**Language detection issues**
- Whisper should auto-detect language with `--language auto`
- If it fails, you can manually specify: `--language en` (for English)

## Current Configuration

The app is configured to:
- Use virtual environment Python at: `E:\whisper-env\Scripts\python.exe`
- Use Whisper model: `medium` (good balance of accuracy and speed)
- Auto-detect language
- Process audio in 60-second chunks (for memory efficiency)
