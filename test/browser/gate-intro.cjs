// Browser integration check for the shared loading/header brand transition.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.argv[2]||'http://localhost:3000';
const screenshot=async(page,name)=>{if(process.env.SCREENSHOT_DIR)await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/${name}.png`})};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  // Hold both scripts so the browser paints the HTML before intro setup or WebGL.
  // A cold navigation must show the loading shell, never the fallback garment.
  for(const width of [1440,390]){
   const cold=await browser.newPage({viewport:{width,height:width>900?1000:844},deviceScaleFactor:width>900?1:2,isMobile:width<900});
   let releaseScripts;const pending=new Promise(resolve=>{releaseScripts=resolve});
   await cold.route(/\/(gate-intro|light-gate)\.js/,async route=>{await pending;await route.continue()});
   await cold.goto(base+'/gate',{waitUntil:'commit'});
   await cold.locator('.gate-intro').waitFor({state:'visible'});
   await cold.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await cold.locator('main').evaluate(e=>getComputedStyle(e).visibility),'hidden','Gate is hidden before intro script starts');
   assert.equal(await cold.locator('.intro-bar .load-number').textContent(),'0');
   assert.equal(await cold.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight*.7)?.closest('.gate-intro')!==null),true,'Loading shell covers the entire first paint');
   await screenshot(cold,`intro-${width}-first-paint`);releaseScripts();
   await cold.waitForFunction(()=>document.documentElement.dataset.intro==='complete');
   assert.equal(await cold.locator('main').evaluate(e=>getComputedStyle(e).visibility),'visible');
   console.log({width,firstPaint:'loading shell',gateFlash:false});await cold.close();
  }
  for(const width of [1440,390]){
   const p=await browser.newPage({viewport:{width,height:width>900?1000:844},deviceScaleFactor:width>900?1:2,hasTouch:width<900,isMobile:width<900});
   const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/gate',{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>Array.from(document.querySelectorAll('.intro-brand img')).length===2&&Array.from(document.querySelectorAll('.intro-brand img')).every(e=>e.complete&&e.naturalWidth));
   const start=await p.evaluate(()=>Object.fromEntries(['emblem','wordline','bar'].map(name=>[name,document.querySelector(`.intro-${name}`).getBoundingClientRect().toJSON()])));
   assert(Math.abs(start.emblem.x+start.emblem.width/2-start.wordline.x-start.wordline.width/2)<1,'Loading symbols overlap on their central axis');
   await screenshot(p,`intro-${width}-start`);
   await p.waitForFunction(()=>document.documentElement.dataset.intro==='arriving'&&document.querySelector('.gate-intro>.intro-emblem')?.getAnimations().length);
   await p.evaluate(()=>{window.introAnimations=document.querySelector('.gate-intro').getAnimations({subtree:true});for(const a of window.introAnimations){a.pause();a.currentTime=600}});
   const middle=await p.evaluate(()=>Object.fromEntries(['emblem','wordline','bar'].map(name=>[name,document.querySelector(`.gate-intro>.intro-${name}`).getBoundingClientRect().toJSON()])));
   assert(middle.emblem.x<start.emblem.x&&middle.emblem.y<start.emblem.y,'Elephant travels up and left');
   assert(middle.wordline.y<start.wordline.y&&middle.wordline.x+middle.wordline.width/2>start.wordline.x+start.wordline.width/2,'Lettering travels up and to the right');
   assert(middle.bar.y>start.bar.y,'Loading bar travels independently down onto the hoodie');
   assert.equal(await p.locator('.wordmark').evaluate(e=>getComputedStyle(e).visibility),'hidden','No duplicate header mark during flight');
   assert.equal(await p.locator('.hero-copy').evaluate(e=>getComputedStyle(e).opacity),'0','Hero copy stays clear of the moving logo');
   await screenshot(p,`intro-${width}-flight`);
   await p.evaluate(()=>{for(const a of window.introAnimations)a.currentTime=1199.99});
   const landing=await p.evaluate(()=>{
    const logo=document.querySelector('.brand-lockup').getBoundingClientRect();
    const parts=['emblem','wordline'].map(name=>document.querySelector(`.gate-intro>.intro-${name}`).getBoundingClientRect().toJSON());
    return{parts,expected:[{x:logo.x,y:logo.y,width:logo.width*1316/4733,height:logo.height},{x:logo.x+logo.width*1546/4733,y:logo.y+logo.height*27/1170,width:logo.width*3187/4733,height:logo.height*1115/1170}]};
   });
   for(let i=0;i<2;i++)for(const key of ['x','y','width','height'])assert(Math.abs(landing.parts[i][key]-landing.expected[i][key])<.5,`Seamless ${key} handoff at ${width}px`);
   await p.evaluate(()=>{for(const a of window.introAnimations)a.play()});
   await p.waitForFunction(()=>document.documentElement.dataset.intro==='complete');
   assert.equal(await p.locator('.gate-intro').count(),0);assert.equal(await p.locator('header').evaluate(e=>e.inert),false);
   assert.equal(await p.locator('.wordmark').evaluate(e=>getComputedStyle(e).visibility),'visible');
   assert.equal(await p.locator('.drop-loader .load-number').textContent(),'72');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
   assert.deepEqual(errors,[]);await screenshot(p,`intro-${width}-complete`);console.log({width,brandHandoff:true,errors});await p.close();
  }
  const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(base+'/gate');await reduced.waitForFunction(()=>document.documentElement.dataset.intro==='complete');assert.equal(await reduced.locator('.gate-intro').count(),0);assert.equal(await reduced.locator('main').evaluate(e=>e.inert),false);await reduced.close();
  const failed=await browser.newPage();await failed.route('**/tensa-wordmark-vector.svg',r=>r.abort());await failed.route('**/light-gate.js*',r=>r.abort());await failed.goto(base+'/gate');await failed.waitForFunction(()=>document.documentElement.dataset.intro==='complete',null,{timeout:12000});assert.equal(await failed.locator('main').evaluate(e=>e.inert),false);assert.equal(await failed.locator('.wordmark').evaluate(e=>getComputedStyle(e).visibility),'visible');await failed.close();
  const resized=await browser.newPage();await resized.goto(base+'/gate');await resized.waitForFunction(()=>document.documentElement.dataset.intro==='arriving');await resized.setViewportSize({width:390,height:844});await resized.waitForFunction(()=>document.documentElement.dataset.intro==='complete');assert.equal(await resized.locator('.gate-intro').count(),0);await resized.close();
  const missingIntro=await browser.newPage();await missingIntro.route('**/gate-intro.js*',r=>r.abort());await missingIntro.goto(base+'/gate');await missingIntro.waitForFunction(()=>document.documentElement.dataset.intro==='complete',null,{timeout:12000});assert.equal(await missingIntro.locator('main').evaluate(e=>getComputedStyle(e).visibility),'visible');assert.equal(await missingIntro.locator('.gate-intro').count(),0);await missingIntro.close();
  const noJS=await browser.newPage({javaScriptEnabled:false});await noJS.goto(base+'/gate');assert.equal(await noJS.locator('.gate-intro').isVisible(),false);assert.equal(await noJS.locator('main').evaluate(e=>getComputedStyle(e).visibility),'visible');await noJS.close();
  console.log('Reduced motion, unavailable assets/module, and resize all release the page');
  console.log('Missing intro script and disabled JavaScript also keep the gate accessible');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
