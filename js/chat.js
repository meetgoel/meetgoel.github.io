// "Ask about Meet": a recruiter-facing assistant that costs nothing and needs no server.
// 1) Curated answers from Meet's real profile, matched in the browser with a small
//    embedding model (Transformers.js, all-MiniLM-L6-v2, ~23 MB, cached after first use).
// 2) Open questions can be answered by an on-device LLM (WebLLM, Qwen2.5-1.5B, ~900 MB,
//    opt-in, WebGPU). It only sees the most relevant curated facts, so it stays grounded.
// 3) Otherwise the closest curated answer and Meet's contact details are shown.

const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm";
const LLM_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const MATCH_OK = 0.6;          // cosine similarity for a confident curated answer
const MATCH_MAYBE = 0.42;      // close enough to show as a fallback

/* ---------- Facts given to the on-device model (plus the top curated answers) ---------- */
const CORE = `Meet Goel is a data scientist based in Berlin. Since Feb 2026 he works at Siemens Healthineers in Erlangen (IT Order-to-Cash intern, then Working Student in Service Management and Operations since May 2026). MSc Data Science, AI and Digital Business at Gisma University (2024 to 2026). Open to data scientist, ML engineer, AI automation and data analyst roles, on-site or hybrid in Berlin, Erlangen, Munich, Frankfurt or Nuremberg. English professional, German A2, Hindi native. Email: meetgoel12345@gmail.com. Unknown: start date, notice period, salary, visa details.`;

function buildSystem(facts) {
  return `You answer a recruiter's questions about the job candidate Meet Goel, using only the facts below.
- Do not invent anything. If the facts don't cover the question, say that and suggest emailing meetgoel12345@gmail.com.
- Present Meet positively and accurately; point to concrete evidence from the facts.
- Write about Meet in the third person, in 2 to 4 sentences, in the same language as the question.

Facts about Meet:
${CORE}
${facts.map((f) => "- " + f.replace(/\*\*/g, "").replace(/\n/g, " ")).join("\n")}`;
}

