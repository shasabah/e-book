// E-Book test (1.12). Operasi (view only) for the clerk and the manager: Ria's bar is Tiket · Operasi
// and the room opens on Tiket; Samsir (Manager) sees only Operasi, no bar; "Hari ini" card; a day
// opened has no save/correct buttons; the chit/work/lorry screens are never shown to them; the office
// refuses chit, work and lorry entries from the clerk and the manager.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const fs = require('fs'); const vm = require('vm');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P99'));
    const t = EA.today();
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'C-T', date: t, estate: 'SSGT', confirmedAt: '06:40', keyedName: 'Staf Sugut', jobs: [], alerts: [],
      rows: [{ worker_id: 'W-SSGT-001', muster: 'H', task_code: 'HA', block: '03', lots: '3-30' }, { worker_id: 'W-SSGT-010', muster: 'H', task_code: 'CPS', block: '01', lots: '1-1' }, { worker_id: 'W-SSGT-011', muster: 'S' }] }]));
    localStorage.setItem('fh.collect', JSON.stringify([{ date: t, estate: 'SSGT', at: '15:00', lines: [], dispatch: { trip: 'LR-T', dn: '9001', lorry: 'SA 1', mill: 'Boustead (BOU)', bunches: '200', blocks: { '03': 200 } } }])); });
  // Clerk
  await p.reload(); await p.fill('#key', '333333'); await p.waitForSelector('#home:not([hidden])');
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(500);
  check('clerk: the room opens on Tiket', /Tiket kilang/.test(await p.textContent('#room h1')));
  check('clerk: bar is Tiket · Operasi', (await p.$$eval('.botbar a', a => a.map(x => x.innerText.trim()).join('|'))) === 'Tiket|Operasi');
  await p.click('.botbar a[data-tab="history"]'); await p.waitForTimeout(400);
  const ops = await p.innerText('#room');
  check('Operasi: title, LIHAT SAHAJA badge', /Operasi/.test(await p.textContent('#room h1')) && /LIHAT SAHAJA/.test(ops));
  check('Operasi: "Hari ini" card shows chit done 06:40, work not yet, 1 lorry waiting for a ticket',
    /Hari ini/.test(ops) && /✓ 06:40/.test(ops) && /Belum[\s\S]*Kerja/.test(ops) && /1 lori[\s\S]*Tiket belum/.test(ops), ops.slice(0, 300));
  check('Operasi: people at work and jobs on the card', /2 hadir · 1 tidak/.test(ops));
  await p.click('.today-card'); await p.waitForTimeout(300);
  const day = await p.innerText('#room');
  check('one day opened: Pagi pane, back says Operasi, still view only', /BALIK/.test(day) && /LIHAT SAHAJA/.test(day) && /Pagi/.test(day));
  const keyBtns = await p.$$eval('#room button', a => a.map(x => x.innerText).filter(t => /SIMPAN|SAVE|BETULKAN|CORRECT/i.test(t)));
  check('one day opened: no save or correct buttons', keyBtns.length === 0, keyBtns.join(' | '));
  for (const h of ['field-harvest/work', 'field-harvest/collect']) {
    await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(300);
    check('clerk going to #' + h + ' sees Operasi, not a keying screen', /Operasi/.test(await p.textContent('#room h1')) && !(await p.locator('#wk-check, #cl-save, #fh-check').count()));
  }
  // Manager
  await p.evaluate(() => { location.hash = ''; }); await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.fill('#key', '888888'); await p.waitForSelector('#home:not([hidden])');
  check('manager: sees the Field & Harvest tile', await p.locator('[data-room="field-harvest"]').count() === 1);
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(400);
  check('manager: opens straight on Operasi, no bar', /Operasi/.test(await p.textContent('#room h1')) && await p.locator('.botbar').count() === 0);
  await p.evaluate(() => { location.hash = 'field-harvest/ticket'; }); await p.waitForTimeout(300);
  check('manager going to the ticket screen sees Operasi', /Operasi/.test(await p.textContent('#room h1')));
  check('role name: Pengurus', /Pengurus/.test(await p.textContent('#who-role')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  // Office: who may key what
  const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
  const ctx = { SpreadsheetApp: {}, Utilities: {}, PropertiesService: {}, CacheService: {}, LockService: {}, ContentService: {}, Session: {} };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const can = (role, tab) => ctx.canWrite_({ role }, tab);
  check('office: clerk may key tickets and grading', can('Clerk', 'FH_TICKET') && can('Clerk', 'FH_GRADING') && can('Clerk', 'FH_TICKET_HARV'));
  check('office: clerk may NOT key chit, work or lorry', !can('Clerk', 'FH_MUSTER') && !can('Clerk', 'FH_WORK') && !can('Clerk', 'FH_DISPATCH') && !can('Clerk', 'FH_COLLECT'));
  check('office: manager may key nothing in the room', ['FH_MUSTER', 'FH_WORK', 'FH_DISPATCH', 'FH_TICKET', 'FH_GRADING', 'LIST_PEOPLE'].every(t => !can('Manager', t)));
  check('office: staff still keys chit, work and lorry, not tickets', can('Staff', 'FH_MUSTER') && can('Staff', 'FH_WORK') && can('Staff', 'FH_DISPATCH') && !can('Staff', 'FH_TICKET'));
  check('office: Manager is a role the Owner can give', ctx.ROLES.indexOf('Manager') >= 0 && ctx.ROLE_PREFIX.Manager === 'MGR');
})();
