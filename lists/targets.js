// Shared list: daily performance targets, per person per day. Owned by HQ.
// From "Daily Performance Standard / Target-2025" (SHA Hup Aik Plantation / Pelita Jujur),
// dated 07 Jan 2025, signed by the General Manager and the Senior Assistant Managers.
// Only the estates' columns are kept here; the management target is in `mgmt`.
// unit: the target's own unit (it can differ from the task's pay unit, e.g. manuring is
// paid by Ha but targeted in bags).
// Job codes from the company list of 19 Oct 2026. Manuring has one code (MAN): the target
// is 20 bags for > 2 kg; HQ to confirm 15 bags for < 1.5 kg and 2 bags for Borate.
// Road side pruning (100 chain) has no code yet.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.targets = [
  // task     unit     mgmt    SSGT   PTAN   KWNN   TKRS   MELU
  { task: 'HA',   unit: 'MT',   mgmt: 1.5,  by: { SSGT: 1.5,  PTAN: 1.5,  KWNN: 1.5,  TKRS: 1.5,  MELU: 1.5 } },   // Harvesting (FFB)
  { task: 'LF',   unit: 'bag',  mgmt: 20,   by: { SSGT: 20,   PTAN: 20,   KWNN: 20,   TKRS: 20,   MELU: 20 } },    // Loose fruits
  { task: 'AP',   unit: 'palm', mgmt: 20,   by: { SSGT: 20,   PTAN: 20,   KWNN: 20,   TKRS: 20,   MELU: 20 } },    // Abandoned palm pruning
  { task: 'SP',   unit: 'palm', mgmt: 30,   by: { SSGT: 30,   PTAN: 30,   KWNN: 30,   TKRS: 30,   MELU: 30 } },    // Overdue pruning
  { task: 'SL',   unit: 'Ha',   mgmt: 0.65, by: { SSGT: 0.58, PTAN: 0.58, KWNN: 0.50, TKRS: 0.58, MELU: 2.50 } },  // Slashing & decreeping (SD)
  { task: 'DEC',  unit: 'Ha',   mgmt: 0.65, by: { SSGT: 0.58, PTAN: 0.58, KWNN: 0.50, TKRS: 0.58, MELU: 2.50 } },  // Slashing & decreeping (SD)
  { task: 'CPS',  unit: 'Ha',   mgmt: 3.00, by: { SSGT: 2.50, PTAN: 2.50, KWNN: 2.50, TKRS: 2.50, MELU: 3.00 } },  // Circle spraying (CPS)
  { task: 'SS',   unit: 'Ha',   mgmt: 3.50, by: { SSGT: 2.50, PTAN: 2.50, KWNN: 2.00, TKRS: 2.50, MELU: 2.50 } },  // Selective spraying (SS)
  { task: 'MAN',  unit: 'bag',  mgmt: 20,   by: { SSGT: 20,   PTAN: 20,   KWNN: 20,   TKRS: 20,   MELU: 20 } }     // Manuring > 2 kg
];
// The target for one person for a day on this task at this estate, or null.
EA.lists.target = function (task, estate) {
  var t = EA.lists.targets.find(function (x) { return x.task === task; });
  if (!t) return null;
  var v = t.by[estate] != null ? t.by[estate] : t.mgmt;
  return { per: v, unit: t.unit };
};
