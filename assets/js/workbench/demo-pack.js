/* Nokhada Workbench — demo pack.
   Ras Saffa Logistics LLC is a fictional company. Its 44 documents (18 in Arabic)
   are generated here as HTML, each stamped SYNTHETIC SAMPLE, with the rows already
   extracted from them. Issuers are generic labels, never real utilities or companies.
   The grid electricity and district cooling factors below are placeholders for the
   demo only. They are not official figures.

   Planted problems, for the Sieve to find:
   - WE-08b is a second copy of the August warehouse bill (same invoice number)
   - GD-05 is a delivery dated 4 January 2026, outside FY2025
   - HQ district-cooling invoices for March to May are missing
   - HC-07 (July cooling) is about ten times the expected value (misplaced decimal)
   - GD-03 was extracted in "gal", which could be US or imperial gallons; the
     delivery note's footer says US gallons */
import { esc, fmt } from "./util.js";

export const COMPANY = { name: "Ras Saffa Logistics LLC", name_ar: "رأس الصفا للخدمات اللوجستية", fictional: true };
export const PERIOD = { start: "2025-01-01", end: "2025-12-31" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const WE = [61200, 58900, 64800, 71300, 82600, 94100, 101800, 103200, 92400, 78600, 66300, 60800];
const HE = [21400, 20100, 22800, 24900, 28700, 31800, 33900, 34200, 30600, 26400, 22900, 21100];
const HC = [9800, 9200, null, null, null, 21400, 236000, 24100, 20800, 15900, 11800, 10200];
const FUEL = [
  { q: "Q1", start: "2025-01-01", end: "2025-03-31", d: 41200, p: 1840 },
  { q: "Q2", start: "2025-04-01", end: "2025-06-30", d: 43800, p: 1910 },
  { q: "Q3", start: "2025-07-01", end: "2025-09-30", d: 45100, p: 1880 },
  { q: "Q4", start: "2025-10-01", end: "2025-12-31", d: 44300, p: 1950 }
];
const GEN = [
  { id: "GD-01", date: "2025-02-11", qty: 2400, unit: "L" },
  { id: "GD-02", date: "2025-05-19", qty: 1800, unit: "L" },
  { id: "GD-03", date: "2025-08-06", qty: 820, unit: "gal" },
  { id: "GD-04", date: "2025-11-23", qty: 2200, unit: "L" },
  { id: "GD-05", date: "2026-01-04", qty: 1900, unit: "L" }
];
const REF = [{ date: "2025-06-14", kg: 8.5 }, { date: "2025-08-27", kg: 4.0 }];

const SITE_WH = "Warehouse, Jebel Ali Free Zone";
const SITE_HQ = "HQ, Dubai";
const SITE_FLEET = "Fleet";

function pad(n) { return (n < 10 ? "0" : "") + n; }
function monthStart(i) { return "2025-" + pad(i + 1) + "-01"; }
function monthEnd(i) { return "2025-" + pad(i + 1) + "-" + pad(new Date(Date.UTC(2025, i + 1, 0)).getUTCDate()); }
function arDigits(s) { return String(s).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]); }

const STAMP = "<p class=\"wb-synthetic\" dir=\"ltr\" lang=\"en\">SYNTHETIC SAMPLE · fictional company · not a real document</p>";

function doc(id, title, lang, body) {
  const ar = lang === "ar";
  return {
    id,
    title,
    lang,
    html: "<article class=\"wb-doc\"" + (ar ? " dir=\"rtl\" lang=\"ar\"" : "") + ">" + STAMP + body + "</article>"
  };
}

function meta(pairs) {
  return "<dl class=\"wb-doc-meta\">" + pairs.map(([k, v]) => "<dt>" + k + "</dt><dd>" + v + "</dd>").join("") + "</dl>";
}

function lines(items) {
  return "<table class=\"wb-doc-lines\"><tbody>" + items.map(([k, v, hl]) => "<tr" + (hl ? " class=\"hl\"" : "") + "><td>" + k + "</td><td>" + v + "</td></tr>").join("") + "</tbody></table>";
}

/* ---------- Documents ---------- */
const documents = [];
const rows = [];
let seq = 0;
function row(r) {
  seq += 1;
  rows.push({ id: "R" + String(seq).padStart(3, "0"), refrigerant_type: "", notes: "", ...r });
}

