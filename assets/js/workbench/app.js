/* Nokhada Workbench — the page. Wires the pure engine modules to the DOM.
   Nothing here talks to a server: files are read with the File API inside the tab,
   and exports are built as Blobs and saved by the browser. */
import { esc, fmt, fmtExact, fmtDate, fmtPeriod } from "./util.js";
import { normaliseUnit, UNITS, CANONICAL_UNIT } from "./units.js";
import { SOURCE_TYPES, SOURCE_LABEL, validateRecord } from "./rows.js";
import { rowsFromCSV } from "./csv.js";
import { activityKey, candidatesFor, chooseFactor, keyLabel, keyUnit, makeUserFactor, validateLibrary } from "./factors.js";
import { DEFAULT_THRESHOLDS, SEVERITY_LABEL } from "./sieve.js";
import { findFigure } from "./calc.js";
import { RULES, estimateGap, relatedAccounts } from "./estimate.js";
import { run } from "./engine.js";
import { demoExtractor } from "./extract.js";
import { COMPANY, PERIOD, PLACEHOLDER_FACTORS, HINTS } from "./demo-pack.js";
import { summaryAR, summaryEN } from "./summary.js";
import { resultsCSV, resultsJSON } from "./export.js";

const root = document.getElementById("workbench");
const dialog = document.getElementById("wb-dialog");

const state = {
  mode: null,            // "demo" | "own"
  company: "",
  company_ar: "",
  period: { start: "2025-01-01", end: "2025-12-31" },
  rows: [],
  documents: new Map(),
  library: [],
  placeholders: PLACEHOLDER_FACTORS,
  userFactors: [],
  choices: {},
  decisions: {},
  log: [],
  thresholds: { ...DEFAULT_THRESHOLDS },
  step: 1,
  filter: "all",
  counters: { M: 0, E: 0 },
  importReport: null,
  libraryError: false
};
let current = null;

/* ---------- helpers ---------- */
const $ = (sel, el = root) => el.querySelector(sel);
const today = () => new Date().toISOString().slice(0, 10);
const stamp = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const rowById = (id) => state.rows.find((r) => r.id === id);
const allFactors = () => [...state.library, ...(state.mode === "demo" ? state.placeholders : []), ...state.userFactors];
const factorById = (id) => allFactors().find((f) => f.id === id);
const t1 = (n) => fmt(n, 1);
const t3 = (n) => fmt(n, 3);

function qtyText(value, unit) {
  const digits = unit === "kg" || unit === "lb" || Math.abs(value) < 100 ? 2 : 0;
  return fmt(value, digits).replace(/\.00$/, "") + " " + (unit === "m3" ? "m³" : unit);
}

function log(entry) {
  state.log.push({ seq: state.log.length + 1, at: stamp(), ...entry });
}

function compute() {
  current = run({ rows: state.rows, period: state.period, factors: allFactors(), choices: state.choices, decisions: state.decisions, thresholds: state.thresholds });
  return current;
}

function findingsFor(rowId) {
  return current.findings.filter((f) => f.rowIds.includes(rowId));
}

function originLabel(row) {
  const o = row.origin || {};
  if (o.kind === "document") return o.doc;
  if (o.kind === "csv") return "CSV line " + o.line;
  if (o.kind === "estimate") return "Estimate";
  return "Entered by hand";
}

function originButton(row) {
  const o = row.origin || {};
  if (o.kind === "document") return "<button type=\"button\" class=\"trace\" data-doc=\"" + esc(o.doc) + "\">" + esc(o.doc) + "</button>";
  return "<button type=\"button\" class=\"trace\" data-row=\"" + esc(row.id) + "\">" + esc(originLabel(row)) + "</button>";
}

function typeText(row) {
  return esc(SOURCE_LABEL[row.source_type] || row.source_type) + (row.refrigerant_type ? " " + esc(row.refrigerant_type) : "");
}

const STATUS = {
  included: ["Counted", "ok"],
  excluded: ["Excluded", "none"],
  held: ["Held for decision", "warn"],
  "set-aside": ["Duplicate, left out", "none"],
  outside: ["Outside period", "none"],
  "unit-error": ["Unit problem", "bad"],
  "no-factor": ["No factor", "bad"],
  "activity-only": ["Activity only", "check"]
};
const SEV_CLASS = { decision: "warn", error: "bad", warning: "check", info: "none" };
const FACTOR_STATUS_CLASS = { cited: "ok", placeholder: "warn", "user-supplied": "check" };

function statusPill(status) {
  const [label, cls] = STATUS[status] || [status, "none"];
  return "<span class=\"pill " + cls + "\">" + label + "</span>";
}

