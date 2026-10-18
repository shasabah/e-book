// TEST COPY ONLY. Made-up workers for Sugut, so rooms can be built and
// tested without real names. Real people live only in the office sheet
// (People list, owned by HR) and are loaded at the pilot.
// sex: M / F, for the M and F columns of the muster chit. mdr: true = a mandor.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.testWorkers = [
  { id: 'W-SSGT-M01', name: 'Mandor Contoh 1', estate: 'SSGT', gang: 'Mandor', sex: 'M', mdr: true },
  { id: 'W-SSGT-M02', name: 'Mandor Contoh 2', estate: 'SSGT', gang: 'Mandor', sex: 'M', mdr: true },
  { id: 'W-SSGT-001', name: 'Pekerja Contoh 1', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
  { id: 'W-SSGT-002', name: 'Pekerja Contoh 2', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
  { id: 'W-SSGT-003', name: 'Pekerja Contoh 3', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
  { id: 'W-SSGT-004', name: 'Pekerja Contoh 4', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
  { id: 'W-SSGT-005', name: 'Pekerja Contoh 5', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
  { id: 'W-SSGT-006', name: 'Pekerja Contoh 6', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
  { id: 'W-SSGT-007', name: 'Pekerja Contoh 7', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' },
  { id: 'W-SSGT-008', name: 'Pekerja Contoh 8', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' },
  { id: 'W-SSGT-009', name: 'Pekerja Contoh 9', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' },
  { id: 'W-SSGT-010', name: 'Pekerja Contoh 10', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'M' },
  { id: 'W-SSGT-011', name: 'Pekerja Contoh 11', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'M' },
  { id: 'W-SSGT-012', name: 'Pekerja Contoh 12', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' },
  { id: 'W-SSGT-013', name: 'Pekerja Contoh 13', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' },
  { id: 'W-SSGT-014', name: 'Pekerja Contoh 14', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' },
  { id: 'W-SSGT-015', name: 'Pekerja Contoh 15', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'M' },
  { id: 'W-SSGT-016', name: 'Pekerja Contoh 16', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'M' },
  { id: 'W-SSGT-017', name: 'Pekerja Contoh 17', estate: 'SSGT', gang: 'Muat · Loading', sex: 'M' },
  { id: 'W-SSGT-018', name: 'Pekerja Contoh 18', estate: 'SSGT', gang: 'Muat · Loading', sex: 'M' },
  { id: 'W-SSGT-019', name: 'Pekerja Contoh 19', estate: 'SSGT', gang: 'Am · General', sex: 'F' },
  { id: 'W-SSGT-020', name: 'Pekerja Contoh 20', estate: 'SSGT', gang: 'Am · General', sex: 'M' }
];
EA.lists.workersFor = function (estate) {
  return EA.lists.testWorkers.filter(function (w) { return w.estate === estate && !w.mdr; });
};
EA.lists.mandorsFor = function (estate) {
  return EA.lists.testWorkers.filter(function (w) { return w.estate === estate && w.mdr; });
};
EA.lists.worker = function (id) {
  return EA.lists.testWorkers.find(function (w) { return w.id === id; }) || null;
};
