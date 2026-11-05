// E-Book test (1.51). TUTUP HARI settles every worker's pay line (Yu Chen, 5 Nov 2026; Decisions Log 5 Nov).
// - A worker on the estate list but on no chit stops the close (check 1 red, opens the chit screen).
// - A durian farm worker saved the old way (pruning, 0 Ha) stops the close: the durian farm is paid by the day.
// - With ½ day for him: check 1 green with the checkroll letters (P, 1, ½, S, L, X), the pay card lists each job,
//   and the WhatsApp summary carries "Kod kerja: …".
// - Sunday is a rest day: workers not on the chit are not missing.
// - Kerja: a job on the durian block (RP on DR) is keyed as 1 / ½ day, not Ha.
// Rule 8: made-up workers only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
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
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  // the last weekday before today (never a Sunday), and the last Sunday before it
  const wd = new Date(); wd.setDate(wd.getDate() - 1); if (wd.getDay() === 0) wd.setDate(wd.getDate() - 1);
  const su = new Date(wd); while (su.getDay() !== 0) su.setDate(su.getDate() - 1);
  const yd = iso(wd), sun = iso(su);
  const people = [
    { id: 'W-SSGT-001', name: 'Ali Kassim', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
    { id: 'W-SSGT-002', name: 'Badu Sani', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
    { id: 'W-SSGT-003', name: 'Chong Wei', estate: 'SSGT', gang: 'Racun · Spray', sex: 'M' },
    { id: 'W-SSGT-004', name: 'Dani Musa', estate: 'SSGT', gang: 'Ladang durian · Durian farm', sex: 'M' },
    { id: 'W-SSGT-005', name: 'Eko Rahim', estate: 'SSGT', gang: 'Racun · Spray', sex: 'M' }];
  const chit = { chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', confirmedAt: '06:10', rev: 1, keyedBy: 'STF-SSGT-01',
    jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-13', '1-14'] }, { key: 'j2', task: 'CPS', block: '02', lots: ['2-1'] }, { key: 'j3', task: 'RP', block: 'DR', lots: ['A'] }],
    rows: [{ id: 'm1', worker_id: 'W-SSGT-001', muster: 'H', task_code: 'HA', block: '01', lots: '1-13' }, { id: 'm2', worker_id: 'W-SSGT-002', muster: 'H', task_code: 'HA', block: '01', lots: '1-14' },
           { id: 'm3', worker_id: 'W-SSGT-003', muster: 'H', task_code: 'CPS', block: '02', lots: '2-1' }, { id: 'm4', worker_id: 'W-SSGT-004', muster: 'H', task_code: 'RP', block: 'DR', lots: 'A' }] };
  const work = { chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: {}, rec: { chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', at: '17:00',
    lines: [{ id: 'w1', worker_id: 'W-SSGT-001', task_code: 'HA', block: '01', lot: '1-13', qty: '', unit: 'bunch', bunches: '120' },
            { id: 'w2', worker_id: 'W-SSGT-002', task_code: 'HA', block: '01', lot: '1-14', qty: '', unit: 'bunch', bunches: '110' },
            { id: 'w3', worker_id: 'W-SSGT-003', task_code: 'CPS', block: '02', lot: '2-1', qty: '1.44', unit: 'Ha', bunches: '' },
            { id: 'w4', worker_id: 'W-SSGT-004', task_code: 'RP', block: 'DR', lot: 'A', qty: '0', unit: 'Ha', bunches: '' }],
    jobs: [{ id: 'j1', key: 'j1', task_code: 'HA', block: '01', lots: '1-13 1-14', workers: 2, bunches: '230', status: 'done', reason: '' },
           { id: 'j2', key: 'j2', task_code: 'CPS', block: '02', lots: '2-1', workers: 1, qty: '1.44', unit: 'Ha', status: 'done', reason: '' },
           { id: 'j3', key: 'j3', task_code: 'RP', block: 'DR', lots: 'A', workers: 1, qty: '0', unit: 'Ha', status: 'done', reason: '' }] } };
  const collect = [{ date: yd, estate: 'SSGT', at: '15:00', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: 'Y' }, { block: '01', lot: '1-14', bunches: 110, cleared: 'Y' }] }];
  await p.evaluate(({ people, chit, work, collect }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify(people)); localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.dayclose.office.SSGT', JSON.stringify({ at: Date.now(), from: '2020-01-01', days: [] }));
    localStorage.setItem('fh.chits2', JSON.stringify([chit])); localStorage.setItem('fh.work', JSON.stringify([work])); localStorage.setItem('fh.collect', JSON.stringify(collect));
  }, { people, chit, work, collect });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  const go = async () => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForSelector('#dc-close'); await p.waitForTimeout(200); };
  await go();
  let txt = await p.innerText('#room');
  check('a worker on the list but on no chit stops the close', await p.$eval('#dc-close', x => x.disabled) && /1 orang dalam senarai tiada dalam chit/.test(txt) && /Eko Rahim/.test(txt), txt.slice(0, 300));
  check('that red line opens the chit screen', await p.$eval('.dc-bad .dc-go', x => x.dataset.go) === '#field-harvest');
  // Eko is marked absent (T) on the chit; the durian worker still has 0 Ha of pruning
  await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('fh.chits2')); c[0].rows.push({ id: 'm5', worker_id: 'W-SSGT-005', muster: 'T', task_code: '', block: '', lots: '' }); localStorage.setItem('fh.chits2', JSON.stringify(c)); });
  await go(); txt = await p.innerText('#room');
  check('durian worker saved as 0 Ha of pruning stops the close: the durian farm is by the day', await p.$eval('#dc-close', x => x.disabled) && /1 orang kerja harian tanpa 1 \/ ½ hari/.test(txt) && /Dani Musa/.test(txt), txt.slice(0, 300));
  // ½ day for him
  await p.evaluate(() => { const w = JSON.parse(localStorage.getItem('fh.work')); w[0].rec.lines[3].qty = '0.5'; w[0].rec.lines[3].unit = 'day'; localStorage.setItem('fh.work', JSON.stringify(w)); });
  await go(); txt = await p.innerText('#room');
  check('all pay lines: 5 people, letters P 3 · ½ 1 · X 1, close allowed', !(await p.$eval('#dc-close', x => x.disabled)) && /5 orang · semua ada kod kerja/.test(txt) && /P 3 · ½ 1 · X 1/.test(txt), txt.slice(0, 400));
  const card = await p.innerText('.dc-pay').catch(() => '');
  check('pay card: harvest 230 tandan (MT from the ticket), spray 1.44 Ha, durian 0.5 hari, Eko tidak hadir', /230 tandan/.test(card) && /MT ikut tiket/.test(card) && /1\.44 Ha/.test(card) && /0\.5 hari/.test(card) && /Eko Rahim · tidak hadir/.test(card), card.slice(0, 400));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v61-pay-lines.png', fullPage: true });
  await p.click('#dc-close'); await p.waitForTimeout(400);
  const sheet = await p.innerText('#sheet-back').catch(() => '');
  check('WhatsApp summary carries the pay letters', /Kod kerja: P 3 · ½ 1 · X 1/.test(sheet) && /Tidak hadir: Eko Rahim \(T\)/.test(sheet), sheet.slice(0, 300));
  check('one FH_DAYCLOSE row saved', posted.filter(x => x.tab === 'FH_DAYCLOSE').length === 1);
  // Sunday: only those who came are on the chit; nobody else is missing
  const sunTxt = await p.evaluate((sun) => {
    const c = { chit: 'CH-SSGT-P13-SUN', date: sun, estate: 'SSGT', rows: [{ id: 's1', worker_id: 'W-SSGT-004', muster: 'H', task_code: 'DF', block: 'DR', lots: 'A' }], jobs: [] };
    const ck = EA.fh.dayclose.checks('SSGT', c, {}); return ck[0].bm;
  }, sun);
  check('Sunday is a rest day: no one is missing from the list', !/tiada dalam chit/.test(sunTxt), sunTxt);
  // Kerja: RP on the durian block is keyed as a day (1 / ½), not Ha
  await p.evaluate((yd) => {
    localStorage.removeItem('fh.work'); localStorage.removeItem('fh.workdraft'); localStorage.setItem('fh.dayclose', '[]');
    const c = JSON.parse(localStorage.getItem('fh.chits2')); c[0].chit = 'CH-SSGT-P13-2'; localStorage.setItem('fh.chits2', JSON.stringify(c)); localStorage.setItem('fh.workchit', JSON.stringify('CH-SSGT-P13-2'));
  }, yd);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(900);
  const dr = await p.evaluate(() => {
    const btn = document.querySelector('[data-w="W-SSGT-004"][data-day="0.5"]');
    return { half: !!btn, ha: !!document.querySelector('input[data-w="W-SSGT-004"][data-f="qty"]') };
  });
  check('Kerja: pruning on the durian block shows 1 / ½ day, no Ha box', dr.half && !dr.ha, JSON.stringify(dr));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
