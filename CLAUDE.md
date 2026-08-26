# BLZ Visual — design system rules

One-page site for BLZ Visual (video for social media, Cuiabá-MT). Read this
before importing anything from Figma or touching the styling.

**Read the mismatch first.** This repo has no React, no token pipeline, no
component library, no Storybook, no bundler and no `package.json`. A Figma MCP
import that assumes any of those will produce code this project cannot run.
Sections below say plainly where the usual answer is "does not exist here" —
that is the finding, not a gap to fill.

---

## 1. Token definitions

**Where:** one place, `css/styles.css`, in a single `:root` block at the top.
There is no `tokens.json`, no Style Dictionary, no Tailwind config, and no
transformation step. What is in that block is what ships.

```css
:root{
  --tinta:#1C1917;          /* ink — body text, dark bands            */
  --rust:#B85C38;           /* brand terracotta — DISPLAY/DECOR ONLY  */
  --rust-text:#9B4D2F;      /* terracotta for small text + button fills */
  --rust-deep:#8C4529;      /* hover / press                          */
  --rust-on-ink:#D96D42;    /* terracotta legible on the dark bands   */
  --areia:#F7EFE6;          /* cream — page ground                    */
  --areia-warm:#EFE3D4;     /* warm cream — banded sections           */
  --carvao:#4A403A;         /* muted body text                        */
  --line:rgba(28,25,23,.14);

  --display:'Bricolage Grotesque', sans-serif;
  --body:'Hanken Grotesk', sans-serif;
  --mono:'Space Mono', monospace;

  --pad:clamp(1.25rem, 5vw, 6rem);   /* the only horizontal rhythm */

  --r-organic:1.4rem 1.55rem 1.3rem 1.6rem;
  --r-organic-lg:2rem 2.2rem 1.9rem 2.3rem;
  --r-pill:999px;
}
```

### The one rule that must not be broken

Figma will hand you a single terracotta swatch. **The code needs three, and
picking the wrong one silently fails WCAG AA.**

| Token | On cream `#F7EFE6` | Use for |
|---|---|---|
| `--rust` `#B85C38` | **3.99:1** | display type ≥24px, rules, icon strokes, decoration |
| `--rust-text` `#9B4D2F` | **5.28:1** | any text below 24px, and filled button backgrounds |
| `--rust-on-ink` `#D96D42` | 5.18:1 on ink | terracotta sitting on the dark bands |

`--rust` on body-size text is a **failure**, not a preference. It was measured
and fixed once already; do not reintroduce it. If a Figma layer says `#B85C38`
on 16px text, translate it to `--rust-text`.

### Radius

Two families only. The irregular corners are deliberate — they echo the
hand-drawn mark and are the opposite of a default `rounded-lg` everywhere.
Never introduce a third: map any Figma corner value onto `--r-organic`,
`--r-organic-lg` or `--r-pill`.

### Type scale

Everything fluid, no breakpoint jumps. Display always carries negative
tracking.

```css
h1,h2,h3{font-family:var(--display);line-height:1.02;letter-spacing:-.02em}
.hero h1        { font-size: clamp(2.9rem, 7vw, 5.6rem); font-weight:800 }
.section-head h2{ font-size: clamp(2rem, 4.4vw, 3.4rem) }
.offer-price .amt{ font-size: clamp(5rem, 15vw, 9.5rem); letter-spacing:-.055em }
```

---

## 2. Component library

**Does not exist as code.** There are no JS components and no props. A
"component" here is a CSS class block in `css/styles.css` plus its markup in
`index.html`. Both files are hand-written and flat.

Naming is plain BEM-ish, no framework convention:

```
.offer-card / .offer-title / .offer-price / .offer-list / .offer-terms
.tt-stage   / .tt-copy     / .tt-label    / .tt-progress
.foot-top   / .foot-col    / .foot-label  / .foot-wordmark
```

Each visual block is delimited by a banner comment, and that is the closest
thing to a component index:

```css
/* ---------- SINGLE OFFER ---------- */
/* ---------- TURNTABLE (pinned 360) ---------- */
/* ---------- FOOTER ---------- */
```

**When importing a Figma component:** add one banner-commented block to
`css/styles.css` and one markup block to `index.html`. Do not introduce a
component framework to host it.

No Storybook. No documentation site. This file is the documentation.

---

## 3. Frameworks & libraries

| Concern | Reality |
|---|---|
| UI framework | none — hand-written HTML |
| Styling | one hand-written stylesheet, plain CSS + custom properties |
| Build system | **none.** No `package.json`, no bundler, no transpile |
| Bundler | none — files are served exactly as they sit on disk |
| Animation lib | none — CSS transitions + `IntersectionObserver` |
| 3D | Three.js r160, **vendored** at `js/vendor/three.module.min.js` |

Three.js is the only third-party dependency and it is committed to the repo,
not installed. It is byte-identical to the official `three@0.160.0` build.

Run it with any static server; there is nothing to build:

```bash
python3 -m http.server 8000
```

That command serves the whole working tree including `.git`, so keep it on
localhost. `.vercelignore` keeps `.git` and the docs out of the deployment.

---

## 4. Asset management

```
assets/fonts/   4 self-hosted woff2 (2 variable, 2 static)   ~82 KB total
assets/img/     og-image.png (1200×630), whatsapp-qr.svg
js/vendor/      three.module.min.js                           670 KB
```

- **No CDN.** The Content-Security-Policy is `default-src 'self'` with no
  external origins. Fonts, scripts and images must be same-origin. A Figma
  export that links Google Fonts or a CDN **will be blocked at runtime.**
- **No image pipeline**, no `next/image`, no responsive `srcset`. Assets are
  referenced by plain relative path.
