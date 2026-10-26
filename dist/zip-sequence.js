// Directional, bounded frame renderer. Never replace a missing frame with an
// image from the opposite side of the requested motion. No frame blending:
// blending two zipper positions creates ghosting exactly on the metal detail.
export async function createZipSequence(canvas,onReady,onRedraw){
  const manifest=await fetch('/assets/shop/zip-macro/manifest.json?v=macro-3').then(r=>{if(!r.ok)throw Error('Sequence unavailable');return r.json()});
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');
  const coarse=matchMedia('(pointer:coarse)').matches,limit=coarse?14:18;
  const cache=new Map(),compressed=new Map(),pending=new Set(),queue=new Map();
  const base=coarse&&manifest.mobileBase?manifest.mobileBase:manifest.base;
  let requested=0,lastRequested=0,lastShown=0,direction=1,running=0,clock=0,ready=false,disposed=false;
  let width=1,height=1,lastPaint='';
  const pack=coarse&&manifest.mobilePack?manifest.mobilePack:manifest.pack;
  if(pack){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(pack,{signal:controller.signal});if(!r.ok)throw Error('Pack unavailable');const buffer=await r.arrayBuffer(),view=new DataView(buffer);let offset=0;for(let i=0;i<manifest.count;i++){const length=view.getUint32(offset,true);offset+=4;if(offset+length>buffer.byteLength)throw Error('Incomplete pack');compressed.set(i,new Blob([buffer.slice(offset,offset+length)],{type:'image/webp'}));offset+=length}}catch{compressed.clear()}finally{clearTimeout(timeout)}}
  function evict(){while(cache.size>limit){const candidates=[...cache].filter(([i])=>i!==lastShown&&i!==0&&i!==manifest.count-1&&Math.abs(i-requested)>2).sort((a,b)=>a[1].used-b[1].used);if(!candidates.length)break;const [i,item]=candidates[0];item.image.close?.();cache.delete(i)}}
  async function decode(blob){if('createImageBitmap'in window)return createImageBitmap(blob);return new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(blob);image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Frame decode failed'))};image.src=url})}
  function enqueue(i,priority){if(i<0||i>=manifest.count||cache.has(i)||pending.has(i))return;queue.set(i,Math.min(queue.get(i)??Infinity,priority))}
  function pump(){while(running<3&&queue.size&&!disposed){const next=[...queue].sort((a,b)=>a[1]-b[1]||Math.abs(a[0]-requested)-Math.abs(b[0]-requested))[0][0];queue.delete(next);pending.add(next);running++;
    (async()=>{let blob=compressed.get(next);if(!blob){const r=await fetch(`${base}/${String(next).padStart(3,'0')}.webp`);if(!r.ok)throw Error('Frame unavailable');blob=await r.blob();compressed.set(next,blob)}const image=await decode(blob);if(disposed){image.close?.();return}cache.set(next,{image,used:++clock});evict();if(!ready&&next===0){ready=true;onReady(manifest)}onRedraw()})().catch(()=>{if(next===0&&!ready)onReady(null)}).finally(()=>{pending.delete(next);running--;pump()})
  }}
  function resize(w,h){const dpr=Math.min(devicePixelRatio,2,2200/w),pixelW=Math.round(w*dpr),pixelH=Math.round(h*dpr);if(width===w&&height===h&&canvas.width===pixelW&&canvas.height===pixelH)return;width=w;height=h;canvas.width=pixelW;canvas.height=pixelH;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';lastPaint=''}
  function draw(progress,view){const index=Math.max(0,Math.min(manifest.count-1,Math.round(progress*(manifest.count-1))));requested=index;if(index!==lastRequested)direction=Math.sign(index-lastRequested);lastRequested=index;
    for(const [i,priority]of queue)if(priority>0&&i!==manifest.count-1&&Math.abs(i-index)>12)queue.delete(i);
    enqueue(index,0);for(let d=1;d<=9;d++)enqueue(index+direction*d,d);for(let d=1;d<=3;d++)enqueue(index-direction*d,d+9);pump();
    let chosen=cache.has(index)?index:lastShown;
    if(!cache.has(index)){const available=[...cache.keys()].filter(i=>direction>0?i>=lastShown&&i<=index:i<=lastShown&&i>=index);if(available.length)chosen=direction>0?Math.max(...available):Math.min(...available)}
    const item=cache.get(chosen);if(!item)return null;lastShown=chosen;item.used=++clock;
    const track=manifest.tracks?.[chosen]||[.5,manifest.positions?.[chosen]??(.303+.554*chosen/(manifest.count-1))];
    const x=view.anchorX-track[0]*view.size,y=view.anchorY-track[1]*view.size;
    const key=[chosen,width,height,x.toFixed(2),y.toFixed(2),view.size.toFixed(2)].join(':');
    if(key!==lastPaint){ctx.globalAlpha=1;ctx.fillStyle=manifest.background||'#d4cfc9';ctx.fillRect(0,0,width,height);ctx.drawImage(item.image,x,y,view.size,view.size);lastPaint=key}
    canvas.dataset.frame=String(chosen);canvas.dataset.requestedFrame=String(index);canvas.dataset.decoded=String(cache.size);canvas.dataset.direction=String(direction);
    return {frame:chosen,progress:chosen/(manifest.count-1),track};
  }
  enqueue(0,0);for(let i=1;i<=8;i++)enqueue(i,i);enqueue(manifest.count-1,20);pump();
  return {manifest,draw,resize,destroy(){disposed=true;queue.clear();for(const item of cache.values())item.image.close?.();cache.clear();compressed.clear()}};
}
