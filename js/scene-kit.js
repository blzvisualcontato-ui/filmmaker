/**
 * Shared parts for the site's 3D scenes.
 *
 * The hero and the turntable both build from this, so the camera body is
 * authored once and the studio environment, materials and geometry helpers are
 * not duplicated across two modules.
 */
import * as THREE from './vendor/three.module.min.js';

export const TERRA = 0xB85C38;
export const CREAM = 0xF7EFE6;

/* ----------------------------------------------------------------- helpers */

/**
 * A box with real bevelled edges.
 *
 * Hard 90-degree corners are what made the old body read as a toy: an edge with
 * no bevel catches no highlight, so the silhouette goes dead. A small rounded
 * edge picks up a specular line and is most of the difference between "blocky"
 * and "machined".
 */
export function roundedBox(w, h, d, r = 0.03, curve = 3) {
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
 * however many lights are added. Two soft boxes, a warm floor bounce and a cool
 * kicker are what give the bodies their rolled highlights.
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

/** The small monochrome top plate readout on the camera. */
function topLcdTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#8d9a86'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#1b201a';
  x.font = 'bold 46px Helvetica, Arial, sans-serif';
  x.fillText('4K', 14, 56);
  x.font = 'bold 30px Helvetica, Arial, sans-serif';
  x.fillText('60p', 96, 54);
  x.font = 'bold 26px Helvetica, Arial, sans-serif';
  x.fillText('f/1.4', 14, 100);
  x.fillText('ISO 400', 104, 100);
  for (let i = 0; i < 5; i++) { x.fillRect(196 + i * 11, 20 + (4 - i) * 3, 7, 12 + i * 4); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The articulated rear monitor, showing a framed shot mid-record. */
function rearScreenTexture() {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 214;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 320, 214);
  g.addColorStop(0, '#c9743f'); g.addColorStop(.5, '#6d3520'); g.addColorStop(1, '#140e0b');
  x.fillStyle = g; x.fillRect(0, 0, 320, 214);

  x.strokeStyle = 'rgba(247,239,230,.30)'; x.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    x.beginPath(); x.moveTo((320 / 3) * i, 12); x.lineTo((320 / 3) * i, 202); x.stroke();
    x.beginPath(); x.moveTo(12, (214 / 3) * i); x.lineTo(308, (214 / 3) * i); x.stroke();
  }
  x.strokeStyle = 'rgba(247,239,230,.85)'; x.lineWidth = 3;
  [[26, 26, 1, 1], [294, 26, -1, 1], [26, 188, 1, -1], [294, 188, -1, -1]].forEach(([px, py, sx, sy]) => {
    x.beginPath(); x.moveTo(px, py + 20 * sy); x.lineTo(px, py); x.lineTo(px + 22 * sx, py); x.stroke();
  });
  x.fillStyle = '#e2432c';
  x.beginPath(); x.arc(40, 200, 7, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(247,239,230,.92)';
  x.font = 'bold 15px Helvetica, Arial, sans-serif';
  x.fillText('REC  00:12', 54, 206);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The phone screen: a reels editor mid-edit. */
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

/* ------------------------------------------------------------- the camera */

/**
 * A professional camera body with a fast prime.
 *
 * Returns { group, focusRing } so a caller can spin the focus ring
 * independently of the body.
 */
export function buildCamera(M, { hood = true } = {}) {
  const cam = new THREE.Group();
  const add = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); cam.add(mesh); return mesh; };

  /* --- body --- */
  add(new THREE.Mesh(roundedBox(1.16, 0.78, 0.44, 0.06), M.shell));
  // inset top plate in metal, so the body reads as two machined parts
  add(new THREE.Mesh(roundedBox(1.1, 0.1, 0.4, 0.035), M.metalDark), 0, 0.37, 0);

  // sculpted grip
  const grip = add(new THREE.Mesh(roundedBox(0.3, 0.8, 0.46, 0.09), M.rubber), 0.46, -0.03, 0.02);
  grip.scale.z = 1.04;
  add(new THREE.Mesh(roundedBox(0.19, 0.16, 0.18, 0.05), M.rubber), 0.42, 0.33, -0.16);
  // finger ridge on the grip front
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.44, 4, 10), M.rubber), 0.6, -0.05, 0.14);

  /* --- pentaprism, eyecup, hot shoe --- */
  const prism = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.22, 4), M.shell), -0.07, 0.47, -0.02);
  prism.rotation.y = Math.PI / 4;
  add(new THREE.Mesh(roundedBox(0.26, 0.17, 0.1, 0.04), M.rubber), -0.07, 0.42, -0.24);

  const shoe = add(new THREE.Mesh(roundedBox(0.17, 0.05, 0.14, 0.012), M.metalDark), -0.07, 0.6, -0.02);
  shoe.castShadow = false;
  const pin = new THREE.BoxGeometry(0.018, 0.022, 0.018);
  [-0.045, 0, 0.045].forEach((ox) => add(new THREE.Mesh(pin, M.metal), -0.07 + ox, 0.625, -0.02));

  /* --- top plate controls --- */
  const lcd = add(new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshStandardMaterial({
    map: topLcdTexture(), roughness: .5, metalness: .05,
  })), -0.42, 0.425, 0.02);
  lcd.rotation.x = -Math.PI / 2;

  const dial = add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.055, 26), M.metalDark), 0.4, 0.42, -0.06);
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.056, 0.024), M.metal, 12);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      v.set(Math.cos(a) * 0.079, 0.03, Math.sin(a) * 0.079);
      e.set(0, -a, 0);
      m.compose(v, q.setFromEuler(e), one);
      ticks.setMatrixAt(i, m);
    }
  }
  add(ticks, 0.4, 0.42, -0.06);
  dial.rotation.y = 0.2;

  add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 20), M.terra), 0.44, 0.43, 0.15);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), M.metalDark), 0.2, 0.42, 0.12);

  /* --- rear monitor, articulated slightly open --- */
  const screenHinge = new THREE.Group();
  screenHinge.position.set(-0.52, -0.02, -0.22);
  screenHinge.rotation.y = 0.34;
  cam.add(screenHinge);
  const panel = new THREE.Mesh(roundedBox(0.62, 0.44, 0.035, 0.02), M.shellDark);
  panel.position.set(0.29, 0, 0);
  screenHinge.add(panel);
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.37), new THREE.MeshStandardMaterial({
    map: rearScreenTexture(), emissiveMap: rearScreenTexture(), emissive: 0xffffff,
    emissiveIntensity: .5, roughness: .22, metalness: .05,
  }));
  rear.position.set(0.29, 0, -0.021);
  rear.rotation.y = Math.PI;
  screenHinge.add(rear);

  /* --- strap lugs, ports door, tripod plate --- */
  const lug = new THREE.TorusGeometry(0.045, 0.014, 8, 16);
  [[-0.6, 0.3], [0.6, 0.3]].forEach(([lx, ly]) => {
    const l = add(new THREE.Mesh(lug, M.metal), lx, ly, 0);
    l.rotation.y = Math.PI / 2;
  });
  add(new THREE.Mesh(roundedBox(0.03, 0.34, 0.26, 0.015), M.rubber), -0.585, -0.06, 0.02);
  add(new THREE.Mesh(roundedBox(0.34, 0.06, 0.3, 0.02), M.metalDark), 0.02, -0.4, 0);

  /* --- front plate --- */
  add(new THREE.Mesh(roundedBox(0.3, 0.024, 0.014, 0.008), M.terra), -0.38, 0.28, 0.222);
  const lamp = add(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.016, 14), M.darkGlass), -0.43, 0.09, 0.222);
  lamp.rotation.x = Math.PI / 2;
  const release = add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 14), M.metalDark), 0.25, -0.06, 0.222);
  release.rotation.x = Math.PI / 2;

  /* --- lens --- */
  const mount = add(new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.04, 12, 40), M.metal), -0.06, 0, 0.235);
  mount.rotation.x = Math.PI / 2;

  const barrelBack = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.268, 0.3, 32), M.shellDark), -0.06, 0, 0.39);
  barrelBack.rotation.x = Math.PI / 2;

  // zoom ring, then the focus ring the caller can turn
  const zoom = new THREE.Group();
  zoom.position.set(-0.06, 0, 0.55);
  cam.add(zoom);
  zoom.add(new THREE.Mesh(new THREE.CylinderGeometry(0.248, 0.248, 0.12, 30), M.shellDark).rotateX(Math.PI / 2));
  zoom.add(knurlRing(M.metalDark, { radius: 0.254, count: 48, w: 0.012, depth: 0.02, len: 0.1 }));

  const focusRing = new THREE.Group();
  focusRing.position.set(-0.06, 0, 0.72);
  cam.add(focusRing);
  focusRing.add(new THREE.Mesh(new THREE.CylinderGeometry(0.242, 0.242, 0.17, 30), M.shellDark).rotateX(Math.PI / 2));
  focusRing.add(knurlRing(M.metalDark, { radius: 0.248, count: 64, w: 0.014, depth: 0.026, len: 0.15 }));

  // distance window
  const win = add(new THREE.Mesh(roundedBox(0.16, 0.06, 0.01, 0.008), M.darkGlass), -0.06, 0.25, 0.46);
  win.rotation.x = -0.1;

  const barrelFront = add(new THREE.Mesh(new THREE.CylinderGeometry(0.222, 0.242, 0.2, 30), M.shellDark), -0.06, 0, 0.9);
  barrelFront.rotation.x = Math.PI / 2;

  const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.224, 0.017, 8, 40), M.terra), -0.06, 0, 0.985);
  band.rotation.x = Math.PI / 2;

  const bezel = add(new THREE.Mesh(new THREE.TorusGeometry(0.206, 0.022, 10, 40), M.metal), -0.06, 0, 1.03);
  bezel.rotation.x = Math.PI / 2;

  // Nearly flat: a front element is close to planar, and the depth comes from
  // the stack behind it rather than from bulging the glass out.
  const front = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), M.coated,
  ), -0.06, 0, 1.015);
  front.rotation.x = Math.PI / 2;
  front.scale.set(1, 0.13, 1);

  const retainer = add(new THREE.Mesh(new THREE.TorusGeometry(0.188, 0.009, 8, 36), M.metalDark), -0.06, 0, 1.017);
  retainer.rotation.x = Math.PI / 2;

  const inner = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 26, 10, 0, Math.PI * 2, 0, Math.PI / 2.3), M.coatedInner,
  ), -0.06, 0, 0.975);
  inner.rotation.x = Math.PI / 2;
  inner.scale.set(1, 0.16, 1);

  const iris = add(new THREE.Mesh(new THREE.CircleGeometry(0.088, 7), M.terra), -0.06, 0, 0.945);
  iris.rotation.z = Math.PI / 7;
  const irisCore = add(new THREE.Mesh(new THREE.CircleGeometry(0.05, 7),
    new THREE.MeshBasicMaterial({ color: 0x0a0705 })), -0.06, 0, 0.948);
  irisCore.rotation.z = Math.PI / 7;

  if (hood) {
    // A hood has to be dead matte: on a thin open cylinder the body's clearcoat
    // catches so much specular that it reads as a glass bulb over the lens.
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x171310, metalness: .02, roughness: .96, side: THREE.DoubleSide,
    });
    const h = add(new THREE.Mesh(
      new THREE.CylinderGeometry(0.285, 0.216, 0.42, 30, 1, true), hoodMat,
    ), -0.06, 0, 1.24);
    h.rotation.x = Math.PI / 2;
    const lip = add(new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.011, 8, 40), hoodMat), -0.06, 0, 1.45);
    lip.rotation.x = Math.PI / 2;
    // ribbed inner wall, the way a real hood kills reflections
    const ribs = knurlRing(hoodMat, { radius: 0.24, count: 40, w: 0.01, depth: 0.016, len: 0.36 });
    add(ribs, -0.06, 0, 1.24);
  }

  return { group: cam, focusRing };
}

