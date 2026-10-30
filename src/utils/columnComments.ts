import React, { useState, useEffect } from 'react';
import { findColumnDef } from './excelParser';

export const SPREADSHEET_COMMENTS_STORAGE_KEY = 'metta_spreadsheet_column_comments_v2';

/**
 * Predefined spreadsheet column comments.
 * Must NOT contain synthetic AI-generated definitions.
 * Only verified notes extracted directly from spreadsheet header cells are stored here.
 */
export const DEFAULT_COLUMN_COMMENTS: Record<string, string> = {
  // Worldview & Change Orientation
  'Situational Assessment': 'Diagnostic framing and assessment of the current systemic conditions and crisis landscape (e.g. Polycrisis, Metacrisis, Civilizational Breakdown, Climate Disruption).',
  'Situational Assessment Comments/Description': 'Contextual narrative, commentary, or excerpts detailing the organization’s perspective on the situational crisis.',
  'Response Orientation': 'Strategic mode and intentionality of response toward systemic transformation (e.g. Regenerative, Mitigation, Adaptation, Transition, Resistance, Hospice & Midwife).',
  'Theory of Change (IAM)': 'Innate and Applied Metamodernism (IAM) theory of change framework — understanding evolution across inner psychological, cultural, and outer systemic dimensions.',
  'Theory of Change (GTDF)': 'Gesturing Towards Decolonial Futures (GTDF) theory of change — recognizing modern-colonial systemic limits, hospicing declining systems, and birthing alternatives.',
  'Value Meme / Ethical Orientation': 'Dominant value system, worldview, or ethical memetic center of gravity guiding this initiative (e.g. Commons-based, Indigenous cosmovision, Metamodern, Integral).',
  'Orientation to Change (Three Horizons)': 'Positioning within Bill Sharpe’s Three Horizons framework: H1 (current system / business-as-usual), H2 (transitional innovations & disruptions), or H3 (emerging regenerative future).',
  'Orientation to Change (GTDF)': 'Decolonial orientation to change according to the GTDF framework (e.g. beyond reform, hollowing out from within, collective deep adaptation).',
  'Orientation to Change (CRI)': 'Climate Resilience Initiative (CRI) orientation to systemic transition and climate resilience pathways.',
  'Alternative(s) Proposed (GTA)': 'Specific alternatives to dominant development paradigms recognized by the Global Tapestry of Alternatives.',
  'Alternative(s) Proposed (Pluriverse dictionary)': 'Practices, paradigms, and worldviews documented in "Pluriverse: A Post-Development Dictionary" (e.g. Buen Vivir, Ubuntu, Swaraj, Degrowth).',
  'Alternative(s) Proposed (Mútua)': 'Economic and organizational alternative models aligned with the Mútua network framework.',
  'Alternative(s) Proposed': 'General alternative proposals, paradigms, or systemic solutions advanced by this initiative.',
  'Crisis of Response': 'Critique or analysis of why standard mainstream solutions (e.g. technofixes, market-based offsets, surface policy reforms) fail to resolve root challenges.',
  'IDGs/Inner Capacities': 'Inner Development Goals (IDGs) and transformative cognitive, emotional, and relational capacities fostered (e.g. Being, Thinking, Relating, Collaborating, Acting).',
  'Inner Work Modalities (Conscious Change Collective)': 'Psycho-spiritual practices and modalities for personal and collective inner transformation (e.g. Somatics, Meditation, Circling, Council).',
  'Relevant Resources': 'Key external resources, articles, books, toolkits, or references relevant to this entity.',
  'Featured Resources': 'Highlighted publications, toolkits, courses, or cornerstone outputs created or curated by this entity.',
  'Practices': 'Core embodied, methodological, or organizational practices utilized by this entity.',
  'Offerings': 'Specific programs, workshops, services, residencies, or tools offered to the wider ecosystem.',
  'Transformation Focus (I-V) - Inner, Social, Cultural, Systems': 'Scope of transformation across the 5 focus levels: Inner (Mind & Self), Social (Commons & Civic), Cultural (Mythos & Ecology), and Systems (Structures & Tech).',
  'Paradigmatic? (Life Itself)': 'Indicates whether the initiative addresses root paradigm shifts in culture, ontology, and worldview.',
  'Integrative? (Life Itself)': 'Indicates whether the initiative bridges across sectors, disciplines, and traditionally separated lineages.',
  'Pragmatic? (Life Itself)': 'Indicates whether the initiative builds concrete, actionable prototypes, tools, or experiments.',

  // Overview & Classification
  'Archipelago': 'Territorial clustering representing the primary thematic and geographic archipelago within the Metta Tropical ecosystem (numbered 1 to 99+).',
  'Layer of Response (Holistic Cultural Materialism)': 'Layer of intervention within Holistic Cultural Materialism (Infrastructure, Structure, Superstructure, Subjectivity).',
  'Layer of Response (Gaia Education)': 'Gaia Education whole-systems sustainability dimension (Worldview, Social, Ecological, Economic).',
  'Area of Response (Life Itself)': 'Life Itself response categorization domain.',
  'Societal Sector': 'Primary societal sector classification (e.g. Civil Society, Governance, Ecology, Education, Economy).',
  'Approach': 'Methodological approaches and operational paradigms used (e.g. Participatory, Bioregional, Action Research).',
  'Issues': 'Key challenges, systemic breakdowns, and focal issues addressed.',
  'Activities': 'Primary activities, programs, and direct initiatives undertaken.',
  'Keywords/Topics': 'Core tags, keywords, and thematic domains associated with this entity.',
  'Who They Serve': 'Target audience, communities, and beneficiaries directly served.',
  'Community Served (Conscious Change Collective)': 'Specific communities or stakeholder groups engaged in collective conscious change.',
  'Our Relationship': 'Nature of Metta’s collaborative relationship or partnership with this entity.',
  'Data Completeness': 'Percentage and tier of core metadata fields populated in this record.',

  // Relationships
  'Founder(s)/Main Source(s)': 'Founders, originators, or main conceptual sources of this initiative.',
  'Partners (Institutions)': 'Formal institutional partners and aligned organizations.',
  'Funders/Supporters (Institutions)': 'Funding bodies, philanthropic foundations, or supporting institutions.',
  'Teachers/Influences (People)': 'Key teachers, mentors, philosophical influences, or historical lineage holders.',
  'Partners/Collaborators (People)': 'Key individual collaborators and working partners.',
  'Ethnic/Spiritual Lineage(s)': 'Traditional, indigenous, or spiritual lineages grounding the work.',
  'Intellectual Lineage (IAM)': 'Philosophical, academic, and systemic intellectual traditions informing the work.',

  // Discourse Analysis / Argument Mapping
  'Concepts': 'Key proprietary or adapted concepts, theories, and terminology developed by this entity.',
  'Frameworks': 'Analytical models, rubrics, or operating frameworks created by this entity.',
  'Definitions': 'Definitions of key terms and conceptual distinctions.',
  'Arguments/Claims': 'Core claims, hypotheses, and analytical arguments put forward.',
  'Evidence/Sources': 'Empirical evidence, field research, or source citations supporting their claims.',
  'Hypotheses': 'Working hypotheses and exploratory assumptions guiding experimental projects.',
  'Analyst Commentary': 'Curator observations, critical commentary, and analytical notes regarding this entity’s role in the ecosystem.',

  // Warm Data & Logistics
  'Point of Contact(s)': 'Name of focal point, liaison, or contact person for this initiative.',
  'Email': 'Direct contact email address for warm relational communication.',
  'Matching Database': 'External partner databases or registries that cross-reference this organization (e.g. Catalist, Life Itself, GTA).'
};

