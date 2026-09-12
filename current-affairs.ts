import { randomBytes } from "node:crypto";

export type NewsItem = {
  id: string;
  source: string;
  section: string;
  title: string;
  url: string;
  published: string | null;
  summary: string;
  tags: string[];
};

type Feed = { source: string; section: string; url: string };

const FEEDS: Feed[] = [
  { source: "The Hindu", section: "National", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
  { source: "The Hindu", section: "Editorial", url: "https://www.thehindu.com/opinion/editorial/feeder/default.rss" },
  { source: "The Hindu", section: "Science", url: "https://www.thehindu.com/sci-tech/science/feeder/default.rss" },
  { source: "Indian Express", section: "India", url: "https://indianexpress.com/section/india/feed/" },
  { source: "Indian Express", section: "Explained", url: "https://indianexpress.com/section/explained/feed/" },
  { source: "Indian Express", section: "Opinion", url: "https://indianexpress.com/section/opinion/feed/" },
  { source: "PIB", section: "Releases", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1" },
  { source: "NDTV", section: "India", url: "https://feeds.feedburner.com/ndtvnews-india-news" },
];

const TAGS: Array<{ tag: string; re: RegExp }> = [
  { tag: "Polity", re: /constitution|supreme court|high court|parliament|lok sabha|rajya sabha|bill|act|election|eci|governor|president|federal|ordinance|judiciary/i },
  { tag: "Economy", re: /rbi|gdp|inflation|budget|gst|fiscal|repo|bank|trade|unemployment|imf|world bank|tax/i },
  { tag: "International", re: /un |united nations|g20|quad|brics|bilateral|treaty|ukraine|china|pakistan|usa|washington|beijing/i },
  { tag: "Environment", re: /climate|emission|biodiversity|forest|wildlife|cop\d|pollution|monsoon|glacier|renewable/i },
  { tag: "Science", re: /isro|nasa|space|vaccine|ai |artificial intelligence|research|genome|quantum|satellite/i },
  { tag: "History", re: /heritage|archaeology|freedom|partition|monument|unesco|museum|ancient|medieval/i },
  { tag: "Geography", re: /earthquake|cyclone|flood|drought|himalaya|river|glacier|seismic|map|border/i },
  { tag: "Bihar", re: /bihar|patna|gaya|nalanda|mithila|ganges|ganga| viswamit/i },
  { tag: "Social", re: /education|health|caste|women|child|nrega|welfare|poverty|census/i },
];

let cache: { at: number; items: NewsItem[]; sources: string[] } | null = null;
const TTL_MS = 15 * 60 * 1000;

function decode(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagItem(title: string, summary: string) {
  const blob = `${title} ${summary}`;
  return TAGS.filter((entry) => entry.re.test(blob)).map((entry) => entry.tag).slice(0, 3);
}

function pick(block: string, tag: string) {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i"));
  if (cdata) return decode(cdata[1]);
  const text = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (text) return decode(text[1]);
  return "";
}

function pickLink(block: string) {
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (href) return href[1].trim();
  const link = pick(block, "link");
  if (link.startsWith("http")) return link;
  const guid = pick(block, "guid");
  return guid.startsWith("http") ? guid : "";
}

function parseFeed(xml: string, feed: Feed): NewsItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.slice(0, 8).map((block) => {
    const title = pick(block, "title") || "Untitled";
    const summary = pick(block, "description") || pick(block, "summary") || pick(block, "content");
    const published = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated") || null;
    return {
      id: randomBytes(6).toString("hex"),
      source: feed.source,
      section: feed.section,
      title,
      url: pickLink(block),
      published,
      summary: summary.slice(0, 280),
      tags: tagItem(title, summary),
    };
  }).filter((item) => item.title && item.url);
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BPSC-UPSC-StudyDesk/1.0 (civil services study project)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, feed);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function getCurrentAffairs() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const results = await Promise.all(FEEDS.map((feed) => fetchFeed(feed)));
  const items = results
    .flat()
    .sort((a, b) => Date.parse(b.published ?? "") - Date.parse(a.published ?? ""))
    .slice(0, 48);
  const sources = [...new Set(results.flatMap((list, i) => (list.length ? [FEEDS[i].source] : [])))];
  cache = { at: Date.now(), items, sources };
  return cache;
}
