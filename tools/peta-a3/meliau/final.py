import json, numpy as np, cv2
from scipy import ndimage as ndi
D='/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/'
A=json.load(open(D+'mlots/all.json')); old=json.load(open('counts.json'))
new={}
for p,R,nm,thr in ((1,18,1.3,0.55),(6,15,1.3,0.45)):
    g=np.load('g%d.npy'%p); lm=np.load('lotmask%d.npy'%p); ids=json.load(open('lotids%d.json'%p))
    S=R+3; k=np.zeros((2*S+1,2*S+1),np.float32); cv2.circle(k,(S,S),R,1,2); k/=k.sum()
    v=cv2.filter2D(g.astype(np.float32),-1,k); pk=(v==ndi.maximum_filter(v,size=int(R*nm)))&(v>thr)
    cnt=np.bincount(lm[pk],minlength=len(ids)+1)
    for i,lot in ids.items(): new.setdefault(lot,{})[p]=int(cnt[int(i)])
json.dump(new,open('counts_lo.json','w'))
for b,L in A.items():
    for l in L:
        if l['rings'] and (not l['ha'] or b in('01','06')):
            hi={k:sum(v) for k,v in old.get(l['lot'],{}).items() if k in '2345'}
            print(l['lot'],'ha',l['ha'],'palms',l['palms'],'traced',l['traced'],'lo',new.get(l['lot']),'hi',hi)
