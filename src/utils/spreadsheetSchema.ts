export interface ColumnDef {
  letter: string;
  index: number; // 1-based (A = 1)
  field: string;
  category: string;
  aliases: string[];
}

export const SPREADSHEET_COLUMNS: ColumnDef[] = [
  // ==========================================
  // Category: Overview (A - X, cols 1 - 24)
  // ==========================================
  { letter: 'A', index: 1, field: 'Org ID', category: 'Overview', aliases: ['org id', 'orgid', 'organization id', 'entity id', 'record id'] },
  { letter: 'B', index: 2, field: 'Name/Label', category: 'Overview', aliases: ['name/label', 'entity name', 'organization name'] },
  { letter: 'C', index: 3, field: 'Entity Type', category: 'Overview', aliases: ['entity type', 'organization type'] },
  { letter: 'D', index: 4, field: 'Organization Structure', category: 'Overview', aliases: ['organization structure', 'org structure', 'legal structure', 'governance model'] },
  { letter: 'E', index: 5, field: 'Quadrant', category: 'Overview', aliases: ['quadrant', 'quadrants', 'quadrant / domain', 'map placement'] },
  { letter: 'F', index: 6, field: 'Category', category: 'Overview', aliases: ['category', 'categories', 'experimental category'] },
  { letter: 'G', index: 7, field: 'Stream', category: 'Overview', aliases: ['stream', 'streams', 'workstream', 'workstreams', 'thematic stream', 'focus stream', 'stream(s)', 'stream / streams'] },
  { letter: 'H', index: 8, field: 'Archipelago', category: 'Overview', aliases: ['archipelago', 'archipelagos', 'island/cluster', 'island / cluster', 'cluster', 'continent', 'continents', 'biome', 'archipelagos / islands', 'islands'] },
  { letter: 'I', index: 9, field: 'Layer of Response (Holistic Cultural Materialism)', category: 'Overview', aliases: ['layer of response (holistic cultural materialism)', 'holistic cultural materialism', 'cultural materialism', 'hcm layer'] },
  { letter: 'J', index: 10, field: 'Layer of Response (Gaia Education)', category: 'Overview', aliases: ['layer of response (gaia education)', 'gaia education', 'gaia layer'] },
  { letter: 'K', index: 11, field: 'Area of Response (Life Itself)', category: 'Overview', aliases: ['area of response (life itself)', 'life itself area of response', 'life itself area'] },
  { letter: 'L', index: 12, field: 'Societal Sector', category: 'Overview', aliases: ['societal sector'] },
  { letter: 'M', index: 13, field: 'Societal Sector (Catalist)', category: 'Overview', aliases: ['societal sector (catalist)', 'catalist sector'] },
  { letter: 'N', index: 14, field: 'Societal Category (Catalist)', category: 'Overview', aliases: ['societal category (catalist)', 'catalist category'] },
  { letter: 'O', index: 15, field: 'Approach', category: 'Overview', aliases: ['approach', 'methodology', 'approaches'] },
  { letter: 'P', index: 16, field: 'Issues', category: 'Overview', aliases: ['issues', 'challenges', 'focus issues'] },
  { letter: 'Q', index: 17, field: 'Activities', category: 'Overview', aliases: ['activities', 'programs', 'initiatives'] },
  { letter: 'R', index: 18, field: 'Keywords/Topics', category: 'Overview', aliases: ['keywords/topics', 'keywords', 'topics', 'subfields'] },
  { letter: 'S', index: 19, field: 'Who They Serve', category: 'Overview', aliases: ['who they serve', 'target audience', 'beneficiaries', 'served', 'constituents'] },
  { letter: 'T', index: 20, field: 'Community Served (Conscious Change Collective)', category: 'Overview', aliases: ['community served (conscious change collective)', 'community served (ccc)', 'community served', 'conscious change collective', 'ccc community'] },
  { letter: 'U', index: 21, field: 'Our Relationship', category: 'Overview', aliases: ['our relationship', 'partnership status'] },
  { letter: 'V', index: 22, field: 'Featured?', category: 'Overview', aliases: ['featured?', 'is featured', 'highlighted'] },
  { letter: 'W', index: 23, field: 'Filled Fields', category: 'Overview', aliases: ['filled fields', 'filledfields', 'fields filled', 'count of filled fields'] },
  {
    letter: 'X',
    index: 24,
    field: 'Data Completeness',
    category: 'Overview',
    aliases: [
      'data completeness',
      'datacompleteness',
      'completeness percentile',
      'percentile',
      'completeness',
      'completeness tier',
      'data completeness tier',
      'completeness level',
      'data quality',
      'data completeness score',
      'completeness %',
      'completeness (%)',
      'percentile rank',
      'x',
      '[x] data completeness',
      'data completeness [x]',
      'column x',
      'col x',
      'col 24',
      'column 24',
      '__col_24'
    ]
  },

  // ==========================================
  // Category: Logistic Info (Y - AR, cols 25 - 44)
  // ==========================================
  { letter: 'Y', index: 25, field: 'Description', category: 'Logistic Info', aliases: ['description', 'summary', 'about', 'bio', 'mission'] },
  { letter: 'Z', index: 26, field: 'Website URL', category: 'Logistic Info', aliases: ['website url', 'website', 'homepage'] },
  { letter: 'AA', index: 27, field: 'Social Profiles', category: 'Logistic Info', aliases: ['social profiles', 'social media', 'socials', 'social links'] },
  { letter: 'AB', index: 28, field: 'Favicon', category: 'Logistic Info', aliases: ['favicon', 'favicon url', 'site icon'] },
  { letter: 'AC', index: 29, field: 'Logo', category: 'Logistic Info', aliases: ['logo', 'logo url', 'icon url', 'avatar', 'avatar url', 'brand logo'] },
  { letter: 'AD', index: 30, field: 'Language(s)', category: 'Logistic Info', aliases: ['language(s)', 'languages'] },
  { letter: 'AE', index: 31, field: 'Biome', category: 'Logistic Info', aliases: ['biome', 'biomes', 'bioregion', 'ecoregion', 'watershed'] },
  { letter: 'AF', index: 32, field: 'Neighborhood or Demarcated Zone', category: 'Logistic Info', aliases: ['neighborhood or demarcated zone', 'neighborhood', 'demarcated zone'] },
  { letter: 'AG', index: 33, field: 'City/State', category: 'Logistic Info', aliases: ['city/state', 'city, state', 'city state'] },
  { letter: 'AH', index: 34, field: 'City', category: 'Logistic Info', aliases: ['city', 'municipality', 'town'] },
  { letter: 'AI', index: 35, field: 'State', category: 'Logistic Info', aliases: ['state', 'province', 'canton', 'department'] },
  { letter: 'AJ', index: 36, field: 'Country', category: 'Logistic Info', aliases: ['country', 'nation'] },
  { letter: 'AK', index: 37, field: 'Operating Region', category: 'Logistic Info', aliases: ['operating region', 'geographic scope'] },
  { letter: 'AL', index: 38, field: 'Operation Focus', category: 'Logistic Info', aliases: ['operation focus', 'operational focus', 'scale of operation'] },
  { letter: 'AM', index: 39, field: 'Year Founded', category: 'Logistic Info', aliases: ['year founded', 'founded year', 'year of foundation'] },
  { letter: 'AN', index: 40, field: 'Maturity Level', category: 'Logistic Info', aliases: ['maturity level', 'maturity'] },
  { letter: 'AO', index: 41, field: 'Size', category: 'Logistic Info', aliases: ['size', 'team size', 'headcount', 'organization size'] },
  { letter: 'AP', index: 42, field: 'Social Media Reach', category: 'Logistic Info', aliases: ['social media reach', 'social reach'] },
  { letter: 'AQ', index: 43, field: 'Impact Reach', category: 'Logistic Info', aliases: ['impact reach', 'reach scale', 'audience size'] },
  { letter: 'AR', index: 44, field: 'Influence', category: 'Logistic Info', aliases: ['influence', 'influence level'] },

  // ==========================================
  // Category: Relationships (AS - AY, cols 45 - 51)
  // ==========================================
  { letter: 'AS', index: 45, field: 'Founder(s)/Main Source(s)', category: 'Relationships', aliases: ['founder(s)/main source(s)', 'founders/main sources', 'founder/main source', 'founder(s)', 'founders', 'founder(s) / main source(s)'] },
  { letter: 'AT', index: 46, field: 'Partners (Institutions)', category: 'Relationships', aliases: ['partners (institutions)', 'partner institutions', 'partner (institutions)', 'partners institutions'] },
  { letter: 'AU', index: 47, field: 'Funders/Supporters (Institutions)', category: 'Relationships', aliases: ['funders/supporters (institutions)', 'funder/supporter (institutions)', 'funders/supporters', 'funders (institutions)', 'supporters (institutions)', 'funders / supporters (institutions)'] },
  { letter: 'AV', index: 48, field: 'Teachers/Influences (People)', category: 'Relationships', aliases: ['teachers/influences (people)', 'teachers/influences', 'teacher/influence (people)', 'teachers (people)', 'influences (people)', 'teachers / influences (people)', 'teachers / influences'] },
  { letter: 'AW', index: 49, field: 'Ethnic/Spiritual Lineage(s)', category: 'Relationships', aliases: ['ethnic/spiritual lineage(s)', 'ethnic/spiritual lineages', 'ethnic / spiritual lineage(s)', 'ethnic lineage', 'spiritual lineage'] },
  { letter: 'AX', index: 50, field: 'Intellectual Lineage (IAM)', category: 'Relationships', aliases: ['intellectual lineage (iam)', 'intellectual lineage iam', 'intellectual lineage', 'iam lineage'] },
  { letter: 'AY', index: 51, field: 'Partners/Collaborators (People)', category: 'Relationships', aliases: ['partners/collaborators (people)', 'partner/collaborator (people)', 'partners/collaborators', 'partners / collaborators (people)', 'partners / collaborators', 'partners (people)', 'collaborators (people)'] },

  // ==========================================
  // Category: Worldview & Change Orientation (AZ - BX, cols 52 - 76)
  // ==========================================
  { letter: 'AZ', index: 52, field: 'Transformation Focus (I-V) - Inner, Social, Cultural, Systems', category: 'Worldview & Change Orientation', aliases: ['transformation focus (i-v) - inner, social, cultural, systems', 'transformation focus (i-v)', 'transformation focus'] },
  { letter: 'BA', index: 53, field: 'Situational Assessment', category: 'Worldview & Change Orientation', aliases: ['situational assessment'] },
  { letter: 'BB', index: 54, field: 'Situational Assessment Comments/Description', category: 'Worldview & Change Orientation', aliases: ['situational assessment comments/description', 'situational assessment comments', 'situational assessment description', 'comments/description', 'comments / description'] },
  { letter: 'BC', index: 55, field: 'Response Orientation', category: 'Worldview & Change Orientation', aliases: ['response orientation'] },
  { letter: 'BD', index: 56, field: 'Alternative(s) Proposed (GTA)', category: 'Worldview & Change Orientation', aliases: ['alternative(s) proposed (gta)', 'alternatives proposed (gta)', 'alternatives (gta)', 'gta alternative(s)', 'gta alternatives'] },
  { letter: 'BE', index: 57, field: 'Alternative(s) Proposed (Pluriverse dictionary)', category: 'Worldview & Change Orientation', aliases: ['alternative(s) proposed (pluriverse dictionary)', 'alternatives proposed (pluriverse dictionary)', 'alternative(s) proposed (pluriverse)', 'alternatives proposed (pluriverse)', 'pluriverse alternative(s)', 'pluriverse dictionary alternatives', 'pluriverse alternatives', 'pluriverse dictionary'] },
  { letter: 'BF', index: 58, field: 'Alternative(s) Proposed (Mútua)', category: 'Worldview & Change Orientation', aliases: ['alternative(s) proposed (mútua)', 'alternative(s) proposed (mutua)', 'alternatives proposed (mútua)', 'alternatives proposed (mutua)', 'mútua alternative(s)', 'mutua alternatives'] },
  { letter: 'BG', index: 59, field: 'Alternative(s) Proposed', category: 'Worldview & Change Orientation', aliases: ['alternative(s) proposed', 'alternatives proposed', 'proposed alternatives'] },
  { letter: 'BH', index: 60, field: 'Value Meme / Ethical Orientation', category: 'Worldview & Change Orientation', aliases: ['value meme / ethical orientation', 'value meme/ethical orientation', 'value meme', 'ethical orientation'] },
  { letter: 'BI', index: 61, field: 'Theory of Change (GTDF)', category: 'Worldview & Change Orientation', aliases: ['theory of change (gtdf)', 'theories of change (gtdf)', 'theory of change gtdf', 'theories of change gtdf', 'toc (gtdf)', 'gtdf theory of change', 'gtdf toc'] },
  { letter: 'BJ', index: 62, field: 'Theory of Change (IAM)', category: 'Worldview & Change Orientation', aliases: ['theory of change (iam)', 'theories of change (iam)', 'theory of change iam', 'theories of change iam', 'toc (iam)', 'iam theory of change', 'iam toc'] },
  { letter: 'BK', index: 63, field: 'Crisis of Response', category: 'Worldview & Change Orientation', aliases: ['crisis of response'] },
  { letter: 'BL', index: 64, field: 'Paradigmatic? (Life Itself)', category: 'Worldview & Change Orientation', aliases: ['paradigmatic? (life itself)', 'paradigmatic (life itself)', 'life itself paradigmatic'] },
  { letter: 'BM', index: 65, field: 'Integrative? (Life Itself)', category: 'Worldview & Change Orientation', aliases: ['integrative? (life itself)', 'integrative (life itself)', 'life itself integrative'] },
  { letter: 'BN', index: 66, field: 'Pragmatic? (Life Itself)', category: 'Worldview & Change Orientation', aliases: ['pragmatic? (life itself)', 'pragmatic (life itself)', 'life itself pragmatic'] },
  { letter: 'BO', index: 67, field: 'Orientation to Change (Three Horizons)', category: 'Worldview & Change Orientation', aliases: ['orientation to change (three horizons)', 'orientation to change three horizons', 'three horizons orientation', 'three horizons'] },
  { letter: 'BP', index: 68, field: 'Orientation to Change (GTDF)', category: 'Worldview & Change Orientation', aliases: ['orientation to change (gtdf)', 'orientation to change gtdf', 'gtdf orientation to change', 'gtdf orientation'] },
  { letter: 'BQ', index: 69, field: 'Orientation to Change (CRI)', category: 'Worldview & Change Orientation', aliases: ['orientation to change (cri)', 'orientation to change cri', 'cri orientation to change', 'cri orientation'] },
  { letter: 'BR', index: 70, field: 'SDGs/Social Issues (Conscious Change Collective)', category: 'Worldview & Change Orientation', aliases: ['sdgs/social issues (conscious change collective)', 'sdgs / social issues (conscious change collective)', 'sdgs/social issues (ccc)', 'sdgs/social issues', 'sdgs / social issues', 'ccc sdgs/social issues', 'sdgs'] },
  { letter: 'BS', index: 71, field: 'Relevant Resources', category: 'Worldview & Change Orientation', aliases: ['relevant resources', 'relevant resource'] },
  { letter: 'BT', index: 72, field: 'Featured Resources', category: 'Worldview & Change Orientation', aliases: ['featured resources', 'featured resource'] },
  { letter: 'BU', index: 73, field: 'IDGs/Inner Capacities', category: 'Worldview & Change Orientation', aliases: ['idgs/inner capacities', 'idgs / inner capacities', 'idg inner capacities', 'inner capacities', 'idg capacities'] },
  { letter: 'BV', index: 74, field: 'Inner Work Modalities (Conscious Change Collective)', category: 'Worldview & Change Orientation', aliases: ['inner work modalities (conscious change collective)', 'inner work modalities (ccc)', 'inner work modalities', 'inner work', 'ccc inner work modalities'] },
  { letter: 'BW', index: 75, field: 'Practices', category: 'Worldview & Change Orientation', aliases: ['practices'] },
  { letter: 'BX', index: 76, field: 'Offerings', category: 'Worldview & Change Orientation', aliases: ['offerings'] },

  // ==========================================
  // Category: Warm Data (BY - CB, cols 77 - 80)
  // ==========================================
  { letter: 'BY', index: 77, field: 'Point of Contact(s)', category: 'Warm Data', aliases: ['point of contact(s)', 'point of contacts', 'point of contact', 'contacts'] },
  { letter: 'BZ', index: 78, field: 'Email', category: 'Warm Data', aliases: ['email', 'contact email', 'email address', 'warm data email'] },
  { letter: 'CA', index: 79, field: 'Social Profile(s)', category: 'Warm Data', aliases: ['social profile(s)', 'social profiles(s)', 'social profile'] },
  { letter: 'CB', index: 80, field: 'Matching Database', category: 'Warm Data', aliases: ['matching database', 'corresponding database', 'external database', 'source database'] },

  // ==========================================
  // Category: Discourse Analysis / Argument Mapping (CC - CI, cols 81 - 87)
  // ==========================================
  { letter: 'CC', index: 81, field: 'Concepts', category: 'Discourse Analysis / Argument Mapping', aliases: ['concepts', 'concept', 'key concepts'] },
  { letter: 'CD', index: 82, field: 'Frameworks', category: 'Discourse Analysis / Argument Mapping', aliases: ['frameworks', 'framework', 'key frameworks'] },
  { letter: 'CE', index: 83, field: 'Definitions', category: 'Discourse Analysis / Argument Mapping', aliases: ['definitions', 'definition'] },
  { letter: 'CF', index: 84, field: 'Arguments/Claims', category: 'Discourse Analysis / Argument Mapping', aliases: ['arguments/claims', 'arguments / claims', 'arguments', 'claims', 'argument', 'claim'] },
  { letter: 'CG', index: 85, field: 'Evidence/Sources', category: 'Discourse Analysis / Argument Mapping', aliases: ['evidence/sources', 'evidence / sources', 'evidence', 'sources', 'empirical evidence'] },
  { letter: 'CH', index: 86, field: 'Hypotheses', category: 'Discourse Analysis / Argument Mapping', aliases: ['hypotheses', 'hypothesis'] },
  { letter: 'CI', index: 87, field: 'Analyst Commentary', category: 'Discourse Analysis / Argument Mapping', aliases: ['analyst commentary', 'analyst comments', 'analyst comment', 'analyst notes', 'analyst note', 'map curator notes', 'curator notes', 'curator note'] }
];

