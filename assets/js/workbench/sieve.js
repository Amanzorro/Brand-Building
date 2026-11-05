/* Nokhada Workbench — the Sieve: deterministic checks on the activity data.
   Each finding has a severity, the rows it affects, a one-sentence explanation and
   a suggested action. Nothing here guesses: the same rows always give the same
   findings. Pure functions, no DOM. */
import { toCanonical, UNITS } from "./units.js";
import { activityKey, keyLabel } from "./factors.js";
import { SOURCE_LABEL } from "./rows.js";
import { dayNumber, daysInclusive, fmt, fmtExact, fmtPeriod, isoFromDay, median, overlapDays } from "./util.js";

export const DEFAULT_THRESHOLDS = {
  outlierHigh: 3,       // flag a row above this multiple of its account's median
  outlierLow: 0.33,     // … or below this multiple
  minRows: 4,           // rows an account needs before outliers are checked
  gapToleranceDays: 3   // gaps this short are ignored (billing-cycle drift)
};

export const SEVERITY_ORDER = ["decision", "error", "warning", "info"];

export const SEVERITY_LABEL = {
  decision: "Needs your decision",
  error: "Can't be calculated",
  warning: "Check",
  info: "Note"
};

function typeLabel(row) {
  const base = (SOURCE_LABEL[row.source_type] || row.source_type).toLowerCase();
  return row.source_type === "refrigerant" && row.refrigerant_type ? base + " " + row.refrigerant_type : base;
}

function groupKey(row) {
  return [row.account_id, row.source_type, row.refrigerant_type || ""].join("|");
}

function list(ids) {
  if (ids.length <= 2) return ids.join(" and ");
  return ids.slice(0, -1).join(", ") + " and " + ids[ids.length - 1];
}

/* ---------- Duplicates ---------- */
function findDuplicates(rows) {
  const parent = new Map(rows.map((r) => [r.id, r.id]));
  const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const unite = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  const byKey = (fn) => {
    const m = new Map();
    rows.forEach((r) => { const k = fn(r); if (k === null) return; if (!m.has(k)) m.set(k, []); m.get(k).push(r.id); });
    m.forEach((ids) => ids.slice(1).forEach((id) => unite(ids[0], id)));
  };
  byKey((r) => (r.document_ref ? [r.document_ref.toLowerCase(), r.source_type, r.refrigerant_type || "", r.period_start, r.period_end].join("|") : null));
  byKey((r) => (r.account_id ? [groupKey(r), r.period_start, r.period_end, r.quantity, r.unit].join("|") : null));
  const groups = new Map();
  rows.forEach((r) => { const root = find(r.id); if (!groups.has(root)) groups.set(root, []); groups.get(root).push(r); });
  const out = [];
  groups.forEach((g) => {
    if (g.length < 2) return;
    const [keep, ...copies] = g;
    const exact = copies.every((c) => c.document_ref && c.document_ref.toLowerCase() === keep.document_ref.toLowerCase() &&
      c.period_start === keep.period_start && c.period_end === keep.period_end && c.quantity === keep.quantity && c.unit === keep.unit && c.source_type === keep.source_type);
    const ids = g.map((r) => r.id);
    if (exact) {
      out.push({
        id: "duplicate:" + ids.join("+"),
        check: "duplicate",
        severity: "warning",
        rowIds: ids,
        title: "Duplicate document: " + keep.document_ref,
        explanation: list(copies.map((c) => c.id)) + " repeat" + (copies.length === 1 ? "s " : " ") + keep.id + " with the same document reference " + keep.document_ref + ", period and quantity.",
        action: "The copy is left out of the totals. Choose “Count both” only if they are separate charges.",
        autoSetAside: copies.map((c) => c.id),
        keepId: keep.id,
        options: ["count-all"]
      });
    } else {
      const sameRef = g.every((r) => r.document_ref && r.document_ref.toLowerCase() === keep.document_ref.toLowerCase());
      out.push({
        id: "duplicate:" + ids.join("+"),
        check: "duplicate",
        severity: "warning",
        rowIds: ids,
        title: sameRef ? "Same document reference twice: " + keep.document_ref : "Possible duplicate on account " + keep.account_id,
        explanation: sameRef
          ? list(ids) + " share document reference " + keep.document_ref + " and period but differ in quantity or unit."
          : list(ids) + " have the same account, period and quantity under different document references.",
        action: "Open both sources and exclude any copy in the review table.",
        options: ["keep-all"]
      });
    }
  });
  return out;
}

