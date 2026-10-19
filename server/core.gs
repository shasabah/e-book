/**
 * E-Book (Estate Book) — foundation Google script.
 * Put this on the TEST COPY of the sheet first. Never on the DMS sheet.
 *
 * What it does:
 *  - login: checks a 6-digit key, returns who the person is.
 *  - save:  checks the key again, then writes ONE entry into its tab.
 *  - Writes one entry at a time (a lock), so two phones never overwrite each other.
 *  - The same entry sent twice is only written once (checked by id).
 *  - Nothing is ever deleted. Rows are plain values, never formulas.
 *
 * Deploy as a Web app: Execute as "Me", Who has access "Anyone".
 * When you change this script later: Deploy > Manage deployments > edit the
 * SAME deployment > New version. Never make a new deployment link.
 */

// Oldest app version still accepted. Raise it 30 days after a release.
var MIN_APP_VERSION = 1;
// The harvesting job code (company job code list, 19 Oct 2026). Older rows used HV01.
var HARVEST_CODE = 'HA';

// The test sheet this script writes into (E-Book TEST sheet).
// At the pilot, this changes to the live sheet's ID.
var SHEET_ID = '1N79YKsFE3CLvR6Z_lcy7clagEydOXhKKeTHI4sA3VWs';
// Opened once per request (opening the sheet is the slowest step).
var BOOK_ = null;
function book_() { return BOOK_ || (BOOK_ = SpreadsheetApp.openById(SHEET_ID)); }

var USERS_TAB = 'USERS';
var USER_COLS = ['user_code', 'name', 'role', 'estates', 'key_hash', 'status', 'added_at'];
var ROLES = ['Owner', 'HQ', 'Staff', 'Clerk', 'Mandor', 'Store', 'Worker'];
var ESTATES = ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'];
var STANDARD_COLS = ['id', 'date', 'company', 'estate', 'keyed_by', 'keyed_at', 'phone', 'status', 'replaces'];
var STATUSES = ['active', 'corrected', 'removed', 'disposed'];

// Each room's tab and its own columns (after the standard ones).
var ROOM_TABS = {
  FH_MUSTER: ['chit', 'block', 'lots', 'mandor', 'worker_id', 'task_code', 'muster', 'confirmed_by', 'confirmed_at', 'note'],
  FH_CHIT:   ['chit', 'rain_mm', 'rain_time', 'working', 'not_working', 'grand_total', 'confirmed_by', 'confirmed_at', 'note'],
  FH_WORK:   ['chit', 'worker_id', 'task_code', 'block', 'lot', 'qty', 'unit', 'bunches', 'confirmed_by', 'confirmed_at', 'note'],
  FH_JOBDAY: ['chit', 'task_code', 'block', 'lots', 'workers', 'qty', 'unit', 'bunches', 'plan_ha', 'job_status', 'reason', 'flags', 'confirmed_by', 'confirmed_at', 'progress', 'bags', 'target'],
  FH_COLLECT: ['block', 'lot', 'bunches', 'cleared', 'tractor', 'loader', 'note'],
  FH_DISPATCH: ['bunches', 'lorry', 'mill', 'ramp_cleared', 'note', 'block', 'trip', 'dn_no', 'driver'],
  // The lots ticked on a delivery note: one row per harvester line on the lorry (v19).
  FH_DISPATCH_LOT: ['trip', 'dn_no', 'block', 'lot', 'work_id', 'date_cut', 'worker_id', 'bunches'],
  FH_TICKET: ['ticket_no', 'trip', 'mill', 'do_no', 'lorry', 'driver', 'time', 'first_kg', 'second_kg', 'deduct_kg', 'nett_kg', 'nett_mt',
              'bunches', 'abw_kg', 'note', 'lorry_bunches'],
  // The mill's grading sheet, one row per ticket, keyed by the estate clerk (v16).
  FH_GRADING: ['ticket_no', 'sample', 'mill_bunches', 'g_ur', 'g_udr', 'g_or', 'g_r', 'g_eb', 'g_rt', 'g_ls', 'g_pd', 'g_pf', 'g_ds', 'g_dt', 'g_dr',
               'rej_ur', 'rej_eb', 'rej_rt', 'loose_kg', 'penalty_pct', 'grade_flag'],
  FH_TICKET_BLOCK: ['ticket_no', 'block', 'bunches', 'mt'],
  // source: 'dn' = lots from the delivery note; 'ticket' (or empty, before v19) = lots ticked on the ticket.
  FH_TICKET_HARV: ['ticket_no', 'work_id', 'date_cut', 'block', 'lot', 'worker_id', 'bunches', 'abw_kg', 'mt', 'source'],
  FH_ALERT: ['chit', 'kind', 'block', 'lot', 'detail', 'staff_note', 'direction', 'direction_by', 'ref'],
  // Shared list: people (owned by HR). Name, job, worker code, gender and gang only; never IC,
  // passport, date of birth, bank or pay (Rule 8). Written only by the Owner or HQ (v1.1).
  LIST_PEOPLE: ['worker_id', 'name', 'job', 'gang', 'sex', 'mandor', 'active'],
  // Errors on phones, so the builder can see what went wrong without asking for screenshots.
  APP_ERROR: ['where', 'message', 'stack', 'version', 'agent']
};

// ---------------- requests ----------------

