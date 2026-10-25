const IRReader = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const books = {
    environment: {name:'Environment & Ecology',short:'Environment',file:'environment-reading.json?v=1',edition:'Drishti Quick Book · Supplied web preview',headline:'Understand ecosystems. Connect the living world.',placeholder:'Carbon cycle, wetlands, IUCN, pollution…',source:'/environment-source/book.pdf',offset:0,sourceLabel:'supplied Drishti web preview',progressPrefix:'chapter:environment:',practiceLabel:'Practice questions',course:'/home#environment-day-1'},
    governance: {name:'Governance',short:'Governance',file:'governance-reading.json?v=1',edition:'Vision IAS · Mains 2025',headline:'Understand governance. Write with clarity.',placeholder:'Citizen charter, civil services, SHGs, public policy…',source:'/governance-source/book.pdf',offset:9,sourceLabel:'supplied Vision IAS Mains 2025 edition',progressPrefix:'lesson:governance:',practiceLabel:'Mains previous-year questions'},
    ir: {name:'International Relations',short:'IR',file:'ir-reading.json?v=2',edition:'Prelims Smasher 2026',headline:'A clearer view of the world.',placeholder:'Country, organisation, corridor…',source:'/ir-source/book.pdf',offset:2,sourceLabel:'supplied 2026 edition',progressPrefix:'lesson:ir:',practiceLabel:'Practice questions'},
    economy: {name:'Economics',short:'Economics',file:'economy-reading.json?v=1',edition:'Rau’s IAS Mains Compass of Economy',headline:'Understand the economy. Build a stronger answer.',placeholder:'Agriculture, banking, taxation, infrastructure…',source:'/economy-source/book.pdf',offset:7,sourceLabel:'supplied Rau’s IAS edition',progressPrefix:'chapter:economy:',practiceLabel:'Recall & writing'}
  };
  const pending = {};
  const load = (subject = 'ir') => pending[subject] || (pending[subject] = fetch('/data/'+books[subject].file).then(r => {
    if (!r.ok) throw Error('Study material unavailable');
    return r.json();
  }).catch(error => { delete pending[subject]; throw error; }));
  const lead = value => {
    const text = String(value || '');
    const colon = text.indexOf(':');
    return colon > 1 && colon < 80 ? `<strong>${esc(text.slice(0,colon+1))}</strong>${esc(text.slice(colon+1))}` : esc(text);
  };
  function parts(items = []) {
    let html = '', listing = false;
    for (const item of items) {
      if (item.bullet && !listing) { html += '<ul class="ir-points">'; listing = true; }
      if (!item.bullet && listing) { html += '</ul>'; listing = false; }
      html += item.bullet ? `<li${item.level === 2 ? ' class="ir-subpoint"' : ''}>${lead(item.text)}</li>` : `<p>${lead(item.text)}</p>`;
    }
    return html + (listing ? '</ul>' : '');
  }
  const figure = item => `<figure class="ir-map"><a href="${esc(item.image)}" target="_blank" rel="noopener" aria-label="Enlarge ${esc(item.caption)}"><img src="${esc(item.image)}" alt="${esc(item.caption)}" loading="lazy" width="${item.width}" height="${item.height}"></a><figcaption>${esc(item.caption)} <a href="${esc(item.image)}" target="_blank" rel="noopener">Enlarge image ↗</a></figcaption></figure>`;
  function comparison(item) {
    const headers = item.headers.map(h => h.text);
    // Long two-column source tables read better as named entries on the web.
    if (headers.length === 2) return `<div class="ir-entries">${item.rows.map(row => `<section class="ir-entry"><h5>${esc(row[0]?.parts[0]?.text || headers[0])}</h5>${parts(row[0]?.parts.slice(1))}<div>${parts(row[1]?.parts)}</div></section>`).join('')}</div>`;
    return `<div class="ir-comparison" tabindex="0" role="region" aria-label="${esc(headers.join(', '))} comparison"><table><caption>${esc(headers.join(' · '))}</caption><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${item.rows.map(row=>`<tr>${row.map((cell,i)=>`<${i===0?'th scope="row"':'td'} data-label="${esc(headers[i])}">${parts(cell.parts)}${(cell.figures||[]).map(figure).join('')}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function studyContent(topic) {
    let html='', figures=[];
    const flush = () => {if(figures.length){html += `<div class="ir-map-grid${figures.length===1?' single':''}">${figures.map(figure).join('')}</div>`;figures=[];}};
    for (const item of topic.elements) {
      if (item.type === 'figure') { figures.push(item); continue; }
      flush();
      if (item.type === 'heading') html += `<h4 id="${esc(item.id)}" tabindex="-1">${esc(item.text)}</h4>`;
      if (item.type === 'body') html += `<div class="ir-study-block">${parts(item.parts)}</div>`;
      if (item.type === 'entry') html += `<section class="ir-entry"><h5>${lead(item.labelParts[0]?.text || '')}</h5>${parts(item.labelParts.slice(1))}${parts(item.parts)}</section>`;
      if (item.type === 'callout') html += `<aside class="ir-callout">${lead(item.text)}</aside>`;
      if (item.type === 'comparison') html += comparison(item);
    }
    flush();return html;
  }
  function questionCard(question, index) {
    if (question.mains) return `<article class="ir-question"><p class="ir-kicker">MAINS PYQ ${index+1}</p><div class="ir-question-prompt"><p>${esc(question.prompt)}</p></div><p class="ir-exercise-note">Use the chapter notes to plan your answer. The source provides this question without a model answer.</p></article>`;
    if (question.exercise) return `<article class="ir-question"><p class="ir-kicker">ORIGINAL STUDY EXERCISE ${index+1}</p><p>${esc(question.prompt)}</p><details class="ir-answer"><summary>Self-check outline</summary><ul>${question.outline.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></details></article>`;
    const prompt = question.prompt.split(/\s+(?=\d+\.\s)/);
    return `<article class="ir-question"><p class="ir-kicker">QUESTION ${index+1}</p><div class="ir-question-prompt">${prompt.map(p=>`<p>${esc(p)}</p>`).join('')}</div><ol class="ir-options" type="a">${question.options.map(o=>`<li value="${o.label.charCodeAt(0)-96}">${esc(o.text)}</li>`).join('')}</ol>${question.answer?`<details class="ir-answer"><summary>Reveal the book’s answer</summary><p><strong>Option ${esc(question.answer.toUpperCase())}</strong>${question.options.find(o=>o.label===question.answer)?' · '+esc(question.options.find(o=>o.label===question.answer).text):''}</p></details>`:''}</article>`;
  }
  function exercises(topic) {
    const headings = topic.elements.filter(e=>e.type==='heading').slice(0,6).map(e=>e.text);
    return [
      {exercise:true,prompt:`Explain the core idea of ${topic.title} in your own words, using the definitions and examples in the notes.`,outline:['Define the central concept before discussing its effects.','Use one example or statistic from the supplied edition and retain its date.','Explain the connection between the concept and the wider economy.']},
      {exercise:true,prompt:`Build an issues–measures–way forward outline for ${topic.title}.`,outline:headings.length?['Use the relevant source headings as your checklist:',...headings]:['List the key issues identified in the notes.','Distinguish existing measures from recommendations.','Explain the main trade-off and a practical next step.']},
      {exercise:true,prompt:`Write a 150-word analytical answer on ${topic.title}, then check it against the source.`,outline:['Introduction: define the issue and its context.','Analysis: explain two or three linked arguments with source examples.','Conclusion: give a balanced assessment grounded in the book’s recommendations.']}
    ];
  }
  const guides = [
    'Locate the region first, then connect the parties, borders, causes and humanitarian effects.',
    'Compare each institution’s mandate, membership, headquarters and relationship with India.',
    'Trace the endpoints, countries and transport links on the map before memorising route names.',
    'Separate economic, security and regional groupings. Compare purpose, membership and India’s role.',
    'Keep the report, publisher, indicators and edition year together when revising rankings.',
    'Compare the partner countries, objective, agreement type and expected area of cooperation.',
    'Revise the exercise or operation alongside its participating forces, location and purpose.'
  ];
  const topicText = topic => [topic.title, ...topic.elements.map(e=>[e.text,e.caption,...(e.parts||[]).map(p=>p.text),...(e.labelParts||[]).map(p=>p.text),...(e.rows||[]).flatMap(r=>r.flatMap(c=>c.parts.map(p=>p.text)))].filter(Boolean).join(' '))].join(' ');
  async function mount(root, subject = 'ir') {
    if (!root) return;
    const config = books[subject];
    root.innerHTML = `<p class="ir-loading" role="status">Preparing your ${esc(config.short)} study room…</p>`;
    try {
      const data = await load(subject);
      let chapterId = 1, topicId = data.chapters[0].topics[0].id, mode = 'notes', query = '';
      const chapter = () => data.chapters.find(c=>c.id===chapterId);
      const paint = (focus = false) => {
        const current = chapter();
        const topic = current.topics.find(t=>t.id===topicId) || current.topics[0]; topicId=topic.id;
        const topicIndex = current.topics.indexOf(topic);
        const batches = current.practice.filter(b=>subject === 'governance' || subject === 'environment' || b.topic===topic.id);
        const questions = subject === 'economy' ? exercises(topic) : batches.flatMap(b=>b.questions);
        const headings = topic.elements.filter(e=>e.type==='heading');
        const outline = mode==='notes' && headings.length>2 ? `<details class="ir-outline"><summary>Jump to a section in this topic</summary><nav aria-label="Topic sections">${headings.map(h=>`<button type="button" data-ir-anchor="${esc(h.id)}">${esc(h.text)}</button>`).join('')}</nav></details>` : '';
        const results = query ? data.chapters.flatMap(c=>c.topics.filter(t=>(topicText(t)+' '+c.practice.filter(b=>b.topic===t.id).flatMap(b=>b.questions.map(q=>q.prompt)).join(' ')).toLowerCase().includes(query.toLowerCase())).map(t=>({chapter:c.id,topic:t}))) : [];
        const complete = typeof StudyProgress !== 'undefined' && StudyProgress.isComplete(`${config.progressPrefix}${current.id}`);
        const refs = [...new Set([...topic.pages,...batches.flatMap(b=>b.pages)])].sort((a,b)=>a-b);
        root.innerHTML = `<section class="ir-room" aria-label="${esc(config.name)} study reader"><header class="ir-room-header"><div><p class="ir-kicker">${esc(config.name.toUpperCase())} STUDY MATERIAL</p><h2>${esc(config.headline)}</h2><p>${esc(config.edition)} · ${data.chapters.length} chapters · ${data.chapters.flatMap(c=>c.topics).length} topics</p>${subject==='economy'?'<a class="ir-course-link" href="/home#economy-day-1">Open the 60-day foundation course ↗</a>':''}</div><label class="ir-search">Find a topic<input type="search" data-ir-search value="${esc(query)}" placeholder="${esc(config.placeholder)}"></label></header><div class="ir-layout"><aside class="ir-sidebar"><h3>Choose a chapter</h3><nav class="ir-chapters" aria-label="${esc(config.name)} chapters">${data.chapters.map(c=>`<button type="button" data-ir-chapter="${c.id}" ${c.id===chapterId?'aria-current="page"':''}><span>${String(c.id).padStart(2,'0')}</span><span>${esc(c.title)}</span></button>`).join('')}</nav><h3>Topics in this chapter</h3><nav class="ir-topic-list" aria-label="Chapter topics">${current.topics.map(t=>`<button type="button" data-ir-topic="${esc(t.id)}" ${t.id===topicId?'aria-current="true"':''}><span>${esc(t.number)}</span>${esc(t.title)}</button>`).join('')}</nav></aside><div class="ir-main">${query?`<section class="ir-search-results" aria-label="Search results"><h3>${results.length} matching topics</h3>${results.length?results.map(r=>`<button type="button" data-ir-result-chapter="${r.chapter}" data-ir-result-topic="${esc(r.topic.id)}"><small>CHAPTER ${r.chapter} · ${esc(r.topic.number)}</small><strong>${esc(r.topic.title)}</strong></button>`).join(''):'<p>No topics match. Try a different keyword or topic name.</p>'}</section>`:''}<article class="ir-topic" aria-labelledby="ir-topic-title"><header class="ir-topic-header"><p class="ir-kicker">CHAPTER ${current.id} · TOPIC ${esc(topic.number)}</p><h3 id="ir-topic-title" tabindex="-1">${esc(topic.title)}</h3><p class="ir-study-guide">${esc(current.guide || guides[current.id-1])}</p><div class="ir-mode-tabs" role="group" aria-label="Reading mode"><button type="button" data-ir-mode="notes" aria-pressed="${mode==='notes'}">Study notes</button><button type="button" data-ir-mode="practice" aria-pressed="${mode==='practice'}">${esc(config.practiceLabel)} <span>${questions.length}</span></button></div></header><div class="ir-topic-content">${mode==='notes'?studyContent(topic):questions.length?(subject === 'economy' ? '<p class="ir-exercise-note">Original recall and writing exercises based on this reading. These are not UPSC past questions.</p>' : '')+questions.map(questionCard).join('')+batches.filter(b=>b.answerKey && b.questions.some(q=>!q.answer)).map(b=>`<details class="ir-answer"><summary>Source answer key</summary><p>${esc(b.answerKey)}</p></details>`).join(''):'<div class="ir-empty"><h4>No past questions in this topic</h4><p>The source book has study material here. Return to Study notes to read it.</p></div>'}</div><footer class="ir-topic-footer"><p>Source: ${esc(config.sourceLabel)} · Book pages ${refs.map(n=>`<a href="${esc(config.source)}#page=${n}" target="_blank" rel="noopener">${data.printedPages?.[n] ?? n-config.offset}</a>`).join(', ')}</p><nav class="ir-topic-controls" aria-label="Previous and next topic"><button type="button" data-ir-step="-1" ${topicIndex===0?'disabled':''}>← Previous topic</button><span>${topicIndex+1} of ${current.topics.length} topics</span><button type="button" data-ir-step="1" ${topicIndex===current.topics.length-1?'disabled':''}>Next topic →</button></nav><label class="ir-complete"><input type="checkbox" data-ir-chapter-complete ${complete?'checked':''}> I have completed Chapter ${current.id}: ${esc(current.title)}</label>${topic.ocrPages?.length?'<p class="ir-ocr-note">Includes text recovered from scanned pages. Original page links are available above.</p>':''}<p class="ir-save-note" role="status" id="ir-save-status">Chapter completion appears in My Profile.</p></footer></article></div></div></section>`;
        if (subject === 'governance') root.innerHTML=root.innerHTML.replace('</header><div class="ir-layout">', '</header><p class="ir-exercise-note"><a href="/governance-source/preparation-guide.pdf" target="_blank" rel="noopener">Read the publisher’s preface and 2013–2024 PYQ strategy ↗</a> · Source edition: Mains 2025</p><div class="ir-layout">');
        if (data.notice || config.course) root.innerHTML=root.innerHTML.replace('</header><div class="ir-layout">','</header><div class="ir-exercise-note">'+(data.notice?'<p>'+esc(data.notice)+'</p>':'')+(config.course?'<a class="ir-course-link" href="'+esc(config.course)+'">Open the 60-day foundation course ↗</a>':'')+'</div><div class="ir-layout">');
        if (data.preface?.length) root.innerHTML=root.innerHTML.replace('</header><div class="ir-layout">','</header><details class="ir-preface"><summary>Publisher’s preface</summary>'+data.preface.map(p=>`<p>${esc(p)}</p>`).join('')+'</details><div class="ir-layout">');
        if (outline) root.innerHTML = root.innerHTML.replace('<div class="ir-topic-content">','<div class="ir-topic-content">'+outline);
        if (focus) root.querySelector('#ir-topic-title')?.focus();
      };
      root.onclick = event => {
        const button = event.target.closest('button'); if (!button || button.disabled) return;
        const d = button.dataset;
        if (d.irAnchor) {const target=root.querySelector('#'+d.irAnchor);target?.scrollIntoView?.({block:'start'});target?.focus();return;}
        if (d.irChapter) {chapterId=Number(d.irChapter);topicId=chapter().topics[0].id;mode='notes';query='';}
        else if (d.irTopic) {topicId=d.irTopic;mode='notes';query='';}
        else if (d.irMode) mode=d.irMode;
        else if (d.irStep) {const topics=chapter().topics;topicId=topics[topics.findIndex(t=>t.id===topicId)+Number(d.irStep)]?.id || topicId;mode='notes';}
        else if (d.irResultTopic) {chapterId=Number(d.irResultChapter);topicId=d.irResultTopic;query='';mode='notes';}
        else return;
        paint(true);
      };
      root.oninput = event => {
        if (!event.target.matches('[data-ir-search]')) return;
        query=event.target.value;const position=event.target.selectionStart;paint();
        const input=root.querySelector('[data-ir-search]');input.focus();input.setSelectionRange(position,position);
      };
      root.onchange = event => {
        if (!event.target.matches('[data-ir-chapter-complete]')) return;
        if (typeof StudyProgress !== 'undefined') {
          StudyProgress.record(`${config.progressPrefix}${chapterId}`,event.target.checked);
          root.querySelector('#ir-save-status').textContent=event.target.checked?'Chapter completed. Your profile progress is updated.':'Chapter marked as unfinished. Your profile progress is updated.';
        }
      };
      paint();
    } catch {
      root.innerHTML=`<p role="status">${esc(config.short)} study material could not load.</p><button type="button" data-ir-retry>Try again</button>`;
      root.onclick=()=>mount(root,subject);
    }
  }
  return {mount,load};
})();
