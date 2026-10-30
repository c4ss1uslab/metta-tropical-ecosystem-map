import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { CategoryQuadrant, EcosystemEntity, EntityType, DataQualityStatus, DataCompletenessLevel, ConnectedInstitutionNode } from '../types';
import { suggestContinent, formatClusterWithNumber, getEntityOtherArchipelagos, entityMatchesArchipelago, getArchipelagoQuadrant, filterProfileTags } from './layoutGenerator';
import { parseSocialProfilesField, isTransformationFocusValue, isTransformationFocusField, cleanWebsiteUrl, formatDisplayUrl } from './socialMedia';
import { registerColumnComments, cleanSpreadsheetComment } from './columnComments';
import { HeaderParsingRule, HeaderAnalysisResult, analyzeSpreadsheetHeaders, loadStoredParsingRules } from './parsingRules';
import type { ColumnDef } from './spreadsheetSchema';
import {
  SPREADSHEET_COLUMNS,
  OBSOLETE_FABRICATED_FIELDS,
  SPREADSHEET_CATEGORY_NAMES,
  ANALYST_COMMENTARY_ALIASES,
  cleanHeaderString,
  stripColLetter,
  findColumnDef
} from './spreadsheetSchema';

export type { ColumnDef };
export {
  SPREADSHEET_COLUMNS,
  OBSOLETE_FABRICATED_FIELDS,
  SPREADSHEET_CATEGORY_NAMES,
  ANALYST_COMMENTARY_ALIASES,
  cleanHeaderString,
  stripColLetter,
  findColumnDef
};

/**
 * Parses partner / funder institution lists from spreadsheet fields (AM2 & AN2).
 * Handles comma, semicolon, newline, bullet points, and pipe delimiters.
 * Strips quotes, clean trims, and filters empty / placeholder values (e.g. "None", "N/A", "-").
 */
export function parseInstitutionList(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(v => String(v).trim()).filter(v => v.length > 0 && v !== '-' && v.toLowerCase() !== 'n/a' && v.toLowerCase() !== 'none');
  }
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none' || str.toLowerCase() === 'null') {
    return [];
  }
  return str
    .split(/[\n,;|•\r]+/)
    .map(s => s.trim().replace(/^[-*•\s]+/, '').replace(/^["']|["']$/g, '').trim())
    .filter(s => s.length > 0 && s !== '-' && s.toLowerCase() !== 'n/a' && s.toLowerCase() !== 'none' && s.toLowerCase() !== 'null');
}

/**
 * Normalizes a language name to standard title case (e.g. "portuguese" -> "Portuguese").
 */
export function normalizeLanguageName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Splits raw spreadsheet language strings into discrete, normalized individual languages.
 * Handles semicolons, commas, slashes, pipes, backslashes, newlines, and bullet points.
 * E.g., "English; Swedish" -> ["English", "Swedish"]
 *       "Portuguese; English" -> ["Portuguese", "English"]
 * Strips quotes, trims whitespace, and deduplicates while normalizing case.
 */
export function splitLanguageValues(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    const set = new Set<string>();
    raw.forEach(r => {
      splitLanguageValues(r).forEach(l => set.add(l));
    });
    return Array.from(set);
  }
  const str = String(raw).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none' || str.toLowerCase() === 'null') {
    return [];
  }
  const set = new Set<string>();
  str
    .split(/[\n,;/|\\•\r]+/)
    .map(s => s.trim().replace(/^[-*•\s]+/, '').replace(/^["']|["']$/g, '').trim())
    .filter(s => s.length > 0 && s !== '-' && s.toLowerCase() !== 'n/a' && s.toLowerCase() !== 'none' && s.toLowerCase() !== 'null')
    .forEach(l => {
      const normalized = normalizeLanguageName(l);
      if (normalized) {
        set.add(normalized);
      }
    });
  return Array.from(set);
}

/**
 * Extracts connected institution nodes from an entity's fields (sourced from AT2 and AU2 / legacy AM2 and AN2).
 * AT2: Partners (Institutions)
 * AU2: Funders/Supporters (Institutions)
 *
 * Checks if the institutions exist as entities within the ecosystem dataset.
 * If neither AT2 nor AU2 has any listed institution, returns an empty array.
 */
export function getEntityConnectedNodes(
  entity: EcosystemEntity,
  allEntities: EcosystemEntity[] = []
): ConnectedInstitutionNode[] {
  if (!entity) return [];

  // 1. Founders / Main Sources from AS2 (legacy AL2)
  const rawFounders = entity.founders ||
    parseInstitutionList(
      entity.categorizedFields?.['Relationships']?.['Founder(s)/Main Source(s)'] ||
      entity.extraFields?.['Founder(s)/Main Source(s)'] ||
      entity.extraFields?.['__col_45'] ||
      entity.extraFields?.['__col_38']
    );

  // 2. Partners (Institutions) from AT2 (legacy AM2)
  const rawPartners = entity.partners ||
    parseInstitutionList(
      entity.categorizedFields?.['Relationships']?.['Partners (Institutions)'] ||
      entity.extraFields?.['Partners (Institutions)'] ||
      entity.extraFields?.['__col_46'] ||
      entity.extraFields?.['__col_39']
    );

  // 3. Funders/Supporters (Institutions) from AU2 (legacy AN2)
  const rawFunders = entity.funders ||
    parseInstitutionList(
      entity.categorizedFields?.['Relationships']?.['Funders/Supporters (Institutions)'] ||
      entity.extraFields?.['Funders/Supporters (Institutions)'] ||
      entity.extraFields?.['__col_47'] ||
      entity.extraFields?.['__col_40']
    );

  // 4. Teachers/Influences (People) from AV2 (legacy AO2)
  const rawTeachers = entity.teachers ||
    parseInstitutionList(
      entity.categorizedFields?.['Relationships']?.['Teachers/Influences (People)'] ||
      entity.extraFields?.['Teachers/Influences (People)'] ||
      entity.extraFields?.['__col_48'] ||
      entity.extraFields?.['__col_41']
    );

  // 5. Partners/Collaborators (People) from AY2 (legacy AQ2)
  const rawCollaborators = entity.collaborators ||
    parseInstitutionList(
      entity.categorizedFields?.['Relationships']?.['Partners/Collaborators (People)'] ||
      entity.extraFields?.['Partners/Collaborators (People)'] ||
      entity.extraFields?.['__col_51'] ||
      entity.extraFields?.['__col_43']
    );

  const results: ConnectedInstitutionNode[] = [];
  const seenNames = new Set<string>();
  const seenEntityIds = new Set<string>();

  const findMatchingEntity = (name: string): EcosystemEntity | undefined => {
    const cleanName = name.toLowerCase().trim();
    if (!cleanName) return undefined;
    return allEntities.find(other => {
      if (other.id === entity.id) return false;
      const otherName = other.name.toLowerCase().trim();
      const otherId = other.id.toLowerCase().trim();
      return otherName === cleanName ||
        otherId === cleanName ||
        (cleanName.length >= 6 && otherName.includes(cleanName)) ||
        (otherName.length >= 6 && cleanName.includes(otherName));
    });
  };

  const addNode = (name: string, role: ConnectedInstitutionNode['role'], prefix: string, explicitEntity?: EcosystemEntity) => {
    const clean = name.trim();
    const key = `${prefix}::${clean.toLowerCase()}`;
    const matched = explicitEntity || findMatchingEntity(clean);

    if (matched && seenEntityIds.has(matched.id)) {
      return;
    }

    if (clean && !seenNames.has(key)) {
      seenNames.add(key);
      if (matched) {
        seenEntityIds.add(matched.id);
      }
      results.push({
        name: clean,
        role,
        entity: matched
      });
    }
  };

  rawPartners.forEach(p => addNode(p, 'Partner', 'partner'));
  rawFunders.forEach(f => addNode(f, 'Funder / Supporter', 'funder'));
  rawFounders.forEach(f => addNode(f, 'Founder / Main Source', 'founder'));
  rawTeachers.forEach(t => addNode(t, 'Teacher / Influence', 'teacher'));
  rawCollaborators.forEach(c => addNode(c, 'Partner / Collaborator', 'collaborator'));

  // Also include reciprocal connections from other entities in the ecosystem that directly link this entity in the spreadsheet
  if (allEntities && allEntities.length > 0) {
    allEntities.forEach(other => {
      if (other.id === entity.id) return;
      if (seenEntityIds.has(other.id)) return;

      const otherFounders = other.founders || parseInstitutionList(other.categorizedFields?.['Relationships']?.['Founder(s)/Main Source(s)'] || other.extraFields?.['Founder(s)/Main Source(s)']);
      const otherPartners = other.partners || parseInstitutionList(other.categorizedFields?.['Relationships']?.['Partners (Institutions)'] || other.extraFields?.['Partners (Institutions)']);
      const otherFunders = other.funders || parseInstitutionList(other.categorizedFields?.['Relationships']?.['Funders/Supporters (Institutions)'] || other.extraFields?.['Funders/Supporters (Institutions)']);
      const otherTeachers = other.teachers || parseInstitutionList(other.categorizedFields?.['Relationships']?.['Teachers/Influences (People)'] || other.extraFields?.['Teachers/Influences (People)']);
      const otherCollaborators = other.collaborators || parseInstitutionList(other.categorizedFields?.['Relationships']?.['Partners/Collaborators (People)'] || other.extraFields?.['Partners/Collaborators (People)']);

      if (otherPartners.some(p => matchesEntityTarget(p, entity))) {
        addNode(other.name, 'Partner', 'partner', other);
      } else if (otherCollaborators.some(c => matchesEntityTarget(c, entity))) {
        addNode(other.name, 'Partner / Collaborator', 'collaborator', other);
      } else if (otherFunders.some(f => matchesEntityTarget(f, entity))) {
        addNode(other.name, 'Funder / Supporter', 'funder', other);
      } else if (otherFounders.some(f => matchesEntityTarget(f, entity))) {
        addNode(other.name, 'Founder / Main Source', 'founder', other);
      } else if (otherTeachers.some(t => matchesEntityTarget(t, entity))) {
        addNode(other.name, 'Teacher / Influence', 'teacher', other);
      }
    });
  }

  return results;
}

/**
 * Extracts all raw relationship institution/person strings defined for an entity in the spreadsheet.
 * Corresponds to columns AL2 - AQ2 (Relationships category) and explicit connection fields.
 */
export function getEntityRelationshipStrings(entity: EcosystemEntity): string[] {
  if (!entity) return [];
  const list: string[] = [];

  const addItems = (items?: string[] | string | unknown) => {
    if (!items) return;
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (typeof item === 'string' && item.trim()) {
          list.push(item.trim());
        }
      });
    } else if (typeof items === 'string' && items.trim()) {
      parseInstitutionList(items).forEach(item => {
        if (item.trim()) list.push(item.trim());
      });
    }
  };

  // Direct parsed arrays (AS2 - AY2 / legacy AL2 - AQ2)
  addItems(entity.partners);
  addItems(entity.funders);
  addItems(entity.founders);
  addItems(entity.teachers);
  addItems(entity.collaborators);
  addItems(entity.ethnicSpiritualLineages);
  addItems(entity.intellectualLineage);

  // Categorized fields under 'Relationships'
  if (entity.categorizedFields?.['Relationships']) {
    Object.values(entity.categorizedFields['Relationships']).forEach(val => {
      addItems(val);
    });
  }

  // Extra / unmapped spreadsheet columns
  if (entity.extraFields) {
    [
      'Founder(s)/Main Source(s)',
      'Partners (Institutions)',
      'Funders/Supporters (Institutions)',
      'Teachers/Influences (People)',
      'Ethnic/Spiritual Lineage(s)',
      'Intellectual Lineage (IAM)',
      'Partners/Collaborators (People)',
      'Connections',
      'Connected',
      'Partners',
      'Funders',
      'Network',
      'Our Relationship',
      'Relationship',
      '__col_45',
      '__col_46',
      '__col_47',
      '__col_48',
      '__col_49',
      '__col_50',
      '__col_51',
      '__col_38',
      '__col_39',
      '__col_40',
      '__col_41',
      '__col_43'
    ].forEach(k => {
      if (entity.extraFields?.[k]) {
        addItems(entity.extraFields[k]);
      }
    });
  }

  return list;
}

/**
 * Checks if a relationship string refers to a specific target entity.
 */
