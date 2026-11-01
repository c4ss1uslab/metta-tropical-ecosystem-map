import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, LayoutGrid, List, MapPin, Globe, Building2, User, Lightbulb, 
  ArrowUpRight, Navigation, Download, RotateCcw, Check, ExternalLink,
  SlidersHorizontal, ChevronLeft, ChevronRight, Columns3, GripVertical, ChevronUp, ChevronDown,
  Eye, EyeOff, Sparkles, Filter, X, FileSpreadsheet, FileText, FileJson
} from 'lucide-react';
import { 
  EcosystemEntity, CategoryQuadrant, EntityType, DataQualityStatus, DataCompletenessLevel,
  DATA_COMPLETENESS_LEVELS, DATA_COMPLETENESS_CONFIG, getEntityCompleteness, getCompletenessConfig,
  ContinentInfo, FilterState, CommunityNote 
} from '../types';
import { exportEntities, getEntitySpreadsheetField, splitLanguageValues, entityMatchesRelationship, ensureUniqueEntityIds } from '../utils/excelParser';
import { formatDisplayUrl } from '../utils/socialMedia';
import { isEntityDomainElevation, filterProfileTags, entityMatchesArchipelago } from '../utils/layoutGenerator';
import { RightSidebar } from './RightSidebar';
import { MultiSelectFilterDropdown } from './MultiSelectFilterDropdown';

export const getDataCompletenessLabel = (status?: DataCompletenessLevel | string): string => {
  if (!status) return 'Bottom 25%';
  if (DATA_COMPLETENESS_CONFIG[status as DataCompletenessLevel]) {
    return DATA_COMPLETENESS_CONFIG[status as DataCompletenessLevel].label;
  }
  return String(status);
};

export const getDataQualityLabel = getDataCompletenessLabel;

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  minWidth?: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'logo', label: 'Logo', visible: true, minWidth: '60px' },
  { id: 'name', label: 'Entity Name', visible: true, minWidth: '220px' },
  { id: 'type', label: 'Type', visible: true, minWidth: '110px' },
  { id: 'quadrant', label: 'Quadrant', visible: true, minWidth: '110px' },
  { id: 'archipelago', label: 'Archipelago', visible: true, minWidth: '180px' },
  { id: 'location', label: 'Location', visible: true, minWidth: '140px' },
  { id: 'tags', label: 'Tags & Themes', visible: true, minWidth: '180px' },
  { id: 'maturity', label: 'Maturity Level', visible: false, minWidth: '120px' },
  { id: 'language', label: 'Language', visible: false, minWidth: '110px' },
  { id: 'website', label: 'Website', visible: false, minWidth: '150px' },
  { id: 'relationship', label: 'Our Relationship', visible: false, minWidth: '130px' },
  { id: 'dataCompleteness', label: 'Data Completeness', visible: false, minWidth: '140px' },
  { id: 'actions', label: 'Actions', visible: true, minWidth: '110px' }
];

const COLUMNS_STORAGE_KEY = 'metta_directory_columns_v2';

interface DirectoryViewProps {
  entities: EcosystemEntity[];
  continents: ContinentInfo[];
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  onBackToMap: () => void;
  onSelectEntity: (entity: EcosystemEntity) => void;
  onLocateOnMap: (entity: EcosystemEntity) => void;
  selectedEntity?: EcosystemEntity | null;
  onCloseEntity?: () => void;
  editMode?: boolean;
  onUpdateEntity?: (entity: EcosystemEntity) => void;
  onUpdateEntityNotes?: (entityId: string, notes: string) => void;
  onUpdateEntityCoordinates?: (entityId: string, x: number, y: number) => void;
  onAddCommunityNote?: (entityId: string, author: string, content: string) => void;
  onDeleteCommunityNote?: (entityId: string, noteId: string) => void;
  onSelectContinent?: (continentName: string | null) => void;
  onSelectCategoryList?: (category: CategoryQuadrant, entityType?: EntityType) => void;
  onSelectRelationshipList?: (relationship: string, entityType?: EntityType) => void;
  onSelectEntityTypeList?: (entityType: EntityType | 'All') => void;
  onSelectTagList?: (tag: string, category?: CategoryQuadrant, facetType?: 'tag' | 'approach' | 'issues' | 'activities') => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  entities,
  continents,
  filterState,
  setFilterState,
  onBackToMap,
  onSelectEntity,
  onLocateOnMap,
  selectedEntity,
  onCloseEntity,
  editMode = false,
  onUpdateEntity,
  onUpdateEntityNotes,
  onUpdateEntityCoordinates,
  onAddCommunityNote,
  onDeleteCommunityNote,
  onSelectContinent,
  onSelectCategoryList,
  onSelectRelationshipList,
  onSelectEntityTypeList,
  onSelectTagList,
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const columnManagerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [internalSelectedEntity, setInternalSelectedEntity] = useState<EcosystemEntity | null>(null);
  const activeSelectedEntity = selectedEntity !== undefined ? selectedEntity : internalSelectedEntity;

  const handleEntityCardClick = (entity: EcosystemEntity) => {
    // If small screen, automatically collapse the left sidebar so expanded entity view has full presence
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
    if (selectedEntity === undefined) {
      setInternalSelectedEntity(entity);
    }
    onSelectEntity(entity);
  };

