import type { ColumnDef } from './spreadsheetSchema';
import { SPREADSHEET_COLUMNS, SPREADSHEET_CATEGORY_NAMES, cleanHeaderString, stripColLetter, findColumnDef } from './spreadsheetSchema';

export type ColumnAction = 'map_existing' | 'add_new_field' | 'ignore';
export type HeaderMatchStatus = 'matched' | 'rearranged' | 'new_field' | 'suggested_match' | 'ignored';

export interface HeaderParsingRule {
  id: string;
  sourceHeader: string;
  sourceIndex: number; // 1-based column position
  sourceLetter: string; // Excel letter e.g. 'A', 'E', 'AZ'
  targetField: string; // Canonical or custom field name
  category: string; // Category name (Overview, Logistic Info, Relationships, etc.)
  action: ColumnAction;
  status: HeaderMatchStatus;
  isCustomField?: boolean;
  previousIndex?: number;
  previousLetter?: string;
  confidence?: number;
  matchReason?: string;
  sampleValues?: string[];
}

export interface MissingCanonicalField {
  field: string;
  category: string;
  expectedLetter: string;
  expectedIndex: number;
}

export interface HeaderAnalysisResult {
  rules: HeaderParsingRule[];
  totalHeaders: number;
  matchedCount: number;
  rearrangedCount: number;
  newFieldsCount: number;
  suggestedMatchCount: number;
  ignoredCount: number;
  missingCanonicalFields: MissingCanonicalField[];
  hasChanges: boolean;
  needsVerification: boolean;
}

export const PARSING_RULES_STORAGE_KEY = 'metta_spreadsheet_parsing_rules_v2';

export const ALL_CATEGORY_OPTIONS = [
  ...SPREADSHEET_CATEGORY_NAMES,
  'Additional Data'
];

/**
 * Converts a 1-based column number (e.g. 1, 27, 53, 80) to Excel column letter.
 */
