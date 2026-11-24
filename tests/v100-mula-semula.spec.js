// E-Book test (1.97) MULA SEMULA LATIHAN. Brief_Latihan_Satu_Login 1.2 §2b, signed by Yu Chen on 24 Nov 2026 ("how do i
// reset the practice mode?", "sign reset"). Only in Latihan: the name menu offers MULA SEMULA LATIHAN; it asks first, asks
// the office (latihan:1), then clears this phone's practice copies and waiting practice entries. Real records, real
// waiting entries and the login are untouched. With no signal nothing is cleared. Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = [], calls = []; p.on('pageerror', e => errs.push(e.message));
  let online = true;
  await ctx.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); calls.push(bd);
    const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: false, error: 'busy' };
    if (bd.action === 'login') o = { ok: true, user: { code: 'OWN-ALL-01', name: 'Pemilik', role: 'Owner', estates: ['SSGT', 'PTAN'] }, sw };
    else if (!online) o = { ok: false, error: 'busy' };
    else if (bd.action === 'latihanReset') o = bd.latihan === 1 ? { ok: true, removed: 7, sw } : { ok: false, error: 'only_in_practice' };
    else if (bd.action === 'people') o = { ok: true, people: [], practice: !!bd.latihan };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); EA.setLang('bm'); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'REAL-1' }])); localStorage.setItem('ea.queue', JSON.stringify([{ tab: 'FH_WORK', row: { id: 'R1', keyed_by: 'OWN-ALL-01' } }])); });
  check('outside Latihan the phone clears nothing', await p.evaluate(() => EA.resetPracticeLocal()) === 0 && await p.evaluate(() => !!localStorage.getItem('fh.chits2')));
  await p.evaluate(() => { EA.setPractice(true); location.reload(); }); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(400);
  check('in Latihan', await p.evaluate(() => EA.practice() && EA.practiceOwn()));
  await p.evaluate(() => {
    EA.local.set('fh.chits2', [{ chit: 'LAT-1' }]); EA.local.set('fh.work', [{ chit: 'LAT-1' }]); EA.local.set('fh.draft2', { SSGT: {} });
    const q = JSON.parse(localStorage.getItem('ea.queue')); q.push({ tab: 'FH_WORK', pr: 1, row: { id: 'L1', keyed_by: 'OWN-ALL-01' } }); localStorage.setItem('ea.queue', JSON.stringify(q));
  });
  check('practice copies sit apart on the phone (L:fh.…)', await p.evaluate(() => !!localStorage.getItem('L:fh.chits2') && JSON.parse(localStorage.getItem('fh.chits2'))[0].chit === 'REAL-1'));
  const open = async () => { await p.click('#who-name'); await p.waitForSelector('#nm-lreset', { timeout: 5000 }); };
  await open();
  check('the name menu offers MULA SEMULA LATIHAN (only in Latihan)', /MULA SEMULA LATIHAN/.test(await p.innerText('#nm-lreset')));
  await p.click('#nm-lreset'); await p.waitForSelector('#lr-ok');
  check('it asks first, and says real records and other people\'s practice are not touched', /Rekod sebenar tidak disentuh/.test(await p.innerText('#sheet')) && /Latihan orang lain tidak disentuh/.test(await p.innerText('#sheet')));
  online = false;
  await p.click('#lr-ok'); await p.waitForTimeout(600);
  check('the office not reached: nothing is cleared, and it says so', await p.evaluate(() => !!localStorage.getItem('L:fh.chits2')) && await p.isVisible('#lr-err'), await p.innerText('#lr-err'));
  check('while it works it says so, and the phone waits up to 2 minutes for this one (a first reset took the office 40 s)', /latihanReset', \{\}, 120000\)/.test(await (await p.request.get('http://localhost:8765/core/home.js')).text()) && /Sedang mengosongkan/.test(await (await p.request.get('http://localhost:8765/core/home.js')).text()));
  online = true; calls.length = 0;
  await p.click('#lr-ok'); await p.waitForTimeout(800);
  const c = calls.find(x => x.action === 'latihanReset');
  check('the office is asked with latihan:1', !!c && c.latihan === 1, JSON.stringify(calls.map(x => x.action)));
  const after = await p.evaluate(() => ({ L: Object.keys(localStorage).filter(k => k.indexOf('L:fh.') === 0), real: JSON.parse(localStorage.getItem('fh.chits2'))[0].chit, q: JSON.parse(localStorage.getItem('ea.queue')).map(x => x.row.id).join(), user: !!localStorage.getItem('ea.user'), pr: EA.practice() }));
  check('the phone\'s practice copies are gone', after.L.length === 0, JSON.stringify(after.L));
  check('the real chit, the real waiting entry and the login stay; the practice entry waiting is dropped', after.real === 'REAL-1' && after.q === 'R1' && after.user, JSON.stringify(after));
  check('still in Latihan, back on Hari ini', after.pr && await p.evaluate(() => !location.hash.replace('#', '')));
  await p.evaluate(() => { EA.setPractice(false); location.reload(); }); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
  await p.click('#who-name'); await p.waitForTimeout(400);
  check('outside Latihan the menu does not offer it', await p.locator('#nm-lreset').count() === 0 && await p.locator('#logout').count() === 1);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
