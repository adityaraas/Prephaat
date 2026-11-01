"""Merge short, source-checked official briefs without changing their publication dates."""
import hashlib
import json
import re
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'public/data/monthly-current-affairs.json'
archive = json.loads(PATH.read_text(encoding='utf-8'))
additions = []

def add(prid, published, title, subject, paper, topic, relevance, trigger, lines, extra=None):
    source = ROOT / f'.cache/current-affairs-sources/{prid}.html'
    html = source.read_text(encoding='utf-8')
    match = re.search(r'Posted On:\s*(\d{1,2})\s+(\w{3})\s+(\d{4})', html)
    assert match, f'Missing source date: {prid}'
    actual = datetime.strptime(' '.join(match.groups()), '%d %b %Y').date().isoformat()
    assert actual == published, (prid, actual, published)
    summary = [line.strip() for line in lines.split('|')]
    assert len(summary) == 10 and all(len(line.split()) >= 6 for line in summary), prid
    assert len((trigger+' '+' '.join(summary)).split()) <= 180, prid
    url = f'https://www.pib.gov.in/PressReleasePage.aspx?PRID={prid}&lang=1&reg=3'
    links = [dict(paper=paper, topic=topic, subject=subject, relevance=relevance)]
    if extra:
        links.append(extra)
    additions.append(dict(id=hashlib.sha256(url.encode()).hexdigest()[:20],title=title,url=url,published=published,
                          source='Press Information Bureau',topics=[subject],whyInNews=trigger,
                          summary=summary,syllabus=links,kind='Prepared study brief',verifiedOn=date.today().isoformat()))

add('2328977','2026-10-27','BRICS parliamentary declaration: institutions, technology and global governance','ir','GS II',
    'Global groupings, international institutions and parliamentary accountability',
    'Compare parliamentary diplomacy with executive negotiations. Revise UN reform, sovereignty and Indian interests; the declaration expresses commitments rather than demonstrating their implementation.',
    'The BRICS Parliamentary Forum concluded in New Delhi with a jointly adopted declaration on 27 October.',
    'Member parliaments adopted a common declaration after their deliberations.|The text reaffirms sovereignty and peaceful approaches to disputes.|Participants supported changes making the Security Council more representative.|The declaration condemns terrorism and its financing across borders.|It includes cooperation on digital public infrastructure and repositories.|Members discussed responsible applications of artificial intelligence in legislatures.|Transparency and public accountability were highlighted as parliamentary responsibilities.|Climate cooperation references differentiated responsibilities and national capabilities.|Participants called for better representation of developing country concerns.|The closing address identified China as the following chair.',
    dict(paper='GS IV',subject='ethics',topic='Accountability and ethical use of technology',relevance='Use legislative AI as a governance example: examine explainability, transparency and human responsibility instead of assuming technology automatically improves accountability.'))

add('2328896','2026-10-27','India at CBD COP17: biodiversity targets and benefit sharing','environment','GS III',
    'Biodiversity conservation and international environmental agreements',
    'Distinguish the biodiversity convention from climate negotiations. Connect national targets, genetic-resource benefit sharing and local institutions to implementation and financing.',
    'India presented its biodiversity position at CBD COP17 in Yerevan, according to the Environment Ministry.',
    'India delivered its national statement at the biodiversity conference.|Its position emphasises implementation suited to national circumstances.|Predictable funding and technology access were identified as important.|India supports benefit sharing involving digital genetic sequence information.|The statement refers to the multilateral Cali Fund mechanism.|Synthetic biology was discussed alongside precaution and scientific assessment.|The national action plan contains twenty-three biodiversity targets.|India described indicators used to track those national targets.|Mangrove restoration and wetland conservation were cited as initiatives.|Village-level institutions were linked to decentralised biological resource benefits.')

add('2329092','2026-10-27','Industrial production statistics: state-level IIP base revision','economy','GS III',
    'Industrial growth, national income statistics and economic indicators',
    'Revise index numbers, weights and base years. Distinguish industrial production from GDP, and national compilation from the statistical responsibilities of states.',
    'MoSPI announced a state-level industrial statistics workshop scheduled for 28–30 October in Thiruvananthapuram.',
    'The workshop is scheduled rather than reported as completed.|MoSPI is coordinating discussions with participating state statistical offices.|Its focus is revision of state industrial production indices.|The release identifies the national base as 2022–23.|A base year provides the reference for subsequent comparisons.|Updated baskets and weights should reflect changing industrial activity.|The revised framework includes selected additional utility service activities.|Factory reporting panels and substitution procedures are being reviewed.|State statistical departments compile and publish their own indices.|The exercise seeks greater consistency and comparability across states.')