export function colNumberToLetter(colNumber: number): string {
  let temp = colNumber;
  let letter = '';
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

/**
 * Converts an Excel column letter (e.g. 'A', 'AA', 'CI') to 1-based column number.
 */
export function letterToColNumber(letter: string): number {
  const clean = letter.toUpperCase().replace(/[^A-Z]/g, '');
  let num = 0;
  for (let i = 0; i < clean.length; i++) {
    num = num * 26 + (clean.charCodeAt(i) - 64);
  }
  return num;
}

/**
 * Calculates string similarity ratio between 0 and 1 using token and bigram similarity.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  // Substring containment
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.max(0.65, minLen / maxLen);
  }

  // Bigram Dice coefficient
  const getBigrams = (s: string): Map<string, number> => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const pair = s.slice(i, i + 2);
      bigrams.set(pair, (bigrams.get(pair) || 0) + 1);
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;

  bg1.forEach((count, pair) => {
    if (bg2.has(pair)) {
      intersection += Math.min(count, bg2.get(pair)!);
    }
  });

  const totalPairs = (s1.length - 1) + (s2.length - 1);
  if (totalPairs <= 0) return 0;
  return (2.0 * intersection) / totalPairs;
}

/**
 * Finds the best matching canonical ColumnDef for a given header name,
 * returning either exact match, alias match, or best fuzzy match with confidence.
 */
export function matchHeaderToCanonical(
  rawHeader: string
): { colDef: ColumnDef; confidence: number; matchType: 'exact' | 'alias' | 'fuzzy' | 'stripped' } | null {
  const clean = cleanHeaderString(rawHeader);
  if (!clean) return null;
  const lower = clean.toLowerCase();

  // 1. Direct exact match on field
  const exact = SPREADSHEET_COLUMNS.find(c => c.field.toLowerCase() === lower);
  if (exact) {
    return { colDef: exact, confidence: 1.0, matchType: 'exact' };
  }

  // 2. Exact match on explicit aliases
  const aliasMatch = SPREADSHEET_COLUMNS.find(c => c.aliases.some(a => a.toLowerCase() === lower));
  if (aliasMatch) {
    return { colDef: aliasMatch, confidence: 0.95, matchType: 'alias' };
  }

  // 3. Stripped column letter (e.g. "Year Founded (AM)" -> "Year Founded")
  const stripped = stripColLetter(clean);
  if (stripped && stripped.toLowerCase() !== lower) {
    const sLower = stripped.toLowerCase();
    const strippedExact = SPREADSHEET_COLUMNS.find(c => c.field.toLowerCase() === sLower);
    if (strippedExact) {
      return { colDef: strippedExact, confidence: 0.95, matchType: 'stripped' };
    }
    const strippedAlias = SPREADSHEET_COLUMNS.find(c => c.aliases.some(a => a.toLowerCase() === sLower));
    if (strippedAlias) {
      return { colDef: strippedAlias, confidence: 0.9, matchType: 'stripped' };
    }
  }

  // 4. Fallback findColumnDef (handles special cases like transformation focus, situational assessment)
  const fallbackDef = findColumnDef(clean);
  if (fallbackDef) {
    return { colDef: fallbackDef, confidence: 0.9, matchType: 'alias' };
  }

  // 5. Fuzzy match across all canonical fields and aliases
  let bestDef: ColumnDef | null = null;
  let maxScore = 0;

  for (const c of SPREADSHEET_COLUMNS) {
    const fieldScore = stringSimilarity(clean, c.field);
    if (fieldScore > maxScore) {
      maxScore = fieldScore;
      bestDef = c;
    }
    for (const a of c.aliases) {
      const aliasScore = stringSimilarity(clean, a);
      if (aliasScore > maxScore) {
        maxScore = aliasScore;
        bestDef = c;
      }
    }
  }

  if (bestDef && maxScore >= 0.6) {
    return { colDef: bestDef, confidence: Math.round(maxScore * 100) / 100, matchType: 'fuzzy' };
  }

  return null;
}

// In-memory cache of customized parsing rules
let activeCustomParsingRules: HeaderParsingRule[] = [];
type RulesListener = (rules: HeaderParsingRule[]) => void;
const listeners = new Set<RulesListener>();

export function subscribeToParsingRules(listener: RulesListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyRulesListeners(): void {
  listeners.forEach(fn => {
    try {
      fn(activeCustomParsingRules);
    } catch (e) {
      console.error('Failed to notify parsing rules listener:', e);
    }
  });
}

/**
 * Load stored parsing rules from localStorage
 */
export function loadStoredParsingRules(): HeaderParsingRule[] {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PARSING_RULES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          activeCustomParsingRules = parsed;
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load parsing rules from localStorage:', e);
  }
  return activeCustomParsingRules;
}

/**
 * Save parsing rules to memory and localStorage
 */
export function saveStoredParsingRules(rules: HeaderParsingRule[]): void {
  if (!rules || !Array.isArray(rules)) return;
  activeCustomParsingRules = rules;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PARSING_RULES_STORAGE_KEY, JSON.stringify(rules));
    }
  } catch (e) {
    console.warn('Failed to save parsing rules to localStorage:', e);
  }
  notifyRulesListeners();
}

/**
 * Clear stored parsing rules from localStorage and reset to default
 */
export function clearStoredParsingRules(): void {
  activeCustomParsingRules = [];
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PARSING_RULES_STORAGE_KEY);
    }
  } catch {}
  notifyRulesListeners();
}

// Initialize activeCustomParsingRules on load
loadStoredParsingRules();

/**
 * Analyzes uploaded spreadsheet headers against existing parsing rules and canonical definitions.
 * Accurately detects:
 * - Matched columns (headers matching canonical field at expected position)
 * - Rearranged columns (headers matching canonical field, but position shifted e.g. Col E -> Col G)
 * - Brand new fields (new headers with no canonical match)
 * - Fuzzy / suggested matches (headers with high similarity to canonical fields)
 * - Missing canonical fields (canonical fields not present in the spreadsheet)
 */
