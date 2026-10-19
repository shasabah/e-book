// E-Book test. Run with tests/run.sh (office script, no server needed).
const ROOT = require('path').resolve(__dirname, '..');
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }; };
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
const D = s => new Date(s + 'T00:00:00');
const work = new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
  ['w1', D('2026-10-16'),'SPLT','SSGT','T','','P07','active','', 'c','W1','HA','03','3-24','','bunch','160'],
  ['w2', D('2026-10-16'),'SPLT','SSGT','T','','P07','active','', 'c','W2','HA','03','3-25','','bunch','100'],
  ['w3', '2026-10-17','SPLT','SSGT','T','','P07','active','', 'c','W1','HA','03','3-25','','bunch','50'],
  ['w4', '2026-10-17','SPLT','SSGT','T','','P07','active','', 'c','W3','HA','03','3-26','','bunch','90'],
  ['w5', '2026-10-17','SPLT','SSGT','T','','P07','active','w4','c','W3','HA','03','3-26','','bunch','80'],   // correction of w4
  ['w6', '2026-10-17','SPLT','SSGT','T','','P07','active','', 'c','W4','MN01','02','2-10','0.5','Ha',''],
  ['w7', '2026-10-17','SPLT','MELU','T','','P07','active','', 'c','W9','HA','01','1-1','','bunch','999']]);
const col = new Sheet([std.concat(['block','lot','bunches','cleared','tractor','loader','note']),
  ['c1', D('2026-10-16'),'SPLT','SSGT','L','','P01','active','','03','3-24','160','Y','','',''],
  ['c2', '2026-10-17','SPLT','SSGT','L','','P01','active','','03','3-25','120','','','',''],
  ['c3', '2026-10-17','SPLT','SSGT','L','','P01','active','','03','3-26','30','','','','']]);
const dis = new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note']),
  ['d1', '2026-10-17','SPLT','SSGT','L','','P01','active','','200','SA1','Boustead','','']]);
const ctx = { SpreadsheetApp: { openById: () => ({ getSpreadsheetTimeZone: () => 'Etc/GMT', getSheetByName: n => ({ FH_WORK: work, FH_COLLECT: col, FH_DISPATCH: dis })[n] || null }) },
  Utilities: { formatDate: (d, z, f) => { const y = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); const hm = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); return f === 'yyyy-MM-dd' ? y : f === 'HH:mm' ? hm : y + ' ' + hm; } },
  Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: {}, ContentService: {}, PropertiesService: {}, CacheService: {} };
vm.createContext(ctx); vm.runInContext(code, ctx);
const r = ctx.backlog('SSGT');
check('office backlog runs and returns field, ramp, checks and tonnage', r.ok && Array.isArray(r.field) && r.ramp && Array.isArray(r.checks) && r.tonnage, JSON.stringify(r).slice(0, 160));
