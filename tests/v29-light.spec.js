// E-Book test (1.19). Lighter on the office: Operasi / History asks the office once when opened
// (and once per month change), never again after each answer (there was a loop). The office script
// answers a clear error instead of Google's error page when something inside goes wrong.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
const fs = require('fs'); const vm = require('vm');
(async () => {
  // office: an error inside doPost comes back as JSON
  const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
  const ctx = { SpreadsheetApp: {}, Utilities: {}, PropertiesService: {}, LockService: {}, Session: {}, console: { error: () => {} },
    CacheService: { getScriptCache: () => { throw new Error('boom'); } },
    ContentService: { createTextOutput: s => ({ setMimeType: () => s }), MimeType: { JSON: 'json' } } };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const out = ctx.doPost({ postData: { contents: JSON.stringify({ version: 43, key: '123456', action: 'login', phone: 'P10' }) } });
  check('office: a problem inside gives a clear answer, not an error page', (() => { try { return JSON.parse(out).error === 'office_error'; } catch (e) { return false; } })(), String(out));

  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 740 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let calls = 0;
  await p.route('https://script.google.com/**', async rt => {
    const body = JSON.parse(rt.request().postData() || '{}');
    if (body.action === 'history') { calls++; return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, at: '2026-10-20 17:00', days: [] }) }); }
    return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'unknown_action' }) });
  });
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P99')); });
  await p.reload(); await p.fill('#key', '888888'); await p.waitForSelector('#home:not([hidden])');
  await p.evaluate(() => localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/TEST/exec')));
  await p.click('[data-room="field-harvest"]'); await p.waitForTimeout(400);
  calls = 0;
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(200);
  await p.click('[data-room="field-harvest"]');
  await p.waitForTimeout(3000);
  check('Operasi open for 3 s: the office is asked once, not in a loop', calls === 1, calls + ' calls');
  calls = 0;
  await p.click('#hs-prev'); await p.waitForTimeout(1500);
  check('changing the month asks once', calls === 1, calls + ' calls');
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
