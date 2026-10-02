import { readFile, writeFile } from 'node:fs/promises';
import { units, ethicsTopics } from './subject-course-content.mjs';
const read = async path => JSON.parse(await readFile(path,'utf8'));
const subjects=(await read('public/data/subjects.json')).subjects;
const catalog=(await read('public/data/resource-library.json')).resources;
const definitions={
 geography:{title:'Geography',headline:'Understand the Earth. Connect every place.',blocks:['Physical Geography','India & Bihar','Human Geography'],books:[['kegy2'],['kegy1','jess1'],['legy1','legy2']],intro:'Study physical processes, Indian regions and human activity through maps, explanations and daily practice.',paper:'GS I',skills:['Draw a labelled process diagram and explain each arrow.','Mark the locations on a blank India map and explain a regional pattern.','Compare two regions using population, livelihoods and access to services.']},
 polity:{title:'Polity & Governance',headline:'Understand institutions. Follow how power works.',blocks:['Constitutional Foundations','Institutions & Federalism','Governance & Participation'],books:[['keps1','jess4'],['keps2'],['leps2']],intro:'Move from constitutional ideas to institutions and citizen-facing governance, with concepts you can apply.',paper:'GS II',skills:['Define the principle and explain it through a citizen-facing example.','Draw the decision and accountability chain for the institution.','Map a service-delivery problem and propose an accountable remedy.']},
 economy:{title:'Economy',headline:'Understand the numbers. Explain the choices.',blocks:['Microeconomics & Data','Macroeconomics & Finance','Development & Livelihoods'],books:[['leec2','kest1'],['leec1'],['keec1','jess2']],intro:'Build economic reasoning, read accounts and indicators, and connect growth with livelihoods.',paper:'GS III',skills:['Use a labelled diagram or numerical example and state its assumptions.','Separate stocks from flows and trace one policy-transmission channel.','Evaluate an intervention through jobs, capabilities and distribution.']},
 science:{title:'Science & Technology',headline:'Learn the principle. Understand the application.',blocks:['Physical Science','Life Science','Technology & Applications'],books:[['jesc1','keph1'],['kebo1','lebo1'],['leph2','kebt1']],intro:'Learn the science behind everyday observations, living systems and emerging technologies.',paper:'GS III',skills:['Explain a familiar phenomenon using correct quantities and units.','Draw a structure–function diagram and distinguish cause from effect.','Describe a technology’s mechanism, use, limitations and safeguards.']},
 environment:{title:'Environment & Ecology',headline:'See the connections. Think in systems.',blocks:['Ecology & Biodiversity','Pollution & Climate','Conservation & Governance'],books:[['lebo1'],['jesc1'],['lebo1']],intro:'Connect ecological systems, environmental pressures and practical conservation responses.',paper:'GS III',skills:['Draw an interaction network and trace an indirect effect.','Trace a pollutant or climate-risk pathway and compare responses.','Evaluate a conservation measure using ecology, people and monitoring.']},
 ethics:{title:'Ethics',headline:'Reason with clarity. Act with integrity.',blocks:['Values & Moral Reasoning','Public-Service Ethics','Case Studies & Decisions'],books:[[],[],[]],intro:'Develop clear definitions, public-service judgment and practical case-study answers.',paper:'GS IV',skills:['Compare two ethical lenses using a concrete decision.','Explain the value through a feasible administrative action.','Write a case response with stakeholders, options, reasons and follow-up.']}
};

