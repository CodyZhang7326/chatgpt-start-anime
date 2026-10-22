"""Extract the actual electronic ending from the first startup animation export.

The extracted WAV ships with the project. Pass the first exported video as an
optional argument when extracting it again on another machine.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '.preview/prior-exports/codex-boot.mp4'
if not source.is_file():
    raise FileNotFoundError('Supply the original startup export; the prepared WAV is already included in assets.')
ffmpeg = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
if not ffmpeg:
    from imageio_ffmpeg import get_ffmpeg_exe
    ffmpeg = get_ffmpeg_exe()
rate, channels, start, end = 48000, 2, 21.25, 24.0
pcm = subprocess.check_output([str(ffmpeg), '-v', 'error', '-i', str(source),
                               '-map', '0:a:0', '-f', 's16le', '-ar', str(rate), '-ac', str(channels), '-'])
first, count = round(start * rate), round((end - start) * rate)
clip = pcm[first * 4:(first + count) * 4].ljust(count * 4, b'\0')
target = ROOT / 'assets/chatgpt-original-ending.wav'
with wave.open(str(target), 'wb') as output:
    output.setnchannels(channels)
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes(clip)
metadata = {
    'kind': 'original-electronic-ending', 'source': source.name,
    'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'sourceRangeSeconds': [start, end], 'playAtSeconds': start,
    'durationSeconds': end - start, 'tempo': 1.0, 'pitchPreserved': True,
    'method': 'Extracted from the first exported animation without changing pitch, speed or gain; silent padding to 24 seconds.',
    'earliestRecordingMatch': {'correlation': 0.9959639310836792, 'mainFrequenciesHz': [523.19, 783.94, 1046.39]}
}
(ROOT / 'assets/original-ending-production.json').write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
print('Extracted the first-version electronic ending, 21.25–24.00 seconds.')
