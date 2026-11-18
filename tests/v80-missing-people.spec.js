// E-Book test (1.73). "Belum lengkap": a person with no quantity is ASKED, never assumed absent.
// Yu Chen, 18 Nov 2026, after Ferezelly could not close 17 Nov — "Sy belum boleh tutup harvester tidak turun
// mw ubah absen dahulu": the save refused every person with no number and gave him no way to mark one away,
// so the only way out of the screen was to type a number nobody knew. That is where "1 tandan" came from.
// His rule for the fix: "it might be miss out. so ask him quatity of work or absent."
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const wk = fs.readFileSync(path.join(root, 'rooms', 'field', 'work.js'), 'utf8');
const ms = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'core', 'look.css'), 'utf8');

// 1 · the card exists and asks both ways
check('Kerja collects everyone with no quantity', /function missingPeople\(jobs\)/.test(wk), 'missingPeople');
check('the card offers T, S and C, not one lump "absent"',
  /var AWAY_MARKS = \[\['T', 'Tidak hadir', 'Absent'\], \['S', 'Sakit', 'Sick'\], \['C', 'Cuti', 'Leave'\]\]/.test(wk), 'three marks');
check('the card says a blank does not mean absent',
  /Kosong bukan bermakna tidak hadir/.test(wk) && /Blank does not mean absent/.test(wk), 'the wording');
check('a day worker gets 1 and ½, not a number box', /data-mq="' \+ esc\(m\.w\) \+ '" data-v="0\.5"/.test(wk), '1 / half');
check('each person keeps his own unit', /k === 'bunches' \? EA\.t\('tandan'/.test(wk), 'unit');

// 2 · the save is never refused for a missing quantity (15 Nov rule: do not push the staff to invent numbers)
check('a missing quantity no longer sits in the blocking list',
  !/belum lengkap untuk/.test(wk), 'the old blocking line is gone');
check('the card is shown once, then the save carries on',
  /function check\(jobs, skipMissing\)/.test(wk) && /if \(!skipMissing\) \{ var miss = missingPeople\(jobs\); if \(miss\.length\) \{ askMissing\(jobs, miss\); return; \} \}/.test(wk)
  && /check\(jobs, true\);/.test(wk), 'skipMissing');
check('a person with no LOT does still stop the save — the app cannot guess the lot',
  /tekan petak untuk/.test(wk), 'noLot still blocks');

// 3 · the away marks go onto the chit through the chit's own correction (Rule 5), not a second copy
check('one function owns a chit correction, in the chit screen', /EA\.fh\.markAway = function \(chitId, marks\)/.test(ms), 'markAway');
check('it reuses the same correction draft BETULKAN uses', /function fixDraft\(c, ask\)/.test(ms)
  && /function startFix\(c, ask\) \{ draft = fixDraft\(c, ask\);/.test(ms), 'fixDraft shared');
check('it writes through the same save, so nothing is deleted (Rule 4)', /\n      save\(true\);/.test(ms), 'save(true)');
check('that save does not drag the staff off the Kerja screen', /if \(quiet\) return;\n    render\(el, ctx\);/.test(ms), 'quiet');
check('all the marks go in one correction, so the chit gets one new version, not one per person',
  /marks\.forEach\(function \(m\) \{[\s\S]{0,220}d\.marks\[m\.worker\] = m\.mark; delete d\.jobOf\[m\.worker\]; did\+\+;/.test(ms), 'one version');
check('a chit the staff is part way through making is put back untouched',
  /var keep = draft;/.test(ms) && /catch \(e\) \{ draft = keep; return false; \}/.test(ms), 'draft kept');
check('EA.fh exists before markAway is hung on it', ms.indexOf('EA.fh = EA.fh || {};') < ms.indexOf('EA.fh.markAway'), 'order');

// 4 · the day close still insists, so an unanswered person cannot be quietly forgotten
const dc = fs.readFileSync(path.join(root, 'rooms', 'field', 'dayclose.js'), 'utf8');
check('the close still stops on a person present with no work line',
  /pl\.noLine\.length/.test(dc) && /present with no work line/.test(dc), 'check 1 unchanged');

check('the card has a style', /\.mx-away \{/.test(css) && /\.mx-row \{/.test(css), 'css');
const v = fs.readFileSync(path.join(root, 'core', 'version.js'), 'utf8');


// 5 · a real zero (1.74). "Present and cut nothing" is the commonest thing on a rain day, and until now the
// app had no way to say it: the only exits were a number nobody knew, or marking a man away who was there.
check('a zero is an answer once it carries a reason',
  /function zeroWhy\(w\)/.test(wk) && /num\(v\) === 0 && !!zeroWhy\(w\)/.test(wk), 'answered()');
check('the reason list is the one approved on 11 Nov, not a new one',
  /LOW_WHY\.map\(function \(y, i\) \{ return '<button type="button" class="pick" data-mz=/.test(wk), 'LOW_WHY reused');
check('the question only appears when the number is zero',
  /showZero\(w, v !== '' && num\(v\) === 0\)/.test(wk), 'showZero');
check('typing a real number puts the question away and drops the reason',
  /if \(!on && zeroWhy\(w\)\) \{ delete draft\.zero\[w\]; keepDraft\(\);/.test(wk), 'cleared');
check('a zero with no reason is still unanswered, so it is not saved',
  /if \(num\(v\) === 0 && !zeroWhy\(m\.w\)\) return;/.test(wk), 'no silent zero');
check('marking a man away clears any zero reason he had', /if \(zeroWhy\(w\)\) delete draft\.zero\[w\];/.test(wk), 'away wins');
check('the saved line says why it is zero', /return 'Hadir, tiada hasil: ' \+ zeroWhy\(w\);/.test(wk), 'note');
check('the under-80% note is untouched', /return 'Bawah 80% sasaran: ' \+ draft\.low\[w\];/.test(wk), 'low note kept');
check('the day close counts a zero line as a work line, so the day can close',
  /if \(!ls\.length\) \{ out\.noLine\.push\(r\.worker_id\); return; \}/.test(dc), 'noLine is only a MISSING line');
check('the zero question has a style', /\.mx-zero \{/.test(css), 'css');
check('version 1.74 (122)', /EA\.RELEASE = '1\.74'/.test(v) && /EA\.VERSION = 122/.test(v), 'version');