function factorPill(f) {
  if (!f) return "<span class=\"pill bad\">missing</span>";
  return "<span class=\"pill " + (FACTOR_STATUS_CLASS[f.status] || "none") + "\">" + esc(f.status) + "</span>";
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- dialog ---------- */
function openDialog(title, html, onReady) {
  dialog.querySelector("#wb-dialog-title").textContent = title;
  dialog.querySelector(".wb-dialog-body").innerHTML = html;
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  dialog.scrollTop = 0;
  dialog.querySelector(".wb-dialog-body").scrollTop = 0;
  if (onReady) onReady(dialog.querySelector(".wb-dialog-body"));
}

function closeDialog() {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

/* A small form inside the dialog. fields: [{ name, label, type, value, options, required, hint }] */
function formDialog(title, intro, fields, submitLabel, onSubmit) {
  const html = (intro ? "<p>" + intro + "</p>" : "") + "<form class=\"wb-form wb-dialog-form\" novalidate>" +
    fields.map((f) => {
      const id = "wbf-" + f.name;
      let input;
      if (f.type === "select") {
        input = "<select id=\"" + id + "\" name=\"" + f.name + "\">" + f.options.map(([v, l]) => "<option value=\"" + esc(v) + "\"" + (String(v) === String(f.value) ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select>";
      } else if (f.type === "textarea") {
        input = "<textarea id=\"" + id + "\" name=\"" + f.name + "\" rows=\"2\">" + esc(f.value || "") + "</textarea>";
      } else {
        input = "<input id=\"" + id + "\" name=\"" + f.name + "\" type=\"" + (f.type || "text") + "\" value=\"" + esc(f.value == null ? "" : f.value) + "\"" + (f.list ? " list=\"" + f.list + "\"" : "") + (f.inputmode ? " inputmode=\"" + f.inputmode + "\"" : "") + ">";
      }
      return "<label for=\"" + id + "\"" + (f.wide ? " class=\"wide\"" : "") + "><span>" + esc(f.label) + (f.required ? " <span class=\"muted\">(required)</span>" : "") + "</span>" + input + (f.hint ? "<span class=\"small muted\">" + esc(f.hint) + "</span>" : "") + "</label>";
    }).join("") +
    "<datalist id=\"wb-units\">" + Object.keys(UNITS).map((u) => "<option value=\"" + esc(u) + "\">").join("") + "</datalist>" +
    "<div class=\"wb-form-errors\" role=\"alert\"></div>" +
    "<p class=\"wide\"><button type=\"submit\" class=\"btn btn-primary\">" + esc(submitLabel) + "</button></p></form>";
  openDialog(title, html, (body) => {
    const form = body.querySelector("form");
    const first = form.querySelector("input, select, textarea");
    if (first) first.focus();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const errors = onSubmit(values) || [];
      if (errors.length) {
        form.querySelector(".wb-form-errors").innerHTML = "<ul class=\"plain\">" + errors.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>";
        return;
      }
      closeDialog();
      render();
    });
  });
}

function reasonDialog(title, intro, submitLabel, defaultReason, onReason) {
  formDialog(title, intro, [{ name: "reason", label: "Reason", type: "textarea", value: defaultReason || "", required: true, wide: true }], submitLabel, (v) => {
    const reason = (v.reason || "").trim();
    if (!reason) return ["Give a reason. It goes into the change log."];
    onReason(reason);
    return [];
  });
}

/* ---------- loading data ---------- */
function replaceGuard() {
  return !state.mode || window.confirm("Replace the current data? Your edits and decisions will be cleared.");
}

function resetData(mode) {
  state.mode = mode;
  state.rows = [];
  state.documents = new Map();
  state.userFactors = [];
  state.choices = {};
  state.decisions = {};
  state.log = [];
  state.counters = { M: 0, E: 0 };
  state.importReport = null;
  state.filter = "all";
}

async function loadDemo() {
  if (!replaceGuard()) return;
  resetData("demo");
  const { rows, documents } = await demoExtractor.extract();
  state.rows = rows;
  documents.forEach((d) => state.documents.set(d.id, d));
  state.company = COMPANY.name + " (fictional)";
  state.company_ar = COMPANY.name_ar + " (شركة افتراضية)";
  state.period = { ...PERIOD };
  $("#wb-start").value = PERIOD.start;
  $("#wb-end").value = PERIOD.end;
  $("#wb-org").value = state.company;
  log({ kind: "load", rowId: "", field: "data", old: "", new: "Demo pack: " + rows.length + " rows from " + documents.length + " documents", reason: "Loaded by user" });
  go(2);
}

async function loadCSV(file) {
  if (!file) return;
  if (!replaceGuard()) { $("#wb-file").value = ""; return; }
  const text = await file.text();
  const { rows, errors, ignoredColumns } = rowsFromCSV(text, file.name);
  resetData("own");
  rows.forEach((r) => { r.id = "L" + r.origin.line; });
  state.rows = rows;
  state.company = $("#wb-org").value.trim();
  state.importReport = { file: file.name, imported: rows.length, errors, ignoredColumns: ignoredColumns || [] };
  log({ kind: "load", rowId: "", field: "data", old: "", new: file.name + ": " + rows.length + " rows imported, " + errors.length + " lines refused", reason: "Uploaded by user" });
  $("#wb-file").value = "";
  if (!rows.length) { state.mode = null; render(); return; }
  go(2);
}

function startManual() {
  if (!replaceGuard()) return;
  resetData("own");
  state.company = $("#wb-org").value.trim();
  log({ kind: "load", rowId: "", field: "data", old: "", new: "Empty table for manual entry", reason: "Started by user" });
  go(2);
  editRow(null);
}

/* ---------- step navigation ---------- */
function go(step) {
  state.step = step;
  render();
  const panel = root.querySelector("[data-panel=\"" + step + "\"]");
  const h = panel && panel.querySelector("h2");
  if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  root.scrollIntoView({ block: "start", behavior: "auto" });
}

function navButtons(back, next) {
  return "<div class=\"wb-nav\">" +
    (back ? "<button type=\"button\" class=\"btn btn-ghost\" data-step=\"" + back[0] + "\">" + back[1] + "</button>" : "<span></span>") +
    (next ? "<button type=\"button\" class=\"btn btn-primary\" data-step=\"" + next[0] + "\">" + next[1] + " <span class=\"arrow\" aria-hidden=\"true\">→</span></button>" : "") +
    "</div>";
}

/* ---------- render ---------- */
function render() {
  compute();
  root.querySelectorAll(".wb-steps button").forEach((b) => {
    const n = Number(b.dataset.step);
    b.disabled = n > 1 && !state.mode;
    if (n === state.step) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
  });
  root.querySelectorAll(".wb-panel").forEach((p) => { p.hidden = Number(p.dataset.panel) !== state.step; });
  renderStatus();
  renderImport();
  if (state.step === 2) renderReview();
  if (state.step === 3) renderFactors();
  if (state.step === 4) renderResults();
}

function renderStatus() {
  const el = $("#wb-status");
  const libNote = state.libraryError ? "<span class=\"pill bad\">Factor library not loaded</span> <span class=\"small\">Cited factors are unavailable. Reload the page to try again.</span>" : "";
  if (!state.mode) { el.innerHTML = libNote; return; }
  const r = current.result;
  const e = current.effects;
  el.innerHTML = "<span><b>" + (state.mode === "demo" ? "Demo pack" : "Your data") + "</b> · " + state.rows.length + " rows</span>" +
    "<span>Total <button type=\"button\" class=\"trace\" data-fig=\"total\">" + t1(r.total.t) + " tCO₂e</button></span>" +
    (e.provisional ? "<span class=\"pill warn\">Provisional</span>" : "<span class=\"pill ok\">No open decisions</span>") +
    (e.pending.length ? "<button type=\"button\" class=\"wb-link\" data-step=\"4\">" + e.pending.length + (e.pending.length === 1 ? " decision waiting" : " decisions waiting") + "</button>" : "") + libNote;
}

function renderImport() {
  const el = $("#wb-import");
  const rep = state.importReport;
  if (!rep || state.mode) { el.innerHTML = ""; return; }
  el.innerHTML = importReportHtml(rep);
}

function importReportHtml(rep) {
  if (!rep) return "";
  let h = "<div class=\"wb-callout" + (rep.errors.length ? " warn" : "") + "\"><p><b>" + esc(rep.file) + ":</b> " + rep.imported + (rep.imported === 1 ? " row" : " rows") + " imported" +
    (rep.errors.length ? ", " + rep.errors.length + (rep.errors.length === 1 ? " line" : " lines") + " refused." : ".") + "</p>";
  if (rep.errors.length) h += "<ul class=\"plain\">" + rep.errors.map((e) => "<li><b>Line " + e.line + ":</b> " + esc(e.message) + "</li>").join("") + "</ul><p class=\"small muted\">Fix these lines in your file and upload it again, or add the rows by hand.</p>";
  if (rep.ignoredColumns.length) h += "<p class=\"small muted\">Columns not used: " + esc(rep.ignoredColumns.join(", ")) + ".</p>";
  return h + "</div>";
}

/* ---------- step 2: review ---------- */
function renderReview() {
  const panel = root.querySelector("[data-panel=\"2\"]");
  const res = current.result;
  const flagged = new Set(current.findings.filter((f) => f.severity !== "info" || f.check === "period").flatMap((f) => f.rowIds));
  const rows = state.rows.filter((r) => {
    if (state.filter === "flagged") return flagged.has(r.id);
    if (state.filter === "excluded") return r.excluded;
    if (state.filter === "unconfirmed") return !r.confirmed && !r.excluded;
    return true;
  });
  const confirmed = state.rows.filter((r) => r.confirmed).length;
  const excluded = state.rows.filter((r) => r.excluded).length;
  let h = "<h2>Review the rows</h2><p>Check each row against its source. Every edit, exclusion and confirmation goes into the change log with your reason.</p>";
  h += importReportHtml(state.importReport);
  h += "<div class=\"wb-toolbar\"><label>Show <select data-action=\"filter\">" +
    [["all", "All rows"], ["flagged", "Rows the checks flagged"], ["unconfirmed", "Rows not yet confirmed"], ["excluded", "Excluded rows"]].map(([v, l]) => "<option value=\"" + v + "\"" + (state.filter === v ? " selected" : "") + ">" + l + "</option>").join("") +
    "</select></label><button type=\"button\" class=\"btn btn-ghost wb-sm\" data-action=\"add-row\">Add a row</button>" +
    (rows.some((r) => !r.confirmed && !r.excluded) ? "<button type=\"button\" class=\"btn btn-ghost wb-sm\" data-action=\"confirm-shown\">Confirm the rows shown</button>" : "") +
    "<span class=\"small muted\">" + state.rows.length + " rows · " + confirmed + " confirmed · " + excluded + " excluded</span></div>";
  if (!state.rows.length) {
    h += "<p class=\"wb-empty\">No rows yet. Add one, or go back and upload a CSV.</p>";
  } else {
    h += "<div class=\"data-table-wrap wb-scroll\"><table class=\"data wb-table\"><thead><tr><th>Row</th><th>Source</th><th>Site</th><th>Account</th><th>Type</th><th>Period</th><th class=\"num\">Quantity</th><th>Unit</th><th>Checks</th><th>Status</th><th>Actions</th></tr></thead><tbody>";
    rows.forEach((r) => {
      const rr = res.byId.get(r.id);
      const fs = findingsFor(r.id).filter((f) => f.check !== "factor" && f.check !== "estimate");
      const unitOk = normaliseUnit(r.unit).ok;
      h += "<tr" + (r.excluded ? " class=\"excluded\"" : r.estimate ? " class=\"est\"" : "") + ">" +
        "<td><button type=\"button\" class=\"trace\" data-row=\"" + esc(r.id) + "\">" + esc(r.id) + "</button></td>" +
        "<td>" + originButton(r) + "</td><td>" + esc(r.site) + "</td><td>" + esc(r.account_id) + "</td><td>" + typeText(r) + "</td>" +
        "<td class=\"nowrap\">" + esc(fmtPeriod(r.period_start, r.period_end)) + "</td>" +
        "<td class=\"num\">" + esc(fmtExact(r.quantity, 4)) + "</td><td" + (unitOk ? "" : " class=\"wb-bad\"") + ">" + esc(r.unit) + "</td>" +
        "<td>" + fs.map((f) => "<span class=\"pill " + SEV_CLASS[f.severity] + "\" title=\"" + esc(f.title) + "\">" + esc(f.check) + "</span>").join(" ") + "</td>" +
        "<td>" + statusPill(rr.status) + (r.confirmed ? " <span class=\"pill ok\">confirmed</span>" : "") + (r.estimate ? " <span class=\"pill warn\">estimate</span>" : "") + "</td>" +
        "<td class=\"wb-actions\"><button type=\"button\" class=\"chip-btn\" data-action=\"edit-row\" data-id=\"" + esc(r.id) + "\">Edit</button>" +
        (r.excluded ? "<button type=\"button\" class=\"chip-btn\" data-action=\"include-row\" data-id=\"" + esc(r.id) + "\">Include</button>"
          : "<button type=\"button\" class=\"chip-btn\" data-action=\"exclude-row\" data-id=\"" + esc(r.id) + "\">Exclude</button>") +
        (!r.confirmed && !r.excluded ? "<button type=\"button\" class=\"chip-btn\" data-action=\"confirm-row\" data-id=\"" + esc(r.id) + "\">Confirm</button>" : "") +
        (r.origin && r.origin.kind !== "document" ? "<button type=\"button\" class=\"chip-btn\" data-action=\"delete-row\" data-id=\"" + esc(r.id) + "\">Delete</button>" : "") +
        "</td></tr>";
    });
    h += "</tbody></table></div>";
    if (!rows.length) h += "<p class=\"wb-empty\">No rows match this filter.</p>";
  }
  h += logHtml();
  h += navButtons([1, "Back"], [3, "Next: factors"]);
  panel.innerHTML = h;
}

function logHtml(open) {
  return "<details class=\"wb-log\"" + (open ? " open" : "") + "><summary>Change log (" + state.log.length + ")</summary>" +
    (state.log.length ? "<div class=\"data-table-wrap wb-scroll\"><table class=\"data\"><thead><tr><th>#</th><th>Time (UTC)</th><th>Row</th><th>Field</th><th>Old</th><th>New</th><th>Reason</th></tr></thead><tbody>" +
      state.log.slice().reverse().map((e) => "<tr><td>" + e.seq + "</td><td class=\"nowrap\">" + esc(e.at.replace("T", " ").replace("Z", "")) + "</td><td>" + (e.rowId ? "<button type=\"button\" class=\"trace\" data-row=\"" + esc(e.rowId) + "\">" + esc(e.rowId) + "</button>" : "") + "</td><td>" + esc(e.field) + "</td><td>" + esc(e.old) + "</td><td>" + esc(e.new) + "</td><td>" + esc(e.reason) + "</td></tr>").join("") +
      "</tbody></table></div>" : "<p class=\"small muted\">Nothing changed yet.</p>") + "</details>";
}

function editRow(id) {
  const row = id ? rowById(id) : null;
  const v = row || { site: state.rows.length ? state.rows[state.rows.length - 1].site : "", account_id: "", document_ref: "", source_type: "electricity", refrigerant_type: "", period_start: "", period_end: "", quantity: "", unit: "kWh", notes: "" };
  const fields = [
    { name: "site", label: "Site", value: v.site, required: true },
    { name: "account_id", label: "Account or meter", value: v.account_id },
    { name: "document_ref", label: "Document reference", value: v.document_ref },
    { name: "source_type", label: "Source type", type: "select", value: v.source_type, options: SOURCE_TYPES.map((s) => [s, SOURCE_LABEL[s]]) },
    { name: "refrigerant_type", label: "Refrigerant type", value: v.refrigerant_type, hint: "Only for refrigerant rows, for example R-410A." },
    { name: "period_start", label: "Period start", type: "date", value: v.period_start, required: true },
    { name: "period_end", label: "Period end", type: "date", value: v.period_end, hint: "Leave empty for a single date." },
    { name: "quantity", label: "Quantity", value: v.quantity, required: true, inputmode: "decimal" },
    { name: "unit", label: "Unit", value: v.unit, list: "wb-units", required: true, hint: "For example kWh, RTh, L, US gal, kg." },
    { name: "notes", label: "Notes", value: v.notes, wide: true },
    { name: "reason", label: row ? "Reason for the change" : "Reason (optional)", type: "textarea", required: !!row, wide: true }
  ];
  formDialog(row ? "Edit " + row.id : "Add a row", row ? "Changed fields are logged with the old value, the new value and your reason." : "", fields, row ? "Save changes" : "Add row", (vals) => {
    const { row: clean, errors } = validateRecord(vals);
    const reason = (vals.reason || "").trim();
    if (row && !reason) errors.push("Give a reason for the change.");
    if (errors.length) return errors.map((e) => e.charAt(0).toUpperCase() + e.slice(1));
    if (row) {
      const changed = ["site", "account_id", "document_ref", "source_type", "refrigerant_type", "period_start", "period_end", "quantity", "unit", "notes"].filter((k) => String(row[k] ?? "") !== String(clean[k] ?? ""));
      if (!changed.length) return ["Nothing changed."];
      changed.forEach((k) => { log({ kind: "edit", rowId: row.id, field: k, old: String(row[k] ?? ""), new: String(clean[k] ?? ""), reason }); row[k] = clean[k]; });
      row.confirmed = false;
    } else {
      state.counters.M += 1;
      const id = "M" + String(state.counters.M).padStart(3, "0");
      state.rows.push({ id, ...clean, origin: { kind: "manual", at: stamp() } });
      log({ kind: "add", rowId: id, field: "row", old: "", new: clean.source_type + " " + clean.quantity + " " + clean.unit, reason: reason || "Added by hand" });
    }
    return [];
  });
}

/* ---------- step 3: factors ---------- */
function factorKeys() {
  const keys = new Map();
  state.rows.forEach((r) => {
    if (r.excluded) return;
    const st = current.result.byId.get(r.id).status;
    if (st === "set-aside" || st === "outside") return;
    const k = activityKey(r);
    if (!k) return;
    keys.set(k, (keys.get(k) || 0) + 1);
  });
  return keys;
}

function factorSourceHtml(f) {
  if (!f) return "";
  return "<div class=\"wb-source\"><b>" + esc(f.label) + "</b>: " + esc(fmtExact(f.value)) + " kg CO₂e per " + esc(f.unit) + " " + factorPill(f) +
    "<br><span>" + esc(f.source_title) + "</span>" +
    "<br><span class=\"muted\">" + esc(f.publisher) + " · " + esc(f.version) + (f.retrieved ? " · retrieved " + esc(fmtDate(f.retrieved)) : "") + "</span>" +
    (f.url ? "<br><a class=\"textlink\" href=\"" + esc(f.url) + "\" rel=\"noopener\" target=\"_blank\">Open the source</a>" : "") +
    "<br><span class=\"small muted\">Gas basis: " + esc(f.gas_basis) + ". Geography: " + esc(f.geography) + ".</span>" +
    (f.notes ? "<br><span class=\"small muted\">" + esc(f.notes) + "</span>" : "") + "</div>";
}

function renderFactors() {
  const panel = root.querySelector("[data-panel=\"3\"]");
  const keys = factorKeys();
  const factors = allFactors();
  let h = "<h2>Choose emission factors</h2><p>Each activity needs a factor in kg CO₂e per unit. Each one shows whether it is cited from an official source, a demo placeholder or a value you supplied.</p>";
  const needs = [...keys.keys()].filter((k) => !chooseFactor(k, factors, state.choices));
  if (needs.includes("electricity") || needs.includes("district_cooling")) {
    h += "<div class=\"wb-callout warn\"><p>There is no default for UAE grid electricity or district cooling. Enter the figure your organisation uses and where it comes from, and it will be labelled user-supplied in every output.</p></div>";
  }
  if (!keys.size) h += "<p class=\"wb-empty\">No rows need a factor yet.</p>";
  else {
    h += "<div class=\"data-table-wrap wb-scroll\"><table class=\"data wb-table\"><thead><tr><th>Activity</th><th class=\"num\">Rows</th><th>Factor in use</th><th>Change</th></tr></thead><tbody>";
    keys.forEach((n, key) => {
      const f = chooseFactor(key, factors, state.choices);
      const cands = candidatesFor(key, factors);
      h += "<tr><td><b>" + esc(keyLabel(key)) + "</b><br><span class=\"small muted\">per " + esc(keyUnit(key)) + "</span></td><td class=\"num\">" + n + "</td><td>" +
        (f ? factorSourceHtml(f) : "<span class=\"pill bad\">missing</span> <span class=\"small\">These rows can't be calculated until you enter a value.</span>") + "</td><td class=\"wb-actions\">" +
        (cands.length > 1 ? "<label class=\"small\">Use <select data-action=\"choose-factor\" data-key=\"" + esc(key) + "\">" + cands.map((c) => "<option value=\"" + esc(c.id) + "\"" + (f && f.id === c.id ? " selected" : "") + ">" + esc(c.label) + " (" + esc(fmtExact(c.value)) + ", " + esc(c.status) + ")</option>").join("") + "</select></label>" : "") +
        "<button type=\"button\" class=\"chip-btn\" data-action=\"user-factor\" data-key=\"" + esc(key) + "\">Enter your own value</button></td></tr>";
    });
    h += "</tbody></table></div>";
  }
  if (state.rows.some((r) => r.source_type === "water" && !r.excluded)) h += "<p class=\"small muted\">Water rows are recorded as activity only. No emissions are calculated for them.</p>";
  h += "<details class=\"wb-log\"><summary>All factors in the library (" + factors.length + ")</summary><div class=\"data-table-wrap wb-scroll\"><table class=\"data\"><thead><tr><th>ID</th><th>Factor</th><th class=\"num\">kg CO₂e per unit</th><th>Status</th><th>Source</th></tr></thead><tbody>" +
    factors.map((f) => "<tr><td><code>" + esc(f.id) + "</code></td><td>" + esc(f.label) + "</td><td class=\"num\">" + esc(fmtExact(f.value)) + " / " + esc(f.unit) + "</td><td>" + factorPill(f) + "</td><td>" + (f.url ? "<a class=\"textlink\" href=\"" + esc(f.url) + "\" rel=\"noopener\" target=\"_blank\">" + esc(f.publisher) + "</a>" : esc(f.publisher)) + "<br><span class=\"small muted\">" + esc(f.version) + "</span></td></tr>").join("") +
    "</tbody></table></div></details>";
  h += navButtons([2, "Back"], [4, "Next: results"]);
  panel.innerHTML = h;
}

function userFactorDialog(key) {
  const unit = keyUnit(key);
  const prev = chooseFactor(key, allFactors(), state.choices);
  formDialog("Your factor: " + keyLabel(key), "It is labelled user-supplied in every table, trace and export.", [
    { name: "value", label: "kg CO₂e per " + unit, required: true, inputmode: "decimal" },
    { name: "source_title", label: "Source (document or page title)", required: true, wide: true },
    { name: "publisher", label: "Publisher" },
    { name: "year", label: "Year or version" },
    { name: "url", label: "Link to the source", type: "url", wide: true },
    { name: "gas_basis", label: "Gas basis", hint: "For example CO₂ only, or CO₂e with AR5 GWPs." },
    { name: "geography", label: "Geography", hint: "For example UAE, Dubai." }
  ], "Use this value", (v) => {
    const made = makeUserFactor(key, v, today());
    if (!made.ok) return made.errors;
    state.userFactors = state.userFactors.filter((f) => !(f.id.startsWith("user:" + key + ":")));
    state.userFactors.push(made.factor);
    state.choices[key] = made.factor.id;
    log({ kind: "factor", rowId: "", field: "factor: " + keyLabel(key), old: prev ? fmtExact(prev.value) + " (" + prev.status + ")" : "none", new: fmtExact(made.factor.value) + " (user-supplied)", reason: "Source: " + made.factor.source_title });
    return [];
  });
}

/* ---------- step 4: results ---------- */
function figButton(id, t) {
  return "<button type=\"button\" class=\"trace\" data-fig=\"" + esc(id) + "\">" + t1(t) + "</button>";
}

function renderResults() {
  const panel = root.querySelector("[data-panel=\"4\"]");
  const res = current.result;
  const eff = current.effects;
  const prov = eff.provisional ? " <span class=\"pill warn\">provisional</span>" : "";
  let h = "<h2>Results</h2>";
  h += eff.provisional
    ? "<div class=\"wb-callout warn\"><p><b>These totals are provisional.</b></p><ul class=\"plain\">" + eff.reasons.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul></div>"
    : "<div class=\"wb-callout ok\"><p>No decisions are open and every row in scope was calculated.</p></div>";

  h += "<h3>Totals</h3><p class=\"small muted\">Select any number to see how it was calculated. Scope 2 is location-based.</p>";
  h += "<div class=\"data-table-wrap\"><table class=\"data wb-totals\"><tbody>" +
    "<tr><th>Scope 1: fuels and refrigerants</th><td class=\"num\">" + figButton("scope:1", res.byScope[0].t) + " tCO₂e</td></tr>" +
    "<tr><th>Scope 2: grid electricity and district cooling</th><td class=\"num\">" + figButton("scope:2", res.byScope[1].t) + " tCO₂e</td></tr>" +
    "</tbody><tfoot><tr><th>Total" + prov + "</th><td class=\"num\">" + figButton("total", res.total.t) + " tCO₂e</td></tr></tfoot></table></div>";

  h += findingsHtml();

  h += "<h3>By source</h3><div class=\"data-table-wrap wb-scroll\"><table class=\"data\"><thead><tr><th>Scope</th><th>Source</th><th class=\"num\">Activity</th><th>Factor</th><th class=\"num\">tCO₂e</th></tr></thead><tbody>";
  res.bySource.forEach((s) => {
    const fs = s.factorIds.map(factorById).filter(Boolean);
    h += "<tr><td>" + (s.scope || "–") + "</td><td>" + esc(s.label) + (s.notCounted.length ? "<br><span class=\"small muted\">" + s.notCounted.length + " not counted</span>" : "") + "</td><td class=\"num\">" + (s.activityUnit ? esc(qtyText(s.activity, s.activityUnit)) : "–") + "</td><td>" +
      (s.scope ? (fs.length ? fs.map((f) => esc(fmtExact(f.value)) + " " + factorPill(f)).join("<br>") : "<span class=\"pill bad\">missing</span>") : "<span class=\"small muted\">Activity only</span>") +
      "</td><td class=\"num\">" + (s.scope ? figButton(s.id, s.t) : "–") + "</td></tr>";
  });
  h += "</tbody></table></div>";

  h += "<h3>By site</h3><div class=\"data-table-wrap wb-scroll\"><table class=\"data\"><thead><tr><th>Site</th><th class=\"num\">Scope 1</th><th class=\"num\">Scope 2</th><th class=\"num\">Total</th></tr></thead><tbody>" +
    res.bySite.map((s) => "<tr><td>" + esc(s.site) + "</td><td class=\"num\">" + figButton(s.scope1.id, s.scope1.t) + "</td><td class=\"num\">" + figButton(s.scope2.id, s.scope2.t) + "</td><td class=\"num\">" + figButton(s.id, s.t) + "</td></tr>").join("") +
    "</tbody></table></div>";

  h += evidenceIndexHtml();

  const sum = summaries();
  h += "<h3>Summary</h3><div class=\"wb-summary\"><p>" + esc(sum.en) + "</p><p lang=\"ar\" dir=\"rtl\" class=\"wb-ar\">" + esc(sum.ar) + "</p><p class=\"small muted\">Both are built from fixed templates with the numbers above. The Arabic template is awaiting review by a native speaker.</p></div>";

  h += "<h3>Export</h3><p class=\"wb-buttons\"><button type=\"button\" class=\"btn btn-primary\" data-action=\"export-csv\">Download results as CSV</button><button type=\"button\" class=\"btn btn-ghost\" data-action=\"export-json\">Download everything as JSON</button></p><p class=\"small muted\">The files are built in your browser. The JSON holds the rows, factors, findings, decisions and change log.</p>";
  h += logHtml();
  h += navButtons([3, "Back"], null);
  panel.innerHTML = h;
}

function findingsHtml() {
  const fs = current.findings;
  const counts = {};
  fs.forEach((f) => { counts[f.severity] = (counts[f.severity] || 0) + 1; });
  let h = "<h3>Sieve findings</h3><p class=\"small muted\">" + (fs.length ? Object.keys(SEVERITY_LABEL).filter((k) => counts[k]).map((k) => counts[k] + " " + SEVERITY_LABEL[k].toLowerCase()).join(" · ") : "No findings.") + "</p>";
  h += "<details class=\"wb-help\"><summary>Outlier thresholds</summary><form class=\"wb-form wb-thresholds\" data-form=\"thresholds\">" +
    "<label>Flag a row above <input name=\"outlierHigh\" inputmode=\"decimal\" value=\"" + state.thresholds.outlierHigh + "\"> × its account's median</label>" +
    "<label>or below <input name=\"outlierLow\" inputmode=\"decimal\" value=\"" + state.thresholds.outlierLow + "\"> × the median</label>" +
    "<label>when the account has at least <input name=\"minRows\" inputmode=\"numeric\" value=\"" + state.thresholds.minRows + "\"> rows</label>" +
    "<p><button type=\"submit\" class=\"btn btn-ghost wb-sm\">Apply</button></p></form></details>";
  h += "<ol class=\"wb-findings\">";
  fs.forEach((f) => {
    h += "<li class=\"wb-finding\" id=\"finding-" + esc(f.id.replace(/[^a-zA-Z0-9_-]/g, "_")) + "\"><div class=\"wb-finding-head\"><span class=\"pill " + SEV_CLASS[f.severity] + "\">" + SEVERITY_LABEL[f.severity] + "</span>" + (f.resolved ? " <span class=\"pill ok\">decided</span>" : "") + " <b>" + esc(f.title) + "</b></div>" +
      "<p>" + esc(f.explanation) + "</p><p class=\"small muted\">Suggested: " + esc(f.action) + "</p>" +
      "<p class=\"wb-rowlinks small\">Rows: " + f.rowIds.slice(0, 12).map((id) => "<button type=\"button\" class=\"trace\" data-row=\"" + esc(id) + "\">" + esc(id) + "</button>").join(" ") + (f.rowIds.length > 12 ? " and " + (f.rowIds.length - 12) + " more" : "") + "</p>" +
      findingControls(f) + "</li>";
  });
  h += "</ol>";
  const decided = Object.entries(state.decisions);
  if (decided.length) {
    h += "<h4>Decisions recorded</h4><ul class=\"plain\">" + decided.map(([id, d]) => "<li><b>" + esc(d.title || id) + ":</b> " + esc(d.summary) + ". Reason: " + esc(d.reason) + " <span class=\"small muted\">(" + esc(d.at.replace("T", " ").replace("Z", " UTC")) + ")</span></li>").join("") + "</ul>";
  }
  return h;
}

function findingControls(f) {
  const id = esc(f.id);
  if (f.check === "outlier" && !f.resolved) {
    const row = rowById(f.rowIds[0]);
    const hint = row && row.origin && row.origin.doc && state.mode === "demo" ? HINTS[row.origin.doc] : null;
    return "<form class=\"wb-form wb-decide\" data-form=\"decide\" data-finding=\"" + id + "\"><fieldset><legend>Your decision</legend>" +
      (hint ? "<p class=\"small\">" + esc(hint.text) + "</p>" : "") +
      "<label class=\"wb-radio\"><input type=\"radio\" name=\"choice\" value=\"keep\"> Keep " + esc(fmtExact(row.quantity)) + " " + esc(row.unit) + " as invoiced</label>" +
      "<label class=\"wb-radio\"><input type=\"radio\" name=\"choice\" value=\"correct\"" + (hint ? " checked" : "") + "> Correct it to <input name=\"value\" inputmode=\"decimal\" class=\"wb-inline\" value=\"" + (hint ? hint.suggested : "") + "\" aria-label=\"Corrected quantity\"> " + esc(row.unit) + "</label>" +
      "<label class=\"wb-radio\"><input type=\"radio\" name=\"choice\" value=\"exclude\"> Exclude the row</label>" +
      "<label class=\"wide\">Reason <textarea name=\"reason\" rows=\"2\">" + (hint ? "Provider confirmed a misplaced decimal point (simulated for the demo)." : "") + "</textarea></label>" +
      "<div class=\"wb-form-errors\" role=\"alert\"></div><p><button type=\"submit\" class=\"btn btn-primary wb-sm\">Record decision</button></p></fieldset></form>";
  }
  if (f.check === "outlier" && f.resolved) return "<p class=\"small\">Kept as invoiced. Reason: " + esc(f.decision.reason) + "</p>";
  if (f.check === "duplicate" && f.autoSetAside) {
    return f.resolved
      ? "<p class=\"small\">Both are counted. Reason: " + esc(f.decision.reason) + "</p>"
      : "<p><button type=\"button\" class=\"chip-btn\" data-action=\"count-both\" data-finding=\"" + id + "\">Count both</button></p>";
  }
  if (f.check === "duplicate") {
    return "<p>" + f.rowIds.slice(1).map((r) => "<button type=\"button\" class=\"chip-btn\" data-action=\"exclude-row\" data-id=\"" + esc(r) + "\">Exclude " + esc(r) + "</button>").join(" ") + "</p>";
  }
  if (f.check === "overlap") {
    return "<p>" + f.rowIds.map((r) => "<button type=\"button\" class=\"chip-btn\" data-action=\"exclude-row\" data-id=\"" + esc(r) + "\">Exclude " + esc(r) + "</button>").join(" ") + "</p>";
  }
  if (f.check === "unit" || f.check === "quantity") {
    return "<p><button type=\"button\" class=\"chip-btn\" data-action=\"edit-row\" data-id=\"" + esc(f.rowIds[0]) + "\">Edit " + esc(f.rowIds[0]) + "</button> <button type=\"button\" class=\"chip-btn\" data-row=\"" + esc(f.rowIds[0]) + "\">Open the source</button></p>";
  }
  if (f.check === "factor" && f.severity !== "info") {
    return "<p><button type=\"button\" class=\"chip-btn\" data-step=\"3\">Go to factors</button></p>";
  }
  if (f.check === "gap") {
    const held = [...current.effects.skip.keys()];
    const rel = relatedAccounts(state.rows, f.gap, held);
    const opts = [["daily-average", RULES["daily-average"].label]].concat(rel.map((r) => ["related-ratio|" + r.account_id + "|" + r.source_type, RULES["related-ratio"].label + ": " + r.account_id + " (" + (SOURCE_LABEL[r.source_type] || r.source_type).toLowerCase() + ")"]));
    return "<form class=\"wb-form wb-estimate\" data-form=\"estimate\" data-finding=\"" + id + "\"><label class=\"wide\">Fill with an estimate (optional) <select name=\"rule\">" + opts.map(([v, l]) => "<option value=\"" + esc(v) + "\">" + esc(l) + "</option>").join("") + "</select></label>" +
      "<p class=\"small muted wide\" data-rule-text>" + esc(RULES[rel.length ? "daily-average" : "daily-average"].text) + "</p><div class=\"wb-form-errors\" role=\"alert\"></div><p><button type=\"submit\" class=\"btn btn-ghost wb-sm\">Add estimates</button></p></form>";
  }
  if (f.check === "estimate") {
    return "<p><button type=\"button\" class=\"chip-btn\" data-action=\"remove-estimates\">Remove the estimates</button></p>";
  }
  return "";
}

function evidenceIndexHtml() {
  const res = current.result;
  const figs = [
    ["Total", res.total],
    ["Scope 1", res.byScope[0]],
    ["Scope 2 (location-based)", res.byScope[1]],
    ...res.bySource.filter((s) => s.scope).map((s) => [s.label, s]),
    ...res.bySite.map((s) => ["Site: " + s.site, s])
  ];
  const srcList = (ids) => {
    const set = [];
    ids.forEach((id) => {
      const r = rowById(id);
      const lbl = r ? originLabel(r) : id;
      if (!set.some((x) => x[0] === lbl)) set.push([lbl, r]);
    });
    const shown = set.slice(0, 6).map(([lbl, r]) => (r && r.origin.kind === "document") ? "<button type=\"button\" class=\"trace\" data-doc=\"" + esc(r.origin.doc) + "\">" + esc(lbl) + "</button>" : "<button type=\"button\" class=\"trace\" data-row=\"" + esc(r ? r.id : lbl) + "\">" + esc(lbl) + "</button>");
    return shown.join(", ") + (set.length > 6 ? " and " + (set.length - 6) + " more" : "");
  };
  let h = "<h3>Evidence index</h3><p class=\"small muted\">Each figure, the rows behind it, their sources and the factors applied.</p><div class=\"data-table-wrap wb-scroll\"><table class=\"data\"><thead><tr><th>Figure</th><th class=\"num\">tCO₂e</th><th>Rows</th><th>Sources</th><th>Factors</th></tr></thead><tbody>";
  figs.forEach(([label, fig]) => {
    h += "<tr><td>" + esc(label) + "</td><td class=\"num\">" + figButton(fig.id, fig.t) + "</td><td>" + fig.rowIds.length + "</td><td>" + srcList(fig.rowIds) + "</td><td>" + fig.factorIds.map((id) => { const f = factorById(id); return "<code>" + esc(id) + "</code> " + factorPill(f); }).join("<br>") + "</td></tr>";
  });
  return h + "</tbody></table></div>";
}

function summaries() {
  return {
    en: summaryEN({ company: state.company, period: state.period, run: current }),
    ar: summaryAR({ company_ar: state.mode === "demo" ? state.company_ar : state.company, period: state.period, run: current })
  };
}

/* ---------- traces ---------- */
function factorBlock(f) {
  return f ? "<div><span class=\"k\">Factor</span><span>" + factorSourceHtml(f) + "</span></div>" : "<div><span class=\"k\">Factor</span><span><span class=\"pill bad\">missing</span></span></div>";
}

function rowCalcText(row, rr) {
  if (rr.status !== "included" && rr.status !== "activity-only") return "Not counted: " + rr.reason;
  const parts = [];
  const c = rr.canonical;
  if (c.from !== c.unit) parts.push(fmtExact(row.quantity, 4) + " " + c.from + " × " + fmtExact(c.multiplier, 9) + " = " + fmtExact(c.value, 4) + " " + c.unit);
  const share = rr.share < 1 ? " × " + fmtExact(rr.share * 100, 2) + "% inside the period (" + rr.daysIn + " of " + rr.daysTotal + " days)" : "";
  if (rr.status === "activity-only") return (parts.length ? parts[0] + ". " : "") + fmtExact(rr.activity, 4) + " " + c.unit + " recorded as activity only.";
  parts.push(fmtExact(c.value, 4) + " " + c.unit + share + " × " + fmtExact(rr.factorValue) + " kg CO₂e/" + rr.factorUnit + " ÷ 1,000 = " + t3(rr.t) + " tCO₂e");
  return parts.join("; ");
}

function sourceBlock(row) {
  const o = row.origin || {};
  if (o.kind === "document") {
    const d = state.documents.get(o.doc);
    return "<h4>Source document " + esc(o.doc) + "</h4><p class=\"small muted\">Read from: " + esc(o.field) + "</p>" + (d ? d.html : "");
  }
  if (o.kind === "csv") return "<h4>Source: line " + o.line + " of " + esc(o.file) + "</h4><pre class=\"wb-raw\">" + esc(o.raw) + "</pre>";
  if (o.kind === "estimate") {
    return "<h4>Source: estimate</h4><p>" + esc(o.ruleText) + "</p><p class=\"small\"><code>" + esc(o.working) + "</code></p><p class=\"small\">Built from: " + o.basisRowIds.map((id) => "<button type=\"button\" class=\"trace\" data-row=\"" + esc(id) + "\">" + esc(id) + "</button>").join(" ") + "</p>";
  }
  return "<h4>Source: entered by hand</h4><p class=\"small muted\">Added on " + esc((o.at || "").replace("T", " ").replace("Z", " UTC")) + ".</p>";
}

function openRow(id) {
  const row = rowById(id);
  if (!row) return;
  const rr = current.result.byId.get(id);
  const f = rr.factorId ? factorById(rr.factorId) : chooseFactor(activityKey(row), allFactors(), state.choices);
  const fs = findingsFor(id);
  const changes = state.log.filter((e) => e.rowId === id);
  let h = "<div class=\"trace-path\">" +
    "<div><span class=\"k\">Result</span><span>" + statusPill(rr.status) + (rr.status === "included" ? " <b>" + t3(rr.t) + " tCO₂e</b> · Scope " + rr.scope : "") + "</span></div>" +
    "<div><span class=\"k\">Calculation</span><span><code>" + esc(rowCalcText(row, rr)) + "</code></span></div>" +
    "<div><span class=\"k\">Row</span><span>" + esc(row.site) + " · " + esc(row.account_id) + " · " + esc(row.document_ref || "no reference") + "<br>" + typeText(row) + " · " + esc(fmtPeriod(row.period_start, row.period_end)) + " · " + esc(fmtExact(row.quantity, 4)) + " " + esc(row.unit) + (row.notes ? "<br><span class=\"small muted\">" + esc(row.notes) + "</span>" : "") + "</span></div>" +
    (rr.scope ? factorBlock(f) : "") +
    (fs.length ? "<div><span class=\"k\">Checks</span><span>" + fs.map((x) => "<span class=\"pill " + SEV_CLASS[x.severity] + "\">" + esc(x.check) + "</span> " + esc(x.explanation)).join("<br>") + "</span></div>" : "") +
    (changes.length ? "<div><span class=\"k\">Changes</span><span>" + changes.map((e) => esc(e.field) + ": " + esc(e.old) + " → " + esc(e.new) + " <span class=\"muted\">(" + esc(e.reason) + ")</span>").join("<br>") + "</span></div>" : "") +
    "</div>";
  h += sourceBlock(row);
  h += "<p class=\"wb-buttons\"><button type=\"button\" class=\"chip-btn\" data-action=\"edit-row\" data-id=\"" + esc(id) + "\">Edit this row</button></p>";
  openDialog("Row " + id, h);
}

function openDoc(docId) {
  const d = state.documents.get(docId);
  if (!d) return;
  const rows = state.rows.filter((r) => r.origin && r.origin.doc === docId);
  openDialog(d.id + ": " + d.title, "<p class=\"small\">Rows read from this document: " + rows.map((r) => "<button type=\"button\" class=\"trace\" data-row=\"" + esc(r.id) + "\">" + esc(r.id) + "</button>").join(" ") + "</p>" + d.html);
}

function figureTitle(id) {
  if (id === "total") return "Total, Scope 1 and 2";
  if (id.startsWith("scope:")) return "Scope " + id.slice(6) + (id === "scope:2" ? " (location-based)" : "");
  if (id.startsWith("source:")) return SOURCE_LABEL[id.slice(7)] || id;
  const m = /^site:(.*?)(?::([12]))?$/.exec(id);
  if (m) return m[1] + (m[2] ? ", Scope " + m[2] : "");
  return id;
}

function openFigure(id) {
  const fig = findFigure(current.result, id);
  if (!fig) return;
  const rows = fig.rowIds.map((rid) => [rowById(rid), current.result.byId.get(rid)]);
  let h = "<div class=\"trace-path\"><div><span class=\"k\">Figure</span><span><b>" + t3(fig.t) + " tCO₂e</b>" + (current.effects.provisional ? " <span class=\"pill warn\">provisional</span>" : "") + "</span></div>" +
    "<div><span class=\"k\">Calculation</span><span>Sum of " + rows.length + (rows.length === 1 ? " row" : " rows") + ". Each row is its quantity in the factor's unit × the share inside the reporting period × the factor ÷ 1,000.</span></div></div>";
  h += "<div class=\"data-table-wrap wb-scroll\"><table class=\"data\"><thead><tr><th>Row</th><th>Source</th><th>Period</th><th class=\"num\">Activity</th><th class=\"num\">Factor</th><th class=\"num\">tCO₂e</th></tr></thead><tbody>" +
    rows.map(([r, rr]) => "<tr" + (r.estimate ? " class=\"est\"" : "") + "><td><button type=\"button\" class=\"trace\" data-row=\"" + esc(r.id) + "\">" + esc(r.id) + "</button>" + (r.estimate ? " <span class=\"pill warn\">estimate</span>" : "") + "</td><td>" + originButton(r) + "</td><td class=\"nowrap\">" + esc(fmtPeriod(r.period_start, r.period_end)) + "</td><td class=\"num\">" + esc(qtyText(rr.activity, rr.canonical.unit)) + (rr.share < 1 ? " <span class=\"small muted\">(" + fmtExact(rr.share * 100, 1) + "%)</span>" : "") + "</td><td class=\"num\">" + esc(fmtExact(rr.factorValue)) + "</td><td class=\"num\">" + t3(rr.t) + "</td></tr>").join("") +
    "</tbody><tfoot><tr><th colspan=\"5\">Total</th><td class=\"num\">" + t3(fig.t) + "</td></tr></tfoot></table></div>";
  h += "<h4>Factors</h4>" + (fig.factorIds.length ? fig.factorIds.map((fid) => factorSourceHtml(factorById(fid))).join("") : "<p class=\"small muted\">No factors applied.</p>");
  if (fig.notCounted && fig.notCounted.length) {
    h += "<h4>Not counted</h4><ul class=\"plain small\">" + fig.notCounted.map((n) => "<li><button type=\"button\" class=\"trace\" data-row=\"" + esc(n.rowId) + "\">" + esc(n.rowId) + "</button>: " + esc(n.reason) + "</li>").join("") + "</ul>";
  }
  openDialog(figureTitle(id), h);
}

/* ---------- actions ---------- */
function excludeRow(id) {
  const row = rowById(id);
  if (!row) return;
  const dup = current.findings.find((f) => f.check === "duplicate" && f.rowIds.includes(id) && f.rowIds[0] !== id);
  reasonDialog("Exclude " + id, "The row stays in the table, marked excluded, and is left out of every total.", "Exclude row", dup ? "Duplicate of " + dup.rowIds[0] + "." : "", (reason) => {
    row.excluded = true;
    row.exclude_reason = reason;
    log({ kind: "exclude", rowId: id, field: "status", old: "included", new: "excluded", reason });
  });
}

function onDecide(form) {
  const fid = form.dataset.finding;
  const f = current.findings.find((x) => x.id === fid);
  if (!f) return;
  const row = rowById(f.rowIds[0]);
  const data = Object.fromEntries(new FormData(form).entries());
  const errs = [];
  const reason = (data.reason || "").trim();
  if (!data.choice) errs.push("Choose one option.");
  if (!reason) errs.push("Give a reason. It goes into the change log.");
  let value = null;
  if (data.choice === "correct") {
    const { row: tmp } = validateRecord({ ...row, quantity: data.value });
    value = tmp.quantity;
    if (value === null) errs.push("Enter the corrected quantity as a number.");
  }
  if (errs.length) { form.querySelector(".wb-form-errors").innerHTML = "<ul class=\"plain\">" + errs.map((e) => "<li>" + esc(e) + "</li>").join("") + "</ul>"; return; }
  const at = stamp();
  if (data.choice === "keep") {
    state.decisions[fid] = { choice: "keep", quantity: row.quantity, unit: row.unit, reason, at, title: f.title, summary: "kept " + fmtExact(row.quantity) + " " + row.unit + " as invoiced" };
    log({ kind: "decision", rowId: row.id, field: "Sieve decision", old: "pending", new: "keep as invoiced", reason });
  } else if (data.choice === "correct") {
    log({ kind: "decision", rowId: row.id, field: "quantity", old: String(row.quantity), new: String(value), reason });
    state.decisions[fid] = { choice: "correct", from: row.quantity, to: value, unit: row.unit, reason, at, title: f.title, summary: "corrected " + fmtExact(row.quantity) + " to " + fmtExact(value) + " " + row.unit };
    row.quantity = value;
  } else {
    row.excluded = true;
    row.exclude_reason = reason;
    log({ kind: "decision", rowId: row.id, field: "status", old: "included", new: "excluded", reason });
    state.decisions[fid] = { choice: "exclude", reason, at, title: f.title, summary: "excluded " + row.id };
  }
  render();
}

function onEstimate(form) {
  const fid = form.dataset.finding;
  const f = current.findings.find((x) => x.id === fid);
  if (!f) return;
  const v = String(new FormData(form).get("rule") || "");
  const [rule, account_id, source_type] = v.split("|");
  const held = [...current.effects.skip.keys()];
  const out = estimateGap(state.rows, f.gap, { rule, related: account_id ? { account_id, source_type } : null, excludeRowIds: held });
  if (!out.ok) { form.querySelector(".wb-form-errors").innerHTML = "<p class=\"small\">" + esc(out.message) + "</p>"; return; }
  out.rows.forEach((r) => {
    state.counters.E += 1;
    const id = "E" + String(state.counters.E).padStart(3, "0");
    state.rows.push({ ...r, id });
    log({ kind: "estimate", rowId: id, field: "row", old: "", new: fmtExact(r.quantity, 2) + " " + r.unit + " for " + fmtPeriod(r.period_start, r.period_end), reason: "Estimate: " + RULES[rule].label + ". " + out.note });
  });
  render();
}

function removeEstimates() {
  reasonDialog("Remove the estimates", "The estimate rows are deleted and the gap is reported again.", "Remove", "Real documents received.", (reason) => {
    state.rows.filter((r) => r.estimate).forEach((r) => log({ kind: "delete", rowId: r.id, field: "row", old: fmtExact(r.quantity, 2) + " " + r.unit + " (estimate)", new: "", reason }));
    state.rows = state.rows.filter((r) => !r.estimate);
  });
}

root.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  if (form.dataset.form === "decide") onDecide(form);
  if (form.dataset.form === "estimate") onEstimate(form);
  if (form.dataset.form === "thresholds") {
    const d = Object.fromEntries(new FormData(form).entries());
    const hi = Number(d.outlierHigh); const lo = Number(d.outlierLow); const n = Math.round(Number(d.minRows));
    if (hi > 1 && lo > 0 && lo < 1 && n >= 2) {
      const old = JSON.stringify({ high: state.thresholds.outlierHigh, low: state.thresholds.outlierLow, minRows: state.thresholds.minRows });
      state.thresholds = { ...state.thresholds, outlierHigh: hi, outlierLow: lo, minRows: n };
      log({ kind: "setting", rowId: "", field: "outlier thresholds", old, new: JSON.stringify({ high: hi, low: lo, minRows: n }), reason: "Changed in results" });
      render();
    } else {
      window.alert("Use a high multiple above 1, a low multiple between 0 and 1, and at least 2 rows.");
    }
  }
});

