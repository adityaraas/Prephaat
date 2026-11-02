import 'dotenv/config';
import { sql } from '../db.ts';
import { ensureAuthTables } from '../schema.ts';
import { seedSyllabus } from '../syllabus.ts';
import { syncSyllabusCatalog } from '../syllabus-catalog.ts';
try {
  await ensureAuthTables();
  const nodes=await seedSyllabus();
  const items=await syncSyllabusCatalog();
  console.log(`Seeded ${nodes} syllabus nodes; indexed ${items} file-backed content items. Existing tags preserved.`);
} finally {await sql.end();}
