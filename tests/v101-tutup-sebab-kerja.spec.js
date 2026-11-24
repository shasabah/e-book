// E-Book test (1.100) Tutup Hari takes the tractor's lot reasons from Kerja. Brief_Tuai_Kutip_Rupa_Baru 1.2 §5a, signed by
// Yu Chen 25 Nov 2026 ("Fix"). In the new look the tractor's tiles already say why a lot's fruit stayed in the block;
// check 2 of the close took no notice and asked TINGGAL DI LADANG… again. Now, when every lot still in the block has an
// answer from Kerja, check 2 is green and the close keeps that answer as the field reason. Old-look days are unchanged.
// Setup copied from v94 (made-up names, Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], posted = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'dayclose') o = { ok: true, estate: 'SSGT', from: '2020-01-01', days: [] };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else if (bd.action === 'saveBatch') { bd.items.forEach(it => posted.push(it)); o = { ok: true, results: bd.items.map(it => ({ id: it.row.id, ok: true })), sw }; }
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const yd = D(1);
  await p.evaluate((yd) => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([
      { id: 'H1', name: 'Ahmad Bin Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'H2', name: 'Bakar Bin Contoh', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
      { id: 'S1', name: 'Chandra Bin Contoh', estate: 'SSGT', gang: 'Racun · Spray', sex: 'M' },
      { id: 'D1', name: 'Daud Bin Contoh', estate: 'SSGT', gang: 'Ladang durian · Durian farm', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.dayclose.office.SSGT', JSON.stringify({ at: Date.now(), from: '2020-01-01', days: [] }));
    // yesterday's chit: 2 harvesters H, 1 sprayer H, 1 durian worker H (work in the DMS), 1 absent
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', confirmedAt: '06:10', rev: 1, keyedBy: 'STF-SSGT-01',
      jobs: [{ key: 'j1', task: 'HA', block: '01', lots: ['1-13', '1-14'] }, { key: 'j2', task: 'CPS', block: '02', lots: ['2-1', '2-2'] }, { key: 'j3', task: 'DF', block: 'DR', lots: ['DR-A'] }],
      rows: [{ id: 'm1', worker_id: 'H1', muster: 'H', task_code: 'HA', block: '01', lots: '1-13' }, { id: 'm2', worker_id: 'H2', muster: 'H', task_code: 'HA', block: '01', lots: '1-14' },
             { id: 'm3', worker_id: 'S1', muster: 'H', task_code: 'CPS', block: '02', lots: '2-1 2-2' }, { id: 'm4', worker_id: 'D1', muster: 'H', task_code: 'DF', block: 'DR', lots: 'DR-A' }] }]));
  }, yd);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  const work = (yd) => {
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', rev: 1, chitRev: 1, lines: {}, status: {}, rec: { chit: 'CH-SSGT-P13-1', date: yd, estate: 'SSGT', at: '17:00',
      lines: [{ id: 'w1', worker_id: 'H1', task_code: 'HA', block: '01', lot: '1-13', qty: '', unit: 'bunch', bunches: '120' }, { id: 'w2', worker_id: 'H2', task_code: 'HA', block: '01', lot: '1-14', qty: '', unit: 'bunch', bunches: '110' },
              { id: 'w3', worker_id: 'S1', task_code: 'CPS', block: '02', lot: '2-1', qty: '1.5', unit: 'Ha', bunches: '' }, { id: 'w4', worker_id: 'D1', task_code: 'DF', block: 'DR', lot: 'DR-A', qty: '1', unit: 'day', bunches: '' }],
      jobs: [{ id: 'j1', key: 'j1', task_code: 'HA', block: '01', lots: '1-13 1-14', workers: 2, bunches: '230', status: 'done', reason: '' },
             { id: 'j2', key: 'j2', task_code: 'CPS', block: '02', lots: '2-1 2-2', workers: 1, qty: '1.5', unit: 'Ha', status: 'done', reason: '' }].concat(window.__itf ? [window.__itf] : []) }, prog: {}, lotwhy: {} }]));
  };
  const open = async () => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(100); await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForSelector('#dc-close'); await p.evaluate(() => document.querySelectorAll('#room details').forEach(d => { d.open = true; })); await p.waitForTimeout(150); return (await p.evaluate(() => { document.querySelectorAll('#room details').forEach(d => { d.open = true; }); }), p.innerText('#room')); };
  const td = D(0);
  const line2 = t => (t.match(/[^\n]*tandan dituai[^\n]*(\n[^\n]*)?/) || [''])[0].replace(/\s+/g, ' ');
  const setDay = async (itf, collect) => { await p.evaluate(([yd, td, w, itf, collect]) => { window.__itf = itf; eval(w)(yd); localStorage.setItem('fh.collect', JSON.stringify(collect)); }, [yd, td, '(' + work.toString() + ')', itf, collect]); };
  const ITF = pr => ({ id: 'j9', key: 'j9', task_code: 'ITF', block: '01', lots: '1-13 1-14', workers: 1, qty: '1', unit: 'day', status: pr && / belum| tidak pergi/.test(pr) ? 'not_done' : 'done', reason: pr && / belum/.test(pr) ? 'Petak 1-14 belum ke ramp: traktor rosak, kutip esok' : '', progress: pr || '' });
  const only1313 = [{ date: yd, estate: 'SSGT', at: '17:30', lines: [{ block: '01', lot: '1-13', bunches: 120, cleared: 'Y' }] }];
  // 1 · new look: the tractor's tile said 1-14 BELUM · traktor rosak; only 1-13 reached the ramp
  await setDay(ITF('1-13 siap, 1-14 belum (traktor rosak)'), only1313);
  let txt = await open();
  check('the reason from Kerja is taken: check 2 green, "110 belum ke ramp (sebab dari Kerja)"', /230 tandan dituai · 110 belum ke ramp \(sebab dari Kerja\)/.test(txt) && !/tandan dituai belum ke ramp/.test(txt), line2(txt));
  check('it names the lot and its reason ("1-14 traktor rosak")', /1-14 traktor rosak/.test(txt), line2(txt));
  check('TINGGAL DI LADANG… is not asked again', !/TINGGAL DI LADANG/.test(await p.innerText('#room')));
  // 2 · a lot left with no answer from Kerja still asks, and is named
  await setDay(ITF('1-13 siap, 1-14 belum (traktor rosak)'), []);
  txt = await open();
  check('fruit also left on 1-13, which Kerja called HABIS: check 2 stays red and names 1-13', /230 tandan dituai belum ke ramp/.test(txt) && /Tiada jawapan dari Kerja: petak 1-13/.test(txt), line2(txt));
  // 3 · TIDAK PERGI is a reason too
  await setDay(ITF('1-13 siap, 1-14 tidak pergi (tak sempat)'), only1313);
  txt = await open();
  check('a lot the tractor did not go to: "1-14 tidak dipergi, tak sempat", green', /1-14 tidak dipergi, tak sempat/.test(txt) && /sebab dari Kerja/.test(txt), line2(txt));
  // 4 · old look (no lot answers): exactly as before
  await setDay(ITF(''), only1313);
  txt = await open();
  check('old look (no lot answers): check 2 red and asks TINGGAL DI LADANG…, as before', /110 tandan dituai belum ke ramp/.test(txt) && !/Tiada jawapan dari Kerja/.test(txt), line2(txt));
  // 5 · the close keeps the Kerja reason as the field reason
  await setDay(ITF('1-13 siap, 1-14 belum (traktor rosak)'), only1313);
  txt = await open();
  const off = await p.$eval('#dc-close', b => b.disabled);
  if (!off) { await p.click('#dc-close'); await p.waitForTimeout(700); }
  const dc = posted.filter(x => x.tab === 'FH_DAYCLOSE').map(x => x.row.note).join(' | ');
  const sv = await p.evaluate(() => (JSON.parse(localStorage.getItem('fh.dayclose') || '[]').slice(-1)[0] || {}).fieldNote || '');
  check('the saved close carries "Buah belum ke ramp (Kerja): 1-14 traktor rosak" (row note and day summary)', !off && /Buah belum ke ramp \(Kerja\): 1-14 traktor rosak/.test(dc) && sv === '1-14 traktor rosak', 'button off=' + off + ' · ' + dc + ' · ' + sv + ' · ' + (txt.match(/[^\n]*!|[^\n]*belum[^\n]*/g) || []).join(' / ').slice(0, 300));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
