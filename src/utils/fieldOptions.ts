/**
 * Predefined options for submission-form fields, taken from the header-cell
 * comments of the source spreadsheet (row 2, columns BB–BL).
 *
 * Values are stored the same way the spreadsheet stores them: as a
 * comma-separated list of option names (numbering prefixes stripped).
 */

export interface FieldOption {
  value: string;
  /** Optional heading the option is listed under in the dropdown. */
  group?: string;
  /** Indents the option under its parent in the dropdown. */
  sub?: boolean;
}

const plain = (values: string[], group?: string): FieldOption[] =>
  values.map(value => ({ value, group }));

// BB2 — free entry allowed
export const SITUATIONAL_ASSESSMENT_OPTIONS: FieldOption[] = plain([
  'Polycrisis',
  'Metacrisis',
  'Anthropocene',
  'Systemic Collapse',
  'Capitalocene',
  'Chthulucene',
  'Permacrisis',
  'Climate Change',
  'Existential Risk'
]);

// BD2 — free entry allowed
export const CRISIS_OF_RESPONSE_OPTIONS: FieldOption[] = plain([
  'Climate',
  'Perception',
  'Power',
  'Sensemaking',
  'Meaning',
  'Spiritual',
  'Wisdom',
  'Value'
]);

// BE2 — free entry allowed
export const RESPONSE_ORIENTATION_OPTIONS: FieldOption[] = plain([
  'Metacrisis',
  'Wisdom-centered / inner-led transformation',
  'Regeneration',
  'Decolonial',
  'Systems change'
]);

// BF2 — fixed list (Dictionary of Radical Alternatives / GTA)
export const ALT_PROPOSED_GTA_OPTIONS: FieldOption[] = plain([
  'Autogestión', 'Autonomy', 'Bioregionalism', 'Buen Vivir', 'Comunalidad', 'Degrowth',
  'Democratic Confederalism', 'Eco-Territorial Internationalism', 'Energías Comunitarias',
  'Eti uwen', 'Eutopía', 'Harambee', 'Hiisi', 'Jineology', 'Kaitiakitanga', 'Kotahitanga',
  'Land Back', 'Masling', 'Minga', 'Nakba', 'Ogonize', 'Pakikibaka', 'Pluriverse',
  'Radical Ecological Democracy', 'Relationality', 'Salugpungan', 'Social Ecology',
  'Sociocracy', 'Susu', 'Swaraj', 'Ta Madok Maka', 'Tequio', 'Timuay', 'Total Liberation',
  'Ubuntu', 'Uhuru', 'Ujamaa', 'Vernacular Values', 'Zonas de Sacrificio'
]);

// BG2 — fixed list (Pluriverse: A Post-Development Dictionary)
export const ALT_PROPOSED_PLURIVERSE_OPTIONS: FieldOption[] = plain([
  'Agaciro', 'Agdals', 'Agroecology', 'Alter-Globalisation Movement', 'Alternative Currencies',
  'Arbitration for Sovereign Debt', 'Autonomy', 'Biocivilization', 'Body Politics',
  'Buddhism and Wisdom-based Compassion', 'Buen Vivir', 'Chinese Religions',
  'Christian Eco-Theology', 'Civilizational Transitions', 'Commons', 'Community Economies',
  'Comunalidad', 'Convivialism', 'Conviviality', 'Cooperative Ecosystems', 'Country',
  'Deep Ecology', 'Degrowth', 'Democratic Economy in Kurdistan', 'Direct Democracy',
  'Earth Spirituality', 'Eco-Anarchism', 'Ecofeminism', 'Ecology of Culture',
  'Eco-Positive Design', 'Eco-Socialism', 'Ecovillages', 'Energy Sovereignty',
  'Environmental Justice', 'Food Sovereignty', 'Free Software', 'Gift Economy',
  'Gross National Happiness', 'Hinduism and Social Transformation', 'Human Rights', 'Hurai',
  'Ibadism and Community', 'ICCAs', 'Islamic Ethics', 'Jain Ecology', 'Judaic Tikkun Olam',
  'Kametsa Asaike', 'Kawsak Sacha', 'Kyosei', 'Latin American and Caribbean Feminisms',
  'Liberation Theology', 'Life Projects', 'Mediterraneanism', 'Minobimaatisiiwin',
  'Nature Rights', 'Nayakrishi Andolan', 'Negentropic Production', 'New Matriarchies',
  'New Water Paradigm', 'Open Localization', 'Pacific Feminisms', 'Pacifism', 'Peacewomen',
  'Pedagogy', 'Permaculture', 'Popular Solidary Economy', 'Post-Economia', 'Prakritik Swaraj',
  'Queer Love', 'Radical Ecological Democracy', 'Revolution', 'Rural Reconstruction',
  'Sea Ontologies', 'Sentipensar', 'Slow Movement', 'Social Ecology',
  'Social Solidarity Economy', 'Tao Worldview', 'Transition Movement',
  'Tribunal on Rights of Nature', 'Ubuntu', 'Undeveloping the North', 'Wages for Housework',
  'Worker-Led Production', 'Zapatista Autonomy'
]);

