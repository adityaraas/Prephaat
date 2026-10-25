import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import vm from 'node:vm';

const data = JSON.parse(await readFile('public/data/polity-reading.json', 'utf8'));
assert.equal(data.chapters.length, 37);
assert.equal(data.sourcePageCount, 204);
assert.equal(data.audit.length, 200);
for (const page of data.audit) assert.equal(page.sourceLines, page.representedLines);
assert.deepEqual(data.audit.map(p => p.page), Array.from({length:200}, (_, i) => i + 5));
let tables = 0;
for (const chapter of data.chapters) for (const page of chapter.pages) for (const item of page.elements) {
  if (item.type === 'figure') await access('public' + item.image);
  if (item.type === 'table') tables++;
}
assert.ok(tables > 0);
const root = {innerHTML:'', querySelector:() => ({focus(){}, setSelectionRange(){}})};
const context = vm.createContext({fetch:async url => {
  assert.equal(url, '/data/polity-reading.json');
  return {ok:true, json:async()=>data};
}});
vm.runInContext(await readFile('public/history-source.js','utf8'), context);
await vm.runInContext('HistorySource', context).mount(root, 'polity');
assert.match(root.innerHTML, /POLITY STUDY MATERIAL/);
assert.match(root.innerHTML, /Historical Underpinnings/);
assert.match(root.innerHTML, /\/polity-source\/book.pdf#page=5/);
assert.ok(!root.innerHTML.includes('/history-source/'));
root.onclick({target:{closest:selector=>selector==='button'?{dataset:{sourceChapter:'37'}}:null}});
assert.match(root.innerHTML, /Lokayukta/);
root.oninput({target:{matches:()=>true, value:'no-match-123xyz', selectionStart:15}});
assert.match(root.innerHTML, /No chapters match/);
const plan = await readFile('public/history-plan.js','utf8');
assert.match(plan, /id="polity-source-material"/);
assert.match(plan, /HistorySource.mount\(root.querySelector\('#polity-source-material'\), 'polity'\)/);
console.log(`Polity reader passed: 37 chapters, 200 content pages, ${tables} tables, line coverage, assets, chapter navigation, search and source links.`);
