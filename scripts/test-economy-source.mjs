import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const data=JSON.parse(await readFile('public/data/economy-reading.json','utf8'));
assert.equal(data.sourcePageCount,216);
assert.equal(data.chapters.length,12);
assert.equal(data.numberedTopicCount,155);
assert.deepEqual(data.audit.map(p=>p.page),Array.from({length:208},(_,i)=>i+8));
assert.deepEqual(data.ocrPages,Array.from({length:10},(_,i)=>i+31));
assert.ok(data.preface.length>0);
const expected=[50,3,7,17,8,16,5,7,14,24,1,3];
const ownership=new Map();
const claim=ids=>ids.forEach(id=>ownership.set(id,(ownership.get(id)||0)+1));
let figures=0,comparisons=0;
for(const [ci,c] of data.chapters.entries()){
 const numbered=c.topics.filter(t=>!t.id.endsWith('overview'));
 assert.equal(numbered.length,expected[ci]);
 assert.deepEqual(numbered.map(t=>Number(t.number.split('.')[1])),Array.from({length:expected[ci]},(_,i)=>i+1));
 claim(c.navigationLineIds);
 for(const t of c.topics){
  claim(t.lineIds);assert.ok(t.elements.length>0,t.id);
  assert.ok(!/[,\-:]$/.test(t.title),`Truncated topic heading: ${t.title}`);
  for(const e of t.elements){
   if(e.type==='comparison'){
    comparisons++;e.headers.forEach(h=>claim(h.lineIds));
    assert.ok(e.headers.length>=2);
    for(const row of e.rows){assert.equal(row.length,e.headers.length);row.forEach(cell=>claim(cell.lineIds));}
   }else claim(e.lineIds||[]);
   if(e.type==='figure'){figures++;await access('public'+e.image);assert.ok(e.width>0&&e.height>0);assert.ok(e.caption.length>20);}
   assert.ok(!JSON.stringify(e).includes('https://upscpdf.com'));
   if(e.type==='body')for(const p of e.parts)assert.ok(p.text.trim());
  }
 }
}
assert.ok(comparisons>30);assert.equal(figures,63);
for(const p of data.audit)assert.equal(p.sourceLines,p.representedLines,`Dropped text on page ${p.page}`);
assert.equal(ownership.size,data.audit.reduce((n,p)=>n+p.sourceLines,0));
assert.ok([...ownership.values()].every(n=>n===1),'Duplicated source text');
const topics=data.chapters.flatMap(c=>c.topics);
assert.match(topics.find(t=>t.id==='economy-1-3').title,/Challenges And Way Forward/);
assert.match(topics.find(t=>t.id==='economy-1-6').title,/Subsidy Regime/);
assert.match(topics.find(t=>t.id==='economy-1-30').title,/Agriculture Storage/);
assert.ok(topics.find(t=>t.id==='economy-1-21').ocrPages.includes(32));
const currency=topics.find(t=>t.id==='economy-5-4').elements.filter(e=>e.type==='comparison');
assert.ok(currency.some(e=>JSON.stringify(e).includes('Cryptocurrency')));
assert.ok(topics.find(t=>t.id==='economy-12-3').elements.some(e=>JSON.stringify(e).includes('Indicative')));
const nodes=new Map(),completed=new Set(),records=[];
const root={innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{focus(){},setSelectionRange(){},textContent:''});return nodes.get(selector);}};
let fetches=0;
const ctx=vm.createContext({fetch:async url=>{fetches++;assert.match(url,/^\/data\/economy-reading\.json\?v=/);return {ok:true,json:async()=>data};},StudyProgress:{isComplete:id=>completed.has(id),record(id,value){records.push([id,value]);if(value)completed.add(id);else completed.delete(id);}}});
vm.runInContext(await readFile('public/ir-reader.js','utf8'),ctx);
const reader=vm.runInContext('IRReader',ctx);
await reader.mount(root,'economy');
const click=dataset=>root.onclick({target:{closest:()=>({dataset})}});
assert.match(root.innerHTML,/ECONOMICS STUDY MATERIAL/);
assert.match(root.innerHTML,/Rau’s IAS Mains Compass of Economy/);
assert.match(root.innerHTML,/Publisher’s preface/);
assert.match(root.innerHTML,/\/home#economy-day-1/);
assert.ok(!root.innerHTML.includes('Prelims Smasher'));
click({irTopic:'economy-1-21'});
assert.match(root.innerHTML,/National Agricultural Market/);
assert.match(root.innerHTML,/Includes text recovered from scanned pages/);
assert.match(root.innerHTML,/\/economy-source\/book.pdf#page=32/);
click({irMode:'practice'});
assert.match(root.innerHTML,/These are not UPSC past questions/);
assert.match(root.innerHTML,/Self-check outline/);
click({irChapter:'12'});click({irTopic:'economy-12-3'});
root.onchange({target:{matches:()=>true,checked:true}});
assert.deepEqual(records.at(-1),['chapter:economy:12',true]);
click({irChapter:'1'});click({irChapter:'12'});
assert.match(root.innerHTML,/data-ir-chapter-complete checked/);
root.oninput({target:{matches:()=>true,value:'NABFID',selectionStart:6}});
assert.match(root.innerHTML,/matching topics/);
click({irResultChapter:'5',irResultTopic:'economy-5-2'});
assert.match(root.innerHTML,/Development Bank In India/);
for(const c of data.chapters){click({irChapter:String(c.id)});for(const t of c.topics){click({irTopic:t.id});assert.ok(root.innerHTML.includes(`data-ir-topic="${t.id}" aria-current="true"`),`Topic did not open: ${t.id}`);assert.ok(!/(?:>undefined<|="undefined")/.test(root.innerHTML));}}
await reader.mount(root,'economy');assert.equal(fetches,1);
const home=await readFile('public/home.js','utf8');
assert.match(home,/IRReader.mount\(document.getElementById\('economy-source-material'\), 'economy'\)/);
assert.match(home,/economy-day-/);
console.log(`PASS: Economics has 12 chapters, 155 numbered topics, 208 audited content pages including 10 OCR pages, ${comparisons} comparisons and ${figures} diagrams. Text coverage, complete headings, topic navigation, search, original exercises, source links and book progress pass.`);
