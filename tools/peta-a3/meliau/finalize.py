# Rebuild all.json from the traced pages: number, attach palm counts and match notes, move onto the overview roads,
# take out the small overlaps. Input: lots1..5.json (export.py), all_before_shift.json (names at the time of the count),
# ../bm7/c3_*.json (palm counts: [drone-map palms inside the block line, plus those drawn outside it]),
# page_fit.json (shift per page), match.json (notes keyed page|ids), relabel.json (labels to set, keyed page|ids).
import json, subprocess, sys
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union
from pyproj import Transformer
S = '/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/'
subprocess.run(['python3', '-I', S + 'mlots/assemble.py'], check=True, capture_output=True)
A = json.load(open(S + 'mlots/all.json'))
old = json.load(open(S + 'mlots/all_before_shift.json'))
name2key = {l['lot']: '%d|%s' % (l['page'], l['ids']) for b, L in old.items() for l in L}
C = {}
for p in (0, 2, 3, 4, 5, 6):
    try: d = json.load(open(S + 'bm7/c3_%d.json' % p))
    except FileNotFoundError: continue
    for nm, v in d.items():
        k = name2key.get(nm)
        if k: C.setdefault(k, []).append((p, v))
def count(k):
    v = C.get(k)
    if not v: return None
    mid = [x for p, x in v if p in (2, 3, 4, 5)] or [x for p, x in v]
    return [max(x[0] for x in mid), max(x[1] for x in mid)]
match = json.load(open(S + 'mlots/match.json'))
relabel = json.load(open(S + 'mlots/relabel.json'))
F = json.load(open(S + 'mlots/page_fit.json'))
u = Transformer.from_crs('EPSG:4326', 'EPSG:32650', always_xy=True); w = Transformer.from_crs('EPSG:32650', 'EPSG:4326', always_xy=True)
for b, L in A.items():
    for l in L:
        k = '%d|%s' % (l['page'], l['ids'])
        if k in relabel: l['ha'], l['palms'] = relabel[k]
        if k in match: l['matched'] = match[k]
        c = count(k)
        if c: l['count'], l['count_all'] = c
        if not l['ha'] and l['rings']: l['est'] = c[1] if c else None
        f = F[str(l['page'])]
        def mv(q):
            x, y = u.transform(*q); return [round(v, 6) for v in w.transform(x + f['de'], y + f['dn'])]
        l['rings'] = [[mv(q) for q in r] for r in l['rings']]
        if l['centre']: l['centre'] = mv(l['centre'])
# overlaps: the overlap goes to the lot whose drawn size is short of its label (or kept by a labelled lot)
lots = [l for b, L in A.items() for l in L if l['rings']]
P = {l['lot']: unary_union([Polygon([u.transform(*q) for q in r]).buffer(0) for r in l['rings'] if len(r) > 3]) for l in lots}
L_ = {l['lot']: l for l in lots}
names = list(P); fixed = []
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        a, c = names[i], names[j]
        x = P[a].intersection(P[c])
        if x.area < 50: continue
        def over(n): l = L_[n]; return (P[n].area / 1e4 / l['ha']) if l['ha'] else 9
        lose = a if over(a) >= over(c) else c
        P[lose] = P[lose].difference(P[a if lose == c else c]).buffer(0)
        fixed.append((a, c, round(x.area / 1e4, 2), lose))
for n, p in P.items():
    if not any(f[3] == n for f in fixed): continue
    l = L_[n]
    gs = [g for g in (p.geoms if hasattr(p, 'geoms') else [p]) if g.area > 30]
    l['rings'] = [[[round(v, 6) for v in w.transform(x, y)] for x, y in g.simplify(1.0).exterior.coords] for g in gs]
    l['traced'] = round(sum(g.area for g in gs) / 1e4, 2)
    rp = p.representative_point(); l['centre'] = [round(v, 6) for v in w.transform(rp.x, rp.y)]
print('overlaps taken out:', fixed)
json.dump(A, open(S + 'mlots/all.json', 'w'))
