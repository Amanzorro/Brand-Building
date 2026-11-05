# Nokhada · نوخذة

Brand and marketing site for **Nokhada**, a firm that deploys Claude Code inside UAE organisations for **climate services**: emissions inventories, UAE Climate Law, NRCC and CBAM reporting, and physical and transition climate-risk analysis.

It follows the Kith AI Lab model (Claude Code deployed inside the client, encoded with the client's own methodology, owned rather than rented), aimed at climate work in the UAE.

- `docs/RESEARCH.md`: a teardown of Kith AI Lab, notes on the UAE climate market and how each element maps across
- `docs/BRAND.md`: name, positioning, voice, logo, colour, type and go-to-market notes

## How it's built

Static HTML, CSS and JS with no framework and no npm. The English pages are generated from `src/pages/*.html` by `src/build.py`, and the output is committed, so hosting needs no build step. The Arabic home page (`ar/index.html`) is hand-written.

```
src/pages/            Page bodies — edit these
src/build.py          Shared header/nav/footer + page list; writes the pages below
index.html …          Generated English pages (root and try/)
ar/index.html         Arabic home page (RTL, hand-written)
assets/css/           style.css (tokens, light/dark) · tools.css (checker, shared tables) · workbench.css
assets/js/            main.js · obligations.js (checker) · workbench/ (Workbench ES modules + factors.json)
assets/img/           Logo mark, wordmark, favicon (SVG) · workbench-results.webp/.jpg (hero, synthetic data)
assets/downloads/     Workbench CSV template
tests/workbench/      Workbench unit and end-to-end tests (node --test)
scripts/              check_links.py · build_artifact.py · hero_screenshot.mjs
docs/                 RESEARCH.md · BRAND.md · drafts/ (not published)
CLAUDE.md             Working rules for Claude agents and contributors
vercel.json           Vercel headers; .vercelignore keeps docs/src/scripts off the site
```

```bash
python3 src/build.py             # rebuild after editing src/pages or src/build.py
python3 scripts/check_links.py   # broken-link check
node --test tests/workbench/*.test.mjs   # Workbench tests (Node 22)
python3 -m http.server 8000      # preview at http://localhost:8000
```

CI (`.github/workflows/site-check.yml`) runs the build check, the link check, a JS syntax check and the Workbench tests on every pull request.

## Deploying on Vercel
1. Merge the site into `main`. Vercel deploys `main` as production.
2. In Vercel: **Add New → Project → Import** `amanzorro/brand-building`. Grant the Vercel GitHub app access to the repo if asked.
3. Framework preset: **Other**. Leave the build command and output directory empty, then deploy.
4. Every pull request then gets its own preview URL, and every merge to `main` updates the live site at `<project>.vercel.app`. Add a custom domain such as `nokhada.ae` under **Settings → Domains** when you have one.

## Before going live
1. **Regulatory review:** have UAE counsel or a climate-regulation adviser check `climate-rules.html` against the current MOCCAE, NRCC, emirate-level and financial-regulator texts. Deadlines, thresholds and penalties change, so update the "last reviewed" date each time.
2. **Trademark and domain clearance** for "Nokhada" / "نوخذة" (see `docs/BRAND.md`).
3. **Contact email:** `hello@nokhada.ae` is a placeholder. Change it in `assets/js/main.js` (`CONTACT_EMAIL`) and in the footer of each page.
4. **Contact form:** it currently prepares the message for the visitor to copy and send from their own email. Point it at a real form endpoint or CRM.
5. **Arabic copy:** get a native editor to review `ar/index.html`, then add Arabic versions of the inner pages.
6. **Credentials:** add a team section with climate and verification credentials, such as GHG Protocol experience, ISO 14064 expertise and sector backgrounds. Buyers in this market will look for them.

## The tools

**Obligations Checker** (`try/obligations-checker.html`): eight questions, one card at a time, with visual answers: a clickable hex map of the emirates with DIFC and ADGM pins, icon tiles, an emissions slider with the large-emitter marker, and a data-maturity ladder. Keyboard shortcuts: 1–9 to choose, Enter for next. A live "obligations map" moves each rule between rings (Applies, Likely, Check, Not indicated) as you answer. Below it are plain-language details, a data checklist, a readiness gauge and a tailored week 1 and week 2 diagnostic plan. The rules are in `evaluate()` in `assets/js/obligations.js`. Keep them in step with `climate-rules.html`.

**Workbench** (`try/workbench.html`) turns activity data from electricity bills, district-cooling invoices, fuel records and refrigerant logs into a Scope 1 and 2 inventory. Every figure links to its rows, their source document or CSV line, and the factor used. It runs entirely in the browser with no AI and no network calls. The page has four steps:
- **Choose data:** load the demo pack, upload a CSV in the template's format, or type rows by hand.
- **Review:** edit, exclude and confirm rows. Every change is logged with the old value, the new value and a reason.
- **Factors:** each factor shows its status (cited, placeholder or user-supplied) and its source.
- **Results:** totals by scope, source and site; the Sieve's findings and decisions; an evidence index; English and Arabic summaries; CSV and JSON export.

The demo pack is a fictional company, Ras Saffa Logistics: 44 synthetic documents, 18 in Arabic, with planted problems. They are a duplicate invoice, an out-of-period delivery note, missing cooling months, an implausible July invoice that waits for the user's decision, and an ambiguous unit. Fuel and refrigerant factors are cited from the UK government's 2025 GHG conversion factors (AR5 GWPs). UAE grid electricity and district cooling have no default: the demo uses labelled placeholders, and the user supplies a sourced value for their own data. The old Sieve demo URL redirects here.

## claude.ai preview
A private preview is also published as a claude.ai artifact. `python3 scripts/build_artifact.py` produces the bundle for republishing it.
