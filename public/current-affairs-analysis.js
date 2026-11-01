// Original study analysis. The reference magazine informed the structure, not the reporting dates.
const CurrentAffairsAnalysis = (() => {
  const profiles = {
  "wetlands": {
    "background": "Wetlands connect land and water. Their value includes flood storage, groundwater support, habitats and local livelihoods; protection must address the whole catchment, not only a mapped site.",
    "importance": [
      "Water security: Wetlands slow and store water, supporting nearby communities and reducing some flood impacts.",
      "Livelihoods: Fishing, farming and tourism depend on a healthy wetland and fair access to its resources."
    ],
    "challenges": [
      "Fragmented control: Different agencies may manage land, water, waste and wildlife without a shared plan.",
      "Ecological pressure: Encroachment, sewage and altered water flows can damage a site despite formal recognition."
    ],
    "wayForward": [
      "Catchment planning: Coordinate water flows, land use and pollution control around each wetland.",
      "Local stewardship: Involve communities and track ecological condition rather than counting designations alone."
    ],
    "facts": [
      [
        "Ramsar",
        "An international convention on wetlands and their wise use."
      ],
      [
        "Designation versus condition",
        "Listing a site does not by itself establish effective ecological protection."
      ]
    ],
    "mains": "explain how community participation and catchment planning can improve wetland protection"
  },
  "biodiversity": {
    "background": "Biodiversity includes diversity within species, between species and across ecosystems. Protection involves habitats, sustainable use and fair sharing of benefits from genetic resources.",
    "importance": [
      "Resilient livelihoods: Diverse ecosystems support food, medicines, soil health and water services.",
      "Fair benefits: Research and commercial use of genetic resources raise questions about community rights and access."
    ],
    "challenges": [
      "Funding gap: Announced targets need sustained finance, technical capacity and measurable local action.",
      "Competing uses: Infrastructure, farming and extraction can conflict with habitat protection and local access."
    ],
    "wayForward": [
      "Measurable plans: Link targets with budgets, local responsibilities and indicators of ecological change.",
      "Inclusive decisions: Include affected communities and assess trade-offs before approving changes in land use."
    ],
    "facts": [
      [
        "CBD objectives",
        "Conservation, sustainable use and fair benefit sharing."
      ],
      [
        "Different agreements",
        "The biodiversity convention is distinct from climate and wetland conventions."
      ]
    ],
    "mains": "assess how conservation targets can be translated into fair and measurable local outcomes"
  },
  "carbon-capture": {
    "background": "Carbon capture separates carbon dioxide from a gas stream. It can be followed by use in products or storage in suitable geological formations; these routes have different climate effects.",
    "importance": [
      "Industrial transition: Capture may help address process emissions that cleaner electricity alone cannot remove.",
      "Research opportunity: Domestic capability can improve understanding of costs, storage sites and industrial applications."
    ],
    "challenges": [
      "Energy and cost: Capture, compression and transport require investment and can add significant energy demand.",
      "Permanence: Using captured carbon in a short-lived product is not equivalent to durable underground storage."
    ],
    "wayForward": [
      "Targeted use: Prioritise applications with a clear emissions case and compare them with alternatives.",
      "Credible accounting: Measure full-chain emissions, storage integrity and long-term monitoring responsibilities."
    ],
    "facts": [
      [
        "Capture versus storage",
        "Separation is one step; permanent retention requires a suitable storage system."
      ],
      [
        "Net effect",
        "Assess avoided emissions after accounting for added energy and transport."
      ]
    ],
    "mains": "evaluate the role and limitations of carbon capture in industrial decarbonisation"
  },
  "manuscripts": {
    "background": "Manuscripts are historical records whose material, script, provenance and content all matter. Digital access complements physical conservation but cannot replace the original object. Records should also identify where each manuscript came from and preserve durable backup copies.",
    "importance": [
      "Knowledge access: Searchable collections can support research across languages, institutions and countries.",
      "Cultural continuity: Conserving originals protects evidence about writing traditions, materials and intellectual history."
    ],
    "challenges": [
      "Fragile material: Handling, moisture and unsuitable storage can damage records before or during digitisation.",
      "Access barriers: Poor cataloguing, uncertain provenance and difficult scripts can limit the usefulness of digital copies."
    ],
    "wayForward": [
      "Conservation first: Assess condition, use suitable storage and establish careful handling procedures.",
      "Useful digital records: Create reliable metadata, preserve master files and support researchers who can interpret scripts."
    ],
    "facts": [
      [
        "Digitisation",
        "Creating digital representations of records."
      ],
      [
        "Conservation",
        "Protecting the physical object and its historical evidence."
      ]
    ],
    "mains": "discuss how technology can improve access to heritage without weakening conservation of originals"
  },
  "genetics": {
    "background": "Genes carry biological information. Genetic variation can help researchers study disease and other traits, but research findings need validation before they become practical applications.",
    "importance": [
      "Research capacity: Local tools and trained teams can reduce disruptions caused by dependence on a few suppliers.",
      "Scientific collaboration: Biology, engineering and data analysis can contribute different capabilities to research."
    ],
    "challenges": [
      "Evidence gap: Laboratory success does not establish safety, effectiveness or suitability for wider use.",
      "Ethical safeguards: Research involving people raises questions about consent, privacy and fair sharing of benefits."
    ],
    "wayForward": [
      "Responsible research: Use suitable review, consent and data-protection processes from the start.",
      "Sustained capability: Invest in training, quality control and reproducible research rather than announcements alone."
    ],
    "facts": [
      [
        "Genetic diversity",
        "Variation in genes within a species or population."
      ],
      [
        "Stages of evidence",
        "Research, trials, approval and routine use are different stages."
      ]
    ],
    "mains": "examine how domestic biotechnology capability can grow alongside ethical and safety safeguards"
  },
  "adoption": {
    "background": "Adoption concerns a child entering a legally recognised family relationship. For children with disabilities, the process also involves appropriate care, informed preparation and continuing support.",
    "importance": [
      "Child wellbeing: Stable family care can address emotional and practical needs that paperwork alone cannot meet.",
      "Inclusive services: Medical, welfare and adoption agencies need to coordinate so disability does not become an avoidable barrier."
    ],
    "challenges": [
      "Procedural barriers: Delays, incomplete information and difficult assessments can discourage suitable families.",
      "Continuing needs: One-time awareness events do not guarantee access to care, counselling or follow-up support."
    ],
    "wayForward": [
      "Clear support: Give prospective parents reliable information, counselling and realistic guidance about care needs.",
      "Child-centred follow-up: Measure family stability, access to services and child wellbeing after placement."
    ],
    "facts": [
      [
        "CARA",
        "The Central Adoption Resource Authority deals with child adoption."
      ],
      [
        "Policy versus outcome",
        "A workshop is an input; sustained child wellbeing is an outcome."
      ]
    ],
    "mains": "suggest a coordinated approach to supporting adoption and care of children with disabilities"
  },
  "measurement": {
    "background": "Legal metrology concerns rules governing weights and measures used in transactions. Accurate measurement is a basic form of consumer protection and supports trust between trading partners.",
    "importance": [
      "Fair transactions: Accurate quantities reduce the risk of consumers paying for goods they do not receive.",
      "Comparable standards: Consistent measurement and testing can reduce uncertainty for businesses operating across markets."
    ],
    "challenges": [
      "Enforcement capacity: Rules need suitable equipment, trained inspectors and accessible complaint handling.",
      "Changing commerce: Online sales and digital instruments create new ways for quantity information to be unclear or inaccurate."
    ],
    "wayForward": [
      "Risk-based checks: Focus verification and enforcement on instruments and transactions where consumers face greater harm.",
      "Consumer information: Make quantity declarations and complaint channels clear, and explain what has actually changed in the rules."
    ],
    "facts": [
      [
        "Metrology",
        "The science of measurement."
      ],
      [
        "Legal metrology",
        "Applying measurement rules to protect fairness and public interests."
      ]
    ],
    "mains": "explain how accurate measurement and effective enforcement support consumer protection"
  },
  "federalism": {
    "background": "Federal arrangements distribute responsibilities between the Union and states. Cooperation can improve shared policies while preserving constitutional powers and space for different local approaches.",
    "importance": [
      "Better policy design: State experience can reveal implementation problems that a single national approach may miss.",
      "Shared responsibility: Consultation can align resources and reduce conflict over who should act or pay."
    ],
    "challenges": [
      "Unequal capacity: States differ in revenue, staff and technical resources, affecting their ability to implement common goals.",
      "Political friction: Disagreement can block cooperation unless consultation has clear procedures and timely follow-up."
    ],
    "wayForward": [
      "Regular consultation: Use structured forums with published agendas, evidence and recorded decisions.",
      "Respect local needs: Clarify responsibilities and allow justified variation while tracking common public-interest outcomes."
    ],
    "facts": [
      [
        "Cooperation",
        "Coordination between levels of government."
      ],
      [
        "Uniformity",
        "Identical rules everywhere; this is not a necessary condition for cooperation."
      ]
    ],
    "mains": "assess how consultation can improve Centre-state cooperation without eroding state autonomy"
  },
  "air": {
    "background": "Air pollution crosses administrative boundaries. Its health effects depend on pollutants, exposure and vulnerability, so emergency actions need to be complemented by year-round source control.",
    "importance": [
      "Public health: Lower exposure can reduce health harm, particularly for children, older people and outdoor workers.",
      "Regional action: Transport, industry, dust and waste sources require coordination across city and state boundaries."
    ],
    "challenges": [
      "Seasonal response: Short emergency measures may leave the underlying sources of pollution unchanged.",
      "Unequal exposure: Monitoring averages can hide heavy exposure in workplaces, traffic corridors and low-income neighbourhoods."
    ],
    "wayForward": [
      "Source reduction: Combine cleaner transport, industrial controls, dust management and reliable waste services.",
      "Transparent monitoring: Publish comparable data and assess implementation and exposure rather than announcements alone."
    ],
    "facts": [
      [
        "PM2.5",
        "Fine particles no more than 2.5 micrometres in diameter."
      ],
      [
        "Reading a report",
        "An air-quality reading describes a place and date, not permanent conditions."
      ]
    ],
    "mains": "examine why regional coordination and sustained source control are needed for cleaner urban air"
  },
  "elnino": {
    "background": "El Nino is the warm phase of a Pacific ocean-atmosphere pattern. Its effects reach beyond the Pacific, but local rainfall outcomes also depend on other climatic factors.",
    "importance": [
      "Preparedness: Seasonal information can help plan water use, farm inputs and disaster readiness.",
      "Ecological monitoring: Forests and wetlands may face stress that is not fully captured by rainfall forecasts alone."
    ],
    "challenges": [
      "Forecast uncertainty: A climate signal changes probabilities; it does not guarantee the same outcome everywhere.",
      "Uneven resilience: Water availability, cropping choices and local ecosystems determine who faces the greatest losses."
    ],
    "wayForward": [
      "Local risk plans: Combine seasonal forecasts with water storage, crop advice and protection for exposed groups.",
      "Ground observations: Use field reports alongside satellite and weather data to update responses as conditions change."
    ],
    "facts": [
      [
        "Location",
        "Central and eastern tropical Pacific Ocean."
      ],
      [
        "Forecast versus certainty",
        "A higher probability of stress is not a guaranteed local drought."
      ]
    ],
    "mains": "discuss how climate forecasts and local monitoring can improve drought and farm preparedness"
  },
  "thermal": {
    "background": "Thermal-infrared sensors observe radiation related to surface temperature. Their data can reveal heat patterns, but practical decisions require interpretation and checks against conditions on the ground.",
    "importance": [
      "Urban planning: Temperature patterns can help identify hot surfaces and areas needing shade or other cooling measures.",
      "Resource management: Repeated observations can support farm, water and fire-related monitoring over large areas."
    ],
    "challenges": [
      "Data limits: Resolution, revisit frequency, clouds and calibration affect what can be inferred from an observation.",
      "Last-mile use: A useful image does not automatically produce a service that local agencies can act upon."
    ],
    "wayForward": [
      "Validate findings: Compare satellite estimates with ground measurements and explain uncertainty to users.",
      "Build usable services: Work with local agencies on decisions, training and measurable improvements rather than imagery alone."
    ],
    "facts": [
      [
        "Thermal sensing",
        "Observes heat-related radiation to estimate surface temperature."
      ],
      [
        "Interpretation",
        "Surface temperature is not identical to air temperature or every measure of heat stress."
      ]
    ],
    "mains": "evaluate the applications and limits of thermal Earth-observation services for public planning"
  },
  "space": {
    "background": "A space programme combines research, launch capability, satellites, ground systems and services. Public agencies and businesses can play different roles within this wider chain.",
    "importance": [
      "Development services: Satellite applications can support farming, communications, mapping and disaster response.",
      "Domestic capability: Research, manufacturing and reliable launches can build skills and reduce critical technological dependence."
    ],
    "challenges": [
      "Technology and cost: Space projects face demanding reliability requirements, long development periods and financial risk.",
      "Coordination: Commercial growth requires clear responsibilities for authorisation, safety, liability and use of shared infrastructure."
    ],
    "wayForward": [
      "Clarify roles: Align public research goals with predictable access and safety requirements for private activity.",
      "Measure practical value: Assess reliability, service uptake and domestic capability rather than treating every launch as a complete outcome."
    ],
    "facts": [
      [
        "Launch vehicle",
        "Carries a payload towards its intended orbit or trajectory."
      ],
      [
        "Earth observation",
        "Collects data about land, water, weather and related conditions."
      ]
    ],
    "mains": "assess how public research and private participation can strengthen India's space capabilities"
  },
  "power-grid": {
    "background": "Generating electricity is only part of reliable supply. Networks move power to users, while storage and flexible operation help match changing production with demand.",
    "importance": [
      "Useful capacity: Better networks can reduce situations where available renewable power cannot reach consumers.",
      "Reliability: Storage and flexible demand can help bridge variations in solar and wind generation."
    ],
    "challenges": [
      "Project delays: Land access, approvals and coordination can slow networks even when generation is ready.",
      "Financial design: Storage needs workable payment arrangements, safety rules and clarity about who bears costs and risks."
    ],
    "wayForward": [
      "Integrated planning: Coordinate generation, networks, storage and local demand before adding isolated capacity.",
      "Delivery checks: Track construction progress, reliability and actual electricity use alongside announced investment."
    ],
    "facts": [
      [
        "Power and energy",
        "Power is a rate; stored energy describes the amount available over time."
      ],
      [
        "Storage",
        "Shifts electricity availability across time; it does not create energy from nothing."
      ]
    ],
    "mains": "explain why transmission and storage are essential to integrating renewable electricity"
  },
  "factory-jobs": {
    "background": "Industrial output and employment are related but different. Technology, productivity, sector mix and firm size can change how many jobs accompany an increase in production.",
    "importance": [
      "Inclusive growth: Job opportunities determine how widely households share the gains from industrial expansion.",
      "Better evidence: Output, wages and employment together provide a fuller picture than a single production measure."
    ],
    "challenges": [
      "Uneven gains: Growth concentrated in capital-intensive activities may create fewer jobs than expected.",
      "Measurement gaps: Survey coverage, informal work and changing methods complicate comparisons across periods."
    ],
    "wayForward": [
      "Broader indicators: Track job quality, wages, participation and productivity alongside output.",
      "Employment linkages: Improve skills, supplier networks and conditions for viable labour-intensive activities."
    ],
    "facts": [
      [
        "Output index",
        "Tracks changes in covered production, not the whole economy."
      ],
      [
        "Employment",
        "May grow faster or slower than output depending on productivity and sector mix."
      ]
    ],
    "mains": "examine why higher industrial output need not produce proportionate employment growth"
  },
  "detention": {
    "background": "Preventive detention is aimed at anticipated harmful conduct, rather than punishment following a conviction. Its exceptional purpose makes legal grounds, procedure and review particularly important.",
    "importance": [
      "Personal liberty: Review can prevent executive powers from becoming a substitute for ordinary criminal procedures.",
      "Lawful security: Decisions based on relevant material protect both public safety and confidence in the legal system."
    ],
    "challenges": [
      "Weak grounds: Suspicion or irrelevant material may be mistaken for a legally sustainable basis for detention.",
      "Procedural barriers: Affected people may struggle to understand grounds, obtain assistance or challenge restrictions in time."
    ],
    "wayForward": [
      "Reasoned decisions: Document relevant evidence, follow applicable safeguards and distinguish prevention from punishment.",
      "Effective review: Ensure timely scrutiny and practical access to lawful remedies without assuming allegations establish guilt."
    ],
    "facts": [
      [
        "Preventive versus punitive",
        "Anticipated conduct versus punishment after the legal determination of an offence."
      ],
      [
        "Safeguards",
        "Constitutional and statutory procedures still apply to exceptional detention powers."
      ]
    ],
    "mains": "discuss how preventive detention can be subject to meaningful safeguards for personal liberty"
  },
  "monetary": {
    "background": "Monetary policy influences interest rates, credit and financial conditions. Its effects pass through banks, markets and expectations, and do not reach every household or firm equally quickly.",
    "importance": [
      "Price stability: Credible decisions can help contain persistent price pressures and support confidence.",
      "Economic activity: Borrowing costs affect investment, housing, consumption and the conditions facing smaller businesses."
    ],
    "challenges": [
      "Supply shocks: Interest-rate changes cannot directly repair crop losses or international supply disruptions.",
      "Transmission lags: Bank balance sheets, existing loan terms and uncertainty can delay or weaken the effect of a rate decision."
    ],
    "wayForward": [
      "Evidence-based decisions: Assess prices, growth, credit and expectations together rather than relying on one release.",
      "Clear communication: Explain trade-offs and distinguish monetary measures from fiscal or supply-side responses."
    ],
    "facts": [
      [
        "India's MPC",
        "Determines the policy repo rate under the RBI Act."
      ],
      [
        "Fiscal versus monetary",
        "Government budgets and central-bank policy involve different tools and institutions."
      ]
    ],
    "mains": "analyse the trade-off between controlling inflation and supporting growth during uncertain conditions"
  },
  "climate-court": {
    "background": "International judicial opinions can clarify legal questions about climate responsibilities. Their effect must be assessed separately from domestic implementation, diplomacy and the status of each legal instrument.",
    "importance": [
      "Legal clarity: International reasoning can inform national debates about prevention, responsibility and remedies.",
      "Fairness: Climate duties raise questions about differing capabilities, historical contributions and harm to exposed populations."
    ],
    "challenges": [
      "Implementation gap: A legal statement does not itself provide finance, reduce emissions or repair damage.",
      "Different legal effects: Advisory opinions, judgments and political resolutions should not be treated as interchangeable."
    ],
    "wayForward": [
      "Read the instrument: Identify the institution, legal question, scope and limits before drawing conclusions.",
      "Connect law to action: Assess domestic policy, monitoring and support for affected groups alongside international commitments."
    ],
    "facts": [
      [
        "ICJ",
        "The principal judicial organ of the United Nations."
      ],
      [
        "Different courts",
        "The ICJ is distinct from the International Criminal Court."
      ]
    ],
    "mains": "evaluate how international legal clarification can contribute to fair and effective climate action"
  },
  "climate-finance": {
    "background": "Climate finance supports emissions reduction and preparation for climate impacts. Its value depends on terms, access, additional resources and whether funded work reaches intended outcomes.",
    "importance": [
      "Investment support: Countries with limited resources may need finance and technology to pursue cleaner development.",
      "Adaptation: Exposed communities require funding for water, health, resilient infrastructure and recovery capacity."
    ],
    "challenges": [
      "Pledges versus delivery: Announced sums can differ from disbursement, access and usable support.",
      "Debt and access: Loans, complex applications and limited local capacity can reduce benefits for vulnerable countries and communities."
    ],
    "wayForward": [
      "Transparent accounting: Distinguish grants, loans, commitments and delivered funds, and explain what is being counted.",
      "Local access: Link finance with implementable plans, technical support and monitoring of benefits for exposed people."
    ],
    "facts": [
      [
        "Mitigation",
        "Reducing emissions or strengthening sinks."
      ],
      [
        "Adaptation",
        "Reducing vulnerability and harm from climate impacts."
      ]
    ],
    "mains": "assess what makes climate finance fair, accessible and effective rather than merely a large pledge"
  },
  "heat": {
    "background": "Heat risk depends on temperature, humidity, exposure and the body's ability to cool. Age, work, housing and access to water or health care influence who suffers harm.",
    "importance": [
      "Public health: Better indicators and warnings can help direct protection towards groups facing greater exposure.",
      "Work and cities: Heat affects outdoor labour, school conditions, electricity demand and the design of public spaces."
    ],
    "challenges": [
      "Incomplete indicators: Temperature alone may miss dangerous humidity or differences in exposure.",
      "Unequal protection: Informal workers and poorly housed households may have little ability to avoid dangerous conditions."
    ],
    "wayForward": [
      "Targeted heat plans: Use local warnings, accessible water, shade and appropriate work-rest arrangements.",
      "Measure outcomes: Review illness and exposure data, and adapt urban planning and public services to changing risks."
    ],
    "facts": [
      [
        "Humidity",
        "Can slow sweat evaporation and reduce cooling."
      ],
      [
        "Hazard versus risk",
        "Exposure, vulnerability and preparedness change the harm caused by heat."
      ]
    ],
    "mains": "explain why heat-action planning must address humidity, exposure and social vulnerability together"
  },
  "floods": {
    "background": "Flood losses reflect rainfall and river conditions as well as exposure, land use, drainage and preparedness. River-basin coordination often matters more than action within one administrative boundary.",
    "importance": [
      "Early action: Reliable warnings can create time for evacuation and protection of essential services.",
      "Long-term resilience: Safer land use and drainage can reduce repeated losses rather than only funding recovery."
    ],
    "challenges": [
      "Fragmented management: Reservoirs, settlements and drainage may be planned by different bodies without common risk information.",
      "Unequal recovery: Poor households can lose assets and income while having limited access to insurance or relief."
    ],
    "wayForward": [
      "Basin-level coordination: Share river and weather data, align operating decisions and test last-mile warning systems.",
      "Safer rebuilding: Use damage assessments to improve siting, drainage, access routes and resilient public services."
    ],
    "facts": [
      [
        "Disaster risk",
        "Depends on hazard, exposure and vulnerability."
      ],
      [
        "Warning versus response",
        "A forecast is useful only when it reaches people and enables practical action."
      ]
    ],
    "mains": "discuss how river-basin coordination and local preparedness can reduce recurring flood losses"
  },
  "mining": {
    "background": "Minerals support industry and public revenue, but extraction also affects land, water and communities. Resource policy involves both economic efficiency and the distribution of costs and benefits.",
    "importance": [
      "Industrial supply: Predictable access to resources can support investment and downstream production.",
      "Regional development: Revenue can improve local services if sharing and spending arrangements are transparent and effective."
    ],
    "challenges": [
      "Unequal burdens: Communities near mines may bear environmental and livelihood costs without proportionate benefits.",
      "Federal disputes: Conflicting expectations about authority, charges and revenue can delay decisions and investment."
    ],
    "wayForward": [
      "Clear responsibilities: Explain applicable powers and revenue arrangements while consulting affected governments and communities.",
      "Responsible extraction: Combine monitoring, rehabilitation and transparent local spending with predictable regulatory decisions."
    ],
    "facts": [
      [
        "Extraction versus benefit",
        "More mineral output does not by itself establish better local wellbeing."
      ],
      [
        "Resource planning",
        "Consider the full chain of land use, extraction, processing and restoration."
      ]
    ],
    "mains": "evaluate how mineral governance can balance industry, state interests and community welfare"
  },
  "parliament": {
    "background": "Parliament makes laws, examines executive action and authorises public spending. The quality of debate and committee work matters alongside the number of bills passed or hours recorded.",
    "importance": [
      "Better laws: Examination of provisions can reveal unclear powers, practical gaps and unintended consequences.",
      "Public accountability: Questions, debate and scrutiny provide ways to test executive decisions and represent public concerns."
    ],
    "challenges": [
      "Limited deliberation: Disruption or rushed consideration can reduce examination of complex proposals.",
      "Information gaps: Members need timely evidence and opportunities to assess costs, responsibilities and effects on different groups."
    ],
    "wayForward": [
      "Meaningful scrutiny: Allow reasoned debate and appropriate committee examination of significant proposals.",
      "Follow-up: Review implementation and spending outcomes, not only the completion of parliamentary procedures."
    ],
    "facts": [
      [
        "Law-making",
        "Passing legislation is one parliamentary function."
      ],
      [
        "Scrutiny",
        "Examining decisions and outcomes is distinct from merely announcing or approving a policy."
      ]
    ],
    "mains": "assess why effective parliamentary scrutiny is essential to the quality of governance"
  },
  "women-representation": {
    "background": "Political representation concerns both access to elected office and the ability to influence decisions. Legal design, implementation conditions and participation within parties all affect outcomes.",
    "importance": [
      "Inclusive decisions: Wider representation can bring neglected needs and experience into public debate.",
      "Democratic legitimacy: Participation matters when elected institutions are expected to represent the diversity of society."
    ],
    "challenges": [
      "Design and timing: Eligibility, allocation and commencement conditions need to be distinguished from a general political commitment.",
      "Participation barriers: Money, safety, party structures and unpaid care responsibilities can limit effective entry and influence."
    ],
    "wayForward": [
      "Clear implementation: Explain the legal process, operational steps and responsibilities without assuming an announcement completes reform.",
      "Support participation: Improve opportunities, safety and institutional capacity alongside changes to formal representation."
    ],
    "facts": [
      [
        "Constitutional change",
        "The general amendment procedure is provided in Article 368."
      ],
      [
        "Representation versus influence",
        "Holding a seat and exercising effective decision-making power are related but different."
      ]
    ],
    "mains": "examine why formal political representation should be accompanied by conditions for meaningful participation"
  },
  "women-rights": {
    "background": "Dignity, personal liberty and access to services are connected but distinct. A rights-based analysis examines the decision, the affected person and the practical barriers to exercising a right.",
    "importance": [
      "Autonomy: Respect for an affected person's choices is central to decisions about their life and wellbeing.",
      "Practical access: Legal recognition has greater value when services, information and remedies are actually available."
    ],
    "challenges": [
      "Unequal access: Cost, stigma, distance and lack of information can prevent people from using protections.",
      "Overgeneralisation: The scope of a judgment depends on its facts and reasoning, not only on a headline."
    ],
    "wayForward": [
      "Read the decision: Identify the right, the specific holding and the authorities responsible for giving effect to it.",
      "Remove barriers: Improve accessible services, information and complaint handling while protecting dignity and privacy."
    ],
    "facts": [
      [
        "Article 21",
        "Protects life and personal liberty."
      ],
      [
        "Judgment versus service",
        "A legal ruling is not proof that every person can access the required support."
      ]
    ],
    "mains": "discuss how legal protection can be translated into practical dignity and access to services"
  },
  "cash-welfare": {
    "background": "Cash support can help households meet needs and make choices. Its design must consider who qualifies, how payments reach them and what public services remain necessary alongside transfers.",
    "importance": [
      "Household support: Reliable payments can help meet immediate needs and reduce some income uncertainty.",
      "Agency and inclusion: Direct support can matter for people who have limited control over other household resources."
    ],
    "challenges": [
      "Exclusion and payment failures: Documentation, account access and delivery problems may leave eligible people unsupported.",
      "Budget trade-offs: Expanding transfers requires sustainable funding and should not automatically replace essential public services."
    ],
    "wayForward": [
      "Reliable delivery: Simplify access, track receipt and provide a workable process for correcting exclusions.",
      "Outcome evaluation: Examine adequacy, timeliness and household effects alongside costs and service quality."
    ],
    "facts": [
      [
        "Announcement versus receipt",
        "Approval or budget allocation is not the same as a completed payment."
      ],
      [
        "Coverage versus adequacy",
        "The number receiving support does not show whether the amount meets intended needs."
      ]
    ],
    "mains": "evaluate cash transfers as a welfare tool alongside the need for sustainable finance and public services"
  },
  "elections": {
    "background": "Accurate electoral rolls must both include eligible voters and correct errors. Administrative efficiency needs to be assessed together with fair procedures and accessible opportunities to seek correction.",
    "importance": [
      "Equal participation: Errors can prevent eligible people from exercising their vote.",
      "Institutional trust: Transparent procedures and reasoned decisions can strengthen confidence in election administration."
    ],
    "challenges": [
      "Documentation barriers: Mobility, poverty and incomplete records may make checks harder for some eligible voters.",
      "Process quality: Fast processing can conceal mistakes when notice, hearings or correction channels are difficult to access."
    ],
    "wayForward": [
      "Accessible correction: Make notice, claims, objections and remedies understandable and usable for affected voters.",
      "Transparent review: Publish clear procedures and assess both inclusion errors and exclusion of eligible people."
    ],
    "facts": [
      [
        "Article 324",
        "Concerns the Election Commission's constitutional role in specified elections."
      ],
      [
        "Different institutions",
        "Local-body elections are administered through the separate State Election Commission framework."
      ]
    ],
    "mains": "examine how electoral-roll accuracy can be improved without excluding eligible voters"
  },
  "education": {
    "background": "Educational access involves more than admission or enrolment. Teaching quality, affordability, safety and support determine whether students can participate, complete courses and use what they learn.",
    "importance": [
      "Social mobility: Accessible, effective education can widen opportunities across income and social groups.",
      "Skills and participation: Supporting under-represented students can improve both individual opportunity and the wider pool of trained people."
    ],
    "challenges": [
      "Hidden costs: Coaching, travel, devices and living expenses can create unequal access despite formal admission rules.",
      "Institutional support: Entry gains may not be sustained without a safe environment and suitable academic support."
    ],
    "wayForward": [
      "Strengthen core services: Improve teaching and student support rather than treating extra tuition as a universal substitute.",
      "Track progression: Compare participation, completion and outcomes across income, gender and other relevant groups."
    ],
    "facts": [
      [
        "Access versus completion",
        "Admission alone does not measure continued participation or learning."
      ],
      [
        "Disaggregated evidence",
        "Group-wise data can reveal inequalities hidden in overall averages."
      ]
    ],
    "mains": "assess how education policy can move from wider entry to equitable learning and completion"
  },
  "ai": {
    "background": "AI systems identify patterns or generate outputs using computational methods. Performance depends on data, design and context, so a confident output should not be treated as proof of accuracy.",
    "importance": [
      "Useful applications: Suitable systems may support research and services when their performance is independently assessed.",
      "Public trust: Accountability and human review matter when errors can affect rights, livelihoods or safety."
    ],
    "challenges": [
      "Unreliable output: Errors, bias and unsuitable data can produce harmful results even when a system performs well on selected tests.",
      "Unclear responsibility: Users may struggle to challenge an automated decision or identify who must correct it."
    ],
    "wayForward": [
      "Risk-based testing: Evaluate systems in the intended setting, monitor failures and retain practical human oversight.",
      "Clear responsibility: Define who approves use, handles complaints and protects data, with stronger safeguards for consequential decisions."
    ],
    "facts": [
      [
        "Accuracy",
        "An AI-generated answer can be wrong even when it sounds confident."
      ],
      [
        "Pilot versus deployment",
        "Performance in a small test does not establish safe or reliable large-scale use."
      ]
    ],
    "mains": "evaluate how useful AI applications can be encouraged while maintaining accountability and human oversight"
  },
  "farming": {
    "background": "Farm production depends on inputs, water, weather, skills and market access. A disruption in one part of this chain can affect costs, crop choices and household food prices.",
    "importance": [
      "Food security: Reliable inputs and suitable farming decisions influence production and the availability of essential food.",
      "Farmer incomes: Rising costs can reduce margins even when crop prices increase."
    ],
    "challenges": [
      "External dependence: Imported inputs and energy can transmit international disruptions into domestic farm costs.",
      "Uneven capacity: Small farmers may have limited storage, credit or flexibility to change crops and practices."
    ],
    "wayForward": [
      "Diversify and plan: Improve supply reliability, timely information and appropriate use of inputs and water.",
      "Targeted support: Assess local needs, delivery timing and farmer outcomes rather than treating one measure as sufficient everywhere."
    ],
    "facts": [
      [
        "Input cost versus crop price",
        "A higher sale price need not mean a higher net farm income."
      ],
      [
        "Weather information",
        "Forecasts support decisions but do not guarantee an individual farm's result."
      ]
    ],
    "mains": "discuss how India can manage farm-input risks while protecting farmer incomes and food security"
  },
  "rupee": {
    "background": "An exchange rate states the value of one currency in another. Changes affect import costs, export receipts and foreign-currency obligations, with different effects across households and firms.",
    "importance": [
      "Import costs: A weaker rupee can raise the domestic cost of dollar-priced fuel, equipment and other imports.",
      "Business exposure: Exporters, borrowers and firms using imported inputs can face different gains and losses."
    ],
    "challenges": [
      "Multiple causes: Trade flows, investment, global interest rates and expectations can move the currency together.",
      "Unequal effects: Exporters may not fully benefit if imported inputs are expensive or overseas demand is weak."
    ],
    "wayForward": [
      "Manage volatility: Assess financial stability and market functioning without assuming one exchange-rate level suits every objective.",
      "Reduce exposure: Encourage informed risk management and improve longer-term productivity and external resilience."
    ],
    "facts": [
      [
        "Depreciation",
        "More domestic currency is needed to buy a unit of foreign currency."
      ],
      [
        "Other things equal",
        "The import-cost effect also depends on foreign prices, quantities and contract terms."
      ]
    ],
    "mains": "analyse the different effects of currency depreciation on importers, exporters and the wider economy"
  },
  "prices": {
    "background": "Inflation measures a rate of price change for a defined basket over a period. Interpreting a release requires its coverage, reference period, comparison basis and revision status.",
    "importance": [
      "Household budgets: Rising prices can reduce purchasing power, especially when essentials absorb a large share of income.",
      "Policy evidence: Reliable price indices inform economic decisions and comparisons across time."
    ],
    "challenges": [
      "Different baskets: National averages may not reflect the spending patterns or price pressures of every household.",
      "Misreading rates: A slower positive inflation rate does not mean prices are falling."
    ],
    "wayForward": [
      "Read the release carefully: Keep reference month, publication date and provisional or final status together.",
      "Match the response: Separate food or supply disruptions from persistent broader pressures when judging policy options."
    ],
    "facts": [
      [
        "Inflation versus prices",
        "A lower positive rate means prices are rising more slowly."
      ],
      [
        "Base year",
        "Provides a reference for an index; changes require care when comparing series."
      ]
    ],
    "mains": "explain why headline inflation alone is insufficient for understanding household price pressures"
  },
  "gdp": {
    "background": "GDP measures final production within an economy over a period. Revisions to sources or methods can improve measurement, but users need to understand how old and new series compare.",
    "importance": [
      "Better decisions: Reliable activity measures support assessment of growth, investment and public finances.",
      "Structural change: Updated sources can better capture sectors or activities that older methods missed."
    ],
    "challenges": [
      "Comparability: A change in method can alter measured growth without implying an equivalent sudden change in actual activity.",
      "Coverage limits: GDP is not a complete measure of distribution, job quality or environmental wellbeing."
    ],
    "wayForward": [
      "Explain revisions: Publish methods, revision schedules and comparable historical estimates where available.",
      "Use a dashboard: Read GDP alongside jobs, prices, household outcomes and relevant environmental measures."
    ],
    "facts": [
      [
        "GDP",
        "Final production within an economy during a given period."
      ],
      [
        "Level versus growth",
        "The total value and its rate of change answer different questions."
      ]
    ],
    "mains": "assess why improved GDP measurement should be combined with evidence on jobs and living conditions"
  },
  "trans-rights": {
    "background": "A rights-based approach examines legal recognition, non-discrimination and practical access to services. Transgender people may face barriers across identity documents, education, employment and health services.",
    "importance": [
      "Equal treatment: Protection against discrimination connects constitutional commitments with daily life.",
      "Effective services: Access to suitable information, documentation and remedies determines whether recognition is meaningful."
    ],
    "challenges": [
      "Implementation gaps: Formal protections can coexist with denial of services or unclear responsibilities.",
      "Stigma and exclusion: Affected people may face practical risks when seeking help or challenging discrimination."
    ],
    "wayForward": [
      "Inclusive design: Consult affected communities and examine how proposed rules change access and decision-making.",
      "Accountable delivery: Train service providers, provide usable remedies and track barriers rather than relying on legal recognition alone."
    ],
    "facts": [
      [
        "Article 14",
        "Equality before the law and equal protection of laws."
      ],
      [
        "Proposal versus law",
        "A proposed change must be distinguished from the final text and its operation."
      ]
    ],
    "mains": "discuss how legal recognition can be supported by practical measures against discrimination"
  },
  "bail": {
    "background": "Bail concerns release from custody during legal proceedings; it does not itself determine innocence or guilt. Analysis must distinguish the custody decision, the applicable law and progress of the trial.",
    "importance": [
      "Personal liberty: Long periods awaiting trial can impose serious costs before a charge is finally decided.",
      "Justice system: Reasoned custody decisions need to address lawful concerns without making delay a substitute for adjudication."
    ],
    "challenges": [
      "Prolonged proceedings: Delays can create a widening gap between legal safeguards and practical freedom.",
      "Headline simplification: Different facts and statutory requirements can be lost when one order is treated as a universal rule."
    ],
    "wayForward": [
      "Read the reasoning: Identify the legal test, evidence considered and limits of the particular order.",
      "Improve timeliness: Address investigation and trial delays while ensuring access to representation and review."
    ],
    "facts": [
      [
        "Bail",
        "A decision about release from custody subject to applicable conditions."
      ],
      [
        "Acquittal",
        "A decision on the criminal charge; bail alone does not decide guilt."
      ]
    ],
    "mains": "examine how prolonged trials complicate the balance between personal liberty and the administration of justice"
  },
  "nuclear-arms": {
    "background": "Arms-control arrangements seek to limit or monitor agreed weapons and reduce uncertainty. Their scope, verification provisions and status must be separated from broader political relations.",
    "importance": [
      "Stability: Predictable limits and information can reduce misunderstandings between heavily armed states.",
      "Wider security: The weakening of controls can affect regional calculations and the international non-proliferation environment."
    ],
    "challenges": [
      "Trust deficit: States may doubt compliance or disagree about the capabilities that should be covered.",
      "Technology change: New delivery systems and security relationships can make older categories less adequate."
    ],
    "wayForward": [
      "Maintain dialogue: Preserve practical risk-reduction and information channels even during political disagreement.",
      "Credible arrangements: Match limits with workable verification and clearly defined coverage and obligations."
    ],
    "facts": [
      [
        "Arms control",
        "Agreed management or limitation of weapons and related risks."
      ],
      [
        "Different purposes",
        "Nuclear weapons arrangements are distinct from regulation of civilian nuclear electricity."
      ]
    ],
    "mains": "assess the role of verification and dialogue in sustaining nuclear risk reduction"
  },
  "nuclear-power": {
    "background": "Commercial nuclear reactors use controlled fission to produce heat and electricity. Expanding the sector involves the whole fuel and technology chain as well as safety, waste and long-term financing.",
    "importance": [
      "Electricity supply: Nuclear power can contribute firm, low-carbon generation within a wider energy mix.",
      "Technical capability: Research, manufacturing and trained personnel support reliable operation and domestic know-how."
    ],
    "challenges": [
      "Long commitments: Projects require sustained finance, specialised skills and credible management of delays.",
      "Safety and waste: Oversight and long-term responsibilities remain important throughout operation and after closure."
    ],
    "wayForward": [
      "Whole-chain planning: Coordinate fuel, technology, regulation, skills and waste management rather than focusing only on plant capacity.",
      "Public confidence: Explain risks, responsibilities and costs through transparent decisions and independent safety oversight."
    ],
    "facts": [
      [
        "Fission",
        "Splitting atomic nuclei to release energy."
      ],
      [
        "Fusion",
        "Combining nuclei; it is not the basis of today's commercial nuclear electricity fleet."
      ]
    ],
    "mains": "evaluate nuclear energy as part of India's energy strategy, including research, safety and financing needs"
  },
  "budget": {
    "background": "A budget sets out estimated public receipts and expenditure. It expresses priorities, but economic effects depend on delivery, revenue performance and how spending interacts with other policies.",
    "importance": [
      "Development priorities: Public spending choices affect infrastructure, welfare and the conditions for private investment.",
      "Fiscal accountability: Budget documents allow scrutiny of costs, financing and whether stated priorities are funded."
    ],
    "challenges": [
      "Execution gap: Allocations may differ from spending and from the quality of completed services or assets.",
      "Competing needs: Debt costs, welfare demands and investment needs require explicit choices within available resources."
    ],
    "wayForward": [
      "Track the full cycle: Compare budget estimates, revised estimates and actual spending with reasons for important changes.",
      "Measure results: Link expenditure with service quality and completed assets, while explaining financing risks and trade-offs."
    ],
    "facts": [
      [
        "Article 112",
        "Provides for the Annual Financial Statement."
      ],
      [
        "Allocation versus outcome",
        "Announcing money is distinct from spending it effectively and achieving the intended result."
      ]
    ],
    "mains": "assess how budget priorities can be translated into effective and accountable public expenditure"
  },
  "carbon-border": {
    "background": "A carbon border mechanism links covered imports with emissions embedded in their production. Exporters need to understand product coverage, reporting and applicable obligations rather than treating it as a simple uniform tariff.",
    "importance": [
      "Export access: Carbon intensity and documentation can affect the costs of serving an important market.",
      "Industrial transition: The measure increases attention to cleaner production and credible measurement of emissions."
    ],
    "challenges": [
      "Compliance burden: Firms differ in their ability to measure supply-chain emissions and provide verified information.",
      "Fairness concerns: Different development conditions and existing climate measures complicate assessment of equal treatment."
    ],
    "wayForward": [
      "Prepare credible data: Support measurement, verification and knowledge of the applicable product rules.",
      "Combine responses: Pursue appropriate trade engagement while improving energy efficiency and access to lower-carbon production options."
    ],
    "facts": [
      [
        "CBAM",
        "The European Union's Carbon Border Adjustment Mechanism."
      ],
      [
        "Embedded emissions",
        "Emissions associated with producing a covered product, rather than only its transport."
      ]
    ],
    "mains": "examine how Indian exporters can respond to carbon-linked trade measures without neglecting industrial transition"
  },
  "trade": {
    "background": "Trade policy shapes access to markets through taxes, rules and agreements. Its effects differ across consumers, producers and workers, and depend on the actual coverage and terms of each measure.",
    "importance": [
      "Market opportunities: Lower or more predictable barriers can help firms plan exports, imports and investment.",
      "Domestic adjustment: Changes can lower some costs while exposing other activities to stronger competition."
    ],
    "challenges": [
      "Unequal effects: A national gain can coexist with losses for particular firms, workers or sensitive sectors.",
      "Agreement versus use: Formal preferences may be difficult to use when origin rules, standards or logistics remain barriers."
    ],
    "wayForward": [
      "Examine the terms: Identify products, services, transition periods and conditions rather than inferring benefits from a headline.",
      "Support adjustment: Improve standards, information and productive capacity while addressing identifiable costs for affected groups."
    ],
    "facts": [
      [
        "Import tariff",
        "A tax on imported goods."
      ],
      [
        "Agreement versus outcome",
        "Signing a deal does not by itself establish higher exports or completed investment."
      ]
    ],
    "mains": "evaluate a trade-policy change by considering market access, domestic adjustment and implementation conditions"
  },
  "labour": {
    "background": "Labour regulation covers employment relations, working conditions and related protections. Reform must be assessed through legal provisions and practical enforcement across different kinds of workplaces.",
    "importance": [
      "Worker protection: Clear rules can support safer conditions, fair treatment and access to social protection.",
      "Business certainty: Consistent procedures may reduce avoidable uncertainty and help firms understand their obligations."
    ],
    "challenges": [
      "Implementation capacity: Inspectors, complaint systems and reliable records are needed for rules to work.",
      "Uneven coverage: Informal work and varied employment arrangements can leave gaps between formal protections and actual access."
    ],
    "wayForward": [
      "Clear transition: Explain responsibilities and operational rules, with suitable support for workers and smaller firms.",
      "Outcome monitoring: Track safety, grievances, formalisation and access to protections rather than counting rules simplified alone."
    ],
    "facts": [
      [
        "Law versus operation",
        "Enactment, commencement, rules and enforcement are separate stages."
      ],
      [
        "Employment quality",
        "Job numbers alone do not show safety, security or access to benefits."
      ]
    ],
    "mains": "discuss how labour reform can balance easier administration with effective worker protection"
  },
  "aravalli": {
    "background": "The Aravallis form a north-western Indian mountain system. Their landscape matters for habitats and surrounding settlements, making protection a question of land use and ecological connectivity.",
    "importance": [
      "Landscape functions: Connected natural areas can support wildlife and environmental services across administrative boundaries.",
      "Public interest: Decisions about mining and development affect nearby communities as well as the immediate project site."
    ],
    "challenges": [
      "Fragmentation: Isolated protection may fail when surrounding land use breaks habitat connections.",
      "Enforcement gaps: Formal restrictions require clear mapping, monitoring and responsibility for restoration."
    ],
    "wayForward": [
      "Landscape planning: Assess cumulative effects and coordinate decisions across affected jurisdictions.",
      "Effective protection: Publish boundaries and compliance information and evaluate restoration rather than treating an order as the final outcome."
    ],
    "facts": [
      [
        "Location",
        "North-western India, notably Rajasthan and adjoining areas."
      ],
      [
        "Landscape protection",
        "Cumulative and connected effects can matter beyond individual project boundaries."
      ]
    ],
    "mains": "explain why protection of the Aravallis requires a landscape-wide approach to land use and enforcement"
  },
  "elephants": {
    "background": "Wildlife estimates depend on sampling, identification and statistical methods. New techniques such as DNA-based identification can improve evidence while also changing comparability with earlier surveys.",
    "importance": [
      "Better monitoring: Improved identification can help understand populations and direct conservation resources.",
      "Habitat planning: Population evidence becomes more useful when read alongside habitat, connectivity and human-wildlife conflict."
    ],
    "challenges": [
      "Method changes: A difference between estimates need not represent the same-sized change in actual numbers.",
      "Field limits: Coverage, sample quality and detection affect how confidently a survey describes the wider population."
    ],
    "wayForward": [
      "Explain uncertainty: Publish methods, coverage and limits, and avoid simple trend claims across incompatible surveys.",
      "Use broader evidence: Link estimates with habitat management and local measures to reduce conflict."
    ],
    "facts": [
      [
        "DNA identification",
        "Can help distinguish individuals using genetic material."
      ],
      [
        "Estimate versus exact count",
        "Survey results have methodological limits that should accompany the headline number."
      ]
    ],
    "mains": "assess how improved wildlife estimation can support conservation while avoiding misleading population comparisons"
  },
  "vice-president": {
    "background": "The Vice-President is a constitutional office with a role in the functioning of the Rajya Sabha. Evaluation of the office should distinguish constitutional duties from party-political expectations.",
    "importance": [
      "Parliamentary fairness: Impartial handling of proceedings supports confidence in debate and institutional decisions.",
      "Constitutional continuity: Clear understanding of the office helps distinguish its different responsibilities."
    ],
    "challenges": [
      "Political pressure: An officeholder may face competing expectations from political affiliations and constitutional duties.",
      "Public perception: Procedural decisions can lose legitimacy when their basis is unclear or appears inconsistent."
    ],
    "wayForward": [
      "Reasoned procedure: Apply relevant rules consistently and explain significant decisions.",
      "Institutional focus: Protect meaningful deliberation and evaluate conduct against constitutional responsibilities rather than partisan advantage."
    ],
    "facts": [
      [
        "Article 64",
        "Makes the Vice-President ex officio Chairperson of the Rajya Sabha."
      ],
      [
        "Separate office",
        "This is distinct from the Speaker of the Lok Sabha."
      ]
    ],
    "mains": "discuss the importance of impartiality in the Vice-President's parliamentary role"
  },
  "property": {
    "background": "Property and inheritance rules can affect income, security and bargaining power. A careful analysis identifies the applicable law, the affected community and the constitutional questions raised.",
    "importance": [
      "Economic agency: Secure property access can support livelihoods and reduce dependence within households.",
      "Equal treatment: Inheritance questions test how institutions reconcile community practices with constitutional commitments."
    ],
    "challenges": [
      "Legal diversity: Different legal regimes and specific facts make sweeping claims about all property rights unreliable.",
      "Practical barriers: Social pressure, unclear records and costly proceedings may prevent use of formally recognised rights."
    ],
    "wayForward": [
      "Read the applicable rules: Distinguish a particular holding from a universal change to inheritance law.",
      "Improve access: Support clear records, legal awareness and usable remedies while consulting affected communities."
    ],
    "facts": [
      [
        "Equality",
        "Article 14 provides equality before the law and equal protection of laws."
      ],
      [
        "Recognition versus access",
        "A formal right may still require practical support to exercise."
      ]
    ],
    "mains": "examine how constitutional equality and practical access can inform debates about women's inheritance rights"
  },
  "census": {
    "background": "A census provides systematic information about a population. Its usefulness depends on definitions, coverage, confidentiality and the care with which figures are interpreted and applied.",
    "importance": [
      "Planning services: Population evidence helps assess needs for schools, health care, housing and other public services.",
      "Social understanding: Disaggregated information can reveal gaps hidden in national averages."
    ],
    "challenges": [
      "Coverage errors: Migration, difficult locations and unclear categories can affect who is counted and how.",
      "Data misuse: Sensitive group information can be misinterpreted or used without adequate protection or context."
    ],
    "wayForward": [
      "Reliable collection: Explain definitions, train staff and create practical ways to address omissions.",
      "Responsible use: Protect confidentiality and publish methods and limitations alongside policy-relevant findings."
    ],
    "facts": [
      [
        "Census Act, 1948",
        "The legal framework for India's national population census."
      ],
      [
        "Count versus policy",
        "Population data inform decisions but do not by themselves determine every allocation or entitlement."
      ]
    ],
    "mains": "discuss how accurate and responsibly used population data can improve inclusive public planning"
  },
  "world-bank": {
    "background": "International economic outlooks combine evidence and assumptions to assess possible developments. Forecasts are conditional estimates, not guarantees about how a national economy will perform.",
    "importance": [
      "External context: Global growth and financing conditions affect trade, investment and domestic choices.",
      "Policy comparison: Common indicators can help identify relative strengths and vulnerabilities across economies."
    ],
    "challenges": [
      "Forecast uncertainty: Trade measures, conflicts and other shocks can change the assumptions behind an outlook.",
      "Aggregate limits: National growth forecasts can conceal different experiences across sectors and households."
    ],
    "wayForward": [
      "Read assumptions: Identify the forecast period, risks and revisions before using a headline number.",
      "Build resilience: Assess domestic capabilities and a range of external scenarios rather than relying on one predicted outcome."
    ],
    "facts": [
      [
        "World Bank",
        "An international development-finance and knowledge institution."
      ],
      [
        "Forecast versus observation",
        "An expected future rate is different from a measured past result."
      ]
    ],
    "mains": "assess how global economic uncertainty should inform India's growth and trade strategy"
  },
  "ncrb": {
    "background": "Recorded crime data describe incidents registered under specified categories. They are essential evidence, but reporting practices and access to institutions affect the picture they present.",
    "importance": [
      "Targeted prevention: Group-wise and location-wise evidence can help identify where protection and services need attention.",
      "Justice access: Registration patterns can reveal the importance of accessible reporting and follow-up."
    ],
    "challenges": [
      "Interpretation limits: Changes in recorded cases may reflect changes in reporting or registration as well as incidence.",
      "Under-reporting: Fear, stigma and practical barriers can prevent the data from capturing all harm."
    ],
    "wayForward": [
      "Contextual analysis: Examine definitions, rates, population bases and registration practices before drawing causal conclusions.",
      "Better response: Improve reporting access, victim support and investigation quality while monitoring outcomes."
    ],
    "facts": [
      [
        "Registered cases",
        "Are not necessarily a complete count of every incident."
      ],
      [
        "Counts versus rates",
        "A population denominator can be important when comparing places or groups."
      ]
    ],
    "mains": "explain how recorded crime statistics can inform protection of vulnerable groups without being misread"
  },
  "cancer": {
    "background": "Cancer registries collect structured information about diagnosed cases. Population-based and hospital-based records serve different purposes and should not be treated as interchangeable measures of national incidence.",
    "importance": [
      "Health planning: Reliable patterns can guide prevention, diagnostic capacity and treatment services.",
      "Unequal burden: Age, location and access to diagnosis can affect the recorded distribution of disease."
    ],
    "challenges": [
      "Uneven coverage: Registries may not represent every area or capture all diagnosed and undiagnosed disease.",
      "Data quality: Consistent definitions, follow-up and privacy protection are needed for useful comparisons."
    ],
    "wayForward": [
      "Improve evidence: Strengthen coverage, quality checks and links with appropriate health services.",
      "Use findings responsibly: Explain limits and combine disease data with evidence about access, prevention and care capacity."
    ],
    "facts": [
      [
        "Population-based registry",
        "Records cancer occurrence in a defined population."
      ],
      [
        "Hospital-based registry",
        "Records patients managed by participating hospitals and does not automatically measure population incidence."
      ]
    ],
    "mains": "assess how stronger cancer registries can improve public-health planning while respecting data limitations"
  },
  "water": {
    "background": "Shared river systems link states through flows, reservoirs and competing uses. An allocation dispute therefore involves hydrological evidence, applicable arrangements and cooperation over changing conditions.",
    "importance": [
      "Livelihoods and services: Water decisions affect farming, drinking-water supply and other activities beyond one state.",
      "Federal cooperation: Transparent operating information can reduce mistrust and support practical coordination."
    ],
    "challenges": [
      "Variable supply: Rainfall and storage conditions can make fixed expectations difficult to meet in every period.",
      "Conflicting interests: Political narratives can obscure the distinction between water availability, legal allocation and operating decisions."
    ],
    "wayForward": [
      "Shared evidence: Publish relevant flow and storage information and clarify the basis of release decisions.",
      "Cooperative management: Use applicable forums and agreed procedures, while improving demand management and protection of essential needs."
    ],
    "facts": [
      [
        "Article 262",
        "Concerns disputes over waters of inter-state rivers or river valleys."
      ],
      [
        "Evidence and allocation",
        "Physical availability and the legal entitlement to water are different questions."
      ]
    ],
    "mains": "examine how evidence sharing and cooperative mechanisms can improve management of inter-state water disputes"
  },
  "security": {
    "background": "A security response involves prevention, lawful enforcement, coordination and public confidence. Operational claims, allegations and proven outcomes need to be kept separate when assessing a reported development.",
    "importance": [
      "Public safety: Effective institutions must reduce risks while protecting the people and places most exposed.",
      "Strategic choices: Security action can interact with diplomacy, local livelihoods and longer-term stability."
    ],
    "challenges": [
      "Attribution and evidence: Early reports may leave uncertainty about responsibility, capability and the scale of an incident.",
      "Long-term effects: Immediate action does not by itself address recruitment, trust, cross-border conditions or service gaps."
    ],
    "wayForward": [
      "Coordinated response: Combine reliable intelligence, lawful procedures and cooperation between responsible institutions.",
      "Review outcomes: Assess civilian safety, rights, prevention and long-term resilience, not only the visibility of an operation."
    ],
    "facts": [
      [
        "Claims versus findings",
        "A reported allegation or announced objective is not a verified operational outcome."
      ],
      [
        "Comprehensive security",
        "Prevention, lawful action and community cooperation can have complementary roles."
      ]
    ],
    "mains": "evaluate how immediate security action can be combined with lawful safeguards and longer-term prevention"
  },
  "environment-approval": {
    "background": "Environmental impact assessment examines likely effects before a project decision and identifies safeguards. Expert review, public input and subsequent monitoring play different roles in making the process effective.",
    "importance": [
      "Preventing harm: Assessment can identify risks to habitats, water and communities before decisions lock in costs.",
      "Better investment decisions: Clear evidence and predictable procedures can reduce later conflict and uncertainty."
    ],
    "challenges": [
      "Weak evidence: Incomplete baseline data or poor studies can hide important ecological and social effects.",
      "Consultation and enforcement: A hearing or approval document alone does not show that concerns are addressed or conditions followed."
    ],
    "wayForward": [
      "Strengthen appraisal: Use suitable expertise, credible data and understandable opportunities for affected people to raise concerns.",
      "Follow-through: Publish reasons and conditions, monitor compliance and act on verified failures after clearance."
    ],
    "facts": [
      [
        "Prior assessment",
        "Examines likely effects before a project is approved."
      ],
      [
        "Approval versus compliance",
        "Permission and subsequent adherence to conditions are separate stages."
      ]
    ],
    "mains": "assess how environmental appraisal can be timely without weakening scrutiny, participation and compliance"
  },
  "climate": {
    "background": "Climate change involves long-term changes in the climate system. Reducing emissions and preparing for impacts are complementary tasks, with different responsibilities and practical measures.",
    "importance": [
      "Development choices: Energy, transport, land use and infrastructure decisions shape both emissions and exposure to future harm.",
      "Fairness: Groups contributing least to emissions may still face severe effects and limited resources for protection."
    ],
    "challenges": [
      "Action gap: Announced goals and rising clean investment do not by themselves establish a sufficient reduction in emissions.",
      "Unequal capacity: Finance, skills and local institutional strength affect how countries and communities can respond."
    ],
    "wayForward": [
      "Link goals to delivery: Track sector-specific action, emissions and protection outcomes with clear responsibility.",
      "Combine responses: Pursue cleaner development alongside water, health, disaster and livelihood measures for exposed groups."
    ],
    "facts": [
      [
        "Mitigation",
        "Reducing emissions or increasing removal through sinks."
      ],
      [
        "Adaptation",
        "Adjusting to impacts and reducing harm; it does not substitute for limiting warming."
      ]
    ],
    "mains": "discuss how climate policy can combine emissions reduction, adaptation and fairness in development"
  },
  "energy": {
    "background": "Energy security depends on affordable and reliable supplies, transport routes, processing capacity and the ability to manage disruptions. A risk at a refinery can matter even when crude oil is available.",
    "importance": [
      "Economic costs: Fuel disruptions can affect transport, production, public finances and household budgets.",
      "External exposure: Import dependence connects domestic prices and supply reliability with international events."
    ],
    "challenges": [
      "Concentrated supply: Dependence on particular routes, suppliers or processing facilities can magnify disruption.",
      "Transition constraints: Diversification and cleaner substitutes require time, investment and suitable infrastructure."
    ],
    "wayForward": [
      "Diversify risks: Assess suppliers, routes, processing and emergency arrangements together rather than relying on one adjustment.",
      "Improve resilience: Combine efficient energy use and viable alternatives with transparent monitoring of supply and costs."
    ],
    "facts": [
      [
        "Crude versus products",
        "Availability of crude oil is distinct from the capacity to refine and deliver usable fuel."
      ],
      [
        "Import bill",
        "Depends on prices, quantities and exchange rates, not only one headline market move."
      ]
    ],
    "mains": "evaluate how India can reduce vulnerability to energy-supply disruptions without neglecting affordability"
  },
  "international": {
    "background": "International cooperation can involve political statements, negotiated arrangements and legally binding instruments. Their significance depends on the parties, interests, obligations and practical follow-through.",
    "importance": [
      "National interests: Relations can affect India's trade, security, technology access and freedom of policy choice.",
      "Cooperative platforms: Dialogue can create channels for managing disputes and pursuing shared objectives."
    ],
    "challenges": [
      "Divergent interests: Shared statements can conceal differences in priorities, capabilities and willingness to deliver.",
      "Outcome uncertainty: A meeting or declaration is not proof of completed investment, reduced tensions or binding commitments."
    ],
    "wayForward": [
      "Read commitments carefully: Distinguish political intentions from legal duties and identify concrete follow-up steps.",
      "Assess delivery: Track responsible institutions, agreed timelines and practical benefits while recognising unresolved disagreements."
    ],
    "facts": [
      [
        "Joint declaration",
        "Can express political commitments; legal force depends on its nature and terms."
      ],
      [
        "Cooperation versus outcome",
        "An announced plan should be assessed separately from work already delivered."
      ]
    ],
    "mains": "assess the significance and limits of the reported development for India's interests"
  }
};
  const sections = ['Background', 'Key developments', 'Significance', 'Challenges', 'Way forward', 'Prelims focus', 'Mains practice'];
  function forIssue(item) {
    const exam = CurrentAffairsExam.forIssue(item);
    const profile = profiles[exam?.id];
    if (!profile) return null;
    const copy = CurrentAffairsLanguage.forIssue(item);
    return {
      news: copy.update,
      background: profile.background,
      developments: item.summary.map(CurrentAffairsLanguage.plain),
      importance: profile.importance,
      challenges: profile.challenges,
      wayForward: profile.wayForward,
      facts: profile.facts,
      mains: `Using "${copy.title}" as context, ${profile.mains}. (150 words)`,
      source: {name: item.source, url: item.url, published: item.published},
      kind: 'Study analysis',
      sections
    };
  }
  return {forIssue};
})();
