const PrelimsBooster = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pending = new Map();
  function json(url) {
    if (!pending.has(url)) pending.set(url, fetch(url).then(r => {
      if (!r.ok) throw Error('Material unavailable');
      return r.json();
    }).catch(error => { pending.delete(url); throw error; }));
    return pending.get(url);
  }
  const load = () => json('/data/prelims-2025/catalog.json?v=1');
  const loadBook = id => json('/data/prelims-2025/'+id+'.json?v=1');
  function paragraphs(items = []) {
    let html='',list=false;
    for (const p of items) {
      if (p.bullet && !list) { html+='<ul>';list=true; }
      if (!p.bullet && list) { html+='</ul>';list=false; }
      html+=p.bullet?`<li${p.level===2?' class="booster-subpoint"':''}>${esc(p.text)}</li>`:`<p>${esc(p.text)}</p>`;
    }
    return html+(list?'</ul>':'');
  }
  function notes(page) {
    return page.elements.map(e => {
      if (e.type==='heading') return `<h4>${esc(e.text)}</h4>`;
      if (e.type==='body') return paragraphs(e.parts);
      if (e.type==='figure') return `<figure class="booster-figure"><a href="${esc(e.image)}" target="_blank" rel="noopener" aria-label="Enlarge ${esc(e.caption)}"><img src="${esc(e.image)}" alt="${esc(e.caption)}" width="${e.width}" height="${e.height}" loading="lazy"></a><figcaption>${esc(e.caption)} · <a href="${esc(e.image)}" target="_blank" rel="noopener">Enlarge</a></figcaption></figure>`;
      if (e.type==='table') return `<div class="booster-table" role="region" tabindex="0" aria-label="Source comparison"><table><thead><tr>${e.headers.map(h=>`<th scope="col">${esc(h.text)}</th>`).join('')}</tr></thead><tbody>${e.rows.map(row=>`<tr>${row.map((c,i)=>`<${i===0?'th scope="row"':'td'} data-label="${esc(e.headers[i].text)}">${paragraphs(c.parts)}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      return '';
    }).join('') || '<p>This page is visual. Choose Original page to read its complete source layout.</p>';
  }
  let root, catalog, book=null, pageNumber=0, mode='notes', query='', request=0, selectedTopic='';
  function updateHash() {
    history.replaceState(null,'',book?`#prelims-2025-${book.id}-p${pageNumber}`:'#prelims-2025');
  }
  function overview() {
    root.innerHTML=`<div class="booster-shell"><header class="booster-intro"><p class="booster-kicker">CRACK IAS · PRELIMS BOOSTER 2025</p><h2>Rau’s PRE Compass</h2><p>Seven subjects. One place to read, revise and keep your PDFs.</p><p class="booster-source-note">2025 source edition · Crack IAS covers · Original material from page 2 onward</p></header><div class="booster-books">${catalog.books.map(b=>`<article class="booster-book"><img src="${esc(b.cover)}" alt="Crack IAS Prelims Booster 2025 — ${esc(b.title)} cover" width="180" height="240" loading="lazy"><div><p class="booster-kicker">RAU’S PRE COMPASS · 2025</p><h3>${esc(b.title)}</h3><p>${b.pageCount} PDF pages · ${b.chapters} chapters · ${b.topics} topics</p><div class="booster-actions"><button type="button" data-booster-book="${esc(b.id)}">Read on website</button><a href="${esc(b.pdf)}" download="Crack-IAS-Prelims-Booster-2025-${esc(b.id)}.pdf">Download PDF</a></div><a class="booster-pdf-link" href="${esc(b.pdf)}" target="_blank" rel="noopener">Open PDF ↗</a></div></article>`).join('')}</div><p class="booster-source-note">These compilations retain the facts, dates and terminology of the supplied 2025 editions.</p></div>`;
  }
  function paint(focus=false) {
    if (!book) { overview();return; }
    const page=book.pages.find(p=>p.number===pageNumber) || book.pages[0];pageNumber=page.number;
    const ci=Math.max(0,book.chapters.findLastIndex(c=>c.page<=pageNumber));
    const chapter=book.chapters[ci];
    const index=book.pages.indexOf(page);
    const results=query?book.pages.filter(p=>p.text.toLowerCase().includes(query.toLowerCase())):[];
    const source=`${book.pdf}#page=${page.number}`;
    root.innerHTML=`<div class="booster-shell"><header class="booster-reader-head"><div><button type="button" class="booster-back" data-booster-overview>← All subjects</button><p class="booster-kicker">PRELIMS BOOSTER 2025 · RAU’S PRE COMPASS</p><h2>${esc(book.title)}</h2><p class="booster-source-note">${book.pageCount} PDF pages · ${book.chapters.length} chapters · Source edition: 2025</p></div><div class="booster-actions"><a href="${esc(book.pdf)}" download="Crack-IAS-Prelims-Booster-2025-${esc(book.id)}.pdf">Download PDF</a><a href="${esc(source)}" target="_blank" rel="noopener">Open this page in PDF ↗</a></div></header><label class="booster-subject-switch">Subject<select data-booster-subject>${catalog.books.map(b=>`<option value="${esc(b.id)}" ${b.id===book.id?'selected':''}>${esc(b.title)}</option>`).join('')}</select></label><div class="booster-layout"><aside class="booster-sidebar"><label>Find in ${esc(book.title)}<input type="search" data-booster-search value="${esc(query)}" placeholder="Topic, institution or keyword"></label><h3>Chapters</h3><nav aria-label="Booster chapters">${book.chapters.map((c,i)=>`<button type="button" data-booster-chapter="${i}" ${i===ci?'aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(c.title)}</button>`).join('')}</nav><h3>Topics in this chapter</h3><nav aria-label="Booster topics">${chapter.topics.map((t,i)=>`<button type="button" data-booster-topic="${i}" ${t.title===selectedTopic?'aria-current="true"':''}>${esc(t.title)}<small>PDF ${t.page}</small></button>`).join('')||'<p class="booster-source-note">Read the chapter using the page controls.</p>'}</nav></aside><div class="booster-main">${query?`<section class="booster-results" aria-label="Search results"><h3>${results.length} matching pages</h3>${results.map(p=>{const at=p.text.toLowerCase().indexOf(query.toLowerCase());return `<button type="button" data-booster-result="${p.number}"><strong>PDF page ${p.number} · Book page ${esc(p.printedPage)}</strong><span>${esc(p.text.slice(Math.max(0,at-60),at+160))}</span></button>`;}).join('')||'<p>No pages match. Try another keyword.</p>'}</section>`:''}<article class="booster-page" aria-labelledby="booster-page-title"><header><p class="booster-kicker">CHAPTER ${ci+1} · ${esc(chapter.title)}</p><h3 id="booster-page-title" tabindex="-1">Book page ${esc(page.printedPage)} <span>· PDF page ${page.number}</span></h3><div class="booster-modes" role="group" aria-label="Reading view">${[['notes','Web notes'],['original','Original page'],['pdf','PDF viewer']].map(([id,label])=>`<button type="button" data-booster-mode="${id}" aria-pressed="${mode===id}">${label}</button>`).join('')}</div></header><div class="booster-content">${mode==='notes'?notes(page):mode==='original'?`<a class="booster-original" href="${esc(page.image)}" target="_blank" rel="noopener" aria-label="Enlarge original page ${page.number}"><img src="${esc(page.image)}" alt="Original ${esc(book.title)} book page ${esc(page.printedPage)}" width="${page.width}" height="${page.height}"></a><p class="booster-source-note">Select the page to enlarge it.</p>`:`<iframe class="booster-pdf" src="${esc(source)}" title="${esc(book.title)} PDF, page ${page.number}"></iframe><p><a href="${esc(source)}" target="_blank" rel="noopener">Open the PDF in a new tab</a></p>`}</div><footer><p class="booster-source-note">${mode==='notes'?'Read Original page for the exact diagrams and page layout. ':''}Source: Rau’s PRE Compass 2025 · <a href="${esc(source)}" target="_blank" rel="noopener">Book page ${esc(page.printedPage)}</a></p><div class="booster-pagination"><button type="button" data-booster-step="-1" ${index===0?'disabled':''}>← Previous page</button><label>PDF page <input data-booster-jump type="number" inputmode="numeric" min="${book.pages[0].number}" max="${book.pages.at(-1).number}" value="${page.number}" aria-label="Go to PDF page"></label><button type="button" data-booster-step="1" ${index===book.pages.length-1?'disabled':''}>Next page →</button></div></footer></article></div></div></div>`;
    if (focus) root.querySelector('#booster-page-title')?.focus();
  }
  async function openBook(id, number) {
    const metadata=catalog.books.find(b=>b.id===id);if(!metadata)return;
    const ticket=++request;
    root.innerHTML='<p class="booster-loading" role="status">Opening '+esc(metadata.title)+'…</p>';
    try {
      const value=await loadBook(id);if(ticket!==request)return;
      book=value;pageNumber=book.pages.some(p=>p.number===Number(number))?Number(number):book.pages[0].number;
      query='';mode='notes';selectedTopic='';updateHash();paint(true);
    } catch {
      if(ticket!==request)return;
      root.innerHTML=`<p role="status">This subject could not load.</p><button type="button" data-booster-book="${esc(id)}">Try again</button><button type="button" data-booster-overview>All subjects</button>`;
    }
  }
  async function mount(host) {
    if(!host)return;root=host;const ticket=++request;
    root.innerHTML='<p class="booster-loading" role="status">Preparing Prelims Booster 2025…</p>';
    root.onclick=event=>{
      const button=event.target.closest('button');if(!button||button.disabled)return;
      const d=button.dataset;
      if('boosterOverview' in d){request++;book=null;query='';updateHash();paint();}
      else if(d.boosterBook)return openBook(d.boosterBook);
      else if(!book)return;
      else if(d.boosterMode){mode=d.boosterMode;paint();}
      else {
        if(d.boosterChapter!==undefined){pageNumber=book.chapters[Number(d.boosterChapter)].page;selectedTopic='';}
        else if(d.boosterTopic!==undefined){const c=book.chapters[Math.max(0,book.chapters.findLastIndex(c=>c.page<=pageNumber))];const t=c.topics[Number(d.boosterTopic)];pageNumber=t.page;selectedTopic=t.title;}
        else if(d.boosterResult){pageNumber=Number(d.boosterResult);query='';}
        else if(d.boosterStep){const index=book.pages.findIndex(p=>p.number===pageNumber);pageNumber=book.pages[index+Number(d.boosterStep)]?.number||pageNumber;selectedTopic='';}
        else return;
        updateHash();paint(true);
      }
    };
    root.oninput=event=>{
      if(!event.target.matches('[data-booster-search]')||!book)return;
      query=event.target.value;const position=event.target.selectionStart;paint();
      const input=root.querySelector('[data-booster-search]');input.focus();input.setSelectionRange(position,position);
    };
    root.onchange=event=>{
      if(event.target.matches('[data-booster-subject]'))return openBook(event.target.value);
      if(event.target.matches('[data-booster-jump]')&&book){const n=Number(event.target.value);if(book.pages.some(p=>p.number===n)){pageNumber=n;selectedTopic='';updateHash();paint(true);}else event.target.value=pageNumber;}
    };
    try {
      catalog=await load();if(ticket!==request)return;
      const match=location.hash.match(/^#prelims-2025-([a-z]+)(?:-p(\d+))?$/);
      if(match&&catalog.books.some(b=>b.id===match[1]))await openBook(match[1],match[2]);
      else{book=null;overview();}
    } catch {
      root.innerHTML='<p role="status">Prelims Booster could not load.</p><button type="button" data-booster-retry>Try again</button>';
      root.onclick=()=>mount(root);
    }
  }
  return {mount,load,loadBook};
})();
