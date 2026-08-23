/**
 * Shared parts for the site's 3D scenes.
 *
 * Everything modelled here is kit BLZ Visual actually owns: a phone, a
 * three-axis gimbal, a clip-on macro lens and a lavalier mic. Nothing in the
 * scenes should imply gear that is not in the bag.
 */
import * as THREE from './vendor/three.module.min.js';

export const TERRA = 0xB85C38;
export const CREAM = 0xF7EFE6;

/* ----------------------------------------------------------------- helpers */

/**
 * A box with real bevelled edges.
 *
 * A hard 90-degree corner catches no highlight, so the silhouette goes dead. A
 * small rounded edge picks up a specular line and is most of the difference
 * between "blocky" and "machined".
 */
export function roundedBox(w, h, d, r = 0.03, curve = 3) {
  // The radius has to fit inside all three dimensions. Without this clamp a
  // thin part with a generous radius silently came out 2r deep instead of d,
  // so two parts of different thicknesses could end up exactly coplanar and
  // fight for the same depth — which is what made surfaces crawl on phones.
  r = Math.max(0.0008, Math.min(r, d / 2 - 0.0005, w / 2 - 0.001, h / 2 - 0.001));
  const x = w / 2 - r, y = h / 2 - r;
  const s = new THREE.Shape();
  s.moveTo(-x - r, -y);
  s.lineTo(-x - r, y);
  s.quadraticCurveTo(-x - r, y + r, -x, y + r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x + r, y + r, x + r, y);
  s.lineTo(x + r, -y);
  s.quadraticCurveTo(x + r, -y - r, x, -y - r);
  s.lineTo(-x, -y - r);
  s.quadraticCurveTo(-x - r, -y - r, -x - r, -y);

  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(d - r * 2, 0.001),
    bevelEnabled: true, bevelThickness: r, bevelSize: r,
    bevelSegments: curve, curveSegments: curve,
  });
  g.center();
  return g;
}

/** A ring of ridges as a single instanced draw — knurling for grip rings. */
export function knurlRing(material, { radius, count = 56, w = 0.014, depth = 0.026, len = 0.15 }) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(w, depth, len), material, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    v.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    e.set(0, 0, a + Math.PI / 2);
    m.compose(v, q.setFromEuler(e), one);
    mesh.setMatrixAt(i, m);
  }
  return mesh;
}

/* ------------------------------------------------------------ environment */

/**
 * Studio lighting, painted to a canvas and prefiltered.
 *
 * Metallic and clearcoat surfaces take nearly all their brightness from
 * reflections, so with no environment they render as flat near-black shapes
 * however many lights are added.
 */
export function studioEnvironment(renderer) {
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
    x.translate(cx, cy); x.scale(1, ry / rx); x.translate(-cx, -cy);
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, rx, 0, Math.PI * 2); x.fill();
    x.restore();
  };
  glow(118, 50, 108, 54, '#ffffff', 1.0);
  glow(370, 64, 84, 46, '#fff1e2', 0.85);
  glow(256, 214, 152, 58, '#B85C38', 0.42);
  glow(470, 148, 62, 62, '#9fbecd', 0.30);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

/** Soft blob used as a contact shadow so objects sit on something. */
export function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0.00, 'rgba(28,25,23,.62)');
  g.addColorStop(0.45, 'rgba(28,25,23,.24)');
  g.addColorStop(1.00, 'rgba(28,25,23,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* -------------------------------------------------------------- materials */

export function makeMaterials() {
  return {
    shell: new THREE.MeshPhysicalMaterial({
      color: 0x3a3430, metalness: .5, roughness: .36, clearcoat: .5, clearcoatRoughness: .3,
    }),
    shellDark: new THREE.MeshPhysicalMaterial({
      color: 0x28231f, metalness: .48, roughness: .4, clearcoat: .42, clearcoatRoughness: .32,
    }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9a938b, metalness: .96, roughness: .25 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x544f4a, metalness: .9, roughness: .38 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1d1712, metalness: .04, roughness: .94 }),
    foam: new THREE.MeshStandardMaterial({ color: 0x2b2521, metalness: 0, roughness: 1 }),
    terra: new THREE.MeshPhysicalMaterial({ color: TERRA, metalness: .35, roughness: .3, clearcoat: .6 }),
    cream: new THREE.MeshStandardMaterial({ color: CREAM, metalness: .12, roughness: .48 }),
    coated: new THREE.MeshPhysicalMaterial({
      color: 0x0d1a12, metalness: .98, roughness: .04,
      clearcoat: 1, clearcoatRoughness: .02, emissive: 0x1d4a2e, emissiveIntensity: .09,
    }),
    coatedInner: new THREE.MeshPhysicalMaterial({
      color: 0x070d09, metalness: .95, roughness: .06,
      clearcoat: 1, emissive: 0x123020, emissiveIntensity: .07,
    }),
    darkGlass: new THREE.MeshPhysicalMaterial({
      color: 0x241f1c, metalness: .9, roughness: .1, clearcoat: 1,
      emissive: TERRA, emissiveIntensity: .1,
    }),
  };
}

