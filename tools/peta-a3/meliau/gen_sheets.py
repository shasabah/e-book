S = '/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/mlots/'
src = open('/home/claude/eb-report/tools/peta-a3/sheets.py').read()
start = src.index('def bbox(pts):'); end = src.index('# the label goes on the centre point')
body = src[start:end]
head = '''import sys, json, math, os
S = %r
OUT = S + 'a3'
os.makedirs(OUT, exist_ok=True)
A = json.load(open(S + 'all.json'))
lots = {}
for b, L in A.items():
    for l in L:
        if not l['rings']: continue
        lots[l['lot']] = {'block': b, 'ha': l['ha'] if l['ha'] else l['traced'], 'palms': l['palms'], 'rings': l['rings'],
                          'centre': tuple(l['centre']), 'nolabel': not l['ha']}
roads = {}; house = []
BLK = {'01': 'Blok 01', '02': 'Blok 02', '03': 'Blok 03', '04': 'Blok 04', '05': 'Blok 05', '06': 'Blok 06'}
OUTL = json.load(open(S + '../melmap/melu_shapes.json'))
EXTRA = []
''' % S

def rep(a, b):
    global body
    assert a in body, a[:60]
    body = body.replace(a, b)

rep("""            g.append('<path class="%s" d="M' % cls + 'L'.join('%.2f,%.2f' % (X(p[0]), Y(p[1])) for p in r) + 'Z"/>')""",
    """            g.append('<path class="%s%s" d="M' % (cls, ' nl' if v.get('nolabel') else '') + 'L'.join('%.2f,%.2f' % (X(p[0]), Y(p[1])) for p in r) + 'Z"/>')""")
rep("""    keys = sorted(L, key=lambda k: (int(k.split('-')[0]), int(k.split('-')[1])))
    for k in keys:
        v = L[k]
        for r in v['rings']:""", """    for ob in EXTRA:
        r = OUTL[ob]['ring']
        g.append('<path class="todo" d="M' + 'L'.join('%.2f,%.2f' % (X(p[0]), Y(p[1])) for p in r) + 'Z"/>')
        cx = sum(p[0] for p in r) / len(r); cy = sum(p[1] for p in r) / len(r)
        g.append('<text class="bn" x="%.2f" y="%.2f" font-size="4">BLOK %s</text>' % (X(cx), Y(cy) - 3, ob))
        g.append('<text class="tdt" x="%.2f" y="%.2f" font-size="2.6">petak belum siap</text>' % (X(cx), Y(cy) + 2.5))
    keys = sorted(L, key=lambda k: (int(k.split('-')[0]), int(k.split('-')[1])))
    for k in keys:
        v = L[k]
        for r in v['rings']:""")
rep("""    pts = [p for v in L.values() for r in v['rings'] for p in r]""",
    """    pts = [p for v in L.values() for r in v['rings'] for p in r] + [tuple(p) for ob in EXTRA for p in OUTL[ob]['ring']]""")
rep("""def sheet(name, blocks, title, sub, land, mapmm, tablecols):""",
    """def sheet(name, blocks, title, sub, land, mapmm, tablecols, extra=()):
    global EXTRA; EXTRA = list(extra)""")
rep("""            g.append('<text class="lh" x="%.2f" y="%.2f" font-size="%.2f">%.2f</text>'
                     % (X(c[0]), Y(c[1]) + fs * 0.62, fs * 0.60, v['ha']))""",
    """            g.append('<text class="lh" x="%.2f" y="%.2f" font-size="%.2f">%s</text>'
                     % (X(c[0]), Y(c[1]) + fs * 0.62, fs * 0.60, ('%.2f' % v['ha']) if not v.get('nolabel') else '?'))""")
