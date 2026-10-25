const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* Always start at the hero on reload */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (!location.hash) window.scrollTo(0, 0);

/* ---------- Smooth scrolling (Lenis) ---------- */
let lenis = null;
function initLenis() {
  if (reduceMotion || !window.Lenis) return;
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === "#home" ? 0 : -70 });
    });
  });
}

/* ---------- Hero: split the giant name into letters that rise in ---------- */
function splitMega() {
  const line = document.querySelector(".mega-line");
  if (!line) return;
  const text = line.textContent;
  line.textContent = "";
  [...text].forEach((c, n) => {
    const s = document.createElement("span");
    if (c === " ") { s.className = "gap"; line.appendChild(s); return; } // the chrome monogram sits here
    s.className = "ch";
    s.style.setProperty("--n", n);
    s.textContent = c;
    line.appendChild(s);
  });
}

/* ---------- Text scramble on kickers ---------- */
function scramble(el) {
  const final = el.dataset.text || el.textContent;
  el.dataset.text = final;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&{}<>";
  let frame = 0;
  const total = 22;
  const tick = () => {
    el.textContent = [...final].map((c, i) => {
      if (c === " ") return " ";
      return frame / total > i / final.length ? c : chars[(Math.random() * chars.length) | 0];
    }).join("");
    if (frame++ < total) requestAnimationFrame(tick); else el.textContent = final;
  };
  tick();
}
function initScramble() {
  const els = document.querySelectorAll(".fx-scramble");
  if (reduceMotion) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { scramble(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
  els.forEach((el) => el.addEventListener("mouseenter", () => scramble(el)));
}

/* ---------- Reveal on scroll ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const sib = [...e.target.parentElement.children].filter((c) => c.classList.contains("reveal"));
      e.target.style.transitionDelay = `${Math.min(sib.indexOf(e.target), 6) * 70}ms`;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}

/* ---------- Scroll-linked effects: word fill, tilted gallery drift, section glow ---------- */
function initScrollFx() {
  const words = [...document.querySelectorAll(".sw")];  // --p is inherited by .sw-text
  const rows = [...document.querySelectorAll(".tg-row")];
  const about = document.querySelector(".about");
  const glows = { blue: "47, 140, 255", purple: "166, 108, 255", green: "74, 222, 128" };
  const secs = [...document.querySelectorAll("[data-glow]")];
  let current = "";

  const update = () => {
    const vh = window.innerHeight;
    words.forEach((w) => {
      const r = w.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.45)));
      w.style.setProperty("--p", `${(p * 100).toFixed(1)}%`);
    });
    if (about) {
      const r = about.getBoundingClientRect();
      const t = (vh - r.top) / (vh + r.height);
      rows.forEach((row, i) => {
        const dir = Number(row.dataset.dir);
        row.style.transform = `translate3d(${(dir * (t - 0.5) * 520 - (i % 2 ? 260 : 0)).toFixed(1)}px,0,0)`;
      });
    }
    const mid = vh * 0.4;
    const active = secs.find((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
    const g = active ? active.dataset.glow : "blue";
    if (g !== current) { current = g; document.documentElement.style.setProperty("--glow", glows[g]); }
  };
  if (reduceMotion) { words.forEach((w) => w.style.setProperty("--p", "100%")); }
  else window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ---------- Cursor glow, spotlight borders and 3D tilt ---------- */
function initPointerFx() {
  if (!finePointer) return;
  const glow = document.querySelector(".cursor-glow");
  window.addEventListener("pointermove", (e) => {
    glow.style.setProperty("--cx", `${e.clientX}px`);
    glow.style.setProperty("--cy", `${e.clientY}px`);
  });
  document.querySelectorAll(".spot").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
  if (reduceMotion) return;
  document.querySelectorAll(".tilt").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg) translateY(-4px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ---------- Menu ---------- */
function initMenu() {
  const burger = document.querySelector(".burger");
  const menu = document.getElementById("menu");
  const setOpen = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add("open")); lenis?.stop(); }
    else { menu.classList.remove("open"); lenis?.start(); setTimeout(() => { if (!menu.classList.contains("open")) menu.hidden = true; }, 700); }
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setOpen(burger.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("open")) setOpen(false); });
}

/* ---------- Floating nav: expand on scroll, highlight the section in view ---------- */
function initNav() {
  const bar = document.querySelector(".topbar");
  const links = [...document.querySelectorAll(".pill-nav a")];
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const onScroll = () => bar.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.6);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("active", a === map.get(e.target.id)));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
}

/* ---------- Tabs ---------- */
function bindTabs(group, onChange) {
  const tabs = group.querySelectorAll(".tab");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-pressed", String(x === t)));
    onChange(t.dataset.filter);
  }));
  return (f) => tabs.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.filter === f)));
}

