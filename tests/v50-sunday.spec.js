// E-Book test (1.41) F: all Sunday work needs the Assistant Manager's approval (Sugut rate list). A chit saved on a
// Sunday sends one request (kind jobask, LULUS / TOLAK); a weekday chit sends none. Made-up workers only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
async function run(b, when, day, task) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.setFixedTime(new Date(when));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', at: day + ' 07:00', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(([t, TASK]) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([{ id: 'W1', name: 'Pekerja Contoh Satu', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }, { id: 'W2', name: 'Pekerja Contoh Dua', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: t, estate: 'SSGT', jobs: [{ key: 'j1', task: TASK, block: '', lots: [], mandor: '' }], marks: { W1: 'H', W2: 'H' }, jobOf: { W1: 'j1', W2: 'j1' }, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 2, alertNotes: {} } }));
  }, [day, task]);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForSelector('#fh-addjob'); await p.waitForTimeout(600);
  for (const i of await p.$$('#fh-alerts [data-alert]')) await i.fill('ok');
  await p.click('#fh-check'); await p.waitForTimeout(300);
  if (await p.isVisible('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
  if (await p.isVisible('#cf-ok')) { await p.click('#cf-ok'); await p.waitForTimeout(500); }
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ea.queue') || '[]'));
  await p.close();
  return { chit: q.filter(x => x.tab === 'FH_CHIT').length, ask: q.filter(x => x.tab === 'FH_ALERT' && x.row.kind === 'sunask').map(x => x.row), errs };
}
(async () => {
  const b = await chromium.launch();
  // 26 Oct: the request after the work is switched off (Sunday work to be approved before it starts, coming after 3 Nov).
  const off = await run(b, '2026-11-01T06:30:00+08:00', '2026-11-01', 'CA');
  check('Sunday request from the chit is switched off for now', off.chit === 1 && off.ask.length === 0, JSON.stringify(off.ask));
  await b.close(); return;
  const sun = await run(b, '2026-11-01T06:30:00+08:00', '2026-11-01', 'CA');
  check('Sunday: the chit is saved', sun.chit === 1, String(sun.chit));
  check('Sunday, day-paid work not FFB (creche): one request "Kerja hari Ahad: 2 orang"', sun.ask.length === 1 && /^Kerja hari Ahad: 2 orang · CA/.test(sun.ask[0].detail) && /perlu lulus/.test(sun.ask[0].staff_note), JSON.stringify(sun.ask));
  const crop = await run(b, '2026-11-01T06:30:00+08:00', '2026-11-01', 'LF');
  check('Sunday, crop work (loose fruit): no request', crop.chit === 1 && crop.ask.length === 0, JSON.stringify(crop.ask));
  const mon = await run(b, '2026-11-02T06:30:00+08:00', '2026-11-02', 'CA');
  check('Monday: no request', mon.chit === 1 && mon.ask.length === 0, JSON.stringify(mon.ask));
  check('no page errors', !sun.errs.length && !mon.errs.length && !crop.errs.length, sun.errs.concat(mon.errs, crop.errs).join(' | '));
  await b.close();
})();
