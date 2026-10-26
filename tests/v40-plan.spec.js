// E-Book test (1.40). E · Rancang & sahkan (Yu Chen, 26 Oct 2026): plan a leave day, confirm it on return.
// Saturday 31/10: the staff plans Sunday 1/11 (RANCANG HARI LAIN). The plan goes to FH_PLAN only (never the
//   real muster), a Sunday plan asks the Pengurus (alert "jobask" with the staff's reason), the WhatsApp text
//   says RANCANGAN, and the people not marked on a Sunday are resting (no leftover sheet).
// Monday 2/11: the planned day comes first; CONFIRM fills from the plan, a change needs a reason, the chit is
//   dated Sunday and says DISAHKAN with what differed; its work opens; today's chit stays locked until then.
// Wednesday 4/11: a planned Tuesday nobody worked is cancelled (removed rows, nothing deleted).
// Office: plans_ tells which plans are confirmed and how many people differ.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm'), path = require('path');

// ---------- office: plans_ ----------
(function office() {
  const code = fs.readFileSync(path.resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
  function Sheet(rows) { this.rows = rows; }
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
  Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }; };
  const std = ['id', 'date', 'company', 'estate', 'keyed_by', 'keyed_at', 'phone', 'status', 'replaces'];
  const mus = ['chit', 'block', 'lots', 'mandor', 'worker_id', 'task_code', 'muster', 'confirmed_by', 'confirmed_at', 'note'];
  const D = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const SUN = D(-1), TUE = D(1), NOW = D(0) + ' 06:05';
  const row = (id, date, chit, w, task, m, by) => [id, date, 'SPLT', 'SSGT', by || 'STF-SSGT-01', D(-3) + ' 10:05', 'P13', 'active', '', chit, task ? '02' : '', '', '', w, task, m, '', '', ''];
  const al = ['chit', 'kind', 'block', 'lot', 'detail', 'staff_note', 'direction', 'direction_by', 'ref'];
  const arow = (id, at, ref, dir, rep, st) => [id, SUN, 'SPLT', 'SSGT', 'X', at, 'P13', st || 'active', rep || '', ref, 'jobask', '', '', 'Kerja Ahad', 'sebab', dir || '', '', ref];
  const tabs = {
    FH_PLAN: new Sheet([std.concat(mus),
      row('p1', SUN, 'PL-1', 'W1', 'HA', 'H'), row('p2', SUN, 'PL-1', 'W2', 'HA', 'H'), row('p3', SUN, 'PL-1', 'W3', 'HA', 'H'),
      row('p4', TUE, 'PL-2', 'W1', 'CPS', 'H')]),
    FH_CHIT: new Sheet([std.concat(['chit', 'rain_mm', 'rain_time', 'working', 'not_working', 'grand_total', 'confirmed_by', 'confirmed_at', 'note']),
      ['c1', SUN, 'SPLT', 'SSGT', 'STF-SSGT-01', NOW, 'P13', 'active', '', 'MC-1', '', '', '2', '1', '3', '', '', 'Dari rancangan PL-1']]),
    FH_MUSTER: new Sheet([std.concat(mus),
      row('m1', SUN, 'MC-1', 'W1', 'HA', 'H'), row('m2', SUN, 'MC-1', 'W2', 'HA', 'H'), row('m3', SUN, 'MC-1', 'W3', '', 'T')])
  };
  const ctx = { SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null }) },
    Utilities: { formatDate: (d, z, f) => f === 'yyyy-MM' ? d.toISOString().slice(0, 7) : d.toISOString().slice(0, 10) },
    Session: { getScriptTimeZone: () => 'Etc/GMT' }, LockService: {}, ContentService: {}, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) }, CacheService: {} };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const ps = ctx.plans_('SSGT', true);
  const a = ps.find(p => p.plan === 'PL-1'), b = ps.find(p => p.plan === 'PL-2');
  check('office: Sunday plan confirmed, 3 planned, 1 differs (W3 H → T)', a && a.done && a.n === 3 && a.diff === 1, JSON.stringify(a && { done: a.done, n: a.n, diff: a.diff }));
  check('office: Tuesday plan not confirmed yet', b && !b.done && b.n === 1, JSON.stringify(b && { done: b.done, n: b.n }));
  check('office: FH_PLAN is a room tab with the muster columns', JSON.stringify(ctx.ROOM_TABS.FH_PLAN) === JSON.stringify(mus));
  // Sunday asks of a plan: A asked, B = the Pengurus's LULUS (replaces A), C = the staff changed the plan (also replaces A):
  // only C counts. PL-9 has no standing plan rows (cancelled): its answer D does not count.
  const asks = [
    { id: 'B', kind: 'jobask', ref: 'PL-1', keyed_at: D(-2) + ' 18:00', received_at: D(-2) + ' 18:00', direction: 'LULUS' },
    { id: 'C', kind: 'jobask', ref: 'PL-1', keyed_at: D(-2) + ' 10:00', received_at: D(-2) + ' 19:00', direction: '' },   // keyed offline before the answer, arrived after
    { id: 'D', kind: 'jobask', ref: 'PL-9', keyed_at: D(-2) + ' 18:00', direction: 'LULUS' },
    { id: 'E', kind: 'jobask', ref: 'MC-5', keyed_at: D(-2) + ' 18:00', direction: '' }, { id: 'F', kind: 'grading', ref: 'T1' }];
  const kept = ctx.planAsks_(asks, 'SSGT').map(a => a.id).join(',');
  check('office: a plan\'s Sunday ask: only the newest line, none for a cancelled plan, other asks untouched', kept === 'C,E,F', kept);
})();

