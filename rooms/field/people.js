// Field & Harvest: Rekod → ORANG (v1.50). Read only. The month read down the names instead of across the days —
// the pocket check roll on the phone. Brief "REKOD › ORANG" signed 3 Nov 2026 (Yu Chen, in chat).
// 1.50 builds the first tab, KEHADIRAN (attendance): names down, days across, the box is the job letter when the
// person came (H tuai, M baja, C racun, P tebas/cantas, LF lerai, IT angkut), | for a day-rated day, T/S/C/L/X when
// away; on the right HD (day-rated days), PR (piece-rate days), Hari (total) and Hasil (bunches for harvesters, Ha
// from this phone's own work lines); at the foot the day-rate count, piece-rate count and present per day, like the
// paper book. An alerts card at the top says in words what to look at: last three recorded days away ("mungkin
// lari", the chit's rule), under 80% this month, present with no work line. Tap a name → that person's month.
// Where it comes from: the office's month answer that Rekod already holds (chit rows: worker, mark, job, block), the
// office's crop answer (bunches per harvester per day) and this phone's own work lines. Nothing new is keyed and no
// new office call is made. PRESTASI, AGIHAN and ASAS GAJI come one tab a week (brief §7).
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};
  var gang = 'Semua', person = '';           // what is open on this phone, kept while Rekod redraws
  var LETTER = { HA: 'H', MAN: 'M', CPS: 'C', SS: 'C', VOPS: 'C', SL: 'P', RP: 'P', AP: 'P', SP: 'P', CPT: 'P', DEC: 'P', LF: 'LF', LFF: 'LF', ITF: 'IT', ETF: 'IT' };
  var CLASS = { H: 'or-h', M: 'or-m', C: 'or-c', P: 'or-p', LF: 'or-l', IT: 'or-l' };
  var GANGS = ['Tuai · Harvest', 'Rawatan · Maintenance'];
  var OTHER = 'Lain-lain · Other', NOLIST = 'Belum dalam senarai · Not on the list';
  function esc(s) { return EA.ui.esc(s); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function n0(n) { return Math.round(num(n)).toLocaleString('en-US'); }
  function daysIn(m) { var x = new Date(m + '-01T00:00:00'); return new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); }
  function isSunday(m, d) { return new Date(m + '-' + String(d).padStart(2, '0') + 'T00:00:00').getDay() === 0; }
  function task(code) { return EA.lists.task(code); }
  function dayRated(code) { var t = task(code); return !!(t && t.pay === 'day'); }
  function jobName(code) { var t = task(code); return t ? EA.t(t.bm, t.en) : (code || ''); }
  function gangOf(w) { if (!w) return NOLIST; if (GANGS.indexOf(w.gang) >= 0) return w.gang; return OTHER; }
  function gangShort(g) { var p = String(g).split(' · '); return EA.lang() === 'en' && p[1] ? p[1] : p[0]; }

  // ---------- the month, by person ----------
  // list: Rekod's merged days ({date, chits:[{rows:[{worker_id, muster, task_code, block, lots}]}], local}),
  // cr: the office's crop answer (harvesters[].days[day] = bunches), lines: this phone's own work lines by date.
  function calc(estate, month, list, cr) {
    var dm = daysIn(month), byW = {}, order = [];
    function W(id) {
      if (!byW[id]) {
        var w = EA.lists.worker(id);
        byW[id] = { id: id, name: w ? w.name : id, gang: gangOf(w), onList: !!w, mdr: !!(w && w.mdr), days: {}, H: 0, HD: 0, PR: 0, T: 0, S: 0, C: 0, L: 0, X: 0, bunches: 0, ha: 0, noWork: 0, jobs: {} };
        order.push(id);
      }
      return byW[id];
    }
    // everyone on the worker list first, so a person with no record still has a row
    (EA.lists.workersFor(estate) || []).concat(EA.lists.mandorsFor(estate) || []).forEach(function (w) { W(w.id); });
    var localLines = {};   // date → worker_id → [{task_code, qty, unit, bunches}]
    EA.local.get('fh.work', []).forEach(function (s) {
      if (s.estate !== estate || !s.rec || String(s.date).slice(0, 7) !== month) return;
      var by = localLines[s.date] = localLines[s.date] || {};
      (s.rec.lines || []).forEach(function (l) { (by[l.worker_id] = by[l.worker_id] || []).push(l); });
    });
    var dayHD = {}, dayPR = {}, dayH = {}, chitDays = {};
    (list || []).forEach(function (d) {
      var dd = Number(String(d.date).slice(8, 10)); if (!dd) return;
      chitDays[dd] = (d.chits || []).length > 0;
      var seen = {};
      (d.chits || []).forEach(function (c) {
        (c.rows || []).forEach(function (r) {
          if (!r.worker_id || seen[r.worker_id]) return;
          seen[r.worker_id] = true;
          var w = W(r.worker_id), m = String(r.muster || ''), code = String(r.task_code || '');
          var cell = w.days[dd] = { m: m, job: code, block: r.block || '', dr: m === 'H' && !!code && dayRated(code), imp: !!c.imp, noLine: false, qty: '' };
          if (m === 'H') {
            w.H++; dayH[dd] = (dayH[dd] || 0) + 1;
            if (cell.dr) { w.HD++; dayHD[dd] = (dayHD[dd] || 0) + 1; } else { w.PR++; dayPR[dd] = (dayPR[dd] || 0) + 1; }
            var j = w.jobs[code] = w.jobs[code] || { code: code, days: 0, qty: 0, unit: '', bunches: 0 };
            j.days++;
            var mine = (localLines[d.date] || {})[r.worker_id] || [];
            if (localLines[d.date] && !mine.length && !cell.dr) { cell.noLine = true; w.noWork++; }   // only a day this phone keyed can say "no line"
            mine.forEach(function (l) {
              var q = num(l.qty), b = num(l.bunches);
              if (String(l.unit) === 'Ha' && q) { w.ha += q; j.qty += q; j.unit = 'Ha'; cell.qty = (num(cell.qty) + q).toFixed(1) + ' Ha'; }
              else if (b) { j.bunches += b; }
            });
          } else if (m) { w[m] = (w[m] || 0) + 1; }
        });
      });
    });
    // bunches per harvester per day from the office's crop answer (also days with no chit on this phone)
    if (cr && cr.harvesters) cr.harvesters.forEach(function (h) {
      var w = W(h.id);
      Object.keys(h.days || {}).forEach(function (k) {
        var b = num(h.days[k]); if (!b) return;
        w.bunches += b;
        var cell = w.days[Number(k)];
        if (!cell) { cell = w.days[Number(k)] = { m: 'H', job: EA.lists.HARVEST, block: '', dr: false, imp: !!cr.imp, noLine: false, qty: '' }; w.H++; w.PR++; dayH[k] = (dayH[k] || 0) + 1; dayPR[k] = (dayPR[k] || 0) + 1; var j0 = w.jobs[EA.lists.HARVEST] = w.jobs[EA.lists.HARVEST] || { code: EA.lists.HARVEST, days: 0, qty: 0, unit: '', bunches: 0 }; j0.days++; }
        cell.qty = n0(b) + ' ' + EA.t('td', 'bn');
        var j = w.jobs[cell.job || EA.lists.HARVEST]; if (j) j.bunches += b;
      });
    });
    // totals, percent, the "mungkin lari" flag (last three recorded days away, the chit's rule)
    var people = order.map(function (id) { return byW[id]; });
    people.forEach(function (w) {
      var away = w.T + w.S + w.C + w.L + w.X, tot = w.H + away;
      w.away = away; w.recorded = tot; w.pct = tot ? Math.round(w.H / tot * 100) : 0;
      var ks = Object.keys(w.days).map(Number).sort(function (a, b) { return a - b; }), last3 = ks.slice(-3).map(function (k) { return w.days[k].m; });
      w.flag = last3.length === 3 && last3.every(function (m) { return m && m !== 'H'; });
    });
    people.sort(function (a, b) {
      var ga = [GANGS[0], GANGS[1], OTHER, NOLIST].indexOf(a.gang), gb = [GANGS[0], GANGS[1], OTHER, NOLIST].indexOf(b.gang);
      return ga - gb || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
    return { month: month, dm: dm, people: people, dayHD: dayHD, dayPR: dayPR, dayH: dayH, chitDays: chitDays, abw: cr && cr.months ? (cr.months.filter(function (x) { return x.month === month; })[0] || {}).abw || 0 : 0 };
  }

  // ---------- the alerts, in words ----------
  function alerts(cal, people) {
    var out = [];
    people.forEach(function (w) { if (w.flag && w.onList) out.push(esc(w.name) + ' — ' + EA.t('3 hari terakhir tiada (mungkin lari?)', 'last 3 days away (absconded?)')); });
    people.forEach(function (w) { if (w.onList && !w.flag && w.recorded >= 5 && w.pct < 80) out.push(esc(w.name) + ' — ' + EA.t('hadir ', 'present ') + w.pct + '%'); });
    var nw = people.reduce(function (a, w) { return a + w.noWork; }, 0);
    if (nw) out.push(nw + EA.t(' hari hadir tanpa baris kerja', ' days present with no work line'));
    if (!out.length) return '<div class="card or-ok">' + EA.t('Tiada apa untuk tengok. Semua biasa.', 'Nothing to look at. All as usual.') + '</div>';
    return '<div class="card or-alert"><b>' + out.length + EA.t(' perkara untuk tengok', ' things to look at') + '</b>' + out.slice(0, 6).join(' · ') + (out.length > 6 ? ' · +' + (out.length - 6) : '') + '</div>';
  }

  // ---------- the grid ----------
  function letter(cell) {
    if (!cell || !cell.m) return '';
    if (cell.m !== 'H') return cell.m;
    if (cell.dr) return '|';
    return LETTER[cell.job] || (cell.job ? cell.job.slice(0, 2) : 'H');
  }
  function cellClass(cell, m, d) {
    if (isSunday(m, d)) return 'or-sn';
    if (!cell || !cell.m) return '';
    if (cell.m !== 'H') return 'or-a' + cell.m;
    if (cell.dr) return 'or-d';
    return CLASS[LETTER[cell.job] || 'H'] || 'or-h';
  }
  function hasil(w) {
    if (w.bunches) return n0(w.bunches) + ' <small>' + EA.t('tandan', 'bunches') + '</small>';
    if (w.ha) return w.ha.toFixed(1) + ' <small>Ha</small>';
    return '—';
  }
  function grid(cal, people, month) {
    var D = []; for (var i = 1; i <= cal.dm; i++) D.push(i);
    var h = '<div class="or-wrap"><table class="rk-x or-g"><thead><tr><th class="nm">' + EA.t('Nama', 'Name') + '</th>' +
      D.map(function (d) { return '<th class="' + (isSunday(month, d) ? 'or-sn' : cal.chitDays[d] === false ? 'or-nc' : '') + '">' + d + '</th>'; }).join('') +
      '<th class="tt">HD</th><th class="tt">PR</th><th class="tt">' + EA.t('Hari', 'Days') + '</th><th class="tt">' + EA.t('Hasil', 'Output') + '</th></tr></thead><tbody>';
    var lastG = null, cnt = {};
    people.forEach(function (w) { cnt[w.gang] = (cnt[w.gang] || 0) + 1; });
    people.forEach(function (w) {
      if (gang === 'Semua' && w.gang !== lastG) { lastG = w.gang; h += '<tr class="or-gh"><td class="nm">' + esc(gangShort(w.gang)) + ' (' + cnt[w.gang] + ')</td><td colspan="' + (cal.dm + 4) + '"></td></tr>'; }
      h += '<tr><td class="nm' + (w.onList ? '' : ' or-off') + '"><button type="button" data-or="' + esc(w.id) + '">' + esc(w.name) + (w.flag && w.onList ? '<i class="or-dot" aria-label="mungkin lari"></i>' : '') + '</button></td>' +
        D.map(function (d) { var c = w.days[d]; return '<td class="' + cellClass(c, month, d) + (c && c.imp && c.m ? ' or-im' : '') + '">' + esc(isSunday(month, d) ? '' : letter(c)) + '</td>'; }).join('') +
        '<td class="tt">' + (w.HD || '·') + '</td><td class="tt">' + (w.PR || '·') + '</td><td class="tt">' + w.H + '</td><td class="tt">' + hasil(w) + '</td></tr>';
    });
    var sum = function (o) { return Object.keys(o).reduce(function (a, k) { return a + o[k]; }, 0); };
    function foot(label, arr, total) { return '<tr class="or-ft"><td class="nm">' + label + '</td>' + D.map(function (d) { return '<td class="' + (isSunday(month, d) ? 'or-sn' : '') + '">' + (isSunday(month, d) ? '' : (arr[d] || '·')) + '</td>'; }).join('') + '<td class="tt or-l4" colspan="4">' + total + '</td></tr>'; }
    var tot = people.reduce(function (a, w) { return a + w.recorded; }, 0), H = sum(cal.dayH);
    h += foot(EA.t('Gaji harian', 'Day-rated'), cal.dayHD, sum(cal.dayHD) + EA.t(' hari', ' days')) + foot('Piece rate', cal.dayPR, sum(cal.dayPR) + EA.t(' hari', ' days')) +
      foot(EA.t('Hadir', 'Present') + ' / ' + people.length, cal.dayH, H + ' · ' + (tot ? Math.round(H / tot * 100) : 0) + '%') + '</tbody></table></div>';
    return h;
  }
  function key() {
    return '<div class="or-key"><span class="or-h">H ' + EA.t('tuai', 'harvest') + '</span><span class="or-m">M ' + EA.t('baja', 'manure') + '</span><span class="or-c">C ' + EA.t('racun', 'spray') + '</span><span class="or-p">P ' + EA.t('tebas/cantas', 'slash/prune') + '</span><span class="or-l">LF ' + EA.t('lerai', 'loose') + ' · IT ' + EA.t('angkut', 'transport') + '</span><span class="or-d">| ' + EA.t('gaji harian', 'day-rated') + '</span><span class="or-aT">T</span><span class="or-aS">S</span><span class="or-aC">C ' + EA.t('cuti', 'leave') + '</span><span class="or-sn">' + EA.t('Ahad', 'Sunday') + '</span><span class="or-nc">' + EA.t('tiada chit', 'no chit') + '</span></div>';
  }

  // ---------- one person's month ----------
  function personCard(cal, w, month) {
    var jobs = Object.keys(w.jobs).map(function (k) { return w.jobs[k]; }).sort(function (a, b) { return b.days - a.days; });
    var isH = w.jobs[EA.lists.HARVEST] && w.jobs[EA.lists.HARVEST].days >= w.H / 2;
    var h = '<div class="or-ptop"><button type="button" class="or-pback" id="or-back">‹ ' + EA.t('SENARAI', 'LIST') + '</button><div><h2>' + esc(w.name) + '</h2><span class="brand-sub">' + esc(w.id) + ' · ' + esc(gangShort(w.gang)) + (w.onList ? '' : ' · ' + EA.t('tiada dalam senarai', 'not on the list')) + '</span></div></div>';
    h += '<span class="or-tag' + (isH ? '' : ' m') + '">' + (isH ? EA.t('Penuai · satu kerja', 'Harvester · one job') : EA.t('Rawatan · ', 'Upkeep · ') + jobs.length + EA.t(' kerja bulan ini', ' jobs this month')) + '</span>';
    h += '<div class="rk-sum or-sum"><div><b>' + w.H + '</b><small>' + EA.t('hari kerja', 'days worked') + '</small></div><div><b>' + w.PR + '</b><small>' + EA.t('hari piece rate', 'piece-rate days') + '</small></div><div><b>' + w.HD + '</b><small>' + EA.t('hari gaji harian', 'day-rated days') + '</small></div><div><b>' + w.away + '</b><small>' + EA.t('tiada', 'away') + ' (T' + w.T + ' S' + w.S + ' C' + w.C + ')</small></div></div>';
    if (w.flag && w.onList) h += '<div class="card or-alert"><b>' + EA.t('3 hari terakhir tiada.', 'Last 3 days away.') + '</b>' + EA.t('Sama seperti amaran "mungkin lari" di chit.', 'Same as the "absconded?" warning on the chit.') + '</div>';
    h += '<section class="card"><h2>' + EA.t('Ikut kerja', 'By job') + '<small>' + EA.t('kadar tiada · kuantiti sahaja', 'no rates · quantities only') + '</small></h2><table class="rk-x or-jobs"><tr><th class="nm">' + EA.t('Kerja', 'Job') + '</th><th>' + EA.t('Hari', 'Days') + '</th><th>' + EA.t('Kuantiti', 'Quantity') + '</th><th>' + EA.t('sehari', 'per day') + '</th></tr>';
    jobs.forEach(function (j) {
      var dr = dayRated(j.code), q = j.bunches ? n0(j.bunches) + ' ' + EA.t('tandan', 'bunches') : j.qty ? j.qty.toFixed(1) + ' ' + j.unit : '';
      var per = j.bunches ? n0(j.bunches / j.days) : j.qty ? (j.qty / j.days).toFixed(2) : '';
      h += '<tr><td class="nm">' + esc(jobName(j.code)) + ' <small>' + esc(j.code) + (dr ? ' · ' + EA.t('gaji harian', 'day-rated') : '') + '</small></td><td>' + j.days + '</td><td>' + (dr ? '—' : q || '—') + '</td><td><b>' + (dr ? '—' : per || '—') + '</b></td></tr>';
    });
    if (w.bunches && cal.abw) h += '<tr class="tot"><td class="nm">MT @ ABW ' + cal.abw + '</td><td></td><td>' + (w.bunches * cal.abw / 1000).toFixed(1) + ' MT</td><td>' + (w.bunches * cal.abw / 1000 / (w.jobs[EA.lists.HARVEST] || { days: w.H }).days).toFixed(2) + '</td></tr>';
    h += '</table></section>';
    h += '<section class="card"><h2>' + EA.t('Hari demi hari', 'Day by day') + '</h2><table class="rk-x or-days">';
    var DN = EA.t(['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    for (var d = cal.dm; d >= 1; d--) {
      var c = w.days[d]; if (!c || !c.m) continue;
      var dn = DN[new Date(month + '-' + String(d).padStart(2, '0') + 'T00:00:00').getDay()];
      h += '<tr><td class="nm">' + dn + ' ' + d + '</td><td class="l">' + (c.m === 'H' ? (c.job ? '<b>' + esc(c.job) + '</b> <small>' + esc(jobName(c.job)) + (c.block ? ' · Blk ' + esc(c.block) : '') + (c.dr ? ' · ' + EA.t('gaji harian', 'day-rated') : '') + '</small>' : '<small>' + EA.t('hadir, kerja tiada kod', 'present, job not coded') + '</small>') + (c.noLine ? ' <i class="or-nl">' + EA.t('tiada baris kerja', 'no work line') + '</i>' : '') : '<small>' + (EA.fh.marks && EA.fh.marks[c.m] ? EA.t(EA.fh.marks[c.m][0], EA.fh.marks[c.m][1]) : c.m) + '</small>') + '</td><td>' + esc(c.qty || '') + '</td><td class="' + (c.m === 'H' ? 'or-h' : 'or-a' + c.m) + ' or-mk">' + esc(c.m) + '</td></tr>';
    }
    h += '</table></section><p class="hint">' + EA.t('Lihat sahaja. Dari chit pagi dan kerja harian. Ha hanya dari kerja yang dikunci di telefon ini; tandan dari pejabat.', 'View only. From the morning chit and the day\'s work. Ha only from work keyed on this phone; bunches from the office.') + '</p>';
    return h;
  }

  // ---------- the screen ----------
  function html(estate, month, list, cr, user) {
    var cal = calc(estate, month, list, cr);
    if (person) { var w = cal.people.filter(function (x) { return x.id === person; })[0]; if (w) return '<div class="or-person">' + personCard(cal, w, month) + '</div>'; person = ''; }
    var ppl = gang === 'Semua' ? cal.people : cal.people.filter(function (w) { return w.gang === gang; });
    var tabs = '<div class="or-tabs" role="tablist"><button type="button" class="on" aria-pressed="true">' + EA.t('KEHADIRAN', 'ATTENDANCE') + '</button>' +
      [['PRESTASI', 'PERFORMANCE'], ['AGIHAN', 'DISTRIBUTION'], ['ASAS GAJI', 'PAY BASIS']].map(function (t) { return '<button type="button" disabled>' + EA.t(t[0], t[1]) + '<span class="or-soon">' + EA.t('akan datang', 'coming') + '</span></button>'; }).join('') + '</div>';
    var chips = '<div class="or-gangs" role="group">' + ['Semua'].concat(GANGS, [OTHER, NOLIST]).filter(function (g) { return g === 'Semua' || cal.people.some(function (w) { return w.gang === g; }); }).map(function (g) {
      var n = g === 'Semua' ? cal.people.length : cal.people.filter(function (w) { return w.gang === g; }).length;
      return '<button type="button" data-organg="' + esc(g) + '"' + (gang === g ? ' class="on" aria-pressed="true"' : '') + '>' + esc(g === 'Semua' ? EA.t('Semua', 'All') : gangShort(g)) + ' (' + n + ')</button>';
    }).join('') + '</div>';
    if (!cal.people.length) return tabs + '<p class="hint">' + EA.t('Tiada senarai pekerja di telefon ini lagi. Perlu isyarat sekali.', 'No worker list on this phone yet. Needs signal once.') + '</p>';
    var canPrint = !!user && /^(Owner|HQ|Clerk|Manager)$/.test(user.role);
    return tabs + chips + alerts(cal, ppl) + grid(cal, ppl, month) + key() +
      '<p class="hint">' + EA.t('Kotak = huruf kerja bila hadir, | hari gaji harian, T/S/C bila tiada. Condong = dari fail lama. Kanan: HD hari gaji harian · PR hari piece rate · Hari jumlah · Hasil. Tekan nama → bulan orang itu. Luncur ke kiri untuk hari lain.', 'Box = job letter when present, | a day-rated day, T/S/C when away. Italic = old data. Right: HD day-rated days · PR piece-rate days · Days · Output. Tap a name → that person\'s month. Slide for other days.') + '</p>' +
      (canPrint ? '<button type="button" class="rk-print" id="or-print"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg><span>' + EA.t('CETAK BULAN', 'PRINT MONTH') + '<small>' + EA.t('A4 · Buku kedatangan · Staf · Kerani · Pengurus', 'A4 · Check roll · Staff · Clerk · Manager') + '</small></span></button>' : '');
  }
  function wire(box, ctx, month, redraw, list, cr) {
    box.querySelectorAll('[data-organg]').forEach(function (b) { b.onclick = function () { gang = b.dataset.organg; redraw(); }; });
    box.querySelectorAll('[data-or]').forEach(function (b) { b.onclick = function () { person = b.dataset.or; redraw(); window.scrollTo(0, 0); }; });
    var back = box.querySelector('#or-back'); if (back) back.onclick = function () { person = ''; redraw(); };
    var pb = box.querySelector('#or-print'); if (pb) pb.onclick = function () { printSheet(ctx, month, list, cr); };
  }
  EA.fh.peopleReset = function () { person = ''; };

  // ---------- A4 print: the check roll, one gang per page when Semua ----------
  function printSheet(ctx, month, list, cr) {
    var cal = calc(ctx.estate, month, list, cr), est = ctx.estate, co = (EA.lists.estate(est) || {}).company || '', nm = (EA.lists.estate(est) || {}).name || est;
    var x = new Date(month + '-01T00:00:00'), FULL = EA.t(['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'], ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
    var now = new Date(), stamp = now.getDate() + ' ' + EA.t(EA.ui.monBm, EA.ui.monEn)[now.getMonth()] + ' ' + now.getFullYear() + ' ' + EA.ui.hhmm(now), who = (ctx.user && ctx.user.name) || '';
    var groups = gang === 'Semua' ? [GANGS[0], GANGS[1], OTHER, NOLIST].filter(function (g) { return cal.people.some(function (w) { return w.gang === g; }); }) : [gang];
    var pages = groups.map(function (g, gi) {
      var ppl = cal.people.filter(function (w) { return w.gang === g; }), D = []; for (var i = 1; i <= cal.dm; i++) D.push(i);
      var hd = '<div class="pr-hd"><div><h1>' + EA.t('Buku Kedatangan · Pocket Check Roll', 'Pocket Check Roll · Buku Kedatangan') + '</h1><div class="s">' + (co === 'PJSB' ? 'Pelita Jujur Sdn Bhd' : 'S.H.A. Hup Aik Plantation Sdn Bhd') + ' · ' + esc(co + '.' + est) + ' (' + esc(nm) + ') · ' + esc(FULL[x.getMonth()] + ' ' + x.getFullYear()) + ' · ' + esc(gangShort(g)) + ' (' + ppl.length + ')</div></div><div class="r">E-Book · ' + EA.t('Rekod kehadiran bulanan', 'Monthly attendance') + '<br>' + EA.t('Dicetak ', 'Printed ') + esc(stamp) + (who ? EA.t(' oleh ', ' by ') + esc(who) : '') + '<br>' + EA.t('Muka ', 'Page ') + (gi + 1) + ' / ' + groups.length + '</div></div>';
      var t = '<table class="pr-or"><tr><th class="l">' + EA.t('Nama · Name', 'Name · Nama') + '</th>' + D.map(function (d) { return '<th' + (isSunday(month, d) ? ' class="sn"' : '') + '>' + d + '</th>'; }).join('') + '<th>HD</th><th>PR</th><th>' + EA.t('Hari', 'Days') + '</th><th>T</th><th>S</th><th>C</th><th class="l">' + EA.t('Hasil', 'Output') + '</th></tr>';
      var dHD = {}, dPR = {}, dH = {};
      ppl.forEach(function (w) {
        t += '<tr><td class="l"><b>' + esc(w.name) + '</b> <i>' + esc(w.id) + '</i></td>' + D.map(function (d) { var c = w.days[d]; if (c && c.m === 'H') { dH[d] = (dH[d] || 0) + 1; if (c.dr) dHD[d] = (dHD[d] || 0) + 1; else dPR[d] = (dPR[d] || 0) + 1; } return '<td class="' + (isSunday(month, d) ? 'sn' : c && c.m ? 'm' + (c.m === 'H' ? (c.dr ? 'D' : 'H') : c.m) : '') + (c && c.imp && c.m ? ' im' : '') + '">' + esc(isSunday(month, d) ? '' : letter(c)) + '</td>'; }).join('') +
          '<td>' + (w.HD || '·') + '</td><td>' + (w.PR || '·') + '</td><td><b>' + w.H + '</b></td><td>' + (w.T || '·') + '</td><td>' + (w.S || '·') + '</td><td>' + (w.C || '·') + '</td><td class="l">' + (w.bunches ? n0(w.bunches) + ' ' + EA.t('tandan', 'bunches') : w.ha ? w.ha.toFixed(1) + ' Ha' : '—') + '</td></tr>';
      });
      function ft(label, arr) { return '<tr class="tot"><td class="l">' + label + '</td>' + D.map(function (d) { return '<td' + (isSunday(month, d) ? ' class="sn"' : '') + '>' + (isSunday(month, d) ? '' : (arr[d] || '–')) + '</td>'; }).join('') + '<td colspan="7"></td></tr>'; }
      t += ft(EA.t('Gaji harian', 'Day-rated'), dHD) + ft('Piece rate', dPR) + ft(EA.t('Hadir', 'Present'), dH) + '</table>';
      return '<section class="pr-pg">' + hd + t +
        '<p class="note">H ' + EA.t('tuai', 'harvest') + ' · M ' + EA.t('baja', 'manure') + ' · C ' + EA.t('racun', 'spray') + ' · P ' + EA.t('tebas/cantas', 'slash/prune') + ' · LF ' + EA.t('lerai', 'loose fruit') + ' · IT ' + EA.t('angkut', 'transport') + ' · | ' + EA.t('gaji harian', 'day-rated') + ' · T ' + EA.t('tak hadir', 'absent') + ' · S ' + EA.t('sakit', 'sick') + ' · C ' + EA.t('cuti', 'leave') + ' · ' + EA.t('condong = fail lama', 'italic = old data') + '. HD ' + EA.t('hari gaji harian', 'day-rated days') + ' · PR ' + EA.t('hari piece rate', 'piece-rate days') + '.</p>' +
        '<div class="pr-sig"><div>' + EA.t('Disediakan oleh · Prepared by', 'Prepared by · Disediakan oleh') + '<br><b>' + EA.t('Staf bertugas', 'Field staff') + '</b></div><div>' + EA.t('Disemak oleh · Checked by', 'Checked by · Disemak oleh') + '<br><b>' + EA.t('Kerani', 'Clerk') + '</b></div><div>' + EA.t('Diluluskan oleh · Approved by', 'Approved by · Diluluskan oleh') + '<br><b>' + EA.t('Pengurus', 'Manager') + '</b></div></div>' +
        '<p class="note">' + EA.t('Angka dari E-Book (satu sumber). Cetakan ini salinan pada tarikh cetak. Tiada yang dipadam; pembetulan adalah rekod baru.', 'Numbers from E-Book (one source). This print is a copy on the print date. Nothing is deleted; a correction is a new record.') + '</p></section>';
    });
    var area = document.getElementById('print-area');
    if (!area) { area = document.createElement('div'); area.id = 'print-area'; document.body.appendChild(area); }
    area.innerHTML = pages.join('');
    document.title = 'Kedatangan_' + est + '_' + month;
    setTimeout(function () { try { window.print(); } catch (e) {} }, 50);
  }

  EA.fh.people = { html: html, wire: wire, calc: calc, letter: letter };
})();
