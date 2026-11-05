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
     "Nokhada sets up Claude Code inside UAE organisations to produce emissions inventories, Climate Law, NRCC and CBAM reporting, and climate-risk analysis from their own records.", HOME_HEAD),
    ("services", "services.html", "services.html", "Services — Nokhada",
     "Emissions inventories, UAE Climate Law, NRCC and CBAM reporting, and climate-risk work for industry, financial institutions and real estate in the UAE.", ""),
    ("climate-rules", "climate-rules.html", "climate-rules.html", "UAE Climate Rules — Nokhada",
     "A plain-language list of UAE climate rules: the Federal Climate Law, the NRCC, financial-sector climate principles and the EU CBAM.", ""),
    ("security", "security.html", "security.html", "Security — Nokhada",
     "Where Nokhada deployments run, what we store, and the UAE data-protection rules we design around.", ""),
    ("try-index", "try/index.html", "try/index.html", "Try Nokhada",
     "Two browser-based tools, and what working with Nokhada involves.", ""),
    ("obligations-checker", "try/obligations-checker.html", "try/index.html", "Obligations Checker — Nokhada",
     "Find out which UAE climate rules apply to your organisation and what data each one needs.", ""),
    ("workbench", "try/workbench.html", "try/index.html", "Workbench — Nokhada",
     "Turn utility bills, district-cooling invoices, fuel records and refrigerant logs into a Scope 1 and 2 inventory in your browser, with every figure linked to its source row.", ""),
]

NAV = [
    ("services.html", "Services"),
    ("climate-rules.html", "Climate rules"),
    ("try/index.html", "Try it"),
]

# Founder block on the homepage. Keep SHOW_TEAM = False until real details are supplied.
# Never invent people. Each entry: name, role, experience (one sentence), linkedin URL, photo path.
SHOW_TEAM = False
TEAM = []


def team_html():
    if not SHOW_TEAM:
        return ""
    if not TEAM:
        raise SystemExit("SHOW_TEAM is True but TEAM is empty. Add real founder details first.")
    people = "\n".join(
        f'''      <li class="person">
        <img src="{{P}}{m["photo"]}" width="96" height="96" alt="{m["name"]}">
        <div><h3>{m["name"]}</h3><p class="muted">{m["role"]}</p><p>{m["experience"]}</p>
        <p><a href="{m["linkedin"]}">LinkedIn</a></p></div>
      </li>''' for m in TEAM)
    return f'''  <section id="team">
    <div class="wrap">
      <h2>Who we are</h2>
      <ul class="people">
{people}
      </ul>
    </div>
  </section>
'''


def render(fragment, out, current, title, description, head_extra):
    depth = out.count("/")
    P = "../" * depth
    body = (SRC / f"{fragment}.html").read_text(encoding="utf-8").replace("<!--TEAM-->", team_html()).replace("{P}", P)
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
      <a class="btn btn-primary" href="{P}index.html#contact">Book a call</a>
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
        <p class="small muted" style="margin-top:14px;max-width:34ch">Climate reporting and climate risk for UAE organisations. A nokhada was the captain of a pearling dhow.</p>
      </div>
      <div>
        <h4>Site</h4>
        <ul>
          <li><a href="{P}services.html">Services</a></li>
          <li><a href="{P}climate-rules.html">Climate rules</a></li>
          <li><a href="{P}try/index.html">Try it</a></li>
          <li><a href="{P}security.html">Security</a></li>
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
      <p>© <span data-year>2026</span> Nokhada. Independent firm, not affiliated with or endorsed by Anthropic. Claude and Claude Code are trademarks of Anthropic, PBC. Nothing on this site is legal, regulatory or investment advice.</p>
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
