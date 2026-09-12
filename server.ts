import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { sql } from "./db.ts";
import { ensureAuthTables } from "./schema.ts";
import {
  createSession,
  destroySession,
  getAccountFromRequest,
  hashPassword,
  publicAccount,
  sessionCookie,
  verifyPassword,
} from "./auth.ts";
import { getCurrentAffairs } from "./current-affairs.ts";
import { getAttempt, getTracker, gradeQuiz, isQuizSubject, listAttempts, saveAttempt, startQuiz, subjectLabel } from "./quiz.ts";
import { addMaterial, deleteMaterial, listFacultyMaterials, listPublishedMaterials, promoteToFaculty } from "./materials.ts";
import {
  clearGoogleStateCookie,
  createGoogleState,
  exchangeGoogleCode,
  googleAuthUrl,
  googleConfigured,
  upsertGoogleAccount,
  validGoogleState,
} from "./google.ts";
import { SURVEY_KEYS, signedGetUrl } from "./storage.ts";
import { answerChat } from "./chat.ts";

const PORT = Number(process.env.PORT) || 3000;
const publicDir = join(import.meta.dirname, "public");

type UserRow = {
  id: number;
  User_name: string | null;
  DOB: Date | string | null;
  "Mobile no": bigint | number | string | null;
};

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

const pages: Record<string, string> = {
  "/": "index.html",
  "/signup": "signup.html",
  "/home": "home.html",
  "/study": "home.html",
  "/faculty": "faculty.html",
};

function send(
  res: ServerResponse,
  status: number,
  body: unknown,
  type = "application/json; charset=utf-8",
  extraHeaders: Record<string, string | string[]> = {}
) {
  const payload = Buffer.isBuffer(body) || typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", ...extraHeaders });
  res.end(payload);
}

