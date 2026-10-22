import asyncio
from pathlib import Path
import edge_tts
ROOT = Path(__file__).resolve().parents[1]
async def main():
    voice_dir = ROOT / 'assets' / 'voice'
    voice_dir.mkdir(parents=True, exist_ok=True)
    for name, text in [('connected','连接已建立。'),('welcome','欢迎回来。')]:
        await edge_tts.Communicate(text, 'zh-CN-XiaoxiaoNeural', rate='-12%', pitch='-2Hz', volume='+0%').save(str(voice_dir / f'{name}.mp3'))
        print(name+' recorded', flush=True)
asyncio.run(main())
