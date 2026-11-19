// E-Book test (1.78) which day you are closing is the first thing on the screen, and practice reads the
// real worker list.
//
// Yu Chen, 20 Nov 2026, just after midnight, from the practice login:
//   00:48 "I can't close today date cause it keep asking me to close the prevoise date first"
//   00:51 "I can't find the selection day for closing. I believe ferezelly facing the same"
//   00:58 "I wan the pratice mode same like actually the real one... I wan the exactly same like the
//          name list and all"
//
// Two separate faults, found by driving the screen rather than reading it — twice I answered him from the
// source and twice I was wrong about what he could SEE.
//
// 1 · The day chooser was a grey <select>, drawn only when more than one day was open. It read as a label
//     rather than a choice, it scrolled away while the card heading below kept naming a different date, and
//     with one day open it did not exist at all — so nobody ever learnt it was there. They met it for the
//     first time on the morning four days were open and they were already behind. Nothing ever demanded the
//     oldest day; the screen just silently picked it. It is now the days themselves, always drawn, with the
//     count and "tidak perlu ikut turutan" under them.
//
// 2 · The office sent a practice login an EMPTY worker list, so the phone fell back to 22 made-up workers.
//     Every other list — tasks, blocks, lots, estates, targets, calendar — was already shared; the roll was
//     the odd one out, which is what made practice not look like the day it was meant to rehearse.
//     Practice still keeps its own RECORDS: that is the point of practice and it does not change.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const b = await chromium.launch();

  async function screen(open) {
    const p = await b.newPage({ viewport: { width: 390, height: 760 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/index.html');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); });
    await p.evaluate(() => EA.setLang('bm'));
    await p.reload();
    await p.fill('#key', '111111');
    await p.waitForSelector('#home:not([hidden])');
    await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); });
    await p.waitForTimeout(600);
    await p.evaluate(count => {
      const est = 'SSGT', people = (EA.lists.peopleFor(est) || []).slice(0, 3);
      const mk = n => ({ chit: 'MC-' + n, date: EA.dayAgo(n), estate: est, rev: 1, confirmedAt: '06:10',
        chitRowId: 'r' + n, alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
        jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-1'], mandor: '' }],
        rows: people.map((w, i) => ({ id: 'x' + n + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '01', lots: '1-1', mandor: '', status: 'active' })) });
      localStorage.setItem('fh.chits2', JSON.stringify(Array.from({ length: count }, (_, i) => mk(i))));
      localStorage.setItem('fh.work', JSON.stringify([]));
      localStorage.setItem('fh.dayclose', JSON.stringify([]));
    }, open);
    await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
    await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForTimeout(1100);
    return { p, errs };
  }

  // ---- five days open ----
  let { p, errs } = await screen(5);
  let r = await p.evaluate(() => {
    const row = [...document.querySelectorAll('.dc-day')];
    const card = document.querySelector('.dc-days');
    const checks = [...document.querySelectorAll('#room .card h2')].find(h => /Semakan|Checks/.test(h.textContent));
    return { days: row.map(e => e.innerText.replace(/\s+/g, ' ').trim()),
      on: (document.querySelector('.dc-day.on') || {}).innerText || '',
      hint: (document.querySelector('.dc-days .hint') || {}).textContent || '',
      cardTop: card ? Math.round(card.getBoundingClientRect().top) : -1,
      checksTop: checks ? Math.round(checks.getBoundingClientRect().top) : -1,
      widest: Math.max(...row.map(e => Math.round(e.getBoundingClientRect().right))),
      noSelect: !document.querySelector('#dc-pick') };
  });
  check('every open day is a button of its own', r.days.length === 5, JSON.stringify(r.days));
  check('each one shows the date and the day name', /^\d+\/\d+ \w+/.test(r.days[0]), r.days[0]);
  check('the day chosen is marked', /16|17|18|19|20/.test(r.on), r.on.replace(/\s+/g, ' '));
  check('it says how many are waiting, and that order does not matter',
    /5 hari belum ditutup/.test(r.hint) && /tidak perlu ikut turutan/.test(r.hint), r.hint);
  check('the choice comes BEFORE the checks card that names a date',
    r.cardTop >= 0 && r.cardTop < r.checksTop, 'row at ' + r.cardTop + ', checks at ' + r.checksTop);
  check('five days fit a 390px phone without scrolling sideways', r.widest <= 390, 'rightmost edge ' + r.widest);
  check('the old grey select is gone', r.noSelect);

  // pressing another day really moves the screen to it
  await p.evaluate(() => { const d = [...document.querySelectorAll('.dc-day')].pop(); d.click(); });
  await p.waitForTimeout(700);
  const moved = await p.evaluate(() => ({
    on: (document.querySelector('.dc-day.on') || {}).innerText.replace(/\s+/g, ' ').trim(),
    heading: ([...document.querySelectorAll('#room .card h2')].find(h => /Semakan|Checks/.test(h.textContent)) || {}).textContent || '' }));
  check('pressing a day switches the checks to that day',
    moved.heading.indexOf(moved.on.split(' ')[0].split('/')[0]) >= 0, moved.on + ' vs ' + moved.heading);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await p.close();

  // ---- one day open: the control must still be there ----
  ({ p, errs } = await screen(1));
  r = await p.evaluate(() => ({
    days: [...document.querySelectorAll('.dc-day')].length,
    hint: (document.querySelector('.dc-days .hint') || {}).textContent || '' }));
  check('with one day open the chooser is STILL drawn, so it is learnt on a quiet day',
    r.days === 1, r.days + ' buttons');
  check('and it says so plainly', /1 hari belum ditutup/.test(r.hint), r.hint);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await p.close();
  await b.close();

  // ---- practice reads the real worker list ----
  const gs = fs.readFileSync(path.join(root, 'server', 'core.gs'), 'utf8');
  const code = gs.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  check('the office no longer sends a practice login an empty worker list',
    !/if \(isPracticeCode_\(user\.user_code\)\) return \{ ok: true, people: \[\], practice: true \};/.test(code), 'people_');
  check('practice records still go to their own book, not the real one',
    /if \(user && isPracticeCode_\(user\.user_code\)\) \{ PRACTICE_ = true; BOOK_ = null; \}/.test(code), 'PRACTICE_');
  const sync = fs.readFileSync(path.join(root, 'core', 'sync.js'), 'utf8');
  check('and the phone still keeps practice records under their own keys',
    /'L:' \+ k/.test(sync) && /\^\(fh\\\./.test(sync), 'nk()');
})();
