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
  // The made-up test people have codes T-…; real people never do.
  function testUser() { var u = EA.currentUser(); return !!u && /^T-/.test(String(u.code)); }

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
    // v1.27.2: every box that opens over a screen has its own BALIK at the top (the phone app has no browser back).
    $('sheet').innerHTML = '<div class="sheet-top"><button type="button" class="back-btn sheet-x" id="sheet-x">‹ BACK<small>‹ BALIK</small></button></div>' + html;
    $('sheet-back').hidden = false;
    $('sheet-x').onclick = closeSheet;
    var first = $('sheet').querySelector('input, button:not(.sheet-x)');
    if (first) first.focus();
    if (onReady) onReady($('sheet'));
  }
  function closeSheet() { $('sheet-back').hidden = true; $('sheet').innerHTML = ''; }
  // Shared screen pieces, built once here. Rooms use these, never their own copy.
  // Copy text to the phone's clipboard (v1.9).
  function copy(t) {
    function done() { toast(EA.t('Disalin', 'Copied')); }
    function fallback() {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
      document.body.appendChild(a); a.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast(EA.t('Tekan lama pada teks untuk salin', 'Long-press the text to copy'), 'wait'); }
      document.body.removeChild(a);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
  }
  EA.ui = { toast: toast, openSheet: openSheet, closeSheet: closeSheet, esc: esc, copy: copy,
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
      '<div class="field"><span class="inline"><span class="bm">Bahasa di telefon ini</span><span class="en">Language on this phone</span></span>' +
      '<div class="lang-pick" role="group"><button type="button" data-setlang="bm" aria-pressed="' + (EA.lang() === 'bm') + '">Bahasa Malaysia</button>' +
      '<button type="button" data-setlang="en" aria-pressed="' + (EA.lang() === 'en') + '">English</button></div></div>' +
      '<p class="en quiet"><span class="bm">Disimpan di telefon ini sahaja.</span><span class="en">Kept on this phone only.</span></p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="set-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="set-save">SAVE<small>Simpan</small></button></div>',
      function (s) {
        s.querySelector('#set-cancel').onclick = closeSheet;
        s.querySelectorAll('[data-setlang]').forEach(function (b) { b.onclick = function () { EA.setLang(b.dataset.setlang); s.querySelectorAll('[data-setlang]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); render(); }; });
        s.querySelector('#set-save').onclick = function () {
          var p = s.querySelector('#set-phone').value.trim().toUpperCase();
          var l = EA.cleanLink(s.querySelector('#set-link').value);
          if (!/^P\d{2,3}$/.test(p)) { s.querySelector('#set-phone').focus(); toast(EA.t('Kod telefon: P dan nombor, cth P07', 'Phone code: P and a number, e.g. P07'), 'bad'); return; }
          if (l && !/^https:\/\/script\.google\.com\//.test(l)) { s.querySelector('#set-link').focus(); toast(EA.t('Pautan mesti bermula https://script.google.com/', 'Link must start with https://script.google.com/'), 'bad'); return; }
          // v1.14: a new phone code logs this phone out, so the next login is checked by the office.
          var changed = EA.phone() && EA.phone() !== p;
          EA.setPhone(p); EA.setSendLink(l);
          if (changed) { EA.forget(); closeSheet(); toast(EA.t('Kod telefon ditukar. Masuk semula dengan PIN anda.', 'Phone code changed. Log in again with your PIN.')); location.hash = ''; location.reload(); return; }
          closeSheet(); toast(EA.t('Disimpan', 'Saved')); render();
        };
      });
  }
  document.querySelectorAll('[data-open-setup]').forEach(function (b) { b.onclick = function () { openSetup(); }; });
  $('open-setup').onclick = function () { openSetup(); };

  // Kongsi app · Share the app (v1.9): the app's QR to scan, copy the link, or send it on WhatsApp.
  // Only the public app address; never the sending link. The QR picture is kept on the phone (works offline).
  function shareApp() {
    var url = EA.config.APP_URL;
    var text = EA.t('Buka E-Book (Buku Ladang): ', 'Open E-Book (Estate Book): ') + url + '\n' +
      EA.t('Minta PIN anda daripada Yu Chen.', 'Ask Yu Chen for your PIN.');
    openSheet('<h2 id="sheet-title">' + EA.t('Kongsi app', 'Share the app') + '</h2>' +
      '<div class="share-qr"><img src="core/qr-app.svg" alt="QR E-Book" width="220" height="220"></div>' +
      '<p class="share-url">' + esc(url.replace(/^https:\/\//, '').replace(/\/$/, '')) + '</p>' +
      '<p class="hint" style="text-align:center">' + EA.t('Minta dia imbas dengan kamera telefon. Kemudian tetapkan Tetapan telefon dan PIN.', 'Ask them to scan it with the phone camera. Then set Phone setup and the PIN.') + '</p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="sh-copy">COPY LINK<small>Salin pautan</small></button>' +
      '<button class="btn btn-ok" type="button" id="sh-wa">WHATSAPP<small>Hantar ke WhatsApp</small></button></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="sh-close">CLOSE<small>Tutup</small></button></div>',
      function (s) {
        s.querySelector('#sh-close').onclick = closeSheet;
        s.querySelector('#sh-copy').onclick = function () { copy(url); };
        s.querySelector('#sh-wa').onclick = function () { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); };
      });
  }
  document.querySelectorAll('[data-share-app]').forEach(function (b) { b.onclick = shareApp; });

  // ---------- login ----------
  var WHY = {
    format: ['PIN mesti 6 nombor.', 'The PIN must be 6 numbers.'],
    wrong: ['PIN tidak dikenali. Semak semula, atau tanya Yu Chen.', 'PIN not known. Check it, or ask Yu Chen.'],
    offline: ['Tiada isyarat, dan orang ini belum pernah masuk di telefon ini.', 'No signal, and this person has not logged in on this phone before.'],
    server: ['Google lambat atau pejabat sibuk. Cuba lagi sebentar.', 'Google is slow or the office is busy. Try again in a moment.'],
    old: ['Versi app ini sudah lama. Tekan LOAD IT atau muat semula halaman.', 'This app version is too old. Tap LOAD IT or reload the page.'],
    nolink: ['Pautan hantar belum ditetapkan. Buka Tetapan telefon.', 'The sending link is not set. Open Phone setup.'],
    locked: ['Terlalu banyak PIN salah. Tunggu 15 minit.', 'Too many wrong PINs. Wait 15 minutes.'],
    phone_not_yours: ['Kod telefon {P} bukan milik anda. Semak kod dalam mesej WhatsApp anda dan betulkan di Tetapan telefon.', 'Phone code {P} is not yours. Check the code in your WhatsApp message and fix it in Phone setup.'],
    no_phone: ['Kod telefon belum ditetapkan. Buka Tetapan telefon dan taip kod dari mesej WhatsApp anda.', 'The phone code is not set. Open Phone setup and type the code from your WhatsApp message.']
  };
  function loginError(why) {
    var m = (WHY[why] || WHY.wrong).map(function (t) { return t.replace('{P}', EA.ui.esc(EA.phone() || '')); });
    var el = $('login-msg');
    el.innerHTML = '<span class="bm">' + m[0] + '</span><span class="en">' + m[1] + '</span>' +
      (why === 'old' ? '<button class="btn btn-wait" type="button" id="login-load" style="margin-top:8px">LOAD IT<small>Muat versi baru</small></button>' : '');
    el.hidden = false;
    if (why === 'old') $('login-load').onclick = EA.loadUpdate;
  }
  async function tryLogin(key) {
    if (!EA.phone()) { openSetup(EA.t('Tetapkan kod telefon dahulu.', 'Set the phone code first.')); return; }
    $('login-btn').disabled = true;
    var r = await EA.login(key);
    $('login-btn').disabled = false;
    if (!r.ok) { loginError(r.why); $('key').select(); return; }
    $('key').value = ''; $('login-msg').hidden = true;
    render();
  }
  $('login-form').addEventListener('submit', function (e) { e.preventDefault(); tryLogin($('key').value); });
  $('key').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
    $('login-msg').hidden = true;
    if (this.value.length === 6) tryLogin(this.value);
  });

  function renderLogin() {
    var p = EA.phone();
    $('phone-line').textContent = p ? EA.t('Telefon ', 'Phone ') + p : EA.t('Kod telefon belum ditetapkan', 'Phone code not set');
    document.querySelectorAll('.lang-pick [data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === EA.lang()); b.onclick = function () { EA.setLang(b.dataset.lang); render(); }; });
    var showTest = EA.testMode() && !EA.sendLink();
    $('test-keys').hidden = !showTest;
    if (showTest) {
      $('test-table').innerHTML = EA.lists.testUsers.map(function (u) {
        var r = EA.roleNames[u.role];
        return '<tr><td><button type="button" data-key="' + u.key + '">' + u.key + '</button></td><td>' +
          esc(EA.t(r.bm, r.en)) + ' — ' + esc(u.estates.length > 1 ? EA.t('semua ladang', 'all estates') : u.estates[0]) + '</td></tr>';
      }).join('');
      $('test-table').querySelectorAll('button').forEach(function (b) {
        b.onclick = function () { $('key').value = b.dataset.key; tryLogin(b.dataset.key); };
      });
    }
  }

  // ---------- home ----------
  function currentEstate(u) {
    var e = EA.local.get(ESTATE_KEY, '');
    if (u.estates.indexOf(e) >= 0) return e;
    // v1.64: SDK is the head office, not an estate (12 Nov) — HQ and the Owner open on the first estate
    // v1.70: and on an estate that is already keying (Sugut, Paitan), not on the first in the list (Meliau,
    // not started), where Hari ini and Senarai were nearly empty for the Owner and HQ.
    var live = ((EA.switches && EA.switches().live) || {})['field-harvest'] || [];
    return u.estates.find(function (x) { return x !== 'SDK' && live.indexOf(x) >= 0; }) || u.estates.find(function (x) { return x !== 'SDK'; }) || u.estates[0];
  }

  function renderHeader(u, estate) {
    var pr = EA.practice && EA.practice();
    $('top').className = 'top' + (pr ? ' practice' : isHQ(u) ? ' hq' : '');
    $('practice-band').hidden = !pr;
    $('practice-out').hidden = !(EA.practiceOwn && EA.practiceOwn());
    $('who-name').textContent = u.name;
    var r = EA.roleNames[u.role] || { bm: u.role, en: u.role };
    $('who-role').textContent = EA.t(r.bm, r.en);
    // v1.64 (Brief_Susun_Atur 2): one estate button with the estate's name, instead of the row of codes
    var many = u.estates.length > 1, eb = $('estate-btn');
    eb.innerHTML = esc(estName(estate)) + (many ? ' <span class="est-arr" aria-hidden="true">▾</span>' : '');
    eb.dataset.estate = estate; eb.disabled = !many;
    eb.onclick = !many ? null : function () {
      openSheet('<h2 id="sheet-title">' + EA.t('Pilih ladang', 'Pick the estate') + '</h2><div class="est-pick">' +
        u.estates.map(function (code) {
          return '<button type="button" class="btn ' + (code === estate ? 'btn-main' : 'btn-ghost') + '" data-estate="' + code + '">' + esc(estName(code)) + '</button>';
        }).join('') + '</div>',
        function (s) {
          s.querySelectorAll('[data-estate]').forEach(function (b) { b.onclick = function () { EA.local.set(ESTATE_KEY, b.dataset.estate); closeSheet(); render(); }; });
        });
    };
    $('tile-share').hidden = !isHQ(u);   // v1.64: only the Owner and HQ share the app (Yu Chen, 15 Nov)
  }
  // v1.68: names come from the shared estate list (Rule 5: built once). A retired code still reads, so an
  // old record naming Tekara shows its name and not a bare code.
  function estName(code) { return EA.lists.estateName(code); }

  function renderGreeting() {
    var d = new Date(), h = d.getHours();
    var g = h < 12 ? ['Selamat pagi', 'Good morning'] : h < 14 ? ['Selamat tengah hari', 'Good afternoon'] : h < 19 ? ['Selamat petang', 'Good afternoon'] : ['Selamat malam', 'Good evening'];
    $('greet-bm').textContent = EA.t(g[0], g[1]);
    $('date-bm').textContent = DAY_BM[d.getDay()] + ', ' + d.getDate() + ' ' + MON_BM[d.getMonth()] + ' ' + d.getFullYear();
    $('date-en').textContent = DAY_EN[d.getDay()] + ', ' + d.getDate() + ' ' + MON_EN[d.getMonth()] + ' ' + d.getFullYear();
  }

  // A room can be entered when it has a screen and is live; on the test copy
  // a room still being built can be tried too.
  function enterable(r, estate) {
    return !!(EA.roomViews && EA.roomViews[r.id]) && (EA.roomLive(r, estate) || EA.testMode() || !!(EA.practice && EA.practice()));
  }

  // v1.61 the new layout: work rooms open from Hari ini, the lists (workers, mills, users, admin) live under Senarai,
  // and rooms not open yet show nowhere (they appear when they open).
  var LIST_ROOMS = ['workers', 'mills', 'users', 'admin'];
  function renderTiles(u, estate) {
    var all = EA.roomsFor(u, estate).filter(function (r) { return EA.roomLive(r, estate) || enterable(r, estate); });
    // v1.63: Field & Harvest is opened by its screens on Hari ini (Chit pagi, Kerja, Ramp, Tiket), not by a second tile
    var work = all.filter(function (r) { return LIST_ROOMS.indexOf(r.id) < 0 && r.id !== 'durian' && r.id !== 'field-harvest'; }), lists = all.filter(function (r) { return LIST_ROOMS.indexOf(r.id) >= 0; });
    // v1.90: in Latihan, Pengguna and Pentadbir are not shown (people, PINs, phones and switches are real, never practice)
    if (EA.practice && EA.practice()) lists = lists.filter(function (r) { return r.id !== 'users' && r.id !== 'admin'; });
    $('rooms-h').hidden = !work.length;
    $('tiles').innerHTML = tilesHtml(work, u, estate);
    // v1.65 (Brief_Susun_Atur 4): the Admin page is spread into Senarai — Telefon, Masalah and Suis are their own
    // tiles for the Owner; HQ keeps the one summary tile.
    var adm = lists.find(function (r) { return r.id === 'admin'; });
    $('tiles-lists').innerHTML = tilesHtml(lists.filter(function (r) { return !(u.role === 'Owner' && r.id === 'admin'); }), u, estate) +
      (adm && u.role === 'Owner' ? [['summary', 'RK', 'Ringkasan ladang', 'Estate summary', 'Semua ladang', 'All estates'], ['phones', 'TL', 'Telefon', 'Phones', 'Peranti dan versi', 'Devices and versions'],
        ['problems', 'MS', 'Masalah', 'Problems', 'Ralat telefon, simpanan ditolak', 'Phone errors, refused saves'], ['switches', 'SU', 'Suis', 'Switches', 'Buka ladang, PIN ujian', 'Open an estate, test PINs']].map(function (x) {
        return refTile('data-adm="' + x[0] + '"', x[1], x[2], x[3], x[4], x[5]); }).join('') : '');
    $('tiles-lists').querySelectorAll('[data-adm]').forEach(function (b) { b.onclick = function () { location.hash = 'admin/' + b.dataset.adm; }; });
    renderRef(u, estate);
    [$('tiles'), $('tiles-lists')].forEach(function (box) { wireTiles(box, estate); });
  }
  // v1.65 (Brief_Susun_Atur 4): the lists that seldom change, for everyone to look at — lot map, workers, job codes,
  // rates, holidays. View only: nothing is keyed here. All from the shared lists already on the phone.
  function refTile(attr, mark, bm, en, sbm, sen) {
    return '<button class="tile live" type="button" ' + attr + '><span class="mark" aria-hidden="true">' + mark + '</span><span class="name"><span class="bm">' + esc(bm) + '</span><span class="en">' + esc(en) + '</span></span>' +
      '<span class="when"><span class="bm">' + esc(sbm) + '</span><span class="en">' + esc(sen) + '</span></span></button>';
  }
  function f2(n) { return (Math.round(Number(n) * 100) / 100).toFixed(2); }
  // ---- Tanah & peta (1.84): the land list as a table, then one block's map with its lots. Read only. ----
  // Everything is read from lists/estates.js and lists/lots.js, the one land list (Rule 3); nothing is kept here.
  function n0(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function landRows(estate, piece) {
    var L = EA.lists;
    return (L.blocksFor ? L.blocksFor(estate) : []).filter(function (b) {
      if (L.isDurian && L.isDurian(estate, b.block)) return false;
      return piece == null || L.pieceOf(estate, b.block).piece === piece;
    }).map(function (b) {
      var ls = L.lotsFor(estate, b.block) || [], yrs = [];
      ls.forEach(function (l) { if (l.planted && yrs.indexOf(l.planted) < 0) yrs.push(l.planted); });
      return { block: b.block, name: b.name, ha: Number(b.ha) || 0, palms: ls.reduce(function (a, l) { return a + (Number(l.palms) || 0); }, 0), lots: ls.length, planted: yrs.sort().join('/') };
    });
  }
  function landSum(rows) { return rows.reduce(function (a, r) { a.ha += r.ha; a.palms += r.palms; a.lots += r.lots; return a; }, { ha: 0, palms: 0, lots: 0 }); }
  function sph(palms, ha) { return ha > 0 ? n0(palms / ha) : ''; }
  // The pieces of land on the all-estates table: an estate, and inside the Paitan group its three pieces.
  function landPieces() {
    var L = EA.lists, out = [];
    L.estatesLive().forEach(function (e) {
      var seen = [];
      (L.blocksFor ? L.blocksFor(e.code) : []).forEach(function (b) { var pc = L.pieceOf(e.code, b.block).piece; if (seen.indexOf(pc) < 0 && !(L.isDurian && L.isDurian(e.code, b.block))) seen.push(pc); });
      seen.forEach(function (pc) { out.push({ estate: e.code, piece: pc, name: pc === e.code ? estName(e.code) : (pc === 'TKRS' ? 'TKRS' : pc === '43AC' ? '43 Acres' : pc) }); });
    });
    return out;
  }
  function landAll(back) {
    var ps = landPieces(), tot = { ha: 0, palms: 0, lots: 0, blocks: 0 };
    var body = ps.map(function (x, i) { var rows = landRows(x.estate, x.piece), s = landSum(rows);
      tot.ha += s.ha; tot.palms += s.palms; tot.lots += s.lots; tot.blocks += rows.length;
      return '<tr class="tap" data-land="' + i + '"><td>' + esc(x.name) + ' <span class="chev">›</span></td><td>' + rows.length + '</td><td>' + f2(s.ha) + '</td><td>' + n0(s.palms) + '</td><td>' + sph(s.palms, s.ha) + '</td><td>' + s.lots + '</td></tr>'; }).join('');
    openSheet('<h2 id="sheet-title">' + EA.t('Tanah & peta · semua ladang', 'Land & map · all estates') + '</h2>' +
      '<p class="hint">' + EA.t('Tekan ladang → blok → peta dan petak. Lihat sahaja.', 'Tap an estate → block → map and lots. View only.') + '</p>' +
      '<table class="land-tab" id="land-all"><thead><tr><th>' + EA.t('Ladang', 'Estate') + '</th><th>' + EA.t('Blok', 'Blocks') + '</th><th>Ha</th><th>' + EA.t('Pokok', 'Palms') + '</th><th>' + EA.t('Pokok/Ha', 'Palms/Ha') + '</th><th>' + EA.t('Petak', 'Lots') + '</th></tr></thead><tbody>' + body +
      '<tr class="tot"><td>' + EA.t('Jumlah', 'Total') + '</td><td>' + tot.blocks + '</td><td>' + f2(tot.ha) + '</td><td>' + n0(tot.palms) + '</td><td>' + sph(tot.palms, tot.ha) + '</td><td>' + tot.lots + '</td></tr></tbody></table>',
      function (sh) { sh.querySelectorAll('[data-land]').forEach(function (tr) { tr.onclick = function () { var x = ps[Number(tr.dataset.land)]; landEstate(x.estate, x.piece, true); }; }); });
  }
  function landEstate(estate, piece, fromAll) {
    var rows = landRows(estate, piece), s = landSum(rows), nm = piece && piece !== estate ? (piece === '43AC' ? '43 Acres' : piece) : estName(estate);
    openSheet((fromAll ? '<button type="button" class="back-btn land-up" id="land-up">‹ ' + EA.t('Semua ladang', 'All estates') + '</button>' : '') +
      '<h2 id="sheet-title">' + EA.t('Tanah & peta · ', 'Land & map · ') + esc(nm) + '</h2>' +
      '<p class="hint">' + rows.length + EA.t(' blok · ', ' blocks · ') + s.lots + EA.t(' petak · tekan blok untuk peta dan petaknya. Lihat sahaja.', ' lots · tap a block for its map and lots. View only.') + '</p>' +
      '<table class="land-tab" id="land-est"><thead><tr><th>' + EA.t('Blok', 'Block') + '</th><th>' + EA.t('Tanam', 'Planted') + '</th><th>Ha</th><th>' + EA.t('Pokok', 'Palms') + '</th><th>' + EA.t('Pokok/Ha', 'Palms/Ha') + '</th><th>' + EA.t('Petak', 'Lots') + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr class="tap" data-landblk="' + esc(r.block) + '"><td>' + esc(r.block) + ' <span class="chev">›</span></td><td>' + esc(r.planted || '–') + '</td><td>' + f2(r.ha) + '</td><td>' + n0(r.palms) + '</td><td>' + sph(r.palms, r.ha) + '</td><td>' + r.lots + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>' + EA.t('Jumlah', 'Total') + '</td><td></td><td>' + f2(s.ha) + '</td><td>' + n0(s.palms) + '</td><td>' + sph(s.palms, s.ha) + '</td><td>' + s.lots + '</td></tr></tbody></table>' +
      '<p class="hint">' + EA.t('Peta A3 untuk dicetak ada di pejabat. Warna ikut kerja: Rekod › Program.', 'The A3 maps to print are at the office. Colours by work: Records › Plan.') + '</p>',
      function (sh) {
        if (fromAll) $('land-up').onclick = function () { landAll(); };
        sh.querySelectorAll('[data-landblk]').forEach(function (tr) { tr.onclick = function () { landBlock(estate, tr.dataset.landblk, piece, fromAll); }; });
      });
  }
  function landBlock(estate, block, piece, fromAll) {
    var L = EA.lists, ls = L.lotsFor(estate, block) || [], b = (L.blocksFor(estate) || []).filter(function (x) { return x.block === block; })[0] || { ha: 0 };
    var r = landRows(estate, null).filter(function (x) { return x.block === block; })[0], st = {};
    ls.forEach(function (l) { st[l.lot] = { k: '' }; });
    var m = EA.fh && EA.fh.program && EA.fh.program.lotMap ? EA.fh.program.lotMap(estate, block, st, 'land') : '';
    openSheet('<button type="button" class="back-btn land-up" id="land-up">‹ ' + esc(piece && piece !== estate ? (piece === '43AC' ? '43 Acres' : piece) : estName(estate)) + '</button>' +
      '<h2 id="sheet-title">' + esc(estName(estate)) + ' · Blok ' + esc(block) + '</h2>' +
      '<p class="hint">' + (r.planted ? EA.t('Tanam ', 'Planted ') + esc(r.planted) + ' · ' : '') + f2(b.ha) + ' Ha · ' + ls.length + EA.t(' petak · ', ' lots · ') + n0(r.palms) + EA.t(' pokok', ' palms') + '</p>' +
      '<div class="ref-blk land-map">' + (m || '<p class="hint">' + EA.t('Belum ada peta untuk blok ini.', 'No map for this block yet.') + '</p>') + '</div>' +
      '<p class="land-pick" id="land-pick" hidden></p>' +
      '<table class="land-tab" id="land-lots"><thead><tr><th>' + EA.t('Petak', 'Lot') + '</th><th>Ha</th><th>' + EA.t('Pokok', 'Palms') + '</th><th>' + EA.t('Pokok/Ha', 'Palms/Ha') + '</th></tr></thead><tbody>' +
      ls.map(function (l) { return '<tr class="tap" data-landlot="' + esc(l.lot) + '"><td>' + esc(l.lot) + '</td><td>' + f2(l.ha) + '</td><td>' + n0(l.palms) + '</td><td>' + sph(l.palms, l.ha) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>' + EA.t('Jumlah', 'Total') + '</td><td>' + f2(ls.reduce(function (a, l) { return a + (Number(l.ha) || 0); }, 0)) + '</td><td>' + n0(r.palms) + '</td><td>' + sph(r.palms, ls.reduce(function (a, l) { return a + (Number(l.ha) || 0); }, 0)) + '</td></tr></tbody></table>' +
      (m ? '<p class="hint">' + EA.t('Tekan petak di peta atau di senarai — kedua-duanya menyala.', 'Tap a lot on the map or in the list — it lights up in both.') + '</p>' : ''),
      function (sh) {
        $('land-up').onclick = function () { landEstate(estate, piece, fromAll); };
        function pick(lot, scroll) {
          var l = ls.filter(function (x) { return x.lot === lot; })[0]; if (!l) return;
          sh.querySelectorAll('.land-map path.sel, #land-lots tr.sel').forEach(function (el) { el.classList.remove('sel'); });
          sh.querySelectorAll('.land-map path[data-pglot]').forEach(function (el) { if (el.dataset.pglot === 'land|' + lot) { el.classList.add('sel'); el.parentNode.appendChild(el); } });
          // the lot numbers are drawn after the outlines; put them back on top of the lot just raised
          sh.querySelectorAll('.land-map svg text, .land-map svg g').forEach(function (el) { el.parentNode.appendChild(el); });
          var tr = sh.querySelector('#land-lots tr[data-landlot="' + lot + '"]'); if (tr) { tr.classList.add('sel'); if (scroll && tr.scrollIntoView) tr.scrollIntoView({ block: 'center' }); }
          var pk = $('land-pick'); pk.hidden = false; pk.textContent = EA.t('Petak ', 'Lot ') + l.lot + ' · ' + f2(l.ha) + ' Ha · ' + n0(l.palms) + EA.t(' pokok', ' palms');
        }
        sh.querySelectorAll('.land-map path[data-pglot]').forEach(function (el) { el.onclick = function () { pick(el.dataset.pglot.split('|')[1], true); }; });
        sh.querySelectorAll('[data-landlot]').forEach(function (tr) { tr.onclick = function () { pick(tr.dataset.landlot, false); var mp = sh.querySelector('.land-map'); if (mp && mp.scrollIntoView) mp.scrollIntoView({ block: 'start' }); }; });
      });
  }
  function renderRef(u, estate) {
    var L = EA.lists, box = $('tiles-ref');
    var blocks = (L.blocksFor ? L.blocksFor(estate) : []).filter(function (b) { return !(L.isDurian && L.isDurian(estate, b.block)); });
    var lots = L.lotsFor ? L.lotsFor(estate).filter(function (l) { return !(L.isDurian && L.isDurian(estate, l.block)); }) : [];
    var people = u.role !== 'Worker' && L.workersFor ? L.workersFor(estate) : [];
    var seesWorkersRoom = EA.roomsFor(u, estate).some(function (r) { return r.id === 'workers'; });
    var jobs = (L.mainJobs && L.mainJobs[estate]) || [];
    var hol = (L.holidays || []).filter(function (d) { return d.slice(0, 4) === EA.today().slice(0, 4); });
    var h = '';
    // 1.84 (Yu Chen, 21 Nov 2026, "ok" to the joined sample): one tile for the land. The block table is the way in;
    // a block opens its own map with its lots under it. It takes the place of the Peta petak tile.
    if (lots.length) h += refTile('data-ref="map"', 'TP', 'Tanah & peta', 'Land & map', blocks.length + ' blok · ' + lots.length + ' petak · ' + f2(blocks.reduce(function (a, b) { return a + (Number(b.ha) || 0); }, 0)) + ' Ha', blocks.length + ' blocks · ' + lots.length + ' lots · ' + f2(blocks.reduce(function (a, b) { return a + (Number(b.ha) || 0); }, 0)) + ' Ha');
    if (people.length && !seesWorkersRoom) h += refTile('data-ref="people"', 'PK', 'Pekerja', 'Workers', people.length + ' orang · lihat sahaja', people.length + ' people · view only');
    if (jobs.length) h += refTile('data-ref="jobs"', 'KK', 'Kod kerja', 'Job codes', jobs.length + ' kerja utama', jobs.length + ' main jobs');
    if (lots.length || isHQ(u)) h += refTile('data-ref="rates"', 'KD', 'Kadar', 'Piece rates', isHQ(u) ? 'Senarai kadar ladang' : 'Dari pejabat', isHQ(u) ? 'The estate\'s rate list' : 'From the office');
    // v1.70: the calendar is loaded for Meliau and Kawananan too, so its tile shows there before their lots are in
    if (lots.length || (L.calendarFor && L.calendarFor(estate))) h += refTile('data-ref="hol"', 'CU', 'Cuti umum', 'Public holidays', hol.length ? hol.length + ' cuti umum ' + EA.today().slice(0, 4) : 'Belum dimuat naik', hol.length ? hol.length + ' holidays ' + EA.today().slice(0, 4) : 'Not loaded yet');
    box.innerHTML = h; box.hidden = !h;
    var name = estName(estate);
    var show = { map: function () { if (isHQ(u)) landAll(estate); else landEstate(estate, null); }
      , people: function () {
        var by = {}; people.forEach(function (w) { (by[w.gang || '-'] = by[w.gang || '-'] || []).push(w); });
        openSheet('<h2 id="sheet-title">' + EA.t('Pekerja · ', 'Workers · ') + esc(name) + '</h2><p class="hint">' + people.length + EA.t(' orang · lihat sahaja. Pekerja baru atau berhenti: beritahu kerani.', ' people · view only. A new or leaving worker: tell the clerk.') + '</p>' +
          Object.keys(by).sort().map(function (g) { return '<h3 class="ref-h">' + esc(g) + ' <small>' + by[g].length + '</small></h3><ul class="ref-list">' + by[g].map(function (w) { return '<li>' + esc(w.name) + '</li>'; }).join('') + '</ul>'; }).join(''));
      }, jobs: function () {
        openSheet('<h2 id="sheet-title">' + EA.t('Kod kerja · ', 'Job codes · ') + esc(name) + '</h2><p class="hint">' + EA.t('Kerja utama ladang ini. Kerja lain: minta lulus di chit.', 'This estate\'s main jobs. Other work: ask for approval on the chit.') + '</p><ul class="ref-list">' +
          jobs.map(function (c) { var t = L.task(c) || { bm: c, en: c, unit: '' }; return '<li><b class="mono">' + esc(c) + '</b> ' + esc(EA.t(t.bm, t.en)) + (t.unit ? ' <small>' + esc(t.unit) + '</small>' : '') + '</li>'; }).join('') + '</ul>');
      }, rates: function () {
        // v1.70 (Yu Chen, 17 Nov 2026: "owner and hq"): the Owner and HQ see the estate's rate list, asked from the
        // office each time and never kept on the phone. Every other position still reads "ask HQ".
        var askHq = '<p>' + EA.t('Kadar disimpan di pejabat sahaja, bukan di telefon. Ada soalan tentang kadar? Tanya Ibu Pejabat Sandakan.', 'Rates are kept at the office only, not on the phone. A question about a rate? Ask Sandakan HQ.') + '</p>';
        var title = '<h2 id="sheet-title">' + EA.t('Kadar', 'Piece rates') + (isHQ(u) ? ' · ' + esc(name) : '') + '</h2>';
        if (!isHQ(u)) { openSheet(title + askHq); return; }
        openSheet(title + '<p class="hint" id="rates-box">' + EA.t('Memuat dari pejabat…', 'Loading from the office…') + '</p>');
        EA.askFull('rates', { estate: estate }).then(function (j) {
          var box = document.getElementById('rates-box'); if (!box) return;
          if (!j || !j.ok) { box.textContent = j && j.error === 'not_allowed' ? EA.t('Hanya Pemilik dan Ibu Pejabat boleh lihat kadar.', 'Only the Owner and HQ can see the rates.') : EA.t('Pejabat tidak dapat dihubungi. Perlu isyarat. Cuba lagi.', 'The office cannot be reached. Signal is needed. Try again.'); return; }
          var rows = j.rates || [];
          if (!rows.length) { box.textContent = EA.t('Belum ada kadar untuk ladang ini.', 'No rates for this estate yet.'); return; }
          var groups = [], at = {};
          rows.forEach(function (r) { var g = String(r.note || '').split(' · ')[0] || '-'; if (!at[g]) { at[g] = { name: g, rows: [] }; groups.push(at[g]); } at[g].rows.push(r); });
          var money = function (v) { var n = Number(v); return isNaN(n) ? esc(String(v)) : (Math.round(n * 1000) % 10 ? n.toFixed(3) : n.toFixed(2)); };
          var dm = function (x) { x = String(x || ''); return /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(8, 10) + '/' + x.slice(5, 7) + '/' + x.slice(2, 4) : x; };
          var h = '<p class="hint">' + rows.length + EA.t(' baris · untuk Pemilik dan Ibu Pejabat sahaja · tidak disimpan di telefon.', ' lines · for the Owner and HQ only · not kept on the phone.') +
            (estate === 'PTAN' ? ' ' + EA.t('Tekara dan 43 Ekar guna kadar yang sama.', 'Tekara and 43 Acres use the same rates.') : '') + '</p>';
          groups.forEach(function (g) {
            h += '<h3 class="ref-h">' + esc(g.name) + ' <small>' + g.rows.length + '</small></h3><ul class="ref-list rate-list">' + g.rows.map(function (r) {
              var sub = [r.task_code, r.target_day ? EA.t('sasaran ', 'target ') + r.target_day : '', r.from_date ? EA.t('dari ', 'from ') + dm(r.from_date) : ''].filter(Boolean).map(function (x) { return esc(String(x)); }).join(' · ');
              return '<li><span class="rate-l">' + esc(String(r.band)) + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="rate-r"><b>RM ' + money(r.rate_rm) + '</b>' + (r.pay_unit ? '<small>/ ' + esc(String(r.pay_unit)) + '</small>' : '') + '</span></li>';
            }).join('') + '</ul>';
          });
          h += '<p class="hint">' + EA.t('Sumber: ', 'Source: ') + esc(String(rows[0].approved_by || '')) + '</p>';
          box.outerHTML = '<div id="rates-box">' + h + '</div>';
        });
      }, hol: function () {
        // v1.69: the estate's working calendar — public holidays (they act like a Sunday), then the estate's own off
        // days for harvesting and for general & maintenance work (shown only).
        var d = function (x) { var t = new Date(x + 'T00:00:00'); return EA.t(DAY_BM, DAY_EN)[t.getDay()] + ', ' + t.getDate() + ' ' + EA.t(MON_BM, MON_EN)[t.getMonth()] + ' ' + t.getFullYear(); };
        var cal = L.calendarFor ? L.calendarFor(estate) : null, today = EA.today(), yr = today.slice(0, 4);
        var ul = function (a, mark) { return a.length ? '<ul class="ref-list">' + a.map(function (x) { return '<li' + (x < today ? ' class="past"' : '') + '>' + esc(d(x)) + (mark && mark(x) ? ' <small>' + mark(x) + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="hint">' + EA.t('Tiada.', 'None.') + '</p>'; };
        var inYear = function (a) { return (a || []).filter(function (x) { return x.slice(0, 4) === yr; }); };
        var h = '<h2 id="sheet-title">' + EA.t('Cuti umum · ', 'Public holidays · ') + esc(name) + ' ' + yr + '</h2>';
        if (!hol.length) h += '<p>' + EA.t('Kalendar ' + yr + ' belum dimuat naik. Ahad ialah hari rehat.', 'The ' + yr + ' calendar is not loaded yet. Sunday is the rest day.') + '</p>';
        else {
          var next = hol.filter(function (x) { return x >= today; })[0];
          h += '<p class="hint">' + EA.t('Cuti umum sama seperti Ahad: kerja selain tuai, baja dan racun bulat perlu lulus Pengurus dahulu.', 'A public holiday is like a Sunday: work other than harvesting, manuring and circle spray needs the manager\'s approval first.') +
            (next ? ' ' + EA.t('Seterusnya: ', 'Next: ') + '<b>' + esc(d(next)) + '</b>.' : '') + '</p>' +
            '<h3 class="ref-h">' + EA.t('Cuti umum', 'Public holidays') + ' <small>' + hol.length + '</small></h3>' +
            ul(hol, cal ? function (x) { return cal.harvestPH.indexOf(x) < 0 ? EA.t('tuai bekerja', 'harvesting works') : ''; } : null);
          if (cal) {
            var ho = inYear(cal.harvestOff), go = inYear(cal.gmOff), sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
            h += '<h3 class="ref-h">' + EA.t('Hari tutup ladang · tuai', 'Estate off days · harvesting') + ' <small>' + ho.length + '</small></h3>' + ul(ho) +
              '<h3 class="ref-h">' + EA.t('Hari tutup ladang · kerja am & rawatan', 'Estate off days · general & maintenance') + ' <small>' + go.length + '</small></h3>' + ul(go) +
              '<h3 class="ref-h">' + EA.t('Hari kerja sebulan', 'Working days a month') + '</h3><table class="ref-tab"><tr><th>' + EA.t('Bulan', 'Month') + '</th><th>' + EA.t('Tuai', 'Harvest') + '</th><th>' + EA.t('Kerja am', 'G&M') + '</th></tr>' +
              // v1.69.1: one row per month. Twelve months across did not fit a phone and pushed the whole sheet off the screen.
              EA.t(MON_BM, MON_EN).map(function (m, i) { return '<tr><td>' + esc(m) + '</td><td>' + cal.harvestDays[i] + '</td><td>' + cal.gmDays[i] + '</td></tr>'; }).join('') +
              '<tr><td>' + EA.t('Jumlah', 'Total') + '</td><td><b>' + sum(cal.harvestDays) + '</b></td><td><b>' + sum(cal.gmDays) + '</b></td></tr></table>' +
              '<p class="hint">' + EA.t('Hari tutup ladang ditunjuk sahaja; app tidak menghalang kerja pada hari itu. Sumber: ', 'Estate off days are shown only; the app does not stop work on them. Source: ') + esc(cal.src) + '.</p>';
          }
        }
        openSheet(h);
      } };
    box.querySelectorAll('[data-ref]').forEach(function (b) { b.onclick = function () { show[b.dataset.ref](); }; });
  }
  function tilesHtml(rooms, u, estate) {
    return rooms.map(function (r) {
      var live = EA.roomLive(r, estate);
      return '<button class="tile ' + (live ? 'live' : r.state) + '" type="button" data-room="' + r.id + '">' +
        '<span class="mark" aria-hidden="true">' + r.mark + '</span>' +
        '<span class="name"><span class="bm">' + esc(r.bm) + '</span><span class="en">' + esc(r.en) + '</span></span>' +
        '<span class="when">' + (live && r.state !== 'live' ? EA.t('Digunakan · ', 'In use · ') + esc(estate) : esc(r.when)) + (enterable(r, estate) && !live ? '<br><b>' + (EA.practice && EA.practice() ? EA.t('LATIHAN · boleh cuba', 'PRACTICE · try it') : EA.t('UJIAN · boleh cuba', 'TEST · try it')) + '</b>' : '') + '</span>' +
        (r.id === 'mills' && EA.millsWaiting && EA.millsWaiting(u, estate) ? '<span class="tile-badge">' + EA.millsWaiting(u, estate) + EA.t(' perlu tindakan', ' to act on') + '</span>' : '') +
        (r.id === 'workers' && EA.workersWaiting && EA.workersWaiting(u, estate) ? '<span class="tile-badge">' + EA.workersWaiting(u, estate) + (u.role === 'Manager' ? EA.t(' perlu lulus', ' to approve') : u.role === 'Clerk' ? EA.t(' mungkin lari', ' maybe absconded') : EA.t(' perlu tindakan', ' to act on')) + '</span>' : '') + '</button>';
    }).join('');
  }
  function wireTiles(box, estate) {
    box.querySelectorAll('.tile[data-room]').forEach(function (t) {
      t.onclick = function () {
        var r = EA.rooms.find(function (x) { return x.id === t.dataset.room; });
        if (enterable(r, estate)) { location.hash = r.id; return; }
        openSheet('<h2 id="sheet-title"><span class="bm">' + esc(r.bm) + '</span><span class="en">' + esc(r.en) + '</span></h2>' +
          '<p><span class="bm" style="font-weight:400">' + esc(r.note.bm) + '</span><span class="en">' + esc(r.note.en) + '</span></p>' +
          '<div class="actions"><button class="btn btn-main" type="button" id="sheet-ok">OK<small>Faham</small></button></div>',
          function (s) { s.querySelector('#sheet-ok').onclick = closeSheet; });
      };
    });
  }


  // ---------- v1.61 the new layout: four tabs at the bottom of the home page (Brief_Susun_Atur, signed 15 Nov 2026) ----------
  // Hari ini (the day's work and what is late), Rekod (records as tiles), Laporan (the company's papers), Senarai
  // (lists that seldom change). The room screens themselves are unchanged; the tabs are a new way in.
  var PANE_KEY = 'ea.homePane';
  var BAR_ICON = {
    today: '<path d="M4 5h16v15H4z"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="m8.5 15 2 2 4-4"/>',
    rekod: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 11h6M9 15h6M9 7h3"/>',
    laporan: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 17v-3M12 17v-6M15 17v-4"/>',
    lists: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>'
  };
  function pane() { var p = EA.local.get(PANE_KEY, 'today'); return /^(today|rekod|laporan|lists)$/.test(p) ? p : 'today'; }
  EA.homePane = function (p) { EA.local.set(PANE_KEY, p || 'today'); if (location.hash) location.hash = ''; else render(); window.scrollTo(0, 0); };
  function recTile(v, bm, en, sbm, sen) {
    return '<button class="tile live" type="button" data-rec="' + v + '"><span class="mark" aria-hidden="true">' + esc(bm.slice(0, 2).toUpperCase()) + '</span>' +
      '<span class="name"><span class="bm">' + esc(bm) + '</span><span class="en">' + esc(en) + '</span></span><span class="when"><span class="bm">' + esc(sbm) + '</span><span class="en">' + esc(sen) + '</span></span></button>';
  }

  // v1.62: the screens the room's bottom bar used to open, now on Hari ini, by position. The staff in charge has
  // them as "Langkah hari ini"; Operasi / Rekod is the Rekod tab.
  function renderScreens(u, estate, fh) {
    var box = $('work-screens'); if (!box) return;
    var steps = u.role === 'Staff' && $('today') && !$('today').hidden;   // v1.64: the steps are the buttons, no second row
    var list = !fh || steps ? [] : u.role === 'Clerk' ? [['ticket', 'MILL TICKET', 'TIKET KILANG']]
      : u.role === 'Worker' ? [['collect', 'RAMP & LORRY', 'RAMP & LORI']]
      : /^(Owner|HQ)$/.test(u.role) ? [['ticket', 'MILL TICKET', 'TIKET KILANG']]   // v1.66: they key no chit, work or ramp
      : u.role === 'Staff' ? [['', 'MORNING CHIT', 'CHIT PAGI'], ['work', 'WORK', 'KERJA'], ['collect', 'RAMP & LORRY', 'RAMP & LORI'], ['close', 'CLOSE THE DAY', 'TUTUP HARI']] : [];
    box.hidden = !list.length;
    $('rooms-h').hidden = !list.length && !$('tiles').children.length;
    box.innerHTML = list.map(function (x) { return '<button type="button" class="btn btn-ghost" data-scr="' + x[0] + '">' + x[1] + '<small>' + x[2] + '</small></button>'; }).join('');
    box.querySelectorAll('[data-scr]').forEach(function (b) { b.onclick = function () { location.hash = 'field-harvest' + (b.dataset.scr ? '/' + b.dataset.scr : ''); }; });
  }
  function renderPanes(u, estate) {
    var p = pane();
    var fhR = EA.rooms.find(function (r) { return r.id === 'field-harvest'; });
    var fh = !!fhR && EA.roomsFor(u, estate).some(function (r) { return r.id === 'field-harvest'; }) && enterable(fhR, estate) && u.role !== 'Worker';
    var dur = EA.roomsFor(u, estate).find(function (r) { return r.id === 'durian'; });
    // Hari ini: greeting, what is late, the day's steps, the work rooms
    $('home-main').setAttribute('data-pane', p);   // CSS hides Hari ini's cards on the other tabs (they may redraw later, from the office)
    document.querySelector('#home-main .greet').hidden = p !== 'today';
    $('layout').hidden = p !== 'today';
    renderScreens(u, estate, fh); barFh = fh;
    // Rekod: one tile per record (the screens inside are today's)
    $('pane-rekod').hidden = p !== 'rekod';
    if (p === 'rekod') {
      $('pane-rekod').innerHTML = '<h2 class="sec-h"><span class="inline"><span class="bm">Rekod</span> · <span class="en">Records</span></span></h2>' +
        (fh ? '<div class="tiles" id="rec-tiles">' + recTile('', 'Harian', 'Daily', 'Hari demi hari: chit, kerja, lori, tiket', 'Day by day: chit, work, lorries, tickets') +
          recTile('prog', 'Program', 'Plan vs actual', 'Rancangan vs sebenar, ikut blok dan petak', 'Plan against actual, by block and lot') +
          recTile('org', 'Orang', 'People', 'Kehadiran bulan ini, ikut orang', 'This month\'s attendance, by person') +
          (dur ? '<button class="tile live" type="button" data-room="durian"><span class="mark" aria-hidden="true">DR</span><span class="name"><span class="bm">Durian</span><span class="en">Durian farm</span></span><span class="when"><span class="bm">Buka DMS</span><span class="en">Opens the DMS</span></span></button>' : '') + '</div>' :
          '<p class="hint">' + EA.t('Tiada rekod untuk ' + esc(estate) + ' lagi.', 'No records for ' + esc(estate) + ' yet.') + '</p>');
      $('pane-rekod').querySelectorAll('[data-rec]').forEach(function (b) {
        b.onclick = function () { if (EA.fh && EA.fh.recView) EA.fh.recView(b.dataset.rec); if (EA.fh && EA.fh.history && EA.fh.history.reset) EA.fh.history.reset(); location.hash = 'field-harvest/history'; };
      });
      wireTiles($('pane-rekod'), estate);
    }
    // Laporan: the company's own papers, in their three tiers (Kajian_Laporan_dan_Rekod)
    $('pane-laporan').hidden = p !== 'laporan';
    if (p === 'laporan') {
      var soon = function (bm, en, sbm, sen) { return '<li class="lp-soon"><b><span class="bm">' + bm + '</span><span class="en">' + en + '</span></b><small><span class="bm">' + sbm + '</span><span class="en">' + sen + '</span></small></li>'; };
      $('pane-laporan').innerHTML = '<h2 class="sec-h"><span class="inline"><span class="bm">Laporan</span> · <span class="en">Reports</span></span></h2>' +
        (fh ? '<div class="card"><h2><span class="bm">Harian</span><span class="en">Daily</span></h2><p class="hint">' + EA.t('Chit pagi dan tutup hari setiap hari, dengan teks WhatsApp.', 'Each day\'s morning chit and day close, with the WhatsApp text.') + '</p>' +
          '<button type="button" class="btn" data-rec="">OPEN DAY BY DAY<small>BUKA HARI DEMI HARI</small></button></div>' +
          '<div class="card"><h2><span class="bm">Bulanan</span><span class="en">Monthly</span></h2><p class="hint">' + EA.t('Laporan bulan (2 muka A4, ditandatangani Kerani, Staf, Pengurus). Cetak di komputer pejabat.', 'The month report (2 A4 pages, signed by Clerk, Staff, Manager). Print on the office computer.') + '</p>' +
          '<button type="button" class="btn" data-rec="">MONTH REPORT<small>LAPORAN BULAN</small></button></div>' : '') +
        '<div class="card"><h2><span class="bm">Akan datang</span><span class="en">Coming</span></h2><ul class="lp-list">' +
          soon('Minit mesyuarat mingguan', 'Weekly meeting minutes', 'Mesyuarat Jumaat · minit sebelum Sabtu 11 pagi', 'Meeting Friday · minutes before Saturday 11 am') +
          soon('Laporan Kemajuan Bulanan', 'Monthly Progress Report', '19 muka, diisi dari rekod', '19 pages, filled from the records') +
          soon('Pek gaji', 'Pay pack', 'Bila bilik Gaji dibuka', 'When the Pay room opens') + '</ul></div>';
      $('pane-laporan').querySelectorAll('[data-rec]').forEach(function (b) {
        b.onclick = function () { if (EA.fh && EA.fh.recView) EA.fh.recView(''); if (EA.fh && EA.fh.history && EA.fh.history.reset) EA.fh.history.reset(); location.hash = 'field-harvest/history'; };
      });
    }
    $('pane-lists').hidden = p !== 'lists';
  }
  // v1.62: the four tabs on every screen — the home page and inside every room — one bar, never a second one.
  var barFh = false;
  function renderBar(active) {
    var items = [['today', 'Hari ini', 'Today'], ['rekod', 'Rekod', 'Records'], ['laporan', 'Laporan', 'Reports'], ['lists', 'Senarai', 'Lists']];
    var late = (document.querySelectorAll('#todo .td-it').length || 0);
    $('home-bar').className = 'tabs botbar';
    // v1.65: on a laptop (a wide screen) the same four tabs stand down the left side, with Rekod's three records
    // under it (the mock's laptop view). The brand and the sub-lines are hidden on a phone by the style sheet.
    var subs = [];   // v1.66: the Rekod tiles pick Harian, Program or Orang; the side menu does not repeat them
    var cur = active === 'rekod' && location.hash.indexOf('field-harvest/history') >= 0 && EA.fh && EA.fh.recNow ? EA.fh.recNow() : null;
    $('home-bar').innerHTML = items.map(function (it) {
      return '<a role="button" tabindex="0" data-pane="' + it[0] + '"' + (active === it[0] ? ' aria-current="page"' : '') + '>' +
        (it[0] === 'today' && late ? '<span class="tab-n">' + late + '</span>' : '') +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + BAR_ICON[it[0]] + '</svg><span class="bm">' + it[1] + '</span><span class="en">' + it[2] + '</span></a>' +
        (it[0] === 'rekod' ? subs.map(function (x) { return '<button type="button" class="bar-sub' + (cur === x[0] ? ' on' : '') + '" data-rsub="' + x[0] + '">' + esc(EA.t(x[1], x[2])) + '</button>'; }).join('') : '');
    }).join('');
    $('home-bar').querySelectorAll('[data-pane]').forEach(function (a) { a.onclick = function () { EA.homePane(a.dataset.pane); }; });
    $('home-bar').querySelectorAll('[data-rsub]').forEach(function (b) { b.onclick = function () {
      EA.local.set(PANE_KEY, 'rekod');
      if (location.hash.indexOf('field-harvest/history') >= 0 && EA.fh.recShow) { EA.fh.recShow(b.dataset.rsub); renderBar('rekod'); return; }
      if (EA.fh && EA.fh.recView) EA.fh.recView(b.dataset.rsub); if (EA.fh && EA.fh.history && EA.fh.history.reset) EA.fh.history.reset(); location.hash = 'field-harvest/history'; }; });
  }

  function renderPlan(u) {
    var show = false;   // v1.61 (Yu Chen, 15 Nov 2026: "Milestone can be removed") — the dates stay in the Growth Plan
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
        '<span class="d"><b>' + days + EA.t(' hari', ' days') + '</b>' + d.getDate() + ' ' + EA.t(MON_BM, MON_EN)[d.getMonth()] + ' ' + d.getFullYear() + '</span></li>';
    }).join('');
  }

  function renderSync() {
    var n = EA.waiting(), oldest = EA.oldestWaiting(), last = EA.lastSent();
    var tooOld = n > 0 && oldest && (Date.now() - oldest) > EA.config.WARN_AFTER_HOURS * 3600000;
    var pill = $('wait-pill');
    if (tooOld) { pill.className = 'pill bad'; pill.textContent = n + EA.t(' menunggu lebih 24 jam', ' waiting over 24 hours'); }
    else if (n > 0) { pill.className = 'pill wait'; pill.textContent = n + EA.t(' menunggu', ' waiting'); }
    else if (EA.testMode() && !EA.sendLink() && testUser()) { pill.className = 'pill wait'; pill.textContent = EA.t('Ujian · tidak dihantar ke pejabat', 'Test · not sent to the office'); }
    else { pill.className = 'pill ok'; pill.textContent = EA.t('Semua dihantar', 'All sent'); }
    var others = EA.waitingOthers ? EA.waitingOthers() : [];
    if (others.length) pill.textContent += ' · ' + others.map(function (o) { return o.n + EA.t(' milik ', ' from ') + o.code; }).join(', ') + EA.t(' (dihantar bila dia masuk)', ' (sent when they log in)');
    if (last) {
      var d = new Date(last), sameDay = d.toDateString() === new Date().toDateString();
      $('last-sent').textContent = EA.t('Dihantar ', 'Last sent ') + (sameDay ? hhmm(d) : d.getDate() + ' ' + EA.t(MON_BM, MON_EN)[d.getMonth()] + ' ' + hhmm(d));
    } else {
      $('last-sent').textContent = EA.t('Belum pernah dihantar', 'Never sent');
    }
    if (n > 0 && EA.nextRetry > Date.now()) $('last-sent').textContent += EA.t(' · Cuba lagi sendiri ', ' · Retries by itself ') + hhmm(new Date(EA.nextRetry));
    var sending = EA.isSending();
    $('send-btn').disabled = sending || !EA.waitingMine();
    $('send-btn').textContent = sending ? EA.t('MENGHANTAR…', 'SENDING…') : EA.t('HANTAR', 'SEND');
    var noLink = !EA.sendLink();
    $('test-mark').hidden = !(EA.testMode() && noLink && testUser());
    // A real person with no sending link always sees the red bar (v1.9): their entries wait, never "test-sent".
    $('notice-link').hidden = !(noLink && (!EA.testMode() || !testUser()));
  }

  var switchAsk = false;
  function render() {
    var u = EA.currentUser();
    $('login').hidden = !!u;
    $('home').hidden = !u;
    if (!u) { $('home-bar').className = ''; $('home-bar').innerHTML = ''; renderLogin(); return; }
    var estate = currentEstate(u);
    renderHeader(u, estate);
    renderGreeting();
    renderTiles(u, estate);
    renderPlan(u);
    if (EA.workersPeek) EA.workersPeek(u, estate);       // v1.25: approvals and flags waiting, for the Pekerja tile
    if (EA.millsPeek) EA.millsPeek(u, estate);           // v1.29: the estate's mill list, and requests waiting
    if (EA.renderTodo) { EA.renderTodo($('todo'), u, estate); EA.todoPeek(u, estate); }   // v1.31: Perlu tindakan
    if (EA.askLateAuto) EA.askLateAuto(u, estate);                                        // v1.57: the app asks first, once a day
    if (EA.renderLate) { EA.renderLate($('late'), u); EA.latePeek(u); }                   // v1.56: Susulan harian (HQ and the Owner)
    if (EA.renderToday) EA.renderToday($('today'), u, estate);                            // v1.61: Hari ini, the day's steps (staff in charge)
    renderPanes(u, estate);                                                                // v1.61: the four tabs
    // v1.16: fetch the trial switches from the office now and then (a phone may stay logged in for weeks).
    var sw = EA.switches();
    if (EA.sendLink() && navigator.onLine && !switchAsk && (!sw.at || Date.now() - sw.at > 30 * 60000)) {
      switchAsk = true;
      EA.ask('switches').then(function (j) { switchAsk = false; if (j && j.sw) { EA.setSwitches(j.sw); if (!location.hash) render(); } });
    }
    // Room screen, when the address ends in #room-id
    // #room-id or #room-id/screen (a room may have several screens)
    var parts = location.hash.replace('#', '').split('/');
    var rid = parts[0], screen = parts[1] || '';
    var room = rid && EA.roomsFor(u, estate).find(function (r) { return r.id === rid && enterable(r, estate); });
    $('home-main').hidden = !!room;
    // v1.62: the same four tabs inside a room; the tab lit is where the screen belongs
    renderBar(room ? (LIST_ROOMS.indexOf(room.id) >= 0 ? 'lists' : room.id === 'field-harvest' && screen === 'history' ? 'rekod' : 'today') : pane());
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
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="err-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="err-load">LOAD IT<small>Muat versi baru</small></button></div></div>';
    $('err-back').onclick = function () { location.hash = ''; };
    $('err-load').onclick = function () { EA.loadUpdate(); };
  }

  // Office refusals in plain words (v1.9). Anything not listed shows its code for Yu Chen.
  var REFUSED = {
    wrong_key: ['PIN anda tidak lagi dikenali. Keluar dan masuk semula, atau tanya Yu Chen.', 'Your PIN is no longer known. Log out and in again, or ask Yu Chen.'],
    locked: ['Terlalu banyak PIN salah dari telefon ini. Tunggu 15 minit.', 'Too many wrong PINs from this phone. Wait 15 minutes.'],
    not_allowed: ['Tugas anda tidak dibenarkan menyimpan catatan ini. Hubungi Yu Chen.', 'Your role may not save this entry. Call Yu Chen.'],
    not_your_estate: ['Catatan untuk ladang yang bukan milik anda. Hubungi Yu Chen.', 'An entry for an estate that is not yours. Call Yu Chen.'],
    old_version: ['Versi app sudah lama. Tekan MUAT (LOAD IT).', 'The app version is old. Tap LOAD IT.'],
    busy: ['Pejabat sibuk. Akan cuba lagi sendiri.', 'The office is busy. It will try again by itself.'],
    slow: ['Google lambat. Rekod selamat di telefon, akan cuba lagi sendiri.', 'Google is slow. Records are safe on the phone; it will try again by itself.'],
    office_error: ['Pejabat ada masalah. Akan cuba lagi sendiri; jika berulang, beritahu Yu Chen.', 'The office had a problem. It will try again; if it keeps happening, tell Yu Chen.'],
    refused: ['Pejabat belum terima. Akan cuba lagi sendiri.', 'The office has not taken it yet. It will try again by itself.'],
    // v1.43 TUTUP HARI
    day_closed: ['Hari itu sudah ditutup (TUTUP HARI). Pembetulan hanya melalui MINTA BETULKAN CHIT (kerani), dalam ' + (EA.fh && EA.fh.FIX_DAYS || 5) + ' hari.', 'That day is already closed (TUTUP HARI). Changes only through MINTA BETULKAN CHIT (the clerk), within ' + (EA.fh && EA.fh.FIX_DAYS || 5) + ' days.'],
    already_closed: ['Hari itu sudah ditutup sebelum ini.', 'That day was already closed.'],
    no_chit: ['Tiada chit pagi untuk hari itu; hari tidak boleh ditutup.', 'No morning chit for that day; it cannot be closed.']
  };
  function refusalText(e) {
    var k = String(e).split(':')[0], m = REFUSED[k];
    return m ? EA.t(m[0], m[1]) : EA.t('Pejabat menolak (', 'Office refused (') + e + EA.t('). Hantar tangkapan skrin kepada Yu Chen.', '). Send a screenshot to Yu Chen.');
  }

  // ---------- actions ----------
  $('send-btn').onclick = async function () {
    var r = await EA.send();
    if (r.error === 'slow') toast(EA.t('Google lambat. Rekod selamat di telefon dan akan dihantar sendiri. Jangan isi semula.', 'Google is slow. Records are safe on the phone and will send by themselves. Do not key them again.'), 'wait');
    else if (r.error === 'offline' || r.error === 'network') toast(EA.t('Tiada isyarat. Akan dihantar bila ada isyarat.', 'No signal. Will send when signal returns.'), 'wait');
    else if (r.error === 'nolink') toast(EA.t('Tiada pautan hantar', 'No sending link'), 'bad');
    else if (r.error === 'id_clash') openSheet('<h2 id="sheet-title"><span class="bm">Kod telefon ini sama dengan telefon lain</span><span class="en">This phone code is already used by another phone</span></h2>' +
      '<p><span class="bm" style="font-weight:400">Pejabat menolak catatan ini supaya tiada data hilang. Catatan kekal di telefon ini. Hubungi Yu Chen untuk kod telefon baru.</span>' +
      '<span class="en">The office refused these entries so nothing is lost. They stay on this phone. Ask Yu Chen for a new phone code.</span></p>' +
      '<div class="actions"><button class="btn btn-main" type="button" id="clash-ok">OK<small>Faham</small></button></div>',
      function (s) { s.querySelector('#clash-ok').onclick = closeSheet; });
    else if (r.error) toast(refusalText(r.error), 'bad');
    else if (r.refused) toast(r.refused + EA.t(' pembetulan DN ditolak: lori sudah ada tiket. Hubungi kerani.', ' DN correction refused: the lorry already has a ticket. Call the clerk.'), 'bad');
    else if (r.sent) toast(r.sent + EA.t(' dihantar', ' sent') + (r.test ? EA.t(' (ujian)', ' (test)') : ''));
  };

  // v1.53 Tukar PIN saya for everyone (Yu Chen, 11 Nov 2026): tap your own name at the top. Needs signal.
  // The office refuses an easy PIN or one someone else has, with the same answer for both. This phone
  // switches to the new PIN at once; another phone of the same person needs the new PIN once.
  var MYPIN_ERR = {
    bad_pin: ['Taip 6 nombor.', 'Type 6 numbers.'], not_same: ['Dua PIN tidak sama.', 'The two PINs are not the same.'],
    pick_another: ['Pilih PIN lain. Jangan nombor mudah.', 'Pick another PIN. Not an easy one.'], same_pin: ['Itu PIN anda sekarang.', 'That is your PIN now.'],
    offline: ['Tiada isyarat. Cuba lagi bila ada isyarat.', 'No signal. Try again when there is signal.'], nolink: ['Pautan hantar belum ditetapkan.', 'The sending link is not set.'],
    test_user: ['PIN ujian tidak boleh ditukar.', 'A test PIN cannot be changed.'], busy: ['Pejabat sibuk. Cuba lagi sebentar.', 'The office is busy. Try again in a moment.'],
    slow: ['Google lambat. Cuba lagi sebentar.', 'Google is slow. Try again in a moment.']
  };
  function myPinText(e) { var m = MYPIN_ERR[e] || ['Pejabat menolak: ' + e, 'Office refused: ' + e]; return EA.t(m[0], m[1]); }
  function myPinSheet() {
    var u = EA.currentUser();
    if (!u || testUser()) return;
    var inp = function (id, label) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" class="key-input" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" placeholder="······"></div>';
    };
    openSheet('<h2 id="sheet-title"><span class="bm">Tukar PIN saya</span><span class="en">Change my PIN</span></h2>' +
      '<p><b>' + EA.ui.esc(u.name) + '</b></p>' +
      inp('my-1', EA.t('PIN baru (6 nombor)', 'New PIN (6 numbers)')) + inp('my-2', EA.t('Taip sekali lagi', 'Type it again')) +
      '<p class="hint">' + EA.t('Jangan nombor mudah seperti 123456, 111111 atau 112233. Telefon ini terus guna PIN baru. Perlu isyarat.', 'Not an easy one like 123456, 111111 or 112233. This phone switches to the new PIN. Needs signal.') + '</p>' +
      '<p class="msg" id="my-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="my-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="my-ok">SAVE PIN<small>Simpan PIN</small></button></div>',
      function (s) {
        var a = s.querySelector('#my-1'), b = s.querySelector('#my-2'), m = s.querySelector('#my-err');
        [a, b].forEach(function (x) { x.oninput = function () { x.value = x.value.replace(/\D/g, '').slice(0, 6); m.hidden = true; }; });
        function err(e) { m.textContent = myPinText(e); m.hidden = false; }
        s.querySelector('#my-back').onclick = closeSheet;
        s.querySelector('#my-ok').onclick = async function () {
          if (!/^\d{6}$/.test(a.value)) return err('bad_pin');
          if (a.value !== b.value) return err('not_same');
          this.disabled = true;
          var pin = a.value, j = await EA.askFull('myPin', { pin: pin });
          if (!j || !j.ok) { this.disabled = false; return err((j && j.error) || 'busy'); }
          EA.setMyPin(pin); a.value = b.value = '';
          closeSheet(); toast(EA.t('PIN anda sudah ditukar', 'Your PIN is changed'));
        };
      });
  }
  // v1.64, trimmed 1.66: your name opens Tukar PIN and log out. Language and the phone code stay in Tetapan telefon
  // at the bottom, as before (Yu Chen, 15 Nov: "tetapan telefon keep at the bottom like old version").
  function nameMenu() {
    var u = EA.currentUser(); if (!u) return;
    var r = EA.roleNames[u.role] || { bm: u.role, en: u.role };
    openSheet('<h2 id="sheet-title">' + esc(u.name) + '</h2><p class="hint">' + esc(EA.t(r.bm, r.en)) + '</p>' +
      '<div class="name-menu">' +
      (latOk(u) ? (EA.practiceOwn() ? '<button class="btn btn-wait" type="button" id="nm-lat">LEAVE PRACTICE<small>KELUAR LATIHAN</small></button>'
        : '<button class="btn btn-ghost" type="button" id="nm-lat">PRACTICE<small>MASUK LATIHAN</small></button>') : '') +
      (testUser() || (EA.practice && EA.practice()) ? '' : '<button class="btn btn-ghost" type="button" id="nm-pin">CHANGE MY PIN<small>TUKAR PIN SAYA</small></button>') +
      '<button class="btn btn-ghost" type="button" id="logout">LOG OUT<small>KELUAR</small></button></div>',
      function (s) {
        var lat = s.querySelector('#nm-lat'); if (lat) lat.onclick = function () { closeSheet(); if (EA.practiceOwn()) latLeave(); else latEnterAsk(); };
        var pin = s.querySelector('#nm-pin'); if (pin) pin.onclick = function () { closeSheet(); myPinSheet(); };
        s.querySelector('#logout').onclick = function () { closeSheet(); logoutAsk(); };
      });
  }
  // v1.90 Latihan satu login (Yu Chen, 24 Nov 2026): every real person practises with his own login, from his
  // name menu. No practice ID. Latihan shows the same app with made-up workers, and its records go only to the
  // practice book. It ends with KELUAR LATIHAN or when the app is closed.
  function latOk(u) { return !!u && !/^[TL]-/.test(String(u.code)) && !!EA.practiceOwn; }
  function latSwitch(on) { EA.setPractice(on); location.hash = ''; location.reload(); }
  function latEnterAsk() {
    openSheet('<h2 id="sheet-title"><span class="bm">Masuk Latihan?</span><span class="en">Enter practice?</span></h2>' +
      '<p class="hint"><span class="bm">Skrin sama seperti biasa. Pekerja rekaan. Apa yang anda isi pergi ke buku latihan sahaja, bukan buku sebenar. ' +
      'Tekan KELUAR LATIHAN bila siap. Tutup app juga tamatkan Latihan.</span>' +
      '<span class="en">The same screens as usual. Made-up workers. What you key goes only to the practice book, not the real book. ' +
      'Press LEAVE PRACTICE when done. Closing the app also ends practice.</span></p>' +
      '<div class="actions"><button class="btn btn-wait" type="button" id="lat-in">ENTER PRACTICE<small>MASUK LATIHAN</small></button>' +
      '<button class="btn btn-ghost" type="button" id="lat-no">CANCEL<small>BATAL</small></button></div>',
      function (s) {
        s.querySelector('#lat-in').onclick = function () { closeSheet(); latSwitch(true); };
        s.querySelector('#lat-no').onclick = closeSheet;
      });
  }
  function latLeave() {
    var n = EA.waitingMine();
    if (!n) { latSwitch(false); return; }
    openSheet('<h2 id="sheet-title"><span class="bm">' + n + ' rekod latihan belum dihantar</span><span class="en">' + n + ' practice entries not sent yet</span></h2>' +
      '<p><span class="bm" style="font-weight:400">Ia kekal di telefon ini dan dihantar ke buku latihan bila anda masuk Latihan semula.</span>' +
      '<span class="en">They stay on this phone and go to the practice book when you enter practice again.</span></p>' +
      '<div class="actions"><button class="btn btn-ok" type="button" id="ll-send">SEND<small>Hantar dulu</small></button>' +
      '<button class="btn btn-wait" type="button" id="ll-out">LEAVE PRACTICE<small>Keluar Latihan juga</small></button></div>',
      function (s) {
        s.querySelector('#ll-send').onclick = function () { closeSheet(); $('send-btn').click(); };
        s.querySelector('#ll-out').onclick = function () { closeSheet(); latSwitch(false); };
      });
  }
  $('practice-out').onclick = latLeave;
  $('who-name').onclick = nameMenu;
  $('who-name').setAttribute('role', 'button'); $('who-name').setAttribute('tabindex', '0');
  $('who-name').title = 'Tukar PIN, keluar · Change PIN, log out';

  function logoutAsk() {
    var n = EA.waitingMine();
    if (!n) { EA.logout(); render(); return; }
    openSheet('<h2 id="sheet-title"><span class="bm">' + n + ' catatan belum dihantar</span><span class="en">' + n + ' entries not sent yet</span></h2>' +
      '<p><span class="bm" style="font-weight:400">Ia kekal di telefon ini dan akan dihantar bila anda masuk semula.</span><span class="en">They stay on this phone and are sent when you log in again.</span></p>' +
      '<div class="actions"><button class="btn btn-ok" type="button" id="lo-send">SEND<small>Hantar dulu</small></button>' +
      '<button class="btn btn-ghost" type="button" id="lo-out">LOG OUT<small>Keluar juga</small></button></div>',
      function (s) {
        s.querySelector('#lo-send').onclick = function () { closeSheet(); $('send-btn').click(); };
        s.querySelector('#lo-out').onclick = function () { closeSheet(); EA.logout(); render(); };
      });
  }
  EA.logoutAsk = logoutAsk;

  $('load-btn').onclick = EA.loadUpdate;
  async function checkUpdate() {
    var v = await EA.checkUpdate();
    $('notice-update').hidden = !v;
  }

  document.addEventListener('ea:sync', function () { if (EA.currentUser()) renderSync(); });
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  setInterval(function () { if (EA.currentUser()) { renderSync(); renderGreeting(); } }, 60000);
  setInterval(checkUpdate, 30 * 60000);

  // Ask the browser to keep this phone's records (the waiting list) even when space runs low.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
  // Keep a copy of the app on this phone, so it opens with no signal.
  document.addEventListener('ea:offline-ready', function () { $('offline-mark').hidden = false; });
  EA.startOffline('sw.js');

  EA.renderHome = render;
  render();
  checkUpdate();
})();
