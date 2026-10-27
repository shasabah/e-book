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
  { code: 'CS', bm: 'Banci pokok & pemeriksaan',   en: 'Palm census & field inspection' },
  { code: 'DU', bm: 'Ladang durian',               en: 'Durian farm' }
];
EA.lists.tasks = [
  // Harvesting
  { code: 'LF',   group: 'HV', bm: 'Kutip buah gugur',            en: 'Collecting loose fruits',          unit: 'bag',  pay: 'unit' },
  { code: 'FC',   group: 'HV', bm: 'Kutip BTS (parit / gaung)',   en: 'FFB collection (drain / ravine)',  unit: 'day',  pay: 'day' },
  { code: 'HA',   group: 'HV', bm: 'Menuai BTS',                  en: 'Harvesting FFB',                   unit: 'MT',   pay: 'unit' },
  { code: 'ITF',  group: 'HV', bm: 'Angkut BTS dalam ladang',     en: 'Internal transport FFB',           unit: 'day',  pay: 'day' },
  { code: 'LFF',  group: 'HV', bm: 'Muat BTS (ladang)',           en: 'Loading FFB (field)',              unit: 'MT',   pay: 'unit' },
  { code: 'LFR',  group: 'HV', bm: 'Muat BTS (ramp)',             en: 'Loading FFB (ramp)',               unit: 'MT',   pay: 'unit' },
  { code: 'RP',   group: 'HV', bm: 'Cantas biasa',                en: 'Routine pruning',                  unit: 'Ha',   pay: 'unit' },   // v1.41: Sugut pays pruning per Ha (was palms)
  // v1.36 (Yu Chen, 24 Oct): new codes, used now and replaceable by HQ later.
  // MDR: a worker who helps the staff arrange the day while there is no proper mandor (no mandor incentive);
  // he goes back to his own work when a mandor is found. Real mandors stay in the job's Mandor box.
  { code: 'MDR',  group: 'GN', bm: 'Pembantu sementara (bantu staf)', en: 'Temporary helper (assists staff)', unit: 'day', pay: 'day' },
  { code: 'DF',   group: 'DU', bm: 'Ladang durian',               en: 'Durian farm work',                 unit: 'day',  pay: 'day' },
  // Machine operators: one choice on the phone (machine + what the work is for) sets the code, so the cost
  // goes to the work done (Yu Chen, 25 Oct). A farm tractor carrying FFB to the ramp is ITF.
  { code: 'OPH',  group: 'HV', bm: 'Operator · muat BTS ramp → lori', en: 'Operator · FFB loading ramp to lorry', unit: 'day', pay: 'day' },
  { code: 'OPF',  group: 'UP', bm: 'Operator · kerja ladang',     en: 'Operator · field work',            unit: 'day',  pay: 'day' },
  { code: 'OPR',  group: 'IN', bm: 'Operator · jalan & parit',    en: 'Operator · roads & drains',        unit: 'day',  pay: 'day' },
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

// v1.36 E · Pusat kos (Yu Chen, 25 Oct 2026): the chit groups jobs by the 5 cost centres, the same for every
// estate (from the Paitan cost report and Sugut's 2026 budget), replacing the old paper sections A–E.
// parts: the sub-lines inside a cost centre, in report order. block: true = the job needs a block by default;
// noBlock lists the jobs in that centre that do not (machines, lorry, packing, transport).
EA.lists.chitSections = [
  { code: '1', bm: 'Tuaian', en: 'Harvesting', block: true, noBlock: ['OPH', 'LFR', 'ETF'],
    parts: [{ bm: 'a) Tuai', en: 'a) Cutting', tasks: ['HA', 'LF', 'FC'] },
            { bm: 'b) Ladang → ramp', en: 'b) Field to ramp', tasks: ['ITF', 'LFF'] },
            { bm: 'c) Ramp → kilang', en: 'c) Ramp to mill', tasks: ['OPH', 'LFR', 'ETF'] }] },
  { code: '2', bm: 'Rawatan ladang', en: 'Field maintenance', block: true, noBlock: ['PF', 'LG/UL', 'OPF'],
    parts: [{ bm: 'Manual', en: 'Manual', tasks: ['SL', 'BUS', 'DEC', 'RP', 'SF', 'CR', 'BU', 'AS'] },
            { bm: 'Kimia', en: 'Chemical', tasks: ['CPS', 'SS', 'BS', 'LS', 'OS', 'VOPS', 'PCBC', 'PCB', 'PCR', 'PCT', 'PCTB', 'PCO', 'DTL', 'DCR', 'DCO'] },
            { bm: 'Baja', en: 'Manuring', tasks: ['MAN', 'PF', 'LG/UL', 'OPF'] },
            { bm: 'Pemulihan', en: 'Rehabilitation', tasks: ['AP', 'SP'] }] },
  // v1.37: road repair by an operator (OPR) records where (block and lots), to trace repairs and their cost by area.
  { code: '3', bm: 'Jalan & parit', en: 'Road upkeep', block: false, noBlock: [], needBlock: ['OPR'],
    parts: [{ bm: 'Jalan & parit', en: 'Roads & drains', tasks: ['OPR', 'RMF', 'RMM', 'GFR', 'GMR', 'RPC', 'CSR', 'CSC', 'CSB', 'RS', 'RMR', 'CRP', 'RMPS', 'CPSP'] }] },
  { code: '4', bm: 'Ladang durian', en: 'Durian farm', block: true, noBlock: [],
    parts: [{ bm: 'Ladang durian', en: 'Durian farm', tasks: ['DF'] }] },
  { code: '5', bm: 'Am', en: 'General', block: false, needBlock: ['CO', 'CPT', 'CBB'],
    parts: [{ bm: 'Am', en: 'General', tasks: ['MDR', 'CA', 'WM', 'MC', 'HKH', 'HKST', 'SGA', 'SGC', 'RMH', 'RMO', 'RMS', 'RMT', 'RMW', 'CSH', 'CSO', 'CSS', 'CSW', 'ETLM', 'ITLM'] },
            { bm: 'Banci', en: 'Census', tasks: ['CO', 'CPT', 'CBB'] },
            { bm: 'Bengkel', en: 'Workshop', tasks: ['MH', 'VMC', 'MT'] }] }
];
EA.lists.chitSections.forEach(function (s) { s.tasks = []; s.parts.forEach(function (p) { s.tasks = s.tasks.concat(p.tasks); }); });
EA.lists.partOf = function (code) {
  var sec = EA.lists.sectionOf(code);
  return sec.parts.find(function (p) { return p.tasks.indexOf(code) >= 0; }) || sec.parts[0];
};
// Does this job need a block? Field work does; machines, lorry, general and road work do not.
EA.lists.needsBlock = function (code) {
  var s = EA.lists.sectionOf(code);
  if (s.needBlock && s.needBlock.indexOf(code) >= 0) return true;
  if (s.noBlock && s.noBlock.indexOf(code) >= 0) return false;
  return !!s.block;
};
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
  CO: 'Census (Other)', CBB: 'Census Black Bch', CPT: 'Census Palm',
  MDR: 'Temp. Helper', DF: 'Durian Farm', OPH: 'Op. FFB Loading', OPF: 'Op. Field Work', OPR: 'Op. Road/Drain'
};

