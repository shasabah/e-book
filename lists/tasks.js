// Shared list: job codes. Owned by HQ. Every room only reads it.
// From "List of Job Codes", S.H.A. Hup Aik Plantation Sdn Bhd / Pelita Jujur Sdn Bhd,
// dated 19.10.2026 (72 codes, given by Yu Chen; prepared by Christy). The codes are the
// company's own letters (HA, CPS, MAN...), the same on every estate and in the office.
//
// Piece rates are NOT kept here (these files are public on GitHub).
// Rates live in the office sheet as a history: job code, rate, start date
// ("date of increment"). The rate in force on the work date is saved on
// every work row, so a later increment never rewrites past pay.
//
// unit: what is keyed for the job on Day's work (MT = paid from the mill ticket, so
//       nothing is keyed; Ha, bag, palm = a number per lot; day = full or half day).
// pay:  unit = paid per unit done; day = paid per day worked.
// Units are a first setting from the Sugut rate list; HQ confirms them with the rates.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.taskGroups = [
  { code: 'HV', bm: 'Tuaian',                      en: 'Harvesting' },
  { code: 'UP', bm: 'Penjagaan, tebas & rumpai',   en: 'Upkeep, slashing & weeding' },
  { code: 'PD', bm: 'Kawalan perosak & penyakit',  en: 'Pest & disease control' },
  { code: 'TR', bm: 'Pengangkutan',                en: 'Transport' },
  { code: 'WS', bm: 'Bengkel',                     en: 'Workshop' },
  { code: 'IN', bm: 'Infrastruktur',               en: 'Infrastructure' },
  { code: 'GN', bm: 'Am',                          en: 'General' },
  { code: 'CS', bm: 'Banci pokok & pemeriksaan',   en: 'Palm census & field inspection' }
];
EA.lists.tasks = [
  // Harvesting
  { code: 'LF',   group: 'HV', bm: 'Kutip buah gugur',            en: 'Collecting loose fruits',          unit: 'bag',  pay: 'unit' },
  { code: 'FC',   group: 'HV', bm: 'Kutip BTS (parit / gaung)',   en: 'FFB collection (drain / ravine)',  unit: 'day',  pay: 'day' },
  { code: 'HA',   group: 'HV', bm: 'Menuai BTS',                  en: 'Harvesting FFB',                   unit: 'MT',   pay: 'unit' },
  { code: 'ITF',  group: 'HV', bm: 'Angkut BTS dalam ladang',     en: 'Internal transport FFB',           unit: 'day',  pay: 'day' },
  { code: 'LFF',  group: 'HV', bm: 'Muat BTS (ladang)',           en: 'Loading FFB (field)',              unit: 'MT',   pay: 'unit' },
  { code: 'LFR',  group: 'HV', bm: 'Muat BTS (ramp)',             en: 'Loading FFB (ramp)',               unit: 'MT',   pay: 'unit' },
  { code: 'RP',   group: 'HV', bm: 'Cantas biasa',                en: 'Routine pruning',                  unit: 'palm', pay: 'unit' },
  // Upkeep, slashing & weeding
  { code: 'AP',   group: 'UP', bm: 'Cantas pokok terbiar',        en: 'Abandoned palm pruning',           unit: 'palm', pay: 'unit' },
  { code: 'AS',   group: 'UP', bm: 'Kastrasi / sanitasi',         en: 'Ablation / sanitation',            unit: 'palm', pay: 'unit' },
  { code: 'BU',   group: 'UP', bm: 'Cabut pisang',                en: 'Banana uprooting',                 unit: 'day',  pay: 'day' },
  { code: 'BS',   group: 'UP', bm: 'Racun menyeluruh',            en: 'Blanket spray',                    unit: 'Ha',   pay: 'unit' },
  { code: 'BUS',  group: 'UP', bm: 'Tebas sempadan',              en: 'Boundary upkeep (slashing)',       unit: 'Ha',   pay: 'unit' },
  { code: 'CPS',  group: 'UP', bm: 'Racun bulatan & lorong',      en: 'Circle & path spray',              unit: 'Ha',   pay: 'unit' },
  { code: 'CR',   group: 'UP', bm: 'Garu bulatan',                en: 'Circle racking',                   unit: 'Ha',   pay: 'unit' },
  { code: 'DEC',  group: 'UP', bm: 'Cabut menjalar',              en: 'Decreeping',                       unit: 'Ha',   pay: 'unit' },
  { code: 'LS',   group: 'UP', bm: 'Racun lalang',                en: 'Lalang spray',                     unit: 'Ha',   pay: 'unit' },
  { code: 'LG/UL', group: 'UP', bm: 'Muat / punggah',             en: 'Loading / unload',                 unit: 'day',  pay: 'day' },
  { code: 'MAN',  group: 'UP', bm: 'Membaja',                     en: 'Manuring',                         unit: 'Ha',   pay: 'unit' },
  { code: 'OS',   group: 'UP', bm: 'Racun organik',               en: 'Organic spray',                    unit: 'Ha',   pay: 'unit' },
  { code: 'PF',   group: 'UP', bm: 'Bungkus baja',                en: 'Packing fertilizer',               unit: 'bag',  pay: 'unit' },
  { code: 'RS',   group: 'UP', bm: 'Racun tepi jalan',            en: 'Road side spray',                  unit: 'Ha',   pay: 'unit' },
  { code: 'SP',   group: 'UP', bm: 'Cantas terpilih (tertunggak)', en: 'Selective pruning (overdue/spot)', unit: 'palm', pay: 'unit' },
  { code: 'SS',   group: 'UP', bm: 'Racun terpilih',              en: 'Selective spray',                  unit: 'Ha',   pay: 'unit' },
  { code: 'SL',   group: 'UP', bm: 'Tebas',                       en: 'Slashing',                         unit: 'Ha',   pay: 'unit' },
  { code: 'SF',   group: 'UP', bm: 'Susun pelepah',               en: 'Stacking fronds',                  unit: 'Ha',   pay: 'unit' },
  { code: 'VOPS', group: 'UP', bm: 'Racun VOP',                   en: 'VOPS spray',                       unit: 'Ha',   pay: 'unit' },
  // Pest & disease control
  { code: 'DTL',  group: 'PD', bm: 'Rawatan penyakit (daun)',     en: 'Disease treatment (leaf)',         unit: 'day',  pay: 'day' },
  { code: 'DCO',  group: 'PD', bm: 'Kawalan penyakit (lain)',     en: 'Disease control (other)',          unit: 'day',  pay: 'day' },
  { code: 'DCR',  group: 'PD', bm: 'Kawalan penyakit (akar)',     en: 'Disease control (root)',           unit: 'day',  pay: 'day' },
  { code: 'PCBC', group: 'PD', bm: 'Kawalan ulat bungkus / beluncas', en: 'Pest control (bagworm/caterpillar)', unit: 'day', pay: 'day' },
  { code: 'PCB',  group: 'PD', bm: 'Kawalan kumbang',             en: 'Pest control (beetle)',            unit: 'day',  pay: 'day' },
  { code: 'PCO',  group: 'PD', bm: 'Kawalan perosak (lain)',      en: 'Pest control (other)',             unit: 'day',  pay: 'day' },
  { code: 'PCR',  group: 'PD', bm: 'Kawalan tikus',               en: 'Pest control (rat)',               unit: 'day',  pay: 'day' },
  { code: 'PCT',  group: 'PD', bm: 'Kawalan anai-anai',           en: 'Pest control (termite)',           unit: 'day',  pay: 'day' },
  { code: 'PCTB', group: 'PD', bm: 'Kawalan Tirathaba',           en: 'Pest control (Tirathaba)',         unit: 'day',  pay: 'day' },
  // Transport
  { code: 'ETLM', group: 'TR', bm: 'Angkut luar (pekerja / barang)', en: 'External transport (labour/material)', unit: 'day', pay: 'day' },
  { code: 'ETF',  group: 'TR', bm: 'Angkut BTS keluar',           en: 'External transport FFB',           unit: 'day',  pay: 'day' },
  { code: 'ITLM', group: 'TR', bm: 'Angkut dalam (pekerja / barang)', en: 'Internal transport (labour/material)', unit: 'day', pay: 'day' },
  // Workshop
  { code: 'MT',   group: 'WS', bm: 'Tunda jentera',               en: 'Machinery towing',                 unit: 'day',  pay: 'day' },
  { code: 'MH',   group: 'WS', bm: 'Pembantu mekanik',            en: 'Mechanic helper',                  unit: 'day',  pay: 'day' },
  { code: 'VMC',  group: 'WS', bm: 'Cuci kenderaan & jentera',    en: 'Vehicle & machinery cleaning',     unit: 'day',  pay: 'day' },
  // Infrastructure
  { code: 'CSB',  group: 'IN', bm: 'Bina jambatan',               en: 'Construction (bridge)',            unit: 'day',  pay: 'day' },
  { code: 'CSH',  group: 'IN', bm: 'Bina rumah',                  en: 'Construction (housing)',           unit: 'day',  pay: 'day' },
  { code: 'CSO',  group: 'IN', bm: 'Bina pejabat',                en: 'Construction (office)',            unit: 'day',  pay: 'day' },
  { code: 'CPSP', group: 'IN', bm: 'Bina laluan / tangga',        en: 'Construction (path/step)',         unit: 'day',  pay: 'day' },
  { code: 'CRP',  group: 'IN', bm: 'Bina ramp',                   en: 'Construction (ramp)',              unit: 'day',  pay: 'day' },
  { code: 'CSS',  group: 'IN', bm: 'Bina stor',                   en: 'Construction (store)',             unit: 'day',  pay: 'day' },
  { code: 'CSW',  group: 'IN', bm: 'Bina bengkel',                en: 'Construction (workshop)',          unit: 'day',  pay: 'day' },
  { code: 'CSC',  group: 'IN', bm: 'Bina pembetung',              en: 'Construction (culvert)',           unit: 'day',  pay: 'day' },
  { code: 'CSR',  group: 'IN', bm: 'Bina jalan',                  en: 'Construction (road)',              unit: 'day',  pay: 'day' },
  { code: 'GFR',  group: 'IN', bm: 'Kerikil jalan ladang',        en: 'Gravelling (field road)',          unit: 'day',  pay: 'day' },
  { code: 'GMR',  group: 'IN', bm: 'Kerikil jalan utama',         en: 'Gravelling (main road)',           unit: 'day',  pay: 'day' },
  { code: 'RPC',  group: 'IN', bm: 'Baiki pembetung',             en: 'Repair & maintenance (culvert)',   unit: 'day',  pay: 'day' },
  { code: 'RMF',  group: 'IN', bm: 'Baiki jalan ladang',          en: 'Repair & maintenance (field road)', unit: 'day', pay: 'day' },
  { code: 'RMH',  group: 'IN', bm: 'Baiki rumah',                 en: 'Repair & maintenance (housing)',   unit: 'day',  pay: 'day' },
  { code: 'RMM',  group: 'IN', bm: 'Baiki jalan utama',           en: 'Repair & maintenance (main road)', unit: 'day',  pay: 'day' },
  { code: 'RMO',  group: 'IN', bm: 'Baiki pejabat',               en: 'Repair & maintenance (office)',    unit: 'day',  pay: 'day' },
  { code: 'RMPS', group: 'IN', bm: 'Baiki laluan / tangga',       en: 'Repair & maintenance (path/step)', unit: 'day',  pay: 'day' },
  { code: 'RMR',  group: 'IN', bm: 'Baiki ramp',                  en: 'Repair & maintenance (ramp)',      unit: 'day',  pay: 'day' },
  { code: 'RMS',  group: 'IN', bm: 'Baiki stor',                  en: 'Repair & maintenance (store)',     unit: 'day',  pay: 'day' },
  { code: 'RMT',  group: 'IN', bm: 'Baiki tangki',                en: 'Repair & maintenance (tank)',      unit: 'day',  pay: 'day' },
  { code: 'RMW',  group: 'IN', bm: 'Baiki bengkel',               en: 'Repair & maintenance (workshop)',  unit: 'day',  pay: 'day' },
  // General
  { code: 'CA',   group: 'GN', bm: 'Pengasuh taska',              en: 'Creche ayah',                      unit: 'day',  pay: 'day' },
  { code: 'HKH',  group: 'GN', bm: 'Kebersihan (rumah)',          en: 'Housekeeping (housing)',           unit: 'day',  pay: 'day' },
  { code: 'HKST', group: 'GN', bm: 'Kebersihan (stor / tangki diesel)', en: 'Housekeeping (store/diesel tank)', unit: 'day', pay: 'day' },
  { code: 'MC',   group: 'GN', bm: 'Tukang masak, landskap & pembersih', en: 'Mess cook, landscape cum cleaner', unit: 'day', pay: 'day' },
  { code: 'SGA',  group: 'GN', bm: 'Susun barang kedai',          en: 'Sundry shop goods arrangement',    unit: 'day',  pay: 'day' },
  { code: 'SGC',  group: 'GN', bm: 'Ambil barang kedai',          en: 'Sundry shop goods collection',     unit: 'day',  pay: 'day' },
  { code: 'WM',   group: 'GN', bm: 'Pengawal',                    en: 'Watchman',                         unit: 'day',  pay: 'day' },
  // Palm census & field inspection
  { code: 'CO',   group: 'CS', bm: 'Banci (lain)',                en: 'Census (other)',                   unit: 'day',  pay: 'day' },
  { code: 'CBB',  group: 'CS', bm: 'Banci tandan hitam',          en: 'Census black bunch',               unit: 'palm', pay: 'unit' },
  { code: 'CPT',  group: 'CS', bm: 'Banci pokok',                 en: 'Census palm tree',                 unit: 'palm', pay: 'unit' }
];
// The one harvesting code: its bunches feed the crop chain (collect, lorry, mill ticket).
EA.lists.HARVEST = 'HA';
EA.lists.task = function (code) {
  return EA.lists.tasks.find(function (t) { return t.code === code; }) || null;
};
EA.lists.assignable = function () {
  return EA.lists.tasks.filter(function (t) { return t.assign !== false; });
};

