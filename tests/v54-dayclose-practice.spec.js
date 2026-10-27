// E-Book test (1.43.1). TUTUP HARI before the start date (4 Nov 2026):
// - a practice login (Mod Latihan, code L-) sees yesterday's chit as a day to close;
// - a real Staff login with the same chit and the office start date in the future sees nothing to close.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
async function run(b, code, keyPrefix) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: code, name: 'Staf', role: 'Staff', estates: ['SSGT'], practice: /^L-/.test(code) }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'dayclose') o = { ok: true, estate: 'SSGT', from: '2099-01-01', days: [] };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  const d = new Date(); d.setDate(d.getDate() - 1);
  const yd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  await p.evaluate(({ yd, kp }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem(kp + 'fh.dayclose.office.SSGT', JSON.stringify({ at: Date.now(), from: '2099-01-01', days: [] }));
    localStorage.setItem(kp + 'fh.chits2', JSON.stringify([{ chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', confirmedAt: '06:10', rev: 1, jobs: [],
      rows: [{ id: 'm1', worker_id: 'H1', muster: 'H', task_code: 'HA', block: '01', lots: '1-13' }] }]));
  }, { yd, kp: keyPrefix });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForTimeout(1200);
  const txt = await p.innerText('#room');
  await p.close();
  return { txt, errs };
}
(async () => {
  const b = await chromium.launch();
  const pr = await run(b, 'L-STF-SSGT-01', 'L:');
  check('practice login: yesterday is a day to close before the start date', /Semakan sebelum tutup/.test(pr.txt) && !/Semua hari sudah ditutup/.test(pr.txt), pr.txt.slice(0, 200));
  const re = await run(b, 'STF-SSGT-01', '');
  check('real login: nothing to close before the start date', /Semua hari sudah ditutup/.test(re.txt), re.txt.slice(0, 200));
  check('no page errors', pr.errs.length + re.errs.length === 0, pr.errs.concat(re.errs).join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
