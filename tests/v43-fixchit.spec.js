// E-Book test (1.32) C · Betulkan chit semalam: the clerk asks the staff to fix a chit of the last 3 days; the
// staff sees it in "Perlu tindakan", opens that chit and fixes it; the clerk and the Pengurus are told.
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
addRow('FH_CHIT', { date: ago(1), chit: 'MC-Y', confirmed_at: ago(1) + ' 06:30' });
addRow('FH_CHIT', { date: ago(5), chit: 'MC-OLD', confirmed_at: ago(5) + ' 06:30' });
check('the staff cannot ask', as(f, 'chitAsk', { chit: 'MC-Y', note: 'salah' }).error === 'not_allowed');
check('the Pengurus cannot ask (only told)', as(mg, 'chitAsk', { chit: 'MC-Y', note: 'salah' }).error === 'not_allowed');
check('asking needs words', as(ck, 'chitAsk', { chit: 'MC-Y', note: '' }).error === 'need_reason');
check('a chit over 3 days old is refused', as(ck, 'chitAsk', { chit: 'MC-OLD', note: 'Salah tanda' }).error === 'too_old');
check('a chit not at the office is refused', as(ck, 'chitAsk', { chit: 'MC-NONE', note: 'Salah tanda' }).error === 'no_chit');
const a1 = as(ck, 'chitAsk', { chit: 'MC-Y', note: 'Pekerja Contoh 3 tanda H, sepatutnya T' });
check('the clerk asks', a1.ok && a1.done === 'fixask');
check('the same chit twice is refused while waiting', as(ck, 'chitAsk', { chit: 'MC-Y', note: 'lagi' }).error === 'already');
const s1 = as(f, 'todo'), fa = s1.items.find(x => x.id.startsWith('FA:'));
check('the staff sees a red line with what is wrong, and the chit to open', fa && fa.p === 1 && fa.go === 'fix' && fa.fix.chit === 'MC-Y' && fa.fix.date === ago(1) && /Kerani Contoh/.test(fa.bm) && /sepatutnya T/.test(fa.sub), JSON.stringify(fa));
post({ key: f.pin, action: 'saveBatch', phone: f.phone, items: [{ tab: 'FH_ALERT', row: { id: 'FD1', date: ago(1), company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: today + ' 07:10', chit: 'MC-Y', kind: 'fixdone', detail: 'Pekerja Contoh 3: H → T', ref: a1.id } }] });
check('fixed: gone from the staff\'s list', !as(f, 'todo').items.some(x => x.id.startsWith('FA:')));
check('the clerk sees "sudah dibetulkan" with what changed', as(ck, 'todo').items.some(x => x.id.startsWith('FD:') && /dibetulkan/.test(x.bm) && /H → T/.test(x.sub)));
check('the Pengurus is told (green, nothing to press)', as(mg, 'todo').items.some(x => x.id.startsWith('FD:') && x.p === 4 && !x.go));
const a2 = as(own, 'chitAsk', { chit: 'MC-Y', note: 'Hujan salah' });
check('the Owner can ask too, again after the first fix', a2.ok);
const AL = L.getSheetByName('FH_ALERT'); const kat = AL.rows[0].indexOf('keyed_at');
AL.rows.forEach(r => { if (r.includes(a2.id)) r[kat] = ago(2) + ' 07:00'; });
check('the Owner sees a fix not done after a day as stuck', as(own, 'todo').items.some(x => x.id === 'SF:' + a2.id));

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const yd = ago(1), cid = 'MC-SSGT-P13-' + yd.replace(/-/g, '') + '-1';
  let role = 'Staff'; const sent = [];
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    sent.push(bd);
    if (bd.action === 'login') o = { ok: true, user: { code: role === 'Staff' ? 'STF-SSGT-01' : 'CLK-SSGT-01', name: role, role, estates: ['SSGT'] }, sw };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: role === 'Staff' ? [{ id: 'FA:X1', p: 1, ic: '!', bm: 'Kerani Contoh minta betulkan chit', en: 'fix', sub: '"Musrim T, bukan H"', go: 'fix', fix: { chit: cid, ref: 'X1', note: 'Musrim T, bukan H', by: 'Kerani Contoh', date: yd } }] : [] };
    else if (bd.action === 'chitAsk') o = { ok: true, done: 'fixask' };
    else if (bd.action === 'history') o = { ok: true, estate: 'SSGT', month: bd.month, days: bd.month === yd.slice(0, 7) ? [{ date: yd, chits: [{ id: cid, at: '06:30', by: 'STF-SSGT-01', byName: 'Staf Contoh', rows: [{ worker_id: 'H1', muster: 'H', task_code: 'HA', block: '01' }], versions: [] }], work: [], harvest: 0, lorries: [], tickets: [] }] : [] };
    else if (bd.action === 'crop') o = { ok: false, error: 'busy' };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'saveBatch') o = { ok: false, error: 'busy' };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(([yd, cid]) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'H1', name: 'Hendra Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }, { id: 'H2', name: 'Musrim Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    const rows = [{ id: 'R1', worker_id: 'H1', muster: 'H', task_code: 'HA', block: '01', lots: '1-13', mandor: '' }, { id: 'R2', worker_id: 'H2', muster: 'H', task_code: 'HA', block: '01', lots: '1-13', mandor: '' }];
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: cid, date: yd, estate: 'SSGT', rows, jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-13'], mandor: '' }], rain_mm: '', rain_time: '', checker: 'Staf', confirmedAt: '06:30', alerts: [], keyedBy: 'STF-SSGT-01', keyedName: 'Staf', rev: 1, chitRowId: 'C1' }]));
  }, [yd, cid]);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(900);
  await p.locator('#todo button.td-it', { hasText: 'minta betulkan' }).click(); await p.waitForTimeout(600);
  const banner = await p.innerText('#room').catch(() => p.innerText('body'));
  check('phone: the asked chit opens with what the clerk said', /atas permintaan Kerani Contoh|as asked by Kerani Contoh/.test(banner) && /Musrim T, bukan H/.test(banner));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v43-fix.png' });
  await p.click('#fh-rows button[data-w="H2"][data-k="T"]'); await p.waitForTimeout(150);
  await p.click('#fh-check'); await p.waitForTimeout(300);
  if (await p.isVisible('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
  await p.click('#cf-ok'); await p.waitForTimeout(500);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]'));
  const mu = q.filter(x => x.tab === 'FH_MUSTER'), fd = q.find(x => x.tab === 'FH_ALERT' && x.row.kind === 'fixdone');
  check('phone: the fix is saved on yesterday\'s date, replacing the old line', mu.length >= 1 && mu.every(x => x.row.date === yd) && mu.some(x => x.row.worker_id === 'H2' && x.row.muster === 'T' && x.row.replaces === 'R2'), JSON.stringify(mu.map(x => x.row)));
  check('phone: the chit line keeps yesterday\'s date', q.some(x => x.tab === 'FH_CHIT' && x.row.date === yd && x.row.chit === cid));
  check('phone: "done" goes to the office with what changed', fd && fd.row.ref === 'X1' && fd.row.date === yd && /Musrim Contoh: H → T/.test(fd.row.detail), JSON.stringify(fd && fd.row));
  check('phone: today\'s chit list is not touched (no new chit for today)', !q.some(x => x.tab === 'FH_CHIT' && x.row.date !== yd));
  // the clerk asks from Rekod
  role = 'Clerk'; if (await p.isVisible('#sheet-x')) { await p.click('#sheet-x'); await p.waitForTimeout(200); }
  await p.evaluate(() => { location.hash = ''; }); await p.click('#logout'); await p.waitForTimeout(300); if (await p.isVisible('#lo-out')) { await p.click('#lo-out'); await p.waitForTimeout(300); }
  await p.fill('#key', '222222'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(1500);
  await p.click('[data-day="' + yd + '"]'); await p.waitForSelector('#rk-ask');
  await p.click('#rk-ask'); await p.waitForSelector('#ak-note'); await p.click('#ak-ok'); await p.waitForTimeout(150);
  check('phone: Rekod "ask to fix" needs words', !(await p.isHidden('#ak-err')) && !sent.some(x => x.action === 'chitAsk'));
  await p.fill('#ak-note', 'Musrim T, bukan H'); await p.click('#ak-ok'); await p.waitForTimeout(500);
  check('phone: the clerk\'s ask goes to the office with the chit', sent.some(x => x.action === 'chitAsk' && x.chit === cid && x.note === 'Musrim T, bukan H'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
