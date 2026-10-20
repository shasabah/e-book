// E-Book test (1.3). Phone: chit correction (job numbers, day's work follows), Malaysian date
// before 8am, each person's entries sent with their own key, rain comma, message above sheets.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuala_Lumpur' });
  const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // 05:30 in Sabah on 19 Oct 2026 (21:30 UTC on 18 Oct)
  await p.clock.install({ time: new Date('2026-10-19T05:30:00+08:00') });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P97'));
    const chit = (id, date, rev, rows, jobs) => ({ chit: id, date, estate: 'SSGT', confirmedAt: '06:30', checker: 'T-STF', rev, rain_mm: '0', rain_time: '', alerts: [], jobs, rows });
    localStorage.setItem('fh.chits2', JSON.stringify([
      chit('C-Y', '2026-10-18', 1, [{ worker_id: 'W-SSGT-001', muster: 'H', task_code: 'HA', block: '03', lots: '3-30' }], [{ key: 'j1', task: 'HA', block: '03', lots: ['3-30'], mandor: '' }])]));
  });
  const today = await p.evaluate(() => [EA.today(), EA.dayAgo(1)].join(' '));
  check('phone date at 05:30 Sabah time is 19 Oct, yesterday 18 Oct', today === '2026-10-19 2026-10-18', today);
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(500);
  const wk = (await p.textContent('#room')).replace(/\s+/g, ' ');
  check('day\'s work at 05:30 offers yesterday\'s chit (18 Oct)', /18 Okt/.test(wk) && !/Tiada chit pagi/.test(wk), wk.slice(0, 160));
  await p.clock.setFixedTime(new Date('2026-10-19T07:00:00+08:00'));
  // Today's chit with 3 jobs; job 2 was removed before saving (keys j1, j3).
  await p.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('fh.chits2'));
    list.push({ chit: 'C-T', date: '2026-10-19', estate: 'SSGT', confirmedAt: '06:40', checker: 'T-STF', rev: 1, rain_mm: '0', rain_time: '', alerts: [],
      jobs: [{ key: 'j1', task: 'HA', block: '03', lots: ['3-30', '3-31'], mandor: '' }, { key: 'j3', task: 'CPS', block: '01', lots: ['1-1'], mandor: '' }],
      rows: [{ worker_id: 'W-SSGT-001', muster: 'H', task_code: 'HA', block: '03', lots: '3-30 3-31' }, { worker_id: 'W-SSGT-010', muster: 'H', task_code: 'CPS', block: '01', lots: '1-1' }] });
    localStorage.setItem('fh.chits2', JSON.stringify(list)); localStorage.setItem('fh.workchit', JSON.stringify('C-T'));
  });
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(400);
  await p.fill('[data-w="W-SSGT-001"][data-f="bunches"]', '120'); await p.waitForTimeout(200);
  // Correct the chit: add a new job, and add a second harvester to job 1.
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(400);
  await p.click('[data-fix="C-T"]'); await p.waitForTimeout(300);
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  await p.selectOption('#jb-task', 'SL'); await p.selectOption('#jb-block', '02'); await p.waitForTimeout(150);
  await p.click('#jb-save'); await p.waitForTimeout(200);
  const keys = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT.jobs.map(j => j.key).join(','));
  check('a job added on a correction gets a new number (no clash with j3)', keys === 'j1,j3,j4', keys);
  await p.click('[data-pick="j1"]'); await p.waitForSelector('#pp-list');
  await p.click('#pp-list .pick[data-w="W-SSGT-002"]'); await p.click('#pp-ok'); await p.waitForTimeout(200);
  // v1.17: no rain question on the chit (Sugut rain is keyed in the Sugut DMS)
  check('the chit has no rain question', await p.locator('#fh-rain').count() === 0 && !/Hujan semalam \(mm\)/.test(await p.locator('#room').innerText()));
  await p.click('#fh-check'); await p.waitForTimeout(300);
  if (await p.isVisible('#lo-all')) { await p.click('#lo-all'); await p.click('#lo-next'); await p.waitForTimeout(300); }
  if (await p.isVisible('#st-go')) { await p.click('#st-go'); await p.waitForTimeout(300); }
  await p.click('#cf-ok'); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(500);
  const box2 = await p.locator('[data-w="W-SSGT-002"][data-f="bunches"]').count();
  const kept = await p.locator('[data-w="W-SSGT-001"][data-f="bunches"]').inputValue();
  check('after the chit correction the new harvester has a box on day\'s work', box2 === 1, String(box2));
  check('what was already keyed (120 bunches) is kept', kept === '120', kept);
  // Message moves to the top while a sheet is open.
  await p.evaluate(() => { EA.ui.toast('hello'); EA.ui.openSheet('<h2 id="sheet-title">x</h2><div class="actions"><button class="btn" id="zz">OK</button></div>'); });
  const pos = await p.evaluate(() => { const t = document.getElementById('toast').getBoundingClientRect(); return t.top < 100; });
  check('a message shows at the top when a sheet is open (never over its buttons)', pos);
  await p.evaluate(() => EA.ui.closeSheet());
  // Each person's entries go with their own key.
  const staffQ = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]').length);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.fill('#key', '333333'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
  await p.evaluate(() => EA.send()); await p.waitForTimeout(200);
  const left = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]').filter(x => x.row.keyed_by === 'T-STF').length);
  const pill = await p.textContent('#wait-pill');
  check('the clerk logging in on this phone does not send the staff\'s entries', staffQ > 0 && left === staffQ, staffQ + ' / ' + left);
  check('the pill says whose entries are waiting', /milik T-STF/.test(pill), pill);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
