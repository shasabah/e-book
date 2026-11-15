// E-Book test (1.9, changed 1.64). Kongsi app · Share the app: the QR shows (and is kept for no signal), copy link,
// WhatsApp text, never the sending link. From 1.64 (Yu Chen, 15 Nov 2026) only the Owner and HQ share the app, from
// Senarai; it is gone from the login page and the home page bottom. Phone setup stays where it was.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P95')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/SECRET-LINK/exec')); });
  await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  // the login page: phone setup stays, Kongsi app is gone
  check('login page: Tetapan telefon still there, Kongsi app gone', await p.isVisible('#open-setup') && await p.locator('#login [data-share-app]').count() === 0);
  await p.evaluate(() => { localStorage.removeItem('ea.sendLink'); }); await p.reload(); await p.waitForTimeout(300);
  // a staff: no Kongsi app anywhere; phone setup at the bottom and in Senarai
  await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  check('staff: no Kongsi app at the bottom', await p.locator('.foot [data-share-app]').count() === 0 && await p.isVisible('.foot [data-open-setup]'));
  await p.evaluate(() => EA.homePane('lists')); await p.waitForTimeout(200);
  check('staff: Senarai has Tetapan telefon, not Kongsi app', await p.isVisible('#pane-lists [data-open-setup]') && !(await p.isVisible('#pane-lists [data-share-app]')));
  await p.click('#who-name'); await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.waitForSelector('#login:not([hidden])');
  // the Owner: Kongsi app in Senarai
  await p.fill('#key', '111111'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => EA.homePane('lists')); await p.waitForTimeout(200);
  await p.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  await p.click('#pane-lists [data-share-app]'); await p.waitForSelector('.share-qr img');
  const ok = await p.evaluate(() => { const i = document.querySelector('.share-qr img'); return i.complete && i.naturalWidth > 0; });
  check('login page: Kongsi app opens the QR picture', ok);
  check('the address shown is the app address', /shasabah\.github\.io\/e-book/.test(await p.textContent('.share-url')));
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await p.click('#sh-copy'); await p.waitForTimeout(200);
  check('SALIN PAUTAN says Disalin', /Disalin/.test(await p.textContent('#toast')));
  await p.click('#sh-wa'); await p.waitForTimeout(100);
  const wa = decodeURIComponent((await p.evaluate(() => window.__opened))[0] || '');
  check('WhatsApp text has the app address and the PIN line', /^https:\/\/wa\.me\/\?text=/.test(wa) && wa.includes('https://shasabah.github.io/e-book/') && /PIN/.test(wa), wa);
  check('the WhatsApp text never carries the sending link', !wa.includes('script.google.com') && !wa.includes('SECRET'));
  await p.click('#sh-close');
  check('CLOSE closes it', await p.locator('#sheet-back').isHidden());
  // English
  await p.evaluate(() => EA.setLang('en'));
  await p.click('#pane-lists [data-share-app]'); await p.waitForSelector('#sheet-title');
  check('English: "Share the app"', /Share the app/.test(await p.textContent('#sheet-title')));
  // the QR is in the phone copy list
  const sw = await (await p.request.get('http://localhost:8765/sw.js')).text();
  check('QR picture is kept on the phone for no signal (sw.js)', sw.includes("'core/qr-app.svg'"));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v20-share.png' });
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
