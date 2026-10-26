// E-Book test (1.41) F · Kerja seorang-seorang: maintenance per person like harvesting.
// CPS: each person taps his lots, a shared lot is split among those who tapped it; manuring: each person's bags
// and the dose; operator: hour meter start (from the machine's last end) and end; pruning per Ha.
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
  await p.evaluate(({ d0, d1 }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    const ppl = [['S1', 'Penyembur Satu'], ['S2', 'Penyembur Dua'], ['S3', 'Penyembur Tiga'], ['M1', 'Pembaja Satu'], ['M2', 'Pembaja Dua'], ['O1', 'Operator Contoh'], ['P1', 'Pencantas Contoh']]
      .map(x => ({ id: x[0], name: x[1], estate: 'SSGT', gang: 'Am · General', sex: 'M' }));
    localStorage.setItem('ea.people.SSGT', JSON.stringify(ppl)); localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    const row = (id, w, t, lots) => ({ id, worker_id: w, muster: 'H', task_code: t, block: '03', lots: lots.join(' '), mandor: '' });
    const chit = { chit: 'MC-PP', date: d0, estate: 'SSGT', rev: 1, confirmedAt: '06:10', chitRowId: 'C1', alerts: [],
      jobs: [{ key: 'j1', task: 'CPS', block: '03', lots: ['3-30', '3-31'], mandor: '' }, { key: 'j2', task: 'MAN', block: '03', lots: ['3-30', '3-31'], mandor: '' },
             { key: 'j3', task: 'OPR', block: '03', lots: ['3-30', 'BACKHOE'], mandor: '' }, { key: 'j4', task: 'RP', block: '03', lots: ['3-31'], mandor: '' }],
      rows: [row('R1', 'S1', 'CPS', ['3-30', '3-31']), row('R2', 'S2', 'CPS', ['3-30', '3-31']), row('R3', 'S3', 'CPS', ['3-30', '3-31']),
             row('R4', 'M1', 'MAN', ['3-30', '3-31']), row('R5', 'M2', 'MAN', ['3-30', '3-31']), row('R6', 'O1', 'OPR', ['3-30', 'BACKHOE']), row('R7', 'P1', 'RP', ['3-31'])] };
    localStorage.setItem('fh.chits2', JSON.stringify([chit]));
    // Yesterday the backhoe ended at 1200.0 hours.
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'MC-Y', date: d1, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: {},
      rec: { chit: 'MC-Y', date: d1, estate: 'SSGT', at: '17:00', lines: [{ id: 'WY', worker_id: 'O1', task_code: 'OPR', block: '03', lot: '3-20', qty: '1', unit: 'day', bunches: '', machine: 'BACKHOE', meter_start: '1192', meter_end: '1200' }], jobs: [] } }]));
  }, { d0: ago(0), d1: ago(1) });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(900);

  check('pruning RP is keyed in Ha now', /Ha/.test(await p.textContent('[data-job="j4"]')) && !/pokok/.test(await p.textContent('[data-job="j4"]')));
  check('CPS gang on 2 lots: nobody has lots yet (each taps his own)', (await p.locator('[data-job="j1"] [data-wholot][aria-pressed="true"]').count()) === 0);
  check('operator: start meter filled from the backhoe\'s last end (1200)', (await p.inputValue('[data-job="j3"] input[data-f="ms"]')) === '1200');

  // Save before tapping: the app asks for each person's lots, bags and dose, and the end meter.
  check('maintenance: no percentage buttons, each lot SIAP / BELUM SIAP (starts SIAP)', (await p.locator('[data-pv]').count()) === 0 && (await p.locator('[data-job="j1"] [data-lv="Y"][aria-pressed="true"]').count()) === 2);
  check('Ha jobs: no job-level SIAP buttons (the job follows its lots)', (await p.locator('[data-st="j1"]').count()) === 0);
  await p.click('[data-st="j3"][data-v="Y"]');
  check('a pressed SIAP is highlighted (green)', await p.$eval('[data-st="j3"][data-v="Y"]', e => getComputedStyle(e).backgroundColor) !== await p.$eval('[data-st="j3"][data-v="N"]', e => getComputedStyle(e).backgroundColor));
  await p.click('#wk-check'); await p.waitForTimeout(300);
  const nc = await p.textContent('.sheet, #sheet');
  check('not complete: CPS "tekan petak" for the 3 sprayers', /CPS|Racun|Circle/.test(nc) && /tekan petak untuk Penyembur Satu, Penyembur Dua, Penyembur Tiga/.test(nc), nc.slice(0, 300));
  check('not complete: manuring bags per person and the dose', /isi beg baja untuk Pembaja Satu, Pembaja Dua/.test(nc) && /isi dos baja/.test(nc));
  check('not complete: hour meter end', /meter jam mula dan tamat/.test(nc));
  await p.click('#wp-ok'); await p.waitForTimeout(200);

  // CPS: S1 and S2 on 3-30, S3 on 3-31.
  for (const [w, l] of [['S1', '3-30'], ['S2', '3-30'], ['S3', '3-31']]) { await p.click(`[data-wholot="j1|${w}|${l}"]`); await p.waitForTimeout(150); }
  const ha = await p.evaluate(() => [EA.lists.lot('SSGT', '3-30').ha, EA.lists.lot('SSGT', '3-31').ha]);
  const sh = await p.$$eval('[data-job="j1"] [data-share]', a => a.map(x => x.dataset.share + '=' + x.textContent));
  const r3 = x => Math.round(x * 1000) / 1000;
  check('CPS: 3-30 split between S1 and S2, 3-31 all S3', sh.join(' ') === `S1=${r3(ha[0] / 2)} Ha S2=${r3(ha[0] / 2)} Ha S3=${r3(ha[1])} Ha`, sh.join(' '));
  // Manuring: everyone on both lots; bags 12 and 9; dose 2.5.
  await p.click('[data-allwho="j2"]'); await p.waitForTimeout(150);
  await p.fill('[data-pbag="j2|M1"]', '12'); await p.fill('[data-pbag="j2|M2"]', '9'); await p.fill('[data-dose="j2"]', '2.5');
  check('manuring: gang bags = sum of persons (21)', /21 beg/.test(await p.textContent('[data-tot="j2"]')), await p.textContent('[data-tot="j2"]'));
  // Operator: end 1207.5 → 7.5 hours.
  await p.fill('[data-job="j3"] input[data-f="me"]', '1207.5'); await p.waitForTimeout(100);
  check('operator: 7.5 hours shown', /= 7\.5 jam/.test(await p.textContent('[data-job="j3"]')));
  // RP is one person on one lot: his lot starts chosen.
  check('pruning: one person on one lot starts with it', (await p.locator('[data-job="j4"] [data-wholot][aria-pressed="true"]').count()) === 1);
  // Rain: lot 3-31 of the pruning not finished → why and when it continues.
  await p.click('[data-lj="j4"][data-ll="3-31"][data-lv="N"]'); await p.waitForTimeout(150);
  await p.click('#wk-check'); await p.waitForTimeout(300);
  const nc2 = await p.textContent('.sheet, #sheet');
  check('not finished lot: asks why and when it continues', /3-31: pilih sebab belum siap/.test(nc2) && /3-31: isi bila kerja disambung/.test(nc2), nc2.slice(0, 300));
  await p.click('#wp-ok'); await p.waitForTimeout(200);
  await p.click('[data-lwhy="j4|3-31|rain"]'); await p.waitForTimeout(150);
  const tmr = await p.evaluate(() => { const d = new Date(Date.now() + 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  await p.fill('[data-lwuntil="j4|3-31"]', tmr); await p.waitForTimeout(150);
  check('the job shows BELUM SIAP with the lot\'s reason', /BELUM SIAP · 3-31 Hujan · sambung/.test(await p.textContent('[data-hastat="j4"]')), await p.textContent('[data-hastat="j4"]'));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v49-perperson.png', fullPage: true });
  await p.click('#wk-check'); await p.waitForSelector('#wc-ok');
  await p.click('#wc-ok'); await p.waitForTimeout(500);
  if (await p.isVisible('#rp-close')) { await p.click('#rp-close'); await p.waitForTimeout(200); }
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]'));
  const wk = q.filter(x => x.tab === 'FH_WORK').map(x => x.row), jd = q.filter(x => x.tab === 'FH_JOBDAY').map(x => x.row);
  const cps = wk.filter(r => r.task_code === 'CPS').map(r => r.worker_id + ':' + r.lot + ':' + r.qty).sort().join(' ');
  check('saved CPS lines: each person his own lot and Ha', cps === `S1:3-30:${r3(ha[0] / 2)} S2:3-30:${r3(ha[0] / 2)} S3:3-31:${r3(ha[1])}`, cps);
  const man = wk.filter(r => r.task_code === 'MAN');
  const bagsBy = {}; man.forEach(r => { bagsBy[r.worker_id] = (bagsBy[r.worker_id] || 0) + Number(r.bags || 0); });
  check('saved manuring: each person\'s bags once (on his first lot line)', bagsBy.M1 === 12 && bagsBy.M2 === 9 && man.filter(r => r.bags !== '').length === 2, JSON.stringify(man.map(r => r.worker_id + ':' + r.lot + ':' + r.bags)));
  const mj = jd.find(r => r.task_code === 'MAN');
  check('saved manuring job: gang bags 21 and dose 2.5', mj && mj.bags === '21' && mj.dose === '2.5', JSON.stringify(mj));
  const op = wk.find(r => r.task_code === 'OPR');
  check('saved operator: machine, meter 1200 → 1207.5, 7.5 hours, 1 day', op && op.machine === 'BACKHOE' && op.meter_start === '1200' && op.meter_end === '1207.5' && op.hours === '7.5' && op.qty === '1', JSON.stringify(op));
  const rp = wk.find(r => r.task_code === 'RP');
  check('saved pruning in Ha: the unfinished lot 0 Ha (who worked there kept)', rp && rp.unit === 'Ha' && rp.lot === '3-31' && Number(rp.qty) === 0, JSON.stringify(rp));
  const rj = jd.find(r => r.task_code === 'RP');
  check('saved pruning job: BELUM SIAP, reason rain and the continue date', rj && rj.job_status === 'not_done' && /3-31 Hujan · sambung/.test(rj.reason) && /belum siap/.test(rj.progress), JSON.stringify(rj && [rj.job_status, rj.reason, rj.progress]));
  const cj = jd.find(r => r.task_code === 'CPS');
  check('saved CPS job: SIAP by itself (every lot finished)', cj && cj.job_status === 'done' && cj.progress === '3-30 siap, 3-31 siap', JSON.stringify(cj && [cj.job_status, cj.progress]));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
