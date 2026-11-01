import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const archive = JSON.parse(readFileSync('public/data/monthly-current-affairs.json', 'utf8'));
const all = archive.months.flatMap(month => month.items);
const imageIndex=JSON.parse(readFileSync('public/data/current-affairs-images.json','utf8'));
assert(Object.keys(imageIndex).length>150);
for(const image of Object.values(imageIndex)){assert.equal(new URL(image.src).protocol,'https:');assert.equal(new URL(image.sourceUrl).protocol,'https:');assert(!image.src.includes('current-affairs-editorial'));}
const first = new Date(archive.range.end + 'T00:00:00Z'); first.setUTCMonth(first.getUTCMonth() - 18);
assert.equal(archive.range.start, first.toISOString().slice(0, 10));
assert.equal(archive.months.length, 19, 'An exact 18-month window includes two partial calendar months');
assert.equal(new Set(all.map(item => item.id)).size, all.length);
for (const [index, month] of archive.months.entries()) {
  assert(month.items.length >= (month.partial ? 1 : 4), `${month.id} needs substantive coverage within its date window`);
  assert.equal(month.partial, index === 0 || index === archive.months.length - 1);
  if (index) { const prior = new Date(archive.months[index - 1].id + '-01T00:00:00Z'); prior.setUTCMonth(prior.getUTCMonth() - 1); assert.equal(month.id, prior.toISOString().slice(0, 7)); }
  for (const item of month.items) {
    assert(item.published.startsWith(month.id));
    assert(item.published >= archive.range.start && item.published <= archive.range.end);
    const source = new URL(item.url); assert.equal(source.protocol, 'https:'); assert(['indianexpress.com','www.pib.gov.in','pib.gov.in'].includes(source.hostname));
    assert(item.title.length > 10 && !/Subscriber Only/.test(item.title));
    assert(item.whyInNews.split(/\s+/).length >= 8);
    assert.equal(item.summary.length, 10);
    assert.equal(new Set(item.summary.map(line => line.toLowerCase())).size, 10);
    assert(item.summary.every(line => line.split(/\s+/).length >= 6 && !/^\d+[.)]/.test(line)));
    assert([item.whyInNews, ...item.summary].join(' ').split(/\s+/).length <= 200);
    assert(item.syllabus.length > 0);
    for (const link of item.syllabus) { assert(['GS I', 'GS II', 'GS III', 'GS IV', 'Prelims', 'Essay'].includes(link.paper), link.paper); assert(link.topic && link.relevance.length > 40); }
  }
}
assert(!JSON.stringify(archive).includes('\ufffd'));
const source = readFileSync('public/home.js', 'utf8');
const home = readFileSync('public/home.html', 'utf8');
assert(!source.includes('fetch("/api/current-affairs")'));
assert(!home.includes('id="paper-method"') && !home.includes('id="source-filters"'));
assert(home.includes('/current-affairs.js?v=') && home.includes('id="monthly-current-affairs"'));
const nodes = new Map();
const handlers = {};
const buttons = archive.months.map(month => ({ dataset: { caMonth: month.id }, setAttribute() {} }));
const host = { dataset: {}, innerHTML: '',
  querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', focus() {}, scrollIntoView() {} }); return nodes.get(selector); },
  querySelectorAll() { return buttons; }, addEventListener(event, handler) { handlers[event] = handler; },
};
const location = { hash: '#current' }; let fetches = 0;
let savedRevision;
const context = vm.createContext({ window: { location }, history: { replaceState(_, __, hash) { location.hash = hash; } }, AbortSignal, URL,
  PrepDesk:{addRevision(entry){savedRevision=entry;return true;}},
  fetch: async url => { fetches++; return { ok: true, json: async () => url==='/data/current-affairs-images.json'?imageIndex:archive }; },
});
vm.runInContext(readFileSync('public/current-affairs-language.js','utf8')+'\nglobalThis.language=CurrentAffairsLanguage;',context);
assert.equal(context.language.plain('RBI and tariffs'),'Reserve Bank of India and import taxes');
assert.equal(context.language.plain('CPI forms human chain'),'CPI forms human chain');
const important=all.filter(context.language.isImportant);
assert(important.length>=100 && important.length<all.length,'Expand relevant coverage while retaining a curated selection');
assert(!context.language.isImportant(all.find(item=>/Celine Dion/.test(item.title))));
for(const item of important){
  const copy=context.language.forIssue(item);
  assert(copy.title.split(/\s+/).length<=5,copy.title);
  assert(copy.short.split(/\s+/).length<=30,copy.short);
  assert(!copy.short.includes('Why it matters')&&!copy.short.includes('For your exam'));
}
vm.runInContext(readFileSync('public/current-affairs-exam.js','utf8')+'\nglobalThis.exam=CurrentAffairsExam;',context);
for(const item of important){const q=context.exam.forIssue(item);assert(q,'Question missing: '+item.title);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert(q.answer>=0&&q.answer<4);assert(q.explanation.length>30);assert.equal(new URL(q.reference).protocol,'https:');assert(q.tags.length>0);assert(q.tags.every(tag=>['GS I','GS II','GS III','GS IV'].includes(tag.paper)));}
assert(new Set(important.map(item=>context.exam.forIssue(item).id)).size>=40,'Questions should cover a broad range of relevant concepts');
vm.runInContext(readFileSync('public/current-affairs-analysis.js','utf8')+'\nglobalThis.analysis=CurrentAffairsAnalysis;',context);
for(const item of important){
  const analysis=context.analysis.forIssue(item);
  assert(analysis,'Missing analysis: '+item.title);
  assert.equal(analysis.developments.length,item.summary.length);
  assert.equal(analysis.source.url,item.url);
  assert.equal(analysis.source.published,item.published);
  assert(analysis.background.length>100);
  for(const field of ['importance','challenges','wayForward'])assert(analysis[field].length>=2);
  assert(analysis.facts.length>=2);
  assert(analysis.mains.includes(context.language.forIssue(item).title));
  const words=[analysis.news,analysis.background,...analysis.developments,...analysis.importance,...analysis.challenges,...analysis.wayForward,...analysis.facts.flat(),analysis.mains].join(' ').split(/\s+/).length;
  assert(words>=250,'Analysis needs teaching depth: '+item.title+' has '+words+' words');
}

