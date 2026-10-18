// The rooms of the app, in build order. The main page shows a tile only to
// the roles listed. "open" rooms can be entered; the rest show their date.
window.EA = window.EA || {};
EA.rooms = [
  { id: 'durian', mark: 'DR', bm: 'Durian', en: 'Durian farm',
    state: 'live', when: 'Digunakan · In use',
    note: { bm: 'Bilik Durian dipindah ke sini selepas musim durian 2027 (dirancang Julai 2027). Sehingga itu, guna Sugut DMS seperti biasa.',
            en: 'The Durian room moves here after the 2027 durian harvest (planned July 2027). Until then, keep using the Sugut DMS.' },
    roles: ['Owner', 'HQ', 'Staff', 'Clerk', 'Store', 'Worker'], estates: ['SSGT'] },
  { id: 'field-harvest', mark: 'FH', bm: 'Kerja Ladang & Tuaian', en: 'Field & Harvest',
    state: 'next', when: 'Seterusnya · Next — Sugut, 4 Jan 2027',
    note: { bm: 'Kerja harian setiap pekerja dan tuaian setiap petak. Perintis di Sugut mula 4 Jan 2027.',
            en: 'Daily work per worker and crop per lot. Sugut pilot starts 4 Jan 2027.' },
    roles: ['Owner', 'HQ', 'Staff', 'Clerk', 'Mandor'] },
  { id: 'purchase-store', mark: 'PS', bm: 'Belian & Stor', en: 'Purchase & Store',
    state: 'later', when: 'Dibuka · Opens Jun 2027',
    note: { bm: 'Permintaan, kelulusan, pesanan, terima ke stor, keluar ke blok atau mesin. Perintis 1 Jun 2027.',
            en: 'Request, approve, order, receive into store, issue to a block or machine. Pilot 1 Jun 2027.' },
    roles: ['Owner', 'HQ', 'Clerk', 'Store'] },
  { id: 'fleet', mark: 'FL', bm: 'Kenderaan & Jentera', en: 'Fleet',
    state: 'later', when: 'Dibuka · Opens Oct 2027',
    note: { bm: 'Diesel, servis dan kerosakan. FMMS lama terus digunakan sehingga itu. Perintis KWNN 1 Oct 2027.',
            en: 'Diesel, service and breakdowns. The old FMMS runs until then. KWNN pilot 1 Oct 2027.' },
    roles: ['Owner', 'HQ', 'Clerk'] },
  { id: 'hr-payroll', mark: 'HR', bm: 'Sumber Manusia & Gaji', en: 'HR & Payroll',
    state: 'later', when: 'Dibuka · Opens Jan 2028',
    note: { bm: 'Senarai pekerja, muster harian, cuti dan gaji. Data gaji hanya untuk yang perlu tahu (PDPA).',
            en: 'People, daily muster, leave and pay. Pay data is need-to-know only (PDPA).' },
    roles: ['Owner', 'HQ'] },
  { id: 'reports', mark: 'RP', bm: 'Laporan', en: 'Reports',
    state: 'later', when: 'Bertambah · Grows with each room',
    note: { bm: 'Kos sehektar, kos setan, bajet berbanding sebenar. Bertambah setiap kali bilik baru dibuka.',
            en: 'Cost per hectare, cost per tonne, budget against actual. Grows as each room goes live.' },
    roles: ['Owner', 'HQ'] }
];

// Milestones from the Growth Plan, shown to Owner and HQ.
EA.milestones = [
  { m: 'M1',  date: '2026-10-23', bm: 'Keputusan dibuat',            en: 'Decisions made' },
  { m: 'M2',  date: '2026-11-30', bm: 'Asas siap',                   en: 'Foundation ready' },
  { m: 'M3',  date: '2027-01-04', bm: 'Perintis Kerja Ladang, SSGT', en: 'Field & Harvest pilot, SSGT' },
  { m: 'M4',  date: '2027-03-31', bm: 'Kerja Ladang, semua ladang',  en: 'Field & Harvest, all estates' },
  { m: 'M5',  date: '2027-04-30', bm: 'Gaji Sugut sepadan',          en: 'Sugut pay matched' },
  { m: 'M6',  date: '2027-06-01', bm: 'Perintis Belian & Stor',      en: 'Purchase & Store pilot' },
  { m: 'M7',  date: '2027-08-31', bm: 'Belian & Stor, semua ladang', en: 'Purchase & Store, all estates' },
  { m: 'M8',  date: '2027-10-01', bm: 'Perintis Kenderaan, KWNN',    en: 'Fleet pilot at KWNN' },
  { m: 'M9',  date: '2027-11-30', bm: 'Kenderaan, semua ladang',     en: 'Fleet, all estates' },
  { m: 'M10', date: '2028-01-03', bm: 'Perintis HR',                 en: 'HR pilot' },
  { m: 'M11', date: '2028-02-29', bm: 'HR, semua ladang',            en: 'HR, all estates' },
  { m: 'M12', date: '2028-06-30', bm: 'Gaji live, semua ladang',     en: 'Payroll live, all estates' }
];

EA.roleNames = {
  Owner:  { bm: 'Pemilik',     en: 'Owner' },
  HQ:     { bm: 'Ibu Pejabat', en: 'HQ' },
  Staff:  { bm: 'Kakitangan', en: 'Field staff' },
  Clerk:  { bm: 'Kerani',      en: 'Clerk' },
  Mandor: { bm: 'Mandor',      en: 'Foreman' },
  Store:  { bm: 'Stor',        en: 'Store' },
  Worker: { bm: 'Pekerja',     en: 'Worker' }
};

// Rooms this person may see, for the estate they are looking at.
EA.roomsFor = function (user, estate) {
  return EA.rooms.filter(function (r) {
    if (r.roles.indexOf(user.role) < 0) return false;
    if (r.estates && user.role !== 'Owner' && user.role !== 'HQ' && r.estates.indexOf(estate) < 0) return false;
    return true;
  });
};
