'use strict';
// Deterministic 60 fps export: each frame is rendered from its exact timestamp,
// so a busy desktop cannot introduce recording skips into the installed movie.
const fs=require('node:fs/promises'),path=require('node:path');
const {createHash}=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const {once}=require('node:events');
const {chromium}=require('playwright');
const {createServer}=require('../server.cjs');
const root=path.resolve(__dirname,'..');
const review=process.argv.includes('--review');
function ffmpegPath(){
  if(process.env.FFMPEG_BINARY)return process.env.FFMPEG_BINARY;
  if(spawnSync('ffmpeg',['-version'],{windowsHide:true}).status===0)return 'ffmpeg';
  const result=spawnSync(process.env.PYTHON||'python',['-X','utf8','-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8',windowsHide:true});
  if(result.status===0&&result.stdout.trim())return result.stdout.trim();
  throw Error('FFmpeg not found: install requirements.txt or set FFMPEG_BINARY.');
}
(async()=>{
  const server=createServer();let browser,encoder,encoderExit;
  const errors=[];const framesDir=path.join(root,'.preview/rhine-review');
  try{
    await fs.mkdir(framesDir,{recursive:true});
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
    browser=await chromium.launch({headless:true,channel:'msedge',args:['--autoplay-policy=no-user-gesture-required']});
    const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?capture=1`);
    await page.evaluate(async()=>{ChatGPTBoot.pause();await ChatGPTBoot.ready});
    const duration=await page.evaluate(()=>ChatGPTBoot.duration);
    for(const time of [1500,4900,5000,5950,7600,8000,10200,12000,14800,16150,16300,16450,16500,16700,17200,17900,18500,19800,22200]){
      const encoded=await page.evaluate(ms=>{ChatGPTBoot.seek(ChatGPTRhine.toPlaybackTime(ms));return document.querySelector('canvas').toDataURL('image/png').split(',')[1]},time);
      await fs.writeFile(path.join(framesDir,`frame-${time}.png`),Buffer.from(encoded,'base64'));
    }
    for(const time of [0,1200,3840,4200,4800]){
      const encoded=await page.evaluate(ms=>{ChatGPTRhine.renderPermissionIdle(ms);return document.querySelector('canvas').toDataURL('image/png').split(',')[1]},time);
      await fs.writeFile(path.join(framesDir,`idle-${time}.png`),Buffer.from(encoded,'base64'));
    }
    await page.evaluate(()=>ChatGPTBoot.seek(ChatGPTBoot.duration));
    const endFrame=await page.evaluate(()=>{const p=document.querySelector('canvas').getContext('2d').getImageData(0,0,1920,1080).data;for(let i=0;i<p.length;i+=4)if(p[i]!==33||p[i+1]!==33||p[i+2]!==33)return false;return true});
    if(!endFrame||errors.length)throw Error('Render check: '+JSON.stringify({endFrame,errors}));
    if(review){console.log(JSON.stringify({result:'PASS',duration,reviewFrames:framesDir,endFrame}));return}
    const ffmpeg=ffmpegPath();
    const target=path.join(root,'output/chatgpt-boot-rhine.mp4');
    async function movie(file,milliseconds,idle=false){
    const audio=idle?[]:['-i',path.join(root,'assets/chatgpt-startup-rhine.wav'),'-map','0:v:0','-map','1:a:0'];
    encoder=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','60','-vcodec','mjpeg','-i','pipe:0',...audio,'-t',String(milliseconds/1000),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',...(idle?['-an']:['-c:a','aac','-b:a','192k','-ar','48000','-ac','2']),'-movflags','+faststart',file],{windowsHide:true,stdio:['pipe','ignore','pipe']});
    let ffError='';encoder.stderr.on('data',d=>{ffError+=String(d)});encoderExit=new Promise((resolve,reject)=>{encoder.once('error',reject);encoder.once('exit',code=>code===0?resolve():reject(Error('FFmpeg '+code+': '+ffError)))});
    encoderExit.catch(()=>{});
    encoder.stdin.on('error',()=>{});
    await once(encoder,'spawn');
    const count=Math.round(milliseconds*60/1000);
    for(let frame=0;frame<count;frame++){
      const encoded=await page.evaluate(({ms,idle})=>{if(idle)ChatGPTRhine.renderPermissionIdle(ms);else ChatGPTBoot.render(ms);return document.querySelector('canvas').toDataURL('image/jpeg',.97).split(',')[1]},{ms:frame*1000/60,idle});
      if(!encoder.stdin.write(Buffer.from(encoded,'base64')))await once(encoder.stdin,'drain');
      if(frame%240===0)console.log(`Rendered ${frame}/${count} frames`);
    }
    encoder.stdin.end();await encoderExit;encoder=null;
    return count;
    }
    const count=await movie(target,duration);
    const idleFile=path.join(root,'output/chatgpt-permission-idle.mp4');
    const idleDuration=await page.evaluate(()=>ChatGPTRhine.idleDuration);
    const idleFrames=await movie(idleFile,idleDuration,true);
    const gate=await page.evaluate(()=>Object.fromEntries(Object.entries(ChatGPTRhine.permissionGate).map(([key,ms])=>[key,ms/1000])));
    const metadata={schema:1,videoSHA256:createHash('sha256').update(await fs.readFile(target)).digest('hex'),...gate,idleSHA256:createHash('sha256').update(await fs.readFile(idleFile)).digest('hex'),idleSeconds:idleDuration/1000};
    await fs.writeFile(path.join(root,'output/chatgpt-boot-rhine.interaction.json'),JSON.stringify(metadata,null,2)+'\n');
    await fs.copyFile(path.join(framesDir,'frame-22200.png'),path.join(root,'output/chatgpt-boot-rhine-poster.png'));
    console.log(JSON.stringify({result:'PASS',target,frames:count,durationMs:duration,idleFile,idleFrames,endFrame,errors}));
  }finally{if(encoder)encoder.kill();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
