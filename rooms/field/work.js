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
  function kind(code) {
    var t = task(code);
    if (!t) return 'day';
    if (code === EA.lists.HARVEST) return 'bunches';
    // Crop jobs (loaders) are paid from the mill ticket tonnes.
    if (t.unit === 'MT') return 'ticket';
    if (t.unit === 'day') return 'day';
    if (t.unit === 'hour') return 'hour';
    return 'qty';
  }
  function unitLabel(code) {
    var k = kind(code), t = task(code);
    return k === 'bunches' ? 'tandan' : k === 'day' ? 'hari' : k === 'hour' ? 'jam' : k === 'ticket' ? 'MT' : (t.unit === 'bag' ? 'beg' : t.unit === 'palm' ? 'pokok' : t.unit === 'seedling' ? 'anak benih' : t.unit);
  }

  // ---------- which chit ----------
  function chitsFor(estate) {
    var t = EA.today(), yd = daysAgo(1);     // the phone's own day (Malaysia), not UTC
    return EA.fh.allChits().filter(function (c) { return c.estate === estate && (c.date === t || c.date === yd); })
      .sort(function (a, b) { return (a.date + a.confirmedAt) < (b.date + b.confirmedAt) ? 1 : -1; });
  }
  // The jobs on a chit, each with the people present on it.
  function jobsOf(c) {
    var jobs = (c.jobs || []).map(function (j) { return { key: j.key, task: j.task, block: j.block, lots: j.lots || [], mandor: j.mandor, people: [], mandors: [] }; });
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
      d.prog = d.prog || {}; d.manual = d.manual || {}; d.bags = d.bags || {};
      // The morning chit was corrected after this draft began (v1.3): people added get their
      // lines, people taken off lose theirs; what was already keyed for the others stays.
      if ((d.chitRev || 1) !== (c.rev || 1)) {
        var fresh = freshDraft(c), keep = d.lines;
        d.lines = {};
        Object.keys(fresh.lines).forEach(function (w) { d.lines[w] = keep[w] || fresh.lines[w]; });
        Object.keys(fresh.status).forEach(function (k) { if (!d.status[k]) d.status[k] = fresh.status[k]; });
        Object.keys(fresh.prog).forEach(function (k) { if (!d.prog[k]) d.prog[k] = fresh.prog[k]; });
        d.chitRev = c.rev || 1;
      }
      return d;
    }
    return freshDraft(c);
  }
  function freshDraft(c) {
    var d = { chit: c.chit, chitRev: c.rev || 1, lines: {}, status: {}, checker: c.checker || '', replacing: '', prog: {}, manual: {}, bags: {} };
    var mine = ownLots();
    jobsOf(c).forEach(function (j) {
      j.people.forEach(function (w) {
        var k = kind(j.task);
        // A harvester keeps his own lot: the one he cut last time, when it is on today's job.
        var own = k === 'bunches' && mine[w] && j.lots.indexOf(mine[w]) >= 0 ? mine[w] : '';
        d.lines[w] = [{ lot: j.lots.length === 1 ? j.lots[0] : own, qty: k === 'day' ? '1' : '', bunches: '' }];
      });
      d.status[j.key] = { done: '', reason: '' };
      // Ha jobs (CPS, manuring, slashing): the morning's lots start as done (100%);
      // the staff changes only a lot that was not finished.
      if (kind(j.task) === 'qty' && task(j.task) && task(j.task).unit === 'Ha' && j.lots.length) {
        d.prog[j.key] = {}; j.lots.forEach(function (l) { d.prog[j.key][l] = '100'; });
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
  function targetOf(j) { var t = EA.lists.target && EA.lists.target(j.task, ctx.estate); return t ? { per: t.per, unit: t.unit, total: Math.round(t.per * j.people.length * 100) / 100 } : null; }
  function isBagTarget(j) { var t = targetOf(j); return !!(t && t.unit === 'bag' && task(j.task) && task(j.task).unit === 'Ha'); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[draft.chit]; EA.local.set(K.draft, all); }

  // ---------- Ha jobs: % of each lot, shared equally ----------
  // Staff do not remember lot sizes; they know how much of a lot is done.
  // Ha = lot size (from the map) x %; each person on the job gets an equal share.
  // "Set per person" switches to keying each person's Ha by hand.
  function isHa(j) { return kind(j.task) === 'qty' && task(j.task) && task(j.task).unit === 'Ha'; }
  function auto(j) { return isHa(j) && !draft.manual[j.key]; }
  function progLots(j) {
    var p = draft.prog[j.key] || {}, out = j.lots.slice();
    Object.keys(p).forEach(function (l) { if (out.indexOf(l) < 0) out.push(l); });
    return out;
  }
  function lotHa(lot) { var l = EA.lists.lot(ctx.estate, lot); return l ? l.ha : 0; }
  function shareOut(j) {           // fill each person's lines from the lot %
    var p = draft.prog[j.key] || {}, n = j.people.length || 1;
    var done = progLots(j).filter(function (l) { return num(p[l]) > 0; });
    j.people.forEach(function (w) {
      draft.lines[w] = done.length ? done.map(function (l) {
        return { lot: l, qty: String(Math.round(lotHa(l) * Math.min(num(p[l]), 100) / 100 / n * 1000) / 1000), bunches: '' };
      }) : [{ lot: '', qty: '', bunches: '' }];
    });
  }
  function progText(j) {
    var p = draft.prog[j.key] || {};
    return progLots(j).filter(function (l) { return num(p[l]) > 0; }).map(function (l) { return l + ':' + num(p[l]) + '%'; }).join(' ');
  }

  // ---------- totals and flags ----------
  function jobTotals(j) {
    var k = kind(j.task), qty = 0, bunches = 0, byLot = {}, flags = [];
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
      if (isBagTarget(j)) { var bg = (draft.bags || {})[j.key]; actual = String(bg == null ? '' : bg).trim() === '' ? null : num(bg); unit = 'beg'; }
      else if (tg.unit === (task(j.task) || {}).unit && k === 'qty') { actual = r2(qty); unit = tg.unit; }
      if (actual != null && actual < tg.total - 0.005) flags.push({ text: 'Bawah sasaran · below target: ' + actual + ' / ' + tg.total + ' ' + unit + ' (' + j.people.length + ' × ' + tg.per + ')', bad: true });
    }
    return { qty: r2(qty), bunches: bunches, byLot: byLot, flags: flags, planHa: r2(planHa), target: tg, actual: actual, tunit: unit };
  }

  // ---------- the screen ----------
  function render(container, c) {
    el = container; ctx = c;
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
      list.map(function (x) { return '<option value="' + esc(x.chit) + '"' + (x.chit === chit.chit ? ' selected' : '') + '>' + esc(niceDate(x.date) + ' · Chit ' + x.chit.split('-').pop() + ' · ' + x.confirmedAt) + '</option>'; }).join('') + '</select></div>' : '';

    if (done && !draft.replacing) {
      el.innerHTML = head + chooser +
        '<p class="msg ok-msg"><span class="bm">Kerja harian untuk chit ini sudah disimpan.</span><span class="en">The day\'s work for this chit is saved.</span></p>' +
        savedCard(done);
      wireTop();
      return;
    }
    if (!canKey(ctx.user)) { el.innerHTML = head + '<div class="card"><p class="hint">' + EA.t('Pandangan pejabat akan datang kemudian.', 'The office view comes later.') + '</p></div>'; wireTop(); return; }

    var jobs = jobsOf(chit);
    el.innerHTML = head + chooser +
      '<p class="hint">' + EA.t('Dari chit pagi ', 'From the morning chit of ') + esc(niceDate(chit.date)) + ' · ' + jobs.reduce(function (a, j) { return a + j.people.length; }, 0) + EA.t(' orang bekerja, ', ' people working, ') + jobs.length + EA.t(' kerja.', ' jobs.') + '</p>' +
      (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan kerja harian. Rekod lama kekal; yang baru menggantikannya.</span><span class="en">Correcting the day\'s work. The old record stays; this one replaces it.</span></p>' : '') +
      jobs.map(jobCard).join('') +
      '<section class="card"><h2><span class="inline"><span class="bm">Laporan petang</span> · <span class="en">Evening report</span></span></h2><pre class="chit" id="wk-preview"></pre></section>' +
      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="wk-check">SAVE<small>Simpan kerja harian</small></button></div>';
    wireTop();
    wireJobs(jobs);
    $('#wk-check').onclick = function () { check(jobs); };
    refresh(jobs);
  }

  function progBlock(j) {
    var p = draft.prog[j.key] || {};
    var others = EA.lists.lotsFor(ctx.estate, j.block).filter(function (l) { return progLots(j).indexOf(l.lot) < 0; });
    return '<div class="field"><span class="inline"><span class="bm">Berapa banyak petak siap?</span> · <span class="en">How much of each lot is done?</span></span>' +
      '<p class="hint">' + EA.t('Diisi 100% dari rancangan pagi; ubah hanya petak yang belum siap.', 'Filled at 100% from the morning plan; change only a lot not finished.') + '</p>' +
      progLots(j).map(function (lot) {
        var v = p[lot] || '', ha = lotHa(lot);
        return '<div class="wline"><b class="mono">' + esc(lot) + '</b><span class="hint">' + ha.toFixed(2) + ' Ha</span>' +
          '<div class="seg">' + [25, 50, 75, 100].map(function (x) { return '<button type="button" data-pj="' + j.key + '" data-pl="' + esc(lot) + '" data-pv="' + x + '" aria-pressed="' + (num(v) === x) + '">' + x + '%</button>'; }).join('') + '</div>' +
          '<input class="qty" style="width:4.5em" inputmode="numeric" data-pj="' + j.key + '" data-pl="' + esc(lot) + '" value="' + esc(v) + '" placeholder="%">' +
          '<span data-pha="' + j.key + '|' + esc(lot) + '">= ' + (Math.round(ha * Math.min(num(v), 100)) / 100).toFixed(2) + ' Ha</span></div>';
      }).join('') +
      (others.length ? '<div class="wline"><select class="text-input" data-paddlot="' + j.key + '"><option value="">' + EA.t('+ Petak lain', '+ Another lot') + '</option>' +
        others.map(function (l) { return '<option>' + l.lot + '</option>'; }).join('') + '</select></div>' : '') + '</div>';
  }

  function jobCard(j) {
    var k = kind(j.task), sec = EA.lists.sectionOf(j.task), st = draft.status[j.key] || { done: '', reason: '' };
    if (auto(j)) shareOut(j);
    var lotsText = j.lots.length ? EA.t('Petak ', 'Lot ') + j.lots.join(', ') + ' · ' + jobTotals(j).planHa.toFixed(2) + ' Ha' : '';
    var lines = j.people.map(function (w) {
      var wl = draft.lines[w] || [];
      if (auto(j)) {
        var tot = wl.reduce(function (a, l) { return a + num(l.qty); }, 0);
        return '<div class="wrow"><div class="who-w"><b>' + esc(person(w)) + '</b><span class="en">' + esc(w) + '</span></div>' +
          '<div class="mono" data-share="' + w + '">' + (Math.round(tot * 1000) / 1000) + ' Ha</div></div>';
      }
      var rows = k === 'ticket' ? '<span class="hint">' + EA.t('Ikut tiket kilang', 'From the mill ticket') + '</span>' :
        wl.map(function (l, i) {
          var lotSel = j.lots.length > 1 ? '<select class="text-input" data-w="' + w + '" data-i="' + i + '" data-f="lot"><option value="">' + EA.t('Petak?', 'Lot?') + '</option>' +
            j.lots.map(function (n) { return '<option' + (n === l.lot ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>' : (j.lots[0] ? '<span class="mono">' + esc(j.lots[0]) + '</span>' : '');
          var input = k === 'day'
            ? '<div class="seg"><button type="button" data-w="' + w + '" data-i="' + i + '" data-day="1" aria-pressed="' + (l.qty === '1') + '">1</button><button type="button" data-w="' + w + '" data-i="' + i + '" data-day="0.5" aria-pressed="' + (l.qty === '0.5') + '">½</button></div> hari'
            : '<input class="qty" inputmode="decimal" data-w="' + w + '" data-i="' + i + '" data-f="' + (k === 'bunches' ? 'bunches' : 'qty') + '" value="' + esc(k === 'bunches' ? l.bunches : l.qty) + '" placeholder="0"> ' + esc(unitLabel(j.task));
          return '<div class="wline">' + lotSel + input + (i > 0 ? '<button type="button" class="link-btn" data-w="' + w + '" data-del="' + i + '">' + EA.t('buang', 'remove') + '</button>' : '') + '</div>';
        }).join('') + (j.lots.length > 1 && k !== 'day' ? '<button type="button" class="link-btn" data-w="' + w + '" data-add="1">' + EA.t('+ petak lain', '+ another lot') + '</button>' : '');
      return '<div class="wrow"><div class="who-w"><b>' + esc(person(w)) + '</b><span class="en">' + esc(w) + '</span></div><div></div><div class="job" style="display:block">' + rows + '</div></div>';
    }).join('');
    lines = j.mandors.map(function (m) {
      return '<div class="wrow"><div class="who-w"><b>' + esc(person(m)) + '</b><span class="en">' + esc(m) + ' · Mandor · ' + EA.t('ikut kumpulan', 'goes by the gang') + '</span></div><div></div></div>';
    }).join('') + lines;
    return '<section class="card" data-job="' + j.key + '"><h2>' + esc(sec.code + '. ' + jobName(j.task)) + (j.block ? ' · Blok ' + esc(j.block) : '') + '</h2>' +
      '<p class="hint">' + esc(j.task) + (lotsText ? ' · ' + esc(lotsText) : '') + (j.mandor ? ' · Mandor ' + esc(person(j.mandor)) : '') + '</p>' +
      (isBagTarget(j) ? '<div class="wline"><label class="inline-label">' + EA.t('Beg baja digunakan (kumpulan) ', 'Bags used by the gang ') + '<input class="qty" inputmode="numeric" data-bags="' + j.key + '" value="' + esc((draft.bags || {})[j.key] || '') + '"></label>' +
        '<span class="hint">' + EA.t('sasaran ', 'target ') + targetOf(j).total + EA.t(' beg', ' bags') + '</span></div>' : '') +
      (isHa(j) ? progBlock(j) +
        '<div class="wline"><span class="hint">' + (auto(j) ? EA.t('Dibahagi sama rata.', 'Shared equally.') : EA.t('Diisi seorang-seorang.', 'Keyed per person.')) + '</span>' +
        '<button type="button" class="btn btn-ghost" data-manual="' + j.key + '">' + (auto(j) ? 'SET PER PERSON<small>Isi seorang-seorang</small>' : 'EQUAL SHARE<small>Kembali sama rata</small>') + '</button></div>' : '') +
      (k !== 'ticket' && k !== 'day' && !auto(j) && !isHa(j) ? '<div class="wline"><span class="hint">' + EA.t('Isi sama untuk semua yang kosong:', 'Fill the same for everyone empty:') + '</span><input class="qty" inputmode="decimal" data-fill="' + j.key + '" placeholder="0"> ' + esc(unitLabel(j.task)) + '<button type="button" class="btn btn-ghost" data-fillgo="' + j.key + '">FILL<small>Isi</small></button></div>' : '') +
      '<div class="rows">' + lines + '</div>' +
      '<p class="hint" data-tot="' + j.key + '"></p><div data-flags="' + j.key + '"></div>' +
      '<div class="field"><span class="inline"><span class="bm">Kerja ini</span> · <span class="en">This job</span></span>' +
        '<div class="seg"><button type="button" data-st="' + j.key + '" data-v="Y" aria-pressed="' + (st.done === 'Y') + '" style="min-width:110px">' + EA.t('SIAP', 'DONE') + '</button>' +
        '<button type="button" data-st="' + j.key + '" data-v="N" aria-pressed="' + (st.done === 'N') + '" style="min-width:140px">' + EA.t('BELUM SIAP', 'NOT DONE') + '</button></div></div>' +
      '<div class="field" data-reasonbox="' + j.key + '"' + (st.done === 'N' ? '' : ' hidden') + '><label><span class="bm">Sebab & tindakan</span><span class="en">Why, and what will be done (counter-measure)</span></label>' +
        '<textarea class="text-input" rows="2" data-reason="' + j.key + '" placeholder="' + EA.t('cth: hujan 2 petang; sambung esok dengan 2 orang lagi', 'e.g. rain at 2pm; continue tomorrow with 2 more people') + '">' + esc(st.reason) + '</textarea></div>' +
      '</section>';
  }

  function wireTop() {
    $('#wk-back').onclick = function () { location.hash = ''; };
    var sel = $('#wk-chit');
    if (sel) sel.onchange = function () { EA.local.set('fh.workchit', this.value); render(el, ctx); };
    var fix = $('#wk-fix');
    if (fix) fix.onclick = function () {
      var s = savedFor(chit.chit);
      draft = { chit: chit.chit, lines: JSON.parse(JSON.stringify(s.lines)), status: JSON.parse(JSON.stringify(s.status)), checker: s.checker, replacing: s.chit,
                prog: JSON.parse(JSON.stringify(s.prog || {})), manual: JSON.parse(JSON.stringify(s.manual || {})), bags: JSON.parse(JSON.stringify(s.bags || {})), chitRev: s.chitRev || 1 };
      keepDraft(); render(el, ctx);
    };
    var view = $('#wk-view');
    if (view) view.onclick = function () { showReport(savedFor(chit.chit)); };
  }

  function wireJobs(jobs) {
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
    el.querySelectorAll('[data-day]').forEach(function (b) {
      b.onclick = function () {
        draft.lines[b.dataset.w][Number(b.dataset.i)].qty = b.dataset.day;
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        keepDraft(); refresh(jobs);
      };
    });
    el.querySelectorAll('[data-add]').forEach(function (b) {
      b.onclick = function () { draft.lines[b.dataset.w].push({ lot: '', qty: '', bunches: '' }); keepDraft(); render(el, ctx); };
    });
    el.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () { draft.lines[b.dataset.w].splice(Number(b.dataset.del), 1); keepDraft(); render(el, ctx); };
    });
    el.querySelectorAll('[data-fillgo]').forEach(function (b) {
      b.onclick = function () {
        var key = b.dataset.fillgo, v = el.querySelector('[data-fill="' + key + '"]').value.replace(/[^\d.,]/g, '');
        if (!v) return;
        var j = jobs.find(function (x) { return x.key === key; }), f = kind(j.task) === 'bunches' ? 'bunches' : 'qty';
        j.people.forEach(function (w) { draft.lines[w].forEach(function (l) { if (!l[f]) l[f] = v; }); });
        keepDraft(); render(el, ctx);
      };
    });
    function jobByKey(key) { return jobs.find(function (x) { return x.key === key; }); }
    function setPct(key, lot, v) {
      draft.prog[key] = draft.prog[key] || {};
      draft.prog[key][lot] = v === '' ? '' : String(Math.min(100, Math.max(0, Math.round(num(v)))));
      var j = jobByKey(key); shareOut(j); keepDraft();
    }
    el.querySelectorAll('button[data-pj]').forEach(function (b) {
      b.onclick = function () { setPct(b.dataset.pj, b.dataset.pl, b.dataset.pv); render(el, ctx); };
    });
    el.querySelectorAll('input[data-pj]').forEach(function (i) {
      i.oninput = function () {
        setPct(i.dataset.pj, i.dataset.pl, i.value.replace(/\D/g, ''));
        var j = jobByKey(i.dataset.pj), v = num((draft.prog[j.key] || {})[i.dataset.pl]);
        var span = el.querySelector('[data-pha="' + j.key + '|' + i.dataset.pl + '"]'); if (span) span.textContent = '= ' + (Math.round(lotHa(i.dataset.pl) * v) / 100).toFixed(2) + ' Ha';
        j.people.forEach(function (w) { var s = el.querySelector('[data-share="' + w + '"]'); if (s) s.textContent = (Math.round(draft.lines[w].reduce(function (a, l) { return a + num(l.qty); }, 0) * 1000) / 1000) + ' Ha'; });
        refresh(jobs);
      };
    });
    el.querySelectorAll('[data-paddlot]').forEach(function (s) {
      s.onchange = function () { if (!this.value) return; draft.prog[s.dataset.paddlot] = draft.prog[s.dataset.paddlot] || {}; draft.prog[s.dataset.paddlot][this.value] = ''; keepDraft(); render(el, ctx); };
    });
    el.querySelectorAll('[data-manual]').forEach(function (b) {
      b.onclick = function () { var key = b.dataset.manual; draft.manual[key] = !draft.manual[key]; if (!draft.manual[key]) shareOut(jobByKey(key)); keepDraft(); render(el, ctx); };
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
      var t = jobTotals(j), k = kind(j.task);
      var orang = EA.t(' orang · ', ' people · ');
      var line = k === 'bunches' ? j.people.length + orang + t.bunches + EA.t(' tandan · purata ', ' bunches · average ') + (j.people.length ? Math.round(t.bunches / j.people.length) : 0) + EA.t(' seorang', ' each')
        : k === 'day' ? j.people.length + orang + t.qty + EA.t(' hari', ' days')
        : k === 'ticket' ? j.people.length + orang + EA.t('tan ikut tiket kilang', 'tonnes per mill ticket')
        : j.people.length + orang + t.qty + ' ' + unitLabel(j.task) + (task(j.task).unit === 'Ha' && t.planHa ? EA.t(' daripada ', ' of ') + t.planHa.toFixed(2) + EA.t(' Ha dirancang', ' Ha planned') : '');
      if (t.target && t.actual != null) line += ' · ' + EA.t('sasaran ', 'target ') + t.target.total + ' ' + t.tunit;
      var tot = el.querySelector('[data-tot="' + j.key + '"]'); if (tot) tot.textContent = EA.t('Jumlah: ', 'Total: ') + line;
      var fl = el.querySelector('[data-flags="' + j.key + '"]');
      if (fl) fl.innerHTML = t.flags.map(function (f) { return '<p class="flag' + (f.bad ? ' bad' : '') + '">' + esc(f.text) + '</p>'; }).join('');
    });
    var pv = $('#wk-preview'); if (pv) pv.textContent = reportText(buildRecord(EA.t('(belum disimpan)', '(not saved yet)'), EA.ui.hhmm(new Date()), draft.checker));
  }

  // ---------- check, confirm, save ----------
  function problems(jobs) {
    var p = [];
    jobs.forEach(function (j) {
      var k = kind(j.task), st = draft.status[j.key] || {};
      if (auto(j)) {
        if (!progText(j) && st.done !== 'N') p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': isi % petak yang siap', 'Fill how much of each lot is done']);
      } else if (k !== 'ticket') {
        var empty = j.people.filter(function (w) {
          var ls = draft.lines[w] || [];
          return !ls.length || ls.some(function (l) { return (j.lots.length > 1 && !l.lot) || !(num(k === 'bunches' ? l.bunches : l.qty) > 0); });
        });
        if (empty.length) p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': belum lengkap untuk ' + empty.map(person).join(', '), 'Quantity or lot missing']);
      }
      if (!st.done) p.push([shortName(j.task) + (j.block ? ' Blk ' + j.block : '') + ': pilih SIAP atau BELUM SIAP', 'Mark the job done or not done']);
      if (st.done === 'N' && String(st.reason || '').trim().length < 5) p.push([shortName(j.task) + ': tulis sebab dan tindakan', 'Write why and what will be done']);

    });
    return p;
  }

  function check(jobs) {
    var p = problems(jobs);
    if (p.length) {
      ui().openSheet('<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
        p.map(function (x) { return '<p class="msg"><span class="bm">' + esc(x[0]) + '</span><span class="en">' + esc(x[1]) + '</span></p>'; }).join('') +
        '<div class="actions"><button class="btn btn-main" type="button" id="wp-ok">OK<small>Betulkan</small></button></div>',
        function (s) { s.querySelector('#wp-ok').onclick = ui().closeSheet; });
      return;
    }
    var red = [];
    jobs.forEach(function (j) { jobTotals(j).flags.forEach(function (f) { if (f.bad) red.push(f.text); }); });
    // v1.27 A · Semak sebelum simpan: a harvester's bunches far too few or far too many on a lot.
    var cks = [];
    jobs.forEach(function (j) {
      if (kind(j.task) !== 'bunches') return;
      j.people.forEach(function (w) {
        (draft.lines[w] || []).forEach(function (l) {
          var b = num(l.bunches);
          if (b > 0 && (b < EA.lists.bunchCheck.low || b > EA.lists.bunchCheck.high)) cks.push({ ref: w, bm: person(w) + ': ' + b + EA.t(' tandan', ' bunches') + (l.lot ? EA.t(' di petak ', ' on lot ') + l.lot : '') + ' — ' + (b < EA.lists.bunchCheck.low ? EA.t('terlalu sedikit', 'very few') : EA.t('terlalu banyak', 'very many')) + '?' });
        });
      });
    });
    draft.checks = cks;
    // v1.1: the staff saves directly (no mandor confirmation on the phone for now).
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Semak kerja hari ini</span><span class="en">Check today\'s work, then save</span></h2>' +
      (cks.length ? '<h3 class="ck-h">' + EA.t('Semak dulu · betul?', 'Check first · right?') + '</h3>' + cks.map(function (c) { return '<div class="ck-warn"><b>' + esc(c.bm) + '</b>' + EA.t('Jika betul, simpan. Kerani akan semak.', 'If right, save. The clerk will check.') + '</div>'; }).join('') : '') +
      (red.length ? '<div class="msg"><span class="bm">Perhatian: ' + esc(red.join('; ')) + '</span><span class="en">These go into the report for the Assistant Manager and HQ to see. If the map size of a lot is wrong, tell HQ.</span></div>' : '') +
      '<pre class="chit">' + esc(reportText(buildRecord('(belum disimpan)', EA.ui.hhmm(new Date()), ctx.user.code))) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="wc-back">‹ CHANGE<small>‹ UBAH</small></button>' +
      '<button class="btn btn-ok" type="button" id="wc-ok">SAVE<small>Simpan</small></button></div>',
      function (s) {
        s.querySelector('#wc-back').onclick = ui().closeSheet;
        s.querySelector('#wc-ok').onclick = function () { draft.checker = ctx.user.code; keepDraft(); ui().closeSheet(); save(jobs); };
      });
  }

  // One record of the day's work: lines per person per lot, and one line per job.
  function buildRecord(label, at, checker) {
    var jobs = jobsOf(chit), lines = [], jobLines = [];
    jobs.forEach(function (j) {
      var k = kind(j.task), t = jobTotals(j), st = draft.status[j.key] || {};
      j.people.forEach(function (w) {
        if (k === 'ticket') { lines.push({ worker_id: w, task_code: j.task, block: j.block, lot: j.lots.join(' '), qty: '', unit: 'MT', bunches: '' }); return; }
        (draft.lines[w] || []).forEach(function (l) {
          lines.push({ worker_id: w, task_code: j.task, block: j.block, lot: l.lot || j.lots[0] || '', qty: k === 'bunches' ? '' : String(num(l.qty)),
                       unit: k === 'bunches' ? 'bunch' : (task(j.task).unit), bunches: k === 'bunches' ? String(num(l.bunches)) : '' });
        });
      });
      jobLines.push({ key: j.key, task_code: j.task, block: j.block, lots: j.lots.join(' '), workers: j.people.length,
                      qty: k === 'bunches' || k === 'ticket' ? '' : String(t.qty), unit: k === 'bunches' ? 'bunch' : task(j.task).unit,
                      bunches: k === 'bunches' ? String(t.bunches) : '', plan_ha: t.planHa ? String(t.planHa) : '',
                      status: st.done === 'Y' ? 'done' : st.done === 'N' ? 'not_done' : '', reason: st.reason || '',
                      flags: t.flags.map(function (f) { return f.text; }).join('; '), progress: isHa(j) ? progText(j) : '',
                      bags: isBagTarget(j) && String((draft.bags || {})[j.key] == null ? '' : draft.bags[j.key]).trim() !== '' ? String(num(draft.bags[j.key])) : '', target: t.target ? String(t.target.total) + ' ' + (t.tunit || t.target.unit) : '' });
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
        if (o && o.qty === l.qty && o.bunches === l.bunches) { l.id = o.id; delete oldLines[key]; return; }
        l.id = EA.save(TAB, ROOM, ctx.estate, { date: rec.date, chit: rec.chit, worker_id: l.worker_id, task_code: l.task_code, block: l.block, lot: l.lot,
          qty: l.qty, unit: l.unit, bunches: l.bunches, confirmed_by: rec.checker, confirmed_at: stamp, note: '' }, o ? o.id : '').id;
        // v1.3: the line's earlier versions (id and bunches), so a lorry that already took the old
        // line still counts against the corrected one (no lot counted twice).
        if (o) l.hist = (o.hist || []).concat([[o.id, o.bunches]]);
        delete oldLines[key];
      });
      Object.keys(oldLines).forEach(function (key) {
        var o = oldLines[key];
        EA.save(TAB, ROOM, ctx.estate, { date: rec.date, chit: rec.chit, worker_id: o.worker_id, task_code: o.task_code, block: o.block, lot: o.lot,
          qty: o.qty, unit: o.unit, bunches: o.bunches, confirmed_by: rec.checker, confirmed_at: stamp, note: 'removed in correction' }, o.id, 'removed');
      });
      var oldJobs = {};
      if (old) old.rec.jobs.forEach(function (j) { oldJobs[j.task_code + '|' + j.block + '|' + j.lots] = j; });
      rec.jobs.forEach(function (j) {
        var o = oldJobs[j.task_code + '|' + j.block + '|' + j.lots];
        if (o && o.qty === j.qty && o.bunches === j.bunches && o.status === j.status && o.reason === j.reason && o.workers === j.workers && o.bags === j.bags) { j.id = o.id; return; }
        j.id = EA.save(TAB_JOB, ROOM, ctx.estate, { date: rec.date, chit: rec.chit, task_code: j.task_code, block: j.block, lots: j.lots, workers: j.workers,
          qty: j.qty, unit: j.unit, bunches: j.bunches, plan_ha: j.plan_ha, job_status: j.status, reason: j.reason, flags: j.flags, progress: j.progress,
          bags: j.bags, target: j.target, confirmed_by: rec.checker, confirmed_at: stamp }, o ? o.id : '').id;
      });
      // v1.27: warnings the staff saved anyway go to the clerk (kind "check").
      (draft.checks || []).forEach(function (k) {
        EA.save('FH_ALERT', ROOM, ctx.estate, { date: rec.date, chit: rec.chit, kind: 'check', block: '', lot: '', detail: k.bm, staff_note: 'Ya, betul (disimpan juga)', direction: '', direction_by: '', ref: k.ref || '' });
      });
      EA.batchEnd();
    } catch (e) { EA.batchCancel(); ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad'); return; }
    keepSaved({ chit: rec.chit, date: rec.date, estate: rec.estate, rec: rec, lines: draft.lines, status: draft.status, prog: draft.prog, manual: draft.manual, bags: draft.bags || {}, checker: draft.checker, rev: old ? (old.rev || 1) + 1 : 1, chitRev: chit.rev || 1 });
    dropDraft();
    ui().toast(EA.t('Kerja harian disimpan', 'Day\'s work saved'));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
    showReport(savedFor(rec.chit));
  }

  // ---------- the evening report ----------
  function reportText(rec, rev) {
    var d = new Date(rec.date + 'T00:00:00'), est = EA.lists.estate(rec.estate);
    var L = ['*KERJA HARIAN ' + (est ? est.company + ' ' : '') + rec.estate + '*' + (rev > 1 ? ' _(dibetulkan · corrected)_' : ''),
             ui().dayBm[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear()];
    var lastSec = '';
    rec.jobs.forEach(function (j) {
      var sec = EA.lists.sectionOf(j.task_code);
      if (sec.code !== lastSec) { L.push(''); L.push(sec.code + '. ' + sec.en); lastSec = sec.code; }
      var k = kind(j.task_code), what;
      if (k === 'bunches') what = j.bunches + ' tandan (purata ' + Math.round(num(j.bunches) / (j.workers || 1)) + ')';
      else if (k === 'ticket') what = 'tan ikut tiket';
      else if (k === 'day') what = j.qty + ' hari';
      else what = j.qty + ' ' + unitLabel(j.task_code) + (j.plan_ha ? ' / ' + num(j.plan_ha).toFixed(2) + ' Ha' : '');
      L.push('• ' + shortName(j.task_code) + (j.block ? ' Blk ' + j.block : '') + ' — ' + j.workers + ' org — ' + what + ' — ' +
             (j.status === 'done' ? 'SIAP' : j.status === 'not_done' ? 'BELUM SIAP' : '?'));
      if (j.progress) L.push('   Petak: ' + j.progress.replace(/ /g, ', '));
      if (j.bags) L.push('   Beg baja: ' + j.bags);
      if (j.target) L.push('   Sasaran: ' + j.target);
      if (j.status === 'not_done' && j.reason) L.push('   Sebab/tindakan: ' + j.reason);
      if (j.flags) L.push('   Perhatian: ' + j.flags);
    });
    L.push('');
    L.push('Disediakan: ' + (rec.keyedName || '') + ' · ' + rec.at);
    L.push('E-Book ' + rec.chit);
    return L.join('\n');
  }

  function savedCard(s) {
    var ids = s.rec.lines.map(function (l) { return l.id; }).concat(s.rec.jobs.map(function (j) { return j.id; }));
    var waiting = ids.some(function (i) { return i && EA.isWaiting(i); });
    var notDone = s.rec.jobs.filter(function (j) { return j.status === 'not_done'; }).length;
    var chitFixed = chit && chit.chit === s.chit && (chit.rev || 1) > (s.chitRev || 1);
    return (chitFixed ? '<p class="warn" id="wk-chitfixed"><span class="bm">Chit pagi ini dibetulkan selepas kerja harian disimpan. Tekan CORRECT untuk kemas kini.</span>' +
      '<span class="en">The morning chit was corrected after the day\'s work was saved. Tap CORRECT to bring it up to date.</span></p>' : '') +
      '<section class="card" id="wk-saved"><div class="list-line"><div><b>' + esc(niceDate(s.date)) + ' · ' + esc(s.rec.at) + (s.rev > 1 ? ' · ' + EA.t('dibetulkan', 'corrected') : '') + '</b>' +
      '<span class="en">' + s.rec.jobs.length + EA.t(' kerja · ', ' jobs · ') + (s.rec.jobs.length - notDone) + EA.t(' siap · ', ' done · ') + notDone + EA.t(' belum siap', ' not done') + '</span></div>' +
      '<div class="acts"><span class="pill ' + (waiting ? 'wait">' + EA.t('Menunggu', 'Waiting') : 'ok">' + EA.t('Dihantar', 'Sent')) + '</span>' +
      '<button type="button" class="btn btn-ghost" id="wk-view">VIEW<small>Lihat</small></button>' +
      (canKey(ctx.user) ? '<button type="button" class="btn btn-ghost" id="wk-fix">CORRECT<small>Betulkan</small></button>' : '') + '</div></div></section>';
  }

  function showReport(s) {
    if (!s) return;
    var text = reportText(s.rec, s.rev);
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Laporan petang untuk WhatsApp</span><span class="en">Evening report for WhatsApp</span></h2>' +
      '<pre class="chit">' + esc(text) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="rp-copy">COPY<small>Salin</small></button>' +
      '<button class="btn btn-ok" type="button" id="rp-wa">WHATSAPP<small>Hantar ke WhatsApp</small></button></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="rp-close">CLOSE<small>Tutup</small></button></div>',
      function (sh) {
        sh.querySelector('#rp-close').onclick = ui().closeSheet;
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
