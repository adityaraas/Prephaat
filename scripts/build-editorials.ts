import { mkdir, readFile, writeFile } from "node:fs/promises";
import { editorialId, fetchPublicHtml, parseArticle, parseListing, topicTags, type Editorial } from "../editorial-source.ts";

const end = process.argv.find((arg) => arg.startsWith("--end="))?.slice(6) ?? new Date().toISOString().slice(0, 10);
const startDate = new Date(`${end}T00:00:00Z`); startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
const start = startDate.toISOString().slice(0, 10);
await mkdir(".cache", { recursive: true });
let previous: Editorial[] = [];
try { previous = JSON.parse(await readFile(".cache/editorial-import.json", "utf8")); } catch {}
const known = new Map(previous.map((item) => [item.url, item]));
const collected = new Map<string, Editorial>();
const reports: Array<{ source: string; pages: number; count: number; reachedStart: boolean; failedPages: number[]; failedArticles: string[] }> = [];

for (const source of ["The Indian Express", "The Hindu"] as const) {
  const report = { source, pages: 0, count: 0, reachedStart: false, failedPages: [] as number[], failedArticles: [] as string[] };
  const seen = new Set<string>();
  for (let page = 1; page <= 120; page++) {
    const url = source === "The Hindu" ? `https://www.thehindu.com/opinion/editorial/?page=${page}` : `https://indianexpress.com/section/opinion/editorials/${page === 1 ? "" : `page/${page}/`}`;
    let html: string;
    try { html = await fetchPublicHtml(url); } catch (error) {
      report.failedPages.push(page); console.log(`${source}: page ${page} unavailable`);
      // A redirect to the section front is the publisher's pagination limit.
      if (String(error).includes("Publisher returned 301") || String(error).includes("Publisher returned 302") || report.failedPages.slice(-3).every((n, i, all) => all.length === 3 && n === page - 2 + i)) break;
      continue;
    }
    const listing = parseListing(html, source).filter((item) => !seen.has(item.url));
    if (!listing.length) { console.log(`${source}: no new entries on page ${page}; stopping`); break; }
    listing.forEach((item) => seen.add(item.url));
    report.pages++;
    let old = 0;
    for (let offset = 0; offset < listing.length; offset += 4) {
      await Promise.all(listing.slice(offset, offset + 4).map(async (entry) => {
        let item = known.get(entry.url);
        if (!item) {
          let published = entry.published;
          let author = "Editorial Board";
          if (!published) {
            try { const article = parseArticle(await fetchPublicHtml(entry.url)); published = article.published; author = article.author; }
            catch { report.failedArticles.push(entry.url); return; }
          }
          if (!published || !/^\d{4}-\d{2}-\d{2}$/.test(published)) { report.failedArticles.push(entry.url); return; }
          item = { id: editorialId(entry.url), source, title: entry.title, url: entry.url, published, author, topics: topicTags(entry.title) };
          known.set(entry.url, item);
        }
        if (item.published < start) { old++; return; }
        if (item.published <= end) collected.set(item.id, { ...item, topics: topicTags(item.title) });
      }));
    }
    await writeFile(".cache/editorial-import.json", JSON.stringify([...known.values()]));
    report.count = [...collected.values()].filter((item) => item.source === source).length;
    console.log(`${source}: page ${page}, ${report.count} entries, ${old} before the date window`);
    if (old === listing.length) { report.reachedStart = true; break; }
  }
  reports.push(report);
}
const items = [...collected.values()].sort((a, b) => b.published.localeCompare(a.published) || a.title.localeCompare(b.title));
await writeFile("public/data/editorials.json", JSON.stringify({ generatedAt: new Date().toISOString(), range: { start, end }, coverage: reports, items }, null, 2) + "\n");
console.log(`Saved ${items.length} editorials for ${start} to ${end}.`);