function doGet() {
  return reply({ ok: true, app: 'E-Book', min_version: MIN_APP_VERSION });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: 'bad_request' }); }
  if (!req || (Number(req.version) || 0) < MIN_APP_VERSION) return reply({ ok: false, error: 'old_version' });

  // Too many wrong keys in a short time (someone guessing keys): wait 15 minutes.
  var cache = CacheService.getScriptCache();
  var bad = Number(cache.get('badkeys') || 0);
  if (bad >= 30) return reply({ ok: false, error: 'locked' });
  var user = findUser(req.key);
  if (!user) { cache.put('badkeys', String(bad + 1), 900); return reply({ ok: false, error: 'wrong_key' }); }

  if (req.action === 'login') {
    return reply({ ok: true, user: { code: user.user_code, name: user.name, role: user.role, estates: user.estates } });
  }
  if (req.action === 'save') return reply(saveRow(user, req.tab, req.row));
  if (req.action === 'saveBatch') return reply(saveBatch(user, req.items));
  if (req.action === 'ungraded') {
    if (user.estates.indexOf(req.estate) < 0) return reply({ ok: false, error: 'not_your_estate' });
    return reply(ungraded_(req.estate));
  }
  if (req.action === 'harvest') {
    if (user.estates.indexOf(req.estate) < 0) return reply({ ok: false, error: 'not_your_estate' });
    return reply(openHarvest(req.estate));
  }
  if (req.action === 'trips') {
    if (user.estates.indexOf(req.estate) < 0) return reply({ ok: false, error: 'not_your_estate' });
    return reply(openTrips(req.estate));
  }
  if (req.action === 'people') {
    if (['Owner', 'HQ', 'Staff', 'Clerk'].indexOf(user.role) < 0) return reply({ ok: false, error: 'not_allowed' });
    return reply(people_(user));
  }
  if (req.action === 'history') {
    if (user.estates.indexOf(req.estate) < 0) return reply({ ok: false, error: 'not_your_estate' });
    if (!/^\d{4}-\d{2}$/.test(String(req.month || ''))) return reply({ ok: false, error: 'bad_month' });
    return reply(history_(req.estate, String(req.month)));
  }
  if (req.action === 'backlog') {
    if (user.estates.indexOf(req.estate) < 0) return reply({ ok: false, error: 'not_your_estate' });
    return reply(backlog(req.estate));
  }
  // Users and PIN screen (v1.9): the Owner only.
  if (/^user/.test(String(req.action)) || req.action === 'testOff') return reply(usersAction_(user, req));
  return reply({ ok: false, error: 'unknown_action' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------- people and keys ----------------

// Keys are never stored as typed. Only a scrambled form (hash) is kept in the
// sheet, mixed with a secret kept in the script settings, not in the sheet.
var SALT_ = null;
function hashKey(key) {
  var salt = SALT_;
  if (!salt) {
    var props = PropertiesService.getScriptProperties();
    salt = props.getProperty('KEY_SALT');
    if (!salt) { salt = Utilities.getUuid(); props.setProperty('KEY_SALT', salt); }
    SALT_ = salt;
  }
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + key);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

// Is there already a user with this code? (used so setupTestCopy can be run again safely)
function findUser_(code) {
  var sh = book_().getSheetByName(USERS_TAB);
  if (!sh || sh.getLastRow() < 2) return false;
  var codes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  return codes.some(function (r) { return String(r[0]) === String(code); });
}

// Who owns this key. Remembered for 10 minutes (CacheService) so most requests
// do not read the USERS tab at all. A person switched off is refused within 10 minutes;
// switchOff() also clears the memory at once.
function findUser(key) {
  if (!/^\d{6}$/.test(String(key || ''))) return null;
  var h0 = hashKey(String(key));
  var cache = CacheService.getScriptCache();
  var hit = cache.get('u:' + h0);
  if (hit) return JSON.parse(hit);
  var u = findUserInSheet_(key);
  if (u) cache.put('u:' + h0, JSON.stringify(u), 600);
  return u;
}

function findUserInSheet_(key) {
  var sh = book_().getSheetByName(USERS_TAB);
  if (!sh || sh.getLastRow() < 2) return null;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues();
  var h = hashKey(String(key));
  for (var i = 0; i < rows.length; i++) {
    var u = {};
    head.forEach(function (c, j) { u[c] = rows[i][j]; });
    if (u.key_hash === h && u.status === 'active') {
      u.estates = String(u.estates).split(',').map(function (s) { return s.trim(); }).filter(String);
      return u;
    }
  }
  return null;
}

// ---------------- saving ----------------

// Which roles may write which tabs (v1.3). Only the staff and the clerk key field work for now;
// only the clerk keys the mill ticket and grading; only the Owner or HQ change the shared lists.
// Errors from any phone are always accepted.
var TICKET_TABS = ['FH_TICKET', 'FH_GRADING', 'FH_TICKET_BLOCK', 'FH_TICKET_HARV'];
function canWrite_(user, tab) {
  var r = user.role;
  if (tab === 'APP_ERROR' || tab === 'CHECK') return true;
  if (/^LIST_/.test(tab)) return r === 'Owner' || r === 'HQ';
  if (TICKET_TABS.indexOf(tab) >= 0) return r === 'Clerk' || r === 'Owner' || r === 'HQ';
  if (/^FH_/.test(tab)) return r === 'Staff' || r === 'Clerk' || r === 'Owner' || r === 'HQ';
  return r === 'Owner' || r === 'HQ';
}

function saveRow(user, tab, row) {
  if (!tab || tab === USERS_TAB || !row || typeof row !== 'object') return { ok: false, error: 'bad_entry' };
  var sh = roomTab_(book_(), String(tab));
  if (!sh) return { ok: false, error: 'no_tab:' + tab };

  // Checks before writing
  if (!row.id) return { ok: false, error: 'no_id' };
  if (user.estates.indexOf(row.estate) < 0) return { ok: false, error: 'not_your_estate' };
  if (!canWrite_(user, String(tab))) return { ok: false, error: 'not_allowed' };
  if (STATUSES.indexOf(row.status) < 0) return { ok: false, error: 'bad_status' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.date))) return { ok: false, error: 'bad_date' };
  row.keyed_by = user.user_code;                 // always the person whose key it is
  row.received_at = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'busy' };
  try {
    var lastCol = sh.getLastColumn();
    if (lastCol < 1) return { ok: false, error: 'tab_has_no_header' };
    var head = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var s = 0; s < STANDARD_COLS.length; s++) {
      if (head.indexOf(STANDARD_COLS[s]) < 0) return { ok: false, error: 'tab_missing_col:' + STANDARD_COLS[s] };
    }
    var extra = Object.keys(row).filter(function (k) { return head.indexOf(k) < 0 && k !== 'received_at'; });
    if (extra.length) return { ok: false, error: 'unknown_col:' + extra.join(',') };

    // Same entry sent twice (e.g. signal dropped after saving) is written once.
    var idCol = head.indexOf('id') + 1;
    if (sh.getLastRow() > 1) {
      var found = sh.getRange(2, idCol, sh.getLastRow() - 1, 1)
        .createTextFinder(String(row.id)).matchEntireCell(true).findNext();
      if (found) {
        // Same id: only "already received" if it is truly the same entry (same
        // person, same time keyed). A different entry with the same id means two
        // phones share a phone code: refuse it loudly, never drop it quietly.
        var r = found.getRow();
        var kb = sh.getRange(r, head.indexOf('keyed_by') + 1).getDisplayValue();
        var ka = sh.getRange(r, head.indexOf('keyed_at') + 1).getDisplayValue();
        if (kb === String(row.keyed_by) && ka.slice(0, 16) === String(row.keyed_at).slice(0, 16)) return { ok: true, id: row.id, already: true };
        return { ok: false, error: 'id_clash' };
      }
    }

    var values = head.map(function (c) { return plain(row[c]); });
    sh.appendRow(values);
    return { ok: true, id: row.id };
  } finally {
    lock.releaseLock();
  }
}

