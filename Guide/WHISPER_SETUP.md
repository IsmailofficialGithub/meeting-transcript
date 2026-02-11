# Whisper Installation Guide - Low Disk Space

## Problem
C: drive has insufficient space (~124 MB free) for installing Whisper/PyTorch (requires ~2-3 GB).

## Solutions

### Option 1: Free Up C: Drive Space (Recommended)
1. Run Windows Disk Cleanup as Administrator:
   - Press Win+R, type `cleanmgr`, press Enter
   - Select C: drive
   - Check all boxes and run cleanup

2. Uninstall unused programs:
   - Settings → Apps → Uninstall unused applications

3. Move user files to E: drive:
   - Documents, Downloads, etc.

4. Clear browser caches and old files

**Target: Free up at least 5 GB on C: drive**

### Option 2: Use whisper.cpp (Better for Production)
whisper.cpp is a C++ implementation that:
- Doesn't require Python
- Is faster and uses less memory
- Can be installed on E: drive

**Installation:**
```bash
# Download whisper.cpp from GitHub
# Build it on E: drive
# Update chunk-processor.js to use whisper.cpp instead
```

### Option 3: Portable Python on E: Drive
1. Download Python portable/embeddable package
2. Extract to E:\PythonPortable
3. Create virtual environment there
4. Install Whisper in that environment

### Option 4: Manual Package Installation
1. Download PyTorch wheel manually to E: drive
2. Install from local file:
```bash
python -m pip install E:\downloads\torch-2.10.0-cp314-cp314-win_amd64.whl
```

## Current Status
- Virtual environment created: `E:\whisper-env`
- Need to free C: drive space OR switch to whisper.cpp

## Recommendation
For a production offline app, **whisper.cpp is the better choice**:
- No Python dependency
- Faster processing
- Lower memory usage
- Can run entirely from E: drive

Would you like me to update the code to use whisper.cpp instead?
