// E-Book test (1.111) Brief_Meliau_Mula, Yu Chen 27 Nov 2026 ("sign 1 and lorry"; tractor and loader "as a pair … single
// … more loader to help"; shortcut buttons of jobs already chosen). (1) The Owner's switch "Rupa Baru untuk semua" gives
// everyone at that estate the new look with no CUBA / KEMBALI card; off = the old look. (2) ITF + LFF: none, one or several
// loaders. (3) Tambah kerja: a job already on the chit says "SUDAH ADA · Blk 01". Made-up data only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload(); await p.fill('#key', '111111'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); }); await p.waitForTimeout(400);

  // (1) the estate switch
  const st = () => p.evaluate(() => ({ rb: EA.rupaBaru(), card: !document.querySelector('#rupa-card') || document.querySelector('#rupa-card').hidden ? '' : document.querySelector('#rupa-card').innerText }));
  let s = await st();
  check('before: the Owner has the CUBA RUPA BARU card and the old look', !s.rb && /CUBA RUPA BARU/.test(s.card), JSON.stringify(s));
  await p.evaluate(() => { const sw = EA.switches(); EA.setSwitches(Object.assign({}, sw, { rupaEstates: ['SSGT'] })); location.hash = 'x'; location.hash = ''; });
  await p.waitForTimeout(500); s = await st();
  check('estate switched on: the new look with no card (no choice on the phone)', s.rb && !s.card, JSON.stringify(s));
  await p.evaluate(() => localStorage.removeItem('ea.rupaBaru'));
  check('… even with this phone\'s own choice off', await p.evaluate(() => EA.rupaBaru()));
  check('another estate is not switched', await p.evaluate(() => EA.rupaEstate('MELU')) === false);
  await p.evaluate(() => { const sw = EA.switches(); EA.setSwitches(Object.assign({}, sw, { rupaEstates: [] })); location.hash = 'x'; location.hash = ''; });
  await p.waitForTimeout(500); s = await st();
  check('switched off: back to the old look, the card again', !s.rb && /CUBA RUPA BARU/.test(s.card), JSON.stringify(s));

  // (2) and (3) in the new look
  await p.evaluate(() => { const sw = EA.switches(); EA.setSwitches(Object.assign({}, sw, { rupaEstates: ['SSGT'] })); });
  const ids = await p.evaluate(() => {
    const est = 'SSGT', all = EA.lists.workersFor(est).filter(w => !w.mdr), d = new Date(EA.today() + 'T00:00:00'); d.setDate(d.getDate() - 1);
    const y = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    localStorage.setItem('fh.chits2', JSON.stringify([])); localStorage.setItem('fh.dayclose', JSON.stringify([{ estate: est, date: y, closedAt: '18:00', status: 'closed' }]));
    const dr = { date: EA.today(), nextJob: 2, marks: {}, jobOf: {}, rain_mm: '0', rain_time: '', notes: {}, alertNotes: {}, jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-7', '1-8'], mandor: '' }] };
    all.slice(0, 3).forEach(w => { dr.marks[w.id] = 'H'; dr.jobOf[w.id] = 'j1'; });
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: dr }));
    return all.slice(3, 7).map(w => w.id);
  });
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);
  await p.click('#fh-addjob'); await p.waitForTimeout(400);
  const haBtn = await p.innerText('.jb-quick [data-quick="HA"]');
  check('Tambah kerja: Menuai already on the chit says "SUDAH ADA · Blk 01"', /SUDAH ADA · Blk 01/.test(haBtn), haBtn.replace(/\s+/g, ' '));
  check('a job not on the chit has no such mark (CPS)', !/SUDAH ADA/.test(await p.innerText('.jb-quick [data-quick="CPS"]')));
  await p.click('.jb-quick [data-quick="ITF"]'); await p.waitForTimeout(400);
  // the driver
  await p.click('#jb-who [data-rbman="' + ids[0] + '"]').catch(() => {}); await p.waitForTimeout(150);
  if (!(await p.$('#jb-who [data-rbld="' + ids[1] + '"]'))) { await p.click('#jb-moreld'); await p.waitForTimeout(150); }
  await p.click('#jb-who [data-rbld="' + ids[1] + '"]'); await p.waitForTimeout(150);
  await p.click('#jb-who [data-rbld="' + ids[2] + '"]'); await p.waitForTimeout(150);
  const pressed = await p.evaluate(() => [...document.querySelectorAll('#jb-who [data-rbld][aria-pressed="true"]')].map(x => x.dataset.rbld));
  check('two loaders can be ticked together (peak season)', pressed.length === 2 && pressed.indexOf(ids[1]) >= 0 && pressed.indexOf(ids[2]) >= 0, pressed.join(','));
  await p.click('#jb-save'); await p.waitForTimeout(400);
  let d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  const lff = d.jobs.find(j => j.task === 'LFF'), itf = d.jobs.find(j => j.task === 'ITF');
  check('saved: one ITF (driver) and one LFF job with both loaders', !!itf && !!lff && d.jobOf[ids[0]] === itf.key && d.jobOf[ids[1]] === lff.key && d.jobOf[ids[2]] === lff.key, JSON.stringify(d.jobOf));
  // back to one loader, then none
  await p.click('#fh-jobs [data-rbchj="' + itf.key + '"]'); await p.waitForTimeout(400);
  await p.click('#jb-who [data-rbld="' + ids[2] + '"]'); await p.waitForTimeout(150); await p.click('#jb-save'); await p.waitForTimeout(400);
  d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('one loader untick: he goes back to not marked, the other stays (pair)', d.jobOf[ids[1]] === lff.key && !d.jobOf[ids[2]] && !d.marks[ids[2]]);
  await p.click('#fh-jobs [data-rbchj="' + itf.key + '"]'); await p.waitForTimeout(400);
  await p.click('#jb-who [data-rbld=""]'); await p.waitForTimeout(150); await p.click('#jb-save'); await p.waitForTimeout(400);
  d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('"Tiada · pemandu muat sendiri": no LFF job, the driver alone (low season)', !d.jobs.find(j => j.task === 'LFF') && !d.jobOf[ids[1]] && d.jobOf[ids[0]] === itf.key);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
