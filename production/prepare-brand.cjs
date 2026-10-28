const sharp=require(process.env.SHARP_MODULE||'sharp');const fs=require('fs');const path=require('path');
if(!process.argv[2])throw Error('Usage: node production/prepare-brand.cjs source.png [preview.png]');
(async()=>{
 const clean=await sharp(process.argv[2]).greyscale().threshold(100).png().toBuffer();
 const art=await sharp(clean).resize({width:2600}).png({compressionLevel:9,palette:true,colours:32,dither:0}).toBuffer();
 // Use the generated icon and generated lettering as two responsive UI assets.
 // A monochrome threshold removes background grain; viewports establish header proportions.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 4733 1170" role="img"><title>TENSA. — Elephant and wordmark</title><defs><image id="art" width="6336" height="2688" xlink:href="data:image/png;base64,${art.toString('base64')}"/><mask id="logo" maskUnits="userSpaceOnUse" x="0" y="0" width="4733" height="1170" style="mask-type:luminance"><svg x="0" y="0" width="1316" height="1170" viewBox="42 51 2911 2588" overflow="hidden"><use xlink:href="#art"/></svg><svg x="1546" y="27" width="3187" height="1115" viewBox="3077 806 3187 1115" overflow="hidden"><use xlink:href="#art"/></svg></mask></defs><path fill="#f0eee8" mask="url(#logo)" d="M0 0h4733v1170H0z"/></svg>`;
 fs.writeFileSync(path.join(__dirname,'../dist/assets/brand/tensa-lockup.svg'),svg);
 // PNG preview for exporting the assembled lockup; runtime uses the SVG mask.
 if(process.argv[3])await sharp(Buffer.from(svg)).resize({width:1800}).png().toFile(process.argv[3]);
 console.log({svgBytes:Buffer.byteLength(svg)});
})().catch(e=>{console.error(e);process.exit(1)});
