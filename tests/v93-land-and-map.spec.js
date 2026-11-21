// E-Book test (1.84). Tanah & peta: one Senarai tile for the land. Yu Chen, 21 Nov 2026: "if i wan to load the complete
// table in the apps? which module or button should cover this info", then "better to split out with the map or join?"
// and "ok" to the joined sample. The block table (planting year, Ha, palms, palms/Ha, lots) is the way in; a block opens
// its own map with its lots under it; a lot tapped on the map or in the list lights up in both. HQ and the Owner start
// from all estates. Read only. The planting years come from the 2026 budget Area Statements, into lists/lots.js.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  async function session(est, name, role) {
    const cx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' });
    const p = await cx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const sent = [];
    const owner = role === 'Owner';
    await p.route('https://script.google.com/**', async rt => {
      const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT', 'PTAN', 'MELU'] }, cleanFrom: '' };
      let o = { ok: true, sw };
      if (bd.action === 'login') o = { ok: true, user: owner ? { code: 'OWN-ALL-01', name, role: 'Owner', estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'KWNN'] } : { code: 'STF-' + est + '-01', name, role: 'Staff', estates: [est] }, sw };
      else if (bd.action === 'backlog') o = { ok: true, estate: bd.estate || est, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
      else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
      else if (bd.action === 'program') o = { ok: true, estate: bd.estate || est, month: bd.month, programme: [], done: [], budget: {}, crop: {}, lots: {} };
      else if (bd.action === 'saveBatch') { (bd.items || []).forEach(it => sent.push(it)); o = { ok: true, sw, results: bd.items.map(it => ({ ok: true, id: it.row.id })) }; }
      else if (bd.action === 'todo') o = { ok: true, estate: bd.estate || est, items: [] };
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    });
    await p.clock.install({ time: new Date('2026-11-14T06:10:00+08:00') });
    await p.goto('http://localhost:8765/index.html');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P41')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
    await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(600);
    return { p, cx, errs, sent };
  }
  const tab = sel => p => p.evaluate(s => [...document.querySelectorAll(s + ' tbody tr')].map(tr => [...tr.cells].map(c => c.textContent.replace(' ›', '').trim()).join('|')), sel);

  // ---- the data: planting years on every lot ----
  let s = await session('MELU', 'Staf Meliau Contoh', 'Staf'), p = s.p;
  const loggedIn = await p.evaluate(() => !document.getElementById('home').hidden);
  if (!loggedIn) { console.log('FAIL could not open a session — see v80-meliau for the login this suite uses'); process.exitCode = 1; await b.close(); return; }
  const Y = await p.evaluate(() => { const o = {}; EA.lists.lots.forEach(l => { const k = l.estate + ' ' + l.block; (o[k] = o[k] || new Set()).add(l.planted); }); const r = {}; for (const k in o) r[k] = [...o[k]].join('/'); return r; });
  check('every lot has a planting year, one year per block', Object.values(Y).every(v => /^\d{4}$/.test(v)), JSON.stringify(Y));
  check('Meliau 01–03 planted 2002, 04–06 2003 (MELU budget costing 2026)', ['01', '02', '03'].every(k => Y['MELU ' + k] === '2002') && ['04', '05', '06'].every(k => Y['MELU ' + k] === '2003'));
  check('Paitan 01–02 2006, 03–04 2010, 9Ac 2018; TKRS 2007; 43 Acres 2012', Y['PTAN 01'] === '2006' && Y['PTAN 02'] === '2006' && Y['PTAN 03'] === '2010' && Y['PTAN 04'] === '2010' && Y['PTAN 9A'] === '2018' && ['T1', 'T2', 'T3', 'T4'].every(k => Y['PTAN ' + k] === '2007') && Y['PTAN A1'] === '2012');
  check('Sugut unchanged: 01–02 2006, 03–04 2010', Y['SSGT 01'] === '2006' && Y['SSGT 02'] === '2006' && Y['SSGT 03'] === '2010' && Y['SSGT 04'] === '2010');

  // ---- estate staff: tile → block table → block ----
  await p.evaluate(() => EA.homePane && EA.homePane('lists')); await p.waitForTimeout(300);
  const tile = await p.textContent('[data-ref="map"]');
  check('Senarai: one land tile, Tanah & peta, in place of Peta petak', /Tanah & peta/.test(tile) && /6 blok · 173 petak · 280\.66 Ha/.test(tile) && !/Peta petak/.test(await p.textContent('#tiles-ref')), tile);
  await p.click('[data-ref="map"]'); await p.waitForTimeout(300);
  let rows = await tab('#land-est')(p);
  check('staff open their own estate\'s block table (no all-estates table)', await p.locator('#land-all').count() === 0 && rows.length === 7, rows.length + ' rows');
  check('Blok 01: planted 2002, 53.00 Ha, 6,327 palms, 119 palms/Ha, 31 lots', rows[0] === '01|2002|53.00|6,327|119|31', rows[0]);
  check('total row: 280.66 Ha, 34,849 palms, 124 palms/Ha, 173 lots', rows[6] === 'Jumlah||280.66|34,849|124|173', rows[6]);
  check('no map on the table screen, and nothing to key', await p.locator('#sheet svg.pg-map').count() === 0 && await p.locator('#sheet input, #sheet select, #sheet textarea').count() === 0);
  await p.click('[data-landblk="01"]'); await p.waitForTimeout(300);
  const head = await p.innerText('#sheet');
  check('a block opens with its heading: Tanam 2002 · 53.00 Ha · 31 petak · 6,327 pokok', /Meliau · Blok 01/.test(head) && /Tanam 2002 · 53\.00 Ha · 31 petak · 6,327 pokok/.test(head));
  check('one map, of this block only, above its lot list', await p.locator('#sheet svg.pg-map').count() === 1 && await p.locator('#sheet .land-map path[data-pglot]').count() === 31 &&
    await p.evaluate(() => { const m = document.querySelector('.land-map'), t = document.getElementById('land-lots'); return !!(m.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  rows = await tab('#land-lots')(p);
  check('31 lots and a total that equals the block: 53.00 Ha, 6,327 palms', rows.length === 32 && rows[0].startsWith('1-1|') && rows[31] === 'Jumlah|53.00|6,327|119', rows[31]);
  check('nothing is picked at first', await p.locator('#sheet .sel').count() === 0 && await p.locator('#land-pick').isHidden());
  // tap a lot in the list → lights on the map
  await p.click('[data-landlot="1-15"]'); await p.waitForTimeout(200);
  let sel = await p.evaluate(() => ({ map: [...document.querySelectorAll('.land-map path.sel')].map(e => e.dataset.pglot), row: [...document.querySelectorAll('#land-lots tr.sel')].map(e => e.dataset.landlot), pick: document.getElementById('land-pick').textContent }));
  check('tap lot 1-15 in the list: it lights on the map and in the list, and its line reads 3.71 Ha · 410 pokok', sel.map.join() === 'land|1-15' && sel.row.join() === '1-15' && sel.pick === 'Petak 1-15 · 3.71 Ha · 410 pokok', JSON.stringify(sel));
  // tap another lot on the map → the list follows, only one lit
  await p.evaluate(() => document.querySelector('.land-map path[data-pglot="land|1-4"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(200);
  sel = await p.evaluate(() => ({ map: [...document.querySelectorAll('.land-map path.sel')].map(e => e.dataset.pglot), row: [...document.querySelectorAll('#land-lots tr.sel')].map(e => e.dataset.landlot), pick: document.getElementById('land-pick').textContent, nums: document.querySelectorAll('.land-map svg text').length }));
  check('tap lot 1-4 on the map: the list follows, and only one lot is lit', sel.map.join() === 'land|1-4' && sel.row.join() === '1-4' && /^Petak 1-4 · /.test(sel.pick), JSON.stringify(sel));
  check('the lot numbers stay on the map after a pick', sel.nums >= 31, String(sel.nums));
  await p.click('#land-up'); await p.waitForTimeout(200);
  check('the button above goes back to the estate\'s table', await p.locator('#land-est').count() === 1 && await p.locator('#land-up').count() === 0);
  await p.click('#sheet-x'); await p.waitForTimeout(100);
  check('BALIK closes it', await p.locator('#sheet-back').isHidden());
  check('view only: nothing was saved to the office by looking', s.sent.length === 0, String(s.sent.length));
  check('no page errors (staff)', s.errs.length === 0, s.errs.join(' | '));
  await s.cx.close();

  // ---- the Paitan group: three pieces on one staff table ----
  s = await session('PTAN', 'Staf Paitan Contoh', 'Staf'); p = s.p;
  await p.evaluate(() => EA.homePane && EA.homePane('lists')); await p.waitForTimeout(300);
  await p.click('[data-ref="map"]'); await p.waitForTimeout(300);
  rows = await tab('#land-est')(p);
  check('Paitan staff see the group\'s ten blocks, 236.53 Ha, 27,795 palms', rows.length === 11 && rows[10] === 'Jumlah||236.53|27,795|118|209', rows[10]);
  check('TKRS T1 planted 2007; 43 Acres A1 planted 2012', rows.some(r => r.startsWith('T1|2007|10.34|')) && rows.some(r => r.startsWith('A1|2012|17.54|2,274|130|14')));
  await p.click('[data-landblk="9A"]'); await p.waitForTimeout(300);
  check('a block with no outline (9Ac) says so and still lists its lot', /Belum ada peta untuk blok ini/.test(await p.innerText('#sheet')) && (await tab('#land-lots')(p)).length === 2);
  check('no page errors (Paitan)', s.errs.length === 0, s.errs.join(' | '));
  await s.cx.close();

  // ---- HQ / Owner: all estates first ----
  s = await session('SDK', 'Owner Contoh', 'Owner'); p = s.p;
  await p.evaluate(() => { EA.homePane && EA.homePane('lists'); }); await p.waitForTimeout(300);
  check('the Owner has the land tile', await p.locator('[data-ref="map"]').count() === 1);
  await p.click('[data-ref="map"]'); await p.waitForTimeout(300);
  rows = await tab('#land-all')(p);
  check('the Owner starts from all estates: Meliau, Sugut, Paitan, TKRS, 43 Acres and a total', rows.length === 6 && ['Meliau|6|280.66|34,849|124|173', 'Sugut|4|130.65|17,835|137|164', 'Paitan|5|184.14|20,957|114|171', 'TKRS|4|34.85|4,564|131|24', '43 Acres|1|17.54|2,274|130|14'].every(x => rows.includes(x)), rows.join('  '));
  check('the all-estates total: 20 blocks, 647.84 Ha, 80,479 palms, 546 lots', rows[5] === 'Jumlah|20|647.84|80,479|124|546', rows[5]);
  await p.evaluate(() => [...document.querySelectorAll('#land-all tr.tap')].find(tr => /^TKRS/.test(tr.cells[0].textContent)).click()); await p.waitForTimeout(300);
  rows = await tab('#land-est')(p);
  check('tap TKRS: its four blocks only, 34.85 Ha', rows.length === 5 && rows[4] === 'Jumlah||34.85|4,564|131|24' && /Tanah & peta · TKRS/.test(await p.innerText('#sheet')), rows.join('  '));
  await p.click('[data-landblk="T1"]'); await p.waitForTimeout(300);
  check('a TKRS block opens its map (traced 21 Nov) and its nine lots', await p.locator('#sheet svg.pg-map').count() === 1 && await p.locator('#sheet .land-map path[data-pglot]').count() === 9 && (await tab('#land-lots')(p)).length === 10);
  const shp = await p.evaluate(() => { const S = EA.lists.lotShapes.PTAN, L = EA.lists.lotsFor('PTAN').filter(l => /^[TA]/.test(l.block));
    const area = r => { const k = 111320 * Math.cos(6.43 * Math.PI / 180); let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * k * r[i + 1][1] * 110574 - r[i + 1][0] * k * r[i][1] * 110574; return Math.abs(a) / 2e4; };
    const inside = (pt, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > pt[1]) !== (r[j][1] > pt[1]) && pt[0] < (r[j][0] - r[i][0]) * (pt[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
    return { n: L.length, drawn: L.filter(l => S[l.lot]).length, off: L.filter(l => S[l.lot] && Math.abs(area(S[l.lot]) / l.ha - 1) > 0.2).map(l => l.lot), out: L.filter(l => S[l.lot] && !inside([l.lon, l.lat], S[l.lot])).map(l => l.lot) }; });
  check('all 38 TKRS and 43 Acres lots have an outline, within 20% of the lot\'s Ha, with the lot\'s point inside it', shp.n === 38 && shp.drawn === 38 && shp.off.length === 0 && shp.out.length === 0, JSON.stringify(shp));
  await p.click('#land-up'); await p.waitForTimeout(200); await p.click('#land-up'); await p.waitForTimeout(200);
  check('two steps back reach all estates again', await p.locator('#land-all').count() === 1);
  check('no page errors (Owner)', s.errs.length === 0, s.errs.join(' | '));
  await s.cx.close();
  await b.close();
})();
