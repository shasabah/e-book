// E-Book test (1.7). History: the list by day (people, bunches, lorries, tonnes, tags),
// one day opened (chit by gang, work, lorry and ticket, every version of a corrected chit),
// in Bahasa and in English. Also the office's history_ for a month.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const fs = require('fs'); const vm = require('vm');
(async () => {
  // ---- office ----
  const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
  function Sheet(rows) { this.rows = rows; }
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
  Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }; };
  const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
  const tabs = {
    FH_CHIT: new Sheet([std.concat(['chit','rain_mm','rain_time','working','not_working','grand_total','confirmed_by','confirmed_at','note']),
      ['c1','2026-10-14','SPLT','SSGT','T-STF','2026-10-14 06:40','P07','active','', 'MC-1','2.5','','2','1','3','T-STF','2026-10-14 06:40',''],
      ['c2','2026-10-14','SPLT','SSGT','T-STF','2026-10-14 07:10','P07','active','c1','MC-1','2.5','','3','0','3','T-STF','2026-10-14 07:10','']]),
    FH_MUSTER: new Sheet([std.concat(['chit','block','lots','mandor','worker_id','task_code','muster','confirmed_by','confirmed_at','note']),
      ['m1','2026-10-14','SPLT','SSGT','T-STF','2026-10-14 06:40','P07','active','', 'MC-1','03','3-30','','W1','HA','H','T-STF','2026-10-14 06:40',''],
      ['m2','2026-10-14','SPLT','SSGT','T-STF','2026-10-14 06:40','P07','active','', 'MC-1','01','1-1','','W2','CPS','H','T-STF','2026-10-14 06:40',''],
      ['m3','2026-10-14','SPLT','SSGT','T-STF','2026-10-14 06:40','P07','active','', 'MC-1','','','','W3','','T','T-STF','2026-10-14 06:40',''],
      ['m4','2026-10-14','SPLT','SSGT','T-STF','2026-10-14 07:10','P07','active','m3','MC-1','03','3-30','','W3','HA','H','T-STF','2026-10-14 07:10','']]),
    FH_JOBDAY: new Sheet([std.concat(['chit','task_code','block','lots','workers','qty','unit','bunches','plan_ha','job_status','reason']),
      ['j1','2026-10-14','SPLT','SSGT','T-STF','','P07','active','','MC-1','HA','03','3-30','2','','bunch','230','','done','']]),
    FH_WORK: new Sheet([std.concat(['chit','worker_id','task_code','block','lot','qty','unit','bunches']),
      ['w1','2026-10-14','SPLT','SSGT','T-STF','','P07','active','','MC-1','W1','HA','03','3-30','','bunch','120'],
      ['w2','2026-10-14','SPLT','SSGT','T-STF','','P07','active','','MC-1','W3','HA','03','3-30','','bunch','110']]),
    FH_DISPATCH: new Sheet([std.concat(['bunches','lorry','mill','ramp_cleared','note','block','trip','dn_no','driver']),
      ['d1','2026-10-14','SPLT','SSGT','T-STF','','P07','active','','230','SA1','BOU','','','03','LR-9','501','X']]),
    FH_TICKET: new Sheet([std.concat(['ticket_no','trip','nett_mt','bunches','abw_kg']),
      ['t1','2026-10-15','SPLT','SSGT','T-CLK','','P01','active','','469700','LR-9','4.25','230','18.48']])
  };
  const ctx = { SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null }) },
    Utilities: { formatDate: d => d.toISOString().slice(0, 10) }, Session: { getScriptTimeZone: () => 'Etc/GMT' },
    LockService: {}, ContentService: {}, PropertiesService: {}, CacheService: {} };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const h = ctx.history_('SSGT', '2026-10');
  const d = h.days[0];
  check('office history: one day with its chit (3 people, now all working)', h.days.length === 1 && d.chits[0].rows.length === 3 && d.chits[0].rows.every(r => r.muster === 'H'), JSON.stringify(d.chits[0].rows));
  check('office history: two versions, the correction moved W3 from absent to harvesting', d.chits[0].versions.length === 2 && d.chits[0].versions[1].changes.length === 1 && d.chits[0].versions[1].changes[0].kind === 'move' && d.chits[0].versions[1].changes[0].from.muster === 'T', JSON.stringify(d.chits[0].versions));
  check('office history: 230 bunches, one lorry with its ticket 4.25 MT (ticket dated next day)', d.harvest === 230 && d.lorries.length === 1 && d.lorries[0].ticket && d.lorries[0].ticket.mt === 4.25, JSON.stringify(d.lorries));
  // ---- phone ----
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P93'));
    const D = n => EA.dayAgo(n);
    const rows = [{ worker_id: 'W-SSGT-001', muster: 'H', task_code: 'HA', block: '03', lots: '3-30' }, { worker_id: 'W-SSGT-002', muster: 'H', task_code: 'HA', block: '03', lots: '3-30' },
      { worker_id: 'W-SSGT-010', muster: 'H', task_code: 'CPS', block: '01', lots: '1-1' }, { worker_id: 'W-SSGT-011', muster: 'S', task_code: '', block: '', lots: '' }];
    localStorage.setItem('fh.chits2', JSON.stringify([
      { chit: 'C-1', date: D(1), estate: 'SSGT', confirmedAt: '06:40', keyedName: 'Staf Sugut', rev: 2, rain_mm: '2.5', rain_time: '', alerts: [], jobs: [], rows,
        versions: [{ at: '06:40', by: 'Staf Sugut', changes: [] }, { at: '07:12', by: 'Staf Sugut', changes: [{ kind: 'add', w: 'W-SSGT-002', task: 'HA', block: '03', muster: 'H' }] }] },
      { chit: 'C-2', date: D(2), estate: 'SSGT', confirmedAt: '06:35', keyedName: 'Staf Sugut', rev: 1, rain_mm: '0', rain_time: '', alerts: [], jobs: [], rows: rows.slice(0, 3) }]));
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'C-1', date: D(1), estate: 'SSGT', rec: { lines: [{ id: 'W-1', worker_id: 'W-SSGT-001', task_code: 'HA', block: '03', lot: '3-30', bunches: '140' }, { id: 'W-2', worker_id: 'W-SSGT-002', task_code: 'HA', block: '03', lot: '3-30', bunches: '120' }],
      jobs: [{ task_code: 'HA', block: '03', lots: '3-30', workers: 2, bunches: '260', status: 'done' }, { task_code: 'CPS', block: '01', lots: '1-1', workers: 1, qty: '1.85', unit: 'Ha', status: 'not_done', reason: 'hujan 2 petang' }] } }]));
    localStorage.setItem('fh.collect', JSON.stringify([{ date: D(1), estate: 'SSGT', at: '15:00', lines: [], dispatch: { trip: 'LR-A', dn: '601', lorry: 'SA 1', mill: 'Boustead (BOU)', bunches: '260', blocks: { '03': 260 } } },
      { date: D(2), estate: 'SSGT', at: '15:00', lines: [], dispatch: { trip: 'LR-B', dn: '600', lorry: 'SA 1', mill: 'Boustead (BOU)', bunches: '180', blocks: { '03': 180 } } }]));
    localStorage.setItem('fh.tickets', JSON.stringify([{ estate: 'SSGT', date: D(1), ticket_no: '470001', trip: 'LR-A', nett: 4.81, bunches: 260, abw: 18.5 }]));
  });
  await p.reload(); await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(500);
  const t = s => (s || '').replace(/\s+/g, ' ').trim();
  const lines = await p.$$eval('#hs-list .rk-r[data-day]', a => a.map(x => x.innerText.replace(/\s+/g, ' ')));
  check('Rekod (v1.26): two day lines, newest first, grouped by week', lines.length === 2 && await p.locator('#hs-list .rk-wk').count() >= 1, lines.join(' | '));
  check('day 1: present 3/4, 260 bunches, 4.81 MT, corrected once', /3\/4/.test(lines[0]) && /260/.test(lines[0]) && /4\.81/.test(lines[0]) && /dibetulkan 1×/.test(lines[0]), lines[0]);
  check('day 2: lorry with no ticket is tagged', /belum ada tiket/.test(lines[1]), lines[1]);
  check('the four boxes: 260 bunches, 4.81 MT', (x => /260/.test(x) && /4\.81/.test(x))(t(await p.textContent('.rk-sum'))));
  check('the staff has no print button (clerk, manager, HQ, Owner only)', await p.locator('#rk-print').count() === 0);
  await p.click('#hs-list .rk-r[data-day]'); await p.waitForTimeout(300);
  const day = t(await p.textContent('#room'));
  check('one day, one page: present 3 / 4, jobs with people and lots, the sick person named', /3 \/ 4/.test(day) && /petak 3-30/.test(day) && /Tidak bekerja: Pekerja Contoh 11 \(sakit\)/i.test(day), day.slice(0, 400));
  check('work result in the same line: harvest done, CPS not done with its reason', /Siap/.test(day) && /Belum siap/.test(day) && /hujan 2 petang/.test(day));
  check('lorry: DN 601, ticket 470001, 4.81 MT', /DN 601/.test(day) && /470001/.test(day) && /4\.81 MT/.test(day));
  await p.click('#rk-fix'); await p.waitForTimeout(200);
  const fix = t(await p.textContent('#sheet-back'));
  check('corrections line opens: v2 at 07:12 added Pekerja Contoh 2; v1 the original', /07:12/.test(fix) && /\+ Pekerja Contoh 2/.test(fix) && /Chit asal/.test(fix), fix.slice(0, 200));
  await p.click('#fx-close');
  await p.evaluate(() => { EA.setLang('en'); }); await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100);
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(400);
  const en = t(await p.textContent('#room'));
  check('English: Records, bunches, present', /Records/.test(en) && /bunches/.test(en) && /Present/.test(en) && /corrected 1×/.test(en), en.slice(0, 200));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
