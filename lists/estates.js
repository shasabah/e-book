// Shared list: estates. Owned by HQ. Every room only reads it.
// Blocks are added here at the foundation step, from HQ's block list.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.estates = [
  { code: 'SDK',  company: 'SPLT', name: 'Sandakan HQ' },
  { code: 'MELU', company: 'SPLT', name: 'Meliau' },
  { code: 'SSGT', company: 'SPLT', name: 'Sugut' },
  { code: 'PTAN', company: 'SPLT', name: 'PTAN' },
  { code: 'TKRS', company: 'SPLT', name: 'TKRS' },
  { code: 'KWNN', company: 'PJSB', name: 'Kawananan' }
];
EA.lists.estate = function (code) {
  return EA.lists.estates.find(function (e) { return e.code === code; }) || null;
};
