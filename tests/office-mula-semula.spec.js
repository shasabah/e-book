// E-Book test (1.97) MULA SEMULA LATIHAN, office script. Brief_Latihan_Satu_Login 1.2 §2b (signed by Yu Chen 24 Nov 2026,
// "sign reset"): only in Latihan; this person's own Field & Harvest practice rows, on his estates, each get a new row
// marked removed (nothing erased); other people's practice and other tabs are untouched. Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const ctx = { console, Utilities: { formatDate: () => '2026-11-24 22:00' }, SpreadsheetApp: {}, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, getProperties: () => ({}) }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) }, ContentService: {}, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx);
const HEAD = ['id', 'date', 'company', 'estate', 'keyed_by', 'keyed_at', 'phone', 'status', 'replaces', 'chit', 'lot', 'note', 'received_at'];
const mk = (id, est, by, extra) => Object.assign({ id, date: '2026-11-24', company: 'SPLT', estate: est, keyed_by: by, keyed_at: '2026-11-24 06:10', phone: 'P13', status: 'active', replaces: '', chit: 'MC-1', lot: '2-1', note: '', received_at: '' }, extra || {});
const sheet = rows => { const data = [HEAD].concat(rows.map(r => HEAD.map(c => r[c])));
  return { data, getLastRow: () => data.length, getLastColumn: () => HEAD.length,
    getRange: (r, c, nr, nc) => ({ getValues: () => data.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))), setValues: v => { v.forEach((x, i) => { data[r - 1 + i] = x; }); } }) }; };
const book = { FH_CHIT: sheet([mk('A1', 'SSGT', 'OWN-1'), mk('A2', 'SSGT', 'STF-2'), mk('A3', 'PTAN', 'OWN-1'), mk('A4', 'KWNN', 'OWN-1')]),
  FH_WORK: sheet([mk('W1', 'SSGT', 'OWN-1'), mk('W0', 'SSGT', 'OWN-1'), mk('W0b', 'SSGT', 'OWN-1', { replaces: 'W0' })]),
  LIST_PEOPLE: sheet([mk('P1', 'SSGT', 'OWN-1')]) };
ctx.book_ = () => ({ getSheetByName: n => book[n] || null });
const me = { user_code: 'OWN-1', role: 'Owner', estates: ['SSGT', 'PTAN'] };
vm.runInContext('PRACTICE_ = false;', ctx);
let r = ctx.latihanReset_(me);
check('outside Latihan it is refused and nothing is written', r.ok === false && r.error === 'only_in_practice' && book.FH_CHIT.data.length === 5, JSON.stringify(r));
vm.runInContext('PRACTICE_ = true;', ctx);
r = ctx.latihanReset_(me);
const rows = n => book[n].data.slice(1).map(x => { const o = {}; HEAD.forEach((c, i) => { o[c] = x[i]; }); return o; });
const rem = n => rows(n).filter(x => x.status === 'removed');
check('in Latihan: 4 rows marked removed (2 chits on his estates, 2 standing work rows)', r.ok && r.removed === 4, JSON.stringify(r));
check('each is a NEW row that replaces the old one (nothing erased): A1-X replaces A1, note "Mula semula Latihan"', rows('FH_CHIT').length === 6 && rem('FH_CHIT').some(x => x.id === 'A1-X' && x.replaces === 'A1' && x.note === 'Mula semula Latihan' && x.keyed_by === 'OWN-1'), JSON.stringify(rem('FH_CHIT')));
check('another person\'s practice row is untouched (A2)', !rem('FH_CHIT').some(x => x.replaces === 'A2'));
check('an estate that is not his is untouched (A4, KWNN)', !rem('FH_CHIT').some(x => x.replaces === 'A4'));
check('a row already replaced is not removed twice (W0)', !rem('FH_WORK').some(x => x.replaces === 'W0') && rem('FH_WORK').map(x => x.replaces).sort().join() === 'W0b,W1');
check('lot numbers stay text ("\'2-1"), so the sheet does not turn them into dates', rem('FH_CHIT')[0].lot === "'2-1");
check('only Field & Harvest tabs: the people list is untouched', book.LIST_PEOPLE.data.length === 2);
vm.runInContext('ROWS_MEMO_ = null;', ctx);
check('after it, he has no standing practice rows left on his estates', ctx.readRows_('FH_CHIT', 'SSGT').standing.map(x => x.id).join() === 'A2' && ctx.readRows_('FH_WORK', 'SSGT').standing.length === 0);
r = ctx.latihanReset_(me);
check('pressing it again removes nothing more', r.ok && r.removed === 0);
check('the action is answered before the "not in practice" guard, and never opens the real book', /if \(req\.action === 'latihanReset'\) return reply\(latihanReset_\(user\)\);/.test(code) && /if \(!PRACTICE_\) return \{ ok: false, error: 'only_in_practice' \};/.test(code));
