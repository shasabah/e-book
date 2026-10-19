// E-Book test. Run with tests/run.sh (needs the local server on port 8765).
// 1.1: no mandor check, targets on the chit and the day's work, area done filled in,
// harvest by block flowing to Kutip & hantar, no count tally.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const t = s => (s || '').replace(/\s+/g, ' ').trim();
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P07'));
    const n = new Date(); const d = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    const marks = {}, jobOf = {};
    EA.lists.testWorkers.forEach(w => { marks[w.id] = 'C'; });
    ['W-SSGT-007', 'W-SSGT-008', 'W-SSGT-009'].forEach(w => { marks[w] = 'H'; jobOf[w] = 'j1'; });
    ['W-SSGT-001', 'W-SSGT-002'].forEach(w => { marks[w] = 'H'; jobOf[w] = 'j2'; });
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: d, estate: 'SSGT', marks, jobOf, rain_mm: '0', rain_time: '', checker: '', replacing: '', nextJob: 3, alertNotes: {},
      jobs: [{ key: 'j1', task: 'CPS', block: '03', lots: ['3-30', '3-31'], mandor: '' }, { key: 'j2', task: 'HA', block: '02', lots: [], mandor: '' }] } }));
  });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(400);
  const jobs = t(await p.textContent('#fh-jobs'));
  check('chit: CPS target 3 × 2.5 = 7.5 Ha shown against 2.57 Ha planned, below target', /7\.5 Ha.*2\.57 Ha.*KURANG 4\.93/.test(jobs), jobs.slice(0, 260));
  check('chit: below-target job is highlighted', (await p.locator('#fh-jobs .flag-line').count()) === 1);
  check('chit: harvest target 2 × 1.5 = 3 MT', /2 × 1\.5 = 3 MT/.test(jobs));
  check('chit: no CHECK WITH MANDOR', /SAVE CHIT/.test(await p.textContent('#fh-check')));
  await p.click('#fh-check'); await p.waitForSelector('#cf-ok');
  check('chit: no mandor to choose before saving', (await p.locator('#cf-who').count()) === 0);
  const prev = await p.textContent('.sheet pre, #sheet pre');
  check('chit text: no "Disemak mandor", no count check', !/Disemak mandor|Semak kiraan/.test(prev));
  await p.click('#cf-ok'); await p.waitForTimeout(400);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // Day's work
  await p.click('.tabs a[href="#field-harvest/work"]'); await p.waitForTimeout(400);
  const cps = t(await p.textContent('[data-job="j1"]'));
  check('work: CPS lots start at 100% (3-30, 3-31)', (await p.locator('[data-job="j1"] button[data-pv="100"][aria-pressed="true"]').count()) === 2);
  check('work: CPS shared equally, 2.57 / 3 = 0.857 Ha each', /0\.857 Ha/.test(cps), cps.slice(0, 200));
  check('work: CPS below target flagged', /Bawah sasaran · below target: 2\.57 \/ 7\.5 Ha/.test(cps));
  await p.fill('[data-job="j2"] input[data-w="W-SSGT-001"][data-f="bunches"]', '120');
  await p.fill('[data-job="j2"] input[data-w="W-SSGT-002"][data-f="bunches"]', '80');
  for (const k of ['j1', 'j2']) await p.click(`[data-st="${k}"][data-v="Y"]`);
  check('work: no CHECK WITH MANDOR', !/MANDOR/i.test(await p.textContent('#wk-check')));
  await p.click('#wk-check'); await p.waitForSelector('#wc-ok');
  check('work: no mandor to choose before saving', (await p.locator('#wc-who').count()) === 0);
  await p.click('#wc-ok'); await p.waitForTimeout(400);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue')));
  const hv = q.filter(x => x.tab === 'FH_WORK' && x.row.task_code === 'HA').map(x => x.row.block + '/' + (x.row.lot || '-') + '=' + x.row.bunches).join(', ');
  check('work: harvest by block saved with no lot', hv === '02/-=120, 02/-=80', hv);
  const jd = q.filter(x => x.tab === 'FH_JOBDAY' && x.row.task_code === 'CPS').map(x => x.row.target + ' | ' + x.row.flags)[0] || '';
  check('work: job line carries its target', /7\.5 Ha/.test(jd), jd);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // Kutip & hantar: the block's harvest shows as one row
  await p.click('.tabs a[href="#field-harvest/collect"]'); await p.waitForSelector('#cl-rows');
  const rows = t(await p.textContent('#cl-rows'));
  check('collect: block harvest shows as "Blk 02 (semua petak)" with 200 in the field', /Blk 02 \(semua petak · all lots\).*field 200/.test(rows), rows.slice(0, 160));
  check('chit card: no count check', !/Semak kiraan|Count check/.test(await p.textContent('#fh-backlog')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
