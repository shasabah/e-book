// Foundation: Perlu tindakan · Needs action (v1.31). Agreed by Yu Chen 22 Oct 2026 (Field & Harvest Brief,
// "B · Perlu tindakan"; Related_Parties.md). One box at the top of the home screen with only this person's
// jobs, for the Staff, the Clerk, the Pengurus and the Owner. Nothing new is keyed (except the Pengurus's
// direction on a staff explanation). A line goes by itself when the job is done; a tap opens the right screen.
// The office sends most lines ('todo', kept on the phone as ea.todo.<estate>, so they show with no signal);
// the phone adds what it knows better itself: today's chit not made, and records not sent.
window.EA = window.EA || {};
(function () {
  var CACHE = 'ea.todo.', ROLES = /^(Staff|Clerk|Manager|Owner|HQ)$/, asking = false;
  function esc(s) { return EA.ui.esc(s); }
  function cached(u, est) { var c = EA.local.get(CACHE + est, null); return c && c.code === u.code ? c : null; }
  function keep(u, j) { try { EA.local.set(CACHE + j.estate, { at: Date.now(), code: u.code, items: j.items || [] }); } catch (e) {} }
  // Lines the phone knows itself.
  function localItems(u, est) {
    var out = [], now = new Date();
    if (u.role === 'Staff' && now.getHours() >= 5) {
      var today = EA.today(), has = (EA.local.get('fh.chits2', []) || []).some(function (c) { return c.estate === est && c.date === today; });
      // v1.40: planned leave days gone by come first (confirm, then their work); a day planned for today is not "missing".
      var pend = EA.fh && EA.fh.pendingPlans ? EA.fh.pendingPlans(est) : [];
      pend.forEach(function (p) {
        var d = new Date(p.date + 'T00:00:00'), lbl = EA.ui.dayBm[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
        out.push({ id: 'PL:' + p.plan, p: 0, ic: '!', bm: lbl + ': sahkan kehadiran & kerja', en: lbl + ': confirm attendance & work', sub: EA.t('Rancangan semasa cuti · buat sebelum chit hari ini', 'Planned while on leave · do it before today\'s chit'), go: '#field-harvest' });
      });
      var planToday = ((EA.fh && EA.fh.plans ? EA.fh.plans() : []) || []).some(function (p) { return p.estate === est && p.date === today && !p.cancelled; });
      // v1.51.3 (Yu Chen, 6 Nov): a rest day raises no "chit not made". Sunday and a public holiday are not
      // working days, so the line used to arrive every Sunday morning when nothing was wrong — and an alert that
      // cries every week teaches the staff to stop reading the box. Sunday work that was planned and approved
      // still asks for its chit, because planToday is true for it. Public holidays come from the same list the
      // day close uses (EA.lists.holidays); it is empty until HQ keys the calendar, and this starts working by
      // itself on the day she does. Same rule as dayclose.js: rest day = Sunday or a listed holiday.
      var rest = new Date(today + 'T00:00:00').getDay() === 0 || !!(EA.lists && EA.lists.holidays && EA.lists.holidays.indexOf(today) >= 0);
      // v1.52 (Brief_Esok): with the daily habit every day has a plan, so a plan for today must not silence this
      // line — it changes it. No chit and a plan: "sahkan siapa hadir". No chit and no plan: as before. A planned
      // rest day (Sunday work approved) asks the same, because that day has a plan.
      if (!has && planToday) out.push({ id: 'CH', p: 1, ic: '!', bm: 'Chit hari ini dirancang semalam · sahkan siapa hadir', en: 'Today\'s chit was planned last night · confirm who came', sub: EA.t('Tanda siapa tidak hadir, kemudian SAHKAN', 'Mark who is absent, then CONFIRM'), go: '#field-harvest' });
      else if (!has && !rest) out.push({ id: 'CH', p: 1, ic: '!', bm: 'Chit muster hari ini belum dibuat', en: 'Today\'s muster chit is not made yet', sub: EA.t('Buat sebelum kerja mula', 'Make it before work starts'), go: '#field-harvest' });
    }
    // v1.43 TUTUP HARI: a past day with a chit on this phone and no close (works with no signal; the office sends the same id).
    if (u.role === 'Staff' && EA.fh && EA.fh.openDays) {
      try {
        EA.fh.openDays(est).filter(function (o) { return o.date < EA.today(); }).forEach(function (o) {
          var d = new Date(o.date + 'T00:00:00'), lbl = EA.ui.dayBm[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
          out.push({ id: 'TH:' + o.date, p: 1, ic: 'TH', bm: (o.reopened ? 'Hari ' + lbl + ' dibuka semula · tutup semula' : 'Hari ' + lbl + ' belum ditutup') + ' · TUTUP HARI', en: o.reopened ? 'Day ' + lbl + ' reopened · close it again' : 'Day ' + lbl + ' not closed',
            sub: EA.t('Semak kerja, ramp, lori, hujan, lalu tekan TUTUP HARI', 'Check work, ramp, lorry, rain, then press TUTUP HARI'), go: '#field-harvest/close' });
        });
      } catch (e) {}
    }
    var n = EA.waitingMine ? EA.waitingMine() : 0, old = EA.oldestWaiting ? EA.oldestWaiting() : 0;
    if (n && old && Date.now() - old > 30 * 60000) out.push({ id: 'Q', p: 3, ic: '↑', bm: n + ' rekod belum dihantar ke pejabat', en: n + ' records not sent to the office', sub: EA.t('Cari isyarat, tekan di sini untuk HANTAR', 'Find signal, tap here to SEND'), go: 'send' });
    return out;
  }
  EA.todoItems = function (u, est) {
    if (!u || !ROLES.test(u.role)) return null;
    var c = cached(u, est), items = localItems(u, est).concat(c ? c.items : []), seen = {};
    // v1.43: the phone and the office may both know a line. v1.57: the office's copy carries the answer state
    // (ask, st, ans), so it is laid over the phone's own copy of the same line.
    items = items.filter(function (x) { var f = seen[x.id]; if (f) { if (x.ask) { f.ask = x.ask; f.st = x.st; f.ans = x.ans; } return false; } seen[x.id] = Object.assign({}, x); return true; }).map(function (x) { return seen[x.id]; });
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
  // v1.57 The app asks first (Brief_Amaran 0.7 step 1; Yu Chen, 12 Nov 2026). A late line of the Staff or the
  // Clerk lives three ways: Baru (not answered), Dalam tindakan (answered: what happened and by when, at most one
  // day), Selesai (only the real work closes it, and then the line is gone). The phone asks once a day, at the
  // first opening with a fresh list, before anything else: two taps a line. It asks for an answer, never for the
  // problem to be solved, so it can always be left with ‹ BALIK and the day's work is never held back.
  function dueLbl(due) { var d = String(due || ''); return d.slice(8, 10) + '/' + d.slice(5, 7) + (d.slice(11, 16) <= '12:00' ? EA.t(' pagi', ' morning') : EA.t(' petang', ' afternoon')); }
  function stTag(x) {
    if (!x.ask) return '';
    if (x.st === 'doing') return '<small class="td-st d">' + EA.t('Dalam tindakan · ', 'In hand · ') + esc(x.ans.why) + EA.t(' · janji ', ' · promised ') + esc(dueLbl(x.ans.due)) + '</small>';
    if (x.st === 'missed') return '<small class="td-st m">' + EA.t('Janji terlepas · jawab semula', 'Promise missed · answer again') + '</small>';
    return '<small class="td-st n">' + EA.t('Baru · belum dijawab', 'New · not answered') + '</small>';
  }
  function toAsk(u, est) { var t = EA.todoItems(u, est); return t ? t.items.filter(function (x) { return x.ask && x.st !== 'doing'; }) : []; }
  EA.askLate = function (u, est) {
    var list = toAsk(u, est), k = 0;
    if (!list.length) return;
    function step() {
      if (k >= list.length) { EA.ui.closeSheet(); if (EA.renderHome) EA.renderHome(); EA.ui.toast(EA.t('Terima kasih · jawapan dihantar', 'Thank you · answers sent')); return; }
      var x = list[k], why = '', by = '', hr = new Date().getHours();
      var whens = [['pm0', 'Petang ini', 'This afternoon'], ['am1', 'Esok pagi', 'Tomorrow morning'], ['pm1', 'Esok petang', 'Tomorrow afternoon']].filter(function (w) { return w[0] !== 'pm0' || hr < 15; });
      var fixLbl = /^TH:/.test(x.id) ? EA.t('KUNCI HARI SEKARANG', 'CLOSE THE DAY NOW') : EA.t('SELESAIKAN SEKARANG', 'FIX IT NOW');
      EA.ui.openSheet('<h2 id="sheet-title">' + EA.t('Sebelum mula', 'Before you start') + ' · ' + (k + 1) + ' / ' + list.length + '</h2>' +
        '<p><b>' + esc(EA.t(x.bm, x.en || x.bm)) + '</b></p>' + (x.sub ? '<p class="hint">' + esc(x.sub) + '</p>' : '') +
        (x.st === 'missed' ? '<p class="msg">' + EA.t('Janji anda (', 'Your promise (') + esc(dueLbl(x.ans.due)) + EA.t(') sudah lepas. Jawab semula.', ') has passed. Answer again.') + '</p>' : '') +
        (x.go && x.go.charAt(0) === '#' ? '<button class="btn btn-ok" type="button" id="aq-fix">' + fixLbl + '</button><p class="hint">' + EA.t('Belum boleh selesai sekarang? Jawab dua soalan ini:', 'Cannot fix it now? Answer these two:') + '</p>' : '') +
        '<p class="aq-q">' + EA.t('1 · Apa berlaku?', '1 · What happened?') + '</p><div class="seg2 aq-why">' + x.ask.map(function (a, n) { return '<button type="button" data-n="' + n + '">' + esc(EA.t(a[0], a[1] || a[0])) + '</button>'; }).join('') + '</div>' +
        '<div class="field" id="aq-obox" hidden><label for="aq-other">' + EA.t('Tulis sebab (ringkas)', 'Write why (short)') + ' *</label><input id="aq-other" class="text-input" maxlength="100"></div>' +
        '<p class="aq-q">' + EA.t('2 · Bila selesai?', '2 · When will it be done?') + '</p><div class="seg2 aq-by">' + whens.map(function (w) { return '<button type="button" data-b="' + w[0] + '">' + EA.t(w[1], w[2]) + '</button>'; }).join('') + '</div>' +
        '<p class="msg" id="aq-err" hidden></p>',
        function (s) {
          var m = s.querySelector('#aq-err'), ob = s.querySelector('#aq-obox'), busy = false;
          function say(t) { m.textContent = t; m.hidden = false; }
          var fx = s.querySelector('#aq-fix');
          if (fx) fx.onclick = function () { EA.ui.closeSheet(); location.hash = x.go.replace(/^#/, ''); };
          async function send() {
            if (busy) return;
            var other = ob.hidden ? '' : s.querySelector('#aq-other').value.replace(/\s+/g, ' ').trim();
            if (!why) return say(EA.t('Pilih apa berlaku dulu.', 'Choose what happened first.'));
            if (!ob.hidden && other.length < 3) return say(EA.t('Tulis sebab (sekurang-kurangnya 3 huruf).', 'Write why (at least 3 letters).'));
            if (!by) return;
            busy = true; m.hidden = true;
            var j = await EA.askFull('lateAnswer', { estate: est, ref: x.id, why: ob.hidden ? why : other, by: by });
            busy = false;
            if (!j || !j.ok) {
              if (j && (j.error === 'nothing_waiting' || j.error === 'already')) { k++; return step(); }   // done or answered meanwhile
              s.querySelectorAll('.aq-by button').forEach(function (b) { b.classList.remove('on'); }); by = '';
              return say(j && (j.error === 'offline' || j.error === 'nolink') ? EA.t('Tiada line. Jawab kemudian dari Perlu tindakan.', 'No signal. Answer later from Needs action.') : EA.t('Tidak dihantar: ', 'Not sent: ') + ((j && j.error) || 'busy'));
            }
            keep(u, j); k++; step();
          }
          s.querySelectorAll('.aq-why button').forEach(function (b) {
            b.onclick = function () {
              s.querySelectorAll('.aq-why button').forEach(function (o) { o.classList.toggle('on', o === b); });
              var a = x.ask[Number(b.dataset.n)]; why = a[0]; ob.hidden = !/^Lain/.test(a[0]); m.hidden = true;
              if (!ob.hidden) s.querySelector('#aq-other').focus(); else if (by) send();
            };
          });
          s.querySelectorAll('.aq-by button').forEach(function (b) {
            b.onclick = function () { s.querySelectorAll('.aq-by button').forEach(function (o) { o.classList.toggle('on', o === b); }); by = b.dataset.b; send(); };
          });
        });
    }
    step();
  };
  // Once a day for each person, and only on a list fresh from the office (so a line already done is never asked).
  EA.askLateAuto = function (u, est) {
    if (!u || (u.role !== 'Staff' && u.role !== 'Clerk') || location.hash || !navigator.onLine) return;
    var c = cached(u, est), mark = EA.local.get('ea.asked', null), today = EA.today();
    if (!c || Date.now() - c.at > 3 * 60000) return;
    if (mark && mark.code === u.code && mark.day === today) return;
    var sb = document.getElementById('sheet-back'); if (sb && !sb.hidden) return;   // another box is open: never on top of it
    if (!toAsk(u, est).length) return;
    EA.local.set('ea.asked', { code: u.code, day: today });
    EA.askLate(u, est);
  };
  EA.renderTodo = function (box, u, est) {
    if (!box) return;
    var t = EA.todoItems(u, est);
    if (!t) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    if (!t.items.length) {
      box.innerHTML = t.at ? '<div class="td-done">✓ ' + EA.t('Tiada tindakan sekarang', 'Nothing to do now') + '</div>' : '';
      return;
    }
    var nAsk = t.items.filter(function (x) { return x.ask && x.st !== 'doing'; }).length;
    box.innerHTML = '<section class="td" aria-labelledby="td-h"><h2 id="td-h">' + EA.t('Perlu tindakan', 'Needs action') + ' (' + t.items.length + ')</h2>' +
      t.items.map(function (x, i) {
        var tap = !!x.go;
        return '<' + (tap ? 'button type="button"' : 'div') + ' class="td-it" data-i="' + i + '"><span class="td-ic ' + (COLOR[x.p] || 'b') + '">' + esc(x.ic || '!') + '</span>' +
          '<span class="td-t">' + esc(EA.t(x.bm, x.en || x.bm)) + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + stTag(x) + '</span>' + (tap ? '<span class="td-go">›</span>' : '') + '</' + (tap ? 'button' : 'div') + '>';
      }).join('') + (nAsk ? '<div class="actions"><button class="btn btn-main" type="button" id="td-ans">ANSWER · ' + nAsk + '<small>JAWAB · ' + nAsk + '</small></button></div>' : '') + '</section>';
    if (nAsk) box.querySelector('#td-ans').onclick = function () { EA.askLate(u, est); };
    box.querySelectorAll('button.td-it').forEach(function (b) {
      b.onclick = function () {
        var x = t.items[Number(b.dataset.i)];
        if (x.go === 'send') { if (EA.send) EA.send(); return; }
        if (x.go === 'direct') return directSheet(u, est, x);
        if (x.go === 'jobok') return jobSheet(u, est, x);
        if (x.go === 'fix') { EA.local.set('fh.fixGo', Object.assign({ estate: est }, x.fix)); location.hash = 'field-harvest'; return; }
        location.hash = x.go.replace(/^#/, '');
      };
    });
  };
  // v1.36 D · Kerja lain: the Pengurus answers LULUS, or TOLAK with why. The staff sees the answer for 2 days;
  // a TOLAK also goes to the clerk (pay settled at month end). Nothing is deleted.
  function jobSheet(u, est, x) {
    var sun = /hari Ahad/.test(x.bm);   // v1.41: Sunday work, approved by the Pengurus (v1.55.1)
    EA.ui.openSheet('<h2 id="sheet-title">' + (sun ? EA.t('Kerja hari Ahad · lulus?', 'Sunday work · approve?') : EA.t('Kerja lain · lulus?', 'Other work · approve?')) + '</h2><p><b>' + esc(x.bm) + '</b></p><p class="hint">' + esc(x.sub) + '</p>' +
      '<div class="field" id="td-whybox" hidden><label for="td-why">' + EA.t('Sebab ditolak', 'Why rejected') + ' *</label><textarea id="td-why" class="text-input" rows="2" maxlength="180"></textarea></div>' +
      '<p class="msg" id="td-err" hidden></p><div class="actions"><button class="btn btn-ghost btn-back" type="button" id="td-no">‹ BACK<small>‹ BALIK</small></button>' +
      '<button class="btn btn-ghost" type="button" id="td-rej">REJECT<small>Tolak</small></button>' +
      '<button class="btn btn-ok" type="button" id="td-ok">APPROVE<small>Lulus</small></button></div>',
      function (s) {
        var m = s.querySelector('#td-err');
        async function send(dir, btn) {
          btn.disabled = true;
          var j = await EA.askFull('todoDirect', { estate: est, ref: x.ref, direction: dir });
          if (!j || !j.ok) { btn.disabled = false; m.textContent = EA.t('Tidak dihantar: ', 'Not sent: ') + ((j && j.error) || 'busy'); m.hidden = false; return; }
          keep(u, j); EA.ui.closeSheet(); if (EA.renderHome) EA.renderHome(); EA.ui.toast(/^LULUS/.test(dir) ? EA.t('Diluluskan', 'Approved') : EA.t('Ditolak · Staf dan Kerani akan nampak', 'Rejected · the staff and clerk will see it'));
        }
        s.querySelector('#td-no').onclick = EA.ui.closeSheet;
        s.querySelector('#td-ok').onclick = function () { send('LULUS', this); };
        s.querySelector('#td-rej').onclick = function () {
          var box = s.querySelector('#td-whybox');
          if (box.hidden) { box.hidden = false; s.querySelector('#td-why').focus(); return; }
          var w = s.querySelector('#td-why').value.replace(/\s+/g, ' ').trim();
          if (w.length < 3) { m.textContent = EA.t('Tulis sebab ditolak.', 'Write why it is rejected.'); m.hidden = false; return; }
          send('TOLAK: ' + w, this);
        };
      });
  }
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
