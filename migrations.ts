import { readFile } from 'node:fs/promises';
import { sql } from './db.ts';

export async function runMigrations() {
  const migrations=['001_syllabus_tree.sql','002_syllabus_progress.sql'];
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  for(const version of migrations) {
    const text=await readFile(new URL('./migrations/'+version,import.meta.url),'utf8');
    await sql.begin(async tx=>{
      await tx`SELECT pg_advisory_xact_lock(7317,991)`;
      const [done]=await tx`SELECT version FROM schema_migrations WHERE version=${version}`;
      if(done)return;
      await tx.unsafe(text);
      await tx`INSERT INTO schema_migrations(version) VALUES (${version})`;
    });
  }
}
