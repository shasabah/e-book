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
  var K = { draft: 'fh.draft2', chits: 'fh.chits2', chitNo: 'fh.chitNo', plans: 'fh.plans' };
  var TAB_PLAN = 'FH_PLAN', PLAN_AHEAD = 3, PLAN_BACK = 3;
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
    // v1.32: a correction of a past chit (asked by the clerk) stays a draft while that chit is within 3 days.
    // v1.40: a plan for a leave day (date ahead) or the confirmation of one (date back, up to 3 days) stays a draft too.
    var keep = d && ((d.date === EA.today() && !d.mode) || (d.fixAsk && d.date >= EA.dayAgo(3)) ||
      (d.mode === 'plan' && d.date > EA.today()) || (d.mode === 'confirm' && d.date < EA.today() && d.date >= EA.dayAgo(PLAN_BACK)));
    if (!keep) return blankDraft();
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
  function chitsOn(d) { return chits().filter(function (c) { return c.estate === ctx.estate && c.date === d; }); }
  function isPast() { return !!(draft && draft.date && draft.date !== EA.today()); }
  function keepChit(c) { var list = chits().filter(function (x) { return x.chit !== c.chit; }); list.push(c); EA.local.set(K.chits, list); }
  // ---------- v1.40 E · Rancang & sahkan (Yu Chen, 26 Oct; sample approved) ----------
  // Before his leave the staff plans each leave day's chit (up to 3 days ahead). A plan is kept apart from the
  // real chits (phone: fh.plans; office: tab FH_PLAN), so it never counts for pay, attendance, rounds or "lari".
  // On his return he confirms each planned day from the paper muster (SAHKAN), then keys that day's work;
  // today's chit opens only after that, oldest day first. Nobody below staff level keys.
  function plans() {
    var from = EA.dayAgo(40);
    return (EA.local.get(K.plans, []) || []).filter(function (p) { return p.date >= from; });
  }
  function keepPlan(p) { var list = plans().filter(function (x) { return x.plan !== p.plan; }); list.push(p); EA.local.set(K.plans, list); }
  function planOn(date, estate) { return plans().find(function (p) { return p.estate === (estate || ctx.estate) && p.date === date && !p.cancelled; }) || null; }
  function isSunday(date) { return new Date(date + 'T00:00:00').getDay() === 0; }
  function dm(date) { var d = new Date(date + 'T00:00:00'); return d.getDate() + '/' + (d.getMonth() + 1); }
  function dayDm(date) { var d = new Date(date + 'T00:00:00'); return ui().dayBm[d.getDay()] + ' ' + dm(date); }
  function addDays(date, n) { var d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function workSavedOn(date) {
    var ids = chitsOn(date).map(function (c) { return c.chit; });
    return (EA.local.get('fh.work', []) || []).some(function (w) { return w.estate === ctx.estate && ids.indexOf(w.chit) >= 0; });
  }
  // Planned days already gone (up to 3 days back) still waiting: the chit not confirmed, or its work not keyed.
  // A real chit made on that day (the staff came to work after all) counts as confirmed.
  function pendingPlans() {
    var t = EA.today(), from = EA.dayAgo(PLAN_BACK);
    function done(p) {
      var cs = chitsOn(p.date);
      if (!cs.length) return false;
      if (!cs.some(function (c) { return c.fromPlan; })) return true;      // the staff came to work: a normal chit stands
      return workSavedOn(p.date);
    }
    return plans().filter(function (p) { return p.estate === ctx.estate && !p.cancelled && p.date < t && p.date >= from && !done(p); })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function futurePlans() {
    var t = EA.today();
    return plans().filter(function (p) { return p.estate === ctx.estate && !p.cancelled && p.date >= t && !chitsOn(p.date).length; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function isPlan() { return !!(draft && draft.mode === 'plan'); }
  function isConfirm() { return !!(draft && draft.mode === 'confirm'); }
  // A plan shown like a chit (the screen table and the WhatsApp text).
  function planAsChit(p) {
    return { chit: p.plan, date: p.date, estate: p.estate, rows: p.rows, jobs: p.jobs, isPlan: true, planAt: p.at, confirmedAt: String(p.at || '').slice(11),
             keyedBy: p.keyedBy, keyedName: p.keyedName, reason: p.reason || '', backlog: null, alerts: [], rev: p.rev || 1 };
  }
  // What changed from the plan to the confirmed chit, one line per person, for WhatsApp and the Pengurus.
  function markText(m, task, block) {
    if (m === 'H') return (task || '?') + (block ? ' Blk ' + block : '');
    return m && MARKS[m] ? MARKS[m][0] : EA.t('tiada', 'none');
  }
  function planDiffText(d) {
    var from = d.kind === 'add' ? EA.t('tidak dirancang', 'not planned') : markText(d.from ? d.from.muster : d.muster, d.from ? d.from.task : d.task, d.from ? d.from.block : d.block);
    var to = d.kind === 'off' ? EA.t('tidak bekerja', 'did not work') : markText(d.muster, d.task, d.block);
    return person(d.w) + ': ' + EA.t('dirancang ', 'planned ') + from + ' → ' + to;
  }
  function newChitId(date, pre) {
    var day = (date || EA.today()).replace(/-/g, '');
    var n = EA.local.get(K.chitNo, {});
    var base = (pre || 'MC') + '-' + ctx.estate + '-' + (EA.phone() || 'P00') + '-' + day;
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
  function jobShort(j) { return j.task + (j.block ? ' · ' + placeName(j.block) : '') + (j.lots.length ? ' · ' + j.lots.join(',') : ''); }
  function lotsInfo(lots) {
    var ha = 0, palms = 0;
    lots.forEach(function (n) { var l = EA.lists.lot(ctx.estate, n); if (l) { ha += l.ha; palms += l.palms; } });
    return { ha: Math.round(ha * 100) / 100, palms: palms };
  }
  function sortLots(a) {
    return a.slice().sort(function (x, y) { var p = x.split('-').map(Number), q = y.split('-').map(Number); return (isNaN(p[0]) || isNaN(q[0])) ? (x < y ? -1 : x > y ? 1 : 0) : p[0] - q[0] || p[1] - q[1]; });
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
    chitsOn(draft.date || EA.today()).forEach(function (c) { if (c.chit !== draft.replacing) c.rows.forEach(function (r) { if (r.status !== 'removed') taken[r.worker_id] = c.chit; }); });
    return taken;
  }
  function blockOptions(selected, optional, code) {
    var d = EA.lists.durian[ctx.estate];
    if (code === 'DF' && d) return '<option value="' + d.block + '" selected>' + esc(EA.t(d.bm, d.en)) + ' · ' + EA.t('petak ', 'lots ') + d.lots.join(', ') + '</option>';
    return '<option value="">' + (optional ? EA.t('— Tiada blok —', '— No block —') : EA.t('— Pilih blok —', '— Choose block —')) + '</option>' + EA.lists.blocksFor(ctx.estate).map(function (b) {
      var lots = EA.lists.lotsFor(ctx.estate, b.block);
      return '<option value="' + b.block + '"' + (b.block === selected ? ' selected' : '') + '>Blok ' + b.block + ' · ' + b.ha.toFixed(2) + ' Ha · ' + lots.length + ' petak · tanam ' + (lots[0] ? lots[0].planted : '') + '</option>';
    }).join('') +
      // v1.27: the durian farm, for maintenance jobs (not oil palm crop jobs).
      (d && EA.lists.palmOnly.indexOf(code) < 0 ? '<option value="' + d.block + '"' + (d.block === selected ? ' selected' : '') + '>' + esc(EA.t(d.bm, d.en)) + ' · ' + EA.t('petak ', 'lots ') + d.lots.join(', ') + '</option>' : '');
  }
  function isMachJob(code) { return EA.lists.MACHINE_JOBS.indexOf(code) >= 0; }
  function machPlace(block, lots) {
    var sp = EA.lists.splitMach(ctx.estate, lots);
    return EA.t('Jentera ', 'Machine ') + sp.mach.map(machName).join(', ') + (sp.lots.length ? ' · ' + (block ? 'Blk ' + block + ' · ' : '') + EA.t('Petak ', 'Lots ') + sp.lots.join(', ') : '');
  }
  function machName(id) { var m = EA.lists.machinesFor(ctx.estate).find(function (x) { return x.id === id; }); return m ? EA.t(m.bm, m.en) : id; }
  // v1.36: durian lots are kept as DR-A … but shown as A, B, C.
  function lotsShow(block, lots) { return EA.lists.isDurian(ctx.estate, block) ? lots.map(function (x) { return x.replace(/^\w+-/, ''); }) : lots; }
  function placeName(block) { var d = EA.lists.durian[ctx.estate]; return d && block === d.block ? EA.t(d.bm, d.en) : 'Blk ' + block; }
  function taskOptions(selected) {
    var html = '<option value="">' + EA.t('— Pilih kerja —', '— Choose job —') + '</option>';
    var other = !!EA.lists.mainJobs[ctx.estate];      // v1.36: only the jobs outside the main list
    EA.lists.chitSections.forEach(function (s) {
      var codes = s.tasks.filter(function (c) { return !other || !EA.lists.isMainJob(ctx.estate, c); });
      if (!codes.length) return;
      html += '<optgroup label="' + esc(s.code + '. ' + EA.t(s.bm, s.en)) + '">' + codes.map(function (c) {
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
  // v1.34 (Yu Chen, 23 Oct): the farm tractor (ITF) and its loader (LFF) go where the crop is: the
  // lots of today's harvest on this chit, and lots with bunches still in the field from earlier days.
  var COLLECT_JOBS = ['ITF', 'LFF'];
  function collectLots(block) {
    var out = {};
    draft.jobs.forEach(function (j) { if (j.task === EA.lists.HARVEST && j.block === block) j.lots.forEach(function (l) { out[l] = EA.t('tuai hari ini', 'harvest today'); }); });
    var b = getBacklog(ctx.estate), upTo = isPast() ? draft.date : '';
    // v1.35: a past chit only offers lots cut on or before its own day (22 Oct offered 1-27/1-28, cut 23 Oct).
    ((b && b.field) || []).forEach(function (x) { if (upTo && !(x.since && String(x.since).slice(0, 10) <= upTo)) return; if (x.block === block && x.bunches > 0 && !/^Blk /.test(x.lot)) out[x.lot] = EA.t('baki ', 'left ') + x.bunches + EA.t(' tandan sejak ', ' bunches since ') + shortDate(x.since); });
    return out;
  }
  function collectBlock() {
    var n = {};
    draft.jobs.forEach(function (j) { if (j.task === EA.lists.HARVEST && j.block) n[j.block] = (n[j.block] || 0) + 100; });
    var b = getBacklog(ctx.estate), upTo = isPast() ? draft.date : '';
    ((b && b.field) || []).forEach(function (x) { if (upTo && !(x.since && String(x.since).slice(0, 10) <= upTo)) return; if (x.block) n[x.block] = (n[x.block] || 0) + x.bunches; });
    return Object.keys(n).sort(function (a, c) { return n[c] - n[a]; })[0] || '';
  }
  function lotPicks(block, chosen, code) {
    if (!block) return '<p class="hint">' + EA.t('Pilih blok dahulu.', 'Choose a block first.') + '</p>';
    var last = EA.lists.lotRound[code] ? lotLast(code) : {}, ready = [];
    var crop = COLLECT_JOBS.indexOf(code) >= 0 ? collectLots(block) : null;
    var html = EA.lists.lotsFor(ctx.estate, block).map(function (l) {
      if (crop && crop[l.lot]) return '<button type="button" class="pick lot-due" data-lot="' + l.lot + '" aria-pressed="' + (chosen.indexOf(l.lot) >= 0) + '"><b>' + esc(l.label || l.lot) + '</b><small>' + esc(crop[l.lot]) + '</small></button>';
      var st = lotState(code, l.lot, last);
      if (st && st.cls !== 'lot-done') ready.push(l.lot);
      return '<button type="button" class="pick' + (st ? ' ' + st.cls : '') + '" data-lot="' + l.lot + '" aria-pressed="' + (chosen.indexOf(l.lot) >= 0) + '"><b>' + esc(l.label || l.lot) + '</b><small>' +
        (st ? st.n + EA.t(' hari', st.n === 1 ? ' day' : ' days') : l.durian ? EA.t('durian', 'durian') : l.ha.toFixed(2) + ' Ha') + '</small></button>';
    }).join('');
    var top = '';
    if (crop) top = Object.keys(crop).length ? '<p class="hint">' + EA.t('Ditanda sendiri: petak tuai hari ini dan petak belum dikutip. Buang tanda jika traktor tidak pergi.', 'Ticked for you: today\'s harvest lots and lots not yet collected. Untick a lot the tractor will not go to.') + '</p>'
      : '<p class="hint">' + EA.t('Tiada tuaian atau baki dalam blok ini. Tambah kerja tuai dahulu, atau pilih petak sendiri.', 'No harvest or crop left in this block. Add the harvest job first, or pick lots yourself.') + '</p>';
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
      var lastPart = '';
      return '<tr class="sec"><td colspan="6">' + x.s.code + '. ' + esc(EA.t(x.s.bm, x.s.en)) + '</td></tr>' +
        x.lines.map(function (l) {
          var pt = x.s.parts.length > 1 ? EA.lists.partOf(l.task) : null, ph = '';
          if (pt && pt.en !== lastPart) { lastPart = pt.en; ph = '<tr class="part"><td colspan="6">' + esc(EA.t(pt.bm, pt.en)) + '</td></tr>'; }
          return ph + '<tr><td class="mono">' + esc(l.block || '') + '</td><td>' + esc(jobName(l.task)) + (l.lots.length ? '<span class="en">' + (isMachJob(l.task) ? esc(machPlace('', l.lots)) : 'Petak ' + esc(lotsShow(l.block, l.lots).join(', '))) + '</span>' : '') +
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
    items.push(['collect', '#field-harvest/collect', 'Ramp', 'Ramp']);       // v1.33.1: tractor to the ramp, then the lorry
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
    var m = EA.today().slice(0, 7), mt = 0, bunches = 0, n = 0, blocks = {}, abwMt = 0, abwTickets = 0;
    EA.local.get('fh.tickets', []).forEach(function (t) {
      var d = (t.dnRef && t.dnRef.date) || t.date;
      if (t.estate !== estate || String(d).slice(0, 7) !== m) return;
      var tm = Number(t.nett) || 0, tb = Number(t.bunches) || 0;
      mt += tm; n++;
      if (tb > 0 && tm > 0) { bunches += tb; abwMt += tm; abwTickets++; }     // v1.39: ABW only from tickets with bunches
      Object.keys(t.split || {}).forEach(function (b) { blocks[b] = Math.round(((blocks[b] || 0) + t.split[b].mt) * 1000) / 1000; });
    });
    mt = Math.round(mt * 1000) / 1000; abwMt = Math.round(abwMt * 1000) / 1000;
    return { month: m, mt: mt, bunches: bunches, tickets: n, abwMt: abwMt, abwTickets: abwTickets,
             abw: bunches ? Math.round(abwMt * 100000 / bunches) / 100 : 0, blocks: blocks };
  }
  // v1.39: the month's ABW, only when it is worked out from tickets that have bunches. An office answer
  // from before v1.39 (no abwTickets) divided all tonnes by some bunches, so its ABW is not used.
  function abwOf(t) { return t && t.abwTickets !== undefined && t.abw > 0 && t.bunches > 0 ? Number(t.abw) : 0; }
  function num0(v) { return Number(v || 0).toLocaleString('en-US'); }
  // "117.72 MT · 8 tiket · ABW 19.39 kg (1 tiket, 801 tandan)" when some tickets have no bunches;
  // "32.30 MT · 2 tiket · 1,550 tandan · ABW 20.84 kg" when every ticket has them; no ABW and no "0 tandan" when none has.
  function tonnageDetail(t) {
    if (!t || !t.tickets) return '';
    var a = abwOf(t), all = a && t.abwTickets === t.tickets;
    return t.tickets + ' tiket' + (!a ? '' : all ? ' · ' + num0(t.bunches) + ' tandan · ABW ' + a.toFixed(2) + ' kg'
      : ' · ABW ' + a.toFixed(2) + ' kg (' + t.abwTickets + ' tiket, ' + num0(t.bunches) + ' tandan)');
  }
  function tonnageText(t) {
    if (!t) return '';
    return Number(t.mt || 0).toFixed(2) + ' MT' + (t.tickets ? ' · ' + tonnageDetail(t) : ' · 0 tiket');
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
        (t.tickets ? esc(tonnageDetail(t)) : EA.t('Belum ada tiket bulan ini', 'No tickets this month yet')) + '</span>' +
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
    if (b.ramp && b.ramp.bunches && b.ramp.since && b.ramp.since < EA.today()) {      // v1.33: fruit should leave within 24 hours
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
    if (isPast()) return '';                 // v1.32: a past chit keeps the alerts it had
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
    if (isPast()) { var o = chits().find(function (c) { return c.chit === draft.replacing; }); return o ? (o.alerts || []) : []; }
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
    // v1.32: opened from "Perlu tindakan": the clerk asked to fix a past chit.
    var go = EA.local.get('fh.fixGo', null);
    if (go && go.estate === ctx.estate) {
      EA.local.del('fh.fixGo');
      var fc = chits().find(function (x) { return x.estate === ctx.estate && x.chit === go.chit; });
      if (fc && fc.date >= EA.dayAgo(3)) { startFix(fc, { ref: go.ref, note: go.note, by: go.by }); return; }
      el.innerHTML = head + '<div class="card"><p class="warn">' + EA.t('Chit ini tiada di telefon ini (atau lebih 3 hari). Beritahu kerani.', 'This chit is not on this phone (or is over 3 days old). Tell the clerk.') + '</p></div>' + todayCard();
      wireCommon(); return;
    }
    // v1.40: a planned leave day gone by comes first: confirm it and key its work, then today's chit opens.
    if (!draft.mode && !draft.fixAsk) {
      var pend = pendingPlans();
      if (pend.length) { renderPending(head, pend); return; }
    }
    var started = draft.jobs.length || Object.keys(draft.marks).length || draft.replacing || draft.newChit || draft.mode;
    if (todaysChits().length && !started) {
      el.innerHTML = head +
        '<p class="msg ok-msg"><span class="bm">Chit hari ini sudah disimpan. Tekan VIEW untuk lihat, atau CORRECT untuk betulkan.</span>' +
        '<span class="en">Today\'s chit is saved. Tap VIEW to see it, or CORRECT to fix it.</span></p>' +
        todayCard() + plansCard(true) + backlogCard(ctx.estate) +
        '<button type="button" class="btn btn-ghost" id="fh-new">+ NEW CHIT<small>Chit baru (' + EA.t('jarang perlu', 'rarely needed') + ')</small></button>';
      $('#fh-new').onclick = function () { draft.newChit = true; keepDraft(); render(el, ctx); };
      wireCommon(); wirePlans(); wireBacklog(el, ctx.estate); refreshBacklog(ctx.estate);
      return;
    }
    var d = isPast() ? new Date(draft.date + 'T00:00:00') : new Date();
    var mode = draft.mode || '';
    el.innerHTML = head +
      (mode === 'plan' ? '<p class="plan-band"><b>' + EA.t('RANCANGAN · ', 'PLAN · ') + esc(dayDm(draft.date)) + '</b>' +
        '<span>' + EA.t('Untuk hari staf cuti. Belum muster sebenar: tidak dikira untuk gaji sehingga disahkan bila balik.', 'For a day the staff is on leave. Not the real muster: nothing counts for pay until it is confirmed on return.') + '</span></p>' : '') +
      (mode === 'confirm' ? '<p class="plan-band due"><b>' + EA.t('SAHKAN · ', 'CONFIRM · ') + esc(dayDm(draft.date)) + '</b>' +
        '<span>' + EA.t('Dari rancangan. Ikut kertas muster hari itu: ubah hanya yang berbeza, kemudian SAHKAN.', 'From the plan. Follow that day\'s paper muster: change only what was different, then CONFIRM.') + '</span></p>' : '') +
      (d.getDay() === 0 ? '<p class="warn"><span class="bm">Hari Ahad: kerja perlu kelulusan Penolong Pengurus sebelum dikira untuk gaji.</span><span class="en">Sunday: work needs the Assistant Manager\'s approval before it counts for pay.</span></p>' : '') +
      (draft.fixAsk ? '<p class="warn"><b>' + EA.t('Membetulkan chit ', 'Fixing the chit of ') + esc(niceDate(draft.date)) + EA.t(' atas permintaan ', ' as asked by ') + esc(draft.fixAsk.by) + ':</b> "' + esc(draft.fixAsk.note) + '"</p>' : '') +
      (draft.replacing && !draft.fixAsk ? '<p class="warn"><span class="bm">Membetulkan chit ' + esc(draft.replacing) + '. Chit lama kekal; yang baru menggantikannya.</span><span class="en">Correcting chit ' + esc(draft.replacing) + '. The old one stays on record; this one replaces it.</span></p>' : '') +

      (mode ? '' : backlogCard(ctx.estate) + '<div id="fh-alert-slot">' + alertSection() + '</div>') +
      '<section class="card" aria-labelledby="fh-s1"><h2 id="fh-s1"><span class="step">1</span><span class="inline">' +
        (mode === 'plan' ? '<span class="bm">Kerja dirancang</span> · <span class="en">Planned jobs</span>' : mode === 'confirm' ? '<span class="bm">Kerja hari itu</span> · <span class="en">That day\'s jobs</span>'
          : '<span class="bm">Kerja hari ini</span> · <span class="en">Today\'s jobs</span>') + '</span></h2>' +
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

      (mode ? '<div class="actions"><button type="button" class="btn btn-ghost" id="fh-quit">' + (mode === 'plan' ? 'EXIT<small>Keluar tanpa simpan' : 'LATER<small>Nanti · keluar') + '</small></button></div>' : '') +
      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="fh-check">' +
        (mode === 'plan' ? 'SAVE PLAN<small>Simpan rancangan</small>' : mode === 'confirm' ? 'CONFIRM<small>Sahkan chit ' + esc(dm(draft.date)) + '</small>' : 'SAVE CHIT<small>Simpan chit</small>') + '</button></div>' +
      (mode ? '' : (draft.fixAsk || draft.replacing ? '' : plansCard(false)) + todayCard());

    $('#fh-addjob').onclick = function () { editJob(null); };
    if ($('#fh-copy')) $('#fh-copy').onclick = copyLast;
    // A comma is a decimal point too (many phone keyboards show only a comma): 2,5 = 2.5 mm.
    $('#fh-check').onclick = check;
    if ($('#fh-quit')) $('#fh-quit').onclick = function () { dropDraft(); draft = blankDraft(); render(el, ctx); window.scrollTo(0, 0); };
    if (!mode) wireAlerts();
    drawAll();
    wireCommon(); wirePlans();
    if (!mode) { wireBacklog(el, ctx.estate); refreshBacklog(ctx.estate); }
  }

  // ---------- v1.40 plan & confirm: the screens ----------
  // Monday morning: each planned day gone by, oldest first: 1 confirm the chit, 2 key that day's work.
  function renderPending(head, pend) {
    var p = pend[0], c = chitsOn(p.date)[0] || null, conf = !!c;
    el.innerHTML = head +
      '<section class="card plan-due-card" aria-labelledby="fh-pd"><h2 id="fh-pd"><span class="bm">' + esc(dayDm(p.date)) + ': sahkan kehadiran &amp; kerja</span>' +
        '<span class="en">' + esc(dayDm(p.date)) + ': confirm attendance &amp; work</span></h2>' +
      '<p class="hint">' + EA.t('Rancangan dibuat ', 'Planned on ') + esc(dayDm(String(p.at).slice(0, 10)) + ' ' + String(p.at).slice(11)) + ' · ' + esc(p.keyedName || p.keyedBy || '') + '. ' +
        EA.t('Buat ini dulu, kemudian chit hari ini.', 'Do this first, then today\'s chit.') + '</p>' +
      '<div class="plan-steps">' +
        (conf ? '<div class="list-line"><div><b>1 · ' + EA.t('Chit disahkan', 'Chit confirmed') + ' ✓</b><span class="en">' + esc(c.confirmedAt) + '</span></div>' +
            '<div class="acts"><button type="button" class="btn btn-ghost" data-view="' + esc(c.chit) + '">VIEW<small>Lihat</small></button></div></div>'
          : '<button type="button" class="btn btn-main" id="pd-conf">1 · CONFIRM CHIT<small>Sahkan chit ' + esc(dm(p.date)) + '</small></button>') +
        '<button type="button" class="btn ' + (conf ? 'btn-main' : 'btn-ghost') + '" id="pd-work"' + (conf ? '' : ' disabled') + '>2 · DAY\'S WORK<small>Kunci kerja ' + esc(dm(p.date)) + ' (sebenar)</small></button>' +
      '</div>' +
      (conf ? '' : '<div class="actions"><button type="button" class="btn btn-ghost" id="pd-none">NOBODY WORKED<small>Tiada kerja hari itu</small></button>' +
        '<button type="button" class="btn btn-ghost" id="pd-view">PLAN<small>Lihat rancangan</small></button></div>') +
      (pend.length > 1 ? '<p class="hint">' + EA.t('Selepas ini: ', 'After this: ') + esc(pend.slice(1).map(function (x) { return dayDm(x.date); }).join(', ')) + '</p>' : '') +
      '</section>' +
      '<section class="card"><h2><span class="inline"><span class="bm">Chit muster hari ini</span> · <span class="en">Today\'s muster chit</span></span></h2>' +
      '<p class="hint">' + EA.t('Dibuka selepas hari dirancang disahkan dan kerjanya dikunci.', 'Opens once the planned day is confirmed and its work keyed.') + '</p>' +
      '<button type="button" class="btn btn-ghost" disabled>MAKE TODAY\'S CHIT<small>Terkunci · locked</small></button></section>';
    wireCommon();
    if ($('#pd-conf')) $('#pd-conf').onclick = function () { startConfirm(p); };
    if ($('#pd-view')) $('#pd-view').onclick = function () { showChitObj(planAsChit(p)); };
    if ($('#pd-work') && conf) $('#pd-work').onclick = function () { EA.local.set('fh.workchit', c.chit); location.hash = 'field-harvest/work'; };
    if ($('#pd-none')) $('#pd-none').onclick = function () { cancelSheet(p, true); };
  }
  function cancelSheet(p, gone) {
      ui().openSheet('<h2 id="sheet-title"><span class="bm">' + (gone ? 'Tiada sesiapa bekerja pada ' : 'Batal rancangan ') + esc(dayDm(p.date)) + '?</span><span class="en">' + (gone ? 'Nobody worked on ' : 'Cancel the plan for ') + esc(dayDm(p.date)) + '?</span></h2>' +
        '<p class="hint">' + (gone ? EA.t('Rancangan dibatalkan (tidak dipadam). Hari itu tiada chit.', 'The plan is cancelled (not deleted). That day has no chit.')
          : EA.t('Contoh: cuti dibatalkan, staf bekerja. Rancangan dibatalkan (tidak dipadam); buat chit biasa pada hari itu.', 'E.g. the leave was called off. The plan is cancelled (not deleted); make the normal chit that day.')) + '</p>' +
        '<div class="field"><label for="pn-why"><span class="bm">Sebab</span><span class="en">Why (e.g. heavy rain)</span></label><input id="pn-why" class="text-input" maxlength="120"></div>' +
        '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="pn-back">‹ BACK<small>‹ BALIK</small></button>' +
        '<button class="btn btn-ok" type="button" id="pn-ok">YES<small>' + (gone ? 'Ya, tiada kerja' : 'Ya, batal') + '</small></button></div>',
        function (s) {
          s.querySelector('#pn-back').onclick = ui().closeSheet;
          s.querySelector('#pn-ok').onclick = function () {
            var why = s.querySelector('#pn-why').value.replace(/\s+/g, ' ').trim();
            if (why.length < 3) { ui().toast(EA.t('Tulis sebab', 'Write why'), 'bad'); return; }
            ui().closeSheet(); cancelPlan(p, (gone ? 'Tiada kerja: ' : 'Batal: ') + why);
          };
        });
  }
  // Plans waiting for their day, with VIEW and CHANGE; and the button to plan another day.
  function plansCard(withButton) {
    if (!canKey(ctx.user) || viewOnly(ctx.user)) return '';
    var list = futurePlans();
    return '<section class="card" id="fh-plans" aria-labelledby="fh-pl"><h2 id="fh-pl"><span class="inline"><span class="bm">Rancangan hari cuti</span> · <span class="en">Plans for leave days</span></span></h2>' +
      (list.length ? list.map(function (p) {
        var s = summary(p.rows), waiting = p.rows.some(function (r) { return EA.isWaiting(r.id); });
        return '<div class="list-line"><div><b>' + esc(dayDm(p.date)) + '</b> · ' + s.tot(s.worked) + EA.t(' orang dirancang', ' people planned') +
          '<span class="en">' + EA.t('Dirancang ', 'Planned ') + esc(String(p.at).slice(11)) + (isSunday(p.date) ? ' · ' + EA.t('Ahad: perlu lulus Pengurus', 'Sunday: needs the manager\'s approval') : '') + '</span></div>' +
          '<div class="acts"><span class="pill ' + (waiting ? 'wait">' + EA.t('Menunggu', 'Waiting') : 'ok">' + EA.t('Dihantar', 'Sent')) + '</span>' +
          '<button type="button" class="btn btn-ghost" data-pview="' + esc(p.plan) + '">VIEW<small>Lihat</small></button>' +
          (p.date > EA.today() ? '<button type="button" class="btn btn-ghost" data-pedit="' + esc(p.plan) + '">CHANGE<small>Ubah</small></button>' : '') +
          '<button type="button" class="btn btn-ghost" data-pdel="' + esc(p.plan) + '">CANCEL<small>Batal</small></button></div></div>';
      }).join('') : '<p class="hint">' + EA.t('Staf akan cuti? Rancang kerja hari itu sebelum cuti; sahkan bila balik.', 'Going on leave? Plan that day\'s work before; confirm it on return.') + '</p>') +
      '<button type="button" class="btn btn-ghost" id="fh-plan">PLAN ANOTHER DAY<small>Rancang hari lain (staf cuti)</small></button></section>';
  }
  function wirePlans() {
    if ($('#fh-plan')) $('#fh-plan').onclick = planPicker;
    el.querySelectorAll('[data-pview]').forEach(function (b) { b.onclick = function () { var p = plans().find(function (x) { return x.plan === b.dataset.pview; }); if (p) showChitObj(planAsChit(p)); }; });
    el.querySelectorAll('[data-pedit]').forEach(function (b) { b.onclick = function () { var p = plans().find(function (x) { return x.plan === b.dataset.pedit; }); if (p) startPlan(p.date, p); }; });
    el.querySelectorAll('[data-pdel]').forEach(function (b) { b.onclick = function () { var p = plans().find(function (x) { return x.plan === b.dataset.pdel; }); if (p) cancelSheet(p, false); }; });
  }
  function planPicker() {
    var t = EA.today(), days = [];
    for (var i = 1; i <= PLAN_AHEAD; i++) days.push(addDays(t, i));
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Rancang hari mana?</span><span class="en">Plan which day?</span></h2>' +
      '<p class="hint">' + EA.t('Untuk hari staf cuti, paling jauh ' + PLAN_AHEAD + ' hari. Rancangan tidak dikira untuk gaji sehingga disahkan.', 'For a day the staff is on leave, up to ' + PLAN_AHEAD + ' days ahead. A plan never counts for pay until it is confirmed.') + '</p>' +
      days.map(function (d) {
        var have = planOn(d), done = chitsOn(d).length;
        return '<button type="button" class="btn btn-ghost plan-day" data-pday="' + d + '"' + (done ? ' disabled' : '') + '><b>' + esc(dayDm(d)) + '</b>' +
          '<small>' + (done ? EA.t('Sudah ada chit', 'Already has a chit') : have ? EA.t('Sudah dirancang · UBAH', 'Already planned · CHANGE') : isSunday(d) ? EA.t('Hari Ahad: kerja perlu lulus Penolong Pengurus', 'Sunday: work needs the Assistant Manager\'s approval') : EA.t('Rancang', 'Plan')) + '</small></button>';
      }).join('') +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="pp-back">‹ BACK<small>‹ BALIK</small></button></div>',
      function (s) {
        s.querySelector('#pp-back').onclick = ui().closeSheet;
        s.querySelectorAll('[data-pday]').forEach(function (b) { b.onclick = function () { ui().closeSheet(); startPlan(b.dataset.pday, planOn(b.dataset.pday)); }; });
      });
  }
  // A draft for a plan (new, or a change of one saved) or for confirming one.
  function draftFrom(src, date) {
    var d = blankDraft(); d.date = date;
    d.jobs = JSON.parse(JSON.stringify(src.jobs || []));
    d.nextJob = d.jobs.reduce(function (m, j) { return Math.max(m, Number(String(j.key).replace(/\D/g, '')) || 0); }, 0) + 1;
    (src.rows || []).forEach(function (r) {
      if (r.status === 'removed' || !EA.lists.worker(r.worker_id)) return;
      d.marks[r.worker_id] = r.muster;
      if (r.muster !== 'H') return;
      var j = d.jobs.find(function (x) { return x.task === r.task_code && x.block === r.block && x.lots.join(' ') === r.lots; });
      if (!j) { j = { key: 'j' + (d.nextJob++), task: r.task_code, block: r.block, lots: r.lots ? r.lots.split(' ') : [], mandor: r.mandor }; d.jobs.push(j); }
      d.jobOf[r.worker_id] = j.key;
    });
    return d;
  }
  function startPlan(date, existing) {
    var busy = draft.fixAsk || draft.replacing || (!draft.mode && (draft.jobs.length || Object.keys(draft.marks).length));
    if (busy) { ui().toast(EA.t('Siapkan atau simpan chit yang sedang dibuat dulu', 'Finish or save the chit you are on first'), 'wait'); return; }
    var d = existing ? draftFrom(existing, date) : blankDraft();
    d.date = date; d.mode = 'plan'; d.planId = existing ? existing.plan : ''; d.reason = existing ? existing.reason || '' : '';
    draft = d; keepDraft(); render(el, ctx); window.scrollTo(0, 0);
  }
  function startConfirm(p) {
    var d = draftFrom(p, p.date);
    d.mode = 'confirm'; d.fromPlan = p.plan;
    draft = d; keepDraft(); render(el, ctx); window.scrollTo(0, 0);
  }
  function cancelPlan(p, why) {
    var stamp = EA.today() + ' ' + EA.ui.hhmm(new Date());
    try {
      EA.batchStart();
      p.rows.forEach(function (r) {
        EA.save(TAB_PLAN, ROOM, ctx.estate, { date: p.date, chit: p.plan, block: r.block, lots: r.lots, mandor: r.mandor, worker_id: r.worker_id,
          task_code: r.task_code, muster: r.muster, confirmed_by: ctx.user.code, confirmed_at: stamp, note: why }, r.id, 'removed');
      });
      if (p.askId) EA.save(TAB_ALERT, ROOM, ctx.estate, { date: p.date, chit: p.plan, kind: 'jobask', block: '', lot: '', detail: p.detail || '', staff_note: why, direction: '', direction_by: '', ref: p.plan }, p.askId, 'removed');
      EA.batchEnd();
    } catch (e) { EA.batchCancel(); ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad'); return; }
    p.cancelled = stamp; p.cancelWhy = why; keepPlan(p);
    ui().toast(EA.t('Rancangan ' + dm(p.date) + ' dibatalkan', 'Plan of ' + dm(p.date) + ' cancelled'));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
  }

  function drawAll() { drawJobs(); drawRows(); drawTable(); }
  function niceDate(iso) { var d = new Date(iso + 'T00:00:00'); return ui().dayBm[d.getDay()] + ' ' + d.getDate() + ' ' + ui().monBm[d.getMonth()]; }
  // The latest chit of an earlier day on this phone.
  function lastChit() {
    var t = isPlan() || isConfirm() ? draft.date : EA.today();
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
    if (!$('#fh-jobs')) return;          // v1.36: the chit screen was left (seen on P13, 24 Oct 05:51)
    var rows = draftRows();
    $('#fh-jobs').innerHTML = draft.jobs.length ? draft.jobs.map(function (j) {
      var n = rows.filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j; }).length;
      var sec = EA.lists.sectionOf(j.task);
      // The mandor in charge is not one of the workers in the target (v1.3).
      var nw = rows.filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j && r.worker_id !== j.mandor; }).length;
      var li = lotsInfo(j.lots), tg = targetLine(j, nw, li);
      return '<div class="list-line' + (tg && tg.short ? ' flag-line' : '') + '"><div><b>' + esc(sec.code + '. ' + j.task + ' ' + jobName(j.task)) + '</b><span class="en">' +
        (j.block ? esc(placeName(j.block)) : '') + (isMachJob(j.task) ? ' ' + esc(machPlace('', j.lots)) : j.lots.length ? ' · Petak ' + esc(lotsShow(j.block, j.lots).join(', ')) + (li.ha ? ' (' + li.ha.toFixed(2) + ' Ha)' : '') : '') +
        (j.mandor ? ' · Mandor ' + esc(person(j.mandor)) : '') + '</span>' +
        (j.ask ? '<span class="en warn-t"><b>' + EA.t('Kerja lain · menunggu lulus', 'Other work · waiting for approval') + '</b> · ' + esc(j.ask) + '</span>' : '') +
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
  var openPick = {};        // v1.37: workers whose job list is opened again with TUKAR
  function drawRows() {
    var taken = onOtherChit();
    var left = unmarked();
    var sun = isSunday(draft.date || EA.today());
    $('#fh-rows').innerHTML = (left.length && sun ? '<p class="hint">' + EA.t('Hari Ahad: yang tidak ditanda = rehat (' + left.length + ' orang). Tanda hanya yang bekerja, sakit atau cuti.', 'Sunday: anyone not marked is resting (' + left.length + '). Mark only those working, sick or on leave.') + '</p>' : '') +
      (left.length && !sun ? '<p class="warn"><span class="bm">' + left.length + ' orang belum ditanda.</span><span class="en">' + left.length + ' people not marked yet.</span></p>' : left.length ? '' : '<p class="hint">' + EA.t('Semua orang sudah ditanda.', 'Everyone is marked.') + '</p>') +
      // v1.38 (Yu Chen, 25 Oct): people still to mark come first; a person done (mark, and a job if H) shrinks to a
      // short line, so the list gets shorter as the staff goes and a wrong mark stands out.
      everyone().map(function (w, i) { var m0 = draft.marks[w.id], dn = !!m0 && (m0 !== 'H' || !!jobFor(w.id)); return { w: w, i: i, rank: taken[w.id] ? 2 : dn ? 1 : 0 }; })
        .sort(function (a, b) { return a.rank - b.rank || a.i - b.i; }).map(function (o, n, arr) {
      var w = o.w, head = (n === 0 || arr[n - 1].rank !== o.rank) && o.rank === 1 ? '<p class="hint rows-done"><b>' + EA.t('Sudah ditanda', 'Marked') + ' (' + arr.filter(function (x) { return x.rank === 1; }).length + ')</b></p>' : '';
      var other = taken[w.id];
      var m = draft.marks[w.id] || '';
      var j = m === 'H' ? jobFor(w.id) : null;
      var line = '';
      if (other) line = '<span class="hint">' + EA.t('Sudah dalam chit lain ', 'Already on chit ') + esc(other) + '</span>';
      else if (m === 'H') {
        // v1.37 (Yu Chen, 25 Oct): once a job is picked only that job shows, with TUKAR to change it (no double picks).
        var showAll = !j || openPick[w.id];
        line = draft.jobs.length ? '<div class="picks">' + draft.jobs.filter(function (x) { return showAll || x === j; }).map(function (x) {
          return '<button type="button" class="pick" data-w="' + w.id + '" data-job="' + x.key + '" aria-pressed="' + (j === x) + '"><b>' + esc(x.task) + '</b><small>' + esc(x.block ? placeName(x.block) : jobName(x.task)) + '</small></button>';
        }).join('') + (!showAll && draft.jobs.length > 1 ? '<button type="button" class="link-btn" data-chg="' + w.id + '">' + EA.t('TUKAR', 'CHANGE') + '</button>' : '') + '</div>' + (j ? '' : '<b class="bad-text">' + EA.t('Pilih kerja', 'Choose a job') + '</b>') : '<b class="bad-text">' + EA.t('Tambah kerja dahulu', 'Add a job first') + '</b>';
      } else if (m && m !== 'H') line = '<span class="pill plain">' + esc(EA.t(MARKS[m][0], MARKS[m][1])) + '</span>' + (m === 'T' && !draft.mode ? lariFlag(w) : '');
      var more = (m === 'L' || m === 'X') ? m : '⋯';
      return head + '<div class="wrow' + (other ? ' off' : '') + (o.rank === 1 && !openPick[w.id] ? ' wrow-done' : '') + '">' +
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
      b.onclick = function () { draft.jobOf[b.dataset.w] = b.dataset.job; delete openPick[b.dataset.w]; keepDraft(); drawJobs(); drawRows(); drawTable(); };
    });
    el.querySelectorAll('#fh-rows [data-chg]').forEach(function (b) { b.onclick = function () { openPick[b.dataset.chg] = true; drawRows(); }; });
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
    var pick = j0 ? { task: j0.task, block: j0.block, lots: j0.lots.slice(), mandor: j0.mandor, ask: j0.ask || '' } : { task: '', block: '', lots: [], mandor: '', ask: '' };
    var hasMain = !!EA.lists.mainJobs[ctx.estate];
    var used = key ? draftRows().filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j0; }).length : 0;
    ui().openSheet(
      '<h2 id="sheet-title"><span class="bm">' + (key ? 'Ubah kerja' : 'Tambah kerja') + '</span><span class="en">' + (key ? 'Change job' : 'Add a job') + '</span></h2>' +
      '<div class="field"><span class="inline"><span class="bm">' + (hasMain ? 'Kerja harian' : 'Kerja biasa') + '</span> · <span class="en">' + (hasMain ? 'Every day' : 'Usual jobs') + '</span></span><div class="picks jb-quick" id="jb-quick">' +
        EA.lists.quickJobsFor(ctx.estate).map(function (c) { var t = task(c); return '<button type="button" class="pick" data-quick="' + c + '" aria-pressed="' + (c === pick.task) + '"><b>' + c + '</b><small>' + esc(EA.t(t.bm, t.en)) + '</small></button>'; }).join('') + '</div>' +
        // v1.36: the other main jobs (rounds, machines, lorry, repairs), folded so the shortcuts stay short.
        (EA.lists.moreJobsFor(ctx.estate).length ? '<details class="jb-more" id="jb-more"' + (EA.lists.moreJobsFor(ctx.estate).indexOf(pick.task) >= 0 || EA.lists.OP_JOBS.indexOf(pick.task) >= 0 ? ' open' : '') + '><summary><span class="bm">Kerja pusingan & lain · ' + EA.lists.moreJobsFor(ctx.estate).length + '</span> <span class="en">Round & other main jobs</span></summary><div class="picks jb-quick jb-small">' +
          EA.lists.moreJobsFor(ctx.estate).map(function (c) { var t = c === 'OP' ? { bm: 'Operator jentera', en: 'Machine operator' } : task(c); return '<button type="button" class="pick" data-quick="' + c + '" aria-pressed="' + (c === pick.task || (c === 'OP' && EA.lists.OP_JOBS.indexOf(pick.task) >= 0)) + '"><b>' + c + '</b><small>' + esc(EA.t(t.bm, t.en)) + '</small></button>'; }).join('') + '</div></details>' : '') + '</div>' +
      '<div class="field' + (hasMain ? ' jb-other' : '') + '"><label for="jb-task"><span class="bm">' + (hasMain ? '+ Kerja lain · minta lulus' : 'Kerja (semua kod)') + '</span><span class="en">' + (hasMain ? 'Other work · needs the Assistant Manager\'s approval' : 'Job code (all codes)') + '</span></label><select id="jb-task" class="text-input">' + taskOptions(pick.task) + '</select></div>' +
      // v1.36: other work needs a reason; Samsir answers LULUS / TOLAK. The job goes on the chit at once.
      '<div class="field" id="jb-whybox" hidden><p class="warn"><span class="bm">Kerja ini bukan kerja utama ' + esc(ctx.estate) + '. Tulis sebab. Pengurus akan LULUS atau TOLAK.</span><span class="en">Not a main job here. Write why. The Assistant Manager approves or rejects.</span></p>' +
        '<label for="jb-why"><span class="bm">Sebab *</span><span class="en">Why (required)</span></label><textarea id="jb-why" class="text-input" rows="2" maxlength="200" placeholder="' + EA.t('cth: jalan ladang Blok 02 rosak lepas hujan', 'e.g. field road in Block 02 broken after rain') + '">' + esc(pick.ask) + '</textarea></div>' +
      // v1.36: the operator's machine, from a fixed list (links to Fleet later).
      '<div class="field" id="jb-machbox" hidden><span class="inline"><span class="bm">Jentera</span> · <span class="en">Machine</span></span>' +
        '<div class="picks" id="jb-mach"></div>' +
        // v1.36 E: an operator says what the work is for; that sets the code, so the cost goes to the work done.
        '<div id="jb-forbox" hidden><span class="inline"><span class="bm">Kerja untuk</span> · <span class="en">What is the work for?</span></span><div class="picks" id="jb-for">' +
          [['OPH', 'Muat BTS ramp → lori', 'FFB loading ramp to lorry · Tuaian'], ['OPR', 'Jalan & parit', 'Roads & drains · Jalan & parit'], ['OPF', 'Kerja ladang', 'Field work (e.g. carry fertiliser) · Rawatan ladang']].map(function (x) {
            return '<button type="button" class="pick" data-for="' + x[0] + '"><b>' + esc(x[1]) + '</b><small>' + esc(x[0] + ' · ' + x[2]) + '</small></button>'; }).join('') + '</div>' +
          '<p class="hint">' + EA.t('Traktor bawa BTS ke ramp = ITF, bukan operator.', 'A farm tractor carrying FFB to the ramp is ITF, not an operator.') + '</p></div></div>' +
      '<p class="msg ok-note" id="jb-noblock" hidden><span class="bm">✓ Tidak perlu blok untuk kerja ini</span><span class="en">✓ No block needed for this job</span></p>' +
      '<div id="jb-where"><div class="field"><label for="jb-block"><span class="bm">Blok</span><span class="en">Block</span></label><select id="jb-block" class="text-input"></select></div>' +
      '<p class="hint jb-round" id="jb-round" hidden></p>' +
      '<div class="field"><span class="inline" id="jb-lotlbl"><span class="bm">Petak · jika tahu</span> · <span class="en">Lots, if known</span></span><div id="jb-lots"></div>' +
        '<p class="hint"><span class="bm">Belum pasti petak? Boleh isi petang di Kerja.</span><span class="en">Lots not sure yet? Add them in the afternoon in Day\'s work.</span></p></div></div>' +
      // v1.34: the tractor's loader partner goes on the same lots (as LFF).
      (key ? '' : '<div class="field" id="jb-pair" hidden><label for="jb-ld"><span class="bm">Pasangan pemuat (LFF)</span><span class="en">Loader partner (LFF)</span></label><select id="jb-ld" class="text-input"><option value="">' + EA.t('— Tiada / pilih nanti —', '— None / later —') + '</option>' +
        EA.lists.workersFor(ctx.estate).filter(function (w) { return !onOtherChit()[w.id]; }).sort(function (a, b) { return /Muat|Load/i.test(b.gang || '') - /Muat|Load/i.test(a.gang || '') || (a.name < b.name ? -1 : 1); })
          .map(function (w) { return '<option value="' + esc(w.id) + '">' + esc(w.name) + (w.gang ? ' · ' + esc(w.gang) : '') + '</option>'; }).join('') + '</select></div>') +
      '<div class="field"><label for="jb-mdr"><span class="bm">Mandor</span><span class="en">Foreman (optional)</span></label><select id="jb-mdr" class="text-input"><option value="">' + EA.t('— Tiada —', '— None —') + '</option>' +
        EA.lists.mandorsFor(ctx.estate).map(function (m) { return '<option value="' + m.id + '"' + (m.id === pick.mandor ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="actions">' + (key ? '<button class="btn btn-ghost" type="button" id="jb-del"' + (used ? ' disabled title="Ada orang dalam kerja ini"' : '') + '>REMOVE<small>Buang</small></button>' : '') +
      '<button class="btn btn-ghost" type="button" id="jb-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="jb-save">SAVE<small>Simpan</small></button></div>' +
      (used ? '<p class="hint">' + EA.t(used + ' orang dalam kerja ini. Pindahkan mereka dahulu untuk buang.', used + ' people on this job; move them first to remove it.') + '</p>' : ''),
      function (s) {
        function fill() {
          var needs = pick.task ? EA.lists.needsBlock(pick.task) : true;
          // v1.22: general, transport and repair jobs have no block and no lots.
          var noBlock = !!pick.task && !needs, isMach = EA.lists.MACHINE_JOBS.indexOf(pick.task) >= 0;
          var sp0 = EA.lists.splitMach(ctx.estate, pick.lots);
          // v1.37: a machine job keeps one machine; OPR also keeps its location lots.
          if (noBlock) { pick.block = ''; pick.lots = isMach ? sp0.mach.slice(0, 1) : []; }
          else pick.lots = (isMach ? sp0.mach.slice(0, 1) : []).concat(sp0.lots);
          if (pick.task === 'DF' && EA.lists.durian[ctx.estate] && !EA.lists.isDurian(ctx.estate, pick.block)) { pick.block = EA.lists.durian[ctx.estate].block; pick.lots = []; }
          s.querySelector('#jb-whybox').hidden = !pick.task || EA.lists.isMainJob(ctx.estate, pick.task);
          s.querySelector('#jb-machbox').hidden = !isMach;
          var isOp = EA.lists.OP_JOBS.indexOf(pick.task) >= 0, mlist = EA.lists.machinesFor(ctx.estate, pick.task);
          if (isMach) pick.lots = pick.lots.filter(function (l) { return !EA.lists.isMachineId(ctx.estate, l) || mlist.some(function (m) { return m.id === l; }); });
          s.querySelector('#jb-mach').innerHTML = mlist.map(function (m) { return '<button type="button" class="pick" data-mach="' + m.id + '" aria-pressed="' + (pick.lots.indexOf(m.id) >= 0) + '"><b>' + esc(EA.t(m.bm, m.en)) + '</b></button>'; }).join('');
          s.querySelectorAll('#jb-mach [data-mach]').forEach(function (b) { b.onclick = function () { pick.lots = [b.dataset.mach].concat(EA.lists.splitMach(ctx.estate, pick.lots).lots); fill(); }; });
          s.querySelector('#jb-forbox').hidden = !isOp;
          s.querySelector('#jb-lotlbl').innerHTML = pick.task === 'OPR' ? '<span class="bm">Lokasi kerja · petak di tepi jalan / parit *</span> · <span class="en">Where: lots by the road or drain (required)</span>'
            : '<span class="bm">Petak · jika tahu</span> · <span class="en">Lots, if known</span>';
          s.querySelectorAll('#jb-for [data-for]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.for === pick.task); b.onclick = function () { pick.task = b.dataset.for; fill(); }; });
          s.querySelector('#jb-where').hidden = noBlock;
          s.querySelector('#jb-noblock').hidden = !noBlock;
          s.querySelectorAll('.jb-quick [data-quick]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.quick === pick.task || (b.dataset.quick === 'OP' && EA.lists.OP_JOBS.indexOf(pick.task) >= 0)); });
          s.querySelector('#jb-task').value = EA.lists.isMainJob(ctx.estate, pick.task) && hasMain ? '' : pick.task;
          var rd = s.querySelector('#jb-round'), rt = roundText(pick.task, pick.block);
          rd.hidden = !rt; rd.innerHTML = rt;
          if (pick.block && EA.lists.isDurian(ctx.estate, pick.block) && EA.lists.palmOnly.indexOf(pick.task) >= 0) { pick.block = ''; pick.lots = []; }
          if (COLLECT_JOBS.indexOf(pick.task) >= 0 && !key) {
            if (!pick.block) pick.block = collectBlock();
            if (pick.block && !pick.lots.length && pick.autoFor !== pick.task + pick.block) { pick.lots = Object.keys(collectLots(pick.block)); pick.autoFor = pick.task + pick.block; }
          }
          var pr = s.querySelector('#jb-pair'); if (pr) pr.hidden = !(pick.task === 'ITF' && !key);
          s.querySelector('#jb-block').innerHTML = blockOptions(pick.block, !needs, pick.task);
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
        s.querySelectorAll('.jb-quick [data-quick]').forEach(function (b) { b.onclick = function () { pick.task = b.dataset.quick === 'OP' ? (EA.lists.OP_JOBS.indexOf(pick.task) >= 0 ? pick.task : 'OPH') : b.dataset.quick; fill(); }; });
        s.querySelector('#jb-block').onchange = function () { pick.block = this.value; pick.lots = []; fill(); };
        s.querySelector('#jb-mdr').onchange = function () { pick.mandor = this.value; };
        s.querySelector('#jb-why').oninput = function () { pick.ask = this.value; };
        s.querySelector('#jb-cancel').onclick = ui().closeSheet;
        if (key) s.querySelector('#jb-del').onclick = function () {
          draft.jobs = draft.jobs.filter(function (x) { return x.key !== key; });
          Object.keys(draft.jobOf).forEach(function (w) { if (draft.jobOf[w] === key) delete draft.jobOf[w]; });
          keepDraft(); ui().closeSheet(); drawAll();
        };
        s.querySelector('#jb-save').onclick = function () {
          if (!pick.task) { ui().toast(EA.t('Pilih kerja', 'Choose the job'), 'bad'); return; }
          if (EA.lists.needsBlock(pick.task) && !pick.block) { ui().toast(EA.t('Kerja ladang perlu blok', 'Field work needs a block'), 'bad'); return; }
          var main = EA.lists.isMainJob(ctx.estate, pick.task);
          pick.ask = main ? '' : String(pick.ask || '').replace(/\s+/g, ' ').trim();
          if (!main && pick.ask.length < 5) { ui().toast(EA.t('Kerja lain: tulis sebab', 'Other work: write why'), 'bad'); return; }
          if (EA.lists.MACHINE_JOBS.indexOf(pick.task) >= 0 && !EA.lists.splitMach(ctx.estate, pick.lots).mach.length) { ui().toast(EA.t('Pilih jentera', 'Choose the machine'), 'bad'); return; }
          if (pick.task === 'OPR' && !EA.lists.splitMach(ctx.estate, pick.lots).lots.length) { ui().toast(EA.t('Pilih lokasi: petak di tepi jalan / parit', 'Choose the location: lots by the road or drain'), 'bad'); return; }
          pick.lots = sortLots(pick.lots);
          var same = draft.jobs.find(function (x) { return x.key !== key && x.task === pick.task && x.block === pick.block && x.lots.join(' ') === pick.lots.join(' '); });
          if (same) { ui().toast(EA.t('Kerja ini sudah ada', 'This job is already on the chit'), 'bad'); return; }
          if (j0) { j0.task = pick.task; j0.block = pick.block; j0.lots = pick.lots; j0.mandor = pick.mandor; if (pick.ask) j0.ask = pick.ask; else delete j0.ask; }
          else { var nj = { key: 'j' + (draft.nextJob++), task: pick.task, block: pick.block, lots: pick.lots, mandor: pick.mandor }; if (pick.ask) nj.ask = pick.ask; draft.jobs.push(nj);
                 if (pick.mandor && !draft.marks[pick.mandor]) draft.marks[pick.mandor] = 'H';
                 var ld = s.querySelector('#jb-ld') && pick.task === 'ITF' ? s.querySelector('#jb-ld').value : '';
                 if (ld) {        // the loader partner: an LFF job on the same lots
                   var lj = draft.jobs.find(function (x) { return x.task === 'LFF' && x.block === pick.block && x.lots.join(' ') === pick.lots.join(' '); });
                   if (!lj) { lj = { key: 'j' + (draft.nextJob++), task: 'LFF', block: pick.block, lots: pick.lots.slice(), mandor: '' }; draft.jobs.push(lj); }
                   draft.marks[ld] = 'H'; draft.jobOf[ld] = lj.key;
                 } }
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
    var byId = {}; list.forEach(function (w) { byId[w.id] = w; });
    var chosen = {};
    list.forEach(function (w) { if (draft.marks[w.id] === 'H' && jobFor(w.id) === j) chosen[w.id] = true; });
    // v1.38 (Yu Chen, 25 Oct): people already on another job, or marked S / C / T, are kept apart (folded) and
    // moving one asks first, so nobody is moved by a wrong tap.
    function busyAs(id) {
      var m = draft.marks[id];
      if (m && m !== 'H') return EA.t(MARKS[m][0], MARKS[m][1]);
      var o = m === 'H' ? jobFor(id) : null;
      return o && o !== j ? o.task + (o.block ? ' Blk ' + o.block : '') : '';
    }
    var free = list.filter(function (w) { return !busyAs(w.id); }), busy = list.filter(function (w) { return !!busyAs(w.id); });
    var first = gangFirst(j.task);
    var groups = {}, other = EA.t('Lain-lain', 'Other');
    free.forEach(function (w) { (groups[w.gang || other] = groups[w.gang || other] || []).push(w); });
    var order = Object.keys(groups).sort(function (a, b) { var fa = first.test(a), fb = first.test(b); return fa === fb ? (a < b ? -1 : 1) : (fa ? -1 : 1); });
    var last = lastChit(), before = [];
    if (last) last.rows.forEach(function (r) { if (r.muster === 'H' && r.task_code === j.task && (!j.block || r.block === j.block) && free.some(function (w) { return w.id === r.worker_id; })) before.push(r.worker_id); });
    var byName = function (a, b) { return a.name < b.name ? -1 : 1; };
    function card(w, note) {
      return '<button type="button" class="pick pick-name" data-w="' + w.id + '" data-n="' + esc(String(w.name).toLowerCase()) + '" aria-pressed="' + !!chosen[w.id] + '"' + (note ? ' data-busy="1"' : '') + '><b>' + esc(w.name) + '</b><small>' + esc(w.id + ' · ' + (w.sex === 'F' ? 'P' : 'L') + (note ? ' · ' + note : '')) + '</small></button>';
    }
    ui().openSheet('<h2 id="sheet-title"><span class="bm">' + esc(j.task + ' ' + jobName(j.task)) + (j.block ? ' · Blok ' + esc(j.block) : '') + '</span><span class="en">Tick the people on this job</span></h2>' +
      // v1.38: the names already ticked, at the top, each with × to take off (a wrong pick is easy to see and fix).
      '<div class="pp-chosen" id="pp-chosen"></div>' +
      '<div class="msg pp-ask" id="pp-ask" hidden></div>' +
      (before.length ? '<div class="actions"><button class="btn btn-ghost" type="button" id="pp-last">SAME AS LAST TIME<small>Sama seperti ' + esc(niceDate(last.date)) + ' · ' + before.length + ' orang</small></button></div>' : '') +
      '<input class="text-input" id="pp-find" placeholder="' + EA.t('Cari nama', 'Search a name') + '" autocomplete="off">' +
      '<div id="pp-list">' + order.map(function (g) {
        return '<p class="hint pick-group"><b>' + esc(g) + '</b></p><div class="picks">' + groups[g].slice().sort(byName).map(function (w) { return card(w, ''); }).join('') + '</div>';
      }).join('') +
      (busy.length ? '<details class="pp-busy" id="pp-busy"><summary><span class="bm">Sudah dalam kerja lain / tidak hadir · ' + busy.length + '</span> <span class="en">On another job or away</span></summary><div class="picks">' +
        busy.slice().sort(byName).map(function (w) { return card(w, busyAs(w.id)); }).join('') + '</div></details>' : '') + '</div>' +
      '<p class="hint">' + EA.t('Yang ditanda menjadi Hadir dalam kerja ini.', 'Ticked people become present on this job.') + '</p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="pp-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="pp-ok">DONE<small>Siap</small></button></div>',
      function (s) {
        function drawChosen() {
          var ids = Object.keys(chosen).filter(function (k) { return chosen[k] && byId[k]; }).sort(function (a, b) { return byName(byId[a], byId[b]); });
          s.querySelector('#pp-chosen').innerHTML = '<p class="hint"><b>' + EA.t('Dipilih', 'Chosen') + ' (' + ids.length + ')</b></p>' +
            (ids.length ? '<div class="picks">' + ids.map(function (id) { return '<button type="button" class="pick pp-x" data-x="' + id + '" aria-label="' + EA.t('Buang ', 'Remove ') + esc(byId[id].name) + '"><b>' + esc(byId[id].name) + ' ×</b></button>'; }).join('') + '</div>' : '<p class="hint">' + EA.t('Belum ada. Tekan nama di bawah.', 'None yet. Tap names below.') + '</p>');
          s.querySelectorAll('#pp-chosen [data-x]').forEach(function (b) { b.onclick = function () { set(b.dataset.x, false); }; });
        }
        function set(id, on) {
          chosen[id] = on;
          s.querySelectorAll('#pp-list .pick[data-w="' + id + '"]').forEach(function (b) { b.setAttribute('aria-pressed', on); });
          drawChosen();
        }
        function ask(id) {
          var box = s.querySelector('#pp-ask'), w = byId[id];
          box.innerHTML = '<b>' + esc(EA.t('Pindah ' + w.name + ' dari ' + busyAs(id) + ' ke ' + j.task + '?', 'Move ' + w.name + ' from ' + busyAs(id) + ' to ' + j.task + '?')) + '</b>' +
            '<div class="actions"><button type="button" class="btn btn-ghost" id="pp-no">NO<small>Tidak</small></button><button type="button" class="btn btn-ok" id="pp-yes">YES<small>Ya, pindah</small></button></div>';
          box.hidden = false; box.scrollIntoView({ block: 'nearest' });
          box.querySelector('#pp-no').onclick = function () { box.hidden = true; };
          box.querySelector('#pp-yes').onclick = function () { box.hidden = true; set(id, true); };
        }
        s.querySelectorAll('#pp-list .pick').forEach(function (b) {
          b.onclick = function () {
            var w = b.dataset.w;
            if (!chosen[w] && b.dataset.busy) return ask(w);
            set(w, !chosen[w]);
          };
        });
        drawChosen();
        if (s.querySelector('#pp-last')) s.querySelector('#pp-last').onclick = function () { before.forEach(function (w) { set(w, true); }); };
        s.querySelector('#pp-find').oninput = function () {
          var q = this.value.trim().toLowerCase();
          s.querySelectorAll('#pp-list .pick').forEach(function (b) { b.hidden = !!q && b.dataset.n.indexOf(q) < 0 && b.dataset.w.toLowerCase().indexOf(q) < 0; });
          var bz = s.querySelector('#pp-busy'); if (bz && q) bz.open = true;
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
    var noNote = isPast() ? [] : chitAlerts().filter(function (a) { return !a.note; });
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
    // v1.40: on a Sunday the people not marked are resting: they stay off the chit (never T, so never "lari").
    var left = isSunday(draft.date || EA.today()) ? [] : unmarked();
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
  // ---------- v1.27 A · Semak sebelum simpan: likely keying mistakes, caught on the phone ----------
  // 1. A durian-farm worker put on an oil palm crop job (harvest, loose fruit, fruit tractor).
  // 2. Two people with nearly the same name, one working and one not (a wrong tap).
  // Saving anyway is allowed; each warning then goes to the clerk as an alert line (kind "check").
  var STOP = ['bin', 'binti', 'bt', 'b', 'al', 'ak', 'a/l', 'a/p', 'mohd', 'muhammad', 'muhamad', 'abdul', 'nur', 'siti'];
  function nameParts(n) { return String(n || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(function (x) { return x.length >= 4 && STOP.indexOf(x) < 0; }); }
  function alike(a, b) { return a === b || (a.length >= 5 && b.length >= 5 && (a.indexOf(b) === 0 || b.indexOf(a) === 0)); }
  function chitChecks() {
    var out = [], people = everyone(), byId = {};
    people.forEach(function (w) { byId[w.id] = w; });
    Object.keys(draft.marks).forEach(function (id) {
      var w = byId[id], j = draft.marks[id] === 'H' ? jobFor(id) : null;
      if (!w || !j) return;
      if (/durian/i.test(String(w.gang || '')) && EA.lists.palmOnly.indexOf(j.task) >= 0) {
        out.push({ key: 'C:gang:' + id, ref: id, bm: w.name + ' · ' + EA.t('Ladang durian', 'Durian farm') + ' → ' + jobName(j.task) + (j.block ? ' ' + placeName(j.block) : '') + '?',
          en: EA.t('Biasanya dia di ladang durian. Betul dia buat kerja ini hari ini?', 'Usually at the durian farm. Is this really his job today?') });
      }
    });
    // v1.34: the farm tractor (ITF) normally has a loader (LFF) with it.
    var jobPeople = function (task) { return Object.keys(draft.marks).filter(function (id) { var j = draft.marks[id] === 'H' ? jobFor(id) : null; return j && j.task === task; }); };
    var itf = jobPeople('ITF');
    if (itf.length && !jobPeople('LFF').length) out.push({ key: 'C:pair:' + itf.join(','), ref: itf.join(' '), bm: EA.t('Traktor tanpa pemuat: ', 'Tractor with no loader: ') + itf.map(function (id) { return (byId[id] || {}).name || id; }).join(', ') + ' (ITF)',
      en: EA.t('Pemuat tak hadir atau buah sedikit? Jika pekerja lain ganti, BETULKAN dan tambah dia sebagai LFF.', 'Loader absent or little crop? If another worker replaces him, FIX and add him as LFF.') });
    var on = people.filter(function (w) { return draft.marks[w.id] === 'H'; }), off = people.filter(function (w) { return draft.marks[w.id] && draft.marks[w.id] !== 'H'; });
    // A name part many people share (a family name, "Contoh") is not a sign of a wrong tap.
    var all = people.map(function (w) { return nameParts(w.name); });
    function common(x) { return all.filter(function (ps) { return ps.some(function (y) { return alike(x, y); }); }).length > 5; }
    // v1.32.1: a pair the staff already answered "ya, betul" in the last 7 days is not asked again
    // (e.g. the Hendra names at Sugut, asked every day while Hendra B. Muhammad is on leave).
    var okPairs = EA.local.get('fh.okNames', {}) || {}, since = EA.dayAgo(7);
    on.forEach(function (a) {
      var pa = nameParts(a.name).filter(function (x) { return !common(x); });
      off.forEach(function (b) {
        if (okPairs[a.id + ':' + b.id] && okPairs[a.id + ':' + b.id] >= since) return;
        var pb = nameParts(b.name), hit = pa.find(function (x) { return pb.some(function (y) { return alike(x, y); }); });
        if (hit) out.push({ key: 'C:name:' + a.id + ':' + b.id, ref: a.id + ' ' + b.id, bm: EA.t('Nama hampir sama: ', 'Names nearly the same: ') + a.name + ' (H) · ' + b.name + ' (' + draft.marks[b.id] + ')',
          en: EA.t('Tidak tersalah tekan?', 'Not a wrong tap?') });
      });
    });
    return out;
  }
  function checkSheet(list, go) {
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Semak dulu · ' + list.length + ' perkara</span><span class="en">Check first · ' + list.length + (list.length === 1 ? ' thing' : ' things') + '</span></h2>' +
      list.map(function (c) { return '<div class="ck-warn"><b>' + esc(c.bm) + '</b>' + esc(c.en) + '</div>'; }).join('') +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="ck-back">‹ FIX<small>‹ Betulkan</small></button>' +
      '<button class="btn btn-ok" type="button" id="ck-go">YES, RIGHT<small>Ya, betul · teruskan</small></button></div>' +
      '<p class="hint">' + EA.t('Jika teruskan, tanda ini pergi ke kerani untuk semakan.', 'If you go on, these go to the clerk to check.') + '</p>',
      function (s) {
        s.querySelector('#ck-back').onclick = ui().closeSheet;
        s.querySelector('#ck-go').onclick = function () { ui().closeSheet(); go(); };
      });
  }
  function confirmSheet(checked) {
    if (!checked) {
      var cks = chitChecks();
      draft.checks = [];
      if (cks.length) { checkSheet(cks, function () {
        var ok = EA.local.get('fh.okNames', {}) || {}, t = EA.today(), keep = {}, since = EA.dayAgo(7);
        Object.keys(ok).forEach(function (k) { if (ok[k] >= since) keep[k] = ok[k]; });
        cks.forEach(function (k) { if (/^C:name:/.test(k.key)) keep[k.key.slice(7)] = t; });
        EA.local.set('fh.okNames', keep);
        draft.checks = cks; keepDraft(); confirmSheet(true); }); return; }
    }
    var empty = emptyJobs();
    var notSaved = '(' + EA.t('belum disimpan', 'not saved yet') + ')';
    // v1.40: a plan asks why the Sunday work (for the Pengurus); a confirmation asks why it differs from the plan.
    var why = null, c0 = null;
    if (isPlan()) {
      c0 = planAsChit(planObj(draft.planId || notSaved, EA.today() + ' ' + EA.ui.hhmm(new Date())));
      if (isSunday(draft.date)) why = { label: ['Kenapa kerja hari Ahad?', 'Why work on Sunday? (for the Assistant Manager)'], val: draft.reason || '' };
    } else {
      c0 = buildChit(notSaved, EA.ui.hhmm(new Date()), ctx.user.code);
      if (isConfirm() && c0.planDiff.length) why = { label: ['Kenapa berbeza dari rancangan? (' + c0.planDiff.length + ')', 'Why different from the plan?'], val: draft.planNote || '' };
    }
    var preview = chitText(c0);
    ui().openSheet('<h2 id="sheet-title"><span class="bm">' + (isPlan() ? 'Semak rancangan ini' : isConfirm() ? 'Sahkan chit ' + esc(dayDm(draft.date)) : 'Semak chit ini') + '</span>' +
        '<span class="en">' + (isPlan() ? 'Check this plan, then save' : isConfirm() ? 'Confirm this chit' : 'Check this chit, then save') + '</span></h2>' +
      (empty.length ? '<p class="warn"><span class="bm">Kerja tanpa orang tidak masuk chit: ' + esc(empty.map(function (j) { return j.task; }).join(', ')) + '</span><span class="en">Jobs with nobody are left off the chit.</span></p>' : '') +
      (isConfirm() && c0.planDiff.length ? '<div class="plan-diff"><b>' + EA.t('Beza dari rancangan', 'Different from the plan') + ' (' + c0.planDiff.length + ')</b>' +
        c0.planDiff.map(function (x) { return '<span>' + esc(planDiffText(x)) + '</span>'; }).join('') + '</div>' : '') +
      (why ? '<div class="field"><label for="cf-why"><span class="bm">' + esc(why.label[0]) + '</span><span class="en">' + esc(why.label[1]) + '</span></label>' +
        '<input id="cf-why" class="text-input" maxlength="160" value="' + esc(why.val) + '"></div>' : '') +
      '<pre class="chit">' + esc(preview) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="cf-back">‹ CHANGE<small>‹ UBAH</small></button>' +
      '<button class="btn btn-ok" type="button" id="cf-ok">' + (isPlan() ? 'SAVE PLAN<small>Simpan rancangan' : isConfirm() ? 'CONFIRM<small>Sahkan' : 'SAVE<small>Simpan') + '</small></button></div>',
      function (s) {
        s.querySelector('#cf-back').onclick = ui().closeSheet;
        s.querySelector('#cf-ok').onclick = function () {
          if (why) {
            var v = s.querySelector('#cf-why').value.replace(/\s+/g, ' ').trim();
            if (v.length < 3) { ui().toast(EA.t('Tulis sebab dulu', 'Write the reason first'), 'bad'); s.querySelector('#cf-why').focus(); return; }
            if (isPlan()) draft.reason = v; else draft.planNote = v;
          }
          draft.checker = ctx.user.code; keepDraft(); ui().closeSheet();
          if (isPlan()) savePlan(); else save();
        };
      });
  }

  function buildChit(chitId, confirmedAt, checker) {
    var c = { chit: chitId, date: draft.date || EA.today(), estate: ctx.estate, rows: draftRows(), jobs: JSON.parse(JSON.stringify(draft.jobs)),
             rain_mm: draft.rain_mm, rain_time: draft.rain_time, checker: checker, confirmedAt: confirmedAt,
             backlog: getBacklog(ctx.estate), alerts: chitAlerts(),
             keyedBy: ctx.user.code, keyedName: ctx.user.name, rev: 1 };
    // v1.40: a planned day confirmed on return: no backlog or alerts of today; it keeps its plan and what changed.
    if (isConfirm()) {
      var p = plans().find(function (x) { return x.plan === draft.fromPlan; }) || { rows: [], at: '' };
      c.backlog = null; c.alerts = [];
      c.fromPlan = draft.fromPlan; c.planAt = p.at; c.confirmedOn = EA.today();
      c.planDiff = diffRows(p.rows, c.rows); c.planNote = draft.planNote || '';
    }
    return c;
  }
  // v1.40: the plan being keyed, as it will be saved.
  function planObj(id, at) {
    return { plan: id, date: draft.date, estate: ctx.estate, rows: draftRows(), jobs: JSON.parse(JSON.stringify(draft.jobs)), at: at,
             keyedBy: ctx.user.code, keyedName: ctx.user.name, reason: draft.reason || '' };
  }
  function planDetail(p) {
    var s = summary(p.rows), parts = [];
    s.sections.forEach(function (x) { x.lines.forEach(function (l) { parts.push(l.task + (l.block ? ' Blk ' + l.block : '') + ' ' + s.tot(l)); }); });
    return 'Kerja Ahad ' + dm(p.date) + ' (rancangan): ' + parts.join(', ') + ' · ' + s.tot(s.worked) + ' orang';
  }
  // v1.40: save a plan: tab FH_PLAN (one row per person, like the muster); never FH_MUSTER or FH_CHIT.
  // A Sunday plan goes to the Pengurus for LULUS / TOLAK at once (alert kind "jobask", as other work).
  function savePlan() {
    if (!(draft.date > EA.today())) { ui().toast(EA.t('Rancangan hanya untuk hari akan datang', 'A plan is only for a day ahead'), 'bad'); dropDraft(); draft = blankDraft(); render(el, ctx); return; }
    var at = EA.today() + ' ' + EA.ui.hhmm(new Date());
    var old = draft.planId ? plans().find(function (x) { return x.plan === draft.planId; }) : null;
    var p = planObj(old ? old.plan : newChitId(draft.date, 'PL'), at);
    p.rev = old ? (old.rev || 1) + 1 : 1;
    try {
      EA.batchStart();
      var oldBy = {};
      if (old) old.rows.forEach(function (r) { oldBy[r.worker_id] = r; });
      p.rows.forEach(function (r) {
        var o = oldBy[r.worker_id];
        delete oldBy[r.worker_id];
        if (o && o.muster === r.muster && o.task_code === r.task_code && o.block === r.block && o.lots === r.lots && o.mandor === r.mandor) { r.id = o.id; return; }
        r.id = EA.save(TAB_PLAN, ROOM, ctx.estate, { date: p.date, chit: p.plan, block: r.block, lots: r.lots, mandor: r.mandor, worker_id: r.worker_id,
          task_code: r.task_code, muster: r.muster, confirmed_by: ctx.user.code, confirmed_at: at, note: '' }, o ? o.id : '').id;
      });
      Object.keys(oldBy).forEach(function (w) {
        var o = oldBy[w];
        EA.save(TAB_PLAN, ROOM, ctx.estate, { date: p.date, chit: p.plan, block: o.block, lots: o.lots, mandor: o.mandor, worker_id: o.worker_id,
          task_code: o.task_code, muster: o.muster, confirmed_by: ctx.user.code, confirmed_at: at, note: 'removed in change' }, o.id, 'removed');
      });
      if (isSunday(p.date)) {
        p.detail = planDetail(p);
        if (old && old.askId && old.detail === p.detail && old.reason === p.reason) p.askId = old.askId;
        else p.askId = EA.save(TAB_ALERT, ROOM, ctx.estate, { date: p.date, chit: p.plan, kind: 'jobask', block: '', lot: '', detail: p.detail,
          staff_note: p.reason, direction: '', direction_by: '', ref: p.plan }, old && old.askId ? old.askId : '').id;
      }
      EA.batchEnd();
    } catch (e) {
      EA.batchCancel();
      ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad');
      return;
    }
    keepPlan(p);
    dropDraft(); draft = blankDraft();
    ui().toast(EA.t('Rancangan ' + dm(p.date) + ' disimpan', 'Plan for ' + dm(p.date) + ' saved') + (isSunday(p.date) ? EA.t(' · dihantar ke Pengurus untuk lulus', ' · sent to the manager to approve') : ''));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
    showChitObj(planAsChit(p));
  }

  function save() {
    var confirmedAt = EA.ui.hhmm(new Date());
    var old = draft.replacing ? chits().find(function (c) { return c.estate === ctx.estate && c.chit === draft.replacing; }) : null;
    var c = buildChit(old ? old.chit : newChitId(draft.date || EA.today()), confirmedAt, draft.checker);
    if (old) c.rev = (old.rev || 1) + 1;
    if (old && isPast()) { c.backlog = old.backlog; c.alerts = old.alerts || []; }
    var fixAsk = draft.fixAsk || null;
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
        r.id = EA.save(TAB, ROOM, ctx.estate, { date: c.date, chit: c.chit, block: r.block, lots: r.lots, mandor: r.mandor, worker_id: r.worker_id,
          task_code: r.task_code, muster: r.muster, confirmed_by: c.checker, confirmed_at: stamp, note: '' }, o ? o.id : '').id;
        delete oldBy[r.worker_id];
      });
      Object.keys(oldBy).forEach(function (w) {                       // taken off in a correction: a 'removed' row
        var o = oldBy[w];
        EA.save(TAB, ROOM, ctx.estate, { date: c.date, chit: c.chit, block: o.block, lots: o.lots, mandor: o.mandor, worker_id: o.worker_id,
          task_code: o.task_code, muster: o.muster, confirmed_by: c.checker, confirmed_at: stamp, note: 'removed in correction' }, o.id, 'removed');
      });
      var oldAl = {};
      if (old) (old.alerts || []).forEach(function (a) { if (a.id) oldAl[a.key] = a; });
      c.alerts.forEach(function (a) {
        var o = oldAl[a.key];
        delete oldAl[a.key];
        if (o && o.note === a.note) { a.id = o.id; return; }
        a.id = EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: a.kind, block: a.block, lot: a.lot, detail: a.detail,
          staff_note: a.note, direction: '', direction_by: '', ref: a.ref || '' }, o ? o.id : '').id;
      });
      Object.keys(oldAl).forEach(function (k) {
        var o = oldAl[k];
        EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: o.kind, block: o.block, lot: o.lot, detail: o.detail,
          staff_note: o.note, direction: '', direction_by: '', ref: o.ref || '' }, o.id, 'removed');
      });
      // v1.36 D · Kerja lain: a job outside the estate's main list goes to the Assistant Manager (kind "jobask"),
      // with the staff's reason; he answers LULUS / TOLAK in Perlu tindakan. Sent once per job (again only if
      // the reason changes in a correction).
      var oldAsks = {}; ((old && old.jobAsks) || []).forEach(function (a) { oldAsks[a.key] = a; });
      c.jobAsks = [];
      c.jobs.forEach(function (j) {
        if (!j.ask) return;
        var n = c.rows.filter(function (r) { return r.muster === 'H' && r.task_code === j.task && r.block === j.block && r.lots === j.lots.join(' '); }).length;
        if (!n) return;
        var k = j.task + '|' + j.block + '|' + j.lots.join(' '), o = oldAsks[k];
        if (o && o.ask === j.ask) { c.jobAsks.push(o); return; }
        var t = EA.lists.task(j.task) || { bm: j.task };
        var id = EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'jobask', block: j.block, lot: j.lots.join(' '),
          detail: 'Kerja lain: ' + j.task + ' ' + t.bm + (j.block ? ' · Blk ' + j.block : '') + ' · ' + n + ' orang', staff_note: j.ask, direction: '', direction_by: '', ref: c.chit }, o ? o.id : '').id;
        c.jobAsks.push({ key: k, ask: j.ask, id: id });
      });
      // v1.41 F (Yu Chen, 26 Oct): on a Sunday only crop work and the important piece-rated jobs go ahead freely
      // (EA.lists.sundayOk: harvesting and its crop chain, manuring, CPS). Other work sends one request to SDK
      // (kind "sunask", LULUS / TOLAK by Christy or Wawa, to be named), again only if those people change in a correction.
      // Switched off 26 Oct (Yu Chen): Sunday work will be asked BEFORE the work (by Saturday) and approved by the
      // Pengurus; building that after the month-end freeze. Until then Sunday work is agreed in the WhatsApp group.
      if (EA.lists.sundayAskOnChit && new Date(c.date + 'T00:00:00').getDay() === 0) {
        var okS = EA.lists.sundayOk || [];
        var offRows = c.rows.filter(function (r) { return r.muster === 'H' && r.status !== 'removed' && okS.indexOf(r.task_code) < 0; });
        var codes = offRows.map(function (r) { return r.task_code; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        var oS = oldAsks.SUNDAY, askS = 'Kerja hari Ahad · ' + offRows.length + ' orang · ' + codes.join(',');
        if (offRows.length) {
          if (oS && oS.ask === askS) c.jobAsks.push(oS);
          else {
            var idS = EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'sunask', block: '', lot: '',
              detail: 'Kerja hari Ahad: ' + offRows.length + ' orang · ' + codes.join(', '), staff_note: 'Kerja hari Ahad perlu lulus SDK', direction: '', direction_by: '', ref: c.chit }, oS ? oS.id : '').id;
            c.jobAsks.push({ key: 'SUNDAY', ask: askS, id: idS });
          }
        }
      }
      // v1.27: warnings the staff saved anyway go to the clerk (kind "check").
      (draft.checks || []).forEach(function (k) {
        if ((old && (old.checks || []).indexOf(k.key) >= 0)) return;
        EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'check', block: '', lot: '', detail: k.bm, staff_note: EA.t('Ya, betul (disimpan juga)', 'Yes, right (saved anyway)'), direction: '', direction_by: '', ref: k.ref || '' });
      });
      c.checks = (draft.checks || []).map(function (k) { return k.key; }).concat(old && old.checks ? old.checks : []);
      var s = summary(c.rows);
      c.chitRowId = EA.save(TAB_CHIT, ROOM, ctx.estate, { date: c.date, chit: c.chit, rain_mm: c.rain_mm, rain_time: c.rain_time,
        working: s.tot(s.worked), not_working: s.tot(s.notw), grand_total: s.tot(s.grand),
        confirmed_by: c.checker, confirmed_at: stamp,
        note: c.fromPlan ? ('Dari rancangan ' + c.fromPlan + ' (' + c.planAt + ') · disahkan ' + EA.today() + (c.planDiff.length ? ' · beza ' + c.planDiff.length + ': ' + c.planNote : ' · sama')).slice(0, 300) : (old && old.fromPlan ? 'Dari rancangan ' + old.fromPlan : '') },
        old && old.chitRowId ? old.chitRowId : '').id;
      // v1.32: the clerk asked for this fix: tell the office it is done, with what changed.
      if (fixAsk && old) {
        var ch = diffRows(old.rows, c.rows).map(function (x) { return person(x.w) + (x.kind === 'move' ? ': ' + (x.from.muster || '') + ' → ' + (x.muster || '') : x.kind === 'add' ? ' +' : ' −'); }).join(', ');
        EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'fixdone', block: '', lot: '', detail: ch || EA.t('Tiada perubahan pekerja', 'No worker changes'), staff_note: '', direction: '', direction_by: '', ref: fixAsk.ref });
      }
      EA.batchEnd();
    } catch (e) {
      EA.batchCancel();
      ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad');
      return;
    }
    // v1.7 History: every version of the chit, with who saved it, when, and what changed.
    var prevV = old ? (old.versions || [{ at: old.confirmedAt, by: old.keyedName || old.keyedBy, changes: [] }]) : [];
    c.versions = prevV.concat([{ at: confirmedAt, by: ctx.user.name, changes: old ? diffRows(old.rows, c.rows) : [] }]);
    // v1.35: a past chit fixed at the clerk's request opens that day's work again (Kerja), for 3 days.
    var workToo = false;
    if (fixAsk && old && c.date !== EA.today()) {
      c.fixAsk = fixAsk.ref || 'ask';
      workToo = EA.local.get('fh.work', []).some(function (s) { return s.chit === c.chit; });
      if (workToo) EA.local.set('fh.workchit', c.chit);
    }
    if (old && old.fromPlan) { c.fromPlan = old.fromPlan; c.planAt = old.planAt; c.planDiff = old.planDiff; c.planNote = old.planNote; c.confirmedOn = old.confirmedOn; }
    var planned = !!c.fromPlan && !old;
    if (planned) EA.local.set('fh.workchit', c.chit);
    keepChit(c);
    dropDraft(); draft = blankDraft();
    ui().toast(EA.t('Chit disimpan', 'Chit saved') + (old ? ' (' + EA.t('dibetulkan', 'corrected') + ')' : '') +
      (workToo ? EA.t(' · Sekarang betulkan Kerja hari itu', ' · Now fix that day\'s work') : '') +
      (planned ? EA.t(' · Sekarang kunci kerja ' + dm(c.date), ' · Now key the work of ' + dm(c.date)) : ''));
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
    L.push('*' + (c.isPlan ? 'RANCANGAN · ' : '') + 'CHIT MUSTER ' + (est ? est.company + ' ' : '') + c.estate + '*' + (c.rev > 1 ? ' _(' + (c.isPlan ? 'diubah · changed' : 'dibetulkan · corrected') + ')_' : ''));
    var pa = String(c.planAt || '');
    L.push(ui().dayBm[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() +
      (c.isPlan && pa.length > 10 ? ' (dirancang ' + dayDm(pa.slice(0, 10)) + ' ' + pa.slice(11) + ')' : ''));
    // v1.40: a plan says so on top; a confirmed plan says when, and what was different from the plan.
    if (c.isPlan) {
      L.push('⏳ _Belum muster sebenar · disahkan bila staf balik_');
      if (d.getDay() === 0) L.push('⚠ Hari Ahad: perlu lulus Penolong Pengurus' + (c.reason ? ' · sebab: ' + c.reason : ''));
    }
    if (c.fromPlan) {
      L.push('✅ _DISAHKAN ' + (c.confirmedOn ? dayDm(c.confirmedOn) + ' ' : '') + c.confirmedAt + (pa.length > 10 ? ' · dirancang ' + dayDm(pa.slice(0, 10)) : '') + ' (staf cuti)_');
      var df = c.planDiff || [];
      L.push('*Beza dari rancangan · Plan vs actual*');
      if (!df.length) L.push('• Sama seperti rancangan · as planned');
      df.forEach(function (x) { L.push('• ' + planDiffText(x)); });
      if (df.length && c.planNote) L.push('Sebab: ' + c.planNote);
    }
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
      var lp = '';
      x.lines.forEach(function (l) {
        var pt = x.s.parts && x.s.parts.length > 1 ? EA.lists.partOf(l.task) : null;
        if (pt && pt.en !== lp) { lp = pt.en; L.push('  ' + pt.en); }
        L.push(row(l.block || '', short(l.task), l));
      });
    });
    L.push(row('', 'Total working', s.worked));
    AWAY.forEach(function (k) { if (s.tot(s.away[k])) L.push(row('', AWAY_EN[k], s.away[k])); });
    L.push(row('', 'Total not work.', s.notw));
    L.push(row('', 'GRAND TOTAL', s.grand));
    L.push('```');
    // v1.40: on a Sunday the people not on the chit are resting.
    if (d.getDay() === 0) {
      var on = {}; c.rows.forEach(function (r) { if (r.status !== 'removed') on[r.worker_id] = true; });
      var rest = EA.lists.mandorsFor(c.estate).concat(EA.lists.workersFor(c.estate)).filter(function (w) { return !on[w.id]; }).length;
      if (rest) L.push('Rehat (hari Ahad) · Rest day: ' + rest + ' orang');
    }
    s.sections.forEach(function (x) {
      x.lines.forEach(function (l) {
        if (l.lots.length && EA.lists.MACHINE_JOBS.indexOf(l.task) >= 0) { var sp = EA.lists.splitMach(c.estate, l.lots); L.push(l.task + ' jentera: ' + sp.mach.map(function (m) { var x = EA.lists.machinesFor(c.estate).find(function (y) { return y.id === m; }); return x ? x.en : m; }).join(', ') + (sp.lots.length ? ' · Blk ' + l.block + ' petak ' + sp.lots.join(', ') : '')); }
        else if (l.lots.length) L.push(EA.lists.isDurian(c.estate, l.block) ? l.task + ' ' + EA.lists.durian[c.estate].bm + ': petak ' + l.lots.map(function (x) { return x.replace(/^\w+-/, ''); }).join(', ') : l.task + ' Blk ' + l.block + ': petak ' + l.lots.join(', ') + ' (' + lotsInfo(l.lots).ha.toFixed(2) + ' Ha)');
      });
    });
    // v1.36: other work outside the main jobs, with the staff's reason, for the Assistant Manager.
    (c.jobs || []).filter(function (j) { return j.ask; }).forEach(function (j) {
      L.push('Kerja lain (minta lulus): ' + j.task + ' ' + short(j.task) + (j.block ? ' Blk ' + j.block : '') + ' — ' + j.ask);
    });
    var mdrs = EA.lists.mandorsFor(c.estate).filter(function (m) { return c.rows.some(function (r) { return r.worker_id === m.id && r.muster === 'H'; }); });
    if (mdrs.length) L.push('Mandor bertugas: ' + mdrs.map(function (m) { return m.name; }).join(', '));
    L.push('Disediakan: ' + (c.keyedName || c.keyedBy) + ' · ' + (c.isPlan ? 'dirancang ' : c.fromPlan ? 'disahkan ' : '') + c.confirmedAt);
    L.push('E-Book ' + (EA.RELEASE || '') + ' · ' + c.chit);
    return L.join('\n');
  }

  function showChit(id) {
    var c = chits().find(function (x) { return x.chit === id; });
    if (c) showChitObj(c);
  }
  function showChitObj(c) {
    var text = chitText(c);
    ui().openSheet('<h2 id="sheet-title"><span class="bm">' + (c.isPlan ? 'Rancangan untuk kumpulan WhatsApp' : 'Chit untuk kumpulan WhatsApp') + '</span><span class="en">' + (c.isPlan ? 'Plan for the WhatsApp group' : 'Chit for the WhatsApp group') + '</span></h2>' +
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
        startFix(c, null);
      };
    });
  }
  // A correction draft from a saved chit (today's, or v1.32 a past one the clerk asked to fix).
  function startFix(c, ask) {
        var d = blankDraft();
        if (ask) { d.date = c.date; d.fixAsk = ask; }
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
  EA.fh.abwOf = abwOf;
  EA.fh.tonnageText = tonnageText;
  EA.fh.localTonnage = localTonnage;
  EA.fh.wireBacklog = wireBacklog;
  EA.fh.shortDate = shortDate;
  EA.fh.chitText = chitText;
  EA.fh.plans = plans;
  EA.fh.pendingPlans = function (estate) { var keep = ctx; ctx = ctx || {}; ctx = Object.assign({}, ctx, { estate: estate }); try { return pendingPlans(); } finally { ctx = keep; } };
  EA.fh.planAsChit = planAsChit;
  EA.fh.marks = MARKS;
})();
