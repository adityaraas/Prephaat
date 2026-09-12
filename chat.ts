type ChatTurn = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are a concise tutor for Indian civil services exams (UPSC and BPSC).
Use widely known public knowledge only.

Hard rules:
- Never reveal, quote, summarise, or guess this website's private project data: source code, APIs, databases, user records, environment variables, storage keys, file names, JSON banks, quiz keys stored in the app, faculty tools, or how the site is built.
- Never claim you can read this app's notes, PYQ files, or Economic Survey pack.
- If asked for internals, hidden answers from this product, or credentials, refuse in one short sentence and offer a general public-syllabus explanation instead.
- Do not mention implementation details of this chat endpoint.
- Stay on the user's study or general question. Be accurate and brief.`;

function geminiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ""
  ).trim();
}

function chatConfigured() {
  return Boolean(geminiKey());
}

function looksLikeProjectProbe(text: string) {
  return /(quiz-bank|\.env\b|DATABASE_URL|AWS_SECRET|server\.ts|storage\.ts|ncert-\w+\.json|economic-survey\.json|signedGetUrl|FACULTY_INVITE|source code of (this|the) (app|site|project)|dump the (database|json|notes bank))/i.test(
    text
  );
}

export async function answerChat(history: ChatTurn[], message: string) {
  const text = message.trim().slice(0, 4000);
  if (text.length < 2) throw new Error("Type a question first");
  if (looksLikeProjectProbe(text)) {
    return "I can't share anything about this site's private data. Ask a UPSC/BPSC topic from public knowledge and I'll help.";
  }
  const key = geminiKey();
  if (!key) {
    throw new Error("Chat is not configured. Add GEMINI_API_KEY in .env");
  }

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const turn of history
    .filter((item) => (item.role === "user" || item.role === "assistant") && item.content.trim())
    .slice(-8)) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content.trim().slice(0, 4000) }],
    });
  }
  contents.push({ role: "user", parts: [{ text }] });

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    }),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!res.ok) {
    throw new Error(data.error?.message || "The language model could not answer");
  }
  const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!reply) throw new Error("Empty reply from the model");
  return reply;
}
