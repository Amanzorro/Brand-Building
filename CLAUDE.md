# CLAUDE.md — Nokhada site

Read this first. It applies to every agent and person working in this repository.

## What this is
The marketing site and browser-based demo tools for **Nokhada (نوخذة)**, a UAE firm that deploys Claude Code inside organisations for climate work: emissions inventories, UAE Climate Law, NRCC and EU CBAM reporting, and physical and transition climate risk. The background and positioning are in `docs/RESEARCH.md` and `docs/BRAND.md`. Read both before changing copy or design.

It's a static site: plain HTML, CSS and JS, with no framework and no npm dependencies. Vercel serves the repository root as-is.

## Layout
```
src/pages/*.html      Page bodies (the unique content of each English page). EDIT THESE.
src/build.py          Wraps each body in the shared header/nav/footer and writes the page.
*.html, try/          GENERATED. Don't hand-edit; run the build.
ar/index.html         Arabic home page (RTL). Hand-written, NOT generated. Edit directly.
assets/css/style.css  Design tokens + all site styles (light/dark, "Nacre" identity)
assets/css/tools.css  Styles for the two interactive tools
assets/js/main.js     Menu, scroll reveal, contact form, copy helper
assets/js/obligations.js  Obligations Checker: questions, rules (evaluate()), live map
assets/js/sieve-demo.js   Sieve demo: fictional evidence pack, calculations, checks, viewer
scripts/check_links.py    Broken-link checker
scripts/build_artifact.py Bundle for a claude.ai artifact preview (not needed for Vercel)
docs/                 Research, brand guide, review, prompts; docs/drafts/ holds unpublished essays
                      (all kept off the public site by .vercelignore)
```

## Everyday commands
```bash
python3 src/build.py            # rebuild generated pages after editing src/pages or src/build.py
python3 src/build.py --check    # CI runs this; fails if generated pages are stale
python3 scripts/check_links.py  # CI runs this
python3 -m http.server 8000     # preview at http://localhost:8000
```
- To add a page, create `src/pages/<name>.html`, add a row to `PAGES` in `src/build.py`, add it to `NAV` or the footer if it should be linked, then build.
- In a page body, `{P}` is the path prefix back to the site root. Use it for every internal link and asset.
- Changing the header, nav or footer means editing `src/build.py` (and `ar/index.html` by hand if the Arabic page needs it too).
- The homepage founder block is hidden until `SHOW_TEAM = True` and `TEAM` holds real details in `src/build.py`. Never invent people.
- Removed URLs are redirected in `vercel.json`. Add a redirect whenever you remove or rename a page.

## Design rules
- Use the tokens in `assets/css/style.css` (`--ink`, `--surface`, `--accent`, `--nacre`, etc.). Never hard-code colours in components.
- Dark "deep-water" bands use `.section-dark`, `.hero`, `.cta` or `.stage-dark`, which re-point the tokens to light-on-dark automatically.
- The nacre gradient appears only in the logo and the primary-button style (`.btn-nacre`). No gradient text, glows, orbs or gradient borders.
- Prefer lists, hairline rules and whitespace (`.rows`, `ol.numbered`, `ul.plain`) over bordered cards. Body text is 18px, max 65ch.
- Status colours (Applies, Likely, Check, Passes, Caught) are semantic. Keep them separate from the brand gradient.
- Both light and dark themes must work. So must phone width (~390px), with no horizontal scroll.
- Respect `prefers-reduced-motion`. Everything must be readable without JS animation.

## Content rules (important)
- **No unverified numbers.** Don't add statistics, hours saved, ROI or client results unless they're sourced and approved. Label illustrative examples as illustrative.
- **Regulation:** name the instrument and its date, and say "confirm with the authority". The checker's rules in `obligations.js` must stay consistent with `src/pages/climate-rules.html`. Nokhada does not give legal advice.
- **Demo data is fictional.** Ras Saffa Logistics is invented, and the emission factors in `sieve-demo.js` are placeholders. Keep the "illustrative" labels.
- **Never impersonate** real companies, regulators or utilities. Use generic labels such as "Utility provider (illustrative)".
- **Voice:** a careful verifier, not a marketer. Short, plain sentences, no greenwash words. See `docs/BRAND.md`.
- **Arabic** copy is written for Arabic readers. Flag any new Arabic for native review in the PR description.
- **Sources:** link only official pages you have actually opened and checked. Otherwise show `[source to confirm]` (class `tbc`) and list it in the PR.

### Copy rules (apply everywhere)
- No eyebrow labels above sections. No mono uppercase tags on cards.
- No "X, not Y", "rather than", "instead of" or "in place of" constructions.
- Don't group things in threes by habit. Use as many items as there really are.
- No metaphors or heritage storytelling. The only exception is the one line in the footer explaining the name.
- Headlines say literally what the section contains. Paragraphs are two sentences at most.
- Mention "diagnostic" at most once per page. Say "evidence" only where no plainer word works.
- No statistics, results or claims that can't be checked. Delete them; don't soften them.
- Word budgets: homepage ≤ 350 words, whole site ≤ 2,500 (text inside `<main>`).

## Working in parallel (several agents)
- **One task per branch, one PR per task.** Branch from `main`, keep PRs small and focused, and describe what changed and how you checked it.
- Before pushing: `python3 src/build.py && python3 src/build.py --check && python3 scripts/check_links.py`, and `node --check` any JS you touched.
- `assets/css/style.css`, `src/build.py` and `assets/js/obligations.js` are shared hot spots. If your task doesn't need them, don't touch them. If it does, say so in the PR title so others can rebase.
- Never commit generated pages without their source change, and never edit generated pages directly. The next build will overwrite them.
- Every PR gets a Vercel preview URL. Check your change there, in light and dark mode and at phone width.
- `main` is production. Merging to `main` deploys the public site.

## Open items (good tasks to pick up)
- Arabic versions of the inner pages (only the home page exists in Arabic)
- Real form endpoint for the contact form (it currently prepares a message for the visitor to copy)
- Cited, official emission factors to replace the demo placeholders, if the demo should show real figures
- Founder details for the hidden team block (names, roles, experience, LinkedIn, photos)
- Confirm the official source for every `[source to confirm]` on the climate rules page and in `SOURCES` in `obligations.js`
- Rewrite the Sieve demo page under the copy rules, or replace it with the Workbench (see docs/PROMPTS.md, if present)
- Trademark and domain clearance for "Nokhada"; replace the `hello@nokhada.ae` placeholder
