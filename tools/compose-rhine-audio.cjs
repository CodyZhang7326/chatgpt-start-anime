'use strict';
// The synthesis envelopes and frequencies below adapt upstream splash.js audio(),
// Copyright (c) 2026 沈宏宏, MIT. The MP3 samples retain their separate attribution.
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const {createServer}=require('../server.cjs');
const root=path.resolve(__dirname,'..');

(async()=>{
  const server=createServer();let browser;
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
    browser=await chromium.launch({headless:true,channel:'msedge',args:['--autoplay-policy=no-user-gesture-required']});
    const page=await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/?capture=1`);
    await page.evaluate(()=>{ChatGPTBoot.pause()});
    const result=await page.evaluate(async()=>{
      const sr=48000,seconds=ChatGPTRhine.duration/1000,ac=new OfflineAudioContext(2,Math.round(sr*seconds),sr),buffers={};
      const at=s=>ChatGPTRhine.toPlaybackTime(s*1000)/1000;
      const names=['line-1','line-2','line-3','line-4','line-5','sfx-tick','sfx-ticks-run'];
      for(const name of names){const r=await fetch(`assets/rhine-audio/${name}.mp3`);if(!r.ok)throw Error('Missing original sample: '+name);buffers[name]=await ac.decodeAudioData(await r.arrayBuffer())}
      const ending=await fetch('assets/chatgpt-original-ending.wav');if(!ending.ok)throw Error('Missing original electronic ending');buffers.ending=await ac.decodeAudioData(await ending.arrayBuffer());
      function tone(t,freq,dur,type,gain,delay=0,glideTo){
        const start=t+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);
        if(glideTo)o.frequency.exponentialRampToValueAtTime(glideTo,start+dur);
        g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(gain,start+Math.min(.02,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,start+dur);
        o.connect(g);g.connect(ac.destination);o.start(start);o.stop(start+dur+.03);
      }
      function sample(name,t,gain){const s=ac.createBufferSource(),g=ac.createGain();s.buffer=buffers[name];g.gain.value=gain;s.connect(g);g.connect(ac.destination);s.start(t);return s.buffer.duration}
      const cue=t=>{tone(t,1046.5,.05,'sine',.028);tone(t,1568,.06,'sine',.02,.075)};
      const confirm=t=>{tone(t,660,.09,'triangle',.07);tone(t,990,.17,'triangle',.055,.085)};
      tone(at(.82),220,1.1/ChatGPTRhine.pageSpeed,'sine',.032,0,990);
      const cues=[];
      // The first page change is quiet; retain its spoken authorization line.
      for(const [index,step] of ChatGPTRhine.steps.entries()){const t=step.start/1000;if(index>0){sample('sfx-tick',t,.6);cue(t+.04)}const duration=sample(step.audio,t+.24,.95);if(t+.24+duration>step.end/1000)throw Error('Voice exceeds stage: '+step.audio);cues.push({file:step.audio,start:t+.24,duration})}
      confirm(at(6.0));confirm(at(8.5));sample('sfx-ticks-run',at(11.18),.5);
      // Restore the actual first-version ending, including its natural decay.
      const endingAt=at(21.25),endingDuration=sample('ending',endingAt,1);
      if(endingAt+endingDuration>seconds+.0001)throw Error('Original ending exceeds the movie');
      cues.push({file:'chatgpt-original-ending.wav',start:endingAt,duration:endingDuration});
      const rendered=await ac.startRendering(),L=rendered.getChannelData(0),R=rendered.getChannelData(1);
      const bytes=new Uint8Array(L.length*4),view=new DataView(bytes.buffer);let peak=0,sum=0;
      for(let i=0;i<L.length;i++){const l=L[i],r=R[i];peak=Math.max(peak,Math.abs(l),Math.abs(r));sum+=l*l+r*r;view.setInt16(i*4,Math.round(Math.max(-1,Math.min(1,l))*32767),true);view.setInt16(i*4+2,Math.round(Math.max(-1,Math.min(1,r))*32767),true)}
      if(peak>=.99)throw Error('Clipping: '+peak);
      let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      return {pcm:btoa(binary),sampleRate:sr,seconds,firstTransitionEffects:false,peakDbFS:20*Math.log10(peak),rmsDbFS:20*Math.log10(Math.sqrt(sum/(L.length*2))),cues};
    });
    const pcm=Buffer.from(result.pcm,'base64'),wav=Buffer.alloc(44+pcm.length);wav.write('RIFF');wav.writeUInt32LE(36+pcm.length,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(result.sampleRate,24);wav.writeUInt32LE(result.sampleRate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);
    await fs.writeFile(path.join(root,'assets/chatgpt-startup-rhine.wav'),wav);delete result.pcm;
    await fs.writeFile(path.join(root,'assets/rhine-audio-production.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
