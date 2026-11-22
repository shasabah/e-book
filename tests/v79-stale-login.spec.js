// E-Book test (1.70) Yu Chen, 17 Nov 2026 11:20 pm: "the tekara still there". A login kept on the phone from before
// 1.68 still lists TKRS; the phone must drop a retired estate itself, not wait for a fresh login. Also: the Owner and
// HQ open on an estate that is keying, and the calendar tile shows at Meliau and Kawananan (loaded in 1.69).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let estates = ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'], role = 'Owner';
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT', 'PTAN'] }, cleanFrom: '' };
    let o = { ok: false, error: 'busy' };
    if (bd.action === 'login') o = { ok: true, user: { code: 'OWN-ALL-01', name: 'Pemilik Contoh', role, estates }, sw };
    else if (bd.action === 'todo') o = { ok: true, estate: bd.estate, items: [] };
    else if (bd.action === 'switches') o = { ok: true, sw };
    else if (bd.action === 'rates') o = role === 'Owner' ? { ok: true, estate: bd.estate, rates: [{ id: 'R1', task_code: 'HA', pay_unit: 'MT', band: 'Kadar contoh panjang untuk menguji lebar skrin telefon · 30mt & above', rate_rm: 12.5, target_day: '1.5MT', from_date: '2025-05-01', note: 'Harvesting', approved_by: 'HQ contoh' }, { id: 'R2', task_code: '', pay_unit: 'month', band: 'Elaun contoh', rate_rm: 0.015, target_day: '', from_date: '', note: 'Mandore · x', approved_by: 'HQ contoh' }] } : { ok: false, error: 'not_allowed' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(500);
  check('the login kept on the phone still carries TKRS (as before 1.68)', await p.evaluate(() => JSON.parse(localStorage.getItem('ea.user')).estates.indexOf('TKRS') >= 0));
  check('every screen reads the user without it', await p.evaluate(() => EA.currentUser().estates.join(',')) === 'SDK,MELU,SSGT,PTAN,KWNN');
  check('the Owner opens on an estate that is keying (Sugut), not on Meliau', await p.getAttribute('#estate-btn', 'data-estate') === 'SSGT', await p.getAttribute('#estate-btn', 'data-estate'));
  await p.click('#estate-btn'); await p.waitForTimeout(200);
  const pick = await p.$$eval('#sheet [data-estate]', a => a.map(x => x.textContent.trim()).join(', '));
  check('the estate picker does not offer Tekara', !/Tekara|TKRS/.test(pick) && /Paitan/.test(pick), pick);
  await p.click('#sheet [data-estate="MELU"]'); await p.waitForTimeout(300);
  await p.evaluate(() => EA.homePane('lists')); await p.waitForTimeout(300);
  check('Meliau: the Cuti umum tile shows, and the lot map since its land went in (18 Nov)', await p.locator('[data-ref="hol"]').count() === 1 && await p.locator('[data-ref="map"]').count() === 1);
  await p.click('[data-ref="hol"]'); await p.waitForTimeout(200);
  check('Meliau: the sheet has its own calendar', /Meliau/.test(await p.textContent('#sheet-title')) && await p.locator('#sheet .ref-tab tr').count() === 14);
  // a login that is TKRS only is never stripped bare
  check('a TKRS-only login keeps its one code (never left with no estate)', await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('ea.user')); u.estates = ['TKRS']; localStorage.setItem('ea.user', JSON.stringify(u)); return EA.currentUser().estates.join(','); }) === 'TKRS');
  // the rate list: Owner and HQ only (Yu Chen: "owner and hq"); made-up rates
  const bk = async () => { const x = await p.$('#sheet button'); if (x) await x.click(); await p.waitForTimeout(200); };
  await bk(); await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('ea.user')); u.estates = ['SDK', 'MELU', 'SSGT', 'PTAN', 'KWNN']; localStorage.setItem('ea.user', JSON.stringify(u)); });
  check('Meliau: the Owner has the Kadar tile too', await p.locator('[data-ref="rates"]').count() === 1 && /Senarai kadar/.test(await p.textContent('[data-ref="rates"]')));
  await p.click('[data-ref="rates"]'); await p.waitForTimeout(600);
  let rt = await p.innerText('#sheet');
  check('Owner: the list shows by section, with the rate, unit, job code, target and from-date', /Harvesting/.test(rt) && /RM 12\.50/.test(rt) && /\/ MT/.test(rt) && /HA · sasaran 1\.5MT · dari 01\/05\/25/.test(rt) && /Mandore/.test(rt) && /RM 0\.015/.test(rt), rt.replace(/\n+/g, ' | ').slice(0, 300));
  const w2 = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth, ...[...document.querySelectorAll('#sheet *')].map(e => Math.round(e.getBoundingClientRect().right)).filter(x => x > innerWidth + 1)]);
  check('the rate list is not wider than the phone', w2[0] <= w2[1] + 1 && w2.length === 2, w2.join(' '));
  check('no rate is kept on the phone', await p.evaluate(() => !/12\.5|0\.015|Kadar contoh/.test(JSON.stringify(Object.assign({}, localStorage)))));
  await bk(); role = 'Staff'; estates = ['SSGT'];
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(400);
  await p.evaluate(() => EA.homePane('lists')); await p.waitForTimeout(300); await p.click('[data-ref="rates"]'); await p.waitForTimeout(400);
  rt = await p.innerText('#sheet');
  check('staff in charge: still "ask HQ", no RM and no question sent to the office', /Tanya Ibu Pejabat/.test(rt) && !/RM \d/.test(rt), rt.replace(/\n+/g, ' | ').slice(0, 160));
  check('no page errors', errs.length === 0, errs.join(' ; '));
  await b.close();
})();
