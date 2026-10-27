// Optional browser regression: install Playwright or set PLAYWRIGHT_MODULE.
// Usage: node test/browser/gate-turn.cjs https://your-site.example
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const base=process.argv[2]||'http://localhost:3000';
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/gate');
  await page.waitForFunction(()=>document.documentElement.dataset.intro==='complete'&&document.querySelector('#lightCanvas').dataset.turnState==='ready',null,{timeout:60000});

  const samples=async(end)=>page.evaluate(end=>new Promise(resolve=>{let a=[],start=performance.now();function tick(){a.push(Number(document.querySelector('#lightCanvas').dataset.turn||0));if(performance.now()-start<15000&&(a.at(-1)!==end||a.length<2))requestAnimationFrame(tick);else resolve(a)}tick()}),end);
  const forward=samples(47);
  if(mobile){await page.locator('.light-scene').evaluate(el=>{const r=el.getBoundingClientRect();for(const [type,x]of [['pointerdown',r.left+r.width*.5],['pointermove',r.right-2],['pointerup',r.right-2]])el.dispatchEvent(new PointerEvent(type,{pointerType:'touch',pointerId:2,bubbles:true,clientX:x,clientY:r.top+200}))})}
  else await page.mouse.move(1435,450);
  const f=await forward;assert.equal(f.at(-1),47);assert(f.every((v,i)=>!i||v>=f[i-1]),'forward never rewinds');assert(new Set(f).size>15,'multiple intermediate angles');

  const reverse=samples(0);await page.locator('.light-scene').focus();await page.keyboard.press('Home');
  const r=await reverse;assert.equal(r.at(-1),0);assert(r.every((v,i)=>!i||v<=r[i-1]),'reverse never jumps forward');
  await page.keyboard.press('ArrowLeft');await page.waitForTimeout(250);assert.equal(await page.locator('#lightCanvas').getAttribute('data-turn'),'0');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log({mobile,forwardFrames:new Set(f).size,reverseFrames:new Set(r).size,variant:await page.locator('#lightCanvas').getAttribute('data-turn-variant'),errors});await page.close();
 }
 // Native touch-end must not reset the garment; vertical page scrolling survives.
 const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await touch.goto(base+'/gate');await touch.waitForFunction(()=>document.querySelector('#lightCanvas').dataset.turnState==='ready'&&document.documentElement.dataset.intro==='complete',null,{timeout:60000});
 const cdp=await touch.context().newCDPSession(touch);
 const gesture=(type,x,y=480)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
 await gesture('touchStart',195);
 for(const x of [230,270,315,380]){await gesture('touchMove',x);await touch.waitForTimeout(70)}
 await gesture('touchEnd');await touch.waitForFunction(()=>+document.querySelector('#lightCanvas').dataset.turn>=46,{timeout:15000});
 assert.equal(await touch.evaluate(()=>scrollY),0);
 await gesture('touchStart',380);
 for(const x of [330,290,220,195]){await gesture('touchMove',x);await touch.waitForTimeout(70)}
 await gesture('touchEnd');await touch.waitForFunction(()=>+document.querySelector('#lightCanvas').dataset.turn===0,{timeout:15000});
 await gesture('touchStart',195);await gesture('touchMove',195,300);await gesture('touchMove',195,180);await gesture('touchEnd');
 await touch.waitForTimeout(350);assert(await touch.evaluate(()=>scrollY)>0);await touch.close();
 console.log('Native touch forward/reverse and vertical scrolling passed');
 // Reduced motion does not download the sequence until explicitly requested.
 const reduced=await browser.newPage({reducedMotion:'reduce'});let frames=0;reduced.on('request',r=>{if(/turn\/(mobile|desktop)\//.test(r.url()))frames++});
 await reduced.goto(base+'/gate');await reduced.waitForFunction(()=>document.querySelector('.light-scene').classList.contains('scene-loaded'));await reduced.waitForTimeout(500);assert.equal(frames,0);await reduced.close();
 // A missing intermediate frame leaves a usable front view and ring.
 const fail=await browser.newPage();await fail.route('**/turn/desktop/003.webp',route=>route.abort());await fail.goto(base+'/gate');await fail.waitForFunction(()=>document.querySelector('#lightCanvas').dataset.turnState==='unavailable');assert.equal(await fail.locator('#lightCanvas').getAttribute('data-renderer'),'mesh-3d');await fail.mouse.move(1200,300);await fail.waitForTimeout(350);assert(Number(await fail.locator('#lightCanvas').getAttribute('data-light'))>.5);await fail.close();
 await browser.close();console.log('Reduced motion and missing-frame fallback passed');
})().catch(e=>{console.error(e);process.exit(1)});
