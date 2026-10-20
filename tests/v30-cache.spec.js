// E-Book test (1.19). The office reads each tab once per call, remembers read answers for 60 s,
// and forgets them as soon as anything is saved or changed.
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
const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 43 }, body)) } }));
const OWN = '583920';
post({ key: OWN, action: 'login', phone: 'P01' });
const f = post({ key: OWN, action: 'userAdd', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] });

const T = books[TEST_ID];
let reads = 0;
const realGet = Book.prototype.getSheetByName;
Book.prototype.getSheetByName = function (n) { if (/^FH_|^LIST_/.test(n)) reads++; return realGet.apply(this, arguments); };
const today = fmt(new Date(), '', 'yyyy-MM-dd');
post({ key: f.pin, action: 'login', phone: f.phone });
reads = 0; const a1 = post({ key: f.pin, action: 'backlog', phone: f.phone, estate: 'SSGT' }); const r1 = reads;
check('backlog answers', a1.ok, JSON.stringify(a1).slice(0, 120));
check('each tab is read once in one call (FH_DISPATCH was read twice before)', r1 <= 9, r1 + ' sheet reads');
reads = 0; const a2 = post({ key: f.pin, action: 'backlog', phone: f.phone, estate: 'SSGT' });
check('asked again within 60 s: answered from memory, no sheet read', reads === 0 && JSON.stringify(a2) === JSON.stringify(a1), reads + ' reads');
const sb = post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [{ tab: 'FH_CHIT', row: { id: 'C1', date: today, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: today + ' 06:40', chit: 'MC-1' } }] });
check('a save goes through', sb.ok && sb.results[0].ok, JSON.stringify(sb));
reads = 0; post({ key: f.pin, action: 'backlog', phone: f.phone, estate: 'SSGT' });
check('after a save the next answer is fresh (reads the sheet again)', reads > 0, reads + ' reads');
const h1 = post({ key: f.pin, action: 'history', phone: f.phone, estate: 'SSGT', month: today.slice(0, 7) });
check('history shows the new chit straight after the save', h1.ok && JSON.stringify(h1).indexOf('MC-1') >= 0);
check('history: bad month still refused', post({ key: f.pin, action: 'history', phone: f.phone, estate: 'SSGT', month: 'x' }).error === 'bad_month');
check('another estate still refused', post({ key: f.pin, action: 'backlog', phone: f.phone, estate: 'MELU' }).error === 'not_your_estate');
check('staff cannot read the admin parts', post({ key: f.pin, action: 'adminSwitches', phone: f.phone }).error === 'not_allowed');
const s1 = JSON.stringify(post({ key: OWN, action: 'adminPhones', phone: 'P01' }));
const nm = post({ key: OWN, action: 'adminPhoneName', phone: 'P01', device: f.phone, label: 'Telefon Ujian Baru' });
const s2 = JSON.stringify(post({ key: OWN, action: 'adminPhones', phone: 'P01' }));
check('Pentadbir shows a change at once (not an old remembered answer)', nm.ok && s1.indexOf('Telefon Ujian Baru') < 0 && s2.indexOf('Telefon Ujian Baru') >= 0, JSON.stringify(nm).slice(0, 100));
