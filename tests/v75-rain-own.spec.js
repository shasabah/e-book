// E-Book test (1.61) Rain keyed by every estate from its own gauge (Yu Chen, 15 Nov 2026: "ebook and DMS hold their
// own rainfall. every estate have their own rain gauge… yes 2 reading… option 3"). Two readings a day in four periods:
// the morning chit keys the night (18-24, 00-06), Tutup hari keys the day (06-12, 12-18). No rain is one tap; rain is
// one mm figure as the gauge shows it and a tick for the period — never split by guess. Today's chit cannot be saved
// until the night is answered; the close cannot lock until the day is answered (the morning self-close skips it).
// 1.88 (Brief_Hujan 0.2 sections 2–5; Brief_Tutup_Hari_Baru section 3, signed 23 Nov 2026): ONE reading a day, at the
// morning chit, for the whole of yesterday, named by its day; four periods in the paper form's order, each with an
// optional start and stop; rain_time begins "hari=<the day the rain fell>". The close no longer asks the rain.
// Readings keyed before 1.88 (night on the chit, day on the close) still read back exactly as before.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const gs = fs.readFileSync(path.join(root, 'server', 'core.gs'), 'utf8');
const dc = fs.readFileSync(path.join(root, 'rooms', 'field', 'dayclose.js'), 'utf8');
check('office: the day close keeps the day reading (rain_mm, rain_time)', /FH_DAYCLOSE:[\s\S]{0,400}'rain_mm', 'rain_time'\]/.test(gs));
check('office: the chit already keeps the night reading (rain_mm, rain_time)', /FH_CHIT:\s+\['chit', 'rain_mm', 'rain_time'/.test(gs));
check('office: the DMS is read for no estate', /var RAIN_ESTATES = \{\};/.test(gs));
check('phone (1.88): the close sends no gauge reading — rain_mm and rain_time go empty', /rain_mm: '', rain_time: ''/.test(dc) && !/rainDayCard\(/.test(dc));

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
  const Y = await p.evaluate(() => { const d = new Date(EA.today() + 'T00:00:00'); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  check('chit: the card asks "Hujan semalam" and names the day', /Hujan semalam · \S+ \d+ \S+/.test(await p.innerText('#fh-rainq')), (await p.innerText('#fh-rainq')).slice(0, 80));
  check('chit: cannot save before the rain is answered, and the message names yesterday', /Jawab hujan semalam \(\S+ \d+ \S+\)|Answer yesterday/.test(msg), msg.replace(/\n/g, ' | ').slice(0, 200));
  await p.evaluate(() => { const b = document.querySelector('#pb-ok'); if (b) b.click(); });
  await p.click('#fh-rain-yes'); await p.waitForTimeout(150);
  check('chit: IT RAINED asks the mm and the four periods of the paper form', await p.locator('#fh-rain-mm').count() === 1 && await p.locator('[data-rp]').count() === 4 &&
    (await p.$$eval('[data-rp]', bs => bs.map(b => b.dataset.rp).join(' '))) === '00-06 06-12 12-18 18-24');
  await p.fill('#fh-rain-mm', '8,5'); await p.click('[data-rp="18-24"]'); await p.waitForTimeout(150);
  let dr = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('chit: 8,5 is kept as 8.5 mm, period 18-24, the day the rain fell written first', dr.rain_mm === '8.5' && dr.rain_time === 'hari=' + Y + ' 18-24', dr.rain_mm + ' / ' + dr.rain_time);
  await p.click('[data-rp="00-06"]'); await p.waitForTimeout(120);
  dr = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('chit: both periods ticked, kept in the paper form\'s order', dr.rain_time === 'hari=' + Y + ' 00-06 18-24', dr.rain_time);
  await p.fill('[data-rs="18-24"]', '19:00'); await p.dispatchEvent('[data-rs="18-24"]', 'change');
  await p.fill('[data-re="18-24"]', '20:30'); await p.dispatchEvent('[data-re="18-24"]', 'change'); await p.waitForTimeout(100);
  dr = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('chit: start and stop for a period, optional, kept with it', dr.rain_time === 'hari=' + Y + ' 00-06 18-24@19:00-20:30', dr.rain_time);
  check('chit: the mm is asked once, never per period', await p.locator('#fh-rain-mm').count() === 1);
  await p.click('#fh-rain-save'); await p.waitForTimeout(120);
  check('chit: SIMPAN BACAAN folds the card to one line with UBAH', /8\.5 mm · awal pagi · malam 19:00–20:30/.test(await p.innerText('#fh-rainq')) && await p.locator('#fh-rain-edit').count() === 1, await p.innerText('#fh-rainq'));
  await p.click('#fh-rain-edit'); await p.waitForTimeout(120);
  await p.click('#fh-rain-no'); await p.waitForTimeout(150);
  dr = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT);
  check('chit: NO RAIN is one tap — 0 mm, no period, the day kept, card done', dr.rain_mm === '0' && dr.rain_time === 'hari=' + Y && await p.locator('#fh-rainq.done').count() === 1 && await p.locator('#fh-rain-mm').count() === 0, dr.rain_time);
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v75-rain.png' });

  // the WhatsApp chit
  const T = (o) => p.evaluate((o) => EA.roomViews['field-harvest'].chitText(Object.assign({ estate: 'SSGT', rows: [], jobs: [], alerts: [], backlog: { field: [], fieldTotal: 0, ramp: { bunches: 0 } } }, o)), o);
  let t = await T({ date: '2026-11-16', rain_mm: '8', rain_time: 'hari=2026-11-15 12-18@14:30-15:10 18-24' });
  check('WhatsApp (1.88): "Hujan semalam (Ahad 15/11): 8 mm · petang 14:30–15:10 · malam"', /Hujan semalam \(Ahad 15\/11\): 8 mm · petang 14:30–15:10 · malam/.test(t), t.split('\n').filter(l => /Hujan/.test(l)).join(' | '));
  t = await T({ date: '2026-11-16', rain_mm: '0', rain_time: 'hari=2026-11-15' });
  check('WhatsApp (1.88): no rain — "Hujan semalam (Ahad 15/11): tiada", one line only', /Hujan semalam \(Ahad 15\/11\): tiada/.test(t) && t.split('\n').filter(l => /Hujan/.test(l)).length === 1);
  // Readings keyed before 1.88 read back as they always did:
  t = await T({ date: '2026-11-16', rain_mm: '8', rain_time: '18-24' });
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

  // 1.88: Tutup hari no longer asks the gauge (check 8 is gone, whatever the draft holds)
  const ck = await p.evaluate(() => {
    const c = { chit: 'C9', date: EA.today(), estate: 'SSGT', rows: [] };
    const f = d => (EA.fh.dayclose.checks('SSGT', c, d).find(x => x.n === 8) || null);
    return { none: f({}), dry: f({ rainMm: '0' }), wet: f({ rainMm: '12', rainTime: '06-12' }), auto: f({ autoClose: true }) };
  });
  check('close (1.88): no rain check at all — not with a blank, a dry or a wet draft, nor on the self-close', !ck.none && !ck.dry && !ck.wet && !ck.auto, JSON.stringify(ck));
  const sum = await p.evaluate(() => {
    const base = { estate: 'SSGT', date: '2026-11-16', chit: 'C1', present: 23, total: 25, bunches: 612, lorries: 1, jobsDone: 7, jobs: 8, at: '17:30', byName: 'Staf Contoh' };
    return [EA.fh.dayclose.summaryText(Object.assign({}, base, { rainMm: '12', rainTime: '06-12', rain: 'Hujan — kerja berhenti · ½ hari', rainJobs: ['MAN'] })),
            EA.fh.dayclose.summaryText(Object.assign({}, base, { rainMm: '0', rainTime: '' })),
            EA.fh.dayclose.summaryText(Object.assign({}, base, { rainMm: '' })),
            EA.fh.dayclose.summaryText(Object.assign({}, base)),
            EA.fh.dayclose.summaryText(Object.assign({}, base, { noGauge: true, rain: 'Hujan — kerja berhenti · ½ hari', rainJobs: ['MAN'] })),
            EA.fh.dayclose.summaryText(Object.assign({}, base, { noGauge: true }))];
  });
  check('TUTUP HARI WhatsApp (1.88): a new close carries no gauge line, only the work rain stopped', !/Hujan siang|Hujan: tiada/.test(sum[4]) && /Kerja terjejas hujan: Hujan — kerja berhenti/.test(sum[4]) && !/ujan/.test(sum[5]), sum[4].split('\n').filter(l => /ujan/.test(l)).join(' | '));
  check('TUTUP HARI WhatsApp: the reading, then the work rain stopped', /Hujan siang: 12 mm \(6 pg–12 tgh\)\nKerja terjejas hujan: /.test(sum[0]), sum[0].split('\n').filter(l => /ujan/.test(l)).join(' | '));
  check('TUTUP HARI WhatsApp: "Hujan siang: tiada" / "tiada bacaan"', /Hujan siang: tiada\n/.test(sum[1]) && /Hujan siang: tiada bacaan/.test(sum[2]));
  check('TUTUP HARI WhatsApp: an old close (before 1.61) reads as before', /Hujan: tiada/.test(sum[3]) && !/Hujan siang/.test(sum[3]));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
