// E-Book test (1.56.2) Paitan starts (Yu Chen, 13 Nov 2026: "I only add Paitan, it will not affect Sugut").
// The office answers every read for PTAN, a Paitan record stays Paitan's, and Sugut's answers do not change.
// HQ's follow-up list covers both estates once the switch is open. Made-up names only.
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

const mk = (name, role, estates) => { const u = post({ key: OWN, action: 'userAdd', name, role, estates, phone: 'P01' }); post({ key: u.pin, action: 'login', phone: u.phone }); return u; };
const yas = mk('Staf Paitan Contoh', 'Staff', ['PTAN']), ria = mk('Kerani Contoh', 'Clerk', ['SSGT', 'PTAN']), sam = mk('Pengurus Contoh', 'Manager', ['SSGT', 'PTAN']), waw = mk('HQ Contoh', 'HQ', ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN']);
post({ key: f.pin, action: 'login', phone: f.phone });
const as = (u, action, est, extra) => { clear(); return post(Object.assign({ key: u.pin, action, phone: u.phone, estate: est, month: today.slice(0, 7) }, extra || {})); };
props.SWITCHES = JSON.stringify({ testModeOff: true, live: { 'field-harvest': ['SSGT', 'PTAN'] } });
let n = 0;
const addRow = (tab, est, o) => { const sh = ctx.roomTab_(L, tab); const head = sh.rows[0]; const at = (o.date || today) + ' 07:00';
  const row = Object.assign({ id: 'T-' + est + '-' + tab + '-' + (++n), date: today, company: 'SPLT', estate: est, keyed_by: 'STF', keyed_at: at, phone: 'P01', status: 'active', replaces: '', received_at: at }, o);
  sh.rows.push(head.map(c => row[c] === undefined ? '' : row[c])); return row; };
const READS = ['crop', 'dayclose', 'mills',   // 'workers' is the clerk's read
  'todo', 'ungraded', 'harvest', 'trips', 'people', 'history', 'backlog', 'rounds', 'program'];

// ---------- before any Paitan record: every read answers ----------
let bad = READS.filter(a => { const j = as(yas, a, 'PTAN'); return !j || j.ok !== true; });
check('an empty Paitan: the office answers every read for the Paitan staff', bad.length === 0, bad.map(a => a + '=' + JSON.stringify(as(yas, a, 'PTAN')).slice(0, 80)).join(' | '));
bad = READS.filter(a => { const j = as(ria, a, 'PTAN'); return !j || (j.ok !== true && j.error !== 'not_allowed'); });
check('and for the clerk (a read she may not make is refused plainly, never broken)', bad.length === 0, bad.join(' '));
const sBefore = JSON.stringify(READS.map(a => { const j = as(f, a, 'SSGT'); delete j.at; return j; }));
check('the Sugut staff cannot read Paitan, nor the Paitan staff Sugut', as(f, 'todo', 'PTAN').ok !== true && as(yas, 'todo', 'SSGT').ok !== true);

// ---------- Paitan records: lot 1-13 of Paitan's own Block 01, and the 9Ac block ----------
addRow('FH_CHIT', 'PTAN', { date: ago(1), chit: 'MC-P1', rev: 1, confirmed_at: '06:10' });
addRow('FH_WORK', 'PTAN', { date: ago(3), chit: 'MC-P0', worker_id: 'PW1', task_code: 'HA', block: '01', lot: '1-13', unit: 'bunch', bunches: 90 });
addRow('FH_WORK', 'PTAN', { date: ago(3), chit: 'MC-P0', worker_id: 'PW2', task_code: 'HA', block: '9A', lot: '9A-1', unit: 'bunch', bunches: 30 });
const pt = as(yas, 'todo', 'PTAN');
check('Paitan staff: fruit harvested 3 days ago is OVERDUE on his own list, both blocks', pt.ok && pt.items.some(i => /^FO:/.test(i.id) && /LEBIH TEMPOH: 120 tandan/.test(i.bm) && /Blk 01 90/.test(i.sub) && /Blk 9A 30/.test(i.sub)), JSON.stringify(pt.items.map(i => i.id + ' ' + i.bm + ' ' + i.sub)).slice(0, 400));
check('Paitan staff: yesterday not closed is on his list', pt.items.some(i => i.id === 'TH:' + ago(1)));
const bl = as(yas, 'backlog', 'PTAN');
check('Paitan backlog reads its own lots', bl.ok && JSON.stringify(bl).indexOf('1-13') > 0 && JSON.stringify(bl).indexOf('9A-1') > 0, JSON.stringify(bl).slice(0, 200));
bad = READS.filter(a => { const j = as(yas, a, 'PTAN'); return !j || j.ok !== true; });
check('with records in: every read still answers for Paitan', bad.length === 0, bad.join(' '));
check('the Pengurus over both estates gets Paitan\'s lines on Paitan and none of them on Sugut', as(sam, 'todo', 'PTAN').ok && !JSON.stringify(as(sam, 'todo', 'SSGT').items).match(/120 tandan|MC-P/));

// ---------- Sugut is untouched ----------
const sAfter = JSON.stringify(READS.map(a => { const j = as(f, a, 'SSGT'); delete j.at; return j; }));
check('Sugut\'s answers are the same, byte for byte, before and after Paitan\'s records', sBefore === sAfter, 'len ' + sBefore.length + ' / ' + sAfter.length);
addRow('FH_WORK', 'SSGT', { date: ago(3), chit: 'MC-S0', worker_id: 'SW1', task_code: 'HA', block: '01', lot: '1-13', unit: 'bunch', bunches: 55 });
const st = as(f, 'todo', 'SSGT'), pt2 = as(yas, 'todo', 'PTAN');
check('the same lot number in both estates never mixes: Sugut 1-13 has 55, Paitan still 120', st.items.some(i => /^FO:/.test(i.id) && /LEBIH TEMPOH: 55 tandan/.test(i.bm)) && pt2.items.some(i => /^FO:/.test(i.id) && /LEBIH TEMPOH: 120 tandan/.test(i.bm)));

// ---------- a save from the Paitan staff lands as Paitan ----------
const sv = post({ key: yas.pin, action: 'save', phone: yas.phone, tab: 'FH_COLLECT', row: { id: 'PH-1', date: today, company: 'SPLT', estate: 'PTAN', keyed_by: yas.code, keyed_at: today + ' 15:00', phone: yas.phone, status: 'active', replaces: '', block: '01', lot: '1-13', bunches: 90, cleared: 'Y' } });
const cr = ctx.roomTab_(L, 'FH_COLLECT').rows, ch = cr[0], last = cr[cr.length - 1];
check('the Paitan staff\'s save is accepted and written with estate PTAN, company SPLT', sv.ok && last[ch.indexOf('estate')] === 'PTAN' && last[ch.indexOf('company')] === 'SPLT' && last[ch.indexOf('lot')] === '1-13', JSON.stringify(sv).slice(0, 160));
const sx = post({ key: yas.pin, action: 'save', phone: yas.phone, tab: 'FH_COLLECT', row: { id: 'PH-2', date: today, company: 'SPLT', estate: 'SSGT', keyed_by: yas.code, keyed_at: today + ' 15:00', phone: yas.phone, status: 'active', replaces: '', block: '01', lot: '1-13', bunches: 1, cleared: 'Y' } });
check('he cannot save into Sugut', sx.error === 'not_your_estate', JSON.stringify(sx).slice(0, 120));

// ---------- HQ's follow-up list ----------
const lt = as(waw, 'late', '');
check('Susulan harian lists both estates, each with its own people and lines', lt.ok && lt.estates.map(e => e.estate).join() === 'SSGT,PTAN' && lt.estates[1].staff === 'Staf Paitan Contoh' && lt.estates[1].items.some(i => i.kind === 'TH') && !lt.estates[0].items.some(i => /MC-P/.test(JSON.stringify(i))), JSON.stringify(lt.estates.map(e => [e.estate, e.staff, e.items.map(i => i.kind).join('')])));
props.SWITCHES = JSON.stringify({ testModeOff: true, live: { 'field-harvest': ['SSGT'] } });
check('with the switch closed for Paitan, HQ\'s list shows Sugut only', as(waw, 'late', '').estates.map(e => e.estate).join() === 'SSGT');
