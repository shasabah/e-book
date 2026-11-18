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

// 5 · a chit can be corrected for 3 days, not only today (Ferezelly, 18 Nov 2026: "tiada button ubah absen")
// He found two men had not turned up when he keyed the work next morning. By then the chit was yesterday's and
// the card only ever listed today's, so BETULKAN was gone and he put 1 tandan instead. The office already lets
// a chit be fixed for FIX_DAYS; the staff's own screen now matches it.
const ms = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
check('the chit card offers the last 3 days, not only today',
  /var FIX_DAYS = 3;/.test(ms) && /function fixableChits\(\)/.test(ms) && /c\.date >= from && c\.date <= EA\.today\(\)/.test(ms), 'fixableChits');
check('the same window as the office allows a chit to be fixed in',
  (gs.match(/var FIX_DAYS = (\d+);/) || [])[1] === (ms.match(/var FIX_DAYS = (\d+);/) || [])[1], 'phone and office agree');
check('BETULKAN opens whichever of those days was tapped, not today\'s',
  /var c = fixableChits\(\)\.find/.test(ms), 'handler');
check('each line names its day, now that the card holds more than one',
  /esc\(dayDm\(c\.date\)\)/.test(ms), 'day on the line');
check('today is still first in the list', /return a\.date < b\.date \? 1 : -1;/.test(ms), 'newest first');

// 6 · the rain reading at the close belongs to the day being closed, and the card says which day
// (Ferezelly, 18 Nov 2026: he closed 17 Nov on the morning of 18 Nov, read "Hujan siang ini" as the day
// before, and keyed 16 Nov's 13 mm where 17 Nov's 35 mm belonged.)
check('the rain card no longer says "ini" (today)', !/'Hujan siang ini'/.test(dc), 'Hujan siang ini is gone');
check('the rain card names the day being closed',
  /function rainDayCard\(d, fromWork, date\)/.test(dc) && /var day = date \? niceDate\(date\) : '';/.test(dc)
  && /'Hujan hari ' \+ day/.test(dc), 'rainDayCard takes the date');
check('the screen passes the day being closed to the card',
  /rainDayCard\(d, wr\.lots > 0 && d\.rainTime === '06-12', day\.date\)/.test(dc), 'caller');
check('the hint says the rain is that day\'s, not today\'s',
  /Hujan pada hari yang ditutup, bukan hari ini/.test(dc), 'hint');
check('check 8 names the day too', /'Hujan ' \+ rday \+ ' belum dijawab'/.test(dc), 'check 8');
check('the office can put 17 Nov right', /function fixSugutRain17Nov\(\)/.test(gs) && /row\.rain_mm = 35;/.test(gs), 'one-off');
check('the office does not key 16 Nov for the staff',
  !/'2026-11-16'[\s\S]{0,400}rain_mm/.test(gs.slice(gs.indexOf('function fixSugutRain17Nov'))), '16 Nov left to Ferezelly');
check('the 17 Nov fix replaces, never deletes (Rule 4)',
  /row\.replaces = c\.id; row\.status = 'active';/.test(gs.slice(gs.indexOf('function fixSugutRain17Nov'))), 'replaces');
