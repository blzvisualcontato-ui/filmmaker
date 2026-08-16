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

/* ---------- 3D HERO RIG: smartphone + professional camera (Three.js) ---------- */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!window.THREE || !canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 8.5);

  const rig = new THREE.Group();
  rig.scale.setScalar(1.35);
  scene.add(rig);

  const tinta = new THREE.MeshStandardMaterial({ color: 0x231F1C, metalness: .55, roughness: .38 });
  const carvao = new THREE.MeshStandardMaterial({ color: 0x343330, metalness: .5, roughness: .42 });
  const rust = new THREE.MeshStandardMaterial({ color: 0xC35423, metalness: .5, roughness: .35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x2b2622, metalness: .9, roughness: .12, emissive: 0xC35423, emissiveIntensity: .14 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x100e0c, metalness: .3, roughness: .2, emissive: 0xC35423, emissiveIntensity: .05 });

  /* --- smartphone --- */
  const phone = new THREE.Group();
  phone.position.set(-1.05, -0.05, 0.1);
  phone.rotation.y = 0.32;
  rig.add(phone);

  phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.64, 1.38, 0.09), tinta));

  const phoneScreen = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.2, 0.02), screenMat);
  phoneScreen.position.z = 0.055;
  phone.add(phoneScreen);

  const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.03), carvao);
  camBump.position.set(-0.15, 0.48, -0.06);
  phone.add(camBump);

  [[-0.06, 0.06], [0.06, 0.06], [-0.06, -0.06]].forEach(([ox, oy]) => {
    const lensDot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), glass);
    lensDot.rotation.x = Math.PI / 2;
    lensDot.position.set(-0.15 + ox, 0.48 + oy, -0.085);
    phone.add(lensDot);
  });

  /* --- professional camera --- */
  const cam = new THREE.Group();
  cam.position.set(0.95, -0.1, 0.3);
  cam.rotation.y = -0.36;
  rig.add(cam);

  cam.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.74, 0.4), carvao));

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.74, 0.42), tinta);
  grip.position.set(0.44, -0.02, 0.02);
  cam.add(grip);

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

  const mount = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 16, 48), tinta);
  mount.rotation.x = Math.PI / 2;
  mount.position.set(-0.05, 0, 0.22);
  cam.add(mount);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.62, 32), carvao);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(-0.05, 0, 0.5);
  cam.add(barrel);

  const focusRing = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.05, 12, 48), rust);
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(-0.05, 0, 0.62);
  cam.add(focusRing);

  const frontGlass = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.2), glass);
  frontGlass.rotation.x = Math.PI / 2;
  frontGlass.position.set(-0.05, 0, 0.83);
  cam.add(frontGlass);

  // lights (palette-driven)
  scene.add(new THREE.AmbientLight(0xF9F8F3, .55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xC35423, .9); rim.position.set(-6, -2, 2); scene.add(rim);
  const fill = new THREE.PointLight(0xF9F8F3, .6); fill.position.set(0, 0, 7); scene.add(fill);

  rig.rotation.x = -0.18;

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

    rig.rotation.y = curRot + spin + (reduce ? 0 : t * 0.12) + mx;
    rig.rotation.x = -0.18 + my;
    if (!reduce) rig.position.y = Math.sin(t * 0.9) * 0.12;

    // camera's manual focus ring turns as you scroll, like a real lens
    focusRing.rotation.z = curRot * 0.6 + spin;

    renderer.render(scene, camera);
  }
  loop();
})();

