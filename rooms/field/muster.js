// Field & Harvest room — screen 1: the morning muster chit (Chit muster pagi).
// From the Field & Harvest Brief (Sugut), approved by Yu Chen 18 Oct 2026.
//
// What it does, in the order the staff works at 5.30 am:
//   1. Mandor, today's job code, block and lots for the gang.
//   2. Each worker: Hadir / Sakit / Cuti / Tak hadir. A worker can get his
//      own job and lots if he is not with the gang.
//   3. The mandor checks the list on the staff's phone and confirms.
//   4. Saved on the phone (one row per worker, tab FH_MUSTER), sent when
//      there is signal, and the chit text is ready for the WhatsApp group.
// A correction is new rows that point to the old ones (nothing is deleted).
// Saving and sending, the lists and the look are shared; nothing is copied here.
(function () {
  window.EA = window.EA || {};
  EA.roomViews = EA.roomViews || {};

  var TAB = 'FH_MUSTER', ROOM = 'FH';
  var K = { draft: 'fh.draft', chits: 'fh.chits', chitNo: 'fh.chitNo' };
  var MARKS = [
    { k: 'H', bm: 'Hadir', en: 'Present' },
    { k: 'S', bm: 'Sakit', en: 'Sick' },
    { k: 'C', bm: 'Cuti', en: 'Leave' },
    { k: 'T', bm: 'Tak hadir', en: 'Absent' }
  ];
  var KEEP_DAYS = 7;

  var el, ctx, draft;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function canKey(u) { return u.role !== 'HQ'; }

  // ---------- phone memory ----------
  function blankDraft() {
    return { date: EA.today(), estate: ctx.estate, mandor: '', task: '', block: '', lots: [], marks: {}, own: {}, replacing: '' };
  }
  function loadDraft() {
    var all = EA.local.get(K.draft, {});
    var d = all[ctx.estate];
    if (!d || d.date !== EA.today()) d = blankDraft();
    var mandors = EA.lists.peopleFor(ctx.estate, 'Mandor');
    if (!d.mandor && mandors.length === 1) d.mandor = mandors[0].code;
    return d;
  }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[ctx.estate] = draft; EA.local.set(K.draft, all); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[ctx.estate]; EA.local.set(K.draft, all); }

  function chits() {
    var cut = new Date(); cut.setDate(cut.getDate() - KEEP_DAYS);
    var keepFrom = cut.toISOString().slice(0, 10);
    return EA.local.get(K.chits, []).filter(function (c) { return c.date >= keepFrom; });
  }
  function todaysChits() {
    return chits().filter(function (c) { return c.estate === ctx.estate && c.date === EA.today(); });
  }
  function keepChit(c) {
    var list = chits().filter(function (x) { return x.chit !== c.chit; });
    list.push(c);
    EA.local.set(K.chits, list);
  }
  function newChitId() {
    var day = EA.today().replace(/-/g, '');
    var n = EA.local.get(K.chitNo, {});
    var base = 'MC-' + ctx.estate + '-' + (EA.phone() || 'P00') + '-' + day;
    n[base] = (n[base] || 0) + 1;
    EA.local.set(K.chitNo, n);
    return base + '-' + n[base];
  }

  // ---------- small helpers ----------
  function person(code) {
    var p = EA.lists.testUsers.find(function (u) { return u.code === code; });
    return p ? p.name : code;
  }
  function taskLabel(code) { var t = EA.lists.task(code); return t ? t.code + ' ' + t.bm : code; }
  function lotsInfo(lots) {
    var ha = 0, palms = 0;
    lots.forEach(function (n) { var l = EA.lists.lot(ctx.estate, n); if (l) { ha += l.ha; palms += l.palms; } });
    return { ha: Math.round(ha * 100) / 100, palms: palms };
  }
  function sortLots(a) {
    return a.slice().sort(function (x, y) {
      var p = x.split('-').map(Number), q = y.split('-').map(Number);
      return p[0] - q[0] || p[1] - q[1];
    });
  }
  // The job and lots a worker has today: his own, or the gang's.
  function jobOf(wid) {
    var o = draft.own[wid];
    if (o) return { task: o.task, block: o.block, lots: o.lots, own: true };
    return { task: draft.task, block: draft.block, lots: draft.lots, own: false };
  }
  // Workers already on another chit today (so nobody is counted twice).
  function onOtherChit() {
    var taken = {};
    todaysChits().forEach(function (c) {
      if (c.chit === draft.replacing) return;
      c.rows.forEach(function (r) { taken[r.worker_id] = c.chit; });
    });
    return taken;
  }
  function counts(marks) {
    var c = { H: 0, S: 0, C: 0, T: 0, all: 0 };
    Object.keys(marks).forEach(function (w) { if (c[marks[w]] != null) { c[marks[w]]++; c.all++; } });
    return c;
  }
  function blockOptions(selected) {
    return '<option value="">— Pilih blok · Choose block —</option>' + EA.lists.blocksFor(ctx.estate).map(function (b) {
      var lots = EA.lists.lotsFor(ctx.estate, b.block);
      var year = lots.length ? lots[0].planted : '';
      return '<option value="' + b.block + '"' + (b.block === selected ? ' selected' : '') + '>Blok ' + b.block + ' · ' + b.ha.toFixed(2) + ' Ha · ' + lots.length + ' petak · tanam ' + year + '</option>';
    }).join('');
  }
  function taskOptions(selected) {
    var html = '<option value="">— Pilih kerja · Choose job —</option>';
    EA.lists.taskGroups.forEach(function (g) {
      var ts = EA.lists.assignable().filter(function (t) { return t.group === g.code; });
      if (!ts.length) return;
      html += '<optgroup label="' + esc(g.bm + ' · ' + g.en) + '">' + ts.map(function (t) {
        return '<option value="' + t.code + '"' + (t.code === selected ? ' selected' : '') + '>' + esc(t.code + ' ' + t.bm + ' · ' + t.en) + '</option>';
      }).join('') + '</optgroup>';
    });
    return html;
  }
  function lotPicks(block, chosen) {
    if (!block) return '<p class="hint">Pilih blok dahulu. · Choose a block first.</p>';
    return '<div class="picks">' + EA.lists.lotsFor(ctx.estate, block).map(function (l) {
      return '<button type="button" class="pick" data-lot="' + l.lot + '" aria-pressed="' + (chosen.indexOf(l.lot) >= 0) + '"><b>' + l.lot + '</b><small>' + l.ha.toFixed(2) + ' Ha</small></button>';
    }).join('') + '</div>';
  }
  function lotsLine(lots) {
    if (!lots.length) return 'Belum pilih petak · No lot yet';
    var i = lotsInfo(lots);
    return lots.length + ' petak · lots — ' + i.ha.toFixed(2) + ' Ha · ' + i.palms + ' pokok · palms';
  }

  // ---------- the screen ----------
  function render(container, c) {
    el = container; ctx = c;
    draft = loadDraft();
    var testing = ctx.room.state !== 'live';
    var head = '<div class="room-top">' +
      '<button type="button" class="back-btn" id="fh-back">← <span class="inline"><span class="bm">Bilik</span></span></button>' +
      '<div class="grow"><h1>Chit muster pagi</h1><span class="en">Morning muster chit · ' + esc(ctx.estate) + '</span></div>' +
      (testing ? '<span class="test-badge">UJIAN · TEST</span>' : '') + '</div>';

    if (!canKey(ctx.user)) {
      el.innerHTML = head + '<div class="card"><p><span class="bm">Pandangan pejabat untuk chit muster akan datang kemudian.</span>' +
        '<span class="en">The office view of muster chits comes later.</span></p></div>' + todayCard();
      wireCommon();
      return;
    }

    var d = new Date();
    var sunday = d.getDay() === 0;
    el.innerHTML = head +
      (sunday ? '<p class="warn"><span class="bm">Hari Ahad: kerja perlu kelulusan Penolong Pengurus sebelum dikira untuk gaji.</span><span class="en">Sunday: work needs the Assistant Manager\'s approval before it counts for pay.</span></p>' : '') +
      (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan chit ' + esc(draft.replacing) + '. Chit lama kekal; yang baru menggantikannya.</span><span class="en">Correcting chit ' + esc(draft.replacing) + '. The old one stays on record; this one replaces it.</span></p>' : '') +

      '<section class="card" aria-labelledby="fh-s1"><h2 id="fh-s1"><span class="step">1</span><span class="inline"><span class="bm">Gang</span> · <span class="en">Gang</span></span></h2>' +
      '<div class="fields">' +
        '<div class="field"><label for="fh-date"><span class="bm">Tarikh</span><span class="en">Date</span></label>' +
          '<input id="fh-date" class="text-input" value="' + esc(ui().dayBm[d.getDay()] + ', ' + d.getDate() + ' ' + ui().monBm[d.getMonth()] + ' ' + d.getFullYear()) + '" readonly></div>' +
        '<div class="field"><label for="fh-mandor"><span class="bm">Mandor</span><span class="en">Foreman</span></label>' +
          '<select id="fh-mandor" class="text-input"><option value="">— Pilih · Choose —</option>' +
          EA.lists.peopleFor(ctx.estate, 'Mandor').map(function (m) { return '<option value="' + m.code + '"' + (m.code === draft.mandor ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label for="fh-task"><span class="bm">Kerja hari ini</span><span class="en">Today\'s job code</span></label>' +
          '<select id="fh-task" class="text-input">' + taskOptions(draft.task) + '</select></div>' +
        '<div class="field"><label for="fh-block"><span class="bm">Blok</span><span class="en">Block</span></label>' +
          '<select id="fh-block" class="text-input">' + blockOptions(draft.block) + '</select></div>' +
      '</div>' +
      '<div class="field"><span class="inline"><span class="bm">Petak</span> · <span class="en">Lots</span></span>' +
        '<div id="fh-lots">' + lotPicks(draft.block, draft.lots) + '</div>' +
        '<p class="hint" id="fh-lots-line">' + esc(lotsLine(draft.lots)) + '</p></div>' +
      '</section>' +

      '<section class="card" aria-labelledby="fh-s2"><h2 id="fh-s2"><span class="step">2</span><span class="inline"><span class="bm">Kehadiran</span> · <span class="en">Attendance</span></span></h2>' +
      '<div class="room-top"><div class="counts grow" id="fh-counts"></div>' +
        '<button type="button" class="btn btn-ghost" id="fh-allin">ALL PRESENT<small>Semua hadir</small></button></div>' +
      '<p class="hint">H Hadir · present &nbsp; S Sakit · sick &nbsp; C Cuti · leave &nbsp; T Tak hadir · absent. Tekan sekali lagi untuk buang. · Tap again to clear.</p>' +
      '<div class="rows" id="fh-rows"></div>' +
      '</section>' +

      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="fh-check">CHECK WITH MANDOR<small>Semak dengan mandor</small></button></div>' +
      todayCard();

    // gang
    $('#fh-mandor').onchange = function () { draft.mandor = this.value; keepDraft(); };
    $('#fh-task').onchange = function () { draft.task = this.value; keepDraft(); drawRows(); };
    $('#fh-block').onchange = function () {
      draft.block = this.value; draft.lots = []; keepDraft();
      $('#fh-lots').innerHTML = lotPicks(draft.block, draft.lots); wireLots(); drawRows();
      $('#fh-lots-line').textContent = lotsLine(draft.lots);
    };
    wireLots();
    $('#fh-allin').onclick = function () {
      var taken = onOtherChit();
      EA.lists.workersFor(ctx.estate).forEach(function (w) { if (!taken[w.id] && !draft.marks[w.id]) draft.marks[w.id] = 'H'; });
      keepDraft(); drawRows();
    };
    $('#fh-check').onclick = check;
    drawRows();
    wireCommon();
  }

  function wireLots() {
    el.querySelectorAll('#fh-lots .pick').forEach(function (b) {
      b.onclick = function () {
        var lot = b.dataset.lot, i = draft.lots.indexOf(lot);
        if (i >= 0) draft.lots.splice(i, 1); else draft.lots.push(lot);
        draft.lots = sortLots(draft.lots);
        b.setAttribute('aria-pressed', i < 0);
        $('#fh-lots-line').textContent = lotsLine(draft.lots);
        keepDraft(); drawRows();
      };
    });
  }

  function drawRows() {
    var taken = onOtherChit();
    var c = counts(draft.marks);
    $('#fh-counts').innerHTML =
      '<span class="pill ok">' + c.H + ' Hadir</span><span class="pill wait">' + c.S + ' Sakit</span>' +
      '<span class="pill hq">' + c.C + ' Cuti</span><span class="pill bad">' + c.T + ' Tak hadir</span>' +
      '<span class="pill plain">' + c.all + ' dalam chit · on chit</span>';
    $('#fh-rows').innerHTML = EA.lists.workersFor(ctx.estate).map(function (w) {
      var other = taken[w.id];
      var m = draft.marks[w.id] || '';
      var j = jobOf(w.id);
      var job = '';
      if (other) {
        job = '<span class="hint">Sudah dalam chit lain · Already on chit ' + esc(other) + '</span>';
      } else if (m === 'H') {
        job = '<span>' + (j.task ? esc(taskLabel(j.task)) : '<b>Tiada kerja · No job</b>') + ' · ' +
          (j.lots.length ? 'Petak ' + esc(j.lots.join(', ')) : '<b>Tiada petak · No lot</b>') + '</span>' +
          (j.own ? '<span class="pill plain">sendiri · own</span>' : '') +
          '<button type="button" class="link-btn" data-own="' + w.id + '">Tukar · Change</button>';
      }
      return '<div class="wrow' + (other ? ' off' : '') + '">' +
        '<div class="who-w"><b>' + esc(w.id) + '</b><span class="en">' + esc(w.name) + ' · ' + esc(w.gang) + '</span></div>' +
        '<div class="seg" role="group" aria-label="' + esc(w.id) + '">' + MARKS.map(function (k) {
          return '<button type="button" data-w="' + w.id + '" data-k="' + k.k + '" aria-pressed="' + (m === k.k) + '" title="' + k.bm + ' · ' + k.en + '"' + (other ? ' disabled' : '') + '>' + k.k + '</button>';
        }).join('') + '</div>' +
        (job ? '<div class="job">' + job + '</div>' : '') + '</div>';
    }).join('');
    el.querySelectorAll('#fh-rows .seg button').forEach(function (b) {
      b.onclick = function () {
        var w = b.dataset.w;
        if (draft.marks[w] === b.dataset.k) delete draft.marks[w]; else draft.marks[w] = b.dataset.k;
        if (draft.marks[w] !== 'H') delete draft.own[w];
        keepDraft(); drawRows();
      };
    });
    el.querySelectorAll('#fh-rows [data-own]').forEach(function (b) { b.onclick = function () { ownJob(b.dataset.own); }; });
  }

  // One worker on a different job or lots from the gang.
  function ownJob(wid) {
    var j = jobOf(wid);
    var pick = { task: j.task, block: j.block, lots: j.lots.slice() };
    ui().openSheet(
      '<h2 id="sheet-title"><span class="bm">' + esc(wid) + ': kerja sendiri</span><span class="en">Own job and lots for this worker</span></h2>' +
      '<div class="field"><label for="ow-task"><span class="bm">Kerja</span><span class="en">Job code</span></label><select id="ow-task" class="text-input">' + taskOptions(pick.task) + '</select></div>' +
      '<div class="field"><label for="ow-block"><span class="bm">Blok</span><span class="en">Block</span></label><select id="ow-block" class="text-input">' + blockOptions(pick.block) + '</select></div>' +
      '<div class="field"><span class="inline"><span class="bm">Petak</span> · <span class="en">Lots</span></span><div id="ow-lots">' + lotPicks(pick.block, pick.lots) + '</div></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="ow-gang">SAME AS GANG<small>Ikut gang</small></button>' +
      '<button class="btn btn-ok" type="button" id="ow-save">SAVE<small>Simpan</small></button></div>',
      function (s) {
        function wire() {
          s.querySelectorAll('#ow-lots .pick').forEach(function (b) {
            b.onclick = function () {
              var i = pick.lots.indexOf(b.dataset.lot);
              if (i >= 0) pick.lots.splice(i, 1); else pick.lots.push(b.dataset.lot);
              b.setAttribute('aria-pressed', i < 0);
            };
          });
        }
        wire();
        s.querySelector('#ow-task').onchange = function () { pick.task = this.value; };
        s.querySelector('#ow-block').onchange = function () { pick.block = this.value; pick.lots = []; s.querySelector('#ow-lots').innerHTML = lotPicks(pick.block, pick.lots); wire(); };
        s.querySelector('#ow-gang').onclick = function () { delete draft.own[wid]; keepDraft(); ui().closeSheet(); drawRows(); };
        s.querySelector('#ow-save').onclick = function () {
          if (!pick.task || !pick.block || !pick.lots.length) { ui().toast('Pilih kerja, blok dan petak · Choose job, block and lots', 'bad'); return; }
          draft.own[wid] = { task: pick.task, block: pick.block, lots: sortLots(pick.lots) };
          keepDraft(); ui().closeSheet(); drawRows();
        };
      });
  }

  // ---------- check, confirm, save ----------
  function problems() {
    var p = [];
    if (!draft.mandor) p.push(['Pilih mandor.', 'Choose the mandor.']);
    if (!draft.block) p.push(['Pilih blok gang.', 'Choose the gang\'s block.']);
    var c = counts(draft.marks);
    if (!c.all) p.push(['Tiada pekerja ditanda.', 'No worker is marked.']);
    var noJob = Object.keys(draft.marks).filter(function (w) {
      if (draft.marks[w] !== 'H') return false;
      var j = jobOf(w); return !j.task || !j.lots.length;
    });
    if (noJob.length) p.push(['Kerja atau petak belum diisi untuk: ' + noJob.join(', '), 'Job or lots missing for: ' + noJob.join(', ')]);
    var taken = onOtherChit();
    var twice = Object.keys(draft.marks).filter(function (w) { return taken[w]; });
    if (twice.length) p.push(['Sudah dalam chit lain: ' + twice.join(', '), 'Already on another chit: ' + twice.join(', ')]);
    return p;
  }

  function check() {
    var p = problems();
    if (p.length) {
      ui().openSheet('<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
        p.map(function (x) { return '<p class="msg"><span class="bm">' + esc(x[0]) + '</span><span class="en">' + esc(x[1]) + '</span></p>'; }).join('') +
        '<div class="actions"><button class="btn btn-main" type="button" id="pb-ok">OK<small>Betulkan</small></button></div>',
        function (s) { s.querySelector('#pb-ok').onclick = ui().closeSheet; });
      return;
    }
    var preview = chitText(buildChit('(belum disimpan · not saved yet)', EA.ui.hhmm(new Date())));
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Mandor ' + esc(person(draft.mandor)) + ', semak senarai ini</span><span class="en">Mandor, check this list on this phone</span></h2>' +
      '<pre class="chit">' + esc(preview) + '</pre>' +
      '<p class="hint">Bila mandor tekan CONFIRM, chit disimpan atas nama dia sebagai penyemak. · When the mandor taps CONFIRM, the chit is saved with him as the checker.</p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="cf-back">BACK<small>Ubah</small></button>' +
      '<button class="btn btn-ok" type="button" id="cf-ok">CONFIRM<small>Mandor sahkan</small></button></div>',
      function (s) {
        s.querySelector('#cf-back').onclick = ui().closeSheet;
        s.querySelector('#cf-ok').onclick = function () { ui().closeSheet(); save(); };
      });
  }

  // The chit as a record (before or after saving).
  function buildChit(chitId, confirmedAt) {
    var rows = [];
    EA.lists.workersFor(ctx.estate).forEach(function (w) {
      var m = draft.marks[w.id];
      if (!m) return;
      var j = m === 'H' ? jobOf(w.id) : { task: '', block: draft.block, lots: [] };
      rows.push({ worker_id: w.id, muster: m, task_code: j.task, block: j.block || draft.block, lots: j.lots.join(' ') });
    });
    return { chit: chitId, date: EA.today(), estate: ctx.estate, mandor: draft.mandor, confirmedAt: confirmedAt,
             keyedBy: ctx.user.code, keyedName: ctx.user.name, rows: rows, rev: 1 };
  }

  function save() {
    var confirmedAt = EA.ui.hhmm(new Date());
    var old = draft.replacing ? todaysChits().find(function (c) { return c.chit === draft.replacing; }) : null;
    var chitId = old ? old.chit : newChitId();
    var c = buildChit(chitId, confirmedAt);
    if (old) c.rev = (old.rev || 1) + 1;
    try {
      var oldBy = {};
      if (old) old.rows.forEach(function (r) { oldBy[r.worker_id] = r; });
      c.rows.forEach(function (r) {
        var o = oldBy[r.worker_id];
        // Unchanged in a correction: the old row still stands, nothing new is written.
        if (o && o.muster === r.muster && o.task_code === r.task_code && o.block === r.block && o.lots === r.lots) {
          r.id = o.id; delete oldBy[r.worker_id]; return;
        }
        var saved = EA.save(TAB, ROOM, ctx.estate, {
          chit: c.chit, block: r.block, lots: r.lots, mandor: c.mandor, worker_id: r.worker_id,
          task_code: r.task_code, muster: r.muster, confirmed_by: c.mandor, confirmed_at: c.date + ' ' + confirmedAt, note: ''
        }, oldBy[r.worker_id] ? oldBy[r.worker_id].id : '');
        r.id = saved.id;
        delete oldBy[r.worker_id];
      });
      // Workers taken off the chit in a correction: a 'removed' row, never a delete.
      Object.keys(oldBy).forEach(function (w) {
        var o = oldBy[w];
        EA.save(TAB, ROOM, ctx.estate, {
          chit: c.chit, block: o.block, lots: o.lots, mandor: c.mandor, worker_id: o.worker_id,
          task_code: o.task_code, muster: o.muster, confirmed_by: c.mandor, confirmed_at: c.date + ' ' + confirmedAt, note: 'removed in correction'
        }, o.id, 'removed');
      });
    } catch (e) {
      ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad');
      return;
    }
    keepChit(c);
    dropDraft();
    ui().toast('Chit disimpan · Chit saved' + (old ? ' (dibetulkan · corrected)' : ''));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
    showChit(c.chit);
  }

  // ---------- the chit text for the WhatsApp group ----------
  function chitText(c) {
    var d = new Date(c.date + 'T00:00:00');
    var n = counts(c.rows.reduce(function (o, r) { o[r.worker_id] = r.muster; return o; }, {}));
    var lines = [];
    lines.push('*CHIT MUSTER ' + c.estate + '*' + (c.rev > 1 ? ' (DIBETULKAN · CORRECTED)' : ''));
    lines.push(ui().dayBm[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + c.confirmedAt);
    lines.push('Mandor: ' + person(c.mandor));
    lines.push('Hadir ' + n.H + ' · Sakit ' + n.S + ' · Cuti ' + n.C + ' · Tak hadir ' + n.T + ' (Jumlah ' + n.all + ')');
    // group present workers by job and lots
    var groups = [];
    c.rows.filter(function (r) { return r.muster === 'H'; }).forEach(function (r) {
      var key = r.task_code + '|' + r.lots;
      var g = groups.find(function (x) { return x.key === key; });
      if (!g) { g = { key: key, task: r.task_code, block: r.block, lots: r.lots ? r.lots.split(' ') : [], who: [] }; groups.push(g); }
      g.who.push(r.worker_id);
    });
    groups.forEach(function (g) {
      var i = lotsInfo(g.lots);
      lines.push('');
      lines.push(taskLabel(g.task) + ' — ' + g.who.length + ' orang');
      lines.push('  Blok ' + g.block + ' · Petak ' + g.lots.join(', ') + ' (' + i.ha.toFixed(2) + ' Ha)');
      g.who.forEach(function (w) { var x = EA.lists.worker(w); lines.push('  ' + w + (x ? ' ' + x.name : '')); });
    });
    [['S', 'Sakit'], ['C', 'Cuti'], ['T', 'Tak hadir']].forEach(function (k) {
      var who = c.rows.filter(function (r) { return r.muster === k[0]; }).map(function (r) { var x = EA.lists.worker(r.worker_id); return r.worker_id + (x ? ' ' + x.name : ''); });
      if (who.length) { lines.push(''); lines.push(k[1] + ': ' + who.join(', ')); }
    });
    lines.push('');
    lines.push('Disemak mandor ' + person(c.mandor) + ' ' + c.confirmedAt + ' · Dikunci ' + (c.keyedName || c.keyedBy));
    lines.push('E-Book ' + c.chit);
    return lines.join('\n');
  }

  function showChit(id) {
    var c = chits().find(function (x) { return x.chit === id; });
    if (!c) return;
    var text = chitText(c);
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Chit untuk kumpulan WhatsApp</span><span class="en">Chit for the WhatsApp group</span></h2>' +
      '<pre class="chit" id="ch-text">' + esc(text) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="ch-copy">COPY<small>Salin</small></button>' +
      '<button class="btn btn-ok" type="button" id="ch-wa">WHATSAPP<small>Hantar ke WhatsApp</small></button></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="ch-close">CLOSE<small>Tutup</small></button></div>',
      function (s) {
        s.querySelector('#ch-close').onclick = ui().closeSheet;
        s.querySelector('#ch-copy').onclick = function () { copyText(text); };
        s.querySelector('#ch-wa').onclick = function () {
          if (navigator.share) { navigator.share({ text: text }).catch(function () {}); }
          else { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); }
        };
      });
  }
  function copyText(t) {
    function done() { ui().toast('Disalin · Copied'); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, fallback); } else fallback();
    function fallback() {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
      document.body.appendChild(a); a.select();
      try { document.execCommand('copy'); done(); } catch (e) { ui().toast('Tekan lama pada teks untuk salin · Long-press the text to copy', 'wait'); }
      document.body.removeChild(a);
    }
  }

  // ---------- today's chits on this phone ----------
  function todayCard() {
    var list = todaysChits();
    return '<section class="card" aria-labelledby="fh-today"><h2 id="fh-today"><span class="inline"><span class="bm">Chit hari ini di telefon ini</span> · <span class="en">Today\'s chits on this phone</span></span></h2>' +
      (list.length ? '<div>' + list.map(function (c) {
        var n = counts(c.rows.reduce(function (o, r) { o[r.worker_id] = r.muster; return o; }, {}));
        var waiting = c.rows.some(function (r) { return EA.isWaiting(r.id); });
        return '<div class="list-line"><div><b>Chit ' + esc(c.chit.split('-').pop()) + '</b> · ' + esc(person(c.mandor)) + ' · ' + esc(c.confirmedAt) +
          (c.rev > 1 ? ' · dibetulkan' : '') +
          '<span class="en">Hadir ' + n.H + ' · Sakit ' + n.S + ' · Cuti ' + n.C + ' · Tak hadir ' + n.T + '</span></div>' +
          '<div class="acts"><span class="pill ' + (waiting ? 'wait">Menunggu · Waiting' : 'ok">Dihantar · Sent') + '</span>' +
          '<button type="button" class="btn btn-ghost" data-view="' + esc(c.chit) + '">VIEW<small>Lihat</small></button>' +
          (canKey(ctx.user) ? '<button type="button" class="btn btn-ghost" data-fix="' + esc(c.chit) + '">CORRECT<small>Betulkan</small></button>' : '') +
          '</div></div>';
      }).join('') + '</div>' : '<p class="hint">Belum ada chit hari ini. · No chit yet today.</p>') +
      '</section>';
  }

  function wireCommon() {
    $('#fh-back').onclick = function () { location.hash = ''; };
    el.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { showChit(b.dataset.view); }; });
    el.querySelectorAll('[data-fix]').forEach(function (b) {
      b.onclick = function () {
        var c = todaysChits().find(function (x) { return x.chit === b.dataset.fix; });
        if (!c) return;
        var d = blankDraft();
        d.replacing = c.chit; d.mandor = c.mandor;
        // the gang job is the most common job on the chit
        var tally = {};
        c.rows.forEach(function (r) {
          d.marks[r.worker_id] = r.muster;
          if (r.muster === 'H') { var key = r.task_code + '|' + r.block + '|' + r.lots; tally[key] = (tally[key] || 0) + 1; }
        });
        var top = Object.keys(tally).sort(function (a, b2) { return tally[b2] - tally[a]; })[0];
        if (top) { var p = top.split('|'); d.task = p[0]; d.block = p[1]; d.lots = p[2] ? p[2].split(' ') : []; }
        else d.block = c.rows[0] ? c.rows[0].block : '';
        c.rows.forEach(function (r) {
          if (r.muster !== 'H') return;
          if (r.task_code !== d.task || r.lots !== d.lots.join(' ')) d.own[r.worker_id] = { task: r.task_code, block: r.block, lots: r.lots ? r.lots.split(' ') : [] };
        });
        draft = d; keepDraft(); render(el, ctx); window.scrollTo(0, 0);
      };
    });
  }

  EA.roomViews['field-harvest'] = { render: render, chitText: chitText };
})();
