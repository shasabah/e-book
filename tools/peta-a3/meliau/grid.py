import sys, subprocess, re, json
import numpy as np
from PIL import Image
from scipy.signal import find_peaks

def gridlines(a, x0, x1, y0, y1):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r > 212) & (r < 236) & (b < r - 9) & (abs(r - g) < 8)
    sub = m[y0:y1, x0:x1]
    cx = sub.sum(0).astype(float); cy = sub.sum(1).astype(float)
    px, _ = find_peaks(cx, distance=60, prominence=cx.max() * 0.25)
    py, _ = find_peaks(cy, distance=60, prominence=cy.max() * 0.25)
    return [p + x0 for p in px], [p + y0 for p in py]

def ocr_strip(img, box, rotate=0):
    c = img.crop(box)
    if rotate: c = c.rotate(rotate, expand=True)
    c = c.resize((c.width * 2, c.height * 2))
    c.save('/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/mlots/_strip.png')
    out = subprocess.run(['tesseract', '/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/mlots/_strip.png', '-', '--psm', '6', 'tsv'],
                         capture_output=True, text=True).stdout
    words = []
    for line in out.splitlines()[1:]:
        f = line.split('\t')
        if len(f) < 12: continue
        t = f[11].strip()
        if re.fullmatch(r'\d{6,7}', t):
            words.append((int(t), (int(f[6]) + int(f[8]) / 2) / 2))
    return words

if __name__ == '__main__':
    path, x0, x1, y0, y1 = sys.argv[1], *map(int, sys.argv[2:6])
    img = Image.open(path); a = np.array(img).astype(int)
    gx, gy = gridlines(a, x0, x1, y0, y1)
    print('vertical lines x:', gx)
    print('horizontal lines y:', gy)
    top = ocr_strip(img, (x0, max(0, y0 - 70), x1, y0))
    print('top labels (value, x):', [(v, round(x + x0)) for v, x in top])
    left = ocr_strip(img, (max(0, x0 - 70), y0, x0, y1), rotate=-90)
    # after rotating -90 (clockwise), x in strip = (y1-y0) - (y - y0)?  rotate(-90) maps top->right
    print('left labels (value, y):', [(v, round(y0 + x)) for v, x in left])

def labels(path, x0, x1, y0, y1):
    img = Image.open(path)
    top = [(v, x + x0) for v, x in ocr_strip(img, (x0, max(0, y0 - 70), x1, y0))]
    bot = [(v, x + x0) for v, x in ocr_strip(img, (x0, y1, x1, y1 + 70))]
    left = [(v, y0 + y1 - (x + y0)) for v, x in ocr_strip(img, (max(0, x0 - 70), y0, x0, y1), rotate=-90)]
    right = [(v, y0 + y1 - (x + y0)) for v, x in ocr_strip(img, (x1, y0, x1 + 70, y1), rotate=-90)]
    return top, bot, left, right
