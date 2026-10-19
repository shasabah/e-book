// E-Book test. Run with tests/run.sh (needs the local server on port 8765).
const ROOT = require('path').resolve(__dirname, '..');
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const out = process.argv[2] || require('os').tmpdir();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P07'));
    const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    localStorage.setItem('fh.work', JSON.stringify([
      { chit: 'Y0', date: D(0), estate: 'SSGT', rec: { lines: [
        { id: 'W-1', worker_id: 'W-SSGT-001', task_code: 'HA', block: '03', lot: '3-30', bunches: '600' },
        { id: 'W-2', worker_id: 'W-SSGT-002', task_code: 'HA', block: '03', lot: '3-31', bunches: '500' },
        { id: 'W-3', worker_id: 'W-SSGT-003', task_code: 'HA', block: '02', lot: '2-5', bunches: '400' }], jobs: [] } }]));
  });
  const t = s => (s || '').replace(/\s+/g, ' ').trim();
  const login = async (key) => { await p.reload(); await p.fill('#key', key); await p.waitForSelector('#home:not([hidden])'); await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(300); };
  const logout = async () => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300); await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out'); };
  const rowsNow = async () => (await p.locator('#cl-rows .lot-row').evaluateAll(a => a.map(x => {
    const g = s => x.querySelector(s); const nums = x.querySelectorAll('.en b');
    return x.querySelector('b').textContent.replace('Petak ', '') + ' F' + nums[0].textContent + ' R' + nums[1].textContent +
      (g('[data-dik]') ? ' dik=' + g('[data-dik]').value + (g('[data-hab]').checked ? ' habis' : '') : '') +
      (g('[data-lon]') ? ' lori=' + (g('[data-lon]').checked ? g('[data-ln]').value : 'off') : '');
  }))).join(' | ');
  await login('777777');
  const staffTabs = t(await p.textContent('.tabs'));
  await p.click('.tabs a[href="#field-harvest/collect"]'); await p.waitForSelector('#cl-rows');
  console.log('START:', await rowsNow());
  // loader's paper: 3-31 only 300 collected
  await p.fill('#cl-rows input[data-dik="3-31"]', '300');
  console.log('3-31 changed:', await rowsNow());
  await p.screenshot({ path: out + '/v22-collect-nolorry.png', fullPage: true });
  await p.click('#cl-save'); await p.waitForTimeout(400);
  let q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue')));
  const colRows = q.filter(x => x.tab === 'FH_COLLECT').map(x => x.row.lot + '=' + x.row.bunches + (x.row.cleared ? ' habis' : '')).join(', ');
  check('collected rows from the mandor count, 3-31 changed to 300', colRows === '2-5=400 habis, 3-30=600 habis, 3-31=300', colRows);
  console.log('AFTER collect:', await rowsNow(), '|', t(await p.textContent('#cl-tot')));
  // lorry: everything at the ramp goes, but keep 2-5 at the ramp
  await p.click('#cl-lorry-yes'); await p.waitForSelector('#cl-dn');
  console.log('LORRY default:', await rowsNow(), '|', t(await p.textContent('#cl-tot')));
  await p.locator('#cl-rows input[data-lon="2-5"]').uncheck();
  await p.fill('#cl-dn', '8524'); await p.fill('#cl-lr', 'sjq 6259'); await p.fill('#cl-dr', 'Halim');
  console.log('LORRY set:', await rowsNow(), '|', t(await p.textContent('#cl-tot')));
  await p.screenshot({ path: out + '/v22-collect-lorry.png', fullPage: true });
  await p.click('#cl-save'); await p.waitForTimeout(400);
  q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue')));
  const dnRows = q.filter(x => x.tab.startsWith('FH_DISPATCH')).map(x => x.tab.replace('FH_', '') + ' ' + (x.row.lot || x.row.block) + '=' + x.row.bunches).join(', ');
  check('lorry rows: block 900, lots 3-30=600 and 3-31=300', dnRows === 'DISPATCH 03=900, DISPATCH_LOT 3-30=600, DISPATCH_LOT 3-31=300', dnRows);
  console.log('AFTER lorry:', await rowsNow());
  console.log('BACKLOG:', t(await p.textContent('#fh-backlog')).slice(0, 260));
  // correct the DN: 3-31 only 250 went
  await p.click('[data-dfix]'); await p.waitForSelector('#cl-fixstop');
  console.log('FIX:', await rowsNow());
  await p.fill('#cl-rows input[data-ln="3-31"]', '250'); await p.click('#cl-save'); await p.waitForTimeout(400);
  q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue')));
  const fixRows = q.filter(x => x.tab.startsWith('FH_DISPATCH') && x.row.replaces).map(x => x.tab.replace('FH_', '') + ' ' + (x.row.lot || x.row.block) + '=' + x.row.bunches + ' ' + x.row.status).join(', ');
  check('corrected DN replaces its rows (850, 600, 250)', fixRows === 'DISPATCH 03=850 active, DISPATCH_LOT 3-30=600 active, DISPATCH_LOT 3-31=250 active', fixRows);
  const afterFix = await rowsNow();
  check('after the correction 3-31 has 50 back at the ramp', /3-31 · Blk 03 F200 R50/.test(afterFix), afterFix);
  await logout();
  // CLERK
  await login('333333');
  console.log('CLERK tabs:', t(await p.textContent('.tabs')));
  await p.click('.tabs a[href="#field-harvest/ticket"]'); await p.waitForSelector('#tk-save'); await p.waitForTimeout(300);
  const labels = (await p.locator('label[for="tk-w1"], label[for="tk-w2"], label[for="tk-ded"], label[for="tk-nett"]').allTextContents()).map(t).join(' | ');
  check('weight names 1st / 2nd / deduction / net', /1st weight.*2nd weight.*Deduction.*Net weight/.test(labels), labels);
  check('clerk cannot tick lots', (await p.locator('#tk-lots input').count()) === 0);
  await p.fill('#tk-do', '8524'); await p.waitForTimeout(300);
  await p.fill('#tk-no', '469404'); await p.fill('#tk-w1', '32120'); await p.fill('#tk-w2', '16420'); await p.click('#tk-time');
  const sum = t(await p.textContent('#tk-sum'));
  check('ticket: 850 bunches, 15.70 MT, ABW 18.47', /850.*15\.70 MT.*ABW 18\.47/.test(sum), sum.slice(0, 100));
  await p.click('#tk-save'); await p.waitForSelector('#gs-save'); await p.click('#gs-cancel'); await p.waitForSelector('#tk-text');
  console.log('TEXT weight line:', (await p.textContent('#tk-text')).split('\n').find(l => l.includes('Net')));
  await p.click('#tt-close');
  await p.click('.tabs a[href="#field-harvest"]'); await p.waitForTimeout(500);
  const card = t(await p.textContent('#fh-backlog'));
  check('chit shows month-to-date 15.70 MT and the ramp', /Tan bulan ini: 15\.70 MT/.test(card) && /Ramp: 450/.test(card), card.slice(0, 400));
  await p.screenshot({ path: out + '/v22-chit.png', fullPage: false });
  await logout();
  check('staff has no ticket tab', !staffTabs.includes('Tiket kilang'), staffTabs);
  await login('666666');   // login() already opens the room
  check('loader login is parked', /Belum dibuka/.test(t(await p.textContent('#room'))), t(await p.textContent('#room')).slice(0, 80));
  check('no page errors', errs.length === 0, errs.join(' | ')); await b.close();
})();
