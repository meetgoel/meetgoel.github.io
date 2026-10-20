const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ---------- 3D hero: a rotating point-cloud globe with a wireframe core ---------- */
function initScene() {
  const canvas = document.getElementById("scene");
  if (!canvas || !window.THREE) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    return; // no WebGL: the CSS glow behind the hero still shows
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const group = new THREE.Group();
  scene.add(group);

  // Fibonacci sphere of points, coloured from blue to violet
  const N = 1400, R = 2.6;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const c1 = new THREE.Color("#2F8CFF"), c2 = new THREE.Color("#B7A8FF"), tmp = new THREE.Color();
  const pts = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
    const jitter = 1 + (Math.random() - 0.5) * 0.06;
    const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(R * jitter);
    pts.push(v);
    pos.set([v.x, v.y, v.z], i * 3);
    tmp.copy(c1).lerp(c2, (y + 1) / 2);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.9 }));
  group.add(points);

  // A few "synapses" between neighbouring points
  const lp = [];
  for (let k = 0; k < 260; k++) {
    const a = pts[(Math.random() * N) | 0];
    let best = null, bd = Infinity;
    for (let t = 0; t < 40; t++) {
      const b = pts[(Math.random() * N) | 0];
      const d = a.distanceTo(b);
      if (d > 0.05 && d < bd) { bd = d; best = b; }
    }
    if (best && bd < 0.9) lp.push(a.x, a.y, a.z, best.x, best.y, best.z);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.22 })));

  // Wireframe core turning the other way
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 1),
    new THREE.MeshBasicMaterial({ color: 0x8b7cff, wireframe: true, transparent: true, opacity: 0.35 })
  );
  scene.add(core);

  // Orbiting ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, 0.006, 8, 200),
    new THREE.MeshBasicMaterial({ color: 0x7cc0ff, transparent: true, opacity: 0.4 })
  );
  ring.rotation.x = 1.2;
  scene.add(ring);

  let offsetX = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = w > 900;
    offsetX = wide ? 3.1 : 0;
    const s = wide ? 1 : 0.8;
    [group, core, ring].forEach((o) => { o.position.x = offsetX; o.scale.setScalar(s); });
    points.material.opacity = wide ? 0.9 : 0.45;
  }
  window.addEventListener("resize", resize);
  resize();

  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    group.rotation.y = t * 0.08 + mouse.x * 0.6;
    group.rotation.x = mouse.y * 0.4;
    core.rotation.y = -t * 0.2;
    core.rotation.x = t * 0.1;
    ring.rotation.z = t * 0.15;
    // gentle breathing scroll response
    const sy = Math.min(window.scrollY / window.innerHeight, 1);
    camera.position.z = 9 + sy * 3;
    renderer.render(scene, camera);
  }
  if (reduceMotion) { frame(); return; }
  renderer.setAnimationLoop(() => { if (visible) frame(); });
}

/* ---------- Menu ---------- */
function initMenu() {
  const burger = document.querySelector(".burger");
  const menu = document.getElementById("menu");
  const setOpen = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add("open")); }
    else { menu.classList.remove("open"); setTimeout(() => { if (!menu.classList.contains("open")) menu.hidden = true; }, 600); }
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setOpen(burger.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("open")) setOpen(false); });

  const topbar = document.querySelector(".topbar");
  const onScroll = () => topbar.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- Scroll spy for the sidebar ---------- */
function initSpy() {
  const links = [...document.querySelectorAll(".sidebar nav a")];
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove("active"));
      map.get(e.target.id)?.classList.add("active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
}