function groupChapters(id,books){
 const all=books.flatMap((book,bi)=>book.chapters.map(c=>({...c,book:book.book,class:book.class,bi})));
 if(id==='geography')return [all.filter(c=>c.bi<=1||c.bi===5),all.filter(c=>[3,4,6].includes(c.bi)),all.filter(c=>[2,7,8].includes(c.bi))];
 if(id==='polity')return [all.filter(c=>c.bi<=3),all.filter(c=>c.bi===4||c.bi===5),all.filter(c=>c.bi===6||/Administration|Facilities|Justice|Media|Equality|Livelihood|Health/.test(c.title))];
 if(id==='economy')return [all.filter(c=>c.bi===3||c.bi===5),all.filter(c=>c.bi===4||/Money and Credit|Globalisation and the Indian/.test(c.title)),all.filter(c=>c.bi<=2&&!/Money and Credit/.test(c.title))];
 if(id==='science'){
   const life=/Food|Nutrition|Plants|Plant|Body|Living|Respiration|Transportation|Reproduction|Reproduce|Adolescence|Cell|Life|Tissues|Fall Ill|Heredity|physiology|health|Microorganisms|Microbes|Control and Coordination/i;
   const physical=/Motion|Measurement|Light|Electric|Magnet|Heat|Acids|Chemical|Physical|Force|Friction|Sound|Matter|Atoms|Atom|Gravitation|Energy|Metals|Carbon|Periodic|Thermodynamics|Hydrocarbons|Combustion/i;
   return [all.filter(c=>!life.test(c.title)&&physical.test(c.title)),all.filter(c=>life.test(c.title)),all.filter(c=>!life.test(c.title)&&!physical.test(c.title)||c.class>=11)];
 }
 if(id==='environment'){
   const ecology=/Ecology|Ecosystems|food chains|Biogeochemical|Biodiversity|Forests as lifeline/i;
   const pressures=/Pollution|pollution|Ozone|greenhouse|Climate|Waste|Garbage|Coal|Water as/i;
   return [all.filter(c=>ecology.test(c.title)),all.filter(c=>pressures.test(c.title)),all.filter(c=>!ecology.test(c.title)&&!pressures.test(c.title))];
 }
 throw Error('Unknown subject');
}

