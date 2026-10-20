// Field & Harvest: Sejarah · History (v1.7). Read only: it shows what was keyed, it changes nothing.
// Approved by Yu Chen 19 Oct 2026 (Field & Harvest Brief, "History").
// - The list: one line per day, newest first, by month.
// - One day opened: Chit (cards), Kerja (day's work), Lori & tiket, Pembetulan (every version).
// Where it comes from: this phone's own records (last 40 days, no signal needed), and with signal
// the office sends the whole month for the estate (days keyed on other phones too).
// A record on this phone always wins over the office copy of the same record (it may be newer).
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};
  var K = { cache: 'fh.hist.' };
  var el, ctx, month, openDay = '', pane = 'chit';
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }
  function task(code) { return EA.lists.task(code); }
  function jobName(code) { var t = task(code); return t ? EA.t(t.bm, t.en) : (code || ''); }
  function ym(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function monthLabel(m) { var x = new Date(m + '-01T00:00:00'); return EA.t(ui().monBm, ui().monEn)[x.getMonth()] + ' ' + x.getFullYear(); }
  var FULL_BM = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  var FULL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function monthLong(m) { var x = new Date(m + '-01T00:00:00'); return EA.t(FULL_BM, FULL_EN)[x.getMonth()] + ' ' + x.getFullYear(); }
  function addMonths(m, n) { var x = new Date(m + '-01T00:00:00'); return ym(new Date(x.getFullYear(), x.getMonth() + n, 1)); }
  var FIRST_MONTH = '2026-01';   // nothing in E-Book before this
  function dayLabel(iso) { var d = new Date(iso + 'T00:00:00'); return EA.t(ui().dayBm, ui().dayEn)[d.getDay()] + ' ' + d.getDate() + ' ' + EA.t(ui().monBm, ui().monEn)[d.getMonth()]; }
  function gangShort(g) { var p = String(g || '').split(' · '); return EA.lang() === 'en' && p[1] ? p[1] : p[0] || EA.t('Lain-lain', 'Other'); }

  // ---------- the days, from this phone ----------
  function localDays(estate) {
    var days = {};
    function day(d) { return days[d] || (days[d] = { date: d, chits: [], work: [], harvest: 0, lorries: [], tickets: [], local: {} }); }
    (EA.fh.allChits ? EA.fh.allChits() : []).forEach(function (c) {
      if (c.estate !== estate) return;
      day(c.date).chits.push({ id: c.chit, at: c.confirmedAt, by: c.keyedName || c.keyedBy, rain: c.rain_mm,
        rows: c.rows.filter(function (r) { return r.status !== 'removed'; }),
        versions: c.versions || [{ at: c.confirmedAt, by: c.keyedName || c.keyedBy, changes: [] }], rev: c.rev || 1, raw: c });
    });
    EA.local.get('fh.work', []).forEach(function (s) {
      if (s.estate !== estate || !s.rec) return;
      var d = day(s.date); d.local.work = true;
      (s.rec.jobs || []).forEach(function (j) {
        d.work.push({ task: j.task_code, block: j.block, lots: j.lots, workers: j.workers, qty: j.qty, unit: j.unit, bunches: j.bunches, status: j.status, reason: j.reason, progress: j.progress, target: j.target });
      });
      (s.rec.lines || []).forEach(function (l) { if (l.task_code === EA.lists.HARVEST) d.harvest += num(l.bunches); });
    });
    var tickets = {};
    EA.local.get('fh.tickets', []).forEach(function (t) {
      if (t.estate !== estate) return;
      var x = { no: t.ticket_no, trip: t.trip, mt: num(t.nett), bunches: num(t.bunches), abw: num(t.abw), date: t.date };
      if (t.trip) tickets[t.trip] = x; else day(t.date).tickets.push(x);
    });
    EA.local.get('fh.collect', []).forEach(function (s) {
      var dsp = s.dispatch;
      if (s.estate !== estate || !dsp || dsp.replacedBy || !dsp.trip) return;
      day(s.date).lorries.push({ trip: dsp.trip, dn: dsp.dn, lorry: dsp.lorry, mill: dsp.mill, bunches: num(dsp.bunches), ticket: tickets[dsp.trip] || null });
      delete tickets[dsp.trip];
    });
    // A ticket for a lorry keyed on another phone: shown on its own ticket date.
    Object.keys(tickets).forEach(function (k) { var t = tickets[k]; day(t.date).tickets.push(t); });
    return days;
  }
  // This phone's records over the office's: same chit / lorry / ticket → the phone's copy.
  function merged(estate, m) {
    var loc = localDays(estate), off = (EA.local.get(K.cache + estate + '.' + m, null) || { days: [] }).days, out = {};
    off.forEach(function (d) { if (d.date.slice(0, 7) === m) out[d.date] = JSON.parse(JSON.stringify(d)); });
    Object.keys(loc).forEach(function (date) {
      if (date.slice(0, 7) !== m) return;
      var l = loc[date], o = out[date];
      if (!o) { out[date] = l; return; }
      l.chits.forEach(function (c) { o.chits = o.chits.filter(function (x) { return x.id !== c.id; }).concat([c]); });
      if (l.local.work) { o.work = l.work; o.harvest = l.harvest; }
      l.lorries.forEach(function (x) {
        var had = o.lorries.find(function (y) { return y.trip === x.trip; });
        if (had && !x.ticket && had.ticket) x.ticket = had.ticket;          // the ticket keyed on the clerk's phone
        o.lorries = o.lorries.filter(function (y) { return y.trip !== x.trip; }).concat([x]);
      });
      l.tickets.forEach(function (t) { o.tickets = o.tickets.filter(function (y) { return y.no !== t.no; }).concat([t]); });
    });
    return Object.keys(out).sort().reverse().map(function (d) { return out[d]; });
  }

  // ---------- the numbers of a day ----------
  function dayFacts(d) {
    var rows = [];
    d.chits.forEach(function (c) { rows = rows.concat(c.rows); });
    var working = rows.filter(function (r) { return r.muster === 'H'; }).length, away = rows.length - working;
    var mt = 0, noTicket = 0;
    d.lorries.forEach(function (x) { if (x.ticket) mt += num(x.ticket.mt); else noTicket++; });
    d.tickets.forEach(function (t) { mt += num(t.mt); });
    var corrected = d.chits.reduce(function (a, c) { return a + Math.max(0, (c.versions || []).length - 1); }, 0);
    return { working: working, away: away, mt: Math.round(mt * 100) / 100, noTicket: noTicket, corrected: corrected };
  }

  // ---------- the screen ----------
  function render(container, c) {
    el = container; ctx = c;
    if (!month) month = ym(new Date());
    if (openDay) return renderDay();
    var testing = !EA.roomLive(ctx.room, ctx.estate);
    var list = merged(ctx.estate, month), thisMonth = ym(new Date());
    var sum = list.reduce(function (a, d) { var f = dayFacts(d); a.mt += f.mt; a.lorries += d.lorries.length; return a; }, { mt: 0, lorries: 0 });
    var cache = EA.local.get(K.cache + ctx.estate + '.' + month, null);
    var vo = EA.fh.viewOnly && EA.fh.viewOnly(ctx.user);
    el.innerHTML = '<div class="room-top"><button type="button" class="back-btn" id="hs-back">← <span class="inline"><span class="bm">Bilik</span><span class="en">Rooms</span></span></button>' +
      '<div class="grow"><h1>' + (vo ? EA.t('Operasi', 'Operations') : EA.t('Sejarah', 'History')) + '</h1><span class="brand-sub">' + esc(ctx.estate) + '</span></div>' +
      (vo ? '<span class="view-badge">' + EA.t('LIHAT SAHAJA', 'VIEW ONLY') + '</span>' : '') +
      (testing ? '<span class="test-badge">' + EA.t('UJIAN', 'TEST') + '</span>' : '') + '</div>' + EA.fh.tabs('history', ctx.user) +
      (vo && month === thisMonth ? todayCard(list) : '') +
      // v1.11: one line for any number of months: ‹ Month › and a year grid behind the month name.
      '<div class="mstep" role="group" aria-label="' + EA.t('Bulan', 'Month') + '">' +
        '<button type="button" id="hs-prev" aria-label="' + EA.t('Bulan sebelum', 'Month before') + '"' + (month <= FIRST_MONTH ? ' disabled' : '') + '>‹</button>' +
        '<button type="button" class="m" id="hs-pick"><b>' + esc(monthLong(month)) + ' ▾</b><small>' + list.length + EA.t(' hari', ' days') + ' · ' + sum.lorries + EA.t(' lori', ' lorries') +
          (sum.mt > 0 ? ' · ' + sum.mt.toFixed(2) + ' MT' : '') + '</small></button>' +
        '<button type="button" id="hs-next" aria-label="' + EA.t('Bulan selepas', 'Month after') + '"' + (month >= thisMonth ? ' disabled' : '') + '>›</button></div>' +
      '<div class="hist" id="hs-list">' + (list.length ? list.map(dayLine).join('') :
        '<p class="hint">' + EA.t('Tiada rekod untuk bulan ini di telefon ini.', 'No records for this month on this phone.') + '</p>') + '</div>' +
      '<p class="hint" id="hs-note">' + (cache ? EA.t('Dari pejabat dan telefon ini · dikemas kini ', 'From the office and this phone · updated ') + esc(cache.at) :
        EA.t('Dari telefon ini sahaja (40 hari). Bulan lain dari pejabat bila ada isyarat.', 'From this phone only (40 days). Other months come from the office when there is signal.')) + '</p>';
    $('#hs-back').onclick = function () { location.hash = ''; };
    function go(m) { month = m; render(el, ctx); refresh(); }
    $('#hs-prev').onclick = function () { if (month > FIRST_MONTH) go(addMonths(month, -1)); };
    $('#hs-next').onclick = function () { if (month < thisMonth) go(addMonths(month, 1)); };
    $('#hs-pick').onclick = function () { pickMonth(Number(month.slice(0, 4)), go); };
    el.querySelectorAll('[data-day]').forEach(function (b) { b.onclick = function () { openDay = b.dataset.day; pane = 'chit'; render(el, ctx); window.scrollTo(0, 0); }; });
    refresh();
  }
  // v1.12 Operasi: the estate's day at a glance, for the clerk and the manager (view only).
  function todayCard(list) {
    var t = EA.today(), d = list.find(function (x) { return x.date === t; });
    var cache = EA.local.get(K.cache + ctx.estate + '.' + month, null);
    var at = cache && cache.at ? String(cache.at).slice(-5) : '';
    var chit = d && d.chits.length ? d.chits[d.chits.length - 1] : null;
    var f = d ? dayFacts(d) : null;
    var workDone = d && d.work && d.work.length;
    var lorries = d ? d.lorries.length : 0, waitTicket = f ? f.noTicket : 0;
    var jobs = [];
    if (chit) chit.rows.forEach(function (r) { if (r.muster === 'H' && r.task_code) { var k = (EA.lists.task(r.task_code) ? EA.t(EA.lists.task(r.task_code).bm, EA.lists.task(r.task_code).en) : r.task_code) + ' ' + EA.t('Blk ', 'Blk ') + (r.block || ''); if (jobs.indexOf(k) < 0) jobs.push(k); } });
    function box(cls, big, small) { return '<div class="tc ' + cls + '"><b>' + big + '</b>' + small + '</div>'; }
    return '<button type="button" class="card today-card"' + (d ? ' data-day="' + t + '"' : '') + '>' +
      '<div class="tc-top"><b>' + EA.t('Hari ini', 'Today') + ' · ' + esc(dayLabel(t)) + '</b>' + (at ? '<span class="live">● ' + esc(at) + '</span>' : '') + '</div>' +
      '<div class="tc-row">' +
        box(chit ? 'ok' : 'wait', chit ? '✓ ' + esc(chit.at || '') : EA.t('Belum', 'Not yet'), EA.t('Pagi', 'Morning')) +
        box(workDone ? 'ok' : 'wait', workDone ? '✓' : EA.t('Belum', 'Not yet'), EA.t('Kerja', 'Work')) +
        box(waitTicket ? 'wait' : (lorries ? 'ok' : ''), lorries + EA.t(' lori', lorries === 1 ? ' lorry' : ' lorries'), waitTicket ? EA.t('Tiket belum', 'No ticket yet') : EA.t('Lori', 'Lorry')) +
      '</div>' +
      (chit ? '<p class="hint">' + f.working + EA.t(' hadir · ', ' at work · ') + f.away + EA.t(' tidak', ' not') + (jobs.length ? ' · ' + esc(jobs.slice(0, 3).join(' · ')) : '') + '</p>' :
        '<p class="hint">' + EA.t('Belum ada rekod hari ini dari staf. Perlu isyarat untuk muat dari pejabat.', 'Nothing from the staff yet today. Needs signal to load from the office.') + '</p>') +
      '</button>';
  }
  // The year grid: 12 months, a dot where this phone has records, months to come greyed out.
  function hasData(m) { return merged(ctx.estate, m).length > 0; }
  function pickMonth(year, go) {
    var thisMonth = ym(new Date()), firstY = Number(FIRST_MONTH.slice(0, 4)), nowY = Number(thisMonth.slice(0, 4));
    var mons = EA.t(ui().monBm, ui().monEn);
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Pilih bulan', 'Pick a month') + '</h2>' +
      '<div class="yr"><button type="button" id="yr-prev"' + (year <= firstY ? ' disabled' : '') + '>‹</button><b>' + year + '</b>' +
      '<button type="button" id="yr-next"' + (year >= nowY ? ' disabled' : '') + '>›</button></div>' +
      '<div class="mgrid">' + mons.map(function (name, i) {
        var m = year + '-' + String(i + 1).padStart(2, '0'), off = m > thisMonth || m < FIRST_MONTH;
        return '<button type="button" data-m="' + m + '"' + (off ? ' disabled' : '') + (m === month ? ' class="on"' : '') + '>' + esc(name) +
          (!off && hasData(m) ? '<i class="dot"></i>' : '') + '</button>';
      }).join('') + '</div>' +
      '<p class="hint">' + EA.t('Titik = ada rekod di telefon ini. Bulan lain dimuat dari pejabat bila ada isyarat.', 'Dot = records on this phone. Other months load from the office with signal.') + '</p>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="mq-this">THIS MONTH<small>Bulan ini</small></button>' +
      '<button class="btn btn-ghost" type="button" id="mq-last">LAST MONTH<small>Bulan lepas</small></button></div>',
      function (s) {
        s.querySelector('#yr-prev').onclick = function () { pickMonth(year - 1, go); };
        s.querySelector('#yr-next').onclick = function () { pickMonth(year + 1, go); };
        s.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { ui().closeSheet(); go(b.dataset.m); }; });
        s.querySelector('#mq-this').onclick = function () { ui().closeSheet(); go(thisMonth); };
        s.querySelector('#mq-last').onclick = function () { ui().closeSheet(); go(addMonths(thisMonth, -1)); };
      });
  }
  function dayLine(d) {
    var f = dayFacts(d), noChit = !d.chits.length;
    var meta = noChit ? [EA.t('Tiada chit', 'No chit')] :
      [f.working + EA.t(' bekerja', ' working'), f.away + EA.t(' tidak', ' not working')];
    if (d.harvest) meta.push(d.harvest.toLocaleString() + EA.t(' tandan', ' bunches'));
    if (d.lorries.length) meta.push(d.lorries.length + EA.t(' lori', d.lorries.length > 1 ? ' lorries' : ' lorry'));
    var tags = (f.corrected ? '<span class="chip2">' + EA.t('dibetulkan ', 'corrected ') + f.corrected + '×</span>' : '') +
      (f.noTicket ? '<span class="chip2">' + EA.t('belum ada tiket', 'no ticket yet') + '</span>' : '');
    return '<button type="button" class="day" data-day="' + d.date + '"><span class="d">' + esc(dayLabel(d.date)) + '</span>' +
      '<span class="mt">' + (f.mt > 0 ? f.mt.toFixed(2) + ' MT' : '—') + '</span>' +
      '<span class="meta">' + esc(meta.join(' · ')) + (tags ? ' ' + tags : '') + '</span></button>';
  }
  async function refresh() {
    if (!EA.sendLink() || !navigator.onLine) return;
    var m = month, est = ctx.estate;
    var r = await EA.ask('history', { estate: est, month: m });
    if (!r || !r.days) return;
    EA.local.set(K.cache + est + '.' + m, { at: r.at, days: r.days });
    if (el && document.body.contains(el) && !el.hidden && month === m && ctx.estate === est && $('#hs-list') && !openDay) render(el, ctx);
  }

  // ---------- one day ----------
  function renderDay() {
    var d = merged(ctx.estate, openDay.slice(0, 7)).find(function (x) { return x.date === openDay; });
    if (!d) { openDay = ''; return render(el, ctx); }
    var f = dayFacts(d), nv = d.chits.reduce(function (a, c) { return a + Math.max(0, (c.versions || []).length - 1); }, 0);
    var vo = EA.fh.viewOnly && EA.fh.viewOnly(ctx.user);
    var panes = [['chit', EA.t('Pagi', 'Morning')], ['work', EA.t('Kerja', 'Work')], ['lorry', EA.t('Lori & tiket', 'Lorries & tickets')], ['fix', EA.t('Pembetulan', 'Corrections') + (nv ? ' · ' + nv : '')]];
    el.innerHTML = '<div class="room-top"><button type="button" class="back-btn" id="hs-up">← ' + (vo ? EA.t('Operasi', 'Operations') : EA.t('Sejarah', 'History')) + '</button>' +
      '<div class="grow"><h1>' + esc(dayLabel(d.date)) + '</h1><span class="brand-sub">' + esc(ctx.estate) + ' · ' + esc(d.date) + '</span></div>' +
      (vo ? '<span class="view-badge">' + EA.t('LIHAT SAHAJA', 'VIEW ONLY') + '</span>' : '') + '</div>' + EA.fh.tabs('history', ctx.user) +
      '<div class="seg2" role="tablist">' + panes.map(function (p) {
        return '<button type="button" role="tab" data-pane="' + p[0] + '" class="' + (pane === p[0] ? 'on' : '') + '" aria-selected="' + (pane === p[0]) + '">' + esc(p[1]) + '</button>';
      }).join('') + '</div><div id="hs-pane">' + (pane === 'work' ? workPane(d) : pane === 'lorry' ? lorryPane(d, f) : pane === 'fix' ? fixPane(d) : chitPane(d)) + '</div>';
    $('#hs-up').onclick = function () { openDay = ''; render(el, ctx); };
    el.querySelectorAll('[data-pane]').forEach(function (b) { b.onclick = function () { pane = b.dataset.pane; renderDay(); }; });
    el.querySelectorAll('[data-wa]').forEach(function (b) {
      b.onclick = function () {
        var c = d.chits.find(function (x) { return x.id === b.dataset.wa; });
        if (!c || !c.raw || !EA.fh.chitText) return;
        var text = EA.fh.chitText(c.raw);
        ui().openSheet('<h2 id="sheet-title">' + EA.t('Teks WhatsApp', 'WhatsApp text') + '</h2><pre class="chit">' + esc(text) + '</pre>' +
          '<div class="actions"><button class="btn btn-ghost" type="button" id="wa-copy">COPY<small>Salin</small></button>' +
          '<button class="btn btn-ghost" type="button" id="wa-close">CLOSE<small>Tutup</small></button></div>',
          function (s) { s.querySelector('#wa-close').onclick = ui().closeSheet; s.querySelector('#wa-copy').onclick = function () { EA.fh.copyText(text); }; });
      };
    });
  }
  function row(left, sub, right, cls) {
    return '<div class="hrow"><div><b>' + left + '</b>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</div><span class="n' + (cls ? ' ' + cls : '') + '">' + right + '</span></div>';
  }
  function chitPane(d) {
    if (!d.chits.length) return '<p class="hint">' + EA.t('Tiada chit pagi untuk hari ini.', 'No morning chit for this day.') + '</p>';
    return d.chits.map(function (c) {
      var rows = c.rows, gangs = {}, away = {};
      rows.forEach(function (r) {
        if (r.muster === 'H') { var g = gangShort((EA.lists.worker(r.worker_id) || {}).gang); gangs[g] = (gangs[g] || 0) + 1; }
        else away[r.muster] = (away[r.muster] || 0) + 1;
      });
      var working = rows.filter(function (r) { return r.muster === 'H'; }).length;
      var marks = EA.fh.marks || {};
      var s = EA.fh.summary ? EA.fh.summary(rows) : { sections: [] };
      var jobs = [];
      s.sections.forEach(function (x) { x.lines.forEach(function (l) { jobs.push(l); }); });
      var head = '<div class="hrow"><div><b>' + EA.t('Chit pagi ', 'Morning chit ') + esc(c.at || '') + '</b><span class="s">' + esc(c.by || '') +
        ((c.versions || []).length > 1 ? ' · ' + EA.t('dibetulkan ', 'corrected ') + ((c.versions.length - 1)) + '×' : '') + '</span></div></div>';
      return '<section class="card">' + head +
        row(EA.t('Hadir ', 'Present ') + working + ' / ' + rows.length, esc(Object.keys(gangs).map(function (g) { return g + ' ' + gangs[g]; }).join(' · ')),
          esc(Object.keys(away).map(function (k) { return away[k] + ' ' + (marks[k] ? EA.t(marks[k][0], marks[k][1]).toLowerCase() : k); }).join(' · '))) +
        jobs.map(function (l) {
          var n = l.mdr + l.m + l.f, tg = EA.lists.target && EA.lists.target(l.task, ctx.estate);
          var sub = (l.lots.length ? EA.t('Petak ', 'Lots ') + l.lots.join(', ') : '') +
            (tg ? (l.lots.length ? ' · ' : '') + EA.t('sasaran ', 'target ') + Math.round(tg.per * n * 100) / 100 + ' ' + (tg.unit === 'bag' ? EA.t('beg', 'bags') : tg.unit === 'palm' ? EA.t('pokok', 'palms') : tg.unit) : '');
          return row(esc(jobName(l.task) + (l.block ? ' · Blk ' + l.block : '')), esc(sub), n + EA.t(' orang', ' people'));
        }).join('') +
        row(EA.t('Hujan semalam', 'Rain last night'), '', esc(num(c.rain).toFixed(1)) + ' mm') +
        (c.raw ? '<button type="button" class="btn btn-ghost" data-wa="' + esc(c.id) + '" style="width:100%">WHATSAPP TEXT<small>Lihat teks WhatsApp</small></button>' : '') +
        '</section>';
    }).join('');
  }
  function workPane(d) {
    if (!d.work.length) return '<p class="hint">' + EA.t('Kerja harian belum disimpan untuk hari ini.', 'The day\'s work was not saved for this day.') + '</p>';
    return '<section class="card">' + (d.harvest ? row(EA.t('Tandan menuai', 'Bunches harvested'), '', d.harvest.toLocaleString()) : '') +
      d.work.map(function (j) {
        var what = num(j.bunches) ? j.bunches + EA.t(' tandan', ' bunches') : j.qty ? j.qty + ' ' + (j.unit || '') : '';
        var st = j.status === 'done' ? '<span class="pill ok">' + EA.t('Siap', 'Done') + '</span>' : j.status === 'not_done' ? '<span class="pill wait">' + EA.t('Belum siap', 'Not done') + '</span>' : '';
        var sub = [j.workers ? j.workers + EA.t(' orang', ' people') : '', what, j.target ? EA.t('sasaran ', 'target ') + j.target : ''].filter(String).join(' · ') +
          (j.status === 'not_done' && j.reason ? '<br>' + esc(j.reason) : '');
        return '<div class="hrow"><div><b>' + esc(jobName(j.task) + (j.block ? ' · Blk ' + j.block : '')) + '</b><span class="s">' + sub + '</span></div>' + st + '</div>';
      }).join('') + '</section>';
  }
  function lorryPane(d, f) {
    if (!d.lorries.length && !d.tickets.length) return '<p class="hint">' + EA.t('Tiada lori pada hari ini.', 'No lorry on this day.') + '</p>';
    return '<section class="card">' + d.lorries.map(function (x) {
      var t = x.ticket;
      return '<div class="hrow"><div><b>DN ' + esc(x.dn || '—') + ' · ' + esc(x.lorry || '') + '</b><span class="s">' + x.bunches + EA.t(' tandan', ' bunches') + ' · ' + esc(x.mill || '') +
        (t ? '<br>' + EA.t('Tiket ', 'Ticket ') + esc(t.no) + ' · ABW ' + num(t.abw).toFixed(2) + ' kg' : '') + '</span></div>' +
        (t ? '<span class="n ok-t">' + num(t.mt).toFixed(2) + ' MT</span>' : '<span class="chip2">' + EA.t('belum ada tiket', 'no ticket yet') + '</span>') + '</div>';
    }).join('') + d.tickets.map(function (t) {
      return row(EA.t('Tiket ', 'Ticket ') + esc(t.no), EA.t('tanpa nota hantar', 'no delivery note'), num(t.mt).toFixed(2) + ' MT');
    }).join('') + row(EA.t('Jumlah', 'Total'), '', f.mt.toFixed(2) + ' MT') + '</section>';
  }
  function changeText(ch) {
    var marks = EA.fh.marks || {};
    function what(x) { return x.muster === 'H' || !x.muster ? jobName(x.task) + (x.block ? ' Blk ' + x.block : '') : (marks[x.muster] ? EA.t(marks[x.muster][0], marks[x.muster][1]) : x.muster); }
    if (ch.kind === 'add') return '+ ' + person(ch.w) + ' → ' + what(ch);
    if (ch.kind === 'off') return '− ' + person(ch.w) + EA.t(' (dikeluarkan dari ', ' (taken off ') + what(ch) + ')';
    return person(ch.w) + ': ' + what(ch.from || {}) + ' → ' + what(ch);
  }
  function fixPane(d) {
    var any = false;
    var html = d.chits.map(function (c) {
      var vs = (c.versions || []).slice().reverse();
      if (vs.length > 1) any = true;
      return '<section class="card"><h2>' + EA.t('Chit ', 'Chit ') + esc(c.at || '') + '</h2>' + vs.map(function (v, i) {
        var n = vs.length - i, first = n === 1;
        var sub = first ? EA.t('Chit asal', 'Original chit') : (v.changes && v.changes.length ? v.changes.map(function (ch) { return esc(changeText(ch)); }).join('<br>') : EA.t('Hujan atau nota diubah', 'Rain or notes changed'));
        return '<div class="hrow"><div><b>' + esc((v.at || '') + ' · ' + (v.by || '')) + '</b><span class="s">' + sub + '</span></div><span class="pill ' + (first ? 'plain' : 'wait') + '">v' + n + '</span></div>';
      }).join('') + '</section>';
    }).join('');
    return (any ? '' : '<p class="hint">' + EA.t('Tiada pembetulan pada hari ini.', 'No corrections on this day.') + '</p>') + html;
  }

  // Leaving History closes the day that was open, so the tab always opens on the list.
  window.addEventListener('hashchange', function () { if (location.hash.indexOf('history') < 0) { openDay = ''; pane = 'chit'; } });
  EA.fh.history = { render: render, reset: function () { openDay = ''; pane = 'chit'; } };
})();
