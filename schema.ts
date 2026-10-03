import { sql } from "./db.ts";

export async function ensureAuthTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      mobile_no VARCHAR(10),
      email VARCHAR(160) NOT NULL UNIQUE,
      password_hash TEXT,
      google_id VARCHAR(64) UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE accounts ALTER COLUMN mobile_no DROP NOT NULL`;
  await sql`ALTER TABLE accounts ALTER COLUMN password_hash DROP NOT NULL`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS google_id VARCHAR(64) UNIQUE`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      subject VARCHAR(40) NOT NULL,
      correct INTEGER NOT NULL,
      total INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS stage VARCHAR(16) NOT NULL DEFAULT 'prelims'`;
  await sql`ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS test_id VARCHAR(80) NOT NULL DEFAULT 'subject-history-1'`;
  await sql`ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS score NUMERIC(8,2) NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS max_score NUMERIC(8,2) NOT NULL DEFAULT 0`;

  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'`;

  await sql`
    CREATE TABLE IF NOT EXISTS quiz_answers (
      id SERIAL PRIMARY KEY,
      attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      options JSONB NOT NULL,
      chosen INTEGER NOT NULL,
      correct_index INTEGER NOT NULL,
      ok BOOLEAN NOT NULL,
      explain TEXT NOT NULL
    )
  `;
  await sql`ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS response TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS marks_awarded NUMERIC(6,2) NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS max_marks INTEGER NOT NULL DEFAULT 2`;
  await sql`ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS word_limit INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT ''`;

  await sql`
    CREATE TABLE IF NOT EXISTS study_materials (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      subject VARCHAR(40) NOT NULL,
      title VARCHAR(200) NOT NULL,
      body TEXT NOT NULL,
      class_tag VARCHAR(40),
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}
