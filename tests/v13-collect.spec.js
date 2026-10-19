// E-Book test (1.3). Collect & dispatch: a lorry needs ticked lots; "Habis" with fewer bunches
// collected than harvested asks how many went to the ramp, and the rest stays as field backlog.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P96'));
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'Y0', date: EA.today(), estate: 'SSGT', rec: { lines: [
      { id: 'W-1', worker_id: 'W-SSGT-001', task_code: 'HV01', block: '03', lot: '3-30', bunches: '100' }], jobs: [] } }]));
  });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/collect'; }); await p.waitForSelector('#cl-rows');
  // A lorry with only "no harvest record" bunches and no lot ticked is refused.
  await p.click('#cl-lorry-yes'); await p.waitForSelector('#cl-dn');
  await p.locator('#cl-rows input[data-lon="3-30"]').uncheck();
  await p.locator('#cl-extra summary').click(); await p.fill('#cl-db-03', '20');
  await p.fill('#cl-dn', '9001'); await p.fill('#cl-lr', 'SA 1');
  await p.click('#cl-save'); await p.waitForTimeout(300);
  const msg = (await p.textContent('#sheet')).replace(/\s+/g, ' ');
  check('a lorry with no lot ticked cannot be saved', /Tick at least one lot on the lorry/.test(msg), msg.slice(0, 120));
  await p.click('#cp-ok');
  await p.click('#cl-lorry-no'); await p.waitForTimeout(200);
  // 100 harvested, 90 collected, Habis ticked
  await p.fill('#cl-rows input[data-dik="3-30"]', '90');
  await p.locator('#cl-rows input[data-hab="3-30"]').check();
  await p.click('#cl-save'); await p.waitForTimeout(300);
  const ask = (await p.textContent('#sheet')).replace(/\s+/g, ' ');
  check('Habis with 90 of 100: the app asks how many went to the ramp', /menuai 100.*dikutip 90/.test(ask), ask.slice(0, 160));
  await p.click('#sh-ok'); await p.waitForTimeout(400);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue')).filter(x => x.tab === 'FH_COLLECT').map(x => x.row.lot + '=' + x.row.bunches + (x.row.cleared === 'Y' ? ' habis' : '')).join(','));
  check('saved as 90 collected, lot not cleared', q === '3-30=90', q);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(500);
  const card = (await p.textContent('#fh-backlog')).replace(/\s+/g, ' ');
  check('the 10 not collected stay as field backlog', /Field: 10/.test(card), card.slice(0, 200));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
