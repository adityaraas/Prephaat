import {mkdir,writeFile} from 'node:fs/promises';

await mkdir('.cache/current-affairs-sources',{recursive:true});
const ids=['2328977','2328896','2329092','2328830','2329164','2322244','2328132','2326133'];
const indexUrl='https://www.pib.gov.in/AllRelease.aspx?lang=1&reg=1';
const response=await fetch(indexUrl,{signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('PIB index unavailable');
const listing=await response.text();
await writeFile('.cache/current-affairs-sources/index.html',listing);
const entries=[...listing.matchAll(/href=["']([^"']*PRID=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(match=>({id:match[2],title:match[3].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),date:listing.slice(match.index+match[0].length,match.index+match[0].length+180).match(/Posted on:\s*([^<\r\n]+)/i)?.[1]?.trim()}));
const selected=entries.filter(item=>/Joint Declaration|Base Revision|Global Biodiversity|Genetic Diversity|Labour Codes|manuscript|National Social Assistance|cooperative federalism|Adoption of Children with Special|RDI Fund|Pulses|India.Poland Joint Statement|Legal Metrology|INDIA - INDONESIA/i.test(item.title)).slice(0,20);
await writeFile('.cache/current-affairs-sources/index.json',JSON.stringify(selected,null,2));
const targets=[...new Set([...ids,...selected.map(item=>item.id)])];
const results=await Promise.allSettled(targets.map(async id=>{
  const url=`https://www.pib.gov.in/PressReleasePage.aspx?PRID=${id}&lang=1&reg=3`;
  const result=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!result.ok)throw Error(id+': '+result.status);
  await writeFile(`.cache/current-affairs-sources/${id}.html`,await result.text());
  return id;
}));
console.log(JSON.stringify({selected,downloaded:results.filter(item=>item.status==='fulfilled').length,total:targets.length},null,2));
