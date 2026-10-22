/*
 * ChatGPT / Rhine archive sequence.
 * Adapts the step text, fixed-width character reveal, reticle geometry and
 * finale staging of dsh-startup-screen, Copyright (c) 2026 沈宏宏, MIT.
 * Source: 6shenhonghong9/dsh-startup-screen @ 8ec3132e69f0906b3ed2f7eb083b1035cd69c1d4
 * License and media attribution: third-party/dsh-startup-screen/.
 * Existing ChatGPT contour and portrait renderers remain the artwork sources.
 */
(() => {
  'use strict';
  const W=1920,H=1080,PAGE_SPEED=1,PAGE_END=16500;
  const extraTime=PAGE_END/PAGE_SPEED-PAGE_END;
  const toPlaybackTime=ms=>ms<PAGE_END?ms/PAGE_SPEED:ms+extraTime;
  const DURATION=Math.ceil(toPlaybackTime(24000)*60/1000)*1000/60;
  const C={paper:'#212121',ink:'#eeeaf4',accent:'#c1a0df',muted:'#a99bae',hair:'#49414f',faint:'#312c36'};
  const mono='Consolas, "Courier New", monospace',sans='"Bahnschrift", "Arial", sans-serif',zh='"Microsoft YaHei", "Segoe UI", sans-serif';
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), phase=(t,a,b)=>clamp((t-a)/(b-a));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v)}, out=v=>1-Math.pow(1-clamp(v),3);
  const windowed=(t,a,b,c,d)=>ease(phase(t,a,b))*(1-ease(phase(t,c,d)));
  const steps=[
    {start:3600,end:6200,zh:'需要访问许可',en:'ACCESS PERMISSION REQUIRED',badge:'AUTHORIZATION',audio:'line-1'},
    {start:6200,end:8700,zh:'身份资料确认',en:'IDENTITY VERIFICATION',badge:'IDENTITY',audio:'line-2'},
    {start:8700,end:11100,zh:'接收访问需求',en:'ACCESS REQUEST RECEIVED',badge:'REQUEST',audio:'line-3'},
    {start:11100,end:13600,zh:'开始读取权限',en:'PERMISSION READ STARTED',badge:'READ',audio:'line-4'},
    {start:13600,end:16500,zh:'读取完毕 · 核验通过',en:'READ COMPLETE · VERIFIED',badge:'VERIFY',audio:'line-5'}
  ];
  const stages=[{start:0,end:3600,cn:'系统接入'},...steps.map(s=>({start:s.start,end:s.end,cn:s.zh})),{start:16500,end:24000,cn:'角色唤醒 · 欢迎回来'}].map(s=>({...s,start:toPlaybackTime(s.start),end:toPlaybackTime(s.end)}));
  const canvas=document.getElementById('screen'),ctx=canvas.getContext('2d',{alpha:false});
  const IDLE_DURATION=4800;
  const chibiFrames={},reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const chibiReady=Promise.all(['idle','work','wave'].map(async pose=>{
    const image=new Image();image.src=`assets/chatgpt-chibi-${pose}.png`;await image.decode();
    const plate=document.createElement('canvas');plate.width=512;plate.height=512;
    const g=plate.getContext('2d'),scale=Math.min(512/image.naturalWidth,512/image.naturalHeight);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    g.filter='brightness(.86) saturate(.78)';g.drawImage(image,(512-w)/2,(512-h)/2,w,h);
    chibiFrames[pose]=plate;
  }));
  function chibi(pose,x,y,size,time){
    const image=chibiFrames[pose];if(!image)return;
    const wave=reducedMotion.matches?0:Math.sin(time*Math.PI*2/4800);
    ctx.save();ctx.translate(x+size/2,y+size*.94);
    ctx.scale(1+wave*.004,1+wave*.009);
    ctx.rotate(reducedMotion.matches?0:Math.sin(time*Math.PI*2/6400)*.008);
    ctx.drawImage(image,-size/2,-size*.94,size,size);ctx.restore();
  }
  let operatorFull,operatorBust;
  const operatorBlend=document.createElement('canvas'),operatorBlendCtx=operatorBlend.getContext('2d');
  const operatorReady=(async()=>{
    const images=await Promise.all(['chatgpt-operator.png','chatgpt-operator-blink.png'].map(async name=>{const image=new Image();image.src='assets/'+name;await image.decode();return image}));
    // Confine the second image to the eyelids so clothing and accessories never flicker.
    const patch=document.createElement('canvas');patch.width=1024;patch.height=1536;const pg=patch.getContext('2d');
    const mask=pg.createRadialGradient(486,195,32,486,195,79);mask.addColorStop(0,'#000');mask.addColorStop(.68,'#000');mask.addColorStop(1,'transparent');
    pg.save();pg.translate(486,195);pg.scale(1,.52);pg.translate(-486,-195);pg.fillStyle=mask;pg.fillRect(400,110,172,170);pg.restore();
    pg.globalCompositeOperation='source-in';pg.drawImage(images[1],0,0);
    const closed=document.createElement('canvas');closed.width=1024;closed.height=1536;const cg=closed.getContext('2d');cg.drawImage(images[0],0,0);cg.drawImage(patch,0,0);
    const plate=(image,w,h,sx,sy,sw,sh)=>{
      const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
      g.filter='brightness(.78) saturate(.68)';g.drawImage(image,sx,sy,sw,sh,0,0,w,h);return c;
    };
    operatorFull=[images[0],closed].map(image=>plate(image,720,1080,0,0,1024,1536));
    operatorBust=[images[0],closed].map(image=>plate(image,476,432,180,0,660,600));
  })();
  function operator(plates,x,y,w,h,time){
    if(!plates)return;
    const cycle=((time%IDLE_DURATION)+IDLE_DURATION)%IDLE_DURATION,wave=cycle/IDLE_DURATION*Math.PI*2;
    const blink=windowed(cycle,1250,1380,1450,1660),sw=plates[0].width,sh=plates[0].height;
    if(operatorBlend.width!==sw||operatorBlend.height!==sh){operatorBlend.width=sw;operatorBlend.height=sh}
    const g=operatorBlendCtx;g.clearRect(0,0,sw,sh);g.globalCompositeOperation='source-over';g.globalAlpha=1-blink;g.drawImage(plates[0],0,0);
    g.globalCompositeOperation='lighter';g.globalAlpha=blink;g.drawImage(plates[1],0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
    ctx.save();ctx.translate(x+w/2,y+h);ctx.scale(1+.0035*Math.sin(wave),1+.006*Math.sin(wave));ctx.translate(-w/2,-h);
    // Keep one continuous surface so translucent hair never shows strip seams.
    const sway=.0035*Math.sin(wave+.5);ctx.transform(1,0,sway,1,-sway*h,0);
    ctx.drawImage(operatorBlend,0,0,w,h);
    ctx.restore();
  }
  function layer(a,fn){if(a<=0)return;ctx.save();ctx.globalAlpha*=clamp(a);fn();ctx.restore()}
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
  function line(x,y,xx,yy,c=C.hair,w=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke()}
  function circle(x,y,r,c,w=1,a=0,b=Math.PI*2){ctx.beginPath();ctx.arc(x,y,r,a,b);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke()}
  function dot(x,y,r,c=C.accent){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill()}
  function text(s,x,y,size=14,c=C.ink,font=mono,spacing=0,align='left'){
    ctx.save();ctx.font=`${size}px ${font}`;ctx.fillStyle=c;ctx.textBaseline='middle';
    const chars=Array.from(s),widths=chars.map(ch=>ctx.measureText(ch).width),width=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*spacing;
    let px=align==='center'?x-width/2:align==='right'?x-width:x;
    chars.forEach((ch,i)=>{ctx.fillText(ch,px,y);px+=widths[i]+spacing});ctx.restore();
  }
  // Adapted typeIn: reserve the final line width before revealing each glyph.
  // This avoids the centered line jumping as characters arrive.
  function typeIn(s,x,y,size,t,start,stagger,font=mono,spacing=1.5,color=C.ink){
    ctx.save();ctx.font=`${size}px ${font}`;
    const chars=Array.from(s),widths=chars.map(ch=>ctx.measureText(ch).width);
    let px=x-(widths.reduce((a,b)=>a+b,0)+(chars.length-1)*spacing)/2;
    chars.forEach((ch,i)=>{const a=out(phase(t,start+i*stagger,start+i*stagger+300));layer(a,()=>text(ch,px,y+(1-a)*5,size,color,font));px+=widths[i]+spacing});ctx.restore();
  }
  function cross(x,y,size=5,c=C.hair){line(x-size,y,x+size,y,c);line(x,y-size,x,y+size,c)}
  function background(t){
    rect(0,0,W,H,C.paper);
    const g=ctx.createRadialGradient(1090,440,40,1090,440,1200);g.addColorStop(0,'#302735');g.addColorStop(.6,'#252229');g.addColorStop(1,C.paper);rect(0,0,W,H,g);
    // Vertical archive plate watermark adapted from upstream's watermark boxes.
    layer(.45,()=>{[[.60,.16],[.78,.16],[.96,.16],[.05,.10]].forEach(([x,w],i)=>rect(x*W,0,w*W,i===3?H*.5:H,i%2?'#2c2730':'#29252d'))});
    layer(.17,()=>{for(let x=100;x<1900;x+=120)for(let y=140;y<980;y+=120)rect(x,y,1.2,1.2,C.muted)});
    // Start the portrait only after the verification page has completely left.
    // Retain the original eye-opening and blink times after the shorter line reveal.
    if(t>=16500){
      const portraitTime=t<18100?11200+(t-16500)*3100/1600:
        t<19060?14300+(t-18100)*2600/960:
        t<19620?16900+(t-19060)*700/560:17600+t-19620;
      ChatGPTPortrait.draw(ctx,portraitTime);
    }
  }
  function shell(t){
    const enter=out(phase(t,2950,3850)),panelExit=1-ease(phase(t,16400,17700));
    layer(enter,()=>{
      const wipe=out(phase(t,3100,3850));ctx.save();ctx.beginPath();ctx.rect(84,40,700*wipe,124);ctx.clip();
      ChatGPTMark.draw(ctx,109,74,38,{color:C.ink});text('ChatGPT',145,73,27,C.ink,sans,1.9);
      text('SYNTHESIZE INTELLIGENCE',87,113,10,C.muted,mono,1.6);text('PERSONAL',87,139,12,C.ink,sans,2.1);text('RESEARCH TERMINAL',180,139,10,C.accent,mono,1.2);ctx.restore();
      text('REV 02 / LOCAL SESSION',1834,74,11,C.muted,mono,1.2,'right');
      text('COGNITIVE SYSTEMS   ·   GPT–001',1834,103,10,C.muted,mono,1,'right');
      [[64,174,1,1],[1856,174,-1,1],[64,958,1,-1],[1856,958,-1,-1]].forEach(([x,y,sx,sy])=>{line(x,y,x+sx*28,y,C.muted);line(x,y,x,y+sy*28,C.muted)});
      layer(.55,()=>{line(64,174,1856,174);line(64,958,1856,958)});
      const index=t<3600?0:t>=16500?6:steps.findIndex(s=>t<s.end)+1;
      layer(panelExit,()=>{
        for(let i=0;i<6;i++){const on=i<index;rect(86,450+i*25,on?30:14,4,on?C.accent:C.hair)}
        text('[ '+String(index).padStart(2,'0')+' / 06 ]',1834,210,12,C.accent,mono,1.6,'right');
        text(t<3600?'INITIALIZATION':index<6?steps[index-1].badge:'WELCOME',1834,238,10,C.muted,mono,1.3,'right');
      });
      text('HUMAN INTENT / MACHINE INTELLIGENCE',85,1001,10,C.muted,mono,1.3);
      text('CHATGPT  /  PERSONAL ARCHIVE',1834,1001,10,C.muted,mono,1.3,'right');
      dot(87,974,2);text('CONNECTION / LOCAL',99,975,8,C.muted,mono,1.0);
    });
  }
  function opening(t){
    if(t>=3650)return;
    layer(1-ease(phase(t,2660,3400)),()=>{
      rect(0,0,W,H,'#18171a');
      const a=out(phase(t,300,1100));
      layer(a,()=>{
        ChatGPTMark.draw(ctx,960,438,106,{trace:phase(t,420,1850),fill:ease(phase(t,1850,2350)),heads:true,color:C.ink});
        text('ChatGPT',960,547,30,C.ink,sans,4+(1-a)*8,'center');
        text('COGNITIVE SYSTEMS',960,586,10,C.muted,mono,2.5,'center');
        const p=phase(t,1980,2760);layer(Math.sin(p*Math.PI)*.7,()=>{const x=700+p*520;line(x,395,x,630,C.accent,1)});
      });
    });
    // The reference's exposure wash becomes a subdued lavender wash on charcoal.
    layer(windowed(t,2700,2930,3030,3550)*.28,()=>rect(0,0,W,H,'#cabcd6'));
    layer(windowed(t,2820,2960,3030,3460),()=>{const y=H*phase(t,2820,3460);line(0,y,W,y,'#d7c4e7',1.4)});
  }
  function identity(t,start){
    layer(out(phase(t,start+380,start+850)),()=>{
      const x=710,y=556,w=500;line(x,y,x+w,y,C.muted);
      [['身份名称','ChatGPT'],['身份编号','GPT–001'],['权限等级','PERSONAL']].forEach(([label,value],i)=>{const yy=y+42+i*46;text(label,x+14,yy,13,C.muted,zh,1);text(value,x+w-14,yy,16,C.ink,mono,1,'right');line(x,yy+23,x+w,yy+23,C.faint)});
      layer(ease(phase(t,start+1700,start+2000)),()=>{dot(851,763,3);text('IDENTITY CONFIRMED',873,763,11,C.accent,mono,1.6)});
    });
  }
  function hex(t,start,alpha){
    layer(alpha,()=>{
      text('PERMISSION BUFFER',1750,570,10,C.accent,mono,1,'right');
      const frame=Math.floor((t-start)/75);
      for(let row=0;row<14;row++){
        let value='';for(let col=0;col<3;col++){const v=((row+17)*2654435761+(col+3)*2246822519+frame*3266489917)>>>0;value+=v.toString(16).padStart(8,'0').slice(-4).toUpperCase()+' ';}
        text(value,1750,600+row*14,9,row===frame%14?C.accent:C.muted,mono,1.2,'right');
      }
    });
  }
  // The two 290-degree arcs, bracket angles and dot coordinates are adapted
  // directly from upstream's reticle(). The bottom gap leaves text clear.
  function reticle(t,start){
    const a=out(phase(t,start,start+600));
    layer(a,()=>{
      const scale=1.85-(1-a)*.06;ctx.save();ctx.translate(960,515);ctx.scale(scale,scale);ctx.lineCap='round';
      const arc=(r,a0,a1,c,w,spin=0,progress=1)=>{const rad=d=>(d-90)*Math.PI/180,end=a0+(a1-a0)*progress;if(progress>0)circle(0,0,r,c,w,rad(a0)+spin,rad(end)+spin);return{x:r*Math.cos(rad(end)+spin),y:r*Math.sin(rad(end)+spin)}};
      const spin=Math.sin((t-start)*.00032)*.035;
      const outer=ease(phase(t,start+80,start+1580)),inner=ease(phase(t,start+340,start+1890));
      const p=arc(150,215,505,C.ink,2.8,spin,outer);layer(outer>0?1:0,()=>{dot(p.x,p.y,4.5,C.accent);circle(p.x,p.y,8,C.accent,.6)});
      const q=arc(104,200,490,C.muted,1,-spin,inner);layer(inner>0?1:0,()=>dot(q.x,q.y,2.3,C.accent));
      arc(62,118,242,C.hair,.9,0,ease(phase(t,start+700,start+1580)));arc(62,298,422,C.hair,.9,0,ease(phase(t,start+850,start+1730)));
      for(let i=0;i<=58*outer;i++){const angle=(125+i*5)*Math.PI/180+spin,r=i%5===0?140:143;line(r*Math.cos(angle),r*Math.sin(angle),146*Math.cos(angle),146*Math.sin(angle),i%5===0?C.accent:C.hair,.55)}
      layer(inner,()=>[[-48,-68],[52,68],[78,-50]].forEach(([x,y])=>dot(x,y,1.6)));ctx.restore();
      const scan=phase(t,start+200,start+1700);layer(Math.sin(scan*Math.PI)*.5,()=>line(710,318+scan*390,1210,318+scan*390,C.accent));
      layer(ease(phase(t,start+1600,start+2150)),()=>{text('CHECKSUM  /  MATCHED',960,833,10,C.accent,mono,2,'center');text('SIGNATURE '+Math.floor(phase(t,start,start+2100)*100).toString().padStart(3,'0')+'%',960,858,9,C.muted,mono,1.3,'center')});
    });
  }
  function archivePanels(t,index,motionTime){
    const step=steps[index],local=t-step.start,p=phase(t,step.start,step.end-250);
    const heading=(label,x,y,w=396)=>{text(label,x,y,12,C.accent,mono,1.5);line(x,y+23,x+w,y+23)};
    const corner=(x,y,w,h)=>{[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([xx,yy,sx,sy])=>{line(xx,yy,xx+sx*12,yy,C.muted);line(xx,yy,xx,yy+sy*12,C.muted)})};
    const check=(x,y,a=1)=>layer(a,()=>{line(x,y,x+5,y+5,C.accent,1.6);line(x+5,y+5,x+15,y-7,C.accent,1.6)});
    layer(out(phase(t,step.start,step.start+500)),()=>{
      if(index===0){
        // Permission page: a scope checklist and a complete character projection.
        heading('01 / ACCESS SCOPE',172,338);
        text('本次连接范围',172,404,22,C.ink,zh,2);
        ['对话上下文','个人工作空间','协作界面'].forEach((label,i)=>{
          const y=470+i*83;corner(172,y-18,31,31);text('0'+(i+1),188,y-2,10,C.accent,mono,0,'center');
          text(label,226,y-2,16,C.ink,zh,1);text(['CONTEXT / ATTACH','WORKSPACE / LOCAL','INTERFACE / LINK'][i],226,y+24,9,C.muted,mono,1.2);
          line(226,y+47,568,y+47,C.faint);
        });
        text('SESSION / WAITING FOR PERMISSION',172,760,10,C.muted,mono,1);
        heading('PERSONA / ACCESS LIAISON',1358,272,402);
        corner(1358,310,402,532);
        layer(.45,()=>{line(1559,320,1559,830,C.hair);for(let i=0;i<12;i++){const y=330+i*43;line(1369,y,1375+(i%3===0?7:0),y,C.muted);line(1743-(i%3===0?7:0),y,1749,y,C.muted)}});
        const appear=out(phase(local,120,800));
        layer(appear,()=>operator(operatorFull,1383,308+(1-appear)*12,352,528,motionTime-step.start));
        text('GPT–001',1358,858,9,C.accent,mono,1.1);
        text('STANDBY',1760,858,9,C.muted,mono,1.1,'right');
      } else if(index===1){
        // Identity page: one tall credential card, a signature scanner and serial strip.
        heading('02 / IDENTITY CREDENTIAL',172,338);
        corner(172,395,330,395);rect(173,396,328,42,C.faint);text('PERSONAL / ARCHIVE 001',194,417,10,C.ink,mono,1.4);
        layer(out(phase(local,140,700)),()=>operator(operatorBust,218,443,238,216,motionTime-step.start));
        for(let i=0;i<9;i++){const y=464+i*22;line(194,y,199+(i%4===0?5:0),y,C.hair);line(475-(i%4===0?5:0),y,480,y,C.hair)}
        text('GPT–001',337,683,22,C.ink,sans,3,'center');
        for(let i=0;i<54;i++)rect(207+i*4.9,711,i%3===0?2.5:1,28+(i%4)*4,C.muted);
        text('ID / 26 10 22 / VERIFIED',337,770,9,C.muted,mono,1.2,'center');
        heading('SIGNATURE MATCH',1390,338,358);
        corner(1410,410,316,246);
        for(let i=0;i<8;i++){ctx.beginPath();for(let j=0;j<=90;j++){const xx=1425+j*3.15,yy=438+i*25+Math.sin(j*.11+i*.7)*14+Math.sin(j*.04)*7;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle=i===Math.floor(p*8)?C.accent:C.hair;ctx.lineWidth=1;ctx.stroke()}
        const scanX=1425+284*p;line(scanX,418,scanX,650,C.accent,1.2);text('SIGNATURE / '+Math.floor(p*100).toString().padStart(3,'0')+'%',1390,704,11,C.ink,mono,1.2);
        line(1390,732,1748,732);text('ARCHIVE FOUND',1390,760,10,C.muted,mono,1.4);check(1727,761,ease(phase(local,1200,1550)));
      } else if(index===2){
        // Request page: a left-to-right transport schematic and packet histogram.
        heading('03 / CONNECTION PATH',172,338);
        const route=[[197,453,'INPUT'],[365,560,'ROUTE'],[533,667,'CORE']];
        route.forEach(([x,y,label],i)=>{if(i){const prev=route[i-1];line(prev[0]+22,prev[1],x,prev[1],C.hair);line(x,prev[1],x,y-22,C.hair)}corner(x-22,y-22,44,44);text('0'+(i+1),x,y,11,C.accent,mono,1,'center');text(label,x,y+47,10,C.muted,mono,1.6,'center')});
        layer(p,()=>{line(219,453,365,453,C.accent,1.5);line(365,453,365,538,C.accent,1.5);line(387,560,533,560,C.accent,1.5);line(533,560,533,645,C.accent,1.5)});
        text('HANDSHAKE / '+(p>.55?'ACKNOWLEDGED':'ESTABLISHING'),172,770,10,C.muted,mono,1.2);
        heading('PACKET STREAM',1390,338,358);
        for(let row=0;row<4;row++)line(1390,432+row*62,1748,432+row*62,C.faint);
        for(let i=0;i<22;i++){const h=(30+Math.sin(i*1.8+local*.003)*23+(i%5)*25)*out(phase(local,i*27,300+i*27));rect(1398+i*16,617-h,7,h,i%4===0?C.accent:C.muted)}
        line(1390,618,1748,618,C.muted);text('RECEIVE',1390,659,9,C.muted,mono,1.4);text(Math.floor(p*2048).toString().padStart(4,'0')+' KB',1748,659,22,C.ink,mono,1,'right');
        ['CONTEXT','INTENT','REQUEST'].forEach((label,i)=>{rect(1390+i*123,713,110,33,C.faint);text(label,1445+i*123,730,9,C.accent,mono,1,'center')});
        layer(out(phase(local,140,650)),()=>chibi('idle',400,374,190,motionTime));
      } else if(index===3){
        // Reading page: three independent memory blocks; waterfall occupies the right.
        heading('04 / MODULE ALLOCATION',172,338);
        ['CORE ENGINE','CONTEXT CACHE','PERSONA LAYER'].forEach((label,i)=>{
          const y=422+i*112,v=clamp(p*1.8-i*.24);corner(172,y,396,86);text('0'+(i+1),190,y+25,10,C.accent,mono,1);text(label,232,y+25,13,C.ink,mono,1.1);
          for(let j=0;j<28;j++)rect(191+j*12.7,y+56,8,10,j<Math.floor(v*28)?C.accent:C.faint);
          text(v>=1?'LOADED':'READING',550,y+25,9,C.muted,mono,1,'right');
        });
        text('MEMORY MAP / LOCAL SESSION',172,798,9,C.muted,mono,1.1);
        heading('LIVE MEMORY',1390,338,358);
        for(let row=0;row<5;row++)for(let col=0;col<18;col++){const on=((row*17+col*13+Math.floor(t/95))%31)<12;rect(1390+col*20,405+row*23,13,13,on?C.accent:C.faint)}
        text('BUFFER / STREAM ACTIVE',1390,539,9,C.muted,mono,1.2);
        layer(out(phase(local,140,650)),()=>chibi('work',1378,580,248,motionTime));
      } else {
        // Verification page: signed result stamps and a polar integrity plot.
        heading('05 / VERIFICATION RESULTS',172,338);
        ['身份签名一致','上下文挂载完成','权限读取通过','认知链路就绪'].forEach((label,i)=>{
          const y=436+i*76,a=ease(phase(local,200+i*250,650+i*250));
          circle(187,y,14,C.hair);check(180,y,a);text(label,222,y,16,C.ink,zh,1.5);
          layer(a,()=>{rect(484,y-12,84,23,C.faint);text('PASSED',526,y,9,C.accent,mono,1.2,'center')});
        });
        text('REPORT / GPT–001 / MATCHED',172,797,10,C.muted,mono,1.1);
        heading('INTEGRITY MATRIX',1390,338,358);
        const cx=1568,cy=541;
        for(let r=42;r<=126;r+=42){ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.strokeStyle=C.hair;ctx.lineWidth=.8;ctx.stroke()}
        for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;line(cx,cy,cx+126*Math.cos(a),cy+126*Math.sin(a),C.faint)}
        ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,r=(96+15*Math.sin(i*1.9))*out(p),x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fillStyle='#c1a0df18';ctx.fill();ctx.strokeStyle=C.accent;ctx.lineWidth=1.8;ctx.lineJoin='round';ctx.stroke();ctx.lineJoin='miter';
        text('6 / 6',cx,cy+3,26,C.ink,mono,2,'center');text('CHANNELS NOMINAL',cx,688,10,C.muted,mono,1.8,'center');
        line(1390,742,1550,742);text('CHECKSUM',1390,775,10,C.muted,mono,1.3);text('C01–GPT–001',1390,804,12,C.accent,mono,1);
        layer(out(phase(local,300,800)),()=>chibi('wave',1584,697,172,motionTime));
      }
      // Shared navigation keeps orientation while the actual page layouts differ.
      for(let i=0;i<5;i++){
        const xx=172+i*327,done=i<index,on=i===index;
        line(xx,876,xx+260,876,done?C.accent:C.hair,done?1.5:1);
        if(on)line(xx,876,xx+260*p,876,C.accent,2);
        text('0'+(i+1),xx,899,10,on||done?C.accent:C.muted,mono,1);
        text(['AUTHORIZE','IDENTIFY','CONNECT','READ','VERIFY'][i],xx+34,899,10,on?C.ink:C.muted,mono,1.4);
      }
    });
  }
  function accessSequence(t,motionTime){
    const index=steps.findIndex(s=>t>=s.start&&t<s.end);if(index<0)return;
    const s=steps[index],fade=1-ease(phase(t,s.end-(index===4?350:150),s.end));
    layer(fade,()=>{
      archivePanels(t,index,motionTime);
      const verification=index===4,cy=verification?515:425;
      if(verification)reticle(t,s.start);
      typeIn(s.zh,960,cy,verification?27:31,t,s.start,46,zh,5);
      typeIn(s.en,960,cy+43,10,t,s.start+90,13,mono,2.0,C.muted);
      if(!verification){const grow=out(phase(t,s.start+120,s.start+550));line(960-150*grow,cy+78,960+150*grow,cy+78,C.hair)}
      if(index===0){layer(out(phase(t,5250,5500)),()=>{rect(828,556,264,48,C.ink);text('申请访问许可',949,580,16,C.paper,zh,2,'center');text('→',1064,580,19,C.paper,sans);text('点击继续 · ENTER',960,636,11,C.muted,zh,1.5,'center')})}
      if(index===1)identity(t,s.start);
      if(index===2){
        const trace=phase(t,8700,10450),fill=ease(phase(t,10350,10950));
        const ring=ease(phase(t,8820,10750));
        circle(960,630,122,C.hair,.8);
        if(ring>0){circle(960,630,139,C.accent,2.4,-Math.PI/2,-Math.PI/2+Math.PI*2*ring);dot(960+139*Math.sin(Math.PI*2*ring),630-139*Math.cos(Math.PI*2*ring),3,C.ink)}
        ChatGPTMark.draw(ctx,960,630,154,{trace,fill,heads:true,color:C.ink});
        layer(ease(phase(t,10200,10900)),()=>text('C H A T G P T',960,798,11,C.muted,mono,1.5,'center'));
      }
      if(index===3){
        const progress=ease(phase(t,s.start+150,s.end-300));
        text(String(Math.floor(progress*100)).padStart(2,'0'),936,622,116,C.ink,mono,2,'center');text('%',1074,641,30,C.accent,mono);
        for(let i=0;i<38;i++)rect(750+i*11,717,6,24,i<Math.floor(progress*38)?C.accent:C.faint);
        text('READING / COGNITIVE MODULES',960,789,10,C.muted,mono,1.8,'center');
        hex(t,s.start,out(phase(t,s.start,s.start+400))*.7);
      }
    });
  }
  function persona(t){
    const a=out(phase(t,16500,17700));
    layer(a,()=>{
      text('PERSONAL WORKSTATION / 001',172,258,11,C.muted,mono,2.0);line(172,285,755,285);
      ChatGPTMark.draw(ctx,217,378,84,{trace:phase(t,16600,17900),fill:ease(phase(t,17900,18400)),heads:true,color:C.ink});
      text('COGNITIVE ASSISTANT',286,364,11,C.muted,mono,1.8);
      text(t<19620?'PERSONA / AWAKENING':'PERSONA / ONLINE',286,392,10,C.accent,mono,1.5);
      text('ChatGPT',166,510,103,C.ink,sans,6.5);
      const complete=ease(phase(t,19800,20700));
      layer(1-complete,()=>{
        text('认知协作助手 / 人格投影连接中',176,581,17,C.muted,zh,2);
        [['IDENTITY','GPT–001 / FEMALE',17700],['VISUAL SIGNATURE','SILVER / LAVENDER',18200],['LINK STATUS','CONNECTED',19200]].forEach(([l,v,at],i)=>layer(out(phase(t,at,at+500)),()=>{const y=641+i*42;dot(179,y,2);text(l,194,y,9,C.muted,mono,1);text(v,755,y,11,C.ink,mono,1,'right');line(174,y+19,755,y+19)}));
      });
      layer(complete,()=>{
        text('专业协作模式 · 已就绪',178,588,20,C.accent,zh,3);
        text('与你一起，构建下一步。',178,651,22,C.ink,zh,3);line(178,697,752,697);
        text('WELCOME',178,736,11,C.muted,mono,3);
      });
      layer(out(phase(t,19300,20000))*.7,()=>{text('GPT–001',1755,811,10,C.ink,mono,1.5,'right');text('COGNITIVE LINK / STABLE',1755,835,9,C.muted,mono,1,'right');line(1565,787,1755,787)});
    });
    // One short split-color accent from the reference's finale; the portrait
    // stays pixel-aligned and the last 1.4 seconds still fade to app charcoal.
    const burst=windowed(t,21000,21080,21280,21550);
    layer(burst*.24,()=>{ctx.globalCompositeOperation='screen';text('ChatGPT',163,510,103,'#bcb4ee',sans,6.5);text('ChatGPT',169,510,103,'#d8b2dc',sans,6.5)});
    layer(burst*.45,()=>{const g=ctx.createLinearGradient(120,0,1050,0);g.addColorStop(0,'transparent');g.addColorStop(.5,'#ccb0e5');g.addColorStop(1,'transparent');rect(120,552,930,1.5,g)});
  }
  function render(ms,idleMilliseconds=0){
    const real=clamp(ms,0,DURATION),t=real<PAGE_END/PAGE_SPEED?real*PAGE_SPEED:real-extraTime;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.lineCap='butt';ctx.lineJoin='miter';
    background(t);shell(t);accessSequence(t,t+idleMilliseconds);persona(t);opening(t);
    layer(ease(phase(t,22600,24000)),()=>rect(0,0,W,H,C.paper));return real;
  }
  window.ChatGPTRhine={duration:DURATION,pageSpeed:PAGE_SPEED,toPlaybackTime,permissionGate:{showAt:toPlaybackTime(5250),holdAt:toPlaybackTime(5950),nextAt:toPlaybackTime(6200)},steps:steps.map(s=>({...s,start:toPlaybackTime(s.start),end:toPlaybackTime(s.end)})),stages,ready:Promise.all([ChatGPTPortrait.ready,operatorReady,chibiReady]),render,idleDuration:IDLE_DURATION,renderPermissionIdle:ms=>render(toPlaybackTime(5950),ms)};
})();
