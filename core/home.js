// Foundation: the main page (front door). Login, header, sync bar,
// notices and room tiles. Rooms add nothing here except their entry in rooms.js.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var DAY_BM = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  var DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON_BM = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  var MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var ESTATE_KEY = 'ea.estate';

  function pad(n) { return String(n).padStart(2, '0'); }
  function hhmm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function isHQ(u) { return u.role === 'Owner' || u.role === 'HQ'; }

  // ---------- small messages ----------
  var toastTimer;
  function toast(text, kind) {
    var t = $('toast');
    t.textContent = text;
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  function openSheet(html, onReady) {
    $('sheet').innerHTML = html;
    $('sheet-back').hidden = false;
    var first = $('sheet').querySelector('input, button');
    if (first) first.focus();
    if (onReady) onReady($('sheet'));
  }
  function closeSheet() { $('sheet-back').hidden = true; $('sheet').innerHTML = ''; }
  // Shared screen pieces, built once here. Rooms use these, never their own copy.
  EA.ui = { toast: toast, openSheet: openSheet, closeSheet: closeSheet, esc: esc,
            dayBm: DAY_BM, dayEn: DAY_EN, monBm: MON_BM, monEn: MON_EN, hhmm: hhmm };
  $('sheet-back').addEventListener('click', function (e) { if (e.target === $('sheet-back')) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet-back').hidden) closeSheet(); });

  // ---------- phone setup ----------
  function openSetup(reason) {
    openSheet(
      '<h2 id="sheet-title"><span class="bm">Tetapan telefon</span><span class="en">Phone setup</span></h2>' +
      (reason ? '<p class="msg">' + reason + '</p>' : '') +
      '<div class="field"><label for="set-phone"><span class="bm">Kod telefon</span><span class="en">Phone code, e.g. P07</span></label>' +
      '<input id="set-phone" class="text-input mono" maxlength="4" autocomplete="off" value="' + esc(EA.phone()) + '" placeholder="P07"></div>' +
      '<div class="field"><label for="set-link"><span class="bm">Pautan hantar</span><span class="en">Sending link (from Yu Chen)</span></label>' +
      '<input id="set-link" class="text-input" type="url" autocomplete="off" value="' + esc(EA.sendLink()) + '" placeholder="https://script.google.com/…"></div>' +
      '<p class="en">Disimpan di telefon ini sahaja. · Kept on this phone only.</p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="set-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="set-save">SAVE<small>Simpan</small></button></div>',
      function (s) {
        s.querySelector('#set-cancel').onclick = closeSheet;
        s.querySelector('#set-save').onclick = function () {
          var p = s.querySelector('#set-phone').value.trim().toUpperCase();
          var l = EA.cleanLink(s.querySelector('#set-link').value);
          if (!/^P\d{2,3}$/.test(p)) { s.querySelector('#set-phone').focus(); toast('Kod telefon: P dan nombor, cth P07 · Phone code: P and a number, e.g. P07', 'bad'); return; }
          if (l && !/^https:\/\/script\.google\.com\//.test(l)) { s.querySelector('#set-link').focus(); toast('Pautan mesti bermula https://script.google.com/ · Link must start with https://script.google.com/', 'bad'); return; }
          EA.setPhone(p); EA.setSendLink(l);
          closeSheet(); toast('Disimpan · Saved'); render();
        };
      });
  }
  document.querySelectorAll('[data-open-setup]').forEach(function (b) { b.onclick = function () { openSetup(); }; });
  $('open-setup').onclick = function () { openSetup(); };

  // ---------- login ----------
  var WHY = {
    format: ['Kunci mesti 6 nombor.', 'The key must be 6 numbers.'],
    wrong: ['Kunci tidak dikenali. Semak semula, atau tanya Yu Chen.', 'Key not known. Check it, or ask Yu Chen.'],
    offline: ['Tiada isyarat, dan orang ini belum pernah masuk di telefon ini.', 'No signal, and this person has not logged in on this phone before.'],
    server: ['Pejabat sibuk sekarang. Cuba lagi sebentar.', 'The office side is busy. Try again in a moment.'],
    old: ['Versi app ini sudah lama. Tekan LOAD IT atau muat semula halaman.', 'This app version is too old. Tap LOAD IT or reload the page.'],
    nolink: ['Pautan hantar belum ditetapkan. Buka Tetapan telefon.', 'The sending link is not set. Open Phone setup.']
  };
  function loginError(why) {
    var m = WHY[why] || WHY.wrong;
    var el = $('login-msg');
    el.innerHTML = '<span class="bm">' + m[0] + '</span><span class="en">' + m[1] + '</span>';
    el.hidden = false;
  }
  async function tryLogin(key) {
    if (!EA.phone()) { openSetup('Tetapkan kod telefon dahulu. · Set the phone code first.'); return; }
    $('login-btn').disabled = true;
    var r = await EA.login(key);
    $('login-btn').disabled = false;
    if (!r.ok) { loginError(r.why); $('key').select(); return; }
    $('key').value = ''; $('login-msg').hidden = true;
    render();
    toast('Selamat datang, ' + r.user.name + ' · Welcome');
  }
  $('login-form').addEventListener('submit', function (e) { e.preventDefault(); tryLogin($('key').value); });
  $('key').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
    $('login-msg').hidden = true;
    if (this.value.length === 6) tryLogin(this.value);
  });

  function renderLogin() {
    var p = EA.phone();
    $('phone-line').textContent = p ? 'Telefon ' + p + ' · Phone ' + p : 'Kod telefon belum ditetapkan · Phone code not set';
    var showTest = EA.config.TEST_MODE && !EA.sendLink();
    $('test-keys').hidden = !showTest;
    if (showTest) {
      $('test-table').innerHTML = EA.lists.testUsers.map(function (u) {
        var r = EA.roleNames[u.role];
        return '<tr><td><button type="button" data-key="' + u.key + '">' + u.key + '</button></td><td>' +
          esc(r.bm) + ' · ' + esc(r.en) + ' — ' + esc(u.estates.length > 1 ? 'semua ladang · all estates' : u.estates[0]) + '</td></tr>';
      }).join('');
      $('test-table').querySelectorAll('button').forEach(function (b) {
        b.onclick = function () { $('key').value = b.dataset.key; tryLogin(b.dataset.key); };
      });
    }
  }

  // ---------- home ----------
  function currentEstate(u) {
    var e = EA.local.get(ESTATE_KEY, '');
    return u.estates.indexOf(e) >= 0 ? e : u.estates[0];
  }

  function renderHeader(u, estate) {
    $('top').className = 'top' + (isHQ(u) ? ' hq' : '');
    $('who-name').textContent = u.name;
    var r = EA.roleNames[u.role] || { bm: u.role, en: u.role };
    $('who-role').textContent = r.bm + ' · ' + r.en;
    $('estate-chips').innerHTML = u.estates.map(function (code) {
      return '<button class="chip" type="button" data-estate="' + code + '" aria-pressed="' + (code === estate) + '">' + code + '</button>';
    }).join('');
    $('estate-chips').querySelectorAll('.chip').forEach(function (c) {
      c.onclick = function () { EA.local.set(ESTATE_KEY, c.dataset.estate); render(); };
    });
  }

  function renderGreeting() {
    var d = new Date(), h = d.getHours();
    var g = h < 12 ? ['Selamat pagi', 'Good morning'] : h < 14 ? ['Selamat tengah hari', 'Good afternoon'] : h < 19 ? ['Selamat petang', 'Good afternoon'] : ['Selamat malam', 'Good evening'];
    $('greet-bm').textContent = g[0];
    $('greet-en').textContent = g[1];
    $('date-bm').textContent = DAY_BM[d.getDay()] + ', ' + d.getDate() + ' ' + MON_BM[d.getMonth()] + ' ' + d.getFullYear();
    $('date-en').textContent = DAY_EN[d.getDay()] + ', ' + d.getDate() + ' ' + MON_EN[d.getMonth()] + ' ' + d.getFullYear();
  }

  // A room can be entered when it has a screen and is live; on the test copy
  // a room still being built can be tried too.
  function enterable(r) {
    return !!(EA.roomViews && EA.roomViews[r.id]) && (r.state === 'live' || EA.config.TEST_MODE);
  }

  function renderTiles(u, estate) {
    var rooms = EA.roomsFor(u, estate);
    if (!rooms.length) {
      $('tiles').innerHTML = '<div class="empty"><span class="bm">Tiada bilik untuk ' + esc(estate) + ' lagi.</span><span class="en">No rooms for ' + esc(estate) + ' yet.</span></div>';
      return;
    }
    $('tiles').innerHTML = rooms.map(function (r) {
      return '<button class="tile ' + r.state + '" type="button" data-room="' + r.id + '">' +
        '<span class="mark" aria-hidden="true">' + r.mark + '</span>' +
        '<span class="name"><span class="bm">' + esc(r.bm) + '</span><span class="en">' + esc(r.en) + '</span></span>' +
        '<span class="when">' + esc(r.when) + (enterable(r) && r.state !== 'live' ? '<br><b>UJIAN · boleh cuba · TEST · try it</b>' : '') + '</span></button>';
    }).join('');
    $('tiles').querySelectorAll('.tile').forEach(function (t) {
      t.onclick = function () {
        var r = EA.rooms.find(function (x) { return x.id === t.dataset.room; });
        if (enterable(r)) { location.hash = r.id; return; }
        openSheet('<h2 id="sheet-title"><span class="bm">' + esc(r.bm) + '</span><span class="en">' + esc(r.en) + '</span></h2>' +
          '<p><span class="bm" style="font-weight:400">' + esc(r.note.bm) + '</span><span class="en">' + esc(r.note.en) + '</span></p>' +
          '<div class="actions"><button class="btn btn-main" type="button" id="sheet-ok">OK<small>Faham</small></button></div>',
          function (s) { s.querySelector('#sheet-ok').onclick = closeSheet; });
      };
    });
  }

  function renderPlan(u) {
    var show = isHQ(u);
    $('plan').hidden = !show;
    $('layout').className = 'layout' + (show ? ' with-plan' : '');
    if (!show) return;
    var today = new Date(EA.today() + 'T00:00:00');
    var next = EA.milestones.filter(function (m) { return new Date(m.date + 'T00:00:00') >= today; }).slice(0, 5);
    $('plan-list').innerHTML = next.map(function (m) {
      var d = new Date(m.date + 'T00:00:00');
      var days = Math.round((d - today) / 86400000);
      var cls = days <= 14 ? 'soon' : '';
      return '<li class="' + cls + '"><span class="m">' + m.m + '</span>' +
        '<span><span class="bm">' + esc(m.bm) + '</span><span class="en">' + esc(m.en) + '</span></span>' +
        '<span class="d"><b>' + days + ' hari</b>' + d.getDate() + ' ' + MON_BM[d.getMonth()] + ' ' + d.getFullYear() + '</span></li>';
    }).join('');
  }

  function renderSync() {
    var n = EA.waiting(), oldest = EA.oldestWaiting(), last = EA.lastSent();
    var tooOld = n > 0 && oldest && (Date.now() - oldest) > EA.config.WARN_AFTER_HOURS * 3600000;
    var pill = $('wait-pill');
    if (tooOld) { pill.className = 'pill bad'; pill.textContent = n + ' menunggu lebih 24 jam · waiting over 24 hours'; }
    else if (n > 0) { pill.className = 'pill wait'; pill.textContent = n + ' menunggu · waiting'; }
    else { pill.className = 'pill ok'; pill.textContent = 'Semua dihantar · All sent'; }
    if (last) {
      var d = new Date(last), sameDay = d.toDateString() === new Date().toDateString();
      $('last-sent').textContent = 'Dihantar ' + (sameDay ? hhmm(d) : d.getDate() + ' ' + MON_BM[d.getMonth()] + ' ' + hhmm(d)) + ' · Last sent';
    } else {
      $('last-sent').textContent = 'Belum pernah dihantar · Never sent';
    }
    if (n > 0 && EA.nextRetry > Date.now()) $('last-sent').textContent += ' · Cuba lagi sendiri ' + hhmm(new Date(EA.nextRetry)) + ' · retries by itself';
    var sending = EA.isSending();
    $('send-btn').disabled = sending || n === 0;
    $('send-btn').innerHTML = sending ? 'SENDING<small>Menghantar…</small>' : 'SEND<small>Hantar</small>';
    var noLink = !EA.sendLink();
    $('test-mark').hidden = !(EA.config.TEST_MODE && noLink);
    $('notice-link').hidden = !(noLink && !EA.config.TEST_MODE);
  }

  function render() {
    var u = EA.currentUser();
    $('login').hidden = !!u;
    $('home').hidden = !u;
    if (!u) { renderLogin(); return; }
    var estate = currentEstate(u);
    renderHeader(u, estate);
    renderGreeting();
    renderTiles(u, estate);
    renderPlan(u);
    // Room screen, when the address ends in #room-id
    // #room-id or #room-id/screen (a room may have several screens)
    var parts = location.hash.replace('#', '').split('/');
    var rid = parts[0], screen = parts[1] || '';
    var room = rid && EA.roomsFor(u, estate).find(function (r) { return r.id === rid && enterable(r); });
    $('home-main').hidden = !!room;
    $('room').hidden = !room;
    if (room) {
      try { EA.roomViews[room.id].render($('room'), { user: u, estate: estate, room: room, screen: screen }); }
      catch (err) { roomError(err, room, screen, estate); }
    } else $('room').innerHTML = '';
    renderSync();
    // The people list comes from the office (never GitHub); fetched now and then, kept for no-signal days.
    if (EA.lists.refreshPeople) EA.lists.refreshPeople().then(function (got) { if (got && !room) render(); }).catch(function () {});
    $('ver').textContent = (EA.RELEASE || '') + ' (' + EA.VERSION + ')';
    $('foot-phone').textContent = EA.phone() || '—';
  }

  // A room screen that fails to open shows what went wrong (never a blank page), and the
  // error goes to the office (tab APP_ERROR) so the builder can see it.
  function roomError(err, room, screen, estate) {
    var msg = (err && err.message) || String(err);
    EA.reportError('room ' + room.id + '/' + (screen || 'main'), err, estate);
    $('room').innerHTML = '<div class="card"><p class="msg"><span class="bm">Skrin ini tidak dapat dibuka.</span><span class="en">This screen could not open. Tap LOAD IT for the newest copy, or go back.</span></p>' +
      '<p class="hint mono">' + esc(msg) + '</p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="err-back">BACK<small>Kembali</small></button>' +
      '<button class="btn btn-main" type="button" id="err-load">LOAD IT<small>Muat versi baru</small></button></div></div>';
    $('err-back').onclick = function () { location.hash = ''; };
    $('err-load').onclick = function () { EA.loadUpdate(); };
  }

  // ---------- actions ----------
  $('send-btn').onclick = async function () {
    var r = await EA.send();
    if (r.error === 'offline' || r.error === 'network') toast('Tiada isyarat. Akan dihantar bila ada isyarat · No signal. Will send when signal returns', 'wait');
    else if (r.error === 'nolink') toast('Tiada pautan hantar · No sending link', 'bad');
    else if (r.error === 'id_clash') openSheet('<h2 id="sheet-title"><span class="bm">Kod telefon ini sama dengan telefon lain</span><span class="en">This phone code is already used by another phone</span></h2>' +
      '<p><span class="bm" style="font-weight:400">Pejabat menolak catatan ini supaya tiada data hilang. Catatan kekal di telefon ini. Hubungi Yu Chen untuk kod telefon baru.</span>' +
      '<span class="en">The office refused these entries so nothing is lost. They stay on this phone. Ask Yu Chen for a new phone code.</span></p>' +
      '<div class="actions"><button class="btn btn-main" type="button" id="clash-ok">OK<small>Faham</small></button></div>',
      function (s) { s.querySelector('#clash-ok').onclick = closeSheet; });
    else if (r.error) toast('Pejabat menolak: ' + r.error + ' · Office refused', 'bad');
    else if (r.sent) toast(r.sent + ' dihantar' + (r.test ? ' (ujian)' : '') + ' · sent' + (r.test ? ' (test)' : ''));
  };

  $('logout').onclick = function () {
    var n = EA.waiting();
    if (!n) { EA.logout(); render(); return; }
    openSheet('<h2 id="sheet-title"><span class="bm">' + n + ' catatan belum dihantar</span><span class="en">' + n + ' entries not sent yet</span></h2>' +
      '<p><span class="bm" style="font-weight:400">Ia kekal di telefon ini dan akan dihantar bila anda masuk semula.</span><span class="en">They stay on this phone and are sent when you log in again.</span></p>' +
      '<div class="actions"><button class="btn btn-ok" type="button" id="lo-send">SEND<small>Hantar dulu</small></button>' +
      '<button class="btn btn-ghost" type="button" id="lo-out">LOG OUT<small>Keluar juga</small></button></div>',
      function (s) {
        s.querySelector('#lo-send').onclick = function () { closeSheet(); $('send-btn').click(); };
        s.querySelector('#lo-out').onclick = function () { closeSheet(); EA.logout(); render(); };
      });
  };

  $('load-btn').onclick = EA.loadUpdate;
  async function checkUpdate() {
    var v = await EA.checkUpdate();
    $('notice-update').hidden = !v;
  }

  document.addEventListener('ea:sync', function () { if (EA.currentUser()) renderSync(); });
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  setInterval(function () { if (EA.currentUser()) { renderSync(); renderGreeting(); } }, 60000);
  setInterval(checkUpdate, 30 * 60000);

  // Keep a copy of the app on this phone, so it opens with no signal.
  document.addEventListener('ea:offline-ready', function () { $('offline-mark').hidden = false; });
  EA.startOffline('sw.js');

  render();
  checkUpdate();
})();
