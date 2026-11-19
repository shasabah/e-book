import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

D = '/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/mlots/'
page = int(sys.argv[1])            # 1..6
X0, X1, Y0, Y1 = 92, 4868, 124, 2656  # map frame (inside)
img = Image.open(D + 'pg-%03d.jpg' % (page - 1)); a = np.array(img).astype(int)
H, W = a.shape[:2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
blue = (b > 110) & (r < 130) & (g < 150) & (b - r > 60)
blackroad = (r < 90) & (g < 90) & (b < 90)
frame = np.zeros_like(blue); frame[Y0:Y1, X0:X1] = True
from skimage.morphology import skeletonize, remove_small_objects
from scipy.signal import convolve2d
w0 = ndi.binary_closing(blue | blackroad, iterations=2) & frame
sk = skeletonize(w0)
lab0, n0 = ndi.label(sk, structure=np.ones((3, 3)))
cnt = np.bincount(lab0.ravel()); small = cnt < 400; small[0] = False
sk[small[lab0]] = False
K = np.ones((3, 3), np.uint8)
for it in range(260):
    nb = ndi.convolve(sk.astype(np.uint8), K, mode='constant') - 1
    ends = sk & (nb <= 1)
    if not ends.any(): break
    sk[ends] = False
wall = ndi.binary_dilation(sk, iterations=3) | ~frame
np.save(D + 'wall%d.npy' % page, wall)
lab, n = ndi.label(~wall)
sizes = ndi.sum(np.ones_like(lab), lab, index=np.arange(n + 1))
sys.path.insert(0, D)
from grid import labels
_t, _b, _l, _r = labels(D + 'pg-%03d.jpg' % (page - 1), 92, 4868, 124, 2656)
_k = np.polyfit([v for v, _ in _t], [x for _, x in _t], 1)[0]
px_m = 0.97810 / abs(_k)
print('m per px', round(px_m, 4))
out = []
inner = ndi.distance_transform_edt(~wall)
mx = ndi.maximum(inner, lab, index=np.arange(n + 1))
touch = set(np.unique(lab[Y0 + 3, :])) | set(np.unique(lab[Y1 - 4, :])) | set(np.unique(lab[:, X0 + 3])) | set(np.unique(lab[:, X1 - 4]))
keep = np.zeros(n + 1, bool)
for i in range(1, n + 1):
    ha = sizes[i] * px_m * px_m / 1e4
    if ha < 0.05 or ha > 12: continue
    if mx[i] * px_m < 6: continue           # road strips are thin
    keep[i] = True
    cy, cx = ndi.center_of_mass(lab == i) if False else (0, 0)
    out.append({'id': int(i), 'px': int(sizes[i]), 'ha': round(ha, 2), 'edge': bool(i in touch), 'wide_m': round(float(mx[i] * px_m), 1)})
np.save(D + 'lab%d.npy' % page, lab)
json.dump(out, open(D + 'regions%d.json' % page, 'w'))
print(len(out), 'regions')
for o in sorted(out, key=lambda o: -o['ha']): print(o)
# preview
rng = np.random.RandomState(1); cols = rng.randint(60, 230, (n + 1, 3)).astype(np.uint8)
prev = np.full((H, W, 3), 255, np.uint8)
m = keep[lab]
prev[m] = cols[lab[m]]
prev[blue] = (0, 0, 160)
Image.fromarray(prev).resize((W // 4, H // 4)).save(D + 'seg%d.png' % page)
