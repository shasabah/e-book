// E-Book test (1.45, Yu Chen 27 Oct): Sugut's "+ Kerja lain" list shows only the other jobs Sugut really does
// (ticked by Yu Chen, with CPT and LG/UL added back from the Sugut piece rate list).
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

  // ---------- the other-work list ----------
  await goRoom();
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  const opts = await p.$$eval('#jb-task option', o => o.map(x => x.value).filter(Boolean));
  const keep = ['LFR', 'DEC', 'BU', 'SS', 'BS', 'LS', 'OS', 'OPF', 'SP', 'RMF', 'RMM', 'GFR', 'GMR', 'RPC', 'CSR', 'CSB', 'RS', 'MC', 'ITLM', 'CPT', 'LG/UL'];
  check('Sugut other-work list: only the 21 kept jobs', opts.length === 21 && keep.every(c => opts.indexOf(c) >= 0), opts.join(','));
  check('dropped jobs are gone (DCO, FC, CO, MT)', ['DCO', 'FC', 'CO', 'MT'].every(c => opts.indexOf(c) < 0));
  check('main jobs are not in this list (CPS, MAN stay buttons)', opts.indexOf('CPS') < 0 && opts.indexOf('MAN') < 0 && !!(await p.$('#jb-more [data-quick="MAN"]')) && !!(await p.$('#jb-more [data-quick="CPS"]')));
  await p.evaluate(() => EA.ui.closeSheet && EA.ui.closeSheet()); await p.waitForTimeout(200);
  // an old DCO line (keyed before 1.45) still opens and shows its own code
  await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('fh.draft2') || '{}'); const d = all.SSGT; d.jobs = [{ key: 'j1', task: 'DCO', block: '01', lots: [], mandor: '', ask: 'lama' }]; d.nextJob = 2; localStorage.setItem('fh.draft2', JSON.stringify(all)); });
  await goRoom(); await p.click('[data-edit="j1"]'); await p.waitForSelector('#jb-task');
  check('changing an old DCO job: DCO still shows so the line can be read and changed', await p.$eval('#jb-task', s => s.value) === 'DCO');
  check('other estates keep the whole list', await p.evaluate(() => EA.lists.isOtherJob('PTAN', 'DCO') && !EA.lists.isOtherJob('SSGT', 'DCO')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
