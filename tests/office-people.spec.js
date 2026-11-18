// E-Book test. Run with tests/run.sh (office script, no server needed).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'); const vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }; };
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
const ppl = new Sheet([std.concat(['worker_id','name','job','gang','sex','mandor','active','received_at']),
  ['p1','2026-10-19','SPLT','SSGT','T-OWN','','P99','active','','X-001','Made Up One','Harvester','Tuai · Harvest','M','N','Y',''],
  ['p2','2026-10-19','SPLT','SSGT','T-OWN','','P99','active','','X-002','Made Up Two','Maintenance','Rawatan · Maintenance','F','N','Y',''],
  ['p3','2026-10-19','SPLT','SSGT','T-OWN','','P99','active','p2','X-002','Made Up Two','Maintenance','Rawatan · Maintenance','F','N','N',''],
  ['p4','2026-10-19','SPLT','KWNN','T-OWN','','P99','active','','X-900','Other Estate','Harvester','Tuai · Harvest','M','N','Y','']]);
const ctx = { SpreadsheetApp: { openById: () => ({ getSheetByName: n => ({ LIST_PEOPLE: ppl })[n] || null }) },
  Utilities: { formatDate: d => d.toISOString().slice(0, 10) }, Session: { getScriptTimeZone: () => 'Etc/GMT' },
  LockService: {}, ContentService: {}, PropertiesService: {}, CacheService: {} };
vm.createContext(ctx); vm.runInContext(code, ctx);
const r = ctx.people_({ estates: ['SSGT'], role: 'Staff' });
check('office people: only active people of the user\'s estates (a correction to inactive drops X-002)', r.people.map(x => x.id).join(',') === 'X-001', JSON.stringify(r.people));
// v1.71 adds 'start', the day the worker began, because the day close has to know not to demand a man on a
// chit from before he was hired. It is an employment date, not a personal paper: the guard below still holds.
check('office people: no other columns than name, job, code, gang, sex, start',
  Object.keys(r.people[0]).sort().join(',') === 'estate,gang,id,job,mdr,name,sex,start', JSON.stringify(Object.keys(r.people[0]).sort()));
// The point of the check above, said plainly, so widening it by accident is harder: the papers never leave
// the office (19 and 20 Oct). A new column on LIST_PEOPLE must not reach the phone by itself.
check('office people: no birth date, passport, nationality, IC or pay ever reaches the phone',
  !Object.keys(r.people[0]).some(function (k) { return /born|birth|dob|passport|ic|nationality|wage|rate|pay|salary|bank|account/i.test(k); }),
  JSON.stringify(Object.keys(r.people[0])));
const no = ctx.saveRow({ estates: ['SSGT'], role: 'Staff', user_code: 'T-STF' }, 'LIST_PEOPLE', { id: 'x', estate: 'SSGT', status: 'active', date: '2026-10-19' });
check('office people: a Staff key cannot write the people list', no.error === 'not_allowed', JSON.stringify(no));
