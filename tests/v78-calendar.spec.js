// E-Book test (1.69) The 2026 working calendar for every estate (Yu Chen, 17 Nov 2026: "upload the calendar… to all the
// estate even though Melu and Kawananan not yet start"), from the four "… SUMMARY BUDGET 2026" files. Public holidays
// act like a Sunday (5 Nov rule); the estate's own off days are shown in Senarai › Cuti umum and nothing acts on them.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const cal = fs.readFileSync(path.join(root, 'lists', 'calendar.js'), 'utf8');
check('the calendar file holds dates only: no RM, no names', !/RM|rate|wage|gaji/i.test(cal));
check('the calendar is on the page and kept for no signal', /lists\/calendar\.js/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')) && /lists\/calendar\.js/.test(fs.readFileSync(path.join(root, 'sw.js'), 'utf8')));
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', rt => { const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT', 'PTAN'] }, cleanFrom: '' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bd.action === 'login' ? { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] }, sw } : bd.action === 'todo' ? { ok: true, estate: 'SSGT', items: [] } : { ok: false, error: 'busy' }) }); });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(500);
  const L = await p.evaluate(() => { const c = EA.lists.calendar, sum = a => a.reduce((x, y) => x + y, 0), sun = d => new Date(d + 'T00:00:00').getDay() === 0;
    return { ph: EA.lists.holidays, est: Object.keys(c).sort().join(','), h: Object.keys(c).map(e => sum(c[e].harvestDays)).join(','), g: Object.keys(c).sort().map(e => e + sum(c[e].gmDays)).join(','),
      ptan: c.PTAN.harvestDays.join(','), noSun: Object.keys(c).every(e => !c[e].harvestOff.some(sun) && !c[e].gmOff.some(sun)), noDup: Object.keys(c).every(e => !c[e].harvestOff.concat(c[e].gmOff).some(d => EA.lists.holidays.indexOf(d) >= 0)),
      tkrs: !c.TKRS && EA.lists.calendarFor('TKRS') === null }; });
  check('15 public holidays in 2026, 25 Dec the last, none on a Sunday', L.ph.length === 15 && L.ph[14] === '2026-12-25' && L.ph[0] === '2026-01-01', L.ph.join(' '));
  check('every estate has a calendar, also Meliau and Kawananan', L.est === 'KWNN,MELU,PTAN,SSGT', L.est);
  check('harvesting: 313 working days a year at every estate', L.h === '313,313,313,313', L.h);
  check('general & maintenance: 298 days (Sugut 299)', L.g === 'KWNN298,MELU298,PTAN298,SSGT299', L.g);
  check('Paitan harvest days month by month are the ones already in the budget (13 Nov)', L.ptan === '27,23,25,26,26,26,26,26,26,28,27,27', L.ptan);
  check('off days hold no Sunday and no public holiday twice; Tekara has none of its own (a piece of Paitan)', L.noSun && L.noDup && L.tkrs);
  // a public holiday acts like a Sunday on the chit, with its own words
  const T = (o) => p.evaluate((o) => EA.roomViews['field-harvest'].chitText(Object.assign({ estate: 'SSGT', rows: [], jobs: [], alerts: [], backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 } } }, o)), o);
  let t = await T({ date: '2026-12-25', isPlan: true, planAt: '2026-12-24 17:30' });
  check('WhatsApp plan for 25 Dec: "Cuti umum: perlu lulus Penolong Pengurus"', /⚠ Cuti umum: perlu lulus Penolong Pengurus/.test(t) && !/Hari Ahad/.test(t), t.split('\n').filter(l => /lulus|Rehat/.test(l)).join(' | '));
  t = await T({ date: '2026-12-27', isPlan: true, planAt: '2026-12-26 17:30' });
  check('WhatsApp plan for a Sunday still says "Hari Ahad"', /⚠ Hari Ahad: perlu lulus Penolong Pengurus/.test(t));
  t = await T({ date: '2026-12-24', isPlan: true, planAt: '2026-12-23 17:30' });
  check('an ordinary day has neither line', !/perlu lulus Penolong Pengurus/.test(t));
  t = await T({ date: '2026-11-30', isPlan: true, planAt: '2026-11-28 17:30' });
  check('an estate off day (30 Nov, harvesting) does not act: no approval line', !/perlu lulus Penolong Pengurus/.test(t));
  t = await T({ date: '2026-12-25' });
  check('WhatsApp chit on 25 Dec: people not on the chit are resting, "Rehat (cuti umum)" not "(hari ahad)"', !/hari ahad/.test(t), t.split('\n').filter(l => /Rehat/.test(l)).join(' | '));
  // Senarai › Cuti umum
  await p.evaluate(() => EA.homePane('lists')); await p.waitForTimeout(200);
  check('tile: "15 cuti umum 2026"', /15 cuti umum 2026|15 holidays 2026/.test(await p.textContent('[data-ref="hol"]')), await p.textContent('[data-ref="hol"]'));
  await p.click('[data-ref="hol"]'); await p.waitForTimeout(200);
  const sh = await p.innerText('#sheet');
  check('sheet: the holidays, then the estate\'s off days for harvesting and for general work, then days a month', await p.locator('#sheet .ref-h').count() === 4 && await p.locator('#sheet .ref-list').count() === 3 && await p.locator('#sheet .ref-tab tr').count() === 3, sh.replace(/\n+/g, ' | ').slice(0, 200));
  check('sheet: says which holidays harvesting works on, and that off days are shown only', /tuai bekerja|harvesting works/.test(sh) && /ditunjuk sahaja|shown only/.test(sh) && /SPLT\.SSGT SUMMARY BUDGET 2026/.test(sh));
  check('sheet: view only, nothing to key', await p.locator('#sheet input, #sheet select, #sheet textarea').count() === 0);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v78-calendar.png' });
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
