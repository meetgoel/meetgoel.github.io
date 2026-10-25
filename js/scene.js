// Three.js scenes: chrome monogram (hero), point-cloud globe (skills), interactive neural network (contact).
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

/* ---------- Contact: an interactive 3D neural network ---------- */
// Five layers of glowing neurons joined by synapses. Drag to spin (with inertia), hover a neuron to
// light up its connections and see a skill, click to fire a wave of signals through the layers.
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function brain() {
  const canvas = document.getElementById("brain");
  const renderer = canvas && makeRenderer(canvas);
  if (!renderer) return;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.2, 11.5);
  const net = new THREE.Group();
  net.rotation.set(0.18, -0.5, 0);
  scene.add(net);

  const LAYERS = [
    ["Python", "SQL", "Azure SQL", "Power Automate", "Excel data"],
    ["NLP", "Machine Learning", "Deep Learning", "Hugging Face", "scikit-learn", "LIME", "Qwen2.5"],
    ["Data modelling", "T-SQL", "Data quality", "Docker", "AWS EC2", "Power Apps", "SAP Signavio"],
    ["Generative AI", "AI agents", "LLM evaluation", "Power BI", "Forecasting", "Copilot Studio"],
    ["Insight", "Automation", "Impact"],
  ];
  const palette = [0x7cc0ff, 0x2f8cff, 0x8b7cff, 0xa66cff, 0x4ade80];
  const tex = glowTexture();
  const nodes = [];                 // {pos, layer, label, mesh, glow, flash}
  LAYERS.forEach((labels, li) => {
    const n = labels.length, R = 0.45 + n * 0.16;
    labels.forEach((label, k) => {
      const ang = (k / n) * Math.PI * 2 + li * 0.55;
      const pos = new THREE.Vector3((li - (LAYERS.length - 1) / 2) * 1.6, Math.cos(ang) * R, Math.sin(ang) * R);
      const color = new THREE.Color(palette[li]);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(li === LAYERS.length - 1 ? 0.15 : 0.1, 20, 20), new THREE.MeshBasicMaterial({ color }));
      mesh.position.copy(pos);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.copy(pos);
      glow.scale.setScalar(0.75);
      net.add(mesh, glow);
      nodes.push({ pos, layer: li, label, mesh, glow, flash: 0, idx: nodes.length });
      mesh.userData.node = nodes[nodes.length - 1];
    });
  });

  // synapses between consecutive layers
  const edges = [];
  for (const a of nodes) for (const b of nodes) if (b.layer === a.layer + 1) edges.push({ a, b, heat: 0 });
  const epos = new Float32Array(edges.length * 6), ecol = new Float32Array(edges.length * 6);
  edges.forEach((e, i) => { epos.set([e.a.pos.x, e.a.pos.y, e.a.pos.z, e.b.pos.x, e.b.pos.y, e.b.pos.z], i * 6); });
  const eg = new THREE.BufferGeometry();
  eg.setAttribute("position", new THREE.BufferAttribute(epos, 3));
  eg.setAttribute("color", new THREE.BufferAttribute(ecol, 3));
  net.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
  const outgoing = (n) => edges.filter((e) => e.a === n);

  // travelling signals
  const pulses = [];
  const pulseMat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  function send(edge, delay = 0) {
    const sp = new THREE.Sprite(pulseMat);
    sp.scale.setScalar(0.32);
    sp.visible = false;
    net.add(sp);
    pulses.push({ edge, t: -delay, speed: 0.9 + Math.random() * 0.5, sp });
  }
  function fire(from) {
    const starts = from ? [from] : nodes.filter((n) => n.layer === 0);
    starts.forEach((n, i) => {
      n.flash = 1;
      const out = outgoing(n).sort(() => Math.random() - 0.5).slice(0, from ? 4 : 2);
      out.forEach((e) => send(e, i * 0.08));
    });
  }

  // interaction: drag to spin, hover to inspect, click to fire
  const tip = document.getElementById("brain-tip");
  const card = canvas.parentElement;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let dragging = false, moved = 0, lastX = 0, lastY = 0, vy = 0.0025, vx = 0, hovered = null;
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(nodes.map((n) => n.mesh))[0];
    return hit ? hit.object.userData.node : null;
  };
  card.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; card.setPointerCapture(e.pointerId); });
  card.addEventListener("pointermove", (e) => {
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      vy = dx * 0.005; vx = dy * 0.003;
      net.rotation.y += vy; net.rotation.x = Math.max(-0.7, Math.min(0.7, net.rotation.x + vx));
      lastX = e.clientX; lastY = e.clientY;
    }
    hovered = pick(e);
  });
  card.addEventListener("pointerup", (e) => {
    dragging = false;
    if (moved < 6) fire(pick(e));   // a click, not a drag
  });
  card.addEventListener("pointerleave", () => { hovered = null; dragging = false; });

  const tmp = new THREE.Vector3();
  let last = 0, nextAuto = 1.2;
  run(canvas, renderer, scene, camera, (t) => {
    const dt = Math.min(0.05, t - last || 0.016);
    last = t;
    if (!dragging) {
      net.rotation.y += vy;
      vy += (0.0025 - vy) * 0.03;          // ease back to a gentle auto-spin
      net.rotation.x += (0.18 - net.rotation.x) * 0.02;
    }
    if (t > nextAuto) { fire(); nextAuto = t + 3.2; }

    // edges cool down; highlighted ones stay warm
    edges.forEach((e, i) => {
      const hot = hovered && (e.a === hovered || e.b === hovered) ? 1 : 0;
      e.heat = Math.max(e.heat * 0.94, hot * 0.9);
      const base = 0.07 + e.heat;
      const c = 0.35 + e.heat * 0.65;
      ecol.set([base * 0.5, base * c, base, base * 0.6, base * c, base], i * 6);
    });
    eg.attributes.color.needsUpdate = true;

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt * p.speed;
      if (p.t < 0) continue;
      p.sp.visible = true;
      p.edge.heat = Math.max(p.edge.heat, 0.8);
      p.sp.position.lerpVectors(p.edge.a.pos, p.edge.b.pos, Math.min(1, p.t));
      if (p.t >= 1) {
        const n = p.edge.b;
        n.flash = 1;
        if (n.layer < LAYERS.length - 1 && Math.random() < 0.75) {
          outgoing(n).sort(() => Math.random() - 0.5).slice(0, 2).forEach((e) => send(e));
        }
        net.remove(p.sp);
        pulses.splice(i, 1);
      }
    }
    if (pulses.length > 160) pulses.splice(0, pulses.length - 160).forEach((p) => net.remove(p.sp));

    nodes.forEach((n) => {
      n.flash *= 0.92;
      const h = n === hovered ? 1 : 0;
      n.mesh.scale.setScalar(1 + n.flash * 0.9 + h * 0.6);
      n.glow.scale.setScalar(0.75 + n.flash * 1.4 + h * 0.6);
      n.glow.material.opacity = 0.45 + n.flash * 0.55 + h * 0.4;
    });

    if (hovered) {
      hovered.mesh.getWorldPosition(tmp).project(camera);
      tip.hidden = false;
      tip.textContent = hovered.label;
      tip.style.left = `${((tmp.x + 1) / 2) * canvas.clientWidth}px`;
      tip.style.top = `${((1 - tmp.y) / 2) * canvas.clientHeight}px`;
    } else tip.hidden = true;
  });
}

chromeMonogram();
globe();
brain();
