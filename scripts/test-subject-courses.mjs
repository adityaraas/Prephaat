import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ids = ['geography','polity','economy','science','environment','ethics'];
const courses = Object.fromEntries(await Promise.all(ids.map(async id => [id, JSON.parse(await readFile(`public/data/study-course-${id}.json`, 'utf8'))])));
const code = await readFile('public/history-plan.js', 'utf8');
const storage = new Map();
let fail = false;
const context = vm.createContext({ URL, document: { getElementById: () => null }, location: { hash: '' },
  history: { replaceState(_a, _b, hash) { context.location.hash = hash; } },
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  fetch: async url => ({ ok: !fail, json: async () => courses[url.match(/study-course-(.*)\.json/)[1]] }) });
vm.runInContext(code, context);
const api = vm.runInContext('HistoryPlan', context);
const elements = new Map();
const root = { innerHTML: '', querySelector(selector) {
  if (!elements.has(selector)) elements.set(selector, { focus() {} });
  return elements.get(selector);
} };
const click = dataset => root.onclick({ target: { closest: () => ({ dataset }) } });
for (const id of ids) {
  const course = courses[id];
  assert.deepEqual(course.segments.map(s => s.days.length), [20,20,20]);
  assert.deepEqual(course.segments.flatMap(s => s.days.map(d => d.day)), Array.from({length:60}, (_,i) => i+1));
  for (const segment of course.segments) {
    assert.equal(segment.days.filter(d => ['test','revision'].includes(d.mode)).length, 4);
    assert.ok(course.pyqs.some(q => q.segment === segment.id && q.stage === 'Mains'));
    for (const day of segment.days) {
      assert.ok(day.notes.length && day.notes.every(n => n.length > 50));
      assert.ok(day.reading && day.task && day.recallAnswer && day.studyWords >= 150);
      for (const source of day.sources) assert.ok(course.sources[source]);
      for (const dossier of day.deepReading) assert.ok(course.dossiers[dossier].sections.length >= 3);
    }
    for (const [, , url] of course.readers[segment.id]) {
      assert.equal(new URL(url).protocol, 'https:');
      assert.ok(['ncert.nic.in','www.ncert.nic.in','darpg.gov.in'].includes(new URL(url).hostname));
    }
  }
  context.location.hash = `#${id}-day-42`;
  await api.mount(root, id);
  assert.match(root.innerHTML, /DAY 42 \/ 60/);
  assert.ok(root.innerHTML.includes(course.title.toUpperCase().replaceAll('&', '&amp;')));
  assert.match(root.innerHTML, /These are not actual UPSC PYQs/);
  assert.doesNotMatch(root.innerHTML, /undefined|NaN|UPSC PYQ examples/);
  click({ period: course.segments[0].id });
  assert.equal(context.location.hash, `#${id}-day-1`);
  root.querySelector('#ncert-reader-choice').value = course.readers[course.segments[0].id][0][1];
  click({ reader: 'load' });
  assert.match(root.querySelector('#ncert-reader-frame').innerHTML, /<iframe/);
  root.onchange({ target: { id: 'complete-day', checked: true } });
  assert.equal(storage.get(`bpsc-${id}-plan-v1`), '[1]');
  click({ day: '60' });
  assert.match(root.innerHTML, /data-day="61" disabled/);
}
assert.equal(storage.size, 6);
const retryContext = vm.createContext({ ...context, fetch: async () => ({ ok: !fail, json: async () => courses.ethics }) });
vm.runInContext(code, retryContext);
fail = true;
await vm.runInContext('HistoryPlan', retryContext).mount(root, 'ethics');
assert.match(root.innerHTML, /could not load/);
fail = false;
await root.querySelector('button').onclick();
assert.match(root.innerHTML, /ETHICS STUDY ROOM/);
const home = await readFile('public/home.js', 'utf8');
assert.match(home, /HistoryPlan\.mount\(document\.getElementById\("history-plan"\), id\)/);
assert.match(home, /courseDay: lesson.day/);
console.log('PASS: 360 study days, six renderers, source readers, original practice labels, isolated progress, deep links and recovery.');
