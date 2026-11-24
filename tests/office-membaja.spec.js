// E-Book test (1.94) Membaja, office script. Brief_Membaja_Rupa_Baru (signed 24 Nov 2026): the change of fertiliser or dose
// is the Owner's alone (LULUS / TOLAK); the Pengurus and HQ are told; the staff sees the answer and a LULUS carries the dose;
// the storekeeper (Clerk) sees today's "bawa" and the bags back. FH_MATERIAL is a room tab the staff may write.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const ctx = { console, Utilities: { formatDate: () => '2026-11-24 10:00' }, SpreadsheetApp: {}, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, getProperties: () => ({}) }) },
  LockService: {}, ContentService: {}, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx);
ctx.daysAgo_ = () => '2026-11-10';
const T = '2026-11-24';
const ask = { id: 'A1', date: T, keyed_by: 'STF-SSGT-01', keyed_at: T + ' 06:20', kind: 'doseask', block: '01', lot: '1-13 1-14', detail: 'Membaja Blk 01: Baja Contoh 2.5 kg → Baja Contoh 2 kg', staff_note: 'pokok muda', direction: '', ref: 'MC-1' };
const run = (role, alerts, mats) => { const items = []; ctx.standingRows_ = (tab) => tab === 'FH_MATERIAL' ? (mats || []) : []; ctx.manTodo_(alerts, 'SSGT', role, { 'STF-SSGT-01': 'Staf Contoh' }, o => items.push(o), T); return items; };
let it = run('Owner', [ask]);
check('the Owner gets the change to answer, LULUS / TOLAK (go jobok, icon BJ)', it.length === 1 && it[0].go === 'jobok' && it[0].ic === 'BJ' && it[0].ref === 'A1' && /sebab: pokok muda/.test(it[0].sub), JSON.stringify(it));
['Manager', 'HQ', 'Staff'].forEach(r => { const x = run(r, [ask]); check(r + ' is told it waits for the Owner, with no button', x.length === 1 && x[0].go === '' && /^Menunggu Pemilik/.test(x[0].bm), JSON.stringify(x)); });
check('the Clerk sees nothing of the ask', run('Clerk', [ask]).filter(x => x.ic === 'BJ').length === 0);
const ok = Object.assign({}, ask, { id: 'A2', direction: 'LULUS', direction_by: 'Pemilik', keyed_at: T + ' 09:00' });
it = run('Staff', [ok]);
check('after LULUS the staff sees "Diluluskan" and the new dose travels with it', it.length === 1 && /^Diluluskan/.test(it[0].bm) && it[0].dose.ok === true && it[0].dose.dose === 2 && it[0].dose.fert === 'Baja Contoh' && it[0].dose.chit === 'MC-1' && it[0].dose.block === '01', JSON.stringify(it));
it = run('Staff', [Object.assign({}, ok, { direction: 'TOLAK: ikut program' })]);
check('after TOLAK the staff sees "Ditolak" and no dose to use', it.length === 1 && /^Ditolak/.test(it[0].bm) && it[0].dose.ok === false);
check('the Owner has nothing left once he has answered', run('Owner', [ok]).filter(x => x.ic === 'BJ').length === 0);
const mats = [{ date: T, chit: 'MC-1', block: '01', kind: 'bawa', bags: 8, material: 'Baja Contoh', keyed_by: 'STF-SSGT-01', keyed_at: T + ' 06:20' }, { date: T, chit: 'MC-1', block: '01', kind: 'bawa', bags: 7, material: 'Baja Contoh', keyed_by: 'STF-SSGT-01', keyed_at: T + ' 06:20' }];
it = run('Clerk', [], mats);
check('the storekeeper (Clerk) sees today\'s bawa: 15 beg, who and when', it.length === 1 && /Bawa dari stor: Membaja Blk 01 · 15 beg Baja Contoh/.test(it[0].bm) && /Staf Contoh · 06:20 · pulang: selepas kerja petang/.test(it[0].sub), JSON.stringify(it));
it = run('Clerk', [], mats.concat([{ date: T, chit: 'MC-1', block: '01', kind: 'pulang', bags: 2, reason: '', keyed_by: 'STF-SSGT-01', keyed_at: T + ' 17:00' }]));
check('and in the evening, the bags back', /pulang 2 beg/.test(it[0].sub), it[0] && it[0].sub);
check('a Staff login does not get the store line', run('Staff', [], mats).length === 0);
check('FH_MATERIAL is a room tab with its columns', JSON.stringify(ctx.ROOM_TABS.FH_MATERIAL) === JSON.stringify(['chit', 'kind', 'task_code', 'block', 'lot', 'material', 'dose', 'bag_kg', 'bags', 'done', 'reason', 'note']));
check('the staff may write it (FH_ room tab), the clerk may not', ctx.canWrite_({ role: 'Staff' }, 'FH_MATERIAL') && !ctx.canWrite_({ role: 'Clerk' }, 'FH_MATERIAL'));
check('only the Owner answers a doseask (todoDirect_)', /if \(a\.kind === 'doseask' && user\.role !== 'Owner'\) return \{ ok: false, error: 'not_allowed' \};/.test(code));
check('doseask is not a "Beri arahan" explanation for the Pengurus', !/doseask: 1/.test(code));
check('todo_ calls manTodo_', /manTodo_\(alerts, est, r, un, add, today\);/.test(code));
