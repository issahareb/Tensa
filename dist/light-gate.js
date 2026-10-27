import {createRingRenderer} from '/ring-mesh.js?v=logo-light-3';
import {createRingBloom} from '/ring-bloom.js?v=logo-light-3';
import {loadGateTurn} from '/gate-turn.js?v=turn-2';
const canvas = document.querySelector('#lightCanvas');
const scene = document.querySelector('.light-scene');
const motionButton = document.querySelector('#motionToggle');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedQuery.matches;
let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, lastFrame = 0, renderLight;
let turn=0,pausedTurn=0,turnSequence=null,turnLoading=false,canTurn=false;
function ensureTurn(){
  if(!canTurn||turnSequence||turnLoading)return;
  turnLoading=true;canvas.dataset.turnState="loading";
  loadGateTurn().then(sequence=>{if(!canTurn){sequence.dispose();return}turnSequence=sequence;canvas.dataset.turnState="ready";canvas.dataset.turnVariant=sequence.variant;requestRender()}).catch(()=>{canvas.dataset.turnState="unavailable"});
}
function turnTarget(value){const t=Math.max(0,Math.min(1,(value-.12)/.82));return t*t*(3-2*t)}
const clamp = (n, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, n));

// The garment uses the Higgsfield turn take with a fixed studio camera.
// Directional lighting is an illustrative surface approximation; the take is
// not a realtime cloth-physics simulation.
const vertex = `attribute vec2 position; varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 uv; uniform sampler2D garment; uniform sampler2D lamp; uniform sampler2D glow; uniform vec2 light; uniform vec2 texel; uniform float turnAmount;
float alphaAt(vec2 p){return texture2D(garment,p).a;}
void main(){
  vec4 cloth=texture2D(garment,uv);
  vec2 p=uv-.5;
  float side=abs(light.x);
  vec4 physicalLamp=texture2D(lamp,uv);
  vec3 background=vec3(.0196);
  float bloom=texture2D(glow,uv).r*.65;
  background=mix(background,vec3(1.),physicalLamp.a);

  vec2 d=texel*3.;
  float aL=alphaAt(uv-vec2(d.x,0.)); float aR=alphaAt(uv+vec2(d.x,0.));
  float aB=alphaAt(uv-vec2(0.,d.y)); float aT=alphaAt(uv+vec2(0.,d.y));
  vec2 outward=vec2(aL-aR,aB-aT);
  float edge=clamp(length(outward),0.,1.);
  vec2 edgeNormal=outward/max(length(outward),.001);
  vec3 lightDirection=normalize(vec3(light.x*1.65,-light.y*.3,-.95+side*1.38));

  float tL=dot(texture2D(garment,uv-vec2(texel.x,0.)).rgb,vec3(.3333));
  float tR=dot(texture2D(garment,uv+vec2(texel.x,0.)).rgb,vec3(.3333));
  float tB=dot(texture2D(garment,uv-vec2(0.,texel.y)).rgb,vec3(.3333));
  float tT=dot(texture2D(garment,uv+vec2(0.,texel.y)).rgb,vec3(.3333));
  vec3 normal=normalize(vec3(p.x*2.8+(tL-tR)*1.7,p.y*.25+(tB-tT)*1.7,.78));
  float diffuse=max(dot(normal,lightDirection),0.);
  float facingEdge=max(dot(edgeNormal,normalize(vec2(light.x+0.0001,-light.y*.2))),0.);
  // A restrained frontal fill reveals the zipper and cotton even with the ring
  // behind the garment. Side lighting adds form without washing out the black.
  float rim=edge*(.04*(1.-side)+.27*facingEdge*side);
  float fabric=dot(cloth.rgb,vec3(.3333));
  float logoMask=1.-smoothstep(.82,1.,length((uv-vec2(.62,.58))/vec2(.049,.061)));
  float logoContour=smoothstep(.24,.40,fabric);
  float logoRight=smoothstep(.589,.651,uv.x);
  float illuminatedHalf=mix(1.-logoRight,logoRight,step(0.,light.x));
  float logoLight=logoMask*logoContour*side*(.012+.115*illuminatedHalf)*(1.-smoothstep(0.,.12,turnAmount));
  float sideFill=side*(.012+.022*mix(1.-uv.x,uv.x,step(0.,light.x)));
  vec3 product=vec3(.010+fabric*(.22+diffuse*.48)+sideFill+rim+logoLight*.75);
  gl_FragColor=vec4(mix(background,product,cloth.a)+vec3(bloom),1.);
}`;

