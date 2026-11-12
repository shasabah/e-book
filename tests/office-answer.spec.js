// E-Book test (1.57) The app asks first (Yu Chen, 12 Nov 2026 "ok"; Brief_Amaran 0.7 step 1). A late line of the
// staff or the clerk carries its reasons and its state: new (Baru), doing (Dalam tindakan), missed. The person's
// answer is one new FH_ALERT row, kind "answer"; only the real work closes a line. Office script. Made-up people only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const pad = n => String(n).padStart(2, '0');
let NOW = null;
function fmt(d, z, f) { const t = new Date(d.getTime() + 8 * 3600e3); return f.replace(/yyyy|MM|dd|HH|mm|ss/g, k => ({ yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()) })[k]); }
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => { const y = x.slice(c - 1, c - 1 + (nc || 1)); while (y.length < (nc || 1)) y.push(''); return y; }), setValue: v => { while (s.rows[r - 1].length < c) s.rows[r - 1].push(''); s.rows[r - 1][c - 1] = v; } }; };
Sheet.prototype.appendRow = function (v) { this.rows.push(v.map(x => String(x).replace(/^'/, ''))); };
const R = (id, d, extra) => [id, d, 'SPLT', 'SSGT', 'STF-1', d + ' 07:00', 'P13', 'active', ''].concat(extra);
const DAY = n => { const t = new Date(Date.UTC(2026, 10, 12 - n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); };   // Thursday 12 Nov 2026
const at = (day, hhmm) => new Date(day + 'T' + hhmm + ':00+08:00');
function build() {
  const tabs = {
    FH_WORK: new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
      R('w1', DAY(6), ['c', 'H1', 'HA', '01', '1-1', '', 'bunch', '100']), R('w2', DAY(3), ['c', 'H2', 'HA', '01', '1-2', '', 'bunch', '80'])]),
    FH_COLLECT: new Sheet([std.concat(['block','lot','bunches','cleared','tractor','loader','note']), R('c1', DAY(5), ['01', '1-1', '100', 'Y', '', '', ''])]),
    FH_DISPATCH: new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver']),
      R('d1', DAY(5), ['100', 'L', 'BOU', 'Y', '', '01', 'T1', '8001', 'D']), R('d2', DAY(3), ['10', 'L', 'BOU', 'Y', '', '01', 'T2', '8002', 'D'])]),
    FH_TICKET: new Sheet([std.concat(['ticket_no','trip','mill','do_no','nett_mt','bunches','abw_kg']), R('t1', DAY(5), ['900', 'T1', 'BOU', '8001', '2.00', '100', '20'])]),
    // the old header, without "due": the office adds the column itself at the first answer
    FH_ALERT: new Sheet([std.concat(['chit','kind','block','lot','detail','staff_note','direction','direction_by','received_at','ref'])]),
    FH_CHIT: new Sheet([std.concat(['chit','rev','confirmed_at','note']), R('ch1', DAY(1), ['MC-1', '1', '06:10', '']), R('ch0', DAY(0), ['MC-2', '1', '06:05', ''])]),
    FH_DAYCLOSE: new Sheet([std.concat(['chit','kind','closed_by','closed_at','checks','rain_when','rain_reason','rain_lost','rain_jobs'])]),
    USERS: new Sheet([['user_code','name','role','estates','key_hash','status','added_at','phones','position'],
      ['STF-SSGT-01', 'Staf Contoh', 'Staff', 'SSGT', 'x', 'active', '', 'P13', ''], ['CLK-SSGT-01', 'Kerani Contoh', 'Clerk', 'SSGT', 'x', 'active', '', 'P14', ''],
      ['MGR-SSGT-01', 'Pengurus Contoh', 'Manager', 'SSGT', 'x', 'active', '', 'P15', '']])
  };
  const book = { getSheetByName: n => tabs[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur' };
  const mem = {}, props = { SWITCHES: JSON.stringify({ testModeOff: true, live: { 'field-harvest': ['SSGT'] } }), DAYCLOSE_FROM: '2026-11-01' };
  const RealDate = Date;
  function FakeDate(...a) { return a.length ? new RealDate(...a) : new RealDate(NOW.getTime()); }
  FakeDate.now = () => NOW.getTime(); FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse; FakeDate.prototype = RealDate.prototype;
  const ctx = { console, Date: FakeDate, Utilities: { formatDate: fmt }, SpreadsheetApp: { openById: () => book }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
    CacheService: { getScriptCache: () => ({ get: k => mem[k] || null, put: (k, v) => { mem[k] = v; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, getProperties: () => props }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => {} }) }, ContentService: {}, Logger: { log() {} } };
  vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
  return { ctx, tabs };
}
const U = role => ({ user_code: { Staff: 'STF-SSGT-01', Clerk: 'CLK-SSGT-01', Manager: 'MGR-SSGT-01', HQ: 'HQ-1', Owner: 'OWN-1' }[role], role, estates: ['SSGT'] });
function todo(env, role) { env.ctx.ROWS_MEMO_ = {}; try { return env.ctx.todo_(U(role), { estate: 'SSGT' }); } finally { env.ctx.ROWS_MEMO_ = null; } }
function late(env) { env.ctx.ROWS_MEMO_ = {}; try { return env.ctx.late_(U('HQ'), {}).estates[0]; } finally { env.ctx.ROWS_MEMO_ = null; } }
const ans = (env, role, ref, why, by) => env.ctx.lateAnswer_(U(role), { estate: 'SSGT', ref, why, by, phone: 'P13' });
const it = (j, id) => (j.items || []).filter(i => i.id === id)[0];

// ---------- Thursday 07:00: the lines are new ----------
NOW = at(DAY(0), '07:00');
let env = build(), s = todo(env, 'Staff'), c = todo(env, 'Clerk');
const TH = 'TH:' + DAY(1), FO = 'FO:' + DAY(3), DN = 'DN:T2';
check('the staff\'s late lines carry reasons and are Baru (day not closed, fruit overdue)', it(s, TH) && it(s, TH).st === 'new' && it(s, TH).ask.length >= 4 && it(s, FO).st === 'new' && /Hujan/.test(JSON.stringify(it(s, FO).ask)), JSON.stringify((s.items || []).map(i => i.id + '=' + i.st)));
check('each reason has Bahasa and English, and the last is Lain-lain', it(s, TH).ask.every(a => a.length === 2) && it(s, TH).ask.slice(-1)[0][0] === 'Lain-lain');
check('the clerk\'s late ticket is Baru, with "Pemandu belum hantar gambar" first', it(c, DN) && it(c, DN).st === 'new' && it(c, DN).ask[0][0] === 'Pemandu belum hantar gambar', JSON.stringify(it(c, DN)));
check('lines that are not late work carry no question (the Pengurus, HQ, the Owner)', ['Manager', 'HQ', 'Owner'].every(r => (todo(env, r).items || []).every(i => !i.ask)));

// ---------- who may answer, and with what ----------
check('the Pengurus, HQ and the Owner cannot answer for the staff', ['Manager', 'HQ', 'Owner'].every(r => ans(env, r, TH, 'Belum sempat', 'am1').error === 'not_allowed'));
check('a reason is needed', ans(env, 'Staff', TH, ' ', 'am1').error === 'need_reason');
check('a time is needed, and only the three allowed', ans(env, 'Staff', TH, 'Belum sempat', 'next week').error === 'need_when');
check('the staff cannot answer the clerk\'s line, nor the clerk the staff\'s', ans(env, 'Staff', DN, 'Belum sempat', 'am1').error === 'nothing_waiting' && ans(env, 'Clerk', TH, 'Belum sempat', 'am1').error === 'nothing_waiting');
check('a line that does not exist cannot be answered', ans(env, 'Staff', 'TH:2020-01-01', 'Belum sempat', 'am1').error === 'nothing_waiting');

// ---------- the staff answers: this afternoon ----------
let j = ans(env, 'Staff', FO, 'Traktor rosak', 'pm0');
check('answer saved; the list comes back with the line Dalam tindakan', j.ok && j.done === 'answer' && it(j, FO).st === 'doing' && it(j, FO).ans.why === 'Traktor rosak' && it(j, FO).ans.due === DAY(0) + ' 17:00', JSON.stringify(it(j, FO)));
const head = env.tabs.FH_ALERT.rows[0], row = env.tabs.FH_ALERT.rows.slice(-1)[0], col = k => row[head.indexOf(k)];
check('one new row: kind answer, who, when, the line, the reason and the promised time', head.indexOf('due') >= 0 && col('kind') === 'answer' && col('keyed_by') === 'STF-SSGT-01' && col('ref') === FO && col('staff_note') === 'Traktor rosak' && col('due') === DAY(0) + ' 17:00' && col('estate') === 'SSGT' && /LEBIH TEMPOH/.test(col('detail')), JSON.stringify(row));
check('a line already Dalam tindakan is not answered twice', ans(env, 'Staff', FO, 'Hujan', 'am1').error === 'already');
check('the line stays on his list: an answer never closes it', !!it(todo(env, 'Staff'), FO));
check('the other line is still Baru', it(todo(env, 'Staff'), TH).st === 'new');
let e = late(env), lf = e.items.filter(i => i.id === FO)[0];
check('HQ\'s list shows his answer beside the line, and the board still says fruit is late', lf.st === 'doing' && /^Traktor rosak · janji 12\/11 petang$/.test(lf.ans) && e.board.fruit === 'no', JSON.stringify(lf));
check('HQ\'s list marks the unanswered line', e.items.filter(i => i.id === TH)[0].st === 'new');
check('the Pengurus has no "promise missed" line yet', !(todo(env, 'Manager').items || []).some(i => /^MJ:/.test(i.id)));

// ---------- 17:05: the promise is past and the fruit is still in the field ----------
NOW = at(DAY(0), '17:05');
s = todo(env, 'Staff');
check('past the promised time the line is missed, and can be answered again', it(s, FO).st === 'missed');
let m = (todo(env, 'Manager').items || []).filter(i => i.id === 'MJ:' + FO)[0];
check('the Pengurus gets "Janji terlepas" with the staff\'s answer', !!m && m.p === 1 && /^Janji terlepas: LEBIH TEMPOH/.test(m.bm) && /Staf jawab: Traktor rosak · janji 12\/11 petang/.test(m.sub), JSON.stringify(m));
check('"this afternoon" is refused after 5:00 petang', ans(env, 'Staff', FO, 'Traktor rosak', 'pm0').error === 'need_when');
j = ans(env, 'Staff', FO, 'Traktor masih rosak', 'am1');
check('the second answer is one more row; the first stays', j.ok && it(j, FO).st === 'doing' && it(j, FO).ans.n === 2 && it(j, FO).ans.due === DAY(-1) + ' 10:00' && env.tabs.FH_ALERT.rows.filter(r => r[head.indexOf('kind')] === 'answer').length === 2, JSON.stringify(it(j, FO)));
check('the Pengurus keeps the missed promise even after the new answer', (todo(env, 'Manager').items || []).some(i => i.id === 'MJ:' + FO));

// ---------- the clerk: the driver has not sent the photographs ----------
j = ans(env, 'Clerk', DN, 'Pemandu belum hantar gambar', 'am1');
m = (todo(env, 'Manager').items || []).filter(i => i.id === 'MJ:' + DN)[0];
check('the clerk\'s "driver has not sent the photographs" goes to the Pengurus at once', j.ok && !!m && /^Perlu Pengurus: LEWAT: tiket DN 8002/.test(m.bm) && /Kerani jawab: Pemandu belum hantar gambar/.test(m.sub), JSON.stringify(m));

// ---------- the work is done: the line and its answer go by themselves ----------
env.tabs.FH_COLLECT.rows.push(R('c2', DAY(0), ['01', '1-2', '80', 'Y', '', '', '']));
check('fruit keyed to the ramp: the line is gone for the staff and the Pengurus', !it(todo(env, 'Staff'), FO) && !(todo(env, 'Manager').items || []).some(i => i.id === 'MJ:' + FO));
check('the answers stay in the record', env.tabs.FH_ALERT.rows.filter(r => r[head.indexOf('kind')] === 'answer').length === 3);
check('lateAnswer is not a read (it writes)', !env.ctx.READS_.lateAnswer);
