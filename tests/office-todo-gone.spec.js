// E-Book test (1.50.1) Perlu tindakan: an explanation of fruit left in the field or on the ramp leaves the Pengurus's
// and the Owner's lists once that fruit is gone (Yu Chen, 4 Nov: "clear whatever problem gone first"). Grading
// explanations and other work still wait. Office script, no server needed. Made-up workers.
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
  // lot 1-1 cut 6 days ago and collected; lot 1-2 cut 3 days ago, still in the field; lot 1-3 old fruit collected, new fruit cut yesterday
  FH_WORK: new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
    R('w1', ago(6), ['c', 'H1', 'HA', '01', '1-1', '', 'bunch', '100']), R('w2', ago(3), ['c', 'H2', 'HA', '01', '1-2', '', 'bunch', '80']),
    R('w3', ago(6), ['c', 'H1', 'HA', '01', '1-3', '', 'bunch', '50']), R('w4', ago(1), ['c', 'H1', 'HA', '01', '1-3', '', 'bunch', '40'])]),
  FH_COLLECT: new Sheet([std.concat(['block','lot','bunches','cleared','tractor','loader','note']),
    R('c1', ago(4), ['01', '1-1', '100', 'Y', '', '', '']), R('c2', ago(4), ['01', '1-3', '50', 'Y', '', '', ''])]),
  FH_DISPATCH: new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver']),
    R('d1', ago(4), ['150', 'L', 'BOU', 'Y', '', '01', 'T1', '1', 'D'])]),
  FH_ALERT: new Sheet([std.concat(['chit','kind','block','lot','detail','staff_note','direction','direction_by','received_at','ref']),
    R('a1', ago(5), ['c', 'field', '01', '1-1', '100 tandan sejak ' + ago(6), 'Hujan', '', '', '', '']),        // fruit gone since
    R('a2', ago(2), ['c', 'field', '01', '1-2', '80 tandan sejak ' + ago(3), 'Tak sempat angkat', '', '', '', '']), // still there
    R('a3', ago(5), ['c', 'field', '01', '1-3', '50 tandan sejak ' + ago(6), 'Hujan', '', '', '', '']),          // old fruit gone, new fruit is a new matter
    R('a4', ago(5), ['c', 'grading', '', '', 'Tiket 1: Mentah 8%', 'Tuai mentah', '', '', '', '1']),
    R('a5', ago(5), ['c', 'jobask', '01', '1-1', 'Kerja lain: SS · 3 orang', 'Selective spray', '', '', '', 'c'])])
};
const book = { getSheetByName: n => tabs[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur' };
const mem = {};
const ctx = { console, Utilities: { formatDate: fmt }, SpreadsheetApp: { openById: () => book }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: k => mem[k] || null, put: (k, v) => { mem[k] = v; } }) }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
  LockService: {}, ContentService: {}, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
function todo(role) { ctx.ROWS_MEMO_ = {}; try { return ctx.todo_({ user_code: role === 'Owner' ? 'OWN-ALL-01' : 'MGR-1', role, estates: ['SSGT'] }, { estate: 'SSGT' }); } finally { ctx.ROWS_MEMO_ = null; } }
const m = todo('Manager'), ids = (m.items || []).map(i => i.id);
check('Pengurus: fruit gone from the lot → its explanation is off the list', !ids.includes('DI:a1'), ids.join(' '));
check('Pengurus: fruit still in the field → still asks for a direction', ids.includes('DI:a2'));
check('Pengurus: the old fruit gone, new fruit on the same lot → the old explanation is off', !ids.includes('DI:a3'));
check('Pengurus: grading explanation still waits', ids.includes('DI:a4'));
check('Pengurus: other work still waits for LULUS / TOLAK', ids.includes('JA:a5'));
const o = todo('Owner'), sd = (o.items || []).find(i => /^SD:/.test(i.id));
check('Owner: "stuck" count leaves out the explanations whose fruit is gone (2: field 1-2 and grading)', sd && /Tersangkut: 2 penjelasan/.test(sd.bm), sd && sd.bm);
