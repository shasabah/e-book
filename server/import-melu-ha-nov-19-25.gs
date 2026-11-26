// ---------------- office one-off: Meliau harvester days 19-25 Nov 2026, from the FFB bunches book ----------------
// Yu Chen, 26 Nov 2026: "upload to meliau", with SPLT.MELU_FFB_BUNCHES (Nov, as at 26 Nov). Same day as the lorries
// (import-melu-nov-19-25.gs). The live sheet held Meliau's harvester days to 18 Nov (19 Nov load); nothing after.
// 60 harvester days, 4,890 bunches; each day equals the book's own day total (19: 932 · 20: 644 · 21: 680 · 22: 488 ·
// 23: 829 · 24: 532 · 25: 785). Absent (A) and sick (S) marks are not loaded: the book is not the muster.
// Who is who. The 19 Nov load matched 4 of these 10 harvesters to the worker list; the other 6 were not on the list
// then and came in as "Pekerja lama" (MELUB2611xx, active N). On 26 Nov the estate's November list was loaded and
// each of those 6 is now on it under his own code, and is the only worker with that first name (the same match
// rule as 19 Nov). So 19-25 Nov go under the real code; the Pekerja lama code is kept beside it in the data for the
// record. Moving the 6 men's earlier days to their real codes is a separate correction, not done here.
// The block comes from the book's BLOCK row: one block each day (19-20 Nov block 02, 21-25 Nov block 01).
// Codes only, no names (19 Oct rule: this repository is public). keyed_by IMPORT, noted "Data lama", as before.
// importMeluHaNov19to25() only counts. importMeluHaNov19to25Write() writes. A second run adds nothing.
//  worker code|Pekerja lama code of the 19 Nov load (if any)|day:bunches,...
var MELU_HA_NOV_19_25_ = [
  'MELUSC260904|MELUB261121|19:153,20:71,21:70,22:47,23:106,24:55,25:147',
  'MELUSC260805||19:90,20:68,21:27,22:48,23:70,24:63,25:63',
  'MELUSC260307||19:100,20:67,21:219,22:45,23:137,24:103,25:93',
  'MELUSC260501||19:110,20:132,22:101,23:96,24:41,25:132',
  'MELUSC260502||19:116,20:140,21:106,23:72,24:96,25:91',
  'MELUSC261003|MELUB261126|19:74,20:43,21:53,23:38,24:39,25:5',
  'MELUSC261004|MELUB261127|19:74,20:43,21:53,23:37,24:40,25:5',
  'MELUSC261006|MELUB261129|19:50,21:73,24:58,25:50',
  'MELUSC261008|MELUB261130|19:100,20:80,22:236,23:119,25:127',
  'MELUSC261101|MELUB261131|19:65,21:79,22:11,23:154,24:37,25:72'
];
var MELU_HA_NOV_BLOCK_ = { '19': '02', '20': '02', '21': '01', '22': '01', '23': '01', '24': '01', '25': '01' };
function importMeluHaNov19to25(write) {
  var was = PRACTICE_, out = { book: '', write: !!write, days: 0, bunches: 0, same: 0, notOnList: [], byDay: {} };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    var ss = book_(), est = 'MELU', co = ESTATE_COMPANY[est] || 'SPLT', now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    try { out.book = ss.getName(); } catch (e) { out.book = '?'; }
    var sh = roomTab_(ss, 'FH_WORK'), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], rows = [];
    var listed = {}; standingRows_('LIST_PEOPLE', est).forEach(function (r) { listed[String(r.worker_id)] = true; });
    var have = {}; standingRows_('FH_WORK', est).forEach(function (r) { if (r.task_code === HARVEST_CODE) have[String(r.worker_id) + '|' + String(r.date).slice(0, 10)] = true; });
    MELU_HA_NOV_19_25_.forEach(function (s) {
      var p = s.split('|'), w = p[0], lama = p[1];
      if (!listed[w]) { out.notOnList.push(w); return; }
      p[2].split(',').forEach(function (x) {
        var y = x.split(':'), date = '2026-11-' + y[0], blk = MELU_HA_NOV_BLOCK_[y[0]], b = Number(y[1]);
        if (have[w + '|' + date] || (lama && have[lama + '|' + date])) { out.same++; return; }
        have[w + '|' + date] = true; out.days++; out.bunches += b; out.byDay[y[0]] = (out.byDay[y[0]] || 0) + b;
        var note = 'Data lama: buku BTS Meliau 2026 (dimuat 26/11); petak dari baris BLOCK buku (satu petak hari itu)' +
          (lama ? '; hari sebelum 19/11 di bawah kod Pekerja lama ' + lama : '');
        var row = { id: 'IMP-' + est + '-HA-' + w + '-11' + y[0], date: date, company: co, estate: est, keyed_by: IMPORT_BY, keyed_at: now,
          phone: '', status: 'active', replaces: '', chit: '', worker_id: w, task_code: HARVEST_CODE, block: blk, lot: '', qty: '', unit: '',
          bunches: b, confirmed_by: '', confirmed_at: '', bags: '', machine: '', meter_start: '', meter_end: '', hours: '', note: note, received_at: now };
        rows.push(head.map(function (c) { return plain(row[c] === undefined ? '' : row[c]); }));
      });
    });
    if (out.notOnList.length) throw new Error('not on the Meliau list: ' + out.notOnList.join(', ') + ' (nothing written)');
    if (write && rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; if (write) newGen_(); }
  Logger.log('importMeluHaNov19to25: ' + JSON.stringify(out) + ' (live sheet only)');
  return out;
}
function importMeluHaNov19to25Write() { return importMeluHaNov19to25(true); }
