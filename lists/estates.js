// Shared list: estates and blocks. Owned by HQ. Every room only reads it.
// Lots (petak) under each block are in lists/lots.js.
// Sugut blocks from SPLT_SSGT_BUSINESS_PLAN_2027 (Setup sheet, 14 Oct 2026): 130.65 Ha.
// Other estates' blocks are added from HQ's block list before their pilot.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
// Every estate has one name, kept here. Before v1.68 the list and the names were written out again in
// core/users.js and core/home.js, so taking TKRS out of this file left it on the estate picker and on the
// home switcher — three copies of one list, which Rule 5 exists to stop. Those screens now read this one.
// `retired` marks a code that is no longer an estate: it is never offered, but its name still shows on the
// old records that carry it (Rule 4 — nothing is deleted).
EA.lists.estates = [
  { code: 'SDK',  company: 'SPLT', bm: 'Ibu Pejabat Sandakan', en: 'Sandakan HQ' },
  { code: 'MELU', company: 'SPLT', bm: 'Meliau', en: 'Meliau', ha: 280.66 },   // 18 Nov 2026: Meliau land (Brief_Data_Induk 4)
  { code: 'SSGT', company: 'SPLT', bm: 'Sugut', en: 'Sugut', ha: 130.65 },
  { code: 'PTAN', company: 'SPLT', bm: 'Paitan', en: 'Paitan', ha: 236.53 },   // the group: Paitan 184.14 + TKRS 34.85 + 43 Acres 17.54
  // v1.68 (Yu Chen, 16 Nov 2026): Tekara is a piece of the Paitan group, not an estate of its own
  // (Brief_Data_Induk 2.2, signed 13 Nov). Its land is the PTAN blocks T1–T4, owned by PJSB. No work record
  // ever carried estate TKRS; the logins and the one machine that did are corrected in the office.
  { code: 'TKRS', company: 'PJSB', bm: 'Tekara', en: 'Tekara', retired: 'PTAN' },
  { code: 'KWNN', company: 'PJSB', bm: 'Kawananan', en: 'Kawananan' }
];
// The estates a person can be given or can key to: everything still standing.
EA.lists.estates.forEach(function (e) { if (!e.name) e.name = e.en; });   // older code reads .name
EA.lists.estatesLive = function () { return EA.lists.estates.filter(function (e) { return !e.retired; }); };
// One estate's name in the phone's language. An unknown code shows as itself, so an old record always reads.
EA.lists.estateName = function (code) {
  var e = EA.lists.estates.filter(function (x) { return x.code === code; })[0];
  return e ? EA.t(e.bm, e.en) : String(code || '');
};
EA.lists.blocks = [
  { estate: 'SSGT', block: '01', name: 'Block 1', ha: 33.20 },
  { estate: 'SSGT', block: '02', name: 'Block 2', ha: 33.93 },
  { estate: 'SSGT', block: '03', name: 'Block 3', ha: 31.18 },
  { estate: 'SSGT', block: '04', name: 'Block 4', ha: 32.34 },
  // Paitan, from Christy's 2022 survey sheets and SPLT.PTAN BUDGET COSTING 2026 (Brief_Data_Induk 2.1): 184.14 Ha
  { estate: 'PTAN', block: '01', name: 'Paitan Blk 1', ha: 39.97 },
  { estate: 'PTAN', block: '02', name: 'Paitan Blk 2', ha: 36.18 },
  { estate: 'PTAN', block: '03', name: 'Paitan Blk 3', ha: 47.71 },
  { estate: 'PTAN', block: '04', name: 'Paitan Blk 4', ha: 56.64 },
  { estate: 'PTAN', block: '9A', name: 'Paitan 9Ac', ha: 3.64 },
  // Meliau (MELU), one piece, from HQ's MELU SUMMARY BUDGET 2026 (Maintenance Work 23/12/2025; Abandoned Palm
  // Planning 11/02/2026, palms as at 02.01.2026): 6 blocks, 280.66 Ha, 34,906 palms. Brief_Data_Induk 4.
  { estate: 'MELU', block: '01', name: 'Meliau Blk 1', ha: 53.00 },
  { estate: 'MELU', block: '02', name: 'Meliau Blk 2', ha: 43.97 },
  { estate: 'MELU', block: '03', name: 'Meliau Blk 3', ha: 41.95 },
  { estate: 'MELU', block: '04', name: 'Meliau Blk 4', ha: 39.74 },
  { estate: 'MELU', block: '05', name: 'Meliau Blk 5', ha: 41.28 },
  { estate: 'MELU', block: '06', name: 'Meliau Blk 6', ha: 60.72 },
  // v1.60 (14 Nov 2026): the Paitan group's other two pieces. One worker team covers all three places, so they
  // share Paitan's worker list, morning chit and day close, and the land hangs under estate PTAN
  // (Brief_Data_Induk 2.2–2.4, signed 13 Nov). The piece says which company owns the land, never the worker:
  // a Paitan man (SPLT) harvesting TKRS lot T1-3 makes a PJSB record. TKRS Ha from Christy's map and the 2026
  // budget (10.34 / 7.05 / 13.80 / 3.66); 43 Acres 17.54 Ha, one block.
  { estate: 'PTAN', block: 'T1', name: 'TKRS Blk 1',     ha: 10.34, piece: 'TKRS', company: 'PJSB' },
  { estate: 'PTAN', block: 'T2', name: 'TKRS Blk 2',     ha: 7.05,  piece: 'TKRS', company: 'PJSB' },
  { estate: 'PTAN', block: 'T3', name: 'TKRS Blk 3',     ha: 13.80, piece: 'TKRS', company: 'PJSB' },
  { estate: 'PTAN', block: 'T4', name: 'TKRS Blk 4',     ha: 3.66,  piece: 'TKRS', company: 'PJSB' },
  { estate: 'PTAN', block: 'A1', name: '43 Acres Blk 1', ha: 17.54, piece: '43AC', company: '43AC' }
];
// The piece a block belongs to, and the company that owns it. A block with no piece of its own belongs to the
// estate's own piece, which is the ordinary case (Sugut, Meliau, Kawananan, and Paitan's own blocks).
EA.lists.pieceOf = function (estate, block) {
  var b = EA.lists.blocks.find(function (x) { return x.estate === estate && x.block === String(block); });
  var e = EA.lists.estates.find(function (x) { return x.code === estate; });
  return { piece: (b && b.piece) || estate, company: (b && b.company) || (e && e.company) || '' };
};
// Mills and collecting centres Sugut sends to (from the Sugut FFB tonnage file 2026).
// v1.29: the real list is the office sheet's LIST_MILLS (core/mills.js keeps the phone's copy); this list is
// only used until the phone has fetched it once.
EA.lists.mills = ['Boustead (BOU)', 'Sri Kamusan CC (SKCC)', 'SKPOM', 'Fortuna', 'Sinar C'];
EA.lists.millsFor = function (estate) {
  var c = null;
  try { c = EA.local && EA.local.get('ea.mills.' + estate, null); } catch (e) {}
  return c && c.names && c.names.length ? c.names.slice() : EA.lists.mills.slice();
};
// Mill grading limits: above these the staff must say what is going on (DRAFT, to confirm
// with Yu Chen / the Assistant Manager). Percent of the bunches graded. Any rejected
// bunch or any penalty also needs an explanation.
EA.lists.gradingLimits = { unripe: 5, empty: 3, rotten: 1, dirty: 2, longStalk: 5 };
EA.lists.estate = function (code) {
  return EA.lists.estates.find(function (e) { return e.code === code; }) || null;
};
EA.lists.blocksFor = function (estate) {
  return EA.lists.blocks.filter(function (b) { return b.estate === estate; });
};
