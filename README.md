# BLZ Visual — site

One-page site for BLZ Visual (video production for social media, Cuiabá-MT).
Vanilla HTML/CSS/JS, no build step. Three interactive Three.js scenes (a
lens in the hero, a drone in the showcase section, ambient shapes behind
the contact section) driven by scroll position and cursor movement. Design
and copy follow the approved reference file (`blzvisual.html`) exactly;
this repo restructures it into separate files and hardens it for static
hosting.

## Structure

```
index.html                  Single-page markup (pt-BR content)
css/styles.css               Design system: palette, type, layout, animations
js/vendor/three.module.min.js  Three.js r160 ES module build (MIT), vendored
js/vendor/three-global.js    Bridges the module build to a global `THREE`
js/main.js                   Header scroll state, scroll-reveal, 3 Three.js scenes
assets/fonts/                 Self-hosted Bricolage Grotesque, Hanken Grotesk, Space Mono
assets/img/whatsapp-qr.svg    Pre-rendered QR code (WhatsApp deep link)
_headers                      Security headers (Netlify convention)
netlify.toml                  Build config + redundant header block
```

No bundler, no `npm install` required to run it — everything is a static file.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Serving over `file://` won't work (the
Three.js bridge is loaded as an ES module, which requires an HTTP origin).

## Notable implementation choices

- **Three.js is vendored, not CDN-loaded.** The reference file used
  `cdnjs.cloudflare.com` with the classic (deprecated since r150) global
  build. Instead, `js/vendor/three.module.min.js` is the current ES module
  build, and `js/vendor/three-global.js` is a one-line bridge
  (`import * as THREE; window.THREE = THREE`) that exposes the same
  `THREE.Xxx` API the ported scripts expect — so `js/main.js` is otherwise
  an unmodified port of the reference script's three scene IIFEs (lens,
  drone, ambient shapes), each scroll/pointer-driven and lerped for smooth
  motion, pausing via `IntersectionObserver`/`visibilitychange` when
  off-screen or the tab is hidden, and reading
  `prefers-reduced-motion` to drop the idle animation.
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

Pricing, phone number, and WhatsApp link come from the approved reference
file and are treated as real business content, not placeholders. Portfolio
tags/thumbnails in the "O que a gente produz" section are still
illustrative gradients — swap them for real project thumbnails when
available.
