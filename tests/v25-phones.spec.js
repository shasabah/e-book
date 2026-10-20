// E-Book test (1.14). Phone codes made with the PIN: the office gives P10 upward (never P90-P99), one more
// with + PERANTI, refuses a login on someone else's code, keeps a code already in use for a person with none,
// and test PINs are not checked. On the phone: the code shows beside the PIN and in the WhatsApp text,
// + PERANTI shows the new code, a wrong code gives the plain-word message, and a new code in Phone setup logs out.
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
    formatDate: (d) => d.toISOString().slice(0, 16).replace('T', ' '),
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
ctx.addUser('T-OWN', 'Pemilik Ujian', 'Owner', 'SDK,MELU,SSGT,PTAN,TKRS,KWNN', '111111');
ctx.addUser('T-STF', 'Staf Sugut', 'Staff', 'SSGT', '777777');
ctx.addUser('OWN-ALL-01', 'Pemilik Lama', 'Owner', 'SDK,MELU,SSGT,PTAN,TKRS,KWNN', '583920');   // made before v1.14: no codes
const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 99 }, body)) } }));
const OWN = '583920';

check('an Owner made before v1.14 keeps the code his phone has (P01), recorded as his', post({ key: OWN, action: 'login', phone: 'P01' }).ok &&
  post({ key: OWN, action: 'users' }).users.find(u => u.code === 'OWN-ALL-01').phones.join() === 'P01');
check('...and the same code logs in again', post({ key: OWN, action: 'login', phone: 'P01' }).ok);
check('...but a second device needs + PERANTI first (P02 refused)', post({ key: OWN, action: 'login', phone: 'P02' }).error === 'phone_not_yours');
const a = post({ key: OWN, action: 'userAdd', name: 'Ria Contoh', role: 'Clerk', estates: ['SSGT', 'PTAN'] });
const b = post({ key: OWN, action: 'userAdd', name: 'Fere Contoh', role: 'Staff', estates: ['SSGT'] });
check('add user: the office makes the phone code with the PIN, P10 then P11', a.ok && a.phone === 'P10' && b.phone === 'P11', a.phone + ' ' + b.phone);
check('the codes show in the list, and every add is logged with its code', a.users.length && b.users.find(u => u.code === b.code).phones.join() === 'P11' && tabs.USERS_LOG.rows.some(r => r[3] === 'add' && /P11/.test(r[6])));
check('Ria logs in on her own code P10', post({ key: a.pin, action: 'login', phone: 'P10' }).ok);
check('Ria on Fere\'s code P11 is refused, and told which code', (j => j.error === 'phone_not_yours' && j.phone === 'P11')(post({ key: a.pin, action: 'login', phone: 'P11' })));
check('Ria on a code nobody has (P40) is refused: she already has P10', post({ key: a.pin, action: 'login', phone: 'P40' }).error === 'phone_not_yours');
check('a login with no phone code is refused (no_phone)', post({ key: a.pin, action: 'login' }).error === 'no_phone');
const d = post({ key: OWN, action: 'userDevice', code: 'OWN-ALL-01' });
check('+ PERANTI: the Owner gets one more code (P12), the PIN stays the same', d.ok && d.phone === 'P12' && !('pin' in d) && post({ key: OWN, action: 'login', phone: 'P12' }).ok && post({ key: OWN, action: 'login', phone: 'P01' }).ok);
check('+ PERANTI is logged', tabs.USERS_LOG.rows.some(r => r[3] === 'device' && r[6] === 'P12'));
check('test PINs are not checked (any code)', post({ key: '777777', action: 'login', phone: 'P95' }).ok);
check('only the Owner may make device codes', post({ key: b.pin, action: 'userDevice', code: b.code }).error === 'not_allowed');
// P90-P99 are never given: fill up to P89, the next is P100
for (let i = 0; i < 77; i++) post({ key: OWN, action: 'userAdd', name: 'Orang ' + i, role: 'Worker', estates: ['SSGT'] });
const last = post({ key: OWN, action: 'userAdd', name: 'Orang akhir', role: 'Worker', estates: ['SSGT'] });
const all = last.users.flatMap(u => u.phones);
check('codes skip P90-P99 (kept for tests): after P89 comes P100', last.phone === 'P100' && !all.some(p => /^P9\d$/.test(p)) && new Set(all).size === all.length, last.phone);
check('switched off: no login on any of that person\'s codes', post({ key: OWN, action: 'userOff', code: a.code }).ok && post({ key: a.pin, action: 'login', phone: 'P10' }).error === 'wrong_key');

