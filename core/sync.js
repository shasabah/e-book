// Foundation: saving on the phone and sending to the Google sheet.
// Every room saves through EA.save() and nothing else.
window.EA = window.EA || {};
(function () {
  var K = {
    queue: 'ea.queue', lastSent: 'ea.lastSent', counters: 'ea.counters',
    phone: 'ea.phone', link: 'ea.sendLink', testSent: 'ea.testSent'
  };

  // Phone storage. Wrapped so a blocked or full store never breaks the page.
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  EA.local = { get: get, set: set, del: del };

  function pad(n, w) { return String(n).padStart(w, '0'); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }
  function stamp() { var d = new Date(); return today() + ' ' + pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2); }
  EA.today = today;

  EA.phone = function () { return get(K.phone, ''); };
  EA.setPhone = function (p) { set(K.phone, String(p || '').toUpperCase().replace(/\s+/g, '')); };
  EA.sendLink = function () { return get(K.link, ''); };
  EA.setSendLink = function (l) { set(K.link, String(l || '').trim()); };

  // ID pattern from the rule book: ROOM-ESTATE-PHONE-000123
  function nextId(roomCode, estate) {
    var base = roomCode + '-' + estate + '-' + (EA.phone() || 'P00');
    var c = get(K.counters, {});
    c[base] = (c[base] || 0) + 1;
    set(K.counters, c);
    return base + '-' + pad(c[base], 6);
  }

  function changed() { document.dispatchEvent(new CustomEvent('ea:sync')); }

  // Save one entry on the phone. The standard columns always come first
  // and cannot be overwritten by the room's own fields.
  EA.save = function (tab, roomCode, estate, fields, replaces) {
    var user = EA.currentUser();
    if (!user) throw new Error('Not logged in');
    var est = EA.lists.estate(estate);
    var row = {
      id: nextId(roomCode, estate),
      date: (fields && fields.date) || today(),
      company: est ? est.company : '',
      estate: estate,
      keyed_by: user.code,
      keyed_at: stamp(),
      phone: EA.phone(),
      status: 'active',
      replaces: replaces || ''
    };
    Object.keys(fields || {}).forEach(function (k) { if (!(k in row)) row[k] = fields[k]; });
    var q = get(K.queue, []);
    q.push({ tab: tab, row: row, savedAt: Date.now() });
    if (!set(K.queue, q)) throw new Error('Phone storage is full');
    changed();
    return row;
  };

  EA.waiting = function () { return get(K.queue, []).length; };
  EA.lastSent = function () { return get(K.lastSent, 0); };
  EA.oldestWaiting = function () { var q = get(K.queue, []); return q.length ? q[0].savedAt : 0; };

  // Send waiting entries, one at a time, oldest first. Stops at the first
  // failure and keeps the rest waiting.
  var sending = false;
  EA.send = async function () {
    if (sending) return { busy: true };
    var q = get(K.queue, []);
    if (!q.length) { set(K.lastSent, Date.now()); changed(); return { sent: 0 }; }
    var link = EA.sendLink();
    var user = EA.currentUser();
    if (!user) return { error: 'login' };
    if (!link) {
      if (!EA.config.TEST_MODE) return { error: 'nolink' };
      // Test copy: pretend to send, and keep a copy so it can be checked.
      var done = get(K.testSent, []).concat(q).slice(-500);
      set(K.testSent, done); set(K.queue, []); set(K.lastSent, Date.now()); changed();
      return { sent: q.length, test: true };
    }
    if (!navigator.onLine) return { error: 'offline' };
    sending = true; changed();
    var sent = 0, err = null;
    try {
      while (q.length) {
        var item = q[0];
        var res = await fetch(link, {
          method: 'POST', credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'save', key: user.key, version: EA.VERSION, tab: item.tab, row: item.row })
        });
        var j = await res.json();
        if (!j || !j.ok) { err = (j && j.error) || 'refused'; break; }
        q.shift(); sent++;
        set(K.queue, q);
        set(K.lastSent, Date.now());
        changed();
      }
    } catch (e) { err = 'network'; }
    sending = false; changed();
    return err ? { sent: sent, error: err } : { sent: sent };
  };
  EA.isSending = function () { return sending; };

  // Send by itself when signal comes back.
  window.addEventListener('online', function () { if (EA.currentUser() && EA.waiting()) EA.send(); });
})();
