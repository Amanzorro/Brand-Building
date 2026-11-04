# Implementation prompts

Paste each prompt into its own Claude Code session on the `Amanzorro/Nokhada` repository.
- **A and B** touch different files, so they can run at the same time.
- **C** runs after A and B are both merged into `main`.

Each prompt stands on its own. The background is in `docs/REVIEW.md`.

---

## Prompt A: Make the site succinct and less AI-looking

```
You are working on the Nokhada marketing site (static HTML/CSS/JS, UAE climate-reporting firm).
Read CLAUDE.md, docs/BRAND.md and docs/REVIEW.md (if present) before changing anything.
Branch from main as `site-simplify` and open one PR into main when done.

GOAL
The site reads as AI-generated and too wordy. Make it short, plain and specific.
Current state: homepage ~1,360 words, 10 sections, 11 cards, an eyebrow label on every section;
whole site ~6,200 words. Targets: homepage ≤ 350 words; whole site ≤ 2,500 words.
Report before/after word counts per page in the PR (count text inside <main>, excluding scripts).

STRUCTURE
1. Homepage (src/pages/home.html), in this order and nothing else:
   - Hero: a literal headline of 8 words or fewer, one sentence beneath, one primary button
     (Book a call) and one text link (Try the tool). No hero image for now.
     Delete the fake terminal session.
   - What we do: three plain rows, one sentence each:
     Emissions inventory · Climate Law, NRCC and CBAM reporting · Climate risk.
   - How it works: one short numbered list, two weeks diagnostic → build → run.
     No cards, no durations beyond that.
   - Try it: one line and links to the Obligations Checker and (for now) the Sieve demo.
   - Who we are: a founder block. Do NOT invent people. In src/build.py add a SHOW_TEAM = False
     flag and render this block only when it's True; list the inputs needed (names, roles,
     experience, LinkedIn URLs, photo) in the PR description.
   - Contact: the existing form plus the email shown as plain text.
2. Merge industry.html, finance.html and real-estate.html into one services.html with three
   short sections (≤ 150 words each), using anchors #industry, #finance, #real-estate.
   Delete the three old fragments and their PAGES rows. Add 301 redirects in vercel.json
   from the old URLs to the new anchors.
3. Insights: remove from the nav and footer. Move the three essays to docs/drafts/ (as Markdown,
   not published), delete their PAGES rows, and add redirects from /insights/* to /.
4. Security page: cut to ≤ 250 words. Where it runs, what we store (nothing by default),
   which data-protection regimes apply, the controls list. Remove anything repeated elsewhere.
5. Climate rules page: keep the tables. For every rule, add a link to the official source
   (the issuing authority's own page or the official gazette/legislation portal, plus the EU's
   own CBAM page). Only link pages you have actually opened and confirmed; if you cannot reach
   or confirm a source, leave a visible "[source to confirm]" marker and list it in the PR.
   Add a line "Last reviewed: [date] by [name — to be provided]".
6. Try it hub (try/index.html): reduce to two links and a five-line "Working with us"
   summary (what we need from you, what you get, how pricing works). Remove the timeline.
7. Nav becomes: Services · Climate rules · Try it · العربية · [Book a call].
8. Arabic home page (ar/index.html, hand-written): mirror the new homepage structure and length.
   Flag all new Arabic for native review in the PR.

COPY RULES (apply everywhere; add them to CLAUDE.md under "Content rules")
- No eyebrow labels above sections. No mono uppercase tags on cards.
- No "X, not Y", "rather than", "instead of", "in place of" constructions.
- Don't group things in threes by habit. Use as many items as there really are.
- No metaphors or heritage storytelling. Keep only one line explaining the name (a nokhada was
  the captain of a pearling dhow) on the homepage or footer.
- Headlines say literally what the section contains. Paragraphs are two sentences at most.
- Mention "diagnostic" at most once per page. Say "evidence" only where no plainer word works.
- No statistics, results or claims that can't be checked. Delete rather than soften.

DESIGN (assets/css/style.css: a hot spot, so say so in the PR title)
- Remove the rotating hero orb, the glow/blob pseudo-elements on .section-dark, .page-hero, .cta
  and .stage-dark, gradient text (.sheen) in headlines, and the gradient hover borders on cards.
- Keep the palette and the two typefaces. Use the nacre gradient in at most two places sitewide
  (logo and the primary button), or not at all.
- Prefer lists, hairline rules and whitespace over bordered cards. Body text 18px, max 65ch.
- Keep light and dark themes working, phone width ~390px with no horizontal scroll,
  and prefers-reduced-motion respected.

TOOLS
- Obligations Checker: keep the interaction. Trim on-screen copy by half. Add the official
  source link (same ones as the climate rules page) to each rule's detail card.
  Keep rules in assets/js/obligations.js consistent with climate-rules.html.
- Sieve demo: leave as is for now. Prompt C replaces it.

CHECKS BEFORE THE PR
python3 src/build.py && python3 src/build.py --check && python3 scripts/check_links.py,
node --check on any JS touched. Screenshot the homepage and services page at 1366px and 390px
in light and dark mode (Playwright/Chromium is available) and attach or describe them.
In the PR: before/after word counts, the list of inputs needed from the owner, any
"[source to confirm]" items, and a note that Arabic needs native review.
```

