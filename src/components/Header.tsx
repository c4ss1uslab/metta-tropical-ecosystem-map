import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Globe, RefreshCw, Network, ChevronDown, X, MapPin, Building2, User, Lightbulb, BookOpen, Info, Maximize2, Minimize2, RotateCcw, Save } from 'lucide-react';
import { EcosystemEntity, EntityType, SidebarListScope } from '../types';
import { ExportFormat } from '../utils/excelParser';
import { getPendingContributionsCount, subscribeToPipelineUpdates } from '../utils/contributionPipeline';

interface HeaderProps {
  entities: EcosystemEntity[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showContinents: boolean;
  setShowContinents: (val: boolean | ((prev: boolean) => boolean)) => void;
  showRelationships: boolean;
  setShowRelationships: (val: boolean | ((prev: boolean) => boolean)) => void;
  editMode: boolean;
  setEditMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  hasUncommittedChanges?: boolean;
  onDismissChanges?: (alsoExitEditMode?: boolean) => void;
  onCommitChanges?: () => void;
  onOpenUpdateModal: () => void;
  onOpenReviewPipeline?: () => void;
  onOpenPositionSnapshotModal?: () => void;
  onExportData?: (format: ExportFormat) => void;
  onOpenDiscoveryModal?: () => void;
  onOpenDirectoryModal: () => void;
  onOpenAbout?: () => void;
  onResetView?: () => void;
  activeListScope?: SidebarListScope | null;
  onSelectEntityTypeList?: (entityType: EntityType | 'All') => void;
  onSelectEntity?: (entity: EcosystemEntity) => void;
}

export const Header: React.FC<HeaderProps> = ({
  entities,
  searchQuery,
  setSearchQuery,
  showContinents,
  setShowContinents,
  showRelationships,
  setShowRelationships,
  editMode,
  hasUncommittedChanges = false,
  onDismissChanges,
  onCommitChanges,
  onOpenUpdateModal,
  onExportData,
  onOpenDiscoveryModal,
  onOpenDirectoryModal,
  onOpenAbout,
  activeListScope,
  onSelectEntityTypeList,
  onSelectEntity,
  onOpenReviewPipeline,
  onOpenPositionSnapshotModal,
}) => {
  const [pendingContributionsCount, setPendingContributionsCount] = useState<number>(0);

  useEffect(() => {
    setPendingContributionsCount(getPendingContributionsCount());
    const unsub = subscribeToPipelineUpdates(() => {
      setPendingContributionsCount(getPendingContributionsCount());
    });
    return () => unsub();
  }, []);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (!isFs) {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Error toggling fullscreen mode:', err);
    }
  };

