import {initApplePay} from '/apple-pay.js?v=payments-1';
import {createHeroFilm} from '/hero-film.js?v=film-2';
const $=s=>document.querySelector(s),clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const story=$('#zipStory'),stage=$('.zip-stage'),garment=$('#garment'),canvas=$('#zipCanvas');
let scene=null,progress=0,raf=0,last=0,visible=true;
let geometry={top:0,distance:1,width:0,height:0};
function measure(){const width=stage.clientWidth,height=stage.clientHeight;geometry={top:scrollY+story.getBoundingClientRect().top,distance:Math.max(1,story.offsetHeight-height),width,height};scene?.resize(garment.clientWidth,garment.clientHeight);requestRender()}
function requestRender(){if(!raf)raf=requestAnimationFrame(render)}
function render(time){raf=0;const target=reduced.matches?0:clamp((scrollY-geometry.top)/geometry.distance);const dt=Math.min(50,last?time-last:16);last=time;progress+= (target-progress)*(1-Math.exp(-dt/80));if(Math.abs(target-progress)<.0001)progress=target;
 story.style.setProperty('--zip-progress',progress.toFixed(5));story.dataset.progress=progress.toFixed(5);story.dataset.phase=progress>.84?'back':'rotate';
 $('#zipPercent').textContent=progress<.25?'FRONT':progress<.7?'TURN':'BACK';$('#zipHoldHint').classList.toggle('visible',progress>.84&&progress<.99);$('.shop-header').classList.toggle('scrolled',scrollY>60);
 const rail=$('#purchaseRail'),showRail=scrollY>geometry.distance+geometry.height*.5&&!$('#bag').open;rail.classList.toggle('visible',showRail);rail.inert=!showRail;
 if(scene&&visible&&!reduced.matches)scene.draw(clamp(progress/.84));if(progress!==target&&visible)requestRender();else last=0;
}
addEventListener('scroll',requestRender,{passive:true});let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(measure,120)});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestRender()}).observe(stage);
async function loadScene(){if(reduced.matches||scene)return;try{scene=await createHeroFilm(canvas);measure();scene.draw(clamp(progress/.84));garment.classList.add('sequence-ready');$('#zipReadiness').textContent=''}catch{story.classList.add('sequence-unavailable');$('#zipReadiness').textContent='Alle Produktbilder findest du weiter unten.';measure()}}
reduced.addEventListener('change',()=>{measure();loadScene()});measure();loadScene();
document.querySelectorAll('a[href="#product"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();$('#product').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'})}));

let config={},selectedSize=null,items=[],paymentBusy=false;const validSizes=['XS','S','M','L','XL'];
try{const stored=JSON.parse(localStorage.getItem('tensa-drop001-bag')||'[]');if(Array.isArray(stored))items=stored.filter(x=>x&&validSizes.includes(x.size)&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=10).map(x=>({size:x.size,qty:x.qty}))}catch{}
const bag=$('#bag');
let checkoutKey=null;function save(){checkoutKey=null;try{localStorage.setItem('tensa-drop001-bag',JSON.stringify(items))}catch{}$('#cartCount').textContent=items.reduce((n,x)=>n+x.qty,0)}
function renderBag(){updateManualSummary();$('#manualOrder').hidden=!(config.manualMethods?.length&&items.length);$('#manualSubmit').disabled=paymentBusy;const price=Number(config.price);$('#bagItems').innerHTML=items.length?items.map((x,i)=>`<div class="cart-line"><img src="/assets/shop/editorial/front.webp" alt="Washed Zip Hoodie"><div>The Washed Zip Hoodie<small>Washed Black / ${x.size}</small><div><button data-index="${i}" data-delta="-1" aria-label="Menge Größe ${x.size} reduzieren">−</button> <span>${x.qty}</span> <button data-index="${i}" data-delta="1" aria-label="Menge Größe ${x.size} erhöhen">+</button> <button class="remove-item" data-remove="${i}">Entfernen</button></div><span class="item-price">${price>0?money(price*x.qty):'Preis folgt'}</span></div></div>`).join(''):'<p>Deine Bag ist noch leer.</p>';$('#bagTotal').textContent=price>0?'Zwischensumme: '+money(items.reduce((n,x)=>n+x.qty*price,0)):'Preis wird ergänzt.'}
document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{selectedSize=b.dataset.size;document.querySelectorAll('[data-size]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#productStatus').textContent=`Größe ${selectedSize} ausgewählt.`}));
$('#addBag').addEventListener('click',()=>{if(!selectedSize){$('#productStatus').textContent='Wähle zuerst deine Größe.';$('[data-size]').focus();return}const item=items.find(x=>x.size===selectedSize);if(item)item.qty=Math.min(10,item.qty+1);else items.push({size:selectedSize,qty:1});save();renderBag();bag.showModal();requestRender()});
$('#openCart').addEventListener('click',()=>{renderBag();bag.showModal();requestRender()});$('#closeCart').onclick=$('#continueShopping').onclick=()=>{bag.close();requestRender()};
$('#bagItems').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.remove!==undefined)items.splice(Number(b.dataset.remove),1);else{const i=Number(b.dataset.index);if(!items[i])return;items[i].qty=clamp(items[i].qty+Number(b.dataset.delta),0,10);if(items[i].qty===0)items.splice(i,1)}save();renderBag();checkoutKey=null});save();
fetch('/api/config').then(r=>{if(!r.ok)throw Error('Product data unavailable');return r.json()}).then(c=>{config=c;configureStore(c);$('#price').textContent=Number(c.price)>0?money(Number(c.price)):'Preis folgt';$('#releaseStatus').textContent='WASHED BLACK'}).catch(()=>{$('#productStatus').textContent='Produktdaten gerade nicht erreichbar. Deine Auswahl bleibt auf diesem Gerät gespeichert.'});
const gallery={front:{src:'/assets/shop/editorial/front.webp',alt:'TENSA Washed Zip Hoodie – Vorderseite',index:'01'},back:{src:'/assets/shop/editorial/back.webp',alt:'TENSA Washed Zip Hoodie – Architektur-Backprint',index:'02'},detail:{src:'/assets/shop/editorial/detail.webp',alt:'Detail des tonalen TENSA-Elefantensticks',index:'03'},worn:{src:'/assets/shop/editorial/model-front.webp',alt:'TENSA Hoodie am Model – generierte Studioaufnahme',index:'04'}};let activeImage='front';
document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{activeImage=b.dataset.image;const image=gallery[activeImage];$('#mainProductImage').src=image.src;$('#mainProductImage').alt=image.alt;$('#imageIndex').textContent=image.index+' / 04';$('#galleryZoom').classList.toggle('detail',activeImage==='detail');$('#galleryZoom').classList.toggle('portrait',activeImage==='worn');document.querySelectorAll('[data-image]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
$('#galleryZoom').onclick=()=>{const image=gallery[activeImage];$('#zoomImage').src=image.src.replace('.webp','-large.webp');$('#zoomImage').alt=image.alt;$('#imageDialog').classList.toggle('detail',activeImage==='detail');$('#imageDialog').showModal()};$('#closeImage').onclick=()=>$('#imageDialog').close();
for(const dialog of [bag,$('#imageDialog')])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
$('a[href="#fitDetails"]').addEventListener('click',()=>{$('#fitDetails').open=true});

function paymentKey(method, binding) {
 const cart=JSON.stringify(binding), storageKey='tensa-checkout-'+method;
 try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(saved?.cart===cart)return saved.id}catch{}
 const id=crypto.randomUUID();try{sessionStorage.setItem(storageKey,JSON.stringify({cart,id}))}catch{}return id;
}
function setPaymentBusy(busy){paymentBusy=busy;for(const node of document.querySelectorAll('#bagItems button,#checkoutButton,#manualOrder input,#manualOrder select,#manualOrder button,#addBag'))node.disabled=busy}
function paidCart(){items=[];save();renderBag();try{sessionStorage.removeItem('tensa-checkout-apple_pay')}catch{}}
function configureStore(c){
 $('#railPrice').textContent=Number(c.price)>0?money(Number(c.price)):'Washed Black';
 if(c.checkoutReady){for(const b of document.querySelectorAll('[data-size]')){const variant=c.sizes.find(v=>v.size===b.dataset.size);b.disabled=!variant?.available;b.setAttribute('aria-label',b.dataset.size+(b.disabled?' – ausverkauft':''))}$('.size-note').textContent=''}
 for(const list of document.querySelectorAll('.payment-methods')){list.setAttribute('aria-label','Konfigurierte Zahlungsarten');list.replaceChildren(...(c.paymentMethods||[]).map(label=>{const span=document.createElement('span');span.textContent=label;return span}))}
 $('#checkoutMode').hidden=c.paymentMode!=='test';$('#checkoutMode').textContent='Testmodus. Keine echte Abbuchung.';$('#checkoutButton').hidden=!c.stripeReady;if(!c.checkoutReady)$('#checkoutStatus').textContent='Der Checkout wird eingerichtet. Deine Auswahl bleibt gespeichert.';
 $('#paymentNote').textContent=c.checkoutReady?(c.paymentMode==='test'?'Testmodus. Es werden keine echten Zahlungen verarbeitet.':'Die Kasse zeigt dir die verfügbaren Zahlungsarten.'):'Checkout wird eingerichtet. Noch keine Zahlungen möglich.';
 $('#servicePayment').textContent=c.checkoutReady?'Verfügbare Zahlungsarten werden im Warenkorb und an der Kasse angezeigt. Apple Pay hängt zusätzlich von Gerät und Wallet ab.':'Die Zahlungsabwicklung wird eingerichtet. Aktuell sind keine Zahlungen möglich.';
 if(c.shippingText){$('#shippingText').textContent=c.shippingText;$('#serviceShipping').textContent=c.shippingText}if(c.returnsText){$('#returnsText').textContent=c.returnsText;$('#serviceReturns').textContent=c.returnsText}if(c.sizeGuide)$('#sizeGuide').textContent=c.sizeGuide;
 if(c.contactEmail){$('#serviceContact').href='mailto:'+c.contactEmail;$('#serviceContact').hidden=false}
 const form=$('#manualOrder');form.hidden=!(c.manualMethods?.length);
 for(const method of c.manualMethods||[]){const o=document.createElement('option');o.value=method;o.textContent=method==='bank_transfer'?'Vorkasse':'Rechnung';$('#manualMethod').append(o)}
 for(const country of c.shippingCountries||[]){const o=document.createElement('option');o.value=country;o.textContent=country;$('#orderCountry').append(o)}
 updateManualSummary();
 // Load third-party SDKs only when the shopper opens the bag and Apple Pay is configured.
 let appleStarted=false;
 const loadApple=()=>{if(appleStarted)return;appleStarted=true;initApplePay({config:c,container:$('#applePayContainer'),getCart:()=>items,getKey:paymentKey,onPaid:paidCart,onTerminal:()=>{try{sessionStorage.removeItem('tensa-checkout-apple_pay')}catch{}},onBusy:setPaymentBusy,status:$('#checkoutStatus')}).catch(()=>{$('#checkoutStatus').textContent='Apple Pay ist gerade nicht erreichbar. Deine Auswahl bleibt erhalten.'})};
 $('#openCart').addEventListener('click',loadApple);$('#addBag').addEventListener('click',loadApple);if(bag.open)loadApple();
}
function updateManualSummary(){
 const method=$('#manualMethod').value;
 $('#manualTerms').textContent=config.manualTerms?.[method]||'';
 const total=items.reduce((n,x)=>n+x.qty*Math.round(Number(config.price)*100),0)+(config.shippingCents||0);
 $('#manualTotal').textContent=Number.isFinite(total)?'Gesamt: '+money(total/100)+' inkl. Versand ('+money((config.shippingCents||0)/100)+')':'';
}
$('#manualMethod').addEventListener('change',updateManualSummary);
$('#manualOrder').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget,status=$('#checkoutStatus');if(!items.length){status.textContent='Dein Warenkorb ist noch leer.';return}
 const customer=Object.fromEntries(new FormData(form));delete customer.method;delete customer.acceptTerms;
 const method=$('#manualMethod').value,expectedTotal=items.reduce((n,x)=>n+x.qty*Math.round(Number(config.price)*100),0)+(config.shippingCents||0);
 const payload={items:items.map(x=>({...x})),customer,method,expectedTotal,acceptTerms:true};payload.requestId=paymentKey('manual',payload);
 const button=$('#manualSubmit');setPaymentBusy(true);
 try{const r=await fetch('/api/orders/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await r.json();if(!r.ok)throw Error(data.error||'Bestellung nicht bestätigt. Bitte erneut versuchen.');
 const result=$('#manualResult');result.hidden=false;result.textContent=(config.paymentMode==='test'?'Testbestellung':'Bestellung')+' gespeichert. Zahlung noch offen. '+data.terms+'\nEmpfänger: '+data.accountHolder+'\nIBAN: '+data.iban+'\nBetrag: '+money(data.totalCents/100)+'\nVerwendungszweck: '+data.reference+'\nBitte speichere diese Angaben. Eine automatische Bestell-E-Mail wird derzeit nicht versendet.';
 try{sessionStorage.setItem('tensa-manual-receipt',result.textContent)}catch{}form.hidden=true;items=[];save();renderBag();status.textContent='Bestellung gespeichert. Noch kein Zahlungseingang bestätigt.';
 }catch(e){status.textContent=e.message}finally{setPaymentBusy(false)}
});
try{const receipt=sessionStorage.getItem('tensa-manual-receipt');if(receipt){$('#manualResult').textContent=receipt;$('#manualResult').hidden=false}}catch{}
$('#checkoutButton').addEventListener('click',async()=>{const button=$('#checkoutButton'),status=$('#checkoutStatus');if(!items.length){status.textContent='Dein Warenkorb ist noch leer.';return}if(!config.stripeReady||paymentBusy){status.textContent='Der Checkout ist derzeit nicht verfügbar. Deine Auswahl bleibt gespeichert.';return}setPaymentBusy(true);button.classList.add('is-loading');status.textContent='Deine sichere Kasse wird geöffnet…';try{const saved=JSON.parse(sessionStorage.getItem('tensa-checkout')||'null');if(saved?.cart===JSON.stringify(items))checkoutKey=saved.id}catch{}checkoutKey??=crypto.randomUUID();try{sessionStorage.setItem('tensa-checkout',JSON.stringify({cart:JSON.stringify(items),id:checkoutKey}))}catch{}try{const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,requestId:checkoutKey})}),data=await r.json();if(!r.ok){if(r.status===409){checkoutKey=null;try{sessionStorage.removeItem('tensa-checkout')}catch{}}throw Error(data.error||'Bitte versuche es erneut.')}const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Ungültige Zahlungsseite');location.assign(url.href)}catch(e){status.textContent=e.message;setPaymentBusy(false);button.classList.remove('is-loading')}});
bag.addEventListener('close',requestRender);
const service=$('#serviceDialog');document.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>service.showModal());$('#closeService').onclick=()=>service.close();
const checkoutQuery=new URLSearchParams(location.search);if(checkoutQuery.has('checkout')){const notice=$('#checkoutNotice');notice.hidden=false;if(checkoutQuery.get('checkout')==='cancelled')notice.textContent='Zurück im Shop. Dein Warenkorb bleibt erhalten.';else{notice.textContent='Deine Zahlung wird geprüft…';const id=checkoutQuery.get('session_id');let tries=0;async function check(){try{const r=await fetch('/api/checkout/status?session_id='+encodeURIComponent(id||''));if(!r.ok)throw Error();const data=await r.json();if(['expired','failed'].includes(data.status)){notice.textContent=data.status==='failed'?'Die Zahlung ist fehlgeschlagen. Dein Warenkorb bleibt erhalten.':'Die Zahlungssitzung ist abgelaufen. Dein Warenkorb bleibt erhalten.';try{sessionStorage.removeItem('tensa-checkout')}catch{}return}if(data.status==='paid'){notice.textContent=config.paymentMode==='test'?'Testzahlung bestätigt.':'Danke. Deine Zahlung ist bestätigt.';items=[];save();try{sessionStorage.removeItem('tensa-checkout')}catch{}return}if(++tries<5){setTimeout(check,2000);return}notice.textContent='Die Zahlungsbestätigung steht noch aus. Bitte kontaktiere uns bei Fragen.'}catch{notice.textContent='Die Bestätigung ist gerade nicht erreichbar. Bitte kontaktiere uns bei Fragen.'}}check()}}
// Light follows the pointer only inside actionable controls; no magnetic movement
// changes their hit targets. Touch gets the same clear pressed feedback.
for(const button of document.querySelectorAll('.shop-cta,.rail-link,.gallery-main'))button.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=button.getBoundingClientRect();button.style.setProperty('--pointer-x',((e.clientX-r.left)/r.width*100)+'%')});

document.querySelectorAll('[data-editorial]').forEach(b=>b.addEventListener('click',()=>{$('#zoomImage').src=b.dataset.editorial.replace('.webp','-large.webp');$('#zoomImage').alt=b.querySelector('img').alt;$('#imageDialog').classList.remove('detail');$('#imageDialog').showModal()}));
