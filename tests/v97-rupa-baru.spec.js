// E-Book test (1.92) Rupa Baru — the new look for Kerja, behind its own door. Brief_Rupa_Baru, signed by Yu Chen on 24 Nov 2026
// ("Sign"); his words: "more new user are coming in. if i can simply the key version the sooner the better".
// - The Owner sees CUBA RUPA BARU on Hari ini; it turns the new look on for this phone; KEMBALI turns it off.
// - Kerja shows one job at a time, with the jobs as chips on top and KERJA SETERUSNYA at the bottom.
// - Harvesting: Enter goes to the next man; a man with no lot starts on the lot of the man above (one tap to change).
// - "Petak habis dituai?" once per lot that has men on it; the answers become the job's SIAP / BELUM SIAP and reason.
// - A day job starts at 1 day. The same SIMPAN, the same records.
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload(); await p.fill('#key', '111111'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(600);

  // the door
  check('the Owner sees the purple CUBA RUPA BARU card on Hari ini', await p.isVisible('#rupa-go') && /CUBA RUPA BARU/.test(await p.innerText('#rupa-card')));
  await p.click('#rupa-go'); await p.waitForTimeout(300);
  check('CUBA RUPA BARU turns the new look on for this phone', await p.evaluate(() => EA.rupaBaru() === true) && /KEMBALI KE RUPA LAMA/.test(await p.innerText('#rupa-card')));
  check('a person not ticked does not see it', await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('ea.user')); const k = JSON.stringify(u); u.role = 'Staff'; localStorage.setItem('ea.user', JSON.stringify(u)); const r = EA.rupaBaruAllowed(); localStorage.setItem('ea.user', k); return r === false; }));
  check('a ticked person does', await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('ea.user')); const k = JSON.stringify(u); u.role = 'Staff'; localStorage.setItem('ea.user', JSON.stringify(u)); localStorage.setItem('ea.switches', JSON.stringify({ testModeOff: false, live: {}, rupaBaru: [u.code] })); const r = EA.rupaBaruAllowed(); localStorage.setItem('ea.user', k); return r === true; }));

  const s = await p.evaluate(() => {
    const est = 'SSGT', mandor = (EA.lists.mandorsFor(est) || [])[0], all = EA.lists.workersFor(est) || [];
    const hv = all.slice(0, 3), sp = all.slice(3, 5), date = EA.today(), LOTS = ['2-1', '2-2'];
    const row = (w, i) => ({ id: 'r' + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '02', lots: LOTS.join(' '), mandor: mandor.id, status: 'active' });
    const day = (w, i) => ({ id: 'd' + i, worker_id: w.id, muster: 'H', task_code: 'WM', block: '01', lots: '', status: 'active' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-RB', date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc', alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '02', lots: LOTS, mandor: mandor.id }, { key: 'j2', task: 'WM', block: '01', lots: [] }],
      rows: [row(mandor, 99)].concat(hv.map(row), sp.map(day)) }]));
    localStorage.setItem('fh.dayclose', JSON.stringify([])); localStorage.setItem('fh.work', JSON.stringify([]));
    return { hv: hv.map(x => x.id), sp: sp.map(x => x.id) };
  });
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(1500);
  const openJobs = () => p.evaluate(() => [...document.querySelectorAll('[data-rbjob].on')].map(c => c.dataset.rbjob));
  check('the jobs are one list, one job open at a time (the first not complete)', JSON.stringify(await openJobs()) === '["j1"]' && await p.locator('[data-rbjob]').count() === 2, JSON.stringify(await openJobs()));
  check('a thin heading: ‹ Kerja · the day', /Kerja ·/.test(await p.innerText('.rb-thin')));
  check('"0 daripada 2 kerja lengkap"', /0 daripada 2 kerja lengkap/.test(await p.innerText('#rb-list')));
  check('each job says what is left (0/3 diisi)', /0\/3 diisi/.test(await p.innerText('[data-rbjob="j1"] .rb-jh')));
  const openMen = () => p.evaluate(() => [...document.querySelectorAll('[data-rbopen] input[data-rbin]')].map(i => i.dataset.w).filter((x, i, a) => a.indexOf(x) === i));
  check('one man open at a time: the first', JSON.stringify(await openMen()) === JSON.stringify([s.hv[0]]), JSON.stringify(await openMen()));
  check('the others read BELUM DIISI ›', await p.locator('[data-rbman] .rb-chip.w').count() === 2);
  check('no mandor box, no total box and no warnings between the men', await p.locator('[data-rbjob="j1"] .wk-total, [data-rbjob="j1"] [data-flags]').count() === 0);
  // lot buttons with palms and men, then the number, then SETERUSNYA
  const lotTxt = await p.innerText('[data-rbopen] .rb-lots');
  check('the lot buttons show palms and men ("pk", "kosong")', /pk/.test(lotTxt) && /kosong/.test(lotTxt), lotTxt.replace(/\s+/g, ' ') + ' || ' + (await p.innerHTML('[data-rbopen] .rb-lots')).slice(0, 400));
  await p.click(`[data-rbopen] [data-pick-lot="2-1"]`); await p.waitForTimeout(400);
  check('after a lot is picked the box has the focus', await p.evaluate(w => document.activeElement && document.activeElement.dataset.w === w, s.hv[0]));
  await p.keyboard.type('120'); await p.click('[data-rbnext]'); await p.waitForTimeout(400);
  check('SETERUSNYA folds the man to one line "2-1 · 120 tandan ✓"', /2-1 · 120 tandan ✓/.test(await p.innerText(`[data-rbman="j1|${s.hv[0]}"]`)), await p.innerText(`[data-rbman="j1|${s.hv[0]}"]`));
  check('and opens the next man, his lot already 2-1, his box in focus', JSON.stringify(await openMen()) === JSON.stringify([s.hv[1]]) &&
    await p.evaluate(() => (document.querySelector('[data-rbopen] [data-pick-lot][aria-pressed="true"]') || {}).dataset?.pickLot) === '2-1' &&
    await p.evaluate(w => document.activeElement && document.activeElement.dataset.w === w, s.hv[1]));
  check('progress "1 daripada 3 orang diisi · 120 tandan"', /1 daripada 3 orang diisi · 120 tandan/.test(await p.innerText('[data-rbjob="j1"] .rb-prog')));
  await p.keyboard.type('100'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  check('Enter does the same as SETERUSNYA', JSON.stringify(await openMen()) === JSON.stringify([s.hv[2]]));
  await p.click(`[data-rbopen] [data-pick-lot="2-2"]`); await p.waitForTimeout(400);
  check('one tap changes the lot', await p.evaluate(() => (document.querySelector('[data-rbopen] [data-pick-lot][aria-pressed="true"]') || {}).dataset?.pickLot) === '2-2');
  await p.keyboard.type('90'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  check('after the last man, all three fold, none open', (await openMen()).length === 0 && await p.locator('[data-rbjob="j1"] .rb-ok').count() === 3);
  // Petak habis dituai?
  const lotQ = () => p.evaluate(() => [...document.querySelectorAll('[data-rbtile^="h|"]')].map(b => b.dataset.rbtile.split('|')[2]).filter((x, i, a) => a.indexOf(x) === i).join(','));
  check('"Petak habis dituai?" for each lot with men, with palms, men and bunches', await lotQ() === '2-1,2-2' && /2 org · 220 tandan/.test(await p.innerText('[data-rblots="j1"]')), (await lotQ()) + ' ' + (await p.innerText('[data-rblots="j1"]')).replace(/\s+/g, ' ').slice(0, 160));
  const st = () => p.evaluate(() => { const d = Object.values(JSON.parse(localStorage.getItem('fh.workdraft') || '{}'))[0] || {}; return d.status && d.status.j1; });
  await p.click('[data-rbtile=\"h|j1|2-1\"]'); await p.waitForTimeout(150); await p.click('#sheet [data-sv=\"Y\"]'); await p.waitForTimeout(300);
  check('one lot answered: the job is not decided yet', !((await st()) || {}).done, JSON.stringify(await st()));
  await p.click('[data-rbtile=\"h|j1|2-2\"]'); await p.waitForTimeout(150); await p.click('#sheet [data-sv=\"N\"]'); await p.waitForTimeout(300);
  check('BELUM asks why: Petak besar, Hujan, Kurang orang, Lain-lain', (await p.innerText('#sheet .rb-why')).replace(/\s+/g, ' ').trim() === 'Petak besar Hujan Kurang orang Lain-lain', await p.innerText('#sheet .rb-why'));
  await p.click('#sheet [data-sw=\"hujan\"]'); await p.waitForTimeout(300);
  let j1 = await st();
  check('the answers make the job BELUM SIAP with its reason written', j1 && j1.done === 'N' && /Petak 2-2 belum habis: hujan, sambung esok/.test(j1.reason), JSON.stringify(j1));
  await p.click('[data-rbtile=\"h|j1|2-2\"]'); await p.waitForTimeout(150); await p.click('#sheet [data-sv=\"Y\"]'); await p.waitForTimeout(300);
  j1 = await st();
  check('every lot HABIS makes the job SIAP', j1 && j1.done === 'Y' && j1.reason === '', JSON.stringify(j1));
  check('the job reads LENGKAP ✓ and offers KERJA SETERUSNYA ›', /LENGKAP ✓/.test(await p.innerText('[data-rbjob="j1"] .rb-jh')) && await p.isVisible('[data-rbjnext="j1"]'));
  await p.click('[data-rbjnext="j1"]'); await p.waitForTimeout(400);
  check('KERJA SETERUSNYA opens the next job', JSON.stringify(await openJobs()) === '["j2"]');
  check('a day job: 1 day already set for everyone, ½ one tap away', await p.evaluate(ws => ws.every(w => (document.querySelector('[data-w="' + w + '"][data-day="1"]') || {}).getAttribute('aria-pressed') === 'true'), s.sp));
  await p.click('[data-rbjob="j2"] [data-st="j2"][data-v="Y"]'); await p.waitForTimeout(300);
  check('"2 daripada 2 kerja lengkap"', /2 daripada 2 kerja lengkap/.test(await p.innerText('#rb-list')) || /LENGKAP ✓/.test(await p.innerText('[data-rbjob="j2"] .rb-jh')), await p.innerText('[data-rbjob="j2"] .rb-jh'));
  check('the same SIMPAN as always', await p.isVisible('#wk-check'));

  // back to the old look: everything shows, nothing lost
  await p.evaluate(() => { EA.setRupaBaru(false); location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(1200);
  const vis = () => p.evaluate(() => [...document.querySelectorAll('section[data-job]')].filter(c => !c.hidden).map(c => c.dataset.job));
  check('back in the old look every job shows again, with the same keyed numbers', JSON.stringify(await vis()) === '["j1","j2"]' && await p.inputValue(`[data-job="j1"] input[data-f="bunches"][data-w="${s.hv[0]}"]`) === '120', JSON.stringify(await vis()));

  // the Owner's tick list (Pengguna & PIN → RUPA BARU · SIAPA BOLEH CUBA)
  const p2 = await b.newPage({ viewport: { width: 390, height: 1000 } });
  const sent = []; p2.on('pageerror', e => errs.push(e.message));
  let ticked = [];
  await p2.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); sent.push(bd);
    const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '', rupaBaru: ticked };
    let o = { ok: false, error: 'busy' };
    if (bd.action === 'login') o = { ok: true, user: { code: 'OWN-ALL-01', name: 'Pemilik', role: 'Owner', estates: ['SSGT', 'PTAN'] }, sw };
    else if (bd.action === 'users') o = { ok: true, me: 'OWN-ALL-01', users: [
      { code: 'OWN-ALL-01', name: 'Pemilik', role: 'Owner', estates: ['SSGT', 'PTAN', 'MELU', 'KWNN', 'SDK'], status: 'active', phones: ['P01'] },
      { code: 'HQ-SDK-01', name: 'Kerani HQ', role: 'HQ', estates: ['SSGT', 'PTAN', 'MELU', 'KWNN', 'SDK'], status: 'active', phones: ['P02'] },
      { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'], status: 'active', phones: ['P13'] },
      { code: 'L-STF-SSGT-01', name: 'Latihan Staf', role: 'Staff', estates: ['SSGT'], status: 'active', practice: true, phones: [] }] };
    else if (bd.action === 'adminSwitch') { ticked = bd.codes.slice(); o = { ok: true, rupaBaru: ticked }; }
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p2.goto('http://localhost:8765/index.html');
  await p2.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P01')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); EA.setLang('bm'); });
  await p2.reload(); await p2.fill('#key', '123456'); await p2.waitForSelector('#home:not([hidden])');
  await p2.evaluate(() => { location.hash = 'users'; }); await p2.waitForSelector('#us-rupa');
  await p2.waitForTimeout(500);
  await p2.click('#us-rupa'); await p2.waitForSelector('#rb-save');
  const ticks = () => p2.evaluate(() => [...document.querySelectorAll('[data-rupa]')].map(b => b.dataset.rupa + ':' + b.getAttribute('aria-pressed') + (b.disabled ? ':lock' : '')).join(' '));
  let t0 = await ticks();
  check('the tick list has every real person; the Owner is ticked and locked; no practice login', /OWN-ALL-01:true:lock/.test(t0) && /HQ-SDK-01:false/.test(t0) && /STF-SSGT-01:false/.test(t0) && !/L-STF/.test(t0), t0);
  await p2.click('[data-rupa="HQ-SDK-01"]'); await p2.waitForTimeout(200);
  check('a tap ticks a person, and the count goes up', /HQ-SDK-01:true/.test(await ticks()) && /2 orang ditanda/.test(await p2.innerText('.us .rupa-card')), (await ticks()) + ' / ' + (await p2.innerText('.us .rupa-card')));
  await p2.click('#rb-save'); await p2.waitForSelector('#us-rupa');
  const as = sent.find(x => x.action === 'adminSwitch');
  check('SIMPAN sends the whole list once, as the switch rupaBaru', !!as && as.which === 'rupaBaru' && JSON.stringify(as.codes) === '["HQ-SDK-01"]', JSON.stringify(as));
  check('the purple RUPA BARU tag shows beside the ticked person (and the Owner)', await p2.evaluate(() => { const r = c => (document.querySelector('[data-user="' + c + '"]') || {}).innerText || ''; return /RUPA BARU/.test(r('HQ-SDK-01')) && /RUPA BARU/.test(r('OWN-ALL-01')) && !/RUPA BARU/.test(r('STF-SSGT-01')); }));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
