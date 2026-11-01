const MonthlyCurrentAffairs = (() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const monthLabel = month => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-IN', {month:'long',year:'numeric'});
  const monthName = month => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-IN',{month:'long'});
  const dateLabel = date => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'});
  const reading = item => CurrentAffairsLanguage.forIssue(item);
  const plain = value => CurrentAffairsLanguage.plain(value);
  let archive, host, activeMonth, images={}, imagesLoaded=false, loading=false, loadedAt=0;
  const items = () => (archive?.months.flatMap(month=>month.items) ?? []).filter(CurrentAffairsLanguage.isImportant);
  const months = () => (archive?.months ?? []).filter(month=>month.items.some(CurrentAffairsLanguage.isImportant));
  const answers=new Map(), rememberedMonths=new Map();
  const monthsForYear=year=>months().filter(month=>month.id.startsWith(year+'-')).sort((a,b)=>a.id.localeCompare(b.id));
  const examFor=item=>CurrentAffairsExam.forIssue(item);
  const monthItems = () => items().filter(item=>item.published.startsWith(activeMonth));
  function picture(item) {
    const photo=images[item.id];
    if (!photo || typeof photo.src!=='string' || typeof photo.sourceUrl!=='string') return '';
    try { if (new URL(photo.src).protocol!=='https:' || new URL(photo.sourceUrl).protocol!=='https:') return ''; } catch { return ''; }
    return `<figure class="ca-picture" title="Image: ${escape(photo.source)}"><img src="${escape(photo.src)}" alt="${escape(plain(photo.alt))}" width="100" height="72" loading="lazy" decoding="async" referrerpolicy="no-referrer"></figure>`;
  }
  function renderTags(item) {
    const exam=examFor(item);
    return exam?`<ul class="ca-gs-tags" aria-label="Mains GS syllabus">${exam.tags.map(tag=>`<li title="Mains ${escape(tag.paper)}: ${escape(tag.topic)}"><strong>${escape(tag.paper)}</strong> &middot; ${escape(tag.topic)}</li>`).join('')}</ul>`:'';
  }
  function answerMessage(question,state) {
    if(!state?.checked)return '';
    return `${state.choice===question.answer?'Correct.':'Answer: '+String.fromCharCode(65+question.answer)+'.'} ${question.explanation}`;
  }
  function renderQuestion(item) {
    const question=examFor(item),state=answers.get(item.id);
    if(!question)return '';
    return `<details class="ca-prelims"><summary>Prelims practice</summary><p class="ca-practice-note">Practice question, not a past UPSC question.</p><fieldset><legend>${escape(question.question)}</legend>${question.options.map((option,index)=>`<label><input type="radio" name="ca-q-${item.id}" data-ca-choice="${item.id}" value="${index}" ${state?.choice===index?'checked':''}><span>${String.fromCharCode(65+index)}. ${escape(option)}</span></label>`).join('')}</fieldset><div class="ca-question-actions"><button type="button" data-ca-check="${item.id}" aria-controls="ca-answer-${item.id}">Check answer</button><a href="${escape(question.reference)}">Reference &rarr;</a></div><p class="ca-answer" id="ca-answer-${item.id}" role="status">${escape(answerMessage(question,state))}</p></details>`;
  }
  function renderDateNav() {
    const year=activeMonth?.slice(0,4);
    const years=[...new Set(months().map(month=>month.id.slice(0,4)))];
    return `<div class="ca-date-nav"><nav class="ca-years" aria-label="Current affairs years">${years.map(value=>`<button type="button" data-ca-year="${value}" aria-pressed="${value===year}">${value}</button>`).join('')}</nav><nav class="ca-months" aria-label="Months in ${escape(year)}">${monthsForYear(year).map(month=>`<button type="button" data-ca-month="${month.id}" aria-pressed="${month.id===activeMonth}">${monthName(month.id)}</button>`).join('')}</nav></div>`;
  }
  function renderCard(item) {
    const copy=reading(item);
    return `<article class="ca-story" id="ca-${item.id}" tabindex="-1" data-hit="news:${escape(item.title)}"><div class="ca-card-inner"><div class="ca-card-heading"><h3><button type="button" class="ca-headline" data-ca-headline="${item.id}" aria-controls="ca-notes-${item.id}" aria-expanded="false">${escape(copy.title)}</button></h3>${picture(item)}</div><p class="ca-short">${escape(copy.short)}</p>${renderTags(item)}${renderQuestion(item)}${renderNotes(item)}<footer class="ca-story-meta"><time datetime="${item.published}">${dateLabel(item.published)}</time><span>${escape(item.source)}</span></footer></div></article>`;
  }
  function renderStories() {
    const selected=monthItems();
    host.querySelector('#ca-month-title').textContent=activeMonth?monthLabel(activeMonth):'Current affairs';
    host.querySelector('#ca-count').textContent=`${selected.length} news snippets`;
    host.querySelector('#ca-stories').innerHTML=`<div class="ca-card-grid">${selected.map(renderCard).join('') || '<p class="ca-empty">No highlights for this month.</p>'}</div>`;
    for(const button of host.querySelectorAll('[data-ca-month]'))button.setAttribute('aria-pressed',String(button.dataset.caMonth===activeMonth));
  }
  function renderAnalysis(item) {
    const analysis=CurrentAffairsAnalysis.forIssue(item);
    if(!analysis)return '';
    const bullet=point=>{
      const colon=point.indexOf(':');
      return colon>0&&colon<55?`<strong>${escape(point.slice(0,colon))}:</strong>${escape(point.slice(colon+1))}`:escape(point);
    };
    const list=(title,points,extra='')=>`<section class="ca-analysis-section ${extra}"><h4>${escape(title)}</h4><ul>${points.map(point=>`<li>${bullet(point)}</li>`).join('')}</ul></section>`;
    return `<div class="ca-analysis"><section class="ca-analysis-section ca-analysis-trigger"><h4>Why in the news?</h4><p>${escape(analysis.news)}</p></section><section class="ca-analysis-section"><h4>Background</h4><p>${escape(analysis.background)}</p></section>${list('Key developments',analysis.developments,'ca-analysis-developments')}${list('Significance',analysis.importance)}${list('Challenges',analysis.challenges)}${list('Way forward',analysis.wayForward)}<section class="ca-analysis-section ca-prelims-focus"><h4>Prelims focus</h4><div class="ca-facts-scroll" role="region" aria-label="Revision facts for ${escape(reading(item).title)}" tabindex="0"><table><caption>Terms and distinctions to remember</caption><thead><tr><th scope="col">Concept</th><th scope="col">What to remember</th></tr></thead><tbody>${analysis.facts.map(([term,meaning])=>`<tr><th scope="row">${escape(term)}</th><td>${escape(meaning)}</td></tr>`).join('')}</tbody></table></div></section><section class="ca-analysis-section ca-mains-practice"><h4>Mains practice</h4><p>${escape(analysis.mains)}</p><p class="ca-answer-plan"><strong>Answer approach:</strong> Set out the context, use the reported facts, weigh benefits against concerns, and finish with practical measures.</p></section><p class="ca-analysis-disclosure">Background and assessment are study explanations. The source report is dated ${dateLabel(analysis.source.published)}.</p></div>`;
  }
  function renderNotes(item) {
    return `<details class="ca-extra-study" id="ca-notes-${item.id}"><summary>More notes</summary>${renderAnalysis(item)}<p class="ca-source-note"><a href="${escape(item.url)}">Original report &rarr;</a></p><button type="button" class="prep-save-revision" data-ca-revision="${item.id}">Save</button><span id="ca-revision-status-${item.id}" role="status"></span></details>`;
  }
  function render() {
    host.innerHTML=`<header class="ca-top"><h2>Current affairs</h2><button type="button" id="ca-refresh" ${loading?'disabled':''}>${loading?'Updating...':'Refresh'}</button><span class="ca-refresh-status" role="status"></span></header>${renderDateNav()}<section class="ca-main" aria-label="News highlights"><h3 id="ca-month-title" class="sr-only"></h3><p id="ca-count" class="ca-result-count" role="status"></p><div id="ca-stories"></div></section>`;
    renderStories();
    host.querySelector(`[data-ca-month="${activeMonth}"]`)?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  }
  function selectMonth() {
    if (!months().some(month=>month.id===activeMonth)) activeMonth=months()[0]?.id;
  }
  function openItem(id) {
    const item=items().find(item=>item.id===id);
    if(!item||!host)return;
    const month=item.published.slice(0,7);
    if(activeMonth!==month){activeMonth=month;rememberedMonths.set(month.slice(0,4),month);render();}
    const card=host.querySelector(`#ca-${id}`);
    card?.focus();card?.scrollIntoView?.({block:'start',behavior:'auto'});
    history.replaceState(null,'',`#current/${activeMonth}/${id}`);
  }
  async function mount(element) {
    host=element;
    if (!host.dataset.bound) {
      host.dataset.bound='true';
      // Leave room for the app header, including its extra rows on mobile.
      if(typeof document!=='undefined'){
        const mast=document.querySelector('.mast');
        const updateStickyOffset=()=>{
          const position=mast&&getComputedStyle(mast).position;
          const height=position==='sticky'||position==='fixed'?mast.getBoundingClientRect().height:0;
          host.style.setProperty('--ca-sticky-top',`${Math.ceil(height)+8}px`);
        };
        updateStickyOffset();
        if(mast&&typeof ResizeObserver==='function')new ResizeObserver(updateStickyOffset).observe(mast);
        window.addEventListener?.('resize',updateStickyOffset);
      }
      host.addEventListener('toggle',event=>{
        const notes=event.target;
        if(!notes.matches?.('.ca-extra-study'))return;
        const id=notes.id.slice('ca-notes-'.length);
        host.querySelector(`[data-ca-headline="${id}"]`)?.setAttribute('aria-expanded',String(notes.open));
        if(notes.open)host.querySelector(`#ca-${id}`)?.scrollIntoView?.({block:'start',behavior:'auto'});
      },true);
      host.addEventListener('change',event=>{
        const id=event.target.dataset?.caChoice;
        if(!id)return;
        const choice=Number(event.target.value),question=items().find(item=>item.id===id);
        if(!question||!Number.isInteger(choice)||choice<0||choice>3)return;
        answers.set(id,{choice,checked:false});const status=host.querySelector(`#ca-answer-${id}`);if(status)status.textContent='';
      });
      host.addEventListener('error',event=>{if(event.target.matches?.('.ca-picture img'))event.target.closest('figure')?.remove();},true);
      host.addEventListener('click',event=>{
        if(event.target.closest('#ca-refresh')){refresh();return;}
        if(event.target.closest('#ca-retry')){mount(host);return;}
        const headline=event.target.closest('[data-ca-headline]');
        if(headline){
          const notes=host.querySelector(`#ca-notes-${headline.dataset.caHeadline}`);
          if(notes){notes.open=!notes.open;headline.setAttribute('aria-expanded',String(notes.open));}
          return;
        }
        const check=event.target.closest('[data-ca-check]');
        if(check){
          const item=items().find(item=>item.id===check.dataset.caCheck),question=item&&examFor(item);
          if(!question)return;
          const status=host.querySelector(`#ca-answer-${item.id}`);
          const selected=host.querySelector(`input[name="ca-q-${item.id}"]:checked`);
          if(!selected){status.textContent='Choose an option first.';return;}
          const choice=Number(selected.value);
          if(!Number.isInteger(choice)||choice<0||choice>=question.options.length)return;
          const state={choice,checked:true};answers.set(item.id,state);status.textContent=answerMessage(question,state);return;
        }
        const year=event.target.closest('[data-ca-year]');
        if(year){
          const yearMonths=monthsForYear(year.dataset.caYear);if(!yearMonths.length)return;
          if(activeMonth)rememberedMonths.set(activeMonth.slice(0,4),activeMonth);
          const remembered=rememberedMonths.get(year.dataset.caYear);activeMonth=yearMonths.some(month=>month.id===remembered)?remembered:yearMonths.at(-1).id;
          render();history.replaceState(null,'',`#current/${activeMonth}`);host.querySelector(`[data-ca-year="${year.dataset.caYear}"]`)?.focus();return;
        }
        const month=event.target.closest('[data-ca-month]');
        if(month){if(!months().some(value=>value.id===month.dataset.caMonth))return;activeMonth=month.dataset.caMonth;rememberedMonths.set(activeMonth.slice(0,4),activeMonth);render();history.replaceState(null,'',`#current/${activeMonth}`);host.querySelector(`[data-ca-month="${activeMonth}"]`)?.focus();return;}
        const revision=event.target.closest('[data-ca-revision]');
        if(revision&&typeof PrepDesk!=='undefined'){
          const item=items().find(item=>item.id===revision.dataset.caRevision);
          if(item){const added=PrepDesk.addRevision({id:'news:'+item.id,title:reading(item).title,url:`/home#current/${item.published.slice(0,7)}/${item.id}`});host.querySelector(`#ca-revision-status-${item.id}`).textContent=added?' Saved.':' Already saved.';}
        }
      });
    }
    try {
      const imageRequest=imagesLoaded?null:fetch('/data/current-affairs-images.json',{signal:AbortSignal.timeout(8000)})
        .then(response=>response.ok?response.json():{}).then(value=>{images=value&&typeof value==='object'&&!Array.isArray(value)?value:{};imagesLoaded=true;}).catch(()=>{imagesLoaded=true;});
      if(!archive){
        host.innerHTML='<p class="ca-empty" role="status">Loading...</p>';
        let response=await fetch('/data/current-affairs-latest.json',{signal:AbortSignal.timeout(15000),cache:'no-store'});
        if(!response.ok)response=await fetch('/data/monthly-current-affairs.json',{signal:AbortSignal.timeout(15000),cache:'no-store'});
        if(!response.ok)throw Error('News unavailable');
        const value=await response.json();
        if(!Array.isArray(value.months)||!value.months.length)throw Error('News unavailable');
        archive=value;
      }
      await imageRequest;
      const link=window.location.hash.match(/^#current\/(\d{4}-\d{2})(?:\/([a-f0-9]{20}))?$/);
      activeMonth=link?.[1]||activeMonth;selectMonth();render();
      if(link?.[2])openItem(link[2]);
      if(Date.now()-loadedAt>15*60*1000)refresh();
    } catch {
      host.innerHTML='<div class="ca-empty" role="alert"><p>News could not load.</p><button type="button" id="ca-retry">Try again</button></div>';
    }
  }
  async function refresh() {
    if(loading)return;loading=true;
    const button=host?.querySelector('#ca-refresh');if(button){button.disabled=true;button.textContent='Updating...';}
    try {
      const response=await fetch('/api/current-affairs/archive',{signal:AbortSignal.timeout(25000),cache:'no-store'});
      if(!response.ok)throw Error('Updates unavailable');
      const value=await response.json();if(!Array.isArray(value.months)||!value.months.length)throw Error('Updates unavailable');
      archive=value;loadedAt=Date.now();selectMonth();render();
      if(typeof document!=='undefined'&&typeof document.dispatchEvent==='function')document.dispatchEvent(new CustomEvent('current-affairs-updated'));
    } catch {const status=host?.querySelector('.ca-refresh-status');if(status)status.textContent='Showing saved highlights.';}
    finally {loading=false;const current=host?.querySelector('#ca-refresh');if(current){current.disabled=false;current.textContent='Refresh';}}
  }
  if(typeof window.setInterval==='function')window.setInterval(()=>{if(host&&document.visibilityState==='visible'&&!document.getElementById('feed')?.hidden&&Date.now()-loadedAt>15*60*1000)refresh();},60000);
  if(typeof window.addEventListener==='function')window.addEventListener('focus',()=>{if(host&&!document.getElementById('feed')?.hidden&&Date.now()-loadedAt>15*60*1000)refresh();});
  return {mount,openItem,refresh,getSearchItems:()=>items().map(item=>({...item,title:reading(item).title,summary:reading(item).short,tags:[...item.topics,...(examFor(item)?.tags.map(tag=>tag.paper+' '+tag.topic)||[])],section:'Current affairs'}))};
})();
