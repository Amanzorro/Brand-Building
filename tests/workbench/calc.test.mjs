import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, calculateRow, findFigure, SCOPE_OF } from "../../assets/js/workbench/calc.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, a + " ≈ " + b);
const P = { start: "2025-01-01", end: "2025-12-31" };
const F = {
  diesel: { id: "f-diesel", activity: "diesel", unit: "L", value: 2.5, status: "cited" },
  grid: { id: "f-grid", activity: "electricity", unit: "kWh", value: 0.4, status: "user-supplied" },
  r410a: { id: "f-r410a", activity: "refrigerant", refrigerant: "R410A", unit: "kg", value: 1924, status: "cited" }
};
const factorFor = (row) => ({ diesel: F.diesel, generator_diesel: F.diesel, electricity: F.grid, refrigerant: F.r410a })[row.source_type] || null;
const row = (id, o) => ({ id, site: "HQ", account_id: "A", document_ref: id, source_type: "electricity", refrigerant_type: "", period_start: "2025-01-01", period_end: "2025-01-31", quantity: 1000, unit: "kWh", ...o });

test("scope mapping", () => {
  assert.equal(SCOPE_OF.diesel, 1);
  assert.equal(SCOPE_OF.petrol, 1);
  assert.equal(SCOPE_OF.generator_diesel, 1);
  assert.equal(SCOPE_OF.refrigerant, 1);
  assert.equal(SCOPE_OF.electricity, 2);
  assert.equal(SCOPE_OF.district_cooling, 2);
  assert.equal(SCOPE_OF.water, null);
});

test("one row: quantity × factor ÷ 1,000, keeping row and factor IDs", () => {
  const r = calculateRow(row("R1", { quantity: 2, unit: "MWh" }), F.grid, P);
  assert.equal(r.status, "included");
  close(r.activity, 2000);
  close(r.t, 0.8);
  assert.equal(r.factorId, "f-grid");
  assert.equal(r.rowId, "R1");
});

test("unit conversion happens before the factor is applied", () => {
  const r = calculateRow(row("R1", { source_type: "generator_diesel", quantity: 100, unit: "US gal", period_end: "2025-01-01" }), F.diesel, P);
  close(r.activity, 378.5411784);
  close(r.t, 378.5411784 * 2.5 / 1000);
});

test("rows partly outside the period are pro-rated by days", () => {
  const r = calculateRow(row("R1", { period_start: "2024-12-17", period_end: "2025-01-15", quantity: 3000 }), F.grid, P);
  assert.equal(r.daysTotal, 30);
  assert.equal(r.daysIn, 15);
  close(r.activity, 1500);
});

test("rows wholly outside, excluded, held, unconvertible or without a factor are not counted", () => {
  assert.equal(calculateRow(row("R1", { period_start: "2026-01-04", period_end: "2026-01-04" }), F.grid, P).status, "outside");
  assert.equal(calculateRow(row("R1", { excluded: true, exclude_reason: "copy" }), F.grid, P).status, "excluded");
  assert.equal(calculateRow(row("R1"), F.grid, P, { status: "held", reason: "x" }).status, "held");
  assert.equal(calculateRow(row("R1", { unit: "gal" }), F.grid, P).status, "unit-error");
  assert.equal(calculateRow(row("R1"), null, P).status, "no-factor");
  const w = calculateRow(row("R1", { source_type: "water", quantity: 5, unit: "m3" }), null, P);
  assert.equal(w.status, "activity-only");
  assert.equal(w.t, 0);
  close(w.activity, 5);
});

test("totals by scope, source and site keep their row IDs and factor IDs", () => {
  const rows = [
    row("R1", { quantity: 1000 }),
    row("R2", { site: "Warehouse", quantity: 500 }),
    row("R3", { source_type: "diesel", quantity: 100, unit: "L", site: "Fleet" }),
    row("R4", { source_type: "refrigerant", refrigerant_type: "R-410A", quantity: 2, unit: "kg", period_end: "2025-01-01" }),
    row("R5", { source_type: "water", quantity: 10, unit: "m3" }),
    row("R6", { excluded: true, quantity: 99999 })
  ];
  const res = calculate(rows, { period: P, factorFor });
  close(res.byScope[0].t, 0.25 + 3.848);
  close(res.byScope[1].t, 0.6);
  close(res.total.t, 0.25 + 3.848 + 0.6);
  assert.deepEqual(res.byScope[1].rowIds, ["R1", "R2"]);
  assert.deepEqual(res.total.factorIds.sort(), ["f-diesel", "f-grid", "f-r410a"]);
  const elec = findFigure(res, "source:electricity");
  assert.deepEqual(elec.notCounted.map((x) => x.rowId), ["R6"]);
  close(elec.activity, 1500);
  const water = findFigure(res, "source:water");
  close(water.activity, 10);
  assert.equal(water.t, 0);
  const hq = findFigure(res, "site:HQ");
  assert.deepEqual(hq.rowIds, ["R1", "R4"]);
  close(findFigure(res, "site:HQ:2").t, 0.4);
  assert.equal(res.counts.excluded, 1);
  assert.equal(res.counts.activityOnly, 1);
});
