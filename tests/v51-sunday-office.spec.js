// E-Book test (1.41) F · Sunday work (office): work other than crop, manuring and CPS on a Sunday is approved by SDK (HQ),
// not the Pengurus; the Owner sees and may answer it too until HQ has logins; the staff and clerk see the answer. Made-up names only.
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
const addRow = (tab, o) => { const sh = ctx.roomTab_(L, tab); const head = sh.rows[0]; const now = today + ' 07:00';
  const row = Object.assign({ id: 'T-' + tab + '-' + (++n), date: today, company: 'SPLT', estate: 'SSGT', keyed_by: 'STF', keyed_at: now, phone: 'P01', status: 'active', replaces: '', received_at: now }, o);
  sh.rows.push(head.map(c => row[c] === undefined ? '' : row[c])); return row; };
addRow('FH_ALERT', { id: 'SA1', date: today, keyed_by: f.code || 'STF', chit: 'MC-S', kind: 'sunask', detail: 'Kerja hari Ahad: 2 orang · CA', staff_note: 'Kerja hari Ahad perlu lulus SDK', ref: 'MC-S' });
const h1 = as(hq, 'todo').items.find(x => x.id === 'SA:SA1');
check('office: SDK (HQ) gets the Sunday work with LULUS / TOLAK', h1 && h1.go === 'jobok' && h1.ref === 'SA1' && /Kerja hari Ahad: 2 orang/.test(h1.bm) && /LULUS \/ TOLAK/.test(h1.sub), JSON.stringify(h1));
check('office: the Owner sees it too (until HQ has logins)', as(own, 'todo').items.some(x => x.id === 'SA:SA1'));
const m1 = as(mg, 'todo');
check('office: the Pengurus does not get it (neither as approval nor "Beri arahan")', !m1.items.some(x => /SA1/.test(x.id)));
check('office: the Pengurus cannot answer Sunday work', as(mg, 'todoDirect', { ref: 'SA1', direction: 'LULUS' }).error === 'not_allowed');
addRow('FH_ALERT', { id: 'JX1', date: today, chit: 'MC-S', kind: 'jobask', detail: 'Kerja lain: VMC Cuci · 1 orang', staff_note: 'kotor', ref: 'MC-S' });
check('office: SDK cannot answer the Pengurus\'s other work', as(hq, 'todoDirect', { ref: 'JX1', direction: 'LULUS' }).error === 'not_allowed');
const d = as(hq, 'todoDirect', { ref: 'SA1', direction: 'TOLAK: Bukan kerja penting' });
check('office: SDK rejects with why', d.ok && !d.items.some(x => x.id === 'SA:SA1'), JSON.stringify(d).slice(0, 200));
check('office: the staff sees the answer', as(f, 'todo').items.some(x => /^DR:/.test(x.id) && /TOLAK/.test(x.bm) && /hari Ahad/.test(x.bm)));
check('office: the clerk sees the rejection (pay)', as(ck, 'todo').items.some(x => x.id.startsWith('JR:') && /hari Ahad/.test(x.bm)));
