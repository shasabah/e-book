// E-Book test (Meliau 2026 history, 19 Nov 2026: "load this"). The real data file server/melu-old-2026.gs, loaded with
// made-up names (Rule 8): 702 lorries, 4,077.50 MT, 187,222 bunches; a block split only where the book agrees with itself;
// a harvester's block only on a one-block day; a short name matched only when one worker has it; twice adds nothing.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const pad = n => String(n).padStart(2, '0');
function fmt(d, z, f) { const t = new Date(d.getTime() + 8 * 3600e3); return f.replace(/yyyy|MM|dd|HH|mm|ss/g, k => ({ yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()) })[k]); }
const std = ['id', 'date', 'company', 'estate', 'keyed_by', 'keyed_at', 'phone', 'status', 'replaces', 'received_at'];
const cell = v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : v;
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.appendRow = function (r) { this.rows.push(r.map(cell)); };
Sheet.prototype.getRange = function (r, c, nr, nc) {
  const s = this;
  return {
    getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => { const y = x.slice(c - 1, c - 1 + (nc || 1)); while (y.length < (nc || 1)) y.push(''); return y; }),
    // the office writes every tab in one go; the sheet keeps a leading ' as "this is text"
    setValues: vals => { vals.forEach((row, i) => { s.rows[r - 1 + i] = row.map(cell); }); }
  };
};
const TABS = {
  LIST_MILLS: ['name', 'kind', 'location', 'note', 'active'],
  LIST_PEOPLE: ['worker_id', 'name', 'job', 'gang', 'sex', 'mandor', 'active'],
  WORKER_LOG: ['worker_id', 'name', 'kind', 'day', 'note', 'answered_by', 'answered_at', 'old_name', 'old_sex', 'new_sex', 'ref'],
  FH_TICKET: ['ticket_no', 'trip', 'mill', 'do_no', 'lorry', 'driver', 'time', 'first_kg', 'second_kg', 'deduct_kg', 'nett_kg', 'nett_mt', 'bunches', 'abw_kg', 'note', 'lorry_bunches', 'mill_bunches', 'rej_ur', 'rej_emp', 'rej_rott', 'rej_mt'],
  FH_TICKET_BLOCK: ['ticket_no', 'block', 'bunches', 'mt'],
  FH_WORK: ['chit', 'worker_id', 'task_code', 'block', 'lot', 'qty', 'unit', 'bunches', 'confirmed_by', 'confirmed_at', 'note', 'bags', 'machine', 'meter_start', 'meter_end', 'hours']
};
function build() {
  const tabs = {};
  Object.keys(TABS).forEach(k => { tabs[k] = new Sheet([std.concat(TABS[k]).concat(['received_at'])]); });
  const put = (tab, vals) => { const h = tabs[tab].rows[0]; const r = h.map(c => vals[c] === undefined ? '' : vals[c]); tabs[tab].rows.push(r); };
  // already in the book: one Paitan harvester with his own code, one mill, and one Sugut lorry
  put('LIST_PEOPLE', { id: 'WK-1', date: '2026-10-20', company: 'SPLT', estate: 'PTAN', keyed_by: 'OWNER', status: 'active', worker_id: 'PTAN001', name: 'Hamid bin Osman', job: 'Penuai', gang: 'Tuai', sex: 'M', active: 'Y' });
  put('LIST_MILLS', { id: 'ML-1', date: '2026-10-20', company: 'SPLT', estate: 'PTAN', keyed_by: 'SEED', status: 'active', name: 'Fortuna', kind: 'mill', active: 'Y' });
  put('FH_TICKET', { id: 'TK-SSGT-1', date: '2026-11-10', company: 'SPLT', estate: 'SSGT', keyed_by: 'SSGT-C01', status: 'active', ticket_no: '900001', nett_mt: 12.5, mill: 'Fortuna' });
  const book = { getSheetByName: n => tabs[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur' };
  const mem = {}, props = {};
  const ctx = {
    console, Date, Utilities: { formatDate: fmt }, SpreadsheetApp: { openById: () => book },
    Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
    CacheService: { getScriptCache: () => ({ get: k => mem[k] || null, put: (k, v) => { mem[k] = v; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, getProperties: () => props }) },
    LockService: {}, ContentService: {}, Logger: { log() {} }
  };
  vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
  return { ctx, tabs };
}
// Made-up data in the same shape as the real file: 4 lorries and 2 harvesters.
const extra = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'melu-old-2026.gs'), 'utf8');
const { ctx, tabs } = build();
vm.runInContext(extra, ctx);
const fake = {}; for (let i = 1; i <= 17; i++) fake['D' + i] = 'Pemandu Contoh ' + i; for (let i = 1; i <= 48; i++) fake['H' + i] = 'PENUAI' + i;
fake.H3 = 'AGUS';   // the made-up list below has one Agus: a unique first name is matched
ctx.MELU_OLD_NAMES_ = undefined;
check('without the name file nothing is written', vm.runInContext('importMeliau2026()', ctx).error === 'no_name_file' && tabs.FH_TICKET.rows.length === 2);
ctx.MELU_OLD_NAMES_ = fake; vm.runInContext('MELU_OLD_NAMES_ = this.MELU_OLD_NAMES_', ctx);
const put = (tab, vals) => { const h = tabs[tab].rows[0]; tabs[tab].rows.push(h.map(c => vals[c] === undefined ? '' : vals[c])); };
put('LIST_PEOPLE', { id: 'WK-M1', estate: 'MELU', company: 'SPLT', keyed_by: 'OWNER', status: 'active', worker_id: 'MELU900', name: 'Agus bin Contoh', job: 'Penuai', active: 'Y' });
put('LIST_PEOPLE', { id: 'WK-M2', estate: 'MELU', company: 'SPLT', keyed_by: 'OWNER', status: 'active', worker_id: 'MELU901', name: 'Penuai1 bin Satu', job: 'Penuai', active: 'Y' });
put('LIST_PEOPLE', { id: 'WK-M3', estate: 'MELU', company: 'SPLT', keyed_by: 'OWNER', status: 'active', worker_id: 'MELU902', name: 'Penuai1 bin Dua', job: 'Penuai', active: 'Y' });
const a = vm.runInContext('importMeliau2026()', ctx), b = vm.runInContext('importMeliau2026()', ctx);
const col = (t, c) => tabs[t].rows[0].indexOf(c), rows = (t, f) => tabs[t].rows.slice(1).filter(f || (() => true));
const melu = t => r => r[col(t, 'estate')] === 'MELU', sum = (t, c) => rows(t, melu(t)).reduce((x, r) => x + (Number(r[col(t, c)]) || 0), 0);
check('702 lorries, 4,077.50 MT, six mills and centres', a.tickets === 702 && sum('FH_TICKET', 'nett_mt').toFixed(2) === '4077.50' && a.mills === 6, JSON.stringify(a).slice(0, 200));
check('block split only where the book agrees: 769 lines, 3,130.00 MT', a.blocks === 769 && sum('FH_TICKET_BLOCK', 'mt').toFixed(2) === '3130.00', a.blocks + ' ' + sum('FH_TICKET_BLOCK', 'mt').toFixed(2));
const nb = rows('FH_TICKET', r => /petak tidak dimuat/.test(r[col('FH_TICKET', 'note')]));
check('148 lorries carry no split, with both answers of the book in the note', nb.length === 148 && /lajur petak buku "4" tidak sama dengan pecahan tan "5=5.75"/.test(nb.map(r => r[col('FH_TICKET', 'note')]).join('\n')), nb.length);
check('the ticket used twice comes in once more as -2', rows('FH_TICKET', r => r[col('FH_TICKET', 'ticket_no')] === 'A053408-2').length === 1);
check('a wrong year in the book is taken from the month sheet, noted', rows('FH_TICKET', r => /tarikh dalam buku 06\.01\.20226/.test(r[col('FH_TICKET', 'note')]) && r[col('FH_TICKET', 'date')] === '2026-01-06').length === 3);
check('2,378 harvester days, 187,222 bunches', a.work === 2378 && sum('FH_WORK', 'bunches') === 187222);
check('a harvester\'s block only on a one-block day: 859 days', rows('FH_WORK', r => melu('FH_WORK')(r) && r[col('FH_WORK', 'block')]).length === 859);
check('a unique first name is matched to the worker list; a shared one is not', a.matched === 1 && /MELU900/.test(a.matches[0]) && rows('LIST_PEOPLE', r => r[col('LIST_PEOPLE', 'name')] === 'PENUAI1' && r[col('LIST_PEOPLE', 'active')] === 'N').length === 1, JSON.stringify(a.matches));
check('47 Pekerja lama, not on the muster', a.people === 47 && rows('LIST_PEOPLE', r => melu('LIST_PEOPLE')(r) && r[col('LIST_PEOPLE', 'active')] === 'N').length === 47);
check('every row is IMPORT and "Data lama"', rows('FH_TICKET', melu('FH_TICKET')).every(r => r[col('FH_TICKET', 'keyed_by')] === 'IMPORT' && /^Data lama/.test(r[col('FH_TICKET', 'note')])));
check('a second run adds nothing', b.tickets === 0 && b.blocks === 0 && b.work === 0 && b.people === 0 && b.mills === 0, JSON.stringify(b).slice(0, 120));
check('Sugut\'s lorry is untouched', rows('FH_TICKET', r => r[col('FH_TICKET', 'estate')] === 'SSGT').length === 1);
check('no name in the data file: drivers are D1.., harvesters H1.. only', vm.runInContext('MELU_OLD_.tickets.every(function (t) { return /^D\\d+$/.test(t.split("|")[5]); }) && MELU_OLD_.work.every(function (w) { return /^H\\d+$/.test(w.split("|")[0]); })', ctx));
