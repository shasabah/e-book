// E-Book test (Meliau work, 19 Nov 2026: "cross check from here and upload the data to apps") Meliau's 2026 maintenance work
// from Christy's "Work Programme For Payroll", loaded the way Paitan's was (below: Paitan's own note).
// E-Book test (1.60) Paitan's 2026 maintenance work loaded from Christy's "Work Programme For Payroll"
// (Yu Chen, 13 Nov 2026: "check the task done . and import to the apps"). Block and month only, no lots and no
// day, because that is all the sheet holds. Every row marked "Data lama" and keyed_by IMPORT; nothing deleted;
// running it twice adds nothing; Sugut is never touched. No money goes into the app (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'server', 'core.gs'), 'utf8');
const dataFile = fs.readFileSync(path.join(root, 'server', 'melu-work-2026.gs'), 'utf8');
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
    setValues: vals => { vals.forEach((row, i) => { s.rows[r - 1 + i] = row.map(cell); }); }
  };
};
const COLS = ['chit', 'task_code', 'block', 'lots', 'workers', 'qty', 'unit', 'bunches', 'plan_ha', 'job_status', 'reason', 'flags', 'confirmed_by', 'confirmed_at', 'progress', 'bags', 'target', 'dose', 'note'];
const tabs = { FH_JOBDAY: new Sheet([std.concat(COLS).concat(['received_at'])]) };
// one Sugut line already there, to prove it is never touched
{
  const h = tabs.FH_JOBDAY.rows[0];
  const v = { id: 'JD-SSGT-1', date: '2026-10-20', company: 'SPLT', estate: 'SSGT', keyed_by: 'IMPORT', status: 'active', task_code: 'MAN', block: '02', qty: 24.02, unit: 'Ha', job_status: 'done' };
  tabs.FH_JOBDAY.rows.push(h.map(c => v[c] === undefined ? '' : v[c]));
}
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

const H = tabs.FH_JOBDAY.rows[0], col = (r, k) => r[H.indexOf(k)];
const rows = est => tabs.FH_JOBDAY.rows.slice(1).filter(r => col(r, 'estate') === est);

vm.runInContext(dataFile, ctx);
const out = ctx.importMeliauWork2026();
const pt = rows('MELU');
const sum = (c, b) => Math.round(pt.filter(r => col(r, 'task_code') === c && (!b || col(r, 'block') === b)).reduce((s, r) => s + Number(col(r, 'qty')), 0) * 100) / 100;
const month = (c, mm) => Math.round(pt.filter(r => col(r, 'task_code') === c && String(col(r, 'date')).slice(5, 7) === mm).reduce((s, r) => s + Number(col(r, 'qty')), 0) * 100) / 100;
check('every month line of the sheet is loaded', out.work === pt.length && pt.length === 108, JSON.stringify(out) + ' rows ' + pt.length);
check('the six blocks are there, and no lot is invented', [...new Set(pt.map(r => col(r, 'block')))].sort().join(',') === '01,02,03,04,05,06' && pt.every(r => col(r, 'lots') === ''));
check('every row is marked IMPORT, "Data lama" and done', pt.every(r => col(r, 'keyed_by') === 'IMPORT' && /^Data lama: /.test(col(r, 'note')) && col(r, 'job_status') === 'done' && col(r, 'company') === 'SPLT'));
check('every row is dated the last day of its month, Jan to Oct', pt.every(r => /^2026-(0[1-9]|10)-(28|30|31)$/.test(String(col(r, 'date')))));
// the sheet's own TOTAL lines
check('circle spray 391.41 Ha; by month Apr 115.25, May 63.41, Jun 16.54, Jul 39.12, Aug 54.42, Sep 28.19, Oct 74.48',
  sum('CPS') === 391.41 && ['04', '05', '06', '07', '08', '09', '10'].map(m => month('CPS', m)).join() === '115.25,63.41,16.54,39.12,54.42,28.19,74.48', sum('CPS') + ' ' + ['04', '05', '06', '07', '08', '09', '10'].map(m => month('CPS', m)).join());
check('VOP spray 242.79 Ha (Apr 32.35, May 89.25, Jul 48.28, Aug 37.72, Sep 35.19)', sum('VOPS') === 242.79 && ['04', '05', '07', '08', '09'].map(m => month('VOPS', m)).join() === '32.35,89.25,48.28,37.72,35.19', String(sum('VOPS')));
check('lalang spray 142.62 Ha, selective spray 5.59 Ha, slashing 142.59 Ha', sum('LS') === 142.62 && sum('SS') === 5.59 && sum('SL') === 142.59, [sum('LS'), sum('SS'), sum('SL')].join(' '));
check('manuring 943.10 Ha: NutriGem 269.36, NKB 280.66, FMP 280.66, NK 112.42',
  sum('MAN') === 943.1 && ['NutriGem', 'NKB', 'FMP', 'NK'].map(n => Math.round(pt.filter(r => new RegExp('Membaja ' + n + ' ').test(col(r, 'note'))).reduce((s, r) => s + Number(col(r, 'qty')), 0) * 100) / 100).join() === '269.36,280.66,280.66,112.42', String(sum('MAN')));
check('abandoned palms 8,016, in palms; by block 1,178 704 831 483 616 4,204',
  sum('AP') === 8016 && ['01', '02', '03', '04', '05', '06'].map(b => sum('AP', b)).join() === '1178,704,831,483,616,4204' && pt.filter(r => col(r, 'task_code') === 'AP').every(r => col(r, 'unit') === 'palm'), ['01', '02', '03', '04', '05', '06'].map(b => sum('AP', b)).join());
check('October agrees with the payroll analysis in the same file: circle spray 74.48 Ha, abandoned palms 250', month('CPS', '10') === 74.48 && month('AP', '10') === 250);
check('no block gets more manuring of one fertiliser than its own hectares',
  (() => { const ha = { '01': 53, '02': 43.97, '03': 41.95, '04': 39.74, '05': 41.28, '06': 60.72 }; const m = {}; pt.filter(r => col(r, 'task_code') === 'MAN').forEach(r => { const k = col(r, 'block') + String(col(r, 'note')).split(' \u00b7')[0]; m[k] = (m[k] || 0) + Number(col(r, 'qty')); }); return Object.keys(m).every(k => m[k] <= ha[k.slice(0, 2)] + 0.005); })());
const tasks = fs.readFileSync(path.join(root, 'lists', 'tasks.js'), 'utf8');
check('every job code is on the job list', [...new Set(pt.map(r => col(r, 'task_code')))].every(c => tasks.indexOf("code: '" + c + "'") >= 0), [...new Set(pt.map(r => col(r, 'task_code')))].join());
check('no money and no name in the data file', !/RM|\d{4}\.\d{2}\b.*RM/.test(dataFile.split('var MELU_WORK_2026_')[1].split('];')[0]) && !/BIN |BINTI |BT /.test(dataFile));
const before = tabs.FH_JOBDAY.rows.length, again = ctx.importMeliauWork2026();
check('running it twice adds nothing', again.work === 0 && again.same === 108 && tabs.FH_JOBDAY.rows.length === before, JSON.stringify(again));
check('Sugut is never touched', rows('SSGT').length === 1 && col(rows('SSGT')[0], 'qty') === 24.02);
