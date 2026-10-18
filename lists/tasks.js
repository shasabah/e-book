// Shared list: task codes. Owned by HQ. Every room only reads it.
// DRAFT from "SPLT SUGUT PIECE RATE" (dated 05/10/2022) and the Sugut
// payment summary of June 2025. To be confirmed by HQ and the Sugut manager.
//
// Piece rates are NOT kept here (these files are public on GitHub).
// Rates live in the office sheet as a history: task code, rate, start date
// ("date of increment"). The rate in force on the work date is saved on
// every work row, so a later increment never rewrites past pay.
//
// pay:  unit  = paid per unit done (MT, Ha, bag, palm)
//       day   = paid per day worked
//       hour  = paid per machine hour
//       tier  = paid by steps (e.g. harvest incentive by tonnes)
// assign: false = not given out at the morning muster (incentives, the muster itself).
// Pay set per person (monthly basic, grade, allowances) is HR data, kept in
// the People list, not here.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.taskGroups = [
  { code: 'HV', bm: 'Tuaian',       en: 'Harvesting' },
  { code: 'MT', bm: 'Rawatan',      en: 'Maintenance' },
  { code: 'MN', bm: 'Pembajaan',    en: 'Manuring' },
  { code: 'LD', bm: 'Pemuat',       en: 'Loader (field & ramp)' },
  { code: 'MC', bm: 'Jentera',      en: 'Machines' },
  { code: 'GN', bm: 'Am',           en: 'General' }
];
EA.lists.tasks = [
  // Harvesting
  { code: 'HV01', group: 'HV', bm: 'Tuai BTS',                  en: 'FFB harvesting',                 unit: 'MT',   pay: 'unit' },
  { code: 'HV02', group: 'HV', bm: 'Insentif tuai (1 sabit)',   en: 'Harvesting incentive (1 sickle)', unit: 'MT',   pay: 'tier', assign: false },
  { code: 'HV07', group: 'HV', bm: 'Cantas',                    en: 'Pruning',                        unit: 'Ha',   pay: 'unit' },
  { code: 'HV04', group: 'HV', bm: 'Pemeriksa BTS',             en: 'FFB checker',                    unit: 'MT',   pay: 'unit' },
  { code: 'HV05', group: 'HV', bm: 'Insentif penyelia (A)',     en: 'Supervisor incentive (A)',       unit: 'MT',   pay: 'unit', assign: false },
  { code: 'HV06', group: 'HV', bm: 'Insentif penyelia (B)',     en: 'Supervisor incentive (B)',       unit: 'MT',   pay: 'unit', assign: false },
  // Maintenance
  { code: 'MT01', group: 'MT', bm: 'Tebas',                     en: 'Slashing',                       unit: 'Ha',   pay: 'unit' },
  { code: 'MT02', group: 'MT', bm: 'Cabut menjalar',            en: 'Decreeping',                     unit: 'Ha',   pay: 'unit' },
  { code: 'MT03', group: 'MT', bm: 'Racun bulatan & lorong',    en: 'Circle & path spray',            unit: 'Ha',   pay: 'unit' },
  { code: 'MT04', group: 'MT', bm: 'Racun organik',             en: 'Organic spray',                  unit: 'Ha',   pay: 'unit' },
  { code: 'MT05', group: 'MT', bm: 'Racun terpilih',            en: 'Selective spray',                unit: 'Ha',   pay: 'unit' },
  { code: 'MT06', group: 'MT', bm: 'Racun lalang',              en: 'Lallang spray',                  unit: 'Ha',   pay: 'unit' },
  { code: 'MT07', group: 'MT', bm: 'VOP',                       en: 'VOPs',                           unit: 'Ha',   pay: 'unit' },
  { code: 'MT08', group: 'MT', bm: 'Muat anak benih',           en: 'Loading seedlings',              unit: 'seedling', pay: 'unit' },
  { code: 'MT09', group: 'MT', bm: 'Kutip buah gugur',          en: 'Loose fruit',                    unit: 'bag',  pay: 'unit' },
  { code: 'MT10', group: 'MT', bm: 'Banci pokok',               en: 'Palm census',                    unit: 'palm', pay: 'unit' },
  { code: 'FM01', group: 'MT', bm: 'Pokok terbiar',             en: 'Abandoned palm work',            unit: 'palm', pay: 'unit' },
  // Manuring
  { code: 'MN01', group: 'MN', bm: 'Membaja (kurang 2kg)',      en: 'Manuring (less than 2 kg)',      unit: 'Ha',   pay: 'unit' },
  { code: 'MN04', group: 'MN', bm: 'Membaja (lebih 2kg)',       en: 'Manuring (more than 2 kg)',      unit: 'Ha',   pay: 'unit' },
  { code: 'MN02', group: 'MN', bm: 'Muat baja',                 en: 'Loading fertiliser',             unit: 'bag',  pay: 'unit' },
  { code: 'MN03', group: 'MN', bm: 'Angkut baja',               en: 'Transport fertiliser',           unit: 'bag',  pay: 'unit' },
  // Loader
  { code: 'HV03', group: 'LD', bm: 'Muat BTS (ladang)',         en: 'Loading FFB (field)',            unit: 'MT',   pay: 'unit' },
  { code: 'LD02', group: 'LD', bm: 'Muat di ramp',              en: 'Loading at ramp',                unit: 'MT',   pay: 'unit' },
  { code: 'LD01', group: 'LD', bm: 'Pemuat harian',             en: 'Loader daily rate',              unit: 'day',  pay: 'day' },
  { code: 'FM02', group: 'LD', bm: 'Muat tunggul',              en: 'Loading stumps',                 unit: 'MT',   pay: 'unit' },
  // Machines
  { code: 'MC01', group: 'MC', bm: 'Jam jentolak (JCB)',        en: 'Backhoe (JCB) hours',            unit: 'hour', pay: 'hour' },
  { code: 'MC02', group: 'MC', bm: 'Pemandu traktor harian',    en: 'Tractor driver daily',           unit: 'day',  pay: 'day' },
  // General
  { code: 'GN01', group: 'GN', bm: 'Hadir muster',              en: 'Muster call',                    unit: 'day',  pay: 'day', assign: false }
];
EA.lists.task = function (code) {
  return EA.lists.tasks.find(function (t) { return t.code === code; }) || null;
};

// Work that needs approval before it is paid (from the Sugut rate list).
EA.lists.workRules = [
  { when: 'sunday',  bm: 'Kerja hari Ahad: lulus Penolong Pengurus',  en: 'Sunday work: approved by the Assistant Manager' },
  { when: 'holiday', bm: 'Kerja cuti umum: lulus Pengurus Besar',      en: 'Public holiday work: approved by the General Manager' }
];
EA.lists.task = function (code) {
  return EA.lists.tasks.find(function (t) { return t.code === code; }) || null;
};
EA.lists.assignable = function () {
  return EA.lists.tasks.filter(function (t) { return t.assign !== false; });
};
