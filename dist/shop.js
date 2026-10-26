import {createZipSequence} from '/zip-sequence.js?v=zip-2';
const $=s=>document.querySelector(s),clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(pointer:coarse)');
const story=$('#zipStory'),garment=$('#garment'),handle=$('#zipGrab'),canvas=$('#zipCanvas'),hint=$('#grabHint');
let sequence=null,progress=0,rendered=0,raf=0,drag=null,ready=false,zipStart=.30,zipEnd=.835;
let geometry={top:0,distance:1,size:600,travel:140};
function measure(){const rect=story.getBoundingClientRect();geometry.top=scrollY+rect.top;geometry.distance=Math.max(1,story.offsetHeight-document.querySelector('.zip-stage').offsetHeight);geometry.size=garment.offsetWidth;geometry.travel=Math.max(65,geometry.size*(zipEnd-zipStart-.30));requestRender()}
function target(){return reduced.matches?0:clamp((scrollY-geometry.top)/geometry.distance)}
function requestRender(){if(!raf)raf=requestAnimationFrame(render)}
function render(){raf=0;progress=target();rendered=drag||reduced.matches?progress:rendered+(progress-rendered)*.25;if(Math.abs(rendered-progress)<.0004)rendered=progress;
  story.style.setProperty('--zip-progress',rendered.toFixed(4));garment.style.transform=`translate(-50%,${-rendered*geometry.size*.30}px)`;
  const zipY=zipStart+(zipEnd-zipStart)*rendered;handle.style.top=`${zipY*100}%`;hint.style.top=`${zipY*100}%`;hint.style.opacity=rendered>.08?'0':'1';handle.style.opacity=rendered>.995?'.35':'1';
  handle.setAttribute('aria-valuenow',String(Math.round(rendered*100)));handle.setAttribute('aria-valuetext',rendered>.99?'Am unteren Anschlag, verbunden':`${Math.round(rendered*100)} Prozent geöffnet`);
  $('#zipPercent').textContent=String(Math.round(rendered*100)).padStart(2,'0');$('.shop-header').classList.toggle('scrolled',scrollY>60);
  if(sequence&&!reduced.matches)sequence.draw(rendered);if(rendered!==progress)requestRender();
}
function go(p){window.scrollTo({top:geometry.top+clamp(p)*geometry.distance,behavior:'instant'});requestRender()}
handle.addEventListener('pointerdown',e=>{if(reduced.matches||!ready||e.button>0)return;e.preventDefault();handle.setPointerCapture(e.pointerId);drag={id:e.pointerId,y:e.clientY,start:target()};handle.classList.add('dragging');requestRender()});
handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();go(drag.start+(e.clientY-drag.y)/geometry.travel)});
function release(e){if(drag&&(!e||e.pointerId===drag.id)){drag=null;handle.classList.remove('dragging');requestRender()}}
handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);handle.addEventListener('lostpointercapture',release);
handle.addEventListener('keydown',e=>{const next={ArrowDown:target()+.06,ArrowRight:target()+.06,ArrowUp:target()-.06,ArrowLeft:target()-.06,PageDown:target()+.2,PageUp:target()-.2,Home:0,End:1};if(e.key in next){e.preventDefault();go(next[e.key])}});
let viewportWidth=innerWidth;
addEventListener('scroll',requestRender,{passive:true});addEventListener('resize',()=>{if(innerWidth!==viewportWidth){drag=null;viewportWidth=innerWidth}measure()});
function motionPreference(){hint.firstChild.textContent=touch.matches?'ZIEH DEN ZIPPER ':'SCROLL ZUM ÖFFNEN ';measure();if(!reduced.matches&&!sequence)loadSequence()}
reduced.addEventListener('change',motionPreference);touch.addEventListener('change',motionPreference);
let sequenceStarted=false;
async function loadSequence(){if(sequenceStarted)return;sequenceStarted=true;try{sequence=await createZipSequence(canvas,m=>{if(!m){unavailable();return}ready=true;zipStart=m.zipStart;zipEnd=m.zipEnd;garment.classList.add('sequence-ready');$('#zipReadiness').textContent='';measure()},requestRender);requestRender()}catch{unavailable()}}
function unavailable(){story.classList.add('sequence-unavailable');$('#zipReadiness').textContent='Entdecke alle Bilder und Details weiter unten.'}
handle.setAttribute('aria-description','Der Reißverschluss bleibt am unteren Ende verbunden. Alternativ direkt zum Produkt springen.');motionPreference();
// Native links remain usable without JavaScript; with motion enabled they ease to details.
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