export const OBSOLETE_FABRICATED_FIELDS = [
  'Worldview / Paradigm / Lineage',
  'Worldview / Paradigm',
  'Worldview',
  'Theory of Change',
  'Approach to Technology',
  'Post-Capitalist Transitions',
  'Transcontextual Descriptions',
  'Relational Processes / Practices',
  'Paradoxes / Tensions Held',
  'Unintended Consequences / Shadow',
  'Living Systems Principles',
  'Framing / Narrative Position',
  'Key Claims / Arguments',
  'Critiques Offered / Received'
];

export const SPREADSHEET_CATEGORY_NAMES = [
  'Overview',
  'Logistic Info',
  'Relationships',
  'Worldview & Change Orientation',
  'Warm Data',
  'Discourse Analysis / Argument Mapping'
];

export const ANALYST_COMMENTARY_ALIASES = [
  'analyst commentary',
  'analyst comments',
  'analyst comment',
  'analyst notes',
  'analyst note',
  'map curator notes',
  'curator notes',
  'curator note',
  'curator commentary'
];

/**
 * Strips zero-width characters, BOM, newlines, and normalizes spaces
 */
export function cleanHeaderString(name: string): string {
  if (!name) return '';
  return name
    .replace(/^[\uFEFF\xA0]+|[\uFEFF\xA0]+$/g, '') // Strip BOM and non-breaking spaces
    .replace(/[\r\n\t]+/g, ' ')                   // Newlines and tabs to space
    .replace(/\s+/g, ' ')                         // Multiple spaces to single
    .trim();
}