/* ---------------------------------------------------------------- screens */

/** The phone screen: a reels editor mid-edit, so it reads as in use. */
export function phoneScreenTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#2b1f16'); bg.addColorStop(1, '#0c0908');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 512);

  x.fillStyle = 'rgba(247,239,230,.55)';
  x.fillRect(20, 20, 44, 5); x.fillRect(196, 20, 40, 5);

  const vw = x.createLinearGradient(20, 52, 236, 356);
  vw.addColorStop(0, '#B85C38'); vw.addColorStop(.55, '#6d3520'); vw.addColorStop(1, '#1a1210');
  x.fillStyle = vw; x.fillRect(20, 52, 216, 304);

  x.fillStyle = 'rgba(247,239,230,.92)';
  x.beginPath(); x.arc(128, 204, 34, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#1C1917';
  x.beginPath(); x.moveTo(118, 187); x.lineTo(118, 221); x.lineTo(146, 204); x.closePath(); x.fill();

  x.fillStyle = 'rgba(247,239,230,.18)'; x.fillRect(20, 372, 216, 5);
  x.fillStyle = '#B85C38'; x.fillRect(20, 372, 96, 5);
  for (let i = 0; i < 4; i++) {
    x.fillStyle = i === 1 ? 'rgba(184,92,56,.85)' : 'rgba(247,239,230,.16)';
    x.fillRect(20 + i * 55, 392, 48, 30);
  }
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

/* -------------------------------------------------------------- the phone */

/**
 * The phone. This is the camera on this job, so it carries the detail.
 *
 * Every surface detail sits a clear distance proud of the panel it belongs to.
 * Decals a fraction of a millimetre off their host face were what made the
 * textures shimmer on phones, where the depth buffer has less precision to
 * separate two nearly-coplanar surfaces.
 */
export function buildPhone(M) {
  const g = new THREE.Group();
  const add = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };

  add(new THREE.Mesh(roundedBox(0.7, 1.46, 0.078, 0.06), M.shellDark));
  // side band is wider than the body so it shows only at the rim, never
  // fighting the front or back face for the same depth
  add(new THREE.Mesh(roundedBox(0.726, 1.486, 0.052, 0.06), M.metal));

  const tex = phoneScreenTexture();
  add(new THREE.Mesh(new THREE.PlaneGeometry(0.63, 1.36), new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: 0xffffff,
    emissiveIntensity: .62, roughness: .22, metalness: .05,
  })), 0, 0, 0.05);

  const island = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.09, 4, 12), M.rubber), 0, 0.6, 0.056);
  island.rotation.z = Math.PI / 2;

  const btn = new THREE.BoxGeometry(0.018, 0.1, 0.04);
  [[-0.358, 0.34], [-0.358, 0.17]].forEach(([px, py]) => add(new THREE.Mesh(btn, M.metalDark), px, py, 0));
  add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.15, 0.04), M.terra), 0.358, 0.4, 0);

  // rear camera island, standing clearly proud of the back
  add(new THREE.Mesh(roundedBox(0.33, 0.33, 0.05, 0.05), M.shell), -0.16, 0.5, -0.062);
  const ring = new THREE.TorusGeometry(0.054, 0.014, 10, 24);
  const lens = new THREE.CylinderGeometry(0.046, 0.046, 0.03, 20);
  [[-0.07, 0.07], [0.07, 0.07], [-0.07, -0.07]].forEach(([ox, oy]) => {
    add(new THREE.Mesh(ring, M.metal), -0.16 + ox, 0.5 + oy, -0.094);
    const l = add(new THREE.Mesh(lens, M.darkGlass), -0.16 + ox, 0.5 + oy, -0.094);
    l.rotation.x = Math.PI / 2;
  });
  const flash = add(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.022, 16), M.cream), -0.09, 0.575, -0.09);
  flash.rotation.x = Math.PI / 2;

  return g;
}

/* ------------------------------------------------------------- the gimbal */