function fallbackRenderer(){
  const wrap = document.querySelector('.scene-fallback');
  const base = wrap.querySelector(':scope > img');
  const lit = base.cloneNode();
  lit.style.cssText='position:absolute;inset:0;filter:grayscale(1) brightness(.60);opacity:0;';
  wrap.append(lit);
  const ring = wrap.querySelector('i');
  return (lx,ly)=>{
    ring.style.transform=`translate(${lx*37}%,${ly*5}%) scaleX(${1-Math.abs(lx)*.35})`;
    lit.style.opacity=String(.12+Math.abs(lx)*.38);
    lit.style.maskImage=`linear-gradient(${lx<0?'90':'270'}deg,black,transparent 85%)`;
  };
}

function initialiseTexture(image,ringBuffer){
  try {
    const gl = canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
    if(!gl)throw Error('WebGL unavailable');
    const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Shader compilation failed');return shader};
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program,'garment'),0);
    const ring=createRingRenderer(gl,ringBuffer), bloom=createRingBloom(gl);gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'glow'),2);gl.uniform1i(gl.getUniformLocation(program,'lamp'),1);gl.uniform2f(gl.getUniformLocation(program,'texel'),1/image.width,1/image.height);
    const light=gl.getUniformLocation(program,'light'),turnUniform=gl.getUniformLocation(program,'turnAmount');
    const frontFrame={source:image,flipY:true};let backFrame=null;
    loadImage('/assets/light/turn/back.webp').then(image=>{backFrame={source:image,flipY:true};requestRender()}).catch(()=>{});
    let displayedFrame=null,ringX=null,ringY=null,ringSize=0;canTurn=true;
    renderLight=(lx,ly)=>{
      if(turnSequence){
        const next=turn===0?frontFrame:turn===1&&backFrame?backFrame:turnSequence.frame(turn);
        if(next!==displayedFrame){
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,next.flipY);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,next.source);
          gl.useProgram(program);gl.uniform2f(gl.getUniformLocation(program,'texel'),1/next.source.width,1/next.source.height);
          displayedFrame=next;
        }
        canvas.dataset.turn=String(Math.round(turn*(turnSequence.count-1)));
      }
      const size=Math.min(1180,Math.round(canvas.clientWidth*Math.min(devicePixelRatio,1.4)));
      if(canvas.width!==size){canvas.width=size;canvas.height=size}
      if(ringSize!==size||ringX!==lx||ringY!==ly){ring.render(size,lx,ly);ringSize=size;ringX=lx;ringY=ly}
      bloom.render(size,ring.texture,texture);
      gl.viewport(0,0,size,size);gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,ring.texture);
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,bloom.texture);
      gl.uniform2f(light,lx,ly);gl.uniform1f(turnUniform,turn);gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.light=lx.toFixed(3);canvas.dataset.renderer='mesh-3d';
    };
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();canTurn=false;turnSequence?.dispose();turnSequence=null;canvas.dataset.turnState='unavailable';scene.classList.remove('scene-ready');renderLight=fallbackRenderer();update()});
    scene.classList.add('scene-ready');
  } catch {
    renderLight=fallbackRenderer();
  }
  scene.classList.add('scene-loaded');
  update();if(!paused)ensureTurn();
}

function update(time=performance.now()){
  frame=0;
  const dt=Math.min(48,lastFrame?time-lastFrame:16);
  const ease=1-Math.exp(-dt/110);lastFrame=time;
  const wantedTurn=turnSequence?(paused?pausedTurn:turnTarget(targetX)):0;
  const turnDelta=(wantedTurn-turn)*(1-Math.exp(-dt/180));
  turn=paused?wantedTurn:turn+clamp(turnDelta,-dt/850,dt/850);
  if(Math.abs(wantedTurn-turn)<.0005)turn=wantedTurn;
  x=paused?targetX:x+(targetX-x)*ease;
  y=paused?targetY:y+(targetY-y)*ease;
  if(Math.abs(targetX-x)<.001)x=targetX;
  if(Math.abs(targetY-y)<.001)y=targetY;
  renderLight?.(x,y);
  // Directional typographic highlight follows the same eased ring position.
  // Keep a permanent frontal fill so the brand never becomes a silhouette.
  const wordmark=document.querySelector('.wordmark');
  wordmark.style.setProperty('--word-light-x',`${50+x*48}%`);
  wordmark.style.setProperty('--word-light-a',String(.16+Math.abs(x)*.36));
  wordmark.style.setProperty('--word-edge-x',`${-x*.7}px`);
  scene.setAttribute('aria-valuenow',String(Math.round(x*100)));
  scene.setAttribute('aria-valuetext',turn>.8?'Seitenansicht mit Blick auf den Backprint, Licht von rechts':turn>.08?'Hoodie dreht zur Seite':Math.abs(x)<.15?'Vorderseite, Licht hinter dem Hoodie':x<0?'Vorderseite, Licht von links':'Vorderseite, Licht von rechts');
  if(x!==targetX||y!==targetY||turn!==wantedTurn)frame=requestAnimationFrame(update);else lastFrame=0;
}
function requestRender(){if(!frame)frame=requestAnimationFrame(update)}
function setTarget(lx,ly=0){targetX=clamp(lx);targetY=clamp(ly);if(paused)pausedTurn=turnTarget(targetX);if(targetX>.12)ensureTurn();requestRender()}

