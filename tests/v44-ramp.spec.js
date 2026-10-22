// E-Book test (1.33) Ramp & lorry: fruit should leave the ramp within 24 hours; a full Sugut lorry is 8 tonnes.
// The staff calls the lorry (full, or fruit from yesterday); under 8 tonnes the Pengurus decides; the clerk expects
// a ticket; the Owner sees fruit 2 days old; bunches cut but not carried to the ramp are asked for.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm'); const crypto = require('crypto');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');

const unq = v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : v;
function Sheet(name, rows) { this.name = name; this.rows = rows; }
Sheet.prototype.getName = function () { return this.name; };
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows.length ? this.rows[0].length : 0; };
Sheet.prototype.appendRow = function (r) { this.rows.push(r.map(unq)); };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; const get = () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => { const y = x.slice(c - 1, c - 1 + (nc || 1)); while (y.length < (nc || 1)) y.push(''); return y; });
  return { getValues: get, getDisplayValues: () => get().map(x => x.map(v => v === '' || v == null ? '' : String(v))), getDisplayValue: () => String(get()[0][0]),
    setValue: v => { while (s.rows.length < r) s.rows.push([]); s.rows[r - 1][c - 1] = unq(v); },
    setValues: v => { v.forEach((row, i) => row.forEach((x, j) => { while (s.rows.length < r + i) s.rows.push([]); s.rows[r - 1 + i][c - 1 + j] = unq(x); })); },
    setNumberFormat: () => {} }; };
