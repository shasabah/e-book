// E-Book test (1.54) the FFB rules of 11 Nov 2026 (Yu Chen): harvested fruit must be at the ramp by the end of the day
// after harvest (Sunday counts) — the staff's line, then the Pengurus's by name, then the Owner; the weighbridge
// ticket is keyed by 10:00 am the day after the lorry (Saturday's lorry: Monday). Office script. Made-up workers.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const pad = n => String(n).padStart(2, '0');
function fmt(d, z, f) { const t = new Date(d.getTime() + 8 * 3600e3); return f.replace(/yyyy|MM|dd|HH|mm|ss/g, k => ({ yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()) })[k]); }
const ago = n => fmt(new Date(Date.now() - n * 864e5), '', 'yyyy-MM-dd');
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => { const y = x.slice(c - 1, c - 1 + nc); while (y.length < nc) y.push(''); return y; }) }; };
const R = (id, d, extra) => [id, d, 'SPLT', 'SSGT', 'STF-1', d + ' 07:00', 'P13', 'active', ''].concat(extra);
const tabs = {
  // lot 1-2 harvested 3 days ago, still in the field (80); lot 1-3 harvested yesterday, still in the field (40); lot 1-1 collected
  FH_WORK: new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
    R('w1', ago(6), ['c', 'H1', 'HA', '01', '1-1', '', 'bunch', '100']), R('w2', ago(3), ['c', 'H2', 'HA', '01', '1-2', '', 'bunch', '80']),
    R('w4', ago(1), ['c', 'H1', 'HA', '01', '1-3', '', 'bunch', '40'])]),
  FH_COLLECT: new Sheet([std.concat(['block','lot','bunches','cleared','tractor','loader','note']), R('c1', ago(5), ['01', '1-1', '100', 'Y', '', '', ''])]),
  // T1 has its ticket; T2 went 3 days ago, no ticket; T3 went yesterday, no ticket
  FH_DISPATCH: new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver']),
    R('d1', ago(5), ['100', 'L', 'BOU', 'Y', '', '01', 'T1', '8001', 'D']), R('d2', ago(3), ['10', 'L', 'BOU', 'Y', '', '01', 'T2', '8002', 'D']), R('d3', ago(1), ['10', 'L', 'BOU', 'Y', '', '01', 'T3', '8003', 'D'])]),
  FH_TICKET: new Sheet([std.concat(['ticket_no','trip','mill','do_no','nett_mt','bunches','abw_kg']), R('t1', ago(5), ['900', 'T1', 'BOU', '8001', '2.00', '100', '20'])]),
  FH_ALERT: new Sheet([std.concat(['chit','kind','block','lot','detail','staff_note','direction','direction_by','received_at','ref'])])
};
const book = { getSheetByName: n => tabs[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur' };
const mem = {};
const ctx = { console, Utilities: { formatDate: fmt }, SpreadsheetApp: { openById: () => book }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: k => mem[k] || null, put: (k, v) => { mem[k] = v; } }) }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
  LockService: {}, ContentService: {}, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
function todo(role) { ctx.ROWS_MEMO_ = {}; try { return ctx.todo_({ user_code: role === 'Owner' ? 'OWN-ALL-01' : role + '-1', role, estates: ['SSGT'] }, { estate: 'SSGT' }); } finally { ctx.ROWS_MEMO_ = null; } }
const by = (j, re) => (j.items || []).filter(i => re.test(i.id));

