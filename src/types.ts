export type CategoryQuadrant = 'Inner' | 'Social' | 'Cultural' | 'Systems';

export type EntityType = 'Organization' | 'Person' | 'Idea' | 'Media';

export type DataCompletenessLevel = 'Top 10%' | 'Top 25%' | 'Top 50%' | 'Top 75%' | 'Bottom 25%';
export type DataQualityStatus = DataCompletenessLevel; // Backward compatibility alias

export interface DataCompletenessConfig {
  level: DataCompletenessLevel;
  label: string;
  dotBg: string;
  dotBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  percentile: string;
  description: string;
}

export const DATA_COMPLETENESS_LEVELS: DataCompletenessLevel[] = [
  'Top 10%',
  'Top 25%',
  'Top 50%',
  'Top 75%',
  'Bottom 25%'
];

export const DATA_COMPLETENESS_CONFIG: Record<DataCompletenessLevel, DataCompletenessConfig> = {
  'Top 10%': {
    level: 'Top 10%',
    label: 'Top 10%',
    dotBg: '#059669', // Emerald
    dotBorder: '#FFFFFF',
    badgeBg: '#ECFDF5',
    badgeText: '#065F46',
    badgeBorder: '#A7F3D0',
    percentile: 'Top 10%',
    description: 'Top 10% completeness (>90% fields filled)'
  },
  'Top 25%': {
    level: 'Top 25%',
    label: 'Top 25%',
    dotBg: '#16A34A', // Vibrant Green
    dotBorder: '#FFFFFF',
    badgeBg: '#F0FDF4',
    badgeText: '#15803D',
    badgeBorder: '#BBF7D0',
    percentile: 'Top 25%',
    description: 'Top 25% completeness (>75% fields filled)'
  },
  'Top 50%': {
    level: 'Top 50%',
    label: 'Top 50%',
    dotBg: '#EAB308', // Amber / Yellow
    dotBorder: '#FFFFFF',
    badgeBg: '#FEFCE8',
    badgeText: '#854D0E',
    badgeBorder: '#FEF08A',
    percentile: 'Top 50%',
    description: 'Top 50% completeness (>50% fields filled)'
  },
  'Top 75%': {
    level: 'Top 75%',
    label: 'Top 75%',
    dotBg: '#F97316', // Orange
    dotBorder: '#FFFFFF',
    badgeBg: '#FFF7ED',
    badgeText: '#9A3412',
    badgeBorder: '#FED7AA',
    percentile: 'Top 75%',
    description: 'Top 75% completeness (>25% fields filled)'
  },
  'Bottom 25%': {
    level: 'Bottom 25%',
    label: 'Bottom 25%',
    dotBg: '#EF4444', // Red
    dotBorder: '#FFFFFF',
    badgeBg: '#FEF2F2',
    badgeText: '#991B1B',
    badgeBorder: '#FECACA',
    percentile: 'Bottom 25%',
    description: 'Bottom 25% completeness (<25% fields filled)'
  }
};

export const getEntityCompleteness = (entity?: { dataCompleteness?: any; dataQuality?: any } | null): DataCompletenessLevel => {
  if (!entity) return 'Bottom 25%';
  const raw = entity.dataCompleteness || entity.dataQuality;
  if (!raw) return 'Bottom 25%';

  const str = String(raw).trim();
  if (str === 'Top 10%' || str === 'Top 25%' || str === 'Top 50%' || str === 'Top 75%' || str === 'Bottom 25%') {
    return str as DataCompletenessLevel;
  }

  const clean = str.toLowerCase();
  if (clean.includes('top 10') || clean === '10%' || (clean.includes('10%') && clean.includes('top')) || clean === 'top10') {
    return 'Top 10%';
  }
  if (clean.includes('top 25') || (clean.includes('25%') && clean.includes('top')) || clean === 'top25') {
    return 'Top 25%';
  }
  if (clean.includes('top 50') || clean.includes('50%') || clean === 'top50') {
    return 'Top 50%';
  }
  if (clean.includes('top 75') || clean.includes('75%') || clean === 'top75') {
    return 'Top 75%';
  }
  if (clean.includes('bottom') || clean.includes('lowest') || clean.includes('bot 25') || (clean.includes('25%') && clean.includes('bottom'))) {
    return 'Bottom 25%';
  }

  // Handle numbers or percentages directly e.g. "95%", 0.95, 90
  const numMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    let num = parseFloat(numMatch[1]);
    if (num <= 1 && num > 0) num = num * 100;
    if (num >= 90) return 'Top 10%';
    if (num >= 75) return 'Top 25%';
    if (num >= 50) return 'Top 50%';
    if (num >= 25) return 'Top 75%';
    return 'Bottom 25%';
  }

  // Legacy mappings for backward compatibility
  if (clean.includes('verified') || clean.includes('green') || clean.includes('high')) {
    return 'Top 10%';
  }
  if (clean.includes('partial') || clean.includes('yellow') || clean.includes('medium')) {
    return 'Top 50%';
  }
  if (clean.includes('unverified') || clean.includes('red') || clean.includes('low')) {
    return 'Top 75%';
  }

  return 'Bottom 25%';
};

