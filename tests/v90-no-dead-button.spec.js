// E-Book test (1.81) a red line is a button only when pressing it lands somewhere that can show that day.
//
// Yu Chen, 21 Nov 2026, from Ferezelly on 16 Nov: "he press the red highlight button but never see the
// info to be fix."
//
// Reproduced on his own day before anything was changed. 16 Nov had fallen out of the five-day window, and
// three red lines still carried a jump. Pressing "17 orang dalam senarai tiada dalam chit" landed on the
// morning chit screen, which answered with a band reading "Hari Isnin 16/11 belum lengkap" and a
// LENGKAPKAN button that sent him straight back to the close. A ring between two screens, and the names he
// needed were shown on neither.
//
// The 1.72 guard had been written for the WORK checks only. Check 1's "on the list but not on the chit",
// and checks 2 and 3 which go to the Ramp, kept their jump.
//
// The rule is one rule, in one place, for every estate and every day (Rule 5): a line is a button only when
// it can land somewhere useful. This test holds both ends of the ring, and holds that the guard is not
// over-applied — a day still inside the window must keep every button it had.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const TOO_OLD = 'terlalu lama';

function seedTwoDays(p) {
  return p.evaluate(() => {
    const est = 'SSGT', mandor = (EA.lists.mandorsFor(est) || [])[0], all = EA.lists.workersFor(est) || [];
    const on = all.slice(0, 8);                       // only some of the estate is on the chit
    const row = (w, i) => ({ id: 'r' + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '02', lots: '2-1', mandor: mandor.id, status: 'active' });
    const mk = (date, tag) => ({ chit: 'MC-' + tag, date: date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc' + tag,
      alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '02', lots: ['2-1'], mandor: mandor.id }],
      rows: [row(mandor, 99)].concat(on.map(row)) });
    const oldDay = EA.dayAgo(5), newDay = EA.dayAgo(2);   // one past the window, one inside it
    localStorage.setItem('fh.chits2', JSON.stringify([mk(oldDay, 'OLD'), mk(newDay, 'NEW')]));
    localStorage.setItem('fh.dayclose', JSON.stringify([]));
    // The work MUST be keyed, or check 1 stops at "Kerja harian belum dikunci" and never reaches the
    // "on the list but not on the chit" branch — which is the branch Ferezelly was pressing. Keying the
    // work also puts bunches on the chit, which is what makes check 2 (not yet at the ramp) fire.
    const work = (tag, date) => ({ chit: 'MC-' + tag, date: date, estate: 'SSGT', chitRev: 1,
      rec: { at: '18:30', jobs: [{ id: 'j1', status: 'done' }],
        lines: on.map((w, i) => ({ id: tag + i, worker_id: w.id, task_code: 'HA', block: '02', lot: '2-1', bunches: String(40 + i) })) } });
    localStorage.setItem('fh.work', JSON.stringify([work('OLD', oldDay), work('NEW', newDay)]));
    return { oldDay: oldDay, newDay: newDay,
      oldKeyable: EA.fh.workChitOpen({ date: oldDay, estate: est }),
      newKeyable: EA.fh.workChitOpen({ date: newDay, estate: est }) };
  });
}
function redLines(p) {
  return p.evaluate(() => [...document.querySelectorAll('.dc-it.dc-bad')].map(li => ({
    text: li.innerText.replace(/\s+/g, ' ').trim(),
    button: !!li.querySelector('button'),
    go: li.querySelector('button') ? (li.querySelector('button').dataset.go || '') : '',
    scroll: li.querySelector('button') ? (li.querySelector('button').dataset.scroll || '') : ''
  })));
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

  const s = await seedTwoDays(p);
  check('two days are built: one past the five-day window, one inside it',
    s.oldKeyable === false && s.newKeyable === true, JSON.stringify(s));

  // 1 · the day past the window: no red line may carry a jump to another screen
  await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForTimeout(1300);
  await p.evaluate(d => { const x = document.querySelector('[data-day="' + d + '"]'); if (x) x.click(); }, s.oldDay);
  await p.waitForTimeout(1000);
  const old = await redLines(p);
  check('the old day has red lines to test', old.length >= 2, old.length + ' red');
  const jumped = old.filter(l => l.go);
  check('NO red line on an old day jumps to another screen — that jump was the ring',
    jumped.length === 0, jumped.map(l => l.text.slice(0, 40) + ' -> ' + l.go).join(' | '));
  const people = old.find(l => /tiada dalam chit/.test(l.text));
  check('the people line is there and is no longer a button', people && !people.button, people ? people.text.slice(0, 60) : '(missing)');
  check('and it says in words that the day is the office\'s',
    people && new RegExp(TOO_OLD).test(people.text), people ? people.text.slice(-70) : '');
  const ramp = old.find(l => /ke ramp/.test(l.text));
  check('the ramp line is no longer a button either', ramp && !ramp.button, ramp ? ramp.text.slice(0, 50) : '(missing)');
  check('and it says the same thing', ramp && new RegExp(TOO_OLD).test(ramp.text), ramp ? ramp.text.slice(-70) : '');
  const rain = old.find(l => /Hujan/.test(l.text));
  check('the rain line KEEPS its button — it scrolls on this same screen, so it works at any age',
    rain && rain.button && rain.scroll && !rain.go, rain ? (rain.scroll || 'no scroll') : '(missing)');

  // 2 · the guard must not be over-applied: a day inside the window keeps its buttons
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/close'; }); await p.waitForTimeout(1200);
  await p.evaluate(d => { const x = document.querySelector('[data-day="' + d + '"]'); if (x) x.click(); }, s.newDay);
  await p.waitForTimeout(1000);
  const fresh = await redLines(p);
  check('a day inside the window still has a red line that jumps',
    fresh.some(l => l.go), fresh.map(l => l.go).filter(Boolean).join(',') || 'NONE — the guard is too wide');
  check('and it never says the day is too old',
    !fresh.some(l => new RegExp(TOO_OLD).test(l.text)), 'no too-old text on a fresh day');

  // 3 · the far side of the ring: the chit screen's band
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1500);
  const band = await p.evaluate(() => {
    const mine = document.querySelector('#fh-dcmiss'), old = document.querySelector('#fh-dcold');
    return { keep: mine ? mine.innerText.replace(/\s+/g, ' ').trim() : '', keepBtn: mine ? !!mine.querySelector('a.btn') : false,
      office: old ? old.innerText.replace(/\s+/g, ' ').trim() : '', officeBtn: old ? !!old.querySelector('a.btn, button') : false };
  });
  check('the chit band still offers LENGKAPKAN for a day he can still key', band.keepBtn && /LENGKAPKAN/.test(band.keep), band.keep.slice(0, 70));
  check('the old day gets its own band instead of LENGKAPKAN', /minta pejabat/.test(band.office), band.office.slice(0, 90));
  check('and that band has nothing to press — pressing was the ring', band.office && !band.officeBtn, String(band.officeBtn));
  check('the old day is NOT inside the LENGKAPKAN band', band.keep.indexOf(band.office.slice(0, 12)) < 0, band.keep.slice(0, 50));
  check('no page errors', errs.length === 0, errs.join(' | '));

  // 4 · the same in English
  await p.evaluate(() => EA.setLang('en')); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(1300);
  const en = await p.evaluate(() => { const o = document.querySelector('#fh-dcold'); return o ? o.innerText.replace(/\s+/g, ' ').trim() : ''; });
  check('an English phone gets the English words', /ask the office/i.test(en) && !/minta pejabat/.test(en), en.slice(0, 80));
  // Rule 7, found by this very test on its first run: the band read "Day Isnin 16/11 not closed" — a
  // Bahasa day name inside an English sentence. The day's name now follows the phone, everywhere this
  // screen shows one, at every estate.
  check('and the day name is English too, not "Day Isnin"',
    !/Isnin|Selasa|Rabu|Khamis|Jumaat|Sabtu|Ahad/.test(en), en.slice(0, 60));
  await b.close();

  // 5 · the rule is written once, and no check smuggles its own jump back in (Rule 5)
  const dc = fs.readFileSync(path.join(root, 'rooms', 'field', 'dayclose.js'), 'utf8');
  const body = dc.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  check('no check carries a hard-coded jump any more', !/go: '#field-harvest/.test(body), 'every jump goes through the guard');
  check('one guard, three doors', /var only = function \(o, hash\)/.test(body)
    && /var toWork = function \(o\) \{ return only\(o, '#field-harvest\/work'\); \}/.test(body)
    && /var toChit = function \(o\) \{ return only\(o, '#field-harvest'\); \}/.test(body)
    && /var toRamp = function \(o\) \{ return only\(o, '#field-harvest\/collect'\); \}/.test(body), 'only()');
  const ms = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
  check('the band asks the very same rule, it does not keep its own copy',
    /EA\.fh\.workChitOpen \? EA\.fh\.workChitOpen\(\{ date: m\.date, estate: ctx\.estate \}\)/.test(ms), 'muster.js');
  const v = fs.readFileSync(path.join(root, 'core', 'version.js'), 'utf8');
  check('version 1.81 (129)', /EA\.RELEASE = '1\.81'/.test(v) && /EA\.VERSION = 129/.test(v), 'version');
})();
