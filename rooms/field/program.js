// Field & Harvest: Rekod → PROGRAM · Rancangan vs sebenar (plan vs actual). Read only: nothing is keyed here.
// v1.49 (Yu Chen, 3 Nov 2026): one screen, three levels (replaces the six cards of v1.47).
//   Level 1 · Sugut hari ini — the worst block (red in most jobs), harvesters a day against the crop budget's need,
//             tonnes this month and this year against the budget. For the Owner and the Pengurus.
//   Level 2 · Ikut kerja — one card per job the estate focuses on: Tuai (harvest round), Membaja (manuring, the year's
//             last round), CPS (circle & path spray), Pokok terbiar (abandoned palms). In each, the blocks ranked worst
//             first, with Ha left, person-days and whether the gang is enough.
//   Level 3 · Ikut petak — tap a block under a job: only the lots that need action, as a block map (lot outlines from
//             lists/lot-shapes.js, red / amber / green) or a list ("4-03 · 23 hr · 118": days since harvest, bunches
//             last time). For the Staf bertugas, in the morning before the chit.
//   Then Disiplin harian — days closed, ramp with no fruit from an earlier day, work keyed the same day.
// Lot states come from the office in one call (program_): last harvest per lot and bunches, last CPS date per lot,
// manuring round done per lot (LIST_LOTSTART marked by Ferezelly on 5 Nov 2026, then the daily keying by lot).
// CPS rule (Yu Chen, 3 Nov 2026): the target is 4 rounds a year, about 90 days apart. 60 days is the earliest a lot may
// be sprayed again (under that the circle is still clean and the chemical is wasted), so a lot turns amber "boleh racun"
// at 60 days — which is what lets Sugut catch up this year — and red "lewat" past 120 days, a round missed. Harvest round: ready 10–15 days, late over 15 (lists/tasks.js lotRound).
// Tonnes stay at block level; a lot shows days and bunches only (exact numbers). Pruning, VOP spray and slashing are
// not ranked (old data, by block only); they show grey in the block's job table.
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};
  var KEY = 'fh.prog.';
  var open = {}, asking = {}, silent = false, oldOffice = false;
  // SEMAK PETAK (v1.49, Yu Chen 3 Nov 2026): the Staf bertugas ticks which lots have already had this round, so the
  // Nov–Dec outstanding list is real and 2027 can be planned per lot. tick[job.block] = { set: {lot: 'y'|'n'}, month }.
  var tick = {};
  var TICKABLE = { CPS: 1, MAN: 1 };
  var CPS_RULE = { target: 90, again: 60, late: 120 };   // target gap 90 days (4 rounds a year); earliest 60; late past 120
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
  function frac(v) { var w = Math.floor(v + 1e-9), p = Math.round((v - w) * 4); return (w || !p ? String(w) : '') + ['', '¼', '½', '¾'][p]; }
  function dot(c) { return '<span class="pg-dot ' + c + '" aria-hidden="true"></span>'; }
  function blockHa(estate, b) { var x = (EA.lists.blocksFor(estate) || []).find(function (k) { return k.block === b; }); return x ? x.ha : 0; }
  function palmsPerHa(estate, b) {
    var ha = 0, p = 0;
    (EA.lists.lotsFor(estate, b) || []).forEach(function (l) { ha += l.ha || 0; p += l.palms || 0; });
    return ha ? p / ha : 0;
  }
  function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
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
  // Working days (Monday–Saturday) after today to the month's end, or to a date.
  function daysLeft(m) { var today = EA.today(); return m === today.slice(0, 7) ? workDaysTo(today.slice(0, 8) + daysIn(m)) : 0; }
  function workDaysTo(end) {
    var today = EA.today(), n = 0, d = new Date(today + 'T00:00:00'), e = new Date(end + 'T00:00:00');
    for (d.setDate(d.getDate() + 1); d <= e; d.setDate(d.getDate() + 1)) { if (d.getDay() !== 0) n++; }
    return n;
  }
  function estName(estate) { var e = (EA.lists.estates || []).find(function (x) { return x.code === estate; }); return esc(e && (e.short || e.name) || estate); }
  function blocksOf(estate) { return (EA.lists.blocksFor(estate) || []).map(function (b) { return b.block; }).filter(function (b) { return !EA.lists.isDurian || !EA.lists.isDurian(estate, b); }); }

  // ---------- the numbers (rounds per job and block, as v1.47; still the base of the block table) ----------
  function calc(estate, month, data) {
    var prev = addMonths(month, -1), done = data.done || {}, out = { jobs: {}, now: {}, next: {} };
    function doneTo(code, b, upTo) { var s = 0; Object.keys(done).forEach(function (k) { var p = k.split('|'); if (p[0] === code && p[1] === b && p[2] <= upTo) s += done[k]; }); return s; }
    (data.programme || []).forEach(function (r) {
      var j = out.jobs[r.task] || (out.jobs[r.task] = { code: r.task, blocks: {}, total: 0 });
      var b = j.blocks[r.block] || (j.blocks[r.block] = { block: r.block, ha: r.ha || blockHa(estate, r.block), due: 0, all: 0, now: 0, nowHa: 0, nowLabel: '', dose: 0 });
      b.all++;
      if (r.month <= prev) b.due++;
      if (r.month === month) { b.now++; b.nowHa += r.ha; b.nowLabel = r.round; b.dose = r.dose; }
      if (r.month === addMonths(month, 1)) { var nx = out.next[r.task] || (out.next[r.task] = { ha: 0, label: r.round }); nx.ha += r.ha; }
    });
    Object.keys(out.jobs).forEach(function (code) {
      var j = out.jobs[code], ha = 0, dueHa = 0, past = 0, behind = 0, pd = 0, allN = 0;
      Object.keys(j.blocks).forEach(function (k) {
        var b = j.blocks[k], all = doneTo(code, k, month), thisM = done[code + '|' + k + '|' + month] || 0;
        b.doneNow = thisM;
        b.past = Math.max(0, all - Math.min(thisM, b.nowHa));
        b.doneAll = all;
        b.rounds = b.ha ? b.past / b.ha : 0;
        b.roundsAll = b.ha ? all / b.ha : 0;
        b.gap = b.rounds - b.due;
        b.behindHa = Math.max(0, b.due * b.ha - b.past);
        b.days = personDays(estate, code, b.behindHa, k, b.dose || lastDose(data, code, k, month));
        ha += b.ha; dueHa += b.due * b.ha; past += b.past; behind += b.behindHa; pd += b.days; allN = Math.max(allN, b.all);
      });
      j.due = ha ? Math.round(dueHa / ha * 100) / 100 : 0; j.rounds = ha ? Math.round(past / ha * 100) / 100 : 0; j.gap = j.rounds - j.due; j.behindHa = behind; j.days = pd; j.total = allN;
      j.hasTarget = code === 'MAN' ? !!EA.lists.manTarget : !!(EA.lists.target(code, estate) && EA.lists.target(code, estate).unit === 'Ha');
    });
    return out;
  }
  function lastDose(data, code, b, month) {
    var d = 0; (data.programme || []).forEach(function (r) { if (r.task === code && r.block === b && r.month <= month && r.dose) d = r.dose; });
    return d;
  }
  function tone(gap) { return gap <= -1 ? 'r' : gap < -0.05 ? 'a' : 'g'; }

  // ---------- lot states (level 3) ----------
  // Harvest: days since the lot was last harvested. g in round, a ready (10–15), r late (over 15), x no record.
  function harvestState(estate, data, l) {
    var r = EA.lists.lotRound.HA, d = data.lots && data.lots[l.lot], age = d ? daysBetween(d, EA.today()) : -1;
    var k = age < 0 ? 'x' : age > r.late ? 'r' : age >= r.ready ? 'a' : 'g';
    var b = data.lotJobs && data.lotJobs.bunches ? data.lotJobs.bunches[l.lot] : 0;
    return { k: k, age: age, bunches: b || 0, act: k === 'r' || k === 'x' || k === 'a' };
  }
  // Manuring: green when the lot's last round is keyed (or marked); otherwise grey — "no lot record yet", never red.
  // Before 21 Oct 2026 manuring was keyed by block only, so a lot with no record is unknown, not undone. The Ha left in
  // the block line still comes from the office's block figures, which are right either way.
  function manState(data, l) {
    var d = data.lotJobs && data.lotJobs.MAN ? data.lotJobs.MAN[l.lot] : '';
    return { k: d ? 'g' : 'x', date: d || '', act: !d };
  }
  // CPS: days since the lot's last spray. g under 60 (wait), a 60–120 (can spray), r over 120 or no record.
  function cpsState(data, l) {
    var d = data.lotJobs && data.lotJobs.CPS ? data.lotJobs.CPS[l.lot] : '', age = d ? daysBetween(d, EA.today()) : -1;
    var k = age < 0 ? 'x' : age > CPS_RULE.late ? 'r' : age >= CPS_RULE.again ? 'a' : 'g';
    return { k: k, age: age, date: d, act: k !== 'g' };
  }
  function noLotData(data) { return !data.lotJobs; }
  // The Staf bertugas ticks his own estate's lots; the Owner may too. Everyone else only looks (Yu Chen, 3 Nov 2026).
  function canTick(estate) {
    var u = EA.currentUser && EA.currentUser();
    return !!(u && (u.role === 'Staff' || u.role === 'Owner') && (u.estates || []).indexOf(estate) >= 0);
  }

  // ---------- level 3: the lots of one block, as a map or a list ----------
  function shapesFor(estate, block) {
    var all = EA.lists.lotShapes && EA.lists.lotShapes[estate]; if (!all) return null;
    var out = {}, n = 0;
    (EA.lists.lotsFor(estate, block) || []).forEach(function (l) { if (all[l.lot]) { out[l.lot] = all[l.lot]; n++; } });
    return n ? out : null;
  }
  function lotMap(estate, block, states, tickId) {
    var sh = shapesFor(estate, block); if (!sh) return '';
    var rings = [], lots = EA.lists.lotsFor(estate, block) || [];
    function each(lot, fn) { var g = sh[lot]; if (!g) return; (Array.isArray(g[0][0]) ? g : [g]).forEach(fn); }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, lat0 = lots.length ? lots[0].lat : 6, kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110574;
    lots.forEach(function (l) { each(l.lot, function (ring) { ring.forEach(function (p) { var x = p[0] * kx, y = -p[1] * ky; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }); }); });
    if (minX === Infinity) return '';
    var W = 360, s = W / (maxX - minX), H = Math.round((maxY - minY) * s) + 8;
    function X(lon) { return ((lon * kx - minX) * s + 4).toFixed(1); }
    function Y(lat) { return ((-lat * ky - minY) * s + 4).toFixed(1); }
    lots.forEach(function (l) {
      var st = states[l.lot]; if (!st) return;
      each(l.lot, function (ring) { rings.push('<path class="' + st.k + '"' + (tickId ? ' data-pglot="' + esc(tickId + '|' + l.lot) + '"' : '') + ' d="M' + ring.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join('L') + 'Z"><title>' + esc(l.lot + ' · ' + f2(l.ha) + ' Ha' + (st.text ? ' · ' + st.text : '')) + '</title></path>'); });
    });
    lots.forEach(function (l) { if (sh[l.lot] && l.lat) rings.push('<text x="' + X(l.lon) + '" y="' + Y(l.lat) + '">' + esc(l.lot.split('-')[1]) + '</text>'); });
    return '<svg class="pg-map' + (tickId ? ' pg-tap' : '') + '" viewBox="0 0 ' + (W + 8) + ' ' + H + '" role="img" aria-label="' + esc(EA.t('Peta Blk ', 'Map Blk ') + block) + '">' + rings.join('') + '</svg>';
  }
  function lotList(items, tickId) {
    return '<p class="pg-lots">' + items.map(function (x) {
      var inner = esc(x.lot) + (x.sub ? ' <small>' + esc(x.sub) + '</small>' : '');
      return tickId ? '<button type="button" class="' + x.k + '" data-pglot="' + esc(tickId + '|' + x.lot) + '" aria-pressed="' + (x.k === 'g') + '">' + inner + '</button>'
        : '<span class="' + x.k + '">' + inner + '</span>';
    }).join('') + '</p>';
  }
  // One block line under a job: tap to open its lots (map if shapes exist and PETA chosen, else list).
  function blockLine(estate, code, b, k, text, right, states, items, foot, allStates, canTick) {
    var id = code + '.' + b, on = !!open[id], hasMap = !!shapesFor(estate, b), map = hasMap && open['map.' + id] !== false;
    var t = tick[id], ticking = !!t;
    var h = '<button type="button" class="pg-bl" data-pg="' + esc(id) + '" aria-expanded="' + on + '">' + dot(k) + '<span>' + text + '</span><em>' + right + (items.length || ticking ? (on ? ' ‹' : ' ›') : '') + '</em></button>';
    if (!on || (!items.length && !ticking)) return h;
    // SEMAK PETAK: every lot of the block, coloured by what the tick would save (green done, grey not done).
    var shown = items, st = states;
    if (ticking) {
      st = {}; shown = [];
      (EA.lists.lotsFor(estate, b) || []).forEach(function (l) {
        var now = tickValue(id, l.lot, allStates);
        st[l.lot] = { k: now ? 'g' : 'x', text: now ? EA.t('siap', 'done') : EA.t('belum', 'not done') };
        shown.push({ lot: l.lot, k: st[l.lot].k, sub: f2(l.ha) + ' Ha' });
      });
    }
    h += '<div class="pg-lotbox' + (ticking ? ' pg-ticking' : '') + '">' +
      (ticking ? tickBar(estate, code, b, id) : '') +
      (hasMap && !ticking ? '<div class="seg pg-seg"><button type="button" data-pgmap="' + esc(id) + '" data-v="map" aria-pressed="' + map + '">' + EA.t('PETA', 'MAP') + '</button><button type="button" data-pgmap="' + esc(id) + '" data-v="list" aria-pressed="' + !map + '">' + EA.t('SENARAI', 'LIST') + '</button></div>' : '') +
      ((map || ticking) && hasMap ? lotMap(estate, b, st, ticking ? id : '') : lotList(shown, ticking ? id : '')) +
      (ticking ? '<p class="pg-note">' + EA.t('Tekan petak untuk tukar siap / belum. Hijau = sudah buat pusingan ini.', 'Tap a lot to switch done / not done. Green = this round is done.') + '</p>' : (foot ? '<p class="pg-note">' + foot + '</p>' : '')) +
      (canTick && !ticking ? '<button type="button" class="link-btn pg-more" data-pgtick="' + esc(id) + '">' + EA.t('SEMAK PETAK ›', 'CHECK LOTS ›') + '</button>' : '') +
      '</div>';
    return h;
  }
  // What the lot would be after the ticks so far: the staff's change if any, else what the records say.
  function tickValue(id, lot, allStates) {
    var t = tick[id];
    if (t && t.set[lot]) return t.set[lot] === 'y';
    var st = allStates && allStates[lot];
    return !!(st && st.k === 'g');
  }
  var MON_PICK = 4;   // how many months back the CPS "sprayed when" chooser offers
  function tickBar(estate, code, b, id) {
    var t = tick[id], n = 0, tot = (EA.lists.lotsFor(estate, b) || []).length;
    (EA.lists.lotsFor(estate, b) || []).forEach(function (l) { if (tickValue(id, l.lot, t.base)) n++; });
    var h = '<div class="pg-tickbar"><b>' + EA.t('Semak petak · Blk ', 'Check lots · Blk ') + esc(b) + '</b><span>' + n + ' / ' + tot + EA.t(' siap', ' done') + '</span></div>' +
      '<div class="seg pg-seg"><button type="button" data-pgall="' + esc(id) + '" data-v="y">' + EA.t('SEMUA SIAP', 'ALL DONE') + '</button><button type="button" data-pgall="' + esc(id) + '" data-v="n">' + EA.t('SEMUA BELUM', 'ALL NOT DONE') + '</button></div>';
    if (code === 'CPS') {
      var opts = [];
      for (var i = 0; i < MON_PICK; i++) { var m = addMonths(EA.today().slice(0, 7), -i); opts.push('<button type="button" data-pgmon="' + esc(id) + '" data-v="' + m + '" aria-pressed="' + (t.month === m) + '">' + mon(m) + '</button>'); }
      h += '<div class="pg-tickbar"><span>' + EA.t('Racun bila?', 'Sprayed when?') + '</span></div><div class="seg pg-seg">' + opts.join('') + '</div>';
    }
    return h + '<div class="pg-tickact"><button type="button" class="btn" data-pgsave="' + esc(id) + '">' + EA.t('SIMPAN', 'SAVE') + '</button><button type="button" class="link-btn" data-pgcancel="' + esc(id) + '">' + EA.t('BATAL', 'CANCEL') + '</button></div>';
  }
  function gangLine(code, pd, left, data, bm, en) {
    var g = data && data.gang && data.gang[code];
    if (!pd) return '';
    var t = '≈ ' + Math.ceil(pd) + EA.t(' orang-hari', ' person-days');
    if (g && left) { var need = Math.ceil(pd / g - 0.05), short = need - left, n = Math.round(g * 10) / 10; t += ' · ' + n + EA.t(' orang → ' + need + ' hari', ' people → ' + need + ' days') + ' · ' + (short > 0 ? '<b class="bad-text">' + EA.t('kurang ' + short + ' hari', short + ' short') + '</b>' : '<b class="ok-t">' + EA.t('cukup', 'enough') + '</b>'); }
    return t;
  }

  // ---------- level 2 cards ----------
  function harvestCard(estate, data, summary) {
    if (!data.lots) return '';
    var r = EA.lists.lotRound.HA, per = {}, states = {}, tot = { g: 0, a: 0, r: 0, x: 0 };
    blocksOf(estate).forEach(function (b) { per[b] = { b: b, late: 0, none: 0, ready: 0, bunches: 0, items: [] }; });
    (EA.lists.lotsFor(estate) || []).forEach(function (l) {
      var st = harvestState(estate, data, l), p = per[l.block]; if (!p) return;
      tot[st.k]++;
      st.text = (st.age < 0 ? EA.t('tiada rekod', 'no record') : st.age + EA.t(' hr', ' d')) + (st.bunches ? ' · ' + st.bunches : '');
      states[l.lot] = st;
      if (st.k === 'r') { p.late++; p.bunches += st.bunches; }
      if (st.k === 'x') p.none++;
      if (st.k === 'a') p.ready++;
      if (st.act) p.items.push({ lot: l.lot, k: st.k, age: st.age, sub: st.text });
    });
    var bl = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.late - a.late || b.none - a.none || b.ready - a.ready || (a.b < b.b ? -1 : 1); });
    var rank = { r: 0, x: 1, a: 2, g: 3 };
    bl.forEach(function (p) { p.items.sort(function (a, b) { return rank[a.k] - rank[b.k] || b.age - a.age; }); summary[p.b].red += p.late ? 1 : 0; });
    var mt = EA.lists.harvestMtDay || 1.5, lines = bl.map(function (p) {
      var k = p.late ? 'r' : p.none || p.ready ? 'a' : 'g';
      var text = 'Blk ' + p.b + ' · ' + (p.late ? p.late + EA.t(' petak lewat', ' lots late') : p.ready ? p.ready + EA.t(' petak sedia', ' lots ready') : p.none ? '' : EA.t('dalam pusingan', 'in round')) +
        (p.none ? (p.late ? ' · ' : '') + p.none + EA.t(' tiada rekod', ' no record') : '');
      var right = p.late && p.bunches ? '±' + n0(p.bunches) + EA.t(' tandan', ' bunches') : '';
      var foot = p.late && p.bunches ? EA.t('±' + n0(p.bunches) + ' tandan menunggu', '±' + n0(p.bunches) + ' bunches waiting') + (EA.lists.abwKg ? ' ≈ ' + Math.ceil(p.bunches * EA.lists.abwKg / 1000 / mt) + EA.t(' penuai-hari', ' harvester-days') : '') : '';
      return blockLine(estate, 'HA', p.b, k, text, right, states, p.items, foot);
    });
    return '<div class="card pg-card"><h2>' + EA.t('Tuai · pusingan', 'Harvest · round') + '<small>' + (tot.g + tot.a + tot.r + tot.x) + EA.t(' petak · hari sejak tuai · tandan kali lepas · lewat = lebih ' + r.late + ' hari', ' lots · days since harvest · bunches last time · late = over ' + r.late + ' days') + '</small></h2>' + lines.join('') + '</div>';
  }
  function manCard(estate, month, cal, data, summary) {
    var j = cal.jobs.MAN; if (!j) return '';
    var rounds = j.total, per = {}, states = {}, rest = 0, pd = 0, left = daysLeft(month), bagKg = EA.lists.bagKg || 50;
    blocksOf(estate).forEach(function (b) { per[b] = { b: b, ha: 0, items: [], pd: 0 }; });
    (EA.lists.lotsFor(estate) || []).forEach(function (l) {
      var st = manState(data, l), p = per[l.block]; if (!p) return;
      states[l.lot] = st;
      if (!st.act) return;
      var dose = lastDose(data, 'MAN', l.block, month) || 2.5, bags = Math.round((l.palms || 0) * dose / bagKg);
      st.text = f2(l.ha) + ' Ha · ' + bags + EA.t(' beg', ' bags');
      p.ha += l.ha || 0; p.items.push({ lot: l.lot, k: 'x', sub: f2(l.ha) + ' · ' + bags });
    });
    // The Ha still to do comes from the office's block figures (programme Ha for the year less the Ha done): that is the
    // accounting truth and it matches the estate status report. The lots only say WHICH ones, and until they are all
    // ticked the lot sum is larger. Both are shown, so a real gap between them is visible instead of hidden.
    Object.keys(per).forEach(function (b) {
      var p = per[b], x = j.blocks[b];
      p.lotHa = p.ha;
      p.ha = x ? Math.max(0, Math.round((x.all * x.ha - x.doneAll) * 100) / 100) : p.lotHa;
      p.unknown = (EA.lists.lotsFor(estate, b) || []).filter(function (l) { return !(states[l.lot] && states[l.lot].k === 'g'); }).length;
      p.pd = personDays(estate, 'MAN', p.ha, b, lastDose(data, 'MAN', b, month) || 2.5); rest += p.ha; pd += p.pd; if (p.ha > 0.05) summary[b].red++;
    });
    var bl = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.ha - a.ha || (a.b < b.b ? -1 : 1); });
    var lines = bl.map(function (p) {
      var k = p.ha > 0.05 ? (p.ha > blockHa(estate, p.b) * 0.5 ? 'r' : 'a') : 'g';
      var gap = p.lotHa - p.ha, note = p.ha > 0.05
        ? EA.t('kelabu = belum ada rekod petak · hijau = sudah dibaja · Ha · beg', 'grey = no lot record yet · green = manured · Ha · bags') +
          (p.unknown ? '<br>' + EA.t(p.unknown + ' petak belum ditanda (' + f1(p.lotHa) + ' Ha). Rekod blok kata ' + f1(p.ha) + ' Ha lagi — tekan SEMAK PETAK untuk tanda petak mana sudah siap.',
                                     p.unknown + ' lots not ticked yet (' + f1(p.lotHa) + ' Ha). The block record says ' + f1(p.ha) + ' Ha left — tap CHECK LOTS to mark which are done.') : '')
        : '';
      return blockLine(estate, 'MAN', p.b, k, 'Blk ' + p.b + ' · ' + (p.ha > 0.05 ? f1(p.ha) + EA.t(' Ha lagi', ' Ha left') : EA.t('siap', 'done')), p.pd ? '≈ ' + Math.ceil(p.pd) + EA.t(' o-h', ' p-d') : '', states, p.items, note, states, canTick(estate));
    });
    var nodata = noLotData(data) ? '<p class="pg-note">' + EA.t('Peta petak terisi sendiri apabila kerja dikunci ikut petak. Jumlah Ha di atas sudah betul.', 'The lot map fills itself as work is keyed by lot. The Ha above are already right.') + '</p>' : '';
    return '<div class="card pg-card"><h2>' + EA.t('Membaja · pusingan ', 'Manuring · round ') + rounds + '<small>' + f1(rest) + EA.t(' Ha lagi ikut rekod blok · siap sebelum hujan lebat', ' Ha left by the block record · finish before the heavy rain') + '</small></h2>' + lines.join('') +
      (rest > 0.05 ? '<p class="pg-note">' + gangLine('MAN', pd, left, data) + (left ? ' · ' + EA.t('tinggal ' + left + ' hari kerja bulan ini', left + ' working days left this month') : '') + '</p>' : '<p class="pg-note ok-t">' + EA.t('Semua petak siap untuk tahun ini.', 'Every lot is done for the year.') + '</p>') + nodata + '</div>';
  }
  function cpsCard(estate, month, cal, data, summary) {
    var per = {}, states = {}, left = daysLeft(month), nowHa = 0, pd = 0, rounds = (cal.jobs.CPS && cal.jobs.CPS.total) || EA.lists.roundPlanFor(estate, 'CPS') || 4;
    blocksOf(estate).forEach(function (b) { per[b] = { b: b, can: 0, late: 0, wait: 0, items: [], lastDate: '', nextDate: '' }; });
    (EA.lists.lotsFor(estate) || []).forEach(function (l) {
      var st = cpsState(data, l), p = per[l.block]; if (!p) return;
      states[l.lot] = st;
      st.text = st.age < 0 ? EA.t('tiada rekod', 'no record') : st.age + EA.t(' hr', ' d');
      if (st.k === 'g') { p.wait += l.ha || 0; if (st.date && (!p.nextDate || st.date < p.nextDate)) p.nextDate = st.date; }
      else { p.can += l.ha || 0; if (st.k === 'r' || st.k === 'x') p.late += l.ha || 0; p.items.push({ lot: l.lot, k: st.k, age: st.age, sub: st.text }); }
      if (st.date > p.lastDate) p.lastDate = st.date;
    });
    Object.keys(per).forEach(function (b) { var p = per[b]; p.items.sort(function (a, c) { return (c.age < 0 ? 999 : c.age) - (a.age < 0 ? 999 : a.age); }); p.pd = personDays(estate, 'CPS', p.can, b); nowHa += p.can; pd += p.pd; if (p.late > blockHa(estate, b) * 0.5) summary[b].red++; });
    var bl = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.late - a.late || b.can - a.can || (a.b < b.b ? -1 : 1); });
    var lines = bl.map(function (p) {
      var k = p.late > 0.05 ? 'r' : p.can > 0.05 ? 'a' : 'g', text, right = p.pd ? '≈ ' + Math.ceil(p.pd) + EA.t(' o-h', ' p-d') : '';
      if (p.can > 0.05) text = 'Blk ' + p.b + ' · ' + EA.t('boleh racun ', 'can spray ') + f1(p.can) + ' Ha';
      else { var nx = p.nextDate ? new Date(p.nextDate + 'T00:00:00') : null; if (nx) nx.setDate(nx.getDate() + CPS_RULE.again); text = 'Blk ' + p.b + ' · ' + EA.t('tunggu', 'wait') + (nx ? ' · ' + EA.t('boleh dari ', 'from ') + dm(ym(nx) + '-' + String(nx.getDate()).padStart(2, '0')) : ''); right = ''; }
      return blockLine(estate, 'CPS', p.b, k, text, right, states, p.items, p.can > 0.05 ? EA.t('hari sejak racun · kuning = boleh racun (' + CPS_RULE.again + ' hari ke atas) · merah = lewat (' + CPS_RULE.late + ' hari) atau tiada rekod', 'days since spray · amber = may spray (' + CPS_RULE.again + ' days or more) · red = late (' + CPS_RULE.late + ' days) or no record') : '', states, canTick(estate));
    });
    var nodata = noLotData(data) ? '<p class="pg-note">' + EA.t('Peta petak terisi sendiri apabila kerja dikunci ikut petak. Jumlah Ha di atas sudah betul.', 'The lot map fills itself as work is keyed by lot. The Ha above are already right.') + '</p>' : '';
    return '<div class="card pg-card"><h2>' + EA.t('CPS · racun bulatan', 'CPS · circle spray') + '<small>' + EA.t('sasaran ' + rounds + ' pusingan setahun (±' + CPS_RULE.target + ' hari) · paling awal ' + CPS_RULE.again + ' hari selepas racun lepas', 'target ' + rounds + ' rounds a year (±' + CPS_RULE.target + ' days) · at the earliest ' + CPS_RULE.again + ' days after the last spray') + '</small></h2>' + lines.join('') +
      (nowHa > 0.05 ? '<p class="pg-note">' + EA.t('Boleh racun sekarang ', 'Can spray now ') + f1(nowHa) + ' Ha · ' + gangLine('CPS', pd, left, data) + '</p>' : '') + nodata + '</div>';
  }
  function apCard(estate, data) {
    var ye = EA.lists.yearEnd && EA.lists.yearEnd[estate], ap = ye && ye.ap; if (!ap || !data.ap) return '';
    var done = Number(data.ap.done) || 0, left = Math.max(0, ap.open - done), wd = workDaysTo(ap.by), per = wd ? Math.ceil(left / wd) : left;
    return '<div class="card pg-card"><h2>' + EA.t('Pokok terbiar', 'Abandoned palms') + '<small>' + EA.t('siapkan semua hingga ', 'finish all by ') + dm(ap.by) + '</small></h2>' +
      '<div class="pg-kv"><span>' + EA.t('Baki pada ', 'Left on ') + dm(ap.at) + '</span><b>' + n0(ap.open) + '</b><span>' + EA.t('Siap sejak itu', 'Done since') + '</span><b>' + n0(done) + '</b>' +
      '<span>' + EA.t('Baki', 'Left') + '</span><b class="' + (left ? 'bad-text' : 'ok-t') + '">' + n0(left) + EA.t(' pokok', ' palms') + '</b>' +
      (left ? '<span>' + EA.t('Perlu sehari (' + wd + ' hari kerja)', 'Needed a day (' + wd + ' working days)') + '</span><b>' + per + EA.t(' pokok', ' palms') + '</b>' : '') + '</div>' +
      '<p class="pg-note">' + EA.t('Ikut blok: bila baki dipecah ikut blok.', 'By block: once the balance is split by block.') + '</p></div>';
  }

  // ---------- level 1 ----------
  function topCard(estate, month, cal, data, summary) {
    var c = (data.crop || []).find(function (x) { return x.month === month; }) || {}, today = EA.today(), cur = month === today.slice(0, 7);
    var bl = Object.keys(summary).sort(function (a, b) { return summary[b].red - summary[a].red || (a < b ? -1 : 1); }), worst = bl[0], jobsN = summary[worst] ? summary[worst].n : 0;
    var g = data.gang && data.gang.HA, mt = EA.lists.harvestMtDay || 1.5, days = c.days || 26, need = c.budget ? Math.ceil(c.budget / days / mt) : 0;
    var ws = cur ? EA.fh.workShare(month) : { frac: 1, done: 0, total: 0 }, due = (c.budget || 0) * ws.frac, pct = due ? Math.round((c.mt || 0) / due * 100) : 0;
    var yb = 0, ymt = 0; (data.crop || []).forEach(function (x) { if (x.month < month) { yb += x.budget; ymt += x.mt; } }); yb += due; ymt += c.mt || 0;
    var big = '<div class="pg-big">' +
      (worst ? '<div><b class="' + (summary[worst].red ? 'bad-text' : 'ok-t') + '">Blk ' + esc(worst) + '</b><span>' + (summary[worst].red ? EA.t('paling teruk: merah ' + summary[worst].red + ' / ' + jobsN + ' kerja', 'worst: red in ' + summary[worst].red + ' of ' + jobsN + ' jobs') : EA.t('tiada blok merah', 'no block red')) + '</span></div>' : '') +
      (cur && need ? '<div><b class="' + (g && g >= need ? 'ok-t' : 'bad-text') + '">' + (g ? Math.round(g * 10) / 10 : '—') + '</b><span>' + EA.t('penuai sehari · perlu ' + need, 'harvesters a day · need ' + need) + '</span></div>' : '') + '</div>';
    var kv = c.budget ? '<div class="pg-kv">' +
      '<span>' + mon(month) + ': ' + (cur ? EA.t('patut hingga ', 'due by ') + dm(today) + ' (' + ws.done + EA.t(' hari)', ' days)') : EA.t('bajet bulan', 'month budget')) + '</span><b>' + f1(due) + ' MT</b>' +
      '<span>' + EA.t('Sebenar (tiket kilang)', 'Actual (mill tickets)') + '</span><b class="' + (pct >= 100 ? 'ok-t' : pct >= 85 ? 'wait-t' : 'bad-text') + '">' + f1(c.mt || 0) + ' MT · ' + pct + '%</b>' +
      '<span>' + EA.t('Tahun (Jan–', 'Year (Jan–') + mon(month) + ')</span><b>' + n0(ymt) + ' / ' + n0(yb) + ' MT · ' + (yb ? Math.round(ymt / yb * 100) : 0) + '%</b></div>' +
      '<div class="pg-bar"><i class="' + (pct >= 100 ? '' : pct >= 85 ? 'w' : 'b') + '" style="width:' + Math.min(100, c.budget ? (c.mt || 0) / c.budget * 100 : 0) + '%"></i><em style="left:' + Math.min(100, due / c.budget * 100) + '%"></em></div>'
      : '<p class="hint">' + EA.t('Bajet bulan ini belum dimuat di pejabat.', 'This month\'s budget is not loaded in the office yet.') + '</p>';
    var on = !!open.blocks;
    return '<div class="card pg-card">' + big + kv +
      '<button type="button" class="link-btn pg-more" data-pg="blocks" aria-expanded="' + on + '">' + (on ? EA.t('TUTUP SEMUA KERJA', 'HIDE ALL JOBS') : EA.t('SEMUA KERJA IKUT BLOK ›', 'ALL JOBS BY BLOCK ›')) + '</button>' +
      (on ? blockTable(estate, month, cal) : '') + '</div>';
  }
  // Every programme job per block: rounds done / due to the end of last month. Old-data jobs grey.
  var RANKED = ['HA', 'MAN', 'CPS'], ORDER = ['CPS', 'MAN', 'RP', 'SL', 'DEC', 'VOPS'];
  function blockTable(estate, month, cal) {
    var prev = addMonths(month, -1), codes = Object.keys(cal.jobs).sort(function (a, b) { var x = ORDER.indexOf(a), y = ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || (a < b ? -1 : 1); });
    if (!codes.length) return '<p class="hint">' + EA.t('Program tahun ini belum dimuat di pejabat.', 'This year\'s programme is not loaded in the office yet.') + '</p>';
    return blocksOf(estate).map(function (b) {
      return '<table class="pg-t pg-bt"><tr><th>Blk ' + esc(b) + ' <small>' + f2(blockHa(estate, b)) + ' Ha</small></th><th>' + EA.t('Siap', 'Done') + '</th><th>' + EA.t('Patut', 'Due') + '</th><th>' + EA.t('Tahun', 'Year') + '</th><th></th></tr>' +
        codes.map(function (c) {
          var j = cal.jobs[c], x = j.blocks[b]; if (!x) return '';
          var old = RANKED.indexOf(c) < 0, t = tone(x.gap);
          return '<tr class="' + (old ? 'pg-old' : '') + '"><td>' + esc(job(c)) + ' <small>' + esc(c) + (old ? ' · ' + EA.t('data lama', 'old data') : '') + '</small></td><td>' + f1(x.rounds) + '</td><td>' + x.due + '</td><td>' + x.all + '</td><td class="st">' + dot(old ? 'x' : t) + '</td></tr>';
        }).join('') + '</table>';
    }).join('') + '<p class="pg-note">' + EA.t('Pusingan hingga akhir ' + mon(prev) + '. Merah = satu pusingan atau lebih di belakang. Cantas, VOP dan tebas: rekod lama ikut blok, tidak disusun.', 'Rounds to the end of ' + mon(prev) + '. Red = a round or more behind. Pruning, VOP and slashing: old block records, not ranked.') + '</p>';
  }
  function daysCard(month, data) {
    var d = data.days || [], judged = d.filter(function (x) { return x.closed; }), closed = judged.filter(function (x) { return x.closed === 'Y'; }).length;
    if (!d.length) return '<div class="card"><p class="hint">' + EA.t('Tiada hari dengan chit lagi bulan ini.', 'No day with a chit yet this month.') + '</p></div>';
    var ramp = d.filter(function (x) { return x.ramp; }).length, same = d.filter(function (x) { return x.same; }).length;
    var rainDays = (data.rain || []).reduce(function (a, x) { return a + x.lost; }, 0);
    function line(bm, en, a, b) { return '<span>' + EA.t(bm, en) + '</span><b class="' + (a < b ? 'wait-t' : 'ok-t') + '">' + a + ' / ' + b + EA.t(' hari', ' days') + '</b>'; }
    return '<div class="card pg-card"><div class="pg-kv">' +
      (judged.length ? line('Hari ditutup (TUTUP HARI)', 'Days closed (TUTUP HARI)', closed, judged.length) : '<span>' + EA.t('Hari ditutup (TUTUP HARI)', 'Days closed (TUTUP HARI)') + '</span><b>' + (data.from ? EA.t('mula ', 'from ') + dm(data.from) : '—') + '</b>') +
      line('BTS di ramp kurang 24 jam', 'FFB on the ramp under 24 hours', ramp, d.length) +
      line('Kerja dikunci hari yang sama', 'Work keyed the same day', same, d.length) +
      (rainDays ? '<span>' + EA.t('Hujan: hari hilang', 'Rain: days lost') + '</span><b>' + frac(rainDays) + '</b>' : '') + '</div>' +
      '<p class="pg-note">' + EA.t('Dikira hingga semalam. Hari ini dinilai esok.', 'Counted to yesterday. Today is judged tomorrow.') + '</p></div>';
  }

  function html(estate, month) {
    var data = EA.local.get(KEY + estate + '.' + month, null);
    if (!data && oldOffice) return '<div class="card"><p class="hint">' + EA.t('Pejabat belum ada laporan ini. Pemilik perlu kemas kini skrip pejabat (versi baru).', 'The office does not have this report yet. The Owner needs to update the office script (new version).') + '</p></div>';
    if (!data) return '<div class="card"><p class="hint">' + (EA.sendLink() && navigator.onLine ? EA.t('Memuat dari pejabat…', 'Loading from the office…') : EA.t('Perlu isyarat untuk muat dari pejabat.', 'Needs signal to load from the office.')) + '</p></div>';
    var cal = calc(estate, month, data), cur = month === EA.today().slice(0, 7), summary = {};
    blocksOf(estate).forEach(function (b) { summary[b] = { red: 0, n: 0 }; });
    function lab(bm, en, who) { return '<div class="pg-lab">' + EA.t(bm, en) + (who ? '<i>' + EA.t(who[0], who[1]) + '</i>' : '') + '</div>'; }
    var jobs = '';
    if (cur) {
      var h = harvestCard(estate, data, summary), m = manCard(estate, month, cal, data, summary), c = cpsCard(estate, month, cal, data, summary);
      Object.keys(summary).forEach(function (b) { summary[b].n = (h ? 1 : 0) + (m ? 1 : 0) + (c ? 1 : 0); });
      jobs = h + m + c + apCard(estate, data);
    }
    return lab('Aras 1 · ' + estName(estate) + ' hari ini', 'Level 1 · ' + estName(estate) + ' today', ['Pemilik · Pengurus', 'Owner · Manager']) + topCard(estate, month, cal, data, summary) +
      (cur ? lab('Aras 2 · Ikut kerja · tekan blok untuk petak', 'Level 2 · By job · tap a block for its lots', ['semua', 'everyone']) + jobs : '<p class="hint">' + EA.t('Bulan lepas: hasil dan pusingan sahaja. Petak hanya untuk bulan ini.', 'A past month: crop and rounds only. Lots are for the current month.') + '</p>') +
      lab('Disiplin harian', 'Daily keying') + daysCard(month, data) +
      '<p class="hint">' + EA.t('Lihat sahaja. Rancangan dari bajet di pejabat; siap dari kerja yang dikunci ikut petak · dikemas kini ', 'View only. Plan from the budget in the office; done from the work keyed by lot · updated ') + esc(data.at || '') + '</p>';
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
    box.querySelectorAll('[data-pgmap]').forEach(function (b) { b.onclick = function () { open['map.' + b.dataset.pgmap] = b.dataset.v === 'map'; quietly(redraw); }; });
    // SEMAK PETAK
    box.querySelectorAll('[data-pgtick]').forEach(function (b) { b.onclick = function () {
      var id = b.dataset.pgtick, data = EA.local.get(KEY + ctx.estate + '.' + month, null) || {};
      tick[id] = { set: {}, month: EA.today().slice(0, 7), base: baseStates(ctx.estate, id, data) };
      quietly(redraw);
    }; });
    box.querySelectorAll('[data-pglot]').forEach(function (b) { b.onclick = function () {
      var p = b.dataset.pglot.split('|'), id = p[0], lot = p[1], t = tick[id]; if (!t) return;
      t.set[lot] = tickValue(id, lot, t.base) ? 'n' : 'y';
      quietly(redraw);
    }; });
    box.querySelectorAll('[data-pgall]').forEach(function (b) { b.onclick = function () {
      var id = b.dataset.pgall, t = tick[id]; if (!t) return;
      (EA.lists.lotsFor(ctx.estate, id.split('.')[1]) || []).forEach(function (l) { t.set[l.lot] = b.dataset.v; });
      quietly(redraw);
    }; });
    box.querySelectorAll('[data-pgmon]').forEach(function (b) { b.onclick = function () { var t = tick[b.dataset.pgmon]; if (t) { t.month = b.dataset.v; quietly(redraw); } }; });
    box.querySelectorAll('[data-pgcancel]').forEach(function (b) { b.onclick = function () { delete tick[b.dataset.pgcancel]; quietly(redraw); }; });
    box.querySelectorAll('[data-pgsave]').forEach(function (b) { b.onclick = function () { saveTicks(ctx, month, b.dataset.pgsave, redraw); }; });
    if (!silent) refresh(ctx.estate, month, redraw);
  }
  // What the records say today, before any tick, for every lot of the block.
  function baseStates(estate, id, data) {
    var code = id.split('.')[0], b = id.split('.')[1], out = {};
    (EA.lists.lotsFor(estate, b) || []).forEach(function (l) { out[l.lot] = code === 'CPS' ? cpsState(data, l) : manState(data, l); });
    return out;
  }
  // Save only the lots the staff actually changed: one row each, nothing deleted. done_on empty = not done.
  function saveTicks(ctx, month, id, redraw) {
    var t = tick[id]; if (!t) return;
    var code = id.split('.')[0], b = id.split('.')[1], estate = ctx.estate;
    var key = KEY + estate + '.' + month, data = EA.local.get(key, null) || {};
    var when = code === 'CPS' ? lastDayOf(t.month) : EA.today(), n = 0;
    try {
      Object.keys(t.set).forEach(function (lot) {
        var want = t.set[lot] === 'y', had = !!(t.base[lot] && t.base[lot].k === 'g');
        if (want === had) return;
        EA.save('LIST_LOTSTART', 'FH', estate, { task_code: code, block: b, lot: lot, done_on: want ? when : '', round: '', note: EA.t('Semak petak', 'Lot check') });
        if (data.lotJobs && data.lotJobs[code]) { if (want) data.lotJobs[code][lot] = when; else delete data.lotJobs[code][lot]; }
        n++;
      });
    } catch (e) { EA.ui.toast(EA.t('Tidak dapat simpan: ', 'Could not save: ') + e.message); return; }
    if (data.lotJobs) EA.local.set(key, data);
    delete tick[id];
    EA.ui.toast(n ? EA.t(n + ' petak disimpan', n + ' lots saved') : EA.t('Tiada perubahan', 'No change'));
    quietly(redraw);
  }
  function lastDayOf(m) { var x = new Date(m + '-01T00:00:00'), e = daysIn(m), today = EA.today(); var d = m + '-' + String(e).padStart(2, '0'); return d > today ? today : d; }
  EA.fh.program = { html: html, wire: wire, calc: calc, refresh: refresh, states: { harvest: harvestState, man: manState, cps: cpsState }, CPS_RULE: CPS_RULE };
})();