export const getCompletenessConfig = (level?: any): DataCompletenessConfig => {
  if (level) {
    if (typeof level === 'object' && level !== null && 'dataCompleteness' in level) {
      level = getEntityCompleteness(level);
    }
    const normalized = typeof level === 'string' && (level === 'Top 10%' || level === 'Top 25%' || level === 'Top 50%' || level === 'Top 75%' || level === 'Bottom 25%')
      ? level
      : getEntityCompleteness({ dataCompleteness: level });
    if (DATA_COMPLETENESS_CONFIG[normalized]) {
      return DATA_COMPLETENESS_CONFIG[normalized];
    }
  }
  return DATA_COMPLETENESS_CONFIG['Bottom 25%'];
};

export interface EntityShapeConfig {
  type: EntityType;
  shapeName: string;
  shapeDescription: string;
  isDisplayedOnMap: boolean;
}

export const ENTITY_SHAPE_DEFAULTS: Record<EntityType, EntityShapeConfig> = {
  Organization: {
    type: 'Organization',
    shapeName: 'Circle',
    shapeDescription: 'circle',
    isDisplayedOnMap: true
  },
  Person: {
    type: 'Person',
    shapeName: 'Lozenge',
    shapeDescription: 'lozenge',
    isDisplayedOnMap: true
  },
  Idea: {
    type: 'Idea',
    shapeName: 'Rounded Rectangle',
    shapeDescription: 'rectangle with round borders',
    isDisplayedOnMap: true
  },
  Media: {
    type: 'Media',
    shapeName: 'Rounded Square',
    shapeDescription: 'square with round borders',
    isDisplayedOnMap: false // Saved as setting: not currently displayed on map, future layer
  }
};

export type SidebarListScope =
  | { type: 'continent'; name: string }
  | { type: 'category'; category: CategoryQuadrant; entityType?: EntityType }
  | { type: 'relationship'; relationship: string; entityType?: EntityType }
  | { type: 'entityType'; entityType: EntityType | 'All' }
  | { type: 'tag'; tag: string; category?: CategoryQuadrant; facetType?: 'tag' | 'approach' | 'issues' | 'activities' }
  | { type: 'approach'; approach: string; category?: CategoryQuadrant }
  | { type: 'issues'; issue: string; category?: CategoryQuadrant }
  | { type: 'activities'; activity: string; category?: CategoryQuadrant };

export interface CommunityNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface ConnectedInstitutionNode {
  name: string;
  role: 'Partner' | 'Funder / Supporter' | 'Founder / Main Source' | 'Teacher / Influence' | 'Partner / Collaborator';
  entity?: EcosystemEntity;
}

export interface EcosystemEntity {
  id: string;
  name: string;
  type: EntityType;
  category: CategoryQuadrant;
  secondaryCategories?: CategoryQuadrant[]; // Additional quadrants this entity intersects with (e.g. ['Inner', 'Social'])
  isTransitionZone?: boolean; // Whether placed in an ecotone (intersection)
  isDomainElevation?: boolean; // Backward compatibility alias
  continent?: string; // Archipelago / Island / Cluster name e.g. "22. Regenerative Education", "1. Sanctuary of Somatics & Healing"
  otherArchipelagos?: string[]; // Other Archipelagos that aren't the first one assigned to that entity
  fields: string[]; // Keywords & Topics tags (sourced from Keywords/Topics column only)
  approach?: string[]; // Sourced from Approach column
  issues?: string[]; // Sourced from Issues column
  activities?: string[]; // Sourced from Activities column
  description: string;
  location?: string; // Country / City / Global
  language?: string; // e.g. "English", "Spanish"
  stage?: string; // e.g. "Emerging", "Established", "Movement", "Classic"
  website?: string;
  socialMedia?: Record<string, string>; // e.g. { twitter: '...', linkedin: '...', instagram: '...', youtube: '...', facebook: '...', github: '...' }
  contactEmail?: string;
  contactName?: string;
  
