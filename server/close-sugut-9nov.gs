// ---------------- office one-off: close Sugut 9 Nov from the office ----------------
// Yu Chen, 24 Nov 2026: "ferezelly trying to fix 9 nov issue but he cant press the button to office", then
// "trace from the apps no guess", "we help him to get rid on it".
//
// Traced with the app's own list (EA.lists.workersFor, signed in, build 138): two harvesters, SSGTB261101 and
// SSGTB261102, start on 7 Nov, so the close expects them on 9 Nov. The office put them on the 9 Nov chit on
// 13 Nov (OFC-SSGT-20261113-27, -29, with their harvest lines). But the phone never takes chits from the office:
// rooms/field/muster.js chits() reads only what the phone itself saved. So on Ferezelly's phone the 9 Nov chit
// still lacks the two men, line 1 reads "2 orang dalam senarai tiada dalam chit", and the day is 15 days old,
// past the 5-day window, so the line has no button and says "minta pejabat". The 19 Nov rule: older than five
// days is the office's.
//
// The office book for 9 Nov passes every check (read 24 Nov): 21 present, each with a work line; 702 bunches
// harvested, all collected (4-1, 4-2, 4-4 cleared; 4-3 220 of 220; 4-5 116 cleared on 14 Nov); no lorry; 7 jobs,
// 5 done and 2 not done with a reason. So the office writes the close, as a new row (Rule 4). The phone then
// reads the day as closed and drops it from its list.
// closeSugut9Nov() only checks. closeSugut9NovWrite() writes. Running it again changes nothing.
function closeSugut9Nov(write) {
  var was = PRACTICE_, out = { book: '', write: !!write, chit: '', already: false, wrote: false };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null; CLOSED_MEMO_ = null;
    var ss = book_(), now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    var DAY = '2026-11-09', CHIT = 'MC-SSGT-P13-20261109-1';
    standingRows_('FH_CHIT', 'SSGT').forEach(function (r) { if (String(r.date).slice(0, 10) === DAY && String(r.chit) === CHIT) out.chit = CHIT; });
    var c = dayCloses_('SSGT')[DAY]; out.already = !!(c && c.closed);
    if (out.chit && !out.already && write) {
    var sh = roomTab_(ss, 'FH_DAYCLOSE'), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var row = { id: 'OFC-SSGT-DC-20261109', date: DAY, company: 'SPLT', estate: 'SSGT', keyed_by: 'OWNER-FIX', keyed_at: now,
      phone: 'OFFICE', status: 'active', replaces: '', chit: CHIT, kind: 'close', closed_by: 'OWNER-FIX', closed_at: now,
      checks: '1✓ 21 orang · semua ada kerja hari ini | 2✓ 702 tandan dituai · semua ke ramp | 3✓ Tiada lori hari ini | 4✓ 5/7 kerja siap · sebab ditulis',
      workers: 23, present: 21, bunches: 702, jobs_done: 5, jobs_planned: 7, lorries: 0, received_at: now,
      note: 'Ditutup oleh pejabat 24/11 (sah Yu Chen): chit di telefon tiada 2 penuai baru yang pejabat tambah 13/11; hari lebih 5 hari.' };
    sh.appendRow(head.map(function (k) { return plain(row[k] === undefined ? '' : row[k]); }));
    out.wrote = true;
    }
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; CLOSED_MEMO_ = null; if (write) newGen_(); }
  Logger.log('closeSugut9Nov: ' + JSON.stringify(out));
  return out;
}
function closeSugut9NovWrite() { return closeSugut9Nov(true); }

// Part 2, found after the close was written. The phone learns which days are closed from the office's
// 'dayclose' answer (dayCloseRead_), and that answer covers only the last 14 days. 9 Nov is 15 days old on
// 24 Nov, so the close written above never reaches the phone; the phone keeps 9 Nov in its list because its
// own window starts at the trial start the office sends ('from', DAYCLOSE_FROM, default 2026-11-09).
// So the trial's close start moves to 10 Nov. 9 Nov is closed in the book; nothing is lost. Script property
// only, no deployment; the default in core.gs is unchanged and the property can be removed to undo it.
function setSugutCloseFrom10Nov() {
  var before = dayCloseFrom_();
  PropertiesService.getScriptProperties().setProperty('DAYCLOSE_FROM', '2026-11-10');
  var after = dayCloseFrom_();
  Logger.log('DAYCLOSE_FROM: ' + before + ' -> ' + after);
  return { before: before, after: after };
}