/* -------------------------------------------------------- the other gear */

/** A fast prime standing on its mount, cap off. */
export function buildLens(M) {
  const g = new THREE.Group();
  const add = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  const barrel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.9, 32), M.shellDark), 0, 0, 0);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.04, 12, 40), M.metal), 0, -0.44, 0).rotation.x = Math.PI / 2;
  const kn = knurlRing(M.metalDark, { radius: 0.312, count: 60, w: 0.016, depth: 0.028, len: 0.26 });
  kn.rotation.x = Math.PI / 2;
  add(kn, 0, 0.06, 0);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.288, 0.018, 8, 40), M.terra), 0, 0.36, 0).rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.024, 10, 40), M.metal), 0, 0.45, 0).rotation.x = Math.PI / 2;
  const glass = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.245, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), M.coated,
  ), 0, 0.45, 0);
  glass.scale.set(1, 0.16, 1);
  return g;
}

/** Clapperboard, sticks slightly open. */
export function buildClapper(M) {
  const g = new THREE.Group();
  const slate = new THREE.Mesh(roundedBox(1.2, 0.9, 0.05, 0.03), M.shellDark);
  g.add(slate);
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(roundedBox(1.06, 0.018, 0.008, 0.004), M.cream);
    line.position.set(0, 0.22 - i * 0.19, 0.03);
    g.add(line);
  }
  const stickHinge = new THREE.Group();
  stickHinge.position.set(-0.6, 0.5, 0);
  stickHinge.rotation.z = -0.32;
  g.add(stickHinge);
  const stick = new THREE.Mesh(roundedBox(1.2, 0.17, 0.05, 0.02), M.shellDark);
  stick.position.set(0.6, 0, 0);
  stickHinge.add(stick);
  // diagonal stripes
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(roundedBox(0.1, 0.17, 0.012, 0.004), i % 2 ? M.cream : M.terra);
    s.position.set(0.14 + i * 0.2, 0, 0.03);
    s.rotation.z = 0.32;
    stickHinge.add(s);
  }
  return g;
}

