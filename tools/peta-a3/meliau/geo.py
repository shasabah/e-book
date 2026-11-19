import sys, subprocess, re, json
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
from pyproj import Transformer
D = '/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/'
sys.path.insert(0, D + 'mlots')
from grid import labels
def fit(L):
    md = sorted(a for a, _ in L)[len(L) // 2]
    L = [(a, c) for a, c in L if a % 100 == 0 and abs(a - md) < 50000]
    v = np.array([a for a, _ in L], float); x = np.array([c for _, c in L], float)
    for _ in range(10):
        k, c = np.polyfit(v, x, 1); res = np.abs(np.polyval([k, c], v) - x)
        if res.max() < 4 or len(v) < 4: break
        j = res.argmax(); v = np.delete(v, j); x = np.delete(x, j)
    assert res.max() < 4, res.max()
    return k, c
utm = Transformer.from_crs('EPSG:4326', 'EPSG:32650', always_xy=True)
ot, _, ol, _ = labels(D + 'melmap/ovimg-000.jpg', 90, 4140, 120, 3260)
okx, ocx = fit(ot); oky, ocy = fit(ol)
TL = utm.transform(117.1577125045800898, 5.7502314423212697); BL = utm.transform(117.1577040177583342, 5.7193247480153344)
BR = utm.transform(117.201343085880751, 5.7193110991421419); TR = utm.transform(117.2013539210989848, 5.7502177192142963)
OW, OH = 4960, 3507
def ov2utm(x, y):
    u, v = x / OW, y / OH
    top = (TL[0] + (TR[0] - TL[0]) * u, TL[1] + (TR[1] - TL[1]) * u)
    bot = (BL[0] + (BR[0] - BL[0]) * u, BL[1] + (BR[1] - BL[1]) * u)
    return top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v
# affine UTM -> grid (least squares over a lattice)
G = [(gx, gy) for gx in range(1856300, 1861800, 500) for gy in range(647000, 650100, 500)]
U = np.array([ov2utm(okx * gx + ocx, oky * gy + ocy) for gx, gy in G])
A = np.c_[U, np.ones(len(U))]
cx = np.linalg.lstsq(A, np.array([g[0] for g in G], float), rcond=None)[0]
cy = np.linalg.lstsq(A, np.array([g[1] for g in G], float), rcond=None)[0]
def ll2grid(lon, lat):
    x, y = utm.transform(lon, lat); return cx[0] * x + cx[1] * y + cx[2], cy[0] * x + cy[1] * y + cy[2]
def ocr_big(img, box, rotate=0):
    c = img.crop(box)
    if rotate: c = c.rotate(rotate, expand=True)
    c.save(D + 'bm/_s.png')
    out = subprocess.run(['tesseract', D + 'bm/_s.png', '-', '--psm', '6', 'tsv'], capture_output=True, text=True).stdout
    W = []
    for line in out.splitlines()[1:]:
        f = line.split('\t')
        if len(f) >= 12 and re.fullmatch(r'\d{6,7}', f[11].strip()): W.append((int(f[11]), int(f[6]) + int(f[8]) / 2))
    return W
def page_fit(img):
    X0, X1, Y0, Y1 = 260, 8283, 238, 6758
    top = [(v, x + X0) for v, x in ocr_big(img, (X0, Y0 - 150, X1, Y0))]
    left = [(v, Y1 - x) for v, x in ocr_big(img, (X0 - 150, Y0, X0, Y1), rotate=-90)]
    return fit(top), fit(left)
