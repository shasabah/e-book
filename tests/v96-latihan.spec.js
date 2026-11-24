// E-Book test (1.90). Latihan satu login (Yu Chen, 24 Nov 2026: "i dun need to latihan and cuba baru for new id right?",
// "cause my current need new id for latihan. can you help fix it", "urgent for new user like paitan and meliau").
// Brief_Latihan_Satu_Login. Below:
// - MASUK LATIHAN in the name menu of a real login; orange stripes, the band and KELUAR LATIHAN on the screen;
// - in Latihan: made-up workers (also at Meliau), no Pengguna / Pentadbir tiles, no TUKAR PIN, every office call carries latihan:1;
// - a record keyed in Latihan is sent only in Latihan (practice:1), a real record only outside it (no practice flag);
// - KELUAR LATIHAN with practice records waiting asks first; the real worker list comes back after;
// - Latihan is kept only for this opening of the app (sessionStorage): a new opening starts real.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = [], calls = []; p.on('pageerror', e => errs.push(e.message));
  let online = true;
  await ctx.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); calls.push(bd);
    const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (!online) o = { ok: false, error: 'busy' };
    else if (bd.action === 'login') o = { ok: true, user: { code: 'OWN-ALL-01', name: 'Pemilik', role: 'Owner', estates: ['SSGT', 'MELU', 'PTAN'] }, sw };
    else if (bd.action === 'people') o = bd.latihan ? { ok: true, people: [], practice: true } : { ok: true, people: [{ id: 'H1', name: 'Ahmad Bin Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }] };
    else if (bd.action === 'saveBatch') o = { ok: true, results: bd.items.map(it => ({ id: it.row.id, ok: true })), sw };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([{ id: 'H1', name: 'Ahmad Bin Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
  });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  const st = () => p.evaluate(() => ({ pr: EA.practice(), own: EA.practiceOwn(), top: document.getElementById('top').className, band: !document.getElementById('practice-band').hidden,
    out: !document.getElementById('practice-out').hidden, w: EA.lists.workersFor('SSGT').map(w => w.name).join(','), m: EA.lists.workersFor('MELU').length,
    tiles: document.getElementById('tiles-lists').innerText }));
  let s = await st();
  check('a real login starts real: no stripes, no band, the real worker list', !s.pr && !/practice/.test(s.top) && !s.band && s.w === 'Ahmad Bin Contoh', JSON.stringify(s).slice(0, 200));
  await p.click('#who-name');
  check('the name menu has MASUK LATIHAN and TUKAR PIN SAYA', await p.locator('#nm-lat').count() === 1 && /MASUK LATIHAN/.test(await p.innerText('#nm-lat')) && await p.locator('#nm-pin').count() === 1);
  // a real record waiting before Latihan
  online = false;
  await p.click('#nm-lat'); await p.waitForSelector('#lat-in');
  check('entering asks first and says where the records go', /buku latihan sahaja/.test(await p.innerText('#sheet')));
  await p.click('#lat-in'); await p.waitForSelector('[data-lr="Staff"]');
  check('the Owner is asked which position to practise (Staf bertugas, Kerani, Pengurus, own)', await p.locator('[data-lr]').count() === 4);
  await p.click('[data-lr=""]'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
  s = await st();
  check('in Latihan: orange stripes, the band and KELUAR LATIHAN', s.pr && s.own && /practice/.test(s.top) && s.band && s.out, JSON.stringify(s).slice(0, 200));
  check('in Latihan: made-up workers, at Sugut and at Meliau too', /Pekerja Contoh/.test(s.w) && !/Ahmad/.test(s.w) && s.m > 0, s.w.slice(0, 80));
  check('in Latihan: no Pengguna or Pentadbir tiles', !/Pengguna|Telefon|Suis/.test(s.tiles), s.tiles.slice(0, 120));
  await p.click('#who-name');
  check('in Latihan the name menu has KELUAR LATIHAN and no TUKAR PIN', /KELUAR LATIHAN/.test(await p.innerText('#nm-lat')) && await p.locator('#nm-pin').count() === 0);
  await p.evaluate(() => EA.ui.closeSheet());
  // records: one practice, sent in Latihan with latihan:1
  online = true; calls.length = 0;
  await p.evaluate(() => { EA.save('FH_MUSTER', 'FH', 'MELU', { worker_id: 'W-MELU-001', muster: 'H' }); });
  await p.evaluate(() => EA.send()); await p.waitForTimeout(800);
  let sb = calls.filter(c => c.action === 'saveBatch');
  check('a practice record is sent with latihan:1', sb.length >= 1 && sb.every(c => c.latihan === 1) && sb[0].items[0].row.estate === 'MELU', JSON.stringify(sb.map(c => c.latihan)));
  check('every office call in Latihan carries latihan:1', calls.length > 0 && calls.every(c => c.latihan === 1), JSON.stringify(calls.map(c => c.action + ':' + c.latihan)));
  check('the row itself carries no practice column (the office sheet is unchanged)', sb.length && !('practice' in sb[0].items[0].row) && !('pr' in sb[0].items[0].row));
  // a practice record left waiting, then KELUAR LATIHAN asks first
  online = false;
  await p.evaluate(() => { EA.save('FH_MUSTER', 'FH', 'MELU', { worker_id: 'W-MELU-002', muster: 'H' }); });
  await p.click('#practice-out'); await p.waitForSelector('#ll-out');
  check('KELUAR LATIHAN with a practice record waiting asks first', /1 rekod latihan belum dihantar/.test(await p.innerText('#sheet')));
  await p.click('#ll-out'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
  s = await st();
  check('after KELUAR LATIHAN: real again, real workers, tiles back', !s.pr && !s.band && s.w === 'Ahmad Bin Contoh' && /Pengguna/.test(s.tiles), JSON.stringify(s).slice(0, 200));
  check('the practice record waits apart: it is not counted or sent outside Latihan', await p.evaluate(() => EA.waitingMine() === 0 && EA.waitingOtherMode() === 1));
  // a real record outside Latihan is sent without the flag, and the practice one stays
  online = true; calls.length = 0;
  await p.evaluate(() => { EA.save('FH_MUSTER', 'FH', 'SSGT', { worker_id: 'H1', muster: 'H' }); });
  await p.evaluate(() => EA.send()); await p.waitForTimeout(800);
  sb = calls.filter(c => c.action === 'saveBatch');
  check('a real record is sent with no practice flag, and only the real one', sb.length >= 1 && sb.every(c => !c.latihan) && sb.every(c => c.items.every(it => it.row.estate === 'SSGT')), JSON.stringify(sb.map(c => [c.practice, c.items.length])));
  check('the practice record is still waiting for Latihan', await p.evaluate(() => EA.waitingOtherMode() === 1));
  // Latihan again: the waiting practice record goes, with latihan:1
  await p.evaluate(() => { EA.setPractice(true); location.reload(); }); await p.waitForSelector('#home:not([hidden])'); calls.length = 0;
  await p.evaluate(() => EA.send()); await p.waitForTimeout(800);
  sb = calls.filter(c => c.action === 'saveBatch');
  check('back in Latihan the waiting practice record is sent, with latihan:1', sb.length >= 1 && sb.every(c => c.latihan === 1) && sb[0].items[0].row.worker_id === 'W-MELU-002' && await p.evaluate(() => EA.waitingOtherMode() === 0), JSON.stringify(sb.map(c => c.latihan)));
  // v1.91 LATIH SEBAGAI: the Owner practises as Staf bertugas, then as Kerani
  await p.click('#who-name'); await p.click('#nm-lrole'); await p.waitForSelector('[data-lr="Staff"]');
  await p.click('[data-lr="Staff"]'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(400);
  let a = await p.evaluate(() => ({ role: EA.currentUser().role, real: EA.realRole(), kept: JSON.parse(localStorage.getItem('ea.user')).role, as: document.getElementById('practice-as').innerText,
    steps: !!document.getElementById('today') && !document.getElementById('today').hidden, top: document.getElementById('who-role').innerText }));
  check('as Staf bertugas: the screens follow the Staff position (Langkah hari ini), the band says so', a.role === 'Staff' && a.steps && /Latih sebagai/.test(a.as), JSON.stringify(a));
  check('the kept login is still the Owner (nothing real changes)', a.real === 'Owner' && a.kept === 'Owner');
  calls.length = 0; online = true;
  await p.evaluate(() => { EA.save('FH_MUSTER', 'FH', 'MELU', { worker_id: 'W-MELU-003', muster: 'H' }); }); await p.evaluate(() => EA.send()); await p.waitForTimeout(600);
  check('every call carries latihan:1 and latihanRole Staff', calls.length > 0 && calls.every(c => c.latihan === 1 && c.latihanRole === 'Staff'), JSON.stringify(calls.map(c => c.action + ':' + c.latihanRole)));
  await p.click('#who-name'); await p.click('#nm-lrole'); await p.click('[data-lr="Clerk"]'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
  check('switching to Kerani takes the Clerk position', await p.evaluate(() => EA.currentUser().role === 'Clerk' && !!EA.practice()));
  await p.click('#practice-out'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
  check('KELUAR LATIHAN brings back the Owner, with no practice position left', await p.evaluate(() => EA.currentUser().role === 'Owner' && !EA.practice() && EA.latihanRole() === '' && !sessionStorage.getItem('ea.latihanRole')));
  check('outside Latihan a stored position does nothing', await p.evaluate(() => { sessionStorage.setItem('ea.latihanRole', 'Staff'); const r = EA.currentUser().role; sessionStorage.removeItem('ea.latihanRole'); return r === 'Owner'; }));
  await p.evaluate(() => { EA.setPractice(true); EA.setLatihanRole(''); location.reload(); }); await p.waitForSelector('#home:not([hidden])');
  // a new opening of the app (a new tab = new sessionStorage) starts real
  const p2 = await ctx.newPage(); await p2.goto('http://localhost:8765/index.html'); await p2.waitForSelector('#home:not([hidden])');
  check('closing and opening the app again starts real (Latihan is for one opening only)', await p2.evaluate(() => !EA.practice() && document.getElementById('practice-band').hidden));
  // log out ends Latihan
  await p.evaluate(() => { EA.logout(); }); 
  check('log out ends Latihan', await p.evaluate(() => { try { return !sessionStorage.getItem('ea.latihan'); } catch (e) { return false; } }));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
