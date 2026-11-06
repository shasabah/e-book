// E-Book test (1.51.3). "Chit muster hari ini belum dibuat" is silent on a rest day.
// Yu Chen, 6 Nov 2026: an alert that arrives every Sunday when nothing is wrong teaches the staff to stop
// reading the box. A rest day is Sunday or a day in EA.lists.holidays (the same rule dayclose.js uses).
// Sunday work that was planned still asks for its chit, because that day has a plan.
// Rule 8: made-up staff only, no worker names.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  // The rule is read straight from the page, with today's date forced to each kind of day.
  const r = await p.evaluate(() => {
    const u = { role: 'Staff', code: 'STF-SSGT-01' }, est = 'SSGT';
    const realToday = EA.today, realGet = EA.local.get, out = {};
    const hasChit = (set) => { EA.local.get = (k, d) => (k === 'fh.chits2' ? set : realGet.call(EA.local, k, d)); };
    const run = (date) => { EA.today = () => date; const t = EA.todoItems(u, est); return !!(t && t.items.some(x => x.id === 'CH')); };
    try {
      hasChit([]);                                  // no chit made, any day
      out.sunday = run('2026-11-08');               // Sunday
      out.monday = run('2026-11-09');               // Monday
      out.saturday = run('2026-11-07');             // Saturday
      EA.lists.holidays = ['2026-11-09'];           // HQ keys a holiday on that Monday
      out.holiday = run('2026-11-09');
      EA.lists.holidays = undefined;
      hasChit([{ estate: 'SSGT', date: '2026-11-09' }]);   // chit already made
      out.mondayDone = run('2026-11-09');
    } finally { EA.today = realToday; EA.local.get = realGet; }
    return out;
  });
  check('Sunday: no "chit not made" line', r.sunday === false);
  check('Monday: the line is still raised', r.monday === true);
  check('Saturday is a working day, so the line is raised', r.saturday === true);
  check('a public holiday keyed by HQ is a rest day too', r.holiday === false);
  check('the line goes once the chit is made', r.mondayDone === false);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