export function matchesEntityTarget(relString: string, target: EcosystemEntity): boolean {
  if (!relString || !target) return false;
  const cleanRel = relString.toLowerCase().trim();
  if (!cleanRel) return false;

  const targetName = target.name.toLowerCase().trim();
  const targetId = target.id.toLowerCase().trim();

  // Exact match on name or ID
  if (cleanRel === targetName || cleanRel === targetId) return true;

  // Check without parenthesis acronyms (e.g., "Inner Development Goals" matches "Inner Development Goals (IDG)")
  const cleanRelNoParen = cleanRel.replace(/\s*\([^)]*\)/g, '').trim();
  const targetNameNoParen = targetName.replace(/\s*\([^)]*\)/g, '').trim();

  if (cleanRelNoParen && targetNameNoParen && cleanRelNoParen === targetNameNoParen) return true;

  // Substring match for names of meaningful length (>= 6 characters)
  if (cleanRel.length >= 6 && targetName.length >= 6) {
    if (targetName.includes(cleanRel) || cleanRel.includes(targetName)) {
      return true;
    }
  }

  if (cleanRelNoParen.length >= 6 && targetNameNoParen.length >= 6) {
    if (targetNameNoParen.includes(cleanRelNoParen) || cleanRelNoParen.includes(targetNameNoParen)) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether two entities are directly linked in the spreadsheet.
 * Matches if entity A explicitly references entity B in its spreadsheet relationships,
 * or if entity B explicitly references entity A.
 * This directly matches the connections displayed in the Right Sidebar.
 */
export function areEntitiesDirectlyLinked(
  a: EcosystemEntity,
  b: EcosystemEntity
): boolean {
  if (!a || !b || a.id === b.id) return false;

  // Check if A explicitly links to B in spreadsheet relationships
  const aRels = getEntityRelationshipStrings(a);
  if (aRels.some(rel => matchesEntityTarget(rel, b))) {
    return true;
  }

  // Check if B explicitly links to A in spreadsheet relationships
  const bRels = getEntityRelationshipStrings(b);
  if (bRels.some(rel => matchesEntityTarget(rel, a))) {
    return true;
  }

  return false;
}

/**
 * Returns all entities in allEntities that have a direct spreadsheet link with the given entity.
 */
export function getDirectlyLinkedEntities(
  sourceEntity: EcosystemEntity,
  allEntities: EcosystemEntity[]
): EcosystemEntity[] {
  if (!sourceEntity || !allEntities) return [];
  return allEntities.filter(target => areEntitiesDirectlyLinked(sourceEntity, target));
}

/**


/**
 * Normalizes category string to one of the 4 main quadrants
 */
export function normalizeCategory(val?: string): CategoryQuadrant {
  if (!val) return 'Inner';
  const clean = val.trim().toLowerCase();

  // Systems Change (bottom-right / quadrant 4)
  if (
    clean.includes('system') ||
    clean.includes('economic') ||
    clean.includes('doughnut') ||
    clean.includes('post-growth') ||
    clean.includes('planetary') ||
    clean.includes('circular') ||
    clean.includes('biomimicry') ||
    clean.includes('agriculture') ||
    clean.includes('bottom right') ||
    clean.includes('quadrant 4') ||
    clean === 'systems' ||
    clean === 'sys'
  ) {
    return 'Systems';
  }

  // Cultural Change / Regeneration (bottom-left / quadrant 3)
  if (
    clean.includes('cultural') ||
    clean.includes('culture') ||
    clean.includes('indigenous') ||
    clean.includes('ancestral') ||
    clean.includes('narrative') ||
    clean.includes('myth') ||
    clean.includes('lore') ||
    clean.includes('decolonial') ||
    clean.includes('worldview') ||
    clean.includes('bottom left') ||
    clean.includes('quadrant 3') ||
    clean === 'cultural' ||
    clean === 'cult'
  ) {
    return 'Cultural';
  }

  // Social Change / Transformation (top-right / quadrant 2)
  if (
    clean.includes('social') ||
    clean.includes('civic') ||
    clean.includes('community') ||
    clean.includes('commons') ||
    clean.includes('solidarity') ||
    clean.includes('mutual') ||
    clean.includes('weaving') ||
    clean.includes('cooperative') ||
    clean.includes('coop') ||
    clean.includes('upper right') ||
    clean.includes('quadrant 2') ||
    clean === 'social' ||
    clean === 'soc'
  ) {
    return 'Social';
  }

  // Inner Change (top-left / quadrant 1)
  if (
    clean.includes('inner') ||
    clean.includes('somatic') ||
    clean.includes('healing') ||
    clean.includes('contemplat') ||
    clean.includes('personal') ||
    clean.includes('mind') ||
    clean.includes('psycholog') ||
    clean.includes('spiritual') ||
    clean.includes('upper left') ||
    clean.includes('quadrant 1') ||
    clean === 'inner'
  ) {
    return 'Inner';
  }

  return 'Inner';
}

/**
 * Normalizes type string
 */
export function normalizeType(val?: string): EntityType {
  if (!val) return 'Organization';
  const clean = val.trim().toLowerCase();
  if (clean.includes('person') || clean.includes('individual') || clean.includes('people') || clean.includes('fellow')) {
    return 'Person';
  }
  if (clean.includes('idea')) {
    return 'Idea';
  }
  if (clean.includes('media') || clean.includes('press') || clean.includes('podcast') || clean.includes('publication') || clean.includes('journal') || clean.includes('channel') || clean.includes('broadcast')) {
    return 'Media';
  }
  return 'Organization';
}

/**
 * Normalizes data completeness percentile string from spreadsheet
 * 5 levels: 'Top 10%', 'Top 25%', 'Top 50%', 'Top 75%', 'Bottom 25%'
 */
export function normalizeDataCompleteness(val?: any, filledFieldsVal?: any): DataCompletenessLevel {
  if (val !== undefined && val !== null) {
    const str = String(val).trim();
    if (str) {
      if (str === 'Top 10%' || str === 'Top 25%' || str === 'Top 50%' || str === 'Top 75%' || str === 'Bottom 25%') {
        return str as DataCompletenessLevel;
      }

      const clean = str.toLowerCase();

      // Explicit percentile / tier match
      if (clean.includes('bottom') || clean.includes('lowest') || clean.includes('bot 25') || (clean.includes('25%') && clean.includes('bottom')) || clean === 'bot25') {
        return 'Bottom 25%';
      }
      if (clean.includes('top 10') || clean === '10%' || (clean.includes('10%') && clean.includes('top')) || clean === 'top10') {
        return 'Top 10%';
      }
      if (clean.includes('top 25') || (clean.includes('25%') && clean.includes('top')) || clean === 'top25') {
        return 'Top 25%';
      }
      if (clean.includes('top 50') || clean === '50%' || clean === 'top50' || (clean.includes('50%') && clean.includes('top'))) {
        return 'Top 50%';
      }
      if (clean.includes('top 75') || clean === '75%' || clean === 'top75' || (clean.includes('75%') && clean.includes('top'))) {
        return 'Top 75%';
      }

      // Handle direct numbers or percentage strings e.g. "95%", "92", 0.85
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
    }
  }

  // Fallback to Column W: Filled Fields percentile ranking if Column X was missing or empty
  if (filledFieldsVal !== undefined && filledFieldsVal !== null) {
    const ffNum = parseInt(String(filledFieldsVal).replace(/[^\d]/g, ''), 10);
    if (!isNaN(ffNum) && ffNum > 0) {
      if (ffNum >= 32) return 'Top 10%';
      if (ffNum >= 26) return 'Top 25%';
      if (ffNum >= 18) return 'Top 50%';
      if (ffNum >= 13) return 'Top 75%';
      return 'Bottom 25%';
    }
  }

  return 'Bottom 25%';
}

export const normalizeDataQuality = normalizeDataCompleteness;

/**
 * Normalizes field/approach tags
 */
export function parseFields(val?: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
  if (typeof val === 'string') {
    return val.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
  }
  return [String(val).trim()];
}



export interface ParsedSpreadsheetResult {
  entities: EcosystemEntity[];
  rawHeaders: string[];
  columnComments?: Record<string, string>;
  rawRows: Record<string, any>[];
  analysis: HeaderAnalysisResult;
}

/**
 * Parses file from ArrayBuffer / File (.xlsx or .csv)
 */
export async function parseFileToEntities(
  file: File,
  allowedEntityTypes?: EntityType[],
  customRules?: HeaderParsingRule[]
): Promise<ParsedSpreadsheetResult> {
  const fileName = file.name.toLowerCase();
  let result: ParsedSpreadsheetResult;
  if (fileName.endsWith('.csv')) {
    result = await parseCsvFile(file, customRules);
  } else {
    result = await parseXlsxFile(file, customRules);
  }

  if (allowedEntityTypes && allowedEntityTypes.length > 0) {
    result.entities = result.entities.filter(e => allowedEntityTypes.includes(e.type));
  }
  return result;
}

/**
 * Ensures all entities in a dataset have strictly unique IDs.
 * If duplicate IDs are encountered (e.g. from repeated Org IDs in spreadsheet rows or duplicate records),
 * subsequent occurrences are disambiguated (e.g. "275_2", "275_3") while preserving
 * the entity's underlying field data, coordinates, and notes.
 */
export function ensureUniqueEntityIds(entities: EcosystemEntity[]): EcosystemEntity[] {
  if (!entities || !Array.isArray(entities)) return [];
  const seenIds = new Set<string>();

  return entities.map((ent, idx) => {
    let id = ent.id ? String(ent.id).trim() : '';
    if (!id) {
      const safeName = (ent.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      id = `ent-${idx + 1}-${safeName || 'node'}`;
    }

    if (seenIds.has(id)) {
      let counter = 2;
      let disambiguatedId = `${id}_${counter}`;
      while (seenIds.has(disambiguatedId)) {
        counter++;
        disambiguatedId = `${id}_${counter}`;
      }
      id = disambiguatedId;
    }

    seenIds.add(id);

    if (ent.id === id) {
      return ent;
    }

    return {
      ...ent,
      id
    };
  });
}

/**
 * Re-maps raw row data to EcosystemEntity instances using updated parsing rules.
 */
export function remapRowsToEntities(
  rows: Record<string, any>[],
  headers: string[],
  rules: HeaderParsingRule[],
  allowedEntityTypes?: EntityType[]
): EcosystemEntity[] {
  let entities = mapRowsToEntities(rows, headers, rules);
  if (allowedEntityTypes && allowedEntityTypes.length > 0) {
    entities = entities.filter(e => allowedEntityTypes.includes(e.type));
  }
  return ensureUniqueEntityIds(entities);
}

async function parseCsvFile(
  file: File,
  customRules?: HeaderParsingRule[]
): Promise<ParsedSpreadsheetResult> {
  const csvText = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(csvText, {
      header: false,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      comments: false,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results) => {
        const rawRows = results.data;
        if (!rawRows || rawRows.length === 0) {
          const emptyAnalysis: HeaderAnalysisResult = {
            rules: [],
            totalHeaders: 0,
            matchedCount: 0,
            rearrangedCount: 0,
            newFieldsCount: 0,
            suggestedMatchCount: 0,
            ignoredCount: 0,
            missingCanonicalFields: [],
            hasChanges: false,
            needsVerification: false
          };
          resolve({ entities: [], rawHeaders: [], rawRows: [], analysis: emptyAnalysis });
          return;
        }

        // Scan the first 5 rows to determine the true header row with the highest match score
        let headerRowIndex = 0;
        let maxScore = -1;
        const scanLimit = Math.min(5, rawRows.length);

        for (let r = 0; r < scanLimit; r++) {
          const rowTokens = (rawRows[r] || []).map(c => cleanHeaderString(String(c || '')));
          let score = 0;
          for (const token of rowTokens) {
            if (token && findColumnDef(token)) {
              score++;
            }
          }
          if (score > maxScore) {
            maxScore = score;
            headerRowIndex = r;
          }
        }

        const dataStartRow = headerRowIndex + 1;
        const rawHeaderArr = rawRows[headerRowIndex] || [];
        const headers = rawHeaderArr.map((h, i) => cleanHeaderString(String(h || `Col_${i + 1}`)));
        const rowObjects: Record<string, any>[] = [];

        for (let r = dataStartRow; r < rawRows.length; r++) {
          const rowArr = rawRows[r];
          if (!rowArr || rowArr.length === 0) continue;
          const obj: Record<string, any> = {};
          let hasData = false;

          rowArr.forEach((val, cIdx) => {
            const headerName = headers[cIdx] || `Col_${cIdx + 1}`;
            const trimmed = val !== undefined && val !== null ? String(val).trim() : '';
            obj[headerName] = trimmed;
            // Also store positional key for index-based fallback
            obj[`__col_${cIdx + 1}`] = trimmed;
            if (trimmed) hasData = true;
          });

          if (hasData) {
            rowObjects.push(obj);
          }
        }

        const analysis = analyzeSpreadsheetHeaders(headers, rowObjects.slice(0, 10), customRules);
        const effectiveRules = customRules && customRules.length > 0 ? customRules : analysis.rules;
        const entities = mapRowsToEntities(rowObjects, headers, effectiveRules);
        resolve({ entities, rawHeaders: headers, rawRows: rowObjects, analysis });
      },
      error: (err) => reject(err)
    });
  });
}

/**
 * Converts a 1-based column number (e.g. 1, 27, 53, 80) to Excel column letter (e.g. 'A', 'AA', 'BA', 'CB').
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
 * Safely extracts note/comment text from an ExcelJS cell.
 * Handles strings, richText, nested note objects, cell.model.comment, and modern threaded comments.
 */
export function extractCellCommentText(cell: any): string {
  if (!cell) return '';

  const extractFromObject = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) {
      return val.map(extractFromObject).filter(Boolean).join('\n').trim();
    }
    if (typeof val === 'object') {
      if (Array.isArray(val.texts)) {
        return val.texts.map((t: any) => typeof t === 'string' ? t : t?.text || '').join('').trim();
      }
      if (Array.isArray(val.richText)) {
        return val.richText.map((t: any) => typeof t === 'string' ? t : t?.text || '').join('').trim();
      }
      if (val.note) {
        return extractFromObject(val.note);
      }
      if (val.comment) {
        return extractFromObject(val.comment);
      }
      if (typeof val.text === 'string') return val.text.trim();
      if (Array.isArray(val.text)) {
        return val.text.map((t: any) => typeof t === 'string' ? t : t?.text || '').join('').trim();
      }
      if (typeof val.value === 'string') return val.value.trim();
      if (typeof val.content === 'string') return val.content.trim();
    }
    return '';
  };

  const candidate = cell.note ?? cell.comment ?? cell.model?.note ?? cell.model?.comment;
  const rawText = extractFromObject(candidate);
  return cleanSpreadsheetComment(rawText);
}

async function parseXlsxFile(
  file: File,
  customRules?: HeaderParsingRule[]
): Promise<ParsedSpreadsheetResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    const emptyAnalysis: HeaderAnalysisResult = {
      rules: [],
      totalHeaders: 0,
      matchedCount: 0,
      rearrangedCount: 0,
      newFieldsCount: 0,
      suggestedMatchCount: 0,
      ignoredCount: 0,
      missingCanonicalFields: [],
      hasChanges: false,
      needsVerification: false
    };
    return { entities: [], rawHeaders: [], rawRows: [], analysis: emptyAnalysis };
  }

  // Scan rows 1 through 5 to determine the true header row with the highest match score
  let headerRowIndex = 1;
  let maxScore = -1;
  const maxRowsToScan = Math.min(5, worksheet.rowCount);

  for (let r = 1; r <= maxRowsToScan; r++) {
    const row = worksheet.getRow(r);
    let score = 0;
    row.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value !== null && cell.value !== undefined ? cleanHeaderString(String(cell.value)) : '';
      if (val && findColumnDef(val)) {
        score++;
      }
    });
    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  const dataStartRow = headerRowIndex + 1;

  const rawHeaders: Record<number, string> = {};
  const extractedComments: Record<string, string> = {};
  const targetHeaderRow = worksheet.getRow(headerRowIndex);
  targetHeaderRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const headerName = cell.value !== null && cell.value !== undefined ? cleanHeaderString(String(cell.value)) : `Col_${colNumber}`;
    if (headerName) rawHeaders[colNumber] = headerName;
  });

  // Comprehensive extraction of comments from all header cells across row 2 (e.g. BA2, BH2, BO2, BP2, BQ2, CB2), row 1, headerRowIndex, etc.
  const totalCols = Math.max(worksheet.columnCount || 0, targetHeaderRow.cellCount || 0, 100);

  for (let colNum = 1; colNum <= totalCols; colNum++) {
    const colLetter = colNumberToLetter(colNum);
    const headerName = rawHeaders[colNum] || '';
    const colDef = SPREADSHEET_COLUMNS.find(c => c.letter === colLetter || c.index === colNum) || (headerName ? findColumnDef(headerName) : undefined);

    // Check cells across row 2 (where cell comments like BA2 reside), row 1, headerRowIndex, and rows up to dataStartRow
    let commentText = '';
    const candidateRows = [2, 1, headerRowIndex, 3, 4].filter((r, idx, arr) => r > 0 && arr.indexOf(r) === idx);

    for (const r of candidateRows) {
      const candidateCell = worksheet.getRow(r).getCell(colNum);
      const text = extractCellCommentText(candidateCell);
      if (text) {
        commentText = text;
        break;
      }
    }

    // Also check worksheet.model.rows if not yet found
    if (!commentText && (worksheet as any).model?.rows) {
      const modelRows = (worksheet as any).model.rows;
      for (const mr of modelRows) {
        if (mr?.number <= dataStartRow && mr?.cells) {
          const matchingCell = mr.cells.find((c: any) => c?.address === `${colLetter}2` || c?.address === `${colLetter}1` || c?.col === colNum);
          if (matchingCell) {
            const text = extractCellCommentText(matchingCell);
            if (text) {
              commentText = text;
              break;
            }
          }
        }
      }
    }

    if (commentText) {
      // Map comment under all possible key variations for bulletproof retrieval
      extractedComments[colLetter] = commentText;
      extractedComments[`${colLetter}2`] = commentText;
      extractedComments[`${colLetter}1`] = commentText;
      extractedComments[`${colLetter}${headerRowIndex}`] = commentText;
      extractedComments[`Col_${colNum}`] = commentText;
      extractedComments[`col_${colNum}`] = commentText;
      extractedComments[`__col_${colNum}`] = commentText;

      if (headerName) {
        extractedComments[headerName] = commentText;
      }

      if (colDef) {
        extractedComments[colDef.field] = commentText;
        extractedComments[colDef.letter] = commentText;
        extractedComments[`${colDef.letter}2`] = commentText;
        if (colDef.aliases) {
          colDef.aliases.forEach(alias => {
            extractedComments[alias] = commentText;
          });
        }
      }
    }
  }

  if (Object.keys(extractedComments).length > 0) {
    registerColumnComments(extractedComments);
  }

  const rows: Record<string, any>[] = [];

  // Read data rows
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < dataStartRow) return;
    const rowObj: Record<string, any> = {};
    let hasData = false;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colHeader = rawHeaders[colNumber] || `Col_${colNumber}`;
      const strVal = extractCellTextAndHyperlink(cell);
      rowObj[colHeader] = strVal;
      // Positional key
      rowObj[`__col_${colNumber}`] = strVal;
      if (strVal) {
        hasData = true;
      }
    });

    if (hasData) {
      rows.push(rowObj);
    }
  });

  const headerList = Object.values(rawHeaders);
  const analysis = analyzeSpreadsheetHeaders(headerList, rows.slice(0, 10), customRules);
  const effectiveRules = customRules && customRules.length > 0 ? customRules : analysis.rules;
  const entities = mapRowsToEntities(rows, headerList, effectiveRules);
  return { entities, rawHeaders: headerList, columnComments: extractedComments, rawRows: rows, analysis };
}

/**
 * Safely extracts display text and any associated hyperlink from an ExcelJS cell.
 * Preserves hyperlink targets from native cell hyperlinks, { text, hyperlink } objects,
 * and =HYPERLINK("url", "text") formulas by formatting as [DisplayText](HyperlinkUrl).
 */
