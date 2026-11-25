// E-Book test (1.105) The tractor follows the harvest, in the new look. Brief_Tuai_Kutip_Rupa_Baru 1.3 §5b, Yu Chen
// 25 Nov 2026 ("ok"), after "check the internal ffb and loading". Found: a lot added to Menuai after the tractor was put
// on the chit never reached the tractor, so Kerja never asked if its fruit went to the ramp; a harvest with no lot left
// Kerja nothing to pick; the chit showed ITF and LFF as two lines with Ha. Made-up data only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rounds: {}, lots: {}, items: [] }) }));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.rupaBaru', '1'); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload(); await p.fill('#key', '111111'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(400);
  const s = await p.evaluate(() => {
    const est = 'SSGT', all = EA.lists.workersFor(est), d = new Date(EA.today() + 'T00:00:00'); d.setDate(d.getDate() - 1);
    const y = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const row = (w, t, i) => ({ id: 'r' + i, worker_id: w.id, muster: 'H', task_code: t, block: '01', lots: '1-5 1-6', mandor: '', status: 'active' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-Y', date: y, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc', alerts: [], rain_mm: '0', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-5', '1-6'], mandor: '' }, { key: 'j2', task: 'ITF', block: '01', lots: ['1-5', '1-6'], mandor: '' }, { key: 'j3', task: 'LFF', block: '01', lots: ['1-5', '1-6'], mandor: '' }],
      rows: all.slice(0, 4).map((w, i) => row(w, 'HA', i)).concat([row(all[4], 'ITF', 10), row(all[5], 'LFF', 11)]) }]));
    localStorage.setItem('fh.dayclose', JSON.stringify([{ estate: est, date: y, closedAt: '18:00', status: 'closed' }])); localStorage.setItem('fh.work', JSON.stringify([])); localStorage.setItem('fh.collect', JSON.stringify([]));
    localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('fh.backlog.SSGT', JSON.stringify({ estate: 'SSGT', at: '05:30', field: [{ lot: '1-6', block: '01', bunches: 60, since: y }], fieldTotal: 60, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] }));
    return { hv: all.slice(0, 4).map(w => w.id), drv: all[4].id, ld: all[5].id };
  });
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);
  const draft = () => p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  const job = (d, t) => d.jobs.find(j => j.task === t);

  // Menuai needs a lot
  await p.click('#fh-addjob'); await p.waitForTimeout(400); await p.click('.jb-quick [data-quick="HA"]'); await p.waitForTimeout(300); await p.click('#jb-rbblk [data-rbblk="01"]'); await p.waitForTimeout(300);
  check('Menuai with no lot: SIMPAN reads PILIH PETAK', /PILIH PETAK/.test(await p.innerText('#jb-save')), await p.innerText('#jb-save'));
  for (const l of ['1-7', '1-8', '1-9']) { await p.click('#jb-lots [data-lot="' + l + '"]'); await p.waitForTimeout(80); }
  await p.click('#jb-save'); await p.waitForTimeout(400);

  // ITF + LFF: lots from the harvest and the fruit left; the bar shows the fruit, not Ha
  await p.click('#fh-addjob'); await p.waitForTimeout(400); await p.click('.jb-quick [data-quick="ITF"]'); await p.waitForTimeout(500);
  const bar = await p.innerText('#jb-tot');
  check('the tractor\'s bar shows the fruit: "4 petak · baki 60 tandan + tuai hari ini 3 petak" (no Ha)', /4 petak · baki 60 tandan \+ tuai hari ini 3 petak/.test(bar) && !/Ha/.test(bar), bar);
  await p.click('#jb-save'); await p.waitForTimeout(400);
  let d = await draft();
  check('saved as a pair on 1-6 1-7 1-8 1-9', job(d, 'ITF').lots.join(' ') === '1-6 1-7 1-8 1-9' && job(d, 'LFF').lots.join(' ') === '1-6 1-7 1-8 1-9', job(d, 'ITF').lots.join(' '));
  const rows = await p.evaluate(() => [...document.querySelectorAll('#fh-jobs [data-rbchj]')].map(b => b.innerText.replace(/\s+/g, ' ')));
  check('the chit shows ONE line for the tractor and loader: "ITF + LFF · Traktor & pemuat · Blk 01 · 4 petak · baki 60 tandan · driver + loader"',
    rows.length === 2 && /ITF \+ LFF Traktor & pemuat Blk 01 · 4 petak · baki 60 tandan · .+ \+ .+/.test(rows[1]) && !rows.some(r => /^LFF/.test(r)), rows.join(' || '));

  // a lot added to Menuai afterwards goes to the tractor and the loader
  await p.click('#fh-jobs [data-rbchj="' + job(d, 'HA').key + '"]'); await p.waitForTimeout(400);
  await p.click('#jb-lots [data-lot="1-10"]'); await p.waitForTimeout(100); await p.click('#jb-save'); await p.waitForTimeout(400);
  d = await draft();
  check('Menuai gets 1-10 later: the tractor and the loader get it too', job(d, 'ITF').lots.indexOf('1-10') >= 0 && job(d, 'LFF').lots.indexOf('1-10') >= 0 && d.jobOf[s.ld] === job(d, 'LFF').key, job(d, 'ITF').lots.join(' '));

  // the tractor's line: switch to "muat sendiri", then back to a pair
  await p.click('#fh-jobs [data-rbchj="' + job(d, 'ITF').key + '"]'); await p.waitForTimeout(400);
  check('the tractor\'s sheet shows "ITF + LFF" with the driver and the loader ticked', /ITF \+ LFF/.test(await p.innerText('#jb-rbjob')) && await p.getAttribute('#jb-who [data-rbld="' + s.ld + '"]', 'aria-pressed') === 'true');
  await p.click('#jb-who [data-rbld=""]'); await p.waitForTimeout(200); await p.click('#jb-save'); await p.waitForTimeout(400);
  d = await draft();
  check('"Tiada · pemandu muat sendiri": the LFF job goes, the loader back to not marked', !job(d, 'LFF') && !d.marks[s.ld] && /muat sendiri/.test(await p.innerText('#fh-jobs')), JSON.stringify(d.jobs.map(j => j.task)));
  await p.click('#fh-jobs [data-rbchj="' + job(d, 'ITF').key + '"]'); await p.waitForTimeout(400);
  await p.click('#jb-who #jb-moreld').catch(() => {}); await p.waitForTimeout(200);
  await p.click('#jb-who [data-rbld="' + s.ld + '"]'); await p.waitForTimeout(200); await p.click('#jb-save'); await p.waitForTimeout(400);
  d = await draft();
  check('and back to a pair: LFF on the tractor\'s lots, the loader on it', !!job(d, 'LFF') && job(d, 'LFF').lots.join(' ') === job(d, 'ITF').lots.join(' ') && d.jobOf[s.ld] === job(d, 'LFF').key);

  // a harvest with no lot stops the chit
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('fh.draft2')); a.SSGT.jobs.find(j => j.task === 'HA').lots = []; localStorage.setItem('fh.draft2', JSON.stringify(a)); location.hash = ''; });
  await p.waitForTimeout(200); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1000);
  check('a harvest with no lot: its line is red PILIH PETAK, and SIMPAN CHIT says "1 KERJA BELUM LENGKAP"', /PILIH PETAK/.test(await p.innerText('#fh-jobs')) && /1 KERJA BELUM LENGKAP/.test(await p.innerText('#fh-check')), await p.innerText('#fh-check'));
  await p.click('#fh-check'); await p.waitForTimeout(400);
  check('saving says the harvest needs a lot', /Menuai.*pilih sekurang-kurangnya satu petak/.test(await p.innerText('#sheet')), (await p.innerText('#sheet')).slice(0, 200));

  // Kerja: a harvest lot the tractor's chit lacks still gets its question
  await p.evaluate(() => {
    EA.ui.closeSheet();
    const c = JSON.parse(localStorage.getItem('fh.chits2'))[0];
    c.date = EA.today(); c.chit = 'MC-T'; c.jobs[0].lots = ['1-5', '1-6', '1-7']; c.rows.forEach(r => { if (r.task_code === 'HA') r.lots = '1-5 1-6 1-7'; });
    localStorage.setItem('fh.chits2', JSON.stringify([c])); localStorage.setItem('fh.dayclose', JSON.stringify([])); location.hash = 'field-harvest/work';
  });
  await p.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) {
    await p.click('[data-rbj="j1"]').catch(() => {}); await p.waitForTimeout(200);
    const box = await p.$('[data-rbopen] [data-pick-lot]'); if (box) { await box.click(); await p.waitForTimeout(200); }
    await p.keyboard.type('50'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  }
  await p.click('[data-rball="h|j1"]').catch(() => {}); await p.waitForTimeout(300);
  await p.click('#rb-done').catch(() => {}); await p.waitForTimeout(500);
  const tiles = await p.evaluate(() => [...document.querySelectorAll('[data-rbtile^="c|"]')].map(b => b.dataset.rbtile.split('|')[2]).join(' '));
  check('Kerja: the tractor asks about 1-7 too (a harvest lot its chit line lacked)', tiles.split(' ').indexOf('1-7') >= 0, tiles);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
