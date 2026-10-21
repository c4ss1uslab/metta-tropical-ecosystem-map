import { EcosystemEntity, LayerQuadrantSizes, QuadrantDimension, CategoryQuadrant } from '../types';
import { getEntitySpreadsheetField } from './excelParser';

export type MapLayerNumber = 1 | 2 | 3;

export interface LayerEntityCounts {
  organizations: number;
  people: number;
  ideas: number;
  media: number;
  total: number;
}

/**
 * Classifies an ecosystem entity into Layer 1, 2, or 3 based on 'Our Relationship' (Column S2/U2)
 *
 * Rules:
 * - Layer 1: 1. Core References to 6. Following Closely
 * - Layer 2: 7: Following -> 9: Aware of
 * - Layer 3: 10: Unaware of or 11. Crowdsourced
 */
export function getEntityMapLayer(entity: EcosystemEntity): MapLayerNumber {
  if (!entity) return 1;

  const raw =
    getEntitySpreadsheetField(entity, 'S2') ||
    getEntitySpreadsheetField(entity, 'U2') ||
    getEntitySpreadsheetField(entity, 'Our Relationship') ||
    entity.ourRelationship;

  if (!raw || typeof raw !== 'string') {
    // Entities without explicit relationship classification in the wisdom map default to Layer 1
    return 1;
  }

  const str = raw.trim().toLowerCase();
  if (!str) return 1;

  // 1. Look for numeric prefix or bullet like "1.", "1)", "1:", "1 -", "1", "10.", "11:"
  const numMatch = str.match(/(?:^|[\r\n;,]|\s)(\d{1,2})[\).\:\-\s]/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 6) return 1;
    if (num >= 7 && num <= 9) return 2;
    if (num >= 10) return 3;
  }

  // Direct number at start of string (e.g. "1 Core References", "7 Following", "10 Unaware")
  const startNumMatch = str.match(/^(\d{1,2})/);
  if (startNumMatch) {
    const num = parseInt(startNumMatch[1], 10);
    if (num >= 1 && num <= 6) return 1;
    if (num >= 7 && num <= 9) return 2;
    if (num >= 10) return 3;
  }

  // 2. Textual / semantic heuristics
  // Layer 3: Unaware, Crowdsourced, 10, 11
  if (
    str.includes('unaware') ||
    str.includes('crowdsource') ||
    str.includes('crowd-source') ||
    str.includes('10:') ||
    str.includes('11:') ||
    str.includes('10.') ||
    str.includes('11.')
  ) {
    return 3;
  }

  // Layer 2: Following -> Aware of (numbers 7 to 9)
  // Check "aware of", "aware", or "following" (when not "following closely")
  if (
    str.includes('aware of') ||
    str.includes('aware') ||
    (str.includes('following') && !str.includes('following closely')) ||
    str.includes('7:') ||
    str.includes('8:') ||
    str.includes('9:') ||
    str.includes('7.') ||
    str.includes('8.') ||
    str.includes('9.')
  ) {
    return 2;
  }

  // Layer 1: Core References to Following Closely (numbers 1 to 6)
  if (
    str.includes('core reference') ||
    str.includes('core collaborator') ||
    str.includes('regular collaborator') ||
    str.includes('intending to collaborate') ||
    str.includes('advisory') ||
    str.includes('ally') ||
    str.includes('exploring relationship') ||
    str.includes('following closely') ||
    str.includes('reference') ||
    str.includes('partner') ||
    str.includes('1:') ||
    str.includes('2:') ||
    str.includes('3:') ||
    str.includes('4:') ||
    str.includes('5:') ||
    str.includes('6:') ||
    str.includes('1.') ||
    str.includes('2.') ||
    str.includes('3.') ||
    str.includes('4.') ||
    str.includes('5.') ||
    str.includes('6.')
  ) {
    return 1;
  }

  // Default to Layer 1 for unclassified wisdom initiatives
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
