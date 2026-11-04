import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateGap, relatedAccounts } from "../../assets/js/workbench/estimate.js";
import { findCoverage } from "../../assets/js/workbench/sieve.js";

const P = { start: "2025-01-01", end: "2025-12-31" };
const pad = (n) => String(n).padStart(2, "0");
const last = (m) => pad(new Date(Date.UTC(2025, m, 0)).getUTCDate());
const mk = (account, type, unit, qtys) => qtys.map((q, i) => q === null ? null : ({
  id: account + "-" + pad(i + 1), site: "HQ", account_id: account, document_ref: account + pad(i + 1), source_type: type, refrigerant_type: "",
  period_start: "2025-" + pad(i + 1) + "-01", period_end: "2025-" + pad(i + 1) + "-" + last(i + 1), quantity: q, unit
})).filter(Boolean);

const ELEC = [1000, 1000, 1200, 1300, 1400, 1600, 1700, 1700, 1500, 1300, 1100, 1000];
const COOL = [500, 500, null, null, null, 800, 850, 850, 750, 650, 550, 500];
const rows = [...mk("E", "electricity", "kWh", ELEC), ...mk("C", "district_cooling", "RTh", COOL)];
const gap = findCoverage(rows, P, 3)[0].gap;

test("the gap is found first", () => {
  assert.equal(gap.account_id, "C");
  assert.equal(gap.start, "2025-03-01");
  assert.equal(gap.end, "2025-05-31");
});

test("related-ratio: related account × median ratio, one estimate per related row", () => {
  const rel = relatedAccounts(rows, gap);
  assert.equal(rel[0].account_id, "E");
  const out = estimateGap(rows, gap, { rule: "related-ratio", related: rel[0] });
  assert.equal(out.ok, true);
  assert.equal(out.ratio, 0.5);
  assert.deepEqual(out.rows.map((r) => r.quantity), [600, 650, 700]);
  assert.ok(out.rows.every((r) => r.estimate && r.origin.kind === "estimate" && r.origin.rule === "related-ratio"));
  assert.equal(out.rows[0].origin.basisRowIds[0], "E-03");
  assert.equal(out.rows[0].period_start, "2025-03-01");
});

test("related-ratio leaves out rows held for a decision", () => {
  const odd = rows.map((r) => (r.id === "C-07" ? { ...r, quantity: 8500 } : r));
  const a = estimateGap(odd, gap, { rule: "related-ratio", related: { account_id: "E", source_type: "electricity" }, excludeRowIds: ["C-07"] });
  assert.equal(a.ratio, 0.5);
});

test("daily-average: one estimate per calendar month in the gap", () => {
  const out = estimateGap(rows, gap, { rule: "daily-average" });
  assert.equal(out.ok, true);
  assert.equal(out.rows.length, 3);
  const totalQty = 500 + 500 + 800 + 850 + 850 + 750 + 650 + 550 + 500;
  const totalDays = 31 + 28 + 30 + 31 + 31 + 30 + 31 + 30 + 31;
  assert.equal(out.rows[1].quantity, Math.round((totalQty / totalDays) * 30 * 100) / 100);
  assert.equal(out.rows[1].period_end, "2025-04-30");
  assert.match(out.rows[0].origin.ruleText, /average daily quantity/);
});

test("rules that can't apply say why", () => {
  const lonely = mk("C", "district_cooling", "RTh", COOL);
  assert.equal(estimateGap(lonely, gap, { rule: "related-ratio", related: { account_id: "E", source_type: "electricity" } }).ok, false);
  assert.equal(estimateGap([], gap, { rule: "daily-average" }).ok, false);
  assert.equal(estimateGap(rows, gap, { rule: "guess" }).ok, false);
});
