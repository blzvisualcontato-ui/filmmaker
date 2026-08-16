# BLZ Visual — portfolio

A one-page, no-build portfolio site for a solo filmmaker. Vanilla HTML/CSS/JS,
a self-hosted Three.js scene reacting to scroll and cursor position, and a
static-hosting-friendly security layer (headers + an optional serverless
contact endpoint).

## Structure

```
index.html                    Single-page markup (pt-BR content)
css/styles.css                Design system: palette, type, layout, animations
js/main.js                    Nav, scroll-reveal, counters, custom cursor, contact form
js/three-scene.js             The 3D "aperture rig" — scroll/mouse-driven scene
js/vendor/three.module.min.js Three.js r160, vendored locally (MIT)
assets/fonts/                 Self-hosted Fraunces + Public Sans (woff2, Latin subset)
_headers                      Security headers (Netlify convention)
netlify.toml                  Build/functions config + redundant header block
netlify/functions/contact.js  Server-side validation, honeypot check, rate limiting
```

No bundler, no `npm install` required to run it — everything is a static file.

## Running locally

```
python3 -m http.server 8000
# or: npx http-server -p 8000
```

Then open `http://localhost:8000`. Serving over `file://` will not work
(ES module imports and `fetch` need an HTTP origin).

## Design decisions

- **Typography**: Fraunces (editorial serif, used at display sizes and for
  the italic accent word in the hero) paired with Public Sans (body/UI). Both
  self-hosted as woff2 so the CSP needs zero third-party font origins.
- **Palette**: near-black charcoal base with a warm film-gold accent and a
  muted teal secondary — a nod to orange/teal color grading rather than a
  generic purple-gradient "AI template" look.
- **3D object**: a stylised camera-aperture rig (iris ring, orbiting ring,
  faceted core) built from primitive Three.js geometries — deliberately
  bespoke rather than a stock GLTF model. It's confined to a fixed
  full-viewport canvas that sits behind the page; the hero section is fully
  transparent so the object reads clearly there, and the About section has a
  circular cut-out ("aperture window") that lets it peek through again
  further down the page. This keeps the effect purposeful instead of
  fighting body text for legibility on every section.
- **Scroll/mouse behaviour** (`js/three-scene.js`): the rig's rotation,
  position and camera dolly are all driven by scroll progress
  (`scrollY / (scrollHeight - innerHeight)`), with cursor position added as a
  parallax offset on top. Both inputs are lerped toward their targets each
  frame (~0.07 factor) instead of snapping, which is what keeps the motion
  fluid rather than jittery. `prefers-reduced-motion: reduce` disables the
  idle auto-rotate and per-blade "breathing" animation, keeping only the
  direct scroll/pointer response. The render loop pauses via the
  `visibilitychange` event when the tab isn't visible, and WebGL init is
  wrapped in try/catch — if it fails, `<html class="no-webgl">` hides the
  canvas and a static CSS gradient takes its place in the hero.

## Security measures

Everything OWASP-relevant that a frontend-only static site can reasonably
own:

- **CSP**: `default-src 'self'` with no third-party script/style/font/connect
  origins at all (Three.js and the fonts are vendored, not CDN-loaded), no
  `unsafe-inline` (all JS is in external modules, no inline handlers), and
  `frame-ancestors 'none'` to block clickjacking. Delivered as a real HTTP
  header via `_headers` (Netlify's static-header convention) and mirrored in
  `netlify.toml`'s `[[headers]]` block; the `<meta http-equiv>` tag in
  `index.html` is defense-in-depth for hosts that ignore `_headers`, since a
  meta tag alone can't carry `X-Frame-Options`/HSTS/`Permissions-Policy` or
  enforce `frame-ancestors`.
- **Other headers**: `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Strict-Transport-Security` (HSTS, preload-ready), a locked-down
  `Permissions-Policy`, `X-Frame-Options: DENY`, and
  `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy: same-origin`.
- **Contact form** (`js/main.js` + `netlify/functions/contact.js`): client
  side does field-format validation, a honeypot field, and a minimum
  time-on-form check before allowing submit — all standard UX-layer
  deterrents, none of it trusted. The actual trust boundary is the
  serverless function, which independently re-validates name/email/message
  format and length, re-checks the honeypot, restricts allowed
  `Content-Type` and body size, applies best-effort IP-based rate limiting
  (5 requests / 10 minutes), strips CRLF from fields that could otherwise
  enable email-header injection, and HTML-escapes everything before it would
  ever reach a template. It does not send email out of the box — wire a
  transactional provider (Resend, Postmark, SendGrid, ...) in the `TODO` in
  that file using an API key from environment variables, never inline.
  The rate limiter is in-memory per warm function instance, which is
  best-effort on serverless (each cold instance starts a fresh count); for
  guaranteed limits under real traffic, back it with a shared store
  (Upstash Redis, etc.).
- **No user input is ever rendered as HTML** on the client — form field
  values only ever go into `textContent`/JSON payloads, so there's no
  client-side DOM-XSS surface from the form.
- Never disable TLS/HTTPS at the host; `upgrade-insecure-requests` is set in
  the CSP and HSTS is preload-ready as a nudge in that direction.

## Deploying

Any static host works for the site itself. The `_headers` file and
`netlify/functions/contact.js` are Netlify-flavored; on another host, port
the header rules to that platform's equivalent (e.g. an nginx `add_header`
block or a `vercel.json` `headers` array) and reimplement the contact
endpoint as that platform's serverless function — the validation/rate-limit
logic in `contact.js` is otherwise framework-agnostic.

## Content

Copy, project titles and client names are editorial placeholders — swap them
for the real portfolio, testimonials and contact details before launch.
