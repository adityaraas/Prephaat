const articlesEl = document.getElementById("articles");
const feedEl = document.getElementById("feed");
const feedMeta = document.getElementById("feed-meta");
const sourceFilters = document.getElementById("source-filters");
const subjectEl = document.getElementById("subject");
const methodEl = document.getElementById("paper-method");
const quizEl = document.getElementById("quiz");
const trackerEl = document.getElementById("tracker");
const quizPick = document.getElementById("quiz-pick");
const quizBoard = document.getElementById("quiz-board");
const quizTimerEl = document.getElementById("quiz-timer");
const quizHistoryEl = document.getElementById("quiz-history");
const tabsEl = document.getElementById("tabs");
const syllabusContent = document.getElementById("syllabus-content");
const syllabusBox = document.getElementById("syllabus-box");
const pyqEl = document.getElementById("pyq");
const pyqBoard = document.getElementById("pyq-board");
const pyqExamEl = document.getElementById("pyq-exam");
const pyqStageEl = document.getElementById("pyq-stage");
const pyqYearEl = document.getElementById("pyq-year");
const pyqPaperEl = document.getElementById("pyq-paper");
const pyqMeta = document.getElementById("pyq-meta");
const surveyEl = document.getElementById("survey");
const surveyBoard = document.getElementById("survey-board");

let newsItems = [];
let activeSource = "all";
let studyData = null;
let syllabusData = null;
let activeExam = "upsc";
let tracker = null;
let activeQuiz = null;
let quizAnswers = {};
let extraNotes = {};
let pyqIndex = null;
let pyqBanks = {};
let pyqExam = "upsc";
let pyqStage = "prelims";
let pyqYear = 2024;
let pyqPaper = "all";
let pyqPicks = {};
let pyqOpen = {};
let ncertCache = {};
let ncertClass = {
  history: "all",
  geography: "all",
  economy: "all",
  polity: "all",
  science: "all",
  environment: "all",
};
let quizSubject = "history";
let quizEndsAt = 0;
let quizTimerId = 0;
let quizLocked = false;
let audioCtx = null;
const QUIZ_SECONDS = 600;
const OPTION_LETTERS = ["A", "B", "C", "D"];
const NCERT_IDS = ["history", "geography", "economy", "polity", "science", "environment"];
const SEARCH_LIMIT = 18;

let searchIndex = [];
let searchHits = [];
let searchActive = -1;

const quizSubjects = [
  { id: "current", title: "Current affairs" },
  { id: "history", title: "History" },
  { id: "geography", title: "Geography" },
  { id: "polity", title: "Polity" },
  { id: "economy", title: "Economy" },
  { id: "science", title: "Science" },
  { id: "environment", title: "Environment" },
  { id: "ethics", title: "Ethics" },
  { id: "survey", title: "Economic Survey" },
];

function playTone(freq, duration, type = "square") {
  try {
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    /* ignore autoplay limits */
  }
}

function clickSound() {
  playTone(880, 0.07, "square");
  playTone(1320, 0.05, "triangle");
}

function stopQuizTimer() {
  if (quizTimerId) window.clearInterval(quizTimerId);
  quizTimerId = 0;
}

