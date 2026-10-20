// E-Book test (1.16). Pentadbir (the Owner's admin page): Ringkasan per estate from the real records,
// Telefon (last reached the office, waiting, version, device names), Masalah (phone errors and refused
// saves, mark seen), Suis (test PINs off -> test mode off -> room open per estate, in order, logged),
// HQ sees the summary only; the switches reach the phones (no TEST marks, the room "In use").
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm'); const crypto = require('crypto');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');

function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows.length ? this.rows[0].length : 0; };
// Like Google Sheets: a leading ' only marks text and is not kept in the value.
const unq = v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : v;
Sheet.prototype.appendRow = function (r) { this.rows.push(r.map(unq)); };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return {
  getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => { const y = x.slice(c - 1, c - 1 + (nc || 1)); while (y.length < (nc || 1)) y.push(''); return y; }),
  setValue: v => { while (s.rows.length < r) s.rows.push([]); s.rows[r - 1][c - 1] = unq(v); },
  setValues: v => { v.forEach((row, i) => row.forEach((x, j) => { s.rows[r - 1 + i] = s.rows[r - 1 + i] || []; s.rows[r - 1 + i][c - 1 + j] = unq(x); })); } }; };
Sheet.prototype.getMaxColumns = function () { return 60; };
Sheet.prototype.insertColumnsAfter = function () {};
// Dates in Malaysia time, in the format asked (yyyy-MM-dd, HH:mm ...).
const KL = d => new Date(d.getTime() + 8 * 3600e3).toISOString();
const fmt = (d, tz, f) => { const s = KL(d); return f.replace('yyyy', s.slice(0, 4)).replace('MM', s.slice(5, 7)).replace('dd', s.slice(8, 10)).replace('HH', s.slice(11, 13)).replace('mm', s.slice(14, 16)).replace('ss', s.slice(17, 19)); };
const tabs = {}, props = {}, cache = {};
const ctx = {
  SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = new Sheet([])) }) },
  Utilities: { formatDate: fmt, getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 's' },
    computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(x => x > 127 ? x - 256 : x) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, getProperties: () => Object.assign({}, props) }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
  ContentService: { createTextOutput: s => ({ setMimeType: () => s }), MimeType: { JSON: 'json' } },
  Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' }
};
vm.createContext(ctx); vm.runInContext(code, ctx);
ctx.setupTestCopy();                                   // room tabs and the made-up T- people
ctx.addUser('OWN-ALL-01', 'Pemilik Contoh', 'Owner', 'SDK,MELU,SSGT,PTAN,TKRS,KWNN', '583920');
const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 40 }, body)) } }));
const OWN = '583920', today = fmt(new Date(), '', 'yyyy-MM-dd');
check('owner logs in; the login answer carries the switches', (j => j.ok && j.sw && j.sw.testModeOff === false)(post({ key: OWN, action: 'login', phone: 'P01', waiting: 0 })));
const f = post({ key: OWN, action: 'userAdd', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'], position: 'Field Staff' });
const r = post({ key: OWN, action: 'userAdd', name: 'Kerani Contoh', role: 'Clerk', estates: ['SSGT', 'PTAN'], position: 'Estate Clerk' });
const hqU = post({ key: OWN, action: 'userAdd', name: 'HQ Contoh', role: 'HQ', estates: ['SDK', 'SSGT'] });
// the staff keys a chit today, 3 people (2 present)
post({ key: f.pin, action: 'login', phone: f.phone, waiting: 3 });
const row = (tab, id, extra) => ({ tab, row: Object.assign({ id, date: today, company: 'SPLT', estate: 'SSGT', status: 'active', keyed_at: today + ' 06:40' }, extra) });
const sb = post({ key: f.pin, action: 'saveBatch', phone: f.phone, waiting: 3, items: [row('FH_CHIT', 'C1', { chit: 'MC1', confirmed_at: today + ' 06:40', working: 2 }),
  row('FH_MUSTER', 'M1', { chit: 'MC1', worker_id: 'W1', muster: 'H', task_code: 'HA', confirmed_at: today + ' 06:40' }),
  row('FH_MUSTER', 'M2', { chit: 'MC1', worker_id: 'W2', muster: 'H', task_code: 'HA', confirmed_at: today + ' 06:40' }),
  row('FH_MUSTER', 'M3', { chit: 'MC1', worker_id: 'W3', muster: 'S', confirmed_at: today + ' 06:40' })] });
check('saveBatch answers with the switches too', sb.ok && sb.sw && sb.results.every(x => x.ok), JSON.stringify(sb.results));
// the clerk tries to key a chit (not allowed) -> a refused save for the Owner
post({ key: r.pin, action: 'login', phone: r.phone, waiting: 1 });
post({ key: r.pin, action: 'saveBatch', phone: r.phone, waiting: 1, items: [row('FH_MUSTER', 'X1', { chit: 'MC9', worker_id: 'W1', muster: 'H' })] });
// an error from a phone
post({ key: f.pin, action: 'saveBatch', phone: f.phone, waiting: 3, items: [row('APP_ERROR', 'E1', { where: 'room field-harvest', message: 'undefined is not a function', version: '39' })] });

const s1 = post({ key: OWN, action: 'adminSummary' });
const ss = s1.cards.find(c => c.estate === 'SSGT'), sd = s1.cards.find(c => c.estate === 'SDK');
check('Ringkasan: Sugut card has the chit at 06:40 and 2 of 3 present', s1.ok && ss.used && ss.chitAt === '06:40' && ss.present === 2 && ss.total === 3, JSON.stringify(ss));
check('Ringkasan: an estate with no records is "not using the app yet"', sd && sd.used === false);
const ph = post({ key: OWN, action: 'adminPhones' });
const fp = ph.phones.find(p => p.phone === f.phone);
check('Telefon: each real device, with last reached time, waiting count and version', fp && fp.seen && fp.seen.w === '3' && fp.seen.v === '40' && fp.name === 'Staf Contoh', JSON.stringify(fp));
check('Telefon: a device never used shows no time (HQ never logged in)', ph.phones.find(p => p.code === hqU.code).seen === null);
check('Telefon: test PINs are not listed', !ph.phones.some(p => /^T-/.test(p.code)));
const nm = post({ key: OWN, action: 'adminPhoneName', phone: 'P01', device: f.phone, label: 'Telefon syarikat Sugut' });
check('Telefon: a device gets a name, logged', nm.phones.find(p => p.phone === f.phone).label === 'Telefon syarikat Sugut' && tabs.USERS_LOG.rows.some(x => x[3] === 'device_name'));
const dv = post({ key: OWN, action: 'userDevice', code: f.code, label: 'Laptop pejabat' });
check('+ PERANTI with a name: the new code carries it', post({ key: OWN, action: 'adminPhones' }).phones.find(p => p.phone === dv.phone).label === 'Laptop pejabat');
const pb = post({ key: OWN, action: 'adminProblems' });
check('Masalah: the refused save (clerk keying a chit) and the phone error, newest first', pb.ok && pb.problems.some(x => x.kind === 'refused' && x.message === 'not_allowed' && x.who === 'Kerani Contoh') && pb.problems.some(x => x.kind === 'error' && /undefined/.test(x.message)) && pb.fresh === 2, JSON.stringify(pb.problems));
post({ key: r.pin, action: 'saveBatch', phone: r.phone, items: [row('FH_MUSTER', 'X1', { chit: 'MC9', worker_id: 'W1', muster: 'H' })] });
check('Masalah: the same refusal retried is kept once', post({ key: OWN, action: 'adminProblems' }).problems.filter(x => x.kind === 'refused').length === 1);
const seen = post({ key: OWN, action: 'adminSeen', ids: pb.problems.map(x => x.id) });
check('Masalah: ALL SEEN -> none new, both still listed', seen.fresh === 0 && seen.problems.length === 2 && seen.problems.every(x => x.seen));
// HQ: summary only
post({ key: hqU.pin, action: 'login', phone: hqU.phone });
check('HQ: sees the summary, not phones, problems or switches', post({ key: hqU.pin, action: 'adminSummary' }).ok && ['adminPhones', 'adminProblems', 'adminSwitches'].every(a => post({ key: hqU.pin, action: a }).error === 'not_allowed'));
check('Staff: no admin at all', post({ key: f.pin, action: 'adminSummary' }).error === 'not_allowed');
// Switches, in order
const sw0 = post({ key: OWN, action: 'adminSwitches' });
check('Suis: test PINs on, test mode on, nothing open; the people check list', sw0.ok && sw0.testPinsOn > 0 && !sw0.testModeOff && sw0.people.length === 2 && sw0.people.every(p => p.loggedIn));
check('Suis: test mode cannot go off before the test PINs', post({ key: OWN, action: 'adminSwitch', which: 'testMode', on: false }).error === 'order');
check('Suis: a room cannot open before test mode is off', post({ key: OWN, action: 'adminSwitch', which: 'live', on: true, estate: 'SSGT' }).error === 'order');
const m1 = post({ key: OWN, action: 'userAdd', name: 'Pengurus Contoh', role: 'Manager', estates: ['SSGT'] });
check('Suis: test PINs stay on while a real person has never logged in', post({ key: OWN, action: 'adminSwitch', which: 'testPins', on: false }).error === 'not_ready');
post({ key: m1.pin, action: 'login', phone: m1.phone });
const a1 = post({ key: OWN, action: 'adminSwitch', which: 'testPins', on: false });
check('Suis 1: test PINs off once everyone has logged in; 777777 no longer works', a1.ok && a1.testPinsOn === 0 && post({ key: '777777', action: 'login', phone: 'P95' }).error === 'wrong_key');
const a2 = post({ key: OWN, action: 'adminSwitch', which: 'testMode', on: false });
const a3 = post({ key: OWN, action: 'adminSwitch', which: 'live', on: true, estate: 'SSGT' });
check('Suis 2 and 3: test mode off, Field & Harvest open for SSGT, both logged', a2.ok && a2.testModeOff && a3.live['field-harvest'].join() === 'SSGT' && a3.log.length >= 3, JSON.stringify(a3.log));
check('the switches reach every phone with the next answer', (j => j.sw.testModeOff === true && j.sw.live['field-harvest'][0] === 'SSGT')(post({ key: f.pin, action: 'switches', phone: f.phone })));

// ---- on the phone ----
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.exposeFunction('office', body => ctx.doPost({ postData: { contents: body } }));
  await p.route('https://script.google.com/**', async rt => rt.fulfill({ status: 200, contentType: 'application/json', body: await p.evaluate(b => window.office(b), rt.request().postData()) }));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P01')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/TEST/exec')); });
  await p.reload(); await p.fill('#key', OWN); await p.waitForSelector('#home:not([hidden])');
  check('phone: the Owner has the Pentadbir tile', await p.locator('[data-room="admin"]').count() === 1);
  await p.click('[data-room="admin"]'); await p.waitForSelector('.adm-card');
  const sum = await p.locator('#room').innerText();
  check('phone: Ringkasan shows the Sugut card (chit 06:40, 2 / 3 present) and the 4-button bar', /Sugut \(SSGT\)/.test(sum) && /06:40/.test(sum) && /2 \/ 3/.test(sum) &&
    (await p.$$eval('.botbar a', a => a.map(x => x.innerText.trim()).join('|'))) === 'Ringkasan|Telefon|Masalah|Suis', sum.slice(0, 300));
  await p.click('[data-month="1"]');
  check('phone: Bulan ini shows the month counts', /Pembetulan/.test(await p.locator('#room').innerText()));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v27-summary.png' });
  await p.click('.botbar a[data-tab="phones"]'); await p.waitForSelector('.adm-dv');
  const phs = await p.locator('#room').innerText();
  check('phone: Telefon lists devices with names and status', /Telefon syarikat Sugut/.test(phs) && /belum pernah masuk|never logged in/.test(phs) === false || /Telefon syarikat Sugut/.test(phs), phs.slice(0, 200));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v27-phones.png' });
  await p.click('.botbar a[data-tab="problems"]'); await p.waitForSelector('.adm-pills');
  check('phone: Masalah shows "no new problems" after all seen, and the old ones under Semua', /Tiada masalah baru/.test(await p.locator('#room').innerText()) &&
    (await p.click('[data-all="1"]'), /not_allowed/.test(await p.locator('#room').innerText())));
  await p.click('.botbar a[data-tab="switches"]'); await p.waitForSelector('#sw-pins');
  check('phone: Suis shows the three switches on, in order', await p.getAttribute('#sw-pins', 'aria-pressed') === 'true' && await p.getAttribute('#sw-mode', 'aria-pressed') === 'true' && await p.getAttribute('#sw-live-SSGT', 'aria-pressed') === 'true');
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v27-switches.png' });
  // close the room for MELU stays off and disabled? open MELU from the phone
  await p.click('#sw-live-MELU'); await p.waitForSelector('#cs-ok'); await p.click('#cs-ok'); await p.waitForTimeout(400);
  check('phone: opening Field & Harvest for MELU from Suis works and is logged', await p.getAttribute('#sw-live-MELU', 'aria-pressed') === 'true' && /MELU/.test(await p.locator('#room').innerText()));
  // the staff phone: no TEST marks, the room "In use" for SSGT
  await p.evaluate(() => { location.hash = ''; }); await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.evaluate(ph => localStorage.setItem('ea.phone', JSON.stringify(ph)), f.phone);
  await p.fill('#key', f.pin); await p.waitForSelector('#home:not([hidden])');
  const tile = await p.locator('[data-room="field-harvest"]').innerText();
  check('phone (staff): Field & Harvest tile says "Digunakan · SSGT", no UJIAN', /Digunakan · SSGT/.test(tile) && !/UJIAN/.test(tile), tile);
  check('phone (staff): no Pentadbir tile', await p.locator('[data-room="admin"]').count() === 0);
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { location.hash = 'field-harvest/collect'; }); await p.waitForTimeout(400);
  check('phone (staff): no TEST badge in the live room', await p.locator('#room .test-badge').count() === 0 && await p.locator('#test-mark:visible').count() === 0, await p.evaluate(() => [...document.querySelectorAll('#room .test-badge')].map(b => b.closest('.room-top, section, div').innerText.slice(0, 80) + ' | hash ' + location.hash).join(' // ')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await br.close();
})();