vm.runInContext(readFileSync('public/current-affairs.js','utf8')+'\nglobalThis.monthly=MonthlyCurrentAffairs;',context);
await context.monthly.mount(host);
assert.match(host.innerHTML,/<nav class="ca-years"/);
assert.match(host.innerHTML,/<nav class="ca-months"/);
assert(host.innerHTML.indexOf('ca-years')<host.innerHTML.indexOf('ca-months'));
assert.match(host.innerHTML,/aria-label="Months in 2026"/);
assert(!host.innerHTML.match(/<nav class="ca-months"[\s\S]*?<\/nav>/)[0].replace(/<[^>]*>/g,'').includes('2026'));
assert(!host.innerHTML.includes('ca-controls'));
const nav=host.innerHTML.match(/<nav class="ca-months"[\s\S]*?<\/nav>/)[0];
assert(!nav.includes('<small>')&&!nav.includes('stories'),'Month bar must contain only month labels');
const cards=()=>host.querySelector('#ca-stories').innerHTML;
const cardCount=()=> (cards().match(/class="ca-story"/g)||[]).length;
const initialMonthItems=important.filter(item=>item.published.startsWith(archive.months[0].id));
assert.equal(cardCount(),initialMonthItems.length,'Every selected-month snippet is visible without paging');
for(const item of initialMonthItems)assert(cards().includes(`id="ca-${item.id}"`));
assert(!host.innerHTML.includes('ca-prev')&&!host.innerHTML.includes('ca-next'));
assert(!cards().includes('target="_blank"'));
assert(!cards().includes('data-ca-open'),'Titles do not navigate away from the list');
assert(!cards().includes('Why it matters:')&&!cards().includes('For your exam:'));
assert(!cards().includes('current-affairs-editorial'));
const ids=[...cards().matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'Inline questions, notes and save messages need unique IDs');
// Headline clicks toggle notes in place, without changing the snippet list or URL.
const headlineId=initialMonthItems[0].id;
const notes=host.querySelector(`#ca-notes-${headlineId}`);notes.open=false;
const attrs={};
const headline={dataset:{caHeadline:headlineId},setAttribute(name,value){attrs[name]=value;}};
nodes.set(`[data-ca-headline="${headlineId}"]`,headline);
const currentHash=location.hash, unchangedCards=cards();
const clickHeadline=()=>handlers.click({target:{closest:selector=>selector==='[data-ca-headline]'?headline:null}});
clickHeadline();assert.equal(notes.open,true);assert.equal(attrs['aria-expanded'],'true');
assert.equal(cards(),unchangedCards);assert.equal(location.hash,currentHash);
clickHeadline();assert.equal(notes.open,false);assert.equal(attrs['aria-expanded'],'false');
notes.open=true;
handlers.toggle({target:{id:`ca-notes-${headlineId}`,open:true,matches:()=>true}});
assert.equal(attrs['aria-expanded'],'true','Native More notes toggles also keep the headline state in sync');
notes.open=false;
const initial=cards();
context.monthly.openItem(initialMonthItems.at(-1).id);
assert.equal(cards(),initial,'Following a story link keeps all snippets in place');
const oldest=archive.months.at(-1);
handlers.click({target:{closest:selector=>selector==='[data-ca-month]'?{dataset:{caMonth:oldest.id}}:null}});
assert.equal(cardCount(),2);
assert.equal(location.hash,'#current/'+oldest.id);
context.monthly.openItem(important[0].id);
const brief=cards();
assert.match(brief,/More notes/);
assert(!brief.includes('Why it matters:')&&!brief.includes('For your exam:'));
assert.match(brief,/Prelims practice/);
assert.match(brief,/Mains GS syllabus/);
assert.match(brief,/Practice question, not a past UPSC question/);
for(const heading of ['Why in the news?','Background','Key developments','Significance','Challenges','Way forward','Prelims focus','Mains practice'])assert(brief.includes('>'+heading+'<'),heading);
assert.match(brief,/<table>/);
assert.match(brief,/scope="row"/);
assert.match(brief,/Study explanations|study explanations/);
assert.match(brief,/<details class="ca-extra-study"[^>]*><summary>More notes/);
assert(!brief.includes('ca-key-points'),'Default story stays a single short paragraph');
const question=context.exam.forIssue(important[0]);
const inputSelector=`input[name="ca-q-${important[0].id}"]:checked`;
const check=()=>handlers.click({target:{closest:selector=>selector==='[data-ca-check]'?{dataset:{caCheck:important[0].id}}:null}});
nodes.set(inputSelector,null);check();
assert.equal(host.querySelector(`#ca-answer-${important[0].id}`).textContent,'Choose an option first.');
nodes.set(inputSelector,{value:String(question.answer)});check();
assert.match(host.querySelector(`#ca-answer-${important[0].id}`).textContent,/^Correct\./);
const wrong=(question.answer+1)%4;
handlers.change({target:{dataset:{caChoice:important[0].id},value:String(wrong)}});
assert.equal(host.querySelector(`#ca-answer-${important[0].id}`).textContent,'');
nodes.set(inputSelector,{value:String(wrong)});check();
assert.match(host.querySelector(`#ca-answer-${important[0].id}`).textContent,/^Answer:/);
// Year selection shows only that year's month buttons and remembers the prior selection.
handlers.click({target:{closest:selector=>selector==='[data-ca-year]'?{dataset:{caYear:'2025'}}:null}});
assert.match(host.innerHTML,/aria-label="Months in 2025"/);
const yearMonthNav=host.innerHTML.match(/<nav class="ca-months"[\s\S]*?<\/nav>/)[0];
assert(!yearMonthNav.includes('data-ca-month="2026-'));
handlers.click({target:{closest:selector=>selector==='[data-ca-month]'?{dataset:{caMonth:'2025-06'}}:null}});
assert.equal(location.hash,'#current/2025-06');
handlers.click({target:{closest:selector=>selector==='[data-ca-year]'?{dataset:{caYear:'2026'}}:null}});
assert.match(host.innerHTML,/aria-label="Months in 2026"/);
context.monthly.openItem(important[0].id);
assert(cards().includes(question.explanation),'Answer feedback survives opening the story again');
handlers.click({target:{closest:selector=>selector==='[data-ca-revision]'?{dataset:{caRevision:important[0].id}}:null}});
assert.equal(savedRevision.id,'news:'+important[0].id);
assert.equal(savedRevision.title,context.language.forIssue(important[0]).title);
await context.monthly.mount(host);
assert.match(cards(),/ca-story/,'Deep link restores the month list and scrolls to the snippet');
assert(!cards().includes('class="ca-brief"'));
assert(!cards().includes('target="_blank"'));
assert.equal(cardCount(),initialMonthItems.length);
const excluded=all.find(item=>!context.language.isImportant(item));
const before=cards();context.monthly.openItem(excluded.id);assert.equal(cards(),before,'Excluded stories must not reopen through old links');
const pictured=important.find(item=>imageIndex[item.id]);
context.monthly.openItem(pictured.id);
assert(cards().includes(imageIndex[pictured.id].src.replace(/&/g,'&amp;')));
assert.match(cards(),/width="100" height="72"/);
let removed=false;
handlers.error({target:{matches:()=>true,closest:()=>({remove(){removed=true;}})}});
assert(removed);
assert.equal(context.monthly.getSearchItems().length,important.length);
assert(context.monthly.getSearchItems().every(item=>item.tags.some(tag=>tag.startsWith('GS '))));
assert(fetches<=4);
// Mobile shows the same complete month; CSS changes only the number of columns.
const mobileNodes=new Map();
const mobileHost={dataset:{},innerHTML:'',querySelector(selector){if(!mobileNodes.has(selector))mobileNodes.set(selector,{innerHTML:'',textContent:'',focus(){},scrollIntoView(){}});return mobileNodes.get(selector);},querySelectorAll(){return [];},addEventListener(){}};
const mobile=vm.createContext({window:{location:{hash:'#current'},matchMedia(){throw Error('No viewport-based paging');}},URL,AbortSignal,history:{replaceState(){}},fetch:async url=>({ok:true,json:async()=>url==='/data/current-affairs-images.json'?imageIndex:archive})});
for(const file of ['current-affairs-language.js','current-affairs-exam.js','current-affairs-analysis.js','current-affairs.js'])vm.runInContext(readFileSync('public/'+file,'utf8'),mobile);
await vm.runInContext('MonthlyCurrentAffairs.mount(globalThis.testHost)',Object.assign(mobile,{testHost:mobileHost}));
assert.equal((mobileHost.querySelector('#ca-stories').innerHTML.match(/class="ca-story"/g)||[]).length,initialMonthItems.length);
assert(!mobileHost.innerHTML.includes('ca-next')&&!mobileHost.innerHTML.includes('ca-prev'));
console.log(`PASS: ${important.length} relevant briefs; complete monthly snippets on desktop/mobile, no new-tab links, magazine-style analysis for every brief, inline questions, year navigation and source images.`);
