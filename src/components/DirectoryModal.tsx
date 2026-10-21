import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, Search, LayoutGrid, List, MapPin, Globe, Building2, User, Lightbulb, 
  ArrowUpRight, Navigation, Download, Filter, RotateCcw, Check, Sparkles, ExternalLink
} from 'lucide-react';
import { EcosystemEntity, CategoryQuadrant, EntityType, DataQualityStatus, DataCompletenessLevel, DATA_COMPLETENESS_LEVELS, DATA_COMPLETENESS_CONFIG, getEntityCompleteness, getCompletenessConfig, ContinentInfo } from '../types';
import { exportEntities } from '../utils/excelParser';

interface DirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: EcosystemEntity[];
  continents: ContinentInfo[];
  onSelectEntity: (entity: EcosystemEntity) => void;
  onLocateOnMap: (entity: EcosystemEntity) => void;
}

export const DirectoryModal: React.FC<DirectoryModalProps> = ({
  isOpen,
  onClose,
  entities,
  continents,
  onSelectEntity,
  onLocateOnMap,
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<EntityType | 'All'>('All');
  const [selectedQuadrant, setSelectedQuadrant] = useState<CategoryQuadrant | 'All'>('All');
  const [selectedContinent, setSelectedContinent] = useState<string>('All');
  const [selectedQuality, setSelectedQuality] = useState<DataCompletenessLevel | 'All'>('All');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'quadrant' | 'type' | 'archipelago'>('name-asc');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sort archipelagos strictly A-Z
  const sortedArchipelagos = useMemo(() => {
    return [...continents].sort((a, b) => {
      const cleanA = a.name.replace(/^\d+[\.\s\-]+/, '').trim();
      const cleanB = b.name.replace(/^\d+[\.\s\-]+/, '').trim();
      return cleanA.localeCompare(cleanB, undefined, { sensitivity: 'base' });
    });
  }, [continents]);

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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('All');
    setSelectedQuadrant('All');
    setSelectedContinent('All');
    setSelectedQuality('All');
    setSortBy('name-asc');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedType !== 'All' ||
    selectedQuadrant !== 'All' ||
    selectedContinent !== 'All' ||
    selectedQuality !== 'All' ||
    sortBy !== 'name-asc'
  );

  // Filter and sort entities
  const filteredEntities = useMemo(() => {
    let result = entities.filter(ent => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ent.name.toLowerCase().includes(q);
        const matchesDesc = (ent.description || '').toLowerCase().includes(q);
        const matchesLocation = (ent.location || '').toLowerCase().includes(q);
        const matchesContinent = (ent.continent || '').toLowerCase().includes(q);
        const matchesTags = (ent.fields || []).some(f => f.toLowerCase().includes(q));
        const matchesType = ent.type.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesLocation && !matchesContinent && !matchesTags && !matchesType) {
          return false;
        }
      }

      // 2. Entity Type
      if (selectedType !== 'All' && ent.type !== selectedType) {
        return false;
      }

      // 3. Category Quadrant
      if (selectedQuadrant !== 'All' && ent.category !== selectedQuadrant) {
        return false;
      }

      // 4. Continent / Archipelago
      if (selectedContinent !== 'All' && ent.continent !== selectedContinent) {
        return false;
      }

      // 5. Data Completeness
      if (selectedQuality !== 'All') {
        const quality = getEntityCompleteness(ent);
        if (quality !== selectedQuality) {
          return false;
        }
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
        case 'archipelago':
          return (a.continent || '').localeCompare(b.continent || '') || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [entities, searchQuery, selectedType, selectedQuadrant, selectedContinent, selectedQuality, sortBy]);

  // Counts for tabs
  const typeCounts = useMemo(() => {
    return {
      All: entities.length,
      Organization: entities.filter(e => e.type === 'Organization').length,
      Person: entities.filter(e => e.type === 'Person').length,
      Idea: entities.filter(e => e.type === 'Idea').length,
    };
  }, [entities]);

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

  const handleEntityClick = (entity: EcosystemEntity) => {
    onSelectEntity(entity);
    onClose();
  };

  const handleLocateClick = (e: React.MouseEvent, entity: EcosystemEntity) => {
    e.stopPropagation();
    onLocateOnMap(entity);
    onClose();
  };

  const handleExportFiltered = () => {
    exportEntities(filteredEntities, 'csv', `metta_directory_${selectedType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] border border-[#111827] rounded-[8px] w-full max-w-6xl h-[92vh] max-h-[950px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-[#111827]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-white border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-[6px] bg-[#111827] text-white flex items-center justify-center shadow-xs">
              <List className="w-5 h-5 text-[#D9C01B]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-editorial text-xl font-bold text-[#111827] tracking-tight">
                  Ecosystem Directory
                </h2>
                <span className="font-technical text-[11px] bg-[#FAF8F5] text-[#111827] border border-[#E5E7EB] px-2 py-0.5 rounded-[4px] font-semibold">
                  {filteredEntities.length} of {entities.length}
                </span>
              </div>
              <p className="font-sans text-[11px] text-[#716C64]">
                Comprehensive registry of organizations, fellows, and ideas across transformation quadrants
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#FAF8F5] border border-[#E5E7EB] p-0.5 rounded-[5px]">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                title="Card View"
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
                title="List View"
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

            {/* Export Filtered Data */}
            <button
              type="button"
              onClick={handleExportFiltered}
              title="Download currently filtered entities as CSV"
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-white border border-[#E5E7EB] hover:border-[#111827] text-xs font-sans rounded-[4px] text-[#111827] hover:bg-[#FAF8F5] transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#4D5734]" />
              <span>Export</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-[#FAF8F5] rounded-[4px] transition-colors cursor-pointer"
              title="Close Directory (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:px-5 sm:py-3 bg-[#FAF8F5] border-b border-[#E5E7EB] space-y-2.5 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C877F] absolute left-3 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search entities by name, tags, description, location, archipelago..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans pl-9 pr-8 py-2 rounded-[5px] outline-none text-[#111827] placeholder-[#8C877F] transition-colors shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-0.5 text-[#8C877F] hover:text-[#111827] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdowns */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              {/* Category Quadrant */}
              <select
                value={selectedQuadrant}
                onChange={(e) => setSelectedQuadrant(e.target.value as CategoryQuadrant | 'All')}
                className="bg-white border border-[#E5E7EB] focus:border-[#111827] px-2.5 py-1.5 rounded-[4px] font-sans text-xs text-[#111827] outline-none cursor-pointer shadow-2xs"
              >
                <option value="All">All Quadrants</option>
                <option value="Inner">Inner Change</option>
                <option value="Social">Social Change</option>
                <option value="Cultural">Cultural Change</option>
                <option value="Systems">Systems Change</option>
              </select>

              {/* Archipelago Select */}
              <select
                value={selectedContinent}
                onChange={(e) => setSelectedContinent(e.target.value)}
                className="bg-white border border-[#E5E7EB] focus:border-[#111827] px-2.5 py-1.5 rounded-[4px] font-sans text-xs text-[#111827] outline-none cursor-pointer shadow-2xs max-w-[160px] truncate"
              >
                <option value="All">All Archipelagos</option>
                {sortedArchipelagos.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Data Completeness */}
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value as DataCompletenessLevel | 'All')}
                className="bg-white border border-[#E5E7EB] focus:border-[#111827] px-2.5 py-1.5 rounded-[4px] font-sans text-xs text-[#111827] outline-none cursor-pointer shadow-2xs"
              >
                <option value="All">All Completeness Levels</option>
                {DATA_COMPLETENESS_LEVELS.map(level => {
                  const cfg = getCompletenessConfig(level);
                  return (
                    <option key={level} value={level}>
                      {cfg.label} ({cfg.description})
                    </option>
                  );
                })}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-[#E5E7EB] focus:border-[#111827] px-2.5 py-1.5 rounded-[4px] font-sans text-xs text-[#111827] outline-none cursor-pointer shadow-2xs"
              >
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
                <option value="quadrant">By Quadrant</option>
                <option value="type">By Entity Type</option>
                <option value="archipelago">By Archipelago</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-[#FAF8F5] border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] text-[11px] font-sans text-[#716C64] hover:text-[#111827] transition-all cursor-pointer"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Entity Type Badges Bar */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E5E7EB]/80 text-xs">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5">
              <span className="font-technical text-[10px] text-[#8C877F] uppercase tracking-wider mr-1 hidden sm:inline">
                Type:
              </span>
              <button
                type="button"
                onClick={() => setSelectedType('All')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-[4px] font-technical text-xs transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === 'All'
                    ? 'bg-[#111827] text-white shadow-xs font-semibold'
                    : 'bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#FAF8F5]'
                }`}
              >
                <span>All Entities</span>
                <span className={`text-[10px] ml-0.5 px-1 rounded ${selectedType === 'All' ? 'bg-white/20 text-white' : 'bg-[#FAF8F5] text-[#716C64]'}`}>
                  {typeCounts.All}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType('Organization')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-[4px] font-technical text-xs transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === 'Organization'
                    ? 'bg-[#4D5734] text-white shadow-xs font-semibold'
                    : 'bg-white text-[#4D5734] border border-[#E5E7EB] hover:bg-[#FAF8F5]'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>Organizations</span>
                <span className={`text-[10px] ml-0.5 px-1 rounded ${selectedType === 'Organization' ? 'bg-white/20 text-white' : 'bg-[#FAF8F5] text-[#716C64]'}`}>
                  {typeCounts.Organization}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType('Person')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-[4px] font-technical text-xs transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === 'Person'
                    ? 'bg-[#0369A1] text-white shadow-xs font-semibold'
                    : 'bg-white text-[#0369A1] border border-[#E5E7EB] hover:bg-[#FAF8F5]'
                }`}
              >
                <User className="w-3 h-3" />
                <span>People & Fellows</span>
                <span className={`text-[10px] ml-0.5 px-1 rounded ${selectedType === 'Person' ? 'bg-white/20 text-white' : 'bg-[#FAF8F5] text-[#716C64]'}`}>
                  {typeCounts.Person}
                </span>
              </button>

              {typeCounts.Idea > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedType('Idea')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-[4px] font-technical text-xs transition-all cursor-pointer whitespace-nowrap ${
                    selectedType === 'Idea'
                      ? 'bg-[#5B21B6] text-white shadow-xs font-semibold'
                      : 'bg-white text-[#5B21B6] border border-[#E5E7EB] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Lightbulb className="w-3 h-3" />
                  <span>Ideas & Cornerstones</span>
                  <span className={`text-[10px] ml-0.5 px-1 rounded ${selectedType === 'Idea' ? 'bg-white/20 text-white' : 'bg-[#FAF8F5] text-[#716C64]'}`}>
                    {typeCounts.Idea}
                  </span>
                </button>
              )}
            </div>

            {/* Active filters count badge */}
            <span className="font-technical text-[10.5px] text-[#716C64] shrink-0">
              Showing <span className="font-bold text-[#111827]">{filteredEntities.length}</span> entities
            </span>
          </div>
        </div>

        {/* Directory Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredEntities.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-[#8C877F] mb-3 shadow-xs">
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
                onClick={resetFilters}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#111827] text-white text-xs font-sans rounded-[4px] hover:bg-[#1F2937] transition-all cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset all filters</span>
              </button>
            </div>
          ) : viewMode === 'card' ? (
            /* ============================================================ */
            /* CARD / GRID VIEW                                             */
            /* ============================================================ */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredEntities.map(ent => {
                const qColor = quadrantColors[ent.category] || quadrantColors.Social;
                const dq = ent.dataQuality || 'No data';
                const logoUrl = getEntityLogoUrl(ent);

                return (
                  <div
                    key={ent.id}
                    onClick={() => handleEntityClick(ent)}
                    className="bg-white border border-[#E5E7EB] hover:border-[#111827] hover:shadow-md rounded-[6px] p-3.5 flex flex-col justify-between transition-all cursor-pointer group relative"
                  >
                    <div>
                      {/* Logo at the top of the card */}
                      <div className="flex items-start justify-between gap-3 mb-2.5 pb-2.5 border-b border-[#F3F4F6]">
                        {/* Top Logo Container */}
                        <div className="w-11 h-11 rounded-[6px] border border-[#E5E7EB] bg-white p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs group-hover:border-[#111827] transition-colors">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.card-modal-fallback-icon') as HTMLElement | null;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span
                            className={`card-modal-fallback-icon text-base select-none items-center justify-center w-full h-full ${logoUrl ? 'hidden' : 'flex'}`}
                          >
                            {ent.type === 'Person' ? '🧙' : ent.type === 'Idea' ? '🔮' : '🕸️'}
                          </span>
                        </div>

                        {/* Top Meta Badges */}
                        <div className="flex flex-col items-end space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                              style={{ backgroundColor: qColor.dot }}
                            />
                            <span className="font-technical text-[10px] uppercase tracking-wider font-semibold text-[#6B7280]">
                              {ent.category}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {(() => {
                              const dc = getEntityCompleteness(ent);
                              const cfg = getCompletenessConfig(dc);
                              return (
                                <div className="flex items-center space-x-1 mr-1">
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
                            <span className={`text-[10px] font-technical px-2 py-0.5 rounded-[3px] font-medium flex items-center space-x-1 ${
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
                        </div>
                      </div>

                      {/* Entity Name */}
                      <h3 className="font-editorial text-base sm:text-[17px] font-semibold text-[#111827] group-hover:text-[#5B21B6] transition-colors leading-snug line-clamp-1 mb-1">
                        {ent.name}
                      </h3>

                      {/* Location & Archipelago Info */}
                      <div className="space-y-1 mb-2.5 text-[11px] font-sans text-[#716C64]">
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
                      {ent.fields && ent.fields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {ent.fields.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="font-technical text-[9.5px] px-1.5 py-0.5 bg-[#FAF8F5] text-[#4B5563] border border-[#E5E7EB] rounded-[3px] truncate max-w-[120px]"
                            >
                              {tag}
                            </span>
                          ))}
                          {ent.fields.length > 3 && (
                            <span className="font-technical text-[9.5px] px-1.5 py-0.5 bg-[#F3F4F6] text-[#716C64] rounded-[3px]">
                              +{ent.fields.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between gap-2 mt-auto">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleLocateClick(e, ent)}
                          className="flex items-center space-x-1 px-2 py-1 bg-[#FAF8F5] hover:bg-[#111827] text-[#111827] hover:text-white border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] text-[11px] font-sans font-medium transition-all cursor-pointer"
                          title="Map"
                        >
                          <Navigation className="w-3 h-3 text-[#0284C7] group-hover:text-white" />
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

                      <span className="text-[11px] font-medium text-[#111827] group-hover:underline flex items-center space-x-0.5">
                        <span>Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ============================================================ */
            /* LIST / TABLE VIEW                                            */
            /* ============================================================ */
            <div className="bg-white border border-[#E5E7EB] rounded-[6px] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E5E7EB] font-technical text-[10px] text-[#716C64] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Entity Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Quadrant</th>
                      <th className="py-2.5 px-3">Archipelago / Region</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Tags & Themes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {filteredEntities.map(ent => {
                      const qColor = quadrantColors[ent.category] || quadrantColors.Social;
                      const dq = ent.dataQuality || 'No data';

                      return (
                        <tr
                          key={ent.id}
                          onClick={() => handleEntityClick(ent)}
                          className="hover:bg-[#FAF8F5] cursor-pointer transition-colors group"
                        >
                          {/* Name */}
                          <td className="py-3 px-3">
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

                          {/* Type */}
                          <td className="py-3 px-3 whitespace-nowrap">
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

                          {/* Quadrant */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-technical text-[10.5px] font-semibold text-[#374151]">
                              {ent.category}
                            </span>
                          </td>

                          {/* Archipelago */}
                          <td className="py-3 px-3">
                            <span className="text-xs text-[#4B5563] truncate block max-w-[180px]">
                              {ent.continent || '—'}
                            </span>
                          </td>

                          {/* Location */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-xs text-[#6B7280]">
                              {ent.location || '—'}
                            </span>
                          </td>

                          {/* Tags */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(ent.fields || []).slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className="font-technical text-[9px] px-1.5 py-0.2 bg-[#FAF8F5] text-[#4B5563] border border-[#E5E7EB] rounded-[2px] truncate"
                                >
                                  {tag}
                                </span>
                              ))}
                              {(ent.fields || []).length > 2 && (
                                <span className="font-technical text-[9px] px-1 py-0.2 bg-[#F3F4F6] text-[#716C64] rounded-[2px]">
                                  +{(ent.fields || []).length - 2}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleLocateClick(e, ent)}
                                className="p-1.5 text-[#0284C7] hover:bg-[#E0F2FE] rounded-[4px] transition-colors cursor-pointer"
                                title="Locate on map"
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
                                onClick={() => handleEntityClick(ent)}
                                className="px-2 py-1 bg-white hover:bg-[#111827] text-[#111827] hover:text-white border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] text-[10.5px] font-sans font-medium transition-all cursor-pointer"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Directory Footer */}
        <div className="px-5 py-2.5 bg-white border-t border-[#E5E7EB] flex items-center justify-between text-xs font-sans text-[#716C64] shrink-0">
          <div className="flex items-center space-x-4">
            <span className="font-technical text-[11px]">
              Showing <span className="font-semibold text-[#111827]">{filteredEntities.length}</span> of {entities.length} entities
            </span>
            <span className="hidden md:inline text-[#D1D5DB]">|</span>
            <span className="hidden md:inline text-[11px]">
              Click any entity to view profile & center on map
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-[#FAF8F5] border border-[#E5E7EB] rounded-[4px] text-xs font-sans text-[#111827] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
