import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { getEditorialAnalysis, getEditorialCatalog, type EditorialAnalysis } from "../editorials.ts";

const catalog = await getEditorialCatalog();
const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.slice(8) ?? "8");
if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error("Use --limit=1 through --limit=30");
let pack: Record<string, EditorialAnalysis> = {};
try { pack = JSON.parse(await readFile("public/data/editorial-analysis.json", "utf8")); } catch {}
const candidates = ["The Hindu", "The Indian Express"].flatMap((source) => catalog.items.filter((item) => item.source === source && item.topics.some((topic) => topic !== "Culture & ethics")).slice(0, Math.ceil(limit / 2))).slice(0, limit);
for (const item of candidates) {
  if (pack[item.id]) continue;
  try {
    pack[item.id] = await getEditorialAnalysis(item.id);
    await writeFile("public/data/editorial-analysis.json", JSON.stringify(pack, null, 2) + "\n");
    console.log(`Prepared ${item.source}: ${item.title}`);
  } catch (error) { console.log(`Could not prepare ${item.title}: ${error instanceof Error ? error.message : "Unknown error"}`); }
}
console.log(`${Object.keys(pack).length} prepared notes are available offline.`);
