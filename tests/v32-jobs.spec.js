// E-Book test (1.22). Tambah kerja: usual-job buttons, no block or lots for general work, and the
// block's rounds this year against the plan (office: hectares done per job and block, and the last date).
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
const yr = fmt(new Date(), '', 'yyyy');
function put(tab, o) { const sh = T.getSheetByName(tab); const h = sh.rows[0]; sh.rows.push(h.map(c => o[c] == null ? '' : String(o[c]))); }
const base = d => ({ date: d, company: 'SPLT', estate: 'SSGT', keyed_by: 'IMPORT', keyed_at: d + ' 00:00', phone: 'IMPORT', status: 'active' });
put('FH_JOBDAY', Object.assign({ id: 'J1', task_code: 'CPS', block: '01', qty: '33.2', unit: 'ha', job_status: 'done' }, base(yr + '-03-31')));
put('FH_JOBDAY', Object.assign({ id: 'J2', task_code: 'CPS', block: '02', qty: '17', unit: 'ha' }, base(yr + '-03-31')));
put('FH_JOBDAY', Object.assign({ id: 'J3', task_code: 'CPS', block: '02', qty: '', unit: 'bag', plan_ha: '19' }, base(yr + '-04-30')));
put('FH_JOBDAY', Object.assign({ id: 'J4', task_code: 'CPS', block: '02', qty: '50', unit: 'ha' }, base('2020-04-30')));
post({ key: f.pin, action: 'login', phone: f.phone });
const r = post({ key: f.pin, action: 'rounds', phone: f.phone, estate: 'SSGT' });
check('office: hectares per job and block this year, with the last date', r.ok && r.rounds['CPS|01'].ha === 33.2 && r.rounds['CPS|02'].ha === 36 && r.rounds['CPS|02'].last === yr + '-04-30', JSON.stringify(r.rounds));
check('office: other estates refused', post({ key: f.pin, action: 'rounds', phone: f.phone, estate: 'MELU' }).error === 'not_your_estate');

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 380, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'T-STF', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'rounds') o = { ok: true, rounds: { 'CPS|01': { ha: 33.2, last: yr + '-03-31' } } };
    else if (bd.action === 'backlog') o = { ok: true, field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P12')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(1500);
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-quick');
  const chips = await p.$$eval('#jb-quick [data-quick]', a => a.map(x => x.dataset.quick).join(','));
  check('Tambah kerja: the usual Sugut jobs are buttons at the top', chips === 'HA,ITF,LFF,LF,DF,MDR,CA,WM', chips);   // v1.36: the daily shortcuts
  await p.evaluate(() => { const d = document.querySelector('#jb-more'); if (d) d.open = true; }); await p.click('.jb-quick [data-quick="RMH"]');
  check('general/repair job: no block and no lots, says "no block needed"', await p.isHidden('#jb-where') && await p.isVisible('#jb-noblock') && (await p.getAttribute('.jb-quick [data-quick="RMH"]', 'aria-pressed')) === 'true');
  await p.click('#jb-save'); await p.waitForTimeout(300);
  check('general job saves with no block', /RMH/.test(await p.innerText('#fh-jobs')));
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-quick');
  await p.evaluate(() => { const d = document.querySelector('#jb-more'); if (d) d.open = true; }); await p.click('.jb-quick [data-quick="CPS"]');
  check('field job: block and lots are shown again', await p.isVisible('#jb-where') && await p.isHidden('#jb-noblock'));
  await p.selectOption('#jb-block', '01'); await p.waitForTimeout(200);
  const rt1 = await p.innerText('#jb-round');
  check('round status: "Blk 01 · CPS: 1 / 4 pusingan · terakhir Mac"', /Blk 01 · CPS: 1 \/ 4 pusingan/.test(rt1) && /terakhir Mac/.test(rt1), rt1);
  await p.selectOption('#jb-block', '04'); await p.waitForTimeout(200);
  check('a block with nothing done shows 0 / 4', /Blk 04 · CPS: 0 \/ 4/.test(await p.innerText('#jb-round')));
  await p.click('#jb-quick [data-quick="HA"]'); await p.selectOption('#jb-block', '01'); await p.waitForTimeout(200);
  check('a job with no yearly plan (harvest) shows no round line', await p.isHidden('#jb-round'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
