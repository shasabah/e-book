// Field & Harvest room — screen 4: the mill ticket (Tiket kilang).
// From the Field & Harvest Brief (Sugut), item 5, and the papers the driver posts to
// WhatsApp after delivery (18 Oct 2026, Boustead Rimba Nilai): the weighbridge ticket
// (ticket no., DO no. = our delivery note no., weight in / out / nett in kg) and the
// grading sheet (ripeness, unsatisfactory bunches, rejects, penalty).
//
// The staff decides which harvest the ticket's tonnage belongs to: the harvest days and
// lots keyed on Kerja harian (the mandor's bunches per harvester). Then, as decided in the
// brief, the batch closes on the real ticket:
//   ABW kg = nett MT x 1000 / bunches in the batch
//   each harvester's MT = his bunches x ABW  (the base of harvesting pay)
//   each block's MT = its bunches x ABW
// The lorry load (found by the DO / delivery note no.) suggests the batch and its bunch
// count is shown beside it, with the mill's own count, as a cross-check.
// The grading is operation information: when it is poor (limits in the shared lists) the
// staff must say what is going on; it goes in the ticket text and on the next morning's
// chit for the Assistant Manager.
// Saved as FH_TICKET (one row), FH_TICKET_BLOCK (one per block) and FH_TICKET_HARV (one per
// harvester line). A correction is new rows that point to the old ones (nothing is deleted).
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};

  var TAB = 'FH_TICKET', TAB_BLK = 'FH_TICKET_BLOCK', TAB_HARV = 'FH_TICKET_HARV', ROOM = 'FH';
  var K = { draft: 'fh.ticketdraft', saved: 'fh.tickets', trips: 'fh.trips.', harv: 'fh.harv.' };
  var MAX_LOAD = 15;                 // from the brief: a lorry load not over 15 MT
  var ABW_LOW = 5, ABW_HIGH = 30;    // kg per bunch outside this: check the bunches or the weight
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
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function r3(n) { return Math.round(n * 1000) / 1000; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function sd(iso) { return EA.fh.shortDate(iso); }
  function mills() { return EA.lists.mills; }
  function person(id) { var w = EA.lists.worker(id); return w ? w.name : id; }

  // ---------- phone memory ----------
  function saved() { var cut = new Date(); cut.setDate(cut.getDate() - 70); var from = cut.toISOString().slice(0, 10); return EA.local.get(K.saved, []).filter(function (t) { return t.date >= from; }); }
  function keepTicket(t) { var list = EA.local.get(K.saved, []).filter(function (x) { return x.key !== t.key; }); list.push(t); EA.local.set(K.saved, list); }
  function blank() {
    var g = {}; GRADES.forEach(function (x) { g[x[0]] = ''; }); g.sample = ''; g.loose = ''; g.penalty = '';
    return { date: EA.today(), estate: ctx.estate, trip: '', lorryBunches: 0, ticket_no: '', time: '', mill: mills()[0], do_no: '', lorry: '', driver: '',
             w1: '', w2: '', ded: '', nett: '', mill_bunches: '', blocks: {}, groups: {}, groupsTouched: false,
             rej: { ur: '', emp: '', rott: '' }, grade: g, explain: '', note: '', replacing: '' };
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
    saved().forEach(function (t) { if (t.trip && t.estate === ctx.estate && t.key !== draft.replacing) done[t.trip] = true; });
    return list.filter(function (x) { return !done[x.trip] || x.trip === draft.trip; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  function tripLabel(x) {
    return sd(x.date) + (x.dn ? ' · DN ' + x.dn : '') + ' · ' + (x.lorry || 'lori') + ' · ' + Object.keys(x.blocks).sort().map(function (b) { return 'Blk ' + b + ' ' + x.blocks[b]; }).join(', ') + ' (' + x.bunches + ' tandan)';
  }

  // ---------- harvest not yet on a ticket (the mandor's bunches per harvester per lot) ----------
  function localHarvest() {
    var out = [];
    EA.local.get('fh.work', []).forEach(function (s) {
      if (s.estate !== ctx.estate) return;
      s.rec.lines.forEach(function (l) {
        if (l.task_code === 'HV01' && num(l.bunches) > 0 && l.id) out.push({ id: l.id, date: s.date, lot: l.lot, block: l.block, worker_id: l.worker_id, bunches: num(l.bunches) });
      });
    });
    return out;
  }
  function harvest() {
    var list = EA.sendLink() ? EA.local.get(K.harv + ctx.estate, []) : localHarvest();
    var used = {};
    saved().forEach(function (t) { if (t.estate === ctx.estate && t.key !== draft.replacing) (t.harv || []).forEach(function (h) { used[h.id] = true; }); });
    var mine = draft.replacing ? ((saved().find(function (t) { return t.key === draft.replacing; }) || {}).harv || []) : [];
    var all = list.filter(function (h) { return !used[h.id]; });
    mine.forEach(function (h) { if (!all.some(function (x) { return x.id === h.id; })) all.push(h); });   // a correction keeps its own lines
    return all;
  }
  function groups() {
    var g = {};
    harvest().forEach(function (h) {
      var k = h.date + '|' + h.lot;
      var x = g[k] || (g[k] = { key: k, date: h.date, lot: h.lot, block: h.block, bunches: 0, lines: [] });
      x.bunches += num(h.bunches); x.lines.push(h);
    });
    return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return a.date === b.date ? a.lot.localeCompare(b.lot, undefined, { numeric: true }) : (a.date < b.date ? -1 : 1); });
  }
  // With a lorry chosen, suggest its blocks' harvest: the newest days up to the lorry's date,
  // until the bunches reach the lorry's count (10% leeway for counting). The staff changes it.
  function suggestGroups() {
    if (draft.groupsTouched || !draft.trip) return;
    var x = trips().find(function (y) { return y.trip === draft.trip; });
    if (!x) return;
    draft.groups = {};
    var total = 0, cap = num(x.bunches) * 1.1;
    groups().filter(function (g) { return x.blocks[g.block] != null && g.date <= (x.date || draft.date); })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
      .forEach(function (g) { if (total + g.bunches <= cap) { draft.groups[g.key] = true; total += g.bunches; } });
  }
  async function refreshOffice() {
    if (!EA.sendLink()) return;
    var r1 = await EA.ask('trips', { estate: ctx.estate });
    if (r1 && r1.trips) EA.local.set(K.trips + ctx.estate, r1.trips);
    var r2 = await EA.ask('harvest', { estate: ctx.estate });
    if (r2 && r2.lines) EA.local.set(K.harv + ctx.estate, r2.lines);
    if (el && document.body.contains(el) && !el.hidden && $('#tk-tripbox')) { suggestGroups(); keepDraft(); drawTrip(); drawGroups(); drawSums(); }
  }

  // ---------- sums ----------
  function calc(d) {
    var w1 = num(d.w1), w2 = num(d.w2);
    var nettKg = (w1 && w2) ? Math.round(w1 - w2 - num(d.ded)) : num(d.nett);   // the ticket prints kg
    var nett = r3(nettKg / 1000);
    var lines = [];
    groups().forEach(function (g) { if (d.groups[g.key]) lines = lines.concat(g.lines); });
    var byBlock = {};
    if (lines.length) lines.forEach(function (h) { byBlock[h.block] = (byBlock[h.block] || 0) + num(h.bunches); });
    else Object.keys(d.blocks).forEach(function (b) { if (num(d.blocks[b]) > 0) byBlock[b] = num(d.blocks[b]); });
    var blocks = Object.keys(byBlock).sort();
    var bunches = blocks.reduce(function (a, b) { return a + byBlock[b]; }, 0);
    var abw = bunches ? r2(nett * 1000 / bunches) : 0;
    function share(items, get) {      // split the nett tonnes by bunches; the last one takes the rounding
      var left = nett;
      return items.map(function (it, i) { var mt = i === items.length - 1 ? r3(left) : r3(nett * get(it) / bunches); left = r3(left - mt); return mt; });
    }
    var split = {}, bm = share(blocks, function (b) { return byBlock[b]; });
    blocks.forEach(function (b, i) { split[b] = { bunches: byBlock[b], mt: bm[i] }; });
    var hm = share(lines, function (h) { return num(h.bunches); });
    var harv = lines.map(function (h, i) { return { id: h.id, date: h.date, lot: h.lot, block: h.block, worker_id: h.worker_id, bunches: num(h.bunches), mt: hm[i] }; });
    var rejB = num(d.rej.ur) + num(d.rej.emp) + num(d.rej.rott);
    return { nettKg: nettKg, nett: nett, blocks: blocks, split: split, bunches: bunches, abw: abw, harv: harv, fromHarvest: lines.length > 0,
             rejB: rejB, rejMt: r3(rejB * abw / 1000) };
  }
  function flags(d, c) {
    var f = [];
    if (c.nett > MAX_LOAD) f.push(['Muatan lebih ' + MAX_LOAD + ' MT.', 'Load over ' + MAX_LOAD + ' MT.']);
    if (c.bunches && c.nett && (c.abw < ABW_LOW || c.abw > ABW_HIGH)) f.push(['Purata berat tandan ' + c.abw + ' kg: semak tuaian yang dipilih atau berat.', 'Bunch weight ' + c.abw + ' kg looks wrong: check the harvest chosen or the weight.']);
    if (d.lorryBunches && c.bunches && d.lorryBunches !== c.bunches) f.push(['Tuaian dipilih ' + c.bunches + ' tandan, lori ' + d.lorryBunches + ' (beza ' + (c.bunches - d.lorryBunches > 0 ? '+' : '') + (c.bunches - d.lorryBunches) + ').', 'Harvest chosen ' + c.bunches + ' bunches, the lorry load says ' + d.lorryBunches + '.']);
    var mb = num(d.mill_bunches);
    if (mb && c.bunches && mb !== c.bunches) f.push(['Kilang kira ' + mb + ' tandan, tuaian ' + c.bunches + '.', 'The mill counted ' + mb + ' bunches, the harvest chosen is ' + c.bunches + '.']);
    return f;
  }
  // Poor grading: what the staff must explain. Limits are in the shared lists (draft, to confirm).
  function gradeIssues(d, c) {
    var g = d.grade, L = EA.lists.gradingLimits || {}, out = [];
    var unripe = num(g.ur) + num(g.udr);
    if (L.unripe != null && unripe > L.unripe) out.push('Mentah + kurang masak ' + unripe + '% (had ' + L.unripe + '%)');
    if (L.empty != null && num(g.eb) > L.empty) out.push('Tandan kosong ' + num(g.eb) + '% (had ' + L.empty + '%)');
    if (L.rotten != null && num(g.rt) > L.rotten) out.push('Busuk ' + num(g.rt) + '% (had ' + L.rotten + '%)');
    if (L.dirty != null && num(g.dt) > L.dirty) out.push('Kotor ' + num(g.dt) + '% (had ' + L.dirty + '%)');
    if (L.longStalk != null && num(g.ls) > L.longStalk) out.push('Tangkai panjang ' + num(g.ls) + '% (had ' + L.longStalk + '%)');
    if (c.rejB) out.push('Ditolak ' + c.rejB + ' tandan');
    if (num(g.penalty) > 0) out.push('Penalti ' + num(g.penalty) + '%');
    return out;
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
    suggestGroups();
    var mOpts = mills().concat(draft.mill && mills().indexOf(draft.mill) < 0 ? [draft.mill] : []);
    el.innerHTML = head +
      (draft.replacing ? '<p class="warn"><span class="bm">Membetulkan tiket ' + esc(draft.ticket_no) + '. Yang lama kekal; yang baru menggantikannya.</span><span class="en">Correcting a ticket. The old one stays on record; this one replaces it.</span></p>' : '') +

      '<section class="card" aria-labelledby="tk-s1"><h2 id="tk-s1"><span class="step">1</span><span class="inline"><span class="bm">Tiket</span> · <span class="en">The weighbridge ticket</span></span></h2>' +
      '<div class="fields">' +
        field('tk-no', 'No. tiket', 'Ticket no.', draft.ticket_no, 'numeric', '469404') +
        field('tk-do', 'No. DO / DN', 'DO no. = our delivery note no.; finds the lorry load', draft.do_no, 'numeric', '8524') +
      '</div><div id="tk-tripbox"></div><div class="fields">' +
        '<div class="field"><label for="tk-date"><span class="bm">Tarikh</span><span class="en">Date on the ticket</span></label><input id="tk-date" type="date" class="text-input" value="' + esc(draft.date) + '" max="' + EA.today() + '"></div>' +
        field('tk-time', 'Masa', 'Time, e.g. 15.34', draft.time, 'decimal', '15.34') +
        '<div class="field"><label for="tk-mill"><span class="bm">Kilang</span><span class="en">Mill or collecting centre</span></label><select id="tk-mill" class="text-input">' +
          mOpts.map(function (m) { return '<option' + (m === draft.mill ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
        field('tk-lorry', 'No. lori', 'Lorry no.', draft.lorry, 'text', 'SJQ 6259') +
        field('tk-driver', 'Pemandu', 'Driver', draft.driver, 'text', '') +
      '</div><div class="fields">' +
        field('tk-w1', 'Berat masuk (kg)', '1st weight (in), kg', draft.w1, 'numeric', '32120') +
        field('tk-w2', 'Berat keluar (kg)', '2nd weight (out), kg', draft.w2, 'numeric', '16420') +
        field('tk-ded', 'Potongan (kg)', 'Deduction, kg', draft.ded, 'numeric', '0') +
        field('tk-nett', 'Bersih (kg)', 'Nett weight, kg', draft.nett, 'numeric', '15700') +
      '</div><p class="hint">Isi dalam kg seperti di tiket. · Key in kg, as printed on the ticket.</p></section>' +

      '<section class="card" aria-labelledby="tk-s2"><h2 id="tk-s2"><span class="step">2</span><span class="inline"><span class="bm">Tuaian mana?</span> · <span class="en">Which harvest is on this ticket?</span></span></h2>' +
      '<p class="hint">Staf pilih hari dan petak tuaian (tandan mandor dari Kerja harian). ABW dan tan setiap penuai dikira sendiri. · The staff ticks the harvest days and lots (the mandor\'s bunches from Day\'s work). The bunch weight and each harvester\'s tonnes are worked out.</p>' +
      '<div id="tk-groups"></div><div id="tk-manual"></div><p class="hint" id="tk-sum"></p><div id="tk-harv"></div></section>' +

      '<section class="card" aria-labelledby="tk-s3"><h2 id="tk-s3"><span class="step">3</span><span class="inline"><span class="bm">Gred kilang</span> · <span class="en">The mill\'s grading sheet</span></span></h2>' +
      '<div class="fields">' +
        field('tk-sample', 'Tandan digred', 'Bunches graded', draft.grade.sample, 'numeric', '100') +
        field('tk-mb', 'Jumlah tandan (kilang)', 'Total bunches counted by the mill', draft.mill_bunches, 'numeric', '') +
      '</div><p class="hint">Peratus (%) seperti di kertas gred. · Percent, as on the grading sheet.</p>' +
      '<div class="grade-grid">' + GRADES.map(function (x) {
        return '<div class="field"><label for="tk-g-' + x[0] + '"><span class="bm">' + x[1] + ' · ' + esc(x[2]) + '</span><span class="en">' + esc(x[3]) + ' %</span></label>' +
          '<input id="tk-g-' + x[0] + '" class="text-input" inputmode="decimal" data-g="' + x[0] + '" value="' + esc(draft.grade[x[0]] || '') + '" placeholder="0"></div>';
      }).join('') + '</div>' +
      '<p class="hint"><b>Tandan ditolak · Rejected bunches</b></p><div class="fields">' +
        field('tk-ur', 'UR · Mentah', 'Unripe', draft.rej.ur, 'numeric', '0') +
        field('tk-emp', 'EB · Kosong', 'Empty bunch', draft.rej.emp, 'numeric', '0') +
        field('tk-rott', 'RT · Busuk', 'Rotten', draft.rej.rott, 'numeric', '0') +
      '</div><div class="fields">' +
        field('tk-loose', 'Buah relai (kg)', 'Loose fruit, kg', draft.grade.loose, 'decimal', '') +
        field('tk-pen', 'Penalti (%)', 'Penalty, %', draft.grade.penalty, 'decimal', '') +
      '</div><p class="hint" id="tk-rej"></p>' +
      '<div id="tk-issues"></div>' +
      '<div class="field"><label for="tk-explain"><span class="bm">Apa berlaku di ladang?</span><span class="en">What is going on in the estate? (needed when the grading is poor)</span></label>' +
        '<textarea id="tk-explain" class="text-input" rows="3" placeholder="Cth: penuai potong buah mentah di petak 3-24; mandor sudah tegur. · E.g. unripe bunches cut in lot 3-24; the mandor has warned the harvester.">' + esc(draft.explain) + '</textarea></div>' +
      field('tk-note', 'Catatan lain', 'Other note (optional)', draft.note, 'text', '') +
      '</section>' +

      '<div class="bottom-bar"><button type="button" class="btn btn-main" id="tk-save">SAVE TICKET<small>Simpan tiket</small></button></div>' +
      monthCard() + listCard();

    $('#tk-back').onclick = function () { location.hash = ''; };
    var bind = { 'tk-no': 'ticket_no', 'tk-time': 'time', 'tk-do': 'do_no', 'tk-lorry': 'lorry', 'tk-driver': 'driver', 'tk-w1': 'w1', 'tk-w2': 'w2', 'tk-ded': 'ded', 'tk-nett': 'nett', 'tk-note': 'note', 'tk-mb': 'mill_bunches', 'tk-explain': 'explain' };
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
    $('#tk-date').onchange = function () { draft.date = this.value || EA.today(); keepDraft(); suggestGroups(); drawGroups(); drawSums(); };
    $('#tk-mill').onchange = function () { draft.mill = this.value; keepDraft(); };
    ['ur', 'emp', 'rott'].forEach(function (k) { $('#tk-' + k).oninput = function () { draft.rej[k] = this.value.replace(/\D/g, ''); keepDraft(); drawSums(); }; });
    el.querySelectorAll('input[data-g]').forEach(function (i) { i.oninput = function () { draft.grade[i.dataset.g] = i.value.replace(/[^\d.]/g, ''); keepDraft(); drawSums(); }; });
    $('#tk-sample').oninput = function () { draft.grade.sample = this.value.replace(/\D/g, ''); keepDraft(); };
    $('#tk-loose').oninput = function () { draft.grade.loose = this.value.replace(/[^\d.]/g, ''); keepDraft(); };
    $('#tk-pen').oninput = function () { draft.grade.penalty = this.value.replace(/[^\d.]/g, ''); keepDraft(); drawSums(); };
    $('#tk-save').onclick = save;
    drawTrip(); drawGroups(); drawSums(); wireList();
    refreshOffice();
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
    draft.trip = x.trip; draft.lorryBunches = x.bunches;
    draft.blocks = {}; Object.keys(x.blocks).forEach(function (b) { draft.blocks[b] = String(x.blocks[b]); });
    if (!draft.lorry && x.lorry) draft.lorry = x.lorry;
    if (!draft.driver && x.driver) draft.driver = x.driver;
    if (!draft.do_no && x.dn) draft.do_no = x.dn;
    var m = mills().find(function (mm) { return mm === x.mill; }); if (m) draft.mill = m;
    if (x.date && draft.date === EA.today() && x.date < EA.today()) draft.date = x.date;
    draft.groupsTouched = false; suggestGroups();
    keepDraft();
  }
  function drawTrip() {
    var list = trips();
    $('#tk-tripbox').innerHTML = '<div class="field"><label for="tk-trip"><span class="bm">Muatan lori (nota hantar)</span><span class="en">Lorry load (delivery note)</span></label>' +
      '<select id="tk-trip" class="text-input"><option value="">' + (list.length ? '— Pilih · Choose —' : '— Tiada lori menunggu tiket · No lorry load waiting —') + '</option>' +
      list.map(function (x) { return '<option value="' + esc(x.trip) + '"' + (x.trip === draft.trip ? ' selected' : '') + '>' + esc(tripLabel(x)) + '</option>'; }).join('') + '</select></div>';
    $('#tk-trip').onchange = function () {
      var v = this.value, x = list.find(function (y) { return y.trip === v; });
      if (x) useTrip(x); else { draft.trip = ''; draft.lorryBunches = 0; keepDraft(); }
      render(el, ctx);
    };
  }
  function drawGroups() {
    var list = groups();
    $('#tk-groups').innerHTML = list.length ? '<div class="rows">' + list.map(function (g) {
      var on = !!draft.groups[g.key];
      return '<label class="list-line pick-line"><input type="checkbox" data-grp="' + esc(g.key) + '"' + (on ? ' checked' : '') + '>' +
        '<div><b>' + esc(sd(g.date)) + ' · petak ' + esc(g.lot) + ' · Blk ' + esc(g.block) + '</b><span class="en">' + g.bunches + ' tandan · ' + g.lines.length + ' penuai · harvesters</span></div></label>';
    }).join('') + '</div>' : '<p class="hint">Tiada tuaian menunggu tiket di telefon ini. Isi tandan blok di bawah. · No harvest waiting for a ticket on this phone. Key the block bunches below.</p>';
    el.querySelectorAll('[data-grp]').forEach(function (i) {
      i.onchange = function () { draft.groupsTouched = true; if (i.checked) draft.groups[i.dataset.grp] = true; else delete draft.groups[i.dataset.grp]; keepDraft(); drawGroups(); drawSums(); };
    });
    // Without any harvest chosen, the block bunches are keyed by hand (from the lorry load if found).
    var manual = !Object.keys(draft.groups).some(function (k) { return draft.groups[k]; });
    $('#tk-manual').innerHTML = manual ? '<div class="blk-in">' + EA.lists.blocksFor(ctx.estate).map(function (b) {
      return '<div class="field"><label for="tk-b-' + esc(b.block) + '"><span class="bm">Blok ' + esc(b.block) + ' · tandan</span><span class="en">bunches</span></label>' +
        '<input id="tk-b-' + esc(b.block) + '" class="text-input" inputmode="numeric" data-blk="' + esc(b.block) + '" value="' + esc(draft.blocks[b.block] || '') + '" placeholder="0"></div>';
    }).join('') + '</div>' : '';
    el.querySelectorAll('input[data-blk]').forEach(function (i) { i.oninput = function () { draft.blocks[i.dataset.blk] = i.value.replace(/\D/g, ''); keepDraft(); drawSums(); }; });
  }
  function drawSums() {
    var c = calc(draft);
    if (num(draft.w1) && num(draft.w2) && $('#tk-nett') && document.activeElement !== $('#tk-nett')) { $('#tk-nett').value = String(c.nettKg); draft.nett = String(c.nettKg); }
    var f = flags(draft, c);
    $('#tk-sum').innerHTML = 'Jumlah · Total: <b>' + c.bunches + '</b> tandan · <b>' + c.nett.toFixed(2) + '</b> MT · ABW <b>' + (c.abw || 0) + '</b> kg/tandan' +
      (c.blocks.length ? '<br>' + c.blocks.map(function (b) { return 'Blk ' + esc(b) + ': ' + c.split[b].bunches + ' tandan, ' + c.split[b].mt.toFixed(2) + ' MT'; }).join(' · ') : '') +
      f.map(function (x) { return '<span class="warn" style="display:block;margin-top:6px">' + esc(x[0]) + ' · ' + esc(x[1]) + '</span>'; }).join('');
    var byW = {};
    c.harv.forEach(function (h) { var x = byW[h.worker_id] || (byW[h.worker_id] = { b: 0, mt: 0 }); x.b += h.bunches; x.mt = r3(x.mt + h.mt); });
    $('#tk-harv').innerHTML = c.harv.length && c.nett ? '<p class="hint"><b>Tan setiap penuai · Each harvester\'s tonnes</b></p><div class="rows">' + Object.keys(byW).map(function (w) {
      return '<div class="list-line"><div><b>' + esc(person(w)) + '</b><span class="en">' + esc(w) + '</span></div><div class="mono">' + byW[w].b + ' tandan · ' + byW[w].mt.toFixed(3) + ' MT</div></div>';
    }).join('') + '</div>' : '';
    $('#tk-rej').textContent = c.rejB ? 'Jumlah tolak · Total rejected: ' + c.rejB + ' tandan ≈ ' + c.rejMt.toFixed(2) + ' MT' : '';
    var iss = gradeIssues(draft, c);
    $('#tk-issues').innerHTML = iss.length ? '<p class="msg"><span class="bm">Gred perlu penjelasan: ' + esc(iss.join('; ')) + '</span><span class="en">The grading needs an explanation from the staff below. It goes to the Assistant Manager.</span></p>' : '';
  }

  // ---------- save ----------
  function problems(c) {
    var p = [];
    if (!draft.ticket_no) p.push(['Isi no. tiket.', 'Fill in the ticket number.']);
    if (!(c.nett > 0)) p.push(['Isi berat (berat masuk dan keluar, atau bersih).', 'Fill in the weights (in and out, or nett).']);
    if (num(draft.w1) && num(draft.w2) && num(draft.w2) >= num(draft.w1)) p.push(['Berat keluar mesti kurang dari berat masuk.', 'The weight out must be less than the weight in.']);
    if (c.nett > 0 && c.nett < 0.5) p.push(['Bersih ' + c.nettKg + ' kg terlalu kecil: isi dalam kg, bukan MT.', 'Nett ' + c.nettKg + ' kg is too small: key kg, not MT.']);
    if (!c.bunches) p.push(['Pilih tuaian (atau isi tandan blok).', 'Choose the harvest (or key the block bunches).']);
    if (gradeIssues(draft, c).length && !draft.explain.trim()) p.push(['Gred kurang baik: tulis apa berlaku di ladang.', 'The grading is poor: say what is going on in the estate.']);
    var twice = saved().find(function (t) { return t.estate === ctx.estate && t.ticket_no === draft.ticket_no && t.key !== draft.replacing; });
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
    var issues = gradeIssues(draft, c), g = draft.grade;
    var t = { key: old ? old.key : ctx.estate + '-' + draft.ticket_no + '-' + Date.now().toString(36), date: draft.date, estate: ctx.estate,
              ticket_no: draft.ticket_no, trip: draft.trip, lorryBunches: draft.lorryBunches, time: draft.time, mill: draft.mill, do_no: draft.do_no,
              lorry: draft.lorry.trim(), driver: draft.driver.trim(), w1: draft.w1, w2: draft.w2, ded: draft.ded, nettKg: c.nettKg, nett: c.nett,
              bunches: c.bunches, mill_bunches: num(draft.mill_bunches), abw: c.abw, split: c.split, harv: c.harv,
              rej: { ur: num(draft.rej.ur), emp: num(draft.rej.emp), rott: num(draft.rej.rott) }, rejB: c.rejB, rejMt: c.rejMt,
              grade: JSON.parse(JSON.stringify(g)), issues: issues, explain: draft.explain.trim(), note: draft.note.trim(),
              keyedName: ctx.user.name, rev: old ? (old.rev || 1) + 1 : 1, ids: { blocks: {}, harv: {} } };
    try {
      var row = { date: t.date, ticket_no: t.ticket_no, trip: t.trip, mill: t.mill, do_no: t.do_no, lorry: t.lorry, driver: t.driver, time: t.time,
        first_kg: String(num(t.w1) || ''), second_kg: String(num(t.w2) || ''), deduct_kg: String(num(t.ded)), nett_kg: String(t.nettKg), nett_mt: String(t.nett),
        bunches: String(t.bunches), lorry_bunches: String(t.lorryBunches || ''), mill_bunches: String(t.mill_bunches || ''), abw_kg: String(t.abw),
        rej_ur: String(t.rej.ur), rej_emp: String(t.rej.emp), rej_rott: String(t.rej.rott), rej_mt: String(t.rejMt),
        sample: g.sample, loose_kg: g.loose, penalty_pct: g.penalty, grade_flag: issues.join('; '), explain: t.explain, note: t.note };
      GRADES.forEach(function (x) { row['g_' + x[0]] = g[x[0]] || ''; });
      t.ids.ticket = EA.save(TAB, ROOM, ctx.estate, row, old ? old.ids.ticket : '').id;
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
          worker_id: h.worker_id, bunches: String(h.bunches), abw_kg: String(c.abw), mt: String(h.mt) }, oldH[h.id] || '').id;
        delete oldH[h.id];
      });
      Object.keys(oldH).forEach(function (wid) {
        var h = (old.harv || []).find(function (x) { return x.id === wid; }) || {};
        EA.save(TAB_HARV, ROOM, ctx.estate, { date: old.date, ticket_no: old.ticket_no, work_id: wid, date_cut: h.date || '', block: h.block || '', lot: h.lot || '',
          worker_id: h.worker_id || '', bunches: String(h.bunches || ''), abw_kg: String(old.abw), mt: String(h.mt || '') }, oldH[wid], 'removed');
      });
    } catch (e) { ui().toast('Tidak dapat simpan: ' + e.message + ' · Could not save', 'bad'); return; }
    keepTicket(t);
    dropDraft();
    ui().toast('Tiket disimpan · Ticket saved' + (old ? ' (dibetulkan · corrected)' : ''));
    if (navigator.onLine && EA.sendLink()) EA.send().then(function () { EA.fh.refreshBacklog(ctx.estate); });
    render(el, ctx);
    showText(t.key);
  }

  // ---------- month to date, and the list ----------
  function monthTickets() {
    var m = EA.today().slice(0, 7);
    return saved().filter(function (t) { return t.estate === ctx.estate && t.date.slice(0, 7) === m; });
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
  function allIds(t) { return [t.ids.ticket].concat(Object.keys(t.ids.blocks).map(function (b) { return t.ids.blocks[b]; }), Object.keys(t.ids.harv || {}).map(function (h) { return t.ids.harv[h]; })); }
  function listCard() {
    var list = saved().filter(function (t) { return t.estate === ctx.estate; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; }).slice(0, 15);
    return '<section class="card" id="tk-list"><h2><span class="inline"><span class="bm">Tiket terkini</span> · <span class="en">Recent tickets on this phone</span></span></h2>' +
      (list.length ? list.map(function (t) {
        var waiting = allIds(t).some(function (i) { return EA.isWaiting(i); });
        return '<div class="list-line"><div><b>' + esc(sd(t.date)) + ' · ' + esc(t.ticket_no) + ' · ' + t.nett.toFixed(2) + ' MT</b><span class="en">' + esc(t.mill) + ' · ' +
          Object.keys(t.split).sort().map(function (b) { return 'Blk ' + esc(b) + ' ' + t.split[b].mt.toFixed(2); }).join(', ') + ' · ABW ' + t.abw + ' kg</span>' +
          ((t.issues || []).length ? '<span class="en warn-t">Gred · Grading: ' + esc(t.issues.join('; ')) + '</span>' : '') +
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
        var d = blank();
        Object.assign(d, { date: t.date, trip: t.trip, lorryBunches: t.lorryBunches || 0, ticket_no: t.ticket_no, time: t.time, mill: t.mill, do_no: t.do_no, lorry: t.lorry, driver: t.driver,
                  w1: t.w1, w2: t.w2, ded: t.ded || '', nett: String(t.nettKg || Math.round(t.nett * 1000)), mill_bunches: t.mill_bunches ? String(t.mill_bunches) : '',
                  rej: { ur: String(t.rej.ur || ''), emp: String(t.rej.emp || ''), rott: String(t.rej.rott || '') },
                  grade: Object.assign(d.grade, t.grade || {}), explain: t.explain || '', note: t.note || '', replacing: t.key, groupsTouched: true });
        draft = d;
        (t.harv || []).forEach(function (h) { d.groups[h.date + '|' + h.lot] = true; });
        if (!(t.harv || []).length) Object.keys(t.split).forEach(function (k) { d.blocks[k] = String(t.split[k].bunches); });
        keepDraft(); render(el, ctx); window.scrollTo(0, 0);
      };
    });
  }

  // ---------- the ticket text for WhatsApp ----------
  function ticketText(t) {
    var est = EA.lists.estate(t.estate), s = monthTotals(), g = t.grade || {};
    var L = [];
    L.push('*TIKET KILANG ' + (est ? est.company + ' ' : '') + t.estate + '*' + (t.rev > 1 ? ' _(dibetulkan · corrected)_' : ''));
    L.push('Tiket ' + t.ticket_no + ' · ' + t.mill + ' · ' + sd(t.date) + (t.time ? ' ' + t.time : ''));
    L.push('Lori ' + (t.lorry || '-') + (t.do_no ? ' · DO ' + t.do_no : ''));
    L.push('Bersih · Nett: ' + t.nett.toFixed(2) + ' MT' + (num(t.w1) && num(t.w2) ? ' (' + num(t.w1) + ' − ' + num(t.w2) + (num(t.ded) ? ' − ' + num(t.ded) : '') + ' kg)' : ''));
    Object.keys(t.split).sort().forEach(function (b) { L.push('Blk ' + b + ': ' + t.split[b].bunches + ' tandan, ' + t.split[b].mt.toFixed(2) + ' MT'); });
    L.push('ABW: ' + t.abw + ' kg/tandan' + (t.lorryBunches && t.lorryBunches !== t.bunches ? ' · lori ' + t.lorryBunches + ' tandan' : '') + (t.mill_bunches && t.mill_bunches !== t.bunches ? ' · kilang ' + t.mill_bunches + ' tandan' : ''));
    if ((t.harv || []).length) {
      var lots = {}; t.harv.forEach(function (h) { lots[sd(h.date) + ' ' + h.lot] = true; });
      L.push('Tuaian · Harvest: ' + Object.keys(lots).join(', '));
    }
    var gl = GRADES.filter(function (x) { return num(g[x[0]]); }).map(function (x) { return x[1] + ' ' + num(g[x[0]]) + '%'; });
    if (gl.length) L.push('Gred · Grading' + (g.sample ? ' (' + g.sample + ' tandan)' : '') + ': ' + gl.join(', '));
    if (t.rejB) L.push('Ditolak · Rejected: ' + t.rejB + ' tandan (UR ' + t.rej.ur + ', EB ' + t.rej.emp + ', RT ' + t.rej.rott + ') ≈ ' + t.rejMt.toFixed(2) + ' MT');
    if (num(g.penalty)) L.push('Penalti · Penalty: ' + num(g.penalty) + '%');
    if ((t.issues || []).length) {
      L.push('*⚠ GRED · GRADING — untuk tindakan Penolong Pengurus*');
      L.push(t.issues.join('; '));
      L.push('Penjelasan staf: ' + t.explain);
    }
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

  // For the morning chit with no office link: this phone's tickets with poor grading.
  function gradingAlerts(estate, since) {
    return EA.local.get(K.saved, []).filter(function (t) { return t.estate === estate && t.date >= since && (t.issues || []).length; })
      .map(function (t) { return { ticket_no: t.ticket_no, date: t.date, flag: t.issues.join('; '), explain: t.explain }; });
  }

  document.addEventListener('ea:sync', function () {
    if (!el || !document.body.contains(el) || el.hidden || !$('#tk-list')) return;
    $('#tk-list').outerHTML = listCard(); wireList();
  });

  EA.fh.ticket = { render: render, gradingAlerts: gradingAlerts };
})();
