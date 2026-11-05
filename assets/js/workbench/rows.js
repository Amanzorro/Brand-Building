/* Nokhada Workbench — the activity-data row and its validation.
   Shared by CSV upload, manual entry and the demo pack. Pure functions, no DOM. */
import { normaliseDigits, parseDate } from "./util.js";

export const SOURCE_TYPES = ["electricity", "district_cooling", "diesel", "petrol", "generator_diesel", "refrigerant", "water"];

export const SOURCE_LABEL = {
  electricity: "Grid electricity",
  district_cooling: "District cooling",
  diesel: "Diesel (vehicles and equipment)",
  petrol: "Petrol",
  generator_diesel: "Generator diesel",
  refrigerant: "Refrigerant",
  water: "Water"
};

export const COLUMNS = ["site", "account_id", "document_ref", "source_type", "refrigerant_type", "period_start", "period_end", "quantity", "unit", "notes"];

/* Parses a quantity typed by a person: Eastern Arabic digits, spaces and
   thousands commas are accepted. Returns a number or null. */
export function parseQuantity(value) {
  let s = normaliseDigits(value).trim().replace(/[\s ]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    if (!/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return null;
    s = s.replace(/,/g, "");
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  return Number(s);
}

/* Checks one record (plain object of strings). Returns { row, errors } where
   `row` holds cleaned values and `errors` holds plain-language problems. */
export function validateRecord(rec) {
  const errors = [];
  const get = (k) => normaliseDigits(rec[k] == null ? "" : rec[k]).trim();
  const row = {};
  row.site = get("site");
  row.account_id = get("account_id");
  row.document_ref = get("document_ref");
  row.notes = String(rec.notes == null ? "" : rec.notes).trim();
  row.refrigerant_type = get("refrigerant_type");
  row.unit = String(rec.unit == null ? "" : rec.unit).trim();

  if (!row.site) errors.push("site is empty.");

  const st = get("source_type").toLowerCase().replace(/[\s-]+/g, "_");
  if (!st) errors.push("source_type is empty.");
  else if (!SOURCE_TYPES.includes(st)) errors.push("source_type “" + get("source_type") + "” is not one of: " + SOURCE_TYPES.join(", ") + ".");
  row.source_type = st;

  if (st === "refrigerant" && !row.refrigerant_type) errors.push("refrigerant_type is needed for refrigerant rows (for example R-410A).");

  const ps = get("period_start");
  const pe = get("period_end");
  row.period_start = parseDate(ps);
  row.period_end = pe ? parseDate(pe) : row.period_start;
  if (!ps) errors.push("period_start is empty.");
  else if (!row.period_start) errors.push("period_start “" + ps + "” is not a date in YYYY-MM-DD or DD/MM/YYYY form.");
  if (pe && !row.period_end) errors.push("period_end “" + pe + "” is not a date in YYYY-MM-DD or DD/MM/YYYY form.");
  if (row.period_start && row.period_end && row.period_end < row.period_start) errors.push("period_end is before period_start.");

  const q = get("quantity");
  row.quantity = parseQuantity(q);
  if (!q) errors.push("quantity is empty.");
  else if (row.quantity === null) errors.push("quantity “" + q + "” is not a number. Use a point for decimals.");

  if (!row.unit) errors.push("unit is empty.");
  return { row, errors };
}