// ---------- the phone ----------
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const cx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kuching' });
  const p = await cx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const sent = [];
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: 'STF-SSGT-01', name: 'Ferezelly Bin Ali', role: 'Staff', estates: ['SSGT'] }, sw };
    else if (bd.action === 'backlog') o = { ok: true, estate: 'SSGT', field: [], fieldTotal: 0, ramp: { bunches: 0, blocks: [] }, checks: [], grading: [] };
    else if (bd.action === 'rounds') o = { ok: true, rounds: {}, lots: {} };
    else if (bd.action === 'saveBatch') { (bd.items || []).forEach(it => sent.push(it)); o = { ok: true, sw, results: bd.items.map(it => ({ ok: true, id: it.row.id })) }; }
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.clock.install({ time: new Date('2026-10-31T10:00:00+08:00') });
  await p.goto('http://localhost:8765/index.html');
  const people = [
    { id: 'W1', name: 'Pekerja Satu', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }, { id: 'W2', name: 'Pekerja Dua', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' },
    { id: 'W3', name: 'Pekerja Tiga', estate: 'SSGT', gang: 'Tuai · Harvest', sex: 'M' }, { id: 'W4', name: 'Pekerja Empat', estate: 'SSGT', gang: 'Pemandu · Driver', sex: 'M' },
    { id: 'W5', name: 'Pekerja Lima', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' }, { id: 'W6', name: 'Pekerja Enam', estate: 'SSGT', gang: 'Rawatan · Maintenance', sex: 'F' }];
  await p.evaluate(pp => {
    localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec'));
    localStorage.setItem('ea.people.SSGT', JSON.stringify(pp)); localStorage.setItem('ea.people.at', JSON.stringify(Date.now()));
  }, people);
  await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])');
  const goRoom = async (h) => { await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(150); await p.evaluate(x => { location.hash = x; }, h || 'field-harvest'); await p.waitForTimeout(500); };
  const setDraft = async (fn, arg) => { await p.evaluate(fn, arg); await goRoom(); };
  const settle = async () => { await p.waitForTimeout(1500); };

  // ===== Saturday 31/10: plan Sunday =====
  await goRoom();
  check('Saturday: PLAN ANOTHER DAY on the chit screen', !!(await p.$('#fh-plan')));
  await p.click('#fh-plan'); await p.waitForSelector('[data-pday]');
  const days = await p.$$eval('[data-pday]', a => a.map(x => x.dataset.pday + ':' + x.textContent.replace(/\s+/g, ' ').trim()));
  check('picker: the next 3 days, Sunday says it needs approval', days.length === 3 && /^2026-11-01:.*Ahad 1\/11.*lulus/.test(days[0]) && days[2].indexOf('2026-11-03') === 0, days.join(' | '));
  await p.click('[data-pday="2026-11-01"]'); await p.waitForTimeout(300);
  const band = await p.textContent('.plan-band');
  check('plan mode: orange RANCANGAN band for Ahad 1/11', /RANCANGAN · Ahad 1\/11/.test(band), band.slice(0, 80));
  check('plan mode: no backlog card or alerts of today', !(await p.$('#fh-backlog')) && !(await p.$('#fh-alert-slot')));
  await setDraft(() => {
    const all = JSON.parse(localStorage.getItem('fh.draft2')); const d = all.SSGT;
    d.jobs = [{ key: 'j1', task: 'HA', block: '02', lots: ['2-1', '2-2'], mandor: '' }, { key: 'j2', task: 'ITF', block: '02', lots: ['2-1', '2-2'], mandor: '' }];
    d.nextJob = 3; d.marks = { W1: 'H', W2: 'H', W3: 'H', W4: 'H' }; d.jobOf = { W1: 'j1', W2: 'j1', W3: 'j1', W4: 'j2' };
    localStorage.setItem('fh.draft2', JSON.stringify(all));
  });
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v40-plan-form.png' });
  const rowsHint = await p.textContent('#fh-rows');
  check('Sunday: people not marked are resting (2), not "not marked yet"', /rehat \(2 orang\)|resting \(2\)/i.test(rowsHint) && !/belum ditanda/.test(rowsHint), rowsHint.slice(0, 120));
  check('plan save button says SAVE PLAN', /SAVE PLAN/.test(await p.textContent('#fh-check')));
  await p.click('#fh-check'); await p.waitForTimeout(300);
  if (await p.$('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
  check('no leftover sheet on a Sunday', !(await p.$('#lo-all')));
  check('Sunday plan asks why (for the Pengurus)', !!(await p.$('#cf-why')));
  await p.click('#cf-ok'); await p.waitForTimeout(200);
  check('reason is required', !!(await p.$('#cf-why')));
  await p.fill('#cf-why', 'Baki buah Blk 02 lewat 16 hari'); await p.click('#cf-ok'); await p.waitForTimeout(500);
  const planText = await p.textContent('#sheet-back pre.chit');
  check('WhatsApp: RANCANGAN · CHIT MUSTER, not the real muster yet', /^\*RANCANGAN · CHIT MUSTER SPLT SSGT\*/.test(planText) && /⏳ _Belum muster sebenar/.test(planText), planText.split('\n').slice(0, 3).join(' | '));
  check('WhatsApp: Sunday needs approval, with the reason; rest day 2 people', /Hari Ahad: perlu lulus Penolong Pengurus · sebab: Baki buah Blk 02/.test(planText) && /Rest day: 2 orang/.test(planText));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v40-plan-wa.png' });
  await p.click('#ch-close'); await settle();
  let tabsSent = sent.map(x => x.tab);
  const planRows = sent.filter(x => x.tab === 'FH_PLAN');
  check('plan saved in FH_PLAN only: 4 rows dated Sunday, plan id PL-…-20261101', planRows.length === 4 && planRows.every(x => x.row.date === '2026-11-01' && /^PL-SSGT-P13-20261101-/.test(x.row.chit)) && tabsSent.indexOf('FH_MUSTER') < 0 && tabsSent.indexOf('FH_CHIT') < 0, tabsSent.join(','));
  const ask = sent.find(x => x.tab === 'FH_ALERT' && x.row.kind === 'jobask');
  check('Sunday work goes to the Pengurus: jobask with the reason', ask && /^Kerja Ahad 1\/11 \(rancangan\): HA Blk 02 3, ITF Blk 02 1 · 4 orang/.test(ask.row.detail) && ask.row.staff_note === 'Baki buah Blk 02 lewat 16 hari', ask && ask.row.detail);
  check('Saturday: the plan is listed with VIEW and CHANGE', !!(await p.$('[data-pview]')) && !!(await p.$('[data-pedit]')));
  const realChits = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.chits2') || '[]').length);
  check('the plan is not a chit on the phone', realChits === 0);

  // ===== Monday 2/11 05:58: confirm Sunday first =====
  await p.clock.setFixedTime(new Date('2026-11-02T05:58:00+08:00'));
  await goRoom('');
  const todo = await p.evaluate(() => EA.todoItems(EA.currentUser(), 'SSGT').items.map(x => x.id + ':' + x.bm));
  check('Perlu tindakan: "Ahad 1/11: sahkan kehadiran & kerja" first', /^PL:.*Ahad 1\/11: sahkan kehadiran & kerja/.test(todo[0] || ''), todo.join(' | '));
  await goRoom();
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v40-monday.png', fullPage: true });
  check('Monday: the red card comes first, today\'s chit locked', !!(await p.$('.plan-due-card')) && !(await p.$('#fh-check')));
  check('step 2 (work) waits for step 1', await p.$eval('#pd-work', e => e.disabled));
  await p.click('#pd-conf'); await p.waitForTimeout(300);
  const cband = await p.textContent('.plan-band.due');
  check('confirm mode: SAHKAN · Ahad 1/11, filled from the plan', /SAHKAN · Ahad 1\/11/.test(cband) && /CONFIRM/.test(await p.textContent('#fh-check')));
  const marks = await p.evaluate(() => JSON.parse(localStorage.getItem('fh.draft2')).SSGT.marks);
  check('everyone as planned (W1–W4 H)', JSON.stringify(marks) === JSON.stringify({ W1: 'H', W2: 'H', W3: 'H', W4: 'H' }), JSON.stringify(marks));
  await setDraft(() => { const all = JSON.parse(localStorage.getItem('fh.draft2')); const d = all.SSGT; d.marks.W3 = 'T'; delete d.jobOf.W3; localStorage.setItem('fh.draft2', JSON.stringify(all)); });
  await p.click('#fh-check'); await p.waitForTimeout(300);
  if (await p.$('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
  const diffBox = await p.textContent('.plan-diff');
  check('confirm sheet shows the difference: Pekerja Tiga planned HA Blk 02 → Tak hadir', /Pekerja Tiga: dirancang HA Blk 02 → Tak hadir/.test(diffBox), diffBox);
  await p.fill('#cf-why', 'Tidak datang, tiada sebab'); await p.click('#cf-ok'); await p.waitForTimeout(500);
  const doneText = await p.textContent('#sheet-back pre.chit');
  check('WhatsApp: DISAHKAN Isnin 2/11, planned Sabtu 31/10', /✅ _DISAHKAN Isnin 2\/11 \d\d:\d\d · dirancang Sabtu 31\/10 \(staf cuti\)_/.test(doneText), doneText.split('\n').slice(0, 4).join(' | '));
  check('WhatsApp: plan vs actual with the reason', /\*Beza dari rancangan · Plan vs actual\*\n• Pekerja Tiga: dirancang HA Blk 02 → Tak hadir\nSebab: Tidak datang, tiada sebab/.test(doneText));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v40-confirm-wa.png' });
  await p.click('#ch-close'); await settle();
  const mrows = sent.filter(x => x.tab === 'FH_MUSTER'), crow = sent.find(x => x.tab === 'FH_CHIT');
  check('confirmed chit: FH_MUSTER dated Sunday, chit MC-SSGT-P13-20261101-1', mrows.length === 4 && mrows.every(x => x.row.date === '2026-11-01' && x.row.chit === 'MC-SSGT-P13-20261101-1'), mrows.map(x => x.row.date + ' ' + x.row.chit).join(','));
  check('FH_CHIT note links the plan and the difference', crow && /^Dari rancangan PL-SSGT-P13-20261101-1 \(2026-10-31 \d\d:\d\d\) · disahkan 2026-11-02 · beza 1: Tidak datang/.test(crow.row.note), crow && crow.row.note);
  check('no Sunday approval asked again on confirm', sent.filter(x => x.tab === 'FH_ALERT' && x.row.kind === 'jobask').length === 1);
  check('step 1 done, step 2 open; today\'s chit still locked', !!(await p.$('.plan-due-card')) && !(await p.$('#pd-conf')) && !(await p.$eval('#pd-work', e => e.disabled)) && !(await p.$('#fh-check')));
  await p.click('#pd-work'); await p.waitForTimeout(600);
  check('Kerja opens on the Sunday chit with the planned-day band', /KERJA SEBENAR · Ahad 1 Nov/i.test((await p.textContent('#wk-planband').catch(() => '')) || ''), await p.textContent('#wk-planband').catch(() => 'none'));
  // key Sunday's actual work as on any evening: bunches for the harvesters, both jobs done
  const lotSel = await p.$$('select[data-f="lot"]');
  for (let i = 0; i < lotSel.length; i++) await lotSel[i].selectOption(i % 2 ? '2-2' : '2-1');
  for (const inp of await p.$$('input[data-f="bunches"]')) await inp.fill('120');
  for (const k of ['j1', 'j2']) { const bt = p.locator('[data-st="' + k + '"][data-v="Y"]'); if (await bt.count()) await bt.click(); }
  await p.click('#wk-check'); await p.waitForTimeout(400);
  if (await p.isVisible('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(400); }
  if (await p.isVisible('#wc-ok')) { await p.click('#wc-ok'); await p.waitForTimeout(500); }
  if (await p.isVisible('#rp-close')) { await p.click('#rp-close'); await p.waitForTimeout(300); }
  await settle();
  const wk = sent.filter(x => x.tab === 'FH_WORK').map(x => x.row);
  check('Sunday\'s work saved, dated Sunday 1/11 on the confirmed chit', wk.length >= 3 && wk.every(r => r.date === '2026-11-01' && r.chit === 'MC-SSGT-P13-20261101-1'),
    wk.map(r => r.date + ':' + r.task_code + ':' + r.worker_id + ':' + (r.bunches || r.qty)).join(','));
  await goRoom();
  check('after Sunday\'s work: today\'s chit opens (no red card)', !(await p.$('.plan-due-card')) && !!(await p.$('#fh-check')) && /SAVE CHIT/.test(await p.textContent('#fh-check')));
  const todo2 = await p.evaluate(() => EA.todoItems(EA.currentUser(), 'SSGT').items.map(x => x.id));
  check('Perlu tindakan: the confirm line is gone', !todo2.some(x => /^PL:/.test(x)), todo2.join(','));

  // ===== plan Tuesday 3/11 (a weekday), nobody works; Wednesday 4/11 cancels it =====
  await p.click('#fh-plan'); await p.waitForSelector('[data-pday]'); await p.click('[data-pday="2026-11-03"]'); await p.waitForTimeout(300);
  await setDraft(() => {
    const all = JSON.parse(localStorage.getItem('fh.draft2')); const d = all.SSGT;
    d.jobs = [{ key: 'j1', task: 'CPS', block: '01', lots: ['1-15'], mandor: '' }]; d.nextJob = 2;
    d.marks = { W1: 'T', W2: 'T', W3: 'T', W4: 'T', W5: 'H', W6: 'H' }; d.jobOf = { W5: 'j1', W6: 'j1' };
    localStorage.setItem('fh.draft2', JSON.stringify(all));
  });
  check('a weekday plan shows no Sunday band and no lari flag', !(await p.textContent('#fh-rows')).match(/Mungkin lari|Maybe absconded/));
  await p.click('#fh-check'); await p.waitForTimeout(300);
  if (await p.$('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); }
  check('weekday plan: no reason asked', !(await p.$('#cf-why')));
  await p.click('#cf-ok'); await p.waitForTimeout(400); await p.click('#ch-close'); await settle();
  const tue = sent.filter(x => x.tab === 'FH_PLAN' && x.row.date === '2026-11-03');
  check('Tuesday plan: 6 rows, no Sunday ask', tue.length === 6 && sent.filter(x => x.tab === 'FH_ALERT' && x.row.kind === 'jobask').length === 1, String(tue.length));
  await p.clock.setFixedTime(new Date('2026-11-04T06:00:00+08:00'));
  await goRoom();
  check('Wednesday: Tuesday comes first', !!(await p.$('.plan-due-card')) && /Selasa 3\/11/.test(await p.textContent('.plan-due-card')));
  await p.click('#pd-none'); await p.waitForSelector('#pn-why');
  await p.click('#pn-ok'); await p.waitForTimeout(200);
  check('cancel needs a reason', !!(await p.$('#pn-why')));
  await p.fill('#pn-why', 'Hujan lebat sepanjang hari'); await p.click('#pn-ok'); await settle();
  const rem = sent.filter(x => x.tab === 'FH_PLAN' && x.row.status === 'removed');
  check('cancelled: 6 removed rows replacing the plan rows (nothing deleted)', rem.length === 6 && rem.every(x => x.row.replaces && /^Tiada kerja: Hujan lebat/.test(x.row.note)), String(rem.length));
  check('after cancel: Wednesday\'s chit opens', !(await p.$('.plan-due-card')) && !!(await p.$('#fh-check')));
  // ===== review fixes =====
  const planDraft = async (day, marks) => {
    await p.click('#fh-plan'); await p.waitForSelector('[data-pday]'); await p.click('[data-pday="' + day + '"]'); await p.waitForTimeout(300);
    await setDraft(m => {
      const all = JSON.parse(localStorage.getItem('fh.draft2')); const d = all.SSGT;
      d.jobs = [{ key: 'j1', task: 'CPS', block: '01', lots: ['1-15'], mandor: '' }]; d.nextJob = 2;
      d.marks = m; d.jobOf = {}; Object.keys(m).forEach(w => { if (m[w] === 'H') d.jobOf[w] = 'j1'; });
      localStorage.setItem('fh.draft2', JSON.stringify(all));
    }, marks);
  };
  const allMarks = { W1: 'T', W2: 'T', W3: 'T', W4: 'T', W5: 'H', W6: 'H' };
  const savePlanNow = async () => { await p.click('#fh-check'); await p.waitForTimeout(300); if (await p.$('#ck-go')) { await p.click('#ck-go'); await p.waitForTimeout(300); } if (await p.$('#cf-why')) await p.fill('#cf-why', 'Ujian sebab'); await p.click('#cf-ok'); await p.waitForTimeout(400); if (await p.$('#ch-close')) await p.click('#ch-close'); await settle(); };
  // 1. a plan left unsaved overnight never becomes a plan for today
  await planDraft('2026-11-05', allMarks);
  await p.clock.setFixedTime(new Date('2026-11-05T06:00:00+08:00'));
  await goRoom();
  check('fix 1: an unsaved plan for Thursday is dropped on Thursday (normal chit, no RANCANGAN band)', !(await p.$('.plan-band')) && /SAVE CHIT/.test(await p.textContent('#fh-check')));
  // 2. leave called off: a future plan can be cancelled (CANCEL on the plans card)
  await planDraft('2026-11-06', allMarks); await savePlanNow();
  check('fix 2: the Friday plan is listed with CANCEL', !!(await p.$('[data-pdel]')));
  await p.click('[data-pdel]'); await p.waitForSelector('#pn-why'); await p.fill('#pn-why', 'Cuti dibatalkan'); await p.click('#pn-ok'); await settle();
  const fri = sent.filter(x => x.tab === 'FH_PLAN' && x.row.date === '2026-11-06' && x.row.status === 'removed');
  check('fix 2: cancelled with removed rows "Batal: Cuti dibatalkan", gone from the card', fri.length === 6 && fri.every(x => x.row.note === 'Batal: Cuti dibatalkan') && !(await p.$('[data-pdel]')), String(fri.length));
  // 3. the staff came to work on a planned day (a normal chit, work not keyed): no red card blocking later days
  await planDraft('2026-11-07', allMarks); await savePlanNow();
  await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('fh.chits2') || '[]'); c.push({ chit: 'MC-SSGT-P13-20261107-1', date: '2026-11-07', estate: 'SSGT', rows: [{ id: 'r1', worker_id: 'W5', muster: 'H', task_code: 'CPS', block: '01', lots: '1-15' }], jobs: [], confirmedAt: '06:10', rev: 1 }); localStorage.setItem('fh.chits2', JSON.stringify(c)); });
  await p.clock.setFixedTime(new Date('2026-11-09T06:00:00+08:00'));
  await goRoom();
  check('fix 3: a planned day with a normal chit is done (no red card two days later)', !(await p.$('.plan-due-card')) && !!(await p.$('#fh-check')));
  // 4. a clerk's fix draft is never replaced by a plan
  await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('fh.draft2') || '{}'); all.SSGT = { date: '2026-11-07', estate: 'SSGT', fixAsk: { ref: 'FX-1', by: 'Kerani', note: 'x' }, replacing: 'MC-SSGT-P13-20261107-1', jobs: [], marks: {}, jobOf: {}, nextJob: 1, alertNotes: {} }; localStorage.setItem('fh.draft2', JSON.stringify(all)); });
  await goRoom();
  check('fix 4: no PLAN ANOTHER DAY on a clerk\'s fix', !(await p.$('#fh-plan')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
