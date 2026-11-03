// E-Book test (1.48.1) Lots of a lot-by-lot job (Sugut manuring 27–29 Oct): (1) a chit fixed from 18 lots to 6 —
// Kerja shows only the 6 (a lot added by hand on Kerja stays); (2) "Sama seperti chit semalam" does not copy the
// lots that yesterday's Kerja marked SIAP, keeps lots BELUM SIAP, and keeps one job for the gang. Made-up workers.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const ago = n => { const x = new Date(Date.now() - n * 864e5); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const L = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => '1-' + (a + i));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', at: ago(0) + ' 07:00', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(({ d0, l18, l6 }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([['M1', 'Pembaja Satu'], ['M2', 'Pembaja Dua']].map(x => ({ id: x[0], name: x[1], estate: 'SSGT', gang: 'Am · General', sex: 'M' }))));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    const row = (id, w, lots) => ({ id, worker_id: w, muster: 'H', task_code: 'MAN', block: '01', lots: lots.join(' '), mandor: '' });
    // the chit as fixed in the evening: rev 2, 6 lots
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-T', date: d0, estate: 'SSGT', rev: 2, confirmedAt: '06:10', chitRowId: 'C2', alerts: [],
      jobs: [{ key: 'j1', task: 'MAN', block: '01', lots: l6, mandor: '' }], rows: [row('R1', 'M1', l6), row('R2', 'M2', l6)] }]));
    // the Kerja draft begun on the morning chit (rev 1, 18 lots), plus 1-20 added by hand on Kerja
    const prog = {}; l18.forEach(l => { prog[l] = ''; }); prog['1-20'] = '';
    localStorage.setItem('fh.workdraft', JSON.stringify({ 'MC-T': { chit: 'MC-T', chitRev: 1, lines: { M1: [{ lot: '', qty: '', bunches: '' }], M2: [{ lot: '', qty: '', bunches: '' }] }, status: {}, checker: '', replacing: '',
      prog: { j1: prog }, manual: {}, bags: {}, who: { j1: { M1: l18, M2: l18 } }, pbags: {}, dose: {}, lotwhy: {}, added: { j1: ['1-20'] } } }));
  }, { d0: ago(0), l18: L(1, 18), l6: L(13, 18) });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(900);
  const shown = await p.$$eval('[data-lj="j1"][data-lv="Y"]', a => a.map(x => x.dataset.ll).join(' '));
  check('Kerja after the chit was fixed: only the chit\'s 6 lots, plus the lot added by hand', shown === L(13, 18).concat(['1-20']).join(' '), shown);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v58-kerja.png' });

  // (2) copy yesterday: yesterday's MAN on 1-1..1-12, Kerja said 1-1..1-10 siap, 1-11 and 1-12 belum siap (rain)
  await p.evaluate(({ d1, l12 }) => {
    const row = (id, w) => ({ id, worker_id: w, muster: 'H', task_code: 'MAN', block: '01', lots: l12.join(' '), mandor: '' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-Y', date: d1, estate: 'SSGT', rev: 1, confirmedAt: '06:10', chitRowId: 'CY', alerts: [],
      jobs: [{ key: 'j1', task: 'MAN', block: '01', lots: l12, mandor: '' }], rows: [row('R1', 'M1'), row('R2', 'M2')] }]));
    const prog = l12.map(l => l + (l === '1-11' || l === '1-12' ? ' belum siap (Hujan (Tanah / jalan basah — jentera tak boleh masuk, 1 hari) · sambung 30/10)' : ' siap')).join(', ');
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'MC-Y', date: d1, estate: 'SSGT', rec: { chit: 'MC-Y', date: d1, estate: 'SSGT', lines: [], jobs: [{ key: 'j1', task_code: 'MAN', block: '01', lots: l12.join(' '), progress: prog }] } }]));
    localStorage.removeItem('fh.draft2'); localStorage.removeItem('fh.workdraft');
  }, { d1: ago(1), l12: L(1, 12) });
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);
  const copy = await p.$('.copy-last button, [data-copylast], #fh-copylast');
  if (copy) await copy.click(); else await p.evaluate(() => { const b = [...document.querySelectorAll('.copy-last button')][0]; if (b) b.click(); });
  await p.waitForTimeout(400);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2') || '{}').SSGT || {});
  const jobs = (d.jobs || []).map(j => j.task + ':' + j.lots.join(' '));
  check('copy yesterday: lots finished yesterday are not copied, lots not finished stay, one job for the gang', jobs.length === 1 && jobs[0] === 'MAN:1-11 1-12' && d.jobOf && d.jobOf.M1 === d.jobOf.M2, JSON.stringify(jobs));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