// Work that needs approval before it is paid (from the Sugut rate list).
EA.lists.workRules = [
  { when: 'sunday',  bm: 'Kerja hari Ahad: lulus Penolong Pengurus',  en: 'Sunday work: approved by the Assistant Manager' },
  { when: 'holiday', bm: 'Kerja cuti umum: lulus Pengurus Besar',      en: 'Public holiday work: approved by the General Manager' }
];

// The sections of the muster chit, in the paper's order.
// block: true = the job needs a block (field work); false = no block (office, guard, drivers).
EA.lists.chitSections = [
  { code: 'A', bm: 'Penyelenggaraan', en: 'Maintenance', block: true,
    tasks: ['CPS', 'DEC', 'SS', 'BS', 'MAN', 'SL', 'BUS', 'RS', 'LS', 'OS', 'VOPS', 'CR', 'SF', 'AP', 'SP', 'AS', 'BU', 'PF', 'LG/UL',
            'PCBC', 'PCB', 'PCR', 'PCT', 'PCTB', 'PCO', 'DTL', 'DCR', 'DCO', 'CPT', 'CBB', 'CO'] },
  { code: 'B', bm: 'Tuaian', en: 'Harvesting', block: true,
    tasks: ['HA', 'RP', 'LF', 'FC', 'LFF', 'LFR', 'ITF'] },
  { code: 'C', bm: 'Am', en: 'General', block: false,
    tasks: ['CA', 'HKH', 'HKST', 'MC', 'SGA', 'SGC', 'WM', 'MH', 'VMC', 'MT'] },
  { code: 'D', bm: 'Pengangkutan', en: 'Transport', block: false,
    tasks: ['ETF', 'ETLM', 'ITLM'] },
  { code: 'E', bm: 'Infrastruktur', en: 'Infrastructure', block: false,
    tasks: ['RMF', 'RMM', 'GFR', 'GMR', 'RPC', 'RMH', 'RMO', 'RMPS', 'RMR', 'RMS', 'RMT', 'RMW',
            'CSR', 'CSC', 'CSB', 'CSH', 'CSO', 'CPSP', 'CRP', 'CSS', 'CSW'] }
];
EA.lists.sectionOf = function (code) {
  return EA.lists.chitSections.find(function (s) { return s.tasks.indexOf(code) >= 0; }) || EA.lists.chitSections[0];
};
// Short names for the WhatsApp chit (at most 16 letters). Codes not listed show their English name.
EA.lists.chitNames = {
  HA: 'Harvester', LF: 'Loose Fruit', FC: 'FFB Collection', ITF: 'Int. Transp. FFB', LFF: 'Loader Field', LFR: 'Loader Ramp', RP: 'Routine Pruning',
  AP: 'Pruning Abandon', AS: 'Ablation/Sanit.', BU: 'Banana Uproot', BS: 'Blanket Spray', BUS: 'Boundary Slash', CPS: 'Circle Spraying',
  CR: 'Circle Racking', DEC: 'Decreeping', LS: 'Lalang Spray', 'LG/UL': 'Load/Unload', MAN: 'Manuring', OS: 'Organic Spray',
  PF: 'Packing Fert.', RS: 'Road Side Spray', SP: 'Pruning Overdue', SS: 'Selective Spray', SL: 'Slashing', SF: 'Stacking Fronds', VOPS: 'VOPs',
  DTL: 'Disease (Leaf)', DCO: 'Disease (Other)', DCR: 'Disease (Root)', PCBC: 'Bagworm/Caterp.', PCB: 'Beetle Control', PCO: 'Pest (Other)',
  PCR: 'Rat Control', PCT: 'Termite Control', PCTB: 'Tirathaba',
  ETLM: 'Ext. Transport', ETF: 'Ext. Transp. FFB', ITLM: 'Int. Transport', MT: 'Machinery Towing', MH: 'Mechanic Helper', VMC: 'Vehicle Cleaning',
  CA: 'Creche Ayah', HKH: 'Housekeep House', HKST: 'Housekeep Store', MC: 'Mess Cook', SGA: 'Shop Goods Arr.', SGC: 'Shop Goods Coll.', WM: 'Watchman',
  CO: 'Census (Other)', CBB: 'Census Black Bch', CPT: 'Census Palm'
};
