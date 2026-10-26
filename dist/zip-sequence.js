// Decode only a small window, retaining sparse anchor frames for fast scrubbing.
// The scroll position is the source of truth; no timed video playback or seek lag.
export async function createZipSequence(canvas,onReady,onRedraw){
  const manifest=await fetch('/assets/shop/zip/manifest.json').then(r=>{if(!r.ok)throw Error('Sequence unavailable');return r.json()});
  const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  if(!ctx)throw Error('Canvas unavailable');
  const cache=new Map(),compressed=new Map(),pending=new Set(),queue=new Map();
  const coarse=matchMedia('(pointer:coarse)').matches,limit=coarse?24:32;
  // One compact transfer avoids a network round trip for every new finger
  // position. Keep compressed bytes; decode only the bounded nearby window.
  const pack=coarse&&manifest.mobilePack?manifest.mobilePack:manifest.pack;
  if(pack){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);try{
    const response=await fetch(pack,{signal:controller.signal});if(!response.ok)throw Error('Pack unavailable');
    const buffer=await response.arrayBuffer(),view=new DataView(buffer);let offset=0;
    for(let i=0;i<manifest.count;i++){const length=view.getUint32(offset,true);offset+=4;if(offset+length>buffer.byteLength)throw Error('Incomplete pack');compressed.set(i,new Blob([buffer.slice(offset,offset+length)],{type:'image/webp'}));offset+=length}
  }catch{compressed.clear()}finally{clearTimeout(timeout)}}
  const anchors=new Set([0,manifest.count-1]);
  let current=0,clock=0,running=0,ready=false,disposed=false;
  const base=coarse&&manifest.mobileBase?manifest.mobileBase:manifest.base;
  const url=i=>`${base}/${String(i).padStart(3,'0')}.webp`;
  function evict(){while(cache.size>limit){const candidates=[...cache].filter(([i])=>!anchors.has(i)&&Math.abs(i-current)>3).sort((a,b)=>a[1].used-b[1].used);if(!candidates.length)break;const [i,item]=candidates[0];item.image.close?.();cache.delete(i)}}
  async function decode(blob){if('createImageBitmap'in window)return createImageBitmap(blob);return new Promise((resolve,reject)=>{const image=new Image(),u=URL.createObjectURL(blob);image.onload=()=>{URL.revokeObjectURL(u);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Frame decode failed'))};image.src=u})}
  function enqueue(i,priority=1){if(i<0||i>=manifest.count||cache.has(i)||pending.has(i))return;queue.set(i,Math.min(queue.get(i)??Infinity,priority));pump()}
  function pump(){while(running<4&&queue.size&&!disposed){const next=[...queue].sort((a,b)=>a[1]-b[1]||Math.abs(a[0]-current)-Math.abs(b[0]-current))[0][0];queue.delete(next);pending.add(next);running++;
    (async()=>{let blob=compressed.get(next);if(!blob){const r=await fetch(url(next));if(!r.ok)throw Error('Frame unavailable');blob=await r.blob();compressed.set(next,blob)}const image=await decode(blob);if(disposed){image.close?.();return}cache.set(next,{image,used:++clock});evict();if(!ready&&next===0){ready=true;onReady(manifest)}onRedraw()})().catch(()=>{if(next===0&&!ready){onReady(null)}}).finally(()=>{pending.delete(next);running--;pump()});
  }}
  function draw(progress){
    // Map physical slider displacement to source frames, removing the clip's
    // initial hold and variable speed without detaching the target from the pull.
    const target=manifest.zipStart+(manifest.zipEnd-manifest.zipStart)*progress;
    const positions=manifest.positions;let index=0;
    if(positions){while(index<positions.length-2&&positions[index+1]<target)index++;const span=positions[index+1]-positions[index];current=index+(span>0?Math.max(0,Math.min(1,(target-positions[index])/span)):0)}
    else current=progress*(manifest.count-1);
    current=Math.max(0,Math.min(manifest.count-1,current));const low=Math.floor(current),high=Math.min(manifest.count-1,low+1);
    // Discard stale speculative decodes when the visitor jumps to another point.
    for(const [i,priority]of queue)if(priority>0&&!anchors.has(i)&&Math.abs(i-current)>10)queue.delete(i);
    enqueue(low,0);enqueue(high,0);for(let d=1;d<=5;d++){enqueue(low+d,d);enqueue(low-d,d)}
    const rect=canvas.getBoundingClientRect(),size=Math.max(1,Math.min(1280,Math.round(rect.width*Math.min(devicePixelRatio,1.5))));if(canvas.width!==size){canvas.width=size;canvas.height=size}
    const a=cache.get(low),b=cache.get(high);let nearest=a;if(!nearest)nearest=[...cache].sort((a,b)=>Math.abs(a[0]-current)-Math.abs(b[0]-current))[0]?.[1];if(!nearest)return;
    nearest.used=++clock;ctx.globalAlpha=1;ctx.drawImage(nearest.image,0,0,size,size);
    if(a&&b&&high!==low){b.used=++clock;ctx.globalAlpha=current-low;ctx.drawImage(b.image,0,0,size,size);ctx.globalAlpha=1}
    canvas.dataset.frame=String(low);canvas.dataset.decoded=String(cache.size);
  }
  enqueue(0,0);enqueue(manifest.count-1,2);
  for(let i=12;i<manifest.count;i+=12){anchors.add(i);enqueue(i,4)}
  return {manifest,draw,destroy(){disposed=true;queue.clear();for(const item of cache.values())item.image.close?.();cache.clear();compressed.clear()}};
}
