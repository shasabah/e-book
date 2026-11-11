// E-Book test (1.54). Yu Chen, 11 Nov 2026: a harvester under 80% of the day's target needs a reason before the
// work saves ("1 tandan" on rain days); the reason goes on his work line. The chit card and WhatsApp text show the
// fruit in the field with estimated tonnes and the day-after-harvest deadline. Made-up workers.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P07'));
    const n = new Date(); const d = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    const marks = {}, jobOf = {};
    EA.lists.testWorkers.forEach(w => { marks[w.id] = 'C'; });
    ['W-SSGT-001', 'W-SSGT-002'].forEach(w => { marks[w] = 'H'; jobOf[w] = 'j2'; });
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: d, estate: 'SSGT', marks, jobOf, rain_mm: '0', rain_time: '', checker: '', replacing: '', nextJob: 3, alertNotes: {},
      jobs: [{ key: 'j2', task: 'HA', block: '02', lots: [], mandor: '' }] } }));
  });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(400);
  await p.click('#fh-check'); await p.waitForSelector('#cf-ok'); await p.click('#cf-ok'); await p.waitForTimeout(400);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.click('.tabs a[href="#field-harvest/work"]'); await p.waitForTimeout(400);
  await p.fill('[data-job="j2"] input[data-w="W-SSGT-001"][data-f="bunches"]', '120');
  await p.fill('[data-job="j2"] input[data-w="W-SSGT-002"][data-f="bunches"]', '1');
  await p.click('[data-st="j2"][data-v="Y"]');
  await p.click('#wk-check'); await p.waitForSelector('#wc-ok');
  const sh = await p.innerText('#sheet');
  check('the harvester with 1 bunch is asked for a reason (target 79 bunches a day)', /Bawah 80% sasaran/.test(sh) && /: 1 \/ 79 tandan/.test(sh), sh.slice(0, 260));
  check('the harvester at 120 is not asked', (await p.$$('.wk-low')).length === 1);
  check('the sheet says: real bunches, never 1', /Jangan letak 1/.test(sh));
  check('SAVE is off until a reason is picked', await p.$eval('#wc-ok', x => x.disabled));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v69-low.png' });
  await p.click('#wc-ok', { force: true }).catch(() => {}); await p.waitForTimeout(200);
  check('nothing is saved without the reason', !(JSON.parse(await p.evaluate(() => localStorage.getItem('ea.queue') || '[]'))).some(x => x.tab === 'FH_WORK'));
  await p.click('.wk-low [data-why="0"]'); await p.waitForTimeout(100);
  check('with a reason SAVE is on', !(await p.$eval('#wc-ok', x => x.disabled)));
  await p.click('#wc-ok'); await p.waitForTimeout(400);
  const q = JSON.parse(await p.evaluate(() => localStorage.getItem('ea.queue') || '[]')).filter(x => x.tab === 'FH_WORK');
  const low = q.find(x => x.row.worker_id === 'W-SSGT-002'), ok = q.find(x => x.row.worker_id === 'W-SSGT-001');
  check('the reason is on his work line; the other line has none', low && /Bawah 80% sasaran: Hujan/.test(low.row.note) && ok && !ok.row.note, JSON.stringify([low && low.row.note, ok && ok.row.note]));

  // the chit: fruit in the field with tonnes and the deadline
  const r = await p.evaluate(() => {
    const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const bl = { estate: 'SSGT', field: [{ lot: '4-7', block: '04', bunches: 100, since: D(3) }, { lot: '4-8', block: '04', bunches: 50, since: D(1) }], fieldTotal: 150, ramp: { bunches: 0, blocks: [] } };
    return { lines: EA.fh.fieldLines('SSGT', bl), abw: EA.fh.abwNow('SSGT') };
  });
  check('tonnes use the estate\'s usual bunch weight until the month has a ticket (19 kg)', r.abw === 19);
  check('overdue fruit: bunches, tonnes, since, days, both owners', /LEBIH TEMPOH: 100 tandan ≈ 1\.9 tan/.test(r.lines[0]) && /\(3 hari\)/.test(r.lines[0]) && /Staf bertugas \+ Pengurus/.test(r.lines[0]), r.lines[0]);
  check('yesterday\'s fruit: must reach the ramp today, carried first', /Dituai semalam: 50 tandan ≈ 1\.0 tan · mesti ke ramp hari ini · angkat dahulu/.test(r.lines[1] || ''), r.lines[1]);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
