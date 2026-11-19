// E-Book · Meliau 2026: the maintenance work already done, block by block and month by month, loaded once by
// importMeliauWork2026() below (it uses importWorkInto_ in core.gs, as Paitan's load of 13 Nov did). From Christy's
// "Work Programme For Payroll" sheet inside SPLT.MELU Monthly Summary Payroll_10.Oct_261031.SAO.01 (Jan - Oct 2026).
// No names and no money in it: this is land work, not people (Rule 8). Checked against the sheet's own month totals
// and against the October payroll analysis in the same file (circle spray 74.48 Ha, abandoned palms 250).
// Line:  key|block|job code|unit|MM:quantity,...|what the sheet calls it
// Not loaded, because E-Book has nowhere right to put them: loose fruit (the sheet gives tonnes, E-Book counts
// bags), road stone (trips), and poisoning woodies (no job code yet).
var MELU_WORK_2026_ = [
  'CPS-B1|01|CPS|Ha|04:53,08:8.08|Racun bulatan & lorong',
  'CPS-B2|02|CPS|Ha|04:43.97|Racun bulatan & lorong',
  'CPS-B3|03|CPS|Ha|04:18.28,05:23.67,09:16.39,10:25.56|Racun bulatan & lorong',
  'CPS-B4|04|CPS|Ha|05:39.74|Racun bulatan & lorong',
  'CPS-B5|05|CPS|Ha|06:16.54,07:24.74|Racun bulatan & lorong',
  'CPS-B6|06|CPS|Ha|07:14.38,08:46.34,09:11.8,10:48.92|Racun bulatan & lorong',
  'VOPS-B1|01|VOPS|Ha|04:4.72,07:48.28|Racun VOP',
  'VOPS-B2|02|VOPS|Ha|04:4.53,08:15.24|Racun VOP',
  'VOPS-B3|03|VOPS|Ha|04:5.15,08:22.48,09:0.65|Racun VOP',
  'VOPS-B4|04|VOPS|Ha|04:5.2,09:34.54|Racun VOP',
  'VOPS-B5|05|VOPS|Ha|04:5.05,05:36.23|Racun VOP',
  'VOPS-B6|06|VOPS|Ha|04:7.7,05:53.02|Racun VOP',
  'LS-B1|01|LS|Ha|07:53|Racun lalang',
  'LS-B2|02|LS|Ha|08:22.46|Racun lalang',
  'LS-B3|03|LS|Ha|08:20.38|Racun lalang',
  'LS-B5|05|LS|Ha|05:41.28|Racun lalang',
  'LS-B6|06|LS|Ha|05:5.5|Racun lalang',
  'SS-B3|03|SS|Ha|08:5.59|Racun terpilih',
  'SL-B1|01|SL|Ha|01:53|Tebas',
  'SL-B2|02|SL|Ha|01:43.97|Tebas',
  'SL-B3|03|SL|Ha|01:13.3|Tebas',
  'SL-B6|06|SL|Ha|02:32.32|Tebas',
  'MNG-B1|01|MAN|Ha|01:37.48,04:4.22|Membaja NutriGem',
  'MNG-B2|02|MAN|Ha|01:39.01,03:4.96|Membaja NutriGem',
  'MNG-B3|03|MAN|Ha|03:33.31,04:8.64|Membaja NutriGem',
  'MNG-B4|04|MAN|Ha|03:39.74|Membaja NutriGem',
  'MNG-B5|05|MAN|Ha|03:23.07,04:18.21|Membaja NutriGem',
  'MNG-B6|06|MAN|Ha|04:60.72|Membaja NutriGem',
  'MNKB-B1|01|MAN|Ha|04:23.69,05:29.31|Membaja NKB',
  'MNKB-B2|02|MAN|Ha|05:43.97|Membaja NKB',
  'MNKB-B3|03|MAN|Ha|05:41.95|Membaja NKB',
  'MNKB-B4|04|MAN|Ha|05:39.74|Membaja NKB',
  'MNKB-B5|05|MAN|Ha|05:0.31,06:40.97|Membaja NKB',
  'MNKB-B6|06|MAN|Ha|06:0.48,07:60.24|Membaja NKB',
  'MFMP-B1|01|MAN|Ha|08:53|Membaja FMP',
  'MFMP-B2|02|MAN|Ha|08:43.97|Membaja FMP',
  'MFMP-B3|03|MAN|Ha|08:41.95|Membaja FMP',
  'MFMP-B4|04|MAN|Ha|09:39.74|Membaja FMP',
  'MFMP-B5|05|MAN|Ha|08:25.84,09:15.44|Membaja FMP',
  'MFMP-B6|06|MAN|Ha|08:60.72|Membaja FMP',
  'MNK-B1|01|MAN|Ha|09:53|Membaja NK',
  'MNK-B2|02|MAN|Ha|09:5.47,10:38.5|Membaja NK',
  'MNK-B4|04|MAN|Ha|10:15.45|Membaja NK',
  'AP-B1|01|AP|palm|01:78,02:19,03:79,04:80,05:163,06:371,07:388|Cantas pokok terbiar',
  'AP-B2|02|AP|palm|01:11,02:27,03:153,04:70,05:131,06:287,09:25|Cantas pokok terbiar',
  'AP-B3|03|AP|palm|01:176,02:203,03:50,04:18,06:49,08:215,09:120|Cantas pokok terbiar',
  'AP-B4|04|AP|palm|01:9,02:188,03:150,04:95,09:41|Cantas pokok terbiar',
  'AP-B5|05|AP|palm|01:70,02:6,03:61,04:220,05:190,09:69|Cantas pokok terbiar',
  'AP-B6|06|AP|palm|01:6,02:133,03:114,04:746,05:1448,06:878,07:235,08:394,10:250|Cantas pokok terbiar'
];
function importMeliauWork2026() {
  if (typeof MELU_WORK_2026_ === 'undefined' || !MELU_WORK_2026_ || typeof importWorkInto_ !== 'function') {
    Logger.log('importMeliauWork2026: the data or core.gs is not in this project');
    return { ok: false, error: 'no_data_file' };
  }
  var was = PRACTICE_, out = null;
  try {
    PRACTICE_ = false; BOOK_ = null; ROWS_MEMO_ = null;
    out = importWorkInto_('MELU', MELU_WORK_2026_, '2026');
  } finally { PRACTICE_ = was; BOOK_ = null; ROWS_MEMO_ = null; }
  Logger.log('importMeliauWork2026: ' + JSON.stringify(out) + ' (live sheet only)');
  return out;
}
