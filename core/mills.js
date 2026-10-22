// Foundation: Kilang & pusat kumpulan · Mills & collecting centres (v1.29). Agreed by Yu Chen 22 Oct 2026
// (Field & Harvest Brief, "Kilang & pusat kumpulan baru"; Related_Parties.md). Needs signal.
// - The list of mills lives in the office sheet (LIST_MILLS). Every phone keeps a copy (ea.mills.<estate>)
//   for the lorry and ticket screens, so they work with no signal.
// - The clerk asks for a new one on behalf of the Pengurus (name, mill or centre, where, why).
// - HQ (SDK) checks it: SEMAK OK or TOLAK with why.
// - The Account & Finance Executive approves: LULUS · BUKA (it joins the list) or TOLAK with why.
// - The Owner can do either step. Until it is open, the staff keys that lorry as "Lain-lain".
// Nothing is deleted: each step is a new line.
window.EA = window.EA || {};
EA.roomViews = EA.roomViews || {};
(function () {
  var el = null, ctx = null, data = null, loading = false, failed = '', form = null;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  var CACHE = 'ea.mills.';
  var ERR = {
    nolink: ['Skrin ini perlu pautan hantar dan isyarat.', 'This screen needs the sending link and signal.'],
    offline: ['Tiada isyarat. Cuba lagi bila ada isyarat.', 'No signal. Try again when there is signal.'],
    slow: ['Google lambat. Cuba lagi sebentar.', 'Google is slow. Try again in a moment.'],
    busy: ['Pejabat sibuk. Cuba lagi sebentar.', 'The office is busy. Try again in a moment.'],
    not_allowed: ['Anda tidak boleh buat ini.', 'You cannot do this.'],
    not_your_estate: ['Bukan ladang anda.', 'Not your estate.'],
    bad_name: ['Tulis nama kilang (2 hingga 50 huruf).', 'Write the mill\'s name (2 to 50 letters).'],
    bad_type: ['Pilih kilang atau pusat kumpulan.', 'Pick mill or collecting centre.'],
    need_reason: ['Tulis sebab (sekurang-kurangnya 3 huruf).', 'Write the reason (at least 3 letters).'],
    already_open: ['Kilang ini sudah ada dalam senarai.', 'This mill is already on the list.'],
    already: ['Permintaan ini sudah dihantar dan menunggu.', 'This request is already sent and waiting.'],
    nothing_waiting: ['Tiada yang menunggu.', 'Nothing is waiting.'],
    not_checked: ['HQ perlu SEMAK dahulu.', 'HQ must check it first.'],
    same_person: ['Orang yang SEMAK tidak boleh LULUS juga.', 'The person who checked cannot also approve.']
  };
  function errText(e) { var m = ERR[e] || ['Pejabat menolak: ' + e, 'Office refused: ' + e]; return EA.t(m[0], m[1]); }
  var TYPE = { mill: ['Kilang', 'Mill'], cc: ['Pusat kumpulan', 'Collecting centre'] };
  var STATE = { request: ['Menunggu SEMAK HQ', 'Waiting for HQ to check', 'w'], checked: ['Menunggu LULUS Kewangan', 'Waiting for Finance to approve', 'w'],
    approved: ['Dibuka', 'Open', 'ok'], rejected: ['Ditolak', 'Rejected', 'b'] };
  var STEP = { request: ['Diminta', 'Asked'], checked: ['Disemak', 'Checked'], approved: ['Lulus · dibuka', 'Approved · opened'], rejected: ['Ditolak', 'Rejected'] };
  function day(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    var d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T00:00:00');
    return d.getDate() + ' ' + EA.t(ui().monBm, ui().monEn)[d.getMonth()];
  }
  // The phone's copy of the list: names for the lorry and ticket screens; the rest for this screen.
  function keep(j, u) {
    if (!j || !j.ok || !j.mills) return;
    try { EA.local.set(CACHE + j.estate, { at: Date.now(), code: u.code, names: j.mills.map(function (m) { return m.name; }), data: j }); } catch (e) {}
  }
  function cached(est) { var c = EA.local.get(CACHE + est, null); return c && ctx && c.code === ctx.user.code ? c.data : null; }
  async function call(action, extra) {
    var j = await EA.askFull(action, Object.assign({ estate: ctx.estate }, extra || {}));
    if (j && j.ok && j.mills) { data = j; keep(j, ctx.user); }
    return j;
  }
  async function load() {
    loading = true; failed = '';
    if (!data) data = cached(ctx.estate);
    draw();
    var j = await call('mills');
    loading = false;
    if (!j.ok) failed = j.error || 'busy';
    draw();
  }
  function waitingFor(d) {
    var can = d.can || {}, n = 0;
    (d.requests || []).forEach(function (q) { if ((can.check && q.state === 'request') || (can.approve && q.state === 'checked')) n++; });
    return n;
  }
  // For the home tile: requests waiting for this person's step.
  EA.millsWaiting = function (u, est) {
    var c = EA.local.get(CACHE + est, null);
    if (!c || !u || c.code !== u.code || !c.data) return 0;
    return waitingFor(c.data);
  };
  // Every phone (the staff's too) fetches the list now and then, so a newly opened mill reaches the lorry screen.
  var peeking = false;
  EA.millsPeek = function (u, est) {
    if (peeking || !u || !/^(Staff|Clerk|Manager|HQ|Owner)$/.test(u.role) || !EA.sendLink() || !navigator.onLine) return;
    var c = EA.local.get(CACHE + est, null), every = /^(HQ|Owner)$/.test(u.role) ? 30 : 6 * 60;
    if (c && c.code === u.code && Date.now() - c.at < every * 60000) return;
    peeking = true;
    EA.askFull('mills', { estate: est }).then(function (j) {
      peeking = false;
      if (j && j.ok && j.mills) { keep(j, u); if (!location.hash && EA.renderHome) EA.renderHome(); }
    });
  };

  function top(title) {
    return '<div class="room-top"><button type="button" class="back-btn" id="ml-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<div class="grow"><h1>' + title + '</h1><span class="brand-sub">' + esc(ctx.estate) + ' · ' + EA.t('perlu isyarat', 'needs signal') + '</span></div></div>';
  }
  function reqCard(q, can) {
    var st = STATE[q.state] || [q.state, q.state, 'w'], t = TYPE[q.type] || ['', ''];
    var h = '<div class="wk-pend"><div><span class="wk-tag ' + st[2] + '">' + esc(EA.t(st[0], st[1])) + '</span> <b>' + esc(q.name) + '</b>' +
      '<span class="s">' + esc(EA.t(t[0], t[1])) + (q.location ? ' · ' + esc(q.location) : '') + '</span>' +
      '<span class="wk-why">' + EA.t('Sebab: ', 'Why: ') + esc(q.note) + '</span><span class="wk-trail">' +
      q.steps.map(function (s, i) { var n = STEP[s.kind] || [s.kind, s.kind]; return (i + 1) + '. ' + esc(EA.t(n[0], n[1])) + ' · ' + esc(s.by) + ' ' + esc(day(s.at)) + (i && s.note ? ' · ' + esc(s.note) : ''); }).join('<br>') + '</span></div>';
    if (q.state === 'request' && can.check) h += '<div class="actions"><button class="btn btn-ghost" type="button" data-no="check" data-ref="' + esc(q.ref) + '">REJECT<small>Tolak</small></button>' +
      '<button class="btn btn-main" type="button" data-ok="check" data-ref="' + esc(q.ref) + '">CHECKED OK<small>Semak OK</small></button></div>';
    else if (q.state === 'checked' && can.approve) h += '<div class="actions"><button class="btn btn-ghost" type="button" data-no="approve" data-ref="' + esc(q.ref) + '">REJECT<small>Tolak</small></button>' +
      '<button class="btn btn-main" type="button" data-ok="approve" data-ref="' + esc(q.ref) + '">APPROVE · OPEN<small>Lulus · Buka</small></button></div>';
    return h + '</div>';
  }
  function draw() {
    if (!el) return;
    if (form) return drawForm();
    var h = top(EA.t('Kilang & pusat kumpulan', 'Mills & collecting centres')), d = data;
    if (loading && !d) h += '<div class="card"><p class="hint">' + EA.t('Memuat dari pejabat…', 'Loading from the office…') + '</p></div>';
    else if (failed && !d) h += '<div class="card"><p class="msg">' + esc(errText(failed)) + '</p><div class="actions"><button class="btn btn-main" type="button" id="ml-retry">TRY AGAIN<small>Cuba lagi</small></button></div></div>';
    if (d) {
      if (failed) h += '<p class="warn">' + esc(errText(failed)) + '</p>';
      var can = d.can || {}, reqs = d.requests || [];
      if (can.ask) h += '<div class="actions"><button type="button" class="btn btn-main" id="ml-new">+ ASK FOR A NEW MILL<small>+ Minta kilang baru</small></button></div>';
      var open = reqs.filter(function (q) { return q.state === 'request' || q.state === 'checked'; }), done = reqs.filter(function (q) { return q.state === 'approved' || q.state === 'rejected'; });
      if (open.length) h += '<div class="card"><h2>' + EA.t('Permintaan menunggu', 'Requests waiting') + '</h2>' + open.map(function (q) { return reqCard(q, can); }).join('') + '</div>';
      h += '<div class="card"><h2>' + EA.t('Senarai kilang', 'Mill list') + '</h2>' + ((d.mills || []).length ? d.mills.map(function (m) {
        var t = TYPE[m.kind] || ['', ''];
        return '<div class="hrow"><div><b>' + esc(m.name) + '</b><span class="s">' + esc(EA.t(t[0], t[1])) + (m.location ? ' · ' + esc(m.location) : '') + '</span></div></div>';
      }).join('') : '<p class="hint">' + EA.t('Senarai di pejabat masih kosong. Telefon guna senarai lama.', 'The office list is still empty. Phones use the old list.') + '</p>') +
        '<p class="hint">' + EA.t('Kilang yang belum dibuka: Staf pilih "Lain-lain" pada lori.', 'A mill not yet open: the staff picks "Lain-lain" on the lorry.') + '</p></div>';
      if (done.length) h += '<div class="card"><h2>' + EA.t('Selesai, 2 bulan', 'Finished, last 2 months') + '</h2>' + done.map(function (q) { return reqCard(q, {}); }).join('') + '</div>';
      if (d.at) h += '<p class="hint">' + EA.t('Dari pejabat ', 'From the office ') + esc(String(d.at).slice(11)) + '.</p>';
    }
    el.innerHTML = '<div class="us wk ml">' + h + '</div>';
    el.querySelector('#ml-back').onclick = function () { location.hash = ''; };
    var r = el.querySelector('#ml-retry'); if (r) r.onclick = load;
    var n = el.querySelector('#ml-new'); if (n) n.onclick = function () { form = { type: 'mill' }; draw(); window.scrollTo(0, 0); };
    el.querySelectorAll('[data-ok]').forEach(function (b) { b.onclick = function () { answer(b.dataset.ok, b.dataset.ref, true, '', b); }; });
    el.querySelectorAll('[data-no]').forEach(function (b) { b.onclick = function () { rejectSheet(b.dataset.no, b.dataset.ref); }; });
  }
  function drawForm() {
    var f = form;
    var h = top(EA.t('Minta kilang baru', 'Ask for a new mill')) + '<div class="card">' +
      '<div class="field"><label for="ml-name">' + EA.t('Nama kilang / pusat', 'Name of the mill / centre') + ' *</label><input id="ml-name" class="text-input" maxlength="50" autocomplete="off" value="' + esc(f.name || '') + '"></div>' +
      '<div class="field"><label>' + EA.t('Jenis', 'Kind') + '</label><div class="us-pills">' + ['mill', 'cc'].map(function (k) {
        return '<button type="button" data-type="' + k + '" aria-pressed="' + (f.type === k) + '">' + esc(EA.t(TYPE[k][0], TYPE[k][1])) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="ml-loc">' + EA.t('Lokasi (pilihan)', 'Where (optional)') + '</label><input id="ml-loc" class="text-input" maxlength="80" value="' + esc(f.location || '') + '"></div>' +
      '<div class="field"><label for="ml-note">' + EA.t('Sebab (cth. harga lebih baik, kilang biasa penuh)', 'Why (e.g. better price, the usual mill is full)') + ' *</label><textarea id="ml-note" class="text-input" rows="2" maxlength="200">' + esc(f.note || '') + '</textarea></div>' +
      '<p class="note-sun">' + EA.t('Diminta bagi pihak Pengurus. HQ akan SEMAK, kemudian Kewangan LULUS · BUKA. Sementara itu Staf pilih "Lain-lain" pada lori.', 'Asked on behalf of the Pengurus. HQ checks, then Finance approves and opens it. Until then the staff picks "Lain-lain" on the lorry.') + '</p>' +
      '<p class="msg" id="ml-err" hidden></p><div class="actions"><button class="btn btn-ghost" type="button" id="ml-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-main" type="button" id="ml-go">SEND<small>Hantar</small></button></div></div>';
    el.innerHTML = '<div class="us wk ml">' + h + '</div>';
    el.querySelector('#ml-back').onclick = el.querySelector('#ml-cancel').onclick = function () { form = null; draw(); };
    function grab() { f.name = el.querySelector('#ml-name').value; f.location = el.querySelector('#ml-loc').value; f.note = el.querySelector('#ml-note').value.trim(); }
    el.querySelectorAll('[data-type]').forEach(function (b) { b.onclick = function () { grab(); f.type = b.dataset.type; drawForm(); }; });
    el.querySelector('#ml-go').onclick = async function () {
      grab();
      var err = el.querySelector('#ml-err'), btn = this;
      function show(e) { err.textContent = errText(e); err.hidden = false; }
      if (String(f.name || '').trim().length < 2) return show('bad_name');
      if (f.note.length < 3) return show('need_reason');
      btn.disabled = true;
      var j = await call('millAsk', { name: f.name, type: f.type, location: f.location || '', note: f.note });
      btn.disabled = false;
      if (!j.ok) return show(j.error);
      form = null; draw(); window.scrollTo(0, 0);
      ui().toast(EA.t('Dihantar · menunggu SEMAK HQ', 'Sent · waiting for HQ to check'));
    };
  }
  async function answer(step, ref, ok, note, btn) {
    if (btn) btn.disabled = true;
    var j = await call(step === 'check' ? 'millCheck' : 'millApprove', { ref: ref, ok: ok, note: note || '' });
    if (btn) btn.disabled = false;
    if (!j.ok) { ui().toast(errText(j.error), 'bad'); return j; }
    draw();
    ui().toast(!ok ? EA.t('Ditolak · kerani nampak sebabnya', 'Rejected · the clerk sees why') : step === 'check' ? EA.t('Disemak · menunggu Kewangan', 'Checked · waiting for Finance') : EA.t('Lulus · kilang dibuka', 'Approved · the mill is open'));
    return j;
  }
  function rejectSheet(step, ref) {
    var q = (data.requests || []).find(function (x) { return x.ref === ref; }) || { name: '' };
    ui().openSheet('<h2 id="sheet-title">REJECT<small>Tolak</small></h2><p><b>' + esc(q.name) + '</b></p>' +
      '<div class="field"><label for="mr-note">' + EA.t('Kenapa ditolak?', 'Why rejected?') + ' *</label><textarea id="mr-note" class="text-input" rows="2" maxlength="200"></textarea></div>' +
      '<p class="msg" id="mr-err" hidden></p><div class="actions"><button class="btn btn-ghost btn-back" type="button" id="mr-no">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="mr-ok">SAVE<small>Simpan</small></button></div>',
      function (s) {
        s.querySelector('#mr-no').onclick = ui().closeSheet;
        s.querySelector('#mr-ok').onclick = async function () {
          var n = s.querySelector('#mr-note').value.trim(), m = s.querySelector('#mr-err');
          if (n.length < 3) { m.textContent = errText('need_reason'); m.hidden = false; return; }
          this.disabled = true;
          var j = await call(step === 'check' ? 'millCheck' : 'millApprove', { ref: ref, ok: false, note: n });
          if (!j.ok) { this.disabled = false; m.textContent = errText(j.error); m.hidden = false; return; }
          ui().closeSheet(); draw(); ui().toast(EA.t('Ditolak · kerani nampak sebabnya', 'Rejected · the clerk sees why'));
        };
      });
  }

  EA.roomViews.mills = {
    render: function (container, c) {
      var first = el !== container || !ctx || ctx.user.code !== c.user.code || ctx.estate !== c.estate;
      el = container; ctx = c;
      if (first) { data = null; form = null; }
      if (form) { draw(); return; }
      if (!loading) load(); else draw();
    }
  };
  window.addEventListener('hashchange', function () { if (location.hash.replace('#', '').split('/')[0] !== 'mills') form = null; });
})();