function renderTimer() {
  if (!activeQuiz || quizLocked) {
    quizTimerEl.innerHTML = "";
    return;
  }
  const seconds = Number(activeQuiz?.durationSeconds) || QUIZ_SECONDS;
  const left = Math.max(0, Math.ceil((quizEndsAt - Date.now()) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = Math.max(0, (left / seconds) * 100);
  quizTimerEl.innerHTML = `
    <div class="timer-wrap ${left <= 60 ? "low" : ""}">
      <div class="timer">${mm}:${ss}</div>
      <div class="timer-bar"><span style="width:${pct}%"></span></div>
      <span>auto-submit</span>
    </div>`;
  if (left <= 10 && left > 0) playTone(520, 0.04, "sine");
}

function startQuizTimer() {
  stopQuizTimer();
  quizLocked = false;
  quizEndsAt = Date.now() + (Number(activeQuiz?.durationSeconds) || QUIZ_SECONDS) * 1000;
  renderTimer();
  quizTimerId = window.setInterval(() => {
    renderTimer();
    if (Date.now() >= quizEndsAt) {
      stopQuizTimer();
      submitQuiz(true);
    }
  }, 1000);
}

async function submitQuiz(fromTimer = false) {
  if (!activeQuiz || quizLocked) return;
  quizLocked = true;
  stopQuizTimer();
  quizTimerEl.innerHTML = fromTimer
    ? `<div class="timer-wrap low"><div class="timer">00:00</div><span>time up — scoring</span></div>`
    : "";
  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: activeQuiz.subject,
      ids: activeQuiz.questions.map((q) => q.id),
      answers: quizAnswers,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    quizLocked = false;
    quizBoard.insertAdjacentHTML("afterbegin", `<p class="empty">${escapeHtml(data.error ?? "Submit failed")}</p>`);
    return;
  }
  playTone(523, 0.1, "sine");
  setTimeout(() => playTone(659, 0.12, "sine"), 90);
  tracker = data.tracker;
  renderTracker();
  renderQuizBoard({ ...data, id: data.attemptId });
  loadHistory();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function requireSession() {
  const res = await fetch("/api/me");
  if (!res.ok) {
    window.location.href = "/";
    return null;
  }
  return res.json();
}

function renderTabs() {
  const items = [
    { id: "current", label: "🗞️ Current affairs" },
    { id: "quiz", label: "⚡ Quiz" },
    { id: "pyq", label: "📘 PYQ" },
    { id: "survey", label: "📊 Economic Survey" },
    ...studyData.subjects.map((subject) => ({
      id: subject.id,
      label: `${subject.emoji ?? ""} ${subject.title}`.trim(),
    })),
  ];
  tabsEl.innerHTML = items
    .map((item, index) => `<button type="button" data-tab="${item.id}" class="${index === 0 ? "on" : ""}">${escapeHtml(item.label)}</button>`)
    .join("");
}

async function showTab(id) {
  for (const button of tabsEl.querySelectorAll("button")) {
    button.classList.toggle("on", button.dataset.tab === id);
  }
  const isNews = id === "current";
  const isQuiz = id === "quiz";
  const isPyq = id === "pyq";
  const isSurvey = id === "survey";
  feedEl.hidden = !isNews;
  methodEl.hidden = !isNews;
  quizEl.hidden = !isQuiz;
  pyqEl.hidden = !isPyq;
  surveyEl.hidden = !isSurvey;
  subjectEl.hidden = isNews || isQuiz || isPyq || isSurvey;
  if (isQuiz) {
    renderQuizPick();
    renderTracker();
    loadHistory();
  } else if (isPyq) {
    await renderPyq();
  } else if (isSurvey) {
    await renderSurvey();
  } else if (!isNews) {
    await renderSubject(id);
  }
}

async function loadPyqBank(exam) {
  if (pyqBanks[exam]) return pyqBanks[exam];
  const res = await fetch(`/data/pyq-${exam}.json`);
  pyqBanks[exam] = res.ok ? await res.json() : { papers: [] };
  return pyqBanks[exam];
}

function pyqChips(el, items, current, attr) {
  el.innerHTML = items
    .map(
      (item) =>
        `<button type="button" class="${String(item.id) === String(current) ? "on" : ""}" data-${attr}="${escapeHtml(String(item.id))}">${escapeHtml(item.label)}</button>`
    )
    .join("");
}

function currentPyqPapers() {
  const bank = pyqBanks[pyqExam];
  if (!bank) return [];
  return (bank.papers || []).filter((paper) => paper.stage === pyqStage && Number(paper.year) === Number(pyqYear));
}

function renderPyqQuestion(item, paper) {
  const open = Boolean(pyqOpen[item.id]);
  const pick = pyqPicks[item.id];
  const isMains = paper.stage === "mains";
  if (isMains) {
    return `
      <article class="q pyq-q" data-hit="pyq:${escapeHtml(item.id)}">
        <p class="badge">${escapeHtml(paper.paper)} · ${item.marks || ""} marks · Q${item.n}</p>
        <h3>${escapeHtml(item.q)}</h3>
        <button type="button" class="ghost" data-pyq-sol="${escapeHtml(item.id)}">${open ? "Hide solution" : "Show solution"}</button>
        ${open ? `<div class="explain pyq-sol"><strong>Model solution</strong><p>${escapeHtml(item.solution)}</p></div>` : ""}
      </article>`;
  }
  const options = (item.options || [])
    .map((opt, idx) => {
      let cls = "q-opt";
      if (item.cancelled) cls += " bad";
      else if (open || pick !== undefined) {
        if (idx === item.answer) cls += " good";
        else if (pick === idx && idx !== item.answer) cls += " bad";
        else if (pick === idx) cls += " picked";
      } else if (pick === idx) cls += " picked";
      return `<button type="button" class="${cls}" data-pyq-opt="${idx}" data-pyq-id="${escapeHtml(item.id)}"><span class="opt-key">${OPTION_LETTERS[idx] || idx + 1}</span><span class="opt-text">${escapeHtml(opt)}</span></button>`;
    })
    .join("");
  const sol =
    open || pick !== undefined
      ? `<div class="explain pyq-sol"><strong>${item.cancelled ? "Deleted" : "Solution"}</strong><p>${escapeHtml(item.solution)}</p></div>`
      : `<button type="button" class="ghost" data-pyq-sol="${escapeHtml(item.id)}">Show solution</button>`;
  return `
    <article class="q pyq-q" data-hit="pyq:${escapeHtml(item.id)}">
      <p class="badge">${escapeHtml(item.topic || "GS")} · Q${item.n}${item.cancelled ? " · deleted" : ""}</p>
      <h3>${escapeHtml(item.q)}</h3>
      ${options}
      ${sol}
    </article>`;
}

async function renderPyq() {
  if (!pyqBanks[pyqExam] && !pyqIndex) {
    pyqBoard.innerHTML = `<p class="empty">Loading previous year papers…</p>`;
  }
  if (!pyqIndex) {
    const res = await fetch("/data/pyq-index.json");
    pyqIndex = res.ok ? await res.json() : { exams: [] };
  }
  const examMeta = (pyqIndex.exams || []).find((entry) => entry.id === pyqExam) || pyqIndex.exams[0];
  if (examMeta) pyqExam = examMeta.id;
  await loadPyqBank(pyqExam);
  const yearKey = pyqStage === "mains" ? "mainsYears" : "prelimsYears";
  const years = examMeta?.[yearKey] || [];
  if (years.length && !years.includes(Number(pyqYear))) pyqYear = years[0];
  pyqChips(
    pyqExamEl,
    (pyqIndex.exams || []).map((entry) => ({ id: entry.id, label: entry.title })),
    pyqExam,
    "pyq-exam"
  );
  pyqChips(
    pyqStageEl,
    [
      { id: "prelims", label: "Prelims" },
      { id: "mains", label: "Mains" },
    ],
    pyqStage,
    "pyq-stage"
  );
  pyqChips(
    pyqYearEl,
    years.map((year) => ({ id: year, label: String(year) })),
    pyqYear,
    "pyq-year"
  );
  const papers = currentPyqPapers();
  const paperNames = [...new Set(papers.map((paper) => paper.paper))];
  if (paperNames.length > 1) {
    pyqChips(
      pyqPaperEl,
      [{ id: "all", label: "All papers" }, ...paperNames.map((name) => ({ id: name, label: name }))],
      pyqPaper,
      "pyq-paper"
    );
  } else {
    pyqPaper = "all";
    pyqPaperEl.innerHTML = "";
  }
  const visible = papers.filter((paper) => pyqPaper === "all" || paper.paper === pyqPaper);
  const official = visible[0]?.official || pyqIndex.official?.[pyqExam] || "";
  const count = visible.reduce((n, paper) => n + paper.questions.length, 0);
  pyqMeta.innerHTML = visible[0]
    ? `${escapeHtml(visible[0].note || "")} · ${count} questions. <a href="${escapeHtml(official)}" target="_blank" rel="noopener noreferrer">Official papers</a>`
    : "No paper in this year yet.";
  pyqBoard.innerHTML = visible.length
    ? visible
        .map(
          (paper) => `
            <div class="ncert-book">
              <h3>${escapeHtml(paper.paper)} · ${paper.year}</h3>
              ${paper.questions.map((item) => renderPyqQuestion(item, paper)).join("")}
            </div>`
        )
        .join("")
    : `<p class="empty">Pick another year or stage. Full booklets keep being added; 2024 UPSC GS-I and 69th–70th BPSC Prelims are complete papers.</p>`;
}

let surveyData = null;
let surveyFiles = null;
let surveyQuizPack = null;
let surveyQuizPicks = {};
let surveyQuizDone = false;
let surveyQuizMessage = "";

function surveyAnswerIndex(letter) {
  return { A: 0, B: 1, C: 2, D: 3 }[String(letter).toUpperCase()];
}

function renderSurveyQuiz() {
  const host = document.getElementById("survey-quiz");
  if (!host || !surveyQuizPack) return;
  const questions = surveyQuizPack.questions ?? [];
  const cards = questions
    .map((item, index) => {
      const qid = `es-${item.id}`;
      const correct = surveyAnswerIndex(item.answer);
      const pick = surveyQuizPicks[qid];
      const keys = ["A", "B", "C", "D"];
      const options = keys
        .map((key, optIndex) => {
          const text = item.options[key];
          let cls = "q-opt";
          if (surveyQuizDone) {
            if (optIndex === correct) cls += " good";
            else if (pick === optIndex && pick !== correct) cls += " bad";
          } else if (pick === optIndex) cls += " picked";
          return `<button type="button" class="${cls}" data-survey-opt="${optIndex}" data-survey-id="${qid}" ${surveyQuizDone ? "disabled" : ""}><span class="opt-key">${key}</span><span class="opt-text">${escapeHtml(text)}</span></button>`;
        })
        .join("");
      const explain = surveyQuizDone
        ? `<div class="explain pyq-sol"><strong>Answer: ${escapeHtml(item.answer)}</strong><p>${escapeHtml(item.explanation)}</p></div>`
        : "";
      return `
        <article class="q">
          <p class="badge">Q${index + 1} / ${questions.length}</p>
          <h3>${escapeHtml(item.question)}</h3>
          ${options}
          ${explain}
        </article>`;
    })
    .join("");
  const answered = Object.keys(surveyQuizPicks).length;
  const score = surveyQuizDone
    ? questions.filter((item) => surveyQuizPicks[`es-${item.id}`] === surveyAnswerIndex(item.answer)).length
    : null;
  host.innerHTML = `
    <h3>${escapeHtml(surveyQuizPack.title)}</h3>
    <p class="meta">${escapeHtml(surveyQuizPack.source)} · ${questions.length} questions</p>
    ${surveyQuizDone ? `<p class="stat">${score} / ${questions.length}</p>` : `<p class="meta">${answered} answered</p>`}
    ${surveyQuizMessage ? `<p class="meta">${escapeHtml(surveyQuizMessage)}</p>` : ""}
    ${cards}
    <p>
      ${
        surveyQuizDone
          ? `<button type="button" class="ghost" data-survey-reset="1">Try again</button>`
          : `<button type="button" class="cta" data-survey-submit="1">Submit & save score</button>`
      }
    </p>
  `;
}

async function renderSurvey() {
  if (!surveyData) {
    surveyBoard.innerHTML = `<p class="empty">Loading Economic Survey notes…</p>`;
    const res = await fetch("/data/economic-survey.json");
    surveyData = res.ok ? await res.json() : null;
  }
  if (!surveyData) {
    surveyBoard.innerHTML = `<p class="empty">Could not load the Survey notes.</p>`;
    return;
  }
  const filesRes = surveyFiles
    ? { ok: true, json: async () => surveyFiles }
    : await fetch("/api/survey/files");
  const filesPayload = filesRes.ok ? (surveyFiles ?? (await filesRes.json())) : { files: [], official: surveyData.official };
  surveyFiles = filesPayload;
  if (!surveyQuizPack) {
    const quizRes = await fetch("/data/economic-survey-quiz.json");
    surveyQuizPack = quizRes.ok ? await quizRes.json() : { questions: [] };
  }
  const downloads = (filesPayload.files ?? [])
    .map((file) => `<a class="cta survey-dl" href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.label)}</a>`)
    .join("");
  const official = `<a class="ghost" href="${escapeHtml(filesPayload.official || surveyData.official)}" target="_blank" rel="noopener noreferrer">MoF page</a>`;
  const nums = (surveyData.headlineNumbers ?? [])
    .map(
      (item) => `
        <div class="survey-stat">
          <p class="stat">${escapeHtml(item.value)}</p>
          <p class="meta">${escapeHtml(item.label)}</p>
          <p class="detail">${escapeHtml(item.hint)}</p>
        </div>`
    )
    .join("");
  const slides = (surveyData.slides ?? [])
    .map(
      (slide) => `
        <figure class="survey-slide">
          <img src="${escapeHtml(slide.src)}" alt="${escapeHtml(slide.caption)}" loading="lazy" />
          <figcaption>${escapeHtml(slide.caption)}</figcaption>
        </figure>`
    )
    .join("");
  const how = (surveyData.howToUse ?? []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const chapters = (surveyData.chapters ?? [])
    .map(
      (ch) => `
        <article class="module" data-hit="survey:${escapeHtml(ch.id)}">
          <h3>Chapter ${ch.no}. ${escapeHtml(ch.title)}</h3>
          <ul>${(ch.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
          <p class="exam-hook">${escapeHtml(ch.exam || "")}</p>
        </article>`
    )
    .join("");
  surveyBoard.innerHTML = `
    <img class="survey-banner" src="${escapeHtml(surveyData.hero.banner)}" alt="Economic Survey 2025-26" />
    <div class="survey-hero">
      <div>
        <h2>${escapeHtml(surveyData.title)}</h2>
        <p class="meta">${escapeHtml(surveyData.source)}</p>
        <p class="detail">${escapeHtml(surveyData.note)}</p>
        <p class="survey-actions">${downloads} ${official}</p>
      </div>
      <img class="survey-cover" src="${escapeHtml(surveyData.hero.cover)}" alt="Survey cover" />
    </div>
    <div class="survey-stats">${nums}</div>
    <h3>Images from the Highlights PDF</h3>
    <p class="meta">Official Ministry of Finance infographic pages (educational use, attributed).</p>
    <div class="survey-gallery">${slides}</div>
    <h3>How to use this in the exam</h3>
    <ol class="method">${how}</ol>
    <h3>Chapter points</h3>
    ${chapters}
    <div id="survey-quiz" class="survey-quiz"></div>
  `;
  renderSurveyQuiz();
}

async function loadNcert(id) {
  const files = ["history", "geography", "economy", "polity", "science", "environment"];
  if (!files.includes(id)) return null;
  if (!ncertCache[id]) {
    const res = await fetch(`/data/ncert-${id}.json`);
    ncertCache[id] = res.ok ? await res.json() : { books: [] };
  }
  return ncertCache[id];
}

function renderNcert(id, pack) {
  const selected = String(ncertClass[id] ?? "all");
  const classes = [...new Set(pack.books.map((book) => book.class))].sort((a, b) => a - b);
  const chips = ["all", ...classes]
    .map((cls) => {
      const label = cls === "all" ? "All classes" : `Class ${cls}`;
      const on = String(cls) === selected ? "on" : "";
      return `<button type="button" class="${on}" data-ncert-class="${cls}">${label}</button>`;
    })
    .join("");
  const books = pack.books.filter((book) => selected === "all" || String(book.class) === selected);
  const chapters = books
    .map((book) => {
      const cards = book.chapters
        .map(
          (ch) => `
            <article class="ncert-card" data-hit="ncert:${escapeHtml(ch.title)}">
              <h4>${escapeHtml(ch.title)}</h4>
              <p class="detail">${escapeHtml(ch.summary)}</p>
              <ul>${ch.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
              <p class="exam-hook">Exam: ${escapeHtml(ch.exam)}</p>
            </article>`
        )
        .join("");
      return `
        <div class="ncert-book">
          <h3>Class ${book.class} · ${escapeHtml(book.book)}</h3>
          ${cards}
        </div>`;
    })
    .join("");
  return `
    <div class="ncert-block">
      <h2>NCERT path · Class 6–12</h2>
      <p class="meta">${escapeHtml(pack.note)}</p>
      <div class="filters" id="ncert-filters">${chips}</div>
      ${chapters}
    </div>`;
}

function extraModulesHtml(id, heading = "More material") {
  const extras = extraNotes[id] ?? [];
  if (!extras.length) return "";
  return `<h2>${escapeHtml(heading)}</h2>${extras
    .map(
      (mod) => `
        <div class="module" data-hit="extra:${escapeHtml(mod.title)}">
          <h3>${escapeHtml(mod.title)}</h3>
          ${(mod.explain || []).map((para) => `<p class="detail">${escapeHtml(para)}</p>`).join("")}
          <ul>${(mod.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        </div>`
    )
    .join("")}`;
}

function renderMethod() {
  const steps = studyData.howToReadPaper.steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");
  methodEl.innerHTML = `<h2>${escapeHtml(studyData.howToReadPaper.title)}</h2><ol>${steps}</ol>${extraModulesHtml("current", "CA notebooks")}`;
}

function renderFilters() {
  const sources = ["all", ...new Set(newsItems.map((item) => item.source))];
  sourceFilters.innerHTML = sources
    .map(
      (source) =>
        `<button type="button" data-source="${escapeHtml(source)}" class="${source === activeSource ? "on" : ""}">${source === "all" ? "All desks" : escapeHtml(source)}</button>`
    )
    .join("");
}

function renderArticles() {
  const list = newsItems.filter((item) => activeSource === "all" || item.source === activeSource);
  if (!list.length) {
    articlesEl.innerHTML = `<p class="empty">No stories loaded. Check the network, then refresh. Subject notes below still work.</p>`;
    return;
  }
  articlesEl.innerHTML = list
    .map((item) => {
      const date = item.published ? new Date(item.published).toLocaleString("en-IN", { dateStyle: "medium" }) : "";
      const tags = (item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
      return `
        <article class="article" data-hit="news:${escapeHtml(item.title)}">
          <span class="badge">${escapeHtml(item.source)} · ${escapeHtml(item.section)}</span>
          <span class="meta">${escapeHtml(date)}</span>
          <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
          <p>${escapeHtml(item.summary)}</p>
          <div class="tags">${tags}</div>
        </article>`;
    })
    .join("");
}

async function renderSubject(id) {
  const subject = studyData.subjects.find((entry) => entry.id === id);
  if (!subject) return;
  const overview = subject.overview
    ? `<p class="overview">${escapeHtml(subject.overview)}</p>`
    : "";
  const modules = subject.modules
    .map((mod) => {
      const explain = (mod.explain || []).map((para) => `<p class="detail">${escapeHtml(para)}</p>`).join("");
      return `
        <div class="module" data-hit="mod:${escapeHtml(mod.title)}">
          <h3>${escapeHtml(mod.title)}</h3>
          ${explain}
          <ul>${mod.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        </div>`;
    })
    .join("");
  let ncertHtml = "";
  const pack = await loadNcert(id);
  if (pack?.books?.length) ncertHtml = renderNcert(id, pack);
  const extraHtml = extraModulesHtml(id);
  let facultyHtml = "";
  const facRes = await fetch(`/api/materials?subject=${encodeURIComponent(id)}`);
  if (facRes.ok) {
    const fac = await facRes.json();
    const list = fac.materials ?? [];
    if (list.length) {
      facultyHtml = `<h2>Faculty desk (published)</h2>${list
        .map(
          (item) => `
            <article class="ncert-card">
              <h4>${escapeHtml(item.title)}</h4>
              <p class="meta">${escapeHtml(item.author ?? "Faculty")} · ${escapeHtml(item.class_tag ?? "")}</p>
              <p class="detail">${escapeHtml(item.body)}</p>
            </article>`
        )
        .join("")}`;
    }
  }
  subjectEl.innerHTML = `
    <h2>${escapeHtml(subject.emoji ?? "")} ${escapeHtml(subject.title)}</h2>
    <p class="papers">${escapeHtml(subject.papers)}</p>
    ${overview}
    <p class="sources">Sources: ${escapeHtml(subject.sources.join(" · "))}</p>
    <p><button type="button" class="cta" data-open-quiz="${escapeHtml(subject.id)}">Start ${escapeHtml(subject.title)} quiz</button></p>
    ${facultyHtml}
    ${ncertHtml}
    ${extraHtml}
    <h2>Exam lens</h2>
    ${modules}
  `;
}

function weekday(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
}

function renderTracker() {
  if (!tracker) {
    trackerEl.innerHTML = `<p class="empty">Loading today’s score…</p>`;
    return;
  }
  const max = Math.max(1, ...tracker.week.map((day) => day.points));
  const spend = tracker.today.bySubject.length
    ? tracker.today.bySubject
        .map((row) => {
          const width = Math.round((row.points / Math.max(tracker.today.points, 1)) * 100);
          return `<div class="spend-row"><span>${escapeHtml(row.title)}</span><div class="spend-bar"><span style="width:${width}%"></span></div><strong>${row.points}</strong></div>`;
        })
        .join("")
    : `<p class="empty">No points spent today. Take a quiz to start the tracker.</p>`;
  const bars = tracker.week
    .map((day) => {
      const h = Math.max(6, Math.round((day.points / max) * 88));
      const cls = day.day === tracker.week.at(-1).day ? "on" : "";
      return `<i class="${cls}" style="height:${h}px" title="${day.points} pts"><small>${weekday(day.day)}</small></i>`;
    })
    .join("");
  trackerEl.innerHTML = `
    <div class="tracker-grid">
      <div>
        <p class="stat">${tracker.today.points}<span class="meta"> / ${tracker.today.total || 0} today</span></p>
        <p class="meta">${tracker.today.attempts} attempt${tracker.today.attempts === 1 ? "" : "s"} · score spent by subject</p>
        <div class="spend">${spend}</div>
      </div>
      <div>
        <p class="meta">Last 7 days</p>
        <div class="week">${bars}</div>
      </div>
    </div>
  `;
}

function renderQuizPick() {
  quizPick.innerHTML = quizSubjects
    .map(
      (item) =>
        `<button type="button" data-quiz-subject="${item.id}" class="${item.id === quizSubject ? "on" : ""}">${escapeHtml(item.title)}</button>`
    )
    .join("");
}

function renderQuizBoard(review = null) {
  if (!activeQuiz && !review) {
    quizTimerEl.innerHTML = "";
    quizBoard.innerHTML = `<p class="empty">10 questions · 10 minutes · options A–D. Start a subject quiz; every paper is saved so you can reopen mistakes.</p><p><button type="button" class="cta" id="start-quiz">Start quiz</button></p>`;
    return;
  }
  const questions = (review?.results ?? activeQuiz.questions)
    .map((q, index) => {
      const chosen = review ? q.chosen : quizAnswers[q.id];
      const options = q.options
        .map((opt, optIndex) => {
          let cls = "q-opt";
          if (review) {
            if (optIndex === q.correctIndex) cls += " good";
            else if (optIndex === chosen && chosen !== q.correctIndex) cls += " bad";
          } else if (chosen === optIndex) cls += " picked";
          const letter = OPTION_LETTERS[optIndex] ?? String(optIndex + 1);
          return `<button type="button" class="${cls}" data-qid="${escapeHtml(q.id)}" data-opt="${optIndex}"><span class="opt-key">${letter}</span><span class="opt-text">${escapeHtml(opt)}</span></button>`;
        })
        .join("");
      const mark = review ? (q.ok ? `<span class="tag">Correct</span>` : `<span class="tag">Your mistake</span>`) : "";
      const explain = review ? `<p class="explain">${escapeHtml(q.explain)}</p>` : "";
      return `<div class="q"><h3>${index + 1}. ${escapeHtml(q.prompt)} ${mark}</h3>${options}${explain}</div>`;
    })
    .join("");
  const footer = review
    ? `<p class="stat">${review.correct}/${review.total}</p><p class="meta">${review.id ? "Saved in your result file." : ""} Points added to today’s ${escapeHtml(review.title)} bag.</p><p><button type="button" class="cta" id="start-quiz">New 10-question paper</button></p>`
    : `<p><button type="button" class="cta" id="submit-quiz">Submit &amp; save result</button></p>`;
  const heading = review?.title ? `${escapeHtml(review.title)} result` : `${escapeHtml(activeQuiz.title)} quiz`;
  quizBoard.innerHTML = `<h2>${heading}</h2>${questions}${footer}`;
}

async function loadHistory() {
  const res = await fetch("/api/quiz/attempts");
  if (!res.ok || !quizHistoryEl) return;
  const data = await res.json();
  const rows = data.attempts ?? [];
  if (!rows.length) {
    quizHistoryEl.innerHTML = `<p class="meta">No saved papers yet.</p>`;
    return;
  }
  quizHistoryEl.innerHTML = `<h3>Saved results</h3><div class="filters">${rows
    .map((row) => {
      const when = new Date(row.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
      return `<button type="button" data-attempt="${row.id}">${escapeHtml(row.title)} ${row.correct}/${row.total} · ${escapeHtml(when)}</button>`;
    })
    .join("")}</div>`;
}

async function openAttempt(id) {
  stopQuizTimer();
  quizLocked = true;
  const res = await fetch(`/api/quiz/attempts/${id}`);
  const data = await res.json();
  if (!res.ok) return;
  activeQuiz = { subject: data.subject, title: data.title, questions: data.results };
  renderQuizBoard(data);
}

async function loadTracker() {
  const res = await fetch("/api/quiz/tracker");
  if (res.ok) tracker = await res.json();
  renderTracker();
}

async function loadQuiz(subject) {
  quizSubject = subject;
  quizAnswers = {};
  quizLocked = false;
  const res = await fetch(`/api/quiz?subject=${encodeURIComponent(subject)}`);
  const data = await res.json();
  if (!res.ok) {
    stopQuizTimer();
    quizBoard.innerHTML = `<p class="empty">${escapeHtml(data.error ?? "Could not load quiz")}</p>`;
    return;
  }
  activeQuiz = data;
  renderQuizPick();
  renderQuizBoard();
  startQuizTimer();
}

function renderSyllabus() {
  const exam = syllabusData[activeExam];
  syllabusContent.innerHTML = `<p class="meta" style="color:#c8bedd">${escapeHtml(exam.exam)}</p>${exam.stages
    .map(
      (stage) => `
        <h3>${escapeHtml(stage.name)}</h3>
        ${stage.papers
          .map(
            (paper) => `
              <h4 data-hit="syl:${escapeHtml(paper.title)}">${escapeHtml(paper.title)}</h4>
              <ul>${paper.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
            `
          )
          .join("")}`
    )
    .join("")}`;
}

function clipText(value, max = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function pushSearchDoc(doc) {
  searchIndex.push({
    ...doc,
    hay: [doc.title, doc.snippet, doc.body].filter(Boolean).join(" ").toLowerCase(),
  });
}

function rebuildSearchIndex() {
  searchIndex = [];
  pushSearchDoc({
    kind: "Page",
    title: "Current affairs",
    snippet: "Live newspaper feed and CA notebooks",
    tab: "current",
  });
  pushSearchDoc({
    kind: "Page",
    title: "Daily quiz",
    snippet: "Timed MCQs and score tracker",
    tab: "quiz",
  });
  pushSearchDoc({
    kind: "Page",
    title: "Previous year questions",
    snippet: "UPSC and BPSC prelims and mains with solutions",
    tab: "pyq",
  });
  pushSearchDoc({
    kind: "Page",
    title: "Economic Survey 2025-26",
    snippet: "Official chapter notes, numbers, and practice MCQs",
    tab: "survey",
  });
  for (const subject of quizSubjects) {
    pushSearchDoc({
      kind: "Quiz",
      title: `${subject.title} quiz`,
      snippet: "Start a timed practice set",
      tab: "quiz",
      quizSubject: subject.id,
    });
  }
  if (studyData?.howToReadPaper) {
    pushSearchDoc({
      kind: "Method",
      title: studyData.howToReadPaper.title,
      snippet: (studyData.howToReadPaper.steps || []).slice(0, 2).join(" "),
      body: (studyData.howToReadPaper.steps || []).join(" "),
      tab: "current",
    });
  }
  for (const subject of studyData?.subjects ?? []) {
    pushSearchDoc({
      kind: "Subject",
      title: subject.title,
      snippet: subject.overview || subject.papers,
      body: [subject.papers, ...(subject.sources || [])].join(" "),
      tab: subject.id,
    });
    for (const mod of subject.modules || []) {
      const body = [...(mod.explain || []), ...(mod.points || [])].join(" ");
      pushSearchDoc({
        kind: "Exam lens",
        title: mod.title,
        snippet: clipText(body),
        body,
        tab: subject.id,
        hit: `mod:${mod.title}`,
      });
    }
  }
  for (const [id, extras] of Object.entries(extraNotes || {})) {
    if (!Array.isArray(extras)) continue;
    const tab = id === "current" ? "current" : id;
    for (const mod of extras) {
      const body = [...(mod.explain || []), ...(mod.points || [])].join(" ");
      pushSearchDoc({
        kind: "Notes",
        title: mod.title,
        snippet: clipText(body),
        body,
        tab,
        hit: `extra:${mod.title}`,
      });
    }
  }
  for (const id of NCERT_IDS) {
    const pack = ncertCache[id];
    for (const book of pack?.books || []) {
      for (const ch of book.chapters || []) {
        const body = [ch.summary, ...(ch.points || []), ch.exam].join(" ");
        pushSearchDoc({
          kind: "NCERT",
          title: ch.title,
          snippet: `Class ${book.class} · ${book.book}`,
          body,
          tab: id,
          hit: `ncert:${ch.title}`,
          ncertClass: String(book.class),
        });
      }
    }
  }
  for (const item of newsItems) {
    const body = [item.summary, item.source, item.section, ...(item.tags || [])].join(" ");
    pushSearchDoc({
      kind: "News",
      title: item.title,
      snippet: clipText(item.summary || item.source),
      body,
      tab: "current",
      hit: `news:${item.title}`,
    });
  }
  if (surveyData) {
    for (const ch of surveyData.chapters || []) {
      const body = [...(ch.points || []), ch.exam].join(" ");
      pushSearchDoc({
        kind: "Survey",
        title: `Ch ${ch.no}. ${ch.title}`,
        snippet: clipText(body),
        body,
        tab: "survey",
        hit: `survey:${ch.id}`,
      });
    }
    for (const num of surveyData.headlineNumbers || []) {
      pushSearchDoc({
        kind: "Survey",
        title: `${num.label}: ${num.value}`,
        snippet: num.hint,
        body: `${num.label} ${num.value} ${num.hint}`,
        tab: "survey",
      });
    }
  }
  for (const q of surveyQuizPack?.questions || []) {
    const opts = Object.values(q.options || {}).join(" ");
    pushSearchDoc({
      kind: "Survey quiz",
      title: q.question,
      snippet: clipText(q.explanation || opts),
      body: opts,
      tab: "survey",
    });
  }
  if (syllabusData) {
    for (const examId of Object.keys(syllabusData)) {
      const exam = syllabusData[examId];
      for (const stage of exam.stages || []) {
        for (const paper of stage.papers || []) {
          const body = (paper.points || []).join(" ");
          pushSearchDoc({
            kind: "Syllabus",
            title: `${exam.exam} · ${paper.title}`,
            snippet: clipText(body),
            body: `${stage.name} ${body}`,
            tab: "current",
            exam: examId,
            hit: `syl:${paper.title}`,
          });
        }
      }
    }
  }
  for (const [examId, bank] of Object.entries(pyqBanks)) {
    for (const paper of bank.papers || []) {
      for (const item of paper.questions || []) {
        pushSearchDoc({
          kind: "PYQ",
          title: clipText(item.q, 110),
          snippet: `${String(examId).toUpperCase()} ${paper.year} ${paper.stage} · ${item.topic || paper.paper}`,
          body: `${item.q || ""} ${item.topic || ""} ${paper.paper || ""}`,
          tab: "pyq",
          pyqExam: examId,
          pyqStage: paper.stage,
          pyqYear: paper.year,
          pyqPaper: paper.paper,
          hit: `pyq:${item.id}`,
        });
      }
    }
  }
}

function searchTokens(query) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9%]+/i)
    .filter((tok) => tok.length >= 2);
}

function scoreSearchDoc(doc, query, tokens) {
  const title = doc.title.toLowerCase();
  const hay = doc.hay || "";
  if (title === query) return 1000;
  if (title.includes(query) && query.length >= 3) return 220 + Math.min(query.length, 40);
  let score = 0;
  for (const tok of tokens) {
    if (title.includes(tok)) score += 48;
    else if (hay.includes(tok)) score += 14;
    else return 0;
  }
  if (doc.kind === "Subject" || doc.kind === "Page") score += 8;
  return score;
}

function runSearch(query) {
  const raw = query.trim().toLowerCase();
  const status = document.getElementById("search-status");
  const list = document.getElementById("search-results");
  const panel = document.getElementById("search-panel");
  if (!raw) {
    searchHits = [];
    searchActive = -1;
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const tokens = searchTokens(raw);
  if (!tokens.length) {
    searchHits = [];
    status.textContent = "Type a fuller word to search.";
    list.innerHTML = "";
    return;
  }
  const ranked = searchIndex
    .map((doc, idx) => ({ doc, idx, score: scoreSearchDoc(doc, raw, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, SEARCH_LIMIT)
    .map((row) => row.doc);
  searchHits = ranked;
  searchActive = ranked.length ? 0 : -1;
  status.textContent = ranked.length
    ? `${ranked.length} result${ranked.length === 1 ? "" : "s"}`
    : "No matching notes or questions.";
  list.innerHTML = ranked
    .map(
      (doc, index) => `
        <button type="button" class="search-hit ${index === 0 ? "active" : ""}" data-search-i="${index}">
          <small>${escapeHtml(doc.kind)}</small>
          <strong>${escapeHtml(doc.title)}</strong>
          <p>${escapeHtml(doc.snippet || "")}</p>
        </button>`
    )
    .join("");
}

function setSearchActive(index) {
  if (!searchHits.length) return;
  searchActive = (index + searchHits.length) % searchHits.length;
  const buttons = document.querySelectorAll("#search-results .search-hit");
  buttons.forEach((btn, i) => btn.classList.toggle("active", i === searchActive));
  buttons[searchActive]?.scrollIntoView({ block: "nearest" });
}

function closeSearchPanel() {
  const panel = document.getElementById("search-panel");
  if (panel) panel.hidden = true;
  searchActive = -1;
}

function scrollHit(hit) {
  if (!hit) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.querySelector(`[data-hit="${CSS.escape(hit)}"]`);
  if (!el) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  el.classList.add("search-flash");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => el.classList.remove("search-flash"), 1600);
}

async function openSearchResult(item) {
  if (!item) return;
  closeSearchPanel();
  if (item.kind === "Syllabus") {
    activeExam = item.exam || activeExam;
    for (const tab of document.querySelectorAll(".syllabus-tabs button")) {
      tab.classList.toggle("on", tab.dataset.exam === activeExam);
    }
    syllabusBox.classList.remove("closed");
    document.getElementById("syllabus-toggle").setAttribute("aria-expanded", "true");
    document.getElementById("syllabus-toggle").textContent = "–";
    renderSyllabus();
    scrollHit(item.hit);
    return;
  }
  if (item.ncertClass && ncertClass[item.tab] !== undefined) {
    ncertClass[item.tab] = item.ncertClass;
  }
  if (item.pyqExam) {
    pyqExam = item.pyqExam;
    pyqStage = item.pyqStage || pyqStage;
    pyqYear = item.pyqYear || pyqYear;
    pyqPaper = item.pyqPaper || "all";
  }
  if (item.quizSubject) quizSubject = item.quizSubject;
  await showTab(item.tab);
  if (item.quizSubject) loadQuiz(item.quizSubject);
  window.setTimeout(() => scrollHit(item.hit), 60);
}

function bindSearch() {
  const input = document.getElementById("site-search-input");
  const results = document.getElementById("search-results");
  const wrap = document.getElementById("site-search");
  if (!input || !results || !wrap) return;
  let timer = 0;
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => runSearch(input.value), 80);
  });
  input.addEventListener("focus", () => {
    if (input.value.trim()) runSearch(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchActive(searchActive + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchActive(searchActive - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = searchHits[searchActive] || searchHits[0];
      if (item) openSearchResult(item);
    } else if (event.key === "Escape") {
      closeSearchPanel();
      input.blur();
    }
  });
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-search-i]");
    if (!button) return;
    openSearchResult(searchHits[Number(button.dataset.searchI)]);
  });
  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) closeSearchPanel();
  });
}

