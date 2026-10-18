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
const m = new Date().toISOString().slice(0, 7);
const dis = new Sheet([std.concat(['bunches','block','trip']),
  ['d1', m + '-01','SPLT','SSGT','S','','P07','active','','900','03','LR-1'],
  ['d2', '2026-09-30','SPLT','SSGT','S','','P07','active','','500','02','LR-0']]);   // last month's lorry, weighed this month
const tk = new Sheet([std.concat(['ticket_no','trip','nett_mt','bunches']),
  ['t1', m + '-01','SPLT','SSGT','C','','P01','active','','469404','LR-1','15.7','1100'],
  ['t0', m + '-01','SPLT','SSGT','C','','P01','active','','469300','LR-0','7.0','500'],
  ['t2', m + '-02','SPLT','SSGT','C','','P01','active','','469500','','2.1','150']]);
const tb = new Sheet([std.concat(['ticket_no','block','bunches','mt']),
  ['b1', m + '-01','SPLT','SSGT','C','','P01','active','','469404','03','1100','15.7'],
  ['b2', m + '-02','SPLT','SSGT','C','','P01','active','','469500','02','150','2.1'],
  ['b0', m + '-01','SPLT','SSGT','C','','P01','active','','469300','02','500','7.0']]);
const tabs = { FH_DISPATCH: dis, FH_TICKET: tk, FH_TICKET_BLOCK: tb };
const ctx = { SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null }) },
  Utilities: { formatDate: (d, z, f) => f === 'yyyy-MM' ? d.toISOString().slice(0, 7) : d.toISOString().slice(0, 10) },
  Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: {}, ContentService: {}, PropertiesService: {}, CacheService: {} };
vm.createContext(ctx); vm.runInContext(code, ctx);
const r = ctx.tonnageMtd_('SSGT', new Date());
check('office month-to-date by DN date: 17.8 MT, 2 tickets (last month lorry left out)', r.mt === 17.8 && r.tickets === 2 && r.bunches === 1250, JSON.stringify(r));
