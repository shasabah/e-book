// E-Book test (1.26) Rekod: the office's crop answer and the phone's four pages and month report. Built on the 1.18 setup. Clean start for the Sugut trial: setupLiveSheet makes a new sheet with the same
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
const put = (tab, o) => { const sh = ctx.roomTab_(L, tab); const h = sh.rows[0]; sh.rows.push(h.map(c => o[c] == null ? '' : String(o[c]))); };
const base = (d, by) => ({ date: d, company: 'SPLT', estate: 'SSGT', keyed_by: by || 'IMPORT', keyed_at: d + ' 07:00', phone: 'X', status: 'active' });
put('LIST_PEOPLE', Object.assign({ id: 'P1', worker_id: 'OLD1', name: 'Penuai Lama', active: 'N' }, base('2026-01-01')));
put('LIST_PEOPLE', Object.assign({ id: 'P2', worker_id: 'W9', name: 'Penuai Baru', active: 'Y' }, base('2026-01-01')));
put('FH_WORK', Object.assign({ id: 'A1', task_code: 'HA', worker_id: 'OLD1', bunches: '100' }, base('2026-09-03')));
put('FH_WORK', Object.assign({ id: 'A2', task_code: 'HA', worker_id: 'OLD1', bunches: '120', block: '01' }, base('2026-10-02')));
put('FH_WORK', Object.assign({ id: 'A3', task_code: 'HA', worker_id: 'W9', bunches: '80', block: '02' }, base('2026-10-02', 'STF-SSGT-01')));
put('FH_WORK', Object.assign({ id: 'A4', task_code: 'HA', worker_id: 'W9', bunches: '50', block: '02' }, base('2026-10-05', 'STF-SSGT-01')));
put('FH_WORK', Object.assign({ id: 'A5', task_code: 'CPS', worker_id: 'W9', bunches: '', block: '02' }, base('2026-10-06', 'STF-SSGT-01')));
put('FH_TICKET', Object.assign({ id: 'T1', ticket_no: '9001', mill: 'Sri Kamusan CC (SKCC)', do_no: '8519', time: '16:59', first_kg: '32300', second_kg: '16220', nett_mt: '3.5', rej_ur: '2', rej_emp: '3' }, base('2026-10-04')));
put('FH_TICKET', Object.assign({ id: 'T0', ticket_no: '8999', mill: 'BOU', do_no: '8518', nett_mt: '1.4' }, base('2026-09-30')));
put('FH_DISPATCH', Object.assign({ id: 'D1', trip: 'LR-1', dn_no: '8600', bunches: '50', lorry: 'SJ1' }, base('2026-10-05', 'STF-SSGT-01')));
put('FH_TICKET', Object.assign({ id: 'T2', ticket_no: '9002', trip: 'LR-1', mill: 'BOU', nett_mt: '0.7' }, base('2026-10-06', 'CLK-SSGT-01')));
put('LIST_BUDGET', Object.assign({ id: 'B1', month: '2026-10', budget_mt: '220', abw_kg: '14.05', work_days: '26' }, base('2026-10-01')));
post({ key: f.pin, action: 'login', phone: f.phone });
const c = post({ key: f.pin, action: 'crop', phone: f.phone, estate: 'SSGT', month: '2026-10' });
check('crop: harvesters by day (old harvester by name, marked old, listed last)', c.ok && c.harvesters.length === 2 && c.harvesters[0].name === 'Penuai Baru' && c.harvesters[1].old && c.harvesters[1].days[2] === 120 && c.harvesters[0].days[5] === 50, JSON.stringify(c.harvesters));
check('crop: only harvest counts (CPS left out), blocks by day', c.blocks.length === 2 && c.blocks.find(b => b.block === '02').days[2] === 80);
check('crop: tickets of the month in date order, weights, reject = UR + EMP + ROTT, ABW from the DN bunches', c.tickets.length === 2 && c.tickets[0].no === '9001' && c.tickets[0].w1 === 32300 && c.tickets[0].rej === 5 && c.tickets[1].abw === 14, JSON.stringify(c.tickets));
check('crop: budget 220 MT, ABW 14.05, 26 days', c.budget && c.budget.mt === 220 && c.budget.abw === 14.05 && c.budget.days === 26);
check('crop: months of the year with ABW (Sep 1.4 MT ÷ 100 = 14 kg)', c.months.length === 2 && c.months[0].month === '2026-09' && c.months[0].abw === 14 && c.months[1].bunches === 250, JSON.stringify(c.months));
check('crop: marks that old data is inside', c.imp === true);
check('crop: a bad month is refused', post({ key: f.pin, action: 'crop', phone: f.phone, estate: 'SSGT', month: '10-2026' }).error === 'bad_month');
const h = post({ key: f.pin, action: 'history', phone: f.phone, estate: 'SSGT', month: '2026-10' });
check('history: imported days are marked old (imp)', h.days.find(d => d.date === '2026-10-04').imp === true && !h.days.find(d => d.date === '2026-10-05').imp);

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Clerk';
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: role === 'Clerk' ? 'CLK-SSGT-01' : 'STF-SSGT-01', name: role === 'Clerk' ? 'Kerani Contoh' : 'Staf', role, estates: ['SSGT'] }, sw };
    else if (bd.action === 'history') o = bd.month === '2026-10' ? h : { ok: true, days: [] };
    else if (bd.action === 'crop') o = bd.month === '2026-10' ? c : { ok: true, harvesters: [], blocks: [], tickets: [], months: [], budget: null };
    else if (bd.action === 'ungraded') o = { ok: true, trips: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P10')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await p.reload(); await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await p.fill('#key', '222222'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(600);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100);
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(300);
  // go to October 2026
  for (let i = 0; i < 12 && !/Oktober 2026/.test(await p.innerText('#hs-pick')); i++) { await p.click(/Oktober 2026/.test(await p.innerText('#hs-pick')) ? '#hs-next' : (await p.innerText('#hs-pick')) > 'Oktober' ? '#hs-prev' : '#hs-prev'); await p.waitForTimeout(400); }
  await p.waitForTimeout(500);
  const sum = (await p.innerText('.rk-sum')).replace(/\s+/g, ' ');
  check('phone: the four boxes from the office (250 bunches, 4.20 MT, ABW 16.80, 2 harvest days)', /250/.test(sum) && /4\.20/.test(sum) && /16\.80/.test(sum) && /\b2\b/.test(sum), sum);
  check('phone: the clerk has PRINT MONTH REPORT', await p.locator('#rk-print').count() === 1);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v36-list.png', fullPage: true });
  await p.click('.rk-sum [data-detail="tandan"]'); await p.waitForTimeout(300);
  const g = await p.innerText('.rk-grid');
  check('Tandan page: budget card, a grid with each harvester, day totals, target per day', /Penuai Baru/.test(g) && /Penuai Lama/.test(g) && /Jumlah hari/.test(g) && /Sasaran/.test(g) && await p.locator('.rk-card .rk-bar').count() === 1);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v36-tandan.png', fullPage: true });
  await p.click('[data-by="b"]'); await p.waitForTimeout(200);
  check('Tandan page: by block', /Blk 01/.test(await p.innerText('.rk-grid')) && /Blk 02/.test(await p.innerText('.rk-grid')));
  await p.click('.rk-sum [data-detail="mt"]'); await p.waitForTimeout(200);
  const mt = await p.innerText('#room');
  check('MT page: budget 220, by mill, ticket table with weights and reject', /220/.test(mt) && /SKCC/.test(mt) && /9001/.test(mt) && /32\.30/.test(mt) && /16\.22/.test(mt));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v36-mt.png', fullPage: true });
  await p.click('.rk-sum [data-detail="abw"]'); await p.waitForTimeout(200);
  const ab = await p.innerText('#room');
  check('ABW page: this month against target, bars by month, ABW per lorry', /14\.05/.test(ab) && await p.locator('.rk-bars > div').count() === 2 && /14\.00 kg/.test(ab));
  await p.click('.rk-sum [data-detail="hari"]'); await p.waitForTimeout(200);
  check('Hari tuai page: block by day chart and days harvested per block', await p.locator('.rk-cal i.y').count() >= 2 && /Blk 02/.test(await p.innerText('#room')));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v36-hari.png', fullPage: true });
  await p.click('#hs-up'); await p.waitForTimeout(200);
  await p.click('#rk-print'); await p.waitForSelector('#pr-go');
  await p.click('#pr-go'); await p.waitForTimeout(800);
  const pr = await p.evaluate(() => ({ n: window.__printed || 0, pages: document.querySelectorAll('#print-area .pr-pg').length, t: (document.getElementById('print-area') || {}).innerText || '' }));
  check('print: two A4 pages made and the print box asked for', pr.n === 1 && pr.pages === 2 && /Laporan Tuaian Bulanan/.test(pr.t) && /Penghantaran, ABW/.test(pr.t) && /Disediakan oleh/.test(pr.t) && /Kerani Contoh/.test(pr.t), JSON.stringify({ n: pr.n, pages: pr.pages }));
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: (process.argv[2] || '/tmp') + '/v36-report.pdf', format: 'A4', landscape: true, printBackground: true });
  await p.emulateMedia({ media: 'screen' });
  check('print: on screen the report stays hidden', !(await p.isVisible('#print-area')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