  // Stream / Streams (Overview column G e.g. "Stream" or "Streams")
  stream?: string;
  streams?: string[];

  // Organization structure (Column D)
  organizationStructure?: string;

  // Placement & Category (Column E & F)
  quadrant?: CategoryQuadrant;
  spreadsheetCategory?: string;

  // Sourced from spreadsheet U2 (previously S2): Overview
  ourRelationship?: string; // U2 — Our Relationship

  // Societal Sector (Overview columns L, M, N)
  societalSector?: string;
  societalSectorCatalist?: string;
  societalCategoryCatalist?: string;

  // Filled Fields & Data Completeness (Columns W & X)
  filledFields?: string | number;

  // Sourced from spreadsheet Y2 - AR2: Logistic Info
  neighborhood?: string;    // AF2 — Neighborhood or Demarcated Zone
  city?: string;            // AH2 — City
  state?: string;           // AI2 — State
  biome?: string;           // AE2 — Biome (Column AE in spreadsheet)
  bioregion?: string;       // AE2 — Bioregion (backward compatibility alias for biome)
  cityState?: string;       // AG2 — City/State
  country?: string;         // AJ2 — Country
  operatingRegion?: string; // AK2 — Operating Region
  operationFocus?: string;  // AL2 — Operation Focus
  yearFounded?: string | number; // AM2 — Year Founded
  maturityLevel?: string;   // AN2 — Maturity Level
  size?: string;            // AO2 — Size
  socialMediaReach?: string;// AP2 — Social Media Reach
  impactReach?: string;     // AQ2 — Impact Reach
  reach?: string;           // Impact Reach or Social Media Reach alias
  influence?: string;       // AR2 — Influence

  // Sourced from spreadsheet AS2 - AY2: Relationships
  founders?: string[];      // AS2 — Founder(s)/Main Source(s)
  partners?: string[];      // AT2 — Partners (Institutions)
  funders?: string[];       // AU2 — Funders/Supporters (Institutions)
  teachers?: string[];      // AV2 — Teachers/Influences (People)
  ethnicSpiritualLineages?: string[]; // AW2 — Ethnic/Spiritual Lineage(s)
  intellectualLineage?: string;       // AX2 — Intellectual Lineage (IAM)
  collaborators?: string[]; // AY2 — Partners/Collaborators (People)

  // Sourced from spreadsheet AZ2 - BX2: Worldview & Change Orientation additions
  situationalAssessmentComments?: string; // BB2 — Situational Assessment Comments/Description
  altMutua?: string;                      // BF2 — Alternative(s) Proposed (Mútua)
  valueMemeEthicalOrientation?: string;   // BH2 — Value Meme / Ethical Orientation

  // Coordinates on map canvas
  x: number;
  y: number;
  isCustomPosition?: boolean; // true if dragged manually or manually saved
  isFocusGuest?: boolean; // true when temporarily appearing in an archipelago during focus view
  focusArchipelago?: string; // name of the focused archipelago it is currently appearing in
  primaryContinentName?: string; // its primary continent while in focus view

  // Dynamic extra properties from spreadsheet columns
  extraFields?: Record<string, string | number | boolean>;

  // Categorized fields structured by the 6 standard categories
  categorizedFields?: Record<string, Record<string, any>>;

  // Media assets
  logo?: string;
  favicon?: string;

  // Data Completeness percentile tier (Top 10%, Top 25%, Top 50%, Top 75%, Bottom 25%)
  dataCompleteness?: DataCompletenessLevel;
  dataQuality?: DataCompletenessLevel; // Backward compatibility alias

  // User notes
  notes?: string;
  communityNotes?: CommunityNote[];
  featured?: boolean;
}

export interface FieldCluster {
  name: string;
  category: CategoryQuadrant;
  color: string;
  count: number;
  centerX: number;
  centerY: number;
  visible: boolean;
}

export interface ContinentInfo {
  name: string;
  category: CategoryQuadrant;
  color: string;
  description?: string;
  count: number;
  centerX: number;
  centerY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  hullPoints?: [number, number][];
  controlPoints: [number, number][];
  pathData: string;
  labelPath?: string;
  subLabelPath?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  subLabelOffsetX?: number;
  subLabelOffsetY?: number;
  visible: boolean;
  isCustomShape?: boolean;
}

