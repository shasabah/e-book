// E-Book test (1.61) Rain keyed by every estate from its own gauge (Yu Chen, 15 Nov 2026: "ebook and DMS hold their
// own rainfall. every estate have their own rain gauge… yes 2 reading… option 3"). Two readings a day in four periods:
// the morning chit keys the night (18-24, 00-06), Tutup hari keys the day (06-12, 12-18). No rain is one tap; rain is
// one mm figure as the gauge shows it and a tick for the period — never split by guess. Today's chit cannot be saved
// until the night is answered; the close cannot lock until the day is answered (the morning self-close skips it).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const gs = fs.readFileSync(path.join(root, 'server', 'core.gs'), 'utf8');
const dc = fs.readFileSync(path.join(root, 'rooms', 'field', 'dayclose.js'), 'utf8');
check('office: the day close keeps the day reading (rain_mm, rain_time)', /FH_DAYCLOSE:[\s\S]{0,400}'rain_mm', 'rain_time'\]/.test(gs));
check('office: the chit already keeps the night reading (rain_mm, rain_time)', /FH_CHIT:\s+\['chit', 'rain_mm', 'rain_time'/.test(gs));
check('office: the DMS is read for no estate', /var RAIN_ESTATES = \{\};/.test(gs));
check('phone: the close saves the reading, blank on the morning self-close', /rain_mm: dayRainOk\(d\) \?/.test(dc) && /if \(opts\.auto\) d = Object\.assign\(\{\}, d, \{ autoClose: true \}\)/.test(dc));

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT', 'PTAN'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [],
      rain: { from: 'DMS', date: '2026-11-15', mm: 20, bands: '', note: '' } };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify([{ id: 'W1', name: 'Pekerja Contoh Satu', estate: 'SSGT', gang: 'Am · General', sex: 'M' }]));
    localStorage.setItem('ea.people.at', JSON.stringify(Date.now())); });
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForSelector('#fh-addjob'); await p.waitForTimeout(700);

  // the night question on today's chit
  check('chit: "Hujan malam tadi" is the first card, before the jobs', await p.locator('#fh-rainq').count() === 1 &&
    await p.evaluate(() => { const r = document.querySelector('#fh-rainq'), j = document.querySelector('#fh-addjob'); return !!(r.compareDocumentPosition(j) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  check('chit: no DMS line any more, even when the office sends one', await p.locator('#fh-rain').count() === 0);
  await p.click('#fh-check'); await p.waitForTimeout(250);
  const msg = await p.innerText('#sheet').catch(() => '');
  check('chit: cannot save before the rain is answered', /Jawab hujan malam tadi|Answer last night/.test(msg), msg.replace(/\n/g, ' | ').slice(0, 200));
  await p.evaluate(() => { const b = document.querySelector('#pb-ok'); if (b) b.click(); });
  await p.click('#fh-rain-yes'); await p.waitForTimeout(150);
  check('chit: IT RAINED asks the mm and the two night periods', await p.locator('#fh-rain-mm').count() === 1 && await p.locator('[data-rp]').count() === 2);
  await p.fill('#fh-rain-mm', '8,5'); await p.click('[data-rp="18-24"]'); await p.waitForTimeout(150);
  let dr = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('chit: 8,5 is kept as 8.5 mm, period 18-24', dr.rain_mm === '8.5' && dr.rain_time === '18-24', dr.rain_mm + ' / ' + dr.rain_time);
  await p.click('[data-rp="00-06"]'); await p.waitForTimeout(120);
  dr = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('chit: both periods ticked, kept in order', dr.rain_time === '18-24 00-06', dr.rain_time);
  await p.click('#fh-rain-no'); await p.waitForTimeout(150);
  dr = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('chit: NO RAIN is one tap — 0 mm, no period, card done', dr.rain_mm === '0' && dr.rain_time === '' && await p.locator('#fh-rainq.done').count() === 1 && await p.locator('#fh-rain-mm').count() === 0);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v75-rain.png' });

  // the WhatsApp chit
  const T = (o) => p.evaluate((o) => EA.roomViews['field-harvest'].chitText(Object.assign({ estate: 'SSGT', rows: [], jobs: [], alerts: [], backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 } } }, o)), o);
  let t = await T({ date: '2026-11-16', rain_mm: '8', rain_time: '18-24' });
  check('WhatsApp: "Hujan malam tadi: 8 mm (6 ptg–12 mlm)"', /Hujan malam tadi: 8 mm \(6 ptg–12 mlm\)/.test(t), t.split('\n').filter(l => /Hujan/.test(l)).join(' | '));
  t = await T({ date: '2026-11-16', rain_mm: '0', rain_time: '' });
  check('WhatsApp: no rain says "tiada"', /Hujan malam tadi: tiada/.test(t));
  t = await T({ date: '2026-11-16', rain_mm: '', rain_time: '' });
  check('WhatsApp: a chit with no reading (a plan, an old chit) has no rain line', !/Hujan/.test(t));
  // yesterday's close holds the day reading → the whole day is added up, day + the night after
  await p.evaluate(() => localStorage.setItem('fh.dayclose', JSON.stringify([{ id: 'X1', estate: 'SSGT', date: '2026-11-15', chit: 'C1', rainMm: '5', rainTime: '12-18' }])));
  t = await T({ date: '2026-11-16', rain_mm: '8', rain_time: '18-24' });
  check('WhatsApp: yesterday added up — "13 mm (siang 5 · malam 8)"', /Hujan [A-Za-z]+ 15\/11: 13 mm \(siang 5 · malam 8\)/.test(t), t.split('\n').filter(l => /Hujan/.test(l)).join(' | '));
  // no close on Sunday: Monday's reading covers since Saturday 6 pm
  await p.evaluate(() => localStorage.setItem('fh.dayclose', JSON.stringify([{ id: 'X2', estate: 'SSGT', date: '2026-11-21', chit: 'C2', rainMm: '0', rainTime: '' }])));
  t = await T({ date: '2026-11-23', rain_mm: '30', rain_time: '18-24 00-06' });
  check('WhatsApp: after a day off, "Hujan sejak <Sabtu> 21/11 6 ptg"', /Hujan sejak [A-Za-z]+ 21\/11 6 ptg: 30 mm \(6 ptg–12 mlm · 12 mlm–6 pg\)/.test(t) && !/siang/.test(t), t.split('\n').filter(l => /Hujan/.test(l)).join(' | '));
  t = await T({ date: '2026-11-16', estate: 'PTAN', rain_mm: '8', rain_time: '18-24' });
  check('WhatsApp: another estate never borrows Sugut\'s day reading', /Hujan malam tadi: 8 mm/.test(t) && !/siang/.test(t));

  // the day reading at Tutup hari
  const ck = await p.evaluate(() => {
    const c = { chit: 'C9', date: EA.today(), estate: 'SSGT', rows: [] };
    const f = d => (EA.fh.dayclose.checks('SSGT', c, d).find(x => x.n === 8) || null);
    return { none: f({}), dry: f({ rainMm: '0' }), wet: f({ rainMm: '12', rainTime: '06-12' }), wetNoTime: f({ rainMm: '12', rainTime: '' }), auto: f({ autoClose: true }) };
  });
  check('close: day rain not answered is a red check that sends back to the close', ck.none && ck.none.ok === false && ck.none.go === '#field-harvest/close', JSON.stringify(ck.none));
  check('close: NO RAIN passes, "Hujan siang: tiada"', ck.dry && ck.dry.ok && ck.dry.bm === 'Hujan siang: tiada', JSON.stringify(ck.dry));
  check('close: 12 mm with its period passes, "12 mm (6 pg–12 tgh)"', ck.wet && ck.wet.ok && /12 mm \(6 pg–12 tgh\)/.test(ck.wet.bm), JSON.stringify(ck.wet));
  check('close: mm without a period is not enough', ck.wetNoTime && ck.wetNoTime.ok === false);
  check('close: the morning self-close does not ask (no reading is "tiada bacaan")', ck.auto === null);
  const sum = await p.evaluate(() => {
    const base = { estate: 'SSGT', date: '2026-11-16', chit: 'C1', present: 23, total: 25, bunches: 612, lorries: 1, jobsDone: 7, jobs: 8, at: '17:30', byName: 'Staf Contoh' };
    return [EA.fh.dayclose.summaryText(Object.assign({}, base, { rainMm: '12', rainTime: '06-12', rain: 'Hujan — kerja berhenti · ½ hari', rainJobs: ['MAN'] })),
            EA.fh.dayclose.summaryText(Object.assign({}, base, { rainMm: '0', rainTime: '' })),
            EA.fh.dayclose.summaryText(Object.assign({}, base, { rainMm: '' })),
            EA.fh.dayclose.summaryText(Object.assign({}, base))];
  });
  check('TUTUP HARI WhatsApp: the reading, then the work rain stopped', /Hujan siang: 12 mm \(6 pg–12 tgh\)\nKerja terjejas hujan: /.test(sum[0]), sum[0].split('\n').filter(l => /ujan/.test(l)).join(' | '));
  check('TUTUP HARI WhatsApp: "Hujan siang: tiada" / "tiada bacaan"', /Hujan siang: tiada\n/.test(sum[1]) && /Hujan siang: tiada bacaan/.test(sum[2]));
  check('TUTUP HARI WhatsApp: an old close (before 1.61) reads as before', /Hujan: tiada/.test(sum[3]) && !/Hujan siang/.test(sum[3]));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