root.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "wb-file") { loadCSV(t.files && t.files[0]); return; }
  if (t.id === "wb-start" || t.id === "wb-end") {
    const s = $("#wb-start").value; const en = $("#wb-end").value;
    if (s && en && s <= en) { state.period = { start: s, end: en }; if (state.mode) log({ kind: "setting", rowId: "", field: "reporting period", old: "", new: s + " to " + en, reason: "Changed by user" }); render(); }
    return;
  }
  if (t.id === "wb-org") { state.company = t.value.trim(); if (state.mode === "demo") state.company_ar = state.company; render(); return; }
  if (t.dataset.action === "filter") { state.filter = t.value; render(); return; }
  if (t.dataset.action === "choose-factor") {
    const key = t.dataset.key;
    const prev = chooseFactor(key, allFactors(), state.choices);
    state.choices[key] = t.value;
    const next = factorById(t.value);
    log({ kind: "factor", rowId: "", field: "factor: " + keyLabel(key), old: prev ? prev.label + " " + fmtExact(prev.value) : "none", new: next.label + " " + fmtExact(next.value), reason: "Chosen in factors step" });
    render();
    return;
  }
  if (t.name === "rule" && t.closest("form[data-form=estimate]")) {
    const p = t.closest("form").querySelector("[data-rule-text]");
    if (p) p.textContent = RULES[t.value.split("|")[0]].text;
  }
});

