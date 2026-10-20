// E-Book test (1.13). The app logo: manifest with the icons, the iPhone icon, the logo at the top of the
// app and on the login page, and the icon files kept on the phone for no-signal use.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  const man = await p.evaluate(async () => { const h = document.querySelector('link[rel=manifest]').href; return (await fetch(h)).json(); });
  check('manifest: name E-Book under the icon, opens like an app', man.short_name === 'E-Book' && man.display === 'standalone');
  const srcs = man.icons.map(i => i.src);
  const ok = await p.evaluate(async l => (await Promise.all(l.map(u => fetch(u).then(r => r.ok && /image/.test(r.headers.get('content-type')))))).every(Boolean), srcs.concat(['core/icons/apple-touch-icon.png', 'core/icons/favicon-32.png', 'core/icons/logo.svg']));
  check('manifest: 192, 512 and round-crop 512 icons, all files load', man.icons.length === 3 && man.icons.some(i => i.purpose === 'maskable') && ok);
  check('iPhone home-screen icon is set', await p.locator('link[rel=apple-touch-icon]').count() === 1);
  const logo = await p.evaluate(() => { const i = document.querySelector('#login .brand-mark img'); return i && i.complete && i.naturalWidth > 0; });
  check('login page shows the logo', logo);
  await p.evaluate(() => { localStorage.setItem('ea.phone', JSON.stringify('P97')); });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  const top = await p.evaluate(() => { const i = document.querySelector('#home .brand-mark img'); const r = i && i.getBoundingClientRect(); return i && i.naturalWidth > 0 && r.width >= 30 && r.width <= 48; });
  check('top of the app shows the logo at a small size', top);
  const sw = require('fs').readFileSync(require('path').resolve(__dirname, '..', 'sw.js'), 'utf8');
  check('icon files kept on the phone (no signal)', ['manifest.webmanifest', 'core/icons/logo.svg', 'core/icons/icon-192.png', 'core/icons/apple-touch-icon.png'].every(f => sw.includes("'" + f + "'")));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
