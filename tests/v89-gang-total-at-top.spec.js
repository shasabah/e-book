// E-Book test (1.80) the gang total is where the mandor looks, and ISI is off harvesting.
//
// Yu Chen, 20 Nov 2026, looking at Blok 02 on the practice login: "Is this to fill mandore? It should
// total up the number by the whole harvesting Geng."
//
// He was reading the screen exactly as it was drawn. Three faults, measured before the fix:
//
//   1. The ISI box sat at the top of the block card and the MANDOR'S NAME was the very next line under it,
//      with no box of his own and no word of explanation. Anyone joins those two together.
//
//   2. ISI copies ONE number into every empty box. On harvesting that can only ever be wrong — every
//      harvester cuts a different number, which is what piece rate means. The screen was inviting the gang
//      total to be typed into it: 872 tandan into 16 men is 13,952 tandan, and it is pay.
//
//   3. The gang total he wanted already existed — "Jumlah: 16 orang · 872 tandan · purata 55 seorang" —
//      measured at 2,946px while the ISI box was at 422px. Past all sixteen men. Nobody scrolls that far on
//      a phone, so nobody had ever seen it.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

function seed(p, lang) {
  return p.evaluate(() => {
    const est = 'SSGT';
    const mandor = (EA.lists.mandorsFor(est) || [])[0];
    const all = EA.lists.workersFor(est) || [];
    const cutters = all.slice(0, 16), pruners = all.slice(16, 19);
    if (!mandor || cutters.length < 16 || pruners.length < 3) return { ok: false, c: cutters.length, p: pruners.length };
    const date = EA.today();
    const here = [mandor].concat(cutters, pruners);
    const hereIds = here.map(w => w.id);
    const away = all.concat(EA.lists.mandorsFor(est) || []).filter(w => hereIds.indexOf(w.id) < 0);
    const hv = (w, i) => ({ id: 'h' + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '02', lots: '2-1', mandor: mandor.id, status: 'active' });
    // AP is paid per palm, not per tonne and not per day, so it is the kind of job that keeps ISI.
    const ap = (w, i) => ({ id: 'p' + i, worker_id: w.id, muster: 'H', task_code: 'AP', block: '03', lots: '3-1', mandor: mandor.id, status: 'active' });
    const out = (w, i) => ({ id: 'a' + i, worker_id: w.id, muster: 'T', task_code: '', block: '', lots: '', mandor: '', status: 'active' });
    const chit = { chit: 'MC-T', date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc',
      alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '02', lots: ['2-1'], mandor: mandor.id },
             { key: 'j2', task: 'AP', block: '03', lots: ['3-1'], mandor: mandor.id }],
      rows: [hv(mandor, 99)].concat(cutters.map(hv), pruners.map(ap), away.map(out)) };
    localStorage.setItem('fh.chits2', JSON.stringify([chit]));
    localStorage.setItem('fh.dayclose', JSON.stringify([]));
    localStorage.setItem('fh.work', JSON.stringify([]));
    return { ok: true, mandor: mandor.id };
  });
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); });
  await p.evaluate(() => EA.setLang('bm'));
  await p.reload();
  await p.fill('#key', '111111');
  await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { const x = [...document.querySelectorAll('#home button,#home a')].find(e => /▾/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,li,a')].find(e => /sugut/i.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(600);

  const s = await seed(p);
  check('the day is built: a mandor, 16 harvesters and 3 on palm work', s.ok, JSON.stringify(s));
  if (!s.ok) { await b.close(); return; }

  await p.evaluate(() => { location.hash = 'field-harvest/work'; });
  await p.waitForTimeout(1400);

  // 1 · ISI is off harvesting, and still on the job that is not harvesting
  const boxes = await p.evaluate(() => {
    const hv = document.querySelector('[data-job="j1"]'), ap = document.querySelector('[data-job="j2"]');
    return { hvFill: !!(hv && hv.querySelector('[data-fill]')), apFill: !!(ap && ap.querySelector('[data-fill]')),
             hvQty: hv ? hv.querySelectorAll('input.qty').length : -1 };
  });
  check('a harvest job has no ISI box — one number for everyone is always wrong on piece rate', !boxes.hvFill);
  check('ISI is NOT removed everywhere: a per-palm job still has it', boxes.apFill);
  check('the harvest job has exactly 16 boxes — one per harvester, none for the mandor, none for ISI',
    boxes.hvQty === 16, String(boxes.hvQty));

  // 2 · the total is above the first man, not below the last
  const pos = await p.evaluate(() => {
    const hv = document.querySelector('[data-job="j1"]');
    const t = hv.querySelector('[data-tot]'), r1 = hv.querySelector('.wrow'), fl = hv.querySelector('[data-flags]');
    const top = e => e ? Math.round(e.getBoundingClientRect().top + window.scrollY) : null;
    return { tot: top(t), first: top(r1), flags: top(fl), cls: t ? t.className : '' };
  });
  check('the gang total is above the first man on the card', pos.tot < pos.first, 'total ' + pos.tot + ' vs first row ' + pos.first);
  check('the warnings stayed at the bottom — one amber line per man would push the men off the screen',
    pos.flags > pos.first, 'flags ' + pos.flags + ' vs first row ' + pos.first);
  check('the total reads as a figure, not as a grey note', /wk-total/.test(pos.cls), pos.cls);

  // 3 · it counts what is keyed, and keeps counting as he keys
  const before = await p.evaluate(() => document.querySelector('[data-job="j1"] [data-tot]').textContent.trim());
  check('before anything is keyed it says nobody has cut yet', /16 orang/.test(before) && /0 tandan/.test(before), before);
  await p.evaluate(() => {
    const bs = [...document.querySelectorAll('[data-job="j1"] input.qty')];
    bs.forEach((i, n) => { i.value = String(32 + n * 3); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); });
  });
  await p.waitForTimeout(900);
  const after = await p.evaluate(() => document.querySelector('[data-job="j1"] [data-tot]').textContent.trim());
  // 32, 35, 38 … 77 = 872 over 16 men, average 55. The mandor is NOT one of the sixteen.
  check('it adds the men up as he keys, so he can check it against his own paper before SIMPAN',
    /16 orang/.test(after) && /872 tandan/.test(after) && /purata 55/.test(after), after);

  // 4 · the mandor's line says why he has no box
  const mdr = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-job="j1"] .wrow')];
    const m = rows.find(r => /Mandor/.test(r.innerText));
    return { text: m ? m.innerText.replace(/\s+/g, ' ').trim() : '', box: m ? m.querySelectorAll('input').length : -1,
             first: rows.indexOf(m) === 0 };
  });
  check('the mandor says in words that there is no number for him', /Tiada angka untuk mandor/.test(mdr.text), mdr.text);
  check('and he still has no box', mdr.box === 0, String(mdr.box));
  check('he is still shown, first, so he can be marked away if he did not turn up', mdr.first);
  check('no page errors', errs.length === 0, errs.join(' | '));

  // 5 · the same in English
  await p.evaluate(() => EA.setLang('en'));
  await p.waitForTimeout(600);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(1200);
  const en = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-job="j1"] .wrow')];
    const m = rows.find(r => /Mandor/.test(r.innerText));
    return { m: m ? m.innerText.replace(/\s+/g, ' ') : '', tot: document.querySelector('[data-job="j1"] [data-tot]').textContent };
  });
  check('an English phone gets the English words, not the Bahasa ones',
    /No number to key for the mandor/.test(en.m) && !/Tiada angka/.test(en.m), en.m);
  check('and the total too', /Total:/.test(en.tot) && /people/.test(en.tot), en.tot);
  await b.close();

  // 6 · the rule is written once, where the screen is built
  const wk = fs.readFileSync(path.join(root, 'rooms', 'field', 'work.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'core', 'look.css'), 'utf8');
  check("the ISI row names the kinds it is kept off, harvesting among them",
    /k !== 'ticket' && k !== 'day' && k !== 'bunches' && !auto\(j\) && !isHa\(j\)/.test(wk), 'the condition');
  check('the total and the note have a style', /\.wk-total \{/.test(css) && /\.wk-nobox \{/.test(css), 'css');
  const v = fs.readFileSync(path.join(root, 'core', 'version.js'), 'utf8');
  check('version 1.80 (128)', /EA\.RELEASE = '1\.80'/.test(v) && /EA\.VERSION = 128/.test(v), 'version');
})();
