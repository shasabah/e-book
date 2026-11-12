// E-Book test (1.58) The manager's three buttons (Yu Chen, 12 Nov 2026 "ok"; Brief_Amaran 0.9). From 5:00 petang a
// late line is the Pengurus's until the work is done: SELESAI (checked), AKAN SELESAI PADA (≤ 3 days, reason),
// PERLU BANTUAN IBU PEJABAT (HQ presses DIURUSKAN). The Owner the next morning. Office script. Made-up people only.
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


const mg = (env, role, ref, extra) => env.ctx.mgrAnswer_(U(role), Object.assign({ estate: 'SSGT', ref, phone: 'P15' }, extra));
const hd = (env, role, ref, note) => env.ctx.helpDone_(U(role), { estate: 'SSGT', ref, note, phone: 'P30' });
const ids = j => (j.items || []).map(i => i.id);
const rowsOf = (env, kind) => { const h = env.tabs.FH_ALERT.rows[0]; return env.tabs.FH_ALERT.rows.slice(1).filter(r => r[h.indexOf('kind')] === kind).map(r => Object.fromEntries(h.map((k, n) => [k, r[n]]))); };
const TH = 'TH:' + DAY(1), FO = 'FO:' + DAY(3), DN = 'DN:T2';

// ---------- Thursday 10:30 ----------
NOW = at(DAY(0), '10:30');
let env = build(), m = todo(env, 'Manager');
check('lines late since before today are already the Pengurus\'s (fruit, ticket); yesterday\'s open day is not yet', ids(m).indexOf('MG:' + FO) >= 0 && ids(m).indexOf('MG:' + DN) >= 0 && ids(m).indexOf('MG:' + TH) < 0, ids(m).join(' '));
let x = it(m, 'MG:' + FO);
check('his line: red, names the owner and says the staff has not answered, and carries the three-button data', x.p === 1 && /^Kini tanggungjawab anda: LEBIH TEMPOH/.test(x.bm) && /Staf Contoh · Staf belum jawab/.test(x.sub) && x.go === 'mgr' && x.ref === FO && x.days === 3 && x.need.length === 4, JSON.stringify(x));
check('his older lines for the same thing are folded into it (no FM, no DN twice)', ids(m).indexOf('FM:' + DAY(3)) < 0 && ids(m).filter(i => i === DN).length === 0, ids(m).join(' '));
check('the staff and the clerk cannot press the Pengurus\'s buttons', mg(env, 'Staff', FO, { mode: 'done' }).error === 'not_allowed' && mg(env, 'Clerk', DN, { mode: 'done' }).error === 'not_allowed' && mg(env, 'HQ', FO, { mode: 'done' }).error === 'not_allowed');

// SELESAI is checked by the office
let j = mg(env, 'Manager', FO, { mode: 'done' });
check('SELESAI while the fruit is still in the field is refused, and says what is left', j.error === 'not_done' && /80 tandan/.test(j.what), JSON.stringify(j));
check('nothing was written', env.tabs.FH_ALERT.rows.length === 1);

