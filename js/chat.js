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
const CORE = `Meet Goel is an AI and data professional based in Erlangen, Germany. Since Feb 2026 he works at Siemens Healthineers in Erlangen: IT Order-to-Cash intern (Feb to May 2026: Generative AI agents in Microsoft Copilot Studio, interface architecture in SAP Signavio), then Working Student in Service Management and Operations (since May 2026: built Ticket-to-Talk, a Copilot Studio agent turning SHARP incident exports into a KPI dashboard, incident summary and PowerPoint decks; built the Interface Catalogue, a Power Apps app on a 13-table Azure SQL model with Excel bulk ingestion and T-SQL business rules). M.Sc. Data Science, AI and Digital Business at Gisma University (2024 to 2026), thesis on cross-lingual offensive language detection comparing fine-tuned transformers with Qwen2.5 prompting. Open to AI consultant, data scientist, AI engineer and data analyst roles, on-site or hybrid in Erlangen, Nuremberg, Munich, Berlin or Frankfurt. English professional, German limited (A2), Hindi native. Email: meetgoel12345@gmail.com. Unknown: start date, notice period, salary, visa details.`;

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
    a: "Meet Goel is an **AI and data professional based in Erlangen** who already does the work many graduates only describe. As a working student at **Siemens Healthineers**, he designs Generative AI agents that turn raw operational data into KPI dashboards and management-ready reports, and he builds the governed Azure SQL data models behind them. He pairs that hands-on enterprise experience with an **M.Sc. in Data Science, AI and Digital Business** and a research thesis on multilingual NLP. In short: someone who can talk to the business, build the solution, and back it with solid data science. Happy to tell you more about any part of his work.",
  },
  {
    q: ["Why should we hire Meet?", "What are his strengths?", "What makes him stand out?", "Why is he a good fit?", "What value would he bring?"],
    a: "Because Meet brings **proof, not just potential**. At Siemens Healthineers he has already built AI agents for real business teams: **Ticket-to-Talk** turns incident exports into KPI dashboards, incident summaries and presentation-ready PowerPoint decks for management. He also built the **Interface Catalogue**, a 13-table Azure SQL application that gave his department one source of truth for interface data. On top of that, his master’s research shows real analytical rigour: he benchmarked fine-tuned transformers against an open-weight LLM and validated every result across multiple seeds. You get someone who understands the business problem, builds a working solution and checks that it actually holds up. That combination is rare at this stage of a career.",
  },
  {
    q: ["What does he do at Siemens Healthineers?", "What is his current role?", "Is he working now?", "Working student role", "Service management and operations", "Ticket-to-Talk", "Tell me about his AI agent"],
    a: "Since May 2026 Meet has been a **Working Student in Service Management and Operations at Siemens Healthineers** in Erlangen, and his work there goes well beyond a typical student job. He built **Ticket-to-Talk**, a Microsoft Copilot Studio agent that analyses incident exports from the SHARP ticketing system and produces a filterable KPI dashboard with an incident summary. He then extended it to generate **PowerPoint decks in the team’s own template**, turning raw incident data into ready-made management reporting. Alongside that he built the **Interface Catalogue** in Power Apps on Azure SQL, with bulk Excel ingestion and business rules in T-SQL. It’s the kind of AI-plus-data work most companies are trying to hire for right now.",
  },
  {
    q: ["What did he do in his internship?", "Order-to-Cash project", "What was his Siemens internship about?", "Has he worked at a big company?", "Corporate experience", "Enterprise or large company experience", "Industry experience"],
    a: "Meet joined **Siemens Healthineers** as an **IT Order-to-Cash intern** (Feb to May 2026), his first corporate role, and he made an impact quickly. He designed and deployed **several Generative AI agents in Microsoft Copilot Studio**, translating department process requirements into working solutions. He also modelled the **Order-to-Cash interface architecture in SAP Signavio**, mapping how business processes flow across integrated enterprise systems. Siemens Healthineers then kept him on as a working student in Service Management and Operations, which says a lot about the value he delivered in a large, regulated healthcare company.",
  },
  {
    q: ["Does he have experience with AI agents?", "Generative AI experience", "LLM experience", "Copilot Studio", "Automation experience", "Has he worked with large language models?", "Can he build AI solutions?"],
    a: "Yes, and it’s his strongest area. At Siemens Healthineers Meet has **designed and deployed multiple Generative AI agents in Microsoft Copilot Studio**. The standout is **Ticket-to-Talk**, which turns incident data into KPI dashboards and PowerPoint reports, and he has also automated communication documentation with Copilot Studio and Power Automate. On the research side, his thesis put an open-weight LLM (**Qwen2.5**) head-to-head with fine-tuned transformers, so he understands not just how to use LLMs but **when they work and when they don’t**. That mix of practical agent building and honest evaluation is exactly what a company needs to get real value from GenAI.",
  },
  {
    q: ["What was his thesis about?", "Master thesis", "Research experience", "Tell me about his NLP research", "What did his research find?"],
    a: "Meet’s master’s thesis tackles a hard, real-world problem: **detecting offensive language in Tamil, Malayalam and Kannada**, languages with very little labelled data. He built a full Python NLP pipeline testing zero-shot, few-shot (50, 100 and 500 examples) and monolingual setups, and benchmarked fine-tuned transformer models against **LLM prompting with Qwen2.5-1.5B**. What sets it apart is the rigour: he validated every result with **multi-seed robustness sweeps** and explained model decisions with **LIME**. It shows he can design careful experiments and draw conclusions you can trust, a skill that carries straight into any data science team.",
  },
  {
    q: ["Does he know NLP?", "Natural language processing skills", "Transformers experience", "Text classification experience", "Hugging Face"],
    a: "NLP is one of Meet’s core strengths. In his thesis he fine-tuned **Hugging Face transformer models** for cross-lingual text classification on messy, code-mixed data, compared them with LLM prompting, and used **LIME** to explain what the models were actually learning. He also built **CINEMATE**, a TF-IDF movie recommender deployed on AWS, and a phishing email classifier. Whether it’s classic NLP or modern LLMs, he knows how to choose the right tool and prove it works.",
  },
  {
    q: ["What machine learning experience does he have?", "ML skills", "Which models has he built?", "Predictive modelling experience", "Regression and classification"],
    a: "Meet has hands-on experience across the machine learning toolkit: **transformer fine-tuning** in his thesis, a **content-based recommender** deployed on AWS EC2, **sales forecasting** for Walmart, and **regression and classification** projects with careful model comparison and cross-validation. He works mainly in **Python with scikit-learn** and Hugging Face, and he pays close attention to evaluation: robustness testing and interpretability are part of how he works, not an afterthought. That means models you can actually rely on in production.",
  },
  {
    q: ["What is his tech stack?", "Technical skills", "Which tools does he use?", "Programming languages", "Does he know Python and SQL?"],
    a: "Meet’s toolkit spans the full path from data to AI product. For **Generative AI and agents**: Microsoft Copilot Studio, Hugging Face Transformers, Qwen2.5 and LLM prompting and evaluation. For **machine learning**: Python, scikit-learn, deep learning, NLP, LIME and robustness testing. For **data engineering and cloud**: SQL and T-SQL, relational data modelling, data quality and governance, Microsoft Azure (Azure SQL Server), AWS EC2 and Docker. And for **business processes and enterprise apps**: SAP Signavio, Power Apps, Power Automate, Power BI and Excel. Most importantly, he uses these tools daily in a real enterprise, not just in coursework.",
  },
  {
    q: ["Data analysis experience", "Business intelligence skills", "Power BI or Tableau?", "Can he build dashboards?", "Data analyst role", "Reporting experience"],
    a: "Turning data into decisions is a big part of what Meet does at Siemens Healthineers. His **Ticket-to-Talk** agent produces a **filterable KPI dashboard and an incident summary** from raw ticket exports, then packages the results as **management-ready PowerPoint decks**. He also designs the data underneath: a **13-table relational model in Azure SQL** with data-quality rules in T-SQL. Add Power BI, Excel and a diploma in data analytics, and he’s well equipped for analyst and BI roles that need both clean data and clear storytelling.",
  },
  {
    q: ["Can he deploy models?", "Cloud experience", "MLOps experience", "AWS or Azure experience", "Has he shipped anything to production?", "Data engineering experience"],
    a: "Yes, Meet ships real things. At Siemens Healthineers he builds AI agents and the Interface Catalogue for his department on **Microsoft Azure (Azure SQL Server)** with Power Automate pipelines for bulk data ingestion. He keeps business logic in the **governed data layer** with T-SQL stored procedures, a sign of good engineering judgement. Outside work he deployed his CINEMATE recommender on **AWS EC2**, and he’s comfortable with Docker. He understands that a model only creates value once it’s reliably in people’s hands.",
  },
  {
    q: ["What is his education?", "Which degrees does he have?", "Where did he study?", "University", "Bachelor degree"],
    a: "Meet is completing an **M.Sc. in Data Science (AI and Digital Business, Computer Science)** at Gisma University of Applied Sciences (Sep 2024 to 2026), with a thesis on cross-lingual NLP and LLMs. Before that he earned a **Bachelor of Computer Applications** at IMS Ghaziabad (2021 to 2024) **with an A+ grade**, a diploma in data analytics and a Best Performer of the Batch award, plus winter training in full-stack development at **IIT Kanpur**. A strong technical foundation, now applied every day at Siemens Healthineers.",
  },
  {
    q: ["Does he speak German?", "Language skills", "Sprachkenntnisse", "Spricht er Deutsch?", "English level"],
    a: "Meet works **fully in English** at a professional level, which he does every day at Siemens Healthineers, and Hindi is his native language. His **German is at a limited working level (A2)**, and he’s actively improving it while living and working in Germany. He’s a great fit for international teams and English-speaking roles; if a role needs fluent German, it’s worth a quick chat with him about his progress and timeline.",
  },
  {
    q: ["Where is he located?", "Is he open to relocation?", "Which cities?", "Remote or hybrid?", "Work location preference"],
    a: "Meet is **based in Erlangen** and already works on-site at Siemens Healthineers there. He’s open to **on-site or hybrid roles in Erlangen, Nuremberg, Munich, Berlin and Frankfurt am Main**, so the whole Franconia and Munich region is an easy fit, and he’s flexible for the right opportunity in the other cities.",
  },
  {
    q: ["When can he start?", "Availability", "Notice period", "Is he available now?", "Start date"],
    a: "Meet is **actively looking for his next role** in AI, data science or data analytics. He is completing his M.Sc. in 2026 and currently works as a working student at Siemens Healthineers. For an exact start date or notice period, the quickest way is to email him at **meetgoel12345@gmail.com**. He’s happy to set up a call.",
  },
  {
    q: ["Does he need a visa?", "Work permit", "Visa sponsorship", "Is he allowed to work in Germany?"],
    a: "I don’t have the details of Meet’s visa or work-permit status, so I don’t want to guess. What I can say is that he already lives and works in Germany at Siemens Healthineers. For specifics, please ask him directly at **meetgoel12345@gmail.com**. He’ll give you a clear answer.",
  },
  {
    q: ["What are his salary expectations?", "Salary", "Compensation", "Expected pay"],
    a: "That’s best discussed with Meet directly, since it depends on the role and responsibilities. He’s open and easy to talk to, so just drop him a line at **meetgoel12345@gmail.com**.",
  },
  {
    q: ["What motivates him?", "Career goals", "Why data science?", "What kind of role is he looking for?", "Motivation", "Why AI?"],
    a: "Meet is motivated by **seeing AI make someone’s day easier**. At Siemens Healthineers he watched raw incident exports turn into dashboards and management decks with a single agent, and that’s the kind of impact he wants to keep creating. He started in web development, moved into data science to build the intelligence behind products, and now combines both in GenAI. He’s looking for a role as an **AI consultant, data scientist, AI engineer or data analyst** where he can work close to the business, build solutions that people actually use, and keep growing fast.",
  },
  {
    q: ["Soft skills", "Is he a team player?", "Leadership experience", "Communication skills", "Teamwork", "Can he work with stakeholders?", "Is he good at working with business people?", "Can he work with non-technical colleagues?", "Does he communicate well with business teams?", "Is he client-facing?"],
    a: "Very much so. Meet’s day-to-day work at Siemens Healthineers is about **translating business needs into technical solutions**: he gathers process requirements from colleagues and turns them into working AI agents and data apps. He also brings an **international background across India and Germany**. At university he was **President of the IT Club**, class representative and a coordinator for hackathons, and in Germany he volunteered as an event coordinator for a career fair. He’s the kind of colleague who communicates clearly, takes ownership and makes the team around him better.",
  },
  {
    q: ["What are his weaknesses?", "Areas for improvement", "What is he still learning?"],
    a: "Honestly, the main one is **German**: he’s at a limited working level and actively improving it while working in Germany. He’s also early in his career, but he makes up for it with **how fast he delivers**. Within months at Siemens Healthineers he went from his first corporate internship to building AI agents and data applications for his department. He learns quickly and isn’t afraid to say what he doesn’t know yet.",
  },
  {
    q: ["Which certifications does he have?", "Certificates", "Courses completed", "IBM certification"],
    a: "Meet backs his skills with **verifiable certifications**: **IBM Machine Learning with Python** and **IBM Data Science Methodologies and Foundations**, plus FutureLearn certificates in **Data Analytics with Python**, Excel and **Microsoft Future Ready Data Science Research**. You’ll find each one with a “Verify” link in the Certifications section, so you can check them in one click.",
  },
  {
    q: ["What projects has he done?", "Best project", "Portfolio projects", "Show me his work", "GitHub projects"],
    a: "His standout work is from Siemens Healthineers: the **Ticket-to-Talk** AI agent (incident data to KPI dashboards and PowerPoint reports) and the **Interface Catalogue** (a 13-table Azure SQL app with governed business rules). Beyond work, there’s his **master’s thesis** benchmarking fine-tuned transformers against an open-weight LLM, **CINEMATE**, an NLP movie recommender deployed on AWS, plus forecasting and classification projects. Scroll to the Projects section for previews, or visit **github.com/meetgoel** for the code.",
  },
  {
    q: ["Could he build a prediction model for us?", "Can he do churn prediction?", "Could he help our team with forecasting?", "Can he build a recommendation system?", "Could he solve our business problem with machine learning?", "Could he build an AI agent for us?"],
    a: "Very likely, and he has already built the closest building blocks. He has delivered **AI agents that automate reporting** at Siemens Healthineers, a **recommender system** deployed on AWS, **forecasting and classification models**, and **governed data models in Azure SQL**. Just as important, he’s used to sitting with business users, understanding the real problem and turning it into a working solution. The best next step is a short conversation about your use case: **meetgoel12345@gmail.com**.",
  },
  {
    q: ["Tell me about the Cinemate project", "Movie recommender", "Recommendation system project", "Streamlit app"],
    a: "**CINEMATE** is a movie recommender Meet built end to end in Oct to Nov 2025. It uses **TF-IDF vectorisation and a similarity matrix** on the TMDB dataset to suggest films with similar content, and he **deployed it on AWS EC2** with a custom web interface. It’s a nice example of him taking an idea from data to a live, usable product. The code is on github.com/meetgoel/Business-Project-in-Big-Data-AI.",
  },
  {
    q: ["Tell me about JARVIS", "Voice assistant project", "Bachelor final project", "Computer vision project", "Face recognition"],
    a: "**J.A.R.V.I.S.** was Meet’s bachelor’s final project: a macOS voice assistant with **face recognition** for secure start-up, **speech recognition**, Hugging Face chat and image generation, a weather API and system automation. He built it in Python (OpenCV, face_recognition) with a web front end. It shows his curiosity and his drive to build complete, working AI products, even before his master’s.",
  },
  {
    q: ["How does he approach a new dataset?", "How would he handle messy data?", "What is his way of working?", "How does he work on a data science problem?", "Data cleaning experience"],
    a: "Meet starts with the **business question and the data**, not the model. He cleans and explores the data first and puts **business rules and quality checks where they belong**: at Siemens Healthineers he enforces them in T-SQL so every app built on top can trust the data. Then he builds the simplest thing that works and tests it honestly; in his thesis he validated results across **multiple random seeds** and used **LIME** to explain model decisions. The result is work that stakeholders can understand and rely on.",
  },
  {
    q: ["What are his hobbies?", "What does he do outside work?", "Personal interests", "Tell me something personal about him"],
    a: "Outside work Meet plays musical instruments, draws, and enjoys computer and board games. His personal motto sums him up nicely: **born to express, not to impress**.",
  },
  {
    q: ["How can I contact him?", "Email", "Can I get his CV?", "Schedule an interview", "LinkedIn profile"],
    a: "The easiest way is email: **meetgoel12345@gmail.com**. You can also connect on LinkedIn at **linkedin.com/in/meet-goel**, or download his latest CV with the “Download CV” button at the top of this page. He’d be glad to set up a call and walk you through his work.",
  },
  {
    q: ["Hi", "Hello", "What can you do?", "Help", "Hallo"],
    a: "Hi there, and thanks for stopping by! I can tell you about Meet’s **experience at Siemens Healthineers, his AI agents, skills, thesis, projects, languages and availability**. Pick one of the questions below or ask me anything.",
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
