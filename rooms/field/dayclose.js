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
    out.push(rainCheck(jobs, d, w));
    // 6 · records keyed (waiting ones go with the close)
    var ids = lines.map(function (l) { return l.id; }).concat(jobs.map(function (j) { return j.id; })).filter(Boolean);
    var waiting = ids.filter(function (i) { return EA.isWaiting(i); }).length;
    out.push({ n: 6, ok: true, bm: waiting ? waiting + ' rekod menunggu · dihantar bersama penutupan' : 'Semua rekod dihantar', en: waiting ? waiting + ' records waiting · sent with the close' : 'All records sent', sub: '', soft: true });
    return out;
  }
  // Which jobs fell short today (BELUM SIAP, or a flag such as under target).
  function shortJobs(jobs) { return jobs.filter(function (j) { return j.status === 'not_done' || /sasaran|target|kurang|under/i.test(String(j.flags || '')); }); }
  // v1.45 (Yu Chen, 27 Oct): rain is told on each lot in Kerja (Hujan → what kind, ¼–1 day). Read it from the saved work.
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
    var f = $('#dc-field'); if (f) { f.oninput = function () { d.fieldNote = f.value; keepDraft(day.date, d); }; f.onchange = function () { render(el, ctx); }; }
    var n = $('#dc-note'); if (n) n.oninput = function () { d.note = n.value; keepDraft(day.date, d); };
    var cb = $('#dc-close'); if (cb) cb.onclick = function () { var dt = day.chit.date, ok = closeChit(ctx.estate, ctx.user, day.chit, d, {}); render(el, ctx); if (ok) showSummary(dt); };
    el.querySelectorAll('[data-sum]').forEach(function (b) { b.onclick = function () { showSummary(b.dataset.sum); }; });
  }

  // ---------- closing ----------
  // One close, used by the screen, by the question at the end of a save, and by the morning self-close.
  // opts.auto: closed by the app at the next chit because the day was complete (closed_by stays the staff's code).
  function closeChit(estate, user, c, d, opts) {
    d = d || {}; opts = opts || {};
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
        lorries: String(lorries), note: note }, old && old.reopened ? old.id : '');
    } catch (e) { if (!opts.auto) ui().toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message, 'bad'); return null; }
    var s = { id: rec.id, estate: estate, date: c.date, chit: c.chit, at: at.slice(11), by: user.code, byName: user.name, present: present, total: total, bunches: bunches, auto: !!opts.auto,
      jobsDone: jobs.filter(function (j) { return j.status === 'done'; }).length, jobs: jobs.length, lorries: lorries, rain: keepRain ? rainLabel(rain) + ' · ' + lostLabel(rain.lost) : '', rainJobs: keepRain ? rain.jobs : [],
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
      return { state: bad.length ? 'missing' : 'ready', chit: o.chit, d: d, checks: ck, bad: bad, reopened: o.reopened };
    } finally { ctx = keep; }
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
    L.push('Ditutup: ' + (s.byName || s.by) + ' · ' + s.at + (s.auto ? ' (oleh app, hari lengkap)' : ''));
    L.push('E-Book ' + s.chit);
    return L.join('\n');
  }
  function showSummary(date, estate) {
    estate = estate || (ctx && ctx.estate);
    var s = closes().find(function (x) { return x.estate === estate && x.date === date; });
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
  // v1.45 (Yu Chen, 27 Oct): no separate daily step. The band on Kerja shows only a day the clerk reopened for a fix.
  EA.fh.dayCloseBand = function (estate, user) {
    if (!canClose(user)) return '';
    var keep = ctx; ctx = Object.assign({}, ctx || {}, { estate: estate });
    try {
      var re = openDays(estate).filter(function (o) { return o.reopened; });
      if (!re.length) return '';
      return '<p class="plan-band due" id="wk-dayclose"><b>' + EA.t('Hari ' + niceDate(re[0].date) + ' dibuka semula', 'Day ' + niceDate(re[0].date) + ' reopened') + '</b>' +
        '<span>' + EA.t('Kerani minta pembetulan. Selepas dibetulkan, tutup hari itu semula.', 'The clerk asked for a fix. After fixing, close that day again.') + '</span>' +
        '<a class="btn btn-ok" href="#field-harvest/close">TUTUP HARI<small>' + EA.t('Semak & tutup semula', 'Check & close again') + '</small></a></p>';
    } finally { ctx = keep; }
  };

  // v1.45: the close at the end of a save. Kerja's report sheet carries this block: when the day is complete it asks
  // "Semua lengkap. Tutup hari ini?" (YA, TUTUP / NANTI); when something is still missing it lists it softly with a
  // button to the screen that fixes it (often the lorry, keyed after the work).
  EA.fh.closeBlock = function (estate, user, date) {
    var st = closeState(estate, user, date);
    if (st.state === 'none') return null;
    var html;
    if (st.state === 'ready') html = '<div class="dc-ask" id="dc-ask"><b>✓ ' + EA.t('Semua lengkap. Tutup hari ' + niceDate(date) + '?', 'All complete. Close ' + niceDate(date) + '?') + '</b>' +
      '<small>' + EA.t('Selepas ditutup, hari ini hanya diubah melalui MINTA BETULKAN CHIT (kerani).', 'After closing, changes only through MINTA BETULKAN CHIT (the clerk).') + '</small>' +
      '<div class="actions"><button type="button" class="btn btn-ghost" id="dc-later">NANTI<small>' + EA.t('Ada lagi untuk dikunci', 'More to key') + '</small></button>' +
      '<button type="button" class="btn btn-ok" id="dc-yes">YA, TUTUP<small>' + EA.t('Tutup hari', 'Close the day') + '</small></button></div></div>';
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

  EA.fh.dayclose = { render: render, summaryText: summaryText, checks: checks, rainCheck: rainCheck, rainFromWork: rainFromWork, closeChit: closeChit, closeState: closeState };
})();