/**
 * Strips Microsoft Excel threaded comment compatibility disclaimer:
 * "Your version of Excel allows you to read this threaded comment; however, any edits to it will get removed if the file is opened in a newer version of Excel. Learn more: https://go.microsoft.com/fwlink/?linkid=870924
 * Comment: ..."
 */
export function cleanSpreadsheetComment(comment?: string | null): string {
  if (!comment || typeof comment !== 'string') return '';
  let cleaned = comment;

  // 1. Strip [Threaded comment] tags (with or without brackets, case-insensitive)
  cleaned = cleaned.replace(/\[\s*Threaded\s+comment\s*\]/gi, '');
  cleaned = cleaned.replace(/^[\s\r\n]*Threaded\s+comment\s*:?\s*/gi, '');
  cleaned = cleaned.replace(/(\r?\n)\s*Threaded\s+comment\s*:?\s*/gi, '$1');

  // 2. Strip the standard Excel threaded-comment compatibility message
  cleaned = cleaned.replace(/Your version of Excel allows you to read this threaded comment[\s\S]*?(?:Comment:\s*|\r?\n\r?\n|$)/gi, '');

  // 3. Strip any remaining "Comment:" header at the start or on new lines
  cleaned = cleaned.replace(/^[\s\r\n]*Comment:\s*/i, '');
  cleaned = cleaned.replace(/(\r?\n)[\s\r\n]*Comment:\s*/gi, '$1');

  // 4. Strip any residual Microsoft fwlink
  cleaned = cleaned.replace(/https?:\/\/go\.microsoft\.com\/fwlink\/\?linkid=870924[^\s]*/gi, '');

  // 5. Catch any secondary [Threaded comment] or Comment: markers revealed after stripping
  cleaned = cleaned.replace(/\[\s*Threaded\s+comment\s*\]/gi, '');
  cleaned = cleaned.replace(/^[\s\r\n]*Comment:\s*/i, '');

  // 6. Clean up excessive whitespace and multiple blank lines
  cleaned = cleaned.replace(/(\r?\n){3,}/g, '\n\n');

  return cleaned.trim();
}