// Many entries in one trip (the phone sends everything waiting at once).
// Same checks as saveRow, one lock, each tab read once, new rows written together.
// Answers one result per entry, in order: ok / already / error.
var BATCH_MAX = 100;
var RECENT_ROWS = 5000;            // about 20 days of all estates' muster rows
function daysAgo_(n) { return Utilities.formatDate(new Date(Date.now() - n * 86400000), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd'); }
var TICKETED_ = {};
function ticketed_(estate) {
  if (TICKETED_[estate]) return TICKETED_[estate];
  var m = {}; standingRows_('FH_TICKET', estate).forEach(function (r) { if (r.trip) m[r.trip] = true; });
  return (TICKETED_[estate] = m);
}
function saveBatch(user, items) {
  if (!items || !items.length || items.length > BATCH_MAX) return { ok: false, error: 'bad_batch' };
  var ss = book_();
  var now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: 'busy' };
  try {
    var tabs = {}, results = [];
    function tabInfo(name) {
      if (tabs[name] !== undefined) return tabs[name];
      var sh = roomTab_(ss, name);
      if (!sh || sh.getLastColumn() < 1) return (tabs[name] = null);
      var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var missing = STANDARD_COLS.filter(function (c) { return head.indexOf(c) < 0; });
      var seen = {}, older = {};
      var last = sh.getLastRow();
      if (!missing.length && last > 1) {
        // The recent rows are read with who keyed them and when; the whole id column is read too,
        // so a resend of an old entry (reply lost a long time ago) is never written twice.
        var ci = head.indexOf('id'), cb = head.indexOf('keyed_by'), ca = head.indexOf('keyed_at');
        var w = Math.max(ci, cb, ca) + 1;
        var from = Math.max(2, last - RECENT_ROWS + 1);
        var vals = sh.getRange(from, 1, last - from + 1, w).getDisplayValues();   // one read
        for (var i = 0; i < vals.length; i++) seen[vals[i][ci]] = vals[i][cb] + '|' + String(vals[i][ca]).slice(0, 16);
        if (from > 2) {
          var olderIds = sh.getRange(2, ci + 1, from - 2, 1).getDisplayValues();
          for (var k = 0; k < olderIds.length; k++) older[olderIds[k][0]] = k + 2;
        }
      }
      return (tabs[name] = { sh: sh, head: head, missing: missing, seen: seen, older: older, add: [], last: last });
    }
    items.forEach(function (it) {
      var row = it && it.row, tab = it && it.tab;
      var id = row && row.id;
      function fail(e) { results.push({ id: id || '', ok: false, error: e }); }
      if (!tab || tab === USERS_TAB || !row || typeof row !== 'object') return fail('bad_entry');
      if (!canWrite_(user, String(tab))) return fail('not_allowed');
      // v1.3: a lorry's delivery note cannot be changed once its mill ticket is keyed.
      if ((tab === 'FH_DISPATCH' || tab === 'FH_DISPATCH_LOT') && row.replaces && row.trip && ticketed_(row.estate)[row.trip]) return fail('ticketed');
      var t = tabInfo(String(tab));
      if (!t) return fail('no_tab:' + tab);
      if (t.missing.length) return fail('tab_missing_col:' + t.missing[0]);
      if (!id) return fail('no_id');
      if (user.estates.indexOf(row.estate) < 0) return fail('not_your_estate');
      if (STATUSES.indexOf(row.status) < 0) return fail('bad_status');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.date))) return fail('bad_date');
      row.keyed_by = user.user_code;
      row.received_at = now;
      var extra = Object.keys(row).filter(function (k) { return t.head.indexOf(k) < 0; });
      if (extra.length) return fail('unknown_col:' + extra.join(','));
      var mark = row.keyed_by + '|' + String(row.keyed_at).slice(0, 16);
      // An entry older than the rows read above: its row is read for who keyed it and when.
      if (t.seen[id] === undefined && t.older[id]) {
        var rr = t.older[id];
        t.seen[id] = t.sh.getRange(rr, t.head.indexOf('keyed_by') + 1).getDisplayValue() + '|' +
                     String(t.sh.getRange(rr, t.head.indexOf('keyed_at') + 1).getDisplayValue()).slice(0, 16);
      }
      if (t.seen[id] !== undefined) {
        if (t.seen[id] === mark) { results.push({ id: id, ok: true, already: true }); return; }
        return fail('id_clash');
      }
      t.seen[id] = mark;
      t.add.push(t.head.map(function (c) { return plain(row[c]); }));
      results.push({ id: id, ok: true });
    });
    Object.keys(tabs).forEach(function (name) {
      var t = tabs[name];
      if (t && t.add.length) t.sh.getRange(t.last + 1, 1, t.add.length, t.head.length).setValues(t.add);
    });
    return { ok: true, results: results };
  } finally {
    lock.releaseLock();
  }
}

