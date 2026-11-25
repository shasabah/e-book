// Field & Harvest room — screen 2: the day's work (Kerja harian), keyed in the evening.
// From the Field & Harvest Brief (Sugut), approved by Yu Chen 18 Oct 2026.
//
// It starts from the morning muster chit, so nothing is keyed twice:
//   1. For each job on the chit and each person on it: what was done, by lot.
//      Ha / bags / palms / seedlings / hours as the job's unit; bunches for
//      harvesters (their tonnes come later from the mill ticket); day-rate jobs
//      are a full or half day; loading and checking go by the mill ticket.
//   2. Each job: Siap (done) or Belum siap (not finished) with the reason and
//      what will be done about it.
//   3. Flags: harvester under 115 bunches; more hectares than the lot has.
//   4. The mandor confirms; saved per person per lot (FH_WORK) and per job
//      (FH_JOBDAY); the evening report is ready for WhatsApp.
// Piece rates are not here: the office adds the rate in force on the date.
// A correction is new rows that point to the old ones (nothing is deleted).
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};

  var TAB = 'FH_WORK', TAB_JOB = 'FH_JOBDAY', ROOM = 'FH';
  var K = { draft: 'fh.workdraft', saved: 'fh.work' };
  var LOW_BUNCHES = 115;            // from the brief: harvesters under 115 bunches a day are shown

  var el, ctx, chit, draft;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function canKey(u) { return u.role !== 'HQ'; }
  function task(code) { return EA.lists.task(code); }
  function jobName(code) { var t = task(code); return t ? EA.t(t.bm, t.en) : code; }
  function shortName(code) { return (EA.lists.chitNames && EA.lists.chitNames[code]) || (task(code) ? task(code).en : code); }
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function niceDate(iso) { var d = new Date(iso + 'T00:00:00'); return ui().dayBm[d.getDay()] + ' ' + d.getDate() + ' ' + ui().monBm[d.getMonth()]; }

  // What is keyed for a job, from its unit.
  //   qty     — a number in the job's unit, per lot (Ha, bag, palm, seedling)
  //   bunches — harvesters: bunches per lot
  //   day     — full or half day
  //   hour    — hours (machines)
  //   ticket  — nothing keyed: paid from the mill ticket tonnes
  // v1.51 (Yu Chen, 5 Nov): every job at the durian farm is paid by the day (1, ½ or 0), whatever its code.
  function isDurianBlock(block) { var d = EA.lists.durian && ctx && EA.lists.durian[ctx.estate]; return !!(d && block && String(block) === d.block); }
  function kind(code, block) {
    var t = task(code);
    if (!t) return 'day';
    if (isDurianBlock(block)) return 'day';
    if (code === EA.lists.HARVEST) return 'bunches';
    // Crop jobs (loaders) are paid from the mill ticket tonnes.
    if (t.unit === 'MT') return 'ticket';
    if (t.unit === 'day') return 'day';
    if (t.unit === 'hour') return 'hour';
    return 'qty';
  }
  function unitLabel(code, block) {
    var k = kind(code, block), t = task(code);
    return k === 'bunches' ? 'tandan' : k === 'day' ? 'hari' : k === 'hour' ? 'jam' : k === 'ticket' ? 'MT' : (t.unit === 'bag' ? 'beg' : t.unit === 'palm' ? 'pokok' : t.unit === 'seedling' ? 'anak benih' : t.unit);
  }

  // ---------- which chit ----------
  // v1.75: which days Kerja LISTS and which days it lets this phone KEY are two different questions, and
  // running them off one answer made a day vanish the moment it was closed — the staff closes 17 Nov, comes
  // back to Kerja, and his work is simply gone from the screen. A day inside the window is always listed, so
  // its card can say "✓ Hari ditutup"; whether he may change it is workChitOpen's business, asked separately.
  function inWindow(c) { return !!c && c.date <= EA.today() && c.date >= oldestOpen(); }
  function chitsFor(estate) {
    return EA.fh.allChits().filter(function (c) { return c.estate === estate && (inWindow(c) || EA.fh.workChitOpen(c)); })
      .sort(function (a, b) { return (a.date + a.confirmedAt) < (b.date + b.confirmedAt) ? 1 : -1; });
  }
  // v1.35 C2 · Betulkan kerja hari (Yu Chen, 24 Oct): an older day's work opens again only when its chit was
  // fixed at the clerk's request (MINTA BETULKAN CHIT), only for 3 days, and only on the phone that saved it
  // (so the fix replaces the old lines, never adds a second copy). The staff cannot open an old day herself:
  // a past chit can only change through the clerk's request (v1.32).
  function past(c) { return !!c && c.date < daysAgo(1); }
  // v1.75: the window comes from the chit screen, which owns it (EA.fh.FIX_DAYS), instead of a 3 written here
  // as well. The office holds the matching number (server FIX_DAYS) and the three must always move together.
  // "5 days" counts TODAY: on 19 Nov the oldest day anyone may touch is 15 Nov, not 14. Correcting a chit and
  // keying its work must reach exactly the same day, or the staff can key work for a day whose chit he cannot
  // fix — which is the trap Ferezelly was already in, one day further back.
  function windowDays() { return EA.fh && EA.fh.FIX_DAYS ? EA.fh.FIX_DAYS : 5; }
  function oldestOpen() { return daysAgo(windowDays() - 1); }
  function fixOpen(c) {
    if (!c || c.date >= daysAgo(1) || c.date < oldestOpen()) return false;
    var s = savedFor(c.chit);
    return !!(c.fixAsk || (c.rev || 1) > 1) && !!s && (s.chitRev || 1) < (c.rev || 1);
  }
  // v1.40 E · Rancang & sahkan: a planned leave day confirmed on return opened for its work up to 3 days back,
  // until that work was saved. v1.75 folded that into the one rule below — a planned day that is not closed is
  // open like any other unclosed day — so planOpen is gone rather than left sitting unused beside it (Rule 5).
  // v1.72: the one place that says whether this phone may still key a day's work. TUTUP HARI asks it before it
  // offers a red line that jumps to Kerja, because since 1.71 the close reaches back 40 days.
  //
  // v1.75 (Yu Chen, 19 Nov 2026: "i wan him able to open and close the chit, especially 17 and 18 closing").
  // The old rule was today, yesterday, a clerk-asked fix, or a planned day. A day whose chit was saved but whose
  // work was never keyed matched none of them, so it locked after one night: on 19 Nov Ferezelly could key
  // 18 Nov and nothing else, and 15, 16 and 17 Nov could not be closed by him, by Ria, or by anybody.
  //
  // The rule is now the one people already use in their heads: **a day that is not closed yet is still open.**
  // Open on the phone for the shared window (EA.fh.FIX_DAYS days, counting today); once it is closed it
  // changes only through the clerk's MINTA BETULKAN
  // CHIT, exactly as decided 24 Oct. Closing is the lock, not the clock.
  EA.fh.workChitOpen = function (c) {
    if (!c) return false;
    if (c.date > EA.today()) return false;                 // a plan for a day ahead is not keyable
    if (c.date === EA.today()) return true;
    if (c.date < oldestOpen()) return false;               // older than the window: the office's
    var closed = EA.fh.dayclose && EA.fh.dayclose.isClosed ? EA.fh.dayclose.isClosed(c.estate, c.date) : false;
    return closed ? fixOpen(c) : true;                     // closed → only the clerk's ask reopens it
  };
  // The jobs on a chit, each with the people present on it.
  function jobsOf(c) {
    var jobs = (c.jobs || []).map(function (j) { return { key: j.key, task: j.task, block: j.block, lots: j.lots || [], mandor: j.mandor, ask: j.ask || '', people: [], mandors: [] }; });
    c.rows.forEach(function (r) {
      if (r.status === 'removed' || r.muster !== 'H') return;
      var j = jobs.find(function (x) { return x.task === r.task_code && x.block === r.block && x.lots.join(' ') === r.lots; });
      if (!j) { j = { key: 'r' + jobs.length, task: r.task_code, block: r.block, lots: r.lots ? r.lots.split(' ') : [], mandor: r.mandor, people: [], mandors: [] }; jobs.push(j); }
      var w = EA.lists.worker(r.worker_id);
      if (w && w.mdr) j.mandors.push(r.worker_id);     // a mandor supervises: nothing to key for him
      else j.people.push(r.worker_id);
    });
    return jobs.filter(function (j) { return j.people.length || j.mandors.length; }).sort(function (a, b) {
      var sa = EA.lists.sectionOf(a.task), sb = EA.lists.sectionOf(b.task);
      return sa.code < sb.code ? -1 : sa.code > sb.code ? 1 : sa.tasks.indexOf(a.task) - sb.tasks.indexOf(b.task);
    });
  }

  // ---------- phone memory ----------
  function saved() { return EA.local.get(K.saved, []).filter(function (s) { return s.date >= daysAgo(40); }); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function savedFor(chitId) { return saved().find(function (s) { return s.chit === chitId; }) || null; }
  function keepSaved(s) { var list = saved().filter(function (x) { return x.chit !== s.chit; }); list.push(s); EA.local.set(K.saved, list); }
  function loadDraft(c) {
    var all = EA.local.get(K.draft, {});
    var d = all[c.chit];
    if (d) {
      d.prog = d.prog || {}; d.manual = d.manual || {}; d.bags = d.bags || {}; d.pbags = d.pbags || {}; d.dose = d.dose || {}; d.lotwhy = d.lotwhy || {}; normProg(d);
      // v1.41: a draft begun before per-person lots keeps its equal share (everyone on every lot).
      if (!d.who) { d.who = {}; jobsOf(c).forEach(function (j) { if (isHa(j)) d.who[j.key] = allWho(j, d); }); }
      // The morning chit was corrected after this draft began (v1.3): people added get their
      // lines, people taken off lose theirs; what was already keyed for the others stays.
      if ((d.chitRev || 1) !== (c.rev || 1)) {
        var fresh = freshDraft(c), keep = d.lines, was = {}, now = {}, sv = savedFor(c.chit);
        // v1.35: a person whose job changed on the fixed chit (e.g. MT → ITF) starts from the new job, not the old line.
        ((sv && sv.rec && sv.rec.lines) || []).forEach(function (l) { if (!was[l.worker_id]) was[l.worker_id] = l.task_code + '|' + (l.block || ''); });
        jobsOf(c).forEach(function (j) { j.people.forEach(function (w) { now[w] = j.task + '|' + (j.block || ''); }); });
        d.lines = {};
        Object.keys(fresh.lines).forEach(function (w) { d.lines[w] = keep[w] && (!was[w] || was[w] === now[w]) ? keep[w] : fresh.lines[w]; });
        Object.keys(fresh.status).forEach(function (k) { if (!d.status[k]) d.status[k] = fresh.status[k]; });
        Object.keys(fresh.prog).forEach(function (k) { if (!d.prog[k]) d.prog[k] = fresh.prog[k]; });
        // v1.48.1 (Ferezelly, 29 Oct: the chit fixed to 6 lots, Kerja still showed all the old lots): lots taken off the
        // job on the fixed chit leave Kerja too, unless they were added here by hand (+ Petak lain).
        d.added = d.added || {};
        jobsOf(c).forEach(function (j) {
          var pg = d.prog[j.key], add = d.added[j.key] || [];
          if (!pg) return;
          Object.keys(pg).forEach(function (l) { if (j.lots.indexOf(l) < 0 && add.indexOf(l) < 0) { delete pg[l]; if (d.lotwhy && d.lotwhy[j.key]) delete d.lotwhy[j.key][l]; } });
          if (d.who && d.who[j.key]) Object.keys(d.who[j.key]).forEach(function (w) { d.who[j.key][w] = (d.who[j.key][w] || []).filter(function (l) { return j.lots.indexOf(l) >= 0 || add.indexOf(l) >= 0; }); });
        });
        Object.keys(fresh.who).forEach(function (k) { if (!d.who[k]) d.who[k] = fresh.who[k]; });
        d.chitRev = c.rev || 1;
      }
      return d;
    }
    return freshDraft(c);
  }
  function freshDraft(c) {
    var d = { chit: c.chit, chitRev: c.rev || 1, lines: {}, status: {}, checker: c.checker || '', replacing: '', prog: {}, manual: {}, bags: {}, who: {}, pbags: {}, dose: {}, lotwhy: {} };
    var mine = ownLots();
    jobsOf(c).forEach(function (j) {
      j.people.forEach(function (w) {
        var k = kind(j.task, j.block);
        // A harvester keeps his own lot: the one he cut last time, when it is on today's job.
        var own = k === 'bunches' && mine[w] && j.lots.indexOf(mine[w]) >= 0 ? mine[w] : '';
        // v1.34.1: a day-paid job (e.g. the farm tractor ITF) covers all its lots in the day: they all start chosen.
        d.lines[w] = [{ lot: j.lots.length === 1 ? j.lots[0] : k === 'day' ? j.lots.join(' ') : own, qty: k === 'day' ? '1' : '', bunches: '' }];
        // v1.41: an operator's day starts from the machine's last hour meter.
        if (isOp(j)) { var lm = lastMeter(machOf(j), c.chit); d.lines[w][0].ms = lm == null ? '' : String(lm); d.lines[w][0].me = ''; }
      });
      d.status[j.key] = { done: '', reason: '' };
      // Ha jobs (CPS, manuring, slashing): the morning's lots start as done (100%);
      // the staff changes only a lot that was not finished.
      if (kind(j.task, j.block) === 'qty' && task(j.task) && task(j.task).unit === 'Ha' && j.lots.length) {
        d.prog[j.key] = {}; j.lots.forEach(function (l) { d.prog[j.key][l] = '100'; });
        // v1.41: one person, or one lot: nothing to choose. A gang on several lots: each person taps his own.
        d.who[j.key] = j.people.length === 1 || j.lots.length === 1 ? allWho(j, d) : {};
      }
    });
    return d;
  }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[draft.chit] = draft; EA.local.set(K.draft, all); }
  // Each harvester's own lot (lots are fixed to a harvester): the lot of his last harvest line.
  function ownLots() {
    var m = {};
    saved().slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (s) {
      ((s.rec && s.rec.lines) || []).forEach(function (l) { if (l.task_code === EA.lists.HARVEST && l.lot && !/^Blk /.test(l.lot)) m[l.worker_id] = l.lot; });
    });
    return m;
  }
  // The day's target for this job (2025 performance standard): people x target per person.
  function targetOf(j) {
    var t = EA.lists.target && EA.lists.target(j.task, ctx.estate);
    if (!t) return null;
    var per = t.per;
    // v1.41: manuring's target per person follows the dose (Daily Performance Standard 2025): over 2 kg a palm
    // 20 bags, under that 15 bags (the table says under 1.5 kg; 1.5–2 kg taken as 15 until HQ says), borate 2 bags.
    if (j.task === 'MAN' && draft && draft.dose && num(draft.dose[j.key]) > 0 && EA.lists.manTarget) per = EA.lists.manTarget(ctx.estate, num(draft.dose[j.key]));
    return { per: per, unit: t.unit, total: Math.round(per * j.people.length * 100) / 100 };
  }
  function isBagTarget(j) { var t = targetOf(j); return !!(t && t.unit === 'bag' && task(j.task) && task(j.task).unit === 'Ha'); }

  // ---------- v1.41 F · Kerja seorang-seorang (Yu Chen, 26 Oct): each person's own work, like harvesting ----------
  // Ha jobs: each person taps the lots he worked; a lot is split only among the people who tapped it.
  // Manuring: each person's own bags (the gang's bags are their sum) and the dose for the rate band.
  // Operators: the machine's hour meter at the start and end of the day (the backhoe is paid per hour).
  var OP_JOBS = ['OPH', 'OPR', 'OPF'];
  function isOp(j) { return OP_JOBS.indexOf(j.task) >= 0; }
  function machOf(j) { return EA.lists.splitMach(ctx.estate, j.lots).mach[0] || ''; }
  function isBagJob(j) { return j.task === 'MAN' || isBagTarget(j); }
  function who(j) { draft.who = draft.who || {}; return (draft.who[j.key] = draft.who[j.key] || {}); }
  function pbags(j) { draft.pbags = draft.pbags || {}; return (draft.pbags[j.key] = draft.pbags[j.key] || {}); }
  function gangBags(j) {
    var p = pbags(j), any = false, t = 0;
    j.people.forEach(function (w) { var v = String(p[w] == null ? '' : p[w]).trim(); if (v !== '') { any = true; t += num(v); } });
    return any ? t : null;
  }
  function hoursOf(l) { var a = num(l.ms), b = num(l.me); return String(l.ms || '') !== '' && String(l.me || '') !== '' && b > a ? r2(b - a) : 0; }
  // The machine's last hour meter at the end of a day (this phone's saved work), so today starts from it.
  function lastMeter(m, chitId) {
    var best = null;
    saved().slice().sort(function (a, b) { return (a.date + (a.rec && a.rec.at)) < (b.date + (b.rec && b.rec.at)) ? -1 : 1; }).forEach(function (s) {
      if (s.chit === chitId) return;
      ((s.rec && s.rec.lines) || []).forEach(function (l) { if (l.machine === m && String(l.meter_end || '') !== '') best = l.meter_end; });
    });
    return best;
  }
  // Everyone on every lot of the job (a gang that worked together; also older drafts made before v1.41).
  function allWho(j, d) {
    var p = (d.prog || {})[j.key] || {}, lots = j.lots.slice();
    Object.keys(p).forEach(function (l) { if (lots.indexOf(l) < 0) lots.push(l); });
    var o = {}; j.people.forEach(function (w) { o[w] = lots.slice(); }); return o;
  }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[draft.chit]; EA.local.set(K.draft, all); }

  // ---------- Ha jobs: % of each lot, shared equally ----------
  // Staff do not remember lot sizes; they know how much of a lot is done.
  // Ha = lot size (from the map) x %; each person on the job gets an equal share.
  // "Set per person" switches to keying each person's Ha by hand.
  function isHa(j) { return kind(j.task, j.block) === 'qty' && task(j.task) && task(j.task).unit === 'Ha'; }
  function auto(j) { return isHa(j) && !draft.manual[j.key]; }
  function progLots(j) {
    var p = draft.prog[j.key] || {}, out = j.lots.slice();
    Object.keys(p).forEach(function (l) { if (out.indexOf(l) < 0) out.push(l); });
    return out;
  }
  function lotHa(lot) { var l = EA.lists.lot(ctx.estate, lot); return l ? l.ha : 0; }
  // v1.41 (Yu Chen, 26 Oct): maintenance counts by finished lot, no percentage. Each lot is SIAP ('100') or
  // BELUM SIAP ('0') with why (rain or other) and when it continues; '' = not chosen yet.
  function doneLots(j) { var p = draft.prog[j.key] || {}; return progLots(j).filter(function (l) { return num(p[l]) > 0; }); }
  function chosenLots(j) { var p = draft.prog[j.key] || {}; return progLots(j).filter(function (l) { return String(p[l]) === '100' || String(p[l]) === '0'; }); }
  function lotWhy(j) { draft.lotwhy = draft.lotwhy || {}; return (draft.lotwhy[j.key] = draft.lotwhy[j.key] || {}); }
  // An older draft may still hold a percentage: anything above 0 counts as a finished lot.
  function normProg(d) { Object.keys(d.prog || {}).forEach(function (k) { Object.keys(d.prog[k]).forEach(function (l) { var v = String(d.prog[k][l]); if (v !== '' && v !== '0' && v !== '100') d.prog[k][l] = num(v) > 0 ? '100' : '0'; }); }); return d; }
  function niceShort(iso) { var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.getDate() + '/' + (d.getMonth() + 1); }
  function whyText(w) { return (w.why === 'rain' ? 'Hujan' + rainText(w) : 'Lain') + (w.note ? ': ' + w.note : '') + (w.until ? ' · sambung ' + niceShort(w.until) : ''); }
  // v1.46 TUTUP HARI on save (Yu Chen, 27 Oct): rain is told on the lot, where it happened: what kind (from the job's rain
  // group, lists/tasks.js) and how much of the day was lost (¼–1). The day close reads it from here; nothing asked twice.
  function rainKinds(code) { var g = EA.lists.rainOf ? EA.lists.rainOf(code) : 'B'; return (EA.lists.rainReasons || []).filter(function (r) { return r.groups.indexOf(g) >= 0; }); }
  function rainText(w) {
    var r = (EA.lists.rainReasons || []).find(function (x) { return x.code === w.rain; }), l = (EA.lists.lostDay || []).find(function (x) { return x.v === Number(w.lost); });
    return r || l ? ' (' + [r ? r.bm.replace(/^Hujan — /, '') : '', l ? l.bm : ''].filter(Boolean).join(', ') + ')' : '';
  }
  // The job is SIAP when every lot is finished; otherwise BELUM SIAP with each lot's reason.
  function syncHaStatus(j) {
    if (!isHa(j)) return;
    var p = draft.prog[j.key] || {}, lots = progLots(j), lw = lotWhy(j), st = draft.status[j.key] = draft.status[j.key] || { done: '', reason: '' };
    if (!lots.length || lots.some(function (l) { return String(p[l] == null ? '' : p[l]) === ''; })) { st.done = ''; st.reason = ''; return; }
    var nd = lots.filter(function (l) { return String(p[l]) === '0'; });
    st.done = nd.length ? 'N' : 'Y';
    st.reason = nd.map(function (l) { return l + ' ' + whyText(lw[l] || {}); }).join('; ');
  }
  // v1.42 (Yu Chen, 26 Oct): a lot left BELUM SIAP (rain) keeps who worked it with 0 Ha. The day it is finished,
  // its Ha is shared over every person-day on it in the last 14 days, so each worker gets what he did; the earlier
  // days' 0 Ha lines are corrected by new lines on their own day (nothing deleted). Only this phone's saved days.
  var SETTLE_DAYS = 14;
  function earlierDays(task, lot) {
    if (!chit) return [];
    var from = new Date(chit.date + 'T00:00:00'); from.setDate(from.getDate() - SETTLE_DAYS);
    var fromIso = from.getFullYear() + '-' + String(from.getMonth() + 1).padStart(2, '0') + '-' + String(from.getDate()).padStart(2, '0'), out = [];
    saved().forEach(function (s) {
      if (s.chit === chit.chit || s.estate !== chit.estate || s.date >= chit.date || s.date < fromIso) return;
      ((s.rec && s.rec.lines) || []).forEach(function (l, i) {
        if (l.task_code !== task || l.lot !== lot || !l.id) return;
        if ((num(l.qty) === 0 && !l.settledBy) || l.settledBy === chit.chit) out.push({ s: s, i: i, line: l });
      });
    });
    return out;
  }
  function shareOut(j) {           // v1.41: each person's lines from the lots he tapped; a lot is split among its people
    var p = draft.prog[j.key] || {}, wh = who(j), lots = chosenLots(j), count = {};
    lots.forEach(function (l) {
      count[l] = j.people.filter(function (w) { return (wh[w] || []).indexOf(l) >= 0; }).length;
      if (p[l] === '100' && count[l] && !draft.manual[j.key]) count[l] += earlierDays(j.task, l).length;   // v1.42: earlier person-days on it
    });
    j.people.forEach(function (w) {
      var mine = lots.filter(function (l) { return (wh[w] || []).indexOf(l) >= 0; });
      // A finished lot's Ha is split among the people on it; a lot not finished is kept with 0 Ha (who worked there).
      draft.lines[w] = mine.length ? mine.map(function (l) {
        return { lot: l, qty: String(p[l] === '100' ? Math.round(lotHa(l) / count[l] * 1000) / 1000 : 0), bunches: '' };
      }) : [{ lot: '', qty: '', bunches: '' }];
    });
  }
  function progText(j) {
    var p = draft.prog[j.key] || {};
    var lw = lotWhy(j);
    return chosenLots(j).map(function (l) { return l + (p[l] === '100' ? ' siap' : ' belum siap (' + whyText(lw[l] || {}) + ')'); }).join(', ');
  }

  // ---------- totals and flags ----------
  function jobTotals(j) {
    var k = kind(j.task, j.block), qty = 0, bunches = 0, byLot = {}, flags = [];
    j.people.forEach(function (w) {
      var pb = 0;
      (draft.lines[w] || []).forEach(function (l) {
        qty += num(l.qty); bunches += num(l.bunches); pb += num(l.bunches);
        if (l.lot) byLot[l.lot] = r2((byLot[l.lot] || 0) + num(k === 'bunches' ? l.bunches : l.qty));
      });
      if (k === 'bunches' && pb > 0 && pb < LOW_BUNCHES) flags.push({ w: w, text: person(w) + ' ' + pb + ' tandan (bawah ' + LOW_BUNCHES + ')', bad: false });
    });
    if (task(j.task) && task(j.task).unit === 'Ha') {
      Object.keys(byLot).forEach(function (lot) {
        var l = EA.lists.lot(ctx.estate, lot);
        if (l && byLot[lot] > l.ha * 1.05) flags.push({ text: 'Petak ' + lot + ': ' + byLot[lot] + ' Ha lebih daripada saiz petak ' + l.ha.toFixed(2) + ' Ha', bad: true });
      });
    }
    var planHa = 0; j.lots.forEach(function (n) { var l = EA.lists.lot(ctx.estate, n); if (l) planHa += l.ha; });
    // Against the target: Ha done, or bags used for manuring (targeted in bags), or the unit itself.
    var tg = targetOf(j), actual = null, unit = '';
    if (tg && j.people.length) {
      // Bags not filled in: no below-target flag (an empty box is not 0 bags).
      if (isBagTarget(j)) { actual = gangBags(j); unit = 'beg'; }
      else if (tg.unit === (task(j.task) || {}).unit && k === 'qty') { actual = r2(qty); unit = tg.unit; }
      if (actual != null && actual < tg.total - 0.005) flags.push({ text: 'Bawah sasaran · below target: ' + actual + ' / ' + tg.total + ' ' + unit + ' (' + j.people.length + ' × ' + tg.per + ')', bad: true });
    }
    // v1.41: each person against his own target (shown, not a stop).
    if (tg && (k === 'qty')) j.people.forEach(function (w) {
      var mine = tg.unit === 'bag' && isBagJob(j) ? String(pbags(j)[w] == null ? '' : pbags(j)[w]).trim() : (tg.unit === (task(j.task) || {}).unit ? String(r2((draft.lines[w] || []).reduce(function (a, l) { return a + num(l.qty); }, 0))) : '');
      if (mine !== '' && num(mine) > 0 && num(mine) < tg.per - 0.005) flags.push({ w: w, text: person(w) + ' ' + num(mine) + ' ' + (tg.unit === 'bag' ? 'beg' : tg.unit) + EA.t(' (sasaran ', ' (target ') + tg.per + ')', bad: false });
    });
    var hours = 0; if (isOp(j)) j.people.forEach(function (w) { (draft.lines[w] || []).forEach(function (l) { hours += hoursOf(l); }); });
    return { qty: r2(qty), bunches: bunches, byLot: byLot, flags: flags, planHa: r2(planHa), target: tg, actual: actual, tunit: unit, hours: r2(hours), bags: isBagJob(j) ? gangBags(j) : null };
  }

  // ---------- the screen ----------
  // ---------- v1.92 Rupa Baru (Brief_Rupa_Baru, signed by Yu Chen 24 Nov 2026) ----------
  // The screen agreed in the sample (CADANGAN, 23–24 Nov): the jobs as one list, one job open at a time, each marked
  // LENGKAP ✓ when done; on a per-man job one man open at a time — the men already keyed fold to one line
  // ("1-13 · 101 tandan ✓"), the rest read BELUM DIISI ›; SETERUSNYA › (or Enter) goes to the next man, who starts on
  // the lot of the man before him; "Petak habis dituai?" once per lot, its answers filling the job's SIAP / BELUM SIAP.
  // Only the screen is new. Every button writes the same draft through the same handlers (wireJobs), and SIMPAN,
  // the checks and the records are the ones the old screen uses. Jobs the sample did not redraw (CPS by lot, a day
  // job over several lots) open with the old card inside, so nothing is lost.
  function rbOn() { return !!(EA.rupaBaru && EA.rupaBaru()); }
  // The big estate heading is folded away on the new Kerja (the thin green line says where you are), as in the sample;
  // the sending line with HANTAR stays. Back on any other screen the heading returns.
  function rbRoom(on) { try { document.body.classList.toggle('rb-room', !!on); } catch (e) {} }
  window.addEventListener('hashchange', function () { if (location.hash.indexOf('field-harvest/work') < 0) rbRoom(false); });
  var rbMan = {}, rbFocus = '', rbSeeLot = '';
  function rbKey() { return 'fh.rbJob.' + (chit ? chit.chit : ''); }
  function rbType(j) {
    var k = kind(j.task, j.block);
    if (j.task === 'ITF') return 'col';                  // v1.95 Traktor & pemuat (Brief_Tuai_Kutip_Rupa_Baru)
    if (j.task === 'LFF' && rbColOf(j)) return 'colx';   // the loader closes with the tractor, inside its card
    if (k === 'ticket') return 'ticket';
    if (j.task === 'MAN' && rbMan0(j)) return 'man';     // v1.94 Membaja (Brief_Membaja_Rupa_Baru)
    if (isHa(j)) return 'old';
    if (isOp(j)) return 'op';
    if (k === 'day') return j.lots.length > 1 && EA.lists.MACHINE_JOBS.indexOf(j.task) < 0 ? 'old' : 'day';
    if (k === 'bunches') return 'harv';
    return j.lots.length > 1 ? 'harv' : 'num';     // a qty job over several lots goes man by man, like harvesting
  }
  function rbHarvest(j) { return rbOn() && kind(j.task, j.block) === 'bunches'; }
  function rbDefaults(jobs) {
    var ch = false;
    jobs.forEach(function (j) {
      if (rbType(j) !== 'day') return;
      j.people.forEach(function (w) { (draft.lines[w] || []).forEach(function (l) { if (String(l.qty == null ? '' : l.qty) === '' && !zeroWhy(w)) { l.qty = '1'; ch = true; } }); });
    });
    if (ch) keepDraft();
  }
  function rbManDone(j, w) {
    if (rbType(j) === 'man') return num(pbags(j)[w]) > 0;
    var k = kind(j.task, j.block), ls = draft.lines[w] || [];
    if (isOp(j)) return ls.length > 0 && ls.every(function (l) { return hoursOf(l) > 0; });
    if (k === 'day') return ls.length > 0 && ls.every(function (l) { return !!l.qty; });
    return answered(w, k) && (j.lots.length < 2 || ls.every(function (l) { return !!l.lot || !(num(k === 'bunches' ? l.bunches : l.qty) > 0); }));
  }
  function rbFilled(j) {
    var t = rbType(j);
    if (t === 'colx') { var cj = rbColOf(j); return cj ? rbFilled(cj) : true; }
    if (problems(t === 'col' ? [j].concat(rbColPartners(j)) : [j]).length) return false;
    if (t === 'col') return rbAllKeyed(j) && rbColAnswered(j);
    return t === 'ticket' || auto(j) || j.people.every(function (w) { return rbManDone(j, w); });
  }
  // v1.99 Satu kerja satu skrin: the list shows when no job is open; a job opens only when it is tapped (or follows SIAP).
  function rbOpenJob(jobs) {
    var k = EA.local.get(rbKey(), null);
    return k && jobs.some(function (j) { return j.key === k; }) ? k : '';
  }
  function rbUnit(j) { return kind(j.task, j.block) === 'bunches' ? EA.t('tandan', 'bunches') : unitLabel(j.task, j.block); }
  function rbVal(j, l) { return kind(j.task, j.block) === 'bunches' ? l.bunches : l.qty; }
  function rbSumLine(j, w) {
    var ls = (draft.lines[w] || []).filter(function (l) { return String(rbVal(j, l) || '') !== ''; });
    if (!ls.length && zeroWhy(w)) return '0 · ' + esc(zeroWhy(w));
    return ls.map(function (l) { return (l.lot ? esc(l.lot) + ' · ' : '') + '<b>' + esc(rbVal(j, l)) + '</b>'; }).join(' + ') + ' ' + esc(rbUnit(j));
  }
  // v1.101 Pilih petak (Brief_Rupa_Baru 1.2 §3b; Yu Chen, 25 Nov 2026: "Too many lots it show smaller screen",
  // "Can lot already taken hide or the cursor straight to new lot", "No button for remove or redo if wrong select";
  // sharing a lot is "seldom"; sample "E-Book Pilih Petak" v2, "Ok"). Lots 5 a row that never shrink. Once a man has a
  // lot it folds to one line with TUKAR PETAK. The list shows only lots nobody has yet; the others wait behind
  // KONGSI PETAK. The man after gets the next empty lot (rbNextMan).
  var rbGrid = {}, rbShare = {};
  function rbLotCount(j, w, i) {
    var count = {}; j.lots.forEach(function (n) { count[n] = 0; });
    j.people.forEach(function (ww) { (draft.lines[ww] || []).forEach(function (ll, ii) { if ((ww !== w || ii !== i) && ll.lot && count[ll.lot] !== undefined) count[ll.lot]++; }); });
    return count;
  }
  function rbLotBtns(j, w, i) {
    if (j.lots.length < 2) return '';
    var l = (draft.lines[w] || [])[i] || {}, k = j.key + '|' + w + '|' + i, count = rbLotCount(j, w, i);
    var palms = function (n) { var lo = EA.lists.lot(ctx.estate, n); return lo && lo.palms ? lo.palms + ' pk' : ''; };
    if (l.lot && rbGrid[k] !== l.lot) {
      return '<div class="rb-picked"><b>' + esc(l.lot) + '</b><span class="rb-s">' + [palms(l.lot), count[l.lot] ? count[l.lot] + EA.t(' org lain', ' others') : ''].filter(Boolean).join(' · ') + '</span>' +
        '<button type="button" data-rbtukar="' + esc(k) + '">' + EA.t('TUKAR PETAK', 'CHANGE LOT') + '</button></div>';
    }
    var btn = function (n) {
      var c = count[n];
      return '<button type="button" data-w="' + esc(w) + '" data-i="' + i + '" data-pick-lot="' + esc(n) + '"' + (c ? ' data-taken' : '') + ' aria-pressed="' + (l.lot === n) + '">' + esc(n) +
        (palms(n) ? '<span class="rb-s">' + palms(n) + '</span>' : '') + '<span class="rb-s">' + (c ? '<b>' + c + ' org</b>' : EA.t('kosong', 'nobody')) + '</span></button>';
    };
    var free = j.lots.filter(function (n) { return !count[n] || l.lot === n; }), used = j.lots.filter(function (n) { return count[n] && l.lot !== n; });
    if (!free.length) { free = used; used = []; }
    return '<p class="hint rb-lead"><b>' + EA.t('Pilih petak', 'Pick the lot') + '</b>' + (used.length ? ' · ' + EA.t('belum ada orang', 'nobody on it yet') : '') + '</p>' +
      '<div class="rb-lots rb-grid5">' + free.map(btn).join('') + '</div>' +
      (used.length ? (rbShare[k] ? '<p class="hint rb-lead"><b>' + EA.t('Kongsi petak', 'Share a lot') + '</b> · ' + EA.t('sudah ada orang', 'already has someone') + '</p><div class="rb-lots rb-grid5">' + used.map(btn).join('') + '</div>'
        : '<button type="button" class="rb-share" data-rbshare="' + esc(k) + '">' + EA.t('KONGSI PETAK', 'SHARE A LOT') + ' · ' + used.length + EA.t(' petak sudah ada orang', ' lots already have someone') + '</button>') : '');
  }
  function rbManList(j) {
    var k = kind(j.task, j.block), unit = rbUnit(j), f = k === 'bunches' ? 'bunches' : 'qty';
    var done = j.people.filter(function (w) { return rbManDone(j, w); }).length;
    var tot = j.people.reduce(function (a, w) { return a + (draft.lines[w] || []).reduce(function (b, l) { return b + num(rbVal(j, l)); }, 0); }, 0);
    var open = rbMan[j.key];
    if (open === undefined || j.people.indexOf(open) < 0) open = rbMan[j.key] = j.people.find(function (w) { return !rbManDone(j, w); }) || '';
    var h = '<p class="rb-prog"><b>' + done + EA.t(' daripada ', ' of ') + j.people.length + EA.t(' orang diisi · ', ' people keyed · ') + (Math.round(tot * 100) / 100) + ' ' + esc(unit) + '</b></p>';
    h += j.people.map(function (w) {
      if (w !== open) {
        var ok = rbManDone(j, w);
        return '<button type="button" class="rb-row" data-rbman="' + esc(j.key) + '|' + esc(w) + '"><b>' + esc(person(w)) + '</b>' +
          (ok ? '<span>' + rbSumLine(j, w) + ' <i class="rb-ok">✓</i></span>' : '<span class="rb-chip w">' + EA.t('BELUM DIISI ›', 'NOT KEYED ›') + '</span>') + '</button>';
      }
      var ls = draft.lines[w] || [];
      return '<div class="rb-open" data-rbopen="' + esc(j.key) + '"><b class="rb-name">' + esc(person(w)) + '</b>' +
        ls.map(function (l, i) {
          return (i > 0 ? '<div class="rb-second"><span>' + EA.t('Petak kedua', 'Second lot') + '</span><button type="button" class="rb-delbtn" data-w="' + esc(w) + '" data-del="' + i + '">' + EA.t('× BUANG PETAK INI', '× REMOVE THIS LOT') + '</button></div>' : '') +
            rbLotBtns(j, w, i) +
            '<div class="rb-box"><input inputmode="numeric" data-f="' + f + '" data-w="' + esc(w) + '" data-i="' + i + '" data-rbin="' + esc(j.key) + '" value="' + esc(rbVal(j, l) || '') + '" aria-label="' + esc(unit + ' ' + person(w)) + '"> ' + esc(unit) +
            (i === ls.length - 1 ? '<button type="button" class="rb-next" data-rbnext="' + esc(j.key) + '|' + esc(w) + '">' + EA.t('SETERUSNYA ›', 'NEXT ›') + '</button>' : '') + '</div>';
        }).join('') + bagBox(j, w) +
        '<div class="rb-b2">' + (j.lots.length > 1 ? '<button type="button" data-w="' + esc(w) + '" data-add="1">' + EA.t('+ PETAK LAIN', '+ ANOTHER LOT') + '</button>' : '') +
        ((draft.lines[w] || []).some(function (l) { return l.lot || l.bunches || l.qty; }) ? '<button type="button" class="rb-red" data-rbclear="' + esc(j.key) + '|' + esc(w) + '">' + EA.t('KOSONGKAN', 'CLEAR') + '</button>' : '') +
        (askable(j) ? '<button type="button" data-awayw="' + esc(w) + '" data-awayj="' + esc(j.key) + '">' + EA.t('TIDAK HADIR / TIADA KERJA', 'ABSENT / NO WORK') + '</button>' : '') + '</div></div>';
    }).join('');
    return h;
  }
  function rbStatus(j) {
    var st = draft.status[j.key] || { done: '', reason: '' };
    return '<div class="rb-lst"><div class="rb-top"><b>' + EA.t('Kerja ini', 'This job') + '</b><span class="seg">' +
      '<button type="button" data-st="' + j.key + '" data-v="Y" aria-pressed="' + (st.done === 'Y') + '">' + EA.t('SIAP', 'DONE') + '</button>' +
      '<button type="button" data-st="' + j.key + '" data-v="N" aria-pressed="' + (st.done === 'N') + '">' + EA.t('BELUM', 'NOT YET') + '</button></span></div>' +
      '<div class="field" data-reasonbox="' + j.key + '"' + (st.done === 'N' ? '' : ' hidden') + '><textarea class="text-input" rows="2" data-reason="' + j.key + '" placeholder="' + EA.t('sebab dan tindakan', 'why, and what will be done') + '">' + esc(st.reason || '') + '</textarea></div></div>';
  }
  function rbBody(j) {
    if (rbType(j) === 'man') return rbManBody(j);
    var t = rbType(j), mand = j.mandors && j.mandors.length ? '<p class="hint">' + EA.t('Mandor ', 'Mandor ') + j.mandors.map(person).map(esc).join(', ') + EA.t(' · ikut kumpulan, tiada angka', ' · goes by the gang, no number') + '</p>' : '';
    if (t === 'old') return jobCard(j);
    var dose = j.task === 'MAN' ? '<div class="wline"><label class="inline-label">' + EA.t('Dos baja (kg sepokok) ', 'Dose (kg per palm) ') + '<input class="qty" inputmode="decimal" data-dose="' + j.key + '" value="' + esc((draft.dose || {})[j.key] || '') + '"></label></div>' : '';
    if (t === 'col') return rbColBody(j);
    if (t === 'harv') return mand + dose + rbManList(j) + (kind(j.task, j.block) === 'bunches' ? rbLotsHtml(j) : rbStatus(j));
    if (t === 'ticket') return '<p class="hint"><b>' + EA.t('Tiada apa untuk diisi.', 'Nothing to key.') + '</b> ' + EA.t('Dibayar ikut tan pada tiket kilang.', 'Paid by the tonnes on the mill ticket.') + '</p>' +
      j.people.map(function (w) { return '<div class="rb-row"><b>' + esc(person(w)) + '</b><span class="rb-chip">' + EA.t('IKUT TIKET', 'BY TICKET') + '</span></div>'; }).join('');
    if (t === 'op') return '<p class="hint">' + EA.t('Isi jam meter mula dan tamat.', 'Key the hour meter at start and end.') + '</p>' + j.people.map(function (w) {
      return (draft.lines[w] || []).map(function (l, i) {
        return '<div class="rb-row rb-wrap"><b>' + esc(person(w)) + '</b><span class="rb-inl"><input inputmode="decimal" data-w="' + esc(w) + '" data-i="' + i + '" data-f="ms" value="' + esc(l.ms || '') + '" placeholder="' + EA.t('mula', 'start') + '"> ' +
          '<input inputmode="decimal" data-w="' + esc(w) + '" data-i="' + i + '" data-f="me" value="' + esc(l.me || '') + '" placeholder="' + EA.t('tamat', 'end') + '"> <b data-hrs="' + esc(w) + '|' + i + '"></b></span></div>';
      }).join('');
    }).join('') + rbStatus(j);
    if (t === 'day') return '<p class="hint"><b>' + EA.t('1 hari.', '1 day.') + '</b> ' + EA.t('Tekan ½ untuk separuh hari sahaja.', 'Tap ½ for half a day only.') + '</p>' + j.people.map(function (w) {
      return (draft.lines[w] || []).map(function (l, i) {
        return '<div class="rb-row"><b>' + esc(person(w)) + '</b><span class="seg"><button type="button" data-w="' + esc(w) + '" data-i="' + i + '" data-day="1" aria-pressed="' + (l.qty === '1') + '">1</button>' +
          '<button type="button" data-w="' + esc(w) + '" data-i="' + i + '" data-day="0.5" aria-pressed="' + (l.qty === '0.5') + '">½</button></span></div>';
      }).join('');
    }).join('') + rbStatus(j);
    // one lot, one number a man (loose fruit, manuring…)
    var sum = j.people.reduce(function (a, w) { return a + (draft.lines[w] || []).reduce(function (b, l) { return b + num(l.qty); }, 0); }, 0);
    return mand + dose + '<p class="rb-prog"><b>' + EA.t('Jumlah: ', 'Total: ') + (Math.round(sum * 100) / 100) + ' ' + esc(rbUnit(j)) + '</b> · ' + EA.t('seorang satu angka', 'one number a man') + '</p>' +
      j.people.map(function (w) {
        return (draft.lines[w] || []).map(function (l, i) {
          return '<div class="rb-row rb-wrap"><b>' + esc(person(w)) + '</b><span class="rb-inl"><input inputmode="decimal" data-f="qty" data-w="' + esc(w) + '" data-i="' + i + '" data-rbin="' + esc(j.key) + '" value="' + esc(l.qty || '') + '"> ' + esc(rbUnit(j)) + '</span>' +
            (askable(j) ? '<button type="button" class="link-btn" data-awayw="' + esc(w) + '" data-awayj="' + esc(j.key) + '">' + EA.t('tidak hadir', 'absent') + '</button>' : '') + bagBox(j, w) + '</div>';
        }).join('');
      }).join('') + rbStatus(j);
  }
  function rbLeft(j) {
    var t = rbType(j);
    if (t === 'op') return EA.t('meter belum diisi', 'meter not keyed');
    if (t === 'col') return !rbAllKeyed(j) ? EA.t('pemandu belum diisi', 'driver not keyed') : !rbColReady(j) ? EA.t('tunggu penuai', 'waiting for the harvesters') : EA.t('petak habis dikutip?', 'lots collected?');
    var left = j.people.filter(function (w) { return !rbManDone(j, w); }).length;
    if (t === 'man') { var ml = progLots(j).filter(function (l) { return !(rbMl(j)[l] || {}).v; }).length; if (ml) return ml + EA.t(' petak belum dijawab', ' lots to answer'); if (left) return (j.people.length - left) + '/' + j.people.length + EA.t(' diisi', ' keyed'); }
    if ((t === 'harv' || t === 'num') && left) return (j.people.length - left) + '/' + j.people.length + EA.t(' diisi', ' keyed');
    var st = draft.status[j.key] || {};
    if (!left && !st.done) return EA.t(kind(j.task, j.block) === 'bunches' ? 'petak habis?' : 'SIAP / BELUM?', kind(j.task, j.block) === 'bunches' ? 'lots done?' : 'DONE / NOT YET?');
    return EA.t('belum lengkap', 'not complete');
  }
  // ---------- v1.99 Satu kerja satu skrin (Brief_Rupa_Baru 1.1 §3a; Yu Chen, 24 Nov 2026: "any where to completed one
  // task by task ? or better option that is no confuse?"; sample "E-Book Kerja Satu Demi Satu" v2, "ok") ----------
  // Kerja opens on the list of the day's jobs. A job tapped fills the screen alone, the finished jobs as ticked lines on
  // top ("i need those completed task show at top like the practice"). SIAP · KERJA SETERUSNYA ticks it and opens the
  // next; a tick holds only while the job is still complete. The tractor and loader wait for the harvest. SIMPAN opens
  // on the list when every job is ticked. The day is still saved once, as one record; nothing in the record changes.
  function rbVis(all) { return all.filter(function (j) { return rbType(j) !== 'colx'; }); }   // the loader is inside the tractor's card
  function rbTicked(j) { return !!(draft.rbTick && draft.rbTick[j.key]) && rbFilled(j); }
  function rbLocked(j) { return rbType(j) === 'col' && jobsOf(chit).some(function (x) { return kind(x.task, x.block) === 'bunches' && !rbFilled(x); }); }
  function rbJobName(j) { return (rbType(j) === 'col' ? EA.t('Traktor & pemuat', 'Tractor & loader') : jobName(j.task)) + (j.block ? ' · Blok ' + j.block : ''); }
  function rbJobSub(j) {
    if (rbType(j) === 'col') return EA.t('Angkut BTS (ITF) + Muat BTS (LFF) · ditutup bersama', 'Tractor (ITF) + loader (LFF) · closed together') + (j.lots.length ? ' · ' + j.lots.length + EA.t(' petak', ' lots') : '');
    return j.people.length + EA.t(' orang', ' people') + (j.lots.length ? ' · ' + EA.t('Petak ', 'Lots ') + (j.lots.length > 3 ? j.lots[0] + EA.t(' hingga ', ' to ') + j.lots[j.lots.length - 1] : j.lots.join(', ')) : '') + (j.ask ? ' · ' + EA.t('minta lulus', 'needs approval') : '');
  }
  // One line of what a finished job came to.
  function rbSum(j) {
    var t = rbType(j), st = draft.status[j.key] || {}, end = st.done === 'Y' ? EA.t('siap', 'done') : EA.t('belum siap', 'not done');
    if (t === 'col') { var ok = j.lots.filter(function (l) { return rbColState(j, l) === 'Y'; }), no = j.lots.filter(function (l) { return ok.indexOf(l) < 0; });
      return ok.length + '/' + j.lots.length + EA.t(' petak ke ramp', ' lots to the ramp') + (no.length ? ' · ' + no.join(', ') + EA.t(' belum', ' not yet') : ''); }
    if (kind(j.task, j.block) === 'bunches') { var hl = rbHl(j), nb = rbLotsOf(j).filter(function (l) { return (hl[l] || {}).v !== 'Y'; });
      return jobTotals(j).bunches + EA.t(' tandan · ', ' bunches · ') + (nb.length ? nb.join(', ') + EA.t(' belum habis', ' not finished') : EA.t('semua petak habis', 'every lot done')); }
    if (t === 'ticket') return j.people.length + EA.t(' orang · ikut tiket kilang', ' people · by the mill ticket');
    return j.people.length + EA.t(' orang · ', ' people · ') + end;
  }
  function rbStepRow(j, n, cls, small) {
    var tk = rbTicked(j), lk = !tk && rbLocked(j), full = rbFilled(j);
    return '<button type="button" class="rb-step' + (tk ? ' done' : '') + (cls ? ' ' + cls : '') + (small ? ' sm' : '') + '" data-rbj="' + esc(j.key) + '"' + (lk ? ' disabled' : '') + '><span class="rb-dot">' + (tk ? '✓' : n + 1) + '</span>' +
      '<span class="t"><b>' + (small ? (n + 1) + '. ' : '') + esc(rbJobName(j)) + '</b><span class="rb-s">' + esc(tk ? rbSum(j) : rbJobSub(j)) + '</span></span>' +
      '<span class="rb-chip' + (tk ? '' : ' w') + '">' + (tk ? EA.t('SIAP ✓', 'DONE ✓') : lk ? '🔒 ' + EA.t('selepas Menuai', 'after harvesting') : full ? EA.t('semak & SIAP', 'check & DONE') : esc(rbLeft(j))) + '</span></button>';
  }
  function rbJobs(all) {
    var jobs = rbVis(all), openK = rbOpenJob(jobs), nd = jobs.filter(rbTicked).length;
    if (!openK) {
      var nx = jobs.find(function (j) { return !rbTicked(j) && !rbLocked(j); });
      return '<p class="hint rb-lead"><b>' + nd + EA.t(' daripada ', ' of ') + jobs.length + EA.t(' kerja siap.', ' jobs done.') + '</b> ' + EA.t('Tekan kerja pertama yang belum bertanda.', 'Tap the first job not ticked.') + '</p>' +
        '<div class="rb-bar"><i style="width:' + (jobs.length ? Math.round(nd / jobs.length * 100) : 0) + '%"></i></div>' +
        '<div class="card rb-steps">' + jobs.map(function (j, n) { return rbStepRow(j, n, nx && nx.key === j.key ? 'next' : ''); }).join('') + '</div>';
    }
    var n = jobs.findIndex(function (j) { return j.key === openK; }), j = jobs[n], d = rbFilled(j);
    var top = jobs.map(function (x, i) { return x.key !== openK && rbTicked(x) ? rbStepRow(x, i, '', true) : ''; }).join('');
    return (top ? '<div class="card rb-steps rb-donetop">' + top + '</div>' : '') +
      '<div class="card rb-job on" data-rbjob="' + esc(j.key) + '"><div class="rb-jh"><span class="t"><b>' + (n + 1) + '. ' + esc(rbJobName(j)) + '</b><span class="rb-s">' + esc(rbJobSub(j)) + ' · ' + EA.t('kerja ', 'job ') + (n + 1) + '/' + jobs.length + '</span></span>' +
      '<span class="rb-chip' + (d ? '' : ' w') + '">' + (d ? EA.t('LENGKAP ✓', 'COMPLETE ✓') : esc(rbLeft(j))) + '</span></div><div class="rb-jb">' + rbBody(j) + '</div></div>';
  }
  // ---------- v1.94 Membaja in the new look (Brief_Membaja_Rupa_Baru, signed by Yu Chen 24 Nov 2026) ----------
  // ① each lot HABIS / BELUM with the bags used (HABIS fills what the lot needed; more than 10% off asks why);
  // ② the bags of each man, with BAHAGI SAMA; bawa · guna · pulang. The answers fill the same draft the old screen
  // fills (prog, lotwhy, who, pbags, dose), so the checks, SIMPAN and the work records are the old ones; the bags per lot
  // and the bags back go to FH_MATERIAL. The dose is the programme's (or the Owner's approved change), never typed.
  var RB_MWHY_N = [['hujan', 'Hujan', 'Rain'], ['orang', 'Kurang orang', 'Short of men'], ['baja', 'Baja tak cukup', 'Not enough fertiliser'], ['lain', 'Lain-lain', 'Other']];
  var RB_MWHY_K = [['pokok', 'Pokok mati / kosong', 'Dead or missing palms'], ['air', 'Kawasan berair', 'Waterlogged'], ['baja', 'Baja tak cukup', 'Not enough fertiliser'], ['lain', 'Lain-lain', 'Other']];
  var RB_MWHY_L = [['lebih', 'Pokok lebih dari senarai', 'More palms than listed'], ['beg', 'Beg tak penuh', 'Bags not full'], ['tumpah', 'Tumpah', 'Spilt'], ['lain', 'Lain-lain', 'Other']];
  var RB_PWHY = [['rosak', 'Rosak', 'Damaged'], ['tumpah', 'Tumpah', 'Spilt'], ['ladang', 'Tinggal di ladang', 'Left in the field'], ['lain', 'Lain-lain', 'Other']];
  function rbMan0(j) { return !!(EA.fh.manPlan && chit && EA.fh.manPlan(ctx.estate, j.block, chit.date)); }
  function rbMl(j) { draft.mlot = draft.mlot || {}; return (draft.mlot[j.key] = draft.mlot[j.key] || {}); }
  function rbMp(j) { draft.mpul = draft.mpul || {}; return (draft.mpul[j.key] = draft.mpul[j.key] || {}); }
  function rbManInfo(j) {
    var mp = EA.fh.manPlan(ctx.estate, j.block, chit.date), ap = EA.fh.manApproved ? EA.fh.manApproved(ctx.estate, chit.chit, j.block) : null;
    var dose = ap ? Number(ap.dose) : mp.dose, fert = ap ? ap.fert : mp.fert, need = {}, sum = 0;
    progLots(j).forEach(function (l) { need[l] = EA.fh.manBags(ctx.estate, l, dose, mp.bagKg); sum += need[l]; });
    var cj = (chit.jobs || []).find(function (x) { return x.task === 'MAN' && String(x.block) === String(j.block) && x.mat; });
    var used = progLots(j).reduce(function (a, l) { var x = rbMl(j)[l]; return a + (x && x.v ? num(x.used) : 0); }, 0);
    return { fert: fert, dose: dose, kg: mp.bagKg, need: need, bawa: cj ? Number(cj.mat.bawa) || sum : sum, used: used, approved: !!ap };
  }
  function rbOff(need, used) { return used < need * 0.9 ? 'kurang' : used > need * 1.1 ? 'lebih' : ''; }
  function rbWhyName(list, k) { var x = list.find(function (y) { return y[0] === k; }); return x ? x[1] : ''; }
  // The lots' answers written into the old screen's own fields.
  function rbManSync(j) {
    var m = rbManInfo(j), ml = rbMl(j), p = draft.prog[j.key] = draft.prog[j.key] || {}, lw = lotWhy(j), nextDay = (function () { var d = new Date(chit.date + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    progLots(j).forEach(function (l) {
      var x = ml[l] || {};
      if (x.v === 'Y') { p[l] = '100'; delete lw[l]; }
      else if (x.v === 'N') { p[l] = '0'; lw[l] = { why: 'other', note: 'Belum habis' + (x.why ? ': ' + rbWhyName(RB_MWHY_N, x.why).toLowerCase() : '') + ' · baki ' + Math.max(0, m.need[l] - num(x.used)) + ' beg', until: nextDay }; }
      else delete p[l];
    });
    draft.manual[j.key] = false;
    draft.who = draft.who || {}; draft.who[j.key] = allWho(j, draft);
    draft.dose = draft.dose || {}; draft.dose[j.key] = String(m.dose);
    shareOut(j); syncHaStatus(j);
  }
  function rbManProblems(j) {
    var m = rbManInfo(j), ml = rbMl(j), out = [], n = 'Membaja Blk ' + j.block;
    progLots(j).forEach(function (l) {
      var x = ml[l] || {};
      if (!x.v) { out.push([n + ': petak ' + l + ' HABIS atau BELUM?', 'Lot ' + l + ': done or not?']); return; }
      if (String(x.used == null ? '' : x.used) === '') { out.push([n + ': beg diguna di petak ' + l, 'Bags used on lot ' + l]); return; }
      if ((x.v === 'N' || rbOff(m.need[l], num(x.used))) && !x.why) out.push([n + ': petak ' + l + ' · pilih sebab', 'Lot ' + l + ': pick why']);
    });
    var mt = j.people.reduce(function (a, w) { return a + num(pbags(j)[w]); }, 0);
    if (!out.length && j.people.every(function (w) { return num(pbags(j)[w]) > 0; }) && mt !== m.used) out.push([n + ': beg orang (' + mt + ') tidak sama dengan beg petak (' + m.used + ')', 'The men\'s bags do not match the lots\' bags']);
    if (m.used > m.bawa) out.push([n + ': guna (' + m.used + ') lebih dari bawa (' + m.bawa + ') · semak', 'More used than taken']);
    var pv = rbMp(j);
    if (!out.length && m.bawa - m.used > 0 && (!pv.v || (pv.v === 'N' && !pv.why))) out.push([n + ': ' + (m.bawa - m.used) + ' beg pulang ke stor?', 'Bags back to the store?']);
    return out;
  }
  function rbManBody(j) {
    rbManSync(j);
    var m = rbManInfo(j), ml = rbMl(j), pv = rbMp(j), pul = m.bawa - m.used, allA = progLots(j).every(function (l) { return (ml[l] || {}).v; });
    var h = '<div class="man-prog' + (m.approved ? ' ok' : '') + '"><b>🔒 ' + esc(m.fert) + ' · ' + m.dose + EA.t(' kg sepokok', ' kg per palm') + ' · ' + EA.t('bawa ', 'taken ') + m.bawa + EA.t(' beg', ' bags') + '</b><span>' +
      (m.approved ? EA.t('Dos diluluskan Pemilik.', 'Dose approved by the Owner.') : EA.t('Ikut program. Berubah hanya dengan kelulusan Pemilik.', 'From the programme. Changes only with the Owner\'s approval.')) + '</span></div>';
    h += '<p class="rb-prog"><b>' + EA.t('① Petak habis dibaja?', '① Is the lot manured out?') + '</b> ' + EA.t('HABIS: beg diisi ikut keperluan, ubah jika lain. Lari lebih 10%: app tanya kenapa.', 'DONE fills the bags the lot needed; change it if different. Off by more than 10%: the app asks why.') + '</p>';
    h += progLots(j).map(function (l) {
      var x = ml[l] || {}, lo = EA.lists.lot(ctx.estate, l), off = x.v === 'Y' && String(x.used == null ? '' : x.used) !== '' ? rbOff(m.need[l], num(x.used)) : '';
      var list = x.v === 'N' ? RB_MWHY_N : off === 'kurang' ? RB_MWHY_K : off === 'lebih' ? RB_MWHY_L : null;
      return '<div class="rb-lst"><div class="rb-top"><span><b>' + esc(l) + '</b> · ' + EA.t('perlu ', 'needs ') + m.need[l] + EA.t(' beg', ' bags') + '<small>' + (lo && lo.palms ? lo.palms + EA.t(' pokok × ', ' palms × ') + m.dose + ' kg' : '') + '</small></span><span class="seg">' +
        '<button type="button" data-ml="' + j.key + '|' + esc(l) + '|Y" aria-pressed="' + (x.v === 'Y') + '">' + EA.t('HABIS', 'DONE') + '</button><button type="button" data-ml="' + j.key + '|' + esc(l) + '|N" aria-pressed="' + (x.v === 'N') + '">' + EA.t('BELUM', 'NOT YET') + '</button></span></div>' +
        (x.v ? '<div class="rb-used">' + EA.t('Beg diguna ', 'Bags used ') + '<input inputmode="numeric" data-mused="' + j.key + '|' + esc(l) + '" value="' + esc(x.used == null ? '' : x.used) + '">' +
          (x.v === 'N' ? '<span class="rb-chip w">' + EA.t('baki ', 'left ') + Math.max(0, m.need[l] - num(x.used)) + EA.t(' beg · sambung esok', ' bags · tomorrow') + '</span>' : off ? '<span class="rb-chip w">' + (off === 'kurang' ? EA.t('dos kurang?', 'dose short?') : EA.t('dos lebih?', 'dose over?')) + '</span>' : String(x.used) !== '' ? '<span class="rb-chip">✓ ' + EA.t('dos betul', 'dose right') + '</span>' : '') + '</div>' : '') +
        (list ? '<div class="rb-why">' + list.map(function (y) { return '<button type="button" data-mwhy="' + j.key + '|' + esc(l) + '|' + y[0] + '" aria-pressed="' + (x.why === y[0]) + '">' + esc(EA.t(y[1], y[2])) + '</button>'; }).join('') + '</div>' : '') + '</div>';
    }).join('');
    var mt = j.people.reduce(function (a, w) { return a + num(pbags(j)[w]); }, 0);
    h += '<div class="rb-figs"><span><b>' + m.bawa + '</b>' + EA.t('bawa', 'taken') + '</span><span><b>' + m.used + '</b>' + EA.t('guna', 'used') + '</span><span class="' + (pul < 0 ? 'r' : '') + '"><b>' + pul + '</b>' + EA.t('pulang', 'back') + '</span></div>';
    if (pul < 0) h += '<p class="man-line r">' + EA.t('Guna lebih dari bawa. Semak.', 'More used than taken. Check.') + '</p>';
    if (allA && pul > 0) h += '<div class="rb-lst"><div class="rb-top"><b>' + pul + EA.t(' beg pulang ke stor?', ' bags back to the store?') + '</b><span class="seg"><button type="button" data-mpul="' + j.key + '|Y" aria-pressed="' + (pv.v === 'Y') + '">' + EA.t('YA', 'YES') + '</button><button type="button" data-mpul="' + j.key + '|N" aria-pressed="' + (pv.v === 'N') + '">' + EA.t('TIDAK', 'NO') + '</button></span></div>' +
      (pv.v === 'N' ? '<div class="rb-why">' + RB_PWHY.map(function (y) { return '<button type="button" data-mpulw="' + j.key + '|' + y[0] + '" aria-pressed="' + (pv.why === y[0]) + '">' + esc(EA.t(y[1], y[2])) + '</button>'; }).join('') + '</div>' : '') + '</div>';
    // ② the men
    var open = rbMan[j.key];
    if (open === undefined || j.people.indexOf(open) < 0) open = rbMan[j.key] = j.people.find(function (w) { return !(num(pbags(j)[w]) > 0); }) || '';
    h += '<p class="rb-prog" style="margin-top:12px"><b>' + EA.t('② Beg setiap orang', '② Bags of each man') + '</b> · ' + j.people.filter(function (w) { return num(pbags(j)[w]) > 0; }).length + EA.t(' daripada ', ' of ') + j.people.length + EA.t(' orang diisi · ', ' keyed · ') + mt + EA.t(' beg', ' bags') + '</p>' +
      (m.used ? '<button type="button" class="rb-even" data-meven="' + j.key + '">' + EA.t('BAHAGI SAMA · ', 'SPLIT EVENLY · ') + m.used + EA.t(' beg ÷ ', ' bags ÷ ') + j.people.length + EA.t(' orang', ' men') + '</button>' : '<p class="hint">' + EA.t('Jawab petak dahulu, kemudian BAHAGI SAMA atau isi seorang-seorang.', 'Answer the lots first, then SPLIT EVENLY or key each man.') + '</p>');
    h += j.people.map(function (w) {
      var v = pbags(j)[w] || '';
      if (w !== open) return '<button type="button" class="rb-row" data-rbman="' + esc(j.key) + '|' + esc(w) + '"><b>' + esc(person(w)) + '</b>' + (num(v) > 0 ? '<span><b>' + esc(v) + '</b> ' + EA.t('beg', 'bags') + ' <i class="rb-ok">✓</i></span>' : '<span class="rb-chip w">' + EA.t('BELUM DIISI ›', 'NOT KEYED ›') + '</span>') + '</button>';
      return '<div class="rb-open" data-rbopen="' + esc(j.key) + '"><b class="rb-name">' + esc(person(w)) + '</b><div class="rb-box"><input inputmode="numeric" data-mbag="' + esc(j.key) + '|' + esc(w) + '" data-rbin="' + esc(j.key) + '" data-w="' + esc(w) + '" value="' + esc(v) + '"> ' + EA.t('beg', 'bags') +
        '<button type="button" class="rb-next" data-mnext="' + esc(j.key) + '|' + esc(w) + '">' + EA.t('SETERUSNYA ›', 'NEXT ›') + '</button></div>' +
        ('<div class="rb-b2"><button type="button" data-awayw="' + esc(w) + '" data-awayj="' + esc(j.key) + '">' + EA.t('TIDAK HADIR / TIADA KERJA', 'ABSENT / NO WORK') + '</button></div>') + '</div>';
    }).join('');
    return h;
  }
  function rbManNext(j, w) {
    var i = j.people.indexOf(w), nxt = '';
    for (var n = 1; n <= j.people.length; n++) { var c = j.people[(i + n) % j.people.length]; if (c !== w && !(num(pbags(j)[c]) > 0)) { nxt = c; break; } }
    rbMan[j.key] = nxt; rbFocus = nxt ? j.key + '|' + nxt : '';
  }
  function rbManWire(jobs) {
    el.querySelectorAll('[data-rbtukar]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.rbtukar.split('|'), l = (draft.lines[x[1]] || [])[Number(x[2])] || {}; rbGrid[b.dataset.rbtukar] = l.lot || ''; delete rbShare[b.dataset.rbtukar]; render(el, ctx); };
    });
    el.querySelectorAll('[data-rbshare]').forEach(function (b) { b.onclick = function () { rbShare[b.dataset.rbshare] = 1; render(el, ctx); }; });
    el.querySelectorAll('[data-rbclear]').forEach(function (b) {
      b.onclick = function () {
        var x = b.dataset.rbclear.split('|'), ls = draft.lines[x[1]] || [];
        if (!ls.length) return;
        ls.splice(1); ls[0].lot = ''; ls[0].bunches = ''; ls[0].qty = ''; ls[0].bags = '';
        Object.keys(rbGrid).forEach(function (k) { if (k.indexOf(x[0] + '|' + x[1] + '|') === 0) delete rbGrid[k]; });
        rbFocus = ''; keepDraft(); render(el, ctx);
      };
    });
    var byKey = {}; jobs.forEach(function (j) { byKey[j.key] = j; });
    el.querySelectorAll('[data-ml]').forEach(function (b) {
      b.onclick = function () {
        var x = b.dataset.ml.split('|'), j = byKey[x[0]], ml = rbMl(j), m = rbManInfo(j);
        ml[x[1]] = { v: x[2], used: x[2] === 'Y' ? String(m.need[x[1]]) : '', why: '' };
        rbManSync(j); keepDraft(); rbRedraw();
      };
    });
    el.querySelectorAll('[data-mused]').forEach(function (inp) {
      inp.oninput = function () { var x = inp.dataset.mused.split('|'), j = byKey[x[0]]; rbMl(j)[x[1]].used = inp.value.replace(/\D/g, ''); rbManSync(j); keepDraft(); };
      inp.onchange = function () { rbRedraw(); };
    });
    el.querySelectorAll('[data-mwhy]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.mwhy.split('|'), j = byKey[x[0]]; rbMl(j)[x[1]].why = x[2]; rbManSync(j); keepDraft(); rbRedraw(); };
    });
    el.querySelectorAll('[data-mpul]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.mpul.split('|'), j = byKey[x[0]]; var pv = rbMp(j); pv.v = x[1]; pv.why = ''; keepDraft(); rbRedraw(); };
    });
    el.querySelectorAll('[data-mpulw]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.mpulw.split('|'), j = byKey[x[0]]; rbMp(j).why = x[1]; keepDraft(); rbRedraw(); };
    });
    el.querySelectorAll('[data-meven]').forEach(function (b) {
      b.onclick = function () {
        var j = byKey[b.dataset.meven], m = rbManInfo(j), n = j.people.length, per = Math.floor(m.used / n), rem = m.used - per * n;
        j.people.forEach(function (w, i) { pbags(j)[w] = String(per + (i < rem ? 1 : 0)); });
        rbMan[j.key] = ''; keepDraft(); rbRedraw();
        ui().toast(rem ? EA.t('Dibahagi: ', 'Split: ') + j.people.map(function (w) { return pbags(j)[w]; }).join(' + ') + EA.t(' beg. Ubah jika lain.', ' bags. Change if different.') : EA.t('Dibahagi sama: ' + per + ' beg seorang. Ubah jika lain.', 'Split evenly: ' + per + ' bags each. Change if different.'));
      };
    });
    el.querySelectorAll('[data-mbag]').forEach(function (inp) {
      inp.oninput = function () { var x = inp.dataset.mbag.split('|'), j = byKey[x[0]]; pbags(j)[x[1]] = inp.value.replace(/\D/g, ''); keepDraft(); refresh(jobs); };
      inp.onkeydown = function (e) { if (e.key !== 'Enter') return; e.preventDefault(); var x = inp.dataset.mbag.split('|'); rbManNext(byKey[x[0]], x[1]); rbRedraw(); };
    });
    el.querySelectorAll('[data-mnext]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.mnext.split('|'); rbManNext(byKey[x[0]], x[1]); rbRedraw(); };
    });
  }
  // FH_MATERIAL on SIMPAN: one "guna" row a lot, and one "pulang" row. A correction replaces the rows it saved before.
  function rbManSave(jobs, rec, old) {
    if (!rbOn()) return {};
    var out = {}, oldIds = (old && old.mids) || {};
    jobs.forEach(function (j) {
      if (rbType(j) !== 'man') return;
      var m = rbManInfo(j), ml = rbMl(j), pv = rbMp(j), o = oldIds[j.key] || {}, ids = out[j.key] = {};
      progLots(j).forEach(function (l) {
        var x = ml[l] || {}, off = x.v === 'Y' ? rbOff(m.need[l], num(x.used)) : '';
        var why = x.why ? rbWhyName(x.v === 'N' ? RB_MWHY_N : off === 'kurang' ? RB_MWHY_K : RB_MWHY_L, x.why) : '';
        ids[l] = EA.save('FH_MATERIAL', ROOM, ctx.estate, { date: rec.date, chit: rec.chit, kind: 'guna', task_code: 'MAN', block: j.block, lot: l, material: m.fert, dose: m.dose, bag_kg: m.kg,
          bags: num(x.used), done: x.v || '', reason: (off ? 'dos ' + off + ': ' : '') + why, note: 'perlu ' + m.need[l] + ' beg' }, o[l] || '').id;
      });
      var pul = Math.max(0, m.bawa - m.used);
      ids._pulang = EA.save('FH_MATERIAL', ROOM, ctx.estate, { date: rec.date, chit: rec.chit, kind: 'pulang', task_code: 'MAN', block: j.block, lot: '', material: m.fert, dose: m.dose, bag_kg: m.kg,
        bags: pv.v === 'N' ? 0 : pul, done: '', reason: pv.v === 'N' ? rbWhyName(RB_PWHY, pv.why) : '', note: 'bawa ' + m.bawa + ' · guna ' + m.used }, o._pulang || '').id;
    });
    return out;
  }
  function rbHl(j) { draft.hlot = draft.hlot || {}; return (draft.hlot[j.key] = draft.hlot[j.key] || {}); }
  var RB_WHY = [['besar', 'Petak besar', 'Big lot'], ['hujan', 'Hujan', 'Rain'], ['orang', 'Kurang orang', 'Short of men'], ['lain', 'Lain-lain', 'Other']];
  function rbLotsOf(j) {
    var used = [];
    j.people.forEach(function (w) { (draft.lines[w] || []).forEach(function (l) {
      var lot = l.lot || (j.lots.length === 1 ? j.lots[0] : '');
      if (lot && num(l.bunches) > 0 && used.indexOf(lot) < 0) used.push(lot);
    }); });
    return j.lots.filter(function (x) { return used.indexOf(x) >= 0; });
  }
  // The answers per lot become the job's SIAP / BELUM SIAP and its reason (the same fields the old screen fills).
  function rbSync(j) {
    if (!rbHarvest(j)) return;
    var lots = rbLotsOf(j), hl = rbHl(j);
    if (!Object.keys(hl).length) return;          // nothing answered here yet: an answer from the old screen stays as it is
    var st = draft.status[j.key] = draft.status[j.key] || { done: '', reason: '' };
    if (!lots.length || lots.some(function (l) { return !hl[l] || !hl[l].v || (hl[l].v === 'N' && !hl[l].why); })) { st.done = ''; st.reason = ''; return; }
    var not = lots.filter(function (l) { return hl[l].v === 'N'; });
    if (!not.length) { st.done = 'Y'; st.reason = ''; return; }
    st.done = 'N';
    st.reason = not.map(function (l) {
      var w = hl[l], why = (RB_WHY.find(function (x) { return x[0] === w.why; }) || ['', ''])[1];
      return 'Petak ' + l + ' belum habis' + (why ? ': ' + why.toLowerCase() : '') + (w.note ? ' (' + w.note + ')' : '') + ', sambung esok';
    }).join('; ');
  }
  // ---------- v1.96 Jubin (Yu Chen, 24 Nov 2026, sample "E-Book Kutip Pilihan Susun Atur": "a") ----------
  // The lot questions of Menuai and of Traktor & pemuat as tiles: one SEMUA HABIS button, then only the lot that is not
  // done is tapped, and its answer and reason are picked on the shared sheet. Nothing starts answered. Same draft
  // fields as 1.95 (hlot, clot), so the checks, SIMPAN and the records do not change.
  function rbTileLabel(c, col) {
    var W = col ? RB_CWHY : RB_WHY, w = W.find(function (x) { return x[0] === c.why; });
    var why = w ? (c.why === 'lain' && c.note ? c.note : EA.t(w[1], w[2])).toLowerCase() : EA.t('sebab?', 'why?');
    return c.v === 'Y' ? EA.t('HABIS ✓', 'DONE ✓') : c.v === 'N' ? EA.t('BELUM', 'NOT YET') + ' · ' + why : c.v === 'X' ? EA.t('TIDAK PERGI', 'NOT GONE TO') + ' · ' + why : EA.t('belum dijawab', 'not answered');
  }
  function rbTiles(kind, j, lots, st, sub) {
    var any = lots.some(function (l) { return (st[l] || {}).v; });
    return '<button type="button" class="rb-all' + (any ? ' ghost' : '') + '" data-rball="' + kind + '|' + j.key + '">' + EA.t('SEMUA HABIS', 'ALL DONE') + ' · ' + lots.length + EA.t(' petak', ' lots') + '</button>' +
      '<div class="rb-tiles">' + lots.map(function (l) {
        var c = st[l] || {};
        return '<button type="button" class="rb-tile' + (c.v ? ' ' + (c.v === 'Y' ? 'y' : 'n') : '') + '" data-rbtile="' + kind + '|' + j.key + '|' + esc(l) + '"><b>' + esc(l) + '</b><span class="rb-s">' + sub(l) + '</span><i>' + esc(rbTileLabel(c, kind === 'c')) + '</i></button>';
      }).join('') + '</div>';
  }
  function rbLotSheet(kind, j, l) {
    var col = kind === 'c', st = col ? rbCl(j) : rbHl(j), c = st[l] = st[l] || {}, W = col ? RB_CWHY : RB_WHY;
    function keep() { if (col) { rbColLines(j); rbColSync(j); } else rbSync(j); keepDraft(); rbRedraw(); }
    var opts = [['Y', 'HABIS', 'DONE'], ['N', 'BELUM', 'NOT YET']].concat(col ? [['X', 'TIDAK PERGI', 'NOT GONE TO']] : []);
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Petak ', 'Lot ') + esc(l) + '</h2><p class="hint">' + (col ? rbLotBunches(l) + EA.t(' tandan di blok sebelum kutip', ' bunches in the block before collection') : EA.t('Petak habis dituai?', 'Is the lot harvested out?')) + '</p>' +
      '<div class="rb-sopts">' + opts.map(function (o) { return '<button type="button" data-sv="' + o[0] + '" aria-pressed="' + (c.v === o[0]) + '">' + EA.t(o[1], o[2]) + '</button>'; }).join('') + '</div>' +
      (c.v === 'N' || c.v === 'X' ? '<p class="hint"><b>' + EA.t('Sebab?', 'Why?') + '</b></p><div class="rb-why">' + W.map(function (x) { return '<button type="button" data-sw="' + x[0] + '" aria-pressed="' + (c.why === x[0]) + '">' + esc(EA.t(x[1], x[2])) + '</button>'; }).join('') + '</div>' +
        (c.why === 'lain' ? '<input class="text-input" id="ls-note" value="' + esc(c.note || '') + '" placeholder="' + EA.t('tulis sebab', 'write why') + '"><div class="actions"><button type="button" class="btn btn-ok" id="ls-ok">OK<small>Siap</small></button></div>' : '') : ''),
      function (s) {
        s.querySelectorAll('[data-sv]').forEach(function (b) { b.onclick = function () {
          c.v = b.dataset.sv; delete c.why; delete c.note; keep();
          if (c.v === 'Y') ui().closeSheet(); else rbLotSheet(kind, j, l);
        }; });
        s.querySelectorAll('[data-sw]').forEach(function (b) { b.onclick = function () {
          c.why = b.dataset.sw; if (c.why !== 'lain') delete c.note; keep();
          if (c.why === 'lain') { rbLotSheet(kind, j, l); var n = document.getElementById('ls-note'); if (n) n.focus(); } else ui().closeSheet();
        }; });
        var note = s.querySelector('#ls-note'), okb = s.querySelector('#ls-ok');
        if (note) note.oninput = function () { c.note = note.value; if (col) rbColSync(j); else rbSync(j); keepDraft(); };
        if (okb) okb.onclick = function () { if (String(c.note || '').trim().length < 3) { note.focus(); return; } ui().closeSheet(); rbRedraw(); };
      });
  }
  function rbTileWire(byKey) {
    el.querySelectorAll('[data-rball]').forEach(function (b) {
      b.onclick = function () {
        var x = b.dataset.rball.split('|'), j = byKey[x[1]], col = x[0] === 'c', st = col ? rbCl(j) : rbHl(j);
        (col ? j.lots : rbLotsOf(j)).forEach(function (l) { st[l] = { v: 'Y' }; });
        if (col) { rbColLines(j); rbColSync(j); } else rbSync(j);
        keepDraft(); rbRedraw();
      };
    });
    el.querySelectorAll('[data-rbtile]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.rbtile.split('|'); rbLotSheet(x[0], byKey[x[1]], x[2]); };
    });
  }
  // v1.95 (Yu Chen, 24 Nov 2026): asked once, at the end, after every harvester is keyed.
  function rbLotsKey(j) { return (rbAllKeyed(j) ? '1:' : '0:') + rbLotsOf(j).join(' '); }
  function rbLotsHtml(j) {
    rbSync(j);
    var lots = rbLotsOf(j), hl = rbHl(j), key = esc(rbLotsKey(j));
    if (!rbAllKeyed(j)) return '<div class="rb-lots-q" data-rblots="' + j.key + '" data-rbl="' + key + '"><p class="rb-wait"><b>' + EA.t('Petak habis dituai?', 'Is the lot harvested out?') + '</b> ' +
      EA.t('keluar di sini selepas semua penuai diisi', 'comes here once every harvester is keyed') + ' (' + j.people.filter(function (w) { return rbManDone(j, w); }).length + '/' + j.people.length + ').</p></div>';
    if (!lots.length) return '<div class="rb-lots-q" data-rblots="' + j.key + '" data-rbl="' + key + '"></div>';
    return '<div class="rb-lots-q" data-rblots="' + j.key + '" data-rbl="' + key + '"><p class="hint rb-lead"><b>' + EA.t('Petak habis dituai?', 'Is the lot harvested out?') + '</b> ' +
      EA.t('Tekan SEMUA HABIS, kemudian tekan hanya petak yang belum. Petak belum habis masuk chit esok.', 'Tap ALL DONE, then tap only a lot that is not. A lot not finished goes on tomorrow\'s chit.') + '</p>' +
      rbTiles('h', j, lots, hl, function (l) {
        var lo = EA.lists.lot(ctx.estate, l);
        var men = j.people.filter(function (p) { return (draft.lines[p] || []).some(function (x) { return (x.lot || (j.lots.length === 1 ? j.lots[0] : '')) === l && num(x.bunches) > 0; }); }).length;
        var bun = j.people.reduce(function (a, p) { return a + (draft.lines[p] || []).reduce(function (b, x) { return b + ((x.lot || (j.lots.length === 1 ? j.lots[0] : '')) === l ? num(x.bunches) : 0); }, 0); }, 0);
        return (lo && lo.palms ? lo.palms + ' pk · ' : '') + men + ' org · ' + bun + EA.t(' tandan', ' bunches');
      }) + '</div>';
  }
  // The next man of the job who is not keyed yet; he starts on the lot of the man just keyed (one tap to change).
  function rbNextMan(j, w) {
    var i = j.people.indexOf(w), nxt = '';
    for (var n = 1; n <= j.people.length; n++) { var c = j.people[(i + n) % j.people.length]; if (c !== w && !rbManDone(j, c)) { nxt = c; break; } }
    var mine = (draft.lines[w] || []).filter(function (l) { return l.lot; }), last = mine.length ? mine[mine.length - 1].lot : '';
    if (nxt && last && j.lots.length > 1) {
      var l0 = (draft.lines[nxt] || [])[0];
      if (l0 && !l0.lot) {
        // v1.101: sharing a lot is seldom, so the next man gets the next lot nobody has yet (chit order), else the same lot
        var cnt = rbLotCount(j, nxt, 0), at = j.lots.indexOf(last), ring = j.lots.slice(at + 1).concat(j.lots.slice(0, at + 1));
        l0.lot = ring.find(function (n) { return !cnt[n]; }) || last; keepDraft();
      }
    }
    rbMan[j.key] = nxt; rbFocus = nxt ? j.key + '|' + nxt : '';
  }
  // ---------- v1.95 Tuai & kutip (Brief_Tuai_Kutip_Rupa_Baru, signed by Yu Chen 24 Nov 2026) ----------
  // "Havest bunches and evacuate ffb to ramp is separate matter"; "each day need to knw which lot been delivery to
  // ramp which lot no yet". Harvesting is closed by "Petak habis dituai?" (above). The tractor (ITF) and its loader
  // (LFF) are one card, closed together: the lots the driver went to (SEMUA or one by one) and his day, as before; then,
  // once every harvester and driver is keyed, "Buah habis dikutip ke ramp?" for each lot of the job. Only the lots
  // answered HABIS go to the ramp (autoCollect); the others stay in the block and come back on tomorrow's chit. The
  // answers fill both jobs' SIAP / BELUM SIAP and reason, and a lot-by-lot line in the job's progress (3-1 siap,
  // 3-2 belum (traktor rosak), 3-5 tidak pergi (tak sempat)) that the chit's copy, Hari ini and the office read.
  var RB_CWHY = [['rosak', 'Traktor rosak', 'Tractor broke down'], ['hujan', 'Hujan · jalan basah', 'Rain · wet road'], ['sempat', 'Tak sempat', 'No time'], ['lain', 'Lain-lain', 'Other']];
  function rbAllKeyed(j) { return j.people.every(function (w) { return rbManDone(j, w); }); }
  function rbColOf(x) {
    var itf = jobsOf(chit).filter(function (y) { return y.task === 'ITF'; });
    return itf.find(function (y) { return y.block === x.block; }) || itf[0] || null;
  }
  function rbColPartners(j) { return jobsOf(chit).filter(function (x) { return x.task === 'LFF' && (rbColOf(x) || {}).key === j.key; }); }
  function rbCl(j) { draft.clot = draft.clot || {}; return (draft.clot[j.key] = draft.clot[j.key] || {}); }
  function rbWent(j) {
    var on = [];
    j.people.forEach(function (w) { (draft.lines[w] || []).forEach(function (l) { String(l.lot || '').split(' ').filter(Boolean).forEach(function (n) { if (on.indexOf(n) < 0) on.push(n); }); }); });
    return j.lots.filter(function (n) { return on.indexOf(n) >= 0; });
  }
  function rbColReady(j) {
    return rbAllKeyed(j) && jobsOf(chit).every(function (x) { return kind(x.task, x.block) !== 'bunches' || rbAllKeyed(x); });
  }
  function rbCwhy(c) { var x = RB_CWHY.find(function (y) { return y[0] === c.why; }); return x ? (c.why === 'lain' && c.note ? c.note : x[1]).toLowerCase() : ''; }
  // v1.96: each lot's answer is HABIS (Y), BELUM (N) or TIDAK PERGI (X), on its tile; the driver's lots follow it.
  function rbColNorm(j) {
    var cl = rbCl(j), went = rbWent(j);
    j.lots.forEach(function (l) { if (went.indexOf(l) < 0 && !(cl[l] || {}).v) cl[l] = Object.assign(cl[l] || {}, { v: 'X' }); });
  }
  function rbColLines(j) {
    var cl = rbCl(j), go = j.lots.filter(function (l) { return (cl[l] || {}).v !== 'X'; }).join(' ');
    j.people.forEach(function (w) { (draft.lines[w] || []).forEach(function (l) { l.lot = go; }); });
  }
  function rbColLotOk(j, l) {
    var c = rbCl(j)[l] || {}, why = !!c.why && (c.why !== 'lain' || String(c.note || '').trim().length > 2);
    return c.v === 'Y' || ((c.v === 'N' || c.v === 'X') && why);
  }
  function rbColAnswered(j) { return j.lots.length > 0 && j.lots.every(function (l) { return rbColLotOk(j, l); }); }
  function rbColState(j, l) { var c = rbCl(j)[l] || {}; return c.v === 'X' ? 'x' : c.v === 'Y' ? 'Y' : 'N'; }
  function rbColSync(j) {
    if (!rbOn() || !chit) return;
    if (j.task === 'LFF') { var cj = rbColOf(j); if (cj) rbColSync(cj); return; }
    if (j.task !== 'ITF') return;
    var cl = rbCl(j), all = [j].concat(rbColPartners(j)), st = { done: '', reason: '' };
    if (!Object.keys(cl).length && !(draft.status[j.key] || {}).rbc) return;      // nothing answered here yet
    if (rbColAnswered(j)) {
      var not = j.lots.filter(function (l) { return rbColState(j, l) !== 'Y'; });
      st.done = not.length ? 'N' : 'Y';
      st.reason = not.map(function (l) { return 'Petak ' + l + (rbColState(j, l) === 'x' ? ' tidak dipergi' : ' belum ke ramp') + ': ' + rbCwhy(cl[l] || {}) + ', kutip esok'; }).join('; ');
    }
    st.rbc = 1;
    all.forEach(function (x) { draft.status[x.key] = { done: st.done, reason: st.reason, rbc: 1 }; });
  }
  function rbColProg(j) {
    if (j.task === 'LFF') { var cj = rbColOf(j); return cj ? rbColProg(cj) : ''; }
    if (!rbColAnswered(j)) return '';
    return j.lots.map(function (l) { var s = rbColState(j, l); return l + (s === 'Y' ? ' siap' : (s === 'x' ? ' tidak pergi (' : ' belum (') + rbCwhy(rbCl(j)[l] || {}) + ')'); }).join(', ');
  }
  function rbHarvProg(j) {
    if (!rbHarvest(j)) return '';
    var lots = rbLotsOf(j), hl = rbHl(j);
    if (!lots.length || lots.some(function (l) { return !hl[l] || !hl[l].v || (hl[l].v === 'N' && !hl[l].why); })) return '';
    return lots.map(function (l) {
      var w = hl[l], why = (RB_WHY.find(function (x) { return x[0] === w.why; }) || ['', ''])[1];
      return l + (w.v === 'Y' ? ' siap' : ' belum (' + (w.why === 'lain' && w.note ? w.note : why).toLowerCase() + ')');
    }).join(', ');
  }
  // The job line's lot-by-lot progress in the new look (Ha jobs keep their own, progText).
  function rbProg(j) {
    if (!rbOn()) return '';
    if (j.task === 'ITF' || (j.task === 'LFF' && rbColOf(j))) return rbColProg(j);
    return rbHarvProg(j);
  }
  function rbColProblems(j) {
    if (!rbAllKeyed(j) || rbColAnswered(j)) return [];
    return [[EA.t('Traktor & pemuat', 'Tractor & loader') + (j.block ? ' Blk ' + j.block : '') + ': jawab "Buah habis dikutip ke ramp?" bagi setiap petak', 'Answer "All fruit to the ramp?" for each lot']];
  }
  // Bunches on the lot before the tractor: today's harvest (this draft) and fruit still in the block from before.
  function rbLotBunches(l) {
    var n = 0, fl = draft.replacing || !EA.fh.harvest ? {} : EA.fh.harvest.fieldLeft(ctx.estate);
    jobsOf(chit).forEach(function (x) {
      if (kind(x.task, x.block) !== 'bunches') return;
      x.people.forEach(function (w) { (draft.lines[w] || []).forEach(function (y) { if ((y.lot || (x.lots.length === 1 ? x.lots[0] : '')) === l) n += num(y.bunches); }); });
    });
    return n + (fl[l] || 0);
  }
  function rbTodayLot(l) { return jobsOf(chit).some(function (x) { return kind(x.task, x.block) === 'bunches' && x.lots.indexOf(l) >= 0; }); }
  function rbColBody(j) {
    var parts = rbColPartners(j);
    var h = j.people.map(function (w) {
      return (draft.lines[w] || []).map(function (l, i) {
        return '<div class="rb-row"><b>' + esc(person(w)) + '</b><span class="seg"><button type="button" data-w="' + esc(w) + '" data-i="' + i + '" data-day="1" aria-pressed="' + (l.qty === '1') + '">1</button>' +
          '<button type="button" data-w="' + esc(w) + '" data-i="' + i + '" data-day="0.5" aria-pressed="' + (l.qty === '0.5') + '">½</button></span></div>';
      }).join('');
    }).join('');
    h += parts.map(function (p) { return p.people.map(function (w) { return '<div class="rb-row"><b>' + esc(person(w)) + '</b><span class="rb-chip">' + EA.t('PEMUAT · IKUT TIKET', 'LOADER · BY TICKET') + '</span></div>'; }).join(''); }).join('');
    return h + rbColLotsHtml(j);
  }
  function rbColLotsHtml(j) {
    rbColNorm(j); rbColSync(j);
    if (!rbColReady(j)) return '<div class="rb-lots-q" data-rbcol="' + j.key + '"><p class="rb-wait"><b>' + EA.t('Buah habis dikutip ke ramp?', 'All fruit taken to the ramp?') + '</b> ' +
      EA.t('keluar di sini selepas semua penuai dan pemandu diisi.', 'comes here once every harvester and driver is keyed.') + '</p></div>';
    return '<div class="rb-lots-q" data-rbcol="' + j.key + '"><p class="hint rb-lead"><b>' + EA.t('Buah habis dikutip ke ramp?', 'All fruit taken to the ramp?') + '</b> ' +
      EA.t('Tekan SEMUA HABIS, kemudian tekan hanya petak yang belum atau tidak dipergi. Jawapan ini menutup traktor dan pemuat.', 'Tap ALL DONE, then tap only a lot not done or not gone to. This answer closes the tractor and the loader.') + '</p>' +
      rbTiles('c', j, j.lots, rbCl(j), function (l) { return rbLotBunches(l) + EA.t(' tandan · ', ' bunches · ') + (rbTodayLot(l) ? EA.t('hari ini', 'today') : EA.t('buah lama', 'older fruit')); }) + '</div>';
  }
  function rbRedraw() { render(el, ctx); }
  function rbWire(jobs) {
    rbManWire(jobs);
    var byKey = {}; jobs.forEach(function (j) { byKey[j.key] = j; });
    rbTileWire(byKey);
    el.querySelectorAll('[data-rbj]').forEach(function (b) {
      b.onclick = function () { EA.local.set(rbKey(), b.dataset.rbj); render(el, ctx); window.scrollTo(0, 0); };
    });
    var rbd = el.querySelector('#rb-done');
    if (rbd) rbd.onclick = function () {
      var vis = rbVis(jobs), j = vis.find(function (x) { return x.key === rbd.dataset.k; });
      if (!j || !rbFilled(j)) return;
      draft.rbTick = draft.rbTick || {}; draft.rbTick[j.key] = 1; keepDraft();
      var i = vis.indexOf(j), open = function (x) { return !rbTicked(x) && !rbLocked(x); };
      var nx = vis.slice(i + 1).find(open) || vis.find(open);
      EA.local.set(rbKey(), nx ? nx.key : ''); render(el, ctx); window.scrollTo(0, 0);
    };
    el.querySelectorAll('[data-rbman]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.rbman.split('|'); rbMan[x[0]] = x[1]; rbFocus = x[0] + '|' + x[1]; rbRedraw(); };
    });
    el.querySelectorAll('[data-rbnext]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.rbnext.split('|'); rbNextMan(byKey[x[0]], x[1]); rbRedraw(); };
    });
    el.querySelectorAll('input[data-rbin]').forEach(function (inp) {
      inp.setAttribute('enterkeyhint', 'next');
      if (inp.dataset.mbag) return;          // Membaja: its own Enter (rbManWire)
      inp.onkeydown = function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var j = byKey[inp.dataset.rbin];
        if (rbType(j) === 'harv') { rbNextMan(j, inp.dataset.w); rbRedraw(); return; }
        var all = [].slice.call(el.querySelectorAll('input[data-rbin="' + j.key + '"]')), n = all.indexOf(inp);
        if (all[n + 1]) all[n + 1].focus(); else inp.blur();
      };
    });
    // a lot picked: the man's box takes the focus, so the number goes straight in
    // 1.103 (Yu Chen 25 Nov: "once we add lot the cursor still at the old column"): the box of the SAME line takes the
    // focus — a second lot's number goes in the second box, not the first.
    // (set in the [data-pick-lot] and [data-add] handlers below, before the screen is drawn again)
    if (rbFocus) {
      var fx = rbFocus.split('|'); rbFocus = '';
      var fi = el.querySelector('input[data-rbin="' + fx[0] + '"][data-w="' + fx[1] + '"]' + (fx[2] != null ? '[data-i="' + fx[2] + '"]' : ''));
      if (fi) { fi.focus(); fi.scrollIntoView({ block: 'center' }); }
    }
    // + PETAK LAIN: the old box lets go, and the new lot's buttons come into view
    if (rbSeeLot) {
      var sw = rbSeeLot; rbSeeLot = '';
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      var last = String((draft.lines[sw] || []).length - 1);
      var nl = el.querySelector('[data-rbopen] [data-pick-lot][data-w="' + sw + '"][data-i="' + last + '"]') || el.querySelector('[data-rbopen] input[data-w="' + sw + '"][data-i="' + last + '"]');
      if (nl) nl.scrollIntoView({ block: 'center' });
    }
  }
  // While keying, the counts and ticks follow without drawing the screen again (so the box keeps its focus).
  function rbRefresh(jobs) {
    jobs.forEach(function (j) {
      var c = el.querySelector('[data-rbjob="' + j.key + '"]'); if (!c) return;
      var chip = c.querySelector('.rb-jh .rb-chip'), d = rbFilled(j);
      if (chip) { chip.className = 'rb-chip' + (d ? '' : ' w'); chip.textContent = d ? EA.t('LENGKAP ✓', 'COMPLETE ✓') : rbLeft(j); }
      var pg = c.querySelector('.rb-prog b');
      if (pg && (rbType(j) === 'harv')) {
        var tot = j.people.reduce(function (a, w) { return a + (draft.lines[w] || []).reduce(function (b, l) { return b + num(rbVal(j, l)); }, 0); }, 0);
        pg.textContent = j.people.filter(function (w) { return rbManDone(j, w); }).length + EA.t(' daripada ', ' of ') + j.people.length + EA.t(' orang diisi · ', ' people keyed · ') + (Math.round(tot * 100) / 100) + ' ' + rbUnit(j);
      }
      var q = c.querySelector('[data-rblots]');
      if (q && rbHarvest(j) && q.dataset.rbl !== rbLotsKey(j)) { var t = document.createElement('div'); t.innerHTML = rbLotsHtml(j); q.parentNode.replaceChild(t.firstChild, q); rbWire(jobs); }
    });
    var lead = el.querySelector('.rb-lead b');
    var vis = rbVis(jobs);
    if (lead && lead.parentNode.parentNode === el.querySelector('#rb-list')) lead.textContent = vis.filter(rbTicked).length + EA.t(' daripada ', ' of ') + vis.length + EA.t(' kerja siap.', ' jobs done.');
    var rbd = el.querySelector('#rb-done');
    if (rbd) { var oj = vis.find(function (x) { return x.key === rbd.dataset.k; }), okj = !!oj && rbFilled(oj); rbd.disabled = !okj;
      var dh = el.querySelector('#rb-done-hint'); if (dh) { dh.hidden = okj; dh.textContent = okj || !oj ? '' : EA.t('Belum lengkap: ', 'Not complete: ') + rbLeft(oj); } }
  }

  function render(container, c) {
    el = container; ctx = c;
    rbRoom(rbOn());
    var testing = !EA.roomLive(ctx.room, ctx.estate);
    var head = '<div class="room-top">' +
      '<button type="button" class="back-btn" id="wk-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<div class="grow"><h1>' + EA.t('Kerja harian', 'Day\'s work') + '</h1><span class="brand-sub">' + esc(ctx.estate) + '</span></div>' +
      (testing ? '<span class="test-badge">' + EA.t('UJIAN', 'TEST') + '</span>' : '') + '</div>' + EA.fh.tabs('work', ctx.user);
    var list = chitsFor(ctx.estate);
    var pick = EA.local.get('fh.workchit', '');
    chit = list.find(function (x) { return x.chit === pick; }) || list[0] || null;

    if (!chit) {
      el.innerHTML = head + '<div class="card"><p><span class="bm">Tiada chit pagi untuk hari ini atau semalam di telefon ini. Simpan chit pagi dahulu.</span>' +
        '<span class="en">No morning chit for today or yesterday on this phone. Save the morning chit first.</span></p>' +
        '<a class="btn btn-main" href="#field-harvest">MORNING CHIT<small>Chit pagi</small></a></div>';
      $('#wk-back').onclick = function () { location.hash = ''; };
      return;
    }
    var done = savedFor(chit.chit);
    draft = loadDraft(chit);
    var chooser = list.length > 1 ? '<div class="field"><label for="wk-chit"><span class="bm">Chit</span><span class="en">Which morning chit</span></label><select id="wk-chit" class="text-input">' +
      list.map(function (x) { return '<option value="' + esc(x.chit) + '"' + (x.chit === chit.chit ? ' selected' : '') + '>' + esc(niceDate(x.date) + ' · Chit ' + x.chit.split('-').pop() + ' · ' + x.confirmedAt + (x.fromPlan && !savedFor(x.chit) ? EA.t(' · HARI DIRANCANG', ' · PLANNED DAY') : past(x) ? EA.t(' · BETULKAN', ' · TO FIX') : '')) + '</option>'; }).join('') + '</select></div>' : '';

    if (done && !draft.replacing) {
      el.innerHTML = head + chooser +
        fixBand() + '<p class="msg ok-msg"><span class="bm">Kerja harian untuk chit ini sudah disimpan.</span><span class="en">The day\'s work for this chit is saved.</span></p>' +
        savedCard(done);
      wireTop();
      return;
    }
    // v1.75: listed but not keyable — the day is closed (and nothing was saved against this chit, e.g. it was
    // closed as "tiada kerja"), so it is shown and not opened. A closed day changes only through the clerk.
    if (!EA.fh.workChitOpen(chit)) {
      el.innerHTML = head + chooser +
        '<div class="card"><p class="warn">' + EA.t('Hari ini sudah ditutup. Untuk mengubahnya, minta kerani tekan MINTA BETULKAN CHIT.',
          'This day is closed. To change it, ask the clerk to tap MINTA BETULKAN CHIT.') + '</p></div>';
      wireTop();
      return;
    }
    if (!canKey(ctx.user)) { el.innerHTML = head + '<div class="card"><p class="hint">' + EA.t('Pandangan pejabat akan datang kemudian.', 'The office view comes later.') + '</p></div>'; wireTop(); return; }

    var jobs = jobsOf(chit);
    var rb = rbOn();
    if (rb) {
      rbDefaults(jobs);
      // v1.92 Rupa Baru: a thin heading, the jobs as one list, the same bands, the same SIMPAN.
      var y0 = window.scrollY;
      rbRoom(true);
      var rbV = rbVis(jobs), rbK = rbOpenJob(rbV), rbAll = rbV.length > 0 && rbV.every(rbTicked), rbLast = !!rbK && rbV.every(function (x) { return x.key === rbK || rbTicked(x); });
      el.innerHTML = '<div class="rb-thin"><button type="button" id="wk-back">‹ ' + (rbK ? EA.t('Senarai kerja', 'Job list') : EA.t('Kerja', 'Work') + ' · ' + esc(niceDate(chit.date))) + '</button><small>' + esc(ctx.estate) + (testing ? ' · ' + EA.t('UJIAN', 'TEST') : '') + '</small></div>' + chooser +
        fixBand() + (EA.fh.dayCloseBand ? EA.fh.dayCloseBand(ctx.estate, ctx.user) : '') +
        (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan kerja harian. Rekod lama kekal; yang baru menggantikannya.</span><span class="en">Correcting the day\'s work. The old record stays; this one replaces it.</span></p>' : '') +
        '<div id="rb-list">' + rbJobs(jobs) + '</div>' +
        (rbK ? '<div class="bottom-bar rb-bb"><p class="hint" id="rb-done-hint" hidden></p><button type="button" class="btn btn-main" id="rb-done" data-k="' + esc(rbK) + '">' + (rbLast ? 'DONE · TO THE LIST ›<small>SIAP · KE SENARAI ›</small>' : 'DONE · NEXT JOB ›<small>SIAP · KERJA SETERUSNYA ›</small>') + '</button></div>'
          : '<details class="card rb-report"><summary>' + EA.t('Laporan petang', 'Evening report') + '</summary><pre class="chit" id="wk-preview"></pre></details>' +
            '<div class="bottom-bar rb-bb">' + (rbAll ? '' : '<p class="hint">' + EA.t('Dibuka bila semua kerja bertanda SIAP. Apa yang diisi sudah disimpan di telefon.', 'Opens when every job is ticked DONE. What you keyed is already kept on this phone.') + '</p>') +
            '<button type="button" class="btn btn-main" id="wk-check"' + (rbAll ? '' : ' disabled') + '>SAVE<small>Simpan kerja harian</small></button></div>');
      window.scrollTo(0, y0);
      wireTop();
      if (rbK) $('#wk-back').onclick = function () { EA.local.set(rbKey(), ''); render(el, ctx); window.scrollTo(0, 0); };
      wireJobs(jobs);
      if ($('#wk-check')) $('#wk-check').onclick = function () { check(jobs); };
      refresh(jobs);
      return;
    }
    el.innerHTML = head + chooser +
      '<p class="hint">' + EA.t('Dari chit pagi ', 'From the morning chit of ') + esc(niceDate(chit.date)) + ' · ' + jobs.reduce(function (a, j) { return a + j.people.length; }, 0) + EA.t(' orang bekerja, ', ' people working, ') + jobs.length + EA.t(' kerja.', ' jobs.') + '</p>' +
      fixBand() +
      (EA.fh.dayCloseBand ? EA.fh.dayCloseBand(ctx.estate, ctx.user) : '') +   // v1.43 TUTUP HARI
      (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan kerja harian. Rekod lama kekal; yang baru menggantikannya.</span><span class="en">Correcting the day\'s work. The old record stays; this one replaces it.</span></p>' : '') +
      jobs.map(jobCard).join('') +
      '<section class="card"><h2><span class="inline"><span class="bm">Laporan petang</span> · <span class="en">Evening report</span></span></h2><pre class="chit" id="wk-preview"></pre></section>' +
      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="wk-check">SAVE<small>Simpan kerja harian</small></button></div>';
    wireTop();
    wireJobs(jobs);
    $('#wk-check').onclick = function () { check(jobs); };
    refresh(jobs);
    if (EA.fh.refreshDayClose && navigator.onLine) EA.fh.refreshDayClose(ctx.estate).then(function (j) { if (j && el && location.hash.indexOf('/work') > 0) { var b = el.querySelector('#wk-dayclose'); var nb = EA.fh.dayCloseBand(ctx.estate, ctx.user); if (b && !nb) b.remove(); } });
  }

  function fixBand() {
    if (chit && chit.fromPlan && !savedFor(chit.chit)) return '<p class="plan-band due" id="wk-planband"><b>' + EA.t('KERJA SEBENAR · ', 'ACTUAL WORK · ') + esc(niceDate(chit.date)) + '</b>' +
      '<span>' + EA.t('Hari dirancang, chit sudah disahkan. Kunci kerja sebenar hari itu dari kertas; selepas itu chit hari ini dibuka.', 'A planned day, its chit confirmed. Key that day\'s actual work from the paper; then today\'s chit opens.') + '</span></p>';
    if (!past(chit)) return '';
    // v1.75: the number comes from the one window, not from a 3 typed into the sentence. It said "3 days"
    // for the whole afternoon after the window became 5 — the same fault as a Bahasa line naming an English
    // button: wording that tells the staff something the screen no longer does.
    var n = windowDays();
    return '<p class="warn fix-band" id="wk-fixband"><b>' + EA.t('Betulkan · ', 'Fixing · ') + esc(niceDate(chit.date)) + '</b> <span class="bm">Chit hari itu sudah dibetulkan atas permintaan kerani. Kemas kini kerja supaya sama dengan chit. Boleh dibuat dalam ' + n + ' hari sahaja.</span>' +
      '<span class="en">That day\'s chit was fixed at the clerk\'s request. Bring the work up to date so it matches the chit. Open for ' + n + ' days only.</span></p>';
  }

  function progBlock(j) {
    var p = draft.prog[j.key] || {}, lw = lotWhy(j), min = chit ? chit.date : '';
    var others = EA.lists.lotsFor(ctx.estate, j.block).filter(function (l) { return progLots(j).indexOf(l.lot) < 0; });
    return '<div class="field"><span class="inline"><span class="bm">Petak siap?</span> · <span class="en">Is each lot finished?</span></span>' +
      '<p class="hint">' + EA.t('Kerja dikira ikut petak yang siap. Petak belum siap: pilih sebab dan bila disambung.', 'Work counts by finished lot. A lot not finished: choose why and when it continues.') + '</p>' +
      progLots(j).map(function (lot) {
        var v = String(p[lot] == null ? '' : p[lot]), w = lw[lot] || {};
        var row = '<div class="wline"><b class="mono">' + esc(lot) + '</b><span class="hint">' + lotHa(lot).toFixed(2) + ' Ha</span>' +
          '<div class="seg"><button type="button" data-lj="' + j.key + '" data-ll="' + esc(lot) + '" data-lv="Y" aria-pressed="' + (v === '100') + '" style="min-width:84px">' + EA.t('SIAP', 'DONE') + '</button>' +
          '<button type="button" data-lj="' + j.key + '" data-ll="' + esc(lot) + '" data-lv="N" aria-pressed="' + (v === '0') + '" style="min-width:110px">' + EA.t('BELUM SIAP', 'NOT DONE') + '</button></div></div>';
        var ed = v === '100' && !draft.manual[j.key] ? earlierDays(j.task, lot) : [];
        if (ed.length) {
          var days = ed.map(function (x) { return niceShort(x.s.date); }).filter(function (x, i, a) { return a.indexOf(x) === i; });
          var today = j.people.filter(function (w) { return (who(j)[w] || []).indexOf(lot) >= 0; }).length;
          row += '<p class="hint" data-settle="' + j.key + '|' + esc(lot) + '">' + EA.t('Belum siap sejak ', 'Not finished since ') + esc(days.join(', ')) + ' (' + ed.length + EA.t(' orang-hari). Ha petak dibahagi: ', ' person-days). The lot\'s Ha is shared: ') +
            lotHa(lot).toFixed(2) + ' ÷ ' + (ed.length + today) + EA.t(' orang-hari', ' person-days') + '</p>';
        }
        if (v === '0') row += '<div class="wline lot-why"><div class="seg">' +
          '<button type="button" data-lwhy="' + j.key + '|' + esc(lot) + '|rain" aria-pressed="' + (w.why === 'rain') + '">' + EA.t('Hujan', 'Rain') + '</button>' +
          '<button type="button" data-lwhy="' + j.key + '|' + esc(lot) + '|other" aria-pressed="' + (w.why === 'other') + '">' + EA.t('Sebab lain', 'Other') + '</button></div>' +
          (w.why === 'rain' ? '<div class="seg lot-rain">' + rainKinds(j.task).map(function (r) {
            return '<button type="button" data-lrain="' + j.key + '|' + esc(lot) + '|' + r.code + '" aria-pressed="' + (w.rain === r.code) + '">' + esc(EA.t(r.bm.replace(/^Hujan — /, ''), r.en.replace(/^Rain — /, ''))) + '</button>';
          }).join('') + '</div><div class="seg lot-lost">' + (EA.lists.lostDay || []).map(function (o) {
            return '<button type="button" data-llost="' + j.key + '|' + esc(lot) + '|' + o.v + '" aria-pressed="' + (Number(w.lost) === o.v) + '">' + esc(EA.t(o.bm, o.en)) + '</button>';
          }).join('') + '</div>' : '') +
          '<input class="text-input" data-lwnote="' + j.key + '|' + esc(lot) + '" value="' + esc(w.note || '') + '" placeholder="' + EA.t('sebab (cth hujan 10 pagi)', 'why (e.g. rain at 10am)') + '">' +
          '<label class="inline-label">' + EA.t('Sambung bila ', 'Continue on ') + '<input type="date" class="text-input" data-lwuntil="' + j.key + '|' + esc(lot) + '" min="' + esc(min) + '" value="' + esc(w.until || '') + '"></label></div>';
        return row;
      }).join('') +
      (others.length ? '<div class="wline"><select class="text-input" data-paddlot="' + j.key + '"><option value="">' + EA.t('+ Petak lain', '+ Another lot') + '</option>' +
        others.map(function (l) { return '<option>' + l.lot + '</option>'; }).join('') + '</select></div>' : '') + '</div>';
  }

  function bagBox(j, w) {
    if (!isBagJob(j)) return '';
    return '<div class="wline"><label class="inline-label">' + EA.t('Beg baja ', 'Bags ') + '<input class="qty" inputmode="numeric" data-pbag="' + j.key + '|' + w + '" value="' + esc(pbags(j)[w] || '') + '"></label></div>';
  }
  function jobCard(j) {
    var k = kind(j.task, j.block), sec = EA.lists.sectionOf(j.task), st = draft.status[j.key] || { done: '', reason: '' };
    if (auto(j)) shareOut(j);
    var mach = EA.lists.MACHINE_JOBS.indexOf(j.task) >= 0;
    var spm = EA.lists.splitMach(ctx.estate, j.lots);
    var lotsText = mach ? EA.t('Jentera ', 'Machine ') + spm.mach.map(function (m) { var x = EA.lists.machinesFor(ctx.estate).find(function (y) { return y.id === m; }); return x ? EA.t(x.bm, x.en) : m; }).join(', ') + (spm.lots.length ? ' · ' + EA.t('Petak ', 'Lots ') + spm.lots.join(', ') : '')
      : j.lots.length ? EA.t('Petak ', 'Lot ') + j.lots.join(', ') + (isDurianBlock(j.block) ? EA.t(' · ikut hari', ' · by the day') : ' · ' + jobTotals(j).planHa.toFixed(2) + ' Ha') : '';
    var lines = j.people.map(function (w) {
      var wl = draft.lines[w] || [];
      if (auto(j)) {
        var tot = wl.reduce(function (a, l) { return a + num(l.qty); }, 0), on = who(j)[w] || [];
        return '<div class="wrow"><div class="who-w"><b>' + esc(person(w)) + '</b><span class="en">' + esc(w) + '</span></div>' +
          '<div class="mono" data-share="' + w + '">' + (Math.round(tot * 1000) / 1000) + ' Ha</div>' +
          '<div class="job" style="display:block"><div class="picks wk-lots">' + chosenLots(j).map(function (n) {
            var nd = (draft.prog[j.key] || {})[n] === '0';
            return '<button type="button" class="pick" data-wholot="' + j.key + '|' + w + '|' + esc(n) + '" aria-pressed="' + (on.indexOf(n) >= 0) + '"><b>' + esc(n) + '</b>' + (nd ? '<small>' + EA.t('belum siap', 'not done') + '</small>' : '') + '</button>'; }).join('') + '</div>' +
          bagBox(j, w) + '</div></div>';
      }
      var rows = k === 'ticket' ? '<span class="hint">' + EA.t('Ikut tiket kilang', 'From the mill ticket') + '</span>' :
        wl.map(function (l, i) {
          // v1.34.1 (Yu Chen, 23 Oct): a day-paid job picks several lots, or all (one tractor and loader cover a
          // harvester team's lots in a day); the chosen lots are kept together on one line.
          if (k === 'day' && j.lots.length > 1 && EA.lists.MACHINE_JOBS.indexOf(j.task) < 0) {
            var on = String(l.lot || '').split(' ').filter(Boolean);
            var chips = '<div class="picks wk-lots"><button type="button" class="pick" data-w="' + w + '" data-i="' + i + '" data-alllots="1" aria-pressed="' + (on.length === j.lots.length) + '"><b>' + EA.t('SEMUA', 'ALL') + '</b><small>' + j.lots.length + EA.t(' petak', ' lots') + '</small></button>' +
              j.lots.map(function (n) { return '<button type="button" class="pick" data-w="' + w + '" data-i="' + i + '" data-onelot="' + esc(n) + '" aria-pressed="' + (on.indexOf(n) >= 0) + '"><b>' + esc(n) + '</b></button>'; }).join('') + '</div>';
            return '<div class="wline">' + chips + '</div><div class="wline"><div class="seg"><button type="button" data-w="' + w + '" data-i="' + i + '" data-day="1" aria-pressed="' + (l.qty === '1') + '">1</button><button type="button" data-w="' + w + '" data-i="' + i + '" data-day="0.5" aria-pressed="' + (l.qty === '0.5') + '">½</button></div> hari</div>';
          }
          // v1.88 (Yu Chen, 23 Nov 2026: "Lot that already choose for
          // the task still able to see. If we have big group it take time to see all the task number.").
          // Measured on a 16-man gang over 5 lots: 16 dropdowns, 3,768px of screen, and nothing anywhere
          // showing which lots are already covered. A dropdown hides its options until it is opened, so the
          // staff cannot see what is left without opening all sixteen of them one at a time.
          // Chips instead, one tap, with the number of men already on each lot written under it. A lot
          // nobody is on yet is marked kosong, so what is left can be read at a glance.
          var lotSel = EA.lists.MACHINE_JOBS.indexOf(j.task) >= 0 ? '' : j.lots.length > 1 ? (function () {
            var count = {};
            j.lots.forEach(function (n) { count[n] = 0; });
            j.people.forEach(function (ww) {
              (draft.lines[ww] || []).forEach(function (ll) { if (ll.lot && count[ll.lot] !== undefined) count[ll.lot]++; });
            });
            return '<div class="picks wk-lotpick">' + j.lots.map(function (n) {
              var c = count[n], mine = n === l.lot;
              return '<button type="button" class="pick lotp' + (c ? '' : ' lotp-free') + '" data-w="' + w + '" data-i="' + i + '" data-pick-lot="' + esc(n) + '" aria-pressed="' + mine + '"><b>' + esc(n) + '</b><small>' +
                (c ? c + EA.t(' org', ' on it') : EA.t('kosong', 'nobody')) + '</small></button>';
            }).join('') + '</div>';
          })() : (j.lots[0] ? '<span class="mono">' + esc(j.lots[0]) + '</span>' : '');
          var input = k === 'day'
            ? '<div class="seg"><button type="button" data-w="' + w + '" data-i="' + i + '" data-day="1" aria-pressed="' + (l.qty === '1') + '">1</button><button type="button" data-w="' + w + '" data-i="' + i + '" data-day="0.5" aria-pressed="' + (l.qty === '0.5') + '">½</button></div> hari'
            // v1.75: an empty box used to show a grey 0, which reads as a keyed zero (Yu Chen, 19 Nov: the
            // boxes looked already answered). Blank now looks blank; a real zero still needs a reason.
            : '<input class="qty" inputmode="decimal" data-w="' + w + '" data-i="' + i + '" data-f="' + (k === 'bunches' ? 'bunches' : 'qty') + '" value="' + esc(k === 'bunches' ? l.bunches : l.qty) + '" placeholder=""> ' + esc(unitLabel(j.task, j.block));
          var meter = isOp(j) ? '<div class="wline"><label class="inline-label">' + EA.t('Meter jam mula ', 'Hour meter start ') + '<input class="qty" inputmode="decimal" data-w="' + w + '" data-i="' + i + '" data-f="ms" value="' + esc(l.ms || '') + '"></label>' +
            '<label class="inline-label">' + EA.t(' tamat ', ' end ') + '<input class="qty" inputmode="decimal" data-w="' + w + '" data-i="' + i + '" data-f="me" value="' + esc(l.me || '') + '"></label>' +
            '<span class="mono" data-hrs="' + w + '|' + i + '">= ' + hoursOf(l) + EA.t(' jam', ' hours') + '</span></div>' : '';
          return '<div class="wline">' + lotSel + input + (i > 0 ? '<button type="button" class="link-btn" data-w="' + w + '" data-del="' + i + '">' + EA.t('buang', 'remove') + '</button>' : '') + '</div>' + meter;
        }).join('') + (j.lots.length > 1 && k !== 'day' ? '<button type="button" class="link-btn" data-w="' + w + '" data-add="1">' + EA.t('+ petak lain', '+ another lot') + '</button>' : '') + bagBox(j, w) +
        // v1.75 (Yu Chen, 19 Nov: "Say I wan to change this havestor to no work. No button."). The T/S/C
        // choice existed since 1.74 but only appeared AFTER pressing SIMPAN, and only for a man whose box was
        // left empty — so standing in front of his name there was nothing to press, and "1 tandan" was the
        // cheaper path. The row now carries the same question. It opens the same card and writes the same
        // correction to the same morning chit; BETULKAN is unchanged. Two doors, one room.
        (askable(j) ? '<button type="button" class="link-btn wk-away" data-awayw="' + esc(w) + '" data-awayj="' + esc(j.key) + '">' + EA.t('tidak hadir / tiada kerja', 'absent / no work') + '</button>' : '');
      return '<div class="wrow"><div class="who-w"><b>' + esc(person(w)) + '</b><span class="en">' + esc(w) + '</span></div><div></div><div class="job" style="display:block">' + rows + '</div></div>';
    }).join('');
    // v1.80: the mandor has no box, and now the screen says so. He sat directly under the ISI box with
    // nothing to press and no word of explanation, so the box read as his — which is exactly how Yu Chen
    // read it. The close was taught the same rule in 1.79; this is the staff's side of it.
    lines = j.mandors.map(function (m) {
      return '<div class="wrow"><div class="who-w"><b>' + esc(person(m)) + '</b><span class="en">' + esc(m) + ' · Mandor · ' + EA.t('ikut kumpulan', 'goes by the gang') + '</span>' +
        '<span class="hint wk-nobox">' + EA.t('Tiada angka untuk mandor — dia menyelia.', 'No number to key for the mandor — he supervises.') + '</span></div><div></div></div>';
    }).join('') + lines;
    return '<section class="card" data-job="' + j.key + '"><h2>' + esc(sec.code + '. ' + jobName(j.task)) + (j.block ? ' · Blok ' + esc(j.block) : '') + '</h2>' +
      '<p class="hint">' + esc(j.task) + (lotsText ? ' · ' + esc(lotsText) : '') + (j.mandor ? ' · Mandor ' + esc(person(j.mandor)) : '') + '</p>' +
      (j.ask ? '<p class="hint warn-t"><b>' + EA.t('Kerja lain · minta lulus Pengurus', 'Other work · Assistant Manager to approve') + '</b> · ' + esc(j.ask) + '</p>' : '') +
      (j.task === 'MAN' ? '<div class="wline"><label class="inline-label">' + EA.t('Dos baja (kg sepokok) ', 'Dose (kg per palm) ') + '<input class="qty" inputmode="decimal" data-dose="' + j.key + '" value="' + esc((draft.dose || {})[j.key] || '') + '"></label>' +
        '<span class="hint">' + EA.t('ikut program baja', 'from the manuring programme') + '</span></div>' : '') +
      (isHa(j) ? progBlock(j) +
        '<div class="wline"><span class="hint">' + (auto(j) ? EA.t('Tekan petak yang dibuat oleh setiap orang. Petak yang dikongsi dibahagi antara mereka.', 'Tap the lots each person worked. A shared lot is split among them.') : EA.t('Ha diisi seorang-seorang.', 'Ha keyed per person.')) + '</span>' +
        (auto(j) && j.people.length > 1 ? '<button type="button" class="btn btn-ghost" data-allwho="' + j.key + '">SAME FOR ALL<small>Sama semua petak</small></button>' : '') +
        '<button type="button" class="btn btn-ghost" data-manual="' + j.key + '">' + (auto(j) ? 'KEY HA<small>Isi Ha sendiri</small>' : 'BY LOT<small>Ikut petak</small>') + '</button></div>' : '') +
      // v1.80 (Yu Chen, 20 Nov 2026, looking at Blok 02: "Is this to fill mandore? It should total up the
      // number by the whole harvesting Geng"). Two answers, both on this line and the next.
      // ISI copies ONE number into every empty box. On harvesting that can only ever be wrong: every
      // harvester cuts a different number, which is what piece rate means. The screen was inviting the gang
      // total to be typed here — 872 tandan into 16 men is 13,952 tandan and it is pay. So k !== 'bunches'.
      (k !== 'ticket' && k !== 'day' && k !== 'bunches' && !auto(j) && !isHa(j) ? '<div class="wline"><span class="hint">' + EA.t('Isi sama untuk semua yang kosong:', 'Fill the same for everyone empty:') + '</span><input class="qty" inputmode="decimal" data-fill="' + j.key + '" placeholder="0"> ' + esc(unitLabel(j.task, j.block)) + '<button type="button" class="btn btn-ghost" data-fillgo="' + j.key + '">FILL<small>Isi</small></button></div>' : '') +
      // The gang total he was looking for already existed — measured 2,500px below this point, past all
      // sixteen men, where nobody on a phone has ever scrolled. It comes up here, under the block heading,
      // so it adds up in front of the mandor as he keys and he can check it against his own paper before
      // SIMPAN. Same element, same updater; only where it sits has changed.
      // Only the total comes up. The flags stayed behind on purpose: they are one amber line per man who is
      // under target, so on a poor day sixteen of them would sit between the heading and the first name and
      // push the men off the screen — the very fault being fixed. They belong at the end, where they are read.
      '<p class="wk-total" data-tot="' + j.key + '"></p>' +
      '<div class="rows">' + lines + '</div>' +
      '<div data-flags="' + j.key + '"></div>' +
      (isHa(j) ? '<p class="hint" data-hastat="' + j.key + '"></p>' : '<div class="field"><span class="inline"><span class="bm">Kerja ini</span> · <span class="en">This job</span></span>' +
        '<div class="seg"><button type="button" data-st="' + j.key + '" data-v="Y" aria-pressed="' + (st.done === 'Y') + '" style="min-width:110px">' + EA.t('SIAP', 'DONE') + '</button>' +
        '<button type="button" data-st="' + j.key + '" data-v="N" aria-pressed="' + (st.done === 'N') + '" style="min-width:140px">' + EA.t('BELUM SIAP', 'NOT DONE') + '</button></div></div>' +
      '<div class="field" data-reasonbox="' + j.key + '"' + (st.done === 'N' ? '' : ' hidden') + '><label><span class="bm">Sebab & tindakan</span><span class="en">Why, and what will be done (counter-measure)</span></label>' +
        '<textarea class="text-input" rows="2" data-reason="' + j.key + '" placeholder="' + EA.t('cth: hujan 2 petang; sambung esok dengan 2 orang lagi', 'e.g. rain at 2pm; continue tomorrow with 2 more people') + '">' + esc(st.reason) + '</textarea></div>') +
      '</section>';
  }

  function wireTop() {
    $('#wk-back').onclick = function () { location.hash = ''; };
    var wc = $('#wk-close');
    if (wc) wc.onclick = function () { EA.local.set('fh.daypick', wc.dataset.date); location.hash = '#field-harvest/close'; };
    var sel = $('#wk-chit');
    if (sel) sel.onchange = function () { EA.local.set('fh.workchit', this.value); render(el, ctx); };
    var fix = $('#wk-fix');
    if (fix) fix.onclick = function () {
      var s = savedFor(chit.chit);
      draft = { chit: chit.chit, lines: JSON.parse(JSON.stringify(s.lines)), status: JSON.parse(JSON.stringify(s.status)), checker: s.checker, replacing: s.chit,
                prog: JSON.parse(JSON.stringify(s.prog || {})), manual: JSON.parse(JSON.stringify(s.manual || {})), bags: JSON.parse(JSON.stringify(s.bags || {})), chitRev: s.chitRev || 1,
                who: s.who ? JSON.parse(JSON.stringify(s.who)) : null, pbags: JSON.parse(JSON.stringify(s.pbags || {})), dose: JSON.parse(JSON.stringify(s.dose || {})), lotwhy: JSON.parse(JSON.stringify(s.lotwhy || {})),
                hlot: JSON.parse(JSON.stringify(s.hlot || {})), clot: JSON.parse(JSON.stringify(s.clot || {})), rbTick: JSON.parse(JSON.stringify(s.rbTick || {})) };
      normProg(draft);
      if (!draft.who) { draft.who = {}; jobsOf(chit).forEach(function (j) { if (isHa(j)) draft.who[j.key] = allWho(j, draft); }); }
      keepDraft(); render(el, ctx);
    };
    var view = $('#wk-view');
    if (view) view.onclick = function () { showReport(savedFor(chit.chit)); };
  }

  function wireJobs(jobs) {
    if (rbOn()) rbWire(jobs);
    var jobOfW = {};
    jobs.forEach(function (j) { j.people.forEach(function (w) { jobOfW[w] = j; }); });
    el.querySelectorAll('[data-f]').forEach(function (inp) {
      var ev = inp.tagName === 'SELECT' ? 'onchange' : 'oninput';
      inp[ev] = function () {
        var l = draft.lines[inp.dataset.w][Number(inp.dataset.i)];
        l[inp.dataset.f] = inp.dataset.f === 'lot' ? inp.value : inp.value.replace(/[^\d.,]/g, '');
        keepDraft(); refresh(jobs);
      };
    });
    // v1.88: the chips write exactly what the dropdown wrote, into the same draft. Tapping a man's own lot
    // again clears it, which the dropdown did through its blank first line.
    el.querySelectorAll('[data-pick-lot]').forEach(function (b) {
      b.onclick = function () {
        var l = draft.lines[b.dataset.w][Number(b.dataset.i)];
        l.lot = l.lot === b.dataset.pickLot ? '' : b.dataset.pickLot;
        var o = b.closest('[data-rbopen]'); if (o) rbFocus = o.dataset.rbopen + '|' + b.dataset.w + '|' + (b.dataset.i || 0);
        keepDraft(); render(el, ctx);
      };
    });
    el.querySelectorAll('[data-day]').forEach(function (b) {
      b.onclick = function () {
        draft.lines[b.dataset.w][Number(b.dataset.i)].qty = b.dataset.day;
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        keepDraft(); refresh(jobs);
      };
    });
    el.querySelectorAll('[data-alllots],[data-onelot]').forEach(function (b) {
      b.onclick = function () {
        var j = jobs.find(function (x) { return x.people.indexOf(b.dataset.w) >= 0 && kind(x.task, x.block) === 'day'; });
        var l = draft.lines[b.dataset.w][Number(b.dataset.i)], on = String(l.lot || '').split(' ').filter(Boolean);
        if (b.dataset.alllots) on = on.length === j.lots.length ? [] : j.lots.slice();
        else { var at = on.indexOf(b.dataset.onelot); if (at >= 0) on.splice(at, 1); else on.push(b.dataset.onelot); }
        l.lot = j.lots.filter(function (n) { return on.indexOf(n) >= 0; }).join(' ');
        keepDraft(); render(el, ctx);
      };
    });
    el.querySelectorAll('[data-add]').forEach(function (b) {
      b.onclick = function () { draft.lines[b.dataset.w].push({ lot: '', qty: '', bunches: '' }); if (b.closest('[data-rbopen]')) rbSeeLot = b.dataset.w; keepDraft(); render(el, ctx); };
    });
    el.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () { draft.lines[b.dataset.w].splice(Number(b.dataset.del), 1); keepDraft(); render(el, ctx); };
    });
    // v1.75: the row's own "tidak hadir / tiada kerja" opens the SAME card SIMPAN opens, for this one man.
    el.querySelectorAll('[data-awayw]').forEach(function (b) {
      b.onclick = function () {
        var j = jobs.find(function (x) { return x.key === b.dataset.awayj; });
        if (!j) return;
        askMissing(jobs, [missEntry(j, b.dataset.awayw)], b.dataset.awayw);
      };
    });
    el.querySelectorAll('[data-fillgo]').forEach(function (b) {
      b.onclick = function () {
        var key = b.dataset.fillgo, v = el.querySelector('[data-fill="' + key + '"]').value.replace(/[^\d.,]/g, '');
        if (!v) return;
        var j = jobs.find(function (x) { return x.key === key; }), f = kind(j.task, j.block) === 'bunches' ? 'bunches' : 'qty';
        j.people.forEach(function (w) { draft.lines[w].forEach(function (l) { if (!l[f]) l[f] = v; }); });
        keepDraft(); render(el, ctx);
      };
    });
    function jobByKey(key) { return jobs.find(function (x) { return x.key === key; }); }
    el.querySelectorAll('[data-lj]').forEach(function (b) {
      b.onclick = function () {
        var j = jobByKey(b.dataset.lj); draft.prog[j.key] = draft.prog[j.key] || {};
        draft.prog[j.key][b.dataset.ll] = b.dataset.lv === 'Y' ? '100' : '0';
        shareOut(j); syncHaStatus(j); keepDraft(); render(el, ctx);
      };
    });
    el.querySelectorAll('[data-lwhy]').forEach(function (b) {
      b.onclick = function () { var x = b.dataset.lwhy.split('|'), j = jobByKey(x[0]), lw = lotWhy(j); lw[x[1]] = lw[x[1]] || {}; lw[x[1]].why = x[2]; syncHaStatus(j); keepDraft(); render(el, ctx); };
    });
    el.querySelectorAll('[data-lrain],[data-llost]').forEach(function (b) {
      b.onclick = function () { var x = (b.dataset.lrain || b.dataset.llost).split('|'), j = jobByKey(x[0]), lw = lotWhy(j); lw[x[1]] = lw[x[1]] || {};
        if (b.dataset.lrain) lw[x[1]].rain = x[2]; else lw[x[1]].lost = Number(x[2]); syncHaStatus(j); keepDraft(); render(el, ctx); };
    });
    el.querySelectorAll('[data-lwnote],[data-lwuntil]').forEach(function (i) {
      i[i.type === 'date' ? 'onchange' : 'oninput'] = function () {
        var x = (i.dataset.lwnote || i.dataset.lwuntil).split('|'), j = jobByKey(x[0]), lw = lotWhy(j); lw[x[1]] = lw[x[1]] || {};
        lw[x[1]][i.dataset.lwnote ? 'note' : 'until'] = i.value; syncHaStatus(j); keepDraft(); refresh(jobs);
      };
    });
    el.querySelectorAll('[data-paddlot]').forEach(function (s) {
      s.onchange = function () {
        if (!this.value) return; var k = s.dataset.paddlot;
        draft.prog[k] = draft.prog[k] || {}; draft.prog[k][this.value] = '';
        draft.added = draft.added || {}; draft.added[k] = (draft.added[k] || []).concat([this.value]);
        keepDraft(); render(el, ctx);
      };
    });
    el.querySelectorAll('[data-manual]').forEach(function (b) {
      b.onclick = function () { var key = b.dataset.manual; draft.manual[key] = !draft.manual[key]; if (!draft.manual[key]) shareOut(jobByKey(key)); keepDraft(); render(el, ctx); };
    });
    el.querySelectorAll('[data-wholot]').forEach(function (b) {
      b.onclick = function () {
        var x = b.dataset.wholot.split('|'), j = jobByKey(x[0]), wh = who(j), on = wh[x[1]] = (wh[x[1]] || []).slice(), at = on.indexOf(x[2]);
        if (at >= 0) on.splice(at, 1); else on.push(x[2]);
        shareOut(j); keepDraft(); render(el, ctx);
      };
    });
    el.querySelectorAll('[data-allwho]').forEach(function (b) {
      b.onclick = function () {
        var j = jobByKey(b.dataset.allwho), wh = who(j), d = chosenLots(j);
        var full = j.people.every(function (w) { return d.every(function (l) { return (wh[w] || []).indexOf(l) >= 0; }); });
        j.people.forEach(function (w) { wh[w] = full ? [] : d.slice(); });
        shareOut(j); keepDraft(); render(el, ctx);
      };
    });
    el.querySelectorAll('[data-pbag]').forEach(function (i) {
      i.oninput = function () { var x = i.dataset.pbag.split('|'); pbags(jobByKey(x[0]))[x[1]] = i.value.replace(/\D/g, ''); keepDraft(); refresh(jobs); };
    });
    el.querySelectorAll('[data-dose]').forEach(function (i) {
      i.oninput = function () { draft.dose = draft.dose || {}; draft.dose[i.dataset.dose] = i.value.replace(/[^\d.,]/g, ''); keepDraft(); refresh(jobs); };
    });
    el.querySelectorAll('[data-bags]').forEach(function (i) {
      i.oninput = function () { draft.bags = draft.bags || {}; draft.bags[i.dataset.bags] = i.value.replace(/\D/g, ''); keepDraft(); refresh(jobs); };
    });
    el.querySelectorAll('[data-st]').forEach(function (b) {
      b.onclick = function () {
        var key = b.dataset.st;
        draft.status[key] = draft.status[key] || { done: '', reason: '' };
        draft.status[key].done = b.dataset.v;
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        el.querySelector('[data-reasonbox="' + key + '"]').hidden = b.dataset.v !== 'N';
        keepDraft(); refresh(jobs);
      };
    });
    el.querySelectorAll('[data-reason]').forEach(function (t) {
      t.oninput = function () { draft.status[t.dataset.reason].reason = t.value; keepDraft(); refresh(jobs); };
    });
  }

  function refresh(jobs) {
    jobs.forEach(function (j) {
      syncHaStatus(j);
      var hs = el.querySelector('[data-hastat="' + j.key + '"]'), st0 = draft.status[j.key] || {};
      if (hs) hs.innerHTML = '<b>' + (st0.done === 'Y' ? EA.t('Kerja ini SIAP (semua petak siap)', 'Job DONE (every lot finished)') : st0.done === 'N' ? EA.t('Kerja ini BELUM SIAP', 'Job NOT DONE') + '</b> · ' + esc(st0.reason) + '<b>' : EA.t('Pilih SIAP / BELUM SIAP bagi setiap petak', 'Mark each lot')) + '</b>';
      var t = jobTotals(j), k = kind(j.task, j.block);
      var orang = EA.t(' orang · ', ' people · ');
      var line = k === 'bunches' ? j.people.length + orang + t.bunches + EA.t(' tandan · purata ', ' bunches · average ') + (j.people.length ? Math.round(t.bunches / j.people.length) : 0) + EA.t(' seorang', ' each')
        : k === 'day' ? j.people.length + orang + t.qty + EA.t(' hari', ' days')
        : k === 'ticket' ? j.people.length + orang + EA.t('tan ikut tiket kilang', 'tonnes per mill ticket')
        : j.people.length + orang + t.qty + ' ' + unitLabel(j.task, j.block) + (task(j.task).unit === 'Ha' && t.planHa ? EA.t(' daripada ', ' of ') + t.planHa.toFixed(2) + EA.t(' Ha dirancang', ' Ha planned') : '');
      if (t.bags != null) line += ' · ' + t.bags + EA.t(' beg', ' bags');
      if (isOp(j)) line += ' · ' + t.hours + EA.t(' jam', ' hours');
      if (t.target && t.actual != null) line += ' · ' + EA.t('sasaran ', 'target ') + t.target.total + ' ' + t.tunit;
      var tot = el.querySelector('[data-tot="' + j.key + '"]'); if (tot) tot.textContent = EA.t('Jumlah: ', 'Total: ') + line;
      var fl = el.querySelector('[data-flags="' + j.key + '"]');
      if (fl) fl.innerHTML = t.flags.map(function (f) { return '<p class="flag' + (f.bad ? ' bad' : '') + '">' + esc(f.text) + '</p>'; }).join('');
    });
    el.querySelectorAll('[data-hrs]').forEach(function (sp) { var x = sp.dataset.hrs.split('|'), l = (draft.lines[x[0]] || [])[Number(x[1])]; if (l) sp.textContent = '= ' + hoursOf(l) + EA.t(' jam', ' hours'); });
    if (rbOn()) rbRefresh(jobs);
    var pv = $('#wk-preview'); if (pv) pv.textContent = reportText(buildRecord(EA.t('(belum disimpan)', '(not saved yet)'), EA.ui.hhmm(new Date()), draft.checker));
  }

  // ---------- check, confirm, save ----------
  function problems(jobs) {
    var p = [];
    jobs.forEach(syncHaStatus);
    if (rbOn()) jobs.forEach(function (j) { if (j.task === 'ITF' || j.task === 'LFF') rbColSync(j); else if (rbHarvest(j)) rbSync(j); });   // v1.95
    jobs.forEach(function (j) {
      var k = kind(j.task, j.block), st = draft.status[j.key] || {};
      if (auto(j)) {
        var pg = draft.prog[j.key] || {}, lw = lotWhy(j);
        var unset = progLots(j).filter(function (l) { return String(pg[l] == null ? '' : pg[l]) === ''; });
        if (!progLots(j).length || unset.length) p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': pilih SIAP atau BELUM SIAP untuk petak ' + unset.join(', '), 'Mark each lot done or not done']);
        progLots(j).filter(function (l) { return String(pg[l]) === '0'; }).forEach(function (l) {
          var w = lw[l] || {};
          if (!w.why) p.push([shortName(j.task) + ' petak ' + l + ': pilih sebab belum siap (Hujan / Sebab lain)', 'Why is the lot not finished']);
          else if (w.why === 'rain' && !w.rain) p.push([shortName(j.task) + ' petak ' + l + ': hujan bagaimana? (lewat mula / berhenti / tanah basah)', 'What kind of rain']);
          else if (w.why === 'rain' && !w.lost) p.push([shortName(j.task) + ' petak ' + l + ': berapa hari hilang? (¼ · ½ · ¾ · 1)', 'How much of the day was lost']);
          else if (w.why === 'other' && String(w.note || '').trim().length < 3) p.push([shortName(j.task) + ' petak ' + l + ': tulis sebab', 'Write the reason']);
          if (!w.until) p.push([shortName(j.task) + ' petak ' + l + ': isi bila kerja disambung', 'When does the work continue']);
          else if (chit && w.until < chit.date) p.push([shortName(j.task) + ' petak ' + l + ': tarikh sambung sudah lepas', 'The continue date is in the past']);
        });
        if (chosenLots(j).length) {
          var wh = who(j), d = chosenLots(j);
          var none = j.people.filter(function (w) { return !d.some(function (l) { return (wh[w] || []).indexOf(l) >= 0; }); });
          if (none.length) p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': tekan petak untuk ' + none.map(person).join(', '), 'Tap the lots each person worked']);
          var lone = doneLots(j).filter(function (l) { return !j.people.some(function (w) { return (wh[w] || []).indexOf(l) >= 0; }); });
          if (lone.length) p.push([shortName(j.task) + ': petak ' + lone.join(', ') + ' siap tetapi tiada orang', 'A lot done but nobody on it']);
        }
      } else if (k !== 'ticket') {
        // v1.73: a person with no lot picked still stops the save — the app cannot guess which lot he worked.
        // A person with no quantity does not: he is asked about on the card instead (see missingPeople).
        var noLot = j.people.filter(function (w) {
          var ls = draft.lines[w] || [];
          return ls.length && j.lots.length > 1 && ls.some(function (l) { return !l.lot; });
        });
        if (noLot.length) p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': tekan petak untuk ' + noLot.map(person).join(', '), 'Tap the lot each person worked']);
      }
      if (isBagJob(j)) {
        var nob = j.people.filter(function (w) { return !(num(pbags(j)[w]) > 0); });
        if (nob.length) p.push([shortName(j.task) + ': isi beg baja untuk ' + nob.map(person).join(', '), 'Fill each person\'s bags']);
      }
      if (j.task === 'MAN' && !(num((draft.dose || {})[j.key]) > 0)) p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': isi dos baja (kg sepokok)', 'Fill the dose (kg per palm)']);
      if (isOp(j)) {
        var nom = j.people.filter(function (w) { return (draft.lines[w] || []).some(function (l) { return !(hoursOf(l) > 0); }); });
        if (nom.length) p.push([shortName(j.task) + ': isi meter jam mula dan tamat (tamat lebih besar) untuk ' + nom.map(person).join(', '), 'Fill the hour meter at start and end']);
      }
      if (isHa(j) && !auto(j) && !st.done) p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': pilih SIAP atau BELUM SIAP bagi setiap petak, dengan sebab', 'Mark each lot done or not done, with the reason']);
      if (!st.done && !isHa(j)) p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': pilih SIAP atau BELUM SIAP', 'Mark the job done or not done']);
      if (st.done === 'N' && !isHa(j) && String(st.reason || '').trim().length < 5) p.push([shortName(j.task) + ': tulis sebab dan tindakan', 'Write why and what will be done']);
      if (rbOn() && rbType(j) === 'man') rbManProblems(j).forEach(function (x) { p.push(x); });   // v1.94 Membaja
      if (rbOn() && j.task === 'ITF') rbColProblems(j).forEach(function (x) { p.push(x); });     // v1.95 Traktor & pemuat

    });
    return p;
  }

  // v1.73 (Yu Chen, 18 Nov 2026: "it might be miss out. so ask him quatity of work or absent").
  // Everyone on the chit who has no quantity yet. A blank does NOT mean the man did not come — it may simply
  // not be keyed. So the app never decides: it asks, and offers both answers on the same card.
  // v1.73: a real nothing. A man who came and cut none is not the same as a man nobody keyed, and he is not
  // absent either — on a rain day it is the commonest thing there is. So 0 is an answer, once it carries a
  // reason from the list Yu Chen approved on 11 Nov. Without this the only ways out of the screen were to
  // type a number nobody knew or to mark a man away who was standing there, which is how "1 tandan" was born.
  function zeroWhy(w) { draft.zero = draft.zero || {}; return draft.zero[w] || ''; }
  function answered(w, k) {
    var ls = draft.lines[w] || [];
    return ls.some(function (l) {
      var v = k === 'bunches' ? l.bunches : l.qty;
      if (String(v == null ? '' : v).trim() === '') return false;
      return num(v) > 0 || (num(v) === 0 && !!zeroWhy(w));
    });
  }
  // v1.75: one description of a person who still owes an answer, built in one place, so the row's own
  // TIDAK HADIR opens exactly the card SIMPAN opens (Rule 5) instead of a second copy that can drift.
  function missEntry(j, w) {
    var k = kind(j.task, j.block);
    return { job: j, w: w, k: k, unit: k === 'bunches' ? EA.t('tandan', 'bunches') : k === 'day' ? EA.t('hari', 'day') : (task(j.task) && task(j.task).unit) || '' };
  }
  function askable(j) { var k = kind(j.task, j.block); return !(auto(j) || k === 'ticket' || isOp(j)); }
  function missingPeople(jobs) {
    var out = [];
    jobs.forEach(function (j) {
      if (!askable(j)) return;
      var k = kind(j.task, j.block);
      j.people.forEach(function (w) {
        if (answered(w, k)) return;
        out.push(missEntry(j, w));
      });
    });
    return out;
  }
  var AWAY_MARKS = [['T', 'Tidak hadir', 'Absent'], ['S', 'Sakit', 'Sick'], ['C', 'Cuti', 'Leave']];
  // The card. It is not a wall: SIMPAN is never refused because somebody is still unanswered (15 Nov rule —
  // an app that will not save pushes the staff to make up a number, which is where "1 tandan" came from).
  // The day close is what insists, so an unanswered person cannot be forgotten either.
  function askMissing(jobs, miss, one) {
    draft.away = draft.away || {};
    var byJob = [];
    miss.forEach(function (m) {
      var g = byJob.find(function (x) { return x.key === m.job.key; });
      if (!g) { g = { key: m.job.key, head: shortName(m.job.task) + (m.job.block ? ' · Blok ' + m.job.block : '') + (m.job.lots.length ? ' · petak ' + m.job.lots.join(', ') : ''), rows: [] }; byJob.push(g); }
      g.rows.push(m);
    });
    function rowHtml(m) {
      var a = draft.away[m.w] || '';
      var box = m.k === 'day'
        ? '<div class="seg mx-day"><button type="button" data-mq="' + esc(m.w) + '" data-v="1">1</button><button type="button" data-mq="' + esc(m.w) + '" data-v="0.5">½</button></div><span class="mx-unit">' + EA.t('hari', 'day') + '</span>'
        : '<input class="text-input mx-qty" inputmode="decimal" data-mq="' + esc(m.w) + '" value="" placeholder=""><span class="mx-unit">' + esc(m.unit) + '</span>';
      var z = zeroWhy(m.w);
      return '<div class="mx-row' + (a ? ' done' : '') + '" data-mxrow="' + esc(m.w) + '">' +
        '<div class="mx-name"><b>' + esc(person(m.w)) + '</b></div>' +
        '<div class="mx-q">' + box + '</div>' +
        '<div class="mx-zero" data-mxzero="' + esc(m.w) + '"' + (z ? '' : ' hidden') + '>' +
          '<p class="mx-zh">' + EA.t('Hadir tetapi tiada hasil — kenapa?', 'Present but nothing done — why?') + '</p><div class="picks">' +
          LOW_WHY.map(function (y, i) { return '<button type="button" class="pick" data-mz="' + esc(m.w) + '" data-why="' + i + '" aria-pressed="' + (z === y[0]) + '"><b>' + EA.t(y[0], y[1]) + '</b></button>'; }).join('') +
        '</div></div>' +
        '<div class="mx-or"><span class="mx-ortext">' + EA.t('atau', 'or') + '</span>' +
        AWAY_MARKS.map(function (x) { return '<button type="button" class="mx-away" data-mw="' + esc(m.w) + '" data-mk="' + x[0] + '" aria-pressed="' + (a === x[0]) + '">' + x[0] + '<small>' + EA.t(x[1], x[2]) + '</small></button>'; }).join('') +
        '</div></div>';
    }
    // Opened from a row, the staff already knows who he means, so the card does not lecture him about blanks.
    var head = one
      ? '<h2 id="sheet-title"><span class="bm">' + esc(person(one)) + '</span><span class="en">' + esc(person(one)) + '</span></h2>' +
        '<div class="mx-note"><span class="bm">Isi jumlah kerjanya, atau tanda dia tidak turun kerja.</span>' +
        '<span class="en">Key his amount, or mark why he was away.</span></div>'
      : '<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
        '<div class="mx-note"><span class="bm">' + miss.length + ' orang tiada jumlah. <b>Kosong bukan bermakna tidak hadir</b> — mungkin belum diisi. Isi jumlah kerjanya, atau tanda dia tidak turun kerja.</span>' +
        '<span class="en">' + miss.length + ' people have no quantity. <b>Blank does not mean absent</b> — it may just not be keyed yet. Key the amount, or mark why he was away.</span></div>';
    ui().openSheet(head +
      byJob.map(function (g) { return '<p class="mx-head">' + esc(g.head) + '</p>' + g.rows.map(rowHtml).join(''); }).join('') +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="mx-back">‹ CHANGE<small>‹ UBAH</small></button>' +
      '<button class="btn btn-ok" type="button" id="mx-ok">SAVE<small>Simpan</small></button></div>',
      function (sh) {
        sh.querySelector('#mx-back').onclick = ui().closeSheet;
        function setAway(w, mk) {
          if (draft.away[w] === mk) delete draft.away[w]; else draft.away[w] = mk;
          var on = draft.away[w] || '';
          sh.querySelectorAll('[data-mw="' + w + '"]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mk === on); });
          var r = sh.querySelector('[data-mxrow="' + w + '"]'); if (r) r.classList.toggle('done', !!on);
          if (on) {
            sh.querySelectorAll('[data-mq="' + w + '"]').forEach(function (q) { if (q.tagName === 'INPUT') q.value = ''; q.setAttribute('aria-pressed', 'false'); });
            var zz = sh.querySelector('[data-mxzero="' + w + '"]'); if (zz) zz.hidden = true;
            if (zeroWhy(w)) delete draft.zero[w];
          }
          keepDraft();
        }
        sh.querySelectorAll('[data-mw]').forEach(function (b) { b.onclick = function () { setAway(b.dataset.mw, b.dataset.mk); }; });
        // A zero asks why, on the spot. Anything above zero puts the question away again.
        function showZero(w, on) {
          var z = sh.querySelector('[data-mxzero="' + w + '"]');
          if (z) z.hidden = !on;
          if (!on && zeroWhy(w)) { delete draft.zero[w]; keepDraft(); sh.querySelectorAll('[data-mz="' + w + '"]').forEach(function (p) { p.setAttribute('aria-pressed', 'false'); }); }
        }
        sh.querySelectorAll('[data-mz]').forEach(function (p) { p.onclick = function () {
          var w = p.dataset.mz; draft.zero = draft.zero || {};
          draft.zero[w] = LOW_WHY[Number(p.dataset.why)][0]; keepDraft();
          sh.querySelectorAll('[data-mz="' + w + '"]').forEach(function (o) { o.setAttribute('aria-pressed', o === p); });
          if (draft.away[w]) setAway(w, draft.away[w]);
        }; });
        sh.querySelectorAll('input[data-mq]').forEach(function (q) { q.oninput = function () {
          var w = q.dataset.mq, v = String(q.value).trim();
          if (v !== '' && draft.away[w]) setAway(w, draft.away[w]);
          showZero(w, v !== '' && num(v) === 0);
        }; });
        sh.querySelectorAll('button[data-mq]').forEach(function (b) { b.onclick = function () {
          var w = b.dataset.mq;
          if (draft.away[w]) setAway(w, draft.away[w]);
          sh.querySelectorAll('button[data-mq="' + w + '"]').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
          b.dataset.picked = '1';
        }; });
        sh.querySelector('#mx-ok').onclick = function () {
          // 1 · what he keyed goes onto the lines, exactly as the screen itself would have put it
          miss.forEach(function (m) {
            if (draft.away[m.w]) return;
            var v = '';
            if (m.k === 'day') { var hit = sh.querySelector('button[data-mq="' + m.w + '"][aria-pressed="true"]'); v = hit ? hit.dataset.v : ''; }
            else { var inp = sh.querySelector('input[data-mq="' + m.w + '"]'); v = inp ? String(inp.value).trim() : ''; }
            if (v === '') return;
            if (num(v) === 0 && !zeroWhy(m.w)) return;   // a zero with no reason is still unanswered
            if (!(num(v) >= 0)) return;
            var ls = draft.lines[m.w] || [];
            if (!ls.length) ls = [{ lot: m.job.lots.length === 1 ? m.job.lots[0] : (m.k === 'day' ? m.job.lots.join(' ') : ''), qty: '', bunches: '' }];
            if (m.k === 'bunches') ls[0].bunches = String(num(v)); else ls[0].qty = String(num(v));
            draft.lines[m.w] = ls;
          });
          keepDraft();
          // 2 · the ones who did not come go onto the chit, as one correction (Rule 4: the old chit stays)
          var marks = Object.keys(draft.away).filter(function (w) { return miss.some(function (m) { return m.w === w; }); })
            .map(function (w) { return { worker: w, mark: draft.away[w] }; });
          ui().closeSheet();
          // v1.81: Kerja passes its own estate, so the chit screen never has to have been opened first.
          if (marks.length && EA.fh.markAway && chit && EA.fh.markAway(chit.chit, marks, ctx.estate)) {
            marks.forEach(function (m) { delete draft.away[m.worker]; delete draft.lines[m.worker]; });
            keepDraft();
            ui().toast(EA.t(marks.length + ' orang ditanda di chit · tekan SIMPAN sekali lagi', marks.length + ' marked on the chit · press SAVE again'));
            render(el, ctx); window.scrollTo(0, 0);
            return;
          }
          // 3 · nothing left to tell the chit: carry on to the usual check, and never refuse the save
          check(jobs, true);
        };
      });
  }

  function check(jobs, skipMissing) {
    var p = problems(jobs);
    if (p.length) {
      ui().openSheet('<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
        p.map(function (x) { return '<p class="msg"><span class="bm">' + esc(x[0]) + '</span><span class="en">' + esc(x[1]) + '</span></p>'; }).join('') +
        '<div class="actions"><button class="btn btn-main" type="button" id="wp-ok">OK<small>Betulkan</small></button></div>',
        function (s) { s.querySelector('#wp-ok').onclick = ui().closeSheet; });
      return;
    }
    if (!skipMissing) { var miss = missingPeople(jobs); if (miss.length) { askMissing(jobs, miss); return; } }
    var red = [];
    jobs.forEach(function (j) { jobTotals(j).flags.forEach(function (f) { if (f.bad) red.push(f.text); }); });
    // v1.27 A · Semak sebelum simpan: a harvester's bunches far too few or far too many on a lot.
    var cks = [];
    jobs.forEach(function (j) {
      if (kind(j.task, j.block) !== 'bunches') return;
      j.people.forEach(function (w) {
        (draft.lines[w] || []).forEach(function (l) {
          var b = num(l.bunches);
          if (b > 0 && (b < EA.lists.bunchCheck.low || b > EA.lists.bunchCheck.high)) cks.push({ ref: w, bm: person(w) + ': ' + b + EA.t(' tandan', ' bunches') + (l.lot ? EA.t(' di petak ', ' on lot ') + l.lot : '') + ' — ' + (b < EA.lists.bunchCheck.low ? EA.t('terlalu sedikit', 'very few') : EA.t('terlalu banyak', 'very many')) + '?' });
        });
      });
    });
    jobs.forEach(function (j) {
      if (!isOp(j)) return;
      var lm = lastMeter(machOf(j), chit.chit);
      j.people.forEach(function (w) {
        (draft.lines[w] || []).forEach(function (l) {
          var h = hoursOf(l);
          if (h > 14) cks.push({ ref: w, bm: person(w) + ': ' + h + EA.t(' jam pada jentera — terlalu banyak?', ' hours on the machine — too many?') });
          if (lm != null && String(l.ms) !== '' && num(l.ms) !== num(lm)) cks.push({ ref: w, bm: person(w) + EA.t(': meter mula ', ': start meter ') + num(l.ms) + EA.t(' tidak sama dengan tamat terakhir ', ' differs from the last end ') + num(lm) + '?' });
        });
      });
    });
    // v1.54 (Yu Chen, 11 Nov 2026): a harvester under 80% of the day's target needs a reason before the work
    // saves (this replaces the "very few bunches, right?" question; "1 tandan" on a rain day was keyed 7 times,
    // 6–10 Nov). Target 1.5 MT a day turned into bunches by the month's ABW (or the estate's usual bunch weight).
    var lows = [], abwKg = (EA.fh.abwNow && EA.fh.abwNow(ctx.estate)) || 0, tgt = EA.lists.target && EA.lists.target(EA.lists.HARVEST, ctx.estate);
    if (abwKg && tgt && tgt.unit === 'MT') {
      var needB = Math.round(tgt.per * 1000 / abwKg), minB = Math.ceil(needB * 0.8);
      jobs.forEach(function (j) {
        if (j.task !== EA.lists.HARVEST || kind(j.task, j.block) !== 'bunches') return;
        j.people.forEach(function (w) {
          var b = (draft.lines[w] || []).reduce(function (a, l) { return a + num(l.bunches); }, 0);
          if (b > 0 && b < minB) lows.push({ w: w, b: b, need: needB, min: minB });
        });
      });
    }
    draft.low = draft.low || {};
    Object.keys(draft.low).forEach(function (w) { if (!lows.some(function (x) { return x.w === w; })) delete draft.low[w]; });
    if (lows.length) cks = cks.filter(function (c) { return !lows.some(function (x) { return x.w === c.ref; }) || !/terlalu sedikit|very few/.test(c.bm); });
    draft.checks = cks;
    // v1.1: the staff saves directly (no mandor confirmation on the phone for now).
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Semak kerja hari ini</span><span class="en">Check today\'s work, then save</span></h2>' +
      (cks.length ? '<h3 class="ck-h">' + EA.t('Semak dulu · betul?', 'Check first · right?') + '</h3>' + cks.map(function (c) { return '<div class="ck-warn"><b>' + esc(c.bm) + '</b>' + EA.t('Jika betul, simpan. Kerani akan semak.', 'If right, save. The clerk will check.') + '</div>'; }).join('') : '') +
      (lows.length ? '<h3 class="ck-h">' + EA.t('Bawah 80% sasaran · pilih sebab', 'Under 80% of target · pick a reason') + '</h3>' +
        '<p class="hint">' + EA.t('Sasaran ' + lows[0].need + ' tandan sehari (1.5 tan). Kunci tandan sebenar, walaupun buah belum keluar. Jangan letak 1.', 'Target ' + lows[0].need + ' bunches a day (1.5 MT). Key the real bunches, even if the fruit is not out yet. Never 1.') + '</p>' +
        lows.map(function (x) { return '<div class="ck-warn wk-low" data-loww="' + esc(x.w) + '"><b>' + esc(person(x.w)) + ': ' + x.b + ' / ' + x.need + EA.t(' tandan', ' bunches') + '</b>' +
          '<div class="picks">' + LOW_WHY.map(function (y, i) { return '<button type="button" class="pick" data-low="' + esc(x.w) + '" data-why="' + i + '" aria-pressed="' + (draft.low[x.w] === y[0]) + '"><b>' + EA.t(y[0], y[1]) + '</b></button>'; }).join('') + '</div></div>'; }).join('') : '') +
      (red.length ? '<div class="msg"><span class="bm">Perhatian: ' + esc(red.join('; ')) + '</span><span class="en">These go into the report for the Assistant Manager and HQ to see. If the map size of a lot is wrong, tell HQ.</span></div>' : '') +
      '<pre class="chit">' + esc(reportText(buildRecord('(belum disimpan)', EA.ui.hhmm(new Date()), ctx.user.code))) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="wc-back">‹ CHANGE<small>‹ UBAH</small></button>' +
      '<button class="btn btn-ok" type="button" id="wc-ok">SAVE<small>Simpan</small></button></div>',
      function (s) {
        s.querySelector('#wc-back').onclick = ui().closeSheet;
        var okb = s.querySelector('#wc-ok');
        function lowReady() { okb.disabled = lows.some(function (x) { return !draft.low[x.w]; }); }
        s.querySelectorAll('[data-low]').forEach(function (bt) {
          bt.onclick = function () {
            draft.low[bt.dataset.low] = LOW_WHY[Number(bt.dataset.why)][0]; keepDraft();
            s.querySelectorAll('[data-low="' + bt.dataset.low + '"]').forEach(function (o) { o.setAttribute('aria-pressed', o === bt); });
            lowReady();
          };
        });
        lowReady();
        okb.onclick = function () { if (okb.disabled) return; draft.checker = ctx.user.code; keepDraft(); ui().closeSheet(); save(jobs); };
      });
  }

  // v1.73: why a line is low, or nothing at all. A zero carries its reason the same way an under-target
  // line does, so "present, cut nothing, because rain" is a record and not a blank anybody can read as absent.
  function lineNote(j, w, l, k) {
    var v = k === 'bunches' ? l.bunches : l.qty;
    if (String(v == null ? '' : v).trim() !== '' && num(v) === 0 && zeroWhy(w)) return 'Hadir, tiada hasil: ' + zeroWhy(w);
    if (j.task === EA.lists.HARVEST && draft.low && draft.low[w]) return 'Bawah 80% sasaran: ' + draft.low[w];
    return '';
  }
  var LOW_WHY = [['Hujan', 'Rain'], ['Buah kurang di petak', 'Little fruit on the lot'], ['Sakit · balik awal', 'Sick · left early'], ['Penuai baru', 'New harvester'], ['Kerja lain separuh hari', 'Other work half the day']];
  // One record of the day's work: lines per person per lot, and one line per job.
  function buildRecord(label, at, checker) {
    var jobs = jobsOf(chit), lines = [], jobLines = [];
    jobs.forEach(syncHaStatus);
    jobs.forEach(function (j) {
      var k = kind(j.task, j.block), t = jobTotals(j), st = draft.status[j.key] || {};
      j.people.forEach(function (w) {
        if (k === 'ticket') { lines.push({ worker_id: w, task_code: j.task, block: j.block, lot: j.lots.join(' '), qty: '', unit: 'MT', bunches: '', bags: '', machine: '', meter_start: '', meter_end: '', hours: '' }); return; }
        (draft.lines[w] || []).forEach(function (l, i) {
          var op = isOp(j);
          lines.push({ worker_id: w, task_code: j.task, block: j.block, lot: l.lot || j.lots[0] || '', note: lineNote(j, w, l, k), qty: k === 'bunches' ? '' : String(num(l.qty)),
                       unit: k === 'bunches' ? 'bunch' : k === 'day' ? 'day' : (task(j.task).unit), bunches: k === 'bunches' ? String(num(l.bunches)) : '',
                       // v1.41: the person's bags go on his first lot line only (never counted twice).
                       bags: isBagJob(j) && i === 0 && String(pbags(j)[w] || '') !== '' ? String(num(pbags(j)[w])) : '',
                       machine: op ? machOf(j) : '', meter_start: op && String(l.ms || '') !== '' ? String(num(l.ms)) : '', meter_end: op && String(l.me || '') !== '' ? String(num(l.me)) : '', hours: op ? String(hoursOf(l)) : '' });
        });
      });
      jobLines.push({ key: j.key, task_code: j.task, block: j.block, lots: j.lots.join(' '), workers: j.people.length,
                      qty: k === 'bunches' || k === 'ticket' ? '' : String(t.qty), unit: k === 'bunches' ? 'bunch' : task(j.task).unit,
                      bunches: k === 'bunches' ? String(t.bunches) : '', plan_ha: t.planHa ? String(t.planHa) : '',
                      status: st.done === 'Y' ? 'done' : st.done === 'N' ? 'not_done' : '', reason: st.reason || '',
                      flags: t.flags.map(function (f) { return f.text; }).join('; '), progress: isHa(j) ? progText(j) : rbProg(j),
                      bags: t.bags != null ? String(t.bags) : '', target: t.target ? String(t.target.total) + ' ' + (t.tunit || t.target.unit) : '',
                      dose: j.task === 'MAN' && String((draft.dose || {})[j.key] || '') !== '' ? String(num(draft.dose[j.key])) : '', hours: isOp(j) ? String(t.hours) : '' });
    });
    return { chit: chit.chit, date: chit.date, estate: chit.estate, label: label, at: at, checker: checker,
             lines: lines, jobs: jobLines, keyedName: ctx.user.name };
  }

  function save(jobs) {
    var at = EA.ui.hhmm(new Date());
    var old = draft.replacing ? savedFor(draft.replacing) : null;
    var rec = buildRecord('', at, draft.checker);
    var stamp = EA.today() + ' ' + at;
    try {
      EA.batchStart();
      var oldLines = {};
      if (old) old.rec.lines.forEach(function (l) { oldLines[l.worker_id + '|' + l.task_code + '|' + l.lot] = l; });
      rec.lines.forEach(function (l) {
        var key = l.worker_id + '|' + l.task_code + '|' + l.lot, o = oldLines[key];
        var same = o && o.qty === l.qty && o.bunches === l.bunches && ['bags', 'machine', 'meter_start', 'meter_end', 'hours', 'note'].every(function (f) { return String(o[f] || '') === String(l[f] || ''); });
        if (same) { l.id = o.id; delete oldLines[key]; return; }
        l.id = EA.save(TAB, ROOM, ctx.estate, { date: rec.date, chit: rec.chit, worker_id: l.worker_id, task_code: l.task_code, block: l.block, lot: l.lot,
          qty: l.qty, unit: l.unit, bunches: l.bunches, confirmed_by: rec.checker, confirmed_at: stamp, note: l.note || '',
          bags: l.bags, machine: l.machine, meter_start: l.meter_start, meter_end: l.meter_end, hours: l.hours }, o ? o.id : '').id;
        // v1.3: the line's earlier versions (id and bunches), so a lorry that already took the old
        // line still counts against the corrected one (no lot counted twice).
        if (o) l.hist = (o.hist || []).concat([[o.id, o.bunches]]);
        delete oldLines[key];
      });
      Object.keys(oldLines).forEach(function (key) {
        var o = oldLines[key];
        EA.save(TAB, ROOM, ctx.estate, { date: rec.date, chit: rec.chit, worker_id: o.worker_id, task_code: o.task_code, block: o.block, lot: o.lot,
          qty: o.qty, unit: o.unit, bunches: o.bunches, confirmed_by: rec.checker, confirmed_at: stamp, note: 'removed in correction',
          bags: o.bags || '', machine: o.machine || '', meter_start: o.meter_start || '', meter_end: o.meter_end || '', hours: o.hours || '' }, o.id, 'removed');
      });
      // v1.42: settle earlier days of lots finished today (their 0 Ha lines get their share, on their own day).
      var settled = [];
      jobsOf(chit).forEach(function (j) {
        if (!isHa(j) || draft.manual[j.key]) return;
        var pg = draft.prog[j.key] || {}, wh = who(j);
        progLots(j).forEach(function (lot) {
          if (pg[lot] !== '100') return;
          var today = j.people.filter(function (w) { return (wh[w] || []).indexOf(lot) >= 0; }).length;
          var ed = earlierDays(j.task, lot);
          if (!today || !ed.length) return;
          var share = String(Math.round(lotHa(lot) / (today + ed.length) * 1000) / 1000);
          ed.forEach(function (x) {
            var o = x.line;
            if (o.settledBy === chit.chit && o.qty === share) return;
            var nid = EA.save(TAB, ROOM, x.s.estate, { date: x.s.date, chit: x.s.chit, worker_id: o.worker_id, task_code: o.task_code, block: o.block, lot: o.lot,
              qty: share, unit: o.unit, bunches: '', confirmed_by: rec.checker, confirmed_at: stamp, note: 'Petak ' + lot + ' siap ' + niceShort(rec.date) + ': bahagian Ha (' + (today + ed.length) + ' orang-hari)',
              bags: o.bags || '', machine: '', meter_start: '', meter_end: '', hours: '' }, o.id).id;
            settled.push({ s: x.s, i: x.i, id: nid, qty: share });
          });
        });
      });
      var oldJobs = {};
      if (old) old.rec.jobs.forEach(function (j) { oldJobs[j.task_code + '|' + j.block + '|' + j.lots] = j; });
      rec.jobs.forEach(function (j) {
        var jk = j.task_code + '|' + j.block + '|' + j.lots, o = oldJobs[jk];
        delete oldJobs[jk];
        if (o && o.qty === j.qty && o.bunches === j.bunches && o.status === j.status && o.reason === j.reason && String(o.progress || '') === String(j.progress || '') && o.workers === j.workers && String(o.bags || '') === String(j.bags || '') && String(o.dose || '') === String(j.dose || '')) { j.id = o.id; return; }
        j.id = EA.save(TAB_JOB, ROOM, ctx.estate, { date: rec.date, chit: rec.chit, task_code: j.task_code, block: j.block, lots: j.lots, workers: j.workers,
          qty: j.qty, unit: j.unit, bunches: j.bunches, plan_ha: j.plan_ha, job_status: j.status, reason: j.reason, flags: j.flags, progress: j.progress,
          bags: j.bags, target: j.target, dose: j.dose, confirmed_by: rec.checker, confirmed_at: stamp }, o ? o.id : '').id;
      });
      // v1.36: a job taken off in a correction is closed too (on 22 Oct an old ITF job line stayed standing).
      Object.keys(oldJobs).forEach(function (k) {
        var o = oldJobs[k];
        if (!o.id) return;
        EA.save(TAB_JOB, ROOM, ctx.estate, { date: rec.date, chit: rec.chit, task_code: o.task_code, block: o.block, lots: o.lots, workers: o.workers,
          qty: o.qty, unit: o.unit, bunches: o.bunches, plan_ha: o.plan_ha, job_status: o.status, reason: o.reason, flags: 'removed in correction', progress: o.progress,
          bags: o.bags, target: o.target, dose: o.dose || '', confirmed_by: rec.checker, confirmed_at: stamp }, o.id, 'removed');
      });
      // v1.27: warnings the staff saved anyway go to the clerk (kind "check").
      (draft.checks || []).forEach(function (k) {
        EA.save('FH_ALERT', ROOM, ctx.estate, { date: rec.date, chit: rec.chit, kind: 'check', block: '', lot: '', detail: k.bm, staff_note: 'Ya, betul (disimpan juga)', direction: '', direction_by: '', ref: k.ref || '' });
      });
      var mids = rbManSave(jobs, rec, old);   // v1.94 Membaja: bags used per lot, and bags back to the store
      EA.batchEnd();
    } catch (e) { EA.batchCancel(); ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad'); return; }
    settled.forEach(function (x) {   // v1.42: the earlier day now carries its share (kept on this phone too)
      var l = x.s.rec.lines[x.i]; l.hist = (l.hist || []).concat([[l.id, l.qty]]); l.id = x.id; l.qty = x.qty; l.settledBy = rec.chit; keepSaved(x.s);
    });
    keepSaved({ chit: rec.chit, date: rec.date, estate: rec.estate, rec: rec, lines: draft.lines, status: draft.status, prog: draft.prog, manual: draft.manual, bags: draft.bags || {}, who: draft.who || {}, pbags: draft.pbags || {}, dose: draft.dose || {}, lotwhy: draft.lotwhy || {}, checker: draft.checker, rev: old ? (old.rev || 1) + 1 : 1, chitRev: chit.rev || 1, mids: mids || {}, mlot: draft.mlot || {}, mpul: draft.mpul || {}, hlot: draft.hlot || {}, clot: draft.clot || {}, rbTick: draft.rbTick || {} });
    dropDraft();
    var moved = autoCollect(rec, at, !!(chit && chit.fromPlan && !old));   // v1.40: only the first save of a planned day
    ui().toast(EA.t('Kerja harian disimpan', 'Day\'s work saved') + (moved ? ' · ' + moved + EA.t(' tandan ke ramp', ' bunches to the ramp') : ''));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
    showReport(savedFor(rec.chit));
    if (chit && chit.fromPlan) ui().toast(EA.t('Kerja ' + niceDate(chit.date) + ' disimpan · seterusnya chit hari ini (Chit pagi)', 'Work of ' + niceDate(chit.date) + ' saved · next: today\'s chit (Morning chit)'));
  }

  // v1.34.2 (Yu Chen, 23 Oct): the farm tractor's job (ITF) marked SIAP means the crop on its lots went to the
  // ramp, so the staff keys it once: each of its lots with bunches still in the field is collected and cleared
  // ("Habis"), as if SEMUA KE RAMP was pressed. A correction of the same day's work does not collect again.
  // v1.95 (Brief_Tuai_Kutip_Rupa_Baru): in the new look the tractor's job carries each lot's answer in its progress
  // ("3-1 siap, 3-2 belum (traktor rosak)"); only the lots marked siap go to the ramp, whatever the job's SIAP says,
  // and a correction can still send a lot first answered BELUM (never one already sent).
  function siapLots(p) { var m, out = {}, re = /(?:^|, )([\w\-\/]+) siap(?=,|$)/g; while ((m = re.exec(String(p || '')))) out[m[1]] = true; return out; }
  function autoCollect(rec, at, firstPlanSave) {
    var itfJobs = (rec.jobs || []).filter(function (j) { return j.task_code === 'ITF'; }), perLot = null;
    if (itfJobs.some(function (j) { return !!j.progress; })) { perLot = {}; itfJobs.forEach(function (j) { Object.assign(perLot, siapLots(j.progress)); }); }
    var done = perLot ? Object.keys(perLot).length > 0 : itfJobs.some(function (j) { return j.status === 'done'; });
    if (!done || !EA.fh.harvest) return 0;
    // v1.35: a fix of an older day never moves fruit: what is in the field now may be from later days.
    // v1.40: a planned day is keyed before today's chit (oldest first), so the field holds only fruit up to that day.
    if (rec.date < daysAgo(1) && !firstPlanSave) return 0;
    var all = EA.local.get('fh.collect', []), sent = {};
    var prev = all.filter(function (s) { return s.fromWork === rec.chit && s.estate === rec.estate; });
    if (prev.length && !perLot) return 0;
    prev.forEach(function (s) { (s.lines || []).forEach(function (l) { sent[l.lot] = true; }); });
    var lots = {}, drivers = [], loaders = [];
    rec.lines.forEach(function (l) {
      if (l.task_code === 'ITF') { if (drivers.indexOf(l.worker_id) < 0) drivers.push(l.worker_id); String(l.lot || '').split(' ').filter(Boolean).forEach(function (n) { lots[n] = l.block; }); }
      if (l.task_code === 'LFF' && loaders.indexOf(l.worker_id) < 0) loaders.push(l.worker_id);
    });
    var fl = EA.fh.harvest.fieldLeft(rec.estate), lines = [];
    Object.keys(lots).forEach(function (n) { if (perLot && (!perLot[n] || sent[n])) return; if ((fl[n] || 0) > 0) lines.push({ lot: n, block: lots[n] || ((EA.lists.lot(rec.estate, n) || {}).block || ''), bunches: String(fl[n]), cleared: 'Y' }); });
    if (!lines.length) return 0;
    var cr = { date: rec.date, estate: rec.estate, at: at, tractor: drivers.join(' '), loader: loaders.join(' '), lines: lines, dispatch: null, ids: [], disIds: {}, lotIds: {}, fromWork: rec.chit };
    try {
      EA.batchStart();
      lines.forEach(function (l) {
        l.id = EA.save('FH_COLLECT', ROOM, rec.estate, { date: rec.date, block: l.block, lot: l.lot, bunches: l.bunches, cleared: 'Y', tractor: cr.tractor, loader: cr.loader, note: perLot ? 'Kerja ITF: petak habis dikutip' : 'Kerja ITF siap' }).id;
        cr.ids.push(l.id);
      });
      EA.batchEnd();
    } catch (e) { EA.batchCancel(); return 0; }
    all.push(cr); EA.local.set('fh.collect', all);
    return lines.reduce(function (a, l) { return a + Number(l.bunches); }, 0);
  }

  // ---------- the evening report ----------
  function reportText(rec, rev) {
    var d = new Date(rec.date + 'T00:00:00'), est = EA.lists.estate(rec.estate);
    var L = ['*KERJA HARIAN ' + (est ? est.company + ' ' : '') + rec.estate + '*' + (rev > 1 ? ' _(dibetulkan · corrected)_' : ''),
             ui().dayBm[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear()];
    // v1.43 (Yu Chen, 27 Oct: "looks unorganized"): no line starts with a space, a number or a bullet, so WhatsApp
    // never turns lines into lists or wraps them back to the edge. Each job starts with ✅ SIAP / ⏳ BELUM SIAP;
    // a job with details stands apart with a blank line.
    var lastSec = '', lastDetail = false;
    rec.jobs.forEach(function (j) {
      var sec = EA.lists.sectionOf(j.task_code);
      if (sec.code !== lastSec) { L.push(''); L.push('*' + sec.code + ' · ' + String(sec.bm).toUpperCase() + '* · ' + sec.en); L.push(''); lastSec = sec.code; lastDetail = false; }
      var k = kind(j.task_code, j.block), what;
      if (k === 'bunches') what = j.bunches + ' tandan (purata ' + Math.round(num(j.bunches) / (j.workers || 1)) + ')';
      else if (k === 'ticket') what = 'tan ikut tiket';
      else if (k === 'day') what = j.qty + ' hari' + (num(j.hours) > 0 ? ' · ' + j.hours + ' jam' : '') + (j.task_code === 'ITF' ? ' (+ tan ikut tiket)' : '');
      else what = j.qty + ' ' + unitLabel(j.task_code, j.block) + (j.plan_ha ? ' / ' + num(j.plan_ha).toFixed(2) + ' Ha' : '');
      var icon = j.status === 'done' ? '✅' : j.status === 'not_done' ? '⏳' : '❔';
      var D = [], lots = reportLots(j.progress), flags = String(j.flags || '').split('; ').filter(Boolean);
      if (lots.notDone.length) {
        if (lots.done.length) D.push('Petak siap: ' + lots.done.join(', '));
        D.push('BELUM SIAP: ' + lots.notDone.join(', '));
        if (lots.old && j.reason) D.push('Sebab: ' + j.reason);
      } else {
        if (lots.done.length) D.push('Petak: ' + lots.done.join(', ') + ' siap');
        if (j.status === 'not_done') D.push('BELUM SIAP' + (j.reason ? ': ' + j.reason : ''));
      }
      if (j.bags) D.push('Beg baja: ' + j.bags + (j.dose ? ' · dos ' + j.dose + ' kg/pokok' : ''));
      if (j.target && !flags.some(function (f) { return /sasaran/i.test(f); })) D.push('Sasaran: ' + j.target);
      flags.forEach(function (f) { D.push('⚠ ' + f.replace(/ · below target/, '')); });
      if ((D.length || lastDetail) && L[L.length - 1] !== '') L.push('');
      L.push(icon + ' *' + shortName(j.task_code) + (j.block ? ' · Blk ' + j.block : '') + '* — ' + j.workers + ' org · ' + what);
      D.forEach(function (x) { L.push(x); });
      lastDetail = D.length > 0;
    });
    L.push('');
    L.push('Disediakan: ' + (rec.keyedName || '') + ' · ' + rec.at);
    L.push('E-Book ' + (EA.RELEASE ? EA.RELEASE + ' · ' : '') + rec.chit);
    return L.join('\n');
  }
  // The lots of a job, finished and not: "3-30 siap, 3-31 belum siap (Hujan · sambung 28/10)" (1.41 on), or the
  // older "1-15:100% 1-16:50%".
  function reportLots(p) {
    var out = { done: [], notDone: [], old: false };
    p = String(p || '').trim();
    if (!p) return out;
    if (/%/.test(p) && !/ siap/.test(p)) {
      out.old = true;
      p.split(/[ ,]+/).filter(Boolean).forEach(function (x) { var m = x.split(':'); if (m[1] === '100%') out.done.push(m[0]); else out.notDone.push(m[0] + (m[1] ? ' (' + m[1] + ')' : '')); });
      return out;
    }
    p.split(/, (?=\S+ (?:siap|belum siap))/).forEach(function (x) {
      var m = x.match(/^(\S+) (siap|belum siap)\s*(.*)$/);
      if (!m) { out.done.push(x); return; }
      if (m[2] === 'siap') out.done.push(m[1]); else out.notDone.push(m[1] + (m[3] ? ' ' + m[3] : ''));
    });
    return out;
  }

  function savedCard(s) {
    var ids = s.rec.lines.map(function (l) { return l.id; }).concat(s.rec.jobs.map(function (j) { return j.id; }));
    var waiting = ids.some(function (i) { return i && EA.isWaiting(i); });
    var notDone = s.rec.jobs.filter(function (j) { return j.status === 'not_done'; }).length;
    var chitFixed = chit && chit.chit === s.chit && (chit.rev || 1) > (s.chitRev || 1);
    return (chitFixed ? '<p class="warn" id="wk-chitfixed"><span class="bm">Chit pagi ini dibetulkan selepas kerja harian disimpan. Tekan BETULKAN untuk kemas kini.</span>' +
      '<span class="en">The morning chit was corrected after the day\'s work was saved. Tap CORRECT to bring it up to date.</span></p>' : '') +
      '<section class="card" id="wk-saved"><div class="list-line"><div><b>' + esc(niceDate(s.date)) + ' · ' + esc(s.rec.at) + (s.rev > 1 ? ' · ' + EA.t('dibetulkan', 'corrected') : '') + '</b>' +
      '<span class="en">' + s.rec.jobs.length + EA.t(' kerja · ', ' jobs · ') + (s.rec.jobs.length - notDone) + EA.t(' siap · ', ' done · ') + notDone + EA.t(' belum siap', ' not done') + '</span></div>' +
      '<div class="acts"><span class="pill ' + (waiting ? 'wait">' + EA.t('Menunggu', 'Waiting') : 'ok">' + EA.t('Dihantar', 'Sent')) + '</span>' +
      '<button type="button" class="btn btn-ghost" id="wk-view">VIEW<small>Lihat</small></button>' +
      (canKey(ctx.user) ? '<button type="button" class="btn btn-ghost" id="wk-fix">CORRECT<small>Betulkan</small></button>' : '') + '</div></div>' + closeRow(s) + '</section>';
  }
  // v1.51.1: the day close sits on the saved day's card, so it is always one tap away (not only in the sheet after SAVE).
  function closeRow(s) {
    var st = EA.fh.dayclose && EA.fh.dayclose.cardState ? EA.fh.dayclose.cardState(s.estate, ctx.user, s.date) : { state: 'none' };
    if (st.state === 'closed') return '<p class="wk-closed"><b>✓ ' + EA.t('Hari ditutup', 'Day closed') + (st.at ? ' · ' + esc(st.at) : '') + '</b></p>';
    // v1.75: the button keeps its name; what is left to do goes on the line under it, not inside it.
    if (st.state === 'ready') return '<p class="hint">✓ ' + EA.t('Semua lengkap.', 'All complete.') + '</p>' +
      '<div class="actions"><button type="button" class="btn btn-ok" id="wk-close" data-date="' + esc(s.date) + '">' + EA.t('TUTUP HARI', 'CLOSE THE DAY') + '</button></div>';
    if (st.state === 'missing') return '<p class="hint">' + st.bad + EA.t(' perkara belum lengkap.', ' things not complete.') + '</p>' +
      '<div class="actions"><button type="button" class="btn btn-ghost wk-close-wait" id="wk-close" data-date="' + esc(s.date) + '">' + EA.t('TUTUP HARI', 'CLOSE THE DAY') + '</button></div>';
    return '';
  }

  function showReport(s) {
    if (!s) return;
    var text = reportText(s.rec, s.rev);
    var cb = EA.fh.closeBlock ? EA.fh.closeBlock(s.estate, ctx.user, s.date) : null;
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Laporan petang untuk WhatsApp</span><span class="en">Evening report for WhatsApp</span></h2>' +
      (cb ? cb.html : '') +
      '<pre class="chit">' + esc(text) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="rp-copy">COPY<small>Salin</small></button>' +
      '<button class="btn btn-ok" type="button" id="rp-wa">WHATSAPP<small>Hantar ke WhatsApp</small></button></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="rp-close">CLOSE<small>Tutup</small></button></div>',
      function (sh) {
        sh.querySelector('#rp-close').onclick = ui().closeSheet;
        if (cb) cb.wire(sh, function () { render(el, ctx); });
        sh.querySelector('#rp-copy').onclick = function () { EA.fh.copyText(text); };
        sh.querySelector('#rp-wa').onclick = function () {
          if (navigator.share) navigator.share({ text: text }).catch(function () {});
          else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
        };
      });
  }

  // Refresh the Waiting / Sent mark after sending.
  document.addEventListener('ea:sync', function () {
    if (!el || !document.body.contains(el) || el.hidden || !chit) return;
    var card = el.querySelector('#wk-saved'), s = savedFor(chit.chit);
    if (card && s) { var w0 = el.querySelector('#wk-chitfixed'); if (w0) w0.remove(); card.outerHTML = savedCard(s); wireTop(); }
  });

  EA.fh.work = { render: render, reportText: reportText };
})();