add('2328830','2026-10-27','Carbon capture: applications in hard-to-abate industries','environment','GS III',
    'Climate mitigation, clean technology and industrial decarbonisation',
    'Distinguish capture, utilisation and permanent storage. Evaluate costs, energy use and storage integrity; prospective technologies should not be counted as verified emissions reductions.',
    'A PIB explainer reviewed carbon-capture technologies and Indian industrial decarbonisation efforts during the ESTIC conclave.',
    'Some industrial emissions cannot easily be eliminated through electrification.|Carbon capture separates carbon dioxide before its atmospheric release.|Captured gas requires preparation before transport or further processing.|Pipelines can transport compressed carbon dioxide between suitable sites.|Utilisation channels captured carbon into selected industrial applications.|Storage involves retaining carbon dioxide in suitable geological formations.|The explainer identifies steel and cement among relevant sectors.|Research bodies and industrial enterprises participate in Indian initiatives.|Projects are at different stages, including operation and proposals.|The technology is presented as complementary to other mitigation measures.')

add('2329164','2026-10-27','ESTIC 2026: research capacity and indigenous technology','science','GS III',
    'Scientific innovation, indigenisation and research ecosystems',
    'Separate achievements reported in the speech from proposals and future ambitions. Examine research finance, institutional collaboration and technology transfer rather than treating an event as an outcome.',
    'The Emerging Science, Technology and Innovation Conclave opened at Bharat Mandapam in New Delhi.',
    'The Prime Minister inaugurated the science and innovation conclave.|His address emphasised developing original technologies within India.|Startups were described as participants in the innovation ecosystem.|The speech discussed technological capabilities across multiple scientific fields.|Nuclear energy was linked to longer-term energy security objectives.|Indigenous research was presented as important for reducing dependencies.|Prior space and vaccine work served as illustrative examples.|Future technological ambitions were expressed alongside reported developments.|Institutional cooperation was discussed as support for scientific innovation.|Event participation alone does not establish commercial technology deployment.')

add('2322244','2026-10-12','September CPI: headline inflation and food-price pressures','economy','GS III',
    'Inflation, economic measurement and monetary policy transmission',
    'Read the reference month, release date and provisional status together. Compare food and headline indices; inflation is a rate of price change, not the price level.',
    'MoSPI released September 2026 consumer-price statistics on 12 October, with the latest figures marked provisional.',
    'Combined annual consumer inflation was provisionally reported at 5.54%.|The reference period is September, not the publication month.|Food inflation was provisionally recorded at 7.74% annually.|The statistical series uses 2024 as its base year.|Rural headline inflation was higher than the urban reading.|August figures were published as final in this release.|Food and general indices measure different consumption baskets.|The release provides separate rural, urban and combined figures.|National rates should not be substituted for individual state estimates.|October data were scheduled for publication during the following month.')

add('2328132','2026-10-25','Ramsar wetlands: ecological functions and conservation mechanisms','environment','GS III',
    'Wetland conservation, ecosystem services and environmental institutions',
    'Map wetland locations and conservation institutions. A Ramsar designation recognises international importance; evaluate ecological management separately from the growth in designated sites.',
    'An official explainer reviewed India’s Ramsar network and wetland conservation programmes as of October 2026.',
    'The explainer reports 103 Indian Ramsar sites in October.|Wetlands support biodiversity alongside important local economic activities.|Their functions include groundwater replenishment and moderating flood impacts.|Both natural and artificial wetlands fall within convention definitions.|The convention was adopted at Ramsar in Iran.|India became a contracting party during February 1982.|Indian wetland management also involves domestic conservation rules.|The explainer discusses the National Plan for Aquatic Ecosystems.|Community participation is associated with programmes including Mission Sahbhagita.|Site designation and continuing ecological protection require separate assessment.')

add('2326133','2026-10-21','Delhi-NCR air pollution: Stage I of GRAP invoked','environment','GS III',
    'Air pollution, environmental regulation and inter-agency coordination',
    'Revise AQI categories, CAQM, CPCB and graded responses. Link dust, waste and transport measures to enforcement, distinguishing the dated order from today’s air quality.',
    'CAQM activated Stage I of the graded pollution-response plan after reviewing Delhi’s worsening air quality.',
    'The order describes Delhi readings in the poor category.|Stage I corresponds to AQI values between 201–300.|CAQM reviewed pollution data and meteorological information before acting.|The release directs implementation across the National Capital Region.|Construction dust controls form part of the prescribed response.|Waste handling and preventing illegal dumping are also covered.|Road sweeping and sprinkling require appropriate dust disposal.|Implementing agencies were directed to intensify monitoring and compliance.|The action schedule contains twenty-five measures under this stage.|These observations describe the release date, not current conditions.')

