// Three.js scenes: chrome monogram (hero), point-cloud globe (skills), shape-blend liquid that follows the cursor (contact).
import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mouse = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = e.clientX / window.innerWidth - 0.5;
  mouse.y = e.clientY / window.innerHeight - 0.5;
});

function makeRenderer(canvas) {
  try {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  } catch {
    return null;
  }
}

function chromeEnv(renderer) {
  // A black studio with a few bright softboxes: gives chrome dark bodies and crisp highlights.
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x000000);
  const box = (w, h, x, y, z, ry, c = 0xffffff, k = 6) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    if (ry) m.rotation.z = ry;
    env.add(m);
  };
  box(10, 1.2, 0, 7, 2, 0);               // top strip
  box(1.4, 9, -8, 0, 3, 0);               // left tall softbox
  box(1, 7, 8, 1, -2, 0, 0xffffff, 4);    // right rim
  box(6, 0.6, 0, -6, 4, 0.4, 0x6fb2ff, 4); // cool floor bounce
  box(3, 3, 3, 3, 8, 0, 0xffffff, 2.5);   // front fill
  const pmrem = new THREE.PMREMGenerator(renderer);
  return pmrem.fromScene(env, 0.02).texture;
}

// Shared loop: each scene renders only while its canvas is on screen.
function run(canvas, renderer, scene, camera, update) {
  let visible = false;
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  const clock = new THREE.Clock();
  const frame = () => { update(clock.getElapsedTime()); renderer.render(scene, camera); };
  if (reduceMotion) { frame(); setTimeout(frame, 400); return; }
  renderer.setAnimationLoop(() => { if (visible) frame(); });
}

/* ---------- Hero: extruded chrome "M" ---------- */
function chromeMonogram() {
  const canvas = document.getElementById("chrome");
  const renderer = canvas && makeRenderer(canvas);
  if (!renderer) return;
  const scene = new THREE.Scene();
  scene.environment = chromeEnv(renderer);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const key = new THREE.PointLight(0x4f9dff, 60, 30);
  key.position.set(-4, 3, 5);
  const rim = new THREE.PointLight(0xffffff, 80, 30);
  rim.position.set(4, -2, 4);
  const top = new THREE.DirectionalLight(0xffffff, 3);
  top.position.set(-2, 6, 4);
  scene.add(key, rim, top);

  const group = new THREE.Group();
  scene.add(group);

  new FontLoader().load(
    "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json",
    (font) => {
      const geo = new TextGeometry("M", {
        font, size: 2.7, height: 0.8, curveSegments: 16,
        bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.09, bevelSegments: 10,
      });
      geo.center();
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 1, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      group.scale.setScalar(0.01);
    }
  );

  // a thin orbit ring for depth
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.3, 0.018, 16, 200),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.2 })
  );
  ring.rotation.x = 1.25;
  scene.add(ring);

  let intro = 0;
  run(canvas, renderer, scene, camera, (t) => {
    intro = Math.min(1, intro + 0.02);
    const s = 1 - Math.pow(1 - intro, 3);
    if (group.children.length) group.scale.setScalar(Math.max(0.01, s));
    group.rotation.y = Math.sin(t * 0.6) * 0.65 + mouse.x * 0.8;
    group.rotation.x = Math.sin(t * 0.4) * 0.12 + mouse.y * 0.4;
    group.position.y = Math.sin(t * 1.1) * 0.12;
    ring.rotation.z = t * 0.25;
    ring.rotation.y = mouse.x * 0.3;
  });
}

/* ---------- Toolbox: point-cloud globe ---------- */
function globe() {
  const canvas = document.getElementById("globe");
  const renderer = canvas && makeRenderer(canvas);
  if (!renderer) return;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);
  const N = 2200, R = 2.2;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
    pos.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdcebff, size: 0.05, transparent: true, opacity: 0.95, depthWrite: false }));
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 48), new THREE.MeshBasicMaterial({ color: 0x05070c }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 48, 48), new THREE.MeshBasicMaterial({ color: 0x2f8cff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.BackSide }));
  const globeGroup = new THREE.Group();
  pts.renderOrder = 2;
  globeGroup.add(core, halo, pts);
  globeGroup.rotation.z = 0.35;
  scene.add(globeGroup);
  run(canvas, renderer, scene, camera, (t) => { globeGroup.rotation.y = t * 0.18; });
}

