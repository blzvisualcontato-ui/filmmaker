/**
 * Hero scene — the phone on its gimbal, with the macro lens alongside.
 *
 * This is the real working setup, so it is what the hero shows.
 *
 * Loaded on demand by main.js, never on the critical path: importing this
 * module is what pulls Three.js in, so a visitor on reduced motion, a weak
 * device or a saver connection never downloads it at all.
 */
import * as THREE from './vendor/three.module.min.js';
import {
  studioEnvironment, makeMaterials,
  buildGimbal, buildMacroLens, addLights, castAndReceive,
} from './scene-kit.js';

export function initHeroScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  // This canvas is now the full viewport rather than a boxed square, so it can
  // be four times the pixels it used to be. Rendering that at 1.75x on a large
  // display is a lot of fragment work for no visible gain, so the ratio is
  // trimmed as the stage gets bigger.
  const cores = navigator.hardwareConcurrency || 4;
  // Hard ceiling on the drawing buffer. A full-viewport stage on a large
  // display would otherwise ask for several million fragments a frame, and the
  // subject here is a matte object with soft highlights — it costs almost
  // nothing visually to render under the layout size and let CSS scale it up.
  const MAX_PIXELS = 1.15e6;
  function pickPixelRatio() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    const fit = Math.sqrt(MAX_PIXELS / (w * h));
    return Math.max(0.75, Math.min(devicePixelRatio, 1.75, fit));
  }
  // Start coarse and sharpen once the scene has had a moment. The first frames
  // are the expensive ones — geometry upload, shader compile and shadow map all
  // land together — and nobody reads a hero in its first second. This keeps the
  // opening cheap on a slow phone instead of stalling the main thread.
  let ratioSettled = false;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
  setTimeout(() => {
    ratioSettled = true;
    renderer.setPixelRatio(pickPixelRatio());
    resize();
  }, 1400);

  // Real shadows rather than a painted blob: the contact edge is most of what
  // sells the objects as sitting in a room instead of floating. It costs an
  // extra depth pass, so weaker machines keep the cheaper look.
  const useShadows = cores >= 4;
  if (useShadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);

  // A near plane of 0.1 with a far plane of 100 spends almost all of the depth
  // buffer's precision on space nothing occupies, which is what made close
  // surfaces flicker against each other on phones. Nothing here is nearer than
  // about six units, so the near plane can move out and give the range back.
  const camera = new THREE.PerspectiveCamera(34, 1, 2, 40);
  camera.position.set(0, 1.5, 9.2);
  camera.lookAt(0, -0.2, 0);

  const rig = new THREE.Group();
  rig.scale.setScalar(1.2);
  scene.add(rig);

  const M = makeMaterials();

  /* ------------------------------------------------- phone on the gimbal */
  const gimbal = buildGimbal(M, { withPhone: true });
  gimbal.position.set(-0.35, -0.34, 0);
  gimbal.rotation.set(0.03, -0.42, 0);
  rig.add(gimbal);

  /* ----------------------------------------------------- the macro lens */
  const macro = buildMacroLens(M);
  macro.scale.setScalar(0.82);
  macro.position.set(1.62, 0.35, 0.1);
  macro.rotation.set(0.16, -0.5, 0.24);
  rig.add(macro);

  /* ------------------------------------------------------------ ground */
  // Invisible except for what the key light throws onto it.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.ShadowMaterial({ opacity: .3 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.72;
  ground.receiveShadow = true;
  scene.add(ground);

  addLights(scene, { shadows: useShadows });
  if (useShadows) castAndReceive(rig);
  ground.visible = useShadows;

  /* ------------------------------------------------------- interaction */
  const BASE_X = -0.08, BASE_Y = 0.22;
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
    if (ratioSettled) renderer.setPixelRatio(pickPixelRatio());
    camera.aspect = w / h;
    // On a wide stage the copy owns the left third, so the rig is pushed right
    // and framed tighter. On a phone it centres and pulls back.
    const wide = camera.aspect > 1.25;
    rig.position.x = wide ? 1.5 : 0;
    rig.position.z = wide ? 0 : -1.4;
    camera.fov = wide ? 34 : 42;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* -------------------------------------------------------------- loop */
  let onScreen = true, queued = false, t = 0, last = 0;

  function frame(now) {
    queued = false;
    if (!onScreen || document.hidden) { last = 0; return; }
    queued = true;
    requestAnimationFrame(frame);

    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
    last = now;
    t += dt;

    spin *= Math.pow(0.02, dt);
    curRot += (targetRot - curRot) * (1 - Math.pow(0.03, dt));
    mx += (tmx - mx) * (1 - Math.pow(0.03, dt));
    my += (tmy - my) * (1 - Math.pow(0.03, dt));

    rig.rotation.y = BASE_Y + curRot + spin + t * 0.08 + mx;
    rig.rotation.x = BASE_X + my;
    rig.position.y = Math.sin(t * 0.85) * 0.1;

    macro.rotation.z = 0.24 + curRot * 0.5;

    renderer.render(scene, camera);
  }
  function start() { if (!queued) frame(performance.now()); }

  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start();
  }, { threshold: 0.02 }).observe(canvas);

  document.addEventListener('visibilitychange', start);
  start();
}
