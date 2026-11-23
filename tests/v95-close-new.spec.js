// E-Book test (1.88). The new TUTUP HARI and the rain at the morning chit.
// Brief_Tutup_Hari_Baru, signed by Yu Chen on 23 Nov 2026 ("yes check , sign"): "i found that the closing day is too
// complicated", "the rain also make confuse. why no we do it the same time ?". Below:
// - only what is missing is shown, each line with its own fix buttons; the checks that passed fold under one line;
// - TIDAK HADIR… marks a listed man who is on no chit (T / S / C) as a correction of that day's chit, on the spot;
// - SEMUA KE RAMP puts the day's lots to the ramp (FH_COLLECT, collected and cleared) and the line turns green;
// - TINGGAL DI LADANG… asks the reason, which goes with the close row;
// - complete: one green line, three figures, the day named on the button; after it "<day> ditutup", RANCANG ESOK, SELESAI;
// - no rain card, no rain check and no note box on the close; the home step reads "Hujan semalam".
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
  // a working day: on a Sunday nobody is expected on the chit, so take Saturday when yesterday was a Sunday
  const yd = new Date(D(1) + 'T00:00:00').getDay() === 0 ? D(2) : D(1);
  await p.evaluate((yd) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'H1', name: 'Ahmad Bin Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'H2', name: 'Bakar Bin Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'S1', name: 'Chandra Bin Contoh', estate: 'SSGT', gang: 'Racun · Spray', sex: 'M' },
      { id: 'D1', name: 'Daud Bin Contoh', estate: 'SSGT', gang: 'Ladang durian · Durian farm', sex: 'M' },
      { id: 'W9', name: 'Wahid Bin Contoh', estate: 'SSGT', gang: 'Am · General', sex: 'M' }]));
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
  const td = D(0);
  const open = async () => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForSelector('#dc-close'); await p.waitForTimeout(200); };
  const room = () => p.innerText('#room');
  // the day: work keyed, 230 cut, only 180 collected this morning; W9 is on the estate list and on no chit
  await p.evaluate(([yd, td, w]) => { eval(w)(yd);
    localStorage.setItem('fh.collect', JSON.stringify([{ date: td, estate: 'SSGT', at: '07:30', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: '' }, { block: '01', lot: '1-14', bunches: 60, cleared: '' }] }]));
  }, [yd, td, '(' + work.toString() + ')']);
  await open();
  let txt = await room();
  const missing = await p.$$eval('.dc-miss .dc-it.dc-bad', ls => ls.map(l => l.innerText.replace(/\s+/g, ' ')));
  check('only what is missing is shown: the man not on the chit, and 50 bunches in the field', missing.length === 2 && /1 orang dalam senarai tiada dalam chit/.test(missing[0]) && /50 tandan dituai belum ke ramp/.test(missing[1]), missing.join(' | '));
  check('the passed checks fold under one line, not shown', /Lihat \d+ semakan yang lulus/.test(txt) && !/semua ada kerja|kerja siap/.test(txt), txt.slice(0, 300));
  check('no rain card, no rain line, no note box on the close', !(await p.$('#dc-rainq')) && !(await p.$('#dc-note')) && !/Hujan (hari|siang)/.test(txt));
  check('the button names the day and is off while something is missing', await p.$eval('#dc-close', b => b.disabled) && /^TUTUP HARI \S+ \d+ \S+$/.test((await p.innerText('#dc-close')).trim()), await p.innerText('#dc-close'));
  check('one open day: no day row', await p.locator('.dc-day').count() === 0);
  const fx = await p.$$eval('.dc-miss .dc-it.dc-bad', ls => ls.map(l => [...l.querySelectorAll('[data-fix]')].map(b => b.innerText.trim()).join('+')));
  check('fix buttons: TIDAK HADIR… + BETULKAN CHIT; SEMUA KE RAMP + TINGGAL DI LADANG…', fx[0] === 'TIDAK HADIR…+BETULKAN CHIT' && fx[1] === 'SEMUA KE RAMP+TINGGAL DI LADANG…', fx.join(' | '));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v95-close-missing.png', fullPage: true });

  // TIDAK HADIR…: W9 marked T on the spot, the chit corrected (one new version), the line goes
  await p.click('.dc-bad [data-fix="1|0"]'); await p.waitForSelector('#aw-ok');
  check('TIDAK HADIR… lists the man by name with T / S / C', /Wahid Bin Contoh/.test(await p.innerText('#sheet')) && await p.locator('[data-mw="W9"]').count() === 3);
  await p.click('[data-mw="W9"][data-mk="T"]'); await p.click('#aw-ok'); await p.waitForTimeout(500);
  const chitAfter = await p.evaluate((yd) => { const c = JSON.parse(localStorage.getItem('fh.chits2')).filter(x => x.date === yd).sort((a, b) => (a.rev || 0) - (b.rev || 0)).pop(); return c ? { rev: c.rev, w9: (c.rows || []).find(r => r.worker_id === 'W9') } : null; }, yd);
  check('the chit now carries W9 as T (a correction: the old chit stays)', chitAfter && chitAfter.w9 && chitAfter.w9.muster === 'T', JSON.stringify(chitAfter));
  txt = await room();
  check('and the people line is gone from the missing list', !/tiada dalam chit/.test(await p.innerText('.dc-miss').catch(() => '')), txt.slice(0, 200));

  // SEMUA KE RAMP: the lot with 50 left goes to the ramp, collected and cleared, and the line turns green
  const before = posted.length;
  await p.click('.dc-bad [data-fix="2|0"]'); await p.waitForSelector('#rp-ok');
  check('SEMUA KE RAMP shows the lot and the bunches before it saves', /Petak 1-14/.test(await p.innerText('#sheet')) && /50 tandan/.test(await p.innerText('#sheet')), (await p.innerText('#sheet')).slice(0, 200));
  await p.click('#rp-ok'); await p.waitForTimeout(800);
  const col = posted.slice(before).filter(x => x.tab === 'FH_COLLECT');
  check('one FH_COLLECT row: lot 1-14, 50 bunches, cleared Y', col.length === 1 && col[0].row.lot === '1-14' && col[0].row.bunches === '50' && col[0].row.cleared === 'Y', JSON.stringify(col.map(x => x.row)).slice(0, 200));
  await p.waitForSelector('.dc-done');
  txt = await room();
  check('all complete: green line, the three figures, the button on', /Semua lengkap untuk/.test(txt) && /4\s*orang/.test(txt) && /230\s*tandan/.test(txt) && /0\s*lori/.test(txt) && !(await p.$eval('#dc-close', b => b.disabled)), txt.slice(0, 300));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v95-close-done.png', fullPage: true });

  // TINGGAL DI LADANG… instead (a fresh harvest left in the field): the reason is asked and goes with the close
  await p.evaluate(([td]) => { localStorage.setItem('fh.collect', JSON.stringify([{ date: td, estate: 'SSGT', at: '07:30', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: '' }] }])); }, [td]);
  await open();
  check('110 left in the field: the line is back', /110 tandan dituai belum ke ramp/.test(await p.innerText('.dc-miss')));
  await p.click('.dc-bad [data-fix="2|1"]'); await p.waitForSelector('#lv-ok');
  await p.fill('#lv-why', 'abc'); await p.click('#lv-ok'); await p.waitForTimeout(150);
  check('a reason shorter than 5 letters is refused', !!(await p.$('#lv-ok')));
  await p.click('[data-lw="0"]'); await p.click('#lv-ok'); await p.waitForTimeout(300);
  txt = await room();
  check('with the reason, the day is complete', /Semua lengkap untuk/.test(txt));
  await p.click('#dc-close'); await p.waitForTimeout(600);
  const dc = posted.filter(x => x.tab === 'FH_DAYCLOSE');
  check('one close row: the reason in its note, no gauge reading', dc.length === 1 && /Traktor rosak/.test(dc[0].row.note) && dc[0].row.rain_mm === '' && dc[0].row.rain_time === '', JSON.stringify(dc[0] && dc[0].row).slice(0, 300));
  const sh = await p.innerText('#sheet').catch(() => '');
  check('after the press: "<day> ditutup", the figures, RANCANG and SELESAI', /ditutup/.test(sh) && /230\s*tandan/.test(sh) && !!(await p.$('[data-esok]')) && !!(await p.$('#ds-done')), sh.slice(0, 200));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v95-after.png' });
  await p.click('#ds-done'); await p.waitForTimeout(200);
  check('SELESAI closes the sheet; the day has left the open list', /Semua hari sudah ditutup/.test(await room()));

  // the home step
  const steps = await p.evaluate(() => EA.todaySteps(EA.currentUser(), 'SSGT').map(s => s.bm).join(' | '));
  check('home: the first step is "Hujan semalam"', /^Hujan semalam/.test(steps), steps);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
