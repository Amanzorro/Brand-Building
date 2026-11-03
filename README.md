# Nokhada · نوخذة

Brand and marketing site for **Nokhada**, a firm that deploys Claude Code inside UAE organisations for **climate services**: emissions inventories, UAE Climate Law, NRCC and CBAM reporting, and physical and transition climate-risk analysis.

It follows the Kith AI Lab model (Claude Code deployed inside the client, encoded with the client's own methodology, owned rather than rented), aimed at climate work in the UAE.

- `docs/RESEARCH.md`: a teardown of Kith AI Lab, notes on the UAE climate market and how each element maps across
- `docs/BRAND.md`: name, positioning, voice, logo, colour, type and go-to-market notes

## Site structure

Static HTML, CSS and JS with no build step. Host it anywhere (Cloudflare Pages, Netlify, GitHub Pages, S3).

```
index.html            Home (EN)
industry.html         Industry & exporters: GHG inventory, Climate Law/NRCC, CBAM, Scope 3
finance.html          Banks, insurers & investors: climate risk, financed emissions, transition plans
real-estate.html      Real estate & infrastructure: asset-level physical risk, energy/water/cooling
climate-rules.html    UAE climate rules at a glance (review regularly; dated "last reviewed")
security.html         Deployment models, data protection, controls
try/index.html        "Try it" hub + what clients should expect (timeline, deliverables, pricing model)
try/obligations-checker.html   Climate Obligations Checker (runs in the browser, no data leaves the page)
try/sieve-demo.html   The Sieve: scripted demo on a fictional company's 44-document evidence pack
insights/             Essays: The Sieve, Heat is the risk, Own your methodology
ar/index.html         Arabic home page (RTL)
assets/css/style.css  Design tokens and all styles (light and dark)
assets/css/tools.css  Styles for the two tools
assets/js/main.js     Mobile menu, scroll reveal, contact form
assets/js/obligations.js  Checker rules and rendering (rules mirror climate-rules.html)
assets/js/sieve-demo.js   Demo data, live calculations, Sieve checks, document viewer
assets/img/           Logo mark, wordmark, favicon (SVG)
```

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Before going live
1. **Regulatory review:** have UAE counsel or a climate-regulation adviser check `climate-rules.html` against the current MOCCAE, NRCC, emirate-level and financial-regulator texts. Deadlines, thresholds and penalties change, so update the "last reviewed" date each time.
2. **Trademark and domain clearance** for "Nokhada" / "نوخذة" (see `docs/BRAND.md`).
3. **Contact email:** `hello@nokhada.ae` is a placeholder. Change it in `assets/js/main.js` (`CONTACT_EMAIL`) and in the footer of each page.
4. **Contact form:** it currently prepares the message for the visitor to copy and send from their own email. Point it at a real form endpoint or CRM.
5. **Arabic copy:** get a native editor to review `ar/index.html`, then add Arabic versions of the inner pages.
6. **Credentials:** add a team section with climate and verification credentials, such as GHG Protocol experience, ISO 14064 expertise and sector backgrounds. Buyers in this market will look for them.
7. **Security pack:** `security.html` offers one. Prepare it before launch.

## The tools

**Obligations Checker** (`try/obligations-checker.html`): eight questions, one card at a time, with visual answers: a clickable hex map of the emirates with DIFC and ADGM pins, icon tiles, an emissions slider with the large-emitter marker, and a data-maturity ladder. Keyboard shortcuts: 1–9 to choose, Enter for next. A live "obligations map" moves each rule between rings (Applies, Likely, Check, Not indicated) as you answer. Below it are plain-language details, a data checklist, a readiness gauge and a tailored week 1 and week 2 diagnostic plan. The rules are in `evaluate()` in `assets/js/obligations.js`. Keep them in step with `climate-rules.html`.

**Sieve demo** (`try/sieve-demo.html`) uses a fictional client, Ras Saffa Logistics. The evidence pack has 44 documents, 18 of them in Arabic. Extraction is pre-recorded. The calculations, the four-layer Sieve, trace views and deliverables are computed live in the browser. Step 4 shows the Sieve visually: 50 pearls fall through four mesh layers, and the four caught ones stop at the layer that caught them and can be selected. Four planted issues are caught: a duplicate invoice, an out-of-period delivery note, three missing cooling invoices and an implausible July invoice that needs a reviewer's decision. Emission factors in the demo are **placeholders**. Replace them with cited values before showing it as anything other than illustrative.

## Preview
A private preview is published as a claude.ai artifact, and it can be shared from the artifact's Share menu. To republish after changes, the root `index.html` has to be unwrapped (title, meta and links, then body content). The other pages ship as they are.
