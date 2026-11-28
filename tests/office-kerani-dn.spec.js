// E-Book test (1.112) Brief_Kerani_DN_Meliau, signed by Yu Chen 28 Nov 2026. At an estate with "Kerani isi DN" on, the
// Kerani may write the ramp and DN tabs (FH_COLLECT, FH_DISPATCH, FH_DISPATCH_LOT); elsewhere she still may not. The
// switch is the Owner's (Suis). She gets the staff's ramp line; the phone gets the estate's own lorries to pick from.
// Office script, made-up data (Rule 8).
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


ctx.getJson_ = (k, d) => (props[k] ? JSON.parse(props[k]) : d);
const clerk = est => ({ user_code: 'CLK-1', role: 'Clerk', estates: [est] });
const staff = { user_code: 'STF-1', role: 'Staff', estates: ['MELU'] };
const row = est => ({ id: 'x', estate: est });

props.SWITCHES = JSON.stringify({});
check('switch off: the Kerani may not write a DN (FH_DISPATCH) at Meliau', ctx.canWrite_(clerk('MELU'), 'FH_DISPATCH', row('MELU')) === false);
check('… nor ramp lines (FH_COLLECT)', ctx.canWrite_(clerk('MELU'), 'FH_COLLECT', row('MELU')) === false);
check('… she still writes the mill ticket', ctx.canWrite_(clerk('MELU'), 'FH_TICKET', row('MELU')) === true);

props.SWITCHES = JSON.stringify({ keraniDn: ['MELU'] });
check('the switches carry keraniDn for the phones', JSON.stringify(ctx.switches_().keraniDn) === '["MELU"]');
['FH_COLLECT', 'FH_DISPATCH', 'FH_DISPATCH_LOT'].forEach(t => check('switch on at MELU: the Kerani may write ' + t, ctx.canWrite_(clerk('MELU'), t, row('MELU')) === true));
check('… but not the chit or the day\'s work (FH_MUSTER, FH_WORK)', ctx.canWrite_(clerk('MELU'), 'FH_MUSTER', row('MELU')) === false && ctx.canWrite_(clerk('MELU'), 'FH_WORK', row('MELU')) === false);
check('… nor close the day (FH_DAYCLOSE)', ctx.canWrite_(clerk('MELU'), 'FH_DAYCLOSE', row('MELU')) === false);
check('a Kerani at Sugut (not switched) still may not write a DN', ctx.canWrite_(clerk('SSGT'), 'FH_DISPATCH', row('SSGT')) === false);
check('the staff at Meliau still may (backup)', ctx.canWrite_(staff, 'FH_DISPATCH', row('MELU')) === true);
check('a Manager may not, switch or not', ctx.canWrite_({ user_code: 'M', role: 'Manager', estates: ['MELU'] }, 'FH_DISPATCH', row('MELU')) === false);

// the Owner's switch itself
props.SWITCHES = JSON.stringify({});
ctx.readUsers_ = () => ({ list: [] }); ctx.logUser_ = () => {};
ctx.LockService = { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) };
let sw = null;
try { sw = ctx.adminSwitch_({ user_code: 'OWN-ALL-01', role: 'Owner', estates: ['MELU', 'SSGT'] }, { which: 'keraniDn', on: true, estate: 'MELU' }); } catch (e) { sw = { err: String(e) }; }
check('Owner turns "Kerani isi DN" on for MELU in Suis', sw && JSON.stringify(sw.keraniDn) === '["MELU"]', JSON.stringify(sw).slice(0, 200));
try { sw = ctx.adminSwitch_({ user_code: 'OWN-ALL-01', role: 'Owner', estates: ['MELU', 'SSGT'] }, { which: 'keraniDn', on: false, estate: 'MELU' }); } catch (e) { sw = { err: String(e) }; }
check('… and off again', sw && JSON.stringify(sw.keraniDn) === '[]', JSON.stringify(sw).slice(0, 200));

// the ramp line on Hari ini
seed('MELU');
props.SWITCHES = JSON.stringify({});
let c = (todo('Clerk', 'MELU').items || []).filter(i => /RP:/.test(i.id));
check('switch off: the Kerani\'s ramp line is only "Lori dijangka keluar", not for her to act', c.length === 1 && /Lori dijangka keluar/.test(c[0].bm) && !c[0].go, JSON.stringify(c));
props.SWITCHES = JSON.stringify({ keraniDn: ['MELU'] });
c = (todo('Clerk', 'MELU').items || []).filter(i => /RP:/.test(i.id));
check('switch on: the Kerani gets the staff\'s line and it opens Ramp & lorry', c.length === 1 && /Buah masih di ramp sejak/.test(c[0].bm) && c[0].go === '#field-harvest/collect', JSON.stringify(c));
const st = (todo('Staff', 'MELU').items || []).filter(i => /RP:/.test(i.id));
check('the staff still has his line too', st.length === 1 && /Buah masih di ramp/.test(st[0].bm));

// the phone's pick list
tabs.FH_DISPATCH_LOT = new Sheet([std.concat(['trip','dn_no','block','lot','date_cut','worker_id','bunches'])]);
tabs.FH_ALERT = tabs.FH_ALERT;
ctx.dmsRain_ = () => null; ctx.gradingAlerts_ = () => []; ctx.tonnageMtd_ = () => null; ctx.machines_ = () => null;
ctx.ROWS_MEMO_ = {}; let bl; try { bl = ctx.backlog('MELU'); } finally { ctx.ROWS_MEMO_ = null; }
check('the ramp check carries Meliau\'s own lorries for the pick list', bl && (bl.ownLorries || []).map(x => x.reg).sort().join(',') === 'SS2797L,SS6586X', JSON.stringify(bl && bl.ownLorries));
seed('SSGT'); ctx.ROWS_MEMO_ = {}; try { bl = ctx.backlog('SSGT'); } finally { ctx.ROWS_MEMO_ = null; }
check('Sugut: no own lorry, so the phone keeps the typed box', bl && (bl.ownLorries || []).length === 0, JSON.stringify(bl && bl.ownLorries));
