// Render web icons and the share card from the existing brand/product assets.
// Regenerate the card after replacing the sample photograph; no new artwork.
const {readFileSync,writeFileSync,mkdirSync}=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const sharp=require(process.env.SHARP_MODULE||'sharp');
const data=(path,mime)=>`data:${mime};base64,${readFileSync(path).toString('base64')}`;
(async()=>{
 const elephant=readFileSync('dist/assets/brand/tensa-elephant-vector.svg','utf8').replace('<svg ', '<svg x="14" y="16" width="100" height="96" ');
 const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="20" fill="#050505"/>${elephant}</svg>`;
 writeFileSync('dist/favicon.svg',icon);
 await sharp(Buffer.from(icon)).resize(180,180).png().toFile('dist/apple-touch-icon.png');
 const png=await sharp(Buffer.from(icon)).resize(32,32).png().toBuffer();
 const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico[6]=32;ico[7]=32;ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);writeFileSync('dist/favicon.ico',Buffer.concat([ico,png]));
 mkdirSync('dist/assets/social',{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||undefined,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.setContent(`<!doctype html><html lang="de"><meta charset="utf-8"><style>
   @font-face{font-family:Brand;src:url('${data('dist/assets/fonts/font-5.ttf','font/ttf')}')}*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#050505;color:#f0eee8;font-family:Brand,Arial,sans-serif}.wordmark{position:absolute;left:70px;top:65px;width:475px;height:auto}.copy{position:absolute;left:70px;top:260px;z-index:3}h1{font-size:59px;letter-spacing:-2.4px;font-weight:500;line-height:1.05;margin:0 0 25px}p{font-size:26px;color:#b9bbae;line-height:1.4;margin:0}.offer{color:#e0e5c9}.domain{position:absolute;left:70px;bottom:53px;font-size:18px;color:#a5a79c}.product{position:absolute;right:-15px;top:12px;width:650px;height:650px}.ring{position:absolute;left:138px;top:129px;width:366px;height:366px;border:9px solid #edece6;border-radius:50%;box-shadow:0 0 12px #ffffff70,0 0 34px #ffffff21}.hoodie{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:brightness(.74)}
  </style><img class="wordmark" src="${data('dist/assets/brand/tensa-lockup-vector.svg','image/svg+xml')}" alt="TENSA."><div class="copy"><h1>Der erste Drop.</h1><p>Trag dich ein.<br><span class="offer">Sichere dir 15 % zum Launch.</span></p></div><div class="product"><div class="ring"></div><img class="hoodie" src="${data('dist/assets/light/turn-scroll/front.webp','image/webp')}" alt="TENSA Zip-Hoodie"></div><div class="domain">WWW.TENSA.SHOP</div></html>`);
  await page.evaluate(()=>Promise.all([document.fonts.ready,...Array.from(document.images).map(image=>image.decode())]));
  await page.screenshot({path:'dist/assets/social/launch-preview.jpg',type:'jpeg',quality:91});
 }finally{await browser.close()}
 console.log('Created SVG/ICO favicon, 180px touch icon and 1200×630 share image.');
})().catch(error=>{console.error(error);process.exit(1)});
