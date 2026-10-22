'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const { createServer } = require('../server.cjs');
const root = path.resolve(__dirname, '..');

function option(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  if (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw Error(`Missing value: ${name}`);
  return process.argv[i + 1];
}
function ffmpegPath() {
  if (process.env.FFMPEG_BINARY) return process.env.FFMPEG_BINARY;
  if (spawnSync('ffmpeg', ['-version'], { windowsHide: true }).status === 0) return 'ffmpeg';
  const result = spawnSync(process.env.PYTHON || 'python', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8', windowsHide: true });
  if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  throw Error('FFmpeg not found. Install requirements.txt, add ffmpeg to PATH, or set FFMPEG_BINARY.');
}
function transcode(ffmpeg, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(Error(`FFmpeg exited with ${code}`)));
  });
}

(async () => {
  const output = path.resolve(option('--output', path.join(root, 'output')));
  const channel = option('--browser', process.env.BROWSER_CHANNEL || 'chromium');
  const ffmpeg = ffmpegPath();
  await fs.mkdir(output, { recursive: true });
  const temporary = await fs.mkdtemp(path.join(output, '.render-'));
  const server = createServer();
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    browser = await chromium.launch({ headless: true, ...(channel === 'chromium' ? {} : { channel }), args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => console.error(error));
    await page.goto(`http://127.0.0.1:${server.address().port}/?capture=1`);
    await page.evaluate(async () => { ChatGPTBoot.pause(); await ChatGPTBoot.ready; ChatGPTBoot.seek(22200); });
    const poster = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png').split(',')[1]);
    await fs.writeFile(path.join(temporary, 'chatgpt-boot-poster.png'), Buffer.from(poster, 'base64'));
    console.log('Recording the current 24-second Canvas animation...');
    const recording = await page.evaluate(async () => {
      const blob = await ChatGPTBoot.record();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',').pop());
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    });
    const master = path.join(temporary, 'master.webm');
    await fs.writeFile(master, Buffer.from(recording, 'base64'));
    await browser.close(); browser = null;
    for (const variant of ['instrumental', 'voice']) {
      await transcode(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', master, '-i', path.join(root, 'assets', `chatgpt-startup-${variant}.wav`), '-map', '0:v:0', '-map', '1:a:0', '-t', '24', '-vf', 'fps=60,scale=1920:1080', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', path.join(temporary, `chatgpt-boot-${variant}.mp4`)]);
    }
    for (const name of ['chatgpt-boot-instrumental.mp4', 'chatgpt-boot-voice.mp4', 'chatgpt-boot-poster.png']) {
      await fs.copyFile(path.join(temporary, name), path.join(output, name));
    }
    await fs.copyFile(path.join(output, 'chatgpt-boot-instrumental.mp4'), path.join(output, 'chatgpt-boot.mp4'));
    console.log(`Exported both videos and poster to: ${output}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    const relative = path.relative(output, path.resolve(temporary));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(temporary).startsWith('.render-')) {
      throw Error('Unexpected render temporary directory; preserving it.');
    }
    await fs.rm(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