function onClick(e) {
  const b = e.target.closest("button, [data-action]");
  if (!b || b.tagName === "LABEL") return;
  if (b.dataset.fig) { openFigure(b.dataset.fig); return; }
  if (b.dataset.row) { openRow(b.dataset.row); return; }
  if (b.dataset.doc) { openDoc(b.dataset.doc); return; }
  if (b.dataset.step && !b.disabled) { if (dialog.open) closeDialog(); go(Number(b.dataset.step)); return; }
  const a = b.dataset.action;
  if (!a) return;
  const id = b.dataset.id;
  if (a === "close-dialog") closeDialog();
  else if (a === "load-demo") loadDemo();
  else if (a === "start-manual") startManual();
  else if (a === "add-row") editRow(null);
  else if (a === "edit-row") editRow(id);
  else if (a === "exclude-row") excludeRow(id);
  else if (a === "include-row") {
    reasonDialog("Include " + id, "", "Include row", "", (reason) => {
      const row = rowById(id);
      row.excluded = false;
      row.exclude_reason = "";
      log({ kind: "include", rowId: id, field: "status", old: "excluded", new: "included", reason });
    });
  } else if (a === "confirm-row") {
    const row = rowById(id);
    row.confirmed = true;
    log({ kind: "confirm", rowId: id, field: "confirmed", old: "no", new: "yes", reason: "Checked against the source in review" });
    render();
  } else if (a === "confirm-shown") {
    const shown = [...root.querySelectorAll("[data-panel=\"2\"] [data-action=confirm-row]")].map((x) => x.dataset.id);
    shown.forEach((rid) => { rowById(rid).confirmed = true; log({ kind: "confirm", rowId: rid, field: "confirmed", old: "no", new: "yes", reason: "Confirmed with the rows shown" }); });
    render();
  } else if (a === "delete-row") {
    reasonDialog("Delete " + id, "The row is removed. The change log keeps a record of it.", "Delete row", "", (reason) => {
      const row = rowById(id);
      log({ kind: "delete", rowId: id, field: "row", old: row.source_type + " " + row.quantity + " " + row.unit + " (" + originLabel(row) + ")", new: "", reason });
      state.rows = state.rows.filter((r) => r.id !== id);
    });
  } else if (a === "user-factor") userFactorDialog(b.dataset.key);
  else if (a === "count-both") {
    const f = current.findings.find((x) => x.id === b.dataset.finding);
    reasonDialog("Count both rows", "Use this only if the documents are separate charges.", "Count both", "", (reason) => {
      state.decisions[f.id] = { choice: "count-all", reason, at: stamp(), title: f.title, summary: "counted " + f.rowIds.join(" and ") + " separately" };
      log({ kind: "decision", rowId: f.autoSetAside[0], field: "duplicate", old: "set aside", new: "counted", reason });
    });
  } else if (a === "remove-estimates") removeEstimates();
  else if (a === "export-csv") download("nokhada-workbench-results.csv", resultsCSV(state.rows, current), "text/csv;charset=utf-8");
  else if (a === "export-json") {
    download("nokhada-workbench.json", resultsJSON({
      meta: { generatedAt: stamp(), mode: state.mode === "demo" ? "demo pack (fictional)" : "user data", company: state.company },
      period: state.period, rows: state.rows, factorsAvailable: allFactors(), choices: state.choices, decisions: state.decisions,
      log: state.log, thresholds: state.thresholds, run: current, summary: { ...summaries(), ar_review: "Arabic template pending native-speaker review" }
    }), "application/json");
  }
}
root.addEventListener("click", onClick);
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) { closeDialog(); return; }
  onClick(e);
});

/* ---------- start ---------- */
async function init() {
  try {
    const res = await fetch(new URL("./factors.json", import.meta.url));
    const lib = await res.json();
    const problems = validateLibrary(lib);
    if (problems.length) throw new Error(problems.join("; "));
    state.library = lib.factors;
  } catch (err) {
    state.libraryError = true;
    console.warn("Workbench factor library:", err);
  }
  render();
}
init();
