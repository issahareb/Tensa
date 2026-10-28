// A bounded, fully decoded sequence from the Higgsfield turn take. Interaction
// starts only once every frame is ready: no network/decode callbacks can rewind
// the displayed pose. Only one frame occupies the WebGL garment texture.
export async function loadGateTurn(){
 const mobile=matchMedia('(pointer:coarse)').matches||innerWidth<900||(navigator.deviceMemory&&navigator.deviceMemory<=4);
 const variant=mobile?'mobile':'desktop',count=64,frames=new Array(count);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
 let next=0,failed=false;
 async function decode(blob){
   if(typeof createImageBitmap==='function')return {source:await createImageBitmap(blob,{imageOrientation:'flipY',premultiplyAlpha:'none'}),flipY:false};
   const url=URL.createObjectURL(blob),image=new Image();
   try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});await image.decode();return {source:image,flipY:true}}
   finally{URL.revokeObjectURL(url)}
 }
 async function worker(){
   while(!failed){
     const index=next++;if(index>=count)return;
     try{
       const response=await fetch(`/assets/light/turn-scroll/${variant}/${String(index).padStart(3,'0')}.webp`,{signal:controller.signal});
       if(!response.ok)throw Error('Turn frame unavailable');
       const frame=await decode(await response.blob());
       if(failed){frame.source.close?.();return}frames[index]=frame;
     }catch(error){failed=true;controller.abort();throw error}
   }
 }
 const results=await Promise.allSettled(Array.from({length:4},worker));clearTimeout(timeout);
 if(failed){frames.forEach(frame=>frame?.source.close?.());throw results.find(r=>r.status==='rejected').reason}
 return {count,variant,frame(progress){return frames[Math.round(Math.max(0,Math.min(1,progress))*(count-1))]},dispose(){frames.forEach(frame=>frame.source.close?.())}};
}
