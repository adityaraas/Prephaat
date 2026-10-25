import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
const data=JSON.parse(await readFile('public/data/history-reading.json','utf8'));
assert.equal(data.chapters.length,29);
assert.equal(data.audit.length,133);
assert.deepEqual(data.audit.map(a=>a.page),Array.from({length:133},(_,i)=>i+3));
for(const audit of data.audit)assert.equal(audit.sourceLines,audit.representedLines,'Dropped text on page '+audit.page);
let figures=0,tables=0;
for(const chapter of data.chapters)for(const page of chapter.pages)for(const item of page.elements){
 if(item.type==='figure'){figures++;await access('public'+item.image);assert.ok(!item.image.includes('-panel-'));}
 if(item.type==='table'){tables++;assert.ok(item.rows.some(r=>r.some(c=>c?.text)));}
 if(item.text)assert.ok(!/[\x00-\x08\x0b-\x1f]/.test(item.text));
}
assert.ok(figures>=15);assert.ok(tables>=200);
const elements=new Map();
const root={innerHTML:'',querySelector(s){if(!elements.has(s))elements.set(s,{focus(){},setSelectionRange(){},scrollIntoView(){}});return elements.get(s);}};
const ctx=vm.createContext({fetch:async()=>({ok:true,json:async()=>data})});
vm.runInContext(await readFile('public/history-source.js','utf8'),ctx);
const api=vm.runInContext('HistorySource',ctx);
await api.mount(root);
assert.match(root.innerHTML,/Ancient Indian history begins/);
assert.match(root.innerHTML,/<table>/);
assert.match(root.innerHTML,/Art and Culture/);
assert.ok(!root.innerHTML.includes('source-pdf-page'));
assert.ok(!root.innerHTML.includes('-panel-'));
const click=dataset=>root.onclick({target:{closest(selector){return selector==='button'?{dataset}:null;}}});
click({sourceChapter:'3'});
assert.match(root.innerHTML,/Harappa was excavated/);
assert.match(root.innerHTML,/page-010-figure-2.jpg/);
assert.match(root.innerHTML,/major Harappan sites/);
assert.match(root.innerHTML,/Salient Features of IVC/);
assert.match(root.innerHTML,/Great Bath at Mohenjo-daro/);
assert.match(root.innerHTML,/rowspan="[2-9][0-9]*"/);
assert.ok(!root.innerHTML.includes('/history-source/page-010.jpg'));
click({sourceSection:'culture'});
assert.match(root.innerHTML,/data-source-section="culture" aria-pressed="true"/);
click({sourceSection:'medieval'});
click({sourceChapter:'24'});
assert.match(root.innerHTML,/Mughal Empire/);
assert.match(root.innerHTML,/page-104-figure-1.jpg/);
root.oninput({target:{matches:()=>true,value:'no-match-123xyz',selectionStart:15}});
assert.match(root.innerHTML,/No chapters match/);
await api.mount(root);
for(const chapter of data.chapters){click({sourceChapter:String(chapter.id)});assert.ok(!root.innerHTML.includes('-panel-'));assert.ok(!root.innerHTML.includes('source-transcript'));}
await api.mountLesson(root,{day:3,topic:'Harappan cities'});
assert.match(root.innerHTML,/page-010-figure-2.jpg/);
assert.ok(!root.innerHTML.includes('page-104-'));
assert.ok(!root.innerHTML.includes('-panel-'));
const course=JSON.parse(await readFile('public/data/history-plan.json','utf8'));
const mounts=[];
const context=vm.createContext({URL,document:{getElementById:()=>null},location:{hash:''},history:{replaceState(){}},localStorage:{getItem:()=>'[]',setItem(){}},fetch:async()=>({ok:true,json:async()=>course}),HistorySource:{mount(_root,section){mounts.push(section);},mountLesson(){}}});
vm.runInContext(await readFile('public/history-plan.js','utf8'),context);
await vm.runInContext('HistoryPlan',context).mount(root);
assert.equal(mounts.at(-1),'ancient');
root.onclick({target:{closest:()=>({dataset:{period:'medieval'}})}});
assert.equal(mounts.at(-1),'medieval');
console.log('Readable history passed: 29 chapters, 133 content pages, text coverage, native tables, inline maps, search, culture filtering and course integration.');
