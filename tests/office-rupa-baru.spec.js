// E-Book test (1.92) Rupa Baru tick list, office script. The Owner's list of who may try the new look is kept in the
// trial switches and sent to every phone; only real, active logins can be on it.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const props = {};
const ctx = { console, Utilities: { formatDate: () => '2026-11-24' }, SpreadsheetApp: {}, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, getProperties: () => props }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }, ContentService: {}, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx);
ctx.readUsers_ = () => ({ list: [
  { user_code: 'OWN-ALL-01', role: 'Owner', status: 'active' }, { user_code: 'HQ-SDK-01', role: 'HQ', status: 'active' },
  { user_code: 'STF-SSGT-01', role: 'Staff', status: 'active' }, { user_code: 'STF-PTAN-01', role: 'Staff', status: 'off' },
  { user_code: 'T-OWN', role: 'Owner', status: 'active' }, { user_code: 'L-STF-SSGT-01', role: 'Staff', status: 'active' }] });
ctx.logUser_ = () => {}; ctx.adminSwitches_ = () => ({ ok: true, rupaBaru: ctx.switches_().rupaBaru });
check('before any tick the list is empty, and it goes to every phone with the switches', Array.isArray(ctx.switches_().rupaBaru) && ctx.switches_().rupaBaru.length === 0);
const j = ctx.adminSwitch_({ user_code: 'OWN-ALL-01', role: 'Owner' }, { which: 'rupaBaru', codes: ['HQ-SDK-01', 'STF-SSGT-01', 'STF-PTAN-01', 'T-OWN', 'L-STF-SSGT-01', 'NOBODY', 'HQ-SDK-01'] });
check('only real, active logins are kept (no switched-off, test, practice or unknown code; no twice)', j.ok && j.rupaBaru.join(',') === 'HQ-SDK-01,STF-SSGT-01', JSON.stringify(j));
check('the list is what every phone now receives', ctx.switches_().rupaBaru.join(',') === 'HQ-SDK-01,STF-SSGT-01');
check('the other switches are untouched', ctx.switches_().testModeOff === false && JSON.stringify(ctx.switches_().live) === '{}');
check('an empty list takes everyone off again', ctx.adminSwitch_({ role: 'Owner' }, { which: 'rupaBaru', codes: [] }).rupaBaru.length === 0);
check('changing it is the Owner\'s alone (adminSwitch is behind the Owner check)', /if \(!owner\) return \{ ok: false, error: 'not_allowed' \};[\s\S]*adminSwitch_\(user, req\)/.test(code));
check('and never from Latihan', /PRACTICE_ && \(\/\^\(admin\|user\)\//.test(code));
