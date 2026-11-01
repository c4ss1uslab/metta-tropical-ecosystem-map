import { EcosystemEntity, LayerQuadrantSizes, QuadrantDimension, CategoryQuadrant } from '../types';
import { getEntitySpreadsheetField } from './excelParser';
import { entityMatchesArchipelago } from './layoutGenerator';

export type MapLayerNumber = 1 | 2 | 3;

export interface LayerEntityCounts {
  organizations: number;
  people: number;
  ideas: number;
  media: number;
  total: number;
}

export const DEFAULT_LAYER_1_RELATIONSHIPS = [
  '1) Core Reference',
  '2) Actively collaborating with',
  '3) Intending to collaborate with / Occasionally collaborating with',
  '4) Actively drawing from',
  '5) Passively drawing from',
  '6) Following closely'
];

export const DEFAULT_LAYER_2_RELATIONSHIPS = [
  '7) Following',
  '8) Exploring / Interested in',
  '9) Aware of'
];

export const DEFAULT_LAYER_3_RELATIONSHIPS = [
  '10) Unaware of',
  '11) Crowdsourced'
];

/**
 * Extracts distinct relationships for Layer 1 (1 to 6) from entities, with default fallback
 */
export function getLayer1Relationships(entities?: EcosystemEntity[], ourRelationshipsList?: string[]): string[] {
  const source = ourRelationshipsList && ourRelationshipsList.length > 0
    ? ourRelationshipsList
    : (entities ? Array.from(new Set(
        entities.map(e => getEntitySpreadsheetField(e, 'S2') || e.ourRelationship).filter(Boolean) as string[]
      )) : []);

  const existing = source.filter(r => {
    const match = r.match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num >= 1 && num <= 6;
    }
    return false;
  });

  const result = [...existing];
  DEFAULT_LAYER_1_RELATIONSHIPS.forEach(defRel => {
    const defNum = defRel.match(/^(\d+)/)?.[1];
    const hasDefNum = result.some(r => r.match(/^(\d+)/)?.[1] === defNum);
    if (!hasDefNum) {
      result.push(defRel);
    }
  });

  return result.sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0', 10);
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0', 10);
    return numA - numB;
  });
}

/**
 * Extracts distinct relationships for Layer 2 (7 to 9) from entities, with default fallback
 */
export function getLayer2Relationships(entities?: EcosystemEntity[], ourRelationshipsList?: string[]): string[] {
  const source = ourRelationshipsList && ourRelationshipsList.length > 0
    ? ourRelationshipsList
    : (entities ? Array.from(new Set(
        entities.map(e => getEntitySpreadsheetField(e, 'S2') || e.ourRelationship).filter(Boolean) as string[]
      )) : []);

  const existing = source.filter(r => {
    const match = r.match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num >= 7 && num <= 9;
    }
    return false;
  });

  const result = [...existing];
  DEFAULT_LAYER_2_RELATIONSHIPS.forEach(defRel => {
    const defNum = defRel.match(/^(\d+)/)?.[1];
    const hasDefNum = result.some(r => r.match(/^(\d+)/)?.[1] === defNum);
    if (!hasDefNum) {
      result.push(defRel);
    }
  });

  return result.sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0', 10);
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0', 10);
    return numA - numB;
  });
}

/**
 * Checks if an entity has an explicit relationship level between 1 and 6 (Layer 1)
 * Rules:
 * - 1) Core Reference
 * - 2) Actively collaborating with
 * - 3) Intending to collaborate with / Occasionally collaborating with
 * - 4) Actively drawing from
 * - 5) Passively drawing from
 * - 6) Following closely
 */
export function isEntityInRelationshipLevels1to6(entity: EcosystemEntity): boolean {
  if (!entity) return false;
  const raw =
    getEntitySpreadsheetField(entity, 'S2') ||
    getEntitySpreadsheetField(entity, 'U2') ||
    getEntitySpreadsheetField(entity, 'Our Relationship') ||
    entity.ourRelationship;

  if (!raw || typeof raw !== 'string') return false;
  const str = raw.trim().toLowerCase();
  if (!str) return false;

  // 1. Numeric prefix check (e.g. "1) Core Reference", "6. Following closely", "4:")
  const numMatch = str.match(/(?:^|[\r\n;,]|\s)(\d{1,2})[\).\:\-\s]/) || str.match(/^(\d{1,2})/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return num >= 1 && num <= 6;
  }

  // 2. Ensure it does not belong to Layer 2 or Layer 3
  if (
    str.includes('unaware') ||
    str.includes('crowdsource') ||
    str.includes('aware') ||
    (str.includes('following') && !str.includes('following closely')) ||
    str.includes('exploring') ||
    str.includes('interested in')
  ) {
    return false;
  }

  // 3. Textual / semantic heuristics for Layer 1
  return (
    str.includes('core reference') ||
    str.includes('actively collaborating') ||
    str.includes('intending to collaborate') ||
    str.includes('occasionally collaborating') ||
    str.includes('actively drawing from') ||
    str.includes('passively drawing from') ||
    str.includes('following closely') ||
    str.includes('core collaborator') ||
    str.includes('regular collaborator') ||
    str.includes('advisory') ||
    str.includes('ally') ||
    str.includes('exploring relationship') ||
    str.includes('partner')
  );
}

