// E-Book test (1.38) Picking names: chosen names at the top with × to take off; people on another job (or S/C/T) are
// kept apart and moving one asks first; on the chit, people still to mark come first and a marked person shrinks
// to a short line. Made-up names only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    const t = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'H1', name: 'Penuai Contoh Satu', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }, { id: 'H2', name: 'Penuai Contoh Dua', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'R1', name: 'Rawatan Contoh Satu', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' }, { id: 'R2', name: 'Rawatan Contoh Dua', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: t, estate: 'SSGT', jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-29'], mandor: '' }, { key: 'j2', task: 'CPS', block: '03', lots: ['3-1'], mandor: '' }],
      marks: { H1: 'H', R2: 'S' }, jobOf: { H1: 'j1' }, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 3, alertNotes: {} } }));
  });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForSelector('#fh-addjob'); await p.waitForTimeout(700);
  const order = await p.$$eval('#fh-rows .wrow .who-w b', a => a.map(x => x.textContent));
  check('chit: people still to mark come first, marked people after', order.indexOf('Penuai Contoh Dua') < order.indexOf('Penuai Contoh Satu') && order.indexOf('Rawatan Contoh Satu') < order.indexOf('Rawatan Contoh Dua'), order.join(' | '));
  const done = await p.$$eval('#fh-rows .wrow-done .who-w b', a => a.map(x => x.textContent).sort().join('|'));
  check('chit: a marked person shrinks to a short line (H with a job, or S)', done === 'Penuai Contoh Satu|Rawatan Contoh Dua', done);
  check('chit: "Sudah ditanda (2)" heading', /Sudah ditanda \(2\)|Marked \(2\)/.test(await p.innerText('#fh-rows')));
  // PILIH ORANG on CPS
  await p.click('#fh-jobs [data-pick="j2"]'); await p.waitForSelector('#pp-list');
  const freeIds = await p.$$eval('#pp-list > .picks .pick, #pp-list > p + .picks .pick', a => a.map(x => x.dataset.w).sort().join(' '));
  const busyIds = await p.$$eval('#pp-busy .pick', a => a.map(x => x.dataset.w + ':' + x.textContent.replace(/\s+/g, ' ')).join(' | '));
  check('pick: free people in the gang groups; people on another job / away folded apart', freeIds === 'H2 R1' && /H1:.*HA Blk 01/.test(busyIds) && /R2:.*Sakit|R2:.*Sick/.test(busyIds) && !(await p.$eval('#pp-busy', d => d.open)), freeIds + ' / ' + busyIds);
  await p.click('#pp-list .pick[data-w="R1"]'); await p.waitForTimeout(100);
  check('pick: a ticked name shows at the top under "Dipilih (1)" with ×', /Dipilih \(1\)|Chosen \(1\)/.test(await p.innerText('#pp-chosen')) && await p.locator('#pp-chosen [data-x="R1"]').count() === 1);
  await p.click('#pp-chosen [data-x="R1"]'); await p.waitForTimeout(100);
  check('pick: × takes the name off again', /Dipilih \(0\)|Chosen \(0\)/.test(await p.innerText('#pp-chosen')) && (await p.getAttribute('#pp-list .pick[data-w="R1"]', 'aria-pressed')) === 'false');
  await p.evaluate(() => { document.querySelector('#pp-busy').open = true; });
  await p.click('#pp-busy .pick[data-w="H1"]'); await p.waitForTimeout(150);
  const askTxt = await p.innerText('#pp-ask');
  check('pick: moving someone from another job asks first ("Pindah … dari HA … ke CPS?")', await p.isVisible('#pp-ask') && /HA/.test(askTxt) && /CPS/.test(askTxt) && (await p.getAttribute('#pp-busy .pick[data-w="H1"]', 'aria-pressed')) === 'false', askTxt);
  await p.click('#pp-no'); await p.waitForTimeout(100);
  check('pick: NO leaves him where he was', await p.isHidden('#pp-ask') && (await p.getAttribute('#pp-busy .pick[data-w="H1"]', 'aria-pressed')) === 'false');
  await p.click('#pp-busy .pick[data-w="H1"]'); await p.click('#pp-yes'); await p.click('#pp-list .pick[data-w="R1"]'); await p.waitForTimeout(100);
  await p.click('#pp-ok'); await p.waitForTimeout(300);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('pick: YES moves him to CPS; R1 on CPS; R2 stays Sakit', d.jobOf.H1 === 'j2' && d.jobOf.R1 === 'j2' && d.marks.R2 === 'S' && !d.jobOf.R2, JSON.stringify([d.marks, d.jobOf]));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v48-rows.png', fullPage: true });
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
