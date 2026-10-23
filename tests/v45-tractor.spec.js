// E-Book test (1.34) Farm tractor (ITF) and loader (LFF): the lots fill in by themselves (today's harvest lots on
// the chit and lots with bunches not yet collected), the loader partner goes on the same lots, and a tractor with
// no loader asks "semak dulu".
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const field = [{ lot: '1-24', block: '01', bunches: 102, since: '2026-10-22' }, { lot: '1-26', block: '01', bunches: 160, since: '2026-10-22' }];
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', at: '2026-10-23 07:00', field, fieldTotal: 262, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'H1', name: 'Penuai Contoh Satu', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }, { id: 'T1', name: 'Pemandu Contoh', estate: 'SSGT', gang: 'Pemandu · Driver', sex: 'M' },
      { id: 'L1', name: 'Pemuat Contoh', estate: 'SSGT', gang: 'Muat · Loading', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    const t = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: t, estate: 'SSGT', jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-29', '1-30'], mandor: '' }], marks: { H1: 'H' }, jobOf: { H1: 'j1' }, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 2, alertNotes: {} } }));
  });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForSelector('#fh-addjob'); await p.waitForTimeout(800);
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  await p.click('#jb-quick [data-quick="ITF"]'); await p.waitForTimeout(200);
  const blk = await p.inputValue('#jb-block');
  const ticked = await p.$$eval('#jb-lots .pick[aria-pressed="true"]', a => a.map(x => x.dataset.lot).sort().join(' '));
  check('ITF: the block with the crop is chosen by itself', blk === '01', blk);
  check('ITF: today\'s harvest lots and lots not yet collected are ticked', ticked === '1-24 1-26 1-29 1-30', ticked);
  const notes = await p.innerText('#jb-lots');
  check('ITF: each lot says why (tuai hari ini / baki … tandan)', /tuai hari ini/.test(notes) && /baki 102 tandan/.test(notes), notes.slice(0, 200));
  check('ITF: the loader partner box shows', await p.isVisible('#jb-pair'));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v45-itf.png' });
  await p.selectOption('#jb-ld', 'L1'); await p.click('#jb-save'); await p.waitForTimeout(300);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  const itf = d.jobs.find(j => j.task === 'ITF'), lff = d.jobs.find(j => j.task === 'LFF');
  check('save: an LFF job on the same lots, with the loader on it (H)', itf && lff && lff.lots.join(' ') === itf.lots.join(' ') && d.marks.L1 === 'H' && d.jobOf.L1 === lff.key, JSON.stringify(d.jobs));
  // the driver on ITF, with the loader: no "semak dulu"
  await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('fh.draft2')); const s = all.SSGT; const k = s.jobs.find(j => j.task === 'ITF').key; s.marks.T1 = 'H'; s.jobOf.T1 = k; localStorage.setItem('fh.draft2', JSON.stringify(all)); });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(500);
  for (const i of await p.$$('#fh-alerts [data-alert]')) await i.fill('Dikutip esok'); await p.click('#fh-check'); await p.waitForTimeout(300);
  const sh1 = await p.evaluate(() => document.body.innerText); check('tractor with a loader: no tractor warning (and the chit can be checked)', !/Traktor tanpa pemuat/.test(sh1) && !/Belum lengkap/.test(sh1), sh1.slice(0, 200));
  if (await p.isVisible('#sheet-x')) await p.click('#sheet-x');
  // loader taken off: the tractor alone asks
  await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('fh.draft2')); const s = all.SSGT; s.marks.L1 = 'C'; delete s.jobOf.L1; localStorage.setItem('fh.draft2', JSON.stringify(all)); });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(500);
  for (const i of await p.$$('#fh-alerts [data-alert]')) await i.fill('Dikutip esok'); await p.click('#fh-check'); await p.waitForTimeout(300);
  const sh = await p.innerText('body');
  await p.waitForTimeout(300); const shx = await p.evaluate(() => (document.querySelector('#sheet') || document.querySelector('#sheet-back') || document.body).innerText); check('tractor with no loader: "semak dulu" asks (absent / little crop / add a replacement as LFF)', /Traktor tanpa pemuat: Pemandu Contoh \(ITF\)/.test(shx) && /LFF/.test(shx), shx.slice(0, 300));
  // a non-collection job is unchanged: no auto lots
  if (await p.isVisible('#ck-back')) await p.click('#ck-back');
  await p.waitForTimeout(200); await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  await p.click('#jb-quick [data-quick="MAN"]'); await p.waitForTimeout(200);
  check('other jobs (MAN) do not fill lots by themselves', (await p.$$eval('#jb-lots .pick[aria-pressed="true"]', a => a.length)) === 0 && await p.isHidden('#jb-pair'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