export interface ArchipelagoMeta {
  quadrant?: CategoryQuadrant;
  description?: string;
  labelOffset?: { x: number; y: number };
  subLabelOffset?: { x: number; y: number };
}

export interface EcotoneCorridorInfo {
  id: string;
  name: string;
  shortLabel: string;
  glyph: string;
  axisType: 'diagonal' | 'cardinal' | 'omni';
  quadrants: CategoryQuadrant[];
  color: string;
  entities: EcosystemEntity[];
  points: [number, number][];
  count: number;
  centerX: number;
  centerY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  pathData: string;
  labelPath: string;
  visible: boolean;
}

export interface FilterState {
  searchQuery: string;
  categories: Record<CategoryQuadrant, boolean>;
  selectedCategory?: string; // Sourced from spreadsheet Category field ('All' or specific category)
  selectedCategories?: string[]; // Multi-category selection array (empty means all)
  entityTypes: Record<EntityType, boolean>;
  dataCompleteness: Record<DataCompletenessLevel, boolean>;
  dataQuality: Record<DataCompletenessLevel, boolean>; // Backward compatibility alias
  showMediaOnMap?: boolean;
  selectedContinents: string[]; // empty means all, or list of enabled continent names
  hiddenContinents: string[];   // explicitly hidden continent names
  selectedStream?: string;      // 'All' or specific stream from spreadsheet Stream / Streams column
  selectedStreams?: string[];   // Multi-stream selection array
  selectedFields: string[];     // empty means all, or list of enabled fields
  hiddenFields: string[];       // explicitly hidden field tags
  selectedLocation: string;     // 'All' or specific
  selectedLocations?: string[]; // Location multi-selection array
  selectedLanguage: string;     // 'All' or specific (AA2 — Language(s))
  selectedLanguages?: string[]; // Multi-language selection array
  selectedStage: string;        // 'All' or specific (AH2 — Maturity Level alias)
  selectedStages?: string[];    // Multi-stage selection array
  selectedOurRelationship?: string; // S2 — Our Relationship ('All' or specific)
  selectedOurRelationships?: string[]; // Multi-relationship selection array
  selectedBiome?: string;           // AE2 — Biome (Column AE in spreadsheet, 'All' or specific)
  selectedBiomes?: string[];        // Multi-biome selection array
  selectedBioregion?: string;       // Legacy alias for selectedBiome ('All' or specific)
  selectedBioregions?: string[];   // Legacy alias for selectedBiomes
  selectedCityState?: string;       // AG2 — City/State
  selectedCityStates?: string[];    // Multi-city/state selection array
  selectedCountry?: string;         // AD2 — Country ('All' or specific)
  selectedCountries?: string[];     // Multi-country selection array
  selectedOperatingRegion?: string; // AE2 — Operating Region ('All' or specific)
  selectedOperatingRegions?: string[]; // Multi-operating-region selection array
  selectedOperationFocus?: string;  // AF2 — Operation Focus ('All' or specific)
  selectedOperationFocuses?: string[]; // Multi-operation-focus selection array
  selectedMaturityLevel?: string;   // AH2 — Maturity Level ('All' or specific)
  selectedMaturityLevels?: string[]; // Multi-maturity-level selection array
  selectedSize?: string;            // AI2 — Size ('All' or specific)
  selectedSizes?: string[];         // Multi-size selection array
  selectedReach?: string;           // AJ2 — Reach ('All' or specific)
  selectedReaches?: string[];       // Multi-reach selection array
  // Advanced filters (Collapsible):
  selectedSituationalAssessment?: string; // BA2 — Situational Assessment ('All' or specific)
  selectedSituationalAssessments?: string[]; // Multi-situational-assessment selection array
  selectedValueMeme?: string;             // BH2 — Value Meme / Ethical Orientation ('All' or specific)
  selectedValueMemes?: string[];          // Multi-value-meme selection array
  selectedOrientation3H?: string;         // BO2 — Orientation to Change (Three Horizons) ('All' or specific)
  selectedOrientations3H?: string[];      // Multi-orientation-3h selection array
  selectedOrientationGtdf?: string;       // BP2 — Orientation to Change (GTDF) ('All' or specific)
  selectedOrientationsGtdf?: string[];    // Multi-orientation-gtdf selection array
  selectedOrientationCri?: string;        // BQ2 — Orientation to Change (CRI) ('All' or specific)
  selectedOrientationsCri?: string[];     // Multi-orientation-cri selection array
  selectedMatchingDatabase?: string;      // CB2 — Matching Database ('All' or specific)
  selectedMatchingDatabases?: string[];   // Multi-matching-database selection array
  onlyFeatured: boolean;
  onlyEcotones: boolean;
  onlyDomainElevation?: boolean; // Backward compatibility alias
  selectedIntersectionZone?: string; // 'All' or specific ecotone (intersection)
  selectedIntersectionZones?: string[]; // Array of selected ecotone IDs for multi-selection. Empty means 'All'
  activeLayer?: 1 | 2 | 3 | 'all'; // Map Layer filter (Layer 1 active by default)
}

