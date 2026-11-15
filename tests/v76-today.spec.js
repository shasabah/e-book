// E-Book test (1.61) Hari ini for the staff in charge (Yu Chen, 15 Nov 2026: "A for field staff"). The home page
// opens on the day's steps in order, each ticked from what the phone holds, with one big button for the next step.
// Nothing new is keyed. Clerks, managers, HQ and the Owner keep the old home tonight. The milestone card is gone.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let role = 'Staff';
  await p.route('https://script.google.com/**', async rt => {
    const bd = JSON.parse(rt.request().postData() || '{}'); const sw = { testModeOff: true, live: { 'field-harvest': ['SSGT'] }, cleanFrom: '' };
    let o = { ok: true, sw };
    if (bd.action === 'login') o = { ok: true, user: { code: role === 'Staff' ? 'STF-SSGT-01' : 'CLK-SSGT-01', name: 'Contoh', role, estates: ['SSGT'] }, sw };
    else if (bd.action === 'todo') o = { ok: true, estate: 'SSGT', items: [] };
    else o = { ok: false, error: 'busy' };
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  });
  await p.goto('http://localhost:8765/index.html');
  const login = async () => {
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ea.phone', JSON.stringify('P13')); localStorage.setItem('ea.sendLink', JSON.stringify('https://script.google.com/macros/s/X/exec')); });
    await p.reload(); await p.fill('#key', '123456'); await p.waitForSelector('#home:not([hidden])'); await p.waitForTimeout(300);
  };
  await login();
  const steps = () => p.evaluate(() => EA.todaySteps(EA.currentUser(), 'SSGT').map(s => s.k + (s.done ? '✓' : '·')).join(' '));
  check('staff: Hari ini shows on the home page', await p.locator('#today:not([hidden]) .today-card').count() === 1);
  check('six steps in order: rain, chit, work, ramp, close, plan', (await steps()) === 'rain· chit· work· ramp· close· plan·', await steps());
  const btn = await p.innerText('#today-go');
  check('the big button is the first step: HUJAN MALAM TADI (or RAIN LAST NIGHT)', /HUJAN MALAM TADI|RAIN LAST NIGHT/.test(btn), btn);
  check('the milestone card is gone', await p.locator('#plan:not([hidden])').count() === 0);
  // last night's rain answered on the draft → the chit is next
  await p.evaluate(() => { const t = EA.today(); localStorage.setItem('fh.draft2', JSON.stringify({ SSGT: { date: t, estate: 'SSGT', jobs: [], marks: {}, rain_mm: '0', rain_time: '' } })); });
  await p.evaluate(() => EA.renderToday(document.getElementById('today'), EA.currentUser(), 'SSGT'));
  check('rain answered → rain ticked, the chit is next', (await steps()).startsWith('rain✓ chit·') && /CHIT PAGI|MORNING CHIT/.test(await p.innerText('#today-go')), await steps());
  // a saved chit with harvest → work next; ramp waits for a lorry
  await p.evaluate(() => { const t = EA.today();
    localStorage.setItem('fh.chits2', JSON.stringify([{ chit: 'SSGT-T', date: t, estate: 'SSGT', confirmedAt: '06:05', rain_mm: '8', rain_time: '18-24', jobs: [{ key: 'j1', task: 'HA', block: '04' }],
      rows: [{ worker_id: 'W1', muster: 'H', task_code: 'HA' }, { worker_id: 'W2', muster: 'T' }] }])); });
  await p.evaluate(() => EA.renderToday(document.getElementById('today'), EA.currentUser(), 'SSGT'));
  check('chit saved → "1 kerja · 1/2 hadir", work is next', (await steps()).startsWith('rain✓ chit✓ work·') && /KERJA|WORK/.test(await p.innerText('#today-go')) && /1\/2/.test(await p.innerText('#today')), await steps());
  await p.click('#today-go'); await p.waitForTimeout(400);
  check('the big button opens the screen that already exists (#field-harvest/work)', /#field-harvest\/work$/.test(p.url()), p.url());
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(300);
  await p.evaluate(() => { const t = EA.today();
    localStorage.setItem('fh.work', JSON.stringify([{ chit: 'SSGT-T', date: t, estate: 'SSGT', rec: { jobs: [{ task_code: 'HA', status: 'done' }], lines: [] } }]));
    localStorage.setItem('fh.collect', JSON.stringify([{ estate: 'SSGT', date: t, dispatch: { dn: '8652' } }])); });
  await p.evaluate(() => EA.renderToday(document.getElementById('today'), EA.currentUser(), 'SSGT'));
  check('work and a lorry → ramp ticked, close the day is next', (await steps()).startsWith('rain✓ chit✓ work✓ ramp✓ close·'), await steps());
  // closed and planned → every step green, no big button
  await p.evaluate(() => { const t = EA.today(); const d = new Date(t + 'T00:00:00'); let n = new Date(d); do { n.setDate(n.getDate() + 1); } while (n.getDay() === 0);
    const nd = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    localStorage.setItem('fh.dayclose', JSON.stringify([{ id: 'X', estate: 'SSGT', date: t, chit: 'SSGT-T', at: '17:30', rainMm: '0' }]));
    localStorage.setItem('fh.plans', JSON.stringify([{ estate: 'SSGT', date: nd, jobs: [], rows: [] }])); });
  await p.evaluate(() => EA.renderToday(document.getElementById('today'), EA.currentUser(), 'SSGT'));
  check('closed and tomorrow planned → all six ticked, no big button', (await steps()) === 'rain✓ chit✓ work✓ ramp✓ close✓ plan✓' && await p.locator('#today-go').count() === 0, await steps());
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/v76-today.png' });
  // a clerk keeps the old home tonight
  role = 'Clerk'; await login();
  check('clerk: no Hari ini yet (her queue comes in a later slice)', await p.locator('#today:not([hidden])').count() === 0);
  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
})();