// ---- on the phone ----
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.exposeFunction('office', body => ctx.doPost({ postData: { contents: body } }));
  await p.route('https://script.google.com/**', async r => r.fulfill({ status: 200, contentType: 'application/json', body: await p.evaluate(b => window.office(b), r.request().postData()) }));
  await p.addInitScript(() => { window.open = (u) => { window.__opened = u; return null; }; });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P01')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/TEST/exec')); });
  await p.reload(); await p.fill('#key', OWN); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="users"]'); await p.waitForSelector('#us-add');
  const row = await p.locator('[data-user="OWN-ALL-01"]').innerText();
  check('phone: the list shows the Owner\'s devices P01 P12', /Peranti:[\s\S]*P01[\s\S]*P12/.test(row), row.replace(/\n/g, ' '));
  await p.click('#us-add'); await p.fill('#us-name', 'Samsir Contoh'); await p.click('[data-role="Manager"]'); await p.click('#us-go'); await p.waitForSelector('#us-phone');
  const ph = (await p.textContent('#us-phone')).trim(), pin = (await p.textContent('#us-pin')).replace(/\s/g, '');
  check('phone: new user shows PIN and KOD TELEFON side by side', /^P\d{2,3}$/.test(ph) && /^\d{6}$/.test(pin) && /KOD TELEFON/.test(await p.locator('.us-big').innerText()), ph);
  check('phone: the WhatsApp text has the code and where to type it', (await p.textContent('.us-pre')).includes('Kod telefon: ' + ph) && (await p.textContent('.us-pre')).includes('Tetapan telefon'));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v25-pin.png' });
  await p.click('#us-done'); await p.click('#dn-ok'); await p.waitForTimeout(300);
  await p.click('[data-user="OWN-ALL-01"]'); await p.waitForSelector('#ps-dev');
  await p.click('#ps-dev'); await p.waitForSelector('#dv-make'); await p.click('#dv-make'); await p.waitForSelector('#dv-code');
  const dv = (await p.textContent('#dv-code')).trim();
  check('phone: + PERANTI shows the new code with COPY and WHATSAPP', /^P\d{2,3}$/.test(dv) && await p.locator('#dv-copy').count() === 1 && await p.locator('#dv-wa').count() === 1, dv);
  await p.click('#dv-wa');
  check('phone: the device WhatsApp text carries the code, not the PIN or sending link', await p.evaluate(c => decodeURIComponent(window.__opened || '').includes(c) && !/583920|script\.google/.test(decodeURIComponent(window.__opened || '')), dv));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v25-device.png' });
  await p.click('#dv-close'); await p.waitForTimeout(200);
  // the new Manager tries to log in on the Owner's code P01
  await p.evaluate(() => { location.hash = ''; }); await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.fill('#key', pin); await p.waitForTimeout(800);
  const msg = await p.textContent('#login-msg');
  check('phone: a wrong code at login gives the plain-word message with the code', /Kod telefon P01 bukan milik anda/.test(msg) && await p.locator('#home:not([hidden])').count() === 0, msg);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v25-wrong.png' });
  // fix the code in Phone setup, then log in
  await p.click('#open-setup'); await p.fill('#set-phone', ph); await p.click('#set-save'); await p.waitForTimeout(800);
  await p.fill('#key', pin); await p.waitForSelector('#home:not([hidden])');
  check('phone: with the right code the Manager logs in', /Samsir Contoh/.test(await p.textContent('#who-name')));
  // changing the code while logged in logs the phone out
  await p.locator('#home [data-open-setup]:visible').first().click(); await p.fill('#set-phone', 'P40'); await p.click('#set-save'); await p.waitForTimeout(1200);
  check('phone: a new code in Phone setup logs the phone out', await p.locator('#login:not([hidden])').count() === 1 && await p.evaluate(() => !localStorage.getItem('ea.user') && !localStorage.getItem('ea.knownUsers')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await br.close();
})();