/**
 * Strips column letter prefixes and suffixes from header strings:
 * - "Year Founded (AM)" -> "Year Founded"
 * - "[AM] Year Founded" -> "Year Founded"
 * - "AM - Year Founded" -> "Year Founded"
 * - "Year Founded - AM" -> "Year Founded"
 */
export function stripColLetter(header: string): string {
  let h = header.trim();
  h = h.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  // Suffix: "Year Founded (AM)" or "Year Founded [AM]" or "Year Founded - AM"
  h = h.replace(/\s*\([A-Za-z]{1,2}\)$/i, '');
  h = h.replace(/\s*\[[A-Za-z]{1,2}\]$/i, '');
  h = h.replace(/\s*-\s*[A-Za-z]{1,2}$/i, '');
  // Prefix: "AM - Year Founded", "AM. Year Founded", "AM: Year Founded", "[AM] Year Founded", "(AM) Year Founded"
  h = h.replace(/^[A-Za-z]{1,2}\s*[-.:_)\/]\s*/i, '');
  h = h.replace(/^\[[A-Za-z]{1,2}\]\s*/i, '');
  h = h.replace(/^\([A-Za-z]{1,2}\)\s*/i, '');
  return h.trim();
}

/**
 * Helper to match any column name to its canonical ColumnDef
 */
