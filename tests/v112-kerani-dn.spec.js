// E-Book test (1.112) Brief_Kerani_DN_Meliau, signed by Yu Chen 28 Nov 2026. At an estate with "Kerani isi DN" on, the
// Kerani's Hari ini has RAMP & LORI as well as MILL TICKET, and Ramp & lorry opens for her to key (not view only). Off:
// tickets only, and Ramp & lorry is view only, as before. The lorry number is picked from the estate's own lorries (from
// the office's ramp check); an estate with no lorry of its own types it. Fake office, made-up data (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const state = { keraniDn: [], estate: 'MELU', own: [{ reg: 'SS6586X', mt: 8 }, { reg: 'SS2797L', mt: 6 }] };
  await p.route('https://script.google.com/**', async rt => {
    const q = JSON.parse(rt.request().postData() || '{}');
    const sw = { testModeOff: true, live: { 'field-harvest': ['MELU', 'SSGT'] }, rupaBaru: [], rupaEstates: [], keraniDn: state.keraniDn };
    let o = { ok: true, sw };
    if (q.action === 'login') o = { ok: true, user: { code: 'CLK-X-01', name: 'Kerani Contoh', role: 'Clerk', estates: [state.estate] }, sw };
    else if (q.action === 'switches') o = { ok: true, sw };
    else if (q.action === 'backlog') o = { ok: true, estate: q.estate, at: '', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [], tonnage: null, ownLorries: q.estate === 'MELU' ? state.own : [] };
    else if (q.action === 'trips') o = { ok: true, trips: [] };
    else if (q.action === 'harvest') o = { ok: true, lines: [] };
    else if (q.action === 'todo') o = { ok: true, items: [], sw };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  async function login(est, kd) {
    state.estate = est; state.keraniDn = kd;
    await p.goto('http://localhost:8765/index.html');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P99')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
    await p.evaluate(() => EA.setLang('bm'));
    await p.reload(); await p.fill('#key', '583920'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(800);
  }
  const screens = () => p.evaluate(() => [...document.querySelectorAll('#work-screens [data-scr]')].map(x => x.dataset.scr).join(','));

  // switch off at Meliau: as 1.111
  await login('MELU', []);
  check('switch off: the Kerani\'s Hari ini has MILL TICKET only', await screens() === 'ticket', await screens());
  await p.evaluate(() => { location.hash = 'field-harvest/collect'; }); await p.waitForTimeout(800);
  check('switch off: Ramp & lorry is view only (Rekod), no save button', !(await p.$('#cl-save')), (await p.innerText('#room-view').catch(() => '')).slice(0, 80));

  // switch on at Meliau
  await login('MELU', ['MELU']);
  check('switch on: the phone knows "Kerani isi DN" for MELU', await p.evaluate(() => EA.keraniDn('MELU') && !EA.keraniDn('SSGT')));
  check('switch on: Hari ini has RAMP & LORI and MILL TICKET', await screens() === 'collect,ticket', await screens());
  await p.click('#work-screens [data-scr="collect"]'); await p.waitForTimeout(1200);
  check('Ramp & lorry opens for her to key (SAVE button there)', !!(await p.$('#cl-save')));
  await p.click('#cl-lorry-yes'); await p.waitForTimeout(500);
  const opts = await p.evaluate(() => { const s = document.querySelector('#cl-lrs'); return s ? [...s.options].map(o => o.value) : null; });
  check('the lorry is picked from Meliau\'s own lorries (no typing)', !!opts && opts.indexOf('SS6586X') >= 0 && opts.indexOf('SS2797L') >= 0 && !(await p.$('#cl-lr')), JSON.stringify(opts));
  await p.selectOption('#cl-lrs', 'SS2797L'); await p.waitForTimeout(400);
  check('the picked lorry stays after the screen redraws (kept in the draft)',
    await p.evaluate(() => document.querySelector('#cl-lrs').value) === 'SS2797L');
  await p.selectOption('#cl-lrs', '__other'); await p.waitForTimeout(400);
  check('"Lain-lain (taip)" opens the box for a hired lorry', !!(await p.$('#cl-lr')));
  await p.fill('#cl-lr', 'sab1234'); await p.waitForTimeout(200);
  check('… typed in capitals', await p.evaluate(() => document.querySelector('#cl-lr').value.toUpperCase()) === 'SAB1234');

  // Sugut: not switched, no lorry of its own
  await login('SSGT', ['MELU']);
  check('Sugut (not switched): the Kerani has MILL TICKET only', await screens() === 'ticket', await screens());
  await p.evaluate(() => { location.hash = 'field-harvest/collect'; }); await p.waitForTimeout(800);
  check('Sugut: Ramp & lorry stays view only for her', !(await p.$('#cl-save')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
