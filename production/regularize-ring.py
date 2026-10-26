"""Rebuild the generated ring's circular tube with regular topology.
The Tripo original stays archived separately. This local precision remesh uses
its normalized dimensions and emission material; it makes no paid API calls.
Run: python production/regularize-ring.py
"""
import json, math, struct
from pathlib import Path
import numpy as np
path=Path('dist/assets/light/ring.glb')
raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
model=json.loads(raw[20:20+length])
major,tube,segments,sides=.946,.052,512,32
p=[];n=[];indices=[]
for i in range(segments):
 a=2*math.pi*i/segments
 for j in range(sides):
  b=2*math.pi*j/sides
  normal=(math.cos(a)*math.cos(b),math.sin(a)*math.cos(b),math.sin(b))
  p.append(((major+tube*math.cos(b))*math.cos(a),(major+tube*math.cos(b))*math.sin(a),tube*math.sin(b)))
  n.append(normal)
  v=i*sides+j;next_i=((i+1)%segments)*sides+j;next_j=i*sides+(j+1)%sides;both=((i+1)%segments)*sides+(j+1)%sides
  indices.extend([v,next_i,next_j,next_j,next_i,both])
p=np.asarray(p,dtype='<f4');n=np.asarray(n,dtype='<f4');idx=np.asarray(indices,dtype='<u2')
data=b'';views=[]
for chunk in [p.tobytes(),n.tobytes(),idx.tobytes()]:
 data+=b'\0'*(-len(data)%4);views.append({'buffer':0,'byteOffset':len(data),'byteLength':len(chunk)});data+=chunk
model['asset']['generator']='TENSA precision remesh of generated ring dimensions'
model['buffers']=[{'byteLength':len(data)}];model['bufferViews']=views
model['accessors']=[{'bufferView':0,'componentType':5126,'count':len(p),'type':'VEC3','min':p.min(axis=0).tolist(),'max':p.max(axis=0).tolist()},{'bufferView':1,'componentType':5126,'count':len(n),'type':'VEC3'},{'bufferView':2,'componentType':5123,'count':len(idx),'type':'SCALAR'}]
j=json.dumps(model,separators=(',',':')).encode();j+=b' '*(-len(j)%4);data+=b'\0'*(-len(data)%4)
path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data)
print(json.dumps({'vertices':len(p),'triangles':len(idx)//3,'bytes':path.stat().st_size}))
