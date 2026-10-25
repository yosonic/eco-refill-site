# eco-refill.co.uk — static site

Plain HTML, one stylesheet, one tiny script. No build step. Everything in this folder is the site.

```
index.html          Home
shop.html           What's on the shelf
how-it-works.html   How refilling works + FAQ
our-story.html      Our story (two paragraphs still marked [LIKE THIS] for you to write)
styles.css          All styling; colours and type are CSS variables at the top, matching the EcoRefill Brand System
site.js             Mobile menu toggle
assets/             logo.svg (colour), logo-white.svg, hero-jars.jpg, artwork-full.jpg
_headers            Cache rules for Cloudflare Pages
```

## Edit the opening hours

They appear in four places: the hours pill in every header ("Open Wed · Fri · Sat"), the band on `index.html#hours`, the callout at the bottom of `our-story.html`, and the `openingHoursSpecification` JSON at the top of `index.html` (what Google reads). Change all four.

## Deploy to Cloudflare Pages (free)

1. Sign in at dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Name the project `eco-refill`, drag this whole folder in, deploy. You get a `*.pages.dev` URL straight away.
3. **Custom domain**: in the project → Custom domains → add `www.eco-refill.co.uk` and `eco-refill.co.uk`. Cloudflare will ask you to move the domain's nameservers to Cloudflare (at your registrar); once that's done it sets the DNS records and HTTPS itself.
4. Updates: upload the folder again, or connect a Git repo so a push deploys automatically.

GitHub Pages or Netlify work the same way if you'd rather. Nothing here depends on Cloudflare.

## Preview locally

Any static server works. On a Mac: `cd` into the folder and run `python3 -m http.server 8000`, then open http://localhost:8000.
