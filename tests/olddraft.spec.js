// E-Book test. Run with tests/run.sh (needs the local server on port 8765).
const ROOT = require('path').resolve(__dirname, '..');
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P01'));
    const t = new Date(); const d = t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0');
    // a chit draft as saved by version 12 (no alertNotes)
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: d, estate: 'SSGT', jobs: [], marks: {}, jobOf: {}, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 1 } }));
    const y = new Date(); y.setDate(y.getDate() - 2); const yd = y.toISOString().slice(0, 10);
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'Y1', date: yd, estate: 'SSGT', rec: { lines: [{ id: 'W1', worker_id: 'W-SSGT-001', task_code: 'HA', block: '03', lot: '3-24', bunches: '160' }], jobs: [] } }]));
  });
  const keys = await p.evaluate(() => Object.keys(localStorage));
  await p.reload(); await p.fill('#key', '777777'); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(800);
  check('old chit draft opens without the error screen', !(await p.isVisible('text=Skrin ini tidak dapat dibuka')) && errs.length === 0, errs.join(' | '));
  await b.close();
})();
