// E-Book test (1.75) a day that is not closed yet is still open on the phone, for 5 days.
//
// Yu Chen, 19 Nov 2026: "check the entired apps, i wan him able to open and close the chit.
// especailly 17 and 18 closing."
//
// Before this, Kerja opened a day only if it was today, yesterday, a chit the clerk had asked to fix AND
// whose work was already saved, or a planned day. A day whose chit was saved but whose work was never keyed
// matched none of them, so it locked after one night. On 19 Nov at Sugut that left Ferezelly able to key
// 18 Nov and nothing else: 17 Nov had a chit and no work, and could not be opened by him, by Ria (her fix ask
// needs saved work to reopen), or by anyone. TUTUP HARI then sat grey behind two checks he could not answer,
// and the red lines told him to ask an office that had no way to do it.
//
// The rule is now the one people already use in their heads: closing is the lock, not the clock.
//   - not closed, within 5 days  → open
//   - closed                     → only the clerk's MINTA BETULKAN CHIT reopens it (24 Oct, kept 19 Nov)
//   - older than 5 days          → the office's
//   - a date ahead (a plan)      → never
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
  await p.waitForTimeout(600);
  const est = await p.evaluate(() => { const e = document.querySelector('#room .brand-sub'); return e ? e.textContent.trim() : ''; });
  check('the practice login opens an estate', !!est, est);

  // Sugut's situation on 19 Nov, rebuilt: a morning chit on each of the last 6 days, no work keyed at all,
  // and one day (2 back) already closed.
  await p.evaluate(e => {
    const people = (typeof EA.lists.people === 'function' ? EA.lists.people(e) : []).slice(0, 3);
    const mk = n => ({ chit: 'CH-' + n, date: EA.dayAgo(n), estate: e, rev: 1, confirmedAt: '06:10',
      chitRowId: 'r' + n, alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-1'], mandor: '' }],
      rows: people.map((w, i) => ({ id: 'x' + n + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '01', lots: '1-1', mandor: '', status: 'active' })) });
    const chits = [mk(1), mk(2), mk(3), mk(4), mk(5), mk(6)];
    chits.push(Object.assign(mk(1), { chit: 'CH-AHEAD', date: EA.dayAhead ? EA.dayAhead(1) : '2099-01-01' }));
    localStorage.setItem('fh.chits2', JSON.stringify(chits));
    localStorage.setItem('fh.work', JSON.stringify([]));
    localStorage.setItem('fh.dayclose', JSON.stringify([{ estate: e, date: EA.dayAgo(2), at: '20:00', chit: 'CH-2' }]));
  }, est);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(900);

  const r = await p.evaluate(() => ({
    rows: (EA.fh.allChits() || []).map(c => ({ d: c.date, open: EA.fh.workChitOpen(c),
      closed: EA.fh.dayclose.isClosed(c.estate, c.date) })),
    txt: document.querySelector('#room').innerText.replace(/\s+/g, ' ')
  }));
  const on = n => (r.rows.find(x => x.d === n) || {});
  const ago = await p.evaluate(() => [0, 1, 2, 3, 4, 5, 6].map(n => EA.dayAgo(n)));

  check('yesterday is open, as before', on(ago[1]).open === true, JSON.stringify(on(ago[1])));
  check('2 days back, NOT closed, no work ever keyed: open (this is 17 Nov)',
    on(ago[3]).open === true && on(ago[3]).closed === false, JSON.stringify(on(ago[3])));
  check('4 days back, not closed: open (this is 15 Nov)', on(ago[4]).open === true, JSON.stringify(on(ago[4])));
  // "5 days" counts today, so on 19 Nov the oldest open day is 15 Nov (4 back). 14 Nov is already the
  // office's. The chit's BETULKAN window reaches exactly the same day — v83 holds the two together.
  check('4 days back is the far edge of the window', on(ago[4]).open === true, JSON.stringify(on(ago[4])));
  check('5 days back: shut, the office\'s', on(ago[5]).open === false, JSON.stringify(on(ago[5])));
  check('6 days back: shut, the office\'s', on(ago[6]).open === false, JSON.stringify(on(ago[6])));
  check('a CLOSED day is shut even though it is only 2 days back (24 Oct rule kept)',
    on(ago[2]).closed === true && on(ago[2]).open === false, JSON.stringify(on(ago[2])));
  check('a date ahead is never keyable', (r.rows.find(x => x.d > ago[0]) || { open: false }).open === false);

  // What Ferezelly actually sees. A closed day is still LISTED — it has to be, or the day he just closed
  // vanishes from Kerja and his work looks lost. Listing it and keying it are two questions: the card says
  // it is closed, and workChitOpen above is what refuses the change.
  const listed = d => r.txt.indexOf(d.slice(8).replace(/^0/, '') + ' ') >= 0;
  check('Kerja lists every day in the window, the closed one included',
    listed(ago[1]) && listed(ago[2]) && listed(ago[3]) && listed(ago[4]), r.txt.slice(0, 260));
  check('Kerja does not list a day past the window', !listed(ago[5]) && !listed(ago[6]), r.txt.slice(0, 260));

  // opening the closed day shows it, and refuses to change it
  await p.evaluate(() => { EA.local.set('fh.workchit', 'CH-2'); location.hash = ''; });
  await p.waitForTimeout(150);
  await p.evaluate(() => { location.hash = 'field-harvest/work'; });
  await p.waitForTimeout(700);
  const shut = await p.evaluate(() => document.querySelector('#room').innerText.replace(/\s+/g, ' '));
  check('opening a closed day says so and sends him to the clerk, instead of opening the form',
    /sudah ditutup/i.test(shut) && /MINTA BETULKAN CHIT/i.test(shut), shut.slice(0, 220));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();

  // the window is one number, in one place
  const wk = fs.readFileSync(path.join(root, 'rooms', 'field', 'work.js'), 'utf8');
  check('the window is read from the chit screen, not written again here (Rule 5)',
    /function windowDays\(\) \{ return EA\.fh && EA\.fh\.FIX_DAYS/.test(wk)
    && /function oldestOpen\(\) \{ return daysAgo\(windowDays\(\) - 1\); \}/.test(wk)
    && !/OPEN_BACK/.test(wk), 'windowDays/oldestOpen');
  check('Kerja asks dayclose whether the day is closed, it does not decide for itself (Rule 5)',
    /EA\.fh\.dayclose\.isClosed\(c\.estate, c\.date\)/.test(wk), 'isClosed');
  const dc = fs.readFileSync(path.join(root, 'rooms', 'field', 'dayclose.js'), 'utf8');
  check('dayclose exports that one check', /isClosed: isClosed/.test(dc) && /function isClosed\(estate, date\)/.test(dc));
})();
