// E-Book test (1.59) Paitan's 2026 crop history loaded from the two old books (Yu Chen, 13 Nov 2026: "load").
// The lorries from the FFB delivery book and each harvester's own bunch count from the FFB bunches book, every
// row marked "Data lama" and keyed_by IMPORT. The real names are not in the repository, so this test uses
// made-up harvesters and drivers (Rule 8). Running it twice adds nothing, and Sugut is never touched.
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'server', 'core.gs'), 'utf8');
const pad = n => String(n).padStart(2, '0');
function fmt(d, z, f) { const t = new Date(d.getTime() + 8 * 3600e3); return f.replace(/yyyy|MM|dd|HH|mm|ss/g, k => ({ yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()) })[k]); }
const std = ['id', 'date', 'company', 'estate', 'keyed_by', 'keyed_at', 'phone', 'status', 'replaces', 'received_at'];
const cell = v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : v;
function Sheet(rows) { this.rows = rows; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.getLastColumn = function () { return this.rows[0].length; };
Sheet.prototype.appendRow = function (r) { this.rows.push(r.map(cell)); };
Sheet.prototype.getRange = function (r, c, nr, nc) {
  const s = this;
  return {
    getValues: () => s.rows.slice(r - 1, r - 1 + (nr || 1)).map(x => { const y = x.slice(c - 1, c - 1 + (nc || 1)); while (y.length < (nc || 1)) y.push(''); return y; }),
    // the office writes every tab in one go; the sheet keeps a leading ' as "this is text"
    setValues: vals => { vals.forEach((row, i) => { s.rows[r - 1 + i] = row.map(cell); }); }
  };
};
const TABS = {
  LIST_MILLS: ['name', 'kind', 'location', 'note', 'active'],
  LIST_PEOPLE: ['worker_id', 'name', 'job', 'gang', 'sex', 'mandor', 'active'],
  WORKER_LOG: ['worker_id', 'name', 'kind', 'day', 'note', 'answered_by', 'answered_at', 'old_name', 'old_sex', 'new_sex', 'ref'],
  FH_TICKET: ['ticket_no', 'trip', 'mill', 'do_no', 'lorry', 'driver', 'time', 'first_kg', 'second_kg', 'deduct_kg', 'nett_kg', 'nett_mt', 'bunches', 'abw_kg', 'note', 'lorry_bunches', 'mill_bunches', 'rej_ur', 'rej_emp', 'rej_rott', 'rej_mt'],
  FH_TICKET_BLOCK: ['ticket_no', 'block', 'bunches', 'mt'],
  FH_WORK: ['chit', 'worker_id', 'task_code', 'block', 'lot', 'qty', 'unit', 'bunches', 'confirmed_by', 'confirmed_at', 'note', 'bags', 'machine', 'meter_start', 'meter_end', 'hours']
};
function build() {
  const tabs = {};
  Object.keys(TABS).forEach(k => { tabs[k] = new Sheet([std.concat(TABS[k]).concat(['received_at'])]); });
  const put = (tab, vals) => { const h = tabs[tab].rows[0]; const r = h.map(c => vals[c] === undefined ? '' : vals[c]); tabs[tab].rows.push(r); };
  // already in the book: one Paitan harvester with his own code, one mill, and one Sugut lorry
  put('LIST_PEOPLE', { id: 'WK-1', date: '2026-10-20', company: 'SPLT', estate: 'PTAN', keyed_by: 'OWNER', status: 'active', worker_id: 'PTAN001', name: 'Hamid bin Osman', job: 'Penuai', gang: 'Tuai', sex: 'M', active: 'Y' });
  put('LIST_MILLS', { id: 'ML-1', date: '2026-10-20', company: 'SPLT', estate: 'PTAN', keyed_by: 'SEED', status: 'active', name: 'Fortuna', kind: 'mill', active: 'Y' });
  put('FH_TICKET', { id: 'TK-SSGT-1', date: '2026-11-10', company: 'SPLT', estate: 'SSGT', keyed_by: 'SSGT-C01', status: 'active', ticket_no: '900001', nett_mt: 12.5, mill: 'Fortuna' });
  const book = { getSheetByName: n => tabs[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur' };
  const mem = {}, props = {};
  const ctx = {
    console, Date, Utilities: { formatDate: fmt }, SpreadsheetApp: { openById: () => book },
    Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' },
    CacheService: { getScriptCache: () => ({ get: k => mem[k] || null, put: (k, v) => { mem[k] = v; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, getProperties: () => props }) },
    LockService: {}, ContentService: {}, Logger: { log() {} }
  };
  vm.createContext(ctx); vm.runInContext(code, ctx); ctx.book_ = () => book;
  return { ctx, tabs };
}
// Made-up data in the same shape as the real file: 4 lorries and 2 harvesters.
const DATA = {
  tickets: [
    // plain one-block lorry
    '0102|00030321|FOR|7662|SJN8096|Dollah|8.07|5.12|2.95|0|0|0|03:2.95|',
    // two blocks on one lorry, and rejects counted at the mill
    '0524|464609|BOU|5251|SJQ6259|Rahmat|27.84|16.75|11.09|57|12|0|02:5,03:6.09|D2025-05-24',
    // the block is written "1/2" in the book, so there is no split to load
    '0806|466703|BOU|7472|SJQ6259|Rahmat|27.07|16.51|10.56|32|17|0||B1/2',
    // the book used the same ticket number twice on one day
    '0106|00030424-2|SKCC|7675|SJN8096|Dollah|8.48|5.06|3.42|3|4|0|04:3.42|T00030424'
  ],
  work: [
    'Hamid bin Osman|01|2:70,3:100,5:106',
    'Sulaiman bin Deraman|01|2:55,3:160',
    'Sulaiman bin Deraman|05|2:88'
  ]
};
const env = build(), ctx = env.ctx, tabs = env.tabs;
const H = t => tabs[t].rows[0], col = (t, r, k) => r[H(t).indexOf(k)];
const rows = (t, est) => tabs[t].rows.slice(1).filter(r => !est || col(t, r, 'estate') === est);

// --- nothing to load without the data file ---
const none = ctx.importPaitan2026();
check('no data file: nothing is written and it says so', none && none.ok === false && none.error === 'no_data_file' && rows('FH_TICKET', 'PTAN').length === 0, JSON.stringify(none));

ctx.PTAN_OLD_ = DATA;
const out = ctx.importPaitan2026();
const tk = rows('FH_TICKET', 'PTAN'), tb = rows('FH_TICKET_BLOCK', 'PTAN'), wk = rows('FH_WORK', 'PTAN');
const one = (t, no) => rows(t, 'PTAN').filter(r => String(col(t, r, 'ticket_no')) === no)[0];

check('every lorry in the book is loaded', out.tickets === 4 && tk.length === 4, JSON.stringify(out));
check('the block split is loaded, one row per block', out.blocks === 4 && tb.length === 4, 'blocks ' + tb.length);
check('a lorry written "1/2" gets no block row, and the note says why',
  tb.filter(r => String(col('FH_TICKET_BLOCK', r, 'ticket_no')) === '466703').length === 0
  && /petak dalam buku "1\/2"/.test(col('FH_TICKET', one('FH_TICKET', '466703'), 'note')),
  col('FH_TICKET', one('FH_TICKET', '466703'), 'note'));

const t1 = one('FH_TICKET', '00030321');
check('the weights are kept in kg and the nett in tonnes',
  col('FH_TICKET', t1, 'first_kg') === 8070 && col('FH_TICKET', t1, 'second_kg') === 5120 && col('FH_TICKET', t1, 'nett_kg') === 2950 && col('FH_TICKET', t1, 'nett_mt') === 2.95,
  [col('FH_TICKET', t1, 'first_kg'), col('FH_TICKET', t1, 'second_kg'), col('FH_TICKET', t1, 'nett_mt')].join(' '));
check('a ticket number written with a leading zero keeps it', String(col('FH_TICKET', t1, 'ticket_no')) === '00030321', String(col('FH_TICKET', t1, 'ticket_no')));
check('the lorry, the driver, the DO and the date are kept',
  col('FH_TICKET', t1, 'lorry') === 'SJN8096' && col('FH_TICKET', t1, 'driver') === 'Dollah'
  && String(col('FH_TICKET', t1, 'do_no')) === '7662' && col('FH_TICKET', t1, 'date') === '2026-01-02',
  [col('FH_TICKET', t1, 'lorry'), col('FH_TICKET', t1, 'date')].join(' '));

const t2 = one('FH_TICKET', '464609');
check('the mill grading counts are kept as the book has them',
  col('FH_TICKET', t2, 'rej_ur') === 57 && col('FH_TICKET', t2, 'rej_emp') === 12 && col('FH_TICKET', t2, 'rej_rott') === '',
  [col('FH_TICKET', t2, 'rej_ur'), col('FH_TICKET', t2, 'rej_emp')].join(' '));
check('a wrong year in the book is put right, and the book\'s own date is kept in the note',
  col('FH_TICKET', t2, 'date') === '2026-05-24' && /tarikh dalam buku 2025-05-24/.test(col('FH_TICKET', t2, 'note')),
  col('FH_TICKET', t2, 'date') + ' · ' + col('FH_TICKET', t2, 'note'));
check('the two blocks of one lorry add up to its nett tonnes',
  Math.round(tb.filter(r => String(col('FH_TICKET_BLOCK', r, 'ticket_no')) === '464609')
    .reduce((s, r) => s + Number(col('FH_TICKET_BLOCK', r, 'mt')), 0) * 100) / 100 === 11.09, 'split');
check('a ticket number used twice in the book is marked, not overwritten',
  tk.filter(r => /^00030424/.test(String(col('FH_TICKET', r, 'ticket_no')))).length === 1
  && /dipakai dua kali/.test(col('FH_TICKET', one('FH_TICKET', '00030424-2'), 'note')), 'dup');

check('every loaded row is marked IMPORT and "Data lama"',
  tk.concat(tb, wk).every(r => true) && tk.every(r => col('FH_TICKET', r, 'keyed_by') === 'IMPORT' && /^Data lama: /.test(col('FH_TICKET', r, 'note')))
  && wk.every(r => col('FH_WORK', r, 'keyed_by') === 'IMPORT' && /^Data lama: /.test(col('FH_WORK', r, 'note')))
  && tb.every(r => col('FH_TICKET_BLOCK', r, 'keyed_by') === 'IMPORT'), 'marks');
check('the lorry bunch count and the ABW stay empty: the old book never counted them',
  tk.every(r => col('FH_TICKET', r, 'bunches') === '' && col('FH_TICKET', r, 'abw_kg') === '' && col('FH_TICKET', r, 'mill_bunches') === ''), 'bunches');

// --- the mills the book names ---
const ml = rows('LIST_MILLS', 'PTAN');
check('a mill already in the list is not added again, the new ones are',
  out.mills === 2 && ml.length === 3 && ml.filter(r => col('LIST_MILLS', r, 'name') === 'Fortuna').length === 1
  && ml.some(r => col('LIST_MILLS', r, 'name') === 'Boustead (BOU)' && col('LIST_MILLS', r, 'kind') === 'mill')
  && ml.some(r => col('LIST_MILLS', r, 'name') === 'Sri Kamusan CC (SKCC)' && col('LIST_MILLS', r, 'kind') === 'cc'),
  ml.map(r => col('LIST_MILLS', r, 'name')).join(', '));

// --- the harvesters ---
check('a harvester already on the list keeps his own code',
  wk.filter(r => col('FH_WORK', r, 'worker_id') === 'PTAN001').length === 3, 'known man');
const added = rows('LIST_PEOPLE', 'PTAN').filter(r => col('LIST_PEOPLE', r, 'keyed_by') === 'IMPORT');
check('a name only in the old book is added as a "Pekerja lama", not on the muster',
  out.people === 1 && added.length === 1 && col('LIST_PEOPLE', added[0], 'name') === 'Sulaiman bin Deraman'
  && col('LIST_PEOPLE', added[0], 'active') === 'N' && /^PTANB/.test(String(col('LIST_PEOPLE', added[0], 'worker_id'))),
  added.length ? [col('LIST_PEOPLE', added[0], 'worker_id'), col('LIST_PEOPLE', added[0], 'active')].join(' ') : 'none');
check('the new name gets one line in the worker log',
  rows('WORKER_LOG', 'PTAN').length === 1 && /Pekerja lama/.test(col('WORKER_LOG', rows('WORKER_LOG', 'PTAN')[0], 'note')), 'log');
check('one row per harvester per day, with his bunches',
  out.work === 6 && wk.length === 6
  && wk.filter(r => col('FH_WORK', r, 'date') === '2026-01-03').reduce((s, r) => s + Number(col('FH_WORK', r, 'bunches')), 0) === 260,
  'work ' + wk.length);
check('a harvester day is harvesting, and the block stays empty because the book has none',
  wk.every(r => col('FH_WORK', r, 'task_code') === 'HA' && col('FH_WORK', r, 'block') === '' && col('FH_WORK', r, 'lot') === '')
  && /petak tidak direkod/.test(col('FH_WORK', wk[0], 'note')), 'block');
check('2 May is loaded even though the rest of May is blank in the book',
  wk.some(r => col('FH_WORK', r, 'date') === '2026-05-02' && Number(col('FH_WORK', r, 'bunches')) === 88), 'may');

// --- run it twice ---
const again = ctx.importPaitan2026();
check('running it a second time adds nothing',
  again.tickets === 0 && again.blocks === 0 && again.work === 0 && again.people === 0 && again.mills === 0
  && rows('FH_TICKET', 'PTAN').length === 4 && rows('FH_WORK', 'PTAN').length === 6 && rows('LIST_PEOPLE', 'PTAN').length === 2,
  JSON.stringify(again));
check('Sugut is never touched',
  rows('FH_TICKET', 'SSGT').length === 1 && col('FH_TICKET', rows('FH_TICKET', 'SSGT')[0], 'nett_mt') === 12.5
  && rows('FH_WORK', 'SSGT').length === 0, 'sugut');
