import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { indiaDate, mergeCurrentArchive, syllabusFor, type StudyIssue, type StudyArchive } from "./current-affairs-study.ts";

export type NewsItem = {
  id: string;
  source: string;
  section: string;
  title: string;
  url: string;
  published: string | null;
  summary: string;
  tags: string[];
  summaryLines?: string[];
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

type CurrentFeedCache = { at: number; items: NewsItem[]; sources: string[]; liveAvailable: boolean };
let cache: CurrentFeedCache | null = null;
let pending: Promise<CurrentFeedCache> | null = null;
const TTL_MS = 15 * 60 * 1000;

function decode(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<(script|style|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => Number(n)<=0x10ffff ? String.fromCodePoint(Number(n)) : " ")
    .replace(/&(?:rsquo|lsquo);/g, "'")
    .replace(/&(?:rdquo|ldquo);/g, '"')
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
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
  return blocks.slice(0, 30).map((block) => {
    const title = pick(block, "title") || "Untitled";
    const summary = pick(block, "description") || pick(block, "summary") || pick(block, "content");
    const published = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated") || null;
    return {
      id: createHash("sha256").update(pickLink(block)).digest("hex").slice(0,20),
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


function releaseBody(html:string) {
  const opening=/<div[^>]*id=["']pibReleaseBody["'][^>]*>/i.exec(html);
  if(!opening)return '';
  const start=opening.index+opening[0].length;let depth=1;
  const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=start;
  for(let match;(match=tags.exec(html));){depth+=/^<\//.test(match[0])?-1:1;if(depth===0)return html.slice(start,match.index);}
  return '';
}

async function fetchPIB():Promise<NewsItem[]> {
  try{
    const response=await fetch('https://www.pib.gov.in/AllRelease.aspx?lang=1&reg=1',{signal:AbortSignal.timeout(8000)});
    if(!response.ok)return [];
    const html=await response.text(),entries=new Map<string,NewsItem>();
    const today=indiaDate();const cutoff=new Date(today+'T00:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-21);
    for(const match of html.matchAll(/href=["']([^"']*PRID=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)){
      const title=decode(match[3]);if(!syllabusFor(title).length)continue;
      const dateText=html.slice(match.index!+match[0].length,match.index!+match[0].length+180).match(/Posted on:\s*([^<\r\n]+)/i)?.[1];
      const timestamp=Date.parse((dateText||'')+' UTC');if(!Number.isFinite(timestamp))continue;
      const published=new Date(timestamp).toISOString().slice(0,10);if(published>today||published<cutoff.toISOString().slice(0,10))continue;
      const url=`https://www.pib.gov.in/PressReleasePage.aspx?PRID=${match[2]}&lang=1&reg=3`;
      entries.set(match[2],{id:createHash('sha256').update(url).digest('hex').slice(0,20),title,url,published,source:'Press Information Bureau',section:'Official releases',summary:'',tags:tagItem(title,'')});
    }
    const headlines=new Set<string>();
    const unique=[...entries.values()].filter(item=>{const key=item.title.toLowerCase()+'|'+item.published;if(headlines.has(key))return false;headlines.add(key);return true;});
    const selected=unique.sort((a,b)=>(b.published||'').localeCompare(a.published||'')).slice(0,30);
    // Retain source-dated headlines even when a full release is temporarily unavailable.
    await Promise.allSettled(selected.slice(0,15).map(async item=>{
      const article=await fetch(item.url,{signal:AbortSignal.timeout(7000)});if(!article.ok)return;
      const body=releaseBody(await article.text());
      const paragraphs=[...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match=>decode(match[1])).filter(text=>text.split(/\s+/).length>=8&&!/^https?:|^pic\.twitter|^@/.test(text));
      const lines=paragraphs.slice(0,3).map(text=>text.split(/\s+/).slice(0,40).join(' '));
      item.summaryLines=[...new Set(lines)];item.summary=item.summaryLines.join(' ').slice(0,280);
    }));
    return selected;
  }catch{return [];}
}

export async function getCurrentAffairs():Promise<CurrentFeedCache> {
  if(cache&&Date.now()-cache.at<TTL_MS)return cache;
  if(pending)return pending;
  pending=(async()=>{
    const [results,official]=await Promise.all([Promise.all(FEEDS.map(fetchFeed)),fetchPIB()]);
    const today=indiaDate(),byUrl=new Map<string,NewsItem>();
    for(const item of [...results.flat(),...official]){
      const timestamp=Date.parse(item.published||'');if(!Number.isFinite(timestamp)||!syllabusFor(item.title,item.summary).length)continue;
      const published=indiaDate(new Date(timestamp));if(published>today)continue;
      const cutoff=new Date(today+'T00:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-30);if(published<cutoff.toISOString().slice(0,10))continue;
      byUrl.set(item.url,{...item,published});
    }
    const items=[...byUrl.values()].sort((a,b)=>(b.published||'').localeCompare(a.published||'')).slice(0,100);
    const sources=[...new Set(items.map(item=>item.source))];
    cache={at:Date.now(),items:items.length?items:cache?.items||[],sources,liveAvailable:sources.length>0};
    return cache;
  })();
  try{return await pending;}finally{pending=null;}
}

export async function getCurrentAffairsArchive() {
  const archive=JSON.parse(await readFile(new URL('./public/data/monthly-current-affairs.json',import.meta.url),'utf8')) as StudyArchive;
  try{const snapshot=JSON.parse(await readFile(new URL('./public/data/current-affairs-latest.json',import.meta.url),'utf8')) as StudyArchive;archive.months=[...snapshot.months,...archive.months];}catch{}
  const live=await getCurrentAffairs();
  const issues:StudyIssue[]=live.items.map(item=>({id:item.id,title:item.title.split(/\s+/).slice(0,24).join(' ')+(item.title.split(/\s+/).length>24?'...':''),url:item.url,published:item.published!,source:item.source,topics:item.tags,whyInNews:'A source-dated update matched the syllabus connections below. Open the original report for the full development.',
    summary:[],syllabus:syllabusFor(item.title,item.summary),kind:'Live source headline'}));
  return mergeCurrentArchive(archive,issues,indiaDate(),new Date(live.at).toISOString(),live.liveAvailable);
}
