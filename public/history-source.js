const HistorySource = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lessonChapters = {1:[1],2:[2,4],3:[3],4:[3],5:[4,5],6:[6],7:[2,3,5,6],8:[26,27],9:[7,8,26,27],10:[7],11:[7],12:[8,9],13:[10],14:[7,8,26,27],15:[11],16:[5,10,11],17:[12,13,14],18:[8,10,11,13,29],19:[6,7,26,27],20:[3,6,7,11],21:[13,14,16,17,18],22:[13,14,15,16,17,18,21],23:[19,20],24:[20],25:[24],26:[24],27:[15,20,24],28:[22,23],29:[25],30:[28],31:[13,14,15,17,18,20,21,22,23,24],32:[15,20,22,24],33:[24],34:[20,24,25],35:[15,20,22,24,25]};
  let cached, pending;
  const bookPending = {};
  const load = async (subject = 'history') => {
    if (subject === 'polity' || subject === 'ir') {
      if (!bookPending[subject]) bookPending[subject] = fetch(`/data/${subject}-reading.json`).then(response => {
        if (!response.ok) throw Error('Unavailable');
        return response.json();
      }).catch(error => { delete bookPending[subject]; throw error; });
      return bookPending[subject];
    }
    if (cached) return cached;
    if (!pending) pending = fetch('/data/history-reading.json').then(response => { if (!response.ok) throw Error('Unavailable'); return response.json(); }).then(data => (cached = data)).catch(error => { pending = null; throw error; });
    return pending;
  };
  const prose = value => {
    const parts = String(value || '').split('\n').filter(Boolean);
    let html = '', list = false;
    for (const part of parts) {
      const bullet = /^(?:•|▪|➢|❖|[0-9]+[.)])\s*/.test(part);
      if (bullet && !list) { html += '<ul>'; list = true; }
      if (!bullet && list) { html += '</ul>'; list = false; }
      html += bullet ? '<li>' + esc(part.replace(/^(?:•|▪|➢|❖|[0-9]+[.)])\s*/,'')) + '</li>' : '<p>' + esc(part) + '</p>';
    }
    return html + (list ? '</ul>' : '');
  };
  const figure = item => '<figure class="reading-figure"><a href="' + esc(item.image) + '" target="_blank" rel="noopener" aria-label="Enlarge ' + esc(item.caption) + '"><img src="' + esc(item.image) + '" alt="' + esc(item.caption) + '" loading="lazy"' + (item.width ? ' width="' + item.width + '" height="' + item.height + '"' : '') + '></a><figcaption>' + esc(item.caption) + ' · Open to enlarge</figcaption></figure>';
  const element = item => {
    if (item.type === 'heading') return '<h4 id="' + esc(item.id) + '">' + esc(item.text) + '</h4>';
    if (item.type === 'figure') return figure(item);
    if (item.type === 'text') return '<div class="reading-prose">' + prose(item.text) + '</div>';
    if (item.type === 'table') {
      const headers = item.headers || [];
      return '<div class="reading-table" role="region" aria-label="Topic comparison" tabindex="0"><table>' + (headers.some(Boolean) ? '<thead><tr>' + headers.map((h,i)=>'<th scope="col">'+esc(h || (i===0?'Topic':'Details'))+'</th>').join('') + '</tr></thead>' : '') + '<tbody>' + item.rows.map(row => '<tr>' + row.map((cell,i) => cell === null ? '' : '<' + (i===0?'th scope="row"':'td') + ' rowspan="' + cell.rowspan + '">' + prose(cell.text) + '</' + (i===0?'th':'td') + '>').join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    return '';
  };
  const chapterText = chapter => chapter.title + ' ' + chapter.pages.flatMap(p => p.elements.map(e => e.text || e.caption || (e.rows || []).flatMap(row => row.map(c => c?.text || '')).join(' '))).join(' ');
  async function mount(root, initial = 'ancient') {
    if (initial === 'ir' && typeof IRReader !== 'undefined') return IRReader.mount(root);
    if (!root) return;
    try {
      const bookSubject = ['polity','ir'].includes(initial) ? initial : null;
      const label = bookSubject === 'ir' ? 'International Relations' : 'Polity';
      const data = await load(bookSubject || 'history');
      let section = initial === 'medieval' ? 'medieval' : 'all', query = '', selected = initial === 'medieval' ? 13 : 1;
      const sections = bookSubject ? [{id:'all',title:`All ${label.toLowerCase()} chapters`}] : [{id:'all',title:'All chapters'},{id:'ancient',title:'Ancient History'},{id:'medieval',title:'Medieval History'},{id:'culture',title:'Art and Culture'}];
      const matches = () => data.chapters.filter(c => (section === 'all' || c.sections.includes(section)) && (!query || chapterText(c).toLowerCase().includes(query.toLowerCase())));
      const paint = focus => {
        const chapters = matches();
        if (!chapters.some(c=>c.id===selected)) selected=chapters[0]?.id;
        const active=chapters.find(c=>c.id===selected);
        const pages=active ? active.pages.filter(p=>section==='all' || p.sections.includes(section)) : [];
        const headings=pages.flatMap(p=>p.elements.filter(e=>e.type==='heading'));
        const index=chapters.findIndex(c=>c.id===selected);
        root.innerHTML='<section class="source-book readable-history" aria-label="History study chapters"><p class="eyebrow">HISTORY STUDY MATERIAL</p><h2>Ancient & Medieval History, Art and Culture</h2><p class="reading-intro">Study complete chapters with clear text, topic comparisons and maps alongside the explanations.</p><nav class="source-tabs" aria-label="History subjects">'+sections.map(s=>'<button type="button" data-source-section="'+s.id+'" aria-pressed="'+(section===s.id)+'">'+esc(s.title)+'</button>').join('')+'</nav><label>Find a topic<input type="search" data-source-search placeholder="Search rulers, ideas, monuments or places" value="'+esc(query)+'"></label><p class="reading-count" role="status">'+chapters.length+' chapters'+(query?' matching your search':'')+'</p><div class="source-layout"><aside class="reading-sidebar"><h3>Chapters</h3><nav class="source-pages" aria-label="History chapters">'+chapters.map(c=>'<button type="button" data-source-chapter="'+c.id+'" '+(c.id===selected?'aria-current="page"':'')+'><small>Chapter '+c.id+'</small><span>'+esc(c.title)+'</span></button>').join('')+'</nav></aside><article class="source-content reading-chapter">'+(active?'<p class="eyebrow">CHAPTER '+active.id+'</p><h3 id="reading-chapter-title" tabindex="-1">'+esc(active.title)+'</h3>'+(headings.length?'<details class="reading-contents"><summary>In this chapter</summary><ul>'+headings.map(h=>'<li><a href="#'+esc(h.id)+'" data-reading-anchor="'+esc(h.id)+'">'+esc(h.text)+'</a></li>').join('')+'</ul></details>':'')+pages.map(p=>'<section class="reading-part" aria-label="Material from source page '+p.number+'">'+p.elements.map(element).join('')+'<p class="reading-reference"><a href="/history-source/book.pdf#page='+p.number+'" target="_blank" rel="noopener">Source reference · book page '+p.printedPage+'</a></p></section>').join('')+'<nav class="source-page-controls" aria-label="Chapter navigation"><button type="button" data-source-chapter="'+(chapters[index-1]?.id||active.id)+'" '+(index===0?'disabled':'')+'>← Previous chapter</button><button type="button" data-source-chapter="'+(chapters[index+1]?.id||active.id)+'" '+(index===chapters.length-1?'disabled':'')+'>Next chapter →</button></nav>':'<p>No chapters match. Try a different search.</p>')+'</article></div></section>';
        if (bookSubject) root.innerHTML = root.innerHTML
          .replaceAll('History study chapters', label+' study chapters')
          .replaceAll('HISTORY STUDY MATERIAL', label.toUpperCase()+' STUDY MATERIAL')
          .replaceAll('Ancient & Medieval History, Art and Culture', bookSubject === 'ir' ? 'International Relations · Prelims Smasher 2026' : 'Polity · Mains Smasher 2026')
          .replaceAll('History subjects', label+' subjects')
          .replaceAll('History chapters', label+' chapters')
          .replaceAll('Search rulers, ideas, monuments or places', bookSubject === 'ir' ? 'Search countries, organisations, agreements or topics' : 'Search articles, rights, institutions or topics')
          .replaceAll('/history-source/book.pdf', `/${bookSubject}-source/book.pdf`);
        if (bookSubject === 'ir' && active && typeof StudyProgress !== 'undefined') {
          root.querySelector('.reading-chapter').insertAdjacentHTML('beforeend', '<label class="complete"><input type="checkbox" data-ir-complete '+(StudyProgress.isComplete(`lesson:ir:${active.id}`)?'checked':'')+'> I have finished this chapter</label>');
        }
        if(focus) root.querySelector('#reading-chapter-title')?.focus();
        if (typeof StudyEmphasis !== 'undefined') StudyEmphasis.highlight(root);
      };
      root.onclick=event=>{
        const anchor=event.target.closest('[data-reading-anchor]');
        if(anchor){event.preventDefault();root.querySelector('#'+anchor.dataset.readingAnchor)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
        const button=event.target.closest('button');if(!button||button.disabled)return;
        if(button.dataset.sourceSection){section=button.dataset.sourceSection;query='';selected=null;paint(false);}
        if(button.dataset.sourceChapter){selected=Number(button.dataset.sourceChapter);paint(true);}
      };
      root.onchange=event=>{if(bookSubject==='ir' && event.target.matches('[data-ir-complete]') && typeof StudyProgress!=='undefined') StudyProgress.record(`lesson:ir:${selected}`,event.target.checked);};
      root.oninput=event=>{if(!event.target.matches('[data-source-search]'))return;query=event.target.value;const start=event.target.selectionStart;paint(false);const input=root.querySelector('[data-source-search]');input.focus();input.setSelectionRange(start,start);};
      paint(false);
    } catch {root.innerHTML='<p role="status">Study chapters could not load. <button type="button">Retry</button></p>';root.querySelector('button').onclick=()=>mount(root,initial);}
  }
  async function mountLesson(root, lesson){
    if(!root)return;
    root.innerHTML='';
    if(!lessonChapters[lesson.day])return;
    try{
      const data=await load();
      const pictures=data.chapters.filter(c=>lessonChapters[lesson.day].includes(c.id)).flatMap(c=>c.pages.flatMap(p=>p.elements.filter(e=>e.type==='figure')));
      if(pictures.length)root.innerHTML='<section class="lesson-source-visuals"><h3>Maps and illustrations for this lesson</h3>'+pictures.map(figure).join('')+'</section>';
    }catch{root.innerHTML='';}
  }
  return {mount,mountLesson,load};
})();
