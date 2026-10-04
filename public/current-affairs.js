const MonthlyCurrentAffairs = (() => {
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const monthLabel = (month) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const dateLabel = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  let archive, host, activeMonth, activeId = null, query = "", paper = "all", allMonths = false;
  function items() { return archive?.months.flatMap(month => month.items) ?? []; }
  function renderStories() {
    const month = archive.months.find(month => month.id === activeMonth);
    const selected = (allMonths ? items() : month?.items ?? []).filter(item =>
      (paper === "all" || item.syllabus.some(link => link.paper === paper)) &&
      (!query.trim() || [item.title, item.whyInNews, ...item.summary, ...item.syllabus.map(link => `${link.topic} ${link.relevance}`)].join(" ").toLowerCase().includes(query.trim().toLowerCase())));
    host.querySelector("#ca-month-title").textContent = allMonths ? "Across the archive" : monthLabel(activeMonth);
    host.querySelector("#ca-count").textContent = `${selected.length} selected UPSC issues${!allMonths && month?.partial ? " · partial month" : ""}`;
    const active = activeId && items().find(item=>item.id===activeId);
    host.querySelector("#ca-stories").innerHTML = active ? renderIssue(active) : `<div class="ca-card-grid">${selected.map(item=>`<article class="ca-story" id="ca-${item.id}" data-hit="news:${escape(item.title)}"><div class="ca-card-inner"><div class="ca-story-meta"><time datetime="${item.published}">${dateLabel(item.published)}</time><span>${escape([...new Set(item.syllabus.map(link=>link.paper))].join(' / '))}</span></div><h3><button type="button" data-ca-open="${item.id}">${escape(item.title)}</button></h3><p class="ca-card-preview">${escape(item.whyInNews)}</p><button type="button" class="ca-read" data-ca-open="${item.id}">Read the brief <span aria-hidden="true">&rarr;</span></button></div></article>`).join('') || '<p class="ca-empty">No issues match this selection. Try another month or clear your filters.</p>'}</div>`;
    for (const button of host.querySelectorAll("[data-ca-month]")) button.setAttribute("aria-pressed", String(button.dataset.caMonth === activeMonth && !allMonths));
  }
  function renderIssue(item) {
    const summary=item.summary.slice(0,2).join(' ');
    const takeaways=item.summary.slice(2,5);
    return `<article class="ca-brief" id="ca-${item.id}"><button type="button" class="ca-back" id="ca-back">&larr; Back to ${monthLabel(activeMonth)}</button><header class="ca-brief-head"><div class="ca-story-meta"><time datetime="${item.published}">${dateLabel(item.published)}</time><span>QUICK CURRENT AFFAIRS BRIEF</span></div><h2 tabindex="-1" id="ca-brief-title">${escape(item.title)}</h2><p class="ca-source-note">${escape(item.source)}</p></header><section class="ca-brief-section"><span class="ca-eyebrow">01 / IN BRIEF</span><h3>What happened?</h3><p>${escape(summary)}</p><h4>Key takeaways</h4><div class="ca-takeaways">${takeaways.map((point,index)=>`<div><span>0${index+1}</span><p>${escape(point)}</p></div>`).join('')}</div></section><section class="ca-brief-section ca-news-trigger"><span class="ca-eyebrow">02 / THE NEWS TRIGGER</span><h3>Why in news?</h3><p>${escape(item.whyInNews)}</p></section><section class="ca-brief-section ca-relevance"><span class="ca-eyebrow">03 / CONNECT TO UPSC</span><h3>Why it matters for the exam</h3>${item.syllabus.map(link=>`<div class="ca-syllabus"><span>${escape(link.paper)}</span><div><h4>${escape(link.topic)}</h4><p>${escape(link.relevance)}</p></div></div>`).join('')}</section><details class="ca-full-notes"><summary>Go deeper: full 10-point revision note</summary><section class="ca-summary"><ol>${item.summary.map(line=>`<li>${escape(line)}</li>`).join('')}</ol></section></details><footer class="ca-brief-footer"><a class="ca-source" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">Read the source / ${escape(item.source)} &nearr;</a><p class="ca-source-note">Reflects reporting dated ${dateLabel(item.published)}. UPSC relevance is a study interpretation.</p></footer></article>`;
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
    activeId=id; activeMonth = item.published.slice(0, 7); query = ""; paper = "all"; allMonths = false; render();
    const card = host.querySelector(`#ca-${id}`);
    if (card) { host.querySelector("#ca-brief-title")?.focus(); card.scrollIntoView({ block: "start", behavior: "auto" }); }
    history.replaceState(null, "", `#current/${activeMonth}/${id}`);
  }
  async function mount(element) {
    host = element;
    if (!host.dataset.bound) {
      host.dataset.bound = "true";
      host.addEventListener("click", event => {
        if (event.target.closest("#ca-retry")) { mount(host); return; }
        const open=event.target.closest('[data-ca-open]');
        if(open){openItem(open.dataset.caOpen);return;}
        if(event.target.closest('#ca-back')){const previous=activeId;activeId=null;renderStories();history.replaceState(null,'',`#current/${activeMonth}`);host.querySelector(`[data-ca-open="${previous}"]`)?.focus();host.querySelector('.ca-month-head').scrollIntoView({block:'start',behavior:'auto'});return;}
        const button = event.target.closest("[data-ca-month]");
        if (!button) return;
        activeId=null; activeMonth = button.dataset.caMonth; allMonths = false; query = ""; paper = "all"; render();
        history.replaceState(null, "", `#current/${activeMonth}`);
        host.querySelector(".ca-month-head").scrollIntoView({ block: "start", behavior: "auto" });
      });
      host.addEventListener("input", event => { if (event.target.id === "ca-search") { activeId=null; query = event.target.value; renderStories(); history.replaceState(null,'',`#current/${activeMonth}`); } });
      host.addEventListener("change", event => {
        activeId=null;
        if (event.target.id === "ca-paper") paper = event.target.value;
        if (event.target.id === "ca-all-months") allMonths = event.target.checked;
        renderStories();
        history.replaceState(null,'',`#current/${activeMonth}`);
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
      activeId=null; render();
      if (deepLink?.[2]) openItem(deepLink[2]);
    } catch { host.innerHTML = '<div class="ca-empty" role="alert"><h3>Monthly current affairs could not load</h3><p>Please try again. Your other study sections are still available.</p><button type="button" class="cta" id="ca-retry">Try again</button></div>'; }
  }
  return { mount, openItem, getSearchItems: () => items().map(item => ({ ...item, summary: item.summary.join(" "), tags: item.topics, section: "Monthly current affairs" })) };
})();
