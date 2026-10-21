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
  'lists/lots.js',
  'lists/targets.js',
  'rooms/field/muster.js',
  'rooms/field/work.js',
  'rooms/field/harvest.js', 'rooms/field/collect.js', 'rooms/field/ticket.js',
  'rooms/field/history.js',
  'core/users.js', 'core/workers.js', 'core/admin.js', 'core/qr-app.svg',
  'manifest.webmanifest', 'core/icons/logo.svg', 'core/icons/favicon-32.png', 'core/icons/apple-touch-icon.png',
  'core/icons/icon-192.png', 'core/icons/icon-512.png', 'core/icons/icon-maskable-512.png',
  'lists/test-workers.js',
  'lists/people.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // cache: 'reload' so the copy is fresh from the site, not an old browser copy
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
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
