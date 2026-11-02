import 'dotenv/config';
import { writeFile,mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { sql } from '../db.ts';
const args=process.argv.slice(2);
const option=(key:string)=>args[args.indexOf(key)+1];
const kind=args.includes('--kind')?option('--kind'):null;
if(kind&&!['study_material','mcq','pyq','current_affairs','planner_block'].includes(kind))throw Error('Invalid --kind.');
try {
  const rows=await sql`
    SELECT 'file_catalog' AS storage,kind,id AS item_id,NULL::integer AS account_id,title,source_locations::text AS source,'' AS syllabus_node_id
      FROM syllabus_content_items WHERE active AND syllabus_node_id IS NULL AND (${kind}::text IS NULL OR kind=${kind})
    UNION ALL
    SELECT 'study_materials','study_material',id::text,account_id,title,'database','' FROM study_materials WHERE syllabus_node_id IS NULL AND (${kind}::text IS NULL OR ${kind}='study_material')
    UNION ALL
    SELECT 'planner_blocks','planner_block',id,account_id,title,'database','' FROM planner_blocks WHERE deleted_at IS NULL AND syllabus_node_id IS NULL AND (${kind}::text IS NULL OR ${kind}='planner_block')
    ORDER BY storage,kind,item_id,account_id
  `;
  const columns=['storage','kind','item_id','account_id','title','source','syllabus_node_id'];
  const cell=(value:unknown)=>'"'+String(value??'').replace(/"/g,'""')+'"';
  const csv=[columns.map(cell).join(','),...rows.map(row=>columns.map(key=>cell(row[key])).join(','))].join('\r\n')+'\r\n';
  if(args.includes('--output')) {const output=option('--output');await mkdir(dirname(output),{recursive:true});await writeFile(output,csv);console.log(`Listed ${rows.length} untagged items in ${output}.`);}
  else process.stdout.write(csv);
} finally {await sql.end();}
