// E-Book test (1.30) BETULKAN nama / jantina: the clerk fixes a wrong name or sex with a reason, HQ (SDK) checks
// it (BETUL / TOLAK with why); HQ's or the Owner's own fix goes in at once. The worker code never changes.
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
const ppl = () => { clear(); return post({ key: f.pin, action: 'people', phone: f.phone }).people; };
const w1 = as(ck, 'workerAdd', { name: 'Pekerja Contoh Satu', gang: 'Am', sex: 'M', day: today, note: 'Ganti' });
as(mg, 'workerAnswer', { worker: w1.code, ok: true });
check('the staff and the Pengurus cannot fix a name', as(f, 'workerFix', { worker: w1.code, name: 'X Y', sex: 'F', note: 'abc' }).error === 'not_allowed' && as(mg, 'workerFix', { worker: w1.code, name: 'X Y', sex: 'F', note: 'abc' }).error === 'not_allowed');
check('a fix needs a reason', as(ck, 'workerFix', { worker: w1.code, name: 'Pekerja Contoh Esa', sex: 'F' }).error === 'need_reason');
check('no change is refused', as(ck, 'workerFix', { worker: w1.code, name: 'Pekerja Contoh Satu', sex: 'M', note: 'sama' }).error === 'no_change');
const x1 = as(ck, 'workerFix', { worker: w1.code, name: 'Pekerja Contoh Esa', sex: 'F', note: 'Ejaan salah dalam senarai' });
check('clerk keys a fix: waiting for SDK, the chit keeps the old name', x1.ok && x1.fixes.length === 1 && x1.fixes[0].oldName === 'Pekerja Contoh Satu' && x1.fixes[0].newSex === 'F' && ppl().find(p => p.id === w1.code).name === 'Pekerja Contoh Satu');
check('one fix at a time per worker', as(ck, 'workerFix', { worker: w1.code, name: 'Lain', sex: 'F', note: 'lagi' }).error === 'already');
check('the clerk cannot answer it', as(ck, 'workerFixAnswer', { ref: x1.fixes[0].ref, ok: true }).error === 'not_allowed');
check('TOLAK needs a reason', as(hq, 'workerFixAnswer', { ref: x1.fixes[0].ref, ok: false }).error === 'need_reason');
const ok1 = as(hq, 'workerFixAnswer', { ref: x1.fixes[0].ref, ok: true });
const p1 = ppl().find(p => p.id === w1.code);
check('SDK BETUL: same code, new name and sex on every phone', ok1.ok && ok1.fixes.length === 0 && p1.name === 'Pekerja Contoh Esa' && p1.sex === 'F');
check('the old worker line is kept, replaced (nothing deleted)', (rows => rows.filter(r => r.includes(w1.code)).length === 2)(L.getSheetByName('LIST_PEOPLE').rows));
const x2 = as(ck, 'workerFix', { worker: w1.code, name: 'Nama Salah', sex: 'F', note: 'Cuba' });
const no2 = as(hq, 'workerFixAnswer', { ref: x2.fixes[0].ref, ok: false, note: 'Fail SDK lain' });
check('SDK TOLAK: name stays, the clerk sees why', no2.ok && ppl().find(p => p.id === w1.code).name === 'Pekerja Contoh Esa' && as(ck, 'workers').changes.some(c => c.kind === 'fix_no' && c.note === 'Fail SDK lain'));
const x3 = as(hq, 'workerFix', { worker: w1.code, name: 'Pekerja Contoh Esa Binti Contoh', sex: 'F', note: 'Ikut fail SDK' });
check('HQ\'s own fix goes in at once', x3.ok && x3.done === 'fix_ok' && x3.fixes.length === 0 && ppl().find(p => p.id === w1.code).name === 'Pekerja Contoh Esa Binti Contoh');
const x4 = as(own, 'workerFix', { worker: w1.code, name: 'Pekerja Contoh Esa', sex: 'F', note: 'Pendek' });
check('the Owner\'s own fix goes in at once', x4.ok && x4.done === 'fix_ok');
check('the change list shows old → new', as(ck, 'workers').changes.some(c => c.kind === 'fix' && c.fix && c.fix.from === 'Pekerja Contoh Satu' && c.fix.to === 'Pekerja Contoh Esa'));
check('the fixed worker can still resign (code unchanged)', as(ck, 'workerLeave', { worker: w1.code, kind: 'resigned', day: today, note: 'Balik' }).ok);

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 380, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Clerk'; const sent = [];
  const base = { ok: true, estate: 'SSGT', at: today + ' 08:00', people: [{ id: 'W-SSGT-008', name: 'Pekerja Contoh 8', gang: 'Rawatan', sex: 'M', state: '', onMuster: true }],
    changes: [], flags: [], pending: [], hq: [], fixes: [{ ref: 'WK-9', worker: 'W-SSGT-009', oldName: 'Pekerja Contoh 9', newName: 'Pekerja Contoh Sembilan', oldSex: 'M', newSex: 'F', note: 'Ejaan salah', by: 'Kerani Contoh', at: today + ' 07:00' }], gangs: [], jobs: [] };
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (/^worker/.test(bd.action)) sent.push(bd);
    if (bd.action === 'login') o = { ok: true, user: { code: role, name: role, role, estates: ['SSGT'] }, sw };
    else if (/^worker/.test(bd.action)) o = Object.assign({}, base, { can: { key: role === 'Clerk', approve: false, hq: role === 'HQ', fix: true } });
    else if (bd.action === 'backlog') o = { ok: true, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P12')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  const as2 = async r => { role = r; await p.evaluate(() => { location.hash = ''; }); if (await p.isVisible('#logout')) { await p.click('#logout'); await p.waitForTimeout(300); if (await p.isVisible('#lo-out')) { await p.click('#lo-out'); await p.waitForTimeout(300); } }
    await p.fill('#key', '222222'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(600); };
  await p.reload(); await as2('Clerk');
  await p.click('[data-room="workers"]'); await p.waitForSelector('[data-go="fix"]');
  check('phone: the clerk sees the fix waiting for SDK, no BETUL button', /Menunggu SDK|Waiting for SDK/.test(await p.innerText('.wk')) && await p.locator('[data-fixok]').count() === 0);
  await p.click('[data-go="fix"]'); await p.waitForSelector('#wk-who');
  await p.selectOption('#wk-who', 'W-SSGT-008'); await p.waitForTimeout(150);
  check('phone: picking the worker fills in today\'s name', await p.inputValue('#wk-name') === 'Pekerja Contoh 8');
  await p.fill('#wk-name', 'Pekerja Contoh Lapan'); await p.click('#wk-go'); await p.waitForTimeout(150);
  check('phone: no reason, not sent', !(await p.isHidden('#wk-err')) && !sent.some(x => x.action === 'workerFix'));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v41-fix.png' });
  await p.fill('#wk-note', 'Ejaan salah dalam senarai'); await p.click('#wk-go'); await p.waitForTimeout(400);
  check('phone: the fix goes with the new name, sex and reason', sent.some(x => x.action === 'workerFix' && x.worker === 'W-SSGT-008' && x.name === 'Pekerja Contoh Lapan' && x.sex === 'M' && x.note === 'Ejaan salah dalam senarai'));
  await as2('HQ');
  check('phone: SDK tile counts the fix', /1 perlu tindakan|1 to act on/.test(await p.innerText('[data-room="workers"]')));
  await p.click('[data-room="workers"]'); await p.waitForSelector('[data-fixok]');
  check('phone: SDK sees old → new name and sex', (t => /Pekerja Contoh 9/.test(t) && /Pekerja Contoh Sembilan/.test(t) && /→/.test(t))(await p.innerText('.wk')));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v41-sdk.png' });
  await p.click('[data-fixok]'); await p.waitForTimeout(400);
  check('phone: BETUL sends', sent.some(x => x.action === 'workerFixAnswer' && x.ok === true && x.ref === 'WK-9'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
