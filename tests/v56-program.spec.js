// E-Book test (1.49). Rekod → PROGRAM · Rancangan vs sebenar (plan vs actual), read only, three levels.
// - The numbers (EA.fh.program.calc) for October 2026 on Sugut's programme: rounds due to the end of September,
//   rounds done, the gap, Ha behind and person-days; this month's work fills this month's programme first; next month.
// - The lot states: harvest (days since, bunches), manuring (round done or not), CPS (60 / 120 day rule).
// - The screen: level 1 (worst block, harvesters a day, crop), level 2 job cards with blocks ranked, level 3 lots as a
//   list or a map (lot shapes), one office call (never a loop), taps never ask the office again; HARIAN comes back.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// Sugut's 2026 programme (as seedProgramme2026), for any year.
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
const OCT = { ok: true, estate: 'SSGT', month: '2026-10', at: '2026-10-27 21:30', from: '2026-11-04', programme: programme('2026'),
  done: { 'CPS|01|2026-05': 33.2, 'CPS|01|2026-08': 16.6, 'CPS|03|2026-10': 10,
          'MAN|01|2026-03': 33.2, 'MAN|01|2026-04': 33.2, 'MAN|01|2026-06': 33.2, 'MAN|01|2026-08': 33.2, 'MAN|01|2026-10': 20 },
  crop: [{ month: '2026-09', budget: 210, days: 24, mt: 200 }, { month: '2026-10', budget: 220, days: 26, mt: 150 }], lots: null, days: [], rain: [] };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; let asks = 0; p.on('pageerror', e => errs.push(e.message));
  const now = D(0), m = now.slice(0, 7);
  const live = { ok: true, estate: 'SSGT', month: m, at: now + ' 21:30', from: '2020-01-01', programme: programme(m.slice(0, 4)),
    done: { ['CPS|01|' + m]: 5 }, crop: [{ month: m, budget: 220, days: 26, mt: 150.25 }], gang: { CPS: 1, MAN: 1, SL: 1, DEC: 1, VOPS: 1, RP: 1, HA: 3.4 },
    lots: { '1-1': D(2), '1-2': D(12), '1-3': D(20) }, lotJobs: { CPS: { '1-1': D(10), '1-2': D(70), '1-3': D(130) }, MAN: { '1-1': D(5) }, bunches: { '1-3': 118, '1-2': 90 } }, ap: { done: 58 },
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

  // 1 · the numbers for October 2026
  const c = await p.evaluate(d => { const r = EA.fh.program.calc('SSGT', '2026-10', d); const j = r.jobs; return {
    cps: { due: j.CPS.due, rounds: j.CPS.rounds, gap: j.CPS.gap, behind: j.CPS.behindHa, days: j.CPS.days, b1: j.CPS.blocks['01'], b3: j.CPS.blocks['03'] },
    man: { due: j.MAN.due, b1: j.MAN.blocks['01'] }, rp: { due: j.RP.due, rounds: j.RP.rounds, hasTarget: j.RP.hasTarget, days: j.RP.days },
    sl: { due: j.SL.due }, vops: j.VOPS.due, next: r.next }; }, OCT);
  const near = (a, b) => Math.abs(a - b) < 0.01;
  check('CPS: 3 rounds due by end Sep on every block', c.cps.due === 3 && c.cps.b1.due === 3 && c.cps.b3.due === 3, JSON.stringify(c.cps.b1));
  check('CPS Blk 1: 49.8 Ha done = 1.5 rounds, 1.5 behind, 49.8 Ha behind ≈ 19.9 person-days (2.5 Ha a day)', near(c.cps.b1.rounds, 1.5) && near(c.cps.b1.gap, -1.5) && near(c.cps.b1.behindHa, 49.8) && near(c.cps.b1.days, 19.92), JSON.stringify(c.cps.b1));
  check('CPS Blk 3: October work (no CPS programme in Oct) counts against the work behind', near(c.cps.b3.past, 10) && c.cps.b3.doneNow === 10, JSON.stringify(c.cps.b3));
  check('CPS estate: 59.8 Ha ÷ 130.65 Ha = 0.46 rounds', near(c.cps.rounds, 0.46), String(c.cps.rounds));
  check('manuring Blk 1: 4 due, 4 done; October\'s 20 Ha fills October\'s NK first (not the rounds behind)', c.man.b1.due === 4 && near(c.man.b1.rounds, 4) && c.man.b1.nowHa === 33.2 && c.man.b1.doneNow === 20 && c.man.b1.nowLabel === 'NK', JSON.stringify(c.man.b1));
  check('pruning: 3 due, none done, no daily target so no person-days', c.rp.due === 3 && c.rp.rounds === 0 && !c.rp.hasTarget && c.rp.days === 0, JSON.stringify(c.rp));
  check('slashing 1 due (Jan / Feb), VOPS 1 (Apr)', c.sl.due === 1 && c.vops === 1);
  check('next month (Nov): CPS R4 and pruning R4 on 130.65 Ha', c.next.CPS && near(c.next.CPS.ha, 130.65) && c.next.CPS.label === 'R4' && c.next.RP && near(c.next.RP.ha, 130.65), JSON.stringify(c.next));
  const h = await p.evaluate(d => { localStorage.setItem('fh.prog.SSGT.2026-10', JSON.stringify(d)); return EA.fh.program.html('SSGT', '2026-10'); }, OCT);
  check('past month: level 1 shows the crop against the budget, then the block table on tap (no job cards)', /Tan|MT/.test(h) && h.indexOf('pg-big') > 0 && !/Tuai · pusingan|Harvest · round/.test(h) && /220 MT|220/.test(h), h.slice(0, 200));
  const bt = await p.evaluate(d => { localStorage.setItem('fh.prog.SSGT.2026-10', JSON.stringify(d)); return EA.fh.program.html('SSGT', '2026-10'); }, OCT);
  check('past month note: lots only for the current month', /Petak hanya untuk bulan ini|Lots are for the current month/.test(bt));
  // lot states
  const st = await p.evaluate(() => {
    const S = EA.fh.program.states, D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    const data = { lots: { '1-1': D(2), '1-2': D(12), '1-3': D(20) }, lotJobs: { CPS: { '1-1': D(10), '1-2': D(70), '1-3': D(130) }, MAN: { '1-1': D(5) }, bunches: { '1-3': 118 } } };
    const L = n => EA.lists.lot('SSGT', n);
    return { h1: S.harvest('SSGT', data, L('1-1')), h2: S.harvest('SSGT', data, L('1-2')), h3: S.harvest('SSGT', data, L('1-3')), h4: S.harvest('SSGT', data, L('1-4')),
      c1: S.cps(data, L('1-1')), c2: S.cps(data, L('1-2')), c3: S.cps(data, L('1-3')), c4: S.cps(data, L('1-4')), m1: S.man(data, L('1-1')), m2: S.man(data, L('1-2')), rule: EA.fh.program.CPS_RULE };
  });
  check('harvest: 2 days green, 12 amber (ready), 20 red (late) with 118 bunches last time, no record = x', st.h1.k === 'g' && st.h2.k === 'a' && st.h3.k === 'r' && st.h3.bunches === 118 && st.h4.k === 'x', JSON.stringify([st.h1, st.h2, st.h3, st.h4]));
  check('CPS: 10 days wait (green), 70 can spray (amber), 130 late (red), no record red/x; rule 60 / 120', st.c1.k === 'g' && st.c2.k === 'a' && st.c3.k === 'r' && st.c4.k === 'x' && st.rule.again === 60 && st.rule.late === 120, JSON.stringify([st.c1, st.c2, st.c3, st.c4]));
  check('manuring: round keyed = green; no lot record = grey, never red (block Ha stays the true figure)', st.m1.k === 'g' && !st.m1.act && st.m2.k === 'x' && st.m2.act);

  // 2 · the screen
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(600);
  // v1.47 (29 Oct): before the trial week only practice logins and the Owner see PROGRAM
  await p.evaluate(() => { EA.lists.programFrom = '2099-01-01'; location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(500);
  check('before the trial week a real staff login has no PROGRAM button (HARIAN only)', !(await p.$('[data-view="prog"]')) && !!(await p.$('.rk-sum')));
  check('the Owner sees PROGRAM before the trial week', await p.evaluate(() => { const u = Object.assign({}, EA.session && EA.session.user ? EA.session.user : {}, { role: 'Owner' }); const d = document.createElement('div'); document.body.appendChild(d); EA.fh.history.render(d, { estate: 'SSGT', user: u, room: 'field-harvest' }); const ok = !!d.querySelector('[data-view="prog"]'); d.remove(); return ok; }));
  await p.evaluate(() => { EA.lists.programFrom = '2000-01-01'; location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/history'; }); await p.waitForTimeout(500);
  check('Rekod has HARIAN / PROGRAM', !!(await p.$('[data-view="prog"]')) && !!(await p.$('[data-view=""]')));
  await p.click('[data-view="prog"]'); await p.waitForTimeout(1500);
  const t1 = await p.innerText('#room');
  check('level 1: worst block named, harvesters 3.4 a day against the need (230 MT budget → 6)', /Blk 0\d\n(paling teruk|worst|tiada blok merah|no block red)/.test(t1) && /3\.4\npenuai sehari · perlu \d/.test(t1), (t1.match(/Blk 0\d\n[^\n]*\n3\.4\n[^\n]*/) || [''])[0]);
  check('level 1: crop due by today in working days, actual 150.2 MT, year line', /patut hingga \d\d\/\d\d \(\d+ hari\)/.test(t1) && /150\.[23] MT · \d+%/.test(t1) && /Tahun \(Jan–/.test(t1), (t1.match(/Nov: [^\n]*|patut hingga[^\n]*/) || [''])[0]);
  check('level 2: Tuai card ranks Blk 01 first: 1 late lot, the rest with no record counted apart, bunches waiting', /Tuai · pusingan/.test(t1) && /Blk 01 · 1 petak lewat · 36 tiada rekod\n±118 tandan/.test(t1), (t1.match(/Blk 01 · [^\n]*\n[^\n]*/) || [''])[0]);
  check('level 2: Membaja card, Blk 01 has 32 of 33.2 Ha left (only 1-1 done), person-days and "cukup / kurang" from 1 person a day', /Membaja · pusingan \d/.test(t1) && /Blk 01 · 3[0-3]\.\d Ha lagi/.test(t1) && /orang-hari · 1 orang → \d+ hari · (cukup|kurang \d+ hari)/.test(t1), (t1.match(/Blk 01 · 3[^\n]*|orang-hari[^\n]*/g) || []).join(' | '));
  check('level 2: CPS card, 60-day rule in the heading; Blk 01 can spray (1-2 and 1-3 and the lots with no record)', /CPS · racun bulatan\n4 pusingan setahun · ulang selepas 60 hari/.test(t1) && /Blk 01 · boleh racun \d+\.\d Ha/.test(t1), (t1.match(/Blk 01 · boleh[^\n]*/) || [''])[0]);
  check('level 2: abandoned palms 362 − 58 = 304 left, palms a day to 31/12', /304 pokok/.test(t1) && /Perlu sehari \(\d+ hari kerja\)\n\d+ pokok/.test(t1));
  check('daily keying: days closed 1 / 2, ramp 1 / 2, keyed same day 1 / 2; rain ½ day', (t1.match(/1 \/ 2 (hari|days)/g) || []).length === 3 && /½/.test(t1), (t1.match(/\d \/ \d (hari|days)/g) || []).join(' | '));
  check('one office call for the page (no loop)', asks === 1, String(asks));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v56-program.png', fullPage: true });
  // level 3, real lot shapes (lists/lot-shapes.js): the block map is drawn first
  const n01 = await p.evaluate(() => EA.lists.lotsFor('SSGT', '01').length);
  const shaped = await p.evaluate(() => { const S = (EA.lists.lotShapes || {}).SSGT || {}; return EA.lists.lotsFor('SSGT', '01').filter(l => S[l.lot]).length; });
  check('every Blk 01 lot has an outline in lists/lot-shapes.js', shaped === n01, shaped + ' of ' + n01);
  await p.click('[data-pg="HA.01"]'); await p.waitForTimeout(400);
  // a lot cut by the river is several rings, so count the lots behind the paths (the <title> names them), not the paths
  const mapN = await p.evaluate(() => {
    const by = { r: new Set(), a: new Set(), g: new Set(), x: new Set() }, paths = [...document.querySelectorAll('.pg-map path')];
    paths.forEach(el => { const lot = (el.querySelector('title') || {}).textContent.split(' ')[0]; (by[el.getAttribute('class')] || by.x).add(lot); });
    return { paths: paths.length, red: [...by.r], amber: [...by.a], green: [...by.g], grey: by.x.size, texts: document.querySelectorAll('.pg-map text').length };
  });
  check('level 3 map: every Blk 01 lot drawn from the real outlines and coloured by its state (1-3 red, 1-2 amber, 1-1 green, the rest grey), one number per lot', mapN.paths >= n01 && mapN.red.join() === '1-3' && mapN.amber.join() === '1-2' && mapN.green.join() === '1-1' && mapN.grey === n01 - 3 && mapN.texts === n01 && asks === 1, JSON.stringify(mapN) + ' of ' + n01);
  // SENARAI switches the same block to the list: late first, then no record, then ready
  await p.click('[data-pgmap="HA.01"][data-v="list"]'); await p.waitForTimeout(300);
  const lots = await p.innerText('.pg-lotbox .pg-lots');
  check('SENARAI: the same block as a list, late first ("1-3 20 hr · 118"), no-record next, ready last, no office call', !(await p.$('.pg-map')) && /^1-3 20 hr · 118/.test(lots) && lots.indexOf('1-2 12 hr · 90') > lots.indexOf('tiada rekod') && asks === 1, lots.slice(0, 80));
  // a block with no outlines yet (another estate, or before the shapes are traced): the list only, no PETA / SENARAI
  await p.evaluate(() => { window.__shapes = EA.lists.lotShapes; EA.lists.lotShapes = {}; });
  await p.click('[data-pg="HA.01"]'); await p.waitForTimeout(200); await p.click('[data-pg="HA.01"]'); await p.waitForTimeout(400);
  check('no outlines for the block: the lots show as a list, with no PETA / SENARAI buttons', !(await p.$('[data-pgmap]')) && !(await p.$('.pg-map')) && !!(await p.$('.pg-lotbox .pg-lots')), '');
  await p.evaluate(() => { EA.lists.lotShapes = window.__shapes; });
  await p.click('[data-pg="HA.01"]'); await p.waitForTimeout(200);
  await p.click('[data-pg="blocks"]'); await p.waitForTimeout(300);
  check('level 1 tap: all jobs by block table, 4 blocks, old-data jobs grey', (await p.$$('.pg-bt')).length === 4 && (await p.$$('.pg-bt tr.pg-old')).length >= 4 && asks === 1, String((await p.$$('.pg-bt')).length));
  await p.click('[data-view=""]'); await p.waitForTimeout(300);
  check('HARIAN comes back (the four month boxes)', !!(await p.$('.rk-sum')) && !(await p.$('#pg-box')));
  // an office script older than 1.47 answers unknown_action: say so plainly, never "Loading…" for ever
  await p.unroute('https://script.google.com/**');
  await p.route('https://script.google.com/**', rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'unknown_action' }) }));
  await p.evaluate(() => { localStorage.removeItem('fh.prog.SSGT.' + new Date().toISOString().slice(0, 7)); });
  await p.click('#hs-prev'); await p.waitForTimeout(200); await p.click('#hs-next'); await p.waitForTimeout(200);
  await p.click('[data-view="prog"]'); await p.waitForTimeout(1200);
  check('an old office script: "Pemilik perlu kemas kini skrip pejabat"', /kemas kini skrip pejabat|update the office script/.test(await p.innerText('#pg-box')), await p.innerText('#pg-box'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
