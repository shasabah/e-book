// E-Book test (1.18). Clean start for the Sugut trial: setupLiveSheet makes a new sheet with the same
// tabs and columns, copies only the real users, the users log and the shared lists (no test people, no
// test records), keeps the test sheet as it is, and the office then writes into the new sheet. Records
// dated before the trial are answered "done" but never written. Phones drop their practice records once.
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
(lp => lp.rows.push(lp.rows[0].map((c, i) => i === 0 ? 'PPL-1' : c === 'name' ? 'Pekerja Satu' : 'x')))(T.getSheetByName('LIST_PEOPLE'));
// made-up test records in the test sheet
const today = fmt(new Date(), '', 'yyyy-MM-dd');
const row = (tab, id, date, extra) => ({ tab, row: Object.assign({ id, date, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: date + ' 06:40' }, extra) });
post({ key: f.pin, action: 'login', phone: f.phone });
post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [row('FH_CHIT', 'OLD1', '2026-10-19', { chit: 'MC-OLD' }), row('FH_MUSTER', 'OLD2', '2026-10-19', { chit: 'MC-OLD', worker_id: 'W1', muster: 'H' })] });
const testChits = T.getSheetByName('FH_CHIT').rows.length;

ctx.setupLiveSheet();
const L = books['LIVE1'];
check('setup: a new sheet "E-Book LIVE sheet" is made and the office now uses it', L && L.name === 'E-Book LIVE sheet' && props.SHEET_ID === 'LIVE1' && props.LIVE_FROM === '2026-10-21');
check('setup: every tab of the test sheet is there with the same columns', ['FH_CHIT', 'FH_MUSTER', 'FH_WORK', 'USERS', 'USERS_LOG', 'APP_ERROR'].every(n => L.getSheetByName(n) && L.getSheetByName(n).rows[0].join() === T.getSheetByName(n).rows[0].join()) && !L.getSheetByName('Sheet1'));
check('setup: only real users are copied (no T- test people), with their PINs and phone codes', (u => u.length === 2 && u.every(r => !/^T-/.test(r[0])) && u.some(r => r[0] === f.code && r[7] === f.phone))(L.getSheetByName('USERS').rows.slice(1)));
check('setup: the users log and the shared lists are copied', L.getSheetByName('USERS_LOG').rows.length >= 3 && L.getSheetByName('LIST_PEOPLE').rows.length === 2);
check('setup: no test records come across (FH tabs empty)', ['FH_CHIT', 'FH_MUSTER', 'FH_WORK', 'FH_DISPATCH', 'FH_TICKET', 'APP_ERROR'].every(n => L.getSheetByName(n).rows.length === 1));
check('setup: the test sheet is kept exactly as it was', T.getSheetByName('FH_CHIT').rows.length === testChits && T.getSheetByName('USERS').rows.length > 3);
check('setup: it can only run once', (() => { try { ctx.setupLiveSheet(); return false; } catch (e) { return /already/.test(e.message); } })());
check('after setup: the real Staff PIN still logs in on the same phone code', post({ key: f.pin, action: 'login', phone: f.phone }).ok);
Object.keys(cache).forEach(k => delete cache[k]);
check('after setup: the test PIN 777777 no longer logs in', post({ key: '777777', action: 'login', phone: 'P95' }).error === 'wrong_key');
const sb = post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [row('FH_CHIT', 'OLD3', '2026-10-20', { chit: 'MC-PRAC' }), row('FH_CHIT', 'NEW1', '2026-10-21', { chit: 'MC-REAL' })] });
check('a practice record dated before the trial is answered "done" but not written', sb.results[0].ok && sb.results[0].skipped === 'before_live' && !L.getSheetByName('FH_CHIT').rows.some(r => r[0] === 'OLD3'));
check('a record from the trial day is written into the clean sheet', sb.results[1].ok && L.getSheetByName('FH_CHIT').rows.some(r => r[0] === 'NEW1'));
check('the switches tell every phone the trial date', post({ key: f.pin, action: 'switches', phone: f.phone }).sw.cleanFrom === '2026-10-21');

// ---- on the phone: the one-time clean ----
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear();
    const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    S('ea.phone', 'P10'); S('ea.user', { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'], key: '123456' });
    S('fh.chits2', [{ chit: 'A', date: '2026-10-19', estate: 'SSGT' }, { chit: 'B', date: '2026-10-21', estate: 'SSGT' }]);
    S('fh.work', [{ chit: 'A', date: '2026-10-20' }]);
    S('fh.draft2', { SSGT: { date: '2026-10-20', estate: 'SSGT' } });
    S('fh.backlog.SSGT', { field: [] }); S('fh.chitNo', { x: 5 });
    S('ea.queue', [{ tab: 'FH_CHIT', row: { id: 'q1', date: '2026-10-20' } }, { tab: 'FH_CHIT', row: { id: 'q2', date: '2026-10-21' } }]);
    S('ea.people.SSGT', [{ id: 'W1' }]);
  });
  await p.reload(); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { EA.setSwitches({ testModeOff: false, live: {}, cleanFrom: '2026-10-21' });
    const G = k => JSON.parse(localStorage.getItem(k));
    return { chits: G('fh.chits2').map(c => c.chit).join(), work: G('fh.work').length, draft: Object.keys(G('fh.draft2') || {}).length, backlog: localStorage.getItem('fh.backlog.SSGT'),
      chitNo: !!G('fh.chitNo'), queue: G('ea.queue').map(q => q.row.id).join(), user: !!G('ea.user'), phone: G('ea.phone'), people: !!G('ea.people.SSGT'), done: G('ea.cleanDone') }; });
  check('phone: practice records before the trial are dropped; the trial day stays', r.chits === 'B' && r.work === 0 && r.draft === 0 && r.backlog === null, JSON.stringify(r));
  check('phone: practice entries waiting to send are dropped; real ones stay', r.queue === 'q2');
  check('phone: login, phone code, worker list and chit numbers stay', r.user && r.phone === 'P10' && r.people && r.chitNo);
  const again = await p.evaluate(() => { localStorage.setItem('fh.work', JSON.stringify([{ date: '2026-10-19' }])); EA.setSwitches({ cleanFrom: '2026-10-21' }); return JSON.parse(localStorage.getItem('fh.work')).length; });
  check('phone: the clean runs once only (done is remembered)', again === 1);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await br.close();
})();
