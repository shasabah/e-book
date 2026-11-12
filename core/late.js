// Foundation: Susulan harian · Daily follow-up (v1.56). Yu Chen, 12 Nov 2026: "I need Wawa help to chasing for
// report" (Brief_Amaran 0.7; Related_Parties.md). One card on the home screen of HQ and the Owner: for every
// estate where Field & Harvest is open, the four-box board (chit, day closed, ticket, fruit out) and how many
// lines are late. BUKA SENARAI lists each late line with the name of the person who owns it and how to fix it.
// Two buttons write the WhatsApp text: one message for the estate (sent once a day, 10:30 pagi), and the board
// for the group. Nothing is keyed and nothing is saved in the office: the lines are the red ones the estate
// already sees on its own Perlu tindakan, so the two can never disagree. A line goes only when the work is done.
// The estate's own people never see this card.
window.EA = window.EA || {};
(function () {
  var CACHE = 'ea.late', asking = false;
  function esc(s) { return EA.ui.esc(s); }
  function ok(u) { return !!u && (u.role === 'HQ' || u.role === 'Owner'); }
  function cached(u) { var c = EA.local.get(CACHE, null); return c && c.code === u.code ? c : null; }
  function estName(code) { var e = (EA.lists.estates || []).filter(function (x) { return x.code === code; })[0]; return e ? e.name : code; }
  function dayLbl(iso) { var d = new Date(iso + 'T00:00:00'); return EA.ui.dayBm[d.getDay()].slice(0, 3) + ' ' + d.getDate() + '/' + (d.getMonth() + 1); }
  var BOX = [['chit', 'Chit'], ['close', 'Tutup hari'], ['ticket', 'Tiket'], ['fruit', 'Buah keluar']];
  var MARK = { ok: '✅', no: '❌', wait: '⏳', rest: '➖' };

  // The message for one estate. WhatsApp keeps a line as written only when it does not start with a space, a
  // number, a dash or a bullet (27 Oct), so every line starts with a letter or a bold star. The names are bold;
  // each line says how to fix it; the Owner is named YC Lee (his standing wish for messages to staff).
  EA.lateText = function (e, d, u) {
    var L = ['*E-Book · ' + estName(e.estate).toUpperCase() + ' · ' + dayLbl(d.today) + ' · belum selesai (' + e.items.length + ')*', ''];
    e.items.forEach(function (i, n) {
      L.push('*' + (n + 1) + ' · ' + i.who + '* — ' + i.bm);
      if (i.sub) L.push('Butiran: ' + i.sub);
      if (i.fix) L.push('Cara selesai: ' + i.fix);
      if (i.st) L.push(i.st === 'doing' ? 'Jawapan: ' + i.ans : i.st === 'missed' ? 'Janji terlepas: ' + i.ans : 'Belum dijawab');   // v1.57
      L.push('');
    });
    L.push('Sila selesaikan hari ini.');
    // 1.56.1: past 5:00 petang the lines are already the Pengurus's, so the message says "now", not "at 5:00"
    L.push(e.withManager ? 'Sudah lepas 5:00 petang: semua di atas kini tanggungjawab *' + e.manager + '*. Esok pagi ia sampai kepada YC Lee.'
      : 'Pukul 5:00 petang, yang belum selesai menjadi tanggungjawab *' + e.manager + '*. Esok pagi ia sampai kepada YC Lee.');
    L.push('');
    L.push(u && u.role === 'Owner' ? 'YC Lee' : ((u && u.name) || 'Ibu Pejabat') + ', bagi pihak YC Lee');
    return L.join('\n');
  };
  // The board for the group: one block per estate, four marks, and who is late.
  EA.lateBoard = function (d) {
    var L = ['*E-Book · Papan harian · ' + dayLbl(d.today) + ' · ' + String(d.at || '').slice(11, 16) + '*', '✅ ikut masa · ❌ lewat · ⏳ belum sampai masa · ➖ hari rehat', ''];
    (d.estates || []).forEach(function (e) {
      L.push('*' + estName(e.estate).toUpperCase() + '*');
      L.push(BOX.map(function (b) { return b[1] + ' ' + (MARK[e.board[b[0]]] || '❌'); }).join(' · '));
      if (e.items.length) {
        var by = {}, order = [];
        e.items.forEach(function (i) { if (!by[i.who]) { by[i.who] = 0; order.push(i.who); } by[i.who]++; });
        L.push('Lewat ' + e.items.length + ': ' + order.map(function (w) { return w + ' ' + by[w]; }).join(', ') + (e.withManager ? ' · kini dengan ' + e.manager : ''));
      } else L.push('Semua ikut masa.');
      L.push('');
    });
    L.push('Ladang lain belum di E-Book: ikut senarai semak Ibu Pejabat.');
    return L.join('\n');
  };
  function share(text) {
    if (navigator.share) navigator.share({ text: text }).catch(function () {});
    else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  EA.latePeek = function (u) {
    if (asking || !ok(u) || !EA.sendLink() || !navigator.onLine) return;
    var c = cached(u);
    if (c && Date.now() - c.at < 3 * 60000) return;
    asking = true;
    EA.askFull('late', {}).then(function (j) {
      asking = false;
      if (j && j.ok && j.estates) { try { EA.local.set(CACHE, { at: Date.now(), code: u.code, data: j }); } catch (e) {} if (!location.hash && EA.renderHome) EA.renderHome(); }
    });
  };
  function boardHtml(e) {
    return '<span class="lt-bd">' + BOX.map(function (b) { var v = e.board[b[0]] || 'no'; return '<span class="lt-bx ' + v + '">' + esc(b[1]) + ' ' + (MARK[v] || '') + '</span>'; }).join('') + '</span>';
  }
  EA.renderLate = function (box, u) {
    if (!box) return;
    var c = ok(u) ? cached(u) : null;
    if (!c || !c.data || !(c.data.estates || []).length) { box.innerHTML = ''; box.hidden = true; return; }
    var d = c.data, n = d.estates.reduce(function (a, e) { return a + e.items.length; }, 0);
    box.hidden = false;
    box.innerHTML = '<section class="td lt" aria-labelledby="lt-h"><h2 id="lt-h">' + EA.t('Susulan harian', 'Daily follow-up') + ' · ' + esc(dayLbl(d.today)) +
      ' <small>' + EA.t('setakat ', 'as at ') + esc(String(d.at || '').slice(11, 16)) + '</small></h2>' +
      d.estates.map(function (e) {
        return '<div class="lt-es"><b>' + esc(estName(e.estate)) + '</b>' + boardHtml(e) +
          '<small>' + (e.items.length ? esc(e.items.length + EA.t(' lewat', ' late') + (e.withManager ? EA.t(' · kini dengan ', ' · now with ') + e.manager : '')) : EA.t('Semua ikut masa', 'All on time')) + '</small></div>';
      }).join('') +
      '<div class="actions"><button class="btn ' + (n ? 'btn-main' : 'btn-ghost') + '" type="button" id="lt-open">OPEN LIST<small>BUKA SENARAI' + (n ? ' · ' + n : '') + '</small></button></div></section>';
    box.querySelector('#lt-open').onclick = function () { sheet(u, d); };
  };
  function sheet(u, d) {
    EA.ui.openSheet('<h2 id="sheet-title">' + EA.t('Susulan harian', 'Daily follow-up') + ' · ' + esc(dayLbl(d.today)) + '</h2>' +
      '<p class="hint">' + EA.t('Hantar satu mesej kepada setiap ladang sekali sehari (10:30 pagi). Baris hilang sendiri apabila kerja siap.', 'Send each estate one message once a day (10:30 am). A line goes by itself when the work is done.') + '</p>' +
      d.estates.map(function (e, k) {
        return '<div class="lt-card"><h3>' + esc(estName(e.estate)) + ' ' + boardHtml(e) + '</h3>' +
          (e.withManager ? '<p class="lt-mg">' + EA.t('Lepas 5:00 petang · kini tanggungjawab ', 'Past 5:00 pm · now with ') + '<b>' + esc(e.manager) + '</b></p>' : '') +
          (e.items.length ? e.items.map(function (i) {
            return '<div class="lt-it"><b>' + esc(i.who) + '</b> · ' + esc(EA.t(i.bm, i.en || i.bm)) + (i.sub ? '<small>' + esc(i.sub) + '</small>' : '') + (i.fix ? '<small class="lt-fx">' + EA.t('Cara selesai: ', 'How to fix: ') + esc(i.fix) + '</small>' : '') +
              (i.st ? '<small class="lt-an' + (i.st === 'doing' ? '' : ' n') + '">' + (i.st === 'doing' ? EA.t('Jawapan: ', 'Answer: ') + esc(i.ans) : i.st === 'missed' ? EA.t('Janji terlepas: ', 'Promise missed: ') + esc(i.ans) : EA.t('Belum dijawab', 'Not answered')) + '</small>' : '') + '</div>';
          }).join('') + '<button class="btn btn-ok lt-wa" type="button" data-k="' + k + '">WHATSAPP · ESTATE<small>Mesej kepada ' + esc(estName(e.estate)) + '</small></button>'
            : '<p class="td-done">✓ ' + EA.t('Semua ikut masa', 'All on time') + '</p>') + '</div>';
      }).join('') +
      '<div class="actions"><button class="btn btn-ghost btn-back" type="button" id="lt-no">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="lt-board">WHATSAPP · BOARD<small>Papan ke kumpulan</small></button></div>',
      function (s) {
        s.querySelector('#lt-no').onclick = EA.ui.closeSheet;
        s.querySelector('#lt-board').onclick = function () { share(EA.lateBoard(d)); };
        s.querySelectorAll('.lt-wa').forEach(function (b) { b.onclick = function () { share(EA.lateText(d.estates[Number(b.dataset.k)], d, u)); }; });
      });
  }
})();
