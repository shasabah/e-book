// ---------------- v1.87 office one-off: Sugut 17 and 18 Nov work saved under 21 Nov ----------------
// Yu Chen, 23 Nov 2026: "Please check 17,18 had data in the apps or never key in", then "Yes" to the correction.
//
// What happened. On 21 Nov at 09:01 and 09:04 Ferezelly corrected the 17 and 18 Nov chits, and a fault of that
// day (fixed in 1.81, see fixDraft in rooms/field/muster.js) wrote each corrected chit onto TODAY, 21 Nov. He then
// keyed the work of those two days, and the work took its date from the chit: 27 work lines, 15 job lines and
// the 2 ITF collections the work makes were saved dated 21 Nov, though their chit is the 17 or 18 Nov chit.
// The chits were put back on their days by the office at 13:17 the same day; the work was not.
// So 17 and 18 Nov showed no work and could not close, and 21 Nov carried three days of work.
//
// The fix. Every standing FH_WORK and FH_JOBDAY row whose chit is the 17 or 18 Nov chit but whose date is 21 Nov,
// and the two "Kerja ITF siap" collections of 18 Nov, get a new row: the same in every field except the date,
// which becomes the chit's own date. The new row replaces the old one; nothing is deleted (Rule 4).
// No worker names here (19 Oct rule: this repository is public); the rows are read from the sheet.
// Run once. Running it again changes nothing (the old rows no longer stand).
function fixSugut17and18Nov() {
  var was = PRACTICE_, out = { book: '', work: 0, jobs: 0, collect: 0, same: [] };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    var ss = book_(), now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    var CHIT_DAY = { 'MC-SSGT-P13-20261117-1': '2026-11-17', 'MC-SSGT-P13-20261118-1': '2026-11-18' };
    var WRONG = '2026-11-21';
    function why_(day) { return 'Tarikh dibetulkan: dikunci 21/11 bawah chit ' + day.slice(8, 10) + '/11, sepatutnya ' + day + ' (sah Yu Chen 23/11).'; }
    function replaceWith_(tab, r, day) {
      var sh = roomTab_(ss, tab), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var row = {}; head.forEach(function (c) { row[c] = r[c] === undefined ? '' : r[c]; });
      row.date = day; row.id = String(r.id) + '-D'; row.replaces = r.id; row.status = 'active';
      row.keyed_by = 'OWNER-FIX'; row.keyed_at = now; row.received_at = now; row.phone = 'OFFICE';
      if (head.indexOf('note') >= 0) row.note = (String(r.note || '') ? String(r.note) + ' · ' : '') + why_(day);
      sh.appendRow(head.map(function (c) { return plain(row[c] === undefined ? '' : row[c]); }));
    }
    ['FH_WORK', 'FH_JOBDAY'].forEach(function (tab) {
      standingRows_(tab, 'SSGT').forEach(function (r) {
        var day = CHIT_DAY[String(r.chit || '')];
        if (!day || String(r.date).slice(0, 10) !== WRONG) return;
        replaceWith_(tab, r, day);
        if (tab === 'FH_WORK') out.work++; else out.jobs++;
      });
    });
    // The two collections the 18 Nov ITF work made ("Kerja ITF siap", lots 3-9 and 3-11, keyed 21 Nov 09:04).
    standingRows_('FH_COLLECT', 'SSGT').forEach(function (r) {
      if (String(r.date).slice(0, 10) !== WRONG || String(r.note || '') !== 'Kerja ITF siap') return;
      if (String(r.keyed_at).slice(0, 13) !== '2026-11-21 09') return;
      if (['3-9', '3-11'].indexOf(String(r.lot)) < 0) return;
      replaceWith_('FH_COLLECT', r, '2026-11-18'); out.collect++;
    });
    if (!out.work && !out.jobs && !out.collect) out.same.push('tiada baris untuk dibetulkan (sudah dibuat?)');
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; newGen_(); }
  Logger.log('fixSugut17and18Nov: ' + JSON.stringify(out));
  return out;
}
