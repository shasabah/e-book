// E-Book test (1.9). Pengguna & PIN on the phone, against the real office script (run here with a
// pretend sheet): first Owner from a test PIN, add a Staff, PIN shown once with copy and WhatsApp,
// new PIN, switch off, test PINs off; the word "PIN" on the login screen; English too.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const fs = require('fs'); const vm = require('vm'); const crypto = require('crypto');
const LINK = 'https://script.google.com/macros/s/TEST-LINK/exec';
(async () => {
  // ---- office, with a pretend sheet ----
  const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
  function Sheet(rows) { this.rows = rows; }
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
  Sheet.prototype.appendRow = function (r) { this.rows.push(r.slice()); };
  Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return {
    getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))),
    setValue: v => { s.rows[r - 1][c - 1] = v; } }; };
  const tabs = {}; const props = {}; const cache = {};
  const ctx = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = new Sheet([])) }) },
    Utilities: { formatDate: d => d.toISOString().slice(0, 16).replace('T', ' '), getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 's' },
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(b => b > 127 ? b - 256 : b) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { createTextOutput: s => ({ setMimeType: () => s }), MimeType: { JSON: 'json' } },
    Session: { getScriptTimeZone: () => 'Etc/GMT' }
  };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  tabs.USERS = new Sheet([['user_code', 'name', 'role', 'estates', 'key_hash', 'status', 'added_at']]);
  [['T-OWN', 'Pemilik Ujian', 'Owner', 'SDK,MELU,SSGT,PTAN,TKRS,KWNN', '111111'], ['T-STF', 'Staf Sugut', 'Staff', 'SSGT', '777777'],
   ['T-CLK', 'Kerani Sugut', 'Clerk', 'SSGT,PTAN', '333333']].forEach(p => ctx.addUser(p[0], p[1], p[2], p[3], p[4]));
  const office = body => ctx.doPost({ postData: { contents: body } });

  // ---- phone ----
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const opened = [];
  await p.route(LINK, route => route.fulfill({ status: 200, contentType: 'application/json', body: office(route.request().postData()) }));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(l => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P94')); localStorage.setItem('ea.sendLink', JSON.stringify(l)); }, LINK);
  await p.reload(); await p.waitForTimeout(300);
  const loginLabel = await p.textContent('label[for="key"]');
  check('login screen says "PIN 6 digit anda", not "kunci"', /PIN 6 digit anda/.test(loginLabel) && !/kunci/i.test(await p.locator('#login').innerText()), loginLabel);
  await p.fill('#key', '123459'); await p.waitForTimeout(400);
  check('a wrong PIN says "PIN tidak dikenali"', /PIN tidak dikenali/.test(await p.textContent('#login-msg')));

  // Staff sees no Users tile
  await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  check('Staff has no "Pengguna & PIN" tile', await p.locator('[data-room="users"]').count() === 0);
  await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');

  // Test Owner: first-Owner mode
  await p.fill('#key', '111111'); await p.waitForSelector('#home:not([hidden])');
  check('Owner sees the "Pengguna & PIN" tile', await p.locator('[data-room="users"]').count() === 1);
  await p.click('[data-room="users"]'); await p.waitForSelector('#us-first');
  check('test Owner sees "Langkah pertama" and no Add button', await p.locator('#us-add').count() === 0 && /Langkah pertama/.test(await p.locator('#room').innerText()));
  await p.click('#us-first'); await p.waitForSelector('#us-name');
  check('first Owner form: role Pemilik only, all 6 estates on', (await p.locator('#us-roles [data-role]').count()) === 1 && (await p.locator('#us-ests [aria-pressed="true"]').count()) === 6);
  await p.fill('#us-name', 'Pemilik Contoh'); await p.click('#us-go'); await p.waitForSelector('#us-pin');
  const pinText = (await p.textContent('#us-pin')).replace(/\s/g, '');
  check('the new Owner PIN is shown once, 6 digits, with the "log out and log in" step', /^\d{6}$/.test(pinText) && /KELUAR/.test(await p.locator('#room').innerText()), pinText);
  check('the PIN is not kept on the phone (not in local storage)', !(await p.evaluate(pin => JSON.stringify(localStorage).includes(pin), pinText)));
  await p.click('#us-done'); await p.click('#dn-ok'); await p.waitForTimeout(200);
  check('after DONE the PIN cannot be seen again', !(await p.locator('#room').innerText()).includes(pinText.slice(0, 3) + ' ' + pinText.slice(3)));
  await p.evaluate(() => { location.hash = ''; });
  await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');

  // Real Owner
  await p.fill('#key', pinText); await p.waitForSelector('#home:not([hidden])');
  check('log in with the new Owner PIN', /Pemilik Contoh/.test(await p.textContent('#who-name')));
  await p.click('[data-room="users"]'); await p.waitForSelector('#us-add');
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v19-list.png' });
  await p.click('#us-add'); await p.waitForSelector('#us-name');
  await p.fill('#us-name', 'Staf Contoh');
  await p.click('[data-role="Staff"]'); await p.waitForTimeout(100);
  const estOn = await p.$$eval('#us-ests [aria-pressed="true"]', a => a.map(x => x.dataset.est).join());
  check('Add user: estate starts as the one being looked at', estOn.length > 0, estOn);
  // keep Sugut only
  for (const e of estOn.split(',')) if (e !== 'SSGT') await p.click('[data-est="' + e + '"]');
  if (!estOn.includes('SSGT')) await p.click('[data-est="SSGT"]');
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v19-add.png' });
  await p.click('#us-go'); await p.waitForSelector('#us-pin');
  const staffPin = (await p.textContent('#us-pin')).replace(/\s/g, '');
  const msg = await p.textContent('.us-pre');
  check('Staff PIN shown with the WhatsApp message (name, PIN, app address, do-not-share line)', /Salam Staf Contoh/.test(msg) && msg.includes(staffPin) && /Jangan kongsi/.test(msg) && /localhost:8765\//.test(msg), msg);
  check('the message never carries the sending link', !msg.includes('script.google.com'));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v19-pin.png' });
  await p.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  await p.click('#us-wa'); await p.waitForTimeout(200);
  opened.push(...await p.evaluate(() => window.__opened));
  check('HANTAR KE WHATSAPP opens WhatsApp with the message', opened.some(u => u.startsWith('https://wa.me/?text=') && decodeURIComponent(u).includes(staffPin)), opened.join(' '));
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await p.click('#us-copy'); await p.waitForTimeout(300);
  check('SALIN says "Disalin"', /Disalin/.test(await p.textContent('#toast')));
  await p.click('#us-done'); await p.click('#dn-ok'); await p.waitForSelector('[data-user="STF-SSGT-01"]');
  check('the Staff is in the Sugut list as AKTIF', /Staf Contoh[\s\S]*AKTIF/.test(await p.locator('[data-user="STF-SSGT-01"]').innerText()));
  check('the office knows the Staff PIN', JSON.parse(office(JSON.stringify({ version: 99, key: staffPin, action: 'login' }))).ok);

  // New PIN
  await p.click('[data-user="STF-SSGT-01"]'); await p.click('#ps-pin'); await p.click('#cp-ok'); await p.waitForSelector('#us-pin');
  const staffPin2 = (await p.textContent('#us-pin')).replace(/\s/g, '');
  check('new PIN: different, the old one refused by the office', staffPin2 !== staffPin && JSON.parse(office(JSON.stringify({ version: 99, key: staffPin, action: 'login' }))).error === 'wrong_key');
  await p.click('#us-done'); await p.click('#dn-ok'); await p.waitForSelector('[data-user="STF-SSGT-01"]');

  // Switch off
  await p.click('[data-user="STF-SSGT-01"]'); await p.click('#ps-off'); await p.click('[data-why="telefon hilang"]'); await p.click('#off-ok'); await p.waitForTimeout(300);
  check('switched off: shown under "Akses ditutup", office refuses the PIN', /Akses ditutup[\s\S]*Staf Contoh/.test(await p.locator('#room').innerText()) && JSON.parse(office(JSON.stringify({ version: 99, key: staffPin2, action: 'login' }))).error === 'wrong_key');
  // Own row: no switch-off button
  await p.click('[data-user="OWN-ALL-01"]');
  check('own row has no SWITCH OFF', await p.locator('#ps-off').count() === 0);
  await p.click('#ps-close');

  // Test PINs off
  await p.click('#us-testoff'); await p.click('#to-ok'); await p.waitForTimeout(300);
  check('test PINs switched off: 3 off, 777777 refused', /3 PIN ujian ditutup/.test(await p.textContent('#toast')) && JSON.parse(office(JSON.stringify({ version: 99, key: '777777', action: 'login' }))).error === 'wrong_key');
  check('the test card now shows DITUTUP and no button', await p.locator('#us-testoff').count() === 0);

  // Own new PIN: the phone keeps working
  await p.click('[data-user="OWN-ALL-01"]'); await p.click('#ps-pin'); await p.click('#cp-ok'); await p.waitForSelector('#us-pin');
  const own2 = (await p.textContent('#us-pin')).replace(/\s/g, '');
  const kept = await p.evaluate(() => EA.currentUser().key);
  check('own new PIN: no WhatsApp button, this phone switched to the new PIN', await p.locator('#us-wa').count() === 0 && kept === own2);
  await p.click('#us-done'); await p.click('#dn-ok'); await p.waitForSelector('#us-add');
  check('the screen still loads with the new PIN', await p.locator('[data-user="OWN-ALL-01"]').count() === 1);

  // English
  await p.evaluate(() => EA.setLang('en')); await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100);
  await p.evaluate(() => { location.hash = 'users'; }); await p.waitForSelector('#us-add');
  const en = await p.locator('#room').innerText();
  check('English: "Users & PIN", "Add user", "Switched off", date as 19 Oct', /Users & PIN/.test(en) && /ADD USER/i.test(en) && /Switched off/.test(en) && /since \d+ [A-Z][a-z]{2} 20\d\d/.test(en), en.slice(0, 160));
  await p.evaluate(() => EA.setLang('bm'));

  // Leaving with a PIN on show forgets it
  await p.click('[data-user="OWN-ALL-01"]'); await p.click('#ps-pin'); await p.click('#cp-ok'); await p.waitForSelector('#us-pin');
  const own3 = (await p.textContent('#us-pin')).replace(/\s/g, '');
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100);
  await p.evaluate(() => { location.hash = 'users'; }); await p.waitForSelector('#us-add');
  check('leaving the screen hides a PIN on show for good', !(await p.locator('#room').innerText()).includes(own3.slice(0, 3)) || !(await p.locator('#us-pin').count()));

  // Log in the office: one line per change, no PIN in it
  const log = tabs.USERS_LOG.rows.slice(1).map(x => x[3]).join(',');
  check('office log: add, add, new_pin, off, test_off, new_pin, new_pin', log === 'add,add,new_pin,off,test_off,new_pin,new_pin', log);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
