import { sql } from "./db.ts";
import { readFileSync } from "node:fs";
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

type ExamQuestion = { id: string; q: string; n?: number; year?: number; options?: string[]; answer?: number; topic?: string; solution?: string; marks?: number };
const PYQ = JSON.parse(readFileSync(new URL("./public/data/pyq-upsc.json", import.meta.url), "utf8")) as { papers: Array<{ exam: string; stage: string; year: number; paper: string; questions: ExamQuestion[] }> };
const SUBJECT_TESTS = ["history", "geography", "polity", "economy", "science", "environment"];
const topicSubject: Record<string, string> = { "History & Culture": "history", History: "history", Ancient: "history", Medieval: "history", Modern: "history", Culture: "history", Geography: "geography", Polity: "polity", Economy: "economy", Environment: "environment", Disaster: "environment", Science: "science", "S&T": "science", "Science & Technology": "science" };
const prelimQuestions = PYQ.papers.filter((paper) => paper.exam === "upsc" && paper.stage === "prelims").flatMap((paper) => paper.questions.map((question) => ({ ...question, year: paper.year })));
const mainsQuestions = PYQ.papers.filter((paper) => paper.exam === "upsc" && paper.stage === "mains").flatMap((paper) => paper.questions.map((question) => ({ ...question, topic: question.topic ?? paper.paper })));

export function startTest(stage: string, testId: string, subject = "") {
  if (stage === "prelims") {
    let questions: any[];
    let title: string;
    let durationSeconds: number;
    if (/^mock-[1-5]$/.test(testId)) {
      const variant = Number(testId.split("-")[1]);
      // Build five distinct 100-question forms from the available UPSC PYQs across years.
      questions = prelimQuestions.map((q, index) => ({ q, rank: (index * (37 + variant * 2) + variant * 53) % 997 })).sort((a, b) => a.rank - b.rank).slice(0, 100).map(({ q }) => q);
      title = `Full-length Prelims mock ${variant}`;
      durationSeconds = 7200;
    } else if (/^subject-(history|geography|polity|economy|science|environment)-[1-5]$/.test(testId)) {
      const [, id, formText] = testId.match(/^subject-(history|geography|polity|economy|science|environment)-([1-5])$/)!;
      const form = Number(formText);
      const source = QUIZ_BANK.filter((q) => q.subject === id);
      if (!source.length) throw new Error("No questions available for this subject yet");
      const count = Math.min(10, source.length);
      questions = Array.from({ length: count }, (_, index) => source[(index + form - 1) % source.length]);
      title = `${subjectLabel(id)} subject test ${form}`;
      durationSeconds = 1200;
      subject = id;
    } else throw new Error("Unknown test paper");
    return { stage, testId, subject: subject || "mock", title, durationSeconds, marksPerCorrect: 2, negativeMarks: 2 / 3, questions: questions.map((q) => "prompt" in q ? publicQuestion(q) : ({ id: q.id, prompt: q.q, options: q.options, topic: q.topic })) };
  }
  if (stage === "mains" && /^mains-(gs|subject-(history|geography|polity|economy|science|environment))$/.test(testId)) {
    const filterSubject = testId.includes("subject-") ? testId.split("subject-")[1] : "";
    const selected = mainsQuestions.filter((q) => !filterSubject || topicSubject[q.topic ?? ""] === filterSubject);
    if (!selected.length) throw new Error("No Mains questions found for this paper yet");
    const questions = selected.map((q) => ({ id: q.id, prompt: q.q, topic: q.topic, marks: q.marks ?? 10, wordLimit: q.marks === 15 ? 250 : 150 }));
    return { stage, testId, subject: filterSubject || "mains", title: filterSubject ? `${subjectLabel(filterSubject)} Mains practice` : "Mixed GS Mains practice", durationSeconds: Math.max(900, questions.length * 540), questions };
  }
  throw new Error("Unknown test paper");
}

