// E-Book test (1.55). Jentera on the morning chit — the phone side.
// Yu Chen, 11 Nov 2026: nobody was aware Sugut has had no backhoe and no excavator operator. The card is drawn
// from the office's own answer to the chit's "backlog" call (Brief_Jentera.md §4): nothing is keyed here.
// Also checks that a phone on 1.55 still works against the old office script, which sends no machines at all.
// Rule 8: made-up workers only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');

const MACHINES = { at: '2026-11-11', lines: [
  { id: 'FARMTRACTOR', kind: 'Traktor ladang', units: 2, onToday: 1, state: 'sebahagian', days: 0, since: '2026-11-11', reg: '', model: '', regs: ['SMQ6237', 'SD4867U'], fromOther: false, chain: true },
  { id: 'LORRY', kind: 'Lori', units: 0, onToday: 1, state: 'jalan', days: 0, since: '2026-11-11', reg: '', model: '', regs: [], fromOther: true, chain: true },
  { id: 'BACKHOE', kind: 'Backhoe', units: 1, onToday: 0, state: 'tiada', days: 5, since: '2026-11-05', reg: 'SD3894R', model: 'JCB Backhoe 3DX', regs: ['SD3894R'], fromOther: false, chain: false },
  { id: 'EXCAVATOR', kind: 'Excavator', units: 1, onToday: 0, state: 'bengkel', days: 0, since: '', reg: 'SAA9052R', model: 'Hitachi EX120', regs: ['SAA9052R'], fromOther: false, chain: false }] };
