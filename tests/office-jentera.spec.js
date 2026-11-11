// E-Book test (1.55). Jentera on the morning chit — office side (server/core.gs machines_ and seedMachines).
// No server and no browser needed. Brief_Jentera.md §4: nothing new is keyed, so the card must come out of the
// records the chit already holds — ITF the farm tractor, ETF the lorry, the machine inside an operator or
// workshop job's lots. "Today" is fixed at Wednesday 11 Nov 2026, so the working-day counts can be hand-checked
// (8 Nov 2026 is a Sunday and must not be counted).
const ROOT = require('path').resolve(__dirname, '..');
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm');
const code = fs.readFileSync(require('path').resolve(ROOT, 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)), getDisplayValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc).map(String)), getDisplayValue: () => String(s.rows[r - 1][c - 1]), setValue: v => { s.rows[r - 1][c - 1] = v; }, setValues: vals => { vals.forEach((v, i) => { s.rows[r - 1 + i] = v.map(unq); }); }, createTextFinder: txt => ({ matchEntireCell: () => ({ findNext: () => { const i = s.rows.findIndex((x, k) => k >= r - 1 && String(x[c - 1]) === String(txt)); return i < 0 ? null : { getRow: () => i + 1 }; } }) }) }; };
const unq = v => typeof v === 'string' && v.charAt(0) === "'" ? v.slice(1) : v;
Sheet.prototype.appendRow = function (v) { this.rows.push(v.map(unq)); };
const std = ['id', 'date', 'company', 'estate', 'keyed_by', 'keyed_at', 'phone', 'status', 'replaces'];
const S = (cols, rows) => new Sheet([std.concat(cols, ['received_at'])].concat(rows || []));
const R = (id, date, by, vals, status) => [id, date, 'SPLT', 'SSGT', by, date + ' 06:10', 'P13', status || 'active', ''].concat(vals, ['']);
const MUSTER = ['chit', 'block', 'lots', 'mandor', 'worker_id', 'task_code', 'muster', 'confirmed_by', 'confirmed_at', 'note'];
const M = (id, date, worker, task, lots, by) => R(id, date, by || 'STF', ['CH-' + date, '', lots || '', '', worker, task, 'H', 'STF', '', '']);

const NOW = new Date('2026-11-11T02:00:00Z');          // Wednesday
const tabs = {
  LIST_MACHINES: S(['reg_no', 'kind', 'model', 'year', 'home_estate', 'owner_co', 'on_chit', 'note']),
  FH_MUSTER: S(MUSTER, [
    M('m1', '2026-11-11', 'W1', 'ITF'),                         // one of the two tractors has a driver
    M('m2', '2026-11-11', 'W2', 'LFF'),                         // his loader — must not look like a second tractor
    M('m3', '2026-11-11', 'W3', 'ETF'),                         // the lorry: Sugut owns none, it is Paitan's
    M('m4', '2026-11-11', 'W4', 'MH', 'EXCAVATOR'),             // workshop day: being worked on, not working
    M('m5', '2026-11-05', 'W5', 'OPR', '2-14 BACKHOE'),         // backhoe last had an operator on Thu 5 Nov
    M('m6', '2026-11-10', 'W6', 'OPR', 'BACKHOE', 'IMPORT')]),  // old imported data must not count
  FH_JOBDAY: S(['chit', 'task_code', 'block', 'lots', 'workers', 'qty', 'unit', 'bunches', 'plan_ha', 'job_status', 'reason', 'flags', 'confirmed_by', 'confirmed_at', 'progress', 'bags', 'target', 'dose']),
  FH_WORK: S(['chit', 'worker_id', 'task_code', 'block', 'lot', 'qty', 'unit', 'bunches', 'confirmed_by', 'confirmed_at', 'note']),
  FH_COLLECT: S(['block', 'lot', 'bunches', 'cleared', 'tractor', 'loader', 'note']),
  FH_DISPATCH: S(['bunches', 'lorry', 'mill', 'ramp_cleared', 'note', 'block', 'trip', 'dn_no', 'driver']),
  FH_DISPATCH_LOT: S(['trip', 'dn_no', 'block', 'lot', 'work_id', 'date_cut', 'worker_id', 'bunches']),
  FH_TICKET: S(['ticket_no', 'trip', 'mill', 'do_no', 'lorry', 'driver', 'time', 'first_kg', 'second_kg', 'deduct_kg', 'nett_kg', 'nett_mt', 'bunches', 'abw_kg', 'note', 'lorry_bunches', 'mill_bunches', 'rej_ur', 'rej_emp', 'rej_rott', 'rej_mt']),
  FH_GRADING: S(['ticket_no', 'ripe', 'under', 'over', 'empty', 'rotten', 'long_stalk', 'note']),
  LIST_BUDGET: S(['month', 'budget_mt', 'abw_kg', 'work_days', 'note']),
  USERS: new Sheet([['user_code', 'name', 'role', 'estates', 'key_hash', 'status', 'added_at', 'phones', 'position']])
};
const props = {};
const ctx = {
  SpreadsheetApp: { openById: () => ({ getSpreadsheetTimeZone: () => 'Etc/GMT', getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = new Sheet([[]])) }) },
  Utilities: { formatDate: (d, z, f) => f === 'yyyy' ? d.toISOString().slice(0, 4) : f.indexOf('HH') >= 0 ? d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16) : d.toISOString().slice(0, 10) },
  Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => {} }) }, ContentService: {},
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) }, Logger: { log: () => {} }, console: console
};
vm.createContext(ctx); vm.runInContext(code, ctx);
const fresh = () => { ctx.ROWS_MEMO_ = null; };

