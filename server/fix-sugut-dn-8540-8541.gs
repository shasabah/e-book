// ---------------- office one-off: Sugut DN 8540 and 8541 filed under the day they were keyed ----------------
// Yu Chen, 24 Nov 2026: "ferezelly told me that 21 nov he had log the DN in ebook but it lost now", then, with
// the estate's tonnage book to cross-check and the dates read off the DN papers: "8540 (19/11), 8541 (21/11)".
//
// What happened. Nothing was lost. The phone files a DN under the day it is KEYED. DN 8540 left on 19 Nov and
// was keyed on 20 Nov at 08:07; DN 8541 left on 21 Nov and was keyed on 23 Nov at 06:52. So 19 and 21 Nov read
// "no lorry", and the two DNs sat under 20 and 23 Nov. The tonnage book and E-Book hold the same eleven DOs
// for November (8532 to 8542); only these two sat on a different day.
//
// The fix. Every standing FH_DISPATCH and FH_DISPATCH_LOT row of those two DNs that is still on the keyed day
// gets a new row: the same in every field except the date, which becomes the date on the DN paper. The new row
// replaces the old one; nothing is deleted (Rule 4). No names here (19 Oct rule: this repository is public).
// fixSugutDn8540and8541() only counts. fixSugutDn8540and8541Write() writes. Running it again changes nothing.
function fixSugutDn8540and8541(write) {
  var was = PRACTICE_, out = { book: '', write: !!write, dispatch: 0, lots: 0, bunches: {}, same: [] };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    var ss = book_(), now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    var DN = { '8540': { from: '2026-11-20', to: '2026-11-19' }, '8541': { from: '2026-11-23', to: '2026-11-21' } };
    function replaceWith_(tab, r, m) {
      var sh = roomTab_(ss, tab), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var row = {}; head.forEach(function (c) { row[c] = r[c] === undefined ? '' : r[c]; });
      row.date = m.to; row.id = String(r.id) + '-D'; row.replaces = r.id; row.status = 'active';
      row.keyed_by = 'OWNER-FIX'; row.keyed_at = now; row.received_at = now; row.phone = 'OFFICE';
      if (head.indexOf('note') >= 0) row.note = (String(r.note || '') ? String(r.note) + ' · ' : '') +
        'Tarikh dibetulkan: dikunci ' + m.from + ', tarikh pada DN ' + m.to + ' (sah Yu Chen 24/11).';
      sh.appendRow(head.map(function (c) { return plain(row[c] === undefined ? '' : row[c]); }));
    }
    ['FH_DISPATCH', 'FH_DISPATCH_LOT'].forEach(function (tab) {
      standingRows_(tab, 'SSGT').forEach(function (r) {
        var dn = String(r.dn_no || ''), m = DN[dn];
        if (!m || String(r.date).slice(0, 10) !== m.from) return;
        if (tab === 'FH_DISPATCH') { out.dispatch++; out.bunches[dn] = (out.bunches[dn] || 0) + Number(r.bunches || 0); } else out.lots++;
        if (write) replaceWith_(tab, r, m);
      });
    });
    if (!out.dispatch && !out.lots) out.same.push('tiada baris untuk dibetulkan (sudah dibuat?)');
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; if (write) newGen_(); }
  Logger.log('fixSugutDn8540and8541: ' + JSON.stringify(out));
  return out;
}
function fixSugutDn8540and8541Write() { return fixSugutDn8540and8541(true); }
