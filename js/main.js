// Thesis results: Macro-F1 averaged over 3 seeds (Appendix C, Table C.1).
const LANGS = ["Kannada", "Tamil", "Malayalam"];
const CONDS = [
  { short: "TF-IDF", label: "TF-IDF + logistic regression baseline, trained on all labels", ref: true },
  { short: "Zero-shot", label: "XLM-R trained on English, German and Hindi only, no target labels" },
  { short: "50", label: "XLM-R fine-tuned with 50 target-language labels" },
  { short: "100", label: "XLM-R fine-tuned with 100 target-language labels" },
  { short: "500", label: "XLM-R fine-tuned with 500 target-language labels" },
  { short: "Qwen 50", label: "Qwen2.5-1.5B with 50 in-context examples" },
  { short: "Qwen 100", label: "Qwen2.5-1.5B with 100 in-context examples" },
  { short: "Mono", label: "Monolingual XLM-R trained on all target labels (upper bound)", ref: true },
];
const MF1 = {
  Kannada:   [0.7598, 0.6054, 0.6142, 0.6550, 0.6865, 0.5395, 0.5140, 0.7502],
  Tamil:     [0.7473, 0.5880, 0.5821, 0.6045, 0.6773, 0.4891, 0.5739, 0.7692],
  Malayalam: [0.7080, 0.4970, 0.4988, 0.4901, 0.4901, 0.1434, 0.3321, 0.4901],
};
const MIN = 0.14, MAX = 0.77;

function buildHeatmap() {
  const root = document.getElementById("heatmap");
  const readout = document.getElementById("hm-readout");
  if (!root) return;

  const header = document.createElement("div");
  header.setAttribute("role", "row");
  header.style.display = "contents";
  header.appendChild(Object.assign(document.createElement("span"), { className: "hm-col" }));
  CONDS.forEach((c) => {
    const th = document.createElement("span");
    th.className = "hm-col";
    th.setAttribute("role", "columnheader");
    th.title = c.label;
    th.textContent = c.short;
    header.appendChild(th);
  });
  root.appendChild(header);

  const cells = [];
  LANGS.forEach((lang) => {
    const row = document.createElement("div");
    row.setAttribute("role", "row");
    row.style.display = "contents";
    const rh = document.createElement("span");
    rh.className = "hm-row";
    rh.setAttribute("role", "rowheader");
    rh.textContent = lang;
    row.appendChild(rh);

    MF1[lang].forEach((v, j) => {
      const t = Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN)));
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hm-cell" + (t > 0.55 ? " dark" : "") + (CONDS[j].ref ? " ref" : "");
      b.style.setProperty("--t", t.toFixed(3));
      b.style.setProperty("--i", j);
      b.setAttribute("role", "cell");
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", `${lang}, ${CONDS[j].label}: Macro-F1 ${v.toFixed(3)}`);
      b.textContent = v.toFixed(2).replace(/^0/, "");
      const show = () => {
        cells.forEach((c) => c.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        readout.textContent = `${lang}, ${CONDS[j].label}: ${v.toFixed(3)} Macro-F1.`;
      };
      b.addEventListener("mouseenter", show);
      b.addEventListener("focus", show);
      b.addEventListener("click", show);
      cells.push(b);
      row.appendChild(b);
    });
    root.appendChild(row);
  });

  root.classList.add("animate");
}

function initFilters() {
  const chips = document.querySelectorAll(".chip");
  const items = document.querySelectorAll("#work-list > li");
  const empty = document.getElementById("work-empty");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      let shown = 0;
      items.forEach((li) => {
        const match = f === "all" || li.dataset.cat.split(" ").includes(f);
        li.hidden = !match;
        if (match) shown++;
      });
      empty.hidden = shown > 0;
    });
  });
}

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const list = document.getElementById("nav-list");
  toggle.addEventListener("click", () => {
    const open = list.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  list.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      list.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

buildHeatmap();
initFilters();
initNav();
