// Shared list: people (owned by HR). Every room only reads it.
// Real names live only in the office sheet (tab LIST_PEOPLE) and come to the phone through
// the office, never through GitHub (these files are public). The phone keeps its own copy
// so the muster works with no signal. Only name, job, worker code, gender and gang;
// never IC, passport, date of birth, bank or pay (Rule 8).
// With no list from the office (the test copy, or before the first signal) the made-up
// test workers are used, so screens can still be tried.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
(function () {
  var KEY = 'ea.people.', AT = 'ea.people.at';
  function prac() { return !!(EA.practice && EA.practice()); }
  function real(estate) { if (prac()) return null; var p = EA.local ? EA.local.get(KEY + estate, null) : null; return p && p.length ? p : null; }
  EA.lists.realPeople = function (estate) { return !!real(estate); };
  // The made-up workers are only for the made-up test people (codes T-…). A real person with no
  // list yet gets none, and the muster asks for signal once (v1.9), so no made-up worker is ever sent.
  function testOk() { var u = EA.currentUser && EA.currentUser(); return !u || /^[TL]-/.test(String(u.code)); }
  // v1.24: the made-up workers serve every estate in Mod Latihan (W-PTAN-001 is Pekerja Contoh 1 at Paitan).
  function made(estate) {
    return EA.lists.testWorkers.filter(function (w) { return w.estate === 'SSGT'; }).map(function (w) {
      return estate === 'SSGT' ? w : Object.assign({}, w, { id: w.id.replace('W-SSGT-', 'W-' + estate + '-'), estate: estate });
    });
  }
  function fallback(estate) { return testOk() ? made(estate) : []; }
  EA.lists.needPeople = function (estate) { return !real(estate) && !testOk(); };
  EA.lists.workersFor = function (estate) {
    var p = real(estate);
    return (p || fallback(estate)).filter(function (w) { return !w.mdr; });
  };
  EA.lists.mandorsFor = function (estate) {
    var p = real(estate);
    return (p || fallback(estate)).filter(function (w) { return w.mdr; });
  };
  EA.lists.worker = function (id) {
    var found = null;
    if (EA.local) (EA.lists.estates || []).some(function (e) { var p = real(e.code); found = p && p.find(function (w) { return w.id === id; }); return !!found; });
    if (found) return found;
    var m = /^W-([A-Z]+)-/.exec(String(id || ''));
    return (m ? made(m[1]) : EA.lists.testWorkers).find(function (w) { return w.id === id; }) || null;
  };
  // Ask the office for the list (at most every 6 hours, or when forced).
  var asking = false, failedAt = 0;
  EA.lists.refreshPeople = async function (force) {
    if (!EA.sendLink || !EA.sendLink() || !EA.ask || prac()) return false;
    var last = EA.local.get(AT, 0);
    if (!force && Date.now() - last < 6 * 3600e3) return false;
    // v1.19: never two at once, and after a failure wait 10 minutes (not on every screen change).
    if (asking || (!force && Date.now() - failedAt < 10 * 60e3)) return false;
    asking = true;
    var r; try { r = await EA.ask('people', {}); } finally { asking = false; }
    if (!r || !r.people) { failedAt = Date.now(); return false; }
    var by = {};
    r.people.forEach(function (w) { (by[w.estate] = by[w.estate] || []).push(w); });
    Object.keys(by).forEach(function (e) { EA.local.set(KEY + e, by[e]); });
    EA.local.set(AT, Date.now());
    return true;
  };
})();
