// E-Book test (1.51.4). The morning WhatsApp chit: mill grading is not in it, and the muster table shows one
// line per job and block instead of one per worker (Yu Chen, 6 Nov 2026).
// The chit screen, the alerts themselves and the office records are untouched — only the WhatsApp text changes.
// Rule 8: made-up workers only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', rt => {
    const bd = JSON.parse(rt.request().postData() || '{}');
    const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bd.action === 'login'
      ? { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw } : { ok: false, error: 'busy' }) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ea.phone', JSON.stringify('P13'));
    localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([1, 2, 3, 4, 5, 6, 7].map(i =>
      ({ id: 'W-SSGT-00' + i, name: 'Pekerja Contoh ' + i, estate: 'SSGT', gang: 'Tuai · Harvest', sex: i === 7 ? 'F' : 'M' }))));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
  });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(800);

  const out = await p.evaluate(() => {
    const R = (i, task, block, lots) => ({ worker_id: 'W-SSGT-00' + i, muster: 'H', task_code: task, block: block, lots: lots, mandor: '' });
    // Three harvesters on Blk 01, two on Blk 03 — each on his own lot, as at Sugut. One woman manuring.
    const chit = {
      chit: 'MC-T', date: '2026-11-06', estate: 'SSGT', rev: 1, confirmedAt: '06:14', keyedName: 'Staf',
      rows: [R(1, 'HA', '01', '1-13'), R(2, 'HA', '01', '1-14'), R(3, 'HA', '01', '1-15'),
             R(4, 'HA', '03', '3-4'), R(5, 'HA', '03', '3-5'),
             R(6, 'ITF', '01', '1-13 1-14 1-15'), R(7, 'MAN', '01', '1-20')],
      jobs: [],
      alerts: [{ key: 'F:1-29', kind: 'field', block: '01', lot: '1-29', detail: '96 tandan sejak 05/11', text: 'x', note: 'Hujan' },
               { key: 'G:471233', kind: 'grading', block: '', lot: '', ref: '471233', detail: 'Tiket 471233: Mentah + kurang masak 7% (had 5%)', text: 'x', note: '' }],
      backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 } } };
    const onlyGrading = JSON.parse(JSON.stringify(chit));
    onlyGrading.alerts = [chit.alerts[1]];
    return { wa: EA.roomViews['field-harvest'].chitText(chit),
             waG: EA.roomViews['field-harvest'].chitText(onlyGrading),
             rowsOnScreen: EA.roomViews['field-harvest'].summary(chit.rows).sections
               .reduce((n, s) => n + s.lines.length, 0) };
  });
  const lines = out.wa.split('\n');
  const table = out.wa.split('```')[1] || '';

  check('mill grading is not in the WhatsApp chit', !/Gred kilang|471233|Mentah/.test(out.wa), lines.filter(l => /Gred|Tiket/.test(l)).join(' | '));
  check('the field alert is still in it', lines.some(l => /^• Ladang Blk 01: 96 tandan/.test(l)), lines.filter(l => /Ladang/.test(l)).join(' | '));
  check('a chit whose only alert is grading prints no alert box at all', !/AMARAN/.test(out.waG), out.waG.split('\n').filter(l => /AMARAN|Gred/.test(l)).join(' | '));

  check('three harvesters on Blk 01 are one line of 3', /\nB01 Harvester\s+-\s+3\s+-\s+3/.test(table), table);
  check('two harvesters on Blk 03 are one line of 2', /\nB03 Harvester\s+-\s+2\s+-\s+2/.test(table), table);
  check('only one Harvester line per block', (table.match(/Harvester/g) || []).length === 2, String((table.match(/Harvester/g) || []).length));
  check('the tractor keeps its own line', /Int\. Transp\. FFB\s+-\s+1\s+-\s+1/.test(table));
  check('manuring counts the woman in the F column', /Manuring\s+-\s+-\s+1\s+1/.test(table), table);
  check('the totals are unchanged by the merge', /Total working\s+-\s+6\s+1\s+7/.test(table) && /GRAND TOTAL\s+-\s+6\s+1\s+7/.test(table), table);
  check('every lot is still listed under the table', ['1-13', '1-14', '1-15', '3-4', '3-5', '1-20'].every(l => out.wa.includes(l)), out.wa.split('```')[2]);
  check('the chit screen still keeps a line per worker group (not merged)', out.rowsOnScreen === 7, String(out.rowsOnScreen));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
