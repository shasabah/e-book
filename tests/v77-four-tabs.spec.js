// E-Book test (1.61) The new layout's frame (Brief_Susun_Atur, signed 15 Nov 2026; Yu Chen: "Ya I expected the new layout"
// … "Tonight, before midnight"). Four tabs at the bottom of the home page — Hari ini · Rekod · Laporan · Senarai — for
// every position. Hari ini keeps what is late and the day's steps and opens the work rooms; Rekod is tiles (Harian,
// Program, Orang, Durian); Laporan the company's papers; Senarai the lists (Pentadbir, Pekerja, Kilang, Pengguna & PIN,
// phone setup, share the app). Rooms not open yet show nowhere. The room screens are unchanged.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Owner';
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'X-SSGT-01', name: 'Contoh', role, estates: ['SSGT'] }, sw };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  const login = async () => {
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
    await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(400);
  };
  await login();
  const bar = await p.$$eval('#home-bar [data-pane]', a => a.map(x => x.dataset.pane + (x.getAttribute('aria-current') ? '*' : '')).join(' '));
  check('four tabs at the bottom, Hari ini first and on', bar === 'today* rekod laporan lists', bar);
  check('Hari ini: the work room opens from here; no tile for rooms not open yet', await p.locator('#work-screens [data-scr]').count() === 4 && await p.locator('[data-room="field-harvest"]').count() === 0 &&
    await p.locator('[data-room="purchase-store"], [data-room="fleet"], [data-room="hr-payroll"], [data-room="reports"]').count() === 0);
  check('Hari ini: the lists are not on it', await p.locator('#tiles [data-room="workers"], #tiles [data-room="users"], #tiles [data-room="admin"]').count() === 0);
  await p.click('#home-bar [data-pane="lists"]'); await p.waitForTimeout(200);
  check('Senarai: Pentadbir, Pekerja, Kilang, Pengguna & PIN, phone setup and share the app', await p.locator('#pane-lists:not([hidden]) [data-room="admin"]:visible').count() === 1 &&
    await p.locator('#pane-lists [data-room="users"]:visible').count() === 1 && await p.locator('#pane-lists [data-room="workers"]:visible').count() === 1 &&
    await p.locator('#pane-lists [data-room="mills"]:visible').count() === 1 && await p.locator('#pane-lists [data-open-setup]:visible').count() === 1 && await p.locator('#pane-lists [data-share-app]:visible').count() === 1);
  check('Senarai: Hari ini\'s cards are hidden', !(await p.isVisible('#work-screens')) && !(await p.isVisible('#home-main .greet')));
  await p.click('#pane-lists [data-room="users"]'); await p.waitForTimeout(400);
  check('a list opens its screen, unchanged (Pengguna & PIN)', /#users$/.test(p.url()), p.url());
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  check('back home, the same tab is kept (Senarai)', await p.isVisible('#pane-lists [data-room="users"]'));
  await p.click('#home-bar [data-pane="rekod"]'); await p.waitForTimeout(200);
  check('Rekod: tiles Harian, Program, Orang', await p.locator('#pane-rekod [data-rec]').count() === 3);
  await p.click('#pane-rekod [data-rec="prog"]'); await p.waitForTimeout(600);
  check('Rekod › Program opens the records screen on PROGRAM', /#field-harvest\/history$/.test(p.url()) && /Rekod · Program|Records · Plan/.test(await p.textContent('#room h1')) && await p.locator('[data-view]').count() === 0, p.url());
  const inRoom = await p.$$eval('.botbar a', a => a.map(x => x.dataset.pane + (x.getAttribute('aria-current') ? '*' : '')).join(' '));
  check('1.62: inside the records screen the same four tabs, Rekod lit, and only one bar', inRoom === 'today rekod* laporan lists' && await p.locator('.botbar').count() === 1, inRoom);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  await p.click('#pane-rekod [data-rec=""]'); await p.waitForTimeout(600);
  check('Rekod › Harian opens it on HARIAN', /Rekod · Harian|Records · Daily/.test(await p.textContent('#room h1')));
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  await p.click('#home-bar [data-pane="laporan"]'); await p.waitForTimeout(200);
  const lp = await p.innerText('#pane-laporan');
  check('Laporan: daily and monthly, and what is coming (weekly minutes Friday, minutes by Saturday 11 am)', /Harian|Daily/.test(lp) && /Bulanan|Monthly/.test(lp) && /Sabtu 11 pagi|Saturday 11 am/.test(lp), lp.slice(0, 200));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v77-tabs.png' });
  // a staff in charge: Hari ini with the day's steps; no Pentadbir or Pengguna in Senarai
  role = 'Staff'; await login();
  check('staff: opens on Hari ini with "Langkah hari ini"', await p.isVisible('#today .today-card'));
  await p.click('#home-bar [data-pane="lists"]'); await p.waitForTimeout(200);
  check('staff: Senarai has no Pentadbir, no Pengguna & PIN', await p.locator('#pane-lists [data-room="admin"], #pane-lists [data-room="users"]').count() === 0 && await p.isVisible('#pane-lists [data-open-setup]'));
  check('staff: the steps card does not show on another tab', !(await p.isVisible('#today .today-card')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
