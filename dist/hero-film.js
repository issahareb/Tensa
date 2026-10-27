// One fully downloaded, independently seekable film. Only one seek can be in
// flight; intermediate scroll targets are coalesced, never queued or replayed.
export async function createHeroFilm(canvas){
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.disableRemotePlayback=true;
 const mobile=matchMedia('(pointer:coarse)').matches;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 let url;try{const response=await fetch(mobile?'/assets/shop/editorial/hero-mobile.mp4':'/assets/shop/editorial/hero-desktop.mp4',{signal:controller.signal});if(!response.ok)throw Error('Film unavailable');url=URL.createObjectURL(await response.blob())}finally{clearTimeout(timer)}
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Film unavailable')),12000);video.onloadeddata=()=>{clearTimeout(timeout);resolve()};video.onerror=()=>{clearTimeout(timeout);reject(Error('Film decode unavailable'))};video.src=url;video.load()}).catch(e=>{URL.revokeObjectURL(url);throw e});
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');
 const fps=24,lastFrame=Math.max(0,video.duration-1/fps);let width=1,height=1,wanted=0,shown=0,seeking=false,inflight=null,disposed=false;
 function paint(time){if(disposed)return;ctx.drawImage(video,0,0,width,height);shown=time;canvas.dataset.time=time.toFixed(4);canvas.dataset.progress=(time/lastFrame).toFixed(5)}
 function seek(){if(disposed||seeking||Math.abs(wanted-shown)<.5/fps)return;seeking=true;inflight=wanted;video.currentTime=wanted}
 video.addEventListener('seeked',()=>{if(inflight===null||disposed)return;const candidate=inflight;inflight=null;seeking=false;
   // Never present an older image while the most recent intent is forward,
   // or a later image after the user has reversed direction.
   const lower=Math.min(wanted,shown)-.001,upper=Math.max(wanted,shown)+.001;
   if(candidate>=lower&&candidate<=upper)paint(candidate);
   seek();
 });
 function resize(w,h){const dpr=Math.min(devicePixelRatio,2),pw=Math.round(w*dpr),ph=Math.round(h*dpr);width=w;height=h;if(canvas.width===pw&&canvas.height===ph)return;canvas.width=pw;canvas.height=ph;ctx.setTransform(dpr,0,0,dpr,0,0);if(!seeking)paint(shown)}
 function draw(progress){wanted=Math.min(lastFrame,Math.round(Math.max(0,Math.min(1,progress)) * lastFrame*fps)/fps);canvas.dataset.targetTime=wanted.toFixed(4);seek()}
 paint(0);
 return {resize,draw,dispose(){disposed=true;controller.abort();video.removeAttribute('src');video.load();URL.revokeObjectURL(url)}};
}