/* ---------- Units ---------- */
function findUnitProblems(rows) {
  const out = [];
  rows.forEach((r) => {
    const c = toCanonical(r.quantity, r.unit, r.source_type);
    if (c.ok) return;
    const ambiguous = /could mean/.test(c.message);
    out.push({
      id: "unit:" + r.id,
      check: "unit",
      severity: "error",
      rowIds: [r.id],
      title: "Unit problem on " + r.id,
      explanation: c.message + " The row can't be converted, so it isn't counted.",
      action: ambiguous
        ? "Check the source document, then edit the unit to the exact one (for example US gal or imp gal)."
        : "Edit the unit to one of: " + Object.keys(UNITS).join(", ") + "."
    });
  });
  return out;
}

/* ---------- Reporting period ---------- */
function findPeriodProblems(rows, period) {
  const out = [];
  rows.forEach((r) => {
    if (!r.period_start || !r.period_end) return;
    const total = daysInclusive(r.period_start, r.period_end);
    const inside = overlapDays(r.period_start, r.period_end, period.start, period.end);
    if (inside === 0) {
      out.push({
        id: "period:" + r.id,
        check: "period",
        severity: "info",
        rowIds: [r.id],
        title: r.id + " is outside the reporting period",
        explanation: r.id + " is dated " + fmtPeriod(r.period_start, r.period_end) + ", outside " + fmtPeriod(period.start, period.end) + ", so it isn't counted.",
        action: "Keep it for the next period's inventory."
      });
    } else if (inside < total) {
      out.push({
        id: "period:" + r.id,
        check: "period",
        severity: "info",
        rowIds: [r.id],
        title: r.id + " runs across the period boundary",
        explanation: inside + " of the " + total + " days in " + r.id + " fall inside the reporting period, so " + fmtExact((inside / total) * 100, 1) + "% of it is counted.",
        action: "No action needed unless the bill should be split another way."
      });
    }
  });
  return out;
}

/* ---------- Missing and overlapping periods ---------- */
export function findCoverage(rows, period, tolerance) {
  const out = [];
  const groups = new Map();
  rows.forEach((r) => {
    if (!r.account_id || !r.period_start || !r.period_end) return;
    if (overlapDays(r.period_start, r.period_end, period.start, period.end) === 0) return;
    const k = groupKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  });
  const pStart = dayNumber(period.start);
  const pEnd = dayNumber(period.end);
  groups.forEach((g) => {
    // Only metered accounts with billing periods are checked; dated deliveries and log entries are not.
    if (!g.every((r) => r.period_end > r.period_start)) return;
    const sorted = g.slice().sort((a, b) => (a.period_start < b.period_start ? -1 : a.period_start > b.period_start ? 1 : 0));
    const first = sorted[0];
    let cursor = pStart;
    let prev = null;
    const gap = (s, e, before, after) => {
      const days = e - s + 1;
      if (days <= tolerance) return;
      const ids = [before, after].filter(Boolean).map((r) => r.id);
      out.push({
        id: "gap:" + groupKey(first) + "|" + isoFromDay(s),
        check: "gap",
        severity: "warning",
        rowIds: ids,
        title: "Missing " + typeLabel(first) + " for account " + first.account_id,
        explanation: "No rows cover " + fmtPeriod(isoFromDay(s), isoFromDay(e)) + " (" + days + " days) for account " + first.account_id + ".",
        action: "Ask the provider for the missing documents, or fill the gap with a labelled estimate.",
        gap: { account_id: first.account_id, source_type: first.source_type, refrigerant_type: first.refrigerant_type || "", site: first.site, unit: first.unit, start: isoFromDay(s), end: isoFromDay(e), days }
      });
    };
    sorted.forEach((r) => {
      const s = Math.max(dayNumber(r.period_start), pStart);
      const e = Math.min(dayNumber(r.period_end), pEnd);
      if (s > cursor) gap(cursor, s - 1, prev, r);
      if (prev) {
        const shared = overlapDays(prev.period_start, prev.period_end, r.period_start, r.period_end);
        if (shared > 1) {
          out.push({
            id: "overlap:" + prev.id + "+" + r.id,
            check: "overlap",
            severity: "warning",
            rowIds: [prev.id, r.id],
            title: "Overlapping periods on account " + r.account_id,
            explanation: prev.id + " and " + r.id + " both cover " + shared + " of the same days for account " + r.account_id + ".",
            action: "Check whether one document replaces the other, and exclude the one that shouldn't count."
          });
        }
      }
      if (!prev || dayNumber(r.period_end) >= dayNumber(prev.period_end)) prev = r;
      cursor = Math.max(cursor, e + 1);
    });
    if (cursor <= pEnd) gap(cursor, pEnd, prev, null);
  });
  return out;
}

