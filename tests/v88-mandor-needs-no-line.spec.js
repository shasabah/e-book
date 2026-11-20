// E-Book test (1.79) a mandor is present, and is not asked for a work line.
//
// Yu Chen, 20 Nov 2026 07:05, from the practice login: "It wouldn't let me close for full this. But I
// already key all Havestor individually different number."
//
// He had. Read straight out of his practice book: 17 present on the chit, 16 with work keyed — his sixteen
// harvesters, each a different number — and one without, W-SSGT-M01, Mandor Contoh 1.
//
// The two screens disagreed about that one man, and nothing in the app could settle it:
//
//   Kerja has always known. rooms/field/work.js sorts him into j.mandors rather than j.people, with the
//   comment "a mandor supervises: nothing to key for him", and gives him no box at all.
//
//   The close never got that message. payLines demanded a work line from everyone marked H, so the mandor
//   fell into noLine and check 1 stayed red: "1 orang hadir tiada baris kerja".
//
// So the app asked for something it also refused to let him enter. No row to key, and no close without one.
// The same shape as every fault this week: one rule written in two places, and the two drifted apart.
//
// He is present and he is working. He is simply not on piece rate. A HARVESTER with no line still stops the
// close, which is the whole point of check 1 and must not be weakened — that is what check 3 below holds.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
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

  // Yu Chen's own day, rebuilt: a mandor and three harvesters present, work keyed for the harvesters only.
  const seeded = await p.evaluate(() => {
    const est = 'SSGT';
    // workersFor / mandorsFor are what the chit screen itself uses; peopleFor is a different thing.
    const mandor = (EA.lists.mandorsFor(est) || [])[0];
    const cutters = (EA.lists.workersFor(est) || []).slice(0, 3);
    if (!mandor || cutters.length < 3) return { ok: false, cutters: cutters.length, m: !!mandor };
    const date = EA.today();
    // Everyone on the estate has to be on the chit or check 1 stops at "on the list but not on the chit",
    // which is a different fault and would hide the one under test. The four who worked are H; the rest T.
    const here = [mandor].concat(cutters);
    const hereIds = here.map(function (w) { return w.id; });
    const away = (EA.lists.workersFor(est) || []).concat(EA.lists.mandorsFor(est) || [])
      .filter(function (w) { return hereIds.indexOf(w.id) < 0; });
    const row = function (w, i) { return { id: 'r' + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '02', lots: '2-1', mandor: mandor.id, status: 'active' }; };
    const out = function (w, i) { return { id: 'a' + i, worker_id: w.id, muster: 'T', task_code: '', block: '', lots: '', mandor: '', status: 'active' }; };
    const chit = { chit: 'MC-M', date: date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc',
      alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '02', lots: ['2-1'], mandor: mandor.id }],
      rows: here.map(row).concat(away.map(out)) };
    localStorage.setItem('fh.chits2', JSON.stringify([chit]));
    localStorage.setItem('fh.dayclose', JSON.stringify([]));
    // work for the three cutters, each a different number. Nothing for the mandor.
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'MC-M', date: date, estate: est, chitRev: 1,
      rec: { at: '18:30', jobs: [{ id: 'j1', status: 'done' }],
        lines: cutters.map(function (w, i) { return { id: 'l' + i, worker_id: w.id, task_code: 'HA', block: '02', lot: '2-1', bunches: String(40 + i * 7) }; }) } }]));
    return { ok: true, mandor: mandor.id, cutters: cutters.map(function (w) { return w.id; }) };
  });
  check('the day is built from a real mandor and three harvesters', seeded.ok, JSON.stringify(seeded));
  if (!seeded.ok) { await b.close(); return; }

  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForTimeout(1100);

  const r = await p.evaluate(() => {
    const txt = document.querySelector('#room').innerText.replace(/\s+/g, ' ');
    const one = [...document.querySelectorAll('.dc-it')][0];
    return { first: one ? one.innerText.replace(/\s+/g, ' ').trim() : '', bad: one ? one.className.indexOf('dc-bad') >= 0 : true, txt: txt.slice(0, 420) };
  });
  check('check 1 passes: nobody is "hadir tiada baris kerja"', !r.bad, r.first);
  // P is the pay letter for present (AWAY maps S->S sick, C->L leave, T->X absent). Four present: the
  // mandor and his three cutters. The mandor is counted at work, he is simply not asked for a line.
  check('the mandor is counted PRESENT, not missing', /P 4/.test(r.first), r.first);

  // 3 · the guard must NOT be weakened: a harvester with no line still stops the close
  await p.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('fh.work'));
    w[0].rec.lines = w[0].rec.lines.slice(0, 2);          // drop one cutter's line
    localStorage.setItem('fh.work', JSON.stringify(w));
  });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForTimeout(1000);
  const r2 = await p.evaluate(() => {
    const one = [...document.querySelectorAll('.dc-it')][0];
    return { first: one ? one.innerText.replace(/\s+/g, ' ').trim() : '', bad: one ? one.className.indexOf('dc-bad') >= 0 : false };
  });
  check('a HARVESTER with no work line still stops the close', r2.bad, r2.first);
  check('and it names one man, not two — the mandor is not counted with him',
    /^! 1 orang/.test(r2.first), r2.first);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();

  // 4 · the two screens now ask the same question of the same man (Rule 5)
  const wk = fs.readFileSync(path.join(root, 'rooms', 'field', 'work.js'), 'utf8');
  const dc = fs.readFileSync(path.join(root, 'rooms', 'field', 'dayclose.js'), 'utf8');
  check('Kerja still sorts a mandor out of the people to key',
    /if \(w && w\.mdr\) j\.mandors\.push\(r\.worker_id\);/.test(wk), 'work.js');
  check('and the close now asks the same thing, of the same list',
    /var w = EA\.lists\.worker\(r\.worker_id\);/.test(dc) && /if \(w && w\.mdr\) \{ out\.count\.P\+\+;/.test(dc), 'dayclose.js');
})();