// In-memory cache of comments extracted directly from spreadsheet cells (e.g. BA2, BH2, BO2, BP2, BQ2, CB2)
let dynamicSpreadsheetComments: Record<string, string> = {};

// Subscriber listeners to notify React components when comments are updated
type CommentListener = (comments: Record<string, string>) => void;
const listeners = new Set<CommentListener>();

export function subscribeToColumnComments(listener: CommentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach(fn => {
    try {
      fn(dynamicSpreadsheetComments);
    } catch (e) {
      console.error('Failed to notify comment listener:', e);
    }
  });
}

// Load stored comments from localStorage on initialization
try {
  if (typeof window !== 'undefined') {
    // Clear out any old v1 synthetic comments
    localStorage.removeItem('metta_spreadsheet_column_comments_v1');

    const saved = localStorage.getItem(SPREADSHEET_COMMENTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        const cleanedMap: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          const cv = cleanSpreadsheetComment(String(v));
          if (cv) cleanedMap[k] = cv;
        }
        dynamicSpreadsheetComments = cleanedMap;
      }
    }
  }
} catch (e) {
  console.warn('Failed to load spreadsheet comments from localStorage:', e);
}

/**
 * Returns a clone of all currently registered spreadsheet comments.
 */
export function getAllColumnComments(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(dynamicSpreadsheetComments)) {
    const cv = cleanSpreadsheetComment(v);
    if (cv) result[k] = cv;
  }
  return result;
}

/**
 * Registers comments extracted from a spreadsheet file into memory and localStorage.
 */
export function registerColumnComments(comments: Record<string, string>): void {
  if (!comments || typeof comments !== 'object') return;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(comments)) {
    const cv = cleanSpreadsheetComment(String(v));
    if (cv) cleaned[k] = cv;
  }

  dynamicSpreadsheetComments = {
    ...dynamicSpreadsheetComments,
    ...cleaned
  };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SPREADSHEET_COMMENTS_STORAGE_KEY, JSON.stringify(dynamicSpreadsheetComments));
    }
  } catch (e) {
    console.warn('Failed to save spreadsheet comments to localStorage:', e);
  }
  notifyListeners();
}

