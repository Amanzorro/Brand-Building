# Nokhada · نوخذة

Brand and marketing site for **Nokhada**, a firm that deploys Claude Code inside UAE organisations for **climate services**: emissions inventories, UAE Climate Law, NRCC and CBAM reporting, and physical and transition climate-risk analysis.

It follows the Kith AI Lab model (Claude Code deployed inside the client, encoded with the client's own methodology, owned rather than rented), aimed at climate work in the UAE.

- `docs/RESEARCH.md`: a teardown of Kith AI Lab, notes on the UAE climate market and how each element maps across
- `docs/BRAND.md`: name, positioning, voice, logo, colour, type and go-to-market notes

## Site structure

Static HTML, CSS and JS with no build step. Host it anywhere (Cloudflare Pages, Netlify, GitHub Pages, S3).

```
index.html            Home (EN)
industry.html         Industry & exporters: GHG inventory, Climate Law/NRCC, CBAM, Scope 3
finance.html          Banks, insurers & investors: climate risk, financed emissions, transition plans
real-estate.html      Real estate & infrastructure: asset-level physical risk, energy/water/cooling
climate-rules.html    UAE climate rules at a glance (review regularly; dated "last reviewed")
security.html         Deployment models, data protection, controls
insights/             Essays: The Sieve, Heat is the risk, Own your methodology
ar/index.html         Arabic home page (RTL)
assets/css/style.css  Design tokens and all styles (light and dark)
assets/js/main.js     Mobile menu, scroll reveal, terminal animation, contact form
assets/img/           Logo mark, wordmark, favicon (SVG)
```

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Before going live
1. **Regulatory review:** have UAE counsel or a climate-regulation adviser check `climate-rules.html` against the current MOCCAE, NRCC, emirate-level and financial-regulator texts. Deadlines, thresholds and penalties change, so update the "last reviewed" date each time.
2. **Trademark and domain clearance** for "Nokhada" / "نوخذة" (see `docs/BRAND.md`).
3. **Contact email:** `hello@nokhada.ae` is a placeholder. Change it in `assets/js/main.js` (`CONTACT_EMAIL`) and in the footer of each page.
4. **Contact form:** it currently opens the visitor's mail client. Point it at a real form endpoint or CRM.
5. **Arabic copy:** get a native editor to review `ar/index.html`, then add Arabic versions of the inner pages.
6. **Credentials:** add a team section with climate and verification credentials, such as GHG Protocol experience, ISO 14064 expertise and sector backgrounds. Buyers in this market will look for them.
7. **Security pack:** `security.html` offers one. Prepare it before launch.
