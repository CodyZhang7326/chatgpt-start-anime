/* Live portrait compositing. The source artwork stays intact; all effects are drawn at runtime. */
(() => {
  const W=1920,H=1080,frames=[];
  const clamp=v=>Math.max(0,Math.min(1,v)),phase=(t,a,b)=>clamp((t-a)/(b-a)),ease=v=>v*v*(3-2*v);
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  let contours;
  const blend=make(W,H),blendCtx=blend.getContext('2d');
  function prepare(image){
    const c=make(W,H),g=c.getContext('2d');
    const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    const ratio=Math.max(W/iw,H/ih),w=iw*ratio,h=ih*ratio;
    g.filter='brightness(.72) saturate(.72)';g.drawImage(image,(W-w)/2,(H-h)/2,w,h);g.filter='none';
    g.globalCompositeOperation='destination-in';
    const horizontal=g.createLinearGradient(0,0,W,0);
    horizontal.addColorStop(0,'transparent');horizontal.addColorStop(.29,'transparent');horizontal.addColorStop(.44,'rgba(0,0,0,.2)');horizontal.addColorStop(.61,'#000');horizontal.addColorStop(1,'#000');
    g.fillStyle=horizontal;g.fillRect(0,0,W,H);
    const vertical=g.createLinearGradient(0,0,0,H);
    vertical.addColorStop(0,'transparent');vertical.addColorStop(.08,'rgba(0,0,0,.26)');vertical.addColorStop(.19,'#000');vertical.addColorStop(.67,'#000');vertical.addColorStop(.88,'rgba(0,0,0,.12)');vertical.addColorStop(.96,'transparent');vertical.addColorStop(1,'transparent');
    g.fillStyle=vertical;g.fillRect(0,0,W,H);return c;
  }
  function edgeField(frame){
    const w=W,h=H,c=make(w,h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(frame,0,0,w,h);
    const src=g.getImageData(0,0,w,h),lum=new Float32Array(w*h),magnitude=new Float32Array(w*h),direction=new Int32Array(w*h),dst=g.createImageData(w,h);
    for(let p=0;p<lum.length;p++){const i=p*4;lum[p]=src.data[i]*.2126+src.data[i+1]*.7152+src.data[i+2]*.0722}
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const p=y*w+x,i=p*4;
      const gx=-lum[p-w-1]-2*lum[p-1]-lum[p+w-1]+lum[p-w+1]+2*lum[p+1]+lum[p+w+1];
      const gy=-lum[p-w-1]-2*lum[p-w]-lum[p-w+1]+lum[p+w-1]+2*lum[p+w]+lum[p+w+1];
      magnitude[p]=Math.hypot(gx,gy);
      direction[p]=Math.abs(gy)<Math.abs(gx)*.414?1:Math.abs(gy)>Math.abs(gx)*2.414?w:gx*gy>0?w+1:w-1;
    }
    // Suppress neighboring gradient maxima, retaining fine one-pixel drawing lines.
    for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
      const p=y*w+x,i=p*4,offset=direction[p],value=magnitude[p];
      if(value<magnitude[p-offset]||value<=magnitude[p+offset])continue;
      const strength=clamp((value-21)/100);
      dst.data[i]=218;dst.data[i+1]=188;dst.data[i+2]=245;dst.data[i+3]=strength*src.data[i+3]*.85;
    }
    g.putImageData(dst,0,0);return c;
  }
  const ready=ChatGPTEyes.ready.then(()=>{
    frames.push(...ChatGPTEyes.frames.map(prepare));contours=edgeField(frames[4]);
  });
  function draw(ctx,t){
    if(!frames.length||t<11200)return;
    const wire=ease(phase(t,11200,14300))*(1-ease(phase(t,16000,17900)));
    const material=ease(phase(t,14300,16900));
    const frameTime=ChatGPTEyes.sample(t);
    const alive=ease(phase(frameTime,16900,17600));
    const drift=Math.sin(t*.00055)*2.5;
    const breath=1+.006*Math.sin((t-12000)*.0007);
    ctx.save();ctx.translate(W*.76,H*.5+drift);ctx.scale(breath,breath);ctx.translate(-W*.76,-H*.5);
    if(material>0){
      const blink=ChatGPTEyes.at(frameTime,19700);
      const level=(1-alive*(1-blink))*4,a=Math.floor(level),b=Math.min(4,a+1),mix=level-a;
      ctx.save();ctx.globalAlpha*=material;
      if(mix===0)ctx.drawImage(frames[a],0,0);
      else{
        // Add premultiplied layers to retain the exact opacity of the feathered edges.
        blendCtx.clearRect(0,0,W,H);blendCtx.globalCompositeOperation='source-over';
        blendCtx.globalAlpha=1-mix;blendCtx.drawImage(frames[a],0,0);
        blendCtx.globalCompositeOperation='lighter';blendCtx.globalAlpha=mix;blendCtx.drawImage(frames[b],0,0);
        blendCtx.globalAlpha=1;blendCtx.globalCompositeOperation='source-over';ctx.drawImage(blend,0,0);
      }
      ctx.restore();
    }
    if(wire>0){
      ctx.save();ctx.globalAlpha*=wire;ctx.beginPath();ctx.rect(0,0,W,Math.min(H,H*phase(t,11200,14400)));ctx.clip();
      ctx.shadowColor='#a577d4';ctx.shadowBlur=3;ctx.drawImage(contours,0,0,W,H);ctx.restore();
    }
    ctx.restore();
    // Fine telemetry shares the same focal plane as the portrait, rather than enclosing it in a card.
    const sweep=ease(phase(t,12000,15100))*(1-ease(phase(t,16200,17500)));
    if(sweep>0){
      const y=130+phase(t,12000,16400)*660;
      ctx.save();ctx.globalAlpha*=sweep*.7;
      const light=ctx.createLinearGradient(780,y,1850,y);light.addColorStop(0,'transparent');light.addColorStop(.6,'#bc9bdc');light.addColorStop(1,'transparent');
      ctx.strokeStyle=light;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(780,y);ctx.lineTo(1850,y);ctx.stroke();ctx.restore();
    }
    const lights=ease(phase(t,13000,17000));
    ctx.save();ctx.globalAlpha*=lights;
    for(let i=0;i<17;i++){
      const x=760+((i*137.7)%1070),y=145+((i*91.3+t*.008)%640),a=.08+.15*(.5+.5*Math.sin(i+t*.001));
      ctx.fillStyle=`rgba(211,184,238,${a})`;ctx.fillRect(x,y,i%3?1.4:2.6,i%3?1.4:2.6);
    }
    ctx.restore();
  }
  window.ChatGPTPortrait={ready,draw};
})();
