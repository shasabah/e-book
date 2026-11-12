// E-Book test (1.56) Susulan harian on the phone (Yu Chen, 12 Nov 2026; Brief_Amaran 0.7): the home card for HQ and
// the Owner, the list with each late line's owner and how to fix it, and the two WhatsApp texts (one message for
// the estate, the board for the group). The estate's own people never see it. Made-up people only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const LATE = { ok: true, at: '2026-11-12 10:30', today: '2026-11-12', estates: [{ estate: 'SSGT', staff: 'Staf Contoh', clerk: 'Kerani Contoh', manager: 'Pengurus Contoh', withManager: false,
  board: { chit: 'ok', close: 'no', ticket: 'no', fruit: 'no' },
  items: [
    { id: 'TH:2026-11-11', kind: 'TH', role: 'Staff', who: 'Staf Contoh', bm: 'Hari 11/11 belum ditutup · TUTUP HARI', en: 'Day 11/11 not closed', sub: 'Semalam', fix: 'Buka E-Book → Kerja → semak, lalu tekan KUNCI HARI' },
    { id: 'FO:2026-11-09', kind: 'FO', role: 'Staff', who: 'Staf Contoh', bm: 'LEBIH TEMPOH: 80 tandan ≈ 1.6 tan masih di ladang', en: 'OVERDUE: 80 bunches still in the field', sub: 'Dituai 09/11 · 3 hari · Blk 01 80', fix: 'Angkat buah ke ramp → E-Book → Ramp → SEMUA KE RAMP' },
    { id: 'DN:T2', kind: 'DN', role: 'Clerk', who: 'Kerani Contoh', bm: 'LEWAT: tiket DN 8002 belum dikunci', en: 'LATE: the ticket for DN 8002 is not keyed', sub: 'Lori 09/11 · BOU · 10 tandan', fix: 'Buka E-Book → Tiket → kunci tiket' }] }] };
