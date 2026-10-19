// Field & Harvest room — shared: the harvest still open, lot by lot (v19).
// Used by the delivery note (Kutip & hantar), where the staff ticks the lots that go on the
// lorry, and by the mill ticket, which takes the lots from that delivery note.
//
// Each line is one harvester's bunches on one lot and day (the mandor's count on Kerja harian,
// task HA). A line leaves the open list when it goes on a lorry (FH_DISPATCH_LOT), or, for a
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

  // Harvest keyed by block only (no lot yet, v1.1) is one lot "Blk 03" for that block.
  function lotKey(h) { return h.lot || (h.block ? 'Blk ' + h.block : ''); }
  EA.fh.lotLabel = function (lot, block) { return /^Blk /.test(lot) ? lot + ' (' + EA.t('semua petak', 'all lots') + ')' : 'Petak ' + lot + ' · Blk ' + block; };
  function localHarvest(estate) {
    var out = [];
    EA.local.get('fh.work', []).forEach(function (s) {
      if (s.estate !== estate) return;
      s.rec.lines.forEach(function (l) {
        if (l.task_code === EA.lists.HARVEST && num(l.bunches) > 0 && l.id) out.push({ id: l.id, date: s.date, lot: lotKey(l), block: l.block, worker_id: l.worker_id, bunches: num(l.bunches), hist: l.hist || [] });
      });
    });
    return out;
  }

  // Lorry loads saved on this phone that carry ticked lots.
  function lorries(estate) {
    return EA.local.get('fh.collect', []).filter(function (s) { return s.estate === estate && s.dispatch && (s.dispatch.parts || []).length; });
  }
  function lotIds(s) { return values(s.lotIds).concat(values(s.disIds)); }

  // skip: { trip } gives back the bunches of the lorry being corrected (on this phone),
  //       { ticket } gives back the bunches of the ticket being corrected.
  function openLines(estate, skip) {
    skip = skip || {};
    var office = !!EA.sendLink();
    // The office list has already taken off what it received; this phone's own entries still waiting have not.
    var lines = (office ? EA.local.get(K.harv + estate, []) : localHarvest(estate)).map(function (h) { return Object.assign({}, h, { lot: lotKey(h), bunches: num(h.bunches) }); });
    // A corrected harvester line has a new id; anything that took the old id counts against the new one.
    var newer = {};
    localHarvest(estate).forEach(function (h) { (h.hist || []).forEach(function (v) { newer[v[0]] = h.id; }); });
    if (office) {   // harvest keyed on this phone and not yet at the office (v22)
      var have = {}; lines.forEach(function (h) { have[h.id] = true; });
      localHarvest(estate).forEach(function (h) {
        if (have[h.id] || !EA.isWaiting(h.id)) return;
        // A correction still waiting: the office knows an earlier version (the newest one already
        // sent there). Its balance moves to this line, changed by the difference in bunches.
        var known = null;
        (h.hist || []).forEach(function (v) { if (!EA.isWaiting(v[0])) known = v; });
        if (!known) { lines.push(h); return; }
        var at = lines.findIndex(function (y) { return y.id === known[0]; });
        var left = (at >= 0 ? lines[at].bunches : 0) + h.bunches - num(known[1]);
        if (at >= 0) lines.splice(at, 1);
        if (left > 0) lines.push(Object.assign({}, h, { bunches: left }));
      });
    }
    function adjust(h, n) {
      if (newer[h.id]) h = Object.assign({}, h, { id: newer[h.id] });
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

  // Write a delivery note's rows: one per block on the lorry (FH_DISPATCH) and one per harvester line
  // ticked (FH_DISPATCH_LOT), tied together by the trip code. With old (the delivery note being corrected:
  // { date, dispatch, disIds, lotIds }) the new rows replace the old ones and leftovers get a 'removed' row.
  // rec = { date, dispatch: { trip, dn, driver, lorry, mill, ramp_cleared, blocks, parts } }; fills rec.ids / disIds / lotIds.
  function writeDn(estate, rec, old) {
    var d = rec.dispatch, trip = d.trip;
    rec.ids = rec.ids || []; rec.disIds = {}; rec.lotIds = {};
    var oldB = old ? Object.assign({}, old.disIds) : {}, oldL = old ? Object.assign({}, old.lotIds) : {};
    var bl = Object.keys(d.blocks).sort();
    if (!bl.length) bl = [''];   // ramp emptied with no load
    bl.forEach(function (b) {
      var id = EA.save('FH_DISPATCH', 'FH', estate, { date: rec.date, block: b, trip: trip, dn_no: d.dn, driver: d.driver, bunches: String(num(d.blocks[b])), lorry: d.lorry, mill: d.mill, ramp_cleared: d.ramp_cleared || '', note: '' }, oldB[b] || '').id;
      rec.ids.push(id); rec.disIds[b] = id; delete oldB[b];
    });
    d.parts.forEach(function (h) {
      var id = EA.save('FH_DISPATCH_LOT', 'FH', estate, { date: rec.date, trip: trip, dn_no: d.dn, block: h.block, lot: h.lot, work_id: h.id, date_cut: h.date, worker_id: h.worker_id, bunches: String(h.bunches) }, oldL[h.id] || '').id;
      rec.ids.push(id); rec.lotIds[h.id] = id; delete oldL[h.id];
    });
    if (!old) return rec;
    var od = old.dispatch;
    Object.keys(oldB).forEach(function (b) {
      rec.ids.push(EA.save('FH_DISPATCH', 'FH', estate, { date: old.date, block: b, trip: trip, dn_no: od.dn, driver: od.driver, bunches: String(num(od.blocks[b])), lorry: od.lorry, mill: od.mill, ramp_cleared: od.ramp_cleared || '', note: '' }, oldB[b], 'removed').id);
    });
    Object.keys(oldL).forEach(function (wid) {
      var h = (od.parts || []).find(function (x) { return x.id === wid; }) || {};
      rec.ids.push(EA.save('FH_DISPATCH_LOT', 'FH', estate, { date: old.date, trip: trip, dn_no: od.dn, block: h.block || '', lot: h.lot || '', work_id: wid, date_cut: h.date || '', worker_id: h.worker_id || '', bunches: String(h.bunches || '') }, oldL[wid], 'removed').id);
    });
    return rec;
  }

  // Bunches still in the field, by lot (cut, not yet collected to the ramp). From the office's backlog,
  // plus this phone's own entries the office has not counted yet (v22).
  function fieldLeft(estate) {
    var b = EA.fh.getBacklog(estate), m = {};
    (b && b.field || []).forEach(function (x) { m[x.lot] = (m[x.lot] || 0) + num(x.bunches); });
    if (!EA.sendLink()) return m;     // test copy: the backlog is worked out from this phone already
    var at = (b && b.at) || '';
    localHarvest(estate).forEach(function (h) { if (EA.isWaiting(h.id)) m[h.lot] = (m[h.lot] || 0) + h.bunches; });
    EA.local.get('fh.collect', []).forEach(function (s) {
      if (s.estate !== estate) return;
      var after = !at || (s.date + ' ' + s.at) >= at;
      (s.lines || []).forEach(function (l) {
        if (!(l.id && EA.isWaiting(l.id)) && !after) return;
        m[l.lot] = l.cleared === 'Y' ? 0 : (m[l.lot] || 0) - num(l.bunches);
      });
    });
    Object.keys(m).forEach(function (k) { if (m[k] < 0) m[k] = 0; });
    return m;
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

  EA.fh.harvest = { openLines: openLines, openLots: openLots, takeParts: takeParts, writeDn: writeDn, refreshOpen: refreshOpen, byLot: byLot, fieldLeft: fieldLeft };
})();
