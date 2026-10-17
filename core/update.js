// Foundation: the LOAD IT button. Reads core/version.js fresh from the
// server and compares it with the version this phone is running.
window.EA = window.EA || {};
EA.checkUpdate = async function () {
  try {
    var res = await fetch('core/version.js?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    var m = (await res.text()).match(/VERSION\s*=\s*(\d+)/);
    var latest = m ? Number(m[1]) : 0;
    return latest > EA.VERSION ? latest : null;
  } catch (e) { return null; }
};
EA.loadUpdate = function () { location.reload(); };
