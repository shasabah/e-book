// Hari ini · Today, for the staff in charge (v1.61, Yu Chen, 15 Nov 2026: the new layout, style A for field staff).
// The home page opens on the day's steps in order — rain, chit, work, ramp, close, plan tomorrow — each ticked when
// its record is on this phone, with one big button for the next step. Late items stay on top (Perlu tindakan).
// Nothing new is keyed here: every step opens the screen that already exists. Other positions keep the old home.
window.EA = window.EA || {};
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function addDays(date, n) { var d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function rest(date) { return new Date(date + 'T00:00:00').getDay() === 0 || !!(EA.lists && EA.lists.holidays && EA.lists.holidays.indexOf(date) >= 0); }
  function nextWorkDay(date) { var d = addDays(date, 1), i = 0; while (rest(d) && i++ < 5) d = addDays(d, 1); return d; }
  function dm(date) { var d = new Date(date + 'T00:00:00'); return d.getDate() + '/' + (d.getMonth() + 1); }
  function dayName(date) { var d = new Date(date + 'T00:00:00'); return EA.t(['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'][d.getDay()], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]); }
  function fhOpen(estate) {
    var r = (EA.rooms || []).find(function (x) { return x.id === 'field-harvest'; });
    return !!r && (EA.roomLive(r, estate) || EA.testMode() || !!(EA.practice && EA.practice()));
  }
  function mmText(mm) { var n = Number(mm) || 0; return n > 0 ? (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '') + ' mm' : EA.t('tiada hujan', 'no rain'); }

  // The steps of the day, from what this phone holds.
  EA.todaySteps = function (u, estate) {
    var t = EA.today(), fh = EA.fh || {};
    var chit = (fh.allChits ? fh.allChits() : []).filter(function (c) { return c.estate === estate && c.date === t; })
      .sort(function (a, b) { return String(a.confirmedAt || '') < String(b.confirmedAt || '') ? 1 : -1; })[0] || null;
    var dr = (EA.local.get('fh.draft2', {}) || {})[estate] || null;
    var draftRain = dr && dr.date === t && !dr.mode && (String(dr.rain_mm) === '0' || (Number(dr.rain_mm) > 0 && (function () { var r = fh.rainPeriods && fh.rainPeriods.parse ? fh.rainPeriods.parse(dr.rain_time) : null; return r && r.day ? r.per.length > 0 : !!String(dr.rain_time || '').trim(); })()));
    var chitRain = chit && chit.rain_mm !== '' && chit.rain_mm != null;
    var work = chit ? (EA.local.get('fh.work', []) || []).find(function (s) { return s.chit === chit.chit; }) : null;
    var jobs = (work && work.rec && work.rec.jobs) || [];
    var harvest = chit && (chit.jobs || []).some(function (j) { return j.task === (EA.lists.HARVEST || 'HA'); });
    var lorries = (EA.local.get('fh.collect', []) || []).filter(function (s) { return s.estate === estate && s.date === t && s.dispatch && !s.dispatch.replacedBy; });
    var close = chit && fh.dayclose && fh.dayclose.cardState ? fh.dayclose.cardState(estate, u, t) : { state: 'none' };
    var tomorrow = nextWorkDay(t);
    var plan = (fh.plans ? fh.plans() : []).find(function (p) { return p.estate === estate && p.date === tomorrow && !p.cancelled; });
    var present = chit ? (chit.rows || []).filter(function (r) { return r.status !== 'removed' && r.muster === 'H'; }).length : 0;
    var total = chit ? (chit.rows || []).filter(function (r) { return r.status !== 'removed'; }).length : 0;
    return [
      // v1.88: one reading, for the whole of yesterday (Brief_Hujan 0.2, Brief_Tutup_Hari_Baru section 3).
      { k: 'rain', done: !!(chitRain || draftRain), bm: 'Hujan semalam', en: 'Rain yesterday', go: '#field-harvest',
        sub: chitRain ? mmText(chit.rain_mm) : draftRain ? mmText(dr.rain_mm) : EA.t('langkah pertama · baca tolok', 'first step · read the gauge') },
      { k: 'chit', done: !!chit, bm: 'Chit pagi', en: 'Morning chit', go: '#field-harvest',
        sub: chit ? (chit.jobs || []).length + EA.t(' kerja · ', ' jobs · ') + present + '/' + total + EA.t(' hadir', ' present') : EA.t('kerja, orang, siapa tidak hadir', 'jobs, people, who is absent') },
      { k: 'work', done: !!work, bm: 'Kerja', en: 'Work', go: '#field-harvest/work',
        sub: work ? jobs.filter(function (j) { return j.status === 'done'; }).length + '/' + jobs.length + EA.t(' siap', ' done') : EA.t('apa setiap orang buat', 'what each person did') },
      { k: 'ramp', done: !!chit && (!harvest || lorries.length > 0 || close.state === 'closed'), bm: 'Ramp & lori', en: 'Ramp & lorry', go: '#field-harvest/collect',
        sub: !chit ? EA.t('buah ke ramp, lori keluar', 'fruit to the ramp, lorry out') : !harvest ? EA.t('tiada tuaian hari ini', 'no harvest today') : lorries.length ? lorries.length + EA.t(' lori keluar', ' lorry out') : EA.t('buah ke ramp, lori keluar', 'fruit to the ramp, lorry out') },
      { k: 'close', done: close.state === 'closed', bm: 'Tutup hari', en: 'Close the day', go: '#field-harvest/close',
        sub: close.state === 'closed' ? EA.t('dikunci', 'locked') + (close.at ? ' ' + close.at : '') : close.state === 'missing' ? close.bad + EA.t(' perkara belum lengkap', ' things not complete') : EA.t('semak dan kunci hari', 'check and lock the day') },
      { k: 'plan', done: !!plan, bm: 'Rancang ' + dayName(tomorrow) + ' ' + dm(tomorrow), en: 'Plan ' + dayName(tomorrow) + ' ' + dm(tomorrow), plan: tomorrow,
        sub: plan ? EA.t('dirancang', 'planned') : rest(addDays(t, 1)) ? EA.t('hari esok hari rehat · rancang hari kerja seterusnya', 'tomorrow is a rest day · plan the next working day') : EA.t('isi dari hari ini, ubah yang berbeza', 'filled from today, change what differs') }
    ];
  };

  EA.renderToday = function (el, u, estate) {
    if (!el) return;
    var show = !!(u && u.role === 'Staff' && EA.fh && EA.fh.allChits && fhOpen(estate) && !(EA.fh.viewOnly && EA.fh.viewOnly(u)));
    el.hidden = !show;
    if (!show) { el.innerHTML = ''; return; }
    var steps = EA.todaySteps(u, estate), next = steps.find(function (s) { return !s.done; });
    // v1.64: every step line opens its screen (the second row of buttons under the card is gone)
    var li = function (s) { return '<li class="' + (s.done ? 'done' : 'wait') + '"><button type="button" class="step-go" data-step="' + s.k + '"><span class="tick">' + (s.done ? '✓' : '·') + '</span><div><b>' + esc(EA.t(s.bm, s.en)) + '</b><small>' + esc(s.sub) + '</small></div><span class="step-ar" aria-hidden="true">›</span></button></li>'; };
    var html = '<section class="card today-card" aria-labelledby="today-h"><h2 id="today-h"><span class="bm">Langkah hari ini</span><span class="en">Steps today</span></h2>';
    var i = next ? steps.indexOf(next) : steps.length;
    if (i > 0) html += '<ul class="today-steps">' + steps.slice(0, i).map(li).join('') + '</ul>';
    if (next) html += '<button type="button" class="btn btn-main today-go" id="today-go" data-step="' + next.k + '">' + esc(next.en.toUpperCase()) + '<small>' + esc(next.bm.toUpperCase()) + '</small></button>' +
      '<p class="hint today-sub">' + esc(next.sub) + '</p>' +
      '<ul class="today-steps">' + steps.slice(i + 1).map(li).join('') + '</ul>';
    else html += '<p class="hint">' + EA.t('Semua langkah hari ini siap. Esok pagi: baca tolok, kemudian tanda siapa tidak hadir.', 'Every step today is done. Tomorrow morning: read the gauge, then mark who is absent.') + '</p>';
    html += '</section>';
    el.innerHTML = html;
    var open = function (s) {
      if (s.plan) EA.local.set('fh.planGo', { estate: estate, date: s.plan });
      location.hash = s.go || '#field-harvest';
    };
    var go = el.querySelector('#today-go');
    if (go) go.onclick = function () { open(next); };
    el.querySelectorAll('[data-step]').forEach(function (b) { b.onclick = function () { open(steps.find(function (s) { return s.k === b.dataset.step; })); }; });
  };
})();
