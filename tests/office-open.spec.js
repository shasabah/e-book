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
const T = new Date(); const D = n => { const d = new Date(T); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); };
const work = new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
  ['w1', D(1),'SPLT','SSGT','T','','P07','active','', 'c','W1','HV01','03','3-30','','bunch','600'],
  ['w2', D(1),'SPLT','SSGT','T','','P07','active','', 'c','W2','HV01','03','3-31','','bunch','500'],
  ['w3', D(1),'SPLT','SSGT','T','','P07','active','', 'c','W3','HV01','02','2-5','','bunch','400']]);
const dis = new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver']),
  ['d1', D(0),'SPLT','SSGT','S','','P07','active','','900','SA1','BOU','','','03','LR-1','8524','X'],
  ['d2', D(0),'SPLT','SSGT','S','','P07','active','d1','1100','SA1','BOU','','','03','LR-1','8524','X'],   // corrected
  ['d3', D(0),'SPLT','SSGT','S','','P07','active','','100','SA2','BOU','','','02','LR-2','8530','Y']]);
const lot = new Sheet([std.concat(['trip','dn_no','block','lot','work_id','date_cut','worker_id','bunches']),
  ['l1', D(0),'SPLT','SSGT','S','','P07','active','','LR-1','8524','03','3-30','w1',D(1),'W1','600'],
  ['l2', D(0),'SPLT','SSGT','S','','P07','active','','LR-1','8524','03','3-31','w2',D(1),'W2','300'],
  ['l3', D(0),'SPLT','SSGT','S','','P07','active','l1','LR-1','8524','03','3-30','w1',D(1),'W1','600'],
  ['l4', D(0),'SPLT','SSGT','S','','P07','active','l2','LR-1','8524','03','3-31','w2',D(1),'W2','500']]);
const tk = new Sheet([std.concat(['ticket_no','trip']), ['t1', D(0),'SPLT','SSGT','C','','P01','active','','469600','LR-2']]);
const th = new Sheet([std.concat(['ticket_no','work_id','date_cut','block','lot','worker_id','bunches','abw_kg','mt','source']),
  ['h1', D(0),'SPLT','SSGT','C','','P01','active','','469600','w3',D(1),'02','2-5','W3','150','14','2.1','ticket'],
  ['h2', D(0),'SPLT','SSGT','C','','P01','active','','469404','w1',D(1),'03','3-30','W1','600','14','8.5','dn']]);
const tabs = { FH_WORK: work, FH_DISPATCH: dis, FH_DISPATCH_LOT: lot, FH_TICKET: tk, FH_TICKET_HARV: th };
const ctx = { SpreadsheetApp: { openById: () => ({ getSpreadsheetTimeZone: () => 'Etc/GMT', getSheetByName: n => tabs[n] || null }) },
  Utilities: { formatDate: (d, z, f) => d.toISOString().slice(0, 10) },
  Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: {}, ContentService: {}, PropertiesService: {}, CacheService: {} };
vm.createContext(ctx); vm.runInContext(code, ctx);
const open = JSON.stringify(ctx.openHarvest('SSGT').lines.map(l => l.lot + '=' + l.bunches));
check('office open harvest: only 2-5=250 left (corrected DN counted once)', open === '["2-5=250"]', open);
const trips = ctx.openTrips('SSGT').trips;
check('office trips: LR-1 waits with 1100 bunches and 2 lots', trips.length === 1 && trips[0].bunches === 1100 && trips[0].lots.length === 2, JSON.stringify(trips).slice(0, 160));
