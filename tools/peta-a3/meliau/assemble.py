import json, math
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MP
from shapely.geometry import Polygon, Point
from pyproj import Transformer
S='/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/'
u=Transformer.from_crs('EPSG:4326','EPSG:32650',always_xy=True)
blk={k:Polygon([u.transform(*p) for p in v['ring']]) for k,v in json.load(open(S+'melmap/melu_shapes.json')).items()}
pages={'01':[1],'02':[2],'03':[3],'04':[4],'05':[5],'06':[5,1]}
allL={}
for b,p in pages.items():
    L=[l for pp in p for l in json.load(open(S+'mlots/lots%d.json'%pp)) if l['block']==b]
    for l in L:
        if l['rings']:
            P=Polygon([u.transform(*q) for q in l['rings'][0]])
            c=P.representative_point(); l['cxy']=(c.x,c.y)
            l['inblk']={k:round(P.intersection(v).area/P.area,2) for k,v in blk.items() if P.intersects(v)}
        else: l['cxy']=None
    # reading order: rows of 120 m from the north, west to east within a row
    tr=[l for l in L if l['cxy']]
    ymax=max(l['cxy'][1] for l in tr)
    tr.sort(key=lambda l:(int((ymax-l['cxy'][1])//120), l['cxy'][0]))
    n=0
    for l in tr: n+=1; l['lot']='%d-%d'%(int(b),n)
    for l in L:
        if not l['cxy']: n+=1; l['lot']='%d-%d'%(int(b),n)
    allL[b]=sorted(L,key=lambda l:int(l['lot'].split('-')[1]))
    lab=sum(l['ha'] or 0 for l in L); pal=sum(l['palms'] or 0 for l in L)
    print(b, len(L),'lots', round(lab,2),'ha', pal,'palms')
    for l in allL[b]:
        print('  ',l['lot'],l['ha'],l['palms'],l['traced'],l.get('inblk'))
json.dump(allL,open(S+'mlots/all.json','w'))
# previews
for b,L in allL.items():
    fig,ax=plt.subplots(figsize=(11.7,8.3),dpi=130)
    k=math.cos(math.radians(5.73))
    for i,l in enumerate(L):
        for r in l['rings']:
            ax.add_patch(MP([(x*k,y) for x,y in r],closed=True,fc='#e8f3ea' if l['ha'] else '#f6e3c8',ec='#1d6b3a',lw=1.1))
        if l['centre']:
            cx,cy=l['centre']
            ax.text(cx*k,cy,l['lot'],ha='center',va='bottom',fontsize=11,fontweight='bold',color='#123')
            ax.text(cx*k,cy,('%.2f ha · %d pkk'%(l['ha'],l['palms'])) if l['ha'] else 'tiada label (%.2f ha diukur)'%l['traced'],ha='center',va='top',fontsize=6.5,color='#345' if l['ha'] else '#a0522d')
    ax.autoscale(); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('Meliau · Blok %s · %d petak (contoh, nombor belum disahkan)'%(b,len(L)),loc='left',fontsize=12)
    plt.tight_layout(); plt.savefig(S+'mlots/prev_%s.png'%b,bbox_inches='tight'); plt.close()
