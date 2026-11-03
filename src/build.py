#!/usr/bin/env python3
"""Build the English pages of the Nokhada site.

Each page's unique content lives in src/pages/<name>.html. This script wraps it
in the shared header, navigation and footer and writes the finished page to the
path listed in PAGES below. The output files are committed, so the site needs no
build step to deploy.

Usage:
    python3 src/build.py           # rebuild every page
    python3 src/build.py --check   # exit 1 if any committed page is out of date

Inside a page fragment, write {P} wherever a link needs the path prefix back to
the site root ("" for root pages, "../" for pages one folder down).

ar/index.html (the Arabic home page) is written by hand and is not generated.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "pages"

FONTS = ("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700"
         "&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500"
         "&family=Readex+Pro:wght@300..600&display=swap")

HOME_HEAD = '''  <meta property="og:title" content="Nokhada">
  <meta property="og:description" content="Climate obligations, met from your own data. Deployed in your environment, bilingual by default, built for UAE climate rules.">
  <meta property="og:type" content="website">
  <link rel="alternate" hreflang="ar" href="ar/index.html">
'''

# (fragment, output path, nav item marked current, <title>, meta description, extra <head> lines)
PAGES = [
    ("home", "index.html", "index.html", "Nokhada",
     "Nokhada deploys Claude Code inside UAE organisations to build emissions inventories, Climate Law and CBAM reporting, and climate-risk analysis from their own evidence.", HOME_HEAD),
    ("industry", "industry.html", "industry.html", "Industry &amp; Exporters — Nokhada",
     "GHG inventories from raw evidence, UAE Climate Law and NRCC reporting packs, CBAM embedded emissions and supplier data for UAE industry and exporters.", ""),
    ("finance", "finance.html", "finance.html", "Banks &amp; Investors — Nokhada",
     "Climate-risk management, financed emissions, transition planning and disclosures for UAE banks, insurers and asset managers.", ""),
    ("real-estate", "real-estate.html", "real-estate.html", "Real Estate &amp; Infrastructure — Nokhada",
     "Asset-level physical climate risk, energy, water and cooling performance, and green-building documentation for UAE real estate and infrastructure.", ""),
    ("climate-rules", "climate-rules.html", "climate-rules.html", "UAE Climate Rules — Nokhada",
     "A plain-language map of UAE climate rules: the Federal Climate Law, the NRCC, financial-sector climate principles and the EU CBAM.", ""),
    ("security", "security.html", "security.html", "Security &amp; Data Residency — Nokhada",
     "How Nokhada deploys Claude Code inside UAE organisations: your infrastructure, documented data flows and UAE data-protection compliance.", ""),
    ("insights-index", "insights/index.html", "insights/index.html", "Insights — Nokhada",
     "Essays on method, physical risk and the operating model behind credible climate reporting in the Gulf.", ""),
    ("the-sieve", "insights/the-sieve.html", "insights/index.html", "The Sieve — Nokhada",
     "How we check every reported emissions figure against its evidence before a verifier sees it.", ""),
    ("heat-is-the-risk", "insights/heat-is-the-risk.html", "insights/index.html", "In the Gulf, heat is the balance-sheet risk — Nokhada",
     "Physical climate risk in the UAE is mostly about heat, cooling and water, punctuated by rare floods.", ""),
    ("own-your-methodology", "insights/own-your-methodology.html", "insights/index.html", "Own your methodology — Nokhada",
     "Why your emissions logic should live in your own repository rather than in a vendor's settings screen.", ""),
    ("try-index", "try/index.html", "try/index.html", "Try Nokhada",
     "Two browser-based tools from Nokhada, plus what to expect when you work with us.", ""),
    ("obligations-checker", "try/obligations-checker.html", "try/index.html", "Obligations Checker — Nokhada",
     "Find out which UAE climate rules apply to your organisation, what data each one needs and what a diagnostic would cover.", ""),
    ("sieve-demo", "try/sieve-demo.html", "try/index.html", "Sieve Demo — Nokhada",
     "Watch 44 bills and logs become a verifier-ready emissions inventory, and trace any number back to its source.", ""),
]

NAV = [
    ("industry.html", "Industry"),
    ("finance.html", "Finance"),
    ("real-estate.html", "Real Estate"),
    ("climate-rules.html", "Climate Rules"),
    ("insights/index.html", "Insights"),
    ("try/index.html", "Try it"),
]


def render(fragment, out, current, title, description, head_extra):
    depth = out.count("/")
    P = "../" * depth
    body = (SRC / f"{fragment}.html").read_text(encoding="utf-8").replace("{P}", P)
    links = "\n".join(
        f'      <a href="{P}{href}"{" aria-current=\"page\"" if href == current else ""}>{label}</a>'
        for href, label in NAV
    )
    return f'''<!doctype html>
<html lang="en" dir="ltr" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{description}">
{head_extra}  <link rel="icon" href="{P}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="{FONTS}" rel="stylesheet">
  <link rel="stylesheet" href="{P}assets/css/style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{P}index.html" aria-label="Nokhada home">
      <img src="{P}assets/img/logo-mark.svg" width="30" height="30" alt="">
      <span class="brand-word">Nokhada</span><span class="brand-ar" lang="ar">نوخذة</span>
    </a>
    <button class="menu-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="nav" id="site-nav" aria-label="Primary">
{links}
      <a class="lang" href="{P}ar/index.html" lang="ar" hreflang="ar">العربية</a>
      <a class="btn btn-primary" href="{P}index.html#contact">Book a diagnostic</a>
    </nav>
  </div>
</header>

<main id="main">
{body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="{P}index.html"><img src="{P}assets/img/logo-mark.svg" width="30" height="30" alt=""><span class="brand-word">Nokhada</span></a>
        <p class="small muted" style="margin-top:14px;max-width:34ch">Claude Code deployments for climate reporting and climate risk in the United Arab Emirates.</p>
      </div>
      <div>
        <h4>Who we serve</h4>
        <ul>
          <li><a href="{P}industry.html">Industry &amp; exporters</a></li>
          <li><a href="{P}finance.html">Banks &amp; investors</a></li>
          <li><a href="{P}real-estate.html">Real estate &amp; infrastructure</a></li>
        </ul>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="{P}climate-rules.html">UAE climate rules</a></li>
          <li><a href="{P}security.html">Security &amp; data residency</a></li>
          <li><a href="{P}insights/index.html">Insights</a></li>
          <li><a href="{P}ar/index.html" lang="ar">العربية</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:hello@nokhada.ae">hello@nokhada.ae</a></li>
          <li>Dubai · Abu Dhabi</li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <p>© <span data-year>2026</span> Nokhada. Nokhada is an independent firm and is not affiliated with or endorsed by Anthropic. Claude and Claude Code are trademarks of Anthropic, PBC. Nothing on this site is legal, regulatory or investment advice.</p>
      <p><a href="{P}security.html">Data protection</a></p>
    </div>
  </div>
</footer>

<script src="{P}assets/js/main.js" defer></script>
</body>
</html>
'''


def main():
    check = "--check" in sys.argv
    stale = []
    for page in PAGES:
        out = ROOT / page[1]
        html = render(*page)
        if check:
            if not out.exists() or out.read_text(encoding="utf-8") != html:
                stale.append(page[1])
        else:
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html, encoding="utf-8")
            print("wrote", page[1])
    if check:
        if stale:
            print("Out of date (run python3 src/build.py):", ", ".join(stale))
            sys.exit(1)
        print("All pages up to date.")


if __name__ == "__main__":
    main()
