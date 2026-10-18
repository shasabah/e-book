// Field & Harvest room — screen 3: collect & dispatch (Kutip & hantar).
// Keyed by the tractor driver and loader pair (on their own phone, role Worker,
// or on the staff's phone): bunches collected from each lot to the ramp, lots
// cleared, and what left the ramp on the lorry to the mill.
// The office compares this with the harvesters' bunches to work out the backlog
// left in the field and at the ramp; it shows on the next morning's chit.
// Each save adds to the day (several trips a day are fine). Nothing is deleted.
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};

  var TAB = 'FH_COLLECT', TAB_DIS = 'FH_DISPATCH', ROOM = 'FH';
  var K = { draft: 'fh.collectdraft', saved: 'fh.collect' };
  var MILLS = ['Boustead', 'Sri Kamusan CC'];

  var el, ctx, draft;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }

  function saved() { var cut = new Date(); cut.setDate(cut.getDate() - 40); var from = cut.toISOString().slice(0, 10); return EA.local.get(K.saved, []).filter(function (s) { return s.date >= from; }); }
  function todays() { return saved().filter(function (s) { return s.estate === ctx.estate && s.date === EA.today(); }); }
  function blank() { return { date: EA.today(), estate: ctx.estate, tractor: '', loader: '', lots: {}, extra: [], dispatch: { blocks: {}, lorry: '', mill: MILLS[0], ramp_cleared: '' } }; }
  function disTotal(d) { return Object.keys(d.blocks || {}).reduce(function (a, b) { return a + num(d.blocks[b]); }, 0); }
  function loadDraft() {
    var all = EA.local.get(K.draft, {}), d = all[ctx.estate];
    if (!d || d.date !== EA.today()) {
      d = blank();
      var last = saved().filter(function (s) { return s.estate === ctx.estate; }).pop();   // the pair is usually the same
      if (last) { d.tractor = last.tractor; d.loader = last.loader; }
    }
    if (!d.dispatch.blocks) d.dispatch.blocks = {};
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

      '<section class="card" aria-labelledby="cl-s2"><h2 id="cl-s2"><span class="step">2</span><span class="inline"><span class="bm">Hantar ke kilang</span> · <span class="en">Sent to the mill (lorry)</span></span></h2>' +
      '<p class="hint">Kosongkan jika tiada lori hari ini. Tandan dimuat ke lori, ikut blok (untuk bahagi tan tiket kilang). · Leave empty if no lorry today. Bunches loaded, by block (so the mill ticket\'s tonnes go to the right block).</p>' +
      '<div class="blk-in">' + EA.lists.blocksFor(ctx.estate).map(function (b) {
        var r = rampOf(b.block);
        return '<div class="field"><label for="cl-db-' + esc(b.block) + '"><span class="bm">Blok ' + esc(b.block) + '</span><span class="en">' + (r ? 'Di ramp · at ramp: ' + r : 'tandan · bunches') + '</span></label>' +
          '<input id="cl-db-' + esc(b.block) + '" class="text-input" inputmode="numeric" data-dblock="' + esc(b.block) + '" value="' + esc(draft.dispatch.blocks[b.block] || '') + '" placeholder="0"></div>';
      }).join('') + '</div>' +
      '<p class="hint" id="cl-dtot">Jumlah ke lori · Total on the lorry: <b>' + disTotal(draft.dispatch) + '</b> tandan</p>' +
      '<div class="fields">' +
        '<div class="field"><label for="cl-lr"><span class="bm">No. lori</span><span class="en">Lorry number</span></label><input id="cl-lr" class="text-input" value="' + esc(draft.dispatch.lorry) + '" placeholder="SA 1234 B"></div>' +
        '<div class="field"><label for="cl-ml"><span class="bm">Kilang</span><span class="en">Mill or collecting centre</span></label><select id="cl-ml" class="text-input">' +
          MILLS.concat(['Lain-lain · Other']).map(function (m) { return '<option' + (m === draft.dispatch.mill ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<label class="inline-check"><input type="checkbox" id="cl-rc"' + (draft.dispatch.ramp_cleared === 'Y' ? ' checked' : '') + '> Ramp kosong selepas lori ini · ramp empty after this lorry</label>' +
      '</section>' +

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
      i.oninput = function () { draft.dispatch.blocks[i.dataset.dblock] = i.value.replace(/\D/g, ''); keepDraft(); $('#cl-dtot b').textContent = disTotal(draft.dispatch); };
    });
    $('#cl-lr').oninput = function () { draft.dispatch.lorry = this.value.toUpperCase(); keepDraft(); };
    $('#cl-ml').onchange = function () { draft.dispatch.mill = this.value; keepDraft(); };
    $('#cl-rc').onchange = function () { draft.dispatch.ramp_cleared = this.checked ? 'Y' : ''; keepDraft(); };
    $('#cl-save').onclick = save;
    EA.fh.wireBacklog(el, ctx.estate);
    EA.fh.refreshBacklog(ctx.estate);
  }

  function save() {
    var lines = Object.keys(draft.lots).map(function (lot) {
      var d = draft.lots[lot];
      return { lot: lot, block: d.block || ((EA.lists.lot(ctx.estate, lot) || {}).block || ''), bunches: d.bunches || '', cleared: d.cleared || '' };
    }).filter(function (l) { return num(l.bunches) > 0 || l.cleared === 'Y'; });
    var dis = draft.dispatch, total = disTotal(dis), hasDis = total > 0 || dis.ramp_cleared === 'Y';
    var p = [];
    if (!lines.length && !hasDis) p.push(['Tiada apa untuk disimpan.', 'Nothing to save yet.']);
    if (lines.length && (!draft.tractor || !draft.loader)) p.push(['Pilih pemandu traktor dan pemuat.', 'Choose the tractor driver and loader.']);
    if (total > 0 && !dis.lorry.trim()) p.push(['Isi no. lori.', 'Fill in the lorry number.']);
    if (p.length) {
      ui().openSheet('<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
        p.map(function (x) { return '<p class="msg"><span class="bm">' + esc(x[0]) + '</span><span class="en">' + esc(x[1]) + '</span></p>'; }).join('') +
        '<div class="actions"><button class="btn btn-main" type="button" id="cp-ok">OK<small>Betulkan</small></button></div>',
        function (s) { s.querySelector('#cp-ok').onclick = ui().closeSheet; });
      return;
    }
    var dcopy = hasDis ? JSON.parse(JSON.stringify(dis)) : null;
    if (dcopy) { Object.keys(dcopy.blocks).forEach(function (b) { if (!num(dcopy.blocks[b])) delete dcopy.blocks[b]; }); dcopy.bunches = String(total); }
    var rec = { date: EA.today(), estate: ctx.estate, at: EA.ui.hhmm(new Date()), tractor: draft.tractor, loader: draft.loader, lines: lines, dispatch: dcopy, ids: [] };
    try {
      lines.forEach(function (l) {
        rec.ids.push(EA.save(TAB, ROOM, ctx.estate, { block: l.block, lot: l.lot, bunches: String(num(l.bunches)), cleared: l.cleared, tractor: draft.tractor, loader: draft.loader, note: '' }).id);
      });
      if (hasDis) {
        // One row per block on this lorry, tied together by the trip code.
        var trip = 'LR-' + ctx.estate + '-' + (EA.phone() || 'P00') + '-' + EA.today().replace(/-/g, '') + '-' + EA.ui.hhmm(new Date()).replace(':', '') + String(new Date().getSeconds()).padStart(2, '0');
        var parts = Object.keys(dis.blocks).filter(function (b) { return num(dis.blocks[b]) > 0; });
        if (!parts.length) parts = [''];   // ramp emptied with no load
        parts.forEach(function (b) {
          rec.ids.push(EA.save(TAB_DIS, ROOM, ctx.estate, { block: b, trip: trip, bunches: String(num(dis.blocks[b])), lorry: dis.lorry.trim(), mill: dis.mill, ramp_cleared: dis.ramp_cleared, note: '' }).id);
        });
      }
    } catch (e) { ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad'); return; }
    var list = EA.local.get(K.saved, []); list.push(rec); EA.local.set(K.saved, list);
    var keep = { tractor: draft.tractor, loader: draft.loader };
    dropDraft(); draft = blank(); draft.tractor = keep.tractor; draft.loader = keep.loader; keepDraft();
    ui().toast('Disimpan · Saved');
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
          '</span></div><span class="pill ' + (waiting ? 'wait">Menunggu · Waiting' : 'ok">Dihantar · Sent') + '</span></div>';
      }).join('') : '<p class="hint">Belum ada hari ini. · Nothing yet today.</p>') + '</section>';
  }

  document.addEventListener('ea:sync', function () {
    if (!el || !document.body.contains(el) || el.hidden) return;
    var card = el.querySelector('#cl-today');
    if (card) card.outerHTML = todayCard();
  });

  EA.fh.collect = { render: render };
})();
