import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const data=JSON.parse(await readFile('public/data/environment-reading.json','utf8'));
assert.equal(data.sourcePageCount,25);
assert.equal(data.chapters.length,9);
assert.equal(data.chapters.flatMap(c=>c.topics).length,28);
assert.deepEqual(data.audit.map(p=>p.page),Array.from({length:15},(_,i)=>i+9));
assert.match(data.notice,/selected pages/);
assert.equal(data.printedPages[9],11);assert.equal(data.printedPages[23],234);
const owned=new Map();const claim=ids=>ids.forEach(id=>owned.set(id,(owned.get(id)||0)+1));
let figures=0,photos=0,tables=0,questions=0;
for(const c of data.chapters){
 assert.ok(c.guide);
 for(const t of c.topics){
  assert.ok(t.pages.length&&t.elements.length,t.title);claim(t.lineIds);
  for(const e of t.elements){
   if(e.type==='comparison'){
    tables++;e.headers.forEach(h=>claim(h.lineIds));
    for(const row of e.rows){
     assert.equal(row.length,e.headers.length);
     for(const cell of row){claim(cell.lineIds);for(const f of cell.figures||[]){photos++;await access('public'+f.image);assert.ok(f.caption&&f.width&&f.height);}}
    }
   }else claim(e.lineIds||[]);
   if(e.type==='figure'){figures++;await access('public'+e.image);assert.ok(e.caption&&e.width&&e.height);}
  }
 }
 for(const b of c.practice){
  claim(b.lineIds);
  assert.match(b.answerKey,/1\. \(b\)/);
  for(const q of b.questions){questions++;claim(q.lineIds);assert.deepEqual(q.options.map(o=>o.label),['a','b','c','d']);assert.match(q.answer,/^[a-d]$/);assert.ok(q.prompt.length>30);}
 }
}
assert.equal(figures,15);assert.equal(photos,11);assert.equal(tables,8);assert.equal(questions,5);
assert.ok([...owned.values()].every(n=>n===1),'Duplicated source lines');
assert.equal(owned.size,data.audit.reduce((n,p)=>n+p.sourceLines,0));
for(const p of data.audit)assert.equal(p.sourceLines,p.representedLines);
const byTitle=title=>data.chapters.flatMap(c=>c.topics).find(t=>t.title===title);
const carbon=JSON.stringify(byTitle('Carbon Cycle'));
assert.match(carbon,/forest fires, volcanic eruptions/);
assert.ok(!carbon.includes('Nitrification:'));
assert.match(JSON.stringify(byTitle('Nitrogen Cycle')),/Nitrification:/);
assert.ok(!JSON.stringify(byTitle('Boreal or North Coniferous Forests')).includes('6-month long winter'));
const comparisons=data.chapters.flatMap(c=>c.topics.flatMap(t=>t.elements.filter(e=>e.type==='comparison')));
const bihar=comparisons.filter(e=>e.page===11).flatMap(e=>e.rows).find(r=>r[0].parts.some(p=>p.text==='Bihar'));
assert.equal(bihar[1].parts[0].text,'7.38%');
const anthrax=comparisons.find(e=>e.headers[0].text==='Disease').rows[0];
assert.equal(anthrax[0].parts[0].text,'Anthrax');assert.match(anthrax[1].parts[0].text,/Bacillus anthracis/);
const movements=comparisons.find(e=>e.headers[0].text==='Movement');assert.equal(movements.rows.length,7);
const chipko=movements.rows.find(r=>r[0].parts[0].text==='Chipko Movement');assert.match(JSON.stringify(chipko[1]),/1973/);
const convention=comparisons.find(e=>e.headers[0].text==='Convention/Protocols/Commission');assert.match(JSON.stringify(convention.rows[0][1]),/Rio de Janeiro, 1992/);
const animal=byTitle('Animal kingdom').elements[0];assert.ok(animal.width>animal.height,'Sideways source diagram must be rotated for reading');
const nodes=new Map(),completed=new Set(),records=[];
const root={innerHTML:'',querySelector(s){if(!nodes.has(s))nodes.set(s,{focus(){},setSelectionRange(){},textContent:''});return nodes.get(s);}};
let fetches=0;
const ctx=vm.createContext({fetch:async url=>{fetches++;assert.match(url,/^\/data\/environment-reading.json\?v=/);return {ok:true,json:async()=>data};},StudyProgress:{isComplete:id=>completed.has(id),record(id,v){records.push([id,v]);if(v)completed.add(id);else completed.delete(id);}}});
vm.runInContext(await readFile('public/ir-reader.js','utf8'),ctx);
const reader=vm.runInContext('IRReader',ctx);await reader.mount(root,'environment');
const click=dataset=>root.onclick({target:{closest:()=>({dataset})}});
assert.match(root.innerHTML,/ENVIRONMENT &amp; ECOLOGY STUDY MATERIAL/);
assert.match(root.innerHTML,/supplied web preview/i);assert.match(root.innerHTML,/selected pages/);
assert.match(root.innerHTML,/\/home#environment-day-1/);
assert.match(root.innerHTML,/book.pdf#page=9[^>]*>11<\/a>/);
for(const c of data.chapters){click({irChapter:String(c.id)});for(const t of c.topics){click({irTopic:t.id});assert.ok(root.innerHTML.includes(`data-ir-topic="${t.id}" aria-current="true"`));assert.ok(!/(?:>undefined<|="undefined")/.test(root.innerHTML));}}
click({irChapter:'7'});click({irTopic:byTitle('Indian species: distribution and IUCN status').id});
assert.match(root.innerHTML,/Kondana Rat/);assert.match(root.innerHTML,/page-017-figure-1.png/);
click({irMode:'practice'});assert.match(root.innerHTML,/Dugong/);assert.match(root.innerHTML,/Reveal the book/);assert.match(root.innerHTML,/Option C/);
root.oninput({target:{matches:()=>true,value:'Bacillus anthracis',selectionStart:17}});
assert.match(root.innerHTML,/Wildlife Diseases/);assert.ok(!root.innerHTML.includes('0 matching topics'));
click({irResultChapter:'7',irResultTopic:byTitle('Wildlife Diseases').id});assert.match(root.innerHTML,/Bacillus anthracis/);
click({irChapter:'9'});assert.match(root.innerHTML,/#page=23[^>]*>234<\/a>/);
root.onchange({target:{matches:()=>true,checked:true}});assert.deepEqual(records.at(-1),['chapter:environment:9',true]);
await reader.mount(root,'environment');assert.equal(fetches,1);
const storage=new Map(),host={innerHTML:''};
const pc=vm.createContext({document:{getElementById:id=>id==='profile-consistency'?host:null,addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
vm.runInContext(await readFile('public/study-progress.js','utf8'),pc);const p=vm.runInContext('StudyProgress',pc);
p.setAccount({id:'env-test'});p.record('chapter:environment:9');p.record('lesson:environment:1');p.setAccount({id:'other'});assert.equal(p.snapshot().lessons,0);p.setAccount({id:'env-test'});
assert.ok(p.isComplete('chapter:environment:9'));assert.equal(p.snapshot().subjects.find(s=>s.id==='environment-book').count,1);assert.equal(p.snapshot().subjects.find(s=>s.id==='environment').count,1);assert.match(host.innerHTML,/1 \/ 9/);assert.match(host.innerHTML,/1 \/ 60/);
const home=await readFile('public/home.js','utf8');assert.match(home,/IRReader.mount\(document.getElementById\('environment-source-material'\), 'environment'\)/);assert.match(home,/environment-day-/);
console.log('PASS: Environment has 9 chapter groups, 28 topics, 15 content pages, 8 comparisons, 15 diagrams, 11 paired species photos and 5 complete practice questions. Reading order, text coverage, table pairings, search, original page labels, course access and isolated persisted progress pass.');
