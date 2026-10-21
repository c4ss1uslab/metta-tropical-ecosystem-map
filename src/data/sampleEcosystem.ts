import { EcosystemEntity, EntityType } from '../types';

export const INITIAL_ENTITIES: EcosystemEntity[] = [
  // ==========================================
  // INNER QUADRANT (Upper Left: -x, -y)
  // ==========================================
  {
    id: 'in-001',
    name: 'Mind & Life Institute',
    type: 'Organization',
    category: 'Inner',
    fields: ['Contemplative Science', 'Neuroscience', 'Mindfulness'],
    description: 'Bridges science and contemplative wisdom to alleviate suffering and promote human flourishing.',
    location: 'United States',
    language: 'English',
    biome: 'Temperate Broadleaf & Mixed Forests',
    stage: 'Established',
    website: 'https://mindandlife.org',
    socialMedia: {
      twitter: 'https://x.com/MindandLife',
      linkedin: 'https://www.linkedin.com/company/mind-and-life-institute/',
      youtube: 'https://www.youtube.com/@mindandlife',
      instagram: 'https://www.instagram.com/mindandlife/'
    },
    contactEmail: 'contact@mindandlife.org',
    logo: 'https://www.google.com/s2/favicons?domain=mindandlife.org&sz=128',
    favicon: 'https://www.google.com/s2/favicons?domain=mindandlife.org&sz=64',
    x: -450,
    y: -420,
    featured: true,
    communityNotes: [
      {
        id: 'cn-init-01',
        author: 'Elena Rostova',
        content: 'Attended their annual symposium on contemplative neurophenomenology. The interdisciplinary working groups are deeply grounded and welcoming.',
        createdAt: '2026-06-12T14:32:00.000Z'
      },
      {
        id: 'cn-init-02',
        author: 'Marcus Vance',
        content: 'Their grant program has recently opened up funding for grassroots community-led contemplative research.',
        createdAt: '2026-07-28T09:15:00.000Z'
      }
    ],
    continent: '2. Isles of Contemplative Wisdom',
    otherArchipelagos: ['1. Sanctuary of Somatics & Healing', '3. Territory of Inner Capacities'],
    founders: ['Francisco Varela', 'Dalai Lama', 'Adam Engle'],
    partners: ['Garrison Institute', 'Inner Development Goals (IDG)', 'Plum Village Monastery'],
    funders: ['Fetzer Institute', 'Templeton Foundation'],
    teachers: ['Francisco Varela', 'H.H. Dalai Lama'],
    collaborators: ['Richard Davidson', 'Matthieu Ricard'],
    categorizedFields: {
      'Overview': {
        'Org ID': 'ORG-001',
        'Entity Type': 'Organization',
        'Island/Cluster': '2. Isles of Contemplative Wisdom',
        'Approach': 'Contemplative Neuroscience & Dialogue',
        'Who They Serve': 'Researchers, Contemplatives, Educators'
      },
      'Logistic Info': {
        'Year Founded': '1987',
        'Language(s)': 'English',
        'Operating Region': 'Global'
      },
      'Relationships': {
        'Founder(s)/Main Source(s)': 'Francisco Varela, Dalai Lama, Adam Engle',
        'Partners (Institutions)': 'Garrison Institute, Inner Development Goals (IDG), Plum Village Monastery',
        'Funders/Supporters (Institutions)': 'Fetzer Institute, Templeton Foundation',
        'Teachers/Influences (People)': 'Francisco Varela, H.H. Dalai Lama',
        'Partners/Collaborators (People)': 'Richard Davidson, Matthieu Ricard'
      },
      'Worldview & Change Orientation': {
        'Transformation Focus (I-V) - inner, social, cultural, systems': 'I. Inner Change',
        'Orientation to Change (Three Horizons)': 'H3: Pioneering visionary contemplative science and transformative human flourishing',
        'Situational Assessment': 'Crisis of meaning and disconnection between empirical science and contemplative inner wisdom.',
        'Value Meme / Ethical Orientation': 'Teal / Evolutionary',
        'Orientation to Change (GTDF)': 'Transformative Pedagogy',
        'Orientation to Change (CRI)': 'Transformational',
        'Matching Database': 'Life Itself',
        'Response Orientation': 'Contemplative neuroscience, dialogue, transformational research',
        'Theory of Change (GTDF)': 'Transforming minds through empirical inquiry and contemplative practices transforms culture.',
        'IDGs/Inner Capacities': 'Self-awareness, Openness and learning mindset, Compassion, Inner compass',
        'Featured Resources': '[Contemplative Sciences Compendium](https://www.mindandlife.org/research/), [Key Practice Framework](https://www.mindandlife.org/insights/)',
        'Relevant Resources': '[Research Database](https://www.mindandlife.org/research/), [Grant Opportunities](https://www.mindandlife.org/grants/)'
      },
      'Warm Data': {
        'Point of Contact(s)': 'Elena Rostova',
        'Email': 'contact@mindandlife.org',
        'Social Profile(s)': 'https://x.com/MindandLife, https://www.linkedin.com/company/mind-and-life-institute/',
        'Corresponding Database': '[Metta Contemplative Research Archive](https://airtable.com/appMettArchive)',
        'Matching Database': 'Life Itself'
      },
      'Discourse Analysis / Argument Mapping': {
        'Concepts': 'Contemplative Science, Neurophenomenology, Embodied Cognition',
        'Frameworks': 'First-person / Third-person Integration Framework',
        'Arguments/Claims': 'Sustained contemplative practice creates measurable neuroplastic changes and fosters prosocial attitudes.',
        'Analyst Commentary': 'Pioneering organization bridging neuroscience and Buddhist contemplation.'
      }
    },
    extraFields: { 'Founded Year': 1987, 'Focus Area': 'Interdisciplinary Dialogue', 'Impact Scale': 'Global' }
  },
  {
    id: 'in-002',
    name: 'Garrison Institute',
    type: 'Organization',
    category: 'Inner',
    continent: '2. Isles of Contemplative Wisdom',
    otherArchipelagos: ['4. Deep Ecology Heartland', '22. Regenerative Education'],
    partners: ['Mind & Life Institute'],
    funders: ['Fetzer Institute'],
    fields: ['Contemplative Leadership', 'Ecological Awareness', 'Trauma Resilience'],
    description: 'Applies contemplative wisdom and science to cultivate personal, social, and ecological change.',
    location: 'United States',
    language: 'English',
    biome: 'Temperate Broadleaf & Mixed Forests',
    stage: 'Established',
    website: 'https://garrisoninstitute.org',
    logo: 'https://www.google.com/s2/favicons?domain=garrisoninstitute.org&sz=128',
    favicon: 'https://www.google.com/s2/favicons?domain=garrisoninstitute.org&sz=64',
    socialMedia: {
      twitter: 'https://x.com/garrisoninst',
      linkedin: 'https://www.linkedin.com/company/garrison-institute/',
      youtube: 'https://www.youtube.com/@GarrisonInstitute'
    },
    x: -320,
    y: -580,
    categorizedFields: {
      'Relationships': {
        'Partners (Institutions)': 'Mind & Life Institute',
        'Funders/Supporters (Institutions)': 'Fetzer Institute'
      },
      'Worldview & Change Orientation': {
        'Transformation Focus (I-V) - inner, social, cultural, systems': 'I. Inner Change',
        'Situational Assessment': 'Cultivating inner resilience and contemplative wisdom to meet polycrisis challenges.',
        'Orientation to Change (Three Horizons)': 'H2/H3 Bridge: Transformative retreat & fellowship models',
        'Value Meme / Ethical Orientation': 'Green / Communitarian',
        'Orientation to Change (GTDF)': 'Deep Adaptation & Resilience',
        'Orientation to Change (CRI)': 'Prefigurative'
      },
      'Warm Data': {
        'Matching Database': 'Metta Earth'
      }
    },
    extraFields: { 'Founded Year': 2003, 'Facility': 'Hudson Valley Retreat Center' }
  },
  {
    id: 'in-003',
    name: 'Inner Development Goals (IDG)',
    type: 'Organization',
    category: 'Inner',
    continent: '3. Territory of Inner Capacities',
    otherArchipelagos: ['22. Regenerative Education', '10. Archipelago of Social Weaving'],
    partners: ['Mind & Life Institute'],
    funders: ['IKEA Foundation', 'Oak Foundation'],
    secondaryCategories: ['Systems'],
    isDomainElevation: true,
    fields: ['Inner Capacity Building', 'Leadership Development', 'Transformational Skills'],
    description: 'A global framework connecting inner human capabilities directly to achieving systemic SDG transformation and structural change.',
    location: 'Sweden',
    language: 'English',
    biome: 'Boreal Forests / Taiga',
    stage: 'Movement',
    website: 'https://innerdevelopmentgoals.org',
    socialMedia: {
      linkedin: 'https://www.linkedin.com/company/inner-development-goals/',
      twitter: 'https://x.com/innerdevgoals',
      instagram: 'https://www.instagram.com/innerdevelopmentgoals/',
      youtube: 'https://www.youtube.com/@innerdevelopmentgoals'
    },
    x: -125,
    y: -125,
    featured: true,
    categorizedFields: {
      'Relationships': {
        'Partners (Institutions)': 'Mind & Life Institute',
        'Funders/Supporters (Institutions)': 'IKEA Foundation, Oak Foundation'
      },
      'Worldview & Change Orientation': {
        'Transformation Focus (I-V) - inner, social, cultural, systems': 'I. Inner Change',
        'Situational Assessment': 'Outer collective goals stall without developing interior human capabilities.',
        'Value Meme / Ethical Orientation': 'Yellow / Integrative',
        'Orientation to Change (Three Horizons)': 'H3: Transformational human capacities for planetary survival',
        'Orientation to Change (GTDF)': 'Systemic Capability Building',
        'Orientation to Change (CRI)': 'Radical Reform',
        'Matching Database': 'Inner Development Goals Registry',
        'Relevant Resources': '[IDG Framework & Skills Toolkit](https://innerdevelopmentgoals.org/framework), [Global Report](https://innerdevelopmentgoals.org/report)'
      },
      'Warm Data': {
        'Corresponding Database': '[Global IDG Hub Registry](https://innerdevelopmentgoals.org/hubs)',
        'Matching Database': 'Inner Development Goals Registry'
      }
    },
    extraFields: { 'Global Hubs': 140, 'Framework Dimensions': '5 Dimensions, 23 Skills', 'Elevation Axis': 'Inner ∩ Systems Spine (Diagonal)' }
  },
  {
    id: 'in-004',
    name: 'Plum Village Monastery',
    type: 'Organization',
    category: 'Inner',
    continent: '2. Isles of Contemplative Wisdom',
    otherArchipelagos: ['4. Deep Ecology Heartland'],
    fields: ['Engaged Buddhism', 'Mindfulness', 'Peace Building'],
    description: 'International community founded by Thich Nhat Hanh practicing engaged mindfulness and deep ecology.',
    location: 'France',
    language: 'English, French, Vietnamese',
    biome: 'Mediterranean Forests, Woodlands & Scrub',
    stage: 'Classic',
    website: 'https://plumvillage.org',
    socialMedia: {
      youtube: 'https://www.youtube.com/@plumvillageapp',
      instagram: 'https://www.instagram.com/plumvillageapp/',
      facebook: 'https://www.facebook.com/plumvillage/'
    },
    x: -720,
    y: -650,
    featured: true,
    extraFields: { 'Tradition': 'Zen / Engaged Buddhism', 'Global Monasteries': 11 }
  },
  {
    id: 'in-005',
    name: 'Joanna Macy',
    type: 'Person',
    category: 'Inner',
    continent: '4. Deep Ecology Heartland',
    otherArchipelagos: ['2. Isles of Contemplative Wisdom', '13. Archipelago of Living Mythos & Narrative'],
    secondaryCategories: ['Cultural'],
    isDomainElevation: true,
    fields: ['Deep Ecology', 'The Work That Reconnects', 'Despair & Empowerment'],
    description: 'Eco-philosopher and Buddhist scholar whose Great Turning paradigm bridges personal despair work with cultural mythos and holistic ecological transition.',
    location: 'United States',
    language: 'English',
    stage: 'Classic',
    website: 'https://joannamacy.net',
    socialMedia: {
      facebook: 'https://www.facebook.com/joannamacy.net',
      youtube: 'https://www.youtube.com/results?search_query=joanna+macy'
    },
    x: -145,
    y: -65,
    featured: true,
    extraFields: { 'Key Work': 'Coming Back to Life', 'Core Paradigm': 'The Great Turning', 'Elevation Axis': 'Inner ∩ Cultural Plateau (West)' }
  },
  {
    id: 'in-006',
    name: 'Thomas Hübl',
    type: 'Person',
    category: 'Inner',
    secondaryCategories: ['Social'],
    isDomainElevation: true,
    fields: ['Collective Trauma Integration', 'Pocket Project', 'Attunement'],
    description: 'Bridges individual somatic attunement with collective and historical trauma integration across social groups and conflict zones.',
    location: 'Germany / USA',
    language: 'English, German',
    stage: 'Established',
    website: 'https://thomashuebl.com',
    socialMedia: {
      twitter: 'https://x.com/thomashuebl',
      linkedin: 'https://www.linkedin.com/in/thomashuebl/',
      instagram: 'https://www.instagram.com/thomashuebl/',
      youtube: 'https://www.youtube.com/@ThomasHuebl'
    },
    x: -65,
    y: -145,
    extraFields: { 'Key Project': 'Pocket Project', 'Focus': 'Global Trauma Healing', 'Elevation Axis': 'Inner ∩ Social Col (North)' }
  },
  {
    id: 'in-007',
    name: 'Tara Brach',
    type: 'Person',
    category: 'Inner',
    fields: ['Radical Acceptance', 'Self-Compassion', 'Mindfulness'],
    description: 'Psychologist and meditation teacher blending Western psychology and Eastern spiritual practices.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://tarabrach.com',
    x: -650,
    y: -480
  },
  {
    id: 'in-008',
    name: 'Resmaa Menakem',
    type: 'Person',
    category: 'Inner',
    fields: ['Somatic Abolitionism', 'Racialized Trauma', 'Body-Centered Healing'],
    description: 'Healer, author, and trauma specialist pioneering body-centered approaches to racial healing.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://resmaa.com',
    x: -180,
    y: -680,
    featured: true
  },
  {
    id: 'in-010',
    name: 'Somatic Experiencing International',
    type: 'Organization',
    category: 'Inner',
    fields: ['Trauma Healing', 'Somatics', 'Nervous System Regulation'],
    approach: ['Somatic Experiencing (SE)', 'Body-based Psychotherapy'],
    issues: ['Trauma', 'PTSD', 'Stress Regulation'],
    activities: ['Professional Practitioner Training', 'Clinical Research', 'Workshops'],
    description: 'Body-oriented approach to healing trauma and stress disorders developed by Dr. Peter Levine.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://traumahealing.org',
    x: -390,
    y: -180
  },
  {
    id: 'in-011',
    name: 'Inner Green Deal',
    type: 'Organization',
    category: 'Inner',
    fields: ['Climate Mindfulness', 'Leadership Development', 'Inner Capacity Building'],
    approach: ['Mindful Leadership', 'Somatic Presence'],
    issues: ['Climate Burnout', 'Leadership Resilience'],
    activities: ['Facilitation Training', 'Executive Coaching', 'Public Summits'],
    description: 'Non-profit building inner capacities for leaders navigating climate change and ecological transition.',
    location: 'Germany',
    language: 'English, German',
    stage: 'Emerging',
    website: 'https://innergreendeal.org',
    x: -780,
    y: -220
  },
  {
    id: 'in-012',
    name: 'Center for Contemplative Mind in Society',
    type: 'Organization',
    category: 'Inner',
    fields: ['Contemplative Pedagogy', 'Social Justice', 'Mindfulness'],
    approach: ['Contemplative Inquiry', 'Higher Education Pedagogy'],
    issues: ['Educational Reform', 'Compassion Deficit', 'Social Justice'],
    activities: ['Faculty Fellowships', 'Academic Conferences', 'Curriculum Design'],
    description: 'Promotes contemplative practices in higher education to foster a more compassionate world.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://contemplativemind.org',
    x: -220,
    y: -420
  },
  {
    id: 'in-013',
    name: 'Jon Kabat-Zinn',
    type: 'Person',
    category: 'Inner',
    fields: ['MBSR', 'Mindfulness', 'Integrative Medicine'],
    approach: ['Mindfulness-Based Stress Reduction', 'Clinical Science'],
    issues: ['Chronic Pain', 'Stress Disorders', 'Public Health'],
    activities: ['Writing', 'Retreat Teaching', 'Clinical Trials'],
    description: 'Founder of Mindfulness-Based Stress Reduction (MBSR) bringing mindfulness into mainstream medicine.',
    location: 'United States',
    language: 'English',
    stage: 'Classic',
    x: -810,
    y: -510
  },
  {
    id: 'in-015',
    name: 'Strozzi Institute',
    type: 'Organization',
    category: 'Inner',
    fields: ['Somatic Leadership', 'Embodied Transformation', 'Presence'],
    approach: ['Somatic Coaching', 'Embodied Leadership'],
    issues: ['Executive Leadership', 'Organizational Culture', 'Embodied Presence'],
    activities: ['Masterclasses', 'Certification Courses', 'Corporate Training'],
    description: 'Training institute for somatic coaching and leadership development rooted in embodiment philosophy.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://strozziinstitute.com',
    x: -420,
    y: -690
  },

  // Generate additional Inner entities...
  ...Array.from({ length: 32 }, (_, i) => ({
    id: `in-${100 + i}`,
    name: [
      'Center for Courage & Renewal', 'Wisdom 2.0', 'Neuro-Contemplative Lab', 'Ecology of Mind Collective',
      'Somatics for Climate Action', 'The Pocket Project', 'Mindful Peacebuilder Guild', 'Acutonics Sound Institute',
      'Presencing Institute Inner Arc', 'Center for Building a Culture of Empathy', 'Internal Family Systems Institute',
      'Compassionate Inquiry Lab', 'Zen Peacemakers', 'Interconnectedness Circle', 'Generative Somatics',
      'Polyvagal Institute', 'Deep Listening Institute', 'Mindfulness in Education Network', 'HeartMath Institute',
      'Somatic Conflict Transformation', 'Contemplative Alliance', 'Integral Life Project', 'Threshold Choir',
      'Center for Sacred Ecology', 'Embodied Wisdom Academy', 'Contemplative Activism Network', 'Inner Resilience Program',
      'Mindful Leadership Network', 'Eco-Grief Circles', 'Bio-Embodied Research', 'Somatic Abolition Collective', 'Center for Inner Climate'
    ][i] || `Inner Guild ${i}`,
    type: (i % 2 === 0 ? 'Organization' : 'Person') as EntityType,
    category: 'Inner' as const,
    dataCompleteness: (['Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'] as const)[i % 5],
    dataQuality: (['Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'] as const)[i % 5],
    ourRelationship: ([
      '1) Core collaborator / partner',
      '2) Regular collaborator',
      '3) Intending to collaborate with / occasionally collaborating with',
      '4) Advisory / Ally',
      '5) Exploring relationship',
      '6. Following Closely',
      '7: Following',
      '8: In conversation',
      '9: Aware of',
      '10: Unaware of',
      '11. Crowdsourced'
    ] as const)[i % 11],
    fields: [
      ['Contemplative Science', 'Mindfulness'],
      ['Somatics', 'Trauma Healing'],
      ['Inner Capacity Building', 'Leadership Development'],
      ['Relational Practice', 'Empathy'],
      ['Deep Ecology', 'Grief Work']
    ][i % 5],
    description: `Explores the dimensions of internal landscape, spiritual grounding, somatic integration, and contemplative capacity.`,
    location: ['United States', 'United Kingdom', 'Germany', 'Sweden', 'Global', 'Brazil', 'Japan'][i % 7],
    language: 'English',
    stage: ['Emerging', 'Established', 'Movement'][i % 3],
    x: -850 + ((i * 37) % 750),
    y: -850 + ((i * 53) % 750),
    extraFields: { 'Community Size': `${(i + 1) * 150} members` }
  })),

  // ==========================================
  // SOCIAL QUADRANT (Upper Right: +x, -y)
  // ==========================================
  {
    id: 'so-001',
    name: 'Transition Network',
    type: 'Organization',
    category: 'Social',
    continent: '9. Transition & Local Resilience Biome',
    otherArchipelagos: ['6. Commonwealth of the Commons', '16. Expanse of Doughnut & Post-Growth Economics'],
    secondaryCategories: ['Cultural'],
    isDomainElevation: true,
    fields: ['Community Resilience', 'Localization', 'Transition Towns'],
    description: 'Global movement supporting community-led initiatives for local resilience, low-carbon living, and participatory action, bridging social solidarity with cultural narratives and regenerative local mythos.',
    location: 'United Kingdom / Global',
    language: 'English, Multiple',
    biome: 'Temperate Broadleaf & Mixed Forests',
    stage: 'Established',
    website: 'https://transitionnetwork.org',
    socialMedia: {
      twitter: 'https://x.com/transitionnetwork',
      facebook: 'https://www.facebook.com/transitionnetwork/',
      youtube: 'https://www.youtube.com/@transitionnetwork'
    },
    x: 125,
    y: -125,
    featured: true,
    categorizedFields: {
      'Worldview & Change Orientation': {
        'Transformation Focus (I-V) - inner, social, cultural, systems': 'II. Social Change',
        'Orientation to Change (Three Horizons)': 'H3: Grassroots regenerative community transitions',
        'Theory of Change (GTDF)': 'Reclaiming local community autonomy, food sovereignty, and localized commons'
      }
    },
    extraFields: { 'Initiatives Worldwide': '1400+', 'Founded': 2006, 'Elevation Axis': 'Social ∩ Cultural Spine (Diagonal)' }
  },
  {
    id: 'so-002',
    name: 'Loomio',
    type: 'Organization',
    category: 'Social',
    fields: ['Cooperative Tech', 'Participatory Decision-Making', 'Consensus'],
    description: 'Worker-owned cooperative developing open-source tools for collaborative deliberation and democratic governance.',
    location: 'New Zealand',
    language: 'English',
    stage: 'Established',
    website: 'https://loomio.org',
    socialMedia: {
      twitter: 'https://x.com/Loomio',
      github: 'https://github.com/loomio/loomio',
      facebook: 'https://www.facebook.com/loomio/'
    },
    x: 620,
    y: -320,
    extraFields: { 'Structure': 'Worker Cooperative', 'Users': '200k+' }
  },
  {
    id: 'so-003',
    name: 'Enspiral',
    type: 'Organization',
    category: 'Social',
    continent: '7. Federation of Civic Action',
    otherArchipelagos: ['6. Commonwealth of the Commons', '18. Nexus of Complexity & Systems Dynamics'],
    secondaryCategories: ['Systems'],
    isDomainElevation: true,
    fields: ['Non-Hierarchical Work', 'Cooperative Economy', 'Social Enterprise'],
    description: 'A global network of freelancers and social entrepreneurs pioneering non-hierarchical organizational forms and peer-to-peer economic systems.',
    location: 'New Zealand / Global',
    language: 'English',
    stage: 'Established',
    website: 'https://enspiral.com',
    socialMedia: {
      twitter: 'https://x.com/enspiral',
      linkedin: 'https://www.linkedin.com/company/enspiral/',
      facebook: 'https://www.facebook.com/enspiral'
    },
    x: 145,
    y: -65,
    featured: true,
    extraFields: { 'Elevation Axis': 'Social ∩ Systems Terrace (East)' }
  },
  {
    id: 'so-004',
    name: 'Ecosia',
    type: 'Organization',
    category: 'Social',
    fields: ['Social Enterprise', 'Reforestation', 'Purpose Economy'],
    description: 'Search engine donating 100% of profits to climate action and tree planting worldwide.',
    location: 'Germany',
    language: 'English, German',
    stage: 'Established',
    website: 'https://ecosia.org',
    socialMedia: {
      twitter: 'https://x.com/ecosia',
      linkedin: 'https://www.linkedin.com/company/ecosia/',
      instagram: 'https://www.instagram.com/ecosia/',
      youtube: 'https://www.youtube.com/@ecosia',
      facebook: 'https://www.facebook.com/ecosia'
    },
    x: 750,
    y: -700,
    featured: true,
    extraFields: { 'Trees Planted': '200M+', 'Legal Status': 'Purpose-Driven Company' }
  },
  {
    id: 'so-005',
    name: 'Participatory City Foundation',
    type: 'Organization',
    category: 'Social',
    secondaryCategories: ['Inner'],
    isDomainElevation: true,
    fields: ['Neighborhood Commons', 'Participatory Ecosystems', 'Social Infrastructure'],
    description: 'Pioneering large-scale participatory ecosystems building neighbor-led practical projects in urban areas, connecting civic community action with personal belonging and well-being.',
    location: 'United Kingdom',
    language: 'English',
    stage: 'Established',
    website: 'https://participatorycity.org',
    x: 65,
    y: -145,
    extraFields: { 'Elevation Axis': 'Inner ∩ Social Col (North)' }
  },
  {
    id: 'so-006',
    name: 'Rebecca Solnit',
    type: 'Person',
    category: 'Social',
    fields: ['Mutual Aid', 'Hope in the Dark', 'Public Discourse'],
    description: 'Writer, historian, and activist exploring community solidarity during disasters, feminism, and social change history.',
    location: 'United States',
    language: 'English',
    stage: 'Classic',
    x: 520,
    y: -780,
    featured: true
  },
  {
    id: 'so-007',
    name: 'Cormac Russell',
    type: 'Person',
    category: 'Social',
    fields: ['Asset-Based Community Development', 'Community Building', 'Social Cohesion'],
    description: 'Managing director of Nurture Development, advocating for citizen-led community empowerment.',
    location: 'Ireland',
    language: 'English',
    stage: 'Established',
    x: 340,
    y: -440
  },
  {
    id: 'so-008',
    name: 'Mutual Aid Disaster Relief',
    type: 'Organization',
    category: 'Social',
    fields: ['Mutual Aid', 'Disaster Response', 'Grassroots Solidarity'],
    approach: ['Grassroots Direct Action', 'Decentralized Mutual Aid'],
    issues: ['Climate Disaster Impact', 'Infrastructure Collapse', 'State Inaction'],
    activities: ['Emergency First Response', 'Water Filtration Distribution', 'Medic Training'],
    description: 'Grassroots network providing disaster relief based on principles of solidarity, autonomous action, and mutual assistance.',
    location: 'United States',
    language: 'English, Spanish',
    stage: 'Movement',
    website: 'https://mutualaiddisasterrelief.org',
    x: 820,
    y: -220
  },

  // Additional Social entities...
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `so-${100 + i}`,
    name: [
      'Fearless Cities Network', 'Co-operatives UK', 'Social Solidarity Economy Forum', 'Democracy in Europe Movement',
      'Open Food Network', 'Citizen-Led Energy Guild', 'Timebanking UK', 'Restorative Justice Project',
      'Workers Collective Network', 'Global Mutual Aid Hub', 'Neighborhood Care Circle', 'Civic Action Lab',
      'Public Commons Trust', 'Cooperative Housing Alliance', 'Local First Movement', 'Participatory Budgeting Project',
      'Democracy at Work', 'Social Repair Alliance', 'Municipal Resilience Lab', 'Peer-to-Peer Solidarity Union',
      'Urban Agriculture Commons', 'Community Care Network', 'Justice & Peace Guild', 'Social Economy Europe',
      'Solidarity Tech Collective', 'Cooperative Banking Forum', 'Civic Design Network', 'Community Energy Scotland',
      'Grassroots Organizing Hub', 'Open Source Health Collective', 'Public Land Stewardship Alliance', 'Mutual Credit Network',
      'Neighborhood Democracy Guild', 'Social Action Commons', 'Civic Tech Exchange'
    ][i] || `Social Node ${i}`,
    type: (i % 2 === 0 ? 'Organization' : 'Person') as EntityType,
    category: 'Social' as const,
    dataCompleteness: (['Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'] as const)[(i + 1) % 5],
    dataQuality: (['Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'] as const)[(i + 1) % 5],
    ourRelationship: ([
      '1) Core collaborator / partner',
      '2) Regular collaborator',
      '3) Intending to collaborate with / occasionally collaborating with',
      '4) Advisory / Ally',
      '5) Exploring relationship',
      '6. Following Closely',
      '7: Following',
      '8: In conversation',
      '9: Aware of',
      '10: Unaware of',
      '11. Crowdsourced'
    ] as const)[(i + 1) % 11],
    fields: [
      ['Community Resilience', 'Localization'],
      ['Cooperative Tech', 'Participatory Decision-Making'],
      ['Mutual Aid', 'Grassroots Solidarity'],
      ['Deliberative Democracy', 'Social Innovation'],
      ['Commons Housing', 'Social Solidarity Economy']
    ][i % 5],
    description: 'Working at the interface of civic action, cooperative ownership, neighborhood organizing, and participatory democracy.',
    location: ['United Kingdom', 'United States', 'Spain', 'Germany', 'France', 'Canada', 'Australia'][i % 7],
    language: 'English',
    stage: ['Emerging', 'Established', 'Movement'][i % 3],
    x: 120 + ((i * 41) % 760),
    y: -860 + ((i * 47) % 760),
    extraFields: { 'Active Projects': (i + 1) * 8 }
  })),

  // ==========================================
  // CULTURAL QUADRANT (Bottom Left: -x, +y)
  // ==========================================
  {
    id: 'cu-001',
    name: 'International Bateson Institute',
    type: 'Organization',
    category: 'Cultural',
    fields: ['Warm Data', 'Transcontextual Thinking', 'Ecological Culture'],
    description: 'Research institute founded by Nora Bateson focusing on transcontextual research into ecological and social systems.',
    location: 'Sweden / Global',
    language: 'English',
    biome: 'Boreal Forests / Taiga',
    stage: 'Established',
    website: 'https://batesoninstitute.org',
    x: -480,
    y: 380,
    featured: true,
    extraFields: { 'Methodology': 'Warm Data Lab', 'Founder': 'Nora Bateson' }
  },
  {
    id: 'cu-002',
    name: 'Nora Bateson',
    type: 'Person',
    category: 'Cultural',
    continent: '12. Archipelago of Transcontextual Mind',
    otherArchipelagos: ['13. Archipelago of Living Mythos & Narrative', '18. Nexus of Complexity & Systems Dynamics'],
    secondaryCategories: ['Inner'],
    isDomainElevation: true,
    fields: ['Warm Data', 'Aphanipoiesis', 'Systemic Perception'],
    description: 'Pioneer of Warm Data and transcontextual thinking, weaving inner relational perception with cultural worldviews and living systems.',
    location: 'Sweden',
    language: 'English',
    stage: 'Established',
    x: -145,
    y: 65,
    featured: true,
    extraFields: { 'Elevation Axis': 'Inner ∩ Cultural Plateau (West)' }
  },
  {
    id: 'cu-003',
    name: 'Emergence Magazine',
    type: 'Organization',
    category: 'Cultural',
    fields: ['Ecological Storytelling', 'Myth & Culture', 'Indigenous Wisdom'],
    description: 'Quarterly publication exploring the threads connecting ecology, culture, and spirituality.',
    location: 'United States',
    language: 'English',
    biome: 'Mediterranean Forests, Woodlands & Scrub',
    stage: 'Established',
    website: 'https://emergencemagazine.org',
    socialMedia: {
      twitter: 'https://x.com/emergencemag',
      instagram: 'https://www.instagram.com/emergencemagazine/',
      facebook: 'https://www.facebook.com/emergencemagazine',
      youtube: 'https://www.youtube.com/@emergencemagazine'
    },
    x: -650,
    y: 520,
    featured: true,
    extraFields: { 'Medium': 'Print & Digital Magazine', 'Focus': 'Sacred Ecology' }
  },
  {
    id: 'cu-004',
    name: 'Dark Mountain Project',
    type: 'Organization',
    category: 'Cultural',
    fields: ['Uncivilised Writing', 'Ecological Narrative', 'Post-Industrial Myth'],
    description: 'Network of writers, artists, and thinkers creating art and literature that steps outside the story of human exceptionalism.',
    location: 'United Kingdom',
    language: 'English',
    stage: 'Established',
    website: 'https://dark-mountain.net',
    socialMedia: {
      twitter: 'https://x.com/darkmountainproj',
      facebook: 'https://www.facebook.com/darkmountainproject/'
    },
    x: -280,
    y: 680,
    featured: true
  },
  {
    id: 'cu-meta-01',
    name: 'Metamoderna',
    type: 'Organization',
    category: 'Cultural',
    fields: ['Metamodernism', 'Hanzi Freinacht', 'Political Metamodernism', 'Metacrisis'],
    description: 'Publisher and research think-tank behind Hanzi Freinacht and political metamodernism, exploring metamodern sociology and developmental stage theory.',
    location: 'Sweden',
    language: 'English',
    stage: 'Established',
    website: 'https://metamoderna.org',
    x: -320,
    y: 540,
    featured: true,
    continent: 'Metacrisis Research',
    otherArchipelagos: ['Metamodern Education'],
    categorizedFields: {
      'Overview': {
        'Org ID': 'ORG-META-01',
        'Entity Type': 'Organization',
        'Island/Cluster': 'Metacrisis Research',
        'Other Archipelagos': 'Metamodern Education',
        'Approach': 'Metamodern Sociology & Developmental Stage Theory'
      }
    },
    extraFields: {
      'Other Archipelagos': 'Metamodern Education'
    }
  },
  {
    id: 'cu-meta-02',
    name: 'Metamodern Education Institute',
    type: 'Organization',
    category: 'Cultural',
    fields: ['Developmental Education', 'Bildung', 'Transformative Pedagogy'],
    description: 'Pioneering transformative metamodern education frameworks and educational ecosystems for the 21st century metamodern transition.',
    location: 'Sweden / Global',
    language: 'English',
    stage: 'Established',
    website: 'https://metamoderna.org',
    x: -420,
    y: 620,
    featured: false,
    continent: 'Metamodern Education',
    otherArchipelagos: ['Metacrisis Research'],
    categorizedFields: {
      'Overview': {
        'Island/Cluster': 'Metamodern Education',
        'Other Archipelagos': 'Metacrisis Research'
      }
    }
  },
  {
    id: 'cu-005',
    name: 'Bayo Akomolafe',
    type: 'Person',
    category: 'Cultural',
    continent: '14. Decolonial Imaginal Archipelago',
    otherArchipelagos: ['1. Sanctuary of Somatics & Healing', '13. Archipelago of Living Mythos & Narrative'],
    secondaryCategories: ['Social'],
    isDomainElevation: true,
    fields: ['Post-Humanism', 'The Emergence Network', 'Decolonial Imagination'],
    description: 'Philosopher and mythopoet bridging post-activism, psychological unmaking, and collective social transformation ("Times are urgent, let us slow down").',
    location: 'India / Nigeria',
    language: 'English',
    stage: 'Established',
    website: 'https://bayoakomolafe.net',
    x: -125,
    y: 125,
    featured: true,
    extraFields: { 'Elevation Axis': 'Social ∩ Cultural Spine (Diagonal)' }
  },
  {
    id: 'cu-006',
    name: 'Robin Wall Kimmerer',
    type: 'Person',
    category: 'Cultural',
    secondaryCategories: ['Systems'],
    isDomainElevation: true,
    fields: ['Indigenous Knowledge', 'Braiding Sweetgrass', 'Plant Kinship'],
    description: 'Botanist and indigenous scholar weaving scientific ecology, systems dynamics, and ancient honorable harvest wisdom.',
    location: 'United States',
    language: 'English',
    stage: 'Classic',
    x: -65,
    y: 145,
    featured: true,
    extraFields: { 'Elevation Axis': 'Cultural ∩ Systems Saddle (South)' }
  },
  {
    id: 'cu-007',
    name: 'Tyson Yunkaporta',
    type: 'Person',
    category: 'Cultural',
    fields: ['Sand Talk', 'Indigenous Thinking', 'Pattern Thinking'],
    description: 'Aboriginal scholar and author examining global systems through Indigenous pattern thinking and complexity.',
    location: 'Australia',
    language: 'English',
    stage: 'Established',
    x: -220,
    y: 480
  },
  {
    id: 'cu-008',
    name: 'Bioneers',
    type: 'Organization',
    category: 'Cultural',
    fields: ['Restorative Culture', 'Biophilia', 'Cultural Transformation'],
    approach: ['Indigenous Knowledge Weaving', 'Ecosystem Storytelling'],
    issues: ['Ecological Loss', 'Cultural Fragmentation', 'Environmental Injustice'],
    activities: ['Annual Conference', 'Media Production', 'Youth Leadership Program'],
    description: 'Innovative non-profit connecting breakthrough solutions and leaders for environmental and social healing.',
    location: 'United States',
    language: 'English',
    stage: 'Classic',
    website: 'https://bioneers.org',
    x: -720,
    y: 680
  },

  // Additional Cultural entities...
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `cu-${100 + i}`,
    name: [
      'The Emergence Network', 'Earth Charter International', 'Mythic Imagination Institute', 'Animas Valley Institute',
      'Resurgence & Ecologist', 'Cultural Animism Forum', 'Bio-Regional Arts Collective', 'Storytellers for Transition',
      'Indigenous Kinship Network', 'Ecology of Language Guild', 'Decolonial Futures Lab', 'Wild Mythos Project',
      'Ritual & Re-enchantment', 'Art of Hosting Movement', 'Ecological Humanities Alliance', 'Post-Capitalist Poetic Front',
      'Feral Arts Network', 'Earthy Wisdom Circle', 'Living Archive of Story', 'Cosmovision Institute',
      'Creative Climate Leadership', 'Deep Time Walk Association', 'Ancestral Wisdom Collective', 'Mythopoetic Guild',
      'Inter-Species Story Lab', 'Regenerative Culture Forum', 'Ecological Theater Union', 'Sacred Geometry Society',
      'Deep Listening Cultural Arc', 'Symbolic Renewal Institute', 'Ecosystem Mythmakers', 'Traditional Knowledge Keepers',
      'Post-Humanist Arts Front', 'Cultural Memory Commons', 'Radical Kinship Circle'
    ][i] || `Cultural Node ${i}`,
    type: (i % 2 === 0 ? 'Person' : 'Organization') as EntityType,
    category: 'Cultural' as const,
    dataCompleteness: (['Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'] as const)[(i + 2) % 5],
    dataQuality: (['Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'] as const)[(i + 2) % 5],
    ourRelationship: ([
      '1) Core collaborator / partner',
      '2) Regular collaborator',
      '3) Intending to collaborate with / occasionally collaborating with',
      '4) Advisory / Ally',
      '5) Exploring relationship',
      '6. Following Closely',
      '7: Following',
      '8: In conversation',
      '9: Aware of',
      '10: Unaware of',
      '11. Crowdsourced'
    ] as const)[(i + 2) % 11],
    fields: [
      ['Warm Data', 'Transcontextual Thinking'],
      ['Ecological Storytelling', 'Myth & Culture'],
      ['Indigenous Knowledge', 'Plant Kinship'],
      ['Uncivilised Writing', 'Ecological Narrative'],
      ['De-colonial Narrative', 'Ancestral Intelligence']
    ][i % 5],
    description: 'Weaving new myths, artistic expressions, ecological worldviews, and transcontextual understandings of living culture.',
    location: ['Global', 'Australia', 'United Kingdom', 'Mexico', 'Kenya', 'United States', 'Norway'][i % 7],
    language: 'English',
    stage: ['Emerging', 'Established', 'Movement'][i % 3],
    x: -860 + ((i * 43) % 760),
    y: 120 + ((i * 49) % 760),
    extraFields: { 'Publications': `${(i + 1) * 3} volumes` }
  })),

  // ==========================================
  // SYSTEMS QUADRANT (Bottom Right: +x, +y)
  // ==========================================
  {
    id: 'sy-001',
    name: 'Stockholm Resilience Centre',
    type: 'Organization',
    category: 'Systems',
    fields: ['Planetary Boundaries', 'Social-Ecological Systems', 'Complexity Science'],
    description: 'International research center on resilience and sustainability science, creator of the Planetary Boundaries framework.',
    location: 'Sweden',
    language: 'English',
    biome: 'Boreal Forests / Taiga',
    stage: 'Established',
    website: 'https://stockholmresilience.org',
    x: 480,
    y: 380,
    featured: true,
    extraFields: { 'Key Framework': 'Planetary Boundaries', 'Affiliation': 'Stockholm University' }
  },
  {
    id: 'sy-002',
    name: 'Doughnut Economics Action Lab (DEAL)',
    type: 'Organization',
    category: 'Systems',
    continent: '16. Expanse of Doughnut & Post-Growth Economics',
    otherArchipelagos: ['6. Commonwealth of the Commons', '18. Nexus of Complexity & Systems Dynamics'],
    secondaryCategories: ['Cultural'],
    isDomainElevation: true,
    fields: ['Doughnut Economics', 'Post-Capitalist Finance', 'Regenerative Economy'],
    description: 'Co-founded by Kate Raworth to turn Doughnut Economics concepts into transformative action across cities and regions, directly linking ecological planetary limits with cultural metrics and social foundations.',
    location: 'United Kingdom / Global',
    language: 'English',
    biome: 'Temperate Broadleaf & Mixed Forests',
    stage: 'Movement',
    website: 'https://doughnuteconomics.org',
    socialMedia: {
      twitter: 'https://x.com/DoughnutEcon',
      linkedin: 'https://www.linkedin.com/company/doughnut-economics-action-lab/',
      youtube: 'https://www.youtube.com/@doughnuteconomicsactionlab'
    },
    x: 65,
    y: 145,
    featured: true,
    categorizedFields: {
      'Worldview & Change Orientation': {
        'Transformation Focus (I-V) - inner, social, cultural, systems': 'IV. Systems Change',
        'Situational Assessment': 'Extractive growth paradigms degrade planetary ecological boundaries while driving social inequality.',
        'Value Meme / Ethical Orientation': 'Yellow / Integrative',
        'Orientation to Change (Three Horizons)': 'H3: Regenerative and distributive economic systems',
        'Orientation to Change (GTDF)': 'Post-Growth Transition',
        'Orientation to Change (CRI)': 'Radical Reform'
      },
      'Warm Data': {
        'Matching Database': 'Doughnut Economics Action Lab'
      }
    },
    extraFields: { 'Key Author': 'Kate Raworth', 'Community Members': '15k+', 'Elevation Axis': 'Cultural ∩ Systems Saddle (South)' }
  },
  {
    id: 'sy-003',
    name: 'Kate Raworth',
    type: 'Person',
    category: 'Systems',
    fields: ['Doughnut Economics', 'Post-Growth Economics', 'Systems Dynamics'],
    description: 'Renowned economist, author of Doughnut Economics: Seven Ways to Think Like a 21st-Century Economist.',
    location: 'United Kingdom',
    language: 'English',
    stage: 'Established',
    website: 'https://kateraworth.com',
    socialMedia: {
      twitter: 'https://x.com/KateRaworth'
    },
    x: 620,
    y: 180,
    featured: true
  },
  {
    id: 'sy-004',
    name: 'Santa Fe Institute',
    type: 'Organization',
    category: 'Systems',
    fields: ['Complexity Science', 'Complex Adaptive Systems', 'Network Theory'],
    description: 'Multi-disciplinary research institute dedicated to the fundamental science of complex adaptive systems.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://santafe.edu',
    socialMedia: {
      twitter: 'https://sfiscience',
      youtube: 'https://www.youtube.com/@sfiscience',
      linkedin: 'https://www.linkedin.com/school/santa-fe-institute/'
    },
    x: 280,
    y: 650,
    featured: true
  },
  {
    id: 'sy-005',
    name: 'Otto Scharmer / Presencing Institute',
    type: 'Person',
    category: 'Systems',
    continent: '18. Nexus of Complexity & Systems Dynamics',
    otherArchipelagos: ['2. Isles of Contemplative Wisdom', '7. Federation of Civic Action'],
    secondaryCategories: ['Inner', 'Social', 'Cultural'],
    isDomainElevation: true,
    fields: ['Theory U', 'Systems Leadership', 'Presencing'],
    description: 'Senior Lecturer at MIT and co-founder of the Presencing Institute, pioneering Theory U to illuminate how the interior condition of leaders impacts systemic transformation and collective social structures.',
    location: 'United States / Germany',
    language: 'English, German',
    stage: 'Established',
    website: 'https://presencing.org',
    socialMedia: {
      twitter: 'https://x.com/ottoscharmer1',
      linkedin: 'https://www.linkedin.com/company/presencing-institute/',
      youtube: 'https://www.youtube.com/@PresencingInstitute'
    },
    x: 110,
    y: 110,
    featured: true,
    extraFields: { 'Elevation Axis': 'Transdisciplinary Apex (All 4 Quadrants)' }
  },
  {
    id: 'sy-006',
    name: 'Biomimicry Institute',
    type: 'Organization',
    category: 'Systems',
    fields: ['Biomimicry', 'Nature-Inspired Design', 'Regenerative Architecture'],
    description: 'Co-founded by Janine Benyus to empower people to create nature-inspired solutions for a healthy planet.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://biomimicry.org',
    x: 780,
    y: 520,
    featured: true
  },
  {
    id: 'sy-007',
    name: 'Club of Rome',
    type: 'Organization',
    category: 'Systems',
    fields: ['Limits to Growth', 'Earth4All', 'Global Systems Governance'],
    description: 'Global think tank of scientists and world leaders famous for the landmark 1972 report The Limits to Growth.',
    location: 'Switzerland / Global',
    language: 'English',
    stage: 'Classic',
    website: 'https://clubofrome.org',
    x: 520,
    y: 780,
    featured: true
  },
  {
    id: 'sy-008',
    name: 'Donella Meadows Project',
    type: 'Organization',
    category: 'Systems',
    secondaryCategories: ['Inner'],
    isDomainElevation: true,
    fields: ['Systems Thinking', 'Leverage Points', 'Systems Dynamics'],
    approach: ['Systems Dynamics Modeling', 'Leverage Points Analysis'],
    issues: ['Ecological Overshoot', 'Linear Thinking', 'Paradigm Rigidity'],
    activities: ['Systems Leadership Training', 'Archives & Publishing', 'Curriculum Dissemination'],
    description: 'Foundational organization on systems thinking, feedback loops, and 12 leverage points to intervene in a system, culminating in the highest leverage point: shifting the inner mindset and consciousness out of which the system arises.',
    location: 'Global',
    language: 'English',
    stage: 'Classic',
    website: 'https://donellameadows.org',
    x: 125,
    y: 125,
    featured: true,
    extraFields: { 'Elevation Axis': 'Inner ∩ Systems Spine (Diagonal)' }
  },
  {
    id: 'sy-009',
    name: 'Roman Krznaric',
    type: 'Person',
    category: 'Systems',
    fields: ['The Good Ancestor', 'Long-termism', 'Systems Culture'],
    approach: ['Long-termism Philosophy', 'Public Cultural History'],
    issues: ['Short-termism', 'Intergenerational Injustice', 'Ecological Amnesia'],
    activities: ['Public Philosophy', 'Authoring Books', 'Keynote Lectures'],
    description: 'Public philosopher and author of The Good Ancestor exploring how long-term thinking can save the future.',
    location: 'United Kingdom',
    language: 'English',
    stage: 'Established',
    x: 820,
    y: 340
  },

  // Additional Systems entities...
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `sy-${100 + i}`,
    name: [
      'Post Growth Institute', 'Systemic Design Association', 'Ellen MacArthur Foundation', 'Capital Institute',
      'Center for Earth System Governance', 'Systems Change Alliance', 'Global Commons Alliance', 'Regenerative Economy Lab',
      'Bioregional Learning Centre', 'New Economics Foundation', 'System Dynamics Society', 'Club of Budapest',
      'Institute for Climate Economics', 'Post-Capitalist Law Guild', 'Earth System Science Alliance', 'Complexity Economics Network',
      'Commons Governance Lab', 'Bio-Economy Transition Hub', 'Systemic Innovation Network', 'Global Footprint Network',
      'Systemic Leadership Institute', 'Resilience Alliance', 'Circular Economy Network', 'Regenerative Finance Lab',
      'Bioregional Regeneration Guild', 'Systemic Policy Forum', 'Ecological Economics Society', 'Systemic Risk Lab',
      'Earth4All Systems Team', 'Long-Term Future Alliance', 'Complexity Science Hub', 'Systems Mapping Collective',
      'Post-Growth Governance Group', 'Earth System Policy Center', 'Bioresearch Systems Alliance'
    ][i] || `Systems Node ${i}`,
    type: (i % 2 === 0 ? 'Organization' : 'Person') as EntityType,
    category: 'Systems' as const,
    dataCompleteness: (['Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'] as const)[(i + 3) % 5],
    dataQuality: (['Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'] as const)[(i + 3) % 5],
    ourRelationship: ([
      '1) Core collaborator / partner',
      '2) Regular collaborator',
      '3) Intending to collaborate with / occasionally collaborating with',
      '4) Advisory / Ally',
      '5) Exploring relationship',
      '6. Following Closely',
      '7: Following',
      '8: In conversation',
      '9: Aware of',
      '10: Unaware of',
      '11. Crowdsourced'
    ] as const)[(i + 3) % 11],
    fields: [
      ['Doughnut Economics', 'Regenerative Economy'],
      ['Planetary Boundaries', 'Complexity Science'],
      ['Systems Thinking', 'Leverage Points'],
      ['Post-Growth Economics', 'Biomimicry'],
      ['Limits to Growth', 'Long-termism']
    ][i % 5],
    description: 'Focusing on macroeconomic redesign, earth system boundaries, leverage points, circularity, and systemic governance.',
    location: ['Global', 'Sweden', 'United Kingdom', 'Switzerland', 'United States', 'Netherlands', 'Germany'][i % 7],
    language: 'English',
    stage: ['Emerging', 'Established', 'Movement'][i % 3],
    x: 120 + ((i * 43) % 760),
    y: 120 + ((i * 51) % 760),
    extraFields: { 'Research Papers': (i + 1) * 12 }
  })),

  // ==========================================
  // SAMPLE MEDIA ENTITIES (Future Layer: Square with round borders)
  // Currently hidden from map by default via setting
  // ==========================================
  {
    id: 'med-001',
    name: 'Emergence Magazine Journal & Podcasts',
    type: 'Media',
    category: 'Cultural',
    fields: ['Storytelling', 'Indigenous Wisdom', 'Deep Ecology'],
    description: 'An award-winning publication and podcast exploring the threads connecting ecology, culture, and spirituality.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://emergencymagazine.org',
    dataCompleteness: 'Top 10%',
    dataQuality: 'Top 10%',
    ourRelationship: '6. Following Closely',
    x: -380,
    y: 420
  },
  {
    id: 'med-002',
    name: 'The Great Simplification Podcast',
    type: 'Media',
    category: 'Systems',
    fields: ['Energy Systems', 'Macro-Economics', 'Planetary Boundaries'],
    description: 'Exploring human behavior, energy, economy, and the environment with systemic researchers worldwide.',
    location: 'United States',
    language: 'English',
    stage: 'Established',
    website: 'https://thegreatsimplification.com',
    dataCompleteness: 'Top 25%',
    dataQuality: 'Top 25%',
    ourRelationship: '9: Aware of',
    x: 450,
    y: 380
  },
  {
    id: 'med-003',
    name: 'Regenerative Media Commons',
    type: 'Media',
    category: 'Cultural',
    fields: ['Open Media', 'Regeneration', 'Grassroots Journalism'],
    description: 'Crowdsourced community directory of grassroots podcasts, essays, and media productions in service of living systems.',
    location: 'Global',
    language: 'English',
    stage: 'Emerging',
    dataCompleteness: 'Bottom 25%',
    dataQuality: 'Bottom 25%',
    ourRelationship: '11. Crowdsourced',
    x: -180,
    y: 620
  }
];