/**
 * Checks if an entity has an explicit relationship level between 7 and 9 (Layer 2)
 * Rules:
 * - 7) Following
 * - 8) Exploring / Interested in / Following distantly
 * - 9) Aware of
 */
export function isEntityInRelationshipLevels7to9(entity: EcosystemEntity): boolean {
  if (!entity) return false;
  const raw =
    getEntitySpreadsheetField(entity, 'S2') ||
    getEntitySpreadsheetField(entity, 'U2') ||
    getEntitySpreadsheetField(entity, 'Our Relationship') ||
    entity.ourRelationship;

  if (!raw || typeof raw !== 'string') return false;
  const str = raw.trim().toLowerCase();
  if (!str) return false;

  const numMatch = str.match(/(?:^|[\r\n;,]|\s)(\d{1,2})[\).\:\-\s]/) || str.match(/^(\d{1,2})/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return num >= 7 && num <= 9;
  }

  return (
    str.includes('aware of') ||
    str.includes('aware') ||
    (str.includes('following') && !str.includes('following closely')) ||
    str.includes('exploring') ||
    str.includes('interested in')
  );
}

/**
 * Checks if an entity has an explicit relationship level of 10 or 11 (Layer 3)
 */
export function isEntityInRelationshipLevels10to11(entity: EcosystemEntity): boolean {
  if (!entity) return false;
  const raw =
    getEntitySpreadsheetField(entity, 'S2') ||
    getEntitySpreadsheetField(entity, 'U2') ||
    getEntitySpreadsheetField(entity, 'Our Relationship') ||
    entity.ourRelationship;

  if (!raw || typeof raw !== 'string') return false;
  const str = raw.trim().toLowerCase();
  if (!str) return false;

  const numMatch = str.match(/(?:^|[\r\n;,]|\s)(\d{1,2})[\).\:\-\s]/) || str.match(/^(\d{1,2})/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return num >= 10;
  }

  return str.includes('unaware') || str.includes('crowdsource') || str.includes('out of scope');
}

/**
 * Checks if an entity qualifies for a specific map layer
 */
export function isEntityInLayer(entity: EcosystemEntity, layer: 1 | 2 | 3 | 'all' | number = 1): boolean {
  if (layer === 'all') return true;
  if (layer === 1) return isEntityInRelationshipLevels1to6(entity);
  if (layer === 2) return isEntityInRelationshipLevels7to9(entity);
  if (layer === 3) return isEntityInRelationshipLevels10to11(entity);
  return false;
}

/**
 * Finds all entities assigned to an archipelago that qualify for the given layer
 */
export function getArchipelagoLayerEntities(
  archipelagoName: string,
  entities: EcosystemEntity[],
  layer: 1 | 2 | 3 | 'all' | number = 1
): EcosystemEntity[] {
  if (!archipelagoName || !entities || entities.length === 0) return [];
  const assigned = entities.filter(e => entityMatchesArchipelago(e, archipelagoName));
  if (layer === 'all') return assigned;
  if (layer === 1) return assigned.filter(e => isEntityInRelationshipLevels1to6(e));
  if (layer === 2) return assigned.filter(e => isEntityInRelationshipLevels7to9(e));
  if (layer === 3) return assigned.filter(e => isEntityInRelationshipLevels10to11(e));
  return [];
}

/**
 * Determines whether an archipelago should appear in the given map layer.
 * Specifically for Layer 1: it ONLY appears if it has at least one entity assigned
 * with a relationship level between 1 and 6.
 */
export function doesArchipelagoAppearInLayer(
  archipelagoName: string,
  entities: EcosystemEntity[],
  layer: 1 | 2 | 3 | 'all' | number = 1
): boolean {
  if (!archipelagoName || !entities || entities.length === 0) return false;
  const assigned = entities.filter(e => entityMatchesArchipelago(e, archipelagoName));
  if (assigned.length === 0) return false;
  if (layer === 'all') return true;
  if (layer === 1) return assigned.some(e => isEntityInRelationshipLevels1to6(e));
  if (layer === 2) return assigned.some(e => isEntityInRelationshipLevels7to9(e));
  if (layer === 3) return assigned.some(e => isEntityInRelationshipLevels10to11(e));
  return false;
}

