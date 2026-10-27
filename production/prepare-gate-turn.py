"""Prepare deterministic RGBA turn frames from TENSA's approved Higgsfield film.

No garment geometry, lettering, print or motion is generated here. Remove the
neutral studio background and keep one fixed framing for the entire take.
Usage: python3 production/prepare-gate-turn.py /path/to/hero-source.mp4 [preview.jpg]
"""
from pathlib import Path
import cv2, numpy as np, json, sys
from PIL import Image

out=Path(__file__).resolve().parents[1]/'dist/assets/light/turn'
out.mkdir(parents=True,exist_ok=True)
cap=cv2.VideoCapture(sys.argv[1])
count=48
indices=np.rint(np.linspace(.75*24,3.8*24,count)).astype(int)
frames=[]; source_index=0; wanted=0
while wanted<count:
    ok,bgr=cap.read()
    if not ok: raise RuntimeError('Incomplete Higgsfield film')
    if source_index!=indices[wanted]:
        source_index+=1; continue
    rgb=cv2.cvtColor(cv2.resize(bgr,(1600,1600),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2RGB)
    gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
    seed=(gray<105).astype('uint8')
    n,labels,stats,_=cv2.connectedComponentsWithStats(seed)
    mask=(labels==(1+np.argmax(stats[1:,cv2.CC_STAT_AREA]))).astype('uint8')*255
    # Fill bright zipper/embroidery holes, but retain open space beside sleeves.
    exterior=mask.copy();cv2.floodFill(exterior,None,(0,0),255)
    mask=cv2.bitwise_or(mask,cv2.bitwise_not(exterior))
    # Inset the keyed edge slightly to avoid pale studio-background fringes.
    mask=cv2.erode(mask,np.ones((3,3),np.uint8),iterations=1)
    alpha=cv2.GaussianBlur(mask,(3,3),.55)
    rgba=np.dstack((rgb,alpha)); rgba[alpha==0,:3]=0
    image=Image.fromarray(rgba)
    if wanted==0:image.save(out/'front.webp',quality=94,method=6)
    if wanted==count-1:image.save(out/'back.webp',quality=94,method=6)
    for label,size in [('desktop',1280),('mobile',896)]:
        target=out/label;target.mkdir(exist_ok=True)
        image.resize((size,size),Image.Resampling.LANCZOS).save(target/f'{wanted:03}.webp',quality=88,method=4)
    if wanted in [0,8,16,24,32,40,47]:
        thumb=Image.new('RGB',(300,300),'#050505');small=image.resize((300,300));thumb.paste(small,(0,0),small);frames.append(thumb)
    wanted+=1;source_index+=1
    if wanted%12==0:print(f'{wanted}/{count}',flush=True)
contact=Image.new('RGB',(300*len(frames),300))
for i,im in enumerate(frames):contact.paste(im,(i*300,0))
if len(sys.argv)>2:contact.save(sys.argv[2])
(out/'manifest.json').write_text(json.dumps({'count':count,'desktop':1280,'mobile':896,'source':'Higgsfield Kling 3.0','generation':'53270b45-8648-4ccf-a79d-120bde9b9fa8','startSeconds':.75,'endSeconds':3.8,'approximateTurnDegrees':115},indent=2)+'\n')
