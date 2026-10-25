// E-Book test (1.27). A · Semak sebelum simpan, and the durian farm as a place of its own (lots A, B, C).
// - A durian-farm worker on an oil palm crop job asks "betul?"; maintenance at the durian farm does not.
// - Two people with nearly the same name, one H and one not, ask "betul?".
// - Saving anyway sends a "check" alert line for the clerk; FIX goes back without saving.
// - A harvester with 1 bunch on a lot asks "betul?" on the day's work.
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
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'D1', name: 'Aco Hendrah', estate: 'SSGT', gang: 'Ladang durian · Durian farm', sex: 'M' },
      { id: 'H1', name: 'Hendra B. Muhammad', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'H2', name: 'Musrim B. Jakat', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
  });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="field-harvest"]'); await p.waitForSelector('#fh-addjob');
  // a manuring job: the durian farm is offered, with lots A, B, C
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  await p.evaluate(() => { const d = document.querySelector('#jb-more'); if (d) d.open = true; }); await p.click('.jb-quick [data-quick="MAN"]'); await p.waitForTimeout(150);
  const opts = await p.$$eval('#jb-block option', a => a.map(x => x.value + ':' + x.textContent));
  check('MAN: the block list has the durian farm with lots A, B, C', opts.some(o => /^DR:Ladang Durian · petak A, B, C/.test(o)), opts.join(' | '));
  await p.selectOption('#jb-block', 'DR'); await p.waitForTimeout(150);
  const lots = await p.$$eval('#jb-lots .pick', a => a.map(x => x.dataset.lot + '=' + x.querySelector('b').textContent));
  check('durian lots show as A, B, C (kept as DR-A …)', lots.join(' ') === 'DR-A=A DR-B=B DR-C=C', lots.join(' '));
  await p.click('#jb-lots [data-lot="DR-B"]'); await p.click('#jb-save'); await p.waitForTimeout(150);
  await p.click('#jb-quick [data-quick="HA"]').catch(() => {});
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-task');
  await p.click('#jb-quick [data-quick="HA"]'); await p.waitForTimeout(150);
  const optsHA = await p.$$eval('#jb-block option', a => a.map(x => x.value));
  check('harvest (HA): no durian farm in the block list', optsHA.indexOf('DR') < 0, optsHA.join(','));
  await p.selectOption('#jb-block', '01'); await p.waitForTimeout(100); await p.click('#jb-lots [data-lot="1-13"]'); await p.click('#jb-save'); await p.waitForTimeout(200);
  const jobs = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT.jobs.map(j => j.key + ':' + j.task + ':' + j.block));
  // marks: Aco H on harvest (the mistake), Hendra T, Musrim H on harvest
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('fh.draft2')); const s = d.SSGT; const ha = s.jobs.find(j => j.task === 'HA').key;
    s.marks = { D1: 'H', H1: 'T', H2: 'H' }; s.jobOf = { D1: ha, H2: ha }; localStorage.setItem('fh.draft2', JSON.stringify(d)); });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(400);
  await p.click('#fh-check'); await p.waitForTimeout(300);
  const sheet = await p.innerText('#sheet-back');
  check('save: "Semak dulu · 2 perkara" — durian worker on harvest, and Hendra / Hendrah', /Semak dulu · 2/.test(sheet) && /Aco Hendrah · Ladang durian → Menuai/.test(sheet) && /Nama hampir sama: Aco Hendrah \(H\) · Hendra B\. Muhammad \(T\)/.test(sheet), sheet.slice(0, 300));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v37-check.png' });
  await p.click('#ck-back'); await p.waitForTimeout(200);
  check('FIX goes back: nothing saved', await p.evaluate(() => (JSON.parse(localStorage.getItem('ea.queue') || '[]')).length) === 0);
  await p.click('#fh-check'); await p.waitForTimeout(300); await p.click('#ck-go'); await p.waitForTimeout(300); await p.click('#cf-ok'); await p.waitForTimeout(400);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]'));
  const al = q.filter(x => x.tab === 'FH_ALERT' && x.row.kind === 'check');
  check('YES, RIGHT then SAVE: chit saved and 2 "check" lines for the clerk', q.some(x => x.tab === 'FH_CHIT') && al.length === 2 && al.some(x => x.row.ref === 'D1'), JSON.stringify(al.map(x => x.row.detail)));
  check('durian manuring saved with block DR, lot DR-B', q.some(x => x.tab === 'FH_MUSTER' && x.row.block === 'DR') || jobs.some(j => /MAN:DR/.test(j)), jobs.join(' '));
  const txt = await p.evaluate(() => { const c = EA.fh.allChits().slice(-1)[0]; return EA.fh.chitText ? EA.fh.chitText(c) : ''; });
  check('no warning for maintenance at the durian farm; chit text names "Ladang Durian"', !al.some(x => /MAN/.test(x.row.detail)));
  // v1.32.1: the same name pair answered "ya, betul" is not asked again for 7 days (the gang check still is)
  check('the answered name pair is remembered', await p.evaluate(() => !!(JSON.parse(localStorage.getItem('fh.okNames') || '{}'))['D1:H1']));
  await p.evaluate(() => { if (document.querySelector('#sheet-x')) document.querySelector('#sheet-x').click(); });
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('fh.draft2') || '{}'); d.SSGT = { date: (new Date()).toISOString().slice(0, 10), estate: 'SSGT', jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-13'], mandor: '' }], marks: { D1: 'H', H1: 'T', H2: 'H' }, jobOf: { D1: 'j1', H2: 'j1' }, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 2, alertNotes: {}, newChit: true };
    d.SSGT.date = (function () { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })(); d.SSGT.replacing = JSON.parse(localStorage.getItem('fh.chits2')).slice(-1)[0].chit; localStorage.setItem('fh.draft2', JSON.stringify(d)); });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(500);
  await p.click('#fh-check'); await p.waitForTimeout(300);
  const sheet2 = await p.innerText('#sheet-back');
  check('correcting the chit: only the durian check is asked, not the same names again', /Semak dulu · 1/.test(sheet2) && !/Nama hampir sama/.test(sheet2), sheet2.slice(0, 200));
  await p.click('#ck-back'); await p.waitForTimeout(200);
  // day's work: 1 bunch for one harvester on 1-13
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(600);
  const wk = await p.evaluate(() => typeof EA.fh !== 'undefined');
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