/** Three-axis handheld gimbal, phone clamped in. */
export function buildGimbal(M, { withPhone = true } = {}) {
  const g = new THREE.Group();

  /* handle */
  const handle = new THREE.Group();
  g.add(handle);
  handle.add(new THREE.Mesh(roundedBox(0.42, 1.15, 0.4, 0.14), M.shellDark));
  const grip = new THREE.Mesh(roundedBox(0.44, 0.66, 0.42, 0.15), M.rubber);
  grip.position.y = -0.16;
  handle.add(grip);
  // base cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.1, 20), M.metalDark);
  cap.position.y = -0.62;
  handle.add(cap);

  // control face: joystick, record button, mode button — each a distinct part
  const face = new THREE.Mesh(roundedBox(0.28, 0.5, 0.05, 0.03), M.shell);
  face.position.set(0, 0.16, 0.215);
  handle.add(face);
  const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.04, 18), M.metalDark);
  stickBase.rotation.x = Math.PI / 2;
  stickBase.position.set(0, 0.3, 0.255);
  handle.add(stickBase);
  const stick = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 12), M.rubber);
  stick.position.set(0, 0.3, 0.285);
  handle.add(stick);
  const rec = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 18), M.terra);
  rec.rotation.x = Math.PI / 2;
  rec.position.set(0, 0.08, 0.258);
  handle.add(rec);
  const mode = new THREE.Mesh(roundedBox(0.11, 0.05, 0.04, 0.015), M.metalDark);
  mode.position.set(0, -0.05, 0.256);
  handle.add(mode);

  /* motor arms: pan on the handle, then roll, then tilt into the clamp */
  const motorGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.26, 24);
  const collarGeo = new THREE.TorusGeometry(0.152, 0.022, 10, 26);

  const panMotor = new THREE.Mesh(motorGeo, M.shell);
  panMotor.position.y = 0.72;
  g.add(panMotor);
  const panCollar = new THREE.Mesh(collarGeo, M.metal);
  panCollar.rotation.x = Math.PI / 2;
  panCollar.position.y = 0.845;
  g.add(panCollar);

  const armA = new THREE.Mesh(roundedBox(0.13, 0.52, 0.14, 0.05), M.shellDark);
  armA.position.set(0, 1.06, 0);
  g.add(armA);

  const rollMotor = new THREE.Mesh(motorGeo, M.shell);
  rollMotor.rotation.z = Math.PI / 2;
  rollMotor.position.set(0.2, 1.32, 0);
  g.add(rollMotor);
  const rollCollar = new THREE.Mesh(collarGeo, M.metal);
  rollCollar.rotation.y = Math.PI / 2;
  rollCollar.position.set(0.33, 1.32, 0);
  g.add(rollCollar);

  const armB = new THREE.Mesh(roundedBox(0.5, 0.13, 0.14, 0.05), M.shellDark);
  armB.position.set(0.62, 1.32, 0);
  g.add(armB);

  const tiltMotor = new THREE.Mesh(motorGeo, M.shell);
  tiltMotor.rotation.x = Math.PI / 2;
  tiltMotor.position.set(0.86, 1.32, 0.12);
  g.add(tiltMotor);
  const tiltCollar = new THREE.Mesh(collarGeo, M.metal);
  tiltCollar.position.set(0.86, 1.32, 0.25);
  g.add(tiltCollar);

  /* clamp holding the phone */
  const cradle = new THREE.Group();
  cradle.position.set(0.86, 1.32, 0.46);
  g.add(cradle);
  const spine = new THREE.Mesh(roundedBox(0.13, 1.02, 0.12, 0.04), M.shellDark);
  cradle.add(spine);
  [[0.5], [-0.5]].forEach(([jy]) => {
    const jaw = new THREE.Mesh(roundedBox(0.18, 0.11, 0.42, 0.035), M.shellDark);
    jaw.position.set(0, jy, 0.17);
    cradle.add(jaw);
    const pad = new THREE.Mesh(roundedBox(0.11, 0.055, 0.38, 0.02), M.rubber);
    pad.position.set(0, jy + (jy > 0 ? -0.06 : 0.06), 0.17);
    cradle.add(pad);
  });

  if (withPhone) {
    // Held upright with the screen out — portrait, which is how a reel is shot
    // and the only orientation where the phone reads as a phone rather than a
    // sliver seen edge-on.
    const phone = buildPhone(M);
    phone.scale.setScalar(0.62);
    phone.position.set(0, 0, 0.23);
    cradle.add(phone);
  }

  return g;
}

/* --------------------------------------------------------- the macro lens */