// ---------------- reading back: crop backlog ----------------
// Rows that still stand: status 'active' and not replaced by a later row.
function standingRows_(tabName, estate) { return readRows_(tabName, estate).standing; }
// All of an estate's rows in a tab (corrections and removed rows too, for History), and the
// rows that still stand.
function readRows_(tabName, estate) {
  var sh = book_().getSheetByName(tabName);
  if (!sh || sh.getLastRow() < 2) return { all: [], standing: [] };
  var vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var head = vals.shift(), replaced = {};
  // Dates the sheet turned into real dates (older rows) come back as text again. The script
  // gets them in its own time zone, so they are read in that zone (any other shifts the day).
  var tz = Session.getScriptTimeZone();
  function txt(v, col) {
    if (Object.prototype.toString.call(v) === '[object Date]') {
      if (col === 'date') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      var hm = Utilities.formatDate(v, tz, 'HH:mm');
      return Utilities.formatDate(v, tz, hm === '00:00' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
    }
    return String(v);
  }
  var rows = vals.map(function (v) { var o = {}; head.forEach(function (c, i) { o[c] = txt(v[i], c); }); return o; });
  rows.forEach(function (r) { if (r.replaces) replaced[r.replaces] = true; });
  var mine = rows.filter(function (r) { return r.estate === estate; });
  return { all: mine, standing: mine.filter(function (r) { return r.status === 'active' && !replaced[r.id]; }) };
}

// ---------- History (v1.7): one month of an estate's days, read only ----------
// Each day: its chits (with the people, and every version: who changed what, when), the day's
// work per job, harvest bunches, lorries and their mill tickets. The phone shows it as it is.
function history_(estate, month) {
  function inM(d) { return String(d).slice(0, 7) === month; }
  function hm(v) { var m = String(v || '').match(/(\d\d:\d\d)$/); return m ? m[1] : ''; }
  var days = {};
  function day(d) { return days[d] || (days[d] = { date: d, chits: [], work: [], harvest: 0, lorries: [], tickets: [] }); }
  var chitT = readRows_('FH_CHIT', estate), mus = readRows_('FH_MUSTER', estate), byChit = {};
  chitT.standing.forEach(function (r) {
    if (!inM(r.date)) return;
    var c = { id: r.chit, at: hm(r.confirmed_at) || hm(r.keyed_at), by: r.keyed_by, rain: r.rain_mm, rows: [], versions: [] };
    byChit[r.chit] = c; day(r.date).chits.push(c);
  });
  mus.standing.forEach(function (r) {
    if (byChit[r.chit]) byChit[r.chit].rows.push({ worker_id: r.worker_id, muster: r.muster, task_code: r.task_code, block: r.block, lots: r.lots, mandor: r.mandor });
  });
  // Versions: every save of a chit writes its rows with one time stamp (confirmed_at).
  var rowById = {}, stamps = {};
  mus.all.forEach(function (r) { rowById[r.id] = r; });
  mus.all.concat(chitT.all).forEach(function (r) {
    if (!byChit[r.chit]) return;
    var k = r.chit + '|' + (r.confirmed_at || r.keyed_at);
    var v = stamps[k] || (stamps[k] = { chit: r.chit, stamp: String(r.confirmed_at || r.keyed_at), at: hm(r.confirmed_at || r.keyed_at), by: r.keyed_by, changes: [] });
    if (r.worker_id === undefined) return;                   // the chit's own row
    var old = r.replaces ? rowById[r.replaces] : null;
    if (r.status === 'removed') v.changes.push({ kind: 'off', w: r.worker_id, task: r.task_code, block: r.block, muster: r.muster });
    else if (old) v.changes.push({ kind: 'move', w: r.worker_id, task: r.task_code, block: r.block, muster: r.muster, from: { task: old.task_code, block: old.block, muster: old.muster } });
    else v.changes.push({ kind: 'add', w: r.worker_id, task: r.task_code, block: r.block, muster: r.muster });
  });
  Object.keys(stamps).map(function (k) { return stamps[k]; }).sort(function (a, b) { return a.stamp < b.stamp ? -1 : 1; })
    .forEach(function (v) {
      var c = byChit[v.chit];
      if (!c.versions.length) v.changes = [];                // the first save is the chit itself, not a change
      c.versions.push({ at: v.at, by: v.by, changes: v.changes });
    });
  readRows_('FH_JOBDAY', estate).standing.forEach(function (r) {
    if (!inM(r.date)) return;
    day(r.date).work.push({ task: r.task_code, block: r.block, lots: r.lots, workers: Number(r.workers) || 0, qty: r.qty, unit: r.unit,
      bunches: r.bunches, status: r.job_status, reason: r.reason, progress: r.progress, target: r.target });
  });
  standingRows_('FH_WORK', estate).forEach(function (r) {
    if (inM(r.date) && r.task_code === HARVEST_CODE) day(r.date).harvest += Number(r.bunches) || 0;
  });
  var trips = {};
  standingRows_('FH_DISPATCH', estate).forEach(function (r) {
    if (!inM(r.date) || !r.trip) return;
    var t = trips[r.trip];
    if (!t) { t = trips[r.trip] = { trip: r.trip, dn: r.dn_no, lorry: r.lorry, mill: r.mill, bunches: 0, ticket: null }; day(r.date).lorries.push(t); }
    t.bunches += Number(r.bunches) || 0;
  });
  standingRows_('FH_TICKET', estate).forEach(function (r) {
    var t = { no: r.ticket_no, trip: r.trip, mt: Number(r.nett_mt) || 0, bunches: Number(r.bunches) || 0, abw: Number(r.abw_kg) || 0, date: r.date };
    if (r.trip && trips[r.trip]) trips[r.trip].ticket = t;
    else if (inM(r.date) && !r.trip) day(r.date).tickets.push(t);
  });
  return { ok: true, estate: estate, month: month, at: Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm'),
           days: Object.keys(days).sort().reverse().map(function (d) { return days[d]; }) };
}

// Field backlog per lot = bunches cut (harvesters, FH_WORK HA) - bunches collected
// to the ramp (FH_COLLECT), counted after the last time the lot was marked cleared.
// Ramp backlog = collected - sent on lorries (FH_DISPATCH), after the ramp was last empty.
function backlog(estate) {
  var cut = standingRows_('FH_WORK', estate).filter(function (r) { return r.task_code === HARVEST_CODE; });
  var col = standingRows_('FH_COLLECT', estate);
  var dis = standingRows_('FH_DISPATCH', estate);
  var now = new Date();
  var b = calcBacklog(cut, col, dis, Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd'));
  return { ok: true, estate: estate, at: Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm'),
           field: b.field, fieldTotal: b.fieldTotal, ramp: b.ramp, checks: b.checks, grading: gradingAlerts_(estate, now), tonnage: tonnageMtd_(estate, now) };
}

// The people list for the user's estates (active only), for the phones' muster and day's work.
function people_(user) {
  var out = [];
  user.estates.forEach(function (est) {
    standingRows_('LIST_PEOPLE', est).forEach(function (r) {
      if (String(r.active).toUpperCase() === 'N') return;
      out.push({ id: r.worker_id, name: r.name, job: r.job, gang: r.gang, sex: r.sex, mdr: String(r.mandor).toUpperCase() === 'Y', estate: est });
    });
  });
  return { ok: true, people: out };
}

// Month-to-date tonnes from the mill tickets, for the morning chit (v22). Counted by the delivery
// note date (the day the crop left the estate); a ticket with no delivery note by its own date.
function tonnageMtd_(estate, now) {
  var month = Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'yyyy-MM');
  var dnDate = {};
  standingRows_('FH_DISPATCH', estate).forEach(function (r) { if (r.trip && (!dnDate[r.trip] || r.date < dnDate[r.trip])) dnDate[r.trip] = r.date; });
  var mt = 0, bunches = 0, n = 0, inMonth = {};
  standingRows_('FH_TICKET', estate).forEach(function (t) {
    var d = String((t.trip && dnDate[t.trip]) || t.date);
    if (d.slice(0, 7) !== month) return;
    mt += Number(t.nett_mt) || 0; bunches += Number(t.bunches) || 0; n++; inMonth[t.ticket_no] = true;
  });
  var blocks = {};
  standingRows_('FH_TICKET_BLOCK', estate).forEach(function (r) {
    if (inMonth[r.ticket_no]) blocks[r.block] = Math.round(((blocks[r.block] || 0) + (Number(r.mt) || 0)) * 1000) / 1000;
  });
  mt = Math.round(mt * 1000) / 1000;
  return { month: month, mt: mt, bunches: bunches, tickets: n, abw: bunches ? Math.round(mt * 100000 / bunches) / 100 : 0, blocks: blocks };
}

// Poor mill gradings (keyed by the clerk) the staff has not yet explained on a morning chit.
function gradingAlerts_(estate, now) {
  var since = Utilities.formatDate(new Date(now.getTime() - 21 * 864e5), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
  var explained = {};
  standingRows_('FH_ALERT', estate).forEach(function (r) { if (r.kind === 'grading' && r.ref && r.staff_note) explained[r.ref] = true; });
  return standingRows_('FH_GRADING', estate).filter(function (r) { return r.grade_flag && r.date >= since && !explained[r.ticket_no]; })
    .map(function (r) { return { ticket_no: r.ticket_no, date: r.date, flag: r.grade_flag }; });
}

// Mill tickets of the last 30 days with no grading yet, for the clerk.
function ungraded_(estate) {
  var since = Utilities.formatDate(new Date(Date.now() - 30 * 864e5), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
  var graded = {};
  standingRows_('FH_GRADING', estate).forEach(function (r) { graded[r.ticket_no] = true; });
  return { ok: true, tickets: standingRows_('FH_TICKET', estate).filter(function (r) { return r.date >= since && !graded[r.ticket_no]; })
    .map(function (r) { return { ticket_no: r.ticket_no, date: r.date, mill: r.mill, nett_mt: Number(r.nett_mt) || 0, do_no: r.do_no }; }) };
}

  // ===== calcBacklog: the same text is in rooms/field/muster.js and server/core.gs =====
  // cut: harvesters' bunches [{date, lot, block, bunches}]
  // col: loader's collection [{date, lot, block, bunches, cleared}]
  // dis: lorry loads [{date, block, bunches, ramp_cleared}]; col and dis may carry keyed_at (or at, HH:mm)
  // Field backlog per lot = cut - collected since the lot was last cleared ("Habis").
  // Count check: when a lot is cleared and the mandor's count and the loader's count
  // since the clearing before differ (last 7 days), or the loader has collected more
  // than was cut. Ramp backlog per block = collected - sent since the ramp was last empty.
  function calcBacklog(cut, col, dis, today) {
    function n(v) { return Number(v) || 0; }
    // Harvest keyed by block only (no lot yet, v1.1) counts as one lot "Blk 03" for that block.
    function asLot(r) { return r.lot ? r : Object.assign({}, r, { lot: r.block ? 'Blk ' + r.block : '' }); }
    cut = cut.map(asLot); col = col.map(asLot);
    function byLot(a, b) { return String(a.lot).localeCompare(String(b.lot), undefined, { numeric: true }); }
    var d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 7);
    var weekAgo = d.toISOString().slice(0, 10);
    var clears = {};
    col.forEach(function (r) {
      if (!r.lot || r.cleared !== 'Y') return;
      var c = clears[r.lot] = clears[r.lot] || [];
      if (c.indexOf(r.date) < 0) c.push(r.date);
    });
    Object.keys(clears).forEach(function (k) { clears[k].sort(); });
    var lots = {};
    function lotOf(r) { return lots[r.lot] || (lots[r.lot] = { lot: r.lot, block: r.block || '', cut: 0, col: 0, wCut: 0, wCol: 0, since: '' }); }
    function place(r) {
      var c = clears[r.lot] || [], last = c.length ? c[c.length - 1] : '', prev = c.length > 1 ? c[c.length - 2] : '';
      if (!last || r.date > last) return 'open';
      return r.date > prev ? 'window' : 'old';
    }
    cut.forEach(function (r) {
      if (!r.lot) return;
      var x = lotOf(r), p = place(r);
      if (p === 'open') { x.cut += n(r.bunches); if (!x.since || r.date < x.since) x.since = r.date; }
      else if (p === 'window') x.wCut += n(r.bunches);
    });
    col.forEach(function (r) {
      if (!r.lot) return;
      var x = lotOf(r), p = place(r);
      if (p === 'open') x.col += n(r.bunches);
      else if (p === 'window') x.wCol += n(r.bunches);
    });
    var field = [], checks = [];
    Object.keys(lots).forEach(function (k) {
      var x = lots[k], c = clears[k] || [], last = c.length ? c[c.length - 1] : '';
      if (x.cut > x.col) field.push({ lot: x.lot, block: x.block, bunches: x.cut - x.col, since: x.since });
      if (x.col > x.cut) checks.push({ lot: x.lot, block: x.block, mandor: x.cut, loader: x.col, cleared: '' });
      if (last && last >= weekAgo && x.wCut !== x.wCol) checks.push({ lot: x.lot, block: x.block, mandor: x.wCut, loader: x.wCol, cleared: last });
    });
    field.sort(byLot); checks.sort(byLot);
    // The ramp is worked out by day AND time keyed (v1.3), so a lorry that empties the ramp
    // at noon does not hide bunches collected later that day, and an earlier lorry the same
    // day is not taken off twice.
    function when(r) { var t = String(r.keyed_at || r.at || ''); return r.date + ' ' + (/\d\d:\d\d$/.test(t) ? t.slice(-5) : '00:00'); }
    var empty = '';
    dis.forEach(function (r) { if (r.ramp_cleared === 'Y' && when(r) > empty) empty = when(r); });
    var blocks = {}, since = '', inAll = 0, outAll = 0;
    function blk(b) { return blocks[b] || (blocks[b] = { block: b, bunches: 0 }); }
    col.forEach(function (r) {
      if (empty && when(r) <= empty) return;
      inAll += n(r.bunches); blk(r.block || '').bunches += n(r.bunches);
      if (n(r.bunches) && (!since || r.date < since)) since = r.date;
    });
    dis.forEach(function (r) {
      if (!empty || when(r) > empty) { outAll += n(r.bunches); blk(r.block || '').bunches -= n(r.bunches); }
    });
    // A lorry keyed without its block (before v12) cannot be split, so then no block list is shown.
    var rampBlocks = blocks[''] && blocks[''].bunches < 0 ? [] : Object.keys(blocks).map(function (k) { return blocks[k]; })
      .filter(function (b) { return b.block && b.bunches > 0; })
      .sort(function (a, b) { return a.block < b.block ? -1 : 1; });
    var ramp = Math.max(0, inAll - outAll);
    return { field: field, fieldTotal: field.reduce(function (a, x) { return a + x.bunches; }, 0),
             ramp: { bunches: ramp, since: ramp ? since : '', blocks: rampBlocks }, checks: checks };
  }
  // ===== end calcBacklog =====

// Harvesters' bunches (FH_WORK, HA) of the last 45 days not yet on a lorry, for the
// delivery note (the staff ticks the lots) and for a ticket whose lorry has no lots ticked.
// A line leaves when it goes on a lorry (FH_DISPATCH_LOT) or is picked on a ticket (FH_TICKET_HARV, not 'dn').
// Which row now stands for an older row: a correction replaces a row with a new id, so
// anything that pointed at the old id (a lorry's lot line, a ticket) is moved to the newest one.
function newestId_(tabName) {
  var sh = book_().getSheetByName(tabName), next = {};
  if (sh && sh.getLastRow() > 1) {
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var ci = head.indexOf('id'), cr = head.indexOf('replaces');
    if (ci >= 0 && cr >= 0) sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(ci, cr) + 1).getValues()
      .forEach(function (v) { if (v[cr]) next[String(v[cr])] = String(v[ci]); });
  }
  return function (id) { var seen = 0; while (next[id] && seen++ < 50) id = next[id]; return id; };
}

function openHarvest(estate) {
  var cut = Utilities.formatDate(new Date(Date.now() - 45 * 864e5), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
  // A line can go on a ticket in parts (part of a lot on one lorry, the rest on the next):
  // what is left is the block's balance and stays open. A harvester's line corrected after it
  // went on a lorry (new id) still counts what went (v1.3).
  var onTicket = {}, newest = newestId_('FH_WORK');
  standingRows_('FH_DISPATCH_LOT', estate).forEach(function (r) { var w = newest(r.work_id); onTicket[w] = (onTicket[w] || 0) + (Number(r.bunches) || 0); });
  standingRows_('FH_TICKET_HARV', estate).forEach(function (r) { if (r.source !== 'dn') { var w = newest(r.work_id); onTicket[w] = (onTicket[w] || 0) + (Number(r.bunches) || 0); } });
  var lines = standingRows_('FH_WORK', estate).filter(function (r) {
    return r.task_code === HARVEST_CODE && Number(r.bunches) > 0 && r.date >= cut;
  }).map(function (r) { return { id: r.id, date: r.date, lot: r.lot, block: r.block, worker_id: r.worker_id, bunches: Number(r.bunches) - (onTicket[r.id] || 0) }; })
    .filter(function (r) { return r.bunches > 0; });
  return { ok: true, lines: lines };
}

// Lorry loads of the last 21 days that have no mill ticket yet, for the ticket screen.
// One lorry = the FH_DISPATCH rows sharing a trip code (one row per block).
function openTrips(estate) {
  var cut = Utilities.formatDate(new Date(Date.now() - 21 * 864e5), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
  var ticketed = {};
  standingRows_('FH_TICKET', estate).forEach(function (r) { if (r.trip) ticketed[r.trip] = true; });
  var trips = {};
  standingRows_('FH_DISPATCH', estate).forEach(function (r) {
    if (!r.trip || r.date < cut || ticketed[r.trip] || !(Number(r.bunches) > 0)) return;
    var x = trips[r.trip] || (trips[r.trip] = { trip: r.trip, date: r.date, lorry: r.lorry, mill: r.mill, dn: r.dn_no || '', driver: r.driver || '', ramp_cleared: r.ramp_cleared || '', blocks: {}, bunches: 0, blockIds: {} });
    x.blocks[r.block] = (x.blocks[r.block] || 0) + Number(r.bunches); x.bunches += Number(r.bunches);
    x.blockIds[r.block] = r.id;     // so a phone can correct this delivery note (new rows replace these)
  });
  // The lots the staff ticked on each delivery note (v19), for the clerk's ticket.
  var lots = {};
  standingRows_('FH_DISPATCH_LOT', estate).forEach(function (r) {
    if (!trips[r.trip]) return;
    (lots[r.trip] = lots[r.trip] || []).push({ id: r.work_id, date: r.date_cut, lot: r.lot, block: r.block, worker_id: r.worker_id, bunches: Number(r.bunches) || 0, row: r.id });
  });
  return { ok: true, trips: Object.keys(trips).map(function (k) { trips[k].lots = lots[k] || []; return trips[k]; }) };
}

// A room's tab, made (or given its new columns) the first time an entry arrives for it,
// so a new screen works without running setupTestCopy by hand. Old rows stay as they are.
function roomTab_(ss, name) {
  var sh = ss.getSheetByName(name);
  var cols = ROOM_TABS[name];
  if (!cols) return sh;
  var want = STANDARD_COLS.concat(cols, ['received_at']);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(want); return sh; }
  if (sh.getLastColumn() < 1) { sh.appendRow(want); return sh; }
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  want.forEach(function (c) { if (head.indexOf(c) < 0) { head.push(c); sh.getRange(1, head.length).setValue(c); } });
  return sh;
}

// Plain values only: text that starts like a formula is kept as text.
function plain(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v);
  // Also a leading minus that is not a number, a tab, or spaces before one of these.
  if (/^[\s]*[=+@]/.test(s) || /^-(?![\d.])/.test(s) || /^\t/.test(s)) return "'" + s;
  // Lot numbers like 1-5 would be turned into dates by the sheet; keep them as text.
  if (/^\d+-\d+/.test(s) && !/^\d{4}-\d{2}-\d{2}/.test(s)) return "'" + s;
  // A date (2026-10-18) is kept as text too, so the sheet never turns it into a date in
  // another time zone and back a day early.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return "'" + s;
  // Date and time typed by the phone, kept exactly as sent (used to spot a true resend).
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return "'" + s;
  // Codes with a leading zero, like block 01, would lose the zero; keep them as text.
  if (/^0\d+$/.test(s)) return "'" + s;
  return s;
}

// ---------------- users and PIN (Owner screen, v1.9) ----------------
// The Owner adds people, makes a new PIN, changes role or estates, switches people off and on,
// and switches off the public test PINs. The office makes each PIN at random and keeps only its
// scrambled form; the PIN goes back to the Owner's phone once. Every change is one line in USERS_LOG.
// Nothing is deleted. Test users (codes T-…) may only make the first real Owner, while none exists.
var USERS_LOG_TAB = 'USERS_LOG';
var USERS_LOG_COLS = ['at', 'by_code', 'by_name', 'action', 'user_code', 'name', 'detail'];
var ROLE_PREFIX = { Owner: 'OWN', HQ: 'HQ', Staff: 'STF', Clerk: 'CLK', Mandor: 'MDR', Store: 'STR', Worker: 'WRK' };

function isTestCode_(code) { return /^T-/.test(String(code)); }

function readUsers_() {
  var sh = book_().getSheetByName(USERS_TAB);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var n = sh.getLastRow() - 1;
  var rows = n > 0 ? sh.getRange(2, 1, n, head.length).getValues() : [];
  return { sh: sh, head: head, list: rows.map(function (r, i) {
    var u = { row: i + 2 };
    head.forEach(function (c, j) { u[c] = r[j]; });
    u.user_code = String(u.user_code); u.status = String(u.status || '');
    return u;
  }) };
}

function realOwner_(list) {
  return list.some(function (u) { return u.role === 'Owner' && u.status === 'active' && !isTestCode_(u.user_code); });
}

function usersOut_(list) {
  return list.map(function (u) {
    var at = u.added_at instanceof Date ? Utilities.formatDate(u.added_at, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm') : String(u.added_at || '').replace(/^'/, '');
    return { code: u.user_code, name: String(u.name), role: String(u.role), estates: String(u.estates).split(',').map(function (s) { return s.trim(); }).filter(String),
             status: u.status, added: at, test: isTestCode_(u.user_code) };
  });
}

// An easy PIN: all one digit, a run up or down, a repeated pair or half, doubled digits (112233).
function weakPin_(pin) {
  return /^(\d)\1{5}$/.test(pin) || '0123456789012'.indexOf(pin) >= 0 || '9876543210987'.indexOf(pin) >= 0 ||
    /^(\d\d)\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin) || /^(\d)\1(\d)\2(\d)\3$/.test(pin);
}
function usedHashes_(list) { var used = {}; list.forEach(function (u) { used[String(u.key_hash)] = true; }); return used; }

