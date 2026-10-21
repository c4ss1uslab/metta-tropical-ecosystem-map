import { CategoryQuadrant, ContinentInfo, EcosystemEntity, EcotoneCorridorInfo, FieldCluster } from '../types';

export const QUADRANT_CENTERS: Record<CategoryQuadrant, { x: number; y: number; label: string; color: string; darkColor: string }> = {
  Inner: { 
    x: -500, 
    y: -500, 
    label: 'INNER CHANGE (Mind & Self)', 
    color: '#5B21B6',
    darkColor: '#3B0764' // Deep Imperial Purple
  },
  Social: { 
    x: 500, 
    y: -500, 
    label: 'SOCIAL CHANGE (Commons & Civic)', 
    color: '#111827',
    darkColor: '#0F172A' // Deep Charcoal Obsidian
  },
  Cultural: { 
    x: -500, 
    y: 500, 
    label: 'CULTURAL CHANGE (Mythos & Ecology)', 
    color: '#7D8764',
    darkColor: '#14532D' // Deep Forest Emerald
  },
  Systems: { 
    x: 500, 
    y: 500, 
    label: 'SYSTEMS CHANGE (Ecosystems & Tech)', 
    color: '#0284C7',
    darkColor: '#075985' // Deep Ocean Cobalt
  }
};

export interface IntersectionZoneInfo {
  id: string;
  name: string;
  shortLabel: string;
  type: 'cardinal' | 'diagonal' | 'apex';
  axisType: 'cardinal' | 'diagonal' | 'omni';
  glyph: string;
  quadrants: CategoryQuadrant[];
  badgeColor: string;
  description: string;
  labelX: number;
  labelY: number;
}

export const INTERSECTION_ZONES: Record<string, IntersectionZoneInfo> = {
  'inner-systems': {
    id: 'inner-systems',
    name: 'Inner ⟷ Systems Ecotone (Intersections) (Diagonal Spine)',
    shortLabel: 'INNER ⟷ SYSTEMS',
    type: 'diagonal',
    axisType: 'diagonal',
    glyph: '🌿',
    quadrants: ['Inner', 'Systems'],
    badgeColor: '#4338CA',
    description: 'Intersection bridging inner consciousness capacities and structural systemic transformation.',
    labelX: -80,
    labelY: -80
  },
  'social-cultural': {
    id: 'social-cultural',
    name: 'Social ⟷ Cultural Ecotone (Intersections) (Diagonal Spine)',
    shortLabel: 'SOCIAL ⟷ CULTURAL',
    type: 'diagonal',
    axisType: 'diagonal',
    glyph: '🌱',
    quadrants: ['Social', 'Cultural'],
    badgeColor: '#4D7C0F',
    description: 'Intersection bridging participatory social commons and cultural narratives & decolonial worldviews.',
    labelX: 80,
    labelY: -80
  },
  'inner-social': {
    id: 'inner-social',
    name: 'Inner ∩ Social Intersection Corridor',
    shortLabel: 'INNER ∩ SOCIAL',
    type: 'cardinal',
    axisType: 'cardinal',
    glyph: '🌾',
    quadrants: ['Inner', 'Social'],
    badgeColor: '#6D28D9',
    description: 'Bridges somatic attunement and inner work with collective trauma integration and relational fields.',
    labelX: 0,
    labelY: -155
  },
  'social-systems': {
    id: 'social-systems',
    name: 'Social ∩ Systems Intersection Corridor',
    shortLabel: 'SOCIAL ∩ SYSTEMS',
    type: 'cardinal',
    axisType: 'cardinal',
    glyph: '🍃',
    quadrants: ['Social', 'Systems'],
    badgeColor: '#0E7490',
    description: 'Bridges civic community action and mutual aid with cooperative economic structures and public policy.',
    labelX: 155,
    labelY: 0
  },
  'cultural-systems': {
    id: 'cultural-systems',
    name: 'Cultural ∩ Systems Intersection Corridor',
    shortLabel: 'CULTURAL ∩ SYSTEMS',
    type: 'cardinal',
    axisType: 'cardinal',
    glyph: '🍂',
    quadrants: ['Cultural', 'Systems'],
    badgeColor: '#059669',
    description: 'Bridges living systems dynamics and regenerative economics with indigenous cosmologies & ecology.',
    labelX: 0,
    labelY: 155
  },
  'inner-cultural': {
    id: 'inner-cultural',
    name: 'Inner ∩ Cultural Intersection Corridor',
    shortLabel: 'INNER ∩ CULTURAL',
    type: 'cardinal',
    axisType: 'cardinal',
    glyph: '🌲',
    quadrants: ['Inner', 'Cultural'],
    badgeColor: '#9333EA',
    description: 'Bridges contemplative psychology and inner grief work with deep ecology & ecological philosophy.',
    labelX: -155,
    labelY: 0
  },
  'apex-omni': {
    id: 'apex-omni',
    name: 'Transdisciplinary Synthesis Nexus',
    shortLabel: 'TRANSDISCIPLINARY NEXUS',
    type: 'apex',
    axisType: 'omni',
    glyph: '🌐',
    quadrants: ['Inner', 'Social', 'Cultural', 'Systems'],
    badgeColor: '#0D9488',
    description: 'Unifying multi-quadrant synthesis connecting consciousness, community, culture, and whole systems.',
    labelX: 0,
    labelY: 0
  }
};

export const ECOTONES_CONFIG = {
  innerRadius: 75,
  summitRadius: 140,
  outerRadius: 260,
  label: 'ECOTONES (INTERSECTIONS)'
};

/**
 * Checks if an entity belongs in an ecotone (intersection)
 */
export function isEntityEcotone(entity: Partial<EcosystemEntity>): boolean {
  if (entity.isTransitionZone || entity.isDomainElevation) return true;
  if (entity.secondaryCategories && entity.secondaryCategories.length > 0) return true;
  return false;
}

// Alias for backward compatibility
export const isEntityDomainElevation = isEntityEcotone;

/**
 * Identifies the exact intersection zone for an entity
 */
export function getEntityIntersectionZone(entity: Partial<EcosystemEntity>): IntersectionZoneInfo | null {
  if (!isEntityEcotone(entity)) return null;

  const primary = entity.category || 'Systems';
  const secondary = (entity.secondaryCategories || []).filter(c => c !== primary);
  const allQuadrants = Array.from(new Set([primary, ...secondary]));

  if (allQuadrants.length >= 3) {
    return INTERSECTION_ZONES['apex-omni'];
  }

  if (allQuadrants.length === 2) {
    const hasInner = allQuadrants.includes('Inner');
    const hasSystems = allQuadrants.includes('Systems');
    const hasSocial = allQuadrants.includes('Social');
    const hasCultural = allQuadrants.includes('Cultural');

    // 1. DIAGONALS
    if (hasInner && hasSystems) return INTERSECTION_ZONES['inner-systems'];
    if (hasSocial && hasCultural) return INTERSECTION_ZONES['social-cultural'];

    // 2. CARDINALS
    if (hasInner && hasSocial) return INTERSECTION_ZONES['inner-social'];
    if (hasSocial && hasSystems) return INTERSECTION_ZONES['social-systems'];
    if (hasCultural && hasSystems) return INTERSECTION_ZONES['cultural-systems'];
    if (hasInner && hasCultural) return INTERSECTION_ZONES['inner-cultural'];
  }

  // Fallback if marked as intersection without specific secondary categories
  return INTERSECTION_ZONES['apex-omni'];
}

/**
 * Returns a CSS conic-gradient or solid background string representing all intersecting quadrants
 */
export function getEntityQuadrantGradient(entity: EcosystemEntity, categoryColors: Record<CategoryQuadrant, string>): string {
  const primary = entity.category || 'Systems';
  const secondary = (entity.secondaryCategories || []).filter(c => c !== primary);
  const allQuadrants = [primary, ...secondary];

  if (allQuadrants.length === 1) {
    return categoryColors[primary] || '#111827';
  }

  // Build segmented conic gradient
  const count = allQuadrants.length;
  const step = 100 / count;
  const stops: string[] = [];

  allQuadrants.forEach((cat, i) => {
    const color = categoryColors[cat] || '#8C877F';
    const start = Math.round(i * step);
    const end = Math.round((i + 1) * step);
    stops.push(`${color} ${start}% ${end}%`);
  });

  return `conic-gradient(${stops.join(', ')})`;
}

/**
 * Computes the target position for an intersection entity located in an Ecotone (Intersection)
 */
export function calculateEcotonePosition(
  entity: EcosystemEntity,
  indexInZone = 0,
  totalInZone = 1
): { x: number; y: number } {
  const zone = getEntityIntersectionZone(entity);
  const primary = entity.category || 'Systems';

  // Fallback defaults
  if (!zone) {
    const signX = (primary === 'Inner' || primary === 'Cultural') ? -1 : 1;
    const signY = (primary === 'Inner' || primary === 'Social') ? -1 : 1;
    return { x: signX * 130, y: signY * 130 };
  }

  const spreadOffset = totalInZone > 1 ? ((indexInZone / (totalInZone - 1 || 1)) - 0.5) * 45 : 0;

  switch (zone.id) {
    case 'inner-systems': {
      // Diagonal spine along y = x (-135° to +45°)
      // Inner side: negative X, negative Y (-120 to -170)
      // Systems side: positive X, positive Y (+120 to +170)
      const baseDist = 135 + (indexInZone % 2) * 25;
      if (primary === 'Inner') {
        const angle = (-3 * Math.PI / 4) + (spreadOffset * 0.01);
        return {
          x: Math.round(Math.cos(angle) * baseDist),
          y: Math.round(Math.sin(angle) * baseDist)
        };
      } else {
        const angle = (Math.PI / 4) + (spreadOffset * 0.01);
        return {
          x: Math.round(Math.cos(angle) * baseDist),
          y: Math.round(Math.sin(angle) * baseDist)
        };
      }
    }

    case 'social-cultural': {
      // Diagonal spine along y = -x (-45° to +135°)
      // Social side: positive X, negative Y (+120 to +170, -120 to -170)
      // Cultural side: negative X, positive Y (-120 to -170, +120 to +170)
      const baseDist = 135 + (indexInZone % 2) * 25;
      if (primary === 'Social') {
        const angle = (-Math.PI / 4) + (spreadOffset * 0.01);
        return {
          x: Math.round(Math.cos(angle) * baseDist),
          y: Math.round(Math.sin(angle) * baseDist)
        };
      } else {
        const angle = (3 * Math.PI / 4) + (spreadOffset * 0.01);
        return {
          x: Math.round(Math.cos(angle) * baseDist),
          y: Math.round(Math.sin(angle) * baseDist)
        };
      }
    }

    case 'inner-social': {
      // North Corridor along X=0, Y < 0
      const signSide = primary === 'Inner' ? -1 : 1;
      const posX = signSide * (48 + Math.abs(spreadOffset) * 0.8);
      const posY = -(135 + (indexInZone % 3) * 22);
      return { x: Math.round(posX), y: Math.round(posY) };
    }

    case 'social-systems': {
      // East Terrace along Y=0, X > 0
      const signSide = primary === 'Social' ? -1 : 1;
      const posX = 135 + (indexInZone % 3) * 22;
      const posY = signSide * (48 + Math.abs(spreadOffset) * 0.8);
      return { x: Math.round(posX), y: Math.round(posY) };
    }

    case 'cultural-systems': {
      // South Saddle along X=0, Y > 0
      const signSide = primary === 'Cultural' ? -1 : 1;
      const posX = signSide * (48 + Math.abs(spreadOffset) * 0.8);
      const posY = 135 + (indexInZone % 3) * 22;
      return { x: Math.round(posX), y: Math.round(posY) };
    }

    case 'inner-cultural': {
      // West Plateau along Y=0, X < 0
      const signSide = primary === 'Inner' ? -1 : 1;
      const posX = -(135 + (indexInZone % 3) * 22);
      const posY = signSide * (48 + Math.abs(spreadOffset) * 0.8);
      return { x: Math.round(posX), y: Math.round(posY) };
    }

    case 'apex-omni':
    default: {
      // Central Summit Apex circle (radius 80 - 105px)
      const signX = (primary === 'Inner' || primary === 'Cultural') ? -1 : 1;
      const signY = (primary === 'Inner' || primary === 'Social') ? -1 : 1;
      const apexRadius = 85 + (indexInZone % 2) * 15;
      const apexAngle = Math.PI / 4 + spreadOffset * 0.008;
      return {
        x: Math.round(signX * Math.cos(apexAngle) * apexRadius),
        y: Math.round(signY * Math.sin(apexAngle) * apexRadius)
      };
    }
  }
}

export const calculateDomainElevationPosition = calculateEcotonePosition;

/**
 * Canonical cluster name -> standard numbered cluster map.
 * Guaranteed to format any island/cluster with its cluster number (e.g. "22. Regenerative Education").
 */
