// E-Book test (1.69) a worker is only expected on a chit from the day he started.
// From 17 Nov 2026: Ria registered two Sugut workers on 16 Nov with a start of 12 Nov, and the day close then
// demanded them on every chit back to 2 Nov, so not one day of November could be closed. Ferezelly could not
// fix it either — his phone only offers the last 7 days — so eleven red lines sat on the Owner's board with
// nobody able to clear them. The close now skips a worker whose start date is after the day being closed.
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');

// 1 · the office sends the start date with every worker
const gs = fs.readFileSync(path.join(root, 'server', 'core.gs'), 'utf8');
const people = gs.slice(gs.indexOf('function people_'), gs.indexOf('function people_') + 1400);
check('the office sends each worker his start date', /start: \(st\[r\.worker_id\] && st\[r\.worker_id\]\.start\) \|\| ''/.test(people), 'people_ start');
check('the start date comes from his own "new" line, not from the people list',
  /o\.start = String\(r\.day\)/.test(gs), 'workerStates_ start');

// 2 · the close skips a man hired after the day
const dc = fs.readFileSync(path.join(root, 'rooms', 'field', 'dayclose.js'), 'utf8');
check('the close skips a worker whose start is after the day being closed',
  /if \(w\.start && String\(w\.start\)\.slice\(0, 10\) > c\.date\) return;/.test(dc), 'listed filter');
check('a worker with no start date is still expected every day, as before',
  /w\.start &&/.test(dc), 'blank start unchanged');
check('the Sunday rule is untouched: on a rest day nobody is missing',
  /if \(!rest\) listed\(estate\)/.test(dc), 'rest day');

// 3 · the real case, as arithmetic: a man who started on the 12th is expected on the 12th and after, never before
const started = '2026-11-12';
const expectedOn = d => !(started && started.slice(0, 10) > d);
check('started 12 Nov: not expected on 2, 9 or 11 Nov',
  !expectedOn('2026-11-02') && !expectedOn('2026-11-09') && !expectedOn('2026-11-11'), 'before');
check('started 12 Nov: expected on 12, 13 and 16 Nov',
  expectedOn('2026-11-12') && expectedOn('2026-11-13') && expectedOn('2026-11-16'), 'on and after');

// 4 · the close list reaches as far back as the phone keeps its chits
const mu = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
const keep = (mu.match(/var keepFrom = EA\.dayAgo\((\d+)\)/) || [])[1];
const open = (dc.match(/c\.date < EA\.dayAgo\((\d+)\)\) return;/) || [])[1];
check('the close list goes back as far as the chits are kept, not 7 days',
  keep === open && Number(open) === 40, 'chits kept ' + keep + ' days, close list offers ' + open);
check('an old day still has to pass its checks: the close is unchanged otherwise',
  /state === 'ready'/.test(dc) && /out\.missing\.push\(\{ date: o\.date, bad: st\.bad \}\)/.test(dc), 'checks kept');
