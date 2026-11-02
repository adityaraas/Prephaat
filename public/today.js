const TodayDashboard = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let accountId='guest', host, news, newsAt=0;
  const dateKey=()=>new Date().toLocaleDateString('en-CA');
  const tasks=[['Read the current affairs digest','#current','Read'],['Practise timed Polity MCQs','#quiz','Practise'],['Write a Mains answer ([N] words)','#preparation/writing','Write'],['Review flashcards due today','#preparation/revision','Revise']];
  const storageKey=()=>`crack-ias-today-${accountId}-${dateKey()}`;
  function checks(){try{const data=JSON.parse(localStorage.getItem(storageKey())||'[]');return Array.isArray(data)?data.filter(i=>Number.isInteger(i)&&i>=0&&i<tasks.length):[];}catch{return [];}}
  function icon(name){return SiteTheme.icon(name);}
  function progress(){
    const counts=typeof StudyProgress!=='undefined'?StudyProgress.snapshot().subjects:[];
    const count=id=>counts.find(s=>s.id===id)?.count||0;
    const groups=[['GS1 History, Geography',count('history')+count('geography'),120],['GS2 Polity, IR',count('polity')+count('ir')+count('governance'),72],['GS3 Economy, Science, Environment',count('economy')+count('science')+count('environment'),180],['GS4 Ethics',count('ethics'),60]];
    return groups.map(([name,value,max])=>`<div class="today-progress"><div><span>${name}</span><small>${value}/${max} lessons</small></div><progress value="${value}" max="${max}" aria-label="${name}: ${value} of ${max} lessons completed"></progress></div>`).join('');
  }
  async function mount(element){
    host=element;const done=checks();const snapshot=typeof StudyProgress!=='undefined'?StudyProgress.snapshot():{streak:0};
    host.innerHTML=`<div class="today-grid"><div class="today-main"><section class="today-card today-hero"><div><h1>Today’s plan</h1><p><span id="today-countdown">Set exam date in Planner</span> &middot; ${snapshot.streak}-day streak <span aria-hidden="true">·</span> <span id="today-done">${done.length}</span> of ${tasks.length} tasks complete</p></div><a class="today-button" href="${tasks.find((_,i)=>!done.includes(i))?.[1]||'/planner.html'}">Start today’s session ${icon('quiz')}</a></section><section class="today-card"><h2>${icon('preparation')}Study checklist</h2><ul class="today-checklist">${tasks.map(([text,url,action],i)=>`<li><label for="today-task-${i}"><input id="today-task-${i}" type="checkbox" data-today-task="${i}" ${done.includes(i)?'checked':''}><span>${text}</span></label><span class="today-duration" aria-label="Estimated time">[mm:ss]</span><a href="${url}" aria-label="${action}: ${text}">${action} <span aria-hidden="true">→</span></a></li>`).join('')}</ul><p class="today-status" id="today-save-status" role="status"></p></section><section class="today-card"><h2>${icon('current')}Current affairs</h2><div id="today-news"><p>Loading the latest digest…</p></div><a class="today-text-link" href="#current">Open full digest <span aria-hidden="true">→</span></a></section></div><aside class="today-side" aria-label="Study overview"><section class="today-card"><h2>${icon('survey')}Syllabus progress</h2>${progress()}<p class="today-note">Completed lessons in your study courses.</p></section><section class="today-card"><h2>${icon('polity')}Weak topics</h2><p>From your mistake notebook</p><div id="today-weak"></div><a class="today-text-link" href="#preparation/mistakes">Review mistakes <span aria-hidden="true">→</span></a></section><section class="today-card today-break"><span>A short chess game.</span><button type="button" class="today-button secondary" id="today-chess">Take a break</button></section></aside></div>`;
    const breakRequest=new URLSearchParams(location.search);
    if(breakRequest.get('break')==='chess'){document.getElementById('bored-chess-open').click();breakRequest.delete('break');history.replaceState(null,'',location.pathname+(breakRequest.size?'?'+breakRequest.toString():'')+location.hash);}
    syncCountdown();
    const mistakes=PrepDesk.snapshot().mistakes.filter(m=>!m.reviewed);
    const topics=[...new Set(mistakes.map(m=>m.topic||'Review saved mistakes'))].slice(0,3);
    host.querySelector('#today-weak').innerHTML=topics.length?`<ul class="today-weak">${topics.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<p class="today-note">No topics saved yet. Review a practice test to identify what needs work.</p>';
    if(!host.dataset.bound){host.dataset.bound='true';host.addEventListener('change',event=>{if(!event.target.matches('[data-today-task]'))return;const selected=[...host.querySelectorAll('[data-today-task]:checked')].map(input=>Number(input.dataset.todayTask));host.querySelector('#today-done').textContent=selected.length;try{localStorage.setItem(storageKey(),JSON.stringify(selected));StudyProgress.record(`block:${event.target.dataset.todayTask}`,event.target.checked);host.querySelector('#today-save-status').textContent='Saved on this browser.';}catch{host.querySelector('#today-save-status').textContent='Could not save. Browser storage is unavailable.';}});host.addEventListener('click',event=>{if(event.target.closest('#today-chess'))document.getElementById('bored-chess-open').click();});}
    try{
      if(!news){const response=await fetch('/data/current-affairs-latest.json');if(!response.ok)throw Error('Digest unavailable');news=await response.json();}
      paintNews(element);
      if(Date.now()-newsAt>15*60*1000){newsAt=Date.now();fetch('/api/current-affairs/archive',{signal:AbortSignal.timeout(25000),cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Live updates unavailable');return response.json();}).then(value=>{if(value.months){news=value;paintNews(element);}}).catch(()=>{});}

    }catch{element.querySelector('#today-news')?.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Digest unavailable. Open the archive to try again.'}));}
  }
  function paintNews(element){
    const stories=(news.months||[]).flatMap(month=>month.items||[]).filter(CurrentAffairsLanguage.isImportant).sort((a,b)=>String(b.published).localeCompare(String(a.published))).slice(0,3);
    const target=element.querySelector('#today-news');if(!target)return;
    target.innerHTML=stories.length?stories.map(story=>{
      const copy=CurrentAffairsLanguage.forIssue(story);
      return `<article class="today-story"><a href="#current/${esc(String(story.published).slice(0,7))}/${esc(story.id)}">${esc(copy.title)}</a><p class="today-note">${esc(copy.short)}</p></article>`;
    }).join(''):'<p>No stories yet. Open current affairs to choose a month.</p>';
  }
  function syncCountdown(){if(!host)return;const node=host.querySelector('#today-countdown');if(!node)return;try{const plan=JSON.parse(localStorage.getItem(`crack-ias-planner-${accountId}-v1`)||'{}');if(/^\d{4}-\d{2}-\d{2}$/.test(plan.exam)){const target=new Date(plan.exam+'T00:00:00');const now=new Date();const days=Math.round((Date.UTC(target.getFullYear(),target.getMonth(),target.getDate())-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);node.textContent=days<0?'Exam date passed':days===0?'Exam day':days+' days to exam';}else node.textContent='Set exam date in Planner';}catch{node.textContent='Set exam date in Planner';}}
  function syncChecklist(){if(!host||document.getElementById('today').hidden)return;const done=checks();host.querySelectorAll('[data-today-task]').forEach(input=>input.checked=done.includes(Number(input.dataset.todayTask)));const count=host.querySelector('#today-done');if(count)count.textContent=done.length;}
  window.addEventListener('storage',event=>{if(event.key===storageKey())syncChecklist();if(event.key===`crack-ias-planner-${accountId}-v1`)syncCountdown();});
  window.addEventListener('focus',()=>{syncChecklist();syncCountdown();});
  document.getElementById('today-syllabus')?.addEventListener('click',()=>{const toggle=document.getElementById('syllabus-toggle');if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();toggle.focus();});
  return {mount,setAccount(account){accountId=String(account?.id??'guest').replace(/[^a-zA-Z0-9_-]/g,'');}};
})();
