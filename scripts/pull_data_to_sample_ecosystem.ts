import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

function decodeContinentShapes(shapesData: any): Record<string, [number, number][]> {
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

const firebaseAppletConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseAppletConfig);
const db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId);

async function main() {
  console.log('Fetching published_dataset and continents_config from Firestore...');
  const pubSnap = await getDoc(doc(db, 'ecosystem', 'published_dataset'));
  const contSnap = await getDoc(doc(db, 'ecosystem', 'continents_config'));

  if (!pubSnap.exists()) {
    throw new Error('published_dataset does not exist in Firestore!');
  }
  if (!contSnap.exists()) {
    throw new Error('continents_config does not exist in Firestore!');
  }

  const pubData = pubSnap.data();
  const contData = contSnap.data();

  let entities = pubData?.entities || [];
  if (pubData?.isChunked && typeof pubData?.chunkCount === 'number' && pubData.chunkCount > 0) {
    console.log(`Loading ${pubData.chunkCount} partitioned dataset chunks...`);
    const chunkPromises = [];
    for (let i = 0; i < pubData.chunkCount; i++) {
      chunkPromises.push(getDoc(doc(db, 'ecosystem', `published_dataset_chunk_${i}`)));
    }
    const chunkSnaps = await Promise.all(chunkPromises);
    const allEntities = [];
    for (const cSnap of chunkSnaps) {
      if (cSnap.exists()) {
        const cData = cSnap.data();
        if (Array.isArray(cData?.entities)) {
          allEntities.push(...cData.entities);
        }
      }
    }
    entities = allEntities;
  }

  const decodedShapes = decodeContinentShapes(contData?.shapes);
  const metadata = contData?.metadata || {};
  const layerQuadrantSizes = contData?.layerQuadrantSizes;

  console.log(`Entities count: ${entities.length}`);
  console.log(`Shapes count: ${Object.keys(decodedShapes).length}`);
  console.log(`Metadata count: ${Object.keys(metadata).length}`);
  console.log(`LayerQuadrantSizes present: ${!!layerQuadrantSizes}`);

  // Ensure every entity with valid coordinates has isCustomPosition: true locked in
  const finalizedEntities = entities.map((ent: any) => {
    const hasValidCoords = typeof ent.x === 'number' && typeof ent.y === 'number' && (ent.x !== 0 || ent.y !== 0) && Number.isFinite(ent.x) && Number.isFinite(ent.y);
    return {
      ...ent,
      isCustomPosition: hasValidCoords ? true : Boolean(ent.isCustomPosition)
    };
  });

  // Create snapshot backup file for safety
  const snapshotBackup = {
    version: 1,
    snapshotType: 'metta-map-positions-snapshot',
    exportedAt: new Date().toISOString(),
    description: 'Metta Tropical Ecosystem Map - Synced Cloud Master Snapshot',
    totalEntities: finalizedEntities.length,
    totalShapes: Object.keys(decodedShapes).length,
    entities: finalizedEntities.map((e: any) => ({
      id: e.id,
      name: e.name,
      continent: e.continent,
      category: e.category,
      x: e.x,
      y: e.y,
      isCustomPosition: true
    })),
    customContinentShapes: decodedShapes,
    archipelagoMetadata: metadata,
    layerQuadrantSizes: layerQuadrantSizes
  };

  fs.writeFileSync(
    path.resolve('./src/data/metta_map_positions_snapshot_cloud.json'),
    JSON.stringify(snapshotBackup, null, 2),
    'utf8'
  );
  console.log('Saved snapshot backup to src/data/metta_map_positions_snapshot_cloud.json');

  // Build the code for src/data/sampleEcosystem.ts
  const fileContent = `import { EcosystemEntity, LayerQuadrantConfig, ArchipelagoMeta } from "../types";

export const INITIAL_ENTITIES: EcosystemEntity[] = ${JSON.stringify(finalizedEntities, null, 2)};

export const INITIAL_CONTINENT_SHAPES: Record<string, [number, number][]> = ${JSON.stringify(decodedShapes, null, 2)};

export const INITIAL_ARCHIPELAGO_METADATA: Record<string, ArchipelagoMeta> = ${JSON.stringify(metadata, null, 2)};

export const INITIAL_LAYER_QUADRANT_SIZES: LayerQuadrantConfig | undefined = ${layerQuadrantSizes ? JSON.stringify(layerQuadrantSizes, null, 2) : 'undefined'};
`;

  fs.writeFileSync(path.resolve('./src/data/sampleEcosystem.ts'), fileContent, 'utf8');
  console.log('Successfully updated src/data/sampleEcosystem.ts with current cloud dataset!');

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
