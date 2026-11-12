// E-Book test (1.57) The app asks first, on the phone (Yu Chen, 12 Nov 2026 "ok"; Brief_Amaran 0.7 step 1). At the
// first opening of the day the Staff (and the Clerk) are asked about each late line: what happened, and by when
// (two taps). Answered lines show Dalam tindakan; HQ's follow-up list shows the answer. Made-up people only.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const ASK_TH = [['Belum sempat', 'No time yet'], ['Kerja belum lengkap', 'The work is not complete'], ['Lain-lain', 'Other']];
const ASK_RP = [['Lori belum datang', 'The lorry has not come'], ['Lori rosak', 'The lorry broke down'], ['Lain-lain', 'Other']];
const ITEMS = () => [
  { id: 'RP:2026-11-10', p: 1, ic: 'LR', bm: 'Ramp penuh · ~20.0 tan · panggil lori', en: 'Ramp full · call the lorry', sub: '1000 tandan · ~20.0 tan (Blk 04 1000)', go: '#field-harvest/collect', ask: ASK_RP, st: 'new' },
  { id: 'TH:2026-11-11', p: 1, ic: 'TH', bm: 'Hari 11/11 belum ditutup · TUTUP HARI', en: 'Day 11/11 not closed', sub: 'Semalam', go: '#field-harvest/close', ask: ASK_TH, st: 'new' },
  { id: 'RL:01', p: 2, ic: 'TU', bm: 'Pusingan tuai lewat · Blok 01', en: 'Harvest round late · Block 01', sub: 'petak 1-1 (16 hari)', go: '#field-harvest/work' }];
