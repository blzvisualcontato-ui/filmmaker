/**
 * Turntable showcase — the gear on a carousel, turned by scroll position.
 *
 * The section this lives in is three viewports tall with a sticky stage inside
 * it, so the stage holds still on screen while the page keeps scrolling
 * underneath at its normal speed. Progress through the section maps to a full
 * turn of the carousel: by the time the stage releases, the ring has come all
 * the way round.
 *
 * This is not scroll hijacking. Nothing intercepts wheel or touch, the
 * scrollbar keeps moving at its native rate, and scrolling back or straight
 * past works exactly as it would anywhere else on the page.
 */
import * as THREE from './vendor/three.module.min.js';
import {
  studioEnvironment, makeMaterials,
  buildGimbal, buildMacroLens, buildLapelMic, addLights,
} from './scene-kit.js';

// Only kit that is actually in the bag.
const LABELS = [
  { name: 'Celular + gimbal', note: 'captação estabilizada, movimento suave' },
  { name: 'Lente macro', note: 'detalhe de perto com nitidez' },
  { name: 'Microfone de lapela', note: 'voz limpa, sem ruído de ambiente' },
];

export function initShowcaseScene(canvas, section, labelEl) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);

  // The near plane sits well out: at 0.1 almost the whole depth buffer covers
  // space nothing occupies, which is what made close surfaces flicker on phones.
  const camera = new THREE.PerspectiveCamera(32, 1, 2, 40);
  // Aimed at the front of the ring rather than its centre, so the item facing
  // the viewer sits in frame instead of being cropped by the bottom edge.
  camera.position.set(0, 1.15, 9.2);
  camera.lookAt(0, -0.05, 2.4);
  // matches the section background, so the far side of the ring recedes
  scene.fog = new THREE.Fog(0x1C1917, 8.5, 15.5);

  const M = makeMaterials();

  /* ------------------------------------------------------- the carousel */
  const turntable = new THREE.Group();
  scene.add(turntable);

  const rig = buildGimbal(M, { withPhone: true });
  rig.scale.setScalar(0.92);
  rig.position.y = -0.6;

  const macro = buildMacroLens(M);
  macro.scale.setScalar(1.15);
  macro.rotation.set(0.1, -0.5, 0.14);

  const lapel = buildLapelMic(M);
  lapel.scale.setScalar(1.25);
  lapel.position.y = 0.25;
  lapel.rotation.set(0.08, -0.35, 0.1);

  const RADIUS = 3.25;
  const items = [rig, macro, lapel];
  items.forEach((obj, i) => {
    const a = (i / items.length) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.position.set(Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS);
    // face outward, so whichever item is at the front looks at the viewer
    holder.rotation.y = a;
    holder.add(obj);
    turntable.add(holder);

  });

  addLights(scene);
  // On the ink background the key light alone leaves the bodies as silhouettes,
  // so two rims carry the edges and a bounce lifts the undersides.
  const rimL = new THREE.DirectionalLight(0xB85C38, 2.1); rimL.position.set(-6, 1.5, -3);
  const rimR = new THREE.DirectionalLight(0xcfe0ea, 1.3); rimR.position.set(6, 2.5, -3.5);
  const under = new THREE.PointLight(0xB85C38, .8, 18); under.position.set(0, -2.6, 3.5);
  const front = new THREE.SpotLight(0xfff2e2, 28, 14, 0.7, 0.6, 1.6);
  front.position.set(0.5, 3.4, 5.2);
  front.target.position.set(0, -0.2, 2.4);
  scene.add(rimL, rimR, under, front, front.target);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // The field of view is vertical, so a narrow phone canvas would leave the
    // front item tiny at the desktop framing. Move in and open up a little.
    const narrow = camera.aspect < 1.35;
    camera.fov = narrow ? 42 : 32;
    camera.position.z = narrow ? 7.8 : 9.2;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* -------------------------------------------------------- scroll drive */
  let progress = 0, shown = -1, target = 0, swapTimer = 0;

  function readProgress() {
    const r = section.getBoundingClientRect();
    const travel = r.height - innerHeight;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / travel));
  }

  addEventListener('scroll', () => { target = readProgress(); }, { passive: true });
  addEventListener('resize', () => { target = readProgress(); }, { passive: true });
  target = readProgress();
  progress = target;

  function updateLabel(p) {
    if (!labelEl) return;
    // the item at the front is the one the ring has brought round to face us
    const i = Math.round(p * items.length) % items.length;
    if (i === shown) return;
    shown = i;
    // fade out, swap the text while it is dim, fade back in — swapping on the
    // next frame instead meant the transition never actually showed
    labelEl.dataset.swap = '1';
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      labelEl.querySelector('.tt-name').textContent = LABELS[i].name;
      labelEl.querySelector('.tt-note').textContent = LABELS[i].note;
      labelEl.querySelector('.tt-index').textContent = String(i + 1).padStart(2, '0');
      labelEl.dataset.swap = '0';
    }, 180);
  }

  /* -------------------------------------------------------------- loop */
  let onScreen = false, queued = false, t = 0, last = 0;

  function frame(now) {
    queued = false;
    if (!onScreen || document.hidden) { last = 0; return; }
    queued = true;
    requestAnimationFrame(frame);

    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
    last = now;
    t += dt;
    // time-based, so the carousel tracks the scroll at the same rate whatever
    // the frame rate happens to be
    progress += (target - progress) * (1 - Math.pow(0.0015, dt));

    // one full turn across the pinned section
    turntable.rotation.y = -progress * Math.PI * 2;
    turntable.position.y = Math.sin(t * 0.7) * 0.06;

    macro.rotation.z = 0.14 + progress * 5;
    updateLabel(progress);

    renderer.render(scene, camera);
  }
  function start() { if (!queued) frame(); }

  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start();
  }, { threshold: 0 }).observe(canvas);

  document.addEventListener('visibilitychange', start);
  updateLabel(0);
  start();
}
