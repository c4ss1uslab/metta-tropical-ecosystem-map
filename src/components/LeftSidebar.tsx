import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Filter, Lock, Unlock, Save, RotateCcw, 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Tag, Globe, Sparkles, SlidersHorizontal, CheckSquare, Square, Navigation, MapPin, Eye, EyeOff, X,
  Check, Ban, ArrowRight, ExternalLink, Mail, Calendar, AlertCircle
} from 'lucide-react';
import { CategoryQuadrant, EntityType, FilterState, FieldCluster, ContinentInfo, SidebarListScope, EcosystemEntity, DataQualityStatus, DataCompletenessLevel, DATA_COMPLETENESS_LEVELS, DATA_COMPLETENESS_CONFIG, getEntityCompleteness, getCompletenessConfig, ContributionSubmission } from '../types';
import { entityMatchesArchipelago, normalizeArchipelagoBaseName, formatClusterWithNumber } from '../utils/layoutGenerator';
import { getEntitySpreadsheetField, splitLanguageValues, splitRelationshipValues } from '../utils/excelParser';
import { 
  getStoredContributions, 
  updateContributionStatus, 
  subscribeToPipelineUpdates, 
  getPendingContributionsCount 
} from '../utils/contributionPipeline';
import { EditModePasswordModal } from './EditModePasswordModal';
import { FilterCommentHelpPopup } from './FilterCommentHelpPopup';
import { MultiSelectFilterDropdown } from './MultiSelectFilterDropdown';
import { MapLayersModal } from './MapLayersModal';
import { 
  calculateLayerCounts, 
  formatLayerEntitiesBreakdown, 
  getLayer1Relationships, 
  getLayer2Relationships 
} from '../utils/layerClassifier';

