// E-Book test (1.108). LATIH SEBAGAI for every real login (Yu Chen, 26 Nov 2026: "i need my clerk and assistnat can
// pratice for staff cause they might have different structure", "run today ... meliau team request wanna to pratice early").
// Brief_Latihan_Satu_Login 1.3 §2c. Below:
// - a Kerani at Meliau taps MASUK LATIHAN and is asked Latih sebagai: Staf bertugas, Pengurus, or her own position (Kerani once);
// - as Staf bertugas the screens and every call follow the Staff position; the kept login stays Kerani;
// - KELUAR LATIHAN brings back the Kerani; outside Latihan a stored position does nothing;
// - a practice ID (L-) is not asked: it practises its own position only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = [], calls = []; p.on('pageerror', e => errs.push(e.message));
  let who = { code: 'CLK-MELU-01', name: 'Kerani Meliau', role: 'Clerk', estates: ['MELU'] };
  await ctx.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); calls.push(bd);
    const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: who, sw };
    else if (bd.action === 'people') o = { ok: true, people: [], practice: !!bd.latihan };
    else if (bd.action === 'saveBatch') o = { ok: true, results: bd.items.map(it => ({ id: it.row.id, ok: true })), sw };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P40')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
  });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  check('the Kerani logs in as Kerani', await p.evaluate(() => EA.currentUser().role === 'Clerk' && !EA.practice()));
  await p.click('#who-name'); await p.click('#nm-lat'); await p.waitForSelector('#lat-in');
  await p.click('#lat-in'); await p.waitForSelector('[data-lr]');
  const opts = await p.$$eval('[data-lr]', bs => bs.map(x => x.dataset.lr));
  check('the Kerani is asked Latih sebagai: Staf bertugas, Pengurus, own position (Kerani shown once)', JSON.stringify(opts) === JSON.stringify(['Staff', 'Manager', '']), JSON.stringify(opts));
  await p.click('[data-lr="Staff"]'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(400);
  const a = await p.evaluate(() => ({ role: EA.currentUser().role, kept: JSON.parse(localStorage.getItem('ea.user')).role, pr: EA.practice(),
    as: document.getElementById('practice-as').innerText, steps: !!document.getElementById('today') && !document.getElementById('today').hidden }));
  check('as Staf bertugas: Staff screens (Langkah hari ini), the band says so, in Latihan', a.role === 'Staff' && a.pr && a.steps && /Latih sebagai/.test(a.as), JSON.stringify(a));
  check('the kept login is still Kerani', a.kept === 'Clerk');
  calls.length = 0;
  await p.evaluate(() => { EA.save('FH_MUSTER', 'FH', 'MELU', { worker_id: 'W-MELU-001', muster: 'H' }); }); await p.evaluate(() => EA.send()); await p.waitForTimeout(700);
  const sb = calls.filter(c => c.action === 'saveBatch');
  check('the practice record goes with latihan:1 and latihanRole Staff', sb.length >= 1 && sb.every(c => c.latihan === 1 && c.latihanRole === 'Staff'), JSON.stringify(sb.map(c => [c.latihan, c.latihanRole])));
  await p.click('#who-name');
  check('the name menu offers LATIH SEBAGAI… to switch', await p.locator('#nm-lrole').count() === 1);
  await p.evaluate(() => EA.ui.closeSheet());
  await p.click('#practice-out'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
  check('KELUAR LATIHAN brings back the Kerani, no practice position left', await p.evaluate(() => EA.currentUser().role === 'Clerk' && !EA.practice() && EA.latihanRole() === ''));
  check('outside Latihan a stored position does nothing', await p.evaluate(() => { sessionStorage.setItem('ea.latihanRole', 'Staff'); const r = EA.currentUser().role; sessionStorage.removeItem('ea.latihanRole'); return r === 'Clerk'; }));
  // a practice ID (L-) keeps its own position
  await p.evaluate(() => EA.logout());
  who = { code: 'L-CLK-MELU-01', name: 'Latihan Kerani', role: 'Clerk', estates: ['MELU'], practice: true };
  await p.evaluate(() => { localStorage.removeItem('ea.user'); location.reload(); });
  await p.waitForSelector('#key'); await p.fill('#key', '654321'); await p.waitForSelector('#home:not([hidden])');
  check('a practice ID (L-) cannot pick another position', await p.evaluate(() => !EA.canPickRole() && EA.latihanRole() === '' && EA.currentUser().role === 'Clerk'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
