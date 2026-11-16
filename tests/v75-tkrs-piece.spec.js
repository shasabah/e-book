// E-Book test (1.68). TKRS is a piece of the Paitan group, not an estate (Brief_Data_Induk 2.2, signed 13 Nov).
// It was still in the estate list, so it could be ticked when making a user and it appeared as its own row on
// the follow-up board. Its land is the PTAN blocks T1–T4, owned by PJSB. Made-up people.
const check = (n, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); if (!ok) process.exitCode = 1; };
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
['lists/estates.js', 'lists/lots.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx));
const L = ctx.EA.lists;

ctx.EA.t = (bm, en) => bm;
const codes = L.estatesLive().map(e => e.code);
check('TKRS is not offered as an estate any more', codes.indexOf('TKRS') < 0, codes.join(','));
check('43 Acres was never an estate', codes.indexOf('43AC') < 0, codes.join(','));
check('the estates offered are HQ, Meliau, Sugut, Paitan, Kawananan', codes.join(',') === 'SDK,MELU,SSGT,PTAN,KWNN', codes.join(','));
check('its name is kept, so an old record reads "Tekara" and not a bare code', L.estateName('TKRS') === 'Tekara', L.estateName('TKRS'));
check('a code nobody knows still reads as itself', L.estateName('XXXX') === 'XXXX', L.estateName('XXXX'));
check('the retired estate says which group took it over', L.estates.filter(e => e.code === 'TKRS')[0].retired === 'PTAN');

// the land is still there, under Paitan, and still PJSB
const t = L.blocksFor('PTAN').filter(b => b.piece === 'TKRS');
check('TKRS land is four Paitan blocks, 34.85 Ha', t.length === 4 && Math.round(t.reduce((s, b) => s + b.ha, 0) * 100) / 100 === 34.85, JSON.stringify(t.map(b => b.block)));
check('TKRS land is owned by PJSB, not SPLT', t.every(b => b.company === 'PJSB'), JSON.stringify(t.map(b => b.company)));
check('the piece lookup still answers for TKRS land', L.pieceOf('PTAN', 'T3').piece === 'TKRS' && L.pieceOf('PTAN', 'T3').company === 'PJSB', JSON.stringify(L.pieceOf('PTAN', 'T3')));
check('Paitan the estate carries the whole group: 236.53 Ha', L.estate('PTAN').ha === 236.53, String(L.estate('PTAN').ha));

// nothing throws when an old record still carries the code (Rule 4: old lines keep what they carry)
check('an old record naming estate TKRS still finds its company, PJSB not SPLT', L.estate('TKRS').company === 'PJSB', JSON.stringify(L.estate('TKRS')));
check('its blocks and lots are empty, so nothing can be keyed to it', L.blocksFor('TKRS').length === 0 && L.lotsFor('TKRS').length === 0);

// the two screens must not keep their own copy of the list (Rule 5): taking TKRS out of the shared list has to
// take it off the estate picker, which is where Yu Chen was still being offered "Tekara" on 16 Nov.
const users = fs.readFileSync(path.join(root, 'core/users.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'core/home.js'), 'utf8');
check('the users screen keeps no estate list of its own', !/\['SDK'/.test(users) && !/EST_NAME\s*=/.test(users));
check('the home screen keeps no estate names of its own', !/EST_NAMES\s*=/.test(home));
check('both read the shared list', /estatesLive\(\)/.test(users) && /estateName\(/.test(home) && /estateName\(/.test(users));
