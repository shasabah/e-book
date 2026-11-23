// Field & Harvest room — TUTUP HARI (day close), v1.43. Room code DCL.
// From the brief "Rancangan & Prestasi" §4–5, approved by Yu Chen 26 Oct 2026. Live at Sugut from November 2026.
//
// At the end of the day the Staf bertugas presses TUTUP HARI. Before the day closes the phone checks it is complete:
//   1. v1.51: every worker on the estate list has a pay line: on the chit, and a work line with its quantity, or
//      1 / ½ day (every durian farm job is by the day), or S / C / T. Letters as the checkroll: P, 1, ½, S, L, X;
//   2. harvest lots are keyed and collected to the ramp, or the backlog is explained;
//   3. every lorry that went has its delivery note;
//   4. work that differs from the morning chit has a reason (a job BELUM SIAP with no reason, or not answered);
//   5. rain timing and reason fit the jobs' rain groups (rain is a reason, never a reading);
//   6. records are keyed (anything still waiting goes with the close in the same send).
// If something is missing the phone lists it; tapping a line opens the screen to fix it. The day stays open.
// After the close: a day summary (plan against actual) for the "Ebook" WhatsApp group; the office locks the day
// (changes only through MINTA BETULKAN CHIT / C2 within 3 days); the mill ticket never blocks the close.
// Deadline: before the next working day's chit (no 9 pm rule). A rain reason is kept only when some job fell short.
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};
  var TAB = 'FH_DAYCLOSE', ROOM = 'DCL';
  var K = { saved: 'fh.dayclose', draft: 'fh.daydraft', office: 'fh.dayclose.office.' };

  var el, ctx, day;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  // v1.81 Rule 7: the day and month follow the phone's language (see muster.js dayDm).
  function niceDate(iso) { var d = new Date(iso + 'T00:00:00'); return EA.t(ui().dayBm, ui().dayEn)[d.getDay()] + ' ' + d.getDate() + ' ' + EA.t(ui().monBm, ui().monEn)[d.getMonth()]; }
  // v1.78: the day row needs the date short and the day name under it — 20/11 above Jumaat.
  function dayDm(iso) { var d = new Date(iso + 'T00:00:00'); return d.getDate() + '/' + (d.getMonth() + 1); }
  function dayName(iso) { return EA.t(ui().dayBm, ui().dayEn)[new Date(iso + 'T00:00:00').getDay()]; }
  function addDays(date, n) { var d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function task(code) { return EA.lists.task(code); }
  function shortName(code) { return (EA.lists.chitNames && EA.lists.chitNames[code]) || (task(code) ? task(code).en : code); }
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }
  function rainOf(code) { return EA.lists.rainOf ? EA.lists.rainOf(code) : 'B'; }
  // ---------- v1.51 pay lines (Yu Chen, 5 Nov; Decisions Log 5 Nov; doc "Muster ke Gaji") ----------
  // Every worker on the estate list gets one letter a day, the same letters as the checkroll:
  // P piece work (paid on the quantity) · 1 / ½ day work · S sick · L leave (chit C) · X absent (chit T).
  // Piece work is never a half day. Every job at the durian farm is by the day. Rates and RM stay in the office.
  var AWAY = { S: 'S', C: 'L', T: 'X' };
  function durianBlock(estate) { var d = EA.lists.durian && EA.lists.durian[estate]; return d ? d.block : ''; }
  var OP_JOBS = ['OPH', 'OPR', 'OPF'];
  function payKind(estate, l) {
    var t = task(l.task_code);
    if (l.block && String(l.block) === durianBlock(estate)) return 'day';
    if (OP_JOBS.indexOf(l.task_code) >= 0) return 'hour';
    if (l.task_code === EA.lists.HARVEST) return 'bunches';
    if (!t || t.unit === 'day') return 'day';
    if (t.unit === 'MT') return 'ticket';
    return 'qty';
  }
  function unitWord(estate, l) {
    var k = payKind(estate, l), t = task(l.task_code) || {};
    return k === 'bunches' ? 'tandan' : k === 'day' ? 'hari' : k === 'hour' ? 'jam' : k === 'ticket' ? 'MT' : (t.unit === 'bag' ? 'beg' : t.unit === 'palm' ? 'pokok' : t.unit || '');
  }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  // Everyone the phone's list says works at this estate today (workers and mandors).
  function listed(estate) { return (EA.lists.mandorsFor ? EA.lists.mandorsFor(estate) : []).concat(EA.lists.workersFor ? EA.lists.workersFor(estate) : []); }
  // The pay lines of a day: one per person on the day's chits, with the problems that stop the close.
  function payLines(estate, c, lines) {
    var rows = [], seen = {}, out = { people: [], jobs: [], count: { P: 0, '1': 0, '½': 0, S: 0, L: 0, X: 0 }, missing: [], noLine: [], badDay: [] };
    EA.fh.allChits().filter(function (x) { return x.estate === estate && x.date === c.date; }).forEach(function (x) {
      (x.rows || []).forEach(function (r) { if (r.status !== 'removed' && !seen[r.worker_id]) { seen[r.worker_id] = true; rows.push(r); } });
      // the work lines of the day's other chits too (one gang, one chit)
      if (x.chit !== c.chit) { var wx = workOf(x); lines = lines.concat((wx && wx.rec && wx.rec.lines) || []); }
    });
    var byW = {}; lines.forEach(function (l) { (byW[l.worker_id] = byW[l.worker_id] || []).push(l); });
    var jobs = {};
    rows.forEach(function (r) {
      if (r.muster !== 'H') { var a = AWAY[r.muster] || 'X'; out.count[a]++; out.people.push({ w: r.worker_id, letter: a }); return; }
      var ls = byW[r.worker_id] || [];
      // v1.79 (Yu Chen, 20 Nov 2026: "It wouldn't let me close for full this. But I already key all havestor
      // individually different number"). He had. The man with no line was the MANDOR. Kerja has always known
      // a mandor has nothing to key — rooms/field/work.js puts him in j.mandors, not j.people, "a mandor
      // supervises: nothing to key for him" — but the close did not, and demanded a work line for him. The
      // two screens disagreed about the same man, and nothing in the app could settle it: Kerja offered no
      // row to key, the close would not pass without one. He is present and he is working; he is simply not
      // on piece rate. He counts as present and is not asked for a line.
      if (!ls.length) {
        var w = EA.lists.worker(r.worker_id);
        if (w && w.mdr) { out.count.P++; out.people.push({ w: r.worker_id, letter: 'P' }); return; }
        out.noLine.push(r.worker_id); return;
      }
      var k = payKind(estate, ls[0]), letter = 'P';
      if (k === 'day') {
        var d = ls.reduce(function (a, l) { return a + num(l.qty); }, 0);
        if (!(d === 1 || d === 0.5)) out.badDay.push(r.worker_id);
        letter = d === 0.5 ? '½' : '1';
      }
      out.count[letter]++; out.people.push({ w: r.worker_id, letter: letter });
      ls.forEach(function (l) {
        var kk = payKind(estate, l), key = l.task_code + '|' + (l.block || ''), j = jobs[key];
        if (!j) j = jobs[key] = { task: l.task_code, block: l.block || '', kind: kk, unit: unitWord(estate, l), who: {}, total: 0, letter: kk === 'day' ? '1' : 'P' };
        j.who[l.worker_id] = true;
        j.bags = (j.bags || 0) + num(l.bags);
        j.total += kk === 'bunches' ? num(l.bunches) : kk === 'hour' ? num(l.hours) : kk === 'ticket' ? 0 : num(l.qty);
      });
    });
    out.jobs = Object.keys(jobs).map(function (k) { var j = jobs[k]; j.n = Object.keys(j.who).length; j.total = r3(j.total); return j; });
    // On the estate list but on no chit that day: the day cannot settle his pay. Sunday is a rest day: only those
    // who came are on the chit, so no one is missing (public holidays the same once HQ gives the list).
    var rest = new Date(c.date + 'T00:00:00').getDay() === 0 || (EA.lists.holidays && EA.lists.holidays.indexOf(c.date) >= 0);
    // v1.71: a worker is only expected on a chit from the day he started. Without this a man keyed today was
    // demanded on every past day as well, so one late registration could lock every day of the month — two
    // Sugut workers registered on 16 Nov with a start of 12 Nov blocked all eleven unclosed days back to 2 Nov.
    // No start date (the workers loaded before WORKER_LOG existed) means expected on every day, as before.
    if (!rest) listed(estate).forEach(function (w) {
      if (w.start && String(w.start).slice(0, 10) > c.date) return;
      if (!seen[w.id]) out.missing.push(w.id);
    });
    return out;
  }
  function payCountText(pl) { return ['P', '1', '½', 'S', 'L', 'X'].filter(function (k) { return pl.count[k]; }).map(function (k) { return k + ' ' + pl.count[k]; }).join(' · '); }
  function canClose(u) { return !!u && (u.role === 'Staff' || u.role === 'Owner' || u.role === 'HQ'); }
  // v1.43.1 (Yu Chen, 27 Oct): practice logins (Mod Latihan, code L-) may close any day with a chit, so the screen
  // can be tried with made-up workers before the real start date (4 Nov). Real logins wait for the start date.
  function from() {
    if (EA.practice && EA.practice()) return '2020-01-01';
    var o = EA.local.get(K.office + (ctx && ctx.estate), null); return (o && o.from) || '2026-11-09';
  }

  // ---------- what this phone knows about a day ----------
  function closes() { return EA.local.get(K.saved, []).filter(function (s) { return s.date >= EA.dayAgo(40); }); }
  function closedLocal(estate, date) { return closes().find(function (s) { return s.estate === estate && s.date === date && !s.reopened; }) || null; }
  function officeDays(estate) { var o = EA.local.get(K.office + estate, null); return (o && o.days) || []; }
  function officeState(estate, date) { var d = officeDays(estate).find(function (x) { return x.date === date; }); return d ? d.state : ''; }
  // v1.75: the one place that says whether a day is already closed. Kerja asks this before it opens a day
  // for keying (Yu Chen, 19 Nov: a day that is not closed yet stays open on the phone for 5 days; once it is
  // closed it changes only through the clerk's MINTA BETULKAN CHIT, as decided 24 Oct). Built once (Rule 5).
  function isClosed(estate, date) {
    var l = closedLocal(estate, date), st = officeState(estate, date);
    return !!((l && st !== 'reopened' && st !== 'fixing') || st === 'closed');
  }
  function chitOf(estate, date) {
    return EA.fh.allChits().filter(function (c) { return c.estate === estate && c.date === date; })
      .sort(function (a, b) { return (a.confirmedAt || '') < (b.confirmedAt || '') ? 1 : -1; })[0] || null;
  }
  function workOf(chit) { return chit ? (EA.local.get('fh.work', []).find(function (s) { return s.chit === chit.chit; }) || null) : null; }
  function collectsOf(estate, date) { return EA.local.get('fh.collect', []).filter(function (s) { return s.estate === estate && s.date === date; }); }
  // The collections of this day and every later day (v1.87, check 2).
  function collectsFrom(estate, date) { return EA.local.get('fh.collect', []).filter(function (s) { return s.estate === estate && s.date >= date; }); }

  // Days this phone can close: the chits of the last 7 days from the start date, not closed yet (or reopened by the office).
  function openDays(estate) {
    var seen = {}, out = [], today = EA.today(), f = from();
    EA.fh.allChits().forEach(function (c) {
      // v1.71: 40 days, the same window the phone keeps its chits for, instead of 7. The chit was always
      // there; only this list refused to offer it, so a day older than a week could not be closed by anyone
      // — the staff had no line to press and the office has no close of its own. On 17 Nov that left eight
      // November days on the Owner's board with nobody able to clear them. Closing an old day is not
      // correcting it: the day's seven checks still have to pass, and the 3-day fix window is unchanged.
      if (c.estate !== estate || c.date < f || c.date > today || seen[c.date] || c.date < EA.dayAgo(40)) return;
      seen[c.date] = true;
      var st = officeState(estate, c.date), loc = closedLocal(estate, c.date);
      if (st === 'closed' || (loc && st !== 'reopened' && st !== 'fixing')) return;
      out.push({ date: c.date, chit: c, reopened: st === 'reopened' || st === 'fixing' });
    });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  EA.fh.openDays = openDays;


  // ---------- v1.61 the day's rain reading (Yu Chen, 15 Nov 2026) ----------
  // Keyed at the close for 6 am–12 pm and 12 pm–6 pm: one mm figure as the gauge shows it, a tick for the period.
  // A lot stopped for rain in Kerja ticks 6 am–12 pm by itself (the work ends 1:30 pm), so the rain is keyed once.
  // v1.72 (Yu Chen, 18 Nov 2026: "the selection 6am to noon? noon mean? shall we specific 6am - 12pm,
  // 12pm - 6pm"). "Noon" and "midnight" are words a reader has to translate into a clock time, and the staff
  // read these at 6 in the morning. Every period now shows the clock on both sides. The Bahasa wording was
  // already exact (12 tgh is tengah hari, 12 mlm is malam) and is unchanged, as are the stored codes.
  var DAYP = [['06-12', '6 pg–12 tgh', '6am–12pm'], ['12-18', '12 tgh–6 ptg', '12pm–6pm']];
  function dayRainOk(d) { var mm = String(d.rainMm == null ? '' : d.rainMm).trim(); return mm === '0' || (Number(mm) > 0 && !!String(d.rainTime || '').trim()); }
  function dayRainText(mm, time) {
    if (String(mm == null ? '' : mm).trim() === '') return 'tiada bacaan';
    var n = Number(mm) || 0; if (!(n > 0)) return 'tiada';
    var t = (EA.fh.rainPeriods ? EA.fh.rainPeriods.text(time, DAYP) : time);
    return (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '') + ' mm' + (t ? ' (' + t + ')' : '');
  }
  // The latest closed day before a date with its day reading, for the morning chit's rain lines.
  EA.fh.dayRainBefore = function (estate, date) {
    var c = closes().filter(function (s) { return s.estate === estate && s.date < date; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
    return c ? { date: c.date, mm: c.rainMm == null ? '' : String(c.rainMm), time: c.rainTime || '' } : null;
  };
  // v1.71 (Ferezelly, 18 Nov 2026: "Rainfall 17/11 ialah 35, sy isi 13 sebab saya sangka close kerja 17
  // E-Book minta rainfall tanggal 16"). The card said "Hujan siang ini" — rain today — but a day is almost
  // always closed the next morning, so "ini" pointed at the wrong day and he keyed the day before's reading.
  // The gauge reading belongs to the day being closed, and the card now says which day that is, by name.
  function rainDayCard(d, fromWork, date) {
    var mm = String(d.rainMm == null ? '' : d.rainMm), dry = mm === '0', wet = !dry && (d.rainWet || Number(mm) > 0);
    var picked = String(d.rainTime || '').split(/[ ,]+/).filter(Boolean);
    var day = date ? niceDate(date) : '';
    return '<div class="card rain-q' + (dayRainOk(d) ? ' done' : '') + '" id="dc-rainq"><h2>' +
      (day ? EA.t('Hujan hari ' + day, 'Rain on ' + day) : EA.t('Hujan hari ini', 'Rain today')) + '</h2>' +
      '<p class="hint">' + EA.t('Hujan pada hari yang ditutup, bukan hari ini. 6 pagi hingga 6 petang. Baca tolok, kemudian kosongkan.', 'The rain on the day being closed, not today. 6 am to 6 pm. Read the gauge, then empty it.') + '</p>' +
      '<div class="rain-row"><button type="button" class="btn' + (dry ? ' btn-ok' : ' btn-ghost') + '" id="dc-rain-no" aria-pressed="' + dry + '">NO RAIN<small>TIADA HUJAN</small></button>' +
      '<button type="button" class="btn' + (wet ? ' btn-wait' : ' btn-ghost') + '" id="dc-rain-yes" aria-pressed="' + wet + '">IT RAINED<small>ADA HUJAN</small></button></div>' +
      (wet ? '<div class="field"><label><span class="bm">Bacaan tolok (mm)</span><span class="en">Gauge reading (mm)</span></label>' +
        '<input class="text-input qty" id="dc-rain-mm" inputmode="decimal" value="' + esc(Number(mm) > 0 ? mm : '') + '" placeholder="mm"></div>' +
        '<p class="hint">' + EA.t('Bila hujan turun? Tanda satu atau dua.', 'When did it rain? Tick one or both.') + '</p><div class="rain-row">' +
        DAYP.map(function (p) { var on = picked.indexOf(p[0]) >= 0; return '<button type="button" class="btn' + (on ? ' btn-wait' : ' btn-ghost') + '" data-drp="' + p[0] + '" aria-pressed="' + on + '">' + p[2] + '<small>' + p[1] + '</small></button>'; }).join('') + '</div>' +
        (fromWork ? '<p class="hint">' + EA.t('6 pagi–12 tengah hari ditanda dari Kerja: petak berhenti kerana hujan. Hanya kunci mm.', '6am–12pm is ticked from Work: a lot stopped for rain. Only key the mm.') + '</p>' : '') : '') +
      '</div>';
  }

  // ---------- the six checks ----------
  // Each check: { n, ok, bm, en, sub, go } — go is the screen that fixes it.
  function checks(estate, c, d) {
    var out = [], w = workOf(c), lines = (w && w.rec && w.rec.lines) || [], jobs = (w && w.rec && w.rec.jobs) || [];
    // v1.72: a red line is only a button when pressing it can land somewhere useful. Since 1.71 the close
    // reaches back 40 days, but Kerja still only opens today, yesterday, a chit the clerk asked to fix, or a
    // planned day (24 Oct). For an older day the jump used to go to Kerja and quietly open a different day's
    // chit. Now the line carries no button and says plainly that the day's work is the office's.
    // v1.81 (Yu Chen, 21 Nov 2026, from Ferezelly on 16 Nov: "he press the red highlight button but never
    // see the info to be fix"). The 1.72 guard above was written for the WORK checks only, and three other
    // red lines kept their jump: check 1's "on the list but not on the chit", and checks 2 and 3, which go to
    // the Ramp. For a day past the window that jump is not merely useless, it is a RING: the chit screen
    // answers with a band saying "Hari 16/11 belum lengkap" and a LENGKAPKAN button that sends him straight
    // back to this screen. Round and round, and the names he needs are shown on neither screen.
    //
    // So the rule is written ONCE here and every red line asks it (Rule 5): a line is a button only when
    // pressing it lands somewhere that can still show this day. Nothing about this is estate-specific — it
    // is the same rule at Sugut, Paitan, Meliau and Kawananan, and for every day, not just 16 Nov.
    var canKey = EA.fh.workChitOpen ? EA.fh.workChitOpen(c) : true;
    var TOO_OLD = ['Hari ini terlalu lama untuk dikunci di telefon — minta pejabat',
                   'This day is too old to key on the phone — ask the office'];
    var only = function (o, hash) {
      if (canKey) { o.go = hash; return o; }
      o.sub = (o.sub ? o.sub + ' · ' : '') + EA.t(TOO_OLD[0], TOO_OLD[1]);
      return o;
    };
    var toWork = function (o) { return only(o, '#field-harvest/work'); };
    var toChit = function (o) { return only(o, '#field-harvest'); };
    var toRamp = function (o) { return only(o, '#field-harvest/collect'); };
    var present = (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster === 'H'; });
    // 1 · v1.51: every worker on the list has a pay line (a letter, and a quantity or a day)
    var pl = payLines(estate, c, lines), names = function (ids) { return ids.slice(0, 4).map(person).join(', ') + (ids.length > 4 ? ' +' + (ids.length - 4) : ''); };
    if (!w) out.push(toWork({ n: 1, ok: false, bm: 'Kerja harian belum dikunci', en: 'The day\'s work is not keyed', sub: present.length + EA.t(' orang hadir di chit', ' people present on the chit') }));
    else if (pl.missing.length) out.push(toChit({ n: 1, ok: false, bm: pl.missing.length + ' orang dalam senarai tiada dalam chit', en: pl.missing.length + ' on the list but not on the chit', sub: names(pl.missing) + EA.t(' · betulkan chit: hadir dengan kerja, atau S / C / T', ' · fix the chit: present with a job, or S / C / T') }));
    else if (pl.noLine.length) out.push(toWork({ n: 1, ok: false, bm: pl.noLine.length + ' orang hadir tiada baris kerja', en: pl.noLine.length + ' present with no work line', sub: names(pl.noLine) }));
    else if (pl.badDay.length) out.push(toWork({ n: 1, ok: false, bm: pl.badDay.length + ' orang kerja harian tanpa 1 / ½ hari', en: pl.badDay.length + ' day workers without 1 / ½ day', sub: names(pl.badDay) + EA.t(' · ladang durian dibayar ikut hari', ' · the durian farm is paid by the day') }));
    else out.push({ n: 1, ok: true, bm: pl.people.length + ' orang · semua ada kerja hari ini', en: pl.people.length + ' people · every one has work done today', sub: payCountText(pl), pay: pl });
    // 2 · harvest lots collected to the ramp, or explained
    // v1.87 (Yu Chen, 23 Nov 2026: "after this version hardly see ferzelly can close the day"). Fruit was counted as
    // at the ramp only when it was collected ON THE DAY it was cut. Sugut cuts in the afternoon and collects the
    // next morning, so for 15, 16, 19 and 20 Nov this line could never turn green: in the records every one of
    // those bunches WAS collected, lot by lot, a day later. Now a lot cut this day counts as at the ramp when it
    // was collected on this day or any day after (up to its cut), or marked habis. Nothing else about the check
    // changes: fruit still lying in the field still stops the close, and still asks for a reason.
    var cut = 0, col = 0, cutLot = {};
    lines.forEach(function (l) { if (l.task_code === EA.lists.HARVEST) { cut += num(l.bunches); cutLot[l.lot] = (cutLot[l.lot] || 0) + num(l.bunches); } });
    var gotLot = {}, habisLot = {};
    collectsFrom(estate, c.date).forEach(function (s) { (s.lines || []).forEach(function (l) {
      if (!(l.lot in cutLot)) return;
      gotLot[l.lot] = (gotLot[l.lot] || 0) + num(l.bunches); if (l.cleared === 'Y') habisLot[l.lot] = true; }); });
    Object.keys(cutLot).forEach(function (lot) { col += habisLot[lot] ? cutLot[lot] : Math.min(cutLot[lot], gotLot[lot] || 0); });
    var fieldLeft = Math.max(0, cut - col), bl = EA.fh.getBacklog ? EA.fh.getBacklog(estate) : null;
    var fieldOld = bl && Array.isArray(bl.field) ? bl.field.filter(function (x) { return x.since && x.since <= c.date; }).reduce(function (a, x) { return a + (Number(x.bunches) || 0); }, 0) : 0;
    var left = Math.max(fieldLeft, fieldOld);
    if (!cut) out.push({ n: 2, ok: true, bm: 'Tiada tuaian hari ini', en: 'No harvest today', sub: '' });
    else if (left > 0 && !String(d.fieldNote || '').trim()) out.push(toRamp({ n: 2, ok: false, bm: left + ' tandan dituai belum ke ramp', en: left + ' bunches cut, not yet at the ramp', sub: EA.t('Tekan SEMUA KE RAMP, atau tulis sebab di bawah', 'Press ALL TO RAMP, or write why below'), note: 'field' }));
    else out.push({ n: 2, ok: true, bm: cut + ' tandan dituai' + (left > 0 ? ' · ' + left + ' belum ke ramp (sebab ditulis)' : ' · semua ke ramp'), en: cut + ' bunches cut' + (left > 0 ? ' · ' + left + ' not at the ramp (reason given)' : ' · all at the ramp'), sub: '' });
    // 3 · every lorry has its delivery note
    var lorries = collectsOf(estate, c.date).filter(function (s) { return s.dispatch && !s.dispatch.replacedBy; });
    var noDn = lorries.filter(function (s) { return !String(s.dispatch.dn || '').trim(); });
    out.push(noDn.length ? toRamp({ n: 3, ok: false, bm: noDn.length + ' lori tiada nota hantar (DN)', en: noDn.length + ' lorry without a delivery note', sub: EA.t('Isi nombor DN di skrin Ramp', 'Key the DN number on the Ramp screen') })
      : { n: 3, ok: true, bm: lorries.length ? lorries.length + ' lori keluar, semua ada DN' : 'Tiada lori hari ini', en: lorries.length ? lorries.length + ' lorries out, all with a DN' : 'No lorry today', sub: '' });
    // 4 · a job not finished has a reason; every job is answered
    var noAns = jobs.filter(function (j) { return !j.status; }), noWhy = jobs.filter(function (j) { return j.status === 'not_done' && String(j.reason || '').trim().length < 5; });
    out.push(!w ? toWork({ n: 4, ok: false, bm: 'Siap / belum siap belum dijawab', en: 'Done / not done not answered', sub: '' })
      : (noAns.length || noWhy.length) ? toWork({ n: 4, ok: false, bm: (noAns.length + noWhy.length) + ' kerja tanpa jawapan atau sebab', en: (noAns.length + noWhy.length) + ' jobs with no answer or reason', sub: noAns.concat(noWhy).slice(0, 3).map(function (j) { return shortName(j.task_code) + (j.block ? ' Blk ' + j.block : ''); }).join(', ') })
      : { n: 4, ok: true, bm: jobs.filter(function (j) { return j.status === 'done'; }).length + '/' + jobs.length + ' kerja siap' + (jobs.some(function (j) { return j.status === 'not_done'; }) ? ' · sebab ditulis' : ''), en: jobs.filter(function (j) { return j.status === 'done'; }).length + '/' + jobs.length + ' jobs done', sub: '' });
    // 5 · rain fits the jobs (see rainCheck)
    out.push(rainCheck(jobs, d, w));
    // 6 · records keyed (waiting ones go with the close)
    var ids = lines.map(function (l) { return l.id; }).concat(jobs.map(function (j) { return j.id; })).filter(Boolean);
    var waiting = ids.filter(function (i) { return EA.isWaiting(i); }).length;
    out.push({ n: 6, ok: true, bm: waiting ? waiting + ' rekod menunggu · dihantar bersama penutupan' : 'Semua rekod dihantar', en: waiting ? waiting + ' records waiting · sent with the close' : 'All records sent', sub: '', soft: true });
    // 7 · v1.52.3: Membaja / CPS lots already done this round keyed again. It never stops the close; it shows the lots
    // and the reason picked on the chit, so a repeat is seen the same day (Blk 01, 27 Oct–3 Nov).
    // 8 · v1.61: the day's rain reading (the morning self-close skips it; the reading is then "tiada bacaan")
    // v1.71: the check names the day too, for the same reason the card above does.
    var rday = c && c.date ? niceDate(c.date) : '';
    if (!d.autoClose) out.push(dayRainOk(d) ? { n: 8, ok: true, bm: 'Hujan ' + rday + ': ' + dayRainText(d.rainMm, d.rainTime), en: 'Rain ' + rday + ': ' + dayRainText(d.rainMm, d.rainTime), sub: '' }
      : { n: 8, ok: false, bm: 'Hujan ' + rday + ' belum dijawab', en: 'Rain ' + rday + ' not answered', sub: EA.t('TIADA HUJAN, atau mm dan bila (di atas). Hujan hari itu, bukan hari ini.', 'NO RAIN, or the mm and when (above). The rain on that day, not today.'), scrollTo: '#dc-rainq' });
    var rep = EA.fh.roundRepeats ? EA.fh.roundRepeats(estate, c) : [];
    if (rep.length) out.push({ n: 7, ok: true, warn: true, soft: true, bm: rep.length + ' petak sudah siap pusingan ini dikunci lagi', en: rep.length + ' lots already done this round keyed again',
      sub: rep.map(function (x) { return x.task + ' ' + x.lot + ' (' + EA.t('siap ', 'done ') + x.on.slice(8, 10) + '/' + x.on.slice(5, 7) + (x.why ? ' · ' + x.why : EA.t(' · tiada sebab', ' · no reason')) + ')'; }).join(' · ') });
    return out;
  }
  // Which jobs fell short today (BELUM SIAP, or a flag such as under target).
  function shortJobs(jobs) { return jobs.filter(function (j) { return j.status === 'not_done' || /sasaran|target|kurang|under/i.test(String(j.flags || '')); }); }
  // v1.46 (Yu Chen, 27 Oct): rain is told on each lot in Kerja (Hujan → what kind, ¼–1 day). Read it from the saved work.
  var RAIN_WHEN = { LEWAT: 'morning', HENTI: 'work', GERIMIS: 'work', BASAH: 'night' };
  function rainFromWork(w) {
    var out = { lots: 0, lost: 0, jobs: [], count: {}, reason: '' };
    if (!w || !w.lotwhy) return out;
    var byKey = {}; ((w.rec && w.rec.jobs) || []).forEach(function (j) { if (j.key) byKey[j.key] = j.task_code; });
    Object.keys(w.lotwhy).forEach(function (k) {
      Object.keys(w.lotwhy[k] || {}).forEach(function (lot) {
        var x = w.lotwhy[k][lot] || {}, pv = w.prog && w.prog[k] ? String(w.prog[k][lot]) : '0';
        if (x.why !== 'rain' || pv !== '0') return;
        out.lots++; out.lost = Math.max(out.lost, Number(x.lost) || 0);
        if (x.rain) out.count[x.rain] = (out.count[x.rain] || 0) + 1;
        var code = byKey[k]; if (code && out.jobs.indexOf(code) < 0) out.jobs.push(code);
      });
    });
    out.reason = Object.keys(out.count).sort(function (a, b) { return out.count[b] - out.count[a]; })[0] || '';
    return out;
  }
  function rainLabel(r) { var x = (EA.lists.rainReasons || []).find(function (o) { return o.code === r.reason; }); return x ? EA.t(x.bm, x.en) : EA.t('Hujan', 'Rain'); }
  function rainCheck(jobs, d, w) {
    var r = rainFromWork(w);
    if (!r.lots) return { n: 5, ok: true, bm: 'Tiada petak terhenti kerana hujan', en: 'No lot stopped by rain', sub: '' };
    return { n: 5, ok: true, bm: rainLabel(r) + ' · ' + lostLabel(r.lost) + ' · ' + r.jobs.map(shortName).join(', ') + ' (' + r.lots + ' petak)', en: rainLabel(r) + ' · ' + lostLabel(r.lost),
      sub: EA.t('Sasaran tidak diturunkan: kerja tertinggal jadi baki kerja', 'The target is not lowered: lost work becomes catch-up'), jobs: r.jobs, rain: r };
  }
  function lostLabel(v) { var x = (EA.lists.lostDay || []).find(function (o) { return o.v === Number(v); }); return x ? EA.t(x.bm, x.en) : String(v); }

  // ---------- screen ----------
  function draftFor(date) { var all = EA.local.get(K.draft, {}); return all[ctx.estate + '|' + date] || { rainWhen: 'none', rainReason: '', rainLost: '', fieldNote: '', note: '' }; }
  function keepDraft(date, d) { var all = EA.local.get(K.draft, {}); all[ctx.estate + '|' + date] = d; EA.local.set(K.draft, all); }
  function dropDraft(date) { var all = EA.local.get(K.draft, {}); delete all[ctx.estate + '|' + date]; EA.local.set(K.draft, all); }

  function render(container, c) {
    el = container; ctx = c;
    var testing = !EA.roomLive(ctx.room, ctx.estate);
    var head = '<div class="room-top"><button type="button" class="back-btn" id="dc-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<div class="grow"><h1>' + EA.t('Tutup hari', 'Day close') + '</h1><span class="brand-sub">' + esc(ctx.estate) + '</span></div>' +
      (testing ? '<span class="test-badge">' + EA.t('UJIAN', 'TEST') + '</span>' : '') + '</div>' + (EA.fh.tabs ? EA.fh.tabs('work', ctx.user) : '');
    if (!canClose(ctx.user)) { el.innerHTML = head + '<div class="card"><p class="hint">' + EA.t('Hanya Staf bertugas menutup hari.', 'Only the staff in charge closes the day.') + '</p></div>'; wire(); return; }
    var open = openDays(ctx.estate), done = closes().filter(function (s) { return s.estate === ctx.estate; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 7);
    var pick = EA.local.get('fh.daypick', '');
    day = open.find(function (o) { return o.date === pick; }) || open[0] || null;
    var html = head;
    if (!day) {
      html += '<div class="card"><h2>' + EA.t('Semua hari sudah ditutup', 'Every day is closed') + '</h2><p class="hint">' +
        EA.t('Hari dengan chit pagi dari ', 'Days with a morning chit from ') + esc(niceDate(from())) + EA.t(' muncul di sini selepas kerja dikunci. Tutup hari sebelum chit esok pagi.', ' appear here once the work is keyed. Close the day before tomorrow\'s chit.') + '</p></div>';
    } else {
      var d = draftFor(day.date), ck = checks(ctx.estate, day.chit, d), bad = ck.filter(function (x) { return !x.ok; });
      // v1.78 (Yu Chen, 20 Nov 2026: "I can't find the selection day for closing. I believe ferezelly facing
      // the same"). This was a grey select, drawn ONLY when more than one day was open. Two faults in that.
      // It read as a label rather than a choice, and it scrolled away while the card heading below kept
      // shouting a different date — so the screen looked as if it were demanding the oldest day first, which
      // it never was. Worse, with one day open it did not exist at all, so nobody ever learnt it was there;
      // they met it for the first time on the morning four days were open and they were already in trouble.
      // Now it is always drawn, as the days themselves, and it says how many are waiting.
      html += '<div class="card dc-days"><h2>' + EA.t('Hari mana?', 'Which day?') + '</h2>' +
        '<div class="dc-dayrow">' + open.map(function (o) {
          return '<button type="button" class="dc-day' + (o.date === day.date ? ' on' : '') + (o.reopened ? ' re' : '') +
            '" data-day="' + o.date + '"><b>' + esc(dayDm(o.date)) + '</b><small>' + esc(dayName(o.date)) +
            (o.reopened ? EA.t(' · buka semula', ' · reopened') : '') + '</small></button>';
        }).join('') + '</div>' +
        '<p class="hint">' + (open.length > 1
          ? EA.t(open.length + ' hari belum ditutup. Pilih mana-mana — tidak perlu ikut turutan.',
                 open.length + ' days not closed. Pick any one — they do not have to be in order.')
          : EA.t('1 hari belum ditutup.', '1 day not closed.')) + '</p></div>';
      if (day.reopened) html += '<p class="warn"><b>' + EA.t('Dibuka semula · ', 'Reopened · ') + esc(niceDate(day.date)) + '</b> <span class="bm">Kerani minta pembetulan. Selepas pembetulan dikunci, tutup hari ini semula.</span></p>';
      var wr = rainFromWork(workOf(day.chit));
      if (wr.lots && String(d.rainMm == null ? '' : d.rainMm) === '' && !d.rainTime && !d.rainSeen) { d.rainWet = true; d.rainTime = '06-12'; d.rainSeen = true; keepDraft(day.date, d); ck = checks(ctx.estate, day.chit, d); bad = ck.filter(function (x) { return !x.ok; }); }
      html += rainDayCard(d, wr.lots > 0 && d.rainTime === '06-12', day.date);
      html += '<div class="card"><h2>' + esc(niceDate(day.date)) + ' · ' + EA.t('Semakan sebelum tutup', 'Checks before closing') + '</h2>' +
        '<ol class="dc-list">' + ck.map(function (x) {
          // v1.72: a line is a button when it can take you to the fix — another screen (data-go), or the card
          // higher up this same screen (data-scroll). The rain line used to carry the close's own address, so
          // pressing it set the hash to the hash it already had and nothing happened at all.
          var btn = x.ok ? '' : x.go ? '<button type="button" class="link-btn dc-go" data-go="' + esc(x.go) + '">'
            : x.scrollTo ? '<button type="button" class="link-btn dc-go" data-scroll="' + esc(x.scrollTo) + '">' : '';
          return '<li class="dc-it ' + (x.ok ? (x.warn ? 'dc-warn' : x.drop ? 'dc-drop' : 'dc-ok') : 'dc-bad') + '">' + (btn || '<span>') +
            '<b>' + (x.warn ? '⚠' : x.ok ? '✓' : '!') + ' ' + esc(EA.t(x.bm, x.en)) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + (btn ? '</button>' : '</span>') + '</li>';
        }).join('') + '</ol>';
      // v1.51: the day's work codes (Yu Chen, 5 Nov: closing settles the work, not yet the pay), by job (what the checkroll will be given), shown once every worker has his line.
      var c1 = ck.find(function (x) { return x.n === 1 && x.pay; });
      if (c1) html += payCard(c1.pay);
      // Field backlog reason (check 2) when fruit stays in the field.
      if (ck.some(function (x) { return x.note === 'field'; }) || String(d.fieldNote || '').trim()) {
        html += '<div class="field"><label><span class="bm">Sebab buah belum ke ramp</span><span class="en">Why the fruit is not at the ramp</span></label>' +
          '<textarea class="text-input" rows="2" id="dc-field" placeholder="' + EA.t('cth: traktor rosak petang, kutip esok pagi', 'e.g. tractor broke down, collect tomorrow morning') + '">' + esc(d.fieldNote || '') + '</textarea></div>';
      }
      html += '<div class="field"><label><span class="bm">Catatan (pilihan)</span><span class="en">Note (optional)</span></label><input class="text-input" id="dc-note" maxlength="150" value="' + esc(d.note || '') + '"></div>' +
        // v1.75: one name, in the phone's language. Written as BAHASA<small>English</small> the app would read
        // the small line as the Bahasa and show "KUNCI HARI RABU 18 NOV" instead of TUTUP HARI (Ferezelly, 19 Nov).
        '<div class="actions"><button type="button" class="btn btn-ok" id="dc-close"' + (bad.length ? ' disabled' : '') + '>' + EA.t('TUTUP HARI', 'CLOSE THE DAY') + '</button></div>' +
        '<p class="hint">' + EA.t('Mengunci hari ' + niceDate(day.date) + '.', 'Closes ' + niceDate(day.date) + '.') + '</p>' +
        (bad.length ? '<p class="hint">' + bad.length + EA.t(' perkara belum lengkap. Tekan baris merah untuk membetulkannya.', ' things not complete. Tap a red line to fix it.') + '</p>' : '<p class="hint">' + EA.t('Selepas ditutup, hari ini hanya boleh diubah melalui MINTA BETULKAN CHIT (kerani), dalam ' + (EA.fh && EA.fh.FIX_DAYS || 5) + ' hari.', 'After closing, this day changes only through MINTA BETULKAN CHIT (the clerk), within ' + (EA.fh && EA.fh.FIX_DAYS || 5) + ' days.') + '</p>') +
        '</div>';
    }
    if (done.length) html += '<div class="card"><h2>' + EA.t('Hari ditutup', 'Days closed') + '</h2>' + done.map(function (s) {
      return '<div class="wline"><span class="grow"><b>' + esc(niceDate(s.date)) + '</b> <small>' + esc(s.at || '') + (s.rain ? ' · ' + esc(s.rain) : '') + (EA.isWaiting(s.id) ? ' · ' + EA.t('menunggu hantar', 'waiting to send') : '') + '</small></span>' +
        '<button type="button" class="link-btn" data-sum="' + esc(s.date) + '">' + EA.t('Ringkasan', 'Summary') + '</button></div>';
    }).join('') + '</div>';
    el.innerHTML = html;
    wire();
    // The office's list of open days (and the start date) is asked for once a minute at most; the screen redraws when it arrives.
    var o = EA.local.get(K.office + ctx.estate, null);
    if (EA.fh.refreshDayClose && navigator.onLine && (!o || Date.now() - (o.at || 0) > 60000)) EA.fh.refreshDayClose(ctx.estate).then(function (j) { if (j && el && /\/close$/.test(location.hash)) render(el, ctx); });
  }

  function payCard(pl) {
    var away = pl.people.filter(function (p) { return ['S', 'L', 'X'].indexOf(p.letter) >= 0; });
    return '<div class="card dc-pay"><h2>' + EA.t('Kerja hari ini', 'Work done today') + '</h2><p class="hint">' + EA.t('Satu huruf setiap pekerja, sama dengan checkroll.', 'One letter per worker, as in the checkroll.') + '</p>' +
      '<table class="dc-paytab">' + pl.jobs.map(function (j) {
        var tot = j.unit === 'Ha' ? j.total.toFixed(2) : j.total, amt = j.kind === 'ticket' ? EA.t('ikut tiket', 'from the ticket') : j.kind === 'bunches' ? tot + ' tandan' : j.bags ? j.bags + ' beg' : tot + ' ' + j.unit, under = j.kind === 'bunches' ? EA.t('MT ikut tiket', 'MT from the ticket') : j.bags ? tot + ' ' + j.unit : '';
        return '<tr><td><span class="dc-k dc-k' + (j.letter === 'P' ? 'P' : 'D') + '">' + (j.kind !== 'day' ? 'P' : j.total === j.n ? '1' : j.total === j.n / 2 ? '½' : '1/½') + '</span></td><td>' + esc(shortName(j.task)) + (j.block ? ' · ' + esc(/^\d+$/.test(j.block) ? 'B' + j.block : j.block) : '') + '<small>' + j.n + EA.t(' orang', ' people') + '</small></td><td class="n">' + esc(amt) + (under ? '<small>' + esc(under) + '</small>' : '') + '</td></tr>';
      }).join('') + away.map(function (p) {
        return '<tr><td><span class="dc-k dc-kX">' + p.letter + '</span></td><td colspan="2">' + esc(person(p.w)) + ' · ' + ({ S: EA.t('sakit', 'sick'), L: EA.t('cuti', 'leave'), X: EA.t('tidak hadir', 'absent') })[p.letter] + '</td></tr>';
      }).join('') + '</table><p class="hint">' + esc(payCountText(pl)) + '</p></div>';
  }

  function wire() {
    $('#dc-back').onclick = function () { location.hash = '#field-harvest/work'; };
    el.querySelectorAll('[data-day]').forEach(function (b) {
      b.onclick = function () { EA.local.set('fh.daypick', b.dataset.day); render(el, ctx); window.scrollTo(0, 0); };
    });
    if (!day) { el.querySelectorAll('[data-sum]').forEach(function (b) { b.onclick = function () { showSummary(b.dataset.sum); }; }); return; }
    var d = draftFor(day.date);
    function upd(fn) { fn(d); keepDraft(day.date, d); render(el, ctx); }
    el.querySelectorAll('.dc-go').forEach(function (b) { b.onclick = function () {
      // A line that points at a card on this screen scrolls to it; one that points at another screen hands
      // that screen the chit of the day being closed, so it opens the right day and not today's.
      if (b.dataset.scroll) { var t = el.querySelector(b.dataset.scroll); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('look-here'); setTimeout(function () { t.classList.remove('look-here'); }, 1600); } return; }
      EA.local.set('fh.workchit', day.chit.chit); location.hash = b.dataset.go; }; });
    var f = $('#dc-field'); if (f) { f.oninput = function () { d.fieldNote = f.value; keepDraft(day.date, d); }; f.onchange = function () { render(el, ctx); }; }
    var n = $('#dc-note'); if (n) n.oninput = function () { d.note = n.value; keepDraft(day.date, d); };
    var rn = $('#dc-rain-no'), ry = $('#dc-rain-yes'), rm = $('#dc-rain-mm');
    if (rn) rn.onclick = function () { upd(function (x) { x.rainMm = '0'; x.rainTime = ''; x.rainWet = false; x.rainSeen = true; }); };
    if (ry) ry.onclick = function () { upd(function (x) { x.rainWet = true; x.rainSeen = true; if (String(x.rainMm) === '0') x.rainMm = ''; }); var m = $('#dc-rain-mm'); if (m) m.focus(); };
    if (rm) { rm.oninput = function () { d.rainMm = rm.value.replace(',', '.').replace(/[^\d.]/g, ''); keepDraft(day.date, d); }; rm.onchange = function () { render(el, ctx); }; }
    el.querySelectorAll('[data-drp]').forEach(function (b) {
      b.onclick = function () { upd(function (x) { var cur = String(x.rainTime || '').split(/[ ,]+/).filter(Boolean), i = cur.indexOf(b.dataset.drp); if (i >= 0) cur.splice(i, 1); else cur.push(b.dataset.drp); x.rainTime = DAYP.map(function (p) { return p[0]; }).filter(function (k) { return cur.indexOf(k) >= 0; }).join(' '); }); };
    });
    var cb = $('#dc-close'); if (cb) cb.onclick = function () { var dt = day.chit.date, ok = closeChit(ctx.estate, ctx.user, day.chit, d, {}); render(el, ctx); if (ok) showSummary(dt); };
    el.querySelectorAll('[data-sum]').forEach(function (b) { b.onclick = function () { showSummary(b.dataset.sum); }; });
  }

  // ---------- closing ----------
  // One close, used by the screen, by the question at the end of a save, and by the morning self-close.
  // opts.auto: closed by the app at the next chit because the day was complete (closed_by stays the staff's code).
  function closeChit(estate, user, c, d, opts) {
    d = d || {}; opts = opts || {};
    if (opts.auto) d = Object.assign({}, d, { autoClose: true });
    var ck = checks(estate, c, d);
    if (ck.some(function (x) { return !x.ok; })) { if (!opts.auto) ui().toast(EA.t('Belum lengkap', 'Not complete yet'), 'bad'); return null; }
    var w = workOf(c), jobs = (w && w.rec && w.rec.jobs) || [], lines = (w && w.rec && w.rec.lines) || [];
    var rain = rainFromWork(w), keepRain = rain.lots > 0;
    var present = (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster === 'H'; }).length;
    var total = (c.rows || []).filter(function (r) { return r.status !== 'removed'; }).length;
    var bunches = 0; lines.forEach(function (l) { if (l.task_code === EA.lists.HARVEST) bunches += num(l.bunches); });
    var lorries = collectsOf(estate, c.date).filter(function (s) { return s.dispatch && !s.dispatch.replacedBy; }).length;
    var at = EA.today() + ' ' + EA.ui.hhmm(new Date());
    var old = closes().find(function (s) { return s.estate === estate && s.date === c.date; });
    var checksTxt = ck.map(function (x) { return x.n + (x.ok ? '✓' : '!') + ' ' + x.bm; }).join(' | ').slice(0, 400);
    var note = [String(d.fieldNote || '').trim(), String(d.note || '').trim(), opts.auto ? 'Ditutup oleh app (lengkap) semasa chit pagi' : ''].filter(Boolean).join(' · ').slice(0, 200);
    var rec;
    try {
      rec = EA.save(TAB, ROOM, estate, { date: c.date, chit: c.chit, kind: 'close', closed_by: user.code, closed_at: at, checks: checksTxt,
        rain_when: keepRain ? (RAIN_WHEN[rain.reason] || 'work') : '', rain_reason: keepRain ? rain.reason : '', rain_lost: keepRain ? String(rain.lost) : '', rain_jobs: keepRain ? rain.jobs.join(' ') : '',
        workers: String(total), present: String(present), bunches: String(bunches), jobs_done: String(jobs.filter(function (j) { return j.status === 'done'; }).length), jobs_planned: String(jobs.length),
        lorries: String(lorries), note: note, rain_mm: dayRainOk(d) ? String(Number(d.rainMm) || 0) : '', rain_time: dayRainOk(d) && Number(d.rainMm) > 0 ? String(d.rainTime || '') : '' }, old && old.reopened ? old.id : '');
    } catch (e) { if (!opts.auto) ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad'); return null; }
    var s = { id: rec.id, estate: estate, date: c.date, chit: c.chit, at: at.slice(11), by: user.code, byName: user.name, present: present, total: total, bunches: bunches, auto: !!opts.auto,
      jobsDone: jobs.filter(function (j) { return j.status === 'done'; }).length, jobs: jobs.length, lorries: lorries, rain: keepRain ? rainLabel(rain) + ' · ' + lostLabel(rain.lost) : '', rainJobs: keepRain ? rain.jobs : [],
      rainMm: dayRainOk(d) ? String(Number(d.rainMm) || 0) : '', rainTime: dayRainOk(d) && Number(d.rainMm) > 0 ? String(d.rainTime || '') : '',
      // v1.50.1 (Yu Chen, 5 Nov): who was away, by name and mark, for the day summary.
      pay: (function () { var c1 = ck.find(function (x) { return x.n === 1 && x.pay; }); return c1 ? payCountText(c1.pay) : ''; })(),
      away: (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster !== 'H'; }).map(function (r) { return person(r.worker_id) + ' (' + r.muster + ')'; }),
      notDone: jobs.filter(function (j) { return j.status === 'not_done'; }).map(function (j) { return { job: shortName(j.task_code) + (j.block ? ' Blk ' + j.block : ''), why: j.reason || '' }; }), note: d.note || '', fieldNote: d.fieldNote || '' };
    var list = closes().filter(function (x) { return !(x.estate === s.estate && x.date === s.date); }); list.push(s); EA.local.set(K.saved, list);
    var o = EA.local.get(K.office + estate, null); if (o && o.days) { o.days.forEach(function (x) { if (x.date === c.date) x.state = 'closed'; }); EA.local.set(K.office + estate, o); }
    var all = EA.local.get(K.draft, {}); delete all[estate + '|' + c.date]; EA.local.set(K.draft, all);
    if (!opts.auto) ui().toast(EA.t('Hari ' + niceDate(c.date) + ' ditutup', 'Day ' + niceDate(c.date) + ' closed'));
    if (navigator.onLine && EA.sendLink()) EA.send();
    return s;
  }
  // Whether a day can be closed now: 'none' (not asked: before the start date, already closed, or no chit), 'ready', or 'missing'.
  function closeState(estate, user, date) {
    if (!canClose(user)) return { state: 'none' };
    var keep = ctx; ctx = Object.assign({}, ctx || {}, { estate: estate, user: user });
    try {
      var o = openDays(estate).find(function (x) { return x.date === date; });
      if (!o) return { state: 'none' };
      var d = draftFor(date), ck = checks(estate, o.chit, d), bad = ck.filter(function (x) { return !x.ok; });
      // v1.61: the day's rain alone never makes a day "missing": the close question asks it on the spot, and the
      // morning self-close goes ahead without it ("tiada bacaan").
      var other = bad.filter(function (x) { return x.n !== 8; });
      return { state: other.length ? 'missing' : 'ready', needRain: bad.length > other.length, chit: o.chit, d: d, checks: ck, bad: other, reopened: o.reopened };
    } finally { ctx = keep; }
  }
  // ---------- the day summary for WhatsApp ----------
  function summaryText(s) {
    var dd = new Date(s.date + 'T00:00:00'), est = EA.lists.estate(s.estate);
    var L = ['*TUTUP HARI ' + (est ? est.company + ' ' : '') + s.estate + '*', ui().dayBm[dd.getDay()] + ' ' + dd.getDate() + '/' + (dd.getMonth() + 1) + '/' + dd.getFullYear(), ''];
    L.push('Pekerja: ' + s.present + '/' + s.total + ' hadir' + (s.pay ? ' · ' + s.pay : ''));
    if (s.away && s.away.length) L.push('Tidak hadir: ' + s.away.join(', '));
    L.push('Tuaian: ' + s.bunches + ' tandan' + (s.lorries ? ' · ' + s.lorries + ' lori keluar' : ' · tiada lori'));
    L.push('Kerja: ' + s.jobsDone + '/' + s.jobs + ' siap');
    (s.notDone || []).forEach(function (j) { L.push('  • ' + j.job + ' BELUM SIAP' + (j.why ? ' — ' + j.why : '')); });
    if (s.fieldNote) L.push('Buah belum ke ramp: ' + s.fieldNote);
    // v1.61: the day's gauge reading first, then the work rain stopped (a reason, as since 25 Oct).
    if (s.rainMm !== undefined) L.push('Hujan siang: ' + dayRainText(s.rainMm, s.rainTime));
    if (s.rain) L.push((s.rainMm !== undefined ? 'Kerja terjejas hujan: ' : 'Hujan: ') + s.rain + (s.rainJobs && s.rainJobs.length ? ' (' + s.rainJobs.map(shortName).join(', ') + ') · jadi baki kerja' : ''));
    else if (s.rainMm === undefined) L.push('Hujan: tiada');
    if (s.note) L.push('Catatan: ' + s.note);
    L.push('');
    L.push('Ditutup: ' + (s.byName || s.by) + ' · ' + s.at + (s.auto ? ' (oleh app, hari lengkap)' : ''));
    L.push('E-Book ' + s.chit);
    return L.join('\n');
  }
  // v1.52 (Yu Chen, 6 Nov, Brief_Esok): the daily habit is close today, plan tomorrow. After a close the summary
  // offers RANCANG ESOK: the next day, and when that is a rest day (Sunday or a listed holiday) the next working
  // day as well, so Saturday's close plans Monday if nobody works Sunday. The button sets fh.planGo and opens the
  // chit screen, which fills the plan from today's chit. Only the one who can close is offered it, and only for
  // today's close (a summary opened later from a past day just shows the text).
  function restDay(date) { return new Date(date + 'T00:00:00').getDay() === 0 || !!(EA.lists && EA.lists.holidays && EA.lists.holidays.indexOf(date) >= 0); }
  function esokDays() {
    var out = [], d = EA.today(), i;
    for (i = 1; i <= 3; i++) { d = addDays(EA.today(), i); out.push(d); if (!restDay(d)) break; }
    return out;
  }
  function esokLabel(d) {
    var have = EA.fh.plans ? EA.fh.plans().some(function (p) { return p.estate === ctx.estate && p.date === d && !p.cancelled; }) : false;
    // Button text follows the EN<small>BM</small> rule (core/lang.js): a Bahasa phone shows the small part, so the day
    // must be in both parts or the staff sees only the hint.
    var dEn = (function () { var x = new Date(d + 'T00:00:00'); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x.getDay()] + ' ' + x.getDate() + '/' + (x.getMonth() + 1); })();
    var hintBm = restDay(d) ? 'hari rehat, hanya jika ada kerja · perlu lulus Pengurus' : have ? 'sudah dirancang, ubah' : 'isi dari hari ini, ubah yang berbeza';
    var hintEn = restDay(d) ? 'rest day, only if there is work · needs approval' : have ? 'already planned, change' : 'filled from today, change what differs';
    return '<button type="button" class="btn" data-esok="' + d + '">' + (have ? 'CHANGE PLAN ' : 'PLAN ') + dEn + ' · ' + hintEn +
      '<small>' + (have ? 'UBAH RANCANGAN ' : 'RANCANG ') + esc(niceDate(d).toUpperCase()) + ' · ' + hintBm + '</small></button>';
  }
  function showSummary(date, estate) {
    estate = estate || (ctx && ctx.estate);
    var s = closes().find(function (x) { return x.estate === estate && x.date === date; });
    if (!s) return;
    var t = summaryText(s);
    var offer = ctx && ctx.user && canClose(ctx.user) && date === EA.today() && EA.fh.plans;
    var esok = offer ? '<div class="esok"><b>' + EA.t('Rancang esok?', 'Plan tomorrow?') + '</b><span>' + EA.t('Pagi esok hanya tanda siapa tidak hadir.', 'Tomorrow morning only mark who is absent.') + '</span>' +
      esokDays().map(esokLabel).join('') + '</div>' : '';
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Ringkasan hari', 'Day summary') + '</h2><pre class="chit">' + esc(t) + '</pre>' + esok +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="ds-back">' + (offer ? 'LATER<small>NANTI · tak rancang sekarang' : '‹ BACK<small>‹ BALIK') + '</small></button>' +
      '<a class="btn" id="ds-wa" href="https://wa.me/?text=' + encodeURIComponent(t) + '" target="_blank" rel="noopener">WHATSAPP<small>Hantar ke kumpulan Ebook</small></a>' +
      '<button class="btn btn-ok" type="button" id="ds-copy">COPY<small>Salin</small></button></div>',
      function (sh) {
        sh.querySelector('#ds-back').onclick = ui().closeSheet;
        sh.querySelector('#ds-copy').onclick = function () { EA.fh.copyText(t); };
        sh.querySelectorAll('[data-esok]').forEach(function (b) {
          b.onclick = function () { EA.local.set('fh.planGo', { estate: estate, date: b.dataset.esok }); ui().closeSheet(); location.hash = 'field-harvest'; };
        });
      });
  }

  // ---------- office answer kept on the phone ----------
  EA.fh.refreshDayClose = async function (estate) {
    if (!EA.sendLink() || !navigator.onLine) return null;
    var j = await EA.ask('dayclose', { estate: estate });
    if (j && Array.isArray(j.days)) { EA.local.set(K.office + estate, { at: Date.now(), from: j.from, days: j.days }); document.dispatchEvent(new CustomEvent('fh:dayclose')); }
    return j;
  };
  // v1.46 (Yu Chen, 27 Oct): no separate daily step. The band on Kerja shows only a day the clerk reopened for a fix.
  EA.fh.dayCloseBand = function (estate, user) {
    if (!canClose(user)) return '';
    var keep = ctx; ctx = Object.assign({}, ctx || {}, { estate: estate });
    try {
      var re = openDays(estate).filter(function (o) { return o.reopened; });
      if (!re.length) return '';
      return '<p class="plan-band due" id="wk-dayclose"><b>' + EA.t('Hari ' + niceDate(re[0].date) + ' dibuka semula', 'Day ' + niceDate(re[0].date) + ' reopened') + '</b>' +
        '<span>' + EA.t('Kerani minta pembetulan. Selepas dibetulkan, tutup hari itu semula.', 'The clerk asked for a fix. After fixing, close that day again.') + '</span>' +
        '<a class="btn btn-ok" href="#field-harvest/close">' + EA.t('TUTUP HARI', 'CLOSE THE DAY') + '</a></p>';
    } finally { ctx = keep; }
  };

  // v1.46: the close at the end of a save. Kerja's report sheet carries this block: when the day is complete it asks
  // "Semua lengkap. Tutup hari ini?" (YA, TUTUP / NANTI); when something is still missing it lists it softly with a
  // button to the screen that fixes it (often the lorry, keyed after the work).
  EA.fh.closeBlock = function (estate, user, date) {
    var st = closeState(estate, user, date);
    if (st.state === 'none') return null;
    var html;
    if (st.state === 'ready' && st.needRain) html = '<div class="dc-ask" id="dc-ask"><b>✓ ' + EA.t('Semua lengkap. Hujan siang ini?', 'All complete. Rain today?') + '</b>' +
      '<small>' + EA.t('Baca tolok dahulu. Tiada hujan: hari ditutup terus. Ada hujan: isi mm dan bila di skrin Tutup hari.', 'Read the gauge first. No rain: the day closes now. Rain: key the mm and when on the close screen.') + '</small>' +
      '<div class="actions"><button type="button" class="btn btn-ghost" id="dc-later">LATER<small>NANTI</small></button>' +
      '<button type="button" class="btn btn-wait" id="dc-wet">IT RAINED<small>ADA HUJAN</small></button>' +
      '<button type="button" class="btn btn-ok" id="dc-dry">NO RAIN · CLOSE<small>TIADA HUJAN · TUTUP</small></button></div></div>';
    else if (st.state === 'ready') html = '<div class="dc-ask" id="dc-ask"><b>✓ ' + EA.t('Semua lengkap. Tutup hari ' + niceDate(date) + '?', 'All complete. Close ' + niceDate(date) + '?') + '</b>' +
      '<small>' + EA.t('Selepas ditutup, hari ini hanya diubah melalui MINTA BETULKAN CHIT (kerani).', 'After closing, changes only through MINTA BETULKAN CHIT (the clerk).') + '</small>' +
      '<div class="actions"><button type="button" class="btn btn-ghost" id="dc-later">' + EA.t('NANTI', 'LATER') + '</button>' +
      '<button type="button" class="btn btn-ok" id="dc-yes">' + EA.t('YA, TUTUP', 'YES, CLOSE') + '</button></div></div>';
    else html = '<div class="dc-ask dc-wait" id="dc-ask"><b>' + EA.t('Tutup hari bila lengkap:', 'Close the day when complete:') + '</b>' +
      st.bad.map(function (x) { return '<button type="button" class="link-btn dc-go" data-go="' + esc(x.go || '#field-harvest/close') + '">• ' + esc(EA.t(x.bm, x.en)) + '</button>'; }).join('') + '</div>';
    return { state: st.state, html: html, wire: function (sh, after) {
      var y = sh.querySelector('#dc-yes'), l = sh.querySelector('#dc-later');
      if (l) l.onclick = function () { var a = sh.querySelector('#dc-ask'); if (a) a.remove(); };
      if (y) y.onclick = function () {
        var s = closeChit(estate, user, st.chit, st.d, {});
        if (!s) return;
        ui().closeSheet(); if (after) after(); showSummary(date, estate);
      };
      var keepD = function (d) { var all = EA.local.get(K.draft, {}); all[estate + '|' + date] = d; EA.local.set(K.draft, all); };
      var dry = sh.querySelector('#dc-dry'), wet = sh.querySelector('#dc-wet');
      if (dry) dry.onclick = function () {
        st.d.rainMm = '0'; st.d.rainTime = ''; st.d.rainWet = false; st.d.rainSeen = true; keepD(st.d);
        var s = closeChit(estate, user, st.chit, st.d, {});
        if (!s) return;
        ui().closeSheet(); if (after) after(); showSummary(date, estate);
      };
      if (wet) wet.onclick = function () { st.d.rainWet = true; st.d.rainSeen = true; keepD(st.d); EA.local.set('fh.daypick', date); ui().closeSheet(); location.hash = '#field-harvest/close'; };
      sh.querySelectorAll('.dc-go').forEach(function (b) { b.onclick = function () { ui().closeSheet(); EA.local.set('fh.workchit', st.chit.chit); location.hash = b.dataset.go; }; });
    } };
  };
  // After the Ramp / lorry save: ask only when the day is now complete (never nag about what is still missing there).
  EA.fh.offerClose = function (estate, user, date) {
    var cb = EA.fh.closeBlock(estate, user, date);
    if (!cb || cb.state !== 'ready') return false;
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Tutup hari', 'Close the day') + '</h2>' + cb.html, function (sh) { cb.wire(sh, null); });
    return true;
  };
  // Safety net at the next morning's chit: a day gone by that is complete but was not closed is closed by the app
  // (marked "ditutup oleh app"); a day still incomplete stays open and is shown on the chit and to the Pengurus.
  EA.fh.autoCloseOld = function (estate, user) {
    if (!canClose(user)) return { closed: [], missing: [] };
    var out = { closed: [], missing: [] }, today = EA.today();
    var keep = ctx; ctx = Object.assign({}, ctx || {}, { estate: estate, user: user });
    try {
      openDays(estate).filter(function (o) { return o.date < today && !o.reopened; }).forEach(function (o) {
        var st = closeState(estate, user, o.date);
        if (st.state === 'ready') { if (closeChit(estate, user, o.chit, st.d, { auto: true })) out.closed.push(o.date); }
        else if (st.state === 'missing') out.missing.push({ date: o.date, bad: st.bad });
      });
    } finally { ctx = keep; }
    if (out.closed.length) ui().toast(EA.t('Hari ' + out.closed.map(niceDate).join(', ') + ' lengkap · ditutup oleh app', 'Day ' + out.closed.map(niceDate).join(', ') + ' complete · closed by the app'));
    return out;
  };

  // v1.51.1 (Yu Chen, 5 Nov 22:36: "why no closing function"): the saved day's card on Kerja carries the close.
  // 'closed', 'ready', 'missing' (with how many things), or 'none' (before the start date, or not the staff).
  function cardState(estate, user, date) {
    if (!canClose(user)) return { state: 'none' };
    var keep = ctx; ctx = Object.assign({}, ctx || {}, { estate: estate, user: user });
    try {
      var l = closedLocal(estate, date), st = officeState(estate, date);
      if ((l && st !== 'reopened' && st !== 'fixing') || st === 'closed') return { state: 'closed', at: l ? l.at : '' };
      var cs = closeState(estate, user, date);
      return { state: cs.state, bad: cs.bad ? cs.bad.length : 0 };
    } finally { ctx = keep; }
  }
  EA.fh.dayclose = { render: render, summaryText: summaryText, showSummary: showSummary, checks: checks, rainCheck: rainCheck, rainFromWork: rainFromWork, closeChit: closeChit, closeState: closeState, cardState: cardState, isClosed: isClosed };
})();
