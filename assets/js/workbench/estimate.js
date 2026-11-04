/* Nokhada Workbench — opt-in gap filling.
   Nothing is estimated unless the user asks. Each estimate row states its rule
   and the rows it was built from, and is labelled as an estimate everywhere.
   Pure functions, no DOM. */
import { toCanonical, CANONICAL_UNIT } from "./units.js";
import { daysInclusive, fmtExact, median, monthSegments, overlapDays, sum } from "./util.js";

export const RULES = {
  "daily-average": {
    label: "Daily average of the same account",
    text: "Gap days × the account's average daily quantity over its other periods in the reporting period."
  },
  "related-ratio": {
    label: "Ratio to a related account at the same site",
    text: "Related account's quantity for the same period × the median ratio between the two accounts in periods where both have documents."
  }
};

function sameGroup(r, gap) {
  return r.account_id === gap.account_id && r.source_type === gap.source_type && (r.refrigerant_type || "") === (gap.refrigerant_type || "");
}

function usable(r, exclude) {
  return !r.excluded && !r.estimate && !exclude.has(r.id);
}

/* Accounts at the gap's site that have rows covering the gap: candidates for the ratio rule. */
export function relatedAccounts(rows, gap, excludeRowIds = []) {
  const exclude = new Set(excludeRowIds);
  const seen = new Map();
  rows.forEach((r) => {
    if (!usable(r, exclude) || r.site !== gap.site || sameGroup(r, gap)) return;
    if (!r.period_start || !r.period_end || overlapDays(r.period_start, r.period_end, gap.start, gap.end) === 0) return;
    const k = r.account_id + "|" + r.source_type;
    if (!seen.has(k)) seen.set(k, { account_id: r.account_id, source_type: r.source_type, key: k });
  });
  // Electricity first: it tracks cooling load most closely.
  return [...seen.values()].sort((a, b) => (a.source_type === "electricity" ? -1 : 0) - (b.source_type === "electricity" ? -1 : 0));
}

/* Builds estimate rows for one gap. Returns { ok, rows, basisRowIds, note } or { ok: false, message }.
   opts.rule            "daily-average" | "related-ratio"
   opts.related         { account_id, source_type } for the ratio rule
   opts.excludeRowIds   rows not to learn from (for example a value held for a decision) */
export function estimateGap(rows, gap, opts) {
  const exclude = new Set(opts.excludeRowIds || []);
  const unit = CANONICAL_UNIT[gap.source_type];
  const own = rows.filter((r) => usable(r, exclude) && sameGroup(r, gap) && r.period_start && r.period_end);
  const base = {
    site: gap.site,
    account_id: gap.account_id,
    document_ref: "",
    source_type: gap.source_type,
    refrigerant_type: gap.refrigerant_type || "",
    unit,
    estimate: true
  };

  if (opts.rule === "daily-average") {
    const pts = own.map((r) => ({ r, c: toCanonical(r.quantity, r.unit, r.source_type) })).filter((x) => x.c.ok);
    if (!pts.length) return { ok: false, message: "The account has no other rows to average." };
    const totalQty = sum(pts.map((x) => x.c.value));
    const totalDays = sum(pts.map((x) => daysInclusive(x.r.period_start, x.r.period_end)));
    const daily = totalQty / totalDays;
    const basis = pts.map((x) => x.r.id);
    const ruleText = RULES["daily-average"].text;
    const out = monthSegments(gap.start, gap.end).map((seg) => {
      const days = daysInclusive(seg.start, seg.end);
      return {
        ...base,
        period_start: seg.start,
        period_end: seg.end,
        quantity: Math.round(daily * days * 100) / 100,
        notes: "Estimate: " + days + " days × " + fmtExact(daily, 2) + " " + unit + " per day.",
        origin: { kind: "estimate", rule: "daily-average", ruleText, basisRowIds: basis, working: days + " days × " + fmtExact(daily, 4) + " " + unit + "/day (" + fmtExact(totalQty, 2) + " " + unit + " over " + totalDays + " days)" }
      };
    });
    return { ok: true, rows: out, basisRowIds: basis, note: "Average of " + basis.length + " rows: " + fmtExact(daily, 2) + " " + unit + " per day." };
  }

  if (opts.rule === "related-ratio") {
    if (!opts.related) return { ok: false, message: "Choose a related account." };
    const rel = rows.filter((r) => usable(r, exclude) && r.account_id === opts.related.account_id && r.source_type === opts.related.source_type && r.site === gap.site);
    const relC = (r) => toCanonical(r.quantity, r.unit, r.source_type);
    const ratios = [];
    const basis = [];
    own.forEach((r) => {
      const twin = rel.find((x) => x.period_start === r.period_start && x.period_end === r.period_end);
      if (!twin) return;
      const a = toCanonical(r.quantity, r.unit, r.source_type);
      const b = relC(twin);
      if (!a.ok || !b.ok || b.value <= 0) return;
      ratios.push(a.value / b.value);
      basis.push(r.id, twin.id);
    });
    if (ratios.length < 2) return { ok: false, message: "Fewer than two periods have documents for both accounts, so no ratio can be set." };
    const ratio = median(ratios);
    const inGap = rel.filter((x) => x.period_start >= gap.start && x.period_end <= gap.end);
    if (!inGap.length) return { ok: false, message: "The related account has no rows inside the gap." };
    const ruleText = RULES["related-ratio"].text;
    const out = inGap.map((x) => {
      const c = relC(x);
      return {
        ...base,
        period_start: x.period_start,
        period_end: x.period_end,
        quantity: Math.round(c.value * ratio * 100) / 100,
        notes: "Estimate: " + x.id + " × median ratio " + fmtExact(ratio, 4) + ".",
        origin: { kind: "estimate", rule: "related-ratio", ruleText, basisRowIds: [x.id, ...basis], working: fmtExact(c.value, 2) + " " + c.to + " (" + x.id + ") × " + fmtExact(ratio, 4) + " (median of " + ratios.length + " paired periods)" }
      };
    });
    return { ok: true, rows: out, basisRowIds: basis, ratio, note: "Median ratio " + fmtExact(ratio, 4) + " from " + ratios.length + " paired periods." };
  }

  return { ok: false, message: "Unknown rule." };
}