WE.forEach((v, i) => {
  const make = (id, copy) => {
    const inv = "INV-JA-25" + pad(i + 1) + "17";
    documents.push(doc(id, "Warehouse electricity bill, " + MONTHS[i] + " 2025" + (copy ? " (second copy)" : ""), "en",
      "<header><strong>Electricity bill</strong><span>Electricity provider (illustrative)</span></header>" +
      meta([["Account", "JA-WH-0417-22"], ["Invoice no.", inv], ["Period", "1–" + monthEnd(i).slice(8) + " " + MONTHS[i] + " 2025"], ["Customer", "Ras Saffa Logistics LLC · Warehouse, Jebel Ali Free Zone"]]) +
      lines([["Electricity consumption (kWh)", fmt(v), true], ["Fuel surcharge", "AED " + fmt(Math.round(v * 0.065))], ["Total due", "AED " + fmt(Math.round(v * 0.41))]])));
    row({ site: SITE_WH, account_id: "JA-WH-0417-22", document_ref: inv, source_type: "electricity", period_start: monthStart(i), period_end: monthEnd(i), quantity: v, unit: "kWh",
      origin: { kind: "document", doc: id, field: "Electricity consumption (kWh)" } });
  };
  make("WE-" + pad(i + 1), false);
  if (i === 7) make("WE-08b", true);
});

HE.forEach((v, i) => {
  const id = "HE-" + pad(i + 1);
  const inv = "DXB-HQ-25" + pad(i + 1);
  const water = Math.round(v * 0.014);
  documents.push(doc(id, "HQ electricity and water bill, " + MONTHS[i] + " 2025 (Arabic)", "ar",
    "<header><strong>فاتورة كهرباء ومياه</strong><span>مزوّد الخدمة (للتوضيح)</span></header>" +
    meta([["رقم الحساب", "<span dir=\"ltr\">2007441981</span>"], ["رقم الفاتورة", "<span dir=\"ltr\">" + inv + "</span>"], ["فترة الفاتورة", MONTHS_AR[i] + " 2025"], ["العميل", "رأس الصفا للخدمات اللوجستية — المقر الرئيسي"]]) +
    lines([["استهلاك الكهرباء (كيلوواط ساعة)", "<span dir=\"ltr\">" + fmt(v) + "</span>", true], ["استهلاك المياه (متر مكعب)", "<span dir=\"ltr\">" + fmt(water) + "</span>", true], ["المبلغ المستحق", "<span dir=\"ltr\">AED " + fmt(Math.round(v * 0.44)) + "</span>"]])));
  row({ site: SITE_HQ, account_id: "2007441981", document_ref: inv, source_type: "electricity", period_start: monthStart(i), period_end: monthEnd(i), quantity: v, unit: "kWh",
    origin: { kind: "document", doc: id, field: "استهلاك الكهرباء (كيلوواط ساعة) · electricity, kWh" } });
  row({ site: SITE_HQ, account_id: "2007441981", document_ref: inv, source_type: "water", period_start: monthStart(i), period_end: monthEnd(i), quantity: water, unit: "m3",
    origin: { kind: "document", doc: id, field: "استهلاك المياه (متر مكعب) · water, m³" } });
});

HC.forEach((v, i) => {
  if (v === null) return;
  const id = "HC-" + pad(i + 1);
  const inv = "DC-7741-" + pad(i + 1);
  documents.push(doc(id, "HQ district-cooling invoice, " + MONTHS[i] + " 2025", "en",
    "<header><strong>District cooling invoice</strong><span>Cooling provider (illustrative)</span></header>" +
    meta([["Customer no.", "DC-7741"], ["Invoice no.", inv], ["Period", "1–" + monthEnd(i).slice(8) + " " + MONTHS[i] + " 2025"], ["Customer", "Ras Saffa Logistics LLC · HQ, Dubai"]]) +
    lines([["Consumption (ton-hours, RTh)", fmt(v), true], ["Capacity charge", "AED 18,240"], ["Consumption charge", "AED " + fmt(Math.round(v * 0.58))]])));
  row({ site: SITE_HQ, account_id: "DC-7741", document_ref: inv, source_type: "district_cooling", period_start: monthStart(i), period_end: monthEnd(i), quantity: v, unit: "RTh",
    origin: { kind: "document", doc: id, field: "Consumption (ton-hours, RTh)" } });
});

FUEL.forEach((f) => {
  const id = "FC-" + f.q;
  documents.push(doc(id, "Fuel card export, " + f.q + " 2025", "en",
    "<header><strong>Fuel card statement, " + f.q + " 2025</strong><span>Fuel card provider (illustrative)</span></header>" +
    meta([["Card account", "FLEET-CARD-01"], ["Period", f.start + " to " + f.end], ["Vehicles", "12 trucks (diesel), 2 vans (petrol)"]]) +
    lines([["Diesel, litres", fmt(f.d), true], ["Petrol, litres", fmt(f.p), true], ["Transactions", fmt(Math.round(f.d / 180))]])));
  row({ site: SITE_FLEET, account_id: "FLEET-CARD-01", document_ref: id, source_type: "diesel", period_start: f.start, period_end: f.end, quantity: f.d, unit: "L",
    origin: { kind: "document", doc: id, field: "Diesel, litres" } });
  row({ site: SITE_FLEET, account_id: "FLEET-CARD-01", document_ref: id, source_type: "petrol", period_start: f.start, period_end: f.end, quantity: f.p, unit: "L",
    origin: { kind: "document", doc: id, field: "Petrol, litres" } });
});

