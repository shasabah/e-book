// Foundation: login with a 6-digit key, and roles.
// With a sending link, the Google script checks the key. On the test copy
// with no link, made-up people from lists/test-users.js are used.
window.EA = window.EA || {};
(function () {
  var USER = 'ea.user', LAST = 'ea.lastUser';

  EA.currentUser = function () { return EA.local.get(USER, null); };

  function keep(u) { EA.local.set(USER, u); EA.local.set(LAST, u); return { ok: true, user: u }; }

  EA.login = async function (key) {
    key = String(key || '').trim();
    if (!/^\d{6}$/.test(key)) return { ok: false, why: 'format' };
    var link = EA.sendLink();
    if (link) {
      var res, j;
      try {
        res = await fetch(link, {
          method: 'POST', credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'login', key: key, version: EA.VERSION })
        });
      } catch (e) {
        // No signal: the last person who logged in on this phone may come back in.
        var last = EA.local.get(LAST, null);
        if (last && last.key === key) return keep(last);
        return { ok: false, why: 'offline' };
      }
      // The office answered, but not with its usual reply (an error page): "office busy".
      try { j = await res.json(); } catch (e2) { j = null; }
      if (j && j.ok && j.user) return keep(Object.assign({}, j.user, { key: key }));
      // Only a real "wrong key" answer is called a wrong key. A busy or
      // broken office side is "try again", so nobody thinks their key is bad.
      var err = j && j.error;
      return { ok: false, why: err === 'wrong_key' ? 'wrong' : err === 'old_version' ? 'old' : err === 'locked' ? 'locked' : 'server' };
    }
    if (EA.config.TEST_MODE) {
      var u = (EA.lists.testUsers || []).find(function (x) { return x.key === key; });
      return u ? keep(Object.assign({}, u)) : { ok: false, why: 'wrong' };
    }
    return { ok: false, why: 'nolink' };
  };

  EA.logout = function () { EA.local.del(USER); };

  // The Owner made a new PIN for himself (v1.9): this phone keeps working with the new one.
  EA.setMyPin = function (pin) {
    var u = EA.currentUser();
    if (!u || !/^\d{6}$/.test(String(pin))) return;
    u.key = String(pin); EA.local.set(USER, u);
    var last = EA.local.get(LAST, null);
    if (last && last.code === u.code) { last.key = u.key; EA.local.set(LAST, last); }
  };

  // Switch a person off on this phone (lost phone, person left).
  EA.forget = function () { EA.local.del(USER); EA.local.del(LAST); };
})();