export const CANONICAL_CLUSTER_MAP: Record<string, string> = {
  // Inner (1 - 5)
  'sanctuary of somatics & healing': '1. Sanctuary of Somatics & Healing',
  'somatics & healing': '1. Sanctuary of Somatics & Healing',
  'isles of contemplative wisdom': '2. Isles of Contemplative Wisdom',
  'contemplative wisdom': '2. Isles of Contemplative Wisdom',
  'territory of inner capacities': '3. Territory of Inner Capacities',
  'inner capacities': '3. Territory of Inner Capacities',
  'deep ecology heartland': '4. Deep Ecology Heartland',
  'deep ecology': '4. Deep Ecology Heartland',
  'archipelago of inner transformation': '5. Archipelago of Inner Transformation',
  'inner transformation': '5. Archipelago of Inner Transformation',

  // Social (6 - 10)
  'commonwealth of the commons': '6. Commonwealth of the Commons',
  'commons': '6. Commonwealth of the Commons',
  'federation of civic action': '7. Federation of Civic Action',
  'civic action': '7. Federation of Civic Action',
  'territories of mutual solidarity': '8. Territories of Mutual Solidarity',
  'mutual solidarity': '8. Territories of Mutual Solidarity',
  'transition & local resilience biome': '9. Transition & Local Resilience Biome',
  'transition & local resilience': '9. Transition & Local Resilience Biome',
  'archipelago of social weaving': '10. Archipelago of Social Weaving',
  'social weaving': '10. Archipelago of Social Weaving',

  // Cultural (11 - 15)
  'ancestral & indigenous lorelands': '11. Ancestral & Indigenous Lorelands',
  'ancestral & indigenous wisdom': '11. Ancestral & Indigenous Lorelands',
  'indigenous lorelands': '11. Ancestral & Indigenous Lorelands',
  'archipelago of transcontextual mind': '12. Archipelago of Transcontextual Mind',
  'transcontextual mind': '12. Archipelago of Transcontextual Mind',
  'warm data': '12. Archipelago of Transcontextual Mind',
  'archipelago of living mythos & narrative': '13. Archipelago of Living Mythos & Narrative',
  'living mythos & narrative': '13. Archipelago of Living Mythos & Narrative',
  'decolonial imaginal archipelago': '14. Decolonial Imaginal Archipelago',
  'decolonial imaginal': '14. Decolonial Imaginal Archipelago',
  'archipelago of cultural regeneration': '15. Archipelago of Cultural Regeneration',
  'cultural regeneration': '15. Archipelago of Cultural Regeneration',

  // Systems (16 - 21)
  'expanse of doughnut & post-growth economics': '16. Expanse of Doughnut & Post-Growth Economics',
  'doughnut & post-growth economics': '16. Expanse of Doughnut & Post-Growth Economics',
  'post-growth economics': '16. Expanse of Doughnut & Post-Growth Economics',
  'planetary boundaries biosphere': '17. Planetary Boundaries Biosphere',
  'planetary boundaries': '17. Planetary Boundaries Biosphere',
  'nexus of complexity & systems dynamics': '18. Nexus of Complexity & Systems Dynamics',
  'complexity & systems dynamics': '18. Nexus of Complexity & Systems Dynamics',
  'biomimicry & circular horizons': '19. Biomimicry & Circular Horizons',
  'biomimicry': '19. Biomimicry & Circular Horizons',
  'archipelago of systems transition': '20. Archipelago of Systems Transition',
  'systems transition': '20. Archipelago of Systems Transition',
  'the metta nexus lands': '21. The Metta Nexus Lands',
  'metta nexus': '21. The Metta Nexus Lands',

  // Spreadsheet Ecosystem Islands / Clusters (22+)
  'regenerative education': '22. Regenerative Education',
  'place-based learning': '23. Place-Based Learning',
  'somatic & embodied wisdom': '24. Somatic & Embodied Wisdom',
  'post-capitalist transitions': '25. Post-Capitalist Transitions',
  'decentralized governance': '26. Decentralized Governance',
  'regenerative agriculture & food systems': '27. Regenerative Agriculture & Food Systems',
  'intergenerational healing': '28. Intergenerational Healing',
  'sacred activism': '29. Sacred Activism',
  'community resilience': '30. Community Resilience',
  'education': '38. Education',
  '38. education': '38. Education'
};

/**
 * Canonical mapping from archipelago names to their correct transformation quadrant.
 */
export const CANONICAL_ARCHIPELAGO_QUADRANTS: Record<string, CategoryQuadrant> = {
  // Inner Change (1 - 5, 24, 29)
  'sanctuary of somatics & healing': 'Inner',
  '1. sanctuary of somatics & healing': 'Inner',
  'somatics & healing': 'Inner',
  'isles of contemplative wisdom': 'Inner',
  '2. isles of contemplative wisdom': 'Inner',
  'contemplative wisdom': 'Inner',
  'territory of inner capacities': 'Inner',
  '3. territory of inner capacities': 'Inner',
  'inner capacities': 'Inner',
  'deep ecology heartland': 'Inner',
  '4. deep ecology heartland': 'Inner',
  'deep ecology': 'Inner',
  'archipelago of inner transformation': 'Inner',
  '5. archipelago of inner transformation': 'Inner',
  'inner transformation': 'Inner',
  'somatic & embodied wisdom': 'Inner',
  '24. somatic & embodied wisdom': 'Inner',
  'sacred activism': 'Inner',
  '29. sacred activism': 'Inner',

  // Social Change (6 - 10, 26, 30)
  'commonwealth of the commons': 'Social',
  '6. commonwealth of the commons': 'Social',
  'commons': 'Social',
  'federation of civic action': 'Social',
  '7. federation of civic action': 'Social',
  'civic action': 'Social',
  'territories of mutual solidarity': 'Social',
  '8. territories of mutual solidarity': 'Social',
  'mutual solidarity': 'Social',
  'transition & local resilience biome': 'Social',
  '9. transition & local resilience biome': 'Social',
  'transition & local resilience': 'Social',
  'archipelago of social weaving': 'Social',
  '10. archipelago of social weaving': 'Social',
  'social weaving': 'Social',
  'decentralized governance': 'Social',
  '26. decentralized governance': 'Social',
  'community resilience': 'Social',
  '30. community resilience': 'Social',

  // Cultural Change (11 - 15, 22, 23, 28)
  'ancestral & indigenous lorelands': 'Cultural',
  '11. ancestral & indigenous lorelands': 'Cultural',
  'ancestral & indigenous wisdom': 'Cultural',
  'indigenous lorelands': 'Cultural',
  'archipelago of transcontextual mind': 'Cultural',
  '12. archipelago of transcontextual mind': 'Cultural',
  'transcontextual mind': 'Cultural',
  'warm data': 'Cultural',
  'archipelago of living mythos & narrative': 'Cultural',
  '13. archipelago of living mythos & narrative': 'Cultural',
  'living mythos & narrative': 'Cultural',
  'decolonial imaginal archipelago': 'Cultural',
  '14. decolonial imaginal archipelago': 'Cultural',
  'decolonial imaginal': 'Cultural',
  'archipelago of cultural regeneration': 'Cultural',
  '15. archipelago of cultural regeneration': 'Cultural',
  'cultural regeneration': 'Cultural',
  'regenerative education': 'Cultural',
  '22. regenerative education': 'Cultural',
  'place-based learning': 'Cultural',
  '23. place-based learning': 'Cultural',
  'intergenerational healing': 'Cultural',
  '28. intergenerational healing': 'Cultural',
  'education': 'Cultural',
  '38. education': 'Cultural',

  // Systems Change (16 - 21, 25, 27)
  'expanse of doughnut & post-growth economics': 'Systems',
  '16. expanse of doughnut & post-growth economics': 'Systems',
  'doughnut & post-growth economics': 'Systems',
  'post-growth economics': 'Systems',
  'planetary boundaries biosphere': 'Systems',
  '17. planetary boundaries biosphere': 'Systems',
  'planetary boundaries': 'Systems',
  'nexus of complexity & systems dynamics': 'Systems',
  '18. nexus of complexity & systems dynamics': 'Systems',
  'complexity & systems dynamics': 'Systems',
  'biomimicry & circular horizons': 'Systems',
  '19. biomimicry & circular horizons': 'Systems',
  'biomimicry': 'Systems',
  'archipelago of systems transition': 'Systems',
  '20. archipelago of systems transition': 'Systems',
  'systems transition': 'Systems',
  'the metta nexus lands': 'Systems',
  '21. the metta nexus lands': 'Systems',
  'metta nexus': 'Systems',
  'post-capitalist transitions': 'Systems',
  '25. post-capitalist transitions': 'Systems',
  'regenerative agriculture & food systems': 'Systems',
  '27. regenerative agriculture & food systems': 'Systems'
};

/**
 * Returns the transformation quadrant (Inner, Social, Cultural, Systems) for any archipelago name.
 * Uses exact canonical mapping, numerical ranges (1-5 Inner, 6-10 Social, 11-15 Cultural, 16-21 Systems),
 * keyword heuristics, or an optional fallback.
 */
export function getArchipelagoQuadrant(
  rawArchipelago?: string,
  fallback?: CategoryQuadrant
): CategoryQuadrant {
  if (!rawArchipelago) return fallback || 'Inner';
  const clean = String(rawArchipelago).trim().toLowerCase();
  if (!clean) return fallback || 'Inner';

  // 1. Direct canonical lookup
  if (CANONICAL_ARCHIPELAGO_QUADRANTS[clean]) {
    return CANONICAL_ARCHIPELAGO_QUADRANTS[clean];
  }

  // 2. If caller provided an explicit fallback (e.g. from dataset entity majority), prioritize it!
  if (fallback) {
    return fallback;
  }

  // 3. Number prefix extraction: "1. ...", "22. ...", "6) ..."
  const numMatch = clean.match(/^(\d+)[\.\)]/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if ((num >= 1 && num <= 5) || num === 24 || num === 29) return 'Inner';
    if ((num >= 6 && num <= 10) || num === 26 || num === 30) return 'Social';
    if ((num >= 11 && num <= 15) || num === 22 || num === 23 || num === 28) return 'Cultural';
    if ((num >= 16 && num <= 21) || num === 25 || num === 27) return 'Systems';
  }

  // 4. Substring check against canonical keys (exact or substantial phrase match)
  for (const [key, quad] of Object.entries(CANONICAL_ARCHIPELAGO_QUADRANTS)) {
    if (clean === key || (clean.includes(key) && key.length > 5)) {
      return quad;
    }
  }

  // 5. Thematic keyword analysis
  if (
    clean.includes('somatic') ||
    clean.includes('healing') ||
    clean.includes('contemplat') ||
    clean.includes('mindful') ||
    clean.includes('meditat') ||
    clean.includes('body') ||
    clean.includes('trauma') ||
    clean.includes('nervous system') ||
    clean.includes('inner') ||
    clean.includes('grief') ||
    clean.includes('active hope') ||
    clean.includes('compassion') ||
    clean.includes('zen') ||
    clean.includes('buddhis') ||
    clean.includes('spiritual') ||
    clean.includes('consciousness')
  ) {
    return 'Inner';
  }

  if (
    clean.includes('commons') ||
    clean.includes('civic') ||
    clean.includes('democracy') ||
    clean.includes('deliberat') ||
    clean.includes('citizen') ||
    clean.includes('assembly') ||
    clean.includes('mutual aid') ||
    clean.includes('solidarity') ||
    clean.includes('transition') ||
    clean.includes('resilience') ||
    clean.includes('local') ||
    clean.includes('weaving') ||
    clean.includes('neighborhood') ||
    clean.includes('cooperative') ||
    clean.includes('coop') ||
    clean.includes('governance') ||
    clean.includes('social') ||
    clean.includes('participat')
  ) {
    return 'Social';
  }

  if (
    clean.includes('indigenous') ||
    clean.includes('ancestral') ||
    clean.includes('kinship') ||
    clean.includes('transcontextual') ||
    clean.includes('warm data') ||
    clean.includes('myth') ||
    clean.includes('narrative') ||
    clean.includes('story') ||
    clean.includes('decolonial') ||
    clean.includes('imaginal') ||
    clean.includes('culture') ||
    clean.includes('cultural') ||
    clean.includes('education') ||
    clean.includes('learning') ||
    clean.includes('pedagogy') ||
    clean.includes('animism') ||
    clean.includes('lore') ||
    clean.includes('worldview') ||
    clean.includes('philosophy') ||
    clean.includes('art')
  ) {
    return 'Cultural';
  }

  if (
    clean.includes('doughnut') ||
    clean.includes('post-growth') ||
    clean.includes('post-capital') ||
    clean.includes('economic') ||
    clean.includes('finance') ||
    clean.includes('planetary') ||
    clean.includes('boundaries') ||
    clean.includes('biosphere') ||
    clean.includes('complexity') ||
    clean.includes('systems') ||
    clean.includes('dynamics') ||
    clean.includes('biomimicry') ||
    clean.includes('circular') ||
    clean.includes('transition') ||
    clean.includes('nexus') ||
    clean.includes('agriculture') ||
    clean.includes('food') ||
    clean.includes('technology') ||
    clean.includes('tech')
  ) {
    return 'Systems';
  }

  return fallback || 'Inner';
}

