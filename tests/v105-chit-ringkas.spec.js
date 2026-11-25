// E-Book test (1.104) Chit ringkas in the new look. Brief_Chit_Ringkas_Rupa_Baru 1.0, Yu Chen 25 Nov 2026 ("Ok" on the
// sample and the brief). His photos: the chit is still a long list, and the total Ha shows only after the lots are saved.
// Measured on 1.103 with 4 jobs and 20 men: 5,614 px. Now: each job one line (lots, total Ha, men, a red label when not
// complete) that opens the job sheet; the sheet shows "N petak · X Ha" while lots are tapped; Kehadiran lists only the
// men still to mark; the chit table and the backlog fold to one line. The old look is unchanged. Made-up data (Rule 8).
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
  const s = await p.evaluate(() => {
    const est = 'SSGT', all = EA.lists.workersFor(est) || [];
    const d = { date: EA.today(), nextJob: 5, marks: {}, jobOf: {}, rain_mm: '0', rain_time: '',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-9', '1-11', '1-12', '1-13', '1-14', '1-15', '1-16', '1-17'], mandor: '' },
        { key: 'j2', task: 'ITF', block: '01', lots: ['1-9', '1-11'], mandor: '' }, { key: 'j3', task: 'CPS', block: '02', lots: [], mandor: '' }, { key: 'j4', task: 'MDR', block: '', lots: [], mandor: '' }] };
    all.forEach((w, i) => { if (i < 6) { d.marks[w.id] = 'H'; d.jobOf[w.id] = 'j1'; } else if (i === 6) { d.marks[w.id] = 'H'; d.jobOf[w.id] = 'j2'; } else if (i === 7) { d.marks[w.id] = 'H'; d.jobOf[w.id] = 'j4'; } else if (i === 8) d.marks[w.id] = 'S'; else if (i === 9) d.marks[w.id] = 'C'; });
    EA.lists.mandorsFor(est).forEach(m => { d.marks[m.id] = 'C'; });
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: d }));
    const left = all.slice(10).map(w => w.id);
    return { ha: all.slice(0, 6).map(w => w.id), drv: all[6].id, sick: all[8].id, left, n: all.length };
  });
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);
  const wide = () => p.evaluate(() => document.documentElement.scrollWidth);
  const ha = await p.innerText('[data-rbchj="j1"]');
  check('each job is one line: "HA · Menuai BTS · Blk 01 · 8 petak · 7.57 Ha · 6 orang ✓"', /HA[\s\S]*Menuai BTS[\s\S]*Blk 01 · 8 petak · 7\.57 Ha · 6 orang/.test(ha) && /✓/.test(ha), ha.replace(/\s+/g, ' '));
  check('no PICK / EDIT buttons on the chit any more', await p.locator('#fh-jobs [data-pick], #fh-jobs [data-edit]').count() === 0);
  check('a job with nobody on it shows red "PILIH ORANG" (CPS)', /PILIH ORANG/.test(await p.innerText('[data-rbchj="j3"]')), await p.innerText('[data-rbchj="j3"]'));
  const rowsH = await p.evaluate(() => Math.round(document.querySelector('#fh-jobs').getBoundingClientRect().height));
  check('4 jobs take under 300 px', rowsH < 300, rowsH + ' px');

  // the job sheet: lots with a live total, and the men on the job
  await p.click('[data-rbchj="j1"]'); await p.waitForTimeout(400);
  check('tapping the line opens the job sheet with "8 petak · 7.57 Ha" and its target', /8 petak · 7\.57 Ha/.test(await p.innerText('#jb-tot')) && /Sasaran: 6 × 1\.5 = 9 MT/.test(await p.innerText('#jb-tot')), await p.innerText('#jb-tot'));
  await p.click('#jb-lots [data-lot="1-18"]'); await p.waitForTimeout(200);
  check('a lot tapped: the total changes at once ("9 petak · 8.24 Ha"), and SIMPAN carries it', /9 petak · 8\.24 Ha/.test(await p.innerText('#jb-tot')) && /SIMPAN · 9 PETAK · 8\.24 HA/i.test(await p.innerText('#jb-save')), await p.innerText('#jb-save'));
  const on = await p.evaluate(() => [...document.querySelectorAll('#jb-who [data-rbman][aria-pressed="true"]')].map(b => b.dataset.rbman).join(','));
  check('the sheet shows the 6 men now on the job, ticked', on.split(',').sort().join(',') === s.ha.slice().sort().join(','), on);
  await p.click('#jb-who [data-rbman="' + s.ha[5] + '"]'); await p.waitForTimeout(150);
  await p.click('#jb-save'); await p.waitForTimeout(500);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('saved: 9 lots on HA, the unticked man off the job and back to not marked', d.jobs[0].lots.length === 9 && !d.marks[s.ha[5]] && !d.jobOf[s.ha[5]] && d.jobOf[s.ha[0]] === 'j1', JSON.stringify(d.jobs[0].lots));
  check('the line now reads 9 petak · 8.24 Ha · 5 orang', /9 petak · 8\.24 Ha · 5 orang/.test(await p.innerText('[data-rbchj="j1"]')), await p.innerText('[data-rbchj="j1"]'));

  // attendance: only who is left
  const rows = await p.innerText('#fh-rows');
  check('Kehadiran opens with the counts "7 dalam kerja · N tidak bekerja · N belum ditanda"', /7 dalam kerja · \d+ tidak bekerja · \d+ belum ditanda/.test(rows), rows.split('\n')[0]);
  const listed = await p.evaluate(() => [...document.querySelectorAll('#fh-rows .wrow .seg button[data-k="H"]')].map(b => b.dataset.w));
  const want = s.left.concat([s.ha[5]]);
  check('only the men not marked are listed with H S C T (men on a job are not)', listed.length === want.length && want.every(id => listed.indexOf(id) >= 0) && listed.indexOf(s.ha[0]) < 0, listed.length + ' listed');
  check('the sick man is one short line "S · Sakit · TUKAR"', /S · Sakit · TUKAR/.test(await p.innerText('[data-rbrow="' + s.sick + '"]')));
  await p.click('[data-rbrow="' + s.sick + '"]'); await p.waitForTimeout(300);
  check('TUKAR opens his row again (H S C T)', await p.locator('#fh-rows .seg button[data-w="' + s.sick + '"]').count() > 0);
  await p.click('#fh-rball'); await p.waitForTimeout(300);
  check('LIHAT SEMUA shows everyone (men on a job too)', await p.locator('#fh-rows .seg button[data-k="H"][data-w="' + s.ha[0] + '"]').count() === 1);
  await p.click('#fh-rball'); await p.waitForTimeout(300);
  check('TUTUP SENARAI PENUH goes back to the short list', await p.locator('#fh-rows .seg button[data-k="H"][data-w="' + s.ha[0] + '"]').count() === 0);

  // folded: the chit table and the backlog
  const tl = await p.innerText('#fh-table');
  check('the chit table is one line with the totals', /\d+ bekerja · \d+ tidak bekerja · jumlah \d+/.test(tl) && !(await p.isVisible('#fh-table table')), tl.replace(/\s+/g, ' ').slice(0, 120));
  await p.click('#fh-table [data-rbfold]'); await p.waitForTimeout(200);
  check('LIHAT opens the full chit table', await p.isVisible('#fh-table table'));
  check('the backlog card is one line (Ladang … tandan · Ramp … tandan)', /Ladang \d+ tandan · Ramp \d+ tandan/.test(await p.innerText('#fh-backlog')));
  check('SIMPAN CHIT still says what is missing', /BELUM DITANDA/.test(await p.innerText('#fh-check')), await p.innerText('#fh-check'));
  check('the page never grew wider than the phone', await wide() <= 390, String(await wide()));
  await p.click('#fh-table [data-rbfold]'); await p.waitForTimeout(200);
  const len = await p.evaluate(() => document.documentElement.scrollHeight);

  // the old look is unchanged
  await p.evaluate(() => { localStorage.removeItem('ea.rupaBaru'); location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1000);
  const old = await p.evaluate(() => document.documentElement.scrollHeight);
  check('the same chit is far shorter in the new look (under 2/3 of the old look)', len < old * 2 / 3, len + ' px against ' + old + ' px');
  check('old look: PICK and EDIT on each job, the full list, the open chit table', await p.locator('#fh-jobs [data-pick]').count() === 4 && await p.locator('#fh-jobs [data-rbchj]').count() === 0 &&
    await p.locator('#fh-rows .seg button[data-k="H"][data-w="' + s.ha[0] + '"]').count() === 1 && await p.isVisible('#fh-table table'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
