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
  { code: 'PTAN', company: 'SPLT', name: 'PTAN' },
  { code: 'TKRS', company: 'SPLT', name: 'TKRS' },
  { code: 'KWNN', company: 'PJSB', name: 'Kawananan' }
];
EA.lists.blocks = [
  { estate: 'SSGT', block: '01', name: 'Block 1', ha: 33.20 },
  { estate: 'SSGT', block: '02', name: 'Block 2', ha: 33.93 },
  { estate: 'SSGT', block: '03', name: 'Block 3', ha: 31.18 },
  { estate: 'SSGT', block: '04', name: 'Block 4', ha: 32.34 }
];
EA.lists.estate = function (code) {
  return EA.lists.estates.find(function (e) { return e.code === code; }) || null;
};
EA.lists.blocksFor = function (estate) {
  return EA.lists.blocks.filter(function (b) { return b.estate === estate; });
};