add('2326519','2026-10-22','Cooperative federalism and consultation in law reform','polity','GS II',
    'Federal structure, legislative reform and Centre-State relations',
    'Connect intergovernmental consultation with constitutional responsibility and state autonomy. Distinguish recommendations made at a conference from enacted laws or binding institutional changes.',
    'A Law Commission conference in New Delhi examined cooperative federalism and national and state law reforms.',
    'The Vice-President inaugurated a conference organised by the Law Commission.|Its subject combines cooperative federalism with legal reform.|The address calls for consultation between Union and state institutions.|Coordination and shared responsibility were presented as governance priorities.|State autonomy was discussed within the broader constitutional framework.|Political differences were distinguished from common public-interest objectives.|State law commissions were urged to review outdated legislation.|Repeal and amendment were identified as possible reform tools.|Cooperation was not described as requiring identical laws everywhere.|The conference provides context without itself creating binding legislation.')

add('2326568','2026-10-22','India–Poland joint statement: strategic partnership and implementation','ir','GS II',
    'Bilateral relations and India’s engagement with Europe',
    'Locate Poland and distinguish bilateral partnership mechanisms from wider India-EU arrangements. Compare diplomatic commitments with the institutional and commercial steps required for implementation.',
    'India and Poland issued a joint statement during the Polish Prime Minister’s official visit.',
    'The visit was scheduled across 21–23 October 2026.|The leaders reviewed political, economic and international issues.|Their statement recalls the strategic partnership established in 2024.|It refers to the bilateral action plan for 2024–2028.|An earlier ministerial review was cited as follow-up.|The leaders encouraged closer institutional and parliamentary engagement.|Commercial representatives accompanied the visiting Polish delegation to India.|The statement discusses trade, investment and supply-chain cooperation.|European Union engagement forms part of the diplomatic context.|Proposed cooperation must be distinguished from already delivered outcomes.')

add('2323264','2026-10-14','Social assistance: Cabinet approval and disability-pension eligibility','governance','GS II',
    'Welfare schemes for vulnerable sections and implementation safeguards',
    'Examine eligibility, Union-State delivery and fiscal support. Cabinet approval and promised guidelines do not establish that revised benefits have already reached all intended recipients.',
    'The Cabinet approved continuation and changes to the social assistance programme for 2026–27 through 2030–31.',
    'The approval continues a centrally supported social assistance programme.|It covers a five-year period ending in 2030–31.|The Cabinet also approved renaming the programme and sub-schemes.|Changes specifically affect disability-pension eligibility and assistance rates.|The disability threshold is proposed to move to forty percent.|The minimum age restriction is also proposed for removal.|Existing old-age and widow arrangements continue under the approval.|The release identifies a total outlay of 53,428 crore rupees.|Updated implementation guidelines were expected within three months.|Approval should be distinguished from completed beneficiary-level implementation.')

add('2328661','2026-10-26','Legal metrology: measurement standards and consumer protection','governance','GS II',
    'Consumer protection, regulatory institutions and service delivery',
    'Link weights and measures with consumer rights, fair trade and regulatory compliance. Distinguish the international organisation from its committee and domestic enforcement responsibilities.',
    'India began hosting the International Committee of Legal Metrology meeting in New Delhi on 26 October.',
    'The meeting runs from 26–28 October in New Delhi.|India is hosting this committee meeting for the first time.|The committee operates within the international legal metrology organisation.|Accurate measurement supports fair transactions and consumer confidence.|Participants discussed harmonisation of technical measurement standards internationally.|Digitalisation is changing regulatory services and measurement systems.|Mutual acceptance of test results features in certification discussions.|Capacity building supports consistent application of measurement requirements.|Indian representatives discussed reforms affecting compliance and enforcement.|A technical meeting does not itself rewrite all domestic rules.')

