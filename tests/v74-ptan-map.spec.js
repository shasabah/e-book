// E-Book test (1.59) Paitan's lot map, and the quarter turn for a long block (Yu Chen, 13 Nov 2026: "what
// happened to the map?"). The outlines are Christy's own 2022 survey shapefiles, not a tracing, so this test
// checks them against the land data already signed: the same 170 lots, in the same blocks, nothing invented.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
['lists/lot-shapes.js', 'lists/lots.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx));
const EA = ctx.EA, S = EA.lists.lotShapes;
const lots = EA.lists.lots.filter(l => l.estate === 'PTAN');
const rings = g => Array.isArray(g[0][0]) ? g : [g];

check('Paitan has its own outlines, and Sugut still has its own',
  !!S.PTAN && Object.keys(S.PTAN).length === 170 && Object.keys(S.SSGT).length > 150,
  'PTAN ' + Object.keys(S.PTAN || {}).length + ' · SSGT ' + Object.keys(S.SSGT || {}).length);
check('every outline belongs to a lot on the Paitan land list — nothing invented',
  Object.keys(S.PTAN).every(k => lots.some(l => l.lot === k)),
  Object.keys(S.PTAN).filter(k => !lots.some(l => l.lot === k)).join(', '));
// v1.60: TKRS and 43 Acres have no survey outlines either — only the Paitan piece is mapped.
check('every Paitan lot has an outline except 9A-1, which has no map',
  lots.filter(l => !S.PTAN[l.lot] && EA.lists.pieceOf('PTAN', l.block).piece === 'PTAN').map(l => l.lot).join(',') === '9A-1',
  lots.filter(l => !S.PTAN[l.lot]).map(l => l.lot).join(','));
check('the four blocks hold 43, 33, 40 and 54 lots',
  ['01', '02', '03', '04'].map(b => EA.lists.lotsFor('PTAN', b).filter(l => S.PTAN[l.lot]).length).join(',') === '43,33,40,54',
  ['01', '02', '03', '04'].map(b => EA.lists.lotsFor('PTAN', b).filter(l => S.PTAN[l.lot]).length).join(','));
check('every outline is a closed ring of at least 4 points, in Paitan (6.38–6.40 N, 117.33–117.38 E)',
  Object.keys(S.PTAN).every(k => rings(S.PTAN[k]).every(r =>
    r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]
    && r.every(p => p[0] > 117.3 && p[0] < 117.4 && p[1] > 6.37 && p[1] < 6.41))), 'rings');
check('no outline strays into Sugut (6.11–6.14 N), so the two estates cannot be mixed up',
  Object.keys(S.SSGT).every(k => rings(S.SSGT[k])[0][0][1] < 6.2) && Object.keys(S.PTAN).every(k => rings(S.PTAN[k])[0][0][1] > 6.3), 'apart');

// each lot's centre point, for the map label and the nearest-lot suggestion
const inside = (pt, g) => { let c = false; rings(g).forEach(r => { for (let i = 0; i < r.length - 1; i++) { const [x1, y1] = r[i], [x2, y2] = r[i + 1]; if ((y1 > pt[1]) !== (y2 > pt[1]) && pt[0] < (x2 - x1) * (pt[1] - y1) / (y2 - y1) + x1) c = !c; } }); return c; };
check('every mapped lot has a centre point', lots.filter(l => S.PTAN[l.lot]).every(l => l.lat && l.lon), 'lat/lon');
check('every centre point falls inside its own lot, so the number is never on a neighbour',
  lots.filter(l => S.PTAN[l.lot]).every(l => inside([l.lon, l.lat], S.PTAN[l.lot])),
  lots.filter(l => S.PTAN[l.lot] && !inside([l.lon, l.lat], S.PTAN[l.lot])).map(l => l.lot).join(','));
check('9A-1 has no centre point either: no map, no guess', !lots.find(l => l.lot === '9A-1').lat, '9A-1');

// the quarter turn: which blocks get it, and that it is only about the drawing
const size = (est, b) => {
  const ls = (EA.lists.lotsFor(est, b) || []).filter(l => S[est][l.lot]); if (!ls.length) return null;
  let xs = [], ys = [];
  ls.forEach(l => rings(S[est][l.lot]).forEach(r => r.forEach(p => { xs.push(p[0]); ys.push(p[1]); })));
  const lat0 = ys.reduce((a, b) => a + b, 0) / ys.length;
  return { w: (Math.max(...xs) - Math.min(...xs)) * 111320 * Math.cos(lat0 * Math.PI / 180), h: (Math.max(...ys) - Math.min(...ys)) * 110574 };
};
const turns = (est, b) => { const s = size(est, b); return !!s && s.w > s.h * 1.6; };
check('Paitan Blk 03 and Blk 04 are turned (they are long east to west)',
  turns('PTAN', '03') && turns('PTAN', '04'),
  ['03', '04'].map(b => b + ' ' + Math.round(size('PTAN', b).w) + 'x' + Math.round(size('PTAN', b).h) + ' m').join(' · '));
check('Paitan Blk 01 and Blk 02 are not turned', !turns('PTAN', '01') && !turns('PTAN', '02'),
  ['01', '02'].map(b => b + ' ' + Math.round(size('PTAN', b).w) + 'x' + Math.round(size('PTAN', b).h) + ' m').join(' · '));
check('no Sugut block is turned, so nothing changes for Sugut',
  !['01', '02', '03', '04'].some(b => turns('SSGT', b)),
  ['01', '02', '03', '04'].map(b => b + ' ' + (size('SSGT', b) ? Math.round(size('SSGT', b).w / size('SSGT', b).h * 10) / 10 : '-')).join(' · '));
const pg = fs.readFileSync(path.join(root, 'rooms', 'field', 'program.js'), 'utf8');
check('a turned map says where north went; a map that is not turned has north up and no arrow',
  /var turn = \(maxX - minX\) > \(maxY - minY\) \* 1\.6;/.test(pg) && /var mark = turn \? '<g class="pg-n">/.test(pg) && /: '';/.test(pg), 'arrow');

// the shapefile's own hectares and palms, against the land list signed on 13 Nov
const ha = { '01': 39.97, '02': 36.18, '03': 47.71, '04': 56.64 };
check('each block\'s lots still add up to the hectares in the budget Area Statement',
  ['01', '02', '03', '04'].every(b => Math.abs(EA.lists.lotsFor('PTAN', b).reduce((s, l) => s + l.ha, 0) - ha[b]) < 0.06),
  ['01', '02', '03', '04'].map(b => b + ':' + EA.lists.lotsFor('PTAN', b).reduce((s, l) => s + l.ha, 0).toFixed(2)).join(' '));
// v1.60: the Paitan piece, not the whole estate — TKRS and 43 Acres are now land under PTAN too.
const own = lots.filter(l => EA.lists.pieceOf('PTAN', l.block).piece === 'PTAN');
check('the Paitan piece is still 184.14 Ha and 20,957 palms over 171 lots',
  Math.abs(own.reduce((s, l) => s + l.ha, 0) - 184.14) < 0.06 && own.reduce((s, l) => s + l.palms, 0) === 20957 && own.length === 171,
  own.reduce((s, l) => s + l.ha, 0).toFixed(2) + ' Ha · ' + own.reduce((s, l) => s + l.palms, 0) + ' palms · ' + own.length + ' lots');