// ── the list is not loaded yet ───────────────────────────────────────────────────────────────────────────────────
check('no list loaded: no card at all, rather than a wrong one', ctx.machines_('SSGT', NOW) === null);

// ── loading the list ────────────────────────────────────────────────────────────────────────────────────────────
let n = ctx.seedMachines();
check('seedMachines: 44 units of the 28.05.2026 list', n === 44, String(n));
check('seedMachines again adds nothing', ctx.seedMachines() === 0);
fresh();
const all = ctx.readRows_('LIST_MACHINES', null).standing;
check('Sugut has 5 units, 4 of them on the chit (the Hilux is not)',
  all.filter(r => r.home_estate === 'SSGT').length === 5 && all.filter(r => r.home_estate === 'SSGT' && r.on_chit === 'Y').length === 4,
  JSON.stringify(all.filter(r => r.home_estate === 'SSGT').map(r => r.reg_no + ':' + r.on_chit)));
check('the TKRS tractor sits at TKRS, not under Paitan', all.filter(r => r.home_estate === 'TKRS').map(r => r.reg_no).join() === 'SAB946D');
check('owner company is kept beside the estate: Paitan\'s lorry is SPLT on a PJSB estate',
  (all.find(r => r.reg_no === 'SJQ6259') || {}).owner_co === 'SPLT');
check('Age is not a column: only the year is kept', Object.keys(all[0]).indexOf('age') < 0 && (all.find(r => r.reg_no === 'SAA9052R') || {}).year === '2003');
check('all 44 loaded, 34 of them on a chit', all.length === 44 && all.filter(r => r.on_chit === 'Y').length === 34,
  all.length + '/' + all.filter(r => r.on_chit === 'Y').length);

// ── the card ────────────────────────────────────────────────────────────────────────────────────────────────────
fresh();
let r = ctx.machines_('SSGT', NOW);
const line = id => r.lines.find(x => x.id === id) || {};
check('a card for Sugut with four kinds: tractor, backhoe, excavator and the lorry working here',
  r && r.lines.length === 4 && r.lines.map(x => x.id).sort().join() === 'BACKHOE,EXCAVATOR,FARMTRACTOR,LORRY',
  JSON.stringify((r || {}).lines));
check('no pickup on the chit: nobody musters a Hilux', !r.lines.some(x => x.id === 'PACUAN' || x.kind === 'pacuan'));

check('two tractors, one driver: SEBAHAGIAN, 1 of 2 — the loader (LFF) is not a second tractor',
  line('FARMTRACTOR').state === 'sebahagian' && line('FARMTRACTOR').units === 2 && line('FARMTRACTOR').onToday === 1,
  JSON.stringify(line('FARMTRACTOR')));
check('a kind with two units is not named by one reg no, it lists both',
  !line('FARMTRACTOR').reg && line('FARMTRACTOR').regs.sort().join() === 'SD4867U,SMQ6237', JSON.stringify(line('FARMTRACTOR').regs));

