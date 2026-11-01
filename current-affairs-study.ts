export type SyllabusLink = {paper:string;topic:string;relevance:string;subject:string};
export type StudyIssue = {id:string;title:string;url:string;published:string;source:string;topics:string[];whyInNews:string;summary:string[];syllabus:SyllabusLink[];kind?:string};
export type StudyArchive = {generatedAt:string;range:{start:string;end:string};selection:string;months:Array<{id:string;partial:boolean;items:StudyIssue[]}>;[key:string]:unknown};
export const indiaDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);

const rules:Array<{re:RegExp;link:SyllabusLink}> = [
  {re:/constitution|supreme court|high court|parliament|federalism|electoral|election commission|judicial|governor|law commission|tribunal|judgment|judgement/i,link:{paper:'GS II',subject:'polity',topic:'Constitution, Parliament, judiciary and federal relations',relevance:'Connect the reported issue to institutional powers, constitutional checks, accountability and Centre-State relations. The syllabus connection is a study interpretation.'}},
  {re:/biodiversity|ramsar|wetland|pollution|\baqi\b|\bcaqm\b|stubble|carbon|climate|emission|mangrove|wildlife|forest conservation|renewable energy|solar energy|circular economy/i,link:{paper:'GS III',subject:'environment',topic:'Conservation, environmental pollution and climate change',relevance:'Revise the relevant environmental institutions, policy mechanisms and implementation challenges. Distinguish the specific reported development from wider conservation or climate objectives.'}},
  {re:/consumer price|\biip\b|inflation|monetary|\brbi\b|gross domestic|\bgdp\b|fiscal|\bgst\b|employment|labour code|industrial production|financial inclusion|export|trade agreement|food security|pulses|agricultur|infrastructure project|social security/i,link:{paper:'GS III',subject:'economy',topic:'Indian economy, employment, agriculture and inclusive growth',relevance:'Examine the economic mechanism, measurement concepts and distributional effects. Use dated statistics only with their reference period and provisional or final status.'}},
  {re:/genom|genetic|quantum|\bisro\b|satellite|space mission|artificial intelligence|biotechnology|synthetic biology|semiconductor|science.*innovation|research.*innovation|cybersecurity/i,link:{paper:'GS III',subject:'science',topic:'Science and technology: applications, indigenisation and emerging technologies',relevance:'Understand the scientific principle, potential applications, domestic capabilities and risks. Policy announcements and research possibilities are not evidence of completed deployment.'}},
  {re:/\bbrics\b|\bsco\b|\bquad\b|bilateral|joint statement|united nations|strategic partnership|garuda shakti|foreign minister|international.*cooperation|india.indonesia|india.poland/i,link:{paper:'GS II',subject:'ir',topic:'Bilateral relations, international institutions and global groupings',relevance:'Map the countries or grouping, Indian interests and areas of cooperation. Separate joint declarations and diplomatic intentions from binding obligations or demonstrated outcomes.'}},
  {re:/manuscript|archaeolog|heritage conservation|cultural heritage|ancient monument|museum collection/i,link:{paper:'GS I',subject:'history',topic:'Indian culture: literature, art and heritage conservation',relevance:'Connect the development to preservation of tangible or documentary heritage, conservation methods and access to cultural knowledge. Identify the relevant institutions and source material.'}},
  {re:/\bcara\b|adoption|disability|divyang|social assistance|pension scheme|child protection|sanitation worker|public health|nutrition|education policy|vulnerable|legal metrology|consumer protection/i,link:{paper:'GS II',subject:'governance',topic:'Welfare schemes, vulnerable sections and public-service delivery',relevance:'Examine eligibility, implementing institutions, inclusion and service-delivery safeguards. Assess access and outcomes separately from announcements or administrative activity.'}},
  {re:/vigilance|anti.corruption|public integrity|probity|conflict of interest|ethical.*artificial intelligence/i,link:{paper:'GS IV',subject:'ethics',topic:'Probity in governance, integrity and accountability',relevance:'Use the reported context to examine ethical responsibility, transparency, conflicts of interest and practical safeguards. Avoid treating publicity or a campaign as proof of institutional integrity.'}},
  {re:/terroris|insurgency|border security|cybercrime|cyber crime|radicalisation|radicalization|organised crime/i,link:{paper:'GS III',subject:'security',topic:'Internal security, terrorism and organised crime',relevance:'Connect the reported issue with security institutions, preventive measures and coordination. Separate official statements and proposed responses from verified operational outcomes.'}},
];

export function syllabusFor(title:string, summary=''):SyllabusLink[] {
  if(/cricket|football|celebrity|box office|birthday greetings|pays floral tributes|special campaign|cleanliness drive|pending files|disposes of.*grievances|recruit.*station master/i.test(title))return [];
  return rules.filter(rule=>rule.re.test(title+' '+summary)).map(rule=>({...rule.link})).slice(0,3);
}

export function mergeCurrentArchive(archive:StudyArchive, live:StudyIssue[], today=indiaDate(), checkedAt=new Date().toISOString(), liveAvailable=false):StudyArchive {
  const startDate=new Date(today+'T00:00:00Z');startDate.setUTCMonth(startDate.getUTCMonth()-18);
  const start=startDate.toISOString().slice(0,10),records=new Map<string,StudyIssue>();
  // Curated explanations take precedence over feed extracts for the same source URL.
  for(const item of [...live,...archive.months.flatMap(month=>month.items)]){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(item.published)||item.published<start||item.published>today||!item.syllabus.length)continue;
    const parsedDate=new Date(item.published+'T00:00:00Z');if(!Number.isFinite(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==item.published)continue;
    let url:URL;try{url=new URL(item.url);}catch{continue;}
    if(url.protocol!=='https:')continue;
    const key=(url.hostname==='pib.gov.in'||url.hostname==='www.pib.gov.in')&&url.searchParams.get('PRID')?'pib:'+url.searchParams.get('PRID'):url.origin+url.pathname;
    if(item.kind==='Live source headline'&&records.has(key))continue;
    records.set(key,item);
  }
  const months:StudyArchive['months']=[];
  for(let date=new Date(today.slice(0,7)+'-01T00:00:00Z');date.toISOString().slice(0,7)>=start.slice(0,7);date.setUTCMonth(date.getUTCMonth()-1)){
    const id=date.toISOString().slice(0,7);months.push({id,partial:id===today.slice(0,7)||id===start.slice(0,7),items:[...records.values()].filter(item=>item.published.startsWith(id)).sort((a,b)=>b.published.localeCompare(a.published)||a.title.localeCompare(b.title))});
  }
  const latest=[...records.values()].map(item=>item.published).sort().at(-1)||null;
  return {...archive,range:{start,end:today},months,checkedAt,latestPublished:latest,liveAvailable,selection:'Selected source-dated UPSC issues with syllabus connections. Live extracts are labeled separately from prepared study briefs.'};
}
