// E-Book test (1.31) Perlu tindakan: one list per person on the home screen (Staff, Clerk, Pengurus, Owner),
// gathered from what is already keyed; the Pengurus's direction on a staff explanation reaches the staff.
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
let n = 0;
const addRow = (tab, o) => { const sh = ctx.roomTab_(L, tab); const head = sh.rows[0]; const now = today + ' 07:00';
  const row = Object.assign({ id: 'T-' + tab + '-' + (++n), date: today, company: 'SPLT', estate: 'SSGT', keyed_by: 'STF', keyed_at: now, phone: 'P01', status: 'active', replaces: '', received_at: now }, o);
  sh.rows.push(head.map(c => row[c] === undefined ? '' : row[c])); return row; };
const ids = j => (j.items || []).map(x => x.id.split(':')[0]);

check('HQ gets no list yet (Wawa later)', as(hq, 'todo').items.length === 0);
check('an empty estate: nothing for the staff', as(f, 'todo').items.length === 0);
// Staff
addRow('FH_WORK', { date: ago(20), task_code: 'HA', block: '02', lot: '2-3', worker_id: 'W1', bunches: 40 });
addRow('FH_WORK', { date: ago(5), task_code: 'HA', block: '02', lot: '2-4', worker_id: 'W1', bunches: 40 });
const s1 = as(f, 'todo');
check('harvest round late: lot 2-3 (20 days) shows, 2-4 (5 days) does not', s1.items.some(x => x.id === 'RL:02' && /2-3/.test(x.sub) && !/2-4/.test(x.sub)));
addRow('FH_GRADING', { date: ago(1), ticket_no: 'TK1', grade_flag: 'Buah mentah 8%' });
check('poor grading to explain shows for the staff', ids(as(f, 'todo')).includes('GR'));
// Clerk
addRow('FH_TICKET', { date: ago(1), ticket_no: 'TK2', mill: 'SKPOM', nett_mt: 20 });
addRow('FH_DISPATCH', { date: ago(1), trip: 'TRIP1', dn_no: '3975', block: '01', bunches: 300, mill: 'SKPOM', lorry: 'SA1' });
addRow('FH_ALERT', { date: today, kind: 'check', detail: 'Nama hampir sama: Hendra / Endra', staff_note: 'Ya, betul' });
addRow('FH_ALERT', { date: today, kind: 'absent3', ref: 'NONE', detail: 'T' });
const c1 = as(ck, 'todo');
check('clerk: ticket with no grading, DN with no ticket, "semak dulu" saved anyway', ['UG', 'DN', 'CK'].every(k => ids(c1).includes(k)), ids(c1).join());
check('clerk: red lines come first', c1.items[0].p === 1);
const w1 = as(ck, 'workerAdd', { name: 'Pekerja Contoh Satu', gang: 'Am', sex: 'M', day: today, note: 'Ganti' });
check('clerk: a fresh request is not "waiting over 2 days"', !ids(as(ck, 'todo')).includes('WT'));
const WL = L.getSheetByName('WORKER_LOG'); const kat = WL.rows[0].indexOf('keyed_at');
WL.rows.forEach((r, i) => { if (i && r.includes(w1.code)) r[kat] = ago(3) + ' 07:00'; });
check('clerk: waiting over 2 days → remind the Pengurus', ids(as(ck, 'todo')).includes('WT'));
// Pengurus
const m1 = as(mg, 'todo');
check('Pengurus: the worker waiting for LULUS', ids(m1).includes('AP'));
check('Pengurus: harvest round late too', ids(m1).includes('RL'));
const ex = addRow('FH_ALERT', { date: today, kind: 'grading', ref: 'TK1', detail: 'Tiket TK1: Buah mentah 8%', staff_note: 'Pemotong baru, belum biasa' });
const m2 = as(mg, 'todo'); const di = m2.items.find(x => x.id === 'DI:' + ex.id);
check('Pengurus: give direction on the staff\'s explanation', !!di && di.go === 'direct' && /Pemotong baru/.test(di.sub));
check('the clerk cannot give direction', as(ck, 'todoDirect', { ref: ex.id, direction: 'Latih pemotong' }).error === 'not_allowed');
check('direction needs words', as(mg, 'todoDirect', { ref: ex.id, direction: '' }).error === 'need_reason');
const d1 = as(mg, 'todoDirect', { ref: ex.id, direction: 'Latih pemotong baru minggu ini' });
check('direction given: gone from the Pengurus\'s list', d1.ok && !d1.items.some(x => x.id === 'DI:' + ex.id));
check('the staff sees the Pengurus\'s direction', as(f, 'todo').items.some(x => x.id.startsWith('DR:') && /Latih pemotong/.test(x.bm) && /Pengurus Contoh/.test(x.bm)));
check('nothing deleted: the old explanation line is kept, replaced', L.getSheetByName('FH_ALERT').rows.some(r => r.includes(ex.id)));
check('the same direction twice is refused', as(mg, 'todoDirect', { ref: ex.id, direction: 'Lagi' }).error === 'nothing_waiting');
// Owner
const o1 = as(own, 'todo');
check('Owner: stuck over 2 days (worker waiting for the Pengurus)', ids(o1).includes('ST'));
as(mg, 'workerAnswer', { worker: w1.code, ok: true });
const o2 = as(own, 'todo');
check('Owner: SELESAI on the approved hire (covering SDK)', ids(o2).includes('HQ') && !ids(o2).includes('ST'));
as(ck, 'workerFix', { worker: w1.code, name: 'Pekerja Contoh Esa', sex: 'M', note: 'Ejaan' });
as(ck, 'millAsk', { name: 'Kilang Contoh', type: 'mill', note: 'Penuh' });
const o3 = as(own, 'todo');
check('Owner: name fix and new mill', ids(o3).includes('FX') && ids(o3).includes('ML'));
check('Owner: all phones sent lately → no phone line', !ids(o3).includes('PH'));
props['seen:' + f.phone] = JSON.stringify({ u: ctx.adminPhones_().phones.find(x => x.phone === f.phone).code, at: ago(4) + ' 08:00', v: '57', w: '3' });
Object.keys(cache).filter(k => /^seenq/.test(k)).forEach(k => delete cache[k]);
check('Owner: a staff phone not sent for 4 days shows', (j => j.items.some(x => x.id.startsWith('PH:') && /Staf Contoh/.test(x.sub)))(as(own, 'todo')));
check('the staff and the clerk do not see the Owner\'s lines', !ids(as(f, 'todo')).includes('HQ') && !ids(as(ck, 'todo')).includes('FX'));

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 380, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Staff'; const sent = [];
  const srv = { Staff: [{ id: 'RL:02', p: 2, ic: 'TU', bm: 'Pusingan tuai lewat · Blok 02', en: 'Harvest round late · Block 02', sub: 'petak 2-3 (20 hari)', go: '#field-harvest/work' },
      { id: 'DR:1', p: 4, ic: 'AR', bm: 'Arahan Pengurus Contoh: Latih pemotong', en: 'Direction', sub: 'Untuk: Tiket TK1', go: '' }],
    Manager: [{ id: 'DI:A1', p: 2, ic: 'AR', bm: 'Beri arahan: Tiket TK1: Buah mentah 8%', en: 'Give direction', sub: 'Staf: Pemotong baru', go: 'direct', ref: 'A1' }] };
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (/^todo/.test(bd.action)) sent.push(bd);
    if (bd.action === 'login') o = { ok: true, user: { code: role, name: role, role, estates: ['SSGT'] }, sw };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: srv[role] || [] };
    else if (bd.action === 'todoDirect') o = { ok: true, estate: 'SSGT', items: [] };
    else if (bd.action === 'backlog') o = { ok: true, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P12')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  const as2 = async r => { role = r; await p.evaluate(() => { location.hash = ''; }); if (await p.isVisible('#logout')) { await p.click('#logout'); await p.waitForTimeout(300); if (await p.isVisible('#lo-out')) { await p.click('#lo-out'); await p.waitForTimeout(300); } }
    await p.fill('#key', '222222'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(800); };
  await p.reload(); await as2('Staff');
  const hour = await p.evaluate(() => new Date().getHours());
  const txt = await p.innerText('#todo');
  check('phone: staff sees Perlu tindakan with the office lines', /Perlu tindakan|Needs action/.test(txt) && /Pusingan tuai lewat|Harvest round late/.test(txt));
  check('phone: no chit today → red line first (after 5 am)', hour < 5 || (await p.locator('#todo .td-it').first().innerText()).match(/Chit muster|muster chit/));
  check('phone: the direction line cannot be tapped (to read only)', await p.locator('#todo div.td-it').count() === 1);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v42-staff.png' });
  await p.locator('#todo button.td-it', { hasText: /Pusingan|Harvest/ }).click(); await p.waitForTimeout(400);
  check('phone: a tap opens the right screen', await p.evaluate(() => location.hash) === '#field-harvest/work');
  await as2('Manager');
  await p.waitForSelector('#todo button.td-it');
  await p.click('#todo button.td-it'); await p.waitForSelector('#td-dir');
  await p.click('#td-ok'); await p.waitForTimeout(150);
  check('phone: direction needs words', !(await p.isHidden('#td-err')) && !sent.some(x => x.action === 'todoDirect'));
  await p.fill('#td-dir', 'Latih pemotong baru'); await p.click('#td-ok'); await p.waitForTimeout(500);
  check('phone: the direction is sent with its line', sent.some(x => x.action === 'todoDirect' && x.ref === 'A1' && x.direction === 'Latih pemotong baru'));
  check('phone: then the list says nothing to do', /Tiada tindakan|Nothing to do/.test(await p.innerText('#todo')));
  await as2('HQ');
  check('phone: HQ has no box yet', await p.isHidden('#todo'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
