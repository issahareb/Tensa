// Independent of WebGL: a failed asset or module must never trap the visitor.
(() => {
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('gate-entering');
  let overlay, observer, chargeFrame, travel, fade, finished=false;
  function finish(){
    if(finished)return;
    finished=true;
    cancelAnimationFrame(chargeFrame);
    observer?.disconnect();
    travel?.cancel();fade?.cancel();
    root.classList.remove('gate-entering');
    document.querySelectorAll('[data-intro-inert]').forEach(el=>{el.inert=false;delete el.dataset.introInert});
    overlay?.remove();
    const bar=document.querySelector('.drop-loader');
    bar?.style.setProperty('--progress','.72');
    if(bar)bar.querySelector('.load-number').textContent='72';
    root.dataset.intro='complete';
  }
  // A bounded fail-open path also covers slow media and backgrounded tabs.
  const watchdog=setTimeout(finish,10000);
  document.addEventListener('DOMContentLoaded',()=>{
    if(finished)return;
    const target=document.querySelector('.drop-loader');
    if(!target){finish();return}
    overlay=document.createElement('div');
    overlay.className='gate-intro';
    overlay.setAttribute('role','status');
    overlay.setAttribute('aria-label','TENSA. Der erste Drop wird vorbereitet.');
    overlay.innerHTML='<div class="intro-backdrop"></div><div class="intro-bar"><span class="intro-brand"><img class="intro-emblem" src="/assets/light/intro-elephant.webp" width="145" height="145" alt="" aria-hidden="true"><span class="intro-wordline">TENSA.</span></span>'+target.innerHTML+'</div>';
    document.body.append(overlay);
    document.querySelectorAll('header,main,footer').forEach(el=>{if(!el.inert){el.inert=true;el.dataset.introInert=''}});
    const bar=overlay.querySelector('.intro-bar');
    const number=bar.querySelector('.load-number');
    number.textContent='0';
    let reached=false,ready=false,revealing=false;
    function reveal(){
      if(!reached||!ready||revealing||finished)return;
      revealing=true;
      root.dataset.intro='arriving';
      if(reduced.matches){finish();return}
      const a=bar.getBoundingClientRect(),b=target.getBoundingClientRect();
      overlay.querySelector('.intro-brand').style.opacity='0';
      travel=bar.animate([
        {transform:'translate(0,0) scale(1)'},
        {transform:`translate(${b.x-a.x}px,${b.y-a.y}px) scale(${b.width/a.width},1)`}
      ],{duration:1100,easing:'cubic-bezier(.65,0,.2,1)',fill:'forwards'});
      fade=overlay.querySelector('.intro-backdrop').animate([{opacity:1},{opacity:0}],{duration:1000,easing:'ease-in-out',fill:'forwards'});
      travel.finished.then(()=>{clearTimeout(watchdog);finish()}).catch(()=>{});
    }
    const scene=document.querySelector('.light-scene');
    const checkReady=()=>{if(scene?.classList.contains('scene-loaded')){ready=true;observer?.disconnect();reveal()}};
    observer=new MutationObserver(checkReady);
    if(scene)observer.observe(scene,{attributes:true,attributeFilter:['class']});
    checkReady();
    setTimeout(()=>{ready=true;reveal()},6000);
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
  addEventListener('resize',()=>{if(travel)finish()});
})();
