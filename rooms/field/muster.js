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
    // v1.52: the same-day confirmation of last night's plan (mode confirm, date today) is a draft too.
    var keep = d && ((d.date === EA.today() && !d.mode) || (d.fixAsk && d.date >= EA.fh.fixFrom()) ||
      (d.mode === 'plan' && d.date > EA.today()) || (d.mode === 'confirm' && d.date <= EA.today() && d.date >= EA.dayAgo(PLAN_BACK)));
    if (!keep) return blankDraft();
    // A draft saved by an older version may lack newer parts (e.g. alert notes): fill them in.
    var b = blankDraft(); Object.keys(b).forEach(function (k) { if (d[k] == null) d[k] = b[k]; });
    return d;
  }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[ctx.estate] = draft; EA.local.set(K.draft, all); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[ctx.estate]; EA.local.set(K.draft, all); }

  // v1.89 (Ferezelly, 23 Nov 2026, closing 21 Nov: "button tutup hari hijau... tidak keluar boleh submit").
  // The tail of the wrong-date fault fixed in 1.81. Until then a correction the staff started himself was
  // filed under the day he made it, and that happened in TWO places: the office row (repaired on 21 Nov by
  // an office step) and the phone's own copy of the chit, which nothing repaired. So his phone still held
  // the 17 and 18 Nov chits under 21 Nov, the close for the 21st gathered all three, and men present on
  // the 17th and 18th were demanded a work line on the 21st. One red line he had no way to clear.
  //
  // A chit's code carries its own day (MC-SSGT-P13-20261117-1), so the right day is read from the chit
  // itself, never guessed. Done once per phone, on the stored copy, and only for a code of that shape.
  var CHIT_DAY = /^MC-.+-(\d{4})(\d{2})(\d{2})-\d+$/;
  function chitOwnDay(code) { var m = CHIT_DAY.exec(String(code || '')); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; }
  var reDated = false;
  function reDateChits() {
    if (reDated) return; reDated = true;
    try {
      var all = EA.local.get(K.chits, []), n = 0;
      all.forEach(function (c) { var d = chitOwnDay(c.chit); if (d && c.date !== d) { c.date = d; n++; } });
      if (n) EA.local.set(K.chits, all);
    } catch (e) { /* a phone that cannot repair its copy still works as before */ }
  }
  function chits() {
    reDateChits();
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
  // v1.69 (Yu Chen, 17 Nov 2026): a public holiday acts like a Sunday (5 Nov rule) — the same rest-day rules, the same
  // approval before the work. The holidays come from lists/calendar.js. The words say which it is.
  function isHoliday(date) { return !!(EA.lists.holidays && EA.lists.holidays.indexOf(date) >= 0); }
  function isSunday(date) { return new Date(date + 'T00:00:00').getDay() === 0 || isHoliday(date); }
  function restBm(date) { return new Date(date + 'T00:00:00').getDay() === 0 ? 'Hari Ahad' : 'Cuti umum'; }
  function restEn(date) { return new Date(date + 'T00:00:00').getDay() === 0 ? 'Sunday' : 'Public holiday'; }
  function dm(date) { var d = new Date(date + 'T00:00:00'); return d.getDate() + '/' + (d.getMonth() + 1); }
  // v1.81 Rule 7: the day's name follows the phone's language. It was always Bahasa, so an English phone
  // read "Day Isnin 16/11 not closed" - a Bahasa word inside an English sentence. core/workers.js has
  // always done this correctly; this is the same line. Every estate, every screen that shows a day here.
  function dayDm(date) { var d = new Date(date + 'T00:00:00'); return EA.t(ui().dayBm, ui().dayEn)[d.getDay()] + ' ' + dm(date); }
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
  var everyone = function () { return EA.lists.mandorsFor(ctx.estate).concat(EA.lists.workersFor(ctx.estate)); }
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
    var pieced = EA.lists.blocksFor(ctx.estate).some(function (b) { return !!b.piece; });
    if (code === 'DF' && d) return '<option value="' + d.block + '" selected>' + esc(EA.t(d.bm, d.en)) + ' · ' + EA.t('petak ', 'lots ') + d.lots.join(', ') + '</option>';
    return '<option value="">' + (optional ? EA.t('— Tiada blok —', '— No block —') : EA.t('— Pilih blok —', '— Choose block —')) + '</option>' + EA.lists.blocksFor(ctx.estate).map(function (b) {
      var lots = EA.lists.lotsFor(ctx.estate, b.block);
      // v1.60: where an estate holds more than one piece (the Paitan group), the block is named by its place
      // — "TKRS Blk 1" — so the staff can see which land he is keying. Elsewhere it stays "Blok 01".
      var label = pieced ? esc(b.name || b.block) : 'Blok ' + b.block;
      return '<option value="' + b.block + '"' + (b.block === selected ? ' selected' : '') + '>' + label + ' · ' + b.ha.toFixed(2) + ' Ha · ' + lots.length + ' petak · tanam ' + (lots[0] ? lots[0].planted : '') + '</option>';
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
      // v1.45: and only the estate's own other jobs (the job being changed always stays, so an old line can be read).
      var codes = s.tasks.filter(function (c) { return !other || (!EA.lists.isMainJob(ctx.estate, c) && (EA.lists.isOtherJob(ctx.estate, c) || c === selected)); });
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
  // ---------- v1.52.3 (Yu Chen, 7 Nov: "staff sometime confuse and keep select those task that already complete") ----------
  // Membaja and CPS go round the lots once a round. A lot already done this round shows grey with its date, and picking it
  // again asks once, with a reason (Blk 01: 1-1 to 1-12 were keyed 2-3 times, 27 Oct to 3 Nov).
  var ROUND_JOBS = { MAN: 1, CPS: 1 };
  var REPEAT_WHY = [['Baja tambahan', 'Extra dose'], ['Sambung · belum siap', 'Carry on · not finished'], ['Ulang · tak cukup', 'Redo · not enough'], ['Salah rekod', 'Wrong record']];
  function dm2(d) { return String(d).slice(8, 10) + '/' + String(d).slice(5, 7); }
  // Lots of this job and block done this round before the chit's day: the office's lot records (daily work after the round
  // started, and the SEMAK PETAK ticks), plus lots this phone saved as siap and has not sent yet. CPS: sprayed under 90 days (60 on an immature block).
  function roundDone(estate, code, block, upTo) {
    if (!ROUND_JOBS[code] || !block) return {};
    upTo = upTo || EA.today();
    var out = {}, data = EA.local.get('fh.prog.' + estate + '.' + upTo.slice(0, 7), null) || EA.local.get('fh.prog.' + estate + '.' + EA.today().slice(0, 7), null);
    var lj = (data && data.lotJobs && data.lotJobs[code]) || {}, again = (EA.fh.program && EA.fh.program.cpsAgain) ? EA.fh.program.cpsAgain(estate, block) : 90;
    (EA.lists.lotsFor(estate, block) || []).forEach(function (l) {
      var d = String(lj[l.lot] || '').slice(0, 10);
      if (!d || d >= upTo) return;
      if (code === 'CPS' && Math.round((new Date(upTo + 'T00:00:00Z') - new Date(d + 'T00:00:00Z')) / 864e5) >= again) return;
      out[l.lot] = d;
    });
    chits().forEach(function (c) {
      if (c.estate !== estate || c.date >= upTo) return;
      (lotsDoneOn(c)[code + '|' + block] || []).forEach(function (l) { if (!out[l] || c.date > out[l]) out[l] = c.date; });
      // a lot on yesterday's chit that the day's work did not finish is carried on, not repeated
      var w = (EA.local.get('fh.work', []) || []).find(function (x) { return x.chit === c.chit; });
      ((w && w.rec && w.rec.jobs) || []).forEach(function (j) {
        if (j.task_code !== code || String(j.block || '') !== block) return;
        String(j.progress || '').split(', ').forEach(function (x) { var m = x.match(/^([\w\-\/]+) (\d+)%$/); if (m && Number(m[2]) < 100 && out[m[1]] === c.date) delete out[m[1]]; });
      });
    });
    return out;
  }
  // The chit's Membaja / CPS lots that were already done this round before its day, with the reason given (for TUTUP HARI).
  // v1.52.3: the chit's own note names the lots picked again this round and why, so the office and Samsir see it.
  function repeatNote(c) {
    var x = [];
    (c.jobs || []).forEach(function (j) { Object.keys(j.repeat || {}).forEach(function (l) { x.push(j.task + ' ' + l + ' (' + j.repeat[l] + ')'); }); });
    return x.length ? ' · Ulang pusingan: ' + x.join(', ') : '';
  }
  function roundRepeats(estate, c) {
    var out = [];
    (c.jobs || []).forEach(function (j) {
      if (!ROUND_JOBS[j.task]) return;
      var done = roundDone(estate, j.task, j.block, c.date);
      (j.lots || []).forEach(function (l) { if (done[l]) out.push({ task: j.task, block: j.block, lot: l, on: done[l], why: (j.repeat || {})[l] || '' }); });
    });
    return out;
  }
  function lotPicks(block, chosen, code) {
    if (!block) return '<p class="hint">' + EA.t('Pilih blok dahulu.', 'Choose a block first.') + '</p>';
    var last = EA.lists.lotRound[code] ? lotLast(code) : {}, ready = [];
    var crop = COLLECT_JOBS.indexOf(code) >= 0 ? collectLots(block) : null;
    var done = ROUND_JOBS[code] ? roundDone(ctx.estate, code, block, draft.date) : {}, nDone = 0;
    // v1.88 (Yu Chen, 23 Nov 2026: "Lot that already choose for the task still able to see"). A lot already
    // given to ANOTHER job of the same task on today's chit looked exactly like a free one, so with two
    // gangs in one block the staff had to remember which lots the first gang took. It is marked now, not
    // hidden: two gangs can share a lot, and a lot that cannot be picked is how staff end up keying a
    // wrong one. The job being edited does not count against itself.
    var taken = {};
    (draft.jobs || []).forEach(function (j) {
      if (j.key === lotPicks.editKey || j.task !== code || j.block !== block) return;
      (j.lots || []).forEach(function (x) { taken[x] = 1; });
    });
    var html = EA.lists.lotsFor(ctx.estate, block).map(function (l) {
      if (done[l.lot]) {
        nDone++;
        var why = (lotPicks.repeat || {})[l.lot];
        return '<button type="button" class="pick lot-done lot-round" data-lot="' + l.lot + '" data-done="' + done[l.lot] + '" aria-pressed="' + (chosen.indexOf(l.lot) >= 0) + '"><b>' + esc(l.label || l.lot) + '</b><small>' +
          (chosen.indexOf(l.lot) >= 0 && why ? esc(why) : EA.t('siap ', 'done ') + dm2(done[l.lot])) + '</small></button>';
      }
      if (crop && crop[l.lot]) return '<button type="button" class="pick lot-due" data-lot="' + l.lot + '" aria-pressed="' + (chosen.indexOf(l.lot) >= 0) + '"><b>' + esc(l.label || l.lot) + '</b><small>' + esc(crop[l.lot]) + '</small></button>';
      var st = lotState(code, l.lot, last);
      if (st && st.cls !== 'lot-done') ready.push(l.lot);
      return '<button type="button" class="pick' + (st ? ' ' + st.cls : '') + (taken[l.lot] ? ' lot-taken' : '') + '" data-lot="' + l.lot + '" aria-pressed="' + (chosen.indexOf(l.lot) >= 0) + '"><b>' + esc(l.label || l.lot) + '</b><small>' +
        (taken[l.lot] ? EA.t('kerja lain', 'other job') : st ? st.n + EA.t(' hari', st.n === 1 ? ' day' : ' days') : l.durian ? EA.t('durian', 'durian') : l.ha.toFixed(2) + ' Ha') + '</small></button>';
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
    if (ROUND_JOBS[code] && nDone) top += '<p class="hint lot-key"><i class="k-done"></i>' + EA.t(nDone + ' petak sudah siap pusingan ini (kelabu, dengan tarikh). Pilih yang lain.', nDone + ' lots already done this round (grey, with the date). Pick the others.') + '</p>';
    var ask = lotPicks.ask && done[lotPicks.ask] ? lotPicks.ask : '';
    if (ask) top = '<div class="card jb-repeat" id="jb-repeat"><b>' + EA.t('Petak ' + ask + ' sudah ' + (code === 'CPS' ? 'diracun' : 'dibaja') + ' ' + dm2(done[ask]), 'Lot ' + ask + ' was already ' + (code === 'CPS' ? 'sprayed' : 'manured') + ' on ' + dm2(done[ask])) + '</b>' +
      '<p class="hint">' + EA.t('Pusingan ini sudah siap untuk petak ini. Pilih juga? Pilih sebab:', 'This round is done for this lot. Pick it anyway? Choose why:') + '</p>' +
      '<div class="picks">' + REPEAT_WHY.map(function (w, i) { return '<button type="button" class="pick" data-why="' + i + '"><b>' + esc(EA.t(w[0], w[1])) + '</b></button>'; }).join('') + '</div>' +
      '<button type="button" class="btn btn-ghost" id="jb-repeat-no">NO · CANCEL<small>Tidak · batal</small></button></div>' + top;
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
          return ph + '<tr><td class="mono">' + esc(l.block || '') + '</td><td>' + (l.task || !rbOn() ? esc(jobName(l.task)) : '<b class="warn-t">' + EA.t('Belum pilih kerja', 'No job chosen yet') + '</b>') + (l.lots.length ? '<span class="en">' + (isMachJob(l.task) ? esc(machPlace('', l.lots)) : 'Petak ' + esc(lotsShow(l.block, l.lots).join(', '))) + '</span>' : '') +
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
  // v1.62 (Brief_Susun_Atur): the room has no bottom bar of its own any more; the four tabs (Hari ini · Rekod ·
  // Laporan · Senarai) are drawn by the home page on every screen, and Hari ini opens Pagi, Kerja, Ramp and Tiket.
  function tabs() { return ''; }
  function tabsOld(active, user) {
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
  // v1.48: the latest rain reading from the Sugut DMS (keyed there once), or the JPS station when the DMS has none.
  function rainText(r) {
    if (!r || !r.from) return '';
    if (r.from === 'error') return 'DMS tidak dapat dibaca · could not read the DMS';
    if (!r.date) return 'belum ada dalam DMS · not in the DMS yet';
    var d = r.date.slice(8, 10) + '/' + String(Number(r.date.slice(5, 7)));
    var extra = r.from === 'DMS' ? [r.bands, r.note].filter(function (x) { return x; }).join(', ') : '';
    return (Number(r.mm) > 0 ? Number(r.mm).toFixed(1).replace(/\.0$/, '') + ' mm' : 'tiada hujan · no rain (0 mm)') + ' (' + (r.from === 'JPS' ? 'JPS' : 'DMS') + ', ' + d + (extra ? ', ' + extra : '') + ')';
  }
  function backlogLines(b) {
    if (!b) return [];
    // v1.61 (Yu Chen, 15 Nov 2026): every estate keys its own rain gauge on the chit; the DMS figure is no longer shown.
    var L = [].concat(b.tonnage ? ['Tan bulan ini · Month to date: ' + tonnageText(b.tonnage)] : []).concat(['Baki ladang · Field: ' + (b.fieldTotal || 0) + ' tandan' + (b.estate ? tanTxt(b.estate, b.fieldTotal || 0) : '') + (b.field && b.field.length ? ' (' + b.field.map(function (x) { return x.lot + ' ' + x.bunches; }).join(', ') + ')' : ''),
             'Baki ramp · Ramp: ' + ((b.ramp && b.ramp.bunches) || 0) + ' tandan' + (b.ramp && b.ramp.bunches ? ' (' + rampText(b.ramp) + ')' : '')]);
    return L;
  }
  // v1.54 (Yu Chen, 11 Nov 2026): fruit in the field. Harvested on day D, it must be at the ramp by the end of day
  // D+1 (Sunday counts; counted by the day of harvest). Shown with estimated tonnes (bunches × the month's ABW,
  // or the estate's usual bunch weight until this month has a ticket) and who owns it. No RM.
  function abwNow(estate) {
    var b = getBacklog(estate), a = b ? abwOf(b.tonnage) : 0;
    return a || ((EA.lists.abwUsual || {})[estate] || 0);
  }
  function tanTxt(estate, n) { var a = abwNow(estate), m = a ? Math.round(n * a / 100) / 10 : 0; return m ? ' ≈ ' + m.toFixed(1) + ' tan' : ''; }
  function fieldParts(estate, b) {
    var t = EA.today(), y = (function () { var d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    var f = (b && b.field) || [], sum = function (xs) { return xs.reduce(function (a, x) { return a + Number(x.bunches || 0); }, 0); };
    var late = f.filter(function (x) { return x.since && x.since < y; }), due = f.filter(function (x) { return x.since === y; }), now = f.filter(function (x) { return !x.since || x.since >= t; });
    var first = late.map(function (x) { return x.since; }).sort()[0] || '';
    return { late: sum(late), due: sum(due), now: sum(now), first: first, days: first ? Math.round((new Date(t + 'T00:00:00') - new Date(first + 'T00:00:00')) / 864e5) : 0 };
  }
  // One or two short lines for the chit (screen and WhatsApp).
  function fieldLines(estate, b) {
    var q = fieldParts(estate, b), L = [];
    if (q.late) L.push('⚠ LEBIH TEMPOH: ' + q.late + ' tandan' + tanTxt(estate, q.late) + ' di ladang sejak ' + shortDate(q.first) + ' (' + q.days + ' hari) · Staf bertugas + Pengurus');
    if (q.due) L.push('Dituai semalam: ' + q.due + ' tandan' + tanTxt(estate, q.due) + ' · mesti ke ramp hari ini · angkat dahulu');
    return L;
  }
  function backlogCard(estate) {
    var b = getBacklog(estate);
    var t = b && b.tonnage;
    var body = !b ? '<p class="hint">' + EA.t('Belum ada. Perlu isyarat sekali untuk ambil dari pejabat.', 'Not yet: needs signal once to get it from the office.') + '</p>' :
      (false && b.rain && b.rain.from ? '<div class="list-line" id="fh-rain"><div><b>' + EA.t('Hujan: ', 'Rain: ') + esc(rainText(b.rain)) + '</b><span class="en">' +
        EA.t('Dari DMS Sugut (dikunci sekali di DMS)', 'From the Sugut DMS (keyed once, in the DMS)') + '</span></div></div>' : '') +
      (t ? '<div class="list-line"><div><b>' + EA.t('Tan bulan ini: ', 'Month to date: ') + Number(t.mt || 0).toFixed(2) + ' MT</b><span class="en">' +
        (t.tickets ? esc(tonnageDetail(t)) : EA.t('Belum ada tiket bulan ini', 'No tickets this month yet')) + '</span>' +
        (Object.keys(t.blocks || {}).length ? '<span class="en">' + Object.keys(t.blocks).sort().map(function (k) { return 'Blk ' + esc(k) + ' ' + Number(t.blocks[k]).toFixed(2); }).join(' · ') + '</span>' : '') +
        '<span class="en">' + EA.t('Bajet akan datang bila bajet 2027 dimuatkan', 'Budget to date comes when the 2027 budget is loaded') + '</span></div></div>' : '') +
      fieldLines(estate, b).map(function (x) { return '<div class="list-line fld-' + (/^⚠/.test(x) ? 'late' : 'due') + '"><div><b>' + esc(x) + '</b></div></div>'; }).join('') +
      '<div class="list-line"><div><b>' + EA.t('Ladang: ', 'Field: ') + (b.fieldTotal || 0) + EA.t(' tandan', ' bunches') + esc(tanTxt(estate, b.fieldTotal || 0)) + '</b><span class="en">' +
        (b.field && b.field.length ? b.field.map(function (x) { return EA.t('Petak ', 'Lot ') + esc(x.lot) + ': ' + x.bunches + EA.t(' (sejak ', ' (since ') + shortDate(x.since) + ')'; }).join(' · ') : EA.t('Tiada baki', 'None left')) + '</span></div></div>' +
      '<div class="list-line"><div><b>Ramp: ' + ((b.ramp && b.ramp.bunches) || 0) + EA.t(' tandan', ' bunches') + '</b><span class="en">' +
        (b.ramp && b.ramp.bunches ? EA.t('Belum dihantar ke kilang: ', 'Not yet sent to the mill: ') + esc(rampText(b.ramp)) : EA.t('Kosong', 'Empty')) + '</span></div></div>' +
      '<p class="hint">' + (b.local ? EA.t('Dikira dari telefon ini (salinan ujian)', 'Worked out from this phone (test copy)') : EA.t('Dikira pejabat ', 'Worked out by the office ') + esc(b.at)) + '</p>';
    // 1.104 (Brief_Chit_Ringkas_Rupa_Baru, new look): one line with the totals; LIHAT opens the rest. Warnings stay in view.
    if (rbOn() && b) {
      var warn = fieldLines(estate, b).map(function (x) { return '<div class="list-line fld-' + (/^⚠/.test(x) ? 'late' : 'due') + '"><div><b>' + esc(x) + '</b></div></div>'; }).join('');
      body = '<div class="rb-foldline"><span><b>' + EA.t('Ladang ', 'Field ') + (b.fieldTotal || 0) + EA.t(' tandan · Ramp ', ' bunches · Ramp ') + ((b.ramp && b.ramp.bunches) || 0) + EA.t(' tandan', ' bunches') + '</b></span>' +
        '<button type="button" class="rb-mini rb-foldbtn" data-rbfold="1">LIHAT ›<span class="rb-sub">Open</span></button></div>' + warn + '<div class="rb-foldbody">' + body + '</div>';
    }
    return '<section class="card' + (rbOn() && b ? ' rb-fold' : '') + '" id="fh-backlog" data-estate="' + esc(estate) + '" aria-labelledby="fh-bl"><div class="room-top"><h2 id="fh-bl" class="grow"><span class="inline"><span class="bm">Tan & baki buah</span> · <span class="en">Tonnes and crop backlog</span></span></h2>' +
      '<button type="button" class="btn btn-ghost" data-refresh-backlog="1">REFRESH<small>Kemas kini</small></button></div>' + body + '</section>';
  }
  // ---------- v1.55 Jentera: which machine has somebody on it today ----------
  // Yu Chen, 11 Nov 2026: nobody was aware Sugut has had no backhoe and no excavator operator. Nothing new is
  // keyed here — the office works the card out from the jobs already on the chit (Brief_Jentera.md §4). A kind
  // with one unit is named by its reg no; with more than one, by the kind and how many have somebody on them,
  // because ITF and ETF do not yet say which unit was taken.
  function machWords(m) {
    if (m.state === 'jalan') return m.units > 1 ? EA.t('Semua ' + m.units + ' unit ada pemandu', 'All ' + m.units + ' units have a driver')
      : EA.t('Ada pemandu hari ini', 'Has a driver today');
    if (m.state === 'bengkel') return EA.t('Di bengkel hari ini', 'In the workshop today');
    if (m.state === 'sebahagian') return m.onToday + EA.t(' dari ', ' of ') + m.units + EA.t(' unit ada pemandu', ' units have a driver');
    if (!m.since) return EA.t('Belum pernah ada pemandu', 'Has never had a driver');
    return EA.t('Tiada pemandu · ', 'No driver · ') + m.days + EA.t(' hari kerja', ' working days');
  }
  function machPill(m) { return m.state === 'jalan' ? 'ok' : m.state === 'tiada' && (m.days >= 3 || !m.since) ? 'bad' : 'wait'; }
  function machPillWord(m) {
    return m.state === 'jalan' ? 'JALAN' : m.state === 'bengkel' ? 'BENGKEL' : m.state === 'sebahagian' ? 'SEBAHAGIAN' : 'TIADA PEMANDU';
  }
  function machTitle(m) { return m.kind + (m.reg ? ' · ' + m.reg : m.units > 1 ? ' · ' + m.units + ' unit' : ''); }
  // Only what is not normal goes in the WhatsApp chit; everything running is one line (Brief_Jentera.md §3).
  function machLines(b) {
    var mm = b && b.machines && b.machines.lines;
    if (!mm || !mm.length) return [];
    var bad = mm.filter(function (m) { return m.state !== 'jalan'; });
    var L = ['*Jentera · Machines*'];
    if (!bad.length) return L.concat(['✅ Semua jalan · all running']);
    bad.forEach(function (m) {
      L.push((machPill(m) === 'bad' ? '⚠ ' : '• ') + machTitle(m) + ' — ' + machWords(m) + (m.since ? ' (' + EA.t('kerja akhir ', 'last worked ') + shortDate(m.since) + ')' : ''));
    });
    var okN = mm.length - bad.length;
    if (okN) L.push('✅ ' + okN + EA.t(' lagi jalan', ' more running'));
    return L;
  }
  function jenteraCard(estate) {
    var b = getBacklog(estate), mm = b && b.machines && b.machines.lines;
    if (!mm) return '';                                   // list not loaded, or no signal yet: no card at all
    var body = !mm.length ? '<p class="hint">' + EA.t('Tiada jentera disenaraikan untuk estet ini.', 'No machines listed for this estate.') + '</p>' :
      mm.map(function (m) {
        return '<div class="list-line"><div><b>' + esc(machTitle(m)) + '</b>' +
          '<span class="en">' + esc(machWords(m)) + (m.model ? ' · ' + esc(m.model) : '') +
          (m.fromOther ? EA.t(' · dari estet lain', ' · from another estate') : '') + '</span></div>' +
          '<div class="acts"><span class="pill ' + machPill(m) + '">' + EA.t(machPillWord(m), machPillWord(m)) + '</span></div></div>';
      }).join('') +
      '<p class="hint">' + EA.t('Dikira dari kerja yang sudah dikunci. Tiada apa-apa untuk dikunci di sini.',
        'Worked out from the jobs already keyed. Nothing to key here.') + '</p>';
    return '<section class="card" id="fh-jentera" aria-labelledby="fh-jt"><h2 id="fh-jt"><span class="inline"><span class="bm">Jentera</span> · <span class="en">Machines</span></span></h2>' + body + '</section>';
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
    // v1.55: the Jentera card is worked out by the same office answer, so it is redrawn with it.
    var jc = document.getElementById('fh-jentera');
    if (jc) jc.outerHTML = jenteraCard(estate);
    else { var bc = document.getElementById('fh-backlog'); if (bc) bc.insertAdjacentHTML('afterend', jenteraCard(estate)); }
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
      i.oninput = function () { draft.alertNotes[i.dataset.alert] = i.value; keepDraft(); if (rbOn()) rbCheckLabel(); };
    });
    keepDraft();
  }
  function chitAlerts() {
    if (isPast()) { var o = chits().find(function (c) { return c.chit === draft.replacing; }); return o ? (o.alerts || []) : []; }
    // v1.50.2: an alert already on an earlier chit (same key, same detail) is marked seen: the WhatsApp text counts it
    // instead of writing it out again every morning.
    var before = {};
    chits().forEach(function (c) { if (c.estate === ctx.estate && c.date < EA.today()) (c.alerts || []).forEach(function (x) { before[x.key + '|' + (x.kind === 'field' ? x.detail : '')] = true; }); });
    return alertsFrom(getBacklog(ctx.estate)).map(function (a) {
      return { key: a.key, kind: a.kind, block: a.block, lot: a.lot, ref: a.ref || '', detail: a.detail, text: a.bm, note: String(alertNote(a.key, a.def).note || '').trim(),
               seen: !!before[a.key + '|' + (a.kind === 'field' ? a.detail : '')] };
    });
  }

  function render(container, c) {
    // v1.12: the clerk opens on Tiket and otherwise sees Operasi; the manager sees only Operasi.
    if (c.user.role === 'Clerk' && (c.screen === '' || c.screen === 'ticket') && EA.fh.ticket) return EA.fh.ticket.render(container, Object.assign({}, c, { screen: 'ticket' }));
    if (viewOnly(c.user) && EA.fh.history) return EA.fh.history.render(container, Object.assign({}, c, { screen: 'history' }));
    if (c.user.role === 'Worker' || c.screen === 'collect') return EA.fh.collect.render(container, c);
    if (c.screen === 'work' && EA.fh.work) return EA.fh.work.render(container, c);
    if (c.screen === 'close' && EA.fh.dayclose) return EA.fh.dayclose.render(container, c);   // v1.43 TUTUP HARI
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
      if (fc && fc.date >= EA.fh.fixFrom()) { startFix(fc, { ref: go.ref, note: go.note, by: go.by }); return; }
      el.innerHTML = head + '<div class="card"><p class="warn">' + EA.t('Chit ini tiada di telefon ini (atau lebih ' + FIX_DAYS + ' hari). Beritahu kerani.', 'This chit is not on this phone (or is over ' + FIX_DAYS + ' days old). Tell the clerk.') + '</p></div>' + todayCard();
      wireCommon(); return;
    }
    // v1.40: a planned leave day gone by comes first: confirm it and key its work, then today's chit opens.
    if (!draft.mode && !draft.fixAsk) {
      var pend = pendingPlans();
      if (pend.length) { renderPending(head, pend); return; }
    }
    // v1.52 (Yu Chen, 6 Nov, Brief_Esok): the day summary after a close offers RANCANG ESOK. It lands here with
    // fh.planGo set: open a plan for that day and fill it from today's chit the way copy-yesterday does (finished
    // lots dropped, BELUM SIAP lots kept, everyone who worked marked H). The staff changes what differs and saves.
    var pg = EA.local.get('fh.planGo', null);
    if (pg && pg.estate === ctx.estate && !draft.mode && !draft.fixAsk && canKey(ctx.user) && !viewOnly(ctx.user)) {
      EA.local.del('fh.planGo');
      if (pg.date > EA.today() && !chitsOn(pg.date).length) {
        startPlan(pg.date, planOn(pg.date));
        if (!planOn(pg.date)) copyLast();
        return;
      }
    }
    // v1.52: the daily habit — close today, plan tomorrow, confirm in the morning. When last night's plan is for
    // today and no chit exists yet, the chit opens from it by itself, in confirm mode: everyone planned is already
    // marked present, so the only work is to mark who is absent. The plan is not the muster until SAHKAN is pressed;
    // nothing counts for pay before that (26 Oct rule). CHIT BIASA in the band drops the plan and starts fresh.
    if (!draft.mode && !draft.fixAsk && !draft.replacing && !draft.newChit && !draft.jobs.length && !Object.keys(draft.marks).length &&
        !todaysChits().length && canKey(ctx.user) && !viewOnly(ctx.user)) {
      var ptd = planOn(EA.today());
      if (ptd) { startConfirm(ptd); return; }
    }
    // v1.46 TUTUP HARI (Yu Chen, 27 Oct): at the morning chit a day gone by that is complete is closed by the app;
    // a day still incomplete is shown here (and to the Pengurus), the chit still opens: work never waits.
    if (!draft.mode && EA.fh.autoCloseOld) {
      try {
        var ac = EA.fh.autoCloseOld(ctx.estate, ctx.user);
        // v1.81: this band was the far side of the ring. A red line on the close sent the staff here, and
        // this band sent him straight back with LENGKAPKAN, for a day neither screen could open. Now the
        // days are split by the one rule the close uses: a day he can still key keeps LENGKAPKAN, and a day
        // past the window says in words that it is the office's, with nothing to press.
        var canKeyDay = function (m) {
          return EA.fh.workChitOpen ? EA.fh.workChitOpen({ date: m.date, estate: ctx.estate }) : true;
        };
        var mine = ac.missing.filter(canKeyDay), office = ac.missing.filter(function (m) { return !canKeyDay(m); });
        var dayList = function (ms) { return ms.map(function (m) { return dayDm(m.date); }).join(', '); };
        if (mine.length) head += '<p class="plan-band due" id="fh-dcmiss"><b>' + EA.t('Hari ' + dayList(mine) + ' belum lengkap', 'Day ' + dayList(mine) + ' not complete') + '</b>' +
          '<span>' + esc(mine[0].bad.map(function (x) { return EA.t(x.bm, x.en); }).join(' · ')) + '</span>' +
          '<a class="btn" href="#field-harvest/close">' + EA.t('LENGKAPKAN', 'COMPLETE IT') + '<small>' + EA.t('Lengkapkan & tutup hari', 'Complete & close the day') + '</small></a></p>';
        if (office.length) head += '<p class="plan-band" id="fh-dcold"><b>' + EA.t('Hari ' + dayList(office) + ' belum ditutup', 'Day ' + dayList(office) + ' not closed') + '</b>' +
          '<span>' + EA.t('Terlalu lama untuk dibetulkan di telefon — minta pejabat.', 'Too old to fix on the phone — ask the office.') + '</span></p>';
      } catch (e) {}
    }
    var started = draft.jobs.length || Object.keys(draft.marks).length || draft.replacing || draft.newChit || draft.mode;
    if (todaysChits().length && !started) {
      el.innerHTML = head +
        // v1.75: name the buttons as this phone shows them. The Bahasa line used to say "Tekan VIEW ... CORRECT",
        // but a Bahasa phone shows LIHAT and BETULKAN, so Ferezelly hunted for words that were not there (19 Nov).
        '<p class="msg ok-msg"><span class="bm">Chit hari ini sudah disimpan. Tekan LIHAT untuk lihat, atau BETULKAN untuk betulkan.</span>' +
        '<span class="en">Today\'s chit is saved. Tap VIEW to see it, or CORRECT to fix it.</span></p>' +
        todayCard() + plansCard(true) + backlogCard(ctx.estate) + jenteraCard(ctx.estate) +
        '<button type="button" class="btn btn-ghost" id="fh-new">+ NEW CHIT<small>Chit baru (' + EA.t('jarang perlu', 'rarely needed') + ')</small></button>';
      $('#fh-new').onclick = function () { draft.newChit = true; keepDraft(); render(el, ctx); };
      wireCommon(); wirePlans(); wireBacklog(el, ctx.estate); refreshBacklog(ctx.estate);
      return;
    }
    var d = isPast() ? new Date(draft.date + 'T00:00:00') : new Date();
    var mode = draft.mode || '';
    el.innerHTML = head +
      (mode === 'plan' ? '<p class="plan-band"><b>' + EA.t('RANCANGAN · ', 'PLAN · ') + esc(dayDm(draft.date)) + '</b>' +
        '<span>' + EA.t('Belum muster sebenar: tidak dikira untuk gaji sehingga disahkan pada hari itu.', 'Not the real muster: nothing counts for pay until it is confirmed on the day.') + '</span></p>' : '') +
      // v1.52: a same-day confirmation (last night's plan for today) asks who is absent, not "confirm?"; a confirmation
      // of a day gone by (the staff was on leave) keeps the paper-muster wording.
      (mode === 'confirm' && draft.date === EA.today() ? '<p class="plan-band due" id="fh-sameday"><b>' + EA.t('SIAPA TIDAK HADIR? · ', 'WHO IS ABSENT? · ') + esc(dayDm(draft.date)) + '</b>' +
        '<span>' + EA.t('Dirancang semalam. Tanda siapa tidak hadir (T, S, C), ubah apa yang berbeza, kemudian SAHKAN. Belum dikira sehingga disahkan.', 'Planned last night. Mark who is absent (T, S, C), change what differs, then CONFIRM. Nothing counts until confirmed.') + '</span></p>' +
        '<p class="plain-row"><button type="button" class="btn btn-ghost" id="fh-plain">PLAIN CHIT · drop the plan, start from nothing<small>CHIT BIASA · buang rancangan, buat dari kosong</small></button></p>' : '') +
      (mode === 'confirm' && draft.date !== EA.today() ? '<p class="plan-band due"><b>' + EA.t('SAHKAN · ', 'CONFIRM · ') + esc(dayDm(draft.date)) + '</b>' +
        '<span>' + EA.t('Dari rancangan. Ikut kertas muster hari itu: ubah hanya yang berbeza, kemudian SAHKAN.', 'From the plan. Follow that day\'s paper muster: change only what was different, then CONFIRM.') + '</span></p>' : '') +
      (isSunday(draft.date || EA.today()) ? '<p class="warn"><span class="bm">' + restBm(draft.date || EA.today()) + ': kerja perlu kelulusan Penolong Pengurus sebelum dikira untuk gaji.</span><span class="en">' + restEn(draft.date || EA.today()) + ': work needs the Assistant Manager\'s approval before it counts for pay.</span></p>' : '') +
      (draft.fixAsk ? '<p class="warn"><b>' + EA.t('Membetulkan chit ', 'Fixing the chit of ') + esc(niceDate(draft.date)) + EA.t(' atas permintaan ', ' as asked by ') + esc(draft.fixAsk.by) + ':</b> "' + esc(draft.fixAsk.note) + '"</p>' : '') +
      (draft.replacing && !draft.fixAsk ? '<p class="warn"><span class="bm">Membetulkan chit ' + esc(draft.replacing) + '. Chit lama kekal; yang baru menggantikannya.</span><span class="en">Correcting chit ' + esc(draft.replacing) + '. The old one stays on record; this one replaces it.</span></p>' : '') +

      (mode === 'plan' || isPast() ? '' : rainCard()) +
      (mode ? '' : backlogCard(ctx.estate) + jenteraCard(ctx.estate) + '<div id="fh-alert-slot">' + alertSection() + '</div>') +
      '<section class="card" aria-labelledby="fh-s1"><h2 id="fh-s1"><span class="step">1</span><span class="inline">' +
        (mode === 'plan' ? '<span class="bm">Kerja dirancang</span> · <span class="en">Planned jobs</span>' : mode === 'confirm' && draft.date !== EA.today() ? '<span class="bm">Kerja hari itu</span> · <span class="en">That day\'s jobs</span>'
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

      '<section class="card" aria-labelledby="fh-s4"><h2 id="fh-s4"><span class="step">3</span><span class="inline"><span class="bm">Chit</span> · <span class="en">The chit</span></span></h2>' +
      '<div id="fh-table"></div></section>' +

      (mode ? '<div class="actions"><button type="button" class="btn btn-ghost" id="fh-quit">' + (mode === 'plan' ? 'EXIT<small>Keluar tanpa simpan' : 'LATER<small>Nanti · keluar') + '</small></button></div>' : '') +
      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="fh-check">' +
        (mode === 'plan' ? 'SAVE PLAN<small>Simpan rancangan</small>' : mode === 'confirm' ? 'CONFIRM<small>Sahkan chit ' + esc(dm(draft.date)) + '</small>' : 'SAVE CHIT<small>Simpan chit</small>') + '</button></div>' +
      (mode ? '' : (draft.fixAsk || draft.replacing ? '' : plansCard(false)) + todayCard());

    $('#fh-addjob').onclick = function () { editJob(null); };
    wireRain();
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
    return '<section class="card" id="fh-plans" aria-labelledby="fh-pl"><h2 id="fh-pl"><span class="inline"><span class="bm">Rancangan esok &amp; hari cuti</span> · <span class="en">Plans for tomorrow &amp; leave days</span></span></h2>' +
      (list.length ? list.map(function (p) {
        var s = summary(p.rows), waiting = p.rows.some(function (r) { return EA.isWaiting(r.id); });
        return '<div class="list-line"><div><b>' + esc(dayDm(p.date)) + '</b> · ' + s.tot(s.worked) + EA.t(' orang dirancang', ' people planned') +
          '<span class="en">' + EA.t('Dirancang ', 'Planned ') + esc(String(p.at).slice(11)) + (isSunday(p.date) ? ' · ' + EA.t(restBm(p.date).replace('Hari ', '') + ': perlu lulus Pengurus', restEn(p.date) + ': needs the manager\'s approval') : '') + '</span></div>' +
          '<div class="acts"><span class="pill ' + (waiting ? 'wait">' + EA.t('Menunggu', 'Waiting') : 'ok">' + EA.t('Dihantar', 'Sent')) + '</span>' +
          '<button type="button" class="btn btn-ghost" data-pview="' + esc(p.plan) + '">VIEW<small>Lihat</small></button>' +
          (p.date > EA.today() ? '<button type="button" class="btn btn-ghost" data-pedit="' + esc(p.plan) + '">CHANGE<small>Ubah</small></button>' : '') +
          '<button type="button" class="btn btn-ghost" data-pdel="' + esc(p.plan) + '">CANCEL<small>Batal</small></button></div></div>';
      }).join('') : '<p class="hint">' + EA.t('Lepas tutup hari, rancang esok; pagi hanya tanda siapa tidak hadir. Staf akan cuti? Rancang hari itu di sini; sahkan bila balik.', 'After the day close, plan tomorrow; in the morning only mark who is absent. Going on leave? Plan that day here; confirm it on return.') + '</p>') +
      '<button type="button" class="btn btn-ghost" id="fh-plan">PLAN ANOTHER DAY<small>Rancang hari lain</small></button></section>';
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
          '<small>' + (done ? EA.t('Sudah ada chit', 'Already has a chit') : have ? EA.t('Sudah dirancang · UBAH', 'Already planned · CHANGE') : isSunday(d) ? EA.t(restBm(d) + ': kerja perlu lulus Penolong Pengurus', restEn(d) + ': work needs the Assistant Manager\'s approval') : EA.t('Rancang', 'Plan')) + '</small></button>';
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
    d.mode = 'confirm'; d.fromPlan = p.plan; d.planJobOf = Object.assign({}, d.jobOf);
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
  // v1.48.1 (Sugut MAN 27–29 Oct: each day's chit kept yesterday's lots and added 6 more, so finished lots were
  // keyed again): lots that day's Kerja marked SIAP for a lot-by-lot job (Ha) are not copied; lots BELUM SIAP stay.
  function lotsDoneOn(c) {
    var s = (EA.local.get('fh.work', []) || []).find(function (x) { return x.chit === c.chit; }), out = {};
    ((s && s.rec && s.rec.jobs) || []).forEach(function (j) {
      var m, re = /(?:^|, )([\w\-\/]+) siap(?=,|$)/g, k = j.task_code + '|' + (j.block || '');
      out[k] = out[k] || [];
      while ((m = re.exec(String(j.progress || '')))) out[k].push(m[1]);
    });
    return out;
  }
  // v1.95 Tuai & kutip (Brief_Tuai_Kutip_Rupa_Baru, signed by Yu Chen 24 Nov 2026): the lots the last day's work left
  // open in the new look, read from its job lines' lot-by-lot progress — harvest not finished (HA) and fruit not at the
  // ramp (COL: the tractor and loader). Each comes back on the next chit under its own job only.
  function carryOpen(estate, before) {
    var s = (EA.local.get('fh.work', []) || []).filter(function (x) { return x.estate === estate && x.date < before && x.rec; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0], out = { date: '', HA: {}, COL: {} };
    if (!s) return out;
    out.date = s.date;
    (s.rec.jobs || []).forEach(function (j) {
      var k = j.task_code === EA.lists.HARVEST ? 'HA' : j.task_code === 'ITF' ? 'COL' : '';
      if (!k || !j.progress) return;
      String(j.progress).split(', ').forEach(function (x) {
        var m = /^([\w\-\/]+) (belum|tidak pergi) \((.*)\)$/.exec(x);
        if (m) out[k][m[1]] = { block: j.block, why: m[3], gone: m[2] === 'belum' };
      });
    });
    return out;
  }
  function carryNote(j) {
    if (!rbOn() || ['ITF', 'LFF', EA.lists.HARVEST].indexOf(j.task) < 0) return '';
    var co = carryOpen(ctx.estate, draft.date || EA.today()), m = co[j.task === EA.lists.HARVEST ? 'HA' : 'COL'];
    var ls = j.lots.filter(function (l) { return m[l]; });
    if (!ls.length) return '';
    return '<span class="en warn-t"><b>' + (j.task === EA.lists.HARVEST ? EA.t('SAMBUNG', 'CARRY ON') : EA.t('KUTIP', 'COLLECT')) + '</b> · ' + EA.t('dari ', 'from ') + esc(dayDm(co.date)) + ': ' +
      ls.map(function (l) { return esc(l) + ' (' + esc(m[l].why) + ')'; }).join(', ') + '</span>';
  }
  function carryLines(c) {
    var co = carryOpen(c.estate, c.date), L = [];
    function line(m, bm) {
      var by = {};
      Object.keys(m).forEach(function (l) { var b = m[l].block || ''; (by[b] = by[b] || []).push(l + ' (' + m[l].why + ')'); });
      Object.keys(by).sort().forEach(function (b) { L.push('• ' + bm + (b ? ' Blk ' + b : '') + ': ' + by[b].join(', ')); });
    }
    line(co.HA, 'Tuai belum habis'); line(co.COL, 'Buah belum ke ramp');
    return L.length ? ['*SAMBUNG ' + dayDm(co.date) + ' · CARRIED OVER*'].concat(L) : [];
  }
  function copyLast() {
    var c = lastChit(); if (!c) return;
    draft.jobs = []; draft.marks = {}; draft.jobOf = {}; draft.nextJob = 1;
    var taken = onOtherChit(), fin = lotsDoneOn(c), dropped = 0;
    c.rows.forEach(function (r) {
      if (r.status === 'removed' || r.muster !== 'H' || taken[r.worker_id] || !EA.lists.worker(r.worker_id)) return;
      var j = draft.jobs.find(function (x) { return x.task === r.task_code && x.block === r.block && x.from === (r.lots || ''); });
      if (!j) {
        var lots = r.lots ? r.lots.split(' ') : [], done = fin[r.task_code + '|' + (r.block || '')] || [];
        var tk = EA.lists.task && EA.lists.task(r.task_code), unitHa = !!(tk && tk.unit === 'Ha');
        // v1.95: in the new look the harvest and the tractor and loader drop their finished lots too (siap in progress)
        if ((unitHa || [EA.lists.HARVEST, 'ITF', 'LFF'].indexOf(r.task_code) >= 0) && done.length) { var left = lots.filter(function (l) { return done.indexOf(l) < 0; }); dropped += lots.length - left.length; lots = left; }
        // v1.52.3: Membaja / CPS also drop every lot already done this round, not only yesterday's
        if (ROUND_JOBS[r.task_code]) { var rd = roundDone(ctx.estate, r.task_code, r.block || '', draft.date), left2 = lots.filter(function (l) { return !rd[l]; }); dropped += lots.length - left2.length; lots = left2; }
        j = { key: 'j' + (draft.nextJob++), task: r.task_code, block: r.block, lots: lots, mandor: r.mandor, from: r.lots || '' }; draft.jobs.push(j);
      }
      draft.marks[r.worker_id] = 'H'; draft.jobOf[r.worker_id] = j.key;
    });
    draft.jobs.forEach(function (j) { delete j.from; });
    keepDraft(); render(el, ctx);
    ui().toast(dropped ? EA.t('Disalin. Petak yang sudah siap dibuang (' + dropped + '). Pilih petak hari ini', 'Copied. Lots already done taken off (' + dropped + '). Choose today\'s lots')
      : EA.t('Disalin. Ubah petak dan yang berbeza', 'Copied. Change the lots and anything different'));
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
  function drawTable() {
    var rows = draftRows(), t = $('#fh-table');
    t.innerHTML = chitTable(rows);
    // 1.104 (new look): the chit table is one line with the totals; LIHAT opens it.
    if (rbOn()) {
      var sm = summary(rows), sec = t.closest('section');
      t.innerHTML = '<div class="rb-foldline"><span><b>' + sm.tot(sm.worked) + EA.t(' bekerja · ', ' working · ') + sm.tot(sm.notw) + EA.t(' tidak bekerja · jumlah ', ' not working · total ') + sm.tot(sm.grand) + '</b></span>' +
        '<button type="button" class="rb-mini rb-foldbtn" data-rbfold="1">' + (sec && sec.classList.contains('rb-unfold') ? 'TUTUP<span class="rb-sub">Close</span>' : 'LIHAT ›<span class="rb-sub">Open</span>') + '</button></div><div class="rb-foldbody">' + t.innerHTML + '</div>';
      if (sec) sec.classList.add('rb-fold');
    }
    rbCheckLabel();
  }
  // one listener for every LIHAT / TUTUP fold in the new look
  if (!EA.__rbFoldWired) {
    EA.__rbFoldWired = true;
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-rbfold]'); if (!b) return;
      var sec = b.closest('.rb-fold'); if (!sec) return;
      var open = sec.classList.toggle('rb-unfold');
      b.innerHTML = (open ? 'TUTUP' : 'LIHAT ›') + '<span class="rb-sub">' + (open ? 'Close' : 'Open') + '</span>';
    });
  }
  // 1.102 (new look): the bottom button says what the chit still lacks. It still opens the same checks.
  // a .btn label in both languages, already split (lang.js shows the phone's language)
  function rbLbl(bm, en) { return '<span class="l-bm">' + esc(bm) + '</span><span class="l-en">' + esc(en) + '</span>'; }
  function rbNoNote() { return isPast() ? [] : chitAlerts().filter(function (a) { return !a.note; }); }
  function rbCheckLabel() {
    // 1.107 (Brief_Semakan_Rupa_Baru §3): the night plan's button reads what is missing too.
    var b = $('#fh-check'); if (!b || !rbOn()) return;
    if (!b.dataset.rb0) b.dataset.rb0 = b.innerHTML;
    var rows = draftRows(), miss = [], missEn = [];
    var noJob = rows.filter(function (r) { return r.muster === 'H' && !r.task_code; }).length;
    var left = isSunday(draft.date || EA.today()) ? 0 : unmarked().length;
    if (!draft.jobs.length) { miss.push('TAMBAH KERJA'); missEn.push('ADD A JOB'); }
    var bad = draft.jobs.filter(function (j) { var m = rbMissOf(j); return m && m[0] === 'r'; }).length;
    if (bad) { miss.push(bad + ' KERJA BELUM LENGKAP'); missEn.push(bad + ' JOBS NOT COMPLETE'); }
    if (left) { miss.push(left + ' BELUM DITANDA'); missEn.push(left + ' NOT MARKED'); }
    if (noJob) { miss.push(noJob + ' TIADA KERJA'); missEn.push(noJob + ' WITH NO JOB'); }
    // 1.107 (§1): an alert with no note stops the save, so the button names it first (after the rain).
    if (rbNoNote().length) { miss.unshift('TULIS AMARAN'); missEn.unshift('WRITE THE ALERT'); }
    if (isConfirm() && !isPast() && !rainOk()) { miss.unshift('JAWAB HUJAN'); missEn.unshift('ANSWER THE RAIN'); }
    b.dataset.l2 = '1';
    var here = rows.filter(function (r) { return r.muster === 'H'; }).length;
    b.innerHTML = miss.length ? rbLbl(miss.join(' · '), missEn.join(' · ')) : isConfirm() ? rbLbl('SAHKAN CHIT · ' + here + ' hadir', 'CONFIRM CHIT · ' + here + ' present') : b.dataset.rb0;
    b.classList.toggle('rb-notyet', !!miss.length);
  }

  function drawJobs() {
    if (!$('#fh-jobs')) return;          // v1.36: the chit screen was left (seen on P13, 24 Oct 05:51)
    if (rbOn()) { rbDrawJobs(); return; }
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
        (tg && !(j.task === 'MAN' && rbOn()) ? '<span class="en' + (tg.short ? ' warn-t' : '') + '">' + tg.text + '</span>' : '') +
        (j.task === 'MAN' && rbOn() ? manPanel(j, nw) : '') + carryNote(j) + '</div>' +
        '<div class="acts"><span class="pill plain">' + n + ' orang</span>' +
        '<button type="button" class="btn btn-ghost" data-pick="' + j.key + '">PICK<small>Pilih orang</small></button>' +
        '<button type="button" class="btn btn-ghost" data-edit="' + j.key + '">EDIT<small>Ubah</small></button></div></div>';
    }).join('') : '<p class="hint">' + EA.t('Belum ada kerja. Tekan + TAMBAH KERJA untuk setiap kerja hari ini.', 'No jobs yet. Tap + ADD JOB for each job today.') + '</p>';
    el.querySelectorAll('#fh-jobs [data-edit]').forEach(function (b) { b.onclick = function () { editJob(b.dataset.edit); }; });
    el.querySelectorAll('#fh-jobs [data-pick]').forEach(function (b) { b.onclick = function () { pickPeople(b.dataset.pick); }; });
    el.querySelectorAll('#fh-jobs [data-mreq]').forEach(function (b) { b.onclick = function () { manAsk(b.dataset.mreq); }; });
  }

  // 1.104 (Brief_Chit_Ringkas_Rupa_Baru, signed by Yu Chen 25 Nov 2026): each job one line — block, lots, total Ha,
  // men — with a red label when it is not complete. Tapping it opens the job sheet (lots, men, mandor, Membaja).
  // 1.105 (Brief_Tuai_Kutip_Rupa_Baru 1.3 §5b): the loader's LFF job is the one on the tractor's block and lots.
  function rbPartner(itf) { return draft.jobs.find(function (x) { return x.task === 'LFF' && x.block === itf.block && x.lots.join(' ') === itf.lots.join(' '); }) || null; }
  function rbHarvLots() {
    var m = {};
    draft.jobs.forEach(function (j) { if (j.task === EA.lists.HARVEST && j.block) j.lots.forEach(function (l) { m[j.block] = m[j.block] || []; if (m[j.block].indexOf(l) < 0) m[j.block].push(l); }); });
    Object.keys(m).forEach(function (b) { m[b] = sortLots(m[b]); });
    return m;
  }
  // When Menuai's lots in a block change, the tractor (and its loader) there get the same lots, plus the lots with fruit
  // still in the block; lots the staff added by hand stay.
  function rbColFollow(prev) {
    var now = rbHarvLots();
    draft.jobs.filter(function (j) { return j.task === 'ITF' && j.block; }).forEach(function (j) {
      var p0 = prev[j.block] || [], h = now[j.block] || [];
      if (p0.join(' ') === h.join(' ')) return;
      var part = rbPartner(j), all = [];
      h.concat(Object.keys(collectLots(j.block)), j.lots.filter(function (l) { return p0.indexOf(l) < 0; })).forEach(function (l) { if (all.indexOf(l) < 0) all.push(l); });
      j.lots = sortLots(all);
      if (part) part.lots = j.lots.slice();
    });
  }
  function rbJobMen(j) { return draftRows().filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j; }).map(function (r) { return r.worker_id; }); }
  function rbBaki(block, lots) {
    var b = getBacklog(ctx.estate), n = 0;
    ((b && b.field) || []).forEach(function (x) { if (x.block === block && lots.indexOf(x.lot) >= 0) n += Number(x.bunches) || 0; });
    return n;
  }
  function rbMissOf(j) {
    var men = rbJobMen(j), nw = men.filter(function (w) { return w !== j.mandor; }).length;
    return rbJobMiss(j, men.length, nw, targetLine(j, nw, lotsInfo(j.lots)));
  }
  function rbJobMiss(j, n, nw, tg) {
    if (j.task === EA.lists.HARVEST && !j.lots.length) return ['r', EA.t('PILIH PETAK', 'CHOOSE LOTS')];
    if (!n) return ['r', j.task === 'ITF' ? EA.t('PILIH PEMANDU', 'CHOOSE DRIVER') : EA.t('PILIH ORANG', 'CHOOSE PEOPLE')];
    if (j.task === 'MAN') {
      if (!j.lots.length) return ['r', EA.t('PILIH PETAK', 'CHOOSE LOTS')];
      var m = manInfo(j, nw, draft.replacing || '');
      // 1.107 (§2): bags short is a warning (orange), like BAWAH SASARAN; the chit still saves.
      if (m && m.total < m.target * 0.9) return ['a', EA.t('KURANG BEG', 'BAGS SHORT')];
      if (m && m.total > m.target * 1.1) return ['a', EA.t('LEBIH BEG', 'BAGS OVER')];
    }
    if (tg && tg.short) return ['a', EA.t('BAWAH SASARAN', 'BELOW TARGET')];
    if (j.ask) return ['a', EA.t('MENUNGGU LULUS', 'WAITING APPROVAL')];
    return null;
  }
  // 1.106 (Brief_Chit_Rancangan_Rupa_Baru, signed by Yu Chen 25 Nov 2026): the morning chit from last night's plan.
  // Every planned man is a green tick under his job; tap one who did not come; PINDAH BEBERAPA ORANG moves several.
  var rbMove = null;
  function rbPlannedOn(j) {
    var pj = draft.planJobOf || {}, ids = [];
    Object.keys(draft.marks).forEach(function (id) {
      var m = draft.marks[id];
      if ((m === 'H' && jobFor(id) === j) || (m && m !== 'H' && pj[id] === j.key)) ids.push(id);
    });
    return ids;
  }
  function rbDrawConfirm() {
    var mv = rbMove;
    var h = mv ? '<div class="rb-movebar"><b>' + EA.t('Pindah ' + Object.keys(mv).length + ' orang ke:', 'Move ' + Object.keys(mv).length + ' people to:') + '</b><div class="rb-movejobs">' +
        draft.jobs.map(function (j) { return '<button type="button" data-rbto="' + esc(j.key) + '">' + esc(j.task) + (j.block ? ' · ' + esc(j.block) : '') + '</button>'; }).join('') +
        '<button type="button" data-rbmvx="1">BATAL</button></div></div>'
      : '<div class="rb-foldline" style="margin-bottom:6px"><span><b>' + EA.t('Siapa datang?', 'Who came?') + '</b><small style="display:block;color:var(--muted)">' + EA.t('Hijau = hadir. Tekan nama yang tidak datang.', 'Green = present. Tap anyone who did not come.') + '</small></span>' +
        '<button type="button" class="rb-mini" id="fh-rbmove">PINDAH BEBERAPA ORANG<span class="rb-sub">Move several</span></button></div>';
    var paired = {};
    draft.jobs.forEach(function (j) { if (j.task === 'ITF') { var pt = rbPartner(j); if (pt) paired[pt.key] = j; } });
    h += draft.jobs.filter(function (j) { return !paired[j.key]; }).map(function (j) {
      var pt = j.task === 'ITF' ? rbPartner(j) : null;
      var ids = rbPlannedOn(j).concat(pt ? rbPlannedOn(pt) : []), li = lotsInfo(j.lots), ms = rbMissOf(j);
      var bk = j.task === 'ITF' ? rbBaki(j.block, j.lots) : 0;
      var sub = (j.block ? placeName(j.block) : EA.t('Tiada blok', 'No block')) + (j.lots.length ? ' · ' + j.lots.length + EA.t(' petak', ' lots') + (li.ha && j.task !== 'ITF' && j.task !== 'LFF' ? ' · ' + li.ha.toFixed(2) + ' Ha' : '') : '') +
        (bk ? EA.t(' · baki ', ' · left ') + bk + EA.t(' tandan', ' bunches') : '');
      // 1.107 (§4, §6): the tag sits under the name (a long name is not squeezed); the tractor shows the fruit left.
      return '<div class="rb-jcard"><div class="rb-jhead"><b>' + (pt ? 'ITF + LFF' : esc(j.task)) + '</b><span><b>' + (pt ? EA.t('Traktor & pemuat', 'Tractor & loader') : esc(jobName(j.task))) + '</b><small>' + esc(sub) + '</small>' + carryNote(j) +
        (ms ? '<span class="rb-chip rb-under ' + (ms[0] === 'r' ? 'rb-r' : 'rb-a') + '">' + esc(ms[1]) + '</span>' : '') + '</span>' +
        '<button type="button" class="rb-mini rb-ubah" data-rbchj="' + esc(j.key) + '">UBAH<span class="rb-sub">Change</span></button></div>' +
        '<div class="rb-chips">' + (ids.length ? ids.map(function (id) {
          var m = draft.marks[id], off = m !== 'H';
          return '<button type="button" class="rb-mc' + (off ? ' off' : '') + (mv && mv[id] ? ' sel' : '') + '" data-rbmc="' + esc(id) + '"><i>' + (off ? esc(m) : '✓') + '</i> ' + esc(person(id)) + '</button>';
        }).join('') : '<span class="hint">' + EA.t('Tiada orang', 'Nobody') + '</span>') + '</div></div>';
    }).join('');
    $('#fh-jobs').innerHTML = h;
    el.querySelectorAll('#fh-jobs [data-rbchj]').forEach(function (b) { b.onclick = function () { editJob(b.dataset.rbchj); }; });
    var mb = $('#fh-rbmove'); if (mb) mb.onclick = function () { rbMove = {}; drawJobs(); };
    el.querySelectorAll('#fh-jobs [data-rbmvx]').forEach(function (b) { b.onclick = function () { rbMove = null; drawJobs(); }; });
    el.querySelectorAll('#fh-jobs [data-rbto]').forEach(function (b) { b.onclick = function () {
      var to = b.dataset.rbto, ids = Object.keys(rbMove || {});
      ids.forEach(function (id) { draft.marks[id] = 'H'; draft.jobOf[id] = to; });
      rbMove = null; keepDraft(); drawAll();
      if (ids.length) ui().toast(EA.t(ids.length + ' orang dipindah', ids.length + ' people moved'));
    }; });
    el.querySelectorAll('#fh-jobs [data-rbmc]').forEach(function (b) { b.onclick = function () {
      var id = b.dataset.rbmc;
      if (rbMove) { if (rbMove[id]) delete rbMove[id]; else rbMove[id] = true; drawJobs(); return; }
      var cur = draft.marks[id] || 'H';
      ui().openSheet('<h2 id="sheet-title"><span class="bm">' + esc(person(id)) + '</span><span class="en">' + esc(id) + '</span></h2>' +
        '<div class="rb-opts4">' + [['H', 'HADIR', 'Present'], ['S', 'SAKIT', 'Sick'], ['C', 'CUTI', 'Leave'], ['T', 'TAK HADIR', 'Absent']].map(function (k) {
          return '<button type="button" data-rbk="' + k[0] + '" aria-pressed="' + (cur === k[0]) + '"><b>' + k[1] + '</b><span class="rb-sub">' + k[2] + '</span></button>'; }).join('') + '</div>',
        function (sh) { sh.querySelectorAll('[data-rbk]').forEach(function (x) { x.onclick = function () {
          var k = x.dataset.rbk, pj = (draft.planJobOf || {})[id];
          ui().closeSheet(); setMark(id, k);
          if (k === 'H' && pj && job(pj)) { draft.jobOf[id] = pj; keepDraft(); drawAll(); }
        }; }); });
    }; });
  }
  function rbDrawJobs() {
    if (isConfirm()) { rbDrawConfirm(); return; }
    var rows = draftRows();
    var paired = {};
    draft.jobs.forEach(function (j) { if (j.task === 'ITF') { var pt = rbPartner(j); if (pt) paired[pt.key] = j.key; } });
    $('#fh-jobs').innerHTML = draft.jobs.length ? draft.jobs.filter(function (j) { return !paired[j.key]; }).map(function (j) {
      if (j.task === 'ITF') {
        var pt = rbPartner(j), drv = rbJobMen(j), ldr = pt ? rbJobMen(pt) : [], baki = rbBaki(j.block, j.lots), ms = rbMissOf(j);
        var tsub = (j.block ? placeName(j.block) : EA.t('Tiada blok', 'No block')) + ' · ' + j.lots.length + EA.t(' petak', ' lots') + (baki ? EA.t(' · baki ', ' · left ') + baki + EA.t(' tandan', ' bunches') : '') +
          ' · ' + (drv.length ? drv.map(person).join(', ') : EA.t('tiada pemandu', 'no driver')) + (ldr.length ? ' + ' + ldr.map(person).join(', ') : EA.t(' · muat sendiri', ' · loads himself'));
        return '<button type="button" class="rb-jrow" data-rbchj="' + esc(j.key) + '"><b class="rb-jc">' + (pt ? 'ITF + LFF' : 'ITF') + '</b><span class="rb-jt"><b>' + EA.t('Traktor & pemuat', 'Tractor & loader') + '</b><small>' + esc(tsub) + '</small>' + carryNote(j) + '</span>' +
          (ms ? '<span class="rb-chip ' + (ms[0] === 'r' ? 'rb-r' : 'rb-a') + '">' + esc(ms[1]) + '</span>' : '<i class="rb-ok">✓</i>') + '</button>';
      }
      var n = rows.filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j; }).length;
      var nw = rows.filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j && r.worker_id !== j.mandor; }).length;
      var li = lotsInfo(j.lots), tg = targetLine(j, nw, li), miss = rbJobMiss(j, n, nw, tg);
      var sub = (j.block ? placeName(j.block) : EA.t('Tiada blok', 'No block')) +
        (isMachJob(j.task) ? ' · ' + machPlace('', j.lots) : j.lots.length ? ' · ' + j.lots.length + EA.t(' petak', ' lots') + (li.ha ? ' · ' + li.ha.toFixed(2) + ' Ha' : '') : '') +
        ' · ' + n + EA.t(' orang', ' people') + (j.mandor ? ' · Mandor ' + person(j.mandor) : '');
      return '<button type="button" class="rb-jrow" data-rbchj="' + esc(j.key) + '"><b class="rb-jc">' + esc(j.task) + '</b><span class="rb-jt"><b>' + esc(jobName(j.task)) + '</b><small>' + esc(sub) + '</small>' + carryNote(j) + '</span>' +
        (miss ? '<span class="rb-chip ' + (miss[0] === 'r' ? 'rb-r' : 'rb-a') + '">' + esc(miss[1]) + '</span>' : '<i class="rb-ok">✓</i>') + '</button>';
    }).join('') : '<p class="hint">' + EA.t('Belum ada kerja. Tekan + TAMBAH KERJA untuk setiap kerja hari ini.', 'No jobs yet. Tap + ADD JOB for each job today.') + '</p>';
    el.querySelectorAll('#fh-jobs [data-rbchj]').forEach(function (b) { b.onclick = function () { editJob(b.dataset.rbchj); }; });
  }

  // ---------- v1.94 Membaja in the new look (Brief_Membaja_Rupa_Baru, signed by Yu Chen 24 Nov 2026) ----------
  // The fertiliser and the dose come from the programme and are locked; only the Owner approves a change (MINTA TUKAR,
  // an alert kind "doseask"). Bags = palms x dose / bag kg, rounded up lot by lot. "Bawa dari stor" goes on the chit,
  // into the WhatsApp text, and to the storekeeper (FH_MATERIAL, kind "bawa", one row a lot).
  function rbOn() { return !!(EA.rupaBaru && EA.rupaBaru()); }
  EA.fh = EA.fh || {};
  EA.fh.manPlan = function (estate, block, date) {
    var month = String(date || EA.today()).slice(0, 7);
    var data = EA.local.get('fh.prog.' + estate + '.' + month, null) || EA.local.get('fh.prog.' + estate + '.' + EA.today().slice(0, 7), null);
    var line = null;
    ((data && data.programme) || []).forEach(function (r) { if (r.task === 'MAN' && String(r.block) === String(block) && String(r.month) <= month && Number(r.dose) > 0) line = r; });
    if (!line) return null;
    var fert = String(line.round || '').trim() || 'Baja';
    return { fert: fert, dose: Number(line.dose), bagKg: (EA.lists.fertBagKg && EA.lists.fertBagKg[fert]) || EA.lists.bagKg || 50, month: String(line.month) };
  };
  EA.fh.manBags = function (estate, lot, dose, kg) { var l = EA.lists.lot(estate, lot); return l && l.palms ? Math.ceil(l.palms * dose / (kg || 50) - 1e-9) : 0; };
  // A change the Owner approved for this chit and block (the staff's Perlu tindakan carries it), else null.
  EA.fh.manApproved = function (estate, chit, block) {
    var c = EA.local.get('ea.todo.' + estate, null), hit = null;
    ((c && c.items) || []).forEach(function (x) { if (x.dose && x.dose.chit === chit && String(x.dose.block) === String(block) && x.dose.ok) hit = x.dose; });
    return hit;
  };
  function manInfo(j, nw, chitId) {
    var mp = EA.fh.manPlan(ctx.estate, j.block, draft.date || EA.today());
    if (!mp) return null;
    var ap = chitId ? EA.fh.manApproved(ctx.estate, chitId, j.block) : null;
    var dose = ap ? Number(ap.dose) : mp.dose, fert = ap ? ap.fert : mp.fert, bags = {}, total = 0;
    j.lots.forEach(function (l) { bags[l] = EA.fh.manBags(ctx.estate, l, dose, mp.bagKg); total += bags[l]; });
    var per = EA.lists.manTarget ? EA.lists.manTarget(ctx.estate, dose) : 20, target = nw * per;
    return { fert: fert, dose: dose, bagKg: mp.bagKg, bags: bags, total: total, per: per, target: target, approved: !!ap, prog: mp };
  }
  function manPanel(j, nw) {
    var m = manInfo(j, nw, draft.replacing || '');
    if (!m) return '<span class="en warn-t"><b>' + EA.t('Tiada program membaja untuk blok ini.', 'No manuring programme for this block.') + '</b> ' + EA.t('Beg tidak boleh dikira. Beritahu Pemilik.', 'Bags cannot be worked out. Tell the Owner.') + '</span>';
    var st = !j.lots.length ? ['r', EA.t('Pilih petak.', 'Choose the lots.')] : !nw ? ['r', EA.t('Pilih orang.', 'Choose the people.')]
      : m.total < m.target * 0.9 ? ['r', EA.t('KURANG ' + (m.target - m.total) + ' beg dari sasaran: tambah petak atau kurangkan orang.', (m.target - m.total) + ' bags below target: add lots or take a man off.')]
      : m.total > m.target * 1.1 ? ['a', EA.t('LEBIH ' + (m.total - m.target) + ' beg dari sasaran: tambah orang atau kurangkan petak.', (m.total - m.target) + ' bags over target: add a man or take lots off.')]
      : ['g', EA.t('✓ Sepadan dengan sasaran ' + nw + ' orang × ' + m.per + ' beg.', '✓ Matches the target of ' + nw + ' × ' + m.per + ' bags.')];
    var rq = j.mreq;
    return '<div class="man-panel"><div class="man-prog' + (m.approved ? ' ok' : '') + '"><b>🔒 ' + EA.t('Ikut program', 'From the programme') + ' · ' + esc(m.fert) + ' · ' + m.dose + EA.t(' kg sepokok', ' kg per palm') + '</b>' +
      '<span>' + (m.approved ? EA.t('Diluluskan Pemilik.', 'Approved by the Owner.') : EA.t('Beg ' + m.bagKg + ' kg. Jenis dan dos hanya berubah dengan kelulusan Pemilik.', m.bagKg + ' kg bags. The fertiliser and dose change only with the Owner\'s approval.')) + '</span></div>' +
      (j.lots.length ? '<p class="man-lots">' + j.lots.map(function (l) { return esc(l) + ' · <b>' + m.bags[l] + '</b>'; }).join(' &nbsp; ') + ' &nbsp;=&nbsp; <b>' + m.total + EA.t(' beg', ' bags') + '</b></p>' : '') +
      '<p class="man-line ' + st[0] + '">' + EA.t('Sasaran: ', 'Target: ') + nw + ' × ' + m.per + ' = ' + m.target + EA.t(' beg · ', ' bags · ') + esc(st[1]) + '</p>' +
      (j.lots.length ? '<div class="man-bawa"><span>' + EA.t('BAWA DARI STOR', 'TAKE FROM THE STORE') + '<small>' + esc(m.fert) + '</small></span><b>' + m.total + EA.t(' beg', ' bags') + '</b></div>' : '') +
      (rq ? '<p class="man-line a"><b>' + EA.t('Minta tukar · menunggu lulus Pemilik: ', 'Change asked · waiting for the Owner: ') + '</b>' + esc(rq.fert + ' · ' + rq.dose + ' kg') + ' · "' + esc(rq.why) + '". ' + EA.t('Sementara itu ikut program.', 'Until then the programme stands.') + '</p>'
        : '<button type="button" class="link-btn rb-mreq" data-mreq="' + esc(j.key) + '">' + EA.t('Minta tukar jenis / dos · perlu lulus Pemilik', 'Ask to change the fertiliser / dose · needs the Owner') + '</button>') + '</div>';
  }
  function manAsk(key) {
    var j = draft.jobs.find(function (x) { return x.key === key; }); if (!j) return;
    var mp = EA.fh.manPlan(ctx.estate, j.block, draft.date || EA.today()) || { fert: '', dose: '' };
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Minta tukar jenis / dos</span><span class="en">Ask to change the fertiliser / dose</span></h2>' +
      '<p class="hint">' + EA.t('Dihantar kepada Pemilik. Chit ikut program sehingga diluluskan. Pengurus dimaklumkan.', 'Sent to the Owner. The chit keeps the programme until approved. The manager is told.') + '</p>' +
      '<div class="field"><label for="mr-f">' + EA.t('Jenis baja', 'Fertiliser') + '</label><input id="mr-f" class="text-input" value="' + esc(mp.fert) + '"></div>' +
      '<div class="field"><label for="mr-d">' + EA.t('Dos (kg sepokok)', 'Dose (kg per palm)') + '</label><input id="mr-d" class="text-input" inputmode="decimal" value="' + esc(mp.dose) + '"></div>' +
      '<div class="field"><label for="mr-w">' + EA.t('Sebab', 'Why') + ' *</label><textarea id="mr-w" class="text-input" rows="2" maxlength="160"></textarea></div>' +
      '<p class="msg" id="mr-err" hidden></p><div class="actions"><button class="btn btn-ghost btn-back" type="button" id="mr-no">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-ok" type="button" id="mr-ok">SEND TO THE OWNER<small>Hantar ke Pemilik</small></button></div>',
      function (s) {
        s.querySelector('#mr-no').onclick = ui().closeSheet;
        s.querySelector('#mr-ok').onclick = function () {
          var f = s.querySelector('#mr-f').value.trim(), d = parseFloat(String(s.querySelector('#mr-d').value).replace(',', '.')), w = s.querySelector('#mr-w').value.replace(/\s+/g, ' ').trim(), m = s.querySelector('#mr-err');
          if (!f || !(d > 0) || d > 10) { m.textContent = EA.t('Isi jenis dan dos (kg sepokok).', 'Fill the fertiliser and the dose (kg per palm).'); m.hidden = false; return; }
          if (w.length < 5) { m.textContent = EA.t('Tulis sebab.', 'Write the reason.'); m.hidden = false; return; }
          if (f === mp.fert && d === Number(mp.dose)) { m.textContent = EA.t('Sama seperti program.', 'Same as the programme.'); m.hidden = false; return; }
          j.mreq = { fert: f, dose: d, why: w, from: mp.fert + ' ' + mp.dose };
          keepDraft(); ui().closeSheet(); render(el, ctx); ui().toast(EA.t('Disimpan bersama chit · Pemilik akan nampak', 'Goes with the chit · the Owner will see it'));
        };
      });
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
  var rbAllRows = false, rbRowOpen = {};
  function drawRows() {
    var taken = onOtherChit();
    var left = unmarked();
    var sun = isSunday(draft.date || EA.today());
    if ($('#fh-rows')) $('#fh-rows').classList.remove('rb-rows');
    if (rbOn() && !rbAllRows) { rbDrawRows(taken, left, sun); return; }
    $('#fh-rows').innerHTML = (left.length && sun ? '<p class="hint">' + EA.t(restBm(draft.date || EA.today()) + ': yang tidak ditanda = rehat (' + left.length + ' orang). Tanda hanya yang bekerja, sakit atau cuti.', restEn(draft.date || EA.today()) + ': anyone not marked is resting (' + left.length + '). Mark only those working, sick or on leave.') + '</p>' : '') +
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
    if (rbOn() && rbAllRows) {
      $('#fh-rows').insertAdjacentHTML('beforeend', '<button type="button" class="rb-mini" id="fh-rball">' + EA.t('TUTUP SENARAI PENUH', 'CLOSE THE FULL LIST') + '<span class="rb-sub">' + EA.t('Hanya yang belum ditanda', 'Only those not marked') + '</span></button>');
      $('#fh-rball').onclick = function () { rbAllRows = false; rbRowOpen = {}; drawRows(); };
    }
  }
  // 1.104 (new look): a line of counts, then only the men still to mark (and any H without a job). Men on a job are
  // Hadir already; S / C / T show one short line each. The full list is behind LIHAT SEMUA.
  function rbDrawRows(taken, left, sun) {
    var all = everyone(), inJob = 0, away = [], show = [];
    all.forEach(function (w) {
      if (taken[w.id]) return;
      var m = draft.marks[w.id];
      if (m === 'H' && jobFor(w.id) && !rbRowOpen[w.id]) inJob++;
      else if (m && m !== 'H' && !rbRowOpen[w.id]) away.push(w);
      else show.push(w);
    });
    var saveAll = rbAllRows; rbAllRows = true;
    var keepEveryone = everyone; everyone = function () { return show; };
    try { drawRows(); } finally { everyone = keepEveryone; rbAllRows = saveAll; }
    var box = $('#fh-rows'); box.querySelectorAll('.rows-done, #fh-rball, :scope > p.warn').forEach(function (x) { x.remove(); });
    box.classList.add('rb-rows');
    var top = '<p class="rb-count"><b>' + inJob + EA.t(' dalam kerja · ', ' on a job · ') + away.length + EA.t(' tidak bekerja · ', ' not working · ') + (sun ? 0 : left.length) + EA.t(' belum ditanda', ' not marked') + '</b></p>';
    box.insertAdjacentHTML('afterbegin', top);
    box.insertAdjacentHTML('beforeend', away.map(function (w) {
      var m = draft.marks[w.id];
      return '<button type="button" class="rb-prow" data-rbrow="' + esc(w.id) + '"><b>' + esc(w.name) + '</b><span class="rb-chip w">' + esc(m + ' · ' + EA.t(MARKS[m] ? MARKS[m][0] : m, MARKS[m] ? MARKS[m][1] : m)) + ' · TUKAR</span></button>';
    }).join('') + '<button type="button" class="rb-mini" id="fh-rball">' + EA.t('LIHAT SEMUA ' + all.filter(function (w) { return !taken[w.id]; }).length + ' ORANG ›', 'SEE ALL ' + all.filter(function (w) { return !taken[w.id]; }).length + ' PEOPLE ›') + '<span class="rb-sub">' + EA.t('Termasuk yang sudah dalam kerja', 'Including those on a job') + '</span></button>');
    box.querySelectorAll('[data-rbrow]').forEach(function (b) { b.onclick = function () { rbRowOpen[b.dataset.rbrow] = true; drawRows(); }; });
    $('#fh-rball').onclick = function () { rbAllRows = true; drawRows(); };
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
    var pick = j0 ? { task: j0.task, block: j0.block, lots: j0.lots.slice(), mandor: j0.mandor, ask: j0.ask || '', repeat: Object.assign({}, j0.repeat || {}) } : { task: '', block: '', lots: [], mandor: '', ask: '', repeat: {} };
    var hasMain = !!EA.lists.mainJobs[ctx.estate];
    // 1.102 (Brief_Tambah_Kerja_Rupa_Baru, new look only): one place to pick the job, blocks as buttons, the men on
    // the same screen, the tractor and its loader as one button, and SIMPAN says what is still missing.
    var rb = rbOn();
    if (rb) { pick.men = {}; pick.menFor = null; pick.ld = ''; }
    var used = key ? draftRows().filter(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j0; }).length : 0;
    ui().openSheet(
      '<h2 id="sheet-title"><span class="bm">' + (key ? 'Ubah kerja' : 'Tambah kerja') + '</span><span class="en">' + (key ? 'Change job' : 'Add a job') + '</span></h2>' +
      (rb ? '<p class="rb-st"><span class="inline"><span class="bm">1 · Kerja apa?</span> · <span class="en">Which job</span></span></p><div id="jb-rbjob" hidden></div>' : '') +
      '<div class="field" id="jb-quickbox"><span class="inline"><span class="bm">' + (hasMain ? 'Kerja harian' : 'Kerja biasa') + '</span> · <span class="en">' + (hasMain ? 'Every day' : 'Usual jobs') + '</span></span><div class="picks jb-quick" id="jb-quick">' +
        EA.lists.quickJobsFor(ctx.estate).map(function (c) { var t = task(c); return '<button type="button" class="pick" data-quick="' + c + '" aria-pressed="' + (c === pick.task) + '"><b>' + c + '</b><small>' + esc(EA.t(t.bm, t.en)) + '</small></button>'; }).join('') + '</div>' +
        // v1.36: the other main jobs (rounds, machines, lorry, repairs), folded so the shortcuts stay short.
        (EA.lists.moreJobsFor(ctx.estate).length ? '<details class="jb-more" id="jb-more"' + (EA.lists.moreJobsFor(ctx.estate).indexOf(pick.task) >= 0 || EA.lists.OP_JOBS.indexOf(pick.task) >= 0 || (pick.task && !EA.lists.isMainJob(ctx.estate, pick.task)) ? ' open' : '') + '><summary><span class="bm">Kerja pusingan & lain · ' + EA.lists.moreJobsFor(ctx.estate).length + '</span> <span class="en">Round & other main jobs</span>' +
          // v1.43 (27 Oct): the names show on the folded button, so Membaja is found without opening it.
          '<small class="jb-more-names">' + esc(EA.lists.moreJobsFor(ctx.estate).map(function (c) { var t = c === 'OP' ? { bm: 'Operator jentera', en: 'Machine operator' } : task(c); return EA.t(t.bm, t.en); }).join(', ')) + '</small></summary><div class="picks jb-quick jb-small">' +
          EA.lists.moreJobsFor(ctx.estate).map(function (c) { var t = c === 'OP' ? { bm: 'Operator jentera', en: 'Machine operator' } : task(c); return '<button type="button" class="pick" data-quick="' + c + '" aria-pressed="' + (c === pick.task || (c === 'OP' && EA.lists.OP_JOBS.indexOf(pick.task) >= 0)) + '"><b>' + c + '</b><small>' + esc(EA.t(t.bm, t.en)) + '</small></button>'; }).join('') + '</div></details>' : '') + '</div>' +
      (rb ? '<button type="button" class="rb-addo" id="jb-otherbtn">' + (hasMain ? '+ KERJA LAIN<span class="rb-sub">tiada di atas · perlu lulus Pengurus · Other work, needs approval</span>' : '+ SEMUA KERJA<span class="rb-sub">All job codes</span>') + '</button><div id="jb-otherlist" hidden></div>' : '') +
      '<div class="field' + (hasMain ? ' jb-other' : '') + '" id="jb-taskbox"><label for="jb-task"><span class="bm">' + (hasMain ? '+ Kerja lain · minta lulus' : 'Kerja (semua kod)') + '</span><span class="en">' + (hasMain ? 'Other work · needs the Assistant Manager\'s approval' : 'Job code (all codes)') + '</span></label><select id="jb-task" class="text-input">' + taskOptions(pick.task) + '</select></div>' +
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
      (rb ? '<p class="rb-st" id="jb-st2"><span class="inline"><span class="bm">2 · Di mana?</span> · <span class="en">Block and lots</span></span></p>' : '') +
      '<div id="jb-where">' + (rb ? '<div id="jb-rbblk"></div><div class="rb-tot" id="jb-tot" hidden></div><div id="jb-man"></div>' : '') + '<div class="field" id="jb-blockbox"><label for="jb-block"><span class="bm">Blok</span><span class="en">Block</span></label><select id="jb-block" class="text-input"></select></div>' +
      '<p class="hint jb-round" id="jb-round" hidden></p>' +
      '<div class="field"><span class="inline" id="jb-lotlbl"><span class="bm">Petak · jika tahu</span> · <span class="en">Lots, if known</span></span><div id="jb-lots"></div>' +
        '<p class="hint"><span class="bm">Belum pasti petak? Boleh isi petang di Kerja.</span><span class="en">Lots not sure yet? Add them in the afternoon in Day\'s work.</span></p></div></div>' +
      // v1.34: the tractor's loader partner goes on the same lots (as LFF).
      (key ? '' : '<div class="field" id="jb-pair" hidden><label for="jb-ld"><span class="bm">Pasangan pemuat (LFF)</span><span class="en">Loader partner (LFF)</span></label><select id="jb-ld" class="text-input"><option value="">' + EA.t('— Tiada / pilih nanti —', '— None / later —') + '</option>' +
        EA.lists.workersFor(ctx.estate).filter(function (w) { return !onOtherChit()[w.id]; }).sort(function (a, b) { return /Muat|Load/i.test(b.gang || '') - /Muat|Load/i.test(a.gang || '') || (a.name < b.name ? -1 : 1); })
          .map(function (w) { return '<option value="' + esc(w.id) + '">' + esc(w.name) + (w.gang ? ' · ' + esc(w.gang) : '') + '</option>'; }).join('') + '</select></div>') +
      (rb ? '<div id="jb-who" hidden></div>' : '') +
      '<div class="field"><label for="jb-mdr"><span class="bm">Mandor</span><span class="en">Foreman (optional)</span></label><select id="jb-mdr" class="text-input"><option value="">' + EA.t('— Tiada —', '— None —') + '</option>' +
        EA.lists.mandorsFor(ctx.estate).map(function (m) { return '<option value="' + m.id + '"' + (m.id === pick.mandor ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="actions">' + (key ? '<button class="btn btn-ghost" type="button" id="jb-del"' + (used && !rb ? ' disabled title="Ada orang dalam kerja ini"' : '') + '>REMOVE<small>Buang</small></button>' : '') +
      '<button class="btn btn-ghost" type="button" id="jb-cancel">CANCEL<small>Batal</small></button>' +
      '<button class="btn btn-ok" type="button" id="jb-save">SAVE<small>Simpan</small></button></div>' +
      (used && !rb ? '<p class="hint">' + EA.t(used + ' orang dalam kerja ini. Pindahkan mereka dahulu untuk buang.', used + ' people on this job; move them first to remove it.') + '</p>' : '') +
      // 1.107 (Yu Chen, 25 Nov: "Remove button cannot function"): in the new look BUANG works with men on the job. The
      // first tap asks in the sheet; YA, BUANG takes the job off and its men go back to "belum ditanda".
      (used && rb ? '<p class="hint rb-delask" id="jb-delask" hidden></p>' : ''),
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
          if (ROUND_JOBS[pick.task] && !EA.local.get('fh.prog.' + ctx.estate + '.' + EA.today().slice(0, 7), null) && !fill.asked && EA.fh.program && EA.fh.program.refresh) {
            fill.asked = true; EA.fh.program.refresh(ctx.estate, EA.today().slice(0, 7), function () { if (document.body.contains(s)) fill(); });
          }
          lotPicks.repeat = pick.repeat; lotPicks.ask = pick.askLot || ''; lotPicks.editKey = key || '';
          s.querySelector('#jb-lots').innerHTML = lotPicks(pick.block, pick.lots, pick.task);
          lotPicks.repeat = null; lotPicks.ask = ''; lotPicks.editKey = '';
          var sg = s.querySelector('#jb-suggest');
          if (sg) sg.onclick = function () { sg.dataset.lots.split(' ').forEach(function (l) { if (pick.lots.indexOf(l) < 0) pick.lots.push(l); }); fill(); };
          s.querySelectorAll('#jb-lots .picks:not(#jb-repeat .picks) .pick[data-lot]').forEach(function (b) {
            b.onclick = function () {
              var i = pick.lots.indexOf(b.dataset.lot);
              // v1.52.3: a lot already done this round asks once (with a reason) before it is picked
              if (i < 0 && b.dataset.done) { pick.askLot = b.dataset.lot; fill(); var rp = s.querySelector('#jb-repeat'); if (rp && rp.scrollIntoView) rp.scrollIntoView({ block: 'center' }); return; }
              if (i >= 0) { pick.lots.splice(i, 1); delete pick.repeat[b.dataset.lot]; if (b.dataset.done) { fill(); return; } } else pick.lots.push(b.dataset.lot);
              b.setAttribute('aria-pressed', i < 0);
              if (rb) rbTot();
            };
          });
          s.querySelectorAll('#jb-repeat [data-why]').forEach(function (b) {
            b.onclick = function () {
              var lot = pick.askLot; if (!lot) return;
              pick.repeat[lot] = REPEAT_WHY[Number(b.dataset.why)][0];
              if (pick.lots.indexOf(lot) < 0) pick.lots.push(lot);
              pick.askLot = ''; fill();
            };
          });
          var rn = s.querySelector('#jb-repeat-no'); if (rn) rn.onclick = function () { pick.askLot = ''; fill(); };
          if (rb) rbFill();
        }
        // ---- 1.102: the new look of this sheet. It only shows and hides; the picks and the save are the ones above. ----
        function rbBusy(id) {
          var m = draft.marks[id];
          if (m && m !== 'H') return EA.t(MARKS[m][0], MARKS[m][1]);
          var o = m === 'H' ? jobFor(id) : null;
          return o && o !== j0 ? o.task + (o.block ? ' Blk ' + o.block : '') : '';
        }
        // 1.104: the men now on the job being changed
        function rbNowMen() { return j0 ? Object.keys(draft.marks).filter(function (id) { return draft.marks[id] === 'H' && jobFor(id) === j0; }) : []; }
        function rbPeople() { var taken = onOtherChit(); return EA.lists.workersFor(ctx.estate).filter(function (w) { return !taken[w.id]; }); }
        function rbLastMen(code) {
          var last = lastChit(), ids = [], all = rbPeople();
          if (last) last.rows.forEach(function (r) { if (r.muster === 'H' && r.task_code === code && ids.indexOf(r.worker_id) < 0 && all.some(function (w) { return w.id === r.worker_id; })) ids.push(r.worker_id); });
          return ids;
        }
        function rbMen() { return Object.keys(pick.men).filter(function (k) { return pick.men[k]; }); }
        function rbReady() {
          var t = pick.task;
          if (!t) return ['PILIH KERJA', 'Choose the job'];
          if (!EA.lists.isMainJob(ctx.estate, t) && String(pick.ask || '').replace(/\s+/g, ' ').trim().length < 5) return ['TULIS SEBAB', 'Write why'];
          if (EA.lists.MACHINE_JOBS.indexOf(t) >= 0 && !EA.lists.splitMach(ctx.estate, pick.lots).mach.length) return ['PILIH JENTERA', 'Choose the machine'];
          if (EA.lists.needsBlock(t) && !pick.block) return ['PILIH BLOK', 'Choose the block'];
          if (t === EA.lists.HARVEST && !pick.lots.length) return ['PILIH PETAK', 'Choose the lots'];
          if (!key && !rbMen().length) return t === 'ITF' ? ['PILIH PEMANDU', 'Choose the driver'] : ['PILIH ORANG', 'Choose the people'];
          return null;
        }
        // 1.104: "N petak · X Ha" while lots are tapped, with the job's target; Membaja's programme and bags too
        function rbTot() {
          var bar = s.querySelector('#jb-tot'), mb = s.querySelector('#jb-man'); if (!bar) return;
          var t = pick.task, on = !!t && !!pick.block && EA.lists.needsBlock(t) && !isMachJob(t) && !pick.blkOpen;
          var li = lotsInfo(pick.lots), nw = rbMen().filter(function (id) { return id !== pick.mandor; }).length;
          bar.hidden = !on;
          if (on && (t === 'ITF' || t === 'LFF')) {
            var hv = (rbHarvLots()[pick.block] || []).filter(function (l) { return pick.lots.indexOf(l) >= 0; }).length, bk = rbBaki(pick.block, pick.lots);
            bar.innerHTML = '<b>' + pick.lots.length + EA.t(' petak', ' lots') + (bk ? EA.t(' · baki ', ' · left ') + bk + EA.t(' tandan', ' bunches') : '') + (hv ? EA.t(' + tuai hari ini ', ' + harvest today ') + hv + EA.t(' petak', ' lots') : '') + '</b>';
          } else if (on) {
            var tg = t === 'MAN' ? null : targetLine({ task: t, block: pick.block, lots: pick.lots }, nw, li);
            bar.innerHTML = '<b>' + pick.lots.length + EA.t(' petak · ', ' lots · ') + li.ha.toFixed(2) + ' Ha</b>' + (tg ? '<small>' + tg.text + '</small>' : '');
          }
          if (mb) {
            mb.innerHTML = on && t === 'MAN' ? manPanel({ key: key || '', task: 'MAN', block: pick.block, lots: pick.lots, mreq: j0 && j0.mreq }, nw) : '';
            var mq = mb.querySelector('[data-mreq]');
            if (mq) { if (key) mq.onclick = function () { manAsk(key); }; else mq.remove(); }
          }
          rbSaveLabel();
        }
        function rbSaveLabel() {
          var r = rbReady(), b = s.querySelector('#jb-save');
          var tl = pick.lots.length && pick.block && !isMachJob(pick.task) && pick.task !== 'ITF' && pick.task !== 'LFF' ? ' · ' + pick.lots.length + ' petak · ' + lotsInfo(pick.lots).ha.toFixed(2) + ' Ha' : '';
          b.dataset.l2 = '1';
          b.innerHTML = r ? rbLbl(r[0], r[1]) : rbLbl('SIMPAN' + tl, 'SAVE' + tl.replace(' petak', ' lots'));
          b.classList.toggle('rb-notyet', !!r);
        }
        function rbWho() {
          var box = s.querySelector('#jb-who'); if (!box) return;
          var t = pick.task, show = !!t && (!EA.lists.needsBlock(t) || !!pick.block);
          box.hidden = !show; if (!show) return;
          var all = rbPeople(), byId = {}; all.forEach(function (w) { byId[w.id] = w; });
          var same = !!j0 && t === j0.task;
          if (pick.menFor !== t) {
            pick.menFor = t; pick.men = {}; pick.moreMen = false; pick.moreLd = false; pick.ld = '';
            (same ? rbNowMen() : rbLastMen(t)).forEach(function (id) { if (!rbBusy(id)) pick.men[id] = true; });
            if (t === 'ITF' && !key) pick.ld = rbLastMen('LFF').filter(function (id) { return !rbBusy(id) && !pick.men[id]; })[0] || '';
            if (t === 'ITF' && same) { var p0 = rbPartner(j0); pick.ld = p0 ? (rbJobMen(p0)[0] || '') : ''; }
          }
          var before = same ? rbNowMen() : rbLastMen(t), day = same ? EA.t('hari ini', 'today') : lastChit() ? niceDate(lastChit().date) : '';
          if (same) before = before.concat(Object.keys(pick.men).filter(function (id) { return pick.men[id] && before.indexOf(id) < 0; }));
          var ids = pick.moreMen || !before.length ? before.concat(all.map(function (w) { return w.id; }).filter(function (id) { return before.indexOf(id) < 0; })) : before;
          function row(id, attr, on, note) {
            var w = byId[id], busy = rbBusy(id);
            return '<button type="button" class="rb-who" ' + attr + '="' + esc(id) + '" aria-pressed="' + !!on + '"' + (busy && !on ? ' disabled' : '') + '><i>' + (on ? '✓' : '') + '</i><span><b>' + esc(w.name) + '</b><small>' +
              esc(busy && !on ? EA.t('sudah di ', 'already on ') + busy : (note || w.id + (w.gang ? ' · ' + w.gang : ''))) + '</small></span></button>';
          }
          var h = '<p class="rb-st"><span class="inline"><span class="bm">3 · Siapa? · ' + (rbMen().length + (t === 'ITF' && pick.ld ? 1 : 0)) + ' orang</span> · <span class="en">Who · ' + (rbMen().length + (t === 'ITF' && pick.ld ? 1 : 0)) + ' people</span></span></p>' +
            (t === 'ITF' ? '<p class="hint"><b>' + EA.t('Pemandu traktor (ITF)', 'Tractor driver (ITF)') + '</b></p>' : '') +
            '<p class="hint">' + (same ? EA.t('Orang dalam kerja ini. Buang tanda untuk keluarkan; dia jadi belum ditanda.', 'The people on this job. Untick to take a man off; he goes back to not marked.') : before.length ? EA.t('Ditanda: yang buat ' + t + ' pada ' + day + '. Buang tanda yang tidak datang.', 'Ticked: on ' + t + ' on ' + day + '. Untick anyone not coming.') : EA.t('Tanda orang untuk kerja ini.', 'Tick the people for this job.')) + ' ' + EA.t('Yang ditanda = Hadir.', 'Ticked = present.') + '</p>' +
            ids.map(function (id) { return row(id, 'data-rbman', pick.men[id], before.indexOf(id) >= 0 ? t + ' · ' + day : ''); }).join('') +
            (before.length && !pick.moreMen ? '<button type="button" class="rb-mini" id="jb-moremen">+ ORANG LAIN<span class="rb-sub">Other people</span></button>' : '');
          if (t === 'ITF') {
            var lb = rbLastMen('LFF'), lids = (pick.moreLd ? lb.concat(all.map(function (w) { return w.id; }).filter(function (id) { return lb.indexOf(id) < 0; })) : lb).filter(function (id) { return !pick.men[id]; });
            if (pick.ld && lids.indexOf(pick.ld) < 0) lids.unshift(pick.ld);
            h += '<p class="hint" style="margin-top:12px"><b>' + EA.t('Pemuat (LFF)', 'Loader (LFF)') + '</b></p>' +
              '<button type="button" class="rb-who" data-rbld="" aria-pressed="' + !pick.ld + '"><i>' + (!pick.ld ? '✓' : '') + '</i><span><b>' + EA.t('Tiada · pemandu muat sendiri', 'None · the driver loads himself') + '</b><small>' + EA.t('seorang buat kedua-dua', 'one man does both') + '</small></span></button>' +
              lids.map(function (id) { return row(id, 'data-rbld', pick.ld === id, lb.indexOf(id) >= 0 ? 'LFF · ' + day : ''); }).join('') +
              (!pick.moreLd ? '<button type="button" class="rb-mini" id="jb-moreld">+ PEMUAT LAIN<span class="rb-sub">Another loader</span></button>' : '') +
              '<p class="hint">' + EA.t('Pemuat dapat kerja LFF pada petak yang sama; petang nanti ditutup bersama traktor.', 'The loader gets LFF on the same lots; in the afternoon the two close together.') + '</p>';
          }
          box.innerHTML = h;
          box.querySelectorAll('[data-rbman]').forEach(function (b) { b.onclick = function () { var id = b.dataset.rbman; pick.men[id] = !pick.men[id]; if (pick.men[id] && pick.ld === id) pick.ld = ''; rbWho(); rbTot(); }; });
          box.querySelectorAll('[data-rbld]').forEach(function (b) { b.onclick = function () { pick.ld = b.dataset.rbld; rbWho(); rbSaveLabel(); }; });
          var mm = box.querySelector('#jb-moremen'); if (mm) mm.onclick = function () { pick.moreMen = true; rbWho(); };
          var ml = box.querySelector('#jb-moreld'); if (ml) ml.onclick = function () { pick.moreLd = true; rbWho(); };
        }
        function rbFill() {
          var t = pick.task, sel = s.querySelector('#jb-task'), main = !t || EA.lists.isMainJob(ctx.estate, t);
          var hasOther = sel.querySelectorAll('option[value]:not([value=""])').length > 0;
          s.querySelector('#jb-taskbox').hidden = true;
          s.querySelector('#jb-quickbox').classList.add('rb-q'); s.querySelector('#jb-lots').classList.add('rb-l');
          s.querySelector('#jb-quickbox').hidden = !!t || !!pick.other;
          s.querySelector('#jb-otherbtn').hidden = !!t || !!pick.other || !hasOther;
          var ol = s.querySelector('#jb-otherlist'); ol.hidden = !!t || !pick.other;
          if (!ol.hidden) {
            ol.innerHTML = '<button type="button" class="rb-mini" id="jb-otherback">‹ ' + (hasMain ? 'KERJA HARIAN' : 'KERJA BIASA') + '<span class="rb-sub">Back</span></button>' +
              (hasMain ? '<p class="hint">' + EA.t('Kerja lain perlu lulus Pengurus. Pilih satu:', 'Other work needs the Assistant Manager\'s approval. Choose one:') + '</p>' : '') +
              [].slice.call(sel.querySelectorAll('optgroup')).map(function (g) {
                return '<p class="hint pick-group"><b>' + esc(g.label) + '</b></p><div class="rb-jg rb-oth">' + [].slice.call(g.querySelectorAll('option')).map(function (o) {
                  return '<button type="button" data-oth="' + esc(o.value) + '"><b>' + esc(o.value) + '</b><span>' + esc(o.textContent.slice(o.value.length + 1)) + '</span></button>'; }).join('') + '</div>'; }).join('');
            ol.querySelector('#jb-otherback').onclick = function () { pick.other = false; fill(); };
            ol.querySelectorAll('[data-oth]').forEach(function (b) { b.onclick = function () { pick.task = b.dataset.oth; pick.other = false; fill(); }; });
          }
          // the tractor and its loader are one button when adding
          if (!key) s.querySelectorAll('.jb-quick [data-quick]').forEach(function (b) {
            if (b.dataset.quick === 'LFF' && s.querySelector('.jb-quick [data-quick="ITF"]')) b.hidden = true;
            if (b.dataset.quick === 'ITF' && s.querySelector('.jb-quick [data-quick="LFF"]')) b.innerHTML = '<b>ITF + LFF</b><small>' + EA.t('Traktor & pemuat', 'Tractor & loader') + '</small>';
          });
          var pj = s.querySelector('#jb-rbjob'); pj.hidden = !t;
          if (t) {
            var pair = t === 'ITF';
            pj.innerHTML = '<div class="rb-picked"><b>' + (pair ? 'ITF + LFF' : esc(t)) + '</b><span class="rb-s">' + esc(pair ? EA.t('Traktor & pemuat', 'Tractor & loader') : jobName(t)) +
              (main ? '' : '<span class="rb-tag">' + EA.t('KERJA LAIN · MINTA LULUS', 'OTHER WORK · NEEDS APPROVAL') + '</span>') + '</span><button type="button" id="jb-tukar">TUKAR KERJA</button></div>';
            pj.querySelector('#jb-tukar').onclick = function () { pick.task = ''; pick.other = false; pick.block = ''; pick.lots = []; pick.repeat = {}; pick.askLot = ''; pick.autoFor = ''; pick.blkOpen = false; fill(); };
          }
          // step 2: blocks as buttons
          var needs = t ? EA.lists.needsBlock(t) : true, st2 = s.querySelector('#jb-st2');
          st2.classList.toggle('rb-off', !t);
          s.querySelector('#jb-where').hidden = !t || !needs;
          s.querySelector('#jb-blockbox').hidden = true;
          var bsel = s.querySelector('#jb-block'), bb = s.querySelector('#jb-rbblk');
          var opts = [].slice.call(bsel.options).filter(function (o) { return o.value; });
          function parts(o) { var x = o.textContent.split(' · '); return [x[0], x.slice(1, 3).join(' · ')]; }
          var cur = opts.find(function (o) { return o.value === pick.block; });
          if (cur && !pick.blkOpen) {
            bb.innerHTML = '<div class="rb-picked"><b>' + esc(parts(cur)[0]) + '</b><span class="rb-s">' + esc(parts(cur)[1]) + '</span>' + (opts.length > 1 ? '<button type="button" id="jb-tukarblk">TUKAR BLOK</button>' : '') + '</div>';
            var tb = bb.querySelector('#jb-tukarblk'); if (tb) tb.onclick = function () { pick.blkOpen = true; fill(); };
          } else {
            bb.innerHTML = '<div class="rb-bg4">' + opts.map(function (o) { return '<button type="button" data-rbblk="' + esc(o.value) + '" aria-pressed="' + (o.value === pick.block) + '"><b>' + esc(parts(o)[0].replace(/^Blok /, '')) + '</b><small>' + esc(parts(o)[1].split(' · ').pop()) + '</small></button>'; }).join('') + '</div>';
            bb.querySelectorAll('[data-rbblk]').forEach(function (b) { b.onclick = function () {
              pick.blkOpen = false;
              if (b.dataset.rbblk === pick.block) { fill(); return; }
              bsel.value = b.dataset.rbblk; bsel.onchange.call(bsel);
            }; });
          }
          var lf = s.querySelector('#jb-lots'); if (lf && lf.parentNode) lf.parentNode.hidden = !cur || !!pick.blkOpen;
          var pr = s.querySelector('#jb-pair'); if (pr) pr.hidden = true;
          rbWho(); rbTot();
        }
        fill();
        s.querySelector('#jb-task').onchange = function () { pick.task = this.value; fill(); };
        s.querySelectorAll('.jb-quick [data-quick]').forEach(function (b) { b.onclick = function () { pick.task = b.dataset.quick === 'OP' ? (EA.lists.OP_JOBS.indexOf(pick.task) >= 0 ? pick.task : 'OPH') : b.dataset.quick; fill(); }; });
        s.querySelector('#jb-block').onchange = function () { pick.block = this.value; pick.lots = []; pick.repeat = {}; pick.askLot = ''; fill(); };
        s.querySelector('#jb-mdr').onchange = function () { pick.mandor = this.value; };
        s.querySelector('#jb-why').oninput = function () { pick.ask = this.value; if (rb) rbSaveLabel(); };
        if (rb) s.querySelector('#jb-otherbtn').onclick = function () { pick.other = true; fill(); };
        s.querySelector('#jb-cancel').onclick = ui().closeSheet;
        if (key) s.querySelector('#jb-del').onclick = function () {
          var gone = [j0], men = [];
          if (rb) {
            var pj = j0 && j0.task === 'ITF' ? rbPartner(j0) : null; if (pj) gone.push(pj);
            men = Object.keys(draft.marks).filter(function (id) { return draft.marks[id] === 'H' && gone.indexOf(jobFor(id)) >= 0 && gone.every(function (g) { return id !== g.mandor; }); });
            var ask = s.querySelector('#jb-delask');
            if (men.length && ask && ask.hidden) {
              ask.hidden = false;
              ask.innerHTML = '<b>' + EA.t('Buang kerja ini' + (pj ? ' (dengan pemuat)' : '') + '?', 'Remove this job' + (pj ? ' (with the loader)' : '') + '?') + '</b> ' +
                EA.t(men.length + ' orang balik ke "belum ditanda": ' + men.map(person).join(', ') + '. Tekan YA, BUANG sekali lagi.',
                  men.length + (men.length === 1 ? ' man goes' : ' men go') + ' back to "not marked": ' + men.map(person).join(', ') + '. Tap YES, REMOVE again.');
              this.dataset.l2 = '1'; this.innerHTML = rbLbl('YA, BUANG', 'YES, REMOVE'); this.classList.add('rb-delyes');
              ask.scrollIntoView({ block: 'nearest' });
              return;
            }
          }
          var prevH = rb ? rbHarvLots() : null;
          men.forEach(function (id) { delete draft.marks[id]; delete draft.jobOf[id]; });
          draft.jobs = draft.jobs.filter(function (x) { return gone.indexOf(x) < 0 && x.key !== key; });
          if (rb) rbColFollow(prevH);
          Object.keys(draft.jobOf).forEach(function (w) { if (gone.some(function (g) { return g && draft.jobOf[w] === g.key; }) || draft.jobOf[w] === key) delete draft.jobOf[w]; });
          keepDraft(); ui().closeSheet(); drawAll();
        };
        s.querySelector('#jb-save').onclick = function () {
          if (rb && pick.task && !key && !rbMen().length) { ui().toast(pick.task === 'ITF' ? EA.t('Pilih pemandu', 'Choose the driver') : EA.t('Pilih orang untuk kerja ini', 'Choose the people for this job'), 'bad'); return; }
          if (rb && s.querySelector('#jb-ld')) s.querySelector('#jb-ld').value = pick.task === 'ITF' ? pick.ld : '';
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
          var rep = {}; pick.lots.forEach(function (l) { if (pick.repeat[l]) rep[l] = pick.repeat[l]; });
          var prevH = rb ? rbHarvLots() : null, part0 = rb && j0 && j0.task === 'ITF' ? rbPartner(j0) : null;
          if (j0 && rb) {
            var keepOn = {}; rbMen().forEach(function (id) { keepOn[id] = true; });
            rbNowMen().forEach(function (id) { if (!keepOn[id] && id !== j0.mandor) { delete draft.marks[id]; delete draft.jobOf[id]; } });
            rbMen().forEach(function (id) { draft.marks[id] = 'H'; draft.jobOf[id] = j0.key; });
          }
          if (j0) { j0.task = pick.task; j0.block = pick.block; j0.lots = pick.lots; j0.mandor = pick.mandor; if (pick.ask) j0.ask = pick.ask; else delete j0.ask; if (Object.keys(rep).length) j0.repeat = rep; else delete j0.repeat; }
          else { var nj = { key: 'j' + (draft.nextJob++), task: pick.task, block: pick.block, lots: pick.lots, mandor: pick.mandor }; if (pick.ask) nj.ask = pick.ask; if (Object.keys(rep).length) nj.repeat = rep; draft.jobs.push(nj);
                 if (pick.mandor && !draft.marks[pick.mandor]) draft.marks[pick.mandor] = 'H';
                 var ld = s.querySelector('#jb-ld') && pick.task === 'ITF' ? s.querySelector('#jb-ld').value : '';
                 if (ld) {        // the loader partner: an LFF job on the same lots
                   var lj = draft.jobs.find(function (x) { return x.task === 'LFF' && x.block === pick.block && x.lots.join(' ') === pick.lots.join(' '); });
                   if (!lj) { lj = { key: 'j' + (draft.nextJob++), task: 'LFF', block: pick.block, lots: pick.lots.slice(), mandor: '' }; draft.jobs.push(lj); }
                   draft.marks[ld] = 'H'; draft.jobOf[ld] = lj.key;
                 }
                 // 1.102: the men ticked on this sheet go on the job, present
                 if (rb) rbMen().forEach(function (id) { if (id !== ld) { draft.marks[id] = 'H'; draft.jobOf[id] = nj.key; } }); }
          // 1.105: a changed tractor keeps its loader on the same lots, and one man or a pair can be switched
          if (rb && j0 && j0.task === 'ITF') {
            var pj = part0, curL = pj ? Object.keys(draft.jobOf).filter(function (w) { return draft.jobOf[w] === pj.key; }) : [];
            if (pj) { pj.block = j0.block; pj.lots = j0.lots.slice(); }
            if (pick.ld) {
              if (!pj) { pj = { key: 'j' + (draft.nextJob++), task: 'LFF', block: j0.block, lots: j0.lots.slice(), mandor: '' }; draft.jobs.push(pj); }
              curL.forEach(function (w) { if (w !== pick.ld) { delete draft.marks[w]; delete draft.jobOf[w]; } });
              draft.marks[pick.ld] = 'H'; draft.jobOf[pick.ld] = pj.key;
            } else if (pj) {
              curL.forEach(function (w) { delete draft.marks[w]; delete draft.jobOf[w]; });
              draft.jobs = draft.jobs.filter(function (x) { return x !== pj; });
            }
          }
          if (rb) rbColFollow(prevH);
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


  // ---------- v1.61 rain, keyed by every estate from its own gauge (Yu Chen, 15 Nov 2026) ----------
  // Until 1.88 there were two readings a day: the morning chit keyed the night (6 pm–12 am, 12 am–6 am) and
  // Tutup hari keyed the day (6 am–12 pm, 12 pm–6 pm). Those night readings are still read back the old way
  // (NIGHT, rainLinesOld) — nothing already keyed is changed.
  // v1.72 (Yu Chen, 18 Nov 2026): the clock on both sides, the stored codes 18-24 and 00-06 unchanged.
  var NIGHT = [['18-24', '6 ptg–12 mlm', '6pm–12am'], ['00-06', '12 mlm–6 pg', '12am–6am']];
  function periodText(codes, list, en) {
    var c = String(codes || '').split(/[ ,]+/).filter(Boolean);
    var known = c.map(function (x) { var p = list.find(function (q) { return q[0] === x; }); return p ? p[en ? 2 : 1] : null; });
    return known.every(Boolean) ? known.join(' · ') : String(codes || '');
  }

  // ---------- v1.88 one reading a day, at the morning chit, for the day that ended ----------
  // (Yu Chen, 23 Nov 2026: "the rain also make confuse. why no we do it the same time ?"; Brief_Hujan 0.2
  // sections 2–5, agreed 19 Nov; Brief_Tutup_Hari_Baru section 3, signed 23 Nov.)
  // The gauge is read once, at the muster call, for the day that just ended, and the card says which day by name
  // ("Hujan semalam · Ahad 22 Nov") — never "hari ini", which is how 13 mm was keyed where 35 belonged on 17 Nov.
  // TIADA HUJAN is one tap. Otherwise one mm figure (a gauge holds one total, so mm is never asked per period),
  // the periods it fell in, in the order of the company's paper form, and for each period a start and stop if he
  // knows them. Rain is no longer asked at the close.
  //
  // Where it is kept: on the chit, as before (FH_CHIT rain_mm, rain_time), so the office needs no change. rain_time
  // now begins with the day the rain fell — "hari=2026-11-22 12-18@14:30-15:10 18-24" — so the record carries
  // its own date (Brief_Hujan section 10) and a reading of 1.88 can never be mistaken for an old night reading.
  var DAY4 = [['00-06', 'Awal pagi', 'Early morning', '12 mlm–6 pg', '12am–6am'], ['06-12', 'Pagi', 'Morning', '6 pg–12 tgh', '6am–12pm'],
              ['12-18', 'Petang', 'Afternoon', '12 tgh–6 ptg', '12pm–6pm'], ['18-24', 'Malam', 'Night', '6 ptg–12 mlm', '6pm–12am']];
  function parseRain(time) {
    var s = String(time || ''), m = /hari=(\d{4}-\d\d-\d\d)/.exec(s), out = { day: m ? m[1] : '', per: [], at: {} };
    if (!m) return out;
    s.replace(/hari=\S+/, '').split(/\s+/).filter(Boolean).forEach(function (x) {
      var p = /^(\d\d-\d\d)(?:@(\S*))?$/.exec(x); if (!p || out.per.indexOf(p[1]) >= 0) return;
      out.per.push(p[1]); if (p[2]) out.at[p[1]] = p[2];
    });
    return out;
  }
  function buildRain(day, per, at) {
    return ['hari=' + day].concat(DAY4.map(function (p) { return p[0]; }).filter(function (k) { return per.indexOf(k) >= 0; })
      .map(function (k) { var t = String((at || {})[k] || '').trim(); return k + (t && t !== '-' ? '@' + t : ''); })).join(' ');
  }
  function rainDay(d) { return addDays((d && d.date) || EA.today(), -1); }
  function rainOk(d) {
    d = d || draft;
    var mm = String(d.rain_mm == null ? '' : d.rain_mm).trim();
    if (mm === '0') return true;
    if (!(Number(mm.replace(',', '.')) > 0)) return false;
    var r = parseRain(d.rain_time);
    return r.day ? r.per.length > 0 : !!String(d.rain_time || '').trim();
  }
  // The periods, as the WhatsApp text and the card's summary write them: "petang 14:30–15:10 · malam".
  function perText(r, en) {
    return r.per.map(function (k) {
      var p = DAY4.find(function (q) { return q[0] === k; }), t = String(r.at[k] || '').split('-');
      var clock = t[0] && t[1] ? ' ' + t[0] + '–' + t[1] : t[0] ? ' ' + EA.t('dari ', 'from ') + t[0] : t[1] ? ' ' + EA.t('hingga ', 'until ') + t[1] : '';
      return (p ? (en ? p[2] : p[1]).toLowerCase() : k) + clock;
    }).join(' · ');
  }
  // The last day this phone has a gauge reading for, before the chit's day (the gap line on the card).
  function lastRainDay(estate, before) {
    var best = '';
    chits().forEach(function (c) {
      if (c.estate !== estate || c.date >= before || String(c.rain_mm == null ? '' : c.rain_mm).trim() === '') return;
      var r = parseRain(c.rain_time), d = r.day || addDays(c.date, -1);
      if (d > best) best = d;
    });
    return best;
  }
  function rainCard() {
    var mm = String(draft.rain_mm == null ? '' : draft.rain_mm), dry = mm === '0', wet = !dry && (draft.rainWet || Number(mm) > 0);
    var day = rainDay(draft), r = parseRain(draft.rain_time);
    // A draft begun before 1.88 holds an old night reading, and one kept from another morning names another day:
    // neither is this morning's answer, so the question is asked afresh rather than guessed.
    if (r.day && r.day !== day) { draft.rain_mm = ''; draft.rain_time = ''; draft.rainWet = false; draft.rainShut = false; mm = ''; dry = false; wet = false; keepDraft(); r = parseRain(''); }
    else if (!r.day && mm !== '') { draft.rain_time = buildRain(day, [], {}); keepDraft(); r = parseRain(draft.rain_time); }
    var ok = rainOk();
    var dayBm = niceDate(day), dayEn = (function () { var x = new Date(day + 'T00:00:00'); return ui().dayEn[x.getDay()] + ' ' + x.getDate() + ' ' + ui().monEn[x.getMonth()]; })();
    var head = '<h2 id="fh-s0"><span class="step">0</span><span class="inline"><span class="bm">Hujan semalam · ' + esc(dayBm) + '</span><span class="en">Rain yesterday · ' + esc(dayEn) + '</span></span></h2>';
    // Answered and put away: one line, and UBAH to open it again. It goes to the office with the chit.
    if (ok && draft.rainShut) {
      return '<section class="card rain-q done" id="fh-rainq" aria-labelledby="fh-s0">' + head +
        '<p class="rain-sum"><b>✓ ' + (dry ? EA.t('Tiada hujan', 'No rain') : esc(fmtMm(mm)) + ' mm · ' + esc(perText(r, EA.lang && EA.lang() === 'en'))) + '</b>' +
        ' <button type="button" class="link-btn" id="fh-rain-edit">' + EA.t('UBAH', 'CHANGE') + '</button></p>' +
        '<p class="hint">' + EA.t('Dihantar bersama chit.', 'Sent with the chit.') + '</p></section>';
    }
    var last = lastRainDay(ctx.estate, draft.date || EA.today()), gap = last && last < addDays(day, -1);
    return '<section class="card rain-q' + (ok ? ' done' : '') + '" id="fh-rainq" aria-labelledby="fh-s0">' + head +
      '<p class="hint">' + EA.t('Hujan sepanjang hari ' + dayBm + ', 12 malam hingga 12 malam. Baca tolok, kemudian kosongkan.', 'The rain of the whole of ' + dayEn + ', 12am to 12am. Read the gauge, then empty it.') + '</p>' +
      (gap ? '<p class="hint warn-t">' + EA.t('Tolok kali terakhir dibaca untuk ' + niceDate(last) + '. Jika tidak dikosongkan sejak itu, bacaan ini termasuk hujan hari-hari itu juga.', 'The gauge was last read for ' + niceDate(last) + '. If it was not emptied since, this reading holds the rain of those days too.') + '</p>' : '') +
      '<div class="rain-row"><button type="button" class="btn' + (dry ? ' btn-ok' : ' btn-ghost') + '" id="fh-rain-no" aria-pressed="' + dry + '">NO RAIN<small>TIADA HUJAN</small></button>' +
      '<button type="button" class="btn' + (wet ? ' btn-wait' : ' btn-ghost') + '" id="fh-rain-yes" aria-pressed="' + wet + '">IT RAINED<small>ADA HUJAN</small></button></div>' +
      (wet ? '<div class="field"><label><span class="bm">Bacaan tolok (mm)</span><span class="en">Gauge reading (mm)</span></label>' +
        '<input class="text-input qty" id="fh-rain-mm" inputmode="decimal" value="' + esc(Number(mm) > 0 ? mm : '') + '" placeholder="mm"></div>' +
        '<p class="hint">' + EA.t('Bila hujan turun? Tanda satu atau lebih.', 'When did it rain? Tick one or more.') + '</p><div class="rain-row rain-4">' +
        DAY4.map(function (p) { var on = r.per.indexOf(p[0]) >= 0; return '<button type="button" class="btn' + (on ? ' btn-wait' : ' btn-ghost') + '" data-rp="' + p[0] + '" aria-pressed="' + on + '">' + esc(EA.t(p[1], p[2])) + '<span class="rp-clock">' + esc(EA.t(p[3], p[4])) + '</span></button>'; }).join('') + '</div>' +
        r.per.map(function (k) {
          var p = DAY4.find(function (q) { return q[0] === k; }), t = String(r.at[k] || '').split('-');
          return '<div class="rain-at"><b>' + EA.t(p[1], p[2]) + ' <span class="hint">· ' + EA.t('mula dan henti, jika tahu', 'start and stop, if known') + '</span></b>' +
            '<label>' + EA.t('Mula', 'Start') + ' <input type="time" class="text-input" data-rs="' + k + '" value="' + esc(t[0] || '') + '"></label>' +
            '<label>' + EA.t('Henti', 'Stop') + ' <input type="time" class="text-input" data-re="' + k + '" value="' + esc(t[1] || '') + '"></label></div>';
        }).join('') +
        '<p class="hint">' + EA.t('Hujan petang atau malam semalam → semalam. Hujan lepas 12 malam → hari ini.', 'Rain yesterday afternoon or evening → yesterday. Rain after 12am → today.') + '</p>' : '') +
      // Drawn whenever it can be needed and switched on as the answer becomes whole: redrawing the card from the
      // mm box would swallow the tap on a period that took the focus away from it.
      (ok || wet ? '<div class="actions"><button type="button" class="btn btn-ok" id="fh-rain-save"' + (ok ? '' : ' disabled') + '>SAVE READING<small>SIMPAN BACAAN · dihantar bersama chit</small></button></div>' : '') +
      '</section>';
  }
  function wireRain() {
    var no = $('#fh-rain-no'), yes = $('#fh-rain-yes'), mm = $('#fh-rain-mm'), ed = $('#fh-rain-edit'), sv = $('#fh-rain-save');
    if (ed) ed.onclick = function () { draft.rainShut = false; keepDraft(); render(el, ctx); };
    if (sv) sv.onclick = function () { if (!rainOk()) return; draft.rainShut = true; keepDraft(); render(el, ctx); };
    if (!no) return;
    var day = rainDay(draft);
    no.onclick = function () { draft.rain_mm = '0'; draft.rain_time = buildRain(day, [], {}); draft.rainWet = false; draft.rainShut = true; keepDraft(); render(el, ctx); };
    yes.onclick = function () { draft.rainWet = true; draft.rainShut = false; if (String(draft.rain_mm) === '0') draft.rain_mm = ''; var r = parseRain(draft.rain_time); draft.rain_time = buildRain(day, r.per, r.at); keepDraft(); render(el, ctx); var m = $('#fh-rain-mm'); if (m) m.focus(); };
    if (mm) {
      mm.oninput = function () { draft.rain_mm = mm.value.replace(',', '.').replace(/[^\d.]/g, ''); keepDraft(); var c = $('#fh-rainq'); if (c) c.classList.toggle('done', rainOk()); if (sv) sv.disabled = !rainOk(); };
    }
    el.querySelectorAll('[data-rp]').forEach(function (b) {
      b.onclick = function () {
        var r = parseRain(draft.rain_time), k = b.dataset.rp, i = r.per.indexOf(k);
        if (i >= 0) { r.per.splice(i, 1); delete r.at[k]; } else r.per.push(k);
        draft.rain_time = buildRain(day, r.per, r.at);
        keepDraft(); render(el, ctx);
      };
    });
    el.querySelectorAll('[data-rs],[data-re]').forEach(function (inp) {
      inp.onchange = function () {
        var r = parseRain(draft.rain_time), k = inp.dataset.rs || inp.dataset.re, t = String(r.at[k] || '').split('-');
        if (inp.dataset.rs) t[0] = inp.value; else t[1] = inp.value;
        r.at[k] = (t[0] || '') + '-' + (t[1] || '');
        draft.rain_time = buildRain(day, r.per, r.at); keepDraft();
      };
    });
  }
  // The rain line for the WhatsApp chit. A 1.88 reading names its own day; an older chit keeps its old lines.
  function rainLines(c) {
    var mm = String(c.rain_mm == null ? '' : c.rain_mm).trim();
    if (mm === '') return [];
    var r = parseRain(c.rain_time);
    if (!r.day) return rainLinesOld(c, mm);
    var n = Number(mm) || 0;
    return ['Hujan semalam (' + dayDmBm(r.day) + '): ' + (n > 0 ? fmtMm(n) + ' mm' + (r.per.length ? ' · ' + perText(r, false) : '') : 'tiada')];
  }
  function dayDmBm(date) { var d = new Date(date + 'T00:00:00'); return ui().dayBm[d.getDay()] + ' ' + dm(date); }
  function rainLinesOld(c, mm) {
    var n = Number(mm) || 0, L = [];
    var prev = EA.fh.dayRainBefore ? EA.fh.dayRainBefore(c.estate, c.date) : null;
    var yday = addDays(c.date, -1);
    var since = prev && prev.date < yday ? ' sejak ' + dayDm(prev.date) + ' 6 ptg' : '';
    L.push('Hujan ' + (since ? since.trim() : 'malam tadi') + ': ' + (n > 0 ? fmtMm(n) + ' mm (' + periodText(c.rain_time, NIGHT) + ')' : 'tiada'));
    if (prev && prev.date === yday && prev.mm !== '') {
      var dm2 = Number(prev.mm) || 0;
      L.push('Hujan ' + dayDm(prev.date) + ': ' + fmtMm(dm2 + n) + ' mm (siang ' + fmtMm(dm2) + ' · malam ' + fmtMm(n) + ')');
    }
    return L;
  }
  function fmtMm(v) { return (Math.round(Number(v) * 10) / 10).toFixed(1).replace(/\.0$/, ''); }

  // ---------- check, confirm, save ----------
  function problems() {
    var p = [], rows = draftRows();
    if (!draft.jobs.length) p.push(['Tiada kerja lagi.', 'No jobs yet.']);
    // 1.105 (new look): the harvest needs a lot, or Kerja has no lot to pick and the tractor nothing to answer for
    if (rbOn()) draft.jobs.forEach(function (j) { if (j.task === EA.lists.HARVEST && !j.lots.length) p.push(['Menuai' + (j.block ? ' ' + placeName(j.block) : '') + ': pilih sekurang-kurangnya satu petak.', 'Harvesting: choose at least one lot.']); });
    if (!rows.length) p.push(['Tiada orang ditanda.', 'Nobody is marked.']);
    var noJob = rows.filter(function (r) { return r.muster === 'H' && !r.task_code; }).map(function (r) { return r.worker_id; });
    if (noJob.length) p.push(['Belum ada kerja untuk: ' + noJob.map(person).join(', '), 'No job yet for these people']);
    var taken = onOtherChit();
    var twice = rows.filter(function (r) { return taken[r.worker_id]; }).map(function (r) { return r.worker_id; });
    if (twice.length) p.push(['Sudah dalam chit lain: ' + twice.join(', '), 'Already on another chit: ' + twice.join(', ')]);
    if (!draft.alertNotes) draft.alertNotes = {};
    var noNote = isPast() ? [] : chitAlerts().filter(function (a) { return !a.note; });
    if (noNote.length) p.push(['Tulis apa berlaku untuk setiap amaran (' + noNote.length + ' belum).', 'Say what happened for each alert (' + noNote.length + ' not done).']);
    // v1.61: today's chit (not a plan, not a day gone by) answers last night's rain first.
    // v1.88: the question is now the whole of yesterday, named by its day.
    if (!isPast() && draft.mode !== 'plan' && !rainOk()) p.push(['Jawab hujan semalam (' + niceDate(rainDay(draft)) + '): TIADA HUJAN, atau mm dan bila.', 'Answer yesterday\'s rain (' + niceDate(rainDay(draft)) + '): no rain, or the mm and when.']);
    return p;
  }
  function emptyJobs() {
    var rows = draftRows();
    return draft.jobs.filter(function (j) { return !rows.some(function (r) { return r.muster === 'H' && jobFor(r.worker_id) === j; }); });
  }

  function check() {
    // 1.107 (§1): new look, an alert with no note: go to the alert box instead of a list of problems.
    var nn = rbOn() && (isPast() || draft.mode === 'plan' || rainOk()) ? rbNoNote() : [];
    if (nn.length) {
      var box = el.querySelector('#fh-alerts [data-alert="' + nn[0].key + '"]') || el.querySelector('#fh-alerts [data-alert]');
      if (box) { box.scrollIntoView({ block: 'center' }); box.focus(); ui().toast(EA.t('Tulis apa berlaku untuk amaran ini', 'Say what happened for this alert'), 'bad'); return; }
    }
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
    // (e.g. a near-identical pair of names at Sugut, asked every day while one of the two was on leave).
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
      if (isSunday(draft.date)) why = { label: ['Kenapa kerja ' + restBm(draft.date).toLowerCase() + '?', 'Why work on a ' + restEn(draft.date).toLowerCase() + '? (for the Assistant Manager)'], val: draft.reason || '' };
    } else {
      c0 = buildChit(notSaved, EA.ui.hhmm(new Date()), ctx.user.code);
      if (isConfirm() && c0.planDiff.length) why = { label: ['Kenapa berbeza dari rancangan? (' + c0.planDiff.length + ')', 'Why different from the plan?'], val: draft.planNote || '' };
    }
    // v1.52: a same-day confirmation does not demand a typed reason — the absence mark (T, S, C) is the reason, and
    // a reason typed every morning for every absentee is the kind of box that gets "ok" typed into it. The field is
    // still offered. A confirmation of a day gone by (leave, reconstructed from paper) keeps the reason required.
    var sameDay = isConfirm() && draft.date === EA.today();
    if (why && sameDay) why.label = ['Catatan (pilihan): kenapa berbeza? (' + c0.planDiff.length + ')', 'Note (optional): why different?'];
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
            if (v.length < 3 && !sameDay) { ui().toast(EA.t('Tulis sebab dulu', 'Write the reason first'), 'bad'); s.querySelector('#cf-why').focus(); return; }
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
    return 'Kerja ' + restBm(p.date).replace('Hari ', '') + ' ' + dm(p.date) + ' (rancangan): ' + parts.join(', ') + ' · ' + s.tot(s.worked) + ' orang';
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

  // v1.94 Membaja: one FH_MATERIAL row a lot (kind "bawa"); a correction replaces the old row (Rule 4), a lot taken off
  // is a 'removed' row. A change of fertiliser or dose asked on this chit goes to the Owner as an alert, kind "doseask".
  function manSave(c, old) {
    if (!rbOn()) return;
    (c.jobs || []).forEach(function (j) {
      if (j.task !== 'MAN') return;
      var nw = c.rows.filter(function (r) { return r.muster === 'H' && r.task_code === 'MAN' && r.block === j.block && r.lots === j.lots.join(' ') && r.worker_id !== j.mandor; }).length;
      var m = manInfo(j, nw, c.chit), oj = old && (old.jobs || []).find(function (x) { return x.task === 'MAN' && x.block === j.block && x.matIds; });
      var oldIds = (oj && oj.matIds) || {}, ids = {};
      if (m) {
        j.mat = { fert: m.fert, dose: m.dose, bagKg: m.bagKg, bags: m.bags, bawa: m.total };
        j.lots.forEach(function (l) {
          var o = oj && oj.mat && oj.mat.bags[l] === m.bags[l] && oj.mat.fert === m.fert && oj.mat.dose === m.dose ? oldIds[l] : '';
          if (o) { ids[l] = o; return; }
          ids[l] = EA.save('FH_MATERIAL', ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'bawa', task_code: 'MAN', block: j.block, lot: l, material: m.fert, dose: m.dose, bag_kg: m.bagKg,
            bags: m.bags[l], done: '', reason: '', note: '' }, oldIds[l] || '').id;
        });
      }
      Object.keys(oldIds).forEach(function (l) { if (!ids[l]) EA.save('FH_MATERIAL', ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'bawa', task_code: 'MAN', block: j.block, lot: l, material: '', dose: '', bag_kg: '', bags: 0, done: '', reason: 'Dibuang dalam pembetulan', note: '' }, oldIds[l], 'removed'); });
      j.matIds = ids;
      if (j.mreq && !j.mreq.id) {
        j.mreq.id = EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'doseask', block: j.block, lot: j.lots.join(' '),
          detail: 'Membaja Blk ' + j.block + ': ' + j.mreq.from + ' kg → ' + j.mreq.fert + ' ' + j.mreq.dose + ' kg', staff_note: j.mreq.why, direction: '', direction_by: '', ref: c.chit }).id;
        var dj = draft.jobs.find(function (x) { return x.key === j.key; }); if (dj) dj.mreq = j.mreq;
      }
    });
  }
  function save(quiet) {
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
      // v1.43 (27 Oct): a correction that takes away an "other work" job (e.g. DCO keyed for manuring, changed to MAN)
      // withdraws its request, so the Assistant Manager is not left with a request for work that was not done.
      Object.keys(oldAsks).forEach(function (k) {
        var o = oldAsks[k];
        if (k === 'SUNDAY' || !o || !o.id || c.jobAsks.some(function (a) { return a.key === k; })) return;
        EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'jobask', block: '', lot: '', detail: 'Ditarik: kerja ditukar dalam pembetulan',
          staff_note: o.ask || '', direction: '', direction_by: '', ref: c.chit }, o.id, 'removed');
      });
      // v1.41 F (Yu Chen, 26 Oct): on a Sunday only crop work and the important piece-rated jobs go ahead freely
      // (EA.lists.sundayOk: harvesting and its crop chain, manuring, CPS). Other work sends one request to SDK
      // (kind "sunask", LULUS / TOLAK by the Pengurus, SDK told (v1.55.1)), again only if those people change in a correction.
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
              detail: 'Kerja hari Ahad: ' + offRows.length + ' orang · ' + codes.join(', '), staff_note: 'Kerja hari Ahad perlu lulus Pengurus', direction: '', direction_by: '', ref: c.chit }, oS ? oS.id : '').id;
            c.jobAsks.push({ key: 'SUNDAY', ask: askS, id: idS });
          }
        }
      }
      // v1.27: warnings the staff saved anyway go to the clerk (kind "check").
      (draft.checks || []).forEach(function (k) {
        if ((old && (old.checks || []).indexOf(k.key) >= 0)) return;
        EA.save(TAB_ALERT, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'check', block: '', lot: '', detail: k.bm, staff_note: EA.t('Ya, betul (disimpan juga)', 'Yes, right (saved anyway)'), direction: '', direction_by: '', ref: k.ref || '' });
      });
      manSave(c, old);   // v1.94 Membaja: the bags to take from the store, and a change asked of the Owner
      c.checks = (draft.checks || []).map(function (k) { return k.key; }).concat(old && old.checks ? old.checks : []);
      var s = summary(c.rows);
      c.chitRowId = EA.save(TAB_CHIT, ROOM, ctx.estate, { date: c.date, chit: c.chit, rain_mm: c.rain_mm, rain_time: c.rain_time,
        working: s.tot(s.worked), not_working: s.tot(s.notw), grand_total: s.tot(s.grand),
        confirmed_by: c.checker, confirmed_at: stamp,
        note: ((c.fromPlan ? ('Dari rancangan ' + c.fromPlan + ' (' + c.planAt + ') · disahkan ' + EA.today() + (c.planDiff.length ? ' · beza ' + c.planDiff.length + ': ' + c.planNote : ' · sama')) : (old && old.fromPlan ? 'Dari rancangan ' + old.fromPlan : '')) +
          repeatNote(c)).slice(0, 300) },
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
    // v1.73: a correction made from another screen (Kerja marking who did not come) saves and stays there.
    if (quiet) return;
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
  // v1.50.2 (Yu Chen, 5 Nov, option A): one line per problem on the WhatsApp chit. Lots of one block with the same
  // reason are joined (total bunches, earliest day, lot range); mill tickets with the same reason are joined with a
  // short flag each; an alert already on an earlier chit is only counted ("masih terbuka"), its detail stays in the app.
  function lotRange(lots) {
    var xs = lots.slice().sort(function (a, b) { var p = a.split('-'), q = b.split('-'); return (Number(p[0]) - Number(q[0])) || (Number(p[1]) - Number(q[1])); });
    var nums = xs.map(function (l) { return Number(String(l).split('-')[1]); }), pre = String(xs[0]).split('-')[0];
    var run = xs.length > 2 && xs.every(function (l, i) { return String(l).split('-')[0] === pre && (i === 0 || nums[i] === nums[i - 1] + 1); });
    return run ? xs[0] + ' hingga ' + xs[xs.length - 1] : xs.join(', ');
  }
  function shortFlag(f) {
    return String(f || '').split(/;\s*/).map(function (p) {
      var m;
      if ((m = p.match(/Ditolak (\d+) tandan/))) return 'tolak ' + m[1];
      if ((m = p.match(/Penalti ([\d.]+%)/))) return 'penalti ' + m[1];
      if ((m = p.match(/^Mentah \+ kurang masak ([\d.]+%)/))) return 'mentah ' + m[1];
      if ((m = p.match(/^Busuk ([\d.]+%)/))) return 'busuk ' + m[1];
      if ((m = p.match(/^Kotor ([\d.]+%)/))) return 'kotor ' + m[1];
      return p.replace(/\s*·\s*dari fail HQ/, '').trim();
    }).filter(function (x) { return x; }).join(', ');
  }
  function alertLines(alerts) {
    var out = [], fresh = alerts.filter(function (a) { return !a.seen; }), old = alerts.filter(function (a) { return a.seen; });
    var groups = [], by = {};
    fresh.forEach(function (a) {
      var k = a.kind === 'field' ? 'F|' + a.block + '|' + a.note : a.kind === 'grading' ? 'G|' + a.note : 'X|' + a.key;
      if (!by[k]) { by[k] = { kind: a.kind, block: a.block, note: a.note, items: [] }; groups.push(by[k]); }
      by[k].items.push(a);
    });
    groups.forEach(function (g) {
      var note = g.note ? ' → ' + g.note : '';
      if (g.kind === 'field') {
        var n = 0, since = '', lots = [];
        g.items.forEach(function (a) { var m = String(a.detail).match(/^(\d+) tandan sejak (\S+)/); if (m) { n += Number(m[1]); if (!since || m[2] < since) since = m[2]; } lots.push(a.lot); });
        out.push('• Ladang Blk ' + g.block + ': ' + n + ' tandan' + (since ? ' sejak ' + since.replace(/^0/, '') : '') + ' (' + lotRange(lots) + ')' + note);
      } else if (g.kind === 'grading') {
        var t = g.items.map(function (a) { var m = String(a.detail).match(/^Tiket (\S+): (.*)$/); return m ? m[1] + ' ' + shortFlag(m[2]) : shortFlag(a.detail); });
        out.push('• Gred kilang' + (t.length > 1 ? ' ' + t.length + ' tiket' : '') + ': ' + t.join(' · ') + note);
      } else out.push('• ' + g.items[0].text + note);
    });
    if (old.length) out.push('_(+' + old.length + ' masih terbuka: ' + old.map(function (a) { return a.kind === 'grading' ? 'tiket ' + a.ref : a.kind === 'field' ? 'petak ' + a.lot : 'ramp'; }).join(', ') + ')_');
    return out;
  }
  function chitText(c) {
    var d = new Date(c.date + 'T00:00:00');
    var s = summary(c.rows);
    var est = EA.lists.estate(c.estate);
    function pad(t, n) { t = String(t); return t.length >= n ? t.slice(0, n) : t + new Array(n - t.length + 1).join(' '); }
    function num(v) { return v ? String(v) : '-'; }
    // v1.50.1 (Yu Chen, 5 Nov, option A): a block number reads as a block: 02 → B02 (DR, the durian farm, stays DR).
    function row(blk, name, o) { return pad(/^\d+$/.test(String(blk)) ? 'B' + blk : blk, 4) + pad(name, 17) + pad(num(o.mdr), 4) + pad(num(o.m), 3) + pad(num(o.f), 3) + s.tot(o); }
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
      if (isSunday(c.date)) L.push('⚠ ' + restBm(c.date) + ': perlu lulus Penolong Pengurus' + (c.reason ? ' · sebab: ' + c.reason : ''));
    }
    if (c.fromPlan) {
      // v1.52: a chit confirmed on its own day from last night's plan says so; "(staf cuti)" is only for a day gone by.
      var sameDayWa = c.confirmedOn === c.date;
      L.push('✅ _DISAHKAN ' + (c.confirmedOn && !sameDayWa ? dayDm(c.confirmedOn) + ' ' : '') + c.confirmedAt + (pa.length > 10 && !sameDayWa ? ' · dirancang ' + dayDm(pa.slice(0, 10)) : '') + (sameDayWa ? ' (dirancang semalam)' : ' (staf cuti)') + '_');
      var df = c.planDiff || [];
      L.push('*Beza dari rancangan · Plan vs actual*');
      if (!df.length) L.push('• Sama seperti rancangan · as planned');
      df.forEach(function (x) { L.push('• ' + planDiffText(x)); });
      if (df.length && c.planNote) L.push('Sebab: ' + c.planNote);
    }
    // v1.17: an old chit keyed with rain still shows it; new chits have none (rain is in the Sugut DMS).
    rainLines(c).forEach(function (x) { L.push(x); });   // v1.61: the estate's own gauge (Yu Chen, 15 Nov)
    backlogLines(c.backlog).forEach(function (x) { L.push(x); });
    fieldLines(c.estate, c.backlog).forEach(function (x) { L.push(/^⚠/.test(x) ? '*' + x + '*' : x); });   // v1.54: the day-after-harvest rule
    carryLines(c).forEach(function (x) { L.push(x); });   // v1.95: lots left open by the last day (Brief_Tuai_Kutip_Rupa_Baru)
    machLines(c.backlog).forEach(function (x) { L.push(x); });   // v1.55: the Jentera block, after the fruit
    // v1.51.4 (Yu Chen, 6 Nov): mill grading leaves the WhatsApp chit. The money on that ticket is already gone
    // and nothing done that morning gets it back, so it is not a thing to settle today — it belongs to the
    // Saturday meeting, beside the month's grading trend. The alert itself is untouched: the staff still sees it
    // on the chit screen and still explains it there, and the office still keeps every line. Only the WhatsApp
    // text stops carrying it, so what the group reads each morning is work that can still be done today.
    var waAlerts = (c.alerts || []).filter(function (a) { return a.kind !== 'grading'; });
    if (waAlerts.length) {
      L.push('*⚠ AMARAN · ALERT*');
      alertLines(waAlerts).forEach(function (x) { L.push(x); });
    }
    L.push('```');
    L.push(pad('Blk', 4) + pad('Job', 17) + pad('Mdr', 4) + pad('M', 3) + pad('F', 3) + 'Tot');
    // v1.51.4 (Yu Chen, 6 Nov): one line per job and block, not one per worker. Each harvester keeps his own lot,
    // so six men harvesting Blk 01 and Blk 03 used to print six identical "Harvester" lines. The lots are already
    // listed under the table, so nothing is lost by adding the men up: "B01 Harvester 3". On a full day of eight
    // harvesters that is two lines instead of eight. The chit screen and the office records are untouched.
    function merged(lines) {
      var out = [], by = {};
      lines.forEach(function (l) {
        var k = l.task + '|' + (l.block || '');
        if (!by[k]) { by[k] = { key: k, task: l.task, block: l.block, mandor: l.mandor, mdr: 0, m: 0, f: 0 }; out.push(by[k]); }
        by[k].mdr += l.mdr; by[k].m += l.m; by[k].f += l.f;
      });
      return out;
    }
    s.sections.forEach(function (x) {
      L.push(x.s.code + '. ' + x.s.en);
      // v1.50.2 (Yu Chen, 5 Nov): no sub-headings under a section on the chit (Cutting, Field to ramp, Manual,
      // Chemical, Manuring …): the job names already say it. The lines keep their order.
      merged(x.lines).forEach(function (l) { L.push(row(l.block || '', short(l.task), l)); });
    });
    L.push(row('', 'Total working', s.worked));
    AWAY.forEach(function (k) { if (s.tot(s.away[k])) L.push(row('', AWAY_EN[k], s.away[k])); });
    L.push(row('', 'Total not work.', s.notw));
    L.push(row('', 'GRAND TOTAL', s.grand));
    L.push('```');
    // v1.40: on a Sunday the people not on the chit are resting.
    if (isSunday(c.date)) {
      var on = {}; c.rows.forEach(function (r) { if (r.status !== 'removed') on[r.worker_id] = true; });
      var rest = EA.lists.mandorsFor(c.estate).concat(EA.lists.workersFor(c.estate)).filter(function (w) { return !on[w.id]; }).length;
      if (rest) L.push('Rehat (' + restBm(c.date).toLowerCase() + ') · Rest day: ' + rest + ' orang');
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
    // v1.94 Membaja: what to take from the store (Brief_Membaja_Rupa_Baru)
    (c.jobs || []).filter(function (j) { return j.mat && j.mat.bawa; }).forEach(function (j) {
      L.push('*BAWA DARI STOR · Membaja Blk ' + j.block + ': ' + j.mat.bawa + ' beg ' + j.mat.fert + '* (' + j.mat.dose + ' kg/pokok)');
      if (j.mreq) L.push('Minta tukar (lulus Pemilik): ' + j.mreq.fert + ' ' + j.mreq.dose + ' kg — ' + j.mreq.why);
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

  // v1.71 (Ferezelly, 18 Nov 2026: "tiada button ubah absen kepada pekerja yang tidak turun kerja"). A man who
  // does not turn up is usually noticed when the day's work is keyed in the evening, or at the next morning's
  // muster — by then his chit is yesterday's, and this card only ever showed today's, so BETULKAN was gone and
  // there was no way to mark him away. He put 1 tandan instead, which is how four false attendance days reached
  // 16 Nov. The card shows the last FIX_DAYS days, the same window the office allows a chit to be fixed in
  // (server FIX_DAYS), so the screen and the rule agree. Older than that stays the Owner's.
  //
  // v1.75, 19 Nov: 3 becomes 5. Ferezelly, through Yu Chen: "he wan to change the workers to tidak hadir, but
  // no button." For 15 and 16 Nov there was no BETULKAN at all — not greyed, not hidden, simply not drawn —
  // and those were the two days he had to clear. The work window became 5 days the same morning; leaving the
  // chit at 3 would have let him key the work for 15 Nov and still not mark the men who never turned up.
  // One number for both, so there is one rule to remember. The office moves with it (server FIX_DAYS).
  var FIX_DAYS = 5;
  function fixableChits() {
    var from = EA.dayAgo(FIX_DAYS - 1);
    return chits().filter(function (c) { return c.estate === ctx.estate && c.date >= from && c.date <= EA.today(); })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  // ---------- chits on this phone, today and the last few days ----------
  function todayCard() {
    var list = fixableChits();
    return '<section class="card" id="fh-today-card" aria-labelledby="fh-today"><h2 id="fh-today"><span class="inline"><span class="bm">Chit di telefon ini</span> · <span class="en">Chits on this phone</span></span></h2>' +
      (list.length ? '<div>' + list.map(function (c) {
        var s = summary(c.rows);
        var ids = c.rows.map(function (r) { return r.id; }).concat(c.chitRowId ? [c.chitRowId] : []);
        var waiting = ids.some(function (i) { return EA.isWaiting(i); });
        // The day is named on every line now that the card holds more than one: "Chit 1 · Selasa 17 Nov · 06:05".
        return '<div class="list-line"><div><b>Chit ' + esc(c.chit.split('-').pop()) + '</b> · <b>' + esc(dayDm(c.date)) + '</b> · ' + esc(c.confirmedAt) + (c.rev > 1 ? ' · ' + EA.t('dibetulkan', 'corrected') : '') +
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
    // v1.52: CHIT BIASA — drop today's plan and start the chit from nothing. The plan is cancelled with a trail
    // (its rows go to the office as removed, reason "chit biasa"), so the Pengurus can see it was set aside.
    var pb = $('#fh-plain');
    if (pb) pb.onclick = function () {
      var p = plans().find(function (x) { return x.plan === draft.fromPlan; });
      draft = blankDraft(); keepDraft();
      if (p) cancelPlan(p, 'chit biasa'); else render(el, ctx);
    };
    wireList();
  }
  function wireList() {
    el.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { showChit(b.dataset.view); }; });
    el.querySelectorAll('[data-fix]').forEach(function (b) {
      b.onclick = function () {
        var c = fixableChits().find(function (x) { return x.chit === b.dataset.fix; });
        if (!c) return;
        startFix(c, null);
      };
    });
  }
  // A correction draft from a saved chit (today's, or v1.32 a past one the clerk asked to fix).
  function startFix(c, ask) { draft = fixDraft(c, ask); keepDraft(); render(el, ctx); window.scrollTo(0, 0); }
  // v1.73: the draft on its own, so Kerja can correct one mark without opening this screen (Rule 5).
  function fixDraft(c, ask) {
        var d = blankDraft();
        // v1.81 (Ferezelly, 21 Nov 09:01 and 09:04, correcting the 17 and 18 Nov chits). The date was copied
        // from the chit ONLY when the clerk had asked for the fix. blankDraft() starts at EA.today(), and
        // EA.save falls back to today when no date is passed, so a correction the STAFF started himself —
        // BETULKAN, or the row-level "tidak hadir" added in 1.76 — was written onto TODAY.
        //
        // What that did: the 17 Nov chit row was replaced by a row dated 21 Nov. 17 Nov then had no standing
        // chit at all and fell out of Rekod entirely ("tiada rekod"), while 21 Nov picked up three chits and
        // showed 48/75 present. The day did not just read wrong, it disappeared.
        //
        // A correction belongs to the day it corrects. Always. Whoever started it.
        d.date = c.date;
        if (ask) { d.fixAsk = ask; }
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
        return d;
  }

  // v1.73 (Yu Chen, 18 Nov 2026). Kerja found people with no quantity and asked whether each one was missed
  // out or did not come; these are the ones who did not come. One correction carries them all, so the chit
  // gets one new version and not one per person. It writes through the same save as any other correction —
  // nothing is deleted, the old chit stays on record — and it never opens this screen or touches a chit the
  // staff happens to be part way through making.
  EA.fh = EA.fh || {};
  // v1.81 (Ferezelly, 22 Nov 2026: "yang tidak hadir sy tick... skrg sudah tick tidak hadir diminta
  // masukkan jumlah karung juga knpa yaa"). He ticked TIDAK HADIR on a Loose Fruit job and the app still
  // demanded the bag count, over and over.
  //
  // The cause: this function read ctx.estate. ctx belongs to the CHIT screen and is only set once that
  // screen has been rendered. A staff member who opens the app and goes straight to Kerja — which is what
  // everyone does — had no ctx at all, so the very first line threw, the marks never reached the chit, and
  // pressing SIMPAN again brought the same card back. A ring, like the close screen's.
  //
  // The file already solves this for another screen's call (EA.fh.pendingPlans below): set ctx's estate for
  // the length of the call and put it back after. The estate comes from the chit itself, which carries it,
  // so nothing has to be guessed. The whole body is inside the try now: before, the lookup sat outside it,
  // which is how the error escaped as a page error instead of a clean "no".
  EA.fh.markAway = function (chitId, marks, estate) {
    if (!marks || !marks.length) return false;
    var keepCtx = ctx, keepDraft = draft;
    try {
      var c = chits().find(function (x) { return x.chit === chitId && (!estate || x.estate === estate); });
      if (!c) return false;
      // Everything this call reaches must be here: buildChit wants ctx.user.code and ctx.user.name as well
      // as the estate, and with no chit screen ever rendered there is no ctx at all to inherit them from.
      ctx = Object.assign({ user: EA.currentUser() }, ctx || {}, { estate: c.estate });
      if (!ctx.user) return false;
      var d = fixDraft(c, null);
      var did = 0;
      // v1.88: TUTUP HARI's TIDAK HADIR… may also name a man on the estate list who is on no chit that day (the
      // close's "on the list but not on the chit"). He is added with his letter; anyone else still is not.
      var listedHere = {};
      (EA.lists.mandorsFor ? EA.lists.mandorsFor(c.estate) : []).concat(EA.lists.workersFor ? EA.lists.workersFor(c.estate) : []).forEach(function (w) { listedHere[w.id] = true; });
      marks.forEach(function (m) {
        if (d.marks[m.worker] === m.mark) return;
        if (d.marks[m.worker] === undefined && !listedHere[m.worker]) return;
        d.marks[m.worker] = m.mark; delete d.jobOf[m.worker]; did++;
      });
      if (!did) { draft = keepDraft; return false; }
      draft = d;
      save(true);
      return true;
    } catch (e) { draft = keepDraft; return false; }
    finally { ctx = keepCtx; }
  };

  EA.roomViews['field-harvest'] = { render: render, chitText: chitText, summary: summary };
  // Shared with the room's other screens (rooms/field/work.js).
  EA.fh = EA.fh || {};
  EA.fh.viewOnly = viewOnly;
  EA.fh.allChits = chits;
  // v1.75: one window for correcting a chit, read by Kerja too, so the number cannot drift between screens
  // the way the phone's 3 and the office's 3 did (Rule 5).
  EA.fh.FIX_DAYS = FIX_DAYS;
  // v1.76: the oldest day a chit may still be corrected, as a date. Every screen that asks "is this chit
  // still open to a correction?" calls this, instead of writing EA.dayAgo(3) of its own. Four places were
  // doing that and all four were missed when the window went 3 -> 5 on 19 Nov (Rule 5).
  EA.fh.fixFrom = function () { return EA.dayAgo(FIX_DAYS - 1); };
  EA.fh.rainPeriods = { night: NIGHT, day4: DAY4, text: periodText, parse: parseRain, perText: perText };   // v1.61, v1.88
  EA.fh.rainLines = rainLines;
  EA.fh.roundRepeats = roundRepeats;
  EA.fh.summary = summary;
  EA.fh.tabs = tabs;
  EA.fh.copyText = copyText;
  EA.fh.getBacklog = getBacklog;
  EA.fh.refreshBacklog = refreshBacklog;
  EA.fh.backlogCard = backlogCard;
  EA.fh.abwOf = abwOf;
  EA.fh.abwNow = abwNow; EA.fh.fieldLines = fieldLines;
  EA.fh.tonnageText = tonnageText;
  EA.fh.localTonnage = localTonnage;
  EA.fh.wireBacklog = wireBacklog;
  EA.fh.shortDate = shortDate;
  EA.fh.chitText = chitText;
  EA.fh.carryOpen = carryOpen;   // v1.95: Hari ini reads it too
  EA.fh.plans = plans;
  EA.fh.pendingPlans = function (estate) { var keep = ctx; ctx = ctx || {}; ctx = Object.assign({}, ctx, { estate: estate }); try { return pendingPlans(); } finally { ctx = keep; } };
  EA.fh.planAsChit = planAsChit;
  EA.fh.marks = MARKS;
})();
