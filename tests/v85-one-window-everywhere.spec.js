// E-Book test (1.76) the chit-correction window is written once, and no screen names a number of its own.
//
// Yu Chen, 19 Nov 2026 20:40: "check all over again and see any error or bug need to be fix."
//
// The window went 3 -> 5 that afternoon in muster.js, work.js and server/core.gs. Four MORE places still held
// their own EA.dayAgo(3), and six sentences still told the staff "3 hari". None of it showed up as a test
// failure, because every one of them was a number typed into a different file.
//
//   history.js   canAsk       the clerk's own MINTA BETULKAN CHIT button vanished after 3 days, so Ria could
//                             not ask for a fix on a day Ferezelly was still allowed to make
//   muster.js    draft keep   a half-finished correction older than 3 days was thrown away on leaving
//   muster.js    fixGo        opening the chit the clerk asked about said "Chit ini tiada di telefon ini
//                             (atau lebih 3 hari)" — telling the staff a chit does not exist when it does
//   home.js      day_closed   told him corrections were open for 3 days
//   history.js   too_old      the office's own refusal message named 3 days
//   dayclose.js               the line under TUTUP HARI named 3 days
//
// The lesson of the whole day in one test: a number that means a rule belongs in one place, and a sentence
// that quotes it must read it, not repeat it.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const strip = s => s.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

const mus = read('rooms/field/muster.js'), his = read('rooms/field/history.js');
const dcl = read('rooms/field/dayclose.js'), hom = read('core/home.js'), wrk = read('rooms/field/work.js');

// 1 · one definition, one derived date
check('the window is declared once, on the chit screen',
  (mus.match(/var FIX_DAYS = \d+;/g) || []).length === 1, 'FIX_DAYS');
check('the oldest day still open to a correction is derived there and exported',
  /EA\.fh\.fixFrom = function \(\) \{ return EA\.dayAgo\(FIX_DAYS - 1\); \};/.test(mus), 'fixFrom');
check('Kerja derives its own from the same number, counting today',
  /function oldestOpen\(\) \{ return daysAgo\(windowDays\(\) - 1\); \}/.test(wrk), 'oldestOpen');

// 2 · nobody writes their own
const files = { 'muster.js': mus, 'history.js': his, 'dayclose.js': dcl, 'home.js': hom, 'work.js': wrk };
const ownWindow = Object.entries(files).filter(([n, s]) => /(?:EA\.)?day[sA]?Ago\(3\)/.test(strip(s))).map(x => x[0]);
check('no screen writes its own 3-day window any more', ownWindow.length === 0, ownWindow.join(', '));
check('the clerk may ask for as far back as the staff may key',
  /d\.date >= \(EA\.fh\.fixFrom \? EA\.fh\.fixFrom\(\) : EA\.dayAgo\(4\)\)/.test(his), 'canAsk');
check('a half-finished correction is kept as long as the correction is allowed',
  /\(d\.fixAsk && d\.date >= EA\.fh\.fixFrom\(\)\)/.test(mus), 'draft keep');
check('opening the chit the clerk asked about uses the same window',
  /if \(fc && fc\.date >= EA\.fh\.fixFrom\(\)\)/.test(mus), 'fixGo');

// 3 · no sentence quotes a number of its own
const DAYS = /\b3\s*(hari|days)\b/i;
const EXEMPT = /berturut|in a row|terakhir tiada|last 3 days away|Absent 3/i;   // the absence-streak rule is a real 3
const named = [];
Object.entries(files).forEach(([n, s]) => {
  strip(s).split('\n').forEach((l, i) => {
    if (!DAYS.test(l) || EXEMPT.test(l)) return;
    named.push(n + ':' + (i + 1));
  });
});
check('no screen sentence hard-writes "3 hari" or "3 days"', named.length === 0, named.join(' '));
check('the sentences read the number instead',
  /dalam ' \+ \(EA\.fh && EA\.fh\.FIX_DAYS \|\| 5\) \+ ' hari/.test(dcl)
  && /dalam ' \+ \(EA\.fh && EA\.fh\.FIX_DAYS \|\| 5\) \+ ' hari/.test(hom)
  && /lebih ' \+ \(EA\.fh && EA\.fh\.FIX_DAYS \|\| 5\) \+ ' hari/.test(his), 'interpolated');

// 4 · the absence-streak 3 is a different rule and is left alone
check('the "3 days in a row" absence flag is untouched — it is not this window',
  /T 3 hari berturut/.test(mus) && /last \(2\)|slice\(0, 2\)/.test(mus), 'lariFlag');

// 5 · a sheet title is not a button, so it must carry its own two languages
check('the ask-to-fix sheet title uses the bm/en spans, not a button\'s <small>',
  /<h2 id="sheet-title"><span class="bm">Minta betulkan chit<\/span>/.test(his)
  && !/<h2 id="sheet-title">ASK TO FIX THIS CHIT<small>/.test(his), 'sheet title');