// ---- fruit in the field ----
const st = todo('Staff'), fo = by(st, /^FO:/)[0], fc = by(st, /^FC:/)[0];
check('Staff: fruit harvested 3 days ago is OVERDUE, with bunches, tonnes and days', fo && fo.p === 1 && /LEBIH TEMPOH: 80 tandan ≈ 1\.6 tan/.test(fo.bm) && /3 hari/.test(fo.sub) && /Blk 01 80/.test(fo.sub), fo && (fo.bm + ' | ' + fo.sub));
check('Staff: yesterday\'s fruit must reach the ramp today', fc && /40 tandan ≈ 0\.8 tan dituai semalam · mesti ke ramp hari ini/.test(fc.bm), fc && fc.bm);
// 1.58: fruit overdue since yesterday is the Pengurus's own line with his three buttons (it replaces the FM line)
const mg = todo('Manager'), fm = by(mg, /^MG:FO:/)[0];
check('Pengurus: only the overdue fruit is his line, with his three buttons (1.58)', fm && fm.p === 1 && /^Kini tanggungjawab anda: LEBIH TEMPOH: 80 tandan/.test(fm.bm) && /Staf belum jawab/.test(fm.sub) && fm.go === 'mgr' && !by(mg, /^FC:/).length && !by(mg, /^FM:/).length, fm && fm.bm);
// 1.58: it reaches the Owner the morning after it became the Pengurus's, with both sides (it replaces the FW line)
const ow = todo('Owner'), fw = by(ow, /^OW:FO:/)[0];
check('Owner: overdue fruit the Pengurus has not answered reaches him, once (1.58)', fw && /^Tersangkut: LEBIH TEMPOH: 80 tandan/.test(fw.bm) && /belum jawab/.test(fw.sub) && !by(ow, /^FW:/).length, fw && fw.bm);
// collected: every line goes
tabs.FH_COLLECT.rows.push(R('c2', ago(0), ['01', '1-2', '80', 'Y', '', '', '']), R('c3', ago(0), ['01', '1-3', '40', 'Y', '', '', '']));
check('once the fruit is keyed to the ramp the lines go (Staff, Pengurus, Owner)', !by(todo('Staff'), /^F[OC]:/).length && !by(todo('Manager'), /^(FM:|MG:FO:)/).length && !by(todo('Owner'), /^(FW:|OW:FO:)/).length);

// ---- the ticket by 10:00 am the day after the lorry ----
check('ticket due: a Wednesday lorry is due Thursday; a Saturday lorry is due Monday', ctx.ticketDue_('2026-11-11') === '2026-11-12' && ctx.ticketDue_('2026-11-14') === '2026-11-16' && ctx.ticketDue_('2026-11-13') === '2026-11-14');
const hm = fmt(new Date(), '', 'HH:mm'), dow1 = new Date(ago(1) + 'T00:00:00Z').getUTCDay(), due3 = ctx.ticketDue_(ago(1));
const t3late = ago(0) > due3 || (ago(0) === due3 && hm >= '10:00');
const ck = todo('Clerk'), d2 = by(ck, /^DN:T2/)[0], d3 = by(ck, /^DN:T3/)[0];
check('Clerk: the lorry of 3 days ago is LATE, red', d2 && d2.p === 1 && /LEWAT: tiket DN 8002/.test(d2.bm) && /10:00/.test(d2.sub), d2 && d2.bm);
check('Clerk: yesterday\'s lorry — before 10:00 "key before 10:00", after it LATE', d3 && (t3late ? /LEWAT/.test(d3.bm) : /sebelum 10:00 pagi/.test(d3.bm)), d3 && d3.bm + ' @' + hm);
check('Clerk: the lorry with a ticket has no line', !by(ck, /^DN:T1/).length);
const hq = todo('HQ'), h2 = by(hq, /^DN:T2/)[0];
check('HQ (Wawa): sees the late ticket, to key when the clerk is on leave', h2 && /lewat · kunci jika kerani bercuti/.test(h2.bm), h2 && h2.bm);
check('HQ: a ticket not yet late is not her line', t3late || !by(hq, /^DN:T3/).length);
const m2 = by(todo('Manager'), /^(DN:T2|MG:DN:T2)/)[0];   // 1.58: his own line once it has passed to him (5:00 petang of the due day)
check('Pengurus: the late ticket is on his list', m2 && /tiket DN 8002/.test(m2.bm) && by(todo('Manager'), /^(DN:T2|MG:DN:T2)/).length === 1, m2 && m2.bm);
const o2 = by(todo('Owner'), /^(DN:T2|OW:DN:T2)/)[0], past = ctx.dayDiff_(ctx.ticketDue_(ago(3)), ago(0));
check('Owner: 2 days past the deadline it has reached him, once (1.58: from the morning after it passed to the Pengurus)', (past >= 2 ? (o2 && /Tersangkut: .*tiket DN 8002/.test(o2.bm)) : true) && by(todo('Owner'), /^(DN:T2|OW:DN:T2)/).length <= 1, 'past ' + past + ' ' + (o2 && o2.bm));
check('Staff: no ticket lines', !by(todo('Staff'), /^DN:/).length);
