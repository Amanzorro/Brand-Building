import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseCSV, rowsFromCSV, toCSV } from "../../assets/js/workbench/csv.js";
import { normaliseDigits, parseDate } from "../../assets/js/workbench/util.js";
import { parseQuantity } from "../../assets/js/workbench/rows.js";

const HEADER = "site,account_id,document_ref,source_type,refrigerant_type,period_start,period_end,quantity,unit,notes";

test("parseCSV: quotes, commas and doubled quotes inside quotes", () => {
  const r = parseCSV('a,"b, c","say ""hi"""\n1,2,3\n');
  assert.equal(r.length, 2);
  assert.deepEqual(r[0].fields, ["a", "b, c", 'say "hi"']);
  assert.deepEqual(r[1].fields, ["1", "2", "3"]);
});

test("parseCSV: line breaks inside quotes keep the record's starting line", () => {
  const r = parseCSV('h1,h2\r\n"line one\nline two",x\r\nlast,row');
  assert.equal(r.length, 3);
  assert.equal(r[1].line, 2);
  assert.equal(r[1].fields[0], "line one\nline two");
  assert.equal(r[2].line, 4);
  assert.equal(r[2].raw, "last,row");
});

test("parseCSV: BOM, blank lines and Arabic text", () => {
  const r = parseCSV("﻿name,note\n\nمكتب,فاتورة شهر مارس\n");
  assert.equal(r.length, 2);
  assert.equal(r[0].fields[0], "name");
  assert.equal(r[1].fields[1], "فاتورة شهر مارس");
  assert.equal(r[1].line, 3);
});

test("parseCSV: an unclosed quote is reported on its record", () => {
  const r = parseCSV('a,b\n"open,1\n');
  assert.ok(r[1].error);
});

test("Eastern Arabic digits and separators are normalised", () => {
  assert.equal(normaliseDigits("٢٠٢٥-٠٣-١٨"), "2025-03-18");
  assert.equal(normaliseDigits("۱۲۳"), "123");
  assert.equal(parseQuantity("١٢٬٥٠٠٫٥"), 12500.5);
});

test("dates: YYYY-MM-DD and DD/MM/YYYY, impossible dates refused", () => {
  assert.equal(parseDate("2025-02-28"), "2025-02-28");
  assert.equal(parseDate("28/02/2025"), "2025-02-28");
  assert.equal(parseDate("1/3/2025"), "2025-03-01");
  assert.equal(parseDate("١٨/٠٣/٢٠٢٥"), "2025-03-18");
  assert.equal(parseDate("31/02/2025"), null);
  assert.equal(parseDate("2025-13-01"), null);
  assert.equal(parseDate("03/18/2025"), null, "month-first dates are not accepted");
  assert.equal(parseDate("2024-02-29"), "2024-02-29");
});

test("quantities: thousands commas accepted, decimal commas refused", () => {
  assert.equal(parseQuantity("18,420"), 18420);
  assert.equal(parseQuantity("3,215.5"), 3215.5);
  assert.equal(parseQuantity("1 250"), 1250);
  assert.equal(parseQuantity("12,5"), null);
  assert.equal(parseQuantity("abc"), null);
  assert.equal(parseQuantity("-40"), -40);
});

test("rowsFromCSV: each bad row is reported by line with a plain reason", () => {
  const text = [
    HEADER,
    "HQ,A1,INV1,electricity,,2025-01-01,2025-01-31,1000,kWh,",
    "HQ,A1,INV2,electrcity,,2025-02-01,2025-02-28,1000,kWh,",
    "HQ,A1,INV3,electricity,,2025-03-01,2025-02-28,1000,kWh,",
    "HQ,A1,INV4,electricity,,2025-04-01,2025-04-30,lots,kWh,",
    "HQ,AC,LOG,refrigerant,,2025-05-01,2025-05-01,2,kg,",
    "HQ,A1,INV5,electricity,,2025-06-01,2025-06-30,1,000,kWh,June bill",
    ",A1,INV6,electricity,,2025-07-01,2025-07-31,1000,kWh,"
  ].join("\n");
  const { rows, errors } = rowsFromCSV(text, "test.csv");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].origin.line, 2);
  assert.equal(rows[0].origin.file, "test.csv");
  const byLine = Object.fromEntries(errors.map((e) => [e.line, e.message]));
  assert.match(byLine[3], /source_type .*electrcity/);
  assert.match(byLine[4], /period_end is before period_start/);
  assert.match(byLine[5], /quantity .*lots.* is not a number/);
  assert.match(byLine[6], /refrigerant_type is needed/);
  assert.match(byLine[7], /fields but the header has/);
  assert.match(byLine[8], /site is empty/);
});

test("rowsFromCSV: a missing column is reported against the header line", () => {
  const { rows, errors } = rowsFromCSV("site,quantity\nHQ,1\n");
  assert.equal(rows.length, 0);
  assert.equal(errors[0].line, 1);
  assert.match(errors[0].message, /missing: account_id/);
});

test("the downloadable template parses cleanly", () => {
  const text = fs.readFileSync(new URL("../../assets/downloads/workbench-template.csv", import.meta.url), "utf8");
  const { rows, errors } = rowsFromCSV(text);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 4);
  assert.equal(rows[1].period_start, "2025-01-01");
});

test("the hand-made sample CSV parses, with one bad line reported", () => {
  const text = fs.readFileSync(new URL("./fixtures/sample-own-data.csv", import.meta.url), "utf8");
  const { rows, errors } = rowsFromCSV(text, "sample-own-data.csv");
  assert.equal(rows.length, 22);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 24);
  assert.match(errors[0].message, /31\/02\/2025/);
  const gen = rows.find((r) => r.document_ref === "DN-0441");
  assert.equal(gen.quantity, 240);
  assert.equal(gen.period_start, "2025-03-18");
  assert.equal(gen.site, "Office, Abu Dhabi");
  const ref = rows.find((r) => r.source_type === "refrigerant");
  assert.equal(ref.notes, 'Top-up after leak on unit 3, "north" side');
});

test("toCSV quotes what needs quoting and round-trips", () => {
  const text = toCSV(["a", "b"], [["x, y", 'say "hi"'], ["مكتب", 3]]);
  const back = parseCSV(text);
  assert.deepEqual(back[1].fields, ["x, y", 'say "hi"']);
  assert.deepEqual(back[2].fields, ["مكتب", "3"]);
});
