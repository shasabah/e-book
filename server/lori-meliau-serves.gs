/** One-off, 1.111 (Brief_Lori_Meliau, Yu Chen 27 Nov 2026 "sign … lorry"): Meliau's two lorries serve Meliau.
 *  For each of SS6586X and SS2797L a new LIST_MACHINES row replaces the standing one (Rule 4: nothing is changed
 *  in place), the same in every column, with serves = MELU. Live and practice sheets, like seedMachines.
 *  Run setMeluLorriesServeCount first (writes nothing), then setMeluLorriesServe. Safe to run twice. */
function setMeluLorriesServeCount() { return meluServe_(false); }
function setMeluLorriesServe() { return meluServe_(true); }
function meluServe_(write) {
  var was = PRACTICE_, out = [];
  try {
    [false, true].forEach(function (pr) {
      PRACTICE_ = pr; BOOK_ = null; ROWS_MEMO_ = null;
      var now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
      var rows = readRows_('LIST_MACHINES', null).standing, sh = write ? roomTab_(book_(), 'LIST_MACHINES') : null;
      var head = sh ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : null;
      ['SS6586X', 'SS2797L'].forEach(function (reg) {
        var r = rows.filter(function (x) { return String(x.reg_no).toUpperCase() === reg; })[0];
        if (!r) { out.push((pr ? 'latihan ' : 'live ') + reg + ': tiada'); return; }
        if (String(r.serves || '').toUpperCase().indexOf('MELU') >= 0) { out.push((pr ? 'latihan ' : 'live ') + reg + ': sudah MELU'); return; }
        var n = {}; Object.keys(r).forEach(function (k) { n[k] = r[k]; });
        n.id = String(r.id) + '-S1'; n.replaces = String(r.id); n.serves = 'MELU'; n.keyed_by = 'OWNER'; n.keyed_at = now; n.received_at = now; n.phone = 'OFFICE';
        n.note = String(r.note || '') + ' · Melayani MELU (Brief_Lori_Meliau, 27.11.2026)';
        if (write) sh.appendRow(head.map(function (c) { return plain(n[c] === undefined ? '' : n[c]); }));
        out.push((pr ? 'latihan ' : 'live ') + reg + (write ? ': ditulis' : ': akan ditulis'));
      });
    });
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; }
  Logger.log(out.join(' | '));
  return out;
}
