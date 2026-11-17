// E-Book test (1.70) The rate list is read by the Owner and HQ only (Yu Chen, 17 Nov 2026: "owner and hq").
// Office script. Made-up rates only — no real rate is ever in this repository.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }; };
const head = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces','task_code','pay_unit','band','rate_rm','target_day','from_date','approved_by','note','received_at'];
const R = (id, est, rep, code, rate) => [id, '2026-11-17', 'SPLT', est, 'OWN-ALL-01', '', 'OFFICE', 'active', rep, code, 'MT', 'Contoh', rate, '', '', 'HQ', 'Harvesting', ''];
const tabs = { LIST_RATES: new Sheet([head, R('RT-1', 'SSGT', '', 'HA', 11), R('RT-2', 'SSGT', '', '', 22), R('RT-3', 'SSGT', 'RT-1', 'HA', 12), R('RT-4', 'PTAN', '', 'HA', 33)]) };
const book = { getSheetByName: n => tabs[n] || null };
const ctx = { console, Utilities: { formatDate: () => '' }, SpreadsheetApp: { openById: () => book }, Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, getProperties: () => ({}) }) },
  LockService: {}, ContentService: {}, Logger: { log() {} } };
vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
const ask = (code, role, estates, estate) => { ctx.ROWS_MEMO_ = {}; try { return ctx.doRead_({ user_code: code, role, estates }, { action: 'rates', estate }); } finally { ctx.ROWS_MEMO_ = null; } };
let j = ask('OWN-ALL-01', 'Owner', ['SSGT', 'PTAN'], 'SSGT');
check('the Owner gets the estate\'s standing lines only: a replaced line is gone, another estate\'s is not there', j.ok && j.rates.map(r => r.id).join(',') === 'RT-2,RT-3', JSON.stringify(j).slice(0, 200));
check('a line carries the job code, unit, wording, rate, target, from-date and section', j.ok && ['task_code', 'pay_unit', 'band', 'rate_rm', 'target_day', 'from_date', 'note'].every(k => k in j.rates[0]));
check('HQ gets it too', ask('HQ-SDK-01', 'HQ', ['SSGT'], 'SSGT').ok);
['Staff', 'Clerk', 'Manager', 'Worker'].forEach(r => { const x = ask('X-1', r, ['SSGT'], 'SSGT'); check(r + ' is refused, with no rate in the answer', !x.ok && x.error === 'not_allowed' && !x.rates, JSON.stringify(x)); });
check('an Owner asking for an estate that is not his is refused', ask('OWN-2', 'Owner', ['PTAN'], 'SSGT').error === 'not_your_estate');
check('test and practice logins are refused', !ask('T-OWN', 'Owner', ['SSGT'], 'SSGT').ok && !ask('L-HQ', 'HQ', ['SSGT'], 'SSGT').ok);
check('"rates" is a read, and its answer is kept per person', /rates: 1/.test(code) && /req\.action === 'rates' \|\|/.test(code));
check('no real rate file is in the repository', !fs.existsSync(require('path').resolve(__dirname, '..', 'server', 'rates-r4.gs')));
