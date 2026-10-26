const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused = reduce;
const veil = document.querySelector('#veil');
const ctx = veil.getContext('2d');
const cover = document.createElement('canvas');
const coverCtx = cover.getContext('2d');
let trails = [], frame = 0, lastPoint = null, width = 0, height = 0, dpr = 1;
const life = 1500;
function draw(now = performance.now()) {
  frame = 0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(cover, 0, 0, cover.width, cover.height, 0, 0, width, height);
  trails = trails.filter(p => now - p.t < life);
  document.querySelector('#portal').classList.toggle('is-revealing',trails.length>0);
  ctx.globalCompositeOperation = 'destination-out';
  for (const p of trails) {
    const age = Math.max(0, (now - p.t - 250) / (life - 250));
    const radius = p.radius * (1 - age * age);
    if (radius < 1) continue;
    const fade = ctx.createRadialGradient(p.x, p.y, radius * .25, p.x, p.y, radius);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(.65, 'rgba(0,0,0,.98)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade; ctx.beginPath(); ctx.arc(p.x,p.y,radius,0,Math.PI*2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  if (trails.length && !document.hidden) frame = requestAnimationFrame(draw);
}
function resize() {
  const r = veil.getBoundingClientRect(); width = r.width; height = r.height; dpr = Math.min(devicePixelRatio, 2);
  veil.width = cover.width = Math.round(width*dpr); veil.height = cover.height = Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); coverCtx.setTransform(dpr,0,0,dpr,0,0);
  const g = coverCtx.createRadialGradient(width/2,height/2,0,width/2,height/2,width*.7);
  g.addColorStop(0,'#20271c'); g.addColorStop(1,'#0b100b'); coverCtx.fillStyle=g; coverCtx.fillRect(0,0,width,height);
  coverCtx.font='9px monospace'; coverCtx.textAlign='center';
  const chars=['/','·','+','×',':'];
  for(let y=16;y<height;y+=24)for(let x=12;x<width;x+=24){coverCtx.fillStyle=`rgba(179,194,157,${.08+((x*y)%11)/100})`;coverCtx.fillText(chars[(Math.floor(x/24)+Math.floor(y/24))%chars.length],x,y)}
  trails=[];if(frame)cancelAnimationFrame(frame);draw();
}
function addPoint(x,y,radius=54){trails.push({x,y,radius,t:performance.now()});if(trails.length>180)trails.splice(0,trails.length-180);if(!frame)frame=requestAnimationFrame(draw)}
function scrub(e){const r=veil.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(lastPoint){const distance=Math.hypot(x-lastPoint.x,y-lastPoint.y);const steps=Math.min(20,Math.ceil(distance/14));for(let i=1;i<=steps;i++)addPoint(lastPoint.x+(x-lastPoint.x)*i/steps,lastPoint.y+(y-lastPoint.y)*i/steps)}else addPoint(x,y);lastPoint={x,y}}
veil.addEventListener('pointerdown',e=>{veil.setPointerCapture(e.pointerId);lastPoint=null;scrub(e)});
veil.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)scrub(e)});
for(const name of ['pointerleave','pointerup','pointercancel'])veil.addEventListener(name,()=>{lastPoint=null});
document.querySelector('#revealButton').onclick=()=>addPoint(width/2,height/2,width*.65);
new ResizeObserver(resize).observe(veil);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else draw()});
const cipher=document.querySelector('#cipher');let cipherTimer=setInterval(()=>{if(!paused&&!document.hidden)cipher.textContent=`SIGNAL / ${Math.floor(Math.random()*65535).toString(16).toUpperCase().padStart(4,'0')}`},1300);
const motion=document.querySelector('#motionToggle');function updateMotion(){document.body.classList.toggle('motion-paused',paused);motion.textContent=paused?'Bewegung aktivieren':'Bewegung pausieren';motion.setAttribute('aria-pressed',String(paused))}motion.onclick=()=>{paused=!paused;updateMotion()};updateMotion();
document.querySelectorAll('.cta').forEach(b=>{b.addEventListener('pointermove',e=>{if(paused||e.pointerType!=='mouse')return;const r=b.getBoundingClientRect();b.style.setProperty('--mx',`${(e.clientX-r.left-r.width/2)*.025}px`);b.style.setProperty('--my',`${(e.clientY-r.top-r.height/2)*.08}px`)});b.addEventListener('pointerleave',()=>{b.style.setProperty('--mx','0px');b.style.setProperty('--my','0px')})});
const status=document.querySelector('#formStatus');document.querySelector('#waitlist').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;status.textContent='Dein Zugang wird vorbereitet…';try{const res=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email.value,consent:f.consent.checked,website:f.website.value})});const data=await res.json();status.textContent=data.message||data.error;if(res.ok)f.reset()}catch{status.textContent='Verbindung unterbrochen. Bitte versuche es noch einmal.'}finally{b.disabled=false}});
fetch('/api/config').then(r=>r.json()).then(c=>{if(!c.waitlistReady)status.textContent='Trag dich ein. Die Bestätigungs-Mail folgt, sobald unser Versand bereit ist.'}).catch(()=>status.textContent='Die Anmeldung ist gerade nicht erreichbar.');const confirmation=new URLSearchParams(location.search).get('confirmation');if(confirmation){status.textContent=confirmation==='success'?'Du bist dabei. Deine Adresse ist bestätigt. Launch-Mail und 15-%-Code folgen zum Drop.':'Dieser Link ist abgelaufen oder bereits verwendet. Trage dich bei Bedarf erneut ein.';document.querySelector('#access').scrollIntoView({behavior:'instant'})}
