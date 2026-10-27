// E-Book test (1.43). TUTUP HARI (day close), room DCL — phone side.
// - A past day with a chit but no work: the close button is off; check 1 and 4 are red and open the Kerja screen.
// - With the work keyed and one job BELUM SIAP with a reason: checks pass; rain "during work" with reason HENTI and
//   ½ day lost is accepted when a job fell short; a rain reason that does not fit the timing is refused.
// - TUTUP HARI saves one FH_DAYCLOSE row (kind close, rain kept) and the day leaves the open list.
// - Rain noted when no job fell short is not recorded (the row carries no rain).
// - Night rain allows only "tanah / jalan basah".
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
  const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const yd = D(1);
  await p.evaluate((yd) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'H1', name: 'Hendra B. Muhammad', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'H2', name: 'Musrim B. Jakat', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'S1', name: 'Rosli B. Ali', estate: 'SSGT', gang: 'Racun · Spray', sex: 'M' },
      { id: 'D1', name: 'Aco Hendrah', estate: 'SSGT', gang: 'Ladang durian · Durian farm', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.dayclose.office.SSGT', JSON.stringify({ at: Date.now(), from: '2020-01-01', days: [] }));
    // yesterday's chit: 2 harvesters H, 1 sprayer H, 1 durian worker H (work in the DMS), 1 absent
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', confirmedAt: '06:10', rev: 1, keyedBy: 'STF-SSGT-01',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-13', '1-14'] }, { key: 'j2', task: 'CPS', block: '02', lots: ['2-1', '2-2'] }, { key: 'j3', task: 'DF', block: 'DR', lots: ['DR-A'] }],
      rows: [{ id: 'm1', worker_id: 'H1', muster: 'H', task_code: 'HA', block: '01', lots: '1-13' }, { id: 'm2', worker_id: 'H2', muster: 'H', task_code: 'HA', block: '01', lots: '1-14' },
             { id: 'm3', worker_id: 'S1', muster: 'H', task_code: 'CPS', block: '02', lots: '2-1 2-2' }, { id: 'm4', worker_id: 'D1', muster: 'H', task_code: 'DF', block: 'DR', lots: 'DR-A' }] }]));
  }, yd);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForSelector('#dc-close');
  let txt = await p.innerText('#room');
  check('no work keyed: TUTUP HARI is off; checks 1 and 4 are red', await p.$eval('#dc-close', b => b.disabled) && /Kerja harian belum dikunci/.test(txt) && /belum dijawab/.test(txt), txt.slice(0, 200));
  check('a red line opens the Kerja screen', await p.$eval('.dc-bad .dc-go', b => b.dataset.go) === '#field-harvest/work');
  // key the work: harvesters 120 + 110 bunches, CPS not done (rain), durian worker has no line (counts as complete)
  await p.evaluate((yd) => {
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: {}, rec: { chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', at: '17:00',
      lines: [{ id: 'w1', worker_id: 'H1', task_code: 'HA', block: '01', lot: '1-13', qty: '', unit: 'bunch', bunches: '120' }, { id: 'w2', worker_id: 'H2', task_code: 'HA', block: '01', lot: '1-14', qty: '', unit: 'bunch', bunches: '110' },
              { id: 'w3', worker_id: 'S1', task_code: 'CPS', block: '02', lot: '2-1', qty: '1.5', unit: 'Ha', bunches: '' }],
      jobs: [{ id: 'j1', key: 'j1', task_code: 'HA', block: '01', lots: '1-13 1-14', workers: 2, bunches: '230', status: 'done', reason: '' },
             { id: 'j2', key: 'j2', task_code: 'CPS', block: '02', lots: '2-1 2-2', workers: 1, qty: '1.5', unit: 'Ha', status: 'not_done', reason: '2-2 Hujan (kerja berhenti, ½ hari) · sambung esok' }] },
      prog: { j2: { '2-1': '100', '2-2': '0' } }, lotwhy: { j2: { '2-2': { why: 'rain', rain: 'HENTI', lost: 0.5, until: yd } } } }]));
    // the tractor took the fruit to the ramp; one lorry with a DN
    localStorage.setItem('fh.collect', JSON.stringify([{ date: yd, estate: 'SSGT', at: '15:00', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: 'Y' }, { block: '01', lot: '1-14', bunches: 110, cleared: 'Y' }], dispatch: { trip: 'LR-1', dn: '8524', lorry: 'SA1', mill: 'BOU', bunches: 230 }, ids: [] }]));
  }, yd);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForSelector('#dc-close'); await p.waitForTimeout(200);
  txt = await p.innerText('#room');
  check('work keyed: 4 working (durian worker counts, no line needed), 230 bunches at the ramp, 1 lorry with DN, 1/2 jobs done · button on', !(await p.$eval('#dc-close', b => b.disabled)) && /4 orang bekerja, 0 tidak hadir/.test(txt) && /230 tandan dituai · semua ke ramp/.test(txt) && /1 lori keluar, semua ada DN/.test(txt) && /1\/2 kerja siap/.test(txt), txt.slice(0, 400));
  check('rain read from the lot in Kerja: kerja berhenti · ½ hari · CPS (1 lot); no rain questions on the screen', /kerja berhenti · ½ hari · Circle Spraying \(1 petak\)/.test(txt) && !(await p.$('[data-when]')), txt.slice(0, 500));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v53-dayclose.png' });
  await p.click('#dc-close'); await p.waitForTimeout(400);
  const dc = posted.filter(x => x.tab === 'FH_DAYCLOSE');
  check('TUTUP HARI: one FH_DAYCLOSE row, kind close, rain kept (from the lot), 4 present', dc.length === 1 && dc[0].row.kind === 'close' && dc[0].row.rain_reason === 'HENTI' && dc[0].row.rain_when === 'work' && dc[0].row.rain_lost === '0.5' && dc[0].row.rain_jobs === 'CPS' && dc[0].row.present === '4' && dc[0].row.bunches === '230' && dc[0].row.jobs_done === '1', JSON.stringify(dc[0] && dc[0].row).slice(0, 300));
  const sheet = await p.innerText('#sheet-back').catch(() => '');
  check('day summary for WhatsApp shows bunches, jobs, rain and catch-up', /TUTUP HARI SPLT SSGT/.test(sheet) && /230 tandan/.test(sheet) && /Kerja: 1\/2 siap/.test(sheet) && /Hujan: Hujan — kerja berhenti/.test(sheet) && /baki kerja/.test(sheet), sheet.slice(0, 300));
  await p.click('#ds-back'); await p.waitForTimeout(200);
  txt = await p.innerText('#room');
  check('after the close the day leaves the open list', /Semua hari sudah ditutup/.test(txt) && /Hari ditutup/.test(txt), txt.slice(0, 200));
  // No lot stopped by rain: the close row carries no rain
  await p.evaluate((yd) => {
    localStorage.setItem('fh.dayclose', '[]'); localStorage.removeItem('fh.daydraft');
    const w = JSON.parse(localStorage.getItem('fh.work')); w[0].rec.jobs[1].status = 'done'; w[0].rec.jobs[1].reason = ''; w[0].prog = { j2: { '2-1': '100', '2-2': '100' } }; w[0].lotwhy = {}; localStorage.setItem('fh.work', JSON.stringify(w));
  }, yd);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForSelector('#dc-close'); await p.waitForTimeout(200);
  txt = await p.innerText('#room');
  check('no lot stopped by rain: "Tiada petak terhenti kerana hujan", close allowed', /Tiada petak terhenti kerana hujan/.test(txt) && !(await p.$eval('#dc-close', b => b.disabled)), txt.slice(0, 300));
  await p.click('#dc-close'); await p.waitForTimeout(400);
  const q2 = posted.filter(x => x.tab === 'FH_DAYCLOSE');
  check('the second close row carries no rain', q2.length === 2 && q2[1].row.rain_when === '' && q2[1].row.rain_reason === '', JSON.stringify(q2[1] && q2[1].row).slice(0, 200));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
