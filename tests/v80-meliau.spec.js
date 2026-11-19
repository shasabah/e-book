// E-Book test (Meliau land, 18 Nov 2026) Meliau's six blocks go in as lists only (Brief_Data_Induk 4), from HQ's
// MELU SUMMARY BUDGET 2026: 280.66 Ha, 34,906 palms, no lots inside the blocks yet, so each block is one lot. Main jobs as Paitan
// (Sugut's without durian). Sugut and Paitan are unchanged. Made-up names only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  async function session(est, name) {
    const cx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' });
    const p = await cx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const sent = [];
    await p.route('https://script.google.com/**', async rt => {
      const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT', 'PTAN', 'MELU'] }, cleanFrom: '' };
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
      localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P41')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
      localStorage.setItem('ea.people.' + a.est, JSON.stringify(a.people)); localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    }, { est, people });
    await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(600);
    return { p, cx, errs, sent };
  }
  const goRoom = async (p, h) => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(150); await p.evaluate(h => { location.hash = h; }, h || 'field-harvest'); await p.waitForTimeout(600); };

  // ---------- the lists ----------
  let s = await session('MELU', 'Staf Meliau Contoh'), p = s.p;
  const L = await p.evaluate(() => ({
    blocks: EA.lists.blocksFor('MELU').map(b => b.block + ':' + b.ha.toFixed(2)).join(' '),
    lots: EA.lists.lotsFor('MELU').map(l => l.lot).join(','),
    ha: EA.lists.lotsFor('MELU').reduce((a, l) => a + l.ha, 0).toFixed(2), palms: EA.lists.lotsFor('MELU').reduce((a, l) => a + l.palms, 0),
    name: EA.lists.estate('MELU').name, df: EA.lists.mainJobs.MELU.indexOf('DF'), mj: EA.lists.mainJobs.MELU.join(','), pmj: EA.lists.mainJobs.PTAN.join(','),
    ss: EA.lists.lotsFor('SSGT').length, pt: EA.lists.lotsFor('PTAN').length, cal: !!(EA.lists.calendarFor && EA.lists.calendarFor('MELU'))
  }));
  check('Meliau has six blocks with the budget\'s hectares', L.blocks === '01:53.00 02:43.97 03:41.95 04:39.74 05:41.28 06:60.72', L.blocks);
  check('each block is one lot until a map exists: 1-1 to 6-1', L.lots === '1-1,2-1,3-1,4-1,5-1,6-1', L.lots);
  check('the lots add to 280.66 Ha and 34,906 palms, the file\'s own totals', L.ha === '280.66' && L.palms === 34906, L.ha + ' ' + L.palms);
  check('the estate is named Meliau', L.name === 'Meliau', L.name);
  check('main jobs as Paitan: Sugut\'s without durian', L.df < 0 && L.mj === L.pmj, L.mj);
  check('Sugut and Paitan keep their own lots (164 and 209)', L.ss === 164 && L.pt === 209, L.ss + ' ' + L.pt);
  check('Meliau\'s 2026 calendar is still there', L.cal);

  await goRoom(p);
  check('the Meliau staff\'s room opens on the chit', !!(await p.$('#fh-addjob')), (await p.textContent('#room')).slice(0, 120));
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  check('no durian job button at Meliau', !(await p.$('[data-quick="DF"]')) && !!(await p.$('[data-quick="HA"]')) && !!(await p.$('[data-quick="CPS"]')));
  await p.click('[data-quick="HA"]'); await p.waitForTimeout(250);
  const bo = await p.$$eval('#jb-block option', o => o.map(x => x.value).filter(Boolean));
  check('the block list is Meliau\'s six', bo.join() === '01,02,03,04,05,06', bo.join());
  await p.selectOption('#jb-block', '06'); await p.waitForTimeout(250);
  const l6 = await p.$$eval('#jb-lots .pick[data-lot]', a => a.map(x => x.dataset.lot));
  check('Block 06 offers its one lot', l6.join() === '6-1', l6.join());
  await p.evaluate(() => EA.ui.closeSheet && EA.ui.closeSheet());
  for (const h of ['field-harvest/work', 'field-harvest/collect', 'field-harvest/close', 'field-harvest/history']) { await goRoom(p, h); }
  check('Kerja, Ramp, Tutup hari and Rekod open for Meliau with no errors', s.errs.length === 0, s.errs.join(' | '));

  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  await p.evaluate(() => EA.homePane('lists')); await p.waitForTimeout(300);
  check('Senarai at Meliau shows the lot map and the holidays', await p.locator('[data-ref="map"]').count() === 1 && await p.locator('[data-ref="hol"]').count() === 1);
  await p.click('[data-ref="map"]'); await p.waitForTimeout(400);
  const mt = await p.innerText('#sheet');
  check('the lot map opens and shows 280.66 Ha', /280[.,]66/.test(mt) && s.errs.length === 0, mt.replace(/\n+/g, ' | ').slice(0, 200) + ' ' + s.errs.join(' | '));
  // 19 Nov 2026: the six block outlines from the 2022 drone map are in, so every block draws, none says "no map yet".
  const maps = await p.locator('#sheet svg.pg-map').count(), none = /Belum ada peta|No map for this block/.test(mt);
  check('every Meliau block draws its outline (six maps, no "no map yet")', maps === 6 && !none, maps + ' maps');
  const wide = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  check('nothing wider than the phone', wide[0] <= wide[1] + 1, wide.join(' '));
  await s.cx.close();
  await b.close();
})();
