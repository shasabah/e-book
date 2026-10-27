// E-Book test (1.43). TUTUP HARI — office side (server/core.gs), no server needed.
// - A closed day refuses a new work row from the Staff (day_closed); the Owner is never locked out.
// - A fix ask (C · Betulkan chit) standing for that day opens it again; a reopen row too.
// - Days before DAYCLOSE_FROM are never locked. A close for a day with no chit is refused; closing twice is refused.
// - history_ marks the day closed; dayCloseRead_ lists open days; todo_ gives Staff / Manager / Owner their lines.
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
const chit = new Sheet([std.concat(['chit','rain_mm','rain_time','working','not_working','grand_total','confirmed_by','confirmed_at','note','received_at']),
  ['c1', D(1),'SPLT','SSGT','STF','' + D(1) + ' 06:10','P13','active','', 'CH-1','','','3','1','4','STF',D(1) + ' 06:10','',''],
  ['c0', D(2),'SPLT','SSGT','STF','' + D(2) + ' 06:10','P13','active','', 'CH-0','','','3','1','4','STF',D(2) + ' 06:10','',''],
  ['cT', D(0),'SPLT','SSGT','STF','' + D(0) + ' 06:10','P13','active','', 'CH-T','','','3','1','4','STF',D(0) + ' 06:10','','']]);
const closeCols = ['chit','kind','closed_by','closed_at','checks','rain_when','rain_reason','rain_lost','rain_jobs','workers','present','bunches','jobs_done','jobs_planned','lorries','note','received_at'];
const dcl = new Sheet([std.concat(closeCols),
  ['dc1', D(1),'SPLT','SSGT','STF',D(1) + ' 17:30','P13','active','', 'CH-1','close','STF',D(1) + ' 17:30','1✓ 2✓','work','HENTI','0.5','CPS','4','3','230','1','2','1','','']]);
const alert = new Sheet([std.concat(['chit','kind','block','lot','detail','staff_note','direction','direction_by','ref','received_at'])]);
const work = new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches','confirmed_by','confirmed_at','note','received_at'])]);
const users = new Sheet([['user_code','name','role','estates','key_hash','status','added_at','phones','position'], ['STF','Ferezelly','Staff','SSGT','x','active','','P13','Field Staff']]);
const tabs = { FH_CHIT: chit, FH_DAYCLOSE: dcl, FH_ALERT: alert, FH_WORK: work, USERS: users, FH_MUSTER: new Sheet([std.concat(['chit','block','lots','mandor','worker_id','task_code','muster','confirmed_by','confirmed_at','note','received_at'])]),
  FH_JOBDAY: new Sheet([std.concat(['chit','task_code','block','lots','workers','qty','unit','bunches','plan_ha','job_status','reason','flags','confirmed_by','confirmed_at','progress','bags','target','received_at'])]),
  FH_DISPATCH: new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver','received_at'])]), FH_TICKET: new Sheet([std.concat(['ticket_no','trip','received_at'])]), FH_COLLECT: new Sheet([std.concat(['block','lot','bunches','cleared','tractor','loader','note','received_at'])]),
  FH_DISPATCH_LOT: new Sheet([std.concat(['trip','dn_no','block','lot','work_id','date_cut','worker_id','bunches','received_at'])]), FH_GRADING: new Sheet([std.concat(['ticket_no','received_at'])]), LIST_PEOPLE: new Sheet([std.concat(['worker_id','name','job','gang','sex','mandor','active','received_at'])]),
  WORKER_LOG: new Sheet([std.concat(['worker_id','name','kind','day','note','answered_by','answered_at','old_name','old_sex','new_sex','ref','received_at'])]), MILL_LOG: new Sheet([std.concat(['ref','name','mill_kind','location','kind','note','received_at'])]), LIST_MILLS: new Sheet([std.concat(['name','kind','location','note','active','received_at'])]), LIST_BUDGET: new Sheet([std.concat(['month','budget_mt','abw_kg','work_days','note','received_at'])]), FH_PLAN: new Sheet([std.concat(['chit','block','lots','mandor','worker_id','task_code','muster','confirmed_by','confirmed_at','note','received_at'])]), FH_TICKET_HARV: new Sheet([std.concat(['ticket_no','work_id','date_cut','block','lot','worker_id','bunches','abw_kg','mt','source','received_at'])]), FH_TICKET_BLOCK: new Sheet([std.concat(['ticket_no','block','bunches','mt','received_at'])]) };
