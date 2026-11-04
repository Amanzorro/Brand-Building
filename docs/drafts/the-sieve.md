# The Sieve

_Draft. Not published. Needs a named author and a rewrite under the copy rules in CLAUDE.md before it goes back on the site._

*Pearl merchants graded every pearl by passing it through a nest of sieves. We do the same with every reported emissions figure before a verifier sees it.*

In the pearling towns of the Gulf, a merchant's reputation rested on grading. Pearls were sorted by passing them through a stack of graded sieves, each with smaller holes than the one above. Whatever a pearl's owner claimed about it, the sieves settled the matter.

Emissions reporting needs the same discipline. Under the UAE Climate Law, a reported number isn't just a figure in a sustainability report. It's a regulatory submission that can be verified, questioned and penalised. Yet most inventories are still built so that they *look* complete, and nobody checks whether each figure can survive a hostile question.

## How verification actually fails

When verifiers raise findings, the cause is rarely fraud. It's usually something mundane:

- A total that doesn't match the sum of its source invoices, because a bill was keyed twice or skipped
- An estimate with no recorded basis, because whoever made it has left
- An emission factor from a different year, or a different grid, from the one the methodology names
- A boundary decision, such as which leased site is in or out, that was applied in one place and not another

Each one is small. Together they cost weeks of back-and-forth and some credibility.

## How the Sieve works

We run the Sieve as a Claude Code workflow inside the client's environment, after the inventory is calculated and before anything is submitted. It works in layers, like the merchant's nest of sieves.

1. **Trace.** Every reported figure is walked back to the source documents it came from. If a number can't be traced to a document, it's caught.
2. **Recompute.** The calculation is rerun from source with the methodology file's stated factors and rules. If the result differs from what's reported, it's caught.
3. **Consistency.** Boundaries, factors and estimation rules are checked across sites, months and entities. Any figure that applies a rule differently from its neighbours is caught.
4. **Plausibility.** Figures are compared with prior years, similar sites and physical reality, such as cooling load against floor area and climate. Implausible figures are caught for a person to explain.

> Every figure comes back **Passes** or **Caught**. Nothing is "probably fine".

A figure that's caught isn't necessarily wrong. It means a person needs to look at it before a verifier does. Sometimes the fix is a missing invoice. Sometimes it's a sentence in the methodology explaining an unusual site. Either way, the answer is now on file.

## The evidence index

The Sieve's by-product is often its most valuable output: an evidence index that maps every reported figure to its documents, calculation and methodology clause. Verifiers can sample from it directly. Queries that used to take days of searching shared drives are answered from one repository.

> **Note:** **People stay accountable.** The Sieve doesn't sign off an inventory. It gives the person who does a short, specific list of what to look at, and a record that they looked.

## Why it wasn't done before

Tracing every figure by hand takes so long that most teams sample a few and hope. Run as a workflow, the full Sieve takes minutes, so it can run every time the inventory changes rather than once in a panic before the deadline.

If you'd like to see it on a sample of your own data, that's what the diagnostic is for.
