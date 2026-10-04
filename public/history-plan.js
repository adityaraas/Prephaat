const HistoryPlan = (() => {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const subjects = ['history','geography','polity','economy','science','environment','ethics'];
  const cached = {};
  async function load(subject = 'history') {
    if (!subjects.includes(subject)) throw new Error('Unknown study subject');
    if (!cached[subject]) {
      const response = await fetch(subject === 'history' ? '/data/history-plan.json' : `/data/study-course-${subject}.json`);
      if (!response.ok) throw new Error('Study course unavailable');
      cached[subject] = await response.json();
    }
    return cached[subject];
  }
  async function mount(root, subject = 'history') {
    if (!root) return;
    let flashcardIndex = 0;
    let flashcardRevealed = false;
    try {
      const data = await load(subject);
      const title = data.title || 'History';
      const key = `bpsc-${subject}-plan-v1`;
      const dayPrefix = subject === 'history' ? 'day-' : `${subject}-day-`;
      const allDays = data.segments.flatMap(s => s.days);
      let completed = new Set();
      let storageAvailable = true;
      try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) completed = new Set(saved.filter(n => Number.isInteger(n) && n >= 1 && n <= 60)); } catch { storageAvailable = false; }
      let day = Number(location.hash.match(new RegExp(`^#${dayPrefix}(\\d+)$`))?.[1]) || 1;
      if (!allDays.some(d => d.day === day)) day = 1;
      const link = (url, title) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`;
      const deepReading = lesson => lesson.deepReading.map(id => {
        const topic = data.dossiers[id];
        return `<section class="deep-topic"><p class="eyebrow">FULL TOPIC EXPLANATION</p><h3>${esc(topic.title)}</h3>${topic.sections.map(s=>`<h4>${esc(s.heading)}</h4><p>${esc(s.text)}</p>`).join('')}
          <h4>Compare &amp; remember</h4><div class="comparison-scroll" role="region" aria-label="${esc(topic.title)} comparison" tabindex="0"><table><caption class="sr-only">${esc(topic.title)} — key comparisons</caption><thead><tr>${topic.comparison.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${topic.comparison.rows.map(row=>`<tr>${row.map((c,i)=>i===0?`<th scope="row">${esc(c)}</th>`:`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <div class="study-reference-grid"><div><h4>Key terms</h4><dl>${topic.terms.map(t=>`<dt>${esc(t.term)}</dt><dd>${esc(t.meaning)}</dd>`).join('')}</dl></div><div><h4>${esc(topic.timelineTitle || "Put it on a timeline")}</h4><ol class="topic-timeline">${topic.timeline.map(t=>`<li><strong>${esc(t.date)}</strong><span>${esc(t.event)}</span></li>`).join('')}</ol></div></div>
          <aside class="exam-trap"><strong>Common exam trap</strong><p>${esc(topic.trap)}</p></aside>
          <div class="worked-practice"><span class="note-label">Original practice · not a UPSC PYQ</span><h4>${esc(topic.practice.question)}</h4><details><summary>Read the worked explanation</summary><p>${esc(topic.practice.answer)}</p></details></div></section>`;
      }).join('');
      const paint = (focus = false) => {
        const segment = data.segments.find(s => s.days.some(d => d.day === day));
        const lesson = allDays.find(d => d.day === day);
        const flashcards = lesson.flashcards || [];
        if (flashcardIndex >= flashcards.length) flashcardIndex = 0;
        const flashcard = flashcards[flashcardIndex];
        root.innerHTML = `<section class="intro"><div><p class="eyebrow">${esc(title.toUpperCase())} STUDY ROOM</p><h1>${data.headline ? esc(data.headline) : "A little history.<br>A clearer picture, every day."}</h1><p>${esc(data.intro || "Ancient foundations to the freedom struggle. Read, recall and practise in a focused 60-day course.")}</p></div><div class="progress-box"><strong id="progress-count">${completed.size}<span> / 60 days</span></strong><progress aria-label="Days completed" max="60" value="${completed.size}"></progress><p>About 2 hours per day</p></div></section>
          <nav class="periods" aria-label="${esc(title)} study blocks">${data.segments.map((s,i) => `<button type="button" data-period="${s.id}" aria-pressed="${s.id === segment.id}"><span>${typeof SiteTheme !== 'undefined' ? SiteTheme.icon(s.icon || (s.id === 'ancient' ? 'history' : s.id)) : `0${i+1}`}</span><strong>${esc(s.title)}${subject === "history" ? " History" : ""}</strong><small>Days ${s.days[0].day}–${s.days.at(-1).day}</small></button>`).join('')}</nav>
          <div class="study-layout"><aside class="day-panel"><p class="eyebrow">${esc(segment.title)} · ${segment.days.length} DAYS</p><h2>Your daily chapters</h2><nav class="day-list" aria-label="Study days">${segment.days.map(d => `<button type="button" data-day="${d.day}" ${d.day === day ? 'aria-current="step"' : ''}><span class="day-number">${completed.has(d.day) ? '✓' : String(d.day).padStart(2,'0')}</span><span>${esc(d.topic)}${completed.has(d.day) ? '<small>Completed</small>' : ''}</span></button>`).join('')}</nav><p class="save-note" id="save-status">${storageAvailable ? 'Progress saved on this browser and device.' : 'Browser storage unavailable. Progress lasts only for this visit.'}</p></aside>
          <div class="lesson-column"><article class="lesson" aria-labelledby="lesson-title"><p class="eyebrow">DAY ${day} / 60 · ${esc(segment.title).toUpperCase()}${subject === "history" ? " HISTORY" : ""}</p><h2 id="lesson-title" tabindex="-1">${esc(lesson.topic)}</h2><p class="lesson-deck">${esc(segment.description)}</p><div class="routine"><span>60 min · Read</span><span>25 min · Notes</span><span>25 min · Practice</span><span>10 min · Recall</span></div>
          <h3>01 / Study material</h3><p class="note-label">${lesson.studyWords}+ words of on-page explanations, plus comparisons, terms and practice. Original study notes aligned with your reading plan.</p><h4 class="quick-recap">Start here · Today’s essentials</h4>${lesson.notes.map((n,i) => `<div class="note"><span>${String(i+1).padStart(2,'0')}</span><p>${esc(n)}</p></div>`).join('')}
          ${subject === 'geography' && typeof GeographyVisuals !== 'undefined' ? GeographyVisuals.render(lesson) : ''}
          ${subject !== 'geography' && typeof StudyVisuals !== 'undefined' ? StudyVisuals.render(subject, lesson, segment) : ''}
          ${deepReading(lesson)}
          <section class="ncert-reader"><p class="eyebrow">READ THE ORIGINAL</p><h3>${esc(data.readerTitle || "NCERT textbook reader")}</h3><p>${esc(data.readerDescription || "Open an official NCERT chapter here. Choose the chapter that matches today’s topic; these Class 12 themes supplement the wider reading plan.")}</p><label for="ncert-reader-choice">Chapter</label><select id="ncert-reader-choice">${data.readers[segment.id].map(([title,code])=>`<option value="${esc(code)}">${esc(title)}</option>`).join('')}</select><button type="button" class="reader-load" data-reader="load">Read on this page</button><div id="ncert-reader-frame"></div><p class="note-label">The document loads from its official provider when you open it. If your browser cannot display the PDF, use the direct chapter link shown below it.</p></section>
          <div class="reading"><h3>Today’s book reading</h3><p>${esc(lesson.reading)}</p>${lesson.sources.map(id => {const s=data.sources[id];return `<div class="book-link">${link(s.url,s.title)}<small>${esc(s.access)}</small></div>`;}).join('')}</div>
          <div class="practice"><h3>Recall &amp; practise</h3><p>${esc(lesson.task)}</p><p><strong>Self-check:</strong> ${esc(lesson.recall)}</p><details><summary>Check your recall</summary><p>${esc(lesson.recallAnswer)}</p></details></div>
          ${flashcards.length ? `<section class="flashcards" aria-labelledby="flashcards-title"><p class="eyebrow">RETRIEVAL PRACTICE</p><h3 id="flashcards-title">Day ${day} flashcards</h3><div class="flashcard" aria-live="polite"><p class="flashcard-meta">${esc(flashcard.label)} · Card ${flashcardIndex + 1} of ${flashcards.length}</p><p class="flashcard-text">${esc(flashcardRevealed ? flashcard.back : flashcard.front)}</p>${flashcardRevealed ? '<span class="flashcard-side">Answer</span>' : '<span class="flashcard-side">Prompt</span>'}</div><div class="flashcard-controls"><button type="button" data-flashcard-action="previous" ${flashcardIndex === 0 ? 'disabled' : ''}>Previous card</button><button type="button" class="flashcard-reveal" data-flashcard-action="reveal" aria-expanded="${flashcardRevealed}">${flashcardRevealed ? 'Hide answer' : 'Reveal answer'}</button><button type="button" data-flashcard-action="next" ${flashcardIndex === flashcards.length - 1 ? 'disabled' : ''}>Next card</button></div><p class="flashcard-hint">Try to answer from memory before revealing the back.</p></section>` : ''}
          <label class="complete"><input type="checkbox" id="complete-day" ${completed.has(day) ? 'checked' : ''}> I have finished Day ${day}</label></article>
          <section class="pyq-section" aria-labelledby="pyq-heading"><p class="eyebrow">CONNECT YOUR READING TO THE EXAM</p><h2 id="pyq-heading">02 / ${data.practiceOnly ? "Exam practice" : "UPSC PYQ examples"}</h2><p>${data.practiceOnly ? "Original practice questions and worked approaches for this study block. These are not actual UPSC PYQs; the official archive is linked below for past papers." : `Selected ${esc(segment.title.toLowerCase())} history questions. Prompts are paraphrased; use the official paper for exact wording. Explanations and answer outlines are our study aids, not UPSC model answers.`}</p>${data.pyqs.filter(q => q.segment === segment.id).map(q => `<article class="pyq"><div class="pyq-meta"><span>${esc(q.stage)} · ${data.practiceOnly ? "Original practice" : q.year} · ${esc(q.paper || "GS I")}</span><span>${esc(q.reference)}</span></div><h3>${esc(q.prompt)}</h3>${q.options ? `<ol type="A">${q.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>` : `<p class="note-label">${q.marks} marks · ${q.words} words</p>`}<details><summary>${q.stage === 'Prelims' ? 'Show answer & explanation' : 'Show answer-writing approach'}</summary><p>${esc(q.answer)}</p></details>${q.url ? `<p>${link(q.url,'Official UPSC question paper')}</p>` : ''}<button class="text-button" type="button" data-day="${q.day}">Study the related topic · Day ${q.day} →</button></article>`).join('')}${data.practiceOnly ? `<p>${link('https://www.upsc.gov.in/examinations/previous-question-papers','Official UPSC past-paper archive')}</p><button type="button" class="reader-load" data-open-quiz="${esc(subject)}">Open ${esc(title)} quiz</button>` : ''}</section>
          <nav class="lesson-nav" aria-label="Previous and next study day"><button type="button" data-day="${day-1}" ${day===1?'disabled':''}>← Previous day</button><span>Day ${day} of 60</span><button type="button" data-day="${day+1}" ${day===60?'disabled':''}>Next day →</button></nav>
          <p class="edition-note">${esc(data.editionNote)}</p></div></div>`;
        if (focus) root.querySelector('#lesson-title').focus();
      };
      const go = next => {
        if (!allDays.some(d => d.day === next)) return;
        day = next;
        flashcardIndex = 0;
        flashcardRevealed = false;
        history.replaceState(null,'',`#${dayPrefix}${day}`);
        paint(true);
      };
      paint();
      root.onclick = event => {
        if (subject === 'geography' && typeof GeographyVisuals !== 'undefined' && GeographyVisuals.handleClick(event, root)) return;
        if (subject !== 'geography' && typeof StudyVisuals !== 'undefined' && StudyVisuals.handleClick(event, root)) return;
        const button = event.target.closest('button');
        if (!button || button.disabled) return;
        if (button.dataset.flashcardAction) {
          if (button.dataset.flashcardAction === 'reveal') flashcardRevealed = !flashcardRevealed;
          if (button.dataset.flashcardAction === 'previous') { flashcardIndex = Math.max(0, flashcardIndex - 1); flashcardRevealed = false; }
          if (button.dataset.flashcardAction === 'next') { flashcardIndex = Math.min(flashcards.length - 1, flashcardIndex + 1); flashcardRevealed = false; }
          paint();
          root.querySelector(`[data-flashcard-action="${button.dataset.flashcardAction}"]`)?.focus();
          return;
        }
        if (button.dataset.day) go(Number(button.dataset.day));
        if (button.dataset.period) go(data.segments.find(s=>s.id===button.dataset.period).days[0].day);
        if (button.dataset.reader === 'load') {
          const segment = data.segments.find(s=>s.days.some(d=>d.day===day));
          const code = root.querySelector('#ncert-reader-choice').value;
          const entry = data.readers[segment.id].find(([,id])=>id===code);
          if (!entry) return;
          const url = entry[2] || `https://ncert.nic.in/textbook/pdf/${code}.pdf`;
          const parsed = new URL(url);
          if (parsed.protocol !== 'https:' || !['ncert.nic.in','www.ncert.nic.in','darpg.gov.in','www.darpg.gov.in'].includes(parsed.hostname)) return;
          root.querySelector('#ncert-reader-frame').innerHTML = `<p>${link(url,`Open ${entry[0]} in a new tab`)}</p><iframe title="Official reading: ${esc(entry[0])}" src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
        }
      };
      root.onchange = event => {
        if (subject === 'geography' && typeof GeographyVisuals !== 'undefined' && GeographyVisuals.handleChange(event, root)) return;
        if (subject !== 'geography' && typeof StudyVisuals !== 'undefined' && StudyVisuals.handleChange(event, root)) return;
        if (event.target.id === 'ncert-reader-choice') {
          root.querySelector('#ncert-reader-frame').innerHTML = '';
          return;
        }
        if (event.target.id !== 'complete-day') return;
        if (event.target.checked) completed.add(day); else completed.delete(day);
        try { localStorage.setItem(key, JSON.stringify([...completed])); } catch { storageAvailable = false; }
        paint();
        root.querySelector('#complete-day').focus();
      };
    } catch {
      root.innerHTML = '<div class="load-error"><h1>Your study course could not load</h1><p>Check your connection and try again.</p><button type="button">Retry</button></div>';
      root.querySelector('button').onclick = () => mount(root, subject);
    }
  }
  if (typeof document !== 'undefined') mount(document.getElementById('history-plan'));
  return { mount, load, subjects };
})();