  // Auto-collapse sidebar if an entity becomes active on small screen
  useEffect(() => {
    if (activeSelectedEntity && typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, [activeSelectedEntity?.id]);

  const handleCloseEntity = () => {
    if (selectedEntity === undefined) {
      setInternalSelectedEntity(null);
    }
    onCloseEntity?.();
  };

  // Columns Configuration with persistence
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify all default columns exist
          const parsedIds = new Set(parsed.map((c: any) => c.id));
          const missing = DEFAULT_COLUMNS.filter(c => !parsedIds.has(c.id));
          return [...parsed, ...missing];
        }
      }
    } catch (e) {
      console.warn('Failed to load column preferences', e);
    }
    return DEFAULT_COLUMNS;
  });

  const saveColumns = (newCols: ColumnConfig[]) => {
    setColumns(newCols);
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(newCols));
    } catch {}
  };

  const toggleColumnVisibility = (colId: string) => {
    const updated = columns.map(c => c.id === colId ? { ...c, visible: !c.visible } : c);
    saveColumns(updated);
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[targetIndex];
    newCols[targetIndex] = temp;
    saveColumns(newCols);
  };

  const resetColumnsToDefault = () => {
    saveColumns(DEFAULT_COLUMNS);
  };

  const selectAllColumns = () => {
    saveColumns(columns.map(c => ({ ...c, visible: true })));
  };

  const deselectNonEssentialColumns = () => {
    saveColumns(columns.map(c => ({ ...c, visible: ['name', 'type', 'quadrant', 'actions'].includes(c.id) })));
  };

  // Drag and drop column reordering state
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === targetIndex) return;
    const newCols = [...columns];
    const [moved] = newCols.splice(draggedColIndex, 1);
    newCols.splice(targetIndex, 0, moved);
    saveColumns(newCols);
    setDraggedColIndex(null);
  };

  // Close column manager & export menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnManagerRef.current && !columnManagerRef.current.contains(e.target as Node)) {
        setShowColumnManager(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    if (showColumnManager || exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnManager, exportMenuOpen]);

  // Sort dropdown of archipelagos by their numbers (1, 2, 3, ... 9, 10, 11...)
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

  // Sorting
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'quadrant' | 'type' | 'archipelago'>('name-asc');

  // Logistic dropdown options extracted from dataset
  const ourRelationships = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'S2') || e.ourRelationship;
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort((a, b) => {
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
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  // AE — Biome (Column AE in spreadsheet)
  const biomes = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AE') || getEntitySpreadsheetField(e, 'BIOME') || getEntitySpreadsheetField(e, 'AB2');
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort();
  }, [entities]);
  const bioregions = biomes;

  const cityStates = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AC2');
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort();
  }, [entities]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AD2') || e.location;
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort();
  }, [entities]);

  const operatingRegions = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AE2');
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort();
  }, [entities]);

  const operationFocuses = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AF2');
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort();
  }, [entities]);

  const maturityLevels = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AH2') || e.stage;
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort();
  }, [entities]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AI2');
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort();
  }, [entities]);

  const reaches = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      const val = getEntitySpreadsheetField(e, 'AJ2');
      if (val) set.add(val.trim());
    });
    return Array.from(set).sort();
  }, [entities]);

  // Stream list and counts extracted from spreadsheet Stream / Streams column (and entity.stream / entity.streams)
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

  // Archipelagos counts
  const archipelagoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sortedArchipelagos.forEach(c => {
      counts[c.name] = entities.filter(e => entityMatchesArchipelago(e, c.name)).length;
    });
    return counts;
  }, [entities, sortedArchipelagos]);

  // Extended logistics counts
  const relationshipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ourRelationships.forEach(r => {
      const rLower = r.toLowerCase().trim();
      counts[r] = entities.filter(e => {
        const val = getEntitySpreadsheetField(e, 'S2') || e.ourRelationship;
        if (!val) return false;
        const valLower = val.toLowerCase().trim();
        return valLower === rLower || valLower.includes(rLower);
      }).length;
    });
    return counts;
  }, [entities, ourRelationships]);

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
        const val = getEntitySpreadsheetField(e, 'AE') || getEntitySpreadsheetField(e, 'BIOME') || getEntitySpreadsheetField(e, 'AB2');
        return val && val.toLowerCase().trim() === bLower;
      }).length;
    });
    return counts;
  }, [entities, biomes]);
  const bioregionCounts = biomeCounts;

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
        const val = getEntitySpreadsheetField(e, 'AE2');
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

  // Active Multi-Select Arrays with backwards compatibility for single strings
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

  const activeOurRels = useMemo(() => {
    if (filterState.selectedOurRelationships && filterState.selectedOurRelationships.length > 0) {
      return filterState.selectedOurRelationships.filter(r => r !== 'All');
    }
    if (filterState.selectedOurRelationship && filterState.selectedOurRelationship !== 'All') {
      return [filterState.selectedOurRelationship];
    }
    return [];
  }, [filterState.selectedOurRelationships, filterState.selectedOurRelationship]);

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
  const activeBioregions = activeBiomes;

  const activeLanguages = useMemo(() => {
    if (filterState.selectedLanguages && filterState.selectedLanguages.length > 0) {
      return filterState.selectedLanguages.filter(l => l !== 'All');
    }
    if (filterState.selectedLanguage && filterState.selectedLanguage !== 'All') {
      return [filterState.selectedLanguage];
    }
    return [];
  }, [filterState.selectedLanguages, filterState.selectedLanguage]);

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

  // Tag counts and sorted tags ordered by most used tags first with entity count
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    entities.forEach(e => {
      (e.fields || []).forEach(f => {
        const trimmed = f.trim();
        if (trimmed) {
          map.set(trimmed, (map.get(trimmed) || 0) + 1);
        }
      });
    });
    return map;
  }, [entities]);

  const sortedTags = useMemo(() => {
    return Array.from(tagCounts.entries())
      .sort((a, b) => {
        // Most used tags first (descending count)
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        return a[0].localeCompare(b[0]);
      })
      .map(([tag, count]) => ({
        tag,
        count,
        label: `${tag} (${count})`
      }));
  }, [tagCounts]);

  const allTags = useMemo(() => sortedTags.map(t => t.tag), [sortedTags]);

  // Filter application
  const filteredEntities = useMemo(() => {
    let result = entities.filter(ent => {
      // 1. Text Search
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase().trim();
        const matchesName = ent.name.toLowerCase().includes(q);
        const matchesDesc = (ent.description || '').toLowerCase().includes(q);
        const matchesLocation = (ent.location || '').toLowerCase().includes(q);
        const matchesContinent = (ent.continent || '').toLowerCase().includes(q);
        const matchesOtherArchs = (ent.otherArchipelagos || []).some(o => o.toLowerCase().includes(q));
        const matchesTags = (ent.fields || []).some(f => f.toLowerCase().includes(q));
        const matchesType = ent.type.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesLocation && !matchesContinent && !matchesOtherArchs && !matchesTags && !matchesType) {
          return false;
        }
      }

      // 2. Transformation Quadrants
      if (!filterState.categories[ent.category]) {
        return false;
      }

      // 3. Entity Type
      if (!filterState.entityTypes[ent.type]) {
        return false;
      }

      // 3b. Stream Filter (Spreadsheet Stream / Streams column, supports multi-selection)
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

      // 4. Data Completeness
      const dc = getEntityCompleteness(ent);
      if (filterState.dataCompleteness && filterState.dataCompleteness[dc] === false) {
        return false;
      }
      if (filterState.dataQuality && (filterState.dataQuality as any)[dc] === false) {
        return false;
      }

      // 5. Selected Archipelagos (Continents, supports multi-selection)
      if (activeContinents.length > 0) {
        const matchesAny = activeContinents.some(arch => entityMatchesArchipelago(ent, arch));
        if (!matchesAny) {
          return false;
        }
      }

      // 6. Selected Field Tags (supports multi-selection)
      if (filterState.selectedFields && filterState.selectedFields.length > 0) {
        const selectedTagsLower = filterState.selectedFields.map(f => f.toLowerCase().trim());
        const hasMatchingTag = ent.fields && ent.fields.some(f =>
          selectedTagsLower.includes(f.toLowerCase().trim())
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // 7. S2 — Our Relationship (supports multi-selection)
      if (activeOurRels.includes('none') || filterState.selectedOurRelationship === 'none') {
        return false;
      }

      if (activeOurRels.length > 0) {
        const isAllLayerRelsActive = activeOurRels.length >= 6;
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

      // 8. AA2 — Language (supports multi-selection)
      if (activeLanguages.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AA2') || ent.language;
        if (!val) return false;
        const langs = splitLanguageValues(val).map(s => s.toLowerCase().trim());
        const matches = activeLanguages.some(l => langs.includes(l.trim().toLowerCase()));
        if (!matches) {
          return false;
        }
      }

      // 9. AE — Biome (supports multi-selection)
      if (activeBiomes.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AE') || getEntitySpreadsheetField(ent, 'BIOME') || getEntitySpreadsheetField(ent, 'AB2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const matches = activeBiomes.some(b => b.trim().toLowerCase() === valLower);
        if (!matches) {
          return false;
        }
      }

      // 10. AC2 — City, State (supports multi-selection)
      if (activeCityStates.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AC2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const matches = activeCityStates.some(cs => cs.trim().toLowerCase() === valLower);
        if (!matches) {
          return false;
        }
      }

      // 11. AD2 — Country (supports multi-selection)
      if (activeCountries.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AD2') || ent.location;
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const matches = activeCountries.some(c => c.trim().toLowerCase() === valLower);
        if (!matches) {
          return false;
        }
      }

      // 12. AE2 — Operating Region (supports multi-selection)
      if (activeOperatingRegions.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AE2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const matches = activeOperatingRegions.some(or => or.trim().toLowerCase() === valLower);
        if (!matches) {
          return false;
        }
      }

      // 13. AF2 — Operation Focus (supports multi-selection)
      if (activeOperationFocuses.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AF2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const matches = activeOperationFocuses.some(of => of.trim().toLowerCase() === valLower);
        if (!matches) {
          return false;
        }
      }

      // 14. AH2 — Maturity Level (supports multi-selection)
      if (activeMaturityLevels.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AH2') || ent.stage;
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const matches = activeMaturityLevels.some(m => m.trim().toLowerCase() === valLower);
        if (!matches) {
          return false;
        }
      }

      // 15. AI2 — Size (supports multi-selection)
      if (activeSizes.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AI2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const matches = activeSizes.some(s => s.trim().toLowerCase() === valLower);
        if (!matches) {
          return false;
        }
      }

      // 16. AJ2 — Reach (supports multi-selection)
      if (activeReaches.length > 0) {
        const val = getEntitySpreadsheetField(ent, 'AJ2');
        if (!val) return false;
        const valLower = val.trim().toLowerCase();
        const matches = activeReaches.some(r => r.trim().toLowerCase() === valLower);
        if (!matches) {
          return false;
        }
      }

      // 16b. Advanced Filters: Situational Assessment, Value Meme, Orientation to Change (3H, GTDF, CRI), Matching Database
      if (filterState.selectedSituationalAssessment && filterState.selectedSituationalAssessment !== 'All') {
        const val = getEntitySpreadsheetField(ent, 'BA') || getEntitySpreadsheetField(ent, 'Situational Assessment');
        if (!val || !val.toLowerCase().includes(filterState.selectedSituationalAssessment.trim().toLowerCase())) {
          return false;
        }
      }
      if (filterState.selectedValueMeme && filterState.selectedValueMeme !== 'All') {
        const val = ent.valueMemeEthicalOrientation || getEntitySpreadsheetField(ent, 'BH') || getEntitySpreadsheetField(ent, 'Value Meme / Ethical Orientation');
        if (!val || !val.toLowerCase().includes(filterState.selectedValueMeme.trim().toLowerCase())) {
          return false;
        }
      }
      if (filterState.selectedOrientation3H && filterState.selectedOrientation3H !== 'All') {
        const val = getEntitySpreadsheetField(ent, 'BO') || getEntitySpreadsheetField(ent, 'Orientation to Change (Three Horizons)');
        if (!val || !val.toLowerCase().includes(filterState.selectedOrientation3H.trim().toLowerCase())) {
          return false;
        }
      }
      if (filterState.selectedOrientationGtdf && filterState.selectedOrientationGtdf !== 'All') {
        const val = getEntitySpreadsheetField(ent, 'BP') || getEntitySpreadsheetField(ent, 'Orientation to Change (GTDF)');
        if (!val || !val.toLowerCase().includes(filterState.selectedOrientationGtdf.trim().toLowerCase())) {
          return false;
        }
      }
      if (filterState.selectedOrientationCri && filterState.selectedOrientationCri !== 'All') {
        const val = getEntitySpreadsheetField(ent, 'BQ') || getEntitySpreadsheetField(ent, 'Orientation to Change (CRI)');
        if (!val || !val.toLowerCase().includes(filterState.selectedOrientationCri.trim().toLowerCase())) {
          return false;
        }
      }
      if (filterState.selectedMatchingDatabase && filterState.selectedMatchingDatabase !== 'All') {
        const val = getEntitySpreadsheetField(ent, 'CB') || getEntitySpreadsheetField(ent, 'Matching Database');
        if (!val) return false;
        const targetLower = filterState.selectedMatchingDatabase.trim().toLowerCase();
        const valLower = val.toLowerCase();
        const valClean = val.replace(/^\[([^\]]+)\]\([^)]+\)/, '$1').toLowerCase();
        if (!valLower.includes(targetLower) && !valClean.includes(targetLower)) {
          return false;
        }
      }

      // 17. Ecotones (Intersections) Only
      if ((filterState.onlyEcotones || filterState.onlyDomainElevation) && !isEntityDomainElevation(ent)) {
        return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'quadrant':
          return (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
        case 'archipelago': {
          const cA = a.continent || '';
          const cB = b.continent || '';
          const matchA = cA.match(/^(\d+)/);
          const matchB = cB.match(/^(\d+)/);
          const numA = matchA ? parseInt(matchA[1], 10) : 999999;
          const numB = matchB ? parseInt(matchB[1], 10) : 999999;
          if (numA !== numB) {
            return numA - numB;
          }
          const contComp = cA.localeCompare(cB, undefined, { numeric: true, sensitivity: 'base' });
          if (contComp !== 0) return contComp;
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return ensureUniqueEntityIds(result);
  }, [
    entities, 
    filterState, 
    sortBy, 
    activeStreams, 
    activeContinents, 
    activeOurRels, 
    activeCountries, 
    activeCityStates, 
    activeBioregions, 
    activeLanguages, 
    activeOperatingRegions, 
    activeOperationFocuses, 
    activeMaturityLevels, 
    activeSizes, 
    activeReaches
  ]);

  // Reset all filters
  const resetAllFilters = () => {
    setOpenDropdownId(null);
    setFilterState({
      searchQuery: '',
      categories: { Inner: true, Social: true, Cultural: true, Systems: true },
      selectedStream: 'All',
      selectedStreams: [],
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
      selectedLocations: [],
      selectedLanguage: 'All',
      selectedLanguages: [],
      selectedStage: 'All',
      selectedStages: [],
      selectedOurRelationship: 'All',
      selectedOurRelationships: [],
      selectedBiome: 'All',
      selectedBiomes: [],
      selectedBioregion: 'All',
      selectedBioregions: [],
      selectedCityState: 'All',
      selectedCityStates: [],
      selectedCountry: 'All',
      selectedCountries: [],
      selectedOperatingRegion: 'All',
      selectedOperatingRegions: [],
      selectedOperationFocus: 'All',
      selectedOperationFocuses: [],
      selectedMaturityLevel: 'All',
      selectedMaturityLevels: [],
      selectedSize: 'All',
      selectedSizes: [],
      selectedReach: 'All',
      selectedReaches: [],
      selectedSituationalAssessment: 'All',
      selectedValueMeme: 'All',
      selectedOrientation3H: 'All',
      selectedOrientationGtdf: 'All',
      selectedOrientationCri: 'All',
      selectedMatchingDatabase: 'All',
      onlyFeatured: false,
      onlyEcotones: false,
      selectedIntersectionZone: 'All',
      selectedIntersectionZones: []
    });
    setSortBy('name-asc');
  };

  const hasActiveFilters = Boolean(
    filterState.searchQuery.trim() ||
    activeStreams.length > 0 ||
    !filterState.categories.Inner || !filterState.categories.Social || !filterState.categories.Cultural || !filterState.categories.Systems ||
    !filterState.entityTypes.Organization || !filterState.entityTypes.Person || !filterState.entityTypes.Idea ||
    DATA_COMPLETENESS_LEVELS.some(lvl => (filterState.dataCompleteness && filterState.dataCompleteness[lvl] === false) || (filterState.dataQuality && (filterState.dataQuality as any)[lvl] === false)) ||
    activeContinents.length > 0 ||
    (filterState.selectedFields && filterState.selectedFields.length > 0) ||
    activeOurRels.length > 0 ||
    activeLanguages.length > 0 ||
    activeBioregions.length > 0 ||
    activeCityStates.length > 0 ||
    activeCountries.length > 0 ||
    activeOperatingRegions.length > 0 ||
    activeOperationFocuses.length > 0 ||
    activeMaturityLevels.length > 0 ||
    activeSizes.length > 0 ||
    activeReaches.length > 0 ||
    (filterState.selectedSituationalAssessment && filterState.selectedSituationalAssessment !== 'All') ||
    (filterState.selectedValueMeme && filterState.selectedValueMeme !== 'All') ||
    (filterState.selectedOrientation3H && filterState.selectedOrientation3H !== 'All') ||
    (filterState.selectedOrientationGtdf && filterState.selectedOrientationGtdf !== 'All') ||
    (filterState.selectedOrientationCri && filterState.selectedOrientationCri !== 'All') ||
    (filterState.selectedMatchingDatabase && filterState.selectedMatchingDatabase !== 'All') ||
    filterState.onlyEcotones
  );

  const quadrantColors: Record<CategoryQuadrant, { bg: string; text: string; dot: string; label: string }> = {
    Inner: { bg: '#F5F3FF', text: '#5B21B6', dot: '#5B21B6', label: 'Inner Change' },
    Social: { bg: '#F3F4F6', text: '#111827', dot: '#111827', label: 'Social Change' },
    Cultural: { bg: '#F7F8F2', text: '#4D5734', dot: '#7D8764', label: 'Cultural Change' },
    Systems: { bg: '#F0F9FF', text: '#0369A1', dot: '#0284C7', label: 'Systems Change' },
  };

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'Organization':
        return <Building2 className="w-3.5 h-3.5 shrink-0 text-[#059669]" />;
      case 'Person':
        return <User className="w-3.5 h-3.5 shrink-0 text-[#0284C7]" />;
      case 'Idea':
        return <Lightbulb className="w-3.5 h-3.5 shrink-0 text-[#7C3AED]" />;
      default:
        return <Building2 className="w-3.5 h-3.5 shrink-0 text-[#111827]" />;
    }
  };

  const getEntityLogoUrl = (entity: EcosystemEntity): string | null => {
    if (entity.logo && entity.logo.trim()) return entity.logo;
    if (entity.favicon && entity.favicon.trim()) return entity.favicon;
    if (entity.website && entity.website.trim()) {
      try {
        let domain = entity.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].trim();
        if (domain && domain.includes('.')) {
          return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        }
      } catch {}
    }
    return null;
  };

  const handleLocateClick = (e: React.MouseEvent, entity: EcosystemEntity) => {
    e.stopPropagation();
    onLocateOnMap(entity);
  };

  const handleExportFiltered = () => {
    exportEntities(filteredEntities, 'csv', `metta_directory_${new Date().toISOString().slice(0, 10)}`);
  };

  const visibleColumns = useMemo(() => {
    return columns.filter(c => c.visible);
  }, [columns]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF8F5] text-[#111827]">
      {/* Top Bar with Navigation Button on Top-Left */}
      <header className="px-4 py-2.5 bg-white border-b border-[#E5E7EB] flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left Zone: Navigation Button & Directory Title */}
        <div className="flex items-center space-x-3">
          {activeSelectedEntity ? (
            <button
              type="button"
              onClick={handleCloseEntity}
              title="Return to Directory Catalog"
              className="flex items-center space-x-2 px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white rounded-[5px] text-xs font-sans font-medium transition-all shadow-xs cursor-pointer group shrink-0"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-[#D9C01B]" />
              <span>Back to Directory</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackToMap}
              title="Return to Interactive RPG Map"
              className="flex items-center space-x-2 px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white rounded-[5px] text-xs font-sans font-medium transition-all shadow-xs cursor-pointer group shrink-0"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-[#D9C01B]" />
              <span>Back to Map</span>
            </button>
          )}

          <div className="h-5 w-px bg-[#E5E7EB] hidden sm:block shrink-0" />

          <div className="min-w-0">
            {activeSelectedEntity ? (
              <div className="flex items-center space-x-2 min-w-0">
                <button
                  type="button"
                  onClick={handleCloseEntity}
                  className="text-left cursor-pointer transition-colors text-[#4B5563] hover:text-[#111827] shrink-0 group"
                  title="Return to Directory Catalog"
                >
                  <span className="text-sm sm:text-base md:text-lg font-editorial font-bold tracking-tight whitespace-nowrap group-hover:underline">
                    Ecosystem Directory
                  </span>
                </button>
                <span className="text-[#9CA3AF] text-base sm:text-lg font-sans select-none shrink-0">/</span>
                <span
                  className="font-editorial text-base sm:text-xl font-bold text-[#111827] tracking-tight truncate max-w-[200px] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl"
                  title={activeSelectedEntity.name}
                >
                  {activeSelectedEntity.name}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h1 className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
                  Ecosystem Directory
                </h1>
                <span className="font-technical text-[10.5px] bg-[#FAF8F5] text-[#111827] border border-[#E5E7EB] px-2 py-0.5 rounded-[4px] font-semibold">
                  {filteredEntities.length} of {entities.length}
                </span>
              </div>
            )}
            <p className="font-sans text-[11px] text-[#716C64] hidden md:block truncate max-w-md lg:max-w-xl">
              {activeSelectedEntity
                ? `Expanded entity profile & worldview details for ${activeSelectedEntity.name}`
                : 'Full-screen searchable catalog of organizations, fellows, and cornerstone initiatives'}
            </p>
          </div>
        </div>

        {/* Right Zone: Controls (Search, View Mode, Columns, Export) */}
        <div className="flex items-center space-x-2 shrink-0">
          {!activeSelectedEntity && (
            <>
              {/* Quick Search Input */}
              <div className="relative hidden lg:block w-64">
                <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search directory..."
                  value={filterState.searchQuery}
                  onChange={(e) => setFilterState(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full bg-[#FAF8F5] border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans pl-8 pr-7 py-1.5 rounded-[4px] outline-none text-[#111827] placeholder-[#8C877F]"
                />
                {filterState.searchQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterState(prev => ({ ...prev, searchQuery: '' }))}
                    className="absolute right-2 top-2 p-0.5 text-[#8C877F] hover:text-[#111827] cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-[#FAF8F5] border border-[#E5E7EB] p-0.5 rounded-[5px]">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  title="Cards View"
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] text-xs font-sans transition-all cursor-pointer ${
                    viewMode === 'card'
                      ? 'bg-white text-[#111827] font-semibold shadow-xs border border-[#E5E7EB]'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="List / Table View"
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] text-xs font-sans transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-[#111827] font-semibold shadow-xs border border-[#E5E7EB]'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

          {/* Column Customizer Button (Active in List View) */}
          {viewMode === 'list' && (
            <div className="relative" ref={columnManagerRef}>
              <button
                type="button"
                onClick={() => setShowColumnManager(prev => !prev)}
                title="Select and reorder table columns"
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-[4px] text-xs font-sans transition-all cursor-pointer ${
                  showColumnManager
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                    : 'bg-white hover:bg-[#FAF8F5] text-[#111827] border-[#E5E7EB] hover:border-[#111827] shadow-xs'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5 text-[#0284C7]" />
                <span className="hidden sm:inline">Columns</span>
                <span className="text-[10px] font-technical px-1 rounded bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                  {visibleColumns.length}
                </span>
              </button>

              {/* Column Selection & Reordering Popover */}
              {showColumnManager && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#111827] rounded-[6px] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] mb-2">
                    <div>
                      <p className="font-editorial text-xs font-bold text-[#111827]">
                        Customize Table Columns
                      </p>
                      <p className="text-[10.5px] text-[#716C64]">
                        Drag, toggle visibility, and reorder sequence
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={selectAllColumns}
                        className="text-[10.5px] font-technical text-[#0284C7] hover:underline cursor-pointer"
                        title="Show all columns"
                      >
                        All
                      </button>
                      <span className="text-[#D1D5DB]">·</span>
                      <button
                        type="button"
                        onClick={resetColumnsToDefault}
                        className="text-[10.5px] font-technical text-[#8C877F] hover:text-[#111827] underline cursor-pointer"
                        title="Reset columns to default"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                    {columns.map((col, index) => (
                      <div
                        key={col.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-[4px] text-xs transition-colors cursor-grab active:cursor-grabbing ${
                          draggedColIndex === index ? 'opacity-40 bg-[#E0F2FE]' : ''
                        } ${
                          col.visible ? 'bg-[#FAF8F5] text-[#111827]' : 'bg-white text-[#9CA3AF]'
                        } hover:bg-[#F3F4F6] border border-transparent hover:border-[#E5E7EB]`}
                      >
                        <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-1 select-none">
                          <GripVertical className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                          <label className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0 truncate">
                            <input
                              type="checkbox"
                              checked={col.visible}
                              onChange={() => toggleColumnVisibility(col.id)}
                              className="rounded border-[#D1D5DB] text-[#111827] focus:ring-0 cursor-pointer"
                            />
                            <span className={`text-xs truncate ${col.visible ? 'font-medium text-[#111827]' : 'line-through text-[#9CA3AF]'}`}>
                              {col.label}
                            </span>
                          </label>
                        </div>

                        {/* Order adjustment buttons */}
                        <div className="flex items-center space-x-0.5 ml-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveColumn(index, 'up')}
                            className="p-1 rounded hover:bg-[#E5E7EB] disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                            title="Move column up / left"
                          >
                            <ChevronUp className="w-3 h-3 text-[#374151]" />
                          </button>
                          <button
                            type="button"
                            disabled={index === columns.length - 1}
                            onClick={() => moveColumn(index, 'down')}
                            className="p-1 rounded hover:bg-[#E5E7EB] disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                            title="Move column down / right"
                          >
                            <ChevronDown className="w-3 h-3 text-[#374151]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] mt-2 flex justify-between items-center text-[10px] text-[#716C64]">
                    <span>{visibleColumns.length} columns active</span>
                    <button
                      type="button"
                      onClick={() => setShowColumnManager(false)}
                      className="px-2 py-1 bg-[#111827] text-white rounded-[3px] text-xs font-medium cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-[#E5E7EB] focus:border-[#111827] px-2 py-1.5 rounded-[4px] font-sans text-xs text-[#111827] outline-none cursor-pointer shadow-2xs hidden sm:block"
          >
            <option value="name-asc">Sort: Name (A → Z)</option>
            <option value="name-desc">Sort: Name (Z → A)</option>
            <option value="quadrant">Sort: By Quadrant</option>
            <option value="type">Sort: By Entity Type</option>
            <option value="archipelago">Sort: By Archipelago</option>
          </select>

          {/* Export Dropdown with 3 options: csv, xlsx, json */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              id="directory-export-menu-btn"
              onClick={() => setExportMenuOpen(prev => !prev)}
              title="Export directory data (.xlsx, .csv, .json)"
              aria-label="Export directory dataset"
              aria-haspopup="true"
              aria-expanded={exportMenuOpen}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-[4px] text-xs font-sans transition-all cursor-pointer shadow-xs ${
                exportMenuOpen
                  ? 'bg-[#111827] text-white border-[#111827]'
                  : 'bg-white hover:bg-[#FAF8F5] text-[#111827] border-[#E5E7EB] hover:border-[#111827]'
              }`}
            >
              <Download className={`w-3.5 h-3.5 ${exportMenuOpen ? 'text-white' : 'text-[#4D5734]'}`} />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#111827] rounded-[6px] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2.5 py-2 border-b border-[#E5E7EB] mb-1">
                  <p className="font-editorial text-xs font-semibold text-[#111827]">
                    Export Ecosystem Data
                  </p>
                  <p className="font-sans text-[10px] text-[#716C64]">
                    {filteredEntities.length} of {entities.length} entities • Select format
                  </p>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportEntities(filteredEntities, 'xlsx', `metta_ecosystem_directory_${new Date().toISOString().slice(0, 10)}`);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] hover:bg-[#FAF8F5] text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1 rounded bg-[#ECFDF5] text-[#059669] shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111827] group-hover:text-[#059669] transition-colors">
                          Excel Workbook
                        </p>
                        <p className="text-[10px] text-[#8C877F] truncate">
                          Formatted sheets & columns
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-technical font-bold uppercase bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">
                      .xlsx
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportEntities(filteredEntities, 'csv', `metta_ecosystem_directory_${new Date().toISOString().slice(0, 10)}`);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] hover:bg-[#FAF8F5] text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1 rounded bg-[#EFF6FF] text-[#2563EB] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111827] group-hover:text-[#2563EB] transition-colors">
                          CSV Spreadsheet
                        </p>
                        <p className="text-[10px] text-[#8C877F] truncate">
                          Comma-separated records
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-technical font-bold uppercase bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">
                      .csv
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportEntities(filteredEntities, 'json', `metta_ecosystem_directory_${new Date().toISOString().slice(0, 10)}`);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] hover:bg-[#FAF8F5] text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1 rounded bg-[#F5F3FF] text-[#7C3AED] shrink-0">
                        <FileJson className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111827] group-hover:text-[#7C3AED] transition-colors">
                          JSON Dataset
                        </p>
                        <p className="text-[10px] text-[#8C877F] truncate">
                          Full structured schema
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-technical font-bold uppercase bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">
                      .json
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  </header>

      {/* Main Two-Column Layout: Left Sidebar + Directory Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar containing map filters */}
        <aside
          className={`border-r border-[#E5E7EB] bg-[#FAF8F5] transition-all duration-300 flex flex-col z-20 shrink-0 ${
            sidebarCollapsed ? 'w-12' : 'w-72 lg:w-80'
          }`}
        >
          {/* Sidebar Header & Toggle */}
          <div className="p-3 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
            {!sidebarCollapsed ? (
              <div className="flex items-center space-x-2 min-w-0">
                <SlidersHorizontal className="w-4 h-4 text-[#111827] shrink-0" />
                <span className="font-editorial text-sm font-bold text-[#111827] truncate">
                  Directory Filters
                </span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-[#0284C7] shrink-0" title="Filters active" />
                )}
              </div>
            ) : (
              <SlidersHorizontal className="w-4 h-4 text-[#111827] mx-auto" />
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed(prev => !prev)}
              title={sidebarCollapsed ? 'Expand filters' : 'Collapse filters'}
              className="p-1 text-[#6B7280] hover:text-[#111827] hover:bg-[#FAF8F5] rounded-[4px] transition-colors cursor-pointer"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Sidebar Filter Body */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs font-sans">
              {/* Reset Filters Button if Active */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between p-2 bg-white border border-[#E5E7EB] rounded-[4px]">
                  <span className="text-[11px] font-technical text-[#716C64]">
                    Active filters applied
                  </span>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="flex items-center space-x-1 text-[11px] font-sans text-[#DC2626] hover:underline cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All</span>
                  </button>
                </div>
              )}

              {/* Mobile/Sidebar Search */}
              <div className="space-y-1 lg:hidden">
                <label className="font-technical text-[10px] uppercase font-bold text-[#6B7280]">
                  Search
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-2.5 top-2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search entities, tags..."
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs pl-8 pr-2 py-1.5 rounded-[4px] outline-none"
                  />
                </div>
              </div>

              {/* 1. Quadrants Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-technical text-[10.5px] uppercase font-semibold text-[#4B5563] tracking-wider">
                    Transformation Quadrants
                  </span>
                </div>
                <div className="space-y-1 bg-white p-2.5 rounded-[5px] border border-[#E5E7EB]">
                  {(['Inner', 'Social', 'Cultural', 'Systems'] as CategoryQuadrant[]).map(cat => {
                    const qInfo = quadrantColors[cat];
                    const isChecked = filterState.categories[cat];
                    const count = entities.filter(e => e.category === cat).length;

                    return (
                      <label
                        key={cat}
                        className="flex items-center justify-between p-1 rounded hover:bg-[#FAF8F5] cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setFilterState(prev => ({
                              ...prev,
                              categories: {
                                ...prev.categories,
                                [cat]: !prev.categories[cat]
                              }
                            }))}
                            className="rounded border-[#D1D5DB] text-[#111827] focus:ring-0 cursor-pointer"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: qInfo.dot }}
                          />
                          <span className="text-xs text-[#111827] font-normal">{qInfo.label}</span>
                        </div>
                        <span className="font-technical text-[10px] text-[#6B7280]">
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Entity Types Filter */}
              <div className="space-y-1.5">
                <span className="font-technical text-[10.5px] uppercase font-semibold text-[#4B5563] tracking-wider">
                  Entity Types
                </span>
                <div className="space-y-1 bg-white p-2.5 rounded-[5px] border border-[#E5E7EB]">
                  {(['Organization', 'Person', 'Idea'] as EntityType[]).map(type => {
                    const isChecked = filterState.entityTypes[type];
                    const count = entities.filter(e => e.type === type).length;
                    return (
                      <label
                        key={type}
                        className="flex items-center justify-between p-1 rounded hover:bg-[#FAF8F5] cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setFilterState(prev => ({
                              ...prev,
                              entityTypes: {
                                ...prev.entityTypes,
                                [type]: !prev.entityTypes[type]
                              }
                            }))}
                            className="rounded border-[#D1D5DB] text-[#111827] focus:ring-0 cursor-pointer"
                          />
                          {getEntityIcon(type)}
                          <span className="text-xs text-[#111827] font-normal">
                            {type === 'Organization' ? 'Organizations' : type === 'Person' ? 'People & Fellows' : 'Ideas & Concepts'}
                          </span>
                        </div>
                        <span className="font-technical text-[10px] text-[#6B7280]">
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Stream Filter (Above Archipelagos, identifies spreadsheet Stream / Streams column, multi-selectable) */}
              <MultiSelectFilterDropdown
                id="stream"
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
                isOpen={openDropdownId === 'stream'}
                onToggle={() => setOpenDropdownId(prev => prev === 'stream' ? null : 'stream')}
                onClose={() => setOpenDropdownId(null)}
              />

              {/* 4. Archipelago Filter (Multi-selectable) */}
              <MultiSelectFilterDropdown
                id="archipelago"
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
                isOpen={openDropdownId === 'archipelago'}
                onToggle={() => setOpenDropdownId(prev => prev === 'archipelago' ? null : 'archipelago')}
                onClose={() => setOpenDropdownId(null)}
              />

              {/* 4. Data Completeness Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-technical text-[10.5px] uppercase font-semibold text-[#4B5563] tracking-wider">
                    Data Completeness
                  </span>
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
                      className="text-[#6B7280] hover:text-[#111827] underline cursor-pointer"
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
                      className="text-[#6B7280] hover:text-[#111827] underline cursor-pointer"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="space-y-1 bg-white p-2.5 rounded-[5px] border border-[#E5E7EB]">
                  {DATA_COMPLETENESS_LEVELS.map(level => {
                    const cfg = getCompletenessConfig(level);
                    const isChecked = filterState.dataCompleteness
                      ? filterState.dataCompleteness[level] !== false
                      : (filterState.dataQuality ? (filterState.dataQuality as any)[level] !== false : true);
                    const count = entities.filter(e => getEntityCompleteness(e) === level).length;

                    return (
                      <label
                        key={level}
                        className="flex items-center justify-between p-1 rounded hover:bg-[#FAF8F5] cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setFilterState(prev => {
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
                                [level]: nextVal
                              };
                              return {
                                ...prev,
                                dataCompleteness: updated,
                                dataQuality: updated
                              };
                            })}
                            className="rounded border-[#D1D5DB] text-[#111827] focus:ring-0 cursor-pointer"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs border border-white"
                            style={{ backgroundColor: cfg.dotBg }}
                          />
                          <span className="text-xs font-normal text-[#111827]">
                            {cfg.label}
                          </span>
                        </div>
                        <span className="font-technical text-[10px] text-[#6B7280]">
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. Ecotones (Intersections) Filter */}
              <div className="space-y-1.5">
                <span className="font-technical text-[10.5px] uppercase font-semibold text-[#4B5563] tracking-wider">
                  Landscape Topology
                </span>
                <div className="bg-white p-2.5 rounded-[5px] border border-[#E5E7EB]">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={Boolean(filterState.onlyEcotones)}
                        onChange={() => setFilterState(prev => ({ ...prev, onlyEcotones: !prev.onlyEcotones }))}
                        className="rounded border-[#D1D5DB] text-[#111827] focus:ring-0 cursor-pointer"
                      />
                      <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
                      <span className="text-xs text-[#111827] font-normal">Ecotones (Intersections) Only</span>
                    </div>
                    <span className="font-technical text-[10px] text-[#6B7280]">
                      {entities.filter(e => isEntityDomainElevation(e)).length}
                    </span>
                  </label>
                </div>
              </div>

              {/* 6. Extended Logistics Filters */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                <span className="font-technical text-[10.5px] uppercase font-semibold text-[#4B5563] tracking-wider block">
                  Taxonomy & Logistics
                </span>

                {/* Our Relationship */}
                {ourRelationships.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="ourRelationship"
                    label="Our Relationship"
                    singularLabel="relationship"
                    pluralLabel="relationships"
                    options={ourRelationships.map(r => ({
                      value: r,
                      label: r,
                      count: relationshipCounts[r] || 0
                    }))}
                    selectedValues={activeOurRels}
                    onChange={(newVals) => {
                      setFilterState(prev => ({
                        ...prev,
                        selectedOurRelationships: newVals,
                        selectedOurRelationship: newVals.length === 1 ? newVals[0] : (newVals.length === 0 ? 'All' : newVals.join(', '))
                      }));
                    }}
                    totalEntitiesCount={entities.length}
                    isOpen={openDropdownId === 'ourRelationship'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'ourRelationship' ? null : 'ourRelationship')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Country */}
                {countries.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="country"
                    label="Country / Location"
                    singularLabel="location"
                    pluralLabel="locations"
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
                    isOpen={openDropdownId === 'country'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'country' ? null : 'country')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* City, State */}
                {cityStates.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="cityState"
                    label="City, State"
                    singularLabel="city/state"
                    pluralLabel="cities/states"
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
                    isOpen={openDropdownId === 'cityState'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'cityState' ? null : 'cityState')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Biome (Column AE in spreadsheet) */}
                {biomes.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="biome"
                    label="Biome"
                    singularLabel="biome"
                    pluralLabel="biomes"
                    options={biomes.map(b => ({
                      value: b,
                      label: b,
                      count: biomeCounts[b] || 0
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
                    isOpen={openDropdownId === 'biome' || openDropdownId === 'bioregion'}
                    onToggle={() => setOpenDropdownId(prev => (prev === 'biome' || prev === 'bioregion') ? null : 'biome')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Language */}
                {languagesList.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="language"
                    label="Language"
                    singularLabel="language"
                    pluralLabel="languages"
                    options={languagesList.map(l => ({
                      value: l,
                      label: l,
                      count: languageCounts[l] || 0
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
                    isOpen={openDropdownId === 'language'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'language' ? null : 'language')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Operating Region */}
                {operatingRegions.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="operatingRegion"
                    label="Operating Region"
                    singularLabel="operating region"
                    pluralLabel="operating regions"
                    options={operatingRegions.map(or => ({
                      value: or,
                      label: or,
                      count: operatingRegionCounts[or] || 0
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
                    isOpen={openDropdownId === 'operatingRegion'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'operatingRegion' ? null : 'operatingRegion')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Operation Focus */}
                {operationFocuses.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="operationFocus"
                    label="Operation Focus"
                    singularLabel="focus area"
                    pluralLabel="focus areas"
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
                    isOpen={openDropdownId === 'operationFocus'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'operationFocus' ? null : 'operationFocus')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Maturity Level */}
                {maturityLevels.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="maturity"
                    label="Maturity / Stage"
                    singularLabel="stage"
                    pluralLabel="stages"
                    options={maturityLevels.map(m => ({
                      value: m,
                      label: m,
                      count: maturityCounts[m] || 0
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
                    isOpen={openDropdownId === 'maturity'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'maturity' ? null : 'maturity')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Size */}
                {sizes.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="size"
                    label="Team / Org Size"
                    singularLabel="size"
                    pluralLabel="sizes"
                    options={sizes.map(s => ({
                      value: s,
                      label: s,
                      count: sizeCounts[s] || 0
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
                    isOpen={openDropdownId === 'size'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'size' ? null : 'size')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Reach */}
                {reaches.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="reach"
                    label="Audience Reach"
                    singularLabel="reach scale"
                    pluralLabel="reach scales"
                    options={reaches.map(r => ({
                      value: r,
                      label: r,
                      count: reachCounts[r] || 0
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
                    isOpen={openDropdownId === 'reach'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'reach' ? null : 'reach')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}

                {/* Tags / Themes Filter (Multi-selectable) */}
                {sortedTags.length > 0 && (
                  <MultiSelectFilterDropdown
                    id="tags"
                    label="Tags"
                    singularLabel="tag"
                    pluralLabel="tags"
                    options={sortedTags.map(t => ({
                      value: t.tag,
                      label: t.tag,
                      count: t.count
                    }))}
                    selectedValues={filterState.selectedFields || []}
                    onChange={(newVals) => {
                      setFilterState(prev => ({
                        ...prev,
                        selectedFields: newVals
                      }));
                    }}
                    totalEntitiesCount={entities.length}
                    isOpen={openDropdownId === 'tags'}
                    onToggle={() => setOpenDropdownId(prev => prev === 'tags' ? null : 'tags')}
                    onClose={() => setOpenDropdownId(null)}
                  />
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Directory Content: Either Full-Page Expanded Entity View OR Directory Grid/List */}
        {activeSelectedEntity ? (
          <div className="flex-1 h-full overflow-hidden bg-white flex flex-col relative z-10">
            <RightSidebar
              entity={activeSelectedEntity}
              continents={continents}
              editMode={editMode || false}
              enlargedOnly={true}
              initialEnlarged={true}
              fullPageEmbedded={true}
              onClose={handleCloseEntity}
              onCenterEntity={(ent) => {
                onLocateOnMap(ent);
              }}
              onFocusEntity={(ent) => {
                onLocateOnMap(ent);
              }}
              onFlyToContinent={() => {
                onLocateOnMap(activeSelectedEntity);
              }}
              onFlyToQuadrant={() => {
                onLocateOnMap(activeSelectedEntity);
              }}
              onFlyToTag={() => {
                onLocateOnMap(activeSelectedEntity);
              }}
              onSelectContinent={onSelectContinent}
              onSelectCategoryList={onSelectCategoryList}
              onSelectRelationshipList={onSelectRelationshipList}
              onSelectEntityTypeList={onSelectEntityTypeList}
              onSelectTagList={onSelectTagList}
              onUpdateEntity={onUpdateEntity || (() => {})}
              onUpdateEntityNotes={onUpdateEntityNotes || (() => {})}
              onUpdateEntityCoordinates={onUpdateEntityCoordinates || (() => {})}
              onAddCommunityNote={onAddCommunityNote || (() => {})}
              onDeleteCommunityNote={onDeleteCommunityNote || (() => {})}
              allEntities={entities}
              onSelectEntity={(ent) => {
                if (ent) {
                  handleEntityCardClick(ent);
                } else {
                  handleCloseEntity();
                }
              }}
            />
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF8F5]">
          {filteredEntities.length === 0 ? (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 bg-white border border-[#E5E7EB] rounded-[8px]">
              <div className="w-14 h-14 rounded-full bg-[#FAF8F5] border border-[#E5E7EB] flex items-center justify-center text-[#8C877F] mb-3 shadow-xs">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-lg font-semibold text-[#111827]">
                No matching entities found
              </h3>
              <p className="font-sans text-xs text-[#716C64] max-w-md mt-1 mb-4">
                We couldn't find any entities matching your current search query and filters. Try adjusting or clearing your criteria.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#111827] text-white text-xs font-sans rounded-[4px] hover:bg-[#1F2937] transition-all cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset all filters</span>
              </button>
            </div>
          ) : viewMode === 'card' ? (
            /* ============================================================ */
            /* CARDS VIEW - LOGO DISPLAYED AT THE TOP OF THE CARDS          */
            /* ============================================================ */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEntities.map((ent, entIdx) => {
                const qColor = quadrantColors[ent.category] || quadrantColors.Social;
                const dq = ent.dataQuality || 'No data';
                const logoUrl = getEntityLogoUrl(ent);

                return (
                  <div
                    key={ent.id || `card-${entIdx}`}
                    onClick={() => handleEntityCardClick(ent)}
                    className="bg-white border border-[#E5E7EB] hover:border-[#111827] hover:shadow-md rounded-[8px] p-4 flex flex-col justify-between transition-all cursor-pointer group relative"
                  >
                    <div>
                      {/* Logo at the very top of the card */}
                      <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-[#F3F4F6]">
                        {/* Top Logo Container */}
                        <div className="w-12 h-12 rounded-[6px] border border-[#E5E7EB] bg-white p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs group-hover:border-[#111827] transition-colors">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={`${ent.name} logo`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.card-fallback-icon') as HTMLElement | null;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span
                            className={`card-fallback-icon text-lg select-none items-center justify-center w-full h-full ${logoUrl ? 'hidden' : 'flex'}`}
                          >
                            {ent.type === 'Person' ? '🧙' : ent.type === 'Idea' ? '🔮' : '🕸️'}
                          </span>
                        </div>

                        {/* Top Right Badges: Quadrant, Entity Type & Data Quality */}
                        <div className="flex flex-col items-end space-y-1">
                          <div className="flex items-center space-x-1.5">
                            {ent.quadrant ? (
                              <>
                                <span
                                  className="w-2 h-2 rounded-full inline-block shrink-0 shadow-2xs"
                                  style={{ backgroundColor: qColor.dot }}
                                />
                                <span className="font-technical text-[10px] uppercase font-semibold text-[#4B5563]">
                                  {ent.quadrant}
                                </span>
                              </>
                            ) : (
                              <span className="font-technical text-[9px] uppercase font-medium text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded-[2px]" title="Outside Quadrants (Unassigned)">
                                Outside
                              </span>
                            )}
                          </div>

                          <div className="flex items-center">
                            <span className={`text-[9.5px] font-technical px-1.5 py-0.5 rounded-[3px] font-medium flex items-center space-x-1 ${
                              ent.type === 'Organization'
                                ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                : ent.type === 'Person'
                                ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                                : 'bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]'
                            }`}>
                              {getEntityIcon(ent.type)}
                              <span>{ent.type}</span>
                            </span>
                          </div>

                          {/* Data Completeness indicator shown below the entity type */}
                          {(() => {
                            const dc = getEntityCompleteness(ent);
                            const cfg = getCompletenessConfig(dc);
                            return (
                              <div className="flex items-center space-x-1.5 pt-0.5">
                                <span 
                                  title={`Data Completeness: ${dc} (${cfg.description})`}
                                  className="w-2 h-2 rounded-full inline-block shrink-0 border border-white shadow-2xs"
                                  style={{ backgroundColor: cfg.dotBg }}
                                />
                                <span className="font-technical text-[9.5px] font-medium text-[#4B5563]">
                                  {dc}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Entity Name */}
                      <h3 className="font-editorial text-base font-semibold text-[#111827] group-hover:text-[#5B21B6] transition-colors leading-snug line-clamp-1 mb-1.5">
                        {ent.name}
                      </h3>

                      {/* Archipelago & Location Info */}
                      <div className="space-y-1 mb-2 text-[11px] font-sans text-[#716C64]">
                        {ent.continent && (
                          <div className="flex items-center space-x-1.5 truncate text-[#4B5563]">
                            <Globe className="w-3.5 h-3.5 shrink-0 text-[#7D8764]" />
                            <span className="truncate font-medium">{ent.continent}</span>
                          </div>
                        )}
                        {ent.location && (
                          <div className="flex items-center space-x-1.5 truncate text-[#6B7280]">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0284C7]" />
                            <span className="truncate">{ent.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="font-sans text-xs text-[#4B5563] line-clamp-2 leading-relaxed mb-3">
                        {ent.description || 'No description provided.'}
                      </p>

                      {/* Tags */}
                      {(() => {
                        const cardTags = filterProfileTags(ent.fields || [], ent);
                        if (cardTags.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {cardTags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="font-technical text-[9px] px-1.5 py-0.5 bg-[#FAF8F5] text-[#4B5563] border border-[#E5E7EB] rounded-[3px] truncate max-w-[120px]"
                              >
                                {tag}
                              </span>
                            ))}
                            {cardTags.length > 3 && (
                              <span className="font-technical text-[9px] px-1.5 py-0.5 bg-[#F3F4F6] text-[#716C64] rounded-[3px]">
                                +{cardTags.length - 3}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between gap-2 mt-auto">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleLocateClick(e, ent)}
                          className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#111827] text-[#111827] hover:text-white border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] text-[11px] font-sans font-medium transition-all cursor-pointer shadow-2xs group/btn"
                          title="Map"
                        >
                          <Navigation className="w-3 h-3 text-[#0284C7] group-hover/btn:text-[#D9C01B]" />
                          <span>Map</span>
                        </button>

                        {ent.website && (
                          <a
                            href={ent.website.startsWith('http') ? ent.website : `https://${ent.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-[#8C877F] hover:text-[#111827] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E5E7EB] rounded-[4px] transition-colors"
                            title={`Open website: ${ent.website}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEntityCardClick(ent);
                        }}
                        className="text-[11px] font-medium text-[#111827] group-hover:underline flex items-center space-x-0.5 cursor-pointer bg-transparent border-0 p-0"
                        title={`View full profile for ${ent.name}`}
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ============================================================ */
            /* LIST / TABLE VIEW WITH USER-SELECTABLE & REORDERABLE COLUMNS */
            /* ============================================================ */
            <div className="space-y-2.5">
              {/* Quick Column Selection & Reordering Bar at the top of the list view */}
              <div className="bg-white border border-[#E5E7EB] rounded-[6px] p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="font-technical text-[10.5px] uppercase font-bold text-[#6B7280] flex items-center gap-1">
                    <Columns3 className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Columns ({visibleColumns.length}):</span>
                  </span>
                  <div className="flex items-center flex-wrap gap-1">
                    {visibleColumns.map((col, idx) => (
                      <span
                        key={col.id}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#FAF8F5] border border-[#E5E7EB] text-[#111827] rounded-[3px] text-[11px] font-sans"
                      >
                        <span className="text-[#8C877F] font-mono text-[9px]">{idx + 1}.</span>
                        <span>{col.label}</span>
                        {visibleColumns.length > 2 && col.id !== 'name' && (
                          <button
                            type="button"
                            onClick={() => toggleColumnVisibility(col.id)}
                            className="p-0.5 hover:text-[#DC2626] transition-colors cursor-pointer"
                            title={`Hide ${col.label} column`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowColumnManager(true)}
                  className="flex items-center space-x-1.5 text-xs text-[#0284C7] hover:text-[#0369A1] font-medium underline cursor-pointer shrink-0"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Select & Reorder Columns</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-white border border-[#E5E7EB] rounded-[6px] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E5E7EB] font-technical text-[10px] text-[#716C64] uppercase tracking-wider">
                      {visibleColumns.map(col => (
                        <th
                          key={col.id}
                          className={`py-2.5 px-3 whitespace-nowrap ${col.id === 'actions' ? 'text-right' : ''}`}
                          style={{ minWidth: col.minWidth }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {filteredEntities.map((ent, entIdx) => {
                      const qColor = quadrantColors[ent.category] || quadrantColors.Social;
                      const dq = ent.dataQuality || 'No data';
                      const logoUrl = getEntityLogoUrl(ent);

                      return (
                        <tr
                          key={ent.id || `row-${entIdx}`}
                          onClick={() => handleEntityCardClick(ent)}
                          className="hover:bg-[#FAF8F5] cursor-pointer transition-colors group"
                        >
                          {visibleColumns.map(col => {
                            switch (col.id) {
                              case 'logo':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="w-7 h-7 rounded-[4px] border border-[#E5E7EB] bg-white p-0.5 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
                                      {logoUrl ? (
                                        <img
                                          src={logoUrl}
                                          alt=""
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-contain"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.parentElement?.querySelector('.row-fallback-icon') as HTMLElement | null;
                                            if (fallback) fallback.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <span
                                        className={`row-fallback-icon text-xs select-none items-center justify-center w-full h-full ${logoUrl ? 'hidden' : 'flex'}`}
                                      >
                                        {ent.type === 'Person' ? '🧙' : ent.type === 'Idea' ? '🔮' : '🕸️'}
                                      </span>
                                    </div>
                                  </td>
                                );

                              case 'name':
                                return (
                                  <td key={col.id} className="py-2.5 px-3">
                                    <div className="flex items-center space-x-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                                        style={{ backgroundColor: qColor.dot }}
                                      />
                                      <div className="min-w-0">
                                        <div className="font-editorial text-sm font-semibold text-[#111827] group-hover:text-[#5B21B6] transition-colors leading-tight">
                                          {ent.name}
                                        </div>
                                        {ent.description && (
                                          <div className="text-[11px] text-[#716C64] truncate max-w-xs mt-0.5">
                                            {ent.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );

                              case 'type':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center space-x-1 text-[10px] font-technical px-2 py-0.5 rounded-[3px] font-medium ${
                                      ent.type === 'Organization'
                                        ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                        : ent.type === 'Person'
                                        ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                                        : 'bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]'
                                    }`}>
                                      {getEntityIcon(ent.type)}
                                      <span>{ent.type}</span>
                                    </span>
                                  </td>
                                );

                              case 'quadrant':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="font-technical text-[10.5px] font-semibold text-[#374151]">
                                      {ent.quadrant ? `${ent.quadrant} Quadrant` : 'Outside Quadrants'}
                                    </span>
                                  </td>
                                );

                              case 'archipelago':
                                return (
                                  <td key={col.id} className="py-2.5 px-3">
                                    <span className="text-xs text-[#4B5563] truncate block max-w-[200px]">
                                      {ent.continent || '—'}
                                    </span>
                                  </td>
                                );

                              case 'location':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="text-xs text-[#6B7280]">
                                      {ent.location || '—'}
                                    </span>
                                  </td>
                                );

                              case 'tags': {
                                const tableTags = filterProfileTags(ent.fields || [], ent);
                                return (
                                  <td key={col.id} className="py-2.5 px-3">
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                      {tableTags.slice(0, 2).map(tag => (
                                        <span
                                          key={tag}
                                          className="font-technical text-[9px] px-1.5 py-0.2 bg-[#FAF8F5] text-[#4B5563] border border-[#E5E7EB] rounded-[2px] truncate"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                      {tableTags.length > 2 && (
                                        <span className="font-technical text-[9px] px-1 py-0.2 bg-[#F3F4F6] text-[#716C64] rounded-[2px]">
                                          +{tableTags.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              }

                              case 'maturity':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="text-xs text-[#4B5563]">
                                      {getEntitySpreadsheetField(ent, 'AH2') || ent.stage || '—'}
                                    </span>
                                  </td>
                                );

                              case 'language':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="text-xs text-[#4B5563]">
                                      {getEntitySpreadsheetField(ent, 'AA2') || ent.language || '—'}
                                    </span>
                                  </td>
                                );

                              case 'website':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    {ent.website ? (
                                      <a
                                        href={ent.website.startsWith('http') ? ent.website : `https://${ent.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-[#0284C7] hover:underline font-mono truncate max-w-[140px] block"
                                      >
                                        {formatDisplayUrl(ent.website)}
                                      </a>
                                    ) : (
                                      <span className="text-[#9CA3AF]">—</span>
                                    )}
                                  </td>
                                );

                              case 'relationship':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="text-xs text-[#4B5563]">
                                      {getEntitySpreadsheetField(ent, 'S2') || '—'}
                                    </span>
                                  </td>
                                );

                              case 'dataCompleteness':
                              case 'dataQuality': {
                                const dc = getEntityCompleteness(ent);
                                const cfg = getCompletenessConfig(dc);
                                return (
                                  <td key={col.id} className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="flex items-center space-x-1.5">
                                      <span
                                        className="w-2 h-2 rounded-full inline-block shrink-0 shadow-2xs border border-white"
                                        style={{ backgroundColor: cfg.dotBg }}
                                      />
                                      <span className="font-technical text-[10px] font-medium text-[#4B5563]">
                                        {dc}
                                      </span>
                                    </div>
                                  </td>
                                );
                              }

                              case 'actions':
                                return (
                                  <td key={col.id} className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end space-x-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => handleLocateClick(e, ent)}
                                        className="p-1.5 text-[#0284C7] hover:bg-[#E0F2FE] rounded-[4px] transition-colors cursor-pointer"
                                        title="Locate on the map"
                                      >
                                        <Navigation className="w-3.5 h-3.5" />
                                      </button>

                                      {ent.website && (
                                        <a
                                          href={ent.website.startsWith('http') ? ent.website : `https://${ent.website}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-[#FAF8F5] rounded-[4px] transition-colors"
                                          title={`Visit website: ${ent.website}`}
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleEntityCardClick(ent)}
                                        className="px-2 py-1 bg-white hover:bg-[#111827] text-[#111827] hover:text-white border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] text-[10.5px] font-sans font-medium transition-all cursor-pointer"
                                        title="View full profile details"
                                      >
                                        Details
                                      </button>
                                    </div>
                                  </td>
                                );

                              default:
                                return <td key={col.id} className="py-2.5 px-3">—</td>;
                            }
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
          </main>
        )}
      </div>
    </div>
  );
};
