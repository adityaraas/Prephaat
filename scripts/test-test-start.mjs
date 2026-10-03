import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('public/home.js', 'utf8');
const bootstrap = source.slice(source.lastIndexOf('(async () => {'));
for (const stage of ['prelims', 'mains']) {
  let loaded;
  const context = {
    requireSession: async () => ({ account: { name: 'Test learner' } }),
    document: { getElementById: () => ({ textContent: '' }) },
    testPage: true,
    testParams: new URLSearchParams({ stage, testId: stage === 'prelims' ? 'mock-1' : 'mains-gs' }),
    quizEl: { hidden: true }, quizBoard: { innerHTML: '' },
    loadTest: async (id) => { loaded = id; },
    fetch: () => { throw new Error('Test startup must not fetch dashboard data'); },
  };
  await vm.runInNewContext(bootstrap, context);
  assert.equal(context.quizEl.hidden, false);
  assert.equal(context.quizStage, stage);
  assert.equal(loaded, context.testParams.get('testId'));
}
assert.match(source, /href="\/home\?stage=\$\{quizStage\}&testId=/);
console.log('PASS: Prelims and Mains start independently of dashboard requests using the existing route.');
