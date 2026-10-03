import { createHash } from "node:crypto";

export type Editorial = {
  id: string; source: "The Hindu" | "The Indian Express"; title: string;
  url: string; published: string; author: string; topics: string[];
};
export function plainText(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&#(x[\da-f]+|\d+);/gi, (_, n: string) => {
      const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }).replace(/&(amp|quot|apos|nbsp|lt|gt|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/g,
      (_, entity: string) => ({ amp: "&", quot: '"', apos: "'", nbsp: " ", lt: "<", gt: ">", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—" }[entity] ?? ""))
    .replace(/\s+/g, " ").trim();
}
export function isEditorialUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ((url.hostname === "www.thehindu.com" && /^\/opinion\/editorial\/[^/]+\/article\d+\.ece$/.test(url.pathname)) ||
       (url.hostname === "indianexpress.com" && /^\/article\/opinion\/editorials\/[^/]+\/\d+\/$/.test(url.pathname)) ||
       (url.hostname === "indianexpress.com" && /^\/article\/opinion\/editorials\/[^/]+-\d+\/$/.test(url.pathname)));
  } catch { return false; }
}
export function editorialId(url: string) { return createHash("sha256").update(url).digest("hex").slice(0, 20); }
export async function fetchPublicHtml(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000), redirect: "manual",
    headers: { "User-Agent": "Prephaat-EditorialStudy/1.0", Accept: "text/html" },
  });
  if (!response.ok) throw new Error(`Publisher returned ${response.status}`);
  const bytes = await response.arrayBuffer();
  let html = new TextDecoder().decode(bytes);
  // Some publisher pages declare UTF-8 but serve legacy punctuation bytes.
  if (html.includes("\ufffd")) html = new TextDecoder("windows-1252").decode(bytes);
  return html;
}
export function topicTags(text: string) {
  const patterns: [string, RegExp][] = [
    ["Polity & governance", /election|constitution|court|judici|federal|parliament|democra|governance|voter|rights|census|reservation|commission|intensive revision|franchise/i],
    ["Economy", /econom|growth|inflation|budget|tax|gst|trade|tariff|jobs|employment|rbi|bank|manufactur|income|farmer|agricultur/i],
    ["International relations", /china|pakistan|iran|israel|gaza|trump|america|diplomac|bilateral|united nations|ukraine|russia|foreign|gulf|asean|bangladesh/i],
    ["Environment & geography", /climate|pollution|forest|wildlife|tiger|biodiversity|renewable|energy|monsoon|rainfall|cyclone|el ni|water|river|flood|ecolog/i],
    ["Science & technology", /\bAI\b|artificial intelligence|space|isro|digital|cyber|technology|data|nuclear|research/i],
    ["Society & social justice", /women|health|education|school|child|gender|caste|poverty|welfare|safety|marriage/i],
    ["Culture & ethics", /culture|art\b|book|literatur|heritage|sport|cricket|cinema|music|courage|ethic/i],
  ];
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}
export function parseListing(html: string, source: Editorial["source"]) {
  const found = new Map<string, { url: string; title: string; published?: string }>();
  const pattern = source === "The Hindu" ? /<h3\b[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi : /<h4\b[^>]*class="[^"]*o-opin-article__title[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi;
  for (const match of html.matchAll(pattern)) {
    const url = match[1].match(/href="([^"]+)"/)?.[1];
    if (!url || !isEditorialUrl(url)) continue;
    const title = plainText(match[1]);
    const before = html.slice(Math.max(0, match.index! - 1700), match.index);
    const dates = [...before.matchAll(/class="opinion-date"[^>]*>([^<]+)/g)];
    const date = dates.at(-1)?.[1];
    const published = date && Number.isFinite(Date.parse(date)) ? new Date(date + " UTC").toISOString().slice(0, 10) : undefined;
    found.set(url, { url, title, published });
  }
  return [...found.values()];
}
function meta(html: string, name: string) {
  for (const tag of html.match(/<meta\b[^>]+>/gi) ?? []) {
    if (new RegExp(`(?:itemprop|property|name)=["']${name}["']`, "i").test(tag)) {
      return plainText(tag.match(/content=["']([\s\S]*?)["']\s*\/?\s*>/i)?.[1] ?? "");
    }
  }
  return "";
}
export function parseArticle(html: string) {
  let body = "";
  let author = "Editorial Board";
  let accessible = !/(?:itemprop=["']isAccessibleForFree["'][^>]*content=["']false|"isAccessibleForFree"\s*:\s*(?:false|"false"))/i.test(html);
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const root = JSON.parse(match[1]);
      const visit = (node: any) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) { node.forEach(visit); return; }
        if (node.articleBody && typeof node.articleBody === "string") {
          body = plainText(node.articleBody);
          if (node.isAccessibleForFree === false || String(node.isAccessibleForFree).toLowerCase() === "false") accessible = false;
          const writer = Array.isArray(node.author) ? node.author[0] : node.author;
          if (writer?.name) author = plainText(writer.name);
        }
        if (node["@graph"]) visit(node["@graph"]);
      };
      visit(root);
    } catch { /* Ignore unrelated malformed publisher schema. */ }
  }
  if (!body) {
    const section = html.match(/<div\b[^>]*itemprop=["']articleBody["'][^>]*>([\s\S]*?)(?:<div\b|<\/div>)/i)?.[1];
    if (section) body = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((p) => plainText(p[1])).join("\n\n");
  }
  const published = meta(html, "datePublished") || meta(html, "article:published_time");
  return { body, author, published: published.slice(0, 10), accessible };
}