function Book(id, name) { this.id = id; this.name = name; this.tabs = []; }
Book.prototype.getSheetByName = function (n) { return this.tabs.find(t => t.name === n) || null; };
Book.prototype.insertSheet = function (n) { const t = new Sheet(n, []); this.tabs.push(t); return t; };
Book.prototype.getSheets = function () { return this.tabs.slice(); };
Book.prototype.deleteSheet = function (t) { this.tabs = this.tabs.filter(x => x !== t); };
Book.prototype.getId = function () { return this.id; };
Book.prototype.getUrl = function () { return 'https://docs.google.com/spreadsheets/d/' + this.id; };
const KL = d => new Date(d.getTime() + 8 * 3600e3).toISOString();
const fmt = (d, tz, f) => { const s = KL(d); return f.replace('yyyy', s.slice(0, 4)).replace('MM', s.slice(5, 7)).replace('dd', s.slice(8, 10)).replace('HH', s.slice(11, 13)).replace('mm', s.slice(14, 16)); };
const books = {}, props = {}, cache = {};
const TEST_ID = '1N79YKsFE3CLvR6Z_lcy7clagEydOXhKKeTHI4sA3VWs';
books[TEST_ID] = new Book(TEST_ID, 'E-Book TEST sheet');
books[TEST_ID].insertSheet('Sheet1');
const ctx = {
  SpreadsheetApp: { openById: id => books[id], create: n => (books['LIVE1'] = (() => { const b = new Book('LIVE1', n); b.insertSheet('Sheet1'); return b; })()) },
  Utilities: { formatDate: fmt, getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 's' },
    computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(x => x > 127 ? x - 256 : x) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, getProperties: () => Object.assign({}, props) }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
  ContentService: { createTextOutput: s => ({ setMimeType: () => s }), MimeType: { JSON: 'json' } },
  Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  Logger: { log: () => {} }
};
vm.createContext(ctx); vm.runInContext(code, ctx);
ctx.setupTestCopy();
ctx.addUser('OWN-ALL-01', 'Pemilik Contoh', 'Owner', 'SDK,MELU,SSGT,PTAN,TKRS,KWNN', '583920');
const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 41 }, body)) } }));
const OWN = '583920';
post({ key: OWN, action: 'login', phone: 'P01' });
const f = post({ key: OWN, action: 'userAdd', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] });
const T = books[TEST_ID];
ctx.setupLiveSheet();
const L = books['LIVE1'];
Object.keys(cache).forEach(k => delete cache[k]);
const clear = () => Object.keys(cache).filter(k => /^rd\||^gen/.test(k)).forEach(k => delete cache[k]);
const today = fmt(new Date(), '', 'yyyy-MM-dd');
const ago = n => fmt(new Date(Date.now() - n * 864e5), '', 'yyyy-MM-dd');
const ck = post({ key: OWN, action: 'userAdd', name: 'Kerani Contoh', role: 'Clerk', estates: ['SSGT'], phone: 'P01' });
const mg = post({ key: OWN, action: 'userAdd', name: 'Pengurus Contoh', role: 'Manager', estates: ['SSGT'], phone: 'P01' });
const hq = post({ key: OWN, action: 'userAdd', name: 'HQ Contoh', role: 'HQ', estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'], phone: 'P01' });
[f, ck, mg, hq].forEach(u => post({ key: u.pin, action: 'login', phone: u.phone }));
const as = (u, action, extra) => { clear(); return post(Object.assign({ key: u.pin, action, phone: u.phone, estate: 'SSGT' }, extra || {})); };
const own = { pin: OWN, phone: 'P01' };
let n = 0;
const addRow = (tab, o) => { const sh = ctx.roomTab_(L, tab); const head = sh.rows[0]; const at = (o.date || today) + ' 15:00';
  const row = Object.assign({ id: 'T-' + tab + '-' + (++n), date: today, company: 'SPLT', estate: 'SSGT', keyed_by: 'STF', keyed_at: at, phone: 'P01', status: 'active', replaces: '', received_at: at }, o);
  sh.rows.push(head.map(c => row[c] === undefined ? '' : row[c])); return row; };
const line = (u, k) => as(u, 'todo').items.find(x => x.id.startsWith(k + ':'));
// yesterday's small load on the ramp (100 bunches), no ticket yet → no ABW
addRow('FH_WORK', { date: ago(1), task_code: 'HA', block: '03', lot: '3-1', worker_id: 'W3', bunches: 100 });
addRow('FH_COLLECT', { date: ago(1), block: '03', lot: '3-1', bunches: 100, cleared: 'Y' });
const s0 = line(f, 'RP');
check('no ABW yet: the line shows bunches only (no tonnes made up)', s0 && !/~/.test(s0.bm + s0.sub) && /100 tandan/.test(s0.sub), JSON.stringify(s0));
addRow('FH_TICKET', { date: ago(5), ticket_no: 'T1', abw_kg: 18, nett_mt: 9 });
const s2 = line(f, 'RP'), m2 = line(mg, 'RP');
check('fruit from yesterday (1.8 t): the staff is told to call the lorry now, under 8 t ask the Pengurus', s2 && s2.p === 1 && /panggil lori sekarang/.test(s2.bm) && /1\.8 tan/.test(s2.sub) && /tanya Encik Samsir/.test(s2.sub), JSON.stringify(s2));
check('under 8 t and over 24 hours: the Pengurus decides (red)', m2 && m2.p === 1 && /separuh penuh/.test(m2.bm), JSON.stringify(m2));
check('the clerk expects a ticket', (x => x && x.p === 4 && /Lori dijangka/.test(x.bm))(line(ck, 'RP')));
check('1 day: not yet stuck for the Owner', !line(own, 'RO'));
// cut 2 days ago, not carried to the ramp
addRow('FH_WORK', { date: ago(2), task_code: 'HA', block: '04', lot: '4-2', worker_id: 'W4', bunches: 80 });
check('cut but not carried to the ramp: the staff is asked to key "Kutip ke ramp"', (x => x && /belum dikutip ke ramp/.test(x.bm) && /80/.test(x.bm))(line(f, 'FC')));
addRow('FH_COLLECT', { date: ago(2), block: '04', lot: '4-2', bunches: 80, cleared: 'Y' });
check('carried: the "kutip" line goes', !line(f, 'FC'));
check('fruit 2 days on the ramp: the Owner sees it stuck', (x => x && x.p === 1 && /2 hari di ramp/.test(x.bm))(line(own, 'RO')));
// today: 500 more → (100 + 80 + 500) × 18 kg = 12.2 t → full
addRow('FH_WORK', { date: today, task_code: 'HA', block: '01', lot: '1-1', worker_id: 'W1', bunches: 500 });
addRow('FH_COLLECT', { date: today, block: '01', lot: '1-1', bunches: 500, cleared: 'Y' });
const sf = line(f, 'RP');
check('ramp full (12.2 t ≥ 8 t): the staff is told to call the lorry', sf && sf.p === 1 && /Ramp penuh/.test(sf.bm) && /12\.2 tan/.test(sf.bm), sf && sf.bm);
check('ramp full: the Pengurus is told (no decision needed)', (x => x && x.p === 2 && /Staf panggil lori/.test(x.bm))(line(mg, 'RP')));
// the lorry leaves with "ramp empty": the lines go
addRow('FH_DISPATCH', { date: today, trip: 'TR1', block: '01', bunches: 680, ramp_cleared: 'Y', dn_no: '9001', mill: 'SKPOM' });
const D = L.getSheetByName('FH_DISPATCH'); D.rows[D.rows.length - 1][D.rows[0].indexOf('keyed_at')] = today + ' 16:00';
check('lorry keyed with "ramp empty": all ramp lines go by themselves', !line(f, 'RP') && !line(mg, 'RP') && !line(ck, 'RP') && !line(own, 'RO'));
