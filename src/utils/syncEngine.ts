import { EcosystemEntity, SyncResult, SyncMode } from '../types';
import { sanitizeEntitySocialProfiles } from './socialMedia';
import { sanitizeEntityObsoleteFields, ensureUniqueEntityIds } from './excelParser';
import { formatClusterWithNumber, normalizeArchipelagoBaseName } from './layoutGenerator';

export interface SyncOptions {
  mode?: SyncMode; // 'replace' (default) or 'append'
  preserveCoordinates?: boolean; // default true for matched entities
}

/**
 * Smart Sync Engine:
 * Compares old dataset with newly imported dataset.
 * Supports:
 *  - 'replace' (default): Replaces existing dataset with incoming file.
 *    Any matching entities preserve coordinates/notes, but existing entities
 *    not present in the new file are removed.
 *  - 'append': Adds incoming entities to existing dataset.
 *    Existing entities are retained, matching entities are updated.
 */
export function syncDatasets(
  existingEntities: EcosystemEntity[],
  incomingEntities: EcosystemEntity[],
  options: SyncOptions = {}
): { updatedDataset: EcosystemEntity[]; result: SyncResult } {
  const mode: SyncMode = options.mode || 'replace';
  const preserveCoordinates = options.preserveCoordinates !== false;

  const normalizeName = (str?: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'"]/g, '')
      .replace(/[\s\-_.,;:()/[\]&]+/g, ' ')
      .trim();
  };

  const existingMapById = new Map<string, EcosystemEntity>();
  const existingMapByName = new Map<string, EcosystemEntity>();
  const existingMapByNormName = new Map<string, EcosystemEntity>();
  const existingMapBySpreadsheetOrgId = new Map<string, EcosystemEntity>();

  existingEntities.forEach(ent => {
    existingMapById.set(ent.id, ent);
    const cleanName = (ent.name || '').trim().toLowerCase();
    if (cleanName) {
      existingMapByName.set(cleanName, ent);
    }
    const norm = normalizeName(ent.name);
    if (norm) {
      existingMapByNormName.set(norm, ent);
    }

    // Also record spreadsheet raw Org ID from extraFields or categorizedFields if present
    const rawOrgId = ent.extraFields?.['Org ID'] || ent.categorizedFields?.['Overview']?.['Org ID'];
    if (rawOrgId) {
      existingMapBySpreadsheetOrgId.set(String(rawOrgId).trim(), ent);
    }
  });

  const added: EcosystemEntity[] = [];
  const updated: EcosystemEntity[] = [];
  const removed: EcosystemEntity[] = [];
  let preservedCoordinatesCount = 0;
  let unchangedCount = 0;

  const finalDataset: EcosystemEntity[] = [];
  const processedExistingIds = new Set<string>();

  incomingEntities.forEach(incoming => {
    const cleanName = (incoming.name || '').trim().toLowerCase();
    const normName = normalizeName(incoming.name);

    let matched: EcosystemEntity | undefined = undefined;

    // 1. Exact Name match (Priority 1: name is the true canonical identity in the ecosystem)
    if (cleanName) {
      const candidate = existingMapByName.get(cleanName);
      if (candidate && !processedExistingIds.has(candidate.id)) {
        matched = candidate;
      }
    }

    // 2. Normalized Name match (Priority 2: handles diacritics, punctuation differences, spacing)
    if (!matched && normName) {
      const candidate = existingMapByNormName.get(normName);
      if (candidate && !processedExistingIds.has(candidate.id)) {
        matched = candidate;
      }
    }

    // 3. Match by ID ONLY IF name is compatible (Prevents numeric row ID collisions like "271" matching wrong entity)
    if (!matched && incoming.id) {
      const candidate = existingMapById.get(incoming.id);
      if (candidate && !processedExistingIds.has(candidate.id)) {
        const candidateClean = (candidate.name || '').trim().toLowerCase();
        const candidateNorm = normalizeName(candidate.name);
        const isCompatible =
          candidateClean === cleanName ||
          candidateNorm === normName ||
          (cleanName.length >= 4 && candidateClean.includes(cleanName)) ||
          (candidateClean.length >= 4 && cleanName.includes(candidateClean)) ||
          candidateClean.startsWith('entity #') ||
          cleanName.startsWith('entity #') ||
          !cleanName;

        if (isCompatible) {
          matched = candidate;
        }
      }
    }

    // 4. Match by spreadsheet Org ID ONLY IF name is compatible
    if (!matched && incoming.id) {
      const candidate = existingMapBySpreadsheetOrgId.get(incoming.id);
      if (candidate && !processedExistingIds.has(candidate.id)) {
        const candidateClean = (candidate.name || '').trim().toLowerCase();
        const candidateNorm = normalizeName(candidate.name);
        const isCompatible =
          candidateClean === cleanName ||
          candidateNorm === normName ||
          (cleanName.length >= 4 && candidateClean.includes(cleanName)) ||
          (candidateClean.length >= 4 && cleanName.includes(candidateClean)) ||
          candidateClean.startsWith('entity #') ||
          cleanName.startsWith('entity #') ||
          !cleanName;

        if (isCompatible) {
          matched = candidate;
        }
      }
    }

    if (matched) {
      processedExistingIds.add(matched.id);

      // Continent & Quadrant from incoming spreadsheet:
      // If Column H is empty/not filled in incoming spreadsheet, finalContinent MUST BE undefined!
      // DO NOT fallback to matched.continent.
      const finalContinent = incoming.continent && incoming.continent.trim() ? incoming.continent.trim() : undefined;

      // If Column E is not filled in incoming spreadsheet, finalQuadrant MUST BE undefined!
      // DO NOT fallback to matched.quadrant.
      const finalQuadrant = incoming.quadrant;
      const finalCategory = finalQuadrant || 'Inner';

      const incomingContStr = finalContinent || '';
      const matchedContStr = (matched.continent || '').trim();
      const archipelagoChanged = incomingContStr !== matchedContStr;
      const quadrantChanged = finalQuadrant !== matched.quadrant;

      const hasMatchedCoords = typeof matched.x === 'number' && typeof matched.y === 'number' && (matched.x !== 0 || matched.y !== 0);

      // Only preserve old coordinates if placement (archipelago and quadrant) has NOT changed!
      // If user changed quadrant or removed archipelago, coordinates must be recalculated so entity moves to new location!
      let preservedX = incoming.x;
      let preservedY = incoming.y;
      let preservedCustomFlag = incoming.isCustomPosition;

      const shouldPreserveCoordinates = preserveCoordinates && hasMatchedCoords && !archipelagoChanged && !quadrantChanged;

      if (shouldPreserveCoordinates) {
        preservedX = matched.x;
        preservedY = matched.y;
        preservedCustomFlag = true;
        preservedCoordinatesCount++;
      } else {
        preservedX = 0;
        preservedY = 0;
        preservedCustomFlag = false;
      }

      // Check if anything actually changed in content
      const isChanged =
        archipelagoChanged ||
        quadrantChanged ||
        matched.name !== incoming.name ||
        matched.category !== finalCategory ||
        matched.continent !== finalContinent ||
        matched.quadrant !== finalQuadrant ||
        matched.type !== incoming.type ||
        matched.description !== incoming.description ||
        matched.location !== incoming.location ||
        matched.website !== incoming.website ||
        matched.dataCompleteness !== incoming.dataCompleteness ||
        matched.dataQuality !== incoming.dataQuality ||
        matched.stage !== incoming.stage ||
        matched.maturityLevel !== incoming.maturityLevel ||
        matched.yearFounded !== incoming.yearFounded ||
        matched.societalSector !== incoming.societalSector ||
        matched.ourRelationship !== incoming.ourRelationship ||
        matched.country !== incoming.country ||
        matched.cityState !== incoming.cityState ||
        matched.city !== incoming.city ||
        matched.state !== incoming.state ||
        matched.biome !== incoming.biome ||
        matched.bioregion !== incoming.bioregion ||
        matched.language !== incoming.language ||
        matched.notes !== incoming.notes ||
        JSON.stringify(matched.secondaryCategories) !== JSON.stringify(incoming.secondaryCategories) ||
        matched.isDomainElevation !== incoming.isDomainElevation ||
        JSON.stringify(matched.fields) !== JSON.stringify(incoming.fields) ||
        JSON.stringify(matched.categorizedFields) !== JSON.stringify(incoming.categorizedFields) ||
        JSON.stringify(matched.extraFields) !== JSON.stringify(incoming.extraFields);

      const mergedEntity: EcosystemEntity = {
        ...incoming,
        id: matched.id, // keep original ID strictly
        dataCompleteness: incoming.dataCompleteness || incoming.dataQuality || matched.dataCompleteness || matched.dataQuality,
        dataQuality: incoming.dataCompleteness || incoming.dataQuality || matched.dataCompleteness || matched.dataQuality,
        continent: finalContinent,
        quadrant: finalQuadrant,
        category: finalCategory,
        secondaryCategories: incoming.secondaryCategories || matched.secondaryCategories,
        isDomainElevation: incoming.isDomainElevation ?? matched.isDomainElevation,
        x: preservedX,
        y: preservedY,
        isCustomPosition: preservedCustomFlag,
        notes: (matched.notes && matched.notes !== matched.societalSector ? matched.notes : undefined) || incoming.notes,
        communityNotes: matched.communityNotes || incoming.communityNotes,
        featured: incoming.featured ?? matched.featured
      };

      const cleanMerged = sanitizeEntityObsoleteFields(sanitizeEntitySocialProfiles(mergedEntity));

      if (isChanged) {
        updated.push(cleanMerged);
      } else {
        unchangedCount++;
      }

      finalDataset.push(cleanMerged);
    } else {
      // Brand new entity in incoming spreadsheet
      const cleanIncoming = sanitizeEntityObsoleteFields(sanitizeEntitySocialProfiles(incoming));
      added.push(cleanIncoming);
      finalDataset.push(cleanIncoming);
    }
  });

  // Handle existing entities not in incoming spreadsheet
  existingEntities.forEach(ent => {
    if (!processedExistingIds.has(ent.id)) {
      if (mode === 'append') {
        // In append mode, keep all old entities that weren't in the uploaded file
        finalDataset.push(ent);
      } else {
        // In replace mode, old entities are removed / replaced
        removed.push(ent);
      }
    }
  });

  const uniqueDataset = ensureUniqueEntityIds(finalDataset);

  const result: SyncResult = {
    mode,
    added,
    updated,
    removed: mode === 'replace' ? removed : [],
    preservedCoordinatesCount,
    unchangedCount,
    totalNew: uniqueDataset.length
  };

  return { updatedDataset: uniqueDataset, result };
}
