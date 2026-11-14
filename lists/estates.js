// Shared list: estates and blocks. Owned by HQ. Every room only reads it.
// Lots (petak) under each block are in lists/lots.js.
// Sugut blocks from SPLT_SSGT_BUSINESS_PLAN_2027 (Setup sheet, 14 Oct 2026): 130.65 Ha.
// Other estates' blocks are added from HQ's block list before their pilot.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.estates = [
  { code: 'SDK',  company: 'SPLT', name: 'Sandakan HQ' },
  { code: 'MELU', company: 'SPLT', name: 'Meliau' },
  { code: 'SSGT', company: 'SPLT', name: 'Sugut', ha: 130.65 },
  { code: 'PTAN', company: 'SPLT', name: 'Paitan', ha: 184.14 },   // 13 Nov 2026: Paitan land only (blocks 01–04 + 9Ac)
  { code: 'TKRS', company: 'SPLT', name: 'TKRS' },
  { code: 'KWNN', company: 'PJSB', name: 'Kawananan' }
];
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
