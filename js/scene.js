// Three.js scenes: chrome monogram (hero), point-cloud globe (toolbox), dark water droplet (contact).
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

/* ---------- Contact: dark matte water droplet that follows the cursor ---------- */
// Soft studio: one large diffuse light above and a dim fill, so the drop reads dark with a satin sheen
// instead of bright mirror edges.
function softEnv(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020203);
  const lit = (w, h, x, y, z, k, c = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  lit(9, 6, -1, 7, 4, 3.2);              // big soft key above
  lit(10, 4, 0, -6, 3, 0.25, 0x7cc0ff);  // faint cool bounce from below
  lit(4, 6, 6, 1, 6, 0.35);              // dim fill
  const pmrem = new THREE.PMREMGenerator(renderer);
  return pmrem.fromScene(env, 0.05).texture;
}

async function blob() {
  const canvas = document.getElementById("blob");
  const renderer = canvas && makeRenderer(canvas);
  if (!renderer) return;
  const { MarchingCubes } = await import("three/addons/objects/MarchingCubes.js");
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.environment = softEnv(renderer);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  // dark water: deep blue-black body, satin (not mirror) surface
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0f16, metalness: 0.0, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.45,
    sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x22324d), envMapIntensity: 1.15,
  });
  const balls = new MarchingCubes(56, mat, false, false, 60000);
  const SCALE = 4.1;
  balls.scale.setScalar(SCALE);
  scene.add(balls);

  // ---- cursor following: map the pointer onto the droplet's volume (0..1 on each axis) ----
  const card = canvas.parentElement;
  const target = { x: 0.5, y: 0.52 }, head = { x: 0.5, y: 0.52 }, tail = { x: 0.5, y: 0.52 };
  let hovering = false;
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  card.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      // keep the whole drop inside the visible card: limit by the camera's view minus the drop's radius
      const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = halfH * camera.aspect, R = 1.95;
      const lx = Math.max(0, halfW - R) / (2 * SCALE), ly = Math.max(0, halfH - R) / (2 * SCALE);
      target.x = Math.min(0.5 + lx, Math.max(0.5 - lx, (hit.x / SCALE + 1) / 2));
      target.y = Math.min(0.52 + ly, Math.max(0.52 - ly, (hit.y / SCALE + 1) / 2));
      hovering = true;
    }
  });
  card.addEventListener("pointerleave", () => { hovering = false; target.x = 0.5; target.y = 0.52; });

  // Small droplets rise, merge into the main drop wherever it is, then pinch off and float away.
  const N = 5, T = 14;
  const seeds = Array.from({ length: N }, (_, i) => ({
    sx: 0.2 + ((i * 0.37) % 0.6), ex: 0.22 + ((i * 0.53 + 0.3) % 0.56),
    z: 0.44 + ((i * 0.29) % 0.12), str: 0.22 + ((i * 0.17) % 0.14),
  }));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeIn = (x) => x * x * x;
  const mix = (a, b, k) => a + (b - a) * k;

  run(canvas, renderer, scene, camera, (t) => {
    // the head chases the cursor; the tail lags behind, which stretches the drop like liquid
    const k = hovering ? 0.09 : 0.04;
    head.x += (target.x - head.x) * k;  head.y += (target.y - head.y) * k;
    tail.x += (head.x - tail.x) * 0.06; tail.y += (head.y - tail.y) * 0.06;
    const wob = hovering ? 0.012 : 0.035;
    const hx = head.x + Math.sin(t * 0.5) * wob, hy = head.y + Math.cos(t * 0.4) * wob;

    balls.reset();
    balls.addBall(hx, hy, 0.5, 1.0, 12);
    balls.addBall(tail.x, tail.y, 0.5, 0.45, 12);
    seeds.forEach((d, i) => {
      const ph = (t / T + i / N) % 1;
      let x, y;
      if (ph < 0.45) { const q = easeOut(ph / 0.45); x = mix(d.sx, hx, q); y = mix(-0.2, hy, q); }
      else { const q = easeIn((ph - 0.45) / 0.55); x = mix(hx, d.ex, q); y = mix(hy, 1.25, q); }
      balls.addBall(x, y, d.z, d.str, 12);
    });
    balls.update();
    balls.rotation.y = Math.sin(t * 0.2) * 0.12;
  });
}

chromeMonogram();
globe();
blob();
