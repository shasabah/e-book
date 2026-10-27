// E-Book test (1.47). Rancangan vs sebenar — office side (server/core.gs program_ and seedProgramme2026), no server needed.
// - The Sugut 2026 programme from the budget's detailed sheets (CPS Blk 3–4 in June), seeded once.
// - Ha done per job, block and month (old data counts), crop budget and tonnes per month, the month's days: closed,
//   keyed the same day, ramp with no fruit from an earlier day; rain from the closes; lot dates only this month.
const ROOT = require('path').resolve(__dirname, '..');
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm');
const code = fs.readFileSync(require('path').resolve(ROOT, 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)), getDisplayValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc).map(String)), getDisplayValue: () => String(s.rows[r - 1][c - 1]), setValue: v => { s.rows[r - 1][c - 1] = v; }, setValues: vals => { vals.forEach((v, i) => { s.rows[r - 1 + i] = v.map(unq); }); }, createTextFinder: txt => ({ matchEntireCell: () => ({ findNext: () => { const i = s.rows.findIndex((x, k) => k >= r - 1 && String(x[c - 1]) === String(txt)); return i < 0 ? null : { getRow: () => i + 1 }; } }) }) }; };
const unq = v => typeof v === 'string' && v.charAt(0) === "'" ? v.slice(1) : v;   // a sheet swallows the text marker
Sheet.prototype.appendRow = function (v) { this.rows.push(v.map(unq)); };
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
const T = new Date(); const D = n => { const d = new Date(T); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); };
const S = (cols, rows) => new Sheet([std.concat(cols, ['received_at'])].concat(rows || []));
const R = (id, date, by, at, vals) => [id, date, 'SPLT', 'SSGT', by, at, 'P13', 'active', ''].concat(vals, ['']);
const tabs = {
  FH_CHIT: S(['chit','rain_mm','rain_time','working','not_working','grand_total','confirmed_by','confirmed_at','note'], ['10','11','12'].map(d => R('c' + d, '2026-09-' + d, 'STF', '2026-09-' + d + ' 06:10', ['CH-' + d,'','','3','0','3','STF','','']))),
  FH_JOBDAY: S(['chit','task_code','block','lots','workers','qty','unit','bunches','plan_ha','job_status','reason','flags','confirmed_by','confirmed_at','progress','bags','target','dose'], [
    R('j1', '2026-05-31', 'IMPORT', '2026-10-21 10:00', ['','CPS','01','','','33.2','Ha','','','done','','','','','','','','']),
    R('j2', '2026-09-10', 'STF', '2026-09-10 17:00', ['CH-10','CPS','03','3-1','S1','5','Ha','','','done','','','','','','','','']),
    R('j3', '2026-09-11', 'STF', '2026-09-12 07:00', ['CH-11','MAN','03','3-2','M1','','bag','','2.5','done','','','','','','20','','2.5']),
    R('j4', '2026-10-02', 'STF', '2026-10-02 17:00', ['CH-x','CPS','03','3-1','S1','4','Ha','','','done','','','','','','','',''])]),
  FH_WORK: S(['chit','worker_id','task_code','block','lot','qty','unit','bunches','confirmed_by','confirmed_at','note'], [
    R('w1', '2026-09-10', 'STF', '2026-09-10 16:00', ['CH-10','H1','HA','01','1-1','','bunch','100','STF','','']),
    R('w2', D(3), 'STF', D(3) + ' 16:00', ['CH-n','H1','HA','01','1-5','','bunch','80','STF','',''])]),
  FH_COLLECT: S(['block','lot','bunches','cleared','tractor','loader','note'], [R('k1', '2026-09-10', 'STF', '2026-09-10 16:30', ['01','1-1','100','Y','','',''])]),
  FH_DISPATCH: S(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver'], [R('d1', '2026-09-12', 'STF', '2026-09-12 09:00', ['100','SA1','BOU','Y','','01','T1','DN1',''])]),
  FH_TICKET: S(['ticket_no','trip','mill','do_no','lorry','driver','time','first_kg','second_kg','deduct_kg','nett_kg','nett_mt','bunches','abw_kg','note','lorry_bunches','mill_bunches','rej_ur','rej_emp','rej_rott','rej_mt'], [
    R('t1', '2026-09-12', 'CLK', '2026-09-12 15:00', ['501','T1','BOU','DN1','SA1','','','','','','','8.5','100','','','','','','','','']),
    R('t2', '2026-10-01', 'CLK', '2026-10-01 15:00', ['502','T2','BOU','DN2','SA1','','','','','','','9','','','','','','','','',''])]),
  FH_DAYCLOSE: S(['chit','kind','closed_by','closed_at','checks','rain_when','rain_reason','rain_lost','rain_jobs','workers','present','bunches','jobs_done','jobs_planned','lorries','note'], [
    R('x1', '2026-09-10', 'STF', '2026-09-10 18:00', ['CH-10','close','STF','2026-09-10 18:00','','work','HENTI','0.5','Circle Spraying (1 petak)','3','3','100','1','1','0',''])]),
  LIST_BUDGET: S(['month','budget_mt','abw_kg','work_days','note'], [R('b8', '2026-08-01', 'OWN', '', ['2026-08','195','','24','']), R('b9', '2026-09-01', 'OWN', '', ['2026-09','210','','24','']), R('b10', '2026-10-01', 'OWN', '', ['2026-10','220','','26',''])]),
  FH_ALERT: S(['chit','kind','block','lot','detail','staff_note','direction','direction_by','ref']),
  FH_MUSTER: S(['chit','block','lots','mandor','worker_id','task_code','muster','confirmed_by','confirmed_at','note']),
  USERS: new Sheet([['user_code','name','role','estates','key_hash','status','added_at','phones','position']])
};
const props = { DAYCLOSE_FROM: '2026-09-01' };
const ctx = { SpreadsheetApp: { openById: () => ({ getSpreadsheetTimeZone: () => 'Etc/GMT', getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = new Sheet([])) }) },
  Utilities: { formatDate: (d, z, f) => f === 'yyyy' ? d.toISOString().slice(0, 4) : f.indexOf('HH') >= 0 ? d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16) : d.toISOString().slice(0, 10) },
  Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => {} }) }, ContentService: {},
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) }, Logger: { log: () => {} }, console: console };
vm.createContext(ctx); vm.runInContext(code, ctx);
const staff = { user_code: 'STF', role: 'Staff', estates: ['SSGT'] };

