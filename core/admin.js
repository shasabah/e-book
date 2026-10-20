// Pentadbir · Admin (v1.16). The Owner's page: Ringkasan (summary per estate), Telefon (every device),
// Masalah (errors and refused saves), Suis (trial switches, in order). HQ sees Ringkasan only.
// It only reads what the office sheet already holds; the last answer is kept on the phone so the
// page shows at once and refreshes behind.
window.EA = window.EA || {};
EA.roomViews = EA.roomViews || {};
(function () {
  var el = null, ctx = null, busy = {}, err = {}, month = false;
  var PARTS = { summary: 'adminSummary', phones: 'adminPhones', problems: 'adminProblems', switches: 'adminSwitches' };
  var ICON = {
    summary: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    phones: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    problems: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    switches: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="17" cy="12" r="3"/>'
  };
  var ERR = {
    offline: ['Tiada isyarat. Ini maklumat terakhir di telefon.', 'No signal. This is the last information on the phone.'],
    nolink: ['Skrin ini perlu pautan hantar dan isyarat.', 'This screen needs the sending link and signal.'],
    busy: ['Pejabat sibuk. Cuba lagi sebentar.', 'The office is busy. Try again in a moment.'],
    not_allowed: ['Hanya Pemilik boleh buka bahagian ini.', 'Only the Owner can open this part.'],
    test_user: ['PIN ujian tidak boleh buka Pentadbir. Masuk dengan PIN anda sendiri.', 'A test PIN cannot open Admin. Log in with your own PIN.'],
    not_ready: ['Belum boleh: semua orang sebenar mesti masuk sekali dahulu.', 'Not yet: every real person must log in once first.'],
    order: ['Ikut turutan: 1 → 2 → 3.', 'Follow the order: 1 → 2 → 3.'],
    unknown_action: ['Skrip pejabat belum dikemas kini.', 'The office script is not updated yet.'],
    office_error: ['Pejabat ada masalah. Cuba lagi; jika berulang, beritahu Yu Chen.', 'The office had a problem. Try again; if it keeps happening, tell Yu Chen.']
  };
  function esc(s) { return EA.ui.esc(s); }
  function t(bm, en) { return EA.t(bm, en); }
  function errText(e) { var m = ERR[e] || ['Pejabat menolak: ' + e, 'Office refused: ' + e]; return t(m[0], m[1]); }
  function owner() { return ctx && ctx.user.role === 'Owner'; }
  function part() { var s = ctx.screen || 'summary'; return owner() && PARTS[s] ? s : 'summary'; }
  function cacheKey(p) { return 'ea.admin.' + p + '.' + ctx.user.code; }
  function cached(p) { return EA.local.get(cacheKey(p), null); }
  function hhmm(s) { return String(s || '').slice(11, 16); }
  function dshort(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? Number(m[3]) + ' ' + EA.t(EA.ui.monBm, EA.ui.monEn)[Number(m[2]) - 1] : String(s || '');
  }
  function when(s) { var td = EA.today(); return String(s || '').slice(0, 10) === td ? hhmm(s) : dshort(s) + ' ' + hhmm(s); }

  async function load(p, action, extra) {
    busy[p] = true; draw();
    var j = await EA.askFull(action || PARTS[p], extra || {});
    busy[p] = false;
    if (j && j.ok) { err[p] = ''; j.loadedAt = Date.now(); EA.local.set(cacheKey(p), j); }
    else err[p] = (j && j.error) || 'busy';
    draw();
    return j;
  }

  function bar(active) {
    if (!owner()) return '';
    var n = (cached('problems') || {}).fresh || 0;
    return '<nav class="tabs botbar" aria-label="' + t('Skrin', 'Screens') + '">' +
      [['summary', '', 'Ringkasan', 'Summary'], ['phones', '/phones', 'Telefon', 'Phones'], ['problems', '/problems', 'Masalah', 'Problems'], ['switches', '/switches', 'Suis', 'Switches']].map(function (it) {
        return '<a href="#admin' + it[1] + '"' + (active === it[0] ? ' aria-current="page"' : '') + ' data-tab="' + it[0] + '">' +
          (it[0] === 'problems' && n ? '<span class="adm-cnt">' + n + '</span>' : '') +
          '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[it[0]] + '</svg>' +
          '<span class="bm">' + it[2] + '</span><span class="en">' + it[3] + '</span></a>';
      }).join('') + '</nav>';
  }
  function top(p) {
    var names = { summary: t('Ringkasan', 'Summary'), phones: t('Telefon', 'Phones'), problems: t('Masalah', 'Problems'), switches: t('Suis percubaan', 'Trial switches') };
    var c = cached(p), line = names[p] + (busy[p] ? ' · ' + t('memuat…', 'loading…') : c && c.at ? ' · ' + t('dimuat ', 'loaded ') + hhmm(c.at) : '');
    return '<div class="room-top"><button type="button" class="back-btn" id="ad-back">← <span class="inline"><span class="bm">Bilik</span><span class="en">Rooms</span></span></button>' +
      '<div class="grow"><h1>' + t('Pentadbir', 'Admin') + '</h1><span class="brand-sub">' + esc(line) + '</span></div>' +
      '<button type="button" class="btn btn-ghost adm-reload" id="ad-reload"' + (busy[p] ? ' disabled' : '') + '>↻</button></div>';
  }
  function note(p) { return err[p] ? '<p class="warn">' + esc(errText(err[p])) + '</p>' : ''; }

  // ---------- Ringkasan ----------
  function kpi(cls, big, small) { return '<div class="adm-k ' + (cls || '') + '"><b>' + big + '</b><span>' + small + '</span></div>'; }
  function flag(c, html) { return '<div class="adm-flag"><i class="adm-dot ' + c + '"></i><div>' + html + '</div></div>'; }
  function summaryHtml() {
    var d = cached('summary');
    var h = '<div class="us-pills adm-pills"><button type="button" data-month="0" aria-pressed="' + !month + '">' + t('Hari ini', 'Today') + '</button>' +
      '<button type="button" data-month="1" aria-pressed="' + month + '">' + t('Bulan ini', 'This month') + '</button></div>';
    if (!d) return h + (busy.summary ? '<div class="card"><p class="hint">' + t('Memuat dari pejabat…', 'Loading from the office…') + '</p></div>' : '');
    (d.cards || []).forEach(function (c) {
      var est = (EA.lists.estates || []).find(function (x) { return x.code === c.estate; }), nm = est ? est.name : c.estate;
      if (!c.used) { h += '<div class="card adm-card"><h2>' + esc(nm) + ' (' + c.estate + ')<small>' + t('belum guna app', 'not using the app yet') + '</small></h2></div>'; return; }
      h += '<div class="card adm-card"><h2>' + esc(nm) + ' (' + c.estate + ')<small>' + (c.live ? t('Digunakan', 'In use') : t('Ujian', 'Test')) + ' · ' + esc(month ? c.month : dshort(c.today)) + '</small></h2><div class="adm-kpi">';
      if (!month) {
        h += kpi(c.chitAt ? (c.chitAt <= '07:30' ? 'ok' : 'warn') : 'bad', c.chitAt ? '✓ ' + esc(c.chitAt) : t('Belum', 'Not yet'), t('Chit pagi', 'Morning chit')) +
          kpi(c.workDone ? 'ok' : 'warn', c.workDone ? '✓' : t('Belum', 'Not yet'), t('Kerja harian', "Day's work")) +
          kpi('', c.total ? c.present + ' / ' + c.total : '–', t('Hadir', 'Present')) +
          kpi('', String(c.bunchesToday || 0), t('Tandan hari ini', 'Bunches today')) +
          kpi('', String(c.mtMonth || 0), t('MT bulan ini', 'MT this month')) +
          kpi('', c.abw ? String(c.abw) : '–', t('ABW kg', 'ABW kg'));
      } else {
        h += kpi('', String(c.mtMonth || 0), t('MT bulan ini', 'MT this month')) +
          kpi('', c.abw ? String(c.abw) : '–', t('ABW kg', 'ABW kg')) +
          kpi('', String(c.chitDays || 0), t('Hari ada chit', 'Days with a chit')) +
          kpi(c.late ? 'warn' : 'ok', String(c.late || 0), t('Chit lewat 9 pagi', 'Chit after 9 am')) +
          kpi(c.corrections ? 'warn' : 'ok', String(c.corrections || 0), t('Pembetulan', 'Corrections')) +
          kpi(c.alertsOpen ? 'bad' : 'ok', (c.alerts - c.alertsOpen) + ' / ' + c.alerts, t('Amaran dijawab', 'Alerts answered'));
      }
      h += '</div>';
      var nt = c.noTicket || [];
      if (nt.length) h += flag('r', '<b>' + nt.length + ' ' + t('lori', 'lorry') + '</b> ' + t('tiada tiket kilang', 'without a mill ticket') + ' (' + nt.slice(0, 3).map(function (x) { return 'DN ' + esc(x.dn || '?') + ', ' + esc(dshort(x.date)); }).join('; ') + ')');
      if (c.field || c.ramp) h += flag('a', '<b>' + t('Baki:', 'Left over:') + '</b> ' + t('ladang ', 'field ') + c.field + ' · ramp ' + c.ramp + ' ' + t('tandan', 'bunches'));
      if (c.below) h += flag('a', '<b>' + c.below + ' ' + t('kerja', 'jobs') + '</b> ' + t('tidak siap', 'not done') + ' (' + esc(dshort(c.belowDate)) + ')');
      if (c.alertsOpen) h += flag('r', '<b>' + c.alertsOpen + ' ' + t('amaran', 'alerts') + '</b> ' + t('belum dijawab', 'not answered'));
      if (!nt.length && !c.field && !c.ramp && !c.below && !c.alertsOpen) h += flag('g', t('Tiada perkara perlu tindakan.', 'Nothing needs action.'));
      else h += flag('g', t('Pembetulan ', 'Corrections ') + (c.corrections || 0) + ' · ' + t('lewat ', 'late ') + (c.late || 0) + ' ' + t('hari', 'days'));
      h += '</div>';
    });
    return h;
  }

  // ---------- Telefon ----------
  function phonesHtml() {
    var d = cached('phones');
    if (!d) return busy.phones ? '<div class="card"><p class="hint">' + t('Memuat dari pejabat…', 'Loading from the office…') + '</p></div>' : '';
    var now = Date.now(), h = '<div class="card"><h2>' + t('Peranti', 'Devices') + '<small>' + (d.phones || []).length + '</small></h2>';
    (d.phones || []).forEach(function (p) {
      var s = p.seen, cls = 'r2', txt = t('belum pernah masuk', 'never logged in');
      if (s && !s.other) {
        var age = now - new Date(String(s.at).replace(' ', 'T') + ':00+08:00').getTime();
        cls = age > 86400000 ? 'r2' : age > 6 * 3600000 ? 'a2' : 'g2';
        txt = when(s.at) + ' · ' + (s.w === '' ? '–' : s.w);
      } else if (s && s.other) { cls = 'a2'; txt = t('dipakai ', 'used by ') + s.other; }
      var old = s && s.v && Number(s.v) < EA.VERSION;
      h += '<button type="button" class="adm-dv" data-phone="' + esc(p.phone) + '"><div><b>' + esc(p.name) + '</b><span><i class="us-code">' + esc(p.phone) + '</i> ' +
        (p.label ? esc(p.label) : '<em>' + t('tiada nama peranti', 'no device name') + '</em>') + (s && s.v ? ' · v' + esc(s.v) : '') + (old ? ' <b class="adm-old">' + t('versi lama', 'old version') + '</b>' : '') + '</span></div>' +
        '<i class="adm-st ' + cls + '">' + esc(txt) + '</i></button>';
    });
    if (!(d.phones || []).length) h += '<p class="hint">' + t('Belum ada peranti.', 'No devices yet.') + '</p>';
    h += '</div><p class="hint">' + t('Masa = kali terakhir sampai ke pejabat · nombor = rekod menunggu di telefon itu. Merah: tiada lebih 1 hari, atau belum pernah masuk. Versi lama: minta tekan LOAD IT. Tekan satu peranti untuk beri nama.',
      'Time = last reached the office · number = records waiting on that phone. Red: nothing for over a day, or never logged in. Old version: ask them to tap LOAD IT. Tap a device to name it.') + '</p>';
    return h;
  }
  function nameDevice(p) {
    var d = (cached('phones') || {}).phones || [], x = d.find(function (q) { return q.phone === p; });
    if (!x) return;
    EA.ui.openSheet('<h2 id="sheet-title">' + esc(x.phone) + ' · ' + esc(x.name) + '</h2>' +
      '<div class="field"><label for="dn-label">' + t('Nama peranti', 'Device name') + '</label><input id="dn-label" class="text-input" maxlength="40" value="' + esc(x.label || '') + '" placeholder="' + t('cth Telefon syarikat Sugut', 'e.g. Sugut company phone') + '"></div>' +
      '<p class="msg" id="dn-err" hidden></p><div class="actions"><button class="btn btn-ghost" type="button" id="dn-back">BACK<small>Kembali</small></button>' +
      '<button class="btn btn-main" type="button" id="dn-save">SAVE<small>Simpan</small></button></div>', function (s) {
        s.querySelector('#dn-back').onclick = EA.ui.closeSheet;
        s.querySelector('#dn-save').onclick = async function () {
          this.disabled = true;
          var j = await load('phones', 'adminPhoneName', { device: x.phone, label: s.querySelector('#dn-label').value });
          if (!j || !j.ok) { this.disabled = false; var m = s.querySelector('#dn-err'); m.textContent = errText((j && j.error) || 'busy'); m.hidden = false; return; }
          EA.ui.closeSheet(); EA.ui.toast(t('Disimpan', 'Saved'));
        };
      });
  }

  // ---------- Masalah ----------
  var showAll = false;
  function problemsHtml() {
    var d = cached('problems');
    if (!d) return busy.problems ? '<div class="card"><p class="hint">' + t('Memuat dari pejabat…', 'Loading from the office…') + '</p></div>' : '';
    var list = (d.problems || []).filter(function (x) { return showAll || !x.seen; });
    var h = '<div class="us-pills adm-pills"><button type="button" data-all="0" aria-pressed="' + !showAll + '">' + t('Baru', 'New') + ' (' + (d.fresh || 0) + ')</button>' +
      '<button type="button" data-all="1" aria-pressed="' + showAll + '">' + t('Semua', 'All') + '</button></div><div class="card">';
    if (!list.length) h += '<p class="hint">' + t('Tiada masalah baru.', 'No new problems.') + '</p>';
    list.forEach(function (x) {
      var head = x.kind === 'refused' ? t('Ditolak pejabat: ', 'Refused by the office: ') + esc(x.message) : t('Ralat di telefon: ', 'Error on a phone: ') + esc(x.where);
      h += '<div class="adm-pb' + (x.seen ? ' seen' : '') + '"><b>' + head + '</b>' + (x.kind === 'refused' ? esc(x.where) : esc(x.message)) +
        '<span>' + esc(x.who) + ' · ' + esc(x.phone) + ' · ' + esc(when(x.at)) + (x.version ? ' · v' + esc(x.version) : '') + (x.seen ? ' · ' + t('sudah tengok', 'seen') : '') + '</span></div>';
    });
    h += '</div>';
    if (d.fresh) h += '<div class="actions"><button class="btn btn-main" type="button" id="pb-seen">ALL SEEN<small>Sudah tengok semua</small></button></div>';
    h += '<p class="hint">' + t('Yang sudah tengok kekal dalam Semua. Tiada yang dipadam.', 'Seen ones stay under All. Nothing is deleted.') + '</p>';
    return h;
  }

  // ---------- Suis ----------
  function toggle(id, on, ok) { return '<button type="button" class="adm-tg' + (on ? ' on' : '') + '" id="' + id + '"' + (ok ? '' : ' disabled') + ' aria-pressed="' + on + '"></button>'; }
  function switchesHtml() {
    var d = cached('switches');
    if (!d) return busy.switches ? '<div class="card"><p class="hint">' + t('Memuat dari pejabat…', 'Loading from the office…') + '</p></div>' : '';
    var ppl = d.people || [], allIn = ppl.length && ppl.every(function (p) { return p.loggedIn; });
    var pinsOff = !d.testPinsOn, modeOff = !!d.testModeOff, live = (d.live || {})['field-harvest'] || [];
    var h = '<div class="card"><div class="adm-sw"><div><b>1 · ' + t('Tutup PIN ujian', 'Switch off test PINs') + '</b><span>' + t('111111–888888 berhenti di semua telefon', '111111–888888 stop on every phone') + '</span></div>' + toggle('sw-pins', pinsOff, pinsOff || allIn) + '</div>' +
      '<div class="adm-chk">' + (ppl.length ? ppl.map(function (p) { return '<div><i class="' + (p.loggedIn ? 'yes">✓' : 'no">✗') + '</i> ' + esc(p.name) + ' · ' + (p.loggedIn ? t('sudah masuk', 'has logged in') : t('belum pernah masuk', 'never logged in')) + '</div>'; }).join('') :
        '<div><i class="no">✗</i> ' + t('Belum ada Staf, Kerani atau Pengurus sebenar.', 'No real Staff, Clerk or Manager yet.') + '</div>') + '</div></div>';
    h += '<div class="card"><div class="adm-sw"><div><b>2 · ' + t('Mod ujian OFF', 'Test mode OFF') + '</b><span>' + t('Tiada lagi tanda UJIAN dan PIN contoh', 'No more TEST marks or sample PINs') + '</span></div>' + toggle('sw-mode', modeOff, modeOff || pinsOff) + '</div>';
    ctx.user.estates.forEach(function (e) {
      var on = live.indexOf(e) >= 0;
      h += '<div class="adm-sw"><div><b>3 · ' + t('Buka Kerja Ladang: ', 'Open Field & Harvest: ') + e + '</b><span>' + t('Bilik jadi "Digunakan" untuk ', 'The room becomes "In use" for ') + e + '</span></div>' + toggle('sw-live-' + e, on, on || modeOff) + '</div>';
    });
    h += '<p class="hint">' + t('Ikut turutan 1 → 2 → 3. Suis yang kelabu menunggu langkah sebelumnya. Setiap suis = satu baris dalam log.', 'Follow the order 1 → 2 → 3. A grey switch waits for the step before. Each switch is one line in the log.') + '</p></div>';
    h += '<div class="card"><h2>' + t('Log suis', 'Switch log') + '</h2>' + ((d.log || []).length ? d.log.map(function (l) { return '<div class="us-logline"><b>' + esc(l.at) + ' · ' + esc(l.by) + '</b><br>' + esc(l.detail) + '</div>'; }).join('') : '<p class="hint">' + t('Belum ada.', 'Nothing yet.') + '</p>') + '</div>';
    return h;
  }
  function confirmSwitch(which, on, estate, title, body) {
    EA.ui.openSheet('<h2 id="sheet-title">' + esc(title) + '</h2><p>' + esc(body) + '</p><p class="msg" id="cs-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="cs-back">BACK<small>Kembali</small></button>' +
      '<button class="btn btn-main" type="button" id="cs-ok">YES<small>Ya</small></button></div>', function (s) {
        s.querySelector('#cs-back').onclick = EA.ui.closeSheet;
        s.querySelector('#cs-ok').onclick = async function () {
          this.disabled = true;
          var j = await load('switches', 'adminSwitch', { which: which, on: on, estate: estate || '', room: 'field-harvest' });
          if (!j || !j.ok) { this.disabled = false; var m = s.querySelector('#cs-err'); m.textContent = errText((j && j.error) || 'busy'); m.hidden = false; return; }
          EA.ask('switches'); EA.ui.closeSheet(); EA.ui.toast(t('Suis disimpan', 'Switch saved'));
        };
      });
  }

  // ---------- drawing ----------
  function draw() {
    if (!el || location.hash.replace('#', '').split('/')[0] !== 'admin') return;
    var p = part();
    var body = p === 'phones' ? phonesHtml() : p === 'problems' ? problemsHtml() : p === 'switches' ? switchesHtml() : summaryHtml();
    el.innerHTML = '<div class="us adm">' + top(p) + note(p) + body + bar(p) + '</div>';
    el.querySelector('#ad-back').onclick = function () { location.hash = ''; };
    el.querySelector('#ad-reload').onclick = function () { load(p); };
    el.querySelectorAll('[data-month]').forEach(function (b) { b.onclick = function () { month = b.dataset.month === '1'; draw(); }; });
    el.querySelectorAll('[data-all]').forEach(function (b) { b.onclick = function () { showAll = b.dataset.all === '1'; draw(); }; });
    el.querySelectorAll('[data-phone]').forEach(function (b) { b.onclick = function () { nameDevice(b.dataset.phone); }; });
    var ps = el.querySelector('#pb-seen');
    if (ps) ps.onclick = function () { var d = cached('problems') || {}; load('problems', 'adminSeen', { ids: (d.problems || []).filter(function (x) { return !x.seen; }).map(function (x) { return x.id; }) }); };
    var d = cached('switches') || {};
    var pins = el.querySelector('#sw-pins');
    if (pins) pins.onclick = function () { var off = !!d.testPinsOn;
      confirmSwitch('testPins', !off, '', off ? t('Tutup semua PIN ujian?', 'Switch off all test PINs?') : t('Buka semula PIN ujian?', 'Switch test PINs on again?'),
        off ? t('PIN 111111 hingga 888888 tidak boleh masuk lagi di mana-mana telefon.', 'PINs 111111 to 888888 will no longer log in on any phone.') : t('PIN ujian boleh masuk semula.', 'The test PINs can log in again.')); };
    var mode = el.querySelector('#sw-mode');
    if (mode) mode.onclick = function () { var off = !d.testModeOff;
      confirmSwitch('testMode', !off, '', off ? t('Mod ujian OFF?', 'Test mode OFF?') : t('Mod ujian ON semula?', 'Test mode ON again?'),
        off ? t('Tanda UJIAN dan senarai PIN contoh hilang dari semua telefon dalam 30 minit.', 'TEST marks and the sample PIN list go from every phone within 30 minutes.') : t('Semua bilik kembali ke mod ujian.', 'Every room goes back to test mode.')); };
    ctx.user.estates.forEach(function (e) {
      var b = el.querySelector('#sw-live-' + e);
      if (b) b.onclick = function () { var on = ((d.live || {})['field-harvest'] || []).indexOf(e) < 0;
        confirmSwitch('live', on, e, on ? t('Buka Kerja Ladang untuk ' + e + '?', 'Open Field & Harvest for ' + e + '?') : t('Tutup Kerja Ladang untuk ' + e + '?', 'Close Field & Harvest for ' + e + '?'),
          on ? t('Bilik jadi "Digunakan" untuk ' + e + ' di semua telefon dalam 30 minit.', 'The room becomes "In use" for ' + e + ' on every phone within 30 minutes.') : t('Bilik kembali ke ujian untuk ' + e + '.', 'The room goes back to test for ' + e + '.')); };
    });
  }

  EA.roomViews.admin = {
    render: function (container, c) {
      el = container; ctx = c;
      var p = part();
      draw();
      var have = cached(p);
      if (!busy[p] && (!have || Date.now() - (have.loadedAt || 0) > 60000)) load(p);
      if (owner() && p !== 'problems' && !busy.problems && !cached('problems')) load('problems');
    }
  };
})();