async function warmSearchIndex() {
  await Promise.all([
    ...NCERT_IDS.map((id) => loadNcert(id)),
    (async () => {
      if (!surveyData) {
        const res = await fetch("/data/economic-survey.json");
        surveyData = res.ok ? await res.json() : null;
      }
      if (!surveyQuizPack) {
        const quizRes = await fetch("/data/economic-survey-quiz.json");
        surveyQuizPack = quizRes.ok ? await quizRes.json() : { questions: [] };
      }
    })(),
    loadPyqBank("upsc"),
    loadPyqBank("bpsc"),
  ]);
  rebuildSearchIndex();
}

tabsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tab]");
  if (button) showTab(button.dataset.tab);
});

pyqEl.addEventListener("click", (event) => {
  const examBtn = event.target.closest("[data-pyq-exam]");
  if (examBtn) {
    pyqExam = examBtn.dataset.pyqExam;
    pyqPaper = "all";
    pyqPicks = {};
    pyqOpen = {};
    renderPyq();
    return;
  }
  const stageBtn = event.target.closest("[data-pyq-stage]");
  if (stageBtn) {
    pyqStage = stageBtn.dataset.pyqStage;
    pyqPaper = "all";
    pyqPicks = {};
    pyqOpen = {};
    renderPyq();
    return;
  }
  const yearBtn = event.target.closest("[data-pyq-year]");
  if (yearBtn) {
    pyqYear = Number(yearBtn.dataset.pyqYear);
    pyqPaper = "all";
    pyqPicks = {};
    pyqOpen = {};
    renderPyq();
    return;
  }
  const paperBtn = event.target.closest("[data-pyq-paper]");
  if (paperBtn) {
    pyqPaper = paperBtn.dataset.pyqPaper;
    renderPyq();
    return;
  }
  const sol = event.target.closest("[data-pyq-sol]");
  if (sol) {
    pyqOpen[sol.dataset.pyqSol] = !pyqOpen[sol.dataset.pyqSol];
    renderPyq();
    return;
  }
  const opt = event.target.closest("[data-pyq-opt]");
  if (opt) {
    clickSound();
    pyqPicks[opt.dataset.pyqId] = Number(opt.dataset.pyqOpt);
    pyqOpen[opt.dataset.pyqId] = true;
    renderPyq();
  }
});

