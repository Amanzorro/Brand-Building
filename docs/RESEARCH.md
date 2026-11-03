# Research: Kith AI Lab teardown, and how it maps to the UAE

_Compiled November 2026. Sources are listed at the end. Kith's own site (kithfinance.com) was not directly reachable from the build environment. The notes below come from search-indexed copies of its pages and third-party listings, so check them against the live site before relying on specifics._

## 1. What Kith AI Lab is

| | |
|---|---|
| **Company** | Kith AI Lab, London, founded 2025 (CB Insights) |
| **Product** | **Kith OS**, positioned as "Claude Code for Investment Firms" |
| **Customers** | Private equity and hedge fund managers |
| **Founder** | Diego Espinosa, CEO and co-founder, with 20+ years in institutional finance. The site says it is "run by an ex-$10B PM". |
| **Operating model** | Self-described as a "Claude Code-native" firm running three product lines with five people and no traditional SaaS stack (Luma event listing) |
| **Go-to-market** | Vertical landing pages (`/pe`, `/hf`), thought-leadership essays (`/insights`, `/insights-hf`) and live events ("Claude Code in PE", live-building an IC memo from simulated deal data) |

### Core proposition
1. **The model is not the edge; context is.** Every fund has the same models. Value comes from encoding the firm's own research frameworks, criteria and history.
2. **Connect Claude Code to the firm's data layer**: systems of record, shared drives, CRM, portfolio management, market data and compliance systems ("anything with an API").
3. **Replace SaaS spend with an owned architecture.** The PE page claims USD 150–300K of annual SaaS spend could be replaced by "a single architecture the firm owns".
4. **The system adapts to how the firm works over time.**

### Private equity page: workflows
- **Screening** a large batch of opportunities against the firm's own thesis in hours, rather than relying on vendor scoring
- **Portfolio monitoring**: pulls portfolio company data, flags variance from plan and drafts the update ("ops teams edit rather than assemble")
- **Memos / CIM evaluation**: claims a CIM evaluation went from 80 hours to 20 (vendor claim, unverified)

### Hedge fund page and "The Hunting Party" essay
- **Hunting party**: a directed adversarial search with a "kill mandate". It takes a consensus view, breaks it into load-bearing assumptions and attacks each one with specific evidence.
- **Binary verdicts**: "Holds" or "Cracked", with no "Inconclusive" option
- **Three-stage pipeline**: (1) automated high-volume signal generation → (2) PM interrogation of survivors → (3) models, trade maps and research notes
- **Encoded context**: frameworks, sector playbooks and past thesis outcomes stored as reference files the model reads before each task
- Unsourced claim that "71% of active fund managers' trades" … (we don't reuse it)

### What works about Kith's positioning
- A sharp, contrarian premise ("same models; edge is context") that a PM immediately recognises
- Concrete workflow language a deal team actually uses (CIM, IC memo, variance to plan)
- Named methods (the hunting party), which make the approach ownable and easy to discuss
- Ownership and economics framed against SaaS sprawl
- Founder credibility drawn from the investment industry itself

### Gaps we can exploit in the UAE
- **London/US-centric.** Nothing on Arabic, Islamic finance, Gulf regulators or UAE data residency.
- **Two segments only (PE, HF).** The UAE's distinctive pools of capital, namely sovereign wealth, GREs, family offices and real estate, are not addressed.
- **Thin compliance story** for a market where DFSA, FSRA, CMA, CBUAE and three separate data-protection regimes all apply.
- **Unverified numeric claims.** We deliberately avoid unsourced statistics, which reads as more credible to institutional buyers here.

## 2. The UAE market: why it needs its own version

**Pools of capital**
- Sovereign wealth funds and GREs (Abu Dhabi and Dubai): very large AUM, strict procurement, high sensitivity to data sovereignty
- A fast-growing population of single and multi-family offices, supported by dedicated DIFC and ADGM frameworks
- Global hedge funds and multi-managers opening in DIFC and ADGM
- Active PE, VC and private credit, plus a large real-estate investment market
- Domestic listings on ADX and DFM; regional coverage extends to Tadawul and other GCC venues

**Regulators and rules**
- **DIFC** → Dubai Financial Services Authority (DFSA); DIFC Data Protection Law No. 5 of 2020, plus regulations covering processing through autonomous and semi-autonomous systems
- **ADGM** → Financial Services Regulatory Authority (FSRA); ADGM Data Protection Regulations 2021
- **Onshore securities** → Capital Market Authority (CMA), which replaced the SCA from 1 January 2026 under Federal Decree-Law No. 32 of 2025
- **Banks** → Central Bank of the UAE (CBUAE)
- **Onshore personal data** → Federal Decree-Law No. 45 of 2021 (PDPL)

**Cultural and operating realities**
- Arabic is the official language. Many primary sources (exchange disclosures, registry, court and land records) are in Arabic, and some exist only in Arabic.
- Islamic finance is mainstream: Sharia screening (often AAOIFI-aligned), sukuk, and Sharia Supervisory Boards
- The working week runs Monday to Friday (with a Saturday–Sunday weekend since 2022)
- Relationship-led selling: the majlis tradition, introductions and discretion

## 3. Mapping: Kith → Nokhada

| Kith AI Lab | Nokhada (UAE) | Why |
|---|---|---|
| Kith OS (platform name) | No separate product name: "a Nokhada deployment" | Reinforces "you own it, it isn't a product you rent" |
| PE page | **Private Capital** page (PE, VC, private credit, **real estate**) | Real estate is a core UAE asset class |
| HF page | **Public Markets** page | Adds bilingual GCC earnings coverage and a pre-market brief timed to the Gulf day |
| — | **Family Offices & Sovereign** page (new) | The UAE's defining pools of capital |
| — | **Security & data residency** page (new) | A buying requirement here, not a footnote |
| The Hunting Party ("Holds / Cracked") | **The Majlis Test** ("Holds / Sinks") | Same proven idea, with an original method name and copy rooted in local culture |
| English only | **Bilingual site** (English + Arabic RTL) and bilingual outputs | Arabic is both the official language and a source of edge |
| — | **Sharia screening** workflow | Mainstream requirement for many UAE mandates |
| "Replace $150–300K SaaS" | "Own, don't rent" comparison with no unverified numbers | Credibility with institutional buyers |
| Talks / events | Recommended: majlis-style roundtables in DIFC and ADGM | Fits local relationship-led selling |

## 4. Sources
- CB Insights, Kith AI Lab company profile: https://www.cbinsights.com/company/kith-ai-lab
- Kith OS home: https://www.kithfinance.com/
- Kith OS, Private Equity: https://www.kithfinance.com/pe
- Kith OS, Hedge Funds: https://www.kithfinance.com/hf
- Kith OS, Insights: https://www.kithfinance.com/insights
- Kith OS, The Hunting Party: https://www.kithfinance.com/insights-hf
- Luma, "Claude Code in PE" event: https://luma.com/5kkskfgb
- Latham & Watkins, UAE capital markets regime updates: https://www.lw.com/en/insights/major-updates-recalibrate-the-uae-capital-markets-regime
- King & Spalding, the 2025 CMA decree-laws: https://www.kslaw.com/insights/articles/a-new-era-for-uae-federal-securities-regulation-the-2025-cma-decree-laws-february-2026
- Al Tamimi, UAE capital markets reset: https://www.tamimi.com/news/uae-capital-markets-reset-new-federal-laws-reshaping-the-regulatory-landscape/
