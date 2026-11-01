import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=(file:string)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('question timer records time by question and excludes hidden tabs',()=>{
  let now=0;const events:Record<string,()=>void>={};
  const document={hidden:false,addEventListener:(event:string,fn:()=>void)=>{events[event]=fn;}};
  const context=vm.createContext({document,performance:{now:()=>now}});
  vm.runInContext(read('public/question-timing.js')+';globalThis.timer=QuestionTiming;',context);
  const timer=context.timer;
  timer.select('a');now=1000;timer.select('b');now=3000;document.hidden=true;events.visibilitychange();
  now=9000;document.hidden=false;events.visibilitychange();now=10000;timer.stop();
  assert.equal(timer.snapshot().a,1000);assert.equal(timer.snapshot().b,3000);
  timer.reset();assert.equal(Object.keys(timer.snapshot()).length,0);
});
test('catalog has unique IDs, source-backed titles, and usable lesson routes',()=>{
  const catalog=JSON.parse(read('public/data/study-catalog.json')).items;
  assert(catalog.length>3000);assert.equal(new Set(catalog.map((item:any)=>item.id)).size,catalog.length);
  assert(catalog.every((item:any)=>item.title&&item.source&&(/^\/[^/]/.test(item.url)||/^https:\/\//.test(item.url))));
  for(const subject of ['history','geography','polity','economy','science','environment','ethics']){
    assert.equal(catalog.filter((item:any)=>item.subject===subject&&item.kind==='Lesson').length,60);
  }
});
test('catalog recommendations skip completed lessons and escape user-visible strings',()=>{
  const context=vm.createContext({});vm.runInContext(read('public/study-data.js')+';globalThis.data=StudyData;',context);
  const items=[{id:'one',subject:'history',title:'Sources',kind:'Lesson',progress:'lesson:history:1'},{id:'two',subject:'history',title:'Cities',kind:'Lesson',progress:'lesson:history:2'}];
  assert.equal(context.data.recommendation(items,'history','',new Set(['lesson:history:1'])).id,'two');
  assert.equal(context.data.esc('<script>'),'&lt;script&gt;');
  assert.equal(context.data.practiceUrl('polity'),'/test?stage=prelims&testId=subject-polity-1');
});
test('planner reschedules real material IDs, detects overlaps, and shares account checklist keys',()=>{
  const html=read('public/planner.html');const source=html.split('<script>')[1].split('</script>')[0];
  const elements=new Map<string,any>();const get=(id:string)=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',addEventListener(){},setAttribute(){},reset(){},showModal(){},close(){},reportValidity(){return true;}});return elements.get(id);};
  const storage=new Map();const context=vm.createContext({document:{getElementById:get,querySelectorAll:()=>[]},window:{addEventListener(){}},localStorage:{getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value)},Date,StudyData:{labels:{},completed:()=>new Set(),esc:(value:unknown)=>String(value)},URLSearchParams,crypto:{randomUUID:()=> 'new-id'}});
  vm.runInContext(source.slice(0,source.lastIndexOf('(async()=>')),context);
  vm.runInContext(`
    account='account-7'; ready=true; render=()=>{};
    state.blocks=[{id:'one',title:'Sources',task:null,type:'study',date:'2026-10-28',time:'09:00',minutes:60,materialId:'lesson:history:1'}];
    globalThis.overlap=conflict({date:'2026-10-28',time:'09:30',minutes:30});
    globalThis.adjacent=conflict({date:'2026-10-28',time:'10:00',minutes:30});
    moveBlock('one','2026-10-29');
    writeCheck(today(),2,true);
    globalThis.result={date:state.blocks[0].date,material:state.blocks[0].materialId,key:checkKey(today()),checks:readChecks(today())};
  `,context);
  assert.equal(context.overlap,true);assert.equal(context.adjacent,false);
  assert.equal(context.result.date,'2026-10-29');assert.equal(context.result.material,'lesson:history:1');
  assert(context.result.key.startsWith('crack-ias-today-account-7-'));assert.equal(context.result.checks[0],2);
});

test('Analytics renders real metrics and source-backed recommendations',()=>{
  const values=Array.from({length:3},()=>({textContent:''})),notes=Array.from({length:3},()=>({textContent:''}));
  const nodes:Record<string,any>={'view-status':{},'.chart-grid':{},'.next-card':{},'.footer span:last-child':{}};
  const document={getElementById:(id:string)=>nodes[id],querySelector:(selector:string)=>nodes[selector],querySelectorAll:(selector:string)=>selector==='.metric-value'?values:notes};
  const context=vm.createContext({document,Date,URLSearchParams,Set});
  vm.runInContext(read('public/study-data.js'),context);
  const source=read('public/performance.js').replace('init();return {refresh};','return {render,setCatalog:value=>catalog=value};');
  vm.runInContext(source+';globalThis.screen=PerformanceScreen;',context);
  context.screen.setCatalog({accountId:'7',items:[{id:'lesson:polity:1',subject:'polity',title:'Constitutional ideas',kind:'Lesson',source:'NCERT Political Theory',progress:'lesson:polity:1',url:'/home#polity-day-1'}]});
  context.screen.render({accuracy:50,correct:1,attempted:2,mocks:[{title:'mock-1',date:'2026-10-28',score:20,maxScore:200}],averageTimeMs:20000,timedQuestions:1,totalAttempts:1,scope:'Recorded results',subjects:[{subject:'polity',accuracy:50,correct:1,attempted:2,skipped:0}],weakTopics:[{subject:'polity',topic:'Polity',accuracy:50,attempted:2,skipped:0}],timings:[]});
  assert.equal(values[0].textContent,'50%');assert.equal(values[1].textContent,'20.0 / 200');assert.equal(values[2].textContent,'00:20');
  assert(nodes['.chart-grid'].innerHTML.includes('subject-polity-1'));
  assert(nodes['.next-card'].innerHTML.includes('Constitutional ideas'));
  assert(nodes['.next-card'].innerHTML.includes('/home#polity-day-1'));
  assert(!nodes['.next-card'].innerHTML.includes('[Recommended topic]'));
});
