// E-Book test. Run with tests/run.sh (needs the local server on port 8765).
const ROOT = require('path').resolve(__dirname, '..');
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P07')); });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForTimeout(500);
  await p.evaluate(() => { EA.fh.ticket.render = function () { var x; return x.boom; }; location.hash = 'field-harvest/ticket'; });
  await p.waitForTimeout(800);
  check('broken screen shows the error box', /Skrin ini tidak dapat dibuka/.test(await p.textContent('#room')));
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue')));
  check('error is queued for the office (APP_ERROR)', q.some(x => x.tab === 'APP_ERROR'));
  await p.click('#err-back'); await p.waitForTimeout(300);
  check('BACK returns to the home tiles', (await p.locator('[data-room]').count()) > 0);
  await b.close();
})();
