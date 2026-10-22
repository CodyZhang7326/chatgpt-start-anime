"""Slow the original Welcome and give its final syllable a descending pitch."""
import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ffmpeg = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
if not ffmpeg:
    from imageio_ffmpeg import get_ffmpeg_exe
    ffmpeg = get_ffmpeg_exe()
source = ROOT / 'assets/rhine-audio/line-6.mp3'
target = ROOT / 'assets/chatgpt-rhine-welcome.wav'
tempo = 0.55
start_semitones, end_semitones = -1.5, -3.5
# Commands follow source time. Small input frames make the descent continuous;
# preserving formants retains the reference speaker's vocal character.
commands = []
for i in range(35):
    t = 0.12 + i * 0.01
    u = i / 34
    eased = u * u * (3 - 2 * u)
    semitones = start_semitones + (end_semitones - start_semitones) * eased
    commands.append(f'{t:.3f} rubberband@welcome pitch {2 ** (semitones / 12):.9f}')
filters = (
    "aresample=48000,asetnsamples=n=480:p=0,asendcmd=c='" + ';'.join(commands) + "',"
    f'rubberband@welcome=tempo={tempo}:pitch={2 ** (start_semitones / 12):.9f}:'
    'transients=smooth:detector=soft:formant=preserved:pitchq=quality:channels=together'
)
subprocess.run([str(ffmpeg), '-hide_banner', '-loglevel', 'error', '-y',
                '-i', str(source), '-af', filters, '-ar', '48000', '-ac', '2',
                '-c:a', 'pcm_s16le', str(target)], check=True)
metadata = {'text': 'Welcome', 'source': 'assets/rhine-audio/line-6.mp3',
            'tempo': tempo, 'pitchPreserved': False, 'formantsPreserved': True,
            'pitchSemitones': {'start': start_semitones, 'end': end_semitones},
            'pitchDescentSourceSeconds': [0.12, 0.46],
            'method': 'Original reference sample, slower tempo with a smooth downward pitch contour; no generated replacement voice.'}
(ROOT / 'assets/rhine-welcome-production.json').write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
print('Prepared original Welcome at 55% speech speed, descending from -1.5 to -3.5 semitones.')
