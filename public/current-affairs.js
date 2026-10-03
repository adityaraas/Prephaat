const MonthlyCurrentAffairs = (() => {
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const monthLabel = (month) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const dateLabel = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  let archive, host, activeMonth, query = "", paper = "all", allMonths = false;
  function items() { return archive?.months.flatMap(month => month.items) ?? []; }
  function renderStories() {
    const month = archive.months.find(month => month.id === activeMonth);
    const selected = (allMonths ? items() : month?.items ?? []).filter(item =>
      (paper === "all" || item.syllabus.some(link => link.paper === paper)) &&
      (!query.trim() || [item.title, item.whyInNews, ...item.summary, ...item.syllabus.map(link => `${link.topic} ${link.relevance}`)].join(" ").toLowerCase().includes(query.trim().toLowerCase())));
    host.querySelector("#ca-month-title").textContent = allMonths ? "Across the archive" : monthLabel(activeMonth);
    host.querySelector("#ca-count").textContent = `${selected.length} selected UPSC issues${!allMonths && month?.partial ? " · partial month" : ""}`;
    host.querySelector("#ca-stories").innerHTML = selected.map(item => `<details class="ca-story" id="ca-${item.id}" data-hit="news:${escape(item.title)}">
      <summary><div class="ca-story-meta"><time datetime="${item.published}">${dateLabel(item.published)}</time><span>${escape(item.syllabus.map(link => link.paper).filter((value, index, values) => values.indexOf(value) === index).join(" · "))}</span></div><h3>${escape(item.title)}</h3><span class="ca-open-hint">Why in news · 10-line summary · UPSC relevance <span aria-hidden="true">＋</span></span></summary>
      <div class="ca-story-content"><section class="ca-news-trigger"><h4>Why in news?</h4><p>${escape(item.whyInNews)}</p></section><section class="ca-summary"><h4>10-line summary</h4><ol>${item.summary.map(line => `<li>${escape(line)}</li>`).join("")}</ol></section><section class="ca-relevance"><h4>How it connects to UPSC</h4>${item.syllabus.map(link => `<div class="ca-syllabus"><span>${escape(link.paper)}</span><div><h5>${escape(link.topic)}</h5><p>${escape(link.relevance)}</p></div></div>`).join("")}</section><a class="ca-source" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">Read the source · ${escape(item.source)} ↗</a><p class="ca-source-note">Summary reflects the report dated ${dateLabel(item.published)}. Syllabus relevance is a study interpretation.</p></div>
      </details>`).join("") || '<p class="ca-empty">No issues match this selection. Try another month or clear your filters.</p>';
    for (const button of host.querySelectorAll("[data-ca-month]")) button.setAttribute("aria-pressed", String(button.dataset.caMonth === activeMonth && !allMonths));
  }
  function render() {
    const papers = [...new Set(items().flatMap(item => item.syllabus.map(link => link.paper)))].sort();
    host.innerHTML = `<header class="ca-hero"><span class="ca-eyebrow">MONTHLY CURRENT AFFAIRS</span><h2>A month at a time.<br>An issue understood.</h2><p>Why it made the news. What it means. Where it fits in your UPSC preparation.</p><div class="ca-range"><span>Last 18 months</span><span>${dateLabel(archive.range.start)} — ${dateLabel(archive.range.end)}</span><span>${items().length} selected issues</span></div></header>
      <div class="ca-layout"><aside class="ca-months"><h3>Choose a month</h3><nav aria-label="Current affairs months">${archive.months.map(month => `<button type="button" data-ca-month="${month.id}" aria-pressed="${month.id === activeMonth}"><span>${monthLabel(month.id)}</span><small>${month.items.length} issues${month.partial ? " · partial" : ""}</small></button>`).join("")}</nav><p>Selected exam-relevant issues, not every news report.</p></aside><div class="ca-main"><div class="ca-controls"><label class="ca-search">Find a topic<input id="ca-search" type="search" value="${escape(query)}" placeholder="Search inflation, elections, space…"></label><label>UPSC paper<select id="ca-paper"><option value="all">All papers</option>${papers.map(value => `<option ${paper === value ? "selected" : ""}>${escape(value)}</option>`).join("")}</select></label><label class="ca-all"><input id="ca-all-months" type="checkbox" ${allMonths ? "checked" : ""}> Search all months</label></div><div class="ca-month-head"><h3 id="ca-month-title"></h3><p id="ca-count" role="status"></p></div><div id="ca-stories"></div></div></div>`;
    renderStories();
  }
  function openItem(id) {
    const item = items().find(item => item.id === id);
    if (!item || !host) return;
    activeMonth = item.published.slice(0, 7); query = ""; paper = "all"; allMonths = false; render();
    const card = host.querySelector(`#ca-${id}`);
    if (card) { card.open = true; card.scrollIntoView({ block: "start", behavior: "auto" }); }
    history.replaceState(null, "", `#current/${activeMonth}/${id}`);
  }
  async function mount(element) {
    host = element;
    if (!host.dataset.bound) {
      host.dataset.bound = "true";
      host.addEventListener("click", event => {
        if (event.target.closest("#ca-retry")) { mount(host); return; }
        const button = event.target.closest("[data-ca-month]");
        if (!button) return;
        activeMonth = button.dataset.caMonth; allMonths = false; query = ""; paper = "all"; render();
        history.replaceState(null, "", `#current/${activeMonth}`);
        host.querySelector(".ca-month-head").scrollIntoView({ block: "start", behavior: "auto" });
      });
      host.addEventListener("input", event => { if (event.target.id === "ca-search") { query = event.target.value; renderStories(); } });
      host.addEventListener("change", event => {
        if (event.target.id === "ca-paper") paper = event.target.value;
        if (event.target.id === "ca-all-months") allMonths = event.target.checked;
        renderStories();
      });
    }
    try {
      if (!archive) {
        host.innerHTML = '<p class="ca-empty" role="status">Loading your monthly current affairs archive…</p>';
        const response = await fetch("/data/monthly-current-affairs.json", { signal: AbortSignal.timeout(15000), cache: "no-store" });
        if (!response.ok) throw new Error("The monthly archive could not be loaded.");
        archive = await response.json();
        if (!Array.isArray(archive.months) || !archive.months.length) { archive = undefined; throw new Error("The monthly archive is not available yet."); }
      }
      const deepLink = window.location.hash.match(/^#current\/(\d{4}-\d{2})(?:\/([a-f0-9]{20}))?$/);
      activeMonth = archive.months.some(month => month.id === deepLink?.[1]) ? deepLink[1] : activeMonth || archive.months[0].id;
      render();
      if (deepLink?.[2]) openItem(deepLink[2]);
    } catch { host.innerHTML = '<div class="ca-empty" role="alert"><h3>Monthly current affairs could not load</h3><p>Please try again. Your other study sections are still available.</p><button type="button" class="cta" id="ca-retry">Try again</button></div>'; }
  }
  return { mount, openItem, getSearchItems: () => items().map(item => ({ ...item, summary: item.summary.join(" "), tags: item.topics, section: "Monthly current affairs" })) };
})();
