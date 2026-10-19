// Foundation: the phone's offline copy, and the LOAD IT button.
window.EA = window.EA || {};

// Keep a copy of the app on the phone (sw.js), so it opens with no signal.
EA.offlineReady = false;
EA.startOffline = function (swPath) {
  if (!('serviceWorker' in navigator)) return;
  // The version number is in the address of sw.js, so every new version is a
  // new address and the phone always fetches it. 'none' = never use an old
  // browser copy of sw.js or of the files it reads.
  navigator.serviceWorker.register((swPath || 'sw.js') + '?v=' + EA.VERSION, { updateViaCache: 'none' }).catch(function () {});
  navigator.serviceWorker.ready.then(function () {
    EA.offlineReady = true;
    document.dispatchEvent(new CustomEvent('ea:offline-ready'));
  });
};

// Reads core/version.js fresh from the site and compares it with the
// version this phone is running.
EA.checkUpdate = async function () {
  try {
    var res = await fetch('core/version.js?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    var m = (await res.text()).match(/VERSION\s*=\s*(\d+)/);
    var latest = m ? Number(m[1]) : 0;
    return latest > EA.VERSION ? latest : null;
  } catch (e) { return null; }
};

// LOAD IT: fetch the new copy, wait until the phone has switched to it
// (at most 10 seconds), then reload.
EA.loadUpdate = async function () {
  try {
    var reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) {
      var switched = new Promise(function (ok) {
        navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true });
        setTimeout(ok, 10000);
      });
      // Register the new version's address; the phone then fetches the new copy.
      var latest = await EA.checkUpdate();
      var v = latest || EA.VERSION;
      reg = await navigator.serviceWorker.register('sw.js?v=' + v, { updateViaCache: 'none' });
      await reg.update();
      if (reg.installing || reg.waiting) await switched;
      else if (latest) {
        // Still nothing new: drop the phone's old copy so the page loads fresh from the site.
        var keys = await caches.keys();
        // Keep the newest version's copy (it may already be on the phone), drop the older ones.
        await Promise.all(keys.filter(function (k) { return k.indexOf('ebook-') === 0 && k !== 'ebook-v' + latest; }).map(function (k) { return caches.delete(k); }));
      }
    }
  } catch (e) {}
  location.reload();
};
