// E-Book test (1.76) the man's own row carries "tidak hadir / tiada kerja".
//
// Yu Chen, 19 Nov 2026 20:24, on 1.75 (123): "Say I wan to change this havestor to no work. No button."
//
// He was right. The T/S/C choice has existed since 1.74, but only appeared AFTER pressing SIMPAN, and only
// for a man whose quantity box was left empty. Standing in front of the name with his thumb on the screen
// there was nothing to press — so the cheap path was to type 1 tandan, which is the fault we have been
// chasing since 17 Nov. The old way out was BETULKAN: leave Kerja, open the morning chit, find the man among
// 25, change H to T, save, come back. Five steps across two screens, in the middle of keying a day's work.
//
// Three faults fixed together, all from that one screenshot:
//   1. no way to say "did not work" on the row
//   2. the Fixing band said "Open for 3 days only" after the window became 5 that afternoon
//   3. an empty quantity box showed a grey 0, so every man looked already answered
//
// The row button is NOT a second way of recording absence. It opens the same card SIMPAN opens and writes
// the same correction to the same morning chit, through EA.fh.markAway. BETULKAN is untouched.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const wk = fs.readFileSync(path.join(root, 'rooms', 'field', 'work.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'core', 'look.css'), 'utf8');

// 1 · the row carries the question
check('every keyable worker row has its own away button',
  /class="link-btn wk-away" data-awayw="/.test(wk) && /askable\(j\) \? '<button type="button" class="link-btn wk-away"/.test(wk),
  'wk-away');
check('it is not drawn where the question makes no sense (ticket, machine hours, auto-shared)',
  /function askable\(j\) \{ var k = kind\(j\.task, j\.block\); return !\(auto\(j\) \|\| k === 'ticket' \|\| isOp\(j\)\); \}/.test(wk),
  'askable');
check('it says both what it is for: not present, or present with nothing done',
  /EA\.t\('tidak hadir \/ tiada kerja', 'absent \/ no work'\)/.test(wk), 'label');

// 2 · it opens the SAME card, for that one man (Rule 5 — no second copy of the question)
check('the row opens the card SIMPAN opens, not a second one',
  /askMissing\(jobs, \[missEntry\(j, b\.dataset\.awayw\)\], b\.dataset\.awayw\)/.test(wk), 'handler');
check('the description of a person who owes an answer is built once',
  /function missEntry\(j, w\) \{/.test(wk) && /out\.push\(missEntry\(j, w\)\);/.test(wk), 'missEntry');
check('opened for one man the card names him instead of counting strangers',
  /var head = one/.test(wk) && /esc\(person\(one\)\)/.test(wk), 'head');
check('the away mark still goes to the morning chit as a correction, as before',
  /EA\.fh\.markAway\(chit\.chit, marks, ctx\.estate\)/.test(wk), 'markAway');
check('the three marks are unchanged: T, S and C are paid differently',
  /\[\['T', 'Tidak hadir', 'Absent'\], \['S', 'Sakit', 'Sick'\], \['C', 'Cuti', 'Leave'\]\]/.test(wk), 'AWAY_MARKS');

// 3 · the band tells the truth about the window
check('the Fixing band reads the window instead of a typed number',
  /var n = windowDays\(\);/.test(wk) && /Boleh dibuat dalam ' \+ n \+ ' hari sahaja/.test(wk)
  && /Open for ' \+ n \+ ' days only/.test(wk), 'fix band');
const code = wk.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
check('no "3 days" left hard-written on any screen',
  !/3 hari sahaja/.test(code) && !/for 3 days only/i.test(code), 'stale wording');

// 4 · blank looks blank
check('an empty quantity box no longer shows a grey 0',
  !/data-f="' \+ \(k === 'bunches' \? 'bunches' : 'qty'\) \+ '" value="[^"]*" placeholder="0"/.test(wk), 'qty placeholder');
check('the card\'s own box too', !/class="text-input mx-qty"[^>]*placeholder="0"/.test(wk), 'mx-qty placeholder');
check('a real zero still needs a reason, unchanged',
  /num\(v\) === 0 && !!zeroWhy\(w\)/.test(wk), 'answered()');

// 5 · it reads as a quiet link, not a second SIMPAN
check('the away link has a style of its own and sits beside + petak lain',
  /\.wk-away \{ margin-left/.test(css) && /\.wrow \.wk-away \{ color/.test(css), 'css');
