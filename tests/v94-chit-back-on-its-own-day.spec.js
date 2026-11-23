// E-Book test (1.89) a chit the phone holds under the wrong day goes back to its own day.
//
// Ferezelly, 23 Nov 2026, 20:14, closing Saturday 21 Nov: lines 4 to 7 green, "1 perkara belum lengkap",
// and nothing he could press to clear it. Yu Chen: "Ada satu pekara lagi belum".
//
// The tail of the fault fixed in 1.81. Before 1.81 a correction the staff started himself was filed under
// the day he MADE it. That landed in two places: the office row (repaired in the office on 21 Nov) and the
// phone's own copy of the chit, which nothing repaired. So his phone still held the 17 and 18 Nov chits
// under 21 Nov. The close for the 21st gathers every chit of the day, so the men present on the 17th and
// 18th were asked for a work line on the 21st.
//
// A chit's code carries its own day (MC-SSGT-P13-20261117-1). The phone reads the day from the code and
// puts the chit back. Nothing is guessed, and a code of any other shape is left alone.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

async function start(b) {
  const p = await b.newPage({ viewport: { width: 390, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload();
  await p.fill('#key', '111111');
  await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(600);
  return { p, errs };
}
// The day being closed is two days back. `stray` adds the two older chits, filed under that same day.
const seed = (p, stray) => p.evaluate(stray => {
  const est = 'SSGT', mandor = (EA.lists.mandorsFor(est) || [])[0], all = EA.lists.workersFor(est) || [];
  const code = d => 'MC-SSGT-P13-' + d.replace(/-/g, '') + '-1';
  const day = EA.dayAgo(2), d3 = EA.dayAgo(3), d4 = EA.dayAgo(4);
  const mk = (id, date, men, blk) => ({ chit: id, date: date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc' + id,
    alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
    jobs: [{ key: 'j1', task: 'HA', block: blk, lots: [blk === '02' ? '2-1' : '3-1'], mandor: mandor.id }],
    rows: men.map((w, i) => ({ id: id + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: blk, lots: blk === '02' ? '2-1' : '3-1', mandor: mandor.id, status: 'active' })) });
  const list = [mk(code(day), day, all.slice(0, 3), '02')];
  if (stray) {
    list.push(mk(code(d3), day, all.slice(3, 7), '03'));       // the 18th, held under the 21st
    list.push(mk(code(d4), day, all.slice(7, 12), '03'));      // the 17th, held under the 21st
    list.push(mk('MC-ODD-SHAPE', day, all.slice(12, 13), '03'));   // not a dated code: must be left alone
  }
  localStorage.setItem('fh.chits2', JSON.stringify(list));
  localStorage.setItem('fh.dayclose', JSON.stringify([]));
  localStorage.setItem('fh.work', JSON.stringify([]));
  localStorage.setItem('ea.queue', JSON.stringify([]));
  return { day, d3, d4, codes: [code(day), code(d3), code(d4)] };
}, stray);
const closeOf = (p, day) => p.evaluate(day => {
  const c = EA.fh.allChits().find(x => x.estate === 'SSGT' && x.date === day && /^MC-SSGT-P13-/.test(x.chit));
  const ck = EA.fh.dayclose.checks('SSGT', c, {});
  return JSON.stringify(ck.map(x => ({ n: x.n, ok: x.ok, label: x.label, sub: x.sub })));
}, day);
const open = async p => { await p.reload(); await p.waitForSelector('#home:not([hidden])'); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1500); };

(async () => {
  const b = await chromium.launch();

  // The day as it should look: only its own chit on the phone.
  const a = await start(b);
  const s0 = await seed(a.p, false); await open(a.p);
  const clean = await closeOf(a.p, s0.day);
  await a.p.close();

  // Ferezelly's phone: the same day, plus two older chits wrongly held under it.
  const t = await start(b);
  const s = await seed(t.p, true); await open(t.p);
  const held = await t.p.evaluate(() => JSON.parse(localStorage.getItem('fh.chits2')).map(c => ({ chit: c.chit, date: c.date })));
  const byCode = c => (held.find(x => x.chit === c) || {}).date;
  check('the chit of the 18th is back on its own day, in the phone\'s stored copy', byCode(s.codes[1]) === s.d3, byCode(s.codes[1]) + ' want ' + s.d3);
  check('the chit of the 17th is back on its own day', byCode(s.codes[2]) === s.d4, byCode(s.codes[2]) + ' want ' + s.d4);
  check('the day\'s own chit is not moved', byCode(s.codes[0]) === s.day, byCode(s.codes[0]));
  check('a code that carries no day is left exactly where it was', byCode('MC-ODD-SHAPE') === s.day, byCode('MC-ODD-SHAPE'));
  check('no chit is lost in the move (Rule 4)', held.length === 4, String(held.length));
  check('every row of a moved chit is still there', await t.p.evaluate(c => JSON.parse(localStorage.getItem('fh.chits2')).find(x => x.chit === c).rows.length, s.codes[2]) === 5, 'rows');

  // The close of the day no longer sees the other days' men. The odd one is taken off so the two phones match.
  await t.p.evaluate(() => { const l = JSON.parse(localStorage.getItem('fh.chits2')).filter(c => c.chit !== 'MC-ODD-SHAPE'); localStorage.setItem('fh.chits2', JSON.stringify(l)); });
  const after = await closeOf(t.p, s.day);
  check('the close asks for exactly what it asks on a phone that never had the fault', after === clean, after.slice(0, 220) + ' || ' + clean.slice(0, 220));
  const days = await t.p.evaluate(() => EA.fh.allChits().filter(c => c.estate === 'SSGT').map(c => c.date).sort().join(','));
  check('each of the three days now has its own chit', days === [s.d4, s.d3, s.day].join(','), days);
  check('no page errors', t.errs.length === 0, t.errs.join(' | '));
  await b.close();

  // ---------- the source ----------
  const ms = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
  check('the day is read from the chit\'s own code, never guessed', /var CHIT_DAY = \/\^MC-\.\+-\(\\d\{4\}\)\(\\d\{2\}\)\(\\d\{2\}\)-\\d\+\$\/;/.test(ms), 'CHIT_DAY');
  check('every reader of the chits goes through the repair', /function chits\(\) \{\s*\n\s*reDateChits\(\);/.test(ms), 'chits()');
  check('a phone that cannot repair still works', /catch \(e\) \{ \/\* a phone that cannot repair its copy still works as before \*\/ \}/.test(ms), 'catch');
  const v = fs.readFileSync(path.join(root, 'core', 'version.js'), 'utf8');
  check('version 1.89 (137) or later', Number((v.match(/EA\.VERSION = (\d+)/) || [])[1]) >= 137 && /EA\.RELEASE = '1\.\d+'/.test(v), 'version');
})();
