import { writeFile } from 'node:fs/promises';
import { lessons, pyqs } from './history-lessons.mjs';
import { dossiers, dayDossiers, readers } from './history-deep-reading.mjs';

const sources = {
  ncert12c: { title: 'NCERT: Themes in Indian History III', url: 'https://ncert.nic.in/textbook.php?lehs3=0-4', access: 'Official NCERT chapter PDFs and complete-book download. Read the matching colonial history theme before Spectrum.' },
  ncert6: { title: 'NCERT: Our Pasts I (Class 6, legacy edition)', url: 'https://ncert.nic.in/textbook.php?fess1=0-12', access: 'Official NCERT chapter PDFs / complete-book download; legacy edition availability may vary.' },
  ncert12a: { title: 'NCERT: Themes in Indian History I', url: 'https://ncert.nic.in/textbook.php?lehs1=0-4', access: 'Official NCERT chapter PDFs and complete-book download.' },
  tamil: { title: 'Tamil Nadu Class 11 History I — NDLI chapter collection', url: 'https://www.ndl.iitkgp.ac.in/se_document/tn_school_board/12345678_tnbrd/16872', access: 'Government textbook indexed by NDLI. Choose the lesson in the sidebar; the opening item is the preface. Sign-in may be requested.' },
  ncert7: { title: 'NCERT: Our Pasts II (Class 7, legacy edition)', url: 'https://ncert.nic.in/textbook.php?gess1=1-10', access: 'Official NCERT chapter PDFs / complete-book download; legacy edition availability may vary.' },
  ncert12b: { title: 'NCERT: Themes in Indian History II', url: 'https://ncert.nic.in/textbook.php?lehs2=0-4', access: 'Official NCERT chapter PDFs and complete-book download.' },
  spectrum: { title: 'Spectrum: A Brief History of Modern India', url: 'https://spectrumbooksonline.in/product/a-brief-history-of-modern-india/', access: 'Publisher book listing. Read from your purchased or library copy; no authorized free full PDF verified.' },
  bipan: { title: 'Bipan Chandra et al.: India’s Struggle for Independence', url: 'https://www.penguin.co.in/book/indias-struggle-for-independence/', access: 'Publisher book listing. Supplementary reading from your purchased or library copy; no authorized free full PDF verified.' }
};

