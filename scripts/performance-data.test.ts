import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregatePerformance, type PerformanceAnswer} from '../performance-data.ts';

const now = Date.parse('2026-10-28T12:00:00Z');
const row = (overrides: Partial<PerformanceAnswer> = {}): PerformanceAnswer => ({
  attempt_id:1, subject:'mock',stage:'prelims',test_id:'mock-1',score:2,max_score:6,
  created_at:'2026-10-28T10:00:00Z',question_id:'q1',prompt:'Question',topic:'History',chosen:0,ok:true,time_spent_ms:null,...overrides,
});

test('accuracy excludes skipped questions and Mains self-assessment',()=>{
  const data=aggregatePerformance([row(),row({question_id:'q2',chosen:1,ok:false}),row({question_id:'q3',chosen:-1,ok:false}),row({stage:'mains',ok:true})], 'all',0,now);
  assert.equal(data.accuracy,50);assert.equal(data.attempted,2);assert.equal(data.subjects[0].skipped,1);
  assert.equal(data.weakTopics[0].attempted,2);assert.equal(data.totalAttempts,1);
});
test('mixed mocks classify answers by topic, and subject filtering keeps full mock scores',()=>{
  const data=aggregatePerformance([row(),row({topic:'Polity',question_id:'q2',ok:false})],'polity',0,now);
  assert.equal(data.subjects.length,1);assert.equal(data.subjects[0].subject,'polity');assert.equal(data.accuracy,0);
  assert.equal(data.mocks[0].score,2);assert.equal(data.mocks[0].maxScore,6);
});
test('period filters apply to answers, mock trend and rankings',()=>{
  const data=aggregatePerformance([row(),row({attempt_id:2,created_at:'2026-09-01T00:00:00Z'})],'all',7,now);
  assert.equal(data.totalAttempts,1);assert.equal(data.mocks.length,1);
});
test('mock trend deduplicates answers and sorts chronological attempts',()=>{
  const data=aggregatePerformance([row({attempt_id:2}),row({question_id:'q2',attempt_id:2}),row({attempt_id:1,created_at:'2026-10-27T00:00:00Z'}),row({attempt_id:3,test_id:'subject-history-1'})],'all',0,now);
  assert.deepEqual(data.mocks.map(mock=>mock.id),[1,2]);
});
test('legacy and zero timings remain unavailable, not fabricated',()=>{
  const data=aggregatePerformance([row(),row({question_id:'q2',time_spent_ms:0})],'all',0,now);
  assert.equal(data.averageTimeMs,null);assert.deepEqual(data.timings,[]);
});
test('average timing uses recorded values and chart uses latest timed attempt',()=>{
  const data=aggregatePerformance([row({attempt_id:1,time_spent_ms:10000,created_at:'2026-10-27T00:00:00Z'}),row({attempt_id:2,time_spent_ms:20000})],'all',0,now);
  assert.equal(data.averageTimeMs,15000);assert.equal(data.timings.length,1);assert.equal(data.timings[0].milliseconds,20000);
});
test('weak topics rank by accuracy, then sample size; perfect topics excluded',()=>{
  const data=aggregatePerformance([row({subject:'history',topic:'A',ok:false}),row({subject:'history',topic:'B',ok:false}),row({subject:'history',topic:'B',ok:false,question_id:'q2'}),row({subject:'history',topic:'Perfect'})],'all',0,now);
  assert.deepEqual(data.weakTopics.map(topic=>topic.topic),['B','A']);
});
test('no attempts is an empty state, not a zero-percent score',()=>{
  const data=aggregatePerformance([],'all',0,now);assert.equal(data.accuracy,null);assert.equal(data.latest,null);assert.deepEqual(data.weakTopics,[]);
});
