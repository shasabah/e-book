// E-Book test (1.90) Latihan satu login, office script. A real login that sends practice:1 reads and writes only the
// practice book (the TEST sheet), gets the made-up workers, cannot change people, PINs, phones or switches, and is counted.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const props = {}, cache = {}, opened = [];
const book = { getSheetByName: () => null };
const ctx = { console, Utilities: { formatDate: (d, z, f) => f === 'HH:mm' ? '10:15' : f === 'yyyy-MM-dd' ? '2026-11-24' : '2026-11-24 10:15' },
  SpreadsheetApp: { openById: id => { opened.push(id); return book; } }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, getProperties: () => props }) },
  LockService: {}, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; } }) }, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx);
const real = { user_code: 'MGR-MELU-01', name: 'Penolong', role: 'Manager', estates: ['MELU'], status: 'active' };
let seen = null;
ctx.findUser = () => real;
ctx.phoneCheck_ = () => '';
ctx.readCached_ = (u, req) => { seen = { action: req.action, practice: ctx.PRACTICE_ }; return ctx.reply({ ok: true, out: ctx.doRead_(u, req) }); };
ctx.usersAction_ = () => ({ ok: true, did: 'users' });
ctx.adminAction_ = () => ({ ok: true, did: 'admin' });
ctx.myPin_ = () => ({ ok: true, did: 'pin' });
ctx.saveBatch = (u, items) => ({ ok: true, practice: ctx.PRACTICE_, results: items.map(it => ({ id: it.row.id, ok: true })) });
ctx.workerStates_ = () => ({});
const post = body => JSON.parse(ctx.doPost_({ postData: { contents: JSON.stringify(Object.assign({ key: '111111', version: 999, phone: 'P13' }, body)) } }).s);
let j = post({ action: 'people' });
check('a real login without the flag is real: its people list is not the practice one', seen && seen.practice === false && !(j.out && j.out.practice), JSON.stringify(j).slice(0, 120));
j = post({ action: 'people', latihan: 1 });
check('with practice:1 the same login reads the practice book and gets the made-up workers', seen.practice === true && j.out.practice === true && j.out.people.length === 0, JSON.stringify(j).slice(0, 120));
j = post({ action: 'saveBatch', latihan: 1, items: [{ tab: 'FH_MUSTER', row: { id: 'r1', date: '2026-11-24' } }, { tab: 'FH_MUSTER', row: { id: 'r2', date: '2026-11-24' } }] });
check('a practice send is saved in practice mode', j.ok && j.practice === true);
j = post({ action: 'saveBatch', items: [{ tab: 'FH_MUSTER', row: { id: 'r3', date: '2026-11-24' } }] });
check('the next send without the flag is real again (nothing carries over)', j.ok && j.practice === false);
['userAdd', 'userPin', 'adminSwitch', 'adminPhoneName', 'myPin', 'testOff'].forEach(a => {
  const x = post({ action: a, latihan: 1 });
  check(a + ' is refused in Latihan', !x.ok && x.error === 'not_in_practice', JSON.stringify(x));
});
check('outside Latihan the same actions still go through', post({ action: 'userAdd' }).did === 'users' && post({ action: 'myPin' }).did === 'pin');
check('a login is never practice, even with the flag', JSON.parse(ctx.doPost_({ postData: { contents: JSON.stringify({ action: 'login', key: '1', version: 999, phone: 'P13', latihan: 1 }) } }).s).user.practice === false);
const u = JSON.parse(props.PRAC_USE || '{}');
check('practice use is counted: calls, records and who', u.day === '2026-11-24' && u.req === 8 && u.rec === 2 && u.who['MGR-MELU-01'] === '10:15', JSON.stringify(u));
check('every call today is counted too (an estimate)', Number(cache['reqN:2026-11-24']) === 12, cache['reqN:2026-11-24']);
const pu = ctx.practiceUse_([real]);
check('the Telefon page gets the practice line: calls, all calls, records, names', pu.req === 8 && pu.all === 12 && pu.rec === 2 && pu.who[0].name === 'Penolong', JSON.stringify(pu));
check('a practice login (L-) is still practice with no flag', (ctx.PRACTICE_ = false, ctx.isPractice_({ user_code: 'L-STF-1' })) && !ctx.isPractice_({ user_code: 'MGR-MELU-01' }));
check('making a practice login (userAdd with practice:true) is still the Owner\'s job, not Latihan', post({ action: 'userAdd', practice: true }).did === 'users');
