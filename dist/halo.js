const scrollScene = document.querySelector('#haloScroll');
const stage = document.querySelector('.halo-stage');
const film = document.querySelector('#haloFilm');
const still = document.querySelector('#haloStill');
const panel = document.querySelector('#access');
const story = document.querySelector('#haloStory');
const title = document.querySelector('#sceneTitle');
const caption = document.querySelector('#sceneCaption');
const status = document.querySelector('#formStatus');
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let queued = false, progress = 0, activeChapter = -1;
const clamp = v => Math.min(1,Math.max(0,v));
function render() {
  queued = false;
  const rect = scrollScene.getBoundingClientRect();
  progress = reduced ? 1 : clamp(-rect.top / Math.max(1,scrollScene.offsetHeight - innerHeight));
  const chapter = progress < .35 ? 0 : progress < .82 ? 1 : 2;
  if (chapter !== activeChapter) {
    activeChapter = chapter;
    if(chapter === 0) { title.innerHTML = 'A first<br>glimpse.'; caption.textContent = 'Nicht alles auf einmal.'; }
    if(chapter === 1) { title.textContent = 'Closer.'; caption.textContent = 'Ein Zeichen. Mehr noch nicht.'; }
    document.querySelector('#haloPhase').textContent = ['01 / IN THE DARK','02 / INTO THE LIGHT','03 / BE THERE'][chapter];
  }
  const show = chapter === 2;
  panel.classList.toggle('visible',show);panel.inert = !show;
  panel.setAttribute('aria-hidden',String(!show));
  stage.classList.toggle('access-visible',show);
  story.style.opacity = String(show ? 0 : 1);
  story.setAttribute('aria-hidden',String(show));
  document.querySelector('#haloProgress').style.height = `${progress*100}%`;
  document.querySelector('#scrollPrompt').style.opacity = show ? '0' : '1';
  if(!reduced && Number.isFinite(film.duration) && film.readyState >= 2 && !film.seeking) {
    const target = clamp(progress/.82) * Math.max(0,film.duration-.04);
    if(Math.abs(film.currentTime-target)>.045)film.currentTime=target;
  }
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(render)}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
film.addEventListener('loadeddata',schedule);film.addEventListener('seeked',schedule);
function skip(focus=false){if(!reduced){const top=scrollScene.getBoundingClientRect().top+scrollY;scrollTo({top:top+(scrollScene.offsetHeight-innerHeight)*.9,behavior:'instant'});render()}if(focus)setTimeout(()=>{if(!panel.inert&&document.activeElement.id==='skipSequence')document.querySelector('#email').focus({preventScroll:true})},380)}
document.querySelector('#skipSequence').addEventListener('click',e=>{e.preventDefault();skip(true)});
function motion(){document.body.classList.toggle('halo-paused',reduced);film.hidden=reduced;still.hidden=!reduced;const b=document.querySelector('#motionToggle');b.textContent=reduced?'Scroll-Animation aktivieren':'Bewegung pausieren';b.setAttribute('aria-pressed',String(reduced));render()}
document.querySelector('#motionToggle').onclick=()=>{reduced=!reduced;motion()};motion();
document.querySelector('#waitlist').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;status.textContent='Dein Zugang wird vorbereitet…';try{const response=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email.value,consent:f.consent.checked,website:f.website.value})});const data=await response.json();status.textContent=data.message||data.error;if(response.ok)f.reset()}catch{status.textContent='Verbindung unterbrochen. Bitte versuche es noch einmal.'}finally{b.disabled=false}});
fetch('/api/config').then(r=>r.json()).then(c=>{if(!c.waitlistReady)status.textContent='Die Bestätigungs-Mail folgt, sobald unser Versand bereit ist.'}).catch(()=>status.textContent='Die Anmeldung ist gerade nicht erreichbar.');
const confirmation=new URLSearchParams(location.search).get('confirmation');if(confirmation){skip();status.textContent=confirmation==='success'?'Du bist dabei. Deine E-Mail ist bestätigt.':'Dieser Link ist abgelaufen oder bereits verwendet.'}