surveyEl.addEventListener("click", async (event) => {
  const opt = event.target.closest("[data-survey-opt]");
  if (opt && !surveyQuizDone) {
    clickSound();
    surveyQuizPicks[opt.dataset.surveyId] = Number(opt.dataset.surveyOpt);
    renderSurveyQuiz();
    return;
  }
  const reset = event.target.closest("[data-survey-reset]");
  if (reset) {
    surveyQuizPicks = {};
    surveyQuizDone = false;
    surveyQuizMessage = "";
    renderSurveyQuiz();
    return;
  }
  const submit = event.target.closest("[data-survey-submit]");
  if (!submit || surveyQuizDone) return;
  const questions = surveyQuizPack?.questions ?? [];
  const answers = {};
  const ids = questions.map((item) => {
    const id = `es-${item.id}`;
    if (surveyQuizPicks[id] !== undefined) answers[id] = surveyQuizPicks[id];
    return id;
  });
  submit.disabled = true;
  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: "survey", ids, answers }),
  });
  const data = await res.json();
  surveyQuizDone = true;
  if (res.ok) {
    tracker = data.tracker;
    surveyQuizMessage = `Saved: ${data.correct}/${data.total}. Also available under Quiz → Economic Survey.`;
  } else {
    surveyQuizMessage = data.error ?? "Score shown below; save failed.";
  }
  renderSurveyQuiz();
});

sourceFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-source]");
  if (!button) return;
  activeSource = button.dataset.source;
  renderFilters();
  renderArticles();
});

quizPick.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-quiz-subject]");
  if (!button) return;
  loadQuiz(button.dataset.quizSubject);
});

quizHistoryEl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-attempt]");
  if (button) openAttempt(button.dataset.attempt);
});

quizBoard.addEventListener("click", async (event) => {
  const start = event.target.closest("#start-quiz");
  if (start) {
    loadQuiz(quizSubject);
    return;
  }
  const submit = event.target.closest("#submit-quiz");
  if (submit) {
    submit.disabled = true;
    await submitQuiz(false);
    return;
  }
  const opt = event.target.closest(".q-opt");
  if (opt && !opt.classList.contains("good") && !opt.classList.contains("bad") && !quizLocked) {
    clickSound();
    quizAnswers[opt.dataset.qid] = Number(opt.dataset.opt);
    renderQuizBoard();
  }
});

subjectEl.addEventListener("click", (event) => {
  const classBtn = event.target.closest("[data-ncert-class]");
  if (classBtn) {
    const subject = studyData.subjects.find((entry) => !subjectEl.hidden);
    const active = [...tabsEl.querySelectorAll("button")].find((btn) => btn.classList.contains("on"));
    const id = active?.dataset.tab;
    if (id && ncertClass[id] !== undefined) {
      ncertClass[id] = classBtn.dataset.ncertClass;
      renderSubject(id);
    }
    return;
  }
  const button = event.target.closest("[data-open-quiz]");
  if (!button) return;
  quizSubject = button.dataset.openQuiz;
  showTab("quiz");
  loadQuiz(quizSubject);
});

