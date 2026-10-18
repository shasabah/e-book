// Field & Harvest room — screen 3: collect & dispatch (Kutip & hantar).
// v22 (Yu Chen, for the pilot): keyed by the staff only, from the paper. The mandor and the
// loader keep their paper and whiteboard until the app runs smoothly.
// One list of the lots with crop not yet sent to the mill. For each lot:
//   Dikutip (collected to the ramp) starts with the mandor's bunches still in the field;
//   the staff changes it only where the loader's paper differs (a difference becomes a
//   count check on the next morning's chit).
//   Ke lori (on the lorry), shown when there is a lorry, starts ticked with what is at the
//   ramp; the staff unticks a lot that stayed, or lowers it for a part load.
// The office compares all this to work out the backlog in the field and at the ramp.
// A delivery note can be corrected until its lorry has a mill ticket. Nothing is deleted.
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
  function blank() { return { v: 22, date: EA.today(), estate: ctx.estate, lots: {}, dispatch: blankDis() }; }
  function blankDis() { return { on: false, lot: {}, extra: {}, lorry: '', mill: EA.lists.mills[0], dn: '', driver: '', ramp_cleared: '', replacing: '' }; }
  function sumOf(o) { return Object.keys(o || {}).reduce(function (a, b) { return a + num(o[b]); }, 0); }
  function loadDraft() {
    var all = EA.local.get(K.draft, {}), d = all[ctx.estate];
    if (!d || d.date !== EA.today() || d.v !== 22) return blank();     // a draft from an older version starts fresh
    var bd = blankDis();
    Object.keys(bd).forEach(function (k) { if (d.dispatch[k] == null) d.dispatch[k] = bd[k]; });
    return d;
  }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[ctx.estate] = draft; EA.local.set(K.draft, all); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[ctx.estate]; EA.local.set(K.draft, all); }

  // ---------- the lots, with what is in the field and at the ramp ----------
  function fixing() { return !!draft.dispatch.replacing; }
  function lorryOn() { return fixing() || !!draft.dispatch.on; }
  function rows() {
    var fl = EA.fh.harvest.fieldLeft(ctx.estate);
    return EA.fh.harvest.openLots(ctx.estate, { trip: draft.dispatch.replacing }).map(function (l) {
      var field = Math.max(0, Math.min(fl[l.lot] || 0, l.open));
      return Object.assign(l, { field: field, ramp: l.open - field });
    });
  }
  // Each number starts from the record; draft.lots / draft.dispatch.lot hold only what the staff changed.
  // A lot already collected today (saved earlier on this phone) starts at 0, so it is not counted twice.
  function doneToday() { var m = {}; todays().forEach(function (s) { (s.lines || []).forEach(function (l) { m[l.lot] = true; }); }); return m; }
  function dik(r) {
    var o = draft.lots[r.lot];
    if (fixing()) return 0;
    if (o && o.bunches != null) return num(o.bunches);
    return doneToday()[r.lot] ? 0 : r.field;
  }
  function habis(r) {
    if (fixing()) return '';
    var o = draft.lots[r.lot];
    if (o && o.cleared != null) return o.cleared;
    return r.field > 0 && dik(r) > 0 && dik(r) >= r.field ? 'Y' : '';
  }
  function base(r) { return fixing() ? r.open : Math.min(r.open, r.ramp + dik(r)); }
  function lorryOf(r) {
    var o = draft.dispatch.lot[r.lot], b = base(r);
    if (!o) return { on: !fixing() && b > 0, n: b };
    return { on: !!o.on, n: o.n == null || o.n === '' ? b : Math.min(num(o.n), r.open) };
  }
  function lorrySel(list) {
    var sel = {};
    if (lorryOn()) list.forEach(function (r) { var x = lorryOf(r); if (x.on && x.n > 0) sel[r.lot] = x.n; });
    return sel;
  }

  // For the delivery note's "Estimated tonnage": bunches x this month's bunch weight.
  function abwNow() {
    var b = EA.fh.getBacklog(ctx.estate), t = b && b.tonnage;
    if (t && t.abw) return num(t.abw);
    var m = EA.today().slice(0, 7), mt = 0, n = 0;
    EA.local.get('fh.tickets', []).forEach(function (x) { if (x.estate === ctx.estate && x.date.slice(0, 7) === m) { mt += x.nett; n += x.bunches; } });
    return n ? mt * 1000 / n : 0;
  }
  function totals(list) {
    var sel = lorrySel(list), n = sumOf(sel) + (lorryOn() ? sumOf(draft.dispatch.extra) : 0), a = abwNow(), after = {};
    list.forEach(function (r) { after[r.block] = (after[r.block] || 0) + r.open - (sel[r.lot] || 0); });
    var bl = Object.keys(after).filter(function (k) { return after[k] > 0; }).sort();
    return (lorryOn() ? '<p class="hint" id="cl-dtot">Jumlah ke lori · Total on the lorry: <b>' + n + '</b> tandan' +
        (n && a ? ' · anggaran · estimated <b>' + (n * a / 1000).toFixed(1) + ' MT</b> (ABW ' + a.toFixed(1) + ' kg)' : '') + '</p>' : '') +
      (bl.length ? '<p class="hint"><b>Baki blok' + (lorryOn() ? ' selepas lori ini · Block balance after this lorry' : ' · Block balance (field + ramp)') + ':</b> ' +
        bl.map(function (k) { return 'Blk ' + esc(k) + ' ' + after[k] + ' tandan'; }).join(' · ') + '</p>' : '');
  }

  // ---------- the screen ----------
  function render(container, c) {
    el = container; ctx = c;
    var testing = ctx.room.state !== 'live';
    var head = '<div class="room-top">' +
      '<button type="button" class="back-btn" id="cl-back">← <span class="inline"><span class="bm">Bilik</span></span></button>' +
      '<div class="grow"><h1>Kutip & hantar</h1><span class="en">Collect & dispatch · ' + esc(ctx.estate) + '</span></div>' +
      (testing ? '<span class="test-badge">UJIAN · TEST</span>' : '') + '</div>';
    if (ctx.user.role === 'Worker') {
      // Parked for the pilot (v22): the tractor driver and loader keep the paper; the staff keys it.
      el.innerHTML = head + '<section class="card"><p class="msg"><span class="bm">Belum dibuka untuk pemandu traktor dan pemuat. Teruskan dengan kertas; staf akan isi dalam aplikasi.</span>' +
        '<span class="en">Not open yet for the tractor driver and loader. Keep using the paper; the staff keys it into the app.</span></p></section>';
      $('#cl-back').onclick = function () { location.hash = ''; };
      return;
    }
    draft = loadDraft();
    var d = draft.dispatch;
    el.innerHTML = head + EA.fh.tabs('collect', ctx.user) +
      EA.fh.backlogCard(ctx.estate) +
      (fixing() ? '<p class="warn"><span class="bm">Membetulkan nota hantar DN ' + esc(d.dn) + '. Yang lama kekal; yang baru menggantikannya.</span><span class="en">Correcting a delivery note. The old one stays on record; this one replaces it.</span> <button type="button" class="btn btn-ghost" id="cl-fixstop">STOP<small>Batal betulkan</small></button></p>' : '') +

      '<section class="card" aria-labelledby="cl-s1"><h2 id="cl-s1"><span class="step">1</span><span class="inline"><span class="bm">Petak · tandan</span> · <span class="en">Lots and bunches</span></span></h2>' +
      (fixing() ? '' : '<p class="hint">Nombor dari Kerja harian (kiraan mandor). Ubah hanya jika kertas pemuat berbeza. · Numbers from Day\'s work (the mandor\'s count). Change them only where the loader\'s paper differs.</p>' +
        '<div class="choice" role="group" aria-label="Lori hari ini · Lorry today">' +
          '<button type="button" class="btn ' + (d.on ? 'btn-main' : 'btn-ghost') + '" id="cl-lorry-yes" aria-pressed="' + (d.on ? 'true' : 'false') + '">ADA LORI<small>A lorry went to the mill</small></button>' +
          '<button type="button" class="btn ' + (d.on ? 'btn-ghost' : 'btn-main') + '" id="cl-lorry-no" aria-pressed="' + (d.on ? 'false' : 'true') + '">TIADA LORI<small>No lorry</small></button>' +
        '</div>') +
      '<div id="cl-rows"></div>' +
      (lorryOn() ? '<details class="card-sub" id="cl-extra"' + (sumOf(d.extra) ? ' open' : '') + '><summary><span class="bm">Tandan tanpa rekod tuai, ikut blok</span> · <span class="en">Bunches with no harvest record, by block</span></summary>' +
        '<div class="blk-in">' + EA.lists.blocksFor(ctx.estate).map(function (b) {
          return '<div class="field"><label for="cl-db-' + esc(b.block) + '"><span class="bm">Blok ' + esc(b.block) + '</span><span class="en">tandan · bunches</span></label>' +
            '<input id="cl-db-' + esc(b.block) + '" class="text-input" inputmode="numeric" data-dblock="' + esc(b.block) + '" value="' + esc(d.extra[b.block] || '') + '" placeholder=""></div>';
        }).join('') + '</div></details>' : '') +
      '<div id="cl-tot"></div></section>' +

      (lorryOn() ? '<section class="card" aria-labelledby="cl-s2"><h2 id="cl-s2"><span class="step">2</span><span class="inline"><span class="bm">Nota hantar (DN)</span> · <span class="en">Delivery note</span></span></h2>' +
      '<div class="fields">' +
        '<div class="field"><label for="cl-dn"><span class="bm">No. nota hantar (DN)</span><span class="en">Delivery note no.</span></label><input id="cl-dn" class="text-input" inputmode="numeric" value="' + esc(d.dn) + '"></div>' +
        '<div class="field"><label for="cl-lr"><span class="bm">No. lori</span><span class="en">Lorry number</span></label><input id="cl-lr" class="text-input" value="' + esc(d.lorry) + '"></div>' +
        '<div class="field"><label for="cl-dr"><span class="bm">Pemandu</span><span class="en">Driver</span></label><input id="cl-dr" class="text-input" value="' + esc(d.driver) + '"></div>' +
        '<div class="field"><label for="cl-ml"><span class="bm">Kilang</span><span class="en">Mill or collecting centre</span></label><select id="cl-ml" class="text-input">' +
          EA.lists.mills.concat(['Lain-lain · Other']).map(function (m) { return '<option' + (m === d.mill ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<label class="inline-check"><input type="checkbox" id="cl-rc"' + (d.ramp_cleared === 'Y' ? ' checked' : '') + '> Ramp kosong selepas lori ini · ramp empty after this lorry</label>' +
      '</section>' : '') +

      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="cl-save">SAVE<small>Simpan</small></button></div>' +
      todayCard();

    $('#cl-back').onclick = function () { location.hash = ''; };
    if ($('#cl-fixstop')) $('#cl-fixstop').onclick = function () { draft.dispatch = blankDis(); keepDraft(); render(el, ctx); };
    if ($('#cl-lorry-yes')) {
      $('#cl-lorry-yes').onclick = function () { draft.dispatch.on = true; keepDraft(); render(el, ctx); };
      $('#cl-lorry-no').onclick = function () { draft.dispatch.on = false; keepDraft(); render(el, ctx); };
    }
    el.querySelectorAll('input[data-dblock]').forEach(function (i) {
      i.oninput = function () { draft.dispatch.extra[i.dataset.dblock] = i.value.replace(/\D/g, ''); keepDraft(); drawTot(); };
    });
    if ($('#cl-dn')) {
      $('#cl-dn').oninput = function () { draft.dispatch.dn = this.value.replace(/\s/g, ''); keepDraft(); };
      $('#cl-dr').oninput = function () { draft.dispatch.driver = this.value; keepDraft(); };
      $('#cl-lr').oninput = function () { draft.dispatch.lorry = this.value.toUpperCase(); keepDraft(); };
      $('#cl-ml').onchange = function () { draft.dispatch.mill = this.value; keepDraft(); };
      $('#cl-rc').onchange = function () { draft.dispatch.ramp_cleared = this.checked ? 'Y' : ''; keepDraft(); };
    }
    $('#cl-save').onclick = save;
    drawRows();
    wireToday();
    EA.fh.wireBacklog(el, ctx.estate);
    Promise.all([EA.fh.refreshBacklog(ctx.estate), EA.fh.harvest.refreshOpen(ctx.estate)]).then(function () {
      if (el && document.body.contains(el) && !el.hidden && $('#cl-rows') && !el.contains(document.activeElement)) { drawRows(); $('#cl-today').outerHTML = todayCard(); wireToday(); }
    });
  }

  function drawRows() {
    var list = rows(), on = lorryOn();
    $('#cl-rows').innerHTML = list.length ? '<div class="rows">' + list.map(function (r) {
      var x = lorryOf(r), h = habis(r);
      return '<div class="list-line lot-row" data-row="' + esc(r.lot) + '"><div class="grow">' +
        '<b>Petak ' + esc(r.lot) + ' · Blk ' + esc(r.block) + '</b>' +
        '<span class="en">Tuai ' + r.dates.map(EA.fh.shortDate).join(', ') + ' · ' + esc(r.workers.map(person).join(', ')) + '</span>' +
        '<span class="en">Ladang · field <b>' + r.field + '</b> · Ramp <b>' + r.ramp + '</b></span>' +
        (!fixing() && r.field > 0 ? '<div class="wline"><label class="inline-label">Dikutip · collected <input class="qty" inputmode="numeric" data-dik="' + esc(r.lot) + '" value="' + dik(r) + '" aria-label="Dikutip petak ' + esc(r.lot) + '"></label>' +
          '<label class="inline-check"><input type="checkbox" data-hab="' + esc(r.lot) + '"' + (h === 'Y' ? ' checked' : '') + '> Habis · lot cleared</label></div>' : '') +
        (on ? '<div class="wline"><label class="inline-check"><input type="checkbox" data-lon="' + esc(r.lot) + '"' + (x.on ? ' checked' : '') + '> Ke lori · on lorry</label>' +
          '<input class="qty" inputmode="numeric" data-ln="' + esc(r.lot) + '" value="' + (x.on ? x.n : '') + '"' + (x.on ? '' : ' disabled') + ' aria-label="Ke lori petak ' + esc(r.lot) + '"></div>' : '') +
        '</div></div>';
    }).join('') + '</div>'
      : '<p class="hint">Tiada buah belum dihantar. Isi tandan penuai di Kerja harian dahulu. · No crop waiting. Key the harvesters\' bunches on Day\'s work first.</p>';
    function rowOf(lot) { return list.find(function (r) { return r.lot === lot; }); }
    function refreshRow(r) {
      var hb = el.querySelector('input[data-hab="' + r.lot + '"]'); if (hb) hb.checked = habis(r) === 'Y';
      var x = lorryOf(r), lc = el.querySelector('input[data-lon="' + r.lot + '"]'), ln = el.querySelector('input[data-ln="' + r.lot + '"]');
      if (lc) lc.checked = x.on;
      if (ln) { ln.disabled = !x.on; if (document.activeElement !== ln) ln.value = x.on ? x.n : ''; }
      drawTot();
    }
    el.querySelectorAll('input[data-dik]').forEach(function (i) {
      i.oninput = function () { var r = rowOf(i.dataset.dik), o = draft.lots[r.lot] = draft.lots[r.lot] || {}; o.bunches = i.value.replace(/\D/g, ''); o.block = r.block; keepDraft(); refreshRow(r); };
    });
    el.querySelectorAll('input[data-hab]').forEach(function (i) {
      i.onchange = function () { var r = rowOf(i.dataset.hab), o = draft.lots[r.lot] = draft.lots[r.lot] || {}; o.cleared = i.checked ? 'Y' : ''; o.block = r.block; keepDraft(); };
    });
    el.querySelectorAll('input[data-lon]').forEach(function (i) {
      i.onchange = function () { var r = rowOf(i.dataset.lon), o = draft.dispatch.lot[r.lot] = draft.dispatch.lot[r.lot] || {}; o.on = i.checked; if (i.checked && !num(o.n)) o.n = ''; keepDraft(); refreshRow(r); };
    });
    el.querySelectorAll('input[data-ln]').forEach(function (i) {
      i.oninput = function () {
        var r = rowOf(i.dataset.ln), o = draft.dispatch.lot[r.lot] = draft.dispatch.lot[r.lot] || { on: true };
        var raw = i.value.replace(/\D/g, ''); if (raw !== '' && num(raw) > r.open) { raw = String(r.open); i.value = raw; }
        o.on = true; o.n = raw === '' ? '0' : raw; keepDraft(); drawTot();
      };
    });
    drawTot();
  }
  function drawTot() { var t = $('#cl-tot'); if (t) t.innerHTML = totals(rows()); }

  function problemSheet(p) {
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
      p.map(function (x) { return '<p class="msg"><span class="bm">' + esc(x[0]) + '</span><span class="en">' + esc(x[1]) + '</span></p>'; }).join('') +
      '<div class="actions"><button class="btn btn-main" type="button" id="cp-ok">OK<small>Betulkan</small></button></div>',
      function (s) { s.querySelector('#cp-ok').onclick = ui().closeSheet; });
  }
  function save() {
    var list = rows(), dis = draft.dispatch;
    var lines = list.filter(function (r) { return !fixing() && r.field > 0 && (dik(r) > 0 || habis(r) === 'Y'); })
      .map(function (r) { return { lot: r.lot, block: r.block, bunches: String(dik(r)), cleared: habis(r) }; });
    var sel = lorrySel(list), extra = lorryOn() ? dis.extra : {};
    var total = sumOf(sel) + sumOf(extra), hasDis = lorryOn() && (total > 0 || dis.ramp_cleared === 'Y');
    var p = [];
    if (!lines.length && !hasDis) p.push(['Tiada apa untuk disimpan.', 'Nothing to save yet.']);
    if (lorryOn() && total > 0 && !dis.dn) p.push(['Isi no. nota hantar (DN).', 'Fill in the delivery note number.']);
    if (lorryOn() && total > 0 && !dis.lorry.trim()) p.push(['Isi no. lori.', 'Fill in the lorry number.']);
    if (lorryOn() && !total && dis.ramp_cleared !== 'Y') p.push(['Tanda petak ke lori, atau pilih TIADA LORI.', 'Tick the lots on the lorry, or choose NO LORRY.']);
    if (fixing() && !total) p.push(['Nota hantar yang dibetulkan mesti ada tandan.', 'A corrected delivery note needs its bunches.']);
    if (p.length) return problemSheet(p);
    var old = fixing() ? saved().find(function (s) { return s.dispatch && s.dispatch.trip === dis.replacing && !s.dispatch.replacedBy; }) : null;
    if (fixing() && !old) { ui().toast('Nota hantar lama tidak dijumpai · Old delivery note not found', 'bad'); return; }
    var now = new Date();
    // One trip code ties together the rows of this lorry (one per block); a correction keeps it.
    var trip = old ? old.dispatch.trip : 'LR-' + ctx.estate + '-' + (EA.phone() || 'P00') + '-' + EA.today().replace(/-/g, '') + '-' + EA.ui.hhmm(now).replace(':', '') + String(now.getSeconds()).padStart(2, '0') + String(now.getMilliseconds()).padStart(3, '0');
    var dcopy = null;
    if (hasDis) {
      var parts = EA.fh.harvest.takeParts(list, sel), blocks = {};
      parts.forEach(function (h) { blocks[h.block] = (blocks[h.block] || 0) + h.bunches; });
      Object.keys(extra).forEach(function (b) { if (num(extra[b])) blocks[b] = (blocks[b] || 0) + num(extra[b]); });
      dcopy = { trip: trip, dn: dis.dn, driver: dis.driver.trim(), lorry: dis.lorry.trim(), mill: dis.mill, ramp_cleared: dis.ramp_cleared,
                blocks: blocks, parts: parts, sel: sel, extra: JSON.parse(JSON.stringify(extra)), bunches: String(sumOf(blocks)) };
    }
    var rec = { date: old ? old.date : EA.today(), estate: ctx.estate, at: EA.ui.hhmm(now), tractor: '', loader: '', lines: lines, dispatch: dcopy, ids: [], disIds: {}, lotIds: {} };
    try {
      lines.forEach(function (l) {
        l.id = EA.save(TAB, ROOM, ctx.estate, { block: l.block, lot: l.lot, bunches: l.bunches, cleared: l.cleared, tractor: '', loader: '', note: '' }).id;
        rec.ids.push(l.id);
      });
      if (hasDis) EA.fh.harvest.writeDn(ctx.estate, rec, old);
    } catch (e) { ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad'); return; }
    var all = EA.local.get(K.saved, []);
    if (old) all.forEach(function (s) { if (s.dispatch && s.dispatch.trip === trip && !s.dispatch.replacedBy) s.dispatch.replacedBy = rec.at; });
    all.push(rec); EA.local.set(K.saved, all);
    dropDraft();
    ui().toast(old ? 'Nota hantar dibetulkan · Delivery note corrected' : 'Disimpan · Saved');
    render(el, ctx);
    if (navigator.onLine && EA.sendLink()) EA.send().then(function () {
      return Promise.all([EA.fh.refreshBacklog(ctx.estate), EA.fh.harvest.refreshOpen(ctx.estate)]);
    }).then(function () { if (el && document.body.contains(el) && !el.hidden && $('#cl-rows')) render(el, ctx); });
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
        var lot = {};
        Object.keys(d.sel || {}).forEach(function (k) { lot[k] = { on: true, n: String(d.sel[k]) }; });
        draft.dispatch = { on: true, lot: lot, extra: JSON.parse(JSON.stringify(d.extra || {})), lorry: d.lorry || '', mill: d.mill, dn: d.dn || '', driver: d.driver || '',
                           ramp_cleared: d.ramp_cleared || '', replacing: d.trip };
        draft.lots = {};
        keepDraft(); render(el, ctx);
        var sec = $('#cl-s1'); if (sec && sec.scrollIntoView) sec.scrollIntoView();
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
