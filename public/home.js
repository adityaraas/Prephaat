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

let newsItems = [];
let activeSource = "all";
let studyData = null;
let syllabusData = null;
let activeExam = "upsc";
let tracker = null;
let activeQuiz = null;
let quizAnswers = {};
let ncertCache = {};
let ncertClass = { history: "all", geography: "all", economy: "all" };
let quizSubject = "history";
let quizEndsAt = 0;
let quizTimerId = 0;
let quizLocked = false;
let audioCtx = null;
const QUIZ_SECONDS = 600;
const OPTION_LETTERS = ["A", "B", "C", "D"];

const quizSubjects = [
  { id: "current", title: "Current affairs" },
  { id: "history", title: "History" },
  { id: "geography", title: "Geography" },
  { id: "polity", title: "Polity" },
  { id: "economy", title: "Economy" },
  { id: "science", title: "Science" },
  { id: "environment", title: "Environment" },
  { id: "ethics", title: "Ethics" },
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
  const left = Math.max(0, Math.ceil((quizEndsAt - Date.now()) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = Math.max(0, (left / QUIZ_SECONDS) * 100);
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
  quizEndsAt = Date.now() + QUIZ_SECONDS * 1000;
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
    ...studyData.subjects.map((subject) => ({
      id: subject.id,
      label: `${subject.emoji ?? ""} ${subject.title}`.trim(),
    })),
  ];
  tabsEl.innerHTML = items
    .map((item, index) => `<button type="button" data-tab="${item.id}" class="${index === 0 ? "on" : ""}">${escapeHtml(item.label)}</button>`)
    .join("");
}

function showTab(id) {
  for (const button of tabsEl.querySelectorAll("button")) {
    button.classList.toggle("on", button.dataset.tab === id);
  }
  const isNews = id === "current";
  const isQuiz = id === "quiz";
  feedEl.hidden = !isNews;
  methodEl.hidden = !isNews;
  quizEl.hidden = !isQuiz;
  subjectEl.hidden = isNews || isQuiz;
  if (isQuiz) {
    renderQuizPick();
    renderTracker();
    loadHistory();
  } else if (!isNews) {
    renderSubject(id);
  }
}

async function loadNcert(id) {
  if (!["history", "geography", "economy"].includes(id)) return null;
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
            <article class="ncert-card">
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

function renderMethod() {
  const steps = studyData.howToReadPaper.steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");
  methodEl.innerHTML = `<h2>${escapeHtml(studyData.howToReadPaper.title)}</h2><ol>${steps}</ol>`;
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
        <article class="article">
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
        <div class="module">
          <h3>${escapeHtml(mod.title)}</h3>
          ${explain}
          <ul>${mod.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        </div>`;
    })
    .join("");
  let ncertHtml = "";
  const pack = await loadNcert(id);
  if (pack?.books?.length) ncertHtml = renderNcert(id, pack);
  let extraHtml = "";
  const extraRes = await fetch("/data/extra-notes.json");
  if (extraRes.ok) {
    const extraPack = await extraRes.json();
    const extras = extraPack[id] ?? [];
    if (extras.length) {
      extraHtml = `<h2>More material</h2>${extras
        .map(
          (mod) => `
            <div class="module">
              <h3>${escapeHtml(mod.title)}</h3>
              ${(mod.explain || []).map((para) => `<p class="detail">${escapeHtml(para)}</p>`).join("")}
              <ul>${(mod.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
            </div>`
        )
        .join("")}`;
    }
  }
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
              <h4>${escapeHtml(paper.title)}</h4>
              <ul>${paper.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
            `
          )
          .join("")}`
    )
    .join("")}`;
}

tabsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tab]");
  if (button) showTab(button.dataset.tab);
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

  const [subjectsRes, syllabusRes, newsRes] = await Promise.all([
    fetch("/data/subjects.json"),
    fetch("/data/syllabus.json"),
    fetch("/api/current-affairs"),
  ]);
  studyData = await subjectsRes.json();
  syllabusData = await syllabusRes.json();
  renderTabs();
  renderMethod();
  renderSyllabus();
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
  await loadTracker();
  loadHistory();
  renderQuizPick();
  renderQuizBoard();
})();