// A random 6-digit PIN nobody else has (switched-off people included), and not an easy one.
function newPin_(list) {
  var used = usedHashes_(list);
  for (var tries = 0; tries < 200; tries++) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + ':' + new Date().getTime() + ':' + tries);
    var num = 0;
    for (var i = 0; i < 6; i++) num = (num * 256 + (bytes[i] & 0xff)) % 1000000;
    var pin = ('000000' + num).slice(-6);
    if (weakPin_(pin) || used[hashKey(pin)]) continue;
    return pin;
  }
  throw new Error('no_pin');
}

function logUser_(by, action, u, detail) {
  var ss = book_();
  var sh = ss.getSheetByName(USERS_LOG_TAB);
  if (!sh) { sh = ss.insertSheet(USERS_LOG_TAB); sh.appendRow(USERS_LOG_COLS); }
  var now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
  sh.appendRow([plain(now), plain(by.user_code), plain(by.name), action, plain(u.user_code), plain(u.name), plain(detail || '')]);
}

function forgetCache_(hash) { if (hash) CacheService.getScriptCache().remove('u:' + hash); }

function cleanEstates_(v) {
  var list = (Array.isArray(v) ? v : String(v || '').split(',')).map(function (s) { return String(s).trim(); }).filter(String);
  var out = ESTATES.filter(function (e) { return list.indexOf(e) >= 0; });
  return out.length === list.length && out.length ? out : null;
}

