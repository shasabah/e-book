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

// The test sheet this script writes into (E-Book TEST sheet).
// At the pilot, this changes to the live sheet's ID.
var SHEET_ID = '1N79YKsFE3CLvR6Z_lcy7clagEydOXhKKeTHI4sA3VWs';
function book_() { return SpreadsheetApp.openById(SHEET_ID); }

var USERS_TAB = 'USERS';
var USER_COLS = ['user_code', 'name', 'role', 'estates', 'key_hash', 'status', 'added_at'];
var ROLES = ['Owner', 'HQ', 'Staff', 'Clerk', 'Mandor', 'Store', 'Worker'];
var ESTATES = ['SDK', 'MELU', 'SSGT', 'PTAN', 'TKRS', 'KWNN'];
var STANDARD_COLS = ['id', 'date', 'company', 'estate', 'keyed_by', 'keyed_at', 'phone', 'status', 'replaces'];
var STATUSES = ['active', 'corrected', 'removed', 'disposed'];

// Each room's tab and its own columns (after the standard ones).
var ROOM_TABS = {
  FH_MUSTER: ['chit', 'block', 'lots', 'mandor', 'worker_id', 'task_code', 'muster', 'confirmed_by', 'confirmed_at', 'note'],
  FH_CHIT:   ['chit', 'rain_mm', 'rain_time', 'working', 'not_working', 'grand_total', 'confirmed_by', 'confirmed_at', 'note']
};

// ---------------- requests ----------------

function doGet() {
  return reply({ ok: true, app: 'E-Book', min_version: MIN_APP_VERSION });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: 'bad_request' }); }
  if (!req || (Number(req.version) || 0) < MIN_APP_VERSION) return reply({ ok: false, error: 'old_version' });

  var user = findUser(req.key);
  if (!user) return reply({ ok: false, error: 'wrong_key' });

  if (req.action === 'login') {
    return reply({ ok: true, user: { code: user.user_code, name: user.name, role: user.role, estates: user.estates } });
  }
  if (req.action === 'save') return reply(saveRow(user, req.tab, req.row));
  if (req.action === 'saveBatch') return reply(saveBatch(user, req.items));
  return reply({ ok: false, error: 'unknown_action' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------- people and keys ----------------

// Keys are never stored as typed. Only a scrambled form (hash) is kept in the
// sheet, mixed with a secret kept in the script settings, not in the sheet.
function hashKey(key) {
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty('KEY_SALT');
  if (!salt) { salt = Utilities.getUuid(); props.setProperty('KEY_SALT', salt); }
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

function findUser(key) {
  if (!/^\d{6}$/.test(String(key || ''))) return null;
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

function saveRow(user, tab, row) {
  if (!tab || tab === USERS_TAB || !row || typeof row !== 'object') return { ok: false, error: 'bad_entry' };
  var sh = book_().getSheetByName(String(tab));
  if (!sh) return { ok: false, error: 'no_tab:' + tab };

  // Checks before writing
  if (!row.id) return { ok: false, error: 'no_id' };
  if (user.estates.indexOf(row.estate) < 0) return { ok: false, error: 'not_your_estate' };
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
      var sh = ss.getSheetByName(name);
      if (!sh || sh.getLastColumn() < 1) return (tabs[name] = null);
      var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var missing = STANDARD_COLS.filter(function (c) { return head.indexOf(c) < 0; });
      var seen = {};
      if (!missing.length && sh.getLastRow() > 1) {
        var n = sh.getLastRow() - 1;
        var ids = sh.getRange(2, head.indexOf('id') + 1, n, 1).getDisplayValues();
        var kb = sh.getRange(2, head.indexOf('keyed_by') + 1, n, 1).getDisplayValues();
        var ka = sh.getRange(2, head.indexOf('keyed_at') + 1, n, 1).getDisplayValues();
        for (var i = 0; i < n; i++) seen[ids[i][0]] = kb[i][0] + '|' + String(ka[i][0]).slice(0, 16);
      }
      return (tabs[name] = { sh: sh, head: head, missing: missing, seen: seen, add: [] });
    }
    items.forEach(function (it) {
      var row = it && it.row, tab = it && it.tab;
      var id = row && row.id;
      function fail(e) { results.push({ id: id || '', ok: false, error: e }); }
      if (!tab || tab === USERS_TAB || !row || typeof row !== 'object') return fail('bad_entry');
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
      if (t && t.add.length) t.sh.getRange(t.sh.getLastRow() + 1, 1, t.add.length, t.head.length).setValues(t.add);
    });
    return { ok: true, results: results };
  } finally {
    lock.releaseLock();
  }
}

// Plain values only: text that starts like a formula is kept as text.
function plain(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v);
  if (/^[=+@]/.test(s)) return "'" + s;
  // Lot numbers like 1-5 would be turned into dates by the sheet; keep them as text.
  if (/^\d+-\d+/.test(s) && !/^\d{4}-\d{2}-\d{2}/.test(s)) return "'" + s;
  // Date and time typed by the phone, kept exactly as sent (used to spot a true resend).
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return "'" + s;
  // Codes with a leading zero, like block 01, would lose the zero; keep them as text.
  if (/^0\d+$/.test(s)) return "'" + s;
  return s;
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
    if (sh.getLastRow() === 0) sh.appendRow(STANDARD_COLS.concat(ROOM_TABS[name], ['received_at']));
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

/** Switch a person off (lost phone, person left). Their rows stay; they can no longer log in. */
function switchOff(code) {
  var sh = book_().getSheetByName(USERS_TAB);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var codes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < codes.length; i++) {
    if (codes[i][0] === code) sh.getRange(i + 2, head.indexOf('status') + 1).setValue('off');
  }
}
