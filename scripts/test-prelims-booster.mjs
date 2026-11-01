import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const catalog=JSON.parse(await readFile('public/data/prelims-2025/catalog.json','utf8'));
assert.equal(catalog.books.length,7);
assert.deepEqual(catalog.books.map(b=>b.id),['economy','environment','schemes','history','ir','polity','science']);
const books={};let pageCount=0,lineCount=0,tables=0,figures=0;
for(const meta of catalog.books){
 const book=JSON.parse(await readFile('public'+meta.data,'utf8'));books[meta.id]=book;
 assert.equal(book.pageCount,meta.pageCount);assert.equal(book.pages.length,meta.contentPages);
 assert.equal(book.chapters.length,meta.chapters);assert.equal(book.preservation.unchangedPages+(book.preservation.brandingUpdatedPages?book.preservation.brandingUpdatedPages-1:0),book.pageCount-1);
 assert.equal(book.preservation.pageStreamHashes.length,book.pageCount-1);
 const publicPdf=await readFile('public'+meta.pdf),deliveryPdf=await readFile(`output/pdf/Crack-IAS-Prelims-Booster-2025-${meta.id}.pdf`);
 assert.equal(createHash('sha256').update(publicPdf).digest('hex'),createHash('sha256').update(deliveryPdf).digest('hex'));
 assert.equal(publicPdf.subarray(0,4).toString(),'%PDF');await access('public'+meta.cover);
 const ids=new Map();const claim=a=>a.forEach(id=>ids.set(id,(ids.get(id)||0)+1));
 assert.deepEqual(book.pages.map(p=>p.number),Array.from({length:book.pageCount-book.contentStart+1},(_,i)=>i+book.contentStart));
 for(const c of book.chapters){assert.ok(c.page>=book.contentStart&&c.page<=book.pageCount);assert.ok(c.title.length<170);for(const t of c.topics)assert.ok(t.page>=book.contentStart&&t.page<=book.pageCount);}
 for(const page of book.pages){
  pageCount++;assert.equal(page.sourceLines,page.representedLines,`${meta.id} page ${page.number}`);lineCount+=page.sourceLines;
  await access('public'+page.image);assert.ok(page.width&&page.height&&page.printedPage);
  for(const e of page.elements){
   if(e.type==='table'){
    tables++;e.headers.forEach(h=>claim(h.lineIds));for(const row of e.rows){assert.equal(row.length,e.headers.length);for(const c of row)claim(c.lineIds);}
   }else claim(e.lineIds||[]);
   if(e.type==='figure'){figures++;await access('public'+e.image);assert.ok(e.caption);}
  }
 }
 assert.equal(ids.size,book.pages.reduce((n,p)=>n+p.sourceLines,0));assert.ok([...ids.values()].every(n=>n===1),'Source line duplicated');
}
assert.equal(catalog.books.reduce((s,b)=>s+b.pageCount,0),849);assert.equal(pageCount,813);
assert.equal(books.science.pages[0].printedPage,'1');assert.equal(books.history.pages[0].printedPage,'3');
const npr=books.polity.pages.find(p=>p.number===10).elements.find(e=>e.type==='table'&&JSON.stringify(e.headers).includes('NATIONAL POPULATION REGISTER'));
assert.ok(npr,'The NPR/NRC comparison must be a native table');assert.match(npr.headers[1].text,/NATIONAL REGISTER OF CITIZENS/);assert.equal(npr.rows.length,4);
const nodes=new Map();const root={innerHTML:'',querySelector(s){if(!nodes.has(s))nodes.set(s,{focus(){},setSelectionRange(){}});return nodes.get(s);}};
let fetches=0;
const context=vm.createContext({location:{hash:'#prelims-2025'},history:{replaceState(_a,_b,hash){context.location.hash=hash;}},fetch:async url=>{fetches++;const id=url.split('/').at(-1).split('.')[0];return {ok:true,json:async()=>id==='catalog'?catalog:books[id]};}});
const code=await readFile('public/prelims-booster.js','utf8');vm.runInContext(code,context);const api=vm.runInContext('PrelimsBooster',context);
const click=async dataset=>root.onclick({target:{closest:()=>({dataset})}});
await api.mount(root);assert.doesNotMatch(root.innerHTML,/rau[\u2019']s/i);assert.match(root.innerHTML,/Prelims Booster/);assert.equal((root.innerHTML.match(/Read on website/g)||[]).length,7);assert.equal((root.innerHTML.match(/download=/g)||[]).length,7);
for(const meta of catalog.books){
 await click({boosterBook:meta.id});assert.match(root.innerHTML,new RegExp(meta.title.replace(/[&]/g,'&amp;').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(root.innerHTML,/Web notes/);assert.match(context.location.hash,new RegExp('prelims-2025-'+meta.id+'-p'));
 await click({boosterMode:'original'});assert.match(root.innerHTML,/class="booster-original"/);
 await click({boosterMode:'pdf'});assert.match(root.innerHTML,/<iframe class="booster-pdf"/);assert.match(root.innerHTML,new RegExp('/prelims-2025/'+meta.id+'.pdf#page='));
 await click({boosterMode:'notes'});
 for(const p of books[meta.id].pages){root.onchange({target:{matches:s=>s==='[data-booster-jump]',value:String(p.number)}});assert.ok(root.innerHTML.includes(`PDF page ${p.number}`));assert.ok(!/(?:>undefined<|="undefined")/.test(root.innerHTML));}
 await click({boosterChapter:'0'});assert.match(root.innerHTML,/Previous page<\/button>/);
}
await click({boosterBook:'economy'});root.oninput({target:{matches:()=>true,value:'AT1 bonds',selectionStart:9}});assert.match(root.innerHTML,/matching pages/);assert.ok(!root.innerHTML.includes('0 matching pages'));
await click({boosterResult:'5'});assert.match(root.innerHTML,/AT1 bonds/);await click({boosterStep:'1'});assert.match(context.location.hash,/-p6$/);
const before=context.location.hash;root.onchange({target:{matches:s=>s==='[data-booster-jump]',value:'9999'}});assert.equal(context.location.hash,before);
await click({boosterOverview:''});assert.equal(context.location.hash,'#prelims-2025');assert.match(root.innerHTML,/Read on website/);
const count=fetches;await click({boosterBook:'economy'});assert.equal(fetches,count,'Cached book fetched again');
context.location.hash='#prelims-2025-polity-p10';await api.mount(root);assert.doesNotMatch(root.innerHTML,/rau[\u2019']s/i);assert.match(root.innerHTML,/NATIONAL POPULATION REGISTER/);
const home=await readFile('public/home.js','utf8');assert.match(home,/label: "Prelims Booster 2025"/);assert.match(home,/PrelimsBooster.mount/);assert.match(home,/hash.startsWith\('prelims-2025'\)/);
const html=await readFile('public/home.html','utf8');assert.match(html,/id="prelims-booster-board"/);assert.match(html,/prelims-booster.js/);assert.match(html,/prelims-booster.css/);
console.log(`PASS: 7 subjects, 849 PDF pages, ${pageCount} complete web pages, ${lineCount} uniquely owned source lines, ${tables} native table regions and ${figures} diagrams. Cover-copy integrity, page assets, all-page rendering, subject switching, search, chapter navigation, deep links, original images, PDF viewer, downloads and caching pass.`);
