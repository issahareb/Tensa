import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=process.argv[2];
if(!source)throw Error('Usage: node production/build-zip-sequence.mjs /path/to/source.mp4');
for(const [size,path,quality]of [[960,'dist/assets/shop/zip',80],[640,'dist/assets/shop/zip/mobile',78]]){
 mkdirSync(path,{recursive:true});
 const r=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',source,'-vf',`select=between(n\\,15\\,134),scale=${size}:${size}`,'-fps_mode','vfr','-start_number','0','-c:v','libwebp','-quality',String(quality),`${path}/%03d.webp`],{stdio:'inherit'});
 if(r.status!==0)throw Error('Frame extraction failed');
 const chunks=[];for(let i=0;i<120;i++){const bytes=readFileSync(`${path}/${String(i).padStart(3,'0')}.webp`),header=Buffer.alloc(4);header.writeUInt32LE(bytes.length);chunks.push(header,bytes)}writeFileSync(`${path}/frames.bin`,Buffer.concat(chunks));
}
