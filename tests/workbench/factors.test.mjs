import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { activityKey, candidatesFor, chooseFactor, makeUserFactor, normaliseRefrigerant, validateLibrary } from "../../assets/js/workbench/factors.js";
import { PLACEHOLDER_FACTORS } from "../../assets/js/workbench/demo-pack.js";

const lib = JSON.parse(fs.readFileSync(new URL("../../assets/js/workbench/factors.json", import.meta.url), "utf8"));

test("the factor library is valid", () => {
  assert.deepEqual(validateLibrary(lib), []);
  assert.deepEqual(validateLibrary({ factors: PLACEHOLDER_FACTORS }), []);
});

test("the library holds no grid electricity or district cooling default", () => {
  assert.equal(lib.factors.filter((f) => f.activity === "electricity" || f.activity === "district_cooling").length, 0);
});

test("every cited factor names its source, publisher, version, gas basis and retrieval date", () => {
  for (const f of lib.factors.filter((x) => x.status === "cited")) {
    assert.match(f.url, /^https:\/\/www\.gov\.uk\//, f.id);
    assert.match(f.gas_basis, /AR5/, f.id + " records which IPCC assessment report");
    assert.ok(f.publisher && f.version && f.retrieved && f.source_ref, f.id);
  }
});

test("demo placeholders are marked placeholder", () => {
  assert.ok(PLACEHOLDER_FACTORS.every((f) => f.status === "placeholder"));
});

test("refrigerant names are normalised", () => {
  assert.equal(normaliseRefrigerant("R-410A"), "R410A");
  assert.equal(normaliseRefrigerant("r410a"), "R410A");
  assert.equal(normaliseRefrigerant("HFC-32"), "R32");
  assert.equal(normaliseRefrigerant("134a"), "R134A");
  assert.equal(activityKey({ source_type: "refrigerant", refrigerant_type: "R 410A" }), "refrigerant:R410A");
  assert.equal(activityKey({ source_type: "generator_diesel" }), "diesel");
  assert.equal(activityKey({ source_type: "water" }), null);
});

test("factor choice: user-supplied beats the library default, which beats placeholders", () => {
  const all = [...lib.factors, ...PLACEHOLDER_FACTORS];
  assert.equal(chooseFactor("diesel", all).id, "uk-desnz-2025-diesel-mineral");
  assert.equal(chooseFactor("diesel", all, { diesel: "uk-desnz-2025-diesel-blend" }).id, "uk-desnz-2025-diesel-blend");
  assert.equal(chooseFactor("electricity", all).status, "placeholder");
  assert.equal(chooseFactor("electricity", lib.factors), null);
  const u = makeUserFactor("electricity", { value: "0.41", source_title: "Provider sustainability report 2025" }, "2026-11-04");
  assert.equal(u.ok, true);
  assert.equal(u.factor.status, "user-supplied");
  assert.equal(u.factor.unit, "kWh");
  assert.equal(chooseFactor("electricity", [...all, u.factor]).id, u.factor.id);
  assert.equal(candidatesFor("refrigerant:R410A", all)[0].value, 1924);
});

test("a user-supplied factor needs a number and a source", () => {
  const bad = makeUserFactor("district_cooling", { value: "abc", source_title: "" }, "2026-11-04");
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 2);
  const r = makeUserFactor("refrigerant:R22", { value: "1760", source_title: "Supplier data sheet" }, "2026-11-04");
  assert.equal(r.factor.refrigerant, "R22");
  assert.equal(r.factor.unit, "kg");
});
