import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {indiaDate,mergeCurrentArchive,syllabusFor,type StudyArchive,type StudyIssue} from '../current-affairs-study.ts';

const item=(overrides:Partial<StudyIssue>={}):StudyIssue=>({id:'a',title:'Inflation statistics released',published:'2026-10-27',url:'https://www.pib.gov.in/PressReleasePage.aspx?PRID=123&lang=1',source:'PIB',topics:['Economy'],whyInNews:'Reported development',summary:['Source-checked summary'],syllabus:syllabusFor('CPI inflation'),...overrides});
const archive=(items:StudyIssue[]=[]):StudyArchive=>({generatedAt:'2026-10-04T00:00:00Z',range:{start:'2025-04-04',end:'2026-10-04'},selection:'Study issues',months:[{id:'2026-10',partial:true,items}]});

test('today uses India time around midnight, not the server timezone',()=>{
  assert.equal(indiaDate(new Date('2026-10-27T20:00:00Z')),'2026-10-28');
});
test('UPSC classification rejects publicity and maps relevant news precisely',()=>{
  assert.equal(syllabusFor('Ministry conducts cleanliness drive under special campaign').length,0);
  assert.equal(syllabusFor('Cricket match result').length,0);
  assert(syllabusFor('CBD biodiversity conservation').some(link=>link.subject==='environment'));
  assert(syllabusFor('CARA child adoption consultation').some(link=>link.paper==='GS II'));
  assert(syllabusFor('Manuscript heritage conservation').some(link=>link.paper==='GS I'));
  assert(syllabusFor('Anti-corruption and public integrity').some(link=>link.paper==='GS IV'));
  assert(!syllabusFor('CPI party protests election commission policy').some(link=>link.subject==='economy'),'The political party acronym must not be treated as consumer inflation');
  assert(syllabusFor('Border security and terrorist financing').some(link=>link.subject==='security'));
});
test('rolling coverage extends through today while preserving actual source dates',()=>{
  const result=mergeCurrentArchive(archive([item()]),[],'2026-10-28','2026-10-28T08:00:00Z');
  assert.equal(result.range.end,'2026-10-28');assert.equal(result.range.start,'2025-04-28');assert.equal(result.latestPublished,'2026-10-27');
  assert.equal(result.months.length,19);assert.equal(result.months[0].items[0].published,'2026-10-27');
});
test('curated explanations override live headlines for the same PIB release',()=>{
  const prepared=item({id:'prepared',summary:['Prepared explanation']});
  const live=item({id:'live',url:'https://pib.gov.in/PressReleasePage.aspx?lang=1&PRID=123&reg=3',summary:[]});
  const result=mergeCurrentArchive(archive([prepared]),[live],'2026-10-28');
  assert.equal(result.months[0].items.length,1);assert.equal(result.months[0].items[0].id,'prepared');
});
test('future, malformed, non-HTTPS and off-syllabus items are excluded',()=>{
  const result=mergeCurrentArchive(archive(),[item({published:'2026-10-29'}),item({published:'2026-02-31'}),item({url:'javascript:alert(1)'}),item({url:'not a URL'}),item({syllabus:[]})],'2026-10-28');
  assert.equal(result.months.flatMap(month=>month.items).length,0);
});
test('the published archive has official additions and explicit current coverage',()=>{
  const data=JSON.parse(readFileSync(new URL('../public/data/monthly-current-affairs.json',import.meta.url),'utf8'));
  const added=data.months.flatMap((month:any)=>month.items).filter((entry:any)=>entry.source==='Press Information Bureau');
  assert(added.length>=15);assert(data.range.end>='2026-10-28');
  assert(added.every((entry:any)=>entry.summary.length===10&&entry.syllabus.length));
  assert(added.some((entry:any)=>entry.syllabus.some((link:any)=>link.paper==='GS I')));
});
