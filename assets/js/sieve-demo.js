/* Nokhada — Sieve demo.
   A scripted replay of a Nokhada run on a fictional company's evidence pack.
   Extraction is pre-computed; calculations, checks and traces run live in the browser.
   All companies, documents and emission factors are illustrative. */
(function () {
  "use strict";
  var root = document.getElementById("sieve-demo");
  if (!root) return;

  /* ---------------- Illustrative methodology ---------------- */
  var F = {
    grid: { v: 0.40, unit: "kgCO₂e/kWh", label: "Grid electricity", clause: "factors.md §2.1" },
    dc: { v: 0.38, unit: "kgCO₂e/RTh", label: "District cooling", clause: "factors.md §2.2" },
    diesel: { v: 2.68, unit: "kgCO₂e/L", label: "Diesel", clause: "factors.md §1.1" },
    petrol: { v: 2.31, unit: "kgCO₂e/L", label: "Petrol", clause: "factors.md §1.2" },
    r410a: { v: 1924, unit: "kgCO₂e/kg (GWP)", label: "R-410A refrigerant", clause: "factors.md §1.4" }
  };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  /* ---------------- Evidence pack ---------------- */
  var WE = [61200, 58900, 64800, 71300, 82600, 94100, 101800, 103200, 92400, 78600, 66300, 60800];
  var HE = [21400, 20100, 22800, 24900, 28700, 31800, 33900, 34200, 30600, 26400, 22900, 21100];
  var HC = [9800, 9200, null, null, null, 21400, 236000, 24100, 20800, 15900, 11800, 10200];
  var HC_CORRECTED_JUL = 23600;
  var FUEL = [{ q: "Q1", d: 41200, p: 1840 }, { q: "Q2", d: 43800, p: 1910 }, { q: "Q3", d: 45100, p: 1880 }, { q: "Q4", d: 44300, p: 1950 }];
  var GEN = [{ id: "GD-01", date: "2025-02-11", l: 2400 }, { id: "GD-02", date: "2025-05-19", l: 1800 }, { id: "GD-03", date: "2025-08-06", l: 3100 }, { id: "GD-04", date: "2025-11-23", l: 2200 }, { id: "GD-05", date: "2026-01-04", l: 1900, out: true }];
  var REF = [{ date: "2025-06-14", kg: 8.5 }, { date: "2025-08-27", kg: 4.0 }];

  var docs = [];
  WE.forEach(function (v, i) {
    docs.push({ id: "WE-" + pad(i + 1), group: "we", lang: "en", month: i, qty: v, unit: "kWh", inv: "INV-JA-25" + pad(i + 1) + "17", name: MONTHS[i] + " 2025" });
    if (i === 7) docs.push({ id: "WE-08b", group: "we", lang: "en", month: i, qty: v, unit: "kWh", inv: "INV-JA-250817", name: "Aug 2025 (copy)", dup: true });
  });
  HE.forEach(function (v, i) { docs.push({ id: "HE-" + pad(i + 1), group: "he", lang: "ar", month: i, qty: v, unit: "kWh", inv: "DXB-HQ-25" + pad(i + 1), name: MONTHS_AR[i] + " ٢٠٢٥" }); });
  HC.forEach(function (v, i) { if (v !== null) docs.push({ id: "HC-" + pad(i + 1), group: "hc", lang: "en", month: i, qty: v, unit: "RTh", inv: "DC-7741-" + pad(i + 1), name: MONTHS[i] + " 2025", odd: i === 6 }); });
  FUEL.forEach(function (f, i) { docs.push({ id: "FC-" + f.q, group: "fc", lang: "en", q: i, diesel: f.d, petrol: f.p, name: f.q + " 2025 export" }); });
  GEN.forEach(function (g) { docs.push({ id: g.id, group: "gd", lang: "ar", date: g.date, qty: g.l, unit: "L", name: "مذكرة تسليم " + g.date.slice(5).replace("-", "/"), out: !!g.out }); });
  docs.push({ id: "RF-LOG", group: "rf", lang: "ar", name: "سجل غاز التبريد", entries: REF });

  var GROUPS = [
    { id: "we", title: "Warehouse electricity bills", sub: "Jebel Ali Free Zone · English" },
    { id: "he", title: "HQ electricity bills", sub: "Dubai · Arabic" },
    { id: "hc", title: "HQ district-cooling invoices", sub: "Dubai · English" },
    { id: "fc", title: "Fuel-card exports", sub: "Fleet · 12 trucks, 2 vans" },
    { id: "gd", title: "Generator diesel delivery notes", sub: "Warehouse · Arabic" },
    { id: "rf", title: "Refrigerant log", sub: "Warehouse chillers · Arabic" }
  ];

  /* ---------------- State ---------------- */
  var state = { decision: null, step: 3, running: false };

  /* ---------------- Calculations (live) ---------------- */
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function calc() {
    var ratios = [];
    HC.forEach(function (v, i) { if (v !== null && i !== 6) ratios.push(v / HE[i]); });
    var ratio = median(ratios);
    var hcRows = HC.map(function (v, i) {
      if (v === null) return { month: i, qty: Math.round(HE[i] * ratio), est: true, docs: ["HE-" + pad(i + 1)] };
      if (i === 6) {
        if (state.decision === "corrected") return { month: i, qty: HC_CORRECTED_JUL, corrected: true, docs: ["HC-07"] };
        if (state.decision === "invoiced") return { month: i, qty: v, docs: ["HC-07"] };
        return { month: i, qty: v, pending: true, docs: ["HC-07"] };
      }
      return { month: i, qty: v, docs: ["HC-" + pad(i + 1)] };
    });
    var hcQty = hcRows.reduce(function (s, r) { return s + (r.pending ? 0 : r.qty); }, 0);
    var weQty = sum(WE);
    var heQty = sum(HE);
    var dieselQty = FUEL.reduce(function (s, f) { return s + f.d; }, 0);
    var petrolQty = FUEL.reduce(function (s, f) { return s + f.p; }, 0);
    var genQty = GEN.filter(function (g) { return !g.out; }).reduce(function (s, g) { return s + g.l; }, 0);
    var refQty = REF.reduce(function (s, r) { return s + r.kg; }, 0);
    var t = function (q, f) { return q * f.v / 1000; };
    var lines = [
      { id: "S1-FLEET-D", scope: 1, label: "Fleet diesel (trucks)", qty: dieselQty, unit: "L", f: F.diesel, t: t(dieselQty, F.diesel), docs: ["FC-Q1", "FC-Q2", "FC-Q3", "FC-Q4"] },
      { id: "S1-FLEET-P", scope: 1, label: "Fleet petrol (vans)", qty: petrolQty, unit: "L", f: F.petrol, t: t(petrolQty, F.petrol), docs: ["FC-Q1", "FC-Q2", "FC-Q3", "FC-Q4"] },
      { id: "S1-GEN", scope: 1, label: "Generator diesel", qty: genQty, unit: "L", f: F.diesel, t: t(genQty, F.diesel), docs: ["GD-01", "GD-02", "GD-03", "GD-04"], note: "GD-05 is dated 4 Jan 2026, outside FY2025, so it's excluded under boundary.md §1.3." },
      { id: "S1-REF", scope: 1, label: "Refrigerant top-ups (R-410A)", qty: refQty, unit: "kg", f: F.r410a, t: t(refQty, F.r410a), docs: ["RF-LOG"] },
      { id: "S2-WE", scope: 2, label: "Warehouse electricity", qty: weQty, unit: "kWh", f: F.grid, t: t(weQty, F.grid), docs: docs.filter(function (d) { return d.group === "we" && !d.dup; }).map(function (d) { return d.id; }), note: "WE-08b duplicates WE-08 (same invoice number) and is counted once." },
      { id: "S2-HE", scope: 2, label: "HQ electricity", qty: heQty, unit: "kWh", f: F.grid, t: t(heQty, F.grid), docs: docs.filter(function (d) { return d.group === "he"; }).map(function (d) { return d.id; }) },
      { id: "S2-HC", scope: 2, label: "HQ district cooling", qty: hcQty, unit: "RTh", f: F.dc, t: t(hcQty, F.dc), docs: docs.filter(function (d) { return d.group === "hc"; }).map(function (d) { return d.id; }),
        note: "Mar–May are estimated under estimation.md §3.2 (HQ electricity × median cooling/electricity ratio of " + ratio.toFixed(3) + ")." + (state.decision === null ? " July is excluded until a reviewer decides on the flagged invoice." : state.decision === "corrected" ? " July uses the provider-confirmed correction of 23,600 RTh." : " July uses the invoiced 236,000 RTh, as the reviewer decided."),
        est: hcRows.filter(function (r) { return r.est; }).reduce(function (s, r) { return s + r.qty; }, 0) }
    ];
    var s1 = lines.filter(function (l) { return l.scope === 1; }).reduce(function (s, l) { return s + l.t; }, 0);
    var s2 = lines.filter(function (l) { return l.scope === 2; }).reduce(function (s, l) { return s + l.t; }, 0);
    var estT = lines[6].est * F.dc.v / 1000;
    return { lines: lines, s1: s1, s2: s2, total: s1 + s2, estShare: estT / (s1 + s2), hcRows: hcRows, ratio: ratio };
  }

  /* ---------------- Sieve checks ---------------- */
  function checks() {
    var dec = state.decision;
    return [
      { layer: "Trace", v: "pass", title: "46 of 50 figures trace cleanly to a source line", body: "Every monthly and quarterly figure was matched to an invoice, export or log entry in the evidence pack." },
      { layer: "Trace", v: "caught", title: "Duplicate invoice: WE-08 and WE-08b", body: "Both documents carry invoice INV-JA-250817 for August. Counted once. The copy is kept on file with a note.", docs: ["WE-08", "WE-08b"], resolved: "Resolved automatically under boundary.md §1.4" },
      { layer: "Recompute", v: "pass", title: "All calculations reproduce from source", body: "Each line was recomputed from the extracted quantities and factors.md v4, and the results match to the kilogram." },
      { layer: "Consistency", v: "caught", title: "Delivery note outside the reporting period", body: "GD-05 (1,900 L) is dated 4 January 2026 and excluded from FY2025 under boundary.md §1.3. It carries forward to FY2026.", docs: ["GD-05"], resolved: "Resolved automatically under boundary.md §1.3" },
      { layer: "Consistency", v: "caught", title: "Three months of cooling invoices missing", body: "HQ district-cooling invoices for March to May aren't in the pack. They're estimated under estimation.md §3.2 and labelled as estimates. Request the invoices from the provider to replace the estimates.", docs: ["HE-03", "HE-04", "HE-05"], resolved: "Estimated and labelled · invoice request drafted" },
      { layer: "Consistency", v: "pass", title: "One factor version across all sites and months", body: "factors.md v4 was applied everywhere, with no mixed versions or grids." },
      { layer: "Plausibility", v: "caught", title: "July cooling invoice is about 10× the expected value", body: "HC-07 shows 236,000 RTh. Based on July electricity, about 19,000–24,000 RTh is expected. The provider's email (simulated) confirms a misplaced decimal: 23,600 RTh.", docs: ["HC-07", "HE-07"], decision: true,
        resolved: dec === "corrected" ? "Reviewer accepted the corrected value of 23,600 RTh" : dec === "invoiced" ? "Reviewer kept the invoiced value of 236,000 RTh" : null },
      { layer: "Plausibility", v: "pass", title: "Warehouse electricity follows the cooling season", body: "The summer peak is 1.7× the winter months, consistent with cooling load for a warehouse in the Gulf." },
      { layer: "Plausibility", v: "pass", title: "Fleet fuel per vehicle within range", body: "Diesel per truck per month and petrol per van are within the expected bands for urban and regional logistics." }
    ];
  }

  /* ---------------- Helpers ---------------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function fmt(n, d) { return Number(n).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function $(sel) { return root.querySelector(sel); }
  function docById(id) { return docs.filter(function (d) { return d.id === id; })[0]; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, state.skip ? 0 : ms); }); }

  /* ---------------- Summary (always visible) ---------------- */
  function renderSummary() {
    var c = calc();
    var ch = checks();
    var caught = ch.filter(function (x) { return x.v === "caught"; }).length;
    var pending = state.decision === null ? 1 : 0;
    $("#kpis").innerHTML =
      kpi("Total, Scope 1 + 2", fmt(c.total, 1), "tCO₂e, FY2025", pending) +
      kpi("Scope 1", fmt(c.s1, 1), "fuel, generators, refrigerant", 0) +
      kpi("Scope 2", fmt(c.s2, 1), "electricity and district cooling", pending) +
      kpi("Sieve", caught + " caught", pending ? "1 needs your decision" : "all resolved", 0);
    $("#prov-note").hidden = !pending;
  }
  function kpi(k, v, u, prov) { return "<div class=\"kpi" + (prov ? " provisional" : "") + "\"><span class=\"k\">" + k + "</span><span class=\"v\">" + v + "</span><span class=\"u\">" + u + "</span></div>"; }

  /* ---------------- Panels ---------------- */
  function renderEvidence() {
    var html = "<div class=\"panel-head\"><div><span class=\"eyebrow\" style=\"margin:0 0 8px\">Step 1 · Evidence</span><h2>44 documents, as they arrived</h2></div><p>The documents are bills, exports and logs in Arabic and English, with nothing retyped. Select any document to open it.</p></div><div class=\"doc-groups\">";
    GROUPS.forEach(function (g) {
      var list = docs.filter(function (d) { return d.group === g.id; });
      html += "<section class=\"doc-group\"><h3>" + g.title + " <span class=\"mono\">" + list.length + " · " + g.sub + "</span></h3><div class=\"docs\">";
      list.forEach(function (d) {
        var flagged = d.dup || d.out || d.odd;
        html += "<button type=\"button\" class=\"doc" + (state.readAll ? " read" : "") + (flagged && state.flagsShown ? " flag" : "") + "\" data-doc=\"" + d.id + "\" data-lang=\"" + d.lang + "\">" +
          "<span class=\"dt\">" + d.id + "</span><span class=\"dn\"" + (d.lang === "ar" ? " lang=\"ar\" dir=\"rtl\"" : "") + ">" + esc(d.name) + "</span><span class=\"dl\">" + (d.lang === "ar" ? "Arabic" : "English") + "</span></button>";
      });
      html += "</div></section>";
    });
    html += "</div>";
    $("#panel").innerHTML = html;
  }

  function renderExtract() {
    var rows = [];
    docs.forEach(function (d) {
      if (d.group === "fc") {
        rows.push([d.id, "Fuel card", FUEL[d.q].q + " 2025", fmt(d.diesel) + " L diesel · " + fmt(d.petrol) + " L petrol", "English", ""]);
      } else if (d.group === "rf") {
        rows.push([d.id, "Refrigerant log", "2025", REF.map(function (r) { return r.kg + " kg R-410A (" + r.date + ")"; }).join(" · "), "Arabic", ""]);
      } else if (d.group === "gd") {
        rows.push([d.id, "Generator diesel", d.date, fmt(d.qty) + " L", "Arabic", d.out ? "Outside period" : ""]);
      } else {
        var type = d.group === "we" ? "Warehouse electricity" : d.group === "he" ? "HQ electricity" : "District cooling";
        rows.push([d.id, type, MONTHS[d.month] + " 2025", fmt(d.qty) + " " + d.unit, d.lang === "ar" ? "Arabic" : "English", d.dup ? "Duplicate" : d.odd ? "Implausible" : ""]);
      }
    });
    var html = "<div class=\"panel-head\"><div><span class=\"eyebrow\" style=\"margin:0 0 8px\">Step 2 · Extract</span><h2>Activity data, read from each document</h2></div><p>Quantities, periods and invoice numbers come straight from the documents. Of the 44, 18 are in Arabic and were read without translation. Rows flagged here go to the Sieve.</p></div>";
    html += "<div class=\"data-table-wrap\" style=\"max-height:520px\"><table class=\"data\"><thead><tr><th>Document</th><th>Type</th><th>Period</th><th class=\"num\">Extracted</th><th>Language</th><th>Flag</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      html += "<tr><td><button type=\"button\" class=\"trace\" data-doc=\"" + r[0] + "\">" + r[0] + "</button></td><td>" + r[1] + "</td><td>" + r[2] + "</td><td class=\"num\">" + r[3] + "</td><td>" + r[4] + "</td><td>" + (r[5] ? "<span class=\"pill bad\">" + r[5] + "</span>" : "") + "</td></tr>";
    });
    html += "</tbody></table></div>";
    $("#panel").innerHTML = html;
  }

  function renderCalculate() {
    var c = calc();
    var html = "<div class=\"panel-head\"><div><span class=\"eyebrow\" style=\"margin:0 0 8px\">Step 3 · Calculate</span><h2>The inventory, with every number traceable</h2></div><p>Select any tonnage to see how it was calculated, which factor and methodology clause applied, and the documents behind it.</p></div>";
    html += "<div class=\"data-table-wrap\"><table class=\"data\"><thead><tr><th>Scope</th><th>Source</th><th class=\"num\">Activity</th><th class=\"num\">Factor</th><th class=\"num\">tCO₂e</th></tr></thead><tbody>";
    c.lines.forEach(function (l) {
      html += "<tr" + (l.id === "S2-HC" && state.decision === null ? " class=\"est\"" : "") + "><td>" + l.scope + "</td><td>" + l.label + (l.id === "S2-HC" ? " <span class=\"pill warn\">incl. estimates</span>" : "") + "</td><td class=\"num\">" + fmt(l.qty, l.unit === "kg" ? 1 : 0) + " " + l.unit + "</td><td class=\"num\">" + l.f.v + " " + l.f.unit.replace("kgCO₂e/", "/") + "</td><td class=\"num\"><button type=\"button\" class=\"trace\" data-line=\"" + l.id + "\">" + fmt(l.t, 1) + "</button></td></tr>";
    });
    html += "</tbody><tfoot><tr><th colspan=\"4\">Scope 1</th><td class=\"num\">" + fmt(c.s1, 1) + "</td></tr><tr><th colspan=\"4\">Scope 2</th><td class=\"num\">" + fmt(c.s2, 1) + "</td></tr><tr><th colspan=\"4\">Total" + (state.decision === null ? " (provisional)" : "") + "</th><td class=\"num\">" + fmt(c.total, 1) + "</td></tr></tfoot></table></div>";
    html += "<p class=\"small muted\" style=\"margin-top:12px\">Estimated share of total: " + (c.estShare * 100).toFixed(1) + "%. Factors are illustrative for this demo. In a real engagement they come from your methodology file and are cited to their source.</p>";
    $("#panel").innerHTML = html;
  }

  /* Which mesh catches which finding (index into checks()) */
  var LAYERS = ["Trace", "Recompute", "Consistency", "Plausibility"];
  var CAUGHT_AT = [{ check: 1, layer: 0 }, { check: 3, layer: 2 }, { check: 4, layer: 2 }, { check: 6, layer: 3 }];

  function sieveVisHtml() {
    var h = "<div class=\"sieve-vis\" id=\"sieve-vis\" aria-label=\"50 figures pass through four checks; four are caught\">";
    h += "<button type=\"button\" class=\"btn btn-nacre sieve-cta\" id=\"pour-btn\" style=\"padding:9px 16px;font-size:.85rem\">Pour the figures through</button>";
    LAYERS.forEach(function (l, i) {
      var caught = CAUGHT_AT.filter(function (c) { return c.layer === i; }).length;
      h += "<div class=\"mesh-label\" style=\"top:" + (78 + i * 62) + "px\">" + l + "<b>" + (caught ? caught + " caught" : "0 caught") + "</b></div><div class=\"mesh\" style=\"top:" + (78 + i * 62) + "px\"></div>";
    });
    h += "<div class=\"tray\"></div><div class=\"tray-label\">46 pass</div>";
    for (var k = 0; k < 50; k++) h += "<span class=\"pearl\" data-p=\"" + k + "\"></span>";
    CAUGHT_AT.forEach(function (c, j) { h += "<button type=\"button\" class=\"pearl caught\" data-catch=\"" + c.check + "\" aria-label=\"Caught at " + LAYERS[c.layer] + ": " + esc(checks()[c.check].title) + "\" data-cl=\"" + c.layer + "\" data-j=\"" + j + "\"></button>"; });
    return h + "</div>";
  }

  function pearlTargets(vis) {
    var w = vis.clientWidth, left = w < 560 ? 100 : 150, right = 18, span = Math.max(80, w - left - right);
    var pass = [], top = [], caught = [];
    for (var k = 0; k < 50; k++) {
      var col = k % 25, row = Math.floor(k / 25);
      pass.push([left + 8 + (col + (row ? 0.5 : 0)) * ((span - 24) / 25), 299 + row * 13]);
      var seed = Math.sin(k * 12.9898) * 43758.5453; seed = seed - Math.floor(seed);
      top.push([left + 8 + seed * (span - 30), 18 + ((k * 7) % 5) * 9]);
    }
    CAUGHT_AT.forEach(function (c, j) {
      var sameLayerIndex = CAUGHT_AT.filter(function (x, i) { return x.layer === c.layer && i < j; }).length;
      caught.push([left + span * (0.3 + 0.22 * sameLayerIndex + 0.12 * c.layer), 78 + c.layer * 62 - 21]);
    });
    return { pass: pass, top: top, caught: caught };
  }

  function placePearls(animate) {
    var vis = $("#sieve-vis"); if (!vis) return;
    var T = pearlTargets(vis);
    var pearls = vis.querySelectorAll(".pearl:not(.caught)"), caught = vis.querySelectorAll(".pearl.caught");
    var all = [];
    pearls.forEach(function (p, k) { all.push([p, T.top[k], T.pass[k], k * 22]); });
    caught.forEach(function (p, j) { all.push([p, T.top[j * 11], T.caught[j], 300 + j * 140]); });
    if (!animate || reduceMotion()) {
      all.forEach(function (a) { a[0].style.transition = "none"; a[0].style.transform = "translate(" + a[2][0] + "px," + a[2][1] + "px)"; });
      return Promise.resolve();
    }
    all.forEach(function (a) { a[0].style.transition = "none"; a[0].style.transform = "translate(" + a[1][0] + "px," + a[1][1] + "px)"; });
    void vis.offsetWidth;
    all.forEach(function (a) { a[0].style.transition = ""; a[0].style.transitionDelay = a[3] + "ms"; a[0].style.transform = "translate(" + a[2][0] + "px," + a[2][1] + "px)"; });
    return wait(2600);
  }
  function reduceMotion() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

  function renderSieve(revealCount) {
    var ch = checks();
    var caught = ch.filter(function (x) { return x.v === "caught"; }).length;
    var html = "<div class=\"panel-head\"><div><span class=\"eyebrow\" style=\"margin:0 0 8px\">Step 4 · The Sieve</span><h2>Checked before the verifier sees it</h2></div><p>Fifty figures pass through four checks. Anything a check catches stops at that layer and goes to a person. Select a caught pearl to see why.</p></div>";
    html += sieveVisHtml();
    html += "<div class=\"summary-strip\" id=\"sieve-summary\"></div><div class=\"checks\" id=\"checks\"></div>";
    $("#panel").innerHTML = html;
    updateChecks(typeof revealCount === "number" ? revealCount : ch.length);
    placePearls(false);
    $("#pour-btn").addEventListener("click", function () { if (!state.running) placePearls(true); });
  }

  function updateChecks(shown) {
    var ch = checks();
    var caught = ch.filter(function (x) { return x.v === "caught"; }).length;
    $("#sieve-summary").innerHTML = "<span><b>50</b> figures checked</span><span class=\"pill ok\">46 pass</span><span class=\"pill bad\">" + caught + " caught</span>" + (state.decision === null ? "<span class=\"pill warn\">1 needs your decision</span>" : "<span class=\"pill ok\">all resolved</span>");
    var html = "";
    ch.forEach(function (x, i) {
      var pending = i >= shown;
      html += "<article class=\"check " + (pending ? "pending" : x.v === "pass" ? "pass" : "caught") + "\" id=\"check-" + i + "\"><span class=\"layer\">" + x.layer + "</span><div class=\"body\"><h4>" + esc(x.title) + "</h4><p>" + esc(x.body) + "</p></div><span class=\"verdict-cell\">" +
        (pending ? "<span class=\"pill none\">queued</span>" : x.v === "pass" ? "<span class=\"verdict pass\">Passes</span>" : "<span class=\"verdict fail\">Caught</span>") + "</span>";
      if (!pending && (x.docs || x.decision)) {
        html += "<div class=\"actions\">";
        (x.docs || []).forEach(function (d) { html += "<button type=\"button\" class=\"chip-btn\" data-doc=\"" + d + "\">Open " + d + "</button>"; });
        if (x.decision) {
          html += "<button type=\"button\" class=\"chip-btn\" data-decide=\"corrected\" aria-pressed=\"" + (state.decision === "corrected") + "\">Use corrected 23,600 RTh</button>" +
            "<button type=\"button\" class=\"chip-btn\" data-decide=\"invoiced\" aria-pressed=\"" + (state.decision === "invoiced") + "\">Keep invoiced 236,000 RTh</button>";
        }
        if (x.resolved) html += "<span class=\"small muted\" style=\"align-self:center\">✓ " + esc(x.resolved) + "</span>";
        else if (x.decision) html += "<span class=\"small\" style=\"align-self:center;color:var(--warn)\">Waiting for a reviewer. July is excluded from the total until then.</span>";
        html += "</div>";
      }
      html += "</article>";
    });
    $("#checks").innerHTML = html;
  }

  function renderDeliverables() {
    var c = calc();
    var ch = checks().filter(function (x) { return x.v === "caught"; });
    var idx = c.lines.slice(0, 7).map(function (l) {
      return "<tr><td>" + l.id + "</td><td class=\"num\">" + fmt(l.t, 1) + "</td><td>" + l.docs.slice(0, 3).join(", ") + (l.docs.length > 3 ? " +" + (l.docs.length - 3) : "") + "</td><td>" + l.f.clause + "</td></tr>";
    }).join("");
    var decisionAr = state.decision === null ? "ولا تزال قيمة فاتورة يوليو بانتظار قرار المراجع" : state.decision === "corrected" ? "واعتمد المراجع القيمة المصححة لفاتورة يوليو" : "وأبقى المراجع على القيمة الواردة في فاتورة يوليو";
    var html = "<div class=\"panel-head\"><div><span class=\"eyebrow\" style=\"margin:0 0 8px\">Step 5 · Deliverables</span><h2>What you'd receive, every cycle</h2></div><p>Everything is stored in your repository, ready for your verifier, your board and next year's run.</p></div><div class=\"deliverables\">";
    html += "<section class=\"deliverable\"><h3>Evidence index</h3><p>Each reported figure is mapped to its source documents and the methodology clause that applied. Verifiers sample from it directly.</p><div class=\"data-table-wrap\"><table class=\"data\" style=\"min-width:420px\"><thead><tr><th>Figure</th><th class=\"num\">tCO₂e</th><th>Sources</th><th>Clause</th></tr></thead><tbody>" + idx + "</tbody></table></div></section>";
    html += "<section class=\"deliverable\"><h3>Review queue</h3><p>Everything the Sieve caught, with its owner and status.</p><div class=\"data-table-wrap\"><table class=\"data\" style=\"min-width:420px\"><thead><tr><th>Item</th><th>Owner</th><th>Status</th></tr></thead><tbody>" +
      ch.map(function (x) { return "<tr><td>" + esc(x.title) + "</td><td>" + (x.decision ? "Sustainability lead" : x.layer === "Consistency" && /missing/i.test(x.title) ? "Facilities" : "Automatic") + "</td><td>" + (x.resolved ? "<span class=\"pill ok\">Resolved</span>" : "<span class=\"pill warn\">Open</span>") + "</td></tr>"; }).join("") +
      "</tbody></table></div></section>";
    html += "<section class=\"deliverable\"><h3>Methodology you own</h3><p>These are plain files in your repository. The calculations read them, and your verifier can read them too.</p><pre class=\"codeblock\"># methodology/boundary.md  (v4)\n1.1 Approach: operational control\n1.2 Sites: HQ (Dubai) · Warehouse (Jebel Ali FZ) · Fleet\n1.3 Period: 1 Jan – 31 Dec 2025, by service date\n1.4 Duplicates: same invoice no. → count once\n\n# methodology/estimation.md\n3.2 Missing district-cooling months:\n    HQ electricity × median cooling/electricity\n    ratio of verified months. Label as estimate.\n\n# methodology/factors.md  (v4, illustrative)\n2.1 Grid electricity   0.40 kgCO₂e/kWh\n2.2 District cooling   0.38 kgCO₂e/RTh</pre></section>";
    html += "<section class=\"deliverable\"><h3>Executive summary, in Arabic and English</h3><p>Board and regulator summaries are drafted in both languages from the same figures.</p><p class=\"ar-summary\" lang=\"ar\">بلغ إجمالي انبعاثات شركة رأس الصفا للخدمات اللوجستية (شركة افتراضية) من النطاقين الأول والثاني لعام 2025 نحو " + fmt(c.total, 1) + " طن من مكافئ ثاني أكسيد الكربون، منها " + fmt(c.s1, 1) + " طن من النطاق الأول و" + fmt(c.s2, 1) + " طن من النطاق الثاني. تتبّع «الغربال» كل رقم إلى مستنده المصدر ورصد أربع ملاحظات عولجت ثلاث منها وفق المنهجية، " + decisionAr + ".</p></section>";
    html += "</div>";
    $("#panel").innerHTML = html;
  }

  var RENDER = { 1: renderEvidence, 2: renderExtract, 3: renderCalculate, 4: renderSieve, 5: renderDeliverables };

  function go(step, opts) {
    state.step = step;
    root.querySelectorAll(".stepper button").forEach(function (b) {
      b.setAttribute("aria-selected", String(Number(b.dataset.step) === step));
    });
    if (!opts || !opts.noRender) RENDER[step]();
  }

  /* ---------------- Viewer (documents and traces) ---------------- */
  var backdrop = document.getElementById("viewer-backdrop");
  var viewer = document.getElementById("viewer");
  var lastFocus = null;
  function openViewer(title, html) {
    lastFocus = document.activeElement;
    viewer.querySelector("h3").textContent = title;
    viewer.querySelector(".viewer-body").innerHTML = html;
    backdrop.hidden = false; viewer.hidden = false;
    viewer.querySelector(".viewer-close").focus();
  }
  function closeViewer() {
    backdrop.hidden = true; viewer.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  backdrop.addEventListener("click", closeViewer);
  viewer.querySelector(".viewer-close").addEventListener("click", closeViewer);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !viewer.hidden) closeViewer(); });

  function billHtml(d) {
    var note = "";
    if (d.dup) note = "<p class=\"small\" style=\"color:var(--bad);margin:0\">Caught: same invoice number as WE-08, so it's counted once.</p>";
    if (d.out) note = "<p class=\"small\" style=\"color:var(--bad);margin:0\">Caught: dated outside FY2025, so it's excluded under boundary.md §1.3.</p>";
    if (d.odd) note = "<p class=\"small\" style=\"color:var(--bad);margin:0\">Caught: about 10× the expected value. The provider confirmed a misplaced decimal (23,600 RTh).</p>";
    if (d.group === "he") {
      return "<div class=\"bill\" dir=\"rtl\" lang=\"ar\"><div class=\"bill-top\"><strong>فاتورة كهرباء ومياه</strong><span class=\"stamp\">مزوّد الخدمة (للتوضيح)</span></div>" +
        "<div class=\"bill-meta\"><span>رقم الحساب</span><span dir=\"ltr\">2007 4419 81</span><span>رقم الفاتورة</span><span dir=\"ltr\">" + d.inv + "</span><span>فترة الفاتورة</span><span>" + MONTHS_AR[d.month] + " 2025</span><span>العميل</span><span>رأس الصفا للخدمات اللوجستية — المقر الرئيسي</span></div>" +
        "<table><tr class=\"hl\"><td>استهلاك الكهرباء (كيلوواط ساعة)</td><td dir=\"ltr\">" + fmt(d.qty) + "</td></tr><tr><td>استهلاك المياه (غالون)</td><td dir=\"ltr\">" + fmt(Math.round(d.qty * 3.1)) + "</td></tr><tr><td>رسوم الوقود</td><td dir=\"ltr\">AED " + fmt(Math.round(d.qty * 0.065)) + "</td></tr><tr><td>المبلغ المستحق</td><td dir=\"ltr\">AED " + fmt(Math.round(d.qty * 0.44)) + "</td></tr></table>" +
        "<span class=\"stamp\" dir=\"ltr\">Extracted: " + fmt(d.qty) + " kWh · line 1 · read in Arabic</span></div>";
    }
    if (d.group === "we" || d.group === "hc") {
      var isDc = d.group === "hc";
      return note + "<div class=\"bill\"><div class=\"bill-top\"><strong>" + (isDc ? "District Cooling Invoice" : "Electricity Bill") + "</strong><span class=\"stamp\">" + (isDc ? "Cooling provider" : "Utility provider") + " (illustrative)</span></div>" +
        "<div class=\"bill-meta\"><span>Invoice no.</span><span>" + d.inv + "</span><span>Period</span><span>" + MONTHS[d.month] + " 2025</span><span>Customer</span><span>Ras Saffa Logistics · " + (isDc ? "HQ, Dubai" : "Warehouse, Jebel Ali FZ") + "</span></div>" +
        "<table>" + (isDc
          ? "<tr class=\"hl\"><td>Consumption (ton-hours, RTh)</td><td>" + fmt(d.qty) + "</td></tr><tr><td>Capacity charge</td><td>AED 18,240</td></tr><tr><td>Consumption charge</td><td>AED " + fmt(Math.round(d.qty * 0.58)) + "</td></tr>"
          : "<tr class=\"hl\"><td>Electricity consumption (kWh)</td><td>" + fmt(d.qty) + "</td></tr><tr><td>Fuel surcharge</td><td>AED " + fmt(Math.round(d.qty * 0.065)) + "</td></tr><tr><td>Total due</td><td>AED " + fmt(Math.round(d.qty * 0.41)) + "</td></tr>") +
        "</table><span class=\"stamp\">Extracted: " + fmt(d.qty) + " " + d.unit + " · line 1</span></div>";
    }
    if (d.group === "fc") {
      var f = FUEL[d.q];
      return "<div class=\"bill\"><div class=\"bill-top\"><strong>Fuel card statement — " + f.q + " 2025</strong><span class=\"stamp\">Fuel card provider (illustrative)</span></div>" +
        "<table><tr><td>Fleet</td><td>Litres</td></tr><tr class=\"hl\"><td>Trucks (12) · diesel</td><td>" + fmt(f.d) + "</td></tr><tr class=\"hl\"><td>Vans (2) · petrol</td><td>" + fmt(f.p) + "</td></tr><tr><td>Transactions</td><td>" + fmt(Math.round(f.d / 180)) + "</td></tr></table>" +
        "<span class=\"stamp\">Extracted: totals by fuel type · CSV export</span></div>";
    }
    if (d.group === "gd") {
      return note + "<div class=\"bill\" dir=\"rtl\" lang=\"ar\"><div class=\"bill-top\"><strong>مذكرة تسليم وقود</strong><span class=\"stamp\">مورّد الديزل (للتوضيح)</span></div>" +
        "<div class=\"bill-meta\"><span>رقم المذكرة</span><span dir=\"ltr\">" + d.id + "</span><span>التاريخ</span><span dir=\"ltr\">" + d.date + "</span><span>الموقع</span><span>المستودع — المنطقة الحرة لجبل علي</span></div>" +
        "<table><tr class=\"hl\"><td>ديزل للمولد الاحتياطي (لتر)</td><td dir=\"ltr\">" + fmt(d.qty) + "</td></tr><tr><td>توقيع المستلم</td><td>مدير المستودع</td></tr></table>" +
        "<span class=\"stamp\" dir=\"ltr\">Extracted: " + fmt(d.qty) + " L · " + d.date + " · read in Arabic</span></div>";
    }
    if (d.group === "rf") {
      return "<div class=\"bill\" dir=\"rtl\" lang=\"ar\"><div class=\"bill-top\"><strong>سجل صيانة وحدات التبريد</strong><span class=\"stamp\">فريق الصيانة</span></div>" +
        "<table><tr><td>التاريخ</td><td>البند</td></tr>" + REF.map(function (r) { return "<tr class=\"hl\"><td dir=\"ltr\">" + r.date + "</td><td>إعادة تعبئة غاز R-410A: " + r.kg + " كغ</td></tr>"; }).join("") + "<tr><td dir=\"ltr\">2025-03-02</td><td>تنظيف المرشحات — لا يوجد تعبئة</td></tr></table>" +
        "<span class=\"stamp\" dir=\"ltr\">Extracted: 12.5 kg R-410A · 2 entries · read in Arabic</span></div>";
    }
    return "";
  }

  function openDoc(id) { var d = docById(id); if (d) openViewer(d.id, billHtml(d)); }

  function openLine(id) {
    var c = calc();
    var l = c.lines.filter(function (x) { return x.id === id; })[0];
    if (!l) return;
    var html = "<div class=\"trace-path\">" +
      "<div><span class=\"k\">Figure</span><span><b>" + fmt(l.t, 1) + " tCO₂e</b> · " + l.label + " · Scope " + l.scope + "</span></div>" +
      "<div><span class=\"k\">Calculation</span><span><code>" + fmt(l.qty, l.unit === "kg" ? 1 : 0) + " " + l.unit + " × " + l.f.v + " " + l.f.unit + " ÷ 1,000</code></span></div>" +
      "<div><span class=\"k\">Factor</span><span>" + l.f.label + " · <code>" + l.f.clause + "</code> (illustrative)</span></div>" +
      "<div><span class=\"k\">Code</span><span><code>inventory/fy2025/" + l.id.toLowerCase() + ".py</code> · rerunnable</span></div>" +
      (l.note ? "<div><span class=\"k\">Notes</span><span>" + esc(l.note) + "</span></div>" : "") +
      "<div><span class=\"k\">Sources</span><span class=\"doc-links\">" + l.docs.map(function (d) { return "<button type=\"button\" class=\"chip-btn\" data-doc=\"" + d + "\">" + d + "</button>"; }).join("") + "</span></div></div>";
    if (id === "S2-HC") {
      html += "<div class=\"data-table-wrap\"><table class=\"data\" style=\"min-width:360px\"><thead><tr><th>Month</th><th class=\"num\">RTh</th><th>Basis</th></tr></thead><tbody>" +
        c.hcRows.map(function (r) {
          return "<tr class=\"" + (r.est ? "est" : r.pending ? "excluded" : "") + "\"><td>" + MONTHS[r.month] + "</td><td class=\"num\">" + fmt(r.qty) + "</td><td>" + (r.est ? "Estimate · §3.2 from " + r.docs[0] : r.pending ? "Excluded · awaiting reviewer" : r.corrected ? "Corrected · provider-confirmed" : "Invoice " + r.docs[0]) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    openViewer(l.label, html);
  }

  /* ---------------- Events ---------------- */
  root.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.step) { if (state.running) stopRun(); go(Number(t.dataset.step)); return; }
    if (t.dataset.doc) { openDoc(t.dataset.doc); return; }
    if (t.dataset.line) { openLine(t.dataset.line); return; }
    if (t.dataset.decide) { state.decision = t.dataset.decide; renderSummary(); if (state.step === 4) updateChecks(checks().length); else RENDER[state.step](); return; }
    if (t.dataset.catch) {
      var el = document.getElementById("check-" + t.dataset.catch);
      if (el) { el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" }); el.classList.add("flash"); setTimeout(function () { el.classList.remove("flash"); }, 1600); }
      return;
    }
  });
  viewer.addEventListener("click", function (e) {
    var t = e.target.closest("button[data-doc]");
    if (t) openDoc(t.dataset.doc);
  });

  /* ---------------- Scripted run ---------------- */
  var log = document.getElementById("run-log");
  function line(text, cls) {
    var p = document.createElement("div");
    if (cls) p.className = cls;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }
  function mark(step, cls) {
    var b = root.querySelector(".stepper button[data-step=\"" + step + "\"]");
    b.classList.remove("running", "done");
    if (cls) b.classList.add(cls);
  }
  function stopRun() { state.skip = true; }

  async function run() {
    if (state.running) return;
    state.running = true; state.skip = false; state.decision = null; state.readAll = false; state.flagsShown = false;
    var runBtn = document.getElementById("run-btn"), skipBtn = document.getElementById("skip-btn");
    runBtn.disabled = true; skipBtn.hidden = false;
    log.hidden = false; log.innerHTML = "";
    [1, 2, 3, 4, 5].forEach(function (s) { mark(s, null); });
    renderSummary();

    mark(1, "running"); go(1);
    line("› Build the FY2025 Scope 1 and 2 inventory from the evidence pack. Run the Sieve.", "warn");
    line("Reading methodology/boundary.md · estimation.md · factors.md (v4)", "dim");
    var btns = root.querySelectorAll(".doc");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.add("read", "pulse");
      if (i % 6 === 0) line("Reading " + btns[i].dataset.doc + (btns[i].dataset.lang === "ar" ? "  (Arabic)" : ""), "dim");
      await wait(70);
    }
    state.readAll = true;
    line("✓ 44 documents read · 18 in Arabic", "ok");
    mark(1, "done"); await wait(600);

    mark(2, "running"); go(2);
    line("Extracting quantities, periods and invoice numbers…", "dim");
    await wait(1400);
    line("! 3 documents flagged for the Sieve: WE-08b, GD-05, HC-07", "warn");
    state.flagsShown = true;
    mark(2, "done"); await wait(900);

    mark(3, "running"); go(3);
    line("Applying factors.md v4 · writing inventory/fy2025/", "dim");
    await wait(1400);
    line("✓ 7 lines calculated · committed to the repository", "ok");
    mark(3, "done"); await wait(900);

    mark(4, "running"); go(4, { noRender: true });
    renderSieve(0);
    line("Pouring 50 figures through trace, recompute, consistency and plausibility…", "dim");
    if (!state.skip) await placePearls(true);
    var n = checks().length;
    for (var k = 1; k <= n; k++) {
      updateChecks(k);
      var c = checks()[k - 1];
      line((c.v === "pass" ? "✓ Passes · " : "! Caught · ") + c.title, c.v === "pass" ? "ok" : "warn");
      await wait(420);
    }
    line("Sieve: 46 pass · 4 caught · 1 needs a reviewer", "warn");
    mark(4, "done"); await wait(700);

    mark(5, "done");
    line("✓ Evidence index, review queue and bilingual summary drafted", "ok");
    line("0 files left your tenancy", "dim");
    go(4);
    state.running = false; state.skip = false;
    runBtn.disabled = false; runBtn.textContent = "Replay the run"; skipBtn.hidden = true;
    var focusTarget = root.querySelector("[data-decide]");
    if (focusTarget) focusTarget.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }

  document.getElementById("run-btn").addEventListener("click", run);
  document.getElementById("skip-btn").addEventListener("click", stopRun);

  var rz = null;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (state.step === 4 && !state.running) placePearls(false); }, 150); });

  /* ---------------- Initial state: complete at rest ---------------- */
  state.readAll = true; state.flagsShown = true;
  [1, 2, 3, 4, 5].forEach(function (s) { mark(s, "done"); });
  renderSummary();
  go(3);
})();