// AKAN SELESAI PADA
check('a date is needed: not today, not past 3 days', mg(env, 'Manager', FO, { mode: 'by', date: DAY(0), why: 'Traktor dibaiki' }).error === 'need_when' && mg(env, 'Manager', FO, { mode: 'by', date: DAY(-4), why: 'Traktor dibaiki' }).error === 'need_when' && mg(env, 'Manager', FO, { mode: 'by', date: 'esok', why: 'Traktor dibaiki' }).error === 'need_when');
check('a reason is needed', mg(env, 'Manager', FO, { mode: 'by', date: DAY(-2), why: 'x' }).error === 'need_reason');
check('a line that is not his yet cannot be answered', mg(env, 'Manager', TH, { mode: 'by', date: DAY(-1), why: 'Akan tutup' }).error === 'nothing_waiting');
j = mg(env, 'Manager', FO, { mode: 'by', date: DAY(-2), why: 'Traktor dibaiki Sabtu pagi' });
let r = rowsOf(env, 'manswer')[0];
check('AKAN SELESAI PADA saves one row: who, the line, the reason, due that day 5:00 petang', j.ok && j.done === 'by' && r && r.keyed_by === 'MGR-SSGT-01' && r.ref === FO && r.staff_note === 'Traktor dibaiki Sabtu pagi' && r.due === DAY(-2) + ' 17:00' && /LEBIH TEMPOH/.test(r.detail), JSON.stringify(r));
x = it(j, 'MG:' + FO);
check('his line turns quiet: "Dalam tindakan anda", with his own answer', x.p === 3 && /^Dalam tindakan anda: /.test(x.bm) && /Anda: akan selesai 14\/11 · Traktor dibaiki Sabtu pagi/.test(x.sub), JSON.stringify(x));
let e = late(env), lf = e.items.filter(i => i.id === FO)[0];
check('HQ\'s list shows the Pengurus\'s answer on the line', lf.mg === true && lf.mst === 'doing' && /akan selesai 14\/11/.test(lf.mans), JSON.stringify(lf));

// ---------- 17:05: yesterday's open day passes to him; help from HQ ----------
NOW = at(DAY(0), '17:05');
m = todo(env, 'Manager');
check('5:05 petang: the day not closed is his now, and his older TH line is folded in', ids(m).indexOf('MG:' + TH) >= 0 && ids(m).indexOf(TH) < 0, ids(m).join(' '));
check('help needs what and a few words', mg(env, 'Manager', DN, { mode: 'help', why: 'Pemandu tidak jawab telefon' }).error === 'need_what' && mg(env, 'Manager', DN, { mode: 'help', need: 0, why: 'a' }).error === 'need_reason');
j = mg(env, 'Manager', DN, { mode: 'help', need: 1, why: 'Printer timbang rosak, perlu alat ganti' });
r = rowsOf(env, 'mhelp')[0];
check('PERLU BANTUAN saves one row: the need and his words', j.ok && r && r.ref === DN && r.detail === 'Alat ganti / jentera' && r.staff_note === 'Printer timbang rosak, perlu alat ganti', JSON.stringify(r));
check('his line waits quietly for HQ', it(j, 'MG:' + DN).p === 3 && /menunggu Ibu Pejabat/.test(it(j, 'MG:' + DN).sub), it(j, 'MG:' + DN).sub);
check('a second help request on the same line is refused while one waits', mg(env, 'Manager', DN, { mode: 'help', need: 0, why: 'Perlu lori lagi' }).error === 'already');
let h = it(todo(env, 'HQ'), 'HP:' + r.id);
check('HQ gets the request: what, the line, his words, who and when; a spare part is marked for Liew', !!h && h.p === 1 && /Pengurus minta bantuan: Alat ganti \/ jentera/.test(h.bm) && /tiket DN 8002/.test(h.sub) && /Printer timbang rosak/.test(h.sub) && /Pengurus Contoh 12\/11/.test(h.sub) && /untuk Liew/.test(h.sub) && h.go === 'help' && h.ref === r.id, JSON.stringify(h));
check('the Owner sees the request too', !!it(todo(env, 'Owner'), 'HP:' + r.id));
check('only HQ or the Owner press DIURUSKAN, with a note', hd(env, 'Manager', r.id, 'Sudah pesan').error === 'not_allowed' && hd(env, 'HQ', r.id, 'ok').error === 'need_reason' && hd(env, 'HQ', 'MA-none', 'Sudah pesan').error === 'nothing_waiting');
j = hd(env, 'HQ', r.id, 'Alat ganti dipesan, sampai Sabtu');
let d = rowsOf(env, 'mhelpdone')[0];
check('DIURUSKAN saves one row and the request leaves HQ\'s list', j.ok && d && d.ref === r.id && d.keyed_by === 'HQ-1' && d.staff_note === 'Alat ganti dipesan, sampai Sabtu' && !it(j, 'HP:' + r.id), JSON.stringify(d));
check('DIURUSKAN twice is refused', hd(env, 'HQ', r.id, 'Sekali lagi').error === 'already');
x = it(todo(env, 'Manager'), 'MG:' + DN);
check('the line is the Pengurus\'s again, red, with HQ\'s note', x.p === 1 && /Ibu Pejabat: Alat ganti dipesan, sampai Sabtu/.test(x.sub), JSON.stringify(x));

