// E-Book test (1.51.2). CPS and Membaja are on the top row of Tambah kerja for the rounds season
// (Yu Chen, 5 Nov 2026: "is CPS a main job to choose?" → move it up with MAN; Decisions Log 5 Nov).
// - Both are shortcut buttons, so the staff reaches them in one tap.
// - Both are still main jobs (no approval) and are no longer repeated in the folded "Kerja pusingan & lain".
// - The folded button still holds the rest of the round jobs (SL, RP, VOPS, AP, the operator button, ETF).
// - Harvesting stays first; nothing leaves the main-job list.
// Rule 8: no worker names in this test.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  const L = await p.evaluate(() => ({
    quick: EA.lists.quickJobsFor('SSGT'),
    more: EA.lists.moreJobsFor('SSGT'),
    main: EA.lists.mainJobs.SSGT,
    cpsMain: EA.lists.isMainJob('SSGT', 'CPS'),
    manMain: EA.lists.isMainJob('SSGT', 'MAN'),
    cpsOther: EA.lists.isOtherJob('SSGT', 'CPS'),
    sunday: EA.lists.sundayOk.indexOf('CPS') >= 0 && EA.lists.sundayOk.indexOf('MAN') >= 0
  }));
  check('CPS is a shortcut button on Tambah kerja', L.quick.indexOf('CPS') >= 0, L.quick.join(' '));
  check('Membaja is a shortcut button too', L.quick.indexOf('MAN') >= 0, L.quick.join(' '));
  check('harvesting is still the first button', L.quick[0] === 'HA', L.quick[0]);
  check('neither is repeated in the folded list', L.more.indexOf('CPS') < 0 && L.more.indexOf('MAN') < 0, L.more.join(' '));
  check('the folded list still holds the other round jobs', ['SL', 'RP', 'VOPS', 'AP', 'OP', 'ETF'].every(c => L.more.indexOf(c) >= 0), L.more.join(' '));
  check('both are still main jobs, so no approval is asked', L.cpsMain && L.manMain && !L.cpsOther);
  check('every shortcut is a main job of the estate', L.quick.every(c => L.main.indexOf(c) >= 0), L.quick.join(' '));
  check('the 17 main jobs are unchanged', L.main.length === 17, String(L.main.length));
  check('Sunday still accepts CPS and manuring without approval', L.sunday);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
