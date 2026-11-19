import sys, json; sys.path.insert(0, '../bm')
from geo import *
import cv2
from scipy import ndimage as ndi
A = json.load(open(D + 'mlots/all_before_shift.json'))
p = int(sys.argv[1])
im = Image.open('n-%03d.jpg' % p); (kx, c0), (ky, c1) = page_fit(im)
a = np.array(im.convert('RGB')).astype(np.int16); a[:, 8283:] = 255; a[6758:] = 255; a[:238] = 255; a[:, :260] = 255
r, g_, b = a[..., 0], a[..., 1], a[..., 2]
green = (g_ > 150) & (r < 110) & (b < 120) & (g_ - r > 80)
orange = (r > 195) & (g_ > 120) & (g_ < 205) & (b < 110) & (r - g_ > 25)
cyan = (g_ > 180) & (b > 150) & (r < 130) & (g_ - r > 90)
def topx(lon, lat):
    X, Y = ll2grid(lon, lat); return kx * X + c0, ky * Y + c1
lm = np.zeros(green.shape, np.int32); ids = {}; n = 0; inside = {}
for bk, L in A.items():
    for l in L:
        if not l['rings']: continue
        n += 1; ids[n] = l; ok = True
        for rr in l['rings']:
            pts = np.array([topx(*q) for q in rr])
            if pts[:, 0].min() < 275 or pts[:, 0].max() > 8270 or pts[:, 1].min() < 250 or pts[:, 1].max() > 6745: ok = False
            cv2.fillPoly(lm, [pts.astype(np.int32)], n)
        inside[n] = ok
def counts(mask, R, nm, thr):
    S = int(np.ceil(R)) + 3; k = np.zeros((2 * S + 1, 2 * S + 1), np.float32)
    cv2.circle(k, (S, S), int(round(R)), 1, 2); k /= k.sum()
    v = cv2.filter2D(mask.astype(np.float32), -1, k)
    return np.bincount(lm[(v == ndi.maximum_filter(v, size=int(R * nm))) & (v > thr)], minlength=n + 1)
best = None
G = green | orange
for R10 in range(int(40 * kx), int(52 * kx), 5):
    for nm in (1.0, 1.3, 1.6):
        for thr in (0.45, 0.55, 0.65):
            cnt = counts(G, R10 / 10, nm, thr)
            err = [cnt[i] / l['palms'] - 1 for i, l in ids.items() if inside[i] and l['palms'] and l['palms'] > 60]
            e = float(np.median(np.abs(err)))
            if best is None or e < best[0]: best = (e, R10 / 10, nm, thr)
cg = counts(G, *best[1:]); cc = counts(G | cyan, *best[1:])
print('page', p, 'median err', round(best[0], 3))
json.dump({ids[i]['lot']: [int(cg[i]), int(cc[i])] for i in ids if inside[i]}, open('c3_%d.json' % p, 'w'))