// v1.36 D · Kerja utama (Yu Chen, 24 Oct): an estate's main jobs, shown as big buttons on Tambah kerja.
// Any other code is "Kerja lain · minta lulus": the staff writes why and the Assistant Manager answers
// LULUS / TOLAK. An estate with no list of its own shows every code as main (no approval asked).
// v1.37 (Yu Chen, 25 Oct): main jobs follow Sugut's 2026 budget; DEC (budget says GM approval), SP, OPF and
// RMH need approval. OPR (road & drain repair) and ETF (lorry to mill) stay main.
EA.lists.mainJobs = { SSGT: ['HA', 'ITF', 'LFF', 'LF', 'DF', 'MDR', 'CA', 'WM', 'CPS', 'VOPS', 'MAN', 'SL', 'RP', 'AP', 'OPH', 'OPR', 'ETF'] };
EA.lists.isMainJob = function (estate, code) { var m = EA.lists.mainJobs[estate]; return !m || m.indexOf(code) >= 0; };
// v1.36 (Yu Chen, 25 Oct): the shortcut buttons show only the jobs keyed every day; the other main jobs
// (rounds and occasional work) fold under one button, so the list stays short.
EA.lists.dailyJobs = { SSGT: ['HA', 'ITF', 'LFF', 'LF', 'DF', 'MDR', 'CA', 'WM'] };
EA.lists.quickJobs = EA.lists.dailyJobs;
EA.lists.quickJobsFor = function (estate) { return EA.lists.dailyJobs[estate] || EA.lists.mainJobs[estate] || ['HA', 'LF', 'ITF', 'MAN', 'CPS', 'RP', 'SL', 'WM', 'CA', 'RMH']; };
// The three operator codes show as one button "OP · Operator jentera"; the phone then asks what the work is for.
EA.lists.OP_JOBS = ['OPH', 'OPR', 'OPF'];
EA.lists.moreJobsFor = function (estate) {
  var q = EA.lists.quickJobsFor(estate), out = [];
  (EA.lists.mainJobs[estate] || []).forEach(function (c) { var k = EA.lists.OP_JOBS.indexOf(c) >= 0 ? 'OP' : c; if (q.indexOf(c) < 0 && out.indexOf(k) < 0) out.push(k); });
  return out;
};
// v1.36: machines an operator (OPR) can run, a fixed list so the day links to the Fleet room later.
// Kept on the job's "lots" place (no block): the machine is where the work was done.
// v1.36: operators run the first three; workshop days (MH, VMC, MT) can be for any of them (Fleet later).
EA.lists.machines = { SSGT: [{ id: 'FARMTRACTOR', bm: 'Traktor ladang', en: 'Farm tractor', op: true }, { id: 'BACKHOE', bm: 'Backhoe', en: 'Backhoe', op: true },
  { id: 'EXCAVATOR', bm: 'Excavator', en: 'Excavator', op: true }, { id: 'LORRY', bm: 'Lori', en: 'Lorry' }, { id: 'GENSET', bm: 'Genset', en: 'Genset' }] };
