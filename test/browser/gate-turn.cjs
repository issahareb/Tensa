// Run with Playwright installed, or set PLAYWRIGHT_MODULE and BROWSER_PATH.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const base=process.argv[2]||'http://localhost:3000';
 const scroll=(page,progress)=>page.evaluate(progress=>{const g=document.querySelector('.gate'),s=document.querySelector('.gate-stage');scrollTo({top:g.offsetTop+(g.offsetHeight-s.offsetHeight)*progress,behavior:'instant'})},progress);
 const settled=(page,progress)=>page.waitForFunction(progress=>Math.abs(Number(document.querySelector('#lightCanvas').dataset.scroll)-progress)<.001,progress,{timeout:20000});
 try{
  for(const width of [1440,390,320]){
   const mobile=width<700,p=await browser.newPage({viewport:{width,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile});const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/gate');await p.waitForFunction(()=>document.documentElement.dataset.intro==='complete'&&document.querySelector('#lightCanvas').dataset.turnState==='ready',null,{timeout:60000});
   assert.equal(await p.locator('#lightCanvas').getAttribute('data-turn'),'0');assert(await p.locator('#access').evaluate(e=>e.inert));
   if(mobile){
    const c=await p.context().newCDPSession(p);
    await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width*.4,y:480}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width*.9,y:480}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else await p.mouse.move(width-5,450);
   await p.waitForTimeout(500);assert.equal(await p.locator('#lightCanvas').getAttribute('data-turn'),'0','Hero input only moves light');
   const samples=p.evaluate(()=>new Promise(resolve=>{const a=[];let start=performance.now();function tick(){a.push(Number(document.querySelector('#lightCanvas').dataset.turn||0));if(performance.now()-start<18000&&(a.at(-1)!==63||a.length<2))requestAnimationFrame(tick);else resolve(a)}tick()}));
   await scroll(p,1);const frames=await samples;assert.equal(frames.at(-1),63);assert(frames.every((v,i)=>!i||v>=frames[i-1]),'Scroll forward never rewinds');await settled(p,1);
   assert.equal(await p.locator('#lightCanvas').getAttribute('data-rise'),'1.000');
   assert.equal(await p.locator('#access').evaluate(e=>e.inert),false);
   assert.equal(await p.locator('#accessTitle').innerText(),'Jetzt eintragen\nfür 15 %!');
   assert(await p.evaluate(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--scene-scale'))>1));
   await p.waitForFunction(()=>!document.querySelector('#access').getAnimations().some(a=>a.playState==='running'));
   const canvasBounds=await p.locator('#lightCanvas').boundingBox();assert(Math.abs(canvasBounds.x+canvasBounds.width/2-width/2)<1,'Halo and hoodie remain centered');
   const bounds=await p.locator('#access').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);assert(bounds.y+bounds.height<=844+(mobile?0:156),JSON.stringify({width,bounds}));
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   for(const selector of ['.edition','.load-caption','.light-caption','.email-label','footer'])assert(!/monospace/.test(await p.locator(selector).evaluate(e=>getComputedStyle(e).fontFamily)));
   if(!mobile){
    let sent;await p.route('**/api/waitlist',async route=>{sent=route.request().postDataJSON();await route.fulfill({json:{message:'Test erfolgreich.'}})});
    await p.locator('#email').fill('gate-test@example.com');await p.locator('[name=consent]').check();await p.locator('.join-button').click();await p.waitForFunction(()=>document.querySelector('#formStatus').textContent==='Test erfolgreich.');assert.equal(sent.consent,true);
   }
   await scroll(p,0);await settled(p,0);await p.waitForFunction(()=>document.querySelector('#lightCanvas').dataset.turn==='0');assert(await p.locator('#access').evaluate(e=>e.inert));
   if(mobile){const c=await p.context().newCDPSession(p);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width/2,y:520}]});await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2,y:320}]});await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2,y:180}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(400);assert(await p.evaluate(()=>scrollY)>0)}
   assert.deepEqual(errors,[]);console.log({width,monotonicFrames:new Set(frames).size,passed:true});await p.close();
  }
  const reduced=await browser.newPage({reducedMotion:'reduce'});let count=0;reduced.on('request',r=>{if(/turn-scroll\/(desktop|mobile)\//.test(r.url()))count++});await reduced.goto(base+'/gate');await reduced.waitForFunction(()=>document.querySelector('.light-scene').classList.contains('scene-loaded'));await scroll(reduced,1);await settled(reduced,1);assert.equal(count,0);assert.equal(await reduced.locator('#access').evaluate(e=>e.inert),false);await reduced.close();
  const failed=await browser.newPage();await failed.route('**/turn-scroll/desktop/003.webp',r=>r.abort());await failed.goto(base+'/gate');await failed.waitForFunction(()=>document.querySelector('#lightCanvas').dataset.turnState==='unavailable');await scroll(failed,1);await settled(failed,1);assert.equal(await failed.locator('#access').evaluate(e=>e.inert),false);await failed.close();console.log('Reduced motion and missing frame preserve signup');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