function usersAction_(user, req) {
  if (user.role !== 'Owner') return { ok: false, error: 'not_allowed' };
  // Reading the list needs no lock (faster; v1.9.1).
  if (req.action === 'users') {
    var L = readUsers_().list, tm = isTestCode_(user.user_code), ho = realOwner_(L);
    if (tm && ho) return { ok: false, error: 'test_user' };
    return { ok: true, users: usersOut_(L), me: String(user.user_code), firstOwner: tm && !ho };
  }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: 'busy' }; }
  try {
    var U = readUsers_(), list = U.list, sh = U.sh, head = U.head;
    var col = function (name) { return head.indexOf(name) + 1; };
    var me = list.find(function (u) { return u.user_code === String(user.user_code); });
    var testMe = isTestCode_(user.user_code), haveOwner = realOwner_(list);
    var out = function (extra) {
      var fresh = readUsers_().list;
      return Object.assign({ ok: true, users: usersOut_(fresh), me: String(user.user_code), firstOwner: testMe && !realOwner_(fresh) }, extra || {});
    };
    // Test users: only the list and the first real Owner, while there is none.
    if (testMe) {
      if (haveOwner) return { ok: false, error: 'test_user' };
      if (req.action !== 'users' && !(req.action === 'userAdd' && req.role === 'Owner')) return { ok: false, error: 'first_owner_only' };
    }

    if (req.action === 'userAdd') {
      var name = String(req.name || '').replace(/\s+/g, ' ').trim();
      if (name.length < 2 || name.length > 40) return { ok: false, error: 'bad_name' };
      if (ROLES.indexOf(req.role) < 0) return { ok: false, error: 'bad_role' };
      var est = cleanEstates_(req.estates);
      if (!est) return { ok: false, error: 'bad_estates' };
      var stem = ROLE_PREFIX[req.role] + '-' + (est.length === ESTATES.length ? 'ALL' : est[0]) + '-';
      var n = 1, code;
      do { code = stem + ('0' + n).slice(-2); n++; } while (list.some(function (u) { return u.user_code === code; }));
      var pin = newPin_(list);
      var now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
      var row = head.map(function (c) {
        return { user_code: code, name: plain(name), role: req.role, estates: est.join(','), key_hash: hashKey(pin), status: 'active', added_at: plain(now) }[c];
      }).map(function (v) { return v === undefined ? '' : v; });
      sh.appendRow(row);
      logUser_(user, 'add', { user_code: code, name: name }, req.role + ' · ' + est.join(','));
      return out({ pin: pin, code: code, name: name });
    }

    var t = list.find(function (u) { return u.user_code === String(req.code || ''); });
    if (req.action !== 'testOff') {
      if (!t) return { ok: false, error: 'no_user' };
      if (isTestCode_(t.user_code)) return { ok: false, error: 'test_user_row' };
    }
    var self = t && me && t.user_code === me.user_code;

    if (req.action === 'userPin') {
      if (t.status !== 'active') return { ok: false, error: 'user_off' };
      var p2 = newPin_(list), old = String(t.key_hash);
      sh.getRange(t.row, col('key_hash')).setValue(hashKey(p2));
      forgetCache_(old);
      logUser_(user, 'new_pin', t, self ? 'own PIN' : '');
      return out({ pin: p2, code: t.user_code, name: String(t.name), self: !!self });
    }
    // The Owner types his own PIN (v1.9.1). Others' PINs stay random.
    if (req.action === 'userMyPin') {
      if (!self) return { ok: false, error: 'not_self' };
      var mine = String(req.pin || '');
      if (!/^\d{6}$/.test(mine)) return { ok: false, error: 'bad_pin' };
      // An easy PIN or one someone else has: the same answer, so nobody learns another person's PIN.
      if (weakPin_(mine)) return { ok: false, error: 'pick_another' };
      var h = hashKey(mine);
      if (h === String(t.key_hash)) return { ok: false, error: 'same_pin' };
      if (usedHashes_(list)[h]) return { ok: false, error: 'pick_another' };
      var oldH = String(t.key_hash);
      sh.getRange(t.row, col('key_hash')).setValue(h);
      forgetCache_(oldH);
      logUser_(user, 'own_pin_set', t, '');
      return out({ self: true });
    }
    if (req.action === 'userSet') {
      if (ROLES.indexOf(req.role) < 0) return { ok: false, error: 'bad_role' };
      var e2 = cleanEstates_(req.estates);
      if (!e2) return { ok: false, error: 'bad_estates' };
      if (self && req.role !== 'Owner') return { ok: false, error: 'not_self' };
      var before = t.role + ' · ' + t.estates;
      sh.getRange(t.row, col('role')).setValue(req.role);
      sh.getRange(t.row, col('estates')).setValue(e2.join(','));
      forgetCache_(String(t.key_hash));
      logUser_(user, 'change', t, before + ' → ' + req.role + ' · ' + e2.join(','));
      return out();
    }
    if (req.action === 'userOff') {
      if (self) return { ok: false, error: 'not_self' };
      sh.getRange(t.row, col('status')).setValue('off');
      forgetCache_(String(t.key_hash));
      logUser_(user, 'off', t, String(req.reason || '').slice(0, 80));
      return out();
    }
    if (req.action === 'userOn') {
      sh.getRange(t.row, col('status')).setValue('active');
      forgetCache_(String(t.key_hash));
      logUser_(user, 'on', t, '');
      return out();
    }
    if (req.action === 'testOff') {
      var n2 = 0;
      list.forEach(function (u) {
        if (isTestCode_(u.user_code) && u.status === 'active') {
          sh.getRange(u.row, col('status')).setValue('off'); forgetCache_(String(u.key_hash)); n2++;
        }
      });
      logUser_(user, 'test_off', { user_code: 'T-*', name: 'test PINs' }, n2 + ' off');
      return out({ switchedOff: n2 });
    }
    return { ok: false, error: 'unknown_action' };
  } finally { lock.releaseLock(); }
}