// BJ2 — fixed list (hierarchical; names match how existing rows store them)
export const VALUE_MEME_OPTIONS: FieldOption[] = [
  { value: 'Animist Interdependence' },
  { value: 'Modern' },
  { value: 'Techno-optimist', sub: true },
  { value: 'Techno-accelerationist', sub: true },
  { value: 'Ethical Democratic Governance Reforms', sub: true },
  { value: 'Holistic' },
  { value: 'Degrowth/Post-growth', sub: true },
  { value: 'Holistic Well-Being', sub: true },
  { value: 'Pluralistic' },
  { value: 'Indigenous Autonomy', sub: true },
  { value: 'Anticapitalist/Antifascist/Antirracist Futures', sub: true },
  { value: 'Anticapitalist/Antifascist/Antirracist Climate Futures', sub: true },
  { value: 'Grassroots Power & Sufficiency Building', sub: true },
  { value: 'Decolonial/Countercolonial', sub: true },
  { value: 'Post-development', sub: true },
  { value: 'Regenerative' },
  { value: '(Eco)Systemic' },
  { value: 'Complex Systems Alignment', sub: true },
  { value: 'Systemic (Cybernetic) Alignment', sub: true },
  { value: 'Integrative' },
  { value: 'Hands-on Integrative', sub: true },
  { value: 'Wisdom' },
  { value: 'Integrative Wisdom', sub: true },
  { value: 'Spiritual Wisdom', sub: true },
  { value: 'Academic Wisdom', sub: true },
  { value: 'Ancestral Wisdom', sub: true }
];

// BK2 — fixed list (GTDF theories of change)
export const THEORY_OF_CHANGE_GTDF_OPTIONS: FieldOption[] = plain([
  'Barriers to Growth',
  'Poverty',
  'Injustices',
  'Un-sustainability',
  'Unenlightenment',
  'Dangerous delusions'
]);

// BL2 — fixed list (IAM)
export const THEORY_OF_CHANGE_IAM_OPTIONS: FieldOption[] = [
  ...plain([
    'Tribal/Animistic Life (Ecology/Indigenous Wisdom)',
    'Rational Optimistic Enlightenment',
    'Revolutionary Anti-Capitalism',
    'Radical Feminism',
    'Anarchism',
    'Social Justice',
    'Holistic Sustainable Living'
  ], 'Intellectual Lineage'),
  ...plain([
    'Wisdom',
    'Aesthetics',
    'Game Theory',
    'Consciousness',
    'Meta-Sensemaking (Evaluation of Information)',
    'Interdependency (Systems Theory)'
  ], 'Paradigmatic Lens')
];

