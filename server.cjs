const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname);
function createServer(){return http.createServer((req,res)=>{
 let route;try{route=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end('Bad request');return}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return}
 const name=route==='/'?'index.html':route.slice(1);
 if(!/^(index|terminal|operator|archives|workspace)\.html$|^(assets|output)\/[a-z0-9-]+\.(css|js|svg|png|jpg|mp4|wav)$|^assets\/rhine-audio\/(line-[1-6]|sfx-tick|sfx-ticks-run)\.mp3$/i.test(name)){res.writeHead(404);res.end('Not found');return}
 const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.mp4':'video/mp4','.wav':'audio/wav','.mp3':'audio/mpeg','.png':'image/png','.jpg':'image/jpeg'};
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);res.end();return}const headers={'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','Accept-Ranges':'bytes'};
  if(req.method==='HEAD'){res.writeHead(200,{...headers,'Content-Length':stat.size});res.end();return}
  const range=req.headers.range&&req.headers.range.match(/^bytes=(\d+)-(\d*)$/);if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):stat.size-1,stat.size-1);if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res)}else{res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res)}});
})}
module.exports={createServer};
if(require.main===module){
 const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be 1-65535');
 createServer().listen(port,host,()=>console.log(`Preview: http://${host}:${port}`));
}

