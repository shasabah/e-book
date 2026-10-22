// Foundation: Perlu tindakan · Needs action (v1.31). Agreed by Yu Chen 22 Oct 2026 (Field & Harvest Brief,
// "B · Perlu tindakan"; Related_Parties.md). One box at the top of the home screen with only this person's
// jobs, for the Staff, the Clerk, the Pengurus and the Owner. Nothing new is keyed (except the Pengurus's
// direction on a staff explanation). A line goes by itself when the job is done; a tap opens the right screen.
// The office sends most lines ('todo', kept on the phone as ea.todo.<estate>, so they show with no signal);
// the phone adds what it knows better itself: today's chit not made, and records not sent.
window.EA = window.EA || {};
(function () {
  var CACHE = 'ea.todo.', ROLES = /^(Staff|Clerk|Manager|Owner)$/, asking = false;
  function esc(s) { return EA.ui.esc(s); }
  function cached(u, est) { var c = EA.local.get(CACHE + est, null); return c && c.code === u.code ? c : null; }
  function keep(u, j) { try { EA.local.set(CACHE + j.estate, { at: Date.now(), code: u.code, items: j.items || [] }); } catch (e) {} }
  // Lines the phone knows itself.
  function localItems(u, est) {
    var out = [], now = new Date();
    if (u.role === 'Staff' && now.getHours() >= 5) {
      var today = EA.today(), has = (EA.local.get('fh.chits2', []) || []).some(function (c) { return c.estate === est && c.date === today; });
      if (!has) out.push({ id: 'CH', p: 1, ic: '!', bm: 'Chit muster hari ini belum dibuat', en: 'Today\'s muster chit is not made yet', sub: EA.t('Buat sebelum kerja mula', 'Make it before work starts'), go: '#field-harvest' });
    }
    var n = EA.waitingMine ? EA.waitingMine() : 0, old = EA.oldestWaiting ? EA.oldestWaiting() : 0;
    if (n && old && Date.now() - old > 30 * 60000) out.push({ id: 'Q', p: 3, ic: '↑', bm: n + ' rekod belum dihantar ke pejabat', en: n + ' records not sent to the office', sub: EA.t('Cari isyarat, tekan di sini untuk HANTAR', 'Find signal, tap here to SEND'), go: 'send' });
    return out;
  }
  EA.todoItems = function (u, est) {
    if (!u || !ROLES.test(u.role)) return null;
    var c = cached(u, est), items = localItems(u, est).concat(c ? c.items : []);
    items.sort(function (a, b) { return a.p - b.p; });
    return { items: items, at: c ? c.at : 0 };
  };
  EA.todoPeek = function (u, est) {
    if (asking || !u || !ROLES.test(u.role) || !EA.sendLink() || !navigator.onLine) return;
    var c = cached(u, est);
    if (c && Date.now() - c.at < 3 * 60000) return;
    asking = true;
    EA.askFull('todo', { estate: est }).then(function (j) {
      asking = false;
      if (j && j.ok && j.items) { keep(u, j); if (!location.hash && EA.renderHome) EA.renderHome(); }
    });
  };
  var COLOR = { 1: 'r', 2: 'a', 3: 'b', 4: 'g' };
  EA.renderTodo = function (box, u, est) {
    if (!box) return;
    var t = EA.todoItems(u, est);
    if (!t) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    if (!t.items.length) {
      box.innerHTML = t.at ? '<div class="td-done">✓ ' + EA.t('Tiada tindakan sekarang', 'Nothing to do now') + '</div>' : '';
      return;
    }
    box.innerHTML = '<section class="td" aria-labelledby="td-h"><h2 id="td-h">' + EA.t('Perlu tindakan', 'Needs action') + ' (' + t.items.length + ')</h2>' +
      t.items.map(function (x, i) {
        var tap = !!x.go;
        return '<' + (tap ? 'button type="button"' : 'div') + ' class="td-it" data-i="' + i + '"><span class="td-ic ' + (COLOR[x.p] || 'b') + '">' + esc(x.ic || '!') + '</span>' +
          '<span class="td-t">' + esc(EA.t(x.bm, x.en || x.bm)) + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span>' + (tap ? '<span class="td-go">›</span>' : '') + '</' + (tap ? 'button' : 'div') + '>';
      }).join('') + '</section>';
    box.querySelectorAll('button.td-it').forEach(function (b) {
      b.onclick = function () {
        var x = t.items[Number(b.dataset.i)];
        if (x.go === 'send') { if (EA.send) EA.send(); return; }
        if (x.go === 'direct') return directSheet(u, est, x);
        location.hash = x.go.replace(/^#/, '');
      };
    });
  };
  // The Pengurus writes what to do about the staff's explanation; the staff sees it for 2 days.
  function directSheet(u, est, x) {
    EA.ui.openSheet('<h2 id="sheet-title">' + EA.t('Beri arahan', 'Give direction') + '</h2><p><b>' + esc(x.bm.replace(/^Beri arahan: /, '')) + '</b></p><p class="hint">' + esc(x.sub) + '</p>' +
      '<div class="field"><label for="td-dir">' + EA.t('Arahan kepada Staf (cth. tuai lebih awal di Blok 03)', 'Direction to the staff (e.g. harvest earlier in Block 03)') + ' *</label><textarea id="td-dir" class="text-input" rows="3" maxlength="200"></textarea></div>' +
      '<p class="msg" id="td-err" hidden></p><div class="actions"><button class="btn btn-ghost btn-back" type="button" id="td-no">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-main" type="button" id="td-ok">SEND<small>Hantar</small></button></div>',
      function (s) {
        s.querySelector('#td-no').onclick = EA.ui.closeSheet;
        s.querySelector('#td-ok').onclick = async function () {
          var d = s.querySelector('#td-dir').value.trim(), m = s.querySelector('#td-err');
          if (d.length < 3) { m.textContent = EA.t('Tulis arahan (sekurang-kurangnya 3 huruf).', 'Write the direction (at least 3 letters).'); m.hidden = false; return; }
          this.disabled = true;
          var j = await EA.askFull('todoDirect', { estate: est, ref: x.ref, direction: d });
          if (!j || !j.ok) { this.disabled = false; m.textContent = EA.t('Tidak dihantar: ', 'Not sent: ') + ((j && j.error) || 'busy'); m.hidden = false; return; }
          keep(u, j); EA.ui.closeSheet(); if (EA.renderHome) EA.renderHome(); EA.ui.toast(EA.t('Arahan dihantar · Staf akan nampak', 'Direction sent · the staff will see it'));
        };
      });
  }
})();