interface LeftSidebarProps {
  collapsed?: boolean;
  setCollapsed?: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void);
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  fieldClusters: FieldCluster[];
  continents: ContinentInfo[];
  entities?: EcosystemEntity[];
  activeListScope?: SidebarListScope | null;
  setActiveListScope?: (scope: SidebarListScope | null) => void;
  selectedEntity?: EcosystemEntity | null;
  setSelectedEntity?: (entity: EcosystemEntity | null) => void;
  selectedContinentName?: string | null;
  onSelectContinent?: (continentName: string | null, keepSidebarOpen?: boolean) => void;
  onSelectCategoryList?: (category: CategoryQuadrant, entityType?: EntityType) => void;
  onSelectRelationshipList?: (relationship: string, entityType?: EntityType) => void;
  onSelectEntityTypeList?: (entityType: EntityType | 'All') => void;
  onSelectTagList?: (tag: string, category?: CategoryQuadrant) => void;
  onFlyToQuadrant?: (category: CategoryQuadrant) => void;
  onFlyToFieldCluster?: (fc: FieldCluster) => void;
  locations?: string[];
  languages?: string[];
  stages?: string[];
  editMode: boolean;
  setEditMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  showContinents?: boolean;
  setShowContinents?: React.Dispatch<React.SetStateAction<boolean>>;
  showRelationships?: boolean;
  setShowRelationships?: React.Dispatch<React.SetStateAction<boolean>>;
  showEcotones: boolean;
  setShowEcotones: React.Dispatch<React.SetStateAction<boolean>>;
  onSavePositions: () => void;
  onResetLayout: () => void;
  onAutoArrange?: () => void;
  onRecalculateLayout?: (resetCustom?: boolean) => void;
  onFlyToContinent?: (continent: ContinentInfo) => void;
  totalFilteredCount: number;
  totalCount: number;
  onOpenReviewPipeline?: () => void;
  onUpdateEntity?: (entity: EcosystemEntity) => void;
  cloudSyncStatus?: {
    state: 'idle' | 'syncing' | 'saved' | 'saved_locally' | 'quota_exceeded' | 'error';
    message?: string;
  };
  hasUncommittedChanges?: boolean;
  onCommitChanges?: () => void;
  onDismissChanges?: (alsoExitEditMode?: boolean) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  collapsed: externalCollapsed,
  setCollapsed: setExternalCollapsed,
  filterState,
  setFilterState,
  fieldClusters,
  continents,
  entities = [],
  activeListScope,
  setActiveListScope,
  selectedEntity,
  setSelectedEntity,
  selectedContinentName,
  onSelectContinent,
  onSelectCategoryList,
  onSelectRelationshipList,
  onSelectEntityTypeList,
  onSelectTagList,
  onFlyToQuadrant,
  onFlyToFieldCluster,
  locations = [],
  languages = [],
  stages = [],
  editMode,
  setEditMode,
  showContinents,
  setShowContinents,
  showRelationships,
  setShowRelationships,
  showEcotones,
  setShowEcotones,
  onSavePositions,
  onResetLayout,
  onAutoArrange,
  onRecalculateLayout,
  onFlyToContinent,
  totalFilteredCount,
  totalCount,
  onOpenReviewPipeline,
  onUpdateEntity,
  cloudSyncStatus,
  hasUncommittedChanges = false,
  onCommitChanges,
  onDismissChanges
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setCollapsed = setExternalCollapsed !== undefined ? setExternalCollapsed : setInternalCollapsed;
  const [fieldSearch, setFieldSearch] = useState('');
  const [continentSearch, setContinentSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'filters' | 'continents' | 'fields' | 'positions' | 'review'>('filters');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isBasicFiltersExpanded, setIsBasicFiltersExpanded] = useState(true);
  const [isAdvancedFiltersExpanded, setIsAdvancedFiltersExpanded] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Pipeline submissions state
  const [pipelineSubmissions, setPipelineSubmissions] = useState<ContributionSubmission[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pipelineFilter, setPipelineFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    const refresh = () => {
      setPipelineSubmissions(getStoredContributions());
      setPendingCount(getPendingContributionsCount());
    };
    refresh();
    const unsub = subscribeToPipelineUpdates(refresh);
    return () => unsub();
  }, []);

  // Data Quality Pop-up State
  const [showDqTooltip, setShowDqTooltip] = useState(false);
  const dqButtonRef = useRef<HTMLButtonElement>(null);
  const dqTooltipRef = useRef<HTMLDivElement>(null);
  const [dqTooltipPos, setDqTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const dqCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDqTooltipPos = () => {
    if (dqButtonRef.current) {
      const rect = dqButtonRef.current.getBoundingClientRect();
      const tooltipWidth = 320;
      // Position to the right of the question mark button
      let left = rect.right + 10;
      // If it would overflow viewport right, place it to the left of the button
      if (left + tooltipWidth > window.innerWidth - 12) {
        left = Math.max(12, rect.left - tooltipWidth - 10);
      }
      // Vertically align with button, keeping inside viewport bounds
      let top = rect.top - 8;
      if (top + 240 > window.innerHeight - 12) {
        top = Math.max(12, window.innerHeight - 250);
      }
      setDqTooltipPos({ top, left });
    }
  };

  const handleDqMouseEnter = () => {
    if (dqCloseTimeoutRef.current) {
      clearTimeout(dqCloseTimeoutRef.current);
      dqCloseTimeoutRef.current = null;
    }
    updateDqTooltipPos();
    setShowDqTooltip(true);
  };

  const handleDqMouseLeave = () => {
    dqCloseTimeoutRef.current = setTimeout(() => {
      setShowDqTooltip(false);
    }, 200);
  };

  useEffect(() => {
    if (!showDqTooltip) return;

    const handleScrollOrResize = () => {
      updateDqTooltipPos();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dqButtonRef.current &&
        !dqButtonRef.current.contains(e.target as Node) &&
        dqTooltipRef.current &&
        !dqTooltipRef.current.contains(e.target as Node)
      ) {
        setShowDqTooltip(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDqTooltip(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (dqCloseTimeoutRef.current) {
        clearTimeout(dqCloseTimeoutRef.current);
      }
    };
  }, [showDqTooltip]);

  // Our Relationship Dropdown State (Multi-select)
  const [isRelDropdownOpen, setIsRelDropdownOpen] = useState(false);
  const relDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRelDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (relDropdownRef.current && !relDropdownRef.current.contains(e.target as Node)) {
        setIsRelDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRelDropdownOpen]);

  // When leaving edit mode, automatically switch away from Lock or Review tab if it was active
  useEffect(() => {
    if (!editMode && (activeTab === 'positions' || activeTab === 'review')) {
      setActiveTab('filters');
    }
  }, [editMode, activeTab]);

  // Category Quadrant info
  const categoriesList: { key: CategoryQuadrant; label: string; color: string; desc: string }[] = [
    { key: 'Inner', label: 'Inner Change', color: '#5B21B6', desc: 'Upper Left • Self & Contemplation' },
    { key: 'Social', label: 'Social Change', color: '#111827', desc: 'Upper Right • Civic & Commons' },
    { key: 'Cultural', label: 'Cultural Change', color: '#7D8764', desc: 'Bottom Left • Mythos & Narrative' },
    { key: 'Systems', label: 'Systems Change', color: '#0284C7', desc: 'Bottom Right • Ecosystems & Infrastructure' }
  ];

  // Continent tag visibility toggle
  const toggleContinentHidden = (continentName: string) => {
    setFilterState(prev => {
      const isHidden = prev.hiddenContinents.includes(continentName);
      return {
        ...prev,
        hiddenContinents: isHidden
          ? prev.hiddenContinents.filter(c => c !== continentName)
          : [...prev.hiddenContinents, continentName]
      };
    });
  };

  const showAllContinents = () => {
    setFilterState(prev => ({ ...prev, hiddenContinents: [] }));
  };

  const hideAllContinents = () => {
    const allNames = continents.map(c => c.name);
    setFilterState(prev => ({ ...prev, hiddenContinents: allNames }));
  };

  const continentsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedContinentName && activeTab === 'continents') {
      continentsListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedContinentName, activeTab]);

  // Helper to extract leading numeric prefix for sorting archipelagos in order (1., 2. etc.)
  const getArchipelagoNum = (name: string): number => {
    const match = name.match(/^(\d+)[\.\)]/);
    return match ? parseInt(match[1], 10) : 999999;
  };

  const isArchipelagoSelected = useCallback((contName: string) => {
    const target = selectedContinentName || (activeListScope?.type === 'continent' ? activeListScope.name : null);
    if (!target) return false;
    return contName === target ||
      formatClusterWithNumber(contName).toLowerCase() === formatClusterWithNumber(target).toLowerCase() ||
      normalizeArchipelagoBaseName(contName) === normalizeArchipelagoBaseName(target);
  }, [selectedContinentName, activeListScope]);

  // Filter archipelagos matching search
  const matchingContinents = useMemo(() => {
    const search = continentSearch.trim().toLowerCase();
    if (!search) return continents;
    return continents.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.category.toLowerCase().includes(search)
    );
  }, [continents, continentSearch]);

  // Selected archipelago (moves to top of list when selected)
  const selectedArchipelago = useMemo(() => {
    return matchingContinents.find(c => isArchipelagoSelected(c.name)) || null;
  }, [matchingContinents, isArchipelagoSelected]);

  // Unselected archipelagos, sorted by quadrant then numerical order (1., 2. etc.) within each quadrant
  const unselectedContinents = useMemo(() => {
    const unselected = matchingContinents.filter(c => !isArchipelagoSelected(c.name));
    const quadrantOrder: Record<CategoryQuadrant, number> = {
      Inner: 0,
      Social: 1,
      Cultural: 2,
      Systems: 3
    };

    return [...unselected].sort((a, b) => {
      const qA = quadrantOrder[a.category] ?? 99;
      const qB = quadrantOrder[b.category] ?? 99;
      if (qA !== qB) {
        return qA - qB;
      }
      const numA = getArchipelagoNum(a.name);
      const numB = getArchipelagoNum(b.name);
      if (numA !== numB) {
        return numA - numB;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [matchingContinents, isArchipelagoSelected]);

  const filteredContinents = matchingContinents;

  const filteredFieldClusters = useMemo(() => {
    return fieldClusters
      .filter(f => f.name.toLowerCase().includes(fieldSearch.toLowerCase()))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [fieldClusters, fieldSearch]);

  // Entity type counts for the top entity counts bar
  const totalEntityCount = entities.length;
  const orgCount = useMemo(() => entities.filter(e => e.type === 'Organization').length, [entities]);
  const personCount = useMemo(() => entities.filter(e => e.type === 'Person').length, [entities]);
  const ideaCount = useMemo(() => entities.filter(e => e.type === 'Idea').length, [entities]);
  const mediaCount = useMemo(() => entities.filter(e => e.type === 'Media').length, [entities]);

  const isTotalActive = activeListScope?.type === 'entityType' && activeListScope.entityType === 'All';
  const isOrgActive = activeListScope?.type === 'entityType' && activeListScope.entityType === 'Organization';
  const isPersonActive = activeListScope?.type === 'entityType' && activeListScope.entityType === 'Person';
  const isIdeaActive = activeListScope?.type === 'entityType' && activeListScope.entityType === 'Idea';
  const isMediaActive = activeListScope?.type === 'entityType' && activeListScope.entityType === 'Media';

  // Data Completeness counts across active dataset
  const dataCompletenessCounts = useMemo(() => {
    const counts: Record<DataCompletenessLevel, number> = {
      'Top 10%': 0,
      'Top 25%': 0,
      'Top 50%': 0,
      'Top 75%': 0,
      'Bottom 25%': 0
    };
    entities.forEach(e => {
      const q: DataCompletenessLevel = getEntityCompleteness(e);
      counts[q] = (counts[q] || 0) + 1;
    });
    return counts;
  }, [entities]);

  // Data Completeness Categories mapping (5 percentile levels)
  const dataCompletenessCategories = useMemo(() => {
    return DATA_COMPLETENESS_LEVELS.map(lvl => getCompletenessConfig(lvl));
  }, []);

  // ==========================================
  // SPREADSHEET FILTER DATA OPTIONS
  // ==========================================

  // S2 — Our Relationship
  const ourRelationships = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'S2') || e.ourRelationship;
      if (val) {
        splitRelationshipValues(val).forEach(r => {
          const trimmed = r.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort((a, b) => {
      // Sort numbered items like "1) ...", "2) ...", "3) ..." numerically
      const matchA = a.match(/^(\d+)/);
      const matchB = b.match(/^(\d+)/);
      if (matchA && matchB) {
        return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
      }
      if (matchA) return -1;
      if (matchB) return 1;
      return a.localeCompare(b);
    });
  }, [entities]);

  // Map Layers (Layer 1, Layer 2, Layer 3)
  const activeLayer = filterState.activeLayer ?? 1;
  const [isLayerSectionOpen, setIsLayerSectionOpen] = useState(false);
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false);
  const [layerModalInitialTab, setLayerModalInitialTab] = useState<1 | 2 | 3 | 'all'>('all');

  const handleOpenLayerModal = (tab: 1 | 2 | 3 | 'all' = 'all') => {
    setLayerModalInitialTab(tab);
    setIsLayerModalOpen(true);
  };

  const layer1Counts = useMemo(() => calculateLayerCounts(entities, 1), [entities]);
  const layer2Counts = useMemo(() => calculateLayerCounts(entities, 2), [entities]);
  const layer3Counts = useMemo(() => calculateLayerCounts(entities, 3), [entities]);

  // Layer 1 specific relationships (1 to 6)
  const layer1Relationships = useMemo(() => {
    return getLayer1Relationships(entities, ourRelationships);
  }, [entities, ourRelationships]);

  // Layer 2 specific relationships (7 to 9)
  const layer2Relationships = useMemo(() => {
    return getLayer2Relationships(entities, ourRelationships);
  }, [entities, ourRelationships]);

  // Relationships allowed/applicable for current active layer
  const currentLayerAllowedRelationships = useMemo(() => {
    if (activeLayer === 2) return layer2Relationships;
    if (activeLayer === 1) return layer1Relationships;
    if (activeLayer === 'all') return [...layer1Relationships, ...layer2Relationships];
    return layer1Relationships;
  }, [activeLayer, layer1Relationships, layer2Relationships]);

  // Active selected relationships for multi-selection (defaults to all Layer 1 relationships for layer 1, and all Layer 2 relationships for layer 2)
  const activeOurRels = useMemo(() => {
    if (filterState.selectedOurRelationships !== undefined && filterState.selectedOurRelationships.length > 0) {
      if (filterState.selectedOurRelationships.includes('none')) {
        return [];
      }
      const filtered = filterState.selectedOurRelationships.filter(r => r !== 'All' && currentLayerAllowedRelationships.includes(r));
      if (filtered.length > 0) {
        return filtered;
      }
    }
    if (filterState.selectedOurRelationship) {
      if (filterState.selectedOurRelationship === 'none') return [];
      if (filterState.selectedOurRelationship !== 'All' && currentLayerAllowedRelationships.includes(filterState.selectedOurRelationship)) {
        return [filterState.selectedOurRelationship];
      }
    }
    // Default state: all relationships for current active layer (1-6 for Layer 1, 7-9 for Layer 2)!
    return currentLayerAllowedRelationships;
  }, [filterState.selectedOurRelationships, filterState.selectedOurRelationship, currentLayerAllowedRelationships]);

  // Count entities for each relationship tag
  const ourRelationshipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ourRelationships.forEach(rel => {
      counts[rel] = 0;
    });
    // Ensure all layer 1 and layer 2 relationships exist in counts map
    [...layer1Relationships, ...layer2Relationships].forEach(rel => {
      if (counts[rel] === undefined) {
        counts[rel] = 0;
      }
    });
    entities.forEach(ent => {
      const val = getEntitySpreadsheetField(ent, 'S2') || ent.ourRelationship;
      if (val) {
        const valLower = val.toLowerCase().trim();
        const discreteItems = splitRelationshipValues(val).map(s => s.toLowerCase().trim());
        [...ourRelationships, ...layer1Relationships, ...layer2Relationships].forEach(rel => {
          const rLower = rel.toLowerCase().trim();
          if (valLower === rLower || discreteItems.includes(rLower) || valLower.includes(rLower)) {
            counts[rel] = (counts[rel] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [entities, ourRelationships, layer1Relationships, layer2Relationships]);

  const layer1RelationshipOptions = useMemo(() => {
    return layer1Relationships.map(r => ({
      value: r,
      label: r,
      count: ourRelationshipCounts[r] || 0
    }));
  }, [layer1Relationships, ourRelationshipCounts]);

  const layer2RelationshipOptions = useMemo(() => {
    return layer2Relationships.map(r => ({
      value: r,
      label: r,
      count: ourRelationshipCounts[r] || 0
    }));
  }, [layer2Relationships, ourRelationshipCounts]);

  // Handler to switch layers and auto-select corresponding relationships
  const handleSelectLayer = useCallback((targetLayer: 1 | 2 | 3 | 'all') => {
    if (targetLayer === 2) {
      setFilterState(prev => ({
        ...prev,
        activeLayer: 2,
        selectedOurRelationships: layer2Relationships,
        selectedOurRelationship: layer2Relationships.join(', ')
      }));
    } else if (targetLayer === 1) {
      setFilterState(prev => ({
        ...prev,
        activeLayer: 1,
        selectedOurRelationships: layer1Relationships,
        selectedOurRelationship: layer1Relationships.join(', ')
      }));
    } else if (targetLayer === 'all') {
      const allRels = [...layer1Relationships, ...layer2Relationships];
      setFilterState(prev => ({
        ...prev,
        activeLayer: 'all',
        selectedOurRelationships: allRels,
        selectedOurRelationship: allRels.join(', ')
      }));
    } else {
      setFilterState(prev => ({
        ...prev,
        activeLayer: targetLayer
      }));
    }
  }, [layer1Relationships, layer2Relationships, setFilterState]);

  const toggleOurRelationship = (rel: string) => {
    setFilterState(prev => {
      const current = prev.selectedOurRelationships !== undefined && prev.selectedOurRelationships.length > 0
        ? (prev.selectedOurRelationships.includes('none') ? [] : prev.selectedOurRelationships.filter(r => r !== 'All'))
        : (prev.selectedOurRelationship && prev.selectedOurRelationship !== 'All'
            ? (prev.selectedOurRelationship === 'none' ? [] : [prev.selectedOurRelationship])
            : currentLayerAllowedRelationships);

      const exists = current.includes(rel);
      const updated = exists ? current.filter(r => r !== rel) : [...current, rel];

      return {
        ...prev,
        selectedOurRelationships: updated.length === 0 ? ['none'] : updated,
        selectedOurRelationship: updated.length === 1 ? updated[0] : (updated.length === 0 ? 'none' : updated.join(', '))
      };
    });
  };

  const clearOurRelationships = () => {
    setFilterState(prev => ({
      ...prev,
      selectedOurRelationships: ['none'],
      selectedOurRelationship: 'none'
    }));
  };

  // Render Our Relationship field attached to active Layer (Layer 1: 1-6, Layer 2: 7-9)
  const renderOurRelationshipDropdown = (targetLayer?: 1 | 2 | 'all') => {
    const layer = targetLayer ?? (activeLayer === 2 ? 2 : (activeLayer === 'all' ? 'all' : 1));

    if (layer === 2) {
      return (
        <div className="space-y-1">
          <MultiSelectFilterDropdown
            id="map-ourRelationship-layer2"
            label="Our Relationship"
            singularLabel="relationship"
            pluralLabel="relationships"
            options={layer2RelationshipOptions}
            selectedValues={activeOurRels}
            onChange={(newVals) => {
              setFilterState(prev => ({
                ...prev,
                selectedOurRelationships: newVals.length === 0 ? ['none'] : newVals,
                selectedOurRelationship: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'none' : newVals.join(', '))
              }));
            }}
            totalEntitiesCount={layer2Counts.total}
            isOpen={openDropdownId === 'map-ourRelationship-layer2'}
            onToggle={() => setOpenDropdownId(prev => prev === 'map-ourRelationship-layer2' ? null : 'map-ourRelationship-layer2')}
            onClose={() => setOpenDropdownId(null)}
            allSelectedDisplayText="Active Relationships: 7-9"
            allSelectedLabel="All Active Relationships (7-9)"
          />

          {/* Active Relationship Scope indicator & Quick Sidebar List Link */}
          {activeListScope?.type === 'relationship' ? (
            <div className="mt-1.5 flex items-center justify-between px-2.5 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[4px] text-[11px] font-sans">
              <div className="flex items-center space-x-1.5 truncate min-w-0 pr-1">
                <span className="text-xs shrink-0 select-none">🤝</span>
                <span className="text-[#1D4ED8] font-semibold truncate">
                  List Open: {activeListScope.relationship}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveListScope?.(null);
                  setFilterState(prev => ({
                    ...prev,
                    selectedOurRelationships: layer2Relationships,
                    selectedOurRelationship: 'All'
                  }));
                }}
                className="text-[#1D4ED8] hover:text-[#AD2831] font-bold px-1 py-0.5 rounded hover:bg-black/5 cursor-pointer shrink-0"
                title="Close relationship list view"
              >
                ✕
              </button>
            </div>
          ) : (
            activeOurRels.length === 1 && onSelectRelationshipList && (
              <button
                type="button"
                onClick={() => onSelectRelationshipList(activeOurRels[0])}
                className="mt-1.5 text-[10.5px] font-technical text-[#1D4ED8] hover:text-[#1E40AF] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
                title={`Show "${activeOurRels[0]}" list in right sidebar`}
              >
                <span>Show in right sidebar →</span>
              </button>
            )
          )}
        </div>
      );
    }

    // Default: Layer 1 (or All)
    return (
      <div className="space-y-1">
        <MultiSelectFilterDropdown
          id="map-ourRelationship"
          label="Our Relationship"
          singularLabel="relationship"
          pluralLabel="relationships"
          options={layer === 'all' ? [...layer1RelationshipOptions, ...layer2RelationshipOptions] : layer1RelationshipOptions}
          selectedValues={activeOurRels}
          onChange={(newVals) => {
            setFilterState(prev => ({
              ...prev,
              selectedOurRelationships: newVals.length === 0 ? ['none'] : newVals,
              selectedOurRelationship: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'none' : newVals.join(', '))
            }));
          }}
          totalEntitiesCount={layer === 'all' ? layer1Counts.total + layer2Counts.total : layer1Counts.total}
          isOpen={openDropdownId === 'map-ourRelationship'}
          onToggle={() => setOpenDropdownId(prev => prev === 'map-ourRelationship' ? null : 'map-ourRelationship')}
          onClose={() => setOpenDropdownId(null)}
          allSelectedDisplayText={layer === 'all' ? 'Active Relationships: All (1-9)' : 'Active Relationships: 1-6'}
          allSelectedLabel={layer === 'all' ? 'All Active Relationships (1-9)' : 'All Active Relationships (1-6)'}
        />

        {/* Active Relationship Scope indicator & Quick Sidebar List Link */}
        {activeListScope?.type === 'relationship' ? (
          <div className="mt-1.5 flex items-center justify-between px-2.5 py-1.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[4px] text-[11px] font-sans">
            <div className="flex items-center space-x-1.5 truncate min-w-0 pr-1">
              <span className="text-xs shrink-0 select-none">🤝</span>
              <span className="text-[#15803D] font-semibold truncate">
                List Open: {activeListScope.relationship}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveListScope?.(null);
                setFilterState(prev => ({
                  ...prev,
                  selectedOurRelationships: layer === 'all' ? [...layer1Relationships, ...layer2Relationships] : layer1Relationships,
                  selectedOurRelationship: 'All'
                }));
              }}
              className="text-[#15803D] hover:text-[#AD2831] font-bold px-1 py-0.5 rounded hover:bg-black/5 cursor-pointer shrink-0"
              title="Close relationship list view"
            >
              ✕
            </button>
          </div>
        ) : (
          activeOurRels.length === 1 && onSelectRelationshipList && (
            <button
              type="button"
              onClick={() => onSelectRelationshipList(activeOurRels[0])}
              className="mt-1.5 text-[10.5px] font-technical text-[#15803D] hover:text-[#047857] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
              title={`Show "${activeOurRels[0]}" list in right sidebar`}
            >
              <span>Show in right sidebar →</span>
            </button>
          )
        )}
      </div>
    );
  };

  // AA2 — Language(s)
  const languagesList = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AA2') || e.language;
      if (val) {
        splitLanguageValues(val).forEach(l => {
          if (l) set.add(l);
        });
      }
    });
    // Fallback to languages prop if available
    if (set.size === 0 && languages && languages.length > 0) {
      languages.forEach(l => {
        splitLanguageValues(l).forEach(sub => {
          if (sub) set.add(sub);
        });
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities, languages]);

  // AE — Biome (Column AE in spreadsheet)
  const biomes = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AE') || getEntitySpreadsheetField(e, 'BIOME') || getEntitySpreadsheetField(e, 'AE2') || getEntitySpreadsheetField(e, 'AB2');
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [entities]);
  const bioregions = biomes;

  // AC2 — City, State
  const cityStates = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AC2');
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [entities]);

  // AD2 — Country
  const countries = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AD2');
      if (val) set.add(val);
    });
    // Fallback to locations if empty
    if (set.size === 0 && locations && locations.length > 0) {
      locations.forEach(loc => {
        if (loc) set.add(loc.trim());
      });
    }
    return Array.from(set).sort();
  }, [entities, locations]);

  // AK2 — Operating Region (Column AK in spreadsheet)
  const operatingRegions = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AK2') || getEntitySpreadsheetField(e, 'OPERATING REGION');
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [entities]);

  // AF2 — Operation Focus
  const operationFocuses = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AF2');
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [entities]);

  // AH2 — Maturity Level
  const maturityLevels = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AH2');
      if (val) set.add(val);
    });
    if (set.size === 0 && stages && stages.length > 0) {
      stages.forEach(st => {
        if (st) set.add(st.trim());
      });
    }
    return Array.from(set).sort();
  }, [entities, stages]);

  // AI2 — Size
  const sizes = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AI2');
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [entities]);

  // AJ2 — Reach
  const reaches = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AJ2');
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [entities]);

  // Helper to split multi-value cells (comma, semicolon, newline, pipe)
  const splitAdvancedFilterValues = (raw: string): string[] => {
    if (!raw) return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.includes('\n') || trimmed.includes(';') || trimmed.includes('|')) {
      return trimmed.split(/[\n;|]+/).map(s => s.trim()).filter(Boolean);
    }
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.every(p => p.length < 60)) {
        return parts;
      }
    }
    return [trimmed];
  };

  const cleanDatabaseLabel = (raw: string): string => {
    let clean = raw.trim();
    const mdMatch = clean.match(/^\[([^\]]+)\]\([^)]+\)$/);
    if (mdMatch) return mdMatch[1].trim();
    const bracketMatch = clean.match(/\[([^\]]+)\]/);
    if (bracketMatch) return bracketMatch[1].trim();
    return clean;
  };

  // 1. Situational Assessment
  const situationalAssessments = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'BA') || getEntitySpreadsheetField(e, 'Situational Assessment');
      if (val) {
        splitAdvancedFilterValues(val).forEach(v => {
          if (v && v !== '-' && v.toLowerCase() !== 'n/a' && v.toLowerCase() !== 'none') {
            set.add(v);
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  // 2. Value Meme / Ethical Orientation
  const valueMemes = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = e.valueMemeEthicalOrientation || getEntitySpreadsheetField(e, 'BH') || getEntitySpreadsheetField(e, 'Value Meme / Ethical Orientation');
      if (val) {
        splitAdvancedFilterValues(val).forEach(v => {
          if (v && v !== '-' && v.toLowerCase() !== 'n/a' && v.toLowerCase() !== 'none') {
            set.add(v);
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  // 3. Orientation to Change (Three Horizons)
  const orientations3H = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'BO') || getEntitySpreadsheetField(e, 'Orientation to Change (Three Horizons)');
      if (val) {
        splitAdvancedFilterValues(val).forEach(v => {
          if (v && v !== '-' && v.toLowerCase() !== 'n/a' && v.toLowerCase() !== 'none') {
            set.add(v);
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  // 4. Orientation to Change (GTDF)
  const orientationsGtdf = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'BP') || getEntitySpreadsheetField(e, 'Orientation to Change (GTDF)');
      if (val) {
        splitAdvancedFilterValues(val).forEach(v => {
          if (v && v !== '-' && v.toLowerCase() !== 'n/a' && v.toLowerCase() !== 'none') {
            set.add(v);
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  // 5. Orientation to Change (CRI)
  const orientationsCri = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'BQ') || getEntitySpreadsheetField(e, 'Orientation to Change (CRI)');
      if (val) {
        splitAdvancedFilterValues(val).forEach(v => {
          if (v && v !== '-' && v.toLowerCase() !== 'n/a' && v.toLowerCase() !== 'none') {
            set.add(v);
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  // 6. Matching Database
  const matchingDatabases = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'CB') || getEntitySpreadsheetField(e, 'Matching Database');
      if (val) {
        splitAdvancedFilterValues(val).forEach(v => {
          const cleaned = cleanDatabaseLabel(v);
          if (cleaned && cleaned !== '-' && cleaned.toLowerCase() !== 'n/a' && cleaned.toLowerCase() !== 'none') {
            set.add(cleaned);
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  // Archipelagos sorted and counts
  const sortedArchipelagos = useMemo(() => {
    return [...continents].sort((a, b) => {
      const matchA = a.name.match(/^(\d+)/);
      const matchB = b.name.match(/^(\d+)/);
      const numA = matchA ? parseInt(matchA[1], 10) : 999999;
      const numB = matchB ? parseInt(matchB[1], 10) : 999999;
      if (numA !== numB) {
        return numA - numB;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [continents]);

  const archipelagoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sortedArchipelagos.forEach(c => {
      counts[c.name] = c.count !== undefined ? c.count : entities.filter(e => entityMatchesArchipelago(e, c.name)).length;
    });
    return counts;
  }, [entities, sortedArchipelagos]);

  // Streams list and counts
  const streamsList = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'Stream') || e.stream;
      if (val && typeof val === 'string' && val.trim()) {
        val.split(/[,;/|\n]+/).forEach(s => {
          const trimmed = s.trim();
          if (trimmed) set.add(trimmed);
        });
      }
      if (e.streams && Array.isArray(e.streams)) {
        e.streams.forEach(s => {
          if (s && s.trim()) set.add(s.trim());
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  const streamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    streamsList.forEach(st => {
      const stLower = st.toLowerCase().trim();
      counts[st] = entities.filter(e => {
        const raw = getEntitySpreadsheetField(e, 'Stream') || e.stream;
        if (raw) {
          const parts = raw.split(/[,;/|\n]+/).map(p => p.trim().toLowerCase());
          if (parts.includes(stLower) || raw.toLowerCase().trim() === stLower) {
            return true;
          }
        }
        if (e.streams && e.streams.some(s => s.toLowerCase().trim() === stLower)) {
          return true;
        }
        return false;
      }).length;
    });
    return counts;
  }, [entities, streamsList]);

  // Extended logistics counts
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    countries.forEach(c => {
      const cLower = c.toLowerCase().trim();
      counts[c] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AD2') || e.location;
        return val && val.toLowerCase().trim() === cLower;
      }).length;
    });
    return counts;
  }, [entities, countries]);

  const cityStateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cityStates.forEach(cs => {
      const csLower = cs.toLowerCase().trim();
      counts[cs] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AC2');
        return val && val.toLowerCase().trim() === csLower;
      }).length;
    });
    return counts;
  }, [entities, cityStates]);

  const biomeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    biomes.forEach(b => {
      const bLower = b.toLowerCase().trim();
      counts[b] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AE') || getEntitySpreadsheetField(e, 'BIOME') || getEntitySpreadsheetField(e, 'AB2') || getEntitySpreadsheetField(e, 'AE2');
        return val && val.toLowerCase().trim() === bLower;
      }).length;
    });
    return counts;
  }, [entities, biomes]);

  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    languagesList.forEach(l => {
      const lLower = l.toLowerCase().trim();
      counts[l] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AA2') || e.language;
        if (!val) return false;
        const parts = splitLanguageValues(val).map(s => s.toLowerCase().trim());
        return parts.includes(lLower);
      }).length;
    });
    return counts;
  }, [entities, languagesList]);

  const operatingRegionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    operatingRegions.forEach(or => {
      const orLower = or.toLowerCase().trim();
      counts[or] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AE2') || getEntitySpreadsheetField(e, 'AK2') || getEntitySpreadsheetField(e, 'OPERATING REGION');
        return val && val.toLowerCase().trim() === orLower;
      }).length;
    });
    return counts;
  }, [entities, operatingRegions]);

  const operationFocusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    operationFocuses.forEach(of => {
      const ofLower = of.toLowerCase().trim();
      counts[of] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AF2');
        return val && val.toLowerCase().trim() === ofLower;
      }).length;
    });
    return counts;
  }, [entities, operationFocuses]);

  const maturityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    maturityLevels.forEach(m => {
      const mLower = m.toLowerCase().trim();
      counts[m] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AH2') || e.stage;
        return val && val.toLowerCase().trim() === mLower;
      }).length;
    });
    return counts;
  }, [entities, maturityLevels]);

  const sizeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sizes.forEach(s => {
      const sLower = s.toLowerCase().trim();
      counts[s] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AI2');
        return val && val.toLowerCase().trim() === sLower;
      }).length;
    });
    return counts;
  }, [entities, sizes]);

  const reachCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reaches.forEach(r => {
      const rLower = r.toLowerCase().trim();
      counts[r] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'AJ2');
        return val && val.toLowerCase().trim() === rLower;
      }).length;
    });
    return counts;
  }, [entities, reaches]);

  const situationalAssessmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    situationalAssessments.forEach(sa => {
      const saLower = sa.toLowerCase().trim();
      counts[sa] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'BA') || getEntitySpreadsheetField(e, 'Situational Assessment');
        return val && val.toLowerCase().includes(saLower);
      }).length;
    });
    return counts;
  }, [entities, situationalAssessments]);

  const valueMemeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    valueMemes.forEach(vm => {
      const vmLower = vm.toLowerCase().trim();
      counts[vm] = entities.filter(e => {
        const val = e.valueMemeEthicalOrientation || getEntitySpreadsheetField(e, 'BH') || getEntitySpreadsheetField(e, 'Value Meme / Ethical Orientation');
        return val && val.toLowerCase().includes(vmLower);
      }).length;
    });
    return counts;
  }, [entities, valueMemes]);

  const orientation3HCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orientations3H.forEach(oh => {
      const ohLower = oh.toLowerCase().trim();
      counts[oh] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'BO') || getEntitySpreadsheetField(e, 'Orientation to Change (Three Horizons)');
        return val && val.toLowerCase().includes(ohLower);
      }).length;
    });
    return counts;
  }, [entities, orientations3H]);

  const orientationGtdfCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orientationsGtdf.forEach(og => {
      const ogLower = og.toLowerCase().trim();
      counts[og] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'BP') || getEntitySpreadsheetField(e, 'Orientation to Change (GTDF)');
        return val && val.toLowerCase().includes(ogLower);
      }).length;
    });
    return counts;
  }, [entities, orientationsGtdf]);

  const orientationCriCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orientationsCri.forEach(oc => {
      const ocLower = oc.toLowerCase().trim();
      counts[oc] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'BQ') || getEntitySpreadsheetField(e, 'Orientation to Change (CRI)');
        return val && val.toLowerCase().includes(ocLower);
      }).length;
    });
    return counts;
  }, [entities, orientationsCri]);

  const matchingDatabaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    matchingDatabases.forEach(db => {
      const dbLower = db.toLowerCase().trim();
      counts[db] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'CB') || getEntitySpreadsheetField(e, 'Matching Database');
        if (!val) return false;
        const valLower = val.toLowerCase();
        const valClean = val.replace(/^\[([^\]]+)\]\([^)]+\)/, '$1').toLowerCase();
        return valLower.includes(dbLower) || valClean.includes(dbLower);
      }).length;
    });
    return counts;
  }, [entities, matchingDatabases]);

  // Active multi-select arrays
  const activeStreams = useMemo(() => {
    if (filterState.selectedStreams && filterState.selectedStreams.length > 0) {
      return filterState.selectedStreams.filter(s => s !== 'All');
    }
    if (filterState.selectedStream && filterState.selectedStream !== 'All') {
      return [filterState.selectedStream];
    }
    return [];
  }, [filterState.selectedStreams, filterState.selectedStream]);

  const activeContinents = useMemo(() => {
    return (filterState.selectedContinents || []).filter(c => c !== 'All');
  }, [filterState.selectedContinents]);

  const activeLanguages = useMemo(() => {
    if (filterState.selectedLanguages && filterState.selectedLanguages.length > 0) {
      return filterState.selectedLanguages.filter(l => l !== 'All');
    }
    if (filterState.selectedLanguage && filterState.selectedLanguage !== 'All') {
      return [filterState.selectedLanguage];
    }
    return [];
  }, [filterState.selectedLanguages, filterState.selectedLanguage]);

  const activeCountries = useMemo(() => {
    if (filterState.selectedCountries && filterState.selectedCountries.length > 0) {
      return filterState.selectedCountries.filter(c => c !== 'All');
    }
    if (filterState.selectedCountry && filterState.selectedCountry !== 'All') {
      return [filterState.selectedCountry];
    }
    return [];
  }, [filterState.selectedCountries, filterState.selectedCountry]);

  const activeCityStates = useMemo(() => {
    if (filterState.selectedCityStates && filterState.selectedCityStates.length > 0) {
      return filterState.selectedCityStates.filter(cs => cs !== 'All');
    }
    if (filterState.selectedCityState && filterState.selectedCityState !== 'All') {
      return [filterState.selectedCityState];
    }
    return [];
  }, [filterState.selectedCityStates, filterState.selectedCityState]);

  const activeBiomes = useMemo(() => {
    if (filterState.selectedBiomes && filterState.selectedBiomes.length > 0) {
      return filterState.selectedBiomes.filter(b => b !== 'All');
    }
    if (filterState.selectedBiome && filterState.selectedBiome !== 'All') {
      return [filterState.selectedBiome];
    }
    if (filterState.selectedBioregions && filterState.selectedBioregions.length > 0) {
      return filterState.selectedBioregions.filter(b => b !== 'All');
    }
    if (filterState.selectedBioregion && filterState.selectedBioregion !== 'All') {
      return [filterState.selectedBioregion];
    }
    return [];
  }, [filterState.selectedBiomes, filterState.selectedBiome, filterState.selectedBioregions, filterState.selectedBioregion]);

  const activeOperatingRegions = useMemo(() => {
    if (filterState.selectedOperatingRegions && filterState.selectedOperatingRegions.length > 0) {
      return filterState.selectedOperatingRegions.filter(or => or !== 'All');
    }
    if (filterState.selectedOperatingRegion && filterState.selectedOperatingRegion !== 'All') {
      return [filterState.selectedOperatingRegion];
    }
    return [];
  }, [filterState.selectedOperatingRegions, filterState.selectedOperatingRegion]);

  const activeOperationFocuses = useMemo(() => {
    if (filterState.selectedOperationFocuses && filterState.selectedOperationFocuses.length > 0) {
      return filterState.selectedOperationFocuses.filter(of => of !== 'All');
    }
    if (filterState.selectedOperationFocus && filterState.selectedOperationFocus !== 'All') {
      return [filterState.selectedOperationFocus];
    }
    return [];
  }, [filterState.selectedOperationFocuses, filterState.selectedOperationFocus]);

  const activeMaturityLevels = useMemo(() => {
    if (filterState.selectedMaturityLevels && filterState.selectedMaturityLevels.length > 0) {
      return filterState.selectedMaturityLevels.filter(m => m !== 'All');
    }
    if (filterState.selectedMaturityLevel && filterState.selectedMaturityLevel !== 'All') {
      return [filterState.selectedMaturityLevel];
    }
    if (filterState.selectedStages && filterState.selectedStages.length > 0) {
      return filterState.selectedStages.filter(s => s !== 'All');
    }
    if (filterState.selectedStage && filterState.selectedStage !== 'All') {
      return [filterState.selectedStage];
    }
    return [];
  }, [filterState.selectedMaturityLevels, filterState.selectedMaturityLevel, filterState.selectedStages, filterState.selectedStage]);

  const activeSizes = useMemo(() => {
    if (filterState.selectedSizes && filterState.selectedSizes.length > 0) {
      return filterState.selectedSizes.filter(s => s !== 'All');
    }
    if (filterState.selectedSize && filterState.selectedSize !== 'All') {
      return [filterState.selectedSize];
    }
    return [];
  }, [filterState.selectedSizes, filterState.selectedSize]);

  const activeReaches = useMemo(() => {
    if (filterState.selectedReaches && filterState.selectedReaches.length > 0) {
      return filterState.selectedReaches.filter(r => r !== 'All');
    }
    if (filterState.selectedReach && filterState.selectedReach !== 'All') {
      return [filterState.selectedReach];
    }
    return [];
  }, [filterState.selectedReaches, filterState.selectedReach]);

  const activeSituationalAssessments = useMemo(() => {
    if (filterState.selectedSituationalAssessments && filterState.selectedSituationalAssessments.length > 0) {
      return filterState.selectedSituationalAssessments.filter(sa => sa !== 'All');
    }
    if (filterState.selectedSituationalAssessment && filterState.selectedSituationalAssessment !== 'All') {
      return [filterState.selectedSituationalAssessment];
    }
    return [];
  }, [filterState.selectedSituationalAssessments, filterState.selectedSituationalAssessment]);

  const activeValueMemes = useMemo(() => {
    if (filterState.selectedValueMemes && filterState.selectedValueMemes.length > 0) {
      return filterState.selectedValueMemes.filter(vm => vm !== 'All');
    }
    if (filterState.selectedValueMeme && filterState.selectedValueMeme !== 'All') {
      return [filterState.selectedValueMeme];
    }
    return [];
  }, [filterState.selectedValueMemes, filterState.selectedValueMeme]);

  const activeOrientations3H = useMemo(() => {
    if (filterState.selectedOrientations3H && filterState.selectedOrientations3H.length > 0) {
      return filterState.selectedOrientations3H.filter(oh => oh !== 'All');
    }
    if (filterState.selectedOrientation3H && filterState.selectedOrientation3H !== 'All') {
      return [filterState.selectedOrientation3H];
    }
    return [];
  }, [filterState.selectedOrientations3H, filterState.selectedOrientation3H]);

  const activeOrientationsGtdf = useMemo(() => {
    if (filterState.selectedOrientationsGtdf && filterState.selectedOrientationsGtdf.length > 0) {
      return filterState.selectedOrientationsGtdf.filter(og => og !== 'All');
    }
    if (filterState.selectedOrientationGtdf && filterState.selectedOrientationGtdf !== 'All') {
      return [filterState.selectedOrientationGtdf];
    }
    return [];
  }, [filterState.selectedOrientationsGtdf, filterState.selectedOrientationGtdf]);

  const activeOrientationsCri = useMemo(() => {
    if (filterState.selectedOrientationsCri && filterState.selectedOrientationsCri.length > 0) {
      return filterState.selectedOrientationsCri.filter(oc => oc !== 'All');
    }
    if (filterState.selectedOrientationCri && filterState.selectedOrientationCri !== 'All') {
      return [filterState.selectedOrientationCri];
    }
    return [];
  }, [filterState.selectedOrientationsCri, filterState.selectedOrientationCri]);

  const activeMatchingDatabases = useMemo(() => {
    if (filterState.selectedMatchingDatabases && filterState.selectedMatchingDatabases.length > 0) {
      return filterState.selectedMatchingDatabases.filter(db => db !== 'All');
    }
    if (filterState.selectedMatchingDatabase && filterState.selectedMatchingDatabase !== 'All') {
      return [filterState.selectedMatchingDatabase];
    }
    return [];
  }, [filterState.selectedMatchingDatabases, filterState.selectedMatchingDatabase]);

  // Check if any basic filter is actively set
  const activeBasicFiltersCount = useMemo(() => {
    let count = 0;
    if (activeLanguages.length > 0) count++;
    if (activeCountries.length > 0) count++;
    if (activeCityStates.length > 0) count++;
    if (activeBiomes.length > 0) count++;
    if (activeOperatingRegions.length > 0) count++;
    if (activeOperationFocuses.length > 0) count++;
    if (activeMaturityLevels.length > 0) count++;
    if (activeSizes.length > 0) count++;
    if (activeReaches.length > 0) count++;
    return count;
  }, [
    activeLanguages,
    activeCountries,
    activeCityStates,
    activeBiomes,
    activeOperatingRegions,
    activeOperationFocuses,
    activeMaturityLevels,
    activeSizes,
    activeReaches
  ]);

  const hasActiveBasicFilters = activeBasicFiltersCount > 0;

  const resetBasicFilters = () => {
    setFilterState(prev => ({
      ...prev,
      selectedLanguage: 'All',
      selectedLanguages: [],
      selectedCountry: 'All',
      selectedCountries: [],
      selectedCityState: 'All',
      selectedCityStates: [],
      selectedBiome: 'All',
      selectedBiomes: [],
      selectedBioregion: 'All',
      selectedBioregions: [],
      selectedOperatingRegion: 'All',
      selectedOperatingRegions: [],
      selectedOperationFocus: 'All',
      selectedOperationFocuses: [],
      selectedMaturityLevel: 'All',
      selectedMaturityLevels: [],
      selectedStage: 'All',
      selectedStages: [],
      selectedSize: 'All',
      selectedSizes: [],
      selectedReach: 'All',
      selectedReaches: []
    }));
  };

  // Check if any advanced filter is actively set
  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (activeSituationalAssessments.length > 0) count++;
    if (activeValueMemes.length > 0) count++;
    if (activeOrientations3H.length > 0) count++;
    if (activeOrientationsGtdf.length > 0) count++;
    if (activeOrientationsCri.length > 0) count++;
    if (activeMatchingDatabases.length > 0) count++;
    return count;
  }, [
    activeSituationalAssessments,
    activeValueMemes,
    activeOrientations3H,
    activeOrientationsGtdf,
    activeOrientationsCri,
    activeMatchingDatabases
  ]);

  const hasActiveAdvancedFilters = activeAdvancedFiltersCount > 0;

  const resetAdvancedFilters = () => {
    setFilterState(prev => ({
      ...prev,
      selectedSituationalAssessment: 'All',
      selectedSituationalAssessments: [],
      selectedValueMeme: 'All',
      selectedValueMemes: [],
      selectedOrientation3H: 'All',
      selectedOrientations3H: [],
      selectedOrientationGtdf: 'All',
      selectedOrientationsGtdf: [],
      selectedOrientationCri: 'All',
      selectedOrientationsCri: [],
      selectedMatchingDatabase: 'All',
      selectedMatchingDatabases: []
    }));
  };

  return (
    <aside
      className={`relative border-r border-[#E5E7EB] bg-[#FAF8F5] transition-all duration-300 flex flex-col z-20 ${
        collapsed ? 'w-12' : 'w-80'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 w-6 h-6 bg-white border border-[#E5E7EB] rounded-full flex items-center justify-center shadow-xs text-[#111827] hover:bg-[#FAF8F5] z-30"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Collapsed view icons */}
      {collapsed ? (
        <div className="flex flex-col items-center py-4 space-y-6 text-[#111827]">
          <button onClick={() => setCollapsed(false)} title="Filter Settings">
            <Filter className="w-5 h-5 text-[#111827]" />
          </button>
          <button onClick={() => { setCollapsed(false); setActiveTab('continents'); }} title="Archipelagos">
            <Globe className="w-5 h-5 text-[#5B21B6]" />
          </button>
          <button onClick={() => { setCollapsed(false); setActiveTab('fields'); }} title="Field Tags">
            <Tag className="w-5 h-5 text-[#7D8764]" />
          </button>
          <button 
            onClick={() => { 
              if (editMode) {
                setCollapsed(false); 
                setActiveTab('positions'); 
              } else {
                setIsPasswordModalOpen(true);
              }
            }} 
            title={editMode ? "Map Coordinates & Lock (Active)" : "Unlock Edit Mode"}
            className="p-1.5 hover:bg-[#FAF8F5] rounded transition-colors cursor-pointer"
          >
            {editMode ? <Unlock className="w-5 h-5 text-[#92400E]" /> : <Lock className="w-5 h-5 text-[#8C877F] hover:text-[#111827]" />}
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-[#111827]" />
                <h2 className="font-editorial text-lg font-semibold text-[#111827]">
                  Ecosystem Filters
                </h2>
              </div>
              <span className="font-technical text-xs bg-[#FAF8F5] border border-[#E5E7EB] px-2 py-0.5 rounded-[4px]">
                {totalFilteredCount} / {totalCount}
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className={`grid ${editMode ? 'grid-cols-5' : 'grid-cols-3'} border-b border-[#E5E7EB] mt-3 font-sans text-xs text-center`}>
              <button
                onClick={() => setActiveTab('filters')}
                className={`py-1.5 font-medium border-b-2 transition-all truncate px-1 ${
                  activeTab === 'filters'
                    ? 'border-[#111827] text-[#111827] bg-[#FAF8F5]'
                    : 'border-transparent text-[#8C877F] hover:text-[#111827]'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('continents')}
                className={`py-1.5 font-medium border-b-2 transition-all truncate px-1 ${
                  activeTab === 'continents'
                    ? 'border-[#111827] text-[#111827] bg-[#FAF8F5]'
                    : 'border-transparent text-[#8C877F] hover:text-[#111827]'
                }`}
              >
                Archipelagos
              </button>
              <button
                onClick={() => setActiveTab('fields')}
                className={`py-1.5 font-medium border-b-2 transition-all truncate px-1 ${
                  activeTab === 'fields'
                    ? 'border-[#111827] text-[#111827] bg-[#FAF8F5]'
                    : 'border-transparent text-[#8C877F] hover:text-[#111827]'
                }`}
              >
                Tags
              </button>
              {editMode && (
                <>
                  <button
                    onClick={() => setActiveTab('positions')}
                    className={`py-1.5 font-medium border-b-2 transition-all truncate px-1 ${
                      activeTab === 'positions'
                        ? 'border-[#111827] text-[#111827] bg-[#FAF8F5]'
                        : 'border-transparent text-[#8C877F] hover:text-[#111827]'
                    }`}
                  >
                    Lock
                  </button>
                  <button
                    id="sidebar-review-tab-btn"
                    onClick={() => setActiveTab('review')}
                    className={`py-1.5 font-medium border-b-2 transition-all truncate px-0.5 relative flex items-center justify-center space-x-1 ${
                      activeTab === 'review'
                        ? 'border-[#854D0E] text-[#854D0E] bg-[#FEFCE8]'
                        : 'border-transparent text-[#8C877F] hover:text-[#854D0E]'
                    }`}
                    title="Review Community Proposed Changes"
                  >
                    <span>Review</span>
                    {pendingCount > 0 && (
                      <span className="w-4 h-4 bg-[#E11D48] text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeTab === 'filters' && (
              <>
                {/* Entity Counts Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-editorial text-xs font-semibold text-[#111827] uppercase tracking-wider">
                      Ecosystem Overview
                    </span>
                    {(isTotalActive || isOrgActive || isPersonActive || isIdeaActive || isMediaActive) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveListScope?.(null);
                          setSelectedEntity?.(null);
                        }}
                        className="text-[11px] font-technical text-[#716C64] hover:text-[#111827] underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-0.5 p-0.5 bg-white border border-[#E5E7EB] rounded-[4px] shadow-2xs font-technical text-center">
                    <button
                      type="button"
                      onClick={() => onSelectEntityTypeList?.('All')}
                      title="Click to view full list of all entities in sidebar"
                      className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-[2px] transition-all cursor-pointer ${
                        isTotalActive 
                          ? 'bg-[#111827] text-white shadow-xs font-medium' 
                          : 'hover:bg-[#FAF8F5] text-[#111827]'
                      }`}
                    >
                      <span className={`font-medium text-[11px] tabular-nums ${isTotalActive ? 'text-white' : 'text-[#111827]'}`}>
                        {totalEntityCount}
                      </span>
                      <span className={`text-[8px] uppercase tracking-tight font-medium ${isTotalActive ? 'text-[#D9C01B]' : 'text-[#716C64]'}`}>
                        total
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectEntityTypeList?.('Organization')}
                      title="Click to view list of all Organizations in sidebar"
                      className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-[2px] transition-all cursor-pointer ${
                        isOrgActive 
                          ? 'bg-[#4D5734] text-white shadow-xs font-medium' 
                          : 'hover:bg-[#FAF8F5] text-[#4D5734]'
                      }`}
                    >
                      <span className={`font-medium text-[11px] tabular-nums ${isOrgActive ? 'text-white' : 'text-[#4D5734]'}`}>
                        {orgCount}
                      </span>
                      <span className={`text-[8px] uppercase tracking-tight font-medium ${isOrgActive ? 'text-[#D9C01B]' : 'text-[#716C64]'}`}>
                        orgs
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectEntityTypeList?.('Person')}
                      title="Click to view list of all People & Fellows in sidebar"
                      className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-[2px] transition-all cursor-pointer ${
                        isPersonActive 
                          ? 'bg-[#0369A1] text-white shadow-xs font-medium' 
                          : 'hover:bg-[#FAF8F5] text-[#0369A1]'
                      }`}
                    >
                      <span className={`font-medium text-[11px] tabular-nums ${isPersonActive ? 'text-white' : 'text-[#0369A1]'}`}>
                        {personCount}
                      </span>
                      <span className={`text-[8px] uppercase tracking-tight font-medium ${isPersonActive ? 'text-[#D9C01B]' : 'text-[#716C64]'}`}>
                        people
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectEntityTypeList?.('Idea')}
                      title="Click to view list of all Ideas & Cornerstones in sidebar"
                      className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-[2px] transition-all cursor-pointer ${
                        isIdeaActive 
                          ? 'bg-[#5B21B6] text-white shadow-xs font-medium' 
                          : 'hover:bg-[#FAF8F5] text-[#5B21B6]'
                      }`}
                    >
                      <span className={`font-medium text-[11px] tabular-nums ${isIdeaActive ? 'text-white' : 'text-[#5B21B6]'}`}>
                        {ideaCount}
                      </span>
                      <span className={`text-[8px] uppercase tracking-tight font-medium ${isIdeaActive ? 'text-[#D9C01B]' : 'text-[#716C64]'}`}>
                        ideas
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectEntityTypeList?.('Media')}
                      title="Click to view list of all Media in sidebar"
                      className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-[2px] transition-all cursor-pointer ${
                        isMediaActive 
                          ? 'bg-[#7D8764] text-white shadow-xs font-medium' 
                          : 'hover:bg-[#FAF8F5] text-[#7D8764]'
                      }`}
                    >
                      <span className={`font-medium text-[11px] tabular-nums ${isMediaActive ? 'text-white' : 'text-[#7D8764]'}`}>
                        {mediaCount}
                      </span>
                      <span className={`text-[8px] uppercase tracking-tight font-medium ${isMediaActive ? 'text-[#D9C01B]' : 'text-[#716C64]'}`}>
                        media
                      </span>
                    </button>
                  </div>
                </div>

                {/* 1. Category Quadrants - Clickable to open list in Right Sidebar */}
                <div>
                  <div className="mb-2">
                    <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider">
                      Category Quadrants
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {categoriesList.map(cat => {
                      const isCatSelected = activeListScope?.type === 'category' && activeListScope.category === cat.key;
                      const selectedEntityType = isCatSelected ? activeListScope.entityType : undefined;
                      const catEntities = entities.filter(e => e.category === cat.key);
                      const catCount = catEntities.length;
                      const orgCount = catEntities.filter(e => e.type === 'Organization').length;
                      const personCount = catEntities.filter(e => e.type === 'Person').length;
                      const ideaCount = catEntities.filter(e => e.type === 'Idea').length;

                      return (
                        <div key={cat.key} className="space-y-0">
                          <div
                            onClick={() => {
                              if (isCatSelected) {
                                setActiveListScope?.(null);
                                setSelectedEntity?.(null);
                                onSelectContinent?.(null);
                              } else {
                                onSelectCategoryList?.(cat.key);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 border text-xs font-sans text-left transition-all cursor-pointer ${
                              isCatSelected
                                ? 'bg-[#D9C01B]/20 border-[#111827] ring-1 ring-[#111827] text-[#111827] shadow-xs rounded-t-[4px] rounded-b-none'
                                : 'bg-white border-[#E5E7EB] text-[#111827] hover:border-[#111827] shadow-xs rounded-[4px]'
                            }`}
                            title={isCatSelected ? `Click to de-select ${cat.label} and close sidebar` : `Click to view list of entities in ${cat.label}`}
                          >
                            <div className="flex items-center space-x-2.5 truncate pr-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <div className="truncate">
                                <div className="font-normal text-[#111827] flex items-center space-x-1.5">
                                  <span className="truncate">{cat.label}</span>
                                </div>
                                <div className="font-technical text-[10px] text-[#8C877F] truncate">
                                  {cat.desc}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {onFlyToQuadrant && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onFlyToQuadrant(cat.key);
                                  }}
                                  title={`Fly camera to ${cat.label} on map`}
                                  className="p-1 text-[#4FC1E0] hover:text-[#0284C7] hover:bg-[#FAF8F5] rounded-[2px] transition-colors cursor-pointer"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <span className="font-technical text-[10px] bg-[#FAF8F5] border border-[#E5E7EB] px-1.5 py-0.5 rounded-[2px] text-[#716C64] font-medium">
                                {catCount}
                              </span>
                            </div>
                          </div>

                          {/* Small breakdown line below the quadrant */}
                          {isCatSelected && (
                            <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-[#111827] border-t-0 rounded-b-[4px] text-[10.5px] font-sans shadow-xs">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCategoryList?.(cat.key, selectedEntityType === 'Organization' ? undefined : 'Organization');
                                }}
                                className={`px-1.5 py-0.5 rounded-[2px] font-medium transition-all cursor-pointer truncate ${
                                  selectedEntityType === 'Organization'
                                    ? 'bg-[#4D5734] text-white font-medium shadow-2xs'
                                    : 'text-[#374151] hover:text-[#111827] hover:bg-[#FAF8F5] hover:underline'
                                }`}
                                title={`Filter right sidebar to ${orgCount} Organizations in ${cat.label}`}
                              >
                                {orgCount} Organizations
                              </button>

                              <span className="text-[#D1D5DB] select-none mx-0.5">•</span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCategoryList?.(cat.key, selectedEntityType === 'Person' ? undefined : 'Person');
                                }}
                                className={`px-1.5 py-0.5 rounded-[2px] font-medium transition-all cursor-pointer truncate ${
                                  selectedEntityType === 'Person'
                                    ? 'bg-[#0369A1] text-white font-medium shadow-2xs'
                                    : 'text-[#374151] hover:text-[#111827] hover:bg-[#FAF8F5] hover:underline'
                                }`}
                                title={`Filter right sidebar to ${personCount} People in ${cat.label}`}
                              >
                                {personCount} People
                              </button>

                              <span className="text-[#D1D5DB] select-none mx-0.5">•</span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCategoryList?.(cat.key, selectedEntityType === 'Idea' ? undefined : 'Idea');
                                }}
                                className={`px-1.5 py-0.5 rounded-[2px] font-medium transition-all cursor-pointer truncate ${
                                  selectedEntityType === 'Idea'
                                    ? 'bg-[#5B21B6] text-white font-medium shadow-2xs'
                                    : 'text-[#374151] hover:text-[#111827] hover:bg-[#FAF8F5] hover:underline'
                                }`}
                                title={`Filter right sidebar to ${ideaCount} Ideas in ${cat.label}`}
                              >
                                {ideaCount} Ideas
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stream Filter (Spreadsheet Stream / Streams column, supports multi-selection) */}
                <div className="pt-2 border-t border-[#E5E7EB]">
                  <MultiSelectFilterDropdown
                    id="map-stream"
                    label="Stream"
                    singularLabel="stream"
                    pluralLabel="streams"
                    options={streamsList.map(st => ({
                      value: st,
                      label: st,
                      count: streamCounts[st] || 0
                    }))}
                    selectedValues={activeStreams}
                    onChange={(newVals) => {
                      setFilterState(prev => ({
                        ...prev,
                        selectedStreams: newVals,
                        selectedStream: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                      }));
                    }}
                    totalEntitiesCount={entities.length}
                    isOpen={openDropdownId === 'map-stream'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'map-stream' ? null : 'map-stream')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                </div>

                {/* Archipelago Filter (Continents, multi-selectable) */}
                <div>
                  <MultiSelectFilterDropdown
                    id="map-archipelago"
                    label="Archipelagos"
                    singularLabel="archipelago"
                    pluralLabel="archipelagos"
                    options={sortedArchipelagos.map(c => ({
                      value: c.name,
                      label: c.name,
                      count: archipelagoCounts[c.name] || 0
                    }))}
                    selectedValues={activeContinents}
                    onChange={(newVals) => {
                      setFilterState(prev => ({
                        ...prev,
                        selectedContinents: newVals
                      }));
                    }}
                    totalEntitiesCount={entities.length}
                    isOpen={openDropdownId === 'map-archipelago'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'map-archipelago' ? null : 'map-archipelago')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                </div>

                {/* Map Layers Dropdown & Section with Our Relationship attached to Layer 1 or Layer 2 */}
                <div className="pt-2 border-t border-[#E5E7EB]">
                  {!isLayerSectionOpen ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsLayerSectionOpen(true)}
                        className="w-full flex items-center justify-between p-2 rounded-[4px] border transition-all text-left group cursor-pointer bg-white text-[#111827] border-[#E5E7EB] hover:border-[#111827] shadow-xs"
                        title="Click to view and switch Map Layers"
                      >
                        <span className="font-technical text-[11px] uppercase tracking-wider font-bold flex items-center space-x-2 truncate">
                          {/* 3 colors for each of the layers */}
                          <span className="flex items-center space-x-1 shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: '#059669' }} title="Layer 1: Wisdom-Centered Responses" />
                            <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: '#2563EB' }} title="Layer 2: Curated Transformation" />
                            <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: '#7C3AED' }} title="Layer 3: Life-Affirming Futures" />
                          </span>
                          <span className="truncate">
                            {activeLayer === 'all' ? 'All Layers Active' : `Layer ${activeLayer} Active`}
                          </span>
                        </span>
                        <span className={`text-[9px] font-technical px-1.5 py-0.5 rounded-[2px] font-bold shrink-0 ml-1 flex items-center space-x-1 ${
                          activeLayer === 2
                            ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] group-hover:border-[#2563EB]'
                            : 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] group-hover:border-[#059669]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeLayer === 2 ? 'bg-[#2563EB]' : 'bg-[#10B981]'}`}></span>
                          <span>Active</span>
                        </span>
                      </button>

                      {/* Attached Our Relationship Field (shows for active layer: 1-6 when Layer 1, 7-9 when Layer 2) */}
                      <div className="pt-0.5">
                        {renderOurRelationshipDropdown(activeLayer === 2 ? 2 : (activeLayer === 'all' ? 'all' : 1))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#FAF8F5] border border-[#111827]/25 rounded-[4px] shadow-xs overflow-hidden">
                      {/* Header Button spanning full box width and merging with its borders */}
                      <button
                        type="button"
                        onClick={() => setIsLayerSectionOpen(false)}
                        className="w-full flex items-center justify-between p-2 transition-all text-left group cursor-pointer bg-[#111827] text-white border-b border-[#111827]/30 hover:bg-[#1F2937]"
                        title="Click to collapse Map Layers"
                      >
                        <span className="font-technical text-[11px] uppercase tracking-wider font-bold flex items-center space-x-2 truncate">
                          <span className="flex items-center space-x-1 shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#059669' }} />
                            <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#2563EB' }} />
                            <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#7C3AED' }} />
                          </span>
                          <span className="truncate">
                            {activeLayer === 'all' ? 'All Layers Active' : `Layer ${activeLayer} Active`}
                          </span>
                        </span>
                        <span className="text-[9px] font-technical px-1.5 py-0.5 rounded-[2px] font-bold shrink-0 ml-1 flex items-center space-x-1 bg-[#34D399] text-[#111827]">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </button>

                      <div className="p-3 space-y-3">
                        {/* Layer 1 */}
                        <div
                          onClick={() => {
                            handleSelectLayer(1);
                          }}
                          className={`p-3 rounded-[4px] border transition-all cursor-pointer text-left space-y-2 ${
                            activeLayer === 1
                              ? 'bg-[#ECFDF5]/70 border-[#059669] ring-1 ring-[#059669] shadow-xs'
                              : 'bg-white border-[#E5E7EB] hover:border-[#059669]/60 hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center space-x-2">
                              <span className="w-3 h-3 rounded-full bg-[#059669] shrink-0 shadow-xs" />
                              <span className="font-editorial text-[15px] font-bold text-[#111827]">
                                Layer 1: [{formatLayerEntitiesBreakdown(layer1Counts)}]
                              </span>
                            </div>
                            {activeLayer === 1 ? (
                              <span className="text-[9px] font-technical uppercase font-bold px-1.5 py-0.5 rounded-[2px] bg-[#059669] text-white shrink-0 flex items-center space-x-1">
                                <Check className="w-2.5 h-2.5" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-technical uppercase font-medium px-1.5 py-0.5 rounded-[2px] bg-[#FAF8F5] text-[#6B7280] border border-[#E5E7EB] shrink-0">
                                Select
                              </span>
                            )}
                          </div>

                          <div className="font-editorial text-[14px] font-semibold text-[#065F46] leading-snug">
                            A Fragmented Ecosystem of Initiatives Contributing to Wisdom-Centered Educational Responses to the Metacrisis
                          </div>

                          <div className="font-sans text-[11px] text-[#374151] leading-relaxed pt-1 border-t border-[#E5E7EB]/80 space-y-1.5">
                            <p>
                              The Layer 1 of the Map includes {formatLayerEntitiesBreakdown(layer1Counts)} whose our relationship with ranges from: 1. Core References to 6. Following Closely.
                            </p>
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLayerModal(1);
                                }}
                                className="inline-flex items-center space-x-1 text-[11px] font-technical font-semibold text-[#059669] hover:text-[#047857] hover:underline cursor-pointer group/rm"
                                title="Read full description for Layer 1"
                              >
                                <span>Read More</span>
                                <ArrowRight className="w-3 h-3 transition-transform group-hover/rm:translate-x-0.5" />
                              </button>
                            </div>
                          </div>

                          {/* Attached Our Relationship Field (showing within Layer 1 when active) */}
                          {activeLayer === 1 && (
                            <div className="pt-2 border-t border-[#059669]/25" onClick={(e) => e.stopPropagation()}>
                              {renderOurRelationshipDropdown(1)}
                            </div>
                          )}
                        </div>

                        {/* Layer 2 */}
                        <div
                          onClick={() => {
                            handleSelectLayer(2);
                          }}
                          className={`p-3 rounded-[4px] border transition-all cursor-pointer text-left space-y-2 ${
                            activeLayer === 2
                              ? 'bg-[#EFF6FF]/70 border-[#2563EB] ring-1 ring-[#2563EB] shadow-xs'
                              : 'bg-white border-[#E5E7EB] hover:border-[#2563EB]/60 hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center space-x-2">
                              <span className="w-3 h-3 rounded-full bg-[#2563EB] shrink-0 shadow-xs" />
                              <span className="font-editorial text-[15px] font-bold text-[#111827]">
                                Layer 2: [{formatLayerEntitiesBreakdown(layer2Counts)}]
                              </span>
                            </div>
                            {activeLayer === 2 ? (
                              <span className="text-[9px] font-technical uppercase font-bold px-1.5 py-0.5 rounded-[2px] bg-[#2563EB] text-white shrink-0 flex items-center space-x-1">
                                <Check className="w-2.5 h-2.5" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-technical uppercase font-medium px-1.5 py-0.5 rounded-[2px] bg-[#FAF8F5] text-[#6B7280] border border-[#E5E7EB] shrink-0">
                                Select
                              </span>
                            )}
                          </div>

                          <div className="font-editorial text-[14px] font-semibold text-[#1D4ED8] leading-snug">
                            A Curated Ecosystem of Initiatives Working Towards Inner, Social, Cultural and Systems Transformation In Service of Planetary Flourishing
                          </div>

                          <div className="font-sans text-[11px] text-[#374151] leading-relaxed pt-1 border-t border-[#E5E7EB]/80 space-y-1.5">
                            <p>
                              The Layer 2 of the Map includes the {formatLayerEntitiesBreakdown(layer2Counts)} whose our relationship with ranges from: 7: Following -&gt; 9: Aware of.
                            </p>
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLayerModal(2);
                                }}
                                className="inline-flex items-center space-x-1 text-[11px] font-technical font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer group/rm"
                                title="Read full description for Layer 2"
                              >
                                <span>Read More</span>
                                <ArrowRight className="w-3 h-3 transition-transform group-hover/rm:translate-x-0.5" />
                              </button>
                            </div>
                          </div>

                          {/* Attached Our Relationship Field (showing within Layer 2 when active) */}
                          {activeLayer === 2 && (
                            <div className="pt-2 border-t border-[#2563EB]/25" onClick={(e) => e.stopPropagation()}>
                              {renderOurRelationshipDropdown(2)}
                            </div>
                          )}
                        </div>

                        {/* Layer 3 */}
                        <div
                          className="p-3 rounded-[4px] border border-[#E5E7EB] bg-[#F9FAFB] text-left space-y-2 opacity-85 select-none"
                          title="Layer 3 is coming soon and unclickable for now"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center space-x-2">
                              <span className="w-3 h-3 rounded-full bg-[#7C3AED] shrink-0 opacity-70" />
                              <span className="font-editorial text-[15px] font-bold text-[#374151]">
                                Layer 3 (soon): [{formatLayerEntitiesBreakdown(layer3Counts)}]
                              </span>
                            </div>
                            <span className="text-[9px] font-technical uppercase font-semibold px-1.5 py-0.5 rounded-[2px] bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] shrink-0">
                              unclickable for now
                            </span>
                          </div>

                          <div className="font-editorial text-[14px] font-semibold text-[#6D28D9] leading-snug">
                            A Wide Range of Initiatives Possibly Working Towards Life-Affirming Futures
                          </div>

                          <div className="font-sans text-[11px] text-[#4B5563] leading-relaxed pt-1 border-t border-[#E5E7EB] space-y-1.5">
                            <p>
                              The Layer 3 of the Map includes {formatLayerEntitiesBreakdown(layer3Counts)}, whose our relationship with are either: 10: Unaware of or 11. Crowdsourced.
                            </p>
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLayerModal(3);
                                }}
                                className="inline-flex items-center space-x-1 text-[11px] font-technical font-semibold text-[#7C3AED] hover:text-[#6D28D9] hover:underline cursor-pointer group/rm pointer-events-auto"
                                title="Read full description for Layer 3"
                              >
                                <span>Read More</span>
                                <ArrowRight className="w-3 h-3 transition-transform group-hover/rm:translate-x-0.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Combined toggle / reset */}
                        <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleSelectLayer('all')}
                            className={`font-technical text-[10.5px] px-2 py-1 rounded-[3px] transition-colors cursor-pointer ${
                              activeLayer === 'all'
                                ? 'bg-[#111827] text-white font-medium'
                                : 'text-[#6B7280] hover:text-[#111827] hover:bg-white border border-transparent hover:border-[#E5E7EB]'
                            }`}
                          >
                            Show All Layers Combined
                          </button>
                          {activeLayer !== 1 && (
                            <button
                              type="button"
                              onClick={() => handleSelectLayer(1)}
                              className="font-technical text-[10.5px] text-[#059669] hover:underline cursor-pointer"
                            >
                              Reset to Layer 1
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Data Completeness Filter */}
                <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider">
                        Data Completeness
                      </h3>
                      {/* Description on hover or click: Question mark button */}
                      <button
                        ref={dqButtonRef}
                        type="button"
                        onClick={() => {
                          updateDqTooltipPos();
                          setShowDqTooltip(prev => !prev);
                        }}
                        onMouseEnter={handleDqMouseEnter}
                        onMouseLeave={handleDqMouseLeave}
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold font-technical transition-colors cursor-pointer focus:outline-none ${
                          showDqTooltip
                            ? 'bg-[#111827] text-white'
                            : 'bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#4B5563] hover:text-[#111827]'
                        }`}
                        aria-label="Data Completeness criteria"
                        title="Click or hover to view Data Completeness standards"
                      >
                        ?
                      </button>
                    </div>

                    {/* Quick Select All / None */}
                    <div className="flex items-center space-x-1 text-[10px] font-technical">
                      <button
                        type="button"
                        onClick={() => {
                          const allTrue = {
                            'Top 10%': true,
                            'Top 25%': true,
                            'Top 50%': true,
                            'Top 75%': true,
                            'Bottom 25%': true
                          };
                          setFilterState(prev => ({
                            ...prev,
                            dataCompleteness: allTrue,
                            dataQuality: allTrue
                          }));
                        }}
                        className="text-[#6B7280] hover:text-[#111827] underline cursor-pointer px-1"
                      >
                        All
                      </button>
                      <span className="text-[#D1D5DB]">/</span>
                      <button
                        type="button"
                        onClick={() => {
                          const allFalse = {
                            'Top 10%': false,
                            'Top 25%': false,
                            'Top 50%': false,
                            'Top 75%': false,
                            'Bottom 25%': false
                          };
                          setFilterState(prev => ({
                            ...prev,
                            dataCompleteness: allFalse,
                            dataQuality: allFalse
                          }));
                        }}
                        className="text-[#6B7280] hover:text-[#111827] underline cursor-pointer px-1"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  {/* 5 Data Completeness Categories */}
                  <div className="space-y-1.5">
                    {dataCompletenessCategories.map(cat => {
                      const isChecked = filterState.dataCompleteness
                        ? filterState.dataCompleteness[cat.level] !== false
                        : (filterState.dataQuality ? (filterState.dataQuality as any)[cat.level] !== false : true);
                      const count = dataCompletenessCounts[cat.level] || 0;

                      return (
                        <button
                          key={cat.level}
                          type="button"
                          onClick={() => {
                            setFilterState(prev => {
                              const currentMap = prev.dataCompleteness || {
                                'Top 10%': true,
                                'Top 25%': true,
                                'Top 50%': true,
                                'Top 75%': true,
                                'Bottom 25%': true
                              };
                              const nextVal = !isChecked;
                              const updated = {
                                ...currentMap,
                                [cat.level]: nextVal
                              };
                              return {
                                ...prev,
                                dataCompleteness: updated,
                                dataQuality: updated
                              };
                            });
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 border rounded-[4px] text-xs font-sans text-left transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-white border-[#111827]/30 shadow-2xs hover:border-[#111827]'
                              : 'bg-[#F9FAFB] border-[#E5E7EB] opacity-50 hover:opacity-80'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate pr-2">
                            {/* Visual dot preview representing the map indicator */}
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-opacity ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                              style={{
                                backgroundColor: cat.dotBg,
                                border: `1.5px solid ${cat.dotBorder}`,
                                boxShadow: isChecked ? '0 1px 2px rgba(0,0,0,0.18)' : 'none'
                              }}
                            />

                            <div className="truncate">
                              <div className={`font-medium leading-tight truncate ${isChecked ? 'text-[#111827]' : 'text-[#6B7280]'}`}>
                                {cat.label}
                              </div>
                              <div className="text-[9.5px] font-technical text-[#6B7280] truncate">
                                {cat.description}
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-technical px-1.5 py-0.5 rounded-[2px] font-medium shrink-0 ${
                            isChecked ? 'bg-[#FAF8F5] text-[#111827] border border-[#E5E7EB]' : 'text-[#9CA3AF]'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>


                {/* Basic Filters Section */}
                <div className="pt-3 border-t border-[#E5E7EB] space-y-3">
                  <div
                    onClick={() => setIsBasicFiltersExpanded(prev => !prev)}
                    className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsBasicFiltersExpanded(prev => !prev);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider truncate">
                        Basic Filters
                      </h3>
                      {activeBasicFiltersCount > 0 && (
                        <span className="font-technical text-[10px] bg-[#111827] text-white px-1.5 py-0.2 rounded-[2px] font-medium shrink-0">
                          {activeBasicFiltersCount} active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {hasActiveBasicFilters && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            resetBasicFilters();
                          }}
                          className="text-[10px] font-technical text-[#716C64] hover:text-[#111827] underline cursor-pointer"
                          title="Reset all basic spreadsheet filters"
                        >
                          Reset All
                        </button>
                      )}
                      {isBasicFiltersExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#8C877F] group-hover:text-[#111827] transition-colors" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#8C877F] group-hover:text-[#111827] transition-colors" />
                      )}
                    </div>
                  </div>

                  {isBasicFiltersExpanded && (
                    <div className="space-y-2.5">
                      {/* Language(s) */}
                      <MultiSelectFilterDropdown
                        id="map-language"
                        label="Language(s)"
                        singularLabel="language"
                        pluralLabel="languages"
                        options={languagesList.map(lang => ({
                          value: lang,
                          label: lang,
                          count: languageCounts[lang] || 0
                        }))}
                        selectedValues={activeLanguages}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedLanguages: newVals,
                            selectedLanguage: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-language'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-language' ? null : 'map-language')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Country */}
                      <MultiSelectFilterDropdown
                        id="map-country"
                        label="Country"
                        singularLabel="country"
                        pluralLabel="countries"
                        options={countries.map(c => ({
                          value: c,
                          label: c,
                          count: countryCounts[c] || 0
                        }))}
                        selectedValues={activeCountries}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedCountries: newVals,
                            selectedCountry: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-country'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-country' ? null : 'map-country')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* City, State */}
                      <MultiSelectFilterDropdown
                        id="map-cityState"
                        label="City, State"
                        singularLabel="location"
                        pluralLabel="locations"
                        options={cityStates.map(cs => ({
                          value: cs,
                          label: cs,
                          count: cityStateCounts[cs] || 0
                        }))}
                        selectedValues={activeCityStates}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedCityStates: newVals,
                            selectedCityState: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-cityState'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-cityState' ? null : 'map-cityState')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Biome (Column AE in spreadsheet) */}
                      <MultiSelectFilterDropdown
                        id="map-biome"
                        label="Biome"
                        singularLabel="biome"
                        pluralLabel="biomes"
                        options={biomes.map(biome => ({
                          value: biome,
                          label: biome,
                          count: biomeCounts[biome] || 0
                        }))}
                        selectedValues={activeBiomes}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedBiomes: newVals,
                            selectedBiome: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', ')),
                            selectedBioregions: newVals,
                            selectedBioregion: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-biome'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-biome' ? null : 'map-biome')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Operating Region */}
                      <MultiSelectFilterDropdown
                        id="map-operatingRegion"
                        label="Operating Region"
                        singularLabel="region"
                        pluralLabel="regions"
                        options={operatingRegions.map(reg => ({
                          value: reg,
                          label: reg,
                          count: operatingRegionCounts[reg] || 0
                        }))}
                        selectedValues={activeOperatingRegions}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedOperatingRegions: newVals,
                            selectedOperatingRegion: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-operatingRegion'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-operatingRegion' ? null : 'map-operatingRegion')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Operation Focus */}
                      <MultiSelectFilterDropdown
                        id="map-operationFocus"
                        label="Operation Focus"
                        singularLabel="focus"
                        pluralLabel="focuses"
                        options={operationFocuses.map(of => ({
                          value: of,
                          label: of,
                          count: operationFocusCounts[of] || 0
                        }))}
                        selectedValues={activeOperationFocuses}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedOperationFocuses: newVals,
                            selectedOperationFocus: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-operationFocus'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-operationFocus' ? null : 'map-operationFocus')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Maturity Level */}
                      <MultiSelectFilterDropdown
                        id="map-maturityLevel"
                        label="Maturity Level"
                        singularLabel="stage"
                        pluralLabel="stages"
                        options={maturityLevels.map(ml => ({
                          value: ml,
                          label: ml,
                          count: maturityCounts[ml] || 0
                        }))}
                        selectedValues={activeMaturityLevels}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedMaturityLevels: newVals,
                            selectedMaturityLevel: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', ')),
                            selectedStages: newVals,
                            selectedStage: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-maturityLevel'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-maturityLevel' ? null : 'map-maturityLevel')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Size */}
                      <MultiSelectFilterDropdown
                        id="map-size"
                        label="Size"
                        singularLabel="size"
                        pluralLabel="sizes"
                        options={sizes.map(sz => ({
                          value: sz,
                          label: sz,
                          count: sizeCounts[sz] || 0
                        }))}
                        selectedValues={activeSizes}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedSizes: newVals,
                            selectedSize: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-size'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-size' ? null : 'map-size')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Reach */}
                      <MultiSelectFilterDropdown
                        id="map-reach"
                        label="Reach"
                        singularLabel="reach"
                        pluralLabel="reaches"
                        options={reaches.map(rc => ({
                          value: rc,
                          label: rc,
                          count: reachCounts[rc] || 0
                        }))}
                        selectedValues={activeReaches}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedReaches: newVals,
                            selectedReach: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        isOpen={openDropdownId === 'map-reach'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-reach' ? null : 'map-reach')}
                        onClose={() => setOpenDropdownId(null)}
                      />
                    </div>
                  )}
                </div>

                {/* Advanced Filters Section */}
                <div className="pt-3 border-t border-[#E5E7EB] space-y-3">
                  <div
                    onClick={() => setIsAdvancedFiltersExpanded(prev => !prev)}
                    className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsAdvancedFiltersExpanded(prev => !prev);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider truncate">
                        Advanced Filters
                      </h3>
                      {activeAdvancedFiltersCount > 0 && (
                        <span className="font-technical text-[10px] bg-[#111827] text-white px-1.5 py-0.2 rounded-[2px] font-medium shrink-0">
                          {activeAdvancedFiltersCount} active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {hasActiveAdvancedFilters && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            resetAdvancedFilters();
                          }}
                          className="text-[10px] font-technical text-[#716C64] hover:text-[#111827] underline cursor-pointer"
                          title="Reset all advanced filters"
                        >
                          Reset All
                        </button>
                      )}
                      {isAdvancedFiltersExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#8C877F] group-hover:text-[#111827] transition-colors" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#8C877F] group-hover:text-[#111827] transition-colors" />
                      )}
                    </div>
                  </div>

                  {isAdvancedFiltersExpanded && (
                    <div className="space-y-2.5">
                      {/* Situational Assessment */}
                      <MultiSelectFilterDropdown
                        id="map-situationalAssessment"
                        label="Situational Assessment"
                        singularLabel="assessment"
                        pluralLabel="assessments"
                        options={situationalAssessments.map(sa => ({
                          value: sa,
                          label: sa,
                          count: situationalAssessmentCounts[sa] || 0
                        }))}
                        selectedValues={activeSituationalAssessments}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedSituationalAssessments: newVals,
                            selectedSituationalAssessment: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        helpPopup={
                          <FilterCommentHelpPopup
                            cellRef="BA2"
                            fieldName="Situational Assessment"
                            category="Worldview & Change Orientation"
                          />
                        }
                        isOpen={openDropdownId === 'map-situationalAssessment'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-situationalAssessment' ? null : 'map-situationalAssessment')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Value Meme / Ethical Orientation */}
                      <MultiSelectFilterDropdown
                        id="map-valueMeme"
                        label="Value Meme / Ethical Orientation"
                        singularLabel="orientation"
                        pluralLabel="orientations"
                        options={valueMemes.map(vm => ({
                          value: vm,
                          label: vm,
                          count: valueMemeCounts[vm] || 0
                        }))}
                        selectedValues={activeValueMemes}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedValueMemes: newVals,
                            selectedValueMeme: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        helpPopup={
                          <FilterCommentHelpPopup
                            cellRef="BH2"
                            fieldName="Value Meme / Ethical Orientation"
                            category="Worldview & Change Orientation"
                          />
                        }
                        isOpen={openDropdownId === 'map-valueMeme'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-valueMeme' ? null : 'map-valueMeme')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Orientation to Change (Three Horizons) */}
                      <MultiSelectFilterDropdown
                        id="map-orientation3H"
                        label="Orientation to Change (Three Horizons)"
                        singularLabel="horizon"
                        pluralLabel="horizons"
                        options={orientations3H.map(oh => ({
                          value: oh,
                          label: oh,
                          count: orientation3HCounts[oh] || 0
                        }))}
                        selectedValues={activeOrientations3H}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedOrientations3H: newVals,
                            selectedOrientation3H: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        helpPopup={
                          <FilterCommentHelpPopup
                            cellRef="BO2"
                            fieldName="Orientation to Change (Three Horizons)"
                            category="Worldview & Change Orientation"
                          />
                        }
                        isOpen={openDropdownId === 'map-orientation3H'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-orientation3H' ? null : 'map-orientation3H')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Orientation to Change (GTDF) */}
                      <MultiSelectFilterDropdown
                        id="map-orientationGtdf"
                        label="Orientation to Change (GTDF)"
                        singularLabel="orientation"
                        pluralLabel="orientations"
                        options={orientationsGtdf.map(og => ({
                          value: og,
                          label: og,
                          count: orientationGtdfCounts[og] || 0
                        }))}
                        selectedValues={activeOrientationsGtdf}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedOrientationsGtdf: newVals,
                            selectedOrientationGtdf: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        helpPopup={
                          <FilterCommentHelpPopup
                            cellRef="BP2"
                            fieldName="Orientation to Change (GTDF)"
                            category="Worldview & Change Orientation"
                          />
                        }
                        isOpen={openDropdownId === 'map-orientationGtdf'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-orientationGtdf' ? null : 'map-orientationGtdf')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Orientation to Change (CRI) */}
                      <MultiSelectFilterDropdown
                        id="map-orientationCri"
                        label="Orientation to Change (CRI)"
                        singularLabel="orientation"
                        pluralLabel="orientations"
                        options={orientationsCri.map(oc => ({
                          value: oc,
                          label: oc,
                          count: orientationCriCounts[oc] || 0
                        }))}
                        selectedValues={activeOrientationsCri}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedOrientationsCri: newVals,
                            selectedOrientationCri: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        helpPopup={
                          <FilterCommentHelpPopup
                            cellRef="BQ2"
                            fieldName="Orientation to Change (CRI)"
                            category="Worldview & Change Orientation"
                          />
                        }
                        isOpen={openDropdownId === 'map-orientationCri'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-orientationCri' ? null : 'map-orientationCri')}
                        onClose={() => setOpenDropdownId(null)}
                      />

                      {/* Matching Database */}
                      <MultiSelectFilterDropdown
                        id="map-matchingDatabase"
                        label="Matching Database"
                        singularLabel="database"
                        pluralLabel="databases"
                        options={matchingDatabases.map(db => ({
                          value: db,
                          label: db,
                          count: matchingDatabaseCounts[db] || 0
                        }))}
                        selectedValues={activeMatchingDatabases}
                        onChange={(newVals) => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedMatchingDatabases: newVals,
                            selectedMatchingDatabase: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                          }));
                        }}
                        totalEntitiesCount={entities.length}
                        helpPopup={
                          <FilterCommentHelpPopup
                            cellRef="CB2"
                            fieldName="Matching Database"
                            category="Warm Data"
                          />
                        }
                        isOpen={openDropdownId === 'map-matchingDatabase'}
                        onToggle={() => setOpenDropdownId(prev => prev === 'map-matchingDatabase' ? null : 'map-matchingDatabase')}
                        onClose={() => setOpenDropdownId(null)}
                      />
                    </div>
                  )}
                </div>

                {/* 6. Access Edit Mode Button */}
                <div className="pt-4 mt-2 border-t border-[#E5E7EB]">
                  {!editMode ? (
                    <button
                      id="access-edit-mode-btn"
                      type="button"
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-[#111827] hover:bg-[#1f2937] text-white rounded-[4px] text-xs font-sans font-medium transition-all shadow-xs cursor-pointer"
                      title="Unlock map node editing and spreadsheet synchronization"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#D9C01B]" />
                      <span>Access Edit Mode</span>
                    </button>
                  ) : (
                    <div className="space-y-2 p-2.5 bg-white border border-[#E5E7EB] rounded-[4px] shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-technical">
                        <span className="flex items-center space-x-1.5 text-[#15803D] font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                          <span>Edit Mode Active</span>
                        </span>
                        <span className="text-[#8C877F] uppercase tracking-wider text-[10px]">Authenticated</span>
                      </div>
                      {hasUncommittedChanges && (
                        <div className="p-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[4px] text-[11px] text-[#1E40AF] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <span className="flex items-center space-x-1">
                            <span>💾</span>
                            <span className="font-medium">Edits saved locally</span>
                          </span>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {onDismissChanges && (
                              <button
                                type="button"
                                id="sidebar-banner-dismiss-btn"
                                onClick={() => onDismissChanges(false)}
                                className="px-2 py-0.5 bg-white hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] hover:border-[#DC2626] font-medium rounded text-[10px] cursor-pointer shadow-2xs transition-colors flex items-center space-x-1"
                                title="Dismiss pending changes without saving to cloud"
                              >
                                <RotateCcw className="w-2.5 h-2.5 text-[#DC2626]" />
                                <span>Dismiss</span>
                              </button>
                            )}
                            {onCommitChanges && (
                              <button
                                type="button"
                                onClick={onCommitChanges}
                                className="px-2 py-0.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded text-[10px] cursor-pointer shadow-2xs transition-colors"
                                title="Commit pending changes to Firestore cloud database"
                              >
                                Commit Now
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <button
                          id="exit-edit-mode-btn"
                          type="button"
                          onClick={() => setEditMode(false)}
                          className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[#FAF8F5] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] hover:border-[#DC2626] rounded-[4px] text-xs font-sans font-medium transition-all cursor-pointer"
                          title="Lock map and exit edit mode (commits any pending changes to cloud)"
                        >
                          <Unlock className="w-3.5 h-3.5 text-[#B91C1C]" />
                          <span>{hasUncommittedChanges ? 'Exit & Commit to Cloud' : 'Exit Edit Mode'}</span>
                        </button>
                        {hasUncommittedChanges && onDismissChanges && (
                          <button
                            id="sidebar-dismiss-and-exit-btn"
                            type="button"
                            onClick={() => onDismissChanges(true)}
                            className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-white hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] hover:border-[#DC2626] rounded-[4px] text-[11px] font-sans font-medium transition-all cursor-pointer"
                            title="Discard uncommitted changes and exit edit mode"
                          >
                            <RotateCcw className="w-3 h-3 text-[#DC2626]" />
                            <span>Dismiss Changes & Exit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'continents' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-[#111827]" />
                    <h3 className="font-editorial text-sm font-semibold text-[#111827]">
                      Archipelagos ({continents.length})
                    </h3>
                  </div>
                  <div className="flex space-x-2 text-[11px] font-sans">
                    <button
                      onClick={showAllContinents}
                      className="text-[#111827] underline hover:text-[#5B21B6]"
                    >
                      Show All
                    </button>
                    <span className="text-[#8C877F]">•</span>
                    <button
                      onClick={hideAllContinents}
                      className="text-[#8C877F] underline hover:text-[#111827]"
                    >
                      Hide All
                    </button>
                  </div>
                </div>

                <p className="font-sans text-xs text-[#4B5563] leading-relaxed mb-3">
                  Archipelagos group nodes by thematic landmasses (either stated in spreadsheet or auto-suggested). Toggle visibility or fly to any archipelago.
                </p>

                <input
                  type="text"
                  placeholder="Search archipelagos..."
                  value={continentSearch}
                  onChange={(e) => setContinentSearch(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] text-xs font-sans px-3 py-1.5 rounded-[4px] mb-3 outline-none focus:border-[#111827]"
                />

                <div ref={continentsListRef} className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {/* Pinned Selected Archipelago (Moves to top of list when selected) */}
                  {selectedArchipelago && (
                    <div className="space-y-1.5 pb-2.5 border-b border-[#E5E7EB]">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="font-editorial text-[10.5px] font-semibold text-[#111827] uppercase tracking-wider flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#111827]" />
                          <span>Selected Archipelago</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectContinent?.(null, true);
                          }}
                          className="text-[10px] font-technical text-[#716C64] hover:text-[#111827] underline cursor-pointer"
                          title="Deselect and move back to its position in the list"
                        >
                          Deselect
                        </button>
                      </div>
                      {(() => {
                        const cont = selectedArchipelago;
                        const isHidden = filterState.hiddenContinents.includes(cont.name);
                        return (
                          <div
                            key={cont.name}
                            onClick={() => {
                              if (onSelectContinent) {
                                onSelectContinent(null, true);
                              }
                            }}
                            className="p-2.5 border rounded-[4px] text-xs font-sans transition-all cursor-pointer bg-[#D9C01B]/20 border-[#111827] ring-1 ring-[#111827] text-[#111827] shadow-xs"
                            title="Click to de-select and move back to its position in the list"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 pr-2">
                                <div className="flex items-center space-x-1.5 mb-1 flex-wrap gap-y-1">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: cont.color }}
                                  />
                                  <span className="font-editorial font-semibold text-xs text-[#111827] leading-snug">
                                    {cont.name}
                                  </span>
                                  <span className="font-technical text-[9px] uppercase tracking-wider bg-[#111827] text-white px-1.5 py-0.2 rounded-[2px] font-semibold shrink-0">
                                    Selected
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 font-technical text-[10px] text-[#8C877F]">
                                  <span>{cont.category} Quadrant</span>
                                  <span>•</span>
                                  <span className="font-semibold text-[#111827]">{cont.count} entities</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectContinent?.(null, true);
                                  }}
                                  title="Deselect archipelago"
                                  className="p-1 text-[#8C877F] hover:text-[#111827] hover:bg-[#FAF8F5] rounded-[2px] cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                {onFlyToContinent && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onFlyToContinent(cont);
                                    }}
                                    title={`Fly camera to ${cont.name}`}
                                    className="p-1 text-[#4FC1E0] hover:bg-[#FAF8F5] rounded-[2px] cursor-pointer"
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleContinentHidden(cont.name);
                                  }}
                                  title={isHidden ? 'Show archipelago on map' : 'Hide archipelago from map'}
                                  className="p-1 hover:bg-[#FAF8F5] rounded-[2px] cursor-pointer"
                                >
                                  {isHidden ? (
                                    <EyeOff className="w-3.5 h-3.5 text-[#8C877F]" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5 text-[#111827]" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Archipelagos grouped by quadrant and listed in numerical order (1., 2. etc.) within each quadrant */}
                  {categoriesList.map(cat => {
                    const catArchipelagos = unselectedContinents.filter(c => c.category === cat.key);
                    if (catArchipelagos.length === 0) return null;

                    return (
                      <div key={cat.key} className="space-y-1.5">
                        <div className="flex items-center justify-between pt-1 px-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="font-editorial text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
                              {cat.label}
                            </span>
                          </div>
                          <span className="font-technical text-[10px] text-[#8C877F]">
                            {catArchipelagos.length} archipelagos
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {catArchipelagos.map(cont => {
                            const isHidden = filterState.hiddenContinents.includes(cont.name);
                            return (
                              <div
                                key={cont.name}
                                onClick={() => {
                                  if (onSelectContinent) {
                                    onSelectContinent(cont.name, true);
                                  }
                                }}
                                className={`p-2.5 border rounded-[4px] text-xs font-sans transition-all cursor-pointer ${
                                  isHidden
                                    ? 'bg-[#FAF8F5] border-[#E5E7EB] text-[#8C877F] opacity-60 hover:opacity-100 hover:border-[#8C877F]'
                                    : 'bg-white border-[#E5E7EB] text-[#111827] shadow-xs hover:border-[#111827]'
                                }`}
                                title={editMode ? `Click to view & edit details for ${cont.name} (${cont.category} Quadrant)` : "Click to select and view entity snapshots in this archipelago"}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 pr-2">
                                    <div className="flex items-center space-x-1.5 mb-1">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: cont.color }}
                                      />
                                      <span className="font-editorial font-semibold text-xs text-[#111827] leading-snug">
                                        {cont.name}
                                      </span>
                                    </div>

                                    <div className="flex items-center space-x-2 font-technical text-[10px] text-[#8C877F]">
                                      <span>{cont.category} Quadrant</span>
                                      <span>•</span>
                                      <span className="font-semibold text-[#111827]">{cont.count} entities</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {onFlyToContinent && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onFlyToContinent(cont);
                                        }}
                                        title={`Fly camera to ${cont.name}`}
                                        className="p-1 text-[#4FC1E0] hover:bg-[#FAF8F5] rounded-[2px] cursor-pointer"
                                      >
                                        <Navigation className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleContinentHidden(cont.name);
                                      }}
                                      title={isHidden ? 'Show archipelago on map' : 'Hide archipelago from map'}
                                      className="p-1 hover:bg-[#FAF8F5] rounded-[2px] cursor-pointer"
                                    >
                                      {isHidden ? (
                                        <EyeOff className="w-3.5 h-3.5 text-[#8C877F]" />
                                      ) : (
                                        <Eye className="w-3.5 h-3.5 text-[#111827]" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {matchingContinents.length === 0 && (
                    <div className="text-center py-6 text-xs font-sans text-[#8C877F]">
                      No archipelagos match "{continentSearch}".
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'fields' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <Tag className="w-4 h-4 text-[#7D8764]" />
                    <h3 className="font-editorial text-sm font-semibold text-[#111827]">
                      Tags ({fieldClusters.length})
                    </h3>
                  </div>
                  {(filterState.selectedFields?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => setFilterState(prev => ({ ...prev, selectedFields: [] }))}
                      className="text-xs font-sans font-medium text-[#AD2831] hover:text-[#7A1C22] underline cursor-pointer transition-colors"
                      title="Reset tag filters"
                    >
                      clear all
                    </button>
                  )}
                </div>

                <p className="font-sans text-xs text-[#4B5563] leading-relaxed mb-3">
                  Click tags to filter the map. Select multiple tags simultaneously to display all of them.
                </p>

                {filterState.selectedFields && filterState.selectedFields.length > 0 && (
                  <div className="mb-3 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] flex items-center justify-between text-[11px] font-sans">
                    <span className="text-[#111827]">
                      Filtered by <strong className="font-semibold">{filterState.selectedFields.length}</strong> {filterState.selectedFields.length === 1 ? 'tag' : 'tags'}
                    </span>
                    {filterState.selectedFields.length === 1 && (
                      <button
                        type="button"
                        onClick={() => setFilterState(prev => ({ ...prev, selectedFields: [] }))}
                        className="text-[#8C877F] hover:text-[#111827] underline text-[10.5px] cursor-pointer"
                      >
                        clear
                      </button>
                    )}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Filter tags list..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] text-xs font-sans px-3 py-1.5 rounded-[4px] mb-3 outline-none focus:border-[#111827]"
                />

                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredFieldClusters.map(fc => {
                    const isSelected = (filterState.selectedFields || []).some(
                      f => f.toLowerCase().trim() === fc.name.toLowerCase().trim()
                    );

                    return (
                      <div
                        key={`${fc.category}-${fc.name}`}
                        onClick={() => {
                          setFilterState(prev => {
                            const current = prev.selectedFields || [];
                            const exists = current.some(f => f.toLowerCase().trim() === fc.name.toLowerCase().trim());
                            const next = exists
                              ? current.filter(f => f.toLowerCase().trim() !== fc.name.toLowerCase().trim())
                              : [...current, fc.name];
                            return {
                              ...prev,
                              selectedFields: next
                            };
                          });
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 border rounded-[4px] text-xs font-sans transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#D9C01B]/20 border-[#111827] ring-1 ring-[#111827] text-[#111827] shadow-xs'
                            : 'bg-white border-[#E5E7EB] text-[#111827] hover:border-[#111827] shadow-xs'
                        }`}
                        title={isSelected ? `Click to deselect "${fc.name}"` : `Click to filter map by "${fc.name}"`}
                      >
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-[#111827] border-[#111827] text-white' : 'border-[#D1D5DB] bg-white'
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 stroke-current" viewBox="0 0 12 12" fill="none">
                                <path d="M2.5 6L5 8.5L9.5 3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: fc.color }}
                          />
                          <span className={`truncate ${isSelected ? 'font-medium text-[#111827]' : 'font-normal text-[#111827]'}`}>
                            {fc.name}
                          </span>
                          <span className="font-technical text-[10px] text-[#8C877F]">
                            ({fc.count})
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFlyToFieldCluster?.(fc);
                            }}
                            title={`Move camera to "${fc.name}" on map`}
                            className="p-1 text-[#4FC1E0] hover:text-[#0284C7] hover:bg-[#FAF8F5] rounded-[2px] transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {editMode && activeTab === 'positions' && (
              <div className="space-y-4">
                <div className="p-3 bg-white border border-[#E5E7EB] rounded-[4px]">
                  <h3 className="font-editorial text-sm font-semibold text-[#111827] mb-1">
                    Map Drag & Position Locking
                  </h3>
                  <p className="font-sans text-xs text-[#4B5563] leading-relaxed mb-3">
                    Drag any entity node directly on the map canvas to fine-tune its position. Saved positions are preserved even when updating spreadsheet data!
                  </p>

                  <button
                    onClick={() => {
                      if (editMode) {
                        setEditMode(false);
                      } else {
                        setIsPasswordModalOpen(true);
                      }
                    }}
                    className={`w-full flex items-center justify-center space-x-2 py-2 px-3 border rounded-[4px] text-xs font-sans font-medium transition-all cursor-pointer ${
                      editMode
                        ? 'bg-[#D9C01B] text-[#111827] border-[#111827]'
                        : 'bg-[#111827] text-white border-[#111827]'
                    }`}
                  >
                    {editMode ? <Unlock className="w-4 h-4 text-[#111827]" /> : <Lock className="w-4 h-4 text-white" />}
                    <span>{editMode ? 'Edit Mode ACTIVE (Unlocked)' : 'Enable Edit Mode'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {onRecalculateLayout && (
                    <button
                      type="button"
                      onClick={() => onRecalculateLayout(true)}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-[#111827] hover:bg-[#20293a] text-white rounded-[4px] text-xs font-sans font-medium transition-all shadow-xs cursor-pointer"
                      title="Recalculate archipelago centers and distribute all cards into Inner, Social, Cultural, and Systems quadrants without stacking"
                    >
                      <Globe className="w-4 h-4 text-[#D9C01B]" />
                      <span>Recalculate Archipelago Layout</span>
                    </button>
                  )}

                  {onAutoArrange && (
                    <button
                      onClick={onAutoArrange}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[#FAF8F5] border border-[#111827] hover:bg-[#D9C01B] text-[#111827] rounded-[4px] text-xs font-sans font-medium transition-all shadow-xs cursor-pointer"
                      title="Re-cluster non-custom entity cards toward archipelago centers"
                    >
                      <Sparkles className="w-4 h-4 text-[#5B21B6]" />
                      <span>Auto-Arrange Cards</span>
                    </button>
                  )}

                  <button
                    onClick={onSavePositions}
                    className={`w-full flex items-center justify-center space-x-2 py-2 px-3 border rounded-[4px] text-xs font-sans font-medium transition-all cursor-pointer shadow-2xs ${
                      hasUncommittedChanges
                        ? 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white border-[#1D4ED8]'
                        : 'bg-white hover:border-[#111827] text-[#111827] border-[#E5E7EB]'
                    }`}
                  >
                    <Save className={`w-4 h-4 ${hasUncommittedChanges ? 'text-white' : 'text-[#7D8764]'}`} />
                    <span>{hasUncommittedChanges ? 'Commit Pending Changes to Cloud' : 'Save Custom Positions to Storage'}</span>
                  </button>

                  {hasUncommittedChanges && onDismissChanges && (
                    <button
                      type="button"
                      id="sidebar-positions-dismiss-btn"
                      onClick={() => onDismissChanges(false)}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[#FAF8F5] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] hover:border-[#DC2626] rounded-[4px] text-xs font-sans font-medium transition-all cursor-pointer shadow-2xs"
                      title="Discard uncommitted node adjustments and revert to last cloud version"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>Dismiss Uncommitted Changes</span>
                    </button>
                  )}

                  {cloudSyncStatus && cloudSyncStatus.state !== 'idle' && (
                    <div className={`p-2.5 rounded-[4px] text-[11px] font-sans border flex items-start space-x-2 transition-all ${
                      cloudSyncStatus.state === 'syncing'
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                        : cloudSyncStatus.state === 'saved'
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                        : cloudSyncStatus.state === 'saved_locally'
                        ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                        : cloudSyncStatus.state === 'quota_exceeded'
                        ? 'bg-[#FEFCE8] border-[#FEF08A] text-[#854D0E]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}>
                      <span className="shrink-0 mt-0.5 text-xs">
                        {cloudSyncStatus.state === 'syncing' ? '⏳' : cloudSyncStatus.state === 'saved' ? '✓' : cloudSyncStatus.state === 'saved_locally' ? '💾' : 'ℹ️'}
                      </span>
                      <span className="leading-snug">{cloudSyncStatus.message}</span>
                    </div>
                  )}

                  {confirmingReset ? (
                    <div className="flex items-center justify-between p-2 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px]">
                      <span className="text-[11px] font-medium text-[#991B1B]">Reset all positions?</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onResetLayout();
                            setConfirmingReset(false);
                          }}
                          className="px-2 py-0.5 bg-[#AD2831] hover:bg-[#8D1E26] text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                        >
                          Yes, Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingReset(false)}
                          className="px-2 py-0.5 bg-white text-[#4B5563] hover:text-[#111827] text-[10px] border border-[#E5E7EB] rounded cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(true)}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-white border border-[#E5E7EB] hover:border-[#AD2831] text-[#AD2831] rounded-[4px] text-xs font-sans transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset Positions to Cluster Auto-Layout</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Community Review Pipeline Tab in Edit Mode */}
            {editMode && activeTab === 'review' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#FEFCE8] border border-[#FEF08A] rounded-[6px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-technical text-xs uppercase font-bold text-[#854D0E] flex items-center space-x-1.5">
                      <span>🌱</span>
                      <span>Review Pipeline</span>
                    </span>
                    <span className="font-technical text-[10px] bg-[#FEF08A] text-[#854D0E] px-2 py-0.5 rounded font-bold">
                      {pendingCount} Pending
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-[#713F12] leading-relaxed">
                    Review and verify community proposals for entity improvements before merging into the live ecosystem dataset.
                  </p>
                  {onOpenReviewPipeline && (
                    <button
                      type="button"
                      id="sidebar-open-review-modal-btn"
                      onClick={onOpenReviewPipeline}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-[#854D0E] hover:bg-[#713F12] text-white rounded-[4px] text-xs font-technical font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      <span>Open Full Pipeline Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter pills */}
                <div className="flex items-center space-x-1 border-b border-[#E5E7EB] pb-2 text-[11px] font-technical">
                  {(['pending', 'all', 'approved', 'rejected'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPipelineFilter(tab)}
                      className={`px-2 py-1 rounded-[3px] capitalize cursor-pointer transition-colors ${
                        pipelineFilter === tab
                          ? 'bg-[#111827] text-white font-semibold'
                          : 'text-[#6B7280] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Submissions List */}
                <div className="space-y-2.5">
                  {pipelineSubmissions
                    .filter(s => pipelineFilter === 'all' || s.status === pipelineFilter)
                    .map(sub => {
                      return (
                        <div 
                          key={sub.id}
                          className={`p-3 bg-white border rounded-[6px] transition-all space-y-2 shadow-2xs ${
                            sub.status === 'pending'
                              ? 'border-[#FEF08A] hover:border-[#FACC15]'
                              : sub.status === 'approved'
                              ? 'border-[#BBF7D0]'
                              : 'border-[#FECACA] opacity-75'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-editorial text-sm font-bold text-[#111827] truncate">
                                {sub.entityName}
                              </h4>
                              <p className="font-sans text-[10.5px] text-[#6B7280] truncate flex items-center space-x-1 mt-0.5">
                                <Mail className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                                <span>{sub.submitterEmail}</span>
                              </p>
                            </div>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9.5px] font-technical font-semibold uppercase ${
                              sub.status === 'pending'
                                ? 'bg-[#FEF9C3] text-[#854D0E] border border-[#FEF08A]'
                                : sub.status === 'approved'
                                ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                                : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                            }`}>
                              {sub.status}
                            </span>
                          </div>

                          {/* Quick Diff Summary */}
                          <div className="bg-[#FAF8F5] p-2 rounded-[4px] border border-[#E5E7EB] text-[10.5px] font-sans space-y-1">
                            <span className="font-technical text-[9px] uppercase font-bold text-[#8C877F] block">
                              Proposed {sub.diffs.length} change{sub.diffs.length === 1 ? '' : 's'}:
                            </span>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                              {sub.diffs.slice(0, 3).map((d, i) => (
                                <div key={i} className="text-[#374151] truncate">
                                  <span className="font-semibold text-[#111827]">{d.label}:</span>{' '}
                                  <span className="text-[#15803D] font-medium">{String(d.newValue || '(empty)')}</span>
                                </div>
                              ))}
                              {sub.diffs.length > 3 && (
                                <span className="text-[10px] text-[#8C877F] italic block">
                                  +{sub.diffs.length - 3} more fields...
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons for Pending */}
                          {sub.status === 'pending' && (
                            <div className="flex items-center justify-end space-x-1.5 pt-1 border-t border-[#F3F4F6]">
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateContributionStatus(sub.id, 'rejected');
                                  setPipelineSubmissions(getStoredContributions());
                                  setPendingCount(getPendingContributionsCount());
                                }}
                                className="px-2.5 py-1 text-[11px] font-technical text-[#991B1B] hover:bg-[#FEE2E2] rounded transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const targetLive = entities.find(e => e.id === sub.entityId) || sub.originalEntity;
                                  const updated = {
                                    ...targetLive,
                                    ...sub.proposedEntity,
                                    x: targetLive.x ?? sub.proposedEntity.x,
                                    y: targetLive.y ?? sub.proposedEntity.y
                                  };
                                  if (onUpdateEntity) onUpdateEntity(updated);
                                  await updateContributionStatus(sub.id, 'approved');
                                  setPipelineSubmissions(getStoredContributions());
                                  setPendingCount(getPendingContributionsCount());
                                }}
                                className="px-3 py-1 text-[11px] font-technical font-semibold bg-[#111827] hover:bg-[#1F2937] text-white rounded transition-colors cursor-pointer shadow-2xs"
                              >
                                Approve & Merge
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {pipelineSubmissions.filter(s => pipelineFilter === 'all' || s.status === pipelineFilter).length === 0 && (
                    <div className="p-6 text-center text-xs text-[#8C877F] font-sans bg-white rounded border border-[#E5E7EB]">
                      No {pipelineFilter === 'all' ? '' : pipelineFilter} submissions found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Password authentication modal for edit mode */}
      <EditModePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          setEditMode(true);
          setIsPasswordModalOpen(false);
        }}
      />

      {/* Data Quality Criteria Pop-up rendered via Portal so it goes over the sidebar box without clipping */}
      {showDqTooltip && typeof document !== 'undefined' && createPortal(
        <div
          ref={dqTooltipRef}
          onMouseEnter={handleDqMouseEnter}
          onMouseLeave={handleDqMouseLeave}
          style={{
            position: 'fixed',
            top: `${dqTooltipPos.top}px`,
            left: `${dqTooltipPos.left}px`,
          }}
          className="z-[9999] w-80 p-3.5 bg-white border border-[#E5E7EB] rounded-[6px] shadow-2xl text-[#111827] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E7EB]">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#111827]" />
              <span className="font-technical text-[10.5px] text-[#111827] uppercase tracking-wider font-bold">
                Completeness Standards
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-technical text-[9px] text-[#6B7280] bg-[#FAF8F5] border border-[#E5E7EB] px-1.5 py-0.5 rounded-[2px]">
                5 Percentiles
              </span>
              <button
                type="button"
                onClick={() => setShowDqTooltip(false)}
                className="text-[#9CA3AF] hover:text-[#111827] p-0.5 rounded hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Description */}
          <p className="text-[11.5px] leading-relaxed text-[#4B5563] font-sans mb-2.5">
            Classified by spreadsheet field completeness percentiles:
          </p>

          {/* 5 Standards List */}
          <div className="space-y-1.5 pt-1.5 border-t border-[#F3F4F6]">
            {dataCompletenessCategories.map(cat => (
              <div key={cat.level} className="flex items-center justify-between text-[11px] font-sans bg-[#FAF8F5] px-2 py-1 rounded-[3px] border border-[#E5E7EB]/60">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-2xs"
                    style={{ backgroundColor: cat.dotBg }}
                  />
                  <span className="font-medium text-[#111827]">{cat.label}</span>
                </div>
                <span className="font-technical text-[10px] text-[#6B7280]">{cat.description}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Map Layers Full Description Modal */}
      <MapLayersModal
        isOpen={isLayerModalOpen}
        onClose={() => setIsLayerModalOpen(false)}
        initialTab={layerModalInitialTab}
        activeLayer={activeLayer}
        onSelectLayer={(layer) => {
          handleSelectLayer(layer);
        }}
        layer1Counts={layer1Counts}
        layer2Counts={layer2Counts}
        layer3Counts={layer3Counts}
      />
    </aside>
  );
};

