// E-Book test (1.11). The room's bottom bar (Pagi · Kerja · Lori · Sejarah, icon + one word,
// green dot when done today, Tiket only for the clerk) and History's ‹ Month › stepper with the year grid.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P98'));
    const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'C-T', date: D(0), estate: 'SSGT', confirmedAt: '06:40', rows: [{ worker_id: 'W1', muster: 'H', task_code: 'HA', block: '03', lots: '3-30' }], jobs: [], alerts: [] },
      { chit: 'C-Y', date: D(35), estate: 'SSGT', confirmedAt: '06:40', rows: [{ worker_id: 'W1', muster: 'H', task_code: 'HA', block: '03', lots: '3-30' }], jobs: [], alerts: [] }])); });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(500);
  const bar = await p.$$eval('.botbar a', a => a.map(x => x.innerText.trim()));
  check('staff bar: Pagi · Kerja · Lori · Sejarah (no Tiket)', bar.join('|') === 'Pagi|Kerja|Lori|Sejarah', bar.join('|'));
  const pos = await p.evaluate(() => { const r = document.querySelector('.botbar').getBoundingClientRect(); return { bottom: Math.round(r.bottom), h: innerHeight, pos: getComputedStyle(document.querySelector('.botbar')).position }; });
  check('the bar is fixed at the bottom of the screen', pos.pos === 'fixed' && Math.abs(pos.bottom - pos.h) <= 1, JSON.stringify(pos));
  check('Kerja is the current screen', await p.getAttribute('.botbar a[data-tab="work"]', 'aria-current') === 'page');
  check('green dot on Pagi (chit saved today), none on Kerja', await p.locator('.botbar a[data-tab="muster"] .tab-ok').count() === 1 && await p.locator('.botbar a[data-tab="work"] .tab-ok').count() === 0);
  await p.click('.botbar a[data-tab="muster"]'); await p.waitForTimeout(400);
  check('tapping Pagi opens the morning chit', /Chit muster pagi/.test(await p.textContent('#room h1')));
  // nothing hidden under the bar: the last thing on the page can scroll above it
  const clear = await p.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); const bar = document.querySelector('.botbar').getBoundingClientRect().top;
    const last = [...document.querySelectorAll('#room .card')].pop(); return last ? last.getBoundingClientRect().bottom <= bar + 1 : true; });
  check('the last card scrolls clear of the bar', clear);
  // English
  await p.evaluate(() => EA.setLang('en')); await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(400);
  check('English bar: Morning · Work · Lorry · History', (await p.$$eval('.botbar a', a => a.map(x => x.innerText.trim()).join('|'))) === 'Morning|Work|Lorry|History');
  await p.evaluate(() => EA.setLang('bm')); await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100);
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForSelector('#hs-pick');
  // History: ‹ Month ›
  const now = new Date(), bmFull = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
  check('History shows this month in full, with its summary', (await p.textContent('#hs-pick')).includes(bmFull[now.getMonth()] + ' ' + now.getFullYear()) && /hari/.test(await p.textContent('#hs-pick')));
  check('› is off on this month (no future)', await p.isDisabled('#hs-next'));
  await p.click('#hs-prev'); await p.waitForTimeout(200);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  check('‹ goes to last month', (await p.textContent('#hs-pick')).includes(bmFull[prev.getMonth()]));
  await p.click('#hs-pick'); await p.waitForSelector('.mgrid');
  const grid = await p.$$eval('.mgrid button', a => a.map(x => ({ t: x.textContent, off: x.disabled, dot: !!x.querySelector('.dot'), on: x.classList.contains('on') })));
  check('year grid: 12 months, months to come are off', grid.length === 12 && grid.slice(now.getMonth() + 1).every(g => g.off) && !grid[now.getMonth()].off);
  check('year grid: a dot on months with records on this phone', grid[now.getMonth()].dot);
  await p.click('#mq-this'); await p.waitForTimeout(200);
  check('"Bulan ini" jumps back to this month', (await p.textContent('#hs-pick')).includes(bmFull[now.getMonth()]));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v22-history.png' });
  // Clerk: has Tiket, 5 buttons
  await p.evaluate(() => { location.hash = ''; }); await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.fill('#key', '333333'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/ticket'; }); await p.waitForTimeout(500);
  const cb = await p.$$eval('.botbar a', a => a.map(x => x.innerText.trim()).join('|'));
  check('clerk bar: Tiket · Operasi only', cb === 'Tiket|Operasi', cb);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