// Original reading assignments; these do not reproduce textbook text.
const ancient = [
  ['Sources and the ancient timeline', 'ncert6,tamil', 'Our Pasts I: What, Where, How and When?; Tamil Nadu: opening discussion of early India.', 'Draw a timeline from prehistory to c. 750 CE. Compare inscriptions, coins, archaeology and literary sources.'],
  ['Hunter-gatherers and early farming', 'ncert6,tamil', 'Our Pasts I: From Hunting–Gathering to Growing Food; Tamil Nadu: early India before the Indus civilisation.', 'Map major prehistoric sites and compare Palaeolithic, Mesolithic and Neolithic life.'],
  ['Harappan cities', 'ncert12a,tamil', 'Themes I: Bricks, Beads and Bones; Tamil Nadu: Indus civilisation.', 'Map Harappa, Mohenjo-daro, Dholavira, Rakhigarhi and Lothal; list evidence for urban planning.'],
  ['Harappan economy and interpretation', 'ncert12a', 'Bricks, Beads and Bones: crafts, trade, burials and archaeological interpretation.', 'Make an evidence-versus-inference table; explain why the undeciphered script limits conclusions.'],
  ['Vedic cultures and the Iron Age', 'ncert6,tamil', 'Our Pasts I: What Books and Burials Tell Us; Tamil Nadu: Chalcolithic, Megalithic, Iron Age and Vedic cultures.', 'Compare early and later Vedic economy, polity and society; distinguish textual and burial evidence.'],
  ['Mahajanapadas and Magadha', 'ncert6,tamil', 'Our Pasts I: Kingdoms, Kings and an Early Republic; Tamil Nadu: rise of territorial kingdoms.', 'Map the mahajanapadas; explain Magadha’s growth with special attention to Rajgir and Pataliputra.'],
  ['Revision: early India', 'ncert6,ncert12a,tamil', 'Revisit Days 1–6 using your marked passages and notes.', 'Attempt 30 relevant PYQs or practice MCQs, review every error and redraw the ancient map from memory.'],
  ['Buddhism and Jainism', 'ncert6,tamil', 'Our Pasts I: New Questions and Ideas; Tamil Nadu: new religious sects.', 'Compare teachings, sanghas and patronage; mark Bodh Gaya, Sarnath, Rajgir, Vaishali and Pawapuri.'],
  ['Belief, stupas and sculpture', 'ncert12a', 'Themes I: Thinkers, Beliefs and Buildings.', 'Sketch a stupa and label its features; write 150 words on material evidence and religious traditions.'],
  ['The Mauryan state', 'ncert6,tamil', 'Our Pasts I: Ashoka, the Emperor Who Gave Up War; Tamil Nadu: emergence of state and empire.', 'Create a ruler–source–administration table, including Megasthenes and the Arthashastra with source limitations.'],
  ['Ashoka and dhamma', 'ncert12a,tamil', 'Themes I: Kings, Farmers and Towns, Mauryan sections; Tamil Nadu: Ashoka.', 'Distinguish dhamma from a sectarian doctrine; map major edict sites and write a short answer on governance.'],
  ['Post-Mauryan kingdoms and exchange', 'tamil,ncert12a', 'Tamil Nadu: Polity and Society in Post-Mauryan Period; Themes I: trade and towns.', 'Compare Indo-Greeks, Shakas, Kushanas and Satavahanas; trace land and maritime trade routes.'],
  ['Sangam society', 'tamil,ncert6', 'Tamil Nadu: Evolution of Society in South India; Our Pasts I: villages, towns and trade.', 'Summarise Chera, Chola and Pandya polities, tinai landscapes, ports and literary evidence.'],
  ['Revision: religions and empires', 'ncert12a,tamil', 'Revisit Days 8–13, especially religion, Mauryas and trade.', 'Attempt 30 MCQs and one 150-word answer comparing Mauryan and post-Mauryan political organisation.'],
  ['Guptas: polity and economy', 'tamil,ncert6', 'Tamil Nadu: The Guptas; Our Pasts I: New Empires and Kingdoms.', 'Build a ruler–inscription table; compare land grants, taxation, urban change and political authority.'],
  ['Kinship, caste and gender', 'ncert12a', 'Themes I: Kinship, Caste and Class.', 'Compare prescriptions with social practice; prepare notes on gotra, inheritance and the use of the Mahabharata.'],
  ['Harsha and regional kingdoms', 'tamil,ncert6', 'Tamil Nadu: Harsha and Rise of Regional Kingdoms; Our Pasts I: New Empires and Kingdoms.', 'Compare Harsha, Chalukyas and Pallavas; note Xuanzang and Banabhatta as different kinds of sources.'],
  ['Art, learning and literature', 'ncert6,tamil', 'Our Pasts I: Buildings, Paintings and Books; Tamil Nadu: Cultural Development in South India.', 'Make an art-form–site–patron table; include Nalanda, Ajanta and early temple traditions.'],
  ['Ancient Bihar consolidation', 'ncert12a,tamil', 'Revisit Magadha, Mauryas, Buddhist and Jain sites and centres of learning in your assigned books.', 'Create a Bihar map and timeline; write 150 words explaining the importance of Magadha in early state formation.'],
  ['Ancient History test and repair', 'ncert6,ncert12a,tamil', 'Revise the full Ancient segment using your error log.', 'Take 50 mixed MCQs, write two short answers, and re-read the three weakest topics.']
];
const medieval = [
  ['Sources and early medieval change', 'ncert7', 'Our Pasts II: Tracing Changes through a Thousand Years.', 'Build a c. 700–1750 CE timeline; compare chronicles, inscriptions, travel accounts and architecture.'],
  ['Regional kingdoms and Cholas', 'ncert7', 'Our Pasts II: New Kings and Kingdoms.', 'Compare samantas, land grants and Chola local institutions; map regional kingdoms.'],
  ['Delhi Sultanate: political expansion', 'ncert7', 'Our Pasts II: The Delhi Sultans, dynasties and expansion.', 'Draw the dynasty sequence and map expansion; separate contemporary evidence from later accounts.'],
  ['Sultanate administration', 'ncert7', 'The Delhi Sultans: iqta, revenue, military organisation and measures under Khaljis and Tughlaqs.', 'Compare administrative policies and write a short answer on the challenges of expansion.'],
  ['Mughals and the Sur interlude', 'ncert7', 'Our Pasts II: The Mughal Empire, political chronology including Humayun and Sher Shah.', 'Trace Babur to Aurangzeb; add a Bihar note on Sher Shah and Sasaram from your available references.'],
  ['Mughal administration and agrarian society', 'ncert7,ncert12b', 'Our Pasts II: Mughal administration; Themes II: Peasants, Zamindars and the State.', 'Explain mansab, jagir, zamindar and revenue assessment; distinguish rank from a hereditary estate.'],
  ['Revision: kingdoms and administration', 'ncert7,ncert12b', 'Revisit Days 21–26.', 'Solve 30 relevant MCQs and compare Sultanate and Mughal administration in a one-page table.'],
  ['Vijayanagara', 'ncert12b', 'Themes II: An Imperial Capital—Vijayanagara.', 'Sketch the sacred centre, royal centre and waterworks; list the archaeological and travel-account evidence.'],
  ['Bhakti and Sufi traditions', 'ncert7,ncert12b', 'Our Pasts II: Devotional Paths to the Divine; Themes II: Bhakti-Sufi Traditions.', 'Compare major saints, languages, ideas and Sufi silsilas without treating either tradition as uniform.'],
  ['Travellers and everyday life', 'ncert12b', 'Themes II: Through the Eyes of Travellers.', 'Compare Al-Biruni, Ibn Battuta and Bernier by period, observations and limitations.'],
  ['Architecture and regional culture', 'ncert7', 'Our Pasts II: Rulers and Buildings and The Making of Regional Cultures, where retained in your edition.', 'Create a monument–patron–style table; use the existing class-wise notes for omitted legacy topics.'],
  ['Towns, crafts and communities', 'ncert7,ncert12b', 'Our Pasts II: towns and trade where available; Tribes, Nomads and Settled Communities; Themes II: agrarian society.', 'Compare urban crafts, itinerant trade and tribal state formation; add Gond and Ahom examples.'],
  ['Eighteenth-century regional powers', 'ncert7', 'Our Pasts II: Eighteenth-Century Political Formations.', 'Map Awadh, Bengal, Hyderabad, Marathas and Sikhs; distinguish Mughal decline from an absence of political activity.'],
  ['Medieval Bihar and culture revision', 'ncert7,ncert12b', 'Revisit the Sur dynasty, agrarian relations, Sufi traditions and regional culture.', 'Consolidate Bihar references and monument notes; write a 150-word answer on cultural interaction.'],
  ['Medieval History test and repair', 'ncert7,ncert12b', 'Revise the full Medieval segment and compare it with Ancient History.', 'Take 50 MCQs and two short answers; repair weak topics and complete a combined chronology.']
];
const modern = [
  ['European entry and Company expansion', 'spectrum', 'Read the sections on European trading companies, Carnatic conflicts, Bengal, Plassey and Buxar.', 'Map trading centres and make a battle–treaty–consequence table; highlight Buxar and the Diwani.'],
  ['Conquest and colonial administration', 'spectrum', 'Read British expansion, subsidiary alliances, annexation and the development of administration.', 'Compare methods of expansion and organise major administrative changes chronologically.'],
  ['Land revenue and colonial economy', 'spectrum', 'Read land settlements, economic impact, deindustrialisation, drain of wealth and commercialisation.', 'Compare Permanent, Ryotwari and Mahalwari settlements; connect the Permanent Settlement to Bihar.'],
  ['Resistance before 1857', 'spectrum,bipan', 'Spectrum: civil, tribal and peasant resistance; Bipan Chandra: matching early resistance discussions.', 'Make a movement–region–grievance–leadership table; include Santhal and Kol resistance with historical regional context.'],
  ['The Revolt of 1857', 'spectrum,bipan', 'Read the matching sections on the revolt, its social base, regional spread and British response.', 'Map centres and leaders including Kunwar Singh; write an answer on causes and limitations.'],
  ['Social and religious reform', 'spectrum', 'Read reform movements, education, press and women’s questions.', 'Compare organisations, founders, approaches and limitations; avoid reducing reform to founder lists alone.'],
  ['Revision: conquest and resistance', 'spectrum,bipan', 'Revisit Days 36–41 and cross-check your chronology.', 'Attempt 40 MCQs and one answer on the economic consequences of colonial rule.'],
  ['Nationalism and the early Congress', 'spectrum,bipan', 'Read the emergence of nationalism, formation of Congress and moderate politics.', 'Explain economic critique and political methods; build a session–president–decision table for key sessions.'],
  ['Swadeshi and assertive nationalism', 'spectrum,bipan', 'Read Bengal partition, Swadeshi, boycott and the Surat split.', 'Compare forms of mobilisation, participation and limitations; draw the 1905–1908 timeline.'],
  ['Revolutionaries and Home Rule', 'spectrum,bipan', 'Read revolutionary activity, Ghadar, the First World War, Home Rule and the Lucknow Pact.', 'Distinguish revolutionary networks from constitutional campaigns; connect 1909 reforms and wartime politics.'],
  ['Gandhi’s early campaigns', 'spectrum,bipan', 'Read Gandhi’s return, Champaran, Ahmedabad and Kheda.', 'Compare grievances and methods; prepare a Bihar-focused note on Champaran and local participation.'],
  ['Rowlatt, Khilafat and Non-Cooperation', 'spectrum,bipan', 'Read the Rowlatt agitation, Jallianwala Bagh, Khilafat and Non-Cooperation.', 'Create a cause–programme–participation–withdrawal chart and explain Chauri Chaura’s significance.'],
  ['Politics during the 1920s', 'spectrum,bipan', 'Read Swarajists, constructive work, revolutionary nationalism, Simon Commission and the Nehru Report.', 'Trace the debate from constitutional reform to complete independence.'],
  ['Revision: nationalism to 1929', 'spectrum,bipan', 'Revisit Days 43–48.', 'Attempt 40 MCQs and compare Swadeshi with Non-Cooperation in a short answer.'],
  ['Civil Disobedience', 'spectrum,bipan', 'Read the Lahore session, Salt March, regional mobilisation and Gandhi–Irwin Pact.', 'Compare Civil Disobedience with Non-Cooperation; note women’s participation and regional differences.'],
  ['Constitutional negotiations', 'spectrum,bipan', 'Read Round Table Conferences, Communal Award, Poona Pact and the Government of India Act 1935.', 'Separate proposals from enacted provisions; make a representation and franchise comparison table.'],
  ['Congress ministries and social movements', 'spectrum,bipan', 'Read the 1937 elections, ministries, socialist currents, workers and peasants.', 'Add Bihar’s peasant mobilisation and Sahajanand Saraswati; assess the achievements and limits of ministries.'],
  ['War and Quit India', 'spectrum,bipan', 'Read the Second World War, August Offer, Individual Satyagraha, Cripps Mission and Quit India.', 'Build a 1939–1942 sequence and a Bihar note on underground activity and Jayaprakash Narayan.'],
  ['Subhas Bose and the INA', 'spectrum,bipan', 'Read Bose, the INA, INA trials and the Royal Indian Navy uprising.', 'Compare military, political and popular pressure in the final phase of British rule.'],
  ['Transfer of power and Partition', 'spectrum,bipan', 'Read Wavell, Cabinet Mission, interim government, Partition and the transfer of power.', 'Compare successive proposals; write a balanced answer on the causes and consequences of Partition.'],
  ['Revision: 1930–1947', 'spectrum,bipan', 'Revisit Days 50–55.', 'Solve 40 MCQs, write two short answers and repair confusion between proposals, pacts and acts.'],
  ['Acts, governors and national institutions', 'spectrum', 'Revisit constitutional development, important administrative measures and Congress sessions.', 'Build linked timelines for 1773–1947; learn office-holders through the measures and events associated with them.'],
  ['Press, education, reform and culture', 'spectrum', 'Revisit newspapers, educational policies, organisations and cultural responses to colonialism.', 'Create a publication–editor–purpose table and revise social reform; practise 25 targeted MCQs.'],
  ['Modern Bihar consolidation', 'spectrum,bipan', 'Revisit Buxar, 1857, Champaran, peasant movements and Quit India in the assigned readings.', 'Prepare a two-page Bihar timeline with people, places and significance; write one BPSC-style answer.'],
  ['Full History mock and next revision', 'spectrum,bipan,ncert12a,ncert12b', 'Review your error log across all three periods.', 'Attempt 60 mixed MCQs and three short answers. List your five weakest topics and schedule revision after 7 and 21 days.']
];

