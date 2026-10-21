// E-Book test (1.15). Positions (job titles) beside the app access; PINDAH (transfer) now or from a start date;
// TUKAR NAMA; the users log for one person; a mistake undone by changing it back (both lines kept).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm'); const crypto = require('crypto');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');

function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.appendRow = function (r) { this.rows.push(r.slice()); };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return {
  getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))),
  setValue: v => { s.rows[r - 1][c - 1] = v; } }; };

const tabs = {};
const props = {}; const cache = {};
const ctx = {
  SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = new Sheet([])) }) },
  Utilities: {
    formatDate: (d, tz, f) => { const s = new Date(d.getTime() + 8 * 3600e3).toISOString(); return f === 'yyyy-MM-dd' ? s.slice(0, 10) : s.slice(0, 16).replace('T', ' '); },
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(b => b > 127 ? b - 256 : b)
  },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
  ContentService: { createTextOutput: s => ({ setMimeType: () => s }), MimeType: { JSON: 'json' } },
  Session: { getScriptTimeZone: () => 'Etc/GMT' }
};
vm.createContext(ctx); vm.runInContext(code, ctx);



tabs.USERS = new Sheet([['user_code', 'name', 'role', 'estates', 'key_hash', 'status', 'added_at']]);
ctx.addUser('OWN-ALL-01', 'Pemilik Contoh', 'Owner', 'SDK,MELU,SSGT,PTAN,TKRS,KWNN', '583920');
const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 99 }, body)) } }));
const OWN = '583920';
post({ key: OWN, action: 'login', phone: 'P01' });
const iso = n => { const d = new Date(Date.now() + 8 * 3600e3 + n * 864e5); return d.toISOString().slice(0, 10); };

const r = post({ key: OWN, action: 'userAdd', name: 'Rai', role: 'Clerk', estates: ['SSGT', 'PTAN'], position: 'Estate Clerk' });
check('add with a position: kept and shown in the list', r.ok && r.users.find(u => u.code === r.code).position === 'Estate Clerk');
check('a made-up position is refused', post({ key: OWN, action: 'userAdd', name: 'Orang X', role: 'Staff', estates: ['SSGT'], position: 'Boss' }).error === 'bad_position');
const f = post({ key: OWN, action: 'userAdd', name: 'Fere Contoh', role: 'Staff', estates: ['SSGT'], position: 'Trainee Field Staff' });
const fp = f.phone;
// add an area by mistake, then undo
const a1 = post({ key: OWN, action: 'userSet', code: r.code, role: 'Clerk', estates: ['SSGT', 'PTAN', 'TKRS'] });
check('add an area: Ria gets TKRS, the position stays', a1.ok && a1.users.find(u => u.code === r.code).estates.join() === 'SSGT,PTAN,TKRS' && a1.users.find(u => u.code === r.code).position === 'Estate Clerk');
const a2 = post({ key: OWN, action: 'userSet', code: r.code, role: 'Clerk', estates: ['SSGT', 'PTAN'] });
const lg = post({ key: OWN, action: 'userLog', code: r.code }).log;
check('undo the mistake: back to SSGT, PTAN, and both changes are in the log (newest first)', a2.ok && lg.filter(l => l.action === 'change').length === 2 && /TKRS → .*SSGT,PTAN$/.test(lg[0].detail) && /→ .*SSGT,PTAN,TKRS$/.test(lg[1].detail), JSON.stringify(lg.slice(0, 2)));
// name
check('TUKAR NAMA: Rai → Ria, logged; same name refused', post({ key: OWN, action: 'userName', code: r.code, name: 'Ria' }).users.find(u => u.code === r.code).name === 'Ria' &&
  post({ key: OWN, action: 'userLog', code: r.code }).log[0].detail === 'Rai → Ria' && post({ key: OWN, action: 'userName', code: r.code, name: 'Ria' }).error === 'same_name');