export function extractCellTextAndHyperlink(cell: any): string {
  if (!cell) return '';

  let rawVal = cell.value;
  let hyperlinkUrl: string | undefined = undefined;

  // 1. Direct cell-level hyperlink property in ExcelJS
  if (cell.hyperlink) {
    hyperlinkUrl = typeof cell.hyperlink === 'string' ? cell.hyperlink.trim() : (cell.hyperlink.target || '').trim();
  } else if (cell.model && cell.model.hyperlink) {
    hyperlinkUrl = typeof cell.model.hyperlink === 'string' ? cell.model.hyperlink.trim() : (cell.model.hyperlink.target || '').trim();
  }

  // 2. Formula HYPERLINK detection: =HYPERLINK("url", "text")
  if (rawVal && typeof rawVal === 'object' && 'formula' in rawVal) {
    const fStr = String((rawVal as any).formula || '');
    const m = fStr.match(/HYPERLINK\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
    if (m) {
      hyperlinkUrl = m[1].trim();
      if (m[2] && (!('result' in rawVal) || !(rawVal as any).result)) {
        rawVal = m[2].trim();
      }
    }
  }

  // 3. Formula result
  if (rawVal && typeof rawVal === 'object' && 'result' in rawVal) {
    rawVal = (rawVal as any).result;
  }

  // 4. Object with hyperlink / text / richText in cell.value
  let displayText = '';
  if (rawVal && typeof rawVal === 'object') {
    if ('hyperlink' in rawVal && (rawVal as any).hyperlink) {
      const hl = (rawVal as any).hyperlink;
      hyperlinkUrl = typeof hl === 'string' ? hl.trim() : (hl.target || '').trim();
    }
    if ('text' in rawVal) {
      const t = (rawVal as any).text;
      if (typeof t === 'string') {
        displayText = t.trim();
      } else if (t && typeof t === 'object') {
        if (typeof t.text === 'string') displayText = t.text.trim();
        else if (Array.isArray(t.richText)) displayText = t.richText.map((rt: any) => rt.text || '').join('').trim();
        else displayText = '';
      }
    } else if ('richText' in rawVal && Array.isArray((rawVal as any).richText)) {
      displayText = (rawVal as any).richText.map((rt: any) => rt.text || '').join('').trim();
    } else if (rawVal instanceof Date) {
      displayText = rawVal.toISOString();
    } else {
      displayText = '';
    }
  } else if (rawVal !== null && rawVal !== undefined) {
    displayText = String(rawVal).trim();
  }

  // Prevent any "[object Object]" literal from leaking
  if (!displayText || displayText === '[object Object]' || displayText.includes('[object Object]')) {
    displayText = '';
  }

  if (hyperlinkUrl) {
    if (!displayText || displayText === hyperlinkUrl || displayText === '[object Object]' || displayText.includes('[object Object]')) {
      return hyperlinkUrl;
    }
    return `[${displayText}](${hyperlinkUrl})`;
  }

  return displayText;
}

/**
 * Sanitizes and extracts image URLs (logos, favicons, avatars) from Excel cells.
 * Unwraps markdown links [Logo](https://...), =IMAGE("https://..."), =HYPERLINK("https://..."),
 * strips extraneous quotes, brackets, and "[object Object]" artifacts.
 */
export function cleanImageUrl(val?: any): string | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'object') {
    if (val.hyperlink) {
      val = typeof val.hyperlink === 'string' ? val.hyperlink : val.hyperlink.target || '';
    } else if (val.url) {
      val = val.url;
    } else if (val.text && typeof val.text === 'string' && /^https?:\/\//i.test(val.text)) {
      val = val.text;
    }
  }
  let str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none') {
    return undefined;
  }

  // 1. Unwrap Excel =IMAGE("url") or =HYPERLINK("url", ...)
  const formulaMatch = str.match(/=(?:IMAGE|HYPERLINK)\(\s*["']([^"']+)["']/i);
  if (formulaMatch && formulaMatch[1]) {
    str = formulaMatch[1].trim();
  }

  // 2. Unwrap Markdown links [Text](https://...) or [[object Object]](https://...)
  const mdMatch = str.match(/\[+([^\]]*)\]+\(\s*([^\s)]+)\s*\)/);
  if (mdMatch && mdMatch[2]) {
    str = mdMatch[2].trim();
  }

  // 3. Remove any stray "[object Object]" or "[[object Object]]"
  str = str.replace(/\[*\[*object\s+Object\]*\]*/gi, '').trim();

  // 4. Strip surrounding quotes or parentheses
  str = str.replace(/^["'(\[]+|["')\]]+$/g, '').trim();

  // 5. If string contains a full URL, extract it
  const urlMatch = str.match(/https?:\/\/[^\s"')]+/i);
  if (urlMatch) {
    str = urlMatch[0];
  } else if (str.startsWith('//')) {
    str = `https:${str}`;
  } else if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\/[^\s"')]+/i.test(str)) {
    str = `https://${str}`;
  }

  if (!str || str.toLowerCase().includes('object object') || !str.includes('.')) return undefined;
  return str;
}

/**
 * Returns a high-res Google favicon service URL for a website domain.
 */
export function getFaviconFromWebsite(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const clean = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].trim();
    if (clean && clean.includes('.')) {
      return `https://www.google.com/s2/favicons?domain=${clean}&sz=128`;
    }
  } catch {}
  return undefined;
}

export interface ResourceLinkItem {
  text: string;
  url?: string;
}

/**
 * Parses a raw field value into an array of clickable resource link items.
 * Supports:
 * - Markdown links: [Label](url)
 * - Formula strings: =HYPERLINK("url", "text")
 * - Embedded URLs: "Name (https://...)", "Name: https://...", "Name - https://..."
 * - Standalone URLs: "https://...", "http://...", "www...."
 * - Comma / newline / semicolon separated lists of links
 * - Plain text labels without URLs
 */
export function parseResourceLinks(val: any): ResourceLinkItem[] {
  if (val === null || val === undefined) return [];
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none') {
    return [];
  }

  const results: ResourceLinkItem[] = [];

  // Case 1: Excel formula =HYPERLINK("url", "text")
  const formulaMatch = str.match(/=HYPERLINK\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  if (formulaMatch) {
    const rawUrl = formulaMatch[1].trim();
    const text = formulaMatch[2]?.trim() || rawUrl;
    const url = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('mailto:')
      ? rawUrl
      : `https://${rawUrl}`;
    return [{ text, url }];
  }

  // Case 2: Markdown links [Label](url)
  const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let mdMatch: RegExpExecArray | null;
  let hasMd = false;
  while ((mdMatch = mdRegex.exec(str)) !== null) {
    hasMd = true;
    const text = mdMatch[1].trim();
    let url = mdMatch[2].trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
      url = `https://${url}`;
    }
    results.push({ text, url });
  }
  if (hasMd && results.length > 0) {
    return results;
  }

  // Case 3: Split multiple items by newlines, semicolons, or commas followed by http/www
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const itemsToProcess = lines.length > 1
    ? lines
    : str.split(/\s*;\s*|\s*,\s*(?=https?:\/\/|www\.)/).map(s => s.trim()).filter(Boolean);

  for (const item of itemsToProcess) {
    // Embedded format: "Label (https://...)" or "Label - https://..." or "Label: https://..."
    const embeddedMatch = item.match(/^(.*?)(?:\s*[\(:\-]\s*|\s+)(https?:\/\/[^\s\)]+|www\.[^\s\)]+)[\)]?$/i);
    if (embeddedMatch && embeddedMatch[1]?.trim()) {
      const text = embeddedMatch[1].replace(/[-:(]$/, '').trim();
      let url = embeddedMatch[2].trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      results.push({ text: text || url, url });
      continue;
    }

    // Direct standalone URL
    const urlMatch = item.match(/^(https?:\/\/[^\s]+|www\.[^\s]+)$/i);
    if (urlMatch) {
      let url = urlMatch[1].trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      results.push({ text: url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), url });
      continue;
    }

    // Contains a URL somewhere inside
    const anyUrlMatch = item.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    if (anyUrlMatch) {
      let url = anyUrlMatch[1].trim();
      const text = item.replace(url, '').replace(/[()\-:]/g, '').trim() || url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      results.push({ text, url });
      continue;
    }

    // Plain text item
    results.push({ text: item });
  }

  return results.length > 0 ? results : [{ text: str }];
}

/**
 * Maps key-value row objects to EcosystemEntity schema with complete column mapping
 */