const BACKLOG = { estate: 'SSGT', at: '2026-11-11 06:05', field: [], fieldTotal: 0, ramp: { bunches: 0 }, checks: [], grading: [], tonnage: null, rain: null, machines: MACHINES };

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
  await p.evaluate((bl) => {
    localStorage.clear();
    localStorage.setItem('ea.phone', JSON.stringify('P13'));
    localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([1, 2, 3, 4, 5].map(i =>
      ({ id: 'W-SSGT-00' + i, name: 'Pekerja Contoh ' + i, estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }))));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
    localStorage.setItem('fh.backlog.SSGT', JSON.stringify(bl));
  }, BACKLOG);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(900);

  // ── the card on the chit screen ────────────────────────────────────────────────────────────────────────────────
  const card = await p.evaluate(() => {
    const c = document.getElementById('fh-jentera');
    if (!c) return null;
    return { text: c.innerText.replace(/\s+/g, ' '),
      rows: [].map.call(c.querySelectorAll('.list-line'), r => ({ t: r.innerText.replace(/\s+/g, ' '), pill: (r.querySelector('.pill') || {}).className || '' })),
      afterBacklog: !!(document.getElementById('fh-backlog') && document.getElementById('fh-backlog').nextElementSibling === c) };
  });
  check('a JENTERA card is on the chit screen, right after "Tan & baki buah"', !!card && card.afterBacklog, JSON.stringify(card && card.afterBacklog));
  check('one line per kind of machine, four of them', !!card && card.rows.length === 4, String(card && card.rows.length));
  check('the backhoe is named by its reg no and says how many working days with no driver',
    !!card && /Backhoe · SD3894R/.test(card.text) && /5 hari kerja/.test(card.text), card && card.text);
  check('red from the third day with no driver', !!card && /bad/.test(card.rows[2].pill), card && card.rows.map(r => r.pill).join(' | '));
  check('a kind with two units is shown at kind level, not by one reg no',
    !!card && /Traktor ladang · 2 unit/.test(card.text) && !/SMQ6237/.test(card.text), card && card.text);
  check('one of the two tractors has a driver: SEBAHAGIAN, amber not red',
    !!card && /1 dari 2 unit ada pemandu/.test(card.text) && /wait/.test(card.rows[0].pill), card && card.rows[0].t);
  check('a machine being worked on says BENGKEL, not that it has no driver',
    !!card && /BENGKEL/.test(card.text) && /Di bengkel hari ini/.test(card.text), card && card.rows[3].t);
  check('the lorry we do not own but is working here says so', !!card && /dari estet lain/.test(card.text), card && card.rows[1].t);
  check('the card says nothing is keyed here', !!card && /Tiada apa-apa untuk dikunci/.test(card.text));

  // ── the WhatsApp chit ─────────────────────────────────────────────────────────────────────────────────────────
  const wa = await p.evaluate((bl) => {
    const chit = { chit: 'MC-T', date: '2026-11-11', estate: 'SSGT', rev: 1, confirmedAt: '06:14', keyedName: 'Staf',
      rows: [{ worker_id: 'W-SSGT-001', muster: 'H', task_code: 'HA', block: '01', lots: '1-13', mandor: '' }], jobs: [], alerts: [], backlog: bl };
    const allOk = JSON.parse(JSON.stringify(bl));
    allOk.machines.lines = allOk.machines.lines.map(m => Object.assign({}, m, { state: 'jalan', onToday: m.units || 1, days: 0 }));
    const old = JSON.parse(JSON.stringify(bl)); delete old.machines;
    const none = JSON.parse(JSON.stringify(bl)); none.machines = { at: '2026-11-11', lines: [] };
    const V = EA.roomViews['field-harvest'];
    const chitWith = m => { const c = JSON.parse(JSON.stringify(chit)); c.backlog = m; return V.chitText(c); };
    return { bad: V.chitText(chit), ok: chitWith(allOk), old: chitWith(old), none: chitWith(none) };
  }, BACKLOG);
  const badLines = wa.bad.split('\n').filter(l => /Jentera|Backhoe|Excavator|Traktor|Lori|Semua jalan|lagi jalan/.test(l));
  check('the WhatsApp chit has a Jentera block', /\*Jentera · Machines\*/.test(wa.bad), badLines.join(' // '));
  check('only what is not normal is listed: the lorry that is running is counted, not named',
    badLines.length === 5 && !/Lori/.test(wa.bad) && /⚠ Backhoe · SD3894R/.test(wa.bad) && /1 lagi jalan/.test(wa.bad), badLines.join(' // '));
  check('a kind with a driver on some units still shows, with a dot not a warning', /• Traktor ladang · 2 unit/.test(wa.bad), badLines.join(' // '));
  check('the day it last worked is given, so the Pengurus can see how long', /kerja akhir/.test(wa.bad), badLines.join(' // '));
  check('everything running is one line', /\*Jentera · Machines\*\n✅ Semua jalan/.test(wa.ok), wa.ok.split('\n').filter(l => /Jentera|jalan/.test(l)).join(' // '));
  check('an old office script that sends no machines: no Jentera block at all, nothing breaks', !/Jentera/.test(wa.old));
  check('an estate with no machines listed: no Jentera block', !/Jentera/.test(wa.none));

  // ── the office answer arriving later redraws the card ──────────────────────────────────────────────────────────
  const late = await p.evaluate(() => {
    localStorage.removeItem('fh.backlog.SSGT');
    document.dispatchEvent(new CustomEvent('fh:backlog'));
    const gone = !document.getElementById('fh-jentera');
    const bl = { estate: 'SSGT', at: '2026-11-11 06:40', field: [], fieldTotal: 0, ramp: { bunches: 0 }, checks: [], grading: [], tonnage: null, rain: null,
      machines: { at: '2026-11-11', lines: [{ id: 'BACKHOE', kind: 'Backhoe', units: 1, onToday: 0, state: 'tiada', days: 12, since: '2026-10-26', reg: 'SD3894R', model: 'JCB Backhoe 3DX', regs: ['SD3894R'], fromOther: false, chain: false }] } };
    localStorage.setItem('fh.backlog.SSGT', JSON.stringify(bl));
    document.dispatchEvent(new CustomEvent('fh:backlog'));
    const c = document.getElementById('fh-jentera');
    return { gone: gone, back: !!c, one: c ? c.querySelectorAll('.list-line').length : 0, text: c ? c.innerText.replace(/\s+/g, ' ') : '' };
  });
  check('with no office answer yet there is no card, rather than an empty one', late.gone);
  check('when the office answer arrives the card appears in place', late.back && late.one === 1, JSON.stringify(late));
  check('it is drawn once, not twice', await p.evaluate(() => document.querySelectorAll('#fh-jentera').length) === 1);
  check('12 working days with no driver reads in plain words', /12 hari kerja/.test(late.text), late.text);

  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
