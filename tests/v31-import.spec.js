// E-Book test (1.22). Records loaded from old files (keyed_by IMPORT) count in the month's tonnes
// and History, but not in the field/ramp backlog, the lorry's open harvest lines or the ungraded list.
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
const today = fmt(new Date(), '', 'yyyy-MM-dd'), d1 = today.slice(0, 8) + '01';
function put(tab, o) { const sh = T.getSheetByName(tab); const h = sh.rows[0]; sh.rows.push(h.map(c => o[c] == null ? '' : String(o[c]))); }
const base = { date: d1, company: 'SPLT', estate: 'SSGT', keyed_by: 'IMPORT', keyed_at: d1 + ' 00:00', phone: 'IMPORT', status: 'active' };
put('FH_WORK', Object.assign({ id: 'IMP-W1', task_code: 'HA', block: '02', worker_id: 'W1', bunches: '377', note: 'Data lama · imported' }, base));
put('FH_TICKET', Object.assign({ id: 'IMP-T1', ticket_no: '1357515', mill: 'SKCC', do_no: '8519', nett_mt: '16.08', note: 'Data lama · imported' }, base));
post({ key: f.pin, action: 'login', phone: f.phone });
const b = post({ key: f.pin, action: 'backlog', phone: f.phone, estate: 'SSGT' });
check('imported harvest is not shown as still in the field', b.ok && b.fieldTotal === 0 && b.ramp.bunches === 0, JSON.stringify(b).slice(0, 160));
check('imported ticket counts in the month\'s tonnes', b.tonnage && Math.abs((b.tonnage.mt || 0) - 16.08) < 0.001, JSON.stringify(b.tonnage));
const h = post({ key: f.pin, action: 'harvest', phone: f.phone, estate: 'SSGT' });
check('imported harvest is not offered for a lorry', h.ok && !(h.lines || []).some(l => l.id === 'IMP-W1'));
const u = post({ key: f.pin, action: 'ungraded', phone: f.phone, estate: 'SSGT' });
check('imported ticket is not in the ungraded list', u.ok && !(u.tickets || []).some(t => t.ticket_no === '1357515'));
const hi = post({ key: f.pin, action: 'history', phone: f.phone, estate: 'SSGT', month: today.slice(0, 7) });
check('History shows the imported day', hi.ok && JSON.stringify(hi).indexOf('1357515') >= 0 || JSON.stringify(hi).indexOf('377') >= 0, JSON.stringify(hi).slice(0, 200));
// a real harvest line still counts
const sb = post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [{ tab: 'FH_WORK', row: { id: 'L1', date: today, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: today + ' 15:00', task_code: 'HA', block: '01', lot: '1-24', worker_id: 'W2', bunches: '50' } }] });
const b2 = post({ key: f.pin, action: 'backlog', phone: f.phone, estate: 'SSGT' });
check('a real harvest line still shows in the field', sb.ok && b2.fieldTotal === 50, b2.fieldTotal);
