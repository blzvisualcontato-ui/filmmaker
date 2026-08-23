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

/* ---------- 3D HERO RIG: smartphone + professional camera (Three.js) ---------- */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!window.THREE || !canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const rig = new THREE.Group();
  rig.scale.setScalar(1.55);
  scene.add(rig);

  // hard plastic bodies get a clearcoat for that glossy-product-shot sheen;
  // the rubber grip stays matte
  const tinta = new THREE.MeshPhysicalMaterial({ color: 0x2c2723, metalness: .5, roughness: .32, clearcoat: .6, clearcoatRoughness: .25 });
  const carvao = new THREE.MeshPhysicalMaterial({ color: 0x3d3b37, metalness: .45, roughness: .35, clearcoat: .5, clearcoatRoughness: .3 });
  const rust = new THREE.MeshStandardMaterial({ color: 0xB85C38, metalness: .5, roughness: .3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x2b2622, metalness: .9, roughness: .12, emissive: 0xB85C38, emissiveIntensity: .14 });
  // rubberized grip + a pro-lens-style red ring + a green-coated glass element,
  // styled after a real DSLR body/lens (no photo used, just the look of one)
  const borracha = new THREE.MeshStandardMaterial({ color: 0x1e1610, metalness: .05, roughness: .85 });
  const redRing = new THREE.MeshPhysicalMaterial({ color: 0xD22030, metalness: .35, roughness: .28, clearcoat: .7 });
  const glassGreen = new THREE.MeshPhysicalMaterial({ color: 0x1a2e20, metalness: .9, roughness: .06, clearcoat: 1, emissive: 0x2e6b46, emissiveIntensity: .35 });
  const glassGreenInner = new THREE.MeshPhysicalMaterial({ color: 0x0e1a12, metalness: .85, roughness: .08, clearcoat: 1, emissive: 0x1f4a30, emissiveIntensity: .26 });

  // phone screen: a small canvas-drawn video-editor mockup used as a texture,
  // so the screen reads as an active UI instead of a flat dark rectangle
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 256; screenCanvas.height = 512;
  const sctx = screenCanvas.getContext('2d');
  const bgGrad = sctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#241a12'); bgGrad.addColorStop(1, '#0d0a08');
  sctx.fillStyle = bgGrad; sctx.fillRect(0, 0, 256, 512);
  sctx.fillStyle = 'rgba(249,248,243,.5)'; sctx.fillRect(18, 22, 56, 6);
  sctx.fillStyle = '#160f0a'; sctx.fillRect(18, 60, 220, 300);
  sctx.fillStyle = '#C35423';
  sctx.beginPath(); sctx.arc(128, 210, 36, 0, Math.PI * 2); sctx.fill();
  sctx.fillStyle = '#F9F8F3';
  sctx.beginPath(); sctx.moveTo(117, 191); sctx.lineTo(117, 229); sctx.lineTo(147, 210); sctx.closePath(); sctx.fill();
  sctx.fillStyle = 'rgba(249,248,243,.15)'; sctx.fillRect(18, 382, 220, 6);
  sctx.fillStyle = '#C35423'; sctx.fillRect(18, 382, 92, 6);
  sctx.fillStyle = 'rgba(249,248,243,.4)'; sctx.fillRect(18, 412, 160, 10);
  sctx.fillStyle = 'rgba(249,248,243,.25)'; sctx.fillRect(18, 434, 110, 10);
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshStandardMaterial({ map: screenTex, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: .55, roughness: .35, metalness: .1 });
  const flashMat = new THREE.MeshStandardMaterial({ color: 0xF7EFE6, metalness: .1, roughness: .3, emissive: 0xF7EFE6, emissiveIntensity: .2 });

  /* --- smartphone --- */
  const phone = new THREE.Group();
  phone.position.set(-1.05, -0.05, 0.1);
  phone.rotation.y = 0.32;
  rig.add(phone);

  // body has a hair more depth + a slightly lighter side frame, like the
  // metal band around a real phone's glass front/back
  phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.4, 0.11), tinta));
  const frameBand = new THREE.Mesh(new THREE.BoxGeometry(0.685, 1.415, 0.075), carvao);
  phone.add(frameBand);

  // edge-to-edge screen, thin even bezel
  const phoneScreen = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.28, 0.02), screenMat);
  phoneScreen.position.z = 0.065;
  phone.add(phoneScreen);

  // dynamic-island-style notch
  const notch = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.1, 4, 16), borracha);
  notch.rotation.z = Math.PI / 2;
  notch.position.set(0, 0.6, 0.077);
  phone.add(notch);

  // side buttons: volume rocker (left) + power button (right), a small
  // color accent like a lot of phones do
  const volUp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.05), rust);
  volUp.position.set(-0.335, 0.32, 0);
  phone.add(volUp);
  const volDown = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.05), rust);
  volDown.position.set(-0.335, 0.14, 0);
  phone.add(volDown);
  const powerBtn = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.05), rust);
  powerBtn.position.set(0.335, 0.38, 0);
  phone.add(powerBtn);

  // triple-camera module, each lens with its own bezel ring, plus an LED flash
  const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.035), carvao);
  camBump.position.set(-0.16, 0.5, -0.07);
  phone.add(camBump);

  [[-0.065, 0.065], [0.065, 0.065], [-0.065, -0.065]].forEach(([ox, oy]) => {
    const bezelRing = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 10, 24), tinta);
    bezelRing.position.set(-0.16 + ox, 0.5 + oy, -0.088);
    phone.add(bezelRing);
    const lensDot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), glass);
    lensDot.rotation.x = Math.PI / 2;
    lensDot.position.set(-0.16 + ox, 0.5 + oy, -0.09);
    phone.add(lensDot);
  });
  const flashLed = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 16), flashMat);
  flashLed.rotation.x = Math.PI / 2;
  flashLed.position.set(-0.095, 0.565, -0.088);
  phone.add(flashLed);

  /* --- professional camera --- */
  const cam = new THREE.Group();
  cam.position.set(0.95, -0.1, 0.3);
  cam.rotation.y = -0.36;
  rig.add(cam);

  cam.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.74, 0.4), carvao));

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.74, 0.42), borracha);
  grip.position.set(0.44, -0.02, 0.02);
  cam.add(grip);
  const gripThumb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), borracha);
  gripThumb.position.set(0.4, 0.32, -0.14);
  cam.add(gripThumb);

  const finder = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.3), tinta);
  finder.position.set(-0.05, 0.44, -0.02);
  cam.add(finder);

  const hotshoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.1), carvao);
  hotshoe.position.set(-0.05, 0.55, -0.02);
  cam.add(hotshoe);

  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), rust);
  shutter.position.set(0.42, 0.4, 0.16);
  cam.add(shutter);

  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24), tinta);
  dial.position.set(0.42, 0.4, 0.0);
  cam.add(dial);

  const mount = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 16, 48), tinta);
  mount.rotation.x = Math.PI / 2;
  mount.position.set(-0.05, 0, 0.22);
  cam.add(mount);

  // stepped lens barrel: wider base tapering toward the front element
  const barrelBack = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.26, 0.3, 32), carvao);
  barrelBack.rotation.x = Math.PI / 2;
  barrelBack.position.set(-0.05, 0, 0.38);
  cam.add(barrelBack);

  const focusRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.055, 12, 48), carvao);
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(-0.05, 0, 0.56);
  cam.add(focusRing);

  const afSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), rust);
  afSwitch.position.set(-0.28, -0.02, 0.44);
  afSwitch.rotation.y = Math.PI / 2;
  cam.add(afSwitch);

  const barrelFront = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.34, 32), carvao);
  barrelFront.rotation.x = Math.PI / 2;
  barrelFront.position.set(-0.05, 0, 0.75);
  cam.add(barrelFront);

  // signature red ring, like an L-series lens
  const redBand = new THREE.Mesh(new THREE.TorusGeometry(0.222, 0.018, 10, 48), redRing);
  redBand.rotation.x = Math.PI / 2;
  redBand.position.set(-0.05, 0, 0.9);
  cam.add(redBand);

  // front glass: a black bezel around two nested green-coated elements,
  // suggesting depth the way a real lens looks when you peer into it
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 12, 48), tinta);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.set(-0.05, 0, 0.93);
  cam.add(bezel);

  const frontGlass = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.6), glassGreen);
  frontGlass.rotation.x = Math.PI / 2;
  frontGlass.position.set(-0.05, 0, 0.9);
  cam.add(frontGlass);

  const innerGlass = new THREE.Mesh(new THREE.SphereGeometry(0.11, 28, 28, 0, Math.PI * 2, 0, Math.PI / 2.4), glassGreenInner);
  innerGlass.rotation.x = Math.PI / 2;
  innerGlass.position.set(-0.05, 0, 0.86);
  cam.add(innerGlass);

  // studio-style lighting rig: strong key, soft fill, warm rim + a cool
  // kicker for edge separation — this is what makes the flat-black plastic
  // read as rounded product photography instead of a flat silhouette
  scene.add(new THREE.AmbientLight(0xF7EFE6, .38));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.2); key.position.set(4, 5.5, 6.5); scene.add(key);
  const fillLight = new THREE.DirectionalLight(0xF7EFE6, .7); fillLight.position.set(-3, 1, 5); scene.add(fillLight);
  const rim = new THREE.DirectionalLight(0xB85C38, 1.4); rim.position.set(-6, -2, 2); scene.add(rim);
  const kicker = new THREE.DirectionalLight(0x8fb8c9, .8); kicker.position.set(2, -4, -3); scene.add(kicker);
  const fill = new THREE.PointLight(0xF7EFE6, .8, 14); fill.position.set(0, 1.5, 7); scene.add(fill);

  const BASE_ROT_X = -0.16;
  const BASE_ROT_Y = 0.24;

  // interaction state
  let targetRot = 0, curRot = 0, spin = 0;
  let lastScroll = scrollY;
  let mx = 0, my = 0, tmx = 0, tmy = 0;

  addEventListener('scroll', () => {
    const max = document.body.scrollHeight - innerHeight;
    const prog = max > 0 ? scrollY / max : 0;
    targetRot = prog * Math.PI * 4;              // scroll position -> rotation
    spin += (scrollY - lastScroll) * 0.0016;      // scroll speed -> extra impulse
    lastScroll = scrollY;
  }, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width - .5) * 0.5;
    tmy = ((e.clientY - r.top) / r.height - .5) * 0.5;
  });
  canvas.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let t = 0, running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    t += 0.016;

    spin *= 0.92;
    curRot += (targetRot - curRot) * 0.06;
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;

    rig.rotation.y = BASE_ROT_Y + curRot + spin + (reduce ? 0 : t * 0.1) + mx;
    rig.rotation.x = BASE_ROT_X + my;
    if (!reduce) rig.position.y = Math.sin(t * 0.9) * 0.12;

    // camera's manual focus ring turns as you scroll, like a real lens
    focusRing.rotation.z = curRot * 0.6 + spin;

    renderer.render(scene, camera);
  }
  loop();
})();
