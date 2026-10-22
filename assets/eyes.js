/* Shared 60 FPS eyelid timeline for the startup film and live portrait pages. */
(() => {
  'use strict';
  const fps=60, speed=.3, previousDuration=170, duration=previousDuration/speed, interval=6400;
  const width=1672,height=941,images=[],patches=[],frames=[];
  const files=['chatgpt-cinematic.png','chatgpt-cinematic-blink-25.png','chatgpt-cinematic-blink-50.png','chatgpt-cinematic-blink-75.png','chatgpt-cinematic-blink.png'];
  const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>v*v*(3-2*v);
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  const patch={x:970,y:306,w:380,h:202};
  const blend=make(patch.w,patch.h),blendCtx=blend.getContext('2d');
  const sample=ms=>Math.floor((ms+1e-7)*fps/1000)*1000/fps;
  function closure(elapsed){
    const p=elapsed/duration;
    if(p<=0||p>=1)return 0;
    if(p<.28)return ease(p/.28);
    if(p<.43)return 1;
    return 1-ease((p-.43)/.57);
  }
  function at(ms,start=3000){return closure(sample(ms)-start)}
  function cycle(ms){return at(((ms%interval)+interval)%interval)}
  function preparePatch(image){
    const c=make(patch.w,patch.h),g=c.getContext('2d');
    g.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,-patch.x,-patch.y,width,height);
    const mask=make(patch.w,patch.h),m=mask.getContext('2d');
    // Local, feathered eye masks keep the rest of the face and hair perfectly still.
    for(const [x,y,rx,ry,angle] of [[1057,451,81,48,-.3],[1264,370,79,51,-.4]]){
      m.save();m.translate(x-patch.x,y-patch.y);m.rotate(angle);m.scale(rx,ry);
      const grad=m.createRadialGradient(0,0,.81,0,0,1);grad.addColorStop(0,'#000');grad.addColorStop(1,'transparent');
      m.fillStyle=grad;m.fillRect(-1,-1,2,2);m.restore();
    }
    g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);return c;
  }
  function draw(ctx,value=0){
    if(!images.length)return;
    const level=clamp(value)*4,a=Math.floor(level),b=Math.min(4,a+1),mix=level-a;
    ctx.drawImage(images[0],0,0,width,height);
    if(level===0)return;
    blendCtx.clearRect(0,0,patch.w,patch.h);
    blendCtx.globalCompositeOperation='source-over';blendCtx.globalAlpha=1-mix;blendCtx.drawImage(patches[a],0,0);
    blendCtx.globalCompositeOperation='lighter';blendCtx.globalAlpha=mix;blendCtx.drawImage(patches[b],0,0);
    blendCtx.globalAlpha=1;blendCtx.globalCompositeOperation='source-over';ctx.drawImage(blend,patch.x,patch.y);
  }
  // Loading is lazy so archive/workspace pages do not download unused portrait frames.
  let loading;
  function load(){return loading||(loading=Promise.all(files.map(async file=>{const image=new Image();image.src='assets/'+file;await image.decode();return image})).then(loaded=>{
    images.push(...loaded);patches.push(...images.map(preparePatch));
    for(let i=0;i<5;i++){const c=make(width,height);draw(c.getContext('2d'),i/4);frames.push(c)}
  }))}
  function mount(canvas){
    const ctx=canvas.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
    canvas.width=width;canvas.height=height;
    let start=performance.now(),handle=0,enabled=false,last=-1,time=0,value=0;
    const render=ms=>{time=sample(ms);value=cycle(time);if(value!==last){draw(ctx,value);last=value}return value};
    const tick=now=>{if(!enabled)return;render(now-start);handle=requestAnimationFrame(tick)};
    function sync(){
      cancelAnimationFrame(handle);enabled=!document.hidden&&!reduce.matches&&!document.documentElement.classList.contains('static-art');
      if(enabled){start=performance.now()-time;handle=requestAnimationFrame(tick)}else{draw(ctx,0);last=0;value=0}
    }
    const ready=load().then(()=>{draw(ctx,0);canvas.classList.add('ready');sync()});
    const observer=new MutationObserver(sync);observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
    return {ready,render,pause(){enabled=false;cancelAnimationFrame(handle)},get state(){return{fps,speed,duration,interval,time,closure:value,playing:enabled}}};
  }
  window.ChatGPTEyes={fps,speed,duration,interval,width,height,sample,closure,at,cycle,draw,mount,frames,get ready(){return load()}};
})();