/**
 * Curated canonical archipelago centers with generous physical spacing (400px - 700px apart)
 * ensuring every standard archipelago occupies a distinct, non-overlapping territory in its quadrant.
 */
export const CANONICAL_ARCHIPELAGO_CENTERS: Record<string, { x: number; y: number }> = {
  // INNER QUADRANT (x < 0, y < 0)
  '1. Sanctuary of Somatics & Healing': { x: -450, y: -800 },
  '2. Isles of Contemplative Wisdom': { x: -840, y: -840 },
  '3. Territory of Inner Capacities': { x: -380, y: -380 },
  '4. Deep Ecology Heartland': { x: -800, y: -420 },
  '5. Archipelago of Inner Transformation': { x: -1200, y: -1200 },
  '24. Somatic & Embodied Wisdom': { x: -520, y: -1200 },
  '29. Sacred Activism': { x: -1200, y: -520 },

  // SOCIAL QUADRANT (x > 0, y < 0)
  '6. Commonwealth of the Commons': { x: 380, y: -380 },
  '7. Federation of Civic Action': { x: 800, y: -420 },
  '8. Territories of Mutual Solidarity': { x: 420, y: -800 },
  '9. Transition & Local Resilience Biome': { x: 840, y: -840 },
  '10. Archipelago of Social Weaving': { x: 1200, y: -1200 },
  '26. Decentralized Governance': { x: 1200, y: -520 },
  '30. Community Resilience': { x: 520, y: -1200 },

  // CULTURAL QUADRANT (x < 0, y > 0)
  '11. Ancestral & Indigenous Lorelands': { x: -380, y: 380 },
  '12. Archipelago of Transcontextual Mind': { x: -800, y: 420 },
  '13. Archipelago of Living Mythos & Narrative': { x: -420, y: 800 },
  '14. Decolonial Imaginal Archipelago': { x: -840, y: 840 },
  '15. Archipelago of Cultural Regeneration': { x: -1200, y: 1200 },
  '22. Regenerative Education': { x: -1200, y: 520 },
  '23. Place-Based Learning': { x: -520, y: 1200 },
  '28. Intergenerational Healing': { x: -1350, y: 950 },

  // SYSTEMS QUADRANT (x > 0, y > 0)
  '16. Expanse of Doughnut & Post-Growth Economics': { x: 380, y: 380 },
  '17. Planetary Boundaries Biosphere': { x: 800, y: 420 },
  '18. Nexus of Complexity & Systems Dynamics': { x: 420, y: 800 },
  '19. Biomimicry & Circular Horizons': { x: 840, y: 840 },
  '20. Archipelago of Systems Transition': { x: 1200, y: 1200 },
  '21. The Metta Nexus Lands': { x: 520, y: 1200 },
  '25. Post-Capitalist Transitions': { x: 1200, y: 520 },
  '27. Regenerative Agriculture & Food Systems': { x: 950, y: 1350 }
};

/**
 * Calculates distinct, non-overlapping center positions for all archipelagos within their appropriate quadrants.
 * Canonical archipelagos use pre-spaced coordinates. Any custom or unknown archipelagos are assigned
 * spacious coordinates in their quadrant that avoid all existing archipelagos with >= 420px clearance.
 */
export function calculateArchipelagoCenterPositions(
  archipelagos: string[],
  entityMajorityMap?: Map<string, CategoryQuadrant>
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (!archipelagos || archipelagos.length === 0) return result;

  const byQuadrant: Record<CategoryQuadrant, string[]> = {
    Inner: [],
    Social: [],
    Cultural: [],
    Systems: []
  };

  const seen = new Set<string>();

  archipelagos.forEach(rawArch => {
    const formatted = formatClusterWithNumber(rawArch);
    if (!formatted || seen.has(formatted)) return;
    seen.add(formatted);

    const majority = entityMajorityMap?.get(formatted) || entityMajorityMap?.get(rawArch);
    const quadrant = getArchipelagoQuadrant(formatted, majority);
    byQuadrant[quadrant].push(formatted);
  });

  const quadrantConfig: Record<CategoryQuadrant, {
    signX: number;
    signY: number;
    minAngleDeg: number;
    maxAngleDeg: number;
    centerAngleDeg: number;
  }> = {
    Inner: { signX: -1, signY: -1, minAngleDeg: -165, maxAngleDeg: -105, centerAngleDeg: -135 },
    Social: { signX: 1, signY: -1, minAngleDeg: -75, maxAngleDeg: -15, centerAngleDeg: -45 },
    Cultural: { signX: -1, signY: 1, minAngleDeg: 105, maxAngleDeg: 165, centerAngleDeg: 135 },
    Systems: { signX: 1, signY: 1, minAngleDeg: 15, maxAngleDeg: 75, centerAngleDeg: 45 }
  };

  (Object.keys(byQuadrant) as CategoryQuadrant[]).forEach(cat => {
    const archsInCat = byQuadrant[cat];
    if (archsInCat.length === 0) return;

    const placedCenters: { name: string; x: number; y: number }[] = [];
    const cfg = quadrantConfig[cat];
    const unplaced: string[] = [];

    // Pass 1: Match canonical centers
    archsInCat.forEach(arch => {
      let canonicalPos: { x: number; y: number } | undefined = CANONICAL_ARCHIPELAGO_CENTERS[arch];
      if (!canonicalPos) {
        const cleanArch = arch.toLowerCase().trim();
        for (const [canonName, pos] of Object.entries(CANONICAL_ARCHIPELAGO_CENTERS)) {
          const cleanCanon = canonName.toLowerCase().trim();
          if (cleanArch === cleanCanon || cleanArch.includes(cleanCanon) || cleanCanon.includes(cleanArch)) {
            canonicalPos = pos;
            break;
          }
        }
      }

      if (canonicalPos) {
        placedCenters.push({ name: arch, x: canonicalPos.x, y: canonicalPos.y });
      } else {
        unplaced.push(arch);
      }
    });

    // Pass 2: Place unplaced / custom archipelagos in optimal radial wedges
    const candidateRadii = [480, 820, 1150, 1450, 1750, 2050];
    const angleSteps = 8;

    unplaced.forEach(arch => {
      let bestX = cfg.signX * 600;
      let bestY = cfg.signY * 600;
      let maxMinDist = -1;

      for (const r of candidateRadii) {
        for (let i = 0; i <= angleSteps; i++) {
          const t = i / angleSteps;
          const angleDeg = cfg.minAngleDeg + t * (cfg.maxAngleDeg - cfg.minAngleDeg);
          const rad = (angleDeg * Math.PI) / 180;
          const candX = Math.round(Math.cos(rad) * r);
          const candY = Math.round(Math.sin(rad) * r);

          if (Math.sign(candX) !== cfg.signX || Math.sign(candY) !== cfg.signY) continue;
          if (Math.abs(candX) < 120 || Math.abs(candY) < 120) continue;

          let minDist = 999999;
          for (const pc of placedCenters) {
            const d = Math.hypot(candX - pc.x, candY - pc.y);
            if (d < minDist) minDist = d;
          }

          if (minDist > maxMinDist) {
            maxMinDist = minDist;
            bestX = candX;
            bestY = candY;
          }
        }
      }

      placedCenters.push({ name: arch, x: bestX, y: bestY });
    });

    // Pass 3: Force-directed relaxation ensuring >= 420px clearance between archipelago centers
    const minArchClearance = 430;
    for (let iter = 0; iter < 35; iter++) {
      let collided = false;
      for (let i = 0; i < placedCenters.length; i++) {
        for (let j = i + 1; j < placedCenters.length; j++) {
          const c1 = placedCenters[i];
          const c2 = placedCenters[j];
          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          let dist = Math.hypot(dx, dy);

          if (dist < minArchClearance) {
            collided = true;
            const push = (minArchClearance - dist) / 2;
            let nx = dx / (dist || 1);
            let ny = dy / (dist || 1);
            if (dist < 1 || (dx === 0 && dy === 0)) {
              const angle = ((i + j + 1) * 1.35);
              nx = Math.cos(angle);
              ny = Math.sin(angle);
            }

            c1.x = Math.round(c1.x - nx * push);
            c1.y = Math.round(c1.y - ny * push);
            c2.x = Math.round(c2.x + nx * push);
            c2.y = Math.round(c2.y + ny * push);
          }
        }
      }

      // Preserve strict quadrant boundaries with minimum 80px distance from both axes
      placedCenters.forEach(c => {
        if (cfg.signX < 0 && c.x > -80) c.x = -80;
        if (cfg.signX > 0 && c.x < 80) c.x = 80;
        if (cfg.signY < 0 && c.y > -80) c.y = -80;
        if (cfg.signY > 0 && c.y < 80) c.y = 80;
      });

      if (!collided) break;
    }

    placedCenters.forEach(c => {
      result.set(c.name, { x: c.x, y: c.y });
    });
  });

  return result;
}

/**
 * Normalizes any cluster/archipelago name ensuring it is prefixed with its cluster number.
 * E.g. "22. Regenerative Education" -> "22. Regenerative Education"
 * E.g. "Regenerative Education" -> "22. Regenerative Education"
 * E.g. "Sanctuary of Somatics & Healing" -> "1. Sanctuary of Somatics & Healing"
 */
export function formatClusterWithNumber(rawCluster: string): string {
  if (!rawCluster) return '';
  const trimmed = String(rawCluster).trim();
  if (!trimmed) return '';

  // 1. If it already starts with a number like "22. Regenerative Education" or "1. ..." or "22) ..."
  if (/^\d+[\.\)]\s*.+/.test(trimmed)) {
    return trimmed.replace(/^(\d+)[\.\)]\s*/, '$1. ');
  }

  // 2. Exact match in canonical lookup
  const cleanLower = trimmed.toLowerCase();
  if (CANONICAL_CLUSTER_MAP[cleanLower]) {
    return CANONICAL_CLUSTER_MAP[cleanLower];
  }

  // 3. Exact base name match in canonical lookup (e.g. "regenerative education" without number prefix)
  const cleanBase = normalizeArchipelagoBaseName(trimmed);
  for (const [key, val] of Object.entries(CANONICAL_CLUSTER_MAP)) {
    const keyBase = normalizeArchipelagoBaseName(key);
    if (keyBase === cleanBase && cleanBase.length > 3) {
      return val;
    }
  }

  // 4. Stable deterministic number for custom/unregistered clusters
  let hash = 0;
  for (let i = 0; i < cleanLower.length; i++) {
    hash = ((hash << 5) - hash) + cleanLower.charCodeAt(i);
    hash |= 0;
  }
  const stableNum = (Math.abs(hash) % 30) + 31; // numbers 31 to 60
  return `${stableNum}. ${trimmed}`;
}

/**
 * Returns the entity's primary island/cluster (the first one listed), formatted with its number.
 */
export function getEntityClusterWithNumber(entity: EcosystemEntity, allContinents?: ContinentInfo[]): string {
  if (!entity) return '';

  // 1. First choice: explicit entity.continent
  if (entity.continent && entity.continent.trim()) {
    return formatClusterWithNumber(entity.continent);
  }

  // 2. Second choice: check Overview -> Island/Cluster or extraFields (take first one listed if multiple)
  const rawFromOverview = entity.categorizedFields?.['Overview']?.['Island/Cluster'] ||
    entity.extraFields?.['Island/Cluster'] ||
    entity.extraFields?.['island'] ||
    entity.extraFields?.['cluster'];

  if (rawFromOverview && String(rawFromOverview).trim()) {
    const parts = String(rawFromOverview).split(/[,;|\n]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return formatClusterWithNumber(parts[0]);
    }
  }

  // 3. Third choice: suggest from entity attributes
  const suggested = suggestContinent(entity);
  return formatClusterWithNumber(suggested);
}

/**
 * Returns only the other Archipelagos that aren't the primary one assigned to that entity.
 */
/**
 * Normalizes an archipelago name for matching by stripping leading numbering (e.g. "22. ", "1) ")
 * and returning a clean lowercase base name.
 */
export function normalizeArchipelagoBaseName(str?: string): string {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/^(\d+)[\.\)]\s*/, '')
    .trim();
}

/**
 * Returns only the other Archipelagos that aren't the primary one assigned to that entity.
 */