function mapRowsToEntities(
  rows: Record<string, any>[],
  headers?: string[],
  customRules?: HeaderParsingRule[]
): EcosystemEntity[] {
  // Pre-analyze headers to detect whether the dataset has named column headers
  const sampleRow = rows[0] || {};
  const headerKeys = (headers && headers.length > 0)
    ? headers
    : Object.keys(sampleRow).filter(k => !k.startsWith('__col_'));

  // A dataset has named headers if at least 2 non-"Col_X" headers match a known ColumnDef
  const hasNamedHeaders = headerKeys.some(k => !k.startsWith('Col_') && findColumnDef(k) !== undefined);

  // Dynamic parsing rules indexing
  const effectiveRules = customRules && customRules.length > 0 ? customRules : loadStoredParsingRules();
  const ruleByTargetField = new Map<string, HeaderParsingRule>();
  const ignoredKeys = new Set<string>();
  const newFieldRules: HeaderParsingRule[] = [];

  if (effectiveRules && effectiveRules.length > 0) {
    effectiveRules.forEach(rule => {
      if (rule.action === 'ignore') {
        ignoredKeys.add(cleanHeaderString(rule.sourceHeader).toLowerCase());
        ignoredKeys.add(`col_${rule.sourceIndex}`.toLowerCase());
        ignoredKeys.add(`__col_${rule.sourceIndex}`.toLowerCase());
      } else if (rule.action === 'map_existing') {
        ruleByTargetField.set(rule.targetField.toLowerCase(), rule);
      } else if (rule.action === 'add_new_field' || rule.isCustomField) {
        newFieldRules.push(rule);
      }
    });
  }

  // Build a pre-computed map of canonical field name -> the exact row key in this file
  const canonicalToFoundKeyMap = new Map<string, string>();
  headerKeys.forEach(k => {
    const cleanK = cleanHeaderString(k);
    if (!cleanK || cleanK.startsWith('Col_')) return;
    const def = findColumnDef(cleanK);
    if (def && !canonicalToFoundKeyMap.has(def.field)) {
      canonicalToFoundKeyMap.set(def.field, k);
    }
  });

  const seenRowIds = new Set<string>();

  const mapped = rows.map((row, index) => {
    // Helper to find value from row by canonical aliases or column index
    const getVal = (colDefOrField: string | ColumnDef, ...additionalAliases: string[]): any => {
      let def: ColumnDef | undefined = typeof colDefOrField === 'string' ? findColumnDef(colDefOrField) : colDefOrField;
      const targetFieldName = def ? def.field : (typeof colDefOrField === 'string' ? colDefOrField : '');

      // 0. Explicit rule mapping for this field (highest priority, handles moved columns & renamed headers)
      if (targetFieldName && ruleByTargetField.has(targetFieldName.toLowerCase())) {
        const rule = ruleByTargetField.get(targetFieldName.toLowerCase())!;
        let val = row[rule.sourceHeader];
        if (val === undefined || val === null || String(val).trim() === '') {
          val = row[`__col_${rule.sourceIndex}`] ?? row[`Col_${rule.sourceIndex}`];
        }
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
        return undefined;
      }

      // 1. Direct match via pre-computed canonical map
      if (def && canonicalToFoundKeyMap.has(def.field)) {
        const actualKey = canonicalToFoundKeyMap.get(def.field)!;
        const val = row[actualKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
        // The column exists in the spreadsheet headers, but this row has an empty cell.
        // We MUST NOT fall through to random positional columns or wrong fields!
        return undefined;
      }

      // 2. Direct match on row keys (case-insensitive, trimmed)
      const searchTerms: string[] = [];
      if (def) {
        searchTerms.push(def.field.toLowerCase());
        searchTerms.push(...def.aliases.map(a => a.toLowerCase()));
      } else if (typeof colDefOrField === 'string') {
        searchTerms.push(colDefOrField.toLowerCase());
      }
      searchTerms.push(...additionalAliases.map(a => a.toLowerCase()));

      for (const term of searchTerms) {
        const foundKey = Object.keys(row).find(rk => {
          if (rk.startsWith('__col_')) return false;
          return cleanHeaderString(rk).toLowerCase() === term;
        });
        if (foundKey) {
          const val = row[foundKey];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
          return undefined;
        }
      }

      // 3. Positional fallback: ONLY when the file is completely headerless (no named headers at all)
      if (!hasNamedHeaders && def && row[`__col_${def.index}`] !== undefined && row[`__col_${def.index}`] !== null) {
        const val = row[`__col_${def.index}`];
        if (String(val).trim() !== '') {
          return String(val).trim();
        }
      }

      return undefined;
    };

    // =========================================================================
    // 1. OVERVIEW (A - X, cols 1 - 24)
    // =========================================================================
    const rawId = getVal('Org ID');
    const rawName = getVal('Name/Label');
    const name = String(rawName || `Entity #${index + 1}`).trim();
    const baseId = String(rawId || `org-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`).trim() || `entity-${index + 1}`;
    let id = baseId;
    if (seenRowIds.has(id)) {
      let counter = 2;
      let disambiguated = `${baseId}_${counter}`;
      while (seenRowIds.has(disambiguated)) {
        counter++;
        disambiguated = `${baseId}_${counter}`;
      }
      id = disambiguated;
    }
    seenRowIds.add(id);

    const rawType = getVal('Entity Type');
    const type = normalizeType(rawType);

    const rawStructure = getVal('Organization Structure');
    const organizationStructure = rawStructure ? String(rawStructure).trim() : undefined;

    const rawDesc = getVal('Description');
    const description = String(rawDesc || '').trim();

    // Column H: Archipelago (col 8)
    const rawArchipelago = String(
      getVal('Archipelago', 'Island/Cluster', 'Continent', 'Biome', 'Archipelagos', 'Island') || ''
    ).trim();
    let continent = '';
    const archipelagoExtraTags: string[] = [];

    if (rawArchipelago) {
      const parts = rawArchipelago.split(/[,;|\n]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        continent = formatClusterWithNumber(parts[0]);
        if (parts.length > 1) {
          archipelagoExtraTags.push(...parts.slice(1).map(p => formatClusterWithNumber(p)));
        }
      }
    }

    // Societal Sector (L / M / N, cols 12 - 14)
    const rawSocietalSector = getVal('Societal Sector');
    const societalSector = rawSocietalSector ? String(rawSocietalSector).trim() : undefined;

    const rawSocietalSectorCatalist = getVal('Societal Sector (Catalist)');
    const societalSectorCatalist = rawSocietalSectorCatalist ? String(rawSocietalSectorCatalist).trim() : undefined;

    const rawSocietalCategoryCatalist = getVal('Societal Category (Catalist)');
    const societalCategoryCatalist = rawSocietalCategoryCatalist ? String(rawSocietalCategoryCatalist).trim() : undefined;

    // Approach, Issues, Activities, Keywords/Topics tags
    const approachTags = parseFields(getVal('Approach'));
    const issuesTags = parseFields(getVal('Issues'));
    const activitiesTags = parseFields(getVal('Activities'));
    const keywordsTags = parseFields(getVal('Keywords/Topics'));
    const genericFieldTags = parseFields(getVal('field', 'subfield', 'domain tag'));

    // Tags & Keywords/Topics:
    // The other archipelagos (besides the first one listed in the spreadsheet) are identified
    // and added to the tags/keywords fields so they are findable via keywords or tags.
    // In the entity profile, filterProfileTags ensures they only appear in the "Other Archipelagos" field.
    const rawKeywords = keywordsTags.length > 0 ? keywordsTags : genericFieldTags;
    const fields = Array.from(new Set([...rawKeywords, ...archipelagoExtraTags])).filter(Boolean);

    // Auto-suggest archipelago if not explicitly set in file
    if (!continent) {
      continent = suggestContinent({ name, category: 'Inner', fields, description });
    }

    // Column E: Quadrant (col 5)
    // CRITICAL: Explicit quadrant in spreadsheet MUST take top priority over inferred quadrant!
    const rawQuadrant = getVal('Quadrant');
    const inferredArchipelagoQuad = continent ? getArchipelagoQuadrant(continent) : undefined;
    let category: CategoryQuadrant;

    if (rawQuadrant) {
      category = normalizeCategory(rawQuadrant);
    } else if (inferredArchipelagoQuad) {
      category = inferredArchipelagoQuad;
    } else {
      category = 'Inner';
    }
    const quadrant = category;

    // Column F: Category (col 6)
    const rawExperimentalCategory = getVal('Category');
    const spreadsheetCategory = rawExperimentalCategory ? String(rawExperimentalCategory).trim() : undefined;

    // Column G: Stream (col 7)
    const rawStream = getVal('Stream');
    const stream = rawStream ? String(rawStream).trim() : undefined;
    const streams = stream ? stream.split(/[,;/|\n]+/).map(s => s.trim()).filter(Boolean) : undefined;

    // Column U: Our Relationship (col 21)
    const rawOurRelationship = getVal('Our Relationship');
    const ourRelationship = rawOurRelationship ? String(rawOurRelationship).trim() : undefined;

    // Column V: Featured? (col 22)
    const rawFeatured = getVal('Featured?');
    const featured = rawFeatured !== undefined && ['true', 'yes', '1', 'featured', '★', 'y'].includes(String(rawFeatured).trim().toLowerCase());

    // Column W: Filled Fields (col 23)
    let rawFilledFields = getVal('Filled Fields', 'filled fields', 'filledfields', 'fields filled', 'count of filled fields');
    if (rawFilledFields === undefined || rawFilledFields === null || String(rawFilledFields).trim() === '') {
      rawFilledFields = row['__col_23'] ?? row['Col_23'] ?? row['W'] ?? row['w'];
    }
    const filledFields = rawFilledFields !== undefined && rawFilledFields !== null && String(rawFilledFields).trim() !== '' ? String(rawFilledFields).trim() : undefined;

    // Column X: Data Completeness (col 24)
    // The user specified: "it should work based off of the spreadsheet. it's the X column."
    let rawDataCompleteness = getVal(
      'Data Completeness',
      'Completeness',
      'Data Completeness Tier',
      'Percentile',
      'Completeness (%)',
      'Completeness Tier',
      'Data Quality',
      'Data Completeness (Percentile)',
      'Percentile Rank',
      'Completeness Level'
    );
    if (rawDataCompleteness === undefined || rawDataCompleteness === null || String(rawDataCompleteness).trim() === '') {
      rawDataCompleteness = row['__col_24'] ?? row['Col_24'] ?? row['X'] ?? row['x'];
    }
    if (rawDataCompleteness === undefined || rawDataCompleteness === null || String(rawDataCompleteness).trim() === '') {
      for (const [k, v] of Object.entries(row)) {
        if (k.startsWith('__col_')) continue;
        const cleanK = cleanHeaderString(k).toLowerCase();
        if (cleanK.includes('completeness') || cleanK === 'x' || cleanK.startsWith('x -') || cleanK.endsWith('(x)')) {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            rawDataCompleteness = String(v).trim();
            break;
          }
        }
      }
    }
    const dataCompleteness = normalizeDataCompleteness(rawDataCompleteness, filledFields);

    // =========================================================================
    // 2. LOGISTIC INFO (Y - AR, cols 25 - 44)
    // =========================================================================
    const rawWebsite = getVal('Website URL');
    const website = cleanWebsiteUrl(rawWebsite);

    // Column AA: Social Profiles (col 27)
    let rawSocialProfiles = getVal('Social Profiles');
    if (isTransformationFocusValue(rawSocialProfiles) || isTransformationFocusField(rawSocialProfiles)) {
      rawSocialProfiles = undefined;
    }
    const socialMedia: Record<string, string> = parseSocialProfilesField(rawSocialProfiles);

    // Favicon (AB / col 28) & Logo (AC / col 29)
    const rawFavicon = getVal('Favicon');
    let favicon = cleanImageUrl(rawFavicon);

    const rawLogo = getVal('Logo');
    const logo = cleanImageUrl(rawLogo);

    if (!favicon && website) {
      favicon = getFaviconFromWebsite(website);
    }

    // Language(s) (AD / col 30)
    const rawLanguage = getVal('Language(s)');
    const language = rawLanguage ? String(rawLanguage).trim() : undefined;

    // Biome (AE / col 31)
    const rawBiome = getVal('Biome') || getVal('Bioregion');
    const biome = rawBiome ? String(rawBiome).trim() : undefined;
    const bioregion = biome;

    // Neighborhood or Demarcated Zone (AF / col 32)
    const rawNeighborhood = getVal('Neighborhood or Demarcated Zone');
    const neighborhood = rawNeighborhood ? String(rawNeighborhood).trim() : undefined;

    // City (AH / col 34) & State (AI / col 35)
    const rawCity = getVal('City');
    const city = rawCity ? String(rawCity).trim() : undefined;

    const rawState = getVal('State');
    const state = rawState ? String(rawState).trim() : undefined;

    // Country (AJ / col 36)
    const rawCountry = getVal('Country');
    const country = rawCountry ? String(rawCountry).trim() : undefined;

    // City/State (AG / col 33)
    const rawCityState = getVal('City/State');
    let cityState = rawCityState ? String(rawCityState).trim() : undefined;
    // Guard against City/State being set to Country name
    if (cityState && country && cityState.toLowerCase() === country.toLowerCase()) {
      cityState = undefined;
    }

    // Location assembly
    const computedCityState = cityState || [city, state].filter(Boolean).join(', ') || undefined;
    const locationParts = [computedCityState, neighborhood, country, biome].map(p => p ? String(p).trim() : '').filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

    // Operating Region (AK / col 37)
    const rawOperatingRegion = getVal('Operating Region');
    const operatingRegion = rawOperatingRegion ? String(rawOperatingRegion).trim() : undefined;

    // Operation Focus (AL / col 38)
    const rawOperationFocus = getVal('Operation Focus');
    const operationFocus = rawOperationFocus ? String(rawOperationFocus).trim() : undefined;

    // Year Founded (AM / col 39)
    const rawYearFounded = getVal('Year Founded');
    const yearFounded = rawYearFounded ? String(rawYearFounded).trim() : undefined;

    // Maturity Level (AN / col 40)
    const rawMaturity = getVal('Maturity Level');
    const stage = rawMaturity ? String(rawMaturity).trim() : undefined;
    const maturityLevel = stage;

    // Size (AO / col 41)
    const rawSize = getVal('Size');
    const size = rawSize ? String(rawSize).trim() : undefined;

    // Social Media Reach (AP / col 42) & Impact Reach (AQ / col 43)
    const rawSocialMediaReach = getVal('Social Media Reach');
    const socialMediaReach = rawSocialMediaReach ? String(rawSocialMediaReach).trim() : undefined;

    const rawImpactReach = getVal('Impact Reach');
    const impactReach = rawImpactReach ? String(rawImpactReach).trim() : undefined;
    const reach = impactReach || socialMediaReach;

    // Influence (AR / col 44)
    const rawInfluence = getVal('Influence');
    const influence = rawInfluence ? String(rawInfluence).trim() : undefined;

    // Dedicated individual social columns
    const individualSocials = [
      { key: 'twitter', aliases: ['twitter', 'x.com', 'x url', 'twitter url'] },
      { key: 'linkedin', aliases: ['linkedin', 'linkedin url', 'linked in'] },
      { key: 'instagram', aliases: ['instagram', 'ig url', 'insta'] },
      { key: 'youtube', aliases: ['youtube', 'youtube url', 'yt channel'] },
      { key: 'facebook', aliases: ['facebook', 'fb url'] },
      { key: 'github', aliases: ['github', 'github url'] },
      { key: 'substack', aliases: ['substack', 'substack url'] },
      { key: 'bluesky', aliases: ['bluesky', 'bsky'] },
      { key: 'mastodon', aliases: ['mastodon', 'mstdn'] }
    ];

    individualSocials.forEach(({ key, aliases }) => {
      const val = getVal(key, ...aliases);
      if (val && String(val).trim()) {
        const strVal = String(val).trim();
        if (!isTransformationFocusValue(strVal) && !isTransformationFocusField(key) && !isTransformationFocusValue(key)) {
          socialMedia[key] = strVal;
        }
      }
    });

    // Sanitize any accidentally captured transformation focus entries
    Object.keys(socialMedia).forEach(k => {
      if (isTransformationFocusValue(k) || isTransformationFocusValue(socialMedia[k]) || isTransformationFocusField(k)) {
        delete socialMedia[k];
      }
    });

    // =========================================================================
    // 3. ANALYST COMMENTARY / MAP CURATOR NOTES (CI / col 87)
    // =========================================================================
    let rawNotes = getVal('Analyst Commentary', ...ANALYST_COMMENTARY_ALIASES);
    if (rawNotes && societalSector && String(rawNotes).trim().toLowerCase() === String(societalSector).trim().toLowerCase()) {
      rawNotes = undefined;
    }
    const notes = rawNotes ? String(rawNotes).trim() : undefined;

    // Contact info (BY / col 77 & BZ / col 78)
    const contactEmail = getVal('Email', 'contact email', 'email', '__col_78', '__col_68') ? String(getVal('Email', 'contact email', 'email', '__col_78', '__col_68')).trim() : undefined;
    const contactName = getVal('Point of Contact(s)', 'point of contact', 'contact name', 'contacts', 'poc', '__col_77', '__col_67') ? String(getVal('Point of Contact(s)', 'point of contact', 'contact name', 'contacts', 'poc', '__col_77', '__col_67')).trim() : undefined;

    // Secondary categories / Intersections
    const rawSecondary = getVal('secondary', 'secondary category', 'secondary quadrant', 'intersection', 'intersections');
    let secondaryCategories: CategoryQuadrant[] | undefined = undefined;
    if (rawSecondary) {
      const rawList = parseFields(rawSecondary);
      const mapped = rawList.map(s => normalizeCategory(s)).filter(c => c !== category);
      if (mapped.length > 0) {
        secondaryCategories = Array.from(new Set(mapped));
      }
    }

    const isDomainElevation = (secondaryCategories !== undefined && secondaryCategories.length > 0);

    // Map positions
    const rawX = getVal('x', 'pos_x', 'longitude', 'coordinate_x');
    const rawY = getVal('y', 'pos_y', 'latitude', 'coordinate_y');
    const hasCustomX = rawX !== undefined && rawX !== '' && !isNaN(Number(rawX));
    const hasCustomY = rawY !== undefined && rawY !== '' && !isNaN(Number(rawY));

    // =========================================================================
    // 4. CATEGORIZED FIELDS BUILDER (Overview, Logistic Info, Relationships, etc.)
    // =========================================================================
    const categorizedFields: Record<string, Record<string, any>> = {};
    SPREADSHEET_CATEGORY_NAMES.forEach(cat => {
      categorizedFields[cat] = {};
    });

    // Loop through all defined columns and extract their values
    SPREADSHEET_COLUMNS.forEach(colDef => {
      const val = getVal(colDef);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const strVal = String(val).trim();
        // Guard against transformation focus landing in Social Profiles
        if (colDef.field === 'Social Profiles' && isTransformationFocusValue(strVal)) {
          return;
        }
        categorizedFields[colDef.category][colDef.field] = strVal;
      }
    });

    // Extra dynamic fields from custom headers and dynamic parsing rules
    const extraFields: Record<string, string | number | boolean> = {};

    // 1. Explicit dynamic custom fields added via parsing rules
    newFieldRules.forEach(nfr => {
      let val = row[nfr.sourceHeader] ?? row[`__col_${nfr.sourceIndex}`] ?? row[`Col_${nfr.sourceIndex}`];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const strVal = String(val).trim();
        extraFields[nfr.targetField] = strVal;
        const targetCategory = nfr.category || 'Additional Data';
        if (!categorizedFields[targetCategory]) {
          categorizedFields[targetCategory] = {};
        }
        categorizedFields[targetCategory][nfr.targetField] = strVal;
      }
    });

    // 2. Unmapped custom headers
    Object.keys(row).forEach(rk => {
      if (rk.startsWith('__col_')) return;
      const cleanK = cleanHeaderString(rk).toLowerCase();
      if (ignoredKeys.has(cleanK)) return;
      if (newFieldRules.some(nfr => cleanHeaderString(nfr.sourceHeader).toLowerCase() === cleanK)) return;

      const colDef = findColumnDef(rk);
      const val = row[rk];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        extraFields[rk] = val;
        // If not already in one of the canonical categories, put in Additional Data
        if (!colDef) {
          if (!categorizedFields['Additional Data']) {
            categorizedFields['Additional Data'] = {};
          }
          categorizedFields['Additional Data'][rk] = val;
        }
      }
    });

    // Purge any obsolete fabricated fields from categorizedFields and extraFields
    const obsoleteSet = new Set(OBSOLETE_FABRICATED_FIELDS.map(s => s.toLowerCase().trim()));
    Object.keys(categorizedFields).forEach(cat => {
      Object.keys(categorizedFields[cat]).forEach(k => {
        if (obsoleteSet.has(k.toLowerCase().trim())) {
          delete categorizedFields[cat][k];
        }
      });
    });
    Object.keys(extraFields).forEach(k => {
      if (obsoleteSet.has(k.toLowerCase().trim())) {
        delete extraFields[k];
      }
    });

    // Sanitize Relationships to remove any random "funding" or "key people" fields
    if (categorizedFields['Relationships']) {
      Object.keys(categorizedFields['Relationships']).forEach(rk => {
        const rkLower = rk.trim().toLowerCase();
        if (
          rkLower === 'funding' ||
          rkLower.includes('funding') ||
          rkLower === 'key people' ||
          rkLower.includes('key people') ||
          rkLower.includes('secondary collaboration')
        ) {
          delete categorizedFields['Relationships'][rk];
        }
      });
    }

    // Ensure Overview has clean fields (Other Archipelagos moved right below main Archipelago field)
    if (categorizedFields['Overview']) {
      delete categorizedFields['Overview']['Archipelago'];
      delete categorizedFields['Overview']['archipelago'];
      delete categorizedFields['Overview']['Island/Cluster'];
      delete categorizedFields['Overview']['island/cluster'];
      delete categorizedFields['Overview']['Islands'];
      delete categorizedFields['Overview']['islands'];
      delete categorizedFields['Overview']['Other Archipelagos'];
      delete categorizedFields['Overview']['other archipelagos'];
      delete categorizedFields['Overview']['Other Archipelago'];
      delete categorizedFields['Overview']['other archipelago'];
      if (rawKeywords.length > 0) {
        categorizedFields['Overview']['Keywords/Topics'] = rawKeywords.join(', ');
      }
      if (dataCompleteness) {
        categorizedFields['Overview']['Data Completeness'] = dataCompleteness;
      }
      if (filledFields) {
        categorizedFields['Overview']['Filled Fields'] = filledFields;
      }
    }

    if (dataCompleteness) {
      extraFields['Data Completeness'] = dataCompleteness;
    }
    if (filledFields) {
      extraFields['Filled Fields'] = filledFields;
    }

    // =========================================================================
    // 5. RELATIONSHIPS: Connected Nodes from AS - AY (cols 45 - 51)
    // AS — Founder(s)/Main Source(s)
    // AT — Partners (Institutions)
    // AU — Funders/Supporters (Institutions)
    // AV — Teachers/Influences (People)
    // AW — Ethnic/Spiritual Lineage(s)
    // AX — Intellectual Lineage (IAM)
    // AY — Partners/Collaborators (People)
    // =========================================================================
    const rawFoundersVal = getVal('Founder(s)/Main Source(s)');
    const rawPartnersVal = getVal('Partners (Institutions)');
    const rawFundersVal = getVal('Funders/Supporters (Institutions)');
    const rawTeachersVal = getVal('Teachers/Influences (People)');
    const rawEthnicLineageVal = getVal('Ethnic/Spiritual Lineage(s)');
    const rawIntellectualLineageVal = getVal('Intellectual Lineage (IAM)');
    const rawCollaboratorsVal = getVal('Partners/Collaborators (People)');

    const parsedFounders = parseInstitutionList(rawFoundersVal);
    const parsedPartners = parseInstitutionList(rawPartnersVal);
    const parsedFunders = parseInstitutionList(rawFundersVal);
    const parsedTeachers = parseInstitutionList(rawTeachersVal);
    const parsedEthnicLineages = parseInstitutionList(rawEthnicLineageVal);
    const intellectualLineage = rawIntellectualLineageVal ? String(rawIntellectualLineageVal).trim() : undefined;
    const parsedCollaborators = parseInstitutionList(rawCollaboratorsVal);

    // Worldview & Change additions
    const rawSituationalAssessmentComments = getVal('Situational Assessment Comments/Description');
    const situationalAssessmentComments = rawSituationalAssessmentComments ? String(rawSituationalAssessmentComments).trim() : undefined;

    const rawAltMutua = getVal('Alternative(s) Proposed (Mútua)');
    const altMutua = rawAltMutua ? String(rawAltMutua).trim() : undefined;

    const rawValueMemeEthicalOrientation = getVal('Value Meme / Ethical Orientation');
    const valueMemeEthicalOrientation = rawValueMemeEthicalOrientation ? String(rawValueMemeEthicalOrientation).trim() : undefined;

    return {
      id,
      name,
      type,
      category,
      quadrant,
      spreadsheetCategory,
      organizationStructure,
      secondaryCategories,
      isDomainElevation,
      continent,
      otherArchipelagos: archipelagoExtraTags.length > 0 ? archipelagoExtraTags : undefined,
      fields,
      approach: approachTags.length > 0 ? approachTags : undefined,
      issues: issuesTags.length > 0 ? issuesTags : undefined,
      activities: activitiesTags.length > 0 ? activitiesTags : undefined,
      description,
      location,
      language,
      stage,
      societalSector,
      societalSectorCatalist,
      societalCategoryCatalist,
      ourRelationship,
      filledFields,
      biome,
      bioregion,
      neighborhood,
      cityState,
      city,
      state,
      country,
      operatingRegion,
      operationFocus,
      yearFounded,
      maturityLevel,
      size,
      socialMediaReach,
      impactReach,
      reach,
      influence,
      website,
      logo,
      favicon,
      socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
      contactEmail,
      contactName,
      stream,
      streams: (streams && streams.length > 0) ? streams : undefined,
      founders: parsedFounders.length > 0 ? parsedFounders : undefined,
      partners: parsedPartners.length > 0 ? parsedPartners : undefined,
      funders: parsedFunders.length > 0 ? parsedFunders : undefined,
      teachers: parsedTeachers.length > 0 ? parsedTeachers : undefined,
      ethnicSpiritualLineages: parsedEthnicLineages.length > 0 ? parsedEthnicLineages : undefined,
      intellectualLineage,
      collaborators: parsedCollaborators.length > 0 ? parsedCollaborators : undefined,
      situationalAssessmentComments,
      altMutua,
      valueMemeEthicalOrientation,
      dataCompleteness,
      dataQuality: dataCompleteness,
      x: hasCustomX ? Number(rawX) : 0,
      y: hasCustomY ? Number(rawY) : 0,
      isCustomPosition: hasCustomX && hasCustomY,
      extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
      categorizedFields,
      notes,
      featured
    };
  });

  return ensureUniqueEntityIds(mapped);
}

/**
 * Returns structured categorized fields for display in RightSidebar
 */
