// E-Book test (1.28) Pekerja masuk & keluar: every change needs a reason, the Pengurus answers LULUS / TOLAK
// (with why), HQ (SDK) sees the trail after LULUS and presses SELESAI. Uses the v35 server setup.
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
const raw = (u, action, extra) => { clear(); return post(Object.assign({ key: u.pin, action, phone: u.phone, estate: 'SSGT' }, extra || {})); };
const inList = id => { clear(); return post({ key: f.pin, action: 'people', phone: f.phone }).people.some(p => p.id === id); };

check('new hire without a reason is refused', raw(ck, 'workerAdd', { name: 'Pekerja Contoh A', gang: 'Am', sex: 'M', day: today }).error === 'need_reason');
const n1 = raw(ck, 'workerAdd', { name: 'Pekerja Contoh A', gang: 'Am', sex: 'M', day: today, note: 'Ganti pekerja berhenti' });
check('new hire with a reason: waiting for the Pengurus, on the chit at once', n1.ok && n1.pending.length === 1 && n1.pending[0].kind === 'new' && n1.pending[0].note === 'Ganti pekerja berhenti' && inList(n1.code));
check('TOLAK needs a reason', raw(mg, 'workerAnswer', { worker: n1.code, ok: false }).error === 'need_reason');
const t1 = raw(mg, 'workerAnswer', { worker: n1.code, ok: false, note: 'Tiada kekosongan' });
check('TOLAK a new hire: off the chit, the clerk sees why', t1.ok && !inList(n1.code) && (c => c.kind === 'rejected' && c.of === 'new' && c.note === 'Tiada kekosongan')(raw(ck, 'workers').changes[0]));
check('a rejected hire goes to nobody at SDK', raw(hq, 'workers').hq.length === 0);
const n2 = raw(ck, 'workerAdd', { name: 'Pekerja Contoh B', gang: 'Am', sex: 'F', day: today, note: 'Gang rawatan kurang orang' });
raw(mg, 'workerAnswer', { worker: n2.code, ok: true });
const h1 = raw(hq, 'workers');
check('LULUS: SDK sees it with the trail (who keyed, why, who approved)', h1.ok && h1.can.hq && h1.hq.length === 1 && h1.hq[0].kind === 'new' && h1.hq[0].reason === 'Gang rawatan kurang orang' && h1.hq[0].keyed.by === 'Kerani Contoh' && h1.hq[0].approved.by === 'Pengurus Contoh');
check('the clerk and the Pengurus cannot press SELESAI', raw(ck, 'workerDone', { ref: h1.hq[0].ref }).error === 'not_allowed' && raw(mg, 'workerDone', { ref: h1.hq[0].ref }).error === 'not_allowed');
const d1 = raw(hq, 'workerDone', { ref: h1.hq[0].ref });
check('SDK presses SELESAI: gone from its list, a new line in the log', d1.ok && d1.hq.length === 0 && d1.changes[0].kind === 'hq_done');
check('SELESAI twice is refused', raw(hq, 'workerDone', { ref: h1.hq[0].ref }).error === 'already');
check('still on the chit after approval', inList(n2.code));
check('resigned without a reason is refused', raw(ck, 'workerLeave', { worker: n2.code, kind: 'resigned', day: ago(1) }).error === 'need_reason');
raw(ck, 'workerLeave', { worker: n2.code, kind: 'resigned', day: ago(1), note: 'Balik kampung' });
check('resigned, waiting: still on the chit', inList(n2.code));
raw(mg, 'workerAnswer', { worker: n2.code, ok: true });
check('resigned approved after the last day: off the chit, SDK told', !inList(n2.code) && raw(hq, 'workers').hq.some(q => q.kind === 'resigned' && q.reason === 'Balik kampung'));
const n3 = raw(ck, 'workerAdd', { name: 'Pekerja Contoh C', gang: 'Am', sex: 'M', day: today, note: 'Ganti' });
raw(mg, 'workerAnswer', { worker: n3.code, ok: true });
raw(ck, 'workerLeave', { worker: n3.code, kind: 'absconded', day: ago(2), note: 'Staf: tidak nampak sejak Isnin, barang sudah tiada' });
const pm = raw(mg, 'workers');
check('absconded: the Pengurus sees the staff\'s explanation', pm.pending.some(p => p.kind === 'absconded' && /barang sudah tiada/.test(p.note)) && inList(n3.code));
raw(mg, 'workerAnswer', { worker: n3.code, ok: true });
check('absconded LULUS: off the chit, SDK sees it', !inList(n3.code) && raw(hq, 'workers').hq.some(q => q.kind === 'absconded'));
check('the Owner can do every step', (o => o.can.key && o.can.approve && o.can.hq)(raw({ pin: OWN, phone: 'P01' }, 'workers')));
const log = L.getSheetByName('WORKER_LOG');
check('nothing is deleted: every step is a new line', log.rows.length === 1 + 11, String(log.rows.length));

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 380, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Clerk'; const sent = [];
  const base = { ok: true, estate: 'SSGT', at: today + ' 08:00', people: [{ id: 'W-SSGT-008', name: 'Pekerja Contoh 8', gang: 'Rawatan', state: '', onMuster: true }],
    changes: [{ worker: 'W-SSGT-009', name: 'Pekerja Contoh 9', kind: 'rejected', of: 'new', note: 'Tiada kekosongan', day: today, by: 'Pengurus Contoh', at: today + ' 07:40' }], flags: [],
    pending: [{ worker: 'W-SSGT-010', name: 'Pekerja Contoh 10', kind: 'absconded', day: ago(3), note: 'Tidak nampak sejak Isnin', by: 'Kerani Contoh', at: today + ' 07:30' }],
    hq: [{ ref: 'WK-1', worker: 'W-SSGT-011', name: 'Pekerja Contoh 11', kind: 'new', day: today, reason: 'Ganti pekerja', keyed: { by: 'Kerani Contoh', at: today + ' 07:00' }, approved: { by: 'Pengurus Contoh', at: today + ' 07:20', note: '' } }],
    gangs: ['Tuai · Harvest'], jobs: [] };
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (/^worker/.test(bd.action)) sent.push(bd);
    if (bd.action === 'login') o = { ok: true, user: { code: role === 'Clerk' ? 'CLK-SSGT-01' : role === 'HQ' ? 'HQ-SDK-01' : 'MGR-SSGT-01', name: role, role, estates: ['SSGT'] }, sw };
    else if (/^worker/.test(bd.action)) o = Object.assign({}, base, { can: { key: role === 'Clerk', approve: role === 'Manager', hq: role === 'HQ' } });
    else if (bd.action === 'backlog') o = { ok: true, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P12')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  const as = async r => { role = r; await p.evaluate(() => { location.hash = ''; }); if (await p.isVisible('#logout')) { await p.click('#logout'); await p.waitForTimeout(300); if (await p.isVisible('#lo-out')) { await p.click('#lo-out'); await p.waitForTimeout(300); } }
    await p.fill('#key', '222222'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(600); };
  await p.reload(); await as('Clerk');
  await p.click('[data-room="workers"]'); await p.waitForSelector('.wk-three');
  check('phone: the clerk sees the rejected hire and why', /ditolak|rejected/i.test(await p.innerText('.wk')) && /Tiada kekosongan/.test(await p.innerText('.wk')));
  await p.click('[data-go="resigned"]'); await p.waitForSelector('#wk-note');
  await p.selectOption('#wk-who', 'W-SSGT-008'); await p.click('#wk-go'); await p.waitForTimeout(150);
  check('phone: resigned with no reason is stopped on the phone', !(await p.isHidden('#wk-err')) && sent.filter(x => x.action === 'workerLeave').length === 0);
  await p.fill('#wk-note', 'Balik kampung'); await p.click('#wk-go'); await p.waitForTimeout(400);
  check('phone: the reason goes with the change', sent.some(x => x.action === 'workerLeave' && x.note === 'Balik kampung'));
  await as('Manager');
  await p.click('[data-room="workers"]'); await p.waitForSelector('[data-ans="1"]');
  check('phone: the Pengurus sees the staff\'s explanation', /Penjelasan Staf|Staff's explanation/.test(await p.innerText('.wk-pend')) && /Tidak nampak sejak Isnin/.test(await p.innerText('.wk-pend')));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v39-manager.png' });
  await p.click('[data-ans="0"]'); await p.waitForSelector('#rj-note');
  await p.click('#rj-ok'); await p.waitForTimeout(150);
  check('phone: BUKAN LARI asks why first', !(await p.isHidden('#rj-err')) && !sent.some(x => x.action === 'workerAnswer'));
  await p.fill('#rj-note', 'Dia sakit, sudah kembali'); await p.click('#rj-ok'); await p.waitForTimeout(400);
  check('phone: BUKAN LARI sends the reason', sent.some(x => x.action === 'workerAnswer' && x.ok === false && x.note === 'Dia sakit, sudah kembali'));
  await as('HQ');
  check('phone: SDK tile shows "1 perlu tindakan"', /1 perlu tindakan|1 to act on/.test(await p.innerText('[data-room="workers"]')));
  await p.click('[data-room="workers"]'); await p.waitForSelector('[data-done]');
  check('phone: SDK sees the trail (keyed, reason, approved)', (t => /Kerani Contoh/.test(t) && /Ganti pekerja/.test(t) && /Pengurus Contoh/.test(t))(await p.innerText('.wk-trail')));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v39-hq.png' });
  await p.click('[data-done]'); await p.waitForTimeout(400);
  check('phone: SELESAI sends the ref', sent.some(x => x.action === 'workerDone' && x.ref === 'WK-1'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
