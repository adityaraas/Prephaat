// Isolated visual preview. Never connects to production accounts or databases.
import "dotenv/config";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { getEditorialAnalysis, getEditorialCatalog, EditorialError } from "../editorials.ts";
const root = resolve("public");
const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1:3106");
  const json = (status: number, data: unknown) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
  try {
    if (url.pathname === "/api/me") return json(200, { account: { id: 0, name: "Preview learner", role: "student" } });
    if (url.pathname === "/api/editorials") return json(200, await getEditorialCatalog());
    const analysis = url.pathname.match(/^\/api\/editorials\/([a-f0-9]{20})\/analysis$/);
    if (analysis && req.method === "POST") return json(200, { analysis: await getEditorialAnalysis(analysis[1]) });
    if (url.pathname === "/api/current-affairs") return json(200, { items: [], sources: [] });
    if (url.pathname === "/api/quiz/attempts") return json(200, { attempts: [] });
    if (url.pathname.startsWith("/api/")) return json(503, { error: "Not available in visual preview" });
    const file = resolve(root, "." + (["/", "/home", "/test"].includes(url.pathname) ? "/home.html" : decodeURIComponent(url.pathname)));
    if (!file.startsWith(root + sep)) return json(403, { error: "Forbidden" });
    const bytes = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" }); res.end(bytes);
  } catch (error) { json(error instanceof EditorialError ? error.status : 404, { error: error instanceof EditorialError ? error.message : "Not found" }); }
}).listen(3106, "127.0.0.1", () => console.log("Editorial preview: http://127.0.0.1:3106/home#editorials"));