(async () => {
  const b = await chromium.launch();
  async function session(user, items, time, opt) {
    opt = opt || {};
    const cx = opt.cx || await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' });
    const p = await cx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const asked = [], sent = [];
    await p.route('https://script.google.com/**', rt => {
      const bd = JSON.parse(rt.request().postData() || '{}'); asked.push(bd.action);
      const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
      let o = { ok: true, sw };
      if (bd.action === 'login') o = { ok: true, user, sw };
      else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items };
      else if (bd.action === 'lateAnswer') {
        sent.push(bd);
        if (opt.fail) o = { ok: false, error: 'busy' };
        else { const i = items.filter(x => x.id === bd.ref)[0]; i.st = 'doing'; i.ans = { why: bd.why, due: bd.by === 'pm0' ? '2026-11-12 17:00' : bd.by === 'am1' ? '2026-11-13 10:00' : '2026-11-13 17:00', n: 1 }; o = { ok: true, estate: 'SSGT', items, done: 'answer' }; }
      }
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    });
    await p.clock.install({ time: new Date(time) });
    await p.goto('http://localhost:8765/index.html');
    if (!opt.cx) await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P21')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
    await p.reload(); await p.waitForTimeout(300); if (await p.isVisible('#key')) await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
    await p.waitForTimeout(1200);
    return { p, cx, errs, asked, sent };
  }
  const STAFF = { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] };
  const sheetOpen = p => p.evaluate(() => !document.getElementById('sheet-back').hidden);

  // ---------- the Staff, 07:00: asked before anything else ----------
  let items = ITEMS(), s = await session(STAFF, items, '2026-11-12T07:00:00+08:00'), p = s.p;
  check('first opening of the day: the sheet opens by itself, line 1 of 2', await sheetOpen(p) && /Sebelum mula · 1 \/ 2/.test(await p.textContent('#sheet-title')), await p.textContent('#sheet'));
  check('it shows the line, the reasons from the office and three times', /Ramp penuh/.test(await p.textContent('#sheet')) && (await p.$$('.aq-why button')).length === 3 && (await p.$$eval('.aq-by button', a => a.map(x => x.textContent).join('|'))) === 'Petang ini|Esok pagi|Esok petang');
  check('‹ BALIK is at the top; a fix-now button leads the questions', !!(await p.$('#sheet-x')) && /SELESAIKAN SEKARANG/.test(await p.textContent('#aq-fix')));
  await p.click('.aq-by button[data-b="am1"]'); await p.waitForTimeout(100);
  check('a time without a reason is not sent', s.sent.length === 0 && /Pilih apa berlaku/.test(await p.textContent('#aq-err')));
  await p.click('.aq-why button[data-n="1"]'); await p.click('.aq-by button[data-b="am1"]'); await p.waitForTimeout(400);
  check('two taps send the answer: the line, the reason, the time', s.sent.length === 1 && s.sent[0].ref === 'RP:2026-11-10' && s.sent[0].why === 'Lori rosak' && s.sent[0].by === 'am1' && s.sent[0].estate === 'SSGT', JSON.stringify(s.sent[0]));
  check('it moves to line 2 of 2, with KUNCI HARI SEKARANG', /Sebelum mula · 2 \/ 2/.test(await p.textContent('#sheet-title')) && /Hari 11\/11 belum ditutup/.test(await p.textContent('#sheet')) && /KUNCI HARI SEKARANG/.test(await p.textContent('#aq-fix')));
  await p.click('.aq-why button[data-n="2"]');
  check('Lain-lain opens a box to write the reason', await p.isVisible('#aq-other'));
  await p.fill('#aq-other', 'ab'); await p.click('.aq-by button[data-b="pm0"]'); await p.waitForTimeout(100);
  check('a reason under 3 letters is not sent', s.sent.length === 1 && /sekurang-kurangnya 3/.test(await p.textContent('#aq-err')));
  await p.fill('#aq-other', 'Menunggu kira tandan Blk 04'); await p.click('.aq-by button[data-b="pm0"]'); await p.waitForTimeout(500);
  check('the written reason is sent, and the sheet closes after the last line', s.sent.length === 2 && s.sent[1].why === 'Menunggu kira tandan Blk 04' && s.sent[1].by === 'pm0' && !(await sheetOpen(p)), JSON.stringify(s.sent[1]));
  const card = await p.textContent('#todo');
  check('Perlu tindakan keeps both lines, now Dalam tindakan with the reason and the promise', /Dalam tindakan · Lori rosak · janji 13\/11 pagi/.test(card) && /Dalam tindakan · Menunggu kira tandan Blk 04 · janji 12\/11 petang/.test(card) && !(await p.$('#td-ans')), card);
  check('a line that is not late work shows no state', !/Pusingan tuai lewat[^]*?(Baru|Dalam tindakan)[^]*?$/.test((await p.$$eval('#todo .td-it', a => a.filter(x => /Pusingan/.test(x.textContent)).map(x => x.textContent)))[0] || ''));
  check('no page errors (staff)', s.errs.length === 0, s.errs.join(' | '));

  // ---------- once a day; ‹ BALIK; JAWAB from the list ----------
  items = ITEMS(); s = await session(STAFF, items, '2026-11-12T07:00:00+08:00'); p = s.p;
  await p.click('#sheet-x'); await p.waitForTimeout(200);
  check('‹ BALIK leaves the questions: nothing is sent and work is not held', !(await sheetOpen(p)) && s.sent.length === 0);
  check('the lines show "Baru · belum dijawab" and the list offers JAWAB · 2', (await p.textContent('#todo')).split('Baru · belum dijawab').length === 3 && /JAWAB · 2/.test(await p.textContent('#td-ans')), await p.textContent('#todo'));
  const s2 = await session(STAFF, items, '2026-11-12T09:00:00+08:00', { cx: s.cx });
  check('opened again the same day: not asked by itself a second time', !(await sheetOpen(s2.p)));
  await s2.p.click('#td-ans'); await s2.p.waitForTimeout(200);
  check('JAWAB on the list opens the questions', await sheetOpen(s2.p) && /Sebelum mula · 1 \/ 2/.test(await s2.p.textContent('#sheet-title')));
  await s2.p.click('#aq-fix'); await s2.p.waitForTimeout(300);
  check('the fix-now button goes to the screen that fixes it', /field-harvest\/collect/.test(await s2.p.evaluate(() => location.hash)), await s2.p.evaluate(() => location.hash));
  const s3 = await session(STAFF, items, '2026-11-13T07:00:00+08:00', { cx: s.cx });
  for (let n = 0; n < 20 && !(await sheetOpen(s3.p)); n++) await s3.p.waitForTimeout(250);
  check('the next day it asks again by itself', await sheetOpen(s3.p), JSON.stringify({ asked: s3.asked, hash: await s3.p.evaluate(() => location.hash), mark: await s3.p.evaluate(() => localStorage.getItem('ea.asked')), today: await s3.p.evaluate(() => EA.today()), key: await s3.p.isVisible('#key') }));
  await s.cx.close();

  // ---------- afternoon, a missed promise, and the office busy ----------
  items = ITEMS(); items[0].st = 'missed'; items[0].ans = { why: 'Lori rosak', due: '2026-11-12 10:00', n: 1 }; items.splice(1, 1);
  s = await session(STAFF, items, '2026-11-12T15:30:00+08:00', { fail: true }); p = s.p;
  check('a missed promise is asked again and says so', await sheetOpen(p) && /Janji anda \(12\/11 pagi\) sudah lepas/.test(await p.textContent('#sheet')), await p.textContent('#sheet'));
  check('from 3:00 petang "Petang ini" is not offered', (await p.$$eval('.aq-by button', a => a.map(x => x.textContent).join('|'))) === 'Esok pagi|Esok petang');
  await p.click('.aq-why button[data-n="0"]'); await p.click('.aq-by button[data-b="am1"]'); await p.waitForTimeout(400);
  check('the office is busy: the sheet stays, says not sent, and the time can be tapped again', await sheetOpen(p) && /Tidak dihantar/.test(await p.textContent('#aq-err')) && (await p.$$('.aq-by button.on')).length === 0);
  await p.click('#sheet-x'); await p.waitForTimeout(150);
  check('the list says "Janji terlepas · jawab semula"', /Janji terlepas · jawab semula/.test(await p.textContent('#todo')));
  await s.cx.close();

  // ---------- who is asked ----------
  const dn = [{ id: 'DN:T2', p: 1, ic: '!', bm: 'LEWAT: tiket DN 8002 belum dikunci', en: 'LATE', sub: 'Lori 09/11', go: '#field-harvest/ticket', ask: [['Pemandu belum hantar gambar', 'x'], ['Lain-lain', 'Other']], st: 'new' }];
  s = await session({ code: 'CLK-SSGT-01', name: 'Kerani Contoh', role: 'Clerk', estates: ['SSGT'] }, dn, '2026-11-12T10:30:00+08:00');
  check('the Clerk is asked about her late ticket', await sheetOpen(s.p) && /tiket DN 8002/.test(await s.p.textContent('#sheet')));
  await s.cx.close();
  s = await session({ code: 'MGR-SSGT-01', name: 'Pengurus Contoh', role: 'Manager', estates: ['SSGT'] }, [{ id: 'MJ:RP:2026-11-10', p: 1, ic: '!', bm: 'Janji terlepas: Ramp penuh', en: 'Promise missed', sub: 'Staf jawab: Lori rosak · janji 12/11 pagi', go: '' }], '2026-11-12T10:30:00+08:00');
  check('the Pengurus is never asked; he sees the missed promise on his list', !(await sheetOpen(s.p)) && /Janji terlepas: Ramp penuh/.test(await s.p.textContent('#todo')) && !(await s.p.$('#td-ans')));
  check('no page errors (manager)', s.errs.length === 0, s.errs.join(' | '));
  await s.cx.close();

  // ---------- HQ's follow-up list shows the answers ----------
  const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' })).newPage();
  await p2.goto('http://localhost:8765/index.html');
  const d = { today: '2026-11-12', at: '2026-11-12 10:30', estates: [{ estate: 'SSGT', manager: 'Pengurus Contoh', withManager: false, board: { chit: 'ok', close: 'no', ticket: 'ok', fruit: 'no' }, items: [
    { id: 'RP:1', kind: 'RP', who: 'Staf Contoh', bm: 'Ramp penuh · ~20.0 tan', sub: '1000 tandan', fix: 'Panggil lori hari ini', st: 'doing', ans: 'Lori rosak · janji 13/11 pagi' },
    { id: 'TH:1', kind: 'TH', who: 'Staf Contoh', bm: 'Hari 11/11 belum ditutup', sub: 'Semalam', fix: 'Buka E-Book', st: 'new', ans: '' },
    { id: 'FO:1', kind: 'FO', who: 'Staf Contoh', bm: 'LEBIH TEMPOH', sub: '', fix: 'Angkat', st: 'missed', ans: 'Hujan · janji 12/11 pagi' },
    { id: 'CH:1', kind: 'CH', who: 'Staf Contoh', bm: 'Chit muster hari ini belum dibuat', sub: '', fix: 'Buat chit', st: '', ans: '' }] }] };
  const txt = await p2.evaluate(d => EA.lateText(d.estates[0], d, { role: 'HQ', name: 'Wawa Contoh' }), d), L = txt.split('\n');
  check('estate message: an answered line carries "Jawapan:", an unanswered one "Belum dijawab", a missed one "Janji terlepas:"', /^Jawapan: Lori rosak · janji 13\/11 pagi$/m.test(txt) && /^Belum dijawab$/m.test(txt) && /^Janji terlepas: Hujan · janji 12\/11 pagi$/m.test(txt), txt);
  check('today\'s chit line has no answer line (it is not asked)', L[L.findIndex(l => /Chit muster/.test(l)) + 2] === '', L.slice(L.findIndex(l => /Chit muster/.test(l)), L.findIndex(l => /Chit muster/.test(l)) + 3).join(' | '));
  check('message lines still never start with a space, a number, a dash or a bullet', L.every(l => !/^(\s|\d|-|•|\*\s)/.test(l)));
  await b.close();
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
