// ---------------- office one-off: Meliau lorries 19-25 Nov 2026, from HQ's tonnage book ----------------
// Yu Chen, 26 Nov 2026: "up load to meliau", with HQ's TONNAGE MELU (sheet NOV26, 68 lorries to 25 Nov).
// Checked first against the live sheet: 1-18 Nov (50 lorries, 262.44 MT) were loaded on 19 Nov by importMeliau2026
// and equal the book; nothing after 18 Nov was in the book. So only 19-25 Nov are loaded here: 18 lorries,
// 108.39 MT; with 1-18 Nov that is 370.83 MT, equal to the book's to-date. Meliau's trial starts on the phones
// today (26 Nov), so these are the last paper days: keyed_by IMPORT, noted "Data lama", as before.
// The same rules as importMeliau2026 (melu-old-2026.gs), which this reuses: MELU_MILLS_ for the mill names and
// MELU_OLD_NAMES_ (the office project's own file, never on GitHub) for the driver's name (D1). No names here.
// Every lorry carries one block in the book's block column and its tonnes under that one block, so the whole load
// goes to that block. Two lorries write a different figure under the block than the nett (8199: 6.89 against 6.81;
// 7701: 6.72 against 6.76); both times the figure under the block is the lorry's second weight, so the nett
// (first weight less second weight, and the book's to-date) is loaded and the book's figure is written in the note.
// Not in this book: bunches per lorry and per harvester (the bunches book), so no harvester days are loaded.
// importMeluNov19to25() only counts. importMeluNov19to25Write() writes. A second run adds nothing.
//  MMDD|ticket|mill|DO|lorry|driver|time|first MT|second MT|nett MT|unripe|empty|rotten|block|book's split if different
var MELU_NOV_19_25_ = [
  '1119|A061031|KMD|8193|SS2797L|D1|07:18|12.83|7.25|5.58|24|22||03|',
  '1119|A028129|KDM|8194|SS2797L|D1|11:44|11.70|6.81|4.89|14|||03|',
  '1119|A061071|KMD|8195|SS2797L|D1|14:51|13.40|7.35|6.05|29|7||02|',
  '1119|A061082|KMD|8196|SS2797L|D1|16:33|12.54|6.97|5.57|17|4||02|',
  '1120|A061128|KMD|8197|SS2797L|D1|14:08|14.11|6.89|7.22|14|4||02|',
  '1120|A061142|KMD|8198|SS2797L|D1|16:29|13.40|6.97|6.43|14|6||02|',
  '1121|A061167|KMD|8199|SS2797L|D1|10:47|13.70|6.89|6.81|14|8||01|6.89',
  '1121|A061187|KMD|8200|SS2797L|D1|15:40|13.37|6.82|6.55|11|1||01|',
  '1123|A061232|KMD|7701|SS2797L|D1|07:31|13.48|6.72|6.76||||01|6.72',
  '1123|A061248|KMD|7702|SS2797L|D1|09:44|12.19|6.67|5.52|10|6||01|',
  '1123|014246|HC|7703|SS2797L|D1|13:45|11.22|6.56|4.66||||01|',
  '1123|A061285|KMD|7704|SS2797L|D1|16:00|13.18|6.73|6.45|10|9||01|',
  '1124|A061302|KMD|7705|SS2797L|D1|08:50|12.34|6.78|5.56|8|7||01|',
  '1124|A061323|KMD|7706|SS2797L|D1|14:05|14.24|7.11|7.13|9|11||01|',
  '1124|014270|HC|7707|SS2797L|D1|17:07|9.36|6.56|2.80||||01|',
  '1125|A061337|KMD|7708|SS2797L|D1|08:03|14.30|6.82|7.48|9|9||01|',
  '1125|A061364|KMD|7709|SS2797L|D1|14:07|12.92|6.87|6.05|13|8||01|',
  '1125|A061376|KMD|7710|SS2797L|D1|15:55|13.77|6.89|6.88|11|17||01|'
];
function importMeluNov19to25(write) {
  var was = PRACTICE_, out = { book: '', write: !!write, tickets: 0, blocks: 0, mt: 0, same: 0, first: 0, last: 0 };
  try {
    if (typeof MELU_OLD_NAMES_ === 'undefined' || typeof MELU_MILLS_ === 'undefined') throw new Error('melu-old-2026.gs or melu-old-names.gs missing');
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    var ss = book_(), est = 'MELU', co = ESTATE_COMPANY[est] || 'SPLT', now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    function tab_(name) { var sh = roomTab_(ss, name); return { sh: sh, head: sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], rows: [] }; }
    function add_(t, row) {
      row = Object.assign({ company: co, estate: est, keyed_by: IMPORT_BY, keyed_at: now, phone: '', status: 'active', replaces: '', received_at: now }, row);
      t.rows.push(t.head.map(function (c) { return plain(row[c] === undefined ? '' : row[c]); }));
    }
    function txt_(s) { return /^0\d/.test(String(s)) ? "'" + s : String(s); }
    var tt = tab_('FH_TICKET'), tb = tab_('FH_TICKET_BLOCK'), haveT = {}, haveB = {};
    standingRows_('FH_TICKET', est).forEach(function (r) { haveT[String(r.ticket_no)] = true; });
    standingRows_('FH_TICKET_BLOCK', est).forEach(function (r) { haveB[String(r.ticket_no) + '|' + String(r.block)] = true; });
    MELU_NOV_19_25_.forEach(function (s) {
      var p = s.split('|'), tk = p[1], d = '2026-' + p[0].slice(0, 2) + '-' + p[0].slice(2, 4), m = MELU_MILLS_[p[2]], nett = Number(p[9]);
      if (haveT[tk]) { out.same++; return; }
      haveT[tk] = true; out.tickets++; out.mt = Math.round((out.mt + nett) * 100) / 100;
      var note = 'Data lama: buku hantar BTS 2026 (TONNAGE MELU, Nov, dimuat 26/11)';
      if (p[14]) note += '; buku tulis ' + p[14] + ' MT di bawah petak (sama dengan berat kedua), bersih ' + p[9] + ' MT dimuat';
      add_(tt, { id: 'IMP-' + est + '-TK-' + tk, date: d, ticket_no: txt_(tk), trip: '', mill: m ? m[0] : p[2], do_no: txt_(p[3]),
        lorry: p[4], driver: MELU_OLD_NAMES_[p[5]], time: p[6], first_kg: Math.round(Number(p[7]) * 1000), second_kg: Math.round(Number(p[8]) * 1000),
        deduct_kg: '', nett_kg: Math.round(nett * 1000), nett_mt: nett, bunches: '', abw_kg: '', lorry_bunches: '', mill_bunches: '',
        rej_ur: Number(p[10]) || '', rej_emp: Number(p[11]) || '', rej_rott: Number(p[12]) || '', rej_mt: '', note: note });
      if (!haveB[tk + '|' + p[13]]) {
        haveB[tk + '|' + p[13]] = true; out.blocks++;
        add_(tb, { id: 'IMP-' + est + '-TB-' + tk + '-' + p[13], date: d, ticket_no: txt_(tk), block: p[13], bunches: '', mt: nett });
      }
    });
    if (write) [tt, tb].forEach(function (t) { if (t.rows.length) t.sh.getRange(t.sh.getLastRow() + 1, 1, t.rows.length, t.head.length).setValues(t.rows); });
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; if (write) newGen_(); }
  Logger.log('importMeluNov19to25: ' + JSON.stringify(out) + ' (live sheet only)');
  return out;
}
function importMeluNov19to25Write() { return importMeluNov19to25(true); }
