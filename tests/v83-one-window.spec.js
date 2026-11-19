// E-Book test (1.75) correcting a chit and keying its work reach exactly the same day.
//
// Ferezelly, through Yu Chen, 19 Nov 2026 13:30: "he is saying he wan to change the workers to tidak hadir,
// but no button." He was right. Two windows existed and nobody had noticed they were different:
//
//   BETULKAN on the chit   3 days   -> on 19 Nov it reached 17 Nov. For 15 and 16 Nov no button was DRAWN.
//   Kerja, keying the work 1 day    -> widened to 5 that morning.
//
// 15 and 16 Nov were the two days he had to clear, so he pressed nothing, nothing saved, and the office saw
// zero corrections from Sugut all week. Widening only the work would have moved the wall one step along: he
// could key 15 Nov's work and still not mark the men who never turned up.
//
// There is now ONE number. muster.js owns FIX_DAYS and exports it; work.js reads it; server/core.gs holds the
// matching value. It counts TODAY, so 5 means today and the 4 days before it — 15 Nov when today is the 19th.
//
// A phone that offers BETULKAN on a day the office then refuses as too_old is worse than no button at all:
// the staff keys the correction, is told it saved, and it is thrown away at the office. Hence check 3.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P94')); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload();
  await p.fill('#key', '111111');
  await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; });
  await p.waitForTimeout(700);
  const est = await p.evaluate(() => { const e = document.querySelector('#room .brand-sub'); return e ? e.textContent.trim() : ''; });

  // a chit every day for a week, nothing closed, no work keyed — Sugut on the morning of 19 Nov
  await p.evaluate(e => {
    const people = (typeof EA.lists.people === 'function' ? EA.lists.people(e) : []).slice(0, 4);
    const mk = n => ({ chit: 'MC-' + n, date: EA.dayAgo(n), estate: e, rev: 1, confirmedAt: '06:10',
      chitRowId: 'r' + n, alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-1'], mandor: '' }],
      rows: people.map((w, i) => ({ id: 'x' + n + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '01', lots: '1-1', mandor: '', status: 'active' })) });
    localStorage.setItem('fh.chits2', JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7].map(mk)));
    localStorage.setItem('fh.work', JSON.stringify([]));
  }, est);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);

  const fixDays = await p.evaluate(() => {
    const c = document.querySelector('#fh-today-card');
    return [...c.querySelectorAll('.list-line')].filter(l => l.querySelector('[data-fix]'))
      .map(l => l.getAttribute('data-date') || (l.innerText.match(/(\d\d)\/(\d\d)/) || [])[0]).filter(Boolean).sort();
  });
  const workDays = await p.evaluate(() => (EA.fh.allChits() || [])
    .filter(c => EA.fh.workChitOpen(c)).map(c => c.date.slice(8) + '/' + c.date.slice(5, 7)).sort());
  const N = await p.evaluate(() => EA.fh.FIX_DAYS);
  const ago = await p.evaluate(() => [0, 1, 2, 3, 4, 5, 6, 7].map(n => EA.dayAgo(n)));
  const dm = d => d.slice(8) + '/' + d.slice(5, 7);

  // 1 · the two windows are the same days
  check('BETULKAN and Kerja offer exactly the same days',
    JSON.stringify(fixDays) === JSON.stringify(workDays),
    'chit ' + fixDays.join(' ') + '  |  work ' + workDays.join(' '));

  // 2 · the window counts today, so 5 reaches 4 days back and stops
  check('the window is ' + N + ' days counting today, so it reaches ' + dm(ago[N - 1]),
    fixDays[0] === dm(ago[N - 1]), fixDays.join(' '));
  check('the day before that is shut, on both screens',
    fixDays.indexOf(dm(ago[N])) < 0 && workDays.indexOf(dm(ago[N])) < 0, 'should not contain ' + dm(ago[N]));
  check('the day Ferezelly could not fix, 4 back, now has BETULKAN',
    fixDays.indexOf(dm(ago[4])) >= 0, fixDays.join(' '));

  // 3 · the office holds the same number, or a correction is keyed and then thrown away
  const gs = fs.readFileSync(path.join(root, 'server', 'core.gs'), 'utf8');
  const ms = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
  const wk = fs.readFileSync(path.join(root, 'rooms', 'field', 'work.js'), 'utf8');
  const office = (gs.match(/var FIX_DAYS = (\d+);/) || [])[1];
  const phone = (ms.match(/var FIX_DAYS = (\d+);/) || [])[1];
  check('the office allows the same window as the phone offers',
    office === phone && Number(phone) === N, 'office ' + office + ' · phone ' + phone + ' · running ' + N);
  check('the office still refuses anything older, rather than silently accepting it',
    /if \(String\(c\.date\) < daysAgo_\(FIX_DAYS\)\) return \{ ok: false, error: 'too_old' \};/.test(gs), 'chitFix_');

  // 4 · one copy of the number (Rule 5)
  check('Kerja reads the window instead of writing its own',
    /EA\.fh\.FIX_DAYS/.test(wk) && !/daysAgo\(3\)/.test(wk), 'work.js');
  check('the chit screen exports it', /EA\.fh\.FIX_DAYS = FIX_DAYS;/.test(ms), 'muster.js');
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