export function getEntityCategorizedData(entity: EcosystemEntity): Record<string, Record<string, any>> {
  const result: Record<string, Record<string, any>> = {};

  SPREADSHEET_CATEGORY_NAMES.forEach(cat => {
    result[cat] = {};
  });

  // 1. Pull from entity.categorizedFields if available
  if (entity.categorizedFields) {
    Object.entries(entity.categorizedFields).forEach(([cat, fields]) => {
      if (!result[cat]) result[cat] = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          result[cat][k] = v;
        }
      });
    });
  }

  // 2. Ensure standard fields from entity core model are populated
  // Overview: Org ID, Organization Structure, Stream, Other Archipelagos
  if (!result['Overview']['Org ID'] && entity.id) result['Overview']['Org ID'] = entity.id;
  if (!result['Overview']['Organization Structure'] && entity.organizationStructure) result['Overview']['Organization Structure'] = entity.organizationStructure;
  if (entity.stream && !result['Overview']['Stream']) result['Overview']['Stream'] = entity.stream;
  
  // Other Archipelagos: moved to right below main Archipelago field in entity view
  delete result['Overview']['Other Archipelagos'];
  delete result['Overview']['other archipelagos'];
  delete result['Overview']['Other Archipelago'];
  delete result['Overview']['other archipelago'];

  // Keywords/Topics: ensure archipelagos do NOT duplicate here in the entity profile
  const existingKw = result['Overview']['Keywords/Topics'] || entity.extraFields?.['Keywords/Topics'] || (entity.fields && entity.fields.length > 0 ? entity.fields.join(', ') : '');
  if (existingKw) {
    const cleanedKw = filterProfileTags(existingKw, entity);
    if (cleanedKw.length > 0) {
      result['Overview']['Keywords/Topics'] = cleanedKw.join(', ');
    } else {
      delete result['Overview']['Keywords/Topics'];
    }
  }

  // Explicit fields excluded from the "Overview" section of the RightSidebar
  // (Quadrant and Archipelago are already in the top card; Category and Filled Fields are excluded per user request)
  const OVERVIEW_EXCLUDED_KEYS = [
    'Category', 'category', 'experimental category',
    'Filled Fields', 'filled fields', 'filledfields', 'fields filled', 'count of filled fields',
    'Quadrant', 'quadrant', 'quadrants', 'map placement',
    'Archipelago', 'archipelago', 'archipelagos', 'Island/Cluster', 'island/cluster', 'Islands', 'islands', 'island', 'cluster', 'Continent', 'continent',
    'Other Archipelagos', 'other archipelagos', 'Other Archipelago', 'other archipelago',
    'Name/Label', 'name/label', 'Name', 'name',
    'Entity Type', 'entity type', 'Type', 'type',
    'Approach', 'approach',
    'Issues', 'issues',
    'Activities', 'activities',
    'Description', 'description',
    'Data Completeness', 'data completeness', 'Completeness', 'completeness', 'Data Quality', 'data quality',
    'Our Relationship', 'our relationship', 'Relationship', 'relationship',
    'Featured?', 'featured?', 'Featured', 'featured'
  ];

  OVERVIEW_EXCLUDED_KEYS.forEach(k => {
    delete result['Overview'][k];
  });

  // Logistic Info (Website URL, Logo, Favicon, Language, Description are intentionally excluded from the categorized section, but Country must remain)
  if (!result['Logistic Info']['Maturity Level'] && (entity.maturityLevel || entity.stage)) result['Logistic Info']['Maturity Level'] = entity.maturityLevel || entity.stage;
  const entityCityState = entity.cityState || (entity.city && entity.state ? `${entity.city}, ${entity.state}` : entity.city || entity.state || undefined);
  if (!result['Logistic Info']['City/State'] && entityCityState) result['Logistic Info']['City/State'] = entityCityState;
  if (!result['Logistic Info']['Country'] && entity.country) result['Logistic Info']['Country'] = entity.country;
  if (!result['Logistic Info']['Biome'] && (entity.biome || entity.bioregion)) result['Logistic Info']['Biome'] = entity.biome || entity.bioregion;

  // 3. Populate from entity.extraFields
  if (entity.extraFields) {
    Object.entries(entity.extraFields).forEach(([key, val]) => {
      if (val === undefined || val === null || String(val).trim() === '') return;
      const colDef = findColumnDef(key);
      if (colDef) {
        if (colDef.category === 'Overview' && OVERVIEW_EXCLUDED_KEYS.some(k => k.toLowerCase() === colDef.field.toLowerCase())) {
          return;
        }
        if (!result[colDef.category]) result[colDef.category] = {};
        if (!result[colDef.category][colDef.field]) {
          result[colDef.category][colDef.field] = val;
        }
      } else {
        if (!result['Additional Data']) result['Additional Data'] = {};
        result['Additional Data'][key] = val;
      }
    });
  }

  // Remove "Featured?" from all categories so it never appears in the right sidebar
  SPREADSHEET_CATEGORY_NAMES.forEach(cat => {
    if (result[cat]) {
      delete result[cat]['Featured?'];
      delete result[cat]['Featured'];
    }
  });

  // Ensure all Overview excluded fields remain stripped after extraFields merging
  if (result['Overview']) {
    OVERVIEW_EXCLUDED_KEYS.forEach(k => {
      delete result['Overview'][k];
    });
  } else {
    result['Overview'] = {};
  }

  // Always show "Keywords/Topics" and "Who They Serve" in Overview
  if (!result['Overview']['Keywords/Topics']) {
    result['Overview']['Keywords/Topics'] = (entity.fields && entity.fields.length > 0)
      ? entity.fields.join(', ')
      : (entity.extraFields?.['Keywords/Topics'] as string) || '';
  }
  if (!result['Overview']['Who They Serve']) {
    result['Overview']['Who They Serve'] = (entity.extraFields?.['Who They Serve'] as string) ||
      (entity.extraFields?.['who they serve'] as string) || '';
  }
  if (!result['Overview']['Societal Sector']) {
    const sec = entity.societalSector || (entity.extraFields?.['Societal Sector'] as string) || (entity.categorizedFields?.['Overview']?.['Societal Sector'] as string);
    if (sec) {
      result['Overview']['Societal Sector'] = sec;
    }
  }

  // Populate "Practices" and "Offerings" in Worldview & Change Orientation only if they have non-empty values
  const practicesVal = (entity.categorizedFields?.['Worldview & Change Orientation']?.['Practices'] ?? entity.extraFields?.['Practices'] ?? '') as string;
  if (practicesVal && String(practicesVal).trim() !== '') {
    if (!result['Worldview & Change Orientation']) {
      result['Worldview & Change Orientation'] = {};
    }
    result['Worldview & Change Orientation']['Practices'] = String(practicesVal).trim();
  } else if (result['Worldview & Change Orientation']) {
    delete result['Worldview & Change Orientation']['Practices'];
  }

  const offeringsVal = (entity.categorizedFields?.['Worldview & Change Orientation']?.['Offerings'] ?? entity.extraFields?.['Offerings'] ?? '') as string;
  if (offeringsVal && String(offeringsVal).trim() !== '') {
    if (!result['Worldview & Change Orientation']) {
      result['Worldview & Change Orientation'] = {};
    }
    result['Worldview & Change Orientation']['Offerings'] = String(offeringsVal).trim();
  } else if (result['Worldview & Change Orientation']) {
    delete result['Worldview & Change Orientation']['Offerings'];
  }

  // Remove website URL, social profiles, logo/favicon, language, and description from Logistic Info (Country is intentionally retained)
  if (result['Logistic Info']) {
    delete result['Logistic Info']['Website URL'];
    delete result['Logistic Info']['Website'];
    delete result['Logistic Info']['Social Profiles'];
    delete result['Logistic Info']['Social profiles'];
    delete result['Logistic Info']['Social Media'];
    delete result['Logistic Info']['Logo'];
    delete result['Logistic Info']['Favicon'];
    delete result['Logistic Info']['Language(s)'];
    delete result['Logistic Info']['Language'];
    delete result['Logistic Info']['Languages'];
    delete result['Logistic Info']['Description'];
    delete result['Logistic Info']['description'];
  }

  // Remove social profiles from Warm Data
  if (result['Warm Data']) {
    delete result['Warm Data']['Social Profile(s)'];
    delete result['Warm Data']['Social Profile'];
    delete result['Warm Data']['Social Profiles'];
    delete result['Warm Data']['Social profiles'];
  }

  // 4. Clean up legacy / mis-mapped keys in Relationships
  if (result['Relationships']) {
    // Specifically remove random "funding" and "key people" fields (case-insensitive)
    Object.keys(result['Relationships']).forEach(rk => {
      const rkLower = rk.trim().toLowerCase();
      if (
        rkLower === 'funding' ||
        rkLower.includes('funding') ||
        rkLower === 'key people' ||
        rkLower.includes('key people') ||
        rkLower.includes('secondary collaboration')
      ) {
        delete result['Relationships'][rk];
      }
    });

    // Funder(s) -> migrate to Founder(s)/Main Source(s) (AL2)
    if (result['Relationships']['Funder(s)']) {
      if (!result['Relationships']['Founder(s)/Main Source(s)']) {
        result['Relationships']['Founder(s)/Main Source(s)'] = result['Relationships']['Funder(s)'];
      }
      delete result['Relationships']['Funder(s)'];
    }
    // Direct Collaborations / Partnerships -> migrate to Teachers/Influences (People) (AO2)
    if (result['Relationships']['Direct Collaborations / Partnerships']) {
      if (!result['Relationships']['Teachers/Influences (People)']) {
        result['Relationships']['Teachers/Influences (People)'] = result['Relationships']['Direct Collaborations / Partnerships'];
      }
      delete result['Relationships']['Direct Collaborations / Partnerships'];
    }
    // Affiliated Networks / Coalitions -> migrate to Partners/Collaborators (People) (AQ2)
    if (result['Relationships']['Affiliated Networks / Coalitions']) {
      if (!result['Relationships']['Partners/Collaborators (People)']) {
        result['Relationships']['Partners/Collaborators (People)'] = result['Relationships']['Affiliated Networks / Coalitions'];
      }
      delete result['Relationships']['Affiliated Networks / Coalitions'];
    }
    // Explicit deletion of exact keys
    delete result['Relationships']['funding'];
    delete result['Relationships']['Funding'];
    delete result['Relationships']['Key People'];
    delete result['Relationships']['key people'];
    delete result['Relationships']['Key people'];
    delete result['Relationships']['Secondary Collaborations / Partnerships'];

    // Ensure canonical Relationships from entity properties if not already set
    if (!result['Relationships']['Founder(s)/Main Source(s)'] && entity.founders?.length) {
      result['Relationships']['Founder(s)/Main Source(s)'] = entity.founders.join(', ');
    }
    if (!result['Relationships']['Partners (Institutions)'] && entity.partners?.length) {
      result['Relationships']['Partners (Institutions)'] = entity.partners.join(', ');
    }
    if (!result['Relationships']['Funders/Supporters (Institutions)'] && entity.funders?.length) {
      result['Relationships']['Funders/Supporters (Institutions)'] = entity.funders.join(', ');
    }
    if (!result['Relationships']['Teachers/Influences (People)'] && entity.teachers?.length) {
      result['Relationships']['Teachers/Influences (People)'] = entity.teachers.join(', ');
    }
    if (!result['Relationships']['Partners/Collaborators (People)'] && entity.collaborators?.length) {
      result['Relationships']['Partners/Collaborators (People)'] = entity.collaborators.join(', ');
    }
  }

  // 5. Ensure "Influence" (AK2) is NOT mistakenly stolen from Teachers/Influences (People)
  if (result['Logistic Info'] && result['Logistic Info']['Influence']) {
    const teachersVal = result['Relationships']?.['Teachers/Influences (People)'];
    const infVal = result['Logistic Info']['Influence'];
    if (
      teachersVal &&
      infVal === teachersVal &&
      !entity.extraFields?.['__col_37'] &&
      !entity.extraFields?.['Influence']
    ) {
      delete result['Logistic Info']['Influence'];
    }
  }

  // 6. Move any fields from "Additional Data" that belong to a canonical category
  if (result['Additional Data']) {
    Object.entries(result['Additional Data']).forEach(([key, val]) => {
      const colDef = findColumnDef(key);
      if (colDef && colDef.category !== 'Additional Data') {
        if (!result[colDef.category]) result[colDef.category] = {};
        if (!result[colDef.category][colDef.field]) {
          result[colDef.category][colDef.field] = val;
        }
        delete result['Additional Data'][key];
      }
    });
    if (Object.keys(result['Additional Data']).length === 0) {
      delete result['Additional Data'];
    }
  }

  // 7. Ensure Warm Data fields from core entity model if not already set (Social Profiles intentionally excluded)
  if (result['Warm Data']) {
    if (!result['Warm Data']['Point of Contact(s)'] && entity.contactName) {
      result['Warm Data']['Point of Contact(s)'] = entity.contactName;
    }
    if (!result['Warm Data']['Email'] && entity.contactEmail) {
      result['Warm Data']['Email'] = entity.contactEmail;
    }
    delete result['Warm Data']['Social Profile(s)'];
    delete result['Warm Data']['Social Profile'];
    delete result['Warm Data']['Social Profiles'];
  }

  // 8. Ensure Discourse Analysis / Argument Mapping fields from core entity model
  if (result['Discourse Analysis / Argument Mapping']) {
    const isNotesDuplicateOfSector = entity.notes && (
      (entity.societalSector && entity.notes.trim().toLowerCase() === entity.societalSector.trim().toLowerCase()) ||
      (entity.categorizedFields?.['Overview']?.['Societal Sector'] && entity.notes.trim().toLowerCase() === String(entity.categorizedFields['Overview']['Societal Sector']).trim().toLowerCase()) ||
      (entity.extraFields?.['Societal Sector'] && entity.notes.trim().toLowerCase() === String(entity.extraFields['Societal Sector']).trim().toLowerCase())
    );
    if (entity.notes && !isNotesDuplicateOfSector) {
      result['Discourse Analysis / Argument Mapping']['Analyst Commentary'] = entity.notes;
    } else {
      delete result['Discourse Analysis / Argument Mapping']['Analyst Commentary'];
    }
  }

  // 9. Thorough purge of obsolete / fabricated fields from ALL categories and Additional Data
  const obsoleteSet = new Set(OBSOLETE_FABRICATED_FIELDS.map(s => s.toLowerCase().trim()));
  Object.keys(result).forEach(cat => {
    Object.keys(result[cat]).forEach(k => {
      if (obsoleteSet.has(k.toLowerCase().trim())) {
        delete result[cat][k];
      }
    });
  });

  // Filter out empty category maps
  const cleanResult: Record<string, Record<string, any>> = {};
  Object.entries(result).forEach(([cat, fields]) => {
    if (Object.keys(fields).length > 0) {
      cleanResult[cat] = fields;
    }
  });

  return cleanResult;
}

/**
 * Strips any obsolete/fabricated fields from an entity's categorizedFields and extraFields,
 * sanitizes website URLs and logo/favicon links, recovers societal sector from mis-mapped notes,
 * and fixes City/State conflicts with Country.
 */
