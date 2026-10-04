import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const storage=new Map(),handlers={},nodes=new Map();
let blocked=false;
class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-04T12:00:00Z']));}}
const location={hash:'#preparation'};
const root={dataset:{},innerHTML:'',addEventListener(type,handler){handlers[type]=handler;},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:''});return nodes.get(selector);}};
const context=vm.createContext({Date:FixedDate,window:{location},history:{replaceState(_,__,hash){location.hash=hash;}},localStorage:{getItem:key=>storage.get(key)||null,setItem(key,value){if(blocked)throw new Error('Storage disabled');storage.set(key,value);}},FormData:class {constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}}});
vm.runInContext(readFileSync('public/preparation.js','utf8')+'\nglobalThis.desk=PrepDesk;',context);
const desk=context.desk;
desk.setAccount({id:1});
for(const budget of [90,180,360]){const blocks=desk.plan(budget);assert.equal(blocks.reduce((a,b)=>a+b,0),budget);assert(blocks.every(n=>n>=5));}
assert(desk.addRevision({id:'lesson',title:'A lesson',url:'/home#day-1'}));
assert(!desk.addRevision({id:'lesson',title:'A lesson'}));
desk.recall('lesson',true);assert.equal(desk.snapshot().revision[0].due,'2026-10-05');
desk.recall('lesson',true);assert.equal(desk.snapshot().revision[0].due,'2026-10-07');
desk.recall('lesson',false);assert.equal(desk.snapshot().revision[0].round,0);
assert(desk.addRevision({id:'unsafe',title:'<script>bad()</script>',url:'javascript:bad()'}));assert.equal(desk.snapshot().revision[1].url,'');
const review={id:12,stage:'prelims',subject:'polity',results:[{id:'a',prompt:'Correct',ok:true},{id:'b',prompt:'Incorrect question',chosen:0,ok:false,options:['Wrong','Right'],correctIndex:1},{id:'c',prompt:'Skipped question',chosen:-1,ok:false,options:['Right','Wrong'],correctIndex:0}]};
assert.equal(desk.importReview(review),2);assert.equal(desk.importReview(review),0);assert.equal(desk.importReview({...review,id:13,stage:'mains'}),0);assert.equal(desk.snapshot().mistakes[0].answer,'Right');
const course=JSON.parse(readFileSync('public/data/study-course-polity.json','utf8'));
context.fetch=async()=>({ok:true,json:async()=>course});context.location=location;location.hash='#polity-day-1';
vm.runInContext(readFileSync('public/history-plan.js','utf8')+'\nglobalThis.course=HistoryPlan;',context);
await context.course.mount(root,'polity');
root.onclick({target:{closest:selector=>selector==='button'?{dataset:{saveLesson:'1'}}:null}});
assert(desk.snapshot().revision.some(entry=>entry.id==='lesson:polity:1'&&entry.url==='/home#polity-day-1'));
location.hash='#preparation';
desk.setAccount({id:2});assert.equal(desk.snapshot().revision.length,0);
desk.setAccount({id:1});assert.equal(desk.snapshot().revision.length,3);
desk.mount(root);assert.equal((root.innerHTML.match(/<article class="prep-card">/g)||[]).length,12);
const click=data=>handlers.click({target:{closest:()=>({dataset:data})}});
for(const tool of ['plan','revision','mistakes','writing','csat','path','overview']){click({prepTool:tool});assert.equal(location.hash,'#preparation/'+tool);assert(root.innerHTML.length>1000);assert(!root.innerHTML.includes('<script>bad()'));
}
click({prepTool:'mistakes'});click({reviewMistake:'0'});assert.equal(desk.snapshot().mistakes[0].reviewed,false);
handlers.input({target:{dataset:{mistakeCorrection:'0'},value:'Read the qualifier before eliminating options.'}});click({reviewMistake:'0'});assert.equal(desk.snapshot().mistakes[0].reviewed,true);assert.equal(desk.snapshot().revision.length,4);
desk.setPrompt('Original question',150);click({prepTool:'writing'});
handlers.input({target:{id:'prep-draft',dataset:{},value:'A clear answer with evidence.'}});assert.match(root.querySelector('#prep-word-count').textContent,/5 \/ 150/);
desk.setPrompt('Essay prompt',1000);assert.equal(desk.snapshot().draft,'');desk.setPrompt('Original question');assert.equal(desk.snapshot().draft,'A clear answer with evidence.');
click({prepTool:'csat'});handlers.submit({preventDefault(){},target:{id:'prep-csat-form',values:{percent:'1',work:'2',ratio:'0',average:'3',logic:'2',reading:'1'}}});assert.match(root.querySelector('#prep-csat-result').innerHTML,/6 of 6 correct/);assert.match(root.querySelector('#prep-csat-result').innerHTML,/1\/6/);
blocked=true;desk.addRevision({id:'last',title:'Retained in memory'});click({prepTool:'revision'});assert.match(root.innerHTML,/Browser storage is unavailable/);assert(desk.snapshot().revision.some(entry=>entry.id==='last'));
const home=readFileSync('public/home.html','utf8');assert(home.indexOf('/preparation.js')<home.indexOf('/history-plan.js'));assert(home.includes('id="preparation-desk"'));
const source=readFileSync('public/home.js','utf8');const routing=source.slice(source.indexOf('function tabFromHash()'),source.indexOf("window.addEventListener('hashchange'"));
const routeContext=vm.createContext({window:{location},studyData:{subjects:[{id:'history'},{id:'geography'}]}});vm.runInContext(routing,routeContext);
for(const [hash,expected] of [['#preparation/revision','preparation'],['#day-5','history'],['#geography-day-12','geography'],['#current/2026-10/item','current'],['#pyq','pyq']]){location.hash=hash;assert.equal(routeContext.tabFromHash(),expected);}
console.log('PASS: 12 gap actions, time budgets, account isolation, persistent recall scheduling, duplicate-safe mistake import, correction workflow, separate writing drafts, CSAT feedback, storage failure and section routes.');
