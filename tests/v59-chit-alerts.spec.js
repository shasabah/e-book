// E-Book test (1.50.2) The WhatsApp chit, shorter (Yu Chen, 5 Nov): no sub-headings under a section, and alerts one
// line per problem (option A): lots of one block with the same reason joined, mill tickets with the same reason joined,
// an alert already on an earlier chit only counted. Made-up data.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', rt => { const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bd.action === 'login' ? { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw } : { ok: false, error: 'busy' }) }); });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(800);
  const A = (lot, n, note, seen) => ({ key: 'F:' + lot, kind: 'field', block: '02', lot, detail: n + ' tandan sejak 03/11', text: 'x', note, seen: !!seen });
  const G = (t, flag, note, seen) => ({ key: 'G:' + t, kind: 'grading', block: '', lot: '', ref: t, detail: 'Tiket ' + t + ': ' + flag, text: 'x', note, seen: !!seen });
  const txt = await p.evaluate(al => EA.roomViews['field-harvest'].chitText({ chit: 'MC-T', date: '2026-11-04', estate: 'SSGT', rev: 1, confirmedAt: '06:18', keyedName: 'Staf',
    rows: [{ worker_id: 'W1', muster: 'H', task_code: 'HA', block: '', lots: '', mandor: '' }, { worker_id: 'W2', muster: 'H', task_code: 'LFF', block: '', lots: '', mandor: '' }], jobs: [], alerts: al, backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 } } }),
    [A('2-6', 15, 'Tak sempat angkat'), A('2-7', 170, 'Tak sempat angkat'), A('2-8', 210, 'Tak sempat angkat'), A('2-20', 40, 'Hujan'),
     G('111', 'Ditolak 77 tandan (UR 10, EB 67, RT 0)', 'Buah bermalam'), G('222', 'Penalti 1.04%', 'Buah bermalam'), G('333', 'Mentah + kurang masak 8% (had 5%); Ditolak 63 tandan (UR 13, EB 50, RT 0)', 'Tuai mentah', true)]);
  const lines = txt.split('\n');
  check('one line for lots of one block with the same reason (total, earliest day, lot range)', lines.includes('• Ladang Blk 02: 395 tandan sejak 3/11 (2-6 hingga 2-8) → Tak sempat angkat'), lines.filter(l => /Ladang/.test(l)).join(' | '));
  check('a lot with another reason keeps its own line', lines.some(l => /^• Ladang Blk 02: 40 tandan .*\(2-20\) → Hujan/.test(l)));
  check('tickets with the same reason on one line, short flags', lines.includes('• Gred kilang 2 tiket: 111 tolak 77 · 222 penalti 1.04% → Buah bermalam'), lines.filter(l => /Gred/.test(l)).join(' | '));
  check('an alert already on an earlier chit is only counted', lines.includes('_(+1 masih terbuka: tiket 333)_'));
  check('no sub-headings under a section (Cutting, Field to ramp)', !/Cutting|Field to ramp/.test(txt) && /1\. Harvesting\n\s+Harvester/.test(txt), txt.split('```')[1]);
  const t2 = await p.evaluate(() => EA.roomViews['field-harvest'].chitText({ chit: 'MC-T', date: '2026-11-04', estate: 'SSGT', rev: 1, confirmedAt: '06:18', keyedName: 'Staf',
    rows: [{ worker_id: 'W1', muster: 'H', task_code: 'HA', block: '02', lots: '', mandor: '' }], jobs: [], alerts: [], backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 } } }));
  check('the block shows as B02 in the table', /\nB02 Harvester/.test(t2), t2.split('```')[1]);
  const sum = await p.evaluate(() => EA.fh.dayclose.summaryText({ estate: 'SSGT', date: '2026-11-04', chit: 'MC-T', at: '20:55', by: 'S', byName: 'Staf', present: 20, total: 21, bunches: 553, lorries: 0, jobsDone: 9, jobs: 9, notDone: [], away: ['Pekerja Satu (T)'], rain: '', rainJobs: [] }));
  check('day-close summary names who was away', /Pekerja: 20\/21 hadir\nTidak hadir: Pekerja Satu \(T\)/.test(sum), sum);
  const old = await p.evaluate(() => EA.fh.dayclose.summaryText({ estate: 'SSGT', date: '2026-11-04', chit: 'MC-T', at: '20:55', by: 'S', present: 21, total: 21, bunches: 0, lorries: 0, jobsDone: 1, jobs: 1, notDone: [], rain: '', rainJobs: [] }));
  check('an older close with no away list still prints', !/Tidak hadir/.test(old) && /Pekerja: 21\/21/.test(old));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
