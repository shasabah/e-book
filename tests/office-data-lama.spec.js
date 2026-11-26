// E-Book test (1.110). An old-data row (id IMP-…) stays history after a correction keyed by someone else, so it never
// counts as fruit in the field (Yu Chen, 26 Nov 2026 8:37 pm "ok"; Meliau's false "14267 tandan masih di ladang").
// Run with tests/run.sh (office script, no server needed). Made-up data only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }; };
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
const work = new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
  ['IMP-MELU-HA-OLD1-0912', '2026-09-12','SPLT','MELU','IMPORT','','OFFICE','active','', '','MELUB1','HA','05','','','bunch','80'],
  ['IMP-MELU-HA-OLD1-0912-K', '2026-09-12','SPLT','MELU','OWNER-FIX','','OFFICE','active','IMP-MELU-HA-OLD1-0912', '','MELUSC1','HA','05','','','bunch','80'],
  ['IMP-MELU-HA-OLD2-0913', '2026-09-13','SPLT','MELU','IMPORT','','OFFICE','active','', '','MELUSC2','HA','04','','','bunch','60'],
  ['W-MELU-1', '2026-11-20','SPLT','MELU','STF-MELU-01','','P23','active','', 'c1','MELUSC3','HA','01','1-1','','bunch','45']]);
const empty = new Sheet([std.concat(['block','lot','bunches','cleared','tractor','loader','note','lorry','mill','ramp_cleared'])]);
const ctx = { SpreadsheetApp: { openById: () => ({ getSpreadsheetTimeZone: () => 'Etc/GMT', getSheetByName: n => ({ FH_WORK: work, FH_COLLECT: empty, FH_DISPATCH: empty })[n] || null }) },
  Utilities: { formatDate: (d, z, f) => { const y = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); const hm = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); return f === 'yyyy-MM-dd' ? y : f === 'HH:mm' ? hm : y + ' ' + hm; } },
  Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: {}, ContentService: {}, PropertiesService: {}, CacheService: {} };
vm.createContext(ctx); vm.runInContext(code, ctx);
check('a row keyed IMPORT is history', ctx.live_({ id: 'IMP-X', keyed_by: 'IMPORT' }) === false);
check('a correction of an old-data row (id IMP-…, keyed OWNER-FIX) is still history', ctx.live_({ id: 'IMP-MELU-HA-OLD1-0912-K', keyed_by: 'OWNER-FIX' }) === false);
check('a row keyed on a phone is live', ctx.live_({ id: 'W-MELU-1', keyed_by: 'STF-MELU-01' }) === true);
const r = ctx.backlog('MELU');
const tot = (r.field || []).reduce((a, x) => a + Number(x.bunches || 0), 0);
check('the field backlog counts only the live harvest (45), never the old days or their corrections', r.ok && tot === 45, JSON.stringify(r.field));