// ---------------- admin, run from the script editor ----------------

/** Run once on the test copy: makes the USERS tab and a CHECK tab for the check page. */
function setupTestCopy() {
  var ss = book_();
  var u = ss.getSheetByName(USERS_TAB) || ss.insertSheet(USERS_TAB);
  if (u.getLastRow() === 0) u.appendRow(USER_COLS);
  var c = ss.getSheetByName('CHECK') || ss.insertSheet('CHECK');
  if (c.getLastRow() === 0) c.appendRow(STANDARD_COLS.concat(['note', 'received_at']));
  Object.keys(ROOM_TABS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) { sh.appendRow(STANDARD_COLS.concat(ROOM_TABS[name], ['received_at'])); return; }
    // A new column added later goes on the end of the header. Old rows stay as they are.
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    STANDARD_COLS.concat(ROOM_TABS[name], ['received_at']).forEach(function (col) {
      if (head.indexOf(col) < 0) { head.push(col); sh.getRange(1, head.length).setValue(col); }
    });
  });
  // Made-up people, same keys as the test copy of the app.
  var people = [
    ['T-OWN', 'Pemilik Ujian',  'Owner',  ESTATES.join(','), '111111'],
    ['T-HQ',  'Ali HQ',         'HQ',     ESTATES.join(','), '222222'],
    ['T-CLK', 'Kerani Sugut',   'Clerk',  'SSGT,PTAN', '333333'],
    ['T-STF', 'Staf Sugut',     'Staff',  'SSGT', '777777'],
    ['T-MDR', 'Mandor Sugut',   'Mandor', 'SSGT', '444444'],
    ['T-STR', 'Stor Meliau',    'Store',  'MELU', '555555'],
    ['T-WRK', 'Pekerja Durian', 'Worker', 'SSGT', '666666']
  ];
  people.forEach(function (p) { if (!findUser_(p[0])) addUser(p[0], p[1], p[2], p[3], p[4]); });
}

