const EditorialDesk = (() => {
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const dateLabel = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  let catalog, host, activeId = null, page = 0, request = 0;
  const filters = { search: "", source: "all", month: "all", topic: "all", saved: false };
  const notes = new Map();
  let preparedNotes;
  function loadPreparedNotes() {
    preparedNotes ??= fetch("/data/editorial-analysis.json", { signal: AbortSignal.timeout(15000), cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("Prepared notes could not load"); return response.json(); })
      .catch(() => { preparedNotes = undefined; return {}; });
    return preparedNotes;
  }
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem("editorial-bookmarks") || "[]"); if (!Array.isArray(saved)) saved = []; } catch {}
  const save = () => { try { localStorage.setItem("editorial-bookmarks", JSON.stringify(saved)); } catch {} };
  const list = (entries) => `<ul>${entries.map((entry) => `<li>${escape(entry)}</li>`).join("")}</ul>`;
  function filtered() {
    const query = filters.search.toLowerCase().trim();
    return catalog.items.filter((item) => (filters.source === "all" || item.source === filters.source) &&
      (filters.month === "all" || item.published.startsWith(filters.month)) &&
      (filters.topic === "all" || item.topics.includes(filters.topic)) && (!filters.saved || saved.includes(item.id)) &&
      (!query || `${item.title} ${item.topics.join(" ")}`.toLowerCase().includes(query)));
  }
  function renderList() {
    const results = filtered();
    page = Math.min(page, Math.max(0, Math.ceil(results.length / 18) - 1));
    host.querySelector("#ed-count").textContent = `${results.length.toLocaleString("en-IN")} editorials${filters.saved ? " in your reading list" : ""}`;
    host.querySelector("#ed-list").innerHTML = results.slice(page * 18, page * 18 + 18).map((item) => `
      <article class="ed-card">
        <div class="ed-card-meta"><span class="ed-source ${item.source === "The Hindu" ? "hindu" : "express"}">${escape(item.source)}</span><time datetime="${item.published}">${dateLabel(item.published)}</time></div>
        <h3><button type="button" data-ed-open="${item.id}">${escape(item.title)}</button></h3>
        <div class="ed-topics">${(item.topics.length ? item.topics : ["Editorial perspective"]).map((topic) => `<span>${escape(topic)}</span>`).join("")}</div>
        <div class="ed-card-bottom"><button type="button" class="ed-read" data-ed-open="${item.id}">Read &amp; understand <span aria-hidden="true">↗</span></button><button type="button" class="ed-bookmark" data-ed-save="${item.id}" aria-pressed="${saved.includes(item.id)}" aria-label="${saved.includes(item.id) ? "Remove from" : "Add to"} reading list">${saved.includes(item.id) ? "Saved" : "+ Save"}</button></div>
      </article>`).join("") || '<p class="ed-empty">No editorials match these filters. Try another month or clear your search.</p>';
    host.querySelector("#ed-pages").innerHTML = results.length > 18 ? `<button type="button" class="ghost" data-ed-page="-1" ${page === 0 ? "disabled" : ""}>Previous</button><span>Page ${page + 1} of ${Math.ceil(results.length / 18)}</span><button type="button" class="ghost" data-ed-page="1" ${page + 1 >= Math.ceil(results.length / 18) ? "disabled" : ""}>Next</button>` : "";
  }
  function renderCatalog() {
    const months = [...new Set(catalog.items.map((item) => item.published.slice(0, 7)))].sort().reverse();
    const topics = [...new Set(catalog.items.flatMap((item) => item.topics))].sort();
    const coverage = catalog.coverage.map((entry) => `${entry.source}: ${entry.count} indexed${entry.reachedStart && !entry.failedPages.length && !entry.failedArticles.length ? "" : " (partial archive)"}`).join(" · ");
    host.innerHTML = `<div class="ed-hero"><div><span class="ed-eyebrow">THE EDITORIAL DESK</span><h2>Beyond the headline.</h2><p>Understand the argument. Connect the concepts.<br>Turn today’s debate into a balanced UPSC answer.</p></div><div class="ed-hero-stat"><strong>${catalog.items.length.toLocaleString("en-IN")}</strong><span>editorials indexed</span><small>${dateLabel(catalog.range.start)} — ${dateLabel(catalog.range.end)}</small></div></div>
      <p class="ed-coverage">${escape(coverage)}. Publicly available articles are analysed on opening; restricted articles link to the publisher.</p>
      <div class="ed-filters"><label class="ed-search">Find an issue<input id="ed-search" type="search" placeholder="Search elections, climate, economy…" value="${escape(filters.search)}"></label><label>Newspaper<select id="ed-source"><option value="all">Both newspapers</option>${["The Hindu", "The Indian Express"].map((source) => `<option ${filters.source === source ? "selected" : ""}>${source}</option>`).join("")}</select></label><label>Month<select id="ed-month"><option value="all">All months</option>${months.map((month) => `<option value="${month}" ${filters.month === month ? "selected" : ""}>${new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>`).join("")}</select></label><label>Theme<select id="ed-topic"><option value="all">All themes</option>${topics.map((topic) => `<option ${filters.topic === topic ? "selected" : ""}>${escape(topic)}</option>`).join("")}</select></label></div>
      <div class="ed-list-head"><p id="ed-count" role="status"></p><button type="button" class="ghost" id="ed-saved" aria-pressed="${filters.saved}">${filters.saved ? "Show all" : "My reading list"}</button></div><div id="ed-list" class="ed-grid"></div><div id="ed-pages" class="ed-pagination"></div>`;
    renderList();
  }
  function renderNote(item, analysis) {
    const sections = [["ed-summary", "01", "Article summary & key takeaways"], ["ed-diagram", "02", "Understand the key concept"], ["ed-concepts", "03", "Concepts made clear"], ["ed-context", "04", "Context & author argument"], ["ed-syllabus", "05", "UPSC connections"], ["ed-perspectives", "06", "The bigger picture"], ["ed-balance", "07", "Counterpoints & way forward"], ["ed-prelims", "08", "Revision pointers"], ["ed-question", "09", "Write a Mains answer"]];
    const visual = typeof EditorialVisuals !== 'undefined' ? EditorialVisuals.model(analysis) : null;
    host.querySelector("#ed-note").innerHTML = `<div class="ed-note-layout"><aside class="ed-note-nav"><span class="ed-eyebrow">YOUR READING PATH</span>${sections.map(([id, number, title]) => `<a href="#${id}"><span>${number}</span>${title}</a>`).join("")}</aside><div class="ed-note-content">

      <section id="ed-summary" class="ed-note-section"><span class="ed-eyebrow">01 / THE ARTICLE IN BRIEF</span><h3>Article summary</h3><p class="ed-summary-text">${escape(analysis.summary || `${analysis.context} ${analysis.authorArgument}`)}</p><h4>Important takeaways</h4><div class="ed-key-takeaways">${(analysis.keyTakeaways || analysis.argumentSteps).map((point,index)=>`<div><span>0${index+1}</span><p>${escape(point)}</p></div>`).join('')}</div></section>
      ${visual ? `<section id="ed-diagram" class="ed-note-section"><span class="ed-eyebrow">02 / SEE THE CONNECTION</span><h3>${escape(visual.title)}</h3><figure class="ed-diagram">${EditorialVisuals.svg(analysis)}<figcaption>${escape(visual.caption)}</figcaption></figure><details class="ed-diagram-text"><summary>Read the diagram as text</summary>${visual.nodes.map(node=>`<h4>${escape(node.label)}</h4><p>${escape(node.detail)}</p>`).join('')}</details><p class="ed-caption">Original study diagram. Read the branches with the concept explanation below.</p>${analysis.diagramAsset ? `<a class="ed-diagram-download" href="/api/editorials/${item.id}/diagram" target="_blank" rel="noopener noreferrer">Open stored diagram</a>` : ''}</section>` : ''}
      <section id="ed-concepts" class="ed-note-section"><span class="ed-eyebrow">03 / BUILD THE FOUNDATION</span><h3>Concepts made clear</h3>${analysis.concepts.map((concept) => `<div class="ed-concept"><h4>${escape(concept.term)}</h4><p>${escape(concept.explanation)}</p></div>`).join("")}</section>
      <section id="ed-context" class="ed-note-section"><span class="ed-eyebrow">04 / UNDERSTAND</span><h3>Why this editorial matters</h3><p>${escape(analysis.context)}</p><div class="ed-argument"><h4>What the editorial is saying</h4><p>${escape(analysis.authorArgument)}</p>${list(analysis.argumentSteps)}</div></section>
      <section id="ed-syllabus" class="ed-note-section"><span class="ed-eyebrow">05 / CONNECT TO THE EXAM</span><h3>Where it fits in UPSC</h3>${analysis.syllabus.map((mapping) => `<div class="ed-syllabus-link"><span>${escape(mapping.paper)}</span><div><h4>${escape(mapping.topic)}</h4><p>${escape(mapping.relevance)}</p></div></div>`).join("")}</section>
      <section id="ed-perspectives" class="ed-note-section"><span class="ed-eyebrow">06 / LOOK AT EVERY SIDE</span><h3>The bigger picture</h3><p class="ed-caption">Study perspectives that extend beyond the editorial’s own position.</p>${analysis.perspectives.map((perspective) => `<div class="ed-concept"><h4>${escape(perspective.dimension)}</h4><p>${escape(perspective.explanation)}</p></div>`).join("")}</section>
      <section id="ed-balance" class="ed-note-section"><span class="ed-eyebrow">07 / BUILD A BALANCED VIEW</span><h3>Counterpoints &amp; way forward</h3><h4>Questions to consider</h4>${list(analysis.counterpoints)}<h4>A constructive way forward</h4>${list(analysis.wayForward)}</section>
      <section id="ed-prelims" class="ed-note-section"><span class="ed-eyebrow">08 / REVISE THE BASICS</span><h3>Prelims connections</h3>${list(analysis.prelims)}</section>
      <section id="ed-question" class="ed-note-section ed-practice"><span class="ed-eyebrow">09 / APPLY WHAT YOU LEARNED</span><h3>Write a Mains answer</h3><div class="ed-question-meta"><span>${escape(analysis.question.paper)}</span><span>${analysis.question.marks} marks</span><span>${analysis.question.wordLimit} words</span><span>Original practice question</span></div><p class="ed-question-prompt">${escape(analysis.question.prompt)}</p><button type="button" class="prep-save-revision" id="ed-writing-workspace" data-prompt="${escape(analysis.question.prompt)}" data-limit="${analysis.question.wordLimit}">Practise in my writing workspace</button><label for="ed-answer">Your answer</label><textarea id="ed-answer" rows="9" placeholder="Introduction → dimensions and evidence → balanced conclusion"></textarea><p id="ed-word-count" class="ed-caption" role="status">0 words · Saved on this device</p><details><summary>Explore a balanced answer outline</summary>${list(analysis.question.outline)}</details></section>
      <div class="ed-takeaway"><span class="ed-eyebrow">ONE IDEA TO TAKE AWAY</span><p>${escape(analysis.takeaway)}</p></div><p class="ed-caption">AI-assisted study interpretation based on the linked editorial. Verify important facts against the original. Note prepared ${new Date(analysis.generatedAt).toLocaleDateString("en-IN")}.</p></div></div>`;
    const answer = host.querySelector("#ed-answer");
    try { answer.value = localStorage.getItem(`editorial-answer-${item.id}`) || ""; } catch {}
    updateWordCount(answer);
  }
  function updateWordCount(answer) {
    const count = answer.value.trim() ? answer.value.trim().split(/\s+/).length : 0;
    host.querySelector("#ed-word-count").textContent = `${count} words · Saved on this device`;
  }
  async function openEditorial(id) {
    const item = catalog.items.find((entry) => entry.id === id);
    if (!item) return;
    activeId = id;
    const token = ++request;
    history.replaceState(null, "", `#editorials/${id}`);
    host.innerHTML = `<button type="button" class="ed-back" id="ed-back">← All editorials</button><header class="ed-detail-head"><div class="ed-card-meta"><span class="ed-source">${escape(item.source)}</span><time datetime="${item.published}">${dateLabel(item.published)}</time></div><h2>${escape(item.title)}</h2><div class="ed-detail-actions"><a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">Read original editorial ↗</a><button type="button" class="ghost" data-ed-save="${id}" aria-pressed="${saved.includes(id)}">${saved.includes(id) ? "Saved to reading list" : "+ Save to reading list"}</button></div></header><div id="ed-note" aria-live="polite"><div class="ed-loading"><span class="ed-loading-dot"></span><h3>Preparing your study note…</h3><p>Summarising the article and preparing takeaways, a concept diagram and UPSC connections. A new note can take about a minute.</p></div></div>`;
    host.scrollIntoView({ behavior: "auto", block: "start" });
    try {
      let analysis = notes.get(id) || (await loadPreparedNotes())[id];
      if (!analysis) {
        const response = await fetch(`/api/editorials/${id}/analysis`, { method: "POST", signal: AbortSignal.timeout(115000) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(response.status === 404 ? "This study note is not available yet. Please try another editorial or read the original." : data.error || "Could not load this study note.");
        if (!data.analysis) throw new Error("This study note could not be loaded. Please try again.");
        analysis = data.analysis;
        notes.set(id, analysis);
      }
      notes.set(id, analysis);
      if (token !== request) return;
      renderNote(item, analysis);
    } catch (error) {
      if (token !== request) return;
      host.querySelector("#ed-note").innerHTML = `<div class="ed-empty"><h3>Study note unavailable</h3><p>${escape(error.name === "TimeoutError" ? "This note is taking longer than usual. Please try again." : error.message)}</p><button type="button" class="cta" data-ed-open="${id}">Try again</button> <a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">Read the original editorial ↗</a></div>`;
    }
  }
  function onClick(event) {
    const button = event.target.closest("button");
    if (event.target.closest(".ed-note-nav a")) {
      event.preventDefault();
      const target = host.querySelector(event.target.closest("a").getAttribute("href"));
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!button) return;
    if(button.id==='ed-writing-workspace' && typeof PrepDesk!=='undefined'){PrepDesk.setPrompt(button.dataset.prompt,Number(button.dataset.limit));window.location.hash='#preparation/writing';return;}
    if (button.dataset.edOpen) { openEditorial(button.dataset.edOpen); return; }
    if (button.dataset.edSave) {
      const id = button.dataset.edSave;
      saved = saved.includes(id) ? saved.filter((entry) => entry !== id) : [...saved, id];
      save();
      if (activeId) {
        button.textContent = saved.includes(id) ? "Saved to reading list" : "+ Save to reading list";
        button.setAttribute("aria-pressed", String(saved.includes(id)));
      } else renderList();
    }
    if (button.id === "ed-back") { request++; activeId = null; history.replaceState(null, "", "#editorials"); renderCatalog(); }
    if (button.id === "ed-saved") { filters.saved = !filters.saved; page = 0; renderCatalog(); }
    if (button.dataset.edPage) { page += Number(button.dataset.edPage); renderList(); host.querySelector(".ed-list-head").scrollIntoView({ block: "start" }); }
  }
  async function mount(element) {
    host = element;
    if (!host.dataset.bound) {
      host.dataset.bound = "true";
      host.addEventListener("click", onClick);
      host.addEventListener("input", (event) => {
        if (event.target.id === "ed-search") { filters.search = event.target.value; page = 0; renderList(); }
        if (event.target.id === "ed-answer") {
          try { localStorage.setItem(`editorial-answer-${activeId}`, event.target.value); } catch {}
          updateWordCount(event.target);
        }
      });
      host.addEventListener("change", (event) => {
        const filter = { "ed-source": "source", "ed-month": "month", "ed-topic": "topic" }[event.target.id];
        if (filter) { filters[filter] = event.target.value; page = 0; renderList(); }
      });
    }
    if (!catalog) {
      host.innerHTML = '<p class="ed-empty" role="status">Loading the editorial archive…</p>';
      try {
        const response = await fetch("/data/editorials.json", { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("Could not load the editorial archive. Please refresh and try again.");
        catalog = await response.json();
      } catch (error) { host.innerHTML = `<p class="ed-empty" role="alert">${escape(error.message)}</p>`; return; }
    }
    const id = window.location.hash.match(/^#editorials\/([a-f0-9]{20})$/)?.[1];
    try {
      if (id && catalog.items.some((item) => item.id === id)) await openEditorial(id);
      else { activeId = null; renderCatalog(); }
    } catch (error) {
      host.innerHTML = `<p class="ed-empty" role="alert">Could not display the editorial archive. Please refresh and try again.</p>`;
    }
  }
  return { mount };
})();