let day = 0;
const segments = [
  ['ancient', 'Ancient', 'Build your foundation with NCERT and use Tamil Nadu Class 11 for a connected account of early India.', ['ncert6','ncert12a','tamil'], ancient],
  ['medieval', 'Medieval', 'Use NCERT for political history, society, art and culture, supported by Class 12 thematic readings.', ['ncert7','ncert12b'], medieval],
  ['modern', 'Modern', 'Use Spectrum as the main revision book and Bipan Chandra for the causes, debates and development of the freedom struggle.', ['spectrum','bipan'], modern]
].map(([id,title,description,refs,rows]) => ({id,title,description,sources:refs,days:rows.map(([topic,sourceIds,reading,task]) => ({day:++day,topic,sources:sourceIds.split(','),reading,task}))}));

if (lessons.length !== 60 || day !== 60) throw new Error('Expected 60 complete daily lessons');
for (const segment of segments) for (const item of segment.days) {
  const [a,b,c,recall,recallAnswer] = lessons[item.day - 1];
  Object.assign(item, {notes:[a,b,c], recall, recallAnswer});
  item.deepReading = dayDossiers[item.day - 1];
  if (!item.deepReading?.length || item.deepReading.some(id => !dossiers[id])) throw new Error(`Missing detailed lesson for day ${item.day}`);
  const prose = item.deepReading.flatMap(id => dossiers[id].sections.map(s => s.text));
  item.studyWords = [...item.notes, ...prose].join(' ').split(/\s+/).length;
  item.task = item.task.replace('use the existing class-wise notes for omitted legacy topics.', 'use the revision notes above for omitted legacy topics.');
  item.reading = item.reading.replace('existing class-wise notes', 'revision notes above');
  if (segment.id === 'modern') {
    const themes = item.day <= 42 ? 'Colonialism and the Countryside; Rebels and the Raj' : item.day <= 55 ? 'Mahatma Gandhi and the Nationalist Movement' : 'Framing the Constitution and a review of the earlier themes';
    item.sources.unshift('ncert12c');
    item.reading = `Foundation: NCERT Themes III — ${themes}; focus on today’s topic. Main reading: ${item.reading}`;
  }
}
segments[2].sources.unshift('ncert12c');
segments[2].description = 'Start with the matching NCERT theme, use Spectrum for systematic coverage, and deepen your understanding of the freedom struggle with Bipan Chandra.';

await writeFile('public/data/history-plan.json', JSON.stringify({
  routine: 'Each day: 60 minutes reading, 25 minutes notes or maps, 25 minutes practice, 10 minutes recall. On test days, use reading time for the test and error review. Use the site’s quiz/PYQ sections or your own question bank.',
  editionNote: 'Assignments use topics rather than page numbers. Our Pasts refers to legacy NCERT editions; newer and rationalised editions may omit or rename chapters. Use the linked Class 12/Tamil Nadu readings and revision notes to fill gaps. These are original study notes and reading assignments, not extracted or reproduced book text.',
  sources, segments, pyqs, dossiers, readers
}, null, 2) + '\n');
console.log(`Built ${day}-day History plan.`);
