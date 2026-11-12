// E-Book test (1.58) The manager's three buttons, on the phone (Yu Chen, 12 Nov 2026 "ok"; Brief_Amaran 0.9).
// The Pengurus taps a line that is his and answers with SELESAI, AKAN SELESAI PADA or PERLU BANTUAN IBU PEJABAT;
// HQ presses DIURUSKAN; HQ's follow-up list shows the Pengurus's answer. Made-up people only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const NEED = [['Lori / pengangkutan', 'Lorry / transport'], ['Alat ganti / jentera', 'Spare part / machine'], ['Pekerja', 'Workers'], ['Lain-lain', 'Other']];
const MG = () => [{ id: 'MG:RP:2026-11-10', p: 1, ic: '!', bm: 'Kini tanggungjawab anda: Ramp penuh · ~20.0 tan', en: 'Now yours: Ramp full', sub: 'Staf Contoh · Staf belum jawab', go: 'mgr', ref: 'RP:2026-11-10', mst: 'new', need: NEED, days: 3, fix: 'Panggil lori hari ini: cukup untuk 2 lori penuh' }];
(async () => {
  const b = await chromium.launch();
  async function session(user, items, answer) {
    const cx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' });
    const p = await cx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const sent = [];
    await p.route('https://script.google.com/**', rt => {
      const bd = JSON.parse(rt.request().postData() || '{}');
      const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
      let o = { ok: true, sw };
      if (bd.action === 'login') o = { ok: true, user, sw };
      else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items };
      else if (bd.action === 'late') o = { ok: true, at: '2026-11-12 17:30', today: '2026-11-12', estates: [] };
      else if (bd.action === 'mgrAnswer' || bd.action === 'helpDone') { sent.push(bd); o = answer(bd); }
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    });
    await p.clock.install({ time: new Date('2026-11-12T17:30:00+08:00') });   // Thursday
    await p.goto('http://localhost:8765/index.html');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P21')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
    await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(1200);
    return { p, cx, errs, sent };
  }
  const MGR = { code: 'MGR-SSGT-01', name: 'Pengurus Contoh', role: 'Manager', estates: ['SSGT'] };
  const open = p => p.evaluate(() => !document.getElementById('sheet-back').hidden);
  const tapLine = async p => { await p.click('#todo button.td-it'); await p.waitForTimeout(200); };

  // ---------- SELESAI is checked ----------
  let items = MG(), s = await session(MGR, items, bd => bd.mode === 'done' ? { ok: false, error: 'not_done', what: 'Ramp penuh · ~20.0 tan · 1000 tandan' } : { ok: true, estate: 'SSGT', items }), p = s.p;
  check('the Pengurus is not asked by a sheet; his line is on Perlu tindakan', !(await open(p)) && /Kini tanggungjawab anda: Ramp penuh/.test(await p.textContent('#todo')) && /Staf belum jawab/.test(await p.textContent('#todo')));
  await tapLine(p);
  check('a tap opens the three buttons, with the line, the staff\'s answer and how to fix', await open(p) && /Ramp penuh · ~20.0 tan/.test(await p.textContent('#sheet')) && /Cara selesai: Panggil lori/.test(await p.textContent('#sheet')) && (await p.$$('.mg-3 button')).length === 3 && /SELESAI/.test(await p.textContent('#mg-done')) && /AKAN SELESAI PADA/.test(await p.textContent('#mg-by')) && /PERLU BANTUAN IBU PEJABAT/.test(await p.textContent('#mg-help')), await p.textContent('#sheet'));
  await p.click('#mg-done'); await p.waitForTimeout(300);
  check('SELESAI asks the office; not done: the sheet stays and says what is left', s.sent[0].mode === 'done' && s.sent[0].ref === 'RP:2026-11-10' && await open(p) && /Belum selesai: Ramp penuh · ~20.0 tan · 1000 tandan/.test(await p.textContent('#mg-err')), await p.textContent('#mg-err'));

  // ---------- AKAN SELESAI PADA ----------
  await p.click('#mg-by');
  const dl = await p.$$eval('.mg-days button', a => a.map(x => x.dataset.d + '=' + x.textContent).join('|'));
  check('three dates are offered: tomorrow to 3 days ahead', dl === '2026-11-13=Jum 13/11|2026-11-14=Sab 14/11|2026-11-15=Aha 15/11', dl);
  await p.click('#mg-send'); await p.waitForTimeout(100);
  check('no date: not sent', s.sent.length === 1 && /Pilih tarikh/.test(await p.textContent('#mg-err')));
  await p.click('.mg-days button[data-d="2026-11-14"]'); await p.fill('#mg-why', 'ab'); await p.click('#mg-send'); await p.waitForTimeout(100);
  check('a reason under 3 letters: not sent', s.sent.length === 1 && /sekurang-kurangnya 3/.test(await p.textContent('#mg-err')));
  items[0].p = 3; items[0].bm = 'Dalam tindakan anda: Ramp penuh · ~20.0 tan'; items[0].sub = 'Staf Contoh · Staf belum jawab · Anda: akan selesai 14/11 · Lori Sabtu pagi';
  await p.fill('#mg-why', 'Lori Sabtu pagi'); await p.click('#mg-send'); await p.waitForTimeout(400);
  check('date and reason are sent; the sheet closes and the line turns "Dalam tindakan anda"', s.sent[1].mode === 'by' && s.sent[1].date === '2026-11-14' && s.sent[1].why === 'Lori Sabtu pagi' && !(await open(p)) && /Dalam tindakan anda: Ramp penuh/.test(await p.textContent('#todo')) && /Anda: akan selesai 14\/11/.test(await p.textContent('#todo')), JSON.stringify(s.sent[1]));
  check('no page errors (manager)', s.errs.length === 0, s.errs.join(' | '));
  await s.cx.close();

  // ---------- PERLU BANTUAN IBU PEJABAT ----------
  items = MG(); s = await session(MGR, items, bd => ({ ok: true, estate: 'SSGT', items })); p = s.p;
  await tapLine(p); await p.click('#mg-help');
  check('help shows the four needs from the office', (await p.$$eval('.mg-need button', a => a.map(x => x.textContent).join('|'))) === 'Lori / pengangkutan|Alat ganti / jentera|Pekerja|Lain-lain');
  await p.fill('#mg-why', 'Perlu lori tambahan esok'); await p.click('#mg-send'); await p.waitForTimeout(100);
  check('no need chosen: not sent', s.sent.length === 0 && /Pilih apa yang anda perlu/.test(await p.textContent('#mg-err')));
  await p.click('.mg-need button[data-k="0"]'); await p.click('#mg-send'); await p.waitForTimeout(400);
  check('the need and the words are sent; the sheet closes', s.sent[0].mode === 'help' && s.sent[0].need === 0 && s.sent[0].why === 'Perlu lori tambahan esok' && !(await open(p)), JSON.stringify(s.sent[0]));
  await s.cx.close();

  // ---------- SELESAI when the work is done ----------
  items = MG(); s = await session(MGR, items, bd => ({ ok: true, estate: 'SSGT', items: [], done: 'done' })); p = s.p;
  await tapLine(p); await p.click('#mg-done'); await p.waitForTimeout(400);
  check('SELESAI with the work done: the line is gone', !(await open(p)) && !/Ramp penuh/.test(await p.textContent('#todo')), await p.textContent('#todo'));
  await s.cx.close();

  // ---------- HQ: DIURUSKAN ----------
  const hp = [{ id: 'HP:MA-1', p: 1, ic: 'IP', bm: 'Pengurus minta bantuan: Lori / pengangkutan', en: 'The manager asks for help: Lori / pengangkutan', sub: 'Ramp penuh · ~20.0 tan · "Perlu lori tambahan esok" · Pengurus Contoh 12/11', go: 'help', ref: 'MA-1' }];
  s = await session({ code: 'HQ-SDK-02', name: 'Wawa Contoh', role: 'HQ', estates: ['SSGT'] }, hp, bd => ({ ok: true, estate: 'SSGT', items: [], done: 'help' })); p = s.p;
  check('HQ sees the request on Perlu tindakan', /Pengurus minta bantuan: Lori \/ pengangkutan/.test(await p.textContent('#todo')));
  await tapLine(p);
  await p.click('#hp-ok'); await p.waitForTimeout(100);
  check('DIURUSKAN needs a note', s.sent.length === 0 && /Tulis apa yang sudah diuruskan/.test(await p.textContent('#hp-err')));
  await p.fill('#hp-note', 'Lori Boustead esok 8 pagi'); await p.click('#hp-ok'); await p.waitForTimeout(400);
  check('the note is sent and the request leaves the list', s.sent[0].action === 'helpDone' && s.sent[0].ref === 'MA-1' && s.sent[0].note === 'Lori Boustead esok 8 pagi' && !/Pengurus minta bantuan/.test(await p.textContent('#todo')), JSON.stringify(s.sent[0]));
  check('no page errors (HQ)', s.errs.length === 0, s.errs.join(' | '));

  // ---------- HQ's follow-up list and the estate message ----------
  const d = { today: '2026-11-12', at: '2026-11-12 17:30', estates: [{ estate: 'SSGT', manager: 'Pengurus Contoh', withManager: true, board: { chit: 'ok', close: 'no', ticket: 'ok', fruit: 'no' }, items: [
    { id: 'RP:1', kind: 'RP', who: 'Staf Contoh', bm: 'Ramp penuh · ~20.0 tan', sub: '', fix: 'Panggil lori', st: 'new', ans: '', mg: true, mst: 'doing', mans: 'akan selesai 14/11 · Lori Sabtu pagi' },
    { id: 'TH:1', kind: 'TH', who: 'Staf Contoh', bm: 'Hari 11/11 belum ditutup', sub: 'Semalam', fix: 'Buka E-Book', st: 'new', ans: '', mg: true, mst: 'new', mans: '' },
    { id: 'CH:1', kind: 'CH', who: 'Staf Contoh', bm: 'Chit muster hari ini belum dibuat', sub: '', fix: 'Buat chit', st: '', ans: '', mg: false, mst: '', mans: '' }] }] };
  const txt = await p.evaluate(d => EA.lateText(d.estates[0], d, { role: 'HQ', name: 'Wawa Contoh' }), d), L = txt.split('\n');
  check('estate message: a line that is the Pengurus\'s says what he answered, or "belum jawab"', /^Pengurus: akan selesai 14\/11 · Lori Sabtu pagi$/m.test(txt) && /^Pengurus: belum jawab$/m.test(txt) && (txt.match(/^Pengurus: /gm) || []).length === 2, txt);
  check('message lines still never start with a space, a number, a dash or a bullet', L.every(l => !/^(\s|\d|-|•|\*\s)/.test(l)));
  await s.cx.close();
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
