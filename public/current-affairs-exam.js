// Topic-based practice, not predictions or past UPSC questions.
const CurrentAffairsExam = (() => {
  const constitution='https://www.legislative.gov.in/constitution-of-india';
  const climate='https://unfccc.int/process-and-meetings/the-paris-agreement';
  const space='https://www.isro.gov.in/ISRO_EN/EarthObservationSatellites.html';
  const trade='https://www.wto.org/english/thewto_e/whatis_e/whatis_e.htm';
  const rules=[];
  function add(id,test,paper,topic,question,options,answer,explanation,reference) {
    rules.push({id,test,paper,topic,question,options,answer,explanation,reference});
  }
  add('wetlands',/ramsar|wetland/i,'GS III','Wetland conservation',
    'The Ramsar Convention primarily concerns which of the following?',
    ['Trade in endangered species','Conservation and wise use of wetlands','Protection of the ozone layer','Control of hazardous waste movements'],1,
    'Ramsar promotes wetland conservation and sustainable use. It is distinct from CITES, the Montreal Protocol and the Basel Convention.',
    'https://www.ramsar.org/about/our-mission/wise-use-wetlands');
  add('biodiversity',/\bcbd\b|biodiversity|protect.*nature/i,'GS III','Biodiversity',
    'Which is NOT an objective of the Convention on Biological Diversity?',
    ['Conserving biological diversity','Sustainable use of its components','Fair sharing of benefits from genetic resources','Fixing a single worldwide carbon tax'],3,
    'The Convention has three central objectives: conservation, sustainable use and fair benefit sharing from genetic resources.',
    'https://www.cbd.int/convention/articles?a=cbd-01');
  add('carbon-capture',/carbon capture/i,'GS III','Climate technology',
    'Which statement about carbon capture and storage is correct?',
    ['It separates carbon dioxide and can store it underground','It removes the need to cut other emissions','All captured carbon must become fuel','It works only in solar-power plants'],0,
    'Capture separates carbon dioxide. Geological storage can retain it underground; capture complements rather than replaces other emissions cuts.');
  add('manuscripts',/manuscript/i,'GS I','Cultural heritage',
    'Consider two statements about manuscript digitisation: 1. It can improve access. 2. It eliminates the need to conserve originals. Which is correct?',
    ['1 only','2 only','Both 1 and 2','Neither 1 nor 2'],0,
    'Digital copies can widen access, but the original material still needs physical conservation and suitable storage.');
  add('genetics',/genetic|biotechnolog/i,'GS III','Biotechnology',
    'Genetic diversity refers to variation in:',
    ['Only the number of countries holding seed banks','Only the number of ecosystems','Genes within a species or population','Only the total size of a forest'],2,
    'Genetic diversity concerns differences in genes within a species or population, rather than the number of ecosystems.');
  add('adoption',/adoption|\bcara\b/i,'GS II','Child welfare',
    'CARA is primarily associated with which area of administration?',
    ['Crop insurance','Child adoption','Election spending','Industrial safety'],1,
    'The Central Adoption Resource Authority deals with child adoption. The reported meeting concerns family-based care for children with disabilities.');
  add('measurement',/metrology|measurement standards/i,'GS II','Consumer protection',
    'Legal metrology primarily protects consumers by ensuring:',
    ['A fixed price for every product','A ban on all imported goods','Accurate weights and measures','Identical packaging designs'],2,
    'Legal metrology regulates weights and measures so consumers receive accurately measured quantities.',
    'https://consumeraffairs.gov.in/pages/legal-metrology-overview');
  add('federalism',/cooperative federalism/i,'GS II','Centre-state relations',
    'Which best illustrates cooperative federalism?',
    ['States lose every independent power','The Union and states consult on shared policy problems','Every state must adopt identical laws','Courts replace elected state governments'],1,
    'Cooperation involves consultation and coordination between levels of government while retaining their constitutional responsibilities.',constitution);
  add('air',/air pollution|pollution watchdog|cars.*pollution|reducing pollution/i,'GS III','Air pollution',
    'PM2.5 refers to particles with a diameter of:',
    ['2.5 millimetres or less','Exactly 25 micrometres','2.5 centimetres or less','2.5 micrometres or less'],3,
    'PM2.5 describes fine particles with a diameter no greater than 2.5 micrometres. Their small size makes them a health concern.');
  add('elnino',/el ni.o/i,'GS I','Climate and weather',
    'El Nino is associated with unusually warm surface waters in the:',
    ['Central and eastern tropical Pacific','Northern Atlantic only','Southern Indian Ocean only','Arctic Ocean'],0,
    'El Nino involves warming in the central and eastern tropical Pacific, with effects on weather patterns elsewhere.',
    'https://www.noaa.gov/understanding-el-nino');
  add('thermal',/gujarat.*satellite|thermal.imag/i,'GS III','Space applications',
    'A thermal-infrared Earth-observation sensor is especially useful for mapping:',
    ['Parliamentary voting patterns','The legal status of land ownership','Surface-temperature differences','The chemical content of every underground mineral'],2,
    'Thermal-infrared observations help estimate surface temperatures and identify heat patterns, including hot urban areas and fires.',
    'https://cnes.fr/en/projects/trishna');
  add('space',/\bisro\b|space|skyroot|kasturirangan|rocket/i,'GS III','Space technology',
    'Which is an Earth-observation application of a satellite?',
    ['Setting the central-bank policy rate','Mapping crops and monitoring floods','Issuing citizenship certificates','Determining judicial appointments'],1,
    'Earth-observation satellites collect data used for mapping crops, water, land and natural disasters.',space);
  add('power-grid',/transmission|battery storage|new energy|green energy/i,'GS III','Energy infrastructure',
    'Why can battery storage help a grid with solar and wind power?',
    ['It makes sunlight available at night','It eliminates all electricity losses','It changes coal into solar energy','It stores energy for periods when generation is lower'],3,
    'Storage can move electricity availability across time, helping manage changes in solar and wind generation.');
  add('factory-jobs',/industry is growing|industrial production|\biip\b/i,'GS III','Industry and employment',
    'If factory output rises, what can be concluded about factory employment?',
    ['It need not rise at the same rate','It must rise at exactly the same rate','It must fall to zero','It becomes impossible to measure'],0,
    'Output and employment can change at different rates because productivity, technology and the type of production also matter.');
  add('detention',/\bnsa\b|preventive detention/i,'GS II','Fundamental rights',
    'Preventive detention is best distinguished from punishment after conviction because it:',
    ['Always requires a completed criminal trial','Has no constitutional safeguards','Aims to prevent anticipated harmful conduct','Is imposed only by foreign courts'],2,
    'Preventive detention is aimed at preventing anticipated conduct. It remains subject to applicable constitutional and legal safeguards.',constitution);
  add('monetary',/\brbi\b|interest rates?|repo|fed cuts|rates must reflect|central bank/i,'GS III','Monetary policy',
    'In India, which body determines the policy repo rate?',
    ['The Finance Commission','The Monetary Policy Committee','The Election Commission','The Comptroller and Auditor General'],1,
    'The Monetary Policy Committee determines the policy repo rate under the RBI Act. It is distinct from fiscal and electoral institutions.',
    'https://systemhealth.rbi.org.in/Scripts/FS_Overview2752.aspx.html');
  add('climate-court',/\bicj\b|climate justice|at unga/i,'GS II','International institutions',
    'The International Court of Justice is best described as:',
    ['A court that prosecutes every individual war-crime suspect','A regional court of the European Union','A committee of the World Bank','The principal judicial organ of the United Nations'],3,
    'The ICJ is the UN’s principal judicial organ. It is distinct from the International Criminal Court.');
  add('climate-finance',/cop ?30|bonn|climate finance|climate.*fund/i,'GS III','Climate finance',
    'Climate finance may support which activities? 1. Cutting emissions. 2. Adapting to climate impacts.',
    ['1 only','2 only','Both 1 and 2','Neither 1 nor 2'],2,
    'Climate finance supports both mitigation and adaptation, such as cleaner power and protection against floods.',climate);
  add('heat',/heat stress|surplus heat|heat.*climate/i,'GS III','Disaster management',
    'Why can high humidity increase the danger of extreme heat?',
    ['It can reduce cooling from sweat evaporation','It makes air temperature irrelevant','It prevents all dehydration','It guarantees lower body temperature'],0,
    'When humid air slows evaporation of sweat, the body has more difficulty losing heat. Temperature alone does not capture the full risk.');
  add('floods',/flood/i,'GS III','Disaster management',
    'Disaster risk depends on which combination?',
    ['Rainfall alone','Hazard, exposure and vulnerability','Only the national population','Only the number of relief announcements'],1,
    'The same hazard can cause different losses depending on who and what is exposed and how vulnerable they are.');
  add('mining',/minerals and mines/i,'GS III','Mineral resources',
    'A rise in mineral extraction alone necessarily proves which of the following?',
    ['All local livelihoods improve','Environmental costs disappear','Every state receives equal revenue','None of the above'],3,
    'Extraction figures alone do not establish local benefits, environmental outcomes or how revenue is shared.');
  add('parliament',/parliament.*session|monsoon session|parliament.*doors/i,'GS II','Parliament',
    'Parliamentary scrutiny of a proposed law helps primarily by:',
    ['Allowing examination of its provisions and likely effects','Removing the need for voting','Preventing all judicial review','Transferring all legislative power to officials'],0,
    'Debate and committee scrutiny allow examination of a bill. They do not remove voting requirements or constitutional review.',constitution);
  add('women-representation',/women.s reservation/i,'GS II','Political representation',
    'The general procedure for amending the Constitution is laid down in which Article?',
    ['Article 21','Article 112','Article 324','Article 368'],3,
    'Article 368 sets out the general constitutional amendment procedure. Some changes also require ratification by at least half of the states.',constitution);
  add('women-rights',/live.in|abortion|menstrual/i,'GS II','Social justice and rights',
    'Which constitutional Article protects life and personal liberty?',
    ['Article 280','Article 324','Article 21','Article 112'],2,
    'Article 21 protects life and personal liberty. Articles 280, 324 and 112 address different constitutional subjects.',constitution);
  add('cash-welfare',/cash transfers|social assistance|disability.pension/i,'GS II','Welfare schemes',
    'Which is the best evidence that a welfare transfer is reaching its intended group?',
    ['The scheme’s announcement alone','Verified access and receipt by eligible people','The number of publicity events','The programme’s name'],1,
    'Delivery must be assessed through access and actual receipt, not just announcements or publicity.');
  add('elections',/election|voter|\bsir\b/i,'GS II','Elections and electoral rolls',
    'Article 324 vests control over elections to Parliament and State Legislatures in the:',
    ['Finance Commission','Union Public Service Commission','National Development Council','Election Commission of India'],3,
    'Article 324 assigns the Election Commission responsibility for these elections and their electoral rolls. Local-body elections have a different framework.',constitution);
  add('education',/jee|women.*engineering|tuition|education system/i,'GS II','Education and inclusion',
    'Which measure would most directly help assess unequal access to additional tuition?',
    ['Participation and costs by household income group','Only the number of school holidays','Only the names of coaching centres','Only the total number of exam subjects'],0,
    'Participation and cost data across income groups help show whether additional education support is equally accessible.');
  add('ai',/\bai\b|artificial intelligence|anthropic/i,'GS III','Artificial intelligence',
    'Consider AI systems: 1. They can produce incorrect outputs. 2. Human review can remain necessary. Which is correct?',
    ['1 only','2 only','Both 1 and 2','Neither 1 nor 2'],2,
    'AI output is not a guarantee of accuracy. Human review and appropriate testing remain important, especially in consequential uses.');
  add('farming',/agricultur|fertilis|fertiliz/i,'GS III','Agriculture and inputs',
    'Which is a direct farm-input supply risk from disruption of imported fertiliser?',
    ['A guaranteed increase in rainfall','Shortages or higher input costs','An automatic rise in soil fertility','The elimination of import dependence'],1,
    'Disrupted fertiliser imports can reduce availability or raise input costs; they do not determine rainfall or automatically improve soil.');
  add('rupee',/rupee/i,'GS III','Exchange rates',
    'Other things equal, a rupee depreciation against the US dollar tends to:',
    ['Make a dollar-priced import cheaper in rupees','Fix all import prices permanently','Remove the need for foreign currency','Make a dollar-priced import costlier in rupees'],3,
    'More rupees are needed to purchase each dollar after depreciation, making an unchanged dollar import price costlier in rupees.');
  add('prices',/inflation|consumer.price|\bcpi\b|food.price/i,'GS III','Inflation and price indices',
    'If positive inflation falls from 6% to 4%, the general price level is:',
    ['Still rising, but more slowly','Necessarily falling by 2%','Unchanged by definition','Necessarily below the base-year level'],0,
    'Lower positive inflation means slower price growth, not necessarily a fall in the price level.');
  add('gdp',/\bgdp\b|growth figures|economic calibration/i,'GS III','National income statistics',
    'GDP measures the value of final goods and services produced:',
    ['Only by citizens working abroad','Only by government departments','Within an economy during a given period','Only in the manufacturing sector'],2,
    'GDP covers final production within an economy over a period. It is broader than factory output and is not limited to government production.');
  add('trans-rights',/transgender|trans rights/i,'GS II','Rights of vulnerable groups',
    'Which Article guarantees equality before the law and equal protection of laws?',
    ['Article 112','Article 14','Article 280','Article 324'],1,
    'Article 14 provides equality before the law and equal protection of laws. It is central to examining discriminatory state action.',constitution);
  add('bail',/bail/i,'GS II','Judiciary and personal liberty',
    'Which statement correctly distinguishes bail from acquittal?',
    ['Both always mean the person is found innocent','Bail finally decides guilt','Acquittal only postpones a trial','Bail concerns release from custody; acquittal decides the charge'],3,
    'Bail concerns custody while proceedings continue. An acquittal is a decision on the criminal charge; bail alone does not decide guilt.');
  add('nuclear-arms',/\bstart\b|nuclear gambit/i,'GS II','Arms control',
    'Nuclear arms-control arrangements primarily seek to:',
    ['Limit and monitor agreed categories of weapons','Regulate all national electricity tariffs','Manage civil aviation routes','Replace every country’s constitution'],0,
    'Arms-control arrangements address agreed weapon limits, verification and related security risks, rather than ordinary electricity regulation.');
  add('nuclear-power',/nuclear/i,'GS III','Nuclear energy',
    'Existing commercial nuclear power reactors chiefly release energy through:',
    ['Coal combustion','Uncontrolled solar fusion','Controlled nuclear fission','Wind-driven turbines alone'],2,
    'Commercial nuclear reactors use controlled fission to produce heat, which is then used to generate electricity.',
    'https://www.iaea.org/newscenter/news/what-is-nuclear-energy-the-science-of-nuclear-power');
  add('budget',/budget/i,'GS III','Public finance',
    'The Annual Financial Statement is provided for under which Article?',
    ['Article 21','Article 112','Article 324','Article 368'],1,
    'Article 112 provides for the Annual Financial Statement, setting out estimated receipts and expenditure of the Government of India.',constitution);
  add('carbon-border',/\bcbam\b/i,'GS III','Trade and climate policy',
    'The European Union’s CBAM links specified imports with:',
    ['The importer’s number of employees alone','The exporter’s election calendar','The age of the shipping vessel alone','Carbon emissions embedded in the products'],3,
    'The Carbon Border Adjustment Mechanism concerns embedded carbon emissions in covered imported products.');
  add('trade',/trade|tariff|import taxes|digital services tax|tax reversal/i,'GS III','International trade',
    'A tariff imposed on imported goods is:',
    ['A tax on those imports','A ban on every domestic sale','A form of judicial appointment','An interest rate paid on savings'],0,
    'An import tariff is a tax on imported goods. Its effects depend on its rate, coverage and market conditions.',trade);
  add('labour',/labour codes|labor codes/i,'GS III','Employment and labour',
    'Labour regulation is directly concerned with which of the following?',
    ['Only the design of national flags','Only foreign military deployment','Working conditions and employment relations','Only the timing of rainfall'],2,
    'Labour rules cover employment relations, working conditions and related protections; announced reform still needs implementation.');
  add('aravalli',/aravalli/i,'GS I','Indian physical geography',
    'The Aravalli range is chiefly associated with which broad region?',
    ['North-eastern India','North-western India','The Andaman Islands','The eastern coastal plain'],1,
    'The Aravallis extend across north-western India, notably Rajasthan, with extensions towards Gujarat, Haryana and Delhi.');
  add('elephants',/elephant census/i,'GS III','Wildlife conservation',
    'Why must a change in wildlife-counting method be considered when comparing estimates?',
    ['It proves all animals have migrated abroad','It makes every previous survey useless','It eliminates sampling uncertainty','It can affect comparability between survey results'],3,
    'A new method can change detection and estimation. Differences between totals should not automatically be treated as real population change.');
  add('vice-president',/vice president/i,'GS II','Constitutional offices',
    'The Vice-President of India is ex officio Chairperson of the:',
    ['Rajya Sabha','Lok Sabha','Finance Commission','Election Commission'],0,
    'Article 64 makes the Vice-President ex officio Chairperson of the Council of States, or Rajya Sabha.',constitution);
  add('property',/property rights/i,'GS II','Equality and social justice',
    'A study of equal property rights most directly raises which constitutional principle?',
    ['A fixed exchange rate','Uniform rainfall','Equality before the law','Automatic immunity from taxation'],2,
    'Equal treatment in access to rights is connected with constitutional equality; specific inheritance rules require examining the applicable law.',constitution);
  add('census',/census/i,'GS I','Population and society',
    'India’s national population census is conducted under which law?',
    ['The RBI Act, 1934','The Census Act, 1948','The Legal Metrology Act, 2009','The Wildlife Protection Act, 1972'],1,
    'The national census is conducted under the Census Act, 1948 and the associated rules.',
    'https://censusindia.gov.in/nada/index.php/catalog/47079');
  add('world-bank',/world bank/i,'GS II','International institutions',
    'The World Bank is most closely associated with:',
    ['Conducting Indian parliamentary elections','Fixing the Indian repo rate','Controlling every national court','Development finance and poverty reduction'],3,
    'The World Bank supports development and poverty reduction through finance, knowledge and technical support.');
  add('ncrb',/\bncrb\b/i,'GS II','Social justice and crime data',
    'A rise in registered crime cases alone necessarily proves:',
    ['Neither the full change in crime incidence nor its cause','That reporting practices stayed identical','That all incidents were reported','That prevention has become unnecessary'],0,
    'Registered cases are affected by incidence, reporting and registration. The figures alone do not establish the full change or its causes.');
  add('cancer',/cancer/i,'GS II','Public health',
    'A population-based cancer registry is chiefly useful for:',
    ['Setting import duty rates','Appointing judges','Tracking cancer occurrence in a defined population','Preparing electoral rolls'],2,
    'Population-based registries record cancer occurrence in a defined population, supporting measurement of disease burden and health planning.');
  add('water',/punjab and haryana|water.*dispute/i,'GS II','Inter-state relations',
    'Article 262 relates to disputes concerning:',
    ['The central-bank policy rate','Waters of inter-state rivers or river valleys','Appointments to the UPSC','The election of the President'],1,
    'Article 262 deals with adjudication of disputes relating to waters of inter-state rivers or river valleys.',constitution);
  add('security',/pahalgam|strikes|naxal/i,'GS III','Internal security',
    'A comprehensive internal-security response is best understood as combining:',
    ['Only publicity campaigns','Only restrictions without review','Only foreign trade agreements','Threat prevention, lawful action and community cooperation'],3,
    'Security policy benefits from prevention, lawful enforcement, coordination and cooperation with affected communities.');
  add('environment-approval',/ecology and public interest|environmental clearance/i,'GS III','Environmental impact assessment',
    'The main purpose of environmental impact assessment is to:',
    ['Review likely environmental effects before a project decision','Replace all public consultation','Guarantee that every project is harmless','Measure only the market price of land'],0,
    'Assessment identifies likely environmental effects and possible safeguards to inform decisions. It does not guarantee that a project has no impacts.');
  add('climate',/climate|warming|green energy|global carbon/i,'GS III','Climate change',
    'Which action is primarily climate adaptation rather than mitigation?',
    ['Building flood-resilient infrastructure','Replacing coal generation with solar power','Reducing methane leaks','Improving fuel efficiency'],0,
    'Adaptation reduces harm from climate impacts. The other options chiefly reduce emissions and are mitigation measures.',climate);
  add('energy',/energy crisis|oil|refiner/i,'GS III','Energy security',
    'For a country importing crude oil, a sustained rise in global oil prices can directly:',
    ['Eliminate all fuel taxes','Guarantee a stronger domestic currency','Raise the import bill, other things equal','End dependence on imported energy'],2,
    'At unchanged quantities and exchange rates, higher global oil prices raise the cost of oil imports.');
  add('international',/brics|china|bangladesh|iran|israel|lebanon|poland|washington|india.us|trump/i,'GS II','International relations',
    'Which statement best describes a joint diplomatic declaration?',
    ['It always has the same legal effect as a ratified treaty','Its legal effect depends on its nature and terms','It automatically changes every country’s domestic law','It guarantees that all announced work is complete'],1,
    'A joint declaration can set out political commitments. Its legal force depends on the document, not simply on the fact that leaders signed it.');
  function forIssue(item) {
    const rule=rules.find(entry=>entry.test.test(item.title));
    if(!rule)return null;
    const tags=[{paper:rule.paper,topic:rule.topic}];
    if(/brics/.test(item.title.toLowerCase())&&item.syllabus.some(link=>link.paper==='GS IV'))tags.push({paper:'GS IV',topic:'Accountability and technology'});
    return {...rule,tags,reference:rule.reference||item.url};
  }
  return {forIssue};
})();
