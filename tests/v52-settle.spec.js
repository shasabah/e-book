// E-Book test (1.42): a lot left BELUM SIAP by rain keeps who worked it (0 Ha); the day it is finished its Ha is
// shared over every person-day in the last 14 days, and the earlier 0 Ha lines are corrected on their own day.
// Made-up workers only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const ago = n => { const x = new Date(Date.now() - n * 864e5); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', at: ago(0) + ' 07:00', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(({ d0, d1, d20 }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([['S1', 'Penyembur Satu'], ['S2', 'Penyembur Dua'], ['S3', 'Penyembur Tiga']].map(x => ({ id: x[0], name: x[1], estate: 'SSGT', gang: 'Am · General', sex: 'M' }))));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    const row = (id, w) => ({ id, worker_id: w, muster: 'H', task_code: 'CPS', block: '03', lots: '3-31', mandor: '' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-T', date: d0, estate: 'SSGT', rev: 1, confirmedAt: '06:10', chitRowId: 'C1', alerts: [],
      jobs: [{ key: 'j1', task: 'CPS', block: '03', lots: ['3-31'], mandor: '' }], rows: [row('R1', 'S1'), row('R2', 'S2'), row('R3', 'S3')] }]));
    // Yesterday: rain, S1 and S2 on 3-31, not finished (0 Ha). 20 days ago: an old unfinished line (too old to count).
    const rec = (chit, date, lines) => ({ chit, date, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: {}, rec: { chit, date, estate: 'SSGT', at: '17:00', lines, jobs: [] } });
    localStorage.setItem('fh.work', JSON.stringify([
      rec('MC-Y', d1, [{ id: 'WY1', worker_id: 'S1', task_code: 'CPS', block: '03', lot: '3-31', qty: '0', unit: 'Ha', bunches: '' }, { id: 'WY2', worker_id: 'S2', task_code: 'CPS', block: '03', lot: '3-31', qty: '0', unit: 'Ha', bunches: '' }]),
      rec('MC-OLD', d20, [{ id: 'WO1', worker_id: 'S3', task_code: 'CPS', block: '03', lot: '3-31', qty: '0', unit: 'Ha', bunches: '' }])]));
  }, { d0: ago(0), d1: ago(1), d20: ago(20) });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(900);
  // Today S1 and S2 finish it; S3 also helps (the rare case).
  await p.waitForTimeout(200);   // one lot: everyone starts on it
  const ha = await p.evaluate(() => EA.lists.lot('SSGT', '3-31').ha);
  const share = Math.round(ha / 5 * 1000) / 1000;
  const hint = await p.textContent('[data-settle="j1|3-31"]');
  check('the finished lot says it was not finished since yesterday: 2 person-days, Ha ÷ 5', /2 orang-hari/.test(hint) && /÷ 5 orang-hari/.test(hint), hint);
  const sh = await p.$$eval('[data-job="j1"] [data-share]', a => a.map(x => x.textContent).join(' '));
  check('today each person gets one share (Ha ÷ 5)', sh === [share, share, share].map(x => x + ' Ha').join(' '), sh + ' vs ' + share);
  await p.click('#wk-check'); await p.waitForSelector('#wc-ok'); await p.click('#wc-ok'); await p.waitForTimeout(500);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]'));
  const wk = q.filter(x => x.tab === 'FH_WORK').map(x => x.row);
  const y = wk.filter(r => r.replaces === 'WY1' || r.replaces === 'WY2');
  check('yesterday\'s two 0 Ha lines are corrected on their own day with one share each', y.length === 2 && y.every(r => r.date === ago(1) && r.chit === 'MC-Y' && Number(r.qty) === share && /Petak 3-31 siap/.test(r.note)), JSON.stringify(y.map(r => [r.date, r.qty, r.replaces, r.note])));
  check('the 20-day-old line is not touched', !wk.some(r => r.replaces === 'WO1'));
  const tot = wk.filter(r => r.task_code === 'CPS').reduce((a, r) => a + Number(r.qty), 0);
  check('the lot\'s Ha is counted once in total (today + yesterday)', Math.abs(tot - ha) < 0.01, tot + ' vs ' + ha);
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.work')).find(s => s.chit === 'MC-Y').rec.lines.map(l => l.qty + ':' + l.settledBy));
  check('the phone keeps yesterday as settled (not shared twice)', kept.every(x => x === share + ':MC-T'), JSON.stringify(kept));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
