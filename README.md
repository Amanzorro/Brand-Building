# Nokhada · نوخذة

Brand and marketing site for **Nokhada**, a firm that deploys Claude Code inside UAE investment firms. It's a UAE-focused rebuild of the Kith AI Lab ("Kith OS") model under a new brand.

- `docs/RESEARCH.md`: a teardown of Kith AI Lab, notes on the UAE market and how each element maps across
- `docs/BRAND.md`: name, positioning, voice, logo, colour, type and go-to-market notes

## Site structure

Static HTML, CSS and JS with no build step. Host it anywhere (Cloudflare Pages, Netlify, GitHub Pages, S3).

```
index.html               Home (EN)
private-capital.html     PE / VC / private credit / real estate
public-markets.html      Hedge funds / long-only
family-offices.html      Family offices, sovereign and GRE teams
security.html            Deployment models, data residency, UAE regulatory map
insights/                Essays: The Majlis Test, Arabic is alpha, Own don't rent
ar/index.html            Arabic home page (RTL)
assets/css/style.css     Design tokens and all styles (light and dark)
assets/js/main.js        Mobile menu, scroll reveal, terminal animation, contact form
assets/img/              Logo mark, wordmark, favicon (SVG)
```

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Before going live
1. **Trademark and domain clearance** for "Nokhada" / "نوخذة" (see `docs/BRAND.md`).
2. **Contact email:** `hello@nokhada.ae` is a placeholder. Change it in `assets/js/main.js` (`CONTACT_EMAIL`) and in the footer of each page.
3. **Contact form:** it currently opens the visitor's mail client. Point it at a real form endpoint or CRM.
4. **Arabic copy:** get a native financial-Arabic editor to review `ar/index.html`, then add Arabic versions of the inner pages.
5. **Legal review** of the security and regulatory claims on `security.html` by UAE counsel.
6. **Security pack:** `security.html` offers one (architecture diagrams, data-flow template, control matrix, DPIA outline). Prepare it before launch.
7. **Founder and team section:** add one once bios are ready. Kith's strongest credibility signal is its founder's investment background.
