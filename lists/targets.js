// Shared list: daily performance targets, per person per day. Owned by HQ.
// From "Daily Performance Standard / Target-2025" (SHA Hup Aik Plantation / Pelita Jujur),
// dated 07 Jan 2025, signed by the General Manager and the Senior Assistant Managers.
// Only the estates' columns are kept here; the management target is in `mgmt`.
// unit: the target's own unit (it can differ from the task's pay unit, e.g. manuring is
// paid by Ha but targeted in bags).
// Not mapped yet (no task code): road side pruning (100 chain), overdue pruning (30 palm),
// manuring Borate 0.1–0.2 kg (2 bags). To add when HQ gives the codes.
window.EA = window.EA || {};
EA.lists = EA.lists || {};
EA.lists.targets = [
  // task     unit     mgmt    SSGT   PTAN   KWNN   TKRS   MELU
  { task: 'HV01', unit: 'MT',   mgmt: 1.5,  by: { SSGT: 1.5,  PTAN: 1.5,  KWNN: 1.5,  TKRS: 1.5,  MELU: 1.5 } },   // Harvesting (FFB)
  { task: 'MT09', unit: 'bag',  mgmt: 20,   by: { SSGT: 20,   PTAN: 20,   KWNN: 20,   TKRS: 20,   MELU: 20 } },    // Loose fruits
  { task: 'FM01', unit: 'palm', mgmt: 20,   by: { SSGT: 20,   PTAN: 20,   KWNN: 20,   TKRS: 20,   MELU: 20 } },    // Abandoned palm pruning
  { task: 'MT01', unit: 'Ha',   mgmt: 0.65, by: { SSGT: 0.58, PTAN: 0.58, KWNN: 0.50, TKRS: 0.58, MELU: 2.50 } },  // Slashing & decreeping (SD)
  { task: 'MT02', unit: 'Ha',   mgmt: 0.65, by: { SSGT: 0.58, PTAN: 0.58, KWNN: 0.50, TKRS: 0.58, MELU: 2.50 } },  // Slashing & decreeping (SD)
  { task: 'MT03', unit: 'Ha',   mgmt: 3.00, by: { SSGT: 2.50, PTAN: 2.50, KWNN: 2.50, TKRS: 2.50, MELU: 3.00 } },  // Circle spraying (CPS)
  { task: 'MT05', unit: 'Ha',   mgmt: 3.50, by: { SSGT: 2.50, PTAN: 2.50, KWNN: 2.00, TKRS: 2.50, MELU: 2.50 } },  // Selective spraying (SS)
  { task: 'MN04', unit: 'bag',  mgmt: 20,   by: { SSGT: 20,   PTAN: 20,   KWNN: 20,   TKRS: 20,   MELU: 20 } },    // Manuring > 2 kg
  { task: 'MN01', unit: 'bag',  mgmt: 15,   by: { SSGT: 15,   PTAN: 15,   KWNN: 15,   TKRS: 15,   MELU: 17 } }     // Manuring < 1.5 kg
];
// The target for one person for a day on this task at this estate, or null.
EA.lists.target = function (task, estate) {
  var t = EA.lists.targets.find(function (x) { return x.task === task; });
  if (!t) return null;
  var v = t.by[estate] != null ? t.by[estate] : t.mgmt;
  return { per: v, unit: t.unit };
};
