// E-Book test (1.95) Tuai & kutip, office script. Brief_Tuai_Kutip_Rupa_Baru (signed 24 Nov 2026): from the new look's
// lot-by-lot progress, Hari ini shows the last work day's lots (at the ramp, or still in the block, with why) for every
// position; a lot not harvested out is a line for the staff and the Pengurus, red from the second day; fruit still in the
// block keeps the 11 Nov lines, now naming each lot and its reason. Old-look days (no progress) give nothing new.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const ctx = { console, Utilities: { formatDate: () => '2026-11-24 10:00' }, SpreadsheetApp: {}, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, getProperties: () => ({}) }) },
  LockService: {}, ContentService: {}, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx);
ctx.daysAgo_ = () => '2026-11-10';
const D1 = '2026-11-23', D2 = '2026-11-24';
const job = (d, t, pr) => ({ date: d, task_code: t, block: '02', progress: pr });
let rows = [], field = [];
ctx.standingRows_ = tab => tab === 'FH_JOBDAY' ? rows : [];
ctx.backlog = () => ({ field: field, fieldTotal: field.reduce((a, x) => a + x.bunches, 0), ramp: { bunches: 139 } });
const run = (role, today) => { const it = []; ctx.tuaiTodo_('SSGT', role, o => it.push(o), today || D2); return it; };

rows = [job(D1, 'HA', ''), job(D1, 'ITF', '')];
check('an old-look day (no lot progress) gives nothing new', run('Staff').length === 0);

rows = [job(D2, 'HA', '2-1 siap, 2-2 belum (hujan)'), job(D2, 'ITF', '2-1 siap, 2-2 belum (traktor rosak), 2-3 tidak pergi (tak sempat)'), job(D2, 'LFF', '2-1 siap, 2-2 belum (traktor rosak), 2-3 tidak pergi (tak sempat)')];
field = [{ lot: '2-2', block: '02', bunches: 90, since: D2 }, { lot: '2-3', block: '02', bunches: 40, since: D1 }];
['Staff', 'Clerk', 'Manager', 'HQ', 'Owner'].forEach(r => {
  const tl = run(r).find(x => x.id === 'TL:' + D2);
  check(r + ' sees the day\'s lots: 2-1 at the ramp, 2-2 and 2-3 in the block with why, and the totals', !!tl &&
    /Blk 02 2-1: sampai ramp ✓/.test(tl.sub) && /Blk 02 2-2: DI BLOK 90 tandan \(traktor rosak\)/.test(tl.sub) && /Blk 02 2-3: DI BLOK 40 tandan \(tak sempat\)/.test(tl.sub) && /139 tandan di ramp menunggu lori, 130 di blok/.test(tl.sub), tl && tl.sub);
});
let st = run('Staff').filter(x => /^TH:/.test(x.id));
check('the staff: "Blk 02 petak 2-2 belum habis dituai · hujan", one line a lot, amber on the first day', st.length === 1 && /Blk 02 petak 2-2 belum habis dituai · hujan/.test(st[0].bm) && st[0].p === 2, JSON.stringify(st));
check('the Pengurus is told too; HQ and the Owner see it', run('Manager').some(x => /^TH:/.test(x.id) && x.p === 3) && run('HQ').some(x => /^TH:/.test(x.id)) && run('Owner').some(x => /^TH:/.test(x.id)));
check('the Clerk does not get the harvest line', !run('Clerk').some(x => /^TH:/.test(x.id)));
st = run('Staff', '2026-11-26').filter(x => /^TH:/.test(x.id));
const mg = run('Manager', '2026-11-26').filter(x => /^TH:/.test(x.id));
check('from the second day it is red for the staff and the Pengurus (he gives the direction)', st[0].p === 1 && mg[0].p === 1 && /beri arahan/.test(mg[0].sub) && /2 hari/.test(st[0].sub), JSON.stringify([st, mg]));
rows = rows.concat([job('2026-11-25', 'HA', '2-2 siap')]);
check('a later day that harvests the lot out closes it', !run('Staff', '2026-11-25').some(x => /^TH:/.test(x.id)));
const ts = ctx.tuaiState_('SSGT');
check('the tractor\'s open lots keep their reasons (for the fruit-in-the-block lines)', ts.open.COL['2-2'].why === 'traktor rosak' && ts.open.COL['2-3'].why === 'tak sempat' && !ts.open.COL['2-1'], JSON.stringify(ts.open.COL));
check('the 11 Nov fruit-in-the-block lines now name each lot and its reason', /colWhy\[String\(x\.lot\)\]/.test(code) && /'Blk ' \+ k \+ ' ' \+ o\[k\] \+ \(w\[k\] \? ' \(' \+ w\[k\]\.join\(', '\) \+ '\)' : ''\)/.test(code));
check('todo_ calls tuaiTodo_', /tuaiTodo_\(est, r, add, today\);/.test(code));
