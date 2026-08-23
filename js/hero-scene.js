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
  studioEnvironment, shadowTexture, makeMaterials,
  buildGimbal, buildMacroLens, addLights,
} from './scene-kit.js';

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

  // A near plane of 0.1 with a far plane of 100 spends almost all of the depth
  // buffer's precision on space nothing occupies, which is what made close
  // surfaces flicker against each other on phones. Nothing here is nearer than
  // about six units, so the near plane can move out and give the range back.
  const camera = new THREE.PerspectiveCamera(30, 1, 2, 40);
  camera.position.set(0, 1.7, 9.6);
  camera.lookAt(0, -0.1, 0);

  const rig = new THREE.Group();
  rig.scale.setScalar(1.28);
  scene.add(rig);

  const M = makeMaterials();

  /* ------------------------------------------------- phone on the gimbal */
  const gimbal = buildGimbal(M, { withPhone: true });
  gimbal.position.set(-0.35, -0.55, 0);
  gimbal.rotation.set(0.03, -0.42, 0);
  rig.add(gimbal);

  /* ----------------------------------------------------- the macro lens */
  const macro = buildMacroLens(M);
  macro.scale.setScalar(0.82);
  macro.position.set(1.62, 0.35, 0.1);
  macro.rotation.set(0.16, -0.5, 0.24);
  rig.add(macro);

  /* ------------------------------------------------------------ shadow */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 3.0),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: .48, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.1, -1.42, 0.15);
  scene.add(shadow);

  addLights(scene);

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
    camera.aspect = w / h;
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

    const lift = (rig.position.y + 0.1) / 0.2;
    shadow.scale.setScalar(1 - lift * 0.12);
    shadow.material.opacity = 0.48 - lift * 0.12;

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
