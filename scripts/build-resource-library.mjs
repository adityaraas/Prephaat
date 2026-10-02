import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Parse catalog data only. Never execute JavaScript from a publisher's website.
export function parseNcertCatalog(html) {
  const clean = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const blocks = [...clean.matchAll(/if\s*\(\(document\.test\.tclass\.value\s*==\s*(\d+)\)\s*&&\s*\(document\.test\.tsubject\.options\[sind\]\.text\s*==\s*"([^"]+)"\)\)\s*\{([^}]+)\}/g)];
  const books = new Map();
  for (const [, grade, subject, body] of blocks) {
    if (+grade < 6 || +grade > 12) continue;
    const titles = new Map([...body.matchAll(/tbook\.options\[(\d+)\]\.text\s*=\s*"([^"]+)"/g)].map(m => [m[1], m[2].trim()]));
    for (const [, index, code, chapters] of body.matchAll(/tbook\.options\[(\d+)\]\.value\s*=\s*"textbook\.php\?([a-z0-9]+)=0-(\d+)"/g)) {
      if (!/^[f-l][eh][a-z]+\d$/.test(code) || !titles.has(index)) continue;
      books.set(code, { class: +grade, subject, title: titles.get(index), code, chapterCount: +chapters, language: code[1] === 'e' ? 'English' : 'Hindi' });
    }
  }
  return [...books.values()];
}

const subjectMap = {
  'Social Science': ['history', 'geography', 'polity', 'economy', 'society'],
  Science: ['science', 'environment'], Biology: ['science', 'environment'],
  Chemistry: ['science'], Physics: ['science'], Biotechnology: ['science'],
  Geography: ['geography', 'environment'], History: ['history'],
  'Fine Art': ['history'], 'Heritage Crafts': ['history'], Arts: ['history'],
  'Political Science': ['polity', 'ethics'], Economics: ['economy'],
  Sociology: ['society', 'essay'], Psychology: ['ethics'],
  Mathematics: ['csat'], English: ['csat', 'essay'],
};
const guides = {
  history: { papers: ['Prelims GS', 'Mains GS I', 'BPSC GS I'], topics: ['Ancient and medieval India', 'National movement', 'Art and culture', 'World history'], task: 'Build a timeline, locate places on a map, and explain one cause and one consequence for each major event.' },
  geography: { papers: ['Prelims GS', 'Mains GS I', 'BPSC GS II'], topics: ['Physical geography', 'Indian geography', 'Resources', 'Population'], task: 'Pair each process with a labelled diagram and an Indian example. Practise rivers, soils and agriculture on an outline map.' },
  polity: { papers: ['Prelims GS', 'Mains GS II', 'BPSC GS II'], topics: ['Constitution', 'Institutions', 'Federalism', 'Rights and governance'], task: 'Compare institutions by composition, powers and accountability. Verify current provisions against official constitutional text.' },
  economy: { papers: ['Prelims GS', 'Mains GS III', 'BPSC GS II'], topics: ['Growth and development', 'Money and banking', 'Public finance', 'Agriculture'], task: 'Explain each concept in your own words, then connect it to a Budget or Economic Survey table with its year and units.' },
  science: { papers: ['Prelims GS', 'Mains GS III', 'BPSC GS II'], topics: ['General science', 'Health', 'Biotechnology', 'Technology applications'], task: 'Prioritise everyday applications, mechanisms and diagrams. Use senior-secondary books selectively for GS, rather than solving every specialist derivation.' },
  environment: { papers: ['Prelims GS', 'Mains GS III', 'BPSC GS II'], topics: ['Ecology', 'Biodiversity', 'Climate change', 'Conservation'], task: 'Draw food webs and nutrient cycles; connect a pressure on an ecosystem to its impact and a practical conservation response.' },
  ethics: { papers: ['Mains GS IV', 'Interview'], topics: ['Values', 'Attitude', 'Emotional intelligence', 'Probity'], task: 'Define a value, give a public-service example, and apply it to a case using stakeholders, options, safeguards and a reasoned decision.' },
  society: { papers: ['Mains GS I', 'Mains GS II', 'Essay'], topics: ['Social institutions', 'Inequality', 'Social change', 'Demography'], task: 'Organise each issue by causes, affected groups, evidence and policy responses. Separate an observation from a stereotype.' },
  ir: { papers: ['Mains GS II'], topics: ['India and neighbours', 'International organisations', 'Foreign policy'], task: 'Prepare a country brief with shared interests, disagreements, agreements and a map. Update it with official statements.' },
  csat: { papers: ['Prelims CSAT'], topics: ['Numeracy', 'Data interpretation', 'Comprehension', 'Reasoning'], task: 'Practise arithmetic and comprehension under a time limit and log errors. Add previous papers for reasoning; textbooks alone do not cover CSAT.' },
  essay: { papers: ['Essay', 'Qualifying English'], topics: ['Argument', 'Examples', 'Social issues', 'Comprehension'], task: 'Write an outline with a clear thesis, multiple perspectives and a counterargument. Practise introductions and conclusions without memorised essays.' },
  security: { papers: ['Mains GS III'], topics: ['Internal security', 'Disaster management', 'Cyber security'], task: 'Map threats, vulnerable groups, responsible institutions and preventive measures; use a recent Indian example.' },
  bihar: { papers: ['BPSC GS I', 'BPSC GS II'], topics: ['Bihar economy', 'Geography', 'Development', 'State data'], task: 'Maintain district maps and a dated Bihar fact sheet. Compare state indicators with the national average using the same year and definition.' },
  current: { papers: ['Prelims GS', 'Mains GS I–IV', 'Essay'], topics: ['Current affairs', 'Government policy', 'Issues in news'], task: 'Map each issue to a syllabus topic, write a short explanation and solve related questions. Recheck dated facts before the exam.' },
};

function bookSubjects(book) {
  if (!subjectMap[book.subject]) return null;
  if (book.subject === 'Mathematics' && book.class > 10) return null;
  if (['hees2', 'hhes2'].includes(book.code)) return null; // Publisher recall; await a reviewed replacement.
  const key = book.code.slice(2);
  if (book.class === 10 && book.subject === 'Social Science') {
    return ({ ss1: ['geography', 'environment'], ss2: ['economy'], ss3: ['history'], ss4: ['polity'] })[key] || null;
  }
  if (book.class === 12 && book.subject === 'Political Science') return key === 'ps1' ? ['ir', 'polity'] : ['polity', 'history'];
  if (key === 'st1') return ['economy', 'csat'];
  return subjectMap[book.subject];
}

export function parseVajiramMagazines(html) {
  return [...html.matchAll(/<h5\b[^>]*>([^<]+)<\/h5>\s*<a\b[^>]*href="(https:[^"]+\.pdf)"/g)]
    .map(([, title, url]) => ({ title: title.trim(), url: url.replaceAll('&amp;', '&') }));
}

export async function buildLibrary(ncertFile, vajiramFile, extraFile) {
  const catalog = parseNcertCatalog(await readFile(ncertFile, 'utf8'));
  const resources = [];
  for (const book of catalog) {
    const subjects = bookSubjects(book);
    if (!subjects) continue;
    resources.push({
      id: `ncert-${book.code}`, title: book.title, provider: 'NCERT', type: 'Textbook',
      class: book.class, language: book.language, subjects,
      papers: [...new Set(subjects.flatMap(s => guides[s].papers))],
      topics: [...new Set(subjects.flatMap(s => guides[s].topics))],
      description: `${book.subject} foundation reading. Select chapters relevant to your exam from the publisher's contents page.`,
      readingTask: guides[subjects[0]].task,
      sourceUrl: `https://ncert.nic.in/textbook.php?${book.code}=0-${book.chapterCount}`,
      archiveUrl: `https://ncert.nic.in/textbook/pdf/${book.code}dd.zip`,
      contentsUrl: `https://ncert.nic.in/textbook/pdf/${book.code}ps.pdf`,
      chapters: Array.from({ length: book.chapterCount }, (_, i) => ({
        title: `Chapter ${i + 1}`, url: `https://ncert.nic.in/textbook/pdf/${book.code}${String(i + 1).padStart(2, '0')}.pdf`,
      })),
      editionNote: 'Listed in the NCERT catalog checked on 27 September 2026. Chapter names and numbering may differ from the older revision notes on this site.',
    });
  }
  const magazines = parseVajiramMagazines(await readFile(vajiramFile, 'utf8'));
  if (magazines.length < 12) throw new Error('Vajiram page format changed: fewer than 12 magazines parsed.');
  for (const magazine of magazines.filter(m => /202[56]$/.test(m.title))) {
    resources.push({ id: `vajiram-recitals-${magazine.title.toLowerCase().replaceAll(' ', '-')}`, title: `The Recitals — ${magazine.title}`, provider: 'Vajiram & Ravi', type: 'Magazine', language: 'English', class: null,
      subjects: ['current', 'history', 'geography', 'polity', 'economy', 'science', 'environment', 'ethics', 'society', 'ir', 'essay'],
      papers: ['Prelims GS', 'Mains GS I–IV', 'Essay'], topics: ['Monthly current affairs', 'Prelims practice', 'Mains practice'],
      description: 'Monthly current-affairs issue. Use the contents to find the sections relevant to your subject.',
      readingTask: guides.current.task,
      sourceUrl: 'https://vajiramandravi.com/upsc-study-materials/monthly-current-affairs-magazine/', pdfUrl: magazine.url,
      editionNote: 'Dated current-affairs material; facts and policy details may have changed since publication.',
    });
  }
  resources.push(...JSON.parse(await readFile(extraFile, 'utf8')));
  const result = {
    version: 1, checkedAt: '2026-09-27',
    scope: 'Selected GS, CSAT, Essay and BPSC foundation resources. This library is a reading map, not a claim of complete coverage of every optional subject or exam requirement.',
    accessNote: 'PDFs and book archives open on the publisher’s website. Download there for personal study. Publisher files are not mirrored by Crack IAS.',
    editionNote: 'NCERT is updating its school textbooks. Older site notes are supplementary revision aids and may not match current chapter numbering. Grade 8 Social Science Part II is omitted following NCERT’s recall notice; consult NCERT for a replacement.',
    guides, resources,
  };
  await writeFile('public/data/resource-library.json', JSON.stringify(result, null, 2) + '\n');
  console.log(`${resources.length} resources, ${resources.filter(r => r.type === 'Textbook').length} NCERT books, ${resources.reduce((n,r) => n + (r.chapters?.length || 0),0)} chapter PDF links, ${resources.filter(r => r.provider === 'Vajiram & Ravi').length} Vajiram resources`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 5) throw new Error('Usage: node scripts/build-resource-library.mjs <ncert.html> <vajiram.html> <supplemental.json>');
  await buildLibrary(...process.argv.slice(2));
}
