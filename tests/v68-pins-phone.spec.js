// E-Book test (1.53). Phone: Pengguna & PIN → LIHAT PIN (own PIN typed again, list in a sheet, "PIN lama" for
// PINs from before 1.53) and, for every user, tap your own name → Tukar PIN saya. Made-up people.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Owner'; const asked = [];
  await p.route('https://script.google.com/**', rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); asked.push(bd); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] } };
    let o = { ok: false, error: 'busy' };
    if (bd.action === 'login') o = role === 'Owner' ? { ok: true, user: { code: 'OWN-ALL-01', name: 'Pemilik Contoh', role: 'Owner', estates: ['SSGT', 'PTAN'] }, sw }
      : { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'users') o = { ok: true, me: 'OWN-ALL-01', users: [
      { code: 'OWN-ALL-01', name: 'Pemilik Contoh', role: 'Owner', estates: ['SSGT', 'PTAN'], status: 'active', phones: ['P20'] },
      { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'], status: 'active', phones: ['P21'] },
      { code: 'CLK-PTAN-01', name: 'Kerani Contoh', role: 'Clerk', estates: ['PTAN'], status: 'active', phones: ['P22'] }] };
    else if (bd.action === 'userPins') o = bd.pin !== '246810' ? { ok: false, error: 'wrong_pin' } : { ok: true, pins: [
      { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'], pin: '583920' },
      { code: 'CLK-PTAN-01', name: 'Kerani Contoh', role: 'Clerk', estates: ['PTAN'], pin: '' }] };
    else if (bd.action === 'myPin') o = bd.pin === '123456' ? { ok: false, error: 'pick_another' } : { ok: true };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P20')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  await p.reload(); await p.fill('#key', '246810'); await p.waitForSelector('#home:not([hidden])');

  // Owner: LIHAT PIN
  await p.evaluate(() => { location.hash = 'users'; }); await p.waitForSelector('#us-pins');
  await p.click('#us-pins'); await p.waitForSelector('#pv-pin');
  await p.fill('#pv-pin', '111222'); await p.click('#pv-ok'); await p.waitForTimeout(300);
  check('a wrong own PIN: told, no list', /salah|wrong/i.test(await p.innerText('#pv-err')) && !(await p.$('.pv-pin')));
  await p.fill('#pv-pin', '246810'); await p.click('#pv-ok'); await p.waitForSelector('.pv-pin');
  const t = await p.innerText('#sheet');
  check('the list shows the Staff PIN', t.includes('Staf Contoh') && t.includes('583920'));
  check('a PIN from before 1.53 shows "PIN lama" with how to fix it', /PIN lama|old PIN/.test(t) && /PIN BARU|NEW PIN/.test(t));
  check('the list says: to that person only, never a group', /grup|group/i.test(t));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v68-pins.png' });
  await p.click('#pv-close'); await p.waitForTimeout(200);
  check('closed: the PINs are gone from the screen', !(await p.$('.pv-pin')) && !(await p.content()).includes('583920'));

  // Staff: tap own name → Tukar PIN saya
  role = 'Staff';
  await p.evaluate(() => { location.hash = ''; localStorage.removeItem('ea.user'); localStorage.setItem('ea.phone', JSON.stringify('P21')); });
  await p.reload(); await p.waitForSelector('#key'); await p.fill('#key', '135790'); await p.waitForSelector('#home:not([hidden])');
  await p.click('#who-name'); await p.waitForSelector('#my-1');
  await p.fill('#my-1', '123456'); await p.fill('#my-2', '123457'); await p.click('#my-ok');
  check('two different PINs: told, nothing sent', /tidak sama|not the same/i.test(await p.innerText('#my-err')) && !asked.some(a => a.action === 'myPin'));
  await p.fill('#my-1', '123456'); await p.fill('#my-2', '123456'); await p.click('#my-ok'); await p.waitForTimeout(300);
  check('an easy PIN: the office answer shows', /lain|another/i.test(await p.innerText('#my-err')));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v68-mypin.png' });
  await p.fill('#my-1', '579135'); await p.fill('#my-2', '579135'); await p.click('#my-ok'); await p.waitForTimeout(400);
  const key = await p.evaluate(() => (JSON.parse(localStorage.getItem('ea.user') || '{}')).key);
  check('saved: this phone now uses the new PIN', key === '579135' && !(await p.$('#my-1')), key);
  const sent = asked.filter(a => a.action === 'myPin').pop() || {};
  check('the change was asked with the old PIN as the key', sent.key === '135790' && sent.pin === '579135');
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
