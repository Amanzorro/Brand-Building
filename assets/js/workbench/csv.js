/* Nokhada Workbench — CSV reading and writing in plain JS.
   Handles quoted fields, commas, quotes and line breaks inside quotes, CRLF line
   ends, a UTF-8 byte-order mark and Arabic text. Pure functions, no DOM. */
import { COLUMNS, validateRecord } from "./rows.js";

/* Splits CSV text into records. Each record is { line, fields, raw } where
   `line` is the 1-based line the record starts on and `raw` is its source text. */
export function parseCSV(text) {
  const src = String(text).replace(/^﻿/, "");
  const records = [];
  let fields = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let startLine = 1;
  let startPos = 0;
  let quoteError = null;
  let i = 0;
  const push = (end) => {
    fields.push(field);
    records.push({ line: startLine, fields, raw: src.slice(startPos, end), error: quoteError });
    fields = [];
    field = "";
    quoteError = null;
  };
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === "\"") {
        if (src[i + 1] === "\"") { field += "\""; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      if (c === "\n") line++;
      field += c; i++; continue;
    }
    if (c === "\"") {
      if (field.trim() === "") { field = ""; inQuotes = true; }
      else { field += c; quoteError = quoteError || "a quote mark appears in the middle of an unquoted field"; }
      i++; continue;
    }
    if (c === ",") { fields.push(field); field = ""; i++; continue; }
    if (c === "\r" || c === "\n") {
      const end = i;
      if (c === "\r" && src[i + 1] === "\n") i++;
      i++;
      push(end);
      line++;
      startLine = line;
      startPos = i;
      continue;
    }
    field += c; i++;
  }
  if (inQuotes) quoteError = "a quoted field is never closed";
  if (field !== "" || fields.length || inQuotes) push(src.length);
  return records.filter((r) => !(r.fields.length === 1 && r.fields[0].trim() === "" && !r.error));
}

function headerKey(h) {
  return String(h).replace(/^﻿/, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/* Reads Workbench rows from CSV text. Returns
   { rows, errors: [{ line, message }], skipped } — rows carry their CSV line. */
export function rowsFromCSV(text, fileName = "upload.csv") {
  const records = parseCSV(text);
  const errors = [];
  const rows = [];
  if (!records.length) return { rows, errors: [{ line: 1, message: "The file is empty." }] };
  const header = records[0].fields.map(headerKey);
  const missing = COLUMNS.filter((c) => c !== "notes" && c !== "refrigerant_type" && !header.includes(c));
  if (missing.length) {
    return { rows, errors: [{ line: records[0].line, message: "The header row is missing: " + missing.join(", ") + ". Start from the template." }] };
  }
  const unknown = header.filter((h) => h && !COLUMNS.includes(h));
  records.slice(1).forEach((r) => {
    if (r.error) { errors.push({ line: r.line, message: "This line can't be read: " + r.error + "." }); return; }
    if (r.fields.length > header.length && r.fields.slice(header.length).some((f) => f.trim() !== "")) {
      errors.push({ line: r.line, message: "This line has " + r.fields.length + " fields but the header has " + header.length + ". A comma inside a value needs the value in double quotes." });
      return;
    }
    const rec = {};
    header.forEach((h, idx) => { rec[h] = r.fields[idx] == null ? "" : r.fields[idx]; });
    const { row, errors: errs } = validateRecord(rec);
    if (errs.length) { errors.push({ line: r.line, message: errs.join(" ") }); return; }
    row.origin = { kind: "csv", file: fileName, line: r.line, raw: r.raw };
    rows.push(row);
  });
  if (!rows.length && !errors.length) errors.push({ line: 2, message: "The file has a header but no data rows." });
  return { rows, errors, ignoredColumns: unknown };
}

function cell(v) {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s;
}

/* Writes rows of values as CSV text with CRLF line ends. */
export function toCSV(header, rows) {
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
