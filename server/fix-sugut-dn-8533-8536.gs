// ---------------- office one-off: Sugut DN 8533 to 8536 filed under the day they were keyed ----------------
// Yu Chen, 24 Nov 2026, the dates on the DN papers: "8534 (7/11), 8536 (12/11), 8535(8/11), 8533(4/11)".
// Same fault and same fix as fix-sugut-dn-8540-8541.gs: the phone filed each DN under the day it was KEYED
// (8533, 8534, 8535 all keyed 10 Nov; 8536 keyed 13 Nov). Found by cross-checking the estate's tonnage book.
// New rows on the DN paper's date; the old rows stay, marked replaced (Rule 4). No names (public repository).
// fixSugutDn8533to8536() only counts. fixSugutDn8533to8536Write() writes. Running it again changes nothing.
function fixSugutDn8533to8536(write) {
  var was = PRACTICE_, out = { book: '', write: !!write, dispatch: 0, lots: 0, bunches: {}, same: [] };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    var ss = book_(), now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    var DN = { '8533': { from: '2026-11-10', to: '2026-11-04' }, '8534': { from: '2026-11-10', to: '2026-11-07' }, '8535': { from: '2026-11-10', to: '2026-11-08' }, '8536': { from: '2026-11-13', to: '2026-11-12' } };
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
  Logger.log('fixSugutDn8533to8536: ' + JSON.stringify(out));
  return out;
}
function fixSugutDn8533to8536Write() { return fixSugutDn8533to8536(true); }