export function gradeTest(stage: string, testId: string, subject: string, ids: string[], answers: Record<string, number>, responses: Record<string, string>, awarded: Record<string, number>) {
  const test = startTest(stage, testId, subject);
  const allowed = new Map(test.questions.map((q: any) => [q.id, q]));
  if (!ids.length || ids.some((id) => !allowed.has(id))) throw new Error("Invalid question list");
  if (stage === "prelims") {
    const questions = new Map<string, any>();
    for (const q of prelimQuestions) questions.set(q.id, { ...q, prompt: q.q, explain: q.solution ?? "" });
    for (const q of QUIZ_BANK) questions.set(q.id, q);
    const results = ids.map((id) => {
      const q = questions.get(id); if (!q || !allowed.has(id)) throw new Error("Invalid question");
      const chosen = Number.isInteger(Number(answers[id])) ? Number(answers[id]) : -1;
      const ok = chosen >= 0 && chosen === q.answer;
      const marks = ok ? 2 : chosen >= 0 ? -2 / 3 : 0;
      return { id, prompt: q.prompt, options: q.options, chosen, correctIndex: q.answer, ok, explain: q.explain ?? "", marks_awarded: marks, response: "", max_marks: 2, word_limit: 0, topic: q.topic ?? subjectLabel(subject) };
    });
    const correct = results.filter((r) => r.ok).length;
    const wrong = results.filter((r) => r.chosen >= 0 && !r.ok).length;
    return { stage, testId, subject, title: test.title, correct, wrong, total: results.length, score: results.reduce((sum, r) => sum + r.marks_awarded, 0), maxScore: results.length * 2, results };
  }
  const results = ids.map((id) => {
    const q: any = allowed.get(id);
    const source = mainsQuestions.find((item) => item.id === id);
    const response = String(responses[id] ?? "").slice(0, 20000);
    const mark = Math.max(0, Math.min(Number(q.marks), Number(awarded[id]) || 0));
    const wordCount = response.trim() ? response.trim().split(/\s+/).length : 0;
    return { id, prompt: q.prompt, options: [], chosen: -1, correctIndex: -1, ok: false, explain: source?.solution ?? "", response, marks_awarded: mark, max_marks: Number(q.marks), marks: Number(q.marks), word_limit: Number(q.wordLimit), wordLimit: Number(q.wordLimit), topic: q.topic, wordCount };
  });
  return { stage, testId, subject, title: test.title, correct: 0, wrong: 0, total: results.length, score: results.reduce((sum, r) => sum + r.marks_awarded, 0), maxScore: results.reduce((sum, r) => sum + Number((allowed.get(r.id) as any).marks), 0), results };
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
    response?: string;
    marks_awarded?: number;
    max_marks?: number;
    word_limit?: number;
    topic?: string;
  }>, stage = "prelims", testId = `subject-${subject}-1`, score = correct, maxScore = total
) {
  const [row] = await sql<Array<{ id: number }>>`
    INSERT INTO quiz_attempts (account_id, subject, correct, total, stage, test_id, score, max_score)
    VALUES (${accountId}, ${subject}, ${correct}, ${total}, ${stage}, ${testId}, ${score}, ${maxScore})
    RETURNING id
  `;
  for (const item of results) {
    await sql`
      INSERT INTO quiz_answers (attempt_id, question_id, prompt, options, chosen, correct_index, ok, explain, response, marks_awarded, max_marks, word_limit, topic)
      VALUES (
        ${row.id},
        ${item.id},
        ${item.prompt},
        ${sql.json(item.options)},
        ${item.chosen},
        ${item.correctIndex},
        ${item.ok},
        ${item.explain}, ${item.response ?? ""}, ${item.marks_awarded ?? 0}, ${item.max_marks ?? 2}, ${item.word_limit ?? 0}, ${item.topic ?? ""}
      )
    `;
  }
  return row.id;
}

export async function listAttempts(accountId: number) {
  return sql<Array<{ id: number; subject: string; correct: number; total: number; stage: string; test_id: string; score: number; max_score: number; created_at: Date }>>`
    SELECT id, subject, correct, total, stage, test_id, score, max_score, created_at
    FROM quiz_attempts
    WHERE account_id = ${accountId}
    ORDER BY id DESC
    LIMIT 40
  `;
}

export async function getAttempt(accountId: number, attemptId: number) {
  const [attempt] = await sql<Array<{ id: number; subject: string; correct: number; total: number; stage: string; test_id: string; score: number; max_score: number; created_at: Date }>>`
    SELECT id, subject, correct, total, stage, test_id, score, max_score, created_at
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
      response: string;
      marks_awarded: number;
      max_marks: number;
      word_limit: number;
      topic: string;
    }>
  >`
    SELECT question_id, prompt, options, chosen, correct_index, ok, explain, response, marks_awarded, max_marks, word_limit, topic
    FROM quiz_answers
    WHERE attempt_id = ${attemptId}
    ORDER BY id
  `;
  const mappedResults = answers.map((row) => ({
    id: row.question_id,
    prompt: row.prompt,
    options: row.options,
    chosen: row.chosen,
    correctIndex: row.correct_index,
    ok: row.ok,
    explain: row.explain,
    response: row.response,
    marks_awarded: Number(row.marks_awarded),
    marks: Number(row.max_marks),
    wordLimit: Number(row.word_limit),
    topic: row.topic,
  }));
  const label = attempt.test_id.startsWith("mock-") ? `Full-length Prelims ${attempt.test_id.slice(-1)}` : attempt.test_id.replace(/^subject-/, "").replaceAll("-", " ");
  return {
    id: attempt.id,
    subject: attempt.subject,
    stage: attempt.stage,
    testId: attempt.test_id,
    title: label,
    correct: attempt.correct,
    total: attempt.total,
    score: Number(attempt.score),
    maxScore: Number(attempt.max_score),
    created_at: attempt.created_at,
    wrong: mappedResults.filter((row) => row.chosen >= 0 && !row.ok).length,
    results: mappedResults,
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
