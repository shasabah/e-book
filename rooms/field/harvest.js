// Field & Harvest room — shared: the harvest still open, lot by lot (v19).
// Used by the delivery note (Kutip & hantar), where the staff ticks the lots that go on the
// lorry, and by the mill ticket, which takes the lots from that delivery note.
//
// Each line is one harvester's bunches on one lot and day (the mandor's count on Kerja harian,
// task HV01). A line leaves the open list when it goes on a lorry (FH_DISPATCH_LOT), or, for a
// lorry with no lots ticked, when the ticket picks it (FH_TICKET_HARV with source 'ticket').
// What is left of a line stays open: that is the block's balance.
(function () {
  window.EA = window.EA || {};
  EA.fh = EA.fh || {};

  var K = { harv: 'fh.harv.', trips: 'fh.trips.' };
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function byLot(a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true }); }
  function waiting(ids) { return (ids || []).some(function (i) { return EA.isWaiting(i); }); }
  function values(o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); }

  function localHarvest(estate) {
    var out = [];
    EA.local.get('fh.work', []).forEach(function (s) {
      if (s.estate !== estate) return;
      s.rec.lines.forEach(function (l) {
        if (l.task_code === 'HV01' && num(l.bunches) > 0 && l.id) out.push({ id: l.id, date: s.date, lot: l.lot, block: l.block, worker_id: l.worker_id, bunches: num(l.bunches) });
      });
    });
    return out;
  }

  // Lorry loads saved on this phone that carry ticked lots.
  function lorries(estate) {
    return EA.local.get('fh.collect', []).filter(function (s) { return s.estate === estate && s.dispatch && (s.dispatch.parts || []).length; });
  }
  function lotIds(s) { return values(s.lotIds).concat(values(s.disIds)); }

  // skip: { trip } gives back the bunches of the lorry being corrected,
  //       { ticket } gives back the bunches of the ticket being corrected.
  function openLines(estate, skip) {
    skip = skip || {};
    var office = !!EA.sendLink();
    // The office list has already taken off what it received; this phone's own entries still waiting have not.
    var lines = (office ? EA.local.get(K.harv + estate, []) : localHarvest(estate)).map(function (h) { return Object.assign({}, h, { bunches: num(h.bunches) }); });
    function adjust(h, n) {
      var x = lines.find(function (y) { return y.id === h.id; });
      if (x) x.bunches += n; else if (n > 0) lines.push({ id: h.id, date: h.date, lot: h.lot, block: h.block, worker_id: h.worker_id, bunches: n });
    }
    var all = lorries(estate);
    all.forEach(function (s) {
      var d = s.dispatch, atOffice = office && !waiting(lotIds(s));
      if (d.replacedBy) {
        // Corrected: the office still counts the old one until the new one arrives there.
        var nw = all.find(function (x) { return x !== s && x.dispatch.trip === d.trip && !x.dispatch.replacedBy; });
        if (atOffice && nw && waiting(lotIds(nw))) d.parts.forEach(function (h) { adjust(h, h.bunches); });
        return;
      }
      if (skip.trip && d.trip === skip.trip) { if (atOffice) d.parts.forEach(function (h) { adjust(h, h.bunches); }); return; }
      if (!atOffice) d.parts.forEach(function (h) { adjust(h, -h.bunches); });
    });
    EA.local.get('fh.tickets', []).forEach(function (t) {
      if (t.estate !== estate || t.source === 'dn') return;     // a ticket that took its lots from the delivery note adds nothing here
      var atOffice = office && !EA.isWaiting(t.ids.ticket);
      (t.harv || []).forEach(function (h) {
        if (skip.ticket && t.key === skip.ticket) { if (atOffice) adjust(h, h.bunches); }
        else if (!atOffice) adjust(h, -h.bunches);
      });
    });
    return lines.filter(function (h) { return h.bunches > 0; });
  }

  // The lots with harvest still open, oldest crop first within a lot.
  function openLots(estate, skip) {
    var g = {};
    openLines(estate, skip).forEach(function (h) {
      var x = g[h.lot] || (g[h.lot] = { lot: h.lot, block: h.block, open: 0, dates: [], lines: [], workers: [] });
      x.open += h.bunches; x.lines.push(h);
      if (x.dates.indexOf(h.date) < 0) x.dates.push(h.date);
      if (x.workers.indexOf(h.worker_id) < 0) x.workers.push(h.worker_id);
    });
    return Object.keys(g).map(function (k) {
      var x = g[k];
      x.lines.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); x.dates.sort();
      return x;
    }).sort(function (a, b) { return a.block === b.block ? byLot(a.lot, b.lot) : (a.block < b.block ? -1 : 1); });
  }

  // sel = { lot: bunches }. Each lot's bunches are taken from its lines, oldest crop first
  // (with one harvester per lot, that is just his line).
  function takeParts(lots, sel) {
    var parts = [];
    lots.forEach(function (l) {
      var left = Math.min(num(sel[l.lot]), l.open);
      l.lines.forEach(function (h) {
        if (left <= 0) return;
        var take = Math.min(h.bunches, left); left -= take;
        parts.push({ id: h.id, date: h.date, lot: h.lot, block: h.block, worker_id: h.worker_id, bunches: take });
      });
    });
    return parts;
  }

  // Ask the office for the open harvest and the lorries still waiting for a ticket.
  async function refreshOpen(estate) {
    if (!EA.sendLink()) return false;
    var r1 = await EA.ask('trips', { estate: estate });
    if (r1 && r1.trips) EA.local.set(K.trips + estate, r1.trips);
    var r2 = await EA.ask('harvest', { estate: estate });
    if (r2 && r2.lines) EA.local.set(K.harv + estate, r2.lines);
    return !!(r1 && r1.trips) || !!(r2 && r2.lines);
  }

  EA.fh.harvest = { openLines: openLines, openLots: openLots, takeParts: takeParts, refreshOpen: refreshOpen, byLot: byLot };
})();
