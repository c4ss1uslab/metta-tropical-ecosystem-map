import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Tag, Compass, AlertCircle, Activity, Globe, Plus, 
  ExternalLink, Sparkles, Building2, User, Lightbulb, Radio, Check, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EcosystemEntity, CategoryQuadrant, EntityType, ContinentInfo } from '../types';
import { saveContributionSubmission } from '../utils/contributionPipeline';
import { formatClusterWithNumber, suggestContinent, QUADRANT_CENTERS, CANONICAL_CLUSTER_MAP, getEntityOtherArchipelagos } from '../utils/layoutGenerator';
import { getEntityCompleteness } from '../types';
import { FieldCommentInfo } from './FieldCommentInfo';

// Natural numerical comparison: sorts archipelagos strictly 1 to 99+
export function extractArchipelagoNumber(archName: string): number {
  if (!archName) return 9999;
  const match = String(archName).match(/^\s*(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 9999;
}

export function compareArchipelagoNumbers(a: string, b: string): number {
  const numA = extractArchipelagoNumber(a);
  const numB = extractArchipelagoNumber(b);
  if (numA !== numB) return numA - numB;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Early placeholder archipelagos from early mockups/prototypes that must NOT be shown
export const DEPRECATED_PLACEHOLDER_ARCHIPELAGOS = new Set([
  'sanctuary of somatics & healing',
  '1. sanctuary of somatics & healing',
  'somatics & healing',
  'isles of contemplative wisdom',
  '2. isles of contemplative wisdom',
  'contemplative wisdom',
  'territory of inner capacities',
  '3. territory of inner capacities',
  'inner capacities',
  'deep ecology heartland',
  '4. deep ecology heartland',
  'archipelago of inner transformation',
  '5. archipelago of inner transformation',
  'inner transformation',
  'commonwealth of the commons',
  '6. commonwealth of the commons',
  'commons',
  'federation of civic action',
  '7. federation of civic action',
  'civic action',
  'territories of mutual solidarity',
  '8. territories of mutual solidarity',
  'mutual solidarity',
  'transition & local resilience biome',
  '9. transition & local resilience biome',
  'transition & local resilience',
  'archipelago of social weaving',
  '10. archipelago of social weaving',
  'social weaving',
  'ancestral & indigenous lorelands',
  '11. ancestral & indigenous lorelands',
  'ancestral & indigenous wisdom',
  'indigenous lorelands',
  'archipelago of transcontextual mind',
  '12. archipelago of transcontextual mind',
  'transcontextual mind',
  'warm data',
  'archipelago of living mythos & narrative',
  '13. archipelago of living mythos & narrative',
  'living mythos & narrative',
  'decolonial imaginal archipelago',
  '14. decolonial imaginal archipelago',
  'decolonial imaginal',
  'archipelago of cultural regeneration',
  '15. archipelago of cultural regeneration',
  'cultural regeneration',
  'expanse of doughnut & post-growth economics',
  '16. expanse of doughnut & post-growth economics',
  'doughnut & post-growth economics',
  'post-growth economics',
  'planetary boundaries biosphere',
  '17. planetary boundaries biosphere',
  'planetary boundaries',
  'nexus of complexity & systems dynamics',
  '18. nexus of complexity & systems dynamics',
  'complexity & systems dynamics',
  'biomimicry & circular horizons',
  '19. biomimicry & circular horizons',
  'biomimicry',
  'archipelago of systems transition',
  '20. archipelago of systems transition',
  'systems transition',
  'the metta nexus lands',
  '21. the metta nexus lands',
  'metta nexus',
  'place-based learning',
  '23. place-based learning',
  'somatic & embodied wisdom',
  '24. somatic & embodied wisdom',
  'post-capitalist transitions',
  '25. post-capitalist transitions',
  'decentralized governance',
  '26. decentralized governance',
  'regenerative agriculture & food systems',
  '27. regenerative agriculture & food systems',
  'intergenerational healing',
  '28. intergenerational healing',
  'sacred activism',
  '29. sacred activism',
  'community resilience',
  '30. community resilience'
]);

export function isPlaceholderArchipelago(name?: string): boolean {
  if (!name) return false;
  const clean = name.trim().toLowerCase();
  const withoutNum = clean.replace(/^\d+[\.\)]\s*/, '').trim();
  return DEPRECATED_PLACEHOLDER_ARCHIPELAGOS.has(clean) || DEPRECATED_PLACEHOLDER_ARCHIPELAGOS.has(withoutNum);
}

interface SearchableTagInputProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  items: string[];
  availableSuggestions: string[];
  onAddItem: (item: string) => void;
  onRemoveItem: (item: string) => void;
  badgeStyle: {
    bg: string;
    border: string;
    text: string;
    hoverBorder: string;
    hoverBg: string;
  };
  placeholder?: string;
  commentFieldName?: string;
}

const SearchableTagInput: React.FC<SearchableTagInputProps> = ({
  label,
  count,
  icon,
  items,
  availableSuggestions,
  onAddItem,
  onRemoveItem,
  badgeStyle,
  placeholder = 'Add new...',
  commentFieldName
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Full list of unselected suggestions, filtered by query if typed
  const filteredSuggestions = useMemo(() => {
    const unselected = availableSuggestions.filter(
      s => !items.some(it => it.toLowerCase() === s.toLowerCase())
    );
    if (!inputValue.trim()) {
      return unselected;
    }
    const qLower = inputValue.trim().toLowerCase();
    return unselected.filter(s => s.toLowerCase().includes(qLower));
  }, [inputValue, availableSuggestions, items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCommitAdd = (val?: string) => {
    const toAdd = (val ?? inputValue).trim();
    if (!toAdd) return;
    onAddItem(toAdd);
    setInputValue('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider flex items-center space-x-1.5">
          {icon}
          <span>{label} ({count})</span>
          <FieldCommentInfo fieldName={commentFieldName || label} />
        </h3>
        {availableSuggestions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSuggestions(prev => !prev)}
            className="text-[10px] font-technical text-[#5B21B6] hover:underline cursor-pointer flex items-center space-x-0.5"
          >
            <span>{showSuggestions ? 'Hide list ▲' : `Browse all (${availableSuggestions.length}) ▼`}</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {items.length === 0 ? (
          <span className="text-xs font-sans text-[#8C877F] italic">No {label.toLowerCase()} added yet.</span>
        ) : (
          items.map(item => (
            <span
              key={item}
              className={`px-3 py-1 ${badgeStyle.bg} border ${badgeStyle.border} ${badgeStyle.text} font-sans text-xs rounded-[4px] shadow-2xs flex items-center space-x-1.5 transition-all`}
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onRemoveItem(item)}
                title={`Remove ${item}`}
                className="p-0.5 text-[#8C877F] hover:text-[#DC2626] hover:bg-black/5 rounded-[2px] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      <div ref={containerRef} className="relative mt-2">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              // Immediately show full list of existing entries on select
              setShowSuggestions(true);
            }}
            onClick={() => {
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCommitAdd();
              }
              if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            className="flex-1 bg-white border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-3 py-1.5 rounded-[4px] outline-none shadow-2xs placeholder-[#9CA3AF]"
          />
          <button
            type="button"
            onClick={() => handleCommitAdd()}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#111827] text-white text-xs font-sans rounded-[4px] hover:bg-[#20293a] cursor-pointer shrink-0 shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>

        {/* Scrollable list of ALL existing entries when field is selected */}
        {showSuggestions && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-[#F3F4F6] text-xs">
            <div className="sticky top-0 bg-[#FAF8F5] px-3 py-1.5 border-b border-[#E5E7EB] flex items-center justify-between text-[10px] font-technical text-[#8C877F] uppercase tracking-wider z-10">
              <span>
                {inputValue.trim()
                  ? `Matching ${label} (${filteredSuggestions.length})`
                  : `All Existing ${label} (${filteredSuggestions.length})`}
              </span>
              <span className="normal-case italic">scroll to browse all</span>
            </div>

            {inputValue.trim() && !availableSuggestions.some(s => s.toLowerCase() === inputValue.trim().toLowerCase()) && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCommitAdd(inputValue);
                }}
                className="w-full text-left px-3 py-2 bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#5B21B6] flex items-center justify-between font-medium cursor-pointer"
              >
                <span>+ Create new &quot;{inputValue.trim()}&quot;</span>
                <span className="text-[10px] uppercase font-technical font-bold">Add</span>
              </button>
            )}

            {filteredSuggestions.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-[#8C877F] italic text-center">
                {inputValue.trim() ? 'No existing entries match filter. Click Add to create new.' : 'All existing entries are already added.'}
              </div>
            ) : (
              filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCommitAdd(suggestion);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-sans hover:bg-[#FAF8F5] text-[#111827] flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <span className="font-medium group-hover:text-[#5B21B6]">{suggestion}</span>
                  <span className="text-[10px] font-technical text-[#8C877F] uppercase group-hover:text-[#5B21B6]">Add +</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface PrimaryArchipelagoSelectProps {
  value: string;
  onChange: (val: string) => void;
  archipelagos: string[]; // Strictly ordered 1-99+
}

const PrimaryArchipelagoSelect: React.FC<PrimaryArchipelagoSelectProps> = ({
  value,
  onChange,
  archipelagos
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return archipelagos;
    const q = query.trim().toLowerCase();
    return archipelagos.filter(a => a.toLowerCase().includes(q));
  }, [archipelagos, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={isOpen ? query : (value || '')}
          placeholder={isOpen ? "Type to filter or enter custom archipelago..." : "Click to select Primary Archipelago (1-99+)..."}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onClick={() => {
            setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault();
              onChange(query.trim());
              setIsOpen(false);
              setQuery('');
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] p-2 pr-16 rounded-[4px] text-xs outline-none shadow-2xs placeholder-[#9CA3AF] cursor-pointer"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setQuery('');
              }}
              className="p-1 text-[#9CA3AF] hover:text-[#DC2626] rounded-[2px] cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="p-1 text-[#6B7280] hover:text-[#111827] rounded-[2px] cursor-pointer"
            title="Toggle archipelagos list"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-[#F3F4F6] text-xs">
          <div className="sticky top-0 bg-[#FAF8F5] px-3 py-1.5 border-b border-[#E5E7EB] flex items-center justify-between text-[10px] font-technical text-[#8C877F] uppercase tracking-wider z-10">
            <span>Archipelagos ordered 1-99+ ({filtered.length})</span>
            <span className="normal-case italic">scroll to browse all</span>
          </div>

          {query.trim() && !archipelagos.some(a => a.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(query.trim());
                setIsOpen(false);
                setQuery('');
              }}
              className="w-full text-left px-3 py-2 bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#5B21B6] flex items-center justify-between font-medium cursor-pointer"
            >
              <span>+ Use custom: &quot;{query.trim()}&quot;</span>
              <span className="text-[10px] uppercase font-technical font-bold">Select</span>
            </button>
          )}

          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-[#8C877F] italic text-center">
              No archipelagos match &quot;{query}&quot;. Press Enter to use as custom.
            </div>
          ) : (
            filtered.map((arch) => {
              const isSelected = value.trim().toLowerCase() === arch.trim().toLowerCase();
              const numMatch = arch.match(/^\s*(\d+)/);
              const archNum = numMatch ? numMatch[1] : null;

              return (
                <button
                  key={arch}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(arch);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-sans flex items-center justify-between group cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#EDE9FE] text-[#5B21B6] font-semibold' : 'hover:bg-[#FAF8F5] text-[#111827]'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    {archNum && (
                      <span className="font-technical text-[10px] px-1.5 py-0.5 rounded bg-black/5 text-[#4B5563] font-bold group-hover:bg-[#5B21B6]/10 group-hover:text-[#5B21B6] shrink-0">
                        #{archNum}
                      </span>
                    )}
                    <span className="truncate">{arch}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#5B21B6] shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

interface OtherArchipelagosSelectProps {
  value: string; // Comma-separated string
  primaryArchipelago: string;
  onChange: (val: string) => void;
  archipelagos: string[]; // Strictly ordered 1-99+
}

const OtherArchipelagosSelect: React.FC<OtherArchipelagosSelectProps> = ({
  value,
  primaryArchipelago,
  onChange,
  archipelagos
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse comma-separated list into items
  const selectedItems = useMemo(() => {
    if (!value) return [];
    return value
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }, [value]);

  const toggleItem = (arch: string) => {
    const norm = arch.trim().toLowerCase();
    const exists = selectedItems.some(it => it.toLowerCase() === norm);
    let updated: string[];
    if (exists) {
      updated = selectedItems.filter(it => it.toLowerCase() !== norm);
    } else {
      updated = [...selectedItems, arch.trim()];
    }
    onChange(updated.join(', '));
  };

  const removeItem = (arch: string) => {
    const norm = arch.trim().toLowerCase();
    const updated = selectedItems.filter(it => it.toLowerCase() !== norm);
    onChange(updated.join(', '));
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return archipelagos;
    const q = query.trim().toLowerCase();
    return archipelagos.filter(a => a.toLowerCase().includes(q));
  }, [archipelagos, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      {/* Selected chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {selectedItems.map((item) => (
            <span
              key={item}
              className="px-2 py-0.5 bg-[#FAF5FF] border border-[#DDD6FE] text-[#6B21A8] font-sans text-xs rounded-[4px] shadow-2xs flex items-center space-x-1"
            >
              <span className="truncate max-w-[200px]">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="p-0.5 text-[#8C877F] hover:text-[#DC2626] rounded cursor-pointer"
                title={`Remove ${item}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder="Click to browse & select Other Archipelagos (1-99+)..."
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault();
              toggleItem(query.trim());
              setQuery('');
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] p-2 pr-8 rounded-[4px] text-xs outline-none shadow-2xs placeholder-[#9CA3AF] cursor-pointer"
        />
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#6B7280] hover:text-[#111827] cursor-pointer"
          title="Toggle archipelagos list"
        >
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-[#F3F4F6] text-xs">
          <div className="sticky top-0 bg-[#FAF8F5] px-3 py-1.5 border-b border-[#E5E7EB] flex items-center justify-between text-[10px] font-technical text-[#8C877F] uppercase tracking-wider z-10">
            <span>Archipelagos ordered 1-99+ ({filtered.length})</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#5B21B6] hover:underline normal-case font-bold cursor-pointer"
            >
              Done ✓
            </button>
          </div>

          {query.trim() && !archipelagos.some(a => a.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleItem(query.trim());
                setQuery('');
              }}
              className="w-full text-left px-3 py-2 bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#5B21B6] flex items-center justify-between font-medium cursor-pointer"
            >
              <span>+ Add custom: &quot;{query.trim()}&quot;</span>
              <span className="text-[10px] uppercase font-technical font-bold">Add</span>
            </button>
          )}

          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-[#8C877F] italic text-center">
              No matching archipelagos. Press Enter to add &quot;{query}&quot; as custom.
            </div>
          ) : (
            filtered.map((arch) => {
              const isSelected = selectedItems.some(it => it.toLowerCase() === arch.trim().toLowerCase());
              const isPrimary = primaryArchipelago && primaryArchipelago.trim().toLowerCase() === arch.trim().toLowerCase();
              const numMatch = arch.match(/^\s*(\d+)/);
              const archNum = numMatch ? numMatch[1] : null;

              return (
                <button
                  key={arch}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggleItem(arch);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-sans flex items-center justify-between group cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#EDE9FE] text-[#5B21B6] font-semibold' : 'hover:bg-[#FAF8F5] text-[#111827]'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#5B21B6] border-[#5B21B6] text-white' : 'border-[#D1D5DB] group-hover:border-[#5B21B6]'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </span>
                    {archNum && (
                      <span className="font-technical text-[10px] px-1.5 py-0.5 rounded bg-black/5 text-[#4B5563] font-bold shrink-0">
                        #{archNum}
                      </span>
                    )}
                    <span className="truncate">{arch}</span>
                    {isPrimary && (
                      <span className="text-[9px] font-technical text-[#8C877F] bg-[#F3F4F6] px-1 py-0.2 rounded shrink-0">
                        (Primary)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-technical text-[#8C877F] group-hover:text-[#5B21B6] shrink-0 ml-1">
                    {isSelected ? 'Remove' : 'Select +'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

interface SubmitEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  allEntities?: EcosystemEntity[];
  continents?: ContinentInfo[];
}

export const SubmitEntityModal: React.FC<SubmitEntityModalProps> = ({
  isOpen,
  onClose,
  allEntities = [],
  continents = []
}) => {
  // Core Required Fields
  const [name, setName] = useState('');
  const [type, setType] = useState<EntityType>('Organization');

  // Placement & Classification
  const [category, setCategory] = useState<CategoryQuadrant>('Systems');
  const [continent, setContinent] = useState('');
  const [otherArchipelagos, setOtherArchipelagos] = useState('');
  const [isTransitionZone, setIsTransitionZone] = useState(false);
  const [secondaryCategories, setSecondaryCategories] = useState<CategoryQuadrant[]>([]);

  // Narrative & Tags
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const [approach, setApproach] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [featuredResources, setFeaturedResources] = useState('');

  // Details & Metadata
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState('');
  const [stage, setStage] = useState('');
  const [customStage, setCustomStage] = useState('');
  const [yearFounded, setYearFounded] = useState('');
  const [reach, setReach] = useState('');
  const [impactReach, setImpactReach] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Socials
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');
  const [otherSocialMedia, setOtherSocialMedia] = useState('');

  // Organization & Context
  const [organizationStructure, setOrganizationStructure] = useState('');
  const [societalSector, setSocietalSector] = useState('');
  const [whoTheyServe, setWhoTheyServe] = useState('');
  const [communityServed, setCommunityServed] = useState('');
  const [biome, setBiome] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [operatingRegion, setOperatingRegion] = useState('');
  const [operationFocus, setOperationFocus] = useState('');
  const [size, setSize] = useState('');
  const [influence, setInfluence] = useState('');

  // Relationships
  const [founders, setFounders] = useState('');
  const [partners, setPartners] = useState('');
  const [funders, setFunders] = useState('');
  const [teachers, setTeachers] = useState('');
  const [collaborators, setCollaborators] = useState('');
  const [ethnicSpiritualLineages, setEthnicSpiritualLineages] = useState('');
  const [intellectualLineage, setIntellectualLineage] = useState('');

  // Worldview & Change Orientation
  const [practices, setPractices] = useState('');
  const [offerings, setOfferings] = useState('');
  const [situationalAssessment, setSituationalAssessment] = useState('');
  const [situationalAssessmentComments, setSituationalAssessmentComments] = useState('');
  const [responseOrientation, setResponseOrientation] = useState('');
  const [altProposedGTA, setAltProposedGTA] = useState('');
  const [altProposedPluriverse, setAltProposedPluriverse] = useState('');
  const [altProposedMutua, setAltProposedMutua] = useState('');
  const [altProposed, setAltProposed] = useState('');
  const [valueMeme, setValueMeme] = useState('');
  const [theoryOfChangeGTDF, setTheoryOfChangeGTDF] = useState('');
  const [theoryOfChangeIAM, setTheoryOfChangeIAM] = useState('');
  const [crisisOfResponse, setCrisisOfResponse] = useState('');
  const [relevantResources, setRelevantResources] = useState('');
  const [idgsInnerCapacities, setIdgsInnerCapacities] = useState('');
  const [innerWorkModalities, setInnerWorkModalities] = useState('');

  // Discourse Analysis
  const [concepts, setConcepts] = useState('');
  const [frameworks, setFrameworks] = useState('');
  const [definitions, setDefinitions] = useState('');
  const [argumentsClaims, setArgumentsClaims] = useState('');
  const [evidenceSources, setEvidenceSources] = useState('');
  const [hypotheses, setHypotheses] = useState('');
  const [analystCommentary, setAnalystCommentary] = useState('');

  // Warm Data
  const [pointOfContact, setPointOfContact] = useState('');
  const [warmDataEmail, setWarmDataEmail] = useState('');
  const [matchingDatabase, setMatchingDatabase] = useState('');
  const [ourRelationship, setOurRelationship] = useState('');

  // Submitter Relationship Question & Email Modal
  const [submitterRelationship, setSubmitterRelationship] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Accordion toggles for optional sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'logistics': true,
    'relationships': true,
    'worldview': true,
    'discourse': true,
    'warmData': true,
    'governance': true
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Autocomplete candidate lists from all existing entities
  const allExistingTags = useMemo(() => {
    const set = new Set<string>();
    allEntities.forEach(e => (e.fields || []).forEach(f => {
      const val = f?.trim();
      if (val) set.add(val);
    }));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allEntities]);

  const allExistingApproaches = useMemo(() => {
    const set = new Set<string>();
    allEntities.forEach(e => (e.approach || []).forEach(a => {
      const val = a?.trim();
      if (val) set.add(val);
    }));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allEntities]);

  const allExistingIssues = useMemo(() => {
    const set = new Set<string>();
    allEntities.forEach(e => (e.issues || []).forEach(i => {
      const val = i?.trim();
      if (val) set.add(val);
    }));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allEntities]);

  const allExistingActivities = useMemo(() => {
    const set = new Set<string>();
    allEntities.forEach(e => (e.activities || []).forEach(a => {
      const val = a?.trim();
      if (val) set.add(val);
    }));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allEntities]);



  // All Archipelagos strictly ordered 1-99+
  // Filter out all early placeholder archipelagos and only keep archipelagos that exist on the map / are assigned to entities
  const allExistingArchipelagos = useMemo(() => {
    const set = new Set<string>();

    // 1. Continents currently active on the map (from props)
    continents.forEach(c => {
      if (c?.name && !isPlaceholderArchipelago(c.name)) {
        set.add(formatClusterWithNumber(c.name));
      }
    });

    // 2. Primary & other archipelagos from all existing entities
    allEntities.forEach(e => {
      if (e.continent && !isPlaceholderArchipelago(e.continent)) {
        set.add(formatClusterWithNumber(e.continent));
      }
      const others = getEntityOtherArchipelagos(e);
      others.forEach(o => {
        if (o && !isPlaceholderArchipelago(o)) {
          set.add(formatClusterWithNumber(o));
        }
      });
    });

    // 3. Fallback: if both continents and entities are empty, supply canonical archipelagos excluding placeholders
    if (set.size === 0) {
      Object.values(CANONICAL_CLUSTER_MAP).forEach(v => {
        if (v && !isPlaceholderArchipelago(v)) {
          set.add(formatClusterWithNumber(v));
        }
      });
    }

    return Array.from(set).filter(Boolean).sort(compareArchipelagoNumbers);
  }, [continents, allEntities]);

  // Reset form when opened or closed
  const resetForm = () => {
    setName('');
    setType('Organization');
    setCategory('Systems');
    setContinent('');
    setOtherArchipelagos('');
    setIsTransitionZone(false);
    setSecondaryCategories([]);
    setDescription('');
    setFields([]);
    setApproach([]);
    setIssues([]);
    setActivities([]);
    setFeaturedResources('');
    setLocation('');
    setLanguage('');
    setStage('');
    setCustomStage('');
    setYearFounded('');
    setReach('');
    setImpactReach('');
    setContactEmail('');
    setWebsite('');
    setInstagram('');
    setTwitter('');
    setYoutube('');
    setOtherSocialMedia('');
    setOrganizationStructure('');
    setSocietalSector('');
    setWhoTheyServe('');
    setCommunityServed('');
    setBiome('');
    setNeighborhood('');
    setCity('');
    setState('');
    setCountry('');
    setOperatingRegion('');
    setOperationFocus('');
    setSize('');
    setInfluence('');
    setFounders('');
    setPartners('');
    setFunders('');
    setTeachers('');
    setCollaborators('');
    setEthnicSpiritualLineages('');
    setIntellectualLineage('');
    setPractices('');
    setOfferings('');
    setSituationalAssessment('');
    setSituationalAssessmentComments('');
    setResponseOrientation('');
    setAltProposedGTA('');
    setAltProposedPluriverse('');
    setAltProposedMutua('');
    setAltProposed('');
    setValueMeme('');
    setTheoryOfChangeGTDF('');
    setTheoryOfChangeIAM('');
    setCrisisOfResponse('');
    setRelevantResources('');
    setIdgsInnerCapacities('');
    setInnerWorkModalities('');
    setConcepts('');
    setFrameworks('');
    setDefinitions('');
    setArgumentsClaims('');
    setEvidenceSources('');
    setHypotheses('');
    setAnalystCommentary('');
    setPointOfContact('');
    setWarmDataEmail('');
    setMatchingDatabase('');
    setOurRelationship('');
    setSubmitterRelationship('');
    setSubmitterEmail('');
    setFormError(null);
    setEmailError(null);
    setIsEmailModalOpen(false);
    setIsSuccessModalOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEmailModalOpen) {
          setIsEmailModalOpen(false);
        } else if (isSuccessModalOpen) {
          setIsSuccessModalOpen(false);
          onClose();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEmailModalOpen, isSuccessModalOpen, onClose]);

  // Dynamic question & choices based on selected entity type
  const relConfig = useMemo(() => {
    switch (type) {
      case 'Person':
        return {
          question: "What's your relationship with this person?",
          options: [
            'I am this person',
            'I am connected to this person',
            'A person I know of'
          ]
        };
      case 'Idea':
        return {
          question: "What's your relationship with this concept / idea?",
          options: [
            'I am the originator of this concept',
            'I am connected to this concept',
            'A concept I know of'
          ]
        };
      case 'Media':
        return {
          question: "What's your relationship with this media?",
          options: [
            'I am the creator of this media',
            'I am connected to this media',
            'A media I know of'
          ]
        };
      case 'Organization':
      default:
        return {
          question: "What's your relationship with this organization?",
          options: [
            'I am part of this organization',
            'I am connected to this organization',
            'An organization I know of'
          ]
        };
    }
  }, [type]);

  const handleOpenEmailModal = () => {
    const trimmedTitle = name.trim();
    if (!trimmedTitle) {
      setFormError('Please enter a title / name for this entity.');
      const elem = document.getElementById('new-entity-title-input');
      if (elem) {
        elem.focus();
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setFormError(null);
    setIsEmailModalOpen(true);
  };

  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = submitterEmail.trim();
    if (!emailTrimmed) {
      setEmailError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setEmailError('Please enter a valid email address (e.g. name@domain.org).');
      return;
    }

    setIsSubmitting(true);
    try {
      const newEntityId = `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const effectiveStage = stage === 'Other' ? customStage.trim() : stage;
      const resolvedType: EntityType = (type as any) === 'Org' ? 'Organization' : type;

      // Coordinate placement: place in quadrant territory with a gentle offset
      const targetCenter = QUADRANT_CENTERS[category] || { x: 0, y: 0 };
      const jitterX = Math.round((Math.random() - 0.5) * 160);
      const jitterY = Math.round((Math.random() - 0.5) * 160);
      const posX = targetCenter.x + jitterX;
      const posY = targetCenter.y + jitterY;

      const parsedOtherArchs = otherArchipelagos
        ? otherArchipelagos.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean)
        : [];

      // Combine keywords/topics with other archipelagos
      const combinedFields = Array.from(new Set([...fields, ...parsedOtherArchs])).filter(Boolean);

      // Social profiles map
      const socialMediaMap: Record<string, string> = {};
      if (instagram.trim()) socialMediaMap.instagram = instagram.trim();
      if (twitter.trim()) socialMediaMap.twitter = twitter.trim();
      if (youtube.trim()) socialMediaMap.youtube = youtube.trim();
      if (otherSocialMedia.trim()) socialMediaMap.other = otherSocialMedia.trim();

      // Categorized fields mapping
      const categorizedFields: Record<string, Record<string, any>> = {
        'Overview': {
          'Name/Label': name.trim(),
          'Entity Type': resolvedType,
          'Quadrant': category,
          'Category': category,
          'Archipelago': continent.trim(),
          'Other Archipelagos': otherArchipelagos.trim(),
          'Keywords/Topics': fields.join(', '),
          'Who They Serve': whoTheyServe.trim(),
          'Community Served (Conscious Change Collective)': communityServed.trim(),
          'Organization Structure': organizationStructure.trim(),
          'Societal Sector': societalSector.trim(),
          'Our Relationship': ourRelationship.trim()
        },
        'Logistic Info': {
          'Description': description.trim(),
          'Website URL': website.trim(),
          'City': city.trim(),
          'State': state.trim(),
          'Country': country.trim(),
          'Neighborhood or Demarcated Zone': neighborhood.trim(),
          'Biome': biome.trim(),
          'Operating Region': operatingRegion.trim(),
          'Operation Focus': operationFocus.trim(),
          'Language(s)': language.trim(),
          'Maturity Level': effectiveStage,
          'Year Founded': yearFounded.trim(),
          'Size': size.trim(),
          'Social Media Reach': reach.trim(),
          'Impact Reach': impactReach.trim(),
          'Influence': influence.trim()
        },
        'Relationships': {
          'Founder(s)/Main Source(s)': founders.trim(),
          'Partners (Institutions)': partners.trim(),
          'Funders/Supporters (Institutions)': funders.trim(),
          'Teachers/Influences (People)': teachers.trim(),
          'Partners/Collaborators (People)': collaborators.trim(),
          'Ethnic/Spiritual Lineage(s)': ethnicSpiritualLineages.trim(),
          'Intellectual Lineage (IAM)': intellectualLineage.trim()
        },
        'Worldview & Change Orientation': {
          'Practices': practices.trim(),
          'Offerings': offerings.trim(),
          'Situational Assessment': situationalAssessment.trim(),
          'Situational Assessment Comments/Description': situationalAssessmentComments.trim(),
          'Response Orientation': responseOrientation.trim(),
          'Alternative(s) Proposed (GTA)': altProposedGTA.trim(),
          'Alternative(s) Proposed (Pluriverse dictionary)': altProposedPluriverse.trim(),
          'Alternative(s) Proposed (Mútua)': altProposedMutua.trim(),
          'Alternative(s) Proposed': altProposed.trim(),
          'Value Meme / Ethical Orientation': valueMeme.trim(),
          'Theory of Change (GTDF)': theoryOfChangeGTDF.trim(),
          'Theory of Change (IAM)': theoryOfChangeIAM.trim(),
          'Crisis of Response': crisisOfResponse.trim(),
          'Featured Resources': featuredResources.trim(),
          'Relevant Resources': relevantResources.trim(),
          'IDGs/Inner Capacities': idgsInnerCapacities.trim(),
          'Inner Work Modalities (Conscious Change Collective)': innerWorkModalities.trim()
        },
        'Discourse Analysis / Argument Mapping': {
          'Concepts': concepts.trim(),
          'Frameworks': frameworks.trim(),
          'Definitions': definitions.trim(),
          'Arguments/Claims': argumentsClaims.trim(),
          'Evidence/Sources': evidenceSources.trim(),
          'Hypotheses': hypotheses.trim(),
          'Analyst Commentary': analystCommentary.trim()
        },
        'Warm Data': {
          'Point of Contact(s)': pointOfContact.trim(),
          'Email': warmDataEmail.trim(),
          'Matching Database': matchingDatabase.trim()
        }
      };

      // Extra fields flat dictionary
      const extraFields: Record<string, any> = {
        'Organization Structure': organizationStructure.trim(),
        'Societal Sector': societalSector.trim(),
        'Who They Serve': whoTheyServe.trim(),
        'Community Served': communityServed.trim(),
        'Biome': biome.trim(),
        'Neighborhood': neighborhood.trim(),
        'City': city.trim(),
        'State': state.trim(),
        'Country': country.trim(),
        'Operating Region': operatingRegion.trim(),
        'Operation Focus': operationFocus.trim(),
        'Year Founded': yearFounded.trim(),
        'Reach': reach.trim(),
        'Impact Reach': impactReach.trim(),
        'Size': size.trim(),
        'Influence': influence.trim(),
        'Instagram': instagram.trim(),
        'Twitter/X': twitter.trim(),
        'YouTube': youtube.trim(),
        'Other Social Media': otherSocialMedia.trim(),
        'Featured Resources': featuredResources.trim(),
        'Practices': practices.trim(),
        'Offerings': offerings.trim(),
        'Situational Assessment': situationalAssessment.trim(),
        'Situational Assessment Comments': situationalAssessmentComments.trim(),
        'Response Orientation': responseOrientation.trim(),
        'Alternative(s) Proposed (GTA)': altProposedGTA.trim(),
        'Alternative(s) Proposed (Pluriverse)': altProposedPluriverse.trim(),
        'Alternative(s) Proposed (Mútua)': altProposedMutua.trim(),
        'Alternative(s) Proposed': altProposed.trim(),
        'Value Meme / Ethical Orientation': valueMeme.trim(),
        'Theory of Change (GTDF)': theoryOfChangeGTDF.trim(),
        'Theory of Change (IAM)': theoryOfChangeIAM.trim(),
        'Crisis of Response': crisisOfResponse.trim(),
        'Relevant Resources': relevantResources.trim(),
        'IDGs/Inner Capacities': idgsInnerCapacities.trim(),
        'Inner Work Modalities': innerWorkModalities.trim(),
        'Concepts': concepts.trim(),
        'Frameworks': frameworks.trim(),
        'Definitions': definitions.trim(),
        'Arguments/Claims': argumentsClaims.trim(),
        'Evidence/Sources': evidenceSources.trim(),
        'Hypotheses': hypotheses.trim(),
        'Analyst Commentary': analystCommentary.trim(),
        'Point of Contact': pointOfContact.trim(),
        'Warm Data Email': warmDataEmail.trim(),
        'Matching Database': matchingDatabase.trim()
      };

      const proposedEntity: EcosystemEntity = {
        id: newEntityId,
        name: name.trim(),
        type: resolvedType,
        category,
        quadrant: category,
        spreadsheetCategory: category,
        continent: continent.trim() || undefined,
        otherArchipelagos: parsedOtherArchs.length > 0 ? parsedOtherArchs : undefined,
        isTransitionZone,
        isDomainElevation: isTransitionZone,
        secondaryCategories: secondaryCategories.length > 0 ? secondaryCategories : undefined,
        description: description.trim(),
        fields: combinedFields,
        approach: approach.length > 0 ? approach : undefined,
        issues: issues.length > 0 ? issues : undefined,
        activities: activities.length > 0 ? activities : undefined,
        location: location.trim() || undefined,
        language: language.trim() || undefined,
        stage: effectiveStage || undefined,
        contactEmail: contactEmail.trim() || undefined,
        website: website.trim() || undefined,
        socialMedia: Object.keys(socialMediaMap).length > 0 ? socialMediaMap : undefined,
        ourRelationship: ourRelationship.trim() || undefined,
        notes: analystCommentary.trim() || undefined,
        x: posX,
        y: posY,
        isCustomPosition: true,
        categorizedFields,
        extraFields
      };

      // Set dataCompleteness based on filled fields
      proposedEntity.dataCompleteness = getEntityCompleteness(proposedEntity);
      proposedEntity.dataQuality = proposedEntity.dataCompleteness;

      // Dummy empty original entity so diff highlights all new fields
      const originalEmpty: EcosystemEntity = {
        id: newEntityId,
        name: '',
        type,
        category,
        fields: [],
        description: '',
        x: posX,
        y: posY
      };

      await saveContributionSubmission(
        originalEmpty,
        proposedEntity,
        emailTrimmed,
        submitterRelationship,
        'Submitted via top bar "Contribute" form',
        true // isNewEntity flag
      );

      setIsEmailModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error('Failed to submit new entity contribution:', err);
      setIsEmailModalOpen(false);
      setIsSuccessModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishAndClose = () => {
    setIsSuccessModalOpen(false);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#111827]/60 backdrop-blur-xs select-text animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="w-full max-w-4xl max-h-[92vh] bg-white rounded-lg shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden relative select-text"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Banner (Compact Sticky Header Bar) */}
          <div className="bg-[#FEFCE8] border-b border-[#FEF08A] px-4 md:px-5 py-2.5 flex items-center justify-between text-[#854D0E] font-technical text-xs font-semibold shrink-0 z-10">
            <div className="flex items-center space-x-2 truncate pr-2">
              <span className="text-sm shrink-0">🌱</span>
              <span className="truncate">COMMUNITY CONTRIBUTION MODE — Submit a new entity to the ecosystem</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-[#713F12] hover:text-[#111827] underline cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenEmailModal}
                className="px-3.5 py-1 bg-[#111827] text-white hover:bg-[#1F2937] rounded-[3px] text-[11px] font-technical font-semibold cursor-pointer shadow-xs transition-colors whitespace-nowrap"
              >
                Submit Entity →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[#854D0E] hover:text-[#111827] hover:bg-[#FEF08A]/80 rounded-[3px] transition-colors cursor-pointer"
                aria-label="Close"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
            {/* Movable Top Section: Entity Title, Type & Quadrant (Scrolls naturally with content) */}
            <div className="bg-[#FAF8F5] border border-[#E5E7EB] rounded-[8px] p-5 md:p-6 space-y-4 shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-[11px] font-technical uppercase font-bold text-[#111827]">
                  <span>Entity Title / Name</span>
                  <span className="text-[#DC2626] font-bold text-sm">*</span>
                  <span className="text-[10px] text-[#6B7280] font-normal lowercase">(required)</span>
                </div>
                <input
                  id="new-entity-title-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g. Instituto Elos, Joanna Macy, Kilombo Tenondé..."
                  className={`w-full bg-white border ${formError ? 'border-[#DC2626] ring-1 ring-[#DC2626]' : 'border-[#E5E7EB] focus:border-[#111827]'} font-editorial text-2xl md:text-3xl font-bold text-[#111827] px-3.5 py-2.5 rounded-[4px] outline-none shadow-2xs placeholder-[#9CA3AF] leading-tight`}
                  autoFocus
                />
                {formError && (
                  <p className="text-xs text-[#DC2626] font-sans flex items-center space-x-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formError}</span>
                  </p>
                )}
              </div>

              {/* Entity Type & Quadrant Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB]">
                {/* Entity Type Chips (Required) */}
                <div>
                  <label className="block text-[10.5px] font-technical uppercase text-[#111827] font-bold mb-1.5">
                    Entity Type <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {([
                      { value: 'Organization' as EntityType, label: 'Org', icon: '🕸️', title: 'Organization' },
                      { value: 'Person' as EntityType, label: 'Person', icon: '🧙', title: 'Person' },
                      { value: 'Idea' as EntityType, label: 'Idea', icon: '🔮', title: 'Idea' },
                      { value: 'Media' as EntityType, label: 'Media', icon: '🎙️', title: 'Media' }
                    ]).map(({ value: val, label, icon, title }) => {
                      const isSelected = type === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setType(val)}
                          title={title}
                          className={`p-2 rounded-[4px] border text-xs font-sans font-medium transition-all cursor-pointer flex items-center space-x-1.5 justify-center ${
                            isSelected
                              ? 'bg-[#111827] text-white border-[#111827] shadow-xs font-semibold'
                              : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#111827]'
                          }`}
                        >
                          <span className="text-xs">{icon}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category Quadrant */}
                <div>
                  <label className="block text-[10.5px] font-technical uppercase text-[#111827] font-bold mb-1.5">
                    Category Quadrant
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(['Inner', 'Social', 'Cultural', 'Systems'] as CategoryQuadrant[]).map((cat) => {
                      const isSelected = category === cat;
                      const dotBg = cat === 'Inner' ? '#5B21B6' : cat === 'Social' ? '#111827' : cat === 'Cultural' ? '#7D8764' : '#0284C7';
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`p-2 rounded-[4px] border text-xs font-sans font-medium transition-all cursor-pointer flex items-center space-x-1.5 justify-center ${
                            isSelected
                              ? 'bg-[#111827] text-white border-[#111827] shadow-xs font-semibold'
                              : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#111827]'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotBg }} />
                          <span className="truncate">{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* Relationship Question */}
            <div className="bg-[#FAF8F5] border border-[#E5E7EB] rounded-[6px] p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center space-x-2">
                <span className="text-base">🤝</span>
                <h3 className="font-editorial text-sm font-semibold text-[#111827]">
                  {relConfig.question}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                {relConfig.options.map((option) => {
                  const isSelected = submitterRelationship === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSubmitterRelationship(option)}
                      className={`p-3 rounded-[4px] border text-left text-xs font-sans transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-white border-[#111827] text-[#111827] shadow-xs font-semibold ring-1 ring-[#111827]'
                          : 'bg-white/80 border-[#E5E7EB] text-[#4B5563] hover:border-[#111827]/40 hover:bg-white'
                      }`}
                    >
                      <span>{option}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-[#111827] bg-[#111827]' : 'border-[#D1D5DB]'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2-Column Responsive Layout matching "Help us improve this data" */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Narrative, Methods & Transformation */}
              <div className="lg:col-span-7 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-editorial text-sm font-semibold text-[#111827] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <span>Description</span>
                    <FieldCommentInfo fieldName="Description" />
                  </h3>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Entity summary, mission statement & purpose..."
                    rows={4}
                    className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] p-3 text-xs font-sans rounded-[4px] outline-none text-[#111827] resize-none leading-relaxed shadow-2xs placeholder-[#9CA3AF]"
                  />
                </div>

                {/* Tags (Keywords & Topics) */}
                <SearchableTagInput
                  label="Tags & Themes"
                  commentFieldName="Keywords/Topics"
                  count={fields.length}
                  icon={<Tag className="w-3.5 h-3.5 text-[#7D8764]" />}
                  items={fields}
                  availableSuggestions={allExistingTags}
                  onAddItem={(tag) => setFields(prev => Array.from(new Set([...prev, tag])))}
                  onRemoveItem={(tag) => setFields(prev => prev.filter(t => t !== tag))}
                  badgeStyle={{
                    bg: 'bg-white',
                    border: 'border-[#E5E7EB]',
                    text: 'text-[#111827]',
                    hoverBorder: 'hover:border-[#111827]',
                    hoverBg: 'hover:bg-[#FAF8F5]'
                  }}
                  placeholder="Search or add tag..."
                />

                {/* Approach */}
                <SearchableTagInput
                  label="Approach"
                  commentFieldName="Approach"
                  count={approach.length}
                  icon={<Compass className="w-3.5 h-3.5 text-[#0284C7]" />}
                  items={approach}
                  availableSuggestions={allExistingApproaches}
                  onAddItem={(app) => setApproach(prev => Array.from(new Set([...prev, app])))}
                  onRemoveItem={(app) => setApproach(prev => prev.filter(a => a !== app))}
                  badgeStyle={{
                    bg: 'bg-sky-50/60',
                    border: 'border-sky-200',
                    text: 'text-sky-900',
                    hoverBorder: 'hover:border-sky-500',
                    hoverBg: 'hover:bg-sky-100/70'
                  }}
                  placeholder="Search or add approach..."
                />

                {/* Issues */}
                <SearchableTagInput
                  label="Issues"
                  commentFieldName="Issues"
                  count={issues.length}
                  icon={<AlertCircle className="w-3.5 h-3.5 text-[#AD2831]" />}
                  items={issues}
                  availableSuggestions={allExistingIssues}
                  onAddItem={(iss) => setIssues(prev => Array.from(new Set([...prev, iss])))}
                  onRemoveItem={(iss) => setIssues(prev => prev.filter(i => i !== iss))}
                  badgeStyle={{
                    bg: 'bg-rose-50/60',
                    border: 'border-rose-200',
                    text: 'text-rose-900',
                    hoverBorder: 'hover:border-rose-500',
                    hoverBg: 'hover:bg-rose-100/70'
                  }}
                  placeholder="Search or add issue..."
                />

                {/* Activities */}
                <SearchableTagInput
                  label="Activities"
                  commentFieldName="Activities"
                  count={activities.length}
                  icon={<Activity className="w-3.5 h-3.5 text-[#7D8764]" />}
                  items={activities}
                  availableSuggestions={allExistingActivities}
                  onAddItem={(act) => setActivities(prev => Array.from(new Set([...prev, act])))}
                  onRemoveItem={(act) => setActivities(prev => prev.filter(a => a !== act))}
                  badgeStyle={{
                    bg: 'bg-emerald-50/60',
                    border: 'border-emerald-200',
                    text: 'text-emerald-900',
                    hoverBorder: 'hover:border-emerald-500',
                    hoverBg: 'hover:bg-emerald-100/70'
                  }}
                  placeholder="Search or add activity..."
                />

                {/* Featured Resources */}
                <div className="rounded-[6px] border border-[#FDE68A] bg-[#FFFBEB]/70 p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#D97706]" />
                      <h3 className="font-editorial text-sm font-semibold text-[#92400E] uppercase tracking-wider flex items-center space-x-1.5">
                        <span>Featured Resources</span>
                        <FieldCommentInfo fieldName="Featured Resources" />
                      </h3>
                    </div>
                    <span className="font-technical text-[9px] font-bold text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-[2px] uppercase">
                      Optional
                    </span>
                  </div>
                  <textarea
                    value={featuredResources}
                    onChange={(e) => setFeaturedResources(e.target.value)}
                    placeholder="Enter links, toolkits or publications e.g. [Toolkit](https://...), https://..."
                    rows={2}
                    className="w-full text-xs font-sans p-2.5 border border-[#E5E7EB] rounded-[4px] bg-white resize-y outline-none focus:border-[#5B21B6] shadow-2xs placeholder-[#9CA3AF]"
                  />
                </div>

                {/* Ecotones (Intersections) */}
                <div className="p-4 border border-[#E5E7EB] rounded-[6px] bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-technical text-xs text-[#111827] uppercase tracking-wider font-semibold flex items-center space-x-1.5">
                      <span className="text-base">🌿</span>
                      <span>Ecotones (Intersections)</span>
                      <FieldCommentInfo fieldName="Quadrant" />
                    </span>
                    <span className="text-[10px] font-technical text-[#8C877F]">Optional</span>
                  </div>

                  <label className="flex items-center space-x-2 text-xs font-sans cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTransitionZone}
                      onChange={(e) => setIsTransitionZone(e.target.checked)}
                      className="rounded text-[#111827] focus:ring-0"
                    />
                    <span className="font-medium text-[#111827]">Place in Ecotone (Intersection)</span>
                  </label>

                  {isTransitionZone && (
                    <div>
                      <span className="font-technical text-[10px] text-[#8C877F] uppercase tracking-wider block mb-1.5">
                        Secondary Intersecting Quadrants
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['Inner', 'Social', 'Cultural', 'Systems'] as CategoryQuadrant[]).map(cat => {
                          if (cat === category) return null;
                          const isChecked = secondaryCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setSecondaryCategories(prev =>
                                  isChecked ? prev.filter(c => c !== cat) : [...prev, cat]
                                );
                              }}
                              className={`flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-[3px] text-xs font-sans text-left transition-all ${
                                isChecked
                                  ? 'bg-[#111827] text-white border-[#111827]'
                                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#111827]'
                              }`}
                            >
                              <span className="truncate text-xs font-medium">{cat} Change</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Worldview & Change Orientation Accordion (All possible fields available) */}
                <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleSection('worldview')}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border-l-4 border-[#3F6212] flex items-center justify-between text-left hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">🧭</span>
                      <span className="font-editorial text-sm font-semibold text-[#111827]">
                        Worldview & Change Orientation
                      </span>
                    </div>
                    <span className="text-[#8C877F]">
                      {openSections.worldview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {openSections.worldview && (
                    <div className="p-4 space-y-3.5 bg-white border-t border-[#E5E7EB]">
                      <div className="grid grid-cols-1 gap-3 text-xs font-sans">
                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                            <span>Practices</span>
                            <FieldCommentInfo fieldName="Practices" />
                          </label>
                          <textarea
                            value={practices}
                            onChange={(e) => setPractices(e.target.value)}
                            placeholder="Core practices, routines, ritual methodologies..."
                            rows={2}
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                            <span>Offerings</span>
                            <FieldCommentInfo fieldName="Offerings" />
                          </label>
                          <textarea
                            value={offerings}
                            onChange={(e) => setOfferings(e.target.value)}
                            placeholder="Programs, courses, workshops, residencies, toolkits..."
                            rows={2}
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                            <span>Situational Assessment</span>
                            <FieldCommentInfo fieldName="Situational Assessment" />
                          </label>
                          <input
                            type="text"
                            value={situationalAssessment}
                            onChange={(e) => setSituationalAssessment(e.target.value)}
                            placeholder="e.g. Polycrisis diagnosis, Metacrisis framing..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                            <span>Situational Assessment Comments/Description</span>
                            <FieldCommentInfo fieldName="Situational Assessment Comments/Description" />
                          </label>
                          <textarea
                            value={situationalAssessmentComments}
                            onChange={(e) => setSituationalAssessmentComments(e.target.value)}
                            placeholder="Detailed comments / situational context..."
                            rows={2}
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                            <span>Response Orientation</span>
                            <FieldCommentInfo fieldName="Response Orientation" />
                          </label>
                          <input
                            type="text"
                            value={responseOrientation}
                            onChange={(e) => setResponseOrientation(e.target.value)}
                            placeholder="e.g. Regenerative, Mitigation, Adaptation, Resistance..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Alternative(s) Proposed (GTA)</span>
                              <FieldCommentInfo fieldName="Alternative(s) Proposed (GTA)" />
                            </label>
                            <input
                              type="text"
                              value={altProposedGTA}
                              onChange={(e) => setAltProposedGTA(e.target.value)}
                              placeholder="Global Tapestry of Alternatives..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Alternative(s) Proposed (Pluriverse)</span>
                              <FieldCommentInfo fieldName="Alternative(s) Proposed (Pluriverse dictionary)" />
                            </label>
                            <input
                              type="text"
                              value={altProposedPluriverse}
                              onChange={(e) => setAltProposedPluriverse(e.target.value)}
                              placeholder="Pluriverse dictionary alternatives..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Alternative(s) Proposed (Mútua)</span>
                              <FieldCommentInfo fieldName="Alternative(s) Proposed (Mútua)" />
                            </label>
                            <input
                              type="text"
                              value={altProposedMutua}
                              onChange={(e) => setAltProposedMutua(e.target.value)}
                              placeholder="Mútua proposal..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Alternative(s) Proposed (General)</span>
                              <FieldCommentInfo fieldName="Alternative(s) Proposed" />
                            </label>
                            <input
                              type="text"
                              value={altProposed}
                              onChange={(e) => setAltProposed(e.target.value)}
                              placeholder="General proposed alternatives..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                            <span>Value Meme / Ethical Orientation</span>
                            <FieldCommentInfo fieldName="Value Meme / Ethical Orientation" />
                          </label>
                          <input
                            type="text"
                            value={valueMeme}
                            onChange={(e) => setValueMeme(e.target.value)}
                            placeholder="e.g. Commons-based, Indigenous cosmovision, Metamodern, Integral..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Theory of Change (GTDF)</span>
                              <FieldCommentInfo fieldName="Theory of Change (GTDF)" />
                            </label>
                            <input
                              type="text"
                              value={theoryOfChangeGTDF}
                              onChange={(e) => setTheoryOfChangeGTDF(e.target.value)}
                              placeholder="Gesturing Towards Decolonial Futures..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Theory of Change (IAM)</span>
                              <FieldCommentInfo fieldName="Theory of Change (IAM)" />
                            </label>
                            <input
                              type="text"
                              value={theoryOfChangeIAM}
                              onChange={(e) => setTheoryOfChangeIAM(e.target.value)}
                              placeholder="IAM theory of change..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Crisis of Response</span>
                              <FieldCommentInfo fieldName="Crisis of Response" />
                            </label>
                            <input
                              type="text"
                              value={crisisOfResponse}
                              onChange={(e) => setCrisisOfResponse(e.target.value)}
                              placeholder="Crisis dynamics..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Relevant Resources</span>
                              <FieldCommentInfo fieldName="Relevant Resources" />
                            </label>
                            <input
                              type="text"
                              value={relevantResources}
                              onChange={(e) => setRelevantResources(e.target.value)}
                              placeholder="Markdown link [Title](url) or URLs..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>IDGs / Inner Capacities</span>
                              <FieldCommentInfo fieldName="IDGs/Inner Capacities" />
                            </label>
                            <input
                              type="text"
                              value={idgsInnerCapacities}
                              onChange={(e) => setIdgsInnerCapacities(e.target.value)}
                              placeholder="e.g. Self-awareness, Sense-making..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>

                          <div>
                            <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                              <span>Inner Work Modalities</span>
                              <FieldCommentInfo fieldName="Inner Work Modalities (Conscious Change Collective)" />
                            </label>
                            <input
                              type="text"
                              value={innerWorkModalities}
                              onChange={(e) => setInnerWorkModalities(e.target.value)}
                              placeholder="e.g. Somatics, Meditation, Circling..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Discourse Analysis / Argument Mapping Accordion */}
                <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleSection('discourse')}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border-l-4 border-[#B45309] flex items-center justify-between text-left hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">💬</span>
                      <span className="font-editorial text-sm font-semibold text-[#111827]">
                        Discourse Analysis & Argument Mapping
                      </span>
                    </div>
                    <span className="text-[#8C877F]">
                      {openSections.discourse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {openSections.discourse && (
                    <div className="p-4 space-y-3 bg-white border-t border-[#E5E7EB] text-xs font-sans">
                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                          <span>Concepts</span>
                          <FieldCommentInfo fieldName="Concepts" />
                        </label>
                        <input
                          type="text"
                          value={concepts}
                          onChange={(e) => setConcepts(e.target.value)}
                          placeholder="Key conceptual contributions or vocabulary..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                          <span>Frameworks</span>
                          <FieldCommentInfo fieldName="Frameworks" />
                        </label>
                        <input
                          type="text"
                          value={frameworks}
                          onChange={(e) => setFrameworks(e.target.value)}
                          placeholder="Analytical or explanatory models..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                          <span>Definitions</span>
                          <FieldCommentInfo fieldName="Definitions" />
                        </label>
                        <input
                          type="text"
                          value={definitions}
                          onChange={(e) => setDefinitions(e.target.value)}
                          placeholder="Core term definitions..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                          <span>Arguments / Claims</span>
                          <FieldCommentInfo fieldName="Arguments/Claims" />
                        </label>
                        <textarea
                          value={argumentsClaims}
                          onChange={(e) => setArgumentsClaims(e.target.value)}
                          placeholder="Primary thesis, core propositions or claims..."
                          rows={2}
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                            <span>Evidence / Sources</span>
                            <FieldCommentInfo fieldName="Evidence/Sources" />
                          </label>
                          <input
                            type="text"
                            value={evidenceSources}
                            onChange={(e) => setEvidenceSources(e.target.value)}
                            placeholder="Foundational texts, research, citations..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                            <span>Hypotheses</span>
                            <FieldCommentInfo fieldName="Hypotheses" />
                          </label>
                          <input
                            type="text"
                            value={hypotheses}
                            onChange={(e) => setHypotheses(e.target.value)}
                            placeholder="Guiding bets or exploratory hypotheses..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                          <span>Analyst Commentary / Curator Notes</span>
                          <FieldCommentInfo fieldName="Analyst Commentary" />
                        </label>
                        <textarea
                          value={analystCommentary}
                          onChange={(e) => setAnalystCommentary(e.target.value)}
                          placeholder="Curator commentary or notes on significance..."
                          rows={2}
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Details, Metadata, Logistics & Relationships */}
              <div className="lg:col-span-5 space-y-6">
                {/* Archipelago Placement */}
                <div className="p-4 bg-[#FAF8F5] border border-[#E5E7EB] rounded-[6px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-technical text-xs text-[#111827] uppercase tracking-wider font-semibold flex items-center space-x-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#5B21B6]" />
                      <span>Archipelago Territory</span>
                    </span>
                    <span className="text-[10px] font-technical text-[#8C877F]">Optional</span>
                  </div>

                  <div>
                    <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                      <span>Primary Archipelago</span>
                      <FieldCommentInfo fieldName="Archipelago" />
                    </label>
                    <PrimaryArchipelagoSelect
                      value={continent}
                      onChange={setContinent}
                      archipelagos={allExistingArchipelagos}
                    />
                  </div>

                  <div>
                    <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-1">
                      <span>Other Archipelagos</span>
                      <FieldCommentInfo fieldName="Archipelago" />
                    </label>
                    <OtherArchipelagosSelect
                      value={otherArchipelagos}
                      primaryArchipelago={continent}
                      onChange={setOtherArchipelagos}
                      archipelagos={allExistingArchipelagos}
                    />
                    <span className="font-technical text-[9.5px] text-[#8C877F] mt-1 block">
                      Archipelagos this entity is affiliated with in addition to primary (click to select 1-99+).
                    </span>
                  </div>
                </div>

                {/* Details & Metadata Accordion */}
                <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleSection('logistics')}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border-l-4 border-[#0369A1] flex items-center justify-between text-left hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">📦</span>
                      <span className="font-editorial text-sm font-semibold text-[#111827]">
                        Details & Logistic Metadata
                      </span>
                    </div>
                    <span className="text-[#8C877F]">
                      {openSections.logistics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {openSections.logistics && (
                    <div className="p-4 space-y-3 bg-white border-t border-[#E5E7EB] text-xs font-sans">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Location</span>
                            <FieldCommentInfo fieldName="City/State" />
                          </label>
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Global, Brazil, Berlin"
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Language(s)</span>
                            <FieldCommentInfo fieldName="Language(s)" />
                          </label>
                          <input
                            type="text"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            placeholder="e.g. English, Portuguese"
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Stage / Maturity Level</span>
                            <FieldCommentInfo fieldName="Maturity Level" />
                          </label>
                          <select
                            value={stage}
                            onChange={(e) => setStage(e.target.value)}
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          >
                            <option value="">Select stage...</option>
                            <option value="Early stage">Early stage</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Mature">Mature</option>
                            <option value="Discontinued">Discontinued</option>
                            <option value="Other">Other [fill]</option>
                          </select>
                          {stage === 'Other' && (
                            <input
                              type="text"
                              value={customStage}
                              onChange={(e) => setCustomStage(e.target.value)}
                              placeholder="Specify stage / maturity..."
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827] mt-1.5"
                            />
                          )}
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Year Founded</span>
                            <FieldCommentInfo fieldName="Year Founded" />
                          </label>
                          <input
                            type="text"
                            value={yearFounded}
                            onChange={(e) => setYearFounded(e.target.value)}
                            placeholder="e.g. 2018"
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Social Reach</span>
                            <FieldCommentInfo fieldName="Social Media Reach" />
                          </label>
                          <input
                            type="text"
                            value={reach}
                            onChange={(e) => setReach(e.target.value)}
                            placeholder="e.g. 10k followers"
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Impact Reach</span>
                            <FieldCommentInfo fieldName="Impact Reach" />
                          </label>
                          <input
                            type="text"
                            value={impactReach}
                            onChange={(e) => setImpactReach(e.target.value)}
                            placeholder="e.g. 150 community members, 12 communities served"
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Contact Email</span>
                            <FieldCommentInfo fieldName="Email" />
                          </label>
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="contact@example.org"
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Website URL</span>
                            <FieldCommentInfo fieldName="Website URL" />
                          </label>
                          <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>
                      </div>

                      {/* Social Media Links */}
                      <div className="pt-2 border-t border-[#E5E7EB]/70 space-y-2">
                        <span className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5">
                          <span>Social Media Profiles</span>
                          <FieldCommentInfo fieldName="Social Profiles" />
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              value={instagram}
                              onChange={(e) => setInstagram(e.target.value)}
                              placeholder="Instagram: @handle or url"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={twitter}
                              onChange={(e) => setTwitter(e.target.value)}
                              placeholder="Twitter / X: @handle or url"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={youtube}
                              onChange={(e) => setYoutube(e.target.value)}
                              placeholder="YouTube: channel or url"
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={otherSocialMedia}
                              onChange={(e) => setOtherSocialMedia(e.target.value)}
                              placeholder="Other: Substack, LinkedIn, etc."
                              className="w-full bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Geography & Scope */}
                      <div className="pt-2 border-t border-[#E5E7EB]/70 space-y-2">
                        <span className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold block">
                          Extended Geography & Scale
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City"
                            className="bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none"
                          />
                          <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="State / Province"
                            className="bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none"
                          />
                          <input
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="Country"
                            className="bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={biome}
                            onChange={(e) => setBiome(e.target.value)}
                            placeholder="Biome / Bioregion (e.g. Atlantic Forest)"
                            className="bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none"
                          />
                          <input
                            type="text"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            placeholder="Neighborhood / Demarcated Zone"
                            className="bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={operatingRegion}
                            onChange={(e) => setOperatingRegion(e.target.value)}
                            placeholder="Operating Region (Global, Translocal...)"
                            className="bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none"
                          />
                          <input
                            type="text"
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            placeholder="Team Size / Headcount"
                            className="bg-white border border-[#E5E7EB] p-1.5 rounded-[4px] text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Relationships & Connections Accordion */}
                <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleSection('relationships')}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border-l-4 border-[#15803D] flex items-center justify-between text-left hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">🤝</span>
                      <span className="font-editorial text-sm font-semibold text-[#111827]">
                        Relationships & Connected Nodes
                      </span>
                    </div>
                    <span className="text-[#8C877F]">
                      {openSections.relationships ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {openSections.relationships && (
                    <div className="p-4 space-y-3 bg-white border-t border-[#E5E7EB] text-xs font-sans">
                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Founder(s) / Main Source(s)</span>
                          <FieldCommentInfo fieldName="Founder(s)/Main Source(s)" />
                        </label>
                        <input
                          type="text"
                          value={founders}
                          onChange={(e) => setFounders(e.target.value)}
                          placeholder="Comma-separated founders or origins..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Partners (Institutions)</span>
                          <FieldCommentInfo fieldName="Partners (Institutions)" />
                        </label>
                        <input
                          type="text"
                          value={partners}
                          onChange={(e) => setPartners(e.target.value)}
                          placeholder="Comma-separated institutional partners..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Funders / Supporters (Institutions)</span>
                          <FieldCommentInfo fieldName="Funders/Supporters (Institutions)" />
                        </label>
                        <input
                          type="text"
                          value={funders}
                          onChange={(e) => setFunders(e.target.value)}
                          placeholder="Comma-separated funders or supporters..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Teachers / Influences (People)</span>
                          <FieldCommentInfo fieldName="Teachers/Influences (People)" />
                        </label>
                        <input
                          type="text"
                          value={teachers}
                          onChange={(e) => setTeachers(e.target.value)}
                          placeholder="Comma-separated key influences / mentors..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Partners / Collaborators (People)</span>
                          <FieldCommentInfo fieldName="Partners/Collaborators (People)" />
                        </label>
                        <input
                          type="text"
                          value={collaborators}
                          onChange={(e) => setCollaborators(e.target.value)}
                          placeholder="Comma-separated individual collaborators..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Ethnic / Spiritual Lineage(s)</span>
                            <FieldCommentInfo fieldName="Ethnic/Spiritual Lineage(s)" />
                          </label>
                          <input
                            type="text"
                            value={ethnicSpiritualLineages}
                            onChange={(e) => setEthnicSpiritualLineages(e.target.value)}
                            placeholder="e.g. Zen, Amazonian, Celtic..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>

                        <div>
                          <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                            <span>Intellectual Lineage (IAM)</span>
                            <FieldCommentInfo fieldName="Intellectual Lineage (IAM)" />
                          </label>
                          <input
                            type="text"
                            value={intellectualLineage}
                            onChange={(e) => setIntellectualLineage(e.target.value)}
                            placeholder="e.g. Systems dynamics, Complexity..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Structure & Audience Accordion */}
                <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleSection('governance')}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border-l-4 border-[#7D8764] flex items-center justify-between text-left hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">📋</span>
                      <span className="font-editorial text-sm font-semibold text-[#111827]">
                        Structure, Sector & Community Served
                      </span>
                    </div>
                    <span className="text-[#8C877F]">
                      {openSections.governance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {openSections.governance && (
                    <div className="p-4 space-y-3 bg-white border-t border-[#E5E7EB] text-xs font-sans">
                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Organization Structure</span>
                          <FieldCommentInfo fieldName="Organization Structure" />
                        </label>
                        <input
                          type="text"
                          value={organizationStructure}
                          onChange={(e) => setOrganizationStructure(e.target.value)}
                          placeholder="e.g. Non-profit, Cooperative, Foundation, Collective, DAO..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Societal Sector</span>
                          <FieldCommentInfo fieldName="Societal Sector" />
                        </label>
                        <input
                          type="text"
                          value={societalSector}
                          onChange={(e) => setSocietalSector(e.target.value)}
                          placeholder="e.g. Civil Society, Ecology, Education, Governance..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Who They Serve</span>
                          <FieldCommentInfo fieldName="Who They Serve" />
                        </label>
                        <input
                          type="text"
                          value={whoTheyServe}
                          onChange={(e) => setWhoTheyServe(e.target.value)}
                          placeholder="Target constituents, practitioners, youth, educators..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Community Served</span>
                          <FieldCommentInfo fieldName="Community Served (Conscious Change Collective)" />
                        </label>
                        <input
                          type="text"
                          value={communityServed}
                          onChange={(e) => setCommunityServed(e.target.value)}
                          placeholder="Specific communities or collectives..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Warm Data Accordion */}
                <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleSection('warmData')}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border-l-4 border-[#6B21A8] flex items-center justify-between text-left hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">🌿</span>
                      <span className="font-editorial text-sm font-semibold text-[#111827]">
                        Warm Data & Point of Contact
                      </span>
                    </div>
                    <span className="text-[#8C877F]">
                      {openSections.warmData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {openSections.warmData && (
                    <div className="p-4 space-y-3 bg-white border-t border-[#E5E7EB] text-xs font-sans">
                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Point of Contact(s)</span>
                          <FieldCommentInfo fieldName="Point of Contact(s)" />
                        </label>
                        <input
                          type="text"
                          value={pointOfContact}
                          onChange={(e) => setPointOfContact(e.target.value)}
                          placeholder="Name of focal point / contact person..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Warm Data Contact Email</span>
                          <FieldCommentInfo fieldName="Email" />
                        </label>
                        <input
                          type="email"
                          value={warmDataEmail}
                          onChange={(e) => setWarmDataEmail(e.target.value)}
                          placeholder="warmdata@example.org"
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>

                      <div>
                        <label className="font-technical text-[10px] text-[#8C877F] uppercase font-semibold flex items-center space-x-1.5 mb-0.5">
                          <span>Matching / Source Database</span>
                          <FieldCommentInfo fieldName="Matching Database" />
                        </label>
                        <input
                          type="text"
                          value={matchingDatabase}
                          onChange={(e) => setMatchingDatabase(e.target.value)}
                          placeholder="e.g. Catalist, Life Itself, GTA database..."
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-[4px] text-xs outline-none focus:border-[#111827]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Submit Action Bar */}
            <div className="pt-6 border-t-2 border-[#111827]/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FAF8F5] p-5 rounded-[8px] border border-[#E5E7EB] mt-4">
              <div>
                <h4 className="font-editorial text-base font-bold text-[#111827]">
                  Finished drafting this new entity?
                </h4>
                <p className="font-sans text-xs text-[#6B7280]">
                  Your submission will go into the review pipeline before being merged into the live map.
                </p>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[#E5E7EB] hover:bg-white text-[#4B5563] text-xs font-sans rounded-[4px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="submit-new-entity-pipeline-btn"
                  onClick={handleOpenEmailModal}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-white rounded-[5px] text-xs font-technical font-semibold shadow-xs transition-all cursor-pointer group"
                >
                  <span>Submit for Review</span>
                  <span className="text-[#D9C01B] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submitter Email Input Modal */}
      {isEmailModalOpen && (
        <div 
          className="fixed inset-0 z-90 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-text"
          onClick={() => setIsEmailModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-[#E5E7EB] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🌱</span>
                <h3 className="font-editorial text-lg font-bold text-[#111827]">Submit New Entity</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-[#8C877F] hover:text-[#111827] p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFinal} className="space-y-4">
              <div>
                <label className="block text-xs font-technical uppercase font-bold text-[#111827] mb-1">
                  Your Email:
                </label>
                <p className="text-xs text-[#6B7280] font-sans mb-2 leading-relaxed">
                  (Your email will not be displayed publicly. It's used only if we need to contact you about your submission.)
                </p>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => {
                    setSubmitterEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="name@example.org"
                  className="w-full bg-[#FAF8F5] border border-[#E5E7EB] focus:border-[#111827] text-xs font-sans px-3.5 py-2.5 rounded-[4px] outline-none text-[#111827]"
                  autoFocus
                  required
                />
                {emailError && (
                  <p className="text-xs text-[#DC2626] font-sans mt-1.5 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-[#E5E7EB] hover:bg-[#FAF8F5] text-[#4B5563] text-xs font-sans rounded-[4px] cursor-pointer disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  id="confirm-submit-new-entity-btn"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-technical font-semibold rounded-[4px] shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit to Pipeline</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution Received Confirmation Modal */}
      {isSuccessModalOpen && (
        <div 
          className="fixed inset-0 z-90 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-text"
          onClick={handleFinishAndClose}
        >
          <div 
            className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-[#E5E7EB] p-6 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mx-auto text-2xl">
              🌿
            </div>

            <div className="space-y-2">
              <h3 className="font-editorial text-xl font-bold text-[#111827]">
                Thank You!
              </h3>
              <p className="font-sans text-sm text-[#374151] leading-relaxed">
                Your new entity submission for <strong>"{name}"</strong> has been sent to the pipeline for review. Thank you for tending to this map with us!
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="close-success-new-entity-btn"
                onClick={handleFinishAndClose}
                className="w-full py-2.5 px-4 bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-technical font-semibold rounded-[4px] shadow-2xs cursor-pointer transition-all"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
