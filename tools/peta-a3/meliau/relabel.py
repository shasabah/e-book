import sys, json
import numpy as np
from scipy import ndimage as ndi
S='/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/mlots/'
page=int(sys.argv[1]); it=int(sys.argv[2]); pxm=float(sys.argv[3])
extra=json.loads(sys.argv[4]) if len(sys.argv)>4 else []
wall=np.load(S+'wall%d.npy'%page)
if it: wall=ndi.binary_closing(wall,iterations=it,border_value=1)
if extra:
    from PIL import Image, ImageDraw
    im=Image.fromarray(wall.astype('uint8')*255); d=ImageDraw.Draw(im)
    for seg in extra: d.line([tuple(p) for p in seg],fill=255,width=7)
    wall=np.array(im)>0
lab,n=ndi.label(~wall)
sizes=np.bincount(lab.ravel())
inner=ndi.distance_transform_edt(~wall)
mx=ndi.maximum(inner,lab,index=np.arange(n+1))
out=[]
for i in range(1,n+1):
    ha=sizes[i]*pxm*pxm/1e4
    if ha<0.05 or ha>12 or mx[i]*pxm<6: continue
    out.append({'id':int(i),'px':int(sizes[i]),'ha':round(ha,2),'edge':False,'wide_m':round(float(mx[i]*pxm),1)})
np.save(S+'lab%d.npy'%page,lab); json.dump(out,open(S+'regions%d.json'%page,'w'))
print(len(out),'regions')
