// E-Book test (1.23). Harvest lot colours: the office gives the last day each lot was worked per job;
// Tambah kerja colours harvest lots grey (done lately), green (ready 10–15 days), red (late), and offers the ready lots.
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
const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 43 }, body)) } }));
const OWN = '583920';
post({ key: OWN, action: 'login', phone: 'P01' });
const f = post({ key: OWN, action: 'userAdd', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] });




const T = books[TEST_ID];
const day = n => fmt(new Date(Date.now() - n * 864e5), '', 'yyyy-MM-dd');
function put(tab, o) { const sh = T.getSheetByName(tab); const h = sh.rows[0]; sh.rows.push(h.map(c => o[c] == null ? '' : String(o[c]))); }
const base = d => ({ date: d, company: 'SPLT', estate: 'SSGT', keyed_by: 'STF', keyed_at: d + ' 07:00', phone: 'P12', status: 'active' });
put('FH_WORK', Object.assign({ id: 'W1', task_code: 'HA', block: '01', lot: '1-1', worker_id: 'W', bunches: '50' }, base(day(3))));
put('FH_MUSTER', Object.assign({ id: 'M1', task_code: 'HA', block: '01', lots: '1-2 1-3', muster: 'H', worker_id: 'W' }, base(day(12))));
put('FH_JOBDAY', Object.assign({ id: 'J1', task_code: 'HA', block: '01', lots: '1-4', qty: '', unit: 'bunch' }, base(day(20))));
put('FH_MUSTER', Object.assign({ id: 'M2', task_code: 'HA', block: '01', lots: '1-2', muster: 'T', worker_id: 'X' }, base(day(1))));
post({ key: f.pin, action: 'login', phone: f.phone });
const r = post({ key: f.pin, action: 'rounds', phone: f.phone, estate: 'SSGT' });
const L = (r.lots || {}).HA || {};
check('office: last harvest day per lot from harvest lines, chits and job lines', L['1-1'] === day(3) && L['1-2'] === day(12) && L['1-3'] === day(12) && L['1-4'] === day(20), JSON.stringify(L));

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 380, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'T-STF', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: { HA: L } };
    else if (bd.action === 'backlog') o = { ok: true, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P12')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(1500);
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-quick');
  await p.click('#jb-quick [data-quick="HA"]'); await p.selectOption('#jb-block', '01'); await p.waitForTimeout(200);
  const cls = l => p.getAttribute('#jb-lots [data-lot="' + l + '"]', 'class');
  check('3 days ago = grey (done lately)', /lot-done/.test(await cls('1-1')) && /3 hari/.test(await p.innerText('#jb-lots [data-lot="1-1"]')));
  check('12 days ago = green (ready)', /lot-due/.test(await cls('1-2')) && /lot-due/.test(await cls('1-3')));
  check('20 days ago = red (late)', /lot-late/.test(await cls('1-4')));
  check('a lot with no record stays plain (hectares)', !/lot-/.test(await cls('1-5')) && /Ha/.test(await p.innerText('#jb-lots [data-lot="1-5"]')));
  await p.evaluate(() => EA.ui.toast('Selamat datang, Staf')); await p.waitForTimeout(150);
  const th = await p.evaluate(() => { const t = document.querySelector('.toast:not([hidden])') || document.querySelector('.toast'); return t ? t.getBoundingClientRect().height : 0; });
  check('a message with a box open stays small (not stretched down the screen)', th > 0 && th < 120, th);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v33-lots.png' });
  await p.click('#jb-suggest'); await p.waitForTimeout(200);
  const on = await p.$$eval('#jb-lots .pick[aria-pressed="true"]', a => a.map(x => x.dataset.lot).join(' '));
  check('PILIH PETAK SEDIA ticks the ready and late lots (1-2 1-3 1-4)', on === '1-2 1-3 1-4', on);
  await p.click('#jb-quick [data-quick="CPS"]'); await p.selectOption('#jb-block', '01'); await p.waitForTimeout(200);
  check('a job with no lot round (CPS) shows plain lots and no suggestion', await p.locator('#jb-lots .lot-due, #jb-lots .lot-done, #jb-suggest').count() === 0);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