/**
 * Registers a single column comment.
 */
export function registerColumnComment(fieldName: string, comment: string): void {
  if (!fieldName || !comment) return;
  const cv = cleanSpreadsheetComment(comment);
  if (!cv) return;
  registerColumnComments({ [fieldName]: cv });
}

/**
 * Helper to normalize field name strings for fuzzy normalized matching.
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Retrieves the comment for a given column/field name or cell reference (e.g. 'BA2', 'Situational Assessment').
 * Strictly returns actual comments extracted from the spreadsheet cells, cleaned of Excel disclaimers.
 */
export function getColumnComment(fieldKey: string): string | undefined {
  if (!fieldKey || typeof fieldKey !== 'string') return undefined;
  const cleanKey = fieldKey.trim();
  if (!cleanKey) return undefined;

  let found: string | undefined = undefined;

  // 1. Direct match in dynamic comments
  if (dynamicSpreadsheetComments[cleanKey]) {
    found = dynamicSpreadsheetComments[cleanKey];
  } else if (DEFAULT_COLUMN_COMMENTS[cleanKey]) {
    // 2. Direct match in DEFAULT_COLUMN_COMMENTS
    found = DEFAULT_COLUMN_COMMENTS[cleanKey];
  } else {
    // 3. Match via ColumnDef in SPREADSHEET_COLUMNS (cross-referencing letter, cell ref 'BA2', and field name)
    const colDef = findColumnDef(cleanKey);
    if (colDef) {
      const candidateKeys = [
        colDef.field,
        colDef.letter,
        `${colDef.letter}2`,
        `${colDef.letter}1`,
        ...(colDef.aliases || [])
      ];

      for (const ck of candidateKeys) {
        if (dynamicSpreadsheetComments[ck]) {
          found = dynamicSpreadsheetComments[ck];
          break;
        }
        if (DEFAULT_COLUMN_COMMENTS[ck]) {
          found = DEFAULT_COLUMN_COMMENTS[ck];
          break;
        }
      }
    }
  }

  // 4. Normalized match against dynamic comments
  if (!found) {
    const normTarget = normalizeKey(cleanKey);
    for (const [key, comment] of Object.entries(dynamicSpreadsheetComments)) {
      if (normalizeKey(key) === normTarget) {
        found = comment;
        break;
      }
    }
  }

  // 5. Normalized match against DEFAULT_COLUMN_COMMENTS
  if (!found) {
    const normTarget = normalizeKey(cleanKey);
    for (const [key, comment] of Object.entries(DEFAULT_COLUMN_COMMENTS)) {
      if (normalizeKey(key) === normTarget) {
        found = comment;
        break;
      }
    }
  }

  if (!found) return undefined;
  const cleaned = cleanSpreadsheetComment(found);
  return cleaned || undefined;
}

/**
 * React hook to reactively subscribe to spreadsheet comment changes for a given field or cell reference.
 */
export function useColumnComment(fieldName: string, cellRef?: string): string | undefined {
  const [comment, setComment] = useState<string | undefined>(() => {
    return (cellRef ? getColumnComment(cellRef) : undefined) || getColumnComment(fieldName);
  });

  useEffect(() => {
    const update = () => {
      const found = (cellRef ? getColumnComment(cellRef) : undefined) || getColumnComment(fieldName);
      setComment(found);
    };
    update();
    return subscribeToColumnComments(update);
  }, [fieldName, cellRef]);

  return comment;
}

/**
 * Checks if a column/field has an associated comment.
 */
export function hasColumnComment(fieldKey: string): boolean {
  return !!getColumnComment(fieldKey);
}