/* ---------- Contact: shape-blend liquid (ray-marched signed distance fields) ---------- */
// Two spheres joined with a smooth union: a large one fixed in the middle and a smaller one that sits
// under the cursor. As they approach, the surfaces melt together with a gooey neck. Shaded as glossy
// black with a curved 2x2 window reflection and a faint grey lower rim, rendered per pixel.
const BLOB_FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uMain;
uniform vec3 uFollow;
uniform float uRMain;
uniform float uRFollow;
varying vec2 vUv;

float sdSphere(vec3 p, vec3 c, float r) { return length(p - c) - r; }
float smin(float a, float b, float k) {           // polynomial smooth minimum = "shape blend"
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float map(vec3 p) {
  float breathe = 1.0 + 0.015 * sin(uTime * 1.3);
  float a = sdSphere(p, uMain, uRMain * breathe);
  float b = sdSphere(p, uFollow, uRFollow);
  return smin(a, b, 0.32);
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0008, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}
// studio: a large 2x2 window above and slightly in front of the drop
float windowLight(vec3 r) {
  if (r.y < 0.02) return 0.0;
  vec3 hit = r * (1.3 / r.y);                    // window plane at y = 1.3
  vec2 q = vec2(hit.x, hit.z - 0.7);
  float half_ = 2.4;
  vec2 cell = abs(q) - vec2(0.09);               // dark mullions forming the 2x2 grid
  float inside = step(0.0, min(cell.x, cell.y)) * step(max(abs(q.x), abs(q.y)), half_);
  float fade = smoothstep(half_, half_ * 0.55, max(abs(q.x), abs(q.y)));
  return inside * mix(0.35, 1.0, fade);
}

void main() {
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  vec3 ro = vec3(0.0, 0.0, 5.0);
  vec3 rd = normalize(vec3(uv * 0.28, -1.0));      // ~31 degree vertical field of view
  float t = 0.0, d = 1.0, minD = 1e9;
  for (int i = 0; i < 90; i++) {
    vec3 p = ro + rd * t;
    d = map(p);
    minD = min(minD, d);
    if (d < 0.0006 || t > 9.0) break;
    t += d;
  }
  if (d > 0.002) {                                 // miss: transparent, with a soft anti-aliased edge
    float edge = 1.0 - smoothstep(0.0, 1.6 / uRes.y, minD);
    gl_FragColor = vec4(vec3(0.02), edge * 0.0);
    return;
  }
  vec3 p = ro + rd * t;
  vec3 n = normalAt(p);
  vec3 r = reflect(rd, n);
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  float refl = mix(0.42, 1.0, fres);               // glossy black lacquer
  float lower = smoothstep(-0.25, -0.95, r.y) * (0.2 + 0.8 * fres) * 0.11;  // faint grey lower rim
  vec3 col = vec3(0.0006) + vec3(windowLight(r)) * refl * 0.85 + vec3(lower);
  col = pow(col, vec3(1.0 / 2.2));                 // to sRGB
  gl_FragColor = vec4(col, 1.0);
}`;

function blob() {
  const canvas = document.getElementById("blob");
  const renderer = canvas && makeRenderer(canvas);
  if (!renderer) return;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
    uMain: { value: new THREE.Vector3(0, 0.02, 0) }, uFollow: { value: new THREE.Vector3(0.22, -0.42, 0) },
    uRMain: { value: 0.46 }, uRFollow: { value: 0.24 },
  };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, transparent: true,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: BLOB_FRAG,
  }));
  scene.add(quad);

  // the ray setup in the shader maps screen y in [-1,1] to world y = y * 0.28 * 5 at the z=0 plane
  const SPAN = 0.28 * 5.0;
  const card = canvas.parentElement;
  const aim = new THREE.Vector3(0.22, -0.42, 0), idle = new THREE.Vector3(0.22, -0.42, 0);
  let hovering = false;
  card.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * 2 - 1, sy = -(((e.clientY - r.top) / r.height) * 2 - 1);
    aim.set(sx * SPAN * (r.width / r.height), sy * SPAN, 0);
    hovering = true;
  });
  card.addEventListener("pointerleave", () => { hovering = false; });

  run(canvas, renderer, scene, camera, (t) => {
    uniforms.uRes.value.set(canvas.width, canvas.height);
    uniforms.uTime.value = t;
    if (!hovering) {   // idle: the small sphere rests against the big one, drifting slightly
      idle.set(0.22 + Math.sin(t * 0.6) * 0.06, -0.42 + Math.cos(t * 0.5) * 0.04, 0);
      aim.copy(idle);
    }
    uniforms.uFollow.value.lerp(aim, hovering ? 0.2 : 0.05);
  });
}

chromeMonogram();
globe();
blob();
