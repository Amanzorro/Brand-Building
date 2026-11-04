# Own your methodology

_Draft. Not published. Needs a named author and a rewrite under the copy rules in CLAUDE.md before it goes back on the site._

*Why your emissions logic should live in your own repository rather than in a vendor's settings screen, and why verifiers will thank you.*

When climate reporting became mandatory, many organisations did the sensible-seeming thing and bought carbon-accounting software. Dashboards appeared, totals looked tidy and the first report went out.

The second year is when the questions start. Why did this site's emissions fall 18%? Which grid factor did we use last year? Who decided the leased warehouse was out of scope? The answers are spread across vendor settings, spreadsheet uploads and the memory of whoever ran the first cycle.

## The methodology is the asset

Strip away the interface and an emissions inventory is two things: evidence and methodology. The evidence (invoices, meter reads, fuel logs) belongs to you already. The methodology covers boundaries, emission factors, estimation rules, allocation choices and materiality judgements. It's the part that takes thought, and the part a verifier or regulator will interrogate.

When the methodology lives inside a vendor's product, you're renting your own reasoning. When you change vendor, it doesn't come with you.

## What owning looks like

A Nokhada deployment keeps the whole system in your own repository, in your own environment:

- **Methodology files** in plain, readable documents. Your sustainability lead, finance team and verifier can all read them and see when they changed.
- **Calculation code** that turns evidence into figures and can be rerun at any time, so last year's number can be reproduced exactly.
- **An evidence trail** linking every figure to its source documents and the methodology clause that applied.
- **Logs** of every run, every change and every approval.

Nothing important sits on our servers. If you stop working with us tomorrow, all of it keeps running.

## Why verifiers prefer it

A verifier's job is to form a view on whether your figures are fairly stated under your stated methodology. That's far easier when the methodology is an actual document, the calculations are reproducible and each figure links to its evidence. Findings fall and queries close faster.

## The economics

Carbon software is usually priced by site, entity or module, so costs grow as your footprint grows. An owned system costs a fixed fee to build, a retainer to extend and model usage at cost. Adding a site means adding evidence, not a licence.

> **Note:** **Not anti-software.** If you already use a carbon tool and it works for you, we can feed it, check it with the Sieve or read from it. What should belong to you is the methodology.

The two-week diagnostic shows what an owned system would look like for your organisation.
