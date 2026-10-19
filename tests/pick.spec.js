// E-Book test. Run with tests/run.sh (needs the local server on port 8765).
// 1.2: people are picked by name, grouped by gang (the job's gang first), with search and SAME AS LAST TIME.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P07'));
    const n = new Date(); const d = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    const y = new Date(n); y.setDate(y.getDate() - 1); const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'C-Y', date: yd, estate: 'SSGT', confirmedAt: '06:30', jobs: [], rev: 1,
      rows: [{ worker_id: 'W-SSGT-007', muster: 'H', task_code: 'MT03', block: '03', lots: '3-30' }, { worker_id: 'W-SSGT-008', muster: 'H', task_code: 'MT03', block: '03', lots: '3-30' }] }]));
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: d, estate: 'SSGT', marks: {}, jobOf: {}, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 2, alertNotes: {}, newChit: true,
      jobs: [{ key: 'j1', task: 'MT03', block: '03', lots: ['3-30'], mandor: '' }] } }));
  });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(400);
  await p.click('[data-pick="j1"]'); await p.waitForSelector('#pp-list');
  const groups = await p.locator('#pp-list .pick-group').allTextContents();
  check('pick: maintenance gang first for a spraying job', /Rawatan/.test(groups[0] || ''), groups.join(' | '));
  const first = await p.locator('#pp-list .pick b').first().textContent();
  check('pick: names shown, not codes', /Pekerja Contoh/.test(first), first);
  await p.fill('#pp-find', 'contoh 1');
  const shown = await p.locator('#pp-list .pick:not([hidden]) b').allTextContents();
  check('pick: search by name filters the list', shown.length > 0 && shown.every(x => /Contoh 1/.test(x)), shown.join(', '));
  await p.fill('#pp-find', '');
  await p.click('#pp-last');
  const on = await p.locator('#pp-list .pick[aria-pressed="true"]').evaluateAll(a => a.map(x => x.dataset.w));
  check('pick: SAME AS LAST TIME ticks yesterday\'s two people', on.sort().join(',') === 'W-SSGT-007,W-SSGT-008', on.join(','));
  await p.click('#pp-ok'); await p.waitForTimeout(300);
  check('pick: job now has 2 people', /2 orang/.test(await p.textContent('#fh-jobs')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
