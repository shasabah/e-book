// E-Book test (1.44, Yu Chen 27 Oct): the evening report reads cleanly in WhatsApp; Membaja is found on the folded
// job button; a correction that takes away an "other work" job withdraws its request to the Assistant Manager.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const cx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' });
  const p = await cx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const sent = [];
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Ferezelly Bin Ali', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'saveBatch') { (bd.items || []).forEach(it => sent.push(it)); o = { ok: true, sw, results: bd.items.map(it => ({ ok: true, id: it.row.id })) }; }
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.clock.install({ time: new Date('2026-10-27T06:30:00+08:00') });
  await p.goto('http://localhost:8765/index.html');
  const people = [{ id: 'W1', name: 'Pekerja Satu', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'M' }, { id: 'W2', name: 'Pekerja Dua', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'M' }];
  await p.evaluate(pp => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify(pp)); localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
  }, people);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  const goRoom = async () => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(150); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(500); };

  // ---------- 1. the report text ----------
  const txt = await p.evaluate(() => EA.fh.work.reportText({ date: '2026-10-26', estate: 'SSGT', keyedName: 'Ferezelly Bin Ali', at: '20:40', chit: 'MC-SSGT-P13-20261026-1', jobs: [
    { task_code: 'LFF', block: '01', workers: 1, qty: 1, status: 'not_done', reason: 'Hujan jam 2 petang, sambung esok' },
    { task_code: 'CPS', block: '01', workers: 3, qty: 2.49, plan_ha: 2.49, status: 'done', progress: '1-15:100% 1-16:100% 1-17:100%', target: '7.5 Ha', flags: 'Bawah sasaran · below target: 2.49 / 7.5 Ha (3 × 2.5)' },
    { task_code: 'RP', block: '03', workers: 2, qty: 1.2, plan_ha: 2.7, status: 'not_done', progress: '3-30 siap, 3-31 belum siap (Hujan · sambung 28/10)', reason: '3-31 Hujan · sambung 28/10' },
    { task_code: 'MAN', block: '02', workers: 4, qty: 3.1, status: 'done', progress: '2-1 siap, 2-2 siap', bags: 60, dose: 2.5 },
    { task_code: 'CA', block: '', workers: 1, qty: 1, status: 'done' },
    { task_code: 'CPT', block: 'DR', workers: 2, qty: 342, status: 'done' }] }, 1));
  const lines = txt.split('\n');
  check('no line starts with a space, a number, a dash or a bullet (WhatsApp keeps it as written)', lines.every(l => !/^(\s|\d|-|•|\*\s)/.test(l)), lines.filter(l => /^(\s|\d|-|•)/.test(l)).join(' | '));
  check('section heads in bold, Malay first: *1 · TUAIAN* · Harvesting', /^\*1 · TUAIAN\* · Harvesting$/m.test(txt) && /^\*2 · RAWATAN LADANG\* · Field maintenance$/m.test(txt), lines.filter(l => /^\*\d/.test(l)).join(' | '));
  check('not finished: ⏳ and the reason', /^⏳ \*.* · Blk 01\* — 1 org · tan ikut tiket\nBELUM SIAP: Hujan jam 2 petang, sambung esok$/m.test(txt));
  check('finished lots in one line (old % form too), below target once with ⚠', /^✅ \*.* · Blk 01\* — 3 org · 2\.49 Ha \/ 2\.49 Ha\nPetak: 1-15, 1-16, 1-17 siap\n⚠ Bawah sasaran: 2\.49 \/ 7\.5 Ha \(3 × 2\.5\)$/m.test(txt) && !/Sasaran: 7\.5/.test(txt), txt.split('\n\n')[2]);
  check('lots finished and not: two lines, the why only once', /\nPetak siap: 3-30\nBELUM SIAP: 3-31 \(Hujan · sambung 28\/10\)\n/.test(txt) && (txt.match(/sambung 28\/10/g) || []).length === 1);
  check('manuring: bags and dose', /\nPetak: 2-1, 2-2 siap\nBeg baja: 60 · dos 2\.5 kg\/pokok\n/.test(txt));
  check('simple jobs one line each, no blank line between them', /\n✅ \*[^\n]*\* — 1 org · 1 hari\n✅ \*[^\n]*Blk DR\* — 2 org · 342/.test(txt), txt.split('*5 · AM* · General')[1]);
  check('last line has the version and the chit', /\nE-Book \d+\.\d+ · MC-SSGT-P13-20261026-1$/.test(txt));
  console.log(txt);

  // ---------- 2. Membaja on the folded button ----------
  await goRoom();
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-more');
  const names = await p.textContent('#jb-more summary .jb-more-names');
  check('the folded button lists its jobs by name (Membaja seen without opening)', /Membaja/.test(names) && !(await p.$eval('#jb-more', d => d.open)), names);
  await p.evaluate(() => EA.ui.closeSheet && EA.ui.closeSheet()); await p.waitForTimeout(200);
  await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('fh.draft2') || '{}'); const d = all.SSGT; d.jobs = [{ key: 'j1', task: 'DCO', block: '01', lots: [], mandor: '', ask: 'ujian' }]; d.nextJob = 2; localStorage.setItem('fh.draft2', JSON.stringify(all)); });
  await goRoom(); await p.click('[data-edit="j1"]'); await p.waitForSelector('#jb-more');
  check('changing an other-work job (DCO): the folded main jobs open by themselves', await p.$eval('#jb-more', d => d.open));
  await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('fh.draft2')); all.SSGT.jobs = []; localStorage.setItem('fh.draft2', JSON.stringify(all)); });
  await p.click('#jb-no').catch(() => {}); await p.evaluate(() => EA.ui.closeSheet && EA.ui.closeSheet()); await p.waitForTimeout(200);

  // ---------- 3. DCO keyed for manuring, corrected to MAN: the request is withdrawn ----------
  const setDraft = async (fn) => { await p.evaluate(fn); await goRoom(); };
  await setDraft(() => {
    const all = JSON.parse(localStorage.getItem('fh.draft2') || '{}'); const d = all.SSGT;
    d.jobs = [{ key: 'j1', task: 'DCO', block: '01', lots: ['1-15'], mandor: '', ask: 'Tiada kerja membaja dalam senarai' }]; d.nextJob = 2;
    d.marks = { W1: 'H', W2: 'H' }; d.jobOf = { W1: 'j1', W2: 'j1' };
    localStorage.setItem('fh.draft2', JSON.stringify(all));
  });
  const saveChit = async () => {
    await p.click('#fh-check'); await p.waitForTimeout(300);
    if (await p.$('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
    if (await p.$('#cf-ok')) { await p.click('#cf-ok'); await p.waitForTimeout(500); }
    if (await p.$('#ch-close')) await p.click('#ch-close');
    await p.waitForTimeout(1500);
  };
  await saveChit();
  const ask = sent.find(x => x.tab === 'FH_ALERT' && x.row.kind === 'jobask');
  check('DCO (not a main job) asks the Assistant Manager', !!ask, sent.map(x => x.tab).join(','));
  const chitId = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.chits2'))[0].chit);
  await goRoom();
  await p.click('[data-fix="' + chitId + '"]'); await p.waitForTimeout(300);
  await setDraft(() => {
    const all = JSON.parse(localStorage.getItem('fh.draft2')); const d = all.SSGT;
    d.jobs = [{ key: 'j1', task: 'MAN', block: '01', lots: ['1-15'], mandor: '', ask: '' }];
    localStorage.setItem('fh.draft2', JSON.stringify(all));
  });
  await saveChit();
  const gone = sent.find(x => x.tab === 'FH_ALERT' && x.row.kind === 'jobask' && x.row.status === 'removed');
  check('corrected to MAN: the DCO request is withdrawn (removed row replacing it, nothing deleted)', gone && ask && gone.row.replaces === ask.row.id, JSON.stringify(gone && gone.row));
  check('no new request for MAN', sent.filter(x => x.tab === 'FH_ALERT' && x.row.kind === 'jobask' && x.row.status !== 'removed').length === 1);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