(async () => {
  const b = await chromium.launch();
  async function session(user, lateAns) {
    const cx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' });
    const p = await cx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const asked = [];
    await p.addInitScript(() => { window.__shared = []; window.open = (u) => { window.__shared.push(decodeURIComponent(String(u).split('text=')[1] || '')); return null; }; try { delete Navigator.prototype.share; } catch (e) {} });
    await p.route('https://script.google.com/**', rt => {
      const bd = JSON.parse(rt.request().postData() || '{}'); asked.push(bd.action);
      const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
      let o = { ok: true, sw };
      if (bd.action === 'login') o = { ok: true, user, sw };
      else if (bd.action === 'late') o = lateAns;
      else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    });
    await p.clock.install({ time: new Date('2026-11-12T10:31:00+08:00') });
    await p.goto('http://localhost:8765/index.html');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P21')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
    await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
    await p.waitForTimeout(900);
    return { p, cx, errs, asked };
  }

  // ---------- HQ (Wawa) ----------
  let s = await session({ code: 'HQ-SDK-02', name: 'Wawa Contoh', role: 'HQ', estates: ['SSGT', 'MELU'] }, LATE), p = s.p;
  check('HQ: the phone asks the office for the follow-up list', s.asked.indexOf('late') >= 0, s.asked.join(','));
  check('HQ home shows the card with the estate, the day and the time', await p.isVisible('#late .lt') && /Sugut/.test(await p.textContent('#late')) && /10:30/.test(await p.textContent('#lt-h')), await p.textContent('#late'));
  const boxes = await p.$$eval('#late .lt-es .lt-bx', a => a.map(x => x.className.replace('lt-bx ', '') + ':' + x.textContent.trim()));
  check('the four boxes: chit ok, close / ticket / fruit late', boxes.length === 4 && /^ok:Chit/.test(boxes[0]) && boxes.slice(1).every(x => /^no:/.test(x)), boxes.join(' | '));
  check('the card says how many are late and the button carries the count', /3 lewat/.test(await p.textContent('#late .lt-es small')) && /BUKA SENARAI · 3/.test(await p.textContent('#lt-open')), await p.textContent('#lt-open'));
  await p.click('#lt-open'); await p.waitForSelector('.lt-card');
  const its = await p.$$eval('.lt-card .lt-it', a => a.map(x => x.textContent));
  check('the list: one line each, owner first', its.length === 3 && /^Staf Contoh · Hari 11\/11 belum ditutup/.test(its[0]) && /^Kerani Contoh · LEWAT: tiket DN 8002/.test(its[2]), its.join(' || '));
  check('each line says how to fix it', its.every(t => /Cara selesai: /.test(t)) && /KUNCI HARI/.test(its[0]));
  check('before 5:00 petang there is no "now with the manager" band', !(await p.$('.lt-mg')));

  await p.click('.lt-wa'); await p.waitForTimeout(150);
  let txt = (await p.evaluate(() => window.__shared))[0] || '', lines = txt.split('\n');
  check('estate message: head names the estate, the day and the count', /^\*E-Book · SUGUT · Kha 12\/11 · belum selesai \(3\)\*$/.test(lines[0]), lines[0]);
  check('estate message: each item has the owner in bold, the detail and how to fix', /^\*1 · Staf Contoh\* — Hari 11\/11 belum ditutup/m.test(txt) && /^\*3 · Kerani Contoh\* — LEWAT: tiket DN 8002 belum dikunci$/m.test(txt) && (txt.match(/^Cara selesai: /gm) || []).length === 3 && /^Butiran: Lori 09\/11/m.test(txt), txt);
  check('estate message: the ladder, with the manager by name, and YC Lee', /5:00 petang.*\*Pengurus Contoh\*.*YC Lee/.test(txt) && /^Wawa Contoh, bagi pihak YC Lee$/.test(lines[lines.length - 1]), lines.slice(-4).join(' | '));
  check('no line starts with a space, a number, a dash or a bullet (WhatsApp keeps it as written)', lines.every(l => !/^(\s|\d|-|•|\*\s)/.test(l)), lines.filter(l => /^(\s|\d|-|•|\*\s)/.test(l)).join(' | '));
  check('the Owner is never called Yu Chen in a message to staff', !/Yu Chen/.test(txt));

  await p.click('#lt-board'); await p.waitForTimeout(150);
  txt = (await p.evaluate(() => window.__shared))[1] || ''; lines = txt.split('\n');
  check('board: head with day and time, and the key', /^\*E-Book · Papan harian · Kha 12\/11 · 10:30\*$/.test(lines[0]) && /✅ ikut masa · ❌ lewat/.test(lines[1]), lines.slice(0, 2).join(' | '));
  check('board: the estate\'s four marks on one line', /^Chit ✅ · Tutup hari ❌ · Tiket ❌ · Buah keluar ❌$/m.test(txt), txt);
  check('board: who is late, counted by person', /^Lewat 3: Staf Contoh 2, Kerani Contoh 1$/m.test(txt), txt);
  check('board: estates not on E-Book are said plainly', /Ladang lain belum di E-Book/.test(txt));
  check('board: no line starts with a space, a number, a dash or a bullet', lines.every(l => !/^(\s|\d|-|•|\*\s)/.test(l)));
  check('no page errors (HQ)', s.errs.length === 0, s.errs.join(' | '));
  await s.cx.close();

  // ---------- after 5:00 petang, and a clean day ----------
  const late5 = JSON.parse(JSON.stringify(LATE)); late5.estates[0].withManager = true; late5.at = '2026-11-12 17:05';
  s = await session({ code: 'OWN-ALL-01', name: 'Pemilik Contoh', role: 'Owner', estates: ['SSGT', 'MELU'] }, late5); p = s.p;
  check('Owner sees the card too; past 5:00 petang it says who has it now', /kini dengan Pengurus Contoh/.test(await p.textContent('#late')), await p.textContent('#late'));
  const t5 = await p.evaluate(d => EA.lateText(d.estates[0], d, EA.currentUser()), late5);
  check('1.56.1 past 5:00 petang the message says the lines are now the manager\'s, not "at 5:00"', /Sudah lepas 5:00 petang: semua di atas kini tanggungjawab \*Pengurus Contoh\*/.test(t5) && !/Pukul 5:00 petang/.test(t5), t5.split('\n').slice(-3)[0]);
  check('a message sent by the Owner is signed YC Lee', /\nYC Lee$/.test(t5), t5.split('\n').slice(-1)[0]);
  check('board past 5:00 says who has the lines now', /kini dengan Pengurus Contoh/.test(await p.evaluate(d => EA.lateBoard(d), late5)));
  await s.cx.close();
  const clean = JSON.parse(JSON.stringify(LATE)); clean.estates[0].items = []; clean.estates[0].board = { chit: 'ok', close: 'ok', ticket: 'ok', fruit: 'ok' };
  s = await session({ code: 'HQ-SDK-02', name: 'Wawa Contoh', role: 'HQ', estates: ['SSGT'] }, clean); p = s.p;
  check('a clean day: all four ok, "Semua ikut masa", no count on the button', /Semua ikut masa/.test(await p.textContent('#late')) && !/·/.test((await p.textContent('#lt-open')).replace('OPEN LIST', '')), await p.textContent('#lt-open'));
  await p.click('#lt-open'); await p.waitForSelector('.lt-card');
  check('a clean day: no estate message button, the board can still be posted', !(await p.$('.lt-wa')) && !!(await p.$('#lt-board')));
  check('a clean board says "Semua ikut masa."', /\nSemua ikut masa\.\n/.test(await p.evaluate(d => EA.lateBoard(d), clean)));
  await s.cx.close();

  // ---------- the estate's own people ----------
  for (const role of ['Staff', 'Clerk', 'Manager']) {
    s = await session({ code: role + '-SSGT-01', name: role + ' Contoh', role, estates: ['SSGT'] }, LATE);
    check(role + ': no card, and the phone never asks for the list', !(await s.p.isVisible('#late')) && s.asked.indexOf('late') < 0, s.asked.join(','));
    check(role + ': no page errors', s.errs.length === 0, s.errs.join(' | '));
    await s.cx.close();
  }
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
