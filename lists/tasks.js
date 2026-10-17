// Shared list: task codes. Owned by HQ. Every room only reads it.
// DRAFT from the Sugut piece-rate form, June 2025. To be confirmed by HQ
// and the Sugut manager before the pilot.
//
// Piece rates are NOT kept here (these files are public on GitHub).
// Rates live in the office sheet, each with a start date, and the rate
// in force on the work date is saved on every work row.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.tasks = [
  // Harvest
  { code: 'HV01', bm: 'Tuai BTS',               en: 'FFB harvesting',               unit: 'MT' },
  { code: 'HV02', bm: 'Insentif tuai',           en: 'Harvesting incentive',         unit: 'MT' },
  { code: 'HV03', bm: 'Muat BTS',                en: 'FFB loading',                  unit: 'MT' },
  { code: 'HV04', bm: 'Pemeriksa BTS',           en: 'FFB checker',                  unit: 'MT' },
  { code: 'HV05', bm: 'Insentif penyelia (A)',   en: 'Supervisor incentive (A)',     unit: 'MT' },
  { code: 'HV06', bm: 'Insentif penyelia (B)',   en: 'Supervisor incentive (B)',     unit: 'MT' },
  // Manuring
  { code: 'MN01', bm: 'Membaja',                 en: 'Manuring',                     unit: 'Ha' },
  { code: 'MN02', bm: 'Muat baja',               en: 'Loading fertiliser',           unit: 'bag' },
  { code: 'MN03', bm: 'Angkut baja',             en: 'Transport fertiliser',         unit: 'bag' },
  // Field upkeep
  { code: 'FM01', bm: 'Pokok terbiar',           en: 'Abandoned palm work',          unit: 'palm' },
  { code: 'FM02', bm: 'Muat tunggul',            en: 'Loading stumps',               unit: 'MT' },
  // Machines
  { code: 'MC01', bm: 'JCB',                     en: 'JCB hours',                    unit: 'hour' },
  // General
  { code: 'GN01', bm: 'Hadir muster',            en: 'Muster call',                  unit: 'day' }
];
EA.lists.task = function (code) {
  return EA.lists.tasks.find(function (t) { return t.code === code; }) || null;
};
