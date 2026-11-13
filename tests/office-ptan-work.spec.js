// E-Book test (1.60) Paitan's 2026 maintenance work loaded from Christy's "Work Programme For Payroll"
// (Yu Chen, 13 Nov 2026: "check the task done . and import to the apps"). Block and month only, no lots and no
// day, because that is all the sheet holds. Every row marked "Data lama" and keyed_by IMPORT; nothing deleted;
// running it twice adds nothing; Sugut is never touched. No money goes into the app (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'server', 'core.gs'), 'utf8');
const dataFile = fs.readFileSync(path.join(root, 'server', 'ptan-work-2026.gs'), 'utf8');
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

check('no data file: nothing is written and it says so', (() => {
  const o = ctx.importPaitanWork2026();
  return o && o.ok === false && o.error === 'no_data_file' && rows('PTAN').length === 0;
})(), '');

vm.runInContext(dataFile, ctx);
const out = ctx.importPaitanWork2026();
const pt = rows('PTAN');
const sum = (c, b) => Math.round(pt.filter(r => col(r, 'task_code') === c && (!b || col(r, 'block') === b))
  .reduce((s, r) => s + Number(col(r, 'qty')), 0) * 100) / 100;

check('every month line of the sheet is loaded', out.work === 183 && pt.length === 183, JSON.stringify(out) + ' rows ' + pt.length);
check('the five blocks are there, and no lot is invented',
  [...new Set(pt.map(r => col(r, 'block')))].sort().join(',') === '01,02,03,04,9A' && pt.every(r => col(r, 'lots') === ''),
  [...new Set(pt.map(r => col(r, 'block')))].sort().join(','));
check('every row is marked IMPORT, "Data lama" and done',
  pt.every(r => col(r, 'keyed_by') === 'IMPORT' && /^Data lama: /.test(col(r, 'note')) && col(r, 'job_status') === 'done'), 'marks');
check('every row carries the month it belongs to, dated its last day',
  pt.every(r => /^2026-(0[1-9]|10)-(28|29|30|31)$/.test(String(col(r, 'date')))),
  [...new Set(pt.map(r => String(col(r, 'date'))))].sort().join(' '));
check('a 30-day month ends on the 30th and February on the 28th',
  ctx.monthEnd_('2026-04') === '2026-04-30' && ctx.monthEnd_('2026-02') === '2026-02-28' && ctx.monthEnd_('2026-12') === '2026-12-31',
  [ctx.monthEnd_('2026-04'), ctx.monthEnd_('2026-02')].join(' '));

// the totals, against the sheet Claude read
check('circle spray: 548.78 Ha, three rounds of each block', sum('CPS') === 548.78 && sum('CPS', '01') === 119.91, sum('CPS') + ' / ' + sum('CPS', '01'));
check('slashing 361.66 Ha, lalang spray 180.50 Ha, VOP spray 217.93 Ha',
  sum('SL') === 361.66 && sum('LS') === 180.5 && sum('VOPS') === 217.93, [sum('SL'), sum('LS'), sum('VOPS')].join(' · '));
check('manuring 627.51 Ha over four fertilisers, about three rounds of five planned', sum('MAN') === 627.51, String(sum('MAN')));
check('pruning 352.48 Ha, decreeping 258.69 Ha', sum('RP') === 352.48 && sum('DEC') === 258.69, sum('RP') + ' / ' + sum('DEC'));
check('abandoned palms 2,369 and overdue pruning 14,266, both counted in palms',
  sum('AP') === 2369 && sum('SP') === 14266
  && pt.filter(r => ['AP', 'SP'].indexOf(col(r, 'task_code')) >= 0).every(r => col(r, 'unit') === 'palm'),
  sum('AP') + ' / ' + sum('SP'));
check('loose fruit 641 bags', sum('LF') === 641 && pt.filter(r => col(r, 'task_code') === 'LF').every(r => col(r, 'unit') === 'bag'), String(sum('LF')));
check('every hectare job is keyed in Ha',
  pt.filter(r => ['CPS', 'SL', 'LS', 'VOPS', 'MAN', 'RP', 'DEC'].indexOf(col(r, 'task_code')) >= 0).every(r => col(r, 'unit') === 'Ha'), 'units');
check('only job codes the app knows are used',
  [...new Set(pt.map(r => col(r, 'task_code')))].sort().join(',') === 'AP,CPS,DEC,LF,LS,MAN,RP,SL,SP,VOPS',
  [...new Set(pt.map(r => col(r, 'task_code')))].sort().join(','));
check('road-side trimming and the road stone line are left out, as the note says',
  !pt.some(r => /[Tt]rimming|stone/.test(String(col(r, 'note')))), 'left out');
check('no money anywhere in the data file or in what is written',
  !/RM|ringgit|salary|wage|gaji/i.test(dataFile) && !pt.some(r => /RM/.test(String(col(r, 'note')))), 'no money');

const again = ctx.importPaitanWork2026();
check('running it a second time adds nothing', again.work === 0 && again.same === 183 && rows('PTAN').length === 183, JSON.stringify(again));
check('Sugut is never touched', rows('SSGT').length === 1 && Number(col(rows('SSGT')[0], 'qty')) === 24.02, 'sugut');
