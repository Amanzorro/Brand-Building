# Site review and next phase

_November 2026. Measured on the current build._

## Why it reads as AI-made

**1. Too much, said too many ways.**
- The homepage runs about 1,360 words across 10 sections, with 11 cards. The whole site is about 6,200 words.
- The same five ideas (from your data, traceable, Arabic, built for the UAE, you own it) recur on every page.
- "Evidence" appears 36 times, "diagnostic" 24, and "your own" 16.

**2. Template rhythm.** Every section follows the same pattern:
- a small mono uppercase label
- a large headline
- a one-line intro
- a grid of 3, 4 or 6 cards

There are 10 labels on the homepage alone. Readers recognise the pattern instantly.

**3. Rhetorical tics.** There are 14 "X, not Y" or "rather than" constructions:
- "Local by design, not by translation"
- "Own, don't rent"
- "A methodology you can show, in place of a dashboard you rent"

On top of that, things come in neat threes, headlines are clever rather than literal, and the essays lean on heritage metaphors (pearl merchants' sieves, the majlis).

**4. Trendy visual tropes.**
- A dark navy hero, iridescent gradient text and a slowly rotating glowing orb
- Glass cards and gradient borders on hover
- A fake terminal session as the hero image

This combination is the current default look of AI-startup sites.

**5. No people and no proof.** This is the biggest tell, and it's a content gap rather than a design one.
- No names, no team, no address and no client or partner.
- Essays are bylined "Nokhada".
- Every example is fictional or "illustrative".

A buyer of compliance services wants to know who is accountable.

**6. Demos are simulations.**
- The Sieve demo is a scripted replay on invented data.
- It shows the idea well, but it can't take a real document, so it can't prove capability.

## What to change

**Cut hard (target: homepage ≤ 350 words, whole site ≤ 2,500).**
- **Homepage, in this order:**
  1. A literal headline and one sentence
  2. What we do: three plain lines
  3. How an engagement works: one short list
  4. A link to try the real tool
  5. Who we are
  6. Contact
- **Sector pages:** merge Industry, Finance and Real Estate into one Services page.
- **Remove:** the comparison table, the "premise" section and the four-point "Built for the Emirates" block.
- **Insights:** take the essays off the site until a named person writes them.

**Write plainly.**
- No section labels.
- No "X, not Y" constructions.
- No metaphors except one line explaining the name.
- Paragraphs of two sentences or fewer.
- Every claim is either checkable or deleted.

**Calm the design.**
- **Drop:** the orb, the glow blobs, the gradient headline text and the card-everything layout.
- **Keep:** the palette and the two typefaces, with one accent colour.
- **Layout:** use lists, rules and whitespace instead of boxes.

**Add people.** A founder section with real names, roles, relevant experience and a LinkedIn link. Until then, show clearly marked placeholders. Never invent people.

**Show real output.** Replace the fake terminal with a screenshot of the real tool (below) running on a real document.

**Keep what's useful.**
- **Climate rules page:** the most valuable page on the site. Add an official source link for each rule and a "reviewed by [name], [date]" line.
- **Obligations Checker:** keep it, with the copy trimmed and each rule linked to its source.

## The software: Nokhada Workbench

The real version of the Sieve. You upload real documents, AI reads them, ordinary code does the maths, and every number links back to the page it came from.

**Flow**
1. **Upload:** a few utility bills, district-cooling invoices, fuel-card exports, delivery notes or refrigerant logs. PDF, image or CSV, in Arabic or English.
2. **Extract:** Claude reads each document and returns structured fields: period, quantity, unit, account or meter, invoice number and site. Each field comes with the page and exact text it came from.
3. **Review:** an editable table. People confirm or correct the values, and every edit is logged.
4. **Calculate:** a deterministic engine (plain code, no AI) applies emission factors from a versioned library. Each factor names its publisher, year and URL.
5. **Check (the Sieve):** rule-based checks for duplicates, gaps, out-of-period items, unit problems, outliers and missing factors. An optional AI review pass is clearly labelled as suggestions and never changes a number.
6. **Output:** an inventory by scope and source, an evidence index, a review queue, and an executive summary in English and Arabic. The summary's numbers are inserted from the engine and checked, never written by the model. Exports as CSV and JSON.

**Principles**
- The model never does arithmetic.
- An extracted value without a verifiable citation is flagged, not used silently.
- Nothing is stored on the server. Documents are processed and the results stay in the visitor's browser.
- A passcode keeps random visitors from using up the API budget.

**Real data for demos**
- **Your own documents:** bring real bills to a meeting and run them live. This is the strongest demo.
- **Real factors:** use published, openly available factors, each cited. Where no official public UAE factor can be found (for example a grid or district-cooling factor), the tool asks for one and labels it "user-supplied". It never invents a default.
- **Sample pack:** clearly labelled synthetic documents for when you can't use real ones.
- **Stretch goal:** read a public sustainability report from a listed company and check its own numbers for internal consistency. Keep this private, and frame the output as questions, not findings.

**What you need to provide**
- An Anthropic API key
- A Vercel project for the app
- A demo passcode
- Three to ten of your own real documents, kept out of the repo
- Sign-off on the factor sources
- Founder details for the site

## How to run it
`docs/PROMPTS.md` has three self-contained prompts.
- **Prompts A and B can run in parallel:** A rewrites the site in the existing files, and B builds the Workbench in a new `workbench/` folder.
- **Prompt C runs after both:** it links them together and swaps in real screenshots.
