/* Nokhada Workbench — the inventory calculation.
   tCO2e = quantity (in the factor's unit) × share of the row inside the reporting
   period × factor (kg CO2e per unit) ÷ 1,000. Every result keeps its row IDs and
   factor IDs so it can be traced. Pure functions, no DOM. */
import { toCanonical } from "./units.js";
import { daysInclusive, overlapDays, sum } from "./util.js";
import { SOURCE_LABEL } from "./rows.js";

/* Scope mapping (GHG Protocol): fuels and refrigerants are Scope 1; purchased grid
   electricity and district cooling are Scope 2, location-based; water is activity only. */
export const SCOPE_OF = {
  diesel: 1,
  petrol: 1,
  generator_diesel: 1,
  refrigerant: 1,
  electricity: 2,
  district_cooling: 2,
  water: null
};

export const SOURCE_ORDER = ["diesel", "petrol", "generator_diesel", "refrigerant", "electricity", "district_cooling", "water"];

/* Calculates one row. `skip` (optional) says the row is held or set aside by a check. */
export function calculateRow(row, factor, period, skip) {
  const r = {
    rowId: row.id,
    site: row.site,
    source_type: row.source_type,
    estimate: !!row.estimate,
    scope: SCOPE_OF[row.source_type] ?? null,
    status: "included",
    reason: "",
    share: 1,
    daysIn: null,
    daysTotal: null,
    canonical: null,
    activity: 0,
    factorId: null,
    factorValue: null,
    factorUnit: null,
    factorStatus: null,
    kg: 0,
    t: 0
  };
  const conv = toCanonical(row.quantity, row.unit, row.source_type);
  if (conv.ok) r.canonical = { value: conv.value, unit: conv.to, from: conv.from, multiplier: conv.multiplier };

  if (row.excluded) return { ...r, status: "excluded", reason: row.exclude_reason || "Excluded in review." };
  if (skip) return { ...r, status: skip.status, reason: skip.reason };

  if (period && row.period_start && row.period_end) {
    const total = daysInclusive(row.period_start, row.period_end);
    const inside = overlapDays(row.period_start, row.period_end, period.start, period.end);
    r.daysTotal = total;
    r.daysIn = inside;
    r.share = inside / total;
    if (inside === 0) return { ...r, status: "outside", reason: "Outside the reporting period." };
  }
  if (!conv.ok) return { ...r, status: "unit-error", reason: conv.message };
  r.activity = conv.value * r.share;
  if (r.scope === null) return { ...r, status: "activity-only", reason: "Water is recorded as activity only." };
  if (!factor) return { ...r, status: "no-factor", reason: "No emission factor chosen for this activity." };
  r.factorId = factor.id;
  r.factorValue = factor.value;
  r.factorUnit = factor.unit;
  r.factorStatus = factor.status;
  r.kg = r.activity * factor.value;
  r.t = r.kg / 1000;
  return r;
}

function aggregate(results, extra) {
  const counted = results.filter((r) => r.status === "included");
  return {
    ...extra,
    t: sum(counted.map((r) => r.t)),
    rowIds: counted.map((r) => r.rowId),
    factorIds: [...new Set(counted.map((r) => r.factorId).filter(Boolean))]
  };
}

/* Calculates the inventory.
   opts.period      { start, end } ISO dates
   opts.factorFor   row → factor or null
   opts.skip        Map rowId → { status, reason } for rows held or set aside by the Sieve */
export function calculate(rows, opts = {}) {
  const skip = opts.skip || new Map();
  const results = rows.map((row) => calculateRow(row, opts.factorFor ? opts.factorFor(row) : null, opts.period, skip.get(row.id)));
  const byId = new Map(results.map((r) => [r.rowId, r]));

  const bySource = [];
  SOURCE_ORDER.forEach((st) => {
    const group = results.filter((r) => r.source_type === st);
    if (!group.length) return;
    const counted = group.filter((r) => r.status === "included" || r.status === "activity-only");
    const units = [...new Set(counted.map((r) => r.canonical && r.canonical.unit).filter(Boolean))];
    bySource.push(aggregate(group, {
      id: "source:" + st,
      source_type: st,
      label: SOURCE_LABEL[st],
      scope: SCOPE_OF[st],
      activity: sum(counted.map((r) => r.activity)),
      activityUnit: units[0] || null,
      activityRowIds: counted.map((r) => r.rowId),
      notCounted: group.filter((r) => r.status !== "included" && r.status !== "activity-only").map((r) => ({ rowId: r.rowId, status: r.status, reason: r.reason }))
    }));
  });

  const byScope = [1, 2].map((s) => aggregate(results.filter((r) => r.scope === s), { id: "scope:" + s, scope: s }));

  const sites = [...new Set(rows.map((r) => r.site))];
  const bySite = sites.map((site) => {
    const group = results.filter((r) => r.site === site);
    return aggregate(group, {
      id: "site:" + site,
      site,
      scope1: aggregate(group.filter((r) => r.scope === 1), { id: "site:" + site + ":1" }),
      scope2: aggregate(group.filter((r) => r.scope === 2), { id: "site:" + site + ":2" })
    });
  });

  const total = aggregate(results.filter((r) => r.scope === 1 || r.scope === 2), { id: "total" });
  const count = (status) => results.filter((r) => r.status === status).length;

  return {
    rows: results,
    byId,
    bySource,
    byScope,
    bySite,
    total,
    counts: {
      included: count("included"),
      excluded: count("excluded"),
      held: count("held"),
      setAside: count("set-aside"),
      outside: count("outside"),
      unitError: count("unit-error"),
      noFactor: count("no-factor"),
      activityOnly: count("activity-only")
    }
  };
}

/* Finds any figure in a result by its id: "total", "scope:1", "source:diesel", "site:HQ", "site:HQ:2". */
export function findFigure(result, id) {
  if (id === "total") return result.total;
  for (const list of [result.byScope, result.bySource]) {
    const hit = list.find((x) => x.id === id);
    if (hit) return hit;
  }
  for (const s of result.bySite) {
    if (s.id === id) return s;
    if (s.scope1.id === id) return s.scope1;
    if (s.scope2.id === id) return s.scope2;
  }
  return null;
}