check('the backhoe has nobody on it: TIADA PEMANDU, named by its reg no',
  line('BACKHOE').state === 'tiada' && line('BACKHOE').units === 1 && line('BACKHOE').reg === 'SD3894R' && line('BACKHOE').model === 'JCB Backhoe 3DX',
  JSON.stringify(line('BACKHOE')));
check('5 working days since Thu 5 Nov, not 6: Sunday 8 Nov is not a gap',
  line('BACKHOE').days === 5 && line('BACKHOE').since === '2026-11-05', JSON.stringify(line('BACKHOE')));
check('imported old data never counts as a driver (it would have said 1 day)', line('BACKHOE').days === 5);

check('a workshop day shows BENGKEL: the machine is being worked on, not working',
  line('EXCAVATOR').state === 'bengkel' && line('EXCAVATOR').reg === 'SAA9052R', JSON.stringify(line('EXCAVATOR')));
check('a workshop day does not reset the standing clock', !line('EXCAVATOR').since, JSON.stringify(line('EXCAVATOR')));

check('the lorry works here but Sugut owns none: JALAN, from another estate',
  line('LORRY').state === 'jalan' && line('LORRY').units === 0 && line('LORRY').fromOther === true, JSON.stringify(line('LORRY')));
check('the FFB chain comes first on the card (tractor and lorry before backhoe and excavator)',
  r.lines[0].chain === true && r.lines[1].chain === true && !r.lines[2].chain && !r.lines[3].chain,
  r.lines.map(x => x.id).join());

// ── both tractors driven, and a machine nobody has ever been on ─────────────────────────────────────────────────
tabs.FH_MUSTER.rows.push(M('m7', '2026-11-11', 'W7', 'ITF'));
fresh();
r = ctx.machines_('SSGT', NOW);
check('both tractors with a driver: JALAN, and the day count is 0', line('FARMTRACTOR').state === 'jalan' && line('FARMTRACTOR').onToday === 2 && line('FARMTRACTOR').days === 0, JSON.stringify(line('FARMTRACTOR')));
tabs.FH_MUSTER.rows.push(M('m8', '2026-11-11', 'W8', 'ITF'));
fresh();
r = ctx.machines_('SSGT', NOW);
check('three ITF men on two tractors never reads as more units than we own', line('FARMTRACTOR').onToday === 2, JSON.stringify(line('FARMTRACTOR')));

tabs.FH_MUSTER.rows = tabs.FH_MUSTER.rows.filter(x => ['m5', 'm6'].indexOf(x[0]) < 0);
fresh();
r = ctx.machines_('SSGT', NOW);
check('a machine with no record at all: TIADA PEMANDU with no last day, so the card can say "never"',
  line('BACKHOE').state === 'tiada' && line('BACKHOE').since === '' && line('BACKHOE').days === 0, JSON.stringify(line('BACKHOE')));

// ── a unit sold or written off ──────────────────────────────────────────────────────────────────────────────────
const row = tabs.LIST_MACHINES.rows.find(x => x[9] === 'SD3894R');
row[7] = 'disposed';
fresh();
r = ctx.machines_('SSGT', NOW);
check('a disposed unit leaves the card but stays in the book', !r.lines.some(x => x.id === 'BACKHOE') && tabs.LIST_MACHINES.rows.some(x => x[9] === 'SD3894R'), r.lines.map(x => x.id).join());
row[7] = 'active';

// ── another estate ──────────────────────────────────────────────────────────────────────────────────────────────
fresh();
const k = ctx.machines_('KWNN', NOW);
check('Kawananan: 15 units on the chit over 4 kinds, none with a driver today',
  k && k.lines.length === 4 && k.lines.reduce((a, x) => a + x.units, 0) === 15 && k.lines.every(x => x.state === 'tiada'),
  JSON.stringify((k || {}).lines.map(x => x.id + ':' + x.units)));

// ── the chit's own office answer carries it ─────────────────────────────────────────────────────────────────────
fresh();
let b = null;
try { b = ctx.backlog('SSGT'); } catch (e) { b = { error: String(e && e.message) }; }
check('the chit\'s "backlog" answer carries the machines, so no new office action is needed',
  b && b.machines && b.machines.lines && b.machines.at === '2026-11-11', JSON.stringify(b && (b.machines || b.error)));
check('READS_ is unchanged: machines is not an action of its own', ctx.READS_.machines === undefined);
