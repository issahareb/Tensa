"""Keep the original 4K colour map; bound auxiliary PBR texture memory for mobile."""
import struct,json,io,sys
from pathlib import Path
from PIL import Image
source=Path(sys.argv[1]);target=Path(sys.argv[2]);raw=source.read_bytes();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length]);binary=raw[28+length:];replacements={}
for index,img in enumerate(gltf['images']):
    if index==0:continue # Embroidery/backprint colour remains pixel-for-pixel original.
    view=gltf['bufferViews'][img['bufferView']];start=view.get('byteOffset',0);picture=Image.open(io.BytesIO(binary[start:start+view['byteLength']]));picture.thumbnail((1024,1024) if index==1 else (2048,2048),Image.Resampling.LANCZOS);out=io.BytesIO();picture.save(out,format='JPEG' if index==1 else 'PNG',quality=95);replacements[img['bufferView']]=out.getvalue()
new=bytearray()
for i,view in enumerate(gltf['bufferViews']):
    while len(new)%4:new.append(0)
    start=view.get('byteOffset',0);data=replacements.get(i,binary[start:start+view['byteLength']]);view['byteOffset']=len(new);view['byteLength']=len(data);new.extend(data)
while len(new)%4:new.append(0)
gltf['buffers'][0]['byteLength']=len(new)
js=json.dumps(gltf,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
output=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(new))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(new),0x004e4942)+new
target.write_bytes(output);print(f'{len(raw)} -> {len(output)} bytes; original 4096px colour, 2048px normal, 1024px ORM')
