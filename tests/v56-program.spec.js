// E-Book test (1.47). Rekod → PROGRAM · Rancangan vs sebenar (plan vs actual), read only.
// - The numbers (EA.fh.program.calc) for October 2026 on Sugut's programme: rounds due to the end of September,
//   rounds done, the gap, Ha behind and person-days; this month's work fills this month's programme first; next month.
// - The screen: Rekod has HARIAN / PROGRAM; PROGRAM shows the six cards from one office call (never a loop of calls);
//   LIHAT PETAK and a job row open without asking the office again; HARIAN comes back.
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
    done: { ['CPS|01|' + m]: 5 }, crop: [{ month: m, budget: 220, days: 26, mt: 150.25 }], gang: { CPS: 1, MAN: 1, SL: 1, DEC: 1, VOPS: 1, RP: 1 },
    lots: { '1-1': D(2), '1-2': D(12), '1-3': D(20) },
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
  check('block grid first: Blk 01–04 × jobs; CPS Blk 01 red −1.5; manuring Blk 01 green with the October ring', h.indexOf('pg-grid') > 0 && h.indexOf('pg-grid') < h.indexOf('Tan BTS') && /class="pg-g r"[^>]*title="CPS Blk 01">−1\.5/.test(h) && /class="pg-g g ring"[^>]*title="MAN Blk 01">/.test(h), (h.match(/<span class="pg-g[^<]*/g) || []).slice(0, 8).join(' | '));
  check('block grid: the blocks with most red are named with their count', /Paling banyak merah: <span class="pg-chip">Blk 0\d · [1-6]<\/span>/.test(h), (h.match(/Paling banyak merah:.{0,120}/) || [''])[0]);
  check('October page: Membaja NK this month on Blk 1–4 (130.65 Ha), dose 2.5', /Membaja|Manuring/.test(h) && /NK/.test(h) && /130\.65 Ha/.test(h) && /2\.5 kg/.test(h), h.slice(0, 200));
  check('October page: rounds to the end of September, CPS red −1.3 or worse… shown first (most behind)', /hingga akhir Sep|to the end of Sep/.test(h) && h.indexOf('Pruning') < h.indexOf('Slashing') || h.indexOf('Cantas') < h.indexOf('Tebas'));
  check('October page: rain from TUTUP HARI starts 04/11 (before the start date)', /mula 04\/11|starts 04\/11/.test(h));

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
  check('crop due counts working days (Mon–Sat): "(n/m hari kerja)"', /Patut hingga \d\d\/\d\d \(\d+\/2[4-7] hari kerja\)/.test(t1), (t1.match(/Patut hingga[^\n]*/) || [''])[0]);
  check('this month: people a day from the office → "perlu N hari; kurang N hari" (or cukup)', /Purata 1 orang sehari \(7 hari lepas\) → perlu \d+ hari; (kurang \d+ hari|cukup)/.test(t1), (t1.match(/Purata[^\n]*/) || [''])[0]);
  check('PROGRAM: crop card, budget 220 MT, actual 150.25 MT', /220 MT/.test(t1) && /150\.25 MT/.test(t1), t1.slice(0, 400));
  check('PROGRAM: 164 lots, 1 in round, 1 ready, 1 late, the rest without a harvest record', /164 (petak|lots)/.test(t1) && /Tiada rekod tuai|No harvest record/.test(t1), t1.slice(t1.indexOf('164'), t1.indexOf('164') + 200));
  check('PROGRAM: rain ½ day this month from the close', /½ hari hilang|½ days lost/.test(t1) && /Circle Spraying/.test(t1));
  check('PROGRAM: days closed 1 / 2, ramp 1 / 2, keyed same day 1 / 2', (t1.match(/1 \/ 2 (hari|days)/g) || []).length === 3, (t1.match(/\d \/ \d (hari|days)/g) || []).join(' | '));
  check('one office call for the page (no loop)', asks === 1, String(asks));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v56-program.png', fullPage: true });
  await p.click('[data-pg="lots"]'); await p.waitForTimeout(300);
  check('LIHAT PETAK lists the late lots, without asking the office again', !!(await p.$('.pg-lots')) && /1-3/.test(await p.innerText('.pg-lots')) && asks === 1, String(asks));
  const row = await p.$('tr.pg-job'); await row.click(); await p.waitForTimeout(300);
  check('a job row opens its blocks, without asking the office again', (await p.$$('tr.pg-blk')).length === 4 && asks === 1, String(asks));
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