document.getElementById("syllabus-toggle").addEventListener("click", (event) => {
  event.stopPropagation();
  const closed = syllabusBox.classList.toggle("closed");
  document.getElementById("syllabus-toggle").setAttribute("aria-expanded", String(!closed));
  document.getElementById("syllabus-toggle").textContent = closed ? "+" : "–";
});

(function enableSyllabusDrag() {
  const handle = document.getElementById("syllabus-drag");
  const key = "syllabus-pos";
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let dragging = false;
  let moved = false;

  function clamp(left, top) {
    const maxLeft = Math.max(8, window.innerWidth - syllabusBox.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - syllabusBox.offsetHeight - 8);
    return {
      left: Math.min(maxLeft, Math.max(8, left)),
      top: Math.min(maxTop, Math.max(8, top)),
    };
  }

  function apply(left, top) {
    const pos = clamp(left, top);
    syllabusBox.style.left = `${pos.left}px`;
    syllabusBox.style.top = `${pos.top}px`;
    syllabusBox.style.right = "auto";
    syllabusBox.style.bottom = "auto";
    localStorage.setItem(key, JSON.stringify(pos));
  }

  try {
    const saved = JSON.parse(localStorage.getItem(key) || "");
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      apply(saved.left, saved.top);
    }
  } catch {
    /* keep default corner */
  }

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest("#syllabus-toggle")) return;
    const rect = syllabusBox.getBoundingClientRect();
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    originLeft = rect.left;
    originTop = rect.top;
    syllabusBox.classList.add("dragging");
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    apply(originLeft + dx, originTop + dy);
  });

  handle.addEventListener("pointerup", () => {
    dragging = false;
    syllabusBox.classList.remove("dragging");
  });

  window.addEventListener("resize", () => {
    const rect = syllabusBox.getBoundingClientRect();
    apply(rect.left, rect.top);
  });
})();

