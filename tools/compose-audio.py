"""Original restrained electronic startup score. No environmental/water recordings."""
from pathlib import Path
import json
import os
import shutil
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
if not FFMPEG:
    from imageio_ffmpeg import get_ffmpeg_exe
    FFMPEG = get_ffmpeg_exe()
SR, SECONDS = 48000, 24
N = SR * SECONDS
rng = np.random.default_rng(241022)
music = np.zeros((N, 2), dtype=np.float64)

def smooth(x):
    x = np.clip(x, 0, 1)
    return x*x*(3-2*x)

def envelope(t, length, attack=.18, release=.8):
    return smooth(t/attack)*smooth((length-t)/release)

def add(signal, start, gain=1, pan=0):
    i = round(start*SR)
    stop = min(N, i+len(signal))
    if signal.ndim == 1:
        signal = np.column_stack((signal*np.sqrt((1-pan)/2), signal*np.sqrt((1+pan)/2)))
    music[i:stop] += signal[:stop-i]*gain

def texture(start, length, notes, gain):
    t = np.arange(round(length*SR))/SR
    stereo = np.zeros((len(t),2))
    for j, hz in enumerate(notes):
        for channel, detune in enumerate([-.0011,.0011]):
            # Warm, steady harmonic bed; no liquid pitch drops or resonant chirps.
            tone = sum(np.sin(2*np.pi*hz*(1+detune)*h*t+j*.47)/h**2.6 for h in [1,2,3,4,5])
            stereo[:,channel] += tone/len(notes)
    add(stereo*envelope(t,length,.9,1.5)[:,None],start,gain)

def relay(start, gain=.023, pan=0):
    length=.048
    t=np.arange(round(length*SR))/SR
    noise=rng.normal(0,1,len(t))
    spectrum=np.fft.rfft(noise)
    freq=np.fft.rfftfreq(len(t),1/SR)
    spectrum*=np.exp(-((freq-3200)/1900)**4)*(freq>950)
    dry=np.fft.irfft(spectrum,len(t))*np.exp(-t/.007)*smooth(t/.0015)
    add(dry,start,gain,pan)

def weight(start, hz=65.406,gain=.105):
    length=1.05
    t=np.arange(round(length*SR))/SR
    v=(np.sin(2*np.pi*hz*t)+.18*np.sin(2*np.pi*hz*2*t))*np.exp(-t/.27)*smooth(t/.022)
    add(v,start,gain)

def signature(start, notes, gain=.055, length=2.5):
    t=np.arange(round(length*SR))/SR
    v=sum(np.sin(2*np.pi*f*t)+.12*np.sin(2*np.pi*f*3*t) for f in notes)/len(notes)
    add(v*envelope(t,length,.16,.95)*np.exp(-t/2.5),start,gain)

# A spacious E-minor/add9 palette and six restrained, dry synchronization accents.
texture(.15,8.0,[82.407,123.471,164.814],.052)
texture(5.4,8.3,[82.407,123.471,184.997,246.942],.049)
texture(11.4,8.6,[82.407,164.814,246.942,311.127],.052)
texture(17.4,6.5,[82.407,123.471,164.814,246.942,369.994],.046)
for start,hz,gain in [(.35,65.406,.10),(2.72,82.407,.065),(7.2,82.407,.075),(11.95,65.406,.09),(16.95,82.407,.065),(21.2,82.407,.075)]:
    weight(start,hz,gain)
for start,gain,pan in [(0.18,.027,-.2),(2.64,.018,-.3),(2.70,.025,.2),(7.13,.023,.15),(11.90,.025,-.1),(16.82,.022,.1),(21.16,.025,0)]:
    relay(start,gain,pan)
signature(5.2,[329.628,493.883],.022,2.2)
signature(10.8,[246.942,369.994],.031,2.6)
signature(16.9,[329.628,493.883,622.254],.032,2.8)
signature(21.2,[164.814,246.942,329.628,493.883],.054,2.7)

# Short early reflections add dimension without audible repeating echoes.
dry=music.copy()
for delay,level in [(.019,.075),(.037,.045),(.061,.026)]:
    samples=round(delay*SR)
    music[samples:]+=dry[:-samples,::-1]*level

def prepare_voice(name):
    raw=subprocess.check_output([str(FFMPEG),'-v','error','-i',str(ROOT/f'assets/voice/{name}.mp3'),'-f','f32le','-ac','1','-ar',str(SR),'-'])
    v=np.frombuffer(raw,dtype='<f4').astype(float)
    active=np.flatnonzero(np.abs(v)>.003)
    if not len(active): raise RuntimeError('Empty voice recording')
    v=v[max(0,active[0]-int(.06*SR)):min(len(v),active[-1]+int(.12*SR))]
    v-=np.mean(v)
    v*=.23/max(np.max(np.abs(v)),1e-8)
    t=np.arange(len(v))/SR
    v*=envelope(t,len(v)/SR,.012,.05)
    return v

instrumental=music.copy()
voiced=music.copy()
voice_cues=[]
for name,text,start in [('connected','连接已建立。',17.35),('welcome','欢迎回来。',21.25)]:
    v=prepare_voice(name)
    i=round(start*SR);stop=min(N,i+len(v))
    timeline=np.arange(N)/SR
    duck=1-.58*smooth((timeline-start+.16)/.16)*smooth((start+len(v)/SR+.25-timeline)/.25)
    voiced*=duck[:,None]
    voiced[i:stop,0]+=v[:stop-i]*.92
    voiced[i:stop,1]+=v[:stop-i]*.92
    voice_cues.append({'text':text,'start':start,'duration':round(len(v)/SR,3),'voice':'zh-CN-XiaoxiaoNeural'})

timeline=np.arange(N)/SR
fade=smooth(timeline/.12)*smooth((23.96-timeline)/1.3)
stats={}
for name,audio in [('instrumental',instrumental),('voice',voiced)]:
    audio*=fade[:,None]
    # Shared gain preserves the music level between A/B versions.
    audio*=2.2
    peak=float(np.max(np.abs(audio)))
    if peak>.89: audio*=.89/peak
    target=ROOT/f'assets/chatgpt-startup-{name}.wav'
    with wave.open(str(target),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
    stats[name]={'file':str(target.relative_to(ROOT)),'duration':SECONDS,'sampleRate':SR,'peakDbFS':round(20*np.log10(np.max(np.abs(audio))),2),'rmsDbFS':round(20*np.log10(np.sqrt(np.mean(audio**2))),2)}
manifest={'method':'Original deterministic electronic synthesis; no game audio or environmental samples used.','voiceMethod':'Microsoft neural TTS through edge-tts; stock female voice, not a cloned actor.','voiceCues':voice_cues,'variants':stats,'direction':'Dry electronic relays, stable low-frequency harmonics, restrained stereo chords, soft final release. No water, bubbles or rounded chirp sequence.','references':['https://monster-siren.hypergryph.com/music','https://www.youtube.com/watch?v=9pKj3PnHw3Y']}
(ROOT/'assets/audio-production.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