export function sanitizeEntityObsoleteFields(entity: EcosystemEntity): EcosystemEntity {
  const obsoleteSet = new Set(OBSOLETE_FABRICATED_FIELDS.map(s => s.toLowerCase().trim()));

  // 1. Sanitize website URL
  const cleanWeb = cleanWebsiteUrl(entity.website) || (entity.website && !entity.website.toLowerCase().includes('object object') ? entity.website : undefined);

  // 2. Sanitize logo & favicon
  const cleanLogo = cleanImageUrl(entity.logo);
  let cleanFavicon = cleanImageUrl(entity.favicon);
  if (!cleanFavicon && cleanWeb) {
    cleanFavicon = getFaviconFromWebsite(cleanWeb);
  }

  // 3. Fix Societal Sector vs Notes (Analyst Commentary)
  const socSector = entity.societalSector ||
    entity.categorizedFields?.['Overview']?.['Societal Sector'] ||
    (entity.extraFields?.['Societal Sector'] as string | undefined);

  let updatedSocietalSector = entity.societalSector || (socSector ? String(socSector).trim() : undefined);
  let updatedNotes = entity.notes ? String(entity.notes).trim() : undefined;

  // If notes contains the exact Societal Sector value or matches the sector list, clear notes!
  if (updatedNotes && socSector && updatedNotes.toLowerCase() === String(socSector).toLowerCase().trim()) {
    updatedNotes = undefined;
  }

  // 4. Sanitize City/State vs Country
  let updatedCityState = entity.cityState ? String(entity.cityState).trim() : undefined;
  if (updatedCityState && entity.country && updatedCityState.toLowerCase() === entity.country.toLowerCase().trim()) {
    updatedCityState = undefined;
  }

  let updatedCategorized: Record<string, Record<string, any>> | undefined = undefined;
  if (entity.categorizedFields) {
    updatedCategorized = {};
    Object.entries(entity.categorizedFields).forEach(([cat, fields]) => {
      const cleanFields: Record<string, any> = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (!obsoleteSet.has(k.toLowerCase().trim())) {
          if (typeof v === 'string') {
            if (k === 'Website URL' || k === 'Website') {
              cleanFields[k] = cleanWebsiteUrl(v) || v;
            } else if (k === 'Favicon' || k === 'Logo') {
              cleanFields[k] = cleanImageUrl(v) || v;
            } else if (k === 'Analyst Commentary' && socSector && v.toLowerCase().trim() === String(socSector).toLowerCase().trim()) {
              // skip mis-mapped analyst commentary that matches societal sector
            } else {
              cleanFields[k] = v;
            }
          } else {
            cleanFields[k] = v;
          }
        }
      });
      if (Object.keys(cleanFields).length > 0) {
        updatedCategorized![cat] = cleanFields;
      }
    });

    // Ensure Societal Sector is present in Overview
    if (updatedSocietalSector && updatedCategorized['Overview'] && !updatedCategorized['Overview']['Societal Sector']) {
      updatedCategorized['Overview']['Societal Sector'] = updatedSocietalSector;
    }
  }

  let updatedExtra: Record<string, any> | undefined = undefined;
  if (entity.extraFields) {
    updatedExtra = {};
    Object.entries(entity.extraFields).forEach(([k, v]) => {
      if (!obsoleteSet.has(k.toLowerCase().trim())) {
        if (typeof v === 'string') {
          if (k === 'Website URL' || k === 'Website') {
            updatedExtra![k] = cleanWebsiteUrl(v) || v;
          } else if (k === 'Favicon' || k === 'Logo') {
            updatedExtra![k] = cleanImageUrl(v) || v;
          } else {
            updatedExtra![k] = v;
          }
        } else {
          updatedExtra![k] = v;
        }
      }
    });
    if (Object.keys(updatedExtra).length === 0) {
      updatedExtra = undefined;
    }
  }

  return {
    ...entity,
    website: cleanWeb,
    logo: cleanLogo,
    favicon: cleanFavicon,
    societalSector: updatedSocietalSector,
    notes: updatedNotes,
    cityState: updatedCityState,
    categorizedFields: updatedCategorized,
    extraFields: updatedExtra
  };
}

export type ExportFormat = 'xlsx' | 'csv' | 'json';

/**
 * Generates formatted row records matching standard ecosystem columns (A through CI, cols 1 - 87)
 */
export function formatEntityExportRows(entities: EcosystemEntity[]) {
  return entities.map(ent => ({
    'Org ID': ent.id,
    'Name/Label': ent.name,
    'Entity Type': ent.type,
    'Organization Structure': ent.organizationStructure || ent.categorizedFields?.['Overview']?.['Organization Structure'] || ent.extraFields?.['Organization Structure'] || '',
    'Quadrant': ent.quadrant || ent.category || '',
    'Category': ent.spreadsheetCategory || ent.category || '',
    'Stream': ent.stream || (ent.streams && ent.streams.length > 0 ? ent.streams.join(', ') : '') || ent.categorizedFields?.['Overview']?.['Stream'] || '',
    'Archipelago': [ent.continent ? formatClusterWithNumber(ent.continent) : suggestContinent(ent), ...getEntityOtherArchipelagos(ent)].filter(Boolean).join(', '),
    'Layer of Response (Holistic Cultural Materialism)': ent.categorizedFields?.['Overview']?.['Layer of Response (Holistic Cultural Materialism)'] || ent.extraFields?.['Layer of Response (Holistic Cultural Materialism)'] || '',
    'Layer of Response (Gaia Education)': ent.categorizedFields?.['Overview']?.['Layer of Response (Gaia Education)'] || ent.extraFields?.['Layer of Response (Gaia Education)'] || '',
    'Area of Response (Life Itself)': ent.categorizedFields?.['Overview']?.['Area of Response (Life Itself)'] || ent.extraFields?.['Area of Response (Life Itself)'] || '',
    'Societal Sector': ent.categorizedFields?.['Overview']?.['Societal Sector'] || ent.extraFields?.['Societal Sector'] || '',
    'Societal Sector (Catalist)': ent.categorizedFields?.['Overview']?.['Societal Sector (Catalist)'] || ent.extraFields?.['Societal Sector (Catalist)'] || '',
    'Societal Category (Catalist)': ent.categorizedFields?.['Overview']?.['Societal Category (Catalist)'] || ent.extraFields?.['Societal Category (Catalist)'] || '',
    'Approach': (ent.approach && ent.approach.length > 0 ? ent.approach.join(', ') : '') || ent.categorizedFields?.['Overview']?.['Approach'] || '',
    'Issues': (ent.issues && ent.issues.length > 0 ? ent.issues.join(', ') : '') || ent.categorizedFields?.['Overview']?.['Issues'] || '',
    'Activities': (ent.activities && ent.activities.length > 0 ? ent.activities.join(', ') : '') || ent.categorizedFields?.['Overview']?.['Activities'] || '',
    'Keywords/Topics': filterProfileTags(ent.fields, ent).join(', '),
    'Who They Serve': ent.categorizedFields?.['Overview']?.['Who They Serve'] || ent.extraFields?.['Who They Serve'] || '',
    'Community Served (Conscious Change Collective)': ent.categorizedFields?.['Overview']?.['Community Served (Conscious Change Collective)'] || ent.extraFields?.['Community Served (Conscious Change Collective)'] || '',
    'Our Relationship': ent.ourRelationship || ent.categorizedFields?.['Overview']?.['Our Relationship'] || '',
    'Featured?': ent.featured ? 'Yes' : 'No',
    'Filled Fields': ent.filledFields !== undefined ? String(ent.filledFields) : '',
    'Data Completeness': ent.dataCompleteness || ent.dataQuality || 'Bottom 25%',
    'Description': ent.description || '',
    'Website URL': cleanWebsiteUrl(ent.website) || ent.website || '',
    'Social Profiles': ent.categorizedFields?.['Logistic Info']?.['Social Profiles'] || (ent.socialMedia ? Object.values(ent.socialMedia).filter(Boolean).join(', ') : '') || '',
    'Favicon': cleanImageUrl(ent.favicon) || '',
    'Logo': cleanImageUrl(ent.logo) || '',
    'Language(s)': ent.language || ent.categorizedFields?.['Logistic Info']?.['Language(s)'] || '',
    'Biome': ent.biome || ent.bioregion || ent.categorizedFields?.['Logistic Info']?.['Biome'] || ent.categorizedFields?.['Logistic Info']?.['Bioregion'] || '',
    'Bioregion': ent.bioregion || ent.biome || ent.categorizedFields?.['Logistic Info']?.['Bioregion'] || ent.categorizedFields?.['Logistic Info']?.['Biome'] || '',
    'Neighborhood or Demarcated Zone': ent.neighborhood || ent.categorizedFields?.['Logistic Info']?.['Neighborhood or Demarcated Zone'] || '',
    'City/State': ent.cityState || (ent.city && ent.state ? `${ent.city}, ${ent.state}` : ent.city || ent.state || ''),
    'City': ent.city || ent.categorizedFields?.['Logistic Info']?.['City'] || '',
    'State': ent.state || ent.categorizedFields?.['Logistic Info']?.['State'] || '',
    'Country': ent.country || ent.categorizedFields?.['Logistic Info']?.['Country'] || '',
    'Operating Region': ent.operatingRegion || ent.categorizedFields?.['Logistic Info']?.['Operating Region'] || '',
    'Operation Focus': ent.operationFocus || ent.categorizedFields?.['Logistic Info']?.['Operation Focus'] || '',
    'Year Founded': ent.yearFounded !== undefined ? String(ent.yearFounded) : '',
    'Maturity Level': ent.maturityLevel || ent.stage || '',
    'Size': ent.size || ent.categorizedFields?.['Logistic Info']?.['Size'] || '',
    'Social Media Reach': ent.socialMediaReach || ent.categorizedFields?.['Logistic Info']?.['Social Media Reach'] || '',
    'Impact Reach': ent.impactReach || ent.reach || ent.categorizedFields?.['Logistic Info']?.['Impact Reach'] || '',
    'Influence': ent.influence || ent.categorizedFields?.['Logistic Info']?.['Influence'] || '',
    'Founder(s)/Main Source(s)': (ent.founders || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Founder(s)/Main Source(s)'] || '',
    'Partners (Institutions)': (ent.partners || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Partners (Institutions)'] || '',
    'Funders/Supporters (Institutions)': (ent.funders || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Funders/Supporters (Institutions)'] || '',
    'Teachers/Influences (People)': (ent.teachers || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Teachers/Influences (People)'] || '',
    'Ethnic/Spiritual Lineage(s)': (ent.ethnicSpiritualLineages || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Ethnic/Spiritual Lineage(s)'] || '',
    'Intellectual Lineage (IAM)': ent.intellectualLineage || ent.categorizedFields?.['Relationships']?.['Intellectual Lineage (IAM)'] || '',
    'Partners/Collaborators (People)': (ent.collaborators || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Partners/Collaborators (People)'] || '',
    'Transformation Focus (I-V) - Inner, Social, Cultural, Systems': ent.categorizedFields?.['Worldview & Change Orientation']?.['Transformation Focus (I-V) - Inner, Social, Cultural, Systems'] || ent.categorizedFields?.['Worldview & Change Orientation']?.['Transformation Focus (I-V) - inner, social, cultural, systems'] || ent.extraFields?.['Transformation Focus (I-V) - Inner, Social, Cultural, Systems'] || '',
    'Situational Assessment': ent.categorizedFields?.['Worldview & Change Orientation']?.['Situational Assessment'] || ent.extraFields?.['Situational Assessment'] || '',
    'Situational Assessment Comments/Description': ent.situationalAssessmentComments || ent.categorizedFields?.['Worldview & Change Orientation']?.['Situational Assessment Comments/Description'] || '',
    'Response Orientation': ent.categorizedFields?.['Worldview & Change Orientation']?.['Response Orientation'] || ent.extraFields?.['Response Orientation'] || '',
    'Alternative(s) Proposed (GTA)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Alternative(s) Proposed (GTA)'] || ent.extraFields?.['Alternative(s) Proposed (GTA)'] || '',
    'Alternative(s) Proposed (Pluriverse dictionary)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Alternative(s) Proposed (Pluriverse dictionary)'] || ent.extraFields?.['Alternative(s) Proposed (Pluriverse dictionary)'] || '',
    'Alternative(s) Proposed (Mútua)': ent.altMutua || ent.categorizedFields?.['Worldview & Change Orientation']?.['Alternative(s) Proposed (Mútua)'] || '',
    'Alternative(s) Proposed': ent.categorizedFields?.['Worldview & Change Orientation']?.['Alternative(s) Proposed'] || ent.extraFields?.['Alternative(s) Proposed'] || '',
    'Value Meme / Ethical Orientation': ent.valueMemeEthicalOrientation || ent.categorizedFields?.['Worldview & Change Orientation']?.['Value Meme / Ethical Orientation'] || ent.categorizedFields?.['Worldview & Change Orientation']?.['Value Meme'] || '',
    'Theory of Change (GTDF)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Theory of Change (GTDF)'] || ent.extraFields?.['Theory of Change (GTDF)'] || '',
    'Theory of Change (IAM)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Theory of Change (IAM)'] || ent.extraFields?.['Theory of Change (IAM)'] || '',
    'Crisis of Response': ent.categorizedFields?.['Worldview & Change Orientation']?.['Crisis of Response'] || ent.extraFields?.['Crisis of Response'] || '',
    'Paradigmatic? (Life Itself)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Paradigmatic? (Life Itself)'] || ent.extraFields?.['Paradigmatic? (Life Itself)'] || '',
    'Integrative? (Life Itself)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Integrative? (Life Itself)'] || ent.extraFields?.['Integrative? (Life Itself)'] || '',
    'Pragmatic? (Life Itself)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Pragmatic? (Life Itself)'] || ent.extraFields?.['Pragmatic? (Life Itself)'] || '',
    'Orientation to Change (Three Horizons)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (Three Horizons)'] || ent.extraFields?.['Orientation to Change (Three Horizons)'] || '',
    'Orientation to Change (GTDF)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (GTDF)'] || ent.extraFields?.['Orientation to Change (GTDF)'] || '',
    'Orientation to Change (CRI)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (CRI)'] || ent.extraFields?.['Orientation to Change (CRI)'] || '',
    'SDGs/Social Issues (Conscious Change Collective)': ent.categorizedFields?.['Worldview & Change Orientation']?.['SDGs/Social Issues (Conscious Change Collective)'] || ent.extraFields?.['SDGs/Social Issues (Conscious Change Collective)'] || '',
    'Relevant Resources': ent.categorizedFields?.['Worldview & Change Orientation']?.['Relevant Resources'] || ent.extraFields?.['Relevant Resources'] || '',
    'Featured Resources': ent.categorizedFields?.['Worldview & Change Orientation']?.['Featured Resources'] || ent.extraFields?.['Featured Resources'] || '',
    'IDGs/Inner Capacities': ent.categorizedFields?.['Worldview & Change Orientation']?.['IDGs/Inner Capacities'] || ent.extraFields?.['IDGs/Inner Capacities'] || '',
    'Inner Work Modalities (Conscious Change Collective)': ent.categorizedFields?.['Worldview & Change Orientation']?.['Inner Work Modalities (Conscious Change Collective)'] || ent.extraFields?.['Inner Work Modalities (Conscious Change Collective)'] || '',
    'Practices': ent.categorizedFields?.['Worldview & Change Orientation']?.['Practices'] || ent.extraFields?.['Practices'] || '',
    'Offerings': ent.categorizedFields?.['Worldview & Change Orientation']?.['Offerings'] || ent.extraFields?.['Offerings'] || '',
    'Point of Contact(s)': ent.contactName || ent.categorizedFields?.['Warm Data']?.['Point of Contact(s)'] || ent.extraFields?.['Point of Contact(s)'] || '',
    'Email': ent.contactEmail || ent.categorizedFields?.['Warm Data']?.['Email'] || ent.extraFields?.['Email'] || '',
    'Social Profile(s)': ent.categorizedFields?.['Warm Data']?.['Social Profile(s)'] || (ent.socialMedia ? Object.values(ent.socialMedia).filter(Boolean).join(', ') : '') || '',
    'Matching Database': ent.categorizedFields?.['Warm Data']?.['Matching Database'] || ent.categorizedFields?.['Warm Data']?.['Corresponding Database'] || ent.extraFields?.['Matching Database'] || '',
    'Concepts': ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Concepts'] || ent.extraFields?.['Concepts'] || '',
    'Frameworks': ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Frameworks'] || ent.extraFields?.['Frameworks'] || '',
    'Definitions': ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Definitions'] || ent.extraFields?.['Definitions'] || '',
    'Arguments/Claims': ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Arguments/Claims'] || ent.extraFields?.['Arguments/Claims'] || '',
    'Evidence/Sources': ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Evidence/Sources'] || ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Evidence'] || ent.extraFields?.['Evidence/Sources'] || '',
    'Hypotheses': ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Hypotheses'] || ent.extraFields?.['Hypotheses'] || '',
    'Analyst Commentary': (ent.notes && ent.notes !== ent.societalSector ? ent.notes : '') || ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Analyst Commentary'] || '',
    'Map Position X': Math.round(ent.x),
    'Map Position Y': Math.round(ent.y)
  }));
}

