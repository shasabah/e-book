import sys, json, math, os, glob, re
sys.path.insert(0, '/home/claude/ptanmap')
from shp import dbf, shp, toll, SRC

OUT = '/home/claude/ptanmap/out'
os.makedirs(OUT, exist_ok=True)
lots = json.load(open('/home/claude/ptanmap/lots.json'))

def lines(path):
    return [[[toll(x, y) for x, y in part] for part in s] for s in shp(path)]

roads = {b: lines(SRC + '/ROAD BLOCK %s PTN.shp' % b) for b in ['01', '02', '03', '04']}
house = lines(SRC + '/HOUSING PTN.shp')

BLK = {'01': 'Blok 01', '02': 'Blok 02', '03': 'Blok 03', '04': 'Blok 04'}

def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def legend(blocks):
    keys = [('<i class="sw b%s"></i>Blok %s' % (b, b)) for b in blocks] if len(blocks) > 1 else ['<i class="sw"></i>Petak <small>lot</small>']
    keys += ['<i class="sw rd"></i>Jalan <small>road</small>', '<i class="sw hs"></i>Bangunan <small>building</small>']
    return '<div class="leg">' + ''.join('<span>%s</span>' % k for k in keys) + '</div>'


def sheet(name, blocks, title, sub, land, mapmm, tablecols):
    """One A3 sheet. land=True -> landscape. mapmm=(w,h) of the area the map may use, in mm."""
    L = {k: v for k, v in lots.items() if v['block'] in blocks}
    pts = [p for v in L.values() for r in v['rings'] for p in r]
    x0, y0, x1, y1 = bbox(pts)
    lat0 = (y0 + y1) / 2
    kx = 111320 * math.cos(math.radians(lat0)); ky = 110574
    wM = (x1 - x0) * kx; hM = (y1 - y0) * ky
    mw, mh = mapmm
    s = min(mw / wM, mh / hM)                     # mm per metre
    W = wM * s; H = hM * s
    def X(lon): return (lon * kx - x0 * kx) * s + (mw - W) / 2
    def Y(lat): return (y1 * ky - lat * ky) * s + (mh - H) / 2
    g = []
    # roads first, under the lots
    for b in blocks:
        for sh_ in roads.get(b, []):
            for part in sh_:
                g.append('<path class="rd" d="M' + 'L'.join('%.2f,%.2f' % (X(p[0]), Y(p[1])) for p in part) + '"/>')
    for v in house:
        for part in v:
            g.append('<path class="hs" d="M' + 'L'.join('%.2f,%.2f' % (X(p[0]), Y(p[1])) for p in part) + 'Z"/>')
    keys = sorted(L, key=lambda k: (int(k.split('-')[0]), int(k.split('-')[1])))
    for k in keys:
        v = L[k]
        for r in v['rings']:
            cls = 'lot b%s' % v['block'] if len(blocks) > 1 else 'lot'
            g.append('<path class="%s" d="M' % cls + 'L'.join('%.2f,%.2f' % (X(p[0]), Y(p[1])) for p in r) + 'Z"/>')
    # The label size follows how big the lots actually draw: a lot of the block's median size
    # should hold its number comfortably. Units here are the viewBox's, and 1 unit = 1 mm.
    med = sorted(v['ha'] for v in L.values())[len(L)//2]
    across = math.sqrt(med * 10000) * s                    # mm across a middling lot on paper
    fs = max(1.5, min(4.0, across * 0.30))
    showHa = across > 9
    for k in keys:
        v = L[k]; c = v['centre']
        n = k.split('-')[1]
        dy = -fs * 0.42 if showHa else 0
        g.append('<text class="ln" x="%.2f" y="%.2f" font-size="%.2f">%s</text>' % (X(c[0]), Y(c[1]) + dy, fs, n))
        if showHa:
            g.append('<text class="lh" x="%.2f" y="%.2f" font-size="%.2f">%.2f</text>'
                     % (X(c[0]), Y(c[1]) + fs * 0.62, fs * 0.60, v['ha']))
    if len(blocks) > 1:
        for b in blocks:
            bp = [p for k2, v2 in L.items() if v2['block'] == b for r in v2['rings'] for p in r]
            bx0, by0, bx1, by1 = bbox(bp)
            # the name sits in the middle of its own block, with a white halo so it reads over the lots
            fsb = max(3.0, min(5.0, (X(bx1) - X(bx0)) / 5.5))
            tx = min(max(X((bx0 + bx1) / 2), fsb * 4), mw - fsb * 4)
            ty = min(max(Y((by0 + by1) / 2), fsb), mh - fsb)
            g.append('<text class="bn" x="%.2f" y="%.2f" font-size="%.2f">BLOK %s</text>' % (tx, ty, fsb, b))
    svg = '<svg class="map" viewBox="0 0 %.2f %.2f" style="width:%.2fmm;height:%.2fmm">%s</svg>' % (mw, mh, mw, mh, ''.join(g))
    # scale bar and north arrow sit under the map, in their own strip, so they never cover a lot
    want = 45 / s
    step = min([x for x in [50, 100, 200, 250, 500, 1000, 2000] if x >= want] or [2000])
    bl = step * s
    bar = ('<div class="strip"><svg viewBox="0 0 %.2f 10" style="width:%.2fmm;height:10mm">'
           '<g class="sb"><path d="M2,4h%.2fM2,4v-2.4M%.2f,4v-2.4M%.2f,4v-1.5"/>'
           '<text x="2" y="8.2" font-size="2.6">0</text><text x="%.2f" y="8.2" font-size="2.6">%d m</text></g>'
           '<g class="na"><path d="M%.2f,9v-8M%.2f,1l-2.4,3.2M%.2f,1l2.4,3.2"/><text x="%.2f" y="9.6" font-size="3">U</text></g>'
           '</svg>%s</div>') % (bl + 30, bl + 30, bl, bl + 2, bl / 2 + 2, bl + 2, step, bl + 22, bl + 22, bl + 22, bl + 22, legend(blocks))

    # the lot schedule, when the sheet has room for it
    tbl = ''
    if tablecols:
        rows = ''.join('<tr><td>%s</td><td>%.2f</td><td>%d</td></tr>' % (k, L[k]['ha'], L[k]['palms']) for k in keys)
        per = math.ceil(len(keys) / tablecols)
        cells = []
        for i in range(tablecols):
            part = keys[i*per:(i+1)*per]
            if not part: continue
            cells.append('<table><thead><tr><th>Petak</th><th>Ha</th><th>Pokok</th></tr></thead><tbody>'
                         + ''.join('<tr><td>%s</td><td>%.2f</td><td>%d</td></tr>' % (k, L[k]['ha'], L[k]['palms']) for k in part)
                         + '</tbody></table>')
        tbl = '<div class="tbl">' + ''.join(cells) + '</div>'

    tha = sum(v['ha'] for v in L.values()); tp = sum(v['palms'] for v in L.values())
    foot = ('<div class="foot"><span><b>%d petak</b> · <b>%.2f Ha</b> · <b>%s pokok</b></span>'
            '<span>Skala lebih kurang 1:%s · Sumber: ukur GPS 2022 (SPLT) · Dicetak %s</span>'
            '<span>E-Book &middot; Buku Ladang</span></div>'
            % (len(keys), tha, format(tp, ','), format(int(round(1/(s/1000))), ','), '13.11.2026'))
    head = '<div class="head"><div><h1>%s</h1><p>%s</p></div><div class="blk">%s</div></div>' % (title, sub, BLK.get(blocks[0], '') if len(blocks) == 1 else 'Semua blok')
    css = """
@page { size: A3 %s; margin: 8mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 3.2mm/1.3 "Helvetica Neue", Arial, sans-serif; color: #17301f; }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: .6mm solid #2f6b2f; padding-bottom: 1.5mm; margin-bottom: 3mm; }
h1 { margin: 0; font-size: 6mm; letter-spacing: .02em; }
.head p { margin: .6mm 0 0; font-size: 3mm; color: #5a6b5a; }
.blk { font-size: 7mm; font-weight: 700; color: #2f6b2f; }
.map { display: block; }
.map .lot { fill: #e5efe0; stroke: #4a7a4a; stroke-width: .25mm; }
.b01 { fill: #dceadb !important; } .b02 { fill: #efe9d2 !important; }
.b03 { fill: #d9e8ee !important; } .b04 { fill: #e9e2ee !important; }
.map .bn { text-anchor: middle; dominant-baseline: central; font-weight: 700; fill: #1f4d1f; letter-spacing: .08em;
            paint-order: stroke; stroke: #fff; stroke-width: 1.4; stroke-linejoin: round; }
.map .rd { fill: none; stroke: #b08968; stroke-width: .45mm; stroke-linecap: round; }
.map .hs { fill: #ddd6cc; stroke: #a89c8c; stroke-width: .2mm; }
.map .ln { text-anchor: middle; dominant-baseline: central; font-weight: 700; fill: #17301f; }
.map .lh { text-anchor: middle; dominant-baseline: central; fill: #4a6b4a; }
.strip { margin-top: 1.5mm; display: flex; align-items: center; gap: 8mm; }
.leg { display: flex; gap: 5mm; font-size: 2.9mm; color: #3a4a3a; }
.leg i { display: inline-block; width: 4mm; height: 2.6mm; margin-right: 1.4mm; vertical-align: -.3mm;
         border: .25mm solid #4a7a4a; background: #e5efe0; }
.leg i.rd { height: 0; border: 0; border-top: .9mm solid #b08968; vertical-align: .8mm; }
.leg i.hs { background: #ddd6cc; border-color: #a89c8c; }
.leg small { color: #7a8a7a; }
.leg i.b01 { background: #dceadb; } .leg i.b02 { background: #efe9d2; }
.leg i.b03 { background: #d9e8ee; } .leg i.b04 { background: #e9e2ee; }
.strip .sb path, .strip .na path { fill: none; stroke: #17301f; stroke-width: .35; }
.strip .sb text { fill: #17301f; }
.strip .sb text:last-child { text-anchor: end; }
.strip .na text { text-anchor: middle; font-weight: 700; }
.tbl { display: flex; gap: 3mm; margin-top: 3mm; align-items: flex-start; }
.tbl table { border-collapse: collapse; font-size: 3mm; flex: 1; }
.tbl th { text-align: left; border-bottom: .3mm solid #2f6b2f; padding: .6mm 1.2mm; font-size: 2.7mm; }
.tbl td { padding: .55mm 1.2mm; border-bottom: .1mm solid #e3e8e3; white-space: nowrap; }
.tbl td:nth-child(2), .tbl td:nth-child(3), .tbl th:nth-child(2), .tbl th:nth-child(3) { text-align: right; }
.foot { position: fixed; left: 8mm; right: 8mm; bottom: 4mm; display: flex; justify-content: space-between;
        font-size: 2.7mm; color: #5a6b5a; border-top: .2mm solid #cdd8cd; padding-top: 1.2mm; }
""" % ('landscape' if land else 'portrait')
    html = ('<!DOCTYPE html><html><head><meta charset="utf-8"><title>%s</title><style>%s</style></head>'
            '<body>%s%s%s%s%s</body></html>' % (name, css, head, svg, bar, tbl, foot))
    open(os.path.join(OUT, name + '.html'), 'w').write(html)
    return name, land

# the label goes on the centre point already worked out for the app (inside its own lot)
src = open('/home/claude/eb-report/lists/lots.js').read()
for m in re.finditer(r"estate: 'PTAN', block: '[^']+', lot: '([^']+)', ha: [\d.]+, palms: \d+ *, lat: ([\d.]+), lon: ([\d.]+)", src):
    if m.group(1) in lots: lots[m.group(1)]['centre'] = (float(m.group(3)), float(m.group(2)))
missing = [k for k, v in lots.items() if 'centre' not in v]
if missing: raise SystemExit('no centre for ' + ', '.join(missing))

if __name__ == '__main__':
    jobs = []
    jobs.append(sheet('PTAN_Blok_01', ['01'], 'SPLT.PAITAN \u00b7 PETA PETAK', 'Lot map \u00b7 nombor petak, hektar dan jalan', False, (277, 348), 0))
    jobs.append(sheet('PTAN_Blok_02', ['02'], 'SPLT.PAITAN \u00b7 PETA PETAK', 'Lot map \u00b7 nombor petak, hektar dan jalan', True, (400, 232), 0))
    jobs.append(sheet('PTAN_Blok_03', ['03'], 'SPLT.PAITAN \u00b7 PETA PETAK', 'Lot map \u00b7 nombor petak, hektar dan jalan', True, (400, 118), 4))
    jobs.append(sheet('PTAN_Blok_04', ['04'], 'SPLT.PAITAN \u00b7 PETA PETAK', 'Lot map \u00b7 nombor petak, hektar dan jalan', True, (400, 158), 5))
    jobs.append(sheet('PTAN_Semua_Blok', ['01', '02', '03', '04'], 'SPLT.PAITAN \u00b7 PETA LADANG',
                      'Seluruh ladang \u00b7 whole estate \u00b7 170 petak dalam 4 blok', True, (400, 112), 8))
    print(json.dumps(jobs))
