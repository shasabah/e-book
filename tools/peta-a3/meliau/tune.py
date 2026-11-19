import sys, json; sys.path.insert(0, '.')
from geo import *
from palms import ring_masks
import cv2
from scipy import ndimage as ndi
from shapely.geometry import Polygon
from shapely.ops import unary_union
A = json.load(open(D + 'mlots/all.json'))
p = int(sys.argv[1]); cal = sys.argv[2].split(',')
im = Image.open('b%d-000.jpg' % p); (kx, c0), (ky, c1) = page_fit(im)
a = np.array(im.convert('RGB')); a[:, 8283:] = 255; a[6758:] = 255; a[:238] = 255; a[:, :260] = 255
g, o = ring_masks(a); g = g | o
np.save('g%d.npy' % p, g)
def topx(lon, lat):
    X, Y = ll2grid(lon, lat); return kx * X + c0, ky * Y + c1
lotmask = np.zeros(g.shape, np.int32); ids = {}; n = 0
for b, L in A.items():
    for l in L:
        if not l['rings']: continue
        n += 1; ids[n] = l
        for r in l['rings']:
            cv2.fillPoly(lotmask, [np.array([topx(*q) for q in r], np.int32)], n)
np.save('lotmask%d.npy' % p, lotmask); json.dump({k: v['lot'] for k, v in ids.items()}, open('lotids%d.json' % p, 'w'))
rows = []
for R10 in range(int(40 * kx), int(52 * kx), 5):
    R = R10 / 10
    S = int(np.ceil(R)) + 3; k = np.zeros((2 * S + 1, 2 * S + 1), np.float32)
    cv2.circle(k, (S, S), int(round(R)), 1, 2); k /= k.sum()
    v = cv2.filter2D(g.astype(np.float32), -1, k)
    for nm in (1.0, 1.3, 1.6):
        mx = ndi.maximum_filter(v, size=int(R * nm))
        for thr in (0.45, 0.55, 0.65):
            pk = (v == mx) & (v > thr)
            cnt = np.bincount(lotmask[pk], minlength=n + 1)
            err = []
            for i, l in ids.items():
                if l['lot'] in cal and l['palms']: err.append(cnt[i] / l['palms'] - 1)
            rows.append((float(np.mean(np.abs(err))), float(np.mean(err)), int(round(R)), nm, thr))
rows.sort()
for r in rows[:8]: print([round(x, 3) for x in r])
