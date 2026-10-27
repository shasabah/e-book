// E-Book test (1.45). TUTUP HARI at the end of a save (Yu Chen, 27 Oct): no separate daily step.
// - Kerja's report sheet (VIEW REPORT) carries "Semua lengkap. Tutup hari …?" with YA, TUTUP / NANTI when the day is complete;
//   YA closes it (one FH_DAYCLOSE row) and shows the day summary.
// - When something is missing (a lorry without DN) the sheet lists it softly with a button to the Ramp screen, no YA.
// - After a Ramp save the close is offered only when the day is complete.
// - Next morning's chit: a complete day gone by is closed by the app ("ditutup oleh app"); an incomplete one shows a band.
// - Kerja: a lot BELUM SIAP · Hujan shows the rain kinds of the job's group (CPS group A: 4 kinds) and ¼–1 day.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function seed(date, dn) {
  const chit = { chit: 'CH-' + date, date: date, estate: 'SSGT', confirmedAt: '06:10', rev: 1, keyedBy: 'STF-SSGT-01',
    jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-13'] }, { key: 'j2', task: 'CPS', block: '02', lots: ['2-1', '2-2'] }],
    rows: [{ id: 'm1', worker_id: 'H1', muster: 'H', task_code: 'HA', block: '01', lots: '1-13' }, { id: 'm3', worker_id: 'S1', muster: 'H', task_code: 'CPS', block: '02', lots: '2-1 2-2' }] };
  const work = { chit: chit.chit, date: date, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: { j1: { done: 'Y', reason: '' }, j2: { done: 'Y', reason: '' } }, prog: { j2: { '2-1': '100', '2-2': '100' } }, lotwhy: {},
    rec: { chit: chit.chit, date: date, estate: 'SSGT', at: '17:00', keyedName: 'Staf',
      lines: [{ id: 'w1-' + date, worker_id: 'H1', task_code: 'HA', block: '01', lot: '1-13', qty: '', unit: 'bunch', bunches: '120' }, { id: 'w3-' + date, worker_id: 'S1', task_code: 'CPS', block: '02', lot: '2-1 2-2', qty: '3.0', unit: 'Ha', bunches: '' }],
      jobs: [{ id: 'j1-' + date, key: 'j1', task_code: 'HA', block: '01', lots: '1-13', workers: 1, bunches: '120', status: 'done', reason: '' },
             { id: 'j2-' + date, key: 'j2', task_code: 'CPS', block: '02', lots: '2-1 2-2', workers: 1, qty: '3.0', unit: 'Ha', status: 'done', reason: '' }] } };
  const col = { date: date, estate: 'SSGT', at: '15:00', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: 'Y' }], dispatch: { trip: 'LR-' + date, dn: dn, lorry: 'SA1', mill: 'BOU', bunches: 120 }, ids: [] };
  return { chit, work, col };
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], posted = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'dayclose') o = { ok: true, estate: 'SSGT', from: '2020-01-01', days: [] };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else if (bd.action === 'saveBatch') { bd.items.forEach(it => posted.push(it)); o = { ok: true, results: bd.items.map(it => ({ id: it.row.id, ok: true })), sw }; }
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  const today = D(0), yd = D(1), d2 = D(2);
  const T = seed(today, '8524'), Y = seed(yd, ''), Z = seed(d2, '8510');
  await p.evaluate(({ T, Y, Z }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([{ id: 'H1', name: 'Hendra B. Muhammad', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }, { id: 'S1', name: 'Rosli B. Ali', estate: 'SSGT', gang: 'Racun · Spray', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.dayclose.office.SSGT', JSON.stringify({ at: Date.now(), from: '2020-01-01', days: [] }));
    localStorage.setItem('fh.chits2', JSON.stringify([T.chit]));
    localStorage.setItem('fh.work', JSON.stringify([T.work]));
    localStorage.setItem('fh.collect', JSON.stringify([T.col]));
  }, { T, Y, Z });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  // 1 · Kerja report sheet: complete day → YA, TUTUP
  await p.evaluate(() => { localStorage.setItem('fh.workchit', JSON.stringify('CH-' + new Date().toISOString().slice(0, 10))); location.hash = 'field-harvest/work'; }); await p.waitForTimeout(700);
  await p.click('#wk-view'); await p.waitForTimeout(300);
  let sheet = await p.innerText('#sheet');
  check('Kerja report: "Semua lengkap. Tutup hari …?" with YA, TUTUP and NANTI', /Semua lengkap\. Tutup hari/.test(sheet) && !!(await p.$('#dc-yes')) && !!(await p.$('#dc-later')), sheet.slice(0, 300));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v55-ask.png' });
  await p.click('#dc-later'); await p.waitForTimeout(150);
  check('NANTI hides the question, the report stays', !(await p.$('#dc-ask')) && /KERJA HARIAN|Laporan petang/.test(await p.innerText('#sheet')));
  await p.click('#rp-close'); await p.waitForTimeout(150);
  await p.click('#wk-view'); await p.waitForTimeout(300); await p.click('#dc-yes'); await p.waitForTimeout(500);
  let dc = posted.filter(x => x.tab === 'FH_DAYCLOSE');
  sheet = await p.innerText('#sheet').catch(() => '');
  check('YA, TUTUP: one close row for today and the day summary', dc.length === 1 && dc[0].row.date === today && dc[0].row.kind === 'close' && /TUTUP HARI SPLT SSGT/.test(sheet), JSON.stringify(dc.map(x => x.row.date)) + ' ' + sheet.slice(0, 80));
  await p.click('#ds-back').catch(() => {}); await p.waitForTimeout(150);
  await p.click('#wk-view'); await p.waitForTimeout(300);
  check('a closed day: the report no longer asks', !(await p.$('#dc-ask')));
  await p.click('#rp-close'); await p.waitForTimeout(150);
  // 2 · missing: yesterday's lorry has no DN → soft list, button to Ramp, no YA
  await p.evaluate(({ Y }) => {
    localStorage.setItem('fh.chits2', JSON.stringify(JSON.parse(localStorage.getItem('fh.chits2')).concat([Y.chit])));
    localStorage.setItem('fh.work', JSON.stringify(JSON.parse(localStorage.getItem('fh.work')).concat([Y.work])));
    localStorage.setItem('fh.collect', JSON.stringify(JSON.parse(localStorage.getItem('fh.collect')).concat([Y.col])));
  }, { Y });
  const miss = await p.evaluate((yd) => { const cb = EA.fh.closeBlock('SSGT', EA.currentUser(), yd); return cb ? { state: cb.state, html: cb.html } : null; }, yd);
  check('incomplete day: state "missing", lists the lorry without DN, button to Ramp, no YA', miss && miss.state === 'missing' && /lori tiada nota hantar/.test(miss.html) && /#field-harvest\/collect/.test(miss.html) && !/dc-yes/.test(miss.html), JSON.stringify(miss).slice(0, 200));
  const offered = await p.evaluate((yd) => EA.fh.offerClose('SSGT', EA.currentUser(), yd), yd);
  check('after a Ramp save an incomplete day is not offered', offered === false);
  // 3 · next morning: the day before yesterday is complete → closed by the app; yesterday incomplete → band on the chit
  await p.evaluate(({ Z }) => {
    localStorage.setItem('fh.chits2', JSON.stringify(JSON.parse(localStorage.getItem('fh.chits2')).concat([Z.chit])));
    localStorage.setItem('fh.work', JSON.stringify(JSON.parse(localStorage.getItem('fh.work')).concat([Z.work])));
    localStorage.setItem('fh.collect', JSON.stringify(JSON.parse(localStorage.getItem('fh.collect')).concat([Z.col])));
  }, { Z });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(800);
  dc = posted.filter(x => x.tab === 'FH_DAYCLOSE');
  const auto = dc.find(x => x.row.date === d2);
  const room = await p.innerText('#room');
  check('chit screen: a complete day gone by is closed by the app', !!auto && /Ditutup oleh app/.test(auto.row.note), JSON.stringify(dc.map(x => x.row.date + ':' + x.row.note)).slice(0, 300));
  check('chit screen: the incomplete day shows "belum lengkap" with the missing lorry DN', /belum lengkap/.test(room) && /lori tiada nota hantar/.test(room) && !dc.some(x => x.row.date === yd), room.slice(0, 300));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v55-morning.png' });
  // 4 · the lorry gets its DN on Ramp → the close is offered
  await p.evaluate(({ yd }) => { const c = JSON.parse(localStorage.getItem('fh.collect')); c.forEach(x => { if (x.date === yd) x.dispatch.dn = '8530'; }); localStorage.setItem('fh.collect', JSON.stringify(c)); }, { yd });
  const offered2 = await p.evaluate((yd) => EA.fh.offerClose('SSGT', EA.currentUser(), yd), yd);
  check('once complete, the close is offered (sheet with YA, TUTUP)', offered2 === true && !!(await p.$('#dc-yes')));
  await p.evaluate(() => EA.ui.closeSheet());
  // 5 · Kerja: lot BELUM SIAP · Hujan offers the rain kinds of the job's group and ¼–1 day
  const kinds = await p.evaluate(() => (EA.lists.rainReasons || []).filter(r => r.groups.indexOf(EA.lists.rainOf('CPS')) >= 0).map(r => r.code).join(',') + ' | ' +
    (EA.lists.rainReasons || []).filter(r => r.groups.indexOf(EA.lists.rainOf('MAN')) >= 0).map(r => r.code).join(','));
  check('CPS (group A) has 4 rain kinds incl. drizzle; MAN (group B) has 3, no drizzle', kinds === 'LEWAT,HENTI,GERIMIS,BASAH | LEWAT,HENTI,BASAH', kinds);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
