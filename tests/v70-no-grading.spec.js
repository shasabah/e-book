// E-Book test (1.59) a mill or centre that sends no grading sheet (LIST_MILLS no_grade = Y). From Ria, 13 Nov 2026:
// Sinar Cahaya writes only "Grade A", with no rejected bunches and no percentages. Its tickets must never sit in
// the clerk's "waiting for grading" list, nor on anyone's Perlu tindakan. Made-up people.
// Base harness from v40 (1.29) Kilang & pusat kumpulan baru: the clerk asks for the Pengurus, HQ checks (SEMAK),
// the Account & Finance Executive approves and opens it (LULUS · BUKA), the Owner can do either step.
// The mill list lives in the office sheet (LIST_MILLS); phones keep a copy for the lorry and ticket screens.
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
    setNumberFormat: () => {},
    createTextFinder: txt => ({ matchEntireCell: () => ({ findNext: () => { const v = get(); for (let i = 0; i < v.length; i++) if (String(v[i][0]) === String(txt)) return { getRow: () => r + i }; return null; } }) }) }; };
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
const fin = post({ key: OWN, action: 'userAdd', name: 'Kewangan Contoh', role: 'HQ', position: 'Account & Finance Executive', estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'], phone: 'P01' });
post({ key: fin.pin, action: 'login', phone: fin.phone });
const own = { pin: OWN, phone: 'P01' };
const as = (u, action, extra) => { clear(); return post(Object.assign({ key: u.pin, action, phone: u.phone, estate: 'SSGT' }, extra || {})); };


ctx.seedMills();
const millRow = name => { const sh = L.getSheetByName('LIST_MILLS'), rs = sh.rows, h = rs[0];
  return { sh, h, i: rs.findIndex(r => String(r[h.indexOf('name')]) === name) }; };

check('seedMills gives every mill an empty no_grade column', (() => { const { h } = millRow('Sinar C'); return h.indexOf('no_grade') >= 0; })());
check('with no_grade empty, every mill is read as grading', as(ck, 'mills').mills.every(m => m.no_grade === false));

// HQ marks Sinar C as sending no grading, in the office list
(() => { const { sh, h, i } = millRow('Sinar C'); sh.rows[i][h.indexOf('no_grade')] = 'Y'; })();
clear();
const ms = as(ck, 'mills').mills;
check('Sinar C now reads as "sends no grading"; the others do not', (ms.find(m => m.name === 'Sinar C') || {}).no_grade === true && ms.filter(m => m.no_grade).length === 1, JSON.stringify(ms.map(m => m.name + ':' + m.no_grade)));

// two tickets the same day: one from a mill that grades, one from Sinar C
const std0 = id => ({ id, date: today, company: 'SPLT', estate: 'SSGT', keyed_by: ck.code, keyed_at: today + ' 11:00', phone: ck.phone, status: 'active', replaces: '' });
const tk = (no, mill, dn) => { clear(); return post({ key: ck.pin, action: 'save', phone: ck.phone, tab: 'FH_TICKET',
  row: Object.assign(std0('TK-' + no), { ticket_no: no, mill, do_no: dn, nett_mt: '10.00', bunches: '500', first_kg: '27000', second_kg: '17000', abw_kg: '20' }) }); };
const sv1 = tk('T-BOU-1', 'Boustead (BOU)', '9001'), sv2 = tk('T-SIN-1', 'Sinar C', '9002');
check('both tickets are keyed by the clerk', sv1.ok && sv2.ok, JSON.stringify([sv1, sv2]).slice(0, 200));
const ug = as(ck, 'ungraded');
const has = n => (ug.tickets || []).some(t => String(t.ticket_no) === n);
check('the Boustead ticket waits for grading', has('T-BOU-1'), JSON.stringify(ug).slice(0, 200));
check('the Sinar C ticket does not wait for grading', !has('T-SIN-1'));
check('the answer names which mills send no grading', (ug.noGrade || []).indexOf('Sinar C') >= 0, JSON.stringify(ug.noGrade));
const clerkTodo = as(ck, 'todo').items || [];
check('Perlu tindakan chases only the Boustead ticket', clerkTodo.some(i => i.id === 'UG:T-BOU-1') && !clerkTodo.some(i => i.id === 'UG:T-SIN-1'), clerkTodo.map(i => i.id).join(' '));

// a grading keyed anyway (the mill sent one that day) still saves and still counts
clear();
post({ key: ck.pin, action: 'save', phone: ck.phone, tab: 'FH_GRADING',
  row: Object.assign(std0('GR-SIN-1'), { ticket_no: 'T-SIN-1', sample: '100', g_ur: '2', rej_ur: '1', penalty_pct: '0.5', grade_flag: 'Ditolak 1 tandan (UR 1, EB 0, RT 0)' }) });
clear();
check('a grading keyed for a no-grading mill is still kept', (L.getSheetByName('FH_GRADING').rows || []).some(r => String(r).indexOf('T-SIN-1') >= 0));
// switching it back
(() => { const { sh, h, i } = millRow('Sinar C'); sh.rows[i][h.indexOf('no_grade')] = ''; })();
clear();
const off = as(ck, 'ungraded');
check('taking the setting off: no mill sends no grading, and T-SIN-1 stays off the list because its grading is keyed', (off.noGrade || []).length === 0 && !(off.tickets || []).some(t => String(t.ticket_no) === 'T-SIN-1'), JSON.stringify(off).slice(0, 200));
check('the Boustead ticket is still waiting', (as(ck, 'ungraded').tickets || []).some(t => String(t.ticket_no) === 'T-BOU-1'));