EA.lists.MACHINE_JOBS = ['OPH', 'OPR', 'OPF', 'MH', 'VMC', 'MT'];
// A machine job keeps its machine with the place: lots = [machine, …lots] (OPR also has the block and lots).
EA.lists.isMachineId = function (estate, id) { return (EA.lists.machines[estate] || EA.lists.machines.SSGT).some(function (m) { return m.id === id; }); };
EA.lists.splitMach = function (estate, lots) {
  var out = { mach: [], lots: [] };
  (lots || []).forEach(function (l) { (EA.lists.isMachineId(estate, l) ? out.mach : out.lots).push(l); });
  return out;
};
EA.lists.machinesFor = function (estate, code) {
  var all = EA.lists.machines[estate] || EA.lists.machines.SSGT;
  return code && EA.lists.OP_JOBS.indexOf(code) >= 0 ? all.filter(function (m) { return m.op; }) : all;
};
// v1.22: rounds a year per job (the estate's yearly budget programme; Sugut 2026 budget).
// Manuring counts applications done, whatever the fertiliser.
EA.lists.roundPlans = { SSGT: { CPS: 4, RP: 4, SL: 2, DEC: 2, VOPS: 1, MAN: 5 } };
EA.lists.roundPlanFor = function (estate, code) { var p = EA.lists.roundPlans[estate]; return p && p[code] || 0; };
// v1.23: harvest round (2–3 rounds a month): a lot is ready again after 10 days, late after 15.
EA.lists.lotRound = { HA: { ready: 10, late: 15 }, LF: { ready: 10, late: 15 } };
// v1.41 (Yu Chen, 26 Oct): work allowed on a Sunday without asking: harvesting and the crop chain (FFB), and the
// important piece-rated jobs manuring and CPS. Everything else on a Sunday needs SDK's approval (Christy or Wawa, to be named).
EA.lists.sundayOk = ['HA', 'LF', 'FC', 'ITF', 'LFF', 'LFR', 'OPH', 'ETF', 'MAN', 'CPS'];
// The request sent from a Sunday chit (after the work) is off: Sunday work is to be approved before it starts.
EA.lists.sundayAskOnChit = false;

