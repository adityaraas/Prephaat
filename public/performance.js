const PerformanceScreen = (() => {
  const $=id=>document.getElementById(id), {esc,labels}=StudyData;
  let catalog,request=0;
  const percent=value=>value===null?'No attempts':`${Math.round(value)}%`;
  const duration=ms=>ms===null?'Not recorded':`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
  const date=value=>new Date(value).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  const empty=text=>`<p class="empty-state">${esc(text)}</p>`;
  const table=(headers,rows)=>`<details class="table-details"><summary>View data table</summary><div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>i?`<td>${esc(cell)}</td>`:`<th scope="row">${esc(cell)}</th>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  function trend(mocks){
    if(!mocks.length)return empty('Complete a full mock to see your score trend.');
    const values=mocks.map(mock=>mock.score/mock.maxScore*100),min=Math.min(0,...values),range=100-min;
    const points=values.map((value,i)=>({x:mocks.length===1?245:52+i*388/(mocks.length-1),y:180-(value-min)/range*150,value}));
    return `<svg class="score-chart" viewBox="0 0 460 230" role="img" aria-label="Full mock score trend: ${mocks.length} saved attempts. See data table for every score."><path class="gridline" d="M52 30H440 M52 105H440 M52 180H440"/><path class="axis" d="M52 20V185H440"/><text x="6" y="34">100%</text><text x="10" y="109">${Math.round((100+min)/2)}%</text><text x="10" y="184">${Math.round(min)}%</text><polyline points="${points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#172033" stroke-width="2"/>${points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#F2A33A" stroke="#172033" stroke-width="1.5"><title>${esc(mocks[i].title)}: ${mocks[i].score.toFixed(1)} / ${mocks[i].maxScore} (${Math.round(p.value)}%) on ${date(mocks[i].date)}</title></circle>`).join('')}<text x="52" y="214">${esc(date(mocks[0].date))}</text><text x="330" y="214">${esc(date(mocks.at(-1).date))}</text></svg>${table(['Mock','Date','Score','Maximum'],mocks.map(mock=>[mock.title,date(mock.date),mock.score.toFixed(1),mock.maxScore]))}`;
  }
  function render(data){
    const metrics=document.querySelectorAll('.metric-value'),notes=document.querySelectorAll('.metric-note');
    metrics[0].textContent=percent(data.accuracy);metrics[1].textContent=data.mocks.length?`${data.mocks.at(-1).score.toFixed(1)} / ${data.mocks.at(-1).maxScore}`:'No mocks yet';metrics[2].textContent=duration(data.averageTimeMs);
    notes[0].textContent=`${data.correct} correct / ${data.attempted} attempted`;
    notes[1].textContent=data.mocks.length?`${data.mocks.at(-1).title} / ${date(data.mocks.at(-1).date)}`:'Start a full mock from Practice';
    notes[2].textContent=`${data.timedQuestions} questions with recorded active time`;
    $('view-status').textContent=`${data.totalAttempts} saved Prelims attempts in this selection. ${data.scope}`;
    const accuracy=data.subjects.length?data.subjects.map(item=>`<div class="accuracy-row"><span>${esc(labels[item.subject]||item.subject)}</span><span class="empty-track" aria-hidden="true"><span style="display:block;height:100%;background:#172033;width:${item.accuracy??0}%"></span></span><output>${percent(item.accuracy)}</output></div>`).join('')+table(['Subject','Correct','Attempted','Skipped','Accuracy'],data.subjects.map(item=>[labels[item.subject]||item.subject,item.correct,item.attempted,item.skipped,percent(item.accuracy)])):empty('No saved answers in this selection. Take a practice test to begin.');
    const maxTime=Math.max(1,...data.timings.map(q=>q.milliseconds));
    const timing=data.timings.length?`<div class="time-chart" style="overflow-x:auto" role="img" aria-label="Active time for ${data.timings.length} questions in your latest timed attempt. See the data table.">${data.timings.map((item,index)=>`<div class="question-column" style="min-width:46px"><span class="time-value">${duration(item.milliseconds)}</span><span class="empty-bar" style="height:${Math.max(2,item.milliseconds/maxTime*125)}px;background:#172033;border:0" aria-hidden="true"></span><span class="q-label">${index+1}</span></div>`).join('')}</div>${table(['Question','Time','Result'],data.timings.map(q=>[q.prompt,duration(q.milliseconds),q.chosen<0?'Skipped':q.ok?'Correct':'Incorrect']))}`:empty('Question timings were not stored for older attempts. New practice tests record active-question time, excluding hidden tabs.');
    const weak=data.weakTopics.slice(0,10);
    document.querySelector('.chart-grid').innerHTML=`<section class="card chart-card"><h2>Accuracy by subject</h2><p class="chart-subtitle">Correct / attempted. Skipped answers are excluded.</p>${accuracy}</section><section class="card chart-card"><h2>Score trend across mocks</h2><p class="chart-subtitle">Full mock scores across the selected period; independent of subject filter.</p>${trend(data.mocks)}</section><section class="card chart-card"><h2>Time per question</h2><p class="chart-subtitle">Latest attempt with recorded active-question time.</p>${timing}</section><section class="card chart-card"><h2>Weak topics</h2><p class="sort-label">Lowest accuracy first; ties by most attempts. Low sample sizes are shown.</p><ol class="weak-list">${weak.map((topic,i)=>`<li class="weak-item"><span class="rank">${String(i+1).padStart(2,'0')}</span><div><p class="weak-topic">${esc(topic.topic)}</p><p class="weak-meta">${esc(labels[topic.subject]||topic.subject)} / ${percent(topic.accuracy)} / ${topic.attempted} attempted / ${topic.skipped} skipped</p></div><a class="button" href="${esc(StudyData.practiceUrl(topic.subject))}" aria-label="Practise ${esc(topic.topic)} subject questions">Practice now &rarr;</a></li>`).join('')}</ol>${weak.length?'':empty(data.attempted?'No incorrect topics in this selection.':'Complete a test to identify weak topics.')}<a class="syllabus-link" href="/home#preparation/mistakes">Open mistake notebook &rarr;</a></section>`;
    const completed=StudyData.completed(catalog.accountId);
    const focus=weak[0];const material=StudyData.recommendation(catalog.items,focus?.subject||'history',focus?.topic||'',completed);
    const progress=new Map();for(const item of catalog.items)if(item.progress&&!progress.has(item.progress))progress.set(item.progress,item);
    const tracked=[...progress.values()];
    const next=document.querySelector('.next-card');
    next.innerHTML=`<div><span class="recommendation-tag">Your next study session</span><h2>What to study next</h2><h3>${esc(material.title)}</h3><p>${focus?`${esc(focus.topic)} has ${percent(focus.accuracy)} accuracy across ${focus.attempted} attempts. Start with this ${esc(material.kind.toLowerCase())}, then practise its subject.`:'Continue your next unfinished foundation lesson. Complete a mock for recommendations based on your results.'}</p><p>${esc(material.source)}</p><p>${tracked.filter(item=>completed.has(item.progress)).length} of ${tracked.length} tracked course lessons / source chapters completed on this browser.</p></div><div class="next-actions"><a class="button primary" href="${esc(material.url)}">Read study material &rarr;</a><a class="button" href="${esc(StudyData.practiceUrl(material.subject))}">Practice ${esc(labels[material.subject]||material.subject)}</a><a class="button" href="/planner.html?material=${encodeURIComponent(material.id)}">Schedule this topic</a></div>`;
    document.querySelector('.footer span:last-child').textContent=`Updated ${new Date().toLocaleString('en-IN')}`;
  }
  async function refresh(){
    const token=++request;$('view-status').textContent='Loading your saved results…';
    const button=$('filters').querySelector('button');button.disabled=true;
    try{
      const params=new URLSearchParams({subject:$('exam').value,days:$('period').value==='all'?'0':$('period').value});
      const response=await fetch('/api/quiz/performance?'+params);
      if(!response.ok)throw Error(response.status===401?'Sign in to see your saved performance.':'Could not load performance. Try Apply again.');
      const data=await response.json();if(token!==request)return;render(data);
    }catch(error){if(token===request){$('view-status').textContent=error.message;document.querySelectorAll('.metric-value').forEach(node=>node.textContent='Unavailable');document.querySelector('.chart-grid').innerHTML=empty('Results could not load. Your saved attempts have not been changed.');}}
    finally{if(token===request)button.disabled=false;}
  }
  async function init(){
    // Remove the prototype dialog: every action now opens real study/practice material.
    $('practice-dialog')?.remove();
    $('exam').previousSibling.textContent='Subject';
    $('exam').innerHTML='<option value="all">All subjects</option>'+Object.entries(labels).filter(([id])=>['history','geography','polity','economy','science','environment','ethics','current','survey','general'].includes(id)).map(([id,label])=>`<option value="${id}">${label}</option>`).join('');
    document.querySelectorAll('.metric-value').forEach(node=>node.textContent='Loading…');
    document.querySelector('.chart-grid').innerHTML=empty('Loading account results…');document.querySelector('.next-card').innerHTML=empty('Loading your study catalog…');
    try{catalog=await StudyData.load();$('filters').onsubmit=event=>{event.preventDefault();refresh();};await refresh();}
    catch(error){$('view-status').textContent=error.message;document.querySelectorAll('.metric-value').forEach(node=>node.textContent='Unavailable');document.querySelector('.chart-grid').innerHTML='<p><a class="button" href="/">Sign in</a></p>';document.querySelector('.next-card').innerHTML=empty('Your account is needed for study recommendations.');}
  }
  init();return {refresh};
})();
