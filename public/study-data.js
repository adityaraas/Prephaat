/* Shared real catalog and account-local completion data for Planner and Analytics. */
const StudyData = (() => {
  const labels = {history:'History',geography:'Geography',polity:'Polity',economy:'Economy',science:'Science',environment:'Environment',ethics:'Ethics',ir:'International relations',governance:'Governance',current:'Current affairs',editorials:'Editorials',survey:'Economic Survey',csat:'CSAT',essay:'Essay',general:'General studies',bihar:'Bihar',security:'Security',society:'Society'};
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cached;
  async function load() {
    if (!cached) cached = Promise.all([
      fetch('/data/study-catalog.json').then(r=>{if(!r.ok)throw Error('Study catalog unavailable');return r.json();}),
      fetch('/api/me').then(r=>{if(!r.ok)throw Error('Sign in to access your study data.');return r.json();}),
    ]).then(([catalog,session])=>{
      if(!session.account?.id)throw Error('Sign in to access your study data.');
      return {items:catalog.items,account:session.account,accountId:String(session.account.id).replace(/[^a-zA-Z0-9_-]/g,'')};
    }).catch(error=>{cached=null;throw error;});
    return cached;
  }
  async function currentIssues(data){
    try{const response=await fetch('/api/current-affairs/archive',{signal:AbortSignal.timeout(25000),cache:'no-store'});if(!response.ok)return data;const archive=await response.json();if(!Array.isArray(archive.months))return data;
      const known=new Set(data.items.map(item=>item.id));for(const issue of archive.months.flatMap(month=>month.items||[])){const id='news:'+issue.id;if(!known.has(id)){data.items.push({id,subject:'current',title:issue.title,url:`/home#current/${issue.published.slice(0,7)}/${issue.id}`,source:issue.source,kind:'Current affairs',progress:null});known.add(id);}}return data;
    }catch{return data;}
  }
  function completed(accountId) {
    try {const days=JSON.parse(localStorage.getItem(`bpsc-consistency-${accountId}-v1`)||'{}');return new Set(Object.values(days).filter(Array.isArray).flat().filter(value=>typeof value==='string'));} catch{return new Set();}
  }
  function recommendation(items, subject, topic='', completedIds=new Set()) {
    const words=String(topic).toLowerCase().match(/[a-z]{4,}/g)||[];
    const relevant=items.filter(item=>item.subject===subject&&!completedIds.has(item.progress));
    return relevant.map((item,index)=>({item,score:words.filter(word=>item.title.toLowerCase().includes(word)).length*10+(item.kind==='Lesson'?3:item.kind==='Chapter'?2:0),index})).sort((a,b)=>b.score-a.score||a.index-b.index)[0]?.item || items.find(item=>item.subject===subject) || items.find(item=>item.kind==='Lesson');
  }
  function practiceUrl(subject) {
    if(['history','geography','polity','economy','science','environment'].includes(subject))return `/test?stage=prelims&testId=subject-${subject}-1`;
    if(['current','ethics','survey'].includes(subject))return `/home?practice=${subject}#quiz`;
    if(subject==='ir'||subject==='governance')return '/test?stage=prelims&testId=subject-polity-1';
    return '/home#quiz';
  }
  return {load,currentIssues,completed,recommendation,practiceUrl,labels,esc};
})();
