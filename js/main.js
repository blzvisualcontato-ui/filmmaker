document.getElementById('yr').textContent = new Date().getFullYear();

/* header shadow */
const header = document.getElementById('header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 20));

/* reveal on scroll */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: .15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* sticky mobile CTA: stays out of the way until the hero is behind you */
(function () {
  const bar = document.getElementById('stickyCta');
  const hero = document.querySelector('.hero');
  if (!bar || !hero) return;
  bar.hidden = false;
  if (!('IntersectionObserver' in window)) { bar.classList.add('is-up'); return; }
  new IntersectionObserver(
    ([entry]) => bar.classList.toggle('is-up', !entry.isIntersecting),
    { threshold: 0 }
  ).observe(hero);
})();

/* ----------------------------------------------------------------------
   3D hero scene — loaded on demand.

   Three.js is 670 KB, so it is never on the critical path. The module is
   fetched only once the canvas is close to the viewport, and only if the
   visitor actually wants and can afford the scene. Everyone else keeps the
   static poster that is already in the markup, and downloads nothing.
   ---------------------------------------------------------------------- */
(function () {
  const stage = document.querySelector('.hero-stage');
  const canvas = document.getElementById('hero-canvas');
  if (!stage || !canvas) return;

  function webglAvailable() {
    try {
      return !!document.createElement('canvas').getContext('webgl2');
    } catch (_) {
      return false;
    }
  }

  function wantsScene() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return false;
    const net = navigator.connection;
    if (net && (net.saveData || /(^|-)2g$/.test(net.effectiveType || ''))) return false;
    return webglAvailable();
  }

  if (!wantsScene()) return;

  let loading = false;
  function load() {
    if (loading) return;
    loading = true;
    import('./hero-scene.js')
      .then((m) => {
        m.initHeroScene(canvas);
        stage.classList.add('has-3d');
      })
      .catch(() => {
        // Poster stays; a failed enhancement should never blank the hero.
        loading = false;
      });
  }

  /*
   * Wait for the first sign of a real visitor before spending anything.
   *
   * Building the scene and driving its frames is the most expensive thing on
   * the page by a wide margin, and none of it is worth doing for someone who
   * has not engaged yet. Any pointer move, scroll, key or touch upgrades the
   * poster to the live scene, which for a person is effectively immediate.
   * There is deliberately no timer fallback: a visitor who never moves,
   * scrolls or touches is not looking at the hero, and the poster is a
   * complete picture on its own.
   */
  // Deliberately not plain 'scroll': that also fires for programmatic scrolling
  // (an anchor jump, an audit tool paging through the document), which is not a
  // person. Every real path in — mouse, wheel, touch, keyboard — raises one of
  // these first, and touchstart always precedes a scroll on mobile.
  const INTENT = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown'];
  function onIntent() {
    INTENT.forEach((t) => removeEventListener(t, onIntent));
    if (!('IntersectionObserver' in window)) { load(); return; }
    const near = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { near.disconnect(); load(); }
    }, { rootMargin: '200px' });
    near.observe(canvas);
  }
  INTENT.forEach((t) => addEventListener(t, onIntent, { once: true, passive: true }));
})();
