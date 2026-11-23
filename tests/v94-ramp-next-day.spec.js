// E-Book test (1.87). Check 2 of TUTUP HARI counts fruit collected on a LATER day.
// Yu Chen, 23 Nov 2026: "after this version hardly see ferzelly can close the day". Sugut cuts in the afternoon and
// collects the next morning; the check counted only same-day collections, so 15, 16, 19 and 20 Nov stayed red
// although every bunch was collected a day later. Below: yesterday's 230 bunches collected TODAY.
// (Header of v53, kept for the harness:)
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
      { id: 'H1', name: 'Ahmad Bin Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'H2', name: 'Bakar Bin Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'S1', name: 'Chandra Bin Contoh', estate: 'SSGT', gang: 'Racun · Spray', sex: 'M' },
      { id: 'D1', name: 'Daud Bin Contoh', estate: 'SSGT', gang: 'Ladang durian · Durian farm', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.dayclose.office.SSGT', JSON.stringify({ at: Date.now(), from: '2020-01-01', days: [] }));
    // yesterday's chit: 2 harvesters H, 1 sprayer H, 1 durian worker H (work in the DMS), 1 absent
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', confirmedAt: '06:10', rev: 1, keyedBy: 'STF-SSGT-01',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-13', '1-14'] }, { key: 'j2', task: 'CPS', block: '02', lots: ['2-1', '2-2'] }, { key: 'j3', task: 'DF', block: 'DR', lots: ['DR-A'] }],
      rows: [{ id: 'm1', worker_id: 'H1', muster: 'H', task_code: 'HA', block: '01', lots: '1-13' }, { id: 'm2', worker_id: 'H2', muster: 'H', task_code: 'HA', block: '01', lots: '1-14' },
             { id: 'm3', worker_id: 'S1', muster: 'H', task_code: 'CPS', block: '02', lots: '2-1 2-2' }, { id: 'm4', worker_id: 'D1', muster: 'H', task_code: 'DF', block: 'DR', lots: 'DR-A' }] }]));
  }, yd);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  const work = (yd) => {
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: {}, rec: { chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', at: '17:00',
      lines: [{ id: 'w1', worker_id: 'H1', task_code: 'HA', block: '01', lot: '1-13', qty: '', unit: 'bunch', bunches: '120' }, { id: 'w2', worker_id: 'H2', task_code: 'HA', block: '01', lot: '1-14', qty: '', unit: 'bunch', bunches: '110' },
              { id: 'w3', worker_id: 'S1', task_code: 'CPS', block: '02', lot: '2-1', qty: '1.5', unit: 'Ha', bunches: '' }, { id: 'w4', worker_id: 'D1', task_code: 'DF', block: 'DR', lot: 'DR-A', qty: '1', unit: 'day', bunches: '' }],
      jobs: [{ id: 'j1', key: 'j1', task_code: 'HA', block: '01', lots: '1-13 1-14', workers: 2, bunches: '230', status: 'done', reason: '' },
             { id: 'j2', key: 'j2', task_code: 'CPS', block: '02', lots: '2-1 2-2', workers: 1, qty: '1.5', unit: 'Ha', status: 'done', reason: '' }] }, prog: {}, lotwhy: {} }]));
  };
  const open = async () => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForSelector('#dc-close'); await p.waitForTimeout(150); return p.innerText('#room'); };
  const td = D(0);
  // 1 · all of yesterday's fruit collected this morning (a later day), lot by lot
  await p.evaluate(([yd, td, w]) => { eval(w)(yd);
    localStorage.setItem('fh.collect', JSON.stringify([{ date: td, estate: 'SSGT', at: '07:30', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: '' }, { block: '01', lot: '1-14', bunches: 110, cleared: '' }] }]));
  }, [yd, td, '(' + work.toString() + ')']);
  let txt = await open();
  check('cut yesterday, collected this morning: check 2 is green, "230 tandan dituai · semua ke ramp"', /230 tandan dituai · semua ke ramp/.test(txt) && !/belum ke ramp/.test(txt), (txt.match(/[^\n]*tandan[^\n]*/) || [''])[0]);
  // 2 · only part collected later: the rest still stops the close
  await p.evaluate(([td]) => { localStorage.setItem('fh.collect', JSON.stringify([{ date: td, estate: 'SSGT', at: '07:30', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: '' }, { block: '01', lot: '1-14', bunches: 60, cleared: '' }] }])); }, [td]);
  txt = await open();
  check('only 180 of 230 collected later: 50 still in the field, check 2 red', /50 tandan dituai belum ke ramp/.test(txt), (txt.match(/[^\n]*tandan[^\n]*/) || [''])[0]);
  // 3 · the second lot marked habis (cleared) with a lower count: counts as all collected
  await p.evaluate(([td]) => { localStorage.setItem('fh.collect', JSON.stringify([{ date: td, estate: 'SSGT', at: '07:30', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: '' }, { block: '01', lot: '1-14', bunches: 100, cleared: 'Y' }] }])); }, [td]);
  txt = await open();
  check('a lot marked habis counts as all collected', /230 tandan dituai · semua ke ramp/.test(txt), (txt.match(/[^\n]*tandan[^\n]*/) || [''])[0]);
  // 4 · a collection of ANOTHER lot, or one BEFORE the cut day, does not count
  await p.evaluate(([yd, d2]) => { localStorage.setItem('fh.collect', JSON.stringify([{ date: d2, estate: 'SSGT', at: '07:30', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: 'Y' }] }, { date: yd, estate: 'SSGT', at: '16:00', lines: [{ block: '01', lot: '1-20', bunches: 300, cleared: 'Y' }] }])); }, [yd, D(2)]);
  txt = await open();
  check('a collection of another lot, or from the day before the cut, does not count: 230 still in the field', /230 tandan dituai belum ke ramp/.test(txt), (txt.match(/[^\n]*tandan[^\n]*/) || [''])[0]);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