/** LED panel on a stand. */
export function buildLight(M) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(roundedBox(1.0, 0.72, 0.14, 0.04), M.shell);
  head.position.y = 0.62;
  g.add(head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.6), new THREE.MeshStandardMaterial({
    color: 0xE8DFD2, emissive: 0xffeed8, emissiveIntensity: .55, roughness: .6,
  }));
  face.position.set(0, 0.62, 0.075);
  g.add(face);
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 8, 24, Math.PI), M.metalDark);
  yoke.position.y = 0.62;
  yoke.rotation.z = Math.PI;
  g.add(yoke);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 16), M.metal);
  post.position.y = -0.25;
  g.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.06, 24), M.metalDark);
  base.position.y = -0.7;
  g.add(base);
  return g;
}

/** Shotgun mic in a shock mount. */
export function buildMic(M) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.3, 24), M.metalDark);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.113, 0.113, 0.62, 24), M.rubber);
  grille.rotation.z = Math.PI / 2;
  grille.position.x = 0.3;
  g.add(grille);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 12), M.metal);
  cap.position.x = -0.65;
  g.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 24), M.terra);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = -0.02;
  g.add(ring);
  [-0.3, 0.15].forEach((x) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 8, 26), M.metal);
    m.rotation.y = Math.PI / 2;
    m.position.x = x;
    g.add(m);
  });
  const bar = new THREE.Mesh(roundedBox(0.62, 0.05, 0.05, 0.02), M.metalDark);
  bar.position.y = -0.22;
  g.add(bar);
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