export function analyzeSpreadsheetHeaders(
  rawHeaders: string[],
  sampleRows: Record<string, any>[] = [],
  storedRules: HeaderParsingRule[] = loadStoredParsingRules()
): HeaderAnalysisResult {
  const rules: HeaderParsingRule[] = [];
  const matchedCanonicalFieldSet = new Set<string>();

  // Extract non-empty sample values from the first few rows for each column
  const sampleValuesMap = new Map<number, string[]>();
  rawHeaders.forEach((_, idx) => {
    const colIdx = idx + 1;
    const samples: string[] = [];
    for (const row of sampleRows.slice(0, 8)) {
      const val = row[rawHeaders[idx]] ?? row[`Col_${colIdx}`] ?? row[`__col_${colIdx}`];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const strVal = String(val).trim();
        if (!samples.includes(strVal) && samples.length < 3) {
          samples.push(strVal);
        }
      }
    }
    sampleValuesMap.set(colIdx, samples);
  });

  // Build a lookup of existing user-saved rules by source header (clean lowercase)
  const storedRuleMap = new Map<string, HeaderParsingRule>();
  storedRules.forEach(r => {
    if (r.sourceHeader) {
      storedRuleMap.set(cleanHeaderString(r.sourceHeader).toLowerCase(), r);
    }
  });

  let matchedCount = 0;
  let rearrangedCount = 0;
  let newFieldsCount = 0;
  let suggestedMatchCount = 0;
  let ignoredCount = 0;

  rawHeaders.forEach((header, idx) => {
    const colIndex = idx + 1;
    const colLetter = colNumberToLetter(colIndex);
    const cleanedHeader = cleanHeaderString(header) || `Col_${colIndex}`;
    const headerLower = cleanedHeader.toLowerCase();
    const sampleValues = sampleValuesMap.get(colIndex) || [];

    // 1. Check if user previously saved a customized rule for this header
    const savedRule = storedRuleMap.get(headerLower);
    if (savedRule) {
      const isPositionChanged = savedRule.previousIndex !== undefined && savedRule.previousIndex !== colIndex;
      const status: HeaderMatchStatus = savedRule.action === 'ignore'
        ? 'ignored'
        : isPositionChanged
          ? 'rearranged'
          : savedRule.isCustomField ? 'new_field' : 'matched';

      if (savedRule.action === 'ignore') ignoredCount++;
      else if (isPositionChanged) rearrangedCount++;
      else if (savedRule.isCustomField) newFieldsCount++;
      else matchedCount++;

      if (savedRule.action !== 'ignore') {
        matchedCanonicalFieldSet.add(savedRule.targetField.toLowerCase());
      }

      rules.push({
        id: `rule-${colIndex}-${cleanedHeader}`,
        sourceHeader: cleanedHeader,
        sourceIndex: colIndex,
        sourceLetter: colLetter,
        targetField: savedRule.targetField,
        category: savedRule.category,
        action: savedRule.action,
        status,
        isCustomField: savedRule.isCustomField,
        previousIndex: savedRule.previousIndex || colIndex,
        previousLetter: savedRule.previousLetter || colLetter,
        confidence: savedRule.confidence ?? 1.0,
        matchReason: savedRule.matchReason || (isPositionChanged ? `Moved from Col ${savedRule.previousLetter} (#${savedRule.previousIndex})` : 'From saved parsing rule'),
        sampleValues
      });
      return;
    }

    // 2. Match against canonical SPREADSHEET_COLUMNS
    const match = matchHeaderToCanonical(cleanedHeader);

    if (match) {
      const { colDef, confidence, matchType } = match;
      const canonicalIndex = colDef.index;
      const canonicalLetter = colDef.letter;
      const isRearranged = canonicalIndex !== colIndex;

      matchedCanonicalFieldSet.add(colDef.field.toLowerCase());

      if (matchType === 'fuzzy' && confidence < 0.85) {
        suggestedMatchCount++;
        rules.push({
          id: `rule-${colIndex}-${cleanedHeader}`,
          sourceHeader: cleanedHeader,
          sourceIndex: colIndex,
          sourceLetter: colLetter,
          targetField: colDef.field,
          category: colDef.category,
          action: 'map_existing',
          status: 'suggested_match',
          isCustomField: false,
          previousIndex: canonicalIndex,
          previousLetter: canonicalLetter,
          confidence,
          matchReason: `Suggested match (${Math.round(confidence * 100)}% similarity to ${colDef.field})`,
          sampleValues
        });
      } else if (isRearranged) {
        rearrangedCount++;
        rules.push({
          id: `rule-${colIndex}-${cleanedHeader}`,
          sourceHeader: cleanedHeader,
          sourceIndex: colIndex,
          sourceLetter: colLetter,
          targetField: colDef.field,
          category: colDef.category,
          action: 'map_existing',
          status: 'rearranged',
          isCustomField: false,
          previousIndex: canonicalIndex,
          previousLetter: canonicalLetter,
          confidence,
          matchReason: `Moved from Col ${canonicalLetter} (#${canonicalIndex}) to Col ${colLetter} (#${colIndex})`,
          sampleValues
        });
      } else {
        matchedCount++;
        rules.push({
          id: `rule-${colIndex}-${cleanedHeader}`,
          sourceHeader: cleanedHeader,
          sourceIndex: colIndex,
          sourceLetter: colLetter,
          targetField: colDef.field,
          category: colDef.category,
          action: 'map_existing',
          status: 'matched',
          isCustomField: false,
          previousIndex: canonicalIndex,
          previousLetter: canonicalLetter,
          confidence: 1.0,
          matchReason: matchType === 'exact' ? 'Exact canonical match' : `Matched via alias "${cleanedHeader}"`,
          sampleValues
        });
      }
      return;
    }

    // 3. Brand New Field (does not match any canonical field or alias)
    newFieldsCount++;
    // Suggest intelligent category based on keywords in header
    let suggestedCategory = 'Additional Data';
    if (/sector|category|layer|response|stream|archipelago|domain|issue|approach|activity/i.test(cleanedHeader)) {
      suggestedCategory = 'Overview';
    } else if (/city|state|country|region|biome|location|phone|website|url|reach|size|year|found/i.test(cleanedHeader)) {
      suggestedCategory = 'Logistic Info';
    } else if (/partner|funder|founder|source|teacher|lineage|network|collab/i.test(cleanedHeader)) {
      suggestedCategory = 'Relationships';
    } else if (/theory|change|assessment|alternative|paradigm|practice|offering|horizon/i.test(cleanedHeader)) {
      suggestedCategory = 'Worldview & Change Orientation';
    } else if (/contact|email|poc/i.test(cleanedHeader)) {
      suggestedCategory = 'Warm Data';
    } else if (/concept|framework|definition|claim|argument|hypothesis|commentary|notes/i.test(cleanedHeader)) {
      suggestedCategory = 'Discourse Analysis / Argument Mapping';
    }

    rules.push({
      id: `rule-${colIndex}-${cleanedHeader}`,
      sourceHeader: cleanedHeader,
      sourceIndex: colIndex,
      sourceLetter: colLetter,
      targetField: cleanedHeader,
      category: suggestedCategory,
      action: 'add_new_field',
      status: 'new_field',
      isCustomField: true,
      confidence: 1.0,
      matchReason: 'New field detected in spreadsheet',
      sampleValues
    });
  });

  // 4. Identify missing canonical fields that are not present in the spreadsheet
  const missingCanonicalFields: MissingCanonicalField[] = [];
  SPREADSHEET_COLUMNS.forEach(colDef => {
    if (!matchedCanonicalFieldSet.has(colDef.field.toLowerCase())) {
      missingCanonicalFields.push({
        field: colDef.field,
        category: colDef.category,
        expectedLetter: colDef.letter,
        expectedIndex: colDef.index
      });
    }
  });

  const hasChanges = rearrangedCount > 0 || newFieldsCount > 0 || suggestedMatchCount > 0;
  const needsVerification = hasChanges;

  return {
    rules,
    totalHeaders: rawHeaders.length,
    matchedCount,
    rearrangedCount,
    newFieldsCount,
    suggestedMatchCount,
    ignoredCount,
    missingCanonicalFields,
    hasChanges,
    needsVerification
  };
}
