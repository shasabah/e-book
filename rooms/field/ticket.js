// Field & Harvest room — screen 4: the mill ticket (Tiket kilang).
// From the Field & Harvest Brief (Sugut), item 5, laid out like the Sugut FFB
// tonnage file the estate clerk keeps today and on the papers the driver posts to
// WhatsApp after delivery (18 Oct 2026, Boustead Rimba Nilai): the weighbridge ticket
// (ticket no., DO no. = our delivery note no., 1st / 2nd weight and nett in kg),
// the grading sheet (bunches counted by the mill, rejects UR / EMP / RT).
//
// The ticket is tied to the lorry load keyed on Kutip & hantar (found by its delivery
// note number, printed on the ticket as DO No), which already
// says how many bunches of each block went on that lorry. So the nett tonnes are
// split by block here, from those bunches, and the load's bunch weight (ABW) is
// worked out: ABW kg = nett MT x 1000 / bunches. Harvesters' tonnes come from it later.
// Saved as one row per ticket (FH_TICKET) and one row per block (FH_TICKET_BLOCK).
// A correction is new rows that point to the old ones (nothing is deleted).
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};

  var TAB = 'FH_TICKET', TAB_BLK = 'FH_TICKET_BLOCK', ROOM = 'FH';
  var K = { draft: 'fh.ticketdraft', saved: 'fh.tickets', trips: 'fh.trips.' };
  var MAX_LOAD = 15;                 // from the brief: a lorry load not over 15 MT
  var ABW_LOW = 5, ABW_HIGH = 30;    // kg per bunch outside this: check the bunches or the weight

  var el, ctx, draft;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function canKey(u) { return u.role !== 'HQ'; }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function r3(n) { return Math.round(n * 1000) / 1000; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function sd(iso) { return EA.fh.shortDate(iso); }
  function mills() { return EA.lists.mills; }

  // ---------- phone memory ----------
  function saved() { var cut = new Date(); cut.setDate(cut.getDate() - 70); var from = cut.toISOString().slice(0, 10); return EA.local.get(K.saved, []).filter(function (t) { return t.date >= from; }); }
  function keepTicket(t) { var list = EA.local.get(K.saved, []).filter(function (x) { return !(x.estate === t.estate && x.ticket_no === t.ticket_no && x.date === t.date) && x.key !== t.key; }); list.push(t); EA.local.set(K.saved, list); }
  function blank() { return { date: EA.today(), estate: ctx.estate, trip: '', ticket_no: '', time: '', mill: mills()[0], do_no: '', lorry: '', driver: '', w1: '', w2: '', ded: '', nett: '', mill_bunches: '', blocks: {}, rej: { ur: '', emp: '', rott: '' }, note: '', replacing: '' }; }
  function loadDraft() { var all = EA.local.get(K.draft, {}), d = all[ctx.estate]; return d || blank(); }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[ctx.estate] = draft; EA.local.set(K.draft, all); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[ctx.estate]; EA.local.set(K.draft, all); }

  // ---------- lorry loads waiting for their ticket ----------
  // From the office (all phones), kept for no-signal; with no link, from this phone's own loads.
  function localTrips() {
    var out = [];
    EA.local.get('fh.collect', []).forEach(function (s) {
      if (s.estate !== ctx.estate || !s.dispatch || !s.dispatch.blocks) return;
      var total = Object.keys(s.dispatch.blocks).reduce(function (a, b) { return a + num(s.dispatch.blocks[b]); }, 0);
      if (!total) return;
      out.push({ trip: s.dispatch.trip || ('L-' + s.date + '-' + s.at), date: s.date, lorry: s.dispatch.lorry, mill: s.dispatch.mill, dn: s.dispatch.dn || '', driver: s.dispatch.driver || '', blocks: s.dispatch.blocks, bunches: total });
    });
    return out;
  }
  function trips() {
    var list = EA.sendLink() ? EA.local.get(K.trips + ctx.estate, []) : localTrips();
    var done = {};
    saved().forEach(function (t) { if (t.trip && t.estate === ctx.estate && !t.removed) done[t.trip] = true; });
    return list.filter(function (x) { return !done[x.trip] || x.trip === draft.trip; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  async function refreshTrips() {
    if (!EA.sendLink()) return;
    var r = await EA.ask('trips', { estate: ctx.estate });
    if (r && r.trips) { EA.local.set(K.trips + ctx.estate, r.trips); if (el && document.body.contains(el) && !el.hidden && $('#tk-trip')) drawTrip(); }
  }
  function tripLabel(x) {
    return sd(x.date) + (x.dn ? ' · DN ' + x.dn : '') + ' · ' + (x.lorry || 'lori') + ' · ' + Object.keys(x.blocks).sort().map(function (b) { return 'Blk ' + b + ' ' + x.blocks[b]; }).join(', ') + ' (' + x.bunches + ' tandan)';
  }

  // ---------- sums ----------
  function calc(d) {
    // The ticket prints kg; the office reports MT.
    var w1 = num(d.w1), w2 = num(d.w2);
    var nettKg = (w1 && w2) ? Math.round(w1 - w2 - num(d.ded)) : num(d.nett);
    var nett = r3(nettKg / 1000);
    var blocks = Object.keys(d.blocks).filter(function (b) { return num(d.blocks[b]) > 0; }).sort();
    var bunches = blocks.reduce(function (a, b) { return a + num(d.blocks[b]); }, 0);
    var split = {}, left = nett;
    blocks.forEach(function (b, i) {
      var mt = i === blocks.length - 1 ? r3(left) : r3(nett * num(d.blocks[b]) / bunches);
      left = r3(left - mt); split[b] = { bunches: num(d.blocks[b]), mt: mt };
    });
    var abw = bunches ? r2(nett * 1000 / bunches) : 0;
    var rejB = num(d.rej.ur) + num(d.rej.emp) + num(d.rej.rott);
    return { nettKg: nettKg, nett: nett, blocks: blocks, split: split, bunches: bunches, abw: abw, rejB: rejB, rejMt: r3(rejB * abw / 1000) };
  }
  function flags(d, c) {
    var f = [];
    if (c.nett > MAX_LOAD) f.push(['Muatan lebih ' + MAX_LOAD + ' MT.', 'Load over ' + MAX_LOAD + ' MT.']);
    var mb = num(d.mill_bunches);
    if (mb && c.bunches && mb !== c.bunches) f.push(['Kilang kira ' + mb + ' tandan, lori ' + c.bunches + ' (beza ' + (mb - c.bunches > 0 ? '+' : '') + (mb - c.bunches) + ').', 'The mill counted ' + mb + ' bunches, the lorry load says ' + c.bunches + '.']);
    if (c.bunches && c.nett && (c.abw < ABW_LOW || c.abw > ABW_HIGH)) f.push(['Purata berat tandan ' + c.abw + ' kg: semak tandan atau berat.', 'Bunch weight ' + c.abw + ' kg looks wrong: check the bunches or the weight.']);
    return f;
  }

  // ---------- the screen ----------
  function render(container, c) {
    el = container; ctx = c;
    draft = loadDraft();
    var testing = ctx.room.state !== 'live';
    var head = '<div class="room-top">' +
      '<button type="button" class="back-btn" id="tk-back">← <span class="inline"><span class="bm">Bilik</span></span></button>' +
      '<div class="grow"><h1>Tiket kilang</h1><span class="en">Mill ticket · ' + esc(ctx.estate) + '</span></div>' +
      (testing ? '<span class="test-badge">UJIAN · TEST</span>' : '') + '</div>' + EA.fh.tabs('ticket', ctx.user);
    if (!canKey(ctx.user)) {
      el.innerHTML = head + monthCard() + listCard();
      wireList(); $('#tk-back').onclick = function () { location.hash = ''; };
      return;
    }
    var mOpts = mills().concat(draft.mill && mills().indexOf(draft.mill) < 0 ? [draft.mill] : []);
    el.innerHTML = head +
      (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan tiket ' + esc(draft.replacing) + '. Yang lama kekal; yang baru menggantikannya.</span><span class="en">Correcting a ticket. The old one stays on record; this one replaces it.</span></p>' : '') +
      '<section class="card" aria-labelledby="tk-s1"><h2 id="tk-s1"><span class="step">1</span><span class="inline"><span class="bm">Lori mana?</span> · <span class="en">Which lorry load?</span></span></h2>' +
      '<div id="tk-tripbox"></div></section>' +

      '<section class="card" aria-labelledby="tk-s2"><h2 id="tk-s2"><span class="step">2</span><span class="inline"><span class="bm">Tiket</span> · <span class="en">The ticket</span></span></h2>' +
      '<div class="fields">' +
        field('tk-no', 'No. tiket', 'Ticket no.', draft.ticket_no, 'numeric', '1357847') +
        field('tk-do', 'No. DO / DN', 'DO no. = our delivery note no.; fills in the lorry load', draft.do_no, 'numeric', '8524') +
        '<div class="field"><label for="tk-date"><span class="bm">Tarikh</span><span class="en">Date on the ticket</span></label><input id="tk-date" type="date" class="text-input" value="' + esc(draft.date) + '" max="' + EA.today() + '"></div>' +
        field('tk-time', 'Masa', 'Time, e.g. 16.11', draft.time, 'decimal', '16.11') +
        '<div class="field"><label for="tk-mill"><span class="bm">Kilang</span><span class="en">Mill or collecting centre</span></label><select id="tk-mill" class="text-input">' +
          mOpts.map(function (m) { return '<option' + (m === draft.mill ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
        field('tk-lorry', 'No. lori', 'Lorry no.', draft.lorry, 'text', 'SJQ 5269') +
        field('tk-driver', 'Pemandu', 'Driver', draft.driver, 'text', '') +
      '</div>' +
      '<div class="fields">' +
        field('tk-w1', 'Berat masuk (kg)', '1st weight (in), kg', draft.w1, 'numeric', '32120') +
        field('tk-w2', 'Berat keluar (kg)', '2nd weight (out), kg', draft.w2, 'numeric', '16420') +
        field('tk-ded', 'Potongan (kg)', 'Deduction, kg', draft.ded, 'numeric', '0') +
        field('tk-nett', 'Bersih (kg)', 'Nett weight, kg', draft.nett, 'numeric', '15700') +
      '</div><p class="hint">Isi dalam kg seperti di tiket. · Key in kg, as printed on the ticket.</p></section>' +

      '<section class="card" aria-labelledby="tk-s3"><h2 id="tk-s3"><span class="step">3</span><span class="inline"><span class="bm">Ikut blok</span> · <span class="en">By block</span></span></h2>' +
      '<p class="hint">Tandan dari lori di Kutip & hantar. Tan dibahagi ikut tandan. · Bunches from the lorry load on Collect & dispatch. Tonnes are split by bunches.</p>' +
      '<div class="blk-in">' + EA.lists.blocksFor(ctx.estate).map(function (b) {
        return '<div class="field"><label for="tk-b-' + esc(b.block) + '"><span class="bm">Blok ' + esc(b.block) + ' · tandan</span><span class="en" data-mt="' + esc(b.block) + '">bunches</span></label>' +
          '<input id="tk-b-' + esc(b.block) + '" class="text-input" inputmode="numeric" data-blk="' + esc(b.block) + '" value="' + esc(draft.blocks[b.block] || '') + '" placeholder="0"></div>';
      }).join('') + '</div><p class="hint" id="tk-sum"></p></section>' +

      '<section class="card" aria-labelledby="tk-s4"><h2 id="tk-s4"><span class="step">4</span><span class="inline"><span class="bm">Gred dan tolakan</span> · <span class="en">Grading and rejects</span></span></h2>' +
      '<p class="hint">Dari kertas gred kilang. · From the mill\'s grading sheet.</p>' +
      '<div class="fields">' +
        field('tk-mb', 'Jumlah tandan (kilang)', 'Total bunches counted by the mill', draft.mill_bunches, 'numeric', '') +
      '</div><div class="fields">' +
        field('tk-ur', 'UR · Mentah', 'Unripe', draft.rej.ur, 'numeric', '0') +
        field('tk-emp', 'EMP · Kosong', 'Empty bunch', draft.rej.emp, 'numeric', '0') +
        field('tk-rott', 'RT · Busuk', 'Rotten', draft.rej.rott, 'numeric', '0') +
      '</div>' + field('tk-note', 'Catatan', 'Note (optional)', draft.note, 'text', '') +
      '<p class="hint" id="tk-rej"></p></section>' +

      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="tk-save">SAVE TICKET<small>Simpan tiket</small></button></div>' +
      monthCard() + listCard();

    $('#tk-back').onclick = function () { location.hash = ''; };
    var bind = { 'tk-no': 'ticket_no', 'tk-time': 'time', 'tk-do': 'do_no', 'tk-lorry': 'lorry', 'tk-driver': 'driver', 'tk-w1': 'w1', 'tk-w2': 'w2', 'tk-ded': 'ded', 'tk-nett': 'nett', 'tk-note': 'note', 'tk-mb': 'mill_bunches' };
    Object.keys(bind).forEach(function (id) {
      $('#' + id).oninput = function () {
        var v = this.value;
        if (id === 'tk-lorry') v = v.toUpperCase();
        if (id === 'tk-no' || id === 'tk-do') v = v.replace(/\s/g, '');
        if (['tk-w1', 'tk-w2', 'tk-ded', 'tk-nett', 'tk-mb'].indexOf(id) >= 0) v = v.replace(/[^\d]/g, '');
        draft[bind[id]] = v; keepDraft(); drawSums();
        if (id === 'tk-do' && !draft.trip) matchDn();
      };
    });
    $('#tk-date').onchange = function () { draft.date = this.value || EA.today(); keepDraft(); };
    $('#tk-mill').onchange = function () { draft.mill = this.value; keepDraft(); };
    ['ur', 'emp', 'rott'].forEach(function (k) { $('#tk-' + k).oninput = function () { draft.rej[k] = this.value.replace(/\D/g, ''); keepDraft(); drawSums(); }; });
    el.querySelectorAll('input[data-blk]').forEach(function (i) { i.oninput = function () { draft.blocks[i.dataset.blk] = i.value.replace(/\D/g, ''); keepDraft(); drawSums(); }; });
    $('#tk-save').onclick = save;
    drawTrip(); drawSums(); wireList();
    refreshTrips();
  }
  function field(id, bm, en, val, mode, ph) {
    return '<div class="field"><label for="' + id + '"><span class="bm">' + esc(bm) + '</span><span class="en">' + esc(en) + '</span></label>' +
      '<input id="' + id + '" class="text-input"' + (mode && mode !== 'text' ? ' inputmode="' + mode + '"' : '') + ' value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></div>';
  }

  // The DO no. on the mill ticket is our delivery note number: find that lorry load.
  function matchDn() {
    var x = trips().find(function (y) { return y.dn && y.dn === draft.do_no; });
    if (x) { useTrip(x); ui().toast('Lori dijumpai: DN ' + x.dn + ' · Lorry load found'); render(el, ctx); var i = $('#tk-do'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }
  function useTrip(x) {
    draft.trip = x.trip;
    draft.blocks = {}; Object.keys(x.blocks).forEach(function (b) { draft.blocks[b] = String(x.blocks[b]); });
    if (!draft.lorry && x.lorry) draft.lorry = x.lorry;
    if (!draft.driver && x.driver) draft.driver = x.driver;
    if (!draft.do_no && x.dn) draft.do_no = x.dn;
    var m = mills().find(function (mm) { return mm === x.mill; }); if (m) draft.mill = m;
    if (x.date && draft.date === EA.today() && x.date < EA.today()) draft.date = x.date;
    keepDraft();
  }
  function drawTrip() {
    var list = trips();
    $('#tk-tripbox').innerHTML = '<div class="field"><label for="tk-trip"><span class="bm">Muatan lori menunggu tiket</span><span class="en">Lorry loads waiting for their ticket</span></label>' +
      '<select id="tk-trip" class="text-input"><option value="">' + (list.length ? '— Pilih · Choose —' : '— Tiada · None: isi tandan blok sendiri · key the block bunches yourself —') + '</option>' +
      list.map(function (x) { return '<option value="' + esc(x.trip) + '"' + (x.trip === draft.trip ? ' selected' : '') + '>' + esc(tripLabel(x)) + '</option>'; }).join('') + '</select></div>';
    $('#tk-trip').onchange = function () {
      var v = this.value, x = list.find(function (y) { return y.trip === v; });
      if (x) useTrip(x); else { draft.trip = ''; keepDraft(); }
      render(el, ctx);
    };
  }
  function drawSums() {
    var c = calc(draft);
    if (num(draft.w1) && num(draft.w2) && $('#tk-nett') && document.activeElement !== $('#tk-nett')) { $('#tk-nett').value = String(c.nettKg); draft.nett = String(c.nettKg); }
    EA.lists.blocksFor(ctx.estate).forEach(function (b) {
      var s = c.split[b.block], t = el.querySelector('[data-mt="' + b.block + '"]');
      if (t) t.textContent = s ? s.mt.toFixed(2) + ' MT' : 'bunches';
    });
    var f = flags(draft, c);
    $('#tk-sum').innerHTML = 'Jumlah · Total: <b>' + c.bunches + '</b> tandan · <b>' + c.nett.toFixed(2) + '</b> MT · ABW <b>' + (c.abw || 0) + '</b> kg/tandan' +
      f.map(function (x) { return '<span class="warn" style="display:block;margin-top:6px">' + esc(x[0]) + ' · ' + esc(x[1]) + '</span>'; }).join('');
    $('#tk-rej').textContent = c.rejB ? 'Jumlah tolak · Total rejected: ' + c.rejB + ' tandan ≈ ' + c.rejMt.toFixed(2) + ' MT' : '';
  }

  // ---------- save ----------
  function problems(c) {
    var p = [];
    if (!draft.ticket_no) p.push(['Isi no. tiket.', 'Fill in the ticket number.']);
    if (!(c.nett > 0)) p.push(['Isi berat (berat 1 dan 2, atau bersih).', 'Fill in the weights (1st and 2nd, or nett).']);
    if (num(draft.w1) && num(draft.w2) && num(draft.w2) >= num(draft.w1)) p.push(['Berat keluar mesti kurang dari berat masuk.', 'The weight out must be less than the weight in.']);
    if (c.nett > 0 && c.nett < 0.5) p.push(['Bersih ' + c.nettKg + ' kg terlalu kecil: isi dalam kg, bukan MT.', 'Nett ' + c.nettKg + ' kg is too small: key kg, not MT.']);
    if (!c.bunches) p.push(['Isi tandan untuk sekurang-kurangnya satu blok.', 'Fill in the bunches for at least one block.']);
    var twice = saved().find(function (t) { return t.estate === ctx.estate && t.ticket_no === draft.ticket_no && !t.removed && t.key !== draft.replacing; });
    if (draft.ticket_no && twice) p.push(['Tiket ' + draft.ticket_no + ' sudah disimpan (' + sd(twice.date) + ').', 'Ticket ' + draft.ticket_no + ' is already saved. Use CORRECT on it instead.']);
    return p;
  }
  function save() {
    var c = calc(draft), p = problems(c);
    if (p.length) {
      ui().openSheet('<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
        p.map(function (x) { return '<p class="msg"><span class="bm">' + esc(x[0]) + '</span><span class="en">' + esc(x[1]) + '</span></p>'; }).join('') +
        '<div class="actions"><button class="btn btn-main" type="button" id="tp-ok">OK<small>Betulkan</small></button></div>',
        function (s) { s.querySelector('#tp-ok').onclick = ui().closeSheet; });
      return;
    }
    var old = draft.replacing ? saved().find(function (t) { return t.key === draft.replacing; }) : null;
    var t = { key: old ? old.key : ctx.estate + '-' + draft.ticket_no + '-' + Date.now().toString(36), date: draft.date, estate: ctx.estate,
              ticket_no: draft.ticket_no, trip: draft.trip, time: draft.time, mill: draft.mill, do_no: draft.do_no, lorry: draft.lorry.trim(), driver: draft.driver.trim(),
              w1: draft.w1, w2: draft.w2, ded: draft.ded, nettKg: c.nettKg, nett: c.nett, bunches: c.bunches, mill_bunches: num(draft.mill_bunches), abw: c.abw, split: c.split,
              rej: { ur: num(draft.rej.ur), emp: num(draft.rej.emp), rott: num(draft.rej.rott) }, rejB: c.rejB, rejMt: c.rejMt,
              note: draft.note.trim(), keyedName: ctx.user.name, rev: old ? (old.rev || 1) + 1 : 1, ids: { blocks: {} } };
    try {
      t.ids.ticket = EA.save(TAB, ROOM, ctx.estate, { date: t.date, ticket_no: t.ticket_no, trip: t.trip, mill: t.mill, do_no: t.do_no, lorry: t.lorry,
        driver: t.driver, time: t.time, first_kg: String(num(t.w1) || ''), second_kg: String(num(t.w2) || ''), deduct_kg: String(num(t.ded)), nett_kg: String(t.nettKg),
        nett_mt: String(t.nett), bunches: String(t.bunches), mill_bunches: String(t.mill_bunches || ''),
        abw_kg: String(t.abw), rej_ur: String(t.rej.ur), rej_emp: String(t.rej.emp), rej_rott: String(t.rej.rott), rej_mt: String(t.rejMt), note: t.note },
        old ? old.ids.ticket : '').id;
      var oldB = old ? Object.assign({}, old.ids.blocks) : {};
      c.blocks.forEach(function (b) {
        t.ids.blocks[b] = EA.save(TAB_BLK, ROOM, ctx.estate, { date: t.date, ticket_no: t.ticket_no, block: b, bunches: String(c.split[b].bunches), mt: String(c.split[b].mt) },
          oldB[b] || '').id;
        delete oldB[b];
      });
      Object.keys(oldB).forEach(function (b) {
        EA.save(TAB_BLK, ROOM, ctx.estate, { date: old.date, ticket_no: old.ticket_no, block: b, bunches: String(old.split[b].bunches), mt: String(old.split[b].mt) }, oldB[b], 'removed');
      });
    } catch (e) { ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad'); return; }
    keepTicket(t);
    dropDraft();
    ui().toast('Tiket disimpan · Ticket saved' + (old ? ' (dibetulkan · corrected)' : ''));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
    showText(t.key);
  }

  // ---------- month to date, and the list ----------
  function monthTickets() {
    var m = EA.today().slice(0, 7);
    return saved().filter(function (t) { return t.estate === ctx.estate && t.date.slice(0, 7) === m && !t.removed; });
  }
  function monthTotals() {
    var list = monthTickets(), byBlock = {}, byMill = {}, mt = 0, bunches = 0, rej = 0;
    list.forEach(function (t) {
      mt += t.nett; bunches += t.bunches; rej += t.rejB;
      Object.keys(t.split).forEach(function (b) { byBlock[b] = r3((byBlock[b] || 0) + t.split[b].mt); });
      byMill[t.mill] = r3((byMill[t.mill] || 0) + t.nett);
    });
    return { n: list.length, mt: r3(mt), bunches: bunches, abw: bunches ? r2(mt * 1000 / bunches) : 0, rej: rej, byBlock: byBlock, byMill: byMill };
  }
  function monthCard() {
    var s = monthTotals();
    var d = new Date(EA.today() + 'T00:00:00');
    return '<section class="card" id="tk-month"><h2><span class="inline"><span class="bm">Bulan ini · ' + esc(ui().monBm[d.getMonth()]) + '</span> · <span class="en">Month to date (tickets on this phone)</span></span></h2>' +
      (s.n ? '<div class="list-line"><div><b>' + s.mt.toFixed(2) + ' MT · ' + s.n + ' tiket · ABW ' + s.abw + ' kg</b><span class="en">' +
        Object.keys(s.byBlock).sort().map(function (b) { return 'Blk ' + esc(b) + ' ' + s.byBlock[b].toFixed(2); }).join(' · ') + '</span><span class="en">' +
        Object.keys(s.byMill).map(function (m) { return esc(m) + ' ' + s.byMill[m].toFixed(2); }).join(' · ') + (s.rej ? ' · tolak · rejected ' + s.rej + ' tandan' : '') + '</span></div></div>'
        : '<p class="hint">Belum ada tiket bulan ini. · No tickets this month yet.</p>') + '</section>';
  }
  function listCard() {
    var list = saved().filter(function (t) { return t.estate === ctx.estate && !t.removed; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; }).slice(0, 15);
    return '<section class="card" id="tk-list"><h2><span class="inline"><span class="bm">Tiket terkini</span> · <span class="en">Recent tickets on this phone</span></span></h2>' +
      (list.length ? list.map(function (t) {
        var waiting = [t.ids.ticket].concat(Object.keys(t.ids.blocks).map(function (b) { return t.ids.blocks[b]; })).some(function (i) { return EA.isWaiting(i); });
        return '<div class="list-line"><div><b>' + esc(sd(t.date)) + ' · ' + esc(t.ticket_no) + ' · ' + t.nett.toFixed(2) + ' MT</b><span class="en">' + esc(t.mill) + ' · ' +
          Object.keys(t.split).sort().map(function (b) { return 'Blk ' + esc(b) + ' ' + t.split[b].mt.toFixed(2); }).join(', ') + ' · ABW ' + t.abw + ' kg</span>' +
          '<span class="pill ' + (waiting ? 'wait">Menunggu · Waiting' : 'ok">Dihantar · Sent') + '</span></div>' +
          '<div class="acts"><button type="button" class="btn btn-ghost" data-tview="' + esc(t.key) + '">VIEW<small>Lihat</small></button>' +
          (canKey(ctx.user) ? '<button type="button" class="btn btn-ghost" data-tfix="' + esc(t.key) + '">CORRECT<small>Betulkan</small></button>' : '') + '</div></div>';
      }).join('') : '<p class="hint">Belum ada. · None yet.</p>') + '</section>';
  }
  function wireList() {
    el.querySelectorAll('[data-tview]').forEach(function (b) { b.onclick = function () { showText(b.dataset.tview); }; });
    el.querySelectorAll('[data-tfix]').forEach(function (b) {
      b.onclick = function () {
        var t = saved().find(function (x) { return x.key === b.dataset.tfix; });
        if (!t) return;
        draft = { date: t.date, estate: t.estate, trip: t.trip, ticket_no: t.ticket_no, time: t.time, mill: t.mill, do_no: t.do_no, lorry: t.lorry, driver: t.driver,
                  w1: t.w1, w2: t.w2, ded: t.ded || '', nett: String(t.nettKg || Math.round(t.nett * 1000)), mill_bunches: t.mill_bunches ? String(t.mill_bunches) : '', blocks: {}, rej: { ur: String(t.rej.ur || ''), emp: String(t.rej.emp || ''), rott: String(t.rej.rott || '') },
                  note: t.note, replacing: t.key };
        Object.keys(t.split).forEach(function (k) { draft.blocks[k] = String(t.split[k].bunches); });
        keepDraft(); render(el, ctx); window.scrollTo(0, 0);
      };
    });
  }

  // ---------- the ticket text for WhatsApp ----------
  function ticketText(t) {
    var est = EA.lists.estate(t.estate), s = monthTotals();
    var L = [];
    L.push('*TIKET KILANG ' + (est ? est.company + ' ' : '') + t.estate + '*' + (t.rev > 1 ? ' _(dibetulkan · corrected)_' : ''));
    L.push('Tiket ' + t.ticket_no + ' · ' + t.mill + ' · ' + sd(t.date) + (t.time ? ' ' + t.time : ''));
    L.push('Lori ' + (t.lorry || '-') + (t.do_no ? ' · DO ' + t.do_no : ''));
    L.push('Bersih · Nett: ' + t.nett.toFixed(2) + ' MT' + (num(t.w1) && num(t.w2) ? ' (' + num(t.w1) + ' − ' + num(t.w2) + (num(t.ded) ? ' − ' + num(t.ded) : '') + ' kg)' : ''));
    Object.keys(t.split).sort().forEach(function (b) { L.push('Blk ' + b + ': ' + t.split[b].bunches + ' tandan, ' + t.split[b].mt.toFixed(2) + ' MT'); });
    L.push('ABW: ' + t.abw + ' kg/tandan' + (t.mill_bunches && t.mill_bunches !== t.bunches ? ' · kilang kira ' + t.mill_bunches + ' tandan (lori ' + t.bunches + ')' : ''));
    if (t.rejB) L.push('Tolak · Reject: ' + t.rejB + ' tandan (UR ' + t.rej.ur + ', EMP ' + t.rej.emp + ', RT ' + t.rej.rott + ') ≈ ' + t.rejMt.toFixed(2) + ' MT');
    if (t.note) L.push('Catatan: ' + t.note);
    L.push('Bulan ini · Month to date: ' + s.mt.toFixed(2) + ' MT (' + s.n + ' tiket)');
    L.push('Disediakan: ' + (t.keyedName || ''));
    return L.join('\n');
  }
  function showText(key) {
    var t = saved().find(function (x) { return x.key === key; });
    if (!t) return;
    var text = ticketText(t);
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Tiket untuk WhatsApp</span><span class="en">Ticket for the WhatsApp group</span></h2>' +
      '<pre class="chit" id="tk-text">' + esc(text) + '</pre>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="tt-copy">COPY<small>Salin</small></button>' +
      '<button class="btn btn-ok" type="button" id="tt-wa">WHATSAPP<small>Hantar ke WhatsApp</small></button></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="tt-close">CLOSE<small>Tutup</small></button></div>',
      function (s) {
        s.querySelector('#tt-close').onclick = ui().closeSheet;
        s.querySelector('#tt-copy').onclick = function () { EA.fh.copyText(text); };
        s.querySelector('#tt-wa').onclick = function () {
          if (navigator.share) navigator.share({ text: text }).catch(function () {});
          else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
        };
      });
  }

  document.addEventListener('ea:sync', function () {
    if (!el || !document.body.contains(el) || el.hidden || !$('#tk-list')) return;
    $('#tk-list').outerHTML = listCard(); wireList();
  });

  EA.fh.ticket = { render: render };
})();
