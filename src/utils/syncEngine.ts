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

  const normalizeName = (str?: string) => str ? str.toLowerCase().replace(/[\s\-_.,;:'"()]+/g, ' ').trim() : '';

  const existingMapById = new Map<string, EcosystemEntity>();
  const existingMapByName = new Map<string, EcosystemEntity>();
  const existingMapByNormName = new Map<string, EcosystemEntity>();

  existingEntities.forEach(ent => {
    existingMapById.set(ent.id, ent);
    const cleanName = ent.name.trim().toLowerCase();
    existingMapByName.set(cleanName, ent);
    const norm = normalizeName(ent.name);
    if (norm) existingMapByNormName.set(norm, ent);
  });

  const added: EcosystemEntity[] = [];
  const updated: EcosystemEntity[] = [];
  const removed: EcosystemEntity[] = [];
  let preservedCoordinatesCount = 0;
  let unchangedCount = 0;

  const finalDataset: EcosystemEntity[] = [];
  const processedExistingIds = new Set<string>();

  incomingEntities.forEach(incoming => {
    // Try matching by ID first, then exact name, then normalized name
    let matched = existingMapById.get(incoming.id);
    if (!matched) {
      matched = existingMapByName.get(incoming.name.trim().toLowerCase());
    }
    if (!matched) {
      matched = existingMapByNormName.get(normalizeName(incoming.name));
    }

    if (matched) {
      processedExistingIds.add(matched.id);

      // Preserve existing position coordinates strictly
      let preservedX = incoming.x;
      let preservedY = incoming.y;
      let preservedCustomFlag = incoming.isCustomPosition;

      const hasMatchedCoords = typeof matched.x === 'number' && typeof matched.y === 'number' && (matched.x !== 0 || matched.y !== 0);

      if (preserveCoordinates && hasMatchedCoords) {
        // Keep current coordinates intact!
        preservedX = matched.x;
        preservedY = matched.y;
        preservedCustomFlag = true;
        preservedCoordinatesCount++;
      } else if (hasMatchedCoords && (incoming.x === 0 && incoming.y === 0)) {
        // Fallback: If incoming has no coordinates, always keep matched coordinates
        preservedX = matched.x;
        preservedY = matched.y;
        preservedCustomFlag = true;
      }

      // Check if anything actually changed in content
      const isChanged =
        matched.name !== incoming.name ||
        matched.category !== incoming.category ||
        matched.continent !== incoming.continent ||
        matched.type !== incoming.type ||
        matched.description !== incoming.description ||
        matched.location !== incoming.location ||
        matched.website !== incoming.website ||
        matched.dataCompleteness !== incoming.dataCompleteness ||
        matched.dataQuality !== incoming.dataQuality ||
        JSON.stringify(matched.secondaryCategories) !== JSON.stringify(incoming.secondaryCategories) ||
        matched.isDomainElevation !== incoming.isDomainElevation ||
        JSON.stringify(matched.fields) !== JSON.stringify(incoming.fields);

      const mergedEntity: EcosystemEntity = {
        ...incoming,
        id: matched.id, // keep original ID
        dataCompleteness: incoming.dataCompleteness || incoming.dataQuality || matched.dataCompleteness || matched.dataQuality,
        dataQuality: incoming.dataCompleteness || incoming.dataQuality || matched.dataCompleteness || matched.dataQuality,
        continent: incoming.continent, // strictly use incoming continent (do not resurrect old continent if removed or blank)
        quadrant: incoming.quadrant, // strictly use incoming quadrant from Column E
        secondaryCategories: incoming.secondaryCategories || matched.secondaryCategories,
        isDomainElevation: incoming.isDomainElevation ?? matched.isDomainElevation,
        x: preservedX,
        y: preservedY,
        isCustomPosition: preservedCustomFlag,
        notes: (matched.notes && matched.notes !== matched.societalSector ? matched.notes : undefined) || incoming.notes, // keep true user notes
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
        // In append mode, keep all old entities
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
