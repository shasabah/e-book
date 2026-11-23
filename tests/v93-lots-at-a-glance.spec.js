// E-Book test (1.88) which lots are taken can be read at a glance, on both screens that pick a lot.
//
// Yu Chen, 23 Nov 2026: "Lot that already choose for the task still able to see. If we have big group it
// take time to see all the task number." Asked which screen: "Both of them."
//
// Kerja, measured on a 16-man gang over 5 lots before the change: 16 "Petak?" dropdowns, 3,768px of screen,
// and nothing showing which lots were already covered. A dropdown hides its options until it is opened, so
// seeing what was left meant opening all sixteen. Now each man has one chip per lot, one tap, with the
// number of men already on that lot under it, and a lot nobody is on yet says "kosong".
//
// The chit, when adding a second job of the same task in the same block: the first job's lots looked exactly
// like free ones. They are marked "kerja lain" now. Marked, never hidden — two gangs can share a lot, and a
// lot that cannot be picked is how staff end up keying a wrong one.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

async function start(b) {
  const p = await b.newPage({ viewport: { width: 390, height: 1000 } });
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
  return { p, errs };
}
const tap = (p, w, lot) => p.evaluate(([w, lot]) => { const b = [...document.querySelectorAll('[data-pick-lot]')].find(x => x.dataset.w === w && x.dataset.pickLot === lot); if (b) b.click(); }, [w, lot]);
const chipsOf = (p, w) => p.evaluate(w => [...document.querySelectorAll('[data-pick-lot]')].filter(x => x.dataset.w === w)
  .map(x => ({ lot: x.dataset.pickLot, on: x.getAttribute('aria-pressed') === 'true', free: x.classList.contains('lotp-free'), text: x.innerText.replace(/\s+/g, ' ').trim() })), w);

