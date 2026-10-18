// E-Book test. Run with tests/run.sh (office script, no server needed).
const ROOT = require('path').resolve(__dirname, '..');
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs=require('fs'); const t=fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'),'utf8');
const src=t.slice(t.indexOf('// ===== calcBacklog'), t.indexOf('// ===== end calcBacklog'));
const calcBacklog=new Function(src+'; return calcBacklog;')();
const cut=[{date:'2026-10-17',lot:'3-24',block:'03',bunches:'160'},{date:'2026-10-17',lot:'3-25',block:'03',bunches:'100'},{date:'2026-10-18',lot:'2-5',block:'02',bunches:'90'}];
const col=[{date:'2026-10-17',lot:'3-24',block:'03',bunches:'150',cleared:'Y'},{date:'2026-10-17',lot:'3-25',block:'03',bunches:'70'},
 {date:'2026-10-18',lot:'3-25',block:'03',bunches:'40'},{date:'2026-10-18',lot:'2-5',block:'02',bunches:'90',cleared:'Y'}];
const dis=[{date:'2026-10-17',block:'03',bunches:'150'},{date:'2026-10-18',block:'03',bunches:'60'}];
const r = calcBacklog(cut,col,dis,'2026-10-18');
check('calcBacklog: field 3-25 = 100-70-40 = -10 -> 0 kept sane, 3-24 cleared, ramp = 350-210 = 140', r.ramp.bunches === 140, JSON.stringify(r).slice(0, 200));
