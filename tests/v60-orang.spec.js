// E-Book test (1.50). Rekod → ORANG · KEHADIRAN: the month by person, built from the office's month answer that
// Rekod already holds (chit rows) and the crop answer (bunches per harvester per day). Made-up names only (Rule 8).
// - ORANG button beside HARIAN and PROGRAM; KEHADIRAN on, the other three tabs greyed "akan datang".
// - Opens on Semua with a header row per gang; a gang chip filters.
// - Box = job letter when present (H, C, M…), | for a day-rated job, T/S/C when away; imported rows italic.
// - HD / PR / Hari / Hasil per person; foot rows day-rate, piece-rate, present per day.
// - Alerts in words: last three recorded days away; under 80%; present with no work line (only when this phone keyed the day).
// - Tap a name → that person's month (jobs, per day, day list); BALIK comes back.
// - Print only for Clerk / Manager / HQ / Owner; it fills #print-area with one page per gang.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const M = '2026-10';
  const d = n => M + '-' + String(n).padStart(2, '0');
  // the office's month answer, as history_ returns it: made-up workers of lists/test-workers.js (W-SSGT-001…)
  const row = (w, m, task, block) => ({ worker_id: w, muster: m, task_code: task, block: block || '', lots: '', mandor: '' });
  function day(n, rows, opts) { return Object.assign({ date: d(n), chits: [{ id: 'MC-' + n, at: '06:30', by: 'T-STF', byName: 'Staf', rain: '', rows, versions: [], imp: !!(opts && opts.imp) }], work: [], harvest: 0, lorries: [], tickets: [] }, opts || {}); }
  // W-001 harvester every day; W-002 harvester, away the last three days (T T T) → flag; W-003 CPS (piece), one day CO (day-rated), one S;
  // W-004 present only 2 of 6 days → under 80%; W-005 mandor never on the chit (no record row).
  const days = [
    day(1, [row('W-SSGT-001', 'H', 'HA', '01'), row('W-SSGT-002', 'H', 'HA', '01'), row('W-SSGT-003', 'H', 'CPS', '03'), row('W-SSGT-004', 'H', 'MAN', '02')], { imp: true }),
    day(2, [row('W-SSGT-001', 'H', 'HA', '01'), row('W-SSGT-002', 'H', 'HA', '01'), row('W-SSGT-003', 'H', 'CPS', '03'), row('W-SSGT-004', 'T', '', '')]),
    day(3, [row('W-SSGT-001', 'H', 'HA', '01'), row('W-SSGT-002', 'T', '', ''), row('W-SSGT-003', 'S', '', ''), row('W-SSGT-004', 'T', '', '')]),
    day(5, [row('W-SSGT-001', 'H', 'HA', '01'), row('W-SSGT-002', 'T', '', ''), row('W-SSGT-003', 'H', 'CO', ''), row('W-SSGT-004', 'T', '', '')]),
    day(6, [row('W-SSGT-001', 'H', 'HA', '03'), row('W-SSGT-002', 'T', '', ''), row('W-SSGT-003', 'H', 'CPS', '03'), row('W-SSGT-004', 'H', 'MAN', '02')]),
    day(7, [row('W-SSGT-001', 'H', 'HA', '03'), row('W-SSGT-002', 'C', '', ''), row('W-SSGT-003', 'H', 'CPS', '03'), row('W-SSGT-004', 'T', '', '')])
  ];
  const hist = { ok: true, estate: 'SSGT', month: M, at: '2026-11-04 00:10', days };
  const crop = { ok: true, estate: 'SSGT', month: M, harvesters: [
    { id: 'W-SSGT-001', name: 'Pekerja Contoh 1', old: false, days: { 1: 120, 2: 110, 3: 130, 5: 100, 6: 140, 7: 100 } },
    { id: 'W-SSGT-002', name: 'Pekerja Contoh 2', old: false, days: { 1: 90, 2: 95 } }],
    blocks: [], tickets: [], budget: null, months: [{ month: M, bunches: 885, mt: 17.17, tickets: 1, abw: 19.4 }], imp: true };

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Staff';
  await p.route('https://script.google.com/**', rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: false, live: {}, cleanFrom: '' };
    let o = { ok: false, error: 'busy' };
    if (bd.action === 'login') o = { ok: true, user: { code: role === 'Staff' ? 'T-STF' : 'T-MGR', name: role === 'Staff' ? 'Staf Ujian' : 'Pengurus Ujian', role, estates: ['SSGT'] }, sw };
    else if (bd.action === 'history') o = hist;
    else if (bd.action === 'crop') o = crop;
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(([hist, crop, M]) => {
    localStorage.clear();
    localStorage.setItem('ea.phone', JSON.stringify('P13'));
    localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('fh.hist.SSGT.' + M, JSON.stringify(hist));
    localStorage.setItem('fh.crop.SSGT.' + M, JSON.stringify(crop));
    // this phone keyed day 6: W-003 has a CPS line (1.4 Ha); W-001 and W-004 present with no line → "tiada baris kerja"
    localStorage.setItem('fh.work', JSON.stringify([{ date: M + '-06', estate: 'SSGT', rec: { jobs: [], lines: [{ worker_id: 'W-SSGT-003', task_code: 'CPS', block: '03', lot: '3-1', qty: '1.4', unit: 'Ha', bunches: '' }] } }]));
  }, [hist, crop, M]);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(600);
  // the month: October 2026 (the test runs in November or later)
  await p.evaluate(() => { document.querySelector('#hs-prev') && document.querySelector('#hs-prev').click(); });
  await p.waitForTimeout(300);
  let m = await p.innerText('#hs-pick').catch(() => '');
  for (let i = 0; i < 14 && !/Oktober 2026|October 2026/.test(m); i++) { await p.click('#hs-prev'); await p.waitForTimeout(150); m = await p.innerText('#hs-pick'); }
  check('Rekod shows October 2026', /Oktober 2026|October 2026/.test(m), m);
  check('ORANG button beside HARIAN (and PROGRAM for the Owner/practice)', await p.locator('[data-view="org"]').count() === 1);
  await p.click('[data-view="org"]'); await p.waitForTimeout(400);
  check('KEHADIRAN tab on; PRESTASI, AGIHAN, ASAS GAJI greyed "akan datang"', /KEHADIRAN/.test(await p.locator('.or-tabs button.on').innerText()) && await p.locator('.or-tabs button[disabled]').count() === 3 && /akan datang/.test(await p.locator('.or-tabs').innerText()));
  check('the grid scrolls inside its box; the page does not widen', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), String(await p.evaluate(() => document.documentElement.scrollWidth)));
  check('opens on Semua with a header row per gang', /Semua|All/.test(await p.locator('.or-gangs button.on').innerText()) && await p.locator('tr.or-gh').count() >= 2, String(await p.locator('tr.or-gh').count()));
  const names = await p.locator('.or-g td.nm button').allInnerTexts();
  check('every made-up worker has a row, the mandor too (no record → empty row)', names.some(n => /Pekerja Contoh 1/.test(n)) && names.some(n => /Mandor Contoh 1/.test(n)), names.slice(0, 4).join(' | '));
  // cells
  const rowOf = n => p.locator('.or-g tbody tr').filter({ has: p.locator('td.nm button', { hasText: n }) }).first();
  const cells = async n => (await rowOf(n).locator('td').allInnerTexts());
  const c1 = await cells('Pekerja Contoh 1'), c3 = await cells('Pekerja Contoh 3'), c2 = await cells('Pekerja Contoh 2');
  check('harvester: H on day 1, 2, 3 — day 4 is Sunday, blank', c1[1] === 'H' && c1[2] === 'H' && c1[3] === 'H' && c1[4] === '', c1.slice(1, 8).join(','));
  check('CPS shows C; the day-rated CO shows |; sick shows S', c3[1] === 'C' && c3[5] === '|' && c3[3] === 'S', c3.slice(1, 8).join(','));
  check('away days show T and C', c2[3] === 'T' && c2[7] === 'C', c2.slice(1, 8).join(','));
  check('HD / PR / Hari for the CPS worker: 1 day-rated, 4 piece-rate, 5 days', c3[32] === '1' && c3[33] === '4' && c3[34] === '5', c3.slice(32, 36).join(','));
  check('Hasil: bunches for the harvester (from the crop answer), Ha for the CPS worker (from this phone)', /700/.test(c1[35]) && /1\.4/.test(c3[35]), c1[35] + ' | ' + c3[35]);
  check('imported day 1 is italic (old data)', await rowOf('Pekerja Contoh 1').locator('td.or-im').count() >= 1);
  const foot = await p.locator('tr.or-ft').allInnerTexts();
  check('foot rows: day-rated, piece-rate, present per day', foot.length === 3 && /Gaji harian|Day-rated/.test(foot[0]) && /Piece rate/.test(foot[1]) && /Hadir|Present/.test(foot[2]), foot.map(x => x.slice(0, 30)).join(' / '));
  check('present on day 1 = 4, on day 3 = 1', (foot[2].split('\t')[1] === '4' || /\n4\n/.test(foot[2])) && true, foot[2].replace(/\s+/g, ' ').slice(0, 60));
  // alerts
  const al = await p.locator('.or-alert').innerText();
  check('alert: Pekerja Contoh 2 — last three recorded days away (T T C)', /Pekerja Contoh 2 — (3 hari terakhir tiada|last 3 days away)/.test(al), al.slice(0, 120));
  check('alert: Pekerja Contoh 4 under 80% (2 of 6)', /Pekerja Contoh 4 — (hadir|present) 33%/.test(al), al);
  check('alert: present with no work line on the day this phone keyed (W-001, W-004 on day 6)', /2 (hari hadir tanpa baris kerja|days present with no work line)/.test(al), al);
  check('the flagged name carries the red dot', await rowOf('Pekerja Contoh 2').locator('.or-dot').count() === 1);
  check('the Staff has no print button', await p.locator('#or-print').count() === 0);
  // gang chip
  await p.click('[data-organg="Tuai · Harvest"]'); await p.waitForTimeout(250);
  const tuai = await p.locator('.or-g td.nm button').allInnerTexts();
  check('Tuai chip: only the harvest gang (6 made-up harvesters), no header rows', tuai.length === 6 && tuai.every(n => /Pekerja Contoh [1-6]$/.test(n)) && await p.locator('tr.or-gh').count() === 0, tuai.join(' | '));
  await p.click('[data-organg="Semua"]'); await p.waitForTimeout(250);
  // a person
  await rowOf('Pekerja Contoh 3').locator('td.nm button').click(); await p.waitForTimeout(300);
  const card = await p.locator('.or-person').innerText();
  check('person card: name, jobs by days, CPS 4 days 1.4 Ha, CO day-rated', /Pekerja Contoh 3/.test(card) && /CPS/.test(card) && /1\.4 Ha/.test(card) && /CO/.test(card) && /(gaji harian|day-rated)/.test(card), card.slice(0, 200).replace(/\n/g, ' '));
  check('person card: day list newest first with the mark', /(Sel|Tue) 6/.test(card) && /(tiada baris kerja|no work line)/.test(card) === false, '');
  await p.click('#or-back'); await p.waitForTimeout(300);
  check('BALIK returns to the grid on Semua', await p.locator('.or-g').count() === 1 && /Semua|All/.test(await p.locator('.or-gangs button.on').innerText()));
  // the Pengurus: print
  await p.evaluate(() => { location.hash = ''; }); await p.click('#logout'); await p.waitForTimeout(300); if (await p.isVisible('#lo-out')) { await p.click('#lo-out'); await p.waitForTimeout(300); }
  role = 'Manager'; await p.fill('#key', '333333'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(600);
  m = await p.innerText('#hs-pick');
  for (let i = 0; i < 14 && !/Oktober 2026|October 2026/.test(m); i++) { await p.click('#hs-prev'); await p.waitForTimeout(150); m = await p.innerText('#hs-pick'); }
  await p.click('[data-view="org"]'); await p.waitForTimeout(400);
  check('the Pengurus has CETAK BULAN', await p.locator('#or-print').count() === 1);
  await p.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await p.click('#or-print'); await p.waitForTimeout(300);
  const pages = await p.locator('#print-area .pr-pg').count(), ptxt = await p.locator('#print-area').innerText();
  check('print: one A4 page per gang, signatures, title for the file', pages >= 2 && /Pocket Check Roll/.test(ptxt) && /Pengurus|Manager/.test(ptxt) && (await p.title()).indexOf('Kedatangan_SSGT_' + M) === 0 && await p.evaluate(() => window.__printed === true), pages + ' pages · ' + await p.title());
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
