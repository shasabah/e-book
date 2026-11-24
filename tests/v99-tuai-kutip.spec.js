// E-Book test (1.95) Tuai & kutip in the new look. Brief_Tuai_Kutip_Rupa_Baru, signed by Yu Chen on 24 Nov 2026 ("no 1 ok,
// all build in new look untill i say ok only go actual"); sample "E-Book Tuai Tutup Bersama" version 4 ("yes"). His words:
// "Havest bunches and evacuate ffb to ramp is separate matter"; "each day need to knw which lot been delivery to ramp which
// lot no yet". Made-up names only (Rule 8).
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
    const est = 'SSGT', mandor = (EA.lists.mandorsFor(est) || [])[0], all = EA.lists.workersFor(est) || [], date = EA.today();
    const hv = all.slice(0, 3), drv = all[3], ld = all[4], HL = ['2-1', '2-2'], TL = ['2-1', '2-2', '2-3'];
    const row = (w, i, t, lots) => ({ id: 'r' + t + i, worker_id: w.id, muster: 'H', task_code: t, block: '02', lots: lots.join(' '), mandor: t === 'HA' ? mandor.id : '', status: 'active' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-TK', date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc', alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '02', lots: HL, mandor: mandor.id }, { key: 'j2', task: 'ITF', block: '02', lots: TL }, { key: 'j3', task: 'LFF', block: '02', lots: TL }],
      rows: [row(mandor, 99, 'HA', HL)].concat(hv.map((w, i) => row(w, i, 'HA', HL)), [row(drv, 0, 'ITF', TL), row(ld, 0, 'LFF', TL)]) }]));
    localStorage.setItem('fh.dayclose', JSON.stringify([])); localStorage.setItem('fh.work', JSON.stringify([])); localStorage.setItem('fh.collect', JSON.stringify([]));
    // fruit cut on an earlier day still in the block on 2-3 (the tractor's chit carries it)
    const g = EA.fh.getBacklog; EA.fh.getBacklog = e => { const x = JSON.parse(JSON.stringify(g(e) || {})); x.field = (x.field || []).concat([{ lot: '2-3', block: '02', bunches: 40 }]); return x; };
    return { hv: hv.map(x => x.id), drv: drv.id, ld: ld.id };
  });
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(1500);
  const cards = await p.evaluate(() => [...document.querySelectorAll('[data-rbjob]')].map(c => c.dataset.rbjob).join(','));
  check('two cards: Menuai, and Traktor & pemuat (the loader is inside the tractor\'s card)', cards === 'j1,j2', cards);
  check('the second card is named "Traktor & pemuat · Blok 02", closed together', /Traktor & pemuat · Blok 02/.test(await p.innerText('[data-rbjob="j2"] .rb-jh')) && /ditutup bersama/.test(await p.innerText('[data-rbjob="j2"] .rb-jh')), await p.innerText('[data-rbjob="j2"] .rb-jh'));
  // Menuai: the lot question waits for the last harvester
  await p.click('[data-rbopen] [data-pick-lot="2-1"]'); await p.waitForTimeout(300); await p.keyboard.type('120'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.keyboard.type('100'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  check('with 2 of 3 harvesters keyed there is no "Petak habis dituai?" yet, only the note (2/3)', await p.locator('[data-rbtile]').count() === 0 && /selepas semua penuai diisi \(2\/3\)/.test(await p.innerText('[data-rblots="j1"]')), await p.innerText('[data-rblots="j1"]'));
  await p.click('[data-rbopen] [data-pick-lot="2-2"]'); await p.waitForTimeout(300); await p.keyboard.type('90'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  check('after the last harvester it asks, for each lot with men', await p.evaluate(() => [...document.querySelectorAll('[data-rbtile^="h|"]')].map(b => b.dataset.rbtile.split('|')[2]).filter((x, i, a) => a.indexOf(x) === i).join(',')) === '2-1,2-2');
  await p.click('[data-rbtile=\"h|j1|2-1\"]'); await p.waitForTimeout(150); await p.click('#sheet [data-sv=\"Y\"]'); await p.waitForTimeout(200);
  await p.click('[data-rbtile=\"h|j1|2-2\"]'); await p.waitForTimeout(150); await p.click('#sheet [data-sv=\"N\"]'); await p.waitForTimeout(200); await p.click('#sheet [data-sw=\"hujan\"]'); await p.waitForTimeout(300);
  check('Menuai reads LENGKAP ✓', /LENGKAP ✓/.test(await p.innerText('[data-rbjob="j1"] .rb-jh')));
  // Traktor & pemuat
  await p.click('[data-rbjnext="j1"]'); await p.waitForTimeout(400);
  const j2 = await p.innerText('[data-rbjob="j2"]');
  check('the driver: 1 day set; no separate lot picker (the tiles answer it)', await p.getAttribute(`[data-w="${s.drv}"][data-day="1"]`, 'aria-pressed') === 'true' && await p.locator('[data-alllots],[data-onelot]').count() === 0);
  check('one SEMUA HABIS button and a tile for every lot of the job, none answered', /SEMUA HABIS · 3 petak/.test(j2) && await p.locator('[data-rbtile^="c|j2|"]').count() === 3 && (j2.match(/belum dijawab/g) || []).length === 3, j2.replace(/\s+/g, ' ').slice(0, 400));
  check('2-3 is marked "buah lama" (older fruit), the others "hari ini"', /2-3\s*40 tandan · buah lama/.test(j2) && /2-1\s*220 tandan · hari ini/.test(j2), j2.replace(/\s+/g, ' ').slice(0, 300));
  check('the loader is a line in the same card: PEMUAT · IKUT TIKET', /PEMUAT · IKUT TIKET/.test(j2));
  await p.click('[data-rball="c|j2"]'); await p.waitForTimeout(300);
  check('SEMUA HABIS: one tap answers every lot and the card is complete', /LENGKAP ✓/.test(await p.innerText('[data-rbjob="j2"] .rb-jh')) && (await p.innerText('[data-rbcol="j2"]')).match(/HABIS ✓/g).length === 3);
  await p.click('[data-rbtile="c|j2|2-3"]'); await p.waitForTimeout(150);
  check('a tile opens the sheet: HABIS, BELUM, TIDAK PERGI', (await p.innerText('#sheet .rb-sopts')).replace(/\s+/g, ' ').trim() === 'HABIS BELUM TIDAK PERGI', await p.innerText('#sheet .rb-sopts'));
  await p.click('#sheet [data-sv="X"]'); await p.waitForTimeout(150);
  const q = (await p.innerText('[data-rbcol="j2"]')) + ' TIDAK PERGI';
  check('"Buah habis dikutip ke ramp?" for every lot of the job; 2-3 not gone to reads TIDAK PERGI', /Buah habis dikutip ke ramp\?/.test(q) && /TIDAK PERGI/.test(q) &&
    /TIDAK PERGI · sebab\?/.test(await p.innerText('[data-rbtile="c|j2|2-3"]')), q.replace(/\s+/g, ' ').slice(0, 300));
  check('the sheet shows the bunches in the block before collection (2-3: 40)', /40 tandan di blok sebelum kutip/.test(await p.innerText('#sheet')), q.replace(/\s+/g, ' ').slice(0, 400));
  await p.click('#sheet-x'); await p.waitForTimeout(150);
  await p.click('[data-rbtile=\"c|j2|2-1\"]'); await p.waitForTimeout(150); await p.click('#sheet [data-sv=\"Y\"]'); await p.waitForTimeout(200);
  await p.click('[data-rbtile=\"c|j2|2-2\"]'); await p.waitForTimeout(150); await p.click('#sheet [data-sv=\"N\"]'); await p.waitForTimeout(200);
  check('BELUM asks why: Traktor rosak, Hujan · jalan basah, Tak sempat, Lain-lain', (await p.innerText('#sheet .rb-why')).replace(/\s+/g, ' ').trim() === 'Traktor rosak Hujan · jalan basah Tak sempat Lain-lain');
  await p.click('#sheet [data-sw="rosak"]'); await p.waitForTimeout(200);
  check('the tile reads "BELUM · traktor rosak" and the sheet is closed', /BELUM · traktor rosak/.test(await p.innerText('[data-rbtile="c|j2|2-2"]')) && await p.evaluate(() => document.getElementById('sheet-back').hidden));
  check('not every lot answered: the tractor card is not complete yet', !/LENGKAP ✓/.test(await p.innerText('[data-rbjob="j2"] .rb-jh')));
  await p.click('[data-rbtile="c|j2|2-3"]'); await p.waitForTimeout(150);
  await p.click('#sheet [data-sw="sempat"]'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => { const d = Object.values(JSON.parse(localStorage.getItem('fh.workdraft')))[0]; return { j2: d.status.j2, j3: d.status.j3 }; });
  check('one answer closes both: tractor and loader BELUM SIAP with the same reason, lot by lot',
    st.j2.done === 'N' && st.j3.done === 'N' && st.j2.reason === st.j3.reason && /Petak 2-2 belum ke ramp: traktor rosak/.test(st.j2.reason) && /Petak 2-3 tidak dipergi: tak sempat/.test(st.j2.reason), JSON.stringify(st));
  check('"2 daripada 2 kerja lengkap"', /2 daripada 2 kerja lengkap/.test(await p.innerText('#rb-list')), await p.innerText('.rb-lead'));
  // SIMPAN
  await p.evaluate(() => { localStorage.setItem('ea.queue', '[]'); });
  await p.click('#wk-check'); await p.waitForTimeout(500);
  for (let i = 0; i < 4; i++) { const go = await p.$('#wc-ok, #wp-ok, #ck-go'); if (go) { await go.click(); await p.waitForTimeout(400); } }
  const q2 = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]').map(it => ({ tab: it.tab, task: it.row.task_code, lot: it.row.lot, st: it.row.job_status, pr: it.row.progress, cl: it.row.cleared, note: it.row.note })));
  const job = t => q2.find(x => x.tab === 'FH_JOBDAY' && x.task === t) || {};
  check('the harvest job carries each lot: "2-1 siap, 2-2 belum (hujan)"', job('HA').pr === '2-1 siap, 2-2 belum (hujan)', JSON.stringify(job('HA')));
  check('the tractor and the loader carry each lot the same way', job('ITF').pr === '2-1 siap, 2-2 belum (traktor rosak), 2-3 tidak pergi (tak sempat)' && job('LFF').pr === job('ITF').pr && job('ITF').st === 'not_done', JSON.stringify([job('ITF'), job('LFF')]));
  const col = q2.filter(x => x.tab === 'FH_COLLECT');
  check('only the lot answered HABIS goes to the ramp (2-1), though the tractor job is BELUM SIAP', col.length === 1 && col[0].lot === '2-1' && col[0].cl === 'Y' && /petak habis dikutip/.test(col[0].note), JSON.stringify(col));
  const sv = await p.evaluate(() => { const w = JSON.parse(localStorage.getItem('fh.work')).slice(-1)[0]; return { h: Object.keys(w.hlot || {}), c: Object.keys(w.clot || {}) }; });
  check('the answers are kept with the saved day (for a correction)', sv.h.indexOf('j1') >= 0 && sv.c.indexOf('j2') >= 0, JSON.stringify(sv));
  // next morning: SALIN CHIT LEPAS brings back each job's own open lots, marked, and the WhatsApp text says so
  await p.evaluate(() => {
    const y = new Date(); y.setDate(y.getDate() - 1); const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    const ch = JSON.parse(localStorage.getItem('fh.chits2')); ch.forEach(c => { c.date = yd; }); localStorage.setItem('fh.chits2', JSON.stringify(ch));
    const w = JSON.parse(localStorage.getItem('fh.work')); w.forEach(s => { s.date = yd; s.rec.date = yd; }); localStorage.setItem('fh.work', JSON.stringify(w));
    EA.ui.closeSheet(); localStorage.removeItem('fh.draft2'); localStorage.setItem('fh.dayclose', JSON.stringify([{ estate: 'SSGT', date: yd, closedAt: '18:00', status: 'closed' }]));
    location.hash = 'field-harvest';
  });
  await p.waitForTimeout(1000);
  if (await p.$('#fh-copy')) { await p.click('#fh-copy'); await p.waitForTimeout(700); }
  const nd = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('fh.draft2') || '{}').SSGT || {}; const o = {}; (d.jobs || []).forEach(j => { o[j.task] = j.lots.join(' '); }); return o; });
  check('the harvest gets back only the lot not harvested out (2-2)', nd.HA === '2-2', JSON.stringify(nd));
  check('the tractor and the loader get back only the lots whose fruit is not at the ramp (2-2, 2-3)', nd.ITF === '2-2 2-3' && nd.LFF === '2-2 2-3', JSON.stringify(nd));
  const jl = await p.evaluate(() => (document.querySelector('#fh-jobs') || {}).innerText || '');
  check('on the chit: "SAMBUNG · dari … 2-2 (hujan)" on Menuai, "KUTIP · … 2-2 (traktor rosak), 2-3 (tak sempat)" on the tractor',
    /SAMBUNG · dari .*2-2 \(hujan\)/.test(jl) && /KUTIP · dari .*2-2 \(traktor rosak\), 2-3 \(tak sempat\)/.test(jl), jl.replace(/\s+/g, ' ').slice(0, 500));
  const wa = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('fh.chits2'))[0]; c.date = EA.today(); return EA.fh.chitText(c); });
  check('the WhatsApp text carries "SAMBUNG … Tuai belum habis Blk 02: 2-2 (hujan)" and "Buah belum ke ramp Blk 02: 2-2 (traktor rosak), 2-3 (tak sempat)"',
    /SAMBUNG .* · CARRIED OVER/.test(wa) && /Tuai belum habis Blk 02: 2-2 \(hujan\)/.test(wa) && /Buah belum ke ramp Blk 02: 2-2 \(traktor rosak\), 2-3 \(tak sempat\)/.test(wa), wa.slice(0, 600));
  // the old look is untouched: no lot question on the tractor
  await p.evaluate(() => { EA.setRupaBaru(false); });
  check('the old look still has one SIAP for the tractor (nothing changes for people not ticked)', await p.evaluate(() => !EA.rupaBaru()));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
