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
  check('Senarai: Pentadbir, Pekerja, Kilang, Pengguna & PIN, phone setup and share the app', await p.locator('#pane-lists:not([hidden]) [data-adm="summary"]:visible').count() === 1 &&
    await p.locator('#pane-lists [data-room="users"]:visible').count() === 1 && await p.locator('#pane-lists [data-room="workers"]:visible').count() === 1 &&
    await p.locator('#pane-lists [data-room="mills"]:visible').count() === 1 && await p.locator('#pane-lists [data-open-setup]:visible').count() === 1 && await p.locator('#pane-lists [data-share-app]:visible').count() === 1);
  check('1.64: no LOG OUT button on top; the name opens Tukar PIN, language, phone setup, log out', await p.locator('#top #logout').count() === 0 && await (async () => { await p.click('#who-name'); const ok = await p.isVisible('#nm-pin') && await p.isVisible('#nm-setup') && await p.isVisible('#logout') && await p.locator('[data-nmlang]').count() === 2; await p.click('#sheet-x'); return ok; })());
  check('1.65 Senarai (Owner): lot map, job codes, rates, holidays; Telefon, Masalah and Suis are their own tiles, no Pentadbir tile',
    await p.locator('#tiles-ref [data-ref]').count() === 4 && await p.locator('#tiles-lists [data-adm]').count() === 4 && await p.locator('#tiles-lists [data-room="admin"]').count() === 0,
    await p.$$eval('#pane-lists .tile:not([hidden]) .name', a => a.map(x => x.innerText.trim()).join(' | ')));
  await p.click('[data-ref="map"]'); await p.waitForTimeout(200);
  check('1.65 Peta petak: the estate\'s four blocks, each with its map, view only', await p.locator('#sheet .ref-blk').count() === 4 && await p.locator('#sheet svg.pg-map').count() === 4 && await p.locator('#sheet input').count() === 0);
  await p.click('#sheet-x'); await p.click('[data-ref="jobs"]'); await p.waitForTimeout(200);
  check('1.65 Kod kerja: the estate\'s main jobs (HA first)', await p.locator('#sheet .ref-list li').count() === 17 && /HA/.test(await p.textContent('#sheet .ref-list li')));
  await p.click('#sheet-x'); await p.click('[data-ref="rates"]'); await p.waitForTimeout(200);
  check('1.65 Kadar: no rate on the phone, only where to ask', !/RM|\d+\.\d\d/.test(await p.textContent('#sheet')));
  await p.click('#sheet-x'); await p.click('#tiles-lists [data-adm="switches"]'); await p.waitForTimeout(400);
  check('1.65 Suis opens the switches page', /#admin\/switches$/.test(p.url()), p.url());
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  check('1.65 phone: the side menu\'s brand and sub-lines are hidden', !(await p.isVisible('#home-bar .bar-brand')) && !(await p.isVisible('#home-bar .bar-sub')));
  await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(200);
  const side = await p.evaluate(() => { const r = document.querySelector('#home-bar').getBoundingClientRect(); return { l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), ih: innerHeight }; });
  check('1.65 laptop: the four tabs stand down the left side, full height', side.l === 0 && side.w < 300 && side.h === side.ih && await p.isVisible('#home-bar .bar-brand') && await p.locator('#home-bar .bar-sub:visible').count() === 3, JSON.stringify(side));
  await p.click('#home-bar [data-rsub="org"]'); await p.waitForTimeout(700);
  check('1.65 laptop: Rekod › Orang from the side menu', /Rekod · Orang|Records · People/.test(await p.textContent('#room h1')) && await p.locator('#home-bar .bar-sub.on').count() === 1);
  await p.evaluate(() => { location.hash = ''; }); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300); await p.evaluate(() => EA.homePane('lists')); await p.waitForTimeout(200);
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
  check('1.64 staff: no Kongsi app (Owner and HQ only)', !(await p.isVisible('#pane-lists [data-share-app]')) && await p.locator('.foot [data-share-app]').count() === 0);
  await p.evaluate(() => EA.homePane('today')); await p.waitForTimeout(200);
  check('1.64 staff: the steps are the buttons, no second row under them', await p.locator('#today [data-step]').count() >= 4 && !(await p.isVisible('#work-screens')),
    await p.locator('#today [data-step]').count() + ' steps');
  await p.click('#today [data-step="work"]'); await p.waitForTimeout(500);
  check('1.64 staff: tapping "Kerja" opens Kerja', /#field-harvest\/work$/.test(p.url()), p.url());
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  check('1.64: one estate button with the name, not the code', (await p.textContent('#estate-btn')).trim() === 'Sugut' && await p.locator('#estate-chips').count() === 0, await p.textContent('#estate-btn'));
  await p.evaluate(() => EA.homePane('lists')); await p.waitForTimeout(200);
  check('staff: the steps card does not show on another tab', !(await p.isVisible('#today .today-card')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
