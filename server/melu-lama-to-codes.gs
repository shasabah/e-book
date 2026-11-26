// ---------------- office one-off: Meliau harvest days under "Pekerja lama" codes moved to the men's real codes ----------------
// Yu Chen, 26 Nov 2026: "ok" — to moving the earlier days of six Meliau harvesters to their own codes.
// The 19 Nov history load put each short name in the bunches book that had no single match on the worker list under a
// new "Pekerja lama" code (MELUB2611xx, active N). On 26 Nov the estate's own lists were loaded, and six of those short
// names now match exactly one worker each (the 19 Nov rule: the only worker with that first name). So their days move.
// A hole beats a guess: a short name in January is not proof of the man who joined in October. Only the days on or
// after the real worker's own join date (his "new" line in WORKER_LOG) are moved; earlier days stay under the Pekerja
// lama code, untouched, and are counted in the log. Each moved day is a new row under the real code that replaces the
// old one (Rule 4); nothing is deleted. Codes only, no names (this repository is public).
// moveMeluLama() only counts. moveMeluLamaWrite() writes. A second run moves nothing more.
var MELU_LAMA_TO_CODE_ = { MELUB261121: 'MELUSC260904', MELUB261126: 'MELUSC261003', MELUB261127: 'MELUSC261004',
  MELUB261129: 'MELUSC261006', MELUB261130: 'MELUSC261008', MELUB261131: 'MELUSC261101' };
function moveMeluLama(write) {
  var was = PRACTICE_, out = { book: '', write: !!write, moved: 0, bunches: 0, before: 0, clash: 0, per: {} };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    var ss = book_(), est = 'MELU', now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    var start = {};
    readRows_('WORKER_LOG', est).all.forEach(function (r) {
      if (String(r.kind) === 'new' && String(r.status) === 'active') { var w = String(r.worker_id), d = String(r.day || r.date).slice(0, 10); if (!start[w] || d < start[w]) start[w] = d; }
    });
    var sh = roomTab_(ss, 'FH_WORK'), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], rows = [];
    var all = standingRows_('FH_WORK', est), have = {};
    all.forEach(function (r) { have[String(r.worker_id) + '|' + String(r.date).slice(0, 10) + '|' + r.task_code] = true; });
    all.forEach(function (r) {
      var lama = String(r.worker_id), real = MELU_LAMA_TO_CODE_[lama];
      if (!real) return;
      var d = String(r.date).slice(0, 10), p = out.per[lama] = out.per[lama] || { real: real, start: start[real] || '?', moved: 0, before: 0, first: '', last: '' };
      if (!start[real] || d < start[real]) { out.before++; p.before++; return; }
      if (have[real + '|' + d + '|' + r.task_code]) { out.clash++; return; }
      have[real + '|' + d + '|' + r.task_code] = true;
      out.moved++; p.moved++; out.bunches += Number(r.bunches) || 0;
      if (!p.first || d < p.first) p.first = d; if (!p.last || d > p.last) p.last = d;
      var row = {}; head.forEach(function (c) { row[c] = r[c] === undefined ? '' : r[c]; });
      row.id = String(r.id) + '-K'; row.replaces = r.id; row.worker_id = real; row.status = 'active';
      row.keyed_by = 'OWNER-FIX'; row.keyed_at = now; row.received_at = now; row.phone = 'OFFICE';
      row.note = (String(r.note || '') ? String(r.note) + ' · ' : '') + 'Kod pekerja dibetulkan 26/11: ' + lama + ' (Pekerja lama) → ' + real + ' (senarai Meliau), sah Yu Chen.';
      rows.push(head.map(function (c) { return plain(row[c] === undefined ? '' : row[c]); }));
    });
    if (write && rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; if (write) newGen_(); }
  Logger.log('moveMeluLama: ' + JSON.stringify(out));
  return out;
}
function moveMeluLamaWrite() { return moveMeluLama(true); }
