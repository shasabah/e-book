// E-Book test (1.39). The month's ABW comes only from tickets that have a bunch count.
// Sugut 26 Oct 2026: 6 tickets from the old files (90.74 MT) and ticket 1357994 (11.449 MT) have no bunches;
// ticket 469600 has 801 bunches for 15.534 MT. The chit showed ABW 146.97 kg (117.72 ÷ 801); it should be 19.39 kg.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm'), path = require('path');
const code = fs.readFileSync(path.resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }; };
const std = ['id','date','company','estate','keyed_by','keyed_at','phone','status','replaces'];
const m = new Date().toISOString().slice(0, 7);
function tickets(list) { return new Sheet([std.concat(['ticket_no','trip','nett_mt','bunches'])].concat(list.map((t, i) => ['t' + i, m + '-0' + (i % 9 + 1), 'SPLT', 'SSGT', t[3] || 'CLK', '', 'P10', 'active', '', t[0], '', String(t[1]), t[2] === '' ? '' : String(t[2])]))); }
function run(tk) {
  const tabs = { FH_DISPATCH: new Sheet([std.concat(['bunches','block','trip'])]), FH_TICKET: tk, FH_TICKET_BLOCK: new Sheet([std.concat(['ticket_no','block','bunches','mt'])]) };
  const ctx = { SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null }) },
    Utilities: { formatDate: (d, z, f) => f === 'yyyy-MM' ? d.toISOString().slice(0, 7) : d.toISOString().slice(0, 10) },
    Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: {}, ContentService: {}, PropertiesService: {}, CacheService: {} };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  return ctx.tonnageMtd_('SSGT', new Date());
}
const old = [['1357515', 16.08, '', 'IMPORT'], ['1357563', 16.55, '', 'IMPORT'], ['469029', 14.62, '', 'IMPORT'], ['1357790', 12.46, '', 'IMPORT'], ['1357847', 15.33, '', 'IMPORT'], ['469404', 15.70, '', 'IMPORT'], ['1357994', 11.449, 0]];
const a = run(tickets(old.concat([['469600', 15.534, 801]])));
check('26 Oct chit: 117.72 MT, 8 tickets', Math.abs(a.mt - 117.723) < 0.001 && a.tickets === 8, JSON.stringify(a));
check('26 Oct chit: ABW 19.39 kg from 1 ticket (801 bunches), not 146.97', a.abw === 19.39 && a.abwTickets === 1 && a.bunches === 801, a.abw + ' kg, ' + a.abwTickets + ' ticket');
const b = run(tickets(old.concat([['469600', 15.534, 801], ['469660', 16.77, 749]])));
check('with 24 Oct lorry: 134.49 MT, 9 tickets, ABW 20.84 kg from 2 tickets', Math.abs(b.mt - 134.493) < 0.001 && b.tickets === 9 && b.abw === 20.84 && b.abwTickets === 2, JSON.stringify(b));
const c = run(tickets(old.slice(0, 6)));
check('only old tickets: tonnes kept, no ABW', c.mt === 90.74 && c.abw === 0 && c.abwTickets === 0, JSON.stringify(c));

// The phone: chit text, backlog card, delivery note estimate, an office answer from before 1.39.
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  const out = await p.evaluate(([a, b, c]) => {
    const old = { month: a.month, mt: 117.723, bunches: 801, tickets: 8, abw: 146.97, blocks: {} };   // office script before 1.39
    return { a: EA.fh.tonnageText(a), b: EA.fh.tonnageText(b), c: EA.fh.tonnageText(c), old: EA.fh.tonnageText(old), oldAbw: EA.fh.abwOf(old), newAbw: EA.fh.abwOf(a) };
  }, [a, b, c]);
  check('chit line, some tickets with no bunches', out.a === '117.72 MT · 8 tiket · ABW 19.39 kg (1 tiket, 801 tandan)', out.a);
  check('chit line with 24 Oct lorry', out.b === '134.49 MT · 9 tiket · ABW 20.84 kg (2 tiket, 1,550 tandan)', out.b);
  check('chit line, no ticket has bunches: no ABW and no "0 tandan"', out.c === '90.74 MT · 6 tiket', out.c);
  check('office answer from before 1.39: its wrong ABW is not shown or used', out.old === '117.72 MT · 8 tiket' && out.oldAbw === 0 && out.newAbw === 19.39, out.old);
  const all = await p.evaluate(() => EA.fh.tonnageText({ mt: 32.304, bunches: 1550, tickets: 2, abwTickets: 2, abwMt: 32.304, abw: 20.84 }));
  check('every ticket has bunches: "1,550 tandan · ABW 20.84 kg"', all === '32.30 MT · 2 tiket · 1,550 tandan · ABW 20.84 kg', all);
  const loc = await p.evaluate(() => {
    const m = EA.today().slice(0, 7);
    localStorage.setItem('fh.tickets', JSON.stringify([
      { estate: 'SSGT', date: m + '-01', nett: 11.449, bunches: 0, split: {} },
      { estate: 'SSGT', date: m + '-02', nett: 15.534, bunches: 801, split: {} }]));
    return EA.fh.localTonnage('SSGT');
  });
  check('phone test copy: same rule (19.39 kg, 1 ticket)', loc.abw === 19.39 && loc.abwTickets === 1 && Math.abs(loc.mt - 26.983) < 0.001, JSON.stringify(loc));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await br.close();
})();