(async () => {
  const b = await chromium.launch();

  // ---------- Kerja ----------
  const { p, errs } = await start(b);
  const s = await p.evaluate(() => {
    const est = 'SSGT', mandor = (EA.lists.mandorsFor(est) || [])[0], all = EA.lists.workersFor(est) || [];
    const on = all.slice(0, 6), solo = all.slice(6, 8), date = EA.today(), LOTS = ['2-1', '2-2', '2-3'];
    const row = (w, i) => ({ id: 'r' + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '02', lots: LOTS.join(' '), mandor: mandor.id, status: 'active' });
    const one = (w, i) => ({ id: 's' + i, worker_id: w.id, muster: 'H', task_code: 'HA', block: '03', lots: '3-1', mandor: mandor.id, status: 'active' });
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'MC-LOTS', date: date, estate: est, rev: 1, confirmedAt: '06:10', chitRowId: 'rc',
      alerts: [], rain_mm: '', rain_time: '', checker: 'Ujian',
      jobs: [{ key: 'j1', task: 'HA', block: '02', lots: LOTS, mandor: mandor.id }, { key: 'j2', task: 'HA', block: '03', lots: ['3-1'], mandor: mandor.id }],
      rows: [row(mandor, 99)].concat(on.map(row), solo.map(one)) }]));
    localStorage.setItem('fh.dayclose', JSON.stringify([]));
    localStorage.setItem('fh.work', JSON.stringify([]));
    return { w: on.map(x => x.id), solo: solo.map(x => x.id) };
  });
  await p.evaluate(() => { location.hash = 'field-harvest/work'; });
  await p.waitForTimeout(1600);

  const shape = await p.evaluate(() => ({ selects: document.querySelectorAll('select[data-f="lot"]').length,
    rows: new Set([...document.querySelectorAll('[data-pick-lot]')].map(x => x.dataset.w)).size }));
  check('no lot dropdown is left on a harvest job', shape.selects === 0, String(shape.selects));
  check('every man on the three-lot job has his own chips', shape.rows === 6, String(shape.rows));
  let c = await chipsOf(p, s.w[0]);
  check('one chip per lot of the job, in the job\'s order', c.map(x => x.lot).join(',') === '2-1,2-2,2-3', c.map(x => x.lot).join(','));
  check('before anyone is placed every lot says kosong', c.every(x => x.free && /kosong/.test(x.text)), c.map(x => x.text).join(' | '));
  check('a job with ONE lot shows no chips — there is nothing to choose',
    (await chipsOf(p, s.solo[0])).length === 0, 'single lot');

  await tap(p, s.w[0], '2-1'); await p.waitForTimeout(300);
  await tap(p, s.w[1], '2-1'); await p.waitForTimeout(300);
  await tap(p, s.w[2], '2-2'); await p.waitForTimeout(400);
  c = await chipsOf(p, s.w[0]);
  check('one tap puts the man on the lot', c.find(x => x.lot === '2-1').on && !c.find(x => x.lot === '2-2').on, JSON.stringify(c.map(x => x.lot + ':' + x.on)));
  const other = await chipsOf(p, s.w[5]);   // a man who has picked nothing yet
  check('EVERY row shows how many men are already on each lot — that is the point',
    /2 org/.test(other.find(x => x.lot === '2-1').text) && /1 org/.test(other.find(x => x.lot === '2-2').text), other.map(x => x.text).join(' | '));
  check('and the lot nobody is on yet still says kosong', other.find(x => x.lot === '2-3').free && /kosong/.test(other.find(x => x.lot === '2-3').text), other.find(x => x.lot === '2-3').text);
  check('a lot others are on can still be picked — sharing a lot is real', !other.find(x => x.lot === '2-1').on, 'not disabled');
  const disabled = await p.evaluate(() => [...document.querySelectorAll('[data-pick-lot]')].filter(x => x.disabled).length);
  check('no chip is ever disabled', disabled === 0, String(disabled));

  await tap(p, s.w[0], '2-1'); await p.waitForTimeout(400);
  c = await chipsOf(p, s.w[0]);
  check('tapping his own lot again clears it, as the dropdown\'s blank line did', !c.some(x => x.on) && /1 org/.test(c.find(x => x.lot === '2-1').text), c.map(x => x.text).join(' | '));

  // the save still sees the lot: a man with no lot is named, a man with one is not
  await p.evaluate(() => { const d = [...document.querySelectorAll('button')].find(x => /^SIAP/i.test((x.innerText || '').trim())); if (d) d.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const x = document.querySelector('#wk-check'); if (x) x.click(); });
  await p.waitForTimeout(900);
  const prob = await p.evaluate(() => { const sh = document.querySelector('.sheet,[role="dialog"]'); return sh ? sh.innerText.replace(/\s+/g, ' ') : ''; });
  check('the save reads the chip: the man with a lot is not asked for one', /tekan petak/.test(prob) && !/Pekerja Contoh 2\b/.test(prob.split('tekan petak untuk')[1] || ''), prob.slice(0, 160));
  check('no page errors in Kerja', errs.length === 0, errs.join(' | '));

  await p.evaluate(() => EA.setLang('en')); await p.waitForTimeout(400);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = 'field-harvest/work'; }); await p.waitForTimeout(1300);
  const en = (await chipsOf(p, s.w[5])).map(x => x.text).join(' | ');
  check('an English phone reads English', /on it/.test(en) && /nobody/.test(en) && !/kosong|org/.test(en), en);
  await p.close();

  // ---------- the chit ----------
  const t = await start(b);
  await t.p.evaluate(() => { location.hash = 'field-harvest'; }); await t.p.waitForTimeout(1500);
  const lots = await t.p.evaluate(() => (EA.lists.lotsFor('SSGT', '02') || []).slice(0, 4).map(l => l.lot));
  await t.p.click('#fh-addjob'); await t.p.waitForSelector('#jb-quick');
  await t.p.click('#jb-quick [data-quick="HA"]'); await t.p.selectOption('#jb-block', '02'); await t.p.waitForTimeout(250);
  const before = await t.p.evaluate(() => document.querySelectorAll('#jb-lots .lot-taken').length);
  check('the first job of the day has nothing marked as taken', before === 0, String(before));
  await t.p.click('#jb-lots [data-lot="' + lots[0] + '"]'); await t.p.click('#jb-lots [data-lot="' + lots[1] + '"]');
  await t.p.click('#jb-save'); await t.p.waitForTimeout(500);

  await t.p.click('#fh-addjob'); await t.p.waitForSelector('#jb-quick');
  await t.p.click('#jb-quick [data-quick="HA"]'); await t.p.selectOption('#jb-block', '02'); await t.p.waitForTimeout(250);
  const second = await t.p.evaluate(ls => ls.map(l => { const x = document.querySelector('#jb-lots [data-lot="' + l + '"]');
    return { lot: l, taken: x.classList.contains('lot-taken'), text: x.innerText.replace(/\s+/g, ' ').trim(), disabled: x.disabled }; }), lots);
  check('a second harvest job in the same block sees the first job\'s lots marked',
    second[0].taken && second[1].taken && /kerja lain/.test(second[0].text), JSON.stringify(second.slice(0, 2)));
  check('and the lots nobody has taken are NOT marked', !second[2].taken && !second[3].taken, JSON.stringify(second.slice(2)));
  check('a taken lot can still be picked — marked, never hidden', !second[0].disabled, 'not disabled');
  await t.p.selectOption('#jb-block', '03'); await t.p.waitForTimeout(250);
  check('another block is not touched by it', (await t.p.evaluate(() => document.querySelectorAll('#jb-lots .lot-taken').length)) === 0, 'blok 03');
  check('no page errors on the chit', t.errs.length === 0, t.errs.join(' | '));
  await b.close();

  // ---------- the source ----------
  const wk = fs.readFileSync(path.join(root, 'rooms', 'field', 'work.js'), 'utf8');
  const ms = fs.readFileSync(path.join(root, 'rooms', 'field', 'muster.js'), 'utf8');
  check('the job being edited does not count against itself', /if \(j\.key === lotPicks\.editKey \|\| j\.task !== code \|\| j\.block !== block\) return;/.test(ms), 'editKey');
  check('the chip handler writes the same field the dropdown wrote', /l\.lot = l\.lot === b\.dataset\.pickLot \? '' : b\.dataset\.pickLot;/.test(wk), 'l.lot');
  const v = fs.readFileSync(path.join(root, 'core', 'version.js'), 'utf8');
  check('version 1.88 (136) or later', Number((v.match(/EA\.VERSION = (\d+)/) || [])[1]) >= 136 && /EA\.RELEASE = '1\.\d+'/.test(v), 'version');
})();
