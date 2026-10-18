// Field & Harvest room — screen 4: the mill ticket (Tiket kilang).
// From the Field & Harvest Brief (Sugut), item 5, and the papers the driver posts to
// WhatsApp after delivery (18 Oct 2026, Boustead Rimba Nilai).
//
// v19 (agreed 18 Oct 2026): the staff ticks the lots on the lorry when writing the delivery
// note (Kutip & hantar). The estate clerk keys the weighbridge ticket from the WhatsApp post
// (ticket no., DO no. = our delivery note no., weight in / out / nett in kg) and the grading
// with it. Typing the DO no. finds the delivery note and its lots. The staff can still key a
// ticket when the clerk is away. A lorry with no lots ticked on its delivery note (or no
// delivery note) still has its lots ticked here, as before.
// v20 (Yu Chen): on the staff's ticket screen the lorry waiting is picked by itself (the oldest),
// and its lots show as choices the staff can still change, with the weights on the same screen.
// A change of lots there corrects the delivery note too (new rows replace its rows), so the
// lorry, its lots and the ticket always agree. The clerk sees the lots as the staff left them.
// v21 (Yu Chen): the staff keys no weights. The staff's screen is only the lorry waiting and its
// lots (SAVE LOTS corrects the delivery note); the weights and grading are keyed by the clerk.
// Then the batch closes on the ticket:
//   ABW kg = nett MT x 1000 / bunches on the ticket
//   each harvester's MT = his bunches x ABW  (the base of harvesting pay)
// The mill's grading sheet is keyed by the estate clerk from the WhatsApp group, as a step
// of its own (for now; to be upgraded later). Poor grading becomes an alert on the next
// morning's chit, where the staff says what is going on, for the Assistant Manager.
// Saved as FH_TICKET (one row), FH_TICKET_BLOCK (one per block), FH_TICKET_HARV (one per
// harvester line) and FH_GRADING (one per ticket, by the clerk).
// A correction is new rows that point to the old ones (nothing is deleted).
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};

  var TAB = 'FH_TICKET', TAB_BLK = 'FH_TICKET_BLOCK', TAB_HARV = 'FH_TICKET_HARV', TAB_GRADE = 'FH_GRADING', ROOM = 'FH';
  var K = { draft: 'fh.ticketdraft', saved: 'fh.tickets', trips: 'fh.trips.', harv: 'fh.harv.', grades: 'fh.gradings', ungraded: 'fh.ungraded.' };
  var MAX_LOAD = 15;                 // from the brief: a lorry load not over 15 MT
  var ABW_LOW = 5, ABW_HIGH = 30;    // kg per bunch outside this: check the lots chosen or the weight
  var GRADES = [                     // the mill's grading sheet, % of the bunches graded
    ['ur', 'UR', 'Mentah', 'Unripe'], ['udr', 'UDR', 'Kurang masak', 'Under ripe'], ['or', 'OR', 'Terlebih masak', 'Over ripe'],
    ['r', 'R', 'Masak', 'Ripe'], ['eb', 'EB', 'Tandan kosong', 'Empty bunch'],
    ['rt', 'RT', 'Busuk', 'Rotten'], ['ls', 'LS', 'Tangkai panjang', 'Long stalk'], ['pd', 'PD', 'Rosak perosak', 'Pest damage'],
    ['pf', 'PF', 'Buah tak jadi', 'Poor fruit set'], ['ds', 'DS', 'Berpenyakit', 'Diseased'], ['dt', 'DT', 'Kotor', 'Dirty'], ['dr', 'DR', 'Dura', 'Dura']];

  var el, ctx, draft;
  function ui() { return EA.ui; }
  function esc(s) { return EA.ui.esc(s); }
  function $(sel) { return el.querySelector(sel); }
  function canKey(u) { return u.role !== 'HQ'; }
  function canGrade(u) { return u.role === 'Clerk' || u.role === 'Owner'; }    // for now: the estate clerk
  function canPick(u) { return u.role !== 'Clerk'; }                           // the staff chooses the lots; the clerk keys from WhatsApp
  function weighs(u) { return u.role === 'Clerk' || u.role === 'Owner'; }      // only the clerk keys the ticket's weights (v21)
  function staffMode() { return canKey(ctx.user) && !weighs(ctx.user); }       // lorry and lots only, no weights
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function r3(n) { return Math.round(n * 1000) / 1000; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function sd(iso) { return EA.fh.shortDate(iso); }
  function mills() { return EA.lists.mills; }
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }
  function byLot(a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true }); }

  // ---------- phone memory ----------
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
  function saved() { return EA.local.get(K.saved, []).filter(function (t) { return t.date >= daysAgo(70); }); }
  function keepTicket(t) { var list = EA.local.get(K.saved, []).filter(function (x) { return x.key !== t.key; }); list.push(t); EA.local.set(K.saved, list); }
  function gradings() { return EA.local.get(K.grades, []).filter(function (g) { return g.date >= daysAgo(70); }); }
  function keepGrading(g) { var list = EA.local.get(K.grades, []).filter(function (x) { return !(x.estate === g.estate && x.ticket_no === g.ticket_no); }); list.push(g); EA.local.set(K.grades, list); }
  function blank() {
    return { date: EA.today(), estate: ctx.estate, trip: '', lorryBunches: 0, ticket_no: '', time: '', mill: mills()[0], do_no: '', lorry: '', driver: '',
             w1: '', w2: '', ded: '', nett: '', blocks: {}, sel: {}, selTouched: false, note: '', replacing: '', dnLots: [], dnRef: null, extra: {}, noAuto: false };
  }
  function loadDraft() {
    var all = EA.local.get(K.draft, {}), d = all[ctx.estate];
    if (!d) return blank();
    var b = blank(); Object.keys(b).forEach(function (k) { if (d[k] == null) d[k] = b[k]; });
    return d;
  }
  function keepDraft() { var all = EA.local.get(K.draft, {}); all[ctx.estate] = draft; EA.local.set(K.draft, all); }
  function dropDraft() { var all = EA.local.get(K.draft, {}); delete all[ctx.estate]; EA.local.set(K.draft, all); }

  // ---------- lorry loads waiting for their ticket ----------
  function localTrips() {
    var out = [];
    EA.local.get('fh.collect', []).forEach(function (s) {
      if (s.estate !== ctx.estate || !s.dispatch || !s.dispatch.blocks || s.dispatch.replacedBy) return;
      var total = Object.keys(s.dispatch.blocks).reduce(function (a, b) { return a + num(s.dispatch.blocks[b]); }, 0);
      if (!total) return;
      out.push({ trip: s.dispatch.trip || ('L-' + s.date + '-' + s.at), date: s.date, lorry: s.dispatch.lorry, mill: s.dispatch.mill, dn: s.dispatch.dn || '', driver: s.dispatch.driver || '',
                 ramp_cleared: s.dispatch.ramp_cleared || '', blocks: s.dispatch.blocks, bunches: total, blockIds: s.disIds || {},
                 lots: (s.dispatch.parts || []).map(function (h) { return Object.assign({}, h, { row: (s.lotIds || {})[h.id] || '' }); }) });
    });
    return out;
  }
  function trips() {
    var list = localTrips();
    if (EA.sendLink()) {    // the office list, plus this phone's own lorries not yet there (a correction replaces the office copy)
      var mine = {}; list.forEach(function (x) { mine[x.trip] = x; });
      list = EA.local.get(K.trips + ctx.estate, []).filter(function (x) { return !mine[x.trip]; }).concat(list);
    }
    var done = {};
    saved().forEach(function (t) { if (t.trip && t.estate === ctx.estate && t.key !== draft.replacing) done[t.trip] = true; });
    return list.filter(function (x) { return !done[x.trip] || x.trip === draft.trip; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  function tripLabel(x) {
    return sd(x.date) + (x.dn ? ' · DN ' + x.dn : '') + ' · ' + (x.lorry || 'lori') + ' · ' + Object.keys(x.blocks).sort().map(function (b) { return 'Blk ' + b + ' ' + x.blocks[b]; }).join(', ') + ' (' + x.bunches + ' tandan)';
  }

  // ---------- harvest not yet on a lorry or ticket (shared with the delivery note) ----------
  function fromDn() { return (draft.dnLots || []).length > 0; }    // the lots come from the delivery note
  // The staff may change the delivery note's lots here, when its rows are known (so they can be replaced).
  function pickDn() { return canPick(ctx.user) && !!draft.trip && !!draft.dnRef && Object.keys(draft.dnRef.disIds || {}).length > 0; }
  // Open lots; when the staff is choosing the delivery note's lots, that lorry's own lots are given back.
  function lots() {
    var skip = { ticket: draft.replacing };
    if (pickDn()) { skip.trip = draft.trip; skip.parts = draft.dnRef.parts; }
    return EA.fh.harvest.openLots(ctx.estate, skip);
  }
  function sameParts(a, b) {
    var m = {}; a.forEach(function (h) { m[h.id] = (m[h.id] || 0) + num(h.bunches); });
    b.forEach(function (h) { m[h.id] = (m[h.id] || 0) - num(h.bunches); });
    return Object.keys(m).every(function (k) { return m[k] === 0; });
  }
  // With no lorry chosen, take the oldest waiting (the staff always; the clerk only when there is just one).
  function autoPick() {
    if (draft.trip || draft.replacing || draft.noAuto || draft.do_no || !canKey(ctx.user)) return false;
    var list = trips().slice().sort(function (a, b) { return a.date === b.date ? (a.trip < b.trip ? -1 : 1) : (a.date < b.date ? -1 : 1); });
    if (!list.length || (!canPick(ctx.user) && list.length > 1)) return false;
    useTrip(list[0]);
    return true;
  }
  async function refreshOffice() {
    if (!EA.sendLink()) return;
    await EA.fh.harvest.refreshOpen(ctx.estate);
    if (!draft.trip && draft.do_no) matchDn(true);
    else if (autoPick() && el && document.body.contains(el) && !el.hidden && $('#tk-tripbox')) render(el, ctx);
    if (canGrade(ctx.user)) { var r3x = await EA.ask('ungraded', { estate: ctx.estate }); if (r3x && r3x.tickets) EA.local.set(K.ungraded + ctx.estate, r3x.tickets); }
    if (el && document.body.contains(el) && !el.hidden && $('#tk-tripbox')) { keepDraft(); drawTrip(); drawLots(); drawSums(); drawGradeList(); }
  }

  // ---------- sums ----------
  function calc(d) {
    var w1 = num(d.w1), w2 = num(d.w2);
    var nettKg = (w1 && w2) ? Math.round(w1 - w2 - num(d.ded)) : num(d.nett);   // the ticket prints kg
    var nett = r3(nettKg / 1000);
    var parts = [], open = {}, after = {}, byBlock = {}, dn = fromDn() && d === draft, pick = pickDn() && d === draft;
    var list = lots();
    list.forEach(function (l) { open[l.block] = (open[l.block] || 0) + l.open; });
    if (pick) {
      // The staff's choice, starting from the delivery note's lots; bunches with no harvest record stay as on the lorry.
      parts = EA.fh.harvest.takeParts(list, d.sel);
      parts.forEach(function (h) { byBlock[h.block] = (byBlock[h.block] || 0) + h.bunches; });
      Object.keys(d.extra || {}).forEach(function (b) { if (num(d.extra[b]) > 0) byBlock[b] = (byBlock[b] || 0) + num(d.extra[b]); });
      Object.keys(open).forEach(function (b) { after[b] = open[b] - parts.filter(function (h) { return h.block === b; }).reduce(function (a, h) { return a + h.bunches; }, 0); });
    } else if (dn) {
      // The lots are those ticked on the delivery note; the block totals also hold any bunches with no harvest record.
      parts = d.dnLots.map(function (h) { return { id: h.id, date: h.date, lot: h.lot, block: h.block, worker_id: h.worker_id, bunches: num(h.bunches) }; });
      Object.keys(d.blocks).forEach(function (b) { if (num(d.blocks[b]) > 0) byBlock[b] = num(d.blocks[b]); });
      Object.keys(open).forEach(function (b) { after[b] = open[b]; });     // already off the open list when the lorry left
    } else {
      parts = EA.fh.harvest.takeParts(list, d.sel);
      if (parts.length) parts.forEach(function (h) { byBlock[h.block] = (byBlock[h.block] || 0) + h.bunches; });
      else Object.keys(d.blocks).forEach(function (b) { if (num(d.blocks[b]) > 0) byBlock[b] = num(d.blocks[b]); });
      Object.keys(open).forEach(function (b) { after[b] = open[b] - (parts.length ? (byBlock[b] || 0) : 0); });
    }
    var blocks = Object.keys(byBlock).sort();
    var bunches = blocks.reduce(function (a, b) { return a + byBlock[b]; }, 0);
    var abw = bunches ? r2(nett * 1000 / bunches) : 0;
    function share(items, get, whole) {      // split the nett tonnes by bunches; when the items hold every bunch, the last one takes the rounding
      var left = nett;
      return items.map(function (it, i) { var mt = whole && i === items.length - 1 ? r3(left) : r3(nett * get(it) / bunches); left = r3(left - mt); return mt; });
    }
    var split = {}, bm = share(blocks, function (b) { return byBlock[b]; }, true);
    blocks.forEach(function (b, i) { split[b] = { bunches: byBlock[b], mt: bm[i] }; });
    var inParts = parts.reduce(function (a, h) { return a + h.bunches; }, 0);
    var hm = share(parts, function (h) { return h.bunches; }, inParts === bunches);
    parts.forEach(function (h, i) { h.mt = hm[i]; });
    return { nettKg: nettKg, nett: nett, blocks: blocks, split: split, bunches: bunches, abw: abw, harv: parts, balance: after, source: (dn || pick) ? 'dn' : 'ticket' };
  }
  function flags(d, c) {
    var f = [];
    if (c.nett > MAX_LOAD) f.push(['Muatan lebih ' + MAX_LOAD + ' MT.', 'Load over ' + MAX_LOAD + ' MT.']);
    if (c.bunches && c.nett && (c.abw < ABW_LOW || c.abw > ABW_HIGH)) f.push(['Purata berat tandan ' + c.abw + ' kg: semak petak yang dipilih atau berat.', 'Bunch weight ' + c.abw + ' kg looks wrong: check the lots chosen or the weight.']);
    if (d.lorryBunches && c.bunches && d.lorryBunches !== c.bunches) f.push(['Petak dipilih ' + c.bunches + ' tandan, lori ' + d.lorryBunches + ' (beza ' + (c.bunches - d.lorryBunches > 0 ? '+' : '') + (c.bunches - d.lorryBunches) + ').', 'Lots chosen ' + c.bunches + ' bunches, the lorry load says ' + d.lorryBunches + '.']);
    return f;
  }

  // ---------- the screen ----------
  function render(container, c) {
    el = container; ctx = c;
    draft = loadDraft();
    if (autoPick()) keepDraft();
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
    if (staffMode()) return renderStaff(head);
    var mOpts = mills().concat(draft.mill && mills().indexOf(draft.mill) < 0 ? [draft.mill] : []);
    el.innerHTML = head +
      (canGrade(ctx.user) ? '<section class="card" id="tk-gradebox" aria-labelledby="tk-g0"><h2 id="tk-g0"><span class="step">G</span><span class="inline"><span class="bm">Gred kilang (kerani)</span> · <span class="en">Mill grading, keyed by the clerk from WhatsApp</span></span></h2><div id="tk-gradelist"></div></section>' : '') +
      (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan tiket ' + esc(draft.ticket_no) + '. Yang lama kekal; yang baru menggantikannya.</span><span class="en">Correcting a ticket. The old one stays on record; this one replaces it.</span></p>' : '') +

      '<section class="card" aria-labelledby="tk-s1"><h2 id="tk-s1"><span class="step">1</span><span class="inline"><span class="bm">Tiket</span> · <span class="en">The weighbridge ticket</span></span></h2>' +
      '<div class="fields">' +
        field('tk-no', 'No. tiket', 'Ticket no.', draft.ticket_no, 'numeric', '') +
        field('tk-do', 'No. DO / DN', 'DO no. = our delivery note no.; finds the lorry and its lots', draft.do_no, 'numeric', '') +
      '</div><div id="tk-tripbox"></div><div class="fields">' +
        '<div class="field"><label for="tk-date"><span class="bm">Tarikh</span><span class="en">Date on the ticket</span></label><input id="tk-date" type="date" class="text-input" value="' + esc(draft.date) + '" max="' + EA.today() + '"></div>' +
        field('tk-time', 'Masa', 'Time, e.g. 15.34', draft.time, 'decimal', '') +
        '<div class="field"><label for="tk-mill"><span class="bm">Kilang</span><span class="en">Mill or collecting centre</span></label><select id="tk-mill" class="text-input">' +
          mOpts.map(function (m) { return '<option' + (m === draft.mill ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
        field('tk-lorry', 'No. lori', 'Lorry no.', draft.lorry, 'text', '') +
        field('tk-driver', 'Pemandu', 'Driver', draft.driver, 'text', '') +
      '</div><div class="fields">' +
        field('tk-w1', 'Berat masuk (kg)', '1st weight (in), kg', draft.w1, 'numeric', '') +
        field('tk-w2', 'Berat keluar (kg)', '2nd weight (out), kg', draft.w2, 'numeric', '') +
        field('tk-ded', 'Potongan (kg)', 'Deduction, kg', draft.ded, 'numeric', '') +
        field('tk-nett', 'Bersih (kg)', 'Nett weight, kg', draft.nett, 'numeric', '') +
      '</div><p class="hint">Isi dalam kg seperti di tiket. · Key in kg, as printed on the ticket.</p></section>' +

      '<section class="card" aria-labelledby="tk-s2"><h2 id="tk-s2"><span class="step">2</span><span class="inline"><span class="bm">Petak dalam lori ini</span> · <span class="en">The lots on this lorry</span></span></h2>' +
      (pickDn() ? '<p class="hint">Petak dari nota hantar DN ' + esc(draft.dnRef.dn) + '. Ubah jika perlu: tanda / buang petak, atau ubah tandan. Nota hantar dibetulkan bersama tiket. · The lots from the delivery note. Change them if needed: tick or untick, or change the bunches. The delivery note is corrected with the ticket.</p>'
        : fromDn() ? '<p class="hint">Dari nota hantar DN ' + esc(draft.do_no) + ' (ditanda oleh staf). Untuk ubah, staf betulkan DN di Kutip & hantar sebelum tiket disimpan. · From the delivery note, ticked by the staff. To change them, the staff corrects the delivery note on Collect & dispatch before the ticket is saved.</p>'
        : !canPick(ctx.user) ? ''      // the clerk: the note is drawn with the lots (she never ticks lots)
        : '<p class="hint">Nota hantar ini tiada petak. Tanda petak, dan ubah tandan jika hanya sebahagian. Yang tidak dipilih kekal sebagai baki blok. · This delivery note has no lots ticked. Tick the lots, and change the bunches if only part went. What is not chosen stays as the block\'s balance.</p>') +
      '<div id="tk-lots"></div><div id="tk-manual"></div><p class="hint" id="tk-sum"></p><div id="tk-bal"></div><div id="tk-harv"></div></section>' +

      (canGrade(ctx.user) ? '<p class="hint">Selepas simpan, isi gred kilang dari kertas gred yang sama. · After saving, key the mill grading from the same WhatsApp post.</p>'
        : '<p class="hint">Biasanya kerani ladang isi tiket dan gred dari kumpulan WhatsApp. Staf isi tiket hanya jika kerani tiada. · Usually the estate clerk keys the ticket and the grading from the WhatsApp group. The staff keys a ticket only when the clerk is away.</p>') +
      field('tk-note', 'Catatan', 'Note (optional)', draft.note, 'text', '') +
      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="tk-save">SAVE TICKET<small>Simpan tiket</small></button></div>' +
      monthCard() + listCard();

    $('#tk-back').onclick = function () { location.hash = ''; };
    var bind = { 'tk-no': 'ticket_no', 'tk-time': 'time', 'tk-do': 'do_no', 'tk-lorry': 'lorry', 'tk-driver': 'driver', 'tk-w1': 'w1', 'tk-w2': 'w2', 'tk-ded': 'ded', 'tk-nett': 'nett', 'tk-note': 'note' };
    Object.keys(bind).forEach(function (id) {
      $('#' + id).oninput = function () {
        var v = this.value;
        if (id === 'tk-lorry') v = v.toUpperCase();
        if (id === 'tk-no' || id === 'tk-do') v = v.replace(/\s/g, '');
        if (['tk-w1', 'tk-w2', 'tk-ded', 'tk-nett'].indexOf(id) >= 0) v = v.replace(/[^\d]/g, '');
        draft[bind[id]] = v; keepDraft(); drawSums();
        if (id === 'tk-do' && !draft.trip) matchDn();
        if (id === 'tk-do' && draft.trip && draft.tripDn && draft.do_no !== draft.tripDn) { draft.trip = ''; draft.lorryBunches = 0; draft.dnLots = []; draft.dnRef = null; draft.blocks = {}; draft.sel = {}; draft.extra = {}; draft.noAuto = true; keepDraft(); matchDn() || render(el, ctx); var i2 = $('#tk-do'); if (i2) { i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); } }
      };
    });
    $('#tk-date').onchange = function () { draft.date = this.value || EA.today(); keepDraft(); };
    $('#tk-mill').onchange = function () { draft.mill = this.value; keepDraft(); };
    $('#tk-save').onclick = save;
    drawTrip(); drawLots(); drawSums(); wireList(); drawGradeList();
    refreshOffice();
  }
  // The staff's screen (v21): the lorry waiting for its ticket and its lots. No weights: the clerk keys them.
  function renderStaff(head) {
    var ref = draft.trip ? draft.dnRef : null;
    el.innerHTML = head +
      '<p class="hint">Staf pilih petak untuk setiap lori. Berat dan gred diisi oleh kerani dari WhatsApp. · The staff chooses the lots for each lorry. The weights and grading are keyed by the clerk from WhatsApp.</p>' +
      '<section class="card" aria-labelledby="tk-s1"><h2 id="tk-s1"><span class="step">1</span><span class="inline"><span class="bm">Lori menunggu tiket</span> · <span class="en">Lorry waiting for its mill ticket</span></span></h2>' +
      '<div id="tk-tripbox"></div>' +
      (ref ? '<p class="hint">DN <b>' + esc(ref.dn || '-') + '</b> · ' + esc(sd(ref.date || '')) + ' · ' + esc(ref.lorry || '') + (ref.driver ? ' · ' + esc(ref.driver) : '') + (ref.mill ? ' · ' + esc(ref.mill) : '') + '</p>' : '') +
      '</section>' +
      '<section class="card" aria-labelledby="tk-s2"><h2 id="tk-s2"><span class="step">2</span><span class="inline"><span class="bm">Petak dalam lori ini</span> · <span class="en">The lots on this lorry</span></span></h2>' +
      (pickDn() ? '<p class="hint">Tanda / buang petak, atau ubah tandan jika hanya sebahagian. Yang tidak ditanda kekal sebagai baki blok. SAVE LOTS membetulkan nota hantar. · Tick or untick lots, or change the bunches if only part went. What is not ticked stays as the block\'s balance. SAVE LOTS corrects the delivery note.</p>' : '') +
      '<div id="tk-lots"></div><div id="tk-manual"></div><p class="hint" id="tk-sum"></p><div id="tk-bal"></div><div id="tk-harv"></div></section>' +
      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="tk-savelots">SAVE LOTS<small>Simpan petak</small></button></div>' +
      monthCard() + listCard();
    $('#tk-back').onclick = function () { location.hash = ''; };
    $('#tk-savelots').onclick = saveLots;
    drawTrip(); drawLots(); drawSums(); wireList();
    refreshOffice();
  }
  function field(id, bm, en, val, mode, ph) {
    return '<div class="field"><label for="' + id + '"><span class="bm">' + esc(bm) + '</span><span class="en">' + esc(en) + '</span></label>' +
      '<input id="' + id + '" class="text-input"' + (mode && mode !== 'text' ? ' inputmode="' + mode + '"' : '') + ' value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></div>';
  }

  // The DO no. on the mill ticket is our delivery note number: find that lorry load.
  function matchDn(quiet) {
    var x = trips().find(function (y) { return y.dn && y.dn === draft.do_no; });
    if (!x) return false;
    useTrip(x); if (!quiet) ui().toast('Lori dijumpai: DN ' + x.dn + ' · Lorry load found');
    render(el, ctx); var i = $('#tk-do'); if (i && !quiet) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    return true;
  }
  function useTrip(x) {
    draft.trip = x.trip; draft.lorryBunches = x.bunches; draft.tripDn = x.dn || '';
    draft.dnLots = (x.lots || []).map(function (h) { return Object.assign({}, h); });
    var lotIds = {}; draft.dnLots.forEach(function (h) { if (h.row) lotIds[h.id] = h.row; });
    draft.dnRef = { trip: x.trip, date: x.date, dn: x.dn || '', driver: x.driver || '', lorry: x.lorry || '', mill: x.mill || '', ramp_cleared: x.ramp_cleared || '',
                    blocks: JSON.parse(JSON.stringify(x.blocks || {})), parts: draft.dnLots.map(function (h) { return { id: h.id, date: h.date, lot: h.lot, block: h.block, worker_id: h.worker_id, bunches: num(h.bunches) }; }),
                    disIds: JSON.parse(JSON.stringify(x.blockIds || {})), lotIds: lotIds };
    draft.sel = {}; draft.extra = {};
    draft.dnRef.parts.forEach(function (h) { draft.sel[h.lot] = String(num(draft.sel[h.lot]) + h.bunches); });
    Object.keys(draft.dnRef.blocks).forEach(function (b) {
      var inLots = draft.dnRef.parts.filter(function (h) { return h.block === b; }).reduce(function (a, h) { return a + h.bunches; }, 0);
      if (num(draft.dnRef.blocks[b]) > inLots) draft.extra[b] = String(num(draft.dnRef.blocks[b]) - inLots);
    });
    draft.blocks = {}; Object.keys(x.blocks).forEach(function (b) { draft.blocks[b] = String(x.blocks[b]); });
    if (!draft.lorry && x.lorry) draft.lorry = x.lorry;
    if (!draft.driver && x.driver) draft.driver = x.driver;
    if (!draft.do_no && x.dn) draft.do_no = x.dn;
    var m = mills().find(function (mm) { return mm === x.mill; }); if (m) draft.mill = m;
    if (x.date && draft.date === EA.today() && x.date < EA.today()) draft.date = x.date;
    draft.selTouched = false;
    keepDraft();
  }
  function drawTrip() {
    var list = trips();
    $('#tk-tripbox').innerHTML = '<div class="field"><label for="tk-trip"><span class="bm">Muatan lori (nota hantar)</span><span class="en">Lorry load (delivery note)</span></label>' +
      '<select id="tk-trip" class="text-input"><option value="">' + (list.length ? '— Pilih · Choose —' : '— Tiada lori menunggu tiket · No lorry load waiting —') + '</option>' +
      list.map(function (x) { return '<option value="' + esc(x.trip) + '"' + (x.trip === draft.trip ? ' selected' : '') + '>' + esc(tripLabel(x)) + '</option>'; }).join('') + '</select></div>';
    $('#tk-trip').onchange = function () {
      var v = this.value, x = list.find(function (y) { return y.trip === v; });
      if (x) useTrip(x); else { draft.trip = ''; draft.lorryBunches = 0; draft.dnLots = []; draft.dnRef = null; draft.blocks = {}; draft.sel = {}; draft.extra = {}; draft.noAuto = true; keepDraft(); }
      render(el, ctx);
    };
  }
  function drawLots() {
    if (fromDn() && !pickDn()) {
      var c = calc(draft), inLots = {};
      draft.dnLots.forEach(function (h) { inLots[h.block] = (inLots[h.block] || 0) + num(h.bunches); });
      var g = {};
      draft.dnLots.forEach(function (h) { var x = g[h.lot] || (g[h.lot] = { lot: h.lot, block: h.block, b: 0, who: [] }); x.b += num(h.bunches); if (x.who.indexOf(h.worker_id) < 0) x.who.push(h.worker_id); });
      $('#tk-lots').innerHTML = '<div class="rows">' + Object.keys(g).sort(byLot).map(function (k) {
        return '<div class="list-line"><div><b>Petak ' + esc(k) + ' · Blk ' + esc(g[k].block) + '</b><span class="en">' + esc(g[k].who.map(person).join(', ')) + '</span></div><div class="mono">' + g[k].b + ' tandan</div></div>';
      }).join('') + c.blocks.filter(function (b) { return c.split[b].bunches > (inLots[b] || 0); }).map(function (b) {
        return '<div class="list-line"><div><b>Blk ' + esc(b) + '</b><span class="en">tanpa rekod tuai · no harvest record</span></div><div class="mono">' + (c.split[b].bunches - (inLots[b] || 0)) + ' tandan</div></div>';
      }).join('') + '</div>';
      $('#tk-manual').innerHTML = '';
      return;
    }
    if (!canPick(ctx.user) || (staffMode() && !pickDn())) {
      // The clerk never ticks lots: they come from the staff's delivery note.
      if (staffMode() && !draft.trip) { $('#tk-lots').innerHTML = '<p class="hint">Tiada lori menunggu tiket. Nota hantar ditulis di Kutip & hantar. · No lorry waiting for its ticket. Delivery notes are written on Collect & dispatch.</p>'; $('#tk-manual').innerHTML = ''; return; }
      if (staffMode() && !fromDn()) { $('#tk-lots').innerHTML = '<p class="hint">Nota hantar ini tidak boleh diubah di sini. Betulkan di Kutip & hantar (CORRECT DN). · This delivery note cannot be changed here. Correct it on Collect & dispatch (CORRECT DN).</p>'; $('#tk-manual').innerHTML = ''; return; }
      var bl = Object.keys(draft.blocks || {}).filter(function (b) { return num(draft.blocks[b]) > 0; }).sort();
      $('#tk-lots').innerHTML = !draft.trip
        ? '<p class="warn"><span class="bm">Taip No. DO dari tiket (atau pilih lori di atas). Petak datang dari nota hantar staf. Jika lori ini tiada dalam senarai, minta staf isi nota hantar di Kutip & hantar dahulu.</span><span class="en">Type the DO no. from the ticket (or choose the lorry above). The lots come from the staff\'s delivery note. If the lorry is not in the list, ask the staff to write its delivery note on Collect & dispatch first.</span></p>'
        : '<p class="hint">Staf belum tanda petak untuk lori ini. Tiket boleh disimpan: tan dibahagi ikut blok sahaja, tan penuai belum dikira. Staf tanda petak di Kutip & hantar (CORRECT DN). · The staff has not ticked the lots for this lorry. The ticket can be saved: tonnes split by block only, harvesters\' tonnes not yet worked out. The staff ticks the lots on Collect & dispatch (CORRECT DN).</p>' +
          (bl.length ? '<div class="rows">' + bl.map(function (b) { return '<div class="list-line"><div><b>Blk ' + esc(b) + '</b><span class="en">dari nota hantar · from the delivery note</span></div><div class="mono">' + num(draft.blocks[b]) + ' tandan</div></div>'; }).join('') + '</div>' : '');
      $('#tk-manual').innerHTML = '';
      return;
    }
    var list = lots(), onDn = {};
    if (pickDn()) draft.dnRef.parts.forEach(function (h) { onDn[h.lot] = (onDn[h.lot] || 0) + h.bunches; });
    $('#tk-lots').innerHTML = list.length ? '<div class="rows">' + list.map(function (l) {
      var on = num(draft.sel[l.lot]) > 0 || draft.sel[l.lot] === '';
      var who = l.workers.concat(onDn[l.lot] ? ['DN ' + onDn[l.lot] + ' tandan'] : []);
      return '<div class="list-line lot-line"><label class="pick-line"><input type="checkbox" data-lot="' + esc(l.lot) + '"' + (on ? ' checked' : '') + '>' +
        '<div><b>Petak ' + esc(l.lot) + ' · Blk ' + esc(l.block) + '</b><span class="en">' + l.open + ' tandan terbuka · open · tuai ' + l.dates.map(sd).join(', ') + ' · ' +
        esc(who.map(person).join(', ')) + '</span></div></label>' +
        '<input class="qty" inputmode="numeric" aria-label="Tandan petak ' + esc(l.lot) + '" data-amt="' + esc(l.lot) + '" value="' + esc(on ? draft.sel[l.lot] : '') + '" placeholder="' + l.open + '"' + (on ? '' : ' disabled') + '></div>';
    }).join('') + '</div>' : '<p class="hint">Tiada tuaian terbuka di telefon ini. Isi tandan blok di bawah. · No open harvest on this phone. Key the block bunches below.</p>';
    el.querySelectorAll('input[data-lot]').forEach(function (i) {
      i.onchange = function () {
        var l = list.find(function (x) { return x.lot === i.dataset.lot; });
        draft.selTouched = true;
        if (i.checked) draft.sel[l.lot] = String(l.open); else delete draft.sel[l.lot];
        keepDraft(); drawLots(); drawSums();
      };
    });
    el.querySelectorAll('input[data-amt]').forEach(function (i) {
      i.oninput = function () {
        var l = list.find(function (x) { return x.lot === i.dataset.amt; });
        var raw = i.value.replace(/\D/g, '');
        if (raw !== '' && num(raw) > l.open) { raw = String(l.open); i.value = raw; }
        draft.selTouched = true; draft.sel[l.lot] = raw;
        keepDraft(); drawSums();
      };
    });
    // Bunches with no harvest record on the delivery note stay as they are.
    if (pickDn()) {
      var exk = {}; Object.keys(draft.dnRef.blocks || {}).concat(Object.keys(draft.extra || {})).forEach(function (b) { if (b) exk[b] = true; });
      var ex = Object.keys(exk).sort();
      $('#tk-manual').innerHTML = ex.length ? '<p class="hint"><b>Tandan tanpa rekod tuai · Bunches with no harvest record</b> (kosongkan jika petak sudah ditanda · leave empty when the lots are ticked)</p><div class="blk-in">' + ex.map(function (b) {
        return '<div class="field"><label for="tk-ex-' + esc(b) + '"><span class="bm">Blok ' + esc(b) + '</span><span class="en">lori · lorry: ' + num((draft.dnRef.blocks || {})[b]) + ' tandan</span></label>' +
          '<input id="tk-ex-' + esc(b) + '" class="text-input" inputmode="numeric" data-ex="' + esc(b) + '" value="' + esc(draft.extra[b] || '') + '" placeholder="0"></div>';
      }).join('') + '</div>' : '';
      el.querySelectorAll('input[data-ex]').forEach(function (i) { i.oninput = function () { draft.extra[i.dataset.ex] = i.value.replace(/\D/g, ''); keepDraft(); drawSums(); }; });
      return;
    }
    // With no open harvest at all (e.g. not keyed on Kerja harian), the block bunches are keyed by hand.
    $('#tk-manual').innerHTML = list.length ? '' : '<div class="blk-in">' + EA.lists.blocksFor(ctx.estate).map(function (b) {
      return '<div class="field"><label for="tk-b-' + esc(b.block) + '"><span class="bm">Blok ' + esc(b.block) + ' · tandan</span><span class="en">bunches</span></label>' +
        '<input id="tk-b-' + esc(b.block) + '" class="text-input" inputmode="numeric" data-blk="' + esc(b.block) + '" value="' + esc(draft.blocks[b.block] || '') + '" placeholder="0"></div>';
    }).join('') + '</div>';
    el.querySelectorAll('input[data-blk]').forEach(function (i) { i.oninput = function () { draft.blocks[i.dataset.blk] = i.value.replace(/\D/g, ''); keepDraft(); drawSums(); }; });
  }
  function drawSums() {
    var c = calc(draft);
    if (num(draft.w1) && num(draft.w2) && $('#tk-nett') && document.activeElement !== $('#tk-nett')) { $('#tk-nett').value = String(c.nettKg); draft.nett = String(c.nettKg); }
    var f = flags(draft, c);
    if (staffMode()) {
      var ref = draft.dnRef || {}, was = Object.keys(ref.blocks || {}).reduce(function (a, b) { return a + num(ref.blocks[b]); }, 0);
      $('#tk-sum').innerHTML = draft.trip ? 'Lori ini · This lorry: <b>' + c.bunches + '</b> tandan' + (was && was !== c.bunches ? ' (nota hantar · delivery note: ' + was + ')' : '') +
        (c.blocks.length ? '<br>' + c.blocks.map(function (b) { return 'Blk ' + esc(b) + ': ' + c.split[b].bunches + ' tandan'; }).join(' · ') : '') : '';
      var bl2 = Object.keys(c.balance).filter(function (b) { return c.balance[b] > 0; }).sort();
      $('#tk-bal').innerHTML = bl2.length ? '<p class="hint"><b>Baki blok selepas lori ini · Block balance after this lorry:</b> ' + bl2.map(function (b) { return 'Blk ' + esc(b) + ' ' + c.balance[b] + ' tandan'; }).join(' · ') + '</p>' : '';
      $('#tk-harv').innerHTML = '';
      return;
    }
    $('#tk-sum').innerHTML = 'Tiket ini · This ticket: <b>' + c.bunches + '</b> tandan · <b>' + c.nett.toFixed(2) + '</b> MT · ABW <b>' + (c.abw || 0) + '</b> kg/tandan' +
      (c.blocks.length ? '<br>' + c.blocks.map(function (b) { return 'Blk ' + esc(b) + ': ' + c.split[b].bunches + ' tandan, ' + c.split[b].mt.toFixed(2) + ' MT'; }).join(' · ') : '') +
      f.map(function (x) { return '<span class="warn" style="display:block;margin-top:6px">' + esc(x[0]) + ' · ' + esc(x[1]) + '</span>'; }).join('');
    var bal = Object.keys(c.balance).filter(function (b) { return c.balance[b] > 0; }).sort();
    $('#tk-bal').innerHTML = bal.length ? '<p class="hint"><b>Baki blok selepas tiket ini · Block balance after this ticket:</b> ' +
      bal.map(function (b) { return 'Blk ' + esc(b) + ' ' + c.balance[b] + ' tandan'; }).join(' · ') + '</p>' : '';
    var byW = {};
    c.harv.forEach(function (h) { var x = byW[h.worker_id] || (byW[h.worker_id] = { b: 0, mt: 0, lots: [] }); x.b += h.bunches; x.mt = r3(x.mt + h.mt); if (x.lots.indexOf(h.lot) < 0) x.lots.push(h.lot); });
    $('#tk-harv').innerHTML = c.harv.length && c.nett ? '<p class="hint"><b>Tan setiap penuai · Each harvester\'s tonnes</b></p><div class="rows">' + Object.keys(byW).map(function (w) {
      return '<div class="list-line"><div><b>' + esc(person(w)) + '</b><span class="en">' + esc(w) + ' · petak ' + esc(byW[w].lots.join(', ')) + '</span></div><div class="mono">' + byW[w].b + ' tandan · ' + byW[w].mt.toFixed(3) + ' MT</div></div>';
    }).join('') + '</div>' : '';
  }

  // ---------- save ----------
  function problems(c) {
    var p = [];
    if (!draft.ticket_no) p.push(['Isi no. tiket.', 'Fill in the ticket number.']);
    if (!(c.nett > 0)) p.push(['Isi berat (berat masuk dan keluar, atau bersih).', 'Fill in the weights (in and out, or nett).']);
    if (num(draft.w1) && num(draft.w2) && num(draft.w2) >= num(draft.w1)) p.push(['Berat keluar mesti kurang dari berat masuk.', 'The weight out must be less than the weight in.']);
    if (c.nett > 0 && c.nett < 0.5) p.push(['Bersih ' + c.nettKg + ' kg terlalu kecil: isi dalam kg, bukan MT.', 'Nett ' + c.nettKg + ' kg is too small: key kg, not MT.']);
    if (!canPick(ctx.user) && !draft.trip) p.push(['Taip No. DO untuk cari nota hantar staf.', 'Type the DO no. to find the staff\'s delivery note.']);
    else if (!c.bunches) p.push(['Pilih petak dalam lori ini.', 'Choose the lots on this lorry.']);
    var twice = saved().find(function (t) { return t.estate === ctx.estate && t.ticket_no === draft.ticket_no && t.key !== draft.replacing; });
    if (draft.ticket_no && twice) p.push(['Tiket ' + draft.ticket_no + ' sudah disimpan (' + sd(twice.date) + ').', 'Ticket ' + draft.ticket_no + ' is already saved. Use CORRECT on it instead.']);
    return p;
  }
  function problemSheet(p, id) {
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Belum lengkap</span><span class="en">Not complete yet</span></h2>' +
      p.map(function (x) { return '<p class="msg"><span class="bm">' + esc(x[0]) + '</span><span class="en">' + esc(x[1]) + '</span></p>'; }).join('') +
      '<div class="actions"><button class="btn btn-main" type="button" id="' + id + '">OK<small>Betulkan</small></button></div>',
      function (s) { s.querySelector('#' + id).onclick = ui().closeSheet; });
  }
  // The staff's change of lots (and bunches with no harvest record) corrects the delivery note:
  // new rows replace its rows, so the lorry, its lots and the ticket agree.
  function dnChanged(c) {
    var ref = draft.dnRef;
    if (!sameParts(c.harv, ref.parts)) return true;
    var keys = {}; Object.keys(ref.blocks || {}).concat(c.blocks).forEach(function (b) { keys[b] = true; });
    return Object.keys(keys).some(function (b) { return num((ref.blocks || {})[b]) !== (c.split[b] ? c.split[b].bunches : 0); });
  }
  function fixDn(c, ticketNo) {
    var ref = draft.dnRef, blocks = {};
    c.blocks.forEach(function (b) { blocks[b] = c.split[b].bunches; });
    var rec = { date: ref.date, estate: ctx.estate, at: EA.ui.hhmm(new Date()), tractor: '', loader: '', lines: [], fromTicket: ticketNo || 'lots',
                dispatch: { trip: ref.trip, dn: ref.dn, driver: ref.driver, lorry: ref.lorry, mill: ref.mill, ramp_cleared: ref.ramp_cleared, blocks: blocks,
                            parts: c.harv.map(function (h) { return { id: h.id, date: h.date, lot: h.lot, block: h.block, worker_id: h.worker_id, bunches: h.bunches }; }),
                            extra: JSON.parse(JSON.stringify(draft.extra || {})), bunches: String(c.bunches) } };
    EA.fh.harvest.writeDn(ctx.estate, rec, { date: ref.date, dispatch: ref, disIds: ref.disIds, lotIds: ref.lotIds });
    var all = EA.local.get('fh.collect', []), here = false;
    all.forEach(function (x) { if (x.dispatch && x.dispatch.trip === ref.trip && !x.dispatch.replacedBy) { x.dispatch.replacedBy = rec.at; here = true; } });
    if (!here) rec.dispatch.prevParts = ref.parts;    // keyed on another phone: the office still counts these until this arrives
    all.push(rec); EA.local.set('fh.collect', all);
    return { rec: rec, blocks: blocks };
  }
  function save() {
    var c = calc(draft), p = problems(c);
    if (p.length) return problemSheet(p, 'tp-ok');
    var dnFix = pickDn() && dnChanged(c);
    var old = draft.replacing ? saved().find(function (t) { return t.key === draft.replacing; }) : null;
    var t = { key: old ? old.key : ctx.estate + '-' + draft.ticket_no + '-' + Date.now().toString(36), date: draft.date, estate: ctx.estate,
              ticket_no: draft.ticket_no, trip: draft.trip, lorryBunches: draft.lorryBunches, time: draft.time, mill: draft.mill, do_no: draft.do_no,
              lorry: draft.lorry.trim(), driver: draft.driver.trim(), w1: draft.w1, w2: draft.w2, ded: draft.ded, nettKg: c.nettKg, nett: c.nett,
              bunches: c.bunches, abw: c.abw, split: c.split, harv: c.harv, sel: JSON.parse(JSON.stringify(draft.sel)), balance: c.balance, note: draft.note.trim(),
              source: c.source, dnLots: JSON.parse(JSON.stringify(draft.dnLots || [])), blocks: JSON.parse(JSON.stringify(draft.blocks || {})), tripDn: draft.tripDn || '',
              dnRef: draft.dnRef ? JSON.parse(JSON.stringify(draft.dnRef)) : null, extra: JSON.parse(JSON.stringify(draft.extra || {})),
              keyedName: ctx.user.name, rev: old ? (old.rev || 1) + 1 : 1, ids: { blocks: {}, harv: {} } };
    try {
      if (dnFix) {
        // The staff changed the lots: the delivery note is corrected first (its rows replaced), so the
        // lorry, its lots and this ticket agree. The bunches with no harvest record stay as they were.
        var fx = fixDn(c, t.ticket_no), rec = fx.rec, blocks = fx.blocks, ref = draft.dnRef;
        t.dnRef = { trip: ref.trip, date: ref.date, dn: ref.dn, driver: ref.driver, lorry: ref.lorry, mill: ref.mill, ramp_cleared: ref.ramp_cleared, blocks: blocks,
                    parts: rec.dispatch.parts, disIds: rec.disIds, lotIds: rec.lotIds };
        t.dnLots = rec.dispatch.parts; t.blocks = blocks; t.lorryBunches = c.bunches; t.dnFixed = true;
      }
      t.ids.ticket = EA.save(TAB, ROOM, ctx.estate, { date: t.date, ticket_no: t.ticket_no, trip: t.trip, mill: t.mill, do_no: t.do_no, lorry: t.lorry, driver: t.driver, time: t.time,
        first_kg: String(num(t.w1) || ''), second_kg: String(num(t.w2) || ''), deduct_kg: String(num(t.ded)), nett_kg: String(t.nettKg), nett_mt: String(t.nett),
        bunches: String(t.bunches), lorry_bunches: String(t.lorryBunches || ''), abw_kg: String(t.abw), note: t.note }, old ? old.ids.ticket : '').id;
      var oldB = old ? Object.assign({}, old.ids.blocks) : {};
      c.blocks.forEach(function (b) {
        t.ids.blocks[b] = EA.save(TAB_BLK, ROOM, ctx.estate, { date: t.date, ticket_no: t.ticket_no, block: b, bunches: String(c.split[b].bunches), mt: String(c.split[b].mt) },
          oldB[b] || '').id;
        delete oldB[b];
      });
      Object.keys(oldB).forEach(function (b) {
        EA.save(TAB_BLK, ROOM, ctx.estate, { date: old.date, ticket_no: old.ticket_no, block: b, bunches: String(old.split[b].bunches), mt: String(old.split[b].mt) }, oldB[b], 'removed');
      });
      var oldH = old && old.ids.harv ? Object.assign({}, old.ids.harv) : {};
      c.harv.forEach(function (h) {
        t.ids.harv[h.id] = EA.save(TAB_HARV, ROOM, ctx.estate, { date: t.date, ticket_no: t.ticket_no, work_id: h.id, date_cut: h.date, block: h.block, lot: h.lot,
          worker_id: h.worker_id, bunches: String(h.bunches), abw_kg: String(c.abw), mt: String(h.mt), source: c.source }, oldH[h.id] || '').id;
        delete oldH[h.id];
      });
      Object.keys(oldH).forEach(function (wid) {
        var h = (old.harv || []).find(function (x) { return x.id === wid; }) || {};
        EA.save(TAB_HARV, ROOM, ctx.estate, { date: old.date, ticket_no: old.ticket_no, work_id: wid, date_cut: h.date || '', block: h.block || '', lot: h.lot || '',
          worker_id: h.worker_id || '', bunches: String(h.bunches || ''), abw_kg: String(old.abw), mt: String(h.mt || ''), source: old.source || 'ticket' }, oldH[wid], 'removed');
      });
    } catch (e) { ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad'); return; }
    keepTicket(t);
    dropDraft();
    ui().toast('Tiket disimpan · Ticket saved' + (old ? ' (dibetulkan · corrected)' : ''));
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
    // The clerk keys the grading sheet from the same WhatsApp post, straight after the ticket.
    var graded = gradings().some(function (g) { return g.estate === ctx.estate && g.ticket_no === t.ticket_no; });
    if (canGrade(ctx.user) && !graded) gradeSheet(t.ticket_no, t.date, function () { showText(t.key); });
    else showText(t.key);
  }

  // The staff's SAVE LOTS: only the delivery note is corrected; the ticket waits for the clerk.
  function saveLots() {
    if (!pickDn()) return problemSheet([['Pilih lori dahulu.', 'Choose a lorry first.']], 'tp-ok');
    var c = calc(draft);
    if (!c.bunches) return problemSheet([['Tanda petak, atau isi tandan tanpa rekod tuai.', 'Tick the lots, or key the bunches with no harvest record.']], 'tp-ok');
    if (!dnChanged(c)) { ui().toast('Tiada perubahan. Petak sudah betul. · No change: the lots are already right.'); return; }
    try { fixDn(c, ''); } catch (e) { ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad'); return; }
    var dnNo = draft.dnRef.dn;
    dropDraft();
    ui().toast('Petak disimpan, DN ' + dnNo + ' dibetulkan · Lots saved, delivery note corrected');
    if (navigator.onLine && EA.sendLink()) EA.send();
    render(el, ctx);
  }

  // ---------- the mill grading, keyed by the estate clerk ----------
  function ungraded() {
    var graded = {};
    gradings().forEach(function (g) { if (g.estate === ctx.estate) graded[g.ticket_no] = true; });
    var list = EA.sendLink() ? EA.local.get(K.ungraded + ctx.estate, []) : [];
    saved().forEach(function (t) {     // tickets keyed on this phone, even before the office has them
      if (t.estate === ctx.estate && !list.some(function (x) { return x.ticket_no === t.ticket_no; })) list.push({ ticket_no: t.ticket_no, date: t.date, mill: t.mill, nett_mt: t.nett, do_no: t.do_no });
    });
    return list.filter(function (t) { return !graded[t.ticket_no] && t.date >= daysAgo(30); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function drawGradeList() {
    if (!canGrade(ctx.user) || !$('#tk-gradelist')) return;
    var todo = ungraded();
    var done = gradings().filter(function (g) { return g.estate === ctx.estate; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5);
    $('#tk-gradelist').innerHTML =
      (todo.length ? '<p class="hint"><b>Menunggu gred · Waiting for grading</b></p>' + todo.map(function (t) {
        return '<div class="list-line"><div><b>' + esc(sd(t.date)) + ' · tiket ' + esc(t.ticket_no) + '</b><span class="en">' + esc(t.mill || '') + (t.nett_mt ? ' · ' + num(t.nett_mt).toFixed(2) + ' MT' : '') + (t.do_no ? ' · DO ' + esc(t.do_no) : '') + '</span></div>' +
          '<div class="acts"><button type="button" class="btn btn-ok" data-grade="' + esc(t.ticket_no) + '" data-gdate="' + esc(t.date) + '">GRADE<small>Isi gred</small></button></div></div>';
      }).join('') : '<p class="hint">Tiada tiket menunggu gred. · No ticket waiting for grading.</p>') +
      (done.length ? '<p class="hint"><b>Sudah digred · Graded</b></p>' + done.map(function (g) {
        return '<div class="list-line"><div><b>' + esc(sd(g.date)) + ' · tiket ' + esc(g.ticket_no) + '</b><span class="en' + (g.flag ? ' warn-t' : '') + '">' + esc(g.flag || 'Gred baik · Grading fine') + '</span></div>' +
          '<div class="acts"><button type="button" class="btn btn-ghost" data-grade="' + esc(g.ticket_no) + '" data-gdate="' + esc(g.date) + '">CORRECT<small>Betulkan</small></button></div></div>';
      }).join('') : '');
    el.querySelectorAll('[data-grade]').forEach(function (b) { b.onclick = function () { gradeSheet(b.dataset.grade, b.dataset.gdate); }; });
  }
  // Poor grading: shown to the staff and the Assistant Manager. Limits are in the shared lists (draft, to confirm).
  function gradeIssues(g) {
    var L = EA.lists.gradingLimits || {}, out = [];
    var unripe = num(g.ur) + num(g.udr);
    if (L.unripe != null && unripe > L.unripe) out.push('Mentah + kurang masak ' + unripe + '% (had ' + L.unripe + '%)');
    if (L.empty != null && num(g.eb) > L.empty) out.push('Tandan kosong ' + num(g.eb) + '% (had ' + L.empty + '%)');
    if (L.rotten != null && num(g.rt) > L.rotten) out.push('Busuk ' + num(g.rt) + '% (had ' + L.rotten + '%)');
    if (L.dirty != null && num(g.dt) > L.dirty) out.push('Kotor ' + num(g.dt) + '% (had ' + L.dirty + '%)');
    if (L.longStalk != null && num(g.ls) > L.longStalk) out.push('Tangkai panjang ' + num(g.ls) + '% (had ' + L.longStalk + '%)');
    var rej = num(g.rej_ur) + num(g.rej_eb) + num(g.rej_rt);
    if (rej) out.push('Ditolak ' + rej + ' tandan (UR ' + num(g.rej_ur) + ', EB ' + num(g.rej_eb) + ', RT ' + num(g.rej_rt) + ')');
    if (num(g.penalty) > 0) out.push('Penalti ' + num(g.penalty) + '%');
    return out;
  }
  function gradeSheet(ticketNo, date, then) {
    function done() { ui().closeSheet(); if (then) setTimeout(then, 0); }
    var old = gradings().find(function (g) { return g.estate === ctx.estate && g.ticket_no === ticketNo; });
    var g = old ? JSON.parse(JSON.stringify(old.g)) : {};
    function f(id, bm, en, k, mode) {
      return '<div class="field"><label for="gs-' + id + '"><span class="bm">' + esc(bm) + '</span><span class="en">' + esc(en) + '</span></label>' +
        '<input id="gs-' + id + '" class="text-input" inputmode="' + (mode || 'decimal') + '" data-gk="' + k + '" value="' + esc(g[k] || '') + '" placeholder="0"></div>';
    }
    ui().openSheet('<h2 id="sheet-title"><span class="bm">Gred kilang · tiket ' + esc(ticketNo) + '</span><span class="en">Mill grading sheet, ' + esc(sd(date)) + '</span></h2>' +
      '<div class="fields">' + f('sample', 'Tandan digred', 'Bunches graded', 'sample', 'numeric') + f('millb', 'Jumlah tandan (kilang)', 'Total bunches counted by the mill', 'mill_bunches', 'numeric') + '</div>' +
      '<p class="hint">Peratus (%) seperti di kertas gred. · Percent, as on the grading sheet.</p>' +
      '<div class="grade-grid">' + GRADES.map(function (x) { return f('g-' + x[0], x[1] + ' · ' + x[2], x[3] + ' %', x[0]); }).join('') + '</div>' +
      '<p class="hint"><b>Tandan ditolak · Rejected bunches</b></p><div class="grade-grid">' +
        f('rur', 'UR · Mentah', 'Unripe', 'rej_ur', 'numeric') + f('reb', 'EB · Kosong', 'Empty', 'rej_eb', 'numeric') + f('rrt', 'RT · Busuk', 'Rotten', 'rej_rt', 'numeric') + '</div>' +
      '<div class="fields">' + f('loose', 'Buah relai (kg)', 'Loose fruit, kg', 'loose') + f('pen', 'Penalti (%)', 'Penalty, %', 'penalty') + '</div>' +
      '<div id="gs-issues"></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" id="gs-cancel">' + (then ? 'LATER<small>Gred nanti</small>' : 'CANCEL<small>Batal</small>') + '</button>' +
      '<button class="btn btn-main" type="button" id="gs-save">SAVE GRADING<small>Simpan gred</small></button></div>',
      function (s) {
        function show() {
          var iss = gradeIssues(g);
          s.querySelector('#gs-issues').innerHTML = iss.length ? '<p class="msg"><span class="bm">Gred kurang baik: ' + esc(iss.join('; ')) + '</span><span class="en">Poor grading: it goes on the next morning\'s chit; the staff says what is going on, for the Assistant Manager.</span></p>' : '';
        }
        s.querySelectorAll('[data-gk]').forEach(function (i) { i.oninput = function () { g[i.dataset.gk] = i.value.replace(/[^\d.]/g, ''); show(); }; });
        s.querySelector('#gs-cancel').onclick = done;
        s.querySelector('#gs-save').onclick = function () {
          var iss = gradeIssues(g);
          var row = { date: date, ticket_no: ticketNo, sample: g.sample || '', mill_bunches: g.mill_bunches || '', rej_ur: g.rej_ur || '', rej_eb: g.rej_eb || '', rej_rt: g.rej_rt || '',
                      loose_kg: g.loose || '', penalty_pct: g.penalty || '', grade_flag: iss.join('; ') };
          GRADES.forEach(function (x) { row['g_' + x[0]] = g[x[0]] || ''; });
          var id;
          try { id = EA.save(TAB_GRADE, ROOM, ctx.estate, row, old ? old.id : '').id; }
          catch (e) { ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad'); return; }
          keepGrading({ estate: ctx.estate, ticket_no: ticketNo, date: date, g: g, flag: iss.join('; '), id: id, keyedName: ctx.user.name });
          done();
          ui().toast('Gred disimpan · Grading saved');
          if (navigator.onLine && EA.sendLink()) EA.send().then(function () { EA.fh.refreshBacklog(ctx.estate); });
          drawGradeList();
        };
        show();
      });
  }

  // ---------- month to date, and the list ----------
  function monthTickets() {
    var m = EA.today().slice(0, 7);
    return saved().filter(function (t) { return t.estate === ctx.estate && t.date.slice(0, 7) === m; });
  }
  function monthTotals() {
    var list = monthTickets(), byBlock = {}, byMill = {}, mt = 0, bunches = 0;
    list.forEach(function (t) {
      mt += t.nett; bunches += t.bunches;
      Object.keys(t.split).forEach(function (b) { byBlock[b] = r3((byBlock[b] || 0) + t.split[b].mt); });
      byMill[t.mill] = r3((byMill[t.mill] || 0) + t.nett);
    });
    return { n: list.length, mt: r3(mt), bunches: bunches, abw: bunches ? r2(mt * 1000 / bunches) : 0, byBlock: byBlock, byMill: byMill };
  }
  function monthCard() {
    var s = monthTotals();
    var d = new Date(EA.today() + 'T00:00:00');
    return '<section class="card" id="tk-month"><h2><span class="inline"><span class="bm">Bulan ini · ' + esc(ui().monBm[d.getMonth()]) + '</span> · <span class="en">Month to date (tickets on this phone)</span></span></h2>' +
      (s.n ? '<div class="list-line"><div><b>' + s.mt.toFixed(2) + ' MT · ' + s.n + ' tiket · ABW ' + s.abw + ' kg</b><span class="en">' +
        Object.keys(s.byBlock).sort().map(function (b) { return 'Blk ' + esc(b) + ' ' + s.byBlock[b].toFixed(2); }).join(' · ') + '</span><span class="en">' +
        Object.keys(s.byMill).map(function (m) { return esc(m) + ' ' + s.byMill[m].toFixed(2); }).join(' · ') + '</span></div></div>'
        : '<p class="hint">Belum ada tiket bulan ini. · No tickets this month yet.</p>') + '</section>';
  }
  function allIds(t) { return [t.ids.ticket].concat(Object.keys(t.ids.blocks).map(function (b) { return t.ids.blocks[b]; }), Object.keys(t.ids.harv || {}).map(function (h) { return t.ids.harv[h]; })); }
  function listCard() {
    var list = saved().filter(function (t) { return t.estate === ctx.estate; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; }).slice(0, 15);
    return '<section class="card" id="tk-list"><h2><span class="inline"><span class="bm">Tiket terkini</span> · <span class="en">Recent tickets on this phone</span></span></h2>' +
      (list.length ? list.map(function (t) {
        var waiting = allIds(t).some(function (i) { return EA.isWaiting(i); });
        return '<div class="list-line"><div><b>' + esc(sd(t.date)) + ' · ' + esc(t.ticket_no) + ' · ' + t.nett.toFixed(2) + ' MT</b><span class="en">' + esc(t.mill) + ' · ' +
          Object.keys(t.split).sort().map(function (b) { return 'Blk ' + esc(b) + ' ' + t.split[b].mt.toFixed(2); }).join(', ') + ' · ABW ' + t.abw + ' kg</span>' +
          '<span class="pill ' + (waiting ? 'wait">Menunggu · Waiting' : 'ok">Dihantar · Sent') + '</span></div>' +
          '<div class="acts"><button type="button" class="btn btn-ghost" data-tview="' + esc(t.key) + '">VIEW<small>Lihat</small></button>' +
          (canKey(ctx.user) && weighs(ctx.user) ? '<button type="button" class="btn btn-ghost" data-tfix="' + esc(t.key) + '">CORRECT<small>Betulkan</small></button>' : '') + '</div></div>';
      }).join('') : '<p class="hint">Belum ada. · None yet.</p>') + '</section>';
  }
  function wireList() {
    el.querySelectorAll('[data-tview]').forEach(function (b) { b.onclick = function () { showText(b.dataset.tview); }; });
    el.querySelectorAll('[data-tfix]').forEach(function (b) {
      b.onclick = function () {
        var t = saved().find(function (x) { return x.key === b.dataset.tfix; });
        if (!t) return;
        var d = blank();
        Object.assign(d, { date: t.date, trip: t.trip, lorryBunches: t.lorryBunches || 0, ticket_no: t.ticket_no, time: t.time, mill: t.mill, do_no: t.do_no, lorry: t.lorry, driver: t.driver,
                  w1: t.w1, w2: t.w2, ded: t.ded || '', nett: String(t.nettKg || Math.round(t.nett * 1000)), note: t.note || '', replacing: t.key, selTouched: true,
                  sel: JSON.parse(JSON.stringify(t.sel || {})), dnLots: JSON.parse(JSON.stringify(t.dnLots || [])), tripDn: t.tripDn || '',
                  dnRef: t.dnRef ? JSON.parse(JSON.stringify(t.dnRef)) : null, extra: JSON.parse(JSON.stringify(t.extra || {})) });
        if (d.dnRef) { d.sel = {}; d.dnRef.parts.forEach(function (h) { d.sel[h.lot] = String(num(d.sel[h.lot]) + num(h.bunches)); }); }
        if (t.source === 'dn') d.blocks = JSON.parse(JSON.stringify(t.blocks || {}));
        else if (!(t.harv || []).length) Object.keys(t.split).forEach(function (k) { d.blocks[k] = String(t.split[k].bunches); });
        draft = d;
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
    L.push('ABW: ' + t.abw + ' kg/tandan' + (t.lorryBunches && t.lorryBunches !== t.bunches ? ' · lori ' + t.lorryBunches + ' tandan' : ''));
    if ((t.harv || []).length) {
      var lots = {}; t.harv.forEach(function (h) { lots[h.lot] = (lots[h.lot] || 0) + h.bunches; });
      L.push('Petak · Lots: ' + Object.keys(lots).sort(byLot).map(function (l) { return l + ' (' + lots[l] + ')'; }).join(', '));
    }
    var bal = Object.keys(t.balance || {}).filter(function (b) { return t.balance[b] > 0; }).sort();
    if (bal.length) L.push('Baki blok · Block balance: ' + bal.map(function (b) { return 'Blk ' + b + ' ' + t.balance[b]; }).join(', '));
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

  // For the morning chit with no office link: this phone's gradings that came out poor.
  function gradingAlerts(estate) {
    return gradings().filter(function (g) { return g.estate === estate && g.flag; })
      .map(function (g) { return { ticket_no: g.ticket_no, date: g.date, flag: g.flag }; });
  }

  document.addEventListener('ea:sync', function () {
    if (!el || !document.body.contains(el) || el.hidden || !$('#tk-list')) return;
    $('#tk-list').outerHTML = listCard(); wireList();
  });

  EA.fh.ticket = { render: render, gradingAlerts: gradingAlerts };
})();
