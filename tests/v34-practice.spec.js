// E-Book test (1.24) Mod Latihan. Built on the 1.18 setup. Clean start for the Sugut trial: setupLiveSheet makes a new sheet with the same
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
ctx.setupLiveSheet();
const L = books['LIVE1'];
Object.keys(cache).forEach(k => delete cache[k]);
const today = fmt(new Date(), '', 'yyyy-MM-dd');
const row = (tab, id, extra) => ({ tab, row: Object.assign({ id, date: today, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: today + ' 06:40' }, extra) });
post({ key: f.pin, action: 'login', phone: f.phone });
post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [row('FH_CHIT', 'REAL1', { chit: 'MC-REAL' })] });

check('practice user: only Staf, Kerani or Pengurus', post({ key: OWN, action: 'userAdd', name: 'Latihan Pemilik', role: 'Owner', estates: ['SSGT'], practice: true, phone: 'P01' }).error === 'bad_role');
const pr = post({ key: OWN, action: 'userAdd', name: 'Latihan Staf', role: 'Staff', estates: ['SSGT'], practice: true, phone: 'P01' });
check('practice user made with an L- code, a PIN and a phone code, kept in the real users list', pr.ok && /^L-STF-SSGT-01$/.test(pr.code) && /^\d{6}$/.test(pr.pin) && L.getSheetByName('USERS').rows.some(r => r[0] === pr.code), pr.code);
check('the list marks it as practice', pr.users.some(u => u.code === pr.code && u.practice && !u.test));
const lg = post({ key: pr.pin, action: 'login', phone: f.phone });
check('practice login works on any phone (here Ferezelly\'s phone code) and says practice', lg.ok && lg.user.practice === true && lg.user.code === pr.code);
const liveChits = L.getSheetByName('FH_CHIT').rows.length, testChits = T.getSheetByName('FH_CHIT').rows.length;
const sv = post({ key: pr.pin, action: 'saveBatch', phone: f.phone, items: [row('FH_CHIT', 'PR1', { chit: 'MC-PR' }), Object.assign(row('FH_CHIT', 'PR0', { chit: 'MC-PR0' }), {}), ] });
check('practice records go to the practice (TEST) book only', sv.ok && T.getSheetByName('FH_CHIT').rows.length === testChits + 2 && L.getSheetByName('FH_CHIT').rows.length === liveChits);
const old = post({ key: pr.pin, action: 'saveBatch', phone: f.phone, items: [{ tab: 'FH_CHIT', row: { id: 'PR2', date: '2026-10-10', company: 'SPLT', estate: 'SSGT', status: 'active', chit: 'MC-OLD' } }] });
check('practice may key any date (written to the practice book)', old.ok && T.getSheetByName('FH_CHIT').rows.some(r => r[0] === 'PR2'));
const hP = post({ key: pr.pin, action: 'history', phone: f.phone, estate: 'SSGT', month: today.slice(0, 7) });
const hR = post({ key: f.pin, action: 'history', phone: f.phone, estate: 'SSGT', month: today.slice(0, 7) });
const chitsIn = h => JSON.stringify(h);
check('practice reads the practice book; the real person reads the real book (no shared remembered answer)', /MC-PR/.test(chitsIn(hP)) && !/MC-REAL/.test(chitsIn(hP)) && /MC-REAL/.test(chitsIn(hR)) && !/MC-PR/.test(chitsIn(hR)));
const pp = post({ key: pr.pin, action: 'people', phone: f.phone });
check('practice gets no real worker names (made-up workers on the phone)', pp.ok && pp.people.length === 0 && pp.practice);
const ph = post({ key: OWN, action: 'adminPhones', phone: 'P01' });
const fl = ph.phones.find(x => x.phone === f.phone);
check('Telefon: the real phone line still shows the real person (practice did not change it)', fl && fl.seen && !fl.seen.other, JSON.stringify(fl));
check('Telefon: practice users listed apart, with the phone they used', (ph.practice || []).some(x => x.code === pr.code && x.seen && x.seen.phone === f.phone), JSON.stringify(ph.practice));
const sw = post({ key: OWN, action: 'adminSwitches', phone: 'P01' });
check('Suis: practice users are not counted as test PINs or in the trial people check', sw.testPinsOn === 0 && !sw.people.some(x => x.code === pr.code));
const np = post({ key: OWN, action: 'userPin', code: pr.code, phone: 'P01' });
check('Owner can give the practice user a new PIN', np.ok && /^\d{6}$/.test(np.pin) && !post({ key: pr.pin, action: 'login', phone: f.phone }).ok && post({ key: np.pin, action: 'login', phone: 'P55' }).ok);
check('Owner can switch the practice user off', post({ key: OWN, action: 'userOff', code: pr.code, phone: 'P01' }).ok && (Object.keys(cache).forEach(k => delete cache[k]), !post({ key: np.pin, action: 'login', phone: f.phone }).ok));
check('the users log (real book) has the practice add', L.getSheetByName('USERS_LOG').rows.some(r => r[3] === 'add' && /Latihan/.test(r[6])));
check('the real person still saves to the real book after a practice call', (post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [row('FH_CHIT', 'REAL2', { chit: 'MC-REAL2' })] }).ok) && L.getSheetByName('FH_CHIT').rows.some(r => r[0] === 'REAL2') && !T.getSheetByName('FH_CHIT').rows.some(r => r[0] === 'REAL2'));

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 380, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let who = 'L';
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '2026-10-21' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = who === 'L' ? { ok: true, user: { code: 'L-STF-PTAN-01', name: 'Latihan Staf Paitan', role: 'Staff', estates: ['PTAN'], practice: true }, sw }
      : { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf Sebenar', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'people') o = { ok: true, people: [{ id: 'SSGT-R1', name: 'Pekerja Sebenar', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }] };
    else if (bd.action === 'backlog') o = { ok: true, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P12')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.cleanDone', JSON.stringify('2026-10-21')); localStorage.setItem('fh.draft', JSON.stringify({ SSGT: { date: '2026-10-21', real: 1 } })); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  check('phone: practice login shows the orange top and the MOD LATIHAN band', await p.isVisible('#practice-band') && /practice/.test(await p.getAttribute('#top', 'class')) && /MOD LATIHAN/.test(await p.innerText('#practice-band')));
  check('phone: Field & Harvest (not open at Paitan) can be tried in practice', /LATIHAN/.test(await p.innerText('[data-room="field-harvest"]')));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v34-practice.png' });
  const w = await p.evaluate(() => ({ n: EA.lists.workersFor('PTAN').length, first: EA.lists.workersFor('PTAN')[0], one: EA.lists.worker('W-PTAN-001') }));
  check('phone: made-up workers for Paitan (Pekerja Contoh), never real names', w.n === 20 && /Contoh/.test(w.first.name) && w.first.id === 'W-PTAN-001' && w.one && w.one.estate === 'PTAN', JSON.stringify(w.first));
  const st = await p.evaluate(() => { EA.local.set('fh.draft', { PTAN: { date: '2026-10-21', practice: 1 } }); return { mine: EA.local.get('fh.draft'), real: JSON.parse(localStorage.getItem('fh.draft')) }; });
  check('phone: practice drafts are kept apart from the real person\'s on the same phone', st.mine.PTAN && st.real.SSGT && !st.real.PTAN);
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(1200);
  check('phone: the band stays on inside the room', await p.isVisible('#practice-band') && !(await p.isHidden('#room')));
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  await p.click('#logout'); await p.waitForTimeout(400);
  who = 'R'; await p.fill('#key', '654321'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({ band: document.getElementById('practice-band').hidden, top: document.getElementById('top').className, draft: EA.local.get('fh.draft'), pr: EA.practice() }));
  check('phone: a real login after it: no band, normal top, the real draft back', r.band && !/practice/.test(r.top) && r.draft.SSGT && !r.draft.PTAN && !r.pr, JSON.stringify(r));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
