// E-Book test (1.52.3). Membaja and CPS: lots already done this round (Sugut Blk 01, 27 Oct–3 Nov: the same lots keyed
// 2–3 times). Tambah kerja shows them grey with the date; tapping one asks once, with a reason, and can be cancelled;
// COPY CHIT drops them; TUTUP HARI check 7 lists any picked again, with the reason. A lot not finished yesterday
// (belum siap) is not grey. CPS: grey only under 60 days. Made-up workers.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const ago = n => { const x = new Date(Date.now() - n * 864e5); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const dm = d => d.slice(8, 10) + '/' + d.slice(5, 7);
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
  await p.evaluate(({ d0, d1, d3, d20, d70 }) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([['M1', 'Pembaja Satu'], ['M2', 'Pembaja Dua']].map(x => ({ id: x[0], name: x[1], estate: 'SSGT', gang: 'Am · General', sex: 'M' }))));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    // the office: SEMAK PETAK / daily work say MAN 2-1, 2-2 done 3 days ago; CPS 1-9 sprayed 20 days ago, 1-10 70 days ago
    localStorage.setItem('fh.prog.SSGT.' + d0.slice(0, 7), JSON.stringify({ lotJobs: { MAN: { '2-1': d3, '2-2': d3 }, CPS: { '1-9': d20, '1-10': d70 } } }));
    // yesterday's chit: MAN Blk 02 on 2-1 2-3 2-4 2-5 2-6; Kerja: 2-3 and 2-4 siap, 2-5 belum siap (rain), 2-6 not touched
    const lots = ['2-1', '2-3', '2-4', '2-5', '2-6'];
    const row = (id, w) => ({ id, worker_id: w, muster: 'H', task_code: 'MAN', block: '02', lots: lots.join(' '), mandor: '' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-Y', date: d1, estate: 'SSGT', rev: 1, confirmedAt: '06:10', chitRowId: 'CY', alerts: [],
      jobs: [{ key: 'j1', task: 'MAN', block: '02', lots, mandor: '' }], rows: [row('R1', 'M1'), row('R2', 'M2')] }]));
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'MC-Y', date: d1, estate: 'SSGT', rec: { chit: 'MC-Y', date: d1, estate: 'SSGT', lines: [],
      jobs: [{ key: 'j1', task_code: 'MAN', block: '02', lots: lots.join(' '), progress: '2-3 siap, 2-4 siap, 2-5 belum siap (Hujan · sambung)' }] } }]));
  }, { d0: ago(0), d1: ago(1), d3: ago(3), d20: ago(20), d70: ago(70) });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);

  // 1 · Tambah kerja, Membaja Blk 02
  await p.click('#fh-addjob'); await p.waitForSelector('#jb-quick');
  const job = async c => { if (!(await p.$('#jb-quick [data-quick="' + c + '"]'))) await p.evaluate(() => { const d = document.querySelector('#jb-more'); if (d) d.open = true; }); await p.click('.jb-quick [data-quick="' + c + '"]'); };
  await job('MAN'); await p.selectOption('#jb-block', '02'); await p.waitForTimeout(200);
  const grey = await p.$$eval('#jb-lots .lot-round', a => a.map(x => x.dataset.lot).join(' '));
  check('grey: 2-1 2-2 (office, 3 days ago) and 2-3 2-4 (siap yesterday); not 2-5 (belum siap) or 2-6', grey === '2-1 2-2 2-3 2-4', grey);
  const t21 = await p.innerText('#jb-lots [data-lot="2-1"]'), t23 = await p.innerText('#jb-lots [data-lot="2-3"]');
  check('each grey lot shows the day it was done', t21.includes('siap ' + dm(ago(3))) && t23.includes('siap ' + dm(ago(1))), t21 + ' | ' + t23);
  check('a line says how many are done this round', /4 petak sudah siap pusingan ini/.test(await p.innerText('#jb-lots')));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v66-grey.png' });

  // 2 · tap a grey lot: one question; cancel leaves it unpicked
  await p.click('#jb-lots [data-lot="2-1"]'); await p.waitForTimeout(150);
  const q = await p.$('#jb-repeat');
  check('tapping a done lot asks once, naming the lot and the day', !!q && (await p.innerText('#jb-repeat')).includes('2-1') && (await p.innerText('#jb-repeat')).includes(dm(ago(3))));
  check('the question offers 4 reasons', (await p.$$('#jb-repeat [data-why]')).length === 4);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v66-ask.png' });
  await p.click('#jb-repeat-no'); await p.waitForTimeout(150);
  check('TIDAK · BATAL: no question, lot not picked', !(await p.$('#jb-repeat')) && (await p.getAttribute('#jb-lots [data-lot="2-1"]', 'aria-pressed')) === 'false');

  // 3 · tap again, give a reason: picked, the reason shows on the lot; a white lot picks with no question
  await p.click('#jb-lots [data-lot="2-1"]'); await p.waitForTimeout(150); await p.click('#jb-repeat [data-why="0"]'); await p.waitForTimeout(150);
  check('with a reason the lot is picked and shows the reason', (await p.getAttribute('#jb-lots [data-lot="2-1"]', 'aria-pressed')) === 'true' && /Baja tambahan/.test(await p.innerText('#jb-lots [data-lot="2-1"]')));
  await p.click('#jb-lots [data-lot="2-6"]'); await p.waitForTimeout(150);
  check('a lot not done picks at once', !(await p.$('#jb-repeat')) && (await p.getAttribute('#jb-lots [data-lot="2-6"]', 'aria-pressed')) === 'true');

  // 4 · CPS Blk 01: grey only under 60 days
  await job('CPS'); await p.selectOption('#jb-block', '01'); await p.waitForTimeout(200);
  const cg = await p.$$eval('#jb-lots .lot-round', a => a.map(x => x.dataset.lot).join(' '));
  check('CPS: 1-9 (20 days) grey, 1-10 (70 days) open', cg === '1-9', cg);

  // 5 · back to MAN Blk 02 with the reason, save: the job keeps the reason
  await job('MAN'); await p.selectOption('#jb-block', '02'); await p.waitForTimeout(150);
  await p.click('#jb-lots [data-lot="2-2"]'); await p.waitForTimeout(150); await p.click('#jb-repeat [data-why="1"]'); await p.waitForTimeout(100);
  await p.click('#jb-lots [data-lot="2-6"]'); await p.waitForTimeout(100);
  await p.click('#jb-save'); await p.waitForTimeout(300);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2') || '{}').SSGT || {});
  const j = (d.jobs || []).find(x => x.task === 'MAN') || {};
  check('saved job keeps the reason for the lot picked again', j.lots && j.lots.join(' ') === '2-2 2-6' && j.repeat && /Sambung/.test(j.repeat['2-2']) && !j.repeat['2-6'], JSON.stringify(j));

  // 6 · TUTUP HARI check 7 and the list for the close
  const r = await p.evaluate(({ d0 }) => {
    const c = { chit: 'MC-T', date: d0, estate: 'SSGT', rows: [], jobs: [{ key: 'j1', task: 'MAN', block: '02', lots: ['2-1', '2-6'], repeat: { '2-1': 'Baja tambahan' } }, { key: 'j2', task: 'CPS', block: '01', lots: ['1-9', '1-10'] }] };
    const rep = EA.fh.roundRepeats('SSGT', c); const ck = EA.fh.dayclose.checks('SSGT', c, d0).find(x => x.n === 7);
    return { rep, ck };
  }, { d0: ago(0) });
  check('the close lists MAN 2-1 (with its reason) and CPS 1-9 (no reason)', r.rep.length === 2 && r.rep[0].lot === '2-1' && r.rep[0].why === 'Baja tambahan' && r.rep[1].lot === '1-9' && !r.rep[1].why, JSON.stringify(r.rep));
  check('check 7 warns, never stops the close', r.ck && r.ck.warn && r.ck.ok && /2 petak/.test(r.ck.bm) && /tiada sebab|no reason/.test(r.ck.sub), JSON.stringify(r.ck));

  // 7 · COPY CHIT: drops 2-1 (done 3 days ago) and 2-3 2-4 (siap yesterday); keeps 2-5 (belum siap) and 2-6
  await p.evaluate(() => { localStorage.removeItem('fh.draft2'); location.hash = ''; }); await p.waitForTimeout(100);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);
  const copy = await p.$('.copy-last button, [data-copylast], #fh-copylast');
  if (copy) await copy.click(); else await p.evaluate(() => { const x = [...document.querySelectorAll('.copy-last button')][0]; if (x) x.click(); });
  await p.waitForTimeout(400);
  const d2 = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2') || '{}').SSGT || {});
  const jobs = (d2.jobs || []).map(x => x.task + ':' + x.lots.join(' '));
  check('COPY CHIT keeps only 2-5 and 2-6', jobs.length === 1 && jobs[0] === 'MAN:2-5 2-6', JSON.stringify(jobs));
  const toast = await p.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | '));
  check('the message says 3 done lots were taken off', /\(3\)/.test(toast), toast);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