export function getEntityOtherArchipelagos(entity: EcosystemEntity): string[] {
  if (!entity) return [];

  // Determine the primary archipelago assigned to the entity
  const primary = (entity.continent || suggestContinent(entity) || '').trim();
  const primaryNorm = formatClusterWithNumber(primary).toLowerCase().trim();
  const primaryBase = normalizeArchipelagoBaseName(primary);

  const collected: string[] = [];

  const addArch = (item: string) => {
    if (!item) return;
    const trimmed = String(item).trim();
    if (!trimmed) return;
    const formatted = formatClusterWithNumber(trimmed);
    const formattedNorm = formatted.toLowerCase().trim();
    const baseNorm = normalizeArchipelagoBaseName(trimmed);
    if (
      baseNorm &&
      baseNorm !== primaryBase &&
      formattedNorm !== primaryNorm &&
      !collected.some(c => normalizeArchipelagoBaseName(c) === baseNorm)
    ) {
      collected.push(formatted);
    }
  };

  // 1. Explicit otherArchipelagos property on entity
  if (Array.isArray(entity.otherArchipelagos)) {
    entity.otherArchipelagos.forEach(addArch);
  } else if (typeof entity.otherArchipelagos === 'string') {
    String(entity.otherArchipelagos).split(/[,;|\n]+/).forEach(addArch);
  }

  // 2. Overview categorized fields (Other Archipelagos, Island/Cluster, Islands, Archipelago)
  const overview = entity.categorizedFields?.['Overview'];
  if (overview) {
    const rawOther = overview['Other Archipelagos'] || overview['other archipelagos'];
    if (rawOther) {
      if (Array.isArray(rawOther)) {
        rawOther.forEach(addArch);
      } else {
        String(rawOther).split(/[,;|\n]+/).forEach(addArch);
      }
    }
    const rawCluster = overview['Island/Cluster'] || overview['island/cluster'] || overview['Islands'] || overview['islands'];
    if (rawCluster) {
      if (Array.isArray(rawCluster)) {
        rawCluster.forEach(addArch);
      } else {
        String(rawCluster).split(/[,;|\n]+/).forEach(addArch);
      }
    }
    const rawArch = overview['Archipelago'] || overview['archipelago'];
    if (rawArch) {
      if (Array.isArray(rawArch)) {
        rawArch.forEach(addArch);
      } else {
        String(rawArch).split(/[,;|\n]+/).forEach(addArch);
      }
    }
  }

  // 3. extraFields
  if (entity.extraFields) {
    const extraOther = entity.extraFields['Other Archipelagos'] || entity.extraFields['other archipelagos'] || entity.extraFields['Island/Cluster'] || entity.extraFields['Islands'] || entity.extraFields['islands'] || entity.extraFields['archipelago'] || entity.extraFields['Archipelago'];
    if (extraOther) {
      if (Array.isArray(extraOther)) {
        extraOther.forEach(addArch);
      } else {
        String(extraOther).split(/[,;|\n]+/).forEach(addArch);
      }
    }
  }

  return collected;
}

/**
 * Checks if an entity matches an archipelago name (either as its primary continent or in other archipelagos).
 * Robustly matches with or without number prefixes (e.g. "22. Regenerative Education" vs "Regenerative Education").
 */
export function entityMatchesArchipelago(entity: EcosystemEntity, archipelagoName: string): boolean {
  if (!entity || !archipelagoName) return false;
  const targetRaw = archipelagoName.toLowerCase().trim();
  const targetNorm = formatClusterWithNumber(archipelagoName).toLowerCase().trim();
  const targetBase = normalizeArchipelagoBaseName(archipelagoName);

  const isMatch = (cand?: string) => {
    if (!cand) return false;
    const cRaw = cand.toLowerCase().trim();
    const cNorm = formatClusterWithNumber(cand).toLowerCase().trim();
    const cBase = normalizeArchipelagoBaseName(cand);

    if (cRaw === targetRaw || cNorm === targetNorm || cBase === targetBase) return true;
    return false;
  };

  // 1. Check primary assigned continent / archipelago
  const primary = entity.continent || suggestContinent(entity);
  if (primary && isMatch(primary)) return true;

  // 2. Check other archipelagos
  const others = getEntityOtherArchipelagos(entity);
  return others.some(other => isMatch(other));
}

/**
 * Checks if an archipelago is the PRIMARY continent assigned to the entity.
 */
export function isEntityPrimaryToArchipelago(entity: EcosystemEntity, archipelagoName: string): boolean {
  if (!entity || !archipelagoName) return false;
  const primary = entity.continent || suggestContinent(entity);
  if (!primary) return false;
  const targetBase = normalizeArchipelagoBaseName(archipelagoName);
  const primaryBase = normalizeArchipelagoBaseName(primary);
  return primaryBase === targetBase ||
    primary.toLowerCase().trim() === archipelagoName.toLowerCase().trim() ||
    formatClusterWithNumber(primary).toLowerCase().trim() === formatClusterWithNumber(archipelagoName).toLowerCase().trim();
}

// Minimum clearances between entity pin centers ensuring cards (up to 185px wide and 80px tall)
// NEVER overlap or touch each other horizontally or vertically
export const FOCUS_CARD_CLEARANCE_X = 205; // 185px card max-width + 20px breathing room
export const FOCUS_CARD_CLEARANCE_Y = 108; // ~75px card height + 18px pin + 15px breathing room

/**
 * Calculates temporary focus positions for entities appearing in an archipelago during focus view.
 * - Primary entities keep their general spatial arrangement around the archipelago center,
 *   with guaranteed non-overlapping clearance.
 * - Guest entities (affiliated via "Other Archipelagos") are placed into harmonious open slots
 *   within the archipelago territory.
 * - A multi-pass collision relaxation solver guarantees ZERO card overlap or stacking.
 * - All positions are strictly temporary during this focus view.
 */
export function calculateFocusArchipelagoPositions(
  matchingEntities: EcosystemEntity[],
  targetArchipelago: string,
  continentInfo?: ContinentInfo,
  allContinents?: ContinentInfo[]
): EcosystemEntity[] {
  if (!matchingEntities || matchingEntities.length === 0 || !targetArchipelago) {
    return matchingEntities || [];
  }

  // Find continent reference
  const targetBase = normalizeArchipelagoBaseName(targetArchipelago);
  const activeCont = continentInfo || (allContinents || []).find(c => normalizeArchipelagoBaseName(c.name) === targetBase);

  // Partition into primary and guest entities
  const primaryEntities: EcosystemEntity[] = [];
  const guestEntities: EcosystemEntity[] = [];

  matchingEntities.forEach(ent => {
    if (isEntityPrimaryToArchipelago(ent, targetArchipelago)) {
      primaryEntities.push({ ...ent });
    } else {
      guestEntities.push({ ...ent });
    }
  });

  // Determine the center of the archipelago
  let centerX = 0;
  let centerY = 0;

  if (activeCont) {
    centerX = activeCont.centerX;
    centerY = activeCont.centerY;
  } else if (matchingEntities.length > 0) {
    centerX = Math.round(matchingEntities.reduce((sum, e) => sum + e.x, 0) / matchingEntities.length);
    centerY = Math.round(matchingEntities.reduce((sum, e) => sum + e.y, 0) / matchingEntities.length);
  } else {
    const quad = getArchipelagoQuadrant(targetArchipelago);
    centerX = QUADRANT_CENTERS[quad].x;
    centerY = QUADRANT_CENTERS[quad].y;
  }

  const placedResult: EcosystemEntity[] = [];

  // 1. Primary entities keep their exact coordinates
  primaryEntities.forEach(ent => {
    placedResult.push({ ...ent });
  });

  // Minimum clearance thresholds between pin centers (card max-width ~185px, card height ~75px)
  const CLEARANCE_X = 205;
  const CLEARANCE_Y = 105;

  const checkOverlap = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    const normDistSq = (dx / CLEARANCE_X) ** 2 + (dy / CLEARANCE_Y) ** 2;
    return normDistSq < 1.0;
  };

  // Quadrant constraints (keep in same quadrant as center unless near axis)
  const signX = centerX < 0 ? -1 : 1;
  const signY = centerY < 0 ? -1 : 1;

  // Compute outer extent of primary entities from (centerX, centerY)
  let maxPrimaryDist = 80;
  primaryEntities.forEach(p => {
    const d = Math.hypot(p.x - centerX, p.y - centerY);
    if (d > maxPrimaryDist) maxPrimaryDist = d;
  });

  const baseRadius = Math.max(maxPrimaryDist + 80, 160);

  // 2. Place each guest entity around the primary entities
  const numGuests = guestEntities.length;
  const angleStep = (2 * Math.PI) / Math.max(numGuests, 6);

  guestEntities.forEach((guest, gIdx) => {
    const preferredAngle = gIdx * angleStep + 0.35;

    let bestX = centerX;
    let bestY = centerY;
    let foundSlot = false;

    // Search across angles starting from preferred angle outward
    const angleCandidates: number[] = [];
    const searchRays = 36;
    for (let s = 0; s < searchRays; s++) {
      const offset = (s % 2 === 0 ? 1 : -1) * Math.floor((s + 1) / 2) * (Math.PI / 18);
      angleCandidates.push(preferredAngle + offset);
    }

    // Try radii starting from baseRadius and increasing in steps
    radiusLoop:
    for (let r = baseRadius; r <= baseRadius + 450; r += 35) {
      for (const ang of angleCandidates) {
        const candX = Math.round(centerX + Math.cos(ang) * r);
        const candY = Math.round(centerY + Math.sin(ang) * r);

        // Check quadrant boundaries if far from axis
        if (Math.abs(candX) > 60 && (candX * signX < 0)) continue;
        if (Math.abs(candY) > 60 && (candY * signY < 0)) continue;

        // Check collision against all placed entities (primary + already placed guests)
        let collides = false;
        for (const placed of placedResult) {
          if (checkOverlap(candX, candY, placed.x, placed.y)) {
            collides = true;
            break;
          }
        }

        if (!collides) {
          bestX = candX;
          bestY = candY;
          foundSlot = true;
          break radiusLoop;
        }
      }
    }

    // Fallback if no perfect slot found: place at comfortable distance along preferred angle
    if (!foundSlot) {
      const fallbackR = baseRadius + 120 + gIdx * 45;
      bestX = Math.round(centerX + Math.cos(preferredAngle) * fallbackR);
      bestY = Math.round(centerY + Math.sin(preferredAngle) * fallbackR);
    }

    placedResult.push({
      ...guest,
      x: bestX,
      y: bestY,
      isFocusGuest: true,
      focusArchipelago: targetArchipelago,
      primaryContinentName: guest.continent || suggestContinent(guest)
    });
  });

  // 3. Multi-pass collision separation relaxation for guest entities
  // Primary entities remain stationary; guest entities are gently pushed away from any overlap
  const guestStartIndex = primaryEntities.length;
  for (let iter = 0; iter < 12; iter++) {
    let movedAny = false;

    for (let i = guestStartIndex; i < placedResult.length; i++) {
      const g = placedResult[i];

      // Check against all primary entities
      for (let j = 0; j < guestStartIndex; j++) {
        const p = placedResult[j];
        const dx = g.x - p.x;
        const dy = g.y - p.y;
        const normDistSq = (dx / CLEARANCE_X) ** 2 + (dy / CLEARANCE_Y) ** 2;

        if (normDistSq < 1.0) {
          movedAny = true;
          const dist = Math.hypot(dx, dy) || 1;
          const pushX = (dx / dist) * 25;
          const pushY = (dy / dist) * 18;
          g.x = Math.round(g.x + (dx === 0 ? 25 : pushX));
          g.y = Math.round(g.y + (dy === 0 ? 18 : pushY));
        }
      }

      // Check against other guest entities
      for (let j = i + 1; j < placedResult.length; j++) {
        const otherG = placedResult[j];
        const dx = otherG.x - g.x;
        const dy = otherG.y - g.y;
        const normDistSq = (dx / CLEARANCE_X) ** 2 + (dy / CLEARANCE_Y) ** 2;

        if (normDistSq < 1.0) {
          movedAny = true;
          const dist = Math.hypot(dx, dy) || 1;
          const pushX = (dx / dist) * 14;
          const pushY = (dy / dist) * 10;
          otherG.x = Math.round(otherG.x + (dx === 0 ? 14 : pushX));
          otherG.y = Math.round(otherG.y + (dy === 0 ? 10 : pushY));
          g.x = Math.round(g.x - (dx === 0 ? 14 : pushX));
          g.y = Math.round(g.y - (dy === 0 ? 10 : pushY));
        }
      }

      // Keep within quadrant bounds if not elevated
      if (signX < 0 && g.x > -50) g.x = -50;
      if (signX > 0 && g.x < 50) g.x = 50;
      if (signY < 0 && g.y > -50) g.y = -50;
      if (signY > 0 && g.y < 50) g.y = 50;
    }

    if (!movedAny) break;
  }

  return placedResult;
}

