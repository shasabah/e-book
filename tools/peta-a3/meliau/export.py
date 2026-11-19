import sys, json
sys.path.insert(0, '/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/mlots')
import numpy as np, cv2
from scipy import ndimage as ndi
from pyproj import Transformer
from shapely.geometry import Polygon
from shapely.ops import unary_union
from grid import labels

D = '/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/'
page = int(sys.argv[1])
groups = json.loads(open(sys.argv[2]).read()) if sys.argv[2].endswith('.json') else json.loads(sys.argv[2])   # [[block, label_ha|null, palms|null, [region ids]], ...]

def fit(L):
    md = sorted(a for a, _ in L)[len(L) // 2]
    L = [(a, c) for a, c in L if a % 100 == 0 and abs(a - md) < 50000]
    v = np.array([a for a, _ in L], float); x = np.array([c for _, c in L], float)
    for _ in range(10):
        k, c = np.polyfit(v, x, 1); res = np.abs(np.polyval([k, c], v) - x)
        if res.max() < 4 or len(v) < 4: break
        j = res.argmax(); v = np.delete(v, j); x = np.delete(x, j)
    assert res.max() < 4, ('grid fit', res.max())
    return k, c

# overview: grid -> overview pixel
ot, _, ol, _ = labels(D + 'melmap/ovimg-000.jpg', 90, 4140, 120, 3260)
okx, ocx = fit(ot); oky, ocy = fit(ol)
# this page: pixel -> grid
pt, _, pl, _ = labels(D + 'mlots/pg-%03d.jpg' % (page - 1), 92, 4868, 124, 2656)
pkx, pcx = fit(pt); pky, pcy = fit(pl)
utm = Transformer.from_crs('EPSG:4326', 'EPSG:32650', always_xy=True)
wgs = Transformer.from_crs('EPSG:32650', 'EPSG:4326', always_xy=True)
TL = utm.transform(117.1577125045800898, 5.7502314423212697); BL = utm.transform(117.1577040177583342, 5.7193247480153344)
BR = utm.transform(117.201343085880751, 5.7193110991421419); TR = utm.transform(117.2013539210989848, 5.7502177192142963)
OW, OH = 4960, 3507
def ov2utm(x, y):
    u, v = x / OW, y / OH
    top = (TL[0] + (TR[0] - TL[0]) * u, TL[1] + (TR[1] - TL[1]) * u)
    bot = (BL[0] + (BR[0] - BL[0]) * u, BL[1] + (BR[1] - BL[1]) * u)
    return top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v
def px2utm(x, y):
    gx = (x - pcx) / pkx; gy = (y - pcy) / pky
    return ov2utm(okx * gx + ocx, oky * gy + ocy)
m_per_px = abs((px2utm(1000, 1000)[0] - px2utm(2000, 1000)[0]) / 1000)
print('m per page px', round(m_per_px, 4))

lab = np.load(D + 'mlots/lab%d.npy' % page)
out = []
for i, (blk, ha, palms, ids) in enumerate(groups):
    if not ids:
        out.append({'block': blk, 'page': page, 'ids': [], 'ha': ha, 'palms': palms, 'traced': None, 'rings': [], 'centre': None})
        print(blk, 'map', ha, 'NOT TRACED'); continue
    m = np.isin(lab, ids)
    m = ndi.binary_fill_holes(ndi.binary_closing(m, iterations=6))
    m = ndi.binary_dilation(m, iterations=3)          # out to the middle of the drawn line
    cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    polys = []
    for c in cs:
        if cv2.contourArea(c) < 2000: continue
        polys.append(Polygon([px2utm(p[0][0] + 0.5, p[0][1] + 0.5) for p in c]).buffer(0))
    poly = unary_union(polys)
    simp = poly.simplify(1.5, preserve_topology=True)
    geoms = [g_ for g_ in (list(simp.geoms) if hasattr(simp, 'geoms') else [simp]) if g_.geom_type == 'Polygon' and not g_.is_empty]
    if not geoms or poly.is_empty:
        print('skip', ids); continue
    rings = []
    for gm in geoms:
        rr = [[round(a, 6), round(b, 6)] for a, b in (wgs.transform(x, y) for x, y in gm.exterior.coords)]
        rings.append(rr)
    rp = poly.representative_point(); cl = wgs.transform(rp.x, rp.y)
    out.append({'block': blk, 'page': page, 'ids': ids, 'ha': ha, 'palms': palms, 'traced': round(poly.area / 1e4, 2), 'rings': rings,
                'centre': [round(cl[0], 6), round(cl[1], 6)]})
    print(blk, ids, 'map', ha, 'traced', round(poly.area / 1e4, 2), 'diff %', round((poly.area / 1e4 / ha - 1) * 100, 1) if ha else 'NO LABEL', 'pieces', len(rings))
json.dump(out, open(D + 'mlots/lots%d.json' % page, 'w'))