/**
 * Classifies an ecosystem entity into Layer 1, 2, or 3 based on 'Our Relationship' (Column S2/U2)
 *
 * Rules:
 * - Layer 1: 1. Core References to 6. Following Closely
 * - Layer 2: 7: Following -> 9: Aware of
 * - Layer 3: 10: Unaware of or 11. Crowdsourced / Out of Scope
 */
export function getEntityMapLayer(entity: EcosystemEntity): MapLayerNumber {
  if (!entity) return 1;
  if (isEntityInRelationshipLevels10to11(entity)) return 3;
  if (isEntityInRelationshipLevels7to9(entity)) return 2;
  if (isEntityInRelationshipLevels1to6(entity)) return 1;
  return 1;
}

/**
 * Calculates count of organizations, people, ideas, and media in a given layer
 */
export function calculateLayerCounts(entities: EcosystemEntity[], layer: MapLayerNumber): LayerEntityCounts {
  const counts: LayerEntityCounts = {
    organizations: 0,
    people: 0,
    ideas: 0,
    media: 0,
    total: 0
  };

  entities.forEach(ent => {
    if (getEntityMapLayer(ent) === layer) {
      counts.total++;
      if (ent.type === 'Organization') counts.organizations++;
      else if (ent.type === 'Person') counts.people++;
      else if (ent.type === 'Idea') counts.ideas++;
      else if (ent.type === 'Media') counts.media++;
    }
  });

  return counts;
}

/**
 * Formats entity breakdown string like:
 * "12 organizations, 5 people, 2 media" (hides any category whose count is 0)
 */
export function formatLayerEntitiesBreakdown(counts: LayerEntityCounts): string {
  const parts: string[] = [];

  if (counts.organizations > 0) {
    parts.push(`${counts.organizations} ${counts.organizations === 1 ? 'organization' : 'organizations'}`);
  }
  if (counts.people > 0) {
    parts.push(`${counts.people} ${counts.people === 1 ? 'person' : 'people'}`);
  }
  if (counts.ideas > 0) {
    parts.push(`${counts.ideas} ${counts.ideas === 1 ? 'idea' : 'ideas'}`);
  }
  if (counts.media > 0) {
    parts.push(`${counts.media} media`);
  }

  return parts.length > 0 ? parts.join(', ') : '0 initiatives';
}

/**
 * Automatically calculates harmonious quadrant sizes for a layer by measuring the actual spatial extent
 * of its initiatives from center (0,0) and adding comfortable padding.
 */
export function calculateAutoFitQuadrantSizes(
  entities: EcosystemEntity[],
  layer: 1 | 2 | 3 | 'all' = 1
): LayerQuadrantSizes {
  const layerEntities = layer === 'all'
    ? entities
    : entities.filter(e => getEntityMapLayer(e) === layer);

  const byQuadrant: Record<CategoryQuadrant, { maxAbsX: number; maxAbsY: number; count: number }> = {
    Inner: { maxAbsX: 0, maxAbsY: 0, count: 0 },
    Social: { maxAbsX: 0, maxAbsY: 0, count: 0 },
    Cultural: { maxAbsX: 0, maxAbsY: 0, count: 0 },
    Systems: { maxAbsX: 0, maxAbsY: 0, count: 0 }
  };

  layerEntities.forEach(e => {
    const q = e.category || 'Inner';
    if (byQuadrant[q]) {
      byQuadrant[q].count++;
      byQuadrant[q].maxAbsX = Math.max(byQuadrant[q].maxAbsX, Math.abs(e.x));
      byQuadrant[q].maxAbsY = Math.max(byQuadrant[q].maxAbsY, Math.abs(e.y));
    }
  });

  const pad = 160;
  const minSize = 650;
  const maxSize = 2400;
  const defaultSize = layer === 1 ? 950 : (layer === 2 ? 1400 : 1600);

  const roundTo50 = (val: number) => Math.round(val / 50) * 50;

  const fitQuad = (quadData: { maxAbsX: number; maxAbsY: number; count: number }): QuadrantDimension => {
    if (quadData.count === 0 || (quadData.maxAbsX < 80 && quadData.maxAbsY < 80)) {
      return { width: defaultSize, height: defaultSize };
    }
    const rawW = roundTo50(Math.max(minSize, Math.min(maxSize, quadData.maxAbsX + pad)));
    const rawH = roundTo50(Math.max(minSize, Math.min(maxSize, quadData.maxAbsY + pad)));
    const size = Math.max(rawW, rawH);
    return { width: size, height: size };
  };

  return {
    Inner: fitQuad(byQuadrant.Inner),
    Social: fitQuad(byQuadrant.Social),
    Cultural: fitQuad(byQuadrant.Cultural),
    Systems: fitQuad(byQuadrant.Systems)
  };
}
