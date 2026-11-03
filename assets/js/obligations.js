/* Nokhada — Climate Obligations Checker.
   Runs entirely in the browser. Nothing the visitor enters leaves the page.
   Rules reflect the "UAE climate rules" page (last reviewed November 2026)
   and are deliberately conservative: when in doubt, the status is "Check". */
(function () {
  "use strict";

  var form = document.getElementById("checker-form");
  var out = document.getElementById("checker-results");
  if (!form || !out) return;

  var EXAMPLE = {
    where: ["dxb-main", "fz"],
    sector: "logistics",
    size: "10to100",
    cbam: ["none"],
    licensed: "no",
    asks: "yes",
    assets: "own",
    data: "sheets"
  };

  var STATUS_LABEL = { applies: "Applies", likely: "Likely", check: "Check", none: "Not indicated" };

  function read() {
    var d = new FormData(form);
    return {
      where: d.getAll("where"),
      sector: d.get("sector") || "",
      size: d.get("size") || "",
      cbam: d.getAll("cbam"),
      licensed: d.get("licensed") || "",
      asks: d.get("asks") || "",
      assets: d.get("assets") || "",
      data: d.get("data") || ""
    };
  }

  function apply(ans) {
    form.querySelectorAll("input").forEach(function (inp) {
      var v = ans[inp.name];
      inp.checked = Array.isArray(v) ? v.indexOf(inp.value) !== -1 : v === inp.value;
    });
  }

  var CBAM_GOODS = { alu: "aluminium", steel: "iron and steel", cement: "cement", fert: "fertilisers", h2: "hydrogen", elec: "electricity" };

  function evaluate(a) {
    var obs = [];
    var has = function (arr, v) { return arr.indexOf(v) !== -1; };
    var inAbuDhabi = has(a.where, "ad-main") || has(a.where, "adgm");
    var inDubai = has(a.where, "dxb-main") || has(a.where, "difc");
    var isFinance = a.sector === "finance" || a.licensed === "yes";

    // 1. Federal Climate Law
    obs.push({
      id: "law", status: "applies",
      title: "UAE Climate Law: measure, report and reduce",
      body: "You need to measure and report your greenhouse-gas emissions, keep the records and take reduction measures. Detailed requirements are set by the Ministry of Climate Change and Environment and local authorities.",
      why: "Applies to public and private entities, onshore and in free zones.",
      data: ["Electricity, water and district-cooling bills for every site", "Fuel records for vehicles, generators and equipment", "Refrigerant purchase and top-up logs", "A list of every site and entity, with who controls each"],
      src: "Federal Decree-Law No. 11 of 2024 · in force 30 May 2025"
    });

    // 2. NRCC registration
    var nrcc = { id: "nrcc", title: "National Register for Carbon Credits (NRCC)", src: "Cabinet Resolution No. 67 of 2024 · run by MOCCAE",
      data: ["Annual emissions estimate by scope", "Evidence index for a verifier"] };
    if (a.size === "gte500") {
      nrcc.status = "applies";
      nrcc.body = "At your scale, registration on the NRCC and verified reporting are expected. Your inventory will need to stand up to an approved verifier.";
      nrcc.why = "You estimate 500,000 tCO₂e or more a year, the level reported for mandatory registration.";
    } else if (a.size === "unknown" || a.size === "") {
      nrcc.status = "likely";
      nrcc.body = "Whether registration is mandatory for you depends on your annual emissions. The first step is a screening estimate from your bills and fuel records.";
      nrcc.why = "You don't know your emissions yet.";
      nrcc.data = ["Twelve months of energy and fuel records for a screening estimate"];
    } else {
      nrcc.status = "check";
      nrcc.body = "Below the large-emitter level, registration may be voluntary or phased. Confirm the current thresholds and timing for your category with MOCCAE.";
      nrcc.why = "Your estimated emissions are below 500,000 tCO₂e a year.";
    }
    obs.push(nrcc);

    // 3. Abu Dhabi reporting system
    obs.push(inAbuDhabi ? {
      id: "ad", status: "check",
      title: "Abu Dhabi emissions reporting system",
      body: "Abu Dhabi has issued its own reporting system under the federal law, with its own thresholds. Check which of your Abu Dhabi entities fall within it.",
      why: "You operate in Abu Dhabi or ADGM.",
      data: ["Site-level data for Abu Dhabi operations, kept separately"],
      src: "Abu Dhabi emirate-level requirements"
    } : {
      id: "ad", status: "none", title: "Abu Dhabi emissions reporting system",
      why: "You haven't selected Abu Dhabi or ADGM."
    });

    // 4. CBAM
    var goods = a.cbam.filter(function (g) { return CBAM_GOODS[g]; }).map(function (g) { return CBAM_GOODS[g]; });
    if (goods.length) {
      obs.push({
        id: "cbam", status: "applies",
        title: "EU CBAM: embedded emissions for your exports",
        body: "Since 1 January 2026, EU importers of " + goods.join(", ") + " pay for the emissions embedded in those goods. They will ask you for installation-level emissions data, and good data can lower their cost compared with EU default values.",
        why: "You export CBAM-covered goods to the EU.",
        data: ["Production volumes by installation and product", "Direct fuel and process emissions by installation", "Electricity consumption and source for each installation", "Precursor materials and their suppliers"],
        src: "EU CBAM · definitive period from 1 January 2026"
      });
    } else if (has(a.cbam, "unsure")) {
      obs.push({
        id: "cbam", status: "check", title: "EU CBAM: embedded emissions for your exports",
        body: "If any of your EU exports are aluminium, iron and steel, cement, fertilisers, hydrogen or electricity, your EU customers will need emissions data from you. Check your EU product list against the covered goods.",
        why: "You're not sure whether your exports are covered.",
        data: ["A list of EU-bound products with their customs codes"],
        src: "EU CBAM · definitive period from 1 January 2026"
      });
    } else {
      obs.push({ id: "cbam", status: "none", title: "EU CBAM: embedded emissions for your exports", why: "You don't export CBAM-covered goods to the EU." });
    }

    // 5. Financial-sector principles
    if (isFinance) {
      obs.push({
        id: "fin", status: a.licensed === "yes" ? "applies" : "likely",
        title: "Financial-sector climate principles",
        body: "UAE financial regulators expect board oversight of climate risk, physical and transition risk built into risk management, sustainability disclosures and a transition plan.",
        why: a.licensed === "yes" ? "You're licensed by the CBUAE, CMA, DFSA or FSRA." : "You work in financial services. Check whether your licence brings you in scope.",
        data: ["Loan and investment book with sector codes", "Collateral and asset locations", "Counterparty emissions and transition plans where disclosed", "Current risk appetite and governance documents"],
        src: "UAE Sustainable Finance Working Group principles: Nov 2023 (risk), Jun 2024 (disclosure), Feb 2026 (transition planning)"
      });
    } else {
      obs.push({ id: "fin", status: "none", title: "Financial-sector climate principles", why: "You're not a regulated financial firm." });
    }

    // 6. Customer and investor requests
    obs.push(a.asks === "yes" ? {
      id: "asks", status: "applies",
      title: "Customer, lender and investor requests",
      body: "This isn't a legal duty, but the commercial pressure is real. Answers to questionnaires should come from the same inventory you report to regulators, so the numbers always match.",
      why: "You're already receiving requests for emissions data.",
      data: ["Copies of recent questionnaires and the answers you gave", "Scope 3 data from your main suppliers"],
      src: "Commercial requirement"
    } : {
      id: "asks", status: "none", title: "Customer, lender and investor requests", why: "You haven't received requests yet. Most firms do within a year of supplying multinationals."
    });

    // 7. Physical climate risk
    var financesAssets = a.assets === "finance" || a.assets === "both";
    var ownsAssets = a.assets === "own" || a.assets === "both";
    if (a.licensed === "yes" && financesAssets) {
      obs.push({
        id: "phys", status: "applies", title: "Physical climate risk on assets",
        body: "The climate-risk principles expect you to assess physical risk such as extreme heat, flooding and sea-level rise across the assets you finance, and report concentrations to the board.",
        why: "You're regulated and you finance real assets.",
        data: ["Addresses or coordinates for collateral and investee assets", "Asset type, age and value"],
        src: "Climate-related financial risk principles · Nov 2023"
      });
    } else if (ownsAssets || financesAssets) {
      obs.push({
        id: "phys", status: "likely", title: "Physical climate risk on assets",
        body: "Lenders, insurers and buyers increasingly ask about heat, flood and water exposure. There's no standalone legal duty, but an evidence-backed asset register answers those questions quickly.",
        why: "You own, operate or finance buildings or infrastructure.",
        data: ["Asset register with locations", "Cooling, energy and water data per asset", "Drainage and flood history where known"],
        src: "Lender and insurer requirements"
      });
    } else {
      obs.push({ id: "phys", status: "none", title: "Physical climate risk on assets", why: "You haven't said you own or finance real assets." });
    }

    // 8. Green-building rules
    if (a.sector === "realestate" || ownsAssets) {
      var schemes = [];
      if (inAbuDhabi) schemes.push("Estidama (Abu Dhabi)");
      if (inDubai) schemes.push("Al Sa'fat (Dubai)");
      obs.push({
        id: "build", status: "check", title: "Green-building regulations and ratings",
        body: "New buildings and major refurbishments may need to meet local green-building regulations" + (schemes.length ? ", such as " + schemes.join(" and ") : "") + ". Check which apply to your projects.",
        why: "You develop, own or operate buildings.",
        data: ["Design and as-built documentation", "Energy and water modelling or metering"],
        src: "Emirate-level building regulations"
      });
    } else {
      obs.push({ id: "build", status: "none", title: "Green-building regulations and ratings", why: "You don't develop or operate buildings." });
    }

    return obs;
  }

  var READINESS = {
    none: { level: 1, label: "Starting out", text: "There are no records in one place yet. Expect the diagnostic to focus on which records exist, who holds them and a simple evidence request you can send to site managers." },
    sheets: { level: 2, label: "Spreadsheets", text: "You have a base to work from. Expect us to turn your spreadsheets into a traced, rerunnable inventory and close the gaps the Sieve finds." },
    software: { level: 3, label: "Carbon software", text: "Expect us to check your current outputs with the Sieve, move your methodology into files you own, and connect the tool rather than replace it where it works." },
    verified: { level: 4, label: "Verified inventory", text: "Expect the focus to be speed and coverage: shorter reporting cycles, faster answers to verifier queries, and new obligations such as CBAM or physical risk." }
  };

  function plan(a, obs) {
    var on = function (id) { var o = obs.filter(function (x) { return x.id === id; })[0]; return o && o.status !== "none"; };
    var w1 = ["Obligations map for each entity and site", "Inventory of data sources and who owns them"];
    if (on("cbam")) w1.push("List of CBAM-covered products and installations");
    if (on("fin")) w1.push("Gap review against the financial-sector climate principles");
    if (on("phys")) w1.push("Asset list with locations, ready for screening");
    var w2 = [];
    if (on("fin")) w2.push("One portfolio slice run end to end, including the Sieve");
    else if (on("cbam")) w2.push("One product line's embedded emissions run end to end");
    else w2.push("One site's inventory run end to end, including the Sieve");
    if (a.data === "none") w2.push("Evidence request template for site managers");
    w2.push("Written plan with priorities, effort, timeline and a fixed-fee build proposal");
    return { w1: w1, w2: w2 };
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }

  var lastSummary = "";

  function render() {
    var a = read();
    var obs = evaluate(a);
    var order = { applies: 0, likely: 1, check: 2, none: 3 };
    obs.sort(function (x, y) { return order[x.status] - order[y.status]; });
    var counts = { applies: 0, likely: 0, check: 0, none: 0 };
    obs.forEach(function (o) { counts[o.status]++; });

    var data = [];
    obs.forEach(function (o) { if (o.status !== "none") (o.data || []).forEach(function (x) { if (data.indexOf(x) === -1) data.push(x); }); });

    var r = READINESS[a.data];
    var p = plan(a, obs);

    var html = "";
    html += "<div class=\"results-head\"><span class=\"eyebrow\" style=\"margin:0\">Your obligations map</span>";
    html += "<h2>" + (counts.applies + counts.likely) + " obligations apply or are likely, and " + counts.check + " need checking.</h2>";
    html += "<div class=\"tally\">" + ["applies", "likely", "check", "none"].map(function (s) {
      return "<span class=\"pill " + s + "\">" + counts[s] + " " + STATUS_LABEL[s] + "</span>";
    }).join("") + "</div></div>";

    obs.forEach(function (o) {
      html += "<article class=\"ob " + o.status + "\"><div class=\"ob-top\"><h3>" + esc(o.title) + "</h3><span class=\"pill " + o.status + "\">" + STATUS_LABEL[o.status] + "</span></div>";
      html += "<p class=\"why\">" + esc(o.why) + "</p>";
      if (o.status !== "none") {
        html += "<div class=\"ob-body\" style=\"display:grid;gap:8px\"><p>" + esc(o.body) + "</p>";
        if (o.src) html += "<span class=\"src\">" + esc(o.src) + "</span>";
        html += "</div>";
      }
      html += "</article>";
    });

    html += "<div class=\"results-foot\">";
    if (r) {
      html += "<div class=\"readiness\"><h3>Where you're starting from</h3><div class=\"meter\" aria-label=\"Data readiness " + r.level + " of 4\">" +
        [1, 2, 3, 4].map(function (i) { return "<i class=\"" + (i <= r.level ? "on" : "") + "\"></i>"; }).join("") +
        "</div><div class=\"meter-labels\"><span>None</span><span>Spreadsheets</span><span>Software</span><span>Verified</span></div><p style=\"margin:0;font-size:.92rem;color:var(--ink-2)\">" + esc(r.text) + "</p></div>";
    }
    html += "<div><h3 style=\"margin-bottom:10px\">Data you'll need</h3><ul class=\"checklist\">" + data.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
    html += "<div><h3 style=\"margin-bottom:10px\">What your two-week diagnostic would cover</h3><div class=\"plan\"><div><h4>Week 1</h4><ul>" +
      p.w1.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div><div><h4>Week 2</h4><ul>" +
      p.w2.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></div></div>";
    html += "<div style=\"display:flex;flex-wrap:wrap;gap:10px\"><button type=\"button\" class=\"btn btn-primary\" id=\"copy-summary\">Copy this summary</button>" +
      "<a class=\"btn btn-ghost\" href=\"../index.html#contact\">Book the diagnostic <span class=\"arrow\" aria-hidden=\"true\">→</span></a>" +
      "<a class=\"btn btn-ghost\" href=\"sieve-demo.html\">See the Sieve demo</a></div>";
    html += "<pre id=\"summary-text\" hidden></pre>";
    html += "<p class=\"disclaimer\">This is a general orientation based on your answers, not legal or regulatory advice. Rules, thresholds and deadlines change, so confirm current requirements with MOCCAE, your local authority, your regulator and your advisers. Your answers stay in this browser.</p>";
    html += "</div>";

    out.innerHTML = "<div class=\"results-card\">" + html + "</div>";

    lastSummary = "Nokhada Climate Obligations Checker — summary\n\n" +
      obs.map(function (o) { return "[" + STATUS_LABEL[o.status] + "] " + o.title + "\n  " + o.why; }).join("\n") +
      "\n\nData needed:\n" + data.map(function (x) { return "- " + x; }).join("\n") +
      "\n\nDiagnostic, week 1:\n" + p.w1.map(function (x) { return "- " + x; }).join("\n") +
      "\nDiagnostic, week 2:\n" + p.w2.map(function (x) { return "- " + x; }).join("\n") +
      "\n\nGeneral orientation only, not legal advice.";
    var pre = document.getElementById("summary-text");
    pre.textContent = lastSummary;
    document.getElementById("copy-summary").addEventListener("click", function (e) {
      pre.hidden = false;
      pre.className = "codeblock";
      pre.style.whiteSpace = "pre-wrap";
      if (window.NokhadaCopy) window.NokhadaCopy(lastSummary, pre, e.currentTarget);
    });
  }

  // "None"/"Not sure" are exclusive with specific CBAM goods
  form.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "cbam" && t.checked) {
      var exclusive = t.value === "none" || t.value === "unsure";
      form.querySelectorAll("input[name=cbam]").forEach(function (i) {
        if (i === t) return;
        var iEx = i.value === "none" || i.value === "unsure";
        if (exclusive || iEx) i.checked = false;
      });
    }
    var banner = document.getElementById("example-banner");
    if (banner && !banner.dataset.touched) {
      banner.dataset.touched = "1";
      banner.querySelector("[data-msg]").innerHTML = "<strong>Your answers</strong> — results update as you go.";
    }
    render();
  });

  var resetBtn = document.getElementById("start-fresh");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    form.querySelectorAll("input").forEach(function (i) { i.checked = false; });
    var banner = document.getElementById("example-banner");
    banner.dataset.touched = "1";
    banner.querySelector("[data-msg]").innerHTML = "<strong>Your answers</strong> — start with question 1. Results update as you go.";
    render();
    form.querySelector("input").focus();
  });
  var exBtn = document.getElementById("load-example");
  if (exBtn) exBtn.addEventListener("click", function () {
    apply(EXAMPLE);
    var banner = document.getElementById("example-banner");
    delete banner.dataset.touched;
    banner.querySelector("[data-msg]").innerHTML = "<strong>Example:</strong> a Dubai logistics company with a free-zone warehouse. Change any answer to make it yours.";
    render();
  });

  apply(EXAMPLE);
  render();
})();
