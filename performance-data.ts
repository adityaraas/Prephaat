export type PerformanceAnswer = {
  attempt_id: number; subject: string; stage: string; test_id: string;
  score: number | string; max_score: number | string; created_at: Date | string;
  question_id: string; prompt: string; topic: string; chosen: number; ok: boolean;
  time_spent_ms: number | null;
};

const topics: Record<string, string> = {
  'history & culture':'history', history:'history', ancient:'history', medieval:'history', modern:'history', culture:'history',
  geography:'geography', polity:'polity', economy:'economy', environment:'environment', disaster:'environment',
  science:'science', 's&t':'science', 'science & technology':'science', ethics:'ethics',
};

export function answerSubject(row: Pick<PerformanceAnswer, 'subject' | 'topic'>) {
  return topics[row.topic.toLowerCase()] || (row.subject === 'mock' ? 'general' : row.subject);
}

export function aggregatePerformance(rows: PerformanceAnswer[], subject = 'all', days = 0, now = Date.now()) {
  const filtered = rows.filter(row => row.stage === 'prelims' && (!days || new Date(row.created_at).getTime() >= now - days * 86400000));
  const selected = filtered.filter(row => subject === 'all' || answerSubject(row) === subject);
  const groups = new Map<string, { subject: string; attempted: number; correct: number; skipped: number }>();
  const weak = new Map<string, { subject: string; topic: string; attempted: number; correct: number; skipped: number }>();
  const attempts = new Map<number, { id: number; title: string; score: number; maxScore: number; date: Date | string }>();
  for (const row of selected) {
    const id = answerSubject(row), topic = row.topic || id;
    const group = groups.get(id) || {subject:id, attempted:0, correct:0, skipped:0};
    const key = id + ':' + topic;
    const topicGroup = weak.get(key) || {subject:id, topic, attempted:0, correct:0, skipped:0};
    for (const item of [group, topicGroup]) {
      if (row.chosen >= 0) { item.attempted++; if (row.ok) item.correct++; }
      else item.skipped++;
    }
    groups.set(id,group); weak.set(key,topicGroup);
    attempts.set(row.attempt_id,{id:row.attempt_id,title:row.test_id,score:Number(row.score),maxScore:Number(row.max_score),date:row.created_at});
  }
  const accuracy = <T extends {attempted:number;correct:number}>(item:T) => ({...item, accuracy:item.attempted ? item.correct/item.attempted*100 : null});
  const total = selected.filter(row=>row.chosen>=0).length;
  const correct = selected.filter(row=>row.chosen>=0 && row.ok).length;
  const timed = selected.filter(row=>Number.isFinite(row.time_spent_ms) && row.time_spent_ms !== null && row.time_spent_ms > 0);
  const ordered = [...attempts.values()].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime() || a.id-b.id);
  // A mock score is the full recorded paper score; subject filtering only affects question statistics.
  const mocks = [...new Map(filtered.filter(row=>row.test_id.startsWith('mock-')).map(row=>[row.attempt_id,{id:row.attempt_id,title:row.test_id,score:Number(row.score),maxScore:Number(row.max_score),date:row.created_at}])).values()]
    .filter(item=>item.maxScore>0).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime() || a.id-b.id);
  const latestTimedAttempt = [...timed].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime() || b.attempt_id-a.attempt_id)[0]?.attempt_id;
  return {
    totalAttempts:ordered.length, attempted:total, correct, accuracy:total?correct/total*100:null,
    averageTimeMs:timed.length?timed.reduce((sum,row)=>sum+Number(row.time_spent_ms),0)/timed.length:null,
    timedQuestions:timed.length, latest:ordered.at(-1)||null, mocks,
    subjects:[...groups.values()].map(accuracy),
    weakTopics:[...weak.values()].map(accuracy).filter(item=>item.attempted>0 && Number(item.accuracy)<100)
      .sort((a,b)=>Number(a.accuracy)-Number(b.accuracy)||b.attempted-a.attempted||a.topic.localeCompare(b.topic)),
    timings:timed.filter(row=>row.attempt_id===latestTimedAttempt).map(row=>({id:row.question_id,prompt:row.prompt,subject:answerSubject(row),milliseconds:row.time_spent_ms,ok:row.ok,chosen:row.chosen})),
    scope:'Prelims attempts. Mains self-assessment is excluded from accuracy. Timing measures active-question time; older attempts have no timing data.',
  };
}
