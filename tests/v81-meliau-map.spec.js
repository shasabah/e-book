// E-Book test (Meliau map, 19 Nov 2026) Meliau's six block outlines, traced from the 2022 drone overview map
// ("LA3_OvervieweMap_MeliauEstate", QGIS, drone 2 July 2022). Each block is one lot on the land list, so each outline
// is one lot. This test checks the outlines against the land list already written: same six lots, the right place,
// the right size, nothing invented, and Sugut and Paitan untouched.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
['lists/lot-shapes.js', 'lists/lots.js', 'lists/estates.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx));
const EA = ctx.EA, S = EA.lists.lotShapes, M = S.MELU || {};
const lots = EA.lists.lots.filter(l => l.estate === 'MELU');
const rings = g => Array.isArray(g[0][0]) ? g : [g];

check('Meliau has six outlines, one per block lot', Object.keys(M).sort().join() === '1-1,2-1,3-1,4-1,5-1,6-1', Object.keys(M).join());
check('every outline belongs to a lot on the Meliau land list — nothing invented', Object.keys(M).every(k => lots.some(l => l.lot === k)));
check('Sugut and Paitan still have their own outlines', Object.keys(S.SSGT).length > 150 && Object.keys(S.PTAN).length === 170,
  'SSGT ' + Object.keys(S.SSGT).length + ' · PTAN ' + Object.keys(S.PTAN).length);
check('every outline is a closed ring in Meliau (5.71–5.76 N, 117.15–117.21 E)',
  Object.keys(M).every(k => rings(M[k]).every(r => r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]
    && r.every(p => p[0] > 117.15 && p[0] < 117.21 && p[1] > 5.71 && p[1] < 5.76))));
check('no Meliau outline strays into Sugut (6.1 N) or Paitan (6.4 N)', Object.keys(M).every(k => rings(M[k])[0].every(p => p[1] < 5.9)));

// size: the area of each outline against the land list Ha (the drone map's own Ha). A tracing, so within 2%.
const area = r => { const lat0 = r[0][1] * Math.PI / 180, kx = 111320 * Math.cos(lat0), ky = 110574; let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * kx * r[i + 1][1] * ky - r[i + 1][0] * kx * r[i][1] * ky; return Math.abs(a) / 2 / 1e4; };
const off = lots.map(l => [l.lot, area(rings(M[l.lot])[0]), l.ha]).filter(x => Math.abs(x[1] / x[2] - 1) > 0.02);
check('every outline\'s size is within 2% of its block\'s Ha on the land list', off.length === 0,
  lots.map(l => l.lot + ' ' + area(rings(M[l.lot])[0]).toFixed(1) + '/' + l.ha).join(' · '));

// neighbours: blocks touch but do not sit on top of each other (sampled points inside one are outside the others)
const inside = (pt, g) => { let c = false; rings(g).forEach(r => { for (let i = 0; i < r.length - 1; i++) { const [x1, y1] = r[i], [x2, y2] = r[i + 1]; if ((y1 > pt[1]) !== (y2 > pt[1]) && pt[0] < (x2 - x1) * (pt[1] - y1) / (y2 - y1) + x1) c = !c; } }); return c; };
check('every block has a centre point inside its own outline and inside no other',
  lots.every(l => l.lat && l.lon && inside([l.lon, l.lat], M[l.lot]) && lots.every(o => o.lot === l.lot || !inside([l.lon, l.lat], M[o.lot]))),
  lots.map(l => l.lot + (l.lat ? '' : ' no point')).join(','));
check('the land list itself is unchanged: 280.66 Ha, 34,906 palms',
  lots.reduce((a, l) => a + l.ha, 0).toFixed(2) === '280.66' && lots.reduce((a, l) => a + l.palms, 0) === 34906);
