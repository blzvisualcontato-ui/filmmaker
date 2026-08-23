/**
 * Hero scene — a smartphone next to a professional camera body.
 *
 * Loaded on demand by main.js, never on the critical path: importing this
 * module is what pulls Three.js in, so a visitor on reduced motion, a weak
 * device or a saver connection never downloads it at all.
 *
 * The geometry is authored in code rather than loaded from a .glb. For shapes
 * this simple that is both smaller (no mesh payload, no loader) and sharper
 * (no compression artefacts on the hard edges).
 */
import * as THREE from './vendor/three.module.min.js';

/* ---------------------------------------------------------------- palette */
const INK        = 0x1C1917;
const TERRA      = 0xB85C38;
const CREAM      = 0xF7EFE6;

/* --------------------------------------------------------- env + textures */

/**
 * A studio lighting environment, painted into a canvas and prefiltered.
 *
 * This is the single most important part of the scene. Metallic and clearcoat
 * materials derive nearly all of their brightness from reflections, so without
 * an environment map they render as flat near-black shapes no matter how many
 * lights are added. Two soft boxes overhead and a warm bounce below give the
 * bodies their rolled highlights and let the glass read as glass.
 */
function studioEnvironment(renderer) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d');

  const sky = x.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0.00, '#ffffff');
  sky.addColorStop(0.42, '#cfc7bd');
  sky.addColorStop(0.58, '#6a6058');
  sky.addColorStop(1.00, '#241f1b');
  x.fillStyle = sky;
  x.fillRect(0, 0, 512, 256);

  const glow = (cx, cy, rx, ry, color, alpha) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.save();
    x.globalAlpha = alpha;
    x.translate(cx, cy);
    x.scale(1, ry / rx);
    x.translate(-cx, -cy);
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, rx, 0, Math.PI * 2);
    x.fill();
    x.restore();
  };

  glow(120, 52, 105, 52, '#ffffff', 1.0);   // key soft box
  glow(372, 66, 82, 44, '#fff1e2', 0.85);   // fill soft box
  glow(256, 214, 150, 56, '#B85C38', 0.45); // warm bounce off the floor
  glow(470, 150, 60, 60, '#9fbecd', 0.30);  // cool kicker for edge separation

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

