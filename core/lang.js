// Foundation: one language on the screen (v1.6). Every label is written in both Bahasa
// Malaysia and English; this phone shows one of them. Chosen in Phone setup, Bahasa by default.
// - EA.t(bm, en)        → the text in this phone's language (for strings built in code)
// - <span class="bm">…</span><span class="en">…</span> → CSS shows one (look.css)
// - buttons written as EN<small>BM</small> are turned into the two spans when they appear
window.EA = window.EA || {};
(function () {
  var KEY = 'ea.lang';
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  EA.lang = function () { return get(KEY, 'bm') === 'en' ? 'en' : 'bm'; };
  EA.setLang = function (l) {
    try { localStorage.setItem(KEY, JSON.stringify(l === 'en' ? 'en' : 'bm')); } catch (e) {}
    apply();
  };
  EA.t = function (bm, en) { return EA.lang() === 'en' ? en : bm; };
  function apply() {
    document.documentElement.setAttribute('data-lang', EA.lang());
    document.documentElement.setAttribute('lang', EA.lang() === 'en' ? 'en' : 'ms');
  }
  apply();

  // Buttons: "SAVE<small>Simpan</small>" becomes two spans, so the phone's language is the big word.
  function fixButton(b) {
    if (b.dataset.l2) return;
    var small = b.querySelector(':scope > small');
    if (!small) return;
    var en = '', bm = small.textContent;
    b.childNodes.forEach(function (n) { if (n !== small && n.nodeType === 3) en += n.textContent; });
    en = en.trim(); bm = bm.trim();
    if (!en || !bm) return;
    b.dataset.l2 = '1';
    b.innerHTML = '<span class="l-bm">' + bm.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</span>' +
                  '<span class="l-en">' + en.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</span>';
  }
  // Inline pairs "<bm> · <en>": the dot between them goes when only one shows.
  function fixInline(el) {
    if (el.dataset.l2) return;
    el.dataset.l2 = '1';
    el.childNodes.forEach(function (n) { if (n.nodeType === 3 && /^\s*·\s*$/.test(n.textContent)) n.textContent = ''; });
  }
  function localize(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('button, a.btn')) fixButton(root);
    root.querySelectorAll('button, a.btn').forEach(fixButton);
    root.querySelectorAll('.inline').forEach(fixInline);
  }
  EA.localize = localize;
  document.addEventListener('DOMContentLoaded', function () {
    localize(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) localize(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
