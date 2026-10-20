// Foundation: Pengguna & PIN · Users & PIN (v1.9). The Owner only, with signal.
// Who may log in; add a user (the office makes a random PIN, shown here once, with copy and
// WhatsApp); a new PIN; change role or estates; switch off and on; switch off the test PINs.
// The office keeps only a scrambled PIN and writes one USERS_LOG line per change. Nothing is deleted.
window.EA = window.EA || {};
EA.roomViews = EA.roomViews || {};
(function () {
  var ROLES = ['Staff', 'Clerk', 'Manager', 'Mandor', 'Store', 'HQ', 'Owner', 'Worker'];
  var ALL = ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'];
  var EST_NAME = { SDK: 'Sandakan HQ', MELU: 'Melu', SSGT: 'Sugut', PTAN: 'Paitan', TKRS: 'Tekara', KWNN: 'Kawananan' };
  // v1.15: job titles as on the organisation chart, and the app access each one usually has.
  var POSITIONS = [['Trainee Field Staff', 'Staff'], ['Field Staff', 'Staff'], ['Senior Staff', 'Staff'], ['Estate Clerk', 'Clerk'],
    ['Assistant Manager', 'Manager'], ['Senior Assistant Manager', 'Manager'], ['Mandor', 'Mandor'], ['Storekeeper', 'Store'], ['AGM', 'HQ'], ['GM', 'Owner']];
  function posRole(p) { var x = POSITIONS.find(function (q) { return q[0] === p; }); return x ? x[1] : ''; }
  function posShort(p) { return p === 'Senior Assistant Manager' ? 'Sr Assistant Manager' : p; }
  var data = null, loading = false, failed = '', shown = null, form = null, el = null, ctx = null;

  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function roleName(r) { var n = EA.roleNames[r] || { bm: r, en: r }; return EA.t(n.bm, n.en); }
  function appLink() { return location.origin + location.pathname.replace(/index\.html$/, ''); }

  var ERR = {
    nolink: ['Skrin ini perlu pautan hantar dan isyarat.', 'This screen needs the sending link and signal.'],
    offline: ['Tiada isyarat. Cuba lagi bila ada isyarat.', 'No signal. Try again when there is signal.'],
    busy: ['Pejabat sibuk. Cuba lagi sebentar.', 'The office is busy. Try again in a moment.'],
    not_allowed: ['Hanya Pemilik boleh buka skrin ini.', 'Only the Owner can open this screen.'],
    test_user: ['PIN ujian tidak boleh urus pengguna lagi. Masuk dengan PIN anda sendiri.', 'A test PIN cannot manage users any more. Log in with your own PIN.'],
    first_owner_only: ['Buat PIN Pemilik anda sendiri dahulu.', 'Make your own Owner PIN first.'],
    bad_name: ['Tulis nama (2 hingga 40 huruf).', 'Write a name (2 to 40 letters).'],
    bad_estates: ['Pilih sekurang-kurangnya satu ladang.', 'Pick at least one estate.'],
    bad_role: ['Pilih tugas.', 'Pick a role.'],
    no_user: ['Pengguna ini tiada di pejabat.', 'This user is not in the office list.'],
    user_off: ['Akses pengguna ini ditutup. Buka semula dahulu.', 'This user is switched off. Switch them on first.'],
    not_self: ['Anda tidak boleh buat ini untuk diri sendiri.', 'You cannot do this to yourself.'],
    wrong_key: ['PIN anda tidak lagi dikenali. Keluar dan masuk semula.', 'Your PIN is no longer known. Log out and log in again.'],
    locked: ['Terlalu banyak PIN salah. Tunggu 15 minit.', 'Too many wrong PINs. Wait 15 minutes.'],
    bad_pin: ['PIN mesti 6 nombor.', 'The PIN must be 6 numbers.'],
    pick_another: ['PIN ini tidak boleh dipakai. Pilih PIN lain (jangan nombor mudah seperti 123456 atau 112233).', 'This PIN cannot be used. Pick another (not an easy one like 123456 or 112233).'],
    same_pin: ['Ini PIN anda sekarang. Pilih PIN baru.', 'That is your PIN now. Pick a new one.'],
    not_same: ['Dua PIN tidak sama. Taip semula.', 'The two PINs are not the same. Type them again.'],
    no_phone_code: ['Pejabat kehabisan kod telefon. Hubungi pembina.', 'The office has run out of phone codes. Call the builder.'],
    bad_position: ['Pilih jawatan dari senarai.', 'Pick a position from the list.'],
    bad_date: ['Pilih tarikh mula.', 'Pick the start date.'],
    same_name: ['Nama ini sama dengan sekarang.', 'That is the name already.'],
    same_estates: ['Ladang baru sama dengan sekarang.', 'The new estates are the same as now.']
  };
  function errText(e) { var m = ERR[e] || [EA.t('Pejabat menolak: ', 'Office refused: ') + e, EA.t('Pejabat menolak: ', 'Office refused: ') + e]; return EA.t(m[0], m[1]); }

  // The last list is kept on the Owner's phone, so the screen shows at once and refreshes behind (v1.9.1).
  var CACHE = 'ea.usersCache';
  function keepCache(j) {
    try { EA.local.set(CACHE, { code: ctx.user.code, at: Date.now(), users: j.users, me: j.me, firstOwner: !!j.firstOwner }); } catch (e) {}
  }
  function fromCache() {
    var c = EA.local.get(CACHE, null);
    return c && ctx && c.code === ctx.user.code ? { ok: true, users: c.users, me: c.me, firstOwner: c.firstOwner, at: c.at, cached: true } : null;
  }
  async function call(action, extra) {
    var j = await EA.askFull(action, extra);
    if (j && j.ok && j.users) { data = j; data.at = Date.now(); keepCache(j); }
    return j;
  }
  async function load() {
    loading = true; failed = '';
    if (!data) data = fromCache();
    draw();
    var j = await call('users');
    loading = false;
    if (!j.ok) { failed = j.error || 'busy'; if (failed === 'test_user' || failed === 'not_allowed') data = null; }
    draw();
  }

  // ---------- drawing ----------
  function top(title, back) {
    return '<div class="room-top"><button type="button" class="back-btn" id="us-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<div class="grow"><h1>' + title + '</h1><span class="brand-sub">' + EA.t('Pemilik sahaja · perlu isyarat', 'Owner only · needs signal') + '</span></div></div>';
  }
  function draw() {
    if (!el) return;
    if (shown) return drawPin();
    if (form && form.mode === 'move') return drawMove();
    if (form) return drawForm();
    var h = top(EA.t('Pengguna & PIN', 'Users & PIN'), '<span class="inline"><span class="bm">Bilik</span><span class="en">Rooms</span></span>');
    if (loading && !data) h += '<div class="card"><p class="hint">' + EA.t('Memuat dari pejabat…', 'Loading from the office…') + '</p></div>';
    else if (failed && !data) h += '<div class="card"><p class="msg">' + esc(errText(failed)) + '</p>' +
      '<div class="actions"><button class="btn btn-main" type="button" id="us-retry">TRY AGAIN<small>Cuba lagi</small></button></div></div>';
    else if (data) {
      if (loading) h += '<p class="hint us-fresh">' + EA.t('Memuat dari pejabat…', 'Loading from the office…') + '</p>';
      else if (failed) h += '<p class="warn">' + esc(errText(failed)) + ' ' + EA.t('Senarai di bawah dari ', 'The list below is from ') + esc(ui().hhmm(new Date(data.at || Date.now()))) + '.</p>';
      h += listHtml();
    }
    el.innerHTML = '<div class="us">' + h + '</div>';
    wireList();
  }

  function listHtml() {
    var me = data.me, users = data.users || [];
    var real = users.filter(function (u) { return !u.test; });
    var tests = users.filter(function (u) { return u.test; });
    var testsOn = tests.filter(function (u) { return u.status === 'active'; }).length;
    var h = '';
    if (data.firstOwner) {
      h += '<div class="card us-first"><h2>' + EA.t('Langkah pertama', 'First step') + '</h2>' +
        '<p>' + EA.t('Anda masuk dengan PIN ujian. Buat PIN Pemilik anda sendiri dahulu, kemudian keluar dan masuk dengan PIN baru itu. Selepas itu PIN ujian tidak boleh urus pengguna lagi.',
                    'You are logged in with a test PIN. Make your own Owner PIN first, then log out and log in with it. After that the test PINs cannot manage users.') + '</p>' +
        '<button class="btn btn-main" type="button" id="us-first">MAKE MY OWNER PIN<small>Buat PIN Pemilik saya</small></button></div>';
    } else {
      h += '<button class="btn us-add" type="button" id="us-add">+ ADD USER<small>+ Tambah pengguna</small></button>';
    }
    // Active real users, grouped: all estates first, then by first estate; then the switched-off ones.
    var groups = {}, order = [];
    real.filter(function (u) { return u.status === 'active'; }).forEach(function (u) {
      var g = u.estates.length === ALL.length ? 'ALL' : u.estates[0];
      if (!groups[g]) { groups[g] = []; }
      groups[g].push(u);
    });
    ['ALL'].concat(ALL).forEach(function (g) { if (groups[g]) order.push(g); });
    order.forEach(function (g) {
      h += '<div class="card"><h2>' + (g === 'ALL' ? EA.t('Semua ladang', 'All estates') : esc(EST_NAME[g] || g) + ' (' + g + ')') + '</h2>' +
        groups[g].map(function (u) { return rowHtml(u, me); }).join('') + '</div>';
    });
    if (!order.length && !data.firstOwner) h += '<div class="empty">' + EA.t('Belum ada pengguna sebenar. Tekan + Tambah pengguna.', 'No real users yet. Tap + Add user.') + '</div>';
    var off = real.filter(function (u) { return u.status !== 'active'; });
    if (off.length) h += '<div class="card"><h2>' + EA.t('Akses ditutup', 'Switched off') + '</h2>' + off.map(function (u) { return rowHtml(u, me); }).join('') + '</div>';
    if (tests.length) {
      h += '<div class="card"><h2>' + EA.t('PIN ujian', 'Test PINs') + '</h2>' +
        '<div class="hrow"><div><b>' + tests.length + ' ' + EA.t('PIN ujian', 'test PINs') + '</b><span class="s">111111 – 777777 · ' + EA.t('orang rekaan', 'made-up people') + '</span></div>' +
        '<span class="us-tag ' + (testsOn ? 'test' : 'off') + '">' + (testsOn ? EA.t('HIDUP', 'ON') : EA.t('DITUTUP', 'OFF')) + '</span></div>' +
        (testsOn && !data.firstOwner ? '<button class="btn btn-ghost us-bad" type="button" id="us-testoff">SWITCH OFF ALL TEST PINS<small>Tutup semua PIN ujian</small></button>' : '') + '</div>';
    }
    h += '<p class="hint">' + EA.t('Tekan nama untuk PIN baru, ubah atau tutup akses. Tiada yang dipadam.', 'Tap a name for a new PIN, a change, or to switch off. Nothing is deleted.') + '</p>';
    return h;
  }
  function rowHtml(u, me) {
    var on = u.status === 'active';
    return '<button type="button" class="hrow us-row" data-user="' + esc(u.code) + '"><div><b>' + esc(u.name) + (u.code === me ? ' · ' + EA.t('anda', 'you') : '') + '</b>' +
      '<span class="s">' + esc(u.position ? posShort(u.position) : roleName(u.role)) + ' · ' + esc(u.estates.length === ALL.length ? EA.t('semua ladang', 'all estates') : u.estates.join(', ')) +
      (u.move ? ' · ' + EA.t('pindah ke ', 'moving to ') + esc(u.move.estates.join(', ')) + ' ' + esc(shortDate(u.move.date)) : '') +
      (u.added ? ' · ' + EA.t('sejak ', 'since ') + esc(shortDate(u.added)) : '') + '</span>' + phonesHtml(u) + '</div>' +
      '<span class="us-tag ' + (on ? 'on' : 'off') + '">' + (on ? EA.t('AKTIF', 'ACTIVE') : EA.t('DITUTUP', 'OFF')) + '</span></button>';
  }
  // v1.14: the person's phone codes (one per device).
  function phonesHtml(u) {
    var p = u.phones || [];
    return '<span class="s us-phones">' + EA.t('Peranti: ', 'Devices: ') + (p.length ? p.map(function (x) { return '<i class="us-code">' + esc(x) + '</i>'; }).join('') : EA.t('belum ada', 'none yet')) + '</span>';
  }
  function shortDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
    if (!m) return s;
    return Number(m[3]) + ' ' + EA.t(ui().monBm, ui().monEn)[Number(m[2]) - 1] + ' ' + m[1];
  }

  function wireList() {
    var b = el.querySelector('#us-back'); if (b) b.onclick = function () { location.hash = ''; };
    var r = el.querySelector('#us-retry'); if (r) r.onclick = load;
    var a = el.querySelector('#us-add'); if (a) a.onclick = function () { form = { mode: 'add', name: '', role: 'Staff', estates: [ctx.estate] }; draw(); window.scrollTo(0, 0); };
    var f = el.querySelector('#us-first'); if (f) f.onclick = function () { form = { mode: 'add', name: ctx.user.name && !/ujian|test/i.test(ctx.user.name) ? ctx.user.name : '', role: 'Owner', estates: ALL.slice(), firstOwner: true }; draw(); };
    var t = el.querySelector('#us-testoff'); if (t) t.onclick = testOffSheet;
    el.querySelectorAll('[data-user]').forEach(function (x) { x.onclick = function () { personSheet(x.dataset.user); }; });
  }

  // ---------- add / change form ----------
  function drawForm() {
    var f = form, editing = f.mode === 'edit';
    var title = editing ? EA.t('Ubah ladang / jawatan', 'Change estates / position') : EA.t('Tambah pengguna', 'Add a user');
    var h = top(title, EA.t('Pengguna', 'Users'));
    h += '<div class="card">';
    if (editing) h += '<div><b>' + esc(f.name) + '</b><span class="hint"> · ' + esc(f.code) + '</span></div>';
    else h += '<div class="field"><label for="us-name">' + EA.t('Nama', 'Name') + '</label>' +
      '<input id="us-name" class="text-input" maxlength="40" autocomplete="off" value="' + esc(f.name) + '" placeholder="' + EA.t('Nama penuh atau nama panggilan', 'Full name or the name people use') + '"></div>';
    if (!f.firstOwner && !f.self) h += '<div class="field"><label>' + EA.t('Jawatan · Position', 'Position · Jawatan') + '</label><div class="us-pills" id="us-pos">' + POSITIONS.map(function (q) {
      return '<button type="button" data-pos="' + esc(q[0]) + '" aria-pressed="' + (f.position === q[0]) + '">' + esc(posShort(q[0])) + '</button>';
    }).join('') + '</div></div>';
    var roles = f.firstOwner ? ['Owner'] : (f.self ? ['Owner'] : ROLES);
    h += '<div class="field"><label>' + EA.t('Akses app · App access', 'App access · Akses app') + '</label><div class="us-pills" id="us-roles">' + roles.map(function (r) {
      return '<button type="button" data-role="' + r + '" aria-pressed="' + (f.role === r) + '">' + esc(roleName(r)) + '</button>';
    }).join('') + '</div>' + (f.firstOwner || f.self ? '' : '<p class="hint">' + EA.t('Diisi sendiri dari jawatan. Tukar hanya jika orang ini berbeza.', 'Filled in from the position. Change it only for an exception.') + '</p>') + '</div>';
    h += '<div class="field"><label>' + EA.t('Ladang', 'Estates') + '</label><div class="us-pills" id="us-ests">' + ALL.map(function (e) {
      return '<button type="button" data-est="' + e + '" aria-pressed="' + (f.estates.indexOf(e) >= 0) + '" title="' + esc(EST_NAME[e]) + '">' + e + '</button>';
    }).join('') + '<button type="button" data-est="*" class="us-all">' + EA.t('Semua', 'All') + '</button></div></div>';
    if (!editing) h += '<p class="note-sun">' + EA.t('Pejabat akan buat PIN 6 digit secara rawak. PIN ditunjuk sekali sahaja.', 'The office makes a random 6-digit PIN. It is shown once only.') + '</p>';
    h += '<p class="msg" id="us-err" hidden></p>';
    h += '<div class="actions"><button class="btn btn-ghost" type="button" id="us-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-main" type="button" id="us-go">' + (editing ? 'SAVE<small>Simpan</small>' : 'MAKE PIN<small>Buat PIN</small>') + '</button></div></div>';
    el.innerHTML = '<div class="us">' + h + '</div>';
    el.querySelector('#us-back').onclick = el.querySelector('#us-cancel').onclick = function () { form = null; draw(); };
    var nm = el.querySelector('#us-name'); if (nm) nm.oninput = function () { f.name = nm.value; };
    el.querySelectorAll('[data-role]').forEach(function (b) { b.onclick = function () { f.role = b.dataset.role; drawForm(); }; });
    el.querySelectorAll('[data-pos]').forEach(function (b) { b.onclick = function () {
      f.position = f.position === b.dataset.pos ? '' : b.dataset.pos;
      if (f.position && posRole(f.position) && !f.self) f.role = posRole(f.position);
      drawForm(); }; });
    el.querySelectorAll('[data-est]').forEach(function (b) {
      b.onclick = function () {
        if (f.firstOwner) return;
        var e = b.dataset.est;
        if (e === '*') f.estates = f.estates.length === ALL.length ? [] : ALL.slice();
        else if (f.estates.indexOf(e) >= 0) f.estates = f.estates.filter(function (x) { return x !== e; });
        else f.estates = f.estates.concat([e]);
        drawForm();
      };
    });
    el.querySelector('#us-go').onclick = editing ? saveEdit : makeUser;
  }
  function showErr(e) { var m = el.querySelector('#us-err'); if (m) { m.textContent = errText(e); m.hidden = false; } else ui().toast(errText(e), 'bad'); }
  function busy(btn, on) { if (btn) btn.disabled = on; }

  async function makeUser() {
    var f = form, btn = el.querySelector('#us-go');
    f.name = String(f.name || '').replace(/\s+/g, ' ').trim();
    if (f.name.length < 2) return showErr('bad_name');
    if (!f.estates.length) return showErr('bad_estates');
    busy(btn, true);
    var j = await call('userAdd', { name: f.name, role: f.role, estates: f.estates, position: f.position || '' });
    busy(btn, false);
    if (!j.ok) return showErr(j.error);
    form = null;
    shown = { pin: j.pin, name: j.name, code: j.code, role: f.role, estates: f.estates, first: !!f.firstOwner, phones: j.phone ? [j.phone] : [] };
    draw(); window.scrollTo(0, 0);
  }
  async function saveEdit() {
    var f = form, btn = el.querySelector('#us-go');
    if (!f.estates.length) return showErr('bad_estates');
    busy(btn, true);
    var j = await call('userSet', { code: f.code, role: f.role, estates: f.estates, position: f.position || '' });
    busy(btn, false);
    if (!j.ok) return showErr(j.error);
    form = null; draw(); ui().toast(EA.t('Disimpan', 'Saved'));
  }

  // ---------- the PIN, shown once ----------
  function pinMessage(s) {
    var ph = (s.phones || []).join(', ');
    return 'Salam ' + s.name + '.\nPIN E-Book anda: ' + s.pin + (ph ? '\nKod telefon: ' + ph + '\n(Tetapan telefon → Kod telefon)' : '') +
      '\nBuka: ' + appLink() + '\nJangan kongsi PIN ini dengan sesiapa.\n\n' +
      'Your E-Book PIN: ' + s.pin + '.' + (ph ? ' Phone code: ' + ph + '.' : '') + ' Do not share it.';
  }
  function deviceMessage(d) {
    return 'Salam ' + d.name + '.\nKod telefon E-Book untuk peranti baru: ' + d.phone + '\n(Tetapan telefon → Kod telefon. PIN tidak berubah.)\nBuka: ' + appLink() + '\n\n' +
      'E-Book phone code for the new device: ' + d.phone + '. Your PIN stays the same.';
  }
  function drawPin() {
    var s = shown, text = pinMessage(s);
    var h = '<div class="room-top"><div class="grow"><h1>' + EA.t('PIN baru', 'New PIN') + '</h1><span class="brand-sub">' + EA.t('Ditunjuk sekali sahaja', 'Shown once only') + '</span></div></div>';
    h += '<div class="card us-pincard"><div class="hint">' + EA.t('PIN untuk', 'PIN for') + '</div><div class="us-who">' + esc(s.name) + '</div>' +
      '<div class="hint">' + esc(roleName(s.role)) + ' · ' + esc(s.estates.length === ALL.length ? EA.t('semua ladang', 'all estates') : s.estates.join(', ')) + ' · ' + esc(s.code) + '</div>' +
      '<div class="us-big"><div><span>PIN</span><b class="us-pin" id="us-pin">' + esc(s.pin.slice(0, 3)) + ' ' + esc(s.pin.slice(3)) + '</b></div>' +
      ((s.phones || []).length ? '<div><span>' + EA.t('KOD TELEFON', 'PHONE CODE') + '</span><b class="us-pin" id="us-phone">' + esc(s.phones.join(' ')) + '</b></div>' : '') + '</div>' +
      '<p class="msg">' + EA.t('Hantar atau tulis PIN ini sekarang. Selepas TUTUP ia tidak boleh dilihat lagi.', 'Send or write this PIN now. After CLOSE it cannot be seen again.') + '</p></div>';
    if (s.self) h += '<p class="warn">' + EA.t('Ini PIN baru anda sendiri. Telefon ini sudah guna PIN baru. PIN lama tidak berfungsi lagi.', 'This is your own new PIN. This phone already uses it. The old PIN no longer works.') + '</p>';
    if (s.first) h += '<p class="warn">' + EA.t('Langkah seterusnya: tulis PIN ini, tekan SELESAI, KELUAR, dan masuk dengan PIN baru ini. Selepas itu anda boleh tukar ke PIN pilihan sendiri (tekan nama anda → Tukar PIN saya).', 'Next: write this PIN down, tap DONE, LOG OUT, and log in with it. After that you can change to a PIN of your own choice (tap your name → Change my PIN).') + '</p>';
    if (!s.self) h += '<div class="actions"><button class="btn btn-ghost" type="button" id="us-copy">COPY<small>Salin</small></button>' +
      '<button class="btn btn-ok us-wa" type="button" id="us-wa">SEND TO WHATSAPP<small>Hantar ke WhatsApp</small></button></div>' +
      '<div class="card us-wamsg"><div class="hint">' + EA.t('Mesej WhatsApp:', 'WhatsApp message:') + '</div><pre class="us-pre">' + esc(text) + '</pre></div>' +
      '<p class="note-sun">' + EA.t('Hantar kepada ' + s.name + ' sahaja (mesej peribadi). Jangan dalam kumpulan.', 'Send to ' + s.name + ' only (private message). Never to a group.') + '</p>';
    h += '<div class="actions"><button class="btn btn-main" type="button" id="us-done">DONE · CLOSE<small>Selesai · Tutup</small></button></div>';
    el.innerHTML = '<div class="us">' + h + '</div>';
    var c = el.querySelector('#us-copy'); if (c) c.onclick = function () { ui().copy(text); };
    var w = el.querySelector('#us-wa'); if (w) w.onclick = function () { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); };
    el.querySelector('#us-done').onclick = function () {
      ui().openSheet('<h2 id="sheet-title">' + EA.t('Sudah hantar atau tulis PIN?', 'Sent or written the PIN?') + '</h2>' +
        '<p>' + EA.t('Selepas ini PIN ' + s.name + ' tidak boleh dilihat lagi. Jika hilang, buat PIN baru.', 'After this, ' + s.name + '\'s PIN cannot be seen again. If it is lost, make a new PIN.') + '</p>' +
        '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="dn-back">‹ BACK<small>‹ BALIK</small></button>' +
        '<button class="btn btn-main" type="button" id="dn-ok">YES, CLOSE<small>Ya, tutup</small></button></div>',
        function (sh) {
          sh.querySelector('#dn-back').onclick = ui().closeSheet;
          sh.querySelector('#dn-ok').onclick = function () { ui().closeSheet(); shown = null; draw(); window.scrollTo(0, 0); };
        });
    };
  }

  // ---------- one user ----------
  function personSheet(code) {
    var u = (data.users || []).find(function (x) { return x.code === code; });
    if (!u) return;
    var self = u.code === data.me, on = u.status === 'active';
    var h = '<h2 id="sheet-title">' + esc(u.name) + '</h2>' +
      '<p class="hint">' + (u.position ? esc(u.position) + ' · ' : '') + esc(roleName(u.role)) + ' · ' + esc(u.estates.join(', ')) + ' · ' + EA.t('kod ', 'code ') + esc(u.code) + (u.added ? ' · ' + EA.t('ditambah ', 'added ') + esc(shortDate(u.added)) : '') + '</p>' + phonesHtml(u);
    if (on) {
      h += '<button class="btn btn-ghost" type="button" id="ps-pin">NEW PIN<small>PIN baru</small></button>' +
        '<p class="hint">' + (self ? EA.t('PIN lama anda berhenti serta-merta. Telefon ini terus guna PIN baru.', 'Your old PIN stops at once. This phone switches to the new one.') : EA.t('PIN lama berhenti serta-merta. Guna bila lupa PIN atau telefon bertukar.', 'The old PIN stops at once. Use it when the PIN is forgotten or the phone changes.')) + '</p>' +
        (self ? '<button class="btn btn-main" type="button" id="ps-mine">CHANGE MY PIN<small>Tukar PIN saya</small></button>' +
          '<p class="hint">' + EA.t('Taip PIN 6 digit pilihan anda sendiri.', 'Type a 6-digit PIN of your own choice.') + '</p>' : '') +
        '<button class="btn btn-main" type="button" id="ps-dev">+ DEVICE<small>+ Peranti</small></button>' +
        '<p class="hint">' + EA.t('Satu kod telefon lagi untuk orang yang sama (laptop, telefon kedua). PIN tidak berubah.', 'One more phone code for the same person (a laptop, a second phone). The PIN stays the same.') + '</p>' +
        '<button class="btn btn-ghost" type="button" id="ps-edit">CHANGE ESTATES / POSITION<small>Ubah ladang / jawatan</small></button>' +
        '<p class="hint">' + EA.t('Tambah atau buang ladang, naik pangkat.', 'Add or remove an area, a promotion.') + '</p>' +
        (self ? '' : '<button class="btn btn-main" type="button" id="ps-move">TRANSFER<small>Pindah</small></button>') +
        '<button class="btn btn-ghost" type="button" id="ps-name">CHANGE NAME<small>Tukar nama</small></button>';
      if (!self) h += '<button class="btn btn-ghost us-bad" type="button" id="ps-off">SWITCH OFF<small>Tutup akses</small></button>' +
        '<p class="hint">' + EA.t('Telefon hilang atau berhenti kerja. Rekod lama kekal. Boleh dibuka semula.', 'Lost phone or left the job. Old records stay. Can be switched on again.') + '</p>';
    } else {
      h += '<button class="btn btn-main" type="button" id="ps-on">SWITCH ON AGAIN<small>Buka semula</small></button>' +
        '<p class="hint">' + EA.t('PIN lama berfungsi semula. Jika telefon hilang, buat PIN baru selepas ini.', 'The old PIN works again. If the phone was lost, make a new PIN after this.') + '</p>';
    }
    if (u.move) h += '<p class="warn">' + EA.t('Pindah ke ' + u.move.estates.join(', ') + ' mula ' + shortDate(u.move.date) + '.', 'Moving to ' + u.move.estates.join(', ') + ' from ' + shortDate(u.move.date) + '.') + '</p>';
    h += '<div class="us-log" id="ps-log"><div class="hint">' + EA.t('Log pengguna…', 'Users log…') + '</div></div>';
    h += '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="ps-close">‹ BACK<small>‹ BALIK</small></button></div>';
    ui().openSheet(h, function (s) {
      showLog(u, s.querySelector('#ps-log'));
      s.querySelector('#ps-close').onclick = ui().closeSheet;
      var p = s.querySelector('#ps-pin'); if (p) p.onclick = function () { confirmPin(u, self); };
      var e = s.querySelector('#ps-edit'); if (e) e.onclick = function () { ui().closeSheet(); form = { mode: 'edit', code: u.code, name: u.name, role: u.role, estates: u.estates.slice(), self: self, position: u.position || '' }; draw(); window.scrollTo(0, 0); };
      var mv = s.querySelector('#ps-move'); if (mv) mv.onclick = function () { ui().closeSheet(); form = { mode: 'move', code: u.code, name: u.name, from: u.estates.slice(), estates: [], date: todayStr(), position: u.position || '', newPos: '' }; draw(); window.scrollTo(0, 0); };
      var nmb = s.querySelector('#ps-name'); if (nmb) nmb.onclick = function () { nameSheet(u); };
      var o = s.querySelector('#ps-off'); if (o) o.onclick = function () { confirmOff(u); };
      var mp = s.querySelector('#ps-mine'); if (mp) mp.onclick = function () { myPinSheet(u); };
      var dv = s.querySelector('#ps-dev'); if (dv) dv.onclick = function () { deviceNameSheet(u); };
      var n = s.querySelector('#ps-on'); if (n) n.onclick = function () { simple('userOn', { code: u.code }, EA.t('Akses dibuka semula', 'Switched on again')); };
    });
  }
  // ---------- v1.15: users log, transfer, name ----------
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var ACT = { add: ['Ditambah', 'Added'], change: ['Ubah', 'Changed'], move: ['Pindah', 'Transfer'], name: ['Nama', 'Name'], new_pin: ['PIN baru', 'New PIN'],
    own_pin_set: ['Tukar PIN sendiri', 'Own PIN changed'], off: ['Akses ditutup', 'Switched off'], on: ['Akses dibuka', 'Switched on'], device: ['+ Peranti', '+ Device'], device_kept: ['Kod telefon disimpan', 'Phone code kept'] };
  async function showLog(u, box) {
    if (!box) return;
    var j = await EA.askFull('userLog', { code: u.code });
    if (!box.isConnected) return;
    if (!j || !j.ok) { box.innerHTML = '<div class="hint">' + EA.t('Log tidak dapat dimuat (perlu isyarat).', 'The log could not load (needs signal).') + '</div>'; return; }
    box.innerHTML = '<div class="hint"><b>' + EA.t('Log pengguna', 'Users log') + '</b></div>' + (j.log.length ? j.log.map(function (l) {
      var a = ACT[l.action] ? EA.t(ACT[l.action][0], ACT[l.action][1]) : l.action;
      return '<div class="us-logline"><b>' + esc(l.at) + ' · ' + esc(l.by) + '</b><br>' + esc(a) + (l.detail ? ': ' + esc(l.detail) : '') + '</div>';
    }).join('') : '<div class="hint">' + EA.t('Belum ada.', 'Nothing yet.') + '</div>');
  }
  function drawMove() {
    var f = form;
    var h = top(EA.t('Pindah', 'Transfer'), EA.t('Pengguna', 'Users'));
    h += '<div class="card"><div><b>' + esc(f.name) + '</b>' + (f.position ? '<span class="hint"> · ' + esc(f.position) + '</span>' : '') + '</div>' +
      '<div class="field"><label>' + EA.t('Sekarang · Now', 'Now · Sekarang') + '</label><div class="us-pills">' + f.from.map(function (e) { return '<button type="button" aria-pressed="true" disabled>' + e + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label>' + EA.t('Ke ladang · To', 'To · Ke ladang') + '</label><div class="us-pills" id="mv-ests">' + ALL.map(function (e) {
        return '<button type="button" data-mest="' + e + '" aria-pressed="' + (f.estates.indexOf(e) >= 0) + '" title="' + esc(EST_NAME[e]) + '">' + e + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="mv-date">' + EA.t('Mula · Starts', 'Starts · Mula') + '</label><input id="mv-date" class="text-input" type="date" value="' + esc(f.date) + '"></div>' +
      '<div class="field"><label>' + EA.t('Jawatan baru? (pilihan)', 'New position? (optional)') + '</label><div class="us-pills" id="mv-pos">' +
        '<button type="button" data-mpos="" aria-pressed="' + (!f.newPos) + '">' + EA.t('Sama', 'Same') + '</button>' +
        POSITIONS.filter(function (q) { return q[0] !== f.position; }).map(function (q) { return '<button type="button" data-mpos="' + esc(q[0]) + '" aria-pressed="' + (f.newPos === q[0]) + '">' + esc(posShort(q[0])) + '</button>'; }).join('') + '</div></div>' +
      '<p class="note-sun">' + EA.t('PIN dan kod telefon kekal. Rekod lama kekal di ' + f.from.join(', ') + '.', 'PIN and phone code stay. Old records stay under ' + f.from.join(', ') + '.') + '</p>' +
      '<p class="msg" id="us-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="us-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-main" type="button" id="mv-go">SAVE TRANSFER<small>Simpan pindah</small></button></div></div>';
    el.innerHTML = '<div class="us">' + h + '</div>';
    el.querySelector('#us-back').onclick = el.querySelector('#us-cancel').onclick = function () { form = null; draw(); };
    el.querySelector('#mv-date').onchange = function () { f.date = this.value; };
    el.querySelectorAll('[data-mest]').forEach(function (b) { b.onclick = function () { var e = b.dataset.mest;
      f.estates = f.estates.indexOf(e) >= 0 ? f.estates.filter(function (x) { return x !== e; }) : f.estates.concat([e]); drawMove(); }; });
    el.querySelectorAll('[data-mpos]').forEach(function (b) { b.onclick = function () { f.newPos = b.dataset.mpos; drawMove(); }; });
    el.querySelector('#mv-go').onclick = async function () {
      if (!f.estates.length) return showErr('bad_estates');
      var sorted = ALL.filter(function (e) { return f.estates.indexOf(e) >= 0; });
      if (sorted.join() === ALL.filter(function (e) { return f.from.indexOf(e) >= 0; }).join()) return showErr('same_estates');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) return showErr('bad_date');
      this.disabled = true;
      var j = await call('userMove', { code: f.code, estates: sorted, date: f.date, position: f.newPos || '' });
      this.disabled = false;
      if (!j.ok) return showErr(j.error);
      form = null; draw(); ui().toast(EA.t('Pindah disimpan', 'Transfer saved'));
    };
  }
  function nameSheet(u) {
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Tukar nama', 'Change name') + '</h2>' +
      '<div class="field"><label>' + EA.t('Nama sekarang', 'Name now') + '</label><div class="hint">' + esc(u.name) + '</div></div>' +
      '<div class="field"><label for="nm-new">' + EA.t('Nama betul', 'Right name') + '</label><input id="nm-new" class="text-input" maxlength="40" autocomplete="off" value="' + esc(u.name) + '"></div>' +
      '<p class="hint">' + EA.t('Rekod lama tetap milik orang yang sama.', 'Old records still belong to the same person.') + '</p>' +
      '<p class="msg" id="nm-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="nm-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="nm-ok">SAVE NAME<small>Simpan nama</small></button></div>',
      function (s) {
        var inp = s.querySelector('#nm-new'), m = s.querySelector('#nm-err');
        s.querySelector('#nm-back').onclick = function () { personSheet(u.code); };
        s.querySelector('#nm-ok').onclick = async function () {
          var v = inp.value.replace(/\s+/g, ' ').trim();
          if (v.length < 2) { m.textContent = errText('bad_name'); m.hidden = false; return; }
          this.disabled = true;
          var j = await call('userName', { code: u.code, name: v });
          if (!j.ok) { this.disabled = false; m.textContent = errText(j.error); m.hidden = false; return; }
          ui().closeSheet(); draw(); ui().toast(EA.t('Nama disimpan', 'Name saved'));
        };
      });
  }

  // + PERANTI (v1.14): the office makes one more phone code for this person.
  // v1.16: + PERANTI asks a name for the device first (for example "Telefon syarikat Sugut").
  function deviceNameSheet(u) {
    ui().openSheet('<h2 id="sheet-title">+ ' + EA.t('Peranti untuk ', 'Device for ') + esc(u.name) + '</h2>' +
      '<div class="field"><label for="dv-label">' + EA.t('Nama peranti (pilihan)', 'Device name (optional)') + '</label><input id="dv-label" class="text-input" maxlength="40" autocomplete="off" placeholder="' + EA.t('cth Telefon syarikat Sugut', 'e.g. Sugut company phone') + '"></div>' +
      '<p class="hint">' + EA.t('Pejabat buat satu kod telefon baru. PIN tidak berubah.', 'The office makes one new phone code. The PIN stays the same.') + '</p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="dv-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="dv-make">MAKE CODE<small>Buat kod</small></button></div>',
      function (s) {
        s.querySelector('#dv-back').onclick = function () { personSheet(u.code); };
        var mk = s.querySelector('#dv-make');
        mk.onclick = function () { addDevice(u, mk, s.querySelector('#dv-label').value); };
      });
  }
  async function addDevice(u, btn, label) {
    btn.disabled = true;
    var j = await call('userDevice', { code: u.code, label: String(label || '').trim() });
    if (!j.ok) { btn.disabled = false; ui().toast(errText(j.error), 'bad'); return; }
    var d = { name: j.name || u.name, phone: j.phone }, text = deviceMessage(d);
    ui().openSheet('<h2 id="sheet-title">' + esc(d.name) + '</h2>' +
      '<div class="card us-pincard"><div class="hint">' + EA.t('Kod telefon baru', 'New phone code') + '</div><div class="us-pin" id="dv-code">' + esc(d.phone) + '</div>' +
      '<p class="hint">' + EA.t('Taip di Tetapan telefon pada peranti baru. PIN tidak berubah.', 'Type it in Phone setup on the new device. The PIN stays the same.') + '</p></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="dv-copy">COPY<small>Salin</small></button>' +
      '<button class="btn btn-ok" type="button" id="dv-wa">SEND TO WHATSAPP<small>Hantar ke WhatsApp</small></button></div>' +
      '<div class="actions"><button class="btn btn-main" type="button" id="dv-close">CLOSE<small>Tutup</small></button></div>',
      function (s) {
        s.querySelector('#dv-copy').onclick = function () { ui().copy(text); };
        s.querySelector('#dv-wa').onclick = function () { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); };
        s.querySelector('#dv-close').onclick = function () { ui().closeSheet(); draw(); };
      });
  }
  function confirmPin(u, self) {
    ui().openSheet('<h2 id="sheet-title">' + EA.t('PIN baru untuk ' + u.name + '?', 'New PIN for ' + u.name + '?') + '</h2>' +
      '<p>' + EA.t('PIN lama berhenti serta-merta.', 'The old PIN stops at once.') + '</p><p class="msg" id="cp-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="cp-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="cp-ok">MAKE NEW PIN<small>Buat PIN baru</small></button></div>',
      function (s) {
        s.querySelector('#cp-back').onclick = function () { personSheet(u.code); };
        s.querySelector('#cp-ok').onclick = async function () {
          this.disabled = true;
          var j = await call('userPin', { code: u.code });
          if (!j.ok) { this.disabled = false; var m = s.querySelector('#cp-err'); m.textContent = errText(j.error); m.hidden = false; return; }
          if (j.self) EA.setMyPin(j.pin);
          ui().closeSheet();
          shown = { pin: j.pin, name: j.name, code: j.code, role: u.role, estates: u.estates, self: !!j.self, phones: j.phones || u.phones || [] };
          draw(); window.scrollTo(0, 0);
        };
      });
  }
  // Tukar PIN saya: the Owner types his own PIN twice. The PIN is never shown or kept, except as
  // this phone's own login (EA.setMyPin).
  function myPinSheet(u) {
    var inp = function (id, label) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" class="key-input" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" placeholder="······"></div>';
    };
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Tukar PIN saya', 'Change my PIN') + '</h2>' +
      inp('mp-1', EA.t('PIN baru (6 nombor)', 'New PIN (6 numbers)')) + inp('mp-2', EA.t('Taip sekali lagi', 'Type it again')) +
      '<p class="hint">' + EA.t('Jangan nombor mudah seperti 123456, 111111 atau 112233. Telefon ini terus guna PIN baru.', 'Not an easy one like 123456, 111111 or 112233. This phone switches to the new PIN.') + '</p>' +
      '<p class="msg" id="mp-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="mp-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="mp-ok">SAVE PIN<small>Simpan PIN</small></button></div>',
      function (s) {
        var a = s.querySelector('#mp-1'), b = s.querySelector('#mp-2'), m = s.querySelector('#mp-err');
        [a, b].forEach(function (x) { x.oninput = function () { x.value = x.value.replace(/\D/g, '').slice(0, 6); m.hidden = true; }; });
        function err(e) { m.textContent = errText(e); m.hidden = false; }
        s.querySelector('#mp-back').onclick = function () { personSheet(u.code); };
        s.querySelector('#mp-ok').onclick = async function () {
          if (!/^\d{6}$/.test(a.value)) return err('bad_pin');
          if (a.value !== b.value) return err('not_same');
          this.disabled = true;
          var pin = a.value;
          var j = await call('userMyPin', { code: u.code, pin: pin });
          if (!j.ok) { this.disabled = false; return err(j.error); }
          EA.setMyPin(pin); a.value = b.value = '';
          ui().closeSheet(); draw(); ui().toast(EA.t('PIN anda sudah ditukar', 'Your PIN is changed'));
        };
      });
  }
  function confirmOff(u) {
    var why = '';
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Tutup akses ' + u.name + '?', 'Switch off ' + u.name + '?') + '</h2>' +
      '<p>' + EA.t('Dia tidak boleh masuk lagi. Rekodnya kekal.', 'They can no longer log in. Their records stay.') + '</p>' +
      '<div class="us-pills" id="off-why">' + [['telefon hilang', 'Telefon hilang', 'Lost phone'], ['berhenti kerja', 'Berhenti kerja', 'Left the job'], ['lain', 'Lain-lain', 'Other']].map(function (r) {
        return '<button type="button" data-why="' + r[0] + '" aria-pressed="false">' + EA.t(r[1], r[2]) + '</button>'; }).join('') + '</div>' +
      '<p class="msg" id="off-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="off-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main us-badfill" type="button" id="off-ok">SWITCH OFF<small>Tutup akses</small></button></div>',
      function (s) {
        s.querySelectorAll('[data-why]').forEach(function (b) { b.onclick = function () { why = b.dataset.why; s.querySelectorAll('[data-why]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; });
        s.querySelector('#off-back').onclick = function () { personSheet(u.code); };
        s.querySelector('#off-ok').onclick = async function () {
          this.disabled = true;
          var j = await call('userOff', { code: u.code, reason: why });
          if (!j.ok) { this.disabled = false; var m = s.querySelector('#off-err'); m.textContent = errText(j.error); m.hidden = false; return; }
          ui().closeSheet(); draw(); ui().toast(EA.t('Akses ditutup', 'Switched off'));
        };
      });
  }
  async function simple(action, extra, okText) {
    var j = await call(action, extra);
    ui().closeSheet();
    if (!j.ok) { ui().toast(errText(j.error), 'bad'); return; }
    draw(); ui().toast(okText);
  }
  function testOffSheet() {
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Tutup semua PIN ujian?', 'Switch off all test PINs?') + '</h2>' +
      '<p>' + EA.t('PIN 111111 hingga 777777 tidak boleh masuk lagi, di semua telefon. Pastikan Staf dan Kerani sudah ada PIN sendiri.', 'PINs 111111 to 777777 will no longer log in, on every phone. Make sure the staff and the clerk have their own PINs first.') + '</p>' +
      '<p class="msg" id="to-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="to-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main us-badfill" type="button" id="to-ok">SWITCH OFF<small>Tutup semua</small></button></div>',
      function (s) {
        s.querySelector('#to-back').onclick = ui().closeSheet;
        s.querySelector('#to-ok').onclick = async function () {
          this.disabled = true;
          var j = await call('testOff');
          if (!j.ok) { this.disabled = false; var m = s.querySelector('#to-err'); m.textContent = errText(j.error); m.hidden = false; return; }
          ui().closeSheet(); draw(); ui().toast(j.switchedOff + EA.t(' PIN ujian ditutup', ' test PINs switched off'));
        };
      });
  }

  EA.roomViews.users = {
    render: function (container, c) {
      var first = el !== container || !ctx || ctx.user.code !== c.user.code;
      el = container; ctx = c;
      if (first) { data = null; shown = null; form = null; }
      if (shown || form) { draw(); return; }
      if (!data && !loading) load(); else draw();
    }
  };
  // Leaving the screen forgets a PIN still on show, so it is never seen again.
  window.addEventListener('hashchange', function () { if (location.hash.replace('#', '').split('/')[0] !== 'users') { shown = null; form = null; data = null; } });
})();
