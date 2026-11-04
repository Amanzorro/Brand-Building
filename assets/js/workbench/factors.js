/* Nokhada Workbench — emission factors.
   The library lives in factors.json. This module validates it, matches rows to
   factors and builds user-supplied factors. Pure functions, no DOM. */
import { CANONICAL_UNIT } from "./units.js";

export const STATUSES = ["cited", "placeholder", "user-supplied"];

/* Which factor activity each source type uses. Water is activity only. */
export const ACTIVITY_OF = {
  electricity: "electricity",
  district_cooling: "district_cooling",
  diesel: "diesel",
  generator_diesel: "diesel",
  petrol: "petrol",
  refrigerant: "refrigerant",
  water: null
};

export const ACTIVITY_UNIT = {
  electricity: CANONICAL_UNIT.electricity,
  district_cooling: CANONICAL_UNIT.district_cooling,
  diesel: "L",
  petrol: "L",
  refrigerant: "kg"
};

export const ACTIVITY_LABEL = {
  electricity: "Grid electricity (location-based)",
  district_cooling: "District cooling",
  diesel: "Diesel",
  petrol: "Petrol",
  refrigerant: "Refrigerant"
};

/* "R-410A", "r410a", "HFC-32", "R 134a" → "R410A", "R32", "R134A". */
export function normaliseRefrigerant(value) {
  let s = String(value == null ? "" : value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return "";
  s = s.replace(/^HFC/, "R").replace(/^HCFC/, "R");
  if (/^\d/.test(s)) s = "R" + s;
  return s;
}

/* The factor key a row needs: "diesel", "refrigerant:R410A", … or null for water. */
export function activityKey(row) {
  const activity = ACTIVITY_OF[row.source_type];
  if (!activity) return null;
  if (activity === "refrigerant") {
    const r = normaliseRefrigerant(row.refrigerant_type);
    return "refrigerant:" + (r || "unknown");
  }
  return activity;
}

export function keyLabel(key) {
  if (key.startsWith("refrigerant:")) return "Refrigerant " + key.slice(12);
  return ACTIVITY_LABEL[key] || key;
}

export function keyUnit(key) {
  return key.startsWith("refrigerant:") ? "kg" : ACTIVITY_UNIT[key];
}

export function factorKey(f) {
  return f.activity === "refrigerant" ? "refrigerant:" + normaliseRefrigerant(f.refrigerant) : f.activity;
}

const REQUIRED = ["id", "activity", "label", "unit", "value", "gas_basis", "geography", "source_title", "publisher", "version", "status"];

/* Returns a list of problems. An empty list means the library is usable. */
export function validateLibrary(lib) {
  const errors = [];
  const seen = new Set();
  (lib.factors || []).forEach((f, i) => {
    const where = f.id || "factor " + (i + 1);
    REQUIRED.forEach((k) => { if (f[k] === undefined || f[k] === "") errors.push(where + ": missing " + k); });
    if (seen.has(f.id)) errors.push(where + ": duplicate id");
    seen.add(f.id);
    if (!STATUSES.includes(f.status)) errors.push(where + ": unknown status " + f.status);
    if (typeof f.value !== "number" || !(f.value >= 0)) errors.push(where + ": value must be a number of zero or more");
    if (!ACTIVITY_UNIT[f.activity]) errors.push(where + ": unknown activity " + f.activity);
    else if (f.unit !== ACTIVITY_UNIT[f.activity]) errors.push(where + ": unit must be " + ACTIVITY_UNIT[f.activity]);
    if (f.activity === "refrigerant" && !f.refrigerant) errors.push(where + ": refrigerant factor needs a refrigerant type");
    if (f.status === "cited") {
      if (!/^https:\/\//.test(f.url || "")) errors.push(where + ": cited factor needs an https URL");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.retrieved || "")) errors.push(where + ": cited factor needs a retrieved date");
    }
    if ((f.activity === "electricity" || f.activity === "district_cooling") && f.status === "cited" && /united kingdom/i.test(f.geography)) {
      errors.push(where + ": a UK grid factor must not be used for UAE electricity or cooling");
    }
  });
  return errors;
}

/* Factors that could serve a key, best first: user-supplied, then the library
   default, then other cited factors, then placeholders. */
export function candidatesFor(key, factors) {
  const rank = (f) => (f.status === "user-supplied" ? 0 : f.status === "cited" ? (f.default ? 1 : 2) : 3);
  return factors.filter((f) => factorKey(f) === key).sort((a, b) => rank(a) - rank(b));
}

/* The factor used for a key: the user's explicit choice if it still exists, otherwise the best candidate. */
export function chooseFactor(key, factors, choices = {}) {
  if (!key) return null;
  const list = candidatesFor(key, factors);
  if (choices[key]) {
    const picked = list.find((f) => f.id === choices[key]);
    if (picked) return picked;
  }
  return list[0] || null;
}

/* Builds a user-supplied factor. Returns { ok, factor } or { ok: false, errors }. */
export function makeUserFactor(key, input, today) {
  const errors = [];
  const value = Number(String(input.value == null ? "" : input.value).trim());
  if (!String(input.value == null ? "" : input.value).trim() || !Number.isFinite(value) || value < 0) errors.push("Enter the factor as a number of zero or more.");
  const title = String(input.source_title || "").trim();
  if (!title) errors.push("Say where the value comes from.");
  const url = String(input.url || "").trim();
  if (url && !/^https?:\/\//i.test(url)) errors.push("A source link must start with http:// or https://.");
  if (errors.length) return { ok: false, errors };
  const activity = key.startsWith("refrigerant:") ? "refrigerant" : key;
  const factor = {
    id: "user:" + key + ":" + today,
    activity,
    label: keyLabel(key) + " (your value)",
    unit: keyUnit(key),
    value,
    gas_basis: String(input.gas_basis || "").trim() || "As stated by the source",
    geography: String(input.geography || "").trim() || "As stated by the source",
    source_title: title,
    publisher: String(input.publisher || "").trim() || "Not given",
    version: String(input.year || "").trim() || "Not given",
    url,
    retrieved: today,
    status: "user-supplied",
    notes: "Entered in the Workbench on " + today + "."
  };
  if (activity === "refrigerant") factor.refrigerant = key.slice(12);
  return { ok: true, factor };
}
