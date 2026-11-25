// E-Book test (1.106) The morning chit from last night's plan, in the new look. Brief_Chit_Rancangan_Rupa_Baru 1.1,
// signed by Yu Chen 25 Nov 2026 ("sign"). Every planned man is a green tick under his job; tap one who did not come
// (HADIR / SAKIT / CUTI / TAK HADIR); PINDAH BEBERAPA ORANG moves several; the bottom button reads what is missing, else
// "SAHKAN CHIT · N hadir". The old look is unchanged. Made-up data only (Rule 8).
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
    const est = 'SSGT', all = EA.lists.workersFor(est).filter(w => !w.mdr), t = EA.today(), d = new Date(t + 'T00:00:00'); d.setDate(d.getDate() - 1);
    const y = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const row = (w, task, block, lots, i, m) => ({ id: 'pr' + i, worker_id: w.id, muster: m || 'H', task_code: task, block, lots, mandor: '', status: 'active' });
    const rows = all.slice(0, 4).map((w, i) => row(w, 'HA', '01', '1-7 1-8', i)).concat([row(all[4], 'ITF', '01', '1-7 1-8', 10), row(all[5], 'LFF', '01', '1-7 1-8', 11),
      row(all[6], 'CPS', '02', '2-1 2-2', 12), row(all[7], 'CPS', '02', '2-1 2-2', 13), row(all[8], '', '', '', 14, 'C')]);
    localStorage.setItem('fh.plans', JSON.stringify([{ plan: 'PL-T', estate: est, date: t, at: y + ' 18:20', keyedBy: 'STF', keyedName: 'Staf Contoh', reason: '',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-7', '1-8'], mandor: '' }, { key: 'j2', task: 'ITF', block: '01', lots: ['1-7', '1-8'], mandor: '' }, { key: 'j3', task: 'LFF', block: '01', lots: ['1-7', '1-8'], mandor: '' }, { key: 'j4', task: 'CPS', block: '02', lots: ['2-1', '2-2'], mandor: '' }],
      rows }]));
    localStorage.setItem('fh.chits2', JSON.stringify([])); localStorage.setItem('fh.dayclose', JSON.stringify([{ estate: est, date: y, closedAt: '18:00', status: 'closed' }]));
    localStorage.removeItem('fh.draft2');
    return { hv: all.slice(0, 4).map(w => w.id), drv: all[4].id, cps: [all[6].id, all[7].id], leave: all[8].id, other: all[9].id };
  });
  const s = await seed();
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);
  if (await p.$('#pd-conf')) { await p.click('#pd-conf'); } await p.waitForTimeout(800);
  const jobs = await p.innerText('#fh-jobs');
  check('the morning chit opens from the plan: the band "SIAPA TIDAK HADIR?"', /SIAPA TIDAK HADIR/.test(await p.innerText('#fh-sameday')));
  check('each job with its planned men as green ticks', await p.locator('#fh-jobs .rb-mc:not(.off)').count() === 8 && /Siapa datang\?/.test(jobs), (await p.locator('#fh-jobs .rb-mc').count()) + ' ticks');
  check('the bottom button asks for the rain first ("JAWAB HUJAN")', /JAWAB HUJAN/.test(await p.innerText('#fh-check')), await p.innerText('#fh-check'));
  if (await p.$('#fh-rain-no')) { await p.click('#fh-rain-no'); await p.waitForTimeout(200); }
  if (await p.$('#fh-rain-save')) { await p.click('#fh-rain-save').catch(() => {}); await p.waitForTimeout(200); }

  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT, fullPage: true });
  // a man who did not come
  await p.click('#fh-jobs [data-rbmc="' + s.hv[1] + '"]'); await p.waitForTimeout(300);
  check('tapping a man opens HADIR / SAKIT / CUTI / TAK HADIR', (await p.innerText('#sheet .rb-opts4')).replace(/\s+/g, ' ').indexOf('HADIR') >= 0 && await p.locator('#sheet [data-rbk]').count() === 4);
  await p.click('#sheet [data-rbk="S"]'); await p.waitForTimeout(300);
  let d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('SAKIT: he is marked S, stays under his job crossed out', d.marks[s.hv[1]] === 'S' && await p.locator('#fh-jobs .rb-mc.off[data-rbmc="' + s.hv[1] + '"]').count() === 1);
  await p.click('#fh-jobs [data-rbmc="' + s.hv[1] + '"]'); await p.waitForTimeout(300); await p.click('#sheet [data-rbk="H"]'); await p.waitForTimeout(300);
  d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('back to HADIR: present again, on his planned job', d.marks[s.hv[1]] === 'H' && d.jobOf[s.hv[1]] === 'j1');

  // move several
  await p.click('#fh-rbmove'); await p.waitForTimeout(200);
  await p.click('#fh-jobs [data-rbmc="' + s.cps[0] + '"]'); await p.click('#fh-jobs [data-rbmc="' + s.cps[1] + '"]'); await p.waitForTimeout(200);
  check('PINDAH BEBERAPA ORANG: the bar counts the ticked men', /Pindah 2 orang ke:/.test(await p.innerText('.rb-movebar')));
  await p.click('#fh-jobs [data-rbto="j1"]'); await p.waitForTimeout(300);
  d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('both men move to HA in one go; CPS now shows red PILIH ORANG', d.jobOf[s.cps[0]] === 'j1' && d.jobOf[s.cps[1]] === 'j1' && /PILIH ORANG/.test(await p.innerText('#fh-jobs')));

  // the men not in the plan, and the bottom button
  const rows = await p.innerText('#fh-rows');
  check('Kehadiran lists only men not in the plan (the planned men are ticks above)', /belum ditanda/.test(rows) && await p.locator('#fh-rows .seg button[data-k="H"][data-w="' + s.hv[0] + '"]').count() === 0 && await p.locator('#fh-rows .seg button[data-w="' + s.other + '"]').count() > 0);
  check('the leave planned last night is one short line "C · Cuti"', /C · Cuti/.test(await p.innerText('[data-rbrow="' + s.leave + '"]')));
  check('the bottom button says what is still missing (belum ditanda, kerja belum lengkap)', /BELUM DITANDA/.test(await p.innerText('#fh-check')) && /KERJA BELUM LENGKAP/.test(await p.innerText('#fh-check')), await p.innerText('#fh-check'));
  // finish: the rest are away, CPS removed
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('fh.draft2')); const d = a.SSGT; d.jobs = d.jobs.filter(j => j.task !== 'CPS'); EA.lists.workersFor('SSGT').concat(EA.lists.mandorsFor('SSGT')).forEach(w => { if (!d.marks[w.id]) d.marks[w.id] = 'C'; }); localStorage.setItem('fh.draft2', JSON.stringify(a)); location.hash = ''; });
  await p.waitForTimeout(200); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1000);
  const btn = await p.innerText('#fh-check');
  check('all done: the button reads "SAHKAN CHIT · N hadir"', /SAHKAN CHIT · 8 hadir/i.test(btn), btn);
  await p.click('#fh-check'); await p.waitForTimeout(500);
  if (await p.$('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
  check('it opens the same confirm as today ("Sahkan chit …")', /Sahkan chit/.test(await p.innerText('#sheet')), (await p.innerText('#sheet')).slice(0, 80));

  // the old look is unchanged
  await p.evaluate(() => { EA.ui.closeSheet(); localStorage.removeItem('ea.rupaBaru'); });
  await seed(); await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1000);
  if (await p.$('#pd-conf')) { await p.click('#pd-conf'); } await p.waitForTimeout(800);
  check('old look: the confirm keeps PICK / EDIT and no ticks', await p.locator('#fh-jobs [data-pick]').count() > 0 && await p.locator('#fh-jobs .rb-mc').count() === 0 && /CONFIRM|SAHKAN/i.test(await p.innerText('#fh-check')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