/**
 * Extends the continent boundary outwards during archipelago focus view so that ALL entity cards
 * fit comfortably within the shoreline while preserving the natural organic contours and shape of the archipelago.
 */
export function calculateExpandedContinentHull(
  continent: ContinentInfo,
  focusEntities: EcosystemEntity[]
): ContinentInfo {
  if (!focusEntities || focusEntities.length === 0) return continent;
  // If the user has manually adjusted or customized the continent shape, respect it strictly!
  if (continent.isCustomShape) return continent;

  const cx = continent.centerX;
  const cy = continent.centerY;
  const isSmallArchipelago = focusEntities.length <= 2;
  const coastalPadding = isSmallArchipelago ? 16 : 32;

  // Collect key bounding points of every entity's pin & label in focusEntities
  const cardPerimeterPoints: [number, number][] = [];
  focusEntities.forEach(ent => {
    const padX = isSmallArchipelago ? 22 : 45;
    const padYTop = isSmallArchipelago ? 12 : 16;
    const padYBottom = isSmallArchipelago ? 20 : 36;
    cardPerimeterPoints.push(
      [ent.x - padX, ent.y - padYTop],
      [ent.x + padX, ent.y - padYTop],
      [ent.x - padX, ent.y + padYBottom],
      [ent.x + padX, ent.y + padYBottom],
      [ent.x, ent.y - padYTop],
      [ent.x, ent.y + padYBottom]
    );
  });

  let scaledControlPoints: [number, number][] = [];

  if (continent.controlPoints && continent.controlPoints.length >= 3) {
    const origPoints = continent.controlPoints;
    const numPoints = origPoints.length;

    // Calculate required radial reach for each existing control vertex
    const targetRList: number[] = origPoints.map(([px, py]) => {
      const cpDx = px - cx;
      const cpDy = py - cy;
      const cpAngle = Math.atan2(cpDy, cpDx);
      const origR = Math.hypot(cpDx, cpDy);

      // Baseline gentle expansion without forcing huge artificial radius
      let requiredR = Math.max(origR * 1.01, isSmallArchipelago ? 20 : 45);

      // Envelop entity positions with comfortable padding
      for (const [bx, by] of cardPerimeterPoints) {
        const bDx = bx - cx;
        const bDy = by - cy;
        const bDist = Math.hypot(bDx, bDy) + coastalPadding;
        const bAngle = Math.atan2(bDy, bDx);

        let angleDiff = Math.abs(cpAngle - bAngle);
        while (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        // Influence control points within ~72 degrees
        if (angleDiff < Math.PI / 2.5) {
          const needed = bDist * Math.cos(angleDiff);
          if (needed > requiredR) {
            requiredR = needed;
          }
        }
      }

      return requiredR;
    });

    // Circular Laplacian smoothing across control points
    let smoothedR = [...targetRList];
    for (let pass = 0; pass < 2; pass++) {
      const nextR = [...smoothedR];
      for (let i = 0; i < numPoints; i++) {
        const prev = smoothedR[(i - 1 + numPoints) % numPoints];
        const curr = smoothedR[i];
        const next = smoothedR[(i + 1) % numPoints];
        nextR[i] = Math.max(curr, 0.22 * prev + 0.56 * curr + 0.22 * next);
      }
      smoothedR = nextR;
    }

    scaledControlPoints = origPoints.map(([px, py], i) => {
      const angle = Math.atan2(py - cy, px - cx);
      const r = Math.round(smoothedR[i]);
      return [
        Math.round(cx + Math.cos(angle) * r),
        Math.round(cy + Math.sin(angle) * r)
      ];
    });
  } else {
    // Generate fresh organic control points
    scaledControlPoints = generateContinentControlPoints(
      [...cardPerimeterPoints, [cx, cy]],
      coastalPadding
    );
  }

  const pathData = createPathFromControlPoints(scaledControlPoints);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  scaledControlPoints.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  const labelPath = generateContinentLabelPath(
    cx,
    cy,
    minX - 30,
    maxX + 30,
    minY - 30,
    maxY + 30,
    scaledControlPoints,
    0
  );

  const subLabelPath = generateContinentLabelPath(
    cx,
    cy,
    minX - 30,
    maxX + 30,
    minY - 30,
    maxY + 30,
    scaledControlPoints,
    -22
  );

  return {
    ...continent,
    count: focusEntities.length,
    controlPoints: scaledControlPoints,
    pathData,
    minX: minX - 30,
    maxX: maxX + 30,
    minY: minY - 30,
    maxY: maxY + 30,
    labelPath,
    subLabelPath
  };
}

export const ALL_CANONICAL_ARCHIPELAGOS = Object.keys(CANONICAL_ARCHIPELAGO_CENTERS);

/**
 * Checks whether a given string is the name of an archipelago/continent
 * (either canonical, numbered, unnumbered, or matching archipelago keyword patterns).
 */
export function isArchipelagoName(val?: string): boolean {
  if (!val) return false;
  const clean = String(val).trim().toLowerCase();
  if (!clean) return false;

  // Number prefix: "1. Sanctuary...", "22. Regenerative..."
  if (/^\d+[\.\)]\s*/.test(clean)) return true;

  // Check against all canonical archipelagos
  for (const arch of ALL_CANONICAL_ARCHIPELAGOS) {
    const aClean = arch.toLowerCase().trim();
    const aWithoutNum = aClean.replace(/^\d+[\.\)]\s*/, '').trim();
    if (clean === aClean || clean === aWithoutNum) return true;
  }

  // Check against canonical archipelago quadrant keys
  for (const archKey of Object.keys(CANONICAL_ARCHIPELAGO_QUADRANTS)) {
    if (clean === archKey) return true;
  }

  // Evocative keywords that denote archipelagos rather than field tags
  if (
    clean.includes('archipelago of') ||
    clean.endsWith(' archipelago') ||
    clean === 'archipelago' ||
    clean.includes('isles of') ||
    clean.includes('territory of') ||
    clean.includes('territories of') ||
    clean.includes('sanctuary of') ||
    clean.includes('commonwealth of') ||
    clean.includes('federation of') ||
    clean.includes('nexus lands') ||
    clean.includes('lorelands') ||
    clean.includes('biome')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a tag/keyword string matches an archipelago (either canonical, numbered,
 * or matching the entity's primary or other archipelagos).
 */
export function isArchipelagoOrCluster(val?: string, entity?: EcosystemEntity): boolean {
  if (!val) return false;
  const clean = String(val).trim().toLowerCase();
  if (!clean) return false;

  // 1. If entity is provided, check against its primary continent and other archipelagos
  if (entity) {
    const primary = (entity.continent || suggestContinent(entity) || '').trim().toLowerCase();
    const primaryNorm = formatClusterWithNumber(primary).toLowerCase();
    const primaryNoNum = primary.replace(/^\d+[\.\)]\s*/, '').trim();

    const cleanNorm = formatClusterWithNumber(clean).toLowerCase();
    const cleanNoNum = clean.replace(/^\d+[\.\)]\s*/, '').trim();

    if (
      clean === primary ||
      clean === primaryNorm ||
      clean === primaryNoNum ||
      cleanNorm === primaryNorm ||
      (cleanNoNum.length >= 4 && cleanNoNum === primaryNoNum)
    ) {
      return true;
    }

    const otherArchs = getEntityOtherArchipelagos(entity);
    const matchesOther = otherArchs.some(other => {
      const oClean = other.toLowerCase().trim();
      const oNorm = formatClusterWithNumber(other).toLowerCase();
      const oNoNum = oClean.replace(/^\d+[\.\)]\s*/, '').trim();

      return (
        clean === oClean ||
        clean === oNorm ||
        clean === oNoNum ||
        cleanNorm === oNorm ||
        (cleanNoNum.length >= 4 && cleanNoNum === oNoNum)
      );
    });

    if (matchesOther) return true;
  }

  // 2. Check general archipelago definitions
  return isArchipelagoName(clean);
}

/**
 * Filters out any archipelagos from a list of tags or keywords for clean profile display,
 * ensuring archipelagos only appear in the "Other Archipelagos" (or primary Archipelago) field.
 */
export function filterProfileTags(tags: string[] | string, entity?: EcosystemEntity): string[] {
  if (!tags) return [];
  const list = Array.isArray(tags)
    ? tags
    : String(tags).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
  return list.filter(tag => !isArchipelagoOrCluster(tag, entity));
}

/**
 * Suggests an evocative thematic Archipelago name for an entity
 * based on its category, fields, keywords, and description, always prefixed with its cluster number.
 */
export function suggestContinent(entity: Partial<EcosystemEntity>): string {
  const cat = entity.category || 'Inner';
  const fields = (entity.fields || []).map(f => f.toLowerCase());
  const combinedText = `${entity.name || ''} ${fields.join(' ')} ${entity.description || ''}`.toLowerCase();

  // Explicit Regenerative Education check
  if (combinedText.includes('regenerative education') || combinedText.includes('holistic education') || combinedText.includes('pedagogy') || combinedText.includes('place-based learning') || combinedText.includes('learning community') || combinedText.includes('schumacher')) {
    return '22. Regenerative Education';
  }

  if (cat === 'Inner') {
    if (combinedText.includes('somatic') || combinedText.includes('body') || combinedText.includes('trauma') || combinedText.includes('nervous system')) {
      return '1. Sanctuary of Somatics & Healing';
    }
    if (combinedText.includes('contemplat') || combinedText.includes('mindful') || combinedText.includes('meditat') || combinedText.includes('zen') || combinedText.includes('buddhism') || combinedText.includes('compassion')) {
      return '2. Isles of Contemplative Wisdom';
    }
    if (combinedText.includes('leadership') || combinedText.includes('capacity') || combinedText.includes('idg') || combinedText.includes('inner development') || combinedText.includes('skill')) {
      return '3. Territory of Inner Capacities';
    }
    if (combinedText.includes('deep ecology') || combinedText.includes('reconnect') || combinedText.includes('grief') || combinedText.includes('active hope') || combinedText.includes('macy')) {
      return '4. Deep Ecology Heartland';
    }
    return '5. Archipelago of Inner Transformation';
  }

  if (cat === 'Social') {
    if (combinedText.includes('commons') || combinedText.includes('cooperative') || combinedText.includes('housing') || combinedText.includes('land trust') || combinedText.includes('solidarity economy')) {
      return '6. Commonwealth of the Commons';
    }
    if (combinedText.includes('democracy') || combinedText.includes('deliberative') || combinedText.includes('citizens assembly') || combinedText.includes('civic') || combinedText.includes('governance')) {
      return '7. Federation of Civic Action';
    }
    if (combinedText.includes('mutual aid') || combinedText.includes('disaster') || combinedText.includes('solidarity') || combinedText.includes('grassroots')) {
      return '8. Territories of Mutual Solidarity';
    }
    if (combinedText.includes('transition') || combinedText.includes('localization') || combinedText.includes('resilience') || combinedText.includes('neighborhood')) {
      return '9. Transition & Local Resilience Biome';
    }
    return '10. Archipelago of Social Weaving';
  }

  if (cat === 'Cultural') {
    if (combinedText.includes('indigenous') || combinedText.includes('ancestral') || combinedText.includes('plant') || combinedText.includes('kinship') || combinedText.includes('kimmerer') || combinedText.includes('animism')) {
      return '11. Ancestral & Indigenous Lorelands';
    }
    if (combinedText.includes('warm data') || combinedText.includes('bateson') || combinedText.includes('transcontextual') || combinedText.includes('aphanipoiesis')) {
      return '12. Archipelago of Transcontextual Mind';
    }
    if (combinedText.includes('story') || combinedText.includes('myth') || combinedText.includes('writing') || combinedText.includes('dark mountain') || combinedText.includes('emergence') || combinedText.includes('narrative')) {
      return '13. Archipelago of Living Mythos & Narrative';
    }
    if (combinedText.includes('decolonial') || combinedText.includes('post-human') || combinedText.includes('akomolafe') || combinedText.includes('imagination')) {
      return '14. Decolonial Imaginal Archipelago';
    }
    return '15. Archipelago of Cultural Regeneration';
  }

  if (cat === 'Systems') {
    if (combinedText.includes('doughnut') || combinedText.includes('raworth') || combinedText.includes('post-growth') || combinedText.includes('post-capital') || combinedText.includes('regenerative economy') || combinedText.includes('finance')) {
      return '16. Expanse of Doughnut & Post-Growth Economics';
    }
    if (combinedText.includes('planetary') || combinedText.includes('boundaries') || combinedText.includes('stockholm') || combinedText.includes('earth systems') || combinedText.includes('biosphere')) {
      return '17. Planetary Boundaries Biosphere';
    }
    if (combinedText.includes('complexity') || combinedText.includes('systems thinking') || combinedText.includes('leverage') || combinedText.includes('dynamics') || combinedText.includes('meadows') || combinedText.includes('santa fe')) {
      return '18. Nexus of Complexity & Systems Dynamics';
    }
    if (combinedText.includes('biomimicry') || combinedText.includes('nature-inspired') || combinedText.includes('circular') || combinedText.includes('benyus')) {
      return '19. Biomimicry & Circular Horizons';
    }
    return '20. Archipelago of Systems Transition';
  }

  return '21. The Metta Nexus Lands';
}