/* ---------- Outliers ---------- */
function findOutliers(rows, period, t) {
  const out = [];
  const groups = new Map();
  rows.forEach((r) => {
    if (r.estimate) return;
    if (r.period_start && overlapDays(r.period_start, r.period_end, period.start, period.end) === 0) return;
    const c = toCanonical(r.quantity, r.unit, r.source_type);
    if (!c.ok) return;
    const days = r.period_start && r.period_end ? daysInclusive(r.period_start, r.period_end) : 1;
    const k = groupKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ row: r, value: c.value, unit: c.to, days, rate: c.value / days });
  });
  groups.forEach((g) => {
    if (g.length < t.minRows) return;
    const perDay = g.some((x) => x.days > 1);
    g.forEach((x, i) => {
      const others = g.filter((_, j) => j !== i).map((y) => y.rate);
      const base = median(others);
      if (!base || base <= 0) return;
      const ratio = x.rate / base;
      if (ratio <= t.outlierHigh && ratio >= t.outlierLow) return;
      const expected = base * x.days;
      const r = x.row;
      out.push({
        id: "outlier:" + r.id,
        check: "outlier",
        severity: "decision",
        needsDecision: true,
        rowIds: [r.id],
        title: (ratio > 1 ? "Unusually high " : "Unusually low ") + typeLabel(r) + " on " + r.id,
        explanation: fmt(x.value) + " " + x.unit + " for " + fmtPeriod(r.period_start, r.period_end) + " is " + fmtExact(ratio, 1) + " times the median of account " + r.account_id + "'s other " + (perDay ? "periods, per day" : "rows") + " (about " + fmt(expected) + " " + x.unit + " expected).",
        action: "Check the document, then keep the value, correct it or exclude the row. It stays out of the totals until you decide.",
        outlier: { ratio, expected, value: x.value, unit: x.unit, quantity: r.quantity },
        options: ["keep", "correct", "exclude"]
      });
    });
  });
  return out;
}

/* ---------- Factors ---------- */
function findFactorIssues(rows, factorFor, period) {
  const byKey = new Map();
  rows.forEach((r) => {
    const key = activityKey(r);
    if (!key) return;
    if (r.period_start && overlapDays(r.period_start, r.period_end, period.start, period.end) === 0) return;
    if (!byKey.has(key)) byKey.set(key, { rows: [], factor: factorFor ? factorFor(r) : null });
    byKey.get(key).rows.push(r.id);
  });
  const out = [];
  byKey.forEach((v, key) => {
    const label = keyLabel(key);
    const n = v.rows.length + (v.rows.length === 1 ? " row" : " rows");
    if (!v.factor) {
      out.push({
        id: "factor-missing:" + key, check: "factor", severity: "error", rowIds: v.rows, factorKey: key,
        title: "No factor for " + label,
        explanation: n + " of " + label.toLowerCase() + " can't be calculated because no emission factor is set.",
        action: "Enter a value and its source in step 3."
      });
    } else if (v.factor.status === "placeholder") {
      out.push({
        id: "factor-placeholder:" + key, check: "factor", severity: "warning", rowIds: v.rows, factorKey: key, factorId: v.factor.id,
        title: "Placeholder factor for " + label,
        explanation: n + " use" + (v.rows.length === 1 ? "s" : "") + " a demo placeholder of " + fmtExact(v.factor.value) + " kg CO₂e per " + v.factor.unit + ", which is not an official figure.",
        action: "Replace it with a sourced value in step 3 before using these results."
      });
    } else if (v.factor.status === "user-supplied") {
      out.push({
        id: "factor-user:" + key, check: "factor", severity: "info", rowIds: v.rows, factorKey: key, factorId: v.factor.id,
        title: "Your own factor for " + label,
        explanation: n + " use" + (v.rows.length === 1 ? "s" : "") + " the value you entered, " + fmtExact(v.factor.value) + " kg CO₂e per " + v.factor.unit + ", from “" + v.factor.source_title + "”.",
        action: "Keep a copy of that source with the inventory."
      });
    }
  });
  return out;
}

