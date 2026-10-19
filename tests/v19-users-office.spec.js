// E-Book test (1.9). Office script, no server needed: the Users & PIN actions.
// Owner only; test users may only make the first real Owner; random PIN shown once and kept
// scrambled; new PIN stops the old one; switch off / on; test PINs off; every change logged.
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

// USERS tab with the 7 made-up test people, made the same way as the test copy.
tabs.USERS = new Sheet([['user_code', 'name', 'role', 'estates', 'key_hash', 'status', 'added_at']]);
[['T-OWN', 'Pemilik Ujian', 'Owner', 'SDK,MELU,SSGT,PTAN,TKRS,KWNN', '111111'], ['T-HQ', 'Ali HQ', 'HQ', 'SDK,MELU,SSGT,PTAN,TKRS,KWNN', '222222'],
 ['T-CLK', 'Kerani Sugut', 'Clerk', 'SSGT,PTAN', '333333'], ['T-STF', 'Staf Sugut', 'Staff', 'SSGT', '777777']]
  .forEach(p => ctx.addUser(p[0], p[1], p[2], p[3], p[4]));

const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 99 }, body)) } }));

// 1. Only the Owner
check('a Staff PIN cannot open Users & PIN', post({ key: '777777', action: 'users' }).error === 'not_allowed');
check('an HQ PIN cannot open Users & PIN', post({ key: '222222', action: 'users' }).error === 'not_allowed');

