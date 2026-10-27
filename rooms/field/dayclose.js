// Field & Harvest room — TUTUP HARI (day close), v1.43. Room code DCL.
// From the brief "Rancangan & Prestasi" §4–5, approved by Yu Chen 26 Oct 2026. Live at Sugut from November 2026.
//
// At the end of the day the Staf bertugas presses TUTUP HARI. Before the day closes the phone checks it is complete:
//   1. every worker on the chit has a work line, or is marked S / C / T (durian job codes count as complete:
//      their work lives in the Sugut DMS until the Durian room joins E-Book);
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
  function niceDate(iso) { var d = new Date(iso + 'T00:00:00'); return ui().dayBm[d.getDay()] + ' ' + d.getDate() + ' ' + ui().monBm[d.getMonth()]; }
  function task(code) { return EA.lists.task(code); }
  function shortName(code) { return (EA.lists.chitNames && EA.lists.chitNames[code]) || (task(code) ? task(code).en : code); }
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }
  function rainOf(code) { return EA.lists.rainOf ? EA.lists.rainOf(code) : 'B'; }
  function isDms(code) { return (EA.lists.DMS_JOBS || []).indexOf(code) >= 0; }
  function canClose(u) { return !!u && (u.role === 'Staff' || u.role === 'Owner' || u.role === 'HQ'); }
  // v1.43.1 (Yu Chen, 27 Oct): practice logins (Mod Latihan, code L-) may close any day with a chit, so the screen
  // can be tried with made-up workers before the real start date (4 Nov). Real logins wait for the start date.
  function from() {
    if (EA.practice && EA.practice()) return '2020-01-01';
    var o = EA.local.get(K.office + (ctx && ctx.estate), null); return (o && o.from) || '2026-11-04';
  }

  // ---------- what this phone knows about a day ----------
  function closes() { return EA.local.get(K.saved, []).filter(function (s) { return s.date >= EA.dayAgo(40); }); }
  function closedLocal(estate, date) { return closes().find(function (s) { return s.estate === estate && s.date === date && !s.reopened; }) || null; }
  function officeDays(estate) { var o = EA.local.get(K.office + estate, null); return (o && o.days) || []; }
  function officeState(estate, date) { var d = officeDays(estate).find(function (x) { return x.date === date; }); return d ? d.state : ''; }
  function chitOf(estate, date) {
    return EA.fh.allChits().filter(function (c) { return c.estate === estate && c.date === date; })
      .sort(function (a, b) { return (a.confirmedAt || '') < (b.confirmedAt || '') ? 1 : -1; })[0] || null;
  }
  function workOf(chit) { return chit ? (EA.local.get('fh.work', []).find(function (s) { return s.chit === chit.chit; }) || null) : null; }
  function collectsOf(estate, date) { return EA.local.get('fh.collect', []).filter(function (s) { return s.estate === estate && s.date === date; }); }

  // Days this phone can close: the chits of the last 7 days from the start date, not closed yet (or reopened by the office).
  function openDays(estate) {
    var seen = {}, out = [], today = EA.today(), f = from();
    EA.fh.allChits().forEach(function (c) {
      if (c.estate !== estate || c.date < f || c.date > today || seen[c.date] || c.date < EA.dayAgo(7)) return;
      seen[c.date] = true;
      var st = officeState(estate, c.date), loc = closedLocal(estate, c.date);
      if (st === 'closed' || (loc && st !== 'reopened' && st !== 'fixing')) return;
      out.push({ date: c.date, chit: c, reopened: st === 'reopened' || st === 'fixing' });
    });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  EA.fh.openDays = openDays;

  // ---------- the six checks ----------
  // Each check: { n, ok, bm, en, sub, go } — go is the screen that fixes it.
  function checks(estate, c, d) {
    var out = [], w = workOf(c), lines = (w && w.rec && w.rec.lines) || [], jobs = (w && w.rec && w.rec.jobs) || [];
    var present = (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster === 'H'; });
    var absent = (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster !== 'H'; }).length;
    // 1 · every worker present has a work line (durian codes count)
    var hasLine = {}; lines.forEach(function (l) { hasLine[l.worker_id] = true; });
    var missing = present.filter(function (r) { return !isDms(r.task_code) && !hasLine[r.worker_id]; });
    out.push(!w ? { n: 1, ok: false, bm: 'Kerja harian belum dikunci', en: 'The day\'s work is not keyed', sub: present.length + EA.t(' orang hadir di chit', ' people present on the chit'), go: '#field-harvest/work' }
      : missing.length ? { n: 1, ok: false, bm: missing.length + ' orang hadir tiada baris kerja', en: missing.length + ' present with no work line', sub: missing.slice(0, 4).map(function (r) { return person(r.worker_id); }).join(', ') + (missing.length > 4 ? ' +' + (missing.length - 4) : ''), go: '#field-harvest/work' }
      : { n: 1, ok: true, bm: present.length + ' orang bekerja, ' + absent + ' tidak hadir · semua ada baris kerja', en: present.length + ' working, ' + absent + ' away · every worker has a work line', sub: '' });
    // 2 · harvest lots collected to the ramp, or explained
    var cut = 0, col = 0;
    lines.forEach(function (l) { if (l.task_code === EA.lists.HARVEST) cut += num(l.bunches); });
    collectsOf(estate, c.date).forEach(function (s) { (s.lines || []).forEach(function (l) { col += num(l.bunches); }); });
    var fieldLeft = Math.max(0, cut - col), bl = EA.fh.getBacklog ? EA.fh.getBacklog(estate) : null;
    var fieldOld = bl && Array.isArray(bl.field) ? bl.field.filter(function (x) { return x.since && x.since <= c.date; }).reduce(function (a, x) { return a + (Number(x.bunches) || 0); }, 0) : 0;
    var left = Math.max(fieldLeft, fieldOld);
    if (!cut) out.push({ n: 2, ok: true, bm: 'Tiada tuaian hari ini', en: 'No harvest today', sub: '' });
    else if (left > 0 && !String(d.fieldNote || '').trim()) out.push({ n: 2, ok: false, bm: left + ' tandan dituai belum ke ramp', en: left + ' bunches cut, not yet at the ramp', sub: EA.t('Tekan SEMUA KE RAMP, atau tulis sebab di bawah', 'Press ALL TO RAMP, or write why below'), go: '#field-harvest/collect', note: 'field' });
    else out.push({ n: 2, ok: true, bm: cut + ' tandan dituai' + (left > 0 ? ' · ' + left + ' belum ke ramp (sebab ditulis)' : ' · semua ke ramp'), en: cut + ' bunches cut' + (left > 0 ? ' · ' + left + ' not at the ramp (reason given)' : ' · all at the ramp'), sub: '' });
    // 3 · every lorry has its delivery note
    var lorries = collectsOf(estate, c.date).filter(function (s) { return s.dispatch && !s.dispatch.replacedBy; });
    var noDn = lorries.filter(function (s) { return !String(s.dispatch.dn || '').trim(); });
    out.push(noDn.length ? { n: 3, ok: false, bm: noDn.length + ' lori tiada nota hantar (DN)', en: noDn.length + ' lorry without a delivery note', sub: EA.t('Isi nombor DN di skrin Ramp', 'Key the DN number on the Ramp screen'), go: '#field-harvest/collect' }
      : { n: 3, ok: true, bm: lorries.length ? lorries.length + ' lori keluar, semua ada DN' : 'Tiada lori hari ini', en: lorries.length ? lorries.length + ' lorries out, all with a DN' : 'No lorry today', sub: '' });
    // 4 · a job not finished has a reason; every job is answered
    var noAns = jobs.filter(function (j) { return !j.status; }), noWhy = jobs.filter(function (j) { return j.status === 'not_done' && String(j.reason || '').trim().length < 5; });
    out.push(!w ? { n: 4, ok: false, bm: 'Siap / belum siap belum dijawab', en: 'Done / not done not answered', sub: '', go: '#field-harvest/work' }
      : (noAns.length || noWhy.length) ? { n: 4, ok: false, bm: (noAns.length + noWhy.length) + ' kerja tanpa jawapan atau sebab', en: (noAns.length + noWhy.length) + ' jobs with no answer or reason', sub: noAns.concat(noWhy).slice(0, 3).map(function (j) { return shortName(j.task_code) + (j.block ? ' Blk ' + j.block : ''); }).join(', '), go: '#field-harvest/work' }
      : { n: 4, ok: true, bm: jobs.filter(function (j) { return j.status === 'done'; }).length + '/' + jobs.length + ' kerja siap' + (jobs.some(function (j) { return j.status === 'not_done'; }) ? ' · sebab ditulis' : ''), en: jobs.filter(function (j) { return j.status === 'done'; }).length + '/' + jobs.length + ' jobs done', sub: '' });
    // 5 · rain fits the jobs (see rainCheck)
    out.push(rainCheck(jobs, d));
    // 6 · records keyed (waiting ones go with the close)
    var ids = lines.map(function (l) { return l.id; }).concat(jobs.map(function (j) { return j.id; })).filter(Boolean);
    var waiting = ids.filter(function (i) { return EA.isWaiting(i); }).length;
    out.push({ n: 6, ok: true, bm: waiting ? waiting + ' rekod menunggu · dihantar bersama penutupan' : 'Semua rekod dihantar', en: waiting ? waiting + ' records waiting · sent with the close' : 'All records sent', sub: '', soft: true });
    return out;
  }
  // Which jobs fell short today (BELUM SIAP, or a flag such as under target).
  function shortJobs(jobs) { return jobs.filter(function (j) { return j.status === 'not_done' || /sasaran|target|kurang|under/i.test(String(j.flags || '')); }); }
  function rainCheck(jobs, d) {
    var when = d.rainWhen || 'none';
    if (when === 'none') return { n: 5, ok: true, bm: 'Tiada hujan', en: 'No rain', sub: '' };
    var sj = shortJobs(jobs), reasons = EA.lists.rainReasons || [], rs = reasons.find(function (r) { return r.code === d.rainReason; });
    if (!sj.length) return { n: 5, ok: true, bm: 'Hujan dicatat tetapi tiada kerja kurang sasaran · tidak direkod', en: 'Rain noted but no job fell short · not recorded', sub: EA.t('Sasaran tercapai, jadi hujan bukan alasan', 'Targets met, so rain is not a reason'), drop: true };
    if (!rs) return { n: 5, ok: false, bm: 'Pilih sebab hujan', en: 'Pick the rain reason', sub: '', note: 'rain' };
    if (rs.when.indexOf(when) < 0) return { n: 5, ok: false, bm: 'Sebab "' + rs.bm + '" tidak padan dengan masa hujan', en: 'Reason does not fit the rain timing', sub: when === 'night' ? EA.t('Hujan malam: hanya "tanah / jalan basah" diterima', 'Night rain: only "wet ground" counts') : '', note: 'rain' };
    if (!d.rainLost) return { n: 5, ok: false, bm: 'Berapa hari hilang? (¼ · ½ · ¾ · 1)', en: 'How much of the day was lost?', sub: '', note: 'rain' };
    var fit = sj.filter(function (j) { return rs.groups.indexOf(rainOf(j.task_code)) >= 0; });
    if (!fit.length) return { n: 5, ok: false, bm: 'Kerja yang kurang (' + sj.map(function (j) { return shortName(j.task_code); }).join(', ') + ') tidak terjejas hujan jenis ini', en: 'The jobs that fell short are not affected by this kind of rain', sub: EA.t('Kumpulan C tidak terjejas; kumpulan B hanya hujan lebat', 'Group C is never affected; group B only by heavy rain'), note: 'rain' };
    return { n: 5, ok: true, bm: rs.bm + ' · ' + lostLabel(d.rainLost) + ' · ' + fit.map(function (j) { return shortName(j.task_code); }).join(', '), en: rs.en + ' · ' + lostLabel(d.rainLost), sub: EA.t('Sasaran tidak diturunkan: kerja tertinggal jadi baki kerja', 'The target is not lowered: lost work becomes catch-up'), jobs: fit.map(function (j) { return j.task_code; }) };
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
      html += (open.length > 1 ? '<div class="field"><label><span class="bm">Hari</span><span class="en">Day</span></label><select class="text-input" id="dc-pick">' +
        open.map(function (o) { return '<option value="' + o.date + '"' + (o.date === day.date ? ' selected' : '') + '>' + esc(niceDate(o.date)) + (o.reopened ? EA.t(' · DIBUKA SEMULA', ' · REOPENED') : '') + '</option>'; }).join('') + '</select></div>' : '');
      if (day.reopened) html += '<p class="warn"><b>' + EA.t('Dibuka semula · ', 'Reopened · ') + esc(niceDate(day.date)) + '</b> <span class="bm">Kerani minta pembetulan. Selepas pembetulan dikunci, tutup hari ini semula.</span></p>';
      html += '<div class="card"><h2>' + esc(niceDate(day.date)) + ' · ' + EA.t('Semakan sebelum tutup', 'Checks before closing') + '</h2>' +
        '<ol class="dc-list">' + ck.map(function (x) {
          return '<li class="dc-it ' + (x.ok ? (x.drop ? 'dc-drop' : 'dc-ok') : 'dc-bad') + '">' + (x.go && !x.ok ? '<button type="button" class="link-btn dc-go" data-go="' + esc(x.go) + '">' : '<span>') +
            '<b>' + (x.ok ? '✓' : '!') + ' ' + esc(EA.t(x.bm, x.en)) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + (x.go && !x.ok ? '</button>' : '</span>') + '</li>';
        }).join('') + '</ol>';
      // Field backlog reason (check 2) when fruit stays in the field.
      if (ck.some(function (x) { return x.note === 'field'; }) || String(d.fieldNote || '').trim()) {
        html += '<div class="field"><label><span class="bm">Sebab buah belum ke ramp</span><span class="en">Why the fruit is not at the ramp</span></label>' +
          '<textarea class="text-input" rows="2" id="dc-field" placeholder="' + EA.t('cth: traktor rosak petang, kutip esok pagi', 'e.g. tractor broke down, collect tomorrow morning') + '">' + esc(d.fieldNote || '') + '</textarea></div>';
      }
      // Rain (check 5)
      var hrs = (EA.lists.workHours || {})[ctx.estate] || { start: '06:00', end: '13:30' };
      html += '<div class="field"><label><span class="bm">Hujan hari ini? Bila?</span><span class="en">Rain today? When?</span></label><div class="picks" id="dc-when">' +
        [['none', 'Tiada', 'None'], ['night', 'Malam / lepas kerja', 'Night / after work'], ['morning', 'Pagi, sebelum muster', 'Before muster'], ['work', 'Masa kerja', 'During work']].map(function (o) {
          return '<button type="button" class="pick" data-when="' + o[0] + '" aria-pressed="' + ((d.rainWhen || 'none') === o[0]) + '"><b>' + esc(EA.t(o[1], o[2])) + '</b></button>';
        }).join('') + '</div><p class="hint">' + EA.t('Waktu kerja ' + hrs.start + '–' + hrs.end + '. Hujan di luar waktu kerja hanya dikira jika tanah / jalan basah pagi esok.', 'Working hours ' + hrs.start + '–' + hrs.end + '. Rain outside working hours counts only as wet ground next morning.') + '</p></div>';
      if ((d.rainWhen || 'none') !== 'none') {
        var rr = (EA.lists.rainReasons || []).filter(function (r) { return r.when.indexOf(d.rainWhen) >= 0; });
        html += '<div class="field"><label><span class="bm">Sebab</span><span class="en">Reason</span></label><div class="picks" id="dc-reason">' +
          rr.map(function (r) { return '<button type="button" class="pick" data-reason="' + r.code + '" aria-pressed="' + (d.rainReason === r.code) + '"><b>' + esc(EA.t(r.bm, r.en)) + '</b><small>' + EA.t('kumpulan ', 'group ') + r.groups.join('+') + '</small></button>'; }).join('') + '</div></div>' +
          '<div class="field"><label><span class="bm">Kerja hilang</span><span class="en">Work lost</span></label><div class="picks" id="dc-lost">' +
          (EA.lists.lostDay || []).map(function (o) { return '<button type="button" class="pick" data-lost="' + o.v + '" aria-pressed="' + (Number(d.rainLost) === o.v) + '"><b>' + esc(EA.t(o.bm, o.en)) + '</b></button>'; }).join('') + '</div></div>';
      }
      html += '<div class="field"><label><span class="bm">Catatan (pilihan)</span><span class="en">Note (optional)</span></label><input class="text-input" id="dc-note" maxlength="150" value="' + esc(d.note || '') + '"></div>' +
        '<div class="actions"><button type="button" class="btn btn-ok" id="dc-close"' + (bad.length ? ' disabled' : '') + '>TUTUP HARI<small>' + EA.t('Kunci hari ' + niceDate(day.date), 'Close ' + niceDate(day.date)) + '</small></button></div>' +
        (bad.length ? '<p class="hint">' + bad.length + EA.t(' perkara belum lengkap. Tekan baris merah untuk membetulkannya.', ' things not complete. Tap a red line to fix it.') + '</p>' : '<p class="hint">' + EA.t('Selepas ditutup, hari ini hanya boleh diubah melalui MINTA BETULKAN CHIT (kerani), dalam 3 hari.', 'After closing, this day changes only through MINTA BETULKAN CHIT (the clerk), within 3 days.') + '</p>') +
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

  function wire() {
    $('#dc-back').onclick = function () { location.hash = '#field-harvest/work'; };
    var p = $('#dc-pick'); if (p) p.onchange = function () { EA.local.set('fh.daypick', p.value); render(el, ctx); };
    if (!day) { el.querySelectorAll('[data-sum]').forEach(function (b) { b.onclick = function () { showSummary(b.dataset.sum); }; }); return; }
    var d = draftFor(day.date);
    function upd(fn) { fn(d); keepDraft(day.date, d); render(el, ctx); }
    el.querySelectorAll('.dc-go').forEach(function (b) { b.onclick = function () { EA.local.set('fh.workchit', day.chit.chit); location.hash = b.dataset.go; }; });
    el.querySelectorAll('[data-when]').forEach(function (b) { b.onclick = function () { upd(function (x) { x.rainWhen = b.dataset.when; x.rainReason = ''; x.rainLost = ''; }); }; });
    el.querySelectorAll('[data-reason]').forEach(function (b) { b.onclick = function () { upd(function (x) { x.rainReason = b.dataset.reason; }); }; });
    el.querySelectorAll('[data-lost]').forEach(function (b) { b.onclick = function () { upd(function (x) { x.rainLost = b.dataset.lost; }); }; });
    var f = $('#dc-field'); if (f) { f.oninput = function () { d.fieldNote = f.value; keepDraft(day.date, d); }; f.onchange = function () { render(el, ctx); }; }
    var n = $('#dc-note'); if (n) n.oninput = function () { d.note = n.value; keepDraft(day.date, d); };
    var cb = $('#dc-close'); if (cb) cb.onclick = function () { closeDay(d); };
    el.querySelectorAll('[data-sum]').forEach(function (b) { b.onclick = function () { showSummary(b.dataset.sum); }; });
  }

  // ---------- closing ----------
  function closeDay(d) {
    var c = day.chit, ck = checks(ctx.estate, c, d);
    if (ck.some(function (x) { return !x.ok; })) { ui().toast(EA.t('Belum lengkap', 'Not complete yet'), 'bad'); render(el, ctx); return; }
    var w = workOf(c), jobs = (w && w.rec && w.rec.jobs) || [], lines = (w && w.rec && w.rec.lines) || [];
    var rain = ck.find(function (x) { return x.n === 5; }), keepRain = (d.rainWhen || 'none') !== 'none' && !rain.drop;
    var present = (c.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster === 'H'; }).length;
    var total = (c.rows || []).filter(function (r) { return r.status !== 'removed'; }).length;
    var bunches = 0; lines.forEach(function (l) { if (l.task_code === EA.lists.HARVEST) bunches += num(l.bunches); });
    var lorries = collectsOf(ctx.estate, c.date).filter(function (s) { return s.dispatch && !s.dispatch.replacedBy; }).length;
    var at = EA.today() + ' ' + EA.ui.hhmm(new Date());
    var old = closedLocal(ctx.estate, c.date) || closes().find(function (s) { return s.estate === ctx.estate && s.date === c.date; });
    var checksTxt = ck.map(function (x) { return x.n + (x.ok ? '✓' : '!') + ' ' + x.bm; }).join(' | ').slice(0, 400);
    var rec;
    try {
      rec = EA.save(TAB, ROOM, ctx.estate, { date: c.date, chit: c.chit, kind: 'close', closed_by: ctx.user.code, closed_at: at, checks: checksTxt,
        rain_when: keepRain ? d.rainWhen : '', rain_reason: keepRain ? d.rainReason : '', rain_lost: keepRain ? String(d.rainLost) : '', rain_jobs: keepRain ? (rain.jobs || []).join(' ') : '',
        workers: String(total), present: String(present), bunches: String(bunches), jobs_done: String(jobs.filter(function (j) { return j.status === 'done'; }).length), jobs_planned: String(jobs.length),
        lorries: String(lorries), note: [String(d.fieldNote || '').trim(), String(d.note || '').trim()].filter(Boolean).join(' · ').slice(0, 200) }, old && old.reopened ? old.id : '');
    } catch (e) { ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad'); return; }
    var s = { id: rec.id, estate: ctx.estate, date: c.date, chit: c.chit, at: at.slice(11), by: ctx.user.code, byName: ctx.user.name, present: present, total: total, bunches: bunches,
      jobsDone: jobs.filter(function (j) { return j.status === 'done'; }).length, jobs: jobs.length, lorries: lorries, rain: keepRain ? (rain.bm.split(' · ')[0] + ' · ' + lostLabel(d.rainLost)) : '', rainJobs: keepRain ? (rain.jobs || []) : [],
      notDone: jobs.filter(function (j) { return j.status === 'not_done'; }).map(function (j) { return { job: shortName(j.task_code) + (j.block ? ' Blk ' + j.block : ''), why: j.reason || '' }; }), note: d.note || '', fieldNote: d.fieldNote || '' };
    var list = closes().filter(function (x) { return !(x.estate === s.estate && x.date === s.date); }); list.push(s); EA.local.set(K.saved, list);
    var o = EA.local.get(K.office + ctx.estate, null); if (o && o.days) { o.days.forEach(function (x) { if (x.date === c.date) x.state = 'closed'; }); EA.local.set(K.office + ctx.estate, o); }
    dropDraft(c.date);
    ui().toast(EA.t('Hari ' + niceDate(c.date) + ' ditutup', 'Day ' + niceDate(c.date) + ' closed'));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
    showSummary(c.date);
  }

  // ---------- the day summary for WhatsApp ----------
  function summaryText(s) {
    var dd = new Date(s.date + 'T00:00:00'), est = EA.lists.estate(s.estate);
    var L = ['*TUTUP HARI ' + (est ? est.company + ' ' : '') + s.estate + '*', ui().dayBm[dd.getDay()] + ' ' + dd.getDate() + '/' + (dd.getMonth() + 1) + '/' + dd.getFullYear(), ''];
    L.push('Pekerja: ' + s.present + '/' + s.total + ' hadir');
    L.push('Tuaian: ' + s.bunches + ' tandan' + (s.lorries ? ' · ' + s.lorries + ' lori keluar' : ' · tiada lori'));
    L.push('Kerja: ' + s.jobsDone + '/' + s.jobs + ' siap');
    (s.notDone || []).forEach(function (j) { L.push('  • ' + j.job + ' BELUM SIAP' + (j.why ? ' — ' + j.why : '')); });
    if (s.fieldNote) L.push('Buah belum ke ramp: ' + s.fieldNote);
    if (s.rain) L.push('Hujan: ' + s.rain + (s.rainJobs && s.rainJobs.length ? ' (' + s.rainJobs.map(shortName).join(', ') + ') · jadi baki kerja' : ''));
    else L.push('Hujan: tiada');
    if (s.note) L.push('Catatan: ' + s.note);
    L.push('');
    L.push('Ditutup: ' + (s.byName || s.by) + ' · ' + s.at);
    L.push('E-Book ' + s.chit);
    return L.join('\n');
  }
  function showSummary(date) {
    var s = closes().find(function (x) { return x.estate === ctx.estate && x.date === date; });
    if (!s) return;
    var t = summaryText(s);
    ui().openSheet('<h2 id="sheet-title">' + EA.t('Ringkasan hari', 'Day summary') + '</h2><pre class="chit">' + esc(t) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="ds-back">‹ BACK<small>‹ BALIK</small></button>' +
      '<a class="btn" id="ds-wa" href="https://wa.me/?text=' + encodeURIComponent(t) + '" target="_blank" rel="noopener">WHATSAPP<small>Hantar ke kumpulan Ebook</small></a>' +
      '<button class="btn btn-ok" type="button" id="ds-copy">COPY<small>Salin</small></button></div>',
      function (sh) {
        sh.querySelector('#ds-back').onclick = ui().closeSheet;
        sh.querySelector('#ds-copy').onclick = function () { EA.fh.copyText(t); };
      });
  }

  // ---------- office answer kept on the phone ----------
  EA.fh.refreshDayClose = async function (estate) {
    if (!EA.sendLink() || !navigator.onLine) return null;
    var j = await EA.ask('dayclose', { estate: estate });
    if (j && Array.isArray(j.days)) { EA.local.set(K.office + estate, { at: Date.now(), from: j.from, days: j.days }); document.dispatchEvent(new CustomEvent('fh:dayclose')); }
    return j;
  };
  // A small band for the Kerja screen: the open days, and the button to close.
  EA.fh.dayCloseBand = function (estate, user) {
    if (!canClose(user)) return '';
    var keep = ctx; ctx = Object.assign({}, ctx || {}, { estate: estate });
    try {
      var open = openDays(estate), today = EA.today();
      var past = open.filter(function (o) { return o.date < today; });
      if (!open.length) return '';
      return '<p class="plan-band' + (past.length ? ' due' : '') + '" id="wk-dayclose"><b>' + (past.length ? EA.t('Hari ' + niceDate(past[0].date) + ' belum ditutup', 'Day ' + niceDate(past[0].date) + ' not closed') : EA.t('Hari ini belum ditutup', 'Today is not closed yet')) + '</b>' +
        '<span>' + EA.t('Selepas kerja dikunci, tekan TUTUP HARI. Tutup sebelum chit esok pagi.', 'After the work is keyed, press TUTUP HARI. Close before tomorrow\'s chit.') + '</span>' +
        '<a class="btn btn-ok" href="#field-harvest/close">TUTUP HARI<small>' + EA.t('Semak & kunci hari', 'Check & close the day') + '</small></a></p>';
    } finally { ctx = keep; }
  };

  EA.fh.dayclose = { render: render, summaryText: summaryText, checks: checks, rainCheck: rainCheck };
})();