function triggerDownload(blob: Blob, downloadFilename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadFilename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export entities to Excel workbook download matching the full schema (cols A - CI, 1 - 87)
 */
export async function exportEntitiesToXlsx(entities: EcosystemEntity[], filename = 'metta_ecosystem_map.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ecosystem Map Data');

  // Define columns matching spreadsheet schema A - CI (1 - 87)
  sheet.columns = [
    { header: 'Org ID', key: 'id', width: 14 },
    { header: 'Name/Label', key: 'name', width: 28 },
    { header: 'Entity Type', key: 'type', width: 16 },
    { header: 'Organization Structure', key: 'organizationStructure', width: 22 },
    { header: 'Quadrant', key: 'quadrant', width: 16 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Stream', key: 'stream', width: 20 },
    { header: 'Archipelago', key: 'continent', width: 28 },
    { header: 'Layer of Response (Holistic Cultural Materialism)', key: 'layerHcm', width: 28 },
    { header: 'Layer of Response (Gaia Education)', key: 'layerGaia', width: 28 },
    { header: 'Area of Response (Life Itself)', key: 'areaLifeItself', width: 28 },
    { header: 'Societal Sector', key: 'societalSector', width: 20 },
    { header: 'Societal Sector (Catalist)', key: 'societalSectorCatalist', width: 24 },
    { header: 'Societal Category (Catalist)', key: 'societalCategoryCatalist', width: 24 },
    { header: 'Approach', key: 'approach', width: 20 },
    { header: 'Issues', key: 'issues', width: 24 },
    { header: 'Activities', key: 'activities', width: 24 },
    { header: 'Keywords/Topics', key: 'fields', width: 30 },
    { header: 'Who They Serve', key: 'whoTheyServe', width: 24 },
    { header: 'Community Served (Conscious Change Collective)', key: 'communityServedCcc', width: 28 },
    { header: 'Our Relationship', key: 'ourRelationship', width: 20 },
    { header: 'Featured?', key: 'featured', width: 12 },
    { header: 'Filled Fields', key: 'filledFields', width: 14 },
    { header: 'Data Completeness', key: 'dataCompleteness', width: 18 },
    { header: 'Description', key: 'description', width: 45 },
    { header: 'Website URL', key: 'website', width: 28 },
    { header: 'Social Profiles', key: 'socialProfiles', width: 30 },
    { header: 'Favicon', key: 'favicon', width: 28 },
    { header: 'Logo', key: 'logo', width: 28 },
    { header: 'Language(s)', key: 'language', width: 15 },
    { header: 'Biome', key: 'biome', width: 20 },
    { header: 'Neighborhood or Demarcated Zone', key: 'neighborhood', width: 24 },
    { header: 'City/State', key: 'cityState', width: 20 },
    { header: 'City', key: 'city', width: 18 },
    { header: 'State', key: 'state', width: 16 },
    { header: 'Country', key: 'country', width: 18 },
    { header: 'Operating Region', key: 'operatingRegion', width: 20 },
    { header: 'Operation Focus', key: 'operationFocus', width: 20 },
    { header: 'Year Founded', key: 'yearFounded', width: 14 },
    { header: 'Maturity Level', key: 'stage', width: 16 },
    { header: 'Size', key: 'size', width: 16 },
    { header: 'Social Media Reach', key: 'socialMediaReach', width: 20 },
    { header: 'Impact Reach', key: 'impactReach', width: 20 },
    { header: 'Influence', key: 'influence', width: 20 },
    { header: 'Founder(s)/Main Source(s)', key: 'founders', width: 30 },
    { header: 'Partners (Institutions)', key: 'partners', width: 30 },
    { header: 'Funders/Supporters (Institutions)', key: 'funders', width: 30 },
    { header: 'Teachers/Influences (People)', key: 'teachers', width: 30 },
    { header: 'Ethnic/Spiritual Lineage(s)', key: 'ethnicLineages', width: 28 },
    { header: 'Intellectual Lineage (IAM)', key: 'intellectualLineage', width: 28 },
    { header: 'Partners/Collaborators (People)', key: 'collaborators', width: 30 },
    
    // Worldview & Change Orientation (AZ - BX, 52 - 76)
    { header: 'Transformation Focus (I-V) - Inner, Social, Cultural, Systems', key: 'transformationFocus', width: 30 },
    { header: 'Situational Assessment', key: 'situationalAssessment', width: 30 },
    { header: 'Situational Assessment Comments/Description', key: 'situationalAssessmentComments', width: 30 },
    { header: 'Response Orientation', key: 'responseOrientation', width: 30 },
    { header: 'Alternative(s) Proposed (GTA)', key: 'altGta', width: 28 },
    { header: 'Alternative(s) Proposed (Pluriverse dictionary)', key: 'altPluriverse', width: 28 },
    { header: 'Alternative(s) Proposed (Mútua)', key: 'altMutua', width: 28 },
    { header: 'Alternative(s) Proposed', key: 'altProposed', width: 28 },
    { header: 'Value Meme / Ethical Orientation', key: 'valueMeme', width: 24 },
    { header: 'Theory of Change (GTDF)', key: 'tocGtdf', width: 30 },
    { header: 'Theory of Change (IAM)', key: 'tocIam', width: 30 },
    { header: 'Crisis of Response', key: 'crisisOfResponse', width: 25 },
    { header: 'Paradigmatic? (Life Itself)', key: 'paradigmatic', width: 22 },
    { header: 'Integrative? (Life Itself)', key: 'integrative', width: 22 },
    { header: 'Pragmatic? (Life Itself)', key: 'pragmatic', width: 22 },
    { header: 'Orientation to Change (Three Horizons)', key: 'orientation3H', width: 28 },
    { header: 'Orientation to Change (GTDF)', key: 'orientationGtdf', width: 28 },
    { header: 'Orientation to Change (CRI)', key: 'orientationCri', width: 28 },
    { header: 'SDGs/Social Issues (Conscious Change Collective)', key: 'sdgsIssues', width: 30 },
    { header: 'Relevant Resources', key: 'relevantResources', width: 28 },
    { header: 'Featured Resources', key: 'featuredResources', width: 28 },
    { header: 'IDGs/Inner Capacities', key: 'idgs', width: 28 },
    { header: 'Inner Work Modalities (Conscious Change Collective)', key: 'innerWorkModalities', width: 30 },
    { header: 'Practices', key: 'practices', width: 28 },
    { header: 'Offerings', key: 'offerings', width: 28 },

    // Warm Data (BY - CB, 77 - 80)
    { header: 'Point of Contact(s)', key: 'pointOfContact', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Social Profile(s)', key: 'socialProfilesWarm', width: 30 },
    { header: 'Matching Database', key: 'matchingDatabase', width: 28 },

    // Discourse Analysis / Argument Mapping (CC - CI, 81 - 87)
    { header: 'Concepts', key: 'concepts', width: 28 },
    { header: 'Frameworks', key: 'frameworks', width: 28 },
    { header: 'Definitions', key: 'definitions', width: 28 },
    { header: 'Arguments/Claims', key: 'argumentsClaims', width: 30 },
    { header: 'Evidence/Sources', key: 'evidenceSources', width: 28 },
    { header: 'Hypotheses', key: 'hypotheses', width: 28 },
    { header: 'Analyst Commentary', key: 'notes', width: 35 },

    { header: 'Map Position X', key: 'x', width: 15 },
    { header: 'Map Position Y', key: 'y', width: 15 }
  ];

  entities.forEach(ent => {
    sheet.addRow({
      id: ent.id,
      name: ent.name,
      type: ent.type,
      organizationStructure: ent.organizationStructure || ent.categorizedFields?.['Overview']?.['Organization Structure'] || ent.extraFields?.['Organization Structure'] || '',
      quadrant: ent.quadrant || ent.category || '',
      category: ent.spreadsheetCategory || ent.category || '',
      stream: ent.stream || (ent.streams && ent.streams.length > 0 ? ent.streams.join(', ') : '') || ent.categorizedFields?.['Overview']?.['Stream'] || '',
      continent: [ent.continent ? formatClusterWithNumber(ent.continent) : suggestContinent(ent), ...getEntityOtherArchipelagos(ent)].filter(Boolean).join(', '),
      layerHcm: ent.categorizedFields?.['Overview']?.['Layer of Response (Holistic Cultural Materialism)'] || ent.extraFields?.['Layer of Response (Holistic Cultural Materialism)'] || '',
      layerGaia: ent.categorizedFields?.['Overview']?.['Layer of Response (Gaia Education)'] || ent.extraFields?.['Layer of Response (Gaia Education)'] || '',
      areaLifeItself: ent.categorizedFields?.['Overview']?.['Area of Response (Life Itself)'] || ent.extraFields?.['Area of Response (Life Itself)'] || '',
      societalSector: ent.categorizedFields?.['Overview']?.['Societal Sector'] || ent.extraFields?.['Societal Sector'] || '',
      societalSectorCatalist: ent.categorizedFields?.['Overview']?.['Societal Sector (Catalist)'] || ent.extraFields?.['Societal Sector (Catalist)'] || '',
      societalCategoryCatalist: ent.categorizedFields?.['Overview']?.['Societal Category (Catalist)'] || ent.extraFields?.['Societal Category (Catalist)'] || '',
      approach: (ent.approach && ent.approach.length > 0 ? ent.approach.join(', ') : '') || ent.categorizedFields?.['Overview']?.['Approach'] || '',
      issues: (ent.issues && ent.issues.length > 0 ? ent.issues.join(', ') : '') || ent.categorizedFields?.['Overview']?.['Issues'] || '',
      activities: (ent.activities && ent.activities.length > 0 ? ent.activities.join(', ') : '') || ent.categorizedFields?.['Overview']?.['Activities'] || '',
      fields: ent.fields.join(', '),
      whoTheyServe: ent.categorizedFields?.['Overview']?.['Who They Serve'] || ent.extraFields?.['Who They Serve'] || '',
      communityServedCcc: ent.categorizedFields?.['Overview']?.['Community Served (Conscious Change Collective)'] || ent.extraFields?.['Community Served (Conscious Change Collective)'] || '',
      ourRelationship: ent.ourRelationship || ent.categorizedFields?.['Overview']?.['Our Relationship'] || '',
      featured: ent.featured ? 'Yes' : 'No',
      filledFields: ent.filledFields !== undefined ? String(ent.filledFields) : '',
      dataCompleteness: ent.dataCompleteness || ent.dataQuality || 'Bottom 25%',
      description: ent.description || '',
      website: ent.website || '',
      socialProfiles: ent.categorizedFields?.['Logistic Info']?.['Social Profiles'] || (ent.socialMedia ? Object.values(ent.socialMedia).filter(Boolean).join(', ') : '') || '',
      favicon: ent.favicon || '',
      logo: ent.logo || '',
      language: ent.language || ent.categorizedFields?.['Logistic Info']?.['Language(s)'] || '',
      biome: ent.biome || ent.bioregion || ent.categorizedFields?.['Logistic Info']?.['Biome'] || ent.categorizedFields?.['Logistic Info']?.['Bioregion'] || '',
      bioregion: ent.biome || ent.bioregion || '',
      neighborhood: ent.neighborhood || ent.categorizedFields?.['Logistic Info']?.['Neighborhood or Demarcated Zone'] || '',
      cityState: ent.cityState || ent.location || '',
      city: ent.city || ent.categorizedFields?.['Logistic Info']?.['City'] || '',
      state: ent.state || ent.categorizedFields?.['Logistic Info']?.['State'] || '',
      country: ent.country || ent.categorizedFields?.['Logistic Info']?.['Country'] || '',
      operatingRegion: ent.operatingRegion || ent.categorizedFields?.['Logistic Info']?.['Operating Region'] || '',
      operationFocus: ent.operationFocus || ent.categorizedFields?.['Logistic Info']?.['Operation Focus'] || '',
      yearFounded: ent.yearFounded !== undefined ? String(ent.yearFounded) : '',
      stage: ent.maturityLevel || ent.stage || '',
      size: ent.size || ent.categorizedFields?.['Logistic Info']?.['Size'] || '',
      socialMediaReach: ent.socialMediaReach || ent.categorizedFields?.['Logistic Info']?.['Social Media Reach'] || '',
      impactReach: ent.impactReach || ent.reach || ent.categorizedFields?.['Logistic Info']?.['Impact Reach'] || '',
      influence: ent.influence || ent.categorizedFields?.['Logistic Info']?.['Influence'] || '',
      founders: (ent.founders || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Founder(s)/Main Source(s)'] || '',
      partners: (ent.partners || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Partners (Institutions)'] || '',
      funders: (ent.funders || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Funders/Supporters (Institutions)'] || '',
      teachers: (ent.teachers || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Teachers/Influences (People)'] || '',
      ethnicLineages: (ent.ethnicSpiritualLineages || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Ethnic/Spiritual Lineage(s)'] || '',
      intellectualLineage: ent.intellectualLineage || ent.categorizedFields?.['Relationships']?.['Intellectual Lineage (IAM)'] || '',
      collaborators: (ent.collaborators || []).join(', ') || ent.categorizedFields?.['Relationships']?.['Partners/Collaborators (People)'] || '',
      
      // Worldview & Change Orientation (AZ - BX)
      transformationFocus: ent.categorizedFields?.['Worldview & Change Orientation']?.['Transformation Focus (I-V) - Inner, Social, Cultural, Systems'] || ent.categorizedFields?.['Worldview & Change Orientation']?.['Transformation Focus (I-V) - inner, social, cultural, systems'] || ent.extraFields?.['Transformation Focus (I-V) - Inner, Social, Cultural, Systems'] || '',
      situationalAssessment: ent.categorizedFields?.['Worldview & Change Orientation']?.['Situational Assessment'] || ent.extraFields?.['Situational Assessment'] || '',
      situationalAssessmentComments: ent.situationalAssessmentComments || ent.categorizedFields?.['Worldview & Change Orientation']?.['Situational Assessment Comments/Description'] || '',
      responseOrientation: ent.categorizedFields?.['Worldview & Change Orientation']?.['Response Orientation'] || ent.extraFields?.['Response Orientation'] || '',
      altGta: ent.categorizedFields?.['Worldview & Change Orientation']?.['Alternative(s) Proposed (GTA)'] || ent.extraFields?.['Alternative(s) Proposed (GTA)'] || '',
      altPluriverse: ent.categorizedFields?.['Worldview & Change Orientation']?.['Alternative(s) Proposed (Pluriverse dictionary)'] || ent.extraFields?.['Alternative(s) Proposed (Pluriverse dictionary)'] || '',
      altMutua: ent.altMutua || ent.categorizedFields?.['Worldview & Change Orientation']?.['Alternative(s) Proposed (Mútua)'] || '',
      altProposed: ent.categorizedFields?.['Worldview & Change Orientation']?.['Alternative(s) Proposed'] || ent.extraFields?.['Alternative(s) Proposed'] || '',
      valueMeme: ent.valueMemeEthicalOrientation || ent.categorizedFields?.['Worldview & Change Orientation']?.['Value Meme / Ethical Orientation'] || ent.categorizedFields?.['Worldview & Change Orientation']?.['Value Meme'] || '',
      tocGtdf: ent.categorizedFields?.['Worldview & Change Orientation']?.['Theory of Change (GTDF)'] || ent.extraFields?.['Theory of Change (GTDF)'] || '',
      tocIam: ent.categorizedFields?.['Worldview & Change Orientation']?.['Theory of Change (IAM)'] || ent.extraFields?.['Theory of Change (IAM)'] || '',
      crisisOfResponse: ent.categorizedFields?.['Worldview & Change Orientation']?.['Crisis of Response'] || ent.extraFields?.['Crisis of Response'] || '',
      paradigmatic: ent.categorizedFields?.['Worldview & Change Orientation']?.['Paradigmatic? (Life Itself)'] || ent.extraFields?.['Paradigmatic? (Life Itself)'] || '',
      integrative: ent.categorizedFields?.['Worldview & Change Orientation']?.['Integrative? (Life Itself)'] || ent.extraFields?.['Integrative? (Life Itself)'] || '',
      pragmatic: ent.categorizedFields?.['Worldview & Change Orientation']?.['Pragmatic? (Life Itself)'] || ent.extraFields?.['Pragmatic? (Life Itself)'] || '',
      orientation3H: ent.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (Three Horizons)'] || ent.extraFields?.['Orientation to Change (Three Horizons)'] || '',
      orientationGtdf: ent.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (GTDF)'] || ent.extraFields?.['Orientation to Change (GTDF)'] || '',
      orientationCri: ent.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (CRI)'] || ent.extraFields?.['Orientation to Change (CRI)'] || '',
      sdgsIssues: ent.categorizedFields?.['Worldview & Change Orientation']?.['SDGs/Social Issues (Conscious Change Collective)'] || ent.extraFields?.['SDGs/Social Issues (Conscious Change Collective)'] || '',
      relevantResources: ent.categorizedFields?.['Worldview & Change Orientation']?.['Relevant Resources'] || ent.extraFields?.['Relevant Resources'] || '',
      featuredResources: ent.categorizedFields?.['Worldview & Change Orientation']?.['Featured Resources'] || ent.extraFields?.['Featured Resources'] || '',
      idgs: ent.categorizedFields?.['Worldview & Change Orientation']?.['IDGs/Inner Capacities'] || ent.extraFields?.['IDGs/Inner Capacities'] || '',
      innerWorkModalities: ent.categorizedFields?.['Worldview & Change Orientation']?.['Inner Work Modalities (Conscious Change Collective)'] || ent.extraFields?.['Inner Work Modalities (Conscious Change Collective)'] || '',
      practices: ent.categorizedFields?.['Worldview & Change Orientation']?.['Practices'] || ent.extraFields?.['Practices'] || '',
      offerings: ent.categorizedFields?.['Worldview & Change Orientation']?.['Offerings'] || ent.extraFields?.['Offerings'] || '',

      // Warm Data (BY - CB)
      pointOfContact: ent.contactName || ent.categorizedFields?.['Warm Data']?.['Point of Contact(s)'] || ent.extraFields?.['Point of Contact(s)'] || '',
      email: ent.contactEmail || ent.categorizedFields?.['Warm Data']?.['Email'] || ent.extraFields?.['Email'] || '',
      socialProfilesWarm: ent.categorizedFields?.['Warm Data']?.['Social Profile(s)'] || (ent.socialMedia ? Object.values(ent.socialMedia).filter(Boolean).join(', ') : '') || '',
      matchingDatabase: ent.categorizedFields?.['Warm Data']?.['Matching Database'] || ent.categorizedFields?.['Warm Data']?.['Corresponding Database'] || ent.extraFields?.['Matching Database'] || '',

      // Discourse Analysis / Argument Mapping (CC - CI)
      concepts: ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Concepts'] || ent.extraFields?.['Concepts'] || '',
      frameworks: ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Frameworks'] || ent.extraFields?.['Frameworks'] || '',
      definitions: ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Definitions'] || ent.extraFields?.['Definitions'] || '',
      argumentsClaims: ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Arguments/Claims'] || ent.extraFields?.['Arguments/Claims'] || '',
      evidenceSources: ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Evidence/Sources'] || ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Evidence'] || ent.extraFields?.['Evidence/Sources'] || '',
      hypotheses: ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Hypotheses'] || ent.extraFields?.['Hypotheses'] || '',
      notes: ent.notes || ent.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Analyst Commentary'] || '',

      x: Math.round(ent.x),
      y: Math.round(ent.y)
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Export entities to CSV spreadsheet (.csv)
 */
export function exportEntitiesToCsv(entities: EcosystemEntity[], filename = 'metta_ecosystem_map.csv') {
  const rows = formatEntityExportRows(entities);
  const csvString = Papa.unparse(rows);
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Export entities to structured JSON dataset (.json)
 */
export function exportEntitiesToJson(entities: EcosystemEntity[], filename = 'metta_ecosystem_map.json') {
  const jsonString = JSON.stringify(entities, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

/**
 * Unified exporter supporting .xlsx, .csv, and .json
 */
export async function exportEntities(
  entities: EcosystemEntity[],
  format: ExportFormat,
  baseFilename = `metta_ecosystem_map_${new Date().toISOString().slice(0, 10)}`
) {
  if (format === 'csv') {
    exportEntitiesToCsv(entities, `${baseFilename}.csv`);
  } else if (format === 'json') {
    exportEntitiesToJson(entities, `${baseFilename}.json`);
  } else {
    await exportEntitiesToXlsx(entities, `${baseFilename}.xlsx`);
  }
}

/**
 * Extracts a specific spreadsheet column value from an entity.
 * Supports both new and legacy column letters/codes (e.g. 'U2'/'S2', 'AD2'/'AA2', 'AE2'/'AB2')
 * and canonical field names (e.g. 'Our Relationship', 'Bioregion', 'Quadrant').
 */
export function getEntitySpreadsheetField(
  entity: EcosystemEntity,
  colOrName: string
): string | undefined {
  if (!entity || !colOrName) return undefined;
  const key = colOrName.trim().toUpperCase();

  // Legacy component calls compatibility (DirectoryView, LeftSidebar, App.tsx):
  if (key === 'S2' || key === 'OUR RELATIONSHIP') {
    const val = entity.ourRelationship || entity.categorizedFields?.['Overview']?.['Our Relationship'] || entity.extraFields?.['Our Relationship'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AA2' || key === 'LANGUAGE' || key === 'LANGUAGES' || key === 'LANGUAGE(S)') {
    const val = entity.language || entity.categorizedFields?.['Logistic Info']?.['Language(s)'] || entity.extraFields?.['Language(s)'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AE' || key === 'AE2' || key === 'BIOME' || key === 'BIOMES' || key === 'BIOREGION' || key === 'BIOREGIONS' || key === 'AB2') {
    const val = entity.biome || entity.bioregion || entity.categorizedFields?.['Logistic Info']?.['Biome'] || entity.categorizedFields?.['Logistic Info']?.['Bioregion'] || entity.extraFields?.['Biome'] || entity.extraFields?.['Bioregion'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AC2' || key === 'AG2' || key === 'AG' || key === 'CITY/STATE' || key === 'CITY, STATE' || key === 'CITY STATE') {
    const cs = entity.cityState || entity.categorizedFields?.['Logistic Info']?.['City/State'] || entity.extraFields?.['City/State'];
    if (cs) return String(cs).trim();
    if (entity.location && entity.location.includes(',')) {
      const parts = entity.location.split(',').map(s => s.trim());
      if (parts.length === 2) return parts[0];
      if (parts.length >= 3) return `${parts[0]}, ${parts[1]}`;
    }
    return undefined;
  }
  if (key === 'AD2' || key === 'AJ2' || key === 'AJ' || key === 'COUNTRY' || key === 'NATION') {
    const c = entity.country || entity.categorizedFields?.['Logistic Info']?.['Country'] || entity.extraFields?.['Country'];
    if (c) return String(c).trim();
    if (entity.location) {
      const parts = entity.location.split(',').map(s => s.trim());
      if (parts.length === 1) return parts[0];
      if (parts.length >= 2) return parts[parts.length - 1];
    }
    return undefined;
  }
  if (key === 'AK2' || key === 'AK' || key === 'OPERATING REGION' || key === 'REGION') {
    const val = entity.operatingRegion || entity.categorizedFields?.['Logistic Info']?.['Operating Region'] || entity.extraFields?.['Operating Region'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AF2' || key === 'AL2' || key === 'AL' || key === 'OPERATION FOCUS' || key === 'OPERATIONAL FOCUS') {
    const val = entity.operationFocus || entity.categorizedFields?.['Logistic Info']?.['Operation Focus'] || entity.extraFields?.['Operation Focus'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AM2' || key === 'AM' || key === 'YEAR FOUNDED' || key === 'FOUNDED' || key === 'FOUNDED YEAR') {
    const val = entity.yearFounded !== undefined ? String(entity.yearFounded) : (entity.categorizedFields?.['Logistic Info']?.['Year Founded'] || entity.extraFields?.['Year Founded']);
    return val !== undefined && val !== null ? String(val).trim() : undefined;
  }
  if (key === 'AH2' || key === 'AN2' || key === 'AN' || key === 'MATURITY LEVEL' || key === 'MATURITY' || key === 'STAGE') {
    const val = entity.maturityLevel || entity.stage || entity.categorizedFields?.['Logistic Info']?.['Maturity Level'] || entity.extraFields?.['Maturity Level'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AI2' || key === 'AO2' || key === 'AO' || key === 'SIZE' || key === 'TEAM SIZE') {
    const val = entity.size || entity.categorizedFields?.['Logistic Info']?.['Size'] || entity.extraFields?.['Size'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AJ2' || key === 'AQ2' || key === 'AQ' || key === 'IMPACT REACH' || key === 'REACH') {
    const val = entity.impactReach || entity.reach || entity.socialMediaReach || entity.categorizedFields?.['Logistic Info']?.['Impact Reach'] || entity.extraFields?.['Impact Reach'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AV2' || key === 'AV' || key === 'TEACHERS' || key === 'TEACHERS/INFLUENCES (PEOPLE)') {
    const val = (entity.teachers && entity.teachers.length > 0 ? entity.teachers.join(', ') : undefined) ||
      entity.categorizedFields?.['Relationships']?.['Teachers/Influences (People)'] ||
      entity.extraFields?.['Teachers/Influences (People)'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AR2' || key === 'AR' || key === 'INFLUENCE') {
    const val = entity.influence || entity.categorizedFields?.['Logistic Info']?.['Influence'] || entity.extraFields?.['Influence'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AS2' || key === 'AS' || key === 'FOUNDERS' || key === 'FOUNDER(S)/MAIN SOURCE(S)') {
    const val = (entity.founders && entity.founders.length > 0 ? entity.founders.join(', ') : undefined) ||
      entity.categorizedFields?.['Relationships']?.['Founder(s)/Main Source(s)'] ||
      entity.extraFields?.['Founder(s)/Main Source(s)'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AT2' || key === 'AT' || key === 'PARTNERS (INSTITUTIONS)') {
    const val = (entity.partners && entity.partners.length > 0 ? entity.partners.join(', ') : undefined) ||
      entity.categorizedFields?.['Relationships']?.['Partners (Institutions)'] ||
      entity.extraFields?.['Partners (Institutions)'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'AU2' || key === 'AU' || key === 'FUNDERS/SUPPORTERS (INSTITUTIONS)') {
    const val = (entity.funders && entity.funders.length > 0 ? entity.funders.join(', ') : undefined) ||
      entity.categorizedFields?.['Relationships']?.['Funders/Supporters (Institutions)'] ||
      entity.extraFields?.['Funders/Supporters (Institutions)'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'BA2' || key === 'BA' || key === 'SITUATIONAL ASSESSMENT') {
    const val = entity.categorizedFields?.['Worldview & Change Orientation']?.['Situational Assessment'] || entity.extraFields?.['Situational Assessment'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'BH2' || key === 'BH' || key === 'VALUE MEME / ETHICAL ORIENTATION' || key === 'VALUE MEME' || key === 'ETHICAL ORIENTATION') {
    const val = entity.valueMemeEthicalOrientation || entity.categorizedFields?.['Worldview & Change Orientation']?.['Value Meme / Ethical Orientation'] || entity.categorizedFields?.['Worldview & Change Orientation']?.['Value Meme'] || entity.extraFields?.['Value Meme / Ethical Orientation'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'BO2' || key === 'BO' || key === 'ORIENTATION TO CHANGE (THREE HORIZONS)' || key === 'THREE HORIZONS') {
    const val = entity.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (Three Horizons)'] || entity.extraFields?.['Orientation to Change (Three Horizons)'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'BP2' || key === 'BP' || key === 'ORIENTATION TO CHANGE (GTDF)' || key === 'GTDF') {
    const val = entity.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (GTDF)'] || entity.extraFields?.['Orientation to Change (GTDF)'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'BQ2' || key === 'BQ' || key === 'ORIENTATION TO CHANGE (CRI)' || key === 'CRI') {
    const val = entity.categorizedFields?.['Worldview & Change Orientation']?.['Orientation to Change (CRI)'] || entity.extraFields?.['Orientation to Change (CRI)'];
    return val ? String(val).trim() : undefined;
  }
  if (key === 'CB2' || key === 'CB' || key === 'MATCHING DATABASE' || key === 'CORRESPONDING DATABASE') {
    const val = entity.categorizedFields?.['Warm Data']?.['Matching Database'] || entity.categorizedFields?.['Warm Data']?.['Corresponding Database'] || entity.extraFields?.['Matching Database'] || entity.extraFields?.['Corresponding Database'];
    return val ? String(val).trim() : undefined;
  }

  // Canonical ColumnDef lookup:
  const colDef = findColumnDef(colOrName);
  if (colDef) {
    if (colDef.field === 'Org ID') return entity.id;
    if (colDef.field === 'Name/Label') return entity.name;
    if (colDef.field === 'Entity Type') return entity.type;
    if (colDef.field === 'Organization Structure') return entity.organizationStructure || entity.categorizedFields?.['Overview']?.['Organization Structure'] || entity.extraFields?.['Organization Structure'];
    if (colDef.field === 'Quadrant') return entity.quadrant || entity.category;
    if (colDef.field === 'Archipelago') return entity.continent;
    if (colDef.field === 'Stream') return entity.stream || (entity.streams && entity.streams.join(', '));
    if (colDef.field === 'Description') return entity.description;
    if (colDef.field === 'Website URL') return entity.website;
    if (colDef.field === 'Logo') return entity.logo;
    if (colDef.field === 'Favicon') return entity.favicon;
    if (colDef.field === 'City/State') return entity.cityState || entity.categorizedFields?.['Logistic Info']?.['City/State'] || entity.extraFields?.['City/State'];
    if (colDef.field === 'Biome' || colDef.field === 'Bioregion') return entity.biome || entity.bioregion || entity.categorizedFields?.['Logistic Info']?.['Biome'] || entity.categorizedFields?.['Logistic Info']?.['Bioregion'] || entity.extraFields?.['Biome'] || entity.extraFields?.['Bioregion'];
    if (colDef.field === 'City') return entity.city || entity.categorizedFields?.['Logistic Info']?.['City'] || entity.extraFields?.['City'];
    if (colDef.field === 'State') return entity.state || entity.categorizedFields?.['Logistic Info']?.['State'] || entity.extraFields?.['State'];
    if (colDef.field === 'Country') return entity.country || entity.categorizedFields?.['Logistic Info']?.['Country'] || entity.extraFields?.['Country'];
    if (colDef.field === 'Year Founded') {
      const val = entity.yearFounded !== undefined ? String(entity.yearFounded) : (entity.categorizedFields?.['Logistic Info']?.['Year Founded'] || entity.extraFields?.['Year Founded']);
      return val !== undefined && val !== null ? String(val).trim() : undefined;
    }
    if (colDef.field === 'Email') return entity.contactEmail || entity.categorizedFields?.['Warm Data']?.['Email'] || entity.extraFields?.['Email'];
    if (colDef.field === 'Point of Contact(s)') return entity.contactName || entity.categorizedFields?.['Warm Data']?.['Point of Contact(s)'] || entity.extraFields?.['Point of Contact(s)'];
    if (colDef.field === 'Analyst Commentary') return entity.notes || entity.categorizedFields?.['Discourse Analysis / Argument Mapping']?.['Analyst Commentary'] || entity.extraFields?.['Analyst Commentary'];

    const fromCat = entity.categorizedFields?.[colDef.category]?.[colDef.field];
    if (fromCat !== undefined && fromCat !== null && String(fromCat).trim() !== '') return String(fromCat).trim();

    const fromExtra = entity.extraFields?.[colDef.field] || entity.extraFields?.[`__col_${colDef.index}`];
    if (fromExtra !== undefined && fromExtra !== null && String(fromExtra).trim() !== '') return String(fromExtra).trim();
  }

  // Generic fallback across categorizedFields
  if (entity.categorizedFields) {
    for (const cat of Object.keys(entity.categorizedFields)) {
      const fieldsObj = entity.categorizedFields[cat];
      if (fieldsObj) {
        for (const [fName, fVal] of Object.entries(fieldsObj)) {
          if (fName.trim().toUpperCase() === key) {
            return fVal !== undefined && fVal !== null && String(fVal).trim() !== ''
              ? String(fVal).trim()
              : undefined;
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Helper to split relationship cell strings into discrete items
 * Handles phrases with internal slashes, numbered bullets ("1) ...", "2) ..."), semicolons, newlines, commas.
 */
export function splitRelationshipValues(raw: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // If it starts with a numbered bullet like "1) ...", "2) ...", "3) ...", split by bullet prefix
  if (/^\s*\d+[\).\-]/m.test(trimmed)) {
    const parts = trimmed.split(/(?=(?:^|[\r\n\s]+)\d+[\).\-])/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts;
    }
  }

  // Check if the string matches the known compound collaborate phrase
  if (/intending\s+to\s+collaborate\s+with\s*\/\s*occasionally\s+collaborating\s+with/i.test(trimmed)) {
    const placeholder = '___INTENDING_COLLABORATE_TOKEN___';
    const protectedStr = trimmed.replace(
      /intending\s+to\s+collaborate\s+with\s*\/\s*occasionally\s+collaborating\s+with/gi,
      placeholder
    );
    return protectedStr
      .split(/[\r\n;]+/)
      .map(s => s.replace(placeholder, 'Intending to collaborate with / occasionally collaborating with').trim())
      .filter(Boolean);
  }

  if (trimmed.includes('\n') || trimmed.includes(';')) {
    return trimmed.split(/[\r\n;]+/).map(s => s.trim()).filter(Boolean);
  }

  if (trimmed.includes(',') && !trimmed.includes('/')) {
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }

  return [trimmed];
}

/**
 * Checks if an entity matches a specific relationship string (e.g. "6) Following closely" or "6. Following Closely").
 */
export function entityMatchesRelationship(ent: EcosystemEntity, targetRelationship: string): boolean {
  if (!ent || !targetRelationship) return false;
  const raw = getEntitySpreadsheetField(ent, 'S2') || ent.ourRelationship || ent.categorizedFields?.['Overview']?.['Our Relationship'] || (ent.extraFields?.['Our Relationship'] as string);
  if (!raw) return false;

  const rawStr = String(raw).trim();
  const targetStr = targetRelationship.trim();
  if (!rawStr || !targetStr) return false;

  const cleanForComp = (s: string) => s.toLowerCase().replace(/[\(\)\[\]\.\,\;\:\/\-\_]/g, ' ').replace(/\s+/g, ' ').trim();
  const rawClean = cleanForComp(rawStr);
  const targetClean = cleanForComp(targetStr);

  if (rawClean === targetClean || rawClean.includes(targetClean) || targetClean.includes(rawClean)) {
    return true;
  }

  const items = splitRelationshipValues(rawStr);
  for (const item of items) {
    const itemClean = cleanForComp(item);
    if (itemClean === targetClean || itemClean.includes(targetClean) || targetClean.includes(itemClean)) {
      return true;
    }
  }

  // Match numbered prefixes like "6" if both start with number
  const numA = rawStr.match(/^(\d+)[\).\-\s]/);
  const numB = targetStr.match(/^(\d+)[\).\-\s]/);
  if (numA && numB && numA[1] === numB[1]) {
    const wordsTarget = targetClean.split(' ').filter(w => w.length > 2 && isNaN(Number(w)));
    if (wordsTarget.length === 0) return true;
    const matchCount = wordsTarget.filter(w => rawClean.includes(w)).length;
    if (matchCount > 0) return true;
  }

  return false;
}