/* ---------- Curated answers ---------- */
const KB = [
  {
    q: ["Who is Meet?", "Tell me about Meet", "Give me a quick summary", "Introduce the candidate", "What is his background?"],
    a: "Meet is a **data scientist in Berlin** and a working student at **Siemens Healthineers** in Erlangen. He combines an MSc in Data Science, AI and Digital Business with an NLP thesis, hands-on ML projects and real enterprise experience building AI agents and mapping IT systems. Before data science he built web apps, so he understands how models reach real users.",
  },
  {
    q: ["Why should we hire Meet?", "What are his strengths?", "What makes him stand out?", "Why is he a good fit?", "What value would he bring?"],
    a: "Three things stand out:\n- **Industry proof:** at Siemens Healthineers he mapped 50+ systems around the ERP and built Copilot AI agents that turn complex documents into structured insights.\n- **Research rigour:** his thesis compared XLM-R and Qwen2.5 across 3 languages and 3 seeds, and showed why Macro-F1 matters more than accuracy on imbalanced data.\n- **End-to-end skills:** from data cleaning and modelling to Streamlit apps deployed on AWS.\nHe is also self-motivated and used to working across teams.",
  },
  {
    q: ["What did he do at Siemens Healthineers?", "Tell me about his internship", "Order-to-Cash project", "What was his Siemens internship about?", "Industry experience", "Has he worked at a big company?", "Corporate experience", "Enterprise or large company experience", "Professional work experience"],
    a: "As **IT Order-to-Cash intern at Siemens Healthineers** (Feb to May 2026) Meet visualised the OTC IT ecosystem: more than **50 satellite systems** connected to the ERP, modelled as nodes and directional flows. He worked with several departments and data experts, evaluated Power BI, LeanIX, SAP Signavio and Power Apps, and chose **SAP Signavio** as the best fit. He also built **AI agents in Microsoft Copilot** to analyse complex documents and worked within the Azure DevOps lifecycle.",
  },
  {
    q: ["What is his current role?", "Is he working now?", "Working student role", "Service management and operations", "What does he do today?"],
    a: "Since May 2026 Meet is a **Working Student in Service Management and Operations at Siemens Healthineers** in Erlangen. He works with **Microsoft Copilot Studio, Power Automate, Power Apps**, SAP Solution Manager and SharePoint on operational processes and service delivery, following his internship there.",
  },
  {
    q: ["Does he have experience with AI agents?", "Generative AI experience", "LLM experience", "Copilot Studio", "Automation experience", "Has he worked with large language models?"],
    a: "Yes. At Siemens Healthineers Meet built **AI agents with Microsoft Copilot** that analyse complex documents and return structured insights, and he now works with **Copilot Studio and Power Automate**. In research, his thesis tested **in-context learning with Qwen2.5-1.5B** against fine-tuned XLM-R. He also attended SAP AI workshops on Joule, BTP, AI Core and MCP servers, and built a Streamlit app with a GPT-4 assistant.",
  },
  {
    q: ["What was his thesis about?", "Master thesis", "Research experience", "Tell me about his NLP research", "What did his research find?"],
    a: "His thesis studied **offensive language detection in low-resource languages** (Kannada, Tamil, Malayalam) with only 0 to 500 labelled examples. Key results:\n- **0.61 Macro-F1** on Kannada with zero Kannada labels\n- fine-tuned **XLM-R beat Qwen2.5 in-context learning in all 6 settings**\n- about **90% of the full-data baseline** with just 500 labels\nIt also showed how 96% accuracy can hide a model that predicts only one class.",
  },
  {
    q: ["Does he know NLP?", "Natural language processing skills", "Transformers experience", "Text classification experience", "Hugging Face"],
    a: "NLP is Meet's strongest research area. He fine-tuned **XLM-RoBERTa** with Hugging Face Transformers and PyTorch for cross-lingual classification, compared it with LLM in-context learning, and explained predictions with **LIME**. He also built a phishing email classifier and a TF-IDF recommender (Cinemate).",
  },
  {
    q: ["What machine learning experience does he have?", "ML skills", "Which models has he built?", "Predictive modelling experience", "Regression and classification"],
    a: "Meet has built regression, classification, time-series and deep learning models: **house price prediction** (linear regression, decision tree, random forest and SVR, tuned with GridSearchCV and cross-validation), **Walmart sales forecasting**, **Titanic survival** classification, a **rice image classifier**, and transformer fine-tuning in his thesis. He works mainly with scikit-learn, PyTorch and TensorFlow/Keras.",
  },
  {
    q: ["What is his tech stack?", "Technical skills", "Which tools does he use?", "Programming languages", "Does he know Python and SQL?"],
    a: "Core stack: **Python, SQL, pandas, NumPy, scikit-learn, PyTorch, TensorFlow, Hugging Face**. Analytics: **Power BI, Tableau, Excel**. Enterprise and automation: **Copilot Studio, Power Automate, Power Apps, SAP Signavio, Azure DevOps**. Apps and deployment: **Streamlit, AWS EC2, Git**. He also has a web background in JavaScript, PHP, Java and C/C++.",
  },
  {
    q: ["Data analysis experience", "Business intelligence skills", "Power BI or Tableau?", "Can he build dashboards?", "Data analyst role"],
    a: "Yes. Meet has done exploratory analyses (Netflix catalogue, gym member data), holds a **diploma in data analytics**, and uses **Power BI, Tableau and Excel**. At Siemens Healthineers he evaluated Power BI among other tools for visualising a complex system landscape. His IBM and FutureLearn data analytics certificates are verifiable on the portfolio.",
  },
  {
    q: ["Can he deploy models?", "Cloud experience", "MLOps experience", "AWS or Azure experience", "Has he shipped anything to production?"],
    a: "Meet deployed his **Cinemate** recommender as a Streamlit app on **AWS EC2**, and at Siemens Healthineers he worked within the **Azure DevOps** lifecycle. From his Open Weaver internship he also has experience deploying a full e-commerce site with automated SMTP emails and payment integration.",
  },
  {
    q: ["What is his education?", "Which degrees does he have?", "Where did he study?", "University", "Bachelor degree"],
    a: "- **MSc Data Science, AI and Digital Business**, Gisma University of Applied Sciences, Potsdam (Sep 2024 to Sep 2026)\n- **Bachelor of Computer Applications**, IMS Ghaziabad (2021 to 2024), **grade A+**, with a diploma in data analytics and a Best Performer of the Batch award",
  },
  {
    q: ["Does he speak German?", "Language skills", "Sprachkenntnisse", "Spricht er Deutsch?", "English level"],
    a: "Meet speaks **English** at a professional working level, **Hindi** natively, and **German at A2**, which he is actively improving while working at Siemens Healthineers in Germany. For roles that require fluent German, it is best to discuss this with him directly.",
  },
  {
    q: ["Where is he located?", "Is he open to relocation?", "Which cities?", "Remote or hybrid?", "Work location preference"],
    a: "Meet is based in **Berlin** and open to **on-site or hybrid** roles in **Berlin, Erlangen, Munich, Frankfurt am Main and Nuremberg**.",
  },
  {
    q: ["When can he start?", "Availability", "Notice period", "Is he available now?", "Start date"],
    a: "Meet is **actively open to data and AI roles**. His MSc runs until September 2026 and he currently works as a working student at Siemens Healthineers. For an exact start date or notice period, please email him at **meetgoel12345@gmail.com**.",
  },
  {
    q: ["Does he need a visa?", "Work permit", "Visa sponsorship", "Is he allowed to work in Germany?"],
    a: "I don't have details on Meet's visa or work-permit status. He already works in Germany at Siemens Healthineers; for specifics please ask him directly at **meetgoel12345@gmail.com**.",
  },
  {
    q: ["What are his salary expectations?", "Salary", "Compensation", "Expected pay"],
    a: "I don't have Meet's salary expectations. He's happy to discuss this directly: **meetgoel12345@gmail.com**.",
  },
  {
    q: ["What motivates him?", "Career goals", "Why data science?", "What kind of role is he looking for?", "Motivation"],
    a: "Meet moved from building web apps to data science because he wants to build the intelligence behind products, not just the interface. He's motivated by **messy, real-world data where results matter**, as at Siemens Healthineers, and by doing it rigorously, as his thesis showed. He's looking for a data scientist, ML engineer or AI automation role where he can ship models and keep learning.",
  },
  {
    q: ["Soft skills", "Is he a team player?", "Leadership experience", "Communication skills", "Teamwork"],
    a: "Meet has led and coordinated people since university: **President of the IT Club**, class representative, and coordinator for Hack-A-Thon 2K24 and INVENT 2K23. In Germany he volunteered as event coordinator for a career fair, and at Siemens Healthineers he worked across several departments and with data experts to map a complex IT landscape.",
  },
  {
    q: ["What are his weaknesses?", "Areas for improvement", "What is he still learning?"],
    a: "Honestly: his **German is at A2**, and he's actively improving it. He is also early in his career, which he balances with fast learning: he went from his first corporate internship to a working student role at Siemens Healthineers, and he backs his skills with verifiable certifications.",
  },
  {
    q: ["Which certifications does he have?", "Certificates", "Courses completed", "IBM certification"],
    a: "Verified credentials include **IBM Machine Learning with Python (Level 1)**, **IBM Data Science Foundations (Level 2)**, IBM Data Science Methodologies and Tools, and **Microsoft Future Ready: Data Science Research Methods Using Python**, plus FutureLearn certificates in data analytics with Python and Excel. Each has a verify link in the Certifications section.",
  },
  {
    q: ["What projects has he done?", "Best project", "Portfolio projects", "Show me his work", "GitHub projects"],
    a: "Highlights:\n- **Siemens Healthineers**: OTC ecosystem map and Copilot AI agents\n- **Master's thesis**: cross-lingual NLP with XLM-R and Qwen2.5\n- **Cinemate**: TF-IDF movie recommender on AWS EC2\n- **ML projects**: house prices, Walmart sales, Titanic, phishing emails\n- **J.A.R.V.I.S.**: macOS voice assistant with face recognition\nAll code is on github.com/meetgoel.",
  },
  {
    q: ["Could he build a prediction model for us?", "Can he do churn prediction?", "Could he help our team with forecasting?", "Can he build a recommendation system?", "Could he solve our business problem with machine learning?"],
    a: "Very likely, and he has done the closest building blocks: **classification** (Titanic survival, phishing emails), **time-series forecasting** (Walmart weekly sales with holidays and economic indicators), **regression with model comparison and GridSearchCV** (house prices) and a **recommender** deployed on AWS (Cinemate). At Siemens Healthineers he also learned to work with business stakeholders on real enterprise data. He'd be glad to talk through your use case: **meetgoel12345@gmail.com**.",
  },
  {
    q: ["Tell me about the Cinemate project", "Movie recommender", "Recommendation system project", "Streamlit app"],
    a: "**Cinemate** (Oct to Nov 2025, Gisma) is a content-based movie recommender: an NLP pipeline on the TMDB dataset using **TF-IDF vectors and a similarity matrix**, a **Streamlit** interface with custom CSS, a GPT-4 chat assistant, and deployment on **AWS EC2**. Code: github.com/meetgoel/Business-Project-in-Big-Data-AI.",
  },
  {
    q: ["Tell me about JARVIS", "Voice assistant project", "Bachelor final project", "Computer vision project", "Face recognition"],
    a: "**J.A.R.V.I.S.** was Meet's bachelor's final project: a macOS voice assistant with **face recognition** for secure start-up, **speech recognition**, Hugging Face chat and image generation, a weather API and system automation. Built in Python (OpenCV, face_recognition, Eel) with an HTML, CSS and JavaScript front end.",
  },
  {
    q: ["What are his hobbies?", "What does he do outside work?", "Personal interests", "Tell me something personal about him"],
    a: "Outside work Meet plays musical instruments, draws, and enjoys computer and board games. His motto: **born to express, not to impress**.",
  },
  {
    q: ["How does he approach a new dataset?", "How would he handle messy data?", "What is his way of working?", "How does he work on a data science problem?", "Data cleaning experience"],
    a: "Meet starts with the data, not the model: **cleaning and exploratory analysis** first (his analytics diploma and Google's \"Process Data from Dirty to Clean\" course), then a **simple baseline** before anything complex. His thesis shows the rigour he brings: he compared models across **three random seeds**, used **Macro-F1 instead of accuracy** because the data was imbalanced, and explained predictions with **LIME**. At Siemens Healthineers he also clarified requirements with business and data experts before building.",
  },
  {
    q: ["How can I contact him?", "Email", "Can I get his CV?", "Schedule an interview", "LinkedIn profile"],
    a: "Email **meetgoel12345@gmail.com**, connect on LinkedIn at linkedin.com/in/meet-goel, or download his CV from the button at the top of the page. He's happy to set up a call.",
  },
  {
    q: ["Hi", "Hello", "What can you do?", "Help", "Hallo"],
    a: "Hi! I can answer questions about Meet's **experience, skills, thesis, projects, languages and availability**. Try one of the suggestions below, or ask your own question.",
  },
];

