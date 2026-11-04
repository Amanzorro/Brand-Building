/* Nokhada — Climate Obligations Checker (interactive).
   One question at a time, visual answers, and a live obligations map that
   updates as you go. Runs entirely in the browser; nothing leaves the page.
   Rules mirror the "UAE climate rules" page (last reviewed November 2026). */
(function () {
  "use strict";
  var card = document.getElementById("qcard");
  if (!card) return;

  /* ---------------- Icons ---------------- */
  var I = function (d) { return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">" + d + "</svg>"; };
  var ICON = {
    factory: I("<path d=\"M3 21V10l5 3V10l5 3V7l8 4v10z\"/><path d=\"M7 17h2M12 17h2M17 17h2\"/>"),
    bolt: I("<path d=\"M13 2 4 14h7l-1 8 9-12h-7z\"/>"),
    truck: I("<path d=\"M2 7h11v9H2zM13 10h4l4 3v3h-8\"/><circle cx=\"6\" cy=\"17.5\" r=\"1.8\"/><circle cx=\"17\" cy=\"17.5\" r=\"1.8\"/>"),
    tower: I("<path d=\"M6 21V5l6-3v19M12 9h6v12M3 21h18M9 7v.01M9 11v.01M9 15v.01M15 13v.01M15 17v.01\"/>"),
    bank: I("<path d=\"M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18\"/>"),
    gov: I("<path d=\"M12 3v3M8 6h8l2 4H6zM5 10h14v10H5zM9 14h6v6H9z\"/>"),
    case: I("<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M9 7V5h6v2M3 12h18\"/>"),
    ingot: I("<path d=\"M4 16 7 9h10l3 7zM7 9l2-3h6l2 3\"/>"),
    beam: I("<path d=\"M4 5h16M4 19h16M12 5v14M8 5v2M16 5v2M8 19v-2M16 19v-2\"/>"),
    bag: I("<path d=\"M6 7h12l1 13H5zM8 7V5h8v2M9 12h6\"/>"),
    grains: I("<circle cx=\"8\" cy=\"9\" r=\"2\"/><circle cx=\"15\" cy=\"7\" r=\"2\"/><circle cx=\"12\" cy=\"14\" r=\"2\"/><circle cx=\"7\" cy=\"17\" r=\"2\"/><circle cx=\"17\" cy=\"16\" r=\"2\"/>"),
    h2: I("<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M8.5 9v6M11.5 9v6M8.5 12h3M14 13.5c0-1 2.5-1 2.5 0 0 .8-2.5 1.5-2.5 2.5h2.5\"/>"),
    none: I("<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m6.5 6.5 11 11\"/>"),
    q: I("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.5M12 17v.01\"/>"),
    shield: I("<path d=\"M12 3 5 6v6c0 4.3 3 7.7 7 9 4-1.3 7-4.7 7-9V6z\"/><path d=\"m9 12 2 2 4-4\"/>"),
    xmark: I("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m9 9 6 6M15 9l-6 6\"/>"),
    inbox: I("<path d=\"M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6z\"/>"),
    calm: I("<path d=\"M4 12h16M7 8h10M9 16h6\"/>"),
    key: I("<path d=\"M4 21V10l8-6 8 6v11H4z\"/><circle cx=\"12\" cy=\"13\" r=\"2\"/><path d=\"M12 15v3\"/>"),
    coins: I("<ellipse cx=\"9\" cy=\"7\" rx=\"5\" ry=\"2.5\"/><path d=\"M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7M10 15.5c.6 1.2 2.6 2 5 2 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5\"/>"),
    both: I("<path d=\"M3 21V12l5-4 5 4v9zM13 21h8v-7l-4-3\"/>")
  };

  /* ---------------- Questions ---------------- */
  var Q = [
    { id: "where", type: "map", short: "Where", title: "Where are you established?", hint: "Select all that apply." },
    { id: "sector", type: "single", short: "Sector", title: "What's your main sector?", hint: "", opts: [
      ["industry", "Industry & manufacturing", "", "factory"],
      ["energy", "Energy & utilities", "", "bolt"],
      ["logistics", "Logistics & transport", "", "truck"],
      ["realestate", "Real estate & construction", "", "tower"],
      ["finance", "Banking, insurance & investment", "", "bank"],
      ["gov", "Government & GRE", "", "gov"],
      ["services", "Services & other", "", "case"] ] },
    { id: "size", type: "slider", short: "Size", title: "Roughly how much do you emit each year?", hint: "Scope 1 and 2. A guess is fine." },
    { id: "cbam", type: "multi", short: "EU exports", title: "Do you export any of these to the EU?", hint: "Goods covered by the EU CBAM.", opts: [
      ["alu", "Aluminium", "", "ingot"], ["steel", "Iron & steel", "", "beam"], ["cement", "Cement", "", "bag"],
      ["fert", "Fertilisers", "", "grains"], ["h2", "Hydrogen", "", "h2"], ["elec", "Electricity", "", "bolt"],
      ["none", "None of these", "", "none"], ["unsure", "Not sure", "", "q"] ] },
    { id: "licensed", type: "single", big: true, short: "Licence", title: "Are you licensed by a UAE financial regulator?", hint: "CBUAE, CMA, DFSA or FSRA.", opts: [
      ["yes", "Yes", "", "shield"], ["no", "No", "", "xmark"] ] },
    { id: "asks", type: "single", big: true, short: "Requests", title: "Do customers or lenders ask for your emissions data?", hint: "", opts: [
      ["yes", "Yes", "", "inbox"], ["no", "Not yet", "", "calm"] ] },
    { id: "assets", type: "single", short: "Assets", title: "Do you own or finance buildings or infrastructure?", hint: "", opts: [
      ["own", "We own or operate them", "", "key"], ["finance", "We lend to or invest in them", "", "coins"],
      ["both", "Both", "", "both"], ["no", "Neither", "", "none"] ] },
    { id: "data", type: "ladder", short: "Data", title: "Where is your emissions data today?", hint: "", opts: [
      ["none", "Nothing collected yet", 18], ["sheets", "Spreadsheets", 40], ["software", "Carbon software", 62], ["verified", "A verified inventory", 86] ] }
  ];

  var EXAMPLE = { where: ["dxb-main", "fz"], sector: "logistics", size: "10to100", sizeT: 42000, cbam: ["none"], licensed: "no", asks: "yes", assets: "own", data: "sheets" };
  var A = { where: [], sector: "", size: "", sizeT: 40000, cbam: [], licensed: "", asks: "", assets: "", data: "" };
  var cur = 0, finished = false;

  /* ---------------- Rules ---------------- */
  /* Official sources, one per rule. Same links as climate-rules.html.
     null = not yet confirmed: shown as "[source to confirm]" until someone has opened
     the official page and checked it. "asks" is commercial, so it has no legal source. */
  var SOURCES = { law: null, nrcc: null, ad: null, cbam: null, fin: null, phys: null, build: null };

  var STATUS_LABEL = { applies: "Applies", likely: "Likely", check: "Check", none: "Not indicated" };
  var CBAM_GOODS = { alu: "aluminium", steel: "iron and steel", cement: "cement", fert: "fertilisers", h2: "hydrogen", elec: "electricity" };

  function evaluate(a) {
    var has = function (arr, v) { return arr.indexOf(v) !== -1; };
    var inAbuDhabi = has(a.where, "ad-main") || has(a.where, "adgm");
    var inDubai = has(a.where, "dxb-main") || has(a.where, "difc");
    var isFinance = a.sector === "finance" || a.licensed === "yes";
    var obs = [];

    obs.push({ id: "law", short: "Climate Law", status: "applies", title: "UAE Climate Law: measure, report and reduce",
      body: "Report emissions, keep records and reduce them.",
      why: "Applies to all entities, including free zones.",
      data: ["Electricity, water and district-cooling bills for every site", "Fuel records for vehicles, generators and equipment", "Refrigerant purchase and top-up logs", "A list of every site and entity, with who controls each"],
      src: "Federal Decree-Law No. 11 of 2024 · in force 30 May 2025" });

    var n = { id: "nrcc", short: "NRCC", title: "National Register for Carbon Credits (NRCC)", src: "Cabinet Resolution No. 67 of 2024 · run by MOCCAE", data: ["Annual emissions estimate by scope", "Evidence index for a verifier"] };
    if (a.size === "gte500") { n.status = "applies"; n.body = "Registration and verified reporting expected."; n.why = "You estimate 500,000 tCO₂e or more a year."; }
    else if (!a.size || a.size === "unknown") { n.status = "likely"; n.body = "Depends on your annual emissions. Start with an estimate."; n.why = a.size === "unknown" ? "You don't know your emissions yet." : "Your emissions size isn't answered yet."; n.data = ["Twelve months of energy and fuel records for a screening estimate"]; }
    else { n.status = "check"; n.body = "Registration may be voluntary at your size. Confirm with MOCCAE."; n.why = "You estimate under 500,000 tCO₂e a year."; }
    obs.push(n);

    obs.push(inAbuDhabi ? { id: "ad", short: "Abu Dhabi", status: "check", title: "Abu Dhabi emissions reporting system", body: "Abu Dhabi has its own reporting system and thresholds.", why: "You operate in Abu Dhabi or ADGM.", data: ["Site-level data for Abu Dhabi operations, kept separately"], src: "Abu Dhabi emirate-level requirements" }
      : { id: "ad", short: "Abu Dhabi", status: "none", title: "Abu Dhabi emissions reporting system", why: "You haven't selected Abu Dhabi or ADGM." });

    var goods = a.cbam.filter(function (g) { return CBAM_GOODS[g]; }).map(function (g) { return CBAM_GOODS[g]; });
    if (goods.length) obs.push({ id: "cbam", short: "CBAM", status: "applies", title: "EU CBAM: embedded emissions for your exports", body: "EU importers of " + goods.join(", ") + " now pay for embedded emissions and will ask you for data.", why: "You export CBAM-covered goods to the EU.", data: ["Production volumes by installation and product", "Direct fuel and process emissions by installation", "Electricity consumption and source for each installation", "Precursor materials and their suppliers"], src: "EU CBAM · definitive period from 1 January 2026" });
    else if (has(a.cbam, "unsure")) obs.push({ id: "cbam", short: "CBAM", status: "check", title: "EU CBAM: embedded emissions for your exports", body: "Check your products against the covered goods.", why: "You're not sure.", data: ["A list of EU-bound products with their customs codes"], src: "EU CBAM · definitive period from 1 January 2026" });
    else obs.push({ id: "cbam", short: "CBAM", status: "none", title: "EU CBAM: embedded emissions for your exports", why: a.cbam.length ? "You don't export CBAM-covered goods to the EU." : "Not answered yet." });

    if (isFinance) obs.push({ id: "fin", short: "Finance rules", status: a.licensed === "yes" ? "applies" : "likely", title: "Financial-sector climate principles", body: "Board oversight, risk management, disclosure and a transition plan.", why: a.licensed === "yes" ? "You're licensed by the CBUAE, CMA, DFSA or FSRA." : "You work in financial services. Check whether your licence brings you in scope.", data: ["Loan and investment book with sector codes", "Collateral and asset locations", "Counterparty emissions and transition plans where disclosed", "Current risk appetite and governance documents"], src: "UAE Sustainable Finance Working Group principles: Nov 2023, Jun 2024, Feb 2026" });
    else obs.push({ id: "fin", short: "Finance rules", status: "none", title: "Financial-sector climate principles", why: "You're not a regulated financial firm." });

    obs.push(a.asks === "yes" ? { id: "asks", short: "Customers", status: "applies", title: "Customer, lender and investor requests", body: "Not a legal duty. Use the figures you report.", why: "You already get requests.", data: ["Copies of recent questionnaires and the answers you gave", "Scope 3 data from your main suppliers"], src: "Commercial requirement" }
      : { id: "asks", short: "Customers", status: "none", title: "Customer, lender and investor requests", why: a.asks === "no" ? "No requests yet." : "Not answered yet." });

    var fin = a.assets === "finance" || a.assets === "both", own = a.assets === "own" || a.assets === "both";
    if (a.licensed === "yes" && fin) obs.push({ id: "phys", short: "Physical risk", status: "applies", title: "Physical climate risk on assets", body: "Assess and report physical risk on financed assets.", why: "You're regulated and you finance real assets.", data: ["Addresses or coordinates for collateral and investee assets", "Asset type, age and value"], src: "Climate-related financial risk principles · Nov 2023" });
    else if (own || fin) obs.push({ id: "phys", short: "Physical risk", status: "likely", title: "Physical climate risk on assets", body: "No legal duty, but lenders and insurers ask.", why: "You own or finance real assets.", data: ["Asset register with locations", "Cooling, energy and water data per asset", "Drainage and flood history where known"], src: "Lender and insurer requirements" });
    else obs.push({ id: "phys", short: "Physical risk", status: "none", title: "Physical climate risk on assets", why: a.assets ? "You don't own or finance real assets." : "Not answered yet." });

    if (a.sector === "realestate" || own) {
      var s = []; if (inAbuDhabi) s.push("Estidama (Abu Dhabi)"); if (inDubai) s.push("Al Sa'fat (Dubai)");
      obs.push({ id: "build", short: "Buildings", status: "check", title: "Green-building regulations and ratings", body: "New buildings may need to meet local green-building rules" + (s.length ? " such as " + s.join(" and ") : "") + ".", why: "You develop, own or operate buildings.", data: ["Design and as-built documentation", "Energy and water modelling or metering"], src: "Emirate-level building regulations" });
    } else obs.push({ id: "build", short: "Buildings", status: "none", title: "Green-building regulations and ratings", why: "You don't develop or operate buildings." });
    return obs;
  }

  var READINESS = {
    none: { level: 1, text: "Find which records exist and who holds them." },
    sheets: { level: 2, text: "Turn spreadsheets into a rerunnable inventory." },
    software: { level: 3, text: "We check your outputs and document your method." },
    verified: { level: 4, text: "Focus on faster cycles and new obligations." }
  };
  function plan(a, obs) {
    var on = function (id) { var o = obs.filter(function (x) { return x.id === id; })[0]; return o && o.status !== "none"; };
    var w1 = ["Obligations map for each entity and site", "Inventory of data sources and who owns them"];
    if (on("cbam")) w1.push("List of CBAM-covered products and installations");
    if (on("fin")) w1.push("Gap review against the financial-sector climate principles");
    if (on("phys")) w1.push("Asset list with locations, ready for screening");
    var w2 = [on("fin") ? "One portfolio slice run end to end, including the Sieve" : on("cbam") ? "One product line's embedded emissions run end to end" : "One site's inventory run end to end, including the Sieve"];
    if (a.data === "none") w2.push("Evidence request template for site managers");
    w2.push("Written plan with priorities, effort, timeline and a fixed-fee build proposal");
    return { w1: w1, w2: w2 };
  }

  /* ---------------- Helpers ---------------- */
  function sourceHtml(id) {
    if (!(id in SOURCES)) return "";
    var url = SOURCES[id];
    return url ? "<span class=\"src\">Source: <a href=\"" + esc(url) + "\">official text</a></span>" : "<span class=\"src\">Source: <span class=\"tbc\">[source to confirm]</span></span>";
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function answered(i) {
    var q = Q[i], v = A[q.id];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Map (stylised hex map of the emirates) ---------------- */
  var R = 30, W = Math.sqrt(3) * R, H = 1.5 * R;
  var CELLS = [
    ["rak", 0, 5], ["uaq", 1, 4], ["rak", 1, 5],
    ["ajm", 2, 4], ["shj", 2, 5], ["fuj", 2, 6],
    ["dxb", 3, 3], ["shj", 3, 4], ["fuj", 3, 5],
    ["ad", 4, 1], ["ad", 4, 2], ["dxb", 4, 3],
    ["ad", 5, 0], ["ad", 5, 1], ["ad", 5, 2],
    ["ad", 6, 0], ["ad", 6, 1], ["ad", 6, 2]
  ];
  var EM = { ad: ["Abu Dhabi", "ad-main"], dxb: ["Dubai", "dxb-main"], shj: ["Sharjah", "shj"], ajm: ["Ajman", "other"], uaq: ["Umm Al Quwain", "other"], rak: ["Ras Al Khaimah", "other"], fuj: ["Fujairah", "other"] };
  var SHORT = { ad: "Abu Dhabi", dxb: "Dubai", shj: "Sharjah", ajm: "Ajman", uaq: "UAQ", rak: "RAK", fuj: "Fujairah" };
  var emSel = {};
  function cx(r, c) { return 40 + c * W + (r % 2 ? W / 2 : 0); }
  function cy(r) { return 40 + r * H; }
  function hexPts(x, y) { var p = []; for (var i = 0; i < 6; i++) { var a = Math.PI / 180 * (60 * i - 30); p.push((x + (R - 1.5) * Math.cos(a)).toFixed(1) + "," + (y + (R - 1.5) * Math.sin(a)).toFixed(1)); } return p.join(" "); }
  function syncWhere() {
    var w = [];
    if (emSel.ad) w.push("ad-main"); if (emSel.dxb) w.push("dxb-main"); if (emSel.shj) w.push("shj");
    if (emSel.ajm || emSel.uaq || emSel.rak || emSel.fuj) w.push("other-em");
    ["difc", "adgm", "fz"].forEach(function (z) { if (emSel[z]) w.push(z); });
    A.where = w;
  }
  function loadWhere() {
    emSel = {};
    A.where.forEach(function (v) {
      if (v === "ad-main") emSel.ad = 1; else if (v === "dxb-main") emSel.dxb = 1; else if (v === "shj") emSel.shj = 1;
      else if (v === "other-em") emSel.ajm = 1; else emSel[v] = 1;
    });
  }
  function mapHtml() {
    var cells = CELLS.map(function (c) {
      var x = cx(c[1], c[2]), y = cy(c[1]);
      return { id: c[0], x: x, y: y, pts: hexPts(x, y) };
    });
    var groups = {};
    cells.forEach(function (c) { (groups[c.id] = groups[c.id] || []).push(c); });
    var svg = "<svg class=\"hexmap\" viewBox=\"0 0 410 352\" role=\"group\" aria-label=\"Map of the emirates\"><defs><linearGradient id=\"hexNacre\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#f4b9a6\"/><stop offset=\".5\" stop-color=\"#c8b6f2\"/><stop offset=\"1\" stop-color=\"#8fe0d2\"/></linearGradient></defs>";
    svg += "<text class=\"sea\" x=\"30\" y=\"90\" text-anchor=\"start\">ARABIAN GULF</text><text class=\"sea\" x=\"400\" y=\"330\" text-anchor=\"start\" transform=\"rotate(-90 400 330)\">GULF OF OMAN</text>";
    Object.keys(groups).forEach(function (id) {
      var g = groups[id], mx = 0, my = 0;
      g.forEach(function (c) { mx += c.x; my += c.y; });
      mx /= g.length; my /= g.length;
      svg += "<g class=\"cell\" role=\"button\" tabindex=\"0\" data-em=\"" + id + "\" aria-pressed=\"" + (!!emSel[id]) + "\" aria-label=\"" + EM[id][0] + "\">" +
        g.map(function (c) { return "<polygon points=\"" + c.pts + "\"/>"; }).join("") +
        "<text x=\"" + mx.toFixed(1) + "\" y=\"" + (my + 4).toFixed(1) + "\">" + SHORT[id] + "</text></g>";
    });
    // Financial free-zone pins
    var pins = [["difc", "DIFC", cx(3, 3) + 6, cy(3) - 16], ["adgm", "ADGM", cx(4, 2) + 10, cy(4) - 14]];
    pins.forEach(function (p) {
      svg += "<g class=\"pin\" role=\"button\" tabindex=\"0\" data-zone=\"" + p[0] + "\" aria-pressed=\"" + (!!emSel[p[0]]) + "\" aria-label=\"" + p[1] + " free zone\"><circle class=\"hit\" cx=\"" + (p[2] + 14) + "\" cy=\"" + (p[3] - 4) + "\" r=\"20\" fill=\"transparent\"/><circle class=\"o\" cx=\"" + p[2] + "\" cy=\"" + p[3] + "\" r=\"6\"/><text x=\"" + (p[2] + 10) + "\" y=\"" + (p[3] - 6) + "\">" + p[1] + "</text></g>";
    });
    svg += "</svg>";
    var zones = "<div class=\"zones\"><span class=\"zt\">Free zones</span>" +
      [["difc", "DIFC (Dubai)"], ["adgm", "ADGM (Abu Dhabi)"], ["fz", "Another free zone"]].map(function (z) {
        return "<button type=\"button\" class=\"toggle\" data-zone=\"" + z[0] + "\" aria-pressed=\"" + (!!emSel[z[0]]) + "\"><i></i>" + z[1] + "</button>";
      }).join("") + "<p class=\"selected-line\" id=\"where-line\"></p></div>";
    return "<div class=\"mapwrap\">" + svg + zones + "</div>";
  }
  function whereLine() {
    var names = [];
    Object.keys(EM).forEach(function (k) { if (emSel[k]) names.push(EM[k][0]); });
    if (emSel.difc) names.push("DIFC"); if (emSel.adgm) names.push("ADGM"); if (emSel.fz) names.push("another free zone");
    var el = document.getElementById("where-line");
    if (el) el.textContent = names.length ? "Selected: " + names.join(", ") : "Nothing selected yet.";
  }

  /* ---------------- Slider ---------------- */
  var LMIN = 3, LMAX = 6.7;
  function tToV(t) { return (Math.log10(t) - LMIN) / (LMAX - LMIN) * 100; }
  function vToT(v) { return Math.pow(10, LMIN + v / 100 * (LMAX - LMIN)); }
  function bucket(t) { return t < 1e4 ? "lt10" : t < 1e5 ? "10to100" : t < 5e5 ? "100to500" : "gte500"; }
  function nice(t) { var p = Math.pow(10, Math.floor(Math.log10(t)) - 1); return Math.round(t / p) * p; }
  function sliderHtml() {
    var unknown = A.size === "unknown";
    var t = A.sizeT;
    return "<div class=\"gauge" + (unknown ? " unknown" : "") + "\" id=\"gauge\"><div class=\"readout\"><span class=\"big\" id=\"t-read\">≈ " + nice(t).toLocaleString("en-US") + "</span><span class=\"unit\">tCO₂e a year</span></div>" +
      "<div class=\"band\"><div class=\"track\"></div><div class=\"thr\" style=\"left:" + tToV(5e5).toFixed(1) + "%\"><span>500k · large-emitter level</span></div>" +
      "<input type=\"range\" id=\"t-range\" min=\"0\" max=\"100\" step=\"0.5\" value=\"" + tToV(t).toFixed(1) + "\" aria-label=\"Annual emissions, tonnes CO2e\" aria-valuetext=\"about " + nice(t).toLocaleString("en-US") + " tonnes\"></div>" +
      "<div class=\"ticks\" style=\"position:relative;height:14px\">" + [[1e3, "1k"], [1e4, "10k"], [1e5, "100k"], [1e6, "1M"], [5e6, "5M"]].map(function (k) {
        return "<span style=\"position:absolute;left:" + tToV(k[0]).toFixed(1) + "%;transform:translateX(-50%)\">" + k[1] + "</span>"; }).join("") + "</div></div>" +
      "<div class=\"tiles\" style=\"margin-top:22px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))\"><button type=\"button\" class=\"tile\" data-unknown aria-pressed=\"" + unknown + "\" style=\"min-height:0\">" + ICON.q + "<span class=\"tl\">Don't know yet</span></button></div>";
  }

  /* ---------------- Card rendering ---------------- */
  function tilesHtml(q) {
    var multi = q.type === "multi";
    var cls = q.big ? "tiles big" : "tiles";
    return "<div class=\"" + cls + "\" role=\"group\" aria-label=\"" + esc(q.title) + "\">" + q.opts.map(function (o, i) {
      var on = multi ? A[q.id].indexOf(o[0]) !== -1 : A[q.id] === o[0];
      return "<button type=\"button\" class=\"tile\" data-val=\"" + o[0] + "\" aria-pressed=\"" + on + "\"><span class=\"k\">" + (i + 1) + "</span>" + ICON[o[3]] +
        "<span class=\"tl\">" + esc(o[1]) + "</span>" + (o[2] ? "<span class=\"ts\">" + esc(o[2]) + "</span>" : "") +
        (q.id === "licensed" && o[0] === "yes" ? "<span class=\"regs\"><span>CBUAE</span><span>CMA</span><span>DFSA</span><span>FSRA</span></span>" : "") + "</button>";
    }).join("") + "</div>";
  }
  function ladderHtml(q) {
    return "<div class=\"tiles ladder\" role=\"group\" aria-label=\"" + esc(q.title) + "\">" + q.opts.map(function (o, i) {
      return "<button type=\"button\" class=\"tile\" data-val=\"" + o[0] + "\" aria-pressed=\"" + (A.data === o[0]) + "\"><div class=\"bar\" style=\"--h:" + (o[2] * 1.6) + "px\"></div><span class=\"k\" style=\"top:auto;bottom:12px\">" + (i + 1) + "</span><span class=\"tl\">" + esc(o[1]) + "</span></button>";
    }).join("") + "</div>";
  }

  function renderNecklace() {
    var n = document.getElementById("necklace");
    n.innerHTML = Q.map(function (q, i) {
      var cls = (answered(i) ? "done" : "") + (i === cur && !finished ? " current" : "");
      return (i ? "<span class=\"thread\"></span>" : "") + "<button type=\"button\" class=\"" + cls + "\" data-go=\"" + i + "\" aria-label=\"Question " + (i + 1) + ": " + q.short + (answered(i) ? ", answered" : "") + "\"><span>" + q.short + "</span></button>";
    }).join("");
  }

  function renderCard() {
    renderNecklace();
    if (finished) return renderDone();
    var q = Q[cur];
    var body = q.type === "map" ? mapHtml() : q.type === "slider" ? sliderHtml() : q.type === "ladder" ? ladderHtml(q) : tilesHtml(q);
    var last = cur === Q.length - 1;
    card.innerHTML = "<div class=\"q-enter\" style=\"display:flex;flex-direction:column;flex:1\"><span class=\"qnum\">Question " + (cur + 1) + " of " + Q.length + "</span><h2>" + esc(q.title) + "</h2><p class=\"hint\">" + esc(q.hint) + "</p>" +
      "<div class=\"qbody\">" + body + "</div>" +
      "<div class=\"qnav\"><div style=\"display:flex;gap:10px;align-items:center;flex-wrap:wrap\">" +
      (cur > 0 ? "<button type=\"button\" class=\"btn btn-outline-light\" data-back>Back</button>" : "<button type=\"button\" class=\"linkish\" style=\"color:var(--nacre-aqua)\" data-example>Skip ahead with an example</button>") +
      "<span class=\"keys\">" + (q.opts ? "<kbd>1</kbd>–<kbd>" + q.opts.length + "</kbd> choose · " : "") + "<kbd>Enter</kbd> next</span></div>" +
      "<button type=\"button\" class=\"btn btn-nacre\" data-next " + (answered(cur) ? "" : "disabled") + ">" + (last ? "See my obligations map" : "Next") + " <span class=\"arrow\" aria-hidden=\"true\">→</span></button></div></div>";
    if (q.type === "map") whereLine();
    if (q.type === "slider") { if (!A.size) { A.size = bucket(A.sizeT); setTimeout(refresh, 0); } bindSlider(); }
  }

  function renderDone() {
    var obs = evaluate(A);
    var c = { applies: 0, likely: 0, check: 0, none: 0 };
    obs.forEach(function (o) { c[o.status]++; });
    card.innerHTML = "<div class=\"q-enter\" style=\"display:flex;flex-direction:column;flex:1;justify-content:center\"><span class=\"qnum\">Your map is ready</span>" +
      "<h2>" + (c.applies + c.likely) + " obligations apply or are likely, and " + c.check + " need checking.</h2>" +
      "<p class=\"hint\">Details are below.</p>" +
      "<div style=\"display:flex;gap:8px;flex-wrap:wrap;margin-bottom:26px\">" + ["applies", "likely", "check", "none"].map(function (s) { return "<span class=\"pill " + s + "\">" + c[s] + " " + STATUS_LABEL[s] + "</span>"; }).join("") + "</div>" +
      "<div style=\"display:flex;gap:10px;flex-wrap:wrap\"><a class=\"btn btn-nacre\" href=\"#results\">See the details <span class=\"arrow\" aria-hidden=\"true\">↓</span></a>" +
      "<button type=\"button\" class=\"btn btn-outline-light\" data-edit>Edit answers</button></div></div>";
  }

  /* ---------------- Compass ---------------- */
  var RING = { applies: 62, likely: 104, check: 144, none: 182 };
  var ORDER = ["law", "nrcc", "cbam", "ad", "fin", "phys", "build", "asks"];
  var prevStatus = {};
  function buildCompass() {
    var svg = document.getElementById("compass");
    var h = "<defs><radialGradient id=\"coreNacre\" cx=\"0.35\" cy=\"0.3\" r=\"0.9\"><stop offset=\"0\" stop-color=\"#ffffff\"/><stop offset=\".45\" stop-color=\"#e2d7fb\"/><stop offset=\".8\" stop-color=\"#a6e3d8\"/><stop offset=\"1\" stop-color=\"#f4c9b8\"/></radialGradient></defs>";
    [["none", "r4", "NOT INDICATED"], ["check", "r3", "CHECK"], ["likely", "r2", "LIKELY"], ["applies", "r1", "APPLIES"]].forEach(function (r) {
      h += "<circle class=\"ring " + r[1] + "\" cx=\"210\" cy=\"210\" r=\"" + RING[r[0]] + "\"" + (r[0] === "none" ? " stroke-dasharray=\"2 5\"" : "") + "/><text class=\"ringlabel\" x=\"210\" y=\"" + (210 - RING[r[0]] - 5) + "\">" + r[2] + "</text>";
    });
    h += "<circle class=\"core\" cx=\"210\" cy=\"210\" r=\"42\"/><text class=\"corenum\" id=\"core-n\" x=\"210\" y=\"214\">1</text><text class=\"corelbl\" x=\"210\" y=\"229\">IN PLAY</text>";
    ORDER.forEach(function (id) { h += "<g class=\"dot none\" id=\"dot-" + id + "\" data-ob=\"" + id + "\" role=\"button\" tabindex=\"0\"><circle r=\"7.5\" cx=\"0\" cy=\"0\"/><text></text></g>"; });
    svg.innerHTML = h;
  }
  function updateCompass(obs) {
    var by = {}; obs.forEach(function (o) { by[o.id] = o; });
    var n = 0;
    ORDER.forEach(function (id, i) {
      var o = by[id]; if (o.status === "applies" || o.status === "likely") n++;
      var ang = (-90 + 22.5 + i * 45) * Math.PI / 180;
      var r = RING[o.status];
      var x = 210 + r * Math.cos(ang), y = 210 + r * Math.sin(ang);
      var g = document.getElementById("dot-" + id);
      g.setAttribute("class", "dot " + o.status);
      g.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      g.setAttribute("aria-label", o.short + ": " + STATUS_LABEL[o.status]);
      var t = g.querySelector("text");
      var right = Math.cos(ang) >= -0.01;
      t.setAttribute("x", right ? 12 : -12); t.setAttribute("y", 4);
      t.setAttribute("text-anchor", right ? "start" : "end");
      t.textContent = o.short;
      if (prevStatus[id] && prevStatus[id] !== o.status && !reduce) {
        var c = g.querySelector("circle"); c.classList.remove("pulse"); void c.getBBox(); c.classList.add("pulse");
      }
      prevStatus[id] = o.status;
    });
    document.getElementById("core-n").textContent = n;
    document.getElementById("compass-count").textContent = obs.filter(function (o) { return o.status !== "none"; }).length + " of 8 in play";
  }

  /* ---------------- Results section ---------------- */
  var lastSummary = "";
  function renderResults(obs) {
    var order = { applies: 0, likely: 1, check: 2, none: 3 };
    var sorted = obs.slice().sort(function (x, y) { return order[x.status] - order[y.status]; });
    document.getElementById("ob-list").innerHTML = sorted.map(function (o) {
      return "<article class=\"ob " + o.status + "\" id=\"ob-" + o.id + "\"><div class=\"ob-top\"><h3>" + esc(o.title) + "</h3><span class=\"pill " + o.status + "\">" + STATUS_LABEL[o.status] + "</span></div><p class=\"why\">" + esc(o.why) + "</p>" +
        (o.status !== "none" ? "<p>" + esc(o.body) + "</p><span class=\"src\">" + esc(o.src) + "</span>" + sourceHtml(o.id) : "") + "</article>";
    }).join("");
    var data = [];
    obs.forEach(function (o) { if (o.status !== "none") (o.data || []).forEach(function (x) { if (data.indexOf(x) === -1) data.push(x); }); });
    var r = READINESS[A.data], p = plan(A, obs);
    var side = "";
    side += "<div class=\"panel-card\"><h3>Where you're starting from</h3>" + (r
      ? "<div class=\"meter\">" + [1, 2, 3, 4].map(function (i) { return "<i class=\"" + (i <= r.level ? "on" : "") + "\"></i>"; }).join("") + "</div><div class=\"meter-labels\"><span>None</span><span>Sheets</span><span>Software</span><span>Verified</span></div><p class=\"small\" style=\"margin:0;color:var(--ink-2)\">" + esc(r.text) + "</p>"
      : "<p class=\"small muted\" style=\"margin:0\">Answer question 8 to see this.</p>") + "</div>";
    side += "<div class=\"panel-card\"><h3>Your first two weeks</h3><div class=\"plan\"><div><h4>Week 1</h4><ul>" + p.w1.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div><div><h4>Week 2</h4><ul>" + p.w2.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></div></div>";
    side += "<div class=\"panel-card\"><h3>Data you'll need</h3><ul class=\"checklist\">" + data.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
    side += "<div class=\"panel-card\"><div style=\"display:flex;gap:10px;flex-wrap:wrap\"><button type=\"button\" class=\"btn btn-primary\" id=\"copy-summary\">Copy this summary</button><a class=\"btn btn-ghost\" href=\"../index.html#contact\">Book the diagnostic</a></div><pre id=\"summary-text\" class=\"codeblock\" style=\"white-space:pre-wrap\" hidden></pre><p class=\"disclaimer\">General information, not legal advice. Confirm with the authority.</p></div>";
    document.getElementById("side-stack").innerHTML = side;
    lastSummary = "Nokhada Climate Obligations Checker — summary\n\n" + sorted.map(function (o) { return "[" + STATUS_LABEL[o.status] + "] " + o.title + "\n  " + o.why; }).join("\n") +
      "\n\nData needed:\n" + data.map(function (x) { return "- " + x; }).join("\n") +
      "\n\nDiagnostic, week 1:\n" + p.w1.map(function (x) { return "- " + x; }).join("\n") + "\nDiagnostic, week 2:\n" + p.w2.map(function (x) { return "- " + x; }).join("\n") + "\n\nGeneral orientation only, not legal advice.";
    document.getElementById("copy-summary").addEventListener("click", function (e) {
      var pre = document.getElementById("summary-text"); pre.textContent = lastSummary; pre.hidden = false;
      if (window.NokhadaCopy) window.NokhadaCopy(lastSummary, pre, e.currentTarget);
    });
  }

  function refresh() {
    var obs = evaluate(A);
    updateCompass(obs);
    renderResults(obs);
    var nb = card.querySelector("[data-next]");
    if (nb) nb.disabled = !answered(cur);
    renderNecklace();
  }

  /* ---------------- Interaction ---------------- */
  var advanceTimer = null;
  function next() {
    if (!answered(cur)) return;
    clearTimeout(advanceTimer);
    if (cur < Q.length - 1) { cur++; renderCard(); }
    else { finished = true; renderCard(); }
    refresh();
    focusCard();
  }
  function back() { clearTimeout(advanceTimer); if (cur > 0) { cur--; renderCard(); refresh(); focusCard(); } }
  function focusCard() { var h = card.querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }

  function choose(val) {
    var q = Q[cur];
    if (q.type === "multi") {
      var arr = A[q.id].slice(), ex = val === "none" || val === "unsure";
      var i = arr.indexOf(val);
      if (i !== -1) arr.splice(i, 1);
      else { arr = arr.filter(function (v) { return ex ? false : !(v === "none" || v === "unsure"); }); arr.push(val); }
      A[q.id] = arr;
      card.querySelectorAll(".tile[data-val]").forEach(function (t) { t.setAttribute("aria-pressed", String(arr.indexOf(t.dataset.val) !== -1)); });
      refresh();
    } else {
      A[q.id] = val;
      card.querySelectorAll(".tile[data-val]").forEach(function (t) { t.setAttribute("aria-pressed", String(t.dataset.val === val)); });
      refresh();
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(next, reduce ? 150 : 480);
    }
  }

  function bindSlider() {
    var range = document.getElementById("t-range");
    var onInput = function () {
      var t = vToT(Number(range.value));
      A.sizeT = t; A.size = bucket(t);
      document.getElementById("t-read").textContent = "≈ " + nice(t).toLocaleString("en-US");
      range.setAttribute("aria-valuetext", "about " + nice(t).toLocaleString("en-US") + " tonnes");
      document.getElementById("gauge").classList.remove("unknown");
      var u = card.querySelector("[data-unknown]"); if (u) u.setAttribute("aria-pressed", "false");
      refresh();
    };
    range.addEventListener("input", onInput);
  }

  card.addEventListener("click", function (e) {
    var t = e.target.closest("[data-val],[data-next],[data-back],[data-example],[data-edit],[data-unknown],[data-em],[data-zone]");
    if (!t) return;
    if (t.hasAttribute("data-val")) choose(t.dataset.val);
    else if (t.hasAttribute("data-next")) next();
    else if (t.hasAttribute("data-back")) back();
    else if (t.hasAttribute("data-edit")) { finished = false; cur = 0; renderCard(); refresh(); focusCard(); }
    else if (t.hasAttribute("data-example")) {
      Object.keys(EXAMPLE).forEach(function (k) { A[k] = Array.isArray(EXAMPLE[k]) ? EXAMPLE[k].slice() : EXAMPLE[k]; });
      loadWhere(); finished = true; cur = Q.length - 1; renderCard(); refresh();
    }
    else if (t.hasAttribute("data-unknown")) {
      var on = A.size !== "unknown";
      A.size = on ? "unknown" : bucket(A.sizeT);
      t.setAttribute("aria-pressed", String(on));
      document.getElementById("gauge").classList.toggle("unknown", on);
      refresh();
      if (on) { clearTimeout(advanceTimer); advanceTimer = setTimeout(next, reduce ? 150 : 480); }
    }
    else if (t.hasAttribute("data-em") || t.hasAttribute("data-zone")) {
      var key = t.dataset.em || t.dataset.zone;
      emSel[key] = !emSel[key];
      card.querySelectorAll("[data-em=\"" + key + "\"],[data-zone=\"" + key + "\"]").forEach(function (el) { el.setAttribute("aria-pressed", String(!!emSel[key])); });
      syncWhere(); whereLine(); refresh();
    }
  });
  card.addEventListener("keydown", function (e) {
    var t = e.target.closest("[data-em],[data-zone]");
    if (t && (e.key === "Enter" || e.key === " ") && t.getAttribute("role") === "button") { e.preventDefault(); t.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  document.addEventListener("keydown", function (e) {
    if (finished || e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") { if (e.key === "Enter" && e.target.type === "range") next(); return; }
    var stage = document.getElementById("checker-stage").getBoundingClientRect();
    if (stage.bottom < 0 || stage.top > window.innerHeight) return;
    var q = Q[cur];
    if (/^[1-9]$/.test(e.key) && q.opts) { var o = q.opts[Number(e.key) - 1]; if (o) { e.preventDefault(); choose(o[0]); } }
    else if (e.key === "Enter" && !e.target.closest("button,[role=button],a")) { e.preventDefault(); next(); }
  });
  document.getElementById("necklace").addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]"); if (!b) return;
    clearTimeout(advanceTimer); finished = false; cur = Number(b.dataset.go); renderCard(); refresh(); focusCard();
  });
  function openOb(id) {
    var el = document.getElementById("ob-" + id); if (!el) return;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.classList.add("flash"); setTimeout(function () { el.classList.remove("flash"); }, 1600);
  }
  var compassEl = document.getElementById("compass");
  compassEl.addEventListener("click", function (e) { var g = e.target.closest("[data-ob]"); if (g) openOb(g.dataset.ob); });
  compassEl.addEventListener("keydown", function (e) { var g = e.target.closest("[data-ob]"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openOb(g.dataset.ob); } });

  buildCompass();
  renderCard();
  refresh();
})();
