import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Move, Eye, Shield, Sparkles, Navigation, Globe, Map as MapIcon, RotateCcw, RotateCw, Plus, Trash2, Mountain, Layers, Network, Star, Save, Unlock, X, Sliders, Wand2, ChevronUp, ChevronDown, Undo2, Redo2
} from 'lucide-react';
import { EcosystemEntity, CategoryQuadrant, FieldCluster, MapViewport, ContinentInfo, EcotoneCorridorInfo, getEntityCompleteness, DATA_COMPLETENESS_CONFIG, getCompletenessConfig, LayerQuadrantSizes, LayerQuadrantConfig, DEFAULT_LAYER_QUADRANT_SIZES, getQuadrantSizesForLayer } from '../types';
import { QUADRANT_CENTERS, generateContinentLabelPath, isEntityDomainElevation, getEntityIntersectionZone, getEntityQuadrantGradient, INTERSECTION_ZONES, calculateEcotoneCorridors, getEntityClusterWithNumber, formatClusterWithNumber, normalizeArchipelagoBaseName, isEntityPrimaryToArchipelago, suggestContinent } from '../utils/layoutGenerator';
import { calculateAutoFitQuadrantSizes } from '../utils/layerClassifier';
import { ChangelogWidget } from './ChangelogWidget';
import { getConnectedEntityIds } from '../utils/socialMedia';
import { areEntitiesDirectlyLinked } from '../utils/excelParser';

const sanitizeId = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');

const getDarkerContinentColor = (category: CategoryQuadrant) => {
  switch (category) {
    case 'Inner': return '#3B0764'; // Deep Imperial Purple
    case 'Social': return '#0F172A'; // Deep Charcoal Obsidian
    case 'Cultural': return '#14532D'; // Deep Forest Emerald
    case 'Systems': return '#075985'; // Deep Ocean Cobalt
    default: return '#111827';
  }
};

/**
 * Renders the logo if available, otherwise favicon, otherwise falls back to emoji iconSymbol
 */
const NodePinIcon: React.FC<{
  entity: EcosystemEntity;
  iconSymbol: string;
  isLozenge: boolean;
}> = React.memo(({ entity, iconSymbol, isLozenge }) => {
  const [useFavicon, setUseFavicon] = useState(false);
  const [hasError, setHasError] = useState(false);

  const logoUrl = entity.logo?.trim();
  const faviconUrl = entity.favicon?.trim();

  useEffect(() => {
    setUseFavicon(false);
    setHasError(false);
  }, [entity.id, entity.logo, entity.favicon]);

  const activeSrc = (!useFavicon && logoUrl) ? logoUrl : (faviconUrl || null);

  if (!hasError && activeSrc) {
    return (
      <img
        src={activeSrc}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        className={`w-full h-full object-contain p-0.5 select-none pointer-events-none rounded-[inherit] ${
          isLozenge ? '-rotate-45' : ''
        }`}
        onError={() => {
          if (!useFavicon && logoUrl && faviconUrl) {
            setUseFavicon(true);
          } else {
            setHasError(true);
          }
        }}
      />
    );
  }

  return (
    <span className={`text-xs leading-none select-none ${isLozenge ? '-rotate-45' : ''}`}>
      {iconSymbol}
    </span>
  );
});

interface RpgMapCanvasProps {
  entities: EcosystemEntity[];
  selectedEntity: EcosystemEntity | null;
  onSelectEntity: (entity: EcosystemEntity | null) => void;
  selectedContinentName?: string | null;
  onSelectContinent?: (continentName: string | null) => void;
  onUpdateEntityCoordinates: (id: string, x: number, y: number) => void;
  fieldClusters: FieldCluster[];
  continents: ContinentInfo[];
  hiddenFields: string[];
  hiddenContinents?: string[];
  editMode: boolean;
  hasUncommittedChanges?: boolean;
  onCommitCloud?: () => void;
  onDismissChanges?: (alsoExitEditMode?: boolean) => void;
  onExitEditMode?: () => void;
  fogOfWar?: boolean;
  showContinents: boolean;
  showRelationships?: boolean;
  showEcotones?: boolean;
  selectedIntersectionZone?: string;
  selectedIntersectionZones?: string[];
  onSelectIntersectionZone?: (zone: string) => void;
  viewport: MapViewport;
  setViewport: React.Dispatch<React.SetStateAction<MapViewport>>;
  onContinentClick?: (continent: ContinentInfo) => void;
  onUpdateContinentControlPoint?: (continentName: string, pointIndex: number, newX: number, newY: number) => void;
  onAddContinentControlPoint?: (continentName: string, insertIndex: number, x: number, y: number) => void;
  onDeleteContinentControlPoint?: (continentName: string, pointIndex: number) => void;
  onMoveContinent?: (continentName: string, deltaX: number, deltaY: number) => void;
  onContinentMoveEnd?: (continentName: string) => void;
  onNodeDragEnd?: (entityId: string) => void;
  onMoveEntities?: (ids: string[], deltaX: number, deltaY: number) => void;
  onNodesDragEnd?: (ids: string[]) => void;
  onResetContinentShape?: (continentName: string) => void;
  onMoveContinentLabel?: (continentName: string, deltaX: number, deltaY: number) => void;
  onResetContinentLabel?: (continentName: string) => void;
  onMoveContinentSubLabel?: (continentName: string, deltaX: number, deltaY: number) => void;
  onResetContinentSubLabel?: (continentName: string) => void;
  onScaleContinent?: (continentName: string, factor: number) => void;
  onFitContinentTightly?: (continentName: string) => void;
  focusedEntityId?: string | null;
  onExitFocus?: () => void;
  onRecalculateLayout?: (resetCustom?: boolean) => void;
  quadrantSizes?: LayerQuadrantSizes;
  onUpdateQuadrantSizes?: (newSizes: LayerQuadrantSizes, targetLayer?: 1 | 2 | 3 | 'all') => void;
  activeLayer?: 1 | 2 | 3 | 'all';
  onSelectLayer?: (layer: 1 | 2 | 3 | 'all') => void;
  allLayerQuadrantSizes?: LayerQuadrantConfig;
  onResetQuadrantSizes?: (layer?: 1 | 2 | 3 | 'all') => void;
  onAutoFitQuadrantSizes?: (layer?: 1 | 2 | 3 | 'all') => void;
  onOpenPositionSnapshotModal?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const RpgMapCanvas: React.FC<RpgMapCanvasProps> = ({
  entities,
  selectedEntity,
  onSelectEntity,
  selectedContinentName,
  onSelectContinent,
  onUpdateEntityCoordinates,
  fieldClusters,
  continents,
  hiddenFields,
  hiddenContinents = [],
  editMode,
  hasUncommittedChanges = false,
  onCommitCloud,
  onDismissChanges,
  onExitEditMode,
  onOpenPositionSnapshotModal,
  fogOfWar,
  showContinents,
  showRelationships = false,
  showEcotones = true,
  selectedIntersectionZone,
  selectedIntersectionZones,
  onSelectIntersectionZone,
  viewport,
  setViewport,
  onContinentClick,
  onUpdateContinentControlPoint,
  onAddContinentControlPoint,
  onDeleteContinentControlPoint,
  onMoveContinent,
  onContinentMoveEnd,
  onNodeDragEnd,
  onMoveEntities,
  onNodesDragEnd,
  onResetContinentShape,
  onMoveContinentLabel,
  onResetContinentLabel,
  onMoveContinentSubLabel,
  onResetContinentSubLabel,
  onScaleContinent,
  onFitContinentTightly,
  focusedEntityId,
  onExitFocus,
  onRecalculateLayout,
  quadrantSizes,
  onUpdateQuadrantSizes,
  activeLayer = 1,
  onSelectLayer,
  allLayerQuadrantSizes,
  onResetQuadrantSizes,
  onAutoFitQuadrantSizes,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Focus Mode state and connected entities resolution
  const focusedEntity = useMemo(() => {
    if (!focusedEntityId) return null;
    return entities.find(e => e.id === focusedEntityId) || null;
  }, [focusedEntityId, entities]);

  const focusVisibleIds = useMemo(() => {
    if (!focusedEntity) return null;
    return getConnectedEntityIds(focusedEntity, entities);
  }, [focusedEntity, entities]);

  // Filter out entities with hidden field tags or belonging to hidden continents
  const visibleEntities = useMemo(() => {
    return entities.filter(ent => {
      // Focus mode: ONLY show focused entity and its connected entities! Everything else on map is hidden.
      if (focusVisibleIds) {
        if (!focusVisibleIds.has(ent.id)) return false;
      }
      if (ent.continent && hiddenContinents.includes(ent.continent)) {
        return false;
      }
      if (ent.fields.length === 0) return true;
      return ent.fields.some(f => !hiddenFields.includes(f));
    });
  }, [entities, hiddenFields, hiddenContinents, focusVisibleIds]);

  // Multi-selection state (holds all currently selected entity IDs in edit mode)
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(() => {
    return selectedEntity ? new Set([selectedEntity.id]) : new Set();
  });

  // Synchronize multi-selection with single selectedEntity prop
  useEffect(() => {
    if (selectedEntity) {
      setSelectedEntityIds(prev => {
        if (prev.has(selectedEntity.id)) return prev;
        return new Set([selectedEntity.id]);
      });
    } else {
      setSelectedEntityIds(prev => {
        if (prev.size <= 1) return new Set();
        return prev;
      });
    }
  }, [selectedEntity]);

  // Clear multi-selection when exiting edit mode
  useEffect(() => {
    if (!editMode) {
      setSelectedEntityIds(prev => (selectedEntity ? new Set([selectedEntity.id]) : new Set()));
    }
  }, [editMode, selectedEntity]);

  // Multi-entity and single-node high-performance 60fps dragging state
  const [draggingGroupIds, setDraggingGroupIds] = useState<string[] | null>(null);
  const [lastDragWorld, setLastDragWorld] = useState<{ x: number; y: number } | null>(null);
  const [nodeDragDelta, setNodeDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const nodeDragDeltaRef = useRef<{ dx: number; dy: number } | null>(null);
  const dragStartWorldRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const continentDragAccumRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const continentAnimFrameRef = useRef<number | null>(null);

  // Marquee selection box state (click and drag on canvas in edit mode)
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStartWorld, setMarqueeStartWorld] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrentWorld, setMarqueeCurrentWorld] = useState<{ x: number; y: number } | null>(null);
  const [marqueeStartClient, setMarqueeStartClient] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrentClient, setMarqueeCurrentClient] = useState<{ x: number; y: number } | null>(null);
  const [marqueeIsAdditive, setMarqueeIsAdditive] = useState(false);

  // Edit Mode Active Tool: 'pan' (standard hand drag) vs 'select' (marquee box selection)
  const [editToolMode, setEditToolMode] = useState<'select' | 'pan'>('pan');
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Make Pan tool the standard tool whenever opening edit mode
  useEffect(() => {
    if (editMode) {
      setEditToolMode('pan');
    }
  }, [editMode]);

  // Keyboard navigation & tool shortcuts in Edit Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea or contenteditable element
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      if (editMode) {
        // Ctrl+Z / Cmd+Z: Undo; Ctrl+Shift+Z / Cmd+Shift+Z: Redo
        if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          if (e.shiftKey) {
            onRedo?.();
          } else {
            onUndo?.();
          }
          return;
        }

