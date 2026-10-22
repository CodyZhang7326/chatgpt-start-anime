'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {chromium}=require('playwright'),{createServer}=require('../server.cjs');
(async()=>{
  const server=createServer();let browser;const errors=[];
  try{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    browser=await chromium.launch({headless:true,channel:'msedge'});
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?capture=1`);
    await page.evaluate(async()=>{ChatGPTBoot.pause();await ChatGPTBoot.ready});
    const result=await page.evaluate(()=>{
      const c=document.querySelector('canvas'),g=c.getContext('2d');
      ChatGPTRhine.renderPermissionIdle(0);const loopStart=c.toDataURL();
      ChatGPTRhine.renderPermissionIdle(ChatGPTRhine.idleDuration);const loopEnd=c.toDataURL();
      const shot=ms=>{ChatGPTRhine.renderPermissionIdle(ms);return g.getImageData(0,0,1920,1080).data};
      const a=shot(0),b=shot(1200);
      let changed=0,outside=0;
      for(let i=0;i<a.length;i+=4){
        const diff=a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2];
        if(diff){changed++;const x=(i/4)%1920,y=Math.floor(i/4/1920);if(x<1340||x>1775||y<295||y>845)outside++}
      }
      const original=ChatGPTPortrait.draw;let earlyPortraitCalls=0,finalPortraitCalls=0,now;
      ChatGPTPortrait.draw=(ctx,t)=>{if(now<16500)earlyPortraitCalls++;else finalPortraitCalls++;original(ctx,t)};
      try{for(now=14500;now<16500;now+=1000/60)ChatGPTRhine.render(now);now=17200;ChatGPTRhine.render(now)}finally{ChatGPTPortrait.draw=original}
      return {idleChangedPixels:changed,idleChangedOutsideCharacter:outside,idleLoopIdentical:loopStart===loopEnd,earlyPortraitCalls,finalPortraitCalls};
    });
    assert.ok(result.idleChangedPixels>3000);assert.equal(result.idleChangedOutsideCharacter,0);assert.equal(result.idleLoopIdentical,true);
    assert.equal(result.earlyPortraitCalls,0);assert.ok(result.finalPortraitCalls>0);assert.deepEqual(errors,[]);
    const report={result:'PASS',...result,errors};
    await fs.writeFile('.preview/rhine-visual-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