/* ---------- Reveal on scroll ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const sib = [...e.target.parentElement.children].filter((c) => c.classList.contains("reveal"));
      e.target.style.transitionDelay = `${Math.min(sib.indexOf(e.target), 6) * 60}ms`;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}

/* ---------- 3D tilt and spotlight on cards ---------- */
function initTilt() {
  if (reduceMotion || !finePointer) return;
  document.querySelectorAll(".tilt").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg) translateY(-4px)`;
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ---------- Tab filters ---------- */
function bindTabs(group, onChange) {
  const tabs = group.querySelectorAll(".tab");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-pressed", String(x === t)));
    onChange(t.dataset.filter);
  }));
}

function initProjects() {
  const cards = document.querySelectorAll("#project-grid .card");
  bindTabs(document.querySelector("#projects .tabs"), (f) => {
    cards.forEach((c) => {
      c.hidden = !(f === "all" || c.dataset.cat.split(" ").includes(f));
      if (!c.hidden) c.classList.add("in");
    });
  });
}

/* ---------- Certificates ---------- */
const CERTS = [
  ["Databases and SQL for Data Science with Python", "IBM, Coursera", "course featured", "Courses/Databases and SQL for Data Science with Python_page-0001.jpg"],
  ["Data Science Methodology", "IBM SkillsBuild", "course featured", "Courses/IBM DS0103.jpg"],
  ["Data Science Tools", "IBM SkillsBuild", "course", "Courses/IBM DS0105.jpg"],
  ["Data Science 101", "IBM SkillsBuild", "course", "Courses/IBM DS0101.jpg"],
  ["Process Data from Dirty to Clean", "Google, Coursera", "course featured", "Courses/Process Data from Dirty to Clean_page-0001.jpg"],
  ["Analyze Data to Answer Questions", "Google, Coursera", "course featured", "Courses/Analyze Data to Answer Questions_page-0001.jpg"],
  ["Diploma in Data Analytics", "IMS Ghaziabad UCC", "course featured", "Diploma/data-analytics-diploma.png"],
  ["Database Design", "Oracle", "course", "Courses/Oracle DB Design Course Completion Certificate_page-0001.jpg"],
  ["Introduction to Relational Databases", "IBM", "course", "Courses/Introduction To RDBMS_page-0001.jpg"],
  ["Principles of UI/UX Design", "Meta, Coursera", "course", "Courses/Coursera UI - UX_page-0001.jpg"],
  ["Create the User Interface in Android Studio", "Meta, Coursera", "course", "Courses/Create the User Interface in Android Studio_page-0001.jpg"],
  ["Specialisation in Android and Web Computing", "IMS Ghaziabad UCC", "course", "Specialization/Android-web.png"],
  ["Web Designing", "V.S.A", "course", "Courses/Web Designing.jpeg"],
  ["IELTS", "IDP, British Council", "course featured", "others/IELTS.jpg"],
  ["Winter Training: Full Stack Development", "IIT Kanpur", "intern featured", "Training/IITK.jpg"],
  ["Internship: Full Stack Development", "OpenWeaver", "intern featured", "Internships/Open Weaver - Full Stack_page-0001.jpg"],
  ["Internship: Python with Data Structures and Algorithms", "YBI Foundation", "intern featured", "Internships/ybi.jpg"],
  ["Internship: C++ Programming", "TechnoHacks", "intern", "Internships/C++ TechnoHack_page-0001.jpg"],
  ["Internship: Android Development", "EduSkills", "intern", "Internships/Kotlin Eduskills_page-0001.jpg"],
  ["Best Performer of the Batch", "IMS Ghaziabad UCC", "award featured", "Awards/best-performer.jpeg"],
  ["Award: IT Club", "IMS Ghaziabad UCC", "award featured", "Awards/it-club.jpeg"],
  ["Outstanding Contribution", "IMS Ghaziabad UCC", "award", "Awards/OC.jpeg"],
  ["Letter of Appreciation: Class Representative", "IMS Ghaziabad UCC", "award", "Awards/LOA.jpeg"],
  ["Letter of Recommendation: Prof. Gagan Varshney", "IMS Ghaziabad UCC", "award", "Recommendation/LOR_1.jpeg"],
  ["Letter of Recommendation: Prof. Rashmi Vaishnav", "IMS Ghaziabad UCC", "award", "Recommendation/LOR_2.jpeg"],
  ["Letter of Recommendation: Prof. Surya Saxena", "IMS Ghaziabad UCC", "award", "Recommendation/LOR_3.jpeg"],
  ["Research: Future Trends in AI and Social Media", "IMS Ghaziabad UCC", "award featured", "Research Paper/Future trends of AI .jpg"],
  ["GGG Summer Career Fair 2025", "Gisma University", "event", "Workshops & Participation/cf.jpg"],
  ["HACK-ATHON 2K24", "IMS Ghaziabad UCC", "event", "Workshops & Participation/Hackathon 2K24.jpeg"],
  ["HACK-ATHON 2K24: IT Gaming", "IMS Ghaziabad UCC", "event", "Workshops & Participation/HackAthon 2K24 IT GAMING.jpeg"],
  ["INVENT 2K23: Blind Coding", "IMS Ghaziabad UCC", "event", "Workshops & Participation/INVENT 2K23 Blind Coding.jpeg"],
  ["HACK-ATHON 2K22", "IMS Ghaziabad UCC", "event", "Workshops & Participation/Web-A-Thon.jpeg"],
  ["Microsoft Office using AI", "be10x", "event", "Workshops & Participation/AI Tools.jpg"],
  ["Workshop on Web Development", "IMS Ghaziabad UCC", "event", "Workshops & Participation/Web-Dev.jpeg"],
  ["Workshop on Blockchain and IT Skills", "IMS Ghaziabad UCC", "event", "Workshops & Participation/Blockchain.jpeg"],
  ["Cryptocurrency Workshop", "IMS Ghaziabad UCC", "event", "Workshops & Participation/Cryptocurrency.jpeg"],
  ["Pre-Placement Training Module", "IMS Ghaziabad UCC", "event", "CDC/PPTM.jpg"],
  ["Placement Practice Mock Session", "IMS Ghaziabad UCC", "event", "CDC/ppms.jpg"],
  ["Attitude Building", "IMS Ghaziabad UCC", "event", "CDC/Attitude Building.jpg"],
];
const slug = (p) => p.replace(/\.[^.]+$/, "").replace("/", "-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function initCerts() {
  const grid = document.getElementById("cert-grid");
  const box = document.getElementById("lightbox");
  const frag = document.createDocumentFragment();
  CERTS.forEach(([title, issuer, cats, path]) => {
    const b = document.createElement("button");
    b.className = "cert";
    b.dataset.cat = cats;
    b.dataset.full = "assets/images/" + path;
    b.innerHTML = `<img src="assets/thumbs/${slug(path)}.webp" alt="" loading="lazy"><b></b><span></span>`;
    b.querySelector("b").textContent = title;
    b.querySelector("span").textContent = issuer;
    b.setAttribute("aria-label", `View certificate: ${title}, ${issuer}`);
    b.addEventListener("click", () => {
      box.querySelector("img").src = b.dataset.full;
      box.querySelector("img").alt = `${title} certificate from ${issuer}`;
      box.querySelector("p").textContent = `${title}, ${issuer}`;
      box.showModal();
    });
    frag.appendChild(b);
  });
  grid.appendChild(frag);

  const all = grid.querySelectorAll(".cert");
  const apply = (f) => all.forEach((c) => { c.hidden = !(f === "all" || c.dataset.cat.split(" ").includes(f)); });
  apply("featured");
  bindTabs(document.getElementById("cert-tabs"), apply);

  box.querySelector(".lb-close").addEventListener("click", () => box.close());
  box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
}

/* ---------- Copy email ---------- */
function initCopy() {
  const btn = document.getElementById("copy-email");
  const label = btn.querySelector("span");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.email);
      label.textContent = "Email copied";
    } catch {
      window.location.href = "mailto:" + btn.dataset.email;
    }
    setTimeout(() => { label.textContent = "Copy email"; }, 2200);
  });
}

initMenu();
initSpy();
initReveal();
initTilt();
initProjects();
initCerts();
initCopy();
initScene();
