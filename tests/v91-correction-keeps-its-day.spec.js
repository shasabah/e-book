// E-Book test (1.81) a correction belongs to the day it corrects — whoever started it.
//
// Ferezelly, 21 Nov 2026 at 09:01 and 09:04, corrected the 17 and 18 Nov chits from his own phone. Both
// corrections were written onto 21 November.
//
// The cause, in one line of fixDraft: the chit's date was copied into the draft ONLY when a clerk had
// formally asked for the fix. blankDraft() starts at EA.today(), and EA.save falls back to today when no
// date is passed, so a correction the STAFF started himself — BETULKAN, or the row-level "tidak hadir"
// button shipped in 1.76 — went to today.
//
// What it did to the book, read out of the live sheet afterwards:
//   · the 17 Nov chit row was REPLACED by a row dated 21 Nov, so 17 Nov had no standing chit at all and
//     dropped out of Rekod completely — "tiada rekod", as if nobody had worked
//   · 21 Nov picked up three chits and showed 48/75 present
//   · 10 rows in all (3 chit, 7 muster), every one of them Sugut, every one from those three minutes
//
// The day did not merely read wrong. It disappeared. This test holds the rule for both paths, because the
// clerk-asked path was never broken and the two must not drift apart again (Rule 5).
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

  // A chit from two days ago, inside the window, exactly as Ferezelly's 17 Nov was when he corrected it.
  const s = await p.evaluate(() => {
    const est = 'SSGT', mandor = (EA.lists.mandorsFor(est) || [])[0], all = EA.lists.workersFor(est) || [];
    const on = all.slice(0, 6), date = EA.dayAgo(2);
    const row = (w, i) => ({ id: 'r' + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '02', lots: '2-1', mandor: mandor.id, status: 'active' });
    const chit = { chit: 'MC-SSGT-TEST-1', date: date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rcOLD',
      alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '02', lots: ['2-1'], mandor: mandor.id }],
      rows: [row(mandor, 99)].concat(on.map(row)) };
    localStorage.setItem('fh.chits2', JSON.stringify([chit]));
    localStorage.setItem('fh.dayclose', JSON.stringify([]));
    localStorage.setItem('fh.work', JSON.stringify([]));
    localStorage.setItem('ea.queue', JSON.stringify([]));
    return { date: date, today: EA.today(), worker: on[0].id };
  });
  check('the chit is from a past day, not today', s.date !== s.today, s.date + ' vs today ' + s.today);

  // The chit screen has to be open: markAway works on the room's own ctx, as it does on the phone.
  await p.evaluate(() => { location.hash = 'field-harvest'; });
  await p.waitForTimeout(1400);
  await p.evaluate(() => { localStorage.setItem('ea.queue', JSON.stringify([])); });

  // The staff's own correction: mark one man away through the very function the row button uses.
  const res = await p.evaluate(w => {
    const r = EA.fh.markAway('MC-SSGT-TEST-1', [{ worker: w, mark: 'T' }]);
    const q = JSON.parse(localStorage.getItem('ea.queue') || '[]');
    const rows = q.map(it => ({ tab: it.tab, date: it.row.date, chit: it.row.chit || '', replaces: it.row.replaces || '' }));
    return { ok: r, n: rows.length, chit: rows.filter(x => x.tab === 'FH_CHIT'), muster: rows.filter(x => x.tab === 'FH_MUSTER') };
  }, s.worker);
  check('the correction saved', res.ok && res.n > 0, JSON.stringify({ ok: res.ok, n: res.n }));

  const wrong = [].concat(res.chit, res.muster).filter(r => r.date !== s.date);
  check('EVERY row of the correction carries the chit\'s own day, not today',
    wrong.length === 0, wrong.length ? JSON.stringify(wrong.slice(0, 4)) : 'all on ' + s.date);
  check('and none of them landed on today — that is what made 17 Nov disappear',
    ![].concat(res.chit, res.muster).some(r => r.date === s.today), 'today is ' + s.today);
  check('the chit row still replaces the old one, so nothing is duplicated (Rule 4)',
    res.chit.length > 0 && res.chit.every(r => r.replaces === 'rcOLD'), JSON.stringify(res.chit));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();

  // The rule in the source: the date is copied for EVERY correction, not only a clerk-asked one.
  const ms = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
  const body = ms.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  check('fixDraft copies the chit\'s date unconditionally',
    /var d = blankDraft\(\);\s*\n\s*d\.date = c\.date;/.test(body), 'd.date = c.date');
  check('and the clerk-asked flag no longer carries the date with it',
    !/if \(ask\) \{ d\.date = c\.date;/.test(body), 'the old coupling is gone');
  check('both correction paths go through fixDraft, so neither can drift',
    /function startFix\(c, ask\) \{ draft = fixDraft\(c, ask\);/.test(body) && /fixDraft\(c, null\)/.test(body), 'startFix + markAway');
})();
