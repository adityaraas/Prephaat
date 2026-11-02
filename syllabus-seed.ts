import { readFile } from 'node:fs/promises';
export type SyllabusNode = {id:string;parent_id:string|null;node_type:'exam'|'stage'|'paper'|'subject'|'topic'|'subtopic';name:string;display_order:number;source_id:string;source_ref:string;coverage?:string};
export type SyllabusSeed = {version:number;verified_on:string;sources:Record<string,{title:string;url:string;sections?:string;note?:string}>;coverage:Record<string,string>;nodes:SyllabusNode[]};
const levels=['exam','stage','paper','subject','topic','subtopic'];
export function validateSyllabusSeed(seed:SyllabusSeed) {
  if(!seed||!Array.isArray(seed.nodes)||!seed.sources)throw Error('Invalid syllabus seed.');
  const map=new Map<string,SyllabusNode>();
  for(const node of seed.nodes) {
    if(!node.id||node.id.length>500||!/^[a-z0-9][a-z0-9._-]*$/.test(node.id)||map.has(node.id))throw Error('Invalid or duplicate node ID: '+node.id);
    if(!levels.includes(node.node_type)||!node.name?.trim()||!Number.isInteger(node.display_order)||node.display_order<0||!seed.sources[node.source_id])throw Error('Invalid node metadata: '+node.id);
    map.set(node.id,node);
  }
  for(const node of seed.nodes) {
    const level=levels.indexOf(node.node_type);
    if(level===0) {if(node.parent_id!==null||!['upsc','bpsc'].includes(node.id))throw Error('Invalid exam root: '+node.id);}
    else if(!node.parent_id||map.get(node.parent_id)?.node_type!==levels[level-1])throw Error('Missing parent, invalid level or cycle: '+node.id);
  }
  for(const exam of ['upsc','bpsc']) {
    if(!map.has(exam))throw Error('Missing exam '+exam);
    for(const stage of ['Prelims','Mains'])if(!seed.nodes.some(n=>n.parent_id===exam&&n.name===stage&&n.node_type==='stage'))throw Error('Missing '+exam+' '+stage);
  }
  return seed;
}
export async function readSyllabusSeed(path=new URL('./data/syllabus.seed.json',import.meta.url)) {
  return validateSyllabusSeed(JSON.parse(await readFile(path,'utf8')));
}