// v1.43 TUTUP HARI · Hujan (Yu Chen, 26 Oct 2026, Brief "Rancangan & Prestasi" §5): rain group per job.
//   A = stops in ANY rain during work: the work is washed off or spoiled (sprays, pest and disease control,
//       bait) or it is earthwork that rain turns to mud (roads, drains, culverts, gravel). After night rain it
//       may be delayed while leaves are wet or roads are soft.
//   B = stops in HEAVY rain only: outdoor manual or machine work (harvest, manuring, slashing, pruning,
//       transport, census, outdoor building). After night rain only "tanah / jalan basah" counts.
//   C = never affected: under a roof or not tied to the field (workshop, general, packing, indoor repairs).
// A code not listed is B, so a new code never blocks a day close. Rain in mm stays in the Sugut DMS (20 Oct).
// To confirm with the estate: PCB (beetle; A if sprayed, B if traps), MAN (B so drizzle does not stop
// manuring; A if the agronomist says no fertiliser in any rain), RMH (B for roof work).
EA.lists.rainGroups = {
  A: ['CPS', 'VOPS', 'BS', 'LS', 'OS', 'RS', 'SS',
      'DTL', 'DCO', 'DCR', 'PCBC', 'PCB', 'PCO', 'PCR', 'PCT', 'PCTB',
      'OPR', 'GFR', 'GMR', 'RMF', 'RMM', 'CSR', 'CSC', 'RPC'],
  C: ['MH', 'VMC', 'MDR', 'CA', 'HKH', 'HKST', 'MC', 'SGA', 'SGC', 'WM', 'PF', 'RMO', 'RMS', 'RMW']
};
EA.lists.rainOf = function (code) {
  if (EA.lists.rainGroups.A.indexOf(code) >= 0) return 'A';
  if (EA.lists.rainGroups.C.indexOf(code) >= 0) return 'C';
  return 'B';
};
// The reasons the staff may pick at TUTUP HARI, and which rain groups each one excuses.
//   when: 'night' = night or after work (only wet ground counts); 'morning' = before or at muster; 'work' = during work.
EA.lists.rainReasons = [
  { code: 'LEWAT',  when: ['morning'],       groups: ['A', 'B'], bm: 'Hujan — lewat mula',                      en: 'Rain — late start' },
  { code: 'HENTI',  when: ['work'],          groups: ['A', 'B'], bm: 'Hujan — kerja berhenti',                  en: 'Rain — work stopped' },
  { code: 'GERIMIS', when: ['morning', 'work'], groups: ['A'],   bm: 'Gerimis — kerja racun / jalan tak boleh',  en: 'Drizzle — spray / road work not possible' },
  { code: 'BASAH',  when: ['night', 'morning', 'work'], groups: ['A', 'B'], bm: 'Tanah / jalan basah — jentera tak boleh masuk', en: 'Wet ground / road — machine could not enter' }
];
// Lost work is keyed as a part of the day, never in hours (piece-rate workers leave when the task is done).
EA.lists.lostDay = [{ v: 0.25, bm: '¼ hari', en: '¼ day' }, { v: 0.5, bm: '½ hari', en: '½ day' }, { v: 0.75, bm: '¾ hari', en: '¾ day' }, { v: 1, bm: '1 hari', en: '1 day' }];
// Working hours per estate (an estate setting, used only to decide whether rain counts as a reason).
EA.lists.workHours = { SSGT: { start: '06:00', rest: ['10:30', '11:00'], end: '13:30' } };
// Durian job codes count as complete at TUTUP HARI: their work lives in the Sugut DMS until the Durian room joins E-Book.
EA.lists.DMS_JOBS = ['DF'];
