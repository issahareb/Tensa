// Independent of WebGL: a failed asset or module must never trap the visitor.
(() => {
  const root=document.documentElement;
  if(root.dataset.intro==='complete')return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('gate-entering');
  let overlay, observer, chargeFrame, readinessTimer, finished=false;
  const flights=[];
  function finish(){
    if(finished)return;
    finished=true;
    cancelAnimationFrame(chargeFrame);
    clearTimeout(readinessTimer);clearTimeout(watchdog);
    observer?.disconnect();
    flights.forEach(animation=>animation.cancel());
    root.classList.remove('gate-entering');
    document.querySelectorAll('[data-intro-inert]').forEach(el=>{el.inert=false;delete el.dataset.introInert});
    overlay?.remove();
    const bar=document.querySelector('.drop-loader');
    bar?.style.setProperty('--progress','.72');
    if(bar)bar.querySelector('.load-number').textContent='72';
    root.dataset.intro='complete';
  }
  // A bounded fail-open path also covers slow media and backgrounded tabs.
  const watchdog=window.__tensaIntroTimer||setTimeout(finish,10000);
  document.addEventListener('tensa:intro-timeout',finish,{once:true});
  document.addEventListener('DOMContentLoaded',()=>{
    if(finished)return;
    const target=document.querySelector('.drop-loader');
    overlay=document.querySelector('.gate-intro');
    if(!target||!overlay){finish();return}
    document.querySelectorAll('header,main,footer').forEach(el=>{if(!el.inert){el.inert=true;el.dataset.introInert=''}});
    const bar=overlay.querySelector('.intro-bar');
    const number=bar.querySelector('.load-number');
    const emblem=overlay.querySelector('.intro-emblem');
    const letters=overlay.querySelector('.intro-wordline');
    const headerLogo=document.querySelector('.brand-lockup');
    number.textContent='0';
    let reached=false,ready=false,assetsSettled=false,revealing=false;
    // Animate leaf geometry so SVGs are painted at their actual size throughout
    // the move. No enlarged cached bitmap, and no dependency on the bar's motion.
    function fly(element,destination,opacity=1){
      const start=element.getBoundingClientRect();
      const initialOpacity=getComputedStyle(element).opacity;
      overlay.append(element);
      Object.assign(element.style,{position:'fixed',left:`${start.x}px`,top:`${start.y}px`,width:`${start.width}px`,height:`${start.height}px`,margin:'0',transform:'none',opacity:initialOpacity});
      const animation=element.animate([
        {left:`${start.x}px`,top:`${start.y}px`,width:`${start.width}px`,height:`${start.height}px`,opacity:initialOpacity},
        {left:`${destination.x}px`,top:`${destination.y}px`,width:`${destination.width}px`,height:`${destination.height}px`,opacity}
      ],{duration:1200,easing:'cubic-bezier(.65,0,.2,1)',fill:'forwards'});
      flights.push(animation);
    }
    function reveal(){
      if(!reached||!ready||!assetsSettled||revealing||finished)return;
      revealing=true;
      root.dataset.intro='arriving';
      if(reduced.matches){finish();return}
      const destination=headerLogo?.getBoundingClientRect();
      if(destination?.width&&[emblem,letters,headerLogo].every(image=>image.complete&&image.naturalWidth)){
        // Exact bounds of the two groups in the shared 4733 x 1170 lockup.
        fly(emblem,{x:destination.x,y:destination.y,width:destination.width*1316/4733,height:destination.height});
        fly(letters,{x:destination.x+destination.width*1546/4733,y:destination.y+destination.height*27/1170,width:destination.width*3187/4733,height:destination.height*1115/1170});
      }else overlay.querySelector('.intro-brand').style.visibility='hidden';
      fly(bar,target.getBoundingClientRect());
      flights.push(overlay.querySelector('.intro-backdrop').animate([{opacity:1},{opacity:0}],{duration:1100,easing:'ease-in-out',fill:'forwards'}));
      Promise.all(flights.map(animation=>animation.finished)).then(finish).catch(()=>{});
    }
    const images=[emblem,letters,headerLogo].filter(Boolean);
    images.forEach(image=>image.addEventListener('error',()=>{if(image!==headerLogo)image.style.visibility='hidden'},{once:true}));
    Promise.allSettled(images.map(image=>image.decode())).then(()=>{assetsSettled=true;reveal()});
    const scene=document.querySelector('.light-scene');
    const checkReady=()=>{if(scene?.classList.contains('scene-loaded')){ready=true;observer?.disconnect();reveal()}};
    observer=new MutationObserver(checkReady);
    if(scene)observer.observe(scene,{attributes:true,attributeFilter:['class']});
    checkReady();
    readinessTimer=setTimeout(()=>{ready=true;assetsSettled=true;reveal()},6000);
    const start=performance.now();
    function charge(now){
      if(finished)return;
      const t=reduced.matches?1:Math.min(1,(now-start)/2600);
      const value=72*(1-Math.pow(1-t,3));
      bar.style.setProperty('--progress',String(value/100));
      number.textContent=String(Math.floor(value));
      if(t<1)chargeFrame=requestAnimationFrame(charge);
      else{number.textContent='72';reached=true;reveal()}
    }
    chargeFrame=requestAnimationFrame(charge);
    reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(chargeFrame);reached=true;if(revealing)finish();else reveal()}},{once:true});
  },{once:true});
  addEventListener('pagehide',finish,{once:true});
  addEventListener('resize',()=>{if(flights.length)finish()});
})();