/** Soft elliptical blob used as a contact shadow, so the rig sits on something. */
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0.00, 'rgba(28,25,23,.62)');
  g.addColorStop(0.45, 'rgba(28,25,23,.26)');
  g.addColorStop(1.00, 'rgba(28,25,23,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The phone screen: a reels editor mid-edit, so the screen reads as in use. */
function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const x = c.getContext('2d');

  const bg = x.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#2b1f16');
  bg.addColorStop(1, '#0c0908');
  x.fillStyle = bg;
  x.fillRect(0, 0, 256, 512);

  // status bar
  x.fillStyle = 'rgba(247,239,230,.55)';
  x.fillRect(20, 20, 44, 5);
  x.fillRect(196, 20, 40, 5);

  // viewer: a warm frame with a play control over it
  const vw = x.createLinearGradient(20, 52, 236, 356);
  vw.addColorStop(0, '#B85C38');
  vw.addColorStop(0.55, '#6d3520');
  vw.addColorStop(1, '#1a1210');
  x.fillStyle = vw;
  x.fillRect(20, 52, 216, 304);

  x.fillStyle = 'rgba(247,239,230,.92)';
  x.beginPath(); x.arc(128, 204, 34, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#1C1917';
  x.beginPath();
  x.moveTo(118, 187); x.lineTo(118, 221); x.lineTo(146, 204);
  x.closePath(); x.fill();

  // scrub bar
  x.fillStyle = 'rgba(247,239,230,.18)';
  x.fillRect(20, 372, 216, 5);
  x.fillStyle = '#B85C38';
  x.fillRect(20, 372, 96, 5);

  // timeline clips
  for (let i = 0; i < 4; i++) {
    x.fillStyle = i === 1 ? 'rgba(184,92,56,.85)' : 'rgba(247,239,230,.16)';
    x.fillRect(20 + i * 55, 392, 48, 30);
  }

  // audio waveform
  x.fillStyle = 'rgba(247,239,230,.38)';
  for (let i = 0; i < 34; i++) {
    const h = 3 + Math.abs(Math.sin(i * 0.9)) * 17;
    x.fillRect(20 + i * 6.4, 448 - h / 2, 3, h);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------------ scene */

export function initHeroScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);

  // Raised a little and angled down: a product-shot three-quarter view, which
  // also makes the ground shadow readable instead of edge-on.
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.7, 9.4);
  camera.lookAt(0, -0.15, 0);

  const rig = new THREE.Group();
  rig.scale.setScalar(1.62);
  scene.add(rig);

  /* --------------------------------------------------------- materials */
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0x3a3430, metalness: .55, roughness: .34,
    clearcoat: .55, clearcoatRoughness: .28,
  });
  const shellDark = new THREE.MeshPhysicalMaterial({
    color: 0x2a2521, metalness: .5, roughness: .38,
    clearcoat: .45, clearcoatRoughness: .3,
  });
  // Brushed metal on the rings and frame is what stops the rig reading as one
  // black mass — it is the only thing in the scene that catches a hard specular.
  const metal = new THREE.MeshStandardMaterial({
    color: 0x9a938b, metalness: .96, roughness: .26,
  });
  const metalDark = new THREE.MeshStandardMaterial({
    color: 0x55504b, metalness: .9, roughness: .38,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x1d1712, metalness: .04, roughness: .92,
  });
  const terra = new THREE.MeshPhysicalMaterial({
    color: TERRA, metalness: .35, roughness: .3, clearcoat: .6,
  });
  const creamMat = new THREE.MeshStandardMaterial({
    color: CREAM, metalness: .15, roughness: .45,
  });
  const coated = new THREE.MeshPhysicalMaterial({
    color: 0x0d1a12, metalness: .98, roughness: .04,
    clearcoat: 1, clearcoatRoughness: .02,
    emissive: 0x1d4a2e, emissiveIntensity: .09,
  });
  const coatedInner = new THREE.MeshPhysicalMaterial({
    color: 0x070d09, metalness: .95, roughness: .06,
    clearcoat: 1, emissive: 0x123020, emissiveIntensity: .07,
  });
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x241f1c, metalness: .9, roughness: .1,
    clearcoat: 1, emissive: TERRA, emissiveIntensity: .1,
  });

  const screenTex = screenTexture();
  const screen = new THREE.MeshStandardMaterial({
    map: screenTex, emissiveMap: screenTex, emissive: 0xffffff,
    emissiveIntensity: .62, roughness: .22, metalness: .05,
  });

  /* ------------------------------------------------------------- phone */
  const phone = new THREE.Group();
  phone.position.set(-1.04, -0.02, 0.16);
  phone.rotation.set(0.04, 0.38, -0.03);
  rig.add(phone);

  phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.46, 0.075), shellDark));
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.48, 0.055), metal);
  phone.add(band);

  const display = new THREE.Mesh(new THREE.BoxGeometry(0.63, 1.36, 0.016), screen);
  display.position.z = 0.045;
  phone.add(display);

  const island = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.09, 4, 12), rubber);
  island.rotation.z = Math.PI / 2;
  island.position.set(0, 0.6, 0.056);
  phone.add(island);

  // side controls
  const btnGeo = new THREE.BoxGeometry(0.016, 0.1, 0.038);
  [[-0.355, 0.34], [-0.355, 0.17]].forEach(([px, py]) => {
    const b = new THREE.Mesh(btnGeo, metalDark);
    b.position.set(px, py, 0);
    phone.add(b);
  });
  const power = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.15, 0.038), terra);
  power.position.set(0.355, 0.4, 0);
  phone.add(power);

  // camera island: a raised plate with three ringed lenses and a flash
  const bump = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.33, 0.028), shell);
  bump.position.set(-0.16, 0.5, -0.05);
  phone.add(bump);

  const ringGeo = new THREE.TorusGeometry(0.054, 0.013, 8, 22);
  const lensGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.018, 18);
  [[-0.07, 0.07], [0.07, 0.07], [-0.07, -0.07]].forEach(([ox, oy]) => {
    const r = new THREE.Mesh(ringGeo, metal);
    r.position.set(-0.16 + ox, 0.5 + oy, -0.068);
    phone.add(r);
    const l = new THREE.Mesh(lensGeo, lensGlass);
    l.rotation.x = Math.PI / 2;
    l.position.set(-0.16 + ox, 0.5 + oy, -0.07);
    phone.add(l);
  });
  const flash = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.014, 14), creamMat);
  flash.rotation.x = Math.PI / 2;
  flash.position.set(-0.09, 0.57, -0.068);
  phone.add(flash);

  /* ------------------------------------------------------------ camera */
  const cam = new THREE.Group();
  cam.position.set(0.82, -0.12, 0.28);
  cam.rotation.set(0.02, -0.42, 0);
  rig.add(cam);

  cam.add(new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.76, 0.42), shell));

  // grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.76, 0.44), rubber);
  grip.position.set(0.45, -0.02, 0.02);
  cam.add(grip);
  const thumbRest = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, 0.17), rubber);
  thumbRest.position.set(0.41, 0.33, -0.15);
  cam.add(thumbRest);

  // pentaprism, hot shoe and its contacts
  const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.2, 4), shell);
  prism.rotation.y = Math.PI / 4;
  prism.position.set(-0.06, 0.46, -0.02);
  cam.add(prism);

  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.12), metalDark);
  shoe.position.set(-0.06, 0.58, -0.02);
  cam.add(shoe);
  const pinGeo = new THREE.BoxGeometry(0.018, 0.02, 0.018);
  [-0.04, 0, 0.04].forEach((ox) => {
    const pin = new THREE.Mesh(pinGeo, metal);
    pin.position.set(-0.06 + ox, 0.605, -0.02);
    cam.add(pin);
  });

  // shutter release, mode dial and its tick marks
  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.032, 18), terra);
  shutter.position.set(0.43, 0.41, 0.17);
  cam.add(shutter);

  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 22), metalDark);
  dial.position.set(0.43, 0.41, -0.02);
  cam.add(dial);

  const TICKS = 12;
  const tick = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.012, 0.052, 0.022), metal, TICKS,
  );
  const tm = new THREE.Matrix4(), tq = new THREE.Quaternion();
  const te = new THREE.Euler(), tv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * Math.PI * 2;
    tv.set(Math.cos(a) * 0.072, 0.028, Math.sin(a) * 0.072);
    te.set(0, -a, 0);
    tm.compose(tv, tq.setFromEuler(te), one);
    tick.setMatrixAt(i, tm);
  }
  tick.position.set(0.43, 0.41, -0.02);
  cam.add(tick);

  // strap lugs
  const lugGeo = new THREE.TorusGeometry(0.045, 0.014, 8, 16);
  [[-0.58, 0.3], [0.58, 0.3]].forEach(([lx, ly]) => {
    const lug = new THREE.Mesh(lugGeo, metal);
    lug.position.set(lx, ly, 0);
    lug.rotation.y = Math.PI / 2;
    cam.add(lug);
  });

  // lens: metal mount, stepped barrel, knurled focus ring, coated front glass
  const mount = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.038, 12, 40), metal);
  mount.rotation.x = Math.PI / 2;
  mount.position.set(-0.06, 0, 0.23);
  cam.add(mount);

  const barrelBack = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.265, 0.3, 30), shellDark);
  barrelBack.rotation.x = Math.PI / 2;
  barrelBack.position.set(-0.06, 0, 0.39);
  cam.add(barrelBack);

  // Real knurling instead of a smooth torus: 64 ridges as one instanced draw,
  // which is where most of the added detail comes from for almost no cost.
  const focusRing = new THREE.Group();
  focusRing.position.set(-0.06, 0, 0.58);
  cam.add(focusRing);
  focusRing.add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.252, 0.252, 0.17, 30), shellDark,
  ).rotateX(Math.PI / 2));

  const RIDGES = 64;
  const knurl = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.014, 0.026, 0.15), metalDark, RIDGES,
  );
  const km = new THREE.Matrix4(), kq = new THREE.Quaternion();
  const ke = new THREE.Euler(), kv = new THREE.Vector3();
  for (let i = 0; i < RIDGES; i++) {
    const a = (i / RIDGES) * Math.PI * 2;
    kv.set(Math.cos(a) * 0.258, Math.sin(a) * 0.258, 0);
    ke.set(0, 0, a + Math.PI / 2);
    km.compose(kv, kq.setFromEuler(ke), one);
    knurl.setMatrixAt(i, km);
  }
  focusRing.add(knurl);

  const barrelFront = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.25, 0.32, 30), shellDark);
  barrelFront.rotation.x = Math.PI / 2;
  barrelFront.position.set(-0.06, 0, 0.78);
  cam.add(barrelFront);

  const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.226, 0.017, 8, 40), terra);
  band2.rotation.x = Math.PI / 2;
  band2.position.set(-0.06, 0, 0.91);
  cam.add(band2);

  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.022, 10, 40), metal);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.set(-0.06, 0, 0.96);
  cam.add(bezel);

  // Barely convex: a front element is close to flat, and the depth behind it
  // comes from the stack of rings below, not from bulging the glass outward.
  const frontGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.188, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), coated,
  );
  frontGlass.rotation.x = Math.PI / 2;
  frontGlass.scale.set(1, 0.13, 1);
  frontGlass.position.set(-0.06, 0, 0.945);
  cam.add(frontGlass);

  // retaining ring holding the element in
  const retainer = new THREE.Mesh(new THREE.TorusGeometry(0.187, 0.009, 8, 36), metalDark);
  retainer.rotation.x = Math.PI / 2;
  retainer.position.set(-0.06, 0, 0.947);
  cam.add(retainer);

  // second element, set back so the barrel reads as having depth
  const innerGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 26, 10, 0, Math.PI * 2, 0, Math.PI / 2.3), coatedInner,
  );
  innerGlass.rotation.x = Math.PI / 2;
  innerGlass.scale.set(1, 0.16, 1);
  innerGlass.position.set(-0.06, 0, 0.905);
  cam.add(innerGlass);

  // aperture blades glinting deep inside the barrel
  const iris = new THREE.Mesh(new THREE.CircleGeometry(0.088, 7), terra);
  iris.position.set(-0.06, 0, 0.875);
  iris.rotation.z = Math.PI / 7;
  cam.add(iris);
  const irisCore = new THREE.Mesh(new THREE.CircleGeometry(0.05, 7), new THREE.MeshBasicMaterial({ color: 0x0a0705 }));
  irisCore.position.set(-0.06, 0, 0.878);
  irisCore.rotation.z = Math.PI / 7;
  cam.add(irisCore);

  const afSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.055, 0.11), terra);
  afSwitch.position.set(-0.3, -0.03, 0.45);
  cam.add(afSwitch);

  // front-plate details: brand stripe, AF-assist lamp and a lens-release stud
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.022, 0.012), terra);
  stripe.position.set(-0.38, 0.29, 0.216);
  cam.add(stripe);

  const afLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.014, 14), lensGlass);
  afLamp.rotation.x = Math.PI / 2;
  afLamp.position.set(-0.42, 0.1, 0.216);
  cam.add(afLamp);

  const release = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 14), metalDark);
  release.rotation.x = Math.PI / 2;
  release.position.set(0.24, -0.05, 0.216);
  cam.add(release);

  /* ------------------------------------------------------------ shadow */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 3.2),
    new THREE.MeshBasicMaterial({
      map: shadowTexture(), transparent: true, opacity: .5, depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.32, 0.15);
  scene.add(shadow);

  /* ------------------------------------------------------------ lights */
  // The environment does the heavy lifting; these only shape it.
  scene.add(new THREE.AmbientLight(CREAM, .22));
  const key = new THREE.DirectionalLight(0xfff2e2, 1.9);
  key.position.set(4.2, 6, 6.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(CREAM, .5);
  fill.position.set(-4, 1.4, 5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(TERRA, 1.5);
  rim.position.set(-5.5, -1.2, -2.5);
  scene.add(rim);
  const kick = new THREE.DirectionalLight(0x9fbecd, .55);
  kick.position.set(3, -3.5, -3);
  scene.add(kick);

  /* ------------------------------------------------------- interaction */
  const BASE_X = -0.1, BASE_Y = 0.2;
  let targetRot = 0, curRot = 0, spin = 0, lastScroll = scrollY;
  let mx = 0, my = 0, tmx = 0, tmy = 0;

  addEventListener('scroll', () => {
    const max = document.body.scrollHeight - innerHeight;
    targetRot = (max > 0 ? scrollY / max : 0) * Math.PI * 3;
    spin += (scrollY - lastScroll) * 0.0013;
    lastScroll = scrollY;
  }, { passive: true });

  // Pointer parallax only; touch is left alone so the scene never eats a scroll.
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width - .5) * 0.45;
    tmy = ((e.clientY - r.top) / r.height - .5) * 0.32;
  });
  canvas.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* -------------------------------------------------------------- loop */
  let onScreen = true, queued = false, t = 0;

  function frame() {
    queued = false;
    if (!onScreen || document.hidden) return;
    queued = true;
    requestAnimationFrame(frame);

    t += 0.016;
    spin *= 0.92;
    curRot += (targetRot - curRot) * 0.055;
    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;

    rig.rotation.y = BASE_Y + curRot + spin + t * 0.08 + mx;
    rig.rotation.x = BASE_X + my;
    rig.position.y = Math.sin(t * 0.85) * 0.1;

    focusRing.rotation.z = curRot * 0.7 + spin * 2;

    // shadow tightens as the rig drops, the way a real contact shadow would
    const lift = (rig.position.y + 0.1) / 0.2;
    shadow.scale.setScalar(1 - lift * 0.12);
    shadow.material.opacity = 0.5 - lift * 0.12;

    renderer.render(scene, camera);
  }

  function start() { if (!queued) frame(); }

  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start();
  }, { threshold: 0.02 }).observe(canvas);

  document.addEventListener('visibilitychange', start);
  start();
}
