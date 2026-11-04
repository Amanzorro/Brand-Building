/* End to end on the demo pack and on the hand-made sample CSV: the same engine the page uses. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { run } from "../../assets/js/workbench/engine.js";
import { COMPANY, DOCUMENTS, HINTS, PERIOD, PLACEHOLDER_FACTORS, ROWS, demoRows } from "../../assets/js/workbench/demo-pack.js";
import { demoExtractor } from "../../assets/js/workbench/extract.js";
import { estimateGap, relatedAccounts } from "../../assets/js/workbench/estimate.js";
import { makeUserFactor } from "../../assets/js/workbench/factors.js";
import { rowsFromCSV, parseCSV } from "../../assets/js/workbench/csv.js";
import { resultsCSV, resultsJSON } from "../../assets/js/workbench/export.js";
import { summaryAR, summaryEN } from "../../assets/js/workbench/summary.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, a + " ≈ " + b);
const lib = JSON.parse(fs.readFileSync(new URL("../../assets/js/workbench/factors.json", import.meta.url), "utf8"));
const FACTORS = [...lib.factors, ...PLACEHOLDER_FACTORS];
const byDoc = (rows, doc) => rows.filter((r) => r.origin.doc === doc);

test("pack: 44 documents, 18 in Arabic, each stamped SYNTHETIC SAMPLE", () => {
  assert.equal(DOCUMENTS.length, 44);
  assert.equal(DOCUMENTS.filter((d) => d.lang === "ar").length, 18);
  assert.ok(DOCUMENTS.every((d) => d.html.includes("SYNTHETIC SAMPLE")));
  assert.ok(ROWS.every((r) => DOCUMENTS.some((d) => d.id === r.origin.doc)), "every row points to a document");
  assert.equal(new Set(ROWS.map((r) => r.id)).size, ROWS.length);
  assert.ok(COMPANY.fictional);
});

test("pack: issuers are generic labels", () => {
  const all = DOCUMENTS.map((d) => d.html).join(" ");
  assert.doesNotMatch(all, /DEWA|Empower|Tabreed|ADNOC|ENOC|Emarat|SEWA|ADDC|Etihad/i);
  assert.match(all, /\(illustrative\)/);
});

test("demoExtractor returns fresh copies of the pre-extracted rows", async () => {
  const a = await demoExtractor.extract();
  a.rows[0].quantity = 1;
  const b = await demoExtractor.extract();
  assert.equal(b.rows[0].quantity, ROWS[0].quantity);
  assert.equal(b.documents.length, 44);
});

test("the Sieve finds every planted problem", () => {
  const rows = demoRows();
  const out = run({ rows, period: PERIOD, factors: FACTORS });
  const has = (check, doc) => out.findings.some((f) => f.check === check && f.rowIds.some((id) => rows.find((r) => r.id === id).origin.doc === doc));
  assert.ok(has("duplicate", "WE-08b"), "duplicate invoice");
  assert.ok(has("period", "GD-05"), "out-of-period delivery note");
  assert.ok(out.findings.some((f) => f.check === "gap" && f.gap.account_id === "DC-7741" && f.gap.start === "2025-03-01" && f.gap.end === "2025-05-31"), "missing cooling months");
  assert.ok(has("outlier", "HC-07"), "implausible July invoice");
  assert.ok(has("unit", "GD-03"), "unit problem");
  assert.ok(out.findings.some((f) => f.id === "factor-placeholder:electricity"));
  assert.equal(out.findings.filter((f) => f.check === "outlier").length, 1, "no false outliers");
  assert.equal(out.effects.provisional, true);
  assert.equal(out.effects.pending.length, 1);
});

test("totals before and after the reviewer's decisions", () => {
  const rows = demoRows();
  const before = run({ rows, period: PERIOD, factors: FACTORS });
  // Hand-checked: diesel 174,400 L × 2.66155 + petrol 7,580 L × 2.33984 + generator 6,400 L × 2.66155 + R-410A 12.5 kg × 1924
  const s1 = (174400 * 2.66155 + 7580 * 2.33984 + 6400 * 2.66155 + 12.5 * 1924) / 1000;
  close(before.result.byScope[0].t, s1);
  // Electricity counted once for August; cooling without the held July invoice
  const elec = [61200, 58900, 64800, 71300, 82600, 94100, 101800, 103200, 92400, 78600, 66300, 60800, 21400, 20100, 22800, 24900, 28700, 31800, 33900, 34200, 30600, 26400, 22900, 21100].reduce((a, b) => a + b, 0);
  const cool = 9800 + 9200 + 21400 + 24100 + 20800 + 15900 + 11800 + 10200;
  close(before.result.byScope[1].t, (elec * 0.4 + cool * 0.38) / 1000);

  // Reviewer fixes the unit on GD-03 (the note says US gallons) and corrects HC-07 per the provider.
  const gd03 = byDoc(rows, "GD-03")[0];
  gd03.unit = "US gal";
  const hc07 = byDoc(rows, "HC-07")[0];
  hc07.quantity = HINTS["HC-07"].suggested;
  const after = run({ rows, period: PERIOD, factors: FACTORS });
  close(after.result.byScope[0].t, s1 + 820 * 3.785411784 * 2.66155 / 1000);
  close(after.result.byScope[1].t, (elec * 0.4 + (cool + 23600) * 0.38) / 1000);
  assert.equal(after.effects.pending.length, 0);
  assert.equal(after.effects.provisional, false);
});

test("keeping the July invoice as invoiced is a recorded decision", () => {
  const rows = demoRows();
  const hc07 = byDoc(rows, "HC-07")[0];
  const out = run({ rows, period: PERIOD, factors: FACTORS, decisions: { ["outlier:" + hc07.id]: { choice: "keep", quantity: 236000, unit: "RTh", reason: "Confirmed by provider" } } });
  assert.equal(out.result.byId.get(hc07.id).status, "included");
  assert.equal(out.effects.pending.length, 0);
});

test("gap filling with the related-account rule covers March to May", () => {
  const rows = demoRows();
  const first = run({ rows, period: PERIOD, factors: FACTORS });
  const gap = first.findings.find((f) => f.check === "gap").gap;
  const held = [...first.effects.skip.keys()];
  const rel = relatedAccounts(rows, gap, held)[0];
  assert.equal(rel.account_id, "2007441981");
  assert.equal(rel.source_type, "electricity");
  const est = estimateGap(rows, gap, { rule: "related-ratio", related: rel, excludeRowIds: held });
  assert.equal(est.rows.length, 3);
  est.rows.forEach((r, i) => rows.push({ ...r, id: "E00" + (i + 1) }));
  const second = run({ rows, period: PERIOD, factors: FACTORS });
  assert.equal(second.findings.filter((f) => f.check === "gap").length, 0);
  assert.ok(second.findings.some((f) => f.check === "estimate"));
  assert.equal(second.result.rows.filter((r) => r.estimate && r.status === "included").length, 3);
});

test("exports carry row IDs, factor IDs and the change log; summaries use the engine's numbers", () => {
  const rows = demoRows();
  const out = run({ rows, period: PERIOD, factors: FACTORS });
  const csv = resultsCSV(rows, out);
  const recs = parseCSV(csv);
  assert.equal(recs.length, rows.length + 1);
  assert.equal(recs[0].fields[0], "row_id");
  const json = JSON.parse(resultsJSON({ meta: { generatedAt: "2026-11-04T00:00:00Z", mode: "demo", company: COMPANY.name }, period: PERIOD, rows, factorsAvailable: FACTORS, choices: {}, decisions: {}, log: [{ rowId: "R001", field: "quantity", old: 1, new: 2, reason: "test" }], thresholds: {}, run: out, summary: {} }));
  assert.equal(json.provisional, true);
  assert.ok(json.totals.total.row_ids.length > 0);
  assert.ok(json.totals.total.factor_ids.includes("uk-desnz-2025-diesel-mineral"));
  assert.equal(json.change_log[0].reason, "test");
  const en = summaryEN({ company: COMPANY.name, period: PERIOD, run: out });
  assert.ok(en.includes((Math.round(out.result.total.t * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1 })));
  assert.match(en, /provisional/);
  const ar = summaryAR({ company_ar: COMPANY.name_ar, period: PERIOD, run: out });
  assert.match(ar, /أولية/);
});

test("hand-made sample CSV runs end to end once grid and cooling factors are supplied", () => {
  const text = fs.readFileSync(new URL("./fixtures/sample-own-data.csv", import.meta.url), "utf8");
  const { rows } = rowsFromCSV(text, "sample-own-data.csv");
  rows.forEach((r, i) => { r.id = "L" + r.origin.line; });
  const first = run({ rows, period: PERIOD, factors: lib.factors });
  assert.ok(first.findings.some((f) => f.id === "factor-missing:electricity"));
  assert.ok(first.findings.some((f) => f.id === "factor-missing:district_cooling"));
  assert.ok(first.findings.some((f) => f.id === "factor-missing:refrigerant:R32") === false, "R-32 is in the library");
  const grid = makeUserFactor("electricity", { value: "0.4", source_title: "Test value" }, "2026-11-04").factor;
  const dc = makeUserFactor("district_cooling", { value: "0.3", source_title: "Test value" }, "2026-11-04").factor;
  const out = run({ rows, period: PERIOD, factors: [...lib.factors, grid, dc] });
  assert.equal(out.effects.provisional, false, out.effects.reasons.join(" "));
  const gen = 240 * 3.785411784 + 610;
  close(out.result.bySource.find((s) => s.source_type === "generator_diesel").activity, gen);
  assert.ok(out.result.total.t > 0);
});