// 2. Test Owner, before any real Owner: may list and make the first real Owner, nothing else
const l0 = post({ key: '111111', action: 'users' });
check('test Owner sees the list in "first Owner" mode, no scrambled PINs sent', l0.ok && l0.firstOwner === true && l0.users.length === 4 && !JSON.stringify(l0).includes('key_hash'), JSON.stringify(l0).slice(0, 200));
check('test Owner may not add a Staff before a real Owner exists', post({ key: '111111', action: 'userAdd', name: 'Pekerja X', role: 'Staff', estates: ['SSGT'] }).error === 'first_owner_only');
const own = post({ key: '111111', action: 'userAdd', name: 'Pemilik Contoh', role: 'Owner', estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'] });
check('first real Owner made: code OWN-ALL-01, a 6-digit PIN comes back once', own.ok && own.code === 'OWN-ALL-01' && /^\d{6}$/.test(own.pin), own.code + ' ' + own.pin);
check('the PIN is kept scrambled in the sheet, never as typed', !JSON.stringify(tabs.USERS.rows).includes('"' + own.pin + '"'));
check('test Owner is refused once a real Owner exists', post({ key: '111111', action: 'users' }).error === 'test_user');

// 3. Real Owner adds Staff and Clerk
const OWN = own.pin;
const login = post({ key: OWN, action: 'login' });
check('the new Owner PIN logs in', login.ok && login.user.role === 'Owner' && login.user.code === 'OWN-ALL-01');
const f = post({ key: OWN, action: 'userAdd', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] });
const r = post({ key: OWN, action: 'userAdd', name: 'Kerani Contoh', role: 'Clerk', estates: ['PTAN', 'SSGT'] });
check('codes made by role and estate: STF-SSGT-01, CLK-SSGT-01 (estates kept in list order)', f.code === 'STF-SSGT-01' && r.code === 'CLK-SSGT-01' && r.users.find(u => u.code === 'CLK-SSGT-01').estates.join(',') === 'SSGT,PTAN', f.code + ' ' + r.code);
check('every new PIN is different and not an easy one', new Set([OWN, f.pin, r.pin]).size === 3 && ![OWN, f.pin, r.pin].some(p => /^(\d)\1{5}$/.test(p) || p === '123456'));
const f2 = post({ key: OWN, action: 'userAdd', name: 'Staf Dua', role: 'Staff', estates: ['SSGT'] });
check('second Staff at Sugut gets STF-SSGT-02', f2.code === 'STF-SSGT-02');
check('the Staff PIN logs in with Sugut only', (j => j.ok && j.user.estates.join() === 'SSGT')(post({ key: f.pin, action: 'login' })));
check('bad name refused', post({ key: OWN, action: 'userAdd', name: 'X', role: 'Staff', estates: ['SSGT'] }).error === 'bad_name');
check('unknown estate refused', post({ key: OWN, action: 'userAdd', name: 'Someone', role: 'Staff', estates: ['XXXX'] }).error === 'bad_estates');
check('formula in a name is kept as text', (post({ key: OWN, action: 'userAdd', name: '=HYPERLINK("x")', role: 'Staff', estates: ['SSGT'] }), tabs.USERS.rows.some(x => String(x[1]).startsWith("'="))));

// 4. New PIN: the old one stops at once
const np = post({ key: OWN, action: 'userPin', code: 'STF-SSGT-01' });
check('new PIN for the Staff: a different 6 digits', np.ok && /^\d{6}$/.test(np.pin) && np.pin !== f.pin && np.self === false);
check('the old Staff PIN no longer works', post({ key: f.pin, action: 'login' }).error === 'wrong_key');
check('the new Staff PIN works', post({ key: np.pin, action: 'login' }).ok);
const mine = post({ key: OWN, action: 'userPin', code: 'OWN-ALL-01' });
check('the Owner can make his own new PIN (self flag set), and the new one works', mine.ok && mine.self === true && post({ key: mine.pin, action: 'login' }).ok && post({ key: OWN, action: 'login' }).error === 'wrong_key');
const OWN2 = mine.pin;

// 5. Change role / estates
const ch = post({ key: OWN2, action: 'userSet', code: 'CLK-SSGT-01', role: 'Clerk', estates: ['SSGT'] });
check('change the clerk to Sugut only: login shows SSGT only', ch.ok && post({ key: r.pin, action: 'login' }).user.estates.join() === 'SSGT');
check('the Owner cannot take the Owner role away from himself', post({ key: OWN2, action: 'userSet', code: 'OWN-ALL-01', role: 'HQ', estates: ['SDK'] }).error === 'not_self');

// 6. Switch off / on
check('switch off: the Staff can no longer log in', post({ key: OWN2, action: 'userOff', code: 'STF-SSGT-01', reason: 'telefon hilang' }).ok && post({ key: np.pin, action: 'login' }).error === 'wrong_key');
check('a new PIN is refused while switched off', post({ key: OWN2, action: 'userPin', code: 'STF-SSGT-01' }).error === 'user_off');
check('switch on again: the same PIN works again', post({ key: OWN2, action: 'userOn', code: 'STF-SSGT-01' }).ok && post({ key: np.pin, action: 'login' }).ok);
check('the Owner cannot switch himself off', post({ key: OWN2, action: 'userOff', code: 'OWN-ALL-01' }).error === 'not_self');
check('test users cannot be changed one by one (only all off together)', post({ key: OWN2, action: 'userOn', code: 'T-STF' }).error === 'test_user_row');

// 7. Test PINs off
const to = post({ key: OWN2, action: 'testOff' });
check('switch off all test PINs: 4 switched off, 777777 and 111111 refused, real PINs still work',
  to.ok && to.switchedOff === 4 && post({ key: '777777', action: 'login' }).error === 'wrong_key' && post({ key: '111111', action: 'login' }).error === 'wrong_key' && post({ key: OWN2, action: 'login' }).ok);
check('nothing deleted: every user row still in the sheet', tabs.USERS.rows.length === 1 + 4 + 5);

// 8. Record of every change
const log = tabs.USERS_LOG.rows;
const acts = log.slice(1).map(x => x[3]).join(',');
check('USERS_LOG has one line per change, with who did it', acts === 'add,add,add,add,add,new_pin,new_pin,change,off,on,test_off' && log[2][1] === 'OWN-ALL-01' && log[1][1] === 'T-OWN', acts);
check('no PIN is ever written in the log', !JSON.stringify(log).match(new RegExp([OWN, OWN2, f.pin, np.pin, r.pin].join('|'))));
