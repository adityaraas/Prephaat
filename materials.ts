import { sql } from "./db.ts";
import { SUBJECTS } from "./quiz-bank.ts";

export function isSubjectKey(value: string) {
  return (SUBJECTS as readonly string[]).includes(value) || value === "current";
}

export async function listPublishedMaterials(subject?: string) {
  if (subject) {
    return sql<Array<{ id: number; subject: string; title: string; body: string; class_tag: string | null; created_at: Date; author: string; syllabus_node_id: string|null }>>`
      SELECT m.id, m.subject, m.title, m.body, m.class_tag, m.created_at, a.name AS author, m.syllabus_node_id
      FROM study_materials m
      JOIN accounts a ON a.id = m.account_id
      WHERE m.published = TRUE AND m.subject = ${subject}
      ORDER BY m.id DESC
      LIMIT 80
    `;
  }
  return sql<Array<{ id: number; subject: string; title: string; body: string; class_tag: string | null; created_at: Date; author: string; syllabus_node_id: string|null }>>`
    SELECT m.id, m.subject, m.title, m.body, m.class_tag, m.created_at, a.name AS author, m.syllabus_node_id
    FROM study_materials m
    JOIN accounts a ON a.id = m.account_id
    WHERE m.published = TRUE
    ORDER BY m.id DESC
    LIMIT 80
  `;
}

export async function listFacultyMaterials(accountId: number) {
  return sql<Array<{ id: number; subject: string; title: string; published: boolean; created_at: Date; syllabus_node_id:string|null }>>`
    SELECT id, subject, title, published, created_at
    FROM study_materials
    WHERE account_id = ${accountId}
    ORDER BY id DESC
    LIMIT 50
  `;
}

export async function addMaterial(
  accountId: number,
  subject: string,
  title: string,
  body: string,
  classTag: string | null,
  syllabusNodeId: string | null = null
) {
  const [row] = await sql<Array<{ id: number }>>`
    INSERT INTO study_materials (account_id, subject, title, body, class_tag, published, syllabus_node_id)
    VALUES (${accountId}, ${subject}, ${title}, ${body}, ${classTag}, TRUE, ${syllabusNodeId})
    RETURNING id
  `;
  return row.id;
}

export async function deleteMaterial(accountId: number, id: number) {
  const rows = await sql<Array<{ id: number }>>`
    DELETE FROM study_materials
    WHERE id = ${id} AND account_id = ${accountId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function promoteToFaculty(accountId: number, code: string) {
  const expected = (process.env.FACULTY_INVITE ?? "prephaat-faculty").trim();
  if (!code || code !== expected) throw new Error("Invalid faculty invite code");
  await sql`UPDATE accounts SET role = 'faculty' WHERE id = ${accountId}`;
}
