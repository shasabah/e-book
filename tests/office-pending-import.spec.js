// E-Book test (1.109). Office script. Yu Chen, 26 Nov 2026, the Meliau clerk's phone in Latihan: "The alert in the
// pratice mode make confuse" — 31 "Menunggu Pengurus lebih 2 hari: CARLES…" lines, all "ingatkan Encik Samsir".
// - a worker loaded from an old book (keyed_by IMPORT) is history: never waiting for the Pengurus;
// - a worker the clerk keys still waits, as before, and an approval still ends the wait;
// - the names on a to-do line follow the estate's own people: Encik Samsir and Ferezelly at Sugut, the plain
//   position at Meliau (no Pengurus or Staf bertugas login there).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const ctx = { console, Utilities: { formatDate: () => '2026-11-26' }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' } };
vm.createContext(ctx); vm.runInContext(code, ctx);
let rows = [
  { worker_id: 'MELUB261101', kind: 'new', day: '2026-01-01', keyed_by: 'IMPORT', keyed_at: '2026-11-19 09:20', name: 'CARLES' },
  { worker_id: 'MELUB261102', kind: 'new', day: '2026-01-01', keyed_by: 'IMPORT', keyed_at: '2026-11-19 09:20', name: 'DIMAS' },
  { worker_id: 'MELU261120', kind: 'new', day: '2026-11-20', keyed_by: 'CLK-MELU-01', keyed_at: '2026-11-20 08:00', name: 'Baru' },
  { worker_id: 'MELU261121', kind: 'new', day: '2026-11-20', keyed_by: 'CLK-MELU-01', keyed_at: '2026-11-20 08:00', name: 'Lulus' },
  { worker_id: 'MELU261121', kind: 'approved', day: '', keyed_by: 'OWN-ALL-01', keyed_at: '2026-11-21 08:00', name: 'Lulus' }
];
ctx.workerRows_ = () => rows;
const st = ctx.workerStates_('MELU');
check('an imported worker (old book) is not waiting for the Pengurus', !st.MELUB261101.pending && !st.MELUB261102.pending, JSON.stringify(st.MELUB261101));
check('an imported worker keeps his start day and no waiting state', st.MELUB261101.start === '2026-01-01' && st.MELUB261101.kind === '');
check('a worker keyed by the clerk still waits for the Pengurus', st.MELU261120.pending === true && st.MELU261120.kind === 'new');
check('an approval still ends the wait', st.MELU261121.pending === false);
check('an imported worker who is later marked absconded waits for the Pengurus as before',
  (rows.push({ worker_id: 'MELUB261101', kind: 'absconded', day: '2026-11-25', keyed_by: 'CLK-MELU-01', keyed_at: '2026-11-25 08:00' }), ctx.workerStates_('MELU').MELUB261101.pending === true));
// names follow the estate's people
ctx.readUsers_ = () => ({ list: [
  { user_code: 'MGR-SSGT-01', name: 'Samsir Hidayat Bin Mahmur', role: 'Manager', estates: 'SSGT,PTAN', status: 'active' },
  { user_code: 'STF-SSGT-01', name: 'Ferezelly Bin Ali', role: 'Staff', estates: 'SSGT', status: 'active' },
  { user_code: 'T-MGR', name: 'Pengurus Ujian', role: 'Manager', estates: 'SSGT,PTAN,MELU', status: 'active' },
  { user_code: 'CLK-MELU-01', name: 'Siti Noraizah Binti Orong', role: 'Clerk', estates: 'MELU', status: 'active' },
  { user_code: 'MGR-KWNN-01', name: 'Off Person', role: 'Manager', estates: 'KWNN', status: 'off' }] });
let p = ctx.estPeople_('SSGT');
check('Sugut keeps its names: Encik Samsir and Ferezelly', p.mgr === 'Encik Samsir' && p.staff === 'Ferezelly', JSON.stringify(p));
check('Paitan: Encik Samsir', ctx.estPeople_('PTAN').mgr === 'Encik Samsir');
p = ctx.estPeople_('MELU');
check('Meliau (no Pengurus, test IDs ignored): the plain position, never Samsir', p.mgr === 'Pengurus' && p.staff === 'Staf bertugas', JSON.stringify(p));
check('a switched-off login is not named', ctx.estPeople_('KWNN').mgr === 'Pengurus');
check('no line of the to-do list names Samsir or Ferezelly by hand any more',
  !/'[^']*(Encik Samsir|Ferezelly,)[^']*'/.test(code.slice(code.indexOf('function todo_('), code.indexOf('function todo_(') + 40000).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')));
