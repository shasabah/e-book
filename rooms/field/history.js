// Field & Harvest: Rekod · Records (v1.26; was Sejarah · History, v1.7). Read only: it shows what was keyed.
// Approved by Yu Chen 21 Oct 2026 (Field & Harvest Brief, "Rekod & laporan bulan"; format A).
// - The month: four boxes (tandan, MT, ABW, hari tuai) that open detail pages like the estate's Excel,
//   PRINT MONTH REPORT (A4, 2 pages), then one short line per day grouped by week (P K L, present, bunches, MT).
// - One day opened: one page (plan and result per job, who did not work, lorries, one line for corrections).
// Where it comes from: this phone's own records (last 40 days, no signal needed), and with signal
// the office sends the whole month for the estate (days keyed on other phones too) and the crop detail.
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

  // ---------- v1.26 Rekod: the month's crop from the office (bunches per harvester, tickets, budget) ----------
  var KC = 'fh.crop.';
  function crop(estate, m) { return EA.local.get(KC + estate + '.' + m, null); }
  function canPrint(u) { return !!u && /^(Owner|HQ|Clerk|Manager)$/.test(u.role); }
  function daysIn(m) { var x = new Date(m + '-01T00:00:00'); return new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); }
  function shortDay(iso) { var d = new Date(iso + 'T00:00:00'); return EA.t(['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])[d.getDay()] + ' ' + d.getDate(); }
  function f2(n) { return (Math.round(num(n) * 100) / 100).toFixed(2); }
  function n0(n) { return Math.round(num(n)).toLocaleString('en-US'); }
  // The month's totals: from the office's crop answer when there is one, otherwise from the days.
  function totals(list, c) {
    var t = { bunches: 0, mt: 0, harvestDays: 0, lorries: 0 };
    list.forEach(function (d) { if (d.harvest > 0) t.harvestDays++; t.lorries += d.lorries.length + d.tickets.length; });
    if (c && c.harvesters) {
      var days = {};
      c.harvesters.forEach(function (h) { Object.keys(h.days).forEach(function (k) { t.bunches += num(h.days[k]); days[k] = 1; }); });
      t.harvestDays = Math.max(t.harvestDays, Object.keys(days).length);
      t.mt = c.tickets.reduce(function (a, x) { return a + num(x.nett); }, 0);
      t.lorries = Math.max(t.lorries, c.tickets.length);
    } else {
      list.forEach(function (d) { t.bunches += d.harvest; t.mt += dayFacts(d).mt; });
    }
    t.mt = Math.round(t.mt * 100) / 100;
    t.abw = t.bunches && t.mt ? Math.round(t.mt * 1000 / t.bunches * 100) / 100 : 0;
    return t;
  }
  function tiles(t, on) {
    return '<div class="rk-sum">' + [['tandan', n0(t.bunches), EA.t('tandan', 'bunches')], ['mt', f2(t.mt), 'MT'], ['abw', t.abw ? t.abw.toFixed(2) : '—', EA.t('ABW kg', 'ABW kg')], ['hari', String(t.harvestDays), EA.t('hari tuai', 'harvest days')]].map(function (x) {
      return '<button type="button" data-detail="' + x[0] + '"' + (on === x[0] ? ' class="on" aria-pressed="true"' : '') + '><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></button>';
    }).join('') + '</div>';
  }

  // ---------- the screen ----------
  var detail = '';
  function title() { var vo = EA.fh.viewOnly && EA.fh.viewOnly(ctx.user); return vo ? EA.t('Operasi', 'Operations') : EA.t('Rekod', 'Records'); }
  function head(h1, sub, backId) {
    var vo = EA.fh.viewOnly && EA.fh.viewOnly(ctx.user), testing = !EA.roomLive(ctx.room, ctx.estate);
    return '<div class="room-top"><button type="button" class="back-btn" id="' + backId + '">‹ BACK<small>‹ BALIK</small></button>' +
      '<div class="grow"><h1>' + h1 + '</h1><span class="brand-sub">' + sub + '</span></div>' +
      (vo ? '<span class="view-badge">' + EA.t('LIHAT SAHAJA', 'VIEW ONLY') + '</span>' : '') +
      (testing ? '<span class="test-badge">' + EA.t('UJIAN', 'TEST') + '</span>' : '') + '</div>' + EA.fh.tabs('history', ctx.user);
  }
  function render(container, c) {
    el = container; ctx = c;
    if (!month) month = ym(new Date());
    if (detail) return renderDetail();
    if (openDay) return renderDay();
    var vo = EA.fh.viewOnly && EA.fh.viewOnly(ctx.user);
    var list = merged(ctx.estate, month), thisMonth = ym(new Date());
    var cr = crop(ctx.estate, month), t = totals(list, cr);
    var cache = EA.local.get(K.cache + ctx.estate + '.' + month, null);
    el.innerHTML = head(esc(title()), esc(ctx.estate), 'hs-back') +
      (vo && month === thisMonth ? todayCard(list) : '') +
      // v1.11: one line for any number of months: ‹ Month › and a year grid behind the month name.
      '<div class="mstep" role="group" aria-label="' + EA.t('Bulan', 'Month') + '">' +
        '<button type="button" id="hs-prev" aria-label="' + EA.t('Bulan sebelum', 'Month before') + '"' + (month <= FIRST_MONTH ? ' disabled' : '') + '>‹</button>' +
        '<button type="button" class="m" id="hs-pick"><b>' + esc(monthLong(month)) + ' ▾</b><small>' + list.length + EA.t(' hari ada rekod', ' days with records') + '</small></button>' +
        '<button type="button" id="hs-next" aria-label="' + EA.t('Bulan selepas', 'Month after') + '"' + (month >= thisMonth ? ' disabled' : '') + '>›</button></div>' +
      tiles(t, '') +
      (canPrint(ctx.user) ? '<button type="button" class="rk-print" id="rk-print"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg><span>PRINT MONTH REPORT<small>Cetak laporan bulan · PDF</small></span></button>' : '') +
      '<div id="hs-list">' + (list.length ? weeks(list) :
        '<p class="hint">' + EA.t('Tiada rekod untuk bulan ini.', 'No records for this month.') + '</p>') + '</div>' +
      '<p class="hint" id="hs-note">' + EA.t('P = chit pagi · K = kerja harian · L = lori/tiket. Hijau ada, kuning patut ada tetapi tiada. ', 'P = morning chit · K = day\'s work · L = lorry/ticket. Green there, yellow should be there but is not. ') +
        (cache ? EA.t('Dari pejabat dan telefon ini · dikemas kini ', 'From the office and this phone · updated ') + esc(cache.at) :
        EA.t('Dari telefon ini sahaja (40 hari). Bulan lain dari pejabat bila ada isyarat.', 'From this phone only (40 days). Other months come from the office when there is signal.')) + '</p>';
    $('#hs-back').onclick = function () { location.hash = ''; };
    function go(m) { month = m; render(el, ctx); }
    $('#hs-prev').onclick = function () { if (month > FIRST_MONTH) go(addMonths(month, -1)); };
    $('#hs-next').onclick = function () { if (month < thisMonth) go(addMonths(month, 1)); };
    $('#hs-pick').onclick = function () { pickMonth(Number(month.slice(0, 4)), go); };
    el.querySelectorAll('[data-day]').forEach(function (b) { b.onclick = function () { openDay = b.dataset.day; render(el, ctx); window.scrollTo(0, 0); }; });
    el.querySelectorAll('[data-detail]').forEach(function (b) { b.onclick = function () { detail = b.dataset.detail; render(el, ctx); window.scrollTo(0, 0); }; });
    var pb = $('#rk-print'); if (pb) pb.onclick = printSheet;
    if (!quiet) refresh();
  }
  // Monday-to-Sunday weeks, newest first, each with its bunches and MT.
  function weekStart(iso) { var d = new Date(iso + 'T00:00:00'), k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d; }
  function weeks(list) {
    var groups = [], by = {};
    list.forEach(function (d) {
      var s = weekStart(d.date), key = s.toDateString();
      if (!by[key]) { by[key] = { start: s, days: [] }; groups.push(by[key]); }
      by[key].days.push(d);
    });
    var nowKey = weekStart(EA.today()).toDateString();
    return groups.map(function (g) {
      var e = new Date(g.start); e.setDate(e.getDate() + 6);
      var b = 0, mt = 0; g.days.forEach(function (d) { b += d.harvest; mt += dayFacts(d).mt; });
      var mons = EA.t(ui().monBm, ui().monEn);
      var label = (g.start.toDateString() === nowKey ? EA.t('Minggu ini · ', 'This week · ') : '') + g.start.getDate() + (g.start.getMonth() !== e.getMonth() ? ' ' + mons[g.start.getMonth()] : '') + '–' + e.getDate() + ' ' + mons[e.getMonth()];
      return '<div class="rk-wk"><span>' + esc(label) + '</span><span>' + n0(b) + EA.t(' tandan', ' bunches') + (mt ? ' · ' + f2(mt) + ' MT' : '') + '</span></div>' +
        '<div class="rk-tbl"><div class="rk-r rk-h"><span>' + EA.t('Hari', 'Day') + '</span><span>P K L</span><span class="n">' + EA.t('Hadir', 'Present') + '</span><span class="n">' + EA.t('Tandan', 'Bunches') + '</span><span class="n">MT</span></div>' +
        g.days.map(dayLine).join('') + '</div>';
    }).join('');
  }
  function dayLine(d) {
    var f = dayFacts(d), today = EA.today();
    var hasChit = d.chits.length > 0, hasWork = d.work.length > 0, hasLorry = d.lorries.length + d.tickets.length > 0;
    var anyH = f.working > 0, live = !d.imp || d.chits.some(function (c) { return !c.imp; });
    var P = hasChit ? 'y' : (live && (hasWork || hasLorry) ? 'w' : 'o');
    var Kd = hasWork ? 'y' : (live && hasChit && anyH && d.date < today && !d.imp ? 'w' : 'o');
    var L = hasLorry ? 'y' : 'o';
    var rest = !d.harvest && !hasWork && !hasLorry && !anyH;
    var sub = f.corrected ? EA.t('dibetulkan ', 'corrected ') + f.corrected + '×' : d.imp && !d.chits.some(function (c) { return !c.imp; }) ? '<i class="rk-old">' + EA.t('Data lama', 'Old data') + '</i>' : rest ? EA.t('tiada tuaian', 'no harvest') : f.noTicket ? EA.t('belum ada tiket', 'no ticket yet') : '';
    var rows = f.working + f.away;
    return '<button type="button" class="rk-r' + (rest ? ' rest' : '') + '" data-day="' + d.date + '"><span class="d"><b>' + esc(shortDay(d.date)) + '</b><small>' + sub + '</small></span>' +
      '<span class="rk-dots"><i class="' + P + '">P</i><i class="' + Kd + '">K</i><i class="' + L + '">L</i></span>' +
      '<span class="n">' + (rows ? f.working + '/' + rows : '—') + '</span><span class="n">' + (d.harvest ? n0(d.harvest) : '—') + '</span>' +
      '<span class="n' + (f.mt > 0 ? ' mt' : '') + '">' + (f.mt > 0 ? f2(f.mt) : '—') + '</span></button>';
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
  var quiet = false, asking = {};
  async function refresh() {
    if (!EA.sendLink() || !navigator.onLine) return;
    var m = month, est = ctx.estate, key = est + '.' + m;
    if (asking[key]) return;
    asking[key] = true;
    var r = null, c = null;
    try { var both = await Promise.all([EA.ask('history', { estate: est, month: m }), EA.ask('crop', { estate: est, month: m })]); r = both[0]; c = both[1]; }
    finally { asking[key] = false; }
    if (r && r.days) EA.local.set(K.cache + key, { at: r.at, days: r.days });
    if (c && c.harvesters) EA.local.set(KC + key, c);
    if (!r && !c) return;
    // v1.19: redraw without asking again (asking on every redraw made a loop of office calls).
    if (el && document.body.contains(el) && !el.hidden && month === m && ctx.estate === est) { quiet = true; try { render(el, ctx); } finally { quiet = false; } }
  }

  // ---------- one day: one page, no tabs (v1.26) ----------
  function renderDay() {
    var d = merged(ctx.estate, openDay.slice(0, 7)).find(function (x) { return x.date === openDay; });
    if (!d) { openDay = ''; return render(el, ctx); }
    var f = dayFacts(d), chit = d.chits.length ? d.chits[d.chits.length - 1] : null;
    var oldOnly = d.imp && !d.chits.some(function (c) { return !c.imp; });
    var who = chit ? (chit.byName || chit.by || '') : '';
    var sub = esc(ctx.estate) + (chit && chit.at ? ' · chit ' + esc(chit.at) : '') + (who && !oldOnly ? ' · ' + esc(who) : '') + (oldOnly ? ' · <i class="rk-old">' + EA.t('Data lama', 'Old data') + '</i> ' + EA.t('dari fail ladang', 'from the estate files') : '');
    var cr = crop(ctx.estate, openDay.slice(0, 7)), dayN = Number(openDay.slice(8, 10));
    var harv = cr ? cr.harvesters.filter(function (h) { return num(h.days[dayN]) > 0; }).map(function (h) { return { name: h.name, b: num(h.days[dayN]) }; }) : [];
    var rows = f.working + f.away;
    var h = head(esc(dayLabel(d.date)), sub, 'hs-up') +
      '<div class="rk-strip"><div><b>' + (rows ? f.working + ' / ' + rows : '—') + '</b><small>' + EA.t('hadir', 'present') + '</small></div>' +
      '<div><b>' + (d.harvest ? n0(d.harvest) : '—') + '</b><small>' + EA.t('tandan', 'bunches') + '</small></div>' +
      '<div><b>' + (f.mt ? f2(f.mt) : '—') + '</b><small>' + (d.lorries.length + d.tickets.length) + EA.t(' lori · MT', ' lorry · MT') + '</small></div></div>' +
      jobsCard(d, chit) + (harv.length ? harvCard(harv) : '') + lorryCard(d, f);
    if (f.corrected) h += '<button type="button" class="card rk-fix" id="rk-fix"><span>' + EA.t('Chit dibetulkan ', 'Chit corrected ') + f.corrected + '×</span><b>' + EA.t('LIHAT ›', 'SEE ›') + '</b></button>';
    if (chit && chit.raw) h += '<button type="button" class="btn btn-ghost rk-wa" data-wa="' + esc(chit.id) + '">WHATSAPP TEXT<small>Lihat teks WhatsApp</small></button>';
    el.innerHTML = h;
    $('#hs-up').onclick = function () { openDay = ''; render(el, ctx); };
    var fx = $('#rk-fix'); if (fx) fx.onclick = function () {
      ui().openSheet('<h2 id="sheet-title">' + EA.t('Pembetulan', 'Corrections') + '</h2>' + fixPane(d) + '<div class="actions"><button class="btn btn-ghost" type="button" id="fx-close">CLOSE<small>Tutup</small></button></div>',
        function (s) { s.querySelector('#fx-close').onclick = ui().closeSheet; });
    };
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
  function unitWord(u) { return u === 'bag' ? EA.t('beg', 'bags') : u === 'palm' ? EA.t('pokok', 'palms') : u === 'day' ? EA.t('hari', 'day') : u === 'bunch' ? EA.t('tandan', 'bunches') : (u || ''); }
  // The morning's plan and the afternoon's result in one line per job.
  function jobsCard(d, chit) {
    var jobs = [], by = {};
    function job(task, block) { var k = task + '|' + (block || ''); if (!by[k]) { by[k] = { task: task, block: block || '', people: 0, lots: [], res: null }; jobs.push(by[k]); } return by[k]; }
    if (chit && EA.fh.summary) EA.fh.summary(chit.rows).sections.forEach(function (x) {
      x.lines.forEach(function (l) { var j = job(l.task, l.block); j.people += l.mdr + l.m + l.f; l.lots.forEach(function (lt) { if (j.lots.indexOf(lt) < 0) j.lots.push(lt); }); });
    });
    d.work.forEach(function (w) { var j = job(w.task, w.block); j.res = w; if (!j.people) j.people = w.workers || 0; if (!j.lots.length && w.lots) j.lots = String(w.lots).split(/[\s,]+/).filter(String); });
    var away = [];
    if (chit) chit.rows.forEach(function (r) { if (r.muster !== 'H') away.push(person(r.worker_id) + ' (' + ((EA.fh.marks || {})[r.muster] ? EA.t(EA.fh.marks[r.muster][0], EA.fh.marks[r.muster][1]).toLowerCase() : r.muster) + ')'); });
    if (!jobs.length && !away.length) return '';
    var people = jobs.reduce(function (a, j) { return a + j.people; }, 0);
    return '<section class="card rk-card"><h2>' + EA.t('Kerja', 'Work') + '<small>' + jobs.length + EA.t(' kerja · ', ' jobs · ') + people + EA.t(' orang', ' people') + '</small></h2>' +
      jobs.map(function (j) {
        var r = j.res, lines = [], st = '';
        lines.push((j.people ? j.people + EA.t(' orang', ' people') : '') + (j.lots.length ? (j.people ? ' · ' : '') + EA.t('petak ', 'lots ') + j.lots.join(', ') : ''));
        if (r) {
          var what = num(r.bunches) ? n0(r.bunches) + EA.t(' tandan', ' bunches') : r.qty ? r.qty + (r.target ? ' / ' + r.target : '') + ' ' + unitWord(r.unit) : '';
          if (what) lines.push(what);
          if (r.status === 'not_done' && r.reason) lines.push('<span class="why">' + esc(r.reason) + '</span>');
          st = r.status === 'done' ? '<span class="pill ok">' + EA.t('Siap', 'Done') + '</span>' : r.status === 'not_done' ? '<span class="pill wait">' + EA.t('Belum siap', 'Not done') + '</span>' : '';
        } else if (!d.imp) st = '<span class="pill plain">' + EA.t('Tiada hasil', 'No result') + '</span>';
        return '<div class="rk-job"><div><b>' + esc(jobName(j.task) + (j.block ? ' · Blk ' + j.block : '')) + '</b>' + lines.filter(String).map(function (x) { return '<small>' + (/^<span/.test(x) ? x : esc(x)) + '</small>'; }).join('') + '</div>' + st + '</div>';
      }).join('') + (away.length ? '<p class="rk-away">' + EA.t('Tidak bekerja: ', 'Not working: ') + esc(away.join(' · ')) + '</p>' : '') + '</section>';
  }
  function harvCard(harv) {
    return '<section class="card rk-card"><h2>' + EA.t('Tuaian ikut penuai', 'Harvest by harvester') + '<small>' + harv.length + EA.t(' penuai', ' harvesters') + '</small></h2>' +
      harv.map(function (x) { return '<div class="rk-job"><div><b>' + esc(x.name) + '</b></div><b>' + n0(x.b) + '</b></div>'; }).join('') + '</section>';
  }
  function lorryCard(d, f) {
    var n = d.lorries.length + d.tickets.length;
    var h = '<section class="card rk-card"><h2>' + EA.t('Lori & tiket', 'Lorries & tickets') + '<small>' + (n ? f2(f.mt) + ' MT' : EA.t('tiada lori hari ini', 'no lorry this day')) + '</small></h2>';
    d.lorries.forEach(function (x) {
      var t = x.ticket;
      h += '<div class="rk-job"><div><b>DN ' + esc(x.dn || '—') + ' · ' + esc(x.lorry || '') + '</b><small>' + n0(x.bunches) + EA.t(' tandan', ' bunches') + ' · ' + esc(x.mill || '') + (t ? ' · ' + EA.t('tiket ', 'ticket ') + esc(t.no) + (t.abw ? ' · ABW ' + num(t.abw).toFixed(2) + ' kg' : '') : '') + '</small></div>' +
        (t ? '<b class="ok-t">' + f2(t.mt) + ' MT</b>' : '<span class="chip2">' + EA.t('belum ada tiket', 'no ticket yet') + '</span>') + '</div>';
    });
    d.tickets.forEach(function (t) { h += '<div class="rk-job"><div><b>' + EA.t('Tiket ', 'Ticket ') + esc(t.no) + '</b><small>' + EA.t('tandan ikut lori tidak direkod', 'bunches per lorry not recorded') + '</small></div><b class="ok-t">' + f2(t.mt) + ' MT</b></div>'; });
    return h + '</section>';
  }
  function changeText(ch) {
    var marks = EA.fh.marks || {};
    function what(x) { return x.muster === 'H' || !x.muster ? jobName(x.task) + (x.block ? ' Blk ' + x.block : '') : (marks[x.muster] ? EA.t(marks[x.muster][0], marks[x.muster][1]) : x.muster); }
    if (ch.kind === 'add') return '+ ' + person(ch.w) + ' → ' + what(ch);
    if (ch.kind === 'off') return '− ' + person(ch.w) + EA.t(' (dikeluarkan dari ', ' (taken off ') + what(ch) + ')';
    return person(ch.w) + ': ' + what(ch.from || {}) + ' → ' + what(ch);
  }
  function fixPane(d) {
    return d.chits.map(function (c) {
      var vs = (c.versions || []).slice().reverse();
      return '<section class="card"><h2>' + EA.t('Chit ', 'Chit ') + esc(c.at || '') + '</h2>' + vs.map(function (v, i) {
        var n = vs.length - i, first = n === 1;
        var sub = first ? EA.t('Chit asal', 'Original chit') : (v.changes && v.changes.length ? v.changes.map(function (ch) { return esc(changeText(ch)); }).join('<br>') : EA.t('Hujan atau nota diubah', 'Rain or notes changed'));
        return '<div class="hrow"><div><b>' + esc((v.at || '') + ' · ' + (c.byName || v.by || '')) + '</b><span class="s">' + sub + '</span></div><span class="pill ' + (first ? 'plain' : 'wait') + '">v' + n + '</span></div>';
      }).join('') + '</section>';
    }).join('');
  }

  // ---------- the four detail pages (v1.26), like the estate's Excel sheets ----------
  var byBlock = false;
  function elapsed(m) { var t = EA.today(); return m < t.slice(0, 7) ? daysIn(m) : m > t.slice(0, 7) ? 0 : Number(t.slice(8, 10)); }
  function renderDetail() {
    var list = merged(ctx.estate, month), cr = crop(ctx.estate, month), t = totals(list, cr);
    var names = { tandan: EA.t('Tandan', 'Bunches'), mt: EA.t('Penghantaran', 'Deliveries'), abw: 'ABW', hari: EA.t('Hari tuai', 'Harvest days') };
    var h = head(esc(names[detail]) + ' · ' + esc(monthLong(month)), esc(ctx.estate), 'hs-up') + tiles(t, detail);
    if (!cr) h += '<div class="card"><p class="hint">' + (EA.sendLink() && navigator.onLine ? EA.t('Memuat dari pejabat…', 'Loading from the office…') : EA.t('Perlu isyarat untuk muat dari pejabat.', 'Needs signal to load from the office.')) + '</p></div>';
    else h += detail === 'tandan' ? bunchPage(cr, t) : detail === 'mt' ? mtPage(cr, t) : detail === 'abw' ? abwPage(cr, t) : dayPage(cr, list);
    el.innerHTML = h;
    $('#hs-up').onclick = function () { detail = ''; render(el, ctx); };
    el.querySelectorAll('[data-detail]').forEach(function (b) { b.onclick = function () { detail = b.dataset.detail; renderDetail(); }; });
    el.querySelectorAll('[data-by]').forEach(function (b) { b.onclick = function () { byBlock = b.dataset.by === 'b'; renderDetail(); }; });
    var g = el.querySelector('.rk-grid'); if (g) g.scrollLeft = g.scrollWidth;
    if (!cr && !quiet) refresh();
  }
  function budgetCard(cr, t) {
    var b = cr.budget, el2 = elapsed(month), dm = daysIn(month);
    if (!b || !b.mt) return '<div class="card"><p class="hint">' + EA.t('Bajet bulan ini belum dimuat di pejabat.', 'This month\'s budget is not loaded in the office yet.') + '</p></div>';
    var abw = b.abw || t.abw || 0, tgtB = abw ? Math.round(b.mt * 1000 / abw) : 0, perDay = b.days && tgtB ? Math.round(tgtB / b.days) : 0;
    var due = perDay ? Math.round(perDay * b.days * el2 / dm) : 0, pct = tgtB ? Math.round(t.bunches / tgtB * 100) : 0, beza = t.bunches - due;
    return '<div class="card rk-card"><h2>' + EA.t('Bulan ini', 'This month') + '<small>' + EA.t('bajet ', 'budget ') + b.mt + ' MT · ABW ' + (b.abw || '—') + '</small></h2>' +
      '<div class="rk-kv"><span>' + EA.t('Sasaran tandan bulan', 'Target bunches, month') + '</span><b>' + n0(tgtB) + '</b>' +
      '<span>' + EA.t('Sasaran sehari', 'Target per day') + ' (' + b.days + EA.t(' hari kerja)', ' working days)') + '</span><b>' + n0(perDay) + '</b>' +
      '<span>' + EA.t('Hingga kini', 'To date') + '</span><b>' + n0(t.bunches) + ' · ' + pct + '%</b>' +
      '<span>' + EA.t('Beza hingga kini', 'Variance to date') + '</span><b class="' + (beza < 0 ? 'bad-text' : 'ok-t') + '">' + (beza > 0 ? '+' : '') + n0(beza) + '</b></div>' +
      '<div class="rk-bar"><i style="width:' + Math.min(100, pct) + '%"></i></div></div>';
  }
  function bunchGrid(cr, opts) {
    var dm = daysIn(month), last = opts && opts.upTo ? opts.upTo : (elapsed(month) || dm), todayN = month === EA.today().slice(0, 7) ? Number(EA.today().slice(8, 10)) : 0;
    var rows = opts && opts.block ? cr.blocks.map(function (b) { return { name: b.block === '?' ? EA.t('Blok ?', 'Block ?') : 'Blk ' + b.block, days: b.days }; }) : cr.harvesters;
    var abw = totals([], cr).abw || (cr.budget && cr.budget.abw) || 0, perDay = 0;
    if (cr.budget && cr.budget.mt && cr.budget.days && (cr.budget.abw || abw)) perDay = Math.round(cr.budget.mt * 1000 / (cr.budget.abw || abw) / cr.budget.days);
    var D = []; for (var i = 1; i <= last; i++) D.push(i);
    var h = '<table class="rk-x"><tr><th class="nm">' + (opts && opts.block ? EA.t('Blok', 'Block') : EA.t('Nama', 'Name')) + '</th>' + D.map(function (d) { return '<th' + (d === todayN ? ' class="td"' : '') + '>' + d + '</th>'; }).join('') +
      '<th>' + EA.t('Jumlah', 'Total') + '</th><th>MT</th><th>' + EA.t('Hari', 'Days') + '</th><th>' + EA.t('Purata', 'Avg') + '</th></tr>';
    var col = D.map(function () { return 0; });
    rows.forEach(function (r) {
      var s = 0, m = 0;
      h += '<tr><td class="nm">' + esc(r.name) + (r.old ? ' <i class="rk-old">' + EA.t('lama', 'old') + '</i>' : '') + '</td>' + D.map(function (d, i) { var v = num(r.days[d]); s += v; if (v) m++; col[i] += v; return '<td class="' + (v ? '' : 'z') + (d === todayN ? ' td' : '') + '">' + (v ? n0(v) : '·') + '</td>'; }).join('') +
        '<td class="t">' + n0(s) + '</td><td class="t">' + (abw ? f2(s * abw / 1000) : '—') + '</td><td class="t">' + m + '</td><td class="t">' + (m ? n0(s / m) : '—') + '</td></tr>';
    });
    var all = col.reduce(function (a, b) { return a + b; }, 0), run = 0, vrun = 0;
    h += '<tr class="tot"><td class="nm">' + EA.t('Jumlah hari', 'Day total') + '</td>' + col.map(function (v, i) { return '<td' + (D[i] === todayN ? ' class="td"' : '') + '>' + (v ? n0(v) : '·') + '</td>'; }).join('') + '<td>' + n0(all) + '</td><td>' + (abw ? f2(all * abw / 1000) : '—') + '</td><td></td><td></td></tr>';
    h += '<tr><td class="nm">' + EA.t('Hingga kini', 'To date') + '</td>' + col.map(function (v, i) { run += v; return '<td' + (D[i] === todayN ? ' class="td"' : '') + '>' + n0(run) + '</td>'; }).join('') + '<td colspan="4"></td></tr>';
    if (perDay) {
      h += '<tr><td class="nm">' + EA.t('Sasaran / hari', 'Target / day') + '</td>' + col.map(function (v, i) { return '<td' + (D[i] === todayN ? ' class="td"' : '') + '>' + perDay + '</td>'; }).join('') + '<td colspan="4"></td></tr>';
      h += '<tr class="v"><td class="nm">' + EA.t('Beza hari', 'Day variance') + '</td>' + col.map(function (v, i) { var x = v - perDay; return '<td class="' + (x >= 0 ? 'p' : '') + (D[i] === todayN ? ' td' : '') + '">' + n0(x) + '</td>'; }).join('') + '<td colspan="4"></td></tr>';
      if (opts && opts.print) h += '<tr class="v"><td class="nm">' + EA.t('Beza hingga kini', 'Variance to date') + '</td>' + col.map(function (v) { vrun += v - perDay; return '<td>' + n0(vrun) + '</td>'; }).join('') + '<td colspan="4"></td></tr>';
    }
    return h + '</table>';
  }
  function bunchPage(cr, t) {
    return budgetCard(cr, t) +
      '<div class="seg2" role="group"><button type="button" data-by="w" class="' + (byBlock ? '' : 'on') + '">' + EA.t('Ikut penuai', 'By harvester') + '</button><button type="button" data-by="b" class="' + (byBlock ? 'on' : '') + '">' + EA.t('Ikut blok', 'By block') + '</button></div>' +
      '<div class="rk-grid">' + bunchGrid(cr, { block: byBlock }) + '</div>' +
      '<p class="hint">' + EA.t('↔ Leret untuk hari lain. Lajur kuning = hari ini. MT = tandan × ABW bulan.', '↔ Swipe for other days. Yellow column = today. MT = bunches × the month\'s ABW.') + (cr.imp ? ' ' + EA.t('Sebahagian dari fail ladang (Data lama).', 'Partly from the estate files (old data).') : '') + '</p>';
  }
  function mills(cr) {
    var by = {};
    cr.tickets.forEach(function (x) { var k = x.mill || '—'; var o = by[k] || (by[k] = { mill: k, n: 0, mt: 0, rej: 0 }); o.n++; o.mt += num(x.nett); o.rej += num(x.rej); });
    return Object.keys(by).map(function (k) { return by[k]; });
  }
  function ticketTable(cr) {
    var run = 0;
    return '<table class="rk-x"><tr><th class="nm">' + EA.t('Tiket', 'Ticket') + '</th><th>' + EA.t('Tarikh', 'Date') + '</th><th>' + EA.t('Masa', 'Time') + '</th><th>' + EA.t('Kilang', 'Mill') + '</th><th>DN</th><th>' + EA.t('Timb. 1', '1st wt') + '</th><th>' + EA.t('Timb. 2', '2nd wt') + '</th><th>' + EA.t('Bersih MT', 'Nett MT') + '</th><th>' + EA.t('Hingga kini', 'To date') + '</th><th>ABW</th><th>Reject</th></tr>' +
      cr.tickets.map(function (x) { run += num(x.nett); return '<tr><td class="nm">' + esc(x.no) + '</td><td>' + esc(x.date.slice(8, 10) + '/' + x.date.slice(5, 7)) + '</td><td>' + esc(x.time) + '</td><td>' + esc(String(x.mill).replace(/^.*\((\w+)\)$/, '$1')) + '</td><td>' + esc(x.dn) + '</td><td>' + (x.w1 ? f2(x.w1 / 1000) : '—') + '</td><td>' + (x.w2 ? f2(x.w2 / 1000) : '—') + '</td><td class="t">' + f2(x.nett) + '</td><td>' + f2(run) + '</td><td>' + (x.abw ? num(x.abw).toFixed(2) : '—') + '</td><td>' + (x.rej || 0) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td class="nm">' + EA.t('Jumlah', 'Total') + '</td><td colspan="6">' + cr.tickets.length + EA.t(' lori', ' lorries') + '</td><td>' + f2(run) + '</td><td></td><td></td><td>' + cr.tickets.reduce(function (a, x) { return a + num(x.rej); }, 0) + '</td></tr></table>';
  }
  function mtPage(cr, t) {
    var b = cr.budget, el2 = elapsed(month), dm = daysIn(month);
    var h = b && b.mt ? '<div class="card rk-card"><h2>' + EA.t('Bajet', 'Budget') + '<small>' + b.mt + ' MT</small></h2><div class="rk-kv"><span>' + EA.t('Hingga kini', 'To date') + '</span><b>' + f2(t.mt) + ' MT · ' + Math.round(t.mt / b.mt * 100) + '%</b>' +
      '<span>' + EA.t('Patut hingga hari ini', 'Due by today') + '</span><b>' + (b.mt * el2 / dm).toFixed(1) + ' MT</b></div><div class="rk-bar"><i style="width:' + Math.min(100, Math.round(t.mt / b.mt * 100)) + '%"></i></div></div>'
      : '<div class="card"><p class="hint">' + EA.t('Bajet bulan ini belum dimuat di pejabat.', 'This month\'s budget is not loaded in the office yet.') + '</p></div>';
    h += '<div class="card rk-card"><h2>' + EA.t('Ikut kilang', 'By mill') + '</h2><div class="rk-mills">' + mills(cr).map(function (m) { return '<div>' + esc(m.mill) + '<b>' + f2(m.mt) + ' MT</b>' + m.n + EA.t(' lori', ' lorries') + ' · reject ' + m.rej + '</div>'; }).join('') + '</div></div>';
    return h + (cr.tickets.length ? '<div class="rk-grid">' + ticketTable(cr) + '</div><p class="hint">' + EA.t('↔ Leret untuk timbangan, ABW dan reject.', '↔ Swipe for weights, ABW and reject.') + '</p>' : '<p class="hint">' + EA.t('Tiada tiket bulan ini.', 'No tickets this month.') + '</p>');
  }
  function abwPage(cr, t) {
    var b = cr.budget, tg = b && b.abw ? b.abw : 0;
    var h = '<div class="card rk-card"><h2>' + EA.t('Bulan ini', 'This month') + '<small>' + (tg ? EA.t('sasaran ', 'target ') + tg + ' kg' : '') + '</small></h2><div class="rk-kv"><span>' + f2(t.mt) + ' MT ÷ ' + n0(t.bunches) + EA.t(' tandan', ' bunches') + '</span><b>' + (t.abw ? t.abw.toFixed(2) + ' kg' : '—') + '</b>' +
      (tg && t.abw ? '<span>' + EA.t('Beza sasaran', 'Against target') + '</span><b class="' + (t.abw < tg ? 'bad-text' : 'ok-t') + '">' + (t.abw >= tg ? '+' : '') + (t.abw - tg).toFixed(2) + ' kg</b>' : '') + '</div>' +
      '<p class="hint">' + EA.t('Sementara: tandan belum dihantar masih dikira hingga akhir bulan.', 'For now: bunches not yet delivered still count until the month ends.') + '</p></div>';
    var ms = (cr.months || []).filter(function (m) { return m.abw > 0; }), max = ms.reduce(function (a, m) { return Math.max(a, m.abw); }, 0) || 1;
    h += '<div class="card rk-card"><h2>' + EA.t('Ikut bulan', 'By month') + '<small>' + month.slice(0, 4) + '</small></h2>' + (ms.length ? '<div class="rk-bars">' + ms.map(function (m) {
      var mon = EA.t(ui().monBm, ui().monEn)[Number(m.month.slice(5, 7)) - 1];
      return '<div class="' + (m.month === month ? 'on' : '') + '"><i style="height:' + Math.round(m.abw / max * 80) + 'px"></i>' + m.abw.toFixed(1) + '<br>' + esc(mon) + '</div>';
    }).join('') + '</div><p class="hint">' + EA.t('Bulan tanpa rekod tandan tidak ditunjuk.', 'Months with no bunch records are left out.') + '</p>' : '<p class="hint">' + EA.t('Belum ada.', 'None yet.') + '</p>') + '</div>';
    var withB = cr.tickets.filter(function (x) { return x.abw > 0; });
    h += '<div class="card rk-card"><h2>' + EA.t('Ikut lori', 'By lorry') + '</h2>' + (withB.length ? withB.map(function (x) { return '<div class="rk-job"><div><b>DN ' + esc(x.dn) + ' · ' + esc(x.date.slice(8, 10) + '/' + x.date.slice(5, 7)) + '</b><small>' + n0(x.bunches) + EA.t(' tandan · ', ' bunches · ') + f2(x.nett) + ' MT</small></div><b>' + num(x.abw).toFixed(2) + ' kg</b></div>'; }).join('')
      : '<p class="hint">' + EA.t('Tandan setiap lori belum direkod bulan ini. ABW setiap lori keluar sendiri bila DN ada tandan.', 'Bunches per lorry not recorded this month yet. ABW per lorry comes by itself once a DN has bunches.') + '</p>') + '</div>';
    return h;
  }
  function dayPage(cr, list) {
    var dm = daysIn(month), last = elapsed(month) || dm, D = []; for (var i = 1; i <= last; i++) D.push(i);
    var blocks = cr.blocks.filter(function (b) { return b.block !== '?'; }), noBlk = cr.blocks.find(function (b) { return b.block === '?'; });
    var any = {}; cr.blocks.forEach(function (b) { Object.keys(b.days).forEach(function (k) { if (num(b.days[k])) any[k] = 1; }); });
    var h = '<div class="card rk-card"><h2>' + EA.t('Ikut blok', 'By block') + '<small>1–' + last + '</small></h2><div class="rk-cal" style="grid-template-columns:46px repeat(' + D.length + ',1fr)"><span></span>' + D.map(function (d) { return '<span class="h">' + d + '</span>'; }).join('');
    (blocks.length ? blocks : [{ block: EA.t('Semua', 'All'), days: any }]).forEach(function (b) {
      h += '<span class="b">' + (blocks.length ? 'Blk ' + esc(b.block) : esc(b.block)) + '</span>' + D.map(function (d) { return '<i class="' + (num(b.days[d]) ? 'y' : '') + '"></i>'; }).join('');
    });
    h += '</div><p class="hint">' + EA.t('Hijau = dituai.', 'Green = harvested.') + (noBlk ? ' ' + EA.t('Data lama tiada blok.', 'Old data has no block.') : '') + '</p></div>';
    if (blocks.length) h += '<div class="card rk-card"><h2>' + EA.t('Hari dituai', 'Days harvested') + '<small>' + EA.t('sasaran 2–3 pusingan sebulan', 'target 2–3 rounds a month') + '</small></h2>' + blocks.map(function (b) {
      var ds = Object.keys(b.days).filter(function (k) { return num(b.days[k]); }).map(Number).sort(function (a, c) { return a - c; }), lastD = ds[ds.length - 1];
      return '<div class="rk-job"><div><b>Blk ' + esc(b.block) + '</b><small>' + (lastD ? EA.t('terakhir ', 'last ') + lastD + ' ' + EA.t(ui().monBm, ui().monEn)[Number(month.slice(5, 7)) - 1] : '') + '</small></div><b>' + ds.length + EA.t(' hari', ' days') + '</b></div>';
    }).join('') + '</div>';
    var none = D.filter(function (d) { return !any[d]; });
    h += '<div class="card rk-card"><h2>' + EA.t('Hari tiada tuaian', 'Days with no harvest') + '<small>' + none.length + EA.t(' hari', ' days') + '</small></h2><p class="rk-away">' + (none.length ? none.join(', ') : '—') + '</p></div>';
    return h;
  }

  // ---------- the month report, printed (v1.26) ----------
  function printSheet() {
    var full = true;
    function draw(s) {
      s.querySelector('#pr-full').className = full ? 'on' : ''; s.querySelector('#pr-today').className = full ? '' : 'on';
    }
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Laporan bulan · ', 'Month report · ') + esc(monthLong(month)) + '</h2>' +
      '<div class="seg2"><button type="button" id="pr-full" class="on">' + EA.t('Bulan penuh', 'Whole month') + '</button><button type="button" id="pr-today">' + EA.t('Hingga hari ini', 'Up to today') + '</button></div>' +
      '<div class="hrow"><span>' + EA.t('Muka 1 · Tandan ikut penuai', 'Page 1 · Bunches by harvester') + '</span><b>✓</b></div>' +
      '<div class="hrow"><span>' + EA.t('Muka 2 · Penghantaran, ABW, pusingan', 'Page 2 · Deliveries, ABW, rounds') + '</span><b>✓</b></div>' +
      '<div class="hrow"><span>' + EA.t('Tandatangan', 'Signatures') + '</span><span>' + EA.t('Kerani · Staf · Pengurus', 'Clerk · Staff · Manager') + '</span></div>' +
      '<p class="msg" id="pr-err" hidden></p>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="pr-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="pr-go">MAKE PDF<small>Buat PDF · cetak / simpan</small></button></div>' +
      '<p class="hint">' + EA.t('Perlu isyarat. Pilih "Simpan sebagai PDF" untuk hantar di WhatsApp.', 'Needs signal. Choose "Save as PDF" to send it on WhatsApp.') + '</p>',
      function (s) {
        s.querySelector('#pr-full').onclick = function () { full = true; draw(s); };
        s.querySelector('#pr-today').onclick = function () { full = false; draw(s); };
        s.querySelector('#pr-back').onclick = ui().closeSheet;
        s.querySelector('#pr-go').onclick = async function () {
          var btn = this, err = s.querySelector('#pr-err');
          btn.disabled = true;
          var est = ctx.estate, m = month;
          var r = null, c = null;
          if (EA.sendLink() && navigator.onLine) { var both = await Promise.all([EA.ask('history', { estate: est, month: m }), EA.ask('crop', { estate: est, month: m })]); r = both[0]; c = both[1]; }
          btn.disabled = false;
          if (!c || !c.harvesters) { err.textContent = EA.t('Tiada isyarat atau pejabat sibuk. Cuba lagi.', 'No signal or the office is busy. Try again.'); err.hidden = false; return; }
          if (r && r.days) EA.local.set(K.cache + est + '.' + m, { at: r.at, days: r.days });
          EA.local.set(KC + est + '.' + m, c);
          ui().closeSheet();
          EA.fh.printReport(est, m, full);
        };
      });
  }
  EA.fh.printReport = function (est, m, full) {
    var cr = crop(est, m), list = merged(est, m);
    if (!cr) return;
    var upTo = full || m !== EA.today().slice(0, 7) ? daysIn(m) : Number(EA.today().slice(8, 10));
    var t = totals(list, cr), b = cr.budget || {}, co = (EA.lists.estate(est) || {}).company || '', nm = ((EA.lists.estate(est) || {}).name || est);
    var now = new Date(), stamp = now.getDate() + ' ' + EA.t(ui().monBm, ui().monEn)[now.getMonth()] + ' ' + now.getFullYear() + ' ' + ui().hhmm(now);
    var who = (ctx && ctx.user && ctx.user.name) || '';
    function hd(title, pg) { return '<div class="pr-hd"><div><h1>' + title + '</h1><div class="s">' + (co === 'PJSB' ? 'Pelita Jujur Sdn Bhd' : 'S.H.A. Hup Aik Plantation Sdn Bhd') + ' · ' + esc(co + '.' + est) + ' (' + esc(nm) + ') · ' + esc(monthLong(m)) + (upTo < daysIn(m) ? EA.t(' · hingga ', ' · up to ') + upTo : '') + '</div></div><div class="r">E-Book · ' + EA.t('Laporan bulanan', 'Monthly report') + '<br>' + EA.t('Dicetak ', 'Printed ') + esc(stamp) + (who ? EA.t(' oleh ', ' by ') + esc(who) : '') + '<br>' + EA.t('Muka ', 'Page ') + pg + ' / 2</div></div>'; }
    var tgtB = b.mt && (b.abw || t.abw) ? Math.round(b.mt * 1000 / (b.abw || t.abw)) : 0;
    var rej = cr.tickets.reduce(function (a, x) { return a + num(x.rej); }, 0), ms = mills(cr);
    var kp = '<div class="pr-kp"><div><small>' + EA.t('Tandan', 'Bunches') + '</small><b>' + n0(t.bunches) + '</b>' + (tgtB ? EA.t('sasaran ', 'target ') + n0(tgtB) : '') + '</div>' +
      '<div><small>MT</small><b>' + f2(t.mt) + '</b>' + (b.mt ? EA.t('bajet ', 'budget ') + b.mt + ' · ' + Math.round(t.mt / b.mt * 100) + '%' : '') + '</div>' +
      '<div><small>ABW</small><b>' + (t.abw ? t.abw.toFixed(2) + ' kg' : '—') + '</b>' + (b.abw ? EA.t('sasaran ', 'target ') + b.abw : '') + '</div>' +
      '<div><small>' + EA.t('Hari tuai', 'Harvest days') + '</small><b>' + t.harvestDays + '</b>' + (b.days ? b.days + EA.t(' hari kerja', ' working days') : '') + '</div>' +
      '<div><small>' + EA.t('Lori', 'Lorries') + '</small><b>' + cr.tickets.length + '</b>' + esc(ms.map(function (x) { return String(x.mill).replace(/^.*\((\w+)\)$/, '$1') + ' ' + x.n; }).join(' · ')) + '</div>' +
      '<div><small>Reject</small><b>' + rej + '</b>' + EA.t('tandan', 'bunches') + '</div></div>';
    var p1 = hd(EA.t('Laporan Tuaian Bulanan', 'Monthly Crop Report'), 1) + kp + '<h2>1 · ' + EA.t('Tandan ikut penuai', 'Bunches by harvester') + '</h2>' + bunchGrid(cr, { upTo: upTo, print: true }) +
      '<p class="note">' + EA.t('MT penuai = tandan × ABW bulan.', 'Harvester MT = bunches × the month\'s ABW.') + (cr.imp ? ' ' + EA.t('Sebahagian data dari fail ladang (Data lama).', 'Part of the data is from the estate files (old data).') : '') + '</p>';
    var tk = { tickets: cr.tickets.filter(function (x) { return Number(x.date.slice(8, 10)) <= upTo; }) };
    var notDone = [];
    list.forEach(function (d) { if (Number(d.date.slice(8, 10)) > upTo) return; d.work.forEach(function (w) { if (w.status === 'not_done') notDone.push({ date: d.date, job: jobName(w.task) + (w.block ? ' · Blk ' + w.block : ''), why: w.reason || '' }); }); });
    notDone.sort(function (a, c) { return a.date < c.date ? -1 : 1; });
    var mb = (cr.months || []).map(function (x) { return '<tr' + (x.month === m ? ' class="tot"' : '') + '><td class="l">' + esc(EA.t(FULL_BM, FULL_EN)[Number(x.month.slice(5, 7)) - 1]) + '</td><td>' + (x.bunches ? n0(x.bunches) : '—') + '</td><td>' + f2(x.mt) + '</td><td>' + (x.abw ? x.abw.toFixed(2) : '—') + '</td></tr>'; }).join('');
    var dm = upTo, D = []; for (var i = 1; i <= dm; i++) D.push(i);
    var cal = '<table class="pr-cal"><tr><th class="l">' + EA.t('Blok', 'Block') + '</th>' + D.map(function (d) { return '<th>' + d + '</th>'; }).join('') + '<th>' + EA.t('Hari', 'Days') + '</th></tr>' + cr.blocks.map(function (bk) {
      var n = 0; return '<tr><td class="l">' + (bk.block === '?' ? EA.t('Tiada blok', 'No block') : 'Blk ' + esc(bk.block)) + '</td>' + D.map(function (d) { var y = num(bk.days[d]) > 0; if (y) n++; return '<td class="' + (y ? 'y' : '') + '"></td>'; }).join('') + '<td>' + n + '</td></tr>'; }).join('') + '</table>';
    var p2 = hd(EA.t('Penghantaran, ABW & Pusingan', 'Deliveries, ABW & Rounds'), 2) + '<div class="pr-two"><div><h2>2 · ' + EA.t('Penghantaran ikut tiket', 'Deliveries by ticket') + '</h2>' + (tk.tickets.length ? ticketTable(tk) : '<p class="note">—</p>') +
      '<h2>' + EA.t('Ikut kilang', 'By mill') + '</h2><table><tr><th class="l">' + EA.t('Kilang', 'Mill') + '</th><th>' + EA.t('Lori', 'Lorries') + '</th><th>MT</th><th>Reject</th></tr>' + mills(tk).map(function (x) { return '<tr><td class="l">' + esc(x.mill) + '</td><td>' + x.n + '</td><td>' + f2(x.mt) + '</td><td>' + x.rej + '</td></tr>'; }).join('') + '</table></div>' +
      '<div><h2>3 · ' + EA.t('ABW ikut bulan', 'ABW by month') + '</h2><table><tr><th class="l">' + EA.t('Bulan', 'Month') + '</th><th>' + EA.t('Tandan', 'Bunches') + '</th><th>MT</th><th>ABW kg</th></tr>' + mb + '</table>' +
      '<h2>4 · ' + EA.t('Hari tuai ikut blok', 'Harvest days by block') + '</h2>' + cal +
      '<h2>' + EA.t('Kerja tidak siap & sebab', 'Jobs not done & why') + '</h2>' + (notDone.length ? '<table><tr><th class="l">' + EA.t('Tarikh', 'Date') + '</th><th class="l">' + EA.t('Kerja', 'Job') + '</th><th class="l">' + EA.t('Sebab', 'Why') + '</th></tr>' + notDone.slice(0, 14).map(function (x) { return '<tr><td class="l">' + esc(x.date.slice(8, 10) + '/' + x.date.slice(5, 7)) + '</td><td class="l">' + esc(x.job) + '</td><td class="l">' + esc(x.why) + '</td></tr>'; }).join('') + '</table>' : '<p class="note">—</p>') + '</div></div>' +
      '<div class="pr-sig"><div>' + EA.t('Disediakan oleh · Prepared by', 'Prepared by · Disediakan oleh') + '<br><b>' + EA.t('Kerani', 'Clerk') + '</b></div><div>' + EA.t('Disemak oleh · Checked by', 'Checked by · Disemak oleh') + '<br><b>' + EA.t('Staf ladang', 'Field staff') + '</b></div><div>' + EA.t('Diluluskan oleh · Approved by', 'Approved by · Diluluskan oleh') + '<br><b>' + EA.t('Pengurus', 'Manager') + '</b></div></div>' +
      '<p class="note">' + EA.t('Angka dari E-Book (satu sumber). Cetakan ini salinan pada tarikh cetak.', 'Numbers from E-Book (one source). This print is a copy on the print date.') + '</p>';
    var area = document.getElementById('print-area');
    if (!area) { area = document.createElement('div'); area.id = 'print-area'; document.body.appendChild(area); }
    area.innerHTML = '<section class="pr-pg">' + p1 + '</section><section class="pr-pg">' + p2 + '</section>';
    document.title = 'Laporan_' + est + '_' + m;
    setTimeout(function () { try { window.print(); } catch (e) {} }, 50);
  };
  window.addEventListener('afterprint', function () { document.title = 'Estate Book'; });

  // Leaving Rekod closes the day or page that was open, so the tab always opens on the list.
  window.addEventListener('hashchange', function () { if (location.hash.indexOf('history') < 0) { openDay = ''; detail = ''; } });
  EA.fh.history = { render: render, reset: function () { openDay = ''; detail = ''; } };
})();
