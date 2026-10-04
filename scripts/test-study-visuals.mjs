import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = path => readFileSync(path, 'utf8');
let course;
const context = vm.createContext({ URL, location:{hash:''}, history:{replaceState(){}}, localStorage:{getItem:()=>null,setItem(){}}, fetch:async()=>({ok:true,json:async()=>course}) });
vm.runInContext(read('public/study-visuals.js')+'\nglobalThis.visuals=StudyVisuals;',context);
vm.runInContext(read('public/history-plan.js')+'\nglobalThis.plan=HistoryPlan;',context);
const elements = new Map();
const controls = [0,1,2].map(index=>({dataset:{studyStep:String(index)},setAttribute(key,value){this[key]=value;}}));
const root = {innerHTML:'',querySelector(selector){if(!elements.has(selector)) elements.set(selector,{innerHTML:'',focus(){}});return elements.get(selector);},querySelectorAll(){return controls;}};
let lessons=0,diagrams=0,explainers=0,videos=0,maps=0;
for(const subject of context.visuals.subjects) {
  course=JSON.parse(read(subject==='history'?'public/data/history-plan.json':`public/data/study-course-${subject}.json`));
  for(const segment of course.segments) for(const lesson of segment.days) {
    const html=context.visuals.render(subject,lesson,segment);
    assert.match(html,/role="img"/);assert.match(html,/Watch with a purpose/);
    assert(!html.includes('<iframe'));assert(!/undefined|NaN|\ufffd/.test(html));lessons++;
  }
  await context.plan.mount(root,subject);
  assert.match(root.innerHTML,/study-visuals/);
  const html=root.innerHTML;
  for(const kind of ['diagram','explainer','video']) {
    const options=html.match(new RegExp(`<select id="sv-${kind}-choice"[^>]*>(.*?)</select>`))[1];
    const ids=[...options.matchAll(/value="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(new Set(ids).size,ids.length);
    for(const id of ids) {
      root.onchange({target:{dataset:{studyChoice:kind,studySubject:subject},value:id}});
      const body=root.querySelector(`#sv-${kind}-body`).innerHTML;
      assert(body.length>250&&!/undefined|NaN|\ufffd/.test(body));
      assert(!body.includes('<iframe'));
      if(kind==='diagram'){assert.match(body,/<svg/);diagrams++;continue;}
      if(kind==='explainer'){
        explainers++;
        context.visuals.handleClick({target:{closest:()=>({dataset:{studySubject:subject,studyId:id,studyStep:'1'}})}},root);
        assert.match(root.querySelector('#sv-step-detail').innerHTML,/<h4>.+<\/h4><p>.+<\/p>/);
        assert.equal(controls[1]['aria-pressed'],'true');assert.equal(controls[0]['aria-pressed'],'false');
        if(!body.includes('data-study-load="map"'))continue;
      }else videos++;
      const media=kind==='explainer'?'map':'video';
      root.onclick({target:{closest:selector=>selector.includes('data-study-load')?{dataset:{studyLoad:media,studySubject:subject,studyId:id}}:null}});
      const frame=root.querySelector(`#sv-${media}-frame`).innerHTML;
      const url=new URL(frame.match(/src="([^"]+)"/)[1].replaceAll('&amp;','&'));
      assert.equal(url.protocol,'https:');assert.equal(url.hostname,media==='map'?'www.openstreetmap.org':'www.youtube-nocookie.com');
      if(media==='map'){maps++;assert.equal(url.searchParams.get('bbox').split(',').length,4);}else assert.match(url.pathname,/^\/embed\/[a-zA-Z0-9_-]{11}$/);
    }
  }
  root.onclick({target:{closest:selector=>selector==='button'?{dataset:{day:'30'}}:null}});
  assert.match(root.innerHTML,/DAY 30 \/ 60/);assert.match(root.innerHTML,/study-visuals/);
}
assert.equal(lessons,360);assert.equal(diagrams,18);assert.equal(explainers,18);assert.equal(videos,14);assert.equal(maps,5);
assert.equal(context.visuals.render('geography',{},{}),'');
assert(read('public/home.html').indexOf('/study-visuals.js')<read('public/home.html').indexOf('/history-plan.js'));
console.log(`PASS: ${lessons} lessons, ${diagrams} diagrams, ${explainers} explainers, ${videos} videos, ${maps} maps; selectors, guided steps, explicit embeds and day navigation.`);
