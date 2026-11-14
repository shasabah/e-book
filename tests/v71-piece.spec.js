// E-Book test (1.60). The Paitan group's piece level: one worker team, one chit, one day close over three
// pieces — Paitan (SPLT), TKRS (PJSB) and 43 Acres (43AC). The land hangs under estate PTAN; the block says
// which piece, and the piece says which company owns the record. Made-up workers.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const ago = n => { const x = new Date(Date.now() - n * 864e5); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['PTAN'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-PTAN-01', name: 'Staf Paitan', role: 'Staff', estates: ['PTAN'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'PTAN', at: ago(0) + ' 07:00', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'PTAN', items: [] };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');

  // 1 · the land: three pieces under one estate
  const land = await p.evaluate(() => {
    const L = EA.lists, bs = L.blocksFor('PTAN');
    const by = {}; bs.forEach(x => { const pc = L.pieceOf('PTAN', x.block).piece; (by[pc] = by[pc] || []).push(x.block); });
    const lot = pc => L.lots.filter(l => l.estate === 'PTAN' && L.pieceOf('PTAN', l.block).piece === pc);
    const ha = pc => Math.round(lot(pc).reduce((s, l) => s + l.ha, 0) * 100) / 100;
    return { by, counts: { PTAN: lot('PTAN').length, TKRS: lot('TKRS').length, '43AC': lot('43AC').length },
      ha: { TKRS: ha('TKRS'), '43AC': ha('43AC') }, groupHa: Math.round(bs.reduce((s, x) => s + x.ha, 0) * 100) / 100,
      co: { p: L.pieceOf('PTAN', '01'), t: L.pieceOf('PTAN', 'T3'), a: L.pieceOf('PTAN', 'A1'), s: L.pieceOf('SSGT', '02') } };
  });
  check('Paitan holds 10 blocks over 3 pieces', JSON.stringify(land.by) === JSON.stringify({ PTAN: ['01','02','03','04','9A'], TKRS: ['T1','T2','T3','T4'], '43AC': ['A1'] }), JSON.stringify(land.by));
  check('TKRS 24 lots 34.85 Ha, 43 Acres 14 lots 17.54 Ha', land.counts.TKRS === 24 && land.ha.TKRS === 34.85 && land.counts['43AC'] === 14 && land.ha['43AC'] === 17.54, JSON.stringify(land));
  check('the group is 236.53 Ha, as the signed brief says', land.groupHa === 236.53, String(land.groupHa));
  check('the piece says the company: Paitan SPLT, TKRS PJSB, 43 Acres 43AC', land.co.p.company === 'SPLT' && land.co.t.company === 'PJSB' && land.co.a.company === '43AC', JSON.stringify(land.co));
  check('an estate with one piece is unchanged', land.co.s.piece === 'SSGT' && land.co.s.company === 'SPLT', JSON.stringify(land.co.s));

  // 2 · log in, then save: a record takes the company of the land, never of the estate or the worker
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P20'));
    localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.PTAN', JSON.stringify([['P1', 'Penuai Satu'], ['P2', 'Penuai Dua']].map(x => ({ id: x[0], name: x[1], estate: 'PTAN', gang: 'Am · General', sex: 'M' }))));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now())); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  const saved = await p.evaluate(({ d0 }) => {
    const out = {};
    out.paitan = EA.save('FH_WORK', 'FH', 'PTAN', { date: d0, worker_id: 'W1', task_code: 'HA', block: '01', lot: '1-3', bunches: 90 });
    out.tkrs = EA.save('FH_WORK', 'FH', 'PTAN', { date: d0, worker_id: 'W1', task_code: 'HA', block: 'T1', lot: 'T1-3', bunches: 40 });
    out.acres = EA.save('FH_WORK', 'FH', 'PTAN', { date: d0, worker_id: 'W1', task_code: 'HA', block: 'A1', lot: 'A1-7', bunches: 25 });
    out.noland = EA.save('FH_WORK', 'FH', 'PTAN', { date: d0, worker_id: 'W2', task_code: 'WM', qty: 1 });
    return { p: out.paitan.company, t: out.tkrs.company, a: out.acres.company, n: out.noland.company, est: out.tkrs.estate };
  }, { d0: ago(0) });
  check('the same man on TKRS land makes a PJSB record', saved.t === 'PJSB' && saved.est === 'PTAN', JSON.stringify(saved));
  check('Paitan land SPLT, 43 Acres land 43AC', saved.p === 'SPLT' && saved.a === '43AC', JSON.stringify(saved));
  check('a job with no land keeps the estate company', saved.n === 'SPLT', saved.n);

  // 3 · the chit names the place, so the staff can see which land he is keying
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-quick');
  const opts = await p.$$eval('#jb-block option', a => a.map(o => o.textContent.split(' · ')[0]));
  check('the block list names each place', opts.join('|').includes('Paitan Blk 1') && opts.join('|').includes('TKRS Blk 1') && opts.join('|').includes('43 Acres Blk 1'), opts.join(' | '));
  await p.selectOption('#jb-block', 'T3'); await p.waitForTimeout(250);
  const lots = await p.$$eval('#jb-lots [data-lot]', a => a.map(x => x.dataset.lot));
  check('picking TKRS Blk 3 offers only its 10 lots', lots.length === 10 && lots.every(l => l.startsWith('T3-')), lots.join(' '));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v71-pieces.png' });
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
