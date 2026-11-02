import { readFile,readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { sql } from './db.ts';
import { getSyllabusTree, validateSyllabusTag, SyllabusError } from './syllabus.ts';
import { QUIZ_BANK } from './quiz-bank.ts';

export function descendantIds(nodes:any[], id:string):string[] {
  const children=new Map<string,string[]>();
  for(const n of nodes) children.set(n.parent_id,[...(children.get(n.parent_id)||[]),n.id]);
  const result:string[]=[];
  const visit=(key:string)=>{result.push(key);for(const child of children.get(key)||[])visit(child);};
  visit(id);return result;
}
export function resourceKind(item:any) {
  if(item.kind==='pyq')return 'pyq';
  if(item.kind==='mcq')return item.source_locations.some((x:any)=>/pyq/i.test(x.file))?'pyq':'mcq';
  return item.kind==='study_material'?'notes':'current';
}
export async function syllabusOverview(accountId:number,exam:string|null) {
  const {nodes}=await getSyllabusTree(exam);
  const [items,materials,progress,answers]=await Promise.all([
    sql`SELECT kind,id,syllabus_node_id,source_locations FROM syllabus_content_items WHERE active AND syllabus_node_id IS NOT NULL`,
    sql`SELECT id,syllabus_node_id FROM study_materials WHERE syllabus_node_id IS NOT NULL AND published`,
    sql`SELECT node_id,status FROM syllabus_topic_progress WHERE account_id=${accountId}`,
    sql`SELECT node_id,count(*)::int AS attempted,count(*) FILTER(WHERE correct)::int AS correct FROM (
      SELECT node_id,correct FROM syllabus_practice_answers WHERE account_id=${accountId}
      UNION ALL
      SELECT c.syllabus_node_id,a.ok FROM quiz_answers a JOIN quiz_attempts q ON q.id=a.attempt_id
      JOIN syllabus_content_items c ON c.kind='mcq' AND c.active AND (c.id='quiz-bank:'||a.question_id OR c.id='pyq-upsc:'||a.question_id)
      WHERE q.account_id=${accountId} AND q.stage='prelims' AND a.chosen>=0 AND c.syllabus_node_id IS NOT NULL
    ) attempts GROUP BY node_id`
  ]);
  return {nodes:nodes.map(n=>{
    const ids=new Set(descendantIds(nodes,n.id));
    const counts={notes:0,mcq:0,pyq:0,current:0};
    for(const item of items)if(ids.has(item.syllabus_node_id))counts[resourceKind(item) as keyof typeof counts]++;
    for(const item of materials)if(ids.has(item.syllabus_node_id))counts.notes++;
    const stats=answers.filter(a=>ids.has(a.node_id));
    const attempted=stats.reduce((s,a)=>s+a.attempted,0),correct=stats.reduce((s,a)=>s+a.correct,0);
    return {...n,counts,status:progress.find(p=>p.node_id===n.id)?.status||'not-started',attempted,accuracy:attempted?Math.round(correct/attempted*100):null};
  })};
}
export async function saveTopicStatus(accountId:number,body:any) {
  if(!['not-started','reading','revised'].includes(body.status))throw new SyllabusError('Choose a valid study status.');
  const id=await validateSyllabusTag(body.node_id);
  const [node]=await sql`SELECT node_type FROM syllabus_nodes WHERE id=${id}`;
  if(node?.node_type!=='topic')throw new SyllabusError('Choose a topic.');
  await sql`INSERT INTO syllabus_topic_progress(account_id,node_id,status) VALUES(${accountId},${id},${body.status}) ON CONFLICT(account_id,node_id) DO UPDATE SET status=EXCLUDED.status,updated_at=NOW()`;
  return {status:body.status};
}
async function sourceValue(item:any,cache=new Map<string,any>()) {
  async function json(file:string) {
    if(!cache.has(file))cache.set(file,JSON.parse(await readFile(new URL('./'+file,import.meta.url),'utf8')));
    return cache.get(file);
  }
  for(const source of item.source_locations) {
    if(source.file==='quiz-bank.ts')return QUIZ_BANK.find(q=>'quiz-bank:'+q.id===item.id);
    if(source.file==='public/current-affairs-exam.js') {
      if(!cache.has('generated-questions')) {
        const context=vm.createContext({});
        vm.runInContext(await readFile(new URL('./public/current-affairs-exam.js',import.meta.url),'utf8')+'\nglobalThis.exam=CurrentAffairsExam;',context);
        const questions=new Map();
        for(const file of await readdir(new URL('./public/data/',import.meta.url))) {
          if(!file.endsWith('.json'))continue;
          const data=await json('public/data/'+file);
          if(!Array.isArray(data.months))continue;
          for(const month of data.months)for(const issue of month.items||[]) {
            const q=context.exam.forIssue({...issue,syllabus:issue.syllabus||[]});
            if(q)questions.set('current-affairs-exam:'+q.id,q);
          }
        }
        cache.set('generated-questions',questions);
      }
      return cache.get('generated-questions').get(item.id);
    }
    if(!/^public\/data\/[\w.-]+\.json$/.test(source.file))continue;
    const data=await json(source.file);
    let value=data;
    for(const key of source.pointer.split('/').slice(1))value=value?.[key.replace(/~1/g,'/').replace(/~0/g,'~')];
    if(value)return value;
  }
  return null;
}
export async function topicResources(id:string,kind:string) {
  if(!['notes','mcq','pyq','current'].includes(kind))throw new SyllabusError('Unknown resource type.');
  await validateSyllabusTag(id);
  const {nodes}=await getSyllabusTree(null),ids=descendantIds(nodes,id);
  const rows=await sql`SELECT * FROM syllabus_content_items WHERE active AND syllabus_node_id=ANY(${ids}) ORDER BY title,id`;
  const items:any[]=[],cache=new Map<string,any>();
  for(const row of rows.filter(r=>resourceKind(r)===kind)) {
    const value=await sourceValue(row,cache);
    if(!value)continue;
    if(kind==='mcq'||kind==='pyq') {
      const prompt=Array.isArray(value)?value[0]:value.prompt??value.question??value.q;
      const options=Array.isArray(value)?value[1]:value.options;
      if(prompt)items.push({id:row.id,title:prompt,options:Array.isArray(options)?options:undefined,text:value.solution??value.explain??''});
    } else items.push({id:row.id,title:row.title,text:value.summary??value.source??value.description??'',url:value.url??null});
  }
  if(kind==='notes') {
    const materials=await sql`SELECT id,title,body FROM study_materials WHERE syllabus_node_id=ANY(${ids}) AND published ORDER BY id`;
    for(const m of materials)items.push({id:'material:'+m.id,title:m.title,text:m.body});
  }
  return {items};
}
export async function answerTopicQuestion(accountId:number,body:any) {
  const id=await validateSyllabusTag(body.node_id);
  if(!id||typeof body.question_id!=='string'||!Number.isInteger(body.answer))throw new SyllabusError('Choose an answer.');
  const {nodes}=await getSyllabusTree(null),ids=descendantIds(nodes,id);
  const [row]=await sql`SELECT * FROM syllabus_content_items WHERE kind='mcq' AND id=${body.question_id} AND active AND syllabus_node_id=ANY(${ids})`;
  if(!row)throw new SyllabusError('Question not found.',404);
  const value=await sourceValue(row),options=Array.isArray(value)?value[1]:value?.options;
  const answer=Array.isArray(value)?value[2]:value?.answer??value?.correctIndex??value?.correct;
  if(!Array.isArray(options)||!Number.isInteger(answer)||body.answer<0||body.answer>=options.length)throw new SyllabusError('This question cannot be graded.');
  const correct=body.answer===answer;
  await sql`INSERT INTO syllabus_practice_answers(account_id,node_id,question_id,correct) VALUES(${accountId},${row.syllabus_node_id},${row.id},${correct})`;
  return {correct,answer,explanation:Array.isArray(value)?value[3]??'':value.explain??value.solution??value.explanation??''};
}
