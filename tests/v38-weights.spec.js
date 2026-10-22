// E-Book test (1.27.1) Ticket weights in MT or kg, and a ticket dated before the trial day in the same month. Built on the 1.18 setup. Clean start for the Sugut trial: setupLiveSheet makes a new sheet with the same
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
ctx.setupLiveSheet();
const L = books['LIVE1'];
Object.keys(cache).forEach(k => delete cache[k]);
const ck = post({ key: OWN, action: 'userAdd', name: 'Kerani Contoh', role: 'Clerk', estates: ['SSGT'], phone: 'P01' });
post({ key: ck.pin, action: 'login', phone: ck.phone });
const tk = (id, date, tab) => ({ tab: tab || 'FH_TICKET', row: { id, date, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: date + ' 09:00', ticket_no: id, nett_mt: '14.5' } });
const lf = props.LIVE_FROM, before = (d => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); })(lf);
const r = post({ key: ck.pin, action: 'saveBatch', phone: ck.phone, items: [tk('T20', before), tk('TSEP', '2026-09-30')] });
check('a ticket dated the day before the trial (same month) is written', r.ok && r.results[0].ok && !r.results[0].skipped && L.getSheetByName('FH_TICKET').rows.some(x => x[0] === 'T20'), JSON.stringify(r.results));
check('a ticket from an older month is still skipped (practice)', r.results[1].skipped === 'before_live' && !L.getSheetByName('FH_TICKET').rows.some(x => x[0] === 'TSEP'));
post({ key: f.pin, action: 'login', phone: f.phone });
const m = post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [{ tab: 'FH_CHIT', row: { id: 'C20', date: before, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: before + ' 07:00', chit: 'MC-X' } }] });
check('a chit before the trial day is still skipped', m.results[0].skipped === 'before_live');

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'CLK-SSGT-01', name: 'Kerani', role: 'Clerk', estates: ['SSGT'] }, sw };
    else if (bd.action === 'ungraded' || bd.action === 'trips') o = { ok: true, trips: [], tickets: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P10')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  await p.reload(); await p.fill('#key', '222222'); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="field-harvest"]'); await p.waitForSelector('#tk-w1');
  check('weight boxes give a keypad with a dot (decimal)', await p.getAttribute('#tk-w1', 'inputmode') === 'decimal');
  await p.fill('#tk-w1', '32.30'); await p.fill('#tk-w2', '16.22'); await p.click('#tk-no'); await p.waitForTimeout(200);
  check('MT with a dot: 32.30 − 16.22 = 16.08 MT net', (await p.inputValue('#tk-w1')) === '32.30' && (await p.inputValue('#tk-nett')) === '16.08', await p.inputValue('#tk-nett'));
  await p.fill('#tk-w1', '32300'); await p.fill('#tk-w2', '16220'); await p.click('#tk-no'); await p.waitForTimeout(200);
  check('kg as before: 32300 − 16220 = 16080 kg', (await p.inputValue('#tk-nett')) === '16080');
  const d = await p.getAttribute('#tk-date', 'max');
  check('date can be any day up to today', !!d);
  // a lorry of 20 Oct (before the trial day): no delivery note in the app, the ticket still saves
  await p.evaluate(() => localStorage.setItem('ea.cleanDone', JSON.stringify('2026-10-21')));
  await p.fill('#tk-no', '1357999'); await p.fill('#tk-date', '2026-10-20'); await p.dispatchEvent('#tk-date', 'change');
  await p.fill('#tk-w1', '31.50'); await p.fill('#tk-w2', '16.10'); await p.click('#tk-save'); await p.waitForTimeout(400);
  const sheet = await p.isVisible('#sheet-back') ? await p.innerText('#sheet-back') : '';
  if (/SAVE|SIMPAN/i.test(sheet) && await p.isVisible('#tc-ok').catch(() => false)) { await p.click('#tc-ok'); await p.waitForTimeout(300); }
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]').filter(x => x.tab === 'FH_TICKET').map(x => x.row));
  check('20 Oct ticket with no DN: no "type the DO no." stop', !/Taip No\. DO/.test(sheet), sheet.slice(0, 200));
  check('20 Oct ticket saved: dated 20 Oct, 1st weight 31500 kg, net 15.4 MT', q.some(r => r.ticket_no === '1357999' && r.date === '2026-10-20' && r.first_kg === '31500' && Number(r.nett_mt) === 15.4), JSON.stringify(q));
  check('every box has BALIK at the top, and it closes the box (1.27.2)', await p.isVisible('#sheet-x') && (await p.click('#sheet-x'), await p.waitForTimeout(200), await p.isHidden('#sheet-back')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
