// E-Book test (1.107) Brief_Semakan_Rupa_Baru, signed by Yu Chen 25 Nov 2026 8:19 pm ("ok and sign"), after the full
// walk of the new look. The bottom button names an alert with no note (TULIS AMARAN) and goes to it; KURANG BEG is a
// warning (orange), not "belum lengkap"; the night plan's button reads what is missing; on SAHKAN CHIT the tag sits under
// the job name and the tractor shows the fruit left; "Minta tukar jenis / dos" is full size. Made-up data only (Rule 8).
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
    const est = 'SSGT', all = EA.lists.workersFor(est), date = EA.today(), month = date.slice(0, 7), dd = new Date(date + 'T00:00:00'); dd.setDate(dd.getDate() - 1);
    const y = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
    localStorage.setItem('fh.prog.' + est + '.' + month, JSON.stringify({ at: Date.now(), programme: [{ task: 'MAN', block: '03', month: month, round: 'Baja Contoh', ha: 30, dose: 2.5 }], lots: {}, lotJobs: {} }));
    localStorage.setItem('fh.chits2', JSON.stringify([])); localStorage.setItem('fh.dayclose', JSON.stringify([{ estate: est, date: y, closedAt: '18:00', status: 'closed' }]));
    localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('fh.backlog.SSGT', JSON.stringify({ estate: est, at: '05:30', field: [{ lot: '1-7', block: '01', bunches: 60, since: y }], fieldTotal: 60, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] }));
    const d = { date, marks: {}, jobOf: {}, nextJob: 4, checker: 'Ujian', rain_mm: '0', rain_time: '', notes: {}, alertNotes: {},
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-7', '1-8'], mandor: '' }, { key: 'j2', task: 'MAN', block: '03', lots: ['3-1'], mandor: '' }, { key: 'j3', task: 'MDR', block: '', lots: [], mandor: '' }] };
    const put = (w, k) => { d.marks[w.id] = 'H'; d.jobOf[w.id] = k; };
    put(all[0], 'j1'); put(all[1], 'j1'); [2, 3, 4, 5].forEach(i => put(all[i], 'j2')); put(all[6], 'j3');
    all.slice(7).concat(EA.lists.mandorsFor(est)).forEach(w => { d.marks[w.id] = 'C'; });
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: d }));
    return { y, all: all.map(w => w.id) };
  });
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);

  // §2 KURANG BEG is orange and not counted; §1 the alert is named first
  check('KURANG BEG is an orange warning', await p.locator('[data-rbchj="j2"] .rb-chip.rb-a').count() === 1 && /KURANG BEG/.test(await p.innerText('[data-rbchj="j2"]')), await p.innerText('[data-rbchj="j2"]'));
  let btn = await p.innerText('#fh-check');
  check('the button names the alert, and not KURANG BEG: "TULIS AMARAN"', /^TULIS AMARAN$/i.test(btn.trim().split('\n')[0]) && !/BELUM LENGKAP/.test(btn), btn);
  await p.click('#fh-check'); await p.waitForTimeout(400);
  check('tapping it goes to the alert box (no list of problems)', await p.evaluate(() => !!(document.activeElement && document.activeElement.dataset.alert)) && !(await p.$('#pb-ok')));
  await p.keyboard.type('Traktor kutip pagi ini'); await p.waitForTimeout(200);
  btn = await p.innerText('#fh-check');
  check('with the note written the button is SIMPAN CHIT again', /SIMPAN CHIT|SAVE CHIT/i.test(btn) && !/AMARAN|BELUM/.test(btn), btn);

  // §5 the request button is full size
  await p.click('[data-rbchj="j2"]'); await p.waitForTimeout(400);
  const h = await p.evaluate(() => { const x = document.querySelector('#sheet [data-mreq]'); return x ? x.getBoundingClientRect().height : 0; });
  check('"Minta tukar jenis / dos" is a full-size button (≥ 44 px)', h >= 44, h + ' px');
  await p.click('#jb-cancel'); await p.waitForTimeout(300);

  // §3 the night plan's button reads what is missing
  await p.evaluate(() => { const t = new Date(EA.today() + 'T00:00:00'); t.setDate(t.getDate() + 1); const z = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    localStorage.removeItem('fh.draft2'); EA.local.set('fh.planGo', { estate: 'SSGT', date: z }); location.hash = ''; });
  await p.waitForTimeout(300); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);
  const pl = await p.innerText('#fh-check');
  check('plan: the button says what is missing (not just SIMPAN RANCANGAN)', /BELUM DITANDA|TAMBAH KERJA|BELUM LENGKAP/.test(pl), pl);

  // §4 §6 SAHKAN CHIT: tag under the name; the tractor shows the fruit left
  await p.evaluate(() => {
    const est = 'SSGT', all = EA.lists.workersFor(est).filter(w => !w.mdr), t = EA.today(), dd = new Date(t + 'T00:00:00'); dd.setDate(dd.getDate() - 1);
    const y = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
    const row = (w, task, block, lots, i) => ({ id: 'pr' + i, worker_id: w.id, muster: 'H', task_code: task, block, lots, mandor: '', status: 'active' });
    localStorage.setItem('fh.plans', JSON.stringify([{ plan: 'PL-T', estate: est, date: t, at: y + ' 18:20', keyedBy: 'STF', keyedName: 'Staf Contoh', reason: '',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-7', '1-8'], mandor: '' }, { key: 'j2', task: 'ITF', block: '01', lots: ['1-7', '1-8'], mandor: '' }, { key: 'j3', task: 'LFF', block: '01', lots: ['1-7', '1-8'], mandor: '' }, { key: 'j4', task: 'CPS', block: '02', lots: ['2-1'], mandor: '' }],
      rows: [row(all[0], 'HA', '01', '1-7 1-8', 0), row(all[1], 'ITF', '01', '1-7 1-8', 1), row(all[2], 'LFF', '01', '1-7 1-8', 2), row(all[3], 'CPS', '02', '2-1', 3), row(all[4], 'CPS', '02', '2-1', 4)] }]));
    localStorage.removeItem('fh.draft2'); EA.local.set('fh.planGo', null); location.hash = '';
  });
  await p.waitForTimeout(300); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1200);
  if (await p.$('#pd-conf')) { await p.click('#pd-conf'); await p.waitForTimeout(800); }
  const cards = await p.evaluate(() => [...document.querySelectorAll('#fh-jobs .rb-jcard')].map(c => ({ t: c.innerText.replace(/\s+/g, ' '), under: !!c.querySelector('.rb-jhead > span .rb-chip.rb-under'), head: c.querySelector('.rb-jhead > span b') ? c.querySelector('.rb-jhead > span b').getBoundingClientRect().height : 0 })));
  const cps = cards.find(c => /^CPS/.test(c.t)), itf = cards.find(c => /^ITF \+ LFF/.test(c.t));
  check('SAHKAN CHIT: the tag sits under the job name, the name on few lines', !!cps && cps.under && cps.head < 60, JSON.stringify(cps));
  check('SAHKAN CHIT: the tractor card shows "baki 60 tandan"', !!itf && /baki 60 tandan/.test(itf.t), itf && itf.t);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
