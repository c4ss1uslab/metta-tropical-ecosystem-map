import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { EcosystemEntity, FilterState, MapViewport, FieldCluster, ContinentInfo, SyncResult, CategoryQuadrant, EntityType, SidebarListScope, CommunityNote, DataQualityStatus, DataCompletenessLevel, getEntityCompleteness, ArchipelagoMeta, LayerQuadrantConfig, LayerQuadrantSizes, DEFAULT_LAYER_QUADRANT_SIZES, getQuadrantSizesForLayer } from './types';
import { 
  INITIAL_ENTITIES, 
  INITIAL_CONTINENT_SHAPES, 
  INITIAL_ARCHIPELAGO_METADATA, 
  INITIAL_LAYER_QUADRANT_SIZES 
} from './data/sampleEcosystem';
import { Compass } from 'lucide-react';
import { 
  calculateEntityLayout, 
  recalculateArchipelagoLayout, 
  createPathFromControlPoints, 
  generateContinentLabelPath, 
  resolveEntityOverlaps, 
  suggestContinent, 
  formatClusterWithNumber,
  isEntityDomainElevation, 
  getEntityIntersectionZone, 
  INTERSECTION_ZONES, 
  QUADRANT_CENTERS, 
  entityMatchesArchipelago,
  normalizeArchipelagoBaseName,
  isEntityPrimaryToArchipelago,
  calculateFocusArchipelagoPositions,
  calculateExpandedContinentHull,
  fitContinentTightlyAroundEntities
} from './utils/layoutGenerator';
import { exportEntities, ExportFormat, sanitizeEntityObsoleteFields, getEntitySpreadsheetField, splitLanguageValues, entityMatchesRelationship, ensureUniqueEntityIds } from './utils/excelParser';
import { sanitizeEntitySocialProfiles } from './utils/socialMedia';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { RpgMapCanvas } from './components/RpgMapCanvas';
import { UpdateDataModal } from './components/UpdateDataModal';
import { DiscoveryModeModal } from './components/DiscoveryModeModal';
import { AboutModal } from './components/AboutModal';
import { DirectoryView } from './components/DirectoryView';
import { ReviewPipelineModal } from './components/ReviewPipelineModal';
import { DismissChangesModal } from './components/DismissChangesModal';
import { PositionSnapshotModal } from './components/PositionSnapshotModal';
import { SubmitEntityModal } from './components/SubmitEntityModal';
import { 
  persistPublishedDatasetToFirestore, 
  fetchPublishedDatasetFromFirestore, 
  subscribeToPublishedDataset,
  healAndAlignContinentShapes
} from './utils/ecosystemPersistence';
import { registerColumnComments, getAllColumnComments } from './utils/columnComments';
import { getEntityMapLayer, calculateAutoFitQuadrantSizes } from './utils/layerClassifier';

const LOCAL_STORAGE_KEY = 'metta_ecosystem_custom_positions_v3';
const CONTINENTS_STORAGE_KEY = 'metta_ecosystem_continents_v3';
const FULL_DATASET_STORAGE_KEY = 'metta_ecosystem_full_dataset_v3';
const UNCOMMITTED_CHANGES_KEY = 'metta_has_uncommitted_cloud_changes';
const ARCHIPELAGO_METADATA_STORAGE_KEY = 'metta_ecosystem_archipelago_metadata_v1';
const COMMITTED_BASELINE_KEY = 'metta_ecosystem_committed_baseline_v1';
const LAYER_QUADRANTS_STORAGE_KEY = 'metta_ecosystem_layer_quadrants_v1';