function initProjects() {
  const cards = document.querySelectorAll("#project-grid .card");
  const apply = (f) => cards.forEach((c) => {
    c.hidden = !(f === "all" || c.dataset.cat.split(" ").includes(f));
    if (!c.hidden) c.classList.add("in");
  });
  const select = bindTabs(document.querySelector("#projects .tabs"), apply);
  // the big words above Experience jump to the matching projects
  document.querySelectorAll(".sw[data-filter]").forEach((a) => {
    a.addEventListener("click", () => { apply(a.dataset.filter); select(a.dataset.filter); });
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
  ["Internship: Full Stack Development", "Open Weaver", "intern featured", "Internships/Open Weaver - Full Stack_page-0001.jpg"],
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
    b.innerHTML = `<img src="assets/thumbs/${slug(path)}.webp" alt="" loading="lazy"><b></b><span></span>`;
    b.querySelector("b").textContent = title;
    b.querySelector("span").textContent = issuer;
    b.setAttribute("aria-label", `View certificate: ${title}, ${issuer}`);
    b.addEventListener("click", () => {
      box.querySelector("img").src = "assets/images/" + path;
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
  const select = bindTabs(document.getElementById("cert-tabs"), apply);

  // fanned stacks: build images, and jump to the gallery filtered on click
  document.querySelectorAll(".stack-card").forEach((card) => {
    const fan = card.querySelector(".fan");
    const srcs = fan.dataset.src.split(",");
    const mid = (srcs.length - 1) / 2;
    srcs.forEach((s, i) => {
      const img = document.createElement("img");
      img.src = `assets/thumbs/${s}.webp`;
      img.alt = "";
      img.loading = "lazy";
      img.style.setProperty("--k", (i - mid).toString());
      img.style.zIndex = String(10 - Math.abs(i - mid));
      fan.appendChild(img);
    });
    card.addEventListener("click", () => {
      apply(card.dataset.filter);
      select(card.dataset.filter);
      const target = document.getElementById("gallery");
      const y = target.getBoundingClientRect().top + window.scrollY - 90;
      lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: "smooth" });
    });
  });

  box.querySelector(".lb-close").addEventListener("click", () => box.close());
  box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
}

/* ---------- Marquee: duplicate the track for a seamless loop ---------- */
function initMarquee() {
  const track = document.querySelector(".marquee-track");
  if (!track) return;
  track.innerHTML += track.innerHTML.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');
}

/* ---------- Fun buttons: magnetic pull, ripples, dice, download feedback, confetti ---------- */
function initFunButtons() {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      const r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
      const dot = document.createElement("span");
      dot.className = "ripple";
      Object.assign(dot.style, { width: `${size}px`, height: `${size}px`, left: `${e.clientX - r.left}px`, top: `${e.clientY - r.top}px` });
      btn.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove());
    });
  });
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".hero-cta .btn, .contact-actions .btn, .pill .btn").forEach((btn) => {
      btn.classList.add("magnetic");
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.28}px, ${dy * 0.4}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }
  document.querySelectorAll("a[download]").forEach((a) => {
    a.addEventListener("click", () => {
      const label = [...a.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (!label || a.dataset.busy) return;
      const old = label.textContent;
      a.dataset.busy = "1";
      label.textContent = "Downloading ✓";
      setTimeout(() => { label.textContent = old; delete a.dataset.busy; }, 2200);
    });
  });
  const dice = document.getElementById("dice");
  dice?.addEventListener("click", () => {
    const cards = [...document.querySelectorAll("#project-grid .card:not([hidden])")];
    const pick = cards[Math.floor(Math.random() * cards.length)];
    dice.classList.remove("rolling"); void dice.offsetWidth; dice.classList.add("rolling");
    if (!pick) return;
    const y = pick.getBoundingClientRect().top + window.scrollY - 140;
    lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: "smooth" });
    pick.classList.add("in");
    setTimeout(() => { pick.classList.remove("surprise"); void pick.offsetWidth; pick.classList.add("surprise"); }, 900);
  });
}

function confetti(x, y) {
  if (reduceMotion) return;
  const c = document.createElement("canvas");
  c.className = "confetti";
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const g = c.getContext("2d");
  g.scale(devicePixelRatio, devicePixelRatio);
  const colors = ["#2F8CFF", "#7CC0FF", "#A66CFF", "#4ADE80", "#FBBF24", "#FF5C8A"];
  const parts = Array.from({ length: 110 }, () => ({
    x, y, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 11 - 3, r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: colors[(Math.random() * colors.length) | 0],
  }));
  let frame = 0;
  (function tick() {
    g.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach((p) => {
      p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    });
    if (frame++ < 110) requestAnimationFrame(tick); else c.remove();
  })();
}

/* ---------- Easter egg: type "mario" anywhere to unlock the secret level ---------- */
function goSecret() {
  const v = document.createElement("div");
  v.className = "secret-veil";
  v.innerHTML = "<p>🍄 Secret level unlocked!</p>";
  document.body.appendChild(v);
  setTimeout(() => { location.href = "mario.html"; }, 1100);
}
window.goSecret = goSecret;
function initEasterEgg() {
  let typed = "";
  document.addEventListener("keydown", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if ((el && el.closest("input, textarea, select, [contenteditable]")) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-5);
    if (typed === "mario") goSecret();
  });
}

/* ---------- Copy email ---------- */
function initCopy() {
  const btn = document.getElementById("copy-email");
  const label = btn.querySelector("span");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.email);
      label.textContent = "Email copied 🎉";
      const r = btn.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2);
    } catch {
      window.location.href = "mailto:" + btn.dataset.email;
    }
    setTimeout(() => { label.textContent = "Copy email"; }, 2200);
  });
}

splitMega();
initLenis();
initMenu();
initNav();
initReveal();
initScramble();
initScrollFx();
initPointerFx();
initProjects();
initCerts();
initMarquee();
initCopy();
initFunButtons();
initEasterEgg();
