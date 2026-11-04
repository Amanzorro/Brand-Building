/* Nokhada Workbench — CSV and JSON exports. Pure functions, no DOM. */
import { toCSV } from "./csv.js";
import { COLUMNS } from "./rows.js";

function originText(o) {
  if (!o) return "";
  if (o.kind === "document") return "document " + o.doc + " · " + o.field;
  if (o.kind === "csv") return o.file + " line " + o.line;
  if (o.kind === "estimate") return "estimate · " + o.rule + " · from " + (o.basisRowIds || []).join(" ");
  if (o.kind === "manual") return "entered by hand";
  return o.kind;
}

const RESULT_COLUMNS = ["row_id", ...COLUMNS, "source", "status", "status_reason", "scope", "share_in_period", "activity_in_factor_unit", "activity_unit",
  "factor_id", "factor_value_kgco2e_per_unit", "factor_status", "tco2e", "estimate", "confirmed"];

/* Row-level results, one line per row, in a format spreadsheets open directly. */
export function resultsCSV(rows, run) {
  const out = rows.map((row) => {
    const r = run.result.byId.get(row.id);
    return [
      row.id, ...COLUMNS.map((c) => row[c] == null ? "" : row[c]), originText(row.origin),
      r.status, r.reason, r.scope == null ? "" : r.scope, Number(r.share.toFixed(6)),
      r.canonical ? Number(r.activity.toFixed(6)) : "", r.canonical ? r.canonical.unit : "",
      r.factorId || "", r.factorValue == null ? "" : r.factorValue, r.factorStatus || "",
      r.status === "included" ? Number(r.t.toFixed(6)) : "", row.estimate ? "yes" : "", row.confirmed ? "yes" : ""
    ];
  });
  return "﻿" + toCSV(RESULT_COLUMNS, out);
}

/* Everything needed to reproduce or audit the run. */
export function resultsJSON({ meta, period, rows, factorsAvailable, choices, decisions, log, thresholds, run, summary }) {
  const r = run.result;
  const fig = (x) => ({ id: x.id, tco2e: x.t, row_ids: x.rowIds, factor_ids: x.factorIds });
  return JSON.stringify({
    tool: "Nokhada Workbench (demo edition)",
    generated_at: meta.generatedAt,
    data_source: meta.mode,
    organisation: meta.company || "",
    reporting_period: period,
    provisional: run.effects.provisional,
    provisional_reasons: run.effects.reasons,
    totals: {
      total: fig(r.total),
      scope_1: fig(r.byScope[0]),
      scope_2_location_based: fig(r.byScope[1])
    },
    by_source: r.bySource.map((s) => ({ ...fig(s), source_type: s.source_type, scope: s.scope, activity: s.activity, activity_unit: s.activityUnit, activity_row_ids: s.activityRowIds, not_counted: s.notCounted })),
    by_site: r.bySite.map((s) => ({ site: s.site, ...fig(s), scope_1: fig(s.scope1), scope_2: fig(s.scope2) })),
    rows: rows.map((row) => ({ ...row, result: (({ byId, ...x }) => x)(r.byId.get(row.id)) })),
    factors_used: run.factorsUsed,
    factors_available: factorsAvailable,
    factor_choices: choices,
    sieve_thresholds: thresholds,
    sieve_findings: run.findings.map((f) => ({ id: f.id, check: f.check, severity: f.severity, row_ids: f.rowIds, title: f.title, explanation: f.explanation, action: f.action, resolved: f.resolved, decision: f.decision || null })),
    decisions,
    change_log: log,
    summary
  }, null, 2);
}