export default function App() {
  // Custom continent shape control points
  const [customContinentShapes, setCustomContinentShapes] = useState<Record<string, [number, number][]>>(() => {
    try {
      const saved = localStorage.getItem(CONTINENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          const clean: Record<string, [number, number][]> = {};
          for (const [k, v] of Object.entries(parsed)) {
            const formatted = formatClusterWithNumber(k) || k;
            clean[formatted] = v as [number, number][];
          }
          return clean;
        }
      }
    } catch (e) {
      console.warn('Failed to parse continent shapes from localStorage', e);
    }
    return INITIAL_CONTINENT_SHAPES || {};
  });

  // Custom archipelago metadata (quadrant assignments, descriptions, label offsets)
  const [archipelagoMetadata, setArchipelagoMetadata] = useState<Record<string, ArchipelagoMeta>>(() => {
    try {
      const saved = localStorage.getItem(ARCHIPELAGO_METADATA_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          const clean: Record<string, ArchipelagoMeta> = {};
          for (const [k, v] of Object.entries(parsed)) {
            const formatted = formatClusterWithNumber(k) || k;
            clean[formatted] = { ...(clean[formatted] || {}), ...(v as ArchipelagoMeta) };
          }
          return clean;
        }
      }
    } catch (e) {
      console.warn('Failed to parse archipelago metadata from localStorage', e);
    }
    return INITIAL_ARCHIPELAGO_METADATA || {};
  });

  // Layer-specific quadrant dimensions (loaded dynamically according to active layer)
  const [layerQuadrantSizes, setLayerQuadrantSizes] = useState<LayerQuadrantConfig>(() => {
    try {
      const saved = localStorage.getItem(LAYER_QUADRANTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_LAYER_QUADRANT_SIZES, ...(INITIAL_LAYER_QUADRANT_SIZES || {}), ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to parse layer quadrant sizes from localStorage', e);
    }
    return INITIAL_LAYER_QUADRANT_SIZES ? { ...DEFAULT_LAYER_QUADRANT_SIZES, ...INITIAL_LAYER_QUADRANT_SIZES } : DEFAULT_LAYER_QUADRANT_SIZES;
  });

  // Initialize dataset & calculate layout with guaranteed anti-overlap clearance
  const [entities, setEntities] = useState<EcosystemEntity[]>(() => {
    let baseEntities = ensureUniqueEntityIds(INITIAL_ENTITIES);
    try {
      const savedDataset = localStorage.getItem(FULL_DATASET_STORAGE_KEY);
      if (savedDataset) {
        const parsed = JSON.parse(savedDataset);
        // Discard any stale <50 entity caches from earlier versions
        if (Array.isArray(parsed) && parsed.length >= 50) {
          baseEntities = ensureUniqueEntityIds(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse full dataset from localStorage', e);
    }

    // Entities: Default to INITIAL_ENTITIES (clean Organizations and People).
    // If user has synced/uploaded a spreadsheet, load that dataset.
    // Idea entities are only allowed if explicitly present in an uploaded spreadsheet.
    const hasSyncedSpreadsheet = typeof window !== 'undefined' && localStorage.getItem('metta_has_synced_spreadsheet') === 'true';
    if (!hasSyncedSpreadsheet) {
      baseEntities = baseEntities.filter(ent => ent.type !== 'Idea');
    }

    // Ensure all entities are thoroughly sanitized and have relationship data & categorizedFields
    baseEntities = baseEntities.map(ent => {
      const sanitized = sanitizeEntityObsoleteFields(sanitizeEntitySocialProfiles(ent));
      if (sanitized.continent) {
        sanitized.continent = formatClusterWithNumber(sanitized.continent);
      }
      const init = INITIAL_ENTITIES.find(e => e.id === sanitized.id);
      if (init) {
        if (!sanitized.ourRelationship && init.ourRelationship) {
          sanitized.ourRelationship = init.ourRelationship;
        }
        if (init.categorizedFields) {
          const merged: Record<string, Record<string, any>> = { ...(init.categorizedFields || {}) };
          if (sanitized.categorizedFields) {
            Object.entries(sanitized.categorizedFields).forEach(([cat, flds]) => {
              merged[cat] = { ...(merged[cat] || {}), ...(flds || {}) };
            });
          }
          sanitized.categorizedFields = merged;
        }
      }
      return sanitized;
    });

    baseEntities = ensureUniqueEntityIds(baseEntities);

    // Initial overrides from archipelago metadata
    let initialMeta = INITIAL_ARCHIPELAGO_METADATA || {};
    try {
      const savedMeta = localStorage.getItem(ARCHIPELAGO_METADATA_STORAGE_KEY);
      if (savedMeta) {
        const parsed = JSON.parse(savedMeta);
        if (parsed && typeof parsed === 'object') {
          initialMeta = { ...initialMeta, ...parsed };
        }
      }
    } catch {}

    const initialOverrides: Record<string, CategoryQuadrant> = {};
    Object.entries(initialMeta).forEach(([name, meta]) => {
      if (meta?.quadrant) {
        initialOverrides[name] = meta.quadrant;
        initialOverrides[formatClusterWithNumber(name)] = meta.quadrant;
        initialOverrides[normalizeArchipelagoBaseName(name)] = meta.quadrant;
      }
    });

    const { entities: layouted } = calculateEntityLayout(baseEntities, { archipelagoQuadrantOverrides: initialOverrides });

    // Restore custom positions from localStorage if available
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('metta_ecosystem_custom_positions_v2');
      if (saved) {
        const customMap: Record<string, { x: number; y: number; notes?: string; communityNotes?: CommunityNote[]; continent?: string; dataCompleteness?: DataCompletenessLevel; dataQuality?: any }> = JSON.parse(saved);
        const mapped = layouted.map(ent => {
          if (customMap[ent.id]) {
            const savedPos = customMap[ent.id];
            const isStale = (savedPos.x === 0 && savedPos.y === 0);

            if (!isStale) {
              const newX = savedPos.x;
              const newY = savedPos.y;
              const newCat: CategoryQuadrant = (newX < 0 && newY < 0) ? 'Inner'
                : (newX > 0 && newY < 0) ? 'Social'
                : (newX < 0 && newY > 0) ? 'Cultural'
                : 'Systems';

              return {
                ...ent,
                x: newX,
                y: newY,
                category: isEntityDomainElevation(ent) ? ent.category : newCat,
                quadrant: isEntityDomainElevation(ent) ? ent.quadrant : newCat,
                isCustomPosition: true,
                notes: savedPos.notes || ent.notes,
                communityNotes: (savedPos as any).communityNotes || ent.communityNotes,
                continent: savedPos.continent ? formatClusterWithNumber(savedPos.continent) : ent.continent,
                dataCompleteness: getEntityCompleteness(ent),
                dataQuality: getEntityCompleteness(ent)
              };
            }
          }
          return ent;
        });

        // Load saved positions directly without collision detection modifying them
        return ensureUniqueEntityIds(mapped);
      }
    } catch (e) {
      console.warn('Failed to parse saved positions from localStorage', e);
    }

    return ensureUniqueEntityIds(layouted);
  });

  // Calculate field clusters, continents, and layout geometry
  const { fieldClusters, continents: rawContinents } = useMemo(() => {
    const overrides: Record<string, CategoryQuadrant> = {};
    (Object.entries(archipelagoMetadata) as [string, { quadrant?: CategoryQuadrant; description?: string }][]).forEach(([name, meta]) => {
      if (meta.quadrant) {
        overrides[name] = meta.quadrant;
        overrides[formatClusterWithNumber(name)] = meta.quadrant;
      }
    });
    return calculateEntityLayout(entities, { archipelagoQuadrantOverrides: overrides });
  }, [entities, archipelagoMetadata]);

  // Merge custom continent control point shapes & descriptions with computed continents
  const baseContinents = useMemo(() => {
    return rawContinents.map(cont => {
      const formattedContName = formatClusterWithNumber(cont.name);
      const baseContName = normalizeArchipelagoBaseName(cont.name);
      const cleanNoNum = cont.name.replace(/^\d+[\.\)]\s*/, '').trim();

      const meta = archipelagoMetadata[cont.name] 
        || archipelagoMetadata[formattedContName]
        || archipelagoMetadata[baseContName]
        || archipelagoMetadata[cleanNoNum]
        || Object.entries(archipelagoMetadata).find(([k]) => normalizeArchipelagoBaseName(k) === baseContName)?.[1];
      const customDesc = meta?.description !== undefined ? meta.description : cont.description;
      const labelOffsetX = meta?.labelOffset?.x || 0;
      const labelOffsetY = meta?.labelOffset?.y || 0;
      const subLabelOffsetX = meta?.subLabelOffset?.x !== undefined ? meta.subLabelOffset.x : labelOffsetX;
      const subLabelOffsetY = meta?.subLabelOffset?.y !== undefined ? meta.subLabelOffset.y : labelOffsetY;

      // Curvature: 0 = straight horizontal line, 0.35 = gentle, 0.7 = natural arch, 1.0+ = curved
      const globalMeta = archipelagoMetadata['__global__'];
      const defaultTitleCurv = globalMeta?.titleCurvature !== undefined ? globalMeta.titleCurvature : 0.7;
      const defaultSubTitleCurv = globalMeta?.subTitleCurvature !== undefined ? globalMeta.subTitleCurvature : 0.7;
      const titleCurvature = meta?.titleCurvature !== undefined ? meta.titleCurvature : defaultTitleCurv;
      const subTitleCurvature = meta?.subTitleCurvature !== undefined ? meta.subTitleCurvature : defaultSubTitleCurv;

      // Rotation: angle in degrees (-180 to 180 or 0 to 360) for archipelago title and sub-title
      const labelRotation = meta?.labelRotation ?? 0;
      const subLabelRotation = meta?.subLabelRotation !== undefined ? meta.subLabelRotation : labelRotation;

      // Resilient lookup across all variations (exact, numbered, clean base, without prefix)
      const customPoints = customContinentShapes[cont.name]
        || customContinentShapes[formattedContName]
        || customContinentShapes[baseContName]
        || customContinentShapes[cleanNoNum]
        || Object.entries(customContinentShapes).find(([k]) => normalizeArchipelagoBaseName(k) === baseContName)?.[1];

      if (customPoints && customPoints.length >= 3) {
        const effectivePoints = customPoints;
        const pathData = createPathFromControlPoints(effectivePoints);
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let sumX = 0;
        let sumY = 0;
        effectivePoints.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          sumX += x;
          sumY += y;
        });
        const cX = Math.round(sumX / effectivePoints.length);
        const cY = Math.round(sumY / effectivePoints.length);
        const sMinX = minX - 25;
        const sMaxX = maxX + 25;
        const sMinY = minY - 25;
        const sMaxY = maxY + 25;
        const labelPath = generateContinentLabelPath(cX, cY, sMinX, sMaxX, sMinY, sMaxY, effectivePoints, 0, titleCurvature, cont.name);
        const subLabelPath = generateContinentLabelPath(cX, cY, sMinX, sMaxX, sMinY, sMaxY, effectivePoints, -22, subTitleCurvature, `${cont.count} ${cont.count === 1 ? 'entity' : 'entities'}`);
        return {
          ...cont,
          description: customDesc,
          controlPoints: effectivePoints,
          pathData,
          labelPath,
          subLabelPath,
          labelOffsetX,
          labelOffsetY,
          subLabelOffsetX,
          subLabelOffsetY,
          titleCurvature,
          subTitleCurvature,
          labelRotation,
          subLabelRotation,
          centerX: cX,
          centerY: cY,
          minX: sMinX,
          maxX: sMaxX,
          minY: sMinY,
          maxY: sMaxY,
          isCustomShape: true
        };
      }

      const labelPath = generateContinentLabelPath(
        cont.centerX,
        cont.centerY,
        cont.minX,
        cont.maxX,
        cont.minY,
        cont.maxY,
        cont.controlPoints,
        0,
        titleCurvature,
        cont.name
      );
      const subLabelPath = generateContinentLabelPath(
        cont.centerX,
        cont.centerY,
        cont.minX,
        cont.maxX,
        cont.minY,
        cont.maxY,
        cont.controlPoints,
        -22,
        subTitleCurvature,
        `${cont.count} ${cont.count === 1 ? 'entity' : 'entities'}`
      );

      return {
        ...cont,
        description: customDesc,
        labelOffsetX,
        labelOffsetY,
        subLabelOffsetX,
        subLabelOffsetY,
        titleCurvature,
        subTitleCurvature,
        labelRotation,
        subLabelRotation,
        labelPath,
        subLabelPath
      };
    });
  }, [rawContinents, customContinentShapes, archipelagoMetadata, entities]);

  // Extract unique locations, languages, stages for filters
  const locations = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => { if (e.location) set.add(e.location); });
    return Array.from(set).sort();
  }, [entities]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AA2') || e.language;
      if (val) {
        splitLanguageValues(val).forEach(l => set.add(l));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  const stages = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => { if (e.stage) set.add(e.stage); });
    return Array.from(set).sort();
  }, [entities]);

  // Filter State
  const [filterState, setFilterState] = useState<FilterState>({
    searchQuery: '',
    categories: { Inner: true, Social: true, Cultural: true, Systems: true },
    entityTypes: { Organization: true, Person: true, Idea: true, Media: false },
    dataCompleteness: {
      'Top 10%': true,
      'Top 25%': true,
      'Top 50%': true,
      'Top 75%': true,
      'Bottom 25%': true
    },
    dataQuality: {
      'Top 10%': true,
      'Top 25%': true,
      'Top 50%': true,
      'Top 75%': true,
      'Bottom 25%': true
    },
    selectedFields: [],
    hiddenFields: [],
    selectedContinents: [],
    hiddenContinents: [],
    selectedLocation: 'All',
    selectedLanguage: 'All',
    selectedStage: 'All',
    selectedOurRelationship: 'All',
    selectedOurRelationships: [],
    selectedBiome: 'All',
    selectedBiomes: [],
    selectedBioregion: 'All',
    selectedBioregions: [],
    selectedCityState: 'All',
    selectedCountry: 'All',
    selectedOperatingRegion: 'All',
    selectedOperationFocus: 'All',
    selectedMaturityLevel: 'All',
    selectedSize: 'All',
    selectedReach: 'All',
    selectedSituationalAssessment: 'All',
    selectedValueMeme: 'All',
    selectedOrientation3H: 'All',
    selectedOrientationGtdf: 'All',
    selectedOrientationCri: 'All',
    selectedMatchingDatabase: 'All',
    onlyFeatured: false,
    onlyEcotones: false,
    selectedIntersectionZone: 'All',
    selectedIntersectionZones: [],
    activeLayer: 1
  });

  // UI States
  const [selectedEntity, setSelectedEntity] = useState<EcosystemEntity | null>(null);
  const [selectedContinentName, setSelectedContinentName] = useState<string | null>(null);
  const [activeListScope, setActiveListScope] = useState<SidebarListScope | null>(null);
  const [viewport, setViewport] = useState<MapViewport>({ x: 0, y: 0, zoom: 0.75 });
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const leftSidebarBeforeFocusRef = useRef<boolean>(false);
  const [editMode, setEditMode] = useState(false);
  const [showContinents, setShowContinents] = useState(true);
  const [showRelationships, setShowRelationships] = useState(false);
  const [showEcotones, setShowEcotones] = useState(false);

  // Page Views: 'map' | 'directory'
  const [currentView, setCurrentView] = useState<'map' | 'directory'>('map');

  // Initial loading state to prevent flash of unhydrated layout
  const [isInitialLoading, setIsInitialLoading] = useState(true);



  // Modals
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [submitEntityModalOpen, setSubmitEntityModalOpen] = useState(false);
  const [discoveryModalOpen, setDiscoveryModalOpen] = useState(false);
  const [reviewPipelineModalOpen, setReviewPipelineModalOpen] = useState(false);
  const [positionSnapshotModalOpen, setPositionSnapshotModalOpen] = useState(false);
  const [dismissModalOpen, setDismissModalOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissSuccessToast, setDismissSuccessToast] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<{ title: string; details: string[] } | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Cloud sync, uncommitted changes, and quota status
  const cloudSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCommittingRef = useRef(false);

  const [cloudSyncStatus, setCloudSyncStatus] = useState<{
    state: 'idle' | 'syncing' | 'saved' | 'saved_locally' | 'quota_exceeded' | 'error';
    message?: string;
  }>({ state: 'idle' });

  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(() => {
    try {
      return localStorage.getItem(UNCOMMITTED_CHANGES_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const hasUncommittedChangesRef = useRef(hasUncommittedChanges);
  useEffect(() => {
    hasUncommittedChangesRef.current = hasUncommittedChanges;
  }, [hasUncommittedChanges]);

  const entitiesRef = useRef(entities);
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  const customContinentShapesRef = useRef(customContinentShapes);
  useEffect(() => {
    customContinentShapesRef.current = customContinentShapes;
  }, [customContinentShapes]);

  const isReshapingContinentRef = useRef(false);

  const archipelagoMetadataRef = useRef(archipelagoMetadata);
  useEffect(() => {
    archipelagoMetadataRef.current = archipelagoMetadata;
  }, [archipelagoMetadata]);

  const layerQuadrantSizesRef = useRef(layerQuadrantSizes);
  useEffect(() => {
    layerQuadrantSizesRef.current = layerQuadrantSizes;
  }, [layerQuadrantSizes]);

  // Clean snapshot of the last committed / published cloud state (for reverting dismissed changes)
  const committedSnapshotRef = useRef<{
    entities: EcosystemEntity[];
    customContinentShapes: Record<string, [number, number][]>;
    archipelagoMetadata: Record<string, ArchipelagoMeta>;
    layerQuadrantSizes: LayerQuadrantConfig;
  }>((() => {
    try {
      const saved = localStorage.getItem(COMMITTED_BASELINE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.entities && Array.isArray(parsed.entities) && parsed.entities.length >= 50) {
          return {
            entities: parsed.entities,
            customContinentShapes: parsed.customContinentShapes || INITIAL_CONTINENT_SHAPES || {},
            archipelagoMetadata: parsed.archipelagoMetadata || INITIAL_ARCHIPELAGO_METADATA || {},
            layerQuadrantSizes: parsed.layerQuadrantSizes || INITIAL_LAYER_QUADRANT_SIZES || DEFAULT_LAYER_QUADRANT_SIZES
          };
        }
      }
    } catch {}
    return {
      entities: INITIAL_ENTITIES.filter(ent => ent.type !== 'Idea'),
      customContinentShapes: INITIAL_CONTINENT_SHAPES || {},
      archipelagoMetadata: INITIAL_ARCHIPELAGO_METADATA || {},
      layerQuadrantSizes: INITIAL_LAYER_QUADRANT_SIZES ? { ...DEFAULT_LAYER_QUADRANT_SIZES, ...INITIAL_LAYER_QUADRANT_SIZES } : DEFAULT_LAYER_QUADRANT_SIZES
    };
  })());

  const editModeRef = useRef(editMode);
  const prevEditModeRef = useRef(editMode);

  // Edit mode Undo / Redo history stacks (stores snapshots before edits)
  const [undoStack, setUndoStack] = useState<Array<{
    entities: EcosystemEntity[];
    customContinentShapes: Record<string, [number, number][]>;
    archipelagoMetadata: Record<string, ArchipelagoMeta>;
    layerQuadrantSizes: LayerQuadrantConfig;
    description?: string;
  }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{
    entities: EcosystemEntity[];
    customContinentShapes: Record<string, [number, number][]>;
    archipelagoMetadata: Record<string, ArchipelagoMeta>;
    layerQuadrantSizes: LayerQuadrantConfig;
    description?: string;
  }>>([]);
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null);
  const undoToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pushHistorySnapshot = useCallback((description?: string) => {
    if (!editModeRef.current) return;
    const snapshot = {
      entities: JSON.parse(JSON.stringify(entitiesRef.current)),
      customContinentShapes: JSON.parse(JSON.stringify(customContinentShapesRef.current)),
      archipelagoMetadata: JSON.parse(JSON.stringify(archipelagoMetadataRef.current)),
      layerQuadrantSizes: JSON.parse(JSON.stringify(layerQuadrantSizesRef.current)),
      description
    };
    setUndoStack(prev => {
      const next = [...prev, snapshot];
      if (next.length > 50) return next.slice(next.length - 50);
      return next;
    });
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  // Commit pending local changes to Firestore cloud database
  const triggerCloudCommit = useCallback(async (
    entitiesToCommit?: EcosystemEntity[],
    shapesToCommit?: Record<string, [number, number][]>,
    metadataToCommit?: Record<string, ArchipelagoMeta>,
    quadrantSizesToCommit?: LayerQuadrantConfig
  ) => {
    if (isCommittingRef.current) return;
    isCommittingRef.current = true;

    const dataset = entitiesToCommit || entitiesRef.current;
    const shapes = shapesToCommit !== undefined ? shapesToCommit : customContinentShapesRef.current;
    const metadata = metadataToCommit !== undefined ? metadataToCommit : archipelagoMetadataRef.current;
    const quadrantSizes = quadrantSizesToCommit !== undefined ? quadrantSizesToCommit : layerQuadrantSizesRef.current;

    setCloudSyncStatus({ state: 'syncing', message: 'Committing changes to cloud...' });

    try {
      const result = await persistPublishedDatasetToFirestore(dataset, shapes, metadata, getAllColumnComments(), quadrantSizes);
      if (result.success) {
        hasUncommittedChangesRef.current = false;
        setHasUncommittedChanges(false);
        try {
          localStorage.removeItem(UNCOMMITTED_CHANGES_KEY);
        } catch {}

        // Update committed baseline snapshot
        committedSnapshotRef.current = {
          entities: JSON.parse(JSON.stringify(dataset)),
          customContinentShapes: JSON.parse(JSON.stringify(shapes)),
          archipelagoMetadata: JSON.parse(JSON.stringify(metadata)),
          layerQuadrantSizes: JSON.parse(JSON.stringify(quadrantSizes))
        };
        try {
          localStorage.setItem(COMMITTED_BASELINE_KEY, JSON.stringify(committedSnapshotRef.current));
        } catch {}

        setCloudSyncStatus({ state: 'saved', message: 'All changes committed to cloud' });
        setTimeout(() => {
          setCloudSyncStatus(prev => prev.state === 'saved' ? { state: 'idle' } : prev);
        }, 4000);
      } else if (result.quotaExceeded) {
        setCloudSyncStatus({
          state: 'quota_exceeded',
          message: 'Saved locally on this device. Cloud daily write limit reached (resets tomorrow).'
        });
      } else {
        setCloudSyncStatus({
          state: 'error',
          message: 'Saved locally. Cloud commit failed, will retry on next exit or refresh.'
        });
      }
    } catch (err) {
      console.warn('Cloud commit error:', err);
      setCloudSyncStatus({
        state: 'error',
        message: 'Saved locally. Cloud commit encountered an issue.'
      });
    } finally {
      isCommittingRef.current = false;
    }
  }, []);

  // Dismiss all uncommitted changes made in Edit Mode and revert to last committed cloud version
  const handleDismissChanges = useCallback(async (alsoExitEditMode = false) => {
    setIsDismissing(true);

    try {
      // 1. Immediately cancel any scheduled sync/toast timers
      if (cloudSyncTimerRef.current) {
        clearTimeout(cloudSyncTimerRef.current);
        cloudSyncTimerRef.current = null;
      }
      if (localToastTimerRef.current) {
        clearTimeout(localToastTimerRef.current);
        localToastTimerRef.current = null;
      }

      // 2. Clear uncommitted flags FIRST so unload/visibility/exit handlers will never commit
      hasUncommittedChangesRef.current = false;
      setHasUncommittedChanges(false);
      try {
        localStorage.removeItem(UNCOMMITTED_CHANGES_KEY);
      } catch {}

      // 3. Determine target restored state (from baseline snapshot or Firestore)
      let restoredEntities: EcosystemEntity[] = committedSnapshotRef.current.entities;
      let restoredShapes: Record<string, [number, number][]> = committedSnapshotRef.current.customContinentShapes;
      let restoredMeta: Record<string, ArchipelagoMeta> = committedSnapshotRef.current.archipelagoMetadata;
      let restoredQuadrantSizes: LayerQuadrantConfig = committedSnapshotRef.current.layerQuadrantSizes || DEFAULT_LAYER_QUADRANT_SIZES;

      // Try fresh fetch from Firestore to guarantee exact parity with remote database
      try {
        const cloud = await fetchPublishedDatasetFromFirestore();
        if (cloud.entities && Array.isArray(cloud.entities) && cloud.entities.length > 0) {
          restoredEntities = cloud.entities;
          if (cloud.continentShapes) restoredShapes = cloud.continentShapes;
          if (cloud.archipelagoMetadata) restoredMeta = cloud.archipelagoMetadata;
          if (cloud.layerQuadrantSizes) restoredQuadrantSizes = { ...DEFAULT_LAYER_QUADRANT_SIZES, ...cloud.layerQuadrantSizes };
        }
      } catch (err) {
        console.warn('Could not re-fetch from Firestore on dismiss, using local baseline', err);
      }

      if (!restoredEntities || restoredEntities.length === 0) {
        restoredEntities = INITIAL_ENTITIES.filter(ent => ent.type !== 'Idea');
      }

      // 4. Sanitize and recalculate layout
      const uniqueRestored = ensureUniqueEntityIds(restoredEntities);
      const sanitized = uniqueRestored.map(ent => {
        const clean = sanitizeEntityObsoleteFields(sanitizeEntitySocialProfiles(ent));
        if (clean.continent) {
          clean.continent = formatClusterWithNumber(clean.continent);
        }
        return clean;
      });
      const { entities: layouted } = calculateEntityLayout(ensureUniqueEntityIds(sanitized));
      const uniqueLayouted = ensureUniqueEntityIds(layouted);

      // 5. Update localStorage with clean reverted state
      try {
        const customMap: Record<string, Partial<EcosystemEntity>> = {};
        uniqueLayouted.forEach(ent => {
          if (ent.isCustomPosition) {
            customMap[ent.id] = {
              name: ent.name,
              type: ent.type,
              x: ent.x,
              y: ent.y,
              isCustomPosition: true,
              continent: ent.continent,
              notes: ent.notes
            };
          }
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customMap));
        localStorage.setItem(FULL_DATASET_STORAGE_KEY, JSON.stringify(uniqueLayouted));
        localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(restoredShapes));
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(restoredMeta));
        localStorage.setItem(LAYER_QUADRANTS_STORAGE_KEY, JSON.stringify(restoredQuadrantSizes));
      } catch (e) {
        console.warn('Failed to update localStorage on dismiss', e);
      }

      // 6. Update local state
      setEntities(uniqueLayouted);
      setCustomContinentShapes(restoredShapes);
      setArchipelagoMetadata(restoredMeta);
      setLayerQuadrantSizes(restoredQuadrantSizes);

      // Refresh currently selected entity if active
      if (selectedEntity) {
        const matched = uniqueLayouted.find(e => e.id === selectedEntity.id);
        setSelectedEntity(matched || null);
      }

      // 7. If user chose to exit edit mode as well
      if (alsoExitEditMode) {
        setEditMode(false);
      }

      // 8. Update baseline ref
      committedSnapshotRef.current = {
        entities: JSON.parse(JSON.stringify(uniqueLayouted)),
        customContinentShapes: JSON.parse(JSON.stringify(restoredShapes)),
        archipelagoMetadata: JSON.parse(JSON.stringify(restoredMeta)),
        layerQuadrantSizes: JSON.parse(JSON.stringify(restoredQuadrantSizes))
      };
      try {
        localStorage.setItem(COMMITTED_BASELINE_KEY, JSON.stringify(committedSnapshotRef.current));
      } catch {}

      // 9. Feedback status
      setCloudSyncStatus({
        state: 'idle',
        message: 'All uncommitted changes have been dismissed. Map restored to cloud version.'
      });

      setDismissSuccessToast(true);
      setTimeout(() => {
        setDismissSuccessToast(false);
      }, 3500);
    } finally {
      setIsDismissing(false);
      setDismissModalOpen(false);
    }
  }, [selectedEntity]);

  // When exiting edit mode, automatically commit all pending changes to Firestore (unless dismissed)
  useEffect(() => {
    editModeRef.current = editMode;
    if (!prevEditModeRef.current && editMode) {
      // Just entered edit mode: if no uncommitted changes, capture baseline snapshot
      if (!hasUncommittedChangesRef.current) {
        committedSnapshotRef.current = {
          entities: JSON.parse(JSON.stringify(entitiesRef.current)),
          customContinentShapes: JSON.parse(JSON.stringify(customContinentShapesRef.current)),
          archipelagoMetadata: JSON.parse(JSON.stringify(archipelagoMetadataRef.current))
        };
        try {
          localStorage.setItem(COMMITTED_BASELINE_KEY, JSON.stringify(committedSnapshotRef.current));
        } catch {}
      }
    }

    if (prevEditModeRef.current && !editMode) {
      setReviewPipelineModalOpen(false);
      if (hasUncommittedChangesRef.current) {
        console.info('Exited Edit Mode: committing pending changes to cloud database...');
        triggerCloudCommit();
      }
    }
    prevEditModeRef.current = editMode;
  }, [editMode, triggerCloudCommit]);

  // When refreshing or leaving the page, commit pending local changes to Firestore
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUncommittedChangesRef.current) {
        try {
          localStorage.setItem(UNCOMMITTED_CHANGES_KEY, 'true');
          localStorage.setItem(FULL_DATASET_STORAGE_KEY, JSON.stringify(entitiesRef.current));
          localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(customContinentShapesRef.current));
          localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(archipelagoMetadataRef.current));
          localStorage.setItem(LAYER_QUADRANTS_STORAGE_KEY, JSON.stringify(layerQuadrantSizesRef.current));
        } catch {}
        // Fire and forget async commit to Firestore on page unload
        persistPublishedDatasetToFirestore(
          entitiesRef.current,
          customContinentShapesRef.current,
          archipelagoMetadataRef.current,
          getAllColumnComments(),
          layerQuadrantSizesRef.current
        ).catch(() => {});
      }
    };

    const handlePageHide = () => {
      if (hasUncommittedChangesRef.current) {
        try {
          localStorage.setItem(UNCOMMITTED_CHANGES_KEY, 'true');
          localStorage.setItem(FULL_DATASET_STORAGE_KEY, JSON.stringify(entitiesRef.current));
          localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(customContinentShapesRef.current));
          localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(archipelagoMetadataRef.current));
          localStorage.setItem(LAYER_QUADRANTS_STORAGE_KEY, JSON.stringify(layerQuadrantSizesRef.current));
        } catch {}
        persistPublishedDatasetToFirestore(
          entitiesRef.current,
          customContinentShapesRef.current,
          archipelagoMetadataRef.current,
          getAllColumnComments(),
          layerQuadrantSizesRef.current
        ).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUncommittedChangesRef.current) {
        triggerCloudCommit();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (localToastTimerRef.current) {
        clearTimeout(localToastTimerRef.current);
      }
      if (cloudSyncTimerRef.current) {
        clearTimeout(cloudSyncTimerRef.current);
      }
    };
  }, [triggerCloudCommit]);

  // Hydrate published ecosystem dataset from Firestore on startup
  useEffect(() => {
    let isMounted = true;
    async function loadCloudDataset() {
      try {
        const hasPendingLocal = localStorage.getItem(UNCOMMITTED_CHANGES_KEY) === 'true';

        // Preserve any custom positions saved in localStorage
        const savedCustomRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        let localCustomMap: Record<string, Partial<EcosystemEntity>> = {};
        if (savedCustomRaw) {
          try { localCustomMap = JSON.parse(savedCustomRaw); } catch {}
        }

        const savedShapesRaw = localStorage.getItem(CONTINENTS_STORAGE_KEY);
        let localShapes: Record<string, [number, number][]> = {};
        if (savedShapesRaw) {
          try { localShapes = JSON.parse(savedShapesRaw); } catch {}
        }

        const savedDatasetRaw = localStorage.getItem(FULL_DATASET_STORAGE_KEY);
        let localEntities: EcosystemEntity[] | null = null;
        if (savedDatasetRaw) {
          try {
            const parsed = JSON.parse(savedDatasetRaw);
            if (Array.isArray(parsed) && parsed.length >= 50) {
              localEntities = parsed;
            }
          } catch {}
        }

        // If client had pending uncommitted changes from a previous session (e.g. refreshed page while editing):
        if (hasPendingLocal && localEntities && localEntities.length > 0) {
          console.info('Found uncommitted local changes on boot. Committing to Firestore...');
          const uniqueLocal = ensureUniqueEntityIds(localEntities);
          const { entities: layouted } = calculateEntityLayout(uniqueLocal);
          const uniqueLayouted = ensureUniqueEntityIds(layouted);
          setEntities(uniqueLayouted);
          if (Object.keys(localShapes).length > 0) {
            setCustomContinentShapes(localShapes);
          }
          triggerCloudCommit(uniqueLayouted, localShapes);
          return;
        }

        const { entities: cloudEntities, continentShapes: cloudShapes, archipelagoMetadata: cloudMeta, layerQuadrantSizes: cloudQuadrants } = await fetchPublishedDatasetFromFirestore();
        if (!isMounted) return;

        // Extract quadrant overrides from cloud metadata before computing layout
        const overrides: Record<string, CategoryQuadrant> = {};
        if (cloudMeta && typeof cloudMeta === 'object') {
          Object.entries(cloudMeta).forEach(([name, meta]: [string, any]) => {
            if (meta?.quadrant) {
              overrides[name] = meta.quadrant;
              overrides[formatClusterWithNumber(name)] = meta.quadrant;
              overrides[normalizeArchipelagoBaseName(name)] = meta.quadrant;
            }
          });
        }

        if (cloudEntities && Array.isArray(cloudEntities) && cloudEntities.length > 0) {
          const uniqueCloud = ensureUniqueEntityIds(cloudEntities);
          const sanitized = uniqueCloud.map(ent => {
            const clean = sanitizeEntityObsoleteFields(sanitizeEntitySocialProfiles(ent));
            if (clean.continent) {
              clean.continent = formatClusterWithNumber(clean.continent);
            }
            if (hasPendingLocal && localCustomMap[clean.id] && localCustomMap[clean.id].isCustomPosition) {
              return {
                ...clean,
                x: localCustomMap[clean.id].x ?? clean.x,
                y: localCustomMap[clean.id].y ?? clean.y,
                isCustomPosition: true
              };
            }
            const hasCoords = typeof clean.x === 'number' && typeof clean.y === 'number' && (clean.x !== 0 || clean.y !== 0) && Number.isFinite(clean.x) && Number.isFinite(clean.y);
            if (hasCoords) {
              return {
                ...clean,
                isCustomPosition: true
              };
            }
            return clean;
          });
          const { entities: layouted } = calculateEntityLayout(ensureUniqueEntityIds(sanitized), {
            forceRecalculate: false,
            archipelagoQuadrantOverrides: overrides
          });
          const uniqueLayouted = ensureUniqueEntityIds(layouted);
          setEntities(uniqueLayouted);
          entitiesRef.current = uniqueLayouted;

          try {
            localStorage.setItem(FULL_DATASET_STORAGE_KEY, JSON.stringify(uniqueLayouted));
          } catch {}
        }

        const mergedShapes = hasPendingLocal
          ? { ...(INITIAL_CONTINENT_SHAPES || {}), ...(cloudShapes || {}), ...localShapes }
          : { ...(INITIAL_CONTINENT_SHAPES || {}), ...localShapes, ...(cloudShapes || {}) };

        if (Object.keys(mergedShapes).length > 0) {
          const healedShapes = healAndAlignContinentShapes(mergedShapes, entitiesRef.current);
          setCustomContinentShapes(healedShapes);
          customContinentShapesRef.current = healedShapes;
          try {
            localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(healedShapes));
          } catch {}
        }

        if (cloudMeta && Object.keys(cloudMeta).length > 0) {
          setArchipelagoMetadata(prev => {
            const merged = hasPendingLocal
              ? { ...(INITIAL_ARCHIPELAGO_METADATA || {}), ...cloudMeta, ...prev }
              : { ...(INITIAL_ARCHIPELAGO_METADATA || {}), ...prev, ...cloudMeta };
            archipelagoMetadataRef.current = merged;
            try {
              localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }

        if (cloudQuadrants && Object.keys(cloudQuadrants).length > 0) {
          setLayerQuadrantSizes(prev => {
            const merged = hasPendingLocal
              ? { ...DEFAULT_LAYER_QUADRANT_SIZES, ...(INITIAL_LAYER_QUADRANT_SIZES || {}), ...cloudQuadrants, ...prev }
              : { ...DEFAULT_LAYER_QUADRANT_SIZES, ...(INITIAL_LAYER_QUADRANT_SIZES || {}), ...prev, ...cloudQuadrants };
            layerQuadrantSizesRef.current = merged;
            try {
              localStorage.setItem(LAYER_QUADRANTS_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }

        // Cache baseline snapshot for clean dismiss reverts
        if (cloudEntities && Array.isArray(cloudEntities) && cloudEntities.length > 0) {
          committedSnapshotRef.current = {
            entities: JSON.parse(JSON.stringify(entitiesRef.current)),
            customContinentShapes: JSON.parse(JSON.stringify(mergedShapes)),
            archipelagoMetadata: JSON.parse(JSON.stringify(cloudMeta || {})),
            layerQuadrantSizes: JSON.parse(JSON.stringify(cloudQuadrants || layerQuadrantSizesRef.current))
          };
          try {
            localStorage.setItem(COMMITTED_BASELINE_KEY, JSON.stringify(committedSnapshotRef.current));
          } catch {}
        }
      } catch (err) {
        console.warn('Failed to load published dataset from Firestore:', err);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    }

    // Safety timeout: release initial loading state after max 2s so the UI is never stalled
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsInitialLoading(false);
      }
    }, 2000);

    loadCloudDataset();

    // Listen for published dataset updates from other active sessions
    const unsub = subscribeToPublishedDataset(({ entities: updatedList, continentShapes: updatedShapes, archipelagoMetadata: updatedMeta, layerQuadrantSizes: updatedQuadrants }) => {
      if (!isMounted) return;
      // Do not overwrite user's state if currently in edit mode or has pending uncommitted local changes
      if (editModeRef.current || hasUncommittedChangesRef.current) return;

      const activeMeta = updatedMeta || archipelagoMetadataRef.current;
      const overrides: Record<string, CategoryQuadrant> = {};
      if (activeMeta && typeof activeMeta === 'object') {
        Object.entries(activeMeta).forEach(([name, meta]: [string, any]) => {
          if (meta?.quadrant) {
            overrides[name] = meta.quadrant;
            overrides[formatClusterWithNumber(name)] = meta.quadrant;
            overrides[normalizeArchipelagoBaseName(name)] = meta.quadrant;
          }
        });
      }

      if (updatedList && updatedList.length > 0) {
        const uniqueList = ensureUniqueEntityIds(updatedList);
        const sanitized = uniqueList.map(ent => {
          const clean = sanitizeEntityObsoleteFields(sanitizeEntitySocialProfiles(ent));
          const hasCoords = typeof clean.x === 'number' && typeof clean.y === 'number' && (clean.x !== 0 || clean.y !== 0) && Number.isFinite(clean.x) && Number.isFinite(clean.y);
          return {
            ...clean,
            isCustomPosition: hasCoords ? true : clean.isCustomPosition
          };
        });
        const { entities: layouted } = calculateEntityLayout(ensureUniqueEntityIds(sanitized), {
          forceRecalculate: false,
          archipelagoQuadrantOverrides: overrides
        });
        const uniqueLayouted = ensureUniqueEntityIds(layouted);
        setEntities(uniqueLayouted);
        entitiesRef.current = uniqueLayouted;
        try {
          localStorage.setItem(FULL_DATASET_STORAGE_KEY, JSON.stringify(uniqueLayouted));
        } catch {}
      }
      if (updatedShapes && Object.keys(updatedShapes).length > 0) {
        setCustomContinentShapes(prev => {
          const merged = { ...prev, ...updatedShapes };
          const healed = healAndAlignContinentShapes(merged, entitiesRef.current);
          customContinentShapesRef.current = healed;
          try {
            localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(healed));
          } catch {}
          return healed;
        });
      }
      if (updatedMeta && Object.keys(updatedMeta).length > 0) {
        setArchipelagoMetadata(prev => {
          const next = { ...prev, ...updatedMeta };
          archipelagoMetadataRef.current = next;
          return next;
        });
        try {
          localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(updatedMeta));
        } catch {}
      }
      if (updatedQuadrants && Object.keys(updatedQuadrants).length > 0) {
        setLayerQuadrantSizes(prev => {
          const next = { ...prev, ...updatedQuadrants };
          layerQuadrantSizesRef.current = next;
          return next;
        });
        try {
          localStorage.setItem(LAYER_QUADRANTS_STORAGE_KEY, JSON.stringify(updatedQuadrants));
        } catch {}
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsub();
      if (cloudSyncTimerRef.current) {
        clearTimeout(cloudSyncTimerRef.current);
      }
    };
  }, [triggerCloudCommit]);

  // Helper to persist entities to localStorage and only commit to Firestore on exit or manual save
  const saveToLocalStorage = useCallback((
    updatedEntities: EcosystemEntity[],
    continentShapesToSave?: Record<string, [number, number][]>,
    forceImmediateCloudCommit = false,
    metadataToSave?: Record<string, ArchipelagoMeta>,
    quadrantSizesToSave?: LayerQuadrantConfig
  ) => {
    try {
      const customMap: Record<string, Partial<EcosystemEntity>> = {};
      updatedEntities.forEach(ent => {
        customMap[ent.id] = {
          name: ent.name,
          type: ent.type,
          category: ent.category,
          secondaryCategories: ent.secondaryCategories,
          isDomainElevation: ent.isDomainElevation,
          dataCompleteness: ent.dataCompleteness || ent.dataQuality,
          dataQuality: ent.dataCompleteness || ent.dataQuality,
          fields: ent.fields,
          description: ent.description,
          location: ent.location,
          language: ent.language,
          stage: ent.stage,
          website: ent.website,
          contactEmail: ent.contactEmail,
          continent: ent.continent,
          x: ent.x,
          y: ent.y,
          notes: ent.notes,
          communityNotes: ent.communityNotes,
          isCustomPosition: ent.isCustomPosition
        };
      });
      const uniqueEntities = ensureUniqueEntityIds(updatedEntities);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customMap));
      localStorage.setItem(FULL_DATASET_STORAGE_KEY, JSON.stringify(uniqueEntities));
      if (continentShapesToSave !== undefined && continentShapesToSave !== null) {
        localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(continentShapesToSave));
      }
      if (metadataToSave !== undefined && metadataToSave !== null) {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(metadataToSave));
      }
      if (quadrantSizesToSave !== undefined && quadrantSizesToSave !== null) {
        localStorage.setItem(LAYER_QUADRANTS_STORAGE_KEY, JSON.stringify(quadrantSizesToSave));
      }
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }

    const shapesToSync = continentShapesToSave !== undefined ? continentShapesToSave : customContinentShapesRef.current;
    const metaToSync = metadataToSave !== undefined ? metadataToSave : archipelagoMetadataRef.current;
    const quadrantsToSync = quadrantSizesToSave !== undefined ? quadrantSizesToSave : layerQuadrantSizesRef.current;

    // Automatically debounce commits to Cloud Firestore (1800ms)
    // This guarantees that any changes made in Edit Mode (archipelago moves, entity adjustments, shape editing)
    // are automatically committed to Cloud Firestore without needing to exit edit mode or click commit.
    // When the user clicks "Publish" in the AI Studio interface, the cloud database is already 100% up-to-date!
    if (forceImmediateCloudCommit) {
      if (cloudSyncTimerRef.current) {
        clearTimeout(cloudSyncTimerRef.current);
        cloudSyncTimerRef.current = null;
      }
      triggerCloudCommit(updatedEntities, shapesToSync, metaToSync, quadrantsToSync);
    } else {
      if (editModeRef.current) {
        hasUncommittedChangesRef.current = true;
        setHasUncommittedChanges(true);
        try {
          localStorage.setItem(UNCOMMITTED_CHANGES_KEY, 'true');
        } catch {}
        // While actively in Edit Mode, cancel rapid auto-commit timers to prevent lag & Firestore quota exhaustion!
        // All changes are immediately safe in localStorage. Cloud commit occurs on explicit "Commit" or exit.
        if (cloudSyncTimerRef.current) {
          clearTimeout(cloudSyncTimerRef.current);
          cloudSyncTimerRef.current = null;
        }
      } else {
        // Outside Edit Mode (e.g. community notes added): debounced safe commit (5s)
        if (cloudSyncTimerRef.current) {
          clearTimeout(cloudSyncTimerRef.current);
        }
        cloudSyncTimerRef.current = setTimeout(() => {
          triggerCloudCommit(updatedEntities, shapesToSync, metaToSync, quadrantsToSync);
        }, 5000);
      }
    }
  }, [triggerCloudCommit]);

  // Undo latest edit in Edit Mode (Ctrl+Z / Cmd+Z)
  const handleUndo = useCallback(() => {
    if (!editModeRef.current) return;
    setUndoStack(prevUndo => {
      if (prevUndo.length === 0) return prevUndo;
      const previousSnapshot = prevUndo[prevUndo.length - 1];
      const newUndo = prevUndo.slice(0, prevUndo.length - 1);

      // Save current state to redoStack
      const currentSnapshot = {
        entities: JSON.parse(JSON.stringify(entitiesRef.current)),
        customContinentShapes: JSON.parse(JSON.stringify(customContinentShapesRef.current)),
        archipelagoMetadata: JSON.parse(JSON.stringify(archipelagoMetadataRef.current)),
        layerQuadrantSizes: JSON.parse(JSON.stringify(layerQuadrantSizesRef.current)),
        description: previousSnapshot.description
      };
      setRedoStack(prevRedo => [...prevRedo, currentSnapshot]);

      // Restore previous state
      setEntities(previousSnapshot.entities);
      entitiesRef.current = previousSnapshot.entities;
      setCustomContinentShapes(previousSnapshot.customContinentShapes);
      customContinentShapesRef.current = previousSnapshot.customContinentShapes;
      setArchipelagoMetadata(previousSnapshot.archipelagoMetadata);
      archipelagoMetadataRef.current = previousSnapshot.archipelagoMetadata;
      setLayerQuadrantSizes(previousSnapshot.layerQuadrantSizes);
      layerQuadrantSizesRef.current = previousSnapshot.layerQuadrantSizes;

      saveToLocalStorage(
        previousSnapshot.entities,
        previousSnapshot.customContinentShapes,
        false,
        previousSnapshot.archipelagoMetadata,
        previousSnapshot.layerQuadrantSizes
      );

      if (undoToastTimerRef.current) clearTimeout(undoToastTimerRef.current);
      setUndoToastMessage(previousSnapshot.description ? `Undid: ${previousSnapshot.description}` : 'Undid latest edit (Ctrl+Z)');
      undoToastTimerRef.current = setTimeout(() => {
        setUndoToastMessage(null);
      }, 2500);

      return newUndo;
    });
  }, [saveToLocalStorage]);

  // Redo undone edit in Edit Mode (Ctrl+Y / Cmd+Shift+Z)
  const handleRedo = useCallback(() => {
    if (!editModeRef.current) return;
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const nextSnapshot = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, prevRedo.length - 1);

      // Save current state to undoStack
      const currentSnapshot = {
        entities: JSON.parse(JSON.stringify(entitiesRef.current)),
        customContinentShapes: JSON.parse(JSON.stringify(customContinentShapesRef.current)),
        archipelagoMetadata: JSON.parse(JSON.stringify(archipelagoMetadataRef.current)),
        layerQuadrantSizes: JSON.parse(JSON.stringify(layerQuadrantSizesRef.current)),
        description: nextSnapshot.description
      };
      setUndoStack(prevUndo => [...prevUndo, currentSnapshot]);

      // Restore next state
      setEntities(nextSnapshot.entities);
      entitiesRef.current = nextSnapshot.entities;
      setCustomContinentShapes(nextSnapshot.customContinentShapes);
      customContinentShapesRef.current = nextSnapshot.customContinentShapes;
      setArchipelagoMetadata(nextSnapshot.archipelagoMetadata);
      archipelagoMetadataRef.current = nextSnapshot.archipelagoMetadata;
      setLayerQuadrantSizes(nextSnapshot.layerQuadrantSizes);
      layerQuadrantSizesRef.current = nextSnapshot.layerQuadrantSizes;

      saveToLocalStorage(
        nextSnapshot.entities,
        nextSnapshot.customContinentShapes,
        false,
        nextSnapshot.archipelagoMetadata,
        nextSnapshot.layerQuadrantSizes
      );

      if (undoToastTimerRef.current) clearTimeout(undoToastTimerRef.current);
      setUndoToastMessage(nextSnapshot.description ? `Redid: ${nextSnapshot.description}` : 'Redid edit (Ctrl+Y)');
      undoToastTimerRef.current = setTimeout(() => {
        setUndoToastMessage(null);
      }, 2500);

      return newRedo;
    });
  }, [saveToLocalStorage]);

  // Global keyboard listener for Undo (Ctrl+Z / Cmd+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!editModeRef.current) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // Full entity updater (data, fields, coordinates, notes, continent)
  const handleUpdateEntity = useCallback((updated: EcosystemEntity) => {
    const cleanUpdated = sanitizeEntityObsoleteFields(sanitizeEntitySocialProfiles(updated));
    setEntities(prev => {
      const exists = prev.some(ent => ent.id === cleanUpdated.id);
      const next = exists
        ? prev.map(ent => ent.id === cleanUpdated.id ? cleanUpdated : ent)
        : [...prev, cleanUpdated];
      saveToLocalStorage(next);
      return next;
    });

    if (selectedEntity?.id === cleanUpdated.id) {
      setSelectedEntity(cleanUpdated);
    }
  }, [selectedEntity, saveToLocalStorage]);

  // Update entity coordinates (when dragged or edited manually)
  const handleUpdateEntityCoordinates = useCallback((id: string, x: number, y: number) => {
    setEntities(prev => {
      return prev.map(ent => {
        if (ent.id === id) {
          return {
            ...ent,
            x,
            y,
            isCustomPosition: true
          };
        }
        return ent;
      });
    });

    if (selectedEntity?.id === id) {
      setSelectedEntity(prev => prev ? { ...prev, x, y, isCustomPosition: true } : null);
    }
  }, [selectedEntity]);

  // Update user notes
  const handleUpdateNotes = useCallback((id: string, notes: string) => {
    setEntities(prev => {
      const next = prev.map(ent => {
        if (ent.id === id) {
          return { ...ent, notes };
        }
        return ent;
      });
      saveToLocalStorage(next);
      return next;
    });

    if (selectedEntity?.id === id) {
      setSelectedEntity(prev => prev ? { ...prev, notes } : null);
    }
  }, [selectedEntity, saveToLocalStorage]);

  // Add community note to entity
  const handleAddCommunityNote = useCallback((entityId: string, author: string, content: string) => {
    const newNote: CommunityNote = {
      id: `cn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      author: author.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    setEntities(prev => {
      const next = prev.map(ent => {
        if (ent.id === entityId) {
          const existing = ent.communityNotes || [];
          return {
            ...ent,
            communityNotes: [newNote, ...existing]
          };
        }
        return ent;
      });
      saveToLocalStorage(next);
      return next;
    });

    if (selectedEntity?.id === entityId) {
      setSelectedEntity(prev => prev ? {
        ...prev,
        communityNotes: [newNote, ...(prev.communityNotes || [])]
      } : null);
    }
  }, [selectedEntity, saveToLocalStorage]);

  // Delete community note from entity (allowed in edit mode)
  const handleDeleteCommunityNote = useCallback((entityId: string, noteId: string) => {
    setEntities(prev => {
      const next = prev.map(ent => {
        if (ent.id === entityId) {
          const filtered = (ent.communityNotes || []).filter(n => n.id !== noteId);
          return {
            ...ent,
            communityNotes: filtered
          };
        }
        return ent;
      });
      saveToLocalStorage(next);
      return next;
    });

    if (selectedEntity?.id === entityId) {
      setSelectedEntity(prev => prev ? {
        ...prev,
        communityNotes: (prev.communityNotes || []).filter(n => n.id !== noteId)
      } : null);
    }
  }, [selectedEntity, saveToLocalStorage]);

  const filteredEntities = useMemo(() => {
    const matched = entities.filter(ent => {
      // 1. Search Query
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase();
        const matchesName = ent.name.toLowerCase().includes(q);
        const matchesDesc = ent.description.toLowerCase().includes(q);
        const matchesFields = ent.fields.some(f => f.toLowerCase().includes(q));
        const matchesLoc = ent.location?.toLowerCase().includes(q);
        const matchesContinent = ent.continent?.toLowerCase().includes(q);
        const matchesOtherArchs = (ent.otherArchipelagos || []).some(o => o.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesFields && !matchesLoc && !matchesContinent && !matchesOtherArchs) {
          return false;
        }
      }

      // 1b. Selected Field Tags (Left Sidebar Tag filter: shows only matching entities, supports multiple selected tags)
      if (filterState.selectedFields && filterState.selectedFields.length > 0) {
        const selectedTagsLower = filterState.selectedFields.map(f => f.toLowerCase().trim());
        const hasMatchingTag = ent.fields && ent.fields.some(f =>
          selectedTagsLower.includes(f.toLowerCase().trim())
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // 1c. Active List Scope / Archipelago filtering (e.g. from clicking Category, Other Archipelagos, or Keywords/Topics in Overview)
      if (selectedContinentName || (activeListScope?.type === 'continent' && activeListScope.name)) {
        const targetCont = selectedContinentName || (activeListScope?.type === 'continent' ? activeListScope.name : null);
        if (targetCont && !entityMatchesArchipelago(ent, targetCont)) {
          return false;
        }
      } else if (activeListScope?.type === 'category' && activeListScope.category) {
        if (ent.category !== activeListScope.category) {
          return false;
        }
        if (activeListScope.entityType && ent.type !== activeListScope.entityType) {
          return false;
        }
      } else if (activeListScope?.type === 'tag' && activeListScope.tag) {
        const tLower = activeListScope.tag.toLowerCase().trim();
        const hasTag = ent.fields && ent.fields.some(f => f.toLowerCase().trim() === tLower);
        if (!hasTag) {
          return false;
        }
      } else if (activeListScope?.type === 'approach' && activeListScope.approach) {
        const aLower = activeListScope.approach.toLowerCase().trim();
        const hasApproach = (ent.approach || []).some(a => a.toLowerCase().trim() === aLower) ||
          (ent.fields || []).some(f => f.toLowerCase().trim() === aLower);
        if (!hasApproach) {
          return false;
        }
      } else if (activeListScope?.type === 'issues' && activeListScope.issue) {
        const iLower = activeListScope.issue.toLowerCase().trim();
        const hasIssue = (ent.issues || []).some(i => i.toLowerCase().trim() === iLower) ||
          (ent.fields || []).some(f => f.toLowerCase().trim() === iLower);
        if (!hasIssue) {
          return false;
        }
      } else if (activeListScope?.type === 'activities' && activeListScope.activity) {
        const actLower = activeListScope.activity.toLowerCase().trim();
        const hasAct = (ent.activities || []).some(a => a.toLowerCase().trim() === actLower) ||
          (ent.fields || []).some(f => f.toLowerCase().trim() === actLower);
        if (!hasAct) {
          return false;
        }
      } else if (activeListScope?.type === 'relationship' && activeListScope.relationship) {
        if (!entityMatchesRelationship(ent, activeListScope.relationship)) {
          return false;
        }
        if (activeListScope.entityType && ent.type !== activeListScope.entityType) {
          return false;
        }
      } else if (activeListScope?.type === 'entityType' && activeListScope.entityType && activeListScope.entityType !== 'All') {
        if (ent.type !== activeListScope.entityType) {
          return false;
        }
      }

      // 2. Category Quadrant
      if (!filterState.categories[ent.category]) return false;

      // 3. Entity Type
      if (!filterState.entityTypes[ent.type]) return false;

      // 4. Data Completeness Status (Column X)
      const dc = getEntityCompleteness(ent);
      if (filterState.dataCompleteness) {
        if (filterState.dataCompleteness[dc] === false) {
          return false;
        }
      } else if (filterState.dataQuality && (filterState.dataQuality as any)[dc] === false) {
        return false;
      }

      // Map Layer Filter (Layer 1 active by default, Layer 2, or 'all')
      const currentLayer = filterState.activeLayer ?? 1;
      if (currentLayer !== 'all' && activeListScope?.type !== 'relationship') {
        const entLayer = getEntityMapLayer(ent);
        if (entLayer !== currentLayer) {
          return false;
        }
      }

      // S2 — Our Relationship (supports multi-selection)
      const activeOurRels = (filterState.selectedOurRelationships && filterState.selectedOurRelationships.length > 0)
        ? filterState.selectedOurRelationships.filter(r => r !== 'All')
        : (filterState.selectedOurRelationship && filterState.selectedOurRelationship !== 'All' ? [filterState.selectedOurRelationship] : []);

      if (activeOurRels.includes('none') || filterState.selectedOurRelationship === 'none') {
        return false;
      }

      if (activeOurRels.length > 0) {
        const isAllLayerRelsActive = currentLayer === 1 && activeOurRels.length >= 6;
        if (!isAllLayerRelsActive) {
          const val = getEntitySpreadsheetField(ent, 'S2') || ent.ourRelationship;
          if (!val) return false;
          const valLower = val.toLowerCase().trim();
          const matches = activeOurRels.some(rel => {
            const rLower = rel.toLowerCase().trim();
            return valLower === rLower || valLower.includes(rLower) || entityMatchesRelationship(ent, rel);
          });
          if (!matches) {
            return false;
          }
        }
      }

      // Stream Filter (Spreadsheet Stream / Streams column, supports multi-selection)
      const activeStreams = (filterState.selectedStreams && filterState.selectedStreams.length > 0)
        ? filterState.selectedStreams.filter(s => s !== 'All')
        : (filterState.selectedStream && filterState.selectedStream !== 'All' ? [filterState.selectedStream] : []);
      if (activeStreams.length > 0) {
        const rawStream = getEntitySpreadsheetField(ent, 'Stream') || ent.stream;
        let matchesStream = false;
        if (rawStream) {
          const parts = rawStream.split(/[,;/|\n]+/).map(p => p.trim().toLowerCase());
          matchesStream = activeStreams.some(st => {
            const stLower = st.toLowerCase().trim();
            return parts.includes(stLower) || rawStream.toLowerCase().trim() === stLower;
          });
        }
        if (!matchesStream && ent.streams && ent.streams.length > 0) {
          matchesStream = activeStreams.some(st => {
            const stLower = st.toLowerCase().trim();
            return ent.streams!.some(s => s.toLowerCase().trim() === stLower);
          });
        }
        if (!matchesStream) {
          return false;
        }
      }

      // Selected Archipelagos (Continents, supports multi-selection)
      const activeContinents = (filterState.selectedContinents || []).filter(c => c !== 'All');
      if (activeContinents.length > 0) {
        const matchesAny = activeContinents.some(arch => entityMatchesArchipelago(ent, arch));
        if (!matchesAny) {
          return false;
        }
      }

      // AA2 — Language(s)
      const activeLangs = (filterState.selectedLanguages && filterState.selectedLanguages.length > 0)
        ? filterState.selectedLanguages.filter(l => l !== 'All')
        : (filterState.selectedLanguage && filterState.selectedLanguage !== 'All' ? [filterState.selectedLanguage] : []);
      if (activeLangs.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AA2') || ent.language;
        if (!val) return false;
        const langs = splitLanguageValues(val).map(s => s.toLowerCase().trim());
        const hasMatch = activeLangs.some(l => langs.includes(l.trim().toLowerCase()));
        if (!hasMatch) return false;
      }

      // AE — Biome (Column AE in spreadsheet)
      const activeBiomesList = (filterState.selectedBiomes && filterState.selectedBiomes.length > 0)
        ? filterState.selectedBiomes.filter(b => b !== 'All')
        : (filterState.selectedBiome && filterState.selectedBiome !== 'All')
        ? [filterState.selectedBiome]
        : (filterState.selectedBioregions && filterState.selectedBioregions.length > 0)
        ? filterState.selectedBioregions.filter(b => b !== 'All')
        : (filterState.selectedBioregion && filterState.selectedBioregion !== 'All' ? [filterState.selectedBioregion] : []);
      if (activeBiomesList.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AE');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeBiomesList.some(b => valLower === b.trim().toLowerCase());
        if (!hasMatch) return false;
      }

      // AC2 — City, State
      const activeCities = (filterState.selectedCityStates && filterState.selectedCityStates.length > 0)
        ? filterState.selectedCityStates.filter(cs => cs !== 'All')
        : (filterState.selectedCityState && filterState.selectedCityState !== 'All' ? [filterState.selectedCityState] : []);
      if (activeCities.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AC2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeCities.some(cs => valLower === cs.trim().toLowerCase());
        if (!hasMatch) return false;
      }

      // AD2 — Country
      const activeCountriesList = (filterState.selectedCountries && filterState.selectedCountries.length > 0)
        ? filterState.selectedCountries.filter(c => c !== 'All')
        : (filterState.selectedCountry && filterState.selectedCountry !== 'All' ? [filterState.selectedCountry] : []);
      if (activeCountriesList.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AD2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeCountriesList.some(c => valLower === c.trim().toLowerCase());
        if (!hasMatch) return false;
      }

      // AE2 — Operating Region
      const activeOpRegions = (filterState.selectedOperatingRegions && filterState.selectedOperatingRegions.length > 0)
        ? filterState.selectedOperatingRegions.filter(r => r !== 'All')
        : (filterState.selectedOperatingRegion && filterState.selectedOperatingRegion !== 'All' ? [filterState.selectedOperatingRegion] : []);
      if (activeOpRegions.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AE2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeOpRegions.some(r => valLower === r.trim().toLowerCase());
        if (!hasMatch) return false;
      }

      // AF2 — Operation Focus
      const activeOpFocuses = (filterState.selectedOperationFocuses && filterState.selectedOperationFocuses.length > 0)
        ? filterState.selectedOperationFocuses.filter(f => f !== 'All')
        : (filterState.selectedOperationFocus && filterState.selectedOperationFocus !== 'All' ? [filterState.selectedOperationFocus] : []);
      if (activeOpFocuses.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AF2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeOpFocuses.some(f => valLower === f.trim().toLowerCase());
        if (!hasMatch) return false;
      }

      // AH2 — Maturity Level
      const activeMaturities = (filterState.selectedMaturityLevels && filterState.selectedMaturityLevels.length > 0)
        ? filterState.selectedMaturityLevels.filter(m => m !== 'All')
        : (filterState.selectedMaturityLevel && filterState.selectedMaturityLevel !== 'All')
        ? [filterState.selectedMaturityLevel]
        : (filterState.selectedStages && filterState.selectedStages.length > 0)
        ? filterState.selectedStages.filter(s => s !== 'All')
        : (filterState.selectedStage && filterState.selectedStage !== 'All' ? [filterState.selectedStage] : []);
      if (activeMaturities.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AH2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeMaturities.some(m => valLower === m.trim().toLowerCase());
        if (!hasMatch) return false;
      }

      // AI2 — Size
      const activeSizesList = (filterState.selectedSizes && filterState.selectedSizes.length > 0)
        ? filterState.selectedSizes.filter(s => s !== 'All')
        : (filterState.selectedSize && filterState.selectedSize !== 'All' ? [filterState.selectedSize] : []);
      if (activeSizesList.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AI2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeSizesList.some(s => valLower === s.trim().toLowerCase());
        if (!hasMatch) return false;
      }

      // AJ2 — Reach
      const activeReachesList = (filterState.selectedReaches && filterState.selectedReaches.length > 0)
        ? filterState.selectedReaches.filter(r => r !== 'All')
        : (filterState.selectedReach && filterState.selectedReach !== 'All' ? [filterState.selectedReach] : []);
      if (activeReachesList.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AJ2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeReachesList.some(r => valLower === r.trim().toLowerCase());
        if (!hasMatch) return false;
      }

      // BA2 — Situational Assessment
      const activeSitAssessments = (filterState.selectedSituationalAssessments && filterState.selectedSituationalAssessments.length > 0)
        ? filterState.selectedSituationalAssessments.filter(sa => sa !== 'All')
        : (filterState.selectedSituationalAssessment && filterState.selectedSituationalAssessment !== 'All' ? [filterState.selectedSituationalAssessment] : []);
      if (activeSitAssessments.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'BA') || getEntitySpreadsheetField(ent, 'Situational Assessment');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeSitAssessments.some(sa => valLower.includes(sa.trim().toLowerCase()));
        if (!hasMatch) return false;
      }

      // BH2 — Value Meme / Ethical Orientation
      const activeVMs = (filterState.selectedValueMemes && filterState.selectedValueMemes.length > 0)
        ? filterState.selectedValueMemes.filter(vm => vm !== 'All')
        : (filterState.selectedValueMeme && filterState.selectedValueMeme !== 'All' ? [filterState.selectedValueMeme] : []);
      if (activeVMs.length > 0) {
        const val = ent.valueMemeEthicalOrientation || getEntitySpreadsheetField(ent, 'BH') || getEntitySpreadsheetField(ent, 'Value Meme / Ethical Orientation');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeVMs.some(vm => valLower.includes(vm.trim().toLowerCase()));
        if (!hasMatch) return false;
      }

      // BO2 — Orientation to Change (Three Horizons)
      const active3H = (filterState.selectedOrientations3H && filterState.selectedOrientations3H.length > 0)
        ? filterState.selectedOrientations3H.filter(oh => oh !== 'All')
        : (filterState.selectedOrientation3H && filterState.selectedOrientation3H !== 'All' ? [filterState.selectedOrientation3H] : []);
      if (active3H.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'BO') || getEntitySpreadsheetField(ent, 'Orientation to Change (Three Horizons)');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = active3H.some(oh => valLower.includes(oh.trim().toLowerCase()));
        if (!hasMatch) return false;
      }

      // BP2 — Orientation to Change (GTDF)
      const activeGTDF = (filterState.selectedOrientationsGtdf && filterState.selectedOrientationsGtdf.length > 0)
        ? filterState.selectedOrientationsGtdf.filter(og => og !== 'All')
        : (filterState.selectedOrientationGtdf && filterState.selectedOrientationGtdf !== 'All' ? [filterState.selectedOrientationGtdf] : []);
      if (activeGTDF.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'BP') || getEntitySpreadsheetField(ent, 'Orientation to Change (GTDF)');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeGTDF.some(og => valLower.includes(og.trim().toLowerCase()));
        if (!hasMatch) return false;
      }

      // BQ2 — Orientation to Change (CRI)
      const activeCRI = (filterState.selectedOrientationsCri && filterState.selectedOrientationsCri.length > 0)
        ? filterState.selectedOrientationsCri.filter(oc => oc !== 'All')
        : (filterState.selectedOrientationCri && filterState.selectedOrientationCri !== 'All' ? [filterState.selectedOrientationCri] : []);
      if (activeCRI.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'BQ') || getEntitySpreadsheetField(ent, 'Orientation to Change (CRI)');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const hasMatch = activeCRI.some(oc => valLower.includes(oc.trim().toLowerCase()));
        if (!hasMatch) return false;
      }

      // CB2 — Matching Database
      const activeMDs = (filterState.selectedMatchingDatabases && filterState.selectedMatchingDatabases.length > 0)
        ? filterState.selectedMatchingDatabases.filter(db => db !== 'All')
        : (filterState.selectedMatchingDatabase && filterState.selectedMatchingDatabase !== 'All' ? [filterState.selectedMatchingDatabase] : []);
      if (activeMDs.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'CB') || getEntitySpreadsheetField(ent, 'Matching Database');
        if (!val) return false;
        const valLower = val.toLowerCase();
        const valClean = val.replace(/^\[([^\]]+)\]\([^)]+\)/, '$1').toLowerCase();
        const hasMatch = activeMDs.some(db => {
          const dbLower = db.trim().toLowerCase();
          return valLower.includes(dbLower) || valClean.includes(dbLower);
        });
        if (!hasMatch) return false;
      }

      // Legacy fallback for Location filter if set
      if (filterState.selectedLocation && filterState.selectedLocation !== 'All' && ent.location !== filterState.selectedLocation) {
        return false;
      }

      // 7. Hidden Continents
      if (ent.continent && filterState.hiddenContinents.includes(ent.continent)) {
        return false;
      }

      // 8. Ecotones (Intersections) Only
      if ((filterState.onlyEcotones || filterState.onlyDomainElevation) && !isEntityDomainElevation(ent)) {
        return false;
      }

      // 9. Specific Intersection Zone(s) (Diagonal Spines, Transition Corridors, Nexus)
      const activeIntersectionZones = (filterState.selectedIntersectionZones && filterState.selectedIntersectionZones.length > 0)
        ? filterState.selectedIntersectionZones.filter(z => z !== 'All')
        : (filterState.selectedIntersectionZone && filterState.selectedIntersectionZone !== 'All' ? [filterState.selectedIntersectionZone] : []);

      if (activeIntersectionZones.length > 0) {
        const zone = getEntityIntersectionZone(ent);
        if (!zone || !activeIntersectionZones.includes(zone.id)) {
          return false;
        }
      }

      return true;
    });

    // When an archipelago is focused, calculate organic layout for guest entities so they appear right there
    const targetArchipelago = selectedContinentName || (activeListScope?.type === 'continent' ? activeListScope.name : null);
    if (targetArchipelago) {
      const contInfo = baseContinents.find(c => normalizeArchipelagoBaseName(c.name) === normalizeArchipelagoBaseName(targetArchipelago));
      return ensureUniqueEntityIds(calculateFocusArchipelagoPositions(matched, targetArchipelago, contInfo, baseContinents));
    }

    return ensureUniqueEntityIds(matched);
  }, [entities, filterState, activeListScope, selectedContinentName, baseContinents]);

  // Merge dynamic focus hull expansion with base continents when an archipelago is focused
  const continents = useMemo(() => {
    const targetFocusArchipelago = selectedContinentName || (activeListScope?.type === 'continent' ? activeListScope.name : null);
    if (!targetFocusArchipelago) {
      return baseContinents;
    }
    const targetBase = normalizeArchipelagoBaseName(targetFocusArchipelago);

    return baseContinents.map(cont => {
      const isFocused = normalizeArchipelagoBaseName(cont.name) === targetBase;
      if (!isFocused) {
        return cont;
      }

      // Count all entities appearing in this archipelago during focus (primary + guest / additional entities)
      const focusEntities = filteredEntities.filter(e => entityMatchesArchipelago(e, targetFocusArchipelago));
      const focusedCount = focusEntities.length > 0 ? focusEntities.length : cont.count;

      // In edit mode or if continent has a custom shape, NEVER force-expand boundaries or override the user's sizing, but DO update the count!
      if (editMode || cont.isCustomShape) {
        return {
          ...cont,
          count: focusedCount
        };
      }

      // If this continent is currently focused and using auto-hull, expand its auto-hull to wrap around all
      // primary + guest entities appearing in this archipelago
      if (focusEntities.length > 0) {
        const expanded = calculateExpandedContinentHull(cont, focusEntities);
        return {
          ...expanded,
          count: focusedCount,
          description: cont.description,
          labelOffsetX: cont.labelOffsetX,
          labelOffsetY: cont.labelOffsetY,
          subLabelOffsetX: cont.subLabelOffsetX,
          subLabelOffsetY: cont.subLabelOffsetY
        };
      }

      return {
        ...cont,
        count: focusedCount
      };
    });
  }, [baseContinents, selectedContinentName, activeListScope, filteredEntities, editMode]);

  // Check if an archipelago is currently focused (selected without an individual entity)
  const targetFocusArchipelagoName = selectedContinentName || (activeListScope?.type === 'continent' ? activeListScope.name : null);
  const isArchipelagoFocused = Boolean(!selectedEntity && targetFocusArchipelagoName);

  const focusedContinent = useMemo(() => {
    if (!isArchipelagoFocused || !targetFocusArchipelagoName) return null;
    return continents.find(c =>
      c.name === targetFocusArchipelagoName ||
      formatClusterWithNumber(c.name).toLowerCase() === formatClusterWithNumber(targetFocusArchipelagoName).toLowerCase()
    ) || null;
  }, [isArchipelagoFocused, targetFocusArchipelagoName, continents]);

  const hasArchipelagoCustomDesc = Boolean(
    focusedContinent?.description && focusedContinent.description.trim().length > 0
  );

  // When clicking an archipelago / entering archipelago focus view, only show the right sidebar
  // if it has a custom description. In edit mode, it should still open/show normally.
  const hasActiveRightSidebar = Boolean(
    selectedEntity ||
    (isArchipelagoFocused
      ? (editMode || hasArchipelagoCustomDesc)
      : Boolean(activeListScope || selectedContinentName))
  );

  // Track active right sidebar & persist state during 300ms slide transition to prevent content flashing
  const [persistedRightSidebarScope, setPersistedRightSidebarScope] = useState<{
    entity: EcosystemEntity | null;
    continentName: string | null;
    activeScope: SidebarListScope | null;
  } | null>(null);

  useEffect(() => {
    if (hasActiveRightSidebar) {
      setPersistedRightSidebarScope({
        entity: selectedEntity,
        continentName: selectedContinentName,
        activeScope: activeListScope
      });
    } else {
      const timer = setTimeout(() => {
        setPersistedRightSidebarScope(null);
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [hasActiveRightSidebar, selectedEntity, selectedContinentName, activeListScope]);

  // Update single control vertex of a continent
  const handleUpdateContinentControlPoint = useCallback((continentName: string, pointIndex: number, newX: number, newY: number) => {
    if (!isReshapingContinentRef.current) {
      isReshapingContinentRef.current = true;
      pushHistorySnapshot('Reshape archipelago boundary');
    }
    const baseContName = normalizeArchipelagoBaseName(continentName);
    const formattedContName = formatClusterWithNumber(continentName);
    setCustomContinentShapes(prev => {
      const cont = continents.find(c => 
        c.name === continentName || 
        c.name === formattedContName ||
        normalizeArchipelagoBaseName(c.name) === baseContName
      );
      // Prioritize the active, visible control points of the archipelago currently on screen
      const basePoints = cont?.controlPoints && cont.controlPoints.length >= 3
        ? [...cont.controlPoints]
        : (prev[continentName] || prev[formattedContName] || prev[baseContName] || []);
      const updatedPoints: [number, number][] = [...basePoints];
      if (pointIndex >= 0 && pointIndex < updatedPoints.length) {
        updatedPoints[pointIndex] = [newX, newY];
      }
      const next = { 
        ...prev, 
        [continentName]: updatedPoints,
        [formattedContName]: updatedPoints
      };
      if (cont && cont.name !== continentName) {
        next[cont.name] = updatedPoints;
      }
      customContinentShapesRef.current = next;
      hasUncommittedChangesRef.current = true;
      setHasUncommittedChanges(true);
      return next;
    });
  }, [continents, pushHistorySnapshot]);

  // Add a control vertex along an edge
  const handleAddContinentControlPoint = useCallback((continentName: string, insertIndex: number, x: number, y: number) => {
    pushHistorySnapshot('Add archipelago point');
    const baseContName = normalizeArchipelagoBaseName(continentName);
    const formattedContName = formatClusterWithNumber(continentName);
    setCustomContinentShapes(prev => {
      const cont = continents.find(c => 
        c.name === continentName || 
        c.name === formattedContName ||
        normalizeArchipelagoBaseName(c.name) === baseContName
      );
      const basePoints = cont?.controlPoints && cont.controlPoints.length >= 3
        ? [...cont.controlPoints]
        : (prev[continentName] || prev[formattedContName] || prev[baseContName] || []);
      const updatedPoints: [number, number][] = [...basePoints];
      updatedPoints.splice(insertIndex, 0, [x, y]);
      const next = { 
        ...prev, 
        [continentName]: updatedPoints,
        [formattedContName]: updatedPoints
      };
      if (cont && cont.name !== continentName) {
        next[cont.name] = updatedPoints;
      }
      customContinentShapesRef.current = next;
      saveToLocalStorage(entitiesRef.current, next);
      return next;
    });
  }, [continents, saveToLocalStorage, pushHistorySnapshot]);

  // Delete a control vertex
  const handleDeleteContinentControlPoint = useCallback((continentName: string, pointIndex: number) => {
    pushHistorySnapshot('Delete archipelago point');
    const baseContName = normalizeArchipelagoBaseName(continentName);
    const formattedContName = formatClusterWithNumber(continentName);
    setCustomContinentShapes(prev => {
      const cont = continents.find(c => 
        c.name === continentName || 
        c.name === formattedContName ||
        normalizeArchipelagoBaseName(c.name) === baseContName
      );
      const basePoints = cont?.controlPoints && cont.controlPoints.length >= 3
        ? [...cont.controlPoints]
        : (prev[continentName] || prev[formattedContName] || prev[baseContName] || []);
      if (basePoints.length <= 3) return prev; // Keep at least 3 points
      const updatedPoints = basePoints.filter((_, idx) => idx !== pointIndex);
      const next = { 
        ...prev, 
        [continentName]: updatedPoints,
        [formattedContName]: updatedPoints
      };
      if (cont && cont.name !== continentName) {
        next[cont.name] = updatedPoints;
      }
      customContinentShapesRef.current = next;
      saveToLocalStorage(entitiesRef.current, next);
      return next;
    });
  }, [continents, saveToLocalStorage, pushHistorySnapshot]);

  // Move continent main area: moves both the continent shape and its member entities!
  const handleMoveContinent = useCallback((continentName: string, deltaX: number, deltaY: number) => {
    if (deltaX === 0 && deltaY === 0) return;
    pushHistorySnapshot(`Move archipelago "${continentName}"`);

    const baseContName = normalizeArchipelagoBaseName(continentName);
    const formattedContName = formatClusterWithNumber(continentName);

    // 1. Move continent control points
    let updatedShapes: Record<string, [number, number][]> = customContinentShapesRef.current;
    setCustomContinentShapes(prev => {
      const cont = continents.find(c => 
        c.name === continentName || 
        formatClusterWithNumber(c.name) === continentName || 
        c.name === formattedContName ||
        normalizeArchipelagoBaseName(c.name) === baseContName
      );
      const basePoints = prev[continentName] || 
        (cont ? (prev[cont.name] || prev[formattedContName] || prev[baseContName] || [...cont.controlPoints]) : []);
      if (!basePoints || basePoints.length === 0) return prev;
      const updatedPoints: [number, number][] = basePoints.map(([px, py]) => [
        Math.round(px + deltaX),
        Math.round(py + deltaY)
      ]);
      const next = { ...prev, [continentName]: updatedPoints };
      if (cont && cont.name !== continentName) {
        next[cont.name] = updatedPoints;
      }
      if (formattedContName) next[formattedContName] = updatedPoints;
      if (baseContName) next[baseContName] = updatedPoints;

      customContinentShapesRef.current = next;
      updatedShapes = next;
      try {
        localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Move all member entities belonging primarily to this archipelago
    setEntities(prev => {
      const next = prev.map(ent => {
        if (isEntityDomainElevation(ent)) return ent;
        const entContinent = ent.continent || suggestContinent(ent);
        const isMember = (entContinent === continentName) ||
          (formatClusterWithNumber(entContinent) === continentName) ||
          (entContinent && normalizeArchipelagoBaseName(entContinent) === baseContName) ||
          isEntityPrimaryToArchipelago(ent, continentName);

        if (isMember) {
          return {
            ...ent,
            x: Math.round(ent.x + deltaX),
            y: Math.round(ent.y + deltaY),
            isCustomPosition: true
          };
        }
        return ent;
      });

      entitiesRef.current = next;
      saveToLocalStorage(next, updatedShapes);
      return next;
    });
  }, [continents, pushHistorySnapshot, saveToLocalStorage]);

  // Persist positions when user finishes dragging an archipelago continent or reshaping its border
  const handleContinentMoveEnd = useCallback((continentName: string) => {
    isReshapingContinentRef.current = false;
    setEntities(currentEntities => {
      saveToLocalStorage(currentEntities, customContinentShapesRef.current);
      return currentEntities;
    });
  }, [saveToLocalStorage]);

  // Move multiple selected entities together in edit mode
  const handleMoveEntities = useCallback((ids: string[], deltaX: number, deltaY: number) => {
    if (!ids || ids.length === 0 || (deltaX === 0 && deltaY === 0)) return;
    pushHistorySnapshot(ids.length === 1 ? 'Move initiative' : `Move ${ids.length} initiatives`);

    const idSet = new Set(ids);
    setEntities(prev => {
      return prev.map(ent => {
        if (idSet.has(ent.id)) {
          return {
            ...ent,
            x: Math.round(ent.x + deltaX),
            y: Math.round(ent.y + deltaY),
            isCustomPosition: true
          };
        }
        return ent;
      });
    });

    if (selectedEntity && idSet.has(selectedEntity.id)) {
      setSelectedEntity(prev => prev ? {
        ...prev,
        x: Math.round(prev.x + deltaX),
        y: Math.round(prev.y + deltaY),
        isCustomPosition: true
      } : null);
    }
  }, [selectedEntity, pushHistorySnapshot]);

  // Persist positions when user finishes dragging individual or multiple entities
  const handleNodesDragEnd = useCallback((ids?: string[]) => {
    setEntities(currentEntities => {
      saveToLocalStorage(currentEntities, customContinentShapesRef.current);
      return currentEntities;
    });
  }, [saveToLocalStorage]);

  const handleNodeDragEnd = useCallback((entityId: string) => {
    setEntities(currentEntities => {
      saveToLocalStorage(currentEntities, customContinentShapesRef.current);
      return currentEntities;
    });
  }, [saveToLocalStorage]);

  // Reset continent shape to default auto-hull
  const handleResetContinentShape = useCallback((continentName: string) => {
    pushHistorySnapshot('Reset archipelago shape');
    setCustomContinentShapes(prev => {
      const next = { ...prev };
      delete next[continentName];
      saveToLocalStorage(entitiesRef.current, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Move archipelago label (name & sub-title) freely anywhere on the map
  const handleMoveContinentLabel = useCallback((continentName: string, deltaX: number, deltaY: number) => {
    pushHistorySnapshot('Move archipelago label');
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const existing = prev[continentName] || prev[formatted] || {};
      const currentOffset = existing.labelOffset || { x: 0, y: 0 };
      const nextOffset = {
        x: Math.round(currentOffset.x + deltaX),
        y: Math.round(currentOffset.y + deltaY)
      };
      const next = {
        ...prev,
        [continentName]: { ...existing, labelOffset: nextOffset }
      };
      if (formatted !== continentName) {
        next[formatted] = { ...(prev[formatted] || existing), labelOffset: nextOffset };
      }
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Move archipelago sub-title (number of entities) independently
  const handleMoveContinentSubLabel = useCallback((continentName: string, deltaX: number, deltaY: number) => {
    pushHistorySnapshot('Move archipelago sub-label');
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const existing = prev[continentName] || prev[formatted] || {};
      const baseSub = existing.subLabelOffset || existing.labelOffset || { x: 0, y: 0 };
      const nextOffset = {
        x: Math.round(baseSub.x + deltaX),
        y: Math.round(baseSub.y + deltaY)
      };
      const next = {
        ...prev,
        [continentName]: { ...existing, subLabelOffset: nextOffset }
      };
      if (formatted !== continentName) {
        next[formatted] = { ...(prev[formatted] || existing), subLabelOffset: nextOffset };
      }
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Reset archipelago sub-title (entity count) position back to default under the name
  const handleResetContinentSubLabel = useCallback((continentName: string) => {
    pushHistorySnapshot('Reset archipelago sub-label');
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const next = { ...prev };
      if (next[continentName]) {
        next[continentName] = { ...next[continentName], subLabelOffset: undefined };
      }
      if (next[formatted]) {
        next[formatted] = { ...next[formatted], subLabelOffset: undefined };
      }
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Reset archipelago label position (both name and sub-title) back to default outer rim
  const handleResetContinentLabel = useCallback((continentName: string) => {
    pushHistorySnapshot('Reset archipelago label');
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const next = { ...prev };
      if (next[continentName]) {
        next[continentName] = { ...next[continentName], labelOffset: { x: 0, y: 0 }, subLabelOffset: undefined, labelRotation: 0, subLabelRotation: 0 };
      }
      if (next[formatted]) {
        next[formatted] = { ...next[formatted], labelOffset: { x: 0, y: 0 }, subLabelOffset: undefined, labelRotation: 0, subLabelRotation: 0 };
      }
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Update archipelago title and/or sub-title curvature (0 = straight horizontal line, 0.35 = gentle, 0.7 = natural, 1.0+ = curved)
  const handleUpdateContinentCurvature = useCallback((
    continentName: string,
    titleCurvature?: number,
    subTitleCurvature?: number
  ) => {
    pushHistorySnapshot('Update archipelago curvature');
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const existing = prev[continentName] || prev[formatted] || {};
      const updated: ArchipelagoMeta = {
        ...existing,
        ...(titleCurvature !== undefined ? { titleCurvature } : {}),
        ...(subTitleCurvature !== undefined ? { subTitleCurvature } : {})
      };
      const next = {
        ...prev,
        [continentName]: updated,
        [formatted]: updated
      };
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Update title and sub-title curvature for ALL archipelagos across the entire map
  const handleUpdateAllContinentsCurvature = useCallback((
    titleCurvature: number,
    subTitleCurvature?: number
  ) => {
    pushHistorySnapshot('Update all archipelagos curvature');
    setArchipelagoMetadata(prev => {
      const next = { ...prev };
      const subCurv = subTitleCurvature !== undefined ? subTitleCurvature : titleCurvature;

      // Update global default
      next['__global__'] = {
        titleCurvature,
        subTitleCurvature: subCurv
      };

      // Also explicitly update any known archipelagos
      continents.forEach(cont => {
        const formatted = formatClusterWithNumber(cont.name);
        const existing = next[cont.name] || next[formatted] || {};
        const updated: ArchipelagoMeta = {
          ...existing,
          titleCurvature,
          subTitleCurvature: subCurv
        };
        next[cont.name] = updated;
        next[formatted] = updated;
      });

      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [continents, saveToLocalStorage, pushHistorySnapshot]);

  // Reset archipelago curvature to default
  const handleResetContinentCurvature = useCallback((continentName: string) => {
    pushHistorySnapshot('Reset archipelago curvature');
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const next = { ...prev };
      if (next[continentName]) {
        const copy = { ...next[continentName] };
        delete copy.titleCurvature;
        delete copy.subTitleCurvature;
        next[continentName] = copy;
      }
      if (next[formatted]) {
        const copy = { ...next[formatted] };
        delete copy.titleCurvature;
        delete copy.subTitleCurvature;
        next[formatted] = copy;
      }
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Rotate archipelago title and/or sub-title freely (degrees from -180 to 180 or 0 to 360)
  const handleRotateContinentLabel = useCallback((
    continentName: string,
    rotation: number,
    isSubLabel = false,
    linkBoth = false
  ) => {
    pushHistorySnapshot(isSubLabel ? 'Rotate archipelago sub-title' : 'Rotate archipelago title');
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const existing = prev[continentName] || prev[formatted] || {};
      const updated: ArchipelagoMeta = {
        ...existing,
        ...(linkBoth
          ? { labelRotation: rotation, subLabelRotation: rotation }
          : isSubLabel
          ? { subLabelRotation: rotation }
          : { labelRotation: rotation })
      };
      const next = {
        ...prev,
        [continentName]: updated,
        [formatted]: updated
      };
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Reset archipelago title and sub-title rotation to 0 degrees
  const handleResetContinentRotation = useCallback((continentName: string) => {
    pushHistorySnapshot('Reset archipelago rotation');
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const next = { ...prev };
      if (next[continentName]) {
        const copy = { ...next[continentName] };
        delete copy.labelRotation;
        delete copy.subLabelRotation;
        next[continentName] = copy;
      }
      if (next[formatted]) {
        const copy = { ...next[formatted] };
        delete copy.labelRotation;
        delete copy.subLabelRotation;
        next[formatted] = copy;
      }
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, next);
      return next;
    });
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Scale archipelago boundary freely (e.g. shrink or expand)
  const handleScaleContinent = useCallback((continentName: string, factor: number) => {
    pushHistorySnapshot('Scale archipelago boundary');
    const baseContName = normalizeArchipelagoBaseName(continentName);
    const formattedContName = formatClusterWithNumber(continentName);
    setCustomContinentShapes(prev => {
      const cont = continents.find(c => 
        c.name === continentName || 
        c.name === formattedContName || 
        normalizeArchipelagoBaseName(c.name) === baseContName
      );
      const basePoints = cont?.controlPoints && cont.controlPoints.length >= 3
        ? [...cont.controlPoints]
        : (prev[continentName] || prev[formattedContName] || prev[baseContName] || []);
      if (!basePoints || basePoints.length === 0) return prev;

      const cx = cont ? cont.centerX : Math.round(basePoints.reduce((s, p) => s + p[0], 0) / basePoints.length);
      const cy = cont ? cont.centerY : Math.round(basePoints.reduce((s, p) => s + p[1], 0) / basePoints.length);

      const updatedPoints: [number, number][] = basePoints.map(([px, py]) => [
        Math.round(cx + (px - cx) * factor),
        Math.round(cy + (py - cy) * factor)
      ]);

      const next = { 
        ...prev, 
        [continentName]: updatedPoints,
        [formattedContName]: updatedPoints
      };
      if (cont && cont.name !== continentName) {
        next[cont.name] = updatedPoints;
      }
      customContinentShapesRef.current = next;
      try {
        localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, next);
      return next;
    });
  }, [continents, saveToLocalStorage, pushHistorySnapshot]);

  // Fit archipelago boundary tightly around member entities
  const handleFitContinentTightly = useCallback((continentName: string) => {
    pushHistorySnapshot('Fit archipelago tightly');
    const baseContName = normalizeArchipelagoBaseName(continentName);
    const formattedContName = formatClusterWithNumber(continentName);
    const memberEntities = entities.filter(e => 
      !isEntityDomainElevation(e) && (
        entityMatchesArchipelago(e, continentName) ||
        (e.continent && normalizeArchipelagoBaseName(e.continent) === baseContName) ||
        (e.continent && formatClusterWithNumber(e.continent) === formattedContName)
      )
    );
    if (memberEntities.length === 0) return;

    const tightPoints = fitContinentTightlyAroundEntities(memberEntities, 32);
    if (tightPoints.length >= 3) {
      setCustomContinentShapes(prev => {
        const cont = continents.find(c => 
          c.name === continentName || 
          c.name === formattedContName ||
          normalizeArchipelagoBaseName(c.name) === baseContName
        );
        const next = { 
          ...prev, 
          [continentName]: tightPoints,
          [formattedContName]: tightPoints
        };
        if (cont && cont.name !== continentName) {
          next[cont.name] = tightPoints;
        }
        customContinentShapesRef.current = next;
        try {
          localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        saveToLocalStorage(entitiesRef.current, next);
        return next;
      });
    }
  }, [entities, continents, saveToLocalStorage, pushHistorySnapshot]);

  // Track previous map focus/state to support reverting when clicking "center the map again"
  const [previousViewport, setPreviousViewport] = useState<MapViewport | null>(null);
  const [centeredEntityId, setCenteredEntityId] = useState<string | null>(null);

  // Focus Mode state (toggled via "Focus on Map" to isolate entity + connected network)
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null);

  // Toggle "Focus on Map" mode: highlights connections and hides everything else
  const handleToggleFocusEntity = useCallback((entity: EcosystemEntity) => {
    setFocusedEntityId(prev => {
      if (prev === entity.id) {
        // Toggle OFF
        return null;
      } else {
        // Toggle ON: focus on entity and frame viewport
        const targetX = -entity.x * 1.0;
        const targetY = -entity.y * 1.0;
        setViewport({
          x: targetX,
          y: targetY,
          zoom: 1.0
        });
        setLeftSidebarCollapsed(true);
        return entity.id;
      }
    });
  }, []);

  // Center camera viewport on entity, or revert to previous map state if already centered
  const centerOnEntity = useCallback((entity: EcosystemEntity) => {
    const targetX = -entity.x * 1.2;
    const targetY = -entity.y * 1.2;
    const targetZoom = 1.2;

    const isAlreadyCentered = Boolean(
      centeredEntityId === entity.id &&
      previousViewport &&
      Math.abs(viewport.x - targetX) < 2 &&
      Math.abs(viewport.y - targetY) < 2 &&
      Math.abs(viewport.zoom - targetZoom) < 0.02
    );

    if (isAlreadyCentered && previousViewport) {
      // Revert to previous map focus/state
      setViewport(previousViewport);
      setCenteredEntityId(null);
    } else {
      // Save current map state and center on entity
      setPreviousViewport(viewport);
      setCenteredEntityId(entity.id);
      setSelectedEntity(entity);
      setLeftSidebarCollapsed(true);
      setViewport({
        x: targetX,
        y: targetY,
        zoom: targetZoom
      });
    }
  }, [viewport, previousViewport, centeredEntityId]);

  // Handle selecting an entity from map clicks (auto-collapses left sidebar if open)
  const handleSelectEntityFromMap = useCallback((entity: EcosystemEntity | null) => {
    setSelectedEntity(entity);
    if (entity) {
      setLeftSidebarCollapsed(true);
    }
  }, []);

  const isEntityCentered = useMemo(() => {
    if (!selectedEntity) return false;
    const targetX = -selectedEntity.x * 1.2;
    const targetY = -selectedEntity.y * 1.2;
    const targetZoom = 1.2;
    return Boolean(
      centeredEntityId === selectedEntity.id &&
      previousViewport &&
      Math.abs(viewport.x - targetX) < 2 &&
      Math.abs(viewport.y - targetY) < 2 &&
      Math.abs(viewport.zoom - targetZoom) < 0.02
    );
  }, [selectedEntity, viewport, previousViewport, centeredEntityId]);

  // Fly camera to continent
  const handleFlyToContinent = useCallback((continent: ContinentInfo) => {
    setViewport({
      x: -continent.centerX * 0.74,
      y: -continent.centerY * 0.74,
      zoom: 0.74
    });
  }, []);

  // Dynamic active quadrant sizes for current layer
  const activeQuadrantSizes = useMemo(() => {
    return getQuadrantSizesForLayer(filterState.activeLayer ?? 1, layerQuadrantSizes);
  }, [filterState.activeLayer, layerQuadrantSizes]);

  // Handler to update quadrant sizes for active layer or specified layer
  const handleUpdateQuadrantSizes = useCallback((newSizes: LayerQuadrantSizes, targetLayer?: 1 | 2 | 3 | 'all') => {
    pushHistorySnapshot('Resize quadrant dimensions');
    const layerKey = String(targetLayer ?? filterState.activeLayer ?? 1);
    setLayerQuadrantSizes(prev => {
      const next: LayerQuadrantConfig = {
        ...prev,
        [layerKey]: newSizes
      };
      try {
        localStorage.setItem(LAYER_QUADRANTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      saveToLocalStorage(entitiesRef.current, customContinentShapesRef.current, false, archipelagoMetadataRef.current, next);
      return next;
    });
  }, [filterState.activeLayer, saveToLocalStorage, pushHistorySnapshot]);

  const handleResetQuadrantSizes = useCallback((layer?: 1 | 2 | 3 | 'all') => {
    const layerKey = String(layer ?? filterState.activeLayer ?? 1);
    const defaultSizes = DEFAULT_LAYER_QUADRANT_SIZES[layerKey] || DEFAULT_LAYER_QUADRANT_SIZES['1'];
    handleUpdateQuadrantSizes(defaultSizes, layer);
  }, [filterState.activeLayer, handleUpdateQuadrantSizes]);

  const handleAutoFitQuadrantSizes = useCallback((layer?: 1 | 2 | 3 | 'all') => {
    const currentLayer = layer ?? filterState.activeLayer ?? 1;
    const fitted = calculateAutoFitQuadrantSizes(entities, currentLayer);
    handleUpdateQuadrantSizes(fitted, currentLayer);
  }, [entities, filterState.activeLayer, handleUpdateQuadrantSizes]);

  // Fly camera to quadrant center calculated with attributed layer quadrant sizes
  const handleFlyToQuadrant = useCallback((category: CategoryQuadrant) => {
    const currentSizes = getQuadrantSizesForLayer(filterState.activeLayer ?? 1, layerQuadrantSizes);
    const qDim = currentSizes[category] || { width: 950, height: 950 };
    const qCenterX = (category === 'Inner' || category === 'Cultural') ? -qDim.width / 2 : qDim.width / 2;
    const qCenterY = (category === 'Inner' || category === 'Social') ? -qDim.height / 2 : qDim.height / 2;
    setViewport({
      x: -qCenterX * 0.45,
      y: -qCenterY * 0.45,
      zoom: 0.45
    });
  }, [filterState.activeLayer, layerQuadrantSizes]);

  // Fly camera to field cluster / tag center
  const handleFlyToFieldCluster = useCallback((fc: { name: string; category?: CategoryQuadrant }) => {
    const cluster = fieldClusters.find(c => c.name.toLowerCase() === fc.name.toLowerCase() && (!fc.category || c.category === fc.category)) 
      || fieldClusters.find(c => c.name.toLowerCase() === fc.name.toLowerCase());
    if (cluster) {
      setViewport({
        x: -cluster.centerX * 1.15,
        y: -cluster.centerY * 1.15,
        zoom: 1.15
      });
      return;
    }
    const matching = entities.filter(e => e.fields.some(f => f.toLowerCase() === fc.name.toLowerCase()));
    if (matching.length > 0) {
      const avgX = matching.reduce((sum, e) => sum + e.x, 0) / matching.length;
      const avgY = matching.reduce((sum, e) => sum + e.y, 0) / matching.length;
      setViewport({
        x: -avgX * 1.15,
        y: -avgY * 1.15,
        zoom: 1.15
      });
    }
  }, [fieldClusters, entities]);

  // Clear non-continent list snapshot selection when entering edit mode (preserve archipelago selection)
  useEffect(() => {
    if (editMode) {
      if (activeListScope && activeListScope.type !== 'continent') {
        setActiveListScope(null);
      }
    }
  }, [editMode, activeListScope]);

  // Select continent to show snapshot list & details
  const handleSelectContinent = useCallback((continentName: string | null, keepSidebarOpen?: boolean) => {
    if (continentName === null || continentName === selectedContinentName || (activeListScope?.type === 'continent' && activeListScope.name === continentName)) {
      setSelectedContinentName(null);
      setActiveListScope(null);
      // Automatically open left sidebar back when leaving archipelago focus view
      if (!keepSidebarOpen) {
        setLeftSidebarCollapsed(leftSidebarBeforeFocusRef.current !== undefined ? leftSidebarBeforeFocusRef.current : false);
      }
      if (previousViewport) {
        setViewport(previousViewport);
        setPreviousViewport(null);
      }
      return;
    }

    if (!previousViewport) {
      setPreviousViewport(viewport);
    }

    // Only minimize left sidebar when not explicitly instructed to keep it open (e.g. from LeftSidebar)
    if (!keepSidebarOpen) {
      if (!selectedContinentName) {
        leftSidebarBeforeFocusRef.current = leftSidebarCollapsed;
      }
      setLeftSidebarCollapsed(true);
    }

    setSelectedContinentName(continentName);
    setSelectedEntity(null);
    setActiveListScope({ type: 'continent', name: continentName });

    const targetCont = continents.find(c => 
      c.name === continentName || 
      formatClusterWithNumber(c.name).toLowerCase() === continentName.toLowerCase() ||
      normalizeArchipelagoBaseName(c.name) === normalizeArchipelagoBaseName(continentName)
    ) || baseContinents.find(c => 
      c.name === continentName || 
      formatClusterWithNumber(c.name).toLowerCase() === continentName.toLowerCase() ||
      normalizeArchipelagoBaseName(c.name) === normalizeArchipelagoBaseName(continentName)
    );

    if (targetCont) {
      const targetZoom = 0.74; // Zoom level set to 74% when focusing on an archipelago
      setViewport({
        x: -targetCont.centerX * targetZoom,
        y: -targetCont.centerY * targetZoom,
        zoom: targetZoom
      });
    }
  }, [selectedContinentName, activeListScope, previousViewport, viewport, continents, baseContinents, leftSidebarCollapsed, entities]);

  // Update which quadrant an archipelago belongs to
  const handleUpdateContinentQuadrant = useCallback((continentName: string, newQuadrant: CategoryQuadrant) => {
    const cont = continents.find(c => 
      c.name === continentName || 
      formatClusterWithNumber(c.name).toLowerCase() === formatClusterWithNumber(continentName).toLowerCase() ||
      normalizeArchipelagoBaseName(c.name) === normalizeArchipelagoBaseName(continentName) ||
      c.name.toLowerCase() === continentName.toLowerCase()
    );
    const oldQuadrant = cont?.category || 'Inner';
    if (oldQuadrant === newQuadrant) return;

    // Translation delta so members & shapes move to the new quadrant's territory
    const deltaX = QUADRANT_CENTERS[newQuadrant].x - QUADRANT_CENTERS[oldQuadrant].x;
    const deltaY = QUADRANT_CENTERS[newQuadrant].y - QUADRANT_CENTERS[oldQuadrant].y;

    const formatted = formatClusterWithNumber(continentName);
    const baseName = normalizeArchipelagoBaseName(continentName);

    // Persist quadrant override in metadata
    let nextMeta: Record<string, ArchipelagoMeta> = {};
    setArchipelagoMetadata(prev => {
      const next = {
        ...prev,
        [continentName]: { ...(prev[continentName] || {}), quadrant: newQuadrant },
        [formatted]: { ...(prev[formatted] || {}), quadrant: newQuadrant }
      };
      if (cont && cont.name !== continentName) {
        next[cont.name] = { ...(prev[cont.name] || {}), quadrant: newQuadrant };
      }
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      nextMeta = next;
      archipelagoMetadataRef.current = next;
      return next;
    });

    // Shift custom shapes if present
    let nextShapes: Record<string, [number, number][]> | null = null;
    setCustomContinentShapes(prev => {
      const base = prev[continentName] || (cont ? prev[cont.name] : null);
      if (!base || base.length === 0) return prev;
      const shifted: [number, number][] = base.map(([px, py]) => [Math.round(px + deltaX), Math.round(py + deltaY)]);
      const next = { ...prev, [continentName]: shifted, [formatted]: shifted };
      if (cont && cont.name !== continentName) {
        next[cont.name] = shifted;
      }
      try {
        localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      nextShapes = next;
      customContinentShapesRef.current = next;
      return next;
    });

    // Update all member entities
    setEntities(prev => {
      const updated = prev.map(ent => {
        const entCont = ent.continent || suggestContinent(ent);
        const isMember = (entCont === continentName) ||
          (formatClusterWithNumber(entCont) === formatClusterWithNumber(continentName)) ||
          (normalizeArchipelagoBaseName(entCont) === baseName) ||
          entityMatchesArchipelago(ent, continentName);

        if (!isMember) return ent;

        const catFields = ent.categorizedFields ? { ...ent.categorizedFields } : {};
        if (catFields['Overview']) {
          catFields['Overview'] = {
            ...catFields['Overview'],
            'Quadrant': newQuadrant,
            'Category': newQuadrant
          };
        }
        const extFields = ent.extraFields ? { ...ent.extraFields } : {};
        extFields['Quadrant'] = newQuadrant;
        extFields['Category'] = newQuadrant;

        return {
          ...ent,
          category: newQuadrant,
          quadrant: newQuadrant,
          spreadsheetCategory: newQuadrant,
          x: Math.round(ent.x + deltaX),
          y: Math.round(ent.y + deltaY),
          isCustomPosition: true,
          categorizedFields: Object.keys(catFields).length > 0 ? catFields : ent.categorizedFields,
          extraFields: Object.keys(extFields).length > 0 ? extFields : ent.extraFields
        };
      });

      hasUncommittedChangesRef.current = true;
      setHasUncommittedChanges(true);
      saveToLocalStorage(updated, nextShapes || customContinentShapesRef.current, false, nextMeta);
      return updated;
    });
  }, [continents, saveToLocalStorage]);

  // Rename an archipelago
  const handleRenameContinent = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;

    // Update archipelago metadata key
    setArchipelagoMetadata(prev => {
      const meta = prev[oldName] || (prev[formatClusterWithNumber(oldName)] || {});
      const next = { ...prev, [trimmed]: meta };
      delete next[oldName];
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Update customContinentShapes key
    setCustomContinentShapes(prev => {
      const points = prev[oldName];
      if (!points) return prev;
      const next = { ...prev, [trimmed]: points };
      delete next[oldName];
      try {
        localStorage.setItem(CONTINENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Update member entities
    setEntities(prev => {
      const updated = prev.map(ent => {
        const entCont = ent.continent || suggestContinent(ent);
        const isMember = (entCont === oldName) ||
          (formatClusterWithNumber(entCont) === formatClusterWithNumber(oldName)) ||
          entityMatchesArchipelago(ent, oldName);

        if (!isMember) return ent;

        let nextContinent = ent.continent;
        if (ent.continent === oldName || formatClusterWithNumber(ent.continent || '') === formatClusterWithNumber(oldName)) {
          nextContinent = trimmed;
        }

        let nextOthers = ent.otherArchipelagos;
        if (nextOthers && nextOthers.length > 0) {
          nextOthers = nextOthers.map(o => (o === oldName || formatClusterWithNumber(o) === formatClusterWithNumber(oldName)) ? trimmed : o);
        }

        const catFields = ent.categorizedFields ? { ...ent.categorizedFields } : {};
        if (catFields['Overview']) {
          catFields['Overview'] = {
            ...catFields['Overview'],
            'Archipelago': nextContinent,
            'Island/Cluster': nextContinent
          };
        }
        const extFields = ent.extraFields ? { ...ent.extraFields } : {};
        extFields['Archipelago'] = nextContinent;
        extFields['Island/Cluster'] = nextContinent;

        return {
          ...ent,
          continent: nextContinent,
          otherArchipelagos: nextOthers,
          categorizedFields: Object.keys(catFields).length > 0 ? catFields : ent.categorizedFields,
          extraFields: Object.keys(extFields).length > 0 ? extFields : ent.extraFields
        };
      });

      saveToLocalStorage(updated);
      return updated;
    });

    setSelectedContinentName(trimmed);
    setActiveListScope({ type: 'continent', name: trimmed });
  }, [saveToLocalStorage]);

  // Add an entity to an archipelago
  const handleAddEntityToContinent = useCallback((continentName: string, entityId: string) => {
    const cont = continents.find(c => 
      c.name === continentName || 
      formatClusterWithNumber(c.name).toLowerCase() === formatClusterWithNumber(continentName).toLowerCase() ||
      c.name.toLowerCase() === continentName.toLowerCase()
    );
    const targetQuadrant = cont?.category || 'Inner';

    setEntities(prev => {
      const ent = prev.find(e => e.id === entityId);
      if (!ent) return prev;

      // Position near the archipelago center
      const cX = cont ? cont.centerX : QUADRANT_CENTERS[targetQuadrant].x;
      const cY = cont ? cont.centerY : QUADRANT_CENTERS[targetQuadrant].y;
      const jitterAngle = Math.random() * Math.PI * 2;
      const jitterDist = 50 + Math.random() * 70;
      const newX = Math.round(cX + Math.cos(jitterAngle) * jitterDist);
      const newY = Math.round(cY + Math.sin(jitterAngle) * jitterDist);

      const catFields = ent.categorizedFields ? { ...ent.categorizedFields } : {};
      if (catFields['Overview']) {
        catFields['Overview'] = {
          ...catFields['Overview'],
          'Archipelago': continentName,
          'Island/Cluster': continentName,
          'Quadrant': targetQuadrant,
          'Category': targetQuadrant
        };
      }
      const extFields = ent.extraFields ? { ...ent.extraFields } : {};
      extFields['Archipelago'] = continentName;
      extFields['Island/Cluster'] = continentName;
      extFields['Quadrant'] = targetQuadrant;
      extFields['Category'] = targetQuadrant;

      const updated = prev.map(e => {
        if (e.id !== entityId) return e;
        return {
          ...e,
          continent: continentName,
          category: targetQuadrant,
          quadrant: targetQuadrant,
          spreadsheetCategory: targetQuadrant,
          x: newX,
          y: newY,
          isCustomPosition: true,
          categorizedFields: Object.keys(catFields).length > 0 ? catFields : e.categorizedFields,
          extraFields: Object.keys(extFields).length > 0 ? extFields : e.extraFields
        };
      });

      saveToLocalStorage(updated);
      return updated;
    });
  }, [continents, saveToLocalStorage]);

  // Remove an entity from an archipelago
  const handleRemoveEntityFromContinent = useCallback((continentName: string, entityId: string) => {
    setEntities(prev => {
      const ent = prev.find(e => e.id === entityId);
      if (!ent) return prev;

      const isPrimary = (ent.continent === continentName) ||
        (formatClusterWithNumber(ent.continent || '') === formatClusterWithNumber(continentName));

      let nextContinent = ent.continent;
      if (isPrimary) {
        nextContinent = undefined;
      }

      let nextOthers = ent.otherArchipelagos;
      if (nextOthers) {
        nextOthers = nextOthers.filter(o => 
          o !== continentName && 
          formatClusterWithNumber(o) !== formatClusterWithNumber(continentName)
        );
      }

      const catFields = ent.categorizedFields ? { ...ent.categorizedFields } : {};
      if (catFields['Overview'] && isPrimary) {
        catFields['Overview'] = {
          ...catFields['Overview'],
          'Archipelago': (nextOthers && nextOthers.length > 0) ? nextOthers[0] : '',
          'Island/Cluster': (nextOthers && nextOthers.length > 0) ? nextOthers[0] : ''
        };
      }
      const extFields = ent.extraFields ? { ...ent.extraFields } : {};
      if (isPrimary) {
        extFields['Archipelago'] = (nextOthers && nextOthers.length > 0) ? nextOthers[0] : '';
        extFields['Island/Cluster'] = (nextOthers && nextOthers.length > 0) ? nextOthers[0] : '';
      }

      const updated = prev.map(e => {
        if (e.id !== entityId) return e;
        return {
          ...e,
          continent: nextContinent,
          otherArchipelagos: nextOthers,
          categorizedFields: Object.keys(catFields).length > 0 ? catFields : e.categorizedFields,
          extraFields: Object.keys(extFields).length > 0 ? extFields : e.extraFields
        };
      });

      saveToLocalStorage(updated);
      return updated;
    });
  }, [saveToLocalStorage]);

  // Update archipelago description / notes
  const handleUpdateContinentDescription = useCallback((continentName: string, description: string) => {
    setArchipelagoMetadata(prev => {
      const formatted = formatClusterWithNumber(continentName);
      const next = {
        ...prev,
        [continentName]: { ...(prev[continentName] || {}), description },
        [formatted]: { ...(prev[formatted] || {}), description }
      };
      try {
        localStorage.setItem(ARCHIPELAGO_METADATA_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Select entity type list (Header badge click)
  const handleSelectEntityTypeList = useCallback((entityType: EntityType | 'All') => {
    if (editMode) return;
    setSelectedEntity(null);
    setSelectedContinentName(null);
    setActiveListScope(prev => {
      if (prev?.type === 'entityType' && prev.entityType === entityType) {
        return null;
      }
      return { type: 'entityType', entityType };
    });
  }, [editMode]);

  // Select quadrant category list (Left sidebar quadrant click or type breakdown click)
  const handleSelectCategoryList = useCallback((category: CategoryQuadrant, entityType?: EntityType) => {
    if (editMode) return;
    setSelectedEntity(null);
    setSelectedContinentName(null);
    setActiveListScope(prev => {
      if (prev?.type === 'category' && prev.category === category && prev.entityType === entityType) {
        return null;
      }
      return { type: 'category', category, entityType };
    });
  }, [editMode]);

  // Select relationship list (Right sidebar entity relationship click or left sidebar filter selection)
  const handleSelectRelationshipList = useCallback((relationship: string, entityType?: EntityType) => {
    if (editMode) return;
    const relTrimmed = relationship.trim();
    setSelectedEntity(null);
    setSelectedContinentName(null);
    setActiveListScope(prev => {
      if (prev?.type === 'relationship' && prev.relationship.toLowerCase().trim() === relTrimmed.toLowerCase().trim() && prev.entityType === entityType) {
        setFilterState(fPrev => ({
          ...fPrev,
          selectedOurRelationships: [],
          selectedOurRelationship: 'All'
        }));
        return null;
      }
      return { type: 'relationship', relationship: relTrimmed, entityType };
    });
    setFilterState(prev => ({
      ...prev,
      selectedOurRelationships: [relTrimmed],
      selectedOurRelationship: relTrimmed
    }));
  }, [editMode]);

  // Select tag/facet list (Left sidebar tag click or entity tag/approach/issue/activity click)
  const handleSelectTagList = useCallback((tag: string, category?: CategoryQuadrant, facetType: 'tag' | 'approach' | 'issues' | 'activities' = 'tag') => {
    if (editMode) return;
    setSelectedEntity(null);
    setSelectedContinentName(null);
    setActiveListScope(prev => {
      const tagLower = tag.toLowerCase().trim();
      if (facetType === 'tag') {
        if (prev?.type === 'tag' && prev.tag.toLowerCase().trim() === tagLower) return null;
        return { type: 'tag', tag, category };
      } else if (facetType === 'approach') {
        if (prev?.type === 'approach' && prev.approach.toLowerCase().trim() === tagLower) return null;
        return { type: 'approach', approach: tag, category };
      } else if (facetType === 'issues') {
        if (prev?.type === 'issues' && prev.issue.toLowerCase().trim() === tagLower) return null;
        return { type: 'issues', issue: tag, category };
      } else if (facetType === 'activities') {
        if (prev?.type === 'activities' && prev.activity.toLowerCase().trim() === tagLower) return null;
        return { type: 'activities', activity: tag, category };
      }
      return { type: 'tag', tag, category };
    });
  }, [editMode]);

  // Save current entity positions long-term to localStorage and Firestore
  const handleSavePositions = useCallback(async () => {
    saveToLocalStorage(entities, customContinentShapes, true);
  }, [entities, customContinentShapes, saveToLocalStorage]);

  // Auto-arrange to guarantee anti-overlap clearance
  const handleAutoArrange = useCallback(() => {
    setEntities(prev => {
      const clusterPoints = fieldClusters.map(c => ({ x: c.centerX, y: c.centerY }));
      const refreshed = resolveEntityOverlaps(prev, clusterPoints);
      saveToLocalStorage(refreshed);
      return refreshed;
    });
  }, [fieldClusters, saveToLocalStorage]);

  // Recalculate archipelago layout across all active entities into clean, separated quadrants
  const handleRecalculateLayout = useCallback((resetCustomPositions = true) => {
    pushHistorySnapshot('Recalculate layout');
    if (resetCustomPositions) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}
    }
    setEntities(prev => {
      const { entities: refreshed } = recalculateArchipelagoLayout(prev, { resetCustomPositions });
      saveToLocalStorage(refreshed);
      return refreshed;
    });
    setCustomContinentShapes({});
    try {
      localStorage.removeItem(CONTINENTS_STORAGE_KEY);
    } catch {}
  }, [saveToLocalStorage, pushHistorySnapshot]);

  // Reset positions to cluster auto-layout
  const handleResetLayout = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(CONTINENTS_STORAGE_KEY);
    localStorage.removeItem(FULL_DATASET_STORAGE_KEY);
    setCustomContinentShapes({});
    const uniqueInitial = ensureUniqueEntityIds(INITIAL_ENTITIES);
    const { entities: fresh } = recalculateArchipelagoLayout(uniqueInitial, { resetCustomPositions: true });
    setEntities(ensureUniqueEntityIds(fresh));
  }, []);

  // Handle Smart Sync from uploaded spreadsheet
  const handleApplySync = useCallback((
    updatedDataset: EcosystemEntity[],
    result: SyncResult,
    columnComments?: Record<string, string>
  ) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metta_has_synced_spreadsheet', 'true');
    }
    if (columnComments && Object.keys(columnComments).length > 0) {
      registerColumnComments(columnComments);
    }

    // Extract quadrant overrides from metadata
    const overrides: Record<string, CategoryQuadrant> = {};
    if (archipelagoMetadataRef.current && typeof archipelagoMetadataRef.current === 'object') {
      Object.entries(archipelagoMetadataRef.current).forEach(([name, meta]: [string, any]) => {
        if (meta?.quadrant) {
          overrides[name] = meta.quadrant;
          overrides[formatClusterWithNumber(name)] = meta.quadrant;
          overrides[normalizeArchipelagoBaseName(name)] = meta.quadrant;
        }
      });
    }

    // Sanitize dataset and lock any entity with existing coordinates so positions NEVER change
    const unique = ensureUniqueEntityIds(updatedDataset);
    const sanitized = unique.map(ent => {
      const clean = sanitizeEntitySocialProfiles(ent);
      const hasCoords = typeof clean.x === 'number' && typeof clean.y === 'number' && (clean.x !== 0 || clean.y !== 0) && Number.isFinite(clean.x) && Number.isFinite(clean.y);
      return {
        ...clean,
        isCustomPosition: hasCoords ? true : clean.isCustomPosition
      };
    });

    // Only compute coordinates for brand-new entities that do not have coordinates yet
    const { entities: positioned } = calculateEntityLayout(sanitized, {
      forceRecalculate: false,
      archipelagoQuadrantOverrides: overrides
    });
    const uniqueFinal = ensureUniqueEntityIds(positioned);
    setEntities(uniqueFinal);
    entitiesRef.current = uniqueFinal;

    // Preserve all existing custom archipelago shapes, metadata, and quadrant sizes
    const currentShapes = customContinentShapesRef.current || {};
    const currentMeta = archipelagoMetadataRef.current || {};
    const currentQuadrants = layerQuadrantSizesRef.current;

    // Save full dataset & positions without wiping shapes
    saveToLocalStorage(uniqueFinal, currentShapes, true, currentMeta, currentQuadrants);

    // Persist to Firestore cloud database with preserved shapes and comments
    persistPublishedDatasetToFirestore(
      uniqueFinal,
      currentShapes,
      currentMeta,
      columnComments || getAllColumnComments(),
      currentQuadrants
    ).catch(e => {
      console.warn('Failed to persist synced dataset to Firestore:', e);
    });

    if (result.mode === 'replace') {
      const removedCount = result.removed?.length || 0;
      setSyncSuccessToast({
        title: 'Ecosystem Data Updated Successfully',
        details: [
          `${result.totalNew} total entities on map`,
          `${result.updated.length} entries matched & updated`,
          `${removedCount > 0 ? `${removedCount} previous entries replaced` : 'Map active nodes synchronized'}`,
          `${result.preservedCoordinatesCount} initiative coordinates preserved with 0 changes`
        ]
      });
    } else {
      setSyncSuccessToast({
        title: 'Data Added to Ecosystem Successfully',
        details: [
          `Added +${result.added.length} new entities`,
          `${result.updated.length} matching entries updated`,
          `Total active nodes on map: ${result.totalNew}`,
          `${result.preservedCoordinatesCount} existing initiative coordinates preserved`
        ]
      });
    }
    setTimeout(() => {
      setSyncSuccessToast(null);
    }, 6000);
  }, [saveToLocalStorage]);

  // Export dataset to chosen format (.xlsx, .csv, .json)
  const handleExportData = (format: ExportFormat = 'xlsx') => {
    exportEntities(entities, format, `metta_ecosystem_map_${new Date().toISOString().slice(0, 10)}`);
  };

  // Apply a position snapshot (import JSON coordinates and archipelago shapes)
  const handleApplySnapshot = useCallback((
    updatedEntities: EcosystemEntity[],
    updatedShapes?: Record<string, [number, number][]>,
    updatedMeta?: Record<string, ArchipelagoMeta>,
    updatedQuadrants?: LayerQuadrantConfig,
    commitToCloudImmediately = false
  ) => {
    // Ensure all entities with valid coordinates have isCustomPosition: true locked in place
    const lockedEntities = updatedEntities.map(e => ({
      ...e,
      isCustomPosition: (typeof e.x === 'number' && typeof e.y === 'number' && (e.x !== 0 || e.y !== 0)) ? true : e.isCustomPosition
    }));
    const uniqueLocked = ensureUniqueEntityIds(lockedEntities);

    setEntities(uniqueLocked);
    entitiesRef.current = uniqueLocked;

    const shapesToApply = updatedShapes || customContinentShapesRef.current;
    if (shapesToApply && Object.keys(shapesToApply).length > 0) {
      setCustomContinentShapes(shapesToApply);
      customContinentShapesRef.current = shapesToApply;
    }

    const metaToApply = updatedMeta || archipelagoMetadataRef.current;
    if (metaToApply && Object.keys(metaToApply).length > 0) {
      setArchipelagoMetadata(metaToApply);
      archipelagoMetadataRef.current = metaToApply;
    }

    const quadrantsToApply = updatedQuadrants || layerQuadrantSizesRef.current;
    if (quadrantsToApply) {
      setLayerQuadrantSizes(quadrantsToApply);
      layerQuadrantSizesRef.current = quadrantsToApply;
    }

    // Update committed baseline snapshot
    if (commitToCloudImmediately) {
      committedSnapshotRef.current = {
        entities: JSON.parse(JSON.stringify(uniqueLocked)),
        customContinentShapes: JSON.parse(JSON.stringify(shapesToApply || {})),
        archipelagoMetadata: JSON.parse(JSON.stringify(metaToApply || {})),
        layerQuadrantSizes: JSON.parse(JSON.stringify(quadrantsToApply || {}))
      };
      try {
        localStorage.setItem(COMMITTED_BASELINE_KEY, JSON.stringify(committedSnapshotRef.current));
      } catch {}
    }

    saveToLocalStorage(
      uniqueLocked,
      shapesToApply,
      commitToCloudImmediately,
      metaToApply,
      quadrantsToApply
    );
  }, [saveToLocalStorage]);

  if (currentView === 'directory') {
    return (
      <DirectoryView
        entities={entities}
        continents={continents}
        filterState={filterState}
        setFilterState={setFilterState}
        onBackToMap={() => setCurrentView('map')}
        selectedEntity={selectedEntity}
        onCloseEntity={() => setSelectedEntity(null)}
        onSelectEntity={(entity) => {
          setSelectedEntity(entity);
        }}
        onLocateOnMap={(entity) => {
          setSelectedEntity(entity);
          setCurrentView('map');
          centerOnEntity(entity);
        }}
        editMode={editMode}
        onUpdateEntity={handleUpdateEntity}
        onUpdateEntityNotes={handleUpdateNotes}
        onUpdateEntityCoordinates={handleUpdateEntityCoordinates}
        onAddCommunityNote={handleAddCommunityNote}
        onDeleteCommunityNote={handleDeleteCommunityNote}
        onSelectContinent={(name) => {
          handleSelectContinent(name);
          setCurrentView('map');
        }}
        onSelectCategoryList={(cat, entType) => {
          handleSelectCategoryList(cat, entType);
          setCurrentView('map');
        }}
        onSelectRelationshipList={(rel, entType) => {
          handleSelectRelationshipList(rel, entType);
          setCurrentView('map');
        }}
        onSelectEntityTypeList={(type) => {
          handleSelectEntityTypeList(type);
          setCurrentView('map');
        }}
        onSelectTagList={(tag, cat, facetType) => {
          handleSelectTagList(tag, cat, facetType);
          setCurrentView('map');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF8F5] text-[#111827]">
      {/* Top Header */}
      <Header
        entities={entities}
        searchQuery={filterState.searchQuery}
        setSearchQuery={(q) => setFilterState(prev => ({ ...prev, searchQuery: q }))}
        showContinents={showContinents}
        setShowContinents={setShowContinents}
        showRelationships={showRelationships}
        setShowRelationships={setShowRelationships}
        editMode={editMode}
        setEditMode={setEditMode}
        hasUncommittedChanges={hasUncommittedChanges}
        onDismissChanges={() => setDismissModalOpen(true)}
        onCommitChanges={() => triggerCloudCommit()}
        activeListScope={activeListScope}
        onSelectEntityTypeList={handleSelectEntityTypeList}
        onSelectEntity={(entity) => {
          setSelectedEntity(entity);
          setActiveListScope(null);
          setSelectedContinentName(null);
          setLeftSidebarCollapsed(true);
          setViewport({
            x: -entity.x * 1.2,
            y: -entity.y * 1.2,
            zoom: 1.2
          });
        }}
        onOpenUpdateModal={() => setUpdateModalOpen(true)}
        onOpenReviewPipeline={() => setReviewPipelineModalOpen(true)}
        onOpenPositionSnapshotModal={() => setPositionSnapshotModalOpen(true)}
        onExportData={handleExportData}
        onOpenAbout={() => setAboutModalOpen(true)}
        onOpenContribute={() => setSubmitEntityModalOpen(true)}
        onOpenDirectoryModal={() => {
          setSelectedEntity(null);
          setCurrentView('directory');
        }}
        onResetView={() => {
          setViewport({ x: 0, y: 0, zoom: 0.75 });
          setCenteredEntityId(null);
          setPreviousViewport(null);
        }}
      />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar Filters */}
        <LeftSidebar
          collapsed={leftSidebarCollapsed}
          setCollapsed={setLeftSidebarCollapsed}
          filterState={filterState}
          setFilterState={setFilterState}
          fieldClusters={fieldClusters}
          continents={continents}
          entities={entities}
          selectedContinentName={selectedContinentName}
          activeListScope={activeListScope}
          setActiveListScope={setActiveListScope}
          selectedEntity={selectedEntity}
          setSelectedEntity={setSelectedEntity}
          onSelectContinent={handleSelectContinent}
          onSelectCategoryList={handleSelectCategoryList}
          onSelectRelationshipList={handleSelectRelationshipList}
          onSelectTagList={handleSelectTagList}
          onFlyToQuadrant={handleFlyToQuadrant}
          onFlyToFieldCluster={handleFlyToFieldCluster}
          locations={locations}
          languages={languages}
          stages={stages}
          editMode={editMode}
          setEditMode={setEditMode}
          showContinents={showContinents}
          setShowContinents={setShowContinents}
          showRelationships={showRelationships}
          setShowRelationships={setShowRelationships}
          showEcotones={showEcotones}
          setShowEcotones={setShowEcotones}
          onSavePositions={handleSavePositions}
          onResetLayout={handleResetLayout}
          onAutoArrange={handleAutoArrange}
          onRecalculateLayout={handleRecalculateLayout}
          onFlyToContinent={handleFlyToContinent}
          totalFilteredCount={filteredEntities.length}
          totalCount={entities.length}
          onOpenReviewPipeline={() => setReviewPipelineModalOpen(true)}
          onUpdateEntity={handleUpdateEntity}
          cloudSyncStatus={cloudSyncStatus}
          hasUncommittedChanges={hasUncommittedChanges}
          onCommitChanges={() => triggerCloudCommit()}
          onDismissChanges={(alsoExit) => {
            if (alsoExit) {
              handleDismissChanges(true);
            } else {
              setDismissModalOpen(true);
            }
          }}
        />

        {/* Center Interactive RPG Map Canvas */}
        <RpgMapCanvas
          entities={filteredEntities}
          selectedEntity={selectedEntity}
          onSelectEntity={handleSelectEntityFromMap}
          selectedContinentName={selectedContinentName}
          onSelectContinent={handleSelectContinent}
          onUpdateEntityCoordinates={handleUpdateEntityCoordinates}
          fieldClusters={fieldClusters}
          continents={continents}
          hiddenFields={filterState.hiddenFields}
          hiddenContinents={filterState.hiddenContinents}
          editMode={editMode}
          hasUncommittedChanges={hasUncommittedChanges}
          onCommitCloud={() => triggerCloudCommit()}
          onDismissChanges={() => setDismissModalOpen(true)}
          onExitEditMode={() => setEditMode(false)}
          onOpenPositionSnapshotModal={() => setPositionSnapshotModalOpen(true)}
          showContinents={showContinents}
          showRelationships={showRelationships}
          showEcotones={showEcotones}
          selectedIntersectionZone={filterState.selectedIntersectionZone}
          selectedIntersectionZones={filterState.selectedIntersectionZones}
          onSelectIntersectionZone={(zoneId) => setFilterState(prev => {
            const currentZones = (prev.selectedIntersectionZones && prev.selectedIntersectionZones.length > 0)
              ? prev.selectedIntersectionZones.filter(z => z !== 'All')
              : (prev.selectedIntersectionZone && prev.selectedIntersectionZone !== 'All' ? [prev.selectedIntersectionZone] : []);
            const isAlreadySelected = currentZones.includes(zoneId);
            const updatedZones = isAlreadySelected
              ? currentZones.filter(id => id !== zoneId)
              : [...currentZones, zoneId];
            return {
              ...prev,
              selectedIntersectionZones: updatedZones,
              selectedIntersectionZone: updatedZones.length === 1 ? updatedZones[0] : (updatedZones.length === 0 ? 'All' : updatedZones.join(','))
            };
          })}
          viewport={viewport}
          setViewport={setViewport}
          onContinentClick={handleFlyToContinent}
          onUpdateContinentControlPoint={handleUpdateContinentControlPoint}
          onAddContinentControlPoint={handleAddContinentControlPoint}
          onDeleteContinentControlPoint={handleDeleteContinentControlPoint}
          onMoveContinent={handleMoveContinent}
          onContinentMoveEnd={handleContinentMoveEnd}
          onNodeDragEnd={handleNodeDragEnd}
          onMoveEntities={handleMoveEntities}
          onNodesDragEnd={handleNodesDragEnd}
          onResetContinentShape={handleResetContinentShape}
          onMoveContinentLabel={handleMoveContinentLabel}
          onResetContinentLabel={handleResetContinentLabel}
          onMoveContinentSubLabel={handleMoveContinentSubLabel}
          onResetContinentSubLabel={handleResetContinentSubLabel}
          onUpdateContinentCurvature={handleUpdateContinentCurvature}
          onUpdateAllContinentsCurvature={handleUpdateAllContinentsCurvature}
          onResetContinentCurvature={handleResetContinentCurvature}
          onRotateContinentLabel={handleRotateContinentLabel}
          onResetContinentRotation={handleResetContinentRotation}
          onScaleContinent={handleScaleContinent}
          onFitContinentTightly={handleFitContinentTightly}
          focusedEntityId={focusedEntityId}
          onExitFocus={() => {
            setFocusedEntityId(null);
            if (selectedContinentName) {
              setSelectedContinentName(null);
              setActiveListScope(null);
              setLeftSidebarCollapsed(leftSidebarBeforeFocusRef.current !== undefined ? leftSidebarBeforeFocusRef.current : false);
              if (previousViewport) {
                setViewport(previousViewport);
                setPreviousViewport(null);
              }
            }
          }}
          onRecalculateLayout={handleRecalculateLayout}
          quadrantSizes={activeQuadrantSizes}
          onUpdateQuadrantSizes={handleUpdateQuadrantSizes}
          activeLayer={filterState.activeLayer ?? 1}
          onSelectLayer={(layer) => setFilterState(prev => ({ ...prev, activeLayer: layer }))}
          allLayerQuadrantSizes={layerQuadrantSizes}
          onResetQuadrantSizes={handleResetQuadrantSizes}
          onAutoFitQuadrantSizes={handleAutoFitQuadrantSizes}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        {/* Edit Mode Undo / Redo Notification Toast */}
        {undoToastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#111827]/95 text-white px-4 py-2 rounded-full shadow-2xl border border-[#D9C01B] flex items-center space-x-2.5 text-xs font-editorial animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#D9C01B] animate-pulse" />
            <span>{undoToastMessage}</span>
            {redoStack.length > 0 && (
              <button
                onClick={handleRedo}
                className="ml-2 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#D9C01B] text-[10px] font-technical uppercase font-bold tracking-wider cursor-pointer transition-colors"
                title="Redo edit (Ctrl+Y or Cmd+Shift+Z)"
              >
                Redo (Ctrl+Y)
              </button>
            )}
          </div>
        )}

        {/* Right Sidebar Wrapper with smooth synchronized width slide-in/out transition */}
        <div
          className={`h-full shrink-0 z-30 transition-all duration-300 ease-out overflow-hidden flex flex-col ${
            hasActiveRightSidebar ? 'w-96 opacity-100' : 'w-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-96 h-full flex flex-col">
            {(hasActiveRightSidebar || persistedRightSidebarScope) && (
              <RightSidebar
                entity={selectedEntity || persistedRightSidebarScope?.entity || null}
                activeListScope={activeListScope || persistedRightSidebarScope?.activeScope || null}
                selectedContinentName={selectedContinentName || persistedRightSidebarScope?.continentName || null}
                continents={continents}
                editMode={editMode}
                onClose={() => {
                  const wasFocusView = Boolean(selectedContinentName || (activeListScope?.type === 'continent'));
                  const wasRelationshipScope = activeListScope?.type === 'relationship';
                  setSelectedEntity(null);
                  setSelectedContinentName(null);
                  setActiveListScope(null);
                  setCenteredEntityId(null);
                  if (wasRelationshipScope) {
                    setFilterState(prev => ({
                      ...prev,
                      selectedOurRelationships: [],
                      selectedOurRelationship: 'All'
                    }));
                  }
                  if (wasFocusView) {
                    setLeftSidebarCollapsed(leftSidebarBeforeFocusRef.current !== undefined ? leftSidebarBeforeFocusRef.current : false);
                  }
                  if (previousViewport) {
                    setViewport(previousViewport);
                    setPreviousViewport(null);
                  }
                  setFocusedEntityId(null);
                }}
                onCenterEntity={centerOnEntity}
                isMapCentered={isEntityCentered}
                onFocusEntity={handleToggleFocusEntity}
                isMapFocused={focusedEntityId !== null && focusedEntityId === selectedEntity?.id}
                onFlyToContinent={handleFlyToContinent}
                onFlyToQuadrant={handleFlyToQuadrant}
                onFlyToTag={(tag, cat) => handleFlyToFieldCluster({ name: tag, category: cat })}
                onSelectContinent={handleSelectContinent}
                onSelectCategoryList={handleSelectCategoryList}
                onSelectRelationshipList={handleSelectRelationshipList}
                onSelectEntityTypeList={handleSelectEntityTypeList}
                onSelectTagList={handleSelectTagList}
                onUpdateEntity={handleUpdateEntity}
                onUpdateEntityNotes={handleUpdateNotes}
                onUpdateEntityCoordinates={handleUpdateEntityCoordinates}
                onAddCommunityNote={handleAddCommunityNote}
                onDeleteCommunityNote={handleDeleteCommunityNote}
                allEntities={entities}
                onSelectEntity={setSelectedEntity}
                onUpdateContinentQuadrant={handleUpdateContinentQuadrant}
                onRenameContinent={handleRenameContinent}
                onAddEntityToContinent={handleAddEntityToContinent}
                onRemoveEntityFromContinent={handleRemoveEntityFromContinent}
                onUpdateContinentDescription={handleUpdateContinentDescription}
                onResetContinentShape={handleResetContinentShape}
                onMoveContinentLabel={handleMoveContinentLabel}
                onResetContinentLabel={handleResetContinentLabel}
                onMoveContinentSubLabel={handleMoveContinentSubLabel}
                onResetContinentSubLabel={handleResetContinentSubLabel}
                onUpdateContinentCurvature={handleUpdateContinentCurvature}
                onUpdateAllContinentsCurvature={handleUpdateAllContinentsCurvature}
                onResetContinentCurvature={handleResetContinentCurvature}
                onRotateContinentLabel={handleRotateContinentLabel}
                onResetContinentRotation={handleResetContinentRotation}
                onScaleContinent={handleScaleContinent}
                onFitContinentTightly={handleFitContinentTightly}
                setEditMode={setEditMode}
                onOpenPositionSnapshotModal={() => setPositionSnapshotModalOpen(true)}
                quadrantSizes={activeQuadrantSizes}
                onUpdateQuadrantSizes={handleUpdateQuadrantSizes}
                activeLayer={filterState.activeLayer ?? 1}
                onSelectLayer={(layer) => setFilterState(prev => ({ ...prev, activeLayer: layer }))}
                allLayerQuadrantSizes={layerQuadrantSizes}
                onResetQuadrantSizes={handleResetQuadrantSizes}
                onAutoFitQuadrantSizes={handleAutoFitQuadrantSizes}
              />
            )}
          </div>
        </div>
      </div>

      {/* Update Data Modal */}
      <UpdateDataModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        currentEntities={entities}
        onApplySync={handleApplySync}
      />

      {/* About Metta Tropical Ecosystem Modal */}
      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        totalEntitiesCount={entities.length}
      />

      {/* Submit New Entity Contribution Modal */}
      <SubmitEntityModal
        isOpen={submitEntityModalOpen}
        onClose={() => setSubmitEntityModalOpen(false)}
        allEntities={entities}
        continents={continents}
      />

      {/* Discovery Quests Modal (Deactivated for the time being) */}
      <DiscoveryModeModal
        isOpen={discoveryModalOpen}
        onClose={() => setDiscoveryModalOpen(false)}
        entities={entities}
        onSelectAndCenterEntity={centerOnEntity}
      />

      {/* Community Review Pipeline Modal (Only accessible in Edit Mode) */}
      <ReviewPipelineModal
        isOpen={reviewPipelineModalOpen && editMode}
        onClose={() => setReviewPipelineModalOpen(false)}
        onUpdateEntity={handleUpdateEntity}
        onSelectEntity={(entity) => {
          setSelectedEntity(entity);
          centerOnEntity(entity);
        }}
        entities={entities}
      />

      {/* Dismiss Changes Confirmation Modal */}
      <DismissChangesModal
        isOpen={dismissModalOpen}
        onClose={() => setDismissModalOpen(false)}
        onConfirmDismiss={(alsoExit) => handleDismissChanges(alsoExit)}
        isDismissing={isDismissing}
      />

      {/* Position Snapshot Export & Import Modal */}
      <PositionSnapshotModal
        isOpen={positionSnapshotModalOpen}
        onClose={() => setPositionSnapshotModalOpen(false)}
        entities={entities}
        customContinentShapes={customContinentShapes}
        archipelagoMetadata={archipelagoMetadata}
        layerQuadrantSizes={layerQuadrantSizes}
        onApplySnapshot={handleApplySnapshot}
      />

      {/* Dismiss Success Toast */}
      {dismissSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-3">
          <div className="px-4 py-2.5 bg-[#111827] text-white border border-[#374151] rounded-full shadow-xl text-xs font-sans font-medium flex items-center space-x-2">
            <span className="text-[#FCA5A5] font-bold">↺</span>
            <span>Uncommitted changes dismissed • Reverted to last saved cloud version</span>
          </div>
        </div>
      )}

      {/* Sync Success Notification Toast */}
      {syncSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-md w-full px-4">
          <div className="p-4 bg-[#111827] text-white border border-[#374151] rounded-[6px] shadow-2xl text-xs font-sans">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#374151]">
              <div className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold text-sm">✓</span>
                <span className="font-editorial text-sm font-semibold">{syncSuccessToast.title}</span>
              </div>
              <button
                onClick={() => setSyncSuccessToast(null)}
                className="text-[#9CA3AF] hover:text-white p-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-1 font-technical text-[11px] text-[#D1D5DB]">
              {syncSuccessToast.details.map((detail, idx) => (
                <li key={idx} className="flex items-start space-x-1.5">
                  <span className="text-emerald-400">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Floating Cloud / Storage Sync Notification Toast */}
      {cloudSyncStatus.state !== 'idle' && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
          <div className={`px-4 py-2 rounded-full shadow-lg border text-xs font-sans font-medium flex items-center space-x-2 backdrop-blur-md ${
            cloudSyncStatus.state === 'syncing'
              ? 'bg-[#111827]/90 text-white border-white/20'
              : cloudSyncStatus.state === 'saved'
              ? 'bg-[#065F46]/95 text-emerald-100 border-emerald-400/40'
              : cloudSyncStatus.state === 'saved_locally'
              ? 'bg-[#1E293B]/95 text-sky-200 border-sky-400/30'
              : cloudSyncStatus.state === 'quota_exceeded'
              ? 'bg-[#854D0E]/95 text-amber-100 border-amber-400/40'
              : 'bg-[#991B1B]/95 text-red-100 border-red-400/40'
          }`}>
            {cloudSyncStatus.state === 'syncing' && (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {cloudSyncStatus.state === 'saved' && <span>✓</span>}
            {cloudSyncStatus.state === 'saved_locally' && <span>💾</span>}
            {(cloudSyncStatus.state === 'quota_exceeded' || cloudSyncStatus.state === 'error') && <span>ℹ️</span>}
            <span>{cloudSyncStatus.message}</span>
          </div>
        </div>
      )}

      {/* Initial Loading Veil to eliminate layout flash / jumping on cold boot */}
      {isInitialLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FAF8F5] transition-opacity duration-300 pointer-events-auto">
          <div className="flex flex-col items-center max-w-sm text-center px-6">
            <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#D9C01B] opacity-40 animate-ping" />
              <div className="w-14 h-14 rounded-full border border-[#D9C01B]/80 bg-white shadow-sm flex items-center justify-center">
                <Compass className="w-7 h-7 text-[#111827] animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </div>
            <h2 className="text-xl font-editorial font-medium text-[#111827] tracking-tight mb-2">
              Metta Tropical Ecosystem
            </h2>
            <p className="text-xs font-technical text-[#8C877F] flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9C01B] animate-pulse" />
              <span>Loading ecosystem map...</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

