import {createZipSequence} from '/zip-sequence.js?v=macro-3';
const $=s=>document.querySelector(s),clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(pointer:coarse)');
const story=$('#zipStory'),stage=$('.zip-stage'),garment=$('#garment'),handle=$('#zipGrab'),canvas=$('#zipCanvas'),hint=$('#grabHint');
const ZIP_FINISH=.78;
let sequence=null,rendered=0,raf=0,drag=null,ready=false,resizePending=false;
let geometry={top:0,distance:1,width:1,height:1,size:600,anchorX:0,anchorY:0,travel:280};
function measure(){if(drag){resizePending=true;return}const w=stage.clientWidth,h=stage.clientHeight,mobile=w<=700;geometry={top:scrollY+story.getBoundingClientRect().top,distance:Math.max(1,story.offsetHeight-h),width:w,height:h,size:mobile?Math.min(w*1.48,680):Math.min(h*.94,w<=1100?790:870),anchorX:w*(mobile?.5:w<=1100?.58:.54),anchorY:0,travel:Math.min(285,h*.34)};geometry.anchorY=h*(mobile?.20:.12)+geometry.size*(sequence?.manifest.tracks?.[0]?.[1]??.303);geometry.finalSize=Math.min(Math.max(w,h)*1.25,h*1.8);const endY=sequence?.manifest.tracks?.at(-1)?.[1]??.508;geometry.travel=Math.max(60,Math.min(geometry.travel,(h-24-geometry.finalSize*(.73-endY)-geometry.anchorY)/ZIP_FINISH));sequence?.resize(w,h);resizePending=false;requestRender()}
function target(){return reduced.matches?0:clamp((scrollY-geometry.top)/geometry.distance)}
function requestRender(){if(!raf)raf=requestAnimationFrame(render)}
function render(){raf=0;const wanted=reduced.matches?0:drag?clamp(drag.progress):target();rendered=drag||reduced.matches?wanted:rendered+(wanted-rendered)*.22;if(Math.abs(rendered-wanted)<.0003)rendered=wanted;
  const film=clamp(rendered/ZIP_FINISH),ease=film*film*(3-2*film);
  const anchorX=geometry.anchorX;
  const anchorY=geometry.anchorY+Math.min(rendered,ZIP_FINISH)*geometry.travel;
  const size=geometry.size+(geometry.finalSize-geometry.size)*ease;
  story.style.setProperty('--zip-progress',film.toFixed(4));story.dataset.phase=rendered>=ZIP_FINISH?'hold':'zip';
  handle.style.left=`${anchorX}px`;handle.style.top=`${anchorY}px`;hint.style.left=`${anchorX+48}px`;hint.style.top=`${anchorY}px`;hint.style.opacity=film>.05?'0':'1';
  handle.style.opacity=film>.99?'.25':'1';handle.setAttribute('aria-valuenow',String(Math.round(film*100)));handle.setAttribute('aria-valuetext',film>=1?'Unterer Anschlag. Nahaufnahme. Weiterziehen oder weiterscrollen zum Produkt.':`${Math.round(film*100)} Prozent geöffnet`);
  $('#zipPercent').textContent=String(Math.round(film*100)).padStart(2,'0');$('.shop-header').classList.toggle('scrolled',scrollY>60);
  $('#zipHoldHint').classList.toggle('visible',rendered>=ZIP_FINISH&&rendered<.995);
  if(sequence&&!reduced.matches&&sequence.draw(film,{anchorX,anchorY,size}))garment.classList.add('sequence-ready');
  // During a gesture the finger is authoritative. Scroll events never feed
  // back into its progress, and browser toolbar resize waits until release.
  if(drag){const top=geometry.top+drag.progress*geometry.distance;if(Math.abs(scrollY-top)>.5)window.scrollTo({top,behavior:'instant'})}
  if(rendered!==wanted)requestRender();
}
function go(p){window.scrollTo({top:geometry.top+clamp(p)*geometry.distance,behavior:'instant'});requestRender()}
handle.addEventListener('pointerdown',e=>{if(reduced.matches||!ready||e.button>0)return;e.preventDefault();handle.setPointerCapture(e.pointerId);const start=target();rendered=start;drag={id:e.pointerId,y:e.clientY,start,progress:start,travel:geometry.travel};handle.classList.add('dragging');requestRender()});
handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const sample=e.getCoalescedEvents?.().at(-1)||e;drag.progress=clamp(drag.start+(sample.clientY-drag.y)/drag.travel,0,1.65);requestRender()});
function release(e){if(!drag||e&&e.pointerId!==drag.id)return;const finalProgress=drag.progress;window.scrollTo({top:geometry.top+finalProgress*geometry.distance,behavior:'instant'});rendered=clamp(finalProgress);drag=null;handle.classList.remove('dragging');if(resizePending)measure();requestRender()}
handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);handle.addEventListener('lostpointercapture',release);
handle.addEventListener('keydown',e=>{const next={ArrowDown:target()+.04,ArrowRight:target()+.04,ArrowUp:target()-.04,ArrowLeft:target()-.04,PageDown:target()+.15,PageUp:target()-.15,Home:0,End:1};if(e.key in next){e.preventDefault();go(next[e.key])}});
addEventListener('scroll',()=>{if(!drag)requestRender()},{passive:true});addEventListener('resize',measure);
function motionPreference(){if(reduced.matches&&drag)release();hint.firstChild.textContent=touch.matches?'ZIEH DEN ZIPPER ':'SCROLL ZUM ÖFFNEN ';measure();if(!reduced.matches&&!sequence)loadSequence()}
reduced.addEventListener('change',motionPreference);touch.addEventListener('change',motionPreference);
let sequenceStarted=false;
async function loadSequence(){if(sequenceStarted)return;sequenceStarted=true;const statusTimer=setTimeout(()=>{$('#zipReadiness').textContent='Ein Moment. Dein Drop wird vorbereitet.'},700);try{sequence=await createZipSequence(canvas,m=>{clearTimeout(statusTimer);if(!m){unavailable();return}ready=true;$('#zipReadiness').textContent='';measure()},requestRender);measure()}catch{clearTimeout(statusTimer);unavailable()}}
function unavailable(){story.classList.add('sequence-unavailable');$('#zipReadiness').textContent='Entdecke alle Bilder und Details weiter unten.'}
handle.setAttribute('aria-description','Ziehen zoomt auf den Zipper. Am unteren Anschlag bleibt die Nahaufnahme stehen. Weiterziehen oder weiterscrollen führt zum Produkt.');motionPreference();
document.querySelectorAll('a[href="#product"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();$('#product').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'})}));

let config={},selectedSize=null,items=[];const validSizes=['XS','S','M','L','XL'];
try{const stored=JSON.parse(localStorage.getItem('tensa-drop001-bag')||'[]');if(Array.isArray(stored))items=stored.filter(x=>x&&validSizes.includes(x.size)&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=10).map(x=>({size:x.size,qty:x.qty}))}catch{}
const bag=$('#bag');
function save(){try{localStorage.setItem('tensa-drop001-bag',JSON.stringify(items))}catch{}$('#cartCount').textContent=items.reduce((n,x)=>n+x.qty,0)}
function renderBag(){const price=Number(config.price);$('#bagItems').innerHTML=items.length?items.map((x,i)=>`<div class="cart-line"><img src="/assets/shop/front.webp" alt="Washed Zip Hoodie"><div>The Washed Zip Hoodie<small>Washed Black / ${x.size}</small><div><button data-index="${i}" data-delta="-1" aria-label="Menge Größe ${x.size} reduzieren">−</button> <span>${x.qty}</span> <button data-index="${i}" data-delta="1" aria-label="Menge Größe ${x.size} erhöhen">+</button> <button class="remove-item" data-remove="${i}">Entfernen</button></div><span class="item-price">${price>0?money(price*x.qty):'Preis folgt'}</span></div></div>`).join(''):'<p>Deine Bag ist noch leer.</p>';$('#bagTotal').textContent=price>0?'Zwischensumme: '+money(items.reduce((n,x)=>n+x.qty*price,0)):'Der finale Preis folgt zum Launch.'}
document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{selectedSize=b.dataset.size;document.querySelectorAll('[data-size]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#productStatus').textContent=`Größe ${selectedSize} ausgewählt.`}));
$('#addBag').addEventListener('click',()=>{if(!selectedSize){$('#productStatus').textContent='Wähle zuerst deine Größe.';$('[data-size]').focus();return}const item=items.find(x=>x.size===selectedSize);if(item)item.qty=Math.min(10,item.qty+1);else items.push({size:selectedSize,qty:1});save();renderBag();bag.showModal()});
$('#openCart').addEventListener('click',()=>{renderBag();bag.showModal()});$('#closeCart').onclick=$('#continueShopping').onclick=()=>bag.close();
$('#bagItems').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.remove!==undefined)items.splice(Number(b.dataset.remove),1);else{const i=Number(b.dataset.index);if(!items[i])return;items[i].qty=clamp(items[i].qty+Number(b.dataset.delta),0,10);if(items[i].qty===0)items.splice(i,1)}save();renderBag()});save();
fetch('/api/config').then(r=>{if(!r.ok)throw Error('Product data unavailable');return r.json()}).then(c=>{config=c;$('#price').textContent=Number(c.price)>0?money(Number(c.price)):'Preis folgt';$('#releaseStatus').textContent=c.launched?'DROP 001':'BALD VERFÜGBAR'}).catch(()=>{$('#productStatus').textContent='Produktdaten gerade nicht erreichbar. Deine Auswahl bleibt auf diesem Gerät gespeichert.'});
const gallery={front:{src:'/assets/shop/front.webp',alt:'TENSA Washed Zip Hoodie – Vorderseite',index:'01'},back:{src:'/assets/shop/back.webp',alt:'TENSA Washed Zip Hoodie – Architektur-Backprint',index:'02'},detail:{src:'/assets/shop/embroidery.webp',alt:'Detail des tonalen TENSA-Elefantensticks',index:'03'}};let activeImage='front';
document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{activeImage=b.dataset.image;const image=gallery[activeImage];$('#mainProductImage').src=image.src;$('#mainProductImage').alt=image.alt;$('#imageIndex').textContent=image.index+' / 03';$('#galleryZoom').classList.toggle('detail',activeImage==='detail');document.querySelectorAll('[data-image]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
$('#galleryZoom').onclick=()=>{const image=gallery[activeImage];$('#zoomImage').src=image.src;$('#zoomImage').alt=image.alt;$('#imageDialog').classList.toggle('detail',activeImage==='detail');$('#imageDialog').showModal()};$('#closeImage').onclick=()=>$('#imageDialog').close();
for(const dialog of [bag,$('#imageDialog')])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
$('a[href="#fitDetails"]').addEventListener('click',()=>{$('#fitDetails').open=true});
