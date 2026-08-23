/**
 * Hero scene — a smartphone beside the professional camera.
 *
 * Loaded on demand by main.js, never on the critical path: importing this
 * module is what pulls Three.js in, so a visitor on reduced motion, a weak
 * device or a saver connection never downloads it at all.
 */
import * as THREE from './vendor/three.module.min.js';
import {
  TERRA, CREAM, roundedBox, studioEnvironment, shadowTexture,
  makeMaterials, phoneScreenTexture, buildCamera, addLights,
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

  // Raised and angled down: a product-shot three-quarter view, which also makes
  // the ground shadow readable instead of edge-on.
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.7, 9.6);
  camera.lookAt(0, -0.15, 0);

  const rig = new THREE.Group();
  rig.scale.setScalar(1.42);
  scene.add(rig);

  const M = makeMaterials();

  /* ------------------------------------------------------------- phone */
  const phone = new THREE.Group();
  phone.position.set(-1.32, -0.02, 0.16);
  phone.rotation.set(0.04, 0.38, -0.03);
  rig.add(phone);

  phone.add(new THREE.Mesh(roundedBox(0.7, 1.46, 0.075, 0.06), M.shellDark));
  phone.add(new THREE.Mesh(roundedBox(0.72, 1.48, 0.055, 0.06), M.metal));

  const screenTex = phoneScreenTexture();
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.63, 1.36), new THREE.MeshStandardMaterial({
    map: screenTex, emissiveMap: screenTex, emissive: 0xffffff,
    emissiveIntensity: .62, roughness: .22, metalness: .05,
  }));
  display.position.z = 0.045;
  phone.add(display);

  const island = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.09, 4, 12), M.rubber);
  island.rotation.z = Math.PI / 2;
  island.position.set(0, 0.6, 0.05);
  phone.add(island);

  const btn = new THREE.BoxGeometry(0.016, 0.1, 0.038);
  [[-0.355, 0.34], [-0.355, 0.17]].forEach(([px, py]) => {
    const b = new THREE.Mesh(btn, M.metalDark);
    b.position.set(px, py, 0);
    phone.add(b);
  });
  const power = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.15, 0.038), M.terra);
  power.position.set(0.355, 0.4, 0);
  phone.add(power);

  const bump = new THREE.Mesh(roundedBox(0.33, 0.33, 0.028, 0.05), M.shell);
  bump.position.set(-0.16, 0.5, -0.05);
  phone.add(bump);
  const ring = new THREE.TorusGeometry(0.054, 0.013, 8, 22);
  const lens = new THREE.CylinderGeometry(0.046, 0.046, 0.018, 18);
  [[-0.07, 0.07], [0.07, 0.07], [-0.07, -0.07]].forEach(([ox, oy]) => {
    const r = new THREE.Mesh(ring, M.metal);
    r.position.set(-0.16 + ox, 0.5 + oy, -0.068);
    phone.add(r);
    const l = new THREE.Mesh(lens, M.darkGlass);
    l.rotation.x = Math.PI / 2;
    l.position.set(-0.16 + ox, 0.5 + oy, -0.07);
    phone.add(l);
  });
  const flash = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.014, 14), M.cream);
  flash.rotation.x = Math.PI / 2;
  flash.position.set(-0.09, 0.57, -0.068);
  phone.add(flash);

  /* ------------------------------------------------------------ camera */
  const { group: cam, focusRing } = buildCamera(M, { hood: false });
  cam.position.set(0.86, -0.1, 0.18);
  cam.rotation.set(0.02, -0.44, 0);
  rig.add(cam);

  /* ------------------------------------------------------------ shadow */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 3.2),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: .5, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.34, 0.15);
  scene.add(shadow);

  addLights(scene);

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