        // Ctrl+Y / Cmd+Y: Redo
        if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'y' || e.key === 'Y')) {
          e.preventDefault();
          onRedo?.();
          return;
        }

        // Escape: clear selection
        if (e.key === 'Escape') {
          setSelectedEntityIds(new Set());
          onSelectEntity(null);
        }

        // Cmd+A / Ctrl+A: Select all visible entities
        if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
          e.preventDefault();
          const allVisibleIds = new Set(visibleEntities.map(ent => ent.id));
          setSelectedEntityIds(allVisibleIds);
          if (visibleEntities.length > 0) {
            onSelectEntity(visibleEntities[0]);
          }
        }

        // Tool shortcuts: V = Select Tool, H = Pan Tool
        if (e.key === 'v' || e.key === 'V') {
          setEditToolMode('select');
        } else if (e.key === 'h' || e.key === 'H') {
          setEditToolMode('pan');
        }

        // Arrow keys to nudge selected entities by 5px (25px with Shift)
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedEntityIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 25 : 5;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          const ids = Array.from(selectedEntityIds);
          if (onMoveEntities) {
            onMoveEntities(ids, dx, dy);
            if (onNodesDragEnd) {
              onNodesDragEnd(ids);
            }
          } else {
            ids.forEach(id => {
              const ent = entities.find(el => el.id === id);
              if (ent) onUpdateEntityCoordinates(id, ent.x + dx, ent.y + dy);
            });
            if (onNodeDragEnd) {
              onNodeDragEnd(ids[0]);
            }
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    editMode, 
    selectedEntityIds, 
    visibleEntities, 
    onSelectEntity, 
    onMoveEntities, 
    onNodesDragEnd, 
    onNodeDragEnd, 
    entities, 
    onUpdateEntityCoordinates,
    onUndo,
    onRedo
  ]);

  // Single-click vs double-click & drag coordination
  const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const suppressClickRef = useRef<boolean>(false);
  const pendingSingleClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickRef = useRef<{ time: number; target: string; x: number; y: number } | null>(null);

  const clearPendingClick = useCallback(() => {
    if (pendingSingleClickTimerRef.current) {
      clearTimeout(pendingSingleClickTimerRef.current);
      pendingSingleClickTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pendingSingleClickTimerRef.current) {
        clearTimeout(pendingSingleClickTimerRef.current);
      }
    };
  }, []);

  // Node Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragNodeOffset, setDragNodeOffset] = useState({ x: 0, y: 0 });
  
  // Entity, Continent, and Ecotone selection/hover states
  const [hoveredEntity, setHoveredEntity] = useState<EcosystemEntity | null>(null);
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);
  const [hoveredEcotone, setHoveredEcotone] = useState<string | null>(null);

  // Clear continent hover when leaving edit mode
  useEffect(() => {
    if (!editMode) {
      setHoveredContinent(null);
    }
  }, [editMode]);

  // Continent border vertex dragging and continent translation dragging
  const [draggingVertex, setDraggingVertex] = useState<{
    continentName: string;
    pointIndex: number;
  } | null>(null);

  // Archipelago Continent dragging state (moves landmass + labels + member entities in lockstep)
  const [draggingContinentName, setDraggingContinentName] = useState<string | null>(null);
  const [continentDragDelta, setContinentDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const continentDragDeltaRef = useRef<{ dx: number; dy: number } | null>(null);
  const continentDragStartWorldRef = useRef<{ x: number; y: number } | null>(null);

  // Member entity IDs belonging primarily to the archipelago currently being dragged
  const draggingContinentMemberEntityIds = useMemo<Set<string>>(() => {
    if (!draggingContinentName) return new Set();
    const baseContName = normalizeArchipelagoBaseName(draggingContinentName);
    const formattedContName = formatClusterWithNumber(draggingContinentName);
    const ids = new Set<string>();
    entities.forEach(ent => {
      if (isEntityDomainElevation(ent)) return;
      const entContinent = ent.continent || suggestContinent(ent);
      const isMember = (
        entContinent === draggingContinentName ||
        entContinent === formattedContName ||
        (entContinent && normalizeArchipelagoBaseName(entContinent) === baseContName) ||
        isEntityPrimaryToArchipelago(ent, draggingContinentName)
      );
      if (isMember) {
        ids.add(ent.id);
      }
    });
    return ids;
  }, [draggingContinentName, entities]);

  // Archipelago Label (Name or Sub-title) Dragging state in Edit Mode
  const [draggingLabel, setDraggingLabel] = useState<{
    continentName: string;
    target: 'name' | 'subLabel';
  } | null>(null);
  const labelDragStartWorldRef = useRef<{ x: number; y: number } | null>(null);

  // Active Quadrant Sizes for the current Layer
  const currentQuadrantSizes = useMemo(() => {
    return quadrantSizes || getQuadrantSizesForLayer(activeLayer, allLayerQuadrantSizes);
  }, [quadrantSizes, activeLayer, allLayerQuadrantSizes]);

  // Quadrant Interactive Resizing state in Edit Mode
  const [draggingQuadrantResize, setDraggingQuadrantResize] = useState<{
    quadrant: CategoryQuadrant;
    handle: 'width' | 'height' | 'corner';
    initialSizes: LayerQuadrantSizes;
    startWorld: { x: number; y: number };
  } | null>(null);

  const [isUniformQuadrantSizing, setIsUniformQuadrantSizing] = useState(true);
  const [isDetailedQuadrantHudOpen, setIsDetailedQuadrantHudOpen] = useState(false);
  const [isQuadrantHudMinimized, setIsQuadrantHudMinimized] = useState(false);

  // Stable World Bounds Calculation:
  // World bounds encompass all quadrants stably so SVG frame does not shear or jump during focus views
  const quadrantBounds = useMemo(() => {
    let minLeft = -Math.max(currentQuadrantSizes.Inner.width, currentQuadrantSizes.Cultural.width);
    let maxRight = Math.max(currentQuadrantSizes.Social.width, currentQuadrantSizes.Systems.width);
    let minTop = -Math.max(currentQuadrantSizes.Inner.height, currentQuadrantSizes.Social.height);
    let maxBottom = Math.max(currentQuadrantSizes.Cultural.height, currentQuadrantSizes.Systems.height);

    const margin = 200;

    continents.forEach(c => {
      if (c.minX - margin < minLeft) minLeft = c.minX - margin;
      if (c.maxX + margin > maxRight) maxRight = c.maxX + margin;
      if (c.minY - margin < minTop) minTop = c.minY - margin;
      if (c.maxY + margin > maxBottom) maxBottom = c.maxY + margin;
      c.controlPoints?.forEach(([px, py]) => {
        if (px - margin < minLeft) minLeft = px - margin;
        if (px + margin > maxRight) maxRight = px + margin;
        if (py - margin < minTop) minTop = py - margin;
        if (py + margin > maxBottom) maxBottom = py + margin;
      });
    });

    minLeft = Math.floor(minLeft / 50) * 50;
    maxRight = Math.ceil(maxRight / 50) * 50;
    minTop = Math.floor(minTop / 50) * 50;
    maxBottom = Math.ceil(maxBottom / 50) * 50;

    return {
      minLeft,
      maxRight,
      minTop,
      maxBottom,
      widthLeft: Math.abs(minLeft),
      widthRight: maxRight,
      heightTop: Math.abs(minTop),
      heightBottom: maxBottom,
      totalWidth: maxRight - minLeft,
      totalHeight: maxBottom - minTop,
      svgLeft: minLeft - 1000,
      svgTop: minTop - 1000,
      svgWidth: (maxRight - minLeft) + 2000,
      svgHeight: (maxBottom - minTop) + 2000,
      svgTransX: -minLeft + 1000,
      svgTransY: -minTop + 1000
    };
  }, [currentQuadrantSizes, continents]);

  // Helper to convert mouse event client coordinates to world coordinates
  const getWorldCoords = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const canvasMouseX = (e.clientX - rect.left - rect.width / 2 - viewport.x) / viewport.zoom;
    const canvasMouseY = (e.clientY - rect.top - rect.height / 2 - viewport.y) / viewport.zoom;
    return { x: Math.round(canvasMouseX), y: Math.round(canvasMouseY) };
  }, [viewport]);

  // Global window mousemove/mouseup listener for smooth node dragging, multi-entity group movement, continent vertex reshaping, continent translation, marquee selection, and quadrant resizing
  useEffect(() => {
    if (!editMode) return;
    if (!draggingNodeId && !draggingGroupIds && !draggingVertex && !draggingContinentName && !isMarqueeSelecting && !draggingLabel && !draggingQuadrantResize) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const world = getWorldCoords(e);

      // 0a. Quadrant outer boundary and corner resizing in Edit Mode
      if (draggingQuadrantResize && onUpdateQuadrantSizes) {
        hasDraggedRef.current = true;
        const { quadrant, handle, initialSizes } = draggingQuadrantResize;
        const currentQuad = initialSizes[quadrant];

        let targetW = currentQuad.width;
        let targetH = currentQuad.height;

        if (quadrant === 'Inner') {
          if (handle === 'width' || handle === 'corner') {
            targetW = Math.max(450, Math.min(3200, Math.round(-world.x)));
          }
          if (handle === 'height' || handle === 'corner') {
            targetH = Math.max(450, Math.min(3200, Math.round(-world.y)));
          }
        } else if (quadrant === 'Social') {
          if (handle === 'width' || handle === 'corner') {
            targetW = Math.max(450, Math.min(3200, Math.round(world.x)));
          }
          if (handle === 'height' || handle === 'corner') {
            targetH = Math.max(450, Math.min(3200, Math.round(-world.y)));
          }
        } else if (quadrant === 'Cultural') {
          if (handle === 'width' || handle === 'corner') {
            targetW = Math.max(450, Math.min(3200, Math.round(-world.x)));
          }
          if (handle === 'height' || handle === 'corner') {
            targetH = Math.max(450, Math.min(3200, Math.round(world.y)));
          }
        } else if (quadrant === 'Systems') {
          if (handle === 'width' || handle === 'corner') {
            targetW = Math.max(450, Math.min(3200, Math.round(world.x)));
          }
          if (handle === 'height' || handle === 'corner') {
            targetH = Math.max(450, Math.min(3200, Math.round(world.y)));
          }
        }

        if (e.shiftKey || isUniformQuadrantSizing) {
          const uniformVal = handle === 'corner'
            ? Math.round((targetW + targetH) / 2)
            : (handle === 'width' ? targetW : targetH);
          onUpdateQuadrantSizes({
            Inner: { width: uniformVal, height: uniformVal },
            Social: { width: uniformVal, height: uniformVal },
            Cultural: { width: uniformVal, height: uniformVal },
            Systems: { width: uniformVal, height: uniformVal }
          }, activeLayer);
        } else {
          onUpdateQuadrantSizes({
            ...initialSizes,
            [quadrant]: { width: targetW, height: targetH }
          }, activeLayer);
        }
        return;
      }

      // 0b. Moving entity or multiple selected entities together in unison (60fps requestAnimationFrame)
      if (draggingGroupIds && draggingGroupIds.length > 0 && dragStartWorldRef.current) {
        const dx = Math.round(world.x - dragStartWorldRef.current.x);
        const dy = Math.round(world.y - dragStartWorldRef.current.y);
        if (Math.hypot(dx, dy) > 2) {
          hasDraggedRef.current = true;
        }
        nodeDragDeltaRef.current = { dx, dy };
        if (!animFrameIdRef.current) {
          animFrameIdRef.current = requestAnimationFrame(() => {
            animFrameIdRef.current = null;
            setNodeDragDelta(nodeDragDeltaRef.current);
          });
        }
        return;
      }

      // 0b. Marquee box selection drag
      if (isMarqueeSelecting) {
        setMarqueeCurrentWorld(world);
        setMarqueeCurrentClient({ x: e.clientX, y: e.clientY });
        if (marqueeStartClient) {
          const dist = Math.hypot(e.clientX - marqueeStartClient.x, e.clientY - marqueeStartClient.y);
          if (dist > 4) {
            hasDraggedRef.current = true;
          }
        }
        return;
      }

      // 1. Moving an individual node
      if (draggingNodeId) {
        const newX = Math.round(world.x - dragNodeOffset.x);
        const newY = Math.round(world.y - dragNodeOffset.y);
        onUpdateEntityCoordinates(draggingNodeId, newX, newY);
        return;
      }

      // 2. Pulling/reshaping a continent border vertex
      if (draggingVertex && onUpdateContinentControlPoint) {
        hasDraggedRef.current = true;
        onUpdateContinentControlPoint(
          draggingVertex.continentName,
          draggingVertex.pointIndex,
          world.x,
          world.y
        );
        return;
      }

      // 3. Moving a continent's main area + member entities (60fps requestAnimationFrame in lockstep)
      if (draggingContinentName && continentDragStartWorldRef.current) {
        const dx = Math.round(world.x - continentDragStartWorldRef.current.x);
        const dy = Math.round(world.y - continentDragStartWorldRef.current.y);
        if (Math.hypot(dx, dy) > 2) {
          hasDraggedRef.current = true;
        }
        continentDragDeltaRef.current = { dx, dy };
        if (!continentAnimFrameRef.current) {
          continentAnimFrameRef.current = requestAnimationFrame(() => {
            continentAnimFrameRef.current = null;
            setContinentDragDelta(continentDragDeltaRef.current);
          });
        }
        return;
      }

      // 4. Moving an archipelago label (name or sub-title) freely anywhere on the canvas
      if (draggingLabel) {
        const dx = world.x - draggingLabel.lastWorldX;
        const dy = world.y - draggingLabel.lastWorldY;
        if (dx !== 0 || dy !== 0) {
          hasDraggedRef.current = true;
          if (draggingLabel.target === 'name') {
            onMoveContinentLabel?.(draggingLabel.continentName, dx, dy);
          } else {
            onMoveContinentSubLabel?.(draggingLabel.continentName, dx, dy);
          }
          setDraggingLabel(prev => prev ? { ...prev, lastWorldX: world.x, lastWorldY: world.y } : null);
        }
        return;
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      const world = getWorldCoords(e);

      if (hasDraggedRef.current) {
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 100);
      }
      if (draggingContinentName) {
        const finalDelta = continentDragDeltaRef.current;
        if (hasDraggedRef.current && finalDelta && (finalDelta.dx !== 0 || finalDelta.dy !== 0)) {
          if (onMoveContinent) {
            onMoveContinent(draggingContinentName, finalDelta.dx, finalDelta.dy);
          }
        }
        if (onContinentMoveEnd) {
          onContinentMoveEnd(draggingContinentName);
        }
        setDraggingContinentName(null);
        setContinentDragDelta(null);
        continentDragDeltaRef.current = null;
        continentDragStartWorldRef.current = null;
      }
      if (draggingVertex && onContinentMoveEnd) {
        onContinentMoveEnd(draggingVertex.continentName);
      }
      if (draggingNodeId && onNodeDragEnd) {
        onNodeDragEnd(draggingNodeId);
      }

      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (continentAnimFrameRef.current) {
        cancelAnimationFrame(continentAnimFrameRef.current);
        continentAnimFrameRef.current = null;
      }

      // Finish group or individual entity dragging with single final commit
      if (draggingGroupIds && draggingGroupIds.length > 0) {
        const finalDelta = nodeDragDeltaRef.current;
        if (hasDraggedRef.current && finalDelta && (finalDelta.dx !== 0 || finalDelta.dy !== 0)) {
          if (onMoveEntities) {
            onMoveEntities(draggingGroupIds, finalDelta.dx, finalDelta.dy);
          } else {
            draggingGroupIds.forEach(id => {
              const ent = entities.find(el => el.id === id);
              if (ent) onUpdateEntityCoordinates(id, ent.x + finalDelta.dx, ent.y + finalDelta.dy);
            });
          }
          if (onNodesDragEnd) {
            onNodesDragEnd(draggingGroupIds);
          } else if (onNodeDragEnd) {
            onNodeDragEnd(draggingGroupIds[0]);
          }
        }
        setDraggingGroupIds(null);
        setLastDragWorld(null);
        dragStartWorldRef.current = null;
        nodeDragDeltaRef.current = null;
        setNodeDragDelta(null);
      }

      // Finish marquee box selection
      if (isMarqueeSelecting) {
        if (hasDraggedRef.current && marqueeStartWorld) {
          const minX = Math.min(marqueeStartWorld.x, world.x);
          const maxX = Math.max(marqueeStartWorld.x, world.x);
          const minY = Math.min(marqueeStartWorld.y, world.y);
          const maxY = Math.max(marqueeStartWorld.y, world.y);

          // Find all visible entities enclosed or intersecting box
          const enclosed = visibleEntities.filter(ent => {
            const inX = ent.x >= minX - 55 && ent.x <= maxX + 55;
            const inY = ent.y >= minY - 40 && ent.y <= maxY + 30;
            return inX && inY;
          });

          const enclosedIds = new Set(enclosed.map(ent => ent.id));
          setSelectedEntityIds(prev => {
            if (marqueeIsAdditive) {
              const next = new Set(prev);
              enclosedIds.forEach(id => next.add(id));
              return next;
            }
            return enclosedIds;
          });

          if (enclosed.length > 0) {
            onSelectEntity(enclosed[0]);
          } else if (!marqueeIsAdditive) {
            onSelectEntity(null);
          }
        } else {
          // Clicked empty canvas without dragging: clear selection if not additive
          if (!marqueeIsAdditive) {
            setSelectedEntityIds(new Set());
            onSelectEntity(null);
          }
        }

        setIsMarqueeSelecting(false);
        setMarqueeStartWorld(null);
        setMarqueeCurrentWorld(null);
        setMarqueeStartClient(null);
        setMarqueeCurrentClient(null);
      }

      setDraggingNodeId(null);
      setDraggingVertex(null);
      setDraggingContinentName(null);
      setDraggingLabel(null);
      setDraggingQuadrantResize(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (continentAnimFrameRef.current) {
        cancelAnimationFrame(continentAnimFrameRef.current);
        continentAnimFrameRef.current = null;
      }
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [
    draggingNodeId,
    dragNodeOffset,
    draggingGroupIds,
    lastDragWorld,
    isMarqueeSelecting,
    marqueeStartWorld,
    marqueeStartClient,
    marqueeIsAdditive,
    draggingVertex,
    draggingContinentName,
    continentDragDelta,
    onMoveContinent,
    onContinentMoveEnd,
    draggingLabel,
    draggingQuadrantResize,
    isUniformQuadrantSizing,
    activeLayer,
    onUpdateQuadrantSizes,
    editMode,
    getWorldCoords,
    onUpdateEntityCoordinates,
    onMoveEntities,
    onNodesDragEnd,
    onNodeDragEnd,
    onUpdateContinentControlPoint,
    onMoveContinent,
    onContinentMoveEnd,
    onMoveContinentLabel,
    onMoveContinentSubLabel,
    visibleEntities,
    entities,
    onSelectEntity
  ]);

  // Zoom handlers
  const handleZoom = useCallback((delta: number, mouseX?: number, mouseY?: number) => {
    setViewport(prev => {
      const newZoom = Math.min(Math.max(0.18, prev.zoom + delta), 2.8);
      if (newZoom === prev.zoom) return prev;

      // Zoom towards cursor if coordinates provided
      if (mouseX !== undefined && mouseY !== undefined && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = mouseX - rect.width / 2;
        const cy = mouseY - rect.height / 2;
        const zoomFactor = newZoom / prev.zoom;
        const newX = cx - (cx - prev.x) * zoomFactor;
        const newY = cy - (cy - prev.y) * zoomFactor;
        return { x: newX, y: newY, zoom: newZoom };
      }

      return { ...prev, zoom: newZoom };
    });
  }, [setViewport]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    // Check if cursor or event target is over the changelog popup, its trigger, or UI controls
    if (e.target instanceof HTMLElement && (
      e.target.closest('#map-changelog-panel') ||
      e.target.closest('#map-changelog-trigger') ||
      e.target.closest('.changelog-widget-container') ||
      e.target.closest('.interactive-control-btn') ||
      e.target.closest('.edit-status-ribbon') ||
      e.target.closest('.multi-select-hud')
    )) {
      // Allow the popup to scroll naturally without redimensioning / zooming the map
      return;
    }

    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    handleZoom(zoomDelta, e.clientX, e.clientY);
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    clearPendingClick();

    if (e.target instanceof HTMLElement && (
      e.target.closest('#map-changelog-panel') ||
      e.target.closest('#map-changelog-trigger') ||
      e.target.closest('.changelog-widget-container') ||
      e.target.closest('.interactive-control-btn') ||
      e.target.closest('.edit-status-ribbon') ||
      e.target.closest('.multi-select-hud')
    )) {
      return; // Handled by control buttons and changelog popup
    }

    if (editMode && e.target instanceof HTMLElement && e.target.closest('.node-element')) {
      return; // Handled by node drag in edit mode
    }

    if (e.button !== 0 && e.button !== 1) return; // Left or Middle click only

    if (editMode) {
      // If middle-click OR Spacebar held OR tool mode is 'pan':
      if (e.button === 1 || isSpacePressed || editToolMode === 'pan') {
        pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
        hasDraggedRef.current = false;
        suppressClickRef.current = false;
        setIsPanning(true);
        setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
        return;
      }

      // Default in Edit Mode: Marquee Box Selection!
      const world = getWorldCoords(e);
      setIsMarqueeSelecting(true);
      setMarqueeStartWorld(world);
      setMarqueeCurrentWorld(world);
      setMarqueeStartClient({ x: e.clientX, y: e.clientY });
      setMarqueeCurrentClient({ x: e.clientX, y: e.clientY });
      setMarqueeIsAdditive(e.shiftKey || e.metaKey || e.ctrlKey);
      hasDraggedRef.current = false;
      return;
    }

    // Non-edit mode: canvas pan
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    hasDraggedRef.current = false;
    suppressClickRef.current = false;

    setIsPanning(true);
    setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  };

  // Canvas Mouse Move (Pan canvas)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (pointerDownPosRef.current) {
      const dist = Math.hypot(
        e.clientX - pointerDownPosRef.current.x,
        e.clientY - pointerDownPosRef.current.y
      );
      if (dist > 4) {
        hasDraggedRef.current = true;
        clearPendingClick();
      }
    }

    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = () => {
    if (hasDraggedRef.current) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);
    }
    setIsPanning(false);
    pointerDownPosRef.current = null;
  };

  // Node Drag Start (or Canvas Pan start when not in edit mode)
  const handleNodeMouseDown = (e: React.MouseEvent, entity: EcosystemEntity) => {
    clearPendingClick();

    if (editMode) {
      e.stopPropagation();
      const world = getWorldCoords(e);
      const isModifier = e.shiftKey || e.metaKey || e.ctrlKey;

      if (isModifier) {
        // Toggle entity in multi-selection
        const nextSet = new Set(selectedEntityIds);
        if (nextSet.has(entity.id)) {
          nextSet.delete(entity.id);
        } else {
          nextSet.add(entity.id);
        }
        setSelectedEntityIds(nextSet);
        if (nextSet.has(entity.id)) {
          onSelectEntity(entity);
        } else if (nextSet.size > 0) {
          const first = entities.find(el => nextSet.has(el.id)) || null;
          onSelectEntity(first);
        } else {
          onSelectEntity(null);
        }
        return;
      }

      // Plain click / drag on node:
      let groupToDrag: string[];
      if (selectedEntityIds.has(entity.id) && selectedEntityIds.size > 1) {
        // Keep entire group selected and drag all together!
        groupToDrag = Array.from(selectedEntityIds);
        onSelectEntity(entity);
      } else {
        // Single selection
        groupToDrag = [entity.id];
        setSelectedEntityIds(new Set([entity.id]));
        onSelectEntity(entity);
      }

      setDraggingGroupIds(groupToDrag);
      setLastDragWorld(world);
      dragStartWorldRef.current = world;
      nodeDragDeltaRef.current = { dx: 0, dy: 0 };
      setNodeDragDelta(null);
      hasDraggedRef.current = false;
    } else {
      // In non-edit mode, allow double-click dragging / single-click dragging without immediately triggering selection
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      hasDraggedRef.current = false;
      suppressClickRef.current = false;
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
    }
  };

  // Continent / Domain Click handler: Distinguishes between single-click (select domain) vs double-click & drag (pan map)
  const handleContinentClick = useCallback((e: React.MouseEvent, continentName: string) => {
    e.stopPropagation();

    // If the user was dragging/panning the map or moving a continent, suppress the click completely!
    if (hasDraggedRef.current || suppressClickRef.current) {
      return;
    }

    clearPendingClick();
    if (onSelectContinent) {
      onSelectContinent(continentName);
    }
  }, [onSelectContinent, clearPendingClick]);

  // Entity Click handler: Distinguishes single-click selection vs dragging
  const handleEntityClick = useCallback((e: React.MouseEvent, entity: EcosystemEntity) => {
    e.stopPropagation();

    if (hasDraggedRef.current || suppressClickRef.current) {
      return;
    }

    if (editMode) {
      onSelectEntity(entity);
      return;
    }

    const now = Date.now();
    const last = lastClickRef.current;
    const isQuickFollowup = last && (now - last.time < 280) && (last.target === `entity-${entity.id}`);

    if (isQuickFollowup) {
      clearPendingClick();
      lastClickRef.current = null;
      if (!hasDraggedRef.current && !suppressClickRef.current) {
        onSelectEntity(entity);
      }
    } else {
      clearPendingClick();
      lastClickRef.current = { time: now, target: `entity-${entity.id}`, x: e.clientX, y: e.clientY };

      pendingSingleClickTimerRef.current = setTimeout(() => {
        if (!hasDraggedRef.current && !suppressClickRef.current) {
          onSelectEntity(entity);
        }
        pendingSingleClickTimerRef.current = null;
      }, 200);
    }
  }, [editMode, onSelectEntity, clearPendingClick]);

  // Ecotone Corridor Click handler
  const handleEcotoneClick = useCallback((e: React.MouseEvent, ecoId: string) => {
    e.stopPropagation();
    if (hasDraggedRef.current || suppressClickRef.current) return;
    clearPendingClick();
    if (onSelectIntersectionZone) {
      onSelectIntersectionZone(ecoId);
    }
  }, [onSelectIntersectionZone, clearPendingClick]);


  // Visible continents
  const visibleContinentsList = useMemo(() => {
    return continents.filter(c => !hiddenContinents.includes(c.name));
  }, [continents, hiddenContinents]);

  // Calculate connection lines for selected or hovered entity or all relationships across all quadrants
  const activeFocusEntity = focusedEntity || hoveredEntity || selectedEntity;
  const connectionLines = useMemo(() => {
    // If focus mode is active, ALWAYS highlight lines to all connected visible entities!
    if (focusedEntity) {
      const lines: {
        key: string;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        color: string;
        isHighlighted: boolean;
      }[] = [];

      visibleEntities.forEach(target => {
        if (target.id === focusedEntity.id) return;
        if (!areEntitiesDirectlyLinked(focusedEntity, target)) return;

        const color = focusedEntity.category === 'Inner' ? '#8B5CF6'
                    : focusedEntity.category === 'Social' ? '#D97706'
                    : focusedEntity.category === 'Cultural' ? '#10B981'
                    : '#0EA5E9';

        lines.push({
          key: `focus-highlight-${focusedEntity.id}-${target.id}`,
          x1: focusedEntity.x,
          y1: focusedEntity.y,
          x2: target.x,
          y2: target.y,
          color,
          isHighlighted: true
        });
      });

      return lines;
    }

    // If relationships toggle is OFF and no entity is selected/hovered, don't show any lines by default
    if (!showRelationships && !activeFocusEntity) return [];

    const lines: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      isHighlighted: boolean;
    }[] = [];

    // 1. If an entity is focused (hovered or selected), spotlight ONLY its directly linked spreadsheet relationships
    if (activeFocusEntity) {
      visibleEntities.forEach(target => {
        if (target.id === activeFocusEntity.id) return;

        if (areEntitiesDirectlyLinked(activeFocusEntity, target)) {
          const color = activeFocusEntity.category === 'Inner' ? '#5B21B6'
                      : activeFocusEntity.category === 'Social' ? '#111827'
                      : activeFocusEntity.category === 'Cultural' ? '#2E7D32'
                      : '#0284C7';

          lines.push({
            key: `focus-${activeFocusEntity.id}-${target.id}`,
            x1: activeFocusEntity.x,
            y1: activeFocusEntity.y,
            x2: target.x,
            y2: target.y,
            color,
            isHighlighted: true
          });
        }
      });
    }

    // 2. If showRelationships is active, show persistent connections for all directly linked entities
    if (showRelationships) {
      for (let i = 0; i < visibleEntities.length; i++) {
        const source = visibleEntities[i];
        for (let j = i + 1; j < visibleEntities.length; j++) {
          const target = visibleEntities[j];

          // Skip if already included in active focused entity highlight
          if (activeFocusEntity && (source.id === activeFocusEntity.id || target.id === activeFocusEntity.id)) {
            continue;
          }

          if (areEntitiesDirectlyLinked(source, target)) {
            let lineColor = '#334155'; // Cross-quadrant bridge - deep slate charcoal
            if (source.category === target.category) {
              lineColor = source.category === 'Inner' ? '#4C1D95'
                        : source.category === 'Social' ? '#0F172A'
                        : source.category === 'Cultural' ? '#14532D'
                        : '#0369A1';
            }

            lines.push({
              key: `rel-${source.id}-${target.id}`,
              x1: source.x,
              y1: source.y,
              x2: target.x,
              y2: target.y,
              color: lineColor,
              isHighlighted: false
            });
          }
        }
      }
    }

    return lines;
  }, [showRelationships, activeFocusEntity, focusedEntity, visibleEntities]);

  // Calculate dynamic Ecotone Corridors (background landmass ribbons connecting nodes across quadrants)
  const ecotoneCorridors = useMemo(() => {
    return calculateEcotoneCorridors(visibleEntities);
  }, [visibleEntities]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative flex-1 h-full w-full overflow-hidden bg-[#FAF8F5] select-none ${
        isPanning || isSpacePressed
          ? 'cursor-grabbing' 
          : isMarqueeSelecting
          ? 'cursor-crosshair'
          : draggingVertex 
          ? 'cursor-crosshair' 
          : draggingContinentName || (draggingGroupIds && draggingGroupIds.length > 0)
          ? 'cursor-grabbing' 
          : editMode 
          ? (editToolMode === 'pan' ? 'cursor-grab' : 'cursor-crosshair') 
          : 'cursor-grab'
      }`}
    >
      {/* RPG Background Map Board */}
      <div
        className={`absolute left-1/2 top-1/2 origin-[0_0] ${
          isPanning || draggingNodeId || (draggingGroupIds && draggingGroupIds.length > 0) || draggingContinentName || draggingVertex 
            ? 'transition-none' 
            : 'transition-transform duration-300 ease-out'
        }`}
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0px) scale(${viewport.zoom})`
        }}
      >
        {/* Dynamic World Grid Lines */}
        <div
          className="absolute bg-rpg-grid opacity-30 pointer-events-none"
          style={{
            left: quadrantBounds.svgLeft,
            top: quadrantBounds.svgTop,
            width: quadrantBounds.svgWidth,
            height: quadrantBounds.svgHeight
          }}
        />

        {/* Dynamically Sized Quadrant Zone Backdrops (Resized according to Active Layer) */}
        {/* 1. Inner (Top-Left: x < 0, y < 0) */}
        <div
          className={`absolute border-b-2 border-r-2 border-[#5B21B6]/30 bg-[#5B21B6]/[0.03] p-6 transition-colors duration-150 ${
            editMode ? 'border-t-2 border-l-2 border-dashed border-[#5B21B6]/40' : ''
          }`}
          style={{
            left: -currentQuadrantSizes.Inner.width,
            top: -currentQuadrantSizes.Inner.height,
            width: currentQuadrantSizes.Inner.width,
            height: currentQuadrantSizes.Inner.height
          }}
        >
          <div className="font-editorial text-2xl font-bold text-[#5B21B6]/70 uppercase tracking-wider">
            I. INNER CHANGE
          </div>
          <div className="font-technical text-xs text-[#5B21B6]/60">
            Self • Contemplation • Somatics • Trauma Healing
          </div>
          {editMode && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-[#5B21B6]/10 text-[#5B21B6] text-[10px] font-technical font-semibold">
              {currentQuadrantSizes.Inner.width} × {currentQuadrantSizes.Inner.height} px
            </div>
          )}
        </div>

        {/* 2. Social (Top-Right: x > 0, y < 0) */}
        <div
          className={`absolute border-b-2 border-l-2 border-[#111827]/30 bg-[#D9C01B]/[0.08] p-6 transition-colors duration-150 ${
            editMode ? 'border-t-2 border-r-2 border-dashed border-[#111827]/30' : ''
          }`}
          style={{
            left: 0,
            top: -currentQuadrantSizes.Social.height,
            width: currentQuadrantSizes.Social.width,
            height: currentQuadrantSizes.Social.height
          }}
        >
          <div className="font-editorial text-2xl font-bold text-[#111827] uppercase tracking-wider">
            II. SOCIAL CHANGE
          </div>
          <div className="font-technical text-xs text-[#111827]/70">
            Commons • Civic Action • Deliberative Democracy • Mutual Aid
          </div>
          {editMode && (
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-[#111827]/10 text-[#111827] text-[10px] font-technical font-semibold">
              {currentQuadrantSizes.Social.width} × {currentQuadrantSizes.Social.height} px
            </div>
          )}
        </div>

        {/* 3. Cultural (Bottom-Left: x < 0, y > 0) */}
        <div
          className={`absolute border-t-2 border-r-2 border-[#7D8764]/30 bg-[#7D8764]/[0.05] p-6 transition-colors duration-150 ${
            editMode ? 'border-b-2 border-l-2 border-dashed border-[#7D8764]/40' : ''
          }`}
          style={{
            left: -currentQuadrantSizes.Cultural.width,
            top: 0,
            width: currentQuadrantSizes.Cultural.width,
            height: currentQuadrantSizes.Cultural.height
          }}
        >
          <div className="font-editorial text-2xl font-bold text-[#7D8764] uppercase tracking-wider">
            III. CULTURAL CHANGE
          </div>
          <div className="font-technical text-xs text-[#7D8764]/80">
            Mythos • Storytelling • Transcontextual • Indigenous Wisdom
          </div>
          {editMode && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#7D8764]/10 text-[#7D8764] text-[10px] font-technical font-semibold">
              {currentQuadrantSizes.Cultural.width} × {currentQuadrantSizes.Cultural.height} px
            </div>
          )}
        </div>

        {/* 4. Systems (Bottom-Right: x > 0, y > 0) */}
        <div
          className={`absolute border-t-2 border-l-2 border-[#4FC1E0]/30 bg-[#4FC1E0]/[0.05] p-6 transition-colors duration-150 ${
            editMode ? 'border-b-2 border-r-2 border-dashed border-[#4FC1E0]/40' : ''
          }`}
          style={{
            left: 0,
            top: 0,
            width: currentQuadrantSizes.Systems.width,
            height: currentQuadrantSizes.Systems.height
          }}
        >
          <div className="font-editorial text-2xl font-bold text-[#006080] uppercase tracking-wider">
            IV. SYSTEMS CHANGE
          </div>
          <div className="font-technical text-xs text-[#006080]/70">
            Macroeconomics • Planetary Boundaries • Doughnut Economics • Tech
          </div>
          {editMode && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#4FC1E0]/15 text-[#006080] text-[10px] font-technical font-semibold">
              {currentQuadrantSizes.Systems.width} × {currentQuadrantSizes.Systems.height} px
            </div>
          )}
        </div>

        {/* EDIT MODE: QUADRANT RESIZE HANDLES ON MAP */}
        {editMode && onUpdateQuadrantSizes && (
          <div className="quadrant-resize-handles pointer-events-none select-none z-30">
            {/* INNER RESIZE HANDLES (Top-Left) */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Inner',
                  handle: 'corner',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: -currentQuadrantSizes.Inner.width - 10,
                top: -currentQuadrantSizes.Inner.height - 10
              }}
              title={`Drag to resize Layer ${activeLayer} Inner Quadrant (${currentQuadrantSizes.Inner.width}×${currentQuadrantSizes.Inner.height}px)`}
              className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#5B21B6] shadow-md flex items-center justify-center cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto group z-40"
            >
              <div className="w-2 h-2 rounded-full bg-[#5B21B6]" />
            </div>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Inner',
                  handle: 'width',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: -currentQuadrantSizes.Inner.width - 5,
                top: -currentQuadrantSizes.Inner.height / 2 - 12
              }}
              title="Drag to resize Inner Quadrant width"
              className="absolute w-3 h-6 rounded bg-white border border-[#5B21B6] shadow-xs flex items-center justify-center cursor-ew-resize hover:scale-125 transition-transform pointer-events-auto z-40"
            />
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Inner',
                  handle: 'height',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: -currentQuadrantSizes.Inner.width / 2 - 12,
                top: -currentQuadrantSizes.Inner.height - 5
              }}
              title="Drag to resize Inner Quadrant height"
              className="absolute w-6 h-3 rounded bg-white border border-[#5B21B6] shadow-xs flex items-center justify-center cursor-ns-resize hover:scale-125 transition-transform pointer-events-auto z-40"
            />

            {/* SOCIAL RESIZE HANDLES (Top-Right) */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Social',
                  handle: 'corner',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: currentQuadrantSizes.Social.width - 10,
                top: -currentQuadrantSizes.Social.height - 10
              }}
              title={`Drag to resize Layer ${activeLayer} Social Quadrant (${currentQuadrantSizes.Social.width}×${currentQuadrantSizes.Social.height}px)`}
              className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#111827] shadow-md flex items-center justify-center cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto group z-40"
            >
              <div className="w-2 h-2 rounded-full bg-[#D9C01B]" />
            </div>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Social',
                  handle: 'width',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: currentQuadrantSizes.Social.width - 5,
                top: -currentQuadrantSizes.Social.height / 2 - 12
              }}
              title="Drag to resize Social Quadrant width"
              className="absolute w-3 h-6 rounded bg-white border border-[#111827] shadow-xs flex items-center justify-center cursor-ew-resize hover:scale-125 transition-transform pointer-events-auto z-40"
            />
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Social',
                  handle: 'height',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: currentQuadrantSizes.Social.width / 2 - 12,
                top: -currentQuadrantSizes.Social.height - 5
              }}
              title="Drag to resize Social Quadrant height"
              className="absolute w-6 h-3 rounded bg-white border border-[#111827] shadow-xs flex items-center justify-center cursor-ns-resize hover:scale-125 transition-transform pointer-events-auto z-40"
            />

            {/* CULTURAL RESIZE HANDLES (Bottom-Left) */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Cultural',
                  handle: 'corner',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: -currentQuadrantSizes.Cultural.width - 10,
                top: currentQuadrantSizes.Cultural.height - 10
              }}
              title={`Drag to resize Layer ${activeLayer} Cultural Quadrant (${currentQuadrantSizes.Cultural.width}×${currentQuadrantSizes.Cultural.height}px)`}
              className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#7D8764] shadow-md flex items-center justify-center cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto group z-40"
            >
              <div className="w-2 h-2 rounded-full bg-[#7D8764]" />
            </div>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Cultural',
                  handle: 'width',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: -currentQuadrantSizes.Cultural.width - 5,
                top: currentQuadrantSizes.Cultural.height / 2 - 12
              }}
              title="Drag to resize Cultural Quadrant width"
              className="absolute w-3 h-6 rounded bg-white border border-[#7D8764] shadow-xs flex items-center justify-center cursor-ew-resize hover:scale-125 transition-transform pointer-events-auto z-40"
            />
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Cultural',
                  handle: 'height',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: -currentQuadrantSizes.Cultural.width / 2 - 12,
                top: currentQuadrantSizes.Cultural.height - 5
              }}
              title="Drag to resize Cultural Quadrant height"
              className="absolute w-6 h-3 rounded bg-white border border-[#7D8764] shadow-xs flex items-center justify-center cursor-ns-resize hover:scale-125 transition-transform pointer-events-auto z-40"
            />

            {/* SYSTEMS RESIZE HANDLES (Bottom-Right) */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Systems',
                  handle: 'corner',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: currentQuadrantSizes.Systems.width - 10,
                top: currentQuadrantSizes.Systems.height - 10
              }}
              title={`Drag to resize Layer ${activeLayer} Systems Quadrant (${currentQuadrantSizes.Systems.width}×${currentQuadrantSizes.Systems.height}px)`}
              className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#006080] shadow-md flex items-center justify-center cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto group z-40"
            >
              <div className="w-2 h-2 rounded-full bg-[#006080]" />
            </div>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Systems',
                  handle: 'width',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: currentQuadrantSizes.Systems.width - 5,
                top: currentQuadrantSizes.Systems.height / 2 - 12
              }}
              title="Drag to resize Systems Quadrant width"
              className="absolute w-3 h-6 rounded bg-white border border-[#006080] shadow-xs flex items-center justify-center cursor-ew-resize hover:scale-125 transition-transform pointer-events-auto z-40"
            />
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingQuadrantResize({
                  quadrant: 'Systems',
                  handle: 'height',
                  initialSizes: { ...currentQuadrantSizes },
                  startWorld: getWorldCoords(e)
                });
              }}
              style={{
                left: currentQuadrantSizes.Systems.width / 2 - 12,
                top: currentQuadrantSizes.Systems.height - 5
              }}
              title="Drag to resize Systems Quadrant height"
              className="absolute w-6 h-3 rounded bg-white border border-[#006080] shadow-xs flex items-center justify-center cursor-ns-resize hover:scale-125 transition-transform pointer-events-auto z-40"
            />
          </div>
        )}

        {/* ARCHIPELAGO LANDMASS SVG HULLS, CURVED ARCHIPELAGO LABELS & RESHAPE HANDLES */}
        <svg
          className="absolute pointer-events-none z-0"
          style={{
            left: quadrantBounds.svgLeft,
            top: quadrantBounds.svgTop,
            width: quadrantBounds.svgWidth,
            height: quadrantBounds.svgHeight
          }}
        >
          <defs>
            {/* Curved Path Definitions for Ecotone Corridors */}
            {showEcotones && ecotoneCorridors.map(eco => (
              <path
                key={`def-ecotone-label-${eco.id}`}
                id={`ecotone-label-path-${eco.id}`}
                d={eco.labelPath}
                fill="none"
              />
            ))}

            {/* Curved Path Definitions for Continent Names & Entity Counts Circling the Perimeter */}
            {showContinents && visibleContinentsList.map(cont => {
              const pathId = `continent-label-path-${sanitizeId(cont.name)}`;
              const subPathId = `continent-sublabel-path-${sanitizeId(cont.name)}`;

              const labelPathD = cont.labelPath || generateContinentLabelPath(
                cont.centerX,
                cont.centerY,
                cont.minX,
                cont.maxX,
                cont.minY,
                cont.maxY,
                cont.controlPoints,
                0
              );

              const subLabelPathD = cont.subLabelPath || generateContinentLabelPath(
                cont.centerX,
                cont.centerY,
                cont.minX,
                cont.maxX,
                cont.minY,
                cont.maxY,
                cont.controlPoints,
                -22
              );

              return (
                <React.Fragment key={`def-paths-${cont.name}`}>
                  <path id={pathId} d={labelPathD} fill="none" />
                  <path id={subPathId} d={subLabelPathD} fill="none" />
                </React.Fragment>
              );
            })}
          </defs>

          <g transform={`translate(${quadrantBounds.svgTransX}, ${quadrantBounds.svgTransY})`}>
            {/* 0. ECOTONE CORRIDORS (Dynamic Background Landmasses Connecting Ecotone Nodes Across Quadrants) */}
            {showEcotones && ecotoneCorridors.map(eco => {
              const isEcoHovered = hoveredEcotone === eco.id;
              const isEntityInThisEco = activeFocusEntity && getEntityIntersectionZone(activeFocusEntity)?.id === eco.id;
              const activeZones = (selectedIntersectionZones && selectedIntersectionZones.length > 0)
                ? selectedIntersectionZones.filter(z => z !== 'All')
                : (selectedIntersectionZone && selectedIntersectionZone !== 'All' ? [selectedIntersectionZone] : []);
              const isZoneFiltered = activeZones.length > 0 && (
                activeZones.includes(eco.id) || activeZones.includes(eco.name)
              );
              const isHighlighted = isEcoHovered || isEntityInThisEco || isZoneFiltered;

              return (
                <g
                  key={`ecotone-corridor-${eco.id}`}
                  className="transition-all duration-200"
                >
                  {/* Outer Ambient Glow / Corridor Buffer Halo */}
                  <path
                    d={eco.pathData}
                    fill="none"
                    stroke={eco.color}
                    strokeWidth={isHighlighted ? 18 : 8}
                    strokeOpacity={isHighlighted ? 0.35 : 0.08}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Organic Corridor Background Ribbon / Landmass Fill */}
                  <path
                    d={eco.pathData}
                    fill={eco.color}
                    fillOpacity={isHighlighted ? 0.22 : 0.08}
                    stroke={eco.color}
                    strokeWidth={isHighlighted ? 2.4 : 1.4}
                    strokeDasharray="7 4"
                    strokeOpacity={isHighlighted ? 0.9 : 0.45}
                    className="pointer-events-auto cursor-pointer transition-all duration-200"
                    onClick={(e) => handleEcotoneClick(e, eco.id)}
                    onMouseEnter={() => setHoveredEcotone(eco.id)}
                    onMouseLeave={() => setHoveredEcotone(null)}
                  />

                  {/* High-Contrast Cartographic Corridor Spine Text */}
                  <text
                    className="pointer-events-none font-technical uppercase select-none transition-all duration-200"
                    style={{
                      fontSize: isHighlighted ? 12 : 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.22em',
                      fill: isHighlighted ? '#0F172A' : eco.color,
                      paintOrder: 'stroke fill',
                      stroke: '#FFFFFF',
                      strokeWidth: '4.5px',
                      strokeLinejoin: 'round',
                      strokeLinecap: 'round',
                      opacity: isHighlighted ? 1 : 0.85,
                    }}
                  >
                    <textPath
                      href={`#ecotone-label-path-${eco.id}`}
                      startOffset="50%"
                      textAnchor="middle"
                      spacing="auto"
                    >
                      {eco.glyph} {eco.name.toUpperCase()} ({eco.count} {eco.count === 1 ? 'entity' : 'entities'})
                    </textPath>
                  </text>
                </g>
              );
            })}

            {/* 1. Archipelagos Organic Landmasses & Circling Archipelago Names */}
            {showContinents && visibleContinentsList.map(cont => {
              if (!cont.pathData) return null;
              const isHovered = editMode && hoveredContinent === cont.name;
              const isSelected = selectedContinentName === cont.name;
              const isBeingMoved = draggingContinentName === cont.name;
              const dragTransform = isBeingMoved && continentDragDelta
                ? `translate(${continentDragDelta.dx}, ${continentDragDelta.dy})`
                : undefined;
              const isInner = cont.category === 'Inner';
              const isSocial = cont.category === 'Social';
              const isCultural = cont.category === 'Cultural';

              const fillColor = isInner 
                ? (isHovered || isSelected ? 'rgba(91, 33, 182, 0.13)' : 'rgba(91, 33, 182, 0.07)') 
                : isSocial 
                ? (isHovered || isSelected ? 'rgba(217, 160, 27, 0.35)' : 'rgba(217, 160, 27, 0.20)') 
                : isCultural 
                ? (isHovered || isSelected ? 'rgba(34, 139, 34, 0.22)' : 'rgba(46, 125, 50, 0.14)') 
                : (isHovered || isSelected ? 'rgba(79, 193, 224, 0.16)' : 'rgba(79, 193, 224, 0.09)');

              const strokeColor = isInner
                ? '#5B21B6'
                : isSocial
                ? '#111827'
                : isCultural
                ? '#2E7D32'
                : '#0284C7';

              const darkTextColor = getDarkerContinentColor(cont.category);
              const pathId = `continent-label-path-${sanitizeId(cont.name)}`;
              const subPathId = `continent-sublabel-path-${sanitizeId(cont.name)}`;

              return (
                <g key={`continent-hull-${cont.name}`} transform={dragTransform}>
                  {/* Outer Coastline / Shoreline Contour */}
                  <path
                    d={cont.pathData}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isHovered || isSelected || isBeingMoved ? 2.5 : 1.5}
                    strokeOpacity={isHovered || isSelected || isBeingMoved ? 0.9 : 0.45}
                    strokeDasharray={isHovered || isSelected ? 'none' : '6 4'}
                    className={`transition-all duration-150 ${
                      editMode 
                        ? 'pointer-events-auto cursor-grab active:cursor-grabbing hover:stroke-[3px]' 
                        : 'pointer-events-auto cursor-pointer'
                    }`}
                    onClick={(e) => handleContinentClick(e, cont.name)}
                    onMouseDown={(e) => {
                      if (editMode) {
                        e.stopPropagation();
                        const world = getWorldCoords(e);
                        setDraggingContinentName(cont.name);
                        continentDragStartWorldRef.current = world;
                        continentDragDeltaRef.current = { dx: 0, dy: 0 };
                        setContinentDragDelta(null);
                        hasDraggedRef.current = false;
                      }
                    }}
                    onMouseEnter={() => {
                      if (editMode) {
                        setHoveredContinent(cont.name);
                      }
                    }}
                    onMouseLeave={() => {
                      if (editMode) {
                        setHoveredContinent(null);
                      }
                    }}
                  />

                  {/* Inner Solid Shoreline Rim */}
                  <path
                    d={cont.pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={0.75}
                    strokeOpacity={isHovered || isSelected ? 0.9 : 0.3}
                    transform="scale(0.985)"
                    className="pointer-events-none"
                  />

                  {/* Interactive Circling Archipelago Labels (Name & Smaller Entity Count - Freely Draggable in Edit Mode) */}
                  <g>
                    {/* 1. Continent Name (Freely Draggable Anywhere) */}
                    <g
                      className={editMode ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-auto cursor-pointer'}
                      transform={`translate(${cont.labelOffsetX || 0}, ${cont.labelOffsetY || 0})`}
                      onClick={(e) => handleContinentClick(e, cont.name)}
                      onMouseDown={(e) => {
                        if (editMode) {
                          e.stopPropagation();
                          const world = getWorldCoords(e);
                          setDraggingLabel({
                            continentName: cont.name,
                            target: 'name',
                            lastWorldX: world.x,
                            lastWorldY: world.y
                          });
                          hasDraggedRef.current = false;
                        }
                      }}
                      onMouseEnter={() => {
                        if (editMode) {
                          setHoveredContinent(cont.name);
                        }
                      }}
                      onMouseLeave={() => {
                        if (editMode) {
                          setHoveredContinent(null);
                        }
                      }}
                    >
                      {editMode && (
                        <title>Drag to move archipelago name freely anywhere</title>
                      )}
                      <text
                        className="font-editorial uppercase select-none transition-all"
                        style={{
                          fontSize: Math.max(16, Math.min(26, 14 + cont.count * 0.7)),
                          fontWeight: 800,
                          letterSpacing: '0.22em',
                          fill: darkTextColor,
                          paintOrder: 'stroke fill',
                          stroke: '#FFFFFF',
                          strokeWidth: '4.5px',
                          strokeLinejoin: 'round',
                          strokeLinecap: 'round',
                          opacity: isHovered || isSelected ? 1 : 0.95,
                        }}
                      >
                        <textPath
                          href={`#${pathId}`}
                          startOffset="50%"
                          textAnchor="middle"
                          spacing="auto"
                        >
                          {cont.name}
                        </textPath>
                      </text>
                    </g>

                    {/* 2. Smaller Entity Count Sub-title (Freely Draggable Anywhere) */}
                    <g
                      className={editMode ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-auto cursor-pointer'}
                      transform={`translate(${cont.subLabelOffsetX || 0}, ${cont.subLabelOffsetY || 0})`}
                      onClick={(e) => handleContinentClick(e, cont.name)}
                      onMouseDown={(e) => {
                        if (editMode) {
                          e.stopPropagation();
                          const world = getWorldCoords(e);
                          setDraggingLabel({
                            continentName: cont.name,
                            target: 'subLabel',
                            lastWorldX: world.x,
                            lastWorldY: world.y
                          });
                          hasDraggedRef.current = false;
                        }
                      }}
                      onMouseEnter={() => {
                        if (editMode) {
                          setHoveredContinent(cont.name);
                        }
                      }}
                      onMouseLeave={() => {
                        if (editMode) {
                          setHoveredContinent(null);
                        }
                      }}
                    >
                      {editMode && (
                        <title>Drag to move entity count sub-title freely anywhere</title>
                      )}
                      <text
                        className="font-technical uppercase select-none transition-all"
                        style={{
                          fontSize: Math.max(10, Math.min(13, 9 + cont.count * 0.25)),
                          fontWeight: 700,
                          letterSpacing: '0.16em',
                          fill: darkTextColor,
                          paintOrder: 'stroke fill',
                          stroke: '#FFFFFF',
                          strokeWidth: '3.5px',
                          strokeLinejoin: 'round',
                          strokeLinecap: 'round',
                          opacity: isHovered || isSelected ? 0.95 : 0.75,
                        }}
                      >
                        <textPath
                          href={`#${subPathId}`}
                          startOffset="50%"
                          textAnchor="middle"
                          spacing="auto"
                        >
                          {cont.count} {cont.count === 1 ? 'entity' : 'entities'}
                        </textPath>
                      </text>
                    </g>
                  </g>
                </g>
              );
            })}

            {/* 2. Connection lines between nodes */}
            {connectionLines.map(line => (
              <line
                key={line.key}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                strokeWidth={focusedEntity ? 3.5 : line.isHighlighted ? 2.5 : 1.75}
                strokeOpacity={focusedEntity ? 1.0 : line.isHighlighted ? 0.95 : 0.75}
                strokeDasharray={focusedEntity ? 'none' : line.isHighlighted ? 'none' : '6 3'}
                strokeLinecap="round"
              />
            ))}

            {/* 3. EDIT MODE: Continent Perimeter Reshape Handles (Control Vertices & '+' Midpoints) */}
            {editMode && showContinents && visibleContinentsList.map(cont => {
              if (!cont.controlPoints || cont.controlPoints.length === 0) return null;
              const isBeingMoved = draggingContinentName === cont.name;
              const isContinentActive = selectedContinentName === cont.name || hoveredContinent === cont.name || draggingVertex?.continentName === cont.name || isBeingMoved;
              const dragTransform = isBeingMoved && continentDragDelta
                ? `translate(${continentDragDelta.dx}, ${continentDragDelta.dy})`
                : undefined;
              
              const strokeColor = cont.category === 'Inner' 
                ? '#5B21B6' 
                : cont.category === 'Social' 
                ? '#111827' 
                : cont.category === 'Cultural' 
                ? '#2E7D32' 
                : '#0284C7';

              return (
                <g key={`continent-edit-controls-${cont.name}`} transform={dragTransform}>
                  {/* Vertex Control Points to Pull and Reshape */}
                  {cont.controlPoints.map(([px, py], pIdx) => {
                    const isVertexBeingDragged = draggingVertex?.continentName === cont.name && draggingVertex.pointIndex === pIdx;
                    return (
                      <g
                        key={`vertex-${cont.name}-${pIdx}`}
                        transform={`translate(${px}, ${py})`}
                        className="pointer-events-auto cursor-crosshair group"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingVertex({
                            continentName: cont.name,
                            pointIndex: pIdx
                          });
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onDeleteContinentControlPoint && cont.controlPoints.length > 3) {
                            onDeleteContinentControlPoint(cont.name, pIdx);
                          }
                        }}
                      >
                        {/* Outer White Grip Ring */}
                        <circle
                          r={isVertexBeingDragged ? 9 : 6.5}
                          fill="#FFFFFF"
                          stroke={strokeColor}
                          strokeWidth={isVertexBeingDragged ? 2.5 : 2}
                          className="transition-all duration-100 shadow-sm"
                        />
                        {/* Center Grab Dot */}
                        <circle
                          r={isVertexBeingDragged ? 4 : 2.5}
                          fill={strokeColor}
                        />
                      </g>
                    );
                  })}

                  {/* '+' Midpoint Edge Handles to Add New Vertices on Click */}
                  {isContinentActive && cont.controlPoints.map(([px, py], pIdx) => {
                    const nextP = cont.controlPoints[(pIdx + 1) % cont.controlPoints.length];
                    const mx = Math.round((px + nextP[0]) / 2);
                    const my = Math.round((py + nextP[1]) / 2);
                    return (
                      <g
                        key={`midpoint-${cont.name}-${pIdx}`}
                        transform={`translate(${mx}, ${my})`}
                        className="pointer-events-auto cursor-pointer opacity-60 hover:opacity-100 hover:scale-125 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddContinentControlPoint) {
                            onAddContinentControlPoint(cont.name, pIdx + 1, mx, my);
                          }
                        }}
                        title="Click to add a new coastline vertex"
                      >
                        <circle r={4.5} fill="#111827" />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          fontSize="7"
                          fontWeight="bold"
                        >
                          +
                        </text>
                      </g>
                    );
                  })}

                  {/* Floating Archipelago Quick Action Controls in Edit Mode */}
                  {isContinentActive && (
                    <foreignObject
                      x={cont.centerX - 130}
                      y={cont.minY - 44}
                      width={260}
                      height={36}
                      className="pointer-events-auto overflow-visible select-none"
                    >
                      <div className="flex items-center justify-center gap-1 bg-[#111827]/95 text-white backdrop-blur-xs px-2.5 py-1 rounded-full shadow-lg border border-white/20 text-[11px] font-technical">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onScaleContinent?.(cont.name, 0.85);
                          }}
                          className="px-1.5 py-0.5 bg-white/10 hover:bg-white/25 rounded-[3px] text-white hover:text-[#D9C01B] font-bold cursor-pointer transition-colors"
                          title="Shrink archipelago border by 15%"
                        >
                          − Shrink
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onScaleContinent?.(cont.name, 1.15);
                          }}
                          className="px-1.5 py-0.5 bg-white/10 hover:bg-white/25 rounded-[3px] text-white hover:text-[#D9C01B] font-bold cursor-pointer transition-colors"
                          title="Expand archipelago border by 15%"
                        >
                          + Expand
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFitContinentTightly?.(cont.name);
                          }}
                          className="px-2 py-0.5 bg-emerald-600/90 hover:bg-emerald-500 rounded-[3px] text-white font-semibold cursor-pointer transition-colors"
                          title="Fit boundary tightly around member entities"
                        >
                          Fit Tight
                        </button>
                        {cont.isCustomShape && onResetContinentShape && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResetContinentShape(cont.name);
                            }}
                            className="px-1.5 py-0.5 text-white/70 hover:text-white rounded-[3px] cursor-pointer transition-colors"
                            title="Reset to smooth auto-hull"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ENTITY NODE PINS & CARDS */}
        {visibleEntities.map(entity => {
          const isSelected = selectedEntity?.id === entity.id;
          const isMultiSelected = selectedEntityIds.has(entity.id);
          const isHovered = hoveredEntity?.id === entity.id;
          const isElevated = isEntityDomainElevation(entity);
          const intersectionZone = getEntityIntersectionZone(entity);

          // Entity Type RPG Icon
          let iconSymbol = '🕸️'; // Organization default
          if (entity.type === 'Person') {
            iconSymbol = '🧙';
          } else if (entity.type === 'Idea') {
            iconSymbol = '🔮';
          } else if (entity.type === 'Media') {
            iconSymbol = '🎙️';
          }

          // Entity Shapes:
          // organization = circle
          // person = lozenge
          // idea = rectangle with round borders
          // media = square with round borders
          let shapeOuterClasses = 'rounded-full';
          let shapeInnerClasses = 'rounded-full';
          let auraClasses = 'rounded-full';
          let isLozenge = false;
          let shapeWidth = entity.featured ? 36 : isElevated ? 34 : 28;
          let shapeHeight = entity.featured ? 36 : isElevated ? 34 : 28;

          if (entity.type === 'Person') {
            // Lozenge (rhombus / diamond rotated 45 deg)
            isLozenge = true;
            shapeOuterClasses = 'rotate-45 rounded-[3.5px]';
            shapeInnerClasses = 'rounded-[2px]';
            auraClasses = 'rotate-45 rounded-[5px]';
            shapeWidth = entity.featured ? 28 : isElevated ? 26 : 22;
            shapeHeight = entity.featured ? 28 : isElevated ? 26 : 22;
          } else if (entity.type === 'Idea') {
            // Rectangle with round borders
            shapeOuterClasses = 'rounded-[6px]';
            shapeInnerClasses = 'rounded-[4px]';
            auraClasses = 'rounded-[8px]';
            shapeWidth = entity.featured ? 38 : isElevated ? 34 : 30;
            shapeHeight = entity.featured ? 24 : isElevated ? 22 : 18;
          } else if (entity.type === 'Media') {
            // Square with round borders
            shapeOuterClasses = 'rounded-[5px]';
            shapeInnerClasses = 'rounded-[3.5px]';
            auraClasses = 'rounded-[7px]';
            shapeWidth = entity.featured ? 30 : isElevated ? 28 : 24;
            shapeHeight = entity.featured ? 30 : isElevated ? 28 : 24;
          }

          // Data Completeness Indicator Dot & Tooltip:
          // Top 10%: Emerald (#059669)
          // Top 25%: Vibrant Green (#16A34A)
          // Top 50%: Amber (#EAB308)
          // Top 75%: Orange (#F97316)
          // Bottom 25%: Red (#EF4444)
          const dcStatus = getEntityCompleteness(entity);
          const dcConfig = getCompletenessConfig(dcStatus);
          const dqDotBg = dcConfig.dotBg;
          const dqDotBorder = dcConfig.dotBorder;
          const dqTooltip = `Data Completeness: ${dcStatus} (${dcConfig.description})`;

          // Category ring color
          const ringColor = 
            entity.category === 'Inner' ? '#5B21B6' :
            entity.category === 'Social' ? '#111827' :
            entity.category === 'Cultural' ? '#7D8764' : '#0284C7';

          // Multi-quadrant conic gradient background for elevated intersections
          const multiQuadrantGradient = isElevated
            ? getEntityQuadrantGradient(entity, {
                Inner: '#5B21B6',
                Social: '#111827',
                Cultural: '#7D8764',
                Systems: '#0284C7'
              })
            : ringColor;

          const clusterLabel = getEntityClusterWithNumber(entity, continents);
          const otherTags = (entity.fields || []).filter(f => {
            const cleanF = f.toLowerCase().trim();
            const cleanCluster = clusterLabel.toLowerCase().trim();
            return cleanF !== cleanCluster && !cleanCluster.includes(cleanF);
          });
          const otherCount = otherTags.length;

          const renderTagtipBadge = () => {
            if (otherCount <= 0) return null;
            return (
              <div className="relative group/tagtip inline-flex items-center shrink-0">
                <span
                  className={`font-technical text-[8px] font-semibold leading-none px-1 py-0.5 rounded-[2px] transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-white/20 text-[#D9C01B] hover:bg-white/30'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]'
                  }`}
                  title={otherTags.join(', ')}
                >
                  +{otherCount}
                </span>

                {/* Tooltip on hover showing other tags */}
                <div className="absolute bottom-1/2 left-full ml-1.5 -translate-y-1/2 hidden group-hover/tagtip:flex items-center z-[100] pointer-events-none drop-shadow-xl">
                  {/* Leftward pointer caret */}
                  <div className="w-1.5 h-1.5 bg-[#111827] border-l border-b border-[#374151] transform rotate-45 -mr-1 z-10"></div>
                  <div className="bg-[#111827] text-white text-[9px] font-sans py-1.5 px-2.5 rounded-[4px] shadow-2xl border border-[#374151] whitespace-nowrap min-w-[110px] max-w-[220px] text-left">
                    <div className="font-technical text-[7.5px] text-[#9CA3AF] uppercase mb-1 tracking-wider font-semibold border-b border-white/10 pb-0.5 flex items-center justify-between gap-2">
                      <span>Other Tags</span>
                      <span className="text-[#D9C01B]">+{otherCount}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {otherTags.map((tag, idx) => (
                        <span key={idx} className="text-white/90 text-[8.5px] font-medium truncate">
                          • {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          };

          const isNodeBeingDragged = Boolean(draggingGroupIds && draggingGroupIds.includes(entity.id));
          const isArchipelagoBeingDragged = Boolean(
            draggingContinentName && 
            draggingContinentMemberEntityIds && 
            draggingContinentMemberEntityIds.has(entity.id)
          );

          const renderX = (isNodeBeingDragged && nodeDragDelta) 
            ? entity.x + nodeDragDelta.dx 
            : (isArchipelagoBeingDragged && continentDragDelta)
            ? entity.x + continentDragDelta.dx
            : entity.x;

          const renderY = (isNodeBeingDragged && nodeDragDelta) 
            ? entity.y + nodeDragDelta.dy 
            : (isArchipelagoBeingDragged && continentDragDelta)
            ? entity.y + continentDragDelta.dy
            : entity.y;

          return (
            <div
              key={entity.id}
              className={`node-element absolute -translate-x-1/2 -translate-y-1/2 ${
                isNodeBeingDragged || isArchipelagoBeingDragged
                  ? 'transition-none z-[80] pointer-events-none drop-shadow-xl'
                  : 'transition-transform duration-150 ' + (isHovered ? 'z-[60]' : isSelected || isMultiSelected ? 'z-40' : focusedEntity?.id === entity.id ? 'z-30' : 'z-20')
              } hover:z-[60] ${
                editMode ? 'cursor-move' : 'cursor-pointer'
              }`}
              style={{ left: renderX, top: renderY }}
              onClick={(e) => handleEntityClick(e, entity)}
              onMouseDown={(e) => handleNodeMouseDown(e, entity)}
              onMouseEnter={() => setHoveredEntity(entity)}
              onMouseLeave={() => setHoveredEntity(null)}
            >
              {/* Pin Node Outer Wrapper with Absolute Badges & Dot */}
              <div className="relative inline-flex items-center justify-center">
                {/* Specific Focus Mode Aura for the origin entity */}
                {focusedEntity?.id === entity.id && (
                  <div
                    className={`absolute -inset-3 animate-ping opacity-60 pointer-events-none ${auraClasses} bg-[#D9C01B]`}
                  />
                )}

                {/* Pulse / Selection Aura */}
                {(isSelected || isHovered) && (
                  <div
                    className={`absolute -inset-2.5 animate-ping opacity-25 pointer-events-none ${auraClasses}`}
                    style={{ backgroundColor: isElevated ? '#D97706' : ringColor }}
                  />
                )}

                {/* Main Pin Shape */}
                <div
                  className={`relative flex items-center justify-center transition-transform shadow-xs ${shapeOuterClasses} ${
                    focusedEntity?.id === entity.id
                      ? 'scale-125 ring-3 ring-[#D9C01B] shadow-md'
                      : isMultiSelected
                      ? 'scale-125 ring-3 ring-[#2563EB] ring-offset-2 ring-offset-[#FAF8F5] shadow-xl'
                      : isSelected
                      ? 'scale-125 ring-2 ring-[#111827]'
                      : isHovered
                      ? 'scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    width: `${shapeWidth}px`,
                    height: `${shapeHeight}px`,
                    background: isElevated ? multiQuadrantGradient : ringColor,
                    padding: '2.5px'
                  }}
                >
                  {/* Inner Disc */}
                  <div
                    className={`w-full h-full flex items-center justify-center transition-colors overflow-hidden ${shapeInnerClasses}`}
                    style={{
                      backgroundColor: isElevated ? '#FFFBEB' : '#FAF8F5'
                    }}
                  >
                    <NodePinIcon entity={entity} iconSymbol={iconSymbol} isLozenge={isLozenge} />
                  </div>
                </div>

                {/* Multi-Selection Checkmark Badge */}
                {editMode && isMultiSelected && (
                  <span
                    className="absolute -top-2.5 -right-2.5 w-4.5 h-4.5 bg-[#2563EB] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md z-40 border-2 border-white select-none pointer-events-none"
                    title="Selected in group (drag to move all)"
                  >
                    ✓
                  </span>
                )}

                {/* Ecotone (Intersection) Badge (Top Left) */}
                {isElevated && (
                  <span
                    className="absolute -top-2.5 -left-1.5 text-[11px] select-none pointer-events-none drop-shadow-xs z-30"
                    title={`Ecotone (Intersection): ${intersectionZone?.name || 'Intersection'}`}
                  >
                    {intersectionZone?.glyph || '🌿'}
                  </span>
                )}

                {/* Featured Badge Star (Top Right) */}
                {entity.featured && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#D9C01B] border border-[#111827] rounded-full flex items-center justify-center z-30 shadow-xs pointer-events-none"
                    title="Featured Entity"
                  >
                    <Star className="w-2.5 h-2.5 fill-[#111827] text-[#111827]" />
                  </span>
                )}

                {/* Data Quality Indicator Dot (Bottom Right) */}
                <span
                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full z-30 shadow-xs pointer-events-auto transition-transform hover:scale-125"
                  style={{
                    backgroundColor: dqDotBg,
                    border: `1.5px solid ${dqDotBorder}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
                  }}
                  title={dqTooltip}
                />
              </div>

              {/* Node Card / Label */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 rounded-[3px] border text-center transition-all cursor-pointer pointer-events-auto w-max max-w-[185px] ${
                  editMode ? 'min-w-[100px]' : 'min-w-[70px]'
                } shadow-xs ${
                  isMultiSelected
                    ? 'bg-[#1E293B] text-white border-[#2563EB] z-30 shadow-lg ring-2 ring-[#2563EB]/60'
                    : isSelected
                    ? 'bg-[#111827] text-white border-[#111827] z-30 shadow-md ring-2 ring-[#D9C01B]/40'
                    : isHovered
                    ? 'bg-white text-[#111827] border-[#111827] z-40 shadow-md'
                    : isElevated
                    ? 'bg-[#F0FDF4]/95 backdrop-blur-[2px] text-[#111827] border-[#BBF7D0] z-10'
                    : 'bg-white/95 backdrop-blur-[2px] text-[#111827] border-[#E5E7EB] z-10'
                }`}
                onClick={(e) => handleEntityClick(e, entity)}
              >
                {!editMode ? (
                  <>
                    <div className="flex items-center justify-center gap-1 max-w-full">
                      <span 
                        className="font-editorial text-[11px] font-bold leading-tight break-words line-clamp-2 text-center"
                        title={entity.name}
                      >
                        {entity.name}
                      </span>
                      {renderTagtipBadge()}
                    </div>

                    {/* Specific Multi-Quadrant Ecotone (Intersection) Badge */}
                    {isElevated && intersectionZone && (
                      <div className={`flex items-center justify-center space-x-1 mt-1 px-1.5 py-0.5 rounded-[2px] text-[7.5px] font-technical font-bold ${
                        isSelected ? 'bg-white/20 text-[#34D399]' : 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                      }`}>
                        <span>{intersectionZone.glyph}</span>
                        <span className="truncate">{intersectionZone.shortLabel}</span>
                      </div>
                    )}

                    {/* Focus Guest Entity Affiliation Badge */}
                    {entity.isFocusGuest && (
                      <div
                        className="flex items-center justify-center space-x-1 mt-1 px-1 py-0.5 rounded-[2px] text-[7.5px] font-technical font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                        title={`Affiliated via Other Archipelagos (Primary: ${entity.primaryContinentName || entity.continent})`}
                      >
                        <span>★</span>
                        <span className="truncate">Affiliated ({entity.primaryContinentName || entity.continent})</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div 
                      className="font-editorial text-[11px] font-bold leading-tight break-words line-clamp-2 text-center mb-0.5"
                      title={entity.name}
                    >
                      {entity.name}
                    </div>

                    {/* Specific Multi-Quadrant Ecotone (Intersection) Badge */}
                    {isElevated && intersectionZone && (
                      <div className={`flex items-center justify-center space-x-1 my-0.5 px-1.5 py-0.5 rounded-[2px] text-[7.5px] font-technical font-bold ${
                        isSelected ? 'bg-white/20 text-[#34D399]' : 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                      }`}>
                        <span>{intersectionZone.glyph}</span>
                        <span className="truncate">{intersectionZone.shortLabel}</span>
                      </div>
                    )}

                    {/* Focus Guest Entity Affiliation Badge */}
                    {entity.isFocusGuest && (
                      <div
                        className="flex items-center justify-center space-x-1 my-0.5 px-1 py-0.5 rounded-[2px] text-[7.5px] font-technical font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                        title={`Affiliated via Other Archipelagos (Primary: ${entity.primaryContinentName || entity.continent})`}
                      >
                        <span>★</span>
                        <span className="truncate">Affiliated ({entity.primaryContinentName || entity.continent})</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-1 mt-0.5 max-w-full">
                      <span
                        className={`font-technical text-[8.5px] font-semibold leading-none truncate max-w-[130px] ${
                          isSelected ? 'text-white/90' : 'text-[#4B5563]'
                        }`}
                        title={`Island / Cluster: ${clusterLabel}`}
                      >
                        {clusterLabel}
                      </span>
                      {renderTagtipBadge()}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MARQUEE SELECTION OVERLAY RECTANGLE */}
      {isMarqueeSelecting && marqueeStartClient && marqueeCurrentClient && containerRef.current && (() => {
        const rect = containerRef.current.getBoundingClientRect();
        const left = Math.min(marqueeStartClient.x, marqueeCurrentClient.x) - rect.left;
        const top = Math.min(marqueeStartClient.y, marqueeCurrentClient.y) - rect.top;
        const width = Math.abs(marqueeCurrentClient.x - marqueeStartClient.x);
        const height = Math.abs(marqueeCurrentClient.y - marqueeStartClient.y);

        let insideCount = 0;
        if (marqueeStartWorld && marqueeCurrentWorld) {
          const minX = Math.min(marqueeStartWorld.x, marqueeCurrentWorld.x);
          const maxX = Math.max(marqueeStartWorld.x, marqueeCurrentWorld.x);
          const minY = Math.min(marqueeStartWorld.y, marqueeCurrentWorld.y);
          const maxY = Math.max(marqueeStartWorld.y, marqueeCurrentWorld.y);
          insideCount = visibleEntities.filter(ent => (
            ent.x >= minX - 55 && ent.x <= maxX + 55 && ent.y >= minY - 40 && ent.y <= maxY + 30
          )).length;
        }

        return (
          <div
            className="absolute pointer-events-none z-50 border-2 border-dashed border-[#2563EB] bg-[#3B82F6]/15 rounded-[4px] shadow-sm select-none"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`
            }}
          >
            {width > 24 && height > 24 && (
              <div className="absolute -top-6 left-0 px-2 py-0.5 rounded-[4px] bg-[#111827]/90 text-white text-[10px] font-technical font-semibold shadow-md flex items-center space-x-1.5 whitespace-nowrap">
                <span>⬚</span>
                <span>{insideCount > 0 ? `${insideCount} entities enclosed` : 'Drag to select entities'}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* MULTI-SELECTION FLOATING ACTION BAR */}
      {editMode && selectedEntityIds.size > 1 && (
        <div className="multi-select-hud absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#111827]/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl border border-[#D9C01B]/40 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-1.5 text-xs font-editorial font-bold text-[#D9C01B]">
            <Move className="w-3.5 h-3.5 text-[#D9C01B]" />
            <span>{selectedEntityIds.size} entities selected</span>
          </div>
          <span className="text-[11px] text-gray-300 font-sans hidden md:inline">
            • Drag any selected node to move together
          </span>
          <div className="h-3 w-px bg-white/20 mx-1 hidden sm:block" />
          <button
            onClick={() => {
              const allIds = new Set(visibleEntities.map(e => e.id));
              setSelectedEntityIds(allIds);
            }}
            className="text-[10px] font-technical uppercase tracking-wider text-gray-300 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
            title="Select all visible entities"
          >
            All ({visibleEntities.length})
          </button>
          <button
            onClick={() => {
              setSelectedEntityIds(new Set());
              onSelectEntity(null);
            }}
            className="text-[10px] font-technical uppercase tracking-wider text-red-300 hover:text-red-100 px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors flex items-center gap-1 cursor-pointer"
            title="Clear selection (or press Escape)"
          >
            <X className="w-3 h-3" />
            <span>Clear (Esc)</span>
          </button>
        </div>
      )}

      {/* FOCUS MODE FLOATING BANNER */}
      {focusedEntity && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#111827]/95 text-white px-4 py-2 rounded-[6px] shadow-xl border border-[#D9C01B] flex items-center space-x-3 text-xs font-sans backdrop-blur-xs">
          <Network className="w-4 h-4 text-[#D9C01B] shrink-0 animate-pulse" />
          <span>
            Map focus: <strong className="text-[#D9C01B] font-semibold">{focusedEntity.name}</strong> •{' '}
            <span className="text-[#D1D5DB]">
              {visibleEntities.length - 1} connected {visibleEntities.length - 1 === 1 ? 'entity' : 'entities'} visible
            </span>
          </span>
          {onExitFocus && (
            <button
              onClick={onExitFocus}
              className="ml-2 px-2.5 py-0.5 bg-[#D9C01B] hover:bg-[#E5CD25] text-[#111827] text-[11px] font-technical uppercase font-bold rounded-[3px] transition-colors cursor-pointer"
              title="Exit focus mode and show all entities"
            >
              Exit Focus ✕
            </button>
          )}
        </div>
      )}



      {/* EDIT MODE: FLOATING QUADRANT SIZING HUD */}
      {editMode && onUpdateQuadrantSizes && (
        isQuadrantHudMinimized ? (
          <div className="absolute bottom-16 left-4 z-40">
            <button
              onClick={() => setIsQuadrantHudMinimized(false)}
              className="flex items-center space-x-2 bg-[#111827]/95 hover:bg-[#111827] text-white px-3 py-1.5 rounded-[5px] shadow-xl border border-[#D9C01B]/50 text-xs font-editorial cursor-pointer transition-all hover:scale-[1.02]"
              title="Open Quadrant Sizing Tool"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#D9C01B]" />
              <span>Quadrant Sizes (Layer {activeLayer}: {currentQuadrantSizes.Inner.width}px)</span>
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="absolute bottom-16 left-4 z-40 w-80 bg-[#111827]/95 backdrop-blur-md text-white rounded-[6px] shadow-2xl border border-[#374151] p-3 text-xs font-sans space-y-2.5 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <div className="flex items-center space-x-2">
                <Maximize2 className="w-4 h-4 text-[#D9C01B]" />
                <span className="font-editorial font-bold text-sm text-[#F9FAFB]">
                  Quadrant Sizes
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-technical uppercase font-semibold bg-[#059669]/20 text-[#34D399] border border-[#059669]/40">
                  Layer {activeLayer}
                </span>
              </div>
              <button
                onClick={() => setIsQuadrantHudMinimized(true)}
                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white cursor-pointer transition-colors"
                title="Minimize Quadrant Sizing Panel"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Layer Selector Tabs */}
            <div className="space-y-1">
              <div className="text-[10px] font-technical uppercase tracking-wider text-gray-400 flex items-center justify-between">
                <span>Active Layer:</span>
                <span className="text-[10px] text-gray-400">Loads attributed size</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 1 as const, label: 'Layer 1' },
                  { id: 2 as const, label: 'Layer 2' },
                  { id: 3 as const, label: 'Layer 3' },
                  { id: 'all' as const, label: 'All' }
                ].map(tab => (
                  <button
                    key={String(tab.id)}
                    onClick={() => onSelectLayer && onSelectLayer(tab.id)}
                    className={`py-1 text-[11px] font-editorial font-semibold rounded-[3px] transition-all cursor-pointer border ${
                      activeLayer === tab.id
                        ? 'bg-[#D9C01B] text-[#111827] border-[#D9C01B] shadow-xs'
                        : 'bg-[#1F2937] hover:bg-[#374151] text-gray-300 border-[#374151]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1 pt-1 border-t border-gray-800">
              <div className="flex items-center justify-between text-[10px] font-technical text-gray-400">
                <span>Quick Presets:</span>
                <span className="font-mono text-[#D9C01B]">{currentQuadrantSizes.Inner.width} × {currentQuadrantSizes.Inner.height} px</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'Compact', size: 750 },
                  { label: 'Default', size: activeLayer === 1 ? 950 : (activeLayer === 2 ? 1400 : 1600) },
                  { label: 'Medium', size: 1250 },
                  { label: 'Spacious', size: 1600 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (onUpdateQuadrantSizes) {
                        onUpdateQuadrantSizes({
                          Inner: { width: preset.size, height: preset.size },
                          Social: { width: preset.size, height: preset.size },
                          Cultural: { width: preset.size, height: preset.size },
                          Systems: { width: preset.size, height: preset.size }
                        }, activeLayer);
                      }
                    }}
                    className={`py-1 text-[10px] font-technical uppercase rounded-[3px] transition-colors cursor-pointer border ${
                      currentQuadrantSizes.Inner.width === preset.size
                        ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                        : 'bg-[#1F2937] hover:bg-[#374151] text-gray-300 border-gray-700'
                    }`}
                    title={`Set quadrants for Layer ${activeLayer} to ${preset.size}px`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Uniform Size Slider */}
            <div className="space-y-1.5 pt-1 border-t border-gray-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-300">Uniform Size:</span>
                <span className="font-mono text-xs text-[#D9C01B] font-bold">
                  {currentQuadrantSizes.Inner.width} px
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="2500"
                step="25"
                value={currentQuadrantSizes.Inner.width}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (onUpdateQuadrantSizes) {
                    onUpdateQuadrantSizes({
                      Inner: { width: val, height: val },
                      Social: { width: val, height: val },
                      Cultural: { width: val, height: val },
                      Systems: { width: val, height: val }
                    }, activeLayer);
                  }
                }}
                className="w-full accent-[#D9C01B] cursor-pointer"
              />
            </div>

            {/* Auto-Fit and Actions */}
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-1.5">
              {onAutoFitQuadrantSizes && (
                <button
                  onClick={() => onAutoFitQuadrantSizes(activeLayer)}
                  className="flex-1 py-1 px-2 bg-[#059669] hover:bg-[#047857] text-white font-technical uppercase font-bold text-[10px] rounded-[3px] transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                  title={`Automatically fit quadrant sizes for Layer ${activeLayer} based on its initiative coordinates`}
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Auto-Fit Layer</span>
                </button>
              )}
              <button
                onClick={() => setIsDetailedQuadrantHudOpen(!isDetailedQuadrantHudOpen)}
                className={`py-1 px-2 text-[10px] font-technical uppercase rounded-[3px] transition-colors flex items-center space-x-1 cursor-pointer border ${
                  isDetailedQuadrantHudOpen
                    ? 'bg-[#374151] text-white border-gray-500'
                    : 'bg-[#1F2937] hover:bg-[#374151] text-gray-300 border-gray-700'
                }`}
                title="Toggle individual quadrant width and height sliders"
              >
                <Sliders className="w-3 h-3" />
                <span>Details</span>
              </button>
              {onResetQuadrantSizes && (
                <button
                  onClick={() => onResetQuadrantSizes(activeLayer)}
                  className="py-1 px-2 bg-[#1F2937] hover:bg-red-900/40 text-gray-300 hover:text-red-200 text-[10px] font-technical uppercase rounded-[3px] transition-colors border border-gray-700 cursor-pointer"
                  title={`Reset Layer ${activeLayer} quadrant sizes to default`}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Detailed Per-Quadrant Sliders */}
            {isDetailedQuadrantHudOpen && (
              <div className="pt-2 border-t border-gray-800 space-y-2 text-[11px] animate-in fade-in duration-150">
                <div className="text-[10px] font-technical uppercase text-gray-400">
                  Individual Quadrant Dimensions:
                </div>
                {(['Inner', 'Social', 'Cultural', 'Systems'] as CategoryQuadrant[]).map(q => {
                  const colors: Record<CategoryQuadrant, string> = {
                    Inner: '#A78BFA',
                    Social: '#FDE047',
                    Cultural: '#86EFAC',
                    Systems: '#7DD3FC'
                  };
                  return (
                    <div key={q} className="bg-black/20 p-1.5 rounded-[3px] space-y-1">
                      <div className="flex items-center justify-between font-editorial font-bold" style={{ color: colors[q] }}>
                        <span>{q} Change</span>
                        <span className="font-mono text-[10px]">
                          {currentQuadrantSizes[q].width} × {currentQuadrantSizes[q].height}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center space-x-1">
                          <span className="text-[9px] text-gray-400">W:</span>
                          <input
                            type="range"
                            min="450"
                            max="2500"
                            step="25"
                            value={currentQuadrantSizes[q].width}
                            onChange={(e) => {
                              if (onUpdateQuadrantSizes) {
                                onUpdateQuadrantSizes({
                                  ...currentQuadrantSizes,
                                  [q]: { ...currentQuadrantSizes[q], width: Number(e.target.value) }
                                }, activeLayer);
                              }
                            }}
                            className="w-full accent-white cursor-pointer"
                          />
                        </label>
                        <label className="flex items-center space-x-1">
                          <span className="text-[9px] text-gray-400">H:</span>
                          <input
                            type="range"
                            min="450"
                            max="2500"
                            step="25"
                            value={currentQuadrantSizes[q].height}
                            onChange={(e) => {
                              if (onUpdateQuadrantSizes) {
                                onUpdateQuadrantSizes({
                                  ...currentQuadrantSizes,
                                  [q]: { ...currentQuadrantSizes[q], height: Number(e.target.value) }
                                }, activeLayer);
                              }
                            }}
                            className="w-full accent-white cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-[9px] text-gray-400 italic pt-1 border-t border-gray-800 flex items-center justify-between">
              <span>• Drag corner handles on map or use sliders</span>
              <span className="text-gray-500">Auto-saved</span>
            </div>
          </div>
        )
      )}

      {/* EDIT MODE BOTTOM STATUS RIBBON */}
      {editMode && (
        <div className="edit-status-ribbon absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#111827]/95 text-white px-4 py-2 rounded-[6px] shadow-lg border border-[#374151] flex items-center space-x-2.5 text-xs font-sans max-w-[95vw]">
          <Globe className="w-4 h-4 text-[#D9C01B] shrink-0" />
          <span className="truncate">
            <strong className="text-[#D9C01B]">Edit Mode:</strong> Drag archipelago or nodes • <span className="text-[#93C5FD]">Saved locally</span>
          </span>

          {/* Undo and Redo buttons in ribbon */}
          <div className="flex items-center space-x-1 pl-1 pr-1 border-l border-r border-[#374151] my-[-2px] py-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`px-2 py-1 rounded-[3px] text-[11px] font-semibold transition-all flex items-center space-x-1 ${
                canUndo
                  ? 'bg-[#1F2937] hover:bg-[#374151] text-[#F3F4F6] cursor-pointer shadow-xs'
                  : 'text-[#6B7280] opacity-40 cursor-not-allowed'
              }`}
              title={canUndo ? "Undo latest edit (Ctrl+Z or Cmd+Z)" : "Undo (Ctrl+Z) — Nothing to undo"}
            >
              <Undo2 className="w-3.5 h-3.5 text-[#D9C01B]" />
              <span>Undo</span>
              <span className="text-[9px] text-[#9CA3AF] font-normal hidden sm:inline">(Ctrl+Z)</span>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`px-2 py-1 rounded-[3px] text-[11px] font-semibold transition-all flex items-center space-x-1 ${
                canRedo
                  ? 'bg-[#1F2937] hover:bg-[#374151] text-[#F3F4F6] cursor-pointer shadow-xs'
                  : 'text-[#6B7280] opacity-40 cursor-not-allowed'
              }`}
              title={canRedo ? "Redo edit (Ctrl+Y or Cmd+Shift+Z)" : "Redo (Ctrl+Y) — Nothing to redo"}
            >
              <Redo2 className="w-3.5 h-3.5 text-[#D9C01B]" />
              <span>Redo</span>
            </button>
          </div>

          {hasUncommittedChanges && onDismissChanges && (
            <button
              type="button"
              id="canvas-dismiss-changes-btn"
              onClick={() => onDismissChanges(false)}
              className="ml-1 px-2.5 py-1 bg-[#374151] hover:bg-[#DC2626] text-white font-semibold text-[11px] rounded-[3px] transition-all whitespace-nowrap cursor-pointer shadow-xs flex items-center space-x-1 shrink-0 border border-[#4B5563] hover:border-[#EF4444]"
              title="Dismiss all uncommitted changes and revert map to last saved cloud version"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#FCA5A5]" />
              <span>Dismiss</span>
            </button>
          )}
          {hasUncommittedChanges && onCommitCloud && (
            <button
              onClick={onCommitCloud}
              className="px-2.5 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[11px] rounded-[3px] transition-all whitespace-nowrap cursor-pointer shadow-xs flex items-center space-x-1 shrink-0"
              title="Commit pending local changes to Firestore cloud database now"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Commit</span>
            </button>
          )}
          {onOpenPositionSnapshotModal && (
            <button
              onClick={onOpenPositionSnapshotModal}
              className="px-2.5 py-1 bg-white hover:bg-[#FAF8F5] text-[#111827] border border-[#D1D5DB] font-semibold text-[11px] rounded-[3px] transition-all whitespace-nowrap cursor-pointer shadow-xs flex items-center space-x-1 shrink-0"
              title="Export or Import snapshot of entity and archipelago positions"
            >
              <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Snapshot</span>
            </button>
          )}
          {onRecalculateLayout && (
            <button
              onClick={() => onRecalculateLayout(true)}
              className="ml-1 px-3 py-1 bg-[#D9C01B] hover:bg-[#c9b218] text-[#111827] font-semibold text-[11px] rounded-[3px] transition-all whitespace-nowrap cursor-pointer shadow-xs flex items-center space-x-1.5 shrink-0"
              title="Re-calculate node positions in the map and organize all archipelagos cleanly into their quadrants"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#111827]" />
              <span>Re-calculate</span>
            </button>
          )}
        </div>
      )}

      {/* MAP CONTROLS FLOATING BAR */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
        {/* Edit Mode Tool Selection */}
        {editMode && (
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] shadow-xs flex flex-col p-1 space-y-1">
            <button
              onClick={() => setEditToolMode('pan')}
              title="Pan Tool (H) — Drag to pan the map (or hold Spacebar anytime)"
              className={`p-1.5 rounded-[2px] transition-colors flex items-center justify-center cursor-pointer ${
                editToolMode === 'pan' || isSpacePressed
                  ? 'bg-[#111827] text-[#D9C01B] shadow-xs'
                  : 'text-[#4B5563] hover:bg-[#FAF8F5] hover:text-[#111827]'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditToolMode('select')}
              title="Box Select Tool (V) — Click and drag on canvas to multi-select entities"
              className={`p-1.5 rounded-[2px] transition-colors flex items-center justify-center cursor-pointer ${
                editToolMode === 'select' && !isSpacePressed
                  ? 'bg-[#111827] text-[#D9C01B] shadow-xs'
                  : 'text-[#4B5563] hover:bg-[#FAF8F5] hover:text-[#111827]'
              }`}
            >
              <span className="text-xs font-bold leading-none select-none">⬚</span>
            </button>

            <div className="h-px bg-[#E5E7EB] my-0.5" />

            <button
              onClick={onUndo}
              disabled={!canUndo}
              title={canUndo ? "Undo latest edit (Ctrl+Z or Cmd+Z)" : "Undo (Ctrl+Z) — Nothing to undo"}
              className={`p-1.5 rounded-[2px] transition-colors flex items-center justify-center ${
                canUndo 
                  ? 'text-[#111827] hover:bg-[#FAF8F5] hover:text-[#D9C01B] cursor-pointer' 
                  : 'text-[#D1D5DB] cursor-not-allowed opacity-40'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title={canRedo ? "Redo edit (Ctrl+Y or Cmd+Shift+Z)" : "Redo (Ctrl+Y) — Nothing to redo"}
              className={`p-1.5 rounded-[2px] transition-colors flex items-center justify-center ${
                canRedo 
                  ? 'text-[#111827] hover:bg-[#FAF8F5] hover:text-[#D9C01B] cursor-pointer' 
                  : 'text-[#D1D5DB] cursor-not-allowed opacity-40'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <div className="h-px bg-[#E5E7EB] my-0.5" />

            {onOpenPositionSnapshotModal && (
              <button
                onClick={onOpenPositionSnapshotModal}
                title="Positions Snapshot (Export / Import JSON)"
                className="p-1.5 rounded-[2px] transition-colors flex items-center justify-center cursor-pointer text-[#4B5563] hover:bg-[#FAF8F5] hover:text-[#2563EB]"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="bg-white border border-[#E5E7EB] rounded-[4px] shadow-xs flex flex-col p-1 space-y-1">
          <button
            onClick={() => handleZoom(0.2)}
            title="Zoom In"
            className="p-1.5 hover:bg-[#FAF8F5] text-[#111827] rounded-[2px] transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            title="Zoom Out"
            className="p-1.5 hover:bg-[#FAF8F5] text-[#111827] rounded-[2px] transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport({ x: 0, y: 0, zoom: 0.75 })}
            title="Reset Map Center"
            className="p-1.5 hover:bg-[#FAF8F5] text-[#111827] rounded-[2px] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Indicator */}
        <div className="bg-white/90 backdrop-blur-xs border border-[#E5E7EB] px-2 py-1 rounded-[4px] shadow-xs text-center">
          <span className="font-technical text-[10px] text-[#8C877F] font-semibold">
            {Math.round(viewport.zoom * 100)}%
          </span>
        </div>
      </div>

      {/* CHANGELOG WIDGET IN BOTTOM RIGHT OF MAP */}
      <div className="absolute bottom-4 right-4 z-30">
        <ChangelogWidget editMode={editMode} />
      </div>
    </div>
  );
};
