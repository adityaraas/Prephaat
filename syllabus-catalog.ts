import { sql } from './db.ts';
import { syllabusInventory } from './syllabus-inventory.ts';
import { validateSyllabusTag } from './syllabus.ts';
export async function syncSyllabusCatalog() {
  const items=await syllabusInventory();
  await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(7317,993)`;
    for(const tag of new Set(items.map(item=>item.syllabus_node_id).filter(Boolean)))await validateSyllabusTag(tag,tx);
    await tx`UPDATE syllabus_content_items SET active=false`;
    await tx`
      INSERT INTO syllabus_content_items(kind,id,title,source_locations,syllabus_node_id,active)
      SELECT kind,id,title,source_locations,syllabus_node_id,true FROM jsonb_to_recordset(${tx.json(items)}) AS x(kind text,id text,title text,source_locations jsonb,syllabus_node_id text)
      ON CONFLICT(kind,id) DO UPDATE SET title=EXCLUDED.title,source_locations=EXCLUDED.source_locations,active=true,
        syllabus_node_id=COALESCE(syllabus_content_items.syllabus_node_id,EXCLUDED.syllabus_node_id),updated_at=NOW()
    `;
  });
  return items.length;
}
