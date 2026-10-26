import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=process.argv[2];
if(!source)throw Error('Usage: node production/build-zip-sequence.mjs /path/to/macro-source.mp4');
const root='dist/assets/shop/zip-macro',manifest=JSON.parse(readFileSync(`${root}/manifest.json`,'utf8'));
for(const [size,path,quality]of [[1600,root,86],[960,`${root}/mobile`,82]]){
 mkdirSync(path,{recursive:true});
 const run=args=>{const r=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit'});if(r.status!==0)throw Error('Frame extraction failed')};
 run(['-i',source,'-vf',`select=lte(n\\,264)*not(mod(n\\,2)),scale=${size}:${size}`,'-fps_mode','vfr','-start_number','0','-c:v','libwebp','-quality',String(quality),`${path}/%03d.webp`]);
 if(size===960)run(['-ss','11','-i',source,'-vf','scale=1600:1600','-frames:v','1','-c:v','libwebp','-quality','90',`${path}/132.webp`]);
 const chunks=[];for(let i=0;i<manifest.count;i++){const bytes=readFileSync(`${path}/${String(i).padStart(3,'0')}.webp`),header=Buffer.alloc(4);header.writeUInt32LE(bytes.length);chunks.push(header,bytes)}writeFileSync(`${path}/frames.bin`,Buffer.concat(chunks));
}
