// Field & Harvest: Rekod → PROGRAM · Rancangan vs sebenar (plan vs actual), v1.47. Read only: nothing is keyed here.
// Approved by Yu Chen 27 Oct 2026 (sample "Rekod → PROGRAM"; Brief "Rancangan & Prestasi" §12 step 3).
// Six cards for the month chosen in Rekod:
//   1 Hasil — tonnes against the month's budget (due to date, year to date).
//   2 Pusingan tuai — each lot's days since its last harvest (this month only): in round, ready 10–15, late over 15.
//   3 Program rawatan bulan ini — the programme's jobs this month per block: Ha in the programme, Ha done.
//   4 Pusingan tahun ini — rounds due by the end of last month against rounds done, per job (tap: per block).
//   5 Baki kerja — Ha behind the programme and the person-days it needs (2025 daily targets); next month's programme;
//     rain lost from TUTUP HARI.
//   6 Disiplin harian — days closed, ramp with no fruit from an earlier day, work keyed the same day.
// Work done this month first fills this month's programme; anything more counts against the catch-up.
// The programme is the approved budget's (office list LIST_PROGRAMME); the office sends it with the Ha done (one call).
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};
  var KEY = 'fh.prog.';
  var open = {}, asking = {}, silent = false, oldOffice = false;
  function esc(s) { return EA.ui.esc(s); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function n0(v) { return Math.round(v).toLocaleString('en-US'); }
  function sgn(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + f1(Math.abs(v)); }
  function ym(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function addMonths(m, n) { var x = new Date(m + '-01T00:00:00'); return ym(new Date(x.getFullYear(), x.getMonth() + n, 1)); }
  function daysIn(m) { var x = new Date(m + '-01T00:00:00'); return new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); }
  var MON_BM = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];
  var MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function mon(m) { return EA.t(MON_BM, MON_EN)[Number(m.slice(5, 7)) - 1]; }
  function dm(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7); }
  function job(code) { var t = EA.lists.task(code); return t ? EA.t(t.bm, t.en) : code; }
  // ¼ ½ ¾ for the parts of a day lost to rain: 1.5 → "1½".
  function frac(v) { var w = Math.floor(v + 1e-9), p = Math.round((v - w) * 4); return (w || !p ? String(w) : '') + ['', '¼', '½', '¾'][p]; }
  function dot(c) { return '<span class="pg-dot ' + c + '" aria-hidden="true"></span>'; }
  function blockHa(estate, b) { var x = (EA.lists.blocksFor(estate) || []).find(function (k) { return k.block === b; }); return x ? x.ha : 0; }
  function palmsPerHa(estate, b) {
    var ha = 0, p = 0;
    (EA.lists.lotsFor(estate, b) || []).forEach(function (l) { ha += l.ha || 0; p += l.palms || 0; });
    return ha ? p / ha : 0;
  }
  // Person-days for Ha of a job, from the signed 2025 daily targets; manuring by bags (the dose decides the target).
  function personDays(estate, code, ha, block, dose) {
    if (code === 'MAN') {
      if (!dose || !EA.lists.manTarget) return 0;
      var bags = ha * (palmsPerHa(estate, block) || 136) * dose / (EA.lists.bagKg || 50);
      return bags / EA.lists.manTarget(estate, dose);
    }
    var t = EA.lists.target(code, estate);
    return t && t.unit === 'Ha' && t.per ? ha / t.per : 0;
  }
  // Working days (Monday–Saturday) after today to the month's end.
  function daysLeft(m) {
    var today = EA.today(); if (m !== today.slice(0, 7)) return 0;
    var n = 0, d = new Date(today + 'T00:00:00'), end = daysIn(m);
    for (var i = d.getDate() + 1; i <= end; i++) { if (new Date(d.getFullYear(), d.getMonth(), i).getDay() !== 0) n++; }
    return n;
  }

  // ---------- the numbers ----------
  function calc(estate, month, data) {
    var prev = addMonths(month, -1), done = data.done || {}, out = { jobs: {}, now: {}, next: {} };
    function doneTo(code, b, upTo) { var s = 0; Object.keys(done).forEach(function (k) { var p = k.split('|'); if (p[0] === code && p[1] === b && p[2] <= upTo) s += done[k]; }); return s; }
    (data.programme || []).forEach(function (r) {
      var j = out.jobs[r.task] || (out.jobs[r.task] = { code: r.task, blocks: {} });
      var b = j.blocks[r.block] || (j.blocks[r.block] = { block: r.block, ha: r.ha || blockHa(estate, r.block), due: 0, now: 0, nowHa: 0, nowLabel: '', dose: 0 });
      if (r.month <= prev) b.due++;
      if (r.month === month) { b.now++; b.nowHa += r.ha; b.nowLabel = r.round; b.dose = r.dose; }
      if (r.month === addMonths(month, 1)) { var nx = out.next[r.task] || (out.next[r.task] = { ha: 0, label: r.round }); nx.ha += r.ha; }
    });
    Object.keys(out.jobs).forEach(function (code) {
      var j = out.jobs[code], ha = 0, dueHa = 0, past = 0, behind = 0, pd = 0;
      Object.keys(j.blocks).forEach(function (k) {
        var b = j.blocks[k], all = doneTo(code, k, month), thisM = done[code + '|' + k + '|' + month] || 0;
        b.doneNow = thisM;
        b.past = Math.max(0, all - Math.min(thisM, b.nowHa));          // this month's work fills this month's programme first
        b.rounds = b.ha ? b.past / b.ha : 0;
        b.gap = b.rounds - b.due;
        b.behindHa = Math.max(0, b.due * b.ha - b.past);
        b.days = personDays(estate, code, b.behindHa, k, b.dose || lastDose(data, code, k, month));
        ha += b.ha; dueHa += b.due * b.ha; past += b.past; behind += b.behindHa; pd += b.days;
      });
      j.due = ha ? Math.round(dueHa / ha * 100) / 100 : 0; j.rounds = ha ? Math.round(past / ha * 100) / 100 : 0; j.gap = j.rounds - j.due; j.behindHa = behind; j.days = pd;
      j.hasTarget = code === 'MAN' ? !!EA.lists.manTarget : !!(EA.lists.target(code, estate) && EA.lists.target(code, estate).unit === 'Ha');
    });
    return out;
  }
  function lastDose(data, code, b, month) {
    var d = 0; (data.programme || []).forEach(function (r) { if (r.task === code && r.block === b && r.month <= month && r.dose) d = r.dose; });
    return d;
  }
  function tone(gap) { return gap <= -1 ? 'r' : gap < -0.05 ? 'a' : 'g'; }

  // ---------- the cards ----------
  function cropCard(month, data) {
    var c = (data.crop || []).find(function (x) { return x.month === month; }) || {};
    if (!c.budget) return '<div class="card"><p class="hint">' + EA.t('Bajet bulan ini belum dimuat di pejabat.', 'This month\'s budget is not loaded in the office yet.') + '</p></div>';
    var today = EA.today(), cur = month === today.slice(0, 7), el = cur ? Number(today.slice(8, 10)) : daysIn(month);
    var due = c.budget * el / daysIn(month), pct = due ? Math.round(c.mt / due * 100) : 0, beza = c.mt - due;
    var yb = 0, ym2 = 0; (data.crop || []).forEach(function (x) { if (x.month < month) { yb += x.budget; ym2 += x.mt; } });
    yb += due; ym2 += c.mt;
    var cls = pct >= 100 ? '' : pct >= 85 ? 'w' : 'b';
    return '<div class="card pg-card"><h2>' + EA.t('Tan BTS bulan ini', 'FFB tonnes this month') + '<small>' + EA.t('Bajet ', 'Budget ') + mon(month) + ' ' + c.budget + ' MT' + (c.days ? ' · ' + c.days + EA.t(' hari kerja', ' working days') : '') + '</small></h2>' +
      '<div class="pg-kv"><span>' + (cur ? EA.t('Patut hingga ', 'Due by ') + dm(today) : EA.t('Bajet bulan', 'Month budget')) + '</span><b>' + f1(due) + ' MT</b>' +
      '<span>' + EA.t('Sebenar (tiket kilang)', 'Actual (mill tickets)') + '</span><b>' + f2(c.mt) + ' MT · ' + pct + '%</b>' +
      '<span>' + EA.t('Beza', 'Variance') + '</span><b class="' + (beza < 0 ? 'bad-text' : 'ok-t') + '">' + sgn(beza) + ' MT</b>' +
      '<span>' + EA.t('Tahun ini (Jan–', 'This year (Jan–') + mon(month) + ')</span><b>' + n0(ym2) + ' / ' + n0(yb) + ' MT · ' + (yb ? Math.round(ym2 / yb * 100) : 0) + '%</b></div>' +
      '<div class="pg-bar"><i class="' + cls + '" style="width:' + Math.min(100, c.budget ? c.mt / c.budget * 100 : 0) + '%"></i><em style="left:' + Math.min(100, due / c.budget * 100) + '%"></em></div>' +
      '<p class="pg-note">' + EA.t('Garis hitam = patut hingga hari ini. Kuning bawah 100%, merah bawah 85%.', 'Black line = due by today. Amber under 100%, red under 85%.') + '</p></div>';
  }
  function lotsCard(estate, data) {
    if (!data.lots) return '';
    var r = EA.lists.lotRound.HA, today = EA.today(), n = { g: 0, a: 0, r: 0, x: 0 }, late = {}, list = [];
    (EA.lists.lotsFor(estate) || []).forEach(function (l) {
      var d = data.lots[l.lot], age = d ? Math.round((new Date(today + 'T00:00:00') - new Date(d + 'T00:00:00')) / 864e5) : -1;
      var k = age < 0 ? 'x' : age > r.late ? 'r' : age >= r.ready ? 'a' : 'g';
      n[k]++;
      if (k === 'r' || k === 'x') { late[l.block] = (late[l.block] || 0) + 1; list.push({ lot: l.lot, age: age }); }
    });
    var total = n.g + n.a + n.r + n.x;
    if (!total) return '';
    list.sort(function (a, b) { return b.age - a.age; });
    return '<div class="card pg-card"><h2>' + total + EA.t(' petak', ' lots') + '<small>' + EA.t('sedia ' + r.ready + '–' + r.late + ' hari · lewat lebih ' + r.late + ' hari', 'ready ' + r.ready + '–' + r.late + ' days · late over ' + r.late + ' days') + '</small></h2>' +
      '<div class="pg-kv"><span>' + dot('g') + EA.t('Dalam pusingan', 'In round') + '</span><b>' + n.g + '</b>' +
      '<span>' + dot('a') + EA.t('Sedia dituai', 'Ready to harvest') + '</span><b>' + n.a + '</b>' +
      '<span>' + dot('r') + EA.t('Lewat', 'Late') + '</span><b class="' + (n.r ? 'bad-text' : '') + '">' + n.r + '</b>' +
      (n.x ? '<span>' + dot('x') + EA.t('Tiada rekod tuai (120 hari)', 'No harvest record (120 days)') + '</span><b>' + n.x + '</b>' : '') + '</div>' +
      (Object.keys(late).length ? '<p class="pg-note">' + EA.t('Lewat / tiada rekod: ', 'Late / no record: ') + Object.keys(late).sort().map(function (b) { return '<span class="pg-chip">Blk ' + esc(b) + ' · ' + late[b] + '</span>'; }).join('') + '</p>' +
        '<button type="button" class="link-btn pg-more" data-pg="lots" aria-expanded="' + !!open.lots + '">' + (open.lots ? EA.t('TUTUP SENARAI', 'HIDE LIST') : EA.t('LIHAT PETAK ›', 'SEE LOTS ›')) + '</button>' +
        (open.lots ? '<p class="pg-lots">' + list.map(function (x) { return '<span>' + esc(x.lot) + ' <small>' + (x.age < 0 ? '—' : x.age + EA.t(' hr', ' d')) + '</small></span>'; }).join('') + '</p>' : '') : '') +
      '</div>';
  }
  function nowCard(estate, month, cal) {
    var rows = [], left = daysLeft(month);
    Object.keys(cal.jobs).sort().forEach(function (code) {
      var j = cal.jobs[code], bl = Object.keys(j.blocks).sort().map(function (k) { return j.blocks[k]; }).filter(function (b) { return b.nowHa; });
      if (!bl.length) return;
      var ha = 0, dn = 0, rest = 0, pd = 0;
      bl.forEach(function (b) { ha += b.nowHa; dn += Math.min(b.doneNow, b.nowHa); var r = Math.max(0, b.nowHa - b.doneNow); rest += r; pd += personDays(estate, code, r, b.block, b.dose); });
      var label = bl[0].nowLabel && !/^R\d+$/.test(bl[0].nowLabel) ? ' ' + bl[0].nowLabel : bl[0].nowLabel ? ' · ' + EA.t('pusingan ', 'round ') + bl[0].nowLabel.slice(1) : '';
      rows.push('<div class="card pg-card"><h2>' + esc(job(code) + label) + '<small>' + bl.map(function (b) { return 'Blk ' + b.block; }).join(', ') + ' · ' + f2(ha) + ' Ha' + (bl[0].dose ? ' · ' + EA.t('dos ', 'dose ') + bl[0].dose + ' kg/' + EA.t('pokok', 'palm') : '') + '</small></h2>' +
        '<table class="pg-t"><tr><th>' + EA.t('Blok', 'Block') + '</th><th>' + EA.t('Ha program', 'Programme Ha') + '</th><th>' + EA.t('Siap', 'Done') + '</th><th></th></tr>' +
        bl.map(function (b) {
          var p = b.nowHa ? Math.min(100, Math.round(b.doneNow / b.nowHa * 100)) : 0;
          return '<tr><td>Blk ' + esc(b.block) + '</td><td>' + f2(b.nowHa) + '</td><td>' + (b.doneNow ? f1(b.doneNow) + ' · ' + p + '%' : '0') + '</td><td class="st">' + dot(p >= 100 ? 'g' : p > 0 ? 'a' : 'r') + '</td></tr>';
        }).join('') +
        '<tr class="tot"><td>' + EA.t('Jumlah', 'Total') + '</td><td>' + f2(ha) + '</td><td>' + f1(dn) + ' · ' + (ha ? Math.round(dn / ha * 100) : 0) + '%</td><td></td></tr></table>' +
        (rest > 0.05 ? '<p class="pg-note">' + EA.t('Baki ', 'Left ') + f1(rest) + ' Ha' + (pd ? ' ≈ ' + Math.ceil(pd) + EA.t(' orang-hari', ' person-days') : '') + (month === EA.today().slice(0, 7) ? ' · ' + EA.t('tinggal ', '') + left + EA.t(' hari kerja', ' working days left') : '') + '.</p>' : '') +
        '</div>');
    });
    return rows.length ? rows.join('') : '<div class="card"><p class="hint">' + EA.t('Tiada kerja program bulan ini.', 'No programme work this month.') + '</p></div>';
  }
  function roundsCard(month, cal) {
    var prev = addMonths(month, -1), codes = Object.keys(cal.jobs).filter(function (c) { var j = cal.jobs[c]; return j.due > 0 || j.rounds > 0; });
    if (!codes.length || prev.slice(0, 4) !== month.slice(0, 4)) return '<div class="card"><p class="hint">' + EA.t('Pusingan tahun ini mula dikira selepas Januari.', 'This year\'s rounds are counted from February.') + '</p></div>';
    codes.sort(function (a, b) { return cal.jobs[a].gap - cal.jobs[b].gap; });
    return '<div class="card pg-card"><h2>' + EA.t('Program ', 'Programme ') + month.slice(0, 4) + EA.t(' hingga akhir ', ' to the end of ') + mon(prev) + '<small>' + EA.t('siap = Ha dikerjakan ÷ Ha blok', 'done = Ha worked ÷ block Ha') + '</small></h2>' +
      '<table class="pg-t"><tr><th>' + EA.t('Kerja', 'Job') + '</th><th>' + EA.t('Patut', 'Due') + '</th><th>' + EA.t('Siap', 'Done') + '</th><th>' + EA.t('Beza', 'Gap') + '</th><th></th></tr>' +
      codes.map(function (c) {
        var j = cal.jobs[c], t = tone(j.gap), on = open['r' + c];
        var h = '<tr class="pg-job" data-pg="r' + esc(c) + '" aria-expanded="' + !!on + '"><td>' + (on ? '▾ ' : '▸ ') + esc(job(c)) + ' <small>' + esc(c) + '</small></td><td>' + f1(j.due) + '</td><td>' + f1(j.rounds) + '</td><td class="' + (t === 'r' ? 'bad-text' : t === 'a' ? 'wait-t' : 'ok-t') + '">' + sgn(j.gap) + '</td><td class="st">' + dot(t) + '</td></tr>';
        if (on) h += Object.keys(j.blocks).sort().map(function (k) { var b = j.blocks[k], bt = tone(b.gap); return '<tr class="pg-blk"><td>Blk ' + esc(k) + '</td><td>' + b.due + '</td><td>' + f1(b.rounds) + '</td><td class="' + (bt === 'r' ? 'bad-text' : bt === 'a' ? 'wait-t' : 'ok-t') + '">' + sgn(b.gap) + '</td><td class="st">' + dot(bt) + '</td></tr>'; }).join('');
        return h;
      }).join('') + '</table>' +
      '<p class="pg-note">' + EA.t('Merah = satu pusingan atau lebih di belakang. Tekan satu kerja untuk lihat setiap blok. Kerja bulan ini isi program bulan ini dulu; lebihnya dikira di sini.', 'Red = one round or more behind. Tap a job to see each block. This month\'s work fills this month\'s programme first; anything more counts here.') + '</p></div>';
  }
  function catchCard(month, cal, data) {
    var codes = Object.keys(cal.jobs).filter(function (c) { return cal.jobs[c].behindHa > 0.05; }).sort(function (a, b) { return cal.jobs[b].behindHa - cal.jobs[a].behindHa; });
    var nx = Object.keys(cal.next), nm = addMonths(month, 1), from = data.from || '';
    var rainDays = (data.rain || []).reduce(function (a, x) { return a + x.lost; }, 0);
    var reasons = {}; (EA.lists.rainReasons || []).forEach(function (r) { reasons[r.code] = EA.t(r.bm, r.en); });
    return '<div class="card pg-card"><h2>' + EA.t('Kerja tertunggak', 'Work behind') + '<small>' + EA.t('Ha di belakang program · orang-hari ikut sasaran 2025', 'Ha behind the programme · person-days from the 2025 targets') + '</small></h2>' +
      (codes.length ? '<table class="pg-t"><tr><th>' + EA.t('Kerja', 'Job') + '</th><th>Ha</th><th>' + EA.t('Orang-hari', 'Person-days') + '</th></tr>' +
        codes.map(function (c) { var j = cal.jobs[c]; return '<tr><td>' + esc(job(c)) + '</td><td>' + n0(j.behindHa) + '</td><td>' + (j.days ? '≈ ' + n0(j.days) : '— <small>' + EA.t('tiada sasaran', 'no target') + '</small>') + '</td></tr>'; }).join('') + '</table>'
        : '<p class="pg-note ok-t">' + EA.t('Tiada kerja tertunggak. Semua ikut program.', 'Nothing behind. All on programme.') + '</p>') +
      (nx.length ? '<p class="pg-note">' + EA.t('Program ', 'Programme ') + mon(nm) + ': ' + nx.map(function (c) { var x = cal.next[c]; return esc(job(c)) + (/^R\d+$/.test(x.label) ? ' ' + EA.t('pusingan ', 'round ') + x.label.slice(1) : ' ' + esc(x.label)) + ' (' + f2(x.ha) + ' Ha)'; }).join(', ') + (codes.length ? EA.t(', tambah baki di atas.', ', plus the work behind above.') : '.') + '</p>' : '') +
      '<p class="pg-note">' + (from && month < from.slice(0, 7) ? EA.t('Hujan dari TUTUP HARI mula ', 'Rain from TUTUP HARI starts ') + dm(from) + '.' :
        !data.rain || !data.rain.length ? EA.t('Hujan: tiada hari hilang direkod bulan ini.', 'Rain: no day lost recorded this month.') :
        '<b>' + EA.t('Hujan bulan ini: ', 'Rain this month: ') + frac(rainDays) + EA.t(' hari hilang', ' days lost') + '</b><br>' +
        data.rain.map(function (x) { return dm(x.date) + ' · ' + frac(x.lost) + EA.t(' hari', ' day') + ' · ' + esc(reasons[x.reason] || x.reason) + (x.jobs ? ' · ' + esc(x.jobs) : ''); }).join('<br>')) + '</p></div>';
  }
  function daysCard(month, data) {
    var d = data.days || [], judged = d.filter(function (x) { return x.closed; }), closed = judged.filter(function (x) { return x.closed === 'Y'; }).length;
    if (!d.length) return '<div class="card"><p class="hint">' + EA.t('Tiada hari dengan chit lagi bulan ini.', 'No day with a chit yet this month.') + '</p></div>';
    var ramp = d.filter(function (x) { return x.ramp; }).length, same = d.filter(function (x) { return x.same; }).length;
    function line(bm, en, a, b) { return '<span>' + EA.t(bm, en) + '</span><b class="' + (a < b ? 'wait-t' : 'ok-t') + '">' + a + ' / ' + b + EA.t(' hari', ' days') + '</b>'; }
    return '<div class="card pg-card"><div class="pg-kv">' +
      (judged.length ? line('Hari ditutup (TUTUP HARI)', 'Days closed (TUTUP HARI)', closed, judged.length) : '<span>' + EA.t('Hari ditutup (TUTUP HARI)', 'Days closed (TUTUP HARI)') + '</span><b>' + (data.from ? EA.t('mula ', 'from ') + dm(data.from) : '—') + '</b>') +
      line('BTS di ramp kurang 24 jam', 'FFB on the ramp under 24 hours', ramp, d.length) +
      line('Kerja dikunci hari yang sama', 'Work keyed the same day', same, d.length) + '</div>' +
      '<p class="pg-note">' + EA.t('Dikira hingga semalam. Hari ini dinilai esok.', 'Counted to yesterday. Today is judged tomorrow.') + '</p></div>';
  }

  function html(estate, month) {
    var data = EA.local.get(KEY + estate + '.' + month, null);
    if (!data && oldOffice) return '<div class="card"><p class="hint">' + EA.t('Pejabat belum ada laporan ini. Pemilik perlu kemas kini skrip pejabat (versi baru).', 'The office does not have this report yet. The Owner needs to update the office script (new version).') + '</p></div>';
    if (!data) return '<div class="card"><p class="hint">' + (EA.sendLink() && navigator.onLine ? EA.t('Memuat dari pejabat…', 'Loading from the office…') : EA.t('Perlu isyarat untuk muat dari pejabat.', 'Needs signal to load from the office.')) + '</p></div>';
    var cal = calc(estate, month, data), noProg = !(data.programme || []).length;
    function lab(n, bm, en) { return '<div class="pg-lab">' + n + ' · ' + EA.t(bm, en) + '</div>'; }
    return lab(1, 'Hasil', 'Crop') + cropCard(month, data) +
      (data.lots ? lab(2, 'Pusingan tuai', 'Harvest round') + lotsCard(estate, data) : '') +
      (noProg ? '<div class="card"><p class="hint">' + EA.t('Program rawatan tahun ini belum dimuat di pejabat.', 'This year\'s maintenance programme is not loaded in the office yet.') + '</p></div>' :
        lab(3, 'Program rawatan bulan ini', 'This month\'s programme') + nowCard(estate, month, cal) +
        lab(4, 'Pusingan tahun ini', 'Rounds this year') + roundsCard(month, cal) +
        lab(5, 'Baki kerja', 'Catch-up') + catchCard(month, cal, data)) +
      lab(6, 'Disiplin harian', 'Daily keying') + daysCard(month, data) +
      '<p class="hint">' + EA.t('Lihat sahaja. Dari pejabat · dikemas kini ', 'View only. From the office · updated ') + esc(data.at || '') + '</p>';
  }
  async function refresh(estate, month, after) {
    if (!EA.sendLink() || !navigator.onLine) return;
    var key = estate + '.' + month;
    if (asking[key]) return;
    asking[key] = true;
    var r = null;
    try { r = await EA.askFull('program', { estate: estate, month: month }); } finally { asking[key] = false; }
    if (r && r.error === 'unknown_action') { oldOffice = true; if (after) quietly(after); return; }   // office script older than 1.47
    if (r && r.ok) { oldOffice = false; EA.local.set(KEY + key, r); if (after) quietly(after); }
  }
  // A redraw after the office answered, or after a tap, never asks the office again (no loop of calls, as v1.19).
  function quietly(fn) { silent = true; try { fn(); } finally { silent = false; } }
  // Called by Rekod after it draws the PROGRAM view into box; redraw draws Rekod again.
  function wire(box, ctx, month, redraw) {
    box.querySelectorAll('[data-pg]').forEach(function (b) { b.onclick = function () { var k = b.dataset.pg; open[k] = !open[k]; quietly(redraw); }; });
    if (!silent) refresh(ctx.estate, month, redraw);
  }
  EA.fh.program = { html: html, wire: wire, calc: calc, refresh: refresh };
})();