---

## Prompt B: Build Nokhada Workbench (real documents, real AI)

```
Build "Nokhada Workbench": a working web app that turns real utility bills, district-cooling
invoices, fuel records and refrigerant logs (PDF, image or CSV; Arabic or English) into a
Scope 1 and 2 emissions inventory where every number links to the page it came from.
It will be demoed live to prospective clients on their own documents.

Read CLAUDE.md and docs/BRAND.md first. Work only inside a new workbench/ folder; do not edit the
marketing site's files. Branch from main as `workbench` and open one PR into main.
Before writing any Claude API code, load the claude-api skill and use it to confirm the current
model IDs, PDF/image document input, the citations feature, structured output / tool use, and
the TypeScript SDK usage. Don't rely on memory for any of these.

STACK
- Next.js (current stable, App Router, TypeScript) in workbench/, deployable as its own Vercel
  project with Root Directory = workbench. Official Anthropic TypeScript SDK, server-side only.
- Model from env ANTHROPIC_MODEL, defaulting to the current Sonnet model ID confirmed via the skill.
- Unit tests with vitest. No database.

PIPELINE
1. Upload: up to 20 files, 10 MB each; PDF, PNG/JPEG, CSV/XLSX. Show each file's status.
2. Classify each document: electricity bill, district-cooling invoice, fuel record,
   generator delivery note, refrigerant log, other/unsupported.
3. Extract with Claude into a strict schema: document type, account or meter ID, invoice or
   reference number, site/customer as written, service period start/end, reporting-relevant
   line items {quantity, unit, description}, document language. Each field carries a citation:
   page number plus the exact source text. Use the API's citations feature if the skill confirms
   it fits; otherwise require a verbatim quote + page and verify the quote against the PDF text
   layer server-side. Mark any field whose citation can't be verified (e.g. scanned images) as
   "unverified". Normalise Eastern Arabic digits and Arabic month names. The model never computes
   totals.
4. Review: an editable table of extracted rows with a document viewer showing the cited page and
   quote. Users can correct, exclude or confirm rows; every edit is logged with the old value,
   the new value and a reason.
5. Calculate: a pure TypeScript engine (no AI) in workbench/lib/engine:
   - explicit unit conversions (kWh/MWh, RTh/ton-hours, litres, US and imperial gallons, kg),
     each tested
   - scope mapping: fuels and refrigerants → Scope 1; grid electricity and district cooling →
     Scope 2 (location-based); water → reported as activity only, no emissions by default
   - tCO2e per row, per source, per scope, per site; every result keeps the list of row IDs
     and the factor ID it came from
6. Factor library: workbench/data/factors.json, versioned. Each factor: id, activity, unit,
   value, gas basis, geography, source title, publisher, year/version, URL, retrieved date, notes.
   - Use only factors you have read in the official source document (for example the UK
     government's published GHG conversion factors for fuel combustion, and IPCC assessment-report
     GWP values for refrigerants; record which AR you use).
   - NEVER invent or estimate a factor. For UAE grid electricity and district cooling, include a
     factor only if you find and cite an official public figure from the utility or authority;
     otherwise ship no default and make the UI require a "user-supplied" value with its source,
     labelled as such in every output.
   - If you can't reach a source from your environment, leave the factor out and list it in the PR.
7. The Sieve (deterministic checks in workbench/lib/sieve, unit tested):
   - duplicate documents (same invoice number, or same account + period + quantity)
   - missing or overlapping periods per account
   - items outside the chosen reporting period
   - unrecognised or inconvertible units
   - outliers versus the same account's median (configurable thresholds)
   - rows with no factor, or a user-supplied factor
   - unverified citations
   Each finding: severity, affected rows, plain-language explanation, suggested action.
   Optional "AI review" button: Claude reads the extracted table (not the maths) and suggests
   things to look at. These are shown separately, labelled "AI suggestions", and never change
   values.
   Estimation for gaps is opt-in, uses an explicit stated rule, and labels the result as an
   estimate.
8. Outputs: inventory by scope/source/site; an evidence index (figure → rows → document, page,
   quote → factor and source); a review queue; and an executive summary in English and Arabic.
   Claude drafts the summary text from a template with placeholders filled by the engine;
   after generation, check that every number in the text matches an engine value, and reject
   and regenerate (or fall back to the template) if not. Exports: CSV and JSON (XLSX optional).

PRIVACY AND COST
- Nothing persists server-side. Process files in the request, return results to the browser,
  keep session state client-side. Don't log document contents.
- Documents go only to the Anthropic API. Show a short notice saying so on the upload screen.
- Passcode gate (env DEMO_PASSCODE) via middleware and an httpOnly cookie, plus file limits and
  a per-session request cap. Document the limits honestly in the README.
- Env vars: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (optional), DEMO_PASSCODE. Provide .env.example.

DEMO DATA
- Real documents come from the owner at demo time. Never commit real client documents.
- Build a sample pack in workbench/fixtures: about 12 synthetic documents, clearly marked
  "SYNTHETIC SAMPLE" on the page, in English and Arabic. Use generic issuer names (never real
  utilities or companies) and include planted problems: a duplicate, a gap, an out-of-period item
  and an outlier. Render them from HTML templates to PDF with Playwright/Chromium so Arabic shapes
  correctly. Include expected extraction JSON for each.
- A "Load sample pack" button in the UI.
- An eval script (npm run eval) that runs extraction on the fixtures and reports field-level
  accuracy against the expected JSON. Include the latest results in the PR.

DESIGN
Match the site's identity (workbench should feel like the same company), but restrained:
light theme by default with dark-mode support, tables first, no decorative gradients or glow,
no section eyebrows. Usable at 390px width for viewing; upload/review may assume a laptop.

ACCEPTANCE
- npm test passes (engine, units, sieve).
- npm run build passes.
- npm run eval runs and reports accuracy.
- With a real API key, the sample pack goes end to end in the UI: upload, extract with citations,
  review, calculate, Sieve findings, summary, export.
- Any number in the UI can be clicked through to its document page and quote.
- workbench/README.md covers setup, env vars, Vercel deployment (separate project, Root
  Directory = workbench), the factor sources, known limits and what the owner must provide.

PR description: what works, eval results, the factor table with sources, the factors that need
the owner's input, limits, and screenshots of the sample-pack run.
```

---

## Prompt C: Join the site and the Workbench

```
Run this after Prompt A (site-simplify) and Prompt B (workbench) are merged into main.
Read CLAUDE.md first. Branch from main as `integrate` and open one PR.

1. Add WORKBENCH_URL as a constant in src/build.py. The owner will give you the deployed Vercel
   URL; if not provided, use a clear placeholder and say so in the PR.
2. Homepage and Try it: link "Try the tool" to the Workbench (sample pack mode) and keep the
   Obligations Checker link. Retire try/sieve-demo.html: remove its PAGES row and fragment,
   delete assets/js/sieve-demo.js and the demo-only CSS in assets/css/tools.css, and add a
   redirect to the Workbench.
3. Hero image: capture a screenshot of the Workbench evidence index from the SYNTHETIC sample
   pack (never real client data) with Playwright, save it optimised under assets/img/, and add it
   to the homepage hero with alt text saying it's a sample.
4. Update CLAUDE.md, README.md and docs/BRAND.md to describe the new structure, the Workbench and
   the copy rules.
5. Checks: python3 src/build.py --check, python3 scripts/check_links.py, node --check on touched
   JS, and screenshots at 1366px and 390px in light and dark mode.
```
