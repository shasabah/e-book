// E-Book test (1.11, bar rewritten 1.62). The room's bottom bar (Pagi · Kerja · Lori · Sejarah, icon + one word,
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
  // v1.62 (Brief_Susun_Atur): one bar on every screen — Hari ini · Rekod · Laporan · Senarai — never the room's own
  const bar = await p.$$eval('.botbar a', a => a.map(x => x.innerText.trim()));
  check('1.62: inside Kerja the bar is the four tabs, Hari ini lit, and only one bar', bar.join('|') === 'Hari ini|Rekod|Laporan|Senarai' && await p.locator('.botbar').count() === 1 && await p.getAttribute('.botbar a[data-pane="today"]', 'aria-current') === 'page', bar.join('|'));
  const pos = await p.evaluate(() => { const r = document.querySelector('.botbar').getBoundingClientRect(); return { bottom: Math.round(r.bottom), h: innerHeight, pos: getComputedStyle(document.querySelector('.botbar')).position }; });
  check('the bar is fixed at the bottom of the screen', pos.pos === 'fixed' && Math.abs(pos.bottom - pos.h) <= 1, JSON.stringify(pos));
  const clear = await p.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); const bar = document.querySelector('.botbar').getBoundingClientRect().top;
    const last = [...document.querySelectorAll('#room .card')].pop(); return last ? last.getBoundingClientRect().bottom <= bar + 1 : true; });
  check('the last card scrolls clear of the bar', clear);
  await p.click('.botbar a[data-pane="today"]'); await p.waitForTimeout(400);
  check('Hari ini from inside a screen goes home, with the steps to open (1.64: the step lines are the buttons)', !p.url().includes('#field') && (await p.$$eval('#today [data-step]', a => a.map(x => x.dataset.step).join(','))) === 'rain,chit,work,ramp,close,plan');
  await p.click('#today [data-step="chit"]'); await p.waitForTimeout(400);
  check('tapping Chit pagi opens the morning chit', /Chit muster pagi/.test(await p.textContent('#room h1')));
  await p.evaluate(() => EA.setLang('en')); await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(400);
  check('English bar: Today · Records · Reports · Lists, Records lit', (await p.$$eval('.botbar a', a => a.map(x => x.innerText.trim()).join('|'))) === 'Today|Records|Reports|Lists' && await p.getAttribute('.botbar a[data-pane="rekod"]', 'aria-current') === 'page');
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
  await p.evaluate(() => { location.hash = ''; }); await p.click('#who-name'); await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.fill('#key', '333333'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/ticket'; }); await p.waitForTimeout(500);
  const cb = await p.$$eval('.botbar a', a => a.map(x => x.innerText.trim()).join('|'));
  check('clerk: the same four tabs', cb === 'Hari ini|Rekod|Laporan|Senarai', cb);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  check('clerk: Hari ini opens Tiket kilang', (await p.$$eval('#work-screens [data-scr]', a => a.map(x => x.dataset.scr).join(','))) === 'ticket');
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
