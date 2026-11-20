// E-Book test (1.75) a button says its own name, in the phone's language.
//
// Ferezelly, 19 Nov 2026: "Sir ne sistem sy mmg tidak jumpa tu ubah@buang nama siapa yang tidak ada buah
// dan tidak hadir." The button was on his screen the whole time. Two faults kept it hidden.
//
// 1. A button is written EN<small>BM</small> and core/lang.js rewrites it so the phone shows one language.
//    Six buttons were written the other way round, BM<small>a note</small>. lang.js cannot tell, so it read
//    the note as the Bahasa and threw the name away: TUTUP HARI showed as "KUNCI HARI RABU 18 NOV", and on
//    the confirm box the button that CANCELLED read "TUTUP HARI". No day closed at Sugut after 14 Nov.
// 2. Three help sentences in Bahasa told him to press VIEW, CORRECT and + ADD JOB. His phone shows LIHAT,
//    BETULKAN and TAMBAH KERJA.
//
// Made-up names only (Rule 8).
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

// ---------- 1 · live: lang.js turns EN<small>BM</small> into the phone's one word ----------
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');

  // The real markup of the buttons that were wrong, with EA.t resolved for each phone.
  const CASES = [
    ['close: the main button', "TUTUP HARI", "CLOSE THE DAY"],
    ['close: wait a bit', "NANTI", "LATER"],
    ['close: confirm', "YA, TUTUP", "YES, CLOSE"],
    ['chit: correct it', "BETULKAN", "CORRECT"],
    ['chit: look at it', "LIHAT", "VIEW"],
    ['chit: save it', "SIMPAN CHIT", "SAVE CHIT"],
  ];
  async function shows(lang, en, bm) {
    return p.evaluate(async a => {
      EA.setLang(a.lang);
      const host = document.createElement('div');
      document.body.appendChild(host);
      host.innerHTML = '<button type="button" class="btn">' + a.en + '<small>' + a.bm + '</small></button>';
      await new Promise(r => setTimeout(r, 120));
      const t = host.querySelector('button').innerText.replace(/\s+/g, ' ').trim();
      host.remove();
      return t;
    }, { lang, en, bm });
  }
  for (const [what, bm, en] of CASES) {
    // written the right way round: English first, Bahasa in the small
    const gotBm = await shows('bm', en, bm);
    const gotEn = await shows('en', en, bm);
    check(what + ' — Bahasa phone says ' + bm, gotBm.toUpperCase() === bm.toUpperCase(), 'shows "' + gotBm + '"');
    check(what + ' — English phone says ' + en, gotEn.toUpperCase() === en.toUpperCase(), 'shows "' + gotEn + '"');
  }
  // The fault itself: written the wrong way round, the note wins and the name is lost.
  const wrong = await shows('bm', 'TUTUP HARI', 'Kunci hari Rabu 18 Nov');
  check('a Bahasa-first button really does lose its name (why the rule below exists)',
    /KUNCI HARI/i.test(wrong), 'shows "' + wrong + '"');
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();

  // ---------- 2 · static: no button is written Bahasa-first ----------
  const BM_ONLY = /\b(TUTUP|HARI|NANTI|KUNCI|SAHKAN|LENGKAPKAN|BETULKAN|SIMPAN|TAMBAH|BUANG|LIHAT|SALIN|BATAL|TOLAK|LULUS|PINDAH|HANTAR|MUAT|KELUAR|TUKAR|SELESAI|BIASA|SEDIA|JAWAB|BUKA|ISI|UBAH|RANCANG)\b/;
  const btn = /<(button|a)\b[^>]*class="[^"]*\b(?:btn|back-btn)\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/g;
  const bad = [];
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p2 = path.join(dir, f);
      const st = fs.statSync(p2);
      if (st.isDirectory()) { if (!/node_modules|\.git|tests|checks/.test(p2)) walk(p2); continue; }
      if (!/\.(js|html)$/.test(f)) continue;
      const s = fs.readFileSync(p2, 'utf8');
      let m;
      while ((m = btn.exec(s))) {
        const body = m[2];
        if (!/<small>/.test(body)) continue;
        // the big part: everything before the first <small>
        let big = body.split('<small>')[0];
        big = big.replace(/^[\s\S]*?\?\s*'/, '');            // a ternary branch
        if (/' \+|\+ '/.test(big)) continue;                  // built in code: EA.t decides, not this rule
        if (BM_ONLY.test(big)) bad.push(path.relative(root, p2) + ': ' + big.trim().slice(0, 44));
      }
    }
  }
  walk(root);
  check('no button is written Bahasa-first (the phone would show the small line instead)',
    bad.length === 0, bad.join(' | '));

  // ---------- 3 · static: a Bahasa sentence never tells the staff to press an English word ----------
  const EN_WORDS = ['ADD JOB', 'NEW CHIT', 'SAVE CHIT', 'CORRECT', 'VIEW', 'SAVE', 'SEND', 'CLOSE', 'PICK', 'EDIT'];
  const bmText = /(?:class="bm">|EA\.t\(\s*')((?:[^'<\\]|\\.)*)/g;
  const named = [];
  function walk2(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p2 = path.join(dir, f);
      const st = fs.statSync(p2);
      if (st.isDirectory()) { if (!/node_modules|\.git|tests|checks/.test(p2)) walk2(p2); continue; }
      if (!/\.(js|html)$/.test(f)) continue;
      const lines = fs.readFileSync(p2, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*)/.test(line)) return;               // a comment may quote the old wording
        let m;
        while ((m = bmText.exec(line))) {
          const s = m[1];
          if (!/[a-z]/.test(s)) continue;                     // an all-caps label, not a sentence
          for (const w of EN_WORDS) {
            if (new RegExp('\\b' + w + '\\b').test(s)) { named.push(path.relative(root, p2) + ':' + (i + 1) + ' [' + w + ']'); break; }
          }
        }
      });
    }
  }
  walk2(root);
  check('no Bahasa sentence tells the staff to press an English button',
    named.length === 0, named.join(' | '));
})();