/* ---------- Quantities and estimates ---------- */
function findQuantityProblems(rows) {
  return rows.filter((r) => typeof r.quantity === "number" && r.quantity < 0).map((r) => ({
    id: "quantity:" + r.id, check: "quantity", severity: "warning", rowIds: [r.id],
    title: "Negative quantity on " + r.id,
    explanation: r.id + " has a quantity of " + fmtExact(r.quantity) + " " + r.unit + ", which reduces the total.",
    action: "Keep it only if it is a credit note that corrects another row in the same period."
  }));
}

function findEstimates(rows) {
  const est = rows.filter((r) => r.estimate);
  if (!est.length) return [];
  const rules = [...new Set(est.map((r) => r.origin && r.origin.ruleText).filter(Boolean))];
  return [{
    id: "estimates", check: "estimate", severity: "info", rowIds: est.map((r) => r.id),
    title: est.length + (est.length === 1 ? " row is an estimate" : " rows are estimates"),
    explanation: "Estimated under: " + rules.join(" "),
    action: "Replace the estimates with real figures when the documents arrive."
  }];
}

/* Runs every check.
   ctx.period      { start, end }
   ctx.factorFor   row → factor or null
   ctx.thresholds  overrides for DEFAULT_THRESHOLDS
   ctx.decisions   { findingId: { choice, quantity?, reason } } */
export function runSieve(rows, ctx) {
  const t = { ...DEFAULT_THRESHOLDS, ...(ctx.thresholds || {}) };
  const decisions = ctx.decisions || {};
  const live = rows.filter((r) => !r.excluded);

  const duplicates = findDuplicates(live.filter((r) => !r.estimate));
  const setAside = new Set();
  duplicates.forEach((f) => {
    const d = decisions[f.id];
    if (f.autoSetAside && !(d && d.choice === "count-all")) f.autoSetAside.forEach((id) => setAside.add(id));
  });
  const counted = live.filter((r) => !setAside.has(r.id));

  const findings = [
    ...findOutliers(counted, ctx.period, t),
    ...findUnitProblems(live),
    ...findFactorIssues(counted, ctx.factorFor, ctx.period),
    ...duplicates,
    ...findCoverage(counted, ctx.period, t.gapToleranceDays),
    ...findQuantityProblems(counted),
    ...findPeriodProblems(counted, ctx.period),
    ...findEstimates(counted)
  ];

  const byId = new Map(rows.map((r) => [r.id, r]));
  findings.forEach((f) => {
    const d = decisions[f.id];
    f.resolved = false;
    if (!d) return;
    if (f.check === "outlier") {
      const row = byId.get(f.rowIds[0]);
      f.resolved = d.choice === "keep" && row && row.quantity === d.quantity && row.unit === d.unit;
    } else if (f.check === "duplicate") {
      f.resolved = true;
    }
    if (f.resolved) f.decision = d;
  });
  findings.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  return findings;
}

/* What the findings mean for the calculation: rows held or set aside, and why
   the totals are provisional. */
export function sieveEffects(findings) {
  const skip = new Map();
  findings.forEach((f) => {
    if (f.check === "outlier" && !f.resolved) {
      f.rowIds.forEach((id) => skip.set(id, { status: "held", reason: "Held out of the totals until you decide on the Sieve finding." }));
    }
    if (f.check === "duplicate" && f.autoSetAside && !(f.decision && f.decision.choice === "count-all")) {
      f.autoSetAside.forEach((id) => skip.set(id, { status: "set-aside", reason: "Duplicate of " + f.keepId + ", counted once." }));
    }
  });
  const pending = findings.filter((f) => f.needsDecision && !f.resolved);
  const errors = findings.filter((f) => f.severity === "error");
  const reasons = [];
  if (pending.length) reasons.push(pending.length + (pending.length === 1 ? " finding needs your decision." : " findings need your decision."));
  errors.forEach((f) => reasons.push(f.title + "."));
  return { skip, pending, errors, provisional: reasons.length > 0, reasons };
}
