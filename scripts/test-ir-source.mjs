import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const data=JSON.parse(await readFile('public/data/ir-reading.json','utf8'));
assert.equal(data.version,2);
assert.equal(data.sourcePageCount,80);
assert.equal(data.chapters.length,7);
assert.equal(data.chapters.flatMap(c=>c.topics).length,45);
assert.deepEqual(data.audit.map(p=>p.page),Array.from({length:78},(_,i)=>i+3));
for(const p of data.audit)assert.equal(p.sourceLines,p.representedLines,`Text coverage failed on PDF page ${p.page}`);
const ownership=new Map();
const claim=ids=>ids.forEach(id=>ownership.set(id,(ownership.get(id)||0)+1));
let figures=0,comparisons=0,entries=0,questions=0;
for(const c of data.chapters){
 claim(c.navigationLineIds||[]);
 for(const t of c.topics){
  claim(t.lineIds);
  assert.ok(t.elements.length>0,`Empty topic ${t.number}`);
  for(const e of t.elements){
   if(e.type==='comparison'){
    comparisons++;e.headers.forEach(h=>claim(h.lineIds));
    for(const row of e.rows){assert.equal(row.length,e.headers.length);row.forEach(cell=>claim(cell.lineIds));}
   }else claim(e.lineIds||[]);
   if(e.type==='entry'){entries++;assert.ok(e.labelParts.length&&e.parts.length);}
   if(e.type==='figure'){figures++;await access('public'+e.image);assert.ok(!e.caption.includes('source map or visual reference'));}
   if(e.type==='heading')assert.ok(e.text.length<140,'A body sentence was promoted to a heading');
   assert.ok(!JSON.stringify(e).includes('Only For Premium Members'));
  }
 }
 for(const batch of c.practice){
  claim(batch.lineIds);
  for(const q of batch.questions){
   questions++;claim(q.lineIds);assert.ok(q.prompt.length>15);
   assert.deepEqual(q.options.map(o=>o.label),['a','b','c','d']);
   assert.match(q.answer,/^[a-d]$/);
   assert.ok(batch.answerKey.includes(`(${q.answer})`));
  }
 }
}
assert.equal(questions,78);assert.equal(figures,103);assert.ok(comparisons>=28);assert.ok(entries>30);
assert.equal(ownership.size,data.audit.reduce((sum,p)=>sum+p.sourceLines,0));
assert.ok([...ownership.values()].every(n=>n===1),'Duplicated source text');
const eu=data.chapters[1].topics.find(t=>t.number==='2.4').elements.filter(e=>e.type==='entry');
const commission=eu.find(e=>e.labelParts[0].text==='European Commission');
assert.match(JSON.stringify(commission.parts),/Proposes EU legislation/);
assert.ok(!JSON.stringify(commission.parts).includes('Central bank of the Eurozone'));
const ecb=eu.find(e=>e.labelParts[0].text.startsWith('European Central Bank'));
assert.match(JSON.stringify(ecb.parts),/Central bank of the Eurozone/);
const partners=data.chapters[5].topics.find(t=>t.number==='6.8').elements.find(e=>e.type==='comparison');
assert.deepEqual(partners.rows.map(r=>r[0].parts[0].text),['1','2','3','4','5']);
const completed=new Set(),records=[];
const nodes=new Map();
const root={innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{focus(){},setSelectionRange(){},textContent:''});return nodes.get(selector);}};
let fetches=0;
const context=vm.createContext({fetch:async url=>{fetches++;assert.equal(url,'/data/ir-reading.json?v=2');return {ok:true,json:async()=>data};},StudyProgress:{isComplete:id=>completed.has(id),record(id,value){records.push([id,value]);if(value)completed.add(id);else completed.delete(id);}}});
vm.runInContext(await readFile('public/ir-reader.js','utf8'),context);
const reader=vm.runInContext('IRReader',context);
await reader.mount(root);
const click=dataset=>root.onclick({target:{closest:()=>({dataset})}});
assert.match(root.innerHTML,/INTERNATIONAL RELATIONS STUDY MATERIAL/);
assert.match(root.innerHTML,/<li><strong>Guinea-Bissau:/);
assert.match(root.innerHTML,/Madagascar and its location/);
assert.ok(!root.innerHTML.includes('Statement-I: There is instability'),'Questions leaked into the default study view');
click({irMode:'practice'});
assert.match(root.innerHTML,/Statement-I: There is instability/);
assert.match(root.innerHTML,/<ol class="ir-options"/);
assert.match(root.innerHTML,/<details class="ir-answer">/);
click({irChapter:'2'});click({irTopic:'ir-2-4'});
assert.match(root.innerHTML,/<h5>European Commission<\/h5>/);
assert.match(root.innerHTML,/Proposes EU legislation/);
root.oninput({target:{matches:()=>true,value:'La Orchila',selectionStart:10}});
assert.match(root.innerHTML,/matching topics/);
click({irResultChapter:'1',irResultTopic:'ir-1-4'});
assert.match(root.innerHTML,/Venezuela/);
click({irChapter:'7'});click({irStep:'1'});
assert.match(root.innerHTML,/Domestic Defence Exercises/);
assert.match(root.innerHTML,/<thead>/);
assert.match(root.innerHTML,/data-label="Forces Involved"/);
root.onchange({target:{matches:()=>true,checked:true}});
assert.deepEqual(records.at(-1),['lesson:ir:7',true]);
click({irChapter:'1'});click({irChapter:'7'});
assert.match(root.innerHTML,/data-ir-chapter-complete checked/);
root.oninput({target:{matches:()=>true,value:'no-match-123xyz',selectionStart:15}});
assert.match(root.innerHTML,/No topics match/);
for(const c of data.chapters){click({irChapter:String(c.id)});for(const t of c.topics){click({irTopic:t.id});assert.ok(root.innerHTML.includes(t.title.replaceAll('&','&amp;')));assert.ok(!root.innerHTML.includes('undefined'));}}
await reader.mount(root);assert.equal(fetches,1,'Reader data should be cached');
const subjects=JSON.parse(await readFile('public/data/subjects.json','utf8'));
assert.equal(subjects.subjects.filter(s=>s.id==='ir').length,1);
assert.match(await readFile('public/home.js','utf8'),/IRReader.mount\(document.getElementById\('ir-source-material'\)\)/);
console.log(`PASS: IR has 45 structured topics, ${entries} paired entries, ${comparisons} comparisons, ${figures} captioned illustrations and ${questions} complete question cards. Coverage, ordering, answer keys, all-topic navigation, search and profile completion pass.`);
