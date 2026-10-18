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
  { code: 'GN', bm: 'Am',           en: 'General' },
  { code: 'DR', bm: 'Pemandu',      en: 'Drivers' },
  { code: 'DF', bm: 'Ladang durian', en: 'Durian farm' }
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
  { code: 'GN01', group: 'GN', bm: 'Hadir muster',              en: 'Muster call',                    unit: 'day',  pay: 'day', assign: false },
  // From the Sugut paper muster chit (17 Oct 2026). New codes are DRAFT, to confirm with HQ.
  { code: 'MT11', group: 'MT', bm: 'Racun menyeluruh',          en: 'Blanket spraying',               unit: 'Ha',   pay: 'unit' },
  { code: 'MT12', group: 'MT', bm: 'Perosak & penyakit',        en: 'Pest & diseases',                unit: 'day',  pay: 'day' },
  { code: 'MT13', group: 'MT', bm: 'Cantas tepi jalan',         en: 'Road side trimming',             unit: 'day',  pay: 'day' },
  { code: 'MT14', group: 'MT', bm: 'Tapak semaian',             en: 'Nursery',                        unit: 'day',  pay: 'day' },
  { code: 'DF01', group: 'DF', bm: 'Kerja ladang durian',       en: 'Durian farm work',               unit: 'day',  pay: 'day' },
  { code: 'HV08', group: 'HV', bm: 'Creeper',                   en: 'Creeper',                        unit: 'day',  pay: 'day' },
  { code: 'GN02', group: 'GN', bm: 'Penjaga genset',            en: 'Genset attendant',               unit: 'day',  pay: 'day' },
  { code: 'GN03', group: 'GN', bm: 'Pengasuh taska',            en: 'Creche ayah',                    unit: 'day',  pay: 'day' },
  { code: 'GN04', group: 'GN', bm: 'Kebersihan mes/pejabat',    en: 'Upkeep mess/office',             unit: 'day',  pay: 'day' },
  { code: 'GN05', group: 'GN', bm: 'Pembantu stor',             en: 'Store attendant',                unit: 'day',  pay: 'day' },
  { code: 'GN06', group: 'GN', bm: 'Pengawal',                  en: 'Guard',                          unit: 'day',  pay: 'day' },
  { code: 'DR01', group: 'DR', bm: 'Pembantu pemandu traktor',  en: 'Tractor driver attendant',       unit: 'day',  pay: 'day' },
  { code: 'DR02', group: 'DR', bm: 'Pembantu jentolak',         en: 'Backhoe attendant',              unit: 'day',  pay: 'day' },
  { code: 'DR03', group: 'DR', bm: 'Pemandu lori',              en: 'Truck driver',                   unit: 'day',  pay: 'day' },
  { code: 'DR04', group: 'DR', bm: 'Pemandu Hitachi',           en: 'Hitachi driver',                 unit: 'day',  pay: 'day' }
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

// The four sections of the paper muster chit, in the paper's order.
// block: true = the job needs a block (field work); false = no block (office, guard, drivers).
EA.lists.chitSections = [
  { code: 'A', bm: 'Penyelenggaraan', en: 'Maintenance', block: true,
    tasks: ['MT03', 'MT02', 'MT05', 'MT11', 'MT12', 'MN01', 'MN04', 'MT13', 'HV07', 'FM01', 'MT01', 'MT14', 'FM02', 'DF01',
            'MT04', 'MT06', 'MT07', 'MT08', 'MT10', 'MN02', 'MN03'] },
  { code: 'B', bm: 'Tuaian', en: 'Harvesting', block: true,
    tasks: ['HV01', 'HV08', 'HV04', 'HV03', 'LD02', 'LD01', 'MT09'] },
  { code: 'C', bm: 'Am', en: 'General', block: false,
    tasks: ['GN02', 'GN03', 'GN04', 'GN05', 'GN06'] },
  { code: 'D', bm: 'Pemandu', en: 'Drivers', block: false,
    tasks: ['DR01', 'MC02', 'MC01', 'DR02', 'DR03', 'DR04'] }
];
EA.lists.sectionOf = function (code) {
  return EA.lists.chitSections.find(function (s) { return s.tasks.indexOf(code) >= 0; }) || EA.lists.chitSections[0];
};
// Short names as written on the paper muster chit (at most 16 letters, for the WhatsApp chit).
EA.lists.chitNames = {
  MT03: 'Circle Spraying', MT02: 'Decreeping', MT05: 'Selective Spray', MT11: 'Blanket Spray', MT12: 'Pest & Diseases',
  MN01: 'Manuring <2kg', MN04: 'Manuring >2kg', MT13: 'Road Side Trim', HV07: 'Pruning', FM01: 'Pruning Abandon',
  MT01: 'Slashing', MT14: 'Nursery', FM02: 'Loading Stumping', DF01: 'Durian Farm', MT04: 'Organic Spray',
  MT06: 'Lallang Spray', MT07: 'VOPs', MT08: 'Load Seedlings', MT10: 'Palm Census', MN02: 'Load Fertiliser',
  MN03: 'Transport Fert.', HV01: 'Harvester', HV08: 'Creeper', HV04: 'Checker', HV03: 'Loader', LD02: 'Loader Ramp',
  LD01: 'Loader Daily', MT09: 'Loose Fruit', GN02: 'Genset Attendant', GN03: 'Creche Ayah', GN04: 'Upkeep Mess/Off.',
  GN05: 'Store Attendant', GN06: 'Guard', DR01: 'Tractor Drv Att.', MC02: 'Tractor Driver', MC01: 'Backhoe Driver',
  DR02: 'Backhoe Attend.', DR03: 'Truck Driver', DR04: 'Hitachi Driver'
};
