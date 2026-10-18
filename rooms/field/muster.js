// Field & Harvest room — screen 1: the morning muster chit (Chit muster pagi).
// From the Field & Harvest Brief (Sugut), approved by Yu Chen 18 Oct 2026,
// laid out like the Sugut paper muster chit (17 Oct 2026): one chit for the
// whole estate's day, every job in sections A–D with Mdr / M / F / Total.
//
// What the staff does at 5.30 am:
//   1. Today's jobs: job code, block and lots, mandor (as many jobs as needed).
//   2. Each person: Hadir + which job, or Sakit / Cuti / Tak hadir / Hari Buruh / Pindah.
//   3. Rain since yesterday.
//   4. The mandor checks the chit on the staff's phone and confirms.
//   5. Saved on the phone (one row per person in FH_MUSTER, one row for the chit
//      in FH_CHIT), sent when there is signal; chit text ready for WhatsApp.
// A correction is new rows that point to the old ones (nothing is deleted).
// Saving and sending, the lists and the look are shared; nothing is copied here.
(function () {
  window.EA = window.EA || {};
  EA.roomViews = EA.roomViews || {};

  var TAB = 'FH_MUSTER', TAB_CHIT = 'FH_CHIT', ROOM = 'FH';
  var K = { draft: 'fh.draft2', chits: 'fh.chits2', chitNo: 'fh.chitNo' };
  var MARKS = { H: ['Hadir', 'Present'], S: ['Sakit', 'Sick'], C: ['Cuti', 'On leave'], T: ['Tak hadir', 'Absent'],
                L: ['Hari Buruh', 'Labour day'], X: ['Pindah', 'Transfer'] };
  var AWAY = ['T', 'S', 'C', 'L', 'X'];           // paper order: Absent, Sick, On Leave, Labour Day, Transfer
  var KEEP_DAYS = 7;

  var el, ctx, draft;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function canKey(u) { return u.role !== 'HQ'; }

  // ---------- phone memory ----------
  function blankDraft() {
    return { date: EA.today(), estate: ctx.estate, jobs: [], marks: {}, jobOf: {}, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 1 };
  }
  function loadDraft() {
    var all = EA.local.get(K.draft, {});
    var d = all[ctx.estate];
    return (!d || d.date !== EA.today()) ? blankDraft() : d;
  }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[ctx.estate] = draft; EA.local.set(K.draft, all); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[ctx.estate]; EA.local.set(K.draft, all); }

  function chits() {
    var cut = new Date(); cut.setDate(cut.getDate() - 40);       // kept 40 days for the month's rain to date
    var keepFrom = cut.toISOString().slice(0, 10);
    return EA.local.get(K.chits, []).filter(function (c) { return c.date >= keepFrom; });
  }
  function todaysChits() { return chits().filter(function (c) { return c.estate === ctx.estate && c.date === EA.today(); }); }
  function keepChit(c) { var list = chits().filter(function (x) { return x.chit !== c.chit; }); list.push(c); EA.local.set(K.chits, list); }
  function newChitId() {
    var day = EA.today().replace(/-/g, '');
    var n = EA.local.get(K.chitNo, {});
    var base = 'MC-' + ctx.estate + '-' + (EA.phone() || 'P00') + '-' + day;
    n[base] = (n[base] || 0) + 1;
    EA.local.set(K.chitNo, n);
    return base + '-' + n[base];
  }
  // Rain this month (from the chits kept on this phone), for the "month to date" line.
  // One reading per day (the latest chit of that day); 'today' can be given
  // (the reading being keyed now). Days after 'date' are not counted.
  function rainMonth(date, today) {
    var m = date.slice(0, 7), byDay = {};
    chits().forEach(function (c) { if (c.estate === ctx.estate && c.date.slice(0, 7) === m && c.date <= date) byDay[c.date] = Number(c.rain_mm) || 0; });
    if (today !== undefined) byDay[date] = Number(today) || 0;
    var sum = Object.keys(byDay).reduce(function (a, k) { return a + byDay[k]; }, 0);
    return Math.round(sum * 100) / 100;
  }

  // ---------- small helpers ----------
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }
  function task(code) { return EA.lists.task(code); }
  function jobName(code) { var t = task(code); return t ? t.bm : code; }
  function jobNameEn(code) { var t = task(code); return t ? t.en : code; }
  function job(key) { return draft.jobs.find(function (j) { return j.key === key; }) || null; }
  function jobShort(j) { return j.task + (j.block ? ' · Blk ' + j.block : '') + (j.lots.length ? ' · ' + j.lots.join(',') : ''); }
  function lotsInfo(lots) {
    var ha = 0, palms = 0;
    lots.forEach(function (n) { var l = EA.lists.lot(ctx.estate, n); if (l) { ha += l.ha; palms += l.palms; } });
    return { ha: Math.round(ha * 100) / 100, palms: palms };
  }
  function sortLots(a) {
    return a.slice().sort(function (x, y) { var p = x.split('-').map(Number), q = y.split('-').map(Number); return p[0] - q[0] || p[1] - q[1]; });
  }
  function everyone() { return EA.lists.mandorsFor(ctx.estate).concat(EA.lists.workersFor(ctx.estate)); }
  // The job a present person is on: his own pick, or the job he is mandor of.
  function jobFor(id) {
    if (draft.jobOf[id] && job(draft.jobOf[id])) return job(draft.jobOf[id]);
    var led = draft.jobs.find(function (j) { return j.mandor === id; });
    return led || null;
  }
  function onOtherChit() {
    var taken = {};
    todaysChits().forEach(function (c) { if (c.chit !== draft.replacing) c.rows.forEach(function (r) { if (r.status !== 'removed') taken[r.worker_id] = c.chit; }); });
    return taken;
  }
  function blockOptions(selected, optional) {
    return '<option value="">' + (optional ? '— Tiada blok · No block —' : '— Pilih blok · Choose block —') + '</option>' + EA.lists.blocksFor(ctx.estate).map(function (b) {
      var lots = EA.lists.lotsFor(ctx.estate, b.block);
      return '<option value="' + b.block + '"' + (b.block === selected ? ' selected' : '') + '>Blok ' + b.block + ' · ' + b.ha.toFixed(2) + ' Ha · ' + lots.length + ' petak · tanam ' + (lots[0] ? lots[0].planted : '') + '</option>';
    }).join('');
  }
  function taskOptions(selected) {
    var html = '<option value="">— Pilih kerja · Choose job —</option>';
    EA.lists.chitSections.forEach(function (s) {
      html += '<optgroup label="' + esc(s.code + '. ' + s.bm + ' · ' + s.en) + '">' + s.tasks.map(function (c) {
        var t = task(c);
        return '<option value="' + c + '"' + (c === selected ? ' selected' : '') + '>' + esc(c + ' ' + t.bm + ' · ' + t.en) + '</option>';
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

  // ---------- the chit's numbers, laid out like the paper ----------
  // rows: [{worker_id, muster, task_code, block, lots, mandor}]
  function summary(rows) {
    var lines = [], away = {}, worked = { mdr: 0, m: 0, f: 0 }, notw = { mdr: 0, m: 0, f: 0 };
    AWAY.forEach(function (k) { away[k] = { mdr: 0, m: 0, f: 0 }; });
    function add(o, w) { if (w && w.mdr) o.mdr++; else if (w && w.sex === 'F') o.f++; else o.m++; }
    rows.forEach(function (r) {
      if (r.status === 'removed') return;
      var w = EA.lists.worker(r.worker_id);
      if (r.muster === 'H') {
        var key = r.task_code + '|' + r.block + '|' + r.lots;
        var line = lines.find(function (x) { return x.key === key; });
        if (!line) { line = { key: key, task: r.task_code, block: r.block, lots: r.lots ? r.lots.split(' ') : [], mandor: r.mandor, mdr: 0, m: 0, f: 0, who: [] }; lines.push(line); }
        add(line, w); add(worked, w); line.who.push(r.worker_id);
      } else if (away[r.muster]) { add(away[r.muster], w); add(notw, w); }
    });
    var sections = EA.lists.chitSections.map(function (s) {
      return { s: s, lines: lines.filter(function (l) { return EA.lists.sectionOf(l.task).code === s.code; })
        .sort(function (a, b) { return s.tasks.indexOf(a.task) - s.tasks.indexOf(b.task) || String(a.block).localeCompare(String(b.block)); }) };
    }).filter(function (x) { return x.lines.length; });
    function tot(o) { return o.mdr + o.m + o.f; }
    return { sections: sections, worked: worked, notw: notw, away: away, tot: tot,
             grand: { mdr: worked.mdr + notw.mdr, m: worked.m + notw.m, f: worked.f + notw.f } };
  }

  function chitTable(rows) {
    var s = summary(rows);
    function n(v) { return v ? v : '–'; }
    function tr(label, o, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td colspan="2">' + label + '</td><td>' + n(o.mdr) + '</td><td>' + n(o.m) + '</td><td>' + n(o.f) + '</td><td><b>' + s.tot(o) + '</b></td></tr>'; }
    var body = s.sections.map(function (x) {
      return '<tr class="sec"><td colspan="6">' + x.s.code + '. ' + esc(x.s.bm) + ' <span class="en inline">· ' + esc(x.s.en) + '</span></td></tr>' +
        x.lines.map(function (l) {
          return '<tr><td class="mono">' + esc(l.block || '') + '</td><td>' + esc(jobName(l.task)) + (l.lots.length ? '<span class="en">Petak ' + esc(l.lots.join(', ')) + '</span>' : '') +
            '</td><td>' + n(l.mdr) + '</td><td>' + n(l.m) + '</td><td>' + n(l.f) + '</td><td><b>' + s.tot(l) + '</b></td></tr>';
        }).join('');
    }).join('');
    return '<div class="chit-wrap"><table class="chit-t"><thead><tr><th>Blk</th><th>Kerja · Job</th><th>Mdr</th><th>L</th><th>P</th><th>Jml</th></tr></thead><tbody>' +
      (body || '<tr><td colspan="6" class="hint">Belum ada orang bekerja. · Nobody working yet.</td></tr>') +
      tr('Jumlah bekerja · Total working', s.worked, 'tot') +
      AWAY.map(function (k) { return s.tot(s.away[k]) ? tr(MARKS[k][0] + ' · ' + MARKS[k][1], s.away[k]) : ''; }).join('') +
      tr('Jumlah tidak bekerja · Total not working', s.notw, 'tot') +
      tr('Jumlah besar · Grand total', s.grand, 'grand') +
      '</tbody></table></div><p class="hint">L = lelaki · male, P = perempuan · female.</p>';
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
    var started = draft.jobs.length || Object.keys(draft.marks).length || draft.replacing || draft.newChit;
    if (todaysChits().length && !started) {
      el.innerHTML = head +
        '<p class="msg ok-msg"><span class="bm">Chit hari ini sudah disimpan. Tekan VIEW untuk lihat, atau CORRECT untuk betulkan.</span>' +
        '<span class="en">Today\'s chit is saved. Tap VIEW to see it, or CORRECT to fix it.</span></p>' +
        todayCard() +
        '<button type="button" class="btn btn-ghost" id="fh-new">+ NEW CHIT<small>Chit baru (jarang · rarely needed)</small></button>';
      $('#fh-new').onclick = function () { draft.newChit = true; keepDraft(); render(el, ctx); };
      wireCommon();
      return;
    }
    var d = new Date();
    el.innerHTML = head +
      (d.getDay() === 0 ? '<p class="warn"><span class="bm">Hari Ahad: kerja perlu kelulusan Penolong Pengurus sebelum dikira untuk gaji.</span><span class="en">Sunday: work needs the Assistant Manager\'s approval before it counts for pay.</span></p>' : '') +
      (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan chit ' + esc(draft.replacing) + '. Chit lama kekal; yang baru menggantikannya.</span><span class="en">Correcting chit ' + esc(draft.replacing) + '. The old one stays on record; this one replaces it.</span></p>' : '') +

      '<section class="card" aria-labelledby="fh-s1"><h2 id="fh-s1"><span class="step">1</span><span class="inline"><span class="bm">Kerja hari ini</span> · <span class="en">Today\'s jobs</span></span></h2>' +
      '<p class="hint">' + esc(ui().dayBm[d.getDay()] + ', ' + d.getDate() + ' ' + ui().monBm[d.getMonth()] + ' ' + d.getFullYear()) + ' · ' + esc(ctx.estate) + '</p>' +
      (lastChit() && !draft.jobs.length ? '<div class="list-line copy-last"><div><b>Sama seperti chit ' + esc(niceDate(lastChit().date)) + '?</b>' +
        '<span class="en">Copy its jobs and who was on each, then change only what is different. Sick, leave and absent are not copied.</span></div>' +
        '<div class="acts"><button type="button" class="btn btn-ok" id="fh-copy">SAME AS LAST<small>Salin chit lepas</small></button></div></div>' : '') +
      '<div id="fh-jobs"></div>' +
      '<button type="button" class="btn btn-ghost" id="fh-addjob">+ ADD JOB<small>Tambah kerja</small></button>' +
      '</section>' +

      '<section class="card" aria-labelledby="fh-s2"><h2 id="fh-s2"><span class="step">2</span><span class="inline"><span class="bm">Kehadiran</span> · <span class="en">Attendance</span></span></h2>' +
      '<p class="hint">H Hadir · present &nbsp; S Sakit · sick &nbsp; C Cuti · leave &nbsp; T Tak hadir · absent &nbsp; ⋯ Hari Buruh / Pindah · labour day / transfer. Tekan sekali lagi untuk buang. · Tap again to clear.</p>' +
      '<div class="rows" id="fh-rows"></div>' +
      '</section>' +

      '<section class="card" aria-labelledby="fh-s3"><h2 id="fh-s3"><span class="step">3</span><span class="inline"><span class="bm">Hujan</span> · <span class="en">Rainfall (gauge reading)</span></span></h2>' +
      '<div class="fields">' +
        '<div class="field"><label for="fh-rain"><span class="bm">Hujan semalam (mm)</span><span class="en">Previous day, mm</span></label>' +
          '<input id="fh-rain" class="text-input" inputmode="decimal" placeholder="0.00" value="' + esc(draft.rain_mm) + '"></div>' +
        '<div class="field"><label for="fh-raint"><span class="bm">Masa hujan</span><span class="en">Time of rain, e.g. 7.00pm–8.00pm</span></label>' +
          '<input id="fh-raint" class="text-input" placeholder="7.00pm–8.00pm" value="' + esc(draft.rain_time) + '"></div>' +
      '</div><p class="hint" id="fh-rainmtd"></p>' +
      '</section>' +

      '<section class="card" aria-labelledby="fh-s4"><h2 id="fh-s4"><span class="step">4</span><span class="inline"><span class="bm">Chit</span> · <span class="en">The chit</span></span></h2>' +
      '<div id="fh-table"></div></section>' +

      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="fh-check">CHECK WITH MANDOR<small>Semak dengan mandor</small></button></div>' +
      todayCard();

    $('#fh-addjob').onclick = function () { editJob(null); };
    if ($('#fh-copy')) $('#fh-copy').onclick = copyLast;
    $('#fh-rain').oninput = function () { draft.rain_mm = this.value.replace(/[^\d.]/g, ''); keepDraft(); drawRain(); };
    $('#fh-raint').oninput = function () { draft.rain_time = this.value; keepDraft(); };
    $('#fh-check').onclick = check;
    drawAll();
    wireCommon();
  }

  function drawAll() { drawJobs(); drawRows(); drawRain(); drawTable(); }
  function niceDate(iso) { var d = new Date(iso + 'T00:00:00'); return ui().dayBm[d.getDay()] + ' ' + d.getDate() + ' ' + ui().monBm[d.getMonth()]; }
  // The latest chit of an earlier day on this phone.
  function lastChit() {
    var t = EA.today();
    return chits().filter(function (c) { return c.estate === ctx.estate && c.date < t; })
      .sort(function (a, b) { return (a.date + a.confirmedAt) < (b.date + b.confirmedAt) ? 1 : -1; })[0] || null;
  }
  function copyLast() {
    var c = lastChit(); if (!c) return;
    draft.jobs = []; draft.marks = {}; draft.jobOf = {}; draft.nextJob = 1;
    var taken = onOtherChit();
    c.rows.forEach(function (r) {
      if (r.status === 'removed' || r.muster !== 'H' || taken[r.worker_id] || !EA.lists.worker(r.worker_id)) return;
      var j = draft.jobs.find(function (x) { return x.task === r.task_code && x.block === r.block && x.lots.join(' ') === r.lots; });
      if (!j) { j = { key: 'j' + (draft.nextJob++), task: r.task_code, block: r.block, lots: r.lots ? r.lots.split(' ') : [], mandor: r.mandor }; draft.jobs.push(j); }
      draft.marks[r.worker_id] = 'H'; draft.jobOf[r.worker_id] = j.key;
    });
    keepDraft(); render(el, ctx);
    ui().toast('Disalin. Ubah petak dan yang berbeza · Copied. Change the lots and anything different');
  }
  function drawRain() { $('#fh-rainmtd').textContent = 'Bulan ini · Month to date: ' + rainMonth(EA.today(), draft.rain_mm).toFixed(2) + ' mm (dari chit di telefon ini · from chits on this phone)'; }
  function draftRows() {
    var rows = [];
    everyone().forEach(function (w) {
      var m = draft.marks[w.id];
      if (!m) return;
      var j = m === 'H' ? jobFor(w.id) : null;
      rows.push({ worker_id: w.id, muster: m, task_code: j ? j.task : '', block: j ? j.block : '', lots: j ? j.lots.join(' ') : '', mandor: j ? j.mandor : '' });
    });
    return rows;
  }
  function drawTable() { $('#fh-table').innerHTML = chitTable(draftRows()); }

  function drawJobs() {
    var rows = draftRows();
    $('#fh-jobs').innerHTML = draft.jobs.length ? draft.jobs.map(function (j) {
      var n = rows.filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j; }).length;
      var sec = EA.lists.sectionOf(j.task);
      var li = lotsInfo(j.lots);
      return '<div class="list-line"><div><b>' + esc(sec.code + '. ' + j.task + ' ' + jobName(j.task)) + '</b><span class="en">' + esc(jobNameEn(j.task)) +
        (j.block ? ' · Blok ' + esc(j.block) : '') + (j.lots.length ? ' · Petak ' + esc(j.lots.join(', ')) + ' (' + li.ha.toFixed(2) + ' Ha)' : '') +
        (j.mandor ? ' · Mandor ' + esc(person(j.mandor)) : '') + '</span></div>' +
        '<div class="acts"><span class="pill plain">' + n + ' orang</span>' +
        '<button type="button" class="btn btn-ghost" data-pick="' + j.key + '">PICK<small>Pilih orang</small></button>' +
        '<button type="button" class="btn btn-ghost" data-edit="' + j.key + '">EDIT<small>Ubah</small></button></div></div>';
    }).join('') : '<p class="hint">Belum ada kerja. Tekan + ADD JOB untuk setiap kerja hari ini. · No jobs yet. Tap + ADD JOB for each job today.</p>';
    el.querySelectorAll('#fh-jobs [data-edit]').forEach(function (b) { b.onclick = function () { editJob(b.dataset.edit); }; });
    el.querySelectorAll('#fh-jobs [data-pick]').forEach(function (b) { b.onclick = function () { pickPeople(b.dataset.pick); }; });
  }

  function unmarked() {
    var taken = onOtherChit();
    return everyone().filter(function (w) { return !draft.marks[w.id] && !taken[w.id]; });
  }
  function drawRows() {
    var taken = onOtherChit();
    var left = unmarked();
    $('#fh-rows').innerHTML = (left.length ? '<p class="warn"><span class="bm">' + left.length + ' orang belum ditanda.</span><span class="en">' + left.length + ' people not marked yet.</span></p>' : '<p class="hint">Semua orang sudah ditanda. · Everyone is marked.</p>') +
      everyone().map(function (w) {
      var other = taken[w.id];
      var m = draft.marks[w.id] || '';
      var j = m === 'H' ? jobFor(w.id) : null;
      var line = '';
      if (other) line = '<span class="hint">Sudah dalam chit lain · Already on chit ' + esc(other) + '</span>';
      else if (m === 'H') {
        line = draft.jobs.length ? '<div class="picks">' + draft.jobs.map(function (x) {
          return '<button type="button" class="pick" data-w="' + w.id + '" data-job="' + x.key + '" aria-pressed="' + (j === x) + '"><b>' + esc(x.task) + '</b><small>' + esc(x.block ? 'Blk ' + x.block : jobName(x.task)) + '</small></button>';
        }).join('') + '</div>' + (j ? '' : '<b class="bad-text">Pilih kerja · Choose a job</b>') : '<b class="bad-text">Tambah kerja dahulu · Add a job first</b>';
      } else if (m && m !== 'H') line = '<span class="pill plain">' + esc(MARKS[m][0] + ' · ' + MARKS[m][1]) + '</span>';
      var more = (m === 'L' || m === 'X') ? m : '⋯';
      return '<div class="wrow' + (other ? ' off' : '') + '">' +
        '<div class="who-w"><b>' + esc(w.id) + '</b><span class="en">' + esc(w.name) + ' · ' + (w.mdr ? 'Mandor' : esc(w.gang)) + ' · ' + (w.sex === 'F' ? 'P' : 'L') + '</span></div>' +
        '<div class="seg" role="group" aria-label="' + esc(w.id) + '">' + ['H', 'S', 'C', 'T'].map(function (k) {
          return '<button type="button" data-w="' + w.id + '" data-k="' + k + '" aria-pressed="' + (m === k) + '" title="' + MARKS[k][0] + ' · ' + MARKS[k][1] + '"' + (other ? ' disabled' : '') + '>' + k + '</button>';
        }).join('') + '<button type="button" data-w="' + w.id + '" data-more="1" aria-pressed="' + (m === 'L' || m === 'X') + '" title="Hari Buruh / Pindah"' + (other ? ' disabled' : '') + '>' + more + '</button></div>' +
        (line ? '<div class="job">' + line + '</div>' : '') + '</div>';
    }).join('');
    el.querySelectorAll('#fh-rows .seg button[data-k]').forEach(function (b) {
      b.onclick = function () { setMark(b.dataset.w, draft.marks[b.dataset.w] === b.dataset.k ? '' : b.dataset.k); };
    });
    el.querySelectorAll('#fh-rows .seg button[data-more]').forEach(function (b) {
      b.onclick = function () {
        var w = b.dataset.w;
        ui().openSheet('<h2 id="sheet-title"><span class="bm">' + esc(w) + '</span><span class="en">Other reasons</span></h2>' +
          '<div class="actions"><button class="btn btn-ghost" type="button" data-r="L">HARI BURUH<small>Labour day</small></button>' +
          '<button class="btn btn-ghost" type="button" data-r="X">PINDAH<small>Transfer</small></button></div>' +
          '<div class="actions"><button class="btn btn-ghost" type="button" data-r="">CLEAR<small>Buang</small></button></div>',
          function (s) { s.querySelectorAll('[data-r]').forEach(function (x) { x.onclick = function () { ui().closeSheet(); setMark(w, x.dataset.r); }; }); });
      };
    });
    el.querySelectorAll('#fh-rows .pick[data-job]').forEach(function (b) {
      b.onclick = function () { draft.jobOf[b.dataset.w] = b.dataset.job; keepDraft(); drawJobs(); drawRows(); drawTable(); };
    });
  }

  function setMark(w, k) {
    if (k) draft.marks[w] = k; else delete draft.marks[w];
    if (k === 'H' && !jobFor(w) && draft.jobs.length === 1) draft.jobOf[w] = draft.jobs[0].key;
    if (k !== 'H') delete draft.jobOf[w];
    keepDraft(); drawJobs(); drawRows(); drawTable();
  }

  // Add or change one job.
  function editJob(key) {
    var j0 = key ? job(key) : null;
    var pick = j0 ? { task: j0.task, block: j0.block, lots: j0.lots.slice(), mandor: j0.mandor } : { task: '', block: '', lots: [], mandor: '' };
    var used = key ? draftRows().filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j0; }).length : 0;
    ui().openSheet(
      '<h2 id="sheet-title"><span class="bm">' + (key ? 'Ubah kerja' : 'Tambah kerja') + '</span><span class="en">' + (key ? 'Change job' : 'Add a job') + '</span></h2>' +
      '<div class="field"><label for="jb-task"><span class="bm">Kerja</span><span class="en">Job code</span></label><select id="jb-task" class="text-input">' + taskOptions(pick.task) + '</select></div>' +
      '<div class="field"><label for="jb-block"><span class="bm">Blok</span><span class="en">Block</span></label><select id="jb-block" class="text-input"></select></div>' +
      '<div class="field"><span class="inline"><span class="bm">Petak</span> · <span class="en">Lots (optional)</span></span><div id="jb-lots"></div></div>' +
      '<div class="field"><label for="jb-mdr"><span class="bm">Mandor</span><span class="en">Foreman (optional)</span></label><select id="jb-mdr" class="text-input"><option value="">— Tiada · None —</option>' +
        EA.lists.mandorsFor(ctx.estate).map(function (m) { return '<option value="' + m.id + '"' + (m.id === pick.mandor ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="actions">' + (key ? '<button class="btn btn-ghost" type="button" id="jb-del"' + (used ? ' disabled title="Ada orang dalam kerja ini"' : '') + '>REMOVE<small>Buang</small></button>' : '') +
      '<button class="btn btn-ghost" type="button" id="jb-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="jb-save">SAVE<small>Simpan</small></button></div>' +
      (used ? '<p class="hint">' + used + ' orang dalam kerja ini. Pindahkan mereka dahulu untuk buang. · ' + used + ' people on this job; move them first to remove it.</p>' : ''),
      function (s) {
        function fill() {
          var needs = pick.task ? EA.lists.sectionOf(pick.task).block : true;
          s.querySelector('#jb-block').innerHTML = blockOptions(pick.block, !needs);
          s.querySelector('#jb-lots').innerHTML = lotPicks(pick.block, pick.lots);
          s.querySelectorAll('#jb-lots .pick').forEach(function (b) {
            b.onclick = function () {
              var i = pick.lots.indexOf(b.dataset.lot);
              if (i >= 0) pick.lots.splice(i, 1); else pick.lots.push(b.dataset.lot);
              b.setAttribute('aria-pressed', i < 0);
            };
          });
        }
        fill();
        s.querySelector('#jb-task').onchange = function () { pick.task = this.value; fill(); };
        s.querySelector('#jb-block').onchange = function () { pick.block = this.value; pick.lots = []; fill(); };
        s.querySelector('#jb-mdr').onchange = function () { pick.mandor = this.value; };
        s.querySelector('#jb-cancel').onclick = ui().closeSheet;
        if (key) s.querySelector('#jb-del').onclick = function () {
          draft.jobs = draft.jobs.filter(function (x) { return x.key !== key; });
          Object.keys(draft.jobOf).forEach(function (w) { if (draft.jobOf[w] === key) delete draft.jobOf[w]; });
          keepDraft(); ui().closeSheet(); drawAll();
        };
        s.querySelector('#jb-save').onclick = function () {
          if (!pick.task) { ui().toast('Pilih kerja · Choose the job', 'bad'); return; }
          if (EA.lists.sectionOf(pick.task).block && !pick.block) { ui().toast('Kerja ladang perlu blok · Field work needs a block', 'bad'); return; }
          pick.lots = sortLots(pick.lots);
          var same = draft.jobs.find(function (x) { return x.key !== key && x.task === pick.task && x.block === pick.block && x.lots.join(' ') === pick.lots.join(' '); });
          if (same) { ui().toast('Kerja ini sudah ada · This job is already on the chit', 'bad'); return; }
          if (j0) { j0.task = pick.task; j0.block = pick.block; j0.lots = pick.lots; j0.mandor = pick.mandor; }
          else { var nj = { key: 'j' + (draft.nextJob++), task: pick.task, block: pick.block, lots: pick.lots, mandor: pick.mandor }; draft.jobs.push(nj);
                 if (pick.mandor && !draft.marks[pick.mandor]) draft.marks[pick.mandor] = 'H'; }
          keepDraft(); ui().closeSheet(); drawAll();
        };
      });
  }

  // Tick the people on one job (quicker than one by one).
  function pickPeople(key) {
    var j = job(key), taken = onOtherChit();
    var list = EA.lists.workersFor(ctx.estate).filter(function (w) { return !taken[w.id]; });
    var chosen = {};
    list.forEach(function (w) { if (draft.marks[w.id] === 'H' && jobFor(w.id) === j) chosen[w.id] = true; });
    ui().openSheet('<h2 id="sheet-title"><span class="bm">' + esc(j.task + ' ' + jobName(j.task)) + (j.block ? ' · Blok ' + esc(j.block) : '') + '</span><span class="en">Tick the people on this job</span></h2>' +
      '<div class="picks" id="pp-list">' + list.map(function (w) {
        var elsewhere = draft.marks[w.id] && draft.marks[w.id] !== 'H' ? MARKS[draft.marks[w.id]][0] : (draft.marks[w.id] === 'H' && jobFor(w.id) && jobFor(w.id) !== j ? jobFor(w.id).task : '');
        return '<button type="button" class="pick" data-w="' + w.id + '" aria-pressed="' + !!chosen[w.id] + '"><b>' + esc(w.id.slice(-3)) + '</b><small>' + esc((w.sex === 'F' ? 'P' : 'L') + (elsewhere ? ' · ' + elsewhere : '')) + '</small></button>';
      }).join('') + '</div>' +
      '<p class="hint">Yang ditanda menjadi Hadir dalam kerja ini. · Ticked people become present on this job.</p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="pp-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="pp-ok">DONE<small>Siap</small></button></div>',
      function (s) {
        s.querySelectorAll('#pp-list .pick').forEach(function (b) {
          b.onclick = function () { var w = b.dataset.w; chosen[w] = !chosen[w]; b.setAttribute('aria-pressed', chosen[w]); };
        });
        s.querySelector('#pp-cancel').onclick = ui().closeSheet;
        s.querySelector('#pp-ok').onclick = function () {
          list.forEach(function (w) {
            if (chosen[w.id]) { draft.marks[w.id] = 'H'; draft.jobOf[w.id] = key; }
            else if (draft.marks[w.id] === 'H' && jobFor(w.id) === j) { delete draft.marks[w.id]; delete draft.jobOf[w.id]; }
          });
          keepDraft(); ui().closeSheet(); drawAll();
        };
      });
  }

  // ---------- check, confirm, save ----------
  function problems() {
    var p = [], rows = draftRows();
    if (!draft.jobs.length) p.push(['Tiada kerja lagi.', 'No jobs yet.']);
    if (!rows.length) p.push(['Tiada orang ditanda.', 'Nobody is marked.']);
    var noJob = rows.filter(function (r) { return r.muster === 'H' && !r.task_code; }).map(function (r) { return r.worker_id; });
    if (noJob.length) p.push(['Belum ada kerja untuk: ' + noJob.join(', '), 'No job yet for: ' + noJob.join(', ')]);
    var taken = onOtherChit();
    var twice = rows.filter(function (r) { return taken[r.worker_id]; }).map(function (r) { return r.worker_id; });
    if (twice.length) p.push(['Sudah dalam chit lain: ' + twice.join(', '), 'Already on another chit: ' + twice.join(', ')]);
    if (draft.rain_mm === '') p.push(['Isi hujan semalam (0 jika tiada hujan).', 'Fill in the rain (0 if no rain).']);
    return p;
  }
  function emptyJobs() {
    var rows = draftRows();
    return draft.jobs.filter(function (j) { return !rows.some(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j; }); });
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
    var left = unmarked();
    if (left.length) {
      leftoverSheet(left);
      return;
    }
    confirmSheet();
  }

  // Mark the people still left, right here: S / C / T each, or all absent at once.
  function leftoverSheet(left) {
    ui().openSheet('<h2 id="sheet-title"><span class="bm">' + left.length + ' orang belum ditanda</span><span class="en">' + left.length + ' people not marked yet. The chit counts everyone, working or not.</span></h2>' +
      '<div class="rows">' + left.map(function (w) {
        return '<div class="wrow"><div class="who-w"><b>' + esc(w.id) + '</b><span class="en">' + esc(w.name) + ' · ' + (w.mdr ? 'Mandor' : esc(w.gang)) + '</span></div>' +
          '<div class="seg" role="group" aria-label="' + esc(w.id) + '">' + ['S', 'C', 'T'].map(function (k) {
            return '<button type="button" data-lw="' + w.id + '" data-k="' + k + '" aria-pressed="false" title="' + MARKS[k][0] + ' · ' + MARKS[k][1] + '">' + k + '</button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<p class="hint">S Sakit · sick &nbsp; C Cuti · leave &nbsp; T Tak hadir · absent. Yang bekerja: tekan BACK dan beri kerja. · Anyone who worked: tap BACK and give them a job.</p>' +
      '<div class="actions"><button class="btn btn-wait" type="button" id="lo-all">REST ABSENT<small>Baki semua tak hadir</small></button>' +
      '<button class="btn btn-ok" type="button" id="lo-next">NEXT<small>Seterusnya</small></button></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="lo-back">BACK<small>Kembali ke senarai</small></button></div>',
      function (s) {
        var pick = {};
        s.querySelectorAll('[data-lw]').forEach(function (b) {
          b.onclick = function () {
            var w = b.dataset.lw, k = b.dataset.k;
            pick[w] = pick[w] === k ? '' : k;
            s.querySelectorAll('[data-lw="' + w + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.k === pick[w]); });
          };
        });
        function apply() { Object.keys(pick).forEach(function (w) { if (pick[w]) draft.marks[w] = pick[w]; }); keepDraft(); drawAll(); }
        s.querySelector('#lo-all').onclick = function () {
          left.forEach(function (w) { if (!pick[w.id]) { pick[w.id] = 'T'; s.querySelectorAll('[data-lw="' + w.id + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.k === 'T'); }); } });
        };
        s.querySelector('#lo-back').onclick = function () { apply(); ui().closeSheet(); var r = el.querySelector('#fh-rows'); if (r) r.scrollIntoView({ behavior: 'smooth' }); };
        s.querySelector('#lo-next').onclick = function () {
          apply(); ui().closeSheet();
          var still = unmarked();
          if (!still.length) { confirmSheet(); return; }
          ui().openSheet('<h2 id="sheet-title"><span class="bm">Masih ' + still.length + ' orang belum ditanda</span><span class="en">Still ' + still.length + ' not marked</span></h2>' +
            '<p><span class="bm" style="font-weight:400">' + esc(still.map(function (w) { return w.id; }).join(', ')) + '</span><span class="en">Continue only if they are on another chit.</span></p>' +
            '<div class="actions"><button class="btn btn-ghost" type="button" id="st-back">BACK<small>Kembali</small></button>' +
            '<button class="btn btn-ok" type="button" id="st-go">CONTINUE<small>Teruskan</small></button></div>',
            function (s2) { s2.querySelector('#st-back').onclick = function () { ui().closeSheet(); leftoverSheet(still); }; s2.querySelector('#st-go').onclick = function () { ui().closeSheet(); confirmSheet(); }; });
        };
      });
  }

  function confirmSheet() {
    var onDuty = EA.lists.mandorsFor(ctx.estate).filter(function (m) { return draft.marks[m.id] === 'H'; });
    var empty = emptyJobs();
    var preview = chitText(buildChit('(belum disimpan · not saved yet)', EA.ui.hhmm(new Date()), draft.checker || (onDuty[0] && onDuty[0].id) || ''));
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Mandor, semak chit ini</span><span class="en">Mandor, check this chit on this phone</span></h2>' +
      (empty.length ? '<p class="warn"><span class="bm">Kerja tanpa orang tidak masuk chit: ' + esc(empty.map(function (j) { return j.task; }).join(', ')) + '</span><span class="en">Jobs with nobody are left off the chit.</span></p>' : '') +
      '<pre class="chit">' + esc(preview) + '</pre>' +
      '<div class="field"><label for="cf-who"><span class="bm">Mandor yang menyemak</span><span class="en">Mandor who checked</span></label><select id="cf-who" class="text-input">' +
        (onDuty.length ? onDuty : EA.lists.mandorsFor(ctx.estate)).map(function (m) { return '<option value="' + m.id + '"' + (m.id === draft.checker ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="cf-back">BACK<small>Ubah</small></button>' +
      '<button class="btn btn-ok" type="button" id="cf-ok">CONFIRM<small>Mandor sahkan</small></button></div>',
      function (s) {
        s.querySelector('#cf-back').onclick = ui().closeSheet;
        s.querySelector('#cf-ok').onclick = function () { draft.checker = s.querySelector('#cf-who').value; keepDraft(); ui().closeSheet(); save(); };
      });
  }

  function buildChit(chitId, confirmedAt, checker) {
    return { chit: chitId, date: EA.today(), estate: ctx.estate, rows: draftRows(), jobs: JSON.parse(JSON.stringify(draft.jobs)),
             rain_mm: draft.rain_mm, rain_time: draft.rain_time, checker: checker, confirmedAt: confirmedAt,
             keyedBy: ctx.user.code, keyedName: ctx.user.name, rev: 1 };
  }

  function save() {
    var confirmedAt = EA.ui.hhmm(new Date());
    var old = draft.replacing ? todaysChits().find(function (c) { return c.chit === draft.replacing; }) : null;
    var c = buildChit(old ? old.chit : newChitId(), confirmedAt, draft.checker);
    if (old) c.rev = (old.rev || 1) + 1;
    var stamp = c.date + ' ' + confirmedAt;
    try {
      var oldBy = {};
      if (old) old.rows.forEach(function (r) { if (r.status !== 'removed') oldBy[r.worker_id] = r; });
      c.rows.forEach(function (r) {
        var o = oldBy[r.worker_id];
        if (o && o.muster === r.muster && o.task_code === r.task_code && o.block === r.block && o.lots === r.lots && o.mandor === r.mandor) {
          r.id = o.id; delete oldBy[r.worker_id]; return;           // unchanged: the old row still stands
        }
        r.id = EA.save(TAB, ROOM, ctx.estate, { chit: c.chit, block: r.block, lots: r.lots, mandor: r.mandor, worker_id: r.worker_id,
          task_code: r.task_code, muster: r.muster, confirmed_by: c.checker, confirmed_at: stamp, note: '' }, o ? o.id : '').id;
        delete oldBy[r.worker_id];
      });
      Object.keys(oldBy).forEach(function (w) {                       // taken off in a correction: a 'removed' row
        var o = oldBy[w];
        EA.save(TAB, ROOM, ctx.estate, { chit: c.chit, block: o.block, lots: o.lots, mandor: o.mandor, worker_id: o.worker_id,
          task_code: o.task_code, muster: o.muster, confirmed_by: c.checker, confirmed_at: stamp, note: 'removed in correction' }, o.id, 'removed');
      });
      var s = summary(c.rows);
      c.chitRowId = EA.save(TAB_CHIT, ROOM, ctx.estate, { chit: c.chit, rain_mm: c.rain_mm, rain_time: c.rain_time,
        working: s.tot(s.worked), not_working: s.tot(s.notw), grand_total: s.tot(s.grand),
        confirmed_by: c.checker, confirmed_at: stamp, note: '' }, old && old.chitRowId ? old.chitRowId : '').id;
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

  // ---------- the chit text for the WhatsApp group (laid out like the paper) ----------
  function chitText(c) {
    var d = new Date(c.date + 'T00:00:00');
    var s = summary(c.rows);
    var est = EA.lists.estate(c.estate);
    function pad(t, n) { t = String(t); return t.length >= n ? t.slice(0, n) : t + new Array(n - t.length + 1).join(' '); }
    function num(v) { return v ? String(v) : '-'; }
    function row(blk, name, o) { return pad(blk, 4) + pad(name, 17) + pad(num(o.mdr), 4) + pad(num(o.m), 3) + pad(num(o.f), 3) + s.tot(o); }
    function short(code) { return (EA.lists.chitNames && EA.lists.chitNames[code]) || jobNameEn(code); }
    var AWAY_EN = { T: 'Absent', S: 'Sick', C: 'On Leave', L: 'Labour Day', X: 'Transfer' };
    var L = [];
    L.push('*CHIT MUSTER ' + (est ? est.company + ' ' : '') + c.estate + '*' + (c.rev > 1 ? ' _(dibetulkan · corrected)_' : ''));
    L.push(ui().dayBm[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear());
    L.push('Hujan semalam: ' + (Number(c.rain_mm) || 0).toFixed(2) + ' mm' + (c.rain_time ? ' (' + c.rain_time + ')' : '') + ' · Bulan ini: ' + rainMonth(c.date, c.chit.indexOf('(') === 0 ? c.rain_mm : undefined).toFixed(2) + ' mm');
    L.push('```');
    L.push(pad('Blk', 4) + pad('Job', 17) + pad('Mdr', 4) + pad('M', 3) + pad('F', 3) + 'Tot');
    s.sections.forEach(function (x) {
      L.push(x.s.code + '. ' + x.s.en);
      x.lines.forEach(function (l) { L.push(row(l.block || '', short(l.task), l)); });
    });
    L.push(row('', 'Total working', s.worked));
    AWAY.forEach(function (k) { if (s.tot(s.away[k])) L.push(row('', AWAY_EN[k], s.away[k])); });
    L.push(row('', 'Total not work.', s.notw));
    L.push(row('', 'GRAND TOTAL', s.grand));
    L.push('```');
    s.sections.forEach(function (x) {
      x.lines.forEach(function (l) {
        if (l.lots.length) L.push(l.task + ' Blk ' + l.block + ': petak ' + l.lots.join(', ') + ' (' + lotsInfo(l.lots).ha.toFixed(2) + ' Ha)');
      });
    });
    var mdrs = EA.lists.mandorsFor(c.estate).filter(function (m) { return c.rows.some(function (r) { return r.worker_id === m.id && r.muster === 'H'; }); });
    if (mdrs.length) L.push('Mandor bertugas: ' + mdrs.map(function (m) { return m.name; }).join(', '));
    L.push('Disediakan: ' + (c.keyedName || c.keyedBy) + ' · Disemak mandor: ' + person(c.checker) + ' ' + c.confirmedAt);
    L.push('E-Book ' + c.chit);
    return L.join('\n');
  }

  function showChit(id) {
    var c = chits().find(function (x) { return x.chit === id; });
    if (!c) return;
    var text = chitText(c);
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Chit untuk kumpulan WhatsApp</span><span class="en">Chit for the WhatsApp group</span></h2>' +
      chitTable(c.rows) +
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
    return '<section class="card" id="fh-today-card" aria-labelledby="fh-today"><h2 id="fh-today"><span class="inline"><span class="bm">Chit hari ini di telefon ini</span> · <span class="en">Today\'s chits on this phone</span></span></h2>' +
      (list.length ? '<div>' + list.map(function (c) {
        var s = summary(c.rows);
        var ids = c.rows.map(function (r) { return r.id; }).concat(c.chitRowId ? [c.chitRowId] : []);
        var waiting = ids.some(function (i) { return EA.isWaiting(i); });
        return '<div class="list-line"><div><b>Chit ' + esc(c.chit.split('-').pop()) + '</b> · ' + esc(c.confirmedAt) + (c.rev > 1 ? ' · dibetulkan' : '') +
          '<span class="en">Bekerja ' + s.tot(s.worked) + ' · Tidak bekerja ' + s.tot(s.notw) + ' · Jumlah ' + s.tot(s.grand) + '</span></div>' +
          '<div class="acts"><span class="pill ' + (waiting ? 'wait">Menunggu · Waiting' : 'ok">Dihantar · Sent') + '</span>' +
          '<button type="button" class="btn btn-ghost" data-view="' + esc(c.chit) + '">VIEW<small>Lihat</small></button>' +
          (canKey(ctx.user) ? '<button type="button" class="btn btn-ghost" data-fix="' + esc(c.chit) + '">CORRECT<small>Betulkan</small></button>' : '') +
          '</div></div>';
      }).join('') + '</div>' : '<p class="hint">Belum ada chit hari ini. · No chit yet today.</p>') +
      '</section>';
  }

  // After sending, refresh the Waiting / Sent marks on today's chits.
  document.addEventListener('ea:sync', function () {
    if (!el || !document.body.contains(el) || el.hidden) return;
    var card = el.querySelector('#fh-today-card');
    if (!card) return;
    card.outerHTML = todayCard();
    wireList();
  });

  function wireCommon() {
    $('#fh-back').onclick = function () { location.hash = ''; };
    wireList();
  }
  function wireList() {
    el.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { showChit(b.dataset.view); }; });
    el.querySelectorAll('[data-fix]').forEach(function (b) {
      b.onclick = function () {
        var c = todaysChits().find(function (x) { return x.chit === b.dataset.fix; });
        if (!c) return;
        var d = blankDraft();
        d.replacing = c.chit; d.rain_mm = c.rain_mm; d.rain_time = c.rain_time; d.checker = c.checker;
        d.jobs = JSON.parse(JSON.stringify(c.jobs || []));
        d.nextJob = d.jobs.length + 1;
        c.rows.forEach(function (r) {
          if (r.status === 'removed') return;
          d.marks[r.worker_id] = r.muster;
          if (r.muster !== 'H') return;
          var j = d.jobs.find(function (x) { return x.task === r.task_code && x.block === r.block && x.lots.join(' ') === r.lots; });
          if (!j) { j = { key: 'j' + (d.nextJob++), task: r.task_code, block: r.block, lots: r.lots ? r.lots.split(' ') : [], mandor: r.mandor }; d.jobs.push(j); }
          d.jobOf[r.worker_id] = j.key;
        });
        draft = d; keepDraft(); render(el, ctx); window.scrollTo(0, 0);
      };
    });
  }

  EA.roomViews['field-harvest'] = { render: render, chitText: chitText, summary: summary };
})();