/* ---------- 3D DRONE (Three.js) ---------- */
(function () {
  const canvas = document.getElementById('drone-canvas');
  if (!window.THREE || !canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1.33, 0.1, 100);
  camera.position.set(0, 2.4, 8);
  camera.lookAt(0, 0, 0);

  const drone = new THREE.Group();
  scene.add(drone);

  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1815, metalness: .6, roughness: .4 });
  const body = new THREE.MeshStandardMaterial({ color: 0x2a2521, metalness: .55, roughness: .35 });
  const rustM = new THREE.MeshStandardMaterial({ color: 0xC35423, metalness: .5, roughness: .35 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xF9F8F3, metalness: .2, roughness: .6 });
  const propM = new THREE.MeshStandardMaterial({ color: 0xF9F8F3, metalness: .3, roughness: .5, transparent: true, opacity: .28, side: THREE.DoubleSide });

  // central body
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, .5, 1.1), body);
  drone.add(hull);
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(1.1, .18, .8), rustM);
  topPlate.position.y = .32; drone.add(topPlate);

  // camera gimbal under body
  const gimbalArm = new THREE.Mesh(new THREE.BoxGeometry(.25, .35, .25), dark);
  gimbalArm.position.set(.4, -.42, .45); drone.add(gimbalArm);
  const camBox = new THREE.Mesh(new THREE.BoxGeometry(.45, .4, .5), dark);
  camBox.position.set(.4, -.7, .5); drone.add(camBox);
  const camLens = new THREE.Mesh(new THREE.CylinderGeometry(.14, .16, .18, 20), rustM);
  camLens.rotation.x = Math.PI / 2; camLens.position.set(.4, -.7, .78); drone.add(camLens);

  // arms + motors + props
  const props = [];
  const arm = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  arm.forEach(([sx, sz]) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(1.5, .12, .16), dark);
    a.position.set(sx * .75, .05, sz * .55);
    a.rotation.y = Math.atan2(sz * .55, sx * .75);
    drone.add(a);

    const mx = sx * 1.35, mz = sz * 1.0;
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, .32, 16), body);
    motor.position.set(mx, .12, mz); drone.add(motor);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .12, 10), rustM);
    hub.position.set(mx, .32, mz); drone.add(hub);

    // prop: two crossed thin blades + faint disc
    const prop = new THREE.Group(); prop.position.set(mx, .34, mz);
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, .03, .14), cream);
    const b2 = b1.clone(); b2.rotation.y = Math.PI / 2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.78, 28), propM);
    disc.rotation.x = -Math.PI / 2;
    prop.add(b1, b2, disc);
    drone.add(prop); props.push(prop);
  });

  drone.rotation.x = 0.15;

  // lights
  scene.add(new THREE.AmbientLight(0xF9F8F3, .5));
  const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(5, 7, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xC35423, 1.0); rim.position.set(-6, 2, -3); scene.add(rim);
  const under = new THREE.PointLight(0xC35423, .5); under.position.set(0, -4, 3); scene.add(under);

  // interaction
  let targetYaw = 0, curYaw = 0, bank = 0, tBank = 0;
  let mx2 = 0, my2 = 0, tmx2 = 0, tmy2 = 0, lastS = scrollY;
  addEventListener('scroll', () => {
    const max = document.body.scrollHeight - innerHeight;
    const prog = max > 0 ? scrollY / max : 0;
    targetYaw = prog * Math.PI * 3;
    tBank = Math.max(-0.5, Math.min(0.5, (scrollY - lastS) * 0.004));
    lastS = scrollY;
  }, { passive: true });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tmx2 = ((e.clientX - r.left) / r.width - .5) * 0.8;
    tmy2 = ((e.clientY - r.top) / r.height - .5) * 0.5;
  });
  canvas.addEventListener('pointerleave', () => { tmx2 = 0; tmy2 = 0; });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  // pause when offscreen
  let onScreen = true;
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; if (onScreen) loop(); }, { threshold: .05 }).observe(canvas);

  let t = 0, req = false;
  function loop() {
    if (!onScreen || document.hidden) { req = false; return; }
    req = true; requestAnimationFrame(loop); t += 0.016;
    curYaw += (targetYaw - curYaw) * 0.05;
    bank += (tBank - bank) * 0.05; tBank *= 0.9;
    mx2 += (tmx2 - mx2) * 0.06; my2 += (tmy2 - my2) * 0.06;
    drone.rotation.y = curYaw + mx2;
    drone.rotation.z = bank;
    drone.rotation.x = 0.15 + my2;
    if (!reduce) drone.position.y = Math.sin(t * 1.1) * 0.18;
    const ps = reduce ? 0.15 : 1.1;
    props.forEach((p, i) => p.rotation.y += (i % 2 ? ps : -ps));
    renderer.render(scene, camera);
  }
  loop();
})();

/* ---------- 3D AMBIENT SHAPES (Three.js, contact bg) ---------- */
(function () {
  const canvas = document.getElementById('ambient-canvas');
  if (!window.THREE || !canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.1, 100);
  camera.position.z = 12;

  const rust = new THREE.MeshStandardMaterial({ color: 0xC35423, metalness: .4, roughness: .5, transparent: true, opacity: .9 });
  const cream = new THREE.MeshBasicMaterial({ color: 0xF9F8F3, wireframe: true, transparent: true, opacity: .22 });
  const geos = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.TorusGeometry(.9, .32, 10, 24),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.TorusKnotGeometry(.6, .22, 60, 8),
  ];
  const shapes = [];
  for (let i = 0; i < 11; i++) {
    const g = geos[i % geos.length];
    const m = (i % 3 === 0) ? rust : cream;
    const mesh = new THREE.Mesh(g, m);
    const s = 0.5 + Math.random() * 1.1;
    mesh.scale.setScalar(s);
    mesh.position.set((Math.random() - .5) * 20, (Math.random() - .5) * 10, (Math.random() - .5) * 6 - 2);
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    mesh.userData.sp = (Math.random() * .4 + .1) * (Math.random() < .5 ? -1 : 1);
    mesh.userData.fy = Math.random() * 6;
    scene.add(mesh); shapes.push(mesh);
  }
  scene.add(new THREE.AmbientLight(0xffffff, .7));
  const p = new THREE.PointLight(0xC35423, 1.2); p.position.set(4, 3, 8); scene.add(p);

  let tmx = 0, tmy = 0, mx = 0, my = 0;
  addEventListener('pointermove', (e) => { tmx = (e.clientX / innerWidth - .5); tmy = (e.clientY / innerHeight - .5); });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let onScreen = false;
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; if (onScreen) loop(); }, { threshold: .02 }).observe(canvas);

  let t = 0;
  function loop() {
    if (!onScreen || document.hidden) return;
    requestAnimationFrame(loop); t += 0.016;
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    shapes.forEach((s) => {
      if (!reduce) { s.rotation.x += s.userData.sp * 0.01; s.rotation.y += s.userData.sp * 0.013; }
      s.position.y += Math.sin(t * 0.5 + s.userData.fy) * 0.002;
    });
    scene.rotation.y = mx * 0.4; scene.rotation.x = my * 0.25;
    renderer.render(scene, camera);
  }
  loop();
})();
