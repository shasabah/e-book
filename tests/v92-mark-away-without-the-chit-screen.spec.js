// E-Book test (1.82) marking a man away works from Kerja alone, without the chit screen being opened first.
//
// Ferezelly, 22 Nov 2026: "yang tidak hadir sy tick sebelum ne boleh submit skrg sudah tick tidak hadir
// diminta masukkan jumlah karung juga knpa yaa" — he ticked TIDAK HADIR on a Loose Fruit job and the app
// still demanded the bag count, again and again.
//
// Reproduced before touching anything, on his own shape of day: a Loose Fruit job, four men, two with no
// quantity. Tick T on both, press SAVE, and the app threw "Cannot read properties of undefined (reading
// 'estate')". The marks never reached the chit, so pressing SIMPAN brought the very same card back. A ring.
//
// Two faults, one on top of the other:
//
//   1. EA.fh.markAway read ctx.estate. ctx belongs to the CHIT screen and only exists once that screen has
//      been rendered. A man who opens the app and goes straight to Kerja — which is what everyone does —
//      had no ctx at all, so the first line threw before the try block and escaped as a page error.
//
//   2. With that fixed it still quietly returned false, because buildChit also wants ctx.user.code and
//      ctx.user.name, and a ctx carrying only the estate has no user. The catch swallowed it, so the app
//      said nothing at all — which is worse than the page error, not better.
//
// The file already had the pattern for this (EA.fh.pendingPlans): set ctx for the length of the call and
// put it back after. The estate comes from the chit, the user from EA.currentUser(). Nothing is guessed.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const b = await chromium.launch();
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

  const s = await p.evaluate(() => {
    const est = 'SSGT', mandor = (EA.lists.mandorsFor(est) || [])[0], all = EA.lists.workersFor(est) || [];
    const on = all.slice(0, 4), date = EA.today();
    // Loose Fruit, paid by the bag: his job, not a harvest one, so the unit is not bunches.
    const row = (w, i) => ({ id: 'r' + i, worker_id: w.id, muster: 'H', task_code: 'LF', block: '03', lots: '3-20', mandor: mandor.id, status: 'active' });
    const chit = { chit: 'MC-LF', date: date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rcLF',
      alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'LF', block: '03', lots: ['3-20'], mandor: mandor.id }],
      rows: [row(mandor, 99)].concat(on.map(row)) };
    localStorage.setItem('fh.chits2', JSON.stringify([chit]));
    localStorage.setItem('fh.dayclose', JSON.stringify([]));
    localStorage.setItem('fh.work', JSON.stringify([]));
    localStorage.setItem('ea.queue', JSON.stringify([]));
    return { away: [on[2].id, on[3].id], stay: [on[0].id, on[1].id] };
  });

  // Straight to Kerja. The chit screen is NEVER opened — that is the whole point.
  await p.evaluate(() => { location.hash = 'field-harvest/work'; });
  await p.waitForTimeout(1500);

  const direct = await p.evaluate(ids => {
    const res = EA.fh.markAway('MC-LF', ids.away.map(w => ({ worker: w, mark: 'T' })), 'SSGT');
    const live = JSON.parse(localStorage.getItem('fh.chits2')).find(c => c.chit === 'MC-LF');
    return { res: res, rev: live && live.rev,
      marks: live ? live.rows.filter(r => ids.away.indexOf(r.worker_id) >= 0).map(r => r.muster) : [],
      others: live ? live.rows.filter(r => ids.stay.indexOf(r.worker_id) >= 0).map(r => r.muster) : [] };
  }, s);
  check('the mark goes through with no chit screen ever opened', direct.res === true, JSON.stringify(direct));
  check('the chit gets a new version, nothing is overwritten (Rule 4)', direct.rev === 2, 'rev ' + direct.rev);
  check('both men are now T on the chit', direct.marks.join(',') === 'T,T', direct.marks.join(','));
  check('and the men who DID work are untouched', direct.others.join(',') === 'H,H', direct.others.join(','));
  check('no page errors — the old fault threw one here', errs.length === 0, errs.join(' | '));

  // An unknown chit must come back as a plain no, never an exception.
  const unknown = await p.evaluate(() => {
    try { return { res: EA.fh.markAway('MC-NOT-A-CHIT', [{ worker: 'W-X', mark: 'T' }], 'SSGT'), threw: false }; }
    catch (e) { return { res: null, threw: true }; }
  });
  check('an unknown chit is a quiet no, not a crash', unknown.threw === false && unknown.res === false, JSON.stringify(unknown));
  check('still no page errors', errs.length === 0, errs.join(' | '));
  await b.close();

  // The rule in the source.
  const ms = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
  const body = ms.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  check('markAway takes the estate from its caller', /EA\.fh\.markAway = function \(chitId, marks, estate\)/.test(body), 'signature');
  check('it no longer reads ctx.estate to find the chit',
    !/chits\(\)\.find\(function \(x\) \{ return x\.estate === ctx\.estate && x\.chit === chitId/.test(body), 'lookup');
  check('the chit lookup is inside the try, so nothing escapes as a page error',
    /try \{\s*\n\s*var c = chits\(\)\.find/.test(body), 'lookup inside try');
  check('the borrowed ctx carries the user as well as the estate',
    /ctx = Object\.assign\(\{ user: EA\.currentUser\(\) \}, ctx \|\| \{\}, \{ estate: c\.estate \}\);/.test(body), 'user + estate');
  check('and the real ctx is always put back', /finally \{ ctx = keepCtx; \}/.test(body), 'finally');
  const wk = fs.readFileSync(path.join(root, 'rooms', 'field', 'work.js'), 'utf8');
  check('Kerja passes its own estate in', /EA\.fh\.markAway\(chit\.chit, marks, ctx\.estate\)/.test(wk), 'work.js');
  const v = fs.readFileSync(path.join(root, 'core', 'version.js'), 'utf8');
  check('version 1.86 (134) or later', Number((v.match(/EA\.VERSION = (\d+)/) || [])[1]) >= 134 && /EA\.RELEASE = '1\.\d+'/.test(v), 'version');
})();