/**
 * Computes 2D Convex Hull for a set of points (Monotone Chain algorithm)
 */
function getConvexHull(points: [number, number][]): [number, number][] {
  if (points.length <= 2) return points;

  const sorted = points.slice().sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);

  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Creates smooth organic SVG path from an array of control boundary points
 */
export function createPathFromControlPoints(controlPoints: [number, number][]): string {
  if (!controlPoints || controlPoints.length === 0) return '';
  
  if (controlPoints.length === 1) {
    const [cx, cy] = controlPoints[0];
    const r = 90;
    return `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`;
  }

  if (controlPoints.length === 2) {
    const [p1, p2] = controlPoints;
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const nx = -dy * 0.4;
    const ny = dx * 0.4;
    return `M ${p1[0]},${p1[1]} Q ${mx + nx},${my + ny} ${p2[0]},${p2[1]} Q ${mx - nx},${my - ny} ${p1[0]},${p1[1]} Z`;
  }

  // Smooth closed quadratic spline through midpoints of control vertices
  const n = controlPoints.length;
  let path = `M ${(controlPoints[0][0] + controlPoints[n - 1][0]) / 2},${(controlPoints[0][1] + controlPoints[n - 1][1]) / 2} `;

  for (let i = 0; i < n; i++) {
    const pCurrent = controlPoints[i];
    const pNext = controlPoints[(i + 1) % n];
    const midX = (pCurrent[0] + pNext[0]) / 2;
    const midY = (pCurrent[1] + pNext[1]) / 2;
    path += `Q ${pCurrent[0]},${pCurrent[1]} ${midX},${midY} `;
  }

  path += 'Z';
  return path;
}

/**
 * Generates a smooth sweeping curved SVG path that circles around the continent's outer rim.
 * The path is constructed from West (left) through North (apex) to East (right), offset outward,
 * so text mapped with <textPath> will read left-to-right, upright, curving around the continent!
 */
