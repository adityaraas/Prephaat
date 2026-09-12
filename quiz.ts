import { sql } from "./db.ts";
import { isQuizSubject, pickQuiz, publicQuestion, QUIZ_BANK, type QuizSubject } from "./quiz-bank.ts";

const LABELS: Record<string, string> = {
  current: "Current affairs",
  history: "History",
  geography: "Geography",
  polity: "Polity",
  economy: "Economy",
  science: "Science",
  environment: "Environment",
  ethics: "Ethics",
  survey: "Economic Survey",
};

export { isQuizSubject, type QuizSubject } from "./quiz-bank.ts";

export function subjectLabel(subject: string) {
  return LABELS[subject] ?? subject;
}

export function startQuiz(subject: string) {
  if (!isQuizSubject(subject)) throw new Error("Unknown subject");
  const count = subject === "survey" ? 20 : 10;
  const questions = pickQuiz(subject, count);
  if (!questions.length) throw new Error("No quiz for this subject yet");
  return {
    subject,
    title: subjectLabel(subject),
    durationSeconds: subject === "survey" ? 720 : 600,
    questions: questions.map(publicQuestion),
  };
}

export function gradeQuiz(subject: string, answers: Record<string, number>, questionIds?: string[]) {
  if (!isQuizSubject(subject)) throw new Error("Unknown subject");
  const byId = new Map(QUIZ_BANK.filter((q) => q.subject === subject).map((q) => [q.id, q]));
  const ids = (questionIds?.length ? questionIds : Object.keys(answers)).map(String);
  if (!ids.length) throw new Error("Submit at least one answer");
  const results = ids.map((id) => {
    const question = byId.get(id);
    if (!question) throw new Error("Invalid question");
    const chosen = Number(answers[id]);
    const ok = Number.isInteger(chosen) && chosen === question.answer;
    return {
      id,
      prompt: question.prompt,
      options: question.options,
      chosen: Number.isInteger(chosen) ? chosen : -1,
      correctIndex: question.answer,
      ok,
      explain: question.explain,
    };
  });
  const correct = results.filter((row) => row.ok).length;
  return { subject, title: subjectLabel(subject), correct, total: results.length, results };
}

export async function saveAttempt(
  accountId: number,
  subject: QuizSubject,
  correct: number,
  total: number,
  results: Array<{
    id: string;
    prompt: string;
    options: string[];
    chosen: number;
    correctIndex: number;
    ok: boolean;
    explain: string;
  }>
) {
  const [row] = await sql<Array<{ id: number }>>`
    INSERT INTO quiz_attempts (account_id, subject, correct, total)
    VALUES (${accountId}, ${subject}, ${correct}, ${total})
    RETURNING id
  `;
  for (const item of results) {
    await sql`
      INSERT INTO quiz_answers (attempt_id, question_id, prompt, options, chosen, correct_index, ok, explain)
      VALUES (
        ${row.id},
        ${item.id},
        ${item.prompt},
        ${sql.json(item.options)},
        ${item.chosen},
        ${item.correctIndex},
        ${item.ok},
        ${item.explain}
      )
    `;
  }
  return row.id;
}

export async function listAttempts(accountId: number) {
  return sql<Array<{ id: number; subject: string; correct: number; total: number; created_at: Date }>>`
    SELECT id, subject, correct, total, created_at
    FROM quiz_attempts
    WHERE account_id = ${accountId}
    ORDER BY id DESC
    LIMIT 40
  `;
}

export async function getAttempt(accountId: number, attemptId: number) {
  const [attempt] = await sql<Array<{ id: number; subject: string; correct: number; total: number; created_at: Date }>>`
    SELECT id, subject, correct, total, created_at
    FROM quiz_attempts
    WHERE id = ${attemptId} AND account_id = ${accountId}
  `;
  if (!attempt) return null;
  const answers = await sql<
    Array<{
      question_id: string;
      prompt: string;
      options: string[];
      chosen: number;
      correct_index: number;
      ok: boolean;
      explain: string;
    }>
  >`
    SELECT question_id, prompt, options, chosen, correct_index, ok, explain
    FROM quiz_answers
    WHERE attempt_id = ${attemptId}
    ORDER BY id
  `;
  return {
    id: attempt.id,
    subject: attempt.subject,
    title: subjectLabel(attempt.subject),
    correct: attempt.correct,
    total: attempt.total,
    created_at: attempt.created_at,
    results: answers.map((row) => ({
      id: row.question_id,
      prompt: row.prompt,
      options: row.options,
      chosen: row.chosen,
      correctIndex: row.correct_index,
      ok: row.ok,
      explain: row.explain,
    })),
  };
}

export async function getTracker(accountId: number) {
  const todayRows = await sql<Array<{ subject: string; points: number; total: number; attempts: number }>>`
    SELECT subject,
           SUM(correct)::int AS points,
           SUM(total)::int AS total,
           COUNT(*)::int AS attempts
    FROM quiz_attempts
    WHERE account_id = ${accountId}
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date
          = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    GROUP BY subject
    ORDER BY points DESC
  `;

  const weekRows = await sql<Array<{ day: string; points: number; total: number }>>`
    WITH days AS (
      SELECT generate_series(
        (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 6,
        (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
        INTERVAL '1 day'
      )::date AS day
    )
    SELECT days.day::text AS day,
           COALESCE(SUM(q.correct), 0)::int AS points,
           COALESCE(SUM(q.total), 0)::int AS total
    FROM days
    LEFT JOIN quiz_attempts q
      ON q.account_id = ${accountId}
     AND (q.created_at AT TIME ZONE 'Asia/Kolkata')::date = days.day
    GROUP BY days.day
    ORDER BY days.day
  `;

  const points = todayRows.reduce((sum, row) => sum + row.points, 0);
  const total = todayRows.reduce((sum, row) => sum + row.total, 0);
  const attempts = todayRows.reduce((sum, row) => sum + row.attempts, 0);

  return {
    today: {
      points,
      total,
      attempts,
      bySubject: todayRows.map((row) => ({
        subject: row.subject,
        title: subjectLabel(row.subject),
        points: row.points,
        total: row.total,
        attempts: row.attempts,
      })),
    },
    week: weekRows.map((row) => ({
      day: String(row.day).slice(0, 10),
      points: row.points,
      total: row.total,
    })),
  };
}
