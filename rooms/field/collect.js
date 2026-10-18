// Field & Harvest room — screen 3: collect & dispatch (Kutip & hantar).
// Keyed by the tractor driver and loader pair (on their own phone, role Worker,
// or on the staff's phone): bunches collected from each lot to the ramp, lots
// cleared, and what left the ramp on the lorry to the mill.
// The office compares this with the harvesters' bunches to work out the backlog
// left in the field and at the ramp; it shows on the next morning's chit.
// Each save adds to the day (several trips a day are fine). Nothing is deleted.
// v19: on the delivery note the staff ticks the lots that go on the lorry (all of a lot or
// part of it). What is not ticked stays as the block's balance. The clerk's mill ticket then
// takes its lots from this delivery note. A delivery note can be corrected until it has a ticket.
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};

  var TAB = 'FH_COLLECT', ROOM = 'FH';   // the delivery note's rows are written by EA.fh.harvest.writeDn
  var K = { draft: 'fh.collectdraft', saved: 'fh.collect' };

  var el, ctx, draft;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }

  function saved() { var cut = new Date(); cut.setDate(cut.getDate() - 40); var from = cut.toISOString().slice(0, 10); return EA.local.get(K.saved, []).filter(function (s) { return s.date >= from; }); }
  function todays() { return saved().filter(function (s) { return s.estate === ctx.estate && s.date === EA.today(); }); }
  function blank() { return { date: EA.today(), estate: ctx.estate, tractor: '', loader: '', lots: {}, extra: [], dispatch: blankDis() }; }
  function blankDis() { return { sel: {}, extra: {}, lorry: '', mill: EA.lists.mills[0], dn: '', driver: '', ramp_cleared: '', replacing: '' }; }
  function sumOf(o) { return Object.keys(o || {}).reduce(function (a, b) { return a + num(o[b]); }, 0); }
  function disTotal(d) { return sumOf(d.sel) + sumOf(d.extra); }
  function loadDraft() {
    var all = EA.local.get(K.draft, {}), d = all[ctx.estate];
    if (!d || d.date !== EA.today()) {
      d = blank();
      var last = saved().filter(function (s) { return s.estate === ctx.estate; }).pop();   // the pair is usually the same
      if (last) { d.tractor = last.tractor; d.loader = last.loader; }
    }
    var bd = blankDis();
    if (!d.dispatch.extra) d.dispatch.extra = d.dispatch.blocks || {};    // a draft from before v19: block bunches by hand
    delete d.dispatch.blocks;
    Object.keys(bd).forEach(function (k) { if (d.dispatch[k] == null) d.dispatch[k] = bd[k]; });
    return d;
  }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[ctx.estate] = draft; EA.local.set(K.draft, all); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[ctx.estate]; EA.local.set(K.draft, all); }

  // Lots to show: those with backlog, those harvested today on this phone's chit, and any added.
  function lotsToShow() {
    var b = EA.fh.getBacklog(ctx.estate), seen = {}, out = [];
    function add(lot, block, left, since) {
      if (!lot || seen[lot]) return; seen[lot] = true;
      var l = EA.lists.lot(ctx.estate, lot);
      out.push({ lot: lot, block: block || (l && l.block) || '', left: left, since: since || '' });
    }
    (b && b.field || []).forEach(function (x) { add(x.lot, x.block, x.bunches, x.since); });
    EA.fh.allChits().filter(function (c) { return c.estate === ctx.estate && c.date === EA.today(); }).forEach(function (c) {
      (c.jobs || []).forEach(function (j) { if (j.task === 'HV01') j.lots.forEach(function (n) { add(n, j.block, null); }); });
    });
    draft.extra.forEach(function (n) { add(n, '', null); });
    return out.sort(function (a, b2) { return a.lot.localeCompare(b2.lot, undefined, { numeric: true }); });
  }

  // For the delivery note's "Estimated tonnage": bunches x this month's bunch weight from the tickets.
  function abwNow() {
    var m = EA.today().slice(0, 7), mt = 0, b = 0;
    EA.local.get('fh.tickets', []).forEach(function (t) { if (t.estate === ctx.estate && t.date.slice(0, 7) === m && !t.removed) { mt += t.nett; b += t.bunches; } });
    return b ? mt * 1000 / b : 0;
  }
  function totText() {
    var n = disTotal(draft.dispatch), a = abwNow();
    return 'Jumlah ke lori · Total on the lorry: <b>' + n + '</b> tandan' +
      (n && a ? ' · anggaran · estimated <b>' + (n * a / 1000).toFixed(1) + ' MT</b> (ABW ' + a.toFixed(1) + ' kg, untuk nota hantar · for the delivery note)' : '');
  }
  // The harvest still open, lot by lot (the lorry being corrected gets its bunches back).
  function openLots() { return EA.fh.harvest.openLots(ctx.estate, { trip: draft.dispatch.replacing }); }
  function partsNow() { return EA.fh.harvest.takeParts(openLots(), draft.dispatch.sel); }
  function rampOf(block) {
    var b = EA.fh.getBacklog(ctx.estate), r = b && b.ramp && b.ramp.blocks || [];
    var x = r.find(function (y) { return y.block === block; });
    return x ? x.bunches : 0;
  }

  function render(container, c) {
    el = container; ctx = c;
    draft = loadDraft();
    var testing = ctx.room.state !== 'live';
    var everyone = EA.lists.workersFor(ctx.estate);
    var opts = function (sel) { return '<option value="">— Pilih · Choose —</option>' + everyone.map(function (w) { return '<option value="' + w.id + '"' + (w.id === sel ? ' selected' : '') + '>' + esc(w.id + ' · ' + w.name) + '</option>'; }).join(''); };
    var lots = lotsToShow();
    el.innerHTML = '<div class="room-top">' +
      '<button type="button" class="back-btn" id="cl-back">← <span class="inline"><span class="bm">Bilik</span></span></button>' +
      '<div class="grow"><h1>Kutip & hantar</h1><span class="en">Collect & dispatch · ' + esc(ctx.estate) + '</span></div>' +
      (testing ? '<span class="test-badge">UJIAN · TEST</span>' : '') + '</div>' + EA.fh.tabs('collect', ctx.user) +
      EA.fh.backlogCard(ctx.estate) +

      '<section class="card" aria-labelledby="cl-s1"><h2 id="cl-s1"><span class="step">1</span><span class="inline"><span class="bm">Kutip ke ramp</span> · <span class="en">Collected to the ramp</span></span></h2>' +
      '<div class="fields">' +
        '<div class="field"><label for="cl-tr"><span class="bm">Pemandu traktor</span><span class="en">Tractor driver</span></label><select id="cl-tr" class="text-input">' + opts(draft.tractor) + '</select></div>' +
        '<div class="field"><label for="cl-ld"><span class="bm">Pemuat</span><span class="en">Loader</span></label><select id="cl-ld" class="text-input">' + opts(draft.loader) + '</select></div>' +
      '</div>' +
      '<div class="rows">' + (lots.length ? lots.map(function (x) {
        var d = draft.lots[x.lot] || { bunches: '', cleared: '' };
        return '<div class="wrow"><div class="who-w"><b class="mono">' + esc(x.lot) + '</b><span class="en">' +
          (x.left != null ? 'Baki · left: ' + x.left + ' tandan' + (x.since ? ' sejak ' + EA.fh.shortDate(x.since) : '') : 'Tuai hari ini · harvested today') + '</span></div><div></div>' +
          '<div class="job"><input class="qty" inputmode="numeric" data-lot="' + esc(x.lot) + '" data-block="' + esc(x.block) + '" value="' + esc(d.bunches) + '" placeholder="0"> tandan dikutip · collected' +
          '<label class="inline-check"><input type="checkbox" data-clear="' + esc(x.lot) + '"' + (d.cleared === 'Y' ? ' checked' : '') + '> Habis · lot cleared</label></div></div>';
      }).join('') : '<p class="hint">Tiada petak dengan baki atau tuaian hari ini. Tambah petak di bawah. · No lot with backlog or harvest today. Add a lot below.</p>') + '</div>' +
      '<div class="wline"><select id="cl-addlot" class="text-input"><option value="">+ Petak lain · another lot</option>' +
        EA.lists.lotsFor(ctx.estate).map(function (l) { return '<option>' + l.lot + '</option>'; }).join('') + '</select></div>' +
      '</section>' +

      // The delivery note is written by whoever the estate gives it to (Sugut: the staff;
      // elsewhere the clerk or a mandor). The tractor driver and loader (Worker) do not see it.
      (ctx.user.role === 'Worker' ? '' :
      '<section class="card" aria-labelledby="cl-s2"><h2 id="cl-s2"><span class="step">2</span><span class="inline"><span class="bm">Nota hantar (DN) · lori ke kilang</span> · <span class="en">Delivery note: lorry to the mill</span></span></h2>' +
      (draft.dispatch.replacing ? '<p class="warn"><span class="bm">Membetulkan nota hantar DN ' + esc(draft.dispatch.dn) + '. Yang lama kekal; yang baru menggantikannya.</span><span class="en">Correcting a delivery note. The old one stays on record; this one replaces it.</span> <button type="button" class="btn btn-ghost" id="cl-fixstop">STOP<small>Batal betulkan</small></button></p>' : '') +
      '<p class="hint">Kosongkan jika tiada lori hari ini. Tanda petak yang dimuat ke lori ini, dan ubah tandan jika hanya sebahagian. Yang tidak ditanda kekal sebagai baki blok. · Leave empty if no lorry today. Tick the lots loaded on this lorry, and change the bunches if only part went. What is not ticked stays as the block\'s balance.</p>' +
      '<div id="cl-dlots"></div>' +
      '<details class="card-sub" id="cl-extra"' + (sumOf(draft.dispatch.extra) || !openLots().length ? ' open' : '') + '><summary><span class="bm">Tandan tanpa rekod tuai, ikut blok</span> · <span class="en">Bunches with no harvest record, by block</span></summary>' +
      '<div class="blk-in">' + EA.lists.blocksFor(ctx.estate).map(function (b) {
        var r = rampOf(b.block);
        return '<div class="field"><label for="cl-db-' + esc(b.block) + '"><span class="bm">Blok ' + esc(b.block) + '</span><span class="en">' + (r ? 'Di ramp · at ramp: ' + r : 'tandan · bunches') + '</span></label>' +
          '<input id="cl-db-' + esc(b.block) + '" class="text-input" inputmode="numeric" data-dblock="' + esc(b.block) + '" value="' + esc(draft.dispatch.extra[b.block] || '') + '" placeholder="0"></div>';
      }).join('') + '</div></details>' +
      '<p class="hint" id="cl-dtot">' + totText() + '</p>' +
      '<div class="fields">' +
        '<div class="field"><label for="cl-dn"><span class="bm">No. nota hantar (DN)</span><span class="en">Delivery note no.</span></label><input id="cl-dn" class="text-input" inputmode="numeric" value="' + esc(draft.dispatch.dn) + '" placeholder="8524"></div>' +
        '<div class="field"><label for="cl-dr"><span class="bm">Pemandu</span><span class="en">Driver</span></label><input id="cl-dr" class="text-input" value="' + esc(draft.dispatch.driver) + '"></div>' +
        '<div class="field"><label for="cl-lr"><span class="bm">No. lori</span><span class="en">Lorry number</span></label><input id="cl-lr" class="text-input" value="' + esc(draft.dispatch.lorry) + '" placeholder="SA 1234 B"></div>' +
        '<div class="field"><label for="cl-ml"><span class="bm">Kilang</span><span class="en">Mill or collecting centre</span></label><select id="cl-ml" class="text-input">' +
          EA.lists.mills.concat(['Lain-lain · Other']).map(function (m) { return '<option' + (m === draft.dispatch.mill ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<label class="inline-check"><input type="checkbox" id="cl-rc"' + (draft.dispatch.ramp_cleared === 'Y' ? ' checked' : '') + '> Ramp kosong selepas lori ini · ramp empty after this lorry</label>' +
      '</section>') +

      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="cl-save">SAVE<small>Simpan</small></button></div>' +
      todayCard();

    $('#cl-back').onclick = function () { location.hash = ''; };
    $('#cl-tr').onchange = function () { draft.tractor = this.value; keepDraft(); };
    $('#cl-ld').onchange = function () { draft.loader = this.value; keepDraft(); };
    el.querySelectorAll('input[data-lot]').forEach(function (i) {
      i.oninput = function () { var d = draft.lots[i.dataset.lot] = draft.lots[i.dataset.lot] || { bunches: '', cleared: '', block: i.dataset.block }; d.bunches = i.value.replace(/\D/g, ''); d.block = i.dataset.block; keepDraft(); };
    });
    el.querySelectorAll('input[data-clear]').forEach(function (i) {
      i.onchange = function () { var lot = i.dataset.clear, d = draft.lots[lot] = draft.lots[lot] || { bunches: '', cleared: '', block: (EA.lists.lot(ctx.estate, lot) || {}).block || '' }; d.cleared = i.checked ? 'Y' : ''; keepDraft(); };
    });
    $('#cl-addlot').onchange = function () { if (this.value && draft.extra.indexOf(this.value) < 0) { draft.extra.push(this.value); keepDraft(); render(el, ctx); } };
    el.querySelectorAll('input[data-dblock]').forEach(function (i) {
      i.oninput = function () { draft.dispatch.extra[i.dataset.dblock] = i.value.replace(/\D/g, ''); keepDraft(); $('#cl-dtot').innerHTML = totText(); };
    });
    if ($('#cl-dn')) {
      drawDnLots();
      if ($('#cl-fixstop')) $('#cl-fixstop').onclick = function () { draft.dispatch = blankDis(); keepDraft(); render(el, ctx); };
      $('#cl-dn').oninput = function () { draft.dispatch.dn = this.value.replace(/\s/g, ''); keepDraft(); };
      $('#cl-dr').oninput = function () { draft.dispatch.driver = this.value; keepDraft(); };
      $('#cl-lr').oninput = function () { draft.dispatch.lorry = this.value.toUpperCase(); keepDraft(); };
      $('#cl-ml').onchange = function () { draft.dispatch.mill = this.value; keepDraft(); };
      $('#cl-rc').onchange = function () { draft.dispatch.ramp_cleared = this.checked ? 'Y' : ''; keepDraft(); };
    }
    $('#cl-save').onclick = save;
    wireToday();
    EA.fh.wireBacklog(el, ctx.estate);
    EA.fh.refreshBacklog(ctx.estate);
    if (ctx.user.role !== 'Worker') EA.fh.harvest.refreshOpen(ctx.estate).then(function (ok) {
      if (ok && el && document.body.contains(el) && !el.hidden && $('#cl-dlots')) { drawDnLots(); $('#cl-today').outerHTML = todayCard(); wireToday(); }
    });
  }

  // The lots open for the lorry: tick, and change the bunches if only part went.
  function drawDnLots() {
    var list = openLots(), sel = draft.dispatch.sel;
    Object.keys(sel).forEach(function (lot) { if (!list.some(function (l) { return l.lot === lot; })) delete sel[lot]; });
    $('#cl-dlots').innerHTML = list.length ? '<div class="rows">' + list.map(function (l) {
      var on = sel[l.lot] != null;
      return '<div class="list-line lot-line"><label class="pick-line"><input type="checkbox" data-dlot="' + esc(l.lot) + '"' + (on ? ' checked' : '') + '>' +
        '<div><b>Petak ' + esc(l.lot) + ' · Blk ' + esc(l.block) + '</b><span class="en">' + l.open + ' tandan belum dihantar · not yet sent · tuai ' + l.dates.map(EA.fh.shortDate).join(', ') + ' · ' +
        esc(l.workers.map(person).join(', ')) + '</span></div></label>' +
        '<input class="qty" inputmode="numeric" aria-label="Tandan petak ' + esc(l.lot) + '" data-damt="' + esc(l.lot) + '" value="' + esc(on ? sel[l.lot] : '') + '" placeholder="' + l.open + '"' + (on ? '' : ' disabled') + '></div>';
    }).join('') + '</div>' + balText(list)
      : '<p class="hint">Tiada tuaian terbuka (belum diisi di Kerja harian). Isi tandan ikut blok di bawah. · No open harvest (not keyed on Daily work yet). Key the bunches by block below.</p>';
    el.querySelectorAll('input[data-dlot]').forEach(function (i) {
      i.onchange = function () {
        var l = list.find(function (x) { return x.lot === i.dataset.dlot; });
        if (i.checked) sel[l.lot] = String(l.open); else delete sel[l.lot];
        keepDraft(); drawDnLots(); $('#cl-dtot').innerHTML = totText();
      };
    });
    el.querySelectorAll('input[data-damt]').forEach(function (i) {
      i.oninput = function () {
        var l = list.find(function (x) { return x.lot === i.dataset.damt; });
        var raw = i.value.replace(/\D/g, '');
        if (raw !== '' && num(raw) > l.open) { raw = String(l.open); i.value = raw; }
        sel[l.lot] = raw;
        keepDraft(); $('#cl-dtot').innerHTML = totText(); var b = $('#cl-dbal'); if (b) b.outerHTML = balText(list);
      };
    });
  }
  function balText(list) {
    var after = {};
    list.forEach(function (l) { after[l.block] = (after[l.block] || 0) + l.open - Math.min(num(draft.dispatch.sel[l.lot]), l.open); });
    var b = Object.keys(after).filter(function (k) { return after[k] > 0; }).sort();
    return '<p class="hint" id="cl-dbal">' + (b.length ? '<b>Baki blok selepas lori ini · Block balance after this lorry:</b> ' + b.map(function (k) { return 'Blk ' + esc(k) + ' ' + after[k] + ' tandan'; }).join(' · ') : '') + '</p>';
  }

  function save() {
    var lines = Object.keys(draft.lots).map(function (lot) {
      var d = draft.lots[lot];
      return { lot: lot, block: d.block || ((EA.lists.lot(ctx.estate, lot) || {}).block || ''), bunches: d.bunches || '', cleared: d.cleared || '' };
    }).filter(function (l) { return num(l.bunches) > 0 || l.cleared === 'Y'; });
    var dis = draft.dispatch, total = ctx.user.role === 'Worker' ? 0 : disTotal(dis), hasDis = ctx.user.role !== 'Worker' && (total > 0 || dis.ramp_cleared === 'Y');
    var p = [];
    if (!lines.length && !hasDis) p.push(['Tiada apa untuk disimpan.', 'Nothing to save yet.']);
    if (lines.length && (!draft.tractor || !draft.loader)) p.push(['Pilih pemandu traktor dan pemuat.', 'Choose the tractor driver and loader.']);
    if (total > 0 && !dis.dn) p.push(['Isi no. nota hantar (DN).', 'Fill in the delivery note number.']);
    if (total > 0 && !dis.lorry.trim()) p.push(['Isi no. lori.', 'Fill in the lorry number.']);
    if (dis.replacing && !hasDis) p.push(['Nota hantar yang dibetulkan mesti ada tandan.', 'A corrected delivery note needs its bunches. To cancel the lorry, put the bunches on the next one.']);
    if (dis.replacing && lines.length) p.push(['Semasa membetulkan DN, kosongkan Kutip ke ramp.', 'While correcting a delivery note, leave Collected to the ramp empty.']);
    if (p.length) {
      ui().openSheet('<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
        p.map(function (x) { return '<p class="msg"><span class="bm">' + esc(x[0]) + '</span><span class="en">' + esc(x[1]) + '</span></p>'; }).join('') +
        '<div class="actions"><button class="btn btn-main" type="button" id="cp-ok">OK<small>Betulkan</small></button></div>',
        function (s) { s.querySelector('#cp-ok').onclick = ui().closeSheet; });
      return;
    }
    var old = dis.replacing ? saved().find(function (s) { return s.dispatch && s.dispatch.trip === dis.replacing && !s.dispatch.replacedBy; }) : null;
    if (dis.replacing && !old) { ui().toast('Nota hantar lama tidak dijumpai · Old delivery note not found', 'bad'); return; }
    // One trip code ties together the rows of this lorry (one per block); a correction keeps it.
    var trip = old ? old.dispatch.trip : 'LR-' + ctx.estate + '-' + (EA.phone() || 'P00') + '-' + EA.today().replace(/-/g, '') + '-' + EA.ui.hhmm(new Date()).replace(':', '') + String(new Date().getSeconds()).padStart(2, '0') + String(new Date().getMilliseconds()).padStart(3, '0');
    var dcopy = null, parts = [];
    if (hasDis) {
      parts = partsNow();
      var blocks = {};
      parts.forEach(function (h) { blocks[h.block] = (blocks[h.block] || 0) + h.bunches; });
      Object.keys(dis.extra).forEach(function (b) { if (num(dis.extra[b])) blocks[b] = (blocks[b] || 0) + num(dis.extra[b]); });
      dcopy = { trip: trip, dn: dis.dn, driver: dis.driver.trim(), lorry: dis.lorry.trim(), mill: dis.mill, ramp_cleared: dis.ramp_cleared,
                blocks: blocks, parts: parts, sel: JSON.parse(JSON.stringify(dis.sel)), extra: JSON.parse(JSON.stringify(dis.extra)), bunches: String(sumOf(blocks)) };
    }
    var rec = { date: old ? old.date : EA.today(), estate: ctx.estate, at: EA.ui.hhmm(new Date()), tractor: draft.tractor, loader: draft.loader, lines: old ? [] : lines, dispatch: dcopy, ids: [], disIds: {}, lotIds: {} };
    try {
      lines.forEach(function (l) {
        rec.ids.push(EA.save(TAB, ROOM, ctx.estate, { block: l.block, lot: l.lot, bunches: String(num(l.bunches)), cleared: l.cleared, tractor: draft.tractor, loader: draft.loader, note: '' }).id);
      });
      if (hasDis) EA.fh.harvest.writeDn(ctx.estate, rec, old);
    } catch (e) { ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad'); return; }
    var list = EA.local.get(K.saved, []);
    if (old) list.forEach(function (s) { if (s.dispatch && s.dispatch.trip === trip && !s.dispatch.replacedBy) s.dispatch.replacedBy = rec.at; });
    list.push(rec); EA.local.set(K.saved, list);
    var keep = { tractor: draft.tractor, loader: draft.loader };
    dropDraft(); draft = blank(); draft.tractor = keep.tractor; draft.loader = keep.loader; keepDraft();
    ui().toast(old ? 'Nota hantar dibetulkan · Delivery note corrected' : 'Disimpan · Saved');
    if (navigator.onLine && EA.sendLink()) EA.send().then(function () { EA.fh.refreshBacklog(ctx.estate); });
    else EA.fh.refreshBacklog(ctx.estate);
    render(el, ctx);
  }

  function todayCard() {
    var list = todays();
    return '<section class="card" id="cl-today"><h2><span class="inline"><span class="bm">Hari ini di telefon ini</span> · <span class="en">Today on this phone</span></span></h2>' +
      (list.length ? list.map(function (s) {
        var waiting = s.ids.some(function (i) { return EA.isWaiting(i); });
        return '<div class="list-line"><div><b>' + esc(s.at) + '</b><span class="en">' +
          (s.lines.length ? 'Kutip: ' + s.lines.map(function (l) { return l.lot + ' ' + (l.bunches || 0) + (l.cleared === 'Y' ? ' (habis)' : ''); }).join(', ') : '') +
          (s.dispatch ? (s.lines.length ? ' · ' : '') + 'Lori ' + esc(s.dispatch.lorry || '') + ': ' + (s.dispatch.bunches || 0) + ' tandan' + (s.dispatch.blocks && Object.keys(s.dispatch.blocks).length ? ' (' + Object.keys(s.dispatch.blocks).map(function (b) { return 'Blk ' + b + ' ' + s.dispatch.blocks[b]; }).join(', ') + ')' : '') + ' ke ' + esc(s.dispatch.mill) + (s.dispatch.ramp_cleared === 'Y' ? ' (ramp kosong)' : '') : '') +
          (s.dispatch && s.dispatch.replacedBy ? ' <i>(dibetulkan · corrected)</i>' : '') +
          '</span><span class="pill ' + (waiting ? 'wait">Menunggu · Waiting' : 'ok">Dihantar · Sent') + '</span></div>' +
          (canFix(s) ? '<div class="acts"><button type="button" class="btn btn-ghost" data-dfix="' + esc(s.dispatch.trip) + '">CORRECT DN<small>Betulkan</small></button></div>' : '') + '</div>';
      }).join('') : '<p class="hint">Belum ada hari ini. · Nothing yet today.</p>') + '</section>';
  }
  // A delivery note can be corrected (by the staff, not the loader) until its lorry has a mill ticket.
  function canFix(s) {
    var d = s.dispatch;
    if (ctx.user.role === 'Worker' || !d || d.replacedBy || !d.trip || !s.disIds || !Object.keys(s.disIds).length || draft.dispatch.replacing) return false;
    if (EA.local.get('fh.tickets', []).some(function (t) { return t.trip === d.trip; })) return false;
    if (!EA.sendLink()) return true;
    var stillHere = Object.keys(s.disIds).some(function (b) { return EA.isWaiting(s.disIds[b]); });
    return stillHere || EA.local.get('fh.trips.' + ctx.estate, []).some(function (x) { return x.trip === d.trip; });
  }
  function wireToday() {
    el.querySelectorAll('[data-dfix]').forEach(function (b) {
      b.onclick = function () {
        var s = saved().find(function (x) { return x.dispatch && x.dispatch.trip === b.dataset.dfix && !x.dispatch.replacedBy; });
        if (!s) return;
        var d = s.dispatch;
        draft.dispatch = { sel: JSON.parse(JSON.stringify(d.sel || {})), extra: JSON.parse(JSON.stringify(d.extra || {})), lorry: d.lorry || '', mill: d.mill, dn: d.dn || '', driver: d.driver || '',
                           ramp_cleared: d.ramp_cleared || '', replacing: d.trip };
        keepDraft(); render(el, ctx);
        var sec = $('#cl-s2'); if (sec && sec.scrollIntoView) sec.scrollIntoView();
      };
    });
  }

  document.addEventListener('ea:sync', function () {
    if (!el || !document.body.contains(el) || el.hidden) return;
    var card = el.querySelector('#cl-today');
    if (card) { card.outerHTML = todayCard(); wireToday(); }
  });

  EA.fh.collect = { render: render };
})();
