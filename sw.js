// Foundation: keeps a copy of the whole app on the phone, so E-Book opens
// with no signal. Entries are NOT kept here; they stay in the phone's
// saving (core/sync.js) until sent.
//
// When core/version.js gets a new number, the phone notices, downloads the
// new copy in the background, and the LOAD IT button switches to it.
importScripts('core/version.js');

// The page registers this file as sw.js?v=<version>, so a new version is a new file.
var CACHE = 'ebook-v' + (new URL(location.href).searchParams.get('v') || EA.VERSION);
var FILES = [
  './',
  'index.html',
  'core/look.css',
  'core/version.js',
  'core/config.js',
  'core/rooms.js',
  'core/sync.js',
  'core/lang.js',
  'core/login.js',
  'core/update.js',
  'core/home.js',
  'lists/estates.js',
  'lists/test-users.js',
  'lists/tasks.js',
  'lists/lots.js', 'lists/lot-shapes.js',
  'lists/targets.js',
  'rooms/field/muster.js',
  'rooms/field/work.js', 'rooms/field/dayclose.js',
  'rooms/field/harvest.js', 'rooms/field/collect.js', 'rooms/field/ticket.js',
  'rooms/field/history.js', 'rooms/field/program.js', 'rooms/field/people.js',
  'core/users.js', 'core/workers.js', 'core/mills.js', 'core/todo.js', 'core/late.js', 'core/today.js', 'core/admin.js', 'core/qr-app.svg',
  'manifest.webmanifest', 'core/icons/logo.svg', 'core/icons/favicon-32.png', 'core/icons/apple-touch-icon.png',
  'core/icons/icon-192.png', 'core/icons/icon-512.png', 'core/icons/icon-maskable-512.png',
  'lists/test-workers.js',
  'lists/people.js', 'lists/calendar.js'
];

// v1.77 (Yu Chen, 19 Nov 2026: "we have difficulty and delay time of loading a new version").
// Every release used to pull all 44 files again — 1.6 MB — even when 230 lines had changed, because
// cache: 'reload' means "ignore anything you have, send it again". The icons alone are 366 KB and had not
// changed in four weeks. Worse, addAll is one batch: ONE file dropping out on an estate line failed the whole
// install, so the phone silently stayed on the old version with nothing to show for the wait.
//
// Two changes. cache: 'no-cache' still checks the site every time — it never serves a stale file — but an
// unchanged file answers "not changed" in about 200 bytes instead of resending itself. And each file is
// fetched on its own, falling back to the copy already on the phone, so a dropout costs one file, not the
// release. Pictures may fail outright: a missing icon must never stop an update.
var MUST = FILES.filter(function (f) { return !/\.(png|svg)$/.test(f); });

function keep(c, f) {
  return fetch(new Request(f, { cache: 'no-cache' })).then(function (res) {
    if (!res || !res.ok) throw new Error('bad status');
    return c.put(f, res);
  }).catch(function (err) {
    // No signal, or this one file failed: use the copy the phone already has, from any older version.
    return caches.match(f, { ignoreSearch: true }).then(function (old) {
      if (old) return c.put(f, old);
      throw err;
    });
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    var must = MUST.map(function (f) { return keep(c, f); });
    // Pictures are allowed to fail; the app works without them and they are the biggest files here.
    var extra = FILES.filter(function (f) { return MUST.indexOf(f) < 0; })
      .map(function (f) { return keep(c, f).catch(function () {}); });
    return Promise.all(must.concat(extra));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('ebook-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // sending to Google is never touched
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;             // only our own files
  // Files asked with '?…' (like the version check) always go to the site.
  // A page opened with '?…' in its link still opens from the phone's copy.
  if (url.search && req.mode !== 'navigate') return;
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;                                // the phone's copy, works with no signal
        return fetch(req).then(function (res) {
          if (res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () {
          // No signal and not kept: open the main page instead of an error.
          return req.mode === 'navigate' ? c.match('index.html') : Response.error();
        });
      });
    })
  );
});
