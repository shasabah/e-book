import struct, math, json, sys, os
SRC = "/mnt/user-data/uploads/User/Desktop/SHA & PELITA JUJUR FILE/SHA"

def dbf(path):
    b = open(path,'rb').read()
    nrec, hlen, rlen = struct.unpack('<IHH', b[4:12])
    flds=[]; p=32
    while b[p] != 0x0D:
        nm = b[p:p+11].split(b'\0')[0].decode('latin1')
        typ = chr(b[p+11]); ln = b[p+16]
        flds.append((nm,typ,ln)); p += 32
    p += 1
    out=[]
    for i in range(nrec):
        r = b[p:p+rlen]; p += rlen
        if r[:1] == b'*': out.append(None); continue
        o={}; q=1
        for nm,typ,ln in flds:
            o[nm] = r[q:q+ln].decode('latin1').strip(); q += ln
        out.append(o)
    return out

def shp(path):
    b = open(path,'rb').read()
    p = 100; shapes=[]
    while p < len(b):
        num, clen = struct.unpack('>II', b[p:p+8]); p += 8
        rec = b[p:p+clen*2]; p += clen*2
        typ = struct.unpack('<I', rec[0:4])[0]
        if typ == 0: shapes.append([]); continue
        if typ not in (3, 5, 13, 15, 23, 25): raise SystemExit('shape type %d' % typ)
        nparts, npts = struct.unpack('<II', rec[36:44])
        parts = list(struct.unpack('<%dI' % nparts, rec[44:44+4*nparts]))
        off = 44 + 4*nparts
        pts = [struct.unpack('<dd', rec[off+16*i:off+16*i+16]) for i in range(npts)]
        parts.append(npts)
        shapes.append([pts[parts[i]:parts[i+1]] for i in range(nparts)])
    return shapes

R = 6378137.0
def toll(x, y):
    lon = x / R * 180.0 / math.pi
    lat = (2*math.atan(math.exp(y/R)) - math.pi/2) * 180.0 / math.pi
    return (round(lon,6), round(lat,6))

def mdist(a, b):   # metres, from lon/lat
    dx = (b[0]-a[0]) * 111320 * math.cos(math.radians(a[1]))
    dy = (b[1]-a[1]) * 110540
    return math.hypot(dx, dy)

def simplify(ring, tol=3.0):          # Douglas-Peucker on lon/lat, tolerance in metres
    if len(ring) < 4: return ring
    def dp(pts):
        if len(pts) < 3: return pts
        a, b = pts[0], pts[-1]
        dmax = 0; idx = 0
        for i in range(1, len(pts)-1):
            dx = (b[0]-a[0])*111320*math.cos(math.radians(a[1])); dy = (b[1]-a[1])*110540
            L = math.hypot(dx, dy)
            if L < 1e-9: d = mdist(pts[i], a)
            else:
                px = (pts[i][0]-a[0])*111320*math.cos(math.radians(a[1])); py = (pts[i][1]-a[1])*110540
                d = abs(px*dy - py*dx) / L
            if d > dmax: dmax, idx = d, i
        if dmax > tol: return dp(pts[:idx+1])[:-1] + dp(pts[idx:])
        return [a, b]
    out = dp(ring)
    if out[0] != out[-1]: out.append(out[0])
    return out

def area_m2(ring):                      # shoelace in metres
    if len(ring) < 3: return 0.0
    lat0 = sum(p[1] for p in ring)/len(ring)
    k = 111320*math.cos(math.radians(lat0))
    s = 0.0
    for i in range(len(ring)-1):
        s += (ring[i][0]*k)*(ring[i+1][1]*110540) - (ring[i+1][0]*k)*(ring[i][1]*110540)
    return abs(s)/2.0

if __name__ == '__main__':
    import glob
    for f in sorted(glob.glob(SRC + '/BLOCK*PTN*.shp')):
        base = f[:-4]
        recs = dbf(base + '.dbf'); shapes = shp(f)
        print(os.path.basename(f), len(recs), 'records', len(shapes), 'shapes')
        for r, s in list(zip(recs, shapes))[:3]:
            print('  ', r, len(s), 'ring(s)', len(s[0]) if s else 0, 'pts')
