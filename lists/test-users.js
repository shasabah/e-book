// TEST COPY ONLY. Made-up people and made-up keys.
// Real people and real keys live only on the Google sheet, checked by the
// Google script. Never put a real name or a real key in this file.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.testUsers = [
  { code: 'T-OWN', key: '111111', name: 'Pemilik Ujian',  role: 'Owner',  estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'] },
  { code: 'T-HQ',  key: '222222', name: 'Ali HQ',         role: 'HQ',     estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'] },
  { code: 'T-CLK', key: '333333', name: 'Kerani Sugut',   role: 'Clerk',  estates: ['SSGT', 'PTAN'] },
  { code: 'T-STF', key: '777777', name: 'Staf Sugut',     role: 'Staff',  estates: ['SSGT'] },
  { code: 'T-MDR', key: '444444', name: 'Mandor Sugut',   role: 'Mandor', estates: ['SSGT'] },
  { code: 'T-STR', key: '555555', name: 'Stor Meliau',    role: 'Store',  estates: ['MELU'] },
  { code: 'T-WRK', key: '666666', name: 'Pekerja Durian', role: 'Worker', estates: ['SSGT'] }
];
// People with a given role at an estate (e.g. the mandors of Sugut).
EA.lists.peopleFor = function (estate, role) {
  return EA.lists.testUsers.filter(function (u) { return u.role === role && u.estates.indexOf(estate) >= 0; });
};
