import 'dotenv/config';
import { sql } from '../db.ts';
import { validateSyllabusTag } from '../syllabus.ts';
const args=process.argv.slice(2),arg=(key:string)=>args.includes(key)?args[args.indexOf(key)+1]:undefined;
const storage=arg('--storage'),kind=arg('--kind'),id=arg('--id'),value=arg('--node');
if(!id||!storage||!value)throw Error('Use --storage, --id and --node (or --node null). File catalog items also require --kind; planner blocks require --account-id.');
try {
  const node=await validateSyllabusTag(value==='null'?null:value);
  let rows;
  if(storage==='file_catalog') {
    if(!['study_material','mcq','pyq','current_affairs'].includes(kind||''))throw Error('Invalid --kind.');
    rows=await sql`UPDATE syllabus_content_items SET syllabus_node_id=${node},updated_at=NOW() WHERE kind=${kind!} AND id=${id} AND active RETURNING id`;
  } else if(storage==='study_materials') {
    if(!/^\d+$/.test(id))throw Error('Invalid study material ID.');
    rows=await sql`UPDATE study_materials SET syllabus_node_id=${node} WHERE id=${Number(id)} RETURNING id`;
  } else if(storage==='planner_blocks') {
    const owner=arg('--account-id');if(!owner||!/^\d+$/.test(owner))throw Error('A planner block requires --account-id.');
    rows=await sql`UPDATE planner_blocks SET syllabus_node_id=${node},updated_at=NOW() WHERE id=${id} AND account_id=${Number(owner)} AND deleted_at IS NULL RETURNING id`;
  } else throw Error('Invalid --storage.');
  if(!rows.length)throw Error('Item not found.');
  console.log(`Updated ${storage} item ${id}.`);
} finally {await sql.end();}
