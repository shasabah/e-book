// E-Book test (1.56.2) Paitan starts, on the phone (Yu Chen, 13 Nov 2026: "I only add Paitan, it will not
// affect Sugut"). The Paitan staff's chit offers Paitan's five blocks and its own lots and main jobs (no durian);
// PROGRAM opens with nothing loaded yet; Sugut's lists are exactly as before. Made-up names only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  async function session(est, name) {
    const cx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' });
    const p = await cx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const sent = [];
    await p.route('https://script.google.com/**', async rt => {
      const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT', 'PTAN'] }, cleanFrom: '' };
      let o = { ok: true, sw };
      if (bd.action === 'login') o = { ok: true, user: { code: 'STF-' + est + '-01', name, role: 'Staff', estates: [est] }, sw };
      else if (bd.action === 'backlog') o = { ok: true, estate: est, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
      else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
      else if (bd.action === 'program') o = { ok: true, estate: est, month: bd.month, programme: [], done: [], budget: {}, crop: {}, lots: {} };
      else if (bd.action === 'saveBatch') { (bd.items || []).forEach(it => sent.push(it)); o = { ok: true, sw, results: bd.items.map(it => ({ ok: true, id: it.row.id })) }; }
      else if (bd.action === 'todo') o = { ok: true, estate: est, items: [] };
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    });
    await p.clock.install({ time: new Date('2026-11-14T06:10:00+08:00') });   // Saturday
    await p.goto('http://localhost:8765/index.html');
    const people = [{ id: 'PW1', name: 'Penuai Satu', estate: est, gang: 'Tuai · Harvesting', sex: 'M' }, { id: 'PW2', name: 'Penuai Dua', estate: est, gang: 'Tuai · Harvesting', sex: 'M' }];
    await p.evaluate(a => {
      localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P40')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
      localStorage.setItem('ea.people.' + a.est, JSON.stringify(a.people)); localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    }, { est, people });
    await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(600);
    return { p, cx, errs, sent };
  }
  const goRoom = async (p, h) => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(150); await p.evaluate(h => { location.hash = h; }, h || 'field-harvest'); await p.waitForTimeout(600); };

  // ---------- the lists ----------
  let s = await session('PTAN', 'Staf Paitan Contoh'), p = s.p;
  const L = await p.evaluate(() => ({
    ss: EA.lists.lotsFor('SSGT').length, pt: EA.lists.lotsFor('PTAN').filter(function (l) { return EA.lists.pieceOf('PTAN', l.block).piece === 'PTAN'; }).length, tk: EA.lists.lotsFor('TKRS').length,
    ha: EA.lists.lotsFor('PTAN').filter(function (l) { return EA.lists.pieceOf('PTAN', l.block).piece === 'PTAN'; }).reduce((a, l) => a + l.ha, 0).toFixed(2), palms: EA.lists.lotsFor('PTAN').filter(function (l) { return EA.lists.pieceOf('PTAN', l.block).piece === 'PTAN'; }).reduce((a, l) => a + l.palms, 0),
    blocks: EA.lists.blocksFor('PTAN').filter(function (b) { return !b.piece; }).map(b => b.block + ':' + EA.lists.lotsFor('PTAN', b.block).length).join(' '),
    bha: EA.lists.blocksFor('PTAN').filter(function (b) { return !b.piece; }).reduce((a, b) => a + b.ha, 0).toFixed(2), sb: EA.lists.blocksFor('SSGT').map(b => b.block + ':' + b.ha).join(' '),
    df: EA.lists.mainJobs.PTAN.indexOf('DF'), mj: EA.lists.mainJobs.PTAN.length, smj: EA.lists.mainJobs.SSGT.join(','),
    lot: JSON.stringify(EA.lists.lot('PTAN', '1-13')), slot: EA.lists.lot('SSGT', '1-13').ha, name: EA.lists.estate('PTAN').name,
    gps: EA.lists.nearestLot('PTAN', 6.5, 117.3),
    here: (function () { var l = EA.lists.lot('PTAN', '2-9'); var n = EA.lists.nearestLot('PTAN', l.lat, l.lon); return n && n.lot.lot + '|' + n.metres; })(),
    pieces: (function () { var by = {}; EA.lists.lotsFor('PTAN').forEach(function (l) { var pc = EA.lists.pieceOf('PTAN', l.block).piece; by[pc] = (by[pc] || 0) + 1; }); return Object.keys(by).map(function (k) { return k + ':' + by[k]; }).join(' '); })(),
    noCoord: EA.lists.lotsFor('PTAN').filter(function (l) { return !l.lat && EA.lists.pieceOf('PTAN', l.block).piece === 'PTAN'; }).map(function (l) { return l.lot; }).join(',')
  }));
  check('Paitan has 171 lots: 170 surveyed (184.14 Ha with 9Ac, 20,957 palms) and one for Block 9Ac', L.pt === 171 && L.ha === '184.14' && L.palms === 20957, JSON.stringify(L));
  check('five blocks with their lots: 01 43, 02 33, 03 40, 04 54, 9A 1; block Ha add to 184.14', L.blocks === '01:43 02:33 03:40 04:54 9A:1' && L.bha === '184.14', L.blocks + ' ' + L.bha);
  check('Sugut is untouched: 164 lots, the same four blocks and the same main jobs', L.ss === 164 && L.sb === '01:33.2 02:33.93 03:31.18 04:32.34' && /^HA,ITF,LFF,LF,DF,/.test(L.smj), L.ss + ' ' + L.sb);
  check('TKRS and 43 Acres are pieces of the Paitan group, not estates of their own (1.60)', L.tk === 0 && L.pieces === 'PTAN:171 TKRS:24 43AC:14', L.pieces);
  check('Paitan\'s lot 1-13 is its own, not Sugut\'s', /"ha":0.26/.test(L.lot) && /"palms":36/.test(L.lot) && L.slot !== 0.26, L.lot + ' / ' + L.slot);
  check('main jobs as Sugut without durian', L.df < 0 && L.mj === 16);
  check('the estate is named Paitan', L.name === 'Paitan', L.name);
  // v1.59: the lots have their own centre points now (from the survey shapefiles), so standing in a lot names that lot
  check('standing in a lot, the nearest lot is that lot', L.here === '2-9|0', L.here);
  // far away it still answers, so whoever asks must look at the metres: 12 km is not "you are in this lot"
  check('far from the estate the answer carries the distance, so a wrong lot cannot pass as right',
    !!L.gps && L.gps.metres > 10000, JSON.stringify(L.gps));
  check('Block 9Ac has no coordinates, because it has no map: no guess', L.noCoord === '9A-1', L.noCoord);

  // ---------- the chit ----------
  await goRoom(p);
  check('the Paitan staff\'s room opens on the chit', !!(await p.$('#fh-addjob')), (await p.textContent('#room')).slice(0, 120));
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  check('the job buttons have no durian job', !(await p.$('[data-quick="DF"]')) && !!(await p.$('[data-quick="HA"]')) && !!(await p.$('[data-quick="MAN"]')));
  await p.click('[data-quick="HA"]'); await p.waitForTimeout(250);
  const bo = await p.$$eval('#jb-block option', o => o.map(x => x.value).filter(Boolean));
  // v1.60: the group's ten blocks over three pieces — Paitan's five, TKRS's four, 43 Acres' one.
  check('the block list is the group\'s ten blocks, Paitan\'s five first', bo.join() === '01,02,03,04,9A,T1,T2,T3,T4,A1', bo.join());
  await p.selectOption('#jb-block', '02'); await p.waitForTimeout(250);
  const lots = await p.$$eval('#jb-lots .pick[data-lot]', a => a.map(x => x.dataset.lot));
  check('Block 02 offers its 33 lots, 2-1 to 2-33', lots.length === 33 && lots[0] === '2-1' && lots.indexOf('2-33') >= 0, lots.length + ' ' + lots.slice(0, 3).join());
  await p.selectOption('#jb-block', '9A'); await p.waitForTimeout(250);
  const l9 = await p.$$eval('#jb-lots .pick[data-lot]', a => a.map(x => x.dataset.lot));
  check('Block 9Ac offers its one lot', l9.join() === '9A-1', l9.join());
  await p.evaluate(() => EA.ui.closeSheet && EA.ui.closeSheet());
  check('no page errors on the chit', s.errs.length === 0, s.errs.join(' | '));

  // ---------- the other screens open with nothing loaded ----------
  for (const h of ['field-harvest/work', 'field-harvest/collect', 'field-harvest/close', 'field-harvest/history']) { await goRoom(p, h); }
  check('Kerja, Ramp, Tutup hari and Rekod open for Paitan with no errors', s.errs.length === 0, s.errs.join(' | '));
  await goRoom(p, 'field-harvest/history'); await p.waitForTimeout(300);
  const prog = await p.$('[data-rk="program"], #rk-program, [data-tab="program"]');
  if (prog) { await prog.click(); await p.waitForTimeout(600); }
  check('PROGRAM opens for Paitan with no programme loaded, no errors', s.errs.length === 0, s.errs.join(' | '));
  await s.cx.close();

  // ---------- Sugut's chit, as before ----------
  s = await session('SSGT', 'Staf Sugut Contoh'); p = s.p;
  await goRoom(p); await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  check('Sugut still has its durian job button', !!(await p.$('[data-quick="DF"]')));
  await p.click('[data-quick="HA"]'); await p.waitForTimeout(250);
  const sb = await p.$$eval('#jb-block option', o => o.map(x => x.value).filter(Boolean));
  check('Sugut\'s block list has no Paitan block', sb.indexOf('9A') < 0 && sb.indexOf('01') >= 0 && sb.length >= 4, sb.join());
  await p.selectOption('#jb-block', '02'); await p.waitForTimeout(250);
  const sl = await p.$$eval('#jb-lots .pick[data-lot]', a => a.map(x => x.dataset.lot));
  check('Sugut Block 02 offers Sugut\'s own lots only', sl.length === await p.evaluate(() => EA.lists.lotsFor('SSGT', '02').length) && sl.length !== 33, String(sl.length));
  check('no page errors (Sugut)', s.errs.length === 0, s.errs.join(' | '));
  await s.cx.close();
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