export function generateContinentLabelPath(
  centerX: number,
  centerY: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  controlPoints: [number, number][] = [],
  offsetExtra = 0
): string {
  const width = Math.max(120, maxX - minX + 50);
  const height = Math.max(70, maxY - minY + 50);
  const radiusX = width / 2;
  const radiusY = height / 2;

  // If control points exist, find the upper perimeter contour
  if (controlPoints.length >= 4) {
    const upperPoints = controlPoints
      .filter(([x, y]) => y <= centerY + radiusY * 0.35)
      .sort((a, b) => a[0] - b[0]);

    if (upperPoints.length >= 3) {
      // Offset points outward along vector from center
      const offsetPoints = upperPoints.map(([px, py]) => {
        const dx = px - centerX;
        const dy = py - centerY;
        const dist = Math.hypot(dx, dy) || 1;
        const offset = 38 + offsetExtra;
        return [
          Math.round(px + (dx / dist) * offset),
          Math.round(py + (dy / dist) * offset)
        ] as [number, number];
      });

      // Extend west and east endpoints to give text enough runway
      const first = offsetPoints[0];
      const last = offsetPoints[offsetPoints.length - 1];
      const startP: [number, number] = [first[0] - 25, first[1] + 12];
      const endP: [number, number] = [last[0] + 25, last[1] + 12];
      
      const allCurvePoints = [startP, ...offsetPoints, endP];
      let path = `M ${allCurvePoints[0][0]},${allCurvePoints[0][1]} `;
      for (let i = 1; i < allCurvePoints.length - 1; i++) {
        const xc = (allCurvePoints[i][0] + allCurvePoints[i + 1][0]) / 2;
        const yc = (allCurvePoints[i][1] + allCurvePoints[i + 1][1]) / 2;
        path += `Q ${allCurvePoints[i][0]},${allCurvePoints[i][1]} ${xc},${yc} `;
      }
      path += `L ${allCurvePoints[allCurvePoints.length - 1][0]},${allCurvePoints[allCurvePoints.length - 1][1]}`;
      return path;
    }
  }

  // Majestic smooth sweeping cubic bezier arch circling around top of continent
  const startX = Math.round(centerX - radiusX - 20);
  const startY = Math.round(centerY - radiusY * 0.15 + offsetExtra * 0.3);
  const cp1X = Math.round(centerX - radiusX * 0.65);
  const cp1Y = Math.round(minY - 38 + offsetExtra);
  const cp2X = Math.round(centerX + radiusX * 0.65);
  const cp2Y = Math.round(minY - 38 + offsetExtra);
  const endX = Math.round(centerX + radiusX + 20);
  const endY = Math.round(centerY - radiusY * 0.15 + offsetExtra * 0.3);

  return `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;
}

/**
 * Generates an initial set of organic boundary control vertices around entity points
 */
export function generateContinentControlPoints(points: [number, number][], padding = 45): [number, number][] {
  if (!points || points.length === 0) return [];

  // Calculate center of points
  let cx = 0;
  let cy = 0;
  points.forEach(p => { cx += p[0]; cy += p[1]; });
  cx /= points.length;
  cy /= points.length;

  if (points.length === 1) {
    const numPoints = 8;
    const result: [number, number][] = [];
    const baseR = Math.max(26, padding);
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const r = baseR + Math.sin(angle * 3) * 3;
      result.push([
        Math.round(cx + Math.cos(angle) * r),
        Math.round(cy + Math.sin(angle) * r)
      ]);
    }
    return result;
  }

  // Calculate convex hull of entities
  const hull = getConvexHull(points);
  const basePoints = hull.length >= 3 ? hull : points;
  const effectivePadding = points.length === 2 ? Math.min(padding, 20) : padding;

  // Expand points outward from center
  const expanded: [number, number][] = basePoints.map(([px, py], idx) => {
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    const wobble = Math.sin(angle * 3 + idx) * (points.length <= 2 ? 3 : 8);
    const expandDist = effectivePadding + wobble;
    return [
      Math.round(px + (dx / dist) * expandDist),
      Math.round(py + (dy / dist) * expandDist)
    ];
  });

  // Ensure we have at least 8 smooth perimeter control points for rich editing
  if (expanded.length < 8) {
    const subDivided: [number, number][] = [];
    const n = expanded.length;
    for (let i = 0; i < n; i++) {
      const p1 = expanded[i];
      const p2 = expanded[(i + 1) % n];
      subDivided.push(p1);
      // Add midpoint with gentle organic outward bulge
      const mx = (p1[0] + p2[0]) / 2;
      const my = (p1[1] + p2[1]) / 2;
      const mdx = mx - cx;
      const mdy = my - cy;
      const mDist = Math.hypot(mdx, mdy) || 1;
      const bulge = points.length <= 2 ? 3 : 8;
      subDivided.push([
        Math.round(mx + (mdx / mDist) * bulge),
        Math.round(my + (mdy / mDist) * bulge)
      ]);
    }
    return subDivided;
  }

  return expanded;
}

/**
 * Creates smooth organic SVG path around continent boundary hull with padding
 */
export function createOrganicContinentPath(points: [number, number][], padding = 35): { path: string; controlPoints: [number, number][] } {
  if (points.length === 0) return { path: '', controlPoints: [] };
  const controlPoints = generateContinentControlPoints(points, padding);
  const path = createPathFromControlPoints(controlPoints);
  return { path, controlPoints };
}

/**
 * Fits control points tightly around an archipelago's entities with minimal padding
 */
export function fitContinentTightlyAroundEntities(
  entities: EcosystemEntity[],
  padding = 20
): [number, number][] {
  if (!entities || entities.length === 0) return [];
  const points: [number, number][] = entities.map(e => [e.x, e.y]);
  return generateContinentControlPoints(points, padding);
}

/**
 * RESOLVE ENTITY OVERLAPS:
 * Guarantees that entities do not stack directly on top of each other while respecting
 * manually positioned entities (isCustomPosition) and allowing compact clustering in small archipelagos.
 */
export function resolveEntityOverlaps(
  entities: EcosystemEntity[],
  clusterCenters: { x: number; y: number }[] = [],
  archipelagoCenters?: Map<string, { x: number; y: number }>
): EcosystemEntity[] {
  if (entities.length <= 1) return entities;

  const resolved = entities.map(e => ({ ...e }));
  const minClearanceX = 48; // Very compact clearance between entity centers (allows tight small archipelagos)
  const minClearanceY = 28;  // Very compact vertical clearance

  // 1. Initial Dispersal: Jitter identical or near-identical coordinates if not manually placed
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      if (resolved[i].isCustomPosition && resolved[j].isCustomPosition) continue;
      const dx = resolved[j].x - resolved[i].x;
      const dy = resolved[j].y - resolved[i].y;
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14) {
        const angle = ((j + 1) * 1.61803398875) * Math.PI * 2;
        const pushDist = minClearanceX * 0.5;
        if (!resolved[j].isCustomPosition) {
          resolved[j].x = Math.round(resolved[j].x + Math.cos(angle) * pushDist);
          resolved[j].y = Math.round(resolved[j].y + Math.sin(angle) * (minClearanceY * 0.5));
        } else if (!resolved[i].isCustomPosition) {
          resolved[i].x = Math.round(resolved[i].x - Math.cos(angle) * pushDist);
          resolved[i].y = Math.round(resolved[i].y - Math.sin(angle) * (minClearanceY * 0.5));
        }
      }
    }
  }

  // 2. Alignment Solver for unpositioned non-custom entities (centering and quadrant boundary preservation without card collision detection)
  const iterations = 30;
  for (let iter = 0; iter < iterations; iter++) {
    // Repel from center Nexus and Domain Elevation zones
    for (let i = 0; i < resolved.length; i++) {
      const ent = resolved[i];
      const distFromOrigin = Math.hypot(ent.x, ent.y);
      const isElevated = isEntityDomainElevation(ent);

      if (isElevated) {
        if (distFromOrigin < 75) {
          const angle = Math.atan2(ent.y, ent.x) || (i * 0.5);
          ent.x = Math.round(Math.cos(angle) * 85);
          ent.y = Math.round(Math.sin(angle) * 85);
        } else if (distFromOrigin > 240 && !ent.isCustomPosition) {
          const angle = Math.atan2(ent.y, ent.x);
          ent.x = Math.round(Math.cos(angle) * 210);
          ent.y = Math.round(Math.sin(angle) * 210);
        }
      } else {
        if (distFromOrigin < 265 && !ent.isCustomPosition) {
          const angle = Math.atan2(ent.y, ent.x) || (i * 0.5);
          ent.x = Math.round(Math.cos(angle) * 285);
          ent.y = Math.round(Math.sin(angle) * 285);
        }
      }
    }

    // Tether entities gently to their archipelago centers so they remain within their designated archipelago
    if (archipelagoCenters && archipelagoCenters.size > 0) {
      for (let i = 0; i < resolved.length; i++) {
        const ent = resolved[i];
        if (ent.isCustomPosition || isEntityDomainElevation(ent)) continue;
        const archName = ent.continent || suggestContinent(ent);
        const aCenter = archipelagoCenters.get(archName) || archipelagoCenters.get(formatClusterWithNumber(archName));
        if (aCenter) {
          const adx = aCenter.x - ent.x;
          const ady = aCenter.y - ent.y;
          const aDist = Math.hypot(adx, ady);
          if (aDist > 180) {
            ent.x += Math.round(adx * 0.18);
            ent.y += Math.round(ady * 0.18);
          }
        }
      }
    }

    // Repel from Field Cluster Centers
    if (clusterCenters.length > 0) {
      for (let i = 0; i < resolved.length; i++) {
        const ent = resolved[i];
        if (ent.isCustomPosition) continue;
        for (const clus of clusterCenters) {
          const cdx = ent.x - clus.x;
          const cdy = ent.y - clus.y;
          if (Math.abs(cdx) < 70 && Math.abs(cdy) < 40) {
            const angle = Math.atan2(cdy, cdx) || ((i + 1) * 0.8);
            ent.x += Math.round(Math.cos(angle) * 16);
            ent.y += Math.round(Math.sin(angle) * 14);
          }
        }
      }
    }

    // Preserve quadrant boundaries strictly
    for (let i = 0; i < resolved.length; i++) {
      const ent = resolved[i];
      const signX = (ent.category === 'Inner' || ent.category === 'Cultural') ? -1 : 1;
      const signY = (ent.category === 'Inner' || ent.category === 'Social') ? -1 : 1;

      if (!ent.isCustomPosition) {
        if (signX < 0 && ent.x > -50) ent.x = -50 - Math.abs(ent.x % 40);
        if (signX > 0 && ent.x < 50) ent.x = 50 + Math.abs(ent.x % 40);
        if (signY < 0 && ent.y > -50) ent.y = -50 - Math.abs(ent.y % 40);
        if (signY > 0 && ent.y < 50) ent.y = 50 + Math.abs(ent.y % 40);
      }
    }
  }

  return resolved;
}

export interface LayoutOptions {
  forceRecalculate?: boolean;
  archipelagoQuadrantOverrides?: Record<string, CategoryQuadrant>;
}

/**
 * Ensures all entities and archipelagos have valid coordinates mapped cleanly within their proper quadrants.
 * Guarantees that archipelagos NEVER stack on top of each other:
 *  - Every archipelago has a dedicated, non-overlapping center position in its quadrant.
 *  - Member entities are organically clustered around their archipelago center.
 *  - Organic convex hulls & curved sweeping labels wrap each archipelago with ocean straits in between.
 *  - Resolves all card overlaps completely.
 */
export function calculateEntityLayout(
  entities: EcosystemEntity[],
  options?: LayoutOptions
): { 
  entities: EcosystemEntity[]; 
  fieldClusters: FieldCluster[];
  continents: ContinentInfo[];
  ecotoneCorridors: EcotoneCorridorInfo[];
} {
  // Step 1: Normalize archipelagos and resolve the appropriate quadrant for each archipelago
  const entityArchipelagoMap = new Map<string, string>();
  const archipelagoEntityMap = new Map<string, EcosystemEntity[]>();
  const archipelagoMajorityQuadrant = new Map<string, CategoryQuadrant>();

  entities.forEach(ent => {
    const rawArch = ent.continent && ent.continent.trim() ? ent.continent.trim() : suggestContinent(ent);
    const formattedArch = formatClusterWithNumber(rawArch);
    entityArchipelagoMap.set(ent.id, formattedArch);

    if (!archipelagoEntityMap.has(formattedArch)) {
      archipelagoEntityMap.set(formattedArch, []);
    }
    archipelagoEntityMap.get(formattedArch)!.push(ent);
  });

  // Calculate majority quadrant for each archipelago
  archipelagoEntityMap.forEach((ents, archName) => {
    // 1. User explicit archipelago quadrant override
    if (options?.archipelagoQuadrantOverrides) {
      const formatted = formatClusterWithNumber(archName);
      const baseName = normalizeArchipelagoBaseName(archName);
      let override = options.archipelagoQuadrantOverrides[archName] ||
        options.archipelagoQuadrantOverrides[formatted] ||
        options.archipelagoQuadrantOverrides[archName.toLowerCase()] ||
        options.archipelagoQuadrantOverrides[formatted.toLowerCase()];
      if (!override) {
        for (const [k, v] of Object.entries(options.archipelagoQuadrantOverrides)) {
          if (normalizeArchipelagoBaseName(k) === baseName) {
            override = v;
            break;
          }
        }
      }
      if (override) {
        archipelagoMajorityQuadrant.set(archName, override);
        return;
      }
    }

    // 2. Tally non-elevated entity categories in this archipelago
    // The ground truth: if member entities in this archipelago have an explicit quadrant, that quadrant takes precedence!
    const tallies: Record<CategoryQuadrant, number> = { Inner: 0, Social: 0, Cultural: 0, Systems: 0 };
    ents.forEach(e => {
      if (!isEntityDomainElevation(e) && e.category) {
        tallies[e.category]++;
      }
    });

    let bestQuad: CategoryQuadrant | null = null;
    let maxCount = 0;
    (Object.keys(tallies) as CategoryQuadrant[]).forEach(q => {
      if (tallies[q] > maxCount) {
        maxCount = tallies[q];
        bestQuad = q;
      }
    });

    if (bestQuad && maxCount > 0) {
      archipelagoMajorityQuadrant.set(archName, bestQuad);
      return;
    }

    // 3. Exact canonical archipelago quadrant check
    const cleanArch = archName.toLowerCase().trim();
    if (CANONICAL_ARCHIPELAGO_QUADRANTS[cleanArch]) {
      archipelagoMajorityQuadrant.set(archName, CANONICAL_ARCHIPELAGO_QUADRANTS[cleanArch]);
      return;
    }

    // 4. Fallback to heuristic archipelago quadrant inference
    archipelagoMajorityQuadrant.set(archName, getArchipelagoQuadrant(archName));
  });

  // Step 2: Compute distinct non-overlapping center positions for all archipelagos
  const allArchipelagoNames = Array.from(archipelagoEntityMap.keys());
  const archipelagoCenters = calculateArchipelagoCenterPositions(allArchipelagoNames, archipelagoMajorityQuadrant);

  // Step 3: Map field occurrences per category to calculate field cluster centers
  const fieldCounts: Record<string, { count: number; category: CategoryQuadrant; fieldName: string }> = {};

  entities.forEach(ent => {
    const arch = entityArchipelagoMap.get(ent.id) || '';
    const archQuad = archipelagoMajorityQuadrant.get(arch) || ent.category || 'Inner';
    const effectiveCat = isEntityDomainElevation(ent) ? (ent.category || 'Inner') : archQuad;

    ent.fields.forEach(f => {
      const key = `${effectiveCat}::${f.trim()}`;
      if (!fieldCounts[key]) {
        fieldCounts[key] = { count: 0, category: effectiveCat, fieldName: f.trim() };
      }
      fieldCounts[key].count++;
    });
  });

  // Build field clusters
  const fieldClusters: FieldCluster[] = [];
  Object.values(fieldCounts).forEach(item => {
    const qCenter = QUADRANT_CENTERS[item.category] || QUADRANT_CENTERS.Inner;
    fieldClusters.push({
      name: item.fieldName,
      category: item.category,
      color: qCenter.color,
      count: item.count,
      centerX: qCenter.x,
      centerY: qCenter.y,
      visible: true
    });
  });

  // Step 4: Position entities around their assigned archipelago center (or central ecotone spine)
  const elevatedCountInCat: Record<CategoryQuadrant, number> = { Inner: 0, Social: 0, Cultural: 0, Systems: 0 };
  entities.forEach(ent => {
    if (isEntityDomainElevation(ent)) {
      elevatedCountInCat[ent.category || 'Systems']++;
    }
  });

  const elevatedIndexTracker: Record<CategoryQuadrant, number> = { Inner: 0, Social: 0, Cultural: 0, Systems: 0 };
  const archipelagoEntityIndexTracker = new Map<string, number>();

  const positionedEntities = entities.map(ent => {
    const arch = entityArchipelagoMap.get(ent.id) || formatClusterWithNumber(suggestContinent(ent));
    const archQuad = archipelagoMajorityQuadrant.get(arch) || ent.category || 'Inner';
    const isElevated = isEntityDomainElevation(ent);

    // Synchronize category and quadrant with archipelago unless elevated ecotone
    let effectiveCategory = isElevated ? (ent.category || 'Inner') : archQuad;
    let effectiveQuadrant = effectiveCategory;

    // Track index in this archipelago for phyllotaxis spiral
    const archIdx = archipelagoEntityIndexTracker.get(arch) || 0;
    archipelagoEntityIndexTracker.set(arch, archIdx + 1);

    const archCenter = archipelagoCenters.get(arch) || QUADRANT_CENTERS[effectiveCategory];

    let x = ent.x;
    let y = ent.y;

    // Check if current coordinates are invalid / in wrong quadrant
    const signX = (effectiveCategory === 'Inner' || effectiveCategory === 'Cultural') ? -1 : 1;
    const signY = (effectiveCategory === 'Inner' || effectiveCategory === 'Social') ? -1 : 1;
    const isWrongQuadrant = !isElevated && (
      (signX < 0 && x > 0) ||
      (signX > 0 && x < 0) ||
      (signY < 0 && y > 0) ||
      (signY > 0 && y < 0)
    );

    // If entity already has a custom position from user dragging/editing, preserve it strictly!
    const hasValidCustomPosition = Boolean(
      ent.isCustomPosition &&
      (x !== 0 || y !== 0) &&
      !options?.forceRecalculate
    );

    const needsPositioning = !hasValidCustomPosition && (
      options?.forceRecalculate ||
      !ent.isCustomPosition ||
      (x === 0 && y === 0)
    );

    if (needsPositioning) {
      if (isElevated) {
        const elevatedIdx = elevatedIndexTracker[effectiveCategory]++;
        const totalElevated = Math.max(1, elevatedCountInCat[effectiveCategory]);
        const elevatedPos = calculateDomainElevationPosition(ent, elevatedIdx, totalElevated);
        x = elevatedPos.x;
        y = elevatedPos.y;
      } else {
        // Golden-ratio phyllotaxis spiral around the archipelago's designated center
        const phi = 1.61803398875;
        const itemAngle = archIdx * phi * Math.PI * 2 + (archIdx % 2 === 0 ? 0.25 : -0.25);
        // For small archipelagos with 1-2 entities, keep them tight together so borders can be small
        const itemDist = archIdx === 0 ? 18 : (archIdx === 1 ? 34 : (38 + Math.sqrt(archIdx) * 38));
        x = Math.round(archCenter.x + Math.cos(itemAngle) * itemDist);
        y = Math.round(archCenter.y + Math.sin(itemAngle) * itemDist);
      }
    }

    // If entity has a custom position and is not elevated, align effective category/quadrant with its actual position on map
    if (hasValidCustomPosition && !isElevated) {
      effectiveCategory = (x < 0 && y < 0) ? 'Inner'
        : (x > 0 && y < 0) ? 'Social'
        : (x < 0 && y > 0) ? 'Cultural'
        : 'Systems';
      effectiveQuadrant = effectiveCategory;
    }

    return {
      ...ent,
      category: effectiveCategory,
      quadrant: effectiveQuadrant,
      continent: arch,
      x,
      y,
      isCustomPosition: options?.forceRecalculate ? false : (hasValidCustomPosition || Boolean(ent.isCustomPosition))
    };
  });

  // Step 5: Collision avoidance & relaxation with archipelago anchoring
  const archCentersList = Array.from(archipelagoCenters.values());
  const updatedEntities = resolveEntityOverlaps(positionedEntities, archCentersList, archipelagoCenters);

  // Step 6: Build Continents (Archipelagos) metadata, convex hulls, and label paths
  const continentMap = new Map<string, {
    category: CategoryQuadrant;
    points: [number, number][];
    count: number;
    targetCenter: { x: number; y: number };
  }>();

  updatedEntities.forEach(ent => {
    const contName = ent.continent || formatClusterWithNumber(suggestContinent(ent));
    if (!continentMap.has(contName)) {
      const quad = archipelagoMajorityQuadrant.get(contName) || ent.category || 'Inner';
      const tCenter = archipelagoCenters.get(contName) || QUADRANT_CENTERS[quad];
      continentMap.set(contName, {
        category: quad,
        points: [],
        count: 0,
        targetCenter: tCenter
      });
    }
    const data = continentMap.get(contName)!;
    // Only include terrestrial (non-elevated) entities in the archipelago landmass hull points!
    // Elevated ecotone entities occupy the central spine and should not distort the archipelago boundary.
    if (!isEntityDomainElevation(ent)) {
      data.points.push([ent.x, ent.y]);
    }
    data.count++;
  });

  const continents: ContinentInfo[] = [];

  continentMap.forEach((data, name) => {
    const catCenter = QUADRANT_CENTERS[data.category] || QUADRANT_CENTERS.Inner;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let sumX = 0;
    let sumY = 0;

    data.points.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
    });

    // If an archipelago has no terrestrial points, cluster around target center
    const pointsForHull = data.points.length > 0 ? data.points : [
      [data.targetCenter.x - 70, data.targetCenter.y - 70] as [number, number],
      [data.targetCenter.x + 70, data.targetCenter.y - 70] as [number, number],
      [data.targetCenter.x + 70, data.targetCenter.y + 70] as [number, number],
      [data.targetCenter.x - 70, data.targetCenter.y + 70] as [number, number]
    ];
    const centerX = data.points.length > 0 ? Math.round(sumX / data.points.length) : data.targetCenter.x;
    const centerY = data.points.length > 0 ? Math.round(sumY / data.points.length) : data.targetCenter.y;

    const hull = getConvexHull(pointsForHull);
    const initialPadding = data.points.length <= 2 ? 38 : 50;
    const { path: pathData, controlPoints } = createOrganicContinentPath(hull.length > 0 ? hull : pointsForHull, initialPadding);

    const margin = data.points.length <= 2 ? 38 : 55;
    const safeMinX = minX === Infinity ? centerX - 90 : minX - margin;
    const safeMaxX = maxX === -Infinity ? centerX + 90 : maxX + margin;
    const safeMinY = minY === Infinity ? centerY - 90 : minY - margin;
    const safeMaxY = maxY === -Infinity ? centerY + 90 : maxY + margin;

    const labelPath = generateContinentLabelPath(
      centerX,
      centerY,
      safeMinX,
      safeMaxX,
      safeMinY,
      safeMaxY,
      controlPoints,
      0
    );

    const subLabelPath = generateContinentLabelPath(
      centerX,
      centerY,
      safeMinX,
      safeMaxX,
      safeMinY,
      safeMaxY,
      controlPoints,
      -22
    );

    continents.push({
      name,
      category: data.category,
      color: catCenter.color,
      count: data.count,
      centerX,
      centerY,
      minX: safeMinX,
      maxX: safeMaxX,
      minY: safeMinY,
      maxY: safeMaxY,
      hullPoints: hull,
      controlPoints,
      pathData,
      labelPath,
      subLabelPath,
      visible: true
    });
  });

  // Sort continents by category, then in order (1., 2. etc.) within each quadrant
  continents.sort((a, b) => {
    if (a.category !== b.category) {
      const order = ['Inner', 'Social', 'Cultural', 'Systems'];
      return order.indexOf(a.category) - order.indexOf(b.category);
    }
    const matchA = a.name.match(/^(\d+)[\.\)]/);
    const matchB = b.name.match(/^(\d+)[\.\)]/);
    const numA = matchA ? parseInt(matchA[1], 10) : 999999;
    const numB = matchB ? parseInt(matchB[1], 10) : 999999;
    if (numA !== numB) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Sort fieldClusters by count descending (most popular first)
  fieldClusters.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // Build Ecotone Corridors
  const ecotoneCorridors = calculateEcotoneCorridors(updatedEntities);

  return { entities: updatedEntities, fieldClusters, continents, ecotoneCorridors };
}

/**
 * Cleanly recalculates archipelago positions across the entire dataset,
 * placing every archipelago into its proper quadrant and eliminating any stacked positions.
 */
export function recalculateArchipelagoLayout(
  entities: EcosystemEntity[],
  options?: { resetCustomPositions?: boolean; archipelagoQuadrantOverrides?: Record<string, CategoryQuadrant> }
): {
  entities: EcosystemEntity[];
  fieldClusters: FieldCluster[];
  continents: ContinentInfo[];
  ecotoneCorridors: EcotoneCorridorInfo[];
} {
  const prepared = entities.map(e => ({
    ...e,
    isCustomPosition: options?.resetCustomPositions ? false : e.isCustomPosition,
    x: options?.resetCustomPositions ? 0 : e.x,
    y: options?.resetCustomPositions ? 0 : e.y
  }));

  return calculateEntityLayout(prepared, {
    forceRecalculate: true,
    archipelagoQuadrantOverrides: options?.archipelagoQuadrantOverrides
  });
}

/**
 * Generates organic corridor geometry (background ribbon + label path)
 * connecting nodes belonging to an ecotone across the map quadrants.
 */
export function generateCorridorRibbonGeometry(
  points: [number, number][],
  zone: IntersectionZoneInfo,
  padding = 70
): { pathData: string; labelPath: string } {
  if (points.length === 0) {
    return { pathData: '', labelPath: '' };
  }

  // 1. Single Entity: Rounded capsule along zone axis
  if (points.length === 1) {
    const [cx, cy] = points[0];
    let angle = 0;
    if (zone.id === 'inner-systems') angle = Math.PI / 4;
    else if (zone.id === 'social-cultural') angle = -Math.PI / 4;
    else if (zone.axisType === 'cardinal') {
      angle = (zone.id === 'inner-social' || zone.id === 'cultural-systems') ? 0 : Math.PI / 2;
    }

    const halfLength = 110;
    const halfWidth = padding;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const ux = cosA;
    const uy = sinA;
    const nx = -sinA;
    const ny = cosA;

    const controlVertices: [number, number][] = [
      [Math.round(cx - ux * halfLength), Math.round(cy - uy * halfLength)],
      [Math.round(cx - ux * halfLength + nx * halfWidth * 0.7), Math.round(cy - uy * halfLength + ny * halfWidth * 0.7)],
      [Math.round(cx + nx * halfWidth), Math.round(cy + ny * halfWidth)],
      [Math.round(cx + ux * halfLength + nx * halfWidth * 0.7), Math.round(cy + ux * halfLength + ny * halfWidth * 0.7)],
      [Math.round(cx + ux * halfLength), Math.round(cy + uy * halfLength)],
      [Math.round(cx + ux * halfLength - nx * halfWidth * 0.7), Math.round(cy + ux * halfLength - ny * halfWidth * 0.7)],
      [Math.round(cx - nx * halfWidth), Math.round(cy - ny * halfWidth)],
      [Math.round(cx - ux * halfLength - nx * halfWidth * 0.7), Math.round(cy - uy * halfLength - ny * halfWidth * 0.7)],
    ];

    const pathData = createPathFromControlPoints(controlVertices);
    const labelPath = `M ${Math.round(cx - ux * (halfLength - 20))},${Math.round(cy - uy * (halfLength - 20))} L ${Math.round(cx + ux * (halfLength - 20))},${Math.round(cy + uy * (halfLength - 20))}`;
    return { pathData, labelPath };
  }

  // 2. Transdisciplinary Apex (Apex Summit): Organic multi-point convex hull
  if (zone.axisType === 'omni') {
    const hull = getConvexHull(points);
    const pts = hull.length >= 3 ? hull : points;
    const { path: pathData } = createOrganicContinentPath(pts, padding + 15);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    const labelPath = `M ${Math.round(minX - 20)},${Math.round((minY + maxY) / 2)} L ${Math.round(maxX + 20)},${Math.round((minY + maxY) / 2)}`;
    return { pathData, labelPath };
  }

  // 3. Multi-Node Corridors (Diagonal Spines & Cardinal Corridors)
  // Sort points along primary corridor axis
  const sorted = [...points].sort((a, b) => {
    if (zone.id === 'inner-systems') return (a[0] + a[1]) - (b[0] + b[1]);
    if (zone.id === 'social-cultural') return (a[0] - a[1]) - (b[0] - b[1]);
    if (zone.id === 'inner-social' || zone.id === 'cultural-systems') return a[0] - b[0];
    return a[1] - b[1]; // inner-cultural, social-systems
  });

  // Build spine waypoints (interpolate if gap is wide)
  const spine: [number, number][] = [];
  for (let i = 0; i < sorted.length; i++) {
    spine.push(sorted[i]);
    if (i < sorted.length - 1) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      if (dist > 180) {
        // Add smooth intermediate guide points along the connection
        const numInterp = dist > 350 ? 2 : 1;
        for (let k = 1; k <= numInterp; k++) {
          const t = k / (numInterp + 1);
          spine.push([
            Math.round(p1[0] + (p2[0] - p1[0]) * t),
            Math.round(p1[1] + (p2[1] - p1[1]) * t)
          ]);
        }
      }
    }
  }

  const m = spine.length;
  const leftPoints: [number, number][] = [];
  const rightPoints: [number, number][] = [];
  const W = padding;

  for (let i = 0; i < m; i++) {
    let tx = 1;
    let ty = 0;
    if (m === 1) {
      tx = 1;
      ty = 0;
    } else if (i === 0) {
      tx = spine[1][0] - spine[0][0];
      ty = spine[1][1] - spine[0][1];
    } else if (i === m - 1) {
      tx = spine[m - 1][0] - spine[m - 2][0];
      ty = spine[m - 1][1] - spine[m - 2][1];
    } else {
      tx = spine[i + 1][0] - spine[i - 1][0];
      ty = spine[i + 1][1] - spine[i - 1][1];
    }

    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len;
    const uy = ty / len;
    const nx = -uy;
    const ny = ux;

    leftPoints.push([
      Math.round(spine[i][0] + nx * W),
      Math.round(spine[i][1] + ny * W)
    ]);

    rightPoints.push([
      Math.round(spine[i][0] - nx * W),
      Math.round(spine[i][1] - ny * W)
    ]);
  }

  // End caps
  const startT = m > 1 ? [spine[1][0] - spine[0][0], spine[1][1] - spine[0][1]] : [1, 0];
  const startLen = Math.hypot(startT[0], startT[1]) || 1;
  const startUx = startT[0] / startLen;
  const startUy = startT[1] / startLen;
  const startNx = -startUy;
  const startNy = startUx;

  const endT = m > 1 ? [spine[m - 1][0] - spine[m - 2][0], spine[m - 1][1] - spine[m - 2][1]] : [1, 0];
  const endLen = Math.hypot(endT[0], endT[1]) || 1;
  const endUx = endT[0] / endLen;
  const endUy = endT[1] / endLen;
  const endNx = -endUy;
  const endNy = endUx;

  const startCap: [number, number] = [
    Math.round(spine[0][0] - startUx * (W * 0.9)),
    Math.round(spine[0][1] - startUy * (W * 0.9))
  ];
  const startCapLeft: [number, number] = [
    Math.round(spine[0][0] - startUx * (W * 0.65) + startNx * (W * 0.65)),
    Math.round(spine[0][1] - startUy * (W * 0.65) + startNy * (W * 0.65))
  ];
  const startCapRight: [number, number] = [
    Math.round(spine[0][0] - startUx * (W * 0.65) - startNx * (W * 0.65)),
    Math.round(spine[0][1] - startUy * (W * 0.65) - startNy * (W * 0.65))
  ];

  const endCap: [number, number] = [
    Math.round(spine[m - 1][0] + endUx * (W * 0.9)),
    Math.round(spine[m - 1][1] + endUy * (W * 0.9))
  ];
  const endCapLeft: [number, number] = [
    Math.round(spine[m - 1][0] + endUx * (W * 0.65) + endNx * (W * 0.65)),
    Math.round(spine[m - 1][1] + endUy * (W * 0.65) + endNy * (W * 0.65))
  ];
  const endCapRight: [number, number] = [
    Math.round(spine[m - 1][0] + endUx * (W * 0.65) - endNx * (W * 0.65)),
    Math.round(spine[m - 1][1] + endUy * (W * 0.65) - endNy * (W * 0.65))
  ];

  const controlVertices: [number, number][] = [
    startCap,
    startCapLeft,
    ...leftPoints,
    endCapLeft,
    endCap,
    endCapRight,
    ...[...rightPoints].reverse(),
    startCapRight
  ];

  const pathData = createPathFromControlPoints(controlVertices);

  // Label path along the spine (ensuring Left to Right text reading direction)
  let pStart = spine[0];
  let pEnd = spine[spine.length - 1];
  if (pStart[0] > pEnd[0] || (Math.abs(pStart[0] - pEnd[0]) < 20 && pStart[1] > pEnd[1])) {
    const temp = pStart;
    pStart = pEnd;
    pEnd = temp;
  }

  // Smooth spine label path
  const labelPath = `M ${pStart[0]},${pStart[1]} L ${pEnd[0]},${pEnd[1]}`;

  return { pathData, labelPath };
}

/**
 * Calculates ecotone corridor background landmasses connecting member entities across quadrants.
 */
export function calculateEcotoneCorridors(entities: EcosystemEntity[]): EcotoneCorridorInfo[] {
  const corridorList: EcotoneCorridorInfo[] = [];

  const zoneEntitiesMap: Record<string, EcosystemEntity[]> = {
    'inner-systems': [],
    'social-cultural': [],
    'inner-social': [],
    'social-systems': [],
    'cultural-systems': [],
    'inner-cultural': [],
    'apex-omni': []
  };

  entities.forEach(ent => {
    const zone = getEntityIntersectionZone(ent);
    if (zone && zoneEntitiesMap[zone.id]) {
      zoneEntitiesMap[zone.id].push(ent);
    }
  });

  Object.entries(INTERSECTION_ZONES).forEach(([zoneId, zone]) => {
    const zoneEntities = zoneEntitiesMap[zoneId] || [];
    const points: [number, number][] = zoneEntities.map(e => [e.x, e.y]);
    
    if (points.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let sumX = 0;
    let sumY = 0;

    points.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
    });

    const centerX = Math.round(sumX / points.length);
    const centerY = Math.round(sumY / points.length);

    const { pathData, labelPath } = generateCorridorRibbonGeometry(points, zone);

    corridorList.push({
      id: zone.id,
      name: zone.name,
      shortLabel: zone.shortLabel,
      glyph: zone.glyph,
      axisType: zone.axisType,
      quadrants: zone.quadrants,
      color: zone.badgeColor,
      entities: zoneEntities,
      points,
      count: zoneEntities.length,
      centerX,
      centerY,
      minX: minX - 80,
      maxX: maxX + 80,
      minY: minY - 80,
      maxY: maxY + 80,
      pathData,
      labelPath,
      visible: true
    });
  });

  return corridorList;
}