document.querySelector(".syllabus-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-exam]");
  if (!button) return;
  activeExam = button.dataset.exam;
  for (const tab of document.querySelectorAll(".syllabus-tabs button")) {
    tab.classList.toggle("on", tab === button);
  }
  renderSyllabus();
});

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
});

(async () => {
  const session = await requireSession();
  if (!session) return;
  document.getElementById("who").textContent = session.account.name;

  const [subjectsRes, syllabusRes, newsRes, extraRes] = await Promise.all([
    fetch("/data/subjects.json"),
    fetch("/data/syllabus.json"),
    fetch("/api/current-affairs"),
    fetch("/data/extra-notes.json"),
  ]);
  studyData = await subjectsRes.json();
  extraNotes = extraRes.ok ? await extraRes.json() : {};
  syllabusData = await syllabusRes.json();
  renderTabs();
  renderMethod();
  renderSyllabus();
  bindSearch();
  rebuildSearchIndex();
  showTab("current");

  if (newsRes.ok) {
    const payload = await newsRes.json();
    newsItems = payload.items ?? [];
    const age = payload.updatedAt ? `Updated ${new Date(payload.updatedAt).toLocaleTimeString("en-IN")}` : "";
    const live = (payload.sources ?? []).join(", ") || "no live feeds";
    feedMeta.textContent = `${newsItems.length} stories · ${live} · ${age}`;
  } else {
    feedMeta.textContent = "Live feeds need a signed-in session.";
  }
  renderFilters();
  renderArticles();
  rebuildSearchIndex();
  warmSearchIndex();
  await loadTracker();
  loadHistory();
  renderQuizPick();
  renderQuizBoard();
})();
