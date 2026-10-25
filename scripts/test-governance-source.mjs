import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const data=JSON.parse(await readFile('public/data/governance-reading.json','utf8'));
assert.equal(data.sourcePageCount,92);
assert.equal(data.chapters.length,5);
assert.equal(data.audit.length,78);
const owned=new Map();
const claim=ids=>ids.forEach(id=>owned.set(id,(owned.get(id)||0)+1));
let figures=0,questions=0;
for(const c of data.chapters){
 assert.ok(c.guide);
 for(const t of c.topics){
  assert.ok(t.pages.length);claim(t.lineIds);
  for(const e of t.elements){
   claim(e.lineIds);
   if(e.type==='figure'){figures++;await access('public'+e.image);assert.ok(e.width>0&&e.height>0&&e.caption);}
  }
 }
 assert.equal(c.practice.length,1);
 for(const b of c.practice){
  claim(b.lineIds);
  for(const q of b.questions){
   questions++;claim(q.lineIds);
   assert.ok(q.mains);assert.match(q.prompt,/\(20\d{2}, [\d.]+ marks\)/);
   assert.equal(q.answer,null);assert.deepEqual(q.options,[]);
  }
 }
}
assert.equal(figures,103);assert.equal(questions,51);
assert.ok([...owned.values()].every(n=>n===1));
assert.equal(owned.size,data.audit.reduce((s,p)=>s+p.sourceLines,0));
for(const p of data.audit)assert.equal(p.sourceLines,p.representedLines);
await access('public/governance-source/book.pdf');
await access('public/governance-source/preparation-guide.pdf');
const nodes=new Map(),completed=new Set(),records=[];
const root={innerHTML:'',querySelector(s){if(!nodes.has(s))nodes.set(s,{focus(){},setSelectionRange(){},textContent:''});return nodes.get(s);}};
let fetches=0;
const ctx=vm.createContext({fetch:async url=>{fetches++;assert.match(url,/^\/data\/governance-reading.json\?v=/);return {ok:true,json:async()=>data};},StudyProgress:{isComplete:id=>completed.has(id),record(id,v){records.push([id,v]);if(v)completed.add(id);else completed.delete(id);}}});
vm.runInContext(await readFile('public/ir-reader.js','utf8'),ctx);
const reader=vm.runInContext('IRReader',ctx);
await reader.mount(root,'governance');
const click=dataset=>root.onclick({target:{closest:()=>({dataset})}});
assert.match(root.innerHTML,/GOVERNANCE STUDY MATERIAL/);
assert.match(root.innerHTML,/preparation-guide.pdf/);
assert.match(root.innerHTML,/Vision IAS/);
click({irMode:'practice'});
assert.match(root.innerHTML,/MAINS PYQ 15/);
assert.ok(!root.innerHTML.includes('ir-options'));
assert.ok(!root.innerHTML.includes('Reveal the book'));
for(const c of data.chapters){
 click({irChapter:String(c.id)});
 for(const t of c.topics){
  click({irTopic:t.id});assert.ok(root.innerHTML.includes(`data-ir-topic="${t.id}" aria-current="true"`));
  assert.ok(!/(?:>undefined<|="undefined")/.test(root.innerHTML));
  click({irMode:'practice'});assert.match(root.innerHTML,/MAINS PYQ/);
 }
}
root.onchange({target:{matches:()=>true,checked:true}});
assert.deepEqual(records.at(-1),['lesson:governance:5',true]);
click({irChapter:'1'});click({irChapter:'5'});assert.match(root.innerHTML,/data-ir-chapter-complete checked/);
root.oninput({target:{matches:()=>true,value:'Sevottam',selectionStart:8}});
assert.match(root.innerHTML,/Sevottam Model/);
assert.ok(!root.innerHTML.includes('0 matching topics'));
await reader.mount(root,'governance');assert.equal(fetches,1);
// Saved governance completions survive a reload and account switching.
const storage=new Map(),host={innerHTML:''};
const progressContext=vm.createContext({document:{getElementById:id=>id==='profile-consistency'?host:null,addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
vm.runInContext(await readFile('public/study-progress.js','utf8'),progressContext);
const p=vm.runInContext('StudyProgress',progressContext);
p.setAccount({id:'governance-test'});p.record('lesson:governance:5');
p.setAccount({id:'other'});assert.equal(p.snapshot().lessons,0);
p.setAccount({id:'governance-test'});assert.ok(p.isComplete('lesson:governance:5'));
assert.equal(p.snapshot().subjects.find(s=>s.id==='governance').count,1);
assert.match(host.innerHTML,/1 \/ 5/);
const subjects=JSON.parse(await readFile('public/data/subjects.json','utf8'));
assert.equal(subjects.subjects.filter(s=>s.id==='governance').length,1);
assert.match(await readFile('public/home.js','utf8'),/IRReader.mount\(document.getElementById\('governance-source-material'\), 'governance'\)/);
console.log(`PASS: Governance has 5 chapters, ${data.chapters.flatMap(c=>c.topics).length} topics, 51 Mains PYQs, 103 diagrams and 78 audited content pages. Navigation, search, source links and persisted profile progress pass.`);
