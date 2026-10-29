// E-Book test (1.48) Rain from the Sugut DMS on the morning chit (Yu Chen, 29 Oct: "staff key rainfall in the DMS
// daily, but the chit can't link" → "Link it"). Office: dmsRain_ reads the DMS RAIN tab (newest of today/yesterday),
// falls back to JPS_RAIN, and is only for SSGT. Phone: the line shows on the card and in the WhatsApp chit text.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm'), path = require('path');
const code = fs.readFileSync(path.resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }; };
const now = new Date('2026-10-29T07:00:00Z'), opened = [];
function office(tabs, fail) {
  const ctx = { SpreadsheetApp: { openById: id => { opened.push(id); if (fail) throw new Error('no access'); return { getSheetByName: n => tabs[n] || null }; } },
    Utilities: { formatDate: (d, z, f) => d.toISOString().slice(0, 10) }, Session: { getScriptTimeZone: () => 'Etc/GMT' },
    LockService: {}, ContentService: {}, PropertiesService: {}, CacheService: {} };
  vm.createContext(ctx); vm.runInContext(code, ctx); return ctx;
}
const RH = ['uuid','date','mm','note','by','byId','at','device','kind','bands'], JH = ['date','station','mm','final','fetched_at','jps_updated'];
// 1 DMS has yesterday (keyed twice: the second replaces) and an old day; JPS also has a figure
let c = office({ RAIN: new Sheet([RH,
  ['u1', new Date('2026-10-20T00:00:00Z'), 40, '', 'F', 'F1', '2026-10-20 07:00', 'p', 'rain', ''],
  ['u2', '28/10/2026', 10, '', 'F', 'F1', '2026-10-29 06:40', 'p', 'rain', '{"a":{"s":"14:40","e":"17:15"}}'],
  ['u3', '2026-10-28', 12.46, 'Lebat', 'F', 'F1', '2026-10-29 06:55:12', 'p', 'rain', '{"n":{"s":"18:15","e":"20:40"},"a":{"s":"14:40","e":"17:15"}}']]),
  JPS_RAIN: new Sheet([JH, ['2026-10-28', '1160251RF', 30, 1, '', '']]) });
let r = c.dmsRain_('SSGT', now);
check('office: newest DMS reading of yesterday (re-key wins), rounded', r.from === 'DMS' && r.date === '2026-10-28' && r.mm === 12.5 && r.bands === '14:40–17:15, 18:15–20:40' && r.note === 'Lebat', JSON.stringify(r));
check('office: the DMS book is the Sugut DMS', opened[0] === '1BaxqGMwwbz_2m4Ryd2quBgmoAqk-uyE4gdlPcd0S2tw', opened[0]);
check('office: other estates get no rain line', c.dmsRain_('MELU', now) === null);
// 2 a 0 mm day is a reading, not a gap
c = office({ RAIN: new Sheet([RH, ['u4', '2026-10-29', 0, '', 'F', 'F1', '', 'p', 'rain', '']]), JPS_RAIN: new Sheet([JH, ['2026-10-29', 'Ldg Sugut', 5, '', '', '']]) });
r = c.dmsRain_('SSGT', now);
check('office: 0 mm in the DMS is used (no rain), not replaced by JPS', r.from === 'DMS' && r.mm === 0, JSON.stringify(r));
// 3 nothing in the DMS for today or yesterday: JPS
c = office({ RAIN: new Sheet([RH, ['u1', '2026-10-20', 40, '', 'F', 'F1', '', 'p', 'rain', '']]), JPS_RAIN: new Sheet([JH, ['2026-10-28', '1160251RF', 7.25, 1, '', ''], ['2026-10-29', '1160251RF', 3, 0, '', '']]) });
r = c.dmsRain_('SSGT', now);
check('office: no DMS reading → JPS station figure', r.from === 'JPS' && r.mm === 7.3 && r.date === '2026-10-28', JSON.stringify(r));
// 4 none at all, and no access
c = office({ RAIN: new Sheet([RH]) }); r = c.dmsRain_('SSGT', now);
check('office: nothing keyed → empty (chit says not in the DMS yet)', r.from === 'none' && r.mm === null, JSON.stringify(r));
c = office({}, true); r = c.dmsRain_('SSGT', now);
check('office: DMS not reachable → no error, marked', r.from === 'error', JSON.stringify(r));
check('office: backlog carries the rain', /rain: dmsRain_\(estate, now\)/.test(code));

// phone
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let rain = { from: 'DMS', date: '2026-10-28', mm: 12.5, bands: '14:40–17:15', note: 'Lebat', station: '' };
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [], rain };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([{ id: 'H1', name: 'Penuai Contoh Satu', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now())); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForSelector('#fh-addjob'); await p.waitForTimeout(900);
  const card = (await p.$('#fh-rain')) ? await p.innerText('#fh-rain') : '';
  check('phone card: rain from the DMS shows', /12\.5 mm \(DMS, 28\/10, 14:40–17:15, Lebat\)/.test(card), card);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v57-rain.png' });
  const txt = await p.evaluate(() => EA.roomViews['field-harvest'].chitText({ date: '2026-10-29', estate: 'SSGT', rows: [], jobs: [], alerts: [],
    backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 }, rain: { from: 'JPS', date: '2026-10-28', mm: 0, station: '1160251RF' } } }));
  check('chit text: JPS fallback line, 0 mm says no rain', /Hujan · Rain: tiada hujan · no rain \(0 mm\) \(JPS, 28\/10\)/.test(txt), txt.split('\n').filter(l => /Hujan/.test(l)).join(' | '));
  const old = await p.evaluate(() => EA.roomViews['field-harvest'].chitText({ date: '2026-10-29', estate: 'SSGT', rows: [], jobs: [], alerts: [], backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 } } }));
  const none = await p.evaluate(() => EA.roomViews['field-harvest'].chitText({ date: '2026-10-29', estate: 'SSGT', rows: [], jobs: [], alerts: [], backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 }, rain: { from: 'none', date: '', mm: null } } }));
  check('chit text: nothing keyed in the DMS says so', /Hujan · Rain: belum ada dalam DMS · not in the DMS yet/.test(none));
  check('chit text: an old chit (no rain from the office) has no new rain line', !/Hujan · Rain: /.test(old));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
