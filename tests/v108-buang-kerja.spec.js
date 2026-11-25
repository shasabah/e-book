// E-Book test (1.107) BUANG works with men on the job, in the new look. Yu Chen 25 Nov 2026 (photo of the job sheet:
// "Remove button cannot function"). The first tap asks in the sheet and names the men; YA, BUANG takes the job off and
// its men go back to "belum ditanda". The tractor's line takes its loader with it. The old look is unchanged.
// Made-up data only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.rupaBaru', '1'); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload(); await p.fill('#key', '111111'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(400);
  const seed = () => p.evaluate(() => {
    const est = 'SSGT', all = EA.lists.workersFor(est).filter(w => !w.mdr), d = new Date(EA.today() + 'T00:00:00'); d.setDate(d.getDate() - 1);
    const y = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    localStorage.setItem('fh.chits2', JSON.stringify([])); localStorage.setItem('fh.dayclose', JSON.stringify([{ estate: est, date: y, closedAt: '18:00', status: 'closed' }]));
    const marks = {}, jobOf = {};
    const put = (w, k) => { marks[w.id] = 'H'; jobOf[w.id] = k; };
    put(all[0], 'j1'); put(all[1], 'j1'); put(all[2], 'j2'); put(all[3], 'j3'); put(all[4], 'j4');
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: EA.today(), nextJob: 5, marks, jobOf, notes: {}, alertNotes: {},
      jobs: [{ key: 'j1', task: 'CPS', block: '04', lots: ['4-1'], mandor: '' }, { key: 'j2', task: 'ITF', block: '01', lots: ['1-5'], mandor: '' },
        { key: 'j3', task: 'LFF', block: '01', lots: ['1-5'], mandor: '' }, { key: 'j4', task: 'HA', block: '01', lots: ['1-5'], mandor: '' }] } }));
    return { cps: [all[0].id, all[1].id], drv: all[2].id, ld: all[3].id, hv: all[4].id };
  });
  const s = await seed();
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);
  const draft = () => p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);

  // a job with 2 men
  await p.click('#fh-jobs [data-rbchj="j1"]'); await p.waitForTimeout(400);
  check('BUANG can be pressed with men on the job', await p.isEnabled('#jb-del'));
  await p.click('#jb-del'); await p.waitForTimeout(300);
  let d = await draft();
  check('the first tap only asks, in the sheet, and names the men', !!d.jobs.find(j => j.key === 'j1') && /Buang kerja ini\?/.test(await p.innerText('#jb-delask')) && /2 orang balik ke "belum ditanda"/.test(await p.innerText('#jb-delask')) && /YA, BUANG/.test(await p.innerText('#jb-del')), await p.innerText('#jb-delask'));
  await p.click('#jb-del'); await p.waitForTimeout(400);
  d = await draft();
  check('YA, BUANG: the job goes, its 2 men back to not marked', !d.jobs.find(j => j.key === 'j1') && !d.marks[s.cps[0]] && !d.marks[s.cps[1]] && !d.jobOf[s.cps[0]] && !await p.$('#sheet:not([hidden]) #jb-del'));
  check('the men show again under "belum ditanda"', await p.locator('#fh-rows [data-w="' + s.cps[0] + '"]').count() > 0);

  // BATAL after the question keeps everything
  await p.click('#fh-jobs [data-rbchj="j4"]'); await p.waitForTimeout(400); await p.click('#jb-del'); await p.waitForTimeout(200); await p.click('#jb-cancel'); await p.waitForTimeout(300);
  d = await draft();
  check('BATAL after the question: the job and its man stay', !!d.jobs.find(j => j.key === 'j4') && d.marks[s.hv] === 'H');

  // the tractor's line takes the loader with it
  await p.click('#fh-jobs [data-rbchj="j2"]'); await p.waitForTimeout(400);
  await p.click('#jb-del'); await p.waitForTimeout(200);
  check('the tractor: the question says "dengan pemuat" and names both men', /dengan pemuat/.test(await p.innerText('#jb-delask')) && /2 orang/.test(await p.innerText('#jb-delask')));
  await p.click('#jb-del'); await p.waitForTimeout(400);
  d = await draft();
  check('ITF and LFF both go; the driver and the loader back to not marked; Menuai stays', !d.jobs.find(j => j.task === 'ITF' || j.task === 'LFF') && !d.marks[s.drv] && !d.marks[s.ld] && d.marks[s.hv] === 'H', JSON.stringify(d.jobs.map(j => j.task)));

  // old look unchanged: BUANG stays shut while men are on the job
  await p.evaluate(() => localStorage.removeItem('ea.rupaBaru')); await seed();
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1000);
  await p.click('#fh-jobs [data-edit="j1"], #fh-jobs [data-job="j1"]').catch(() => {});
  if (!(await p.$('#jb-del'))) await p.evaluate(() => { const x = [...document.querySelectorAll('#fh-jobs button')].find(e => /UBAH|EDIT/i.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(400);
  check('old look: BUANG still shut with men on the job', !!(await p.$('#jb-del')) && !(await p.isEnabled('#jb-del')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
