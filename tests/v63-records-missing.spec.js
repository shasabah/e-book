// E-Book test (1.51.3). Records shows every working day, not only days with records (Yu Chen, 6 Nov: "cannot show
// 5 and 6 Nov record?"). October 2026 from the office: records on Mon 26 and Wed 28 Oct only.
// Expect yellow "tiada rekod" rows for Tue 27, Thu 29, Fri 30, Sat 31; none for Sun 25 or before the first live day.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] } };
    const o = bd.action === 'login' ? { ok: true, user: { code: 'OWN-ALL-01', name: 'Pemilik', role: 'Owner', estates: ['SSGT'] }, sw } : { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  const day = (date, n) => ({ date, chits: [{ id: 'c' + date, chit: 'MC-' + date, rows: Array.from({ length: n }, (_, i) => ({ worker_id: 'W' + i, muster: 'H', task_code: 'HA', block: '02', lots: '2-1' })), versions: [] }],
    work: [{ worker_id: 'W0', task_code: 'HA', block: '02', lot: '2-1', bunches: '100' }], harvest: 100, lorries: [], tickets: [] });
  await p.evaluate(({ days }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P93')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('fh.hist.SSGT.2026-10', JSON.stringify({ at: '2026-11-06 07:00', days }));
  }, { days: [day('2026-10-28', 5), day('2026-10-26', 4)] });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForSelector('#hs-pick');
  for (let i = 0; i < 24; i++) {
    const lab = await p.innerText('#hs-pick');
    if (/(Oktober|October) 2026/i.test(lab)) break;
    await p.click('#hs-prev'); await p.waitForTimeout(150);
  }
  const lab = await p.innerText('#hs-pick');
  check('reached October 2026, 2 days with records', /(Oktober|October) 2026/i.test(lab) && /\b2\b/.test(lab), lab);
  const miss = await p.$$eval('.rk-miss', els => els.map(e => e.innerText.split('\n')[0]));
  check('4 yellow days: Tue 27, Thu 29, Fri 30, Sat 31', miss.length === 4 && ['27', '29', '30', '31'].every(n => miss.some(m => new RegExp('\\b' + n + '\\b').test(m))), JSON.stringify(miss));
  check('no row for Sunday 25 or before the first day with records', !miss.some(m => /\b(25|24|23)\b/.test(m)), JSON.stringify(miss));
  const txt = await p.innerText('#hs-list');
  check('the missing day says nothing came in, with yellow P and K', /(tiada rekod|nothing came in)/i.test(txt) && (await p.$$eval('.rk-miss .rk-dots i.w', e => e.length)) === 8, txt.slice(0, 200));
  check('the 2 real days are still there', (await p.$$('.rk-r[data-day]')).length === 2);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