check('after the name change the same PIN still logs in, with the new name', (j => j.ok && j.user.name === 'Ria')(post({ key: r.pin, action: 'login', phone: r.phone })));
// promotion
const pr = post({ key: OWN, action: 'userSet', code: f.code, role: 'Staff', estates: ['SSGT'], position: 'Field Staff' });
check('promotion: Trainee Field Staff → Field Staff, logged', pr.users.find(u => u.code === f.code).position === 'Field Staff' && /Trainee Field Staff · Staff · SSGT → Field Staff · Staff · SSGT/.test(post({ key: OWN, action: 'userLog', code: f.code }).log[0].detail));
// transfer from a future date
const mv = post({ key: OWN, action: 'userMove', code: f.code, estates: ['MELU'], date: iso(10) });
const fu = mv.users.find(u => u.code === f.code);
check('PINDAH from a later date: still SSGT now, the move waits with its date', mv.ok && fu.estates.join() === 'SSGT' && fu.move && fu.move.estates.join() === 'MELU' && fu.move.date === iso(10));
check('...the person still logs in on SSGT until then', (j => j.ok && j.user.estates.join() === 'SSGT')(post({ key: f.pin, action: 'login', phone: fp })));
check('...logged as "SSGT → MELU, mula <date>"', post({ key: OWN, action: 'userLog', code: f.code }).log[0].detail === 'SSGT → MELU, mula ' + iso(10));
// the start date arrives (pretend: the waiting date set to today)
const row = tabs.USERS.rows.find(x => x[0] === f.code), head = tabs.USERS.rows[0];
row[head.indexOf('move_date')] = "'" + iso(0); Object.keys(cache).forEach(k => delete cache[k]);
check('on the start date: the person is at MELU, same PIN and phone code', (j => j.ok && j.user.estates.join() === 'MELU')(post({ key: f.pin, action: 'login', phone: fp })) &&
  !post({ key: OWN, action: 'users' }).users.find(u => u.code === f.code).move);
// transfer today with a new position
const mv2 = post({ key: OWN, action: 'userMove', code: r.code, estates: ['KWNN'], date: iso(0), position: 'Senior Staff' });
check('PINDAH today: estates change at once, the new position too, user code unchanged', mv2.ok && (u => u.estates.join() === 'KWNN' && u.position === 'Senior Staff' && u.code === r.code)(mv2.users.find(u => u.code === r.code)));
check('PINDAH to the same place without a date is refused', post({ key: OWN, action: 'userMove', code: r.code, estates: ['KWNN'], date: 'x' }).error === 'bad_date');
check('only the Owner may transfer or rename', post({ key: f.pin, action: 'userMove', code: r.code, estates: ['SSGT'], date: iso(0) }).error === 'not_allowed' && post({ key: f.pin, action: 'userName', code: r.code, name: 'Xy' }).error === 'not_allowed');

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
  await p.click('[data-room="users"]'); await p.waitForSelector('#us-add');
  await p.click('#us-add'); await p.waitForSelector('#us-pos');
  await p.click('[data-pos="Senior Assistant Manager"]');
  check('phone: picking Sr Assistant Manager ticks Pengurus by itself', await p.getAttribute('[data-role="Manager"]', 'aria-pressed') === 'true');
  await p.click('[data-pos="Estate Clerk"]');
  check('phone: picking Estate Clerk ticks Kerani', await p.getAttribute('[data-role="Clerk"]', 'aria-pressed') === 'true');
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v26-add.png', fullPage: true });
  await p.click('#us-cancel');
  check('phone: the list shows the position, not only the access', /Field Staff · MELU/.test(await p.locator('[data-user="' + f.code + '"]').innerText()));
  await p.click('[data-user="' + f.code + '"]'); await p.waitForSelector('#ps-move');
  await p.waitForSelector('.us-logline');
  check('phone: the person sheet has PINDAH and TUKAR NAMA, and the users log', await p.locator('#ps-name').count() === 1 && /Pindah: SSGT → MELU/.test(await p.locator('#ps-log').innerText()));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v26-person.png' });
  await p.click('#ps-move'); await p.waitForSelector('#mv-ests');
  await p.click('[data-mest="PTAN"]');
  await p.fill('#mv-date', (() => { const d = new Date(Date.now() + 5 * 864e5); return d.toISOString().slice(0, 10); })()); await p.dispatchEvent('#mv-date', 'change');
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v26-move.png' });
  await p.click('#mv-go'); await p.waitForTimeout(400);
  check('phone: transfer saved; the list says "pindah ke PTAN" with the date', /pindah ke PTAN/.test(await p.locator('[data-user="' + f.code + '"]').innerText()));
  await p.click('[data-user="' + f.code + '"]'); await p.waitForSelector('#ps-name'); await p.click('#ps-name'); await p.waitForSelector('#nm-new');
  await p.fill('#nm-new', 'Ferezelly Contoh'); await p.click('#nm-ok'); await p.waitForTimeout(400);
  check('phone: TUKAR NAMA saves the new name', /Ferezelly Contoh/.test(await p.locator('[data-user="' + f.code + '"]').innerText()));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await br.close();
})();
