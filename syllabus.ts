import type { TransactionSql } from 'postgres';
import { sql } from './db.ts';
import { readSyllabusSeed } from './syllabus-seed.ts';

export class SyllabusError extends Error { constructor(message:string,public status=400){super(message);} }
export async function seedSyllabus() {
  const seed=await readSyllabusSeed();
  await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(7317,992)`;
    const sources=Object.entries(seed.sources).map(([id,source])=>({id,title:source.title,url:source.url,details:source}));
    await tx`INSERT INTO syllabus_sources(id,title,url,details) SELECT id,title,url,details FROM jsonb_to_recordset(${tx.json(sources)}) AS s(id text,title text,url text,details jsonb) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,url=EXCLUDED.url,details=EXCLUDED.details`;
    await tx`UPDATE syllabus_nodes SET active=false WHERE seed_managed`;
    const nodes=seed.nodes.map(node=>({...node,coverage:node.coverage??null}));
    await tx`
      INSERT INTO syllabus_nodes(id,parent_id,node_type,name,display_order,source_id,source_ref,coverage,seed_managed,active)
      SELECT id,parent_id,node_type,name,display_order,source_id,source_ref,coverage,true,true
      FROM jsonb_to_recordset(${tx.json(nodes)}) AS n(id text,parent_id text,node_type text,name text,display_order integer,source_id text,source_ref text,coverage text)
      ON CONFLICT(id) DO UPDATE SET parent_id=EXCLUDED.parent_id,node_type=EXCLUDED.node_type,name=EXCLUDED.name,display_order=EXCLUDED.display_order,source_id=EXCLUDED.source_id,source_ref=EXCLUDED.source_ref,coverage=EXCLUDED.coverage,seed_managed=true,active=true
    `;
  });
  return seed.nodes.length;
}
export async function getSyllabusTree(exam:string|null) {
  if(exam&&!['upsc','bpsc'].includes(exam))throw new SyllabusError('Choose upsc or bpsc.');
  const nodes=await sql`
    WITH RECURSIVE tree AS (
      SELECT n.*,n.id AS exam_id,ARRAY[n.display_order] AS sort_path FROM syllabus_nodes n WHERE parent_id IS NULL AND active
      UNION ALL
      SELECT c.*,p.exam_id,p.sort_path||c.display_order FROM syllabus_nodes c JOIN tree p ON c.parent_id=p.id WHERE c.active
    )
    SELECT id,parent_id,node_type,name,display_order,source_id,source_ref,coverage FROM tree
    WHERE (${exam}::text IS NULL OR exam_id=${exam}) ORDER BY sort_path,id
  `;
  return {nodes};
}
export async function validateSyllabusTag(value:unknown,db:TransactionSql|typeof sql=sql):Promise<string|null> {
  if(value==null)return null;
  if(typeof value!=='string'||!value||value.length>500)throw new SyllabusError('Invalid syllabus_node_id.');
  const [node]=await db`SELECT id FROM syllabus_nodes WHERE id=${value} AND active`;
  if(!node)throw new SyllabusError('Syllabus node not found or inactive.');
  return value;
}
export async function contentSyllabusTags(kind:string,ids:string[]) {
  if(!['study_material','mcq','pyq','current_affairs'].includes(kind))throw new SyllabusError('Invalid content kind.');
  if(ids.length>1000)throw new SyllabusError('Request up to 1,000 content IDs at a time.');
  const rows=ids.length?await sql`SELECT id,syllabus_node_id FROM syllabus_content_items WHERE kind=${kind} AND active AND id=ANY(${ids})`:[];
  return new Map(rows.map(row=>[row.id,row.syllabus_node_id as string|null]));
}