  // Search popup states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Relevance-scored search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: {
      entity: EcosystemEntity;
      score: number;
      matchedReason: string;
    }[] = [];

    entities.forEach(ent => {
      const nameLower = ent.name.toLowerCase();
      const descLower = (ent.description || '').toLowerCase();
      const tags = ent.fields || [];
      const contLower = (ent.continent || '').toLowerCase();
      const locLower = (ent.location || '').toLowerCase();
      const typeLower = ent.type.toLowerCase();

      let score = 0;
      let matchedReason = '';

      if (nameLower === q) {
        score = 100;
        matchedReason = 'Exact name match';
      } else if (nameLower.startsWith(q)) {
        score = 80;
        matchedReason = 'Name starts with match';
      } else if (nameLower.includes(q)) {
        score = 65;
        matchedReason = 'Name match';
      } else {
        const matchingExactTag = tags.find(t => t.toLowerCase().trim() === q);
        if (matchingExactTag) {
          score = 55;
          matchedReason = `Tag: ${matchingExactTag}`;
        } else {
          const matchingTag = tags.find(t => t.toLowerCase().includes(q));
          if (matchingTag) {
            score = 45;
            matchedReason = `Tag: ${matchingTag}`;
          } else if (contLower.includes(q)) {
            score = 40;
            matchedReason = `Archipelago: ${ent.continent}`;
          } else if (locLower.includes(q)) {
            score = 35;
            matchedReason = `Location: ${ent.location}`;
          } else if (typeLower.includes(q)) {
            score = 30;
            matchedReason = `Type: ${ent.type}`;
          } else if (descLower.includes(q)) {
            score = 20;
            matchedReason = 'Description match';
          }
        }
      }

      if (score > 0) {
        results.push({ entity: ent, score, matchedReason });
      }
    });

    return results.sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));
  }, [entities, searchQuery]);

  // Click outside to close menus & popups
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(target))
      ) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setShowMobileSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectResult = (entity: EcosystemEntity) => {
    setIsSearchOpen(false);
    setShowMobileSearch(false);
    onSelectEntity?.(entity);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || searchResults.length === 0) {
      if (e.key === 'ArrowDown' && searchResults.length > 0) {
        setIsSearchOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetItem = highlightedIndex >= 0 && highlightedIndex < searchResults.length
        ? searchResults[highlightedIndex]
        : searchResults[0];
      if (targetItem) {
        handleSelectResult(targetItem.entity);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const getQuadrantColor = (cat?: string) => {
    switch (cat) {
      case 'Inner': return '#5B21B6';
      case 'Social': return '#111827';
      case 'Cultural': return '#7D8764';
      case 'Systems': return '#0284C7';
      default: return '#111827';
    }
  };

  return (
    <header className="h-16 bg-[#FAF8F5] border-b border-[#E5E7EB] px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand & Title */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Complete Sunflower Icon with Head & Vertical Stem Body */}
        <svg 
          viewBox="0 0 36 44" 
          className="w-8 h-10 sm:w-9 sm:h-11 shrink-0 drop-shadow-xs select-none" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Sunflower icon"
        >
          {/* Vertical Flower Stem (Body) */}
          <path 
            d="M 18 15 L 18 41" 
            stroke="#2D5A27" 
            strokeWidth="2.4" 
            strokeLinecap="round" 
          />

          {/* Left Botanical Leaf */}
          <path 
            d="M 18 25 C 13 23.5, 7 27, 8 32 C 12 33, 17 28.5, 18 26 Z" 
            fill="#365314" 
            stroke="#166534" 
            strokeWidth="0.5" 
          />
          <path 
            d="M 18 25.5 C 14 26.5, 10 29.5, 8.5 31.5" 
            stroke="#4ADE80" 
            strokeWidth="0.6" 
            strokeLinecap="round" 
            fill="none" 
            opacity="0.6" 
          />

          {/* Right Botanical Leaf */}
          <path 
            d="M 18 29 C 23 27.5, 29 31, 28 36 C 24 37, 19 32.5, 18 30 Z" 
            fill="#365314" 
            stroke="#166534" 
            strokeWidth="0.5" 
          />
          <path 
            d="M 18 29.5 C 22 30.5, 26 33.5, 27.5 35.5" 
            stroke="#4ADE80" 
            strokeWidth="0.6" 
            strokeLinecap="round" 
            fill="none" 
            opacity="0.6" 
          />

          {/* Back layer amber petals */}
          {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg) => (
            <path
              key={`bg-${deg}`}
              d="M 18 13 L 15.8 3.8 C 15.8 0.5 20.2 0.5 20.2 3.8 Z"
              fill="#D97706"
              transform={`rotate(${deg} 18 13)`}
            />
          ))}

          {/* Main radiant golden petals */}
          {[11.25, 33.75, 56.25, 78.75, 101.25, 123.75, 146.25, 168.75, 191.25, 213.75, 236.25, 258.75, 281.25, 303.75, 326.25, 348.75].map((deg, i) => (
            <path
              key={`main-${deg}`}
              d="M 18 13 L 16 3.4 C 16 0.2 20 0.2 20 3.4 Z"
              fill={i % 2 === 0 ? "#F59E0B" : "#FBBF24"}
              transform={`rotate(${deg} 18 13)`}
            />
          ))}

          {/* Center dark disc with textured concentric rings */}
          <circle cx="18" cy="13" r="5.8" fill="#5B2D0C" />
          <circle cx="18" cy="13" r="4.4" fill="#3D1A04" />
          <circle cx="18" cy="13" r="3.0" fill="#713F12" />
          <circle cx="18" cy="13" r="1.8" fill="#92400E" />
          <circle cx="18" cy="13" r="3.7" stroke="#D97706" strokeWidth="0.5" strokeDasharray="1 1" fill="none" opacity="0.85" />
        </svg>

        <div className="flex flex-col justify-center">
          <h1 className="font-editorial text-[19px] lg:text-[20px] font-semibold text-[#111827] leading-tight tracking-wide">
            METTA TROPICAL ECOSYSTEM MAP
          </h1>
          <p className="font-technical text-[11px] text-[#716C64] uppercase tracking-wider leading-[1.3] mt-0.5">
            A Living Cartography of Inner, Social,<br />
            Cultural & Systems Transformation
          </p>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center space-x-3">
        {/* Quick Search with Dropdown Pop-up */}
        <div className="relative w-64 lg:w-80" ref={searchContainerRef}>
          <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-3 top-2.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search entity, tag, location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => {
              if (searchQuery.trim()) {
                setIsSearchOpen(true);
              }
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans pl-8 pr-7 py-1.5 rounded-[4px] outline-none text-[#111827] placeholder-[#8C877F] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-2 top-2 p-0.5 text-[#8C877F] hover:text-[#111827] rounded-full transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Search Results Pop-up Dropdown */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute left-0 top-full mt-1.5 w-80 lg:w-96 max-w-[90vw] bg-white border border-[#111827] rounded-[6px] shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
              {/* Pop-up Header */}
              <div className="px-3 py-2 bg-[#FAF8F5] border-b border-[#E5E7EB] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 font-medium text-[#111827]">
                  <Search className="w-3.5 h-3.5 text-[#7D8764]" />
                  <span>Results ({searchResults.length})</span>
                </div>
                <span className="text-[10px] text-[#8C877F] font-technical">
                  Click result to view & fly
                </span>
              </div>

              {/* Results List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-[#F3F4F6]">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-[#6B7280]">
                      No entities found matching <span className="font-semibold text-[#111827]">"{searchQuery}"</span>
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-1">
                      Try searching by organization name, person, tag, or archipelago.
                    </p>
                  </div>
                ) : (
                  searchResults.map((item, idx) => {
                    const ent = item.entity;
                    const isHighlighted = idx === highlightedIndex;
                    const quadColor = getQuadrantColor(ent.category);

                    return (
                      <div
                        key={ent.id}
                        onClick={() => handleSelectResult(ent)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`p-2.5 flex items-start space-x-2.5 cursor-pointer transition-colors ${
                          isHighlighted ? 'bg-[#FAF8F5] border-l-2 border-[#111827]' : 'hover:bg-[#FAF8F5]'
                        }`}
                      >
                        {/* Quadrant Dot */}
                        <div className="pt-0.5 shrink-0 flex items-center space-x-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                            style={{ backgroundColor: quadColor }}
                            title={`${ent.category} Quadrant`}
                          />
                        </div>

                        {/* Entity Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-semibold text-[#111827] truncate font-editorial text-[13px]">
                              {ent.name}
                            </span>
                            <span className={`text-[9px] font-technical px-1.5 py-0.5 rounded-[2px] font-medium shrink-0 ${
                              ent.type === 'Organization'
                                ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                : ent.type === 'Person'
                                ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                                : 'bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]'
                            }`}>
                              {ent.type}
                            </span>
                          </div>

                          {/* Subtitle / Match Reason */}
                          <div className="flex items-center space-x-2 text-[10.5px] text-[#6B7280] mt-0.5 truncate">
                            <span className="truncate">
                              {item.matchedReason}
                            </span>
                            {ent.location && (
                              <>
                                <span className="text-[#D1D5DB]">•</span>
                                <span className="truncate">{ent.location}</span>
                              </>
                            )}
                            {ent.continent && (
                              <>
                                <span className="text-[#D1D5DB]">•</span>
                                <span className="truncate">{ent.continent}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Icon */}
                        <div className="pt-1 text-[#9CA3AF] shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pop-up Footer */}
              <div className="px-3 py-1.5 bg-[#FAF8F5] border-t border-[#E5E7EB] flex items-center justify-between text-[10px] text-[#8C877F] font-technical">
                <span>↑↓ to navigate • Enter to select</span>
                <span>Map filtered live</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls & Actions */}
      <div className="flex items-center space-x-2">
        {/* Toggle Archipelagos & Relationships: Stacked vertically on small screens, side-by-side on sm+ screens */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-1.5">
          {/* Toggle Archipelagos */}
          <button
            onClick={() => setShowContinents(prev => !prev)}
            title={showContinents ? 'Hide Archipelago Landmasses & Territories' : 'Show Archipelago Landmasses & Territories'}
            className={`flex items-center justify-center space-x-1.5 text-[11px] sm:text-xs font-sans px-2 py-0.5 sm:py-1.5 border rounded-[4px] transition-all cursor-pointer whitespace-nowrap ${
              showContinents
                ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                : 'bg-white text-[#111827] border-[#E5E7EB] hover:bg-[#FAF8F5]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Archipelagos</span>
            {showContinents && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9C01B] ml-0.5 shrink-0" />
            )}
          </button>

          {/* Toggle Relationships / Connection Lines */}
          <button
            onClick={() => setShowRelationships(prev => !prev)}
            title={showRelationships ? 'Hide Inter-Entity Relationship Connections' : 'Show Inter-Entity Relationship Connections'}
            className={`flex items-center justify-center space-x-1.5 text-[11px] sm:text-xs font-sans px-2 py-0.5 sm:py-1.5 border rounded-[4px] transition-all cursor-pointer whitespace-nowrap ${
              showRelationships
                ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                : 'bg-white text-[#111827] border-[#E5E7EB] hover:bg-[#FAF8F5]'
            }`}
          >
            <Network className="w-3.5 h-3.5 shrink-0" />
            <span>Relationships</span>
            {showRelationships && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9C01B] ml-0.5 shrink-0" />
            )}
          </button>
        </div>

        {/* Community Review Pipeline Button (Only visible when in Edit Mode) */}
        {onOpenReviewPipeline && editMode && (
          <button
            type="button"
            id="header-review-pipeline-btn"
            onClick={onOpenReviewPipeline}
            title={pendingContributionsCount > 0 ? `${pendingContributionsCount} pending community contribution(s) awaiting review` : "Review Community Proposed Changes Pipeline"}
            className="relative flex items-center space-x-1.5 text-xs font-technical bg-[#FEFCE8] hover:bg-[#FEF08A] text-[#854D0E] border border-[#FDE047] px-2.5 py-1.5 rounded-[4px] shadow-2xs transition-all font-semibold cursor-pointer whitespace-nowrap"
          >
            <span>🌱</span>
            {pendingContributionsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#E11D48] text-white rounded-full text-[10px] font-bold shadow-xs animate-pulse">
                {pendingContributionsCount}
              </span>
            )}
          </button>
        )}

        {/* Update / Sync Spreadsheet Data & Pending Changes Buttons (Only visible when authenticated in Edit Mode) */}
        {editMode && (
          <div className="flex items-center space-x-1.5">
            {hasUncommittedChanges && onDismissChanges && (
              <button
                type="button"
                id="header-dismiss-changes-btn"
                onClick={() => onDismissChanges(false)}
                title="Dismiss pending uncommitted changes and revert to last saved cloud state"
                className="flex items-center space-x-1.5 text-xs font-sans bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] hover:border-[#DC2626] px-2 py-1.5 rounded-[4px] shadow-xs transition-all font-medium cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#DC2626]" />
                <span className="hidden sm:inline">Dismiss Changes</span>
                <span className="sm:hidden">Dismiss</span>
              </button>
            )}

            {hasUncommittedChanges && onCommitChanges && (
              <button
                type="button"
                id="header-commit-changes-btn"
                onClick={onCommitChanges}
                title="Commit pending changes to Firestore cloud database"
                className="flex items-center space-x-1.5 text-xs font-sans bg-[#2563EB] hover:bg-[#1D4ED8] text-white border border-[#1D4ED8] px-2 py-1.5 rounded-[4px] shadow-xs transition-all font-medium cursor-pointer whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Commit</span>
              </button>
            )}

            <button
              id="header-sync-data-btn"
              onClick={onOpenUpdateModal}
              title="Sync & Update Data (.xlsx / .csv)"
              aria-label="Sync & Update Data"
              className="p-1.5 text-[#111827] hover:bg-[#FAF8F5] border border-[#E5E7EB] hover:border-[#111827] rounded-[4px] transition-all cursor-pointer bg-white shadow-xs"
            >
              <RefreshCw className="w-4 h-4 text-[#111827]" />
            </button>
          </div>
        )}

        {/* Directory View Button (List & Card View) */}
        <button
          id="header-directory-btn"
          onClick={onOpenDirectoryModal}
          title="Open Directory View (Card & List View of all entities)"
          className="flex items-center space-x-1.5 text-xs font-sans bg-white hover:bg-[#FAF8F5] text-[#111827] border border-[#E5E7EB] hover:border-[#111827] px-2.5 py-1.5 rounded-[4px] shadow-xs transition-all font-medium cursor-pointer whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0 text-[#111827]" />
          <span>Directory</span>
        </button>

        {/* About Button */}
        <button
          id="header-about-btn"
          type="button"
          onClick={() => {
            onOpenAbout?.();
          }}
          title="About this ecosystem map"
          className="flex items-center space-x-1.5 text-xs font-sans bg-white hover:bg-[#FAF8F5] text-[#111827] border border-[#E5E7EB] hover:border-[#111827] px-2.5 py-1.5 rounded-[4px] shadow-xs transition-all font-medium cursor-pointer whitespace-nowrap"
        >
          <Info className="w-3.5 h-3.5 shrink-0 text-[#111827]" />
          <span>About</span>
        </button>

        {/* Fullscreen Button */}
        <button
          id="header-fullscreen-btn"
          type="button"
          onClick={handleToggleFullscreen}
          title={isFullscreen ? "Exit full-screen mode (Esc)" : "Enter full-screen mode (hides browser top bar)"}
          aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
          className="flex items-center space-x-0.5 text-xs font-sans bg-white hover:bg-[#FAF8F5] text-[#111827] border border-[#E5E7EB] hover:border-[#111827] px-1.5 py-1.5 rounded-[4px] shadow-xs transition-all font-medium cursor-pointer whitespace-nowrap"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 shrink-0 text-[#111827]" />
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 shrink-0 text-[#111827]" />
            </>
          )}
        </button>

        {/* Mobile Search Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowMobileSearch(prev => !prev);
            setIsSearchOpen(true);
          }}
          className="md:hidden flex items-center justify-center p-2 text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#FAF8F5] rounded-[4px] cursor-pointer"
          title="Search entities"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile Search Bar Dropdown */}
      {showMobileSearch && (
        <div ref={mobileSearchRef} className="md:hidden absolute top-16 left-0 w-full bg-[#FAF8F5] border-b border-[#111827] p-2.5 z-40 shadow-xl">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8C877F] absolute left-3 top-2.5 pointer-events-none" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              autoFocus
              placeholder="Search entity, tag, location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans pl-8 pr-7 py-1.5 rounded-[4px] outline-none text-[#111827]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-2 p-0.5 text-[#8C877F] hover:text-[#111827]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Pop-up Results */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="mt-2 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg max-h-60 overflow-y-auto divide-y divide-[#F3F4F6]">
              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#6B7280]">
                  No entities found matching "{searchQuery}"
                </div>
              ) : (
                searchResults.map(item => (
                  <div
                    key={item.entity.id}
                    onClick={() => handleSelectResult(item.entity)}
                    className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#FAF8F5]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-[#111827] truncate">
                        {item.entity.name}
                      </div>
                      <div className="text-[10px] text-[#6B7280] truncate">
                        {item.matchedReason} • {item.entity.category}
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[2px] shrink-0 font-technical">
                      {item.entity.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

