// Bridges the modern Three.js ES module build to a global `THREE`, so the
// rest of the site's scripts can use the classic `THREE.Xxx` API without
// pulling in the deprecated non-module build or an external CDN.
import * as THREE from './three.module.min.js';

window.THREE = THREE;
