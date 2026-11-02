import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { QUIZ_BANK } from './quiz-bank.ts';
export type ContentKind='study_material'|'mcq'|'pyq'|'current_affairs';
export type ContentItem={kind:ContentKind;id:string;title:string;source_locations:{file:string;pointer:string}[];syllabus_node_id:string|null};
export async function syllabusInventory() {
  const items=new Map<string,ContentItem>(),issues:any[]=[];
  function add(kind:ContentKind,id:string,title:string,file:string,pointer:string,tag:unknown=null) {
    const key=kind+':'+id,old=items.get(key),location={file,pointer};
    if(old) {if(!old.source_locations.some(x=>x.file===file&&x.pointer===pointer))old.source_locations.push(location);return;}
    items.set(key,{kind,id,title,source_locations:[location],syllabus_node_id:typeof tag==='string'?tag:null});
  }
  for(const q of QUIZ_BANK)add('mcq','quiz-bank:'+q.id,q.prompt,'quiz-bank.ts',q.id,q.syllabus_node_id);
  const files=(await readdir(new URL('./public/data/',import.meta.url))).filter(f=>f.endsWith('.json')).sort();
  for(const name of files) {
    const file='public/data/'+name,data=JSON.parse(await readFile(new URL('./'+file,import.meta.url),'utf8'));
    if(name==='study-catalog.json')for(const [index,item] of data.items.entries()) {
      if(item.subject!=='current')add('study_material',item.id,item.title,file,'/items/'+index,item.syllabus_node_id);
    }
    if(Array.isArray(data.months))for(const [monthIndex,month] of data.months.entries())for(const [index,item] of (month.items||[]).entries()) {
      if(typeof item.id==='string'&&typeof item.title==='string') {add('current_affairs',item.id,item.title,file,`/months/${monthIndex}/items/${index}`,item.syllabus_node_id);issues.push(item);}
    }
    const namespace=name.replace(/\.json$/,'');
    function walk(value:any,pointer='') {
      if(!value||typeof value!=='object')return;
      if(Array.isArray(value)) {
        if(typeof value[0]==='string'&&Array.isArray(value[1])&&value[1].length>=2&&value[1].every((x:any)=>typeof x==='string')&&typeof value[2]==='number') {
          const hash=createHash('sha256').update(value[0]).digest('hex').slice(0,24);
          add('mcq',namespace+':'+hash,value[0],file,pointer);return;
        }
        value.forEach((x,index)=>walk(x,pointer+'/'+index));return;
      }
      const prompt=value.prompt??value.question??value.q;
      if(/pyq/i.test(name)&&typeof prompt==='string'&&!Array.isArray(value.options)&&value.marks) {
        const id=value.id==null?createHash('sha256').update(prompt).digest('hex').slice(0,24):String(value.id);
        add('pyq',namespace+':'+id,prompt,file,pointer,value.syllabus_node_id);
      }
      if(typeof prompt==='string'&&Array.isArray(value.options)&&value.options.length>=2) {
        const id=value.id==null?createHash('sha256').update(prompt).digest('hex').slice(0,24):String(value.id);
        add('mcq',namespace+':'+id,prompt,file,pointer,value.syllabus_node_id);
      }
      for(const [key,child] of Object.entries(value))walk(child,pointer+'/'+key.replace(/~/g,'~0').replace(/\//g,'~1'));
    }
    walk(data);
  }
  const context=vm.createContext({});
  vm.runInContext(await readFile(new URL('./public/current-affairs-exam.js',import.meta.url),'utf8')+'\nglobalThis.exam=CurrentAffairsExam;',context);
  for(const issue of issues) {
    const question=context.exam.forIssue({...issue,syllabus:issue.syllabus||[]});
    if(question)add('mcq','current-affairs-exam:'+question.id,question.question,'public/current-affairs-exam.js',question.id,question.syllabus_node_id);
  }
  return [...items.values()];
}