for(const [id,def] of Object.entries(definitions)){
 const bookData=id==='ethics'?null:await read(`public/data/ncert-${id}.json`);
 const groups=id==='ethics'?ethicsTopics.map(rows=>rows.map(([title,summary,task])=>({title,summary,task,points:[],book:'Original GS-IV study notes',class:null}))):groupChapters(id,bookData.books);
 const sources={}; const readers={}; const dossiers={}; const pyqs=[];
 const segments=groups.map((chapters,index)=>{
   if(!chapters.length)throw Error(`Empty ${id} group ${index}`);
   const segmentId=`block-${index+1}`;
   const dossierId=`${id}-${index+1}`;
   dossiers[dossierId]=units[id][index];
   const sourceIds=[];
   readers[segmentId]=[];
   for(const code of def.books[index]){
     const book=catalog.find(r=>r.id===`ncert-${code}`);
     if(!book)throw Error(`Book missing: ${code}`);
     sources[code]={title:`NCERT Class ${book.class}: ${book.title}`,url:book.sourceUrl,access:'Official book portal. The reading list uses topic names; legacy and current editions may organise or omit material differently.'};
     sourceIds.push(code);
     for(const [n,ch] of book.chapters.entries())readers[segmentId].push([`${book.title} — chapter ${n+1}`,`${code}${String(n+1).padStart(2,'0')}`,ch.url]);
   }
   if(id==='ethics'){
     sources.arc={title:'Second ARC: Ethics in Governance',url:'https://darpg.gov.in/sites/default/files/ethics4.pdf',access:'Official government report for supplementary reading. The daily notes and cases here are original teaching material, not extracted report text.'};
     sourceIds.push('arc');readers[segmentId]=[['Second ARC — Ethics in Governance','arc','https://darpg.gov.in/sites/default/files/ethics4.pdf']];
   }
   const recent=[];const days=[];let teaching=0;
   for(let localDay=1;localDay<=20;localDay++){
     const day=index*20+localDay;
     const checkpoint=[7,14,19,20].includes(localDay);
     let selected,topic,mode;
     if(checkpoint){
       selected=recent.slice(localDay===20?-16:-6);mode=localDay===20?'test':'revision';
       topic=localDay===20?`${def.blocks[index]}: assessment & repair`:localDay===19?`${def.blocks[index]}: synthesis`: `Revision ${localDay===7?'I':'II'}: ${def.blocks[index]}`;
     }else{
       const start=Math.floor(teaching*chapters.length/16);
       const end=Math.max(start+1,Math.floor((teaching+1)*chapters.length/16));
       selected=chapters.slice(start,end);
       const repeated=recent.some(c=>c.title===selected[0].title);
       mode=repeated?'application':'reading';
       topic=selected.map(c=>c.title).join(' + ')+(repeated?' — application':'');
       recent.push(...selected);teaching++;
     }
     selected=[...new Map(selected.map(c=>[c.title,c])).values()];
     const notes=checkpoint?selected.map(c=>`${c.title}: ${c.summary}`):selected.flatMap(c=>[c.summary,...(c.points.length?[`Key distinctions to retain: ${c.points.join('; ')}.`]:[])]);
     const reading=checkpoint?`Revisit your notes for ${selected.map(c=>c.title).join('; ')}. Re-read the assigned source sections only where your recall is weak.`:selected.map(c=>`${c.class?`Class ${c.class} · `:''}${c.book}: ${c.title}.`).join(' ');
     const task=checkpoint?(mode==='test'?`Use the official-paper link or your question bank for a timed ${id==='ethics'?'case study and two short answers':'20-question topic test and one short answer'}. Mark the gaps, explain your errors and schedule a second recall attempt.`:`Close the notes and reconstruct the main distinctions from the last ${selected.length} topics. ${def.skills[index]} Then compare your work with the material below.`):`${def.skills[index]} ${selected.map(c=>c.task||`Write five explained points on ${c.title}, then check them against the notes and source reading.`).join(' ')}`;
     const recall=checkpoint?'Which two distinctions remain hardest to explain, and what evidence or example resolves each?':selected[0].task||`Explain ${selected[0].title} in your own words and connect it to ${selected[0].points[0]||def.blocks[index]}.`;
     const recallAnswer=selected.map(c=>c.summary).join(' ');
     const studyWords=[...notes,...units[id][index].sections.map(s=>s.text)].join(' ').split(/\s+/).length;
     days.push({day,topic,notes,reading,task,recall,recallAnswer,studyWords,deepReading:[dossierId],sources:sourceIds,mode});
   }
   const u=units[id][index];
   if(u.mcq){const [prompt,options,answerIndex,answer]=u.mcq;pyqs.push({segment:segmentId,stage:'Prelims',reference:'Original concept check',prompt,options,answer:`${String.fromCharCode(65+answerIndex)} — ${answer}`,day:index*20+1,paper:def.paper});}
   pyqs.push({segment:segmentId,stage:'Mains',reference:id==='ethics'?'Original case exercise':'Original answer-writing exercise',prompt:u.practice.question,marks:10,words:150,answer:u.practice.answer,day:index*20+1,paper:def.paper});
   return {id:segmentId,title:def.blocks[index],icon:id,description:`${def.skills[index]} Build the foundation through the daily notes and use the block companion to connect concepts.`,sources:sourceIds,days};
 });
 const course={id,title:def.title,headline:def.headline,intro:def.intro,practiceOnly:true,readerTitle:id==='ethics'?'Official report reader':'NCERT textbook reader',readerDescription:id==='ethics'?'Read the official supplementary report here, alongside the original daily lessons.':'Choose an official chapter from this study block. Use the book contents to match the topic: chapter numbering and retained content vary by edition.',sources,segments,dossiers,pyqs,readers,
 editionNote:'Daily material is original study guidance using the subject’s NCERT topic sequence or, for Ethics, original GS-IV lessons. Blocks deliberately revisit concepts through application and revision days. The shared block companion supports several daily topics. Consult current official sources for changing laws, policy settings and statistics. Practice questions here are original exercises, not claimed as actual UPSC PYQs.'};
 await writeFile(`public/data/study-course-${id}.json`,JSON.stringify(course,null,2)+'\n');
 console.log(`Built ${id}: ${segments.reduce((n,s)=>n+s.days.length,0)} days, ${groups.reduce((n,g)=>n+g.length,0)} topic readings.`);
}
