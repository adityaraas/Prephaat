import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extraBank } from "./pyq-extra.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tools = join(process.env.USERPROFILE || process.env.HOME, ".cursor", "projects", "c-Users-adity-web-dev-projects-bpsc", "agent-tools");

function clean(text) {
  return String(text || "")
    .replace(/\|\s*---\s*\|/g, " ")
    .replace(/\|/g, " ")
    .replace(/\[here\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function letterIndex(letter) {
  const L = String(letter || "").toUpperCase();
  return { A: 0, B: 1, C: 2, D: 3 }[L];
}

function splitMcq(block) {
  const raw = block.replace(/\r/g, "").trim();
  const match = raw.match(/^(\d+)\.\s*/);
  if (!match) return null;
  const n = Number(match[1]);
  const body = raw.slice(match[0].length);
  const optAt = body.search(/\([A-Da-d]\)/);
  if (optAt < 0) return { n, q: clean(body), options: [] };
  const stem = clean(body.slice(0, optAt));
  const optionChunk = body.slice(optAt);
  const bits = optionChunk.split(/\s*(?=\([A-Da-d]\))/).filter((bit) => /^\([A-Da-d]\)/.test(bit.trim()));
  const options = bits.slice(0, 4).map((bit) => clean(bit.replace(/^\([A-Da-d]\)\s*/, "")));
  return { n, q: stem, options };
}

function hasMcqOptions(text) {
  const found = [...text.matchAll(/\(([A-Da-d])\)/g)].map((m) => m[1].toUpperCase());
  return new Set(found).has("D") || found.length >= 3;
}

function parseNumbered(text, stopRe) {
  const cut = stopRe ? text.split(stopRe)[0] : text;
  const startAt = cut.search(/\n1\.\s/);
  const body = (startAt >= 0 ? cut.slice(startAt + 1) : cut).replace(/\r/g, "");
  const lines = body.split("\n");
  const chunks = [];
  let expected = 1;
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const item = splitMcq(buf.join("\n"));
    if (item) chunks.push(item);
    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^(\d{1,3})\.\s/);
    const n = m ? Number(m[1]) : -1;
    const readyForNext = expected > 1 && hasMcqOptions(buf.join("\n"));
    if (n === expected && (expected === 1 || readyForNext)) {
      flush();
      buf = [line];
      expected += 1;
    } else {
      buf.push(line);
    }
  }
  flush();
  return chunks.filter((item) => item.n >= 1 && item.n <= 150);
}

function parseKeyTable(text) {
  const map = {};
  const chunk = text.split(/### ANSWER KEY/i)[1] || "";
  const re = /\|\s*(\d+)\s*\|\s*(A|B|C|D|Del)\s*/gi;
  let m;
  while ((m = re.exec(chunk))) map[Number(m[1])] = m[2].toUpperCase() === "DEL" ? "DEL" : m[2].toUpperCase();
  return map;
}

function parseCompass(text) {
  const blocks = text.split(/\|\s*Qn\.\s*No\.?\s*/i).slice(1);
  return blocks.map((block) => {
    const num = Number((block.match(/^(\d+)/) || [])[1]);
    const answer = ((block.match(/\|\s*Answer\s*\|\s*\(([a-d])\)/i) || [])[1] || "").toUpperCase();
    const explanation = clean((block.match(/\|\s*Explanation\s*\|\s*([^|]*)/i) || [])[1] || "");
    const subject = clean((block.match(/\|\s*Subject\s*\|\s*([^|]*)/i) || [])[1] || "");
    return { n: num, answer, explanation, subject };
  }).filter((row) => row.n);
}

function solutionFromFacts(letter, explanation, chosen) {
  const fact = explanation.replace(/\s+/g, " ").trim();
  const short = fact.length > 380 ? `${fact.slice(0, 380).replace(/\s+\S*$/, "")}.` : fact;
  const pick = chosen ? ` (${chosen})` : "";
  if (short) return `Correct option: ${letter}${pick}. ${short}`;
  return `Correct option: ${letter}${pick}. Eliminate options that contradict the Constitution, a standard definition, or a named institution in the stem.`;
}

function packPaper({ exam, year, stage, paper, official, questions, note }) {
  return { exam, year, stage, paper, official, note: note || "", questions };
}

async function buildUpscPrelims2024() {
  const qsText = await readFile(join(tools, "a5a29628-c57f-4dcb-a64f-44b0b15cf21b.txt"), "utf8");
  const keyText = await readFile(join(tools, "133d91bc-f5bb-4571-926e-457a3bcc4896.txt"), "utf8");
  const questions = parseNumbered(qsText, /\nA detailed analysis/);
  const key = parseCompass(keyText);
  const byN = Object.fromEntries(key.map((row) => [row.n, row]));
  const packed = questions
    .map((q) => {
      if (q.n === 68 && q.options.length === 3) q.options.unshift("Fig");
      if (q.options.length !== 4) return null;
      const meta = byN[q.n] || {};
      const letter = meta.answer;
      const idx = letterIndex(letter);
      return {
        id: `upsc-pre-2024-${q.n}`,
        n: q.n,
        q: q.q,
        options: q.options,
        answer: idx,
        topic: meta.subject || "GS",
        solution: solutionFromFacts(letter || "—", meta.explanation || "", q.options[idx] || ""),
      };
    })
    .filter(Boolean);
  return packPaper({
    exam: "upsc",
    year: 2024,
    stage: "prelims",
    paper: "GS Paper I",
    official: "https://www.upsc.gov.in/examinations/previous-question-papers",
    note: "Full GS Paper I set with PrepHaat solutions. Official PDFs stay on upsc.gov.in.",
    questions: packed,
  });
}

async function buildBpsc(file, year, cycle, paperDate) {
  const text = await readFile(join(tools, file), "utf8");
  const questions = parseNumbered(text, /### ANSWER KEY/);
  const key = parseKeyTable(text);
  const packed = questions.map((q) => {
    const letter = key[q.n];
    if (letter === "DEL") {
      return {
        id: `bpsc-${cycle}-pre-${q.n}`,
        n: q.n,
        q: q.q,
        options: q.options,
        answer: null,
        cancelled: true,
        topic: "BPSC GS",
        solution: "This item was deleted in the official answer key. Do not count it.",
      };
    }
    const idx = letterIndex(letter);
    return {
      id: `bpsc-${cycle}-pre-${q.n}`,
      n: q.n,
      q: q.q,
      options: q.options,
      answer: idx,
      topic: "BPSC GS",
      solution: solutionFromFacts(letter || "—", "", q.options[idx] || ""),
    };
  });
  return packPaper({
    exam: "bpsc",
    year,
    stage: "prelims",
    paper: `${cycle} CCE GS (Prelims)`,
    official: "https://www.bpsc.bih.nic.in/",
    note: `${paperDate}. Full GS booklet with official-key mapping and PrepHaat solutions.`,
    questions: packed,
  });
}

async function main() {
  const upsc2024 = await buildUpscPrelims2024();
  const bpsc69 = await buildBpsc("7defd222-c618-4813-b040-91b7b1c6aad5.txt", 2023, "69th", "Held 30 Sep 2023");
  const bpsc70 = await buildBpsc("b2aa414b-e8f2-455c-a1ef-97f4e7859896.txt", 2024, "70th", "Held 13 Dec 2024");

  const upsc = [upsc2024, ...extraBank.upsc];
  const bpsc = [bpsc69, bpsc70, ...extraBank.bpsc];

  const index = {
    official: {
      upsc: "https://www.upsc.gov.in/examinations/previous-question-papers",
      bpsc: "https://www.bpsc.bih.nic.in/",
    },
    exams: [
      {
        id: "upsc",
        title: "UPSC CSE",
        prelimsYears: [...new Set(upsc.filter((p) => p.stage === "prelims").map((p) => p.year))].sort((a, b) => b - a),
        mainsYears: [...new Set(upsc.filter((p) => p.stage === "mains").map((p) => p.year))].sort((a, b) => b - a),
      },
      {
        id: "bpsc",
        title: "BPSC CCE",
        prelimsYears: [...new Set(bpsc.filter((p) => p.stage === "prelims").map((p) => p.year))].sort((a, b) => b - a),
        mainsYears: [...new Set(bpsc.filter((p) => p.stage === "mains").map((p) => p.year))].sort((a, b) => b - a),
      },
    ],
  };

  const dir = join(root, "public", "data");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "pyq-index.json"), JSON.stringify(index));
  await writeFile(join(dir, "pyq-upsc.json"), JSON.stringify({ papers: upsc }));
  await writeFile(join(dir, "pyq-bpsc.json"), JSON.stringify({ papers: bpsc }));
  const counts = {
    upscQ: upsc.reduce((n, p) => n + p.questions.length, 0),
    bpscQ: bpsc.reduce((n, p) => n + p.questions.length, 0),
    upscPapers: upsc.length,
    bpscPapers: bpsc.length,
  };
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
