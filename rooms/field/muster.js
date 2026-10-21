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

  var TAB = 'FH_MUSTER', TAB_CHIT = 'FH_CHIT', TAB_ALERT = 'FH_ALERT', ROOM = 'FH';
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
    return { date: EA.today(), estate: ctx.estate, jobs: [], marks: {}, jobOf: {}, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 1, alertNotes: {} };
  }
  function loadDraft() {
    var all = EA.local.get(K.draft, {});
    var d = all[ctx.estate];
    if (!d || d.date !== EA.today()) return blankDraft();
    // A draft saved by an older version may lack newer parts (e.g. alert notes): fill them in.
    var b = blankDraft(); Object.keys(b).forEach(function (k) { if (d[k] == null) d[k] = b[k]; });
    return d;
  }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[ctx.estate] = draft; EA.local.set(K.draft, all); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[ctx.estate]; EA.local.set(K.draft, all); }

  function chits() {
    var keepFrom = EA.dayAgo(40);       // kept 40 days for the month's rain to date
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
  // ---------- small helpers ----------
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }
  function task(code) { return EA.lists.task(code); }
  function jobName(code) { var t = task(code); return t ? EA.t(t.bm, t.en) : code; }
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
    return '<option value="">' + (optional ? EA.t('— Tiada blok —', '— No block —') : EA.t('— Pilih blok —', '— Choose block —')) + '</option>' + EA.lists.blocksFor(ctx.estate).map(function (b) {
      var lots = EA.lists.lotsFor(ctx.estate, b.block);
      return '<option value="' + b.block + '"' + (b.block === selected ? ' selected' : '') + '>Blok ' + b.block + ' · ' + b.ha.toFixed(2) + ' Ha · ' + lots.length + ' petak · tanam ' + (lots[0] ? lots[0].planted : '') + '</option>';
    }).join('');
  }
  function taskOptions(selected) {
    var html = '<option value="">' + EA.t('— Pilih kerja —', '— Choose job —') + '</option>';
    EA.lists.chitSections.forEach(function (s) {
      html += '<optgroup label="' + esc(s.code + '. ' + EA.t(s.bm, s.en)) + '">' + s.tasks.map(function (c) {
        var t = task(c);
        return '<option value="' + c + '"' + (c === selected ? ' selected' : '') + '>' + esc(c + ' ' + EA.t(t.bm, t.en)) + '</option>';
      }).join('') + '</optgroup>';
    });
    return html;
  }
  // v1.23: the last day each lot was worked for this job: from the office (kept on the phone) and
  // this phone's own chits not yet counted there.
  function lotLast(code) {
    var out = {}, data = EA.local.get('fh.rounds.' + ctx.estate, null);
    Object.assign(out, (data && data.lots && data.lots[code]) || {});
    chits().forEach(function (c) {
      if (c.estate !== ctx.estate) return;
      (c.jobs || []).forEach(function (j) { if (j.task === code) (j.lots || []).forEach(function (l) { if (!out[l] || c.date > out[l]) out[l] = c.date; }); });
    });
    return out;
  }
  function daysSince(d) { return Math.round((new Date(EA.today() + 'T00:00:00Z') - new Date(String(d).slice(0, 10) + 'T00:00:00Z')) / 864e5); }
  // For harvest: grey = done lately, green = ready again (10–15 days), red = late (over 15 days).
  function lotState(code, lot, last) {
    var r = EA.lists.lotRound[code], d = last[lot];
    if (!r || !d) return null;
    var n = daysSince(d);
    return { n: n, cls: n < r.ready ? 'lot-done' : n <= r.late ? 'lot-due' : 'lot-late' };
  }
  function lotPicks(block, chosen, code) {
    if (!block) return '<p class="hint">' + EA.t('Pilih blok dahulu.', 'Choose a block first.') + '</p>';
    var last = EA.lists.lotRound[code] ? lotLast(code) : {}, ready = [];
    var html = EA.lists.lotsFor(ctx.estate, block).map(function (l) {
      var st = lotState(code, l.lot, last);
      if (st && st.cls !== 'lot-done') ready.push(l.lot);
      return '<button type="button" class="pick' + (st ? ' ' + st.cls : '') + '" data-lot="' + l.lot + '" aria-pressed="' + (chosen.indexOf(l.lot) >= 0) + '"><b>' + l.lot + '</b><small>' +
        (st ? st.n + EA.t(' hari', st.n === 1 ? ' day' : ' days') : l.ha.toFixed(2) + ' Ha') + '</small></button>';
    }).join('');
    var top = '';
    if (EA.lists.lotRound[code]) {
      var r = EA.lists.lotRound[code];
      top = (ready.length ? '<button type="button" class="btn btn-ok jb-suggest" id="jb-suggest" data-lots="' + ready.join(' ') + '">' +
          '✓ PICK READY LOTS (' + ready.length + ')<small>✓ PILIH PETAK SEDIA (' + ready.length + ')</small></button>' +
          '<p class="hint">' + EA.t('Sedia / lewat: ', 'Ready / late: ') + esc(ready.join(', ')) + '</p>' : '') +
        '<p class="hint lot-key"><i class="k-done"></i>' + EA.t('Baru siap', 'Done lately') + ' <i class="k-due"></i>' + EA.t('Sedia ' + r.ready + '–' + r.late + ' hari', 'Ready ' + r.ready + '–' + r.late + ' days') +
        ' <i class="k-late"></i>' + EA.t('Lewat >' + r.late + ' hari', 'Late >' + r.late + ' days') + '</p>';
    }
    return top + '<div class="picks">' + html + '</div>';
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
      return '<tr class="sec"><td colspan="6">' + x.s.code + '. ' + esc(EA.t(x.s.bm, x.s.en)) + '</td></tr>' +
        x.lines.map(function (l) {
          return '<tr><td class="mono">' + esc(l.block || '') + '</td><td>' + esc(jobName(l.task)) + (l.lots.length ? '<span class="en">Petak ' + esc(l.lots.join(', ')) + '</span>' : '') +
            '</td><td>' + n(l.mdr) + '</td><td>' + n(l.m) + '</td><td>' + n(l.f) + '</td><td><b>' + s.tot(l) + '</b></td></tr>';
        }).join('');
    }).join('');
    return '<div class="chit-wrap"><table class="chit-t"><thead><tr><th>Blk</th><th>' + EA.t('Kerja', 'Job') + '</th><th>Mdr</th><th>L</th><th>P</th><th>Jml</th></tr></thead><tbody>' +
      (body || '<tr><td colspan="6" class="hint">' + EA.t('Belum ada orang bekerja.', 'Nobody working yet.') + '</td></tr>') +
      tr(EA.t('Jumlah bekerja', 'Total working'), s.worked, 'tot') +
      AWAY.map(function (k) { return s.tot(s.away[k]) ? tr(EA.t(MARKS[k][0], MARKS[k][1]), s.away[k]) : ''; }).join('') +
      tr(EA.t('Jumlah tidak bekerja', 'Total not working'), s.notw, 'tot') +
      tr(EA.t('Jumlah besar', 'Grand total'), s.grand, 'grand') +
      '</tbody></table></div><p class="hint">' + EA.t('L = lelaki, P = perempuan.', 'L = male, P = female.') + '</p>';
  }

  // ---------- the screen ----------
  // The room's screens, as tabs at the top. Built once here for both screens.
  // v1.11: the room's screens as a bar fixed at the bottom (icon + one word), like WhatsApp.
  // A green dot = done today on this phone. The screen title keeps the full name.
  var ICON = {
    muster: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    work: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>',
    collect: '<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    ticket: '<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
    ops: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  function doneToday(key, estate) {
    var t = EA.today(), list = EA.local.get({ muster: 'fh.chits2', work: 'fh.work', collect: 'fh.collect' }[key] || '', []) || [];
    return list.some(function (x) { return x && x.date === t && (!estate || x.estate === estate); });
  }
  // v1.12: who sees which buttons. The clerk keys tickets and looks at the day (Operasi); the
  // manager (Samsir) only looks, so he has one screen and no bar.
  function viewOnly(u) { return !!u && (u.role === 'Clerk' || u.role === 'Manager'); }
  function tabs(active, user) {
    var estate = ctx && ctx.estate;
    if (user && user.role === 'Manager') return '';
    if (user && user.role === 'Clerk') {
      return '<nav class="tabs botbar" aria-label="' + EA.t('Skrin', 'Screens') + '">' +
        [['ticket', '#field-harvest/ticket', 'Tiket', 'Ticket'], ['history', '#field-harvest/history', 'Operasi', 'Operations']].map(function (it) {
          return '<a href="' + it[1] + '"' + (active === it[0] ? ' aria-current="page"' : '') + ' data-tab="' + it[0] + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[it[0] === 'history' ? 'ops' : 'ticket'] + '</svg>' +
            '<span class="bm">' + it[2] + '</span><span class="en">' + it[3] + '</span></a>';
        }).join('') + '</nav>';
    }
    var loaderOnly = user && user.role === 'Worker';
    var clerkish = user && /^(Owner|HQ)$/.test(user.role);
    var items = [];
    if (!loaderOnly) items.push(['muster', '#field-harvest', 'Pagi', 'Morning']);
    if (!loaderOnly) items.push(['work', '#field-harvest/work', 'Kerja', 'Work']);
    items.push(['collect', '#field-harvest/collect', 'Lori', 'Lorry']);
    if (!loaderOnly && clerkish) items.push(['ticket', '#field-harvest/ticket', 'Tiket', 'Ticket']);
    if (!loaderOnly) items.push(['history', '#field-harvest/history', 'Rekod', 'Records']);
    return '<nav class="tabs botbar" aria-label="' + EA.t('Skrin', 'Screens') + '">' + items.map(function (it) {
      var dot = (it[0] === 'muster' || it[0] === 'work' || it[0] === 'collect') && doneToday(it[0], estate);
      return '<a href="' + it[1] + '"' + (active === it[0] ? ' aria-current="page"' : '') + ' data-tab="' + it[0] + '">' +
        (dot ? '<span class="tab-ok" title="' + EA.t('Siap hari ini', 'Done today') + '"></span>' : '') +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[it[0]] + '</svg>' +
        '<span class="bm">' + it[2] + '</span><span class="en">' + it[3] + '</span></a>';
    }).join('') + '</nav>';
  }

  // ---------- crop backlog (field and ramp) ----------
  // Worked out by the office from everyone's entries (harvesters' bunches, the
  // loader's collection, lorries) and kept on the phone for no-signal mornings.
  // With no sending link (test copy) it is worked out from this phone's own entries.
  function backlogKey(estate) { return 'fh.backlog.' + estate; }
  function getBacklog(estate) { return EA.sendLink() ? EA.local.get(backlogKey(estate), null) : localBacklog(estate); }
  async function refreshBacklog(estate) {
    if (!EA.sendLink()) { document.dispatchEvent(new CustomEvent('fh:backlog')); return localBacklog(estate); }
    var b = await EA.ask('backlog', { estate: estate });
    // v1.26.1: keep only a whole answer (a phone showed "b.field is undefined" and the screen would not open).
    if (b && Array.isArray(b.field)) { EA.local.set(backlogKey(estate), b); document.dispatchEvent(new CustomEvent('fh:backlog')); }
    refreshRounds(estate);   // v1.22: rounds for Tambah kerja, after the backlog (never two at once)
    return b;
  }
  function localBacklog(estate) {
    var cut = [], col = [], dis = [];
    EA.local.get('fh.work', []).forEach(function (s) {
      if (s.estate !== estate) return;
      s.rec.lines.forEach(function (l) { if (l.task_code === EA.lists.HARVEST) cut.push({ date: s.date, lot: l.lot, block: l.block, bunches: l.bunches }); });
    });
    EA.local.get('fh.collect', []).forEach(function (s) {
      if (s.estate !== estate) return;
      s.lines.forEach(function (l) { col.push({ date: s.date, at: s.at, lot: l.lot, block: l.block, bunches: l.bunches, cleared: l.cleared }); });
      var d = s.dispatch;
      if (!d || d.replacedBy) return;     // a corrected delivery note: the new one counts
      if (d.blocks) Object.keys(d.blocks).forEach(function (b) { dis.push({ date: s.date, at: s.at, block: b, bunches: d.blocks[b], ramp_cleared: d.ramp_cleared }); });
      else dis.push({ date: s.date, at: s.at, block: '', bunches: d.bunches, ramp_cleared: d.ramp_cleared });
      if (d.ramp_cleared === 'Y' && d.blocks && !Object.keys(d.blocks).length) dis.push({ date: s.date, at: s.at, block: '', bunches: 0, ramp_cleared: 'Y' });
    });
    var b = calcBacklog(cut, col, dis, EA.today());
    b.ok = true; b.estate = estate; b.at = EA.today() + ' ' + EA.ui.hhmm(new Date()); b.local = true;
    b.grading = EA.fh.ticket && EA.fh.ticket.gradingAlerts ? EA.fh.ticket.gradingAlerts(estate) : [];
    b.tonnage = localTonnage(estate);
    return b;
  }

  // ===== calcBacklog: the same text is in rooms/field/muster.js and server/core.gs =====
  // cut: harvesters' bunches [{date, lot, block, bunches}]
  // col: loader's collection [{date, lot, block, bunches, cleared}]
  // dis: lorry loads [{date, block, bunches, ramp_cleared}]; col and dis may carry keyed_at (or at, HH:mm)
  // Field backlog per lot = cut - collected since the lot was last cleared ("Habis").
  // Count check: when a lot is cleared and the mandor's count and the loader's count
  // since the clearing before differ (last 7 days), or the loader has collected more
  // than was cut. Ramp backlog per block = collected - sent since the ramp was last empty.
  function calcBacklog(cut, col, dis, today) {
    function n(v) { return Number(v) || 0; }
    // Harvest keyed by block only (no lot yet, v1.1) counts as one lot "Blk 03" for that block.
    function asLot(r) { return r.lot ? r : Object.assign({}, r, { lot: r.block ? 'Blk ' + r.block : '' }); }
    cut = cut.map(asLot); col = col.map(asLot);
    function byLot(a, b) { return String(a.lot).localeCompare(String(b.lot), undefined, { numeric: true }); }
    var d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 7);
    var weekAgo = d.toISOString().slice(0, 10);
    var clears = {};
    col.forEach(function (r) {
      if (!r.lot || r.cleared !== 'Y') return;
      var c = clears[r.lot] = clears[r.lot] || [];
      if (c.indexOf(r.date) < 0) c.push(r.date);
    });
    Object.keys(clears).forEach(function (k) { clears[k].sort(); });
    var lots = {};
    function lotOf(r) { return lots[r.lot] || (lots[r.lot] = { lot: r.lot, block: r.block || '', cut: 0, col: 0, wCut: 0, wCol: 0, since: '' }); }
    function place(r) {
      var c = clears[r.lot] || [], last = c.length ? c[c.length - 1] : '', prev = c.length > 1 ? c[c.length - 2] : '';
      if (!last || r.date > last) return 'open';
      return r.date > prev ? 'window' : 'old';
    }
    cut.forEach(function (r) {
      if (!r.lot) return;
      var x = lotOf(r), p = place(r);
      if (p === 'open') { x.cut += n(r.bunches); if (!x.since || r.date < x.since) x.since = r.date; }
      else if (p === 'window') x.wCut += n(r.bunches);
    });
    col.forEach(function (r) {
      if (!r.lot) return;
      var x = lotOf(r), p = place(r);
      if (p === 'open') x.col += n(r.bunches);
      else if (p === 'window') x.wCol += n(r.bunches);
    });
    var field = [], checks = [];
    Object.keys(lots).forEach(function (k) {
      var x = lots[k], c = clears[k] || [], last = c.length ? c[c.length - 1] : '';
      if (x.cut > x.col) field.push({ lot: x.lot, block: x.block, bunches: x.cut - x.col, since: x.since });
      if (x.col > x.cut) checks.push({ lot: x.lot, block: x.block, mandor: x.cut, loader: x.col, cleared: '' });
      if (last && last >= weekAgo && x.wCut !== x.wCol) checks.push({ lot: x.lot, block: x.block, mandor: x.wCut, loader: x.wCol, cleared: last });
    });
    field.sort(byLot); checks.sort(byLot);
    // The ramp is worked out by day AND time keyed (v1.3), so a lorry that empties the ramp
    // at noon does not hide bunches collected later that day, and an earlier lorry the same
    // day is not taken off twice.
    function when(r) { var t = String(r.keyed_at || r.at || ''); return r.date + ' ' + (/\d\d:\d\d$/.test(t) ? t.slice(-5) : '00:00'); }
    var empty = '';
    dis.forEach(function (r) { if (r.ramp_cleared === 'Y' && when(r) > empty) empty = when(r); });
    var blocks = {}, since = '', inAll = 0, outAll = 0;
    function blk(b) { return blocks[b] || (blocks[b] = { block: b, bunches: 0 }); }
    col.forEach(function (r) {
      if (empty && when(r) <= empty) return;
      inAll += n(r.bunches); blk(r.block || '').bunches += n(r.bunches);
      if (n(r.bunches) && (!since || r.date < since)) since = r.date;
    });
    dis.forEach(function (r) {
      if (!empty || when(r) > empty) { outAll += n(r.bunches); blk(r.block || '').bunches -= n(r.bunches); }
    });
    // A lorry keyed without its block (before v12) cannot be split, so then no block list is shown.
    var rampBlocks = blocks[''] && blocks[''].bunches < 0 ? [] : Object.keys(blocks).map(function (k) { return blocks[k]; })
      .filter(function (b) { return b.block && b.bunches > 0; })
      .sort(function (a, b) { return a.block < b.block ? -1 : 1; });
    var ramp = Math.max(0, inAll - outAll);
    return { field: field, fieldTotal: field.reduce(function (a, x) { return a + x.bunches; }, 0),
             ramp: { bunches: ramp, since: ramp ? since : '', blocks: rampBlocks }, checks: checks };
  }
  // ===== end calcBacklog =====

  function shortDate(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  // Test copy (no office link): month-to-date tonnes from this phone's tickets, by delivery note date.
  function localTonnage(estate) {
    var m = EA.today().slice(0, 7), mt = 0, bunches = 0, n = 0, blocks = {};
    EA.local.get('fh.tickets', []).forEach(function (t) {
      var d = (t.dnRef && t.dnRef.date) || t.date;
      if (t.estate !== estate || String(d).slice(0, 7) !== m) return;
      mt += Number(t.nett) || 0; bunches += Number(t.bunches) || 0; n++;
      Object.keys(t.split || {}).forEach(function (b) { blocks[b] = Math.round(((blocks[b] || 0) + t.split[b].mt) * 1000) / 1000; });
    });
    mt = Math.round(mt * 1000) / 1000;
    return { month: m, mt: mt, bunches: bunches, tickets: n, abw: bunches ? Math.round(mt * 100000 / bunches) / 100 : 0, blocks: blocks };
  }
  function tonnageText(t) {
    if (!t) return '';
    return Number(t.mt || 0).toFixed(2) + ' MT · ' + (t.tickets || 0) + ' tiket · ' + (t.bunches || 0) + ' tandan' + (t.abw ? ' · ABW ' + t.abw + ' kg' : '');
  }
  function rampText(r) {
    if (!r || !r.bunches) return '';
    return (r.blocks && r.blocks.length ? r.blocks.map(function (x) { return 'Blk ' + x.block + ' ' + x.bunches; }).join(', ') + ', ' : '') + 'sejak ' + shortDate(r.since);
  }
  function checkText(x) {
    return x.lot + ': mandor ' + x.mandor + ', pemuat ' + x.loader + ' (beza ' + (x.loader - x.mandor > 0 ? '+' : '') + (x.loader - x.mandor) + (x.cleared ? ', habis ' + shortDate(x.cleared) : '') + ')';
  }
  function backlogLines(b) {
    if (!b) return [];
    var L = (b.tonnage ? ['Tan bulan ini · Month to date: ' + tonnageText(b.tonnage)] : []).concat(['Baki ladang · Field: ' + (b.fieldTotal || 0) + ' tandan' + (b.field && b.field.length ? ' (' + b.field.map(function (x) { return x.lot + ' ' + x.bunches; }).join(', ') + ')' : ''),
             'Baki ramp · Ramp: ' + ((b.ramp && b.ramp.bunches) || 0) + ' tandan' + (b.ramp && b.ramp.bunches ? ' (' + rampText(b.ramp) + ')' : '')]);
    return L;
  }
  function backlogCard(estate) {
    var b = getBacklog(estate);
    var t = b && b.tonnage;
    var body = !b ? '<p class="hint">' + EA.t('Belum ada. Perlu isyarat sekali untuk ambil dari pejabat.', 'Not yet: needs signal once to get it from the office.') + '</p>' :
      (t ? '<div class="list-line"><div><b>' + EA.t('Tan bulan ini: ', 'Month to date: ') + Number(t.mt || 0).toFixed(2) + ' MT</b><span class="en">' +
        (t.tickets ? esc(t.tickets + ' tiket · ' + t.bunches + ' tandan' + (t.abw ? ' · ABW ' + t.abw + ' kg' : '')) : EA.t('Belum ada tiket bulan ini', 'No tickets this month yet')) + '</span>' +
        (Object.keys(t.blocks || {}).length ? '<span class="en">' + Object.keys(t.blocks).sort().map(function (k) { return 'Blk ' + esc(k) + ' ' + Number(t.blocks[k]).toFixed(2); }).join(' · ') + '</span>' : '') +
        '<span class="en">' + EA.t('Bajet akan datang bila bajet 2027 dimuatkan', 'Budget to date comes when the 2027 budget is loaded') + '</span></div></div>' : '') +
      '<div class="list-line"><div><b>' + EA.t('Ladang: ', 'Field: ') + (b.fieldTotal || 0) + EA.t(' tandan', ' bunches') + '</b><span class="en">' +
        (b.field && b.field.length ? b.field.map(function (x) { return EA.t('Petak ', 'Lot ') + esc(x.lot) + ': ' + x.bunches + EA.t(' (sejak ', ' (since ') + shortDate(x.since) + ')'; }).join(' · ') : EA.t('Tiada baki', 'None left')) + '</span></div></div>' +
      '<div class="list-line"><div><b>Ramp: ' + ((b.ramp && b.ramp.bunches) || 0) + EA.t(' tandan', ' bunches') + '</b><span class="en">' +
        (b.ramp && b.ramp.bunches ? EA.t('Belum dihantar ke kilang: ', 'Not yet sent to the mill: ') + esc(rampText(b.ramp)) : EA.t('Kosong', 'Empty')) + '</span></div></div>' +
      '<p class="hint">' + (b.local ? EA.t('Dikira dari telefon ini (salinan ujian)', 'Worked out from this phone (test copy)') : EA.t('Dikira pejabat ', 'Worked out by the office ') + esc(b.at)) + '</p>';
    return '<section class="card" id="fh-backlog" data-estate="' + esc(estate) + '" aria-labelledby="fh-bl"><div class="room-top"><h2 id="fh-bl" class="grow"><span class="inline"><span class="bm">Tan & baki buah</span> · <span class="en">Tonnes and crop backlog</span></span></h2>' +
      '<button type="button" class="btn btn-ghost" data-refresh-backlog="1">REFRESH<small>Kemas kini</small></button></div>' + body + '</section>';
  }
  function wireBacklog(container, estate) {
    container.querySelectorAll('[data-refresh-backlog]').forEach(function (b) {
      b.onclick = async function () {
        b.disabled = true;
        var r = await refreshBacklog(estate);
        b.disabled = false;
        if (!r) EA.ui.toast(EA.t('Tiada isyarat atau pautan', 'No signal or link'), 'wait');
      };
    });
  }
  document.addEventListener('fh:backlog', function () {
    var card = document.getElementById('fh-backlog');
    if (!card) return;
    var estate = card.dataset.estate;
    card.outerHTML = backlogCard(estate);
    wireBacklog(document, estate);
    var slot = document.getElementById('fh-alert-slot');
    if (slot && el && ctx && draft) { slot.innerHTML = alertSection(); wireAlerts(); }
  });

  // ---------- alerts (Amaran): backlog the Assistant Manager must look into ----------
  // Every morning the chit lists what is wrong with yesterday's crop: bunches still in
  // the field, bunches waiting at the ramp from before yesterday, and lots where the
  // mandor's and the loader's counts differ. The staff says what happened for each;
  // it goes on the chit and in the WhatsApp text for the Assistant Manager to follow up.
  function alertsFrom(b) {
    var out = [], today = EA.today();
    if (!b) return out;
    var yday = new Date(today + 'T00:00:00Z'); yday.setUTCDate(yday.getUTCDate() - 1); yday = yday.toISOString().slice(0, 10);
    (b.field || []).forEach(function (x) {
      if (x.since && x.since >= today) return;
      out.push({ key: 'F:' + x.lot, kind: 'field', block: x.block, lot: x.lot, detail: x.bunches + ' tandan sejak ' + shortDate(x.since),
                 bm: 'Buah tertinggal di ladang, petak ' + x.lot + ': ' + x.bunches + ' tandan sejak ' + shortDate(x.since), en: 'Bunches left in the field' });
    });
    // v1.1: no tally between the mandor, the loader and the staff for now, so no count alerts.
    // Poor mill grading (keyed by the clerk): the staff says what is going on in the estate,
    // once; after that morning it is closed (the office no longer sends it).
    var explained = {};
    chits().forEach(function (c) { if (c.estate === b.estate && c.date < today) (c.alerts || []).forEach(function (a) { if (a.kind === 'grading' && a.note) explained[a.key] = true; }); });
    (b.grading || []).forEach(function (g) {
      if (explained['G:' + g.ticket_no]) return;
      out.push({ key: 'G:' + g.ticket_no, kind: 'grading', block: '', lot: '', ref: g.ticket_no, detail: 'Tiket ' + g.ticket_no + ': ' + g.flag,
                 bm: 'Gred kilang tiket ' + g.ticket_no + ' (' + shortDate(g.date) + '): ' + g.flag, en: 'Poor mill grading: what is going on in the estate?' });
    });
    if (b.ramp && b.ramp.bunches && b.ramp.since && b.ramp.since < yday) {
      out.push({ key: 'R:' + b.ramp.since, kind: 'ramp', block: '', lot: '', detail: b.ramp.bunches + ' tandan, ' + rampText(b.ramp),
                 bm: 'Buah lama di ramp: ' + b.ramp.bunches + ' tandan (' + rampText(b.ramp) + ')', en: 'Bunches waiting at the ramp for more than a day' });
    }
    return out;
  }
  function alertNote(key, def) {
    if (draft.alertNotes[key] != null) return { note: draft.alertNotes[key], carried: false };
    var prev = chits().filter(function (c) { return c.estate === ctx.estate && c.date < EA.today(); })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    for (var i = 0; i < prev.length; i++) {
      var a = (prev[i].alerts || []).find(function (x) { return x.key === key; });
      if (a) return { note: a.note, carried: true, date: prev[i].date };
    }
    return { note: def || '', carried: false };
  }
  function alertSection() {
    var list = alertsFrom(getBacklog(ctx.estate));
    if (!list.length) return '';
    return '<section class="card alert-card" id="fh-alerts" aria-labelledby="fh-s0"><h2 id="fh-s0"><span class="step">!</span><span class="inline"><span class="bm">Amaran</span> · <span class="en">Alerts for the Assistant Manager</span></span></h2>' +
      '<p class="hint">' + EA.t('Tulis apa berlaku dan tindakan. Masuk chit dan WhatsApp untuk Penolong Pengurus.', 'Say what happened and the action. It goes on the chit and to WhatsApp for the Assistant Manager.') + '</p>' +
      list.map(function (a) {
        var n = alertNote(a.key, a.def);
        return '<div class="field"><label for="al-' + esc(a.key) + '"><span class="bm">' + esc(a.bm) + '</span><span class="en">' + esc(a.en) +
          (n.carried ? ' · ' + EA.t('dari chit ' + esc(shortDate(n.date)) + ', tukar jika ada berita baru', 'from the chit of ' + esc(shortDate(n.date)) + ', change if there is news') : '') + '</span></label>' +
          '<input id="al-' + esc(a.key) + '" class="text-input" data-alert="' + esc(a.key) + '" value="' + esc(n.note) + '" placeholder="' + EA.t('Apa berlaku / tindakan', 'What happened / action') + '"></div>';
      }).join('') + '</section>';
  }
  function wireAlerts() {
    el.querySelectorAll('#fh-alerts [data-alert]').forEach(function (i) {
      if (draft.alertNotes[i.dataset.alert] == null && i.value) { draft.alertNotes[i.dataset.alert] = i.value; }
      i.oninput = function () { draft.alertNotes[i.dataset.alert] = i.value; keepDraft(); };
    });
    keepDraft();
  }
  function chitAlerts() {
    return alertsFrom(getBacklog(ctx.estate)).map(function (a) {
      return { key: a.key, kind: a.kind, block: a.block, lot: a.lot, ref: a.ref || '', detail: a.detail, text: a.bm, note: String(alertNote(a.key, a.def).note || '').trim() };
    });
  }

  function render(container, c) {
    // v1.12: the clerk opens on Tiket and otherwise sees Operasi; the manager sees only Operasi.
    if (c.user.role === 'Clerk' && (c.screen === '' || c.screen === 'ticket') && EA.fh.ticket) return EA.fh.ticket.render(container, Object.assign({}, c, { screen: 'ticket' }));
    if (viewOnly(c.user) && EA.fh.history) return EA.fh.history.render(container, Object.assign({}, c, { screen: 'history' }));
    if (c.user.role === 'Worker' || c.screen === 'collect') return EA.fh.collect.render(container, c);
    if (c.screen === 'work' && EA.fh.work) return EA.fh.work.render(container, c);
    if (c.screen === 'ticket' && EA.fh.ticket) return EA.fh.ticket.render(container, c);
    if (c.screen === 'history' && EA.fh.history) return EA.fh.history.render(container, c);
    el = container; ctx = c;
    draft = loadDraft();
    var testing = !EA.roomLive(ctx.room, ctx.estate);
    var head = '<div class="room-top">' +
      '<button type="button" class="back-btn" id="fh-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<div class="grow"><h1>' + EA.t('Chit muster pagi', 'Morning muster chit') + '</h1><span class="brand-sub">' + esc(ctx.estate) + '</span></div>' +
      (testing ? '<span class="test-badge">' + EA.t('UJIAN', 'TEST') + '</span>' : '') + '</div>' + tabs('muster', ctx.user);

    if (!canKey(ctx.user)) {
      el.innerHTML = head + '<div class="card"><p><span class="bm">Pandangan pejabat untuk chit muster akan datang kemudian.</span>' +
        '<span class="en">The office view of muster chits comes later.</span></p></div>' + todayCard();
      wireCommon();
      return;
    }
    // A real person on a phone that has not yet got the people list from the office (v1.9).
    if (EA.lists.needPeople && EA.lists.needPeople(ctx.estate)) {
      el.innerHTML = head + '<div class="card"><p class="warn">' + EA.t('Senarai pekerja belum dimuat di telefon ini. Dapatkan isyarat sekali, kemudian tekan MUAT SENARAI.',
        'The people list is not on this phone yet. Get signal once, then tap LOAD LIST.') + '</p>' +
        '<div class="actions"><button class="btn btn-main" type="button" id="fh-loadppl">LOAD LIST<small>Muat senarai</small></button></div></div>';
      wireCommon();
      el.querySelector('#fh-loadppl').onclick = async function () {
        this.disabled = true;
        var got = await EA.lists.refreshPeople(true);
        this.disabled = false;
        if (got) render(container, c); else ui().toast(EA.t('Tiada isyarat atau pejabat sibuk. Cuba lagi.', 'No signal or the office is busy. Try again.'), 'wait');
      };
      return;
    }
    var started = draft.jobs.length || Object.keys(draft.marks).length || draft.replacing || draft.newChit;
    if (todaysChits().length && !started) {
      el.innerHTML = head +
        '<p class="msg ok-msg"><span class="bm">Chit hari ini sudah disimpan. Tekan VIEW untuk lihat, atau CORRECT untuk betulkan.</span>' +
        '<span class="en">Today\'s chit is saved. Tap VIEW to see it, or CORRECT to fix it.</span></p>' +
        todayCard() + backlogCard(ctx.estate) +
        '<button type="button" class="btn btn-ghost" id="fh-new">+ NEW CHIT<small>Chit baru (' + EA.t('jarang perlu', 'rarely needed') + ')</small></button>';
      $('#fh-new').onclick = function () { draft.newChit = true; keepDraft(); render(el, ctx); };
      wireCommon(); wireBacklog(el, ctx.estate); refreshBacklog(ctx.estate);
      return;
    }
    var d = new Date();
    el.innerHTML = head +
      (d.getDay() === 0 ? '<p class="warn"><span class="bm">Hari Ahad: kerja perlu kelulusan Penolong Pengurus sebelum dikira untuk gaji.</span><span class="en">Sunday: work needs the Assistant Manager\'s approval before it counts for pay.</span></p>' : '') +
      (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan chit ' + esc(draft.replacing) + '. Chit lama kekal; yang baru menggantikannya.</span><span class="en">Correcting chit ' + esc(draft.replacing) + '. The old one stays on record; this one replaces it.</span></p>' : '') +

      backlogCard(ctx.estate) + '<div id="fh-alert-slot">' + alertSection() + '</div>' +
      '<section class="card" aria-labelledby="fh-s1"><h2 id="fh-s1"><span class="step">1</span><span class="inline"><span class="bm">Kerja hari ini</span> · <span class="en">Today\'s jobs</span></span></h2>' +
      '<p class="hint">' + esc(ui().dayBm[d.getDay()] + ', ' + d.getDate() + ' ' + ui().monBm[d.getMonth()] + ' ' + d.getFullYear()) + ' · ' + esc(ctx.estate) + '</p>' +
      (lastChit() && !draft.jobs.length ? '<div class="list-line copy-last"><div><b>Sama seperti chit ' + esc(niceDate(lastChit().date)) + '?</b>' +
        '<span class="en">Copy its jobs and who was on each, then change only what is different. Sick, leave and absent are not copied.</span></div>' +
        '<div class="acts"><button type="button" class="btn btn-ok" id="fh-copy">SAME AS LAST<small>Salin chit lepas</small></button></div></div>' : '') +
      '<div id="fh-jobs"></div>' +
      '<button type="button" class="btn btn-ghost" id="fh-addjob">+ ADD JOB<small>Tambah kerja</small></button>' +
      '</section>' +

      '<section class="card" aria-labelledby="fh-s2"><h2 id="fh-s2"><span class="step">2</span><span class="inline"><span class="bm">Kehadiran</span> · <span class="en">Attendance</span></span></h2>' +
      '<p class="hint">' + EA.t('H Hadir &nbsp; S Sakit &nbsp; C Cuti &nbsp; T Tak hadir &nbsp; ⋯ Hari Buruh / Pindah. Tekan sekali lagi untuk buang.', 'H present &nbsp; S sick &nbsp; C leave &nbsp; T absent &nbsp; ⋯ labour day / transfer. Tap again to clear.') + '</p>' +
      '<div class="rows" id="fh-rows"></div>' +
      '</section>' +

      // v1.17: no rain question here. Sugut rain is keyed once, in the Sugut DMS (decided 20 Oct 2026).
      '<section class="card" aria-labelledby="fh-s4"><h2 id="fh-s4"><span class="step">3</span><span class="inline"><span class="bm">Chit</span> · <span class="en">The chit</span></span></h2>' +
      '<div id="fh-table"></div></section>' +

      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="fh-check">SAVE CHIT<small>Simpan chit</small></button></div>' +
      todayCard();

    $('#fh-addjob').onclick = function () { editJob(null); };
    if ($('#fh-copy')) $('#fh-copy').onclick = copyLast;
    // A comma is a decimal point too (many phone keyboards show only a comma): 2,5 = 2.5 mm.
    $('#fh-check').onclick = check;
    wireAlerts();
    drawAll();
    wireCommon(); wireBacklog(el, ctx.estate); refreshBacklog(ctx.estate);
  }

  function drawAll() { drawJobs(); drawRows(); drawTable(); }
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
    ui().toast(EA.t('Disalin. Ubah petak dan yang berbeza', 'Copied. Change the lots and anything different'));
  }
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
      // The mandor in charge is not one of the workers in the target (v1.3).
      var nw = rows.filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j && r.worker_id !== j.mandor; }).length;
      var li = lotsInfo(j.lots), tg = targetLine(j, nw, li);
      return '<div class="list-line' + (tg && tg.short ? ' flag-line' : '') + '"><div><b>' + esc(sec.code + '. ' + j.task + ' ' + jobName(j.task)) + '</b><span class="en">' +
        (j.block ? 'Blok ' + esc(j.block) : '') + (j.lots.length ? ' · Petak ' + esc(j.lots.join(', ')) + ' (' + li.ha.toFixed(2) + ' Ha)' : '') +
        (j.mandor ? ' · Mandor ' + esc(person(j.mandor)) : '') + '</span>' +
        (tg ? '<span class="en' + (tg.short ? ' warn-t' : '') + '">' + tg.text + '</span>' : '') + '</div>' +
        '<div class="acts"><span class="pill plain">' + n + ' orang</span>' +
        '<button type="button" class="btn btn-ghost" data-pick="' + j.key + '">PICK<small>Pilih orang</small></button>' +
        '<button type="button" class="btn btn-ghost" data-edit="' + j.key + '">EDIT<small>Ubah</small></button></div></div>';
    }).join('') : '<p class="hint">' + EA.t('Belum ada kerja. Tekan + ADD JOB untuk setiap kerja hari ini.', 'No jobs yet. Tap + ADD JOB for each job today.') + '</p>';
    el.querySelectorAll('#fh-jobs [data-edit]').forEach(function (b) { b.onclick = function () { editJob(b.dataset.edit); }; });
    el.querySelectorAll('#fh-jobs [data-pick]').forEach(function (b) { b.onclick = function () { pickPeople(b.dataset.pick); }; });
  }

  // The day's target for a job (from the 2025 performance standard): people x target per person.
  // For an Ha job the planned lots are set against it; a plan lower than the target is shown red.
  function targetLine(j, n, li) {
    var t = EA.lists.target && EA.lists.target(j.task, ctx.estate);
    if (!t) return null;
    var u = t.unit === 'bag' ? 'beg' : t.unit === 'palm' ? 'pokok' : t.unit;
    if (!n) return { text: esc(EA.t('Sasaran: ', 'Target: ') + t.per + ' ' + u + ' ' + EA.t('seorang', 'per person')), short: false };
    var total = Math.round(t.per * n * 100) / 100;
    var base = EA.t('Sasaran: ', 'Target: ') + n + ' × ' + t.per + ' = <b>' + total + ' ' + esc(u) + '</b>';
    if (t.unit !== 'Ha') return { text: base, short: false };
    if (!j.lots.length) return { text: base + ' · ' + EA.t('pilih petak', 'choose the lots'), short: true };
    if (li.ha + 0.005 < total) return { text: base + ' · ' + EA.t('rancangan', 'planned') + ' <b>' + li.ha.toFixed(2) + ' Ha</b>: ' + EA.t('KURANG ' + (total - li.ha).toFixed(2) + ' Ha', (total - li.ha).toFixed(2) + ' Ha below target'), short: true };
    return { text: base + ' · ' + EA.t('rancangan', 'planned') + ' ' + li.ha.toFixed(2) + ' Ha ✓', short: false };
  }

  function unmarked() {
    var taken = onOtherChit();
    return everyone().filter(function (w) { return !draft.marks[w.id] && !taken[w.id]; });
  }
  function drawRows() {
    var taken = onOtherChit();
    var left = unmarked();
    $('#fh-rows').innerHTML = (left.length ? '<p class="warn"><span class="bm">' + left.length + ' orang belum ditanda.</span><span class="en">' + left.length + ' people not marked yet.</span></p>' : '<p class="hint">' + EA.t('Semua orang sudah ditanda.', 'Everyone is marked.') + '</p>') +
      everyone().map(function (w) {
      var other = taken[w.id];
      var m = draft.marks[w.id] || '';
      var j = m === 'H' ? jobFor(w.id) : null;
      var line = '';
      if (other) line = '<span class="hint">' + EA.t('Sudah dalam chit lain ', 'Already on chit ') + esc(other) + '</span>';
      else if (m === 'H') {
        line = draft.jobs.length ? '<div class="picks">' + draft.jobs.map(function (x) {
          return '<button type="button" class="pick" data-w="' + w.id + '" data-job="' + x.key + '" aria-pressed="' + (j === x) + '"><b>' + esc(x.task) + '</b><small>' + esc(x.block ? 'Blk ' + x.block : jobName(x.task)) + '</small></button>';
        }).join('') + '</div>' + (j ? '' : '<b class="bad-text">' + EA.t('Pilih kerja', 'Choose a job') + '</b>') : '<b class="bad-text">' + EA.t('Tambah kerja dahulu', 'Add a job first') + '</b>';
      } else if (m && m !== 'H') line = '<span class="pill plain">' + esc(EA.t(MARKS[m][0], MARKS[m][1])) + '</span>' + (m === 'T' ? lariFlag(w) : '');
      var more = (m === 'L' || m === 'X') ? m : '⋯';
      return '<div class="wrow' + (other ? ' off' : '') + '">' +
        '<div class="who-w"><b>' + esc(w.name) + '</b><span class="en">' + esc(w.id) + ' · ' + (w.mdr ? 'Mandor' : esc(w.gang)) + ' · ' + (w.sex === 'F' ? 'P' : 'L') + '</span></div>' +
        '<div class="seg" role="group" aria-label="' + esc(w.id) + '">' + ['H', 'S', 'C', 'T'].map(function (k) {
          return '<button type="button" data-w="' + w.id + '" data-k="' + k + '" aria-pressed="' + (m === k) + '" title="' + EA.t(MARKS[k][0], MARKS[k][1]) + '"' + (other ? ' disabled' : '') + '>' + k + '</button>';
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
          '<div class="actions"><button class="btn btn-ghost" type="button" data-r="L">LABOUR DAY<small>Hari buruh</small></button>' +
          '<button class="btn btn-ghost" type="button" data-r="X">TRANSFER<small>Pindah</small></button></div>' +
          '<div class="actions"><button class="btn btn-ghost" type="button" data-r="">CLEAR<small>Buang</small></button></div>',
          function (s) { s.querySelectorAll('[data-r]').forEach(function (x) { x.onclick = function () { ui().closeSheet(); setMark(w, x.dataset.r); }; }); });
      };
    });
    el.querySelectorAll('#fh-rows [data-lari]').forEach(function (b) { b.onclick = function () { tellClerk(b.dataset.lari, b.dataset.days); }; });
    el.querySelectorAll('#fh-rows .pick[data-job]').forEach(function (b) {
      b.onclick = function () { draft.jobOf[b.dataset.w] = b.dataset.job; keepDraft(); drawJobs(); drawRows(); drawTable(); };
    });
  }

  // v1.25: T (Tak hadir) on the last 2 chit days before today and again today: "Mungkin lari?".
  // The staff only tells the clerk (an FH_ALERT line, kind absent3); the worker list does not change.
  function absentDays(id) {
    var today = EA.today(), days = {};
    chits().forEach(function (c) {
      if (c.estate !== ctx.estate || c.date >= today) return;
      var r = (c.rows || []).find(function (x) { return x.worker_id === id && x.status !== 'removed'; });
      if (r) days[c.date] = days[c.date] || r.muster; else if (!days[c.date]) days[c.date] = '';
    });
    var last = Object.keys(days).sort().reverse().slice(0, 2);
    return last.length === 2 && last.every(function (d) { return days[d] === 'T'; }) ? last.reverse().concat([today]) : null;
  }
  function lariFlag(w) {
    var d = absentDays(w.id);
    if (!d) return '';
    var sent = (EA.local.get('fh.lariSent', {}) || {})[ctx.estate + '|' + w.id];
    if (sent && sent >= d[0]) return '<div class="flag-lari sent">' + EA.t('Sudah diberitahu kerani', 'The clerk has been told') + '</div>';
    return '<div class="flag-lari"><span>' + EA.t('T 3 hari berturut · Mungkin lari?', 'Absent 3 days in a row · Maybe absconded?') + '</span>' +
      '<button type="button" data-lari="' + esc(w.id) + '" data-days="' + esc(d.join(' ')) + '">' + EA.t('BERITAHU KERANI', 'TELL THE CLERK') + '</button></div>';
  }
  function tellClerk(id, days) {
    EA.save(TAB_ALERT, ROOM, ctx.estate, { kind: 'absent3', ref: id, detail: 'T: ' + days, staff_note: 'Diberitahu kerani' });
    var m = EA.local.get('fh.lariSent', {}) || {}; m[ctx.estate + '|' + id] = EA.today(); EA.local.set('fh.lariSent', m);
    ui().toast(EA.t('Kerani akan nampak di skrin Pekerja', 'The clerk will see it on the Workers screen'));
    drawRows();
  }

  function setMark(w, k) {
    if (k) draft.marks[w] = k; else delete draft.marks[w];
    if (k === 'H' && !jobFor(w) && draft.jobs.length === 1) draft.jobOf[w] = draft.jobs[0].key;
    if (k !== 'H') delete draft.jobOf[w];
    keepDraft(); drawJobs(); drawRows(); drawTable();
  }

  // v1.22: this block's rounds this year for a job with a yearly plan (from the office, kept on the phone).
  var MON = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  function roundText(code, block) {
    var plan = code && block ? EA.lists.roundPlanFor(ctx.estate, code) : 0;
    if (!plan) return '';
    var b = EA.lists.blocksFor(ctx.estate).find(function (x) { return x.block === block; });
    var data = EA.local.get('fh.rounds.' + ctx.estate, null);
    if (!b || !data || !data.rounds) return '';
    var r = data.rounds[code + '|' + block] || { ha: 0, last: '' }, done = r.ha / b.ha;
    var last = r.last ? MON[Number(r.last.slice(5, 7)) - 1] : '—';
    var cls = done + 0.05 < plan * (new Date().getMonth() + 1) / 12 - 1 ? ' late' : '';
    return '<b class="' + cls + '">Blk ' + esc(block) + ' · ' + esc(code) + ': ' + (Math.round(done * 10) / 10) + ' / ' + plan + EA.t(' pusingan', ' rounds') + '</b> · ' +
      EA.t('terakhir ', 'last ') + last + ' · ' + EA.t('tahun ini', 'this year');
  }
  async function refreshRounds(estate) {
    if (!EA.sendLink()) return;
    var r = await EA.ask('rounds', { estate: estate });
    if (r && r.rounds) EA.local.set('fh.rounds.' + estate, { at: Date.now(), rounds: r.rounds, lots: r.lots || {} });
  }

  // Add or change one job.
  function editJob(key) {
    var j0 = key ? job(key) : null;
    var pick = j0 ? { task: j0.task, block: j0.block, lots: j0.lots.slice(), mandor: j0.mandor } : { task: '', block: '', lots: [], mandor: '' };
    var used = key ? draftRows().filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j0; }).length : 0;
    ui().openSheet(
      '<h2 id="sheet-title"><span class="bm">' + (key ? 'Ubah kerja' : 'Tambah kerja') + '</span><span class="en">' + (key ? 'Change job' : 'Add a job') + '</span></h2>' +
      '<div class="field"><span class="inline"><span class="bm">Kerja biasa</span> · <span class="en">Usual jobs</span></span><div class="picks jb-quick" id="jb-quick">' +
        EA.lists.quickJobsFor(ctx.estate).map(function (c) { var t = task(c); return '<button type="button" class="pick" data-quick="' + c + '" aria-pressed="' + (c === pick.task) + '"><b>' + c + '</b><small>' + esc(EA.t(t.bm, t.en)) + '</small></button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="jb-task"><span class="bm">Kerja (semua kod)</span><span class="en">Job code (all codes)</span></label><select id="jb-task" class="text-input">' + taskOptions(pick.task) + '</select></div>' +
      '<p class="msg ok-note" id="jb-noblock" hidden><span class="bm">✓ Tidak perlu blok untuk kerja ini</span><span class="en">✓ No block needed for this job</span></p>' +
      '<div id="jb-where"><div class="field"><label for="jb-block"><span class="bm">Blok</span><span class="en">Block</span></label><select id="jb-block" class="text-input"></select></div>' +
      '<p class="hint jb-round" id="jb-round" hidden></p>' +
      '<div class="field"><span class="inline"><span class="bm">Petak · jika tahu</span> · <span class="en">Lots, if known</span></span><div id="jb-lots"></div>' +
        '<p class="hint"><span class="bm">Belum pasti petak? Boleh isi petang di Kerja.</span><span class="en">Lots not sure yet? Add them in the afternoon in Day\'s work.</span></p></div></div>' +
      '<div class="field"><label for="jb-mdr"><span class="bm">Mandor</span><span class="en">Foreman (optional)</span></label><select id="jb-mdr" class="text-input"><option value="">' + EA.t('— Tiada —', '— None —') + '</option>' +
        EA.lists.mandorsFor(ctx.estate).map(function (m) { return '<option value="' + m.id + '"' + (m.id === pick.mandor ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="actions">' + (key ? '<button class="btn btn-ghost" type="button" id="jb-del"' + (used ? ' disabled title="Ada orang dalam kerja ini"' : '') + '>REMOVE<small>Buang</small></button>' : '') +
      '<button class="btn btn-ghost" type="button" id="jb-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="jb-save">SAVE<small>Simpan</small></button></div>' +
      (used ? '<p class="hint">' + EA.t(used + ' orang dalam kerja ini. Pindahkan mereka dahulu untuk buang.', used + ' people on this job; move them first to remove it.') + '</p>' : ''),
      function (s) {
        function fill() {
          var needs = pick.task ? EA.lists.sectionOf(pick.task).block : true;
          // v1.22: general, transport and repair jobs have no block and no lots.
          var noBlock = !!pick.task && !needs;
          if (noBlock) { pick.block = ''; pick.lots = []; }
          s.querySelector('#jb-where').hidden = noBlock;
          s.querySelector('#jb-noblock').hidden = !noBlock;
          s.querySelectorAll('#jb-quick [data-quick]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.quick === pick.task); });
          s.querySelector('#jb-task').value = pick.task;
          var rd = s.querySelector('#jb-round'), rt = roundText(pick.task, pick.block);
          rd.hidden = !rt; rd.innerHTML = rt;
          s.querySelector('#jb-block').innerHTML = blockOptions(pick.block, !needs);
          s.querySelector('#jb-lots').innerHTML = lotPicks(pick.block, pick.lots, pick.task);
          var sg = s.querySelector('#jb-suggest');
          if (sg) sg.onclick = function () { sg.dataset.lots.split(' ').forEach(function (l) { if (pick.lots.indexOf(l) < 0) pick.lots.push(l); }); fill(); };
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
        s.querySelectorAll('#jb-quick [data-quick]').forEach(function (b) { b.onclick = function () { pick.task = b.dataset.quick; fill(); }; });
        s.querySelector('#jb-block').onchange = function () { pick.block = this.value; pick.lots = []; fill(); };
        s.querySelector('#jb-mdr').onchange = function () { pick.mandor = this.value; };
        s.querySelector('#jb-cancel').onclick = ui().closeSheet;
        if (key) s.querySelector('#jb-del').onclick = function () {
          draft.jobs = draft.jobs.filter(function (x) { return x.key !== key; });
          Object.keys(draft.jobOf).forEach(function (w) { if (draft.jobOf[w] === key) delete draft.jobOf[w]; });
          keepDraft(); ui().closeSheet(); drawAll();
        };
        s.querySelector('#jb-save').onclick = function () {
          if (!pick.task) { ui().toast(EA.t('Pilih kerja', 'Choose the job'), 'bad'); return; }
          if (EA.lists.sectionOf(pick.task).block && !pick.block) { ui().toast(EA.t('Kerja ladang perlu blok', 'Field work needs a block'), 'bad'); return; }
          pick.lots = sortLots(pick.lots);
          var same = draft.jobs.find(function (x) { return x.key !== key && x.task === pick.task && x.block === pick.block && x.lots.join(' ') === pick.lots.join(' '); });
          if (same) { ui().toast(EA.t('Kerja ini sudah ada', 'This job is already on the chit'), 'bad'); return; }
          if (j0) { j0.task = pick.task; j0.block = pick.block; j0.lots = pick.lots; j0.mandor = pick.mandor; }
          else { var nj = { key: 'j' + (draft.nextJob++), task: pick.task, block: pick.block, lots: pick.lots, mandor: pick.mandor }; draft.jobs.push(nj);
                 if (pick.mandor && !draft.marks[pick.mandor]) draft.marks[pick.mandor] = 'H'; }
          keepDraft(); ui().closeSheet(); drawAll();
        };
      });
  }

  // Tick the people on one job (quicker than one by one).
  // Pick the people for a job by name (v1.2): grouped by gang, the job's own gang first, with a
  // search box and SAME AS LAST TIME (the people on this job in the last chit).
  function gangFirst(task) {
    var g = (EA.lists.task(task) || {}).group;
    return g === 'HV' ? /Tuai|Harvest/ : g === 'UP' || g === 'PD' || g === 'CS' ? /Rawatan|Maintenance/ : g === 'TR' || g === 'WS' ? /Pemandu|Driver|Muat|Load/ : /Am|General/;
  }
  function pickPeople(key) {
    var j = job(key), taken = onOtherChit();
    var list = EA.lists.workersFor(ctx.estate).filter(function (w) { return !taken[w.id]; });
    var chosen = {};
    list.forEach(function (w) { if (draft.marks[w.id] === 'H' && jobFor(w.id) === j) chosen[w.id] = true; });
    var first = gangFirst(j.task);
    var groups = {}, other = EA.t('Lain-lain', 'Other');
    list.forEach(function (w) { (groups[w.gang || other] = groups[w.gang || other] || []).push(w); });
    var order = Object.keys(groups).sort(function (a, b) { var fa = first.test(a), fb = first.test(b); return fa === fb ? (a < b ? -1 : 1) : (fa ? -1 : 1); });
    var last = lastChit(), before = [];
    if (last) last.rows.forEach(function (r) { if (r.muster === 'H' && r.task_code === j.task && (!j.block || r.block === j.block) && list.some(function (w) { return w.id === r.worker_id; })) before.push(r.worker_id); });
    function card(w) {
      var elsewhere = draft.marks[w.id] && draft.marks[w.id] !== 'H' ? MARKS[draft.marks[w.id]][0] : (draft.marks[w.id] === 'H' && jobFor(w.id) && jobFor(w.id) !== j ? jobFor(w.id).task : '');
      return '<button type="button" class="pick pick-name" data-w="' + w.id + '" data-n="' + esc(String(w.name).toLowerCase()) + '" aria-pressed="' + !!chosen[w.id] + '"><b>' + esc(w.name) + '</b><small>' + esc(w.id + ' · ' + (w.sex === 'F' ? 'P' : 'L') + (elsewhere ? ' · ' + elsewhere : '')) + '</small></button>';
    }
    ui().openSheet('<h2 id="sheet-title"><span class="bm">' + esc(j.task + ' ' + jobName(j.task)) + (j.block ? ' · Blok ' + esc(j.block) : '') + '</span><span class="en">Tick the people on this job</span></h2>' +
      (before.length ? '<div class="actions"><button class="btn btn-ghost" type="button" id="pp-last">SAME AS LAST TIME<small>Sama seperti ' + esc(niceDate(last.date)) + ' · ' + before.length + ' orang</small></button></div>' : '') +
      '<input class="text-input" id="pp-find" placeholder="' + EA.t('Cari nama', 'Search a name') + '" autocomplete="off">' +
      '<div id="pp-list">' + order.map(function (g) {
        return '<p class="hint pick-group"><b>' + esc(g) + '</b></p><div class="picks">' + groups[g].slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; }).map(card).join('') + '</div>';
      }).join('') + '</div>' +
      '<p class="hint">' + EA.t('Yang ditanda menjadi Hadir dalam kerja ini.', 'Ticked people become present on this job.') + '</p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="pp-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="pp-ok">DONE<small>Siap</small></button></div>',
      function (s) {
        s.querySelectorAll('#pp-list .pick').forEach(function (b) {
          b.onclick = function () { var w = b.dataset.w; chosen[w] = !chosen[w]; b.setAttribute('aria-pressed', chosen[w]); };
        });
        if (s.querySelector('#pp-last')) s.querySelector('#pp-last').onclick = function () {
          before.forEach(function (w) { chosen[w] = true; var b = s.querySelector('.pick[data-w="' + w + '"]'); if (b) b.setAttribute('aria-pressed', 'true'); });
        };
        s.querySelector('#pp-find').oninput = function () {
          var q = this.value.trim().toLowerCase();
          s.querySelectorAll('#pp-list .pick').forEach(function (b) { b.hidden = !!q && b.dataset.n.indexOf(q) < 0 && b.dataset.w.toLowerCase().indexOf(q) < 0; });
        };
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
    if (noJob.length) p.push(['Belum ada kerja untuk: ' + noJob.map(person).join(', '), 'No job yet for these people']);
    var taken = onOtherChit();
    var twice = rows.filter(function (r) { return taken[r.worker_id]; }).map(function (r) { return r.worker_id; });
    if (twice.length) p.push(['Sudah dalam chit lain: ' + twice.join(', '), 'Already on another chit: ' + twice.join(', ')]);
    if (!draft.alertNotes) draft.alertNotes = {};
    var noNote = chitAlerts().filter(function (a) { return !a.note; });
    if (noNote.length) p.push(['Tulis apa berlaku untuk setiap amaran (' + noNote.length + ' belum).', 'Say what happened for each alert (' + noNote.length + ' not done).']);
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
        return '<div class="wrow"><div class="who-w"><b>' + esc(w.name) + '</b><span class="en">' + esc(w.id) + ' · ' + (w.mdr ? 'Mandor' : esc(w.gang)) + '</span></div>' +
          '<div class="seg" role="group" aria-label="' + esc(w.id) + '">' + ['S', 'C', 'T'].map(function (k) {
            return '<button type="button" data-lw="' + w.id + '" data-k="' + k + '" aria-pressed="false" title="' + EA.t(MARKS[k][0], MARKS[k][1]) + '">' + k + '</button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<p class="hint">' + EA.t('S Sakit &nbsp; C Cuti &nbsp; T Tak hadir. Yang bekerja: tekan BACK dan beri kerja.', 'S sick &nbsp; C leave &nbsp; T absent. Anyone who worked: tap BACK and give them a job.') + '</p>' +
      '<div class="actions"><button class="btn btn-wait" type="button" id="lo-all">REST ABSENT<small>Baki semua tak hadir</small></button>' +
      '<button class="btn btn-ok" type="button" id="lo-next">NEXT<small>Seterusnya</small></button></div>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="lo-back">‹ BACK<small>‹ BALIK</small></button></div>',
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
            '<p><span class="bm" style="font-weight:400">' + esc(still.map(function (w) { return w.name; }).join(', ')) + '</span><span class="en">Continue only if they are on another chit.</span></p>' +
            '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="st-back">‹ BACK<small>‹ BALIK</small></button>' +
            '<button class="btn btn-ok" type="button" id="st-go">CONTINUE<small>Teruskan</small></button></div>',
            function (s2) { s2.querySelector('#st-back').onclick = function () { ui().closeSheet(); leftoverSheet(still); }; s2.querySelector('#st-go').onclick = function () { ui().closeSheet(); confirmSheet(); }; });
        };
      });
  }

  // v1.1: only the staff and the clerk use the app for now, so the staff saves the chit
  // directly (no mandor confirmation on the phone).
  function confirmSheet() {
    var empty = emptyJobs();
    var preview = chitText(buildChit('(' + EA.t('belum disimpan', 'not saved yet') + ')', EA.ui.hhmm(new Date()), ctx.user.code));
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Semak chit ini</span><span class="en">Check this chit, then save</span></h2>' +
      (empty.length ? '<p class="warn"><span class="bm">Kerja tanpa orang tidak masuk chit: ' + esc(empty.map(function (j) { return j.task; }).join(', ')) + '</span><span class="en">Jobs with nobody are left off the chit.</span></p>' : '') +
      '<pre class="chit">' + esc(preview) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="cf-back">‹ CHANGE<small>‹ UBAH</small></button>' +
      '<button class="btn btn-ok" type="button" id="cf-ok">SAVE<small>Simpan</small></button></div>',
      function (s) {
        s.querySelector('#cf-back').onclick = ui().closeSheet;
        s.querySelector('#cf-ok').onclick = function () { draft.checker = ctx.user.code; keepDraft(); ui().closeSheet(); save(); };
      });
  }

  function buildChit(chitId, confirmedAt, checker) {
    return { chit: chitId, date: EA.today(), estate: ctx.estate, rows: draftRows(), jobs: JSON.parse(JSON.stringify(draft.jobs)),
             rain_mm: draft.rain_mm, rain_time: draft.rain_time, checker: checker, confirmedAt: confirmedAt,
             backlog: getBacklog(ctx.estate), alerts: chitAlerts(),
             keyedBy: ctx.user.code, keyedName: ctx.user.name, rev: 1 };
  }

  function save() {
    var confirmedAt = EA.ui.hhmm(new Date());
    var old = draft.replacing ? todaysChits().find(function (c) { return c.chit === draft.replacing; }) : null;
    var c = buildChit(old ? old.chit : newChitId(), confirmedAt, draft.checker);
    if (old) c.rev = (old.rev || 1) + 1;
    var stamp = c.date + ' ' + confirmedAt;
    try {
      EA.batchStart();
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
      var oldAl = {};
      if (old) (old.alerts || []).forEach(function (a) { if (a.id) oldAl[a.key] = a; });
      c.alerts.forEach(function (a) {
        var o = oldAl[a.key];
        delete oldAl[a.key];
        if (o && o.note === a.note) { a.id = o.id; return; }
        a.id = EA.save(TAB_ALERT, ROOM, ctx.estate, { chit: c.chit, kind: a.kind, block: a.block, lot: a.lot, detail: a.detail,
          staff_note: a.note, direction: '', direction_by: '', ref: a.ref || '' }, o ? o.id : '').id;
      });
      Object.keys(oldAl).forEach(function (k) {
        var o = oldAl[k];
        EA.save(TAB_ALERT, ROOM, ctx.estate, { chit: c.chit, kind: o.kind, block: o.block, lot: o.lot, detail: o.detail,
          staff_note: o.note, direction: '', direction_by: '', ref: o.ref || '' }, o.id, 'removed');
      });
      var s = summary(c.rows);
      c.chitRowId = EA.save(TAB_CHIT, ROOM, ctx.estate, { chit: c.chit, rain_mm: c.rain_mm, rain_time: c.rain_time,
        working: s.tot(s.worked), not_working: s.tot(s.notw), grand_total: s.tot(s.grand),
        confirmed_by: c.checker, confirmed_at: stamp, note: '' }, old && old.chitRowId ? old.chitRowId : '').id;
      EA.batchEnd();
    } catch (e) {
      EA.batchCancel();
      ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad');
      return;
    }
    // v1.7 History: every version of the chit, with who saved it, when, and what changed.
    var prevV = old ? (old.versions || [{ at: old.confirmedAt, by: old.keyedName || old.keyedBy, changes: [] }]) : [];
    c.versions = prevV.concat([{ at: confirmedAt, by: ctx.user.name, changes: old ? diffRows(old.rows, c.rows) : [] }]);
    keepChit(c);
    dropDraft();
    ui().toast(EA.t('Chit disimpan', 'Chit saved') + (old ? ' (' + EA.t('dibetulkan', 'corrected') + ')' : ''));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
    showChit(c.chit);
  }

  // What changed between two versions of a chit: people added, taken off, or moved to another job.
  function diffRows(a, b) {
    var was = {}, out = [];
    a.forEach(function (r) { if (r.status !== 'removed') was[r.worker_id] = r; });
    b.forEach(function (r) {
      var o = was[r.worker_id]; delete was[r.worker_id];
      if (!o) out.push({ kind: 'add', w: r.worker_id, task: r.task_code, block: r.block, muster: r.muster });
      else if (o.muster !== r.muster || o.task_code !== r.task_code || o.block !== r.block || o.lots !== r.lots)
        out.push({ kind: 'move', w: r.worker_id, task: r.task_code, block: r.block, muster: r.muster, from: { task: o.task_code, block: o.block, muster: o.muster } });
    });
    Object.keys(was).forEach(function (w) { var o = was[w]; out.push({ kind: 'off', w: w, task: o.task_code, block: o.block, muster: o.muster }); });
    return out;
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
    // v1.17: an old chit keyed with rain still shows it; new chits have none (rain is in the Sugut DMS).
    if (c.rain_mm !== '' && c.rain_mm !== undefined && c.rain_mm !== null) L.push('Hujan semalam: ' + (Number(c.rain_mm) || 0).toFixed(2) + ' mm' + (c.rain_time ? ' (' + c.rain_time + ')' : ''));
    backlogLines(c.backlog).forEach(function (x) { L.push(x); });
    if (c.alerts && c.alerts.length) {
      L.push('*⚠ AMARAN · ALERT — untuk tindakan Penolong Pengurus*');
      c.alerts.forEach(function (a) { L.push('• ' + a.text + ' → ' + a.note); });
    }
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
    L.push('Disediakan: ' + (c.keyedName || c.keyedBy) + ' · ' + c.confirmedAt);
    L.push('E-Book ' + (EA.RELEASE || '') + ' · ' + c.chit);
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
    function done() { ui().toast(EA.t('Disalin', 'Copied')); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, fallback); } else fallback();
    function fallback() {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
      document.body.appendChild(a); a.select();
      try { document.execCommand('copy'); done(); } catch (e) { ui().toast(EA.t('Tekan lama pada teks untuk salin', 'Long-press the text to copy'), 'wait'); }
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
        return '<div class="list-line"><div><b>Chit ' + esc(c.chit.split('-').pop()) + '</b> · ' + esc(c.confirmedAt) + (c.rev > 1 ? ' · ' + EA.t('dibetulkan', 'corrected') : '') +
          '<span class="en">' + EA.t('Bekerja ', 'Working ') + s.tot(s.worked) + ' · ' + EA.t('Tidak bekerja ', 'Not working ') + s.tot(s.notw) + ' · ' + EA.t('Jumlah ', 'Total ') + s.tot(s.grand) + '</span></div>' +
          '<div class="acts"><span class="pill ' + (waiting ? 'wait">' + EA.t('Menunggu', 'Waiting') : 'ok">' + EA.t('Dihantar', 'Sent')) + '</span>' +
          '<button type="button" class="btn btn-ghost" data-view="' + esc(c.chit) + '">VIEW<small>Lihat</small></button>' +
          (canKey(ctx.user) ? '<button type="button" class="btn btn-ghost" data-fix="' + esc(c.chit) + '">CORRECT<small>Betulkan</small></button>' : '') +
          '</div></div>';
      }).join('') + '</div>' : '<p class="hint">' + EA.t('Belum ada chit hari ini.', 'No chit yet today.') + '</p>') +
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
        d.alertNotes = {}; (c.alerts || []).forEach(function (a) { d.alertNotes[a.key] = a.note; });
        d.replacing = c.chit; d.rain_mm = c.rain_mm; d.rain_time = c.rain_time; d.checker = c.checker;
        d.jobs = JSON.parse(JSON.stringify(c.jobs || []));
        // Next job number after the highest used (a job removed earlier leaves a gap; never reuse a number).
        d.nextJob = d.jobs.reduce(function (m, j) { return Math.max(m, Number(String(j.key).replace(/\D/g, '')) || 0); }, 0) + 1;
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
  // Shared with the room's other screens (rooms/field/work.js).
  EA.fh = EA.fh || {};
  EA.fh.viewOnly = viewOnly;
  EA.fh.allChits = chits;
  EA.fh.summary = summary;
  EA.fh.tabs = tabs;
  EA.fh.copyText = copyText;
  EA.fh.getBacklog = getBacklog;
  EA.fh.refreshBacklog = refreshBacklog;
  EA.fh.backlogCard = backlogCard;
  EA.fh.wireBacklog = wireBacklog;
  EA.fh.shortDate = shortDate;
  EA.fh.chitText = chitText;
  EA.fh.marks = MARKS;
})();
