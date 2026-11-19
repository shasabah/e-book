import sys, json; sys.path.insert(0, '.')
from geo import *
from palms import ring_masks, detect
import cv2
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
from shapely.prepared import prep
A = json.load(open(D + 'mlots/all.json'))
res = {}
for p in range(1, 7):
    im = Image.open('b%d-000.jpg' % p); (kx, c0), (ky, c1) = page_fit(im)
    a = np.array(im.convert('RGB')); a[:, 8283:] = 255; a[6758:] = 255; a[:238] = 255; a[:, :260] = 255
    g, o = ring_masks(a)
    best = None
    for R in range(int(4.0 * kx), int(5.2 * kx) + 1):
        xs, ys, s = detect(g, R)
        sc = float(np.sum(s))
        if best is None or sc > best[0]: best = (sc, R, xs, ys)
    R = best[1]; gx, gy = best[2], best[3]
    oxs, oys, _ = detect(o, R)
    print('page', p, 'px/m', round(kx, 2), 'R', R, 'green', len(gx), 'orange', len(oxs), flush=True)
    np.save('pts%d.npy' % p, np.c_[gx, gy]); np.save('opts%d.npy' % p, np.c_[oxs, oys])
    def topx(lon, lat):
        X, Y = ll2grid(lon, lat); return kx * X + c0, ky * Y + c1
    for b, L in A.items():
        for l in L:
            if not l['rings']: continue
            poly = unary_union([Polygon([topx(*q) for q in r]).buffer(0) for r in l['rings']])
            x0, y0, x1, y1 = poly.bounds
            if x0 < 270 or x1 > 8270 or y0 < 250 or y1 > 6750: continue
            pp = prep(poly)
            sel = (gx >= x0) & (gx <= x1) & (gy >= y0) & (gy <= y1)
            ng = sum(pp.contains(Point(x, y)) for x, y in zip(gx[sel], gy[sel]))
            sel = (oxs >= x0) & (oxs <= x1) & (oys >= y0) & (oys <= y1)
            no = sum(pp.contains(Point(x, y)) for x, y in zip(oxs[sel], oys[sel]))
            res.setdefault(l['lot'], {})[p] = (int(ng), int(no))
json.dump(res, open('counts.json', 'w'))
for b, L in A.items():
    for l in L:
        if l['lot'] in res: print(l['lot'], l['ha'], l['palms'], res[l['lot']])
