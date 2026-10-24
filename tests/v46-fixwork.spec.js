// E-Book test (1.35) C2 · Betulkan kerja hari: after a past chit is fixed at the clerk's request, that day's
// work (Kerja) opens again for 3 days, starts from the fixed chit (MT → ITF), replaces the old lines (nothing
// added twice), never moves fruit to the ramp; and a past chit only offers lots cut on or before its day.
// Made-up workers only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const ago = n => { const x = new Date(Date.now() - n * 864e5); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const field = [{ lot: '1-24', block: '01', bunches: 50, since: ago(1) }, { lot: '1-27', block: '01', bunches: 90, since: ago(1) }, { lot: '1-13', block: '01', bunches: 4, since: ago(4) }];
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', at: ago(0) + ' 07:00', field, fieldTotal: 144, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(({ d2, d5 }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'H1', name: 'Penuai Contoh Satu', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }, { id: 'T1', name: 'Pemandu Contoh', estate: 'SSGT', gang: 'Pemandu · Driver', sex: 'M' },
      { id: 'L1', name: 'Pemuat Contoh', estate: 'SSGT', gang: 'Muat · Loading', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    const lots = ['1-24', '1-26'];
    // 2 days ago: the chit was fixed at the clerk's request (rev 3): the driver MT → ITF, the loader on LFF.
    const fixed = { chit: 'MC-FIX', date: d2, estate: 'SSGT', rev: 3, fixAsk: 'FX-1', confirmedAt: '06:20', chitRowId: 'C1', alerts: [],
      jobs: [{ key: 'j1', task: 'ITF', block: '01', lots, mandor: '' }, { key: 'j2', task: 'LFF', block: '01', lots, mandor: '' }],
      rows: [{ id: 'R1', worker_id: 'T1', muster: 'H', task_code: 'ITF', block: '01', lots: lots.join(' '), mandor: '' }, { id: 'R2', worker_id: 'L1', muster: 'H', task_code: 'LFF', block: '01', lots: lots.join(' '), mandor: '' }] };
    const plain = { chit: 'MC-OLD', date: d2, estate: 'SSGT', rev: 1, confirmedAt: '06:10', chitRowId: 'C2', alerts: [], jobs: [{ key: 'j1', task: 'CA', block: '', lots: [], mandor: '' }], rows: [{ id: 'R3', worker_id: 'H1', muster: 'H', task_code: 'CA', block: '', lots: '', mandor: '' }] };
    const tooOld = Object.assign({}, fixed, { chit: 'MC-5', date: d5, chitRowId: 'C5' });
    localStorage.setItem('fh.chits2', JSON.stringify([fixed, plain, tooOld]));
    const work = (chit, date) => ({ chit, date, estate: 'SSGT', rev: 1, chitRev: 1, checker: 'STF-SSGT-01', lines: { T1: [{ lot: '', qty: '1', bunches: '' }], L1: [{ lot: '', qty: '', bunches: '' }] }, status: { j1: { done: 'Y', reason: '' } }, prog: {}, manual: {}, bags: {},
      rec: { chit, date, estate: 'SSGT', at: '18:28', lines: [{ id: 'W1', worker_id: 'T1', task_code: 'MT', block: '', lot: '', qty: '1', unit: 'day', bunches: '' }, { id: 'W2', worker_id: 'L1', task_code: 'LFF', block: '01', lot: '', qty: '', unit: 'MT', bunches: '' }],
        jobs: [{ id: 'J1', key: 'j1', task_code: 'MT', block: '', lots: '', workers: 1, qty: '1', unit: 'day', bunches: '', status: 'done', reason: '' }] } });
    const w3 = work('MC-OLD', d2); w3.rec.lines = [{ id: 'W3', worker_id: 'H1', task_code: 'CA', block: '', lot: '', qty: '1', unit: 'day', bunches: '' }];
    localStorage.setItem('fh.work', JSON.stringify([work('MC-FIX', d2), w3, work('MC-5', d5)]));
  }, { d2: ago(2), d5: ago(5) });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(900);
  const opts = await p.$$eval('#wk-chit option', a => a.map(x => x.value + '|' + x.textContent));
  check('Kerja: the fixed past chit opens again, marked BETULKAN', opts.some(o => /^MC-FIX\|.*BETULKAN/.test(o)) || (await p.isVisible('#wk-fixband')), JSON.stringify(opts));
  check('Kerja: a past chit not fixed stays closed', !opts.some(o => /^MC-OLD/.test(o)), JSON.stringify(opts));
  check('Kerja: a fixed chit older than 3 days stays closed', !opts.some(o => /^MC-5/.test(o)), JSON.stringify(opts));
  if (await p.$('#wk-chit')) { await p.selectOption('#wk-chit', 'MC-FIX'); await p.waitForTimeout(500); }
  check('the yellow band says "Betulkan · <day>"', await p.isVisible('#wk-fixband') && /Betulkan · /.test(await p.innerText('#wk-fixband')));
  check('it tells the staff the chit changed and to CORRECT', await p.isVisible('#wk-chitfixed') && await p.isVisible('#wk-fix'));
  await p.click('#wk-fix'); await p.waitForTimeout(500);
  const on = await p.$$eval('[data-onelot][aria-pressed="true"]', a => a.map(x => x.w = x.dataset.onelot).join(' '));
  check('the driver starts from his new job (ITF, all its lots), not the old MT line', /1-24 1-26/.test(on), on);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v46-fixwork.png', fullPage: true });
  for (const k of ['j1', 'j2']) { const bt = p.locator('[data-st="' + k + '"][data-v="Y"]'); if (await bt.count()) await bt.click(); }
  await p.click('#wk-check'); await p.waitForTimeout(400);
  if (await p.isVisible('#wc-ok')) { await p.click('#wc-ok'); await p.waitForTimeout(500); }
  if (await p.isVisible('#rp-close')) { await p.click('#rp-close'); await p.waitForTimeout(300); }
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]'));
  const wk = q.filter(x => x.tab === 'FH_WORK').map(x => x.row);
  const itf = wk.filter(r => r.task_code === 'ITF'), mtGone = wk.find(r => r.replaces === 'W1');
  check('saved: one ITF line for the driver with the lots, on the chit\'s own day', itf.length === 1 && itf[0].lot === '1-24 1-26' && itf[0].date === ago(2), JSON.stringify(itf));
  check('the old MT line is replaced (kept on record, not added twice)', !!mtGone && wk.filter(r => r.worker_id === 'T1').length === 1 + (itf[0].replaces === 'W1' ? 0 : 1), JSON.stringify(wk.map(r => r.worker_id + ':' + r.task_code + ':' + r.status + ':' + r.replaces)));
  check('a fix of an older day never moves fruit to the ramp', q.filter(x => x.tab === 'FH_COLLECT').length === 0, String(q.filter(x => x.tab === 'FH_COLLECT').length));
  const sv = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.work')).find(s => s.chit === 'MC-FIX'));
  check('the saved work now matches the chit (no "chit changed" warning)', sv.chitRev === 3 && sv.rev === 2, sv.chitRev + '/' + sv.rev);
  // Rule 4: fixing a past chit only offers lots cut on or before that day.
  await p.evaluate(({ d2 }) => {
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: d2, estate: 'SSGT', fixAsk: { ref: 'FX-2', by: 'Kerani', note: 'traktor ITF' }, replacing: 'MC-FIX',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-24'], mandor: '' }], marks: { H1: 'H' }, jobOf: { H1: 'j1' }, rain_mm: '', rain_time: '', checker: '', nextJob: 2, alertNotes: {} } }));
  }, { d2: ago(2) });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForSelector('#fh-addjob'); await p.waitForTimeout(600);
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task'); await p.click('#jb-quick [data-quick="ITF"]'); await p.waitForTimeout(200);
  const ticked = await p.$$eval('#jb-lots .pick[aria-pressed="true"]', a => a.map(x => x.dataset.lot).sort().join(' '));
  check('past chit: the tractor gets that day\'s harvest lots and older crop, not lots cut later (1-27)', ticked === '1-13 1-24', ticked);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
