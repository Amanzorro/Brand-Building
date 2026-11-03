# Research: Kith AI Lab teardown, and a UAE climate-services pivot

> **Pivot (November 2026):** the brand first mirrored Kith's focus on investment firms and now targets **climate services in the UAE**. Section 1 (the Kith teardown) still describes the operating model we follow. Sections 2–3 cover the UAE climate market and how the model maps onto it. The original investment-firm notes are in Section 5 for reference.

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

## 2. The UAE climate market: why there's demand now

**Mandatory obligations (economy-wide)**
- **Federal Climate Law:** Federal Decree-Law No. 11 of 2024 on the Reduction of Climate Change Effects. Issued August 2024, in force 30 May 2025. Public and private entities, in free zones as well as onshore, must measure and report their GHG emissions, keep records and take reduction measures. Secondary sources report fines of AED 50,000 to AED 2 million. Several advisers treated 30 May 2026 as the full-compliance date, and one source suggested an extension, so confirm with MOCCAE.
- **National Register for Carbon Credits (NRCC):** Cabinet Resolution No. 67 of 2024, run by MOCCAE. Larger emitters (secondary sources cite ≥0.5 Mt CO₂e) must register, and smaller entities can register voluntarily. Verifiers need MOCCAE approval.
- **Emirate-level systems:** Abu Dhabi has issued its own reporting system with thresholds, and other emirates and free zones may follow.

**Financial sector**
- UAE Sustainable Finance Working Group principles, applied by the CBUAE, CMA (formerly the SCA), DFSA and FSRA to licensed firms:
  - Climate-related financial risks (November 2023): board oversight, and physical and transition risk built into strategy and risk management
  - Sustainability-related disclosures (June 2024)
  - Climate transition planning (February 2026)
- **ISSB (IFRS S1/S2):** no confirmed UAE-wide mandate was found. The site describes our disclosure work as "aligned with the ISSB standards where you choose them".

**Cross-border**
- **EU CBAM:** the definitive period started on 1 January 2026, so EU importers of aluminium, iron and steel, cement, fertilisers and other covered goods now carry certificate liability. Aluminium dominates UAE exposure, which raises demand for installation-level embedded-emissions data from UAE producers.
- Supply-chain pressure: Scope 3 questionnaires from multinational customers, lenders and investors.

**Physical climate profile (why the methodology must be local)**
- Cooling makes up a large share of building energy use, and district cooling is common, which affects Scope 2 accounting.
- Water comes largely from energy-intensive desalination.
- Extreme heat affects workforce rules, equipment derating and infrastructure wear.
- Rare severe floods: in April 2024 the UAE recorded its heaviest rainfall since records began.

**Why Claude Code fits**
Climate evidence is document-heavy and bilingual: bills, invoices, logs, supplier replies and permits. The work also needs auditable, rerunnable calculations, a stated methodology and evidence traceable for verifiers. That suits an agent working in a code repository far better than a dashboard SaaS.

## 3. Mapping: Kith → Nokhada (climate)

| Kith AI Lab | Nokhada (UAE climate) | Why |
|---|---|---|
| "Claude Code for investment firms" | "Climate reporting and climate risk, built with Claude Code, for the UAE" | New regulatory demand, document-heavy work |
| Encoded IC frameworks and playbooks | Encoded **methodology files**: boundary, emission factors, estimation rules, materiality | The methodology is what verifiers interrogate |
| Connect to CRM, data rooms, PMS | Connect to ERP, utility and district-cooling invoices, fleet, BMS and meters, supplier inboxes, asset registers | The evidence lives there |
| PE page | **Industry & exporters** (GHG inventory, Climate Law/NRCC, CBAM, Scope 3) | Largest new compliance population |
| HF page | **Banks & investors** (climate-risk principles, financed emissions, transition plans, green finance) | Regulated, data-rich buyers. Keeps a bridge to the original finance audience |
| — | **Real estate & infrastructure** (asset-level physical risk, cooling and water) | The UAE's biggest physical exposure |
| — | **UAE climate rules** page | SEO and trust: one plain-language reference |
| The Hunting Party ("Holds / Cracked") | **The Sieve** ("Passes / Caught"): adversarial pre-verification | Same adversarial idea, aimed at the climate buyer's real pain (verifier findings) |
| "Replace $150–300K SaaS" | "Own your methodology" versus per-site carbon SaaS, with no unverified numbers | Credibility. Ownership matters more under audit |
| English only | Bilingual site and outputs, with Arabic evidence read natively | Much of the evidence is in Arabic |

## 4. Competitive landscape (to research further)
- Carbon-accounting SaaS, global and regional
- Big Four and boutique sustainability consultancies, typically project-based and spreadsheet-heavy
- Verification bodies, who are partners rather than competitors (we must stay independent of verification)
- Climate-risk data vendors (hazard layers), which are possible inputs to our workflows rather than rivals

## 5. Archive: original investment-firm brief

### 5a. UAE investment market (original brief)

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

### 5b. Mapping for investment firms (original brief)

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


## 6. Sources
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
- Ropes & Gray, preparing for UAE GHG reporting requirements: https://www.ropesgray.com/en/insights/alerts/2026/04/preparing-for-new-uae-ghg-emissions-reporting-and-reduction-requirements
- PwC, UAE Climate Change Law emissions reporting obligations: https://www.pwc.com/m1/en/services/tax/middle-east-tax-news-alerts/2025/uae-climate-change-law-mandatory-emissions-reporting-obligations.html
- Crowe, Navigating UAE's Federal Climate Law: https://www.crowe.com/ae/news/navigating-uaes-federal-climate-law
- The National, landmark UAE climate law: https://www.thenationalnews.com/news/uae/2025/06/02/landmark-uae-climate-law-aims-to-curb-emissions-and-boost-net-zero-ambitions
- Reed Smith, UAE carbon credit register: https://www.reedsmith.com/en/perspectives/2024/12/new-carbon-credit-law-register-reporting-verification-trading-regime
- CBUAE, Principles for the Effective Management of Climate-related Financial Risks: https://www.centralbank.ae/media/t3ipeg0u/uae-sustainable-finance-working-group-launches-the-uae-principles-for-the-effective-management-of-climate-related-financial-risks-en.pdf
- Pinsent Masons, CBUAE climate risk expectations: https://www.pinsentmasons.com/out-law/analysis/how-uae-financial-firms-can-meet-new-cbuae-climate-risk-expectations
- KPMG, ISSB adoption: https://kpmg.com/ae/en/insights/esg/adoption-of-the-issb-standards.html
- IISD, Navigating the EU CBAM: https://iisd.org/publications/guide/navigating-eu-carbon-border-adjustment-mechanism
- Ashurst, EU CBAM guide for importers and third-country producers: https://www.ashurstperkinscoie.com/en/insights/eu-cbam-a-guide-for-importers-and-third-country-producers/
