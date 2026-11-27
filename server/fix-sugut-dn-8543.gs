// ---------------- office one-off: Sugut DN 8543 filed under the day it was keyed ----------------
// Yu Chen, 27 Nov 2026: "25 Nov missing. Please check what is the issue", with the estate's daily tonnage
// summary (25/11: Boustead, 10.54 MT), then: "above pdf is correct".
//
// What happened. Nothing was lost. The phone files a DN under the day it is KEYED. DN 8543 left on 25 Nov and
// was keyed on 27 Nov at 16:33 (690 bunches, block 03). So 25 Nov read "no lorry" and the DN sat under 27 Nov.
//
// The fix, the same as DN 8540 and 8541 (24 Nov): every standing FH_DISPATCH and FH_DISPATCH_LOT row of DN 8543
// still on 27 Nov gets a new row, the same in every field except the date, which becomes 25 Nov. The new row
// replaces the old one; nothing is deleted (Rule 4). No names here (19 Oct rule: this repository is public).
// fixSugutDn8543() only counts. fixSugutDn8543Write() writes. Running it again changes nothing.
function fixSugutDn8543(write) {
  var was = PRACTICE_, out = { book: '', write: !!write, dispatch: 0, lots: 0, bunches: {}, same: [] };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    var ss = book_(), now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    var DN = { '8543': { from: '2026-11-27', to: '2026-11-25' } };
    function replaceWith_(tab, r, m) {
      var sh = roomTab_(ss, tab), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var row = {}; head.forEach(function (c) { row[c] = r[c] === undefined ? '' : r[c]; });
      row.date = m.to; row.id = String(r.id) + '-D'; row.replaces = r.id; row.status = 'active';
      row.keyed_by = 'OWNER-FIX'; row.keyed_at = now; row.received_at = now; row.phone = 'OFFICE';
      if (head.indexOf('note') >= 0) row.note = (String(r.note || '') ? String(r.note) + ' · ' : '') +
        'Tarikh dibetulkan: dikunci ' + m.from + ', tarikh pada DN ' + m.to + ' (sah Yu Chen 27/11).';
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
  Logger.log('fixSugutDn8543: ' + JSON.stringify(out));
  return out;
}
function fixSugutDn8543Write() { return fixSugutDn8543(true); }