rep("""            cells.append('<table><thead><tr><th>Petak</th><th>Ha</th><th>Pokok</th></tr></thead><tbody>'
                         + ''.join('<tr><td>%s</td><td>%.2f</td><td>%d</td></tr>' % (k, L[k]['ha'], L[k]['palms']) for k in part)""",
    """            cells.append('<table><thead><tr><th>Petak</th><th>Ha</th><th>Pokok</th></tr></thead><tbody>'
                         + ''.join(('<tr><td>%s</td><td>%.2f</td><td>%d</td></tr>' % (k, L[k]['ha'], L[k]['palms'])) if not L[k].get('nolabel')
                                   else ('<tr class="nlr"><td>%s</td><td>(%.2f)</td><td>?</td></tr>' % (k, L[k]['ha'])) for k in part)""")
rep("""    tha = sum(v['ha'] for v in L.values()); tp = sum(v['palms'] for v in L.values())""",
    """    tha = sum(v['ha'] for v in L.values() if not v.get('nolabel')); tp = sum(v['palms'] for v in L.values() if not v.get('nolabel'))
    nnl = sum(1 for v in L.values() if v.get('nolabel'))""")
rep("""'<span>Skala lebih kurang 1:%s · Sumber: ukur GPS 2022 (SPLT) · Dicetak %s</span>'""",
    """'<span>Skala lebih kurang 1:%s · Sumber: peta dron 2 Jul 2022 (Pi X Ventures), dijejak · DRAF: nombor belum disahkan · %s</span>'""")
rep("""            % (len(keys), tha, format(tp, ','), format(int(round(1/(s/1000))), ','), '13.11.2026'))""",
    """            % (len(keys), tha, format(tp, ','), format(int(round(1/(s/1000))), ','), '19.11.2026'))
    if nnl:
        foot = foot.replace('pokok</b></span>', 'pokok</b> + %d petak tiada label</span>' % nnl, 1)""")
rep(""".map .lh { text-anchor: middle; dominant-baseline: central; fill: #4a6b4a; }""",
    """.map .lh { text-anchor: middle; dominant-baseline: central; fill: #4a6b4a; }
.map .lot.nl { fill: #f6e3c8 !important; stroke-dasharray: .8 .5; }
.map .todo { fill: #f0f0f0; stroke: #9a9a9a; stroke-width: .3mm; stroke-dasharray: 1.2 .8; }
.map .tdt { text-anchor: middle; dominant-baseline: central; fill: #6a6a6a; font-style: italic; }
.b05 { fill: #f1dfdc !important; } .leg i.b05 { background: #f1dfdc; }
.tbl tr.nlr td { color: #a0522d; }""")
rep("""    keys += ['<i class="sw rd"></i>Jalan <small>road</small>', '<i class="sw hs"></i>Bangunan <small>building</small>']""",
    """    keys += ['<i class="sw" style="background:#f6e3c8"></i>Tiada label di peta Christy <small>Ha diukur, pokok ?</small>']""")

rep("""        rows = ''.join('<tr><td>%s</td><td>%.2f</td><td>%d</td></tr>' % (k, L[k]['ha'], L[k]['palms']) for k in keys)
""", '')
tail = """
if __name__ == '__main__':
    T = 'SPLT.MELIAU \u00b7 PETA PETAK'; ST = 'Lot map \u00b7 nombor petak dan hektar \u00b7 DRAF untuk semakan'
    jobs = []
    jobs.append(sheet('MELU_Blok_01', ['01'], T, ST, True, (400, 205), 5))
    jobs.append(sheet('MELU_Blok_02', ['02'], T, ST, True, (400, 205), 4))
    jobs.append(sheet('MELU_Blok_03', ['03'], T, ST, True, (400, 200), 4))
    jobs.append(sheet('MELU_Blok_04', ['04'], T, ST, True, (400, 205), 4))
    jobs.append(sheet('MELU_Blok_05', ['05'], T, ST, False, (277, 300), 4))
    jobs.append(sheet('MELU_Blok_06', ['06'], T, ST, False, (277, 290), 5))
    jobs.append(sheet('MELU_Semua_Blok', ['01', '02', '03', '04', '05', '06'], 'SPLT.MELIAU \u00b7 PETA LADANG',
                      'Seluruh ladang \u00b7 whole estate \u00b7 6 blok', True, (400, 205), 0))
    print(json.dumps(jobs))
"""
open(S + 'meliau_sheets.py', 'w').write(head + body + tail)
print('ok')
