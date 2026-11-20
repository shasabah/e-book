// E-Book test (1.81). The colour key on the PROGRAM map, and CPS again from 90 days (60 only on an immature block).
// Yu Chen, 20 Nov 2026: "back to the color . we should give indication in the apps map" and "keep 90/120. 60 is too
// early unless we are in imature". Under every lot map or list the colours are named for that job; under the block
// table the three dots are named. A mature lot sprayed 70 days ago waits (green); 100 days may spray (amber); 130 late.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function programme(y) {
  const ha = { '01': 33.20, '02': 33.93, '03': 31.18, '04': 32.34 }, A = ['01', '02'], B = ['03', '04'], out = [];
  const put = (task, bl, ms, rs, dose) => bl.forEach(b => ms.forEach((m, i) => out.push({ task, block: b, month: y + '-' + m, round: rs[i], ha: ha[b], dose: dose ? dose[i] : 0 })));
  put('CPS', A, ['02', '05', '08', '11'], ['R1', 'R2', 'R3', 'R4']); put('CPS', B, ['03', '06', '09', '11'], ['R1', 'R2', 'R3', 'R4']);
  put('SL', A, ['01', '12'], ['R1', 'R2']); put('SL', B, ['02', '12'], ['R1', 'R2']);
  put('VOPS', A.concat(B), ['04'], ['R1']); put('RP', A.concat(B), ['01', '04', '07', '11'], ['R1', 'R2', 'R3', 'R4']);
  put('MAN', A, ['03', '04', '06', '08', '10'], ['Bio-Organic', 'FMP', 'NKB', 'NKB', 'NK'], [5, 2.5, 2.5, 2.5, 2.5]);
  put('MAN', B, ['03', '05', '07', '09', '10'], ['Bio-Organic', 'FMP', 'NKB', 'NKB', 'NK'], [5, 2.5, 2.5, 2.5, 2.5]);
  return out;
}
const _OCT = { ok: true, estate: 'SSGT', month: '2026-10', at: '2026-10-27 21:30', from: '2026-11-04', programme: programme('2026'),
  done: { 'CPS|01|2026-05': 33.2, 'CPS|01|2026-08': 16.6, 'CPS|03|2026-10': 10,
          'MAN|01|2026-03': 33.2, 'MAN|01|2026-04': 33.2, 'MAN|01|2026-06': 33.2, 'MAN|01|2026-08': 33.2, 'MAN|01|2026-10': 20 },
  crop: [{ month: '2026-09', budget: 210, days: 24, mt: 200 }, { month: '2026-10', budget: 220, days: 26, mt: 150 }], lots: null, days: [], rain: [] };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; let asks = 0; p.on('pageerror', e => errs.push(e.message));
  const now = D(0), m = now.slice(0, 7);
  const live = { ok: true, estate: 'SSGT', month: m, at: now + ' 21:30', from: '2020-01-01', programme: programme(m.slice(0, 4)),
    done: { ['CPS|01|' + m]: 5, ['MAN|01|' + m.slice(0, 4) + '-03']: 33.2, ['MAN|01|' + m.slice(0, 4) + '-06']: 33.2, ['MAN|01|' + m.slice(0, 4) + '-08']: 37.85 }, crop: [{ month: m, budget: 220, days: 26, mt: 150.25 }], gang: { CPS: 1, MAN: 1, SL: 1, DEC: 1, VOPS: 1, RP: 1, HA: 3.4 },
    lots: { '1-1': D(2), '1-2': D(12), '1-3': D(20) }, lotJobs: { CPS: { '1-1': D(70), '1-2': D(100), '1-3': D(130) }, MAN: { '1-1': D(5) }, bunches: { '1-3': 118, '1-2': 90 } }, ap: { done: 58 },
    days: [{ date: D(1), closed: 'Y', same: true, ramp: false }, { date: D(2), closed: 'N', same: false, ramp: true }],
    rain: [{ date: D(1), lost: 0.5, reason: 'HENTI', jobs: 'Circle Spraying (1 petak)' }] };
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'program') { asks++; o = bd.month === m ? live : { ok: false, error: 'busy' }; }
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else if (bd.action === 'dayclose') o = { ok: true, estate: 'SSGT', from: '2020-01-01', days: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('fh.dayclose.office.SSGT', JSON.stringify({ at: Date.now(), from: '2020-01-01', days: [] }));
  });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');


  const keyOf = async () => p.evaluate(() => { const k = document.querySelector('.pg-lotbox .pg-key, #pg-box .pg-key:not(.dots)'); return k ? [...k.querySelectorAll('span')].map(s => (s.querySelector('i') || {}).className + ':' + s.textContent) : null; });
  await p.evaluate(() => { EA.lists.programFrom = '2000-01-01'; location.hash = 'field-harvest/history'; }); await p.waitForTimeout(600);
  p.evaluate(v => EA.fh.recShow(v), 'prog'); await p.waitForTimeout(1500);
  // harvest
  await p.click('[data-pg="HA.01"]'); await p.waitForTimeout(400);
  const kh = await keyOf();
  check('harvest map: a key of four colours under the map, the same days as the rule (10 and 15)', kh && kh.length === 4 && kh.join('|') === 'g:< 10 hari|a:10–15 hari|r:> 15 hari|x:tiada rekod', JSON.stringify(kh));
  { const bx = await p.$('.pg-lotbox'); if (bx) await bx.screenshot({ path: (process.argv[2] || '/tmp') + '/v90-key-harvest.png' }); }
  const small = await p.evaluate(() => { const k = document.querySelector('.pg-lotbox .pg-key'), m = document.querySelector('.pg-map'); return { h: k.getBoundingClientRect().height, mh: m.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(k).fontSize) }; });
  check('the key is small: one line, under 11px type, far smaller than the map (the map stays the main thing)', small.h <= 18 && small.fs <= 11 && small.h * 10 < small.mh, JSON.stringify(small));
  const under = await p.evaluate(() => { const m = document.querySelector('.pg-map'), k = document.querySelector('.pg-key'); return !!(m && k && (m.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING)); });
  check('the key sits under the map, not above it', under);
  await p.click('[data-pgmap="HA.01"][data-v="list"]'); await p.waitForTimeout(300);
  check('SENARAI keeps the same key', JSON.stringify(await keyOf()) === JSON.stringify(kh));
  await p.click('[data-pg="HA.01"]'); await p.waitForTimeout(200);
  // CPS
  await p.click('[data-pg="CPS.01"]'); await p.waitForTimeout(400);
  const kc = await keyOf();
  check('CPS key: wait under 90 days, may spray 90–120, late over 120', kc && kc.length === 4 && kc.join('|') === 'g:< 90 hari|a:90–120 hari|r:> 120 hari|x:tiada rekod', JSON.stringify(kc));
  { const bx = await p.$('.pg-lotbox'); if (bx) await bx.screenshot({ path: (process.argv[2] || '/tmp') + '/v90-key-cps.png' }); }
  const cpsMap = await p.evaluate(() => { const o = {}; document.querySelectorAll('.pg-map path').forEach(el => { const lot = (el.querySelector('title') || {}).textContent.split(' ')[0]; if (['1-1', '1-2', '1-3'].includes(lot)) o[lot] = el.getAttribute('class'); }); return o; });
  check('CPS map: 70 days green (wait), 100 amber (may spray), 130 red (late)', cpsMap['1-1'] === 'g' && cpsMap['1-2'] === 'a' && cpsMap['1-3'] === 'r', JSON.stringify(cpsMap));
  const box = await p.innerText('#pg-box');
  check('CPS heading: spray again after 90 days, late over 120; the old "paling awal 60" and the colour words are gone', /racun semula selepas 90 hari · lewat lebih 120 hari/.test(box) && !/paling awal|kuning = |merah = /.test(box), (box.match(/sasaran[^\n]*/) || [''])[0]);
  await p.click('[data-pg="CPS.01"]'); await p.waitForTimeout(200);
  // manuring: two colours only
  await p.click('[data-pg="MAN.01"]'); await p.waitForTimeout(400);
  const km = await keyOf();
  check('manuring key: two colours only (done this round; not keyed by lot), never red', km && km.length === 2 && km.join('|') === 'g:siap|x:tiada rekod', JSON.stringify(km));
  // SEMAK PETAK: no key while ticking (the white / green tick lots are their own picture)
  await p.click('[data-pgtick="MAN.01"]'); await p.waitForTimeout(300);
  check('no colour key while ticking lots in SEMAK PETAK', !(await p.$('.pg-ticking .pg-key')) && !(await p.$('.pg-lotbox .pg-key')));
  await p.click('[data-pgcancel="MAN.01"]'); await p.waitForTimeout(200);
  await p.click('[data-pg="MAN.01"]'); await p.waitForTimeout(200);
  // English phone
  const en = await p.evaluate(() => { const real = EA.lang; EA.lang = () => 'en'; const d = document.createElement('div'); d.innerHTML = EA.fh.program.key('SSGT', 'CPS', '01') + EA.fh.program.key('SSGT', 'HA', '01'); EA.lang = real; return d.textContent; });
  check('an English phone gets the key in English', /< 90 days/.test(en) && /> 120 days/.test(en) && /no record/.test(en) && !/hari|tiada/.test(en), en);
  // block table
  await p.click('[data-pg="blocks"]'); await p.waitForTimeout(300);
  const kb = await p.evaluate(() => { const k = document.querySelector('.pg-key.dots'); return k ? [...k.querySelectorAll('span')].map(s => s.querySelector('i').className + ':' + s.textContent) : null; });
  check('block table: the dots are named (on plan; behind under 1 round; 1 round or more; old data)', kb && kb.join('|') === 'g:ikut rancangan|a:< 1 pusingan|r:≥ 1 pusingan|x:data lama', JSON.stringify(kb));
  // immature block
  const im = await p.evaluate(() => {
    const S = EA.fh.program.states, D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    const data = { lotJobs: { CPS: { '1-1': D(70) } } }, L = EA.lists.lot('SSGT', '1-1'), b = EA.lists.blocksFor('SSGT').find(x => x.block === '01');
    const mature = { k: S.cps(data, L, 'SSGT').k, again: EA.fh.program.cpsAgain('SSGT', '01'), marked: EA.lists.blocksFor('SSGT').filter(x => x.immature).length };
    b.immature = true;
    const young = { k: S.cps(data, L, 'SSGT').k, again: EA.fh.program.cpsAgain('SSGT', '01'), key: EA.fh.program.key('SSGT', 'CPS', '01') };
    delete b.immature;
    return { mature, young };
  });
  check('mature block: 70 days still waits (again from 90); no block is marked immature today', im.mature.k === 'g' && im.mature.again === 90 && im.mature.marked === 0, JSON.stringify(im.mature));
  check('a block marked immature: 70 days may spray (again from 60), and its key says 60', im.young.k === 'a' && im.young.again === 60 && /< 60 hari/.test(im.young.key) && /60–120 hari/.test(im.young.key), JSON.stringify({ k: im.young.k, again: im.young.again }));
  check('the job picker (muster) takes the same gap: it asks EA.fh.program.cpsAgain', /EA\.fh\.program\.cpsAgain\(estate, block\)/.test(require('fs').readFileSync(require('path').resolve(__dirname, '..', 'rooms', 'field', 'muster.js'), 'utf8')));
  check('one office call for the page', asks === 1, String(asks));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v90-key.png', fullPage: true });
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
