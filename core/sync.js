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
  // The phone's own date n days ago (Malaysia time on the phone, never UTC).
  EA.dayAgo = function (n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };

  EA.phone = function () { return get(K.phone, ''); };
  EA.setPhone = function (p) { set(K.phone, String(p || '').toUpperCase().replace(/\s+/g, '')); };
  EA.sendLink = function () { return get(K.link, ''); };
  // Pasted links often carry hidden spaces or line breaks (from WhatsApp or a chat).
  // Remove every one of them, so the link always works.
  EA.cleanLink = function (l) { return String(l || '').replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, ''); };
  EA.setSendLink = function (l) { set(K.link, EA.cleanLink(l)); };

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
  EA.save = function (tab, roomCode, estate, fields, replaces, status) {
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
      status: status === 'removed' ? 'removed' : 'active',
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
  // Entries this person can send now (their own).
  EA.waitingMine = function () { var u = EA.currentUser(); return u ? get(K.queue, []).filter(mine(u)).length : 0; };
  // Is this entry still waiting on the phone?
  EA.isWaiting = function (id) { return get(K.queue, []).some(function (q) { return q.row.id === id; }); };
  EA.lastSent = function () { return get(K.lastSent, 0); };
  EA.oldestWaiting = function () { var q = get(K.queue, []); return q.length ? q[0].savedAt : 0; };

  // Send waiting entries (all in one trip). Anything refused stays waiting.
  var sending = false;
  // Each person's entries are sent with that person's own key, so "who keyed it" stays
  // right on a shared phone. Someone else's entries wait until they log in again.
  function mine(user) { return function (it) { return !it.row.keyed_by || it.row.keyed_by === user.code; }; }
  EA.waitingOthers = function () {
    var u = EA.currentUser(); if (!u) return [];
    var by = {};
    get(K.queue, []).forEach(function (it) { if (!mine(u)(it)) by[it.row.keyed_by] = (by[it.row.keyed_by] || 0) + 1; });
    return Object.keys(by).map(function (k) { return { code: k, n: by[k] }; });
  };
  async function sendNow() {
    if (sending) return { busy: true };
    var user = EA.currentUser();
    if (!user) return { error: 'login' };
    var isMine = mine(user);
    var q = get(K.queue, []).filter(isMine);
    if (!q.length) { set(K.lastSent, Date.now()); changed(); return { sent: 0 }; }
    var link = EA.sendLink();
    if (!link) {
      if (!EA.config.TEST_MODE) return { error: 'nolink' };
      // Test copy with no link: pretend to send, and keep a copy so it can be checked.
      var ids = {}; q.forEach(function (it) { ids[it.row.id] = true; });
      var done0 = get(K.testSent, []).concat(q).slice(-500);
      set(K.testSent, done0); set(K.queue, get(K.queue, []).filter(function (it) { return !ids[it.row.id]; }));
      set(K.lastSent, Date.now()); changed();
      return { sent: q.length, test: true };
    }
    if (!navigator.onLine) return { error: 'offline' };
    sending = true; changed();
    var sent = 0, err = null, refusedAll = 0;
    function post(body) {
      return fetch(link, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ key: user.key, version: EA.VERSION }, body)) }).then(function (r) { return r.json(); });
    }
    try {
      // Everything waiting goes in one trip (up to 50 at a time).
      var oneByOne = false;
      while (q.length && !oneByOne) {
        var chunk = q.slice(0, 50);
        var j = await post({ action: 'saveBatch', items: chunk.map(function (it) { return { tab: it.tab, row: it.row }; }) });
        if (j && j.error === 'unknown_action') { oneByOne = true; break; }     // older office script
        if (!j || !j.ok) { err = (j && j.error) || 'refused'; break; }
        var done = {}, firstErr = null;
        var refused = [];
        (j.results || []).forEach(function (r) {
          if (r.ok) done[r.id] = true;
          // A delivery note correction refused because the lorry already has a ticket: it can never be
          // accepted, so it leaves the waiting list and is kept apart (shown on Collect & dispatch).
          else if (r.error === 'ticketed') { done[r.id] = true; refused.push(r.id); }
          else if (!firstErr) firstErr = r.error;
        });
        if (refused.length) {
          var keep = get('ea.refused', []);
          chunk.forEach(function (it) { if (refused.indexOf(it.row.id) >= 0) keep.push({ id: it.row.id, tab: it.tab, trip: it.row.trip || '', at: Date.now() }); });
          set('ea.refused', keep.slice(-200)); refusedAll += refused.length;
        }
        // Read the list again: something may have been saved while this was sending.
        var now = get(K.queue, []), before = now.length;
        now = now.filter(function (it) { return !done[it.row.id]; });
        sent += before - now.length - refused.length;
        set(K.queue, now); set(K.lastSent, Date.now()); changed();
        if (firstErr) { err = firstErr; break; }
        if (before === now.length) { err = 'refused'; break; }
        q = now.filter(isMine);
      }
      // Older office script: one entry per trip, as before.
      while (oneByOne && q.length) {
        var item = q[0];
        var r1 = await post({ action: 'save', tab: item.tab, row: item.row });
        if (!r1 || !r1.ok) { err = (r1 && r1.error) || 'refused'; break; }
        set(K.queue, get(K.queue, []).filter(function (it) { return it.row.id !== item.row.id; })); sent++;
        q = get(K.queue, []).filter(isMine);
        set(K.lastSent, Date.now()); changed();
      }
    } catch (e) { err = 'network'; }
    sending = false; changed();
    return err ? { sent: sent, error: err, refused: refusedAll } : { sent: sent, refused: refusedAll };
  }

  // ---------- asking the office for something back ----------
  // Shared by every room: e.g. the crop backlog worked out from everyone's entries.
  // Returns the office's answer, or null when there is no signal / no link.
  // An error on the phone is kept as an entry for the office (tab APP_ERROR), once per message a day.
  EA.reportError = function (where, err, estate) {
    try {
      var msg = String((err && err.message) || err || '').slice(0, 300);
      var stack = String((err && err.stack) || '').split('\n').slice(0, 3).join(' | ').slice(0, 400);
      var seen = get('ea.errSeen', {}), k = today() + '|' + where + '|' + msg;
      if (seen[k]) return;
      seen = {}; Object.keys(get('ea.errSeen', {})).forEach(function (x) { if (x.indexOf(today()) === 0) seen[x] = true; });
      seen[k] = true; set('ea.errSeen', seen);
      var user = EA.currentUser();
      var est = estate || (user && user.estates && user.estates[0]);
      if (!user || !est) return;
      EA.save('APP_ERROR', 'EA', est, { where: where, message: msg, stack: stack, version: String(EA.VERSION), agent: navigator.userAgent.slice(0, 200) });
    } catch (e) {}
  };
  window.addEventListener('error', function (e) { EA.reportError('page', e.error || e.message); });
  window.addEventListener('unhandledrejection', function (e) { EA.reportError('promise', e.reason); });

  // EA.askFull: the office's whole answer, or { ok:false, error:'nolink'|'offline'|'busy' } (v1.9).
  EA.askFull = async function (action, extra) {
    var link = EA.sendLink(), user = EA.currentUser();
    if (!link || !user) return { ok: false, error: 'nolink' };
    if (!navigator.onLine) return { ok: false, error: 'offline' };
    try {
      var res = await fetch(link, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action, key: user.key, version: EA.VERSION }, extra || {})) });
      var j = null;
      try { j = await res.json(); } catch (e2) { j = null; }
      return j || { ok: false, error: 'busy' };
    } catch (e) { return { ok: false, error: 'offline' }; }
  };
  EA.ask = async function (action, extra) {
    var j = await EA.askFull(action, extra);
    return j && j.ok ? j : null;
  };

  // ---------- trying again by itself ----------
  // When the office is busy or there is no signal, the phone tries again after a
  // random wait (so many phones do not all try at the same second): about
  // 20–40 s, then longer each time, at most 5–10 minutes. Errors a person must
  // fix (wrong key, phone code clash, another estate...) are not retried.
  var NO_RETRY = /^(id_clash|not_your_estate|wrong_key|old_version|login|nolink|bad_|unknown_col|tab_missing_col)/;
  var retryTimer = null, fails = 0;
  EA.nextRetry = 0;
  function planRetry(err) {
    clearTimeout(retryTimer); retryTimer = null; EA.nextRetry = 0;
    if (!err || NO_RETRY.test(String(err))) { if (!err) fails = 0; changed(); return; }
    fails++;
    var base = Math.min(20000 * Math.pow(2, fails - 1), 300000);
    var wait = Math.round(base + Math.random() * base);
    EA.nextRetry = Date.now() + wait;
    retryTimer = setTimeout(autoSend, wait);
    changed();
  }
  function autoSend() {
    if (!EA.currentUser() || !EA.waitingMine() || sending) return;
    EA.send();
  }
  EA.send = async function () {
    if (sending) return { busy: true };
    var r = await sendNow();
    if (!r.test) planRetry(r.error || (EA.waitingMine() ? 'refused' : ''));
    return r;
  };
  EA.isSending = function () { return sending; };

  // Send by itself when signal comes back, when E-Book is opened again, and a
  // check every 3 minutes in case anything is still waiting.
  window.addEventListener('online', function () { fails = 0; autoSend(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') autoSend(); });
  setInterval(function () { if (!retryTimer) autoSend(); }, 180000);
})();
