// Field & Harvest room — TUTUP HARI (day close), v1.43. Room code DCL.
// v1.88 (Brief_Tutup_Hari_Baru, signed 23 Nov 2026): one short screen — only what is missing, each with its own
// fix button; the day named on the button; no rain card (the gauge is read at the morning chit) and no note box.
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
  // v1.88: the rain card that stood here (rainDayCard) is gone: the gauge is read at the morning chit.

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
    // v1.88: a missing line carries its own fix buttons (o.fix), pressed on the close itself where they can be.
    var only = function (o, hash, fix) {
      if (canKey) { o.go = hash; o.fix = fix || []; return o; }
      o.sub = (o.sub ? o.sub + ' · ' : '') + EA.t(TOO_OLD[0], TOO_OLD[1]);
      o.fix = (fix || []).filter(function (f) { return f.k === 'leave'; });
      return o;
    };
    var toWork = function (o, fix) { return only(o, '#field-harvest/work', fix || [{ k: 'work' }]); };
    var toChit = function (o, fix) { return only(o, '#field-harvest', fix || [{ k: 'chit' }]); };
    var toRamp = function (o, fix) { return only(o, '#field-harvest/collect', fix || [{ k: 'dn' }]); };
    var present = (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster === 'H'; });
    // 1 · v1.51: every worker on the list has a pay line (a letter, and a quantity or a day)
    var pl = payLines(estate, c, lines), names = function (ids) { return ids.slice(0, 4).map(person).join(', ') + (ids.length > 4 ? ' +' + (ids.length - 4) : ''); };
    if (!w) out.push(toWork({ n: 1, ok: false, bm: 'Kerja harian belum dikunci', en: 'The day\'s work is not keyed', sub: present.length + EA.t(' orang hadir di chit', ' people present on the chit') }));
    else if (pl.missing.length) out.push(toChit({ n: 1, ok: false, bm: pl.missing.length + ' orang dalam senarai tiada dalam chit', en: pl.missing.length + ' on the list but not on the chit', sub: names(pl.missing) + EA.t(' · tidak datang: TIDAK HADIR… · datang bekerja: BETULKAN CHIT', ' · did not come: ABSENT… · came to work: FIX THE CHIT') },
      [{ k: 'away', ids: pl.missing }, { k: 'chit' }]));
    else if (pl.noLine.length) out.push(toWork({ n: 1, ok: false, bm: pl.noLine.length + ' orang hadir tiada baris kerja', en: pl.noLine.length + ' present with no work line', sub: names(pl.noLine) },
      [{ k: 'work' }, { k: 'away', ids: pl.noLine }]));
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
    // v1.88: the office's field list is read against what this phone has collected since it came (fieldLeft),
    // so SEMUA KE RAMP pressed on this screen turns the line green at once, signal or not.
    var fl = EA.fh.harvest && EA.fh.harvest.fieldLeft ? EA.fh.harvest.fieldLeft(estate) : null, oldLot = {}, blockOf = {};
    lines.forEach(function (l) { if (l.task_code === EA.lists.HARVEST && l.lot) blockOf[l.lot] = l.block || ''; });
    if (bl && Array.isArray(bl.field)) bl.field.forEach(function (x) {
      if (!(x.since && x.since <= c.date)) return;
      oldLot[x.lot] = (oldLot[x.lot] || 0) + (Number(x.bunches) || 0); if (!(x.lot in blockOf)) blockOf[x.lot] = x.block || '';
    });
    var fieldOld = 0, fixLots = {};
    Object.keys(oldLot).forEach(function (lot) {
      var n = fl ? Math.min(oldLot[lot], Math.max(0, fl[lot] || 0)) : oldLot[lot];
      fieldOld += n; if (n > 0) fixLots[lot] = true;
    });
    Object.keys(cutLot).forEach(function (lot) { if (!habisLot[lot] && (gotLot[lot] || 0) < cutLot[lot]) fixLots[lot] = true; });
    var left = Math.max(fieldLeft, fieldOld);
    var rampLots = Object.keys(fixLots).map(function (lot) {
      var have = fl && fl[lot] > 0 ? fl[lot] : (cutLot[lot] || 0) - (gotLot[lot] || 0);
      return { lot: lot, block: blockOf[lot] || ((EA.lists.lot && EA.lists.lot(estate, lot)) || {}).block || '', bunches: Math.max(0, have) };
    }).filter(function (x) { return x.bunches > 0; });
    // v2.00 (Yu Chen, 25 Nov 2026: "Fix"; Brief_Tuai_Kutip_Rupa_Baru 1.2 §5a). In the new look the tractor's job
    // already says, lot by lot, why fruit stayed in the block ("2-2 belum (traktor rosak)"). When every lot still in
    // the block has such an answer, this line takes it and turns green; the close keeps it as the field reason. A lot
    // with fruit left and no answer from Kerja still asks TINGGAL DI LADANG…, as before.
    var cw = colReasons(w), openL = rampLots.map(function (x) { return x.lot; });
    var fromKerja = left > 0 && openL.length > 0 && openL.every(function (l) { return cw[l]; }) ? openL.map(function (l) { return l + ' ' + cw[l]; }).join(', ') : '';
    var noWhyL = openL.filter(function (l) { return !cw[l]; });
    if (!cut) out.push({ n: 2, ok: true, bm: 'Tiada tuaian hari ini', en: 'No harvest today', sub: '' });
    else if (left > 0 && !String(d.fieldNote || '').trim() && fromKerja) out.push({ n: 2, ok: true, bm: cut + ' tandan dituai · ' + left + ' belum ke ramp (sebab dari Kerja)', en: cut + ' bunches cut · ' + left + ' not at the ramp (reason from Work)',
      sub: fromKerja, autoField: fromKerja });
    else if (left > 0 && !String(d.fieldNote || '').trim()) out.push(toRamp({ n: 2, ok: false, bm: left + ' tandan dituai belum ke ramp', en: left + ' bunches cut, not yet at the ramp',
      sub: (Object.keys(cw).length && noWhyL.length ? EA.t('Tiada jawapan dari Kerja: petak ', 'No answer from Work: lot ') + noWhyL.join(', ') + ' · ' : '') + EA.t('Sudah dibawa ke ramp: SEMUA KE RAMP · masih di ladang: TINGGAL DI LADANG…', 'Taken to the ramp: ALL TO THE RAMP · still in the field: LEFT IN THE FIELD…'), note: 'field', left: left },
      (rampLots.length ? [{ k: 'ramp', lots: rampLots }] : []).concat([{ k: 'leave' }])));
    else out.push({ n: 2, ok: true, bm: cut + ' tandan dituai' + (left > 0 ? ' · ' + left + ' belum ke ramp (sebab ditulis)' : ' · semua ke ramp'), en: cut + ' bunches cut' + (left > 0 ? ' · ' + left + ' not at the ramp (reason given)' : ' · all at the ramp'), sub: '' });
    // 3 · every lorry has its delivery note
    var lorries = collectsOf(estate, c.date).filter(function (s) { return s.dispatch && !s.dispatch.replacedBy; });
    var noDn = lorries.filter(function (s) { return !String(s.dispatch.dn || '').trim(); });
    out.push(noDn.length ? toRamp({ n: 3, ok: false, bm: noDn.length + ' lori tiada nota hantar (DN)', en: noDn.length + ' lorry without a delivery note', sub: EA.t('Isi nombor DN di skrin Ramp', 'Key the DN number on the Ramp screen') }, [{ k: 'dn' }])
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
    // 8 · v1.61–1.87 asked the day's rain gauge here. v1.88: the gauge is read once, at the next morning's chit
    // (Brief_Hujan 0.2, Brief_Tutup_Hari_Baru section 3), so the close no longer asks it. Check 5 above stays:
    // work lost to rain is still a reason, as decided 25 Oct.
    var rep = EA.fh.roundRepeats ? EA.fh.roundRepeats(estate, c) : [];
    if (rep.length) out.push({ n: 7, ok: true, warn: true, soft: true, bm: rep.length + ' petak sudah siap pusingan ini dikunci lagi', en: rep.length + ' lots already done this round keyed again',
      sub: rep.map(function (x) { return x.task + ' ' + x.lot + ' (' + EA.t('siap ', 'done ') + x.on.slice(8, 10) + '/' + x.on.slice(5, 7) + (x.why ? ' · ' + x.why : EA.t(' · tiada sebab', ' · no reason')) + ')'; }).join(' · ') });
    return out;
  }
  // v2.00: the tractor's lot-by-lot answers from Kerja (new look, 1.95): lot → why its fruit is not at the ramp.
  function colReasons(w) {
    var m = {};
    ((w && w.rec && w.rec.jobs) || []).forEach(function (j) {
      if (j.task_code !== 'ITF' || !j.progress) return;
      String(j.progress).split(', ').forEach(function (x) { var r = /^([\w\-\/]+) (belum|tidak pergi) \((.*)\)$/.exec(x); if (r) m[r[1]] = (r[2] === 'tidak pergi' ? 'tidak dipergi, ' : '') + r[3]; });
    });
    return m;
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

  // ---------- v1.88 the new close (Brief_Tutup_Hari_Baru, signed by Yu Chen on 23 Nov 2026) ----------
  // Yu Chen, 23 Nov: "i found that the closing day is too complicated", "after this version hardly see ferzelly
  // can close the day". Sugut had closed 3 days in a month. The screen was one long page: a "Hari mana?" card, a
  // rain card, seven numbered checks shown passed or not, a note box, and the button at the bottom; a red line sent
  // him to another screen and he had to find his way back. Now:
  //   · the day is named on the button (TUTUP HARI AHAD 22 NOV); day buttons only when 2 or more days are open;
  //   · only what is MISSING is shown, each with its own fix buttons, done here where it can be: ISI KERJA,
  //     TIDAK HADIR… (the T / S / C letters Kerja uses), SEMUA KE RAMP, TINGGAL DI LADANG… (asks the reason);
  //   · the checks that passed fold under one line; no rain card (the gauge is read at the morning chit) and no
  //     note box (a reason is asked only where one is needed);
  //   · when all is complete: one green line, three figures and one big button; after it, RANCANG ESOK or SELESAI.
  // The checks themselves, the close row sent to the office and the office's rules do not change.
  function dayFigures(estate, c) {
    var w = workOf(c), lines = (w && w.rec && w.rec.lines) || [], bunches = 0;
    lines.forEach(function (l) { if (l.task_code === EA.lists.HARVEST) bunches += num(l.bunches); });
    return {
      present: (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster === 'H'; }).length,
      total: (c.rows || []).filter(function (r) { return r.status !== 'removed'; }).length,
      bunches: bunches,
      lorries: collectsOf(estate, c.date).filter(function (s) { return s.dispatch && !s.dispatch.replacedBy; }).length
    };
  }
  function figsHtml(f) {
    return '<div class="dc-figs"><span><b>' + f.present + '</b>' + EA.t('orang', 'people') + '</span><span><b>' + f.bunches + '</b>' + EA.t('tandan', 'bunches') + '</span>' +
      '<span><b>' + f.lorries + '</b>' + EA.t('lori', 'lorries') + '</span></div>';
  }
  function closeLabel(date) { return EA.t('TUTUP HARI ', 'CLOSE ') + niceDate(date).toUpperCase(); }
  var FIX_TEXT = {
    work: ['ISI KERJA', 'KEY THE WORK'], chit: ['BETULKAN CHIT', 'FIX THE CHIT'], away: ['TIDAK HADIR…', 'ABSENT…'],
    ramp: ['SEMUA KE RAMP', 'ALL TO THE RAMP'], leave: ['TINGGAL DI LADANG…', 'LEFT IN THE FIELD…'], dn: ['ISI DN DI RAMP', 'KEY THE DN AT THE RAMP']
  };
  function fixBtns(x) {
    return (x.fix || []).length ? '<div class="dc-fix">' + x.fix.map(function (f, i) {
      return '<button type="button" class="btn' + (i ? ' btn-ghost' : ' btn-ok') + '" data-fix="' + x.n + '|' + (f.i == null ? i : f.i) + '">' + esc(EA.t(FIX_TEXT[f.k][0], FIX_TEXT[f.k][1])) + '</button>';
    }).join('') + '</div>' : '';
  }
  function lineHtml(x, withFix) {
    var cls = x.ok ? (x.warn ? 'dc-warn' : x.drop ? 'dc-drop' : 'dc-ok') : 'dc-bad';
    return '<li class="dc-it ' + cls + '"><span><b>' + (x.warn ? '⚠' : x.ok ? '✓' : '!') + ' ' + esc(EA.t(x.bm, x.en)) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span>' +
      (withFix ? fixBtns(x) : '') + '</li>';
  }

  function render(container, c) {
    el = container; ctx = c;
    var testing = !EA.roomLive(ctx.room, ctx.estate);
    var head = '<div class="room-top"><button type="button" class="back-btn" id="dc-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<div class="grow"><h1>' + EA.t('Tutup hari', 'Day close') + '</h1><span class="brand-sub">' + esc(ctx.estate) + '</span></div>' +
      (testing ? '<span class="test-badge">' + EA.t('UJIAN', 'TEST') + '</span>' : '') + '</div>' + (EA.fh.tabs ? EA.fh.tabs('work', ctx.user) : '');
    day = null;
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
      var warn = ck.filter(function (x) { return x.ok && x.warn; }), passed = ck.filter(function (x) { return x.ok && !x.warn; });
      // v1.78 drew the days always, so nobody met the row for the first time on a bad morning. With the day now
      // named on the button itself, one open day needs no row; two or more do, and they say how many.
      if (open.length > 1) html += '<div class="card dc-days"><h2>' + EA.t(open.length + ' hari belum ditutup', open.length + ' days not closed') + '</h2>' +
        '<div class="dc-dayrow">' + open.map(function (o) {
          return '<button type="button" class="dc-day' + (o.date === day.date ? ' on' : '') + (o.reopened ? ' re' : '') +
            '" data-day="' + o.date + '"><b>' + esc(dayDm(o.date)) + '</b><small>' + esc(dayName(o.date)) +
            (o.reopened ? EA.t(' · buka semula', ' · reopened') : '') + '</small></button>';
        }).join('') + '</div>' +
        '<p class="hint">' + EA.t('Pilih mana-mana — tidak perlu ikut turutan.', 'Pick any one — they do not have to be in order.') + '</p></div>';
      if (day.reopened) html += '<p class="warn"><b>' + EA.t('Dibuka semula · ', 'Reopened · ') + esc(niceDate(day.date)) + '</b> <span class="bm">Kerani minta pembetulan. Selepas pembetulan dikunci, tutup hari ini semula.</span></p>';
      if (bad.length) {
        html += '<div class="card dc-miss"><h2>' + EA.t('Belum lengkap · ', 'Not complete · ') + esc(niceDate(day.date)) + '</h2>' +
          '<p class="hint">' + EA.t(bad.length + ' perkara. Betulkan di sini, kemudian tutup.', bad.length + (bad.length > 1 ? ' things' : ' thing') + '. Fix here, then close.') + '</p>' +
          '<ul class="dc-list">' + (function () {
            // One button per place: when the work is not keyed at all, check 4 needs the same ISI KERJA as check 1.
            var shown = {};
            return bad.map(function (x) {
              var y = Object.assign({}, x, { fix: (x.fix || []).filter(function (f) { var k = f.k === 'away' || f.k === 'ramp' || f.k === 'leave' ? f.k + x.n : f.k; if (shown[k]) return false; shown[k] = true; return true; }) });
              x.fix.forEach(function (f, i) { if (y.fix.indexOf(f) >= 0) f.i = i; });
              return lineHtml(y, true);
            }).join('');
          })() + '</ul>' +
          (warn.length ? '<ul class="dc-list">' + warn.map(function (x) { return lineHtml(x, false); }).join('') + '</ul>' : '') +
          '<div class="actions"><button type="button" class="btn btn-ok" id="dc-close" disabled>' + esc(closeLabel(day.date)) + '</button></div></div>';
      } else {
        html += '<div class="card dc-done"><h2>✓ ' + EA.t('Semua lengkap untuk ', 'All complete for ') + esc(niceDate(day.date)) + '</h2>' +
          figsHtml(dayFigures(ctx.estate, day.chit)) +
          (warn.length ? '<ul class="dc-list">' + warn.map(function (x) { return lineHtml(x, false); }).join('') + '</ul>' : '') +
          '<div class="actions"><button type="button" class="btn btn-ok btn-main" id="dc-close">' + esc(closeLabel(day.date)) + '</button></div>' +
          '<p class="hint">' + EA.t('Selepas ditutup, hari ini hanya boleh diubah melalui MINTA BETULKAN CHIT (kerani), dalam ' + (EA.fh && EA.fh.FIX_DAYS || 5) + ' hari.', 'After closing, this day changes only through MINTA BETULKAN CHIT (the clerk), within ' + (EA.fh && EA.fh.FIX_DAYS || 5) + ' days.') + '</p></div>';
      }
      // The checks that passed, folded under one line; the work by job (what the checkroll will be given) with them.
      var c1 = ck.find(function (x) { return x.n === 1 && x.pay; });
      if (passed.length) html += '<details class="card dc-passed"><summary>' + EA.t('Lihat ' + passed.length + ' semakan yang lulus', 'See the ' + passed.length + ' checks that passed') + '</summary>' +
        '<ul class="dc-list">' + passed.map(function (x) { return lineHtml(x, false); }).join('') + '</ul>' +
        (String(d.fieldNote || '').trim() ? '<p class="hint">' + EA.t('Sebab buah di ladang: ', 'Why fruit is in the field: ') + esc(d.fieldNote) + ' <button type="button" class="link-btn" id="dc-leave-edit">' + EA.t('UBAH', 'CHANGE') + '</button></p>' : '') +
        (c1 ? payCard(c1.pay) : '') + '</details>';
    }
    if (done.length) html += '<details class="card dc-closed"><summary>' + EA.t('Hari ditutup', 'Days closed') + ' (' + done.length + ')</summary>' + done.map(function (s) {
      return '<div class="wline"><span class="grow"><b>' + esc(niceDate(s.date)) + '</b> <small>' + esc(s.at || '') + (s.rain ? ' · ' + esc(s.rain) : '') + (EA.isWaiting(s.id) ? ' · ' + EA.t('menunggu hantar', 'waiting to send') : '') + '</small></span>' +
        '<button type="button" class="link-btn" data-sum="' + esc(s.date) + '">' + EA.t('Ringkasan', 'Summary') + '</button></div>';
    }).join('') + '</details>';
    el.innerHTML = html;
    wire();
    // The office's list of open days (and the start date) is asked for once a minute at most; the screen redraws when it arrives.
    var o = EA.local.get(K.office + ctx.estate, null);
    if (EA.fh.refreshDayClose && navigator.onLine && (!o || Date.now() - (o.at || 0) > 60000)) EA.fh.refreshDayClose(ctx.estate).then(function (j) { if (j && el && /\/close$/.test(location.hash)) render(el, ctx); });
  }

  function payCard(pl) {
    var away = pl.people.filter(function (p) { return ['S', 'L', 'X'].indexOf(p.letter) >= 0; });
    return '<div class="dc-pay"><h3>' + EA.t('Kerja hari ini', 'Work done today') + '</h3><p class="hint">' + EA.t('Satu huruf setiap pekerja, sama dengan checkroll.', 'One letter per worker, as in the checkroll.') + '</p>' +
      '<table class="dc-paytab">' + pl.jobs.map(function (j) {
        var tot = j.unit === 'Ha' ? j.total.toFixed(2) : j.total, amt = j.kind === 'ticket' ? EA.t('ikut tiket', 'from the ticket') : j.kind === 'bunches' ? tot + ' tandan' : j.bags ? j.bags + ' beg' : tot + ' ' + j.unit, under = j.kind === 'bunches' ? EA.t('MT ikut tiket', 'MT from the ticket') : j.bags ? tot + ' ' + j.unit : '';
        return '<tr><td><span class="dc-k dc-k' + (j.letter === 'P' ? 'P' : 'D') + '">' + (j.kind !== 'day' ? 'P' : j.total === j.n ? '1' : j.total === j.n / 2 ? '½' : '1/½') + '</span></td><td>' + esc(shortName(j.task)) + (j.block ? ' · ' + esc(/^\d+$/.test(j.block) ? 'B' + j.block : j.block) : '') + '<small>' + j.n + EA.t(' orang', ' people') + '</small></td><td class="n">' + esc(amt) + (under ? '<small>' + esc(under) + '</small>' : '') + '</td></tr>';
      }).join('') + away.map(function (p) {
        return '<tr><td><span class="dc-k dc-kX">' + p.letter + '</span></td><td colspan="2">' + esc(person(p.w)) + ' · ' + ({ S: EA.t('sakit', 'sick'), L: EA.t('cuti', 'leave'), X: EA.t('tidak hadir', 'absent') })[p.letter] + '</td></tr>';
      }).join('') + '</table><p class="hint">' + esc(payCountText(pl)) + '</p></div>';
  }

  // TIDAK HADIR…: the people the line names, each with T / S / C, the letters Kerja's card uses. One correction of
  // the chit carries them all (EA.fh.markAway: nothing deleted, the old chit stays on record).
  var AWAY_MARKS = [['T', 'Tidak hadir', 'Absent'], ['S', 'Sakit', 'Sick'], ['C', 'Cuti', 'Leave']];
  function awaySheet(ids) {
    var pick = {};
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Siapa tidak hadir? · ', 'Who was away? · ') + esc(niceDate(day.date)) + '</h2>' +
      '<p class="hint">' + EA.t('Tanda setiap orang yang tidak datang bekerja. Yang datang bekerja: tekan BALIK dan isi kerjanya.', 'Mark each one who did not come to work. Anyone who worked: tap BACK and key his work.') + '</p>' +
      ids.map(function (w) {
        return '<div class="mx-row" data-mxrow="' + esc(w) + '"><div class="mx-name"><b>' + esc(person(w)) + '</b></div><div class="mx-or">' +
          AWAY_MARKS.map(function (x) { return '<button type="button" class="mx-away" data-mw="' + esc(w) + '" data-mk="' + x[0] + '" aria-pressed="false">' + x[0] + '<small>' + EA.t(x[1], x[2]) + '</small></button>'; }).join('') +
          '</div></div>';
      }).join('') +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="aw-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-ok" type="button" id="aw-ok">SAVE<small>Simpan</small></button></div>',
      function (sh) {
        sh.querySelector('#aw-back').onclick = ui().closeSheet;
        sh.querySelectorAll('[data-mw]').forEach(function (b) { b.onclick = function () {
          var w = b.dataset.mw; pick[w] = pick[w] === b.dataset.mk ? '' : b.dataset.mk;
          sh.querySelectorAll('[data-mw="' + w + '"]').forEach(function (o) { o.setAttribute('aria-pressed', o.dataset.mk === pick[w]); });
          var r = sh.querySelector('[data-mxrow="' + w + '"]'); if (r) r.classList.toggle('done', !!pick[w]);
        }; });
        sh.querySelector('#aw-ok').onclick = function () {
          var marks = Object.keys(pick).filter(function (w) { return pick[w]; }).map(function (w) { return { worker: w, mark: pick[w] }; });
          if (!marks.length) { ui().closeSheet(); return; }
          var ok = EA.fh.markAway && EA.fh.markAway(day.chit.chit, marks, ctx.estate);
          ui().closeSheet();
          if (ok) ui().toast(EA.t(marks.length + ' orang ditanda di chit ' + niceDate(day.date), marks.length + ' marked on the chit of ' + niceDate(day.date)));
          else ui().toast(EA.t('Tidak dapat tanda di chit', 'Could not mark on the chit'), 'bad');
          render(el, ctx);
        };
      });
  }
  // SEMUA KE RAMP: the lots of the day still showing fruit in the field, each collected and cleared, after one look.
  function rampSheet(lots) {
    var total = lots.reduce(function (a, l) { return a + num(l.bunches); }, 0);
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Semua ke ramp?', 'All to the ramp?') + '</h2>' +
      '<p class="hint">' + EA.t('Petak ini dicatat dikutip ke ramp dan habis, hari ini. Sama seperti SEMUA KE RAMP di skrin Ramp.', 'These lots are recorded as collected to the ramp and cleared, today. The same as ALL TO THE RAMP on the Ramp screen.') + '</p>' +
      '<ul class="dc-list">' + lots.map(function (l) { return '<li class="dc-it dc-ok"><span><b>' + esc(EA.fh.lotLabel ? EA.fh.lotLabel(l.lot, l.block) : l.lot) + '</b><small>' + l.bunches + ' ' + EA.t('tandan', 'bunches') + '</small></span></li>'; }).join('') + '</ul>' +
      '<p class="hint">' + EA.t('Jika ada buah masih di ladang, tekan BALIK dan pilih TINGGAL DI LADANG…', 'If fruit is still in the field, tap BACK and choose LEFT IN THE FIELD…') + '</p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="rp-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-ok" type="button" id="rp-ok">' + EA.t('YA, ' + total + ' TANDAN KE RAMP', 'YES, ' + total + ' BUNCHES TO THE RAMP') + '</button></div>',
      function (sh) {
        sh.querySelector('#rp-back').onclick = ui().closeSheet;
        sh.querySelector('#rp-ok').onclick = function () {
          var n = 0;
          try { n = EA.fh.toRamp ? EA.fh.toRamp(ctx.estate, lots, 'Tutup hari ' + day.date) : 0; }
          catch (e) { ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad'); return; }
          ui().closeSheet();
          if (n) ui().toast(EA.t(n + ' tandan ke ramp', n + ' bunches to the ramp'));
          render(el, ctx);
          if (navigator.onLine && EA.sendLink()) EA.send().then(function () { return EA.fh.refreshBacklog ? EA.fh.refreshBacklog(ctx.estate) : null; })
            .then(function () { if (el && /\/close$/.test(location.hash)) render(el, ctx); }, function () {});
        };
      });
  }
  // TINGGAL DI LADANG…: why the fruit stays in the field. It goes with the close (as the field reason always did).
  var LEAVE_WHY = [['Traktor rosak · kutip esok', 'Tractor broke down · collect tomorrow'], ['Hujan · jalan basah', 'Rain · wet road'], ['Kutip esok pagi', 'Collect tomorrow morning'], ['Lori tidak datang', 'The lorry did not come']];
  function leaveSheet() {
    var d = draftFor(day.date);
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Kenapa buah tinggal di ladang?', 'Why does the fruit stay in the field?') + '</h2>' +
      '<div class="picks">' + LEAVE_WHY.map(function (y, i) { return '<button type="button" class="pick" data-lw="' + i + '"><b>' + esc(EA.t(y[0], y[1])) + '</b></button>'; }).join('') + '</div>' +
      '<div class="field"><label><span class="bm">Sebab</span><span class="en">Reason</span></label>' +
      '<textarea class="text-input" rows="2" id="lv-why" placeholder="' + EA.t('cth: traktor rosak petang, kutip esok pagi', 'e.g. tractor broke down, collect tomorrow morning') + '">' + esc(d.fieldNote || '') + '</textarea></div>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="lv-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-ok" type="button" id="lv-ok">SAVE<small>Simpan</small></button></div>',
      function (sh) {
        var ta = sh.querySelector('#lv-why');
        sh.querySelector('#lv-back').onclick = ui().closeSheet;
        sh.querySelectorAll('[data-lw]').forEach(function (b) { b.onclick = function () { ta.value = LEAVE_WHY[Number(b.dataset.lw)][0]; ta.focus(); }; });
        sh.querySelector('#lv-ok').onclick = function () {
          var v = String(ta.value || '').trim();
          if (v.length < 5) { ui().toast(EA.t('Tulis sebab (sekurang-kurangnya 5 huruf)', 'Write the reason (at least 5 letters)'), 'bad'); return; }
          d.fieldNote = v; keepDraft(day.date, d); ui().closeSheet(); render(el, ctx);
        };
      });
  }

  function wire() {
    $('#dc-back').onclick = function () { location.hash = '#field-harvest/work'; };
    el.querySelectorAll('[data-day]').forEach(function (b) {
      b.onclick = function () { EA.local.set('fh.daypick', b.dataset.day); render(el, ctx); window.scrollTo(0, 0); };
    });
    el.querySelectorAll('[data-sum]').forEach(function (b) { b.onclick = function () { showSummary(b.dataset.sum); }; });
    if (!day) return;
    var d = draftFor(day.date), ck = checks(ctx.estate, day.chit, d);
    el.querySelectorAll('[data-fix]').forEach(function (b) { b.onclick = function () {
      var p = b.dataset.fix.split('|'), x = ck.find(function (y) { return String(y.n) === p[0]; }), f = x && x.fix && x.fix[Number(p[1])];
      if (!f) return;
      if (f.k === 'away') return awaySheet(f.ids || []);
      if (f.k === 'ramp') return rampSheet(f.lots || []);
      if (f.k === 'leave') return leaveSheet();
      // Another screen: hand it the chit of the day being closed, so it opens that day and not today's.
      EA.local.set('fh.workchit', day.chit.chit);
      location.hash = f.k === 'chit' ? '#field-harvest' : f.k === 'dn' ? '#field-harvest/collect' : '#field-harvest/work';
    }; });
    var le = $('#dc-leave-edit'); if (le) le.onclick = leaveSheet;
    var cb = $('#dc-close'); if (cb) cb.onclick = function () { var ok = closeChit(ctx.estate, ctx.user, day.chit, d, {}); render(el, ctx); if (ok) afterClose(ok, ctx.estate, ctx.user); };
  }

  // After the press: what was closed, then RANCANG ESOK or SELESAI. The WhatsApp summary stays one tap away.
  function afterClose(s, estate, user) {
    var keep = ctx; ctx = Object.assign({}, ctx || {}, { estate: estate, user: user });
    try {
      var t = summaryText(s);
      var esok = user && canClose(user) && EA.fh.plans ? '<div class="esok"><b>' + EA.t('Rancang esok?', 'Plan tomorrow?') + '</b><span>' + EA.t('Pagi esok hanya tanda siapa tidak hadir.', 'Tomorrow morning only mark who is absent.') + '</span>' + esokDays().map(esokLabel).join('') + '</div>' : '';
      ui().openSheet('<h2 id="sheet-title">✓ ' + esc(niceDate(s.date)) + EA.t(' ditutup', ' closed') + '</h2>' +
        figsHtml({ present: s.present, bunches: s.bunches, lorries: s.lorries }) + esok +
        '<div class="actions"><a class="btn btn-ghost" id="ds-wa" href="https://wa.me/?text=' + encodeURIComponent(t) + '" target="_blank" rel="noopener">WHATSAPP<small>WHATSAPP</small></a>' +
        '<button class="btn btn-ok" type="button" id="ds-done">' + EA.t('SELESAI', 'DONE') + '</button></div>',
        function (sh) {
          sh.querySelector('#ds-done').onclick = ui().closeSheet;
          sh.querySelectorAll('[data-esok]').forEach(function (b) {
            b.onclick = function () { EA.local.set('fh.planGo', { estate: estate, date: b.dataset.esok }); ui().closeSheet(); location.hash = 'field-harvest'; };
          });
        });
    } finally { ctx = keep; }
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
    var af = (ck.find(function (x) { return x.n === 2 && x.autoField; }) || {}).autoField || '';   // v2.00: the reason from Kerja
    var fnote = String(d.fieldNote || '').trim() || (af ? 'Buah belum ke ramp (Kerja): ' + af : '');
    var note = [fnote, String(d.note || '').trim(), opts.auto ? 'Ditutup oleh app (lengkap) semasa chit pagi' : ''].filter(Boolean).join(' · ').slice(0, 200);
    var rec;
    try {
      rec = EA.save(TAB, ROOM, estate, { date: c.date, chit: c.chit, kind: 'close', closed_by: user.code, closed_at: at, checks: checksTxt,
        rain_when: keepRain ? (RAIN_WHEN[rain.reason] || 'work') : '', rain_reason: keepRain ? rain.reason : '', rain_lost: keepRain ? String(rain.lost) : '', rain_jobs: keepRain ? rain.jobs.join(' ') : '',
        workers: String(total), present: String(present), bunches: String(bunches), jobs_done: String(jobs.filter(function (j) { return j.status === 'done'; }).length), jobs_planned: String(jobs.length),
        // v1.88: no gauge reading at the close any more (it is on the next morning's chit); the columns stay, empty.
        lorries: String(lorries), note: note, rain_mm: '', rain_time: '' }, old && old.reopened ? old.id : '');
    } catch (e) { if (!opts.auto) ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad'); return null; }
    var s = { id: rec.id, estate: estate, date: c.date, chit: c.chit, at: at.slice(11), by: user.code, byName: user.name, present: present, total: total, bunches: bunches, auto: !!opts.auto,
      jobsDone: jobs.filter(function (j) { return j.status === 'done'; }).length, jobs: jobs.length, lorries: lorries, rain: keepRain ? rainLabel(rain) + ' · ' + lostLabel(rain.lost) : '', rainJobs: keepRain ? rain.jobs : [],
      noGauge: true,
      // v1.50.1 (Yu Chen, 5 Nov): who was away, by name and mark, for the day summary.
      pay: (function () { var c1 = ck.find(function (x) { return x.n === 1 && x.pay; }); return c1 ? payCountText(c1.pay) : ''; })(),
      away: (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster !== 'H'; }).map(function (r) { return person(r.worker_id) + ' (' + r.muster + ')'; }),
      notDone: jobs.filter(function (j) { return j.status === 'not_done'; }).map(function (j) { return { job: shortName(j.task_code) + (j.block ? ' Blk ' + j.block : ''), why: j.reason || '' }; }), note: d.note || '', fieldNote: d.fieldNote || af };
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
      // v1.88: no rain check any more (read at the morning chit), so what is missing is simply what failed.
      return { state: bad.length ? 'missing' : 'ready', chit: o.chit, d: d, checks: ck, bad: bad, reopened: o.reopened };
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
    // v1.88: a close no longer carries the gauge (it is read at the next morning's chit), so only the work lost to
    // rain is told here; a close of 1.61–1.87 still shows the reading it was keyed with.
    if (!s.noGauge && s.rainMm !== undefined) L.push('Hujan siang: ' + dayRainText(s.rainMm, s.rainTime));
    if (s.rain) L.push((s.noGauge || s.rainMm !== undefined ? 'Kerja terjejas hujan: ' : 'Hujan: ') + s.rain + (s.rainJobs && s.rainJobs.length ? ' (' + s.rainJobs.map(shortName).join(', ') + ') · jadi baki kerja' : ''));
    else if (!s.noGauge && s.rainMm === undefined) L.push('Hujan: tiada');
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
    if (st.state === 'ready') html = '<div class="dc-ask" id="dc-ask"><b>✓ ' + EA.t('Semua lengkap. Tutup hari ' + niceDate(date) + '?', 'All complete. Close ' + niceDate(date) + '?') + '</b>' +
      '<small>' + EA.t('Selepas ditutup, hari ini hanya diubah melalui MINTA BETULKAN CHIT (kerani).', 'After closing, changes only through MINTA BETULKAN CHIT (the clerk).') + '</small>' +
      '<div class="actions"><button type="button" class="btn btn-ghost" id="dc-later">' + EA.t('NANTI', 'LATER') + '</button>' +
      '<button type="button" class="btn btn-ok" id="dc-yes">' + esc(closeLabel(date)) + '</button></div></div>';
    else html = '<div class="dc-ask dc-wait" id="dc-ask"><b>' + EA.t('Tutup hari bila lengkap:', 'Close the day when complete:') + '</b>' +
      st.bad.map(function (x) { return '<button type="button" class="link-btn dc-go" data-go="' + esc(x.go || '#field-harvest/close') + '">• ' + esc(EA.t(x.bm, x.en)) + '</button>'; }).join('') +
      // v1.88: the close screen fixes most of these on the spot, so it is offered first.
      '<a class="btn btn-ok" href="#field-harvest/close" id="dc-toclose" data-day="' + esc(date) + '">' + EA.t('BUKA TUTUP HARI', 'OPEN THE DAY CLOSE') + '</a></div>';
    return { state: st.state, html: html, wire: function (sh, after) {
      var y = sh.querySelector('#dc-yes'), l = sh.querySelector('#dc-later');
      if (l) l.onclick = function () { var a = sh.querySelector('#dc-ask'); if (a) a.remove(); };
      if (y) y.onclick = function () {
        var s = closeChit(estate, user, st.chit, st.d, {});
        if (!s) return;
        ui().closeSheet(); if (after) after(); afterClose(s, estate, user);
      };
      var tc = sh.querySelector('#dc-toclose'); if (tc) tc.onclick = function () { EA.local.set('fh.daypick', date); ui().closeSheet(); };
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
