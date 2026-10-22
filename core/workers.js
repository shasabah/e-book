// Foundation: Pekerja masuk & keluar · Worker changes (v1.25, approvals v1.28). Approved by Yu Chen 21–22 Oct 2026
// (Field & Harvest Brief, "Pekerja masuk & keluar"; Related_Parties.md). Needs signal, like Pengguna & PIN.
// - The clerk keys: + BARU (new hire), BERHENTI (resigned, last working day), LARI (absconded, last day seen),
//   each with a reason (LARI: the staff's explanation).
// - The staff only raises "Mungkin lari?" from the muster (rooms/field/muster.js); it shows here.
// - The Pengurus answers every change: LULUS, or TOLAK with why (BUKAN LARI for absconded).
// - After LULUS, HQ (SDK) sees the whole trail and presses SELESAI. Owner can do every step.
// Only name, job, gang, sex, worker code and dates (Rule 8). Nothing is deleted.
window.EA = window.EA || {};
EA.roomViews = EA.roomViews || {};
(function () {
  var el = null, ctx = null, data = null, loading = false, failed = '', form = null;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  var CACHE = 'ea.workers.';
  var ERR = {
    nolink: ['Skrin ini perlu pautan hantar dan isyarat.', 'This screen needs the sending link and signal.'],
    offline: ['Tiada isyarat. Cuba lagi bila ada isyarat.', 'No signal. Try again when there is signal.'],
    slow: ['Google lambat. Cuba lagi sebentar.', 'Google is slow. Try again in a moment.'],
    busy: ['Pejabat sibuk. Cuba lagi sebentar.', 'The office is busy. Try again in a moment.'],
    not_allowed: ['Anda tidak boleh buat ini.', 'You cannot do this.'],
    not_your_estate: ['Bukan ladang anda.', 'Not your estate.'],
    bad_name: ['Tulis nama (2 hingga 60 huruf).', 'Write a name (2 to 60 letters).'],
    bad_sex: ['Pilih L atau P.', 'Pick M or F.'],
    bad_gang: ['Pilih kerja / gang.', 'Pick the job / gang.'],
    bad_date: ['Pilih tarikh yang betul.', 'Pick the right date.'],
    bad_code: ['Kod pekerja hanya huruf dan nombor.', 'The worker code is letters and numbers only.'],
    code_used: ['Kod pekerja ini sudah ada. Semak semula.', 'This worker code is already used. Check it.'],
    no_worker: ['Pekerja ini tiada dalam senarai.', 'This worker is not on the list.'],
    pick_worker: ['Pilih pekerja.', 'Pick the worker.'],
    already: ['Sudah dikunci dan menunggu lulus.', 'Already keyed and waiting for approval.'],
    nothing_waiting: ['Tiada yang menunggu lulus.', 'Nothing is waiting for approval.'],
    nothing_to_undo: ['Tiada perubahan untuk dibatalkan.', 'No change to undo.'],
    need_reason: ['Tulis sebab (sekurang-kurangnya 3 huruf).', 'Write the reason (at least 3 letters).']
  };
  function errText(e) { var m = ERR[e] || ['Pejabat menolak: ' + e, 'Office refused: ' + e]; return EA.t(m[0], m[1]); }
  var KIND = { new: ['Baru · menunggu lulus', 'New · waiting', 'w'], resigned: ['Berhenti · menunggu lulus', 'Resigned · waiting', 'w'], absconded: ['Lari · menunggu lulus', 'Absconded · waiting', 'b'],
    back: ['Kembali bekerja', 'Back at work', 'ok'], hq_done: ['SDK selesai', 'SDK done', 'ok'],
    refused: ['Baru · ditolak', 'New · rejected', 'b'], gone: ['Lari · diluluskan', 'Absconded · approved', 'b'] };
  var WHAT = { new: ['Baru', 'New'], resigned: ['Berhenti', 'Resigned'], absconded: ['Lari', 'Absconded'] };
  // A label for a change line: approved / rejected say what they answered.
  function label(c) {
    var w = WHAT[c.of || 'absconded'] || WHAT.absconded;
    if (c.kind === 'approved') return [w[0] + ' · diluluskan', w[1] + ' · approved', c.of === 'new' ? 'ok' : 'b'];
    if (c.kind === 'rejected' || c.kind === 'not_absconded') return c.of === 'absconded' || c.kind === 'not_absconded' ? ['Bukan lari', 'Not absconded', 'ok'] : [w[0] + ' · ditolak', w[1] + ' · rejected', 'w'];
    return KIND[c.kind] || [c.kind, c.kind, 'w'];
  }
  function stateLabel(p) {
    if (p.pending) return KIND[p.state] || [p.state, p.state];
    if (p.state === 'resigned') return ['Berhenti · diluluskan', 'Resigned · approved'];
    return KIND[p.state] || [p.state, p.state];
  }
  function day(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    var d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T00:00:00');
    return EA.t(ui().dayBm, ui().dayEn)[d.getDay()] + ' ' + d.getDate() + ' ' + EA.t(ui().monBm, ui().monEn)[d.getMonth()];
  }
  function keep(j) { try { EA.local.set(CACHE + j.estate, { at: Date.now(), code: ctx.user.code, data: j }); } catch (e) {} }
  function cached(est) { var c = EA.local.get(CACHE + est, null); return c && ctx && c.code === ctx.user.code ? c.data : null; }
  async function call(action, extra) {
    var j = await EA.askFull(action, Object.assign({ estate: ctx.estate }, extra || {}));
    if (j && j.ok && j.people) { data = j; keep(j); }
    return j;
  }
  async function load() {
    loading = true; failed = '';
    if (!data) data = cached(ctx.estate);
    draw();
    var j = await call('workers');
    loading = false;
    if (!j.ok) failed = j.error || 'busy';
    draw();
  }
  // For the home tile: how many wait for this person (approvals for the Pengurus, flags for the clerk).
  EA.workersWaiting = function (u, est) {
    var c = EA.local.get(CACHE + est, null);
    if (!c || !u || c.code !== u.code || !c.data) return 0;
    if (u.role === 'Manager') return (c.data.pending || []).length;
    if (u.role === 'Clerk') return (c.data.flags || []).length;
    if (u.role === 'HQ') return (c.data.hq || []).length;
    if (u.role === 'Owner') return (c.data.pending || []).length + (c.data.hq || []).length;
    return 0;
  };
  var peeking = false;
  EA.workersPeek = function (u, est) {
    if (peeking || !u || !/^(Clerk|Manager|HQ|Owner)$/.test(u.role) || !EA.sendLink() || !navigator.onLine) return;
    var c = EA.local.get(CACHE + est, null);
    if (c && c.code === u.code && Date.now() - c.at < 30 * 60000) return;
    peeking = true;
    EA.askFull('workers', { estate: est }).then(function (j) {
      peeking = false;
      if (j && j.ok && j.people) { EA.local.set(CACHE + est, { at: Date.now(), code: u.code, data: j }); if (!location.hash && EA.renderHome) EA.renderHome(); }
    });
  };

  function top(title) {
    return '<div class="room-top"><button type="button" class="back-btn" id="wk-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<div class="grow"><h1>' + title + '</h1><span class="brand-sub">' + esc(ctx.estate) + ' · ' + EA.t('perlu isyarat', 'needs signal') + '</span></div></div>';
  }
  function draw() {
    if (!el) return;
    if (form) return drawForm();
    var h = top(EA.t('Pekerja masuk & keluar', 'Worker changes'));
    var d = data;
    if (loading && !d) h += '<div class="card"><p class="hint">' + EA.t('Memuat dari pejabat…', 'Loading from the office…') + '</p></div>';
    else if (failed && !d) h += '<div class="card"><p class="msg">' + esc(errText(failed)) + '</p><div class="actions"><button class="btn btn-main" type="button" id="wk-retry">TRY AGAIN<small>Cuba lagi</small></button></div></div>';
    if (d) {
      if (failed) h += '<p class="warn">' + esc(errText(failed)) + '</p>';
      var can = d.can || {};
      if (can.key) h += '<div class="wk-three"><button type="button" class="wk-big g" data-go="new">+ NEW<small>+ Baru</small></button>' +
        '<button type="button" class="wk-big a" data-go="resigned">RESIGNED<small>Berhenti</small></button>' +
        '<button type="button" class="wk-big r" data-go="absconded">ABSCONDED<small>Lari</small></button></div>';
      if ((d.pending || []).length) h += '<div class="card"><h2>' + EA.t('Perlu lulus Pengurus', 'For the manager to approve') + '</h2>' + d.pending.map(function (p) {
        var w = WHAT[p.kind] || WHAT.absconded;
        var dl = p.kind === 'new' ? EA.t('mula ', 'starts ') : p.kind === 'resigned' ? EA.t('hari akhir ', 'last day ') : EA.t('terakhir dilihat ', 'last seen ');
        return '<div class="wk-pend"><div><span class="wk-tag ' + (p.kind === 'absconded' ? 'b' : 'w') + '">' + esc(EA.t(w[0], w[1])) + '</span> <b>' + esc(p.name) + '</b>' +
          '<span class="s">' + esc(p.worker) + ' · ' + dl + esc(day(p.day)) + ' · ' + EA.t('dikunci ', 'keyed ') + esc(p.by) + ' ' + esc(day(p.at)) + '</span>' +
          (p.note ? '<span class="wk-why">' + (p.kind === 'absconded' ? EA.t('Penjelasan Staf: ', 'Staff\'s explanation: ') : EA.t('Sebab: ', 'Reason: ')) + esc(p.note) + '</span>' : '') + '</div>' +
          (can.approve ? '<div class="actions"><button class="btn btn-ghost" type="button" data-ans="0" data-k="' + esc(p.kind) + '" data-w="' + esc(p.worker) + '">' +
            (p.kind === 'absconded' ? 'NOT ABSCONDED<small>Bukan lari</small>' : 'REJECT<small>Tolak</small>') + '</button>' +
            '<button class="btn btn-main' + (p.kind === 'absconded' ? ' wk-red' : '') + '" type="button" data-ans="1" data-k="' + esc(p.kind) + '" data-w="' + esc(p.worker) + '">APPROVE<small>Lulus</small></button></div>'
            : '<span class="tag-wait">' + EA.t('Menunggu Pengurus', 'Waiting for the manager') + '</span>') + '</div>';
      }).join('') + '</div>';
      if ((d.hq || []).length) h += '<div class="card"><h2>' + EA.t('Perlu tindakan SDK', 'For SDK to act on') + '</h2>' + d.hq.map(function (q) {
        var w = WHAT[q.kind] || WHAT.absconded;
        var dl = q.kind === 'new' ? EA.t('mula ', 'starts ') : q.kind === 'resigned' ? EA.t('hari akhir ', 'last day ') : EA.t('terakhir dilihat ', 'last seen ');
        return '<div class="wk-pend"><div><span class="wk-tag ' + (q.kind === 'new' ? 'ok' : 'b') + '">' + esc(EA.t(w[0], w[1])) + '</span> <b>' + esc(q.name) + '</b>' +
          '<span class="s">' + esc(q.worker) + ' · ' + dl + esc(day(q.day)) + '</span>' +
          '<span class="wk-trail">1. ' + EA.t('Dikunci ', 'Keyed ') + esc(q.keyed ? q.keyed.by + ' ' + day(q.keyed.at) : '') + (q.reason ? ' · ' + esc(q.reason) : '') + '<br>' +
          '2. ' + EA.t('Lulus ', 'Approved ') + esc(q.approved ? q.approved.by + ' ' + day(q.approved.at) : '') + (q.approved && q.approved.note ? ' · ' + esc(q.approved.note) : '') + '</span></div>' +
          (can.hq ? '<div class="actions"><button class="btn btn-main" type="button" data-done="' + esc(q.ref) + '">DONE<small>Selesai</small></button></div>' : '<span class="tag-wait">' + EA.t('Menunggu SDK', 'Waiting for SDK') + '</span>') + '</div>';
      }).join('') + '<p class="hint">' + EA.t('Tekan SELESAI bila fail pekerja dan gaji di SDK sudah dikemas kini.', 'Press DONE when the worker file and pay at SDK are updated.') + '</p></div>';
      if ((d.flags || []).length) h += '<div class="card"><h2>' + EA.t('Mungkin lari? · dari Staf', 'Maybe absconded? · from the staff') + '</h2>' + d.flags.map(function (f) {
        return '<div class="hrow"><div><b>' + esc(f.name) + '</b><span class="s">' + esc(tDays(f.detail)) + ' · ' + esc(day(f.date)) + '</span></div>' +
          (can.key ? '<button class="btn btn-ghost wk-red-t" type="button" data-flag="' + esc(f.worker) + '">ABSCONDED<small>Kunci lari</small></button>' : '') + '</div>';
      }).join('') + '<p class="hint">' + EA.t('Semak dahulu. Jika dia sudah kembali, biarkan — tanda hilang sendiri.', 'Check first. If he is back, leave it — the flag goes by itself.') + '</p></div>';
      h += '<div class="card"><h2>' + EA.t('Perubahan 2 bulan', 'Changes, last 2 months') + '</h2>' + ((d.changes || []).length ? d.changes.map(function (c) {
        var k = label(c), of = c.kind === 'approved' || c.kind === 'rejected' ? c.of : c.kind;
        var dl = c.kind === 'hq_done' || c.kind === 'back' ? '' : of === 'new' ? EA.t('mula ', 'starts ') : of === 'resigned' ? EA.t('hari akhir ', 'last day ') : EA.t('terakhir dilihat ', 'last seen ');
        var nt = c.kind === 'hq_done' ? c.note.split(' ').slice(1).join(' ') : c.note;
        return '<div class="hrow"><div><b>' + esc(c.name) + '</b><span class="s">' + esc(c.worker) + (dl ? ' · ' + dl + esc(day(c.day)) : '') + ' · ' + esc(c.by) + (nt ? ' · ' + esc(nt) : '') + '</span></div><span class="wk-tag ' + k[2] + '">' + esc(EA.t(k[0], k[1])) + '</span></div>';
      }).join('') : '<p class="hint">' + EA.t('Belum ada perubahan.', 'No changes yet.') + '</p>') + '</div>';
      var off = (d.people || []).filter(function (p) { return p.state; });
      if (off.length && can.key) h += '<div class="card"><h2>' + EA.t('Betulkan silap', 'Undo a mistake') + '</h2>' + off.map(function (p) {
        return '<div class="hrow"><div><b>' + esc(p.name) + '</b><span class="s">' + esc(EA.t(stateLabel(p)[0], stateLabel(p)[1])) + '</span></div>' +
          '<button class="btn btn-ghost" type="button" data-back="' + esc(p.id) + '">BACK AT WORK<small>Kembali bekerja</small></button></div>';
      }).join('') + '</div>';
      h += '<p class="hint">' + EA.t('Tiada IC, pasport, permit, bank atau gaji di sini. Tiada yang dipadam.', 'No IC, passport, permit, bank or pay here. Nothing is deleted.') +
        (d.at ? ' ' + EA.t('Dari pejabat ', 'From the office ') + esc(String(d.at).slice(11)) + '.' : '') + '</p>';
    }
    el.innerHTML = '<div class="us wk">' + h + '</div>';
    el.querySelector('#wk-back').onclick = function () { location.hash = ''; };
    var r = el.querySelector('#wk-retry'); if (r) r.onclick = load;
    el.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { form = { kind: b.dataset.go, sex: 'M', day: EA.today() }; draw(); window.scrollTo(0, 0); }; });
    el.querySelectorAll('[data-flag]').forEach(function (b) { b.onclick = function () {
      var f = (data.flags || []).find(function (x) { return x.worker === b.dataset.flag; });
      form = { kind: 'absconded', worker: b.dataset.flag, day: lastSeen(f) }; draw(); window.scrollTo(0, 0); }; });
    el.querySelectorAll('[data-ans]').forEach(function (b) { b.onclick = function () { if (b.dataset.ans === '1') answer(b.dataset.w, true, '', b); else rejectSheet(b.dataset.w, b.dataset.k); }; });
    el.querySelectorAll('[data-done]').forEach(function (b) { b.onclick = function () { doneHQ(b.dataset.done, b); }; });
    el.querySelectorAll('[data-back]').forEach(function (b) { b.onclick = function () { backSheet(b.dataset.back); }; });
  }
  function tDays(detail) {
    var ds = String(detail || '').match(/\d{4}-\d{2}-\d{2}/g) || [];
    return EA.t('Tak hadir ', 'Absent ') + (ds.length ? ds.map(day).join(', ') : '3 ' + EA.t('hari', 'days'));
  }
  // The day before the first T of the flag (the staff's flag says which days were T).
  function lastSeen(f) {
    var m = f && /(\d{4}-\d{2}-\d{2})/.exec(String(f.detail || ''));
    if (!m) return EA.dayAgo(3);
    var d = new Date(m[1] + 'T00:00:00'); d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function drawForm() {
    var f = form, d = data || {}, people = (d.people || []).filter(function (p) { return p.onMuster && !p.pending; });
    var T = { new: EA.t('Pekerja baru', 'New hire'), resigned: EA.t('Berhenti', 'Resigned'), absconded: EA.t('Lari', 'Absconded') }[f.kind];
    var h = top(T) + '<div class="card">';
    if (f.kind === 'new') {
      var gangs = d.gangs && d.gangs.length ? d.gangs : ['Tuai · Harvest', 'Rawatan · Maintenance', 'Muat · Loading', 'Am · General'];
      h += '<div class="field"><label for="wk-name">' + EA.t('Nama penuh', 'Full name') + '</label><input id="wk-name" class="text-input" maxlength="60" autocomplete="off" value="' + esc(f.name || '') + '"></div>' +
        '<div class="field"><label>' + EA.t('Kerja · Gang', 'Job · Gang') + '</label><div class="us-pills" id="wk-gang">' + gangs.map(function (g) {
          return '<button type="button" data-gang="' + esc(g) + '" aria-pressed="' + (f.gang === g) + '">' + esc(g) + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label>' + EA.t('Jantina', 'Sex') + '</label><div class="us-pills"><button type="button" data-sex="M" aria-pressed="' + (f.sex === 'M') + '">L · M</button><button type="button" data-sex="F" aria-pressed="' + (f.sex === 'F') + '">P · F</button></div></div>' +
        '<div class="field"><label for="wk-day">' + EA.t('Mula kerja', 'Start date') + '</label><input id="wk-day" type="date" class="text-input" value="' + esc(f.day) + '"></div>' +
        '<div class="field"><label for="wk-code">' + EA.t('Kod pekerja syarikat (jika sudah ada)', 'Company worker code (if there is one)') + '</label><input id="wk-code" class="text-input" maxlength="20" autocomplete="off" value="' + esc(f.code || '') + '" placeholder="' + EA.t('Kosong = pejabat buat kod', 'Empty = the office makes one') + '"></div>' +
        reasonField(f) +
        '<p class="note-sun">' + EA.t('Dia terus masuk chit muster Staf sebagai "menunggu lulus". Jika Pengurus TOLAK, dia keluar dari chit.', 'He is on the staff\'s muster at once as "waiting for approval". If the manager rejects, he leaves the chit.') + '</p>';
    } else {
      h += '<div class="field"><label for="wk-who">' + EA.t('Pekerja', 'Worker') + '</label><select id="wk-who" class="text-input"><option value="">— ' + EA.t('pilih', 'pick') + ' —</option>' +
        people.map(function (p) { return '<option value="' + esc(p.id) + '"' + (f.worker === p.id ? ' selected' : '') + '>' + esc(p.name) + ' · ' + esc(p.id) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="wk-day">' + (f.kind === 'resigned' ? EA.t('Hari kerja terakhir', 'Last working day') : EA.t('Hari terakhir dilihat', 'Last day seen')) + '</label><input id="wk-day" type="date" class="text-input" value="' + esc(f.day) + '"' + (f.kind === 'absconded' ? ' max="' + EA.today() + '"' : '') + '></div>' +
        reasonField(f) +
        '<p class="note-sun">' + (f.kind === 'resigned' ? EA.t('Pengurus perlu lulus. Dia kekal dalam chit sehingga lulus, kemudian keluar selepas hari terakhir.', 'The manager must approve. He stays on the chit until approved, then leaves after his last day.')
          : EA.t('Pengurus perlu lulus. Dia keluar dari chit hanya selepas LULUS.', 'The manager must approve. He leaves the chit only after APPROVE.')) + '</p>';
    }
    h += '<p class="msg" id="wk-err" hidden></p><div class="actions"><button class="btn btn-ghost" type="button" id="wk-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-main' + (f.kind === 'absconded' ? ' wk-red' : '') + '" type="button" id="wk-go">SAVE<small>Simpan</small></button></div></div>';
    el.innerHTML = '<div class="us wk">' + h + '</div>';
    el.querySelector('#wk-back').onclick = el.querySelector('#wk-cancel').onclick = function () { form = null; draw(); };
    function v(id) { var x = el.querySelector(id); return x ? x.value : ''; }
    function grab() { if (el.querySelector('#wk-name')) f.name = v('#wk-name'); if (el.querySelector('#wk-code')) f.code = v('#wk-code'); if (el.querySelector('#wk-who')) f.worker = v('#wk-who'); if (el.querySelector('#wk-note')) f.note = v('#wk-note').trim(); f.day = v('#wk-day') || f.day; }
    el.querySelectorAll('[data-gang]').forEach(function (b) { b.onclick = function () { grab(); f.gang = b.dataset.gang; drawForm(); }; });
    el.querySelectorAll('[data-sex]').forEach(function (b) { b.onclick = function () { grab(); f.sex = b.dataset.sex; drawForm(); }; });
    el.querySelector('#wk-go').onclick = async function () {
      grab();
      var btn = this, err = el.querySelector('#wk-err');
      function show(e) { err.textContent = errText(e); err.hidden = false; }
      if (f.kind === 'new') {
        if (String(f.name || '').trim().length < 2) return show('bad_name');
        if (!f.gang) return show('bad_gang');
      } else if (!f.worker) return show('pick_worker');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.day)) return show('bad_date');
      if (String(f.note || '').length < 3) return show('need_reason');
      btn.disabled = true;
      var j = f.kind === 'new' ? await call('workerAdd', { name: f.name, gang: f.gang, sex: f.sex, day: f.day, code: f.code || '', note: f.note })
        : await call('workerLeave', { worker: f.worker, kind: f.kind, day: f.day, note: f.note || '' });
      btn.disabled = false;
      if (!j.ok) return show(j.error);
      form = null; draw(); window.scrollTo(0, 0);
      ui().toast(f.kind === 'new' ? EA.t('Disimpan · kod ', 'Saved · code ') + j.code + ' · ' + EA.t('menunggu Pengurus', 'waiting for the manager') : EA.t('Disimpan · menunggu Pengurus', 'Saved · waiting for the manager'));
    };
  }
  function reasonField(f) {
    var lb = f.kind === 'new' ? EA.t('Sebab ambil (cth. ganti pekerja berhenti)', 'Why hired (e.g. replaces a worker who left)')
      : f.kind === 'resigned' ? EA.t('Sebab berhenti', 'Why he resigned')
      : EA.t('Penjelasan Staf (apa yang Staf tahu)', 'Staff\'s explanation (what the staff knows)');
    return '<div class="field"><label for="wk-note">' + lb + ' *</label><textarea id="wk-note" class="text-input" rows="2" maxlength="200">' + esc(f.note || '') + '</textarea></div>';
  }
  async function answer(w, ok, note, btn) {
    if (btn) btn.disabled = true;
    var j = await call('workerAnswer', { worker: w, ok: ok, note: note || '' });
    if (btn) btn.disabled = false;
    if (!j.ok) { ui().toast(errText(j.error), 'bad'); return j; }
    draw(); ui().toast(ok ? EA.t('Diluluskan · SDK diberitahu', 'Approved · SDK is told') : EA.t('Ditolak · kerani nampak sebabnya', 'Rejected · the clerk sees why'));
    return j;
  }
  function rejectSheet(w, kind) {
    var p = (data.pending || []).find(function (x) { return x.worker === w; }) || { name: w };
    var lari = kind === 'absconded';
    ui().openSheet('<h2 id="sheet-title">' + (lari ? 'NOT ABSCONDED<small>Bukan lari</small>' : 'REJECT<small>Tolak</small>') + '</h2><p><b>' + esc(p.name) + '</b></p>' +
      '<div class="field"><label for="rj-note">' + (lari ? EA.t('Kenapa bukan lari? (cth. dia sakit, sudah kembali)', 'Why not absconded? (e.g. he was sick, he is back)') : EA.t('Kenapa ditolak?', 'Why rejected?')) + ' *</label>' +
      '<textarea id="rj-note" class="text-input" rows="2" maxlength="200"></textarea></div>' +
      '<p class="note-sun">' + (kind === 'new' ? EA.t('Dia keluar dari chit muster.', 'He leaves the muster chit.') : EA.t('Dia kekal dalam chit muster.', 'He stays on the muster chit.')) + '</p>' +
      '<p class="msg" id="rj-err" hidden></p><div class="actions"><button class="btn btn-ghost btn-back" type="button" id="rj-no">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="rj-ok">SAVE<small>Simpan</small></button></div>',
      function (s) {
        s.querySelector('#rj-no').onclick = ui().closeSheet;
        s.querySelector('#rj-ok').onclick = async function () {
          var n = s.querySelector('#rj-note').value.trim(), m = s.querySelector('#rj-err');
          if (n.length < 3) { m.textContent = errText('need_reason'); m.hidden = false; return; }
          this.disabled = true;
          var j = await call('workerAnswer', { worker: w, ok: false, note: n });
          if (!j.ok) { this.disabled = false; m.textContent = errText(j.error); m.hidden = false; return; }
          ui().closeSheet(); draw(); ui().toast(EA.t('Ditolak · kerani nampak sebabnya', 'Rejected · the clerk sees why'));
        };
      });
  }
  async function doneHQ(ref, btn) {
    btn.disabled = true;
    var j = await call('workerDone', { ref: ref });
    btn.disabled = false;
    if (!j.ok) return ui().toast(errText(j.error), 'bad');
    draw(); ui().toast(EA.t('Selesai · disimpan', 'Done · saved'));
  }
  function backSheet(w) {
    var p = (data.people || []).find(function (x) { return x.id === w; }) || { name: w };
    ui().openSheet('<h2 id="sheet-title">' + esc(p.name) + '</h2><p>' + EA.t('Batalkan perubahan terakhir? Dia kembali dalam chit muster.', 'Undo the last change? He is back on the muster chit.') + '</p>' +
      '<p class="msg" id="bk-err" hidden></p><div class="actions"><button class="btn btn-ghost btn-back" type="button" id="bk-no">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="bk-ok">BACK AT WORK<small>Kembali bekerja</small></button></div>',
      function (s) {
        s.querySelector('#bk-no').onclick = ui().closeSheet;
        s.querySelector('#bk-ok').onclick = async function () {
          this.disabled = true;
          var j = await call('workerBack', { worker: w });
          if (!j.ok) { this.disabled = false; var m = s.querySelector('#bk-err'); m.textContent = errText(j.error); m.hidden = false; return; }
          ui().closeSheet(); draw(); ui().toast(EA.t('Disimpan', 'Saved'));
        };
      });
  }

  EA.roomViews.workers = {
    render: function (container, c) {
      var first = el !== container || !ctx || ctx.user.code !== c.user.code || ctx.estate !== c.estate;
      el = container; ctx = c;
      if (first) { data = null; form = null; }
      if (form) { draw(); return; }
      if (!loading) load(); else draw();
    }
  };
  window.addEventListener('hashchange', function () { if (location.hash.replace('#', '').split('/')[0] !== 'workers') form = null; });
})();
