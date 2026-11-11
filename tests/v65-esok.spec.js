// E-Book test (1.52). Close today → plan tomorrow → confirm in the morning (Brief_Esok, Yu Chen 6 Nov 2026).
// 1. After a close, the day summary offers RANCANG ESOK (the next day; on a rest day the next working day too).
// 2. The chit screen opens a plan for that day filled from today's chit: same men marked H, lots finished today dropped.
// 3. Saved, the plan is on the phone (fh.plans), never a chit.
// 4. Next morning the chit opens from the plan by itself, in confirm mode, asking who is absent.
// 5. One man marked T, SAHKAN with no reason typed → a real chit with fromPlan and one difference; the WhatsApp says
//    "(dirancang semalam)". Only then does a chit for that day exist.
// 6. The morning alert turns into "sahkan siapa hadir" while a plan exists and no chit.
// 7. CHIT BIASA drops the plan (cancelled with a trail) and starts the chit from nothing.
// Rule 8: made-up workers.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', rt => {
    const bd = JSON.parse(rt.request().postData() || '{}');
    const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'saveBatch') o = { ok: true, results: bd.items.map(it => ({ id: it.row.id, ok: true })), sw };
    else o = { ok: true, sw, estate: 'SSGT', items: [], days: [] };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  // Work on a Friday so the "tomorrow" cases are known: Friday → Saturday (working day). The next Friday from the
  // real date (1.53: a fixed 6 Nov stopped working once it was more than 3 days back, as plans open only 3 days).
  const fri = (() => { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); return iso(d); })();
  const T0 = fri, T1 = addDays(T0, 1);
  const names = ['Ali Bin Kassim', 'Badu Bin Sani', 'Catur Bin Rahim', 'Dani Bin Musa', 'Eko Bin Salim'];
  const people = [1, 2, 3, 4, 5].map(i => ({ id: 'W-SSGT-00' + i, name: names[i - 1], estate: 'SSGT', gang: i <= 3 ? 'Tuai · Harvest' : 'Racun · Spray', sex: 'M' }));
  const R = (i, task, block, lots) => ({ id: 'm' + i, worker_id: 'W-SSGT-00' + i, muster: 'H', task_code: task, block, lots, mandor: '' });
  const chit = { chit: 'CH-SSGT-P13-1', date: T0, estate: 'SSGT', confirmedAt: '06:10', rev: 1, keyedBy: 'STF-SSGT-01', keyedName: 'Staf',
    jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-13', '1-14'] }, { key: 'j2', task: 'CPS', block: '02', lots: ['2-21', '2-22'] }],
    rows: [R(1, 'HA', '01', '1-13'), R(2, 'HA', '01', '1-14'), R(3, 'HA', '01', '1-13'), R(4, 'CPS', '02', '2-21 2-22'), R(5, 'CPS', '02', '2-21 2-22')] };
  // Today's Kerja: CPS lot 2-21 finished, 2-22 not — so tomorrow's plan keeps 2-22 only.
  const work = { chit: chit.chit, date: T0, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: {},
    rec: { chit: chit.chit, date: T0, estate: 'SSGT', at: '17:00', lines: [],
      jobs: [{ id: 'j1', key: 'j1', task_code: 'HA', block: '01', lots: '1-13 1-14', workers: 3, bunches: '300', status: 'done', reason: '' },
             { id: 'j2', key: 'j2', task_code: 'CPS', block: '02', lots: '2-21 2-22', workers: 2, qty: '1.0', unit: 'Ha', status: 'not_done', reason: 'Hujan', progress: '2-21 siap, 2-22 belum siap' }] } };
  const close = { estate: 'SSGT', date: T0, chit: chit.chit, at: '17:52', by: 'STF-SSGT-01', byName: 'Staf', present: 5, total: 5, bunches: 300, lorries: 1, jobsDone: 1, jobs: 2, notDone: [], away: [], rain: '', rainJobs: [] };
  await p.evaluate(({ people, chit, work, close }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify(people)); localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.chits2', JSON.stringify([chit])); localStorage.setItem('fh.work', JSON.stringify([work])); localStorage.setItem('fh.dayclose', JSON.stringify([close]));
    localStorage.setItem('fh.dayclose.office.SSGT', JSON.stringify({ at: Date.now(), from: '2020-01-01', days: [] }));
  }, { people, chit, work, close });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(500);
  const setToday = d => p.evaluate(d => { EA.today = () => d; }, d);
  await setToday(T0);

  // ---- 1. the summary after the close offers RANCANG ESOK ----
  await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForTimeout(600);
  await p.evaluate(d => EA.fh.dayclose.showSummary(d, 'SSGT'), T0); await p.waitForTimeout(300);
  const esok = await p.$$eval('[data-esok]', a => a.map(x => x.dataset.esok));
  check('the day summary offers RANCANG ESOK for the next day', esok.length === 1 && esok[0] === T1, esok.join(' '));
  check('the back button reads NANTI when the offer is shown', /NANTI/.test(await p.innerText('#ds-back')));

  // ---- 2. it opens a plan for tomorrow filled from today ----
  await p.click('[data-esok="' + T1 + '"]'); await p.waitForTimeout(900);
  const plan = await p.evaluate(() => {
    const d = (JSON.parse(localStorage.getItem('fh.draft2') || '{}')).SSGT || {};
    return { mode: d.mode, date: d.date, marks: d.marks, jobs: (d.jobs || []).map(j => j.task + ':' + j.block + ':' + j.lots.join(' ')), band: (document.querySelector('.plan-band') || {}).textContent || '' };
  });
  check('the chit screen is in plan mode for tomorrow', plan.mode === 'plan' && plan.date === T1, plan.mode + ' ' + plan.date);
  check('everyone who worked today is on the plan, marked present', Object.keys(plan.marks).length === 5 && Object.values(plan.marks).every(m => m === 'H'), JSON.stringify(plan.marks));
  check('the lot finished today (2-21) is dropped; 2-22 stays; harvest lots stay', plan.jobs.includes('CPS:02:2-22') && plan.jobs.some(j => /^HA:01:/.test(j)) && !plan.jobs.some(j => /2-21/.test(j)), plan.jobs.join(' | '));
  check('the band says it is a plan, not the muster', /RANCANGAN/.test(plan.band) && /tidak dikira/.test(plan.band), plan.band.slice(0, 80));
  check('fh.planGo is consumed', await p.evaluate(() => localStorage.getItem('fh.planGo') === null));

  // ---- 3. save the plan ----
  await p.click('#fh-check'); await p.waitForTimeout(400);
  check('the sheet is "Semak rancangan ini" with SAVE PLAN', /Semak rancangan ini/i.test(await p.innerText('#sheet-title')) && /SAVE PLAN|Simpan rancangan/i.test(await p.innerText('#cf-ok')));
  await p.click('#cf-ok'); await p.waitForTimeout(700);
  // saving a plan opens the share sheet (the plan can go to the group / the Pengurus); close it as the staff would
  const shareSheet = await p.$('#ch-close'); if (shareSheet) { await shareSheet.click(); await p.waitForTimeout(300); }
  const saved = await p.evaluate(({ T0, T1 }) => ({ plans: (JSON.parse(localStorage.getItem('fh.plans') || '[]')).filter(x => x.date === T1 && !x.cancelled).length,
    chitsT1: (JSON.parse(localStorage.getItem('fh.chits2') || '[]')).filter(x => x.date === T1).length }), { T0, T1 });
  check('the plan for tomorrow is kept on the phone', saved.plans === 1, String(saved.plans));
  check('no chit exists for tomorrow — a plan is never a chit', saved.chitsT1 === 0, String(saved.chitsT1));

  // ---- 6. the morning alert while the plan waits ----
  await setToday(T1);
  const todo = await p.evaluate(() => { const t = EA.todoItems({ role: 'Staff', code: 'STF-SSGT-01' }, 'SSGT'); return (t.items.find(x => x.id === 'CH') || {}).bm || ''; });
  check('the morning alert says the chit was planned last night — confirm who came', /dirancang semalam/.test(todo), todo);

  // ---- 4. next morning: the chit opens from the plan by itself ----
  await p.evaluate(() => { localStorage.removeItem('fh.draft2'); location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);
  const morn = await p.evaluate(() => { const d = (JSON.parse(localStorage.getItem('fh.draft2') || '{}')).SSGT || {}; const band = document.querySelector('#fh-sameday'); return { mode: d.mode, date: d.date, from: d.fromPlan, band: band ? band.textContent : '', plain: !!document.querySelector('#fh-plain'), marks: d.marks }; });
  check('the chit opens in confirm mode for today from the plan', morn.mode === 'confirm' && morn.date === T1 && !!morn.from, morn.mode + ' ' + morn.date);
  check('the band asks who is absent', /SIAPA TIDAK HADIR/.test(morn.band), morn.band.slice(0, 60));
  check('CHIT BIASA is offered in the band', morn.plain);
  check('everyone planned is already marked present', Object.values(morn.marks || {}).every(m => m === 'H') && Object.keys(morn.marks || {}).length === 5);

  // ---- 5. one man absent, SAHKAN with no reason typed ----
  // a planned man's row is shrunk (marked, 25 Oct); open it, then mark him absent
  const tk = await p.$('[data-chg="W-SSGT-003"]'); if (tk) { await tk.click(); await p.waitForTimeout(200); }
  await p.click('[data-w="W-SSGT-003"][data-k="T"]'); await p.waitForTimeout(250);
  await p.click('#fh-check'); await p.waitForTimeout(400);
  const sheet = await p.innerText('#sheet-title').catch(() => '');
  check('the sheet is "Sahkan chit" with the difference listed', /Sahkan chit/i.test(sheet) && !!(await p.$('.plan-diff')), sheet);
  const whyLabel = await p.$eval('label[for="cf-why"]', e => e.textContent).catch(() => 'none');
  check('the reason is optional on a same-day confirmation', /pilihan|optional/.test(whyLabel), whyLabel);
  await p.click('#cf-ok'); await p.waitForTimeout(800);
  const after = await p.evaluate(T1 => {
    const cs = JSON.parse(localStorage.getItem('fh.chits2') || '[]').filter(x => x.date === T1);
    const c = cs[0] || {};
    return { n: cs.length, fromPlan: !!c.fromPlan, diff: (c.planDiff || []).length, confirmedOn: c.confirmedOn, wa: cs.length ? EA.roomViews['field-harvest'].chitText(c) : '', stillSheet: !!document.querySelector('#cf-ok') };
  }, T1);
  check('SAHKAN saved without a typed reason', after.n === 1 && !after.stillSheet, 'chits ' + after.n);
  check('the chit carries its plan and one difference (the absentee)', after.fromPlan && after.diff === 1 && after.confirmedOn === T1, 'diff ' + after.diff);
  check('the WhatsApp says confirmed, planned last night — not "staf cuti"', /DISAHKAN .*\(dirancang semalam\)/.test(after.wa) && !/staf cuti/.test(after.wa), after.wa.split('\n').slice(0, 5).join(' | '));
  check('the difference is on the WhatsApp for the Pengurus', /Beza dari rancangan/.test(after.wa) && /W-SSGT-003|Catur Bin Rahim/.test(after.wa));

  // ---- 7. CHIT BIASA drops a plan ----
  const T2 = addDays(T1, 2);     // Mon 9 Nov
  const share2 = await p.$('#ch-close'); if (share2) { await share2.click(); await p.waitForTimeout(300); }
  await p.evaluate(({ T1, T2 }) => {
    const ps = JSON.parse(localStorage.getItem('fh.plans') || '[]'); const src = ps.find(x => x.date === T1);
    ps.push(Object.assign({}, src, { plan: 'PL-T2', date: T2, cancelled: '' })); localStorage.setItem('fh.plans', JSON.stringify(ps));
    // Saturday's work keyed, so Saturday is done and Monday's plan is next (a confirmed plan still needs its work)
    const c1 = JSON.parse(localStorage.getItem('fh.chits2') || '[]').find(x => x.date === T1);
    const w = JSON.parse(localStorage.getItem('fh.work') || '[]'); w.push({ chit: c1.chit, date: T1, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: {}, rec: { chit: c1.chit, date: T1, estate: 'SSGT', at: '17:00', lines: [], jobs: [] } });
    localStorage.setItem('fh.work', JSON.stringify(w));
    localStorage.removeItem('fh.draft2'); location.hash = '';
  }, { T1, T2 });
  await setToday(T2); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);
  check('a plan for the new day opens in confirm mode again', await p.evaluate(() => ((JSON.parse(localStorage.getItem('fh.draft2') || '{}')).SSGT || {}).mode === 'confirm'));
  await p.click('#fh-plain'); await p.waitForTimeout(700);
  const plain = await p.evaluate(T2 => ({ mode: ((JSON.parse(localStorage.getItem('fh.draft2') || '{}')).SSGT || {}).mode || '', band: !!document.querySelector('#fh-sameday'),
    cancelled: !!(JSON.parse(localStorage.getItem('fh.plans') || '[]').find(x => x.date === T2) || {}).cancelled }), T2);
  check('CHIT BIASA: the plan is cancelled with a trail and the chit starts from nothing', plain.mode === '' && !plain.band && plain.cancelled, JSON.stringify(plain));

  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