/** Clip-on macro lens — the kind that clamps over a phone camera. */
export function buildMacroLens(M) {
  const g = new THREE.Group();

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.52, 32), M.shellDark);
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);

  const kn = knurlRing(M.metalDark, { radius: 0.312, count: 54, w: 0.016, depth: 0.026, len: 0.3 });
  g.add(kn);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.302, 0.02, 10, 40), M.terra);
  band.position.z = 0.2;
  g.add(band);

  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.028, 12, 40), M.metal);
  bezel.position.z = 0.27;
  g.add(bezel);

  const front = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), M.coated,
  );
  front.rotation.x = Math.PI / 2;
  front.scale.set(1, 0.15, 1);
  front.position.z = 0.255;
  g.add(front);

  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.3), M.coatedInner,
  );
  inner.rotation.x = Math.PI / 2;
  inner.scale.set(1, 0.2, 1);
  inner.position.z = 0.2;
  g.add(inner);

  const rear = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 10, 36), M.metal);
  rear.position.z = -0.27;
  g.add(rear);

  /* the spring clip */
  const clip = new THREE.Group();
  clip.position.z = -0.42;
  g.add(clip);
  const bridge = new THREE.Mesh(roundedBox(0.14, 0.9, 0.16, 0.045), M.shellDark);
  bridge.position.x = -0.42;
  clip.add(bridge);
  [[0.42], [-0.42]].forEach(([jy]) => {
    const arm = new THREE.Mesh(roundedBox(0.62, 0.13, 0.16, 0.045), M.shellDark);
    arm.position.set(-0.14, jy, 0);
    clip.add(arm);
    const pad = new THREE.Mesh(roundedBox(0.5, 0.06, 0.14, 0.025), M.rubber);
    pad.position.set(-0.1, jy + (jy > 0 ? -0.09 : 0.09), 0);
    clip.add(pad);
  });

  return g;
}

/* ---------------------------------------------------------- the lapel mic */

/** Lavalier mic: capsule with a foam windscreen, clip, cable and plug. */
export function buildLapelMic(M) {
  const g = new THREE.Group();

  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.42, 24), M.metalDark);
  capsule.position.y = 0.32;
  g.add(capsule);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.018, 10, 26), M.terra);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.14;
  g.add(collar);

  const foam = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), M.foam);
  foam.scale.y = 1.15;
  foam.position.y = 0.58;
  g.add(foam);

  /* clip */
  const clip = new THREE.Group();
  clip.position.set(0.18, 0.24, 0);
  clip.rotation.z = -0.12;
  g.add(clip);
  const back = new THREE.Mesh(roundedBox(0.09, 0.62, 0.24, 0.035), M.metal);
  clip.add(back);
  const front = new THREE.Mesh(roundedBox(0.07, 0.46, 0.22, 0.03), M.metal);
  front.position.set(0.16, -0.05, 0);
  clip.add(front);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 16), M.metalDark);
  hinge.rotation.x = Math.PI / 2;
  hinge.position.set(0.08, 0.28, 0);
  clip.add(hinge);

  /* cable, curling away to the plug */
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.08, 0),
    new THREE.Vector3(-0.1, -0.3, 0.16),
    new THREE.Vector3(-0.5, -0.62, -0.1),
    new THREE.Vector3(-1.0, -0.5, 0.24),
    new THREE.Vector3(-1.34, -0.86, 0.02),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 48, 0.035, 10, false), M.rubber));

  const plugBody = new THREE.Mesh(roundedBox(0.16, 0.3, 0.16, 0.05), M.shellDark);
  plugBody.position.set(-1.36, -0.98, 0.02);
  plugBody.rotation.z = 0.3;
  g.add(plugBody);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16), M.metal);
  pin.position.set(-1.42, -1.22, 0.02);
  pin.rotation.z = 0.3;
  g.add(pin);

  return g;
}

/* ------------------------------------------------------------------ rig */

/** Standard three-point lighting, shaped around whatever the environment does. */
export function addLights(scene) {
  scene.add(new THREE.AmbientLight(CREAM, .2));
  const key = new THREE.DirectionalLight(0xfff2e2, 1.85); key.position.set(4.2, 6, 6.5);
  const fill = new THREE.DirectionalLight(CREAM, .5); fill.position.set(-4, 1.4, 5);
  const rim = new THREE.DirectionalLight(TERRA, 1.45); rim.position.set(-5.5, -1.2, -2.5);
  const kick = new THREE.DirectionalLight(0x9fbecd, .55); kick.position.set(3, -3.5, -3);
  scene.add(key, fill, rim, kick);
}
