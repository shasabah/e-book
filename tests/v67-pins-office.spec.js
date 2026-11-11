// E-Book test (1.53). Office script: LIHAT PIN for the Owner (his own PIN typed again; PINs made or changed from
// 1.53 kept in the script's own store, never in a sheet) and Tukar PIN saya for every real user. Made-up people.
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
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, getProperties: () => Object.assign({}, props) }) },
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

// v1.14: a login carries the phone code; here each person logs in on their own first code.
const ownPhone = key => { const u = ctx.findUser(key); return u ? (String(u.phones || '').split(',')[0] || 'P50') : 'P50'; };
const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 99 }, body.action === 'login' && !body.phone ? { phone: ownPhone(body.key) } : {}, body)) } }));


const own = post({ key: '111111', action: 'userAdd', name: 'Pemilik Contoh', role: 'Owner', estates: ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'] });
const OWN = own.pin;
const stf = post({ key: OWN, action: 'userAdd', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] });
const clk = post({ key: OWN, action: 'userAdd', name: 'Kerani Contoh', role: 'Clerk', estates: ['PTAN'] });
check('users made, each PIN shown once', stf.ok && clk.ok && /^\d{6}$/.test(stf.pin) && /^\d{6}$/.test(clk.pin));
check('no PIN is written in any sheet', !Object.values(tabs).some(t => JSON.stringify(t.rows).includes('"' + stf.pin + '"') || JSON.stringify(t.rows).includes('"' + clk.pin + '"')));
check('the PIN is kept in the script store', props['pin.' + stf.code] === stf.pin && props['pin.' + clk.code] === clk.pin);

// LIHAT PIN
check('Staff cannot see PINs', post({ key: stf.pin, action: 'userPins', pin: stf.pin }).error === 'not_allowed');
const bad = post({ key: OWN, action: 'userPins', pin: '000000' });
check('Owner with a wrong PIN typed again: refused and logged', bad.error === 'wrong_pin' && tabs.USERS_LOG.rows.some(r => r[3] === 'pins_wrong'));
const v = post({ key: OWN, action: 'userPins', pin: OWN });
const row = c => (v.pins || []).find(r => r.code === c) || {};
check('Owner sees the Staff and Clerk PINs', v.ok && row(stf.code).pin === stf.pin && row(clk.code).pin === clk.pin, JSON.stringify(v).slice(0, 300));
check('test users are not listed', !(v.pins || []).some(r => /^T-/.test(r.code)));
check('the view is logged', tabs.USERS_LOG.rows.some(r => r[3] === 'pins_viewed'));
// a PIN from before 1.53 (only scrambled): shown as empty
delete props['pin.' + clk.code];
const v2 = post({ key: OWN, action: 'userPins', pin: OWN });
check('a PIN made before 1.53 comes back empty ("PIN lama")', v2.ok && (v2.pins.find(r => r.code === clk.code) || {}).pin === '');
const np = post({ key: OWN, action: 'userPin', code: clk.code });
check('NEW PIN once: now it shows', np.ok && post({ key: OWN, action: 'userPins', pin: OWN }).pins.find(r => r.code === clk.code).pin === np.pin);

// Tukar PIN saya, every real user
check('an easy PIN is refused', post({ key: stf.pin, action: 'myPin', pin: '123456' }).error === 'pick_another');
check('a PIN someone else has: same answer', post({ key: stf.pin, action: 'myPin', pin: np.pin }).error === 'pick_another');
check('not 6 numbers: refused', post({ key: stf.pin, action: 'myPin', pin: '12a456' }).error === 'bad_pin');
check('a test PIN cannot change', post({ key: '777777', action: 'myPin', pin: '583920' }).error === 'test_user');
let mine = '583920'; if (mine === OWN || mine === np.pin) mine = '583921';
const ch = post({ key: stf.pin, action: 'myPin', pin: mine });
check('Staff changes his own PIN', ch.ok === true, JSON.stringify(ch));
check('the old PIN stops, the new one logs in', post({ key: stf.pin, action: 'login' }).error === 'wrong_key' && post({ key: mine, action: 'login', phone: stf.phone }).ok);
check('the Owner sees the new PIN; the change is logged', post({ key: OWN, action: 'userPins', pin: OWN }).pins.find(r => r.code === stf.code).pin === mine && tabs.USERS_LOG.rows.some(r => r[3] === 'own_pin_set' && r[4] === stf.code));
check('the same PIN again: told so', post({ key: mine, action: 'myPin', pin: mine }).error === 'same_pin');
