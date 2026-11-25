// E-Book test (1.101) Pilih petak in the new look. Brief_Rupa_Baru 1.2 §3b, Yu Chen 25 Nov 2026 ("Ok" on the sample
// "E-Book Pilih Petak" v2). His photo: 10 lots in one row made the page wider than the phone. Now: 5 lots a row that
// never shrink; a picked lot folds with TUKAR PETAK; the next man gets the next lot nobody has; lots already taken wait
// behind KONGSI PETAK; KOSONGKAN and × BUANG PETAK INI to fix a mistake. Setup from v99; made-up names (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.rupaBaru', '1'); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload(); await p.fill('#key', '111111'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(400);
  const s = await p.evaluate(() => {
    const est = 'SSGT', mandor = (EA.lists.mandorsFor(est) || [])[0], all = EA.lists.workersFor(est) || [], date = EA.today();
    const hv = all.slice(0, 6), L = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '1-10'];
    const row = (w, i) => ({ id: 'r' + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '01', lots: L.join(' '), mandor: mandor.id, status: 'active' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-PP', date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc', alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: L, mandor: mandor.id }], rows: [row(mandor, 99)].concat(hv.map(row)) }]));
    localStorage.setItem('fh.dayclose', JSON.stringify([])); localStorage.setItem('fh.work', JSON.stringify([]));
    return { hv: hv.map(x => x.id) };
  });
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(1200);
  await p.click('[data-rbj="j1"]'); await p.waitForTimeout(400);
  const wide = () => p.evaluate(() => document.documentElement.scrollWidth);
  const rows = await p.evaluate(() => { const t = [...document.querySelectorAll('[data-rbopen] [data-pick-lot]')].map(b => Math.round(b.getBoundingClientRect().top)); return [...new Set(t)].length; });
  const bw = await p.evaluate(() => Math.round(document.querySelector('[data-rbopen] [data-pick-lot]').getBoundingClientRect().width));
  check('10 lots: 2 rows of 5, and the page stays the width of the phone (390)', rows === 2 && await wide() <= 390, 'rows ' + rows + ' · page ' + await wide());
  check('each lot button keeps a thumb size (at least 56 px wide)', bw >= 56, bw + ' px');
  await p.click('[data-rbopen] [data-pick-lot="1-1"]'); await p.waitForTimeout(300);
  check('a lot picked folds to one line: "1-1 … TUKAR PETAK", the box in focus', /^1-1/.test((await p.innerText('[data-rbopen] .rb-picked')).trim()) && await p.locator('[data-rbopen] [data-pick-lot]').count() === 0 && await p.evaluate(() => !!document.activeElement.dataset.rbin));
  await p.keyboard.type('150'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  check('SETERUSNYA: the next man is on the next lot nobody has (1-2), only the number to type', /^1-2/.test((await p.innerText('[data-rbopen] .rb-picked')).trim()) && await p.evaluate(() => !!document.activeElement.dataset.rbin));
  await p.keyboard.type('128'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  check('and again (1-3)', /^1-3/.test((await p.innerText('[data-rbopen] .rb-picked')).trim()));
  await p.click('[data-rbopen] [data-rbtukar]'); await p.waitForTimeout(300);
  const free = await p.evaluate(() => [...document.querySelectorAll('[data-rbopen] [data-pick-lot]')].map(b => b.dataset.pickLot).join(','));
  check('TUKAR PETAK: the list shows only the 8 lots nobody has; 1-1 and 1-2 wait behind KONGSI PETAK · 2', free === '1-3,1-4,1-5,1-6,1-7,1-8,1-9,1-10' && /KONGSI PETAK · 2 petak/.test(await p.innerText('[data-rbopen] .rb-share')), free);
  await p.click('[data-rbopen] [data-pick-lot="1-6"]'); await p.waitForTimeout(300); await p.keyboard.type('90');
  await p.click('[data-rbopen] [data-add]'); await p.waitForTimeout(300);
  check('+ PETAK LAIN: the second lot has a clear "× BUANG PETAK INI" button', /× BUANG PETAK INI/.test(await p.innerText('[data-rbopen] .rb-second')));
  await p.click('[data-rbopen] .rb-delbtn'); await p.waitForTimeout(300);
  check('× BUANG PETAK INI removes it', await p.locator('[data-rbopen] .rb-second').count() === 0);
  await p.click('[data-rbopen] [data-rbclear]'); await p.waitForTimeout(300);
  const cl = await p.evaluate(w => { const d = Object.values(JSON.parse(localStorage.getItem('fh.workdraft')))[0]; return d.lines[w]; }, s.hv[2]);
  check('KOSONGKAN clears the man (no lot, no bunches) and the list opens to pick again', cl.length === 1 && !cl[0].lot && !cl[0].bunches && await p.locator('[data-rbopen] [data-pick-lot]').count() === 8, JSON.stringify(cl));
  check('the page never grew wider than the phone', await wide() <= 390, String(await wide()));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