function redirect(res: ServerResponse, location: string, extraHeaders: Record<string, string | string[]> = {}) {
  res.writeHead(302, { Location: location, ...extraHeaders });
  res.end();
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function asObject(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("Request body must be an object");
  return body as Record<string, unknown>;
}

function formatUser(row: UserRow) {
  const dob = row.DOB
    ? row.DOB instanceof Date
      ? row.DOB.toISOString().slice(0, 10)
      : String(row.DOB).slice(0, 10)
    : null;
  return {
    id: row.id,
    user_name: row.User_name,
    dob,
    mobile_no: row["Mobile no"] == null ? null : String(row["Mobile no"]),
  };
}

function parseUserDetails(body: unknown) {
  const input = asObject(body);
  const userName = String(input.user_name ?? "").trim();
  const dob = String(input.dob ?? "").trim();
  const mobileRaw = String(input.mobile_no ?? "").trim();

  if (!userName) throw new Error("Name is required");
  if (userName.length > 120) throw new Error("Name is too long");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new Error("Date of birth is required");
  if (!/^\d{10}$/.test(mobileRaw)) throw new Error("Mobile number must be 10 digits");

  return { userName, dob, mobile: Number(mobileRaw) };
}

function parseSignup(body: unknown) {
  const input = asObject(body);
  const name = String(input.name ?? "").trim();
  const mobileNo = String(input.mobile_no ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");

  if (name.length < 2) throw new Error("Name is required");
  if (name.length > 120) throw new Error("Name is too long");
  if (!/^\d{10}$/.test(mobileNo)) throw new Error("Mobile number must be 10 digits");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email id");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  return { name, mobileNo, email, password };
}

function parseLogin(body: unknown) {
  const input = asObject(body);
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  if (!email || !password) throw new Error("Email and password are required");
  return { email, password };
}

async function requireAccount(req: IncomingMessage, res: ServerResponse) {
  const account = await getAccountFromRequest(req);
  if (!account) {
    send(res, 401, { error: "Please sign in" });
    return null;
  }
  return account;
}

async function requireFaculty(req: IncomingMessage, res: ServerResponse) {
  const account = await requireAccount(req, res);
  if (!account) return null;
  if (account.role !== "faculty") {
    send(res, 403, { error: "Faculty access only" });
    return null;
  }
  return account;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/auth/google") {
      if (!googleConfigured()) {
        redirect(res, "/?error=google-not-configured");
        return;
      }
      const { state, header } = createGoogleState();
      redirect(res, googleAuthUrl(state), { "Set-Cookie": header });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/auth/google/callback") {
      const err = url.searchParams.get("error");
      const code = url.searchParams.get("code") ?? "";
      const state = url.searchParams.get("state") ?? "";
      if (err || !googleConfigured() || !code || !validGoogleState(req, state)) {
        const reason = err ? "google-denied" : "google-failed";
        redirect(res, `/?error=${reason}`, { "Set-Cookie": clearGoogleStateCookie() });
        return;
      }
      try {
        const profile = await exchangeGoogleCode(code);
        if (profile.email_verified === false) {
          redirect(res, "/?error=google-unverified", { "Set-Cookie": clearGoogleStateCookie() });
          return;
        }
        const account = await upsertGoogleAccount(profile);
        const token = await createSession(account.id);
        redirect(res, "/home", {
          "Set-Cookie": [sessionCookie(token, 7 * 24 * 60 * 60), clearGoogleStateCookie()],
        });
      } catch (oauthErr) {
        console.error(oauthErr);
        redirect(res, "/?error=google-failed", { "Set-Cookie": clearGoogleStateCookie() });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/signup") {
      try {
        const { name, mobileNo, email, password } = parseSignup(await readJson(req));
        const passwordHash = await hashPassword(password);
        const [account] = await sql<Array<{ id: number; name: string; email: string; mobile_no: string }>>`
          INSERT INTO accounts (name, mobile_no, email, password_hash)
          VALUES (${name}, ${mobileNo}, ${email}, ${passwordHash})
          RETURNING id, name, email, mobile_no
        `;
        const token = await createSession(account.id);
        send(res, 201, { account: publicAccount(account) }, undefined, {
          "Set-Cookie": sessionCookie(token, 7 * 24 * 60 * 60),
        });
      } catch (err) {
        const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
        const message =
          code === "23505"
            ? "This email is already registered. Please sign in."
            : err instanceof Error
              ? err.message
              : "Could not create account";
        send(res, 400, { error: message });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      try {
        const { email, password } = parseLogin(await readJson(req));
        const [account] = await sql<Array<{ id: number; name: string; email: string; mobile_no: string | null; password_hash: string | null }>>`
          SELECT id, name, email, mobile_no, password_hash
          FROM accounts
          WHERE email = ${email}
        `;
        if (!account?.password_hash) {
          send(res, 401, {
            error: account ? "This account uses Google. Please sign in with Google." : "Invalid email or password",
          });
          return;
        }
        if (!(await verifyPassword(password, account.password_hash))) {
          send(res, 401, { error: "Invalid email or password" });
          return;
        }
        const token = await createSession(account.id);
        send(res, 200, { account: publicAccount(account) }, undefined, {
          "Set-Cookie": sessionCookie(token, 7 * 24 * 60 * 60),
        });
      } catch (err) {
        send(res, 400, { error: err instanceof Error ? err.message : "Could not sign in" });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      const cookie = await destroySession(req);
      send(res, 200, { ok: true }, undefined, { "Set-Cookie": cookie });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/me") {
      const account = await getAccountFromRequest(req);
      if (!account) {
        send(res, 401, { error: "Please sign in" });
        return;
      }
      send(res, 200, { account: publicAccount(account) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/current-affairs") {
      if (!(await requireAccount(req, res))) return;
      const payload = await getCurrentAffairs();
      send(res, 200, {
        items: payload.items,
        sources: payload.sources,
        updatedAt: payload.at,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/quiz") {
      if (!(await requireAccount(req, res))) return;
      try {
        send(res, 200, startQuiz(url.searchParams.get("subject") ?? ""));
      } catch (err) {
        send(res, 400, { error: err instanceof Error ? err.message : "Could not start quiz" });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/quiz") {
      const account = await requireAccount(req, res);
      if (!account) return;
      try {
        const body = asObject(await readJson(req));
        const subject = String(body.subject ?? "");
        const answers =
          body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
            ? (body.answers as Record<string, number>)
            : {};
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : undefined;
        const graded = gradeQuiz(subject, answers, ids);
        if (!isQuizSubject(subject)) throw new Error("Unknown subject");
        const attemptId = await saveAttempt(account.id, subject, graded.correct, graded.total, graded.results);
        const tracker = await getTracker(account.id);
        send(res, 200, { ...graded, attemptId, tracker });
      } catch (err) {
        send(res, 400, { error: err instanceof Error ? err.message : "Could not submit quiz" });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/quiz/tracker") {
      const account = await requireAccount(req, res);
      if (!account) return;
      send(res, 200, await getTracker(account.id));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/quiz/attempts") {
      const account = await requireAccount(req, res);
      if (!account) return;
      const rows = await listAttempts(account.id);
      send(res, 200, {
        attempts: rows.map((row) => ({
          id: row.id,
          subject: row.subject,
          title: subjectLabel(row.subject),
          correct: row.correct,
          total: row.total,
          created_at: row.created_at,
        })),
      });
      return;
    }

    const attemptMatch = url.pathname.match(/^\/api\/quiz\/attempts\/(\d+)$/);
    if (req.method === "GET" && attemptMatch) {
      const account = await requireAccount(req, res);
      if (!account) return;
      const attempt = await getAttempt(account.id, Number(attemptMatch[1]));
      if (!attempt) {
        send(res, 404, { error: "Attempt not found" });
        return;
      }
      send(res, 200, attempt);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/faculty/claim") {
      const account = await requireAccount(req, res);
      if (!account) return;
      try {
        const body = asObject(await readJson(req));
        await promoteToFaculty(account.id, String(body.code ?? "").trim());
        send(res, 200, { ok: true, role: "faculty" });
      } catch (err) {
        send(res, 400, { error: err instanceof Error ? err.message : "Could not claim faculty" });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/materials") {
      if (!(await requireAccount(req, res))) return;
      const subject = url.searchParams.get("subject") ?? undefined;
      const mine = url.searchParams.get("mine") === "1";
      if (mine) {
        const account = await requireFaculty(req, res);
        if (!account) return;
        send(res, 200, { materials: await listFacultyMaterials(account.id) });
        return;
      }
      send(res, 200, { materials: await listPublishedMaterials(subject) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/materials") {
      const account = await requireFaculty(req, res);
      if (!account) return;
      try {
        const body = asObject(await readJson(req));
        const subject = String(body.subject ?? "");
        const title = String(body.title ?? "").trim();
        const text = String(body.body ?? "").trim();
        const classTag = String(body.class_tag ?? "").trim() || null;
        if (!title || title.length > 200) throw new Error("Title is required");
        if (text.length < 20) throw new Error("Write at least 20 characters of material");
        const allowed = ["current", "history", "geography", "polity", "economy", "science", "environment", "ethics"];
        if (!allowed.includes(subject)) throw new Error("Pick a valid subject");
        const id = await addMaterial(account.id, subject, title, text, classTag);
        send(res, 201, { id });
      } catch (err) {
        send(res, 400, { error: err instanceof Error ? err.message : "Could not publish" });
      }
      return;
    }

    const materialMatch = url.pathname.match(/^\/api\/materials\/(\d+)$/);
    if (req.method === "DELETE" && materialMatch) {
      const account = await requireFaculty(req, res);
      if (!account) return;
      const removed = await deleteMaterial(account.id, Number(materialMatch[1]));
      if (!removed) {
        send(res, 404, { error: "Material not found" });
        return;
      }
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/users") {
      if (!(await requireAccount(req, res))) return;
      const rows = await sql<UserRow[]>`
        SELECT id, "User_name", "DOB", "Mobile no"
        FROM user_details
        ORDER BY id DESC
      `;
      send(res, 200, { users: rows.map(formatUser) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/users") {
      if (!(await requireAccount(req, res))) return;
      try {
        const { userName, dob, mobile } = parseUserDetails(await readJson(req));
        const [row] = await sql<UserRow[]>`
          INSERT INTO user_details ("User_name", "DOB", "Mobile no")
          VALUES (${userName}, ${dob}, ${mobile})
          RETURNING id, "User_name", "DOB", "Mobile no"
        `;
        send(res, 201, { user: formatUser(row) });
      } catch (err) {
        send(res, 400, { error: err instanceof Error ? err.message : "Invalid input" });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/survey/files") {
      if (!(await requireAccount(req, res))) return;
      try {
        const [fullPdf, highlightsPdf] = await Promise.all([
          signedGetUrl(SURVEY_KEYS.fullPdf),
          signedGetUrl(SURVEY_KEYS.highlightsPdf),
        ]);
        send(res, 200, {
          source: "Ministry of Finance, Economic Survey 2025-26",
          official: "https://www.indiabudget.gov.in/economicsurvey/",
          files: [
            { id: "full", label: "Full Economic Survey PDF (S3)", url: fullPdf },
            { id: "highlights", label: "Highlights / infographics PDF (S3)", url: highlightsPdf },
          ],
        });
      } catch (err) {
        console.error(err);
        send(res, 503, {
          error: "Survey PDF is not on storage yet",
          official: "https://www.indiabudget.gov.in/economicsurvey/doc/echapter.pdf",
        });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      if (!(await requireAccount(req, res))) return;
      try {
        const body = asObject(await readJson(req));
        const message = String(body.message ?? "");
        const history = Array.isArray(body.history)
          ? body.history
              .filter((item) => item && typeof item === "object")
              .map((item) => {
                const row = item as Record<string, unknown>;
                const role = row.role === "assistant" ? "assistant" : "user";
                return { role, content: String(row.content ?? "") };
              })
          : [];
        const reply = await answerChat(history, message);
        send(res, 200, { reply });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not answer";
        const status = message.includes("not configured") ? 503 : 400;
        send(res, status, { error: message });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET") {
      const page = pages[url.pathname];
      const filePath = page
        ? join(publicDir, page)
        : join(publicDir, url.pathname);
      if (!filePath.startsWith(publicDir)) {
        send(res, 403, { error: "Forbidden" });
        return;
      }
      try {
        const data = await readFile(filePath);
        send(res, 200, data, mime[extname(filePath)] ?? "application/octet-stream");
      } catch {
        send(res, 404, { error: "Not found" });
      }
      return;
    }

    send(res, 405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: "Server error" });
  }
});

await ensureAuthTables();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`PrepHaat listening on port ${PORT}`);
});
