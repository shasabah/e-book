// E-Book test (1.3). Office script, no server needed: who may write what, ramp by time,
// a harvester's line corrected after it went on a lorry, formula guard.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))),
  getDisplayValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1)).map(String)), setValues: v => { v.forEach((row, i) => { s.rows[r - 1 + i] = row; }); } }; };
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
const T = new Date(); const D = n => { const d = new Date(T); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); };
// Ali cut 120 in 3-30; all 120 went on DN 501; then his line was corrected to 118 (w1b replaces w1).
const work = new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
  ['w1', D(1),'SPLT','SSGT','T','','P07','active','', 'c','W1','HV01','03','3-30','','bunch','120'],
  ['w1b',D(1),'SPLT','SSGT','T','','P07','active','w1','c','W1','HV01','03','3-30','','bunch','118'],
  ['w2', D(1),'SPLT','SSGT','T','','P07','active','', 'c','W2','HV01','03','3-31','','bunch','100'],
  ['w2b',D(1),'SPLT','SSGT','T','','P07','active','w2','c','W2','HV01','03','3-31','','bunch','130']]);
const lot = new Sheet([std.concat(['trip','dn_no','block','lot','work_id','date_cut','worker_id','bunches']),
  ['l1', D(0),'SPLT','SSGT','S','','P07','active','','LR-1','501','03','3-30','w1',D(1),'W1','120'],
  ['l2', D(0),'SPLT','SSGT','S','','P07','active','','LR-1','501','03','3-31','w2',D(1),'W2','100']]);
const ppl = new Sheet([std.concat(['worker_id','name','job','gang','sex','mandor','active','received_at'])]);
const tk = new Sheet([std.concat(['ticket_no','trip']), ['t1', D(0),'SPLT','SSGT','C','','P01','active','','469600','LR-1']]);
const dis = new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver','received_at'])]);
const tabs = { FH_WORK: work, FH_DISPATCH_LOT: lot, LIST_PEOPLE: ppl, FH_TICKET: tk, FH_DISPATCH: dis };
const ctx = { SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null }) },
  Utilities: { formatDate: d => d.toISOString().slice(0, 10) }, Session: { getScriptTimeZone: () => 'Etc/GMT' },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) }, ContentService: {}, PropertiesService: {}, CacheService: {} };
vm.createContext(ctx); vm.runInContext(code, ctx);
const open = ctx.openHarvest('SSGT').lines.map(l => l.lot + '=' + l.bunches).join(',');
check('corrected after the lorry: 3-30 (120 sent, now 118) is not open again; 3-31 (100 sent, now 130) has 30 left', open === '3-31=30', open);
const row = { id: 'x1', estate: 'SSGT', status: 'active', date: D(0), keyed_at: D(0) + ' 07:00', worker_id: 'X', name: 'Fake' };
const w = ctx.saveBatch({ estates: ['SSGT'], role: 'Worker', user_code: 'T-WRK' }, [{ tab: 'LIST_PEOPLE', row: Object.assign({}, row) }]);
check('a Worker key cannot change the people list (sent in a batch)', w.results[0].error === 'not_allowed', JSON.stringify(w));
const s = ctx.saveBatch({ estates: ['SSGT'], role: 'Staff', user_code: 'T-STF' }, [{ tab: 'FH_TICKET', row: { id: 't1', estate: 'SSGT', status: 'active', date: D(0) } }]);
check('a Staff key cannot write a mill ticket', s.results[0].error === 'not_allowed', JSON.stringify(s));
const m = ctx.saveBatch({ estates: ['SSGT'], role: 'Mandor', user_code: 'T-MDR' }, [{ tab: 'FH_WORK', row: { id: 'm1', estate: 'SSGT', status: 'active', date: D(0) } }]);
check('a Mandor key cannot key field work for now', m.results[0].error === 'not_allowed', JSON.stringify(m));
check('formula guard: =, -cmd, tab, leading space before = kept as text; -5 stays a number', ["=1+1", "-cmd", "\tx", " =A1"].every(v => String(ctx.plain(v))[0] === "'") && ctx.plain('-5') === '-5');
const fix = ctx.saveBatch({ estates: ['SSGT'], role: 'Staff', user_code: 'T-STF' }, [{ tab: 'FH_DISPATCH', row: { id: 'd9', estate: 'SSGT', status: 'active', date: D(0), keyed_at: D(0) + ' 11:00', trip: 'LR-1', replaces: 'd1', bunches: '300', block: '03' } }]);
check('a delivery note cannot be changed once its lorry has a ticket', fix.results[0].error === 'ticketed', JSON.stringify(fix));
// Ramp: worked out by day and time
const src = code.slice(code.indexOf('// ===== calcBacklog'), code.indexOf('// ===== end calcBacklog'));
const calcBacklog = new Function(src + '; return calcBacklog;')();
const rampA = calcBacklog([], [{ date: '2026-10-18', keyed_at: '2026-10-18 09:00', lot: '1-1', block: '01', bunches: 100 }, { date: '2026-10-19', keyed_at: '2026-10-19 09:00', lot: '1-1', block: '01', bunches: 50 }],
  [{ date: '2026-10-18', keyed_at: '2026-10-18 11:00', block: '01', bunches: 60 }, { date: '2026-10-18', keyed_at: '2026-10-18 13:00', block: '01', bunches: 40, ramp_cleared: 'Y' }], '2026-10-19').ramp.bunches;
check('ramp: two lorries the same day, the second empties the ramp; next day 50 collected → ramp 50', rampA === 50, String(rampA));
const rampB = calcBacklog([], [{ date: '2026-10-18', keyed_at: '2026-10-18 07:00', lot: '1-1', block: '01', bunches: 100 }, { date: '2026-10-18', keyed_at: '2026-10-18 15:00', lot: '1-2', block: '01', bunches: 80 }],
  [{ date: '2026-10-18', keyed_at: '2026-10-18 08:00', block: '01', bunches: 100, ramp_cleared: 'Y' }], '2026-10-18').ramp.bunches;
check('ramp: morning lorry empties the ramp, 80 collected in the afternoon → ramp 80', rampB === 80, String(rampB));