document.addEventListener('pointermove',e=>{
  if(paused||e.pointerType==='touch'||e.target.closest('input,button,a,label'))return;
  setTarget(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1);
},{passive:true});
document.documentElement.addEventListener('pointerleave',e=>{if(!paused&&e.pointerType!=='touch')setTarget(0)});
let dragging=false,swipeStartX=0;
scene.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.target.closest('input'))return;dragging=true;swipeStartX=e.clientX;const r=scene.getBoundingClientRect();setTarget((e.clientX-r.left)/r.width*2-1)});
scene.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!dragging)return;if(Math.abs(e.clientX-swipeStartX)>24)scene.classList.add('swipe-discovered');const r=scene.getBoundingClientRect();setTarget((e.clientX-r.left)/r.width*2-1)},{passive:true});
scene.addEventListener('pointerup',()=>{dragging=false});scene.addEventListener('pointercancel',()=>{dragging=false});
scene.addEventListener('keydown',e=>{
  const positions={ArrowLeft:targetX-.1,ArrowRight:targetX+.1,Home:0,End:1};
  if(e.key in positions){e.preventDefault();setTarget(positions[e.key])}
});
function motionState(){scene.classList.toggle('motion-paused',paused);document.querySelector('#lightHelp').textContent=matchMedia('(pointer:coarse)').matches?'Wische nach rechts. Entdecke die andere Seite.':'Bewege die Maus nach rechts. Entdecke die andere Seite.';motionButton.setAttribute('aria-pressed',String(paused));motionButton.textContent=paused?'Licht aktivieren':'Licht pausieren';document.querySelector('#lightHint').textContent=paused?'LICHT MANUELL BEWEGEN':matchMedia('(pointer:coarse)').matches?'SWIPE TO DISCOVER':'MOVE TO DISCOVER'}
motionButton.addEventListener('click',()=>{paused=!paused;pausedTurn=turn;targetX=x;targetY=y;motionState();if(!paused)ensureTurn();requestRender()});
reducedQuery.addEventListener('change',e=>{paused=e.matches;pausedTurn=turn;targetX=x;targetY=y;motionState()});
addEventListener('resize',requestRender);motionState();
const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src});
Promise.all([loadImage('/assets/light/turn/front.webp'),fetch('/assets/light/ring.glb?v=smooth-3').then(r=>{if(!r.ok)throw Error('Ring unavailable');return r.arrayBuffer()})]).then(([hoodie,ring])=>initialiseTexture(hoodie,ring)).catch(()=>{scene.classList.add('scene-loaded');renderLight=fallbackRenderer();update()});

const status=document.querySelector('#formStatus');
const confirmation=new URLSearchParams(location.search).get('confirmation');
document.querySelector('#waitlist').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;status.textContent='Dein Zugang wird vorbereitet…';
  try{const response=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.email.value,consent:form.consent.checked,website:form.website.value})});const data=await response.json();status.textContent=data.message||data.error;if(response.ok)form.reset()}
  catch{status.textContent='Verbindung unterbrochen. Bitte versuche es noch einmal.'}
  finally{button.disabled=false}
});
if(confirmation){status.textContent=confirmation==='success'?'Du bist dabei. Deine E-Mail ist bestätigt.':'Dieser Link ist abgelaufen oder bereits verwendet.';document.querySelector('#access').scrollIntoView({behavior:'instant'})}
