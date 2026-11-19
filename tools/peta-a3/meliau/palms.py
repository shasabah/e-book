import numpy as np, cv2
from scipy import ndimage as ndi
def ring_masks(a):
    a = a.astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > 165) & (r > 80) & (r < 215) & (b < 140) & (g - b > 80) & (g - r > 15)
    orange = (r > 195) & (g > 120) & (g < 205) & (b < 110) & (r - g > 25)
    return green, orange
def detect(mask, R):
    # vote: correlate the ring mask with a ring of radius R (2 px thick); peaks = circle centres
    k = np.zeros((2 * R + 5, 2 * R + 5), np.float32); c = R + 2
    cv2.circle(k, (c, c), R, 1, 3)
    k /= k.sum()
    v = cv2.filter2D(mask.astype(np.float32), -1, k)
    mx = ndi.maximum_filter(v, size=int(R * 0.9))
    pk = (v == mx) & (v > 0.5)
    ys, xs = np.nonzero(pk)
    return xs, ys, v[ys, xs]
if __name__ == '__main__':
    from PIL import Image
    a = np.array(Image.open('c1.png').convert('RGB'))
    g, o = ring_masks(a)
    for R in (15, 16, 17, 18, 19, 20):
        xs, ys, s = detect(g, R); print(R, len(xs), round(float(np.median(s)), 2))
    R = int(__import__('sys').argv[1]) if len(__import__('sys').argv) > 1 else 18
    out = a.copy()
    for m, col in ((g, (255, 0, 255)), (o, (0, 255, 255))):
        xs, ys, s = detect(m, R)
        for x, y in zip(xs, ys): cv2.circle(out, (int(x), int(y)), 4, col, -1)
        print(len(xs))
    Image.fromarray(out).save('c1_det.png')
