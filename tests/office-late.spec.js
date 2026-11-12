// E-Book test (1.56) Susulan harian · the daily follow-up list for HQ (Yu Chen, 12 Nov 2026; Brief_Amaran 0.7).
// One read, 'late', for HQ and the Owner: per estate where Field & Harvest is open, every late line with the name of
// the person who owns it and how to fix it, and a four-box board. Office script. Made-up people only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const pad = n => String(n).padStart(2, '0');
let NOW = null;   // a fixed clock, so the 6:30, 10:00 and 5:00 limits can be tested at any hour
function fmt(d, z, f) { const t = new Date(d.getTime() + 8 * 3600e3); return f.replace(/yyyy|MM|dd|HH|mm|ss/g, k => ({ yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()) })[k]); }
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => { const y = x.slice(c - 1, c - 1 + nc); while (y.length < nc) y.push(''); return y; }) }; };
const R = (id, d, extra) => [id, d, 'SPLT', 'SSGT', 'STF-1', d + ' 07:00', 'P13', 'active', ''].concat(extra);

// The clock: Thursday 12 Nov 2026. Days are named from it.
const DAY = n => { const t = new Date(Date.UTC(2026, 10, 12 - n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); };
const at = (day, hhmm) => new Date(day + 'T' + hhmm + ':00+08:00');
function build() {
  const tabs = {
    // lot 1-2 harvested 3 days ago, still in the field (80 bunches); lot 1-1 collected
    FH_WORK: new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
      R('w1', DAY(6), ['c', 'H1', 'HA', '01', '1-1', '', 'bunch', '100']), R('w2', DAY(3), ['c', 'H2', 'HA', '01', '1-2', '', 'bunch', '80'])]),
    FH_COLLECT: new Sheet([std.concat(['block','lot','bunches','cleared','tractor','loader','note']), R('c1', DAY(5), ['01', '1-1', '100', 'Y', '', '', ''])]),
    // T1 has its ticket; T2 went 3 days ago and has none
    FH_DISPATCH: new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver']),
      R('d1', DAY(5), ['100', 'L', 'BOU', 'Y', '', '01', 'T1', '8001', 'D']), R('d2', DAY(3), ['10', 'L', 'BOU', 'Y', '', '01', 'T2', '8002', 'D'])]),
    FH_TICKET: new Sheet([std.concat(['ticket_no','trip','mill','do_no','nett_mt','bunches','abw_kg']), R('t1', DAY(5), ['900', 'T1', 'BOU', '8001', '2.00', '100', '20'])]),
    FH_ALERT: new Sheet([std.concat(['chit','kind','block','lot','detail','staff_note','direction','direction_by','received_at','ref'])]),
    // a chit yesterday (not closed) and none today
    FH_CHIT: new Sheet([std.concat(['chit','rev','confirmed_at','note']), R('ch1', DAY(1), ['MC-1', '1', '06:10', ''])]),
    FH_DAYCLOSE: new Sheet([std.concat(['chit','kind','closed_by','closed_at','checks','rain_when','rain_reason','rain_lost','rain_jobs'])]),
    USERS: new Sheet([['user_code','name','role','estates','key_hash','status','added_at','phones','position'],
      ['STF-SSGT-01', 'Staf Contoh', 'Staff', 'SSGT', 'x', 'active', '', 'P13', ''], ['CLK-SSGT-01', 'Kerani Contoh', 'Clerk', 'SSGT,PTAN', 'x', 'active', '', 'P14', ''],
      ['MGR-SSGT-01', 'Pengurus Contoh', 'Manager', 'SSGT,PTAN', 'x', 'active', '', 'P15', ''], ['L-STF-01', 'Latihan Staf', 'Staff', 'SSGT', 'x', 'active', '', '', ''],
      ['STF-OLD-01', 'Staf Lama', 'Staff', 'SSGT', 'x', 'off', '', '', '']])
  };
  const book = { getSheetByName: n => tabs[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur' };
  const mem = {}, props = { SWITCHES: JSON.stringify({ testModeOff: true, live: { 'field-harvest': ['SSGT'] } }), DAYCLOSE_FROM: '2026-11-01' };
  const RealDate = Date;
  function FakeDate(...a) { return a.length ? new RealDate(...a) : new RealDate(NOW.getTime()); }
  FakeDate.now = () => NOW.getTime(); FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse; FakeDate.prototype = RealDate.prototype;
  const ctx = { console, Date: FakeDate, Utilities: { formatDate: fmt }, SpreadsheetApp: { openById: () => book }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
    CacheService: { getScriptCache: () => ({ get: k => mem[k] || null, put: (k, v) => { mem[k] = v; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, getProperties: () => props }) },
    LockService: {}, ContentService: {}, Logger: { log() {} } };
  vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
  return { ctx, tabs };
}
function late(env, role, estates) { env.ctx.ROWS_MEMO_ = {}; try { return env.ctx.late_({ user_code: role + '-1', role, estates: estates || ['SSGT', 'PTAN'] }, {}); } finally { env.ctx.ROWS_MEMO_ = null; } }
const kinds = e => e.items.map(i => i.kind).sort().join(' ');
const one = (e, k) => e.items.filter(i => i.kind === k)[0];

// ---------- Thursday 10:30 am: Wawa's time ----------
NOW = at(DAY(0), '10:30');
let env = build(), j = late(env, 'HQ'), e = j.estates && j.estates[0];
check('HQ gets the list; only the estate where Field & Harvest is open (SSGT, not PTAN)', j.ok && j.estates.length === 1 && e.estate === 'SSGT', JSON.stringify((j.estates || []).map(x => x.estate)));
check('four late lines: chit today, yesterday not closed, fruit overdue, ticket late', kinds(e) === 'CH DN FO TH', kinds(e));
check('each line carries the owner by name: the staff for chit, close and fruit', ['CH', 'TH', 'FO'].every(k => one(e, k).who === 'Staf Contoh' && one(e, k).role === 'Staff'), e.items.map(i => i.kind + '=' + i.who).join(' '));
check('the ticket line belongs to the clerk', one(e, 'DN').who === 'Kerani Contoh' && one(e, 'DN').role === 'Clerk' && /LEWAT: tiket DN 8002/.test(one(e, 'DN').bm), one(e, 'DN').bm);
check('practice and switched-off users are never named', !/Latihan|Lama/.test(JSON.stringify(e)));
check('each line says how to fix it', e.items.every(i => i.fix && i.fix.length > 10) && /KUNCI HARI/.test(one(e, 'TH').fix) && /Tiket/.test(one(e, 'DN').fix), e.items.map(i => i.fix).join(' | '));
check('fruit line keeps the bunches, tonnes and days the staff sees', /LEBIH TEMPOH: 80 tandan ≈ 1\.6 tan/.test(one(e, 'FO').bm) && /3 hari/.test(one(e, 'FO').sub), one(e, 'FO').bm);
check('the board: chit no, close no, ticket no, fruit no', e.board.chit === 'no' && e.board.close === 'no' && e.board.ticket === 'no' && e.board.fruit === 'no', JSON.stringify(e.board));
check('the manager is named; today\'s lines are not yet his before 5:00 petang, lines late since before today already are (1.58)', e.manager === 'Pengurus Contoh' && one(e, 'CH').mg === false && one(e, 'TH').mg === false && one(e, 'FO').mg === true && one(e, 'DN').mg === true && e.withManager === true, e.items.map(i => i.kind + '=' + i.mg).join(' '));
check('the Owner gets the same list', kinds(late(env, 'Owner').estates[0]) === 'CH DN FO TH');
check('the estate\'s own people are refused (Staff, Clerk, Manager)', ['Staff', 'Clerk', 'Manager'].every(r => late(env, r).error === 'not_allowed'));
check('an HQ login without the estate gets nothing', late(env, 'HQ', ['MELU']).estates.length === 0);
check('listed as a read, so it is never sent down the saving path', env.ctx.READS_.late === 1);

// ---------- the work gets done: the lines go by themselves ----------
env.tabs.FH_CHIT.rows.push(R('ch2', DAY(0), ['MC-2', '1', '06:05', '']));
e = late(env, 'HQ').estates[0];
check('today\'s chit keyed: the chit line goes', !one(e, 'CH') && e.board.chit === 'ok', kinds(e));
env.tabs.FH_DAYCLOSE.rows.push(R('dc1', DAY(1), ['MC-1', 'close', 'STF-1', DAY(0) + ' 07:00', '', '', '', '', '']));
e = late(env, 'HQ').estates[0];
check('yesterday closed: the close line goes', !one(e, 'TH') && e.board.close === 'ok', kinds(e));
env.tabs.FH_COLLECT.rows.push(R('c2', DAY(0), ['01', '1-2', '80', 'Y', '', '', '']));
e = late(env, 'HQ').estates[0];
check('fruit keyed to the ramp: the field line goes (the ramp now holds today\'s fruit only)', !one(e, 'FO') && e.board.fruit === 'ok', kinds(e) + ' ' + JSON.stringify(e.board));
env.tabs.FH_TICKET.rows.push(R('t2', DAY(3), ['901', 'T2', 'BOU', '8002', '0.20', '10', '20']));
e = late(env, 'HQ').estates[0];
check('ticket keyed: nothing is late, the board is all ok', e.items.length === 0 && Object.values(e.board).every(v => v === 'ok') && e.withManager === false, kinds(e) + ' ' + JSON.stringify(e.board));

// ---------- 1.56.1: said once, and a full ramp says how many lorries ----------
NOW = at(DAY(0), '10:30'); env = build(); e = late(env, 'HQ').estates[0];
check('1.56.1 day not closed: the line has no button name, the detail only its age, the fix names KUNCI HARI', !/TUTUP HARI/.test(one(e, 'TH').bm) && one(e, 'TH').sub === 'Semalam' && /KUNCI HARI/.test(one(e, 'TH').fix), one(e, 'TH').bm + ' | ' + one(e, 'TH').sub);
env.tabs.FH_WORK.rows.push(R('w9', DAY(2), ['c', 'H1', 'HA', '01', '1-3', '', 'bunch', '1000']));
env.tabs.FH_COLLECT.rows.push(R('c9', DAY(2), ['01', '1-3', '1000', 'Y', '', '', '']));
e = late(env, 'HQ').estates[0];
check('1.56.1 full ramp: the line does not repeat "panggil lori"; the fix says how many full lorries, no under-8-tan advice', !!one(e, 'RP') && !/panggil lori/.test(one(e, 'RP').bm) && /cukup untuk \d+ lori penuh/.test(one(e, 'RP').fix) && !/Kurang 8 tan/.test(one(e, 'RP').fix) && /kunci DN/.test(one(e, 'RP').fix), one(e, 'RP') ? one(e, 'RP').bm + ' | ' + one(e, 'RP').fix : kinds(e));

// ---------- the clock ----------
NOW = at(DAY(0), '06:10'); env = build(); e = late(env, 'HQ').estates[0];
check('6:10 pagi: the chit is not late yet (limit 6:30), board says wait', !one(e, 'CH') && e.board.chit === 'wait', kinds(e) + ' ' + e.board.chit);
NOW = at(DAY(0), '17:05'); env = build(); e = late(env, 'HQ').estates[0];
check('5:05 petang with lines still open: they are the Pengurus\'s now', e.withManager === true && e.items.length > 0);
NOW = at(DAY(-3), '10:30'); env = build(); e = late(env, 'HQ').estates[0];   // Sunday 15 Nov 2026
check('Sunday: no chit line, board says rest; fruit still counts', !one(e, 'CH') && e.board.chit === 'rest' && !!one(e, 'FO'), kinds(e) + ' ' + e.board.chit);