- Caching is set per-path in `vercel.json` (and mirrored in `_headers` for
  Netlify): fonts, images and `js/vendor/` are immutable for a year; HTML
  revalidates every time.
- The site currently has **no photography**. That is a known gap, not an
  oversight — see §8.

---

## 5. Icon system

No icon library, no sprite pipeline, no `lucide`. Icons are **inline SVG
written directly in `index.html`**, drawn on a 24×24 viewBox, stroked with
`currentColor` and sized by CSS:

```html
<svg viewBox="0 0 24 24"><path d="M4 8h10v8H4z"/><path d="M14 11l6-3v8l-6-3"/></svg>
```

```css
.diff .di svg{width:24px;height:24px;stroke:var(--rust);fill:none;stroke-width:1.7}
```

The only shared symbol is the brand mark, defined once in a hidden
`<svg class="sprite-defs">` and referenced with `<use href="#blz-logo">`.

There is no naming convention because there are no icon files. **Emoji are
never used as icons.**

---

## 6. Styling approach

- **Methodology:** none of the usual ones. Single global stylesheet, flat
  class selectors, no CSS Modules, no CSS-in-JS, no utility framework.
- **Specificity stays low** — mostly single class selectors. Keep it that way.
- **Responsive:** mobile-safe fluid type via `clamp()` everywhere, plus three
  breakpoints, all `max-width` (desktop-first overrides):

  ```css
  @media(max-width:1000px){ /* two-column grids collapse   */ }
  @media(max-width:820px) { /* hero stacks, sticky CTA on  */ }
  @media(max-width:560px) { /* single column               */ }
  ```

- `body { overflow-x: hidden }` is load-bearing — the page contains rotated
  elements (the offer seal at -13°, the smile at -2.5°).

### Inline styles are forbidden

CSP is `style-src 'self'` with no `unsafe-inline`. A `style=""` attribute or a
`<style>` block **will not apply**. Figma exports lean heavily on inline
styles — every one must be moved to a class. (Setting `el.style.foo` from JS is
fine; CSP does not govern the CSSOM.)

### Motion contract

| Context | Duration | Easing |
|---|---|---|
| Hover / press | 150–250ms | default or `cubic-bezier(.22,.61,.36,1)` |
| Scroll reveal | 750ms | `cubic-bezier(.22,.61,.36,1)` |

- Reveals fire **once** (`io.unobserve` after intersecting).
- Animate `transform` and `opacity` only.
- Never use a bare `transition: <time>` shorthand — it means `all` and sweeps
  the focus outline in from zero width, which makes focus feel broken. Name the
  properties.
- Every animation has a `prefers-reduced-motion` branch. The pinned turntable
  section collapses to its natural height there, since three viewports of
  travel with nothing moving is dead scrolling.

---

## 7. Project structure

```
index.html              all markup, one page, anchor navigation
css/styles.css          tokens + every rule, banner-commented by block
js/main.js              header state, reveals, sticky CTA, count-up,
                        stroke-draw, and the gate that loads the 3D
js/scene-kit.js         shared 3D: geometry helpers, materials, environment,
                        and the gear objects
js/hero-scene.js        hero scene — phone on gimbal + macro lens
js/showcase-scene.js    pinned turntable scene
js/vendor/              vendored Three.js
assets/fonts, assets/img
vercel.json             headers + caching (Vercel reads this)
_headers, netlify.toml  the same policy for Netlify
.vercelignore           keeps .git and docs out of the deployment
```

Content is **not** separated from markup — copy lives inline in `index.html`.
For a one-page site with no CMS this is deliberate.

### The 3D subsystem

`js/main.js` never imports Three.js. It dynamically imports a scene module,
which is what pulls the library in:

```js
// only after the first pointermove / wheel / touchstart / keydown
import('./hero-scene.js').then(m => { m.initHeroScene(canvas); });
```

Plain `scroll` is deliberately **not** an intent signal — programmatic
scrolling is not a person. Nothing loads for a visitor on reduced motion, a
two-core or 2 GB device, a saver connection, or without WebGL2; they keep the
inline SVG aperture poster.

Two invariants that were bugs once and must not come back:

1. **Camera near plane is `2`, not `0.1`.** At 0.1 against a far plane of 100
   nearly the whole depth buffer covers space nothing occupies, and close
   surfaces flicker on phones.
2. **`roundedBox` clamps its bevel radius to the depth.** Without the clamp a
   thin part silently came out `2r` deep instead of `d`, so two parts of
   different thicknesses ended up exactly coplanar and fought for the same
   depth.

---

## 8. Content rules specific to this client

These are not style preferences. They were corrected once after shipping
claims that were not true.

- **Only model and name gear BLZ actually owns:** phone, three-axis gimbal,
  clip-on macro lens, lavalier mic. No professional camera body, no
  clapperboard, no LED panel, no shotgun mic, no drone. `js/scene-kit.js`
  exports exactly the real kit.
- **No stock photography standing in for their work.** A video producer
  showing someone else's footage is the same lie as claiming gear. The site
  ships with no photography until real frames exist.
- Known placeholders still in the markup, both flagged with `TODO` comments:
  the Instagram and YouTube links point at the platforms rather than BLZ
  profiles, and `og:image` needs an absolute URL once a domain exists.

---

## 9. Definition of done

Every change is verified, not eyeballed. Current baseline:

| Check | Baseline |
|---|---|
| Lighthouse mobile | 99–100 performance / 100 a11y / 100 best-practices / 100 SEO |
| axe-core @ 375/768/1440 | 0 violations |
| CLS | 0 |
| Horizontal overflow | none at any breakpoint |

Before calling a change done: render it in a real browser at 375, 768 and
1440; run axe; confirm reduced-motion still downloads no Three.js; confirm no
CSP violation appears in the console.
