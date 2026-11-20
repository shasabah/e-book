// E-Book test (1.77) loading a new version is light, and survives a dropout.
//
// Yu Chen, 19 Nov 2026 21:30: "we have difficulty and delay time of loading a new version", and his own
// practice phone would not come off the old version at all.
//
// Two faults in sw.js, both measured here against the old code before the fix went in:
//
//   1,621 KB downloaded for a release that changed 230 lines. Every file was asked for with
//   cache: 'reload' — "ignore anything you have, send it again" — so look.css, lot-shapes.js and the app
//   icons came down every time. The icons alone are 366 KB and had not changed in four weeks.
//
//   addAll is one batch. ONE file dropping out on an estate line failed the whole install, and the phone
//   stayed on the old version with no error and nothing to show for the wait. That is the silent failure
//   he was looking at.
//
// Measured after the fix: 15 KB, and a dropped file no longer stops the update.
//
// This spec runs its own copy of the site on its own port so it can break files on purpose. It must keep
// working with the network off — that is the whole reason sw.js exists, and the thing most at risk here.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const SITE = fs.mkdtempSync('/tmp/ebook-sw-');
const PORT = 8793;

function copy(rel) {
  const from = path.join(root, rel), to = path.join(SITE, rel);
  const st = fs.statSync(from);
  if (st.isDirectory()) { fs.mkdirSync(to, { recursive: true }); fs.readdirSync(from).forEach(f => copy(path.join(rel, f))); }
  else { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
}
['index.html', 'sw.js', 'manifest.webmanifest', 'core', 'lists', 'rooms'].forEach(f => {
  try { copy(f); } catch (e) {}
});

let served = 0, bytes = 0, failing = [];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  if (failing.some(f => p.endsWith(f))) { res.writeHead(404); res.end('x'); return; }
  const file = path.join(SITE, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('x'); return; }
  const body = fs.readFileSync(file);
  const etag = '"' + crypto.createHash('md5').update(body).digest('hex') + '"';
  served++;
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); res.end(); return; }
  bytes += body.length;
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'text/plain', ETag: etag, 'Cache-Control': 'no-cache' });
  res.end(body);
});

const setVersion = n => {
  const p = path.join(SITE, 'core/version.js');
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/EA\.VERSION = \d+;/, 'EA.VERSION = ' + n + ';'));
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const start = Number((fs.readFileSync(path.join(SITE, 'core/version.js'), 'utf8').match(/EA\.VERSION = (\d+)/) || [])[1]);
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto('http://localhost:' + PORT + '/index.html');
  await p.waitForFunction(() => window.EA && EA.VERSION);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForTimeout(900);
  check('the phone starts on the version the site is serving', (await p.evaluate(() => EA.VERSION)) === start);

  // 1 · an ordinary update, and what it costs
  setVersion(start + 1);
  served = 0; bytes = 0;
  await p.evaluate(() => EA.loadUpdate());
  await p.waitForTimeout(3000);
  await p.waitForFunction(v => window.EA && EA.VERSION === v, start + 1, { timeout: 15000 }).catch(() => {});
  check('MUAT really switches the phone to the new version',
    (await p.evaluate(() => EA.VERSION)) === start + 1);
  check('an update costs a few KB, not the whole app',
    bytes < 400 * 1024, Math.round(bytes / 1024) + ' KB over ' + served + ' requests (was 1,621 KB)');

  // 2 · one file drops out, as it does on an estate line
  setVersion(start + 2);
  failing = ['core/users.js'];
  await p.evaluate(() => EA.loadUpdate());
  await p.waitForTimeout(3000);
  await p.waitForFunction(v => window.EA && EA.VERSION === v, start + 2, { timeout: 15000 }).catch(() => {});
  check('one dropped file does not silently fail the whole update',
    (await p.evaluate(() => EA.VERSION)) === start + 2);
  check('and the phone keeps the copy it already had of that file',
    await p.evaluate(async () => !!(await caches.match('core/users.js', { ignoreSearch: true }))));

  // 3 · the reason sw.js exists at all
  failing = [];
  await ctx.setOffline(true);
  await p.reload().catch(() => {});
  await p.waitForTimeout(1200);
  check('E-Book still opens with the network off',
    await p.evaluate(() => !!(window.EA && EA.VERSION) && !!document.querySelector('#login, #home')));
  await ctx.setOffline(false);

  // 4 · the rules that keep it that way
  const swRaw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  // the comment above the fix quotes the old code on purpose, so judge the code only
  const sw = swRaw.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  check('no file is fetched with "ignore what you have"', !/cache: 'reload'/.test(sw), 'reload');
  check('files are kept one at a time, not as one all-or-nothing batch', !/addAll/.test(sw), 'addAll');
  check('a failed file falls back to the copy already on the phone',
    /caches\.match\(f, \{ ignoreSearch: true \}\)/.test(sw), 'fallback');
  check('pictures may fail without stopping an update',
    /var MUST = FILES\.filter/.test(sw) && /\\\.\(png\|svg\)\$/.test(sw), 'MUST');

  await b.close();
  server.close();
  fs.rmSync(SITE, { recursive: true, force: true });
})();