/* ---------- DOM ---------- */
const $ = (s) => document.querySelector(s);
const fab = $("#chat-fab");
const panel = $("#chat-panel");
const log = $("#chat-log");
const form = $("#chat-form");
const input = $("#chat-input");
const chips = $("#chat-chips");
const statusEl = $("#chat-status");
if (!fab || !panel) throw new Error("chat markup missing");

const history = [];   // {role, content} for the LLM
let busy = false;

function esc(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
// tiny, safe markdown: **bold**, bullet lines, links to known hosts
function render(md) {
  const lines = esc(md.trim()).split(/\n+/);
  let html = "", inList = false;
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\b(meetgoel12345@gmail\.com)\b/g, '<a href="mailto:$1">$1</a>')
      .replace(/\b((?:github\.com\/meetgoel|linkedin\.com\/in\/meet-goel)[\w\/-]*)/g, '<a href="https://$1" target="_blank" rel="noopener">$1</a>');
    if (/^\s*[-*•]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${line.replace(/^\s*[-*•]\s+/, "")}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${line}</p>`;
    }
  }
  return html + (inList ? "</ul>" : "");
}

function bubble(role, html, note) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = `<div class="msg-body">${html}</div>${note ? `<p class="msg-note">${note}</p>` : ""}`;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function typing() {
  const el = document.createElement("div");
  el.className = "msg bot typing";
  el.innerHTML = '<div class="msg-body"><span></span><span></span><span></span></div>';
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

/* ---------- Matching ---------- */
let embedder = null, kbVecs = null, embedReady = null;
function loadEmbedder() {
  if (embedReady) return embedReady;
  embedReady = (async () => {
    statusEl.textContent = "Loading the assistant…";
    const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/dist/transformers.min.js");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
    const texts = KB.flatMap((k, i) => k.q.map((q) => ({ q, i })));
    const out = await embedder(texts.map((t) => t.q), { pooling: "mean", normalize: true });
    const vecs = out.tolist();
    kbVecs = texts.map((t, n) => ({ i: t.i, v: vecs[n] }));
    statusEl.textContent = "Answers from Meet’s profile";
  })().catch((e) => {
    console.warn("Embedding model unavailable, using keyword matching", e);
    statusEl.textContent = "Answers from Meet’s profile";
  });
  return embedReady;
}

const dot = (a, b) => a.reduce((s, x, k) => s + x * b[k], 0);
const STOP = new Set("a an the is are was were do does did he his him meet of in on at to for with and or what which who how can tell me about i you your any has have be it this that".split(" "));
const toks = (s) => s.toLowerCase().replace(/[^a-z0-9äöüß ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));

async function rank(question) {
  const scores = new Array(KB.length).fill(0);
  if (embedder && kbVecs) {
    const [v] = (await embedder([question], { pooling: "mean", normalize: true })).tolist();
    for (const k of kbVecs) scores[k.i] = Math.max(scores[k.i], dot(v, k.v));
  } else {
    // keyword fallback while the model loads or if it failed
    const qt = new Set(toks(question));
    KB.forEach((k, i) => {
      const kt = new Set(toks(k.q.join(" ")));
      let hit = 0; qt.forEach((w) => { if (kt.has(w)) hit++; });
      scores[i] = qt.size ? (hit / Math.sqrt(qt.size * kt.size)) * 1.6 : 0;
    });
  }
  return scores.map((s, i) => ({ i, s })).sort((x, y) => y.s - x.s);
}

/* ---------- On-device LLM (opt-in) ---------- */
const canRunLlm = "gpu" in navigator;
let engine = null, engineLoading = null;
function loadEngine(onProgress) {
  if (engineLoading) return engineLoading;
  engineLoading = (async () => {
    const webllm = await import(WEBLLM_URL);
    engine = await webllm.CreateMLCEngine(LLM_MODEL, {
      initProgressCallback: (p) => onProgress?.(Math.round((p.progress || 0) * 100)),
    });
    return engine;
  })().catch((e) => { engineLoading = null; throw e; });
  return engineLoading;
}

async function generate(question, ranked, target) {
  const facts = ranked.slice(0, 3).filter((r) => r.s > 0.2).map((r) => KB[r.i].a);
  const stream = await engine.chat.completions.create({
    stream: true, temperature: 0.2, max_tokens: 220,
    messages: [{ role: "system", content: buildSystem(facts) }, ...history.slice(-4), { role: "user", content: question }],
  });
  let text = "";
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta?.content || "";
    target.innerHTML = render(text);
    log.scrollTop = log.scrollHeight;
  }
  return text.trim();
}

/* ---------- Conversation ---------- */
const GERMAN = /\b(ist|er|sein|seine|kann|hat|welche|wie|was|wo|wann|erfahrung|deutsch|arbeiten|sprache|warum)\b/i;

function finish(question, reply) {
  history.push({ role: "user", content: question }, { role: "assistant", content: reply });
  chips.hidden = false;
  log.appendChild(chips);
  log.scrollTop = log.scrollHeight;
  busy = false;
}

async function aiAnswer(question, ranked, holder) {
  const el = bubble("bot", "");
  const body = el.querySelector(".msg-body");
  try {
    if (!engine) {
      body.innerHTML = '<p>Loading on-device AI… <b class="pct">0%</b></p><div class="bar"><i></i></div>';
      await loadEngine((pct) => {
        body.querySelector(".pct") && (body.querySelector(".pct").textContent = pct + "%");
        body.querySelector(".bar i") && (body.querySelector(".bar i").style.width = pct + "%");
      });
    }
    body.innerHTML = '<p class="dots"><span></span><span></span><span></span></p>';
    const text = await generate(question, ranked, body);
    el.insertAdjacentHTML("beforeend", '<p class="msg-note">Generated on your device from Meet’s profile. Please confirm details with Meet.</p>');
    holder?.remove();
    return text;
  } catch (e) {
    console.warn("On-device AI unavailable", e);
    body.innerHTML = render("The on-device AI couldn’t start in this browser. Please ask Meet directly at **meetgoel12345@gmail.com**.");
    return "";
  }
}

async function answer(question) {
  if (busy || !question.trim()) return;
  busy = true;
  chips.hidden = true;
  bubble("user", `<p>${esc(question)}</p>`);
  const t = typing();
  await Promise.race([loadEmbedder(), new Promise((r) => setTimeout(r, 4000))]);
  const ranked = await rank(question);
  const top = ranked[0];
  const wantsGerman = GERMAN.test(question);
  t.remove();

  // German question and the AI is already loaded: let it answer in German
  if (wantsGerman && engine) return finish(question, await aiAnswer(question, ranked));

  if (top.s >= MATCH_OK) {
    await new Promise((r) => setTimeout(r, 300));
    bubble("bot", render(KB[top.i].a), wantsGerman ? "Answer in English, from Meet’s profile" : "");
    return finish(question, KB[top.i].a);
  }

  if (engine) return finish(question, await aiAnswer(question, ranked));

  const close = top.s >= MATCH_MAYBE ? KB[top.i].a : "";
  const intro = close
    ? "Here’s the closest thing I have from Meet’s profile:\n" + close
    : "That isn’t covered in my prepared answers. You can ask Meet directly at **meetgoel12345@gmail.com**.";
  const el = bubble("bot", render(intro));
  if (canRunLlm) {
    const offer = document.createElement("div");
    offer.className = "ai-offer";
    offer.innerHTML = '<button type="button">Get a tailored answer with on-device AI</button><span>Free and private. One-time download of about 900 MB, runs in your browser.</span>';
    el.appendChild(offer);
    offer.querySelector("button").addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      chips.hidden = true;
      offer.querySelector("button").disabled = true;
      finish(question, await aiAnswer(question, ranked, offer));
    }, { once: true });
  }
  finish(question, intro);
}

/* ---------- Open / close ---------- */
function setOpen(open) {
  panel.hidden = !open;
  fab.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("chat-open", open);
  if (open) {
    loadEmbedder();
    setTimeout(() => input.focus(), 50);
  } else {
    fab.focus();
  }
}
fab.addEventListener("click", () => setOpen(panel.hidden));
$("#chat-close").addEventListener("click", () => setOpen(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value;
  input.value = "";
  answer(q);
});
chips.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) answer(b.textContent);
});
// stop smooth-scroll from hijacking wheel events inside the chat
log.setAttribute("data-lenis-prevent", "");