add('2329163','2026-10-27','Manuscript preservation: India–France cooperation under Gyan Bharatam','history','GS I',
    'Indian literature, manuscript heritage and cultural preservation',
    'Revise conservation, documentation and digitisation as distinct activities. Connect institutional collaboration to access, cataloguing and preservation without assuming that every manuscript is already digitally available.',
    'The Culture Ministry reported an India–France manuscript-cooperation agreement signed in Paris on 26 October.',
    'The agreement was signed with France’s national library.|It operates within the Indian Gyan Bharatam mission.|Cooperation includes conserving manuscript and other documentary heritage.|Digitisation is one of the partnership’s identified working areas.|Indic-origin collections held in France are specifically mentioned.|The framework also covers technology and research collaboration.|Cataloguing and script-recognition tools feature among knowledge exchanges.|Workshops and scholarly exchanges are envisaged under the agreement.|The proposed repository involves structured access for research.|Signing establishes cooperation, not completion of every digitisation project.')

add('2328989','2026-10-27','Genetic diversity and domestic biotechnology research capacity','science','GS III',
    'Biotechnology, scientific applications and indigenous research capability',
    'Understand genetic variation, research infrastructure and gene-synthesis capability. Treat forecasts about India’s potential as proposals; examine ethics, consent and research governance separately.',
    'A biotechnology session at ESTIC discussed genetic diversity and building India’s domestic research capabilities.',
    'The minister linked genetic diversity to research opportunities.|The discussion concerned system and synthetic biology research.|Variation in disease patterns was cited as a research application.|The address favoured stronger domestic gene-synthesis capabilities.|Reliance on overseas suppliers can affect research continuity.|Better support systems were presented as necessary for innovation.|Industry participation and research funding were also emphasised.|Collaboration across biology and engineering was encouraged in research.|Potential applications were discussed rather than universal clinical deployment.|Scientific ambitions need evaluation alongside practical and ethical safeguards.')

add('2328988','2026-10-27','CARA consultation: inclusive adoption and children with special needs','governance','GS II',
    'Child protection, vulnerable sections and institutional coordination',
    'Map CARA, state agencies and district child-protection institutions. Assess family-based care, inclusion and procedural safeguards; participation in a workshop is not evidence that all barriers were removed.',
    'CARA held an Eastern Zone workshop in Ranchi on adoption and family-based care for children with special needs.',
    'The workshop took place in Ranchi on 27 October.|CARA worked with Jharkhand institutions in organising the consultation.|Its focus was family-based care for children with disabilities.|The regional context includes Bihar and other eastern states.|Participants represented adoption, welfare, healthcare and district institutions.|Discussions considered medical assessment and procedural barriers affecting adoption.|Coordination across departments was identified as an important requirement.|The meeting also examined support for prospective adoptive parents.|Officials emphasised sustained engagement beyond one-time awareness activities.|Policy commitments should be assessed through subsequent child-centred outcomes.')

for item in additions:
    if item['topics'][0] in ['environment', 'economy', 'science']:
        item['syllabus'].append(dict(paper='Prelims', subject=item['topics'][0], topic='Institutions, concepts and source-dated factual distinctions', relevance='Revise the named institutions and underlying concepts. Keep publication dates, data reference periods and proposed actions distinct when evaluating statements.'))
    if item['url'].find('PRID=2329164') >= 0:
        item['syllabus'].append(dict(paper='Essay',subject='science',topic='Science, society and technological self-reliance',relevance='Develop balanced arguments about research ecosystems, public purpose and accountability. Use this event as a dated illustration rather than an exam prediction.'))

today = date.today().isoformat()
start_year = int(today[:4]) - (1 if int(today[5:7]) > 6 else 2)
start_month = (int(today[5:7]) - 19) % 12 + 1
start = f'{start_year:04}-{start_month:02}-{today[8:]}'
existing = {item['id']:item for month in archive['months'] for item in month['items']}
existing.update({item['id']:item for item in additions})
items = [item for item in existing.values() if start <= item['published'] <= today]
months = []
year, month = int(today[:4]), int(today[5:7])
while f'{year:04}-{month:02}' >= start[:7]:
    id = f'{year:04}-{month:02}'
    months.append(dict(id=id,partial=id in [start[:7],today[:7]],items=sorted([item for item in items if item['published'].startswith(id)],key=lambda item:item['published'],reverse=True)))
    month -= 1
    if month == 0:
        year -= 1
        month = 12
archive.update(generatedAt=datetime.now(timezone.utc).isoformat(),range=dict(start=start,end=today),months=months,
               latestPublished=max(item['published'] for item in items),reviewedThrough=today)
PATH.write_text(json.dumps(archive,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Added/refreshed {len(additions)} official-source briefs; {len(items)} total issues; checked through {today}.')
