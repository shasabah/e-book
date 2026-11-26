// E-Book test (1.111) Brief_Lori_Meliau, Yu Chen 27 Nov 2026 ("sign 1 and lorry"). An estate with its own lorry
// (LIST_MACHINES serves = the estate) has no "panggil lori" and its full load is its own lorry's; Sugut (no lorry serving
// it) is unchanged. Also the Owner's switch "Rupa Baru untuk semua" (rupaEstates). Office script, made-up workers (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const pad = n => String(n).padStart(2, '0');
function fmt(d, z, f) { const t = new Date(d.getTime() + 8 * 3600e3); return f.replace(/yyyy|MM|dd|HH|mm|ss/g, k => ({ yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()) })[k]); }
const ago = n => fmt(new Date(Date.now() - n * 864e5), '', 'yyyy-MM-dd');
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => { const y = x.slice(c - 1, c - 1 + nc); while (y.length < nc) y.push(''); return y; }) }; };
const R = (id, est, d, extra) => [id, d, 'SPLT', est, 'STF-1', d + ' 07:00', 'P13', 'active', ''].concat(extra);
const tabs = {};
function seed(est) {
  // 300 bunches collected to the ramp two days ago, no lorry since (ABW 20 kg → 6 t)
  tabs.FH_WORK = new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']), R('w1', est, ago(2), ['c', 'H1', 'HA', '01', '1-1', '', 'bunch', '300'])]);
  tabs.FH_COLLECT = new Sheet([std.concat(['block','lot','bunches','cleared','tractor','loader','note']), R('c1', est, ago(2), ['01', '1-1', '300', 'Y', '', '', ''])]);
  tabs.FH_DISPATCH = new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver'])]);
  tabs.FH_TICKET = new Sheet([std.concat(['abw_kg']), R('t1', est, ago(5), ['20'])]);
  tabs.FH_ALERT = new Sheet([std.concat(['chit','kind','block','lot','detail','staff_note','direction','direction_by','received_at','ref'])]);
  tabs.LIST_MACHINES = new Sheet([std.concat(['reg_no','kind','model','year','home_estate','owner_co','on_chit','note','serves']),
    R('FLT-MELU-SS6586X', 'MELU', '2026-05-28', ['SS6586X', 'lori', 'Hino 500 GH1JMPA 8 TON', '', 'MELU', 'SPLT', 'Y', '', '']),
    R('FLT-MELU-SS6586X-S1', 'MELU', '2026-05-28', ['SS6586X', 'lori', 'Hino 500 GH1JMPA 8 TON', '', 'MELU', 'SPLT', 'Y', '', 'MELU']),
    R('FLT-MELU-SS2797L-S1', 'MELU', '2026-05-28', ['SS2797L', 'lori', 'Nissan MK210 6 TON', '', 'MELU', 'SPLT', 'Y', '', 'MELU']),
    R('FLT-PTAN-SJQ6259', 'PTAN', '2026-05-28', ['SJQ6259', 'lori', 'Howo Sinotruck TX371', '', 'PTAN', 'SPLT', 'Y', '', ''])]);
  tabs.LIST_MACHINES.rows[2][8] = 'FLT-MELU-SS6586X';   // the -S1 row replaces the old one (Rule 4)
}
const book = { getSheetByName: n => tabs[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur' };
const mem = {}, props = {};
const ctx = { console, Utilities: { formatDate: fmt }, SpreadsheetApp: { openById: () => book }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: k => mem[k] || null, put: (k, v) => { mem[k] = v; } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, getProperties: () => props }) },
  LockService: {}, ContentService: {}, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
function todo(role, est) { ctx.ROWS_MEMO_ = {}; try { return ctx.todo_({ user_code: role === 'Owner' ? 'OWN-ALL-01' : 'X-1', role, estates: [est] }, { estate: est }); } finally { ctx.ROWS_MEMO_ = null; } }
const txt = j => (j.items || []).filter(i => /RP:/.test(i.id)).map(i => i.bm + ' | ' + i.sub).join(' || ');

seed('MELU');
const own = ctx.ownLorries_('MELU');
check('Meliau\'s own lorries: SS6586X 8 t and SS2797L 6 t (the replaced row counts once)', own.length === 2 && own.some(x => x.reg === 'SS6586X' && x.mt === 8) && own.some(x => x.reg === 'SS2797L' && x.mt === 6), JSON.stringify(own));
check('Paitan\'s lorry with serves empty is nobody\'s own lorry yet', ctx.ownLorries_('PTAN').length === 0);
let s = txt(todo('Staff', 'MELU'));
check('Meliau staff: "Buah masih di ramp sejak …", no "panggil lori", names its own lorries', /Buah masih di ramp sejak/.test(s) && !/panggil lori/i.test(s) && /SS6586X 8 t/.test(s), s);
let m = txt(todo('Manager', 'MELU'));
check('6 t on the ramp = a full load for the 6 t lorry: no half-load question at Meliau', !/separuh/.test(m), m);

seed('SSGT');
s = txt(todo('Staff', 'SSGT'));
check('Sugut staff unchanged: "Buah di ramp sejak … · panggil lori sekarang", under 8 t asks the Pengurus', /panggil lori sekarang/.test(s) && /kurang 8 tan/.test(s), s);
m = txt(todo('Manager', 'SSGT'));
check('Sugut Pengurus unchanged: his ramp line is there (folded to "Kini tanggungjawab anda" after 5 pm, as before)', /Buah di ramp sejak/.test(m), m);

// the Owner's switch: the new look for every one at an estate
props.SWITCHES = JSON.stringify({ rupaBaru: ['STF-SSGT-01'], rupaEstates: ['MELU'] });
ctx.getJson_ = (k, d) => (props[k] ? JSON.parse(props[k]) : d);
const sw = ctx.switches_();
check('the switches carry rupaEstates for the phones', JSON.stringify(sw.rupaEstates) === '["MELU"]' && JSON.stringify(sw.rupaBaru) === '["STF-SSGT-01"]', JSON.stringify(sw));
