"""One continuous stock neural female voice, chosen by the user for a smooth outro.

Only the text 'Welcome to ChatGPT.' is sent to Microsoft's speech service.
The original reference speaker is not cloned. Reference sounds stay separate.
"""
import asyncio
import json
import os
import shutil
import sys
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
if not FFMPEG:
    from imageio_ffmpeg import get_ffmpeg_exe
    FFMPEG = get_ffmpeg_exe()

async def main():
    raw = ROOT / 'assets/voice/rhine-welcome-natural.mp3'
    if '--process-only' not in sys.argv:
        await edge_tts.Communicate(
            'Welcome... to Chat GPT.', 'en-US-AriaNeural',
            rate='-22%', pitch='-5Hz', volume='+0%'
        ).save(str(raw))
    if not raw.is_file():
        raise FileNotFoundError('Generate the continuous welcome voice first.')
    target = ROOT / 'assets/chatgpt-rhine-welcome.wav'
    # Retain pitch while slowing the phrase; a quiet early reflection gives the
    # welcome some space without masking the consonants or adding background music.
    filters = ('silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,'
               'areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-48dB,areverse,'
               'atempo=0.94,highpass=f=160,lowpass=f=7000,'
               'acompressor=threshold=0.11:ratio=2.4:attack=5:release=70:makeup=1.35,'
               'tremolo=f=45:d=0.055,acrusher=bits=12:mix=0.10:mode=lin:aa=1,'
               'aecho=0.92:0.96:17|38:0.10|0.055,alimiter=limit=0.85:level=false,'
               'afade=t=in:d=0.02')
    subprocess.run([str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', str(raw), '-af', filters, '-ar', '48000', '-ac', '2',
                    '-c:a', 'pcm_s16le', str(target)], check=True)
    metadata = {'text': 'Welcome to ChatGPT.', 'spokenText': 'Welcome... to Chat GPT.',
                'voice': 'en-US-AriaNeural', 'rate': '-22%', 'pitch': '-5Hz',
                'tempoAfterSpeech': 0.94, 'method': 'One continuous stock neural female voice; no voice cloning.',
                'userChoice': 'One continuous female voice, slowed and lightly mechanized to match the reference prompts.',
                'processing': '160 Hz–7 kHz band limit, gentle compression, 5.5% 45 Hz modulation, 10% 12-bit texture, 17/38 ms reflections.'}
    (ROOT / 'assets/rhine-welcome-production.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(target, flush=True)

asyncio.run(main())