GEN.forEach((g) => {
  const gal = g.unit === "gal";
  documents.push(doc(g.id, "Generator diesel delivery note " + g.date + " (Arabic)", "ar",
    "<header><strong>مذكرة تسليم وقود</strong><span>مورّد الديزل (للتوضيح)</span></header>" +
    meta([["رقم المذكرة", "<span dir=\"ltr\">" + g.id + "</span>"], ["التاريخ", arDigits(g.date.split("-").reverse().join("/"))], ["الموقع", "المستودع — المنطقة الحرة لجبل علي"]]) +
    lines([["ديزل للمولد الاحتياطي", arDigits(fmt(g.qty)) + (gal ? " غالون" : " لتر"), true], ["توقيع المستلم", "مدير المستودع"]]) +
    (gal ? "<p class=\"wb-doc-foot\">جميع الكميات بالغالون الأمريكي.</p>" : "")));
  row({ site: SITE_WH, account_id: "WH-GEN-01", document_ref: g.id, source_type: "generator_diesel", period_start: g.date, period_end: g.date, quantity: g.qty, unit: g.unit,
    origin: { kind: "document", doc: g.id, field: "ديزل للمولد الاحتياطي · generator diesel" } });
});

documents.push(doc("RF-LOG", "Warehouse chiller refrigerant log, 2025 (Arabic)", "ar",
  "<header><strong>سجل صيانة وحدات التبريد</strong><span>فريق الصيانة</span></header>" +
  meta([["الموقع", "المستودع — المنطقة الحرة لجبل علي"], ["الوحدات", "مبرّدات المستودع"]]) +
  lines([["التاريخ", "البند"], ["<span dir=\"ltr\">2025-03-02</span>", "تنظيف المرشحات — لا توجد تعبئة"]].concat(
    REF.map((r) => ["<span dir=\"ltr\">" + r.date + "</span>", "إعادة تعبئة غاز R-410A: " + arDigits(String(r.kg)) + " كغ", true])))));
REF.forEach((r) => {
  row({ site: SITE_WH, account_id: "WH-CHILLERS", document_ref: "RF-LOG", source_type: "refrigerant", refrigerant_type: "R-410A", period_start: r.date, period_end: r.date, quantity: r.kg, unit: "kg",
    origin: { kind: "document", doc: "RF-LOG", field: "إعادة تعبئة غاز R-410A " + r.date + " · refrigerant top-up, kg" } });
});

export const DOCUMENTS = documents;
export const ROWS = rows;

/* Placeholder factors for the demo only. Not official figures. */
export const PLACEHOLDER_FACTORS = [
  {
    id: "demo-placeholder-grid", activity: "electricity", label: "Grid electricity (demo placeholder)", unit: "kWh", value: 0.4,
    gas_basis: "Not applicable: placeholder", geography: "None: placeholder", source_title: "Demo placeholder, not an official figure",
    publisher: "Nokhada demo", version: "Demo", url: "", retrieved: "", status: "placeholder",
    notes: "Enter your organisation's sourced value in step 3 to replace it."
  },
  {
    id: "demo-placeholder-dc", activity: "district_cooling", label: "District cooling (demo placeholder)", unit: "RTh", value: 0.38,
    gas_basis: "Not applicable: placeholder", geography: "None: placeholder", source_title: "Demo placeholder, not an official figure",
    publisher: "Nokhada demo", version: "Demo", url: "", retrieved: "", status: "placeholder",
    notes: "Enter your provider's sourced value in step 3 to replace it."
  }
];

/* Notes shown next to Sieve decisions in the demo. They stand in for what a reviewer would find out. */
export const HINTS = {
  "HC-07": { suggested: 23600, text: "Demo note: a simulated reply from the cooling provider says the decimal point was misplaced and July was 23,600 RTh." }
};

export function documentById(id) {
  return documents.find((d) => d.id === id) || null;
}

/* A fresh copy of the rows, so edits in the page never change the pack itself. */
export function demoRows() {
  return rows.map((r) => ({ ...r, origin: { ...r.origin } }));
}