let n = ctx.seedProgramme2026();
check('seed: Sugut 2026 programme, 72 lines (CPS 16, SL 8, DEC 8, VOPS 4, RP 16, MAN 20)', n === 72, String(n));
check('seed again adds nothing', ctx.seedProgramme2026() === 0);
let r = ctx.program_('SSGT', '2026-09');
const pg = (t, b) => r.programme.filter(x => x.task === t && x.block === b).map(x => x.month.slice(5) + x.round).join(' ');
check('CPS Blk 1: Feb, May, Aug, Nov', pg('CPS', '01') === '02R1 05R2 08R3 11R4', pg('CPS', '01'));
check('CPS Blk 3: Mar, Jun, Sep, Nov (detailed sheet, not the summary\'s May)', pg('CPS', '03') === '03R1 06R2 09R3 11R4', pg('CPS', '03'));
check('manuring Blk 3: Bio-Organic Mar (5 kg), FMP May, NKB Jul & Sep, NK Oct', pg('MAN', '03') === '03Bio-Organic 05FMP 07NKB 09NKB 10NK' && r.programme.find(x => x.task === 'MAN' && x.month === '2026-03').dose === 5, pg('MAN', '03'));
check('programme Ha = the block\'s Ha', r.programme.find(x => x.block === '02').ha === 33.93);
check('Ha done per job, block and month: old data counts; a later month does not', r.done['CPS|01|2026-05'] === 33.2 && r.done['CPS|03|2026-09'] === 5 && !r.done['CPS|03|2026-10'], JSON.stringify(r.done));
check('manuring in bags counts its planned Ha (as Tambah kerja\'s rounds)', r.done['MAN|03|2026-09'] === 2.5, JSON.stringify(r.done));
const c9 = r.crop.find(x => x.month === '2026-09');
check('crop: budget and tonnes per month up to the month asked', c9 && c9.budget === 210 && c9.mt === 8.5 && c9.days === 24 && r.crop.find(x => x.month === '2026-08').budget === 195 && !r.crop.find(x => x.month === '2026-10'), JSON.stringify(r.crop));
const dd = d => r.days.find(x => x.date === '2026-09-' + d) || {};
check('days with a chit only', r.days.length === 3, JSON.stringify(r.days));
check('closed: 10 Sep Y, 11 Sep N', dd('10').closed === 'Y' && dd('11').closed === 'N');
check('keyed the same day: 10 Sep yes, 11 Sep no (keyed next morning), 12 Sep no (nothing keyed)', dd('10').same === true && dd('11').same === false && dd('12').same === false, JSON.stringify(r.days));
check('ramp: 10 Sep only that day\'s fruit (ok), 11 Sep fruit from the 10th (not ok), 12 Sep lorry took it (ok)', dd('10').ramp === true && dd('11').ramp === false && dd('12').ramp === true, JSON.stringify(r.days));
check('rain from the closes: 10 Sep ½ day, HENTI, CPS', r.rain.length === 1 && r.rain[0].lost === 0.5 && r.rain[0].reason === 'HENTI' && /Circle/.test(r.rain[0].jobs), JSON.stringify(r.rain));
check('a past month has no lot dates', r.lots === null);
props.DAYCLOSE_FROM = '2026-09-11';
r = ctx.program_('SSGT', '2026-09');
check('days before the TUTUP HARI start are not judged on closing', dd('10').closed === '' && dd('11').closed === 'N');
const thisMonth = T.toISOString().slice(0, 7);
r = ctx.program_('SSGT', thisMonth);
check('this month: last harvest date of each lot', r.lots && r.lots['1-5'] === D(3), JSON.stringify(r.lots));
r = ctx.doRead_(staff, { action: 'program', estate: 'SSGT', month: '2026-9' });
check('a bad month is refused', r.error === 'bad_month', JSON.stringify(r));
r = ctx.doRead_(staff, { action: 'program', estate: 'MELU', month: '2026-09' });
check('another estate is refused', r.error === 'not_your_estate', JSON.stringify(r));
r = ctx.doRead_(staff, { action: 'program', estate: 'SSGT', month: '2026-09' });
check('the staff may read it', r.ok === true && r.programme.length === 72);
