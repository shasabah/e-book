// ---------------- office one-off: close Sugut 13 and 16 Nov from the office ----------------
// Yu Chen, 24 Nov 2026: "create message for sugut team regarding above and close what you able".
// Same cause as close-sugut-9nov.gs. On Ferezelly's phone the 13 and 16 Nov chits lack the two men who started on
// 12 Nov (SSGTB261104, SSGTB261105): the office added them on 18 Nov, and the phone never takes chits from the
// office. Both days are past the 5-day window, so the red line has no button.
// The office book passes every check on both days (read 24 Nov, traced against the app's own worker list):
//   13 Nov · 25 on the list, 20 present, each with a work line; 541 bunches, all collected (4-25 to 4-30, cleared);
//            one lorry, DN 8537; 9 jobs, all done.
//   16 Nov · 25 on the list, 21 present, each with a work line; 645 bunches, all collected (3-1, 3-2, 3-5 on 17 Nov;
//            4-4 and 4-7 cleared on 20 Nov); one lorry, DN 8539; 10 jobs, 8 done, 2 not done with a reason.
// Both days are inside the office's 14-day answer, so the phone learns they are closed. New rows only (Rule 4).
// closeSugut13and16Nov() only checks. closeSugut13and16NovWrite() writes. Running it again changes nothing.
function closeSugut13and16Nov(write) {
  var was = PRACTICE_, out = { book: '', write: !!write, days: {} };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null; CLOSED_MEMO_ = null;
    var ss = book_(), now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    var DAYS = [
      { date: '2026-11-13', chit: 'MC-SSGT-P13-20261113-1', workers: 25, present: 20, bunches: 541, done: 9, planned: 9, lorries: 1,
        checks: '1✓ 20 orang · semua ada kerja hari ini | 2✓ 541 tandan dituai · semua ke ramp | 3✓ 1 lori keluar, semua ada DN | 4✓ 9/9 kerja siap' },
      { date: '2026-11-16', chit: 'MC-SSGT-P13-20261116-1', workers: 25, present: 21, bunches: 645, done: 8, planned: 10, lorries: 1,
        checks: '1✓ 21 orang · semua ada kerja hari ini | 2✓ 645 tandan dituai · semua ke ramp | 3✓ 1 lori keluar, semua ada DN | 4✓ 8/10 kerja siap · sebab ditulis' }
    ];
    var chits = {}; standingRows_('FH_CHIT', 'SSGT').forEach(function (r) { chits[String(r.date).slice(0, 10) + '|' + r.chit] = true; });
    var cl = dayCloses_('SSGT'), sh = roomTab_(ss, 'FH_DAYCLOSE'), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    DAYS.forEach(function (d) {
      var o = out.days[d.date] = { chit: !!chits[d.date + '|' + d.chit], already: !!(cl[d.date] && cl[d.date].closed), wrote: false };
      if (!o.chit || o.already || !write) return;
      var row = { id: 'OFC-SSGT-DC-' + d.date.replace(/-/g, ''), date: d.date, company: 'SPLT', estate: 'SSGT', keyed_by: 'OWNER-FIX', keyed_at: now,
        phone: 'OFFICE', status: 'active', replaces: '', chit: d.chit, kind: 'close', closed_by: 'OWNER-FIX', closed_at: now, checks: d.checks,
        workers: d.workers, present: d.present, bunches: d.bunches, jobs_done: d.done, jobs_planned: d.planned, lorries: d.lorries, received_at: now,
        note: 'Ditutup oleh pejabat 24/11 (sah Yu Chen): chit di telefon tiada 2 pekerja baru yang pejabat tambah 18/11; hari lebih 5 hari.' };
      sh.appendRow(head.map(function (k) { return plain(row[k] === undefined ? '' : row[k]); }));
      o.wrote = true;
    });
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; CLOSED_MEMO_ = null; if (write) newGen_(); }
  Logger.log('closeSugut13and16Nov: ' + JSON.stringify(out));
  return out;
}
function closeSugut13and16NovWrite() { return closeSugut13and16Nov(true); }
