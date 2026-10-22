// E-Book test (1.29) Kilang & pusat kumpulan baru: the clerk asks for the Pengurus, HQ checks (SEMAK),
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
const fin = post({ key: OWN, action: 'userAdd', name: 'Kewangan Contoh', role: 'HQ', position: 'Account & Finance Executive', estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'], phone: 'P01' });
post({ key: fin.pin, action: 'login', phone: fin.phone });
const own = { pin: OWN, phone: 'P01' };
const as = (u, action, extra) => { clear(); return post(Object.assign({ key: u.pin, action, phone: u.phone, estate: 'SSGT' }, extra || {})); };

check('the finance position can be given (HQ access)', fin.ok, JSON.stringify(fin).slice(0, 120));
check('the mill list is empty before seeding', as(ck, 'mills').mills.length === 0);
check('seedMills puts the 5 Sugut mills in the office list, once', ctx.seedMills() === 5 && ctx.seedMills() === 0 && as(ck, 'mills').mills.length === 5);
check('the staff can read the list but sees no requests', (s => s.ok && s.mills.length === 5 && !s.requests)(as(f, 'mills')));
check('the staff cannot ask', as(f, 'millAsk', { name: 'Kilang Contoh', type: 'mill', note: 'Harga baik' }).error === 'not_allowed');
check('a request needs a reason', as(ck, 'millAsk', { name: 'Kilang Contoh', type: 'mill' }).error === 'need_reason');
check('a mill already on the list is refused', as(ck, 'millAsk', { name: 'skpom', type: 'mill', note: 'Lagi' }).error === 'already_open');
const q1 = as(ck, 'millAsk', { name: 'Kilang Contoh', type: 'mill', location: 'Beluran', note: 'Kilang biasa penuh' });
check('clerk asks: waiting for HQ', q1.ok && q1.requests.length === 1 && q1.requests[0].state === 'request' && q1.requests[0].steps[0].by === 'Kerani Contoh');
check('the same request twice is refused', as(ck, 'millAsk', { name: 'kilang contoh', type: 'mill', note: 'Lagi' }).error === 'already');
const ref = q1.requests[0].ref;
check('finance cannot approve before HQ checks', as(fin, 'millApprove', { ref, ok: true }).error === 'not_checked');
check('finance cannot do the HQ check; the clerk cannot either', as(fin, 'millCheck', { ref, ok: true }).error === 'not_allowed' && as(ck, 'millCheck', { ref, ok: true }).error === 'not_allowed');
check('HQ cannot approve', as(hq, 'millApprove', { ref, ok: true }).error === 'not_allowed');
const c1 = as(hq, 'millCheck', { ref, ok: true });
check('HQ checks: waiting for finance', c1.ok && c1.requests[0].state === 'checked' && c1.can.check && !c1.can.approve);
check('not on the list yet', as(f, 'mills').mills.length === 5);
const a1 = as(fin, 'millApprove', { ref, ok: true });
check('finance approves: the mill is open and on every phone\'s list', a1.ok && a1.requests[0].state === 'approved' && as(f, 'mills').mills.some(m => m.name === 'Kilang Contoh' && m.location === 'Beluran'));
check('the trail has 3 steps (asked, checked, approved)', a1.requests[0].steps.map(s => s.kind).join() === 'request,checked,approved');
const q2 = as(ck, 'millAsk', { name: 'Pusat Contoh', type: 'cc', note: 'Dekat blok 4' });
const ref2 = q2.requests.find(q => q.name === 'Pusat Contoh').ref;
check('TOLAK needs a reason', as(hq, 'millCheck', { ref: ref2, ok: false }).error === 'need_reason');
const r2 = as(hq, 'millCheck', { ref: ref2, ok: false, note: 'Tiada kontrak' });
check('HQ rejects: never on the list, the clerk sees why', r2.ok && !as(f, 'mills').mills.some(m => m.name === 'Pusat Contoh') && as(ck, 'mills').requests.some(q => q.ref === ref2 && q.state === 'rejected' && q.steps[1].note === 'Tiada kontrak'));
const q3 = as(mg, 'millAsk', { name: 'Kilang Contoh Dua', type: 'mill', note: 'Harga lebih baik' });
const ref3 = q3.requests.find(q => q.name === 'Kilang Contoh Dua').ref;
check('the Pengurus can also ask', q3.ok);
as(own, 'millCheck', { ref: ref3, ok: true });
check('the Owner can check and approve', as(own, 'millApprove', { ref: ref3, ok: true }).ok && as(f, 'mills').mills.length === 7);
const M = L.getSheetByName('MILL_LOG');
check('nothing is deleted: each step is a new line', M.rows.length === 1 + 8, String(M.rows.length));

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 380, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Clerk', pos = ''; const sent = [];
  const base = { ok: true, estate: 'SSGT', mills: [{ name: 'Boustead (BOU)', kind: 'mill' }, { name: 'Kilang Contoh', kind: 'mill', location: 'Beluran' }],
    requests: [{ ref: 'ML-1', name: 'Pusat Contoh', type: 'cc', location: '', note: 'Dekat blok 4', state: 'request', steps: [{ kind: 'request', by: 'Kerani Contoh', at: today + ' 08:00', note: 'Dekat blok 4' }] },
      { ref: 'ML-2', name: 'Kilang Contoh Dua', type: 'mill', location: '', note: 'Harga', state: 'checked', steps: [{ kind: 'request', by: 'Kerani Contoh', at: today + ' 08:00', note: 'Harga' }, { kind: 'checked', by: 'HQ Contoh', at: today + ' 09:00', note: '' }] }] };
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (/^mill/.test(bd.action)) sent.push(bd);
    if (bd.action === 'login') o = { ok: true, user: { code: role + pos, name: role, role, estates: ['SSGT'] }, sw };
    else if (/^mill/.test(bd.action)) o = role === 'Staff' ? { ok: true, estate: 'SSGT', mills: base.mills } : Object.assign({}, base, { can: { ask: role === 'Clerk', check: role === 'HQ' && !pos, approve: role === 'HQ' && !!pos } });
    else if (bd.action === 'workers') o = { ok: false, error: 'busy' };
    else if (bd.action === 'backlog') o = { ok: true, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P12')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  const as2 = async (r, ps) => { role = r; pos = ps || ''; await p.evaluate(() => { location.hash = ''; }); if (await p.isVisible('#logout')) { await p.click('#logout'); await p.waitForTimeout(300); if (await p.isVisible('#lo-out')) { await p.click('#lo-out'); await p.waitForTimeout(300); } }
    await p.fill('#key', '222222'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(700); };
  await p.reload(); await as2('Staff');
  check('phone: staff has no mill tile but gets the office list', await p.locator('[data-room="mills"]').count() === 0 && await p.evaluate(() => EA.lists.millsFor('SSGT').join('|')) === 'Boustead (BOU)|Kilang Contoh');
  await as2('Clerk');
  await p.click('[data-room="mills"]'); await p.waitForSelector('#ml-new');
  check('phone: clerk sees the list and the trail, no check or approve button', /Kilang Contoh/.test(await p.innerText('.ml')) && await p.locator('[data-ok]').count() === 0);
  await p.click('#ml-new'); await p.fill('#ml-name', 'Kilang Baru Contoh'); await p.click('#ml-go'); await p.waitForTimeout(150);
  check('phone: no reason, not sent', !(await p.isHidden('#ml-err')) && !sent.some(x => x.action === 'millAsk'));
  await p.click('[data-type="cc"]'); await p.fill('#ml-note', 'Kilang biasa penuh'); await p.click('#ml-go'); await p.waitForTimeout(400);
  check('phone: the request goes with name, kind and reason', sent.some(x => x.action === 'millAsk' && x.name === 'Kilang Baru Contoh' && x.type === 'cc' && x.note === 'Kilang biasa penuh'));
  await as2('HQ');
  check('phone: HQ tile shows "1 perlu tindakan"', /1 perlu tindakan|1 to act on/.test(await p.innerText('[data-room="mills"]')));
  await p.click('[data-room="mills"]'); await p.waitForSelector('[data-ok="check"]');
  check('phone: HQ has SEMAK OK only on the one waiting for it', await p.locator('[data-ok="check"]').count() === 1 && await p.locator('[data-ok="approve"]').count() === 0);
  await p.click('[data-ok="check"]'); await p.waitForTimeout(400);
  check('phone: SEMAK OK sends', sent.some(x => x.action === 'millCheck' && x.ok === true && x.ref === 'ML-1'));
  await as2('HQ', 'F');
  await p.click('[data-room="mills"]'); await p.waitForSelector('[data-ok="approve"]');
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v40-finance.png' });
  await p.click('[data-no="approve"]'); await p.waitForSelector('#mr-note'); await p.click('#mr-ok'); await p.waitForTimeout(150);
  check('phone: TOLAK asks why first', !(await p.isHidden('#mr-err')) && !sent.some(x => x.action === 'millApprove'));
  await p.fill('#mr-note', 'Tiada kontrak'); await p.click('#mr-ok'); await p.waitForTimeout(400);
  check('phone: TOLAK sends the reason', sent.some(x => x.action === 'millApprove' && x.ok === false && x.note === 'Tiada kontrak'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
