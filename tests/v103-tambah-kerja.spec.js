// E-Book test (1.102) Tambah kerja in the new look. Brief_Tambah_Kerja_Rupa_Baru 1.0, signed by Yu Chen 25 Nov 2026
// ("sign and realease to new look first now"). One place to pick the job (+ KERJA LAIN opens the other list in its
// place; TUKAR KERJA), blocks as buttons (TUKAR BLOK), the men on the same sheet with the last chit's men ticked,
// ITF + LFF as one button (driver alone or with a loader), and the buttons say what is still missing.
// The old look is unchanged. Setup from v102; made-up data only (Rule 8).
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
  // yesterday's chit: 4 harvesters, a tractor driver and a loader
  const s = await p.evaluate(() => {
    const est = 'SSGT', all = (EA.lists.workersFor(est) || []).filter(w => !w.mdr), d = new Date(EA.today() + 'T00:00:00'); d.setDate(d.getDate() - 1);
    const y = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const hv = all.slice(0, 4), drv = all[4], ld = all[5];
    const row = (w, t, i) => ({ id: 'r' + i, worker_id: w.id, muster: 'H', task_code: t, block: '01', lots: '1-1', mandor: '', status: 'active' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-Y', date: y, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc', alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-1'], mandor: '' }, { key: 'j2', task: 'ITF', block: '01', lots: ['1-1'], mandor: '' }, { key: 'j3', task: 'LFF', block: '01', lots: ['1-1'], mandor: '' }],
      rows: hv.map((w, i) => row(w, 'HA', i)).concat([row(drv, 'ITF', 10), row(ld, 'LFF', 11)]) }]));
    localStorage.setItem('fh.dayclose', JSON.stringify([{ estate: est, date: y, closed: true }])); localStorage.setItem('fh.work', JSON.stringify([]));
    return { hv: hv.map(x => x.id), drv: drv.id, ld: ld.id };
  });
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);
  const wide = () => p.evaluate(() => document.documentElement.scrollWidth);
  const vis = sel => p.evaluate(q => { const e = document.querySelector(q); return !!e && !e.closest('[hidden]') && e.offsetParent !== null; }, sel);
  const save = () => p.evaluate(() => document.querySelector('#jb-save').innerText.trim());
  const draft = () => p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('fh.draft2') || '{}'))[0] || {});
  check('SIMPAN CHIT says what is missing: "TAMBAH KERJA · N BELUM DITANDA"', /TAMBAH KERJA · \d+ BELUM DITANDA/.test(await p.innerText('#fh-check')), await p.innerText('#fh-check'));

  await p.click('#fh-addjob'); await p.waitForTimeout(400);
  check('one place to pick the job: the buttons show; the other-work list is shut and only + KERJA LAIN shows',
    await vis('#jb-quickbox') && !(await vis('#jb-taskbox')) && !(await vis('#jb-otherlist')) && await vis('#jb-otherbtn'));
  check('the job names are whole (not cut short)', await p.evaluate(() => { const x = document.querySelector('.jb-quick [data-quick] small'); return getComputedStyle(x).whiteSpace !== 'nowrap'; }));
  check('the tractor and loader are one button "ITF + LFF"; LFF alone is not offered',
    /ITF \+ LFF/.test(await p.innerText('.jb-quick [data-quick="ITF"]')) && !(await vis('.jb-quick [data-quick="LFF"]')));
  check('SIMPAN reads PILIH KERJA', /PILIH KERJA/.test(await save()), await save());

  await p.click('.jb-quick [data-quick="HA"]'); await p.waitForTimeout(300);
  check('HA picked: the buttons fold to one line "HA … TUKAR KERJA"', !(await vis('#jb-quickbox')) && /HA[\s\S]*TUKAR KERJA/.test(await p.innerText('#jb-rbjob')) && !(await vis('#jb-otherbtn')));
  check('the blocks are buttons, not a drop-down; SIMPAN reads PILIH BLOK', await p.locator('#jb-rbblk [data-rbblk]').count() >= 4 && !(await vis('#jb-block')) && /PILIH BLOK/.test(await save()), await save());
  await p.click('#jb-rbblk [data-rbblk="01"]'); await p.waitForTimeout(300);
  check('Blok 01 picked: one line with TUKAR BLOK, and the lots show', /Blok 01[\s\S]*TUKAR BLOK/.test(await p.innerText('#jb-rbblk')) && await p.locator('#jb-lots [data-lot]').count() > 10);
  const ticked = await p.evaluate(() => [...document.querySelectorAll('#jb-who [data-rbman][aria-pressed="true"]')].map(b => b.dataset.rbman).join(','));
  check('3 · Siapa?: yesterday\'s 4 harvesters are already ticked', ticked === s.hv.join(','), ticked);
  check('SIMPAN reads SIMPAN', /^SIMPAN/.test(await save()), await save());
  await p.click('#jb-who [data-rbman="' + s.hv[3] + '"]'); await p.waitForTimeout(200);
  await p.click('#jb-rbblk [data-rbblk]').catch(() => {});
  await p.click('#jb-tukarblk'); await p.waitForTimeout(200);
  check('TUKAR BLOK opens the block buttons again', await p.locator('#jb-rbblk [data-rbblk]').count() >= 4);
  await p.click('#jb-rbblk [data-rbblk="01"]'); await p.waitForTimeout(200);
  await p.click('#jb-lots [data-lot="1-2"]'); await p.waitForTimeout(100);
  await p.click('#jb-save'); await p.waitForTimeout(400);
  let d = await draft(); const ha = (d.jobs || []).find(j => j.task === 'HA');
  check('saved: the HA job on Blok 01, its 3 ticked men present on it, the unticked man not', !!ha && ha.block === '01' && s.hv.slice(0, 3).every(id => d.marks[id] === 'H' && d.jobOf[id] === ha.key) && !d.marks[s.hv[3]], JSON.stringify(d.jobOf));

  await p.click('#fh-addjob'); await p.waitForTimeout(400);
  await p.click('.jb-quick [data-quick="ITF"]'); await p.waitForTimeout(400);
  check('ITF + LFF: the block comes from the harvest, and the men are asked at once', /Blok 01/.test(await p.innerText('#jb-rbblk')) && await vis('#jb-who'));
  const drvOn = await p.evaluate(() => [...document.querySelectorAll('#jb-who [data-rbman][aria-pressed="true"]')].map(b => b.dataset.rbman).join(','));
  const ldOn = await p.evaluate(() => (document.querySelector('#jb-who [data-rbld][aria-pressed="true"]') || {}).dataset);
  check('yesterday\'s driver and loader are already ticked', drvOn === s.drv && ldOn && ldOn.rbld === s.ld, drvOn + ' / ' + JSON.stringify(ldOn));
  check('a man already on HA today is grey with his job', await p.evaluate(id => { const b = document.querySelector('#jb-who [data-rbman="' + id + '"]'); return !b || (b.disabled && /HA/.test(b.innerText)); }, s.hv[0]));
  await p.click('#jb-who [data-rbld=""]'); await p.waitForTimeout(200);
  check('"Tiada · pemandu muat sendiri" can be picked (one man does both)', await p.evaluate(() => document.querySelector('#jb-who [data-rbld=""]').getAttribute('aria-pressed') === 'true'));
  await p.click('#jb-who [data-rbld="' + s.ld + '"]'); await p.waitForTimeout(200);
  await p.click('#jb-save'); await p.waitForTimeout(400);
  d = await draft(); const itf = d.jobs.find(j => j.task === 'ITF'), lff = d.jobs.find(j => j.task === 'LFF');
  check('saved as a pair: the driver on ITF, the loader on LFF, same block and lots', !!itf && !!lff && d.jobOf[s.drv] === itf.key && d.jobOf[s.ld] === lff.key && itf.block === lff.block && itf.lots.join(' ') === lff.lots.join(' '), JSON.stringify(d.jobs));

  await p.click('#fh-addjob'); await p.waitForTimeout(400);
  await p.click('#jb-otherbtn'); await p.waitForTimeout(300);
  check('+ KERJA LAIN: the other-work list takes the place of the buttons', !(await vis('#jb-quickbox')) && await p.locator('#jb-otherlist [data-oth]').count() > 5);
  const oth = await p.evaluate(() => document.querySelector('#jb-otherlist [data-oth]').dataset.oth);
  await p.click('#jb-otherlist [data-oth="' + oth + '"]'); await p.waitForTimeout(300);
  check('other work picked: marked KERJA LAIN · MINTA LULUS, the reason asked, SIMPAN reads TULIS SEBAB',
    /KERJA LAIN · MINTA LULUS/.test(await p.innerText('#jb-rbjob')) && await vis('#jb-why') && /TULIS SEBAB/.test(await save()), await save());
  await p.click('#jb-tukar'); await p.waitForTimeout(300);
  check('TUKAR KERJA brings the job buttons back', await vis('#jb-quickbox') && await vis('#jb-otherbtn'));
  await p.click('#jb-cancel'); await p.waitForTimeout(300);

  // a man marked H with no job: named in the chit table
  await p.evaluate(id => { const all = JSON.parse(localStorage.getItem('fh.draft2')); const k = Object.keys(all)[0]; all[k].marks[id] = 'H'; delete all[k].jobOf[id]; localStorage.setItem('fh.draft2', JSON.stringify(all)); }, s.hv[3]);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1000);
  check('the chit table names a line with no job "Belum pilih kerja"', /Belum pilih kerja/.test(await p.innerText('#fh-table')));
  check('SIMPAN CHIT says "1 TIADA KERJA"', /1 TIADA KERJA/.test(await p.innerText('#fh-check')), await p.innerText('#fh-check'));
  check('the page never grew wider than the phone', await wide() <= 390, String(await wide()));

  // the old look is unchanged
  await p.evaluate(() => { localStorage.removeItem('ea.rupaBaru'); location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1000);
  await p.click('#fh-addjob'); await p.waitForTimeout(400);
  check('old look: the job list (drop-down) and the block drop-down are still there; no new steps', await vis('#jb-task') && await vis('#jb-block') && await p.locator('#jb-who').count() === 0 && await p.locator('#jb-otherbtn').count() === 0);
  check('old look: SAVE CHIT is as before', /SAVE CHIT|SIMPAN CHIT/i.test(await p.innerText('#fh-check')) && !/BELUM DITANDA/.test(await p.innerText('#fh-check')), await p.innerText('#fh-check'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
