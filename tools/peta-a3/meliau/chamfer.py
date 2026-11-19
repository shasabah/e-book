import sys, json; sys.path.insert(0,'bm')
from geo import *
import numpy as np
from scipy import ndimage as ndi
G=np.load('mlots/ovgrey.npy'); G=ndi.binary_opening(G,iterations=1)
DT=ndi.distance_transform_edt(~G); DT=np.minimum(DT,25)
W_,H_=4960,3507
P=[(x,y) for x in range(0,W_,400) for y in range(0,H_,400)]
U=np.array([ov2utm(x,y) for x,y in P]); M=np.c_[U,np.ones(len(U))]
ax=np.linalg.lstsq(M,np.array([p[0] for p in P],float),rcond=None)[0]; ay=np.linalg.lstsq(M,np.array([p[1] for p in P],float),rcond=None)[0]
A=json.load(open('mlots/all.json'))
def pts_of(page):
    out=[]
    for b,L in A.items():
        for l in L:
            if l['page']!=page: continue
            for r in l['rings']:
                xy=np.array([utm.transform(*q) for q in r])
                # densify every ~3 m
                for i in range(len(xy)-1):
                    n=max(1,int(np.hypot(*(xy[i+1]-xy[i]))/3))
                    for t in np.linspace(0,1,n,endpoint=False): out.append(xy[i]+(xy[i+1]-xy[i])*t)
    return np.array(out)
mpp=1/np.hypot(ax[0],ax[1])
res={}
for page in range(1,6):
    Q=pts_of(page)
    X=ax[0]*Q[:,0]+ax[1]*Q[:,1]+ax[2]; Y=ay[0]*Q[:,0]+ay[1]*Q[:,1]+ay[2]
    def cost(dx,dy):
        xi=np.clip((X+dx).astype(int),0,W_-1); yi=np.clip((Y+dy).astype(int),0,H_-1)
        return float(np.mean(DT[yi,xi]))
    best=min(((cost(dx,dy),dx,dy) for dx in range(-90,91,3) for dy in range(-90,91,3)))
    best=min(((cost(dx,dy),dx,dy) for dx in range(best[1]-3,best[1]+4) for dy in range(best[2]-3,best[2]+4)))
    # in metres east/north: ov px dx -> utm
    inv=np.linalg.inv(np.array([[ax[0],ax[1]],[ay[0],ay[1]]])); de,dn=inv@np.array([best[1],best[2]])
    res[page]=[float(de),float(dn)]
    print('page',page,'mean dist to road at 0,0 %.1f px -> %.1f px; shift %+.0f m east %+.0f m north'%(cost(0,0),best[0],de,dn))
json.dump(res,open('mlots/page_shift.json','w'))
# second pass: allow a small turn and size change about the page's centre
res2={}
for page in range(1,6):
    Q=pts_of(page); de,dn=res[str(page)] if str(page) in res else res[page]
    c=Q.mean(0)
    def cost2(de,dn,s,th):
        R=np.array([[np.cos(th),-np.sin(th)],[np.sin(th),np.cos(th)]])
        Z=(Q-c)@R.T*s+c+[de,dn]
        X=ax[0]*Z[:,0]+ax[1]*Z[:,1]+ax[2]; Y=ay[0]*Z[:,0]+ay[1]*Z[:,1]+ay[2]
        xi=np.clip(X.astype(int),0,W_-1); yi=np.clip(Y.astype(int),0,H_-1); return float(np.mean(DT[yi,xi]))
    best=(cost2(de,dn,1,0),de,dn,1.0,0.0)
    for it in range(3):
        for s in np.linspace(best[3]-0.02,best[3]+0.02,9):
            for th in np.radians(np.linspace(-1.5,1.5,13))+best[4]:
                for e in np.arange(best[1]-6,best[1]+7,2):
                    for n_ in np.arange(best[2]-6,best[2]+7,2):
                        v=cost2(e,n_,s,th)
                        if v<best[0]: best=(v,e,n_,s,th)
    res2[page]={'de':float(best[1]),'dn':float(best[2]),'s':float(best[3]),'th':float(best[4]),'c':[float(c[0]),float(c[1])]}
    print('page',page,'-> %.1f px; shift %+.0f E %+.0f N, size x%.3f, turn %+.2f deg'%(best[0],best[1],best[2],best[3],np.degrees(best[4])))
json.dump(res2,open('mlots/page_fit.json','w'))