/** Add a person. Keys must be different for every person. */
function addUser(code, name, role, estates, key) {
  if (ROLES.indexOf(role) < 0) throw new Error('Role must be one of ' + ROLES.join(', '));
  if (!/^\d{6}$/.test(String(key))) throw new Error('Key must be 6 numbers');
  String(estates).split(',').forEach(function (e) {
    if (ESTATES.indexOf(e.trim()) < 0) throw new Error('Unknown estate: ' + e);
  });
  if (findUser(key)) throw new Error('This key is already used. Pick another.');
  var sh = book_().getSheetByName(USERS_TAB);
  var now = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
  sh.appendRow([code, name, role, estates, hashKey(String(key)), 'active', now]);
}

/** Before the trial: switch off every made-up test key (T-…), so the public test keys open nothing. */
function switchOffTestKeys() {
  ['T-OWN', 'T-HQ', 'T-CLK', 'T-STF', 'T-MDR', 'T-STR', 'T-WRK'].forEach(switchOff);
}

/** Switch a person off (lost phone, person left). Their rows stay; they can no longer log in. */
function switchOff(code) {
  var sh = book_().getSheetByName(USERS_TAB);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var codes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < codes.length; i++) {
    if (codes[i][0] === code) {
      sh.getRange(i + 2, head.indexOf('status') + 1).setValue('off');
      var h = sh.getRange(i + 2, head.indexOf('key_hash') + 1).getValue();
      CacheService.getScriptCache().remove('u:' + h);
    }
  }
}