const props = {};
const ctx = { SpreadsheetApp: { openById: () => ({ getSpreadsheetTimeZone: () => 'Etc/GMT', getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = new Sheet([])) }) },
  Utilities: { formatDate: (d, z, f) => f === 'yyyy' ? d.toISOString().slice(0, 4) : f.indexOf('HH') >= 0 ? d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16) : d.toISOString().slice(0, 10) },
  Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => {} }) }, ContentService: {},
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) }, console: console };
vm.createContext(ctx); vm.runInContext(code, ctx);
props.DAYCLOSE_FROM = D(5);
const staff = { user_code: 'STF', role: 'Staff', estates: ['SSGT'] }, owner = { user_code: 'OWN', role: 'Owner', estates: ['SSGT'] }, mgr = { user_code: 'MGR', role: 'Manager', estates: ['SSGT'] };
function row(id, date, extra) { return Object.assign({ id: id, date: date, company: 'SPLT', estate: 'SSGT', keyed_by: 'STF', keyed_at: date + ' 18:00', phone: 'P13', status: 'active', replaces: '' }, extra); }
const wrow = (id, date) => row(id, date, { chit: 'CH-1', worker_id: 'H1', task_code: 'HA', block: '01', lot: '1-13', qty: '', unit: 'bunch', bunches: '100', confirmed_by: 'STF', confirmed_at: date + ' 18:00', note: '' });
let r = ctx.saveBatch(staff, [{ tab: 'FH_WORK', row: wrow('w9', D(1)) }]);
check('closed day: a new work row from the Staff is refused (day_closed)', r.ok && r.results[0].error === 'day_closed', JSON.stringify(r));
r = ctx.saveBatch(staff, [{ tab: 'FH_WORK', row: wrow('w8', D(2)) }]);
check('an open day (chit, no close) takes the row', r.ok && r.results[0].ok === true, JSON.stringify(r));
r = ctx.saveBatch(owner, [{ tab: 'FH_WORK', row: wrow('w7', D(1)) }]);
check('the Owner is never locked out', r.ok && r.results[0].ok === true, JSON.stringify(r));
r = ctx.saveRow(staff, 'FH_WORK', wrow('w6', D(1)));
check('saveRow: the same lock', r.error === 'day_closed', JSON.stringify(r));
props.DAYCLOSE_FROM = D(0);
r = ctx.saveBatch(staff, [{ tab: 'FH_WORK', row: wrow('w5', D(1)) }]);
check('a day before DAYCLOSE_FROM is never locked', r.ok && r.results[0].ok === true, JSON.stringify(r));
props.DAYCLOSE_FROM = D(5);
// a close for a day with no chit; a second close of the same day
r = ctx.saveBatch(staff, [{ tab: 'FH_DAYCLOSE', row: row('dc9', D(3), { chit: 'CH-X', kind: 'close', closed_by: 'STF', closed_at: D(3) + ' 18:00', checks: '', rain_when: '', rain_reason: '', rain_lost: '', rain_jobs: '', workers: '1', present: '1', bunches: '0', jobs_done: '0', jobs_planned: '0', lorries: '0', note: '' }) }]);
check('a close for a day with no chit is refused (no_chit)', r.results[0].error === 'no_chit', JSON.stringify(r));
r = ctx.saveBatch(staff, [{ tab: 'FH_DAYCLOSE', row: row('dc8', D(1), { chit: 'CH-1', kind: 'close', closed_by: 'STF', closed_at: D(1) + ' 19:00', checks: '', rain_when: '', rain_reason: '', rain_lost: '', rain_jobs: '', workers: '1', present: '1', bunches: '0', jobs_done: '0', jobs_planned: '0', lorries: '0', note: '' }) }]);
check('closing a closed day again is refused (already_closed)', r.results[0].error === 'already_closed', JSON.stringify(r));
r = ctx.saveBatch(staff, [{ tab: 'FH_DAYCLOSE', row: row('dc7', D(2), { chit: 'CH-0', kind: 'close', closed_by: 'STF', closed_at: D(2) + ' 19:00', checks: '', rain_when: 'night', rain_reason: 'BASAH', rain_lost: '0.25', rain_jobs: 'ITF', workers: '4', present: '3', bunches: '0', jobs_done: '1', jobs_planned: '1', lorries: '0', note: '' }) }]);
check('closing an open day works', r.results[0].ok === true, JSON.stringify(r));
r = ctx.saveBatch(mgr, [{ tab: 'FH_DAYCLOSE', row: row('dc6', D(0), { chit: 'CH-T', kind: 'close', closed_by: 'MGR', closed_at: D(0) + ' 19:00', checks: '', rain_when: '', rain_reason: '', rain_lost: '', rain_jobs: '', workers: '1', present: '1', bunches: '0', jobs_done: '0', jobs_planned: '0', lorries: '0', note: '' }) }]);
check('the Pengurus cannot close a day (not_allowed)', r.results[0].error === 'not_allowed', JSON.stringify(r));
// todo lines: today's chit exists, D(1) closed, D(2) now closed → nothing open … reopen D(1) through a fix ask
let t = ctx.todo_(staff, { estate: 'SSGT' });
check('Staff: no TUTUP HARI line when every past day is closed', !t.items.some(x => /^TH:/.test(x.id)), JSON.stringify(t.items.map(x => x.id)));
const ask = ctx.chitAsk_({ user_code: 'CLK', role: 'Clerk', estates: ['SSGT'] }, { estate: 'SSGT', chit: 'CH-1', note: 'Herman salah kerja' });
check('clerk asks for a fix: the office writes a reopen row for the closed day', ask.ok && dcl.rows.some(x => x[closeCols.indexOf('kind') + std.length] === 'reopen' && x[1] === D(1)), JSON.stringify(ask) + ' ' + dcl.rows.length);
r = ctx.saveBatch(staff, [{ tab: 'FH_WORK', row: wrow('w4', D(1)) }]);
check('after the fix ask the day takes the correction rows', r.ok && r.results[0].ok === true, JSON.stringify(r));
t = ctx.todo_(staff, { estate: 'SSGT' });
check('Staff: "dibuka semula · tutup semula" line for the reopened day', t.items.some(x => x.id === 'TH:' + D(1) && /dibuka semula/.test(x.bm) && x.go === '#field-harvest/close'), JSON.stringify(t.items.filter(x => /^TH:/.test(x.id))));
t = ctx.todo_(mgr, { estate: 'SSGT' });
check('Pengurus: red line, day not closed by the staff', t.items.some(x => x.id === 'TH:' + D(1)), JSON.stringify(t.items.map(x => x.id)));
t = ctx.todo_(owner, { estate: 'SSGT' });
check('Owner: no line yet (open under 2 days)', !t.items.some(x => /^TO:/.test(x.id)), JSON.stringify(t.items.map(x => x.id)));
// close D(1) again (replacing the first close) → closed again
r = ctx.saveBatch(staff, [{ tab: 'FH_DAYCLOSE', row: row('dc5', D(1), { chit: 'CH-1', kind: 'close', closed_by: 'STF', closed_at: new Date(Date.now() + 60000).toISOString().slice(0, 16).replace('T', ' '),   // after the reopen, whatever the hour (was a fixed 20:00, failed after 20:00 UTC)
  checks: '', rain_when: '', rain_reason: '', rain_lost: '', rain_jobs: '', workers: '4', present: '3', bunches: '230', jobs_done: '2', jobs_planned: '2', lorries: '1', note: '', replaces: 'dc1' }) }]);
check('closing again after the fix is accepted', r.results[0].ok === true, JSON.stringify(r));
const rd = ctx.dayCloseRead_('SSGT');
check('dayclose read: D(2) closed, D(1) fixing (fix ask still stands), today open', JSON.stringify(rd.days.map(x => x.date + ':' + x.state)) === JSON.stringify([D(2) + ':closed', D(1) + ':fixing', D(0) + ':open']), JSON.stringify(rd.days));
const h = ctx.history_('SSGT', D(1).slice(0, 7));
const hd = h.days.find(x => x.date === D(2));
check('Rekod: the day carries close = closed, by the staff\'s name', hd && hd.close === 'closed' && hd.closeBy === 'Ferezelly', JSON.stringify(hd));
