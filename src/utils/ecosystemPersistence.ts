import { EcosystemEntity, LayerQuadrantConfig } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { registerColumnComments, getAllColumnComments } from './columnComments';
import { loadStoredParsingRules, saveStoredParsingRules } from './parsingRules';
import { 
  normalizeArchipelagoBaseName, 
  formatClusterWithNumber, 
  isEntityPrimaryToArchipelago, 
  isEntityDomainElevation, 
  fitContinentTightlyAroundEntities 
} from './layoutGenerator';
import { ensureUniqueEntityIds } from './excelParser';

const PUBLISHED_DATASET_DOC = 'published_dataset';
const CONTINENTS_CONFIG_DOC = 'continents_config';
const DATASET_CHUNK_PREFIX = 'published_dataset_chunk_';
const MAX_ENTITIES_PER_CHUNK = 25;
const MAX_BYTES_PER_CHUNK = 350000; // ~350 KB safe limit per chunk doc to stay far below 1,048,576 byte Firestore limit

/**
 * Partitions entities into manageable chunks that will each remain well under Firestore's 1MB limit.
 */
export function partitionEntitiesIntoChunks(entities: EcosystemEntity[]): EcosystemEntity[][] {
  if (!entities || entities.length === 0) return [];
  
  const chunks: EcosystemEntity[][] = [];
  let currentChunk: EcosystemEntity[] = [];
  let currentChunkBytes = 0;

  for (const entity of entities) {
    const approxBytes = JSON.stringify(entity).length;
    if (
      currentChunk.length >= MAX_ENTITIES_PER_CHUNK ||
      (currentChunkBytes + approxBytes > MAX_BYTES_PER_CHUNK && currentChunk.length > 0)
    ) {
      chunks.push(currentChunk);
      currentChunk = [entity];
      currentChunkBytes = approxBytes;
    } else {
      currentChunk.push(entity);
      currentChunkBytes += approxBytes;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Loads and combines entity chunks from Firestore in parallel.
 */
async function loadEntitiesFromChunks(chunkCount: number): Promise<EcosystemEntity[]> {
  const chunkPromises = [];
  for (let i = 0; i < chunkCount; i++) {
    chunkPromises.push(getDoc(doc(db, 'ecosystem', `${DATASET_CHUNK_PREFIX}${i}`)));
  }
  const chunkSnaps = await Promise.all(chunkPromises);
  const allEntities: EcosystemEntity[] = [];
  for (const cSnap of chunkSnaps) {
    if (cSnap.exists()) {
      const cData = cSnap.data();
      if (Array.isArray(cData?.entities)) {
        allEntities.push(...cData.entities);
      }
    }
  }
  return allEntities;
}

/**
 * Encode continent polygon shapes from Record<string, [number, number][]>
 * into Firestore-compatible format Record<string, { x: number; y: number }[]>.
 * Firestore strictly forbids nested arrays (arrays inside arrays).
 */
export function encodeContinentShapesForFirestore(
  shapes?: Record<string, [number, number][]> | null
): Record<string, { x: number; y: number }[]> {
  if (!shapes || typeof shapes !== 'object') return {};
  const encoded: Record<string, { x: number; y: number }[]> = {};
  for (const [key, points] of Object.entries(shapes)) {
    if (Array.isArray(points)) {
      encoded[key] = points.map(pt => {
        if (Array.isArray(pt)) {
          return { x: Number(pt[0]) || 0, y: Number(pt[1]) || 0 };
        }
        if (pt && typeof pt === 'object') {
          return { x: Number((pt as any).x) || 0, y: Number((pt as any).y) || 0 };
        }
        return { x: 0, y: 0 };
      });
    }
  }
  return encoded;
}

/**
 * Decode continent polygon shapes back into Record<string, [number, number][]>
 * from Firestore object format or legacy array format.
 */
export function decodeContinentShapesFromFirestore(
  shapesData: any
): Record<string, [number, number][]> {
  if (!shapesData || typeof shapesData !== 'object') return {};
  const decoded: Record<string, [number, number][]> = {};
  for (const [key, points] of Object.entries(shapesData)) {
    if (Array.isArray(points)) {
      decoded[key] = points.map((pt: any): [number, number] => {
        if (Array.isArray(pt)) {
          return [Number(pt[0]) || 0, Number(pt[1]) || 0];
        }
        if (pt && typeof pt === 'object' && pt !== null) {
          return [Number(pt.x) || 0, Number(pt.y) || 0];
        }
        return [0, 0];
      });
    }
  }
  return decoded;
}

/**
 * Validates and preserves custom continent polygon shapes.
 * Ensures shapes contain clean, finite coordinate pairs and removes NaN/corrupt vertices,
 * while strictly preserving the user's exact polygon positions without arbitrary displacement.
 */
export function healAndAlignContinentShapes(
  shapes?: Record<string, [number, number][]> | null,
  entities?: EcosystemEntity[] | null
): Record<string, [number, number][]> {
  if (!shapes || typeof shapes !== 'object') return {};

  const healed: Record<string, [number, number][]> = {};

  for (const [name, rawPoints] of Object.entries(shapes)) {
    if (!Array.isArray(rawPoints) || rawPoints.length < 3) continue;

    const baseName = normalizeArchipelagoBaseName(name);
    const formattedName = formatClusterWithNumber(name);

    // Sanitize points to ensure finite numbers
    const validPts: [number, number][] = [];
    for (const pt of rawPoints) {
      if (Array.isArray(pt) && pt.length >= 2) {
        const x = Number(pt[0]);
        const y = Number(pt[1]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          validPts.push([Math.round(x), Math.round(y)]);
        }
      }
    }

    // If too few valid points left, fallback only if entities are provided
    if (validPts.length < 3) {
      if (entities && Array.isArray(entities) && entities.length > 0) {
        const memberEntities = entities.filter(e =>
          !isEntityDomainElevation(e) && (
            (e.continent && normalizeArchipelagoBaseName(e.continent) === baseName) ||
            isEntityPrimaryToArchipelago(e, name) ||
            (e.continent && formatClusterWithNumber(e.continent) === formattedName)
          )
        );
        if (memberEntities.length >= 1) {
          const regenerated = fitContinentTightlyAroundEntities(memberEntities, 35);
          healed[name] = regenerated;
          healed[formattedName] = regenerated;
          continue;
        }
      }
      continue;
    }

    // Preserve exact polygon shape points without shifting or drifting
    healed[formattedName] = validPts;
    if (name === formattedName || name === baseName) {
      healed[name] = validPts;
    }
  }

  return healed;
}

/**
 * Sanitize data for Firestore (remove undefined fields and eliminate nested arrays recursively)
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => {
      // If an array item is itself an array (nested array, prohibited in Firestore):
      if (Array.isArray(item)) {
        if (item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
          return { x: item[0], y: item[1] };
        }
        return { values: sanitizeForFirestore(item) };
      }
      return sanitizeForFirestore(item);
    });
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

export interface PersistResult {
  success: boolean;
  quotaExceeded?: boolean;
  error?: string;
}

/**
 * Save the entire active published dataset to Firestore.
 * Automatically partitions large datasets into chunked documents (<350KB each)
 * so that Firestore's 1,048,576 byte (1MB) document limit is never exceeded.
 */
export async function persistPublishedDatasetToFirestore(
  entities: EcosystemEntity[],
  continentShapes?: Record<string, [number, number][]>,
  archipelagoMetadata?: Record<string, any>,
  columnComments?: Record<string, string>,
  layerQuadrantSizes?: LayerQuadrantConfig
): Promise<PersistResult> {
  try {
    const entitiesDocRef = doc(db, 'ecosystem', PUBLISHED_DATASET_DOC);
    const uniqueEntities = ensureUniqueEntityIds(entities);
    const cleanEntities = sanitizeForFirestore(uniqueEntities);
    const commentsToSave = columnComments || getAllColumnComments();

    // Check previous chunk count to delete any orphaned chunks if entity count decreased
    let prevChunkCount = 0;
    try {
      const existingDocSnap = await getDoc(entitiesDocRef);
      if (existingDocSnap.exists()) {
        const existingData = existingDocSnap.data();
        if (typeof existingData?.chunkCount === 'number') {
          prevChunkCount = existingData.chunkCount;
        }
      }
    } catch {
      // non-fatal read error
    }

    // Partition entities into chunks that remain well under 1MB
    const chunks = partitionEntitiesIntoChunks(cleanEntities);

    // Write all chunk documents in parallel
    const chunkWritePromises = chunks.map((chunkEntities, idx) => {
      const chunkDocRef = doc(db, 'ecosystem', `${DATASET_CHUNK_PREFIX}${idx}`);
      return setDoc(chunkDocRef, {
        chunkIndex: idx,
        count: chunkEntities.length,
        entities: chunkEntities,
        updatedAt: serverTimestamp()
      });
    });
    await Promise.all(chunkWritePromises);

    // Clean up any old chunks if previous chunk count was higher
    if (prevChunkCount > chunks.length) {
      const deletePromises = [];
      for (let i = chunks.length; i < prevChunkCount; i++) {
        deletePromises.push(deleteDoc(doc(db, 'ecosystem', `${DATASET_CHUNK_PREFIX}${i}`)).catch(() => {}));
      }
      await Promise.all(deletePromises);
    }

    // Save master dataset metadata document (without the 2MB raw entities array!)
    const payload: any = {
      isChunked: true,
      chunkCount: chunks.length,
      chunkPrefix: DATASET_CHUNK_PREFIX,
      totalCount: cleanEntities.length,
      updatedAt: serverTimestamp(),
      updatedAtIso: new Date().toISOString()
    };

    if (commentsToSave && Object.keys(commentsToSave).length > 0) {
      payload.columnComments = sanitizeForFirestore(commentsToSave);
    }

    const rulesToSave = loadStoredParsingRules();
    if (rulesToSave && rulesToSave.length > 0) {
      payload.parsingRules = sanitizeForFirestore(rulesToSave);
    }

    await setDoc(entitiesDocRef, payload);

    if (continentShapes !== undefined && continentShapes !== null) {
      const continentsDocRef = doc(db, 'ecosystem', CONTINENTS_CONFIG_DOC);
      const encodedShapes = encodeContinentShapesForFirestore(continentShapes);
      const configPayload: any = {
        shapes: encodedShapes,
        metadata: sanitizeForFirestore(archipelagoMetadata || {}),
        updatedAt: serverTimestamp()
      };
      if (layerQuadrantSizes) {
        configPayload.layerQuadrantSizes = sanitizeForFirestore(layerQuadrantSizes);
      }
      await setDoc(continentsDocRef, configPayload, { merge: true });
    } else if (layerQuadrantSizes) {
      const continentsDocRef = doc(db, 'ecosystem', CONTINENTS_CONFIG_DOC);
      await setDoc(continentsDocRef, {
        layerQuadrantSizes: sanitizeForFirestore(layerQuadrantSizes),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    console.info(`Saved ${cleanEntities.length} entities across ${chunks.length} chunks to Firestore published dataset.`);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    const isQuota = err?.code === 'resource-exhausted' ||
                    msg.includes('Quota exceeded') ||
                    msg.includes('RESOURCE_EXHAUSTED') ||
                    msg.includes('quota metric') ||
                    msg.includes('Quota limit');

    if (isQuota) {
      console.warn('Firestore write quota limit reached for today. Changes are saved locally on this device.', err);
      return { success: false, quotaExceeded: true, error: msg };
    }

    console.error('Failed to persist dataset to Firestore:', err);
    return { success: false, quotaExceeded: false, error: msg };
  }
}

/**
 * Fetch the published dataset from Firestore.
 * Supports both partitioned chunked datasets and legacy single-document datasets.
 */
export async function fetchPublishedDatasetFromFirestore(): Promise<{
  entities: EcosystemEntity[] | null;
  continentShapes: Record<string, [number, number][]> | null;
  archipelagoMetadata: Record<string, any> | null;
  columnComments?: Record<string, string> | null;
  layerQuadrantSizes?: LayerQuadrantConfig | null;
}> {
  try {
    const entitiesDocRef = doc(db, 'ecosystem', PUBLISHED_DATASET_DOC);
    const docSnap = await getDoc(entitiesDocRef);

    let entities: EcosystemEntity[] | null = null;
    let continentShapes: Record<string, [number, number][]> | null = null;
    let archipelagoMetadata: Record<string, any> | null = null;
    let columnComments: Record<string, string> | null = null;
    let layerQuadrantSizes: LayerQuadrantConfig | null = null;

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data) {
        if (data.isChunked && typeof data.chunkCount === 'number' && data.chunkCount > 0) {
          const chunkEntities = await loadEntitiesFromChunks(data.chunkCount);
          if (chunkEntities.length > 0) {
            entities = ensureUniqueEntityIds(chunkEntities);
          }
        } else if (Array.isArray(data.entities) && data.entities.length > 0) {
          entities = ensureUniqueEntityIds(data.entities as EcosystemEntity[]);
        }

        if (data.columnComments && typeof data.columnComments === 'object') {
          columnComments = data.columnComments as Record<string, string>;
          registerColumnComments(columnComments);
        }
        if (Array.isArray(data.parsingRules) && data.parsingRules.length > 0) {
          saveStoredParsingRules(data.parsingRules);
        }
      }
    }

    const continentsDocRef = doc(db, 'ecosystem', CONTINENTS_CONFIG_DOC);
    const contSnap = await getDoc(continentsDocRef);
    if (contSnap.exists()) {
      const contData = contSnap.data();
      if (contData && contData.shapes) {
        continentShapes = decodeContinentShapesFromFirestore(contData.shapes);
      }
      if (contData && contData.metadata) {
        archipelagoMetadata = contData.metadata;
      }
      if (contData && contData.layerQuadrantSizes) {
        layerQuadrantSizes = contData.layerQuadrantSizes as LayerQuadrantConfig;
      }
    }

    return { entities, continentShapes, archipelagoMetadata, columnComments, layerQuadrantSizes };
  } catch (err) {
    console.warn('Could not fetch dataset from Firestore (fallback to local data):', err);
    return { entities: null, continentShapes: null, archipelagoMetadata: null, columnComments: null, layerQuadrantSizes: null };
  }
}

/**
 * Subscribe to real-time updates of the published ecosystem dataset.
 * Seamlessly resolves chunked datasets when master document updates.
 */
export function subscribeToPublishedDataset(
  onUpdate: (data: {
    entities: EcosystemEntity[];
    continentShapes?: Record<string, [number, number][]>;
    archipelagoMetadata?: Record<string, any>;
    layerQuadrantSizes?: LayerQuadrantConfig;
  }) => void
): () => void {
  try {
    const entitiesDocRef = doc(db, 'ecosystem', PUBLISHED_DATASET_DOC);
    const continentsDocRef = doc(db, 'ecosystem', CONTINENTS_CONFIG_DOC);

    let latestEntities: EcosystemEntity[] = [];
    let latestShapes: Record<string, [number, number][]> | undefined = undefined;
    let latestMetadata: Record<string, any> | undefined = undefined;
    let latestQuadrantSizes: LayerQuadrantConfig | undefined = undefined;

    const unsubEntities = onSnapshot(
      entitiesDocRef,
      async (docSnap) => {
        // Ignore local uncommitted writes to prevent echoing and wiping active drag state
        if (docSnap.metadata.hasPendingWrites) {
          return;
        }
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.columnComments && typeof data.columnComments === 'object') {
            registerColumnComments(data.columnComments as Record<string, string>);
          }
          if (data && Array.isArray(data.parsingRules) && data.parsingRules.length > 0) {
            saveStoredParsingRules(data.parsingRules);
          }

          let loadedEntities: EcosystemEntity[] | null = null;
          if (data && data.isChunked && typeof data.chunkCount === 'number' && data.chunkCount > 0) {
            try {
              const chunkEntities = await loadEntitiesFromChunks(data.chunkCount);
              if (chunkEntities.length > 0) {
                loadedEntities = ensureUniqueEntityIds(chunkEntities);
              }
            } catch (err) {
              console.warn('Failed to load dataset chunks in subscription:', err);
            }
          } else if (data && Array.isArray(data.entities) && data.entities.length > 0) {
            loadedEntities = ensureUniqueEntityIds(data.entities as EcosystemEntity[]);
          }

          if (loadedEntities && loadedEntities.length > 0) {
            latestEntities = loadedEntities;
            onUpdate({
              entities: latestEntities,
              continentShapes: latestShapes,
              archipelagoMetadata: latestMetadata,
              layerQuadrantSizes: latestQuadrantSizes
            });
          }
        }
      },
      (error) => {
        console.warn('Firestore published dataset subscription error:', error);
      }
    );

    const unsubContinents = onSnapshot(
      continentsDocRef,
      (docSnap) => {
        // Ignore local uncommitted writes to prevent echoing
        if (docSnap.metadata.hasPendingWrites) {
          return;
        }
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.shapes) {
            latestShapes = decodeContinentShapesFromFirestore(data.shapes);
          }
          if (data && data.metadata) {
            latestMetadata = data.metadata;
          }
          if (data && data.layerQuadrantSizes) {
            latestQuadrantSizes = data.layerQuadrantSizes as LayerQuadrantConfig;
          }
          if (latestEntities.length > 0) {
            onUpdate({
              entities: latestEntities,
              continentShapes: latestShapes,
              archipelagoMetadata: latestMetadata,
              layerQuadrantSizes: latestQuadrantSizes
            });
          }
        }
      },
      (error) => {
        console.warn('Firestore continents config subscription error:', error);
      }
    );

    return () => {
      unsubEntities();
      unsubContinents();
    };
  } catch (err) {
    console.warn('Failed to subscribe to published dataset:', err);
    return () => {};
  }
}
