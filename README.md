# BLZ Visual — site

One-page site for BLZ Visual (video production for social media, Cuiabá-MT).
Vanilla HTML/CSS/JS, no build step.

The page sells a single offer — one month of content, six reels, R$ 697 —
and every CTA opens WhatsApp. One interactive Three.js scene sits in the
hero, loaded only once a visitor engages with the page.

## Structure

```
index.html                     Single-page markup (pt-BR content)
css/styles.css                 Design system: palette, type, layout, animations
js/main.js                     Header state, scroll-reveal, sticky CTA, 3D gate
js/hero-scene.js               The hero scene; importing it is what loads Three.js
js/vendor/three.module.min.js  Three.js r160 ES module build (MIT), vendored
assets/fonts/                  Self-hosted Bricolage Grotesque, Hanken Grotesk, Space Mono
assets/img/whatsapp-qr.svg     Pre-rendered QR code (WhatsApp deep link)
assets/img/og-image.png        1200x630 share image
_headers                       Security headers (Netlify convention)
netlify.toml                   Build config + redundant header block
```

No bundler, no `npm install` required to run it — everything is a static file.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Serving over `file://` won't work — the
hero scene is an ES module, which requires an HTTP origin.

## Notable implementation choices

- **The 3D scene costs nothing until someone engages.** Three.js is 670 KB
  and its scene is by far the most expensive thing on the page. `js/main.js`
  ships no 3D at all; it dynamically imports `js/hero-scene.js` — which is
  what pulls Three.js in — on the first `pointermove`, `wheel`, `touchstart`
  or `keydown`. Plain `scroll` is deliberately not one of those signals,
  because programmatic scrolling is not a person. Until then (and forever,
  for anyone on `prefers-reduced-motion`, a two-core or 2 GB device, a saver
  connection, or without WebGL2) the inline SVG aperture poster in the hero
  is what shows. Rendering also pauses when the canvas leaves the viewport
  or the tab is hidden, and touch pointers are ignored so the scene never
  competes with a scroll.
- **The scene is lit by a generated environment map.** Metallic and clearcoat
  materials get nearly all their brightness from reflections, so without one
  they render as flat near-black shapes regardless of how many lights are
  added. A studio environment is painted into a canvas and prefiltered
  through `PMREMGenerator` at startup. Geometry is authored in code rather
  than loaded from a `.glb`: for shapes this simple that is smaller (no mesh
  payload, no loader) and sharper on the hard edges. The focus-ring knurling
  and dial ticks are `InstancedMesh`, so the detail is one draw call each.
- **Fonts are self-hosted** (Bricolage Grotesque, Hanken Grotesk, Space
  Mono — Latin subset woff2) instead of linked from `fonts.googleapis.com`.
- **The QR code is a pre-rendered static SVG** (`assets/img/whatsapp-qr.svg`,
  generated at build time from the same WhatsApp deep link used elsewhere
  on the page) rather than generated client-side by a CDN-hosted qrcode.js
  library. Same visual result, no runtime dependency, no external script.
- **No inline `style=""` attributes or inline `<script>`/`<style>`** — the
  reference file's one inline style became a CSS class
  (`.section-head--center`), and all styling/script lives in external
  files. This is what lets the CSP below run with no `unsafe-inline`.
- **Contact is a WhatsApp deep link + QR code**, not a form — so there's no
  server-side submission surface on this design (an earlier draft of this
  project shipped a hardened contact-form endpoint; it was removed since
  this design doesn't have a form. Ask if you want one added back).

## Security headers

Served as real HTTP headers via `_headers` (Netlify's static-header
convention) and mirrored in `netlify.toml`; the `<meta http-equiv>` CSP tag
in `index.html` is defense-in-depth for hosts that ignore `_headers`.

- `Content-Security-Policy: default-src 'self'` — no third-party script,
  style, font, or connect origins (Three.js and fonts are vendored), no
  `unsafe-inline`, `frame-ancestors 'none'` against clickjacking.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, a locked-down `Permissions-Policy`,
  `X-Frame-Options: DENY`, `Strict-Transport-Security` (HSTS,
  preload-ready), and `Cross-Origin-Opener-Policy` /
  `Cross-Origin-Resource-Policy: same-origin`.

## Deploying

Any static host works. `_headers` is Netlify-flavored; on another host,
port the header rules to that platform's equivalent (an nginx
`add_header` block, a `vercel.json` `headers` array, etc.).

## Content

The price, phone number and WhatsApp link are real business content, not
placeholders. The offer is defined in one place — the `#oferta` section of
`index.html` — and the WhatsApp deep links are written out in the markup
rather than assembled at runtime, so they still work with JavaScript off.
Changing the number means updating those `wa.me` hrefs and regenerating
`assets/img/whatsapp-qr.svg`.

## Accessibility and performance

Checked with axe-core at 375 / 768 / 1440 (zero violations) and Lighthouse
mobile (100 performance / 100 accessibility / 100 best practices / 100 SEO,
stable across three runs).

The brand terracotta `#B85C38` measures 3.99:1 on the cream, which clears
WCAG AA only at large sizes. It is reserved for display type, rules and
icons; `--rust-text` (`#9B4D2F`) backs small copy and filled buttons, and
`--rust-on-ink` is the lighter tint used on the dark bands. Keep new
terracotta text on those tokens rather than `--rust`.
