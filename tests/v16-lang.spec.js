// E-Book test (1.6). One language on the screen: Bahasa by default, English when chosen in Phone setup.
// No "Bahasa · English" pairs left on screen; buttons show one word; the WhatsApp chit keeps both.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
// Malay/English pairs that must never show together on screen
const PAIRS = [/SIMPAN CHIT.{0,3}SAVE CHIT|SAVE CHIT.{0,3}SIMPAN CHIT/i, /Tetapan telefon · Phone setup/, / · Morning chit/, /Dikutip · collected/, /Jumlah ke lori · Total/, /Disemak · Checked/, /Sasaran · Target/, /Tan bulan ini · Month/];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P94'));
    const d = EA.today();
    localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: d, estate: 'SSGT', marks: { 'W-SSGT-001': 'H', 'W-SSGT-010': 'H' }, jobOf: { 'W-SSGT-001': 'j1', 'W-SSGT-010': 'j2' }, rain_mm: '', rain_time: '', checker: '', replacing: '', nextJob: 3, alertNotes: {}, newChit: true,
      jobs: [{ key: 'j1', task: 'HA', block: '03', lots: ['3-30'], mandor: '' }, { key: 'j2', task: 'CPS', block: '01', lots: ['1-1'], mandor: '' }] } }));
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'Y0', date: d, estate: 'SSGT', rec: { lines: [{ id: 'W-1', worker_id: 'W-SSGT-001', task_code: 'HA', block: '03', lot: '3-30', bunches: '100' }], jobs: [] } }]));
  });
  const screens = ['field-harvest', 'field-harvest/work', 'field-harvest/collect', 'field-harvest/ticket'];
  async function sweep(lang, key) {
    await p.evaluate(l => EA.setLang(l), lang); await p.reload(); await p.fill('#key', key); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
    const out = {};
    for (const s of screens) {
      await p.evaluate(h => { location.hash = h; }, s); await p.waitForTimeout(500);
      const txt = (await p.innerText('#room')).replace(/\s+/g, ' ');
      const btns = await p.$$eval('#room button.btn', a => a.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
      out[s] = { txt, btns };
    }
    await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200); await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
    return out;
  }
  const bm = await sweep('bm', '333333');
  const en = await sweep('en', '333333');
  const leaks = [];
  for (const s of screens) PAIRS.forEach(r => { if (r.test(bm[s].txt)) leaks.push('bm ' + s + ' ' + r); if (r.test(en[s].txt)) leaks.push('en ' + s + ' ' + r); });
  check('no Bahasa · English pairs on screen', leaks.length === 0, leaks.join(' | '));
  check('Bahasa: chit button says SIMPAN CHIT', bm['field-harvest'].btns.some(t => /^SIMPAN CHIT$/i.test(t)), bm['field-harvest'].btns.join(' / '));
  check('English: chit button says SAVE CHIT', en['field-harvest'].btns.some(t => /^SAVE CHIT$/i.test(t)), en['field-harvest'].btns.join(' / '));
  check('buttons show one word (no two-line buttons)', [...bm['field-harvest'].btns, ...en['field-harvest/collect'].btns].every(t => !/\n/.test(t)));
  check('Bahasa screen has no "Month to date"', !/Month to date/.test(bm['field-harvest'].txt));
  check('English screen has no "Tan bulan ini"', !/Tan bulan ini/.test(en['field-harvest'].txt));
  check('English day\'s work speaks English', /morning chit/i.test(en['field-harvest/work'].txt) && !/Tiada chit pagi/.test(en['field-harvest/work'].txt), en['field-harvest/work'].txt.slice(0, 200));
  check('Bahasa day\'s work speaks Bahasa', /Tiada chit pagi|chit pagi/i.test(bm['field-harvest/work'].txt) && !/No morning chit/.test(bm['field-harvest/work'].txt), bm['field-harvest/work'].txt.slice(0, 200));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
