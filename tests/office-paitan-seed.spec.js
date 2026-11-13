// E-Book test (1.58) Paitan's 2026 plan loaded from the budget (Yu Chen, 13 Nov 2026: "load it").
// Values only, from "SPLT.PTAN BUDGET COSTING 2026": the maintenance round plan per block and month, and the
// Target 1 crop budget per month. Running it twice adds nothing new, and Sugut's own plan is never touched.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const pad = n => String(n).padStart(2, '0');
function fmt(d, z, f) { const t = new Date(d.getTime() + 8 * 3600e3); return f.replace(/yyyy|MM|dd|HH|mm|ss/g, k => ({ yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()) })[k]); }
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces','received_at'];
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.appendRow = function (r) { this.rows.push(r.map(v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : v)); };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => { const y = x.slice(c - 1, c - 1 + (nc || 1)); while (y.length < (nc || 1)) y.push(''); return y; }) }; };
function build() {
  const tabs = {
    LIST_PROGRAMME: new Sheet([std.concat(['year','task_code','block','month','round','ha','dose','note'])]),
    LIST_BUDGET: new Sheet([std.concat(['month','budget_mt','abw_kg','work_days','note'])])
  };
  // one Sugut line already there, to prove it is never touched
  tabs.LIST_PROGRAMME.rows.push(['PG-SSGT-2026-1','2026-01-01','SPLT','SSGT','SEED','2026-01-01 08:00','','active','','2026-01-01 08:00','2026','CPS','01','2026-02','R1',33.2,'','SSGT']);
  tabs.LIST_BUDGET.rows.push(['BG-SSGT-2026-11','2026-11-01','SPLT','SSGT','OWNER-FIX','2026-11-01 08:00','','active','','2026-11-01 08:00','2026-11',230,'',26,'SSGT']);
  const book = { getSheetByName: n => tabs[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur' };
  const mem = {}, props = {};
  const ctx = { console, Date, Utilities: { formatDate: fmt }, SpreadsheetApp: { openById: () => book }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
    CacheService: { getScriptCache: () => ({ get: k => mem[k] || null, put: (k, v) => { mem[k] = v; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, getProperties: () => props }) },
    LockService: {}, ContentService: {}, Logger: { log() {} } };
  vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
  return { ctx, tabs };
}
const env = build(), H = env.tabs.LIST_PROGRAMME.rows[0], col = (r, k) => r[H.indexOf(k)];
const out = env.ctx.seedPaitan2026();
const pg = env.tabs.LIST_PROGRAMME.rows.slice(1).filter(r => col(r, 'estate') === 'PTAN');
const by = (t, b) => pg.filter(r => col(r, 'task_code') === t && col(r, 'block') === b).map(r => String(col(r, 'month')).slice(5) + ':' + col(r, 'round')).join(' ');
// 85 lines: CPS 20, slashing 10, pruning 20, lallang 5, selective spray 5, manuring 25. In the real office the
// live and practice sheets are two books, so the run writes them twice; this test gives both passes one book, and
// the second pass must then add nothing.
check('the whole round plan is loaded: 85 lines', out.programme === 85 && pg.length === 85, JSON.stringify(out) + ' rows ' + pg.length);
check('CPS: blocks 01 and 02 Feb, May, Aug, Nov', by('CPS', '01') === '02:R1 05:R2 08:R3 11:R4' && by('CPS', '02') === by('CPS', '01'), by('CPS', '01'));
check('CPS: blocks 03, 04 and 9Ac Mar, Jun, Sep, Nov', by('CPS', '03') === '03:R1 06:R2 09:R3 11:R4' && by('CPS', '9A') === by('CPS', '03'), by('CPS', '9A'));
check('Slashing: 01 and 02 Jan and Dec; 03, 04 and 9Ac Feb and Dec', by('SL', '01') === '01:R1 12:R2' && by('SL', '04') === '02:R1 12:R2', by('SL', '01') + ' / ' + by('SL', '04'));
check('Pruning: every block Jan, Apr, Jul, Nov', by('RP', '01') === '01:R1 04:R2 07:R3 11:R4' && by('RP', '9A') === by('RP', '01'));
check('Lallang spraying Mar and selective spraying Apr, every block', by('LS', '02') === '03:R1' && by('VOPS', '02') === '04:R1');
const man1 = pg.filter(r => col(r, 'task_code') === 'MAN' && col(r, 'block') === '01').map(r => String(col(r, 'month')).slice(5) + ':' + col(r, 'round') + '/' + col(r, 'dose')).join(' ');
const man3 = pg.filter(r => col(r, 'task_code') === 'MAN' && col(r, 'block') === '03').map(r => String(col(r, 'month')).slice(5) + ':' + col(r, 'round')).join(' ');
check('Manuring 01 and 02: Bio-Organic Mar at 5 kg, then FMP, NKB, NKB, NK at 2.5', man1 === '03:Bio-Organic/5 04:FMP/2.5 06:NKB/2.5 08:NKB/2.5 10:NK/2.5', man1);
check('Manuring 03, 04 and 9Ac: Mar, May, Jul, Sep, Oct', man3 === '03:Bio-Organic 05:FMP 07:NKB 09:NKB 10:NK', man3);
check('each line carries its block Ha and names the budget it came from', pg.every(r => Number(col(r, 'ha')) > 0 && /SPLT.PTAN BUDGET COSTING 2026/.test(col(r, 'note'))) && pg.filter(r => col(r, 'block') === '04')[0] && Number(col(pg.filter(r => col(r, 'block') === '04')[0], 'ha')) === 56.64);
check('every line is Paitan, company SPLT, keyed by SEED', pg.every(r => col(r, 'company') === 'SPLT' && col(r, 'keyed_by') === 'SEED'));
const B = env.tabs.LIST_BUDGET.rows[0], bc = (r, k) => r[B.indexOf(k)];
const bg = env.tabs.LIST_BUDGET.rows.slice(1).filter(r => bc(r, 'estate') === 'PTAN');
check('the crop budget: 12 months, 2,831 MT for the year (Target 1)', out.budget === 12 && bg.length === 12 && bg.reduce((a, r) => a + Number(bc(r, 'budget_mt')), 0) === 2831, bg.length + ' ' + bg.reduce((a, r) => a + Number(bc(r, 'budget_mt')), 0));
check('November 297 MT and December 275 MT, 19 harvest days', bg.filter(r => bc(r, 'month') === '2026-11')[0] && Number(bc(bg.filter(r => bc(r, 'month') === '2026-11')[0], 'budget_mt')) === 297 && Number(bc(bg.filter(r => bc(r, 'month') === '2026-12')[0], 'budget_mt')) === 275 && Number(bc(bg[0], 'work_days')) === 19);
check('no ABW target is made up (the budget has none)', bg.every(r => String(bc(r, 'abw_kg')) === ''));
const n2 = env.ctx.seedPaitan2026();
check('running it a second time adds nothing', n2.programme === 0 && n2.budget === 0 && env.tabs.LIST_PROGRAMME.rows.slice(1).filter(r => col(r, 'estate') === 'PTAN').length === 85, JSON.stringify(n2));
check('Sugut\'s own plan and budget are untouched', env.tabs.LIST_PROGRAMME.rows.filter(r => col(r, 'estate') === 'SSGT').length === 1 && env.tabs.LIST_BUDGET.rows.filter(r => bc(r, 'estate') === 'SSGT').length === 1);
