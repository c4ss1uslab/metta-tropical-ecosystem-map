import { EcosystemEntity, SyncResult, SyncMode } from '../types';
import { sanitizeEntitySocialProfiles } from './socialMedia';
import { sanitizeEntityObsoleteFields } from './excelParser';
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

  const existingMapById = new Map<string, EcosystemEntity>();
  const existingMapByName = new Map<string, EcosystemEntity>();

  existingEntities.forEach(ent => {
    existingMapById.set(ent.id, ent);
    existingMapByName.set(ent.name.trim().toLowerCase(), ent);
  });

  const added: EcosystemEntity[] = [];
  const updated: EcosystemEntity[] = [];
  const removed: EcosystemEntity[] = [];
  let preservedCoordinatesCount = 0;
  let unchangedCount = 0;

  const finalDataset: EcosystemEntity[] = [];
  const processedExistingIds = new Set<string>();

  incomingEntities.forEach(incoming => {
    // Try matching by ID first, then by normalized name
    let matched = existingMapById.get(incoming.id);
    if (!matched) {
      matched = existingMapByName.get(incoming.name.trim().toLowerCase());
    }

    if (matched) {
      processedExistingIds.add(matched.id);

      // Preserve existing position coordinates if desired
      let preservedX = incoming.x;
      let preservedY = incoming.y;
      let preservedCustomFlag = incoming.isCustomPosition;

      if (preserveCoordinates) {
        // If the entity's category quadrant or archipelago changed, do NOT keep obsolete coordinates
        const quadrantChanged = Boolean(incoming.category && matched.category && incoming.category !== matched.category);
        const incomingCont = incoming.continent ? normalizeArchipelagoBaseName(incoming.continent) : '';
        const matchedCont = matched.continent ? normalizeArchipelagoBaseName(matched.continent) : '';
        const continentChanged = Boolean(incomingCont && matchedCont && incomingCont !== matchedCont);
        const canPreserve = !quadrantChanged && !continentChanged && Boolean(matched.isCustomPosition);

        preservedX = canPreserve ? matched.x : incoming.x;
        preservedY = canPreserve ? matched.y : incoming.y;
        preservedCustomFlag = canPreserve ? Boolean(matched.isCustomPosition) : false;

        if (canPreserve && (preservedX !== 0 || preservedY !== 0)) {
          preservedCoordinatesCount++;
        }
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
        continent: incoming.continent || matched.continent,
        secondaryCategories: incoming.secondaryCategories || matched.secondaryCategories,
        isDomainElevation: incoming.isDomainElevation ?? matched.isDomainElevation,
        x: preservedX,
        y: preservedY,
        isCustomPosition: preservedCustomFlag,
        notes: (matched.notes && matched.notes !== matched.societalSector ? matched.notes : undefined) || incoming.notes, // keep true user notes
        communityNotes: matched.communityNotes || incoming.communityNotes,
        featured: matched.featured || incoming.featured
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

  const result: SyncResult = {
    mode,
    added,
    updated,
    removed: mode === 'replace' ? removed : [],
    preservedCoordinatesCount,
    unchangedCount,
    totalNew: finalDataset.length
  };

  return { updatedDataset: finalDataset, result };
}