// BS2 — SDGs / Social Issues (Conscious Change Collective). Note: several
// options contain commas; OptionsMultiSelect re-joins them when parsing.
export const SDGS_SOCIAL_ISSUES_OPTIONS: FieldOption[] = plain([
  'Poverty and Economic Justice',
  'Hunger and Food Security',
  'Health and Wellbeing',
  'Quality Education',
  'Gender Equality',
  'Clean Water and Sanitation',
  'Affordable and Clean Energy',
  'Decent Work and Economic Growth',
  'Sustainable & Resilient Industry, Innovation, and Infrastructure',
  'Reduced Inequalities and Discrimination',
  'Sustainable Cities and Communities',
  'Responsible Consumption and Production',
  'Climate Action and Environmental Justice',
  'Oceans and Life Below Water',
  'Land-based Ecosystems, Wildlife, Biodiversity, Forests, Land Conservation',
  'Peace, Justice, Non-Violence, and Strong Institutions, Democracy',
  'Human Rights and Social Equity',
  'Global Collaboration',
  'Criminal Justice Reform, Transformative Justice',
  'Housing',
  'Migration and Immigration',
  'Religious Freedom',
  'Other'
]);

// Inner Development Goals (5 dimensions, 25 skills)
export const IDGS_OPTIONS: FieldOption[] = [
  ...plain(['Inner Compass', 'Integrity and Authenticity', 'Openness and Learning Mindset', 'Self-Awareness', 'Presence'], 'Being'),
  ...plain(['Critical Thinking', 'Perspective Skills', 'Systems Thinking', 'Long-Term Orientation and Visioning', 'Creativity'], 'Thinking'),
  ...plain(['Appreciation', 'Connectedness', 'Humility', 'Empathy and Compassion', 'Forgiveness'], 'Relating'),
  ...plain(['Relationship-Building Skills', 'Inclusive Mindset and Intercultural Competence', 'Co-Creation Skills', 'Communication Skills', 'Mobilization Skills'], 'Collaborating'),
  ...plain(['Courage', 'Hope and Optimism', 'Conscious Use of Resources', 'Proactivity', 'Resilience'], 'Acting')
];

// AX2 — Intellectual Lineage (IAM); free entry allowed. Title-cased and
// de-duplicated from the comment's list.
export const INTELLECTUAL_LINEAGE_OPTIONS: FieldOption[] = plain([
  'Rational Optimistic Enlightenment', 'Holistic Sustainable Living', 'Eastern Spiritual Enlightenment',
  'Anarchism', 'Romanticism', 'Existentialism', 'Psychoanalysis', 'Postmodernism', 'Critical Theory',
  'Techno-Optimism', 'Game Theory', 'Transhuman Technology', 'Information Theory', 'Complexity Science',
  'Ecology', 'Genetics', 'Evolutionary Biology', 'Meta-Rationality', 'Transhumanism', 'Big History',
  'Eastern Spirituality', 'Western Esotericism', 'Phenomenology', 'Evolutionary Theory',
  'Communications Theory', 'Sociology', 'Cognitive Science', 'Evolutionary Psychology', 'Deep Ecology',
  'Taoism', 'Confucianism', 'Transpersonal Psychology', 'Neoplatonism', 'Social Science', 'Post-Marxism',
  'Anthropology', 'Systems Theory', 'Humanistic Psychology', 'Semiotics', 'Process Theory',
  'Political Theory', 'Developmental Psychology', 'Developmental Sociology', 'Pedagogy', 'Folk Bildung',
  'Abrahamic Religions', 'New Atheism', 'Interpersonal Relating', 'Decentralized Technology',
  'Neuroscience', 'Indigenous Knowledge', 'Sustainability Science', 'Eco-Futurism',
  'Imaginative Literature', 'Democratization', 'Network Theory', 'Buddhism', 'Neuro-Anthropology',
  'Feminism', 'Critical Race Theory', 'Critical Gender Theory'
]);
