// E-Book test (1.36) D · Kerja utama: Sugut's chit offers its 19 main jobs (incl. new DF, MDR, OPR); other work needs a
// reason and goes to the Assistant Manager, who answers LULUS / TOLAK; the staff and the clerk see the answer. Made-up names only.
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
// --- office: the request, the Pengurus's answer, who sees what ---
addRow('FH_ALERT', { id: 'JA1', date: today, keyed_by: f.code || 'STF', chit: 'MC-T', kind: 'jobask', block: '02', lot: '2-14 2-15', detail: 'Kerja lain: RMF Baiki jalan ladang · Blk 02 · 2 orang', staff_note: 'Jalan Blok 02 rosak lepas hujan', ref: 'MC-T' });
const m1 = as(mg, 'todo'), ja = m1.items.find(x => x.id === 'JA:JA1');
check('office: the Pengurus gets "Kerja lain" with the reason and LULUS / TOLAK', ja && ja.go === 'jobok' && ja.ref === 'JA1' && /RMF Baiki jalan ladang/.test(ja.bm) && /rosak lepas hujan/.test(ja.sub) && /LULUS \/ TOLAK/.test(ja.sub), JSON.stringify(ja));
check('office: not shown as a generic "Beri arahan" line', !m1.items.some(x => x.id === 'DI:JA1'));
check('office: the staff cannot answer', as(f, 'todoDirect', { ref: 'JA1', direction: 'LULUS' }).error === 'not_allowed');
const d1 = as(mg, 'todoDirect', { ref: 'JA1', direction: 'LULUS' });
check('office: the Pengurus approves (LULUS)', d1.ok && !d1.items.some(x => x.id === 'JA:JA1'), JSON.stringify(d1).slice(0, 200));
const st = as(f, 'todo').items.find(x => /^DR:/.test(x.id) && /LULUS/.test(x.bm));
check('office: the staff sees it was approved, with the job', st && /RMF Baiki jalan ladang/.test(st.bm) && st.p === 4, JSON.stringify(st));
check('office: answering twice is refused', as(mg, 'todoDirect', { ref: 'JA1', direction: 'TOLAK: x' }).error === 'nothing_waiting' || as(mg, 'todoDirect', { ref: 'JA1', direction: 'TOLAK: x' }).error === 'already');
addRow('FH_ALERT', { id: 'JA2', date: today, chit: 'MC-T', kind: 'jobask', block: '', lot: '', detail: 'Kerja lain: VMC Cuci kenderaan & jentera · 1 orang', staff_note: 'Lori kotor sangat', ref: 'MC-T' });
const d2 = as(mg, 'todoDirect', { ref: 'JA2', direction: 'TOLAK: Pemandu cuci sendiri' });
check('office: the Pengurus rejects with why (TOLAK)', d2.ok);
const ckl = as(ck, 'todo').items.find(x => x.id.startsWith('JR:'));
check('office: the clerk sees the rejection, to settle pay at month end', ckl && /VMC/.test(ckl.bm) && /Pemandu cuci sendiri/.test(ckl.sub) && /gaji/.test(ckl.sub), JSON.stringify(ckl));
check('office: the staff sees the rejection (amber)', as(f, 'todo').items.some(x => /^DR:/.test(x.id) && /TOLAK/.test(x.bm) && x.p === 2));
addRow('FH_ALERT', { id: 'JA3', date: ago(3), keyed_at: ago(3) + ' 07:00', chit: 'MC-O', kind: 'jobask', detail: 'Kerja lain: CSR Bina jalan · 3 orang', staff_note: 'Jalan baru ke ramp', ref: 'MC-O' });
check('office: not answered in 2 days shows on the Owner\'s list', as(own, 'todo').items.some(x => x.id.startsWith('SJ:') && /1 kerja lain/.test(x.bm)));

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', at: today + ' 07:00', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate((t) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'W1', name: 'Pekerja Contoh Satu', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'M' }, { id: 'W2', name: 'Pekerja Contoh Dua', estate: 'SSGT', gang: 'Pemandu · Driver', sex: 'M' },
      { id: 'W3', name: 'Pekerja Durian Contoh', estate: 'SSGT', gang: 'Ladang durian · Durian farm', sex: 'F' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: t, estate: 'SSGT', jobs: [], marks: {}, jobOf: {}, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 1, alertNotes: {} } }));
  }, today);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForSelector('#fh-addjob'); await p.waitForTimeout(600);
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  const quick = await p.$$eval('#jb-quick [data-quick]', a => a.map(x => x.dataset.quick));
  check('phone: the shortcut buttons are the 8 daily jobs (HA, ITF, LFF, LF, DF, MDR, CA, WM)', quick.join(' ') === 'HA ITF LFF LF DF MDR CA WM', quick.join(' '));
  const more = await p.$$eval('#jb-more [data-quick]', a => a.map(x => x.dataset.quick));
  check('phone: the other main jobs fold under "Kerja pusingan & lain" (closed): CPS VOPS MAN SL RP AP OP ETF', more.join(' ') === 'CPS VOPS MAN SL RP AP OP ETF' && !(await p.$eval('#jb-more', d => d.open)), more.join(' '));
  const others = await p.$$eval('#jb-task option', a => a.map(x => x.value).filter(Boolean));
  // v1.45: Sugut keeps only 21 other jobs (ticked by Yu Chen, 27 Oct); RMH and MT are off Sugut's list.
  check('phone: "Kerja lain" lists only Sugut\'s other jobs (21, incl. DEC SP OPF RMF)', others.length === 21 && ['RMF', 'DEC', 'SP', 'OPF'].every(c => others.includes(c)) && !others.includes('HA') && !others.includes('OPR') && !others.includes('MT') && !others.includes('RMH'), String(others.length));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v47-addjob.png', fullPage: true });
  // other work: needs a reason
  await p.selectOption('#jb-task', 'RMF'); await p.waitForTimeout(200);
  check('phone: other work shows the "why" box', await p.isVisible('#jb-whybox'));
  await p.click('#jb-save'); await p.waitForTimeout(200);
  check('phone: other work cannot be saved without a reason', (await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT.jobs.length)) === 0);
  await p.fill('#jb-why', 'Jalan Blok 02 rosak lepas hujan'); await p.click('#jb-save'); await p.waitForTimeout(300);
  let d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('phone: with a reason it goes on the chit at once, marked other work', d.jobs.length === 1 && d.jobs[0].task === 'RMF' && /rosak/.test(d.jobs[0].ask), JSON.stringify(d.jobs));
  check('phone: the job card says "menunggu lulus"', /menunggu lulus/.test(await p.innerText('#fh-jobs')));
  // operator: one "OP" button, then the machine and what the work is for (sets OPH / OPR / OPF)
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  await p.evaluate(() => { document.querySelector('#jb-more').open = true; }); await p.click('.jb-quick [data-quick="OP"]'); await p.waitForTimeout(200);
  check('phone: OP asks the machine (Farm tractor / Backhoe / Excavator) and what the work is for, no reason needed',
    await p.isVisible('#jb-machbox') && await p.isVisible('#jb-forbox') && await p.isHidden('#jb-whybox') && (await p.$$eval('#jb-mach [data-mach]', a => a.map(x => x.dataset.mach).join(' '))) === 'FARMTRACTOR BACKHOE EXCAVATOR');
  await p.click('#jb-save'); await p.waitForTimeout(200);
  check('phone: an operator cannot be saved without a machine', (await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT.jobs.length)) === 1);
  await p.click('#jb-mach [data-mach="EXCAVATOR"]'); await p.click('#jb-for [data-for="OPR"]'); await p.waitForTimeout(150);
  check('phone: "Jalan & parit" makes it OPR (Road upkeep) and asks the location (block, lots)', await p.evaluate(() => [EA.lists.sectionOf('OPR').code, EA.lists.sectionOf('OPH').code, EA.lists.sectionOf('OPF').code].join('')) === '312' && await p.isVisible('#jb-where') && await p.isHidden('#jb-whybox'));
  await p.click('#jb-save'); await p.waitForTimeout(200);
  check('phone: OPR cannot be saved without a location', (await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT.jobs.length)) === 1);
  await p.selectOption('#jb-block', '02'); await p.waitForTimeout(150);
  await p.click('#jb-mach [data-mach="EXCAVATOR"]'); await p.waitForTimeout(100);
  await p.click('#jb-lots .pick[data-lot="2-14"]'); await p.click('#jb-lots .pick[data-lot="2-15"]');
  await p.click('#jb-save'); await p.waitForTimeout(300);
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task'); await p.evaluate(() => { document.querySelector('#jb-more').open = true; });
  await p.click('.jb-quick [data-quick="OP"]'); await p.click('#jb-for [data-for="OPF"]'); await p.waitForTimeout(150);
  check('phone: OPF (field work by machine) now needs a reason (approval)', await p.isVisible('#jb-whybox'));
  await p.click('#jb-cancel'); await p.waitForTimeout(200);
  // workshop (machine support): needs a reason (not a Sugut main job) and the machine worked on, lorry and genset too
  // v1.45: MH is off Sugut's other-work list; let it back for this check only (workshop behaviour is shared by every estate)
  await p.evaluate(() => EA.lists.otherJobs.SSGT.push('MH'));
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task'); await p.selectOption('#jb-task', 'MH'); await p.waitForTimeout(200);
  check('phone: workshop (MH) asks the machine worked on (incl. lorry, genset) and a reason; under General · Bengkel',
    await p.isVisible('#jb-machbox') && await p.isHidden('#jb-forbox') && await p.isVisible('#jb-whybox') && (await p.$$eval('#jb-mach [data-mach]', a => a.map(x => x.dataset.mach).join(' '))) === 'FARMTRACTOR BACKHOE EXCAVATOR LORRY GENSET'
    && await p.evaluate(() => EA.lists.sectionOf('MH').code === '5' && EA.lists.partOf('MH').en === 'Workshop'));
  await p.click('#jb-cancel'); await p.waitForTimeout(200);
  await p.evaluate(() => { EA.lists.otherJobs.SSGT.pop(); });
  // durian farm: the durian block by itself
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task'); await p.click('#jb-quick [data-quick="DF"]'); await p.waitForTimeout(200);
  check('phone: DF takes the durian farm by itself (lots A / B / C)', (await p.inputValue('#jb-block')) === 'DR' && (await p.$$eval('#jb-block option', a => a.length)) === 1);
  await p.click('#jb-lots .pick[data-lot]'); await p.click('#jb-save'); await p.waitForTimeout(300);
  d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  const opr = d.jobs.find(j => j.task === 'OPR'), df = d.jobs.find(j => j.task === 'DF');
  check('phone: OPR saved with its machine and location (Blk 02, lots 2-14 2-15)', opr && opr.block === '02' && opr.lots.join(' ') === '2-14 2-15 EXCAVATOR' && !opr.ask, JSON.stringify(opr));
  check('phone: DF saved on the durian farm, no approval asked', df && df.block === 'DR' && !df.ask, JSON.stringify(df));
  check('phone: the operator\'s card names the machine', /Jentera Excavator|Machine Excavator/.test(await p.innerText('#fh-jobs')));
  // people on the jobs, then save the chit
  await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('fh.draft2')); const s = all.SSGT;
    const k = t => s.jobs.find(j => j.task === t).key; s.marks = { W1: 'H', W2: 'H', W3: 'H' }; s.jobOf = { W1: k('RMF'), W2: k('OPR'), W3: k('DF') };
    localStorage.setItem('fh.draft2', JSON.stringify(all)); });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(600);
  const w1 = await p.$$eval('#fh-rows .wrow', rs => { const r = rs.find(x => /Pekerja Contoh Satu/.test(x.innerText)); return [r.querySelectorAll('.pick[data-job]').length, !!r.querySelector('[data-chg]')]; });
  check('phone: after a job is picked only that job shows, with TUKAR', w1[0] === 1 && w1[1], JSON.stringify(w1));
  await p.evaluate(() => { const r = [...document.querySelectorAll('#fh-rows .wrow')].find(x => /Pekerja Contoh Satu/.test(x.innerText)); r.querySelector('[data-chg]').click(); });
  await p.waitForTimeout(200);
  const w2 = await p.$$eval('#fh-rows .wrow', rs => rs.find(x => /Pekerja Contoh Satu/.test(x.innerText)).querySelectorAll('.pick[data-job]').length);
  check('phone: TUKAR shows all the day\'s jobs again', w2 === 3, String(w2));
  for (const i of await p.$$('#fh-alerts [data-alert]')) await i.fill('ok');
  await p.click('#fh-check'); await p.waitForTimeout(300);
  if (await p.isVisible('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
  if (await p.isVisible('#cf-ok')) { await p.click('#cf-ok'); await p.waitForTimeout(500); }
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]'));
  const ask = q.filter(x => x.tab === 'FH_ALERT' && x.row.kind === 'jobask' && !/hari Ahad/.test(x.row.detail)).map(x => x.row);   // v1.39: a Sunday request is tested in v50
  check('phone: saving the chit sends one request for the other work, with the reason', ask.length === 1 && /RMF Baiki jalan ladang/.test(ask[0].detail) && /1 orang/.test(ask[0].detail) && /rosak/.test(ask[0].staff_note), JSON.stringify(ask));
  const opRow = q.find(x => x.tab === 'FH_MUSTER' && x.row.worker_id === 'W2');
  check('phone: the operator\'s muster line carries the machine and the location', opRow && opRow.row.task_code === 'OPR' && opRow.row.block === '02' && opRow.row.lots === '2-14 2-15 EXCAVATOR', JSON.stringify(opRow && opRow.row));
  const txt = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('fh.chits2')).slice(-1)[0]; return EA.fh.chitText(c); });
  check('phone: the WhatsApp chit lists the other work with the reason, and the machine', /Kerja lain \(minta lulus\): RMF/.test(txt) && /OPR jentera: Excavator · Blk 02 petak 2-14, 2-15/.test(txt) && /3\. Road upkeep/.test(txt) && /4\. Durian farm/.test(txt), txt.slice(-400));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
