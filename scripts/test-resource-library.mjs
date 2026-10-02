import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseNcertCatalog, parseVajiramMagazines } from './build-resource-library.mjs';

const data = JSON.parse(await readFile('public/data/resource-library.json', 'utf8'));
const context = { URL, document: { getElementById: () => null } };
vm.createContext(context);
vm.runInContext(await readFile('public/resource-library.js', 'utf8'), context);
const { filter, card, labels, load } = context.ResourceLibrary;
assert.equal(new Set(data.resources.map(r => r.id)).size, data.resources.length, 'Duplicate resource IDs');
for (const r of data.resources) {
  assert.match(r.id, /^[a-z0-9-]+$/);
  assert.ok(r.title && r.readingTask && r.description && r.language);
  assert.ok(r.subjects.length && r.subjects.every(s => labels[s]), `Unknown subject on ${r.id}`);
  for (const url of [r.sourceUrl,r.pdfUrl,r.archiveUrl,r.contentsUrl,...(r.chapters || []).map(c => c.url)].filter(Boolean)) assert.equal(new URL(url).protocol, 'https:');
  if (r.type === 'Textbook') assert.ok(r.class >= 6 && r.class <= 12 && r.chapters.length > 0);
}
for (let grade = 6; grade <= 12; grade++) {
  for (const language of ['English', 'Hindi']) assert.ok(filter(data.resources, {class: grade, language}).length, `Missing Class ${grade} ${language}`);
}
for (const subject of Object.keys(labels)) assert.ok(filter(data.resources, {subject}).length, `Missing ${subject}`);
assert.ok(filter(data.resources, {subject:'polity',class:'11',language:'English',provider:'NCERT'}).some(r => r.id === 'ncert-keps2'));
assert.ok(filter(data.resources, {query:'Recitals August 2026'}).some(r => r.id === 'vajiram-recitals-august-2026'));
assert.equal(filter(data.resources, {provider:'Vajiram & Ravi', class:'6'}).length, 0);
assert.equal(filter(data.resources, {query:'no-such-title-999'}).length, 0);
assert.ok(!data.resources.some(r => ['ncert-hees2','ncert-hhes2'].includes(r.id)), 'Recalled book included');
const unsafe = card({...data.resources[0], title:'<img src=x onerror=alert(1)>', pdfUrl:'javascript:alert(1)'});
assert.ok(!unsafe.includes('<img') && !unsafe.includes('javascript:'));
assert.ok(unsafe.includes('&lt;img'));
const fixture = `if((document.test.tclass.value==6) && (document.test.tsubject.options[sind].text=="Science")) {
// document.test.tbook.options[1].text="Old";
document.test.tbook.options[1].text="Curiosity";
document.test.tbook.options[1].value="textbook.php?fecu1=0-12"
}`;
assert.equal(parseNcertCatalog(fixture)[0].title, 'Curiosity');
assert.equal(parseNcertCatalog(fixture)[0].chapterCount, 12);
assert.equal(parseVajiramMagazines('<h5 title="January 2026">January 2026</h5><a href="https://example.com/test.pdf">Download</a>')[0].title, 'January 2026');
let calls = 0;
context.fetch = async () => { calls++; if(calls === 1) throw new Error('offline'); return {ok:true,json:async()=>data}; };
await assert.rejects(load());
assert.equal((await load()).resources.length, data.resources.length);
await load();
assert.equal(calls, 2, 'Successful data should be cached and failures retryable');
console.log(`PASS: ${data.resources.length} resources; class/language/subject coverage, filters, search, safe links, parsers and loading recovery.`);
