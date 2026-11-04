import { test } from "node:test";
import assert from "node:assert/strict";
import { runSieve, sieveEffects } from "../../assets/js/workbench/sieve.js";

const P = { start: "2025-01-01", end: "2025-12-31" };
const grid = { id: "f-grid", activity: "electricity", unit: "kWh", value: 0.4, status: "cited" };
const factorFor = (r) => (r.source_type === "electricity" ? grid : null);
const pad = (n) => String(n).padStart(2, "0");
const last = (m) => pad(new Date(Date.UTC(2025, m, 0)).getUTCDate());
function months(account, qtys, o = {}) {
  return qtys.map((q, i) => q === null ? null : ({
    id: account + "-" + pad(i + 1), site: "HQ", account_id: account, document_ref: account + "/INV" + pad(i + 1), source_type: "electricity", refrigerant_type: "",
    period_start: "2025-" + pad(i + 1) + "-01", period_end: "2025-" + pad(i + 1) + "-" + last(i + 1), quantity: q, unit: "kWh", ...o
  })).filter(Boolean);
}
const full = [100, 95, 110, 120, 140, 160, 170, 175, 150, 130, 110, 100].map((x) => x * 100);
const ids = (fs, check) => fs.filter((f) => f.check === check);

test("clean data gives no warnings", () => {
  const f = runSieve(months("A", full), { period: P, factorFor });
  assert.deepEqual(f.filter((x) => x.severity !== "info"), []);
});

test("duplicate: same document reference, period and quantity is set aside once", () => {
  const rows = months("A", full);
  rows.push({ ...rows[7], id: "COPY" });
  const f = runSieve(rows, { period: P, factorFor });
  const d = ids(f, "duplicate");
  assert.equal(d.length, 1);
  assert.deepEqual(d[0].autoSetAside, ["COPY"]);
  assert.equal(ids(f, "overlap").length, 0, "the copy is not reported twice as an overlap");
  const eff = sieveEffects(f);
  assert.equal(eff.skip.get("COPY").status, "set-aside");
  const counted = runSieve(rows, { period: P, factorFor, decisions: { [d[0].id]: { choice: "count-all" } } });
  assert.equal(sieveEffects(counted).skip.has("COPY"), false);
});

test("duplicate: same account, period and quantity under another reference", () => {
  const rows = months("A", full);
  rows.push({ ...rows[2], id: "OTHER", document_ref: "SCAN-77" });
  const d = ids(runSieve(rows, { period: P, factorFor }), "duplicate");
  assert.equal(d.length, 1);
  assert.deepEqual(d[0].rowIds.sort(), ["A-03", "OTHER"]);
  assert.equal(d[0].autoSetAside, undefined, "not exact, so nothing is set aside automatically");
});

test("missing months are reported as one gap with dates and days", () => {
  const q = full.slice();
  q[2] = q[3] = q[4] = null;
  const g = ids(runSieve(months("A", q), { period: P, factorFor }), "gap");
  assert.equal(g.length, 1);
  assert.equal(g[0].gap.start, "2025-03-01");
  assert.equal(g[0].gap.end, "2025-05-31");
  assert.equal(g[0].gap.days, 92);
  assert.deepEqual(g[0].rowIds, ["A-02", "A-06"]);
});

test("gap at the end of the period, and short gaps within tolerance are ignored", () => {
  const rows = months("A", full.slice(0, 11));
  rows[3].period_end = "2025-04-28";
  const g = ids(runSieve(rows, { period: P, factorFor }), "gap");
  assert.equal(g.length, 1);
  assert.equal(g[0].gap.start, "2025-12-01");
});

test("overlapping periods on one account", () => {
  const rows = months("A", full);
  rows[4].period_start = "2025-04-20";
  const o = ids(runSieve(rows, { period: P, factorFor }), "overlap");
  assert.equal(o.length, 1);
  assert.deepEqual(o[0].rowIds, ["A-04", "A-05"]);
});

test("outside the period, and across the boundary", () => {
  const rows = months("A", full);
  rows.push({ ...rows[0], id: "LATE", document_ref: "X", period_start: "2026-01-04", period_end: "2026-01-04", quantity: 5 });
  rows[0].period_start = "2024-12-17";
  const p = ids(runSieve(rows, { period: P, factorFor }), "period");
  assert.equal(p.length, 2);
  assert.match(p.find((x) => x.rowIds[0] === "LATE").explanation, /outside/);
  assert.match(p.find((x) => x.rowIds[0] === "A-01").explanation, /31 of the 46 days/);
});

test("unrecognised, ambiguous and wrong-dimension units are errors", () => {
  const rows = months("A", full);
  rows[0].unit = "gal";
  rows[1].unit = "litres";
  rows[2].unit = "kWhh";
  const u = ids(runSieve(rows, { period: P, factorFor }), "unit");
  assert.equal(u.length, 3);
  assert.ok(u.every((x) => x.severity === "error"));
  assert.match(u.find((x) => x.rowIds[0] === "A-01").explanation, /could mean US or imperial/);
});

test("outliers against the account median need a decision and hold the row", () => {
  const q = full.slice();
  q[6] = 170000;
  const rows = months("A", q);
  const f = runSieve(rows, { period: P, factorFor });
  const o = ids(f, "outlier");
  assert.equal(o.length, 1);
  assert.equal(o[0].rowIds[0], "A-07");
  assert.equal(o[0].needsDecision, true);
  const eff = sieveEffects(f);
  assert.equal(eff.provisional, true);
  assert.equal(eff.skip.get("A-07").status, "held");
  const kept = runSieve(rows, { period: P, factorFor, decisions: { "outlier:A-07": { choice: "keep", quantity: 170000, unit: "kWh" } } });
  assert.equal(ids(kept, "outlier")[0].resolved, true);
  assert.equal(sieveEffects(kept).provisional, false);
});

test("outlier thresholds are configurable", () => {
  const q = full.slice();
  q[6] = 35000;
  const rows = months("A", q);
  assert.equal(ids(runSieve(rows, { period: P, factorFor }), "outlier").length, 0);
  assert.equal(ids(runSieve(rows, { period: P, factorFor, thresholds: { outlierHigh: 2 } }), "outlier").length, 1);
});

test("factor findings: missing is an error, placeholder a warning, user-supplied a note", () => {
  const rows = months("A", full);
  const none = runSieve(rows, { period: P, factorFor: () => null });
  assert.equal(ids(none, "factor")[0].severity, "error");
  assert.equal(sieveEffects(none).provisional, true);
  const ph = runSieve(rows, { period: P, factorFor: () => ({ ...grid, status: "placeholder" }) });
  assert.equal(ids(ph, "factor")[0].severity, "warning");
  const us = runSieve(rows, { period: P, factorFor: () => ({ ...grid, status: "user-supplied", source_title: "Annual report" }) });
  assert.equal(ids(us, "factor")[0].severity, "info");
});

test("every finding has a severity, rows, one-sentence explanation and an action", () => {
  const q = full.slice();
  q[6] = 170000; q[2] = null;
  const rows = months("A", q);
  rows[0].unit = "gal";
  rows.push({ ...rows[5], id: "COPY" });
  for (const f of runSieve(rows, { period: P, factorFor: () => null })) {
    assert.ok(["decision", "error", "warning", "info"].includes(f.severity), f.id);
    assert.ok(f.rowIds.length > 0, f.id);
    assert.ok(f.explanation && f.action, f.id);
    assert.equal((f.explanation.match(/\.\s+[A-Z]/g) || []).length <= 1, true, f.id + ": " + f.explanation);
  }
});
