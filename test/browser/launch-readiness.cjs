// Responsive launch checks. WebKit/Chromium emulate engines/viewports, not hardware keyboards.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.argv[2]||'http://localhost:3005';
const safari=process.env.BROWSER_ENGINE==='webkit';
(async()=>{
 const browser=await(safari?webkit:chromium).launch(safari?{}:{executablePath:process.env.BROWSER_PATH||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  for(const width of safari?[390]:[1440,390,412,320]){
   const page=await browser.newPage({viewport:{width,height:width>900?1000:844},isMobile:width<900,hasTouch:width<900});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));let sent;
   await page.route('**/api/waitlist',async route=>{sent=route.request().postDataJSON();await route.fulfill({status:202,json:{message:'Lokaler Formulartest erfolgreich.'}})});
   await page.goto(base+'/gate');await page.waitForFunction(()=>document.documentElement.dataset.intro==='complete');
   assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'),'1200');
   assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'),'630');
   assert.match(await page.locator('meta[property="og:image"]').getAttribute('content'),/^https:\/\/www\.tensa\.shop\//);
   assert.equal(await page.locator('.instagram-link').getAttribute('href'),'https://www.instagram.com/tensa.official/');
   assert.equal(await page.locator('[name=website]').isVisible(),false);
   assert(!/Website|website/.test(await page.locator('body').ariaSnapshot()),'Spam trap is absent from the accessibility tree');
   assert.match(await page.locator('.scene-fallback>img').first().getAttribute('alt'),/TENSA Zip-Hoodie/);
   assert(!/Move the light|Almost ready|Coming soon/.test(await page.locator('body').innerText()));
   if(width<900){
    await page.locator('.light-scene').evaluate(e=>{e.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',clientX:30,clientY:400,bubbles:true}));e.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',clientX:innerWidth-10,clientY:400,bubbles:true}));e.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',clientX:innerWidth-10,clientY:400,bubbles:true}))});
    await page.waitForFunction(()=>Number(document.querySelector('.light-scene').getAttribute('aria-valuenow'))>40);
   }
   await page.locator('.access-link').click();await page.waitForFunction(()=>document.querySelector('#access').dataset.visible==='true');
   await page.locator('#email').fill('fixture@example.com');
   if(width<900){await page.setViewportSize({width,height:480});await page.waitForTimeout(400)}
   await page.locator('[name=consent]').check();await page.locator('.join-button').scrollIntoViewIfNeeded();
   const button=await page.locator('.join-button').boundingBox();assert(button.y>=0&&button.y+button.height<=page.viewportSize().height+1,'Submit is reachable with reduced available height');
   await page.locator('.join-button').click();await page.waitForFunction(()=>document.querySelector('#formStatus').textContent==='Lokaler Formulartest erfolgreich.');
   assert.equal(sent.email,'fixture@example.com');assert.equal(sent.consent,true);assert.equal(sent.website,'');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
   const bytes=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/assets\//.test(r.name)).reduce((n,r)=>n+r.encodedBodySize,0));
   console.log({engine:safari?'webkit':'chromium',width,form:true,hiddenHoneypot:true,touchLight:width<900,assetKB:Math.round(bytes/1024)});await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
