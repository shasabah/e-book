// E-Book test (1.103) Kerja in the new look: a second lot's number goes in the second box. Yu Chen 25 Nov 2026, 4:03 pm:
// "once we add lot the cursor still at the old column". After + PETAK LAIN and a lot picked, the focus went to the man's
// FIRST box, so the second lot's bunches were typed over the first. Setup from v102; made-up data only (Rule 8).
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
  const line = () => p.evaluate(w => { const d = Object.values(JSON.parse(localStorage.getItem('fh.workdraft')))[0]; return d.lines[w]; }, s.hv[0]);
  const act = () => p.evaluate(() => { const a = document.activeElement; return a && a.dataset && a.dataset.rbin ? a.dataset.w + '|' + a.dataset.i : (a ? a.tagName : ''); });
  await p.click('[data-rbopen] [data-pick-lot="1-1"]'); await p.waitForTimeout(300);
  check('first lot picked: the first box has the focus', await act() === s.hv[0] + '|0', await act());
  await p.keyboard.type('150'); await p.waitForTimeout(200);
  await p.click('[data-rbopen] [data-add]'); await p.waitForTimeout(400);
  check('+ PETAK LAIN: the first box lets go (no typing into the old box)', await act() !== s.hv[0] + '|0', await act());
  check('+ PETAK LAIN: the new lot buttons are on screen', await p.evaluate(() => { const b = [...document.querySelectorAll('[data-rbopen] [data-pick-lot][data-i="1"]')][0]; if (!b) return false; const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
  const second = await p.evaluate(() => { const b = document.querySelector('[data-rbopen] [data-pick-lot][data-i="1"]'); return b && b.dataset.pickLot; });
  await p.click('[data-rbopen] [data-pick-lot][data-i="1"][data-pick-lot="' + second + '"]'); await p.waitForTimeout(300);
  check('second lot picked: the SECOND box has the focus', await act() === s.hv[0] + '|1', await act());
  await p.keyboard.type('40'); await p.waitForTimeout(300);
  const ls = await line();
  check('the number goes to the second lot; the first lot keeps 150', ls.length === 2 && String(ls[0].bunches) === '150' && ls[1].lot === second && String(ls[1].bunches) === '40', JSON.stringify(ls));
  await p.click('[data-rbopen] [data-rbtukar]').catch(() => {});
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
