import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, normaliseUnit, toCanonical } from "../../assets/js/workbench/units.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, a + " ≈ " + b);

test("energy: MWh to kWh and back", () => {
  close(convert(1.5, "MWh", "kWh").value, 1500);
  close(convert(2500, "kWh", "MWh").value, 2.5);
  close(convert(1, "GWh", "kWh").value, 1e6);
});

test("cooling: ton-hour aliases are RTh", () => {
  for (const u of ["RTh", "rth", "ton-hours", "Ton Hours", "TR-h", "طن تبريد ساعة"]) {
    const n = normaliseUnit(u);
    assert.equal(n.ok, true, u);
    assert.equal(n.unit, "RTh");
  }
});

test("volume: US and imperial gallons, m³", () => {
  close(convert(1, "US gal", "L").value, 3.785411784);
  close(convert(1, "imp gal", "L").value, 4.54609);
  close(convert(820, "US gal", "L").value, 3104.03766288);
  close(convert(2, "m³", "L").value, 2000);
  close(convert(500, "litres", "m3").value, 0.5);
  assert.equal(normaliseUnit("لتر").unit, "L");
});

test("mass: tonnes and pounds to kg", () => {
  close(convert(1.2, "t", "kg").value, 1200);
  close(convert(10, "lb", "kg").value, 4.5359237);
});

test("ambiguous units are refused, never guessed", () => {
  for (const u of ["gal", "gallons", "غالون", "ton"]) {
    const n = normaliseUnit(u);
    assert.equal(n.ok, false, u);
    assert.equal(n.reason, "ambiguous");
  }
  assert.equal(convert(10, "gal", "L").ok, false);
});

test("unknown and incompatible units are reported", () => {
  assert.equal(normaliseUnit("furlongs").reason, "unrecognised");
  assert.equal(normaliseUnit("").reason, "missing");
  const c = convert(10, "kWh", "L");
  assert.equal(c.ok, false);
  assert.match(c.message, /can't be converted/);
});

test("toCanonical uses the source type's unit", () => {
  close(toCanonical(2, "MWh", "electricity").value, 2000);
  assert.equal(toCanonical(2, "MWh", "electricity").to, "kWh");
  close(toCanonical(100, "imp gal", "diesel").value, 454.609);
  assert.equal(toCanonical(5, "kg", "electricity").ok, false);
  assert.equal(toCanonical(5, "kWh", "district_cooling").ok, false, "electrical kWh is not cooling RTh");
});
