/**
 * Ambient 3D "aperture rig" — a stylised camera-iris object that spins,
 * tilts and drifts in response to scroll position and cursor movement.
 * Self-contained: owns its own render loop and event listeners.
 */
import * as THREE from './vendor/three.module.min.js';

const ACCENT = 0xd98a3d;
const ACCENT_2 = 0x3f8b8b;
const METAL_DARK = 0x1c1a17;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function buildApertureRig() {
  const rig = new THREE.Group();

  const ringGeo = new THREE.TorusGeometry(1.5, 0.032, 16, 100);
  const ringMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    metalness: 0.65,
    roughness: 0.32,
    emissive: new THREE.Color(ACCENT).multiplyScalar(0.06),
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  rig.add(ring);

  const orbitGeo = new THREE.TorusGeometry(1.9, 0.012, 12, 100);
  const orbitMat = new THREE.MeshStandardMaterial({
    color: ACCENT_2,
    metalness: 0.4,
    roughness: 0.5,
    transparent: true,
    opacity: 0.55,
  });
  const orbit = new THREE.Mesh(orbitGeo, orbitMat);
  orbit.rotation.x = Math.PI / 2.4;
  orbit.rotation.y = 0.4;
  rig.add(orbit);

  const coreGeo = new THREE.IcosahedronGeometry(0.36, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea,
    metalness: 0.2,
    roughness: 0.35,
    emissive: new THREE.Color(ACCENT).multiplyScalar(0.35),
    flatShading: true,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  rig.add(core);

  const bladeGeo = new THREE.BoxGeometry(1.05, 0.16, 0.02);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: METAL_DARK,
    metalness: 0.75,
    roughness: 0.4,
  });
  const bladeCount = 9;
  const blades = [];
  for (let i = 0; i < bladeCount; i += 1) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    const angle = (i / bladeCount) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 0.56, Math.sin(angle) * 0.56, 0);
    blade.rotation.z = angle + Math.PI / 2;
    rig.add(blade);
    blades.push({ mesh: blade, angle });
  }

  return { rig, core, orbit, blades };
}

export function initThreeScene() {
  const canvas = document.getElementById('scene');
  if (!canvas) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedMotionQuery.matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  if (!renderer) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  document.documentElement.classList.add('has-webgl');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20);
  camera.position.set(0, 0, 5);

  const setSize = () => {
    const { innerWidth, innerHeight } = window;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  setSize();

  scene.add(new THREE.HemisphereLight(0xfff2df, 0x0a0a0d, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffdcae, 1.1);
  keyLight.position.set(3, 2, 4);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(ACCENT_2, 6, 12);
  rimLight.position.set(-3, -1.5, -2);
  scene.add(rimLight);

  const { rig, core, orbit, blades } = buildApertureRig();
  rig.position.set(1.1, 0, 0);
  scene.add(rig);

  const pointer = { x: 0, y: 0 };
  const pointerEased = { x: 0, y: 0 };
  let scrollTarget = 0;
  let scrollEased = 0;

  const getScrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };

  const onPointerMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  const onScroll = () => {
    scrollTarget = getScrollProgress();
  };
  const onResize = () => setSize();
  const onVisibilityChange = () => {
    isTabVisible = document.visibilityState === 'visible';
  };
  const onReducedMotionChange = (event) => {
    reducedMotion = event.matches;
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener('change', onReducedMotionChange);
  }

  let isTabVisible = document.visibilityState === 'visible';
  const clock = new THREE.Clock();
  let frameId = null;

  const render = () => {
    frameId = requestAnimationFrame(render);
    if (!isTabVisible) return;

    const elapsed = clock.getElapsedTime();
    const easing = reducedMotion ? 1 : 0.07;

    scrollEased = lerp(scrollEased, scrollTarget, easing);
    pointerEased.x = lerp(pointerEased.x, pointer.x, easing);
    pointerEased.y = lerp(pointerEased.y, pointer.y, easing);

    const idleSpin = reducedMotion ? 0 : elapsed * 0.12;

    rig.rotation.y = idleSpin + scrollEased * Math.PI * 2.4 + pointerEased.x * 0.35;
    rig.rotation.x = scrollEased * Math.PI * 0.7 + pointerEased.y * 0.22;
    rig.rotation.z = Math.sin(scrollEased * Math.PI) * 0.15;

    rig.position.y = lerp(0.7, -0.9, scrollEased) + (reducedMotion ? 0 : Math.sin(elapsed * 0.6) * 0.05);
    rig.position.x = 1.1 - scrollEased * 0.6 + pointerEased.x * 0.25;

    orbit.rotation.z = reducedMotion ? 0 : elapsed * 0.2;
    core.rotation.y = reducedMotion ? 0 : elapsed * 0.4;

    if (!reducedMotion) {
      blades.forEach(({ mesh, angle }, i) => {
        mesh.rotation.z = angle + Math.PI / 2 + Math.sin(elapsed * 0.5 + i) * 0.05;
      });
    }

    camera.position.z = 5 - scrollEased * 0.7;
    camera.lookAt(rig.position);

    renderer.render(scene, camera);
  };

  frameId = requestAnimationFrame(render);

  window.addEventListener('pagehide', () => {
    if (frameId) cancelAnimationFrame(frameId);
    renderer.dispose();
  });
}
