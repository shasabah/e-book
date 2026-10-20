// E-Book test (1.10). Fixes from the pre-trial review: record numbers stay unique after data is
// cleared; a real person's entries are never "test-sent"; no made-up workers for real people;
// one record = one write; refusals in plain words; every person can log in again with no signal;
// office calls have a time limit; wrong PINs counted per phone.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const fs = require('fs'); const vm = require('vm'); const crypto = require('crypto');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P96')); });
  await p.reload(); await p.waitForTimeout(300);

  // 1. record numbers carry a per-install tag; a cleared phone gets a new one
  await p.fill('#key', '777777'); await p.waitForSelector('#home:not([hidden])');
  const id1 = await p.evaluate(() => EA.save('CHECK', 'FH', 'SSGT', { note: 'x' }).id);
  await p.evaluate(() => { const ph = localStorage.getItem('ea.phone'), u = localStorage.getItem('ea.user'); localStorage.clear(); localStorage.setItem('ea.phone', ph); localStorage.setItem('ea.user', u); });
  const id2 = await p.evaluate(() => EA.save('CHECK', 'FH', 'SSGT', { note: 'y' }).id);
  check('record numbers: same count after clearing data, but never the same number', /^FH-SSGT-P96-000001-[a-z0-9]{3,6}$/.test(id1) && /^FH-SSGT-P96-000001-/.test(id2) && id1 !== id2, id1 + ' / ' + id2);

  // 2. a real person with no sending link: entries wait, red bar shows, nothing test-sent
  await p.evaluate(() => { localStorage.setItem('ea.user', JSON.stringify({ code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'], key: '583920' })); localStorage.removeItem('ea.queue'); localStorage.removeItem('ea.testSent'); });
  await p.reload(); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => EA.save('CHECK', 'FH', 'SSGT', { note: 'real' }));
  const r = await p.evaluate(async () => { const x = await EA.send(); return { x, waiting: EA.waiting(), test: JSON.parse(localStorage.getItem('ea.testSent') || '[]').length }; });
  check('real person, no link: the entry stays waiting, nothing test-sent', r.x.error === 'nolink' && r.waiting === 1 && r.test === 0, JSON.stringify(r));
  await p.waitForTimeout(200);
  check('real person, no link: the red "sending link not set" bar shows', await p.locator('#notice-link').isVisible());

  // 3. no made-up workers for a real person: the muster asks for the list
  await p.evaluate(() => { location.hash = 'field-harvest'; }); await p.waitForTimeout(400);
  check('real person, no people list: muster asks to LOAD LIST, no made-up workers', await p.locator('#fh-loadppl').count() === 1 && (await p.evaluate(() => EA.lists.workersFor('SSGT').length)) === 0);
  await p.evaluate(() => { location.hash = ''; });

  // 4. one record = one write: storage full on the 3rd line keeps none of them
  const batch = await p.evaluate(() => {
    localStorage.removeItem('ea.queue');
    const realSet = Storage.prototype.setItem; let n = 0;
    EA.batchStart(); EA.save('CHECK', 'FH', 'SSGT', { note: 1 }); EA.save('CHECK', 'FH', 'SSGT', { note: 2 }); EA.save('CHECK', 'FH', 'SSGT', { note: 3 });
    const before = EA.waiting();
    Storage.prototype.setItem = function (k, v) { if (k === 'ea.queue') throw new Error('QuotaExceededError'); return realSet.call(this, k, v); };
    let threw = false; try { EA.batchEnd(); } catch (e) { threw = true; EA.batchCancel(); }
    Storage.prototype.setItem = realSet;
    const afterFail = EA.waiting();
    EA.batchStart(); EA.save('CHECK', 'FH', 'SSGT', { note: 1 }); EA.save('CHECK', 'FH', 'SSGT', { note: 2 }); EA.batchEnd();
    return { before, threw, afterFail, afterOk: EA.waiting() };
  });
  check('one record = one write: nothing waits until the end, storage full keeps none, a good save keeps all',
    batch.before === 0 && batch.threw && batch.afterFail === 0 && batch.afterOk === 2, JSON.stringify(batch));

  // 5. refusals in plain words (office says not_allowed)
  const LINK = 'https://script.google.com/macros/s/TEST-FIX/exec';
  let reply = { ok: true, results: [] };
  await p.route(LINK, route => {
    const body = JSON.parse(route.request().postData());
    if (body.action === 'saveBatch') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply.fn ? reply.fn(body) : reply) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] } }) });
  });
  await p.evaluate(l => localStorage.setItem('ea.sendLink', JSON.stringify(l)), LINK);
  reply = { fn: body => ({ ok: true, results: body.items.map(it => ({ id: it.row.id, ok: false, error: 'not_allowed' })) }) };
  await p.evaluate(() => { localStorage.removeItem('ea.queue'); EA.save('CHECK', 'FH', 'SSGT', { note: 'z' }); });
  await p.click('#send-btn'); await p.waitForTimeout(500);
  const toast = await p.textContent('#toast');
  check('refusal shown in plain words, not a code', /tidak dibenarkan/.test(toast) && !/not_allowed/.test(toast), toast);
  check('a refusal that can never pass is not retried by itself', await p.evaluate(() => !EA.nextRetry));

  // 6. two people on one phone can both come back in with no signal
  await p.unroute(LINK);
  await p.route(LINK, route => {
    const body = JSON.parse(route.request().postData());
    const who = body.key === '111222' ? { code: 'STF-SSGT-01', name: 'Staf Contoh', role: 'Staff', estates: ['SSGT'] } : { code: 'CLK-SSGT-01', name: 'Kerani Contoh', role: 'Clerk', estates: ['SSGT', 'PTAN'] };
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: who }) });
  });
  await p.evaluate(() => { EA.logout(); localStorage.removeItem('ea.queue'); }); await p.reload(); await p.waitForTimeout(300);
  await p.fill('#key', '111222'); await p.waitForSelector('#home:not([hidden])');
  await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.fill('#key', '333444'); await p.waitForSelector('#home:not([hidden])');
  await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');
  await p.unroute(LINK); await p.route(LINK, route => route.abort('internetdisconnected'));
  await p.fill('#key', '111222'); await p.waitForTimeout(500);
  check('no signal: the first person (not the last) can still log in', /Staf Contoh/.test(await p.textContent('#who-name') || ''));
  await p.click('#logout'); if (await p.isVisible('#lo-out')) await p.click('#lo-out');

  // 7. office calls stop after the time limit
  await p.unroute(LINK); await p.route(LINK, () => { /* never answers */ });
  const t = await p.evaluate(async l => { const t0 = Date.now(); try { await EA.fetchWait(l, { method: 'POST', body: '{}' }, 800); return 'answered'; } catch (e) { return (Date.now() - t0) < 3000 ? 'stopped' : 'slow'; } }, LINK);
  check('an office call that hangs is stopped after the time limit', t === 'stopped', t);

  // 8. LOAD IT keeps the phone copy when the site does not answer
  const upd = fs.readFileSync(require('path').resolve(__dirname, '..', 'core', 'update.js'), 'utf8');
  check('LOAD IT only drops old copies when the site answers', /if \(!alive\) \{ location\.reload\(\); return; \}/.test(upd));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();

  // 9. office: wrong PINs counted per phone
  const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
  function Sheet(rows) { this.rows = rows; }
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
  Sheet.prototype.appendRow = function (r) { this.rows.push(r.slice()); };
  Sheet.prototype.getRange = function (r, c, nr, nc) { const s = this; return { getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))), setValue: v => { s.rows[r - 1][c - 1] = v; } }; };
  const tabs = {}, props = {}, cache = {};
  const ctx = { SpreadsheetApp: { openById: () => ({ getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = new Sheet([])) }) },
    Utilities: { formatDate: d => d.toISOString().slice(0, 16).replace('T', ' '), getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 's' },
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(x => x > 127 ? x - 256 : x) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { createTextOutput: s => ({ setMimeType: () => s }), MimeType: { JSON: 'json' } }, Session: { getScriptTimeZone: () => 'Etc/GMT' } };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  tabs.USERS = new Sheet([['user_code', 'name', 'role', 'estates', 'key_hash', 'status', 'added_at']]);
  ctx.addUser('STF-SSGT-01', 'Staf Contoh', 'Staff', 'SSGT', '583920');
  const post = o => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ version: 99, action: 'login' }, o)) } }));
  for (let i = 0; i < 25; i++) post({ key: String(100000 + i), phone: 'P66' });
  check('office: 20 wrong PINs lock that phone', post({ key: '583920', phone: 'P66' }).error === 'locked');
  check('office: another phone is not locked out', post({ key: '583920', phone: 'P07' }).ok);
})();