// ---------- Friday 08:00: what reaches the Owner ----------
NOW = at(DAY(-1), '08:00');
let o = todo(env, 'Owner');
check('next morning: the line the Pengurus never answered reaches the Owner, with both sides', !!it(o, 'OW:' + TH) && /^Tersangkut: Hari 11\/11 belum ditutup/.test(it(o, 'OW:' + TH).bm) && /Staf Contoh: belum jawab · Pengurus Contoh: belum jawab/.test(it(o, 'OW:' + TH).sub), JSON.stringify(it(o, 'OW:' + TH)));
check('the Owner\'s older "stuck" line for the same day is not shown twice', ids(o).indexOf('TO:' + DAY(1)) < 0, ids(o).join(' '));
check('a line the Pengurus promised for Saturday does not reach the Owner yet', !it(o, 'OW:' + FO));
check('a line back from HQ and not finished reaches the Owner', !!it(o, 'OW:' + DN) && /Ibu Pejabat: Alat ganti dipesan/.test(it(o, 'OW:' + DN).sub));
NOW = at(DAY(-2), '17:05');
o = todo(env, 'Owner');
check('Saturday 5:05 petang: the Pengurus missed his own date — the Owner, with "janji terlepas"', !!it(o, 'OW:' + FO) && /Pengurus Contoh: janji terlepas · akan selesai 14\/11/.test(it(o, 'OW:' + FO).sub), JSON.stringify(it(o, 'OW:' + FO)));
x = it(todo(env, 'Manager'), 'MG:' + FO);
check('and his line is red again', x.p === 1 && /janji terlepas/.test(x.sub));

// ---------- the work is done ----------
env.tabs.FH_COLLECT.rows.push(R('c2', DAY(-2), ['01', '1-2', '80', 'Y', '', '', '']));
j = mg(env, 'Manager', FO, { mode: 'done' });
check('SELESAI after the fruit is keyed to the ramp is accepted; the line is gone for everyone', j.ok && j.done === 'done' && !it(j, 'MG:' + FO) && !it(todo(env, 'Owner'), 'OW:' + FO) && !late(env).items.some(i => i.id === FO));
check('every answer stays in the record', rowsOf(env, 'manswer').length === 1 && rowsOf(env, 'mhelp').length === 1 && rowsOf(env, 'mhelpdone').length === 1);

// ---------- Sunday: only fruit passes to the Pengurus ----------
NOW = at(DAY(-3), '17:05');   // Sunday 15 Nov 2026
env = build();
env.tabs.FH_CHIT.rows.push(R('chs', DAY(-2), ['MC-S', '1', '06:10', '']));   // Saturday's chit, not closed: late from Sunday
m = todo(env, 'Manager');
check('Sunday 5:05 petang: Saturday\'s open day waits for Monday; fruit in the field is his', ids(m).indexOf('MG:TH:' + DAY(-2)) < 0 && ids(m).indexOf('MG:' + FO) >= 0, ids(m).join(' '));
NOW = at(DAY(-4), '17:05');
check('Monday 5:05 petang: Saturday\'s open day is his', ids(todo(env, 'Manager')).indexOf('MG:TH:' + DAY(-2)) >= 0);
check('the two new actions write, they are not reads', !env.ctx.READS_.mgrAnswer && !env.ctx.READS_.helpDone);