export function findColumnDef(columnName: string): ColumnDef | undefined {
  if (!columnName) return undefined;
  const cleaned = cleanHeaderString(columnName);
  if (!cleaned) return undefined;
  const clean = cleaned.toLowerCase();

  // 1. Direct match on canonical field name (exact, case-insensitive)
  const exact = SPREADSHEET_COLUMNS.find(c => c.field.toLowerCase() === clean);
  if (exact) return exact;

  // 2. Direct match on column letter (e.g. "a", "am", "ci") or positional ("col_39", "__col_39")
  const letterMatch = SPREADSHEET_COLUMNS.find(c =>
    c.letter.toLowerCase() === clean ||
    `${c.letter.toLowerCase()}2` === clean ||
    `col_${c.index}` === clean ||
    `__col_${c.index}` === clean
  );
  if (letterMatch) return letterMatch;

  // 3. Exact match on explicit semantic aliases
  const aliasExact = SPREADSHEET_COLUMNS.find(c => c.aliases.some(a => a.toLowerCase() === clean));
  if (aliasExact) return aliasExact;

  // 4. Try stripped column letter (e.g. "Year Founded (AM)" -> "Year Founded")
  const stripped = stripColLetter(cleaned);
  if (stripped && stripped.toLowerCase() !== clean) {
    const sLower = stripped.toLowerCase();
    const strippedExact = SPREADSHEET_COLUMNS.find(c => c.field.toLowerCase() === sLower);
    if (strippedExact) return strippedExact;

    const strippedAlias = SPREADSHEET_COLUMNS.find(c => c.aliases.some(a => a.toLowerCase() === sLower));
    if (strippedAlias) return strippedAlias;
  }

  // 5. Fallback for specific compound headers with punctuation/spacing variations
  if (clean.includes('transformation focus')) {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'AZ');
  }
  if (clean.includes('situational assessment') && (clean.includes('comment') || clean.includes('description'))) {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'BB');
  }
  if (clean.includes('situational assessment')) {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'BA');
  }
  if (clean.includes('analyst commentary') || clean.includes('analyst comments') || clean.includes('analyst comment') || clean.includes('curator notes')) {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'CI');
  }
  if (clean.includes('sdgs') || clean.includes('social issues')) {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'BR');
  }
  if (clean.includes('inner work modalities')) {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'BV');
  }
  if (clean.includes('idgs') || clean.includes('inner capacities')) {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'BU');
  }
  if (clean.includes('matching database') || clean.includes('corresponding database')) {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'CB');
  }
  if (clean.includes('completeness') || clean === 'x' || clean === 'col_24' || clean === '__col_24') {
    return SPREADSHEET_COLUMNS.find(c => c.letter === 'X');
  }

  return undefined;
}
