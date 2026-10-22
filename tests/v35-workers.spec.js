// E-Book test (1.25) Pekerja masuk & keluar. Built on the 1.18 setup. Clean start for the Sugut trial: setupLiveSheet makes a new sheet with the same
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
const clear = () => Object.keys(cache).filter(k => /^rd\||^gen/.test(k)).forEach(k => delete cache[k]);
const today = fmt(new Date(), '', 'yyyy-MM-dd');
const ago = n => fmt(new Date(Date.now() - n * 864e5), '', 'yyyy-MM-dd');
const ck = post({ key: OWN, action: 'userAdd', name: 'Kerani Contoh', role: 'Clerk', estates: ['SSGT'], phone: 'P01' });
const mg = post({ key: OWN, action: 'userAdd', name: 'Pengurus Contoh', role: 'Manager', estates: ['SSGT'], phone: 'P01' });
const hq = post({ key: OWN, action: 'userAdd', name: 'HQ Contoh', role: 'HQ', estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'], phone: 'P01' });
[f, ck, mg, hq].forEach(u => post({ key: u.pin, action: 'login', phone: u.phone }));
const as = (u, action, extra) => { clear(); return post(Object.assign({ key: u.pin, action, phone: u.phone, estate: 'SSGT' }, /^worker(Add|Leave)$/.test(action) ? { note: 'Sebab contoh' } : {}, extra || {})); };

check('staff cannot open or key worker changes', as(f, 'workers').error === 'not_allowed' && as(f, 'workerAdd', { name: 'X Y', gang: 'Tuai · Harvest', sex: 'M', day: today }).error === 'not_allowed');
check('the Pengurus cannot add a worker', as(mg, 'workerAdd', { name: 'X Y', gang: 'Tuai · Harvest', sex: 'M', day: today }).error === 'not_allowed');
const a1 = as(ck, 'workerAdd', { name: 'Pekerja Baru Satu', gang: 'Tuai · Harvest', sex: 'M', day: today });
check('clerk adds a new hire; with no code the office makes one (SSGTB + yymm + 2 digits)', a1.ok && /^SSGTB\d{4}01$/.test(a1.code) && a1.changes[0].kind === 'new', a1.code);
const a2 = as(ck, 'workerAdd', { name: 'Pekerja Baru Dua', gang: 'Rawatan · Maintenance', sex: 'F', day: today, code: 'SSGTSC261001' });
check('clerk can give the company worker code', a2.ok && a2.code === 'SSGTSC261001');
check('a worker code already used is refused', as(ck, 'workerAdd', { name: 'Lagi', gang: 'Am', sex: 'M', day: today, code: 'SSGTSC261001' }).error === 'code_used');
check('a new hire needs name, sex and gang', as(ck, 'workerAdd', { name: 'A', gang: 'Am', sex: 'M', day: today }).error === 'bad_name' && as(ck, 'workerAdd', { name: 'Abc', gang: 'Am', sex: '', day: today }).error === 'bad_sex');
const LP = L.getSheetByName('LIST_PEOPLE');
check('the worker list line has only name, job, gang, sex and code (Rule 8)', LP.rows[0].join() === 'id,date,company,estate,keyed_by,keyed_at,phone,status,replaces,worker_id,name,job,gang,sex,mandor,active,received_at' && LP.rows.some(r => r.includes('SSGTSC261001')));
const inList = id => { clear(); return post({ key: f.pin, action: 'people', phone: f.phone }).people.some(p => p.id === id); };
check('the new hires are on the staff\'s people list', inList(a1.code) && inList('SSGTSC261001'));
as(mg, 'workerAnswer', { worker: a1.code, ok: true }); as(mg, 'workerAnswer', { worker: 'SSGTSC261001', ok: true });

const r1 = as(ck, 'workerLeave', { worker: a1.code, kind: 'resigned', day: ago(-5) });
check('resigned with a last day still to come: stays on the muster', r1.ok && inList(a1.code));
as(ck, 'workerBack', { worker: a1.code });
const r2 = as(ck, 'workerLeave', { worker: a1.code, kind: 'resigned', day: ago(1) });
check('resigned, last day passed, not yet approved: still on the muster', r2.ok && inList(a1.code));
as(mg, 'workerAnswer', { worker: a1.code, ok: true });
check('resigned, approved, last day passed: off the muster', !inList(a1.code));
const bk = as(ck, 'workerBack', { worker: a1.code });
check('KEMBALI BEKERJA undoes it: back on the muster (a new line, nothing deleted)', bk.ok && inList(a1.code) && L.getSheetByName('WORKER_LOG').rows.length === 1 + 9);

// the staff's flag
post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [{ tab: 'FH_ALERT', row: { id: 'AL1', date: today, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: today + ' 07:00', kind: 'absent3', ref: 'SSGTSC261001', detail: 'T: ' + ago(2) + ' ' + ago(1) + ' ' + today, staff_note: 'Diberitahu kerani' } }] });
const w1 = as(ck, 'workers');
check('the clerk sees the staff\'s "Mungkin lari?" flag', w1.ok && w1.flags.length === 1 && w1.flags[0].worker === 'SSGTSC261001' && w1.can.key && !w1.can.approve);
const lv = as(ck, 'workerLeave', { worker: 'SSGTSC261001', kind: 'absconded', day: ago(3) });
check('clerk keys LARI: waiting for the Pengurus, flag gone, still on the muster', lv.ok && lv.pending.length === 1 && lv.flags.length === 0 && inList('SSGTSC261001'));
check('the same LARI cannot be keyed twice', as(ck, 'workerLeave', { worker: 'SSGTSC261001', kind: 'absconded', day: ago(3) }).error === 'already');
check('the clerk cannot approve', as(ck, 'workerAnswer', { worker: 'SSGTSC261001', ok: true }).error === 'not_allowed');
const wm = as(mg, 'workers');
check('the Pengurus sees it waiting, can approve, cannot key', wm.ok && wm.pending.length === 1 && wm.can.approve && !wm.can.key);
const ap = as(mg, 'workerAnswer', { worker: 'SSGTSC261001', ok: true });
check('LULUS: off the muster, the change shows as approved', ap.ok && !inList('SSGTSC261001') && ap.changes[0].kind === 'approved' && ap.pending.length === 0);
check('HQ sees every change and keys nothing', (h => h.ok && h.changes.length >= 6 && !h.can.key && !h.can.approve)(as(hq, 'workers')) && as(hq, 'workerAdd', { name: 'Abc Def', gang: 'Am', sex: 'M', day: today }).error === 'not_allowed');
as(ck, 'workerBack', { worker: 'SSGTSC261001' });
as(ck, 'workerLeave', { worker: 'SSGTSC261001', kind: 'absconded', day: ago(1) });
const na = as(mg, 'workerAnswer', { worker: 'SSGTSC261001', ok: false, note: 'Dia sakit, sudah kembali' });
check('BUKAN LARI: stays on the muster', na.ok && inList('SSGTSC261001') && na.changes[0].kind === 'rejected' && na.changes[0].of === 'absconded');
// a flag goes by itself when he works again
post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [{ tab: 'FH_ALERT', row: { id: 'AL2', date: today, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: today + ' 07:05', kind: 'absent3', ref: a1.code, detail: 'T', staff_note: 'x' } }] });
check('flag shows while he is away', as(ck, 'workers').flags.some(x => x.worker === a1.code));
post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [{ tab: 'FH_MUSTER', row: { id: 'MU1', date: ago(-1), company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: today + ' 07:10', worker_id: a1.code, muster: 'H', task_code: 'HA' } }] });
check('flag goes by itself once he works again (H after the flag)', !as(ck, 'workers').flags.some(x => x.worker === a1.code));
check('absconded day cannot be in the future', as(ck, 'workerLeave', { worker: a1.code, kind: 'absconded', day: ago(-2) }).error === 'bad_date');
check('not your estate is refused', post({ key: ck.pin, action: 'workers', phone: ck.phone, estate: 'MELU' }).error === 'not_your_estate');

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 380, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Staff';
  const wdata = { ok: true, estate: 'SSGT', at: today + ' 08:00', people: [{ id: 'W-SSGT-007', name: 'Pekerja Contoh 7', gang: 'Rawatan', state: 'absconded', pending: true, onMuster: true, day: ago(3) }, { id: 'W-SSGT-008', name: 'Pekerja Contoh 8', gang: 'Rawatan', state: '', onMuster: true }],
    changes: [{ worker: 'W-SSGT-007', name: 'Pekerja Contoh 7', kind: 'absconded', day: ago(3), by: 'CLK-SSGT-01', at: today + ' 07:30' }], flags: [{ worker: 'W-SSGT-008', name: 'Pekerja Contoh 8', date: today, detail: 'T: ' + ago(2) + ' ' + ago(1) + ' ' + today }],
    pending: [{ worker: 'W-SSGT-007', name: 'Pekerja Contoh 7', day: ago(3), by: 'CLK-SSGT-01', at: today + ' 07:30' }], gangs: ['Tuai · Harvest', 'Rawatan · Maintenance'], jobs: [] };
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: role === 'Staff' ? 'T-STF' : role === 'Clerk' ? 'CLK-SSGT-01' : 'MGR-SSGT-01', name: role, role, estates: ['SSGT'] }, sw };
    else if (bd.action === 'workers') o = Object.assign({}, wdata, { can: { key: role === 'Clerk', approve: role === 'Manager' } });
    else if (bd.action === 'backlog') o = { ok: true, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(([a1, a2]) => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P12')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    const ch = d => ({ chit: 'MC-' + d, date: d, estate: 'SSGT', rows: [{ worker_id: 'W-SSGT-007', muster: 'T' }, { worker_id: 'W-SSGT-008', muster: 'H' }] });
    localStorage.setItem('fh.chits2', JSON.stringify([ch(a2), ch(a1)])); }, [ago(1), ago(2)]);
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  check('phone: staff has no Pekerja tile', await p.locator('[data-room="workers"]').count() === 0);
  await p.click('[data-room="field-harvest"]'); await p.waitForSelector('#fh-rows');
  await p.click('#fh-rows button[data-w="W-SSGT-007"][data-k="T"]'); await p.waitForTimeout(150);
  check('phone: T today after T on the last 2 chit days shows "Mungkin lari?"', await p.locator('#fh-rows .flag-lari [data-lari="W-SSGT-007"]').count() === 1);
  await p.click('#fh-rows button[data-w="W-SSGT-008"][data-k="T"]'); await p.waitForTimeout(150);
  check('phone: a worker who worked recently gets no flag', await p.locator('#fh-rows [data-lari="W-SSGT-008"]').count() === 0);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v35-flag.png' });
  await p.click('#fh-rows [data-lari="W-SSGT-007"]'); await p.waitForTimeout(200);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]').filter(x => x.tab === 'FH_ALERT').map(x => x.row));
  check('phone: BERITAHU KERANI saves one alert line (absent3) and shows "sudah diberitahu"', q.length === 1 && q[0].kind === 'absent3' && q[0].ref === 'W-SSGT-007' && await p.locator('#fh-rows .flag-lari.sent').count() === 1, JSON.stringify(q[0] || {}));
  // the clerk
  await p.evaluate(() => { location.hash = ''; }); await p.click('#logout'); await p.waitForTimeout(300); if (await p.isVisible('#lo-out')) { await p.click('#lo-out'); await p.waitForTimeout(300); }
  role = 'Clerk'; await p.fill('#key', '222222'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(800);
  check('phone: the clerk has the Pekerja tile with the flag count', /1 mungkin lari|1 maybe absconded/.test(await p.innerText('[data-room="workers"]')));
  await p.click('[data-room="workers"]'); await p.waitForSelector('.wk-three');
  check('phone: clerk sees + BARU, BERHENTI, LARI, the flag and the change list; no approve button', await p.locator('.wk-big').count() === 3 && await p.locator('[data-flag="W-SSGT-008"]').count() === 1 && await p.locator('[data-ans]').count() === 0);
  await p.click('[data-go="new"]'); await p.waitForSelector('#wk-name');
  check('phone: new hire form has no IC, passport, bank or pay box', !/IC|pasport|passport|bank|gaji/i.test(await p.innerText('.wk .card').then(t => t.replace(/Tiada IC.*$/s, ''))));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v35-new.png' });
  await p.click('#wk-cancel');
  await p.evaluate(() => { location.hash = ''; }); await p.click('#logout'); await p.waitForTimeout(300); if (await p.isVisible('#lo-out')) { await p.click('#lo-out'); await p.waitForTimeout(300); }
  role = 'Manager'; await p.fill('#key', '333333'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(800);
  check('phone: the Pengurus tile shows "1 perlu lulus"', /1 perlu lulus|1 to approve/.test(await p.innerText('[data-room="workers"]')));
  await p.click('[data-room="workers"]'); await p.waitForSelector('[data-ans="1"]');
  check('phone: the Pengurus sees LULUS / BUKAN LARI and no keying buttons', await p.locator('.wk-big').count() === 0 && await p.locator('[data-ans]').count() === 2);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v35-approve.png' });
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