export interface MapViewport {
  x: number;
  y: number;
  zoom: number;
}

export type SyncMode = 'replace' | 'append';

export interface SyncResult {
  mode: SyncMode;
  added: EcosystemEntity[];
  updated: EcosystemEntity[];
  removed?: EcosystemEntity[];
  preservedCoordinatesCount: number;
  unchangedCount: number;
  totalNew: number;
}

export type ChangelogTag = 'feature' | 'fix' | 'update' | 'release' | 'ecosystem' | 'ui';

export interface ChangelogItem {
  id: string;
  version: string;
  date: string;
  title: string;
  description?: string;
  changes: string[];
  tag?: ChangelogTag;
  author?: string;
  commitHash?: string;
  commitUrl?: string;
  source?: 'github' | 'manual';
}

export interface ChangelogConfig {
  appVersion: string;
  githubRepo: string; // e.g. "metta-earth/metta-ecosystem-map"
  githubBranch: string; // e.g. "main"
  lastSyncedAt?: string;
  entries: ChangelogItem[];
}

export interface FieldDiff {
  field: string;
  label: string;
  category?: string;
  oldValue: any;
  newValue: any;
}

export interface ContributionSubmission {
  id: string;
  entityId: string;
  entityName: string;
  submitterEmail: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  originalEntity: EcosystemEntity;
  proposedEntity: EcosystemEntity;
  diffs: FieldDiff[];
  reviewedAt?: string;
  reviewerNotes?: string;
}

export interface QuadrantDimension {
  width: number;
  height: number;
}

export type LayerQuadrantSizes = Record<CategoryQuadrant, QuadrantDimension>;

export type LayerQuadrantConfig = Record<string, LayerQuadrantSizes>;

export const DEFAULT_LAYER_QUADRANT_SIZES: LayerQuadrantConfig = {
  '1': {
    Inner: { width: 950, height: 950 },
    Social: { width: 950, height: 950 },
    Cultural: { width: 950, height: 950 },
    Systems: { width: 950, height: 950 }
  },
  '2': {
    Inner: { width: 1400, height: 1400 },
    Social: { width: 1400, height: 1400 },
    Cultural: { width: 1400, height: 1400 },
    Systems: { width: 1400, height: 1400 }
  },
  '3': {
    Inner: { width: 1600, height: 1600 },
    Social: { width: 1600, height: 1600 },
    Cultural: { width: 1600, height: 1600 },
    Systems: { width: 1600, height: 1600 }
  },
  'all': {
    Inner: { width: 1600, height: 1600 },
    Social: { width: 1600, height: 1600 },
    Cultural: { width: 1600, height: 1600 },
    Systems: { width: 1600, height: 1600 }
  }
};

export function getQuadrantSizesForLayer(
  layer: 1 | 2 | 3 | 'all' | string | number | undefined,
  config?: LayerQuadrantConfig
): LayerQuadrantSizes {
  const key = String(layer ?? 1);
  const cfg = config?.[key] || DEFAULT_LAYER_QUADRANT_SIZES[key] || DEFAULT_LAYER_QUADRANT_SIZES['1'];
  return {
    Inner: { width: cfg?.Inner?.width || 950, height: cfg?.Inner?.height || 950 },
    Social: { width: cfg?.Social?.width || 950, height: cfg?.Social?.height || 950 },
    Cultural: { width: cfg?.Cultural?.width || 950, height: cfg?.Cultural?.height || 950 },
    Systems: { width: cfg?.Systems?.width || 950, height: cfg?.Systems?.height || 950 }
  };
}

