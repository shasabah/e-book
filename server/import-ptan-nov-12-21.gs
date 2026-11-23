// ---------------- office one-off: Paitan harvester days 12–21 Nov 2026 from the FFB bunches book ----------------
// Yu Chen, 23 Nov 2026, 6:21 pm: "check and upload to paitan", with SPLT.PTAN_FFB_BUNCHES (Nov sheet, updated 23 Nov).
//
// What the check found. Days 2–11 Nov of the book are exactly what importPaitan2026 loaded on 13 Nov (6 men, every
// day, every bunch), so they are not touched. From 12 Nov the live sheet holds no Paitan harvest at all (nothing was
// keyed on a phone since), so the book's days 12–21 Nov go in here, the same way: live sheet only, keyed_by IMPORT,
// noted "Data lama", one FH_WORK row per man per day, task HA, bunches as the book writes them.
//
// What is new against 13 Nov:
//  - The men are filed under their own codes on the Paitan list (the book's short name, one active harvester with it
//    at Paitan, e.g. IRMAN), not under new "Pekerja lama" codes. The 13 Nov load made such codes because it matched
//    full names only; moving those older rows is a separate decision for Yu Chen.
//  - The block is filled where the book's own ESTATE row names one block for that place that day (Paitan 15–17 Nov
//    Blk 01, 19–20 Nov Blk 02; Tekara 13 Nov T3; 43 Acres A1). Two blocks or none: left blank and the note says why
//    (a hole beats a guess, 18 Nov rule). The company follows the block's piece, as a phone does (PJSB for T*, 43AC for A1).
//  - Held back, NOT loaded: Tekara 12 Nov (7 men, 1,028 bunches). The book writes blocks "2,1" that day; with no block
//    the row would fall to Paitan (SPLT) and put PJSB's crop under the wrong company. Waiting for which block each man cut.
// No lorries here: this book has none. Nothing is deleted. A second run adds nothing (same id, or that man already has a
// harvest row that day). worker|day|block|bunches|fix  (fix: B<blocks as the book writes them>, N no block that day)
var PTAN_NOV_12_21_ = [
    'PTANSC251109|15|01|141|',
    'PTANSC251109|16|01|146|',
    'PTANSC251109|17|01|120|',
    'PTANSC251109|18||126|B1,2',
    'PTANSC251109|19|02|121|',
    'PTANSC251109|20|02|143|',
    'PTANSC251109|21||130|N',
    'PTANSC260104|17|01|115|',
    'PTANSC260104|18||188|B1,2',
    'PTANSC260104|19|02|160|',
    'PTANSC260104|20|02|130|',
    'PTANSC260104|21||190|N',
    'PTANSC260301|15|01|180|',
    'PTANSC260301|16|01|158|',
    'PTANSC260301|17|01|140|',
    'PTANSC260301|18||196|B1,2',
    'PTANSC260301|19|02|162|',
    'PTANSC260301|20|02|120|',
    'PTANSC260301|21||201|N',
    'PTANSC260602|15|01|120|',
    'PTANSC260602|16|01|100|',
    'PTANSC260602|17|01|130|',
    'PTANSC260602|18||135|B1,2',
    'PTANSC260602|19|02|124|',
    'PTANSC260602|20|02|40|',
    'PTANSC260602|21||125|N',
    'PTANSC260603|16|01|96|',
    'PTANSC260603|17|01|65|',
    'PTANSC260603|18||65|B1,2',
    'PTANSC260603|20|02|20|',
    'PTANSC260603|21||100|N',
    'PTANSC260704|16|01|129|',
    'PTANSC260704|17|01|152|',
    'PTANSC260704|18||191|B1,2',
    'PTANSC260704|19|02|103|',
    'PTANSC260704|20|02|70|',
    'PTANSC260704|21||141|N',
    'PTANSC261101|17|01|50|',
    'PTANSC261101|19|02|80|',
    'PTANSC251109|13|T3|71|',
    'PTANSC260104|13|T3|36|',
    'PTANSC260301|13|T3|146|',
    'PTANSC260602|13|T3|106|',
    'PTANSC260603|13|T3|80|',
    'PTANSC260704|13|T3|51|',
    'PTANSC261101|13|T3|98|',
    'PTANSC251109|14|A1|202|',
    'PTANSC260104|14|A1|205|',
    'PTANSC260104|15|A1|280|',
    'PTANSC260301|14|A1|300|',
    'PTANSC260602|14|A1|200|',
    'PTANSC260603|14|A1|150|',
    'PTANSC260704|14|A1|306|',
    'PTANSC260704|15|A1|144|',
    'PTANSC261101|14|A1|80|',
    'PTANSC261101|16|A1|55|',
];
function importPaitanNov12to21() {
  var was = PRACTICE_, out = { work: 0, same: 0, bunches: 0, byPiece: {} };
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    var ss = book_(), now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    var sh = roomTab_(ss, 'FH_WORK'), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], rows = [];
    var haveId = {}, haveDay = {};
    standingRows_('FH_WORK', 'PTAN').forEach(function (r) {
      haveId[String(r.id)] = true;
      if (String(r.task_code) === HARVEST_CODE) haveDay[String(r.worker_id) + '|' + String(r.date).slice(0, 10)] = true;
    });
    var people = {};
    standingRows_('LIST_PEOPLE', 'PTAN').forEach(function (r) { people[String(r.worker_id)] = true; });
    var miss = PTAN_NOV_12_21_.map(function (s) { return s.split('|')[0]; }).filter(function (w) { return !people[w]; });
    if (miss.length) throw new Error('importPaitanNov12to21: not on the Paitan list: ' + miss.join(', '));
    PTAN_NOV_12_21_.forEach(function (s) {
      var p = s.split('|'), date = '2026-11-' + p[1], id = 'IMP-PTAN-HA-' + p[0] + '-11' + p[1];
      if (haveId[id] || haveDay[p[0] + '|' + date]) { out.same++; return; }
      haveId[id] = true; haveDay[p[0] + '|' + date] = true;
      var piece = /^T/.test(p[2]) ? 'TKRS' : p[2] === 'A1' ? '43AC' : 'PTAN', co = piece === 'TKRS' ? 'PJSB' : piece === '43AC' ? '43AC' : 'SPLT';
      var note = 'Data lama: buku BTS Nov 2026 (dikemas 23 Nov)';
      if (/^B/.test(p[4])) note += '; petak tidak satu: buku tulis "' + p[4].slice(1) + '"';
      if (p[4] === 'N') note += '; buku tiada petak untuk hari ini ("2" ditulis pada lajur 30 hb)';
      var row = { id: id, date: date, company: co, estate: 'PTAN', chit: '', worker_id: p[0], task_code: HARVEST_CODE,
        block: p[2], lot: '', qty: '', unit: '', bunches: Number(p[3]), confirmed_by: '', confirmed_at: '', bags: '',
        machine: '', meter_start: '', meter_end: '', hours: '', note: note, keyed_by: IMPORT_BY, keyed_at: now,
        phone: '', status: 'active', replaces: '', received_at: now };
      rows.push(head.map(function (c) { return plain(row[c] === undefined ? '' : row[c]); }));
      out.work++; out.bunches += Number(p[3]); out.byPiece[piece] = (out.byPiece[piece] || 0) + Number(p[3]);
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; }
  Logger.log('importPaitanNov12to21: ' + JSON.stringify(out) + ' (live sheet only)');
  return out;
}
