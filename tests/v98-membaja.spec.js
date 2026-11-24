// E-Book test (1.94) Membaja in the new look. Brief_Membaja_Rupa_Baru, signed by Yu Chen on 24 Nov 2026 ("since is the new
// look . i sign and do it now"); sample "E-Book Membaja" approved ("ok"). His rules: "dose and variety of fertilizer in the
// programme cannot be change unless aprroval from the owner"; "the bag should have option split even".
// Made-up names and fertiliser only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.rupaBaru', '1'); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload(); await p.fill('#key', '111111'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(400);
  const s = await p.evaluate(() => {
    const est = 'SSGT', all = EA.lists.workersFor(est), date = EA.today(), month = date.slice(0, 7);
    localStorage.setItem('fh.prog.' + est + '.' + month, JSON.stringify({ at: Date.now(), programme: [{ task: 'MAN', block: '01', month: month, round: 'Baja Contoh', ha: 30, dose: 2.5 }], lots: {}, lotJobs: {} }));
    const men = all.slice(0, 2).map(w => w.id), LOTS = ['1-13', '1-14', '1-15', '1-16', '1-17'];
    const d = { date: date, marks: {}, jobOf: {}, jobs: [{ key: 'j1', task: 'MAN', block: '01', lots: LOTS, mandor: '' }], nextJob: 2, checker: 'Ujian', rain_mm: '0', rain_time: '' };
    men.forEach(w => { d.marks[w] = 'H'; d.jobOf[w] = 'j1'; });
    all.slice(2).concat(EA.lists.mandorsFor(est)).forEach(w => { d.marks[w.id] = 'C'; });
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: d }));
    return { men, lots: LOTS };
  });
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);
  const pan = () => p.evaluate(() => (document.querySelector('.man-panel') || {}).innerText || '');
  let t = await pan();
  check('chit: the fertiliser and dose come from the programme, locked', /🔒 Ikut program · Baja Contoh · 2.5 kg sepokok/.test(t), t.replace(/\s+/g, ' ').slice(0, 200));
  check('chit: bags per lot = palms × dose ÷ 50, rounded up (1-13 158 palms → 8)', /1-13 · 8/.test(t) && /=\s*35 beg/.test(t), t.replace(/\s+/g, ' ').slice(0, 260));
  check('chit: 2 men × 20 = 40, 35 planned → KURANG 5 beg', /2 × 20 = 40 beg/.test(t) && /KURANG 5 beg/.test(t), t.replace(/\s+/g, ' ').slice(0, 300));
  check('chit: BAWA DARI STOR 35 beg', /BAWA DARI STOR[\s\S]*35 beg/.test(t));
  check('chit: the dose has no box to type — only a request to the Owner', await p.locator('.man-panel input').count() === 0 && await p.locator('[data-mreq]').count() === 1);
  // ask for a change
  await p.click('[data-mreq="j1"]'); await p.waitForSelector('#mr-ok');
  await p.fill('#mr-d', '2'); await p.fill('#mr-w', 'pokok muda di petak 1-17'); await p.click('#mr-ok'); await p.waitForTimeout(300);
  t = await pan();
  check('MINTA TUKAR: shows "menunggu lulus Pemilik", the chit keeps the programme dose', /menunggu lulus Pemilik/i.test(t) && /2.5 kg sepokok/.test(t) && /=\s*35 beg/.test(t), t.replace(/\s+/g, ' ').slice(0, 300));
  // save the chit
  await (async () => { if (await p.$('#fh-rain-no') && await p.getAttribute('#fh-rain-no', 'aria-pressed') !== 'true') { await p.click('#fh-rain-no'); await p.waitForTimeout(150); } await p.click('#fh-check'); })();
  await p.waitForTimeout(400); if (await p.$('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
  await p.waitForSelector('#cf-ok'); await p.click('#cf-ok'); await p.waitForTimeout(600);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]').map(it => ({ tab: it.tab, kind: it.row.kind, lot: it.row.lot, bags: it.row.bags, mat: it.row.material, dose: it.row.dose, detail: it.row.detail })));
  const bawa = q.filter(x => x.tab === 'FH_MATERIAL' && x.kind === 'bawa');
  check('SIMPAN CHIT: one FH_MATERIAL "bawa" row a lot, 35 bags in all, fertiliser and dose with it', bawa.length === 5 && bawa.reduce((a, x) => a + x.bags, 0) === 35 && bawa.every(x => x.mat === 'Baja Contoh' && x.dose === 2.5), JSON.stringify(bawa).slice(0, 300));
  const ask = q.find(x => x.tab === 'FH_ALERT' && x.kind === 'doseask');
  check('the change goes to the Owner as one alert "doseask"', !!ask && /Baja Contoh 2.5 kg → Baja Contoh 2 kg/.test(ask.detail), JSON.stringify(ask));
  const wa = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('fh.chits2')).slice(-1)[0]; return EA.fh.chitText(c); });
  check('the WhatsApp chit says BAWA DARI STOR and the change asked', /BAWA DARI STOR · Membaja Blk 01: 35 beg Baja Contoh/.test(wa) && /Minta tukar \(lulus Pemilik\)/.test(wa), wa.split('\n').filter(l => /BAWA|Minta/.test(l)).join(' | '));

  // ---------- Kerja ----------
  await p.evaluate(() => { EA.ui.closeSheet(); location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(1200);
  const body = () => p.innerText('[data-rbjob].on .rb-jb');
  t = await body();
  check('Kerja: 🔒 fertiliser and dose, bawa 35 beg', /🔒 Baja Contoh · 2.5 kg sepokok · bawa 35 beg/.test(t), t.slice(0, 160));
  check('Kerja: ① lots first, each with what it needs', /① Petak habis dibaja\?/.test(t) && /1-13 · perlu 8 beg/.test(t));
  for (const l of s.lots) { await p.click(`[data-ml="j1|${l}|Y"]`); await p.waitForTimeout(120); }
  t = await body();
  check('HABIS fills the bags the lot needed, dose right', (await p.inputValue('[data-mused="j1|1-13"]')) === '8' && /dos betul/.test(t));
  await p.fill('[data-mused="j1|1-15"]', '5'); await p.press('[data-mused="j1|1-15"]', 'Tab'); await p.waitForTimeout(250);
  t = await body();
  check('5 bags on a lot that needs 7: "dos kurang?" and the reasons', /dos kurang\?/.test(t) && /Pokok mati \/ kosong/.test(t), t.replace(/\s+/g, ' ').slice(0, 400));
  await p.click('[data-mwhy="j1|1-15|pokok"]'); await p.waitForTimeout(200);
  await p.click('[data-ml="j1|1-17|N"]'); await p.waitForTimeout(150);
  await p.fill('[data-mused="j1|1-17"]', '2'); await p.press('[data-mused="j1|1-17"]', 'Tab'); await p.waitForTimeout(250);
  await p.click('[data-mwhy="j1|1-17|hujan"]'); await p.waitForTimeout(200);
  t = await body();
  check('BELUM: baki 4 beg · sambung esok', /baki 4 beg · sambung esok/.test(t));
  check('bawa 35 · guna 29 · pulang 6', /35\s*bawa[\s\S]*29\s*guna[\s\S]*6\s*pulang/.test(t), t.replace(/\s+/g, ' ').match(/\d+ bawa.*pulang/));
  await p.click('[data-meven="j1"]'); await p.waitForTimeout(250);
  const bags = await p.evaluate(m => { const d = Object.values(JSON.parse(localStorage.getItem('fh.workdraft')))[0]; return m.map(w => d.pbags.j1[w]); }, s.men);
  check('BAHAGI SAMA: 29 ÷ 2 = 15 + 14 (the extra to the first man)', bags.join('+') === '15+14', bags.join('+'));
  await p.click('[data-mpul="j1|N"]'); await p.waitForTimeout(150); await p.click('[data-mpulw="j1|ladang"]'); await p.waitForTimeout(200);
  check('the job reads LENGKAP ✓', /LENGKAP ✓/.test(await p.innerText('[data-rbjob="j1"] .rb-jh')), await p.innerText('[data-rbjob="j1"] .rb-jh'));
  const st = await p.evaluate(() => { const d = Object.values(JSON.parse(localStorage.getItem('fh.workdraft')))[0]; return { st: d.status.j1, dose: d.dose.j1, prog: d.prog.j1, why: d.lotwhy.j1 }; });
  check('the old screen\'s fields are filled: job BELUM SIAP, 1-17 not done with its reason, the dose from the programme', st.st.done === 'N' && st.prog['1-17'] === '0' && st.prog['1-13'] === '100' && /hujan · baki 4 beg/.test(st.why['1-17'].note) && st.dose === '2.5', JSON.stringify(st).slice(0, 300));
  // SIMPAN
  await p.evaluate(() => { localStorage.setItem('ea.queue', '[]'); });
  await p.click('#wk-check'); await p.waitForTimeout(500);
  const sheet1 = await p.evaluate(() => document.getElementById('sheet').innerText.replace(/\s+/g, ' ').slice(0, 300));
  for (let i = 0; i < 3; i++) { const go = await p.$('#wc-ok, #wp-ok, #ck-go'); if (go) { await go.click(); await p.waitForTimeout(400); } }
  const q2 = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]').map(it => ({ tab: it.tab, kind: it.row.kind, lot: it.row.lot, bags: it.row.bags, done: it.row.done, reason: it.row.reason, task: it.row.task_code })));
  const guna = q2.filter(x => x.tab === 'FH_MATERIAL' && x.kind === 'guna'), pul = q2.find(x => x.tab === 'FH_MATERIAL' && x.kind === 'pulang');
  check('SIMPAN: one "guna" row a lot, 29 bags in all, the short lot and the unfinished lot with their reasons', guna.length === 5 && guna.reduce((a, x) => a + x.bags, 0) === 29 &&
    /dos kurang: Pokok mati/.test(guna.find(x => x.lot === '1-15').reason) && guna.find(x => x.lot === '1-17').done === 'N' && /Hujan/.test(guna.find(x => x.lot === '1-17').reason), JSON.stringify(guna).slice(0, 400));
  check('and one "pulang" row: 0 back, "Tinggal di ladang"', !!pul && pul.bags === 0 && pul.reason === 'Tinggal di ladang', JSON.stringify(pul));
  const work = q2.filter(x => x.tab === 'FH_WORK' && x.task === 'MAN');
  check('the work lines are saved as before (FH_WORK, MAN)', work.length >= 2, String(work.length) + ' · ' + sheet1);
  const ap = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('fh.chits2')).slice(-1)[0];
    localStorage.setItem('ea.todo.SSGT', JSON.stringify({ at: Date.now(), code: 'x', items: [{ id: 'DD:A2', dose: { chit: c.chit, block: '01', fert: 'Baja Contoh', dose: 2, ok: true } }] }));
    return [EA.fh.manApproved('SSGT', c.chit, '01'), EA.fh.manApproved('SSGT', 'OTHER', '01')]; });
  check('a LULUS from the Owner (on the staff\'s Perlu tindakan) gives that chit and block the new dose, and nothing else', ap[0] && ap[0].dose === 2 && ap[1] === null, JSON.stringify(ap));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
